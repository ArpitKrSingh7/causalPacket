"""Canonical API contract. JSON arrays serialize from immutable Python tuples."""

from __future__ import annotations

from ipaddress import IPv4Address
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Identifier = Annotated[str, Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,95}$")]
Text = Annotated[str, Field(min_length=1, max_length=2000)]
ShortText = Annotated[str, Field(min_length=1, max_length=256)]
Frame = Annotated[int, Field(strict=True, ge=1)]
Count = Annotated[int, Field(strict=True, ge=0)]
Seconds = Annotated[float, Field(ge=0, allow_inf_nan=False)]
Assessment = Literal["likely_fault", "suspected_attack", "unresolved"]
Severity = Literal["info", "low", "medium", "high"]
ObservationType = Literal[
    "TCP_CONNECTION_REFUSED", "TCP_SYN_RETRY", "TCP_UNANSWERED",
    "TCP_HANDSHAKE_DELAY", "SCAN_PATTERN", "ARP_IDENTITY_CHANGE",
    "DNS_RESPONSE_ERROR", "DNS_UNANSWERED", "DNS_DELAY",
]


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, allow_inf_nan=False)


class NetworkContext(ContractModel):
    gateway_ip: IPv4Address | None = None
    approved_gateway_macs: tuple[
        Annotated[str, Field(pattern=r"^(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$")], ...
    ] = Field(default=(), max_length=64)
    authorized_scanner_ips: tuple[IPv4Address, ...] = Field(default=(), max_length=64)

    @field_validator("approved_gateway_macs")
    @classmethod
    def normalize_macs(cls, values: tuple[str, ...]) -> tuple[str, ...]:
        return tuple(sorted({value.lower() for value in values}))

    @model_validator(mode="after")
    def require_gateway_for_approval(self) -> NetworkContext:
        if self.approved_gateway_macs and self.gateway_ip is None:
            raise ValueError("Specify the gateway IP when approving gateway MAC addresses.")
        return self


class Metric(ContractModel):
    key: Identifier
    label: ShortText
    value: int | float | bool | ShortText
    unit: ShortText | None = None


class HeaderField(ContractModel):
    name: ShortText
    value: ShortText


class PacketEvidence(ContractModel):
    frame_number: Frame
    time_offset_seconds: Seconds
    scope_id: ShortText
    protocol: Literal["ARP", "TCP", "UDP", "DNS", "ICMP", "IPv4", "OTHER"]
    source_ip: IPv4Address | None = None
    destination_ip: IPv4Address | None = None
    source_mac: ShortText | None = None
    destination_mac: ShortText | None = None
    source_port: Annotated[int, Field(ge=0, le=65535)] | None = None
    destination_port: Annotated[int, Field(ge=0, le=65535)] | None = None
    captured_length: Count
    summary: ShortText
    headers: tuple[HeaderField, ...] = Field(default=(), max_length=32)


class Entity(ContractModel):
    kind: Literal["client", "server", "resolver", "gateway", "mac", "service"]
    value: ShortText


class Observation(ContractModel):
    id: Identifier
    type: ObservationType
    title: ShortText
    description: Text
    scope_id: ShortText
    first_seen_seconds: Seconds
    last_seen_seconds: Seconds
    entities: tuple[Entity, ...] = Field(max_length=32)
    evidence_frames: tuple[Frame, ...] = Field(min_length=1, max_length=128)
    total_evidence_count: Count
    metrics: tuple[Metric, ...] = Field(default=(), max_length=32)
    caveats: tuple[Text, ...] = Field(default=(), max_length=16)

    @model_validator(mode="after")
    def check_interval_and_count(self) -> Observation:
        if self.last_seen_seconds < self.first_seen_seconds:
            raise ValueError("An observation cannot end before it starts.")
        if len(set(self.evidence_frames)) != len(self.evidence_frames):
            raise ValueError("Observation evidence frames must be unique.")
        if self.total_evidence_count < len(self.evidence_frames):
            raise ValueError("Total evidence count cannot be smaller than retained evidence.")
        return self


class EvidenceEdge(ContractModel):
    id: Identifier
    source_observation_id: Identifier
    target_observation_id: Identifier
    relation: Literal["precedes_on_shared_client", "shares_affected_client", "same_probe_pattern"]
    rule_id: Identifier
    reason: Text
    evidence_frames: tuple[Frame, ...] = Field(min_length=1, max_length=128)


class Hypothesis(ContractModel):
    id: Identifier
    title: ShortText
    explanation: Text
    evidence_level: Literal["supported", "plausible", "insufficient"]
    supporting_observation_ids: tuple[Identifier, ...] = Field(default=(), max_length=128)
    challenging_observation_ids: tuple[Identifier, ...] = Field(default=(), max_length=128)
    supporting_reasons: tuple[Text, ...] = Field(default=(), max_length=16)
    challenging_reasons: tuple[Text, ...] = Field(default=(), max_length=16)
    missing_evidence: tuple[Text, ...] = Field(default=(), max_length=16)
    suggested_checks: tuple[Text, ...] = Field(default=(), max_length=16)


class Comparison(ContractModel):
    id: Identifier
    title: ShortText
    status: Literal["available", "unavailable"]
    basis: Text
    baseline_label: ShortText
    current_label: ShortText
    baseline_metrics: tuple[Metric, ...] = Field(default=(), max_length=32)
    current_metrics: tuple[Metric, ...] = Field(default=(), max_length=32)
    evidence_frames: tuple[Frame, ...] = Field(default=(), max_length=128)
    limitations: tuple[Text, ...] = Field(default=(), max_length=16)


class Incident(ContractModel):
    id: Identifier
    title: ShortText
    summary: Text
    assessment: Assessment
    severity: Severity
    observation_ids: tuple[Identifier, ...] = Field(min_length=1, max_length=128)
    hypotheses: tuple[Hypothesis, ...] = Field(min_length=1, max_length=8)
    comparisons: tuple[Comparison, ...] = Field(default=(), max_length=8)
    next_steps: tuple[Text, ...] = Field(min_length=1, max_length=16)
    limitations: tuple[Text, ...] = Field(default=(), max_length=16)


class CaptureCoverage(ContractModel):
    status: Literal["complete", "partial", "limited"]
    format: Literal["pcap", "pcapng"]
    packets_seen: Count
    packets_decoded: Count
    packets_skipped: Count
    duration_seconds: Seconds
    protocols: tuple[ShortText, ...] = Field(max_length=32)
    link_types: tuple[ShortText, ...] = Field(max_length=16)
    limits_reached: tuple[ShortText, ...] = Field(default=(), max_length=16)
    visibility_notes: tuple[Text, ...] = Field(default=(), max_length=16)
    unsupported_checks: tuple[Text, ...] = Field(default=(), max_length=16)

    @model_validator(mode="after")
    def check_packet_accounting(self) -> CaptureCoverage:
        if self.packets_decoded + self.packets_skipped != self.packets_seen:
            raise ValueError("Decoded and skipped counts must account for examined records.")
        return self


class InterpretationChange(ContractModel):
    incident_id: Identifier
    previous_assessment: Assessment
    current_assessment: Assessment
    reason_changed: Text
    evidence_retained: Text
    remaining_problem: Text


class AnalysisReport(ContractModel):
    schema_version: Literal["1.0"] = "1.0"
    analysis_id: Identifier
    data_origin: Literal["capture", "development_fixture"]
    source_name: ShortText
    sample_id: Identifier | None = None
    coverage: CaptureCoverage
    context: NetworkContext
    observations: tuple[Observation, ...] = Field(max_length=1000)
    edges: tuple[EvidenceEdge, ...] = Field(max_length=2000)
    incidents: tuple[Incident, ...] = Field(max_length=200)
    evidence: tuple[PacketEvidence, ...] = Field(max_length=4000)
    interpretation_changes: tuple[InterpretationChange, ...] = Field(default=(), max_length=200)
    warnings: tuple[Text, ...] = Field(default=(), max_length=32)

    @model_validator(mode="after")
    def validate_references(self) -> AnalysisReport:
        def unique(values: list, label: str) -> set:
            if len(set(values)) != len(values):
                raise ValueError(f"Duplicate {label}.")
            return set(values)

        obs_ids = unique([o.id for o in self.observations], "observation ID")
        incident_ids = unique([i.id for i in self.incidents], "incident ID")
        unique([e.id for e in self.edges], "edge ID")
        frames = unique([e.frame_number for e in self.evidence], "evidence frame")

        def require_refs(values: tuple, available: set, label: str) -> None:
            if not set(values).issubset(available):
                raise ValueError(f"Unknown {label} reference.")

        for evidence in self.evidence:
            if evidence.frame_number > self.coverage.packets_seen:
                raise ValueError("Evidence frame exceeds examined record count.")
        for observation in self.observations:
            require_refs(observation.evidence_frames, frames, "frame")
        for edge in self.edges:
            require_refs((edge.source_observation_id, edge.target_observation_id), obs_ids, "observation")
            if edge.source_observation_id == edge.target_observation_id:
                raise ValueError("An evidence edge must link different observations.")
            require_refs(edge.evidence_frames, frames, "frame")
        for incident in self.incidents:
            require_refs(incident.observation_ids, obs_ids, "observation")
            for hypothesis in incident.hypotheses:
                require_refs(hypothesis.supporting_observation_ids, set(incident.observation_ids), "incident observation")
                require_refs(hypothesis.challenging_observation_ids, set(incident.observation_ids), "incident observation")
            for comparison in incident.comparisons:
                require_refs(comparison.evidence_frames, frames, "frame")
        for change in self.interpretation_changes:
            require_refs((change.incident_id,), incident_ids, "incident")
        return self


class SampleInfo(ContractModel):
    id: Identifier
    title: ShortText
    description: Text
    synthetic: Literal[True] = True
    available: bool
    suggested_context: NetworkContext = NetworkContext()


class SamplesResponse(ContractModel):
    samples: tuple[SampleInfo, ...]


class HealthResponse(ContractModel):
    status: Literal["ok"] = "ok"
    schema_version: Literal["1.0"] = "1.0"
    engine_ready: bool


class EvidencePage(ContractModel):
    analysis_id: Identifier
    evidence: tuple[PacketEvidence, ...]
    total_matching: Count
    offset: Count
    limit: Annotated[int, Field(ge=1, le=200)]


class ErrorDetail(ContractModel):
    code: Identifier
    message: Text


class ErrorResponse(ContractModel):
    error: ErrorDetail
