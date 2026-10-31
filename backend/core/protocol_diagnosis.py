"""Competing ARP and DNS explanations using explicit, inspectable requirements."""
from backend.core.models import Hypothesis


def protocol_diagnosis(obs, context):
    if obs.type == 'ARP_IDENTITY_CHANGE':
        address = next(e.value for e in obs.entities if e.kind == 'server')
        macs = {e.value for e in obs.entities if e.kind == 'mac'}
        gateway = context.gateway_ip is not None and str(context.gateway_ip) == address
        approved = set(context.approved_gateway_macs) if gateway else set()
        unexpected = macs - approved
        suspicion = bool(gateway and approved and unexpected)
        all_approved = bool(gateway and macs <= approved)
        reason = ('Observed gateway claimants outside the supplied policy: '+', '.join(sorted(unexpected))) if suspicion else (
            'Both observed gateway identities are user-approved; authorization is not independently authenticated.' if all_approved else
            'A verified gateway identity and approved MAC set have not been provided for this address.')
        hypotheses = (
            Hypothesis(id='gateway-impersonation', title='Possible address impersonation', evidence_level='plausible' if suspicion else 'insufficient',
                explanation='A changed sender claim can be consistent with impersonation, but the packets do not prove interception or malicious intent.',
                supporting_observation_ids=(obs.id,) if suspicion else (), supporting_reasons=(reason,) if suspicion else (),
                challenging_reasons=('Legitimate failover and duplicate-address configuration can produce the same claims.',)+( (reason,) if all_approved else ()),
                missing_evidence=('Authenticated device ownership, approved inventory, and evidence of interception.',),
                suggested_checks=('Verify both devices against the router inventory before changing network settings.',)),
            Hypothesis(id='authorized-transition', title='Authorized device transition or failover', evidence_level='plausible',
                explanation='A router replacement or backup-device transition can legitimately change the sender MAC associated with an IP.',
                supporting_observation_ids=(obs.id,), supporting_reasons=(reason,) if all_approved else (),
                missing_evidence=('Failover logs and verified maintenance history; approval alone does not prove the cause.',),
                suggested_checks=('Check the failover/maintenance record at the observed transition time.',)),
            Hypothesis(id='duplicate-address', title='Duplicate address configuration', evidence_level='plausible',
                explanation='Two devices may be configured with the same address. Sequential claims do not establish simultaneous duplicate ownership.',
                supporting_observation_ids=(obs.id,), missing_evidence=('Current address assignments and simultaneous device ownership.',),
                suggested_checks=('If an unintended duplicate is verified, correct its assigned address through the normal configuration process.',)),
        )
        return ('suspected_attack' if suspicion else 'unresolved',
                'Gateway identity change' if gateway else 'Address identity change', hypotheses,
                ('Verify the approved MAC addresses for '+address+'.', 'Check maintenance/failover logs; if a duplicate assignment is verified, correct the unintended address assignment.'))
    if obs.type.startswith('DNS_'):
        error = obs.type == 'DNS_RESPONSE_ERROR'
        hypotheses = (
            Hypothesis(id='resolver-service', title='Resolver failure or access policy', evidence_level='supported' if error else 'plausible',
                explanation='Matched SERVFAIL responses report failure; REFUSED reports rejection by policy. Delay or missing responses can also reflect resolver/path problems.',
                supporting_observation_ids=(obs.id,), supporting_reasons=(obs.description,),
                missing_evidence=('Resolver health, upstream reachability, configured resolver policy, and logs.',),
                suggested_checks=('Check the configured resolver and its logs; test the same name through another authorized client.',)),
            Hypothesis(id='dns-visibility', title='Capture visibility or independent network issue', evidence_level='plausible',
                explanation='Missing packets, partial capture visibility, and unrelated path problems can affect the observed DNS exchange.',
                supporting_observation_ids=(obs.id,), challenging_reasons=('These observations do not establish DNS hijacking or malicious intent.',),
                missing_evidence=('Bidirectional visibility and the capture point.',), suggested_checks=('Verify capture visibility before attributing missing responses to a resolver outage.',)),
        )
        return ('likely_fault' if error else 'unresolved', obs.title, hypotheses,
            ('Verify the configured resolver and its access policy. If its service or upstream connectivity is broken, restore it using the normal network procedure.',))
    return None
