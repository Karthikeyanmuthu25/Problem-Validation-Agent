import { generateText, Output } from "ai";
import { BASE_RULES, inputContext } from "./prompts";
import {
  type ValidationInput,
  type EvidenceAnalysis,
  type ProblemAnalysis,
  type Judgment,
  type ValidationReport,
  type ValidationStatus,
  type DeterministicScoring,
  evidenceAnalysisSchema,
  judgmentSchema,
  DIMENSION_WEIGHTS,
  PRIMARY_WEIGHT_TOTAL,
} from "./schema";

const MODEL = "openai/gpt-4o-mini";

// ---------------------------------------------------------------------------
// Node: analyze_evidence
// ---------------------------------------------------------------------------
async function analyzeEvidence(input: ValidationInput): Promise<EvidenceAnalysis> {
  const { output } = await generateText({
    model: MODEL,
    temperature: 0.2,
    output: Output.object({ schema: evidenceAnalysisSchema }),
    prompt: `${BASE_RULES}

TASK
Read the primary research below and extract every distinct claim relevant to the problem
hypothesis. Classify each as evidence, assumption, opinion, or unknown, and note who it came
from. Then summarize pain, workaround, business-impact, urgency, spend, and WTP signals as
short bullet-style strings quoting or closely paraphrasing the research.

Also estimate how many distinct ICP participants are actually represented in the research
(not the founder's own commentary), and assess whether that sample is sufficient, limited, or
insufficient to support a validation decision.

${inputContext(input)}`,
  });
  return output;
}

// ---------------------------------------------------------------------------
// Node: analyze_problem + analyze_contradictions + identify_gaps + generate_report
// (Sections 13, 16, 17-18) — combined into one call so the pipeline stays at
// 2 total LLM calls (evidence, then judgment) instead of 4.
// ---------------------------------------------------------------------------
async function analyzeJudgment(
  input: ValidationInput,
  evidence: EvidenceAnalysis,
): Promise<Judgment> {
  const { output } = await generateText({
    model: MODEL,
    temperature: 0.2,
    output: Output.object({ schema: judgmentSchema }),
    prompt: `${BASE_RULES}

TASK — do all four of the following, grounded ONLY in the classified evidence below:

1. DIMENSION SCORING — score each dimension 0-100 based only on "evidence"-classified items.
   Assumptions/opinions alone should pull scores down, not up. Use null when there is truly no
   basis to score a dimension. Give an evidence-strength rating (strong/moderate/weak/unknown)
   and a one- or two-sentence rationale for each:
   - problemFrequency: how often the problem occurs for the ICP
   - problemSeverity: how much consequence/pain it causes when it occurs
   - currentWorkaround: how inadequate the ICP's current workaround is (weak workaround = higher score)
   - urgency: how urgent solving this is to the ICP right now
   - businessImpact: measurable business consequence (revenue, pipeline, time, cost)
   - existingSpend: money already being spent on this or an adjacent problem
   - wtpSignals: credible willingness-to-pay behavior (not stated interest)

2. CONTRADICTIONS — research statements that CHALLENGE the hypothesis (participants who don't
   have the problem, have an effective workaround, don't consider it urgent, or wouldn't pay).

3. EVIDENCE GAPS — concrete missing information that would most change the validation decision.

4. NARRATIVE — whatWeKnow (only evidence-backed claims), whatWeDontKnow (biggest open
   questions), keyInsight (1-2 sentences), recommendation (what the founder should do next),
   and nextExperiment (one concrete, specific next research action, not "keep researching").
   Do not state a specific numeric score in the narrative — the app displays the computed score
   separately — but keep the tone consistent with how strong or weak the evidence actually is.

${inputContext(input)}

CLASSIFIED EVIDENCE:
${JSON.stringify(evidence, null, 2)}`,
  });
  return output;
}

// ---------------------------------------------------------------------------
// Node: calculate_validation — deterministic, no LLM (Section 14-15, 29)
// ---------------------------------------------------------------------------
function calculateValidation(
  evidence: EvidenceAnalysis,
  dimensions: ProblemAnalysis,
  contradictionCount: number,
): DeterministicScoring {
  const reasons: string[] = [];

  const weightedSum = (Object.keys(DIMENSION_WEIGHTS) as Array<keyof ProblemAnalysis>).reduce(
    (sum, key) => {
      const dim = dimensions[key];
      const weight = DIMENSION_WEIGHTS[key];
      // A dimension with no basis to score contributes 0 rather than being
      // fabricated or excluded — absence of evidence is not evidence of absence,
      // but it also cannot earn validation credit.
      return sum + weight * (dim.score ?? 0);
    },
    0,
  );
  const primaryValidationScore = Math.round(weightedSum / PRIMARY_WEIGHT_TOTAL);

  // Insufficient sample overrides everything else — Section 15.
  if (evidence.sampleAssessment === "insufficient" || evidence.distinctIcpParticipants < 3) {
    reasons.push(
      `Sample is ${evidence.sampleAssessment} (${evidence.distinctIcpParticipants} distinct ICP participants referenced) — too thin for a reliable decision.`,
    );
    return { primaryValidationScore, validationStatus: "INCONCLUSIVE", statusReasons: reasons };
  }

  const strongFrequency = dimensions.problemFrequency.strength === "strong";
  const decentSeverity = ["strong", "moderate"].includes(dimensions.problemSeverity.strength);
  const heavyContradictions = contradictionCount >= 3;
  const someContradictions = contradictionCount >= 1;

  let status: ValidationStatus;
  if (primaryValidationScore >= 70 && strongFrequency && decentSeverity && !someContradictions) {
    status = "VALIDATED";
    reasons.push("Primary score ≥ 70 with strong frequency and severity evidence, no material contradictions.");
  } else if (primaryValidationScore >= 45) {
    status = "PARTIALLY VALIDATED";
    reasons.push(`Primary score is ${primaryValidationScore}/100 — meaningful support, but not conclusive.`);
  } else {
    status = "NOT VALIDATED";
    reasons.push(`Primary score is ${primaryValidationScore}/100 — evidence is weak or insufficient relative to the hypothesis.`);
  }

  if (heavyContradictions) {
    if (status === "VALIDATED") status = "PARTIALLY VALIDATED";
    else if (status === "PARTIALLY VALIDATED") status = "NOT VALIDATED";
    reasons.push(`${contradictionCount} contradictions found — decision downgraded one level.`);
  }

  return { primaryValidationScore, validationStatus: status, statusReasons: reasons };
}

// ---------------------------------------------------------------------------
// Orchestration — the LangGraph-equivalent pipeline (Section 6)
// ---------------------------------------------------------------------------
export async function runValidationWorkflow(input: ValidationInput): Promise<ValidationReport> {
  // load_input / validate_input handled by the caller via validationInputSchema.parse()

  const evidence = await analyzeEvidence(input);
  const judgment = await analyzeJudgment(input, evidence);

  const scoring = calculateValidation(evidence, judgment.dimensions, judgment.contradictions.length);

  const assumptions = evidence.evidenceItems
    .filter((item) => item.classification === "assumption")
    .map((item) => item.statement);

  const toSignal = (key: keyof ProblemAnalysis) => ({
    score: judgment.dimensions[key].score,
    strength: judgment.dimensions[key].strength,
    rationale: judgment.dimensions[key].rationale,
  });

  const report: ValidationReport = {
    hypothesis: {
      productIdea: input.productIdea,
      icp: input.icpHypothesis,
      problem: input.problemHypothesis,
    },
    primaryValidationScore: scoring.primaryValidationScore,
    secondaryValidationStatus: "NOT_RUN",
    validationStatus: scoring.validationStatus,
    statusReasons: scoring.statusReasons,
    whatWeKnow: judgment.narrative.whatWeKnow,
    whatWeDontKnow: judgment.narrative.whatWeDontKnow,
    evidence: evidence.evidenceItems.map((item) => ({
      statement: item.statement,
      classification: item.classification,
      source: item.source,
    })),
    assumptions,
    contradictions: judgment.contradictions,
    commercialSignals: {
      frequency: toSignal("problemFrequency"),
      severity: toSignal("problemSeverity"),
      currentWorkaround: toSignal("currentWorkaround"),
      urgency: toSignal("urgency"),
      businessImpact: toSignal("businessImpact"),
      existingSpend: toSignal("existingSpend"),
      wtp: toSignal("wtpSignals"),
    },
    evidenceGaps: judgment.evidenceGaps,
    keyInsight: judgment.narrative.keyInsight,
    recommendation: judgment.narrative.recommendation,
    nextExperiment: judgment.narrative.nextExperiment,
    sampleAssessment: evidence.sampleAssessment,
    distinctIcpParticipants: evidence.distinctIcpParticipants,
  };

  return report;
}
