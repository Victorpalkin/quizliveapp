import type { AgenticDesignerStepConfig } from './types/agentic-designer';

/**
 * System prompt for the Agentic Enterprise Designer AI.
 * Copied verbatim from the prototype (agentic-enterprise-designer/src/lib/gemini.ts lines 5-18).
 */
export const AGENTIC_DESIGNER_SYSTEM_PROMPT = `Identity: You are the Cortex Data Product Agent, an expert solution architect for the AI Data Foundation. You operate in the "Agentic Era," where autonomous software agents must traverse vast landscapes of information to execute complex business tasks.
Goal: Your goal is to design the Data Products (Source Aligned and Consumption Data Products) that serve as the atomic unit of information reliability. You design assets that satisfy a dual mandate: delivering immediate operational utility today while acting as the essential fuel for Agentic Enterprise Use Cases (AEUCs).
You operate with two opposing but complementary sides. You do not favor one side or another, but instead blend the two in your thinking and output.
* You act with rationality, reason, and foresight. You are responsible, calculating, and calm. You strictly adhere to the defined Source Aligned Data Products (SADPs) domains and engineering realities (latency, silos, dirty data, vendor constraints, costs/benefits).
* You act with creativity and passion. You look beyond the obvious. You boldly suggest novel ways to use Google Intelligence sources (Datasets & Models) that turn boring internal data into valuable Data Products.
When provided with background research or IT landscape data, treat it strictly as a baseline. DO NOT merely summarize or regurgitate the provided text. Your mandate is to synthesize this baseline with your own extensive knowledge to glean and develop the most impactful insights. Do not use analogies in your output.

Operational Directives:
1. Always prioritize the specific target industry or customer provided in the current step data.
2. Ensure all designed data products (SADPs and CDPs) are technically feasible within a modern cloud data architecture (e.g., Google BigQuery, SAP Datasphere).
3. Maintain a professional, executive-level tone.
4. Adhere strictly to the requested Markdown formatting for tables and reports.
5. When designing Agentic Use Cases, ensure they have a clear business objective and a defined "Agent" persona.
`;

/** Steps that benefit from Google Search grounding */
export const SEARCH_GROUNDING_STEPS = [1, 2, 7, 8];

/**
 * All 11 step configurations with exact prompts from the prototype.
 * Copied verbatim from agentic-enterprise-designer/src/types.ts lines 33-142.
 */
export const AGENTIC_DESIGNER_STEPS: AgenticDesignerStepConfig[] = [
  {
    id: 1,
    title: 'Research',
    description: 'Define the target industry/customer. The Agentic Enterprise Designer will execute a deep-dive research dossier across Business and IT tracks to inform the design process.',
    fields: [
      { id: 'target', label: 'Target Industry / Customer / Context', type: 'text', placeholder: 'e.g., Global Retailer, Automotive OEM...' },
    ],
    aiPrompt: `Execute Step 1: Pre-Research. You must research two distinct tracks for the provided target:

Track A: Business & Market Reality
Search latest earnings calls, annual reports, CEO interviews, and industry news to document:
- Strategic Imperatives: What are the C-suite's primary commitments to their investors, board, or the broader market? (e.g., margin expansion, new market entry, supply chain resilience).
- Market Pressures: What macroeconomic, regulatory, or competitive threats are squeezing them right now?

Track B: IT Landscape & Data Architecture
Hunt for the company's technical 'digital exhaust' by bypassing high-level corporate fluff. Execute highly targeted searches across:
- Multilingual Job Boards: Search for Data/IT roles in their primary operating regions to identify the stack they are actively hiring for.
- Professional Networks: Search publicly indexed Data/IT roles for their current engineers and architects for specific platform experience and migration projects.
- Vendor Media: Cross-reference the target company on YouTube and vendor sites for technical keynotes or success stories (e.g., AWS, SAP, Snowflake).
- Executive Footprint: Search for recent CIO/CDO podcast interviews or technical conference presentations.

Based on these specific sources, document the following:
- Cloud Posture: Their primary cloud provider(s) (AWS, Azure, Oracle, Google, Private). If they have a heavy on-premises focus make note of this.
- Data Strategy & Architecture Maturity: Primary platforms (e.g., Databricks, Snowflake, BigQuery, Oracle) and frameworks (Data Mesh, MDM).
- Enterprise Data Sources: Identify their specific footprint across the four source categories: Systems of Record (e.g., SAP, Salesforce), Operational Technology (e.g., SCADA, Historians), Legacy Data Estates (e.g., Oracle Data Warehouse, Teradata), and Unstructured Data Stores (e.g., SharePoint).
- Data Readiness & Integration Reality: Evaluate pipelines based on technical clues (e.g., Informatica batch vs. Kafka streaming). Are they siloed or federated?

Output the dossier in a structured format using Markdown.`,
  },
  {
    id: 2,
    title: 'Business Context',
    description: 'Identify key business opportunities and challenges.',
    fields: [
      { id: 'opportunities', label: 'Business Opportunities', type: 'textarea', placeholder: 'Focus on operational inefficiencies and risks...' },
      { id: 'challenges', label: 'Business Challenges', type: 'textarea', placeholder: 'Pure business and operational realities...' },
    ],
    aiPrompt: 'Identify the top business opportunities and business challenges (defaulting to 2 each unless otherwise specified) based on the research dossier. Ensure they are pure business realities, not IT issues. Output the results in a clear Markdown table.',
  },
  {
    id: 3,
    title: 'Agentic Enterprise Use Cases',
    description: 'Propose Agentic Enterprise Use Cases (AEUCs) for each opportunity/challenge.',
    fields: [
      { id: 'aeucs', label: 'Agentic Use Cases', type: 'textarea', placeholder: 'Name: [Descriptive Agent Persona] | [Specific Goal]. Persona must end with "Agent".' },
    ],
    aiPrompt: 'Propose Agentic Enterprise Use Cases (AEUCs), providing 2 for each opportunity and challenge identified by default. Format the output as a Markdown table with columns for Opportunity/Challenge, Agent Persona (must end in Agent), and Goal.',
  },
  {
    id: 4,
    title: 'Source Domains',
    description: 'Map the allowed Source Aligned Data Product (SADP) domains to the AEUCs.',
    fields: [
      { id: 'sadp_domains', label: 'SADP Domain Mapping', type: 'textarea', placeholder: 'Map Customer & Commercial, Marketing & Content, Supply Chain & Logistics, Manufacturing & Product, Finance & Controlling, Workforce, Industrial & Environmental domains...' },
    ],
    aiPrompt: `Map the allowed SADP domains to the approved AEUCs. The allowed domains are:
- Customer & Commercial: Lands specific sales orders, service tickets, and marketing interactions to support customer analysis.
- Marketing & Content: Captures campaign performance metrics, ad spend, and digital creative assets to track engagement and ROI, including proprietary data extracted from external ad networks and social platforms.
- Supply Chain & Logistics: Captures necessary inventory, shipment, and procurement records to track material flow and supplier activity.
- Manufacturing & Product: Holds production orders, bills of materials, and product specifications to monitor shop floor performance.
- Finance & Controlling: Stores General Ledger, AP/AR, and asset records required for financial reporting and cost analysis.
- Workforce: Contains employee master data and organizational structures needed for resource planning and headcount analysis.
- Industrial & Environmental: Lands sensor readings, energy meter logs, and emission records from facilities to track operational impact.

Provide a summary of the Top Source Aligned Data Product Domains and a 1-2 sentence Source Data Assessment. Use Markdown tables for the mapping.`,
  },
  {
    id: 5,
    title: 'Data Readiness Assessment',
    description: 'Evaluate the 5 friction points (Latency, Ingestion Path, Fragmentation, Privacy/Security, Investment Ratio) for each use case.',
    fields: [
      { id: 'data_readiness', label: 'Data Readiness Assessment', type: 'textarea', placeholder: 'AEUC | Data Readiness Score | Data Assessment | Required Source Domain(s) | Likely Enterprise Systems' },
    ],
    aiPrompt: `Execute Step 5: Data Readiness Assessment.

Guidance & Constraints:
- Evaluate the 5 friction points (Latency, Ingestion Path, Fragmentation, Privacy/Security, Investment Ratio) for each AEUC.
- Do NOT down-select the AEUCs in this step. Your goal here is purely to map the objective data landscape and highlight potential implementation friction.
- Assign an overall Data Readiness Score (High, Medium, Low) for each AEUC.
- Output this assessment in a Markdown table with the following columns:

| AEUC | Data Readiness Score | Data Assessment | Required Source Domain(s) | Likely Enterprise Systems |
| :--- | :--- | :--- | :--- | :--- |
| [AEUC Name] | [High/Medium/Low] | [1-sentence summary of latency, fragmentation, or pipeline effort] | [Domain] | [e.g., SAP S/4HANA] |`,
  },
  {
    id: 6,
    title: 'Use Case Viability',
    description: 'Score all AEUCs across the four dimensions: Alphabet Value Model, Google Intelligence, Implementation Feasibility, and Data Readiness.',
    fields: [
      { id: 'viability_assessment', label: 'Viability Assessment', type: 'textarea', placeholder: 'Agentic Use Case Name | Overall Assessment | Business Value Assessment | Google Intelligence Assessment | Feasibility Assessment | Data Readiness Assessment' },
      { id: 'winning_aeucs', label: 'Winning AEUCs', type: 'text', placeholder: 'The agents moving forward to design...' },
    ],
    aiPrompt: `Execute Step 6: Use Case Viability Assessment.

Guidance & Constraints:
- Score all AEUCs (High, Medium, Low) across the four dimensions:
  - Alphabet Value Model & Top-Line Revenue Opps: Which elements of the Alphabet Value Framework (Labor Avoidance, Cash Savings, Risk Mitigation) or Top-Line Revenue opportunities does it map to, and how large is the expected ROI? (High, Medium, Low)
  - Google Intelligence Value: Do Google Intelligence assets like Google AI Inference Engines and Google Data provide differentiated value to this use case? (High, Medium, Low)
  - Implementation Feasibility (People, Process, Technology): Confidence that the AEUC can be successfully adopted across the PPT framework. Does it require massive cultural change/trust building (People)? Does it violently disrupt existing workflows or governance (Process)? Does it require overwhelming engineering effort or brittle integrations (Technology)? (High, Medium, Low)
  - Data Readiness: Confidence that the required data is likely to be clean and available and not a trap? (High, Medium, Low)

Format your output exactly like this:
### Use Case Viability Assessment
| Agentic Use Case Name | Overall Assessment | Business Value Assessment | Google Intelligence Assessment | Feasibility Assessment | Data Readiness Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Agent Name] |[1-sentence assessment that summarizes across all viability vectors] | [High/Medium/Low] | [High/Medium/Low] | [High/Medium/Low] | [High/Medium/Low] |

Official Down-Selection Recommendation
Based on the viability scores above, I recommend advancing the following AEUCs to the design phase:`,
  },
  {
    id: 7,
    title: 'Source Aligned Data Products',
    description: 'Design the internal data foundation (SADPs) required to fuel each of the approved AEUCs from Step 6.',
    fields: [
      { id: 'use_sap_catalog', label: 'Use the SAP BDC Data Product Catalog?', type: 'checkbox' },
      { id: 'sap_pkg_people', label: 'PEOPLE INTELLIGENCE', type: 'checkbox' },
      { id: 'sap_pkg_finance', label: 'FINANCE INTELLIGENCE', type: 'checkbox' },
      { id: 'sap_pkg_erp', label: 'CLOUD ERP INTELLIGENCE', type: 'checkbox' },
      { id: 'sap_pkg_spend', label: 'SPEND INTELLIGENCE', type: 'checkbox' },
      { id: 'sap_pkg_supply', label: 'SUPPLY CHAIN INTELLIGENCE', type: 'checkbox' },
      { id: 'sap_pkg_revenue', label: 'REVENUE INTELLIGENCE', type: 'checkbox' },
      { id: 'use_cortex_catalog', label: 'Use Google Cortex Framework Catalog?', type: 'checkbox' },
    ],
    aiPrompt: `Execute Step 7: Source Aligned Data Products Design.

Define the critical Source-Aligned Data Products required to fuel EACH of the approved AEUCs from Step 6. Do not artificially inflate or restrict the number of SADPs; design what is required to make the use case a reality—no more, no less.

Guidance & Constraints:
- Catalog Selection: You must pull from three potential sources:
  1. SAP Business Data Cloud Catalog (ONLY if 'use_sap_catalog' is true).
     - CRITICAL: Within the SAP Catalog, you may ONLY use products from specific Data Packages if their respective toggle is true:
       - PEOPLE INTELLIGENCE (if 'sap_pkg_people' is true)
       - FINANCE INTELLIGENCE (if 'sap_pkg_finance' is true)
       - CLOUD ERP INTELLIGENCE (if 'sap_pkg_erp' is true)
       - SPEND INTELLIGENCE (if 'sap_pkg_spend' is true)
       - SUPPLY CHAIN INTELLIGENCE (if 'sap_pkg_supply' is true)
       - REVENUE INTELLIGENCE (if 'sap_pkg_revenue' is true)
  2. Google Cortex Framework Catalog (if 'use_cortex_catalog' is true).
  3. Custom Data Products (if not in an enabled catalog/package but required by the use case).
- Priority: If a catalog/package is enabled, prioritize selecting from it where appropriate. If a required data product is not available in the enabled catalogs/packages, you must create it.
- Specification: In the output table, you must clearly specify the source in the 'Data Product Source' column.
  - If the SADP is sourced from the SAP BDC Catalog, you must list the specific SAP Data Product name(s) (e.g., **SAP Catalog: Entry View Journal Entry**).
  - If sourced from the Cortex Framework, list the specific Cortex Data Product name (e.g., **Cortex Catalog: Purchase Orders**).
  - If it is a custom design, use **Custom**.
- Strict Domains: Ensure these SADPs represent atomic, internal facts based strictly on the authorized source domains.
- Google Ecosystem as a Source: Do not limit your definition of "Source Systems" to traditional ERPs and CRMs. If highly relevant to the customer's industry (especially Retail, B2C, or Media), you must evaluate their 1st-party data hosted within Google (e.g., Google Merchant Center, Google Business Profile, Google Workspace, Google Ads) as authoritative Systems of Record, and design SADPs to extract this internal fuel.
- Naming Convention: Every SADP name must end with the word "Product" (e.g., Inbound Supply Baseline Product).
- Engineering Reality: You must explicitly name the Core Enterprise Entities (e.g., Purchase Requisitions, Material Master, ASNs, Sales Orders) being extracted from the specific Source Systems identified in Step 1.
- Data Product Thinking: You must explicitly define the physical Asset (e.g., BigQuery Table) and the freshness Contract (e.g., Nightly Batch) for every SADP.
- CRITICAL: Present the SADPs as professional, governed business assets.

SAP Business Data Cloud Catalog (Reference):
- PEOPLE INTELLIGENCE: Recruiting & Onboarding (Application Status, Recruitment Interview Data, etc.), Learning & Development (Learning Enrollment, etc.), Performance, Goals & Succession (Goals Data, etc.), Core HR, Workforce & Compensation (Location Hierarchy, etc.).
- FINANCE INTELLIGENCE: General Ledger & Journal Entries (Entry View Journal Entry, etc.), Cost & Profitability (Functional Area, etc.), Taxes & Banking (USA _ Tax Sourcing, etc.), Consolidation (Consolidation Customer Group, etc.), Other Financial Operations (Cash Flow, etc.).
- CLOUD ERP INTELLIGENCE: Manufacturing & BOM (Production Order, etc.), Enterprise Projects (Enterprise Project, etc.), EHS & Real Estate (Real Estate Contract, etc.), Contract Accounting (Contract Accounting Billing Document, etc.).
- SPEND INTELLIGENCE: Sourcing & Procurement (Purchase Order, etc.).
- SUPPLY CHAIN INTELLIGENCE: Inventory & Delivery (Storage Location, etc.).
- REVENUE INTELLIGENCE: Sales & Billing (Sales Order, etc.), Service & Subscriptions (Service Contract, etc.).

Cortex Framework Data Products (Reference):
- Supply Chain & Logistics: Purchase Orders, Vendor, Material, Deliveries, Stock in Hand, Supplier Spend Analysis, Inventory & Material Valuation, etc.
- Customer & Commercial: Sales Orders, Customer, Sales Performance Insights, Billing Document, Leads, Opportunities, Cases, etc.
- Finance & Controlling: Liquidity Management, Treasury Positions, General Ledger Items, Accounts Payable, Accounts Receivable, Universal Journal, etc.
- Marketing & Content: Campaign Members, Campaigns, Media Campaign (TikTok, Meta, YouTube, Google Ads), etc.
- Manufacturing & Product: Bill Of Material, Production Order, Product Hierarchy, Batches, Work Center, Capacity, etc.
- Cross-Domain / Core SAP: Central Configuration, Organizational Structure, Currency & Conversion, Business Partner, etc.
- Industrial & Environmental: D&B ESG Scores, Emissions.

Table Format: You must output the mapping in a Markdown table with the following columns:
| SADP Name | Objective | Domain | AEUC(s) | Core Enterprise Entities | Source System | Asset & Contract | Data Product Source |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [e.g., Inbound Supply Baseline Product] | Lands [entities] to establish [baseline]. | [Domain] | [AEUC Name(s)]|  [e.g., ASNs, POs, Goods Receipts] | [e.g., SAP S/4HANA, Oracle EBS] |e.g. Asset: BigQuery Table, Contract: Nightly Batch | **SAP Catalog: [Product Name]** |

Reusability Callout: Immediately below the table, identify one SADP that provides obvious cross-functional value and can be reused across multiple agents. Format it exactly like this using a blockquote:
> **\u{1F4A1} SADP Reusability Opportunity:** [1-2 sentences explaining how this specific SADP can fuel multiple different agents to maximize ROI].`,
  },
  {
    id: 8,
    title: 'Consumption Data Products',
    description: 'Design the realistic suite of CDPs needed to make each agent function. An autonomous Agent rarely relies on a single data feed; it requires a portfolio of data products that synthesize SADPs with Google Intelligence to achieve true foresight.',
    fields: [
      { id: 'cdps', label: 'CDP Designs', type: 'textarea', placeholder: 'CDP Name | CDP Value | Source Data Product(s) | Google Intelligence Asset | Asset & Contract | Target Agentic Use Case(s)' },
    ],
    aiPrompt: `Execute Step 8: Consumption Data Products Design.

Architectural Reality Check: An autonomous Agent rarely relies on a single data feed. It requires a portfolio of data products. It will query the foundational SADPs directly for raw enterprise state, but it requires a synthesis of distinct CDPs (e.g. a predictive forecast using TimesFM, an external geo-risk product using GDELT, or a sentiment prioritization view using Gemini) to achieve true foresight. Design the realistic suite of CDPs needed to make each agent function. Do not under-engineer the solution.

Guidance & Constraints:
- Synthesis: These must be SQL-accessible or streaming assets that synthesize the SADPs defined in Step 7 with Google Data, Google AI Inference Engines, or both, to solve specific business problems.
- Google Intelligence Mandate: While not every use case requires it, you must actively evaluate if Google's Datasets (e.g., Google Trends, Earth Engine, Data Commons) and/or Google's AI Inference Models (e.g., Gemini, TimesFM) can provide an unfair advantage. At least one of your designed CDPs across the portfolio must heavily leverage this unique Google differentiation.
- Naming Convention: Every CDP name must end with the word "Product" (e.g., Supplier Geo-Risk Product).
- Data Product Thinking: You must explicitly define the physical Asset (e.g., BigQuery View) and the freshness Contract (e.g., Intraday Micro-batch) for every CDP.
- Outline Google Differentiation: Be extremely specific about why the chosen Google asset (e.g., TimesFM, Gemini, Maps Platform, Earth Engine) unlocks intelligence (historical, real-time, or predictive) that internal data alone cannot achieve.

Table Format: You must output the mapping in a Markdown table with the following columns:
| CDP Name | CDP Value | Source Data Product(s) | Google Intelligence Asset | Asset & Contract | Target Agentic Use Case(s) |
| :--- | :--- | :--- | :--- | :--- |:--- |
| [e.g., Supplier Geo-Risk Product]| [e.g., Real-time parsing of global news against supplier coordinates to flag imminent material disruptions.] | [e.g., Vendor Master Product, Open PO Product] | [e.g., GDELT Public Dataset + Gemini] | Asset: [e.g., BigQuery Table], Contract: [e.g., Hourly Refresh] | [e.g., Supply Chain Resilience Agent] |

Google Intelligence Deep-Dive: Immediately below the table, you must exhaustively provide a one-sentence summary for EVERY unique Google Data or Google AI asset listed in the 'Google Intelligence Asset' column above, without exception. You must strictly reconcile this list against the table to ensure specialized assets (e.g., Document AI, WeatherNext, Vertex AI) are not skipped. This summary must explain the specific, high-value capability of that asset to a non-technical stakeholder (e.g., "TimesFM is a first-of-its-kind foundation model for time-series forecasting that enables zero-shot, highly accurate demand predictions without requiring custom model training.").

Reusability Callout: Immediately below the table, identify one CDP that provides obvious cross-functional value and can be reused across multiple agents or human teams. Format it exactly like this using a blockquote:
> \u{1F4A1} CDP Reusability Opportunity: [1-2 sentences explaining how this specific CDP can fuel multiple different agents to maximize ROI].

Google Intelligence Portfolio Reference:
- Google Data: Google Trends, Google Maps Platform (Places, Roads, Routes, Imagery), Google Earth Engine, WeatherNext Forecasting Datasets, Neural GCM Climatology, Population Dynamics Embeddings (PDFM), Google Data Commons, NOAA Weather Radar, Demographic Public Datasets (U.S. Census, World Bank), GDELT.
- Google AI: Gemini 3 Family (Multimodal Reasoning), Gemma 3 Family (Open-weights), TimesFM (Forecasting), Vertex AutoML & BigQuery ML, WeatherNext 2 (Custom Inference), Remote Sensing Foundation Model (RSFM), Document AI, Visual Inspection AI, Chirp 3 (Universal Speech Model), Imagen 3 & 4 (Visual Synthesis), Veo 3.1 (Video Synthesis), SynthID (Watermarking), DataGemma, Travel Impact Model.`,
  },
  {
    id: 9,
    title: 'Value Hypothesis',
    description: 'Forecast business impact and attribute value across SADP, CDP, and Agent layers.',
    fields: [
      { id: 'value_hypothesis', label: 'Value Hypothesis', type: 'textarea', placeholder: 'Conservative, Most Likely, and Upside scenarios...' },
    ],
    aiPrompt: 'Build a Value Hypothesis for each winning AEUC. Attribute value realization (%) to SADPs, CDPs, and Agents. Provide Conservative/Likely/Upside scenarios in a Markdown table.',
  },
  {
    id: 10,
    title: 'Visualize Solution Map',
    description: 'Generate the final high-fidelity infographic prompt for architectural visualization.',
    fields: [
      { id: 'infographic_prompt', label: 'Final Infographic Prompt', type: 'textarea', placeholder: 'The prompt for the image generation tool...' },
    ],
    aiPrompt: `Execute Step 10: Visualize Solution Map.

Pre-Compilation: Before triggering the tool, you must synthesize the exact variables from the session to fill in the template below.
- Business Context: Look at the officially approved AEUCs from Step 6. Identify the specific Opportunities and/or Challenges that these approved agents directly address (active). The remaining Opportunities and Challenges that do not map to the winning agents are unselected (deactivated).
- Agents: List the exact names of the final down-selected AEUCs (active) in Step 6 vs. the remaining proposed AEUCs (deactivated).
- Consumption Data Products: List the exact names of the approved CDPs generated in Step 8.
- Domains: List which of the seven standard source domains are used (active) vs. unused (deactivated).
- Enterprise Sources: List the specific systems used to feed the SADPs in Step 7.
- Google Intelligence: List the exact Google datasets and models used in the CDPs in Step 8.

The Image Prompt Template: Trigger the image generation tool using this exact string, completely replacing the bracketed tags with your compiled explicit lists:
"A high-fidelity, futuristic technical infographic titled \\"[Insert Customer Name] AI Data Foundation Map\\". The aesthetic is a high-end software architecture blueprint, blending a dark cyber-security theme with active digital architecture. The background is a deep blue ('Dark Mode' UI style) with subtle radial lighting for depth. Use Google Sans for headers and Roboto for all other text and data labels. All text must be Crisp White and highly legible. All elements must appear as distinct, free-floating entities; absolutely no connecting lines, arrows, wires, or visible pathways between any of the rows, cards, or icons in the entire diagram.
Layout: Five strictly horizontal rows from top to bottom.
Top Row: Print the text label \\"Business Context\\" in white on the far-left margin. To the right of the label, render four sleek hexagonal nodes.
Render each of the specific nodes labeled [List the active Opportunities and Challenges] with brilliant luminescent neon green borders.
Render the remaining nodes labeled [List the deactivated Opportunities and Challenges] as flat, unlit, medium matte grey with zero glow, ensuring the text inside remains a readable soft white.
Second Row: Print the text label \\"Agents\\" in white on the far-left margin. To the right of the label, render exactly eight flat, rectangular agent cards.
Render each of the specific cards labeled [List the active AEUC names] with intensely glowing Crisp White borders and neon green text accents.
Render the remaining cards labeled [List the deactivated AEUC names] as flat, unlit, medium matte grey with zero glow, ensuring the text inside remains a readable soft white so they look completely powered off.
Third Row: Print the text label \\"Consumption Data Products\\" in white on the far-left margin. To the right of the label, render a row of isometric glass cubes, glowing from within with intense neon green light.
Label the cubes: [List the exact approved CDP names].
Fourth Row: Print the text label \\"Source Domains\\" in white on the far-left margin. To the right of the label, render a horizontal row of exactly seven pill-shaped icons.
Render each of the specific icons labeled [Label the exact active domain names] with bright White text and glowing neon green borders.
Render the remaining icons labeled [Label the unused domain names] as flat, unlit, medium matte grey with zero glow, ensuring the text remains a readable soft white.
Bottom Row (Full Width): This row spans the entire width, breaking the left-margin alignment. Render as two highly distinct, widely separated clusters with an empty gap in the middle.
Left Flank: Print the text title \\"Enterprise Sources\\" hovering directly above these icons. Render as a row of circular icons containing relevant technical logos or symbols inside. Wrap each icon with a luminescent neon green border. Text labels strictly below each icon: [List the active enterprise sources].
Right Flank: Print the text title \\"Google Data & AI Assets\\" hovering directly above these icons. Render as a row of circular icons containing relevant technical logos or symbols inside. Wrap each icon with a glowing bright blue border. Text labels strictly below each icon: [List the active Google datasets and models from Step 8].
Style Notes: Force extreme contrasts in lighting, but maintain text accessibility. All active elements must look visually \\"alive\\" with cyber-security neon illumination. Deactivated elements MUST be entirely unlit, flat, and recede into medium grey shadows, but their text must strictly remain a clear, readable white."`,
  },
  {
    id: 11,
    title: 'Agentic Enterprise Analysis',
    description: 'Generate the Final Agentic Enterprise Report synthesizing the entire 10-step evaluation process.',
    fields: [
      { id: 'final_report', label: 'Final Report', type: 'textarea', placeholder: 'Comprehensive executive report...' },
    ],
    aiPrompt: `Task: Generate the Final Agentic Enterprise Report
Now that we have completed the full 10-step evaluation process for this client, I need you to synthesize our entire back-and-forth discussion into a comprehensive, highly polished executive report.
Tone and Style Constraints:
Strategic and Authoritative: Write this as an "outside-in" analysis meant for business and technology executives. Use high-impact, specific business language (e.g., "critical inflection point," "strategic vectors," "margin protection").
Comprehensive: Do not summarize briefly. Maintain a substantial length and depth, ensuring all relevant points, metrics, and technical constraints from our discussion are captured.
No AI Fluff: Do not include conversational filler like "Here is your report."   Do not use analogies. Start immediately with the title.
Grounded: Do not over promise or suggest things that are likely to be technically infeasible.
Strict Table Formatting: Whenever a table is requested, you must construct it using strict Markdown syntax (using pipes | and hyphens - for columns and headers). Do not output comma-separated text or unformatted lists.:
Structure Constraints:
You must strictly follow this exact 6-section structure, mapping the data from our session as instructed below:
Agentic Enterprise Analysis: [Client Name]
1. Business Context
Synthesize the findings from Step 1 (Pre-Research) and Step 2 (Opportunities & Challenges).
Write a narrative paragraph or two framing the macroeconomic environment, industry pressures, and the primary strategic vectors: Opportunity (Top-Line Growth) and Challenge (Margin Protection). Mention the high-level architecture (e.g., Google BigQuery feeding the client's preferred data platform).  Ensure you highlight the specific strategic imperatives, market pressures, and IT landscape realities discovered in your initial Business and IT research.
2. Potential Agentic Use Cases
Detail all 8 of the Agentic Use Cases identified in Step 3. Format each as a bolded title followed by a clear, concise paragraph defining its objective and the specific business challenge or opportunity it is designed to address.
3. Agentic Use Case Evaluation Process
Explain the purpose of the exercise and the methodology. State the total number of "Agentic Use Cases" that we identified, and then explain the two-gate evaluation process used to evaluate the viability of each use case.
Define Gate 1: Data Readiness Assessment (from Step 5), mentioning the specific enterprise landscape/systems we identified (e.g., SAP, Salesforce) and the friction points evaluated. YOU MUST INSERT THE EXACT MARKDOWN TABLE GENERATED IN STEP 5 ("Data Readiness Assessment" including AEUC, Readiness Score, Data Assessment, Required Domains, Likely Enterprise Systems).
Define Gate 2: Use Case Viability Rubric (from Step 6), detailing the Alphabet Finance Value Framework, Google Intelligence Value, Complexity, and Data Readiness. YOU MUST INSERT THE EXACT MARKDOWN TABLE GENERATED IN STEP 6 ("Use Case Viability Assessment").
4. Agentic Use Cases Downselection
Selected & Deferred Use Cases Based on the evaluations in Section 3, split this section into two parts:
Initial Agentic Use Case Selection: Detail the winning use cases officially selected in Step 6. Format each as a bolded title followed by a comprehensive paragraph detailing exactly how it cross-references internal data with specific Google AI and external datasets to take autonomous action.
Future Agentic Use Cases: List the remaining 6 use cases that were evaluated but not selected. Instead of using the term "parked", state that they are "deferred for future evaluation" or "deprioritized for phase one." Provide a strict business or technical justification for why they were deferred (e.g., integration complexity, external dependency risk, lower immediate cash savings), pulling directly from our viability scores.
5. Agentic Enterprise Recommendations
Provide an introductory paragraph explaining the two-tier data product strategy, an explanation of both types of Data Products and the focus on incremental ROI.
A. Source Data Products: Provide a summary of Source Data assessment generated in Step 4 .
YOU MUST INSERT THE EXACT MARKDOWN TABLE GENERATED IN STEP 7. Do not omit, truncate, or summarize any rows. Every single Source Data Product generated must be included.
Immediately below the table, you must include the exact "> \u{1F4A1} SADP Reusability Opportunity" blockquote generated in Step 7.
B. Consumption Data Products: Provide a strong narrative paragraph before explaining how these fuse internal facts with Google's planetary-scale datasets and AI models directly in BigQuery.
YOU MUST INSERT THE EXACT MARKDOWN TABLE GENERATED IN STEP 8. Do not omit, truncate, or summarize any rows. Every single Consumption Data Product generated must be included.
Immediately below the CDP table, you must include the "Google Intelligence Deep-Dive" definitions generated in Step 8, followed by the exact "> \u{1F4A1} CDP Reusability Opportunity" blockquote.
6. Value Hypothesis
Provide a brief  introductory paragraph explaining the concept of a Value Hypothesis as a starting point to quantifying value and that refinement will come with more information.
Pull directly from Step 9. For EACH of the down-selected use cases, detail the exact Value Journey generated during the session. You must strictly use the following formatted structure and provide introductory sentences where indicated:
Primary Value Lever: [Insert a 1-sentence summary explicitly mapping to Top-Line Revenue or a specific Alphabet Value Framework pillar].
Value Realization Timeline (Attribution): [Write a brief 1-sentence introduction explaining how the ROI compounds across the architectural stack, followed by:]
Source Data Products (Delivers Est. ~X% of Value): [Description]
Consumption Data Products (Delivers Est. ~X% of Value): [Description]
Agents (Delivers Est. ~X% of Value): [Description]
Impact Scenarios (Total Cumulative Value): [Write a brief 1-sentence introduction framing the range of outcomes, followed by:]
Conservative: [Description and metric]
Most Likely: [Description and metric]
Upside: [Description and metric]
Projected Financial Impact: [Briefly summarize the final business metrics and expected ROI].`,
  },
];
