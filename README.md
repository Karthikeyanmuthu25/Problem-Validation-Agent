# Problem Validation Agent

AI-powered B2B SaaS problem-validation agent that analyzes founder-provided customer interviews,
notes, and form responses to determine whether an ICP problem hypothesis is supported by real
evidence.

**Phase 1 (current):** primary research only. You paste in interview notes/transcripts/form
responses; the agent extracts and classifies evidence, scores commercial-validation dimensions,
checks for contradictions, and produces a validation report — no external or secondary research
is used.

**Phase 2 (planned):** secondary research via Tavily/Exa to supplement primary research.

## How it works

1. `src/components/ValidationForm.tsx` collects the product idea, ICP hypothesis, problem
   hypothesis, and primary research.
2. `POST /api/validate` (`src/app/api/validate/route.ts`) validates the input and runs
   `runValidationWorkflow` (`src/lib/workflow.ts`):
   - **analyze_evidence** — one LLM call that extracts and classifies claims as evidence,
     assumption, opinion, or unknown.
   - **analyze_judgment** — one LLM call that scores commercial-validation dimensions, finds
     contradictions, identifies evidence gaps, and writes the narrative.
   - **calculate_validation** — deterministic (no LLM) scoring/status logic in code.
3. `src/components/ReportView.tsx` renders the resulting report.

Both LLM calls run through the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway).

## Getting Started

```bash
npm install
cp .env.example .env.local   # then set AI_GATEWAY_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

On Vercel, `AI_GATEWAY_API_KEY` is provided automatically via OIDC and can be omitted from
project env vars.
