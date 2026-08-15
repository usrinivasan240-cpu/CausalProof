import { NextResponse } from "next/server";
import { loadDemo } from "@/lib/demo/seed";

export async function POST() {
  try {
    const { investigation, report } = loadDemo();
    return NextResponse.json({
      investigation,
      report,
      note: "Synthetic Demonstration Data — all numbers are prototype demonstration values, not real-world statistics.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Demo load failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
