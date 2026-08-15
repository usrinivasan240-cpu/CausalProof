// Deterministic synthetic demonstration dataset for the Student Retention
// scenario. The same seed always produces the same files, so the demo and the
// tests are reproducible. The dataset intentionally contains a discoverable
// intervention failure: class-schedule conflicts suppress counselling
// attendance, which keeps dropout risk high.

import { Investigation, PathwayNode } from "@/lib/engine/types";

export interface DemoFile {
  name: string;
  content: string;
  mimeType: string;
}

/** Deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const toCsv = (rows: string[][]): string =>
  rows
    .map((r) =>
      r
        .map((c) => (c.includes(",") || c.includes('"') ? `"${c.replace(/"/g, '""')}"` : c))
        .join(","),
    )
    .join("\n");

const rnd = (rng: () => number, min: number, max: number): number => min + rng() * (max - min);

const STUDENT_COUNT = 200;
const HIGH_RISK = 120;
const WEEKS = 26;

export function generateDemoFiles(seed = 20260115): DemoFile[] {
  const rng = mulberry32(seed);
  const files: DemoFile[] = [];

  // ---- students.csv ----
  const students: string[][] = [["student_id", "grade", "program", "risk_tier", "enrolled"]];
  for (let i = 1; i <= STUDENT_COUNT; i++) {
    const tier = i <= HIGH_RISK ? "high" : i <= HIGH_RISK + 50 ? "medium" : "low";
    students.push([`S${i}`, String(9 + (i % 4)), i % 3 === 0 ? "engineering" : i % 3 === 1 ? "science" : "arts", tier, "1"]);
  }
  files.push({ name: "students.csv", content: toCsv(students), mimeType: "text/csv" });

  // ---- risk_scores.csv: high-risk starts ~88, declines ~4 points (target was -20) ----
  const risk: string[][] = [["student_id", "week", "risk_score"]];
  for (let i = 1; i <= STUDENT_COUNT; i++) {
    const tier = i <= HIGH_RISK ? "high" : i <= HIGH_RISK + 50 ? "medium" : "low";
    const start = tier === "high" ? 88 : tier === "medium" ? 60 : 30;
    const decline = tier === "high" ? 4 : tier === "medium" ? 3 : 1.5;
    for (let w = 1; w <= WEEKS; w++) {
      const noise = rnd(rng, -1.2, 1.2);
      const score = Math.round((start - (decline * (w - 1)) / (WEEKS - 1) + noise) * 10) / 10;
      risk.push([`S${i}`, `W${String(w).padStart(2, "0")}`, String(score)]);
    }
  }
  files.push({ name: "risk_scores.csv", content: toCsv(risk), mimeType: "text/csv" });

  // ---- attendance.csv ----
  const attendance: string[][] = [["student_id", "week", "attendance_rate"]];
  for (let i = 1; i <= STUDENT_COUNT; i++) {
    const tier = i <= HIGH_RISK ? "high" : i <= HIGH_RISK + 50 ? "medium" : "low";
    const base = tier === "high" ? 0.86 : tier === "medium" ? 0.93 : 0.97;
    for (let w = 1; w <= WEEKS; w++) {
      const v = Math.min(1, Math.max(0, base + rnd(rng, -0.05, 0.05)));
      attendance.push([`S${i}`, `W${String(w).padStart(2, "0")}`, v.toFixed(3)]);
    }
  }
  files.push({ name: "attendance.csv", content: toCsv(attendance), mimeType: "text/csv" });

  // ---- counselling.csv: one session per high-risk student ----
  // Attendance target ~43% (52 of 120). Of the 68 missed, 46 (68%) conflict
  // with a class period. Deterministic selection keeps the demo coherent.
  const counselling: string[][] = [
    ["session_id", "student_id", "date", "scheduled", "attended", "conflict_with_class"],
  ];
  const attendedCount = 52;
  for (let i = 1; i <= HIGH_RISK; i++) {
    const sessionId = `CS${i}`;
    const student = `S${i}`;
    const date = `2026-0${1 + (i % 6)}-1${String(10 + (i % 10)).slice(0, 2)}`;
    const attended = i <= attendedCount ? "1" : "0";
    // Missed sessions: first 46 missed rows are marked as conflicting.
    const conflict = attended === "0" && i <= attendedCount + 46 ? "1" : "0";
    counselling.push([sessionId, student, date, "1", attended, conflict]);
  }
  files.push({ name: "counselling.csv", content: toCsv(counselling), mimeType: "text/csv" });

  // ---- notification_logs.csv ----
  const notifications: string[][] = [
    ["student_id", "sent_at", "delivered", "opened", "channel"],
  ];
  const deliveredCount = 115;
  const openedCount = 85;
  for (let i = 1; i <= HIGH_RISK; i++) {
    const delivered = i <= deliveredCount ? "1" : "0";
    const opened = delivered === "1" && i <= openedCount ? "1" : "0";
    notifications.push([`S${i}`, `2026-01-0${1 + (i % 5)} 09:00`, delivered, opened, i % 2 === 0 ? "sms" : "email"]);
  }
  files.push({ name: "notification_logs.csv", content: toCsv(notifications), mimeType: "text/csv" });

  // ---- class_schedule.csv ----
  const schedule: string[][] = [
    ["day", "class_name", "start_time", "end_time", "room"],
  ];
  const blocks: Array<[string, string, string]> = [
    ["Monday", "Mathematics", "10:00"],
    ["Monday", "Physics", "11:00"],
    ["Tuesday", "Computer Science", "10:00"],
    ["Tuesday", "Chemistry", "14:00"],
    ["Wednesday", "Mathematics", "11:00"],
    ["Wednesday", "Statistics", "15:00"],
    ["Thursday", "Physics", "10:00"],
    ["Thursday", "Engineering Lab", "14:00"],
    ["Friday", "Statistics", "11:00"],
    ["Friday", "Communications", "15:00"],
  ];
  blocks.forEach(([day, cls, start], idx) => {
    const [h, m] = start.split(":").map(Number);
    schedule.push([day, cls, start, `${String(h + 2).padStart(2, "0")}:${String(m).padStart(2, "0")}`, `R${101 + idx}`]);
  });
  files.push({ name: "class_schedule.csv", content: toCsv(schedule), mimeType: "text/csv" });

  // ---- case_notes.txt ----
  files.push({
    name: "case_notes.txt",
    mimeType: "text/plain",
    content: [
      "Weekly review of the Early Warning Student Retention Program for January-June 2026.",
      "Teachers reported that many students missed counselling sessions because they overlapped with scheduled classes.",
      "The counselling coordinator observed that attendance was noticeably lower for sessions scheduled during class hours.",
      "Some students said they were not notified early enough to rearrange their day.",
      "Overall dropout risk remained high at the end of the period.",
      "No external events such as exams or campus closures were reported during the review window.",
      "The program's engagement metric was not tracked directly; engagement is inferred from attendance behaviour.",
    ].join("\n"),
  });

  return files;
}

// ---- intended pathway for the demo ----

export function demoIntendedPathway(): PathwayNode[] {
  return [
    {
      id: "n_risk_detection",
      label: "Risk Detection",
      kind: "event",
      description: "Early-warning system flags students at risk of dropping out.",
      expectedMetric: "mean_risk_score",
      expectedValue: ">= 50",
      status: "EXPECTED",
    },
    {
      id: "n_notification",
      label: "Notification Sent",
      kind: "event",
      description: "At-risk students are notified about support and counselling.",
      expectedMetric: "notifications_sent",
      expectedValue: ">= 100",
      status: "EXPECTED",
    },
    {
      id: "n_counselling",
      label: "Counselling Attendance",
      kind: "mechanism",
      description: "Students attend scheduled counselling sessions.",
      expectedMetric: "attendance_rate_pct",
      expectedValue: ">= 80",
      status: "EXPECTED",
    },
    {
      id: "n_engagement",
      label: "Student Engagement",
      kind: "mechanism",
      description: "Counselling raises student engagement with their studies.",
      expectedMetric: "attendance_trend_change",
      expectedValue: ">= 0.02",
      status: "EXPECTED",
    },
    {
      id: "n_attendance",
      label: "Class Attendance",
      kind: "mechanism",
      description: "Engaged students maintain or improve class attendance.",
      expectedMetric: "mean_attendance_rate",
      expectedValue: ">= 0.9",
      status: "EXPECTED",
    },
    {
      id: "n_dropout",
      label: "Dropout Reduction",
      kind: "outcome",
      description: "Dropout risk falls by the targeted amount.",
      expectedMetric: "risk_score_change_pct",
      expectedValue: "<= -20",
      status: "EXPECTED",
    },
  ];
}

export function demoInvestigation(): Investigation {
  return {
    id: "inv_demo_retention",
    name: "Early Warning Student Retention Program",
    domain: "Education",
    problem: "High student dropout risk",
    intervention: "Early identification + counselling",
    expectedOutcome: "Reduce dropout risk by 20%",
    targetMetric: "mean risk-score reduction",
    targetValue: 20,
    periodStart: "2026-01-01",
    periodEnd: "2026-06-30",
    status: "DRAFT",
    createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    isDemo: true,
  };
}
