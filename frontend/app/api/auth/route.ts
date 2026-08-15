import { NextResponse } from "next/server";
import { authenticate, requireAuth } from "@/lib/auth";
import { z } from "zod";

const LoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(0).max(200),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const result = authenticate(parsed.data.username, parsed.data.password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ token: result.token, userId: result.userId });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
