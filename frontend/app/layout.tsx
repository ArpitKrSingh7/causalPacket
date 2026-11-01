import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const manrope = localFont({ src: "./fonts/manrope.ttf", variable: "--font-body", display: "swap", weight: "200 800" });
const spaceGrotesk = localFont({ src: "./fonts/space-grotesk.ttf", variable: "--font-display", display: "swap", weight: "300 700" });

export const metadata: Metadata = {
  metadataBase: new URL("https://causal-packet.vercel.app"),
  applicationName: "CausalPacket",
  title: "CausalPacket — Fault or Foe?",
  description:
    "Investigate network faults and suspicious activity from packet captures, with exact packet evidence, competing explanations and an interactive Alibi Test.",
  keywords: ["PCAP", "PCAPNG", "network diagnostics", "packet analysis", "cybersecurity", "ARP", "DNS", "TCP"],
  authors: [{ name: "Arpit Kumar Singh", url: "https://github.com/ArpitKrSingh7" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "CausalPacket",
    title: "CausalPacket — Fault or Foe?",
    description: "Follow the evidence. Investigate network faults and suspicious activity with packet-backed explanations and the Alibi Test.",
    images: [{ url: "/brand/social-preview.jpg", width: 1200, height: 630, alt: "CausalPacket — Fault or Foe? Follow the evidence." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CausalPacket — Fault or Foe?",
    description: "Evidence-first network investigation with exact packet references, competing explanations and an interactive Alibi Test.",
    images: [{ url: "/brand/social-preview.jpg", alt: "CausalPacket — Fault or Foe? Follow the evidence." }],
  },
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
