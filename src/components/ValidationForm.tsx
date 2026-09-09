"use client";

import { useEffect, useRef, useState } from "react";
import type { ValidationReport } from "@/lib/schema";
import { ReportView } from "./ReportView";

interface FormState {
  productIdea: string;
  icpHypothesis: string;
  problemHypothesis: string;
  primaryResearch: string;
  additionalContext: string;
}

const EMPTY_FORM: FormState = {
  productIdea: "",
  icpHypothesis: "",
  problemHypothesis: "",
  primaryResearch: "",
  additionalContext: "",
};

const EXAMPLE: FormState = {
  productIdea: "AI Search Visibility for Founder-Led GTM",
  icpHypothesis: "Pre-PMF B2B SaaS founders who rely on LinkedIn content for GTM",
  problemHypothesis:
    "Founder authority built through LinkedIn may not translate into sufficient AI-search visibility for relevant buyer questions.",
  primaryResearch:
    "Participant 1 (founder, 8-person SaaS, $40k MRR): We post on LinkedIn every day and get good engagement, but when I ask ChatGPT about tools in our category, we never show up. I have no idea how to fix that and it worries me because two competitors do show up.\n\n" +
    "Participant 2 (founder, seed-stage): Honestly I haven't checked if we show up in AI search, not a priority right now, we are focused on outbound.\n\n" +
    "Participant 3 (founder, 15-person company): We lost a deal last month because the buyer said they asked an AI assistant for recommendations and we weren't mentioned, even though we rank #1 on Google for that term. That cost us roughly $18k ARR. We would pay for a tool that fixed this, we already spend $500/mo on SEO tooling and would redirect some of that.",
  additionalContext: "",
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none";

export function ValidationForm() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function loadExample() {
    setForm((prev) => ({
      ...EXAMPLE,
      // Don't clobber research the user already pasted in.
      primaryResearch: prev.primaryResearch.trim() ? prev.primaryResearch : EXAMPLE.primaryResearch,
    }));
  }

  function startOver() {
    setForm(EMPTY_FORM);
    setReport(null);
    setStatus("idle");
    setErrorMessage(null);
    setFieldErrors(null);
  }

  useEffect(() => {
    if (report) {
      reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [report]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage(null);
    setFieldErrors(null);
    setReport(null);

    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error ?? "Something went wrong.");
        setFieldErrors(data.issues ?? null);
        setStatus("error");
        return;
      }

      setReport(data as ValidationReport);
      setStatus("idle");
    } catch {
      setErrorMessage("Could not reach the validation service. Check your connection and try again.");
      setStatus("error");
    }
  }

  const isLoading = status === "loading";

  return (
    <div className="space-y-10">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Define Hypothesis</h2>
          <button
            type="button"
            onClick={loadExample}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
          >
            Fill example hypothesis
          </button>
        </div>

        <Field label="Product Idea" hint="What you're considering building.">
          <input
            required
            className={inputClass}
            value={form.productIdea}
            onChange={(e) => update("productIdea", e.target.value)}
            placeholder="e.g. AI Search Visibility for Founder-Led GTM"
          />
        </Field>

        <Field label="ICP Hypothesis" hint="Who you believe has this problem.">
          <input
            required
            className={inputClass}
            value={form.icpHypothesis}
            onChange={(e) => update("icpHypothesis", e.target.value)}
            placeholder="e.g. Pre-PMF B2B SaaS founders doing founder-led GTM"
          />
        </Field>

        <Field label="Problem Hypothesis" hint="The problem to be validated — a hypothesis, not a fact.">
          <textarea
            required
            rows={3}
            className={inputClass}
            value={form.problemHypothesis}
            onChange={(e) => update("problemHypothesis", e.target.value)}
            placeholder="e.g. Founder authority built through LinkedIn may not translate into sufficient AI-search visibility for relevant buyer questions."
          />
        </Field>

        <h2 className="text-lg font-semibold text-zinc-100 pt-2">Add Research</h2>

        <Field
          label="Primary Research"
          hint="Paste interview notes, transcripts, or form responses. Manual research only — no external data is used in Phase 1."
        >
          <textarea
            required
            rows={12}
            className={inputClass + " font-mono text-xs"}
            value={form.primaryResearch}
            onChange={(e) => update("primaryResearch", e.target.value)}
            placeholder="Paste raw interview transcripts or form responses here..."
          />
        </Field>

        <Field label="Additional Context (optional)" hint="Category, current workaround, founder observations.">
          <textarea
            rows={3}
            className={inputClass}
            value={form.additionalContext}
            onChange={(e) => update("additionalContext", e.target.value)}
          />
        </Field>

        {errorMessage && (
          <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
            {errorMessage}
            {fieldErrors && (
              <ul className="mt-1 list-disc list-inside text-xs text-red-400">
                {Object.entries(fieldErrors).map(([field, msgs]) => (
                  <li key={field}>
                    {field}: {msgs?.join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Running validation…" : "Run Validation"}
        </button>
      </form>

      {isLoading && (
        <p className="text-sm text-zinc-500 text-center animate-pulse">
          Extracting evidence, scoring dimensions, and checking for contradictions…
        </p>
      )}

      {report && (
        <div ref={reportRef} className="space-y-4 scroll-mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">Validation Report</h2>
            <button
              type="button"
              onClick={startOver}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
            >
              Start over
            </button>
          </div>
          <ReportView report={report} />
        </div>
      )}
    </div>
  );
}
