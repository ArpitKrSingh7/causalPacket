import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const manrope = localFont({ src: "./fonts/manrope.ttf", variable: "--font-body", display: "swap", weight: "200 800" });
const spaceGrotesk = localFont({ src: "./fonts/space-grotesk.ttf", variable: "--font-display", display: "swap", weight: "300 700" });

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
    <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
