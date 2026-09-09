import { ValidationForm } from "@/components/ValidationForm";

export default function Home() {
  return (
    <div className="flex-1 bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10">
          <h1 className="text-2xl font-bold text-zinc-50">Problem Validation Agent</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Turn your customer conversations and notes into a disciplined problem-validation
            assessment. Phase 1: primary research only — no external or secondary research is used.
          </p>
        </header>
        <ValidationForm />
      </main>
    </div>
  );
}
