export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a href="/" className="inline-flex items-center gap-2.5 shrink-0" aria-label="CausalPacket home">
      <img src="/brand/packet-mark.webp" width={42} height={42} alt="" className="h-10 w-10" />
      <span className={`font-display font-semibold tracking-[-0.055em] text-ink ${compact ? "text-lg" : "text-[23px]"}`}>causal<span className="font-normal">packet</span><span className="text-accent">.</span></span>
    </a>
  );
}
