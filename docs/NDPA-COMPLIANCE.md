# NDPA Compliance (Engineering Side)

> LEGAL REVIEW REQUIRED items are marked [LEGAL].

## 1. Data inventory
- User.email, names, phone, login metadata (personal data, authentication/records).
- Party.name + Party.contactInfo (PII), counselName (personal data, case correspondence).
- AuditLog/RefreshToken IP/UA (personal data, security audit).
- LawyerProfile NBA number (professional verification).
- ConsentRecord (consent evidence).

## 2. Consent capture/withdrawal
- ConsentRecord opt-in by settings flow; withdrawal by setting withdrawnAt. Notification worker skips withdrawn.

## 3. Data subject requests (access/correction/erasure)
- Export and correction endpoints + admin workflow; erasure limited by statute (retention jobs).
- [LEGAL] erasure/legal basis exceptions.

## 4. Retention
- Refresh tokens pruned daily. Audit logs and case docs retention per [LEGAL].
- Documents purge job after closure + retention.

## 5. Field-level encryption
- AES-256-GCM for Party.contactInfo + phone; key FIELD_ENCRYPTION_KEY.
- [PARTIAL] implement as Phase 8 hardening task.

## 6. Encryption in transit/at rest
- TLS at reverse proxy. Private bucket. Disk/LUN encryption at infra layer.

## 7. Breach response runbook (72h)
- Detect (alerts on auth/Audit log spikes), contain, notify NDPC + affected subjects within 72h, document.

## 8. Privacy notice and cookie text
- Portal: privacy notice link + cookie banner; necessary cookies only.

## 9. DPIA template
- To be authored by DPO/legal.

### Items requiring LEGAL review [LEGAL]
- Lawful basis mapping per data category
- Retention periods/erasure exceptions
- Cross-border transfers (email/SMS/AWS)
- User-facing consent language
- Severity/breach threshold definitions
