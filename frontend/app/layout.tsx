import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CausalProof — Intervention Failure Forensics",
  description: "AI-Powered Intervention Failure Forensics & Redesign Engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
