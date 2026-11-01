import { ArrowDown, Fingerprint, GitBranch, ScanLine } from "lucide-react";

export function Welcome() {
  return (
    <section className="grid lg:grid-cols-[1fr_1.12fr] items-center gap-3 lg:gap-6 py-5 sm:py-8 page-enter" aria-labelledby="welcome-title">
      <div className="relative z-10 lg:py-5">
        <p className="eyebrow text-slate-500 flex items-center gap-2.5 mb-5"><span className="w-6 h-px bg-accent" />Beyond the packet capture</p>
        <h1 id="welcome-title" className="font-display text-[46px] sm:text-[64px] xl:text-[76px] font-medium leading-[1.02] tracking-[-0.065em] text-ink">Fault or foe?<br />Follow the <span className="text-accent">evidence.</span></h1>
        <p className="mt-5 text-sm sm:text-[15px] leading-7 text-slate-500 max-w-[430px]">Turn network noise into a clear investigation. Compare possible causes, inspect the packets, and find your next step.</p>
        <a href="#capture-ingestion" className="button-primary mt-6">Start an investigation <ArrowDown className="w-3.5 h-3.5 text-orange-300" /></a>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-6 text-[10px] text-slate-500 font-medium">
          <span className="inline-flex items-center gap-1.5"><ScanLine className="h-3 w-3" />Exact packet references</span>
          <span className="inline-flex items-center gap-1.5"><GitBranch className="h-3 w-3" />Competing explanations</span>
        </div>
      </div>
      <div className="hero-art -mx-3 sm:mx-0" aria-hidden="true">
        <img src="/brand/packet-lens.webp" width={1200} height={800} alt="" fetchPriority="high" loading="eager" decoding="async" />
        <div className="hero-caption absolute bottom-5 left-5 sm:left-10 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-white border border-line flex items-center justify-center"><Fingerprint className="h-4 w-4 text-accent" /></span>
          <div><p className="text-[11px] font-semibold text-ink">One capture. More than one explanation.</p><p className="text-[10px] text-slate-500 mt-0.5">Observe. Compare. Investigate.</p></div>
        </div>
      </div>
    </section>
  );
}

export function InvestigationGuide({ onPreview }: { onPreview: () => void }) {
  return (
    <section className="pt-3 pb-8" aria-label="How an investigation works">
      <div className="flex items-center gap-4 mb-5"><span className="eyebrow text-slate-500">A little clarity goes a long way</span><span className="flex-1 h-px bg-line" /></div>
      <div className="grid sm:grid-cols-3 gap-6 lg:gap-12">
        {[
          ["01", "Read the signal.", "Protocol checks identify connection failures, DNS errors, address conflicts and possible scans."],
          ["02", "Challenge the story.", "Compare explanations. Add trusted device context with the Alibi Test and see what changes."],
          ["03", "Take the next step.", "Open the exact supporting frames and export a report with practical checks and clear limitations."],
        ].map(([number, title, description]) => <div key={number} className="flex gap-3"><span className="font-mono text-[10px] text-accent pt-1">{number}</span><div><h2 className="font-display text-base font-medium tracking-tight">{title}</h2><p className="text-xs text-slate-500 leading-6 mt-1">{description}</p></div></div>)}
      </div>
      <p className="text-[11px] text-slate-500 mt-7">Choose a sample or upload a capture to begin. <button type="button" onClick={onPreview} className="underline underline-offset-4 hover:text-ink">Or explore fictional scenario preview fixtures →</button></p>
    </section>
  );
}
