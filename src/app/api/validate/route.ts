import { NextResponse } from "next/server";
import { validationInputSchema } from "@/lib/schema";
import { runValidationWorkflow } from "@/lib/workflow";

export const maxDuration = 120;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = validationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const report = await runValidationWorkflow(parsed.data);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Validation workflow failed:", error);
    return NextResponse.json(
      { error: "The validation workflow failed. Please try again." },
      { status: 502 },
    );
  }
}
