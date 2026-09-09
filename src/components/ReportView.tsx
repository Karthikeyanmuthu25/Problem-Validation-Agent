import type { ValidationReport } from "@/lib/schema";

const STATUS_STYLES: Record<ValidationReport["validationStatus"], string> = {
  VALIDATED: "bg-emerald-950 text-emerald-300 border-emerald-800",
  "PARTIALLY VALIDATED": "bg-amber-950 text-amber-300 border-amber-800",
  "NOT VALIDATED": "bg-red-950 text-red-300 border-red-800",
  INCONCLUSIVE: "bg-zinc-800 text-zinc-300 border-zinc-700",
};

const STRENGTH_STYLES: Record<string, string> = {
  strong: "text-emerald-400",
  moderate: "text-amber-400",
  weak: "text-orange-400",
  unknown: "text-zinc-500",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-zinc-800 pt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500 italic">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-zinc-200 flex gap-2">
          <span className="text-zinc-600">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const SIGNAL_LABELS: Record<keyof ValidationReport["commercialSignals"], string> = {
  frequency: "Problem Frequency",
  severity: "Problem Severity",
  currentWorkaround: "Current Workaround",
  urgency: "Urgency",
  businessImpact: "Business Impact",
  existingSpend: "Existing Spend",
  wtp: "Willingness to Pay",
};

export function ReportView({ report }: { report: ValidationReport }) {
  return (
    <div className="space-y-6 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Product</p>
          <p className="text-zinc-100 font-medium">{report.hypothesis.productIdea}</p>
          <p className="text-xs uppercase tracking-wide text-zinc-500 mt-3">ICP</p>
          <p className="text-zinc-300 text-sm">{report.hypothesis.icp}</p>
          <p className="text-xs uppercase tracking-wide text-zinc-500 mt-3">Problem Hypothesis</p>
          <p className="text-zinc-300 text-sm max-w-xl">{report.hypothesis.problem}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Primary Validation</p>
          <p className="text-4xl font-bold text-zinc-50">{report.primaryValidationScore}
            <span className="text-lg text-zinc-500">/100</span>
          </p>
          <p className="text-xs text-zinc-500 mt-1">Secondary Validation: NOT RUN (Phase 1)</p>
          <span
            className={`inline-block mt-2 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[report.validationStatus]}`}
          >
            {report.validationStatus}
          </span>
        </div>
      </div>

      {report.statusReasons.length > 0 && (
        <p className="text-xs text-zinc-500 italic">{report.statusReasons.join(" ")}</p>
      )}

      <Section title="What We Know">
        <BulletList items={report.whatWeKnow} empty="Nothing established with sufficient evidence yet." />
      </Section>

      <Section title="What We Don't Know">
        <BulletList items={report.whatWeDontKnow} empty="No major open questions flagged." />
      </Section>

      <Section title="Commercial Signals">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(report.commercialSignals) as Array<keyof typeof report.commercialSignals>).map(
            (key) => {
              const signal = report.commercialSignals[key];
              return (
                <div key={key} className="rounded-md border border-zinc-800 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{SIGNAL_LABELS[key]}</span>
                    <span className="text-sm font-semibold text-zinc-100">
                      {signal.score ?? "—"}
                      {signal.score !== null && <span className="text-zinc-500">/100</span>}
                    </span>
                  </div>
                  <div className={`text-xs mt-1 ${STRENGTH_STYLES[signal.strength]}`}>
                    {signal.strength}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{signal.rationale}</p>
                </div>
              );
            },
          )}
        </div>
      </Section>

      <Section title="Evidence">
        {report.evidence.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No evidence items extracted.</p>
        ) : (
          <ul className="space-y-2">
            {report.evidence.map((item, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase h-fit ${
                    item.classification === "evidence"
                      ? "bg-emerald-950 text-emerald-300"
                      : item.classification === "assumption"
                        ? "bg-amber-950 text-amber-300"
                        : item.classification === "opinion"
                          ? "bg-sky-950 text-sky-300"
                          : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {item.classification}
                </span>
                <span className="text-zinc-200">
                  {item.statement}{" "}
                  <span className="text-zinc-500">— {item.source}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Contradictions">
        {report.contradictions.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No contradicting evidence found.</p>
        ) : (
          <ul className="space-y-2">
            {report.contradictions.map((c, i) => (
              <li key={i} className="text-sm text-zinc-200">
                <span className="text-red-400">⚠ {c.statement}</span>
                <p className="text-xs text-zinc-500 mt-0.5">{c.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Assumptions">
        <BulletList items={report.assumptions} empty="No unverified founder assumptions flagged." />
      </Section>

      <Section title="Evidence Gaps">
        <BulletList items={report.evidenceGaps} empty="No specific gaps flagged." />
      </Section>

      <Section title="Key Insight">
        <p className="text-sm text-zinc-200">{report.keyInsight}</p>
      </Section>

      <Section title="Recommendation">
        <p className="text-sm text-zinc-200">{report.recommendation}</p>
      </Section>

      <Section title="Next Experiment">
        <p className="text-sm text-zinc-200">{report.nextExperiment}</p>
      </Section>

      <p className="text-[11px] text-zinc-600 pt-4 border-t border-zinc-800">
        Sample: {report.distinctIcpParticipants} distinct ICP participant(s) referenced — assessed as{" "}
        {report.sampleAssessment}. Scores and status are illustrative outputs of the supplied research,
        not market findings.
      </p>
    </div>
  );
}
