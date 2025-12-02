# gQuiz Feature Backlog

## Summary of Implemented Features

### Security Features ✅

| Feature | Status | Impact | Description |
|---------|--------|--------|-------------|
| Server-side score calculation | ✅ Implemented | Critical | Cloud Function validates answers and calculates scores server-side, preventing client manipulation |
| Firestore security rules | ✅ Implemented | Critical | Players cannot modify scores, strict field validation, nickname length enforcement |
| Environment variables | ✅ Implemented | High | Firebase config moved to .env.local, no secrets in code |
| File size validation | ✅ Implemented | High | 5MB limit on image uploads prevents abuse |
| File type validation | ✅ Implemented | Medium | Only PNG, JPEG, GIF allowed |
| Nickname validation | ✅ Implemented | Medium | 2-20 character limit enforced |
| Stronger Game PINs | ✅ Implemented | Medium | 8 characters (208B combinations) vs 6 characters (308M combinations) |
| Input length limits | ✅ Implemented | Low | maxLength on all input fields |
| Email-based quiz sharing | ✅ Implemented | Medium | Share quizzes with specific users only, no public sharing |
| CORS policy review | ✅ Implemented | Medium | Ensure Cloud Functions only accept requests from authorized origins |

### Feature Enhancements ✅

| Feature | Status | Impact | Description |
|---------|--------|--------|-------------|
| QR code for joining | ✅ Implemented | High | Players can scan QR code to join games instantly |
| No Answer screen | ✅ Implemented | High | Players see distinct orange screen when timer expires |
| Quiz sharing | ✅ Implemented | High | Share quizzes with other hosts, host directly or copy |
| Player state refactoring | ✅ Implemented | Critical | Fixed sync issues, proper state machine implementation |
| Multiple correct answers | ✅ Implemented | High | Questions can have multiple correct answers |
| Material You design | ✅ Implemented | Medium | Modern Google Material Design 3 styling |
| Streak tracking | ✅ Implemented | Medium | Server-side streak calculation with UI display on results and leaderboards |
| Question timer visibility | ✅ Implemented | High | Timer bar shown on host screen during questions |
| Copy quiz (own) | ✅ Implemented | Medium | Duplicate your own quizzes to modify |
| AI quiz generation | ✅ Implemented | Very High | Generate quiz questions from topics using Gemini 3 Pro |
| AI image generation | ✅ Implemented | High | Generate question images with AI, preview & regenerate flow |
| Question crowdsourcing | ✅ Implemented | High | Players submit questions in lobby, AI evaluates and selects best ones |

### UX/UI Enhancements ✅

| Feature | Status | Impact | Description |
|---------|--------|--------|-------------|
| Toast notifications | ✅ Implemented | Medium | Consistent notification system with 20+ usages across app |
| Confirmation dialogs | ✅ Implemented | Medium | All destructive actions require confirmation (delete quiz/game, cancel game, delete share) |

### Infrastructure & DevOps ✅

| Feature | Status | Impact | Description |
|---------|--------|--------|-------------|
| CI/CD pipeline | ✅ Implemented | High | Cloud Build automated deployment with dev/prod environments |

### Documentation ✅

| Feature | Status | Impact | Description |
|---------|--------|--------|-------------|
| Architecture diagram | ✅ Implemented | High | Comprehensive architecture diagrams in docs/architecture/blueprint.md |
| Deployment checklist | ✅ Implemented | High | Complete deployment guide in docs/deployment/DEPLOYMENT.md |


---

## Proposed Security Improvements

### Priority 1: Critical Security

| Feature | Effort | Impact | Description |
|---------|--------|--------|-------------|
| Rate limiting | Medium | High | Prevent spam answer submissions, limit to 1 answer per question |
| Game PIN expiry | Low | Medium | Expire game PINs after X hours to prevent stale lobbies |
| Audit logging | Medium | Medium | Log critical actions (quiz creation, game hosting, answer submissions) for security analysis |


### Priority 2: Important Security

| Feature | Effort | Impact | Description |
|---------|--------|--------|-------------|
| Content moderation | High | Medium | Filter inappropriate content in quiz titles, questions, answers |
| Session timeout | Low | Low | Auto-logout after inactivity to prevent unauthorized access |
| Brute force protection | Medium | Low | Limit game PIN guessing attempts (e.g., 10 tries per IP per hour) |
| XSS sanitization | Medium | Medium | Sanitize all user input to prevent XSS attacks |
| SQL injection check | Low | N/A | Already protected (using Firestore, not SQL) - document this |

### Priority 3: Nice to Have

| Feature | Effort | Impact | Description |
|---------|--------|--------|-------------|
| CAPTCHA for joining | Medium | Low | Prevent bot accounts from joining games (may hurt UX) |
| Two-factor auth | High | Low | 2FA for host accounts |
| IP-based abuse detection | High | Low | Detect and block suspicious patterns |
| Content Security Policy | Low | Low | Add CSP headers to prevent certain attack vectors |

---

## Proposed Feature Enhancements

### Priority 1: High Impact, Low Effort (Quick Wins)

| Feature | Effort | Impact | User Value | Description |
|---------|--------|--------|------------|-------------|
| Quiz categories/tags | Low | High | High | Organize quizzes by category (Science, History, Math, etc.) |
| Question randomization | Low | High | High | Randomize question order each game for fairness |
| Answer randomization | Low | High | High | Randomize answer order to prevent memorization |
| Export results CSV | Medium | Medium | High | Download game results for analysis |
| Quiz templates | Medium | High | High | Starter templates for common quiz types |
| Copy quiz (own) | Low | Medium | Medium | Duplicate your own quizzes to modify |
| Quiz search | Medium | High | High | Search your quizzes by title |
| Practice mode | Medium | High | High | Players can practice quizzes solo without competing |

### Priority 2: High Impact, Medium Effort

| Feature | Effort | Impact | User Value | Description |
|---------|--------|--------|------------|-------------|
| Player statistics | Medium | High | High | Track player performance over time, win/loss ratio |
| Leaderboard history | Medium | Medium | High | View past game leaderboards |
| Team mode | High | High | Very High | Players join teams and compete together |
| Sound effects | Low | Medium | Medium | Add audio feedback for correct/incorrect answers |
| Custom themes | Medium | Medium | High | Allow hosts to customize quiz colors/branding |
| Scheduled games | High | Medium | High | Schedule games to start at specific times |

### Priority 3: High Impact, High Effort

| Feature | Effort | Impact | User Value | Description |
|---------|--------|--------|------------|-------------|
| Analytics dashboard | High | High | Very High | Detailed analytics: most missed questions, average scores, participation trends |
| Mobile app (React Native) | Very High | Very High | Very High | Native iOS/Android apps |
| Real-time chat | High | Medium | Medium | Players can chat during lobby/results |
| Tournament mode | Very High | High | High | Multi-round tournaments with brackets |
| Video/audio questions | High | High | High | Embed videos or audio clips in questions |
| Offline mode | Very High | Medium | Medium | Play quizzes without internet (PWA) |
| Multiple question types | High | High | High | True/false, fill-in-blank, matching, ordering |
| Image-based answers | Medium | High | High | Answer choices can be images instead of text |
| Accessibility improvements | Medium | High | High | ARIA labels, screen reader support, keyboard navigation |

### Priority 4: Nice to Have

| Feature | Effort | Impact | User Value | Description |
|---------|--------|--------|------------|-------------|
| Achievements/badges | High | Medium | Medium | Unlock badges for milestones |
| Reactions/emojis | Medium | Low | Low | Players send reactions during game |
| Power-ups | High | Medium | Medium | Special abilities like "skip question" or "50/50" |
| Lives system | Medium | Medium | Medium | Players get X lives, eliminated after losing all |
| Hints system | Medium | Medium | Medium | Provide optional hints for difficult questions |
| Custom game modes | Very High | Medium | Medium | Rapid fire, sudden death, etc. |
| LMS integration | Very High | High | High | Integrate with Google Classroom, Canvas, Moodle |
| ~~AI quiz generation~~ | ~~Very High~~ | ~~High~~ | ~~Very High~~ | ~~Use AI to generate quiz questions from topics~~ ✅ Implemented |
| Collaborative editing | High | Medium | Medium | Multiple hosts can edit same quiz simultaneously |
| Quiz versioning | Medium | Low | Low | Track quiz changes over time, revert to previous versions |

---

## UX/UI Improvements

### Priority 1: Quick Wins

| Feature | Effort | Impact | Description |
|---------|--------|--------|-------------|
| Loading skeletons | Low | Medium | Expand loading skeletons to all pages (currently only lobby and some pages) |
| Error boundaries | Low | High | Graceful error handling with user-friendly messages |
| Responsive design audit | Medium | High | Ensure perfect mobile experience |
| Dark mode | Medium | Medium | Toggle between light/dark themes |
| Animations | Low | Medium | Add comprehensive screen transition animations (basic CSS transitions exist) |

### Priority 2: Important

| Feature | Effort | Impact | Description |
|---------|--------|--------|-------------|
| Onboarding tutorial | Medium | High | First-time user walkthrough |
| Help documentation | Medium | High | In-app help section with FAQs |
| Keyboard shortcuts | Low | Low | Power user keyboard navigation (basic form handling exists, need app-wide shortcuts) |
| Undo/redo | Medium | Medium | Undo quiz edits |
| Auto-save drafts | Medium | High | Save quiz progress automatically |

---

## Infrastructure & DevOps

### Priority 1: Critical

| Feature | Effort | Impact | Description |
|---------|--------|--------|-------------|
| Monitoring & alerts | Medium | High | Set up error tracking (Sentry), uptime monitoring |
| Automated testing | High | Very High | Unit tests, integration tests, E2E tests |
| Database backups | Low | Critical | Automated daily Firestore backups |
| Performance monitoring | Medium | High | Track page load times, function execution times |

### Priority 2: Important

| Feature | Effort | Impact | Description |
|---------|--------|--------|-------------|
| CDN for images | Low | Medium | Use Cloud CDN for faster image loading |
| Code splitting | Medium | Medium | Reduce bundle size with lazy loading |
| Database indexes | Low | High | Optimize Firestore queries with comprehensive indexes (basic sharing indexes exist) |
| Caching strategy | Medium | Medium | Cache static assets, implement stale-while-revalidate |
| Load testing | Medium | High | Test app with 1000+ concurrent players |

---

## Documentation

### Priority 1: Essential

| Document | Effort | Impact | Description |
|----------|--------|--------|-------------|
| API documentation | Medium | High | Create dedicated API reference (inline JSDoc exists but no comprehensive docs) |
| Contributing guide | Low | Medium | Guidelines for contributors |

### Priority 2: Nice to Have

| Document | Effort | Impact | Description |
|----------|--------|--------|-------------|
| User manual | Medium | High | End-user documentation for hosts and players |
| Video tutorials | High | High | How-to videos for creating quizzes, hosting games |
| FAQ | Low | Medium | Common questions and answers |

---

## Code Quality & Refactoring

### Phase 2: Additional Refactoring Opportunities

| Feature | Effort | Lines Saved | Description |
|---------|--------|-------------|-------------|
| Extract host answer grid component | Low | ~20 | Component for answer rendering with colors/icons (`page.tsx:206-222`) |
| Extract slide question display component | Medium | ~35 | Shared component for host/player slide rendering (removes duplication) |
| Extract card wrapper patterns | Low | ~18 | `<StatCard>` component for common Card+CardContent patterns |
| Slider display badges component | Trivial | ~8 | Component for "Correct: ≤10% error" badges |
| Game not found state component | Low | ~15 | `<NotFoundState>` reusable across pages |
| Centered screen layout wrapper | Trivial | ~10 | `<CenteredScreen>` wrapper used in 8+ player screens |
| hasPlayerAnswered utility | Trivial | ~15 | Function to check answer fields (timer hook, answer distribution) |
| Result display logic hook | Low | ~18 | `useResultDisplay(lastAnswer)` returns `{bgColor, icon, message}` |

**Total potential savings**: ~139 lines
**Estimated time**: 4-5 hours

**Already completed (Phase 1)**:
- ✅ Answer colors constant (~15 lines)
- ✅ Merged timer hooks (~25 lines)
- ✅ Loading spinner component (~12 lines)
- ✅ Question counter component (~8 lines)
- ✅ Question type badges component (~10 lines)
- ✅ isLastQuestion utility (~6 lines)
- ✅ Consolidated error handling (~30 lines)

**Phase 1 savings**: ~106 lines + 58% reduction in main page files

---

## Prioritization Framework

### Scoring Criteria

**Impact**: How much value does this bring?
- Critical: Prevents major issues or enables core functionality
- High: Significantly improves user experience
- Medium: Useful enhancement
- Low: Nice to have

**Effort**: How much work is required?
- Low: < 1 day
- Medium: 1-3 days
- High: 1-2 weeks
- Very High: > 2 weeks

**User Value**: How much do users want this?
- Very High: Frequently requested, core need
- High: Commonly requested
- Medium: Occasionally requested
- Low: Rarely mentioned

### Recommended Next Steps

Based on impact/effort analysis, implement in this order:

1. **Critical infrastructure** (Must-do for production stability)
   - Database backups (automated daily Firestore backups)
   - Error boundaries (React error boundaries for graceful error handling)
   - Monitoring & alerts (Sentry, uptime monitoring)

2. **Quick wins** (High impact, low effort features)
   - Answer randomization (randomize answer order to prevent memorization)
   - Question randomization (randomize question order for fairness)
   - Quiz categories/tags (organize quizzes by category)
   - Quiz search (search quizzes by title)

3. **Security hardening** (Priority 1 security items)
   - Rate limiting (prevent spam submissions)
   - Game PIN expiry (expire PINs after X hours)
   - Audit logging (log critical actions)

4. **High-value features** (Priority 2 features)
   - Practice mode (solo quiz practice)
   - Player statistics (track performance over time)
   - Team mode (collaborative gameplay)
   - Auto-save drafts (save quiz progress)

5. **UX polish** (Expand existing partial implementations)
   - Expand loading skeletons to all pages
   - Comprehensive screen transition animations
   - Responsive design audit
   - Dark mode

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.4 | 2025-12-02 | Added question crowdsourcing to implemented features |
| 1.3 | 2025-11-25 | Added AI quiz generation and AI image generation to implemented features |
| 1.2 | 2025-11-21 | Comprehensive audit: Removed 9 fully implemented features, updated 4 partial implementations with clarifications |
| 1.1 | 2025-11-17 | Added Phase 1 refactoring completion notes and Phase 2 opportunities |
| 1.0 | 2025-11-10 | Initial backlog based on implemented features and security review |

---

## Notes

- All security features should be tested thoroughly before production deployment
- User testing should be conducted for major features before full rollout
- Performance impact should be measured for all new features
- Accessibility should be considered for all UI changes
- Mobile-first approach for all new screens
