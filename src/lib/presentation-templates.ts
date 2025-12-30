import { PresentationTemplate, PresentationSlide } from './types';

/**
 * Generate a unique ID for slides
 */
function generateId(): string {
  return `slide-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Workshop Kickoff Template
 * - Welcome slide
 * - Ice breaker poll
 * - Expectations gathering
 * - Agenda slide
 */
const workshopKickoffSlides: PresentationSlide[] = [
  {
    id: generateId(),
    type: 'content',
    order: 0,
    title: 'Welcome!',
    description: 'We\'re excited to have you here. Let\'s get started with some introductions.',
  },
  {
    id: generateId(),
    type: 'poll',
    order: 1,
    question: {
      type: 'poll-single',
      text: 'How are you feeling about today\'s session?',
      answers: [
        { text: 'Excited and ready to learn!' },
        { text: 'Curious but a bit nervous' },
        { text: 'Just here for the coffee' },
        { text: 'Looking forward to networking' },
      ],
    },
  },
  {
    id: generateId(),
    type: 'thoughts-collect',
    order: 2,
    thoughtsPrompt: 'What do you hope to learn or achieve today?',
    thoughtsMaxPerPlayer: 3,
  },
  {
    id: generateId(),
    type: 'thoughts-results',
    order: 3,
    sourceSlideId: '', // Will be linked after creation
  },
  {
    id: generateId(),
    type: 'content',
    order: 4,
    title: 'Agenda',
    description: '1. Introduction & Icebreakers\n2. Main Topic Deep Dive\n3. Hands-on Activities\n4. Q&A and Wrap-up',
  },
];

// Link thoughts-results to thoughts-collect
workshopKickoffSlides[3].sourceSlideId = workshopKickoffSlides[2].id;

/**
 * Training Session Template
 * - Intro slide
 * - Pre-test quiz (3 questions)
 * - Content placeholder
 * - Post-test quiz
 * - Feedback rating
 */
const trainingSessionSlides: PresentationSlide[] = [
  {
    id: generateId(),
    type: 'content',
    order: 0,
    title: 'Training Session',
    description: 'Welcome to this training module. Let\'s start with a quick knowledge check.',
  },
  {
    id: generateId(),
    type: 'quiz',
    order: 1,
    question: {
      type: 'single-choice',
      text: 'Pre-test Question 1: [Add your question here]',
      answers: [
        { text: 'Option A', isCorrect: true },
        { text: 'Option B' },
        { text: 'Option C' },
        { text: 'Option D' },
      ],
      correctAnswerIndex: 0,
      timeLimit: 30,
    },
  },
  {
    id: generateId(),
    type: 'quiz',
    order: 2,
    question: {
      type: 'single-choice',
      text: 'Pre-test Question 2: [Add your question here]',
      answers: [
        { text: 'Option A' },
        { text: 'Option B', isCorrect: true },
        { text: 'Option C' },
        { text: 'Option D' },
      ],
      correctAnswerIndex: 1,
      timeLimit: 30,
    },
  },
  {
    id: generateId(),
    type: 'content',
    order: 3,
    title: 'Main Content',
    description: 'Add your training content slides here. You can insert content slides, images, or additional activities.',
  },
  {
    id: generateId(),
    type: 'quiz',
    order: 4,
    question: {
      type: 'single-choice',
      text: 'Post-test Question: [Add your question here]',
      answers: [
        { text: 'Option A' },
        { text: 'Option B' },
        { text: 'Option C', isCorrect: true },
        { text: 'Option D' },
      ],
      correctAnswerIndex: 2,
      timeLimit: 30,
    },
  },
  {
    id: generateId(),
    type: 'leaderboard',
    order: 5,
    leaderboardMode: 'podium',
    leaderboardMaxDisplay: 10,
    leaderboardTitle: 'Training Results',
  },
];

/**
 * Team Feedback Template
 * - Topic intro
 * - Rate 3 aspects
 * - Open thoughts
 * - Summary
 */
const teamFeedbackSlides: PresentationSlide[] = [
  {
    id: generateId(),
    type: 'content',
    order: 0,
    title: 'Team Feedback Session',
    description: 'Let\'s gather your thoughts and feedback on our recent work.',
  },
  {
    id: generateId(),
    type: 'rating-describe',
    order: 1,
    ratingItem: {
      title: 'Team Communication',
      description: 'How well is our team communicating?',
    },
  },
  {
    id: generateId(),
    type: 'rating-input',
    order: 2,
    sourceDescribeSlideId: '', // Will be linked
    ratingMetric: {
      type: 'stars',
      min: 1,
      max: 5,
      question: 'Rate our team communication',
    },
  },
  {
    id: generateId(),
    type: 'rating-describe',
    order: 3,
    ratingItem: {
      title: 'Project Progress',
      description: 'How do you feel about our current progress?',
    },
  },
  {
    id: generateId(),
    type: 'rating-input',
    order: 4,
    sourceDescribeSlideId: '', // Will be linked
    ratingMetric: {
      type: 'stars',
      min: 1,
      max: 5,
      question: 'Rate our project progress',
    },
  },
  {
    id: generateId(),
    type: 'rating-results',
    order: 5,
    ratingResultsMode: 'comparison',
    comparisonSlideIds: [], // Will be linked
  },
  {
    id: generateId(),
    type: 'thoughts-collect',
    order: 6,
    thoughtsPrompt: 'What suggestions do you have for improvement?',
    thoughtsMaxPerPlayer: 3,
  },
  {
    id: generateId(),
    type: 'thoughts-results',
    order: 7,
    sourceSlideId: '', // Will be linked
  },
  {
    id: generateId(),
    type: 'content',
    order: 8,
    title: 'Thank You!',
    description: 'Your feedback is valuable. We\'ll review all suggestions and follow up with action items.',
  },
];

// Link rating slides
teamFeedbackSlides[2].sourceDescribeSlideId = teamFeedbackSlides[1].id;
teamFeedbackSlides[4].sourceDescribeSlideId = teamFeedbackSlides[3].id;
teamFeedbackSlides[5].comparisonSlideIds = [teamFeedbackSlides[2].id, teamFeedbackSlides[4].id];
teamFeedbackSlides[5].sourceSlideId = teamFeedbackSlides[2].id;
teamFeedbackSlides[7].sourceSlideId = teamFeedbackSlides[6].id;

/**
 * Quick Poll Template
 * - Question intro
 * - Poll
 * - Discussion
 */
const quickPollSlides: PresentationSlide[] = [
  {
    id: generateId(),
    type: 'content',
    order: 0,
    title: 'Quick Poll',
    description: 'Let\'s hear what everyone thinks!',
  },
  {
    id: generateId(),
    type: 'poll',
    order: 1,
    question: {
      type: 'poll-single',
      text: 'What\'s your preference?',
      answers: [
        { text: 'Option A' },
        { text: 'Option B' },
        { text: 'Option C' },
        { text: 'No preference' },
      ],
    },
  },
  {
    id: generateId(),
    type: 'content',
    order: 2,
    title: 'Discussion',
    description: 'Let\'s discuss the results and next steps.',
  },
];

/**
 * Retrospective Template
 * - What went well
 * - What to improve
 * - Action items
 * - Summary
 */
const retrospectiveSlides: PresentationSlide[] = [
  {
    id: generateId(),
    type: 'content',
    order: 0,
    title: 'Team Retrospective',
    description: 'Let\'s reflect on our recent sprint/project and identify areas for improvement.',
  },
  {
    id: generateId(),
    type: 'thoughts-collect',
    order: 1,
    thoughtsPrompt: 'What went well? What should we keep doing?',
    thoughtsMaxPerPlayer: 3,
  },
  {
    id: generateId(),
    type: 'thoughts-results',
    order: 2,
    sourceSlideId: '', // Will be linked
  },
  {
    id: generateId(),
    type: 'thoughts-collect',
    order: 3,
    thoughtsPrompt: 'What could be improved? What should we change?',
    thoughtsMaxPerPlayer: 3,
  },
  {
    id: generateId(),
    type: 'thoughts-results',
    order: 4,
    sourceSlideId: '', // Will be linked
  },
  {
    id: generateId(),
    type: 'thoughts-collect',
    order: 5,
    thoughtsPrompt: 'What action items should we commit to?',
    thoughtsMaxPerPlayer: 2,
  },
  {
    id: generateId(),
    type: 'thoughts-results',
    order: 6,
    sourceSlideId: '', // Will be linked
  },
  {
    id: generateId(),
    type: 'content',
    order: 7,
    title: 'Next Steps',
    description: 'We\'ll compile these action items and assign owners. Thank you for your participation!',
  },
];

// Link thoughts-results slides
retrospectiveSlides[2].sourceSlideId = retrospectiveSlides[1].id;
retrospectiveSlides[4].sourceSlideId = retrospectiveSlides[3].id;
retrospectiveSlides[6].sourceSlideId = retrospectiveSlides[5].id;

/**
 * All built-in templates
 */
export const BUILTIN_TEMPLATES: PresentationTemplate[] = [
  {
    id: 'workshop-kickoff',
    name: 'Workshop Kickoff',
    description: 'Start your workshop with icebreakers and expectation gathering',
    category: 'workshop',
    slides: workshopKickoffSlides,
    isBuiltIn: true,
  },
  {
    id: 'training-session',
    name: 'Training Session',
    description: 'Pre-test, content, post-test structure with leaderboard',
    category: 'training',
    slides: trainingSessionSlides,
    isBuiltIn: true,
  },
  {
    id: 'team-feedback',
    name: 'Team Feedback',
    description: 'Gather ratings and suggestions from your team',
    category: 'feedback',
    slides: teamFeedbackSlides,
    isBuiltIn: true,
  },
  {
    id: 'quick-poll',
    name: 'Quick Poll',
    description: 'Simple poll with discussion slide',
    category: 'meeting',
    slides: quickPollSlides,
    isBuiltIn: true,
  },
  {
    id: 'retrospective',
    name: 'Retrospective',
    description: 'What went well, what to improve, action items',
    category: 'meeting',
    slides: retrospectiveSlides,
    isBuiltIn: true,
  },
];

/**
 * Get a template by ID
 */
export function getBuiltInTemplate(id: string): PresentationTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}

/**
 * Clone template slides with new IDs
 * This ensures each presentation created from a template has unique slide IDs
 */
export function cloneTemplateSlides(slides: PresentationSlide[]): PresentationSlide[] {
  // Create a mapping of old IDs to new IDs
  const idMap = new Map<string, string>();

  // First pass: generate new IDs
  slides.forEach((slide) => {
    idMap.set(slide.id, generateId());
  });

  // Second pass: clone slides with new IDs and update references
  return slides.map((slide) => {
    const newSlide = { ...slide, id: idMap.get(slide.id)! };

    // Update any references to other slides
    if (newSlide.sourceSlideId && idMap.has(newSlide.sourceSlideId)) {
      newSlide.sourceSlideId = idMap.get(newSlide.sourceSlideId);
    }
    if (newSlide.sourceDescribeSlideId && idMap.has(newSlide.sourceDescribeSlideId)) {
      newSlide.sourceDescribeSlideId = idMap.get(newSlide.sourceDescribeSlideId);
    }
    if (newSlide.comparisonSlideIds) {
      newSlide.comparisonSlideIds = newSlide.comparisonSlideIds
        .map((id) => idMap.get(id) || id);
    }

    return newSlide;
  });
}
