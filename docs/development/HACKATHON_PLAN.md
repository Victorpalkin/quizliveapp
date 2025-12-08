# Hackathon Team Lifecycle Feature - Implementation Plan

**Created:** 2025-12-08
**Status:** Approved - Ready for Implementation

## Final Decisions

| Decision | Choice |
|----------|--------|
| **Scope** | Full lifecycle + team scratchboard |
| **MVP Stages** | Teams + Scratchboard, Judging, Ideation |
| **Team Formation** | Flexible (pre-formed OR dynamic) |
| **Architecture** | Hackathon container linking activities |
| **Scratchboard** | Notes + status + file links (chat later) |
| **Identity** | Session code for participant persistence |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        HACKATHON                                │
│  PIN: HACK-2024                                                 │
│                                                                 │
│  ┌──────────────────── ACTIVITIES ────────────────────┐        │
│  │                                                     │        │
│  │  [Ideation] → [Prioritization] → [Judging]         │        │
│  │  (thoughts)    (evaluation)       (evaluation)     │        │
│  │                                                     │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
│  ┌──────────────────── TEAMS ─────────────────────────┐        │
│  │                                                     │        │
│  │  Team Alpha          Team Beta          Team Gamma │        │
│  │  ├─ Alice (lead)     ├─ Dave            ├─ Grace   │        │
│  │  ├─ Bob              ├─ Eve             └─ Henry   │        │
│  │  └─ Carol            └─ Frank                      │        │
│  │                                                     │        │
│  │  Each team has:                                    │        │
│  │  - Shared notes                                    │        │
│  │  - Progress status                                 │        │
│  │  - File/link attachments                           │        │
│  │  - Blockers (visible to host)                      │        │
│  │                                                     │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
│  ┌──────────────────── PARTICIPANTS ──────────────────┐        │
│  │  Session codes for persistent identity:            │        │
│  │  Alice: ALICE-7X2K    Bob: BOB-3M9P   ...          │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Hackathon (new top-level collection)

```typescript
// Stored at: /hackathons/{hackathonId}
interface Hackathon {
  id: string;
  title: string;
  description?: string;
  hostId: string;

  // Joining
  joinPin: string;                    // e.g., "HACK-2024"

  // Configuration
  config: HackathonConfig;

  // State
  status: 'draft' | 'active' | 'ended';
  currentPhase: 'setup' | 'ideation' | 'formation' | 'hacking' | 'judging' | 'complete';

  // Linked activities (in order)
  activities: HackathonActivityRef[];

  // Mentors (can view scratchboards, cannot edit settings)
  mentors: HackathonMentor[];

  createdAt: Date;
  updatedAt: Date;
}

interface HackathonConfig {
  // Team settings
  teamFormationMode: 'pre-defined' | 'self-select' | 'preference-match';
  minTeamSize: number;
  maxTeamSize: number;
  allowSoloParticipants: boolean;

  // Scratchboard settings
  scratchboardEnabled: boolean;
  blockersVisibleToHost: boolean;

  // Phases enabled
  ideationEnabled: boolean;
  judgingEnabled: boolean;
}

// Mentors self-register, host approves
interface HackathonMentor {
  id: string;                         // Firebase Auth UID
  email: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  approvedAt?: Date;
}

interface HackathonActivityRef {
  id: string;                         // Activity ID
  type: ActivityType;                 // 'thoughts-gathering' | 'evaluation' | 'quiz'
  purpose: 'ideation' | 'prioritization' | 'judging' | 'check-in' | 'fun';
  order: number;
  gameId?: string;                    // When activity is live
}
```

### Participant (persistent identity)

```typescript
// Stored at: /hackathons/{hackathonId}/participants/{participantId}
interface HackathonParticipant {
  id: string;
  name: string;
  sessionCode: string;                // e.g., "ALICE-7X2K" for rejoin
  email?: string;                     // Optional

  teamId?: string;                    // Assigned team
  role?: 'lead' | 'member';

  // For preference-based formation
  projectPreferences?: string[];      // Ranked project IDs

  joinedAt: Timestamp;
  lastSeenAt: Timestamp;
}
```

### Team

```typescript
// Stored at: /hackathons/{hackathonId}/teams/{teamId}
interface Team {
  id: string;
  name: string;
  projectId?: string;                 // If teams are tied to projects
  projectTitle?: string;

  members: string[];                  // Participant IDs
  leadId?: string;                    // Team lead participant ID

  // Scratchboard data
  scratchboard: TeamScratchboard;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface TeamScratchboard {
  notes: string;                      // Rich text / markdown
  status: 'not-started' | 'in-progress' | 'stuck' | 'ready-for-review' | 'complete';
  statusMessage?: string;             // Custom status text

  blockers: Blocker[];
  links: ExternalLink[];

  lastEditedBy?: string;              // Participant name
  lastEditedAt?: Timestamp;
}

interface Blocker {
  id: string;
  text: string;
  resolved: boolean;
  createdBy: string;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
}

interface ExternalLink {
  id: string;
  title: string;
  url: string;
  type: 'doc' | 'slide' | 'repo' | 'demo' | 'other';
  addedBy: string;
  addedAt: Timestamp;
}
```

---

## Implementation Phases

### Phase 1: Foundation (MVP Core)
**Goal:** Basic hackathon container with teams and scratchboard

#### 1.1 Data Model & Types
- [ ] Add Hackathon, Team, Participant types to `src/lib/types.ts`
- [ ] Create Firestore security rules for hackathons collection

#### 1.2 Host: Create Hackathon
- [ ] New page: `src/app/host/hackathon/create/page.tsx`
- [ ] Form: title, description, team settings, phases to enable
- [ ] Generate unique join PIN

#### 1.3 Host: Hackathon Dashboard
- [ ] New page: `src/app/host/hackathon/[hackathonId]/page.tsx`
- [ ] View participants, teams, activities
- [ ] Manage team assignments
- [ ] View all team scratchboards (host oversight)

#### 1.4 Host: Team Management
- [ ] Create teams manually (pre-defined mode)
- [ ] Assign participants to teams
- [ ] Edit team names, members

#### 1.5 Participant: Join Hackathon
- [ ] New page: `src/app/join/hackathon/page.tsx`
- [ ] Enter PIN + name → get session code
- [ ] Rejoin with session code

#### 1.6 Participant: Team Scratchboard
- [ ] New page: `src/app/play/hackathon/[hackathonId]/team/page.tsx`
- [ ] View/edit shared notes (real-time sync)
- [ ] Update team status
- [ ] Add blockers
- [ ] Add external links

### Phase 2: Ideation Integration
**Goal:** Link Thoughts Gathering for idea generation

#### 2.1 Create Ideation Activity from Hackathon
- [ ] "Add Ideation Phase" button on hackathon dashboard
- [ ] Creates linked Thoughts Gathering activity
- [ ] Participants auto-join via hackathon context

#### 2.2 Import Ideas to Projects
- [ ] After ideation, host can select top ideas
- [ ] Convert to "projects" for team formation

### Phase 3: Dynamic Team Formation
**Goal:** Support preference-based and self-select formation

#### 3.1 Participant Preferences
- [ ] Show projects, let participants rank preferences
- [ ] Store in participant document

#### 3.2 Formation Algorithm (optional)
- [ ] AI or simple algorithm to suggest optimal teams
- [ ] Host reviews and confirms

#### 3.3 Self-Select Mode
- [ ] Participants choose their team directly
- [ ] Capacity limits enforced

### Phase 4: Mentor Support
**Goal:** Allow mentors to self-register with host approval

#### 4.1 Mentor Self-Registration
- [ ] Mentor joins hackathon with same PIN as participants
- [ ] After joining, mentor can click "Request Mentor Access"
- [ ] Mentor must be logged in (existing host account)
- [ ] Request stored in pending state until host approves

#### 4.2 Host Approval Flow
- [ ] Host sees pending mentor requests on dashboard
- [ ] Approve/reject buttons for each request
- [ ] List of approved mentors with remove option

#### 4.3 Mentor Dashboard
- [ ] Once approved, mentor sees hackathon in "Mentoring" section
- [ ] New page: `src/app/host/hackathon/[hackathonId]/mentor/page.tsx`
- [ ] Read-only view of all team scratchboards
- [ ] See all blockers across teams (filterable)
- [ ] Cannot edit hackathon settings or team assignments

#### 4.4 Data Model
```typescript
interface HackathonMentor {
  id: string;
  email: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  approvedAt?: Date;
}
```

### Phase 5: Judging Integration
**Goal:** Link Evaluation for final judging

#### 5.1 Create Judging Activity
- [ ] "Add Judging Phase" button
- [ ] Auto-populate items from teams/projects
- [ ] Configure metrics (Innovation, Execution, etc.)

#### 5.2 Results Display
- [ ] Show rankings within hackathon context
- [ ] Award badges/recognition

---

## File Structure

```
src/app/host/hackathon/
├── create/
│   └── page.tsx                 # Create new hackathon
├── [hackathonId]/
│   ├── page.tsx                 # Hackathon dashboard (host view)
│   ├── teams/
│   │   └── page.tsx             # Team management
│   ├── participants/
│   │   └── page.tsx             # Participant list
│   ├── mentors/
│   │   └── page.tsx             # Mentor management (invite/remove)
│   ├── scratchboards/
│   │   └── page.tsx             # View all team scratchboards
│   └── mentor/
│       └── page.tsx             # Mentor-only dashboard (read-only view)

src/app/play/hackathon/
├── [hackathonId]/
│   ├── page.tsx                 # Participant home (see team, activities)
│   ├── team/
│   │   └── page.tsx             # Team scratchboard
│   └── join/
│       └── page.tsx             # Join/rejoin flow

src/app/join/
└── hackathon/
    └── page.tsx                 # Enter hackathon PIN

src/lib/
└── types.ts                     # Add Hackathon, Team, Participant types

src/firebase/firestore/
└── hackathon.ts                 # Hackathon-specific hooks

firestore.rules                  # Add hackathon rules
```

---

## Key Files to Modify

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add Hackathon, Team, Participant, Scratchboard types |
| `src/app/host/page.tsx` | Add "Hackathons" section to dashboard |
| `src/app/join/page.tsx` | Detect hackathon vs game PIN |
| `firestore.rules` | Add hackathon collection security rules |
| `src/firebase/firestore/` | Add hackathon hooks (useHackathon, useTeam, etc.) |

---

## Resolved Design Decisions

1. **Session code format:** Participant chooses with name prefix (e.g., `ALICE-7X2K`)
2. **Mentor flow:** Self-registration - mentors join and request access, host approves
3. **Scratchboard editing:** Last-write-wins with "lastEditedBy" indicator (simple for MVP)
4. **Activity linking:** Manual - host explicitly links activities from hackathon dashboard

---

## Cloud Functions (Server-Side Security)

Sensitive operations MUST be handled server-side via Cloud Functions to prevent client-side manipulation.

### Required Functions

```typescript
// functions/src/functions/hackathon/

// 1. Create Hackathon - validates host auth, generates secure PIN
export const createHackathon = onCall(async (request) => {
  // Validate authenticated host
  // Generate cryptographically secure PIN
  // Create hackathon document
  // Return hackathon ID and PIN
});

// 2. Join Hackathon - validates PIN, generates session code
export const joinHackathon = onCall(async (request) => {
  // Validate hackathon PIN exists and is active
  // Generate cryptographically secure session code
  // Create participant document
  // Return participant ID and session code
});

// 3. Rejoin Hackathon - validates session code
export const rejoinHackathon = onCall(async (request) => {
  // Validate session code (hashed comparison)
  // Update lastSeenAt
  // Return participant data
});

// 4. Request Mentor Access - validates auth
export const requestMentorAccess = onCall(async (request) => {
  // Validate authenticated user
  // Create mentor request with 'pending' status
  // Prevent duplicate requests
});

// 5. Approve/Reject Mentor - validates host auth
export const manageMentorRequest = onCall(async (request) => {
  // Validate host owns this hackathon
  // Update mentor status to 'approved' or 'rejected'
  // Set approvedAt timestamp
});

// 6. Assign Team - validates host auth
export const assignTeamMembers = onCall(async (request) => {
  // Validate host owns this hackathon
  // Validate participant IDs exist
  // Update team membership atomically
});
```

### Why Server-Side?

| Operation | Risk if Client-Side | Solution |
|-----------|---------------------|----------|
| PIN generation | Predictable PINs | Crypto-random on server |
| Session code generation | Guessable codes | Crypto-random, hashed storage |
| Session code validation | Timing attacks | Constant-time comparison |
| Mentor approval | Self-approval exploit | Verify host auth on server |
| Team assignment | Assign to any team | Verify host auth on server |

### File Structure for Functions

```
functions/src/functions/hackathon/
├── createHackathon.ts
├── joinHackathon.ts
├── rejoinHackathon.ts
├── requestMentorAccess.ts
├── manageMentorRequest.ts
├── assignTeamMembers.ts
└── index.ts              # Export all functions
```

---

## Security Considerations

### Firestore Security Rules

```javascript
// hackathons collection
match /hackathons/{hackathonId} {
  // Only host can read/write hackathon document
  allow read: if isHost() || isMentor();
  allow write: if isHost();

  function isHost() {
    return request.auth != null &&
           resource.data.hostId == request.auth.uid;
  }

  function isMentor() {
    return request.auth != null &&
           request.auth.token.email in resource.data.mentors.map(m => m.email);
  }

  // Participants subcollection
  match /participants/{participantId} {
    // Participants can read their own doc, host can read all
    allow read: if isHost() || isMentor() || isOwnParticipant();
    // Participants can update their own preferences, host can manage all
    allow write: if isHost() || (isOwnParticipant() && onlyAllowedFields());

    function isOwnParticipant() {
      return request.auth == null &&
             request.resource.data.sessionCode == getSessionCodeFromHeader();
    }

    function onlyAllowedFields() {
      return request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['projectPreferences', 'lastSeenAt']);
    }
  }

  // Teams subcollection
  match /teams/{teamId} {
    // Team members can read their team, host/mentors can read all
    allow read: if isHost() || isMentor() || isTeamMember();
    // Only team members can edit scratchboard, host can edit all
    allow write: if isHost() || (isTeamMember() && onlyScratchboardFields());

    function isTeamMember() {
      // Check if participant ID is in team members
      return getParticipantId() in resource.data.members;
    }

    function onlyScratchboardFields() {
      return request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['scratchboard', 'updatedAt']);
    }
  }
}
```

### Security Best Practices

1. **Session Code Security:**
   - Generate cryptographically random suffix (4-6 chars)
   - Rate limit session code validation attempts
   - Expire session codes after hackathon ends

2. **Input Validation:**
   - Sanitize all text inputs (notes, blockers, links)
   - Validate URL format for external links
   - Limit text field lengths (notes: 10000 chars, blockers: 500 chars)

3. **Access Control:**
   - Participants can only edit their own team's scratchboard
   - Mentors have read-only access to all scratchboards
   - Only host can modify hackathon settings and team assignments

4. **Data Privacy:**
   - Don't expose participant email unless they opt in
   - Scratchboard blockers visible to host/mentors only if configured
   - Session codes stored hashed (not plain text) in production

---

## Maintainability Guidelines

### Code Organization
- Keep hackathon types in a separate section of `types.ts`
- Create dedicated hooks in `src/firebase/firestore/hackathon.ts`
- Follow existing patterns for host/play page structure

### Testing Checklist
- [ ] Unit tests for session code generation
- [ ] Integration tests for team assignment logic
- [ ] E2E tests for participant join flow
- [ ] Security rule tests for access control

### Documentation Updates
- [ ] Update CLAUDE.md with hackathon section
- [ ] Add hackathon routes to architecture blueprint
- [ ] Document session code format and lifecycle

---

## Success Criteria

### Core Features
- [ ] Host can create a hackathon with teams
- [ ] Participants can join with PIN, get session code, rejoin later
- [ ] Teams have working scratchboard (notes, status, blockers, links)
- [ ] Host can see all team scratchboards

### Mentor Features
- [ ] Logged-in users can request mentor access after joining hackathon
- [ ] Host sees pending mentor requests and can approve/reject
- [ ] Approved mentors see hackathon in "Mentoring" section of their dashboard
- [ ] Mentors can view all team scratchboards (read-only)
- [ ] Mentors can see aggregated blockers across all teams
- [ ] Mentors cannot edit hackathon settings or team assignments

### Activity Integration
- [ ] Activities (ideation, judging) can be linked to hackathon
- [ ] Participants flow seamlessly between hackathon and activities

### Security & Quality
- [ ] Security rules prevent unauthorized access
- [ ] Input validation prevents XSS and injection attacks
- [ ] Session codes are cryptographically secure
