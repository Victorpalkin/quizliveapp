import type {
  PresentationSlide,
  PresentationSettings,
  PresentationTheme,
  PresentationTemplate,
  SlideElement,
} from '@/lib/types/presentation';
import { AGENTIC_DESIGNER_STEPS, AGENTIC_DESIGNER_SYSTEM_PROMPT } from '@/lib/agentic-designer-steps';

// ==========================================
// Built-in Presentation Templates
// ==========================================

/**
 * Default presentation settings used across all templates.
 */
const DEFAULT_SETTINGS: PresentationSettings = {
  enableReactions: true,
  enableQA: true,
  enableStreaks: true,
  enableSoundEffects: true,
  defaultTimerSeconds: 20,
  pacingMode: 'free',
  pacingThreshold: 80,
};

/**
 * Default presentation theme.
 */
const DEFAULT_THEME: PresentationTheme = {
  preset: 'default',
};

// ==========================================
// Helper Functions
// ==========================================

/**
 * Create a text element for slide titles/headers.
 */
function createTitleElement(id: string, content: string): SlideElement {
  return {
    id,
    type: 'text',
    x: 10,
    y: 30,
    width: 80,
    height: 40,
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    content,
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000',
  };
}

/**
 * Create a text element for step headers.
 */
function createStepHeader(id: string, content: string): SlideElement {
  return {
    id,
    type: 'text',
    x: 2,
    y: 1,
    width: 96,
    height: 5,
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    content,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'left',
    color: '#000000',
  };
}

/**
 * Create an ai-step element with standard positioning.
 */
function createAIStepElement(id: string, stepConfig: typeof AGENTIC_DESIGNER_STEPS[number]): SlideElement {
  return {
    id,
    type: 'ai-step',
    x: 2,
    y: 7,
    width: 96,
    height: 88,
    zIndex: 2,
    opacity: 1,
    rotation: 0,
    aiStepConfig: {
      stepPrompt: stepConfig.aiPrompt,
      inputFields: stepConfig.fields,
      outputExpectation: stepConfig.outputExpectation,
      enablePlayerNudges: true,
      nudgeHints: stepConfig.nudgeHints,
      enableGoogleSearch: [1, 2, 7, 8].includes(stepConfig.id),
      enableImageGeneration: stepConfig.id === 10,
      enableStructuredExtraction: [3, 6, 7, 8].includes(stepConfig.id),
      contextSlideIds: stepConfig.dependsOn.map(dep => `ead-slide-${dep + 1}`),
    },
  };
}

// ==========================================
// Template 1: Enterprise AI Designer
// ==========================================

const ENTERPRISE_AI_DESIGNER_SLIDES: PresentationSlide[] = [
  // Slide 1: Title
  {
    id: 'ead-slide-1',
    order: 0,
    elements: [
      createTitleElement(
        'ead-el-1-1',
        '# Agentic Enterprise Design Session\n\nAI-guided workshop for designing enterprise data products'
      ),
    ],
    transition: 'fade',
  },

  // Slide 2: Step 1 - Research
  {
    id: 'ead-slide-2',
    order: 1,
    elements: [
      createStepHeader('ead-el-2-1', '## Step 1: Research'),
      createAIStepElement('ead-el-2-2', AGENTIC_DESIGNER_STEPS[0]),
    ],
    transition: 'fade',
  },

  // Slide 3: Step 2 - Business Context
  {
    id: 'ead-slide-3',
    order: 2,
    elements: [
      createStepHeader('ead-el-3-1', '## Step 2: Business Context'),
      createAIStepElement('ead-el-3-2', AGENTIC_DESIGNER_STEPS[1]),
    ],
    transition: 'fade',
  },

  // Slide 4: Step 3 - Agentic Enterprise Use Cases
  {
    id: 'ead-slide-4',
    order: 3,
    elements: [
      createStepHeader('ead-el-4-1', '## Step 3: Agentic Enterprise Use Cases'),
      createAIStepElement('ead-el-4-2', AGENTIC_DESIGNER_STEPS[2]),
    ],
    transition: 'fade',
  },

  // Slide 5: Step 4 - Source Domains
  {
    id: 'ead-slide-5',
    order: 4,
    elements: [
      createStepHeader('ead-el-5-1', '## Step 4: Source Domains'),
      createAIStepElement('ead-el-5-2', AGENTIC_DESIGNER_STEPS[3]),
    ],
    transition: 'fade',
  },

  // Slide 6: Step 5 - Data Readiness Assessment
  {
    id: 'ead-slide-6',
    order: 5,
    elements: [
      createStepHeader('ead-el-6-1', '## Step 5: Data Readiness Assessment'),
      createAIStepElement('ead-el-6-2', AGENTIC_DESIGNER_STEPS[4]),
    ],
    transition: 'fade',
  },

  // Slide 7: Step 6 - Use Case Viability
  {
    id: 'ead-slide-7',
    order: 6,
    elements: [
      createStepHeader('ead-el-7-1', '## Step 6: Use Case Viability'),
      createAIStepElement('ead-el-7-2', AGENTIC_DESIGNER_STEPS[5]),
    ],
    transition: 'fade',
  },

  // Slide 8: Step 7 - Source Aligned Data Products
  {
    id: 'ead-slide-8',
    order: 7,
    elements: [
      createStepHeader('ead-el-8-1', '## Step 7: Source Aligned Data Products'),
      createAIStepElement('ead-el-8-2', AGENTIC_DESIGNER_STEPS[6]),
    ],
    transition: 'fade',
  },

  // Slide 9: Step 8 - Consumption Data Products
  {
    id: 'ead-slide-9',
    order: 8,
    elements: [
      createStepHeader('ead-el-9-1', '## Step 8: Consumption Data Products'),
      createAIStepElement('ead-el-9-2', AGENTIC_DESIGNER_STEPS[7]),
    ],
    transition: 'fade',
  },

  // Slide 10: Step 9 - Value Hypothesis
  {
    id: 'ead-slide-10',
    order: 9,
    elements: [
      createStepHeader('ead-el-10-1', '## Step 9: Value Hypothesis'),
      createAIStepElement('ead-el-10-2', AGENTIC_DESIGNER_STEPS[8]),
    ],
    transition: 'fade',
  },

  // Slide 11: Step 10 - Visualize Solution Map
  {
    id: 'ead-slide-11',
    order: 10,
    elements: [
      createStepHeader('ead-el-11-1', '## Step 10: Visualize Solution Map'),
      createAIStepElement('ead-el-11-2', AGENTIC_DESIGNER_STEPS[9]),
    ],
    transition: 'fade',
  },

  // Slide 12: Step 11 - Agentic Enterprise Analysis
  {
    id: 'ead-slide-12',
    order: 11,
    elements: [
      createStepHeader('ead-el-12-1', '## Step 11: Agentic Enterprise Analysis'),
      createAIStepElement('ead-el-12-2', AGENTIC_DESIGNER_STEPS[10]),
    ],
    transition: 'fade',
  },
];

const ENTERPRISE_AI_DESIGNER_TEMPLATE: Omit<
  PresentationTemplate,
  'id' | 'createdBy' | 'createdAt' | 'updatedAt'
> = {
  name: 'Enterprise AI Designer',
  title: 'Enterprise AI Designer',
  description:
    'AI-guided 11-step enterprise data product design workshop. Research a target company, identify agentic use cases, design source and consumption data products, and generate executive reports with infographics.',
  category: 'strategy',
  slides: ENTERPRISE_AI_DESIGNER_SLIDES,
  settings: {
    ...DEFAULT_SETTINGS,
    workflowConfig: {
      systemPrompt: AGENTIC_DESIGNER_SYSTEM_PROMPT,
    },
  },
  theme: DEFAULT_THEME,
  isBuiltIn: true,
  visibility: 'public',
};

// ==========================================
// Template 2: Strategy Workshop
// ==========================================

const STRATEGY_WORKSHOP_SLIDES: PresentationSlide[] = [
  // Slide 1: Title
  {
    id: 'sw-slide-1',
    order: 0,
    elements: [
      createTitleElement('sw-el-1-1', '# Strategy Workshop\n\nAI-facilitated strategic planning session'),
    ],
    transition: 'fade',
  },

  // Slide 2: Research the strategic landscape
  {
    id: 'sw-slide-2',
    order: 1,
    elements: [
      createStepHeader('sw-el-2-1', '## Research the Strategic Landscape'),
      {
        id: 'sw-el-2-2',
        type: 'ai-step',
        x: 2,
        y: 7,
        width: 96,
        height: 88,
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        aiStepConfig: {
          stepPrompt:
            'Research the strategic landscape for the target organization. Analyze competitive positioning, market trends, regulatory environment, technological disruptions, and customer needs. Provide a comprehensive strategic context analysis with specific insights and data points.',
          inputFields: [
            {
              id: 'organization',
              label: 'Organization',
              type: 'text',
              placeholder: 'Enter the organization name...',
              helpText: 'The organization or business unit for strategic planning.',
            },
            {
              id: 'focus_areas',
              label: 'Focus Areas',
              type: 'textarea',
              placeholder: 'e.g., Market expansion, digital transformation, cost optimization...',
              helpText: 'Optional: specific areas to emphasize in the research.',
            },
          ],
          outputExpectation:
            'A comprehensive strategic landscape analysis covering competitive dynamics, market trends, and key strategic considerations.',
          enablePlayerNudges: true,
          nudgeHints: [
            'Focus more on competitive threats',
            'Dig deeper into emerging technologies',
            'Emphasize regulatory changes',
          ],
          enableGoogleSearch: true,
          enableImageGeneration: false,
          enableStructuredExtraction: false,
          contextSlideIds: [],
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 3: Propose strategic options
  {
    id: 'sw-slide-3',
    order: 2,
    elements: [
      createStepHeader('sw-el-3-1', '## Proposed Strategic Options'),
      {
        id: 'sw-el-3-2',
        type: 'ai-step',
        x: 2,
        y: 7,
        width: 96,
        height: 88,
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        aiStepConfig: {
          stepPrompt:
            'Based on the strategic landscape research, propose 4-5 distinct strategic options. For each option, provide a clear name, strategic rationale, key initiatives, expected outcomes, and potential risks. Present in a structured table format.',
          outputExpectation:
            'A table of 4-5 strategic options with names, rationale, key initiatives, outcomes, and risks.',
          enablePlayerNudges: true,
          nudgeHints: [
            'Add a more aggressive growth option',
            'Include a defensive market protection strategy',
            'Consider a partnership-focused option',
          ],
          enableGoogleSearch: false,
          enableImageGeneration: false,
          enableStructuredExtraction: true,
          contextSlideIds: ['sw-slide-2'],
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 4: Evaluation
  {
    id: 'sw-slide-4',
    order: 3,
    elements: [
      {
        id: 'sw-el-4-1',
        type: 'evaluation',
        x: 5,
        y: 10,
        width: 90,
        height: 80,
        zIndex: 1,
        opacity: 1,
        rotation: 0,
        evaluationConfig: {
          title: 'Rate Strategic Options',
          description: 'Evaluate each strategic option across key dimensions.',
          items: [],
          metrics: [
            {
              id: 'strategic-value',
              name: 'Strategic Value',
              description: 'Long-term value creation potential',
              scaleType: 'stars',
              scaleMin: 1,
              scaleMax: 5,
              weight: 1,
              lowerIsBetter: false,
            },
            {
              id: 'feasibility',
              name: 'Feasibility',
              description: 'Ease of implementation',
              scaleType: 'stars',
              scaleMin: 1,
              scaleMax: 5,
              weight: 1,
              lowerIsBetter: false,
            },
            {
              id: 'risk',
              name: 'Risk Level',
              description: 'Implementation and execution risk',
              scaleType: 'stars',
              scaleMin: 1,
              scaleMax: 5,
              weight: 1,
              lowerIsBetter: true,
            },
          ],
        },
        dynamicItemsSource: {
          sourceSlideId: 'sw-slide-3',
          sourceElementId: 'sw-el-3-2',
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 5: Analyze evaluation results
  {
    id: 'sw-slide-5',
    order: 4,
    elements: [
      createStepHeader('sw-el-5-1', '## Strategic Recommendation'),
      {
        id: 'sw-el-5-2',
        type: 'ai-step',
        x: 2,
        y: 7,
        width: 96,
        height: 88,
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        aiStepConfig: {
          stepPrompt:
            'Analyze the evaluation results from the audience. Identify the top 2 strategic options based on the ratings. Provide a detailed recommendation explaining why these strategies scored highest and how they complement each other. Include specific next steps for each recommended strategy.',
          outputExpectation:
            'Analysis of evaluation results with recommendation for top 2 strategies and specific next steps.',
          enablePlayerNudges: true,
          nudgeHints: [
            'Consider combining elements from multiple strategies',
            'Address the risk concerns more directly',
            'Propose a phased approach',
          ],
          enableGoogleSearch: false,
          enableImageGeneration: false,
          enableStructuredExtraction: false,
          contextSlideIds: ['sw-slide-3', 'sw-slide-4'],
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 6: Final vote
  {
    id: 'sw-slide-6',
    order: 5,
    elements: [
      {
        id: 'sw-el-6-1',
        type: 'poll',
        x: 5,
        y: 10,
        width: 90,
        height: 80,
        zIndex: 1,
        opacity: 1,
        rotation: 0,
        pollConfig: {
          question: 'Final vote: which strategy should we pursue?',
          options: [{ text: 'Strategy A' }, { text: 'Strategy B' }, { text: 'Other' }],
          allowMultiple: false,
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 7: Implementation plan
  {
    id: 'sw-slide-7',
    order: 6,
    elements: [
      createStepHeader('sw-el-7-1', '## 90-Day Implementation Plan'),
      {
        id: 'sw-el-7-2',
        type: 'ai-step',
        x: 2,
        y: 7,
        width: 96,
        height: 88,
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        aiStepConfig: {
          stepPrompt:
            'Generate a detailed 90-day implementation plan for the winning strategy based on the poll results. Break it down into three 30-day phases with specific milestones, deliverables, resource requirements, and success metrics for each phase. Include quick wins for the first 30 days.',
          outputExpectation:
            'A phased 90-day implementation plan with milestones, deliverables, and metrics for each 30-day phase.',
          enablePlayerNudges: true,
          nudgeHints: [
            'Add more detail to Phase 1 quick wins',
            'Include specific team assignments',
            'Add contingency plans',
          ],
          enableGoogleSearch: false,
          enableImageGeneration: false,
          enableStructuredExtraction: false,
          contextSlideIds: ['sw-slide-5', 'sw-slide-6'],
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 8: Gather risk concerns
  {
    id: 'sw-slide-8',
    order: 7,
    elements: [
      {
        id: 'sw-el-8-1',
        type: 'thoughts',
        x: 5,
        y: 10,
        width: 90,
        height: 80,
        zIndex: 1,
        opacity: 1,
        rotation: 0,
        thoughtsConfig: {
          prompt: 'What implementation risks do you foresee?',
          maxPerPlayer: 3,
          timeLimit: 60,
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 9: Risk mitigation plan
  {
    id: 'sw-slide-9',
    order: 8,
    elements: [
      createStepHeader('sw-el-9-1', '## Risk Mitigation Plan'),
      {
        id: 'sw-el-9-2',
        type: 'ai-step',
        x: 2,
        y: 7,
        width: 96,
        height: 88,
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        aiStepConfig: {
          stepPrompt:
            'Review the implementation risks identified by the audience. For each unique risk category, provide a specific mitigation strategy, early warning indicators, and contingency actions. Present in a structured risk register format.',
          outputExpectation:
            'A risk register with mitigation strategies, early warning indicators, and contingencies for each identified risk.',
          enablePlayerNudges: true,
          nudgeHints: [
            'Add mitigation for change management resistance',
            'Include more proactive risk prevention',
            'Address technical integration risks',
          ],
          enableGoogleSearch: false,
          enableImageGeneration: false,
          enableStructuredExtraction: false,
          contextSlideIds: ['sw-slide-7', 'sw-slide-8'],
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 10: Summary
  {
    id: 'sw-slide-10',
    order: 9,
    elements: [createTitleElement('sw-el-10-1', '# Summary & Next Steps')],
    transition: 'fade',
  },
];

const STRATEGY_WORKSHOP_TEMPLATE: Omit<PresentationTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
  name: 'Strategy Workshop',
  title: 'Strategy Workshop',
  description:
    'AI-facilitated strategy development with audience evaluation and voting. Research the landscape, propose options, evaluate with the team, and build an implementation plan.',
  category: 'strategy',
  slides: STRATEGY_WORKSHOP_SLIDES,
  settings: {
    ...DEFAULT_SETTINGS,
    workflowConfig: {
      systemPrompt:
        'You are a strategic advisor specializing in corporate strategy and business transformation. Provide clear, actionable analysis with specific recommendations backed by data. Use professional executive-level language.',
    },
  },
  theme: DEFAULT_THEME,
  isBuiltIn: true,
  visibility: 'public',
};

// ==========================================
// Template 3: AI-Guided Brainstorming
// ==========================================

const BRAINSTORMING_SLIDES: PresentationSlide[] = [
  // Slide 1: Title
  {
    id: 'br-slide-1',
    order: 0,
    elements: [createTitleElement('br-el-1-1', '# Innovation Workshop\n\nAI-guided brainstorming session')],
    transition: 'fade',
  },

  // Slide 2: Research the problem space
  {
    id: 'br-slide-2',
    order: 1,
    elements: [
      createStepHeader('br-el-2-1', '## Research the Problem Space'),
      {
        id: 'br-el-2-2',
        type: 'ai-step',
        x: 2,
        y: 7,
        width: 96,
        height: 88,
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        aiStepConfig: {
          stepPrompt:
            'Research the problem space or innovation challenge. Analyze current solutions, pain points, user needs, market gaps, and emerging trends. Provide context to inspire creative solutions.',
          inputFields: [
            {
              id: 'problem',
              label: 'Problem Statement',
              type: 'textarea',
              placeholder: 'Describe the challenge or opportunity...',
              helpText: 'What problem are we trying to solve or what opportunity are we exploring?',
            },
            {
              id: 'target_users',
              label: 'Target Users',
              type: 'text',
              placeholder: 'Who are we solving for?',
              helpText: 'Define the primary users or beneficiaries.',
            },
          ],
          outputExpectation:
            'A comprehensive problem space analysis covering current state, pain points, user needs, and opportunity areas.',
          enablePlayerNudges: true,
          nudgeHints: [
            'Include more user research insights',
            'Analyze competitor solutions',
            'Highlight emerging technology trends',
          ],
          enableGoogleSearch: true,
          enableImageGeneration: false,
          enableStructuredExtraction: false,
          contextSlideIds: [],
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 3: Generate initial ideas
  {
    id: 'br-slide-3',
    order: 2,
    elements: [
      createStepHeader('br-el-3-1', '## AI-Generated Solution Ideas'),
      {
        id: 'br-el-3-2',
        type: 'ai-step',
        x: 2,
        y: 7,
        width: 96,
        height: 88,
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        aiStepConfig: {
          stepPrompt:
            'Generate 8-10 diverse, creative solution ideas using innovation frameworks like Design Thinking, SCAMPER, and Blue Ocean Strategy. Each idea should be bold but grounded in feasibility. Include a mix of incremental improvements and disruptive innovations. Present as a structured list with idea name, description, and innovation type.',
          outputExpectation:
            'A list of 8-10 creative solution ideas with names, descriptions, and innovation classifications.',
          enablePlayerNudges: true,
          nudgeHints: [
            'Include more disruptive ideas',
            'Add ideas leveraging AI/automation',
            'Consider sustainability angles',
          ],
          enableGoogleSearch: false,
          enableImageGeneration: false,
          enableStructuredExtraction: true,
          contextSlideIds: ['br-slide-2'],
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 4: Gather audience ideas
  {
    id: 'br-slide-4',
    order: 3,
    elements: [
      {
        id: 'br-el-4-1',
        type: 'thoughts',
        x: 5,
        y: 10,
        width: 90,
        height: 80,
        zIndex: 1,
        opacity: 1,
        rotation: 0,
        thoughtsConfig: {
          prompt: 'What ideas would YOU add?',
          maxPerPlayer: 3,
          timeLimit: 90,
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 5: Merge and cluster ideas
  {
    id: 'br-slide-5',
    order: 4,
    elements: [
      createStepHeader('br-el-5-1', '## Clustered Solution Portfolio'),
      {
        id: 'br-el-5-2',
        type: 'ai-step',
        x: 2,
        y: 7,
        width: 96,
        height: 88,
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        aiStepConfig: {
          stepPrompt:
            'Merge the AI-generated ideas with audience contributions. Remove duplicates, refine ideas for clarity, and cluster them into 3-5 thematic categories. Present the complete portfolio organized by theme, with each idea clearly attributed (AI-generated or Audience).',
          outputExpectation:
            'A clustered portfolio of ideas organized by theme, with clear attribution and refined descriptions.',
          enablePlayerNudges: true,
          nudgeHints: [
            'Create a category for hybrid ideas',
            'Emphasize the most innovative audience contributions',
            'Add more detail to underdeveloped ideas',
          ],
          enableGoogleSearch: false,
          enableImageGeneration: false,
          enableStructuredExtraction: true,
          contextSlideIds: ['br-slide-3', 'br-slide-4'],
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 6: Evaluation
  {
    id: 'br-slide-6',
    order: 5,
    elements: [
      {
        id: 'br-el-6-1',
        type: 'evaluation',
        x: 5,
        y: 10,
        width: 90,
        height: 80,
        zIndex: 1,
        opacity: 1,
        rotation: 0,
        evaluationConfig: {
          title: 'Rate Ideas',
          description: 'Evaluate each solution idea across the innovation framework.',
          items: [],
          metrics: [
            {
              id: 'desirability',
              name: 'Desirability',
              description: 'How much do users want this?',
              scaleType: 'stars',
              scaleMin: 1,
              scaleMax: 5,
              weight: 1,
              lowerIsBetter: false,
            },
            {
              id: 'feasibility',
              name: 'Feasibility',
              description: 'Can we build this?',
              scaleType: 'stars',
              scaleMin: 1,
              scaleMax: 5,
              weight: 1,
              lowerIsBetter: false,
            },
            {
              id: 'viability',
              name: 'Viability',
              description: 'Will it be sustainable/profitable?',
              scaleType: 'stars',
              scaleMin: 1,
              scaleMax: 5,
              weight: 1,
              lowerIsBetter: false,
            },
          ],
        },
        dynamicItemsSource: {
          sourceSlideId: 'br-slide-5',
          sourceElementId: 'br-el-5-2',
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 7: Action plan for top ideas
  {
    id: 'br-slide-7',
    order: 6,
    elements: [
      createStepHeader('br-el-7-1', '## Action Plan'),
      {
        id: 'br-el-7-2',
        type: 'ai-step',
        x: 2,
        y: 7,
        width: 96,
        height: 88,
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        aiStepConfig: {
          stepPrompt:
            'Based on evaluation results, identify the top 3 ideas. For each, create a detailed action plan including: prototype/MVP approach, resource requirements, timeline, success metrics, and first 3 steps to take. Present in a structured format.',
          outputExpectation:
            'Detailed action plans for the top 3 ideas with MVPs, resources, timelines, and next steps.',
          enablePlayerNudges: true,
          nudgeHints: [
            'Include user testing in the MVP plan',
            'Add cost estimates',
            'Suggest quick validation experiments',
          ],
          enableGoogleSearch: false,
          enableImageGeneration: false,
          enableStructuredExtraction: false,
          contextSlideIds: ['br-slide-5', 'br-slide-6'],
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 8: Recap
  {
    id: 'br-slide-8',
    order: 7,
    elements: [createTitleElement('br-el-8-1', '# Recap & Next Steps')],
    transition: 'fade',
  },
];

const BRAINSTORMING_TEMPLATE: Omit<PresentationTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
  name: 'AI-Guided Brainstorming',
  title: 'AI-Guided Brainstorming',
  description:
    'Innovation workshop combining AI idea generation with audience input. Research, ideate, evaluate, and create action plans.',
  category: 'brainstorming',
  slides: BRAINSTORMING_SLIDES,
  settings: {
    ...DEFAULT_SETTINGS,
    workflowConfig: {
      systemPrompt:
        'You are a creative innovation facilitator skilled at ideation frameworks like Design Thinking, SCAMPER, and Blue Ocean Strategy. Generate bold, diverse ideas while being grounded in practical feasibility.',
    },
  },
  theme: DEFAULT_THEME,
  isBuiltIn: true,
  visibility: 'public',
};

// ==========================================
// Template 4: Interactive Training
// ==========================================

const TRAINING_SLIDES: PresentationSlide[] = [
  // Slide 1: Title
  {
    id: 'tr-slide-1',
    order: 0,
    elements: [createTitleElement('tr-el-1-1', '# Training Session')],
    transition: 'fade',
  },

  // Slide 2: Explain Concept 1
  {
    id: 'tr-slide-2',
    order: 1,
    elements: [
      createStepHeader('tr-el-2-1', '## Concept 1'),
      {
        id: 'tr-el-2-2',
        type: 'ai-step',
        x: 2,
        y: 7,
        width: 96,
        height: 88,
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        aiStepConfig: {
          stepPrompt:
            'Explain the first key concept clearly and concisely. Use concrete examples, analogies, and visual descriptions. Break down complex ideas into digestible components. Include why this concept matters and how it applies in practice.',
          inputFields: [
            {
              id: 'concept_1',
              label: 'Concept 1',
              type: 'textarea',
              placeholder: 'What should learners understand?',
              helpText: 'The first key concept to teach.',
            },
          ],
          outputExpectation:
            'A clear, example-rich explanation of the concept with practical applications and key takeaways.',
          enablePlayerNudges: true,
          nudgeHints: [
            'Add more real-world examples',
            'Simplify the technical language',
            'Include a visual diagram description',
          ],
          enableGoogleSearch: false,
          enableImageGeneration: false,
          enableStructuredExtraction: false,
          contextSlideIds: [],
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 3: Knowledge Check 1
  {
    id: 'tr-slide-3',
    order: 2,
    elements: [
      {
        id: 'tr-el-3-1',
        type: 'quiz',
        x: 5,
        y: 10,
        width: 90,
        height: 80,
        zIndex: 1,
        opacity: 1,
        rotation: 0,
        quizConfig: {
          question: 'Knowledge Check 1',
          answers: [
            { text: 'Answer A' },
            { text: 'Answer B' },
            { text: 'Answer C' },
            { text: 'Answer D' },
          ],
          correctAnswerIndex: 0,
          timeLimit: 20,
          pointValue: 100,
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 4: Explain Concept 2
  {
    id: 'tr-slide-4',
    order: 3,
    elements: [
      createStepHeader('tr-el-4-1', '## Concept 2'),
      {
        id: 'tr-el-4-2',
        type: 'ai-step',
        x: 2,
        y: 7,
        width: 96,
        height: 88,
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        aiStepConfig: {
          stepPrompt:
            'Explain the second key concept, building on Concept 1 if relevant. Review the quiz results from the previous knowledge check - if scores were low, provide additional clarification and simpler examples. Use clear language and practical applications.',
          inputFields: [
            {
              id: 'concept_2',
              label: 'Concept 2',
              type: 'textarea',
              placeholder: 'What should learners understand next?',
              helpText: 'The second key concept to teach.',
            },
          ],
          outputExpectation:
            'A clear explanation that adapts to quiz performance, with simplified examples if needed.',
          enablePlayerNudges: true,
          nudgeHints: [
            'Connect this to Concept 1 more clearly',
            'Add a comparison table',
            'Include common misconceptions',
          ],
          enableGoogleSearch: false,
          enableImageGeneration: false,
          enableStructuredExtraction: false,
          contextSlideIds: ['tr-slide-2', 'tr-slide-3'],
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 5: Knowledge Check 2
  {
    id: 'tr-slide-5',
    order: 4,
    elements: [
      {
        id: 'tr-el-5-1',
        type: 'quiz',
        x: 5,
        y: 10,
        width: 90,
        height: 80,
        zIndex: 1,
        opacity: 1,
        rotation: 0,
        quizConfig: {
          question: 'Knowledge Check 2',
          answers: [
            { text: 'Answer A' },
            { text: 'Answer B' },
            { text: 'Answer C' },
            { text: 'Answer D' },
          ],
          correctAnswerIndex: 0,
          timeLimit: 20,
          pointValue: 100,
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 6: Explain Concept 3
  {
    id: 'tr-slide-6',
    order: 5,
    elements: [
      createStepHeader('tr-el-6-1', '## Concept 3'),
      {
        id: 'tr-el-6-2',
        type: 'ai-step',
        x: 2,
        y: 7,
        width: 96,
        height: 88,
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        aiStepConfig: {
          stepPrompt:
            'Explain the third key concept, synthesizing with previous concepts where relevant. Continue to adapt based on quiz performance patterns. Provide comprehensive examples and practical applications.',
          inputFields: [
            {
              id: 'concept_3',
              label: 'Concept 3',
              type: 'textarea',
              placeholder: 'What is the final key concept?',
              helpText: 'The third key concept to teach.',
            },
          ],
          outputExpectation:
            'A clear explanation that ties concepts together with practical examples and applications.',
          enablePlayerNudges: true,
          nudgeHints: [
            'Show how all 3 concepts work together',
            'Add a case study',
            'Include best practices',
          ],
          enableGoogleSearch: false,
          enableImageGeneration: false,
          enableStructuredExtraction: false,
          contextSlideIds: ['tr-slide-4', 'tr-slide-5'],
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 7: Knowledge Check 3
  {
    id: 'tr-slide-7',
    order: 6,
    elements: [
      {
        id: 'tr-el-7-1',
        type: 'quiz',
        x: 5,
        y: 10,
        width: 90,
        height: 80,
        zIndex: 1,
        opacity: 1,
        rotation: 0,
        quizConfig: {
          question: 'Knowledge Check 3',
          answers: [
            { text: 'Answer A' },
            { text: 'Answer B' },
            { text: 'Answer C' },
            { text: 'Answer D' },
          ],
          correctAnswerIndex: 0,
          timeLimit: 20,
          pointValue: 100,
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 8: Gather questions
  {
    id: 'tr-slide-8',
    order: 7,
    elements: [
      {
        id: 'tr-el-8-1',
        type: 'thoughts',
        x: 5,
        y: 10,
        width: 90,
        height: 80,
        zIndex: 1,
        opacity: 1,
        rotation: 0,
        thoughtsConfig: {
          prompt: 'What questions remain?',
          maxPerPlayer: 3,
          timeLimit: 60,
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 9: FAQ
  {
    id: 'tr-slide-9',
    order: 8,
    elements: [
      createStepHeader('tr-el-9-1', '## FAQ'),
      {
        id: 'tr-el-9-2',
        type: 'ai-step',
        x: 2,
        y: 7,
        width: 96,
        height: 88,
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        aiStepConfig: {
          stepPrompt:
            'Review the audience questions and create a comprehensive FAQ. Group similar questions, provide clear answers with examples, and ensure all concerns are addressed. Add any common questions that were not asked but are important.',
          outputExpectation:
            'A well-organized FAQ addressing all audience questions plus important common questions.',
          enablePlayerNudges: true,
          nudgeHints: [
            'Add more detail to technical answers',
            'Include resources for further learning',
            'Address implementation challenges',
          ],
          enableGoogleSearch: false,
          enableImageGeneration: false,
          enableStructuredExtraction: false,
          contextSlideIds: ['tr-slide-8'],
        },
      },
    ],
    transition: 'fade',
  },

  // Slide 10: Leaderboard
  {
    id: 'tr-slide-10',
    order: 9,
    elements: [
      {
        id: 'tr-el-10-1',
        type: 'leaderboard',
        x: 10,
        y: 5,
        width: 80,
        height: 90,
        zIndex: 1,
        opacity: 1,
        rotation: 0,
        leaderboardConfig: {
          maxDisplay: 10,
          showScores: true,
        },
      },
    ],
    transition: 'fade',
  },
];

const TRAINING_TEMPLATE: Omit<PresentationTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
  name: 'Interactive Training',
  title: 'Interactive Training',
  description:
    'AI-powered training with knowledge checks. Explain concepts, test understanding with quizzes, and generate FAQ from audience questions.',
  category: 'training',
  slides: TRAINING_SLIDES,
  settings: {
    ...DEFAULT_SETTINGS,
    workflowConfig: {
      systemPrompt:
        'You are an expert instructor. Explain concepts clearly with examples. Adapt explanations based on quiz results - if scores are low, provide additional clarification and simpler examples.',
    },
  },
  theme: DEFAULT_THEME,
  isBuiltIn: true,
  visibility: 'public',
};

// ==========================================
// Export All Templates
// ==========================================

export const BUILT_IN_TEMPLATES: Omit<
  PresentationTemplate,
  'id' | 'createdBy' | 'createdAt' | 'updatedAt'
>[] = [
  ENTERPRISE_AI_DESIGNER_TEMPLATE,
  STRATEGY_WORKSHOP_TEMPLATE,
  BRAINSTORMING_TEMPLATE,
  TRAINING_TEMPLATE,
];
