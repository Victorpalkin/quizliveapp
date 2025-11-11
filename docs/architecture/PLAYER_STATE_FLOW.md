# Player State Management Flow

## State Machine

```
Player States:
┌──────────┐
│ joining  │  Initial state when page loads
└────┬─────┘
     │ (host starts game)
     ▼
┌──────────┐
│  lobby   │  Waiting for game to start
└────┬─────┘
     │ (host clicks "Start Game")
     ▼
┌──────────┐
│preparing │  Get ready for question - ALL STATE RESET HERE
└────┬─────┘
     │ (host shows question)
     ▼
┌──────────┐
│ question │  Answering question, timer running
└────┬─────┘
     │ (player answers OR timeout)
     ▼
┌──────────┐
│ waiting  │  Waiting for host to show leaderboard
└────┬─────┘
     │ (host shows leaderboard)
     ▼
┌──────────┐
│  result  │  Viewing correct/incorrect/no answer screen
└────┬─────┘
     │ (host clicks next question)
     ▼
  (back to preparing for next question)
     OR
     │ (host ends game)
     ▼
┌──────────┐
│  ended   │  Final scores
└──────────┘
```

## Host-Player State Synchronization

| Host State    | Player State Transition                                      |
|---------------|-------------------------------------------------------------|
| lobby         | joining → lobby                                              |
| preparing     | any (except joining/cancelled) → preparing                   |
| question      | preparing → question                                         |
| leaderboard   | waiting → result OR (question + timedOut) → result          |
| ended         | any → ended                                                  |

## Critical State Resets

### When entering 'preparing' state:
- ✅ Reset `answerSelected` to null
- ✅ Reset `timedOut` to false
- ✅ Reset `lastAnswer` to null
- ✅ Reset player's `lastAnswerIndex` in Firestore

### When entering 'question' state:
- ✅ Reset `time` to `timeLimit`
- ✅ Start countdown timer

## Timeout Handling

When timer reaches 0 and player hasn't answered:

1. Set `timedOut = true`
2. Set `answerSelected = -1`
3. Set `lastAnswer` with timeout data:
   ```js
   {
     selected: -1,
     correct: question.correctAnswerIndices,
     points: 0,
     wasTimeout: true
   }
   ```
4. Call `handleAnswer(-1)` to submit to server
5. Transition to 'waiting' (if still in 'question' state)
6. Special case: If host already moved to 'leaderboard', transition directly to 'result'

## Race Condition Handling

**Problem**: Host and player timers may desync slightly

**Solution**:
- Player sets local state immediately when timeout occurs
- Attempts server submission but doesn't block on it
- If host already moved to 'leaderboard' when timeout occurs, player still transitions to 'result'
- Local `lastAnswer` state ensures "No Answer" screen displays even if server call fails

## Key Dependencies

### State Sync Effect
```javascript
useEffect(() => {
  // Syncs player state with host game state
}, [game?.state, game?.currentQuestionIndex, gameLoading, timedOut]);
```
- Runs when host changes game state or question index
- Checks `timedOut` to handle race conditions

### Preparing Reset Effect
```javascript
useEffect(() => {
  // Resets all answer state for new question
}, [state, game?.currentQuestionIndex]);
```
- Runs when entering 'preparing' state
- Ensures clean slate for next question

### Timer Effect
```javascript
useEffect(() => {
  // Starts countdown timer
}, [state, game?.currentQuestionIndex, timeLimit]);
```
- Runs when entering 'question' state or question changes
- Independent of answer state

### Timeout Handler Effect
```javascript
useEffect(() => {
  // Handles timeout when time reaches 0
}, [time, state, answerSelected, timedOut]);
```
- Watches for time=0 condition
- Only triggers if not already timed out

## Bug Fixes

### Issue 1: Player stuck on "Answer correct" screen
**Cause**: State sync only triggered on `game` object change, not specific state changes

**Fix**: Changed dependency to `[game?.state, game?.currentQuestionIndex]` for explicit tracking

### Issue 2: "No answer" screen returns to question
**Cause**: Answer state not properly reset when new question starts

**Fix**: Added dedicated 'preparing' state reset that clears all answer-related state before next question
