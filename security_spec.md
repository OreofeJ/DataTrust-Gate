# Security Specification — DataTrust Gate

## 1. Data Invariants
1. **No Unauthenticated Access**: All collections reject unauthenticated requests and unverified email accounts (`request.auth.token.email_verified == true`).
2. **No Self-Approved Access Requests**: Non-synthetic access requests created by users must start in `decisionStatus == "PENDING"` with `policyCompliant == false` and `submittedByUid == request.auth.uid`.
3. **Immutable Request Provenance**: Once an access request is created, `requestId`, `researcherId`, `organisation`, `dataCategory`, `purpose`, `requestedDurationDays`, `consentReferenceId`, `submittedAt`, `submittedByUid`, and `isSynthetic` cannot be mutated.
4. **Append-Only Audit Trail**: Documents in `auditEvents` can only be created; `update` and `delete` are permanently denied (`if false`).
5. **Admin-Only Policy Mutation**: Creating or deactivating `governancePolicies` requires verified admin privileges (except during one-time initial seed when `systemMeta/seedState` does not exist).
6. **Safe Synthetic Reset**: Non-synthetic records (`isSynthetic == false`) cannot be deleted during synthetic dataset resets.
7. **Strict Schema & Size Enforcement**: Every document enforces exact `hasAll` / `hasOnly` field allowlists, `isValidId()` regex (`^[a-zA-Z0-9_\-]+$`, max 64 chars), and explicit `.size()` bounds on every string and array.

## 2. Adversarial Test Payloads ("Dirty Dozen")
1. **Self-Approval Injection**: Create `/accessRequests/req_spoof` with `decisionStatus: "APPROVED"`, `policyCompliant: true`, `isSynthetic: false` -> Expected: `PERMISSION_DENIED`.
2. **Shadow Field Injection**: Create `/accessRequests/req_shadow` with extra key `isAdminApproved: true` -> Expected: `PERMISSION_DENIED`.
3. **ID Poisoning**: Create `/accessRequests/a..b/../../evil` or 500-char ID -> Expected: `PERMISSION_DENIED`.
4. **Identity Spoofing**: Create `/accessRequests/req_id_spoof` with `submittedByUid: "other_user_uid"` -> Expected: `PERMISSION_DENIED`.
5. **Unverified Email Spoof**: Request with `email: "jardinsolicitors@gmail.com"` and `email_verified: false` -> Expected: `PERMISSION_DENIED`.
6. **Audit Tampering (Update)**: Attempt `updateDoc` on `/auditEvents/evt_001` -> Expected: `PERMISSION_DENIED`.
7. **Audit Erasure (Delete)**: Attempt `deleteDoc` on `/auditEvents/evt_001` -> Expected: `PERMISSION_DENIED`.
8. **Non-Admin Policy Creation**: Non-admin user attempts to create `/governancePolicies/pol_evil` after seed -> Expected: `PERMISSION_DENIED`.
9. **Policy Purpose Hijack on Update**: Admin updates `governancePolicies/pol_001` modifying `permittedPurposes` instead of `status` -> Expected: `PERMISSION_DENIED`.
10. **Oversized Explanation DoS**: Submit `decisionExplanation` with 5,000 characters -> Expected: `PERMISSION_DENIED`.
11. **Terminal Request Re-Mutation**: Attempt to modify `purpose` or `organisation` during evaluation update -> Expected: `PERMISSION_DENIED`.
12. **Privilege Escalation on Admins**: User writes `/admins/{uid}` -> Expected: `PERMISSION_DENIED`.
