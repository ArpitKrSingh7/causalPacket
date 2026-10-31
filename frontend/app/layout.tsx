import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CausalPacket — Fault or Foe?",
  description:
    "Evidence-first investigation of network faults and suspicious activity from packet captures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-navy-950 text-slate-100 min-h-screen selection:bg-teal-500/30 selection:text-teal-200">
        {children}
      </body>
    </html>
  );
}
