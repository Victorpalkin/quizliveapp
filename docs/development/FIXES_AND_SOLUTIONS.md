# gQuiz - Bug Fixes and Technical Solutions

**Last Updated:** 2025-11-10

This document contains all bug fixes, technical solutions, and architectural decisions made during development.

---

## Table of Contents

1. [Player State Synchronization](#player-state-synchronization)
2. [Quiz Sharing Permissions](#quiz-sharing-permissions)
3. [Firestore Index Configuration](#firestore-index-configuration)
4. [Copy Shared Quiz Bug](#copy-shared-quiz-bug)
5. [React DOM Props Validation](#react-dom-props-validation)
6. [Nested Forms Issue](#nested-forms-issue)
7. [CORS Security for Cloud Functions](#cors-security-for-cloud-functions)
8. [Quiz Preview Feature](#quiz-preview-feature)

---

## Player State Synchronization

### Problem

Players were getting stuck on various screens when the host moved to the next question:
1. Stuck on "Correct Answer" (result) screen
2. Stuck on "Get Ready" (preparing) screen
3. Stuck in "Answer Locked In" (waiting) loop after timing out

### Root Cause

**Issue 1: Missing State in Effect Dependencies**

The state sync effect wasn't triggering when player state changed:
```typescript
// Missing 'state' in dependencies
}, [game?.state, game?.currentQuestionIndex, gameLoading, timedOut]);
```

This prevented multi-step transitions like `'result' → 'preparing' → 'question'`.

**Issue 2: Host's Auto-Transition is Too Fast**

The host has an automatic effect that transitions from `'preparing'` to `'question'` within milliseconds:

```typescript
// src/app/host/game/[gameId]/page.tsx:253-257
useEffect(() => {
  if (game?.state === 'preparing' && gameRef) {
    updateGame(gameRef, { state: 'question' });
  }
}, [game?.state, gameRef]);
```

Players receiving Firestore updates often **never see** the `'preparing'` state because it's so transient.

**Issue 3: Timeout Flag in Dependencies**

Having `timedOut` in effect dependencies caused the effect to re-run when reset to `false`, creating race conditions:

```typescript
// Reset effect sets timedOut to false
setTimedOut(false);

// State sync effect re-runs (unwanted!)
}, [..., timedOut]);
```

**Issue 4: Time Not Reset in Preparing State**

When a player timed out (time = 0) and moved to the next question, the timer wasn't reset in the preparing state. This caused a race condition where the timeout effect could fire before the timer effect:

```typescript
// Both effects trigger when state becomes 'question'
// If timeout effect runs first and time is still 0...
if (state === 'question' && time === 0 && answerSelected === null && !timedOut) {
  // False timeout! Player didn't even see the question
}
```

### Solution

**1. Use `useRef` to Track Question Index**

`useRef` doesn't trigger re-renders when updated, preventing infinite loops:

```typescript
const lastQuestionIndexRef = useRef<number>(-1);

useEffect(() => {
  const questionChanged = currentQuestionIndex !== lastQuestionIndexRef.current
                          && lastQuestionIndexRef.current !== -1;

  if (questionChanged) {
    lastQuestionIndexRef.current = currentQuestionIndex;
    setState('preparing');
    return;
  }

  // Normal state sync...
}, [game?.state, game?.currentQuestionIndex, gameLoading, state]);
//                                                        ^^^^^ Added
```

**2. Question Index as Primary Signal**

When `currentQuestionIndex` changes, force player to `'preparing'` regardless of host state:

```typescript
if (questionChanged) {
  // Force to preparing when question changes
  if (state !== 'joining' && state !== 'lobby' && state !== 'cancelled') {
    setState('preparing');
    return;
  }
}
```

**3. Include `state` in Dependencies**

This enables multi-step transitions:
- Effect Run 1: Question changes → `'result' → 'preparing'`
- Effect Run 2: State changed → `'preparing' → 'question'`

**4. Remove `timedOut` from Dependencies**

`timedOut` is only used as a condition check, not a trigger:

```typescript
}, [game?.state, game?.currentQuestionIndex, gameLoading, state]);
// Removed: timedOut
```

**5. Reset Time in Preparing State**

Prevent false timeouts on new questions:

```typescript
useEffect(() => {
  if (state === 'preparing') {
    setAnswerSelected(null);
    setTimedOut(false);
    setLastAnswer(null);
    setTime(timeLimit); // ✅ CRITICAL: Reset time before transitioning to 'question'
  }
}, [state, game?.currentQuestionIndex]);
```

### Complete Flow Example

**Player times out on Q0, host moves to Q1:**

1. **Firestore update:** `{state: 'question', currentQuestionIndex: 1}`
2. **Effect Run 1** (questionIndex changed):
   - Detect: `currentQuestionIndex (1) !== lastQuestionIndexRef.current (0)`
   - Update ref: `lastQuestionIndexRef.current = 1`
   - Transition: `setState('preparing')`
3. **Reset Effect** (state = 'preparing'):
   - Reset: `setTime(timeLimit)`, `setTimedOut(false)`, etc.
4. **Effect Run 2** (state changed to 'preparing'):
   - Host is on 'question', player is on 'preparing'
   - Transition: `setState('question')`
5. **Effect Run 3** (state changed to 'question'):
   - No more transitions, effect stabilizes
6. **Player sees Q1** ✅

### Files Modified

- `src/app/play/[gameId]/page.tsx`:
  - Line 4: Added `useRef` import
  - Line 97: Changed to `useRef` for question index tracking
  - Lines 101-189: Rewrote state sync with question-index-driven logic
  - Line 189: Removed `timedOut` from dependencies
  - Line 203: Added `setTime(timeLimit)` to reset effect

---

## Quiz Sharing Permissions

### Problem

Hosts trying to create a game with a shared quiz received:
```
Error creating game: FirebaseError: Missing or insufficient permissions.
```

### Root Cause

The Firestore security rule uses `hasQuizAccess()` to check if a user has access to a quiz via sharing:

```javascript
function hasQuizAccess(quizId) {
  return request.auth != null &&
         exists(/databases/$(database)/documents/quizzes/$(quizId)/shares/$(request.auth.token.email));
}
```

This checks for a document at: `/quizzes/{quizId}/shares/{email}`

**The problem:** Share documents were created with **random IDs** (via `addDoc`), not email as the ID:

```
❌ Actual: /quizzes/quiz123/shares/randomId1234
✅ Expected: /quizzes/quiz123/shares/user@example.com
```

The `exists()` check always failed because it looked for email as document ID.

### Solution

**Use email as the document ID** for share documents:

**1. Changed QuizShareManager to use `setDoc`:**

```typescript
// Before (WRONG):
await addDoc(sharesRef, { sharedWith: trimmedEmail, ... });

// After (CORRECT):
const shareDocRef = doc(firestore, 'quizzes', quizId, 'shares', trimmedEmail);
await setDoc(shareDocRef, { sharedWith: trimmedEmail, ... });
```

**2. Updated Firestore security rules:**

```javascript
match /shares/{shareId} {
  allow create: if request.auth != null &&
                  request.auth.uid == get(/databases/$(database)/documents/quizzes/$(quizId)).data.hostId &&
                  request.resource.data.sharedBy == request.auth.uid &&
                  request.resource.data.quizId == quizId &&
                  shareId == request.resource.data.sharedWith; // ✅ Validate ID matches email
}
```

### Benefits

1. **Fixes permissions** - `exists()` check now works
2. **Prevents duplicates** - Email is unique per quiz (idempotent)
3. **Efficient lookups** - O(1) exists check vs subcollection query
4. **Data integrity** - One share per email per quiz enforced at DB level

### Files Modified

- `src/components/app/quiz-share-manager.tsx:72-83` - Changed to `setDoc` with email as ID
- `firestore.rules:31-51` - Added validation that shareId matches email

---

## Firestore Index Configuration

### Problem

When using collectionGroup queries for quiz sharing:
```
FirebaseError: The query requires a COLLECTION_GROUP_ASC index for collection
shares and field sharedWith.
```

### Why This Happens

CollectionGroup queries search across all subcollections:

```typescript
const sharesRef = collectionGroup(firestore, 'shares');
const q = query(sharesRef, where('sharedWith', '==', user.email));
```

This queries:
```
/quizzes/quiz1/shares/* ─┐
/quizzes/quiz2/shares/* ─┼─> Find all where sharedWith = "user@example.com"
/quizzes/quiz3/shares/* ─┘
```

Firestore requires an index to perform this efficiently.

### Solution: Use Field Overrides (Not Composite Index)

**Initial attempt (WRONG):**
```json
{
  "indexes": [
    {
      "collectionGroup": "shares",
      "queryScope": "COLLECTION_GROUP",
      "fields": [{ "fieldPath": "sharedWith", "order": "ASCENDING" }]
    }
  ]
}
```

**Error:** "This index is not necessary, configure using single field index controls"

**Correct approach:**
```json
{
  "indexes": [],
  "fieldOverrides": [
    {
      "collectionGroup": "shares",
      "fieldPath": "sharedWith",
      "indexes": [
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION_GROUP"
        },
        {
          "order": "DESCENDING",
          "queryScope": "COLLECTION_GROUP"
        }
      ]
    }
  ]
}
```

### Why Field Overrides?

- Single-field queries (like `where('sharedWith', '==', x)`) don't need composite indexes
- Firestore automatically creates single-field indexes with `COLLECTION` scope
- Use `fieldOverrides` to extend the scope to `COLLECTION_GROUP`
- More efficient than creating an unnecessary composite index

### Deployment

```bash
firebase deploy --only firestore:indexes --project YOUR_PROJECT_ID
```

### Files Modified

- `firestore.indexes.json` - Created with field override configuration
- `firebase.json` - Added `"indexes": "firestore.indexes.json"`
- `deploy.sh` - Updated to deploy indexes with `firebase deploy --only firestore`

---

## Copy Shared Quiz Bug

### Problem 1: Undefined Field Value

When copying a shared quiz:
```
Error copying quiz: FirebaseError: Function addDoc() called with invalid data.
Unsupported field value: undefined (found in field id in document quizzes/...)
```

### Root Cause

The copy logic was setting `id: undefined`:

```typescript
const newQuiz = {
  ...originalQuiz,
  id: undefined,  // ❌ Firestore rejects undefined values
  title: `${originalQuiz.title} (Copy)`,
  hostId: user.uid,
};
```

Firestore doesn't allow `undefined` as a field value. Setting `id: undefined` doesn't remove the field, it creates a field with an undefined value.

### Solution 1: Destructure to Exclude ID

**Properly exclude the `id` field** using destructuring:

```typescript
// Extract id and get rest of the data without it
const { id, ...quizDataWithoutId } = originalQuiz;

const newQuiz = {
  ...quizDataWithoutId,  // ✅ Spread without 'id' field
  title: `${originalQuiz.title} (Copy)`,
  hostId: user.uid,
};
```

**Why this works:**
- Destructuring extracts `id` into a variable (which we discard)
- `...quizDataWithoutId` spreads all fields **except** `id`
- No undefined values are passed to Firestore
- The new quiz gets its own ID assigned by `addDoc()`

---

### Problem 2: Images Not Copied (Data Dependency Issue)

**CRITICAL**: When copying a shared quiz, images were NOT duplicated. The copied quiz still referenced the original quiz's images in Firebase Storage.

**Impact:**
- If original quiz owner deletes their quiz, images are deleted from Storage
- Copied quiz's images break (404 errors)
- Data dependency creates brittle relationships between quizzes

**Example:**
```
Original quiz: /quizzes/abc123/questions/0/image → "https://...original-image.jpg"
Copied quiz:   /quizzes/xyz789/questions/0/image → "https://...original-image.jpg" ❌
                                                     (Still points to original!)
```

When original quiz `abc123` is deleted → Original image deleted → Copied quiz breaks.

### Solution 2: Copy Images to New Storage Location

**Implement independent image storage for each quiz:**

```typescript
/**
 * Copy image from original quiz to new quiz in Firebase Storage
 * This ensures each quiz has its own independent images
 */
const copyImageToNewQuiz = async (
  originalImageUrl: string,
  newQuizId: string,
  questionIndex: number
): Promise<string> => {
  try {
    // Download the original image
    const response = await fetch(originalImageUrl);
    const blob = await response.blob();

    // Upload to new location
    const newImagePath = `quizzes/${newQuizId}/questions/${questionIndex}/image`;
    const newImageRef = ref(storage, newImagePath);
    await uploadBytes(newImageRef, blob);

    // Get the new download URL
    const newImageUrl = await getDownloadURL(newImageRef);

    return newImageUrl;
  } catch (error) {
    console.error('Error copying image:', error);
    // Return original URL as fallback (better than breaking the quiz)
    return originalImageUrl;
  }
};
```

**Updated copy logic:**

```typescript
const handleCopyQuiz = async (share: QuizShare) => {
  // 1. Create the quiz document first to get new quiz ID
  const newQuizDoc = await addDoc(quizzesRef, newQuiz);
  const newQuizId = newQuizDoc.id;

  // 2. Copy all images in parallel
  const imagePromises = originalQuiz.questions.map(async (question, index) => {
    if (question.imageUrl) {
      return copyImageToNewQuiz(question.imageUrl, newQuizId, index);
    }
    return null;
  });

  const newImageUrls = await Promise.all(imagePromises);

  // 3. Update quiz with new image URLs
  if (newImageUrls.some(url => url)) {
    const updatedQuestions = originalQuiz.questions.map((question, index) => ({
      ...question,
      imageUrl: newImageUrls[index] || question.imageUrl,
    }));

    await updateDoc(newQuizDoc, {
      questions: updatedQuestions,
    });
  }
};
```

**New storage structure:**

```
Original quiz: quizzes/abc123/questions/0/image → image1.jpg
Copied quiz:   quizzes/xyz789/questions/0/image → image1.jpg ✅
                                                    (Independent copy!)
```

### Updated Storage Security Rules

Updated `storage.rules` to support quiz-specific paths with owner validation:

```javascript
// New quiz-specific storage structure
match /quizzes/{quizId}/questions/{questionIndex}/{imageName} {
  // Anyone can read quiz images
  allow read;

  // Only the quiz owner can write/delete images
  allow write: if request.auth != null &&
                 request.auth.uid == firestore.get(/databases/(default)/documents/quizzes/$(quizId)).data.hostId;
}
```

**Security features:**
- Public read access for quiz images
- Write restricted to quiz owner (verified via Firestore lookup)
- Prevents unauthorized image uploads to other people's quizzes
- Each quiz has isolated storage namespace

### Performance Optimizations

**Parallel image copying:**

```typescript
// Copy all images in parallel for better performance
const imagePromises = originalQuiz.questions.map(async (question, index) => {
  if (question.imageUrl) {
    return copyImageToNewQuiz(question.imageUrl, newQuizId, index);
  }
  return null;
});

const newImageUrls = await Promise.all(imagePromises);
```

**Benefits:**
- All images copy simultaneously
- Much faster than sequential copying
- For 5 images: ~2 seconds vs ~10 seconds

**Error handling:**

```typescript
catch (error) {
  console.error('Error copying image:', error);
  // Return original URL as fallback - better than breaking the quiz
  return originalImageUrl;
}
```

**Graceful degradation:**
- If image copy fails, quiz still works with original image URL
- User gets partial functionality instead of complete failure
- Error logged for debugging

### User Feedback

Improved toast messages to show image copy status:

```typescript
toast({
  title: 'Quiz copied',
  description: `Copied quiz with ${copiedImageCount} image${copiedImageCount > 1 ? 's' : ''}`,
});
```

### Files Modified

- `src/components/app/shared-quizzes.tsx:7` - Added `useStorage` import
- `src/components/app/shared-quizzes.tsx:10` - Added Storage imports
- `src/components/app/shared-quizzes.tsx:29` - Added storage hook
- `src/components/app/shared-quizzes.tsx:44-76` - Added `copyImageToNewQuiz` function
- `src/components/app/shared-quizzes.tsx:105-144` - Updated copy logic with image copying
- `storage.rules:14-24` - Added quiz-specific storage rules

### Testing

**Test image independence:**

1. User A creates quiz with images
2. User A shares quiz with User B
3. User B copies shared quiz
4. Verify copied quiz has new image URLs in different storage path
5. User A deletes original quiz
6. **Verify copied quiz images still work** ✅

**Test storage rules:**

```bash
# Should succeed - owner uploading image
gsutil cp test.jpg gs://YOUR_BUCKET/quizzes/QUIZ_ID/questions/0/image

# Should fail - non-owner uploading image
gsutil -u different-user cp test.jpg gs://YOUR_BUCKET/quizzes/QUIZ_ID/questions/0/image
```

### Migration Path

**For existing copied quizzes with shared images:**

This is a forward-looking fix. Existing copied quizzes will continue using original image URLs.

**Options:**
1. **Leave as-is** - Existing quizzes keep original URLs (acceptable if original quizzes won't be deleted)
2. **Re-copy quizzes** - Users can delete and re-copy quizzes to get independent images
3. **Background migration** - Create script to copy images for existing copied quizzes (advanced)

### Future Enhancements

1. **Progress indicator** - Show image copy progress for large quizzes
2. **Image optimization** - Compress images during copy to save storage
3. **Batch copying** - Copy multiple quizzes at once
4. **Image deduplication** - Reuse identical images to save storage

---

## React DOM Props Validation

### Problem

Console error:
```
React does not recognize the `isCorrect` prop on a DOM element. If you
intentionally want it to appear in the DOM as a custom attribute, spell it
as lowercase `iscorrect` instead.
```

### Root Cause

In the answer distribution chart's `CustomBar` component, custom props were being spread to a DOM element:

```typescript
const CustomBar = (props: any) => {
  const { fill, x, y, width, height, isCorrect, name } = props;
  return (
    <g>
      <rect {...props} fill={...} />  // ❌ Spreads isCorrect to DOM
    </g>
  );
};
```

React doesn't allow custom props on DOM elements (only HTML attributes are valid).

### Solution

**Destructure custom props before spreading:**

```typescript
const CustomBar = (props: any) => {
  const { fill, x, y, width, height, isCorrect, name, ...restProps } = props;
  return (
    <g>
      <rect
        {...restProps}  // ✅ Only valid props
        fill={isCorrect ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
        x={x}
        y={y}
        width={width}
        height={height}
        radius={[0, 4, 4, 0]}
      />
      {isCorrect && <CheckCircle ... />}
    </g>
  );
};
```

### Files Modified

- `src/app/host/game/[gameId]/page.tsx:439-464` - Fixed CustomBar component

---

## Nested Forms Issue

### Problem

HTML validation error:
```
In HTML, <form> cannot be a descendant of <form>
```

### Root Cause

The `QuizShareManager` component had a `<form>` element for sharing, but it was rendered inside the quiz edit page which also has a `<form>`:

```html
<form> <!-- Edit quiz form -->
  ...
  <QuizShareManager>
    <form onSubmit={handleShare}> <!-- ❌ Nested form! -->
      <input />
      <button type="submit">Share</button>
    </form>
  </QuizShareManager>
</form>
```

### Solution

**Replace inner form with div and handle Enter key manually:**

```typescript
// Before (WRONG):
<form onSubmit={handleShare}>
  <Input type="email" />
  <Button type="submit">Share</Button>
</form>

// After (CORRECT):
<div className="flex gap-2">
  <Input
    type="email"
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleShare(e);
      }
    }}
  />
  <Button type="button" onClick={handleShare}>Share</Button>
</div>
```

**Key changes:**
1. Replace `<form>` with `<div>`
2. Add `onKeyDown` handler to input for Enter key
3. Change button `type="submit"` to `type="button"`
4. Call `handleShare` directly from button `onClick`

### Files Modified

- `src/components/app/quiz-share-manager.tsx:127-152` - Replaced form with div

---

## CORS Security for Cloud Functions

### Problem

**CRITICAL SECURITY ISSUE**: Cloud Functions had NO CORS restrictions, accepting requests from ANY origin.

This means:
- Any website could call your Cloud Functions
- Malicious sites could submit fake answers
- API abuse and unauthorized access possible
- No protection against cross-origin attacks

### Root Cause

The `submitAnswer` Cloud Function was using default CORS configuration:

```typescript
// INSECURE - Accepts requests from ANY origin
export const submitAnswer = onCall({ region: 'europe-west4' }, async (request) => {
  // No origin validation!
});
```

Firebase Functions v2 `onCall` handles CORS automatically, but **by default allows all origins** for convenience. This is dangerous in production.

### Solution

**Implement explicit CORS allow-list and origin validation:**

**1. Define allowed origins:**

```typescript
// functions/src/index.ts
const ALLOWED_ORIGINS = [
  'http://localhost:3000',           // Local development
  'http://localhost:3001',           // Alternative local port
  'https://localhost:3000',          // Local HTTPS
  'https://gquiz-{hash}-{region}.a.run.app'  // Production Cloud Run URL
];
```

**2. Add CORS configuration to function:**

```typescript
export const submitAnswer = onCall(
  {
    region: 'europe-west4',
    cors: ALLOWED_ORIGINS, // ✅ Only allow specific origins
  },
  async (request) => {
    // Function implementation...
  }
);
```

**3. Add runtime origin validation:**

```typescript
function validateOrigin(origin: string | undefined): void {
  if (!origin) {
    return; // Allow server-to-server calls
  }

  if (!ALLOWED_ORIGINS.includes(origin)) {
    console.warn(`[SECURITY] Blocked request from unauthorized origin: ${origin}`);
    throw new HttpsError('permission-denied', 'Request from unauthorized origin');
  }

  console.log(`[SECURITY] Validated request from allowed origin: ${origin}`);
}

export const submitAnswer = onCall({ ... }, async (request) => {
  // Validate origin at runtime
  const origin = request.rawRequest?.headers?.origin as string | undefined;
  validateOrigin(origin);

  // Rest of function...
});
```

### Configuration After Deployment

**Get your Cloud Run URL:**

```bash
# Option 1: Use helper script
./functions/update-cors-origins.sh

# Option 2: Manual command
gcloud run services describe gquiz --region=europe-west4 --format='value(status.url)'
```

**Update ALLOWED_ORIGINS:**

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000',
  'https://gquiz-abc123-ew.a.run.app', // ✅ Add your actual Cloud Run URL
];
```

**Redeploy:**

```bash
firebase deploy --only functions --project YOUR_PROJECT_ID
```

### Security Features Implemented

1. **CORS Allow-List** - Only specific origins can call functions
2. **Runtime Validation** - Double-checks origin on every request
3. **Security Logging** - Logs blocked attempts for monitoring
4. **Development + Production** - Supports localhost and Cloud Run URLs

### Additional Security Recommendations

**1. Firebase App Check (Highly Recommended)**

Add App Check to verify requests come from your legitimate app:

```typescript
// Enable App Check enforcement
export const submitAnswer = onCall(
  {
    region: 'europe-west4',
    cors: ALLOWED_ORIGINS,
    consumeAppCheckToken: true, // ✅ Require valid App Check token
  },
  async (request) => {
    // Request guaranteed to come from your app
  }
);
```

Setup: https://firebase.google.com/docs/app-check

**Benefits:**
- Prevents API abuse
- Blocks automated bots
- Verifies app authenticity
- Works with reCAPTCHA for web

**2. Rate Limiting**

Prevent API abuse with rate limits:

```typescript
// Install: npm install express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
});
```

**3. Environment-Based Configuration**

Use environment variables for different environments:

```typescript
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000']; // Fallback for development
```

Set in Firebase:
```bash
firebase functions:config:set cors.allowed_origins="https://your-domain.com,https://www.your-domain.com"
```

**4. Monitoring & Alerts**

Set up Cloud Monitoring alerts:
- Alert on blocked origin attempts
- Monitor function invocation patterns
- Track error rates
- Set up budget alerts for API costs

### Testing

**Test blocked origins:**

```bash
# Should fail with permission-denied error
curl -X POST https://REGION-PROJECT.cloudfunctions.net/submitAnswer \
  -H "Origin: https://evil-site.com" \
  -H "Content-Type: application/json" \
  -d '{"data": {...}}'
```

**Test allowed origins:**

```bash
# Should succeed
curl -X POST https://REGION-PROJECT.cloudfunctions.net/submitAnswer \
  -H "Origin: https://your-cloud-run-url.app" \
  -H "Content-Type: application/json" \
  -d '{"data": {...}}'
```

### Files Modified

- `functions/src/index.ts:6-62` - Added CORS configuration and validation
- `functions/src/index.ts:88-96` - Added origin validation to submitAnswer
- `functions/update-cors-origins.sh` - Helper script to get Cloud Run URL
- `deploy.sh:109-116` - Added security reminder in deployment output

### Deployment Checklist

- [ ] Deploy application to Cloud Run
- [ ] Get Cloud Run URL from deployment output
- [ ] Add Cloud Run URL to `ALLOWED_ORIGINS` in `functions/src/index.ts`
- [ ] Redeploy Cloud Functions: `firebase deploy --only functions`
- [ ] Test function calls from your app (should succeed)
- [ ] Test from unauthorized origin (should fail)
- [ ] Monitor Cloud Functions logs for security events
- [ ] (Optional) Set up Firebase App Check
- [ ] (Optional) Implement rate limiting
- [ ] (Optional) Set up monitoring alerts

### Migration from Insecure Version

If you have existing Cloud Functions without CORS restrictions:

1. **Add CORS configuration** (as shown above)
2. **Deploy during low-traffic period** (to minimize disruption)
3. **Monitor logs closely** for legitimate requests being blocked
4. **Add any missing origins** to allow-list if needed

### Common Issues

**Issue: Requests blocked from legitimate domain**

```
Error: Request from unauthorized origin
```

**Solution:** Add the domain to `ALLOWED_ORIGINS` array and redeploy.

**Issue: CORS configuration not taking effect**

**Solution:** Ensure you redeployed functions after updating CORS config:
```bash
firebase deploy --only functions
```

**Issue: Local development blocked**

**Solution:** Ensure localhost origins are in `ALLOWED_ORIGINS`:
```typescript
'http://localhost:3000',
'http://localhost:3001',
```

---

## Quiz Preview Feature

### Feature Request

Hosts need ability to view quiz content before:
1. Hosting a game with shared quiz
2. Copying shared quiz to their own quizzes
3. Hosting their own quiz

### Implementation

**1. Created QuizPreview Component**

`src/components/app/quiz-preview.tsx` - Reusable component for displaying quiz content:

```typescript
interface QuizPreviewProps {
  quiz: Quiz;
  showCorrectAnswers?: boolean;
}

export function QuizPreview({ quiz, showCorrectAnswers = true }: QuizPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Quiz Header - Title, description, question count */}
      {/* Questions - Each with text, time limit, image, color-coded answers */}
      {/* Correct answer indicators - Green ring + checkmark */}
    </div>
  );
}
```

**Features:**
- Quiz title and description
- Question count badge
- Each question displays:
  - Question text
  - Time limit (with Clock icon)
  - Optional image (aspect-ratio preserved)
  - Color-coded answer options (red, blue, yellow, green, purple, pink, orange, teal)
  - Correct answer indicators (green ring + CheckCircle icon)
- Responsive 2-column answer grid
- Scrollable dialog for long quizzes

**2. Added Preview to Shared Quizzes**

`src/components/app/shared-quizzes.tsx`:

```typescript
// State
const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
const [loadingPreview, setLoadingPreview] = useState(false);

// Handler to fetch and display quiz
const handlePreviewQuiz = async (share: QuizShare) => {
  setLoadingPreview(true);
  try {
    const quizDoc = await getDoc(doc(firestore, 'quizzes', share.quizId));
    if (!quizDoc.exists()) throw new Error('Quiz not found');

    const quiz = quizDoc.data() as Quiz;
    setPreviewQuiz(quiz);
  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Failed to load quiz preview',
      description: 'Please try again.',
    });
  } finally {
    setLoadingPreview(false);
  }
};

// Preview button in card
<Button
  className="w-full"
  variant="outline"
  onClick={() => handlePreviewQuiz(share)}
  disabled={loadingPreview}
>
  {loadingPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
  Preview Quiz
</Button>

// Dialog
<Dialog open={!!previewQuiz} onOpenChange={(open) => !open && setPreviewQuiz(null)}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Quiz Preview</DialogTitle>
    </DialogHeader>
    {previewQuiz && <QuizPreview quiz={previewQuiz} showCorrectAnswers={true} />}
  </DialogContent>
</Dialog>
```

**3. Added Preview to Host Dashboard**

`src/app/host/page.tsx`:

```typescript
// State
const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);

// Preview button in quiz card (no fetch needed - quiz already loaded)
<Button className="w-full" variant="outline" onClick={() => setPreviewQuiz(quiz)}>
  <Eye className="mr-2 h-4 w-4" /> Preview Quiz
</Button>

// Dialog (same as SharedQuizzes)
<Dialog open={!!previewQuiz} onOpenChange={(open) => !open && setPreviewQuiz(null)}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Quiz Preview</DialogTitle>
    </DialogHeader>
    {previewQuiz && <QuizPreview quiz={previewQuiz} showCorrectAnswers={true} />}
  </DialogContent>
</Dialog>
```

### User Experience Flow

**Shared Quizzes:**
1. User clicks "Preview Quiz" button
2. Loading spinner shows while fetching quiz data
3. Dialog opens with full quiz preview
4. User reviews questions, answers, images, time limits
5. User makes informed decision to Host Game or Copy quiz
6. Click outside dialog or X to close

**Own Quizzes:**
1. User clicks "Preview Quiz" button
2. Dialog opens instantly (no fetch needed)
3. User reviews quiz content
4. Click outside dialog or X to close

### Design Decisions

**Why separate QuizPreview component?**
- Reusability across SharedQuizzes and HostDashboard
- Single source of truth for quiz display logic
- Easier to maintain and update styling
- Could be reused in quiz edit page, results page, etc.

**Why showCorrectAnswers prop?**
- Flexibility for future use cases (e.g., preview without revealing answers)
- Currently always true, but architecture supports hiding answers

**Why fetch quiz data for shared quizzes?**
- Share objects only contain minimal data (quizId, title, sharedByEmail)
- Full quiz data (questions, answers, images) stored in quiz document
- Fetching on-demand reduces initial load time and data transfer

**Why max-w-4xl dialog?**
- Wide enough to show answer grid comfortably (2 columns on desktop)
- Not too wide on large screens
- Works well with responsive design

**Why max-h-[90vh] with overflow-y-auto?**
- Long quizzes (20+ questions) need scrolling
- 90vh ensures dialog doesn't touch screen edges
- Allows viewing quiz without hiding other UI

### Files Modified

- `src/components/app/quiz-preview.tsx` - Created new component (112 lines)
- `src/components/app/shared-quizzes.tsx:42-43,53-73,280-292,344-352` - Added preview state, handler, button, dialog
- `src/app/host/page.tsx:11,77,362-364,456-464` - Added preview state, button, dialog

### Testing Checklist

- [ ] Preview shared quiz - shows all questions correctly
- [ ] Preview shared quiz with images - images display correctly
- [ ] Preview shared quiz with multiple correct answers - all marked correctly
- [ ] Preview own quiz - opens instantly without fetch
- [ ] Preview long quiz (10+ questions) - dialog scrolls properly
- [ ] Close preview dialog - reopening works correctly
- [ ] Preview quiz with no description - layout still works
- [ ] Preview quiz with varied time limits - all show correctly
- [ ] Preview loading state - spinner shows while fetching
- [ ] Preview error handling - shows error toast on failure

---

## Best Practices & Lessons Learned

### State Management

1. **Use refs for tracking non-UI state** - `useRef` doesn't trigger re-renders
2. **Be careful with effect dependencies** - Missing or extra dependencies cause bugs
3. **Use early returns in effects** - Prevent multiple state changes in one cycle
4. **Question index changes are atomic** - More reliable than transient states

### Firestore

1. **Use field overrides for single-field collectionGroup queries** - Not composite indexes
2. **Use meaningful document IDs** - Email as ID enables efficient `exists()` checks
3. **Never set fields to undefined** - Use destructuring to exclude fields
4. **Test security rules thoroughly** - Permission errors are hard to debug

### React

1. **Never spread all props to DOM elements** - Extract custom props first
2. **Avoid nested forms** - Use divs with manual submit handlers
3. **Console warnings matter** - They often indicate real bugs

### Testing Strategy

1. **Test race conditions** - Multiple effects triggering simultaneously
2. **Test edge cases** - Timeouts, rapid state changes, network latency
3. **Test state transitions** - Every possible state → state combination
4. **Test with real timing** - Don't just test synchronous code

---

## Migration & Deployment

### Deploy Firestore Changes

```bash
# Deploy rules and indexes
firebase deploy --only firestore --project YOUR_PROJECT_ID

# Or separately
firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
firebase deploy --only firestore:indexes --project YOUR_PROJECT_ID
```

### Verify Deployment

```bash
# Check indexes
firebase firestore:indexes list --project YOUR_PROJECT_ID

# Should show:
# Collection Group: shares
# Query Scope: COLLECTION_GROUP
# Fields: sharedWith (ASCENDING)
# Status: READY
```

### Data Migration

If you have existing shares with random IDs, you need to migrate them:

```typescript
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

async function migrateShares() {
  const firestore = getFirestore();
  const quizzes = await getDocs(collection(firestore, 'quizzes'));

  for (const quizDoc of quizzes.docs) {
    const sharesRef = collection(firestore, 'quizzes', quizDoc.id, 'shares');
    const shares = await getDocs(sharesRef);

    for (const shareDoc of shares.docs) {
      const shareData = shareDoc.data();
      const email = shareData.sharedWith;

      // Skip if already using email as ID
      if (shareDoc.id === email) continue;

      // Create new share with email as ID
      const newShareRef = doc(firestore, 'quizzes', quizDoc.id, 'shares', email);
      await setDoc(newShareRef, shareData);

      // Delete old share
      await deleteDoc(shareDoc.ref);
      console.log(`Migrated: ${shareDoc.id} → ${email}`);
    }
  }
}
```

---

## Related Files

### Player State Management
- `src/app/play/[gameId]/page.tsx` - Player game page with state sync
- `src/app/host/game/[gameId]/page.tsx` - Host game page (for reference)

### Quiz Sharing
- `src/components/app/quiz-share-manager.tsx` - Share creation UI
- `src/components/app/shared-quizzes.tsx` - Shared quizzes display
- `src/firebase/firestore/use-shared-quizzes.ts` - CollectionGroup query hook
- `src/lib/types.ts` - QuizShare type definition

### Firestore Configuration
- `firestore.rules` - Security rules
- `firestore.indexes.json` - Index configuration
- `firebase.json` - Firebase project configuration
- `deploy.sh` - Deployment script

---

## Testing Checklist

### Player State Transitions
- [ ] Player joins game in lobby
- [ ] Player answers question correctly
- [ ] Player answers question incorrectly
- [ ] Player times out on question
- [ ] Player transitions through multiple questions
- [ ] Player sees correct result screen
- [ ] Player doesn't get stuck on result when host moves to next question
- [ ] Player doesn't get stuck on "Get Ready" screen
- [ ] Player who timed out doesn't get false timeout on next question
- [ ] Last question → game end transition works
- [ ] Host cancels game while player is playing

### Quiz Sharing
- [ ] Owner can share quiz with user by email
- [ ] Recipient sees quiz in "Shared With Me" section
- [ ] Recipient can host game with shared quiz
- [ ] Recipient can copy shared quiz to their own quizzes
- [ ] Recipient can remove share (cancel)
- [ ] Owner can remove share
- [ ] Cannot share with same email twice
- [ ] Cannot share with yourself
- [ ] Email validation works

### Firestore
- [ ] Indexes deployed successfully
- [ ] Security rules deployed successfully
- [ ] CollectionGroup query works
- [ ] Share documents created with email as ID
- [ ] Game creation with shared quiz succeeds

---

## Future Improvements

1. **Add state transition logging** - Help diagnose production issues
2. **Implement retry logic** - For failed answer submissions
3. **Add health checks** - Detect when player is out of sync
4. **Add share expiration** - Optional time-limited shares
5. **Add share analytics** - Track quiz sharing usage
6. **Consider WebSocket** - Reduce Firestore costs and latency
7. **Add comprehensive E2E tests** - Automated state transition testing
