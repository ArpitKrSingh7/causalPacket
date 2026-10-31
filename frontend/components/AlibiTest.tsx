import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  Info,
  Loader2,
  Lock,
  PlusCircle,
  Database,
  Radio,
} from "lucide-react";
import type {
  NetworkContext,
  InterpretationChange,
  Assessment,
  Observation,
} from "@/lib/types";

interface AlibiTestProps {
  initialContext: NetworkContext;
  interpretationChanges: InterpretationChange[];
  isLiveMode: boolean;
  dataOrigin: "capture" | "development_fixture";
  previewKey: string;
  sampleId?: string | null;
  suggestedContext?: NetworkContext | null;
  observations?: Observation[];
  onApplyContext: (context: NetworkContext) => Promise<void>;
  onResetContext: () => Promise<void>;
  isReinterpreting: boolean;
}

export function AlibiTest({
  initialContext,
  interpretationChanges,
  isLiveMode,
  dataOrigin,
  previewKey,
  sampleId = null,
  suggestedContext = null,
  observations = [],
  onApplyContext,
  onResetContext,
  isReinterpreting,
}: AlibiTestProps) {
  const [gatewayIp, setGatewayIp] = useState<string>(
    initialContext.gateway_ip || ""
  );
  const [macsInput, setMacsInput] = useState<string>(
    (initialContext.approved_gateway_macs || []).join(", ")
  );
  const [scannersInput, setScannersInput] = useState<string>(
    (initialContext.authorized_scanner_ips || []).join(", ")
  );
  const [validationWarning, setValidationWarning] = useState<string | null>(
    null
  );

  const isFixture = dataOrigin === "development_fixture";
  const isHealthyPreview = isFixture && previewKey === "healthy";

  // Sync state whenever initialContext updates
  useEffect(() => {
    setGatewayIp(initialContext.gateway_ip || "");
    setMacsInput((initialContext.approved_gateway_macs || []).join(", "));
    setScannersInput((initialContext.authorized_scanner_ips || []).join(", "));
    setValidationWarning(null);
  }, [initialContext]);

  const parseMacs = (input: string): string[] => {
    if (!input.trim()) return [];
    return input
      .split(/[, \n]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  };

  const parseIps = (input: string): string[] => {
    if (!input.trim()) return [];
    return input
      .split(/[, \n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const handleApply = async (customContext?: NetworkContext) => {
    setValidationWarning(null);

    const targetContext = customContext || {
      gateway_ip: gatewayIp.trim() || null,
      approved_gateway_macs: parseMacs(macsInput),
      authorized_scanner_ips: parseIps(scannersInput),
    };

    // Validate gateway IP if MACs are specified
    if (
      targetContext.approved_gateway_macs.length > 0 &&
      !targetContext.gateway_ip
    ) {
      setValidationWarning(
        "Approving gateway MAC addresses requires an explicit Gateway IPv4 address."
      );
      return;
    }

    await onApplyContext(targetContext);
  };

  const handleReset = async () => {
    setValidationWarning(null);
    setGatewayIp("");
    setMacsInput("");
    setScannersInput("");
    await onResetContext();
  };

  const getAssessmentLabel = (assessment: Assessment) => {
    switch (assessment) {
      case "suspected_attack":
        return "Suspected Attack";
      case "likely_fault":
        return "Likely Fault";
      case "unresolved":
      default:
        return "Unresolved";
    }
  };

  // AGY-003: Check if active real sample has a declared non-empty baseline
  const hasSampleBaseline =
    !isFixture &&
    sampleId !== null &&
    suggestedContext !== null &&
    (suggestedContext.gateway_ip !== null ||
      suggestedContext.approved_gateway_macs.length > 0 ||
      suggestedContext.authorized_scanner_ips.length > 0);

  // AGY-003: Extract ARP observation identity claims
  const arpObs = observations.find((o) => o.type === "ARP_IDENTITY_CHANGE");
  const arpClaimedIp = arpObs?.entities.find(
    (e) => e.kind === "server" || e.kind === "gateway"
  )?.value;
  const arpObservedMacs = arpObs?.entities
    .filter((e) => e.kind === "mac")
    .map((e) => e.value.toLowerCase()) || [];

  const currentApprovedMacs = parseMacs(macsInput);
  const isGatewayIpConfiguredForClaim =
    arpClaimedIp && gatewayIp.trim() === arpClaimedIp;

  return (
    <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Title & Guidance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-teal-400" />
              The Alibi Test
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono">
              Could this be something else?
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Test whether declaring authorized infrastructure changes an attack
            hypothesis without altering observed packet facts.
          </p>
        </div>

        <div className="text-[11px] font-mono px-2 py-0.5 rounded border self-start sm:self-auto bg-navy-850 border-slate-800 text-slate-400">
          {!isFixture ? "Live Reinterpretation" : "Scripted Scenario Preview"}
        </div>
      </div>

      {isHealthyPreview ? (
        <div className="p-4 rounded-lg bg-navy-950/70 border border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Info className="w-4 h-4 text-teal-400" />
            <span>Alibi test not applicable for this scenario</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            The healthy preview contains completed TCP handshakes and zero
            anomalous observations. Alibi testing applies when conflicting
            gateway claims or scanning patterns require evaluating operator
            authorization.
          </p>
        </div>
      ) : (
        <>
          {/* AGY-003: Sample Declared Baseline Callout (explicit Apply button) */}
          {hasSampleBaseline && suggestedContext && (
            <div className="p-3.5 rounded-lg bg-navy-850 border border-teal-500/30 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Sample Declared Baseline (Known Inventory)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleApply(suggestedContext)}
                  disabled={isReinterpreting}
                  className="px-3 py-1 rounded bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 self-start sm:self-auto flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply sample inventory</span>
                </button>
              </div>

              <div className="text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] bg-navy-950/60 p-2.5 rounded border border-slate-800">
                {suggestedContext.gateway_ip && (
                  <div>
                    <span className="text-slate-500">Known Gateway IP: </span>
                    <span className="text-teal-300 font-semibold">
                      {suggestedContext.gateway_ip}
                    </span>
                  </div>
                )}
                {suggestedContext.approved_gateway_macs.length > 0 && (
                  <div>
                    <span className="text-slate-500">Approved MAC(s): </span>
                    <span className="text-teal-300 font-semibold">
                      {suggestedContext.approved_gateway_macs.join(", ")}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Applies the author-declared baseline for this sample. Leaves any
                other claimant unapproved, evaluating whether an unauthorized
                device claimed the gateway address.
              </p>
            </div>
          )}

          {/* AGY-003: Observed Identity Claims & Alibi Flow for ARP */}
          {arpObs && arpClaimedIp && arpObservedMacs.length > 0 && (
            <div className="p-3.5 rounded-lg bg-navy-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-teal-400" />
                  Observed Identity Claims (ARP)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Target: {arpClaimedIp}
                </span>
              </div>

              <div className="space-y-2">
                {arpObservedMacs.map((mac) => {
                  const isApproved =
                    isGatewayIpConfiguredForClaim &&
                    currentApprovedMacs.includes(mac);

                  return (
                    <div
                      key={mac}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded bg-navy-900 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400">MAC:</span>
                        <span className="text-slate-100 font-semibold">{mac}</span>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-teal-500/20 text-teal-300 border border-teal-500/40">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved Device
                          </span>
                        ) : !isGatewayIpConfiguredForClaim ? (
                          <button
                            type="button"
                            onClick={() => {
                              setGatewayIp(arpClaimedIp);
                            }}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                          >
                            Set Gateway IP to {arpClaimedIp}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const newMacs = Array.from(
                                new Set([...currentApprovedMacs, mac])
                              );
                              handleApply({
                                gateway_ip: arpClaimedIp,
                                approved_gateway_macs: newMacs,
                                authorized_scanner_ips: parseIps(scannersInput),
                              });
                            }}
                            disabled={isReinterpreting}
                            className="px-2.5 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Approve as authorized gateway</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Approval is an operator assertion tested against recorded
                traffic. Do not authenticate a device solely because a MAC
                matches.
              </p>
            </div>
          )}

          {/* Form Inputs (Manual editing remains fully available) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gateway IP */}
            <div className="space-y-1.5">
              <label
                htmlFor="alibi-gateway-ip"
                className="block text-xs font-medium text-slate-300"
              >
                Configured Gateway IPv4:
              </label>
              <input
                id="alibi-gateway-ip"
                type="text"
                placeholder="e.g. 192.0.2.1"
                value={gatewayIp}
                onChange={(e) => setGatewayIp(e.target.value)}
                disabled={isReinterpreting}
                className="w-full bg-navy-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
              />
              <span className="text-[10px] text-slate-500 block">
                Required if declaring approved gateway MACs
              </span>
            </div>

            {/* Approved Gateway MACs */}
            <div className="space-y-1.5">
              <label
                htmlFor="alibi-gateway-macs"
                className="block text-xs font-medium text-slate-300"
              >
                Approved Gateway MACs:
              </label>
              <input
                id="alibi-gateway-macs"
                type="text"
                placeholder="02:00:00:00:00:01, 02:00:00:00:00:02"
                value={macsInput}
                onChange={(e) => setMacsInput(e.target.value)}
                disabled={isReinterpreting}
                className="w-full bg-navy-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
              />
              <span className="text-[10px] text-slate-500 block">
                Comma-separated hex (e.g. 02:00:00:00:00:02)
              </span>
            </div>

            {/* Authorized Scanner IPs */}
            <div className="space-y-1.5">
              <label
                htmlFor="alibi-scanner-ips"
                className="block text-xs font-medium text-slate-300"
              >
                Authorized Scanner IPs:
              </label>
              <input
                id="alibi-scanner-ips"
                type="text"
                placeholder="e.g. 192.0.2.115"
                value={scannersInput}
                onChange={(e) => setScannersInput(e.target.value)}
                disabled={isReinterpreting}
                className="w-full bg-navy-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
              />
              <span className="text-[10px] text-slate-500 block">
                Approved testing or vulnerability scanner IPs
              </span>
            </div>
          </div>

          {validationWarning && (
            <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{validationWarning}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span>
                {!isFixture
                  ? "Applies operator context via live reinterpretation without altering recorded packet facts."
                  : "Preview mode: Demonstrates layout using author-provided fixture pair (`gateway-before` -> `gateway-approved`)."}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleReset}
                disabled={isReinterpreting}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Context</span>
              </button>

              <button
                type="button"
                onClick={() => handleApply()}
                disabled={isReinterpreting}
                className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isReinterpreting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Reinterpreting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {!isFixture
                        ? "Apply Context"
                        : previewKey === "gateway-before"
                        ? "Apply Context (Preview Approved)"
                        : "Apply Context"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* INTERPRETATION CHANGES PANEL (when changes exist) */}
      {interpretationChanges && interpretationChanges.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Interpretation Changes (Operator Context Applied)
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              {interpretationChanges.length} change record(s)
            </span>
          </div>

          <div className="space-y-3">
            {interpretationChanges.map((change, idx) => (
              <div
                key={idx}
                className="bg-navy-950/80 border border-teal-500/30 rounded-lg p-4 space-y-3"
              >
                {/* Transition Pill */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-mono text-slate-400">
                    Incident {change.incident_id}:
                  </span>
                  <span className="font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 line-through opacity-80">
                    {getAssessmentLabel(change.previous_assessment)}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                  <span className="font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold">
                    {getAssessmentLabel(change.current_assessment)}
                  </span>
                </div>

                {/* Reason Changed */}
                <div className="text-xs">
                  <span className="font-semibold text-slate-300 block mb-0.5">
                    Why the explanation changed:
                  </span>
                  <p className="text-slate-300 leading-relaxed bg-navy-900/80 p-2.5 rounded border border-slate-800">
                    {change.reason_changed}
                  </p>
                </div>

                {/* Evidence Retained */}
                <div className="text-xs">
                  <span className="font-semibold text-slate-400 block mb-0.5">
                    Evidence Retained (Unaltered Facts):
                  </span>
                  <p className="text-slate-400 leading-relaxed font-mono text-[11px]">
                    {change.evidence_retained}
                  </p>
                </div>

                {/* Remaining Problem */}
                <div className="text-xs">
                  <span className="font-semibold text-amber-300 block mb-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Remaining Problem:
                  </span>
                  <p className="text-amber-200/90 leading-relaxed bg-amber-950/30 p-2.5 rounded border border-amber-500/30">
                    {change.remaining_problem}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 italic">
            Operator authorization alters the likelihood of an attack
            explanation; it does not guarantee the service is operational.
          </div>
        </div>
      )}
    </div>
  );
}
