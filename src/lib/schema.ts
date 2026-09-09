import { z } from "zod";

// ---------------------------------------------------------------------------
// Input — Section 8 of the Phase 1 spec
// ---------------------------------------------------------------------------

export const validationInputSchema = z.object({
  productIdea: z.string().trim().min(1, "Product idea is required"),
  icpHypothesis: z.string().trim().min(1, "ICP hypothesis is required"),
  problemHypothesis: z.string().trim().min(1, "Problem hypothesis is required"),
  primaryResearch: z
    .string()
    .trim()
    .min(40, "Primary research must contain enough material to analyze (40+ characters)"),
  additionalContext: z.string().trim().optional(),
});

export type ValidationInput = z.infer<typeof validationInputSchema>;

// ---------------------------------------------------------------------------
// Stage 1 — analyze_evidence (Sections 11–12)
// ---------------------------------------------------------------------------

export const evidenceClassificationEnum = z.enum([
  "evidence",
  "assumption",
  "opinion",
  "unknown",
]);

export const evidenceItemSchema = z.object({
  statement: z.string().describe("The claim, paraphrased concisely from the research"),
  classification: evidenceClassificationEnum,
  source: z
    .string()
    .describe(
      "Who this came from, e.g. 'Participant 2', 'Founder observation', or 'Not attributed'",
    ),
  rationale: z
    .string()
    .describe("Why this was classified this way, in one short sentence"),
});

export const evidenceAnalysisSchema = z.object({
  evidenceItems: z.array(evidenceItemSchema).max(40),
  distinctIcpParticipants: z
    .number()
    .int()
    .min(0)
    .describe("Best estimate of the number of distinct ICP participants represented in the research"),
  sampleAssessment: z
    .enum(["sufficient", "limited", "insufficient"])
    .describe(
      "sufficient = multiple relevant ICP participants with repeated signal; limited = some signal but thin; insufficient = too little to draw any conclusion",
    ),
  painSignals: z.array(z.string()),
  workarounds: z.array(z.string()),
  businessImpactSignals: z.array(z.string()),
  urgencySignals: z.array(z.string()),
  spendSignals: z.array(z.string()),
  wtpSignals: z.array(z.string()),
});

export type EvidenceAnalysis = z.infer<typeof evidenceAnalysisSchema>;

// ---------------------------------------------------------------------------
// Stage 2 — analyze_problem (Section 13, dimension scoring)
// ---------------------------------------------------------------------------

export const evidenceStrengthEnum = z.enum(["strong", "moderate", "weak", "unknown"]);

export const dimensionScoreSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .nullable()
    .describe("0-100, or null if there is truly no basis to score this dimension"),
  strength: evidenceStrengthEnum,
  rationale: z.string(),
});

export const problemAnalysisSchema = z.object({
  problemFrequency: dimensionScoreSchema,
  problemSeverity: dimensionScoreSchema,
  currentWorkaround: dimensionScoreSchema,
  urgency: dimensionScoreSchema,
  businessImpact: dimensionScoreSchema,
  existingSpend: dimensionScoreSchema,
  wtpSignals: dimensionScoreSchema,
});

export type ProblemAnalysis = z.infer<typeof problemAnalysisSchema>;

export const DIMENSION_WEIGHTS: Record<keyof ProblemAnalysis, number> = {
  problemFrequency: 15,
  problemSeverity: 15,
  currentWorkaround: 10,
  urgency: 10,
  businessImpact: 10,
  existingSpend: 5,
  wtpSignals: 5,
};

export const PRIMARY_WEIGHT_TOTAL = Object.values(DIMENSION_WEIGHTS).reduce(
  (a, b) => a + b,
  0,
); // 70

// ---------------------------------------------------------------------------
// Stage 3 — analyze_contradictions + identify_gaps (Sections 16, and gaps)
// ---------------------------------------------------------------------------

export const contradictionSchema = z.object({
  statement: z.string().describe("The contradictory observation from the research"),
  explanation: z
    .string()
    .describe("Why this challenges the problem hypothesis"),
});

export const contradictionsAndGapsSchema = z.object({
  contradictions: z.array(contradictionSchema),
  evidenceGaps: z
    .array(z.string())
    .describe("Concrete missing evidence needed to strengthen or refute the hypothesis"),
});

export type ContradictionsAndGaps = z.infer<typeof contradictionsAndGapsSchema>;

// ---------------------------------------------------------------------------
// Deterministic scoring output (Section 14–15) — computed in code, not by the LLM
// ---------------------------------------------------------------------------

export const validationStatusEnum = z.enum([
  "VALIDATED",
  "PARTIALLY VALIDATED",
  "NOT VALIDATED",
  "INCONCLUSIVE",
]);

export type ValidationStatus = z.infer<typeof validationStatusEnum>;

export interface DeterministicScoring {
  primaryValidationScore: number; // 0-100
  validationStatus: ValidationStatus;
  statusReasons: string[]; // short audit trail of why the rule fired
}

// ---------------------------------------------------------------------------
// Stage 4 — generate_report (Section 17-18 narrative synthesis)
// ---------------------------------------------------------------------------

export const reportNarrativeSchema = z.object({
  whatWeKnow: z.array(z.string()).max(8),
  whatWeDontKnow: z.array(z.string()).max(8),
  keyInsight: z.string(),
  recommendation: z.string(),
  nextExperiment: z.string(),
});

export type ReportNarrative = z.infer<typeof reportNarrativeSchema>;

// Combines Stages 2-4 (problem scoring, contradictions/gaps, narrative) into a single
// LLM call — keeps the pipeline to 2 total calls (evidence, then judgment) to fit
// tighter API rate/cost budgets while still extracting evidence before judgment.
export const judgmentSchema = z.object({
  dimensions: problemAnalysisSchema,
  contradictions: z.array(contradictionSchema),
  evidenceGaps: z.array(z.string()),
  narrative: reportNarrativeSchema,
});

export type Judgment = z.infer<typeof judgmentSchema>;

// ---------------------------------------------------------------------------
// Final assembled report — Section 17 JSON contract
// ---------------------------------------------------------------------------

export interface CommercialSignal {
  score: number | null;
  strength: z.infer<typeof evidenceStrengthEnum>;
  rationale: string;
}

export interface ValidationReport {
  hypothesis: {
    productIdea: string;
    icp: string;
    problem: string;
  };
  primaryValidationScore: number;
  secondaryValidationStatus: "NOT_RUN";
  validationStatus: ValidationStatus;
  statusReasons: string[];
  whatWeKnow: string[];
  whatWeDontKnow: string[];
  evidence: Array<{ statement: string; classification: string; source: string }>;
  assumptions: string[];
  contradictions: Array<{ statement: string; explanation: string }>;
  commercialSignals: {
    frequency: CommercialSignal;
    severity: CommercialSignal;
    currentWorkaround: CommercialSignal;
    urgency: CommercialSignal;
    businessImpact: CommercialSignal;
    existingSpend: CommercialSignal;
    wtp: CommercialSignal;
  };
  evidenceGaps: string[];
  keyInsight: string;
  recommendation: string;
  nextExperiment: string;
  sampleAssessment: "sufficient" | "limited" | "insufficient";
  distinctIcpParticipants: number;
}
