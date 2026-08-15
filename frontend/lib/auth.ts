// Simple demo authentication. In production, this would use a real auth
// provider. For the prototype, we support a single demo user and optional
// token-based access via environment variable.

import crypto from "crypto";

const DEMO_USER = process.env.DEMO_USER ?? "admin";
const DEMO_PASS_HASH = process.env.DEMO_PASS_HASH ?? ""; // bcrypt-compatible hash
const DEMO_API_TOKEN = process.env.DEMO_API_TOKEN ?? "cp_demo_token_2026";

// In-memory session store (resets on restart — fine for prototype)
const sessions = new Map<string, { userId: string; expiresAt: number }>();

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export interface AuthResult {
  ok: boolean;
  userId?: string;
  token?: string;
  error?: string;
}

export function authenticate(username: string, password: string): AuthResult {
  // Demo mode: accept any credentials if DEMO_PASS_HASH is not set
  if (!DEMO_PASS_HASH) {
    const token = sha256(`${username}-${Date.now()}-${Math.random()}`);
    sessions.set(token, {
      userId: username,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    return { ok: true, userId: username, token };
  }

  // Production mode: verify against stored hash
  if (username !== DEMO_USER) {
    return { ok: false, error: "Invalid credentials." };
  }
  const inputHash = sha256(password);
  if (inputHash !== DEMO_PASS_HASH) {
    return { ok: false, error: "Invalid credentials." };
  }
  const token = sha256(`${username}-${Date.now()}-${Math.random()}`);
  sessions.set(token, {
    userId: username,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
  return { ok: true, userId: username, token };
}

export function verifyToken(token: string): AuthResult {
  // Accept the static demo API token
  if (token === DEMO_API_TOKEN) {
    return { ok: true, userId: "api_user" };
  }

  const session = sessions.get(token);
  if (!session) return { ok: false, error: "Invalid or expired token." };
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return { ok: false, error: "Session expired." };
  }
  return { ok: true, userId: session.userId };
}

export function extractAuth(header: string | null | undefined): AuthResult {
  if (!header) return { ok: false, error: "No authorization provided." };
  if (header.startsWith("Bearer ")) {
    return verifyToken(header.slice(7));
  }
  return { ok: false, error: "Invalid authorization format. Use Bearer <token>." };
}

/** Middleware-like helper for Next.js route handlers. */
export function requireAuth(request: Request): AuthResult {
  const auth = extractAuth(request.headers.get("authorization"));
  return auth;
}
