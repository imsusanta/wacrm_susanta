# Helpa 10/10 Engineering Roadmap

This document is the canonical improvement plan for moving Helpa toward an operationally mature SaaS. Historical audit reports remain evidence; this roadmap owns current priorities. It is a target, not a certification of the current production deployment. Checked implementation tasks do not replace runtime or release verification.

## Definition of 10/10

Helpa reaches the target when every item below has objective, reproducible evidence:

- Security gates fail closed and block merges.
- Every production deployment is traceable to an immutable commit SHA.
- Critical user journeys pass in CI and production smoke tests.
- Tenant isolation is enforced at the application and database layers.
- Security-critical modules meet explicit test-coverage thresholds.
- Performance and reliability targets are measured, alerted, and reviewed.
- Public version, release, deployment, and product claims are consistent.
- The primary customer profile has a focused onboarding and activation journey.

## Current hardening work — September 2026

The changes in draft PR #253 are not yet a verified production release. Existing required CI, deployment, live-database, and recovery evidence must pass on the exact candidate commit before merge. A skipped check is not evidence of success.

Implemented changes awaiting complete release validation include persisted admin reporting, membership-backed tenant policies, account-scoped foreign keys, transactional WhatsApp and Razorpay processing, bounded AI reference data, and unavailable-module gating.

Additional subscription protection enforces the paid interval at read time, denies invalid/future/expired periods, removes the blanket Pro-plan feature bypass, and prevents the expiry worker from overwriting concurrent renewals. Migration smoke testing must be explicitly local-only and require acknowledgement before deleting local data.

### Architecture acceptance gates, in execution order

| Gate | Required evidence before calling it complete |
| --- | --- |
| 1. Reproducible release | Clean install; formatting, strict lint, typecheck, unit tests, security checks, production build, and critical browser tests pass on one commit. |
| 2. Canonical platform boundaries | Core business rules are independent of UI and provider SDKs; repository/provider adapters own I/O; no Appwrite compatibility path can authorize Supabase tenant access. Retire compatibility paths only after confirming rollback requirements. |
| 3. Tenant isolation | Real authenticated database tests for two tenants, revoked memberships, forged JWT account claims, cross-account foreign keys, storage paths, and privileged RPC grants. Static SQL scans and mocks are not sufficient. |
| 4. Billing authority | Authorization reads persisted active plans without display-catalog fallbacks; paid-period expiry works without a cron job; renewal and cancellation races, exact amount/currency, replay, and transaction rollback are tested. |
| 5. Atomic quota admission | Reserve capacity before provider work in one transaction; concurrent requests cannot overrun limits; retries cannot double-charge; release/settlement rules are explicit; AI token and currency budgets are bounded. Atomic increments alone are insufficient. |
| 6. Worker recovery | Prove bounded concurrency, tenant fairness, leased claims, shutdown draining, retries, dead-letter handling, and ambiguous provider-result reconciliation. Do not promise exactly-once external delivery without provider support. |
| 7. Database lifecycle | Apply all migrations to a disposable local database and an upgrade fixture; verify constraints against representative existing data; demonstrate backup restore and document forward repair. Never reset a linked remote database as a smoke test. |
| 8. AI and provider resilience | Account-scoped credentials/data, denied undecryptable credentials, timeouts, circuit breakers, prompt/model versioning, evaluation cases, and explicit untrusted-reference handling. |
| 9. Operational proof | App/worker release-SHA parity, actionable SLO alerts, measured load tests against an agreed workload, provider-outage and duplicate-webhook drills, and a successful restore drill. Keep Target and Observed results separate. |
| 10. Release and security sign-off | Confirm exposed credential rotation/revocation, required branch-protection checks, access review, privacy/retention review, successful staging deployment, and verified production promotion. |

Keep the modular monolith and independently deployed workers unless measured bottlenecks justify additional services. More services, dashboards, or documents do not increase the score by themselves.

## P0 — Merge protection and release truthfulness

- [x] Make secret scanning blocking.
- [x] Split CI into independently visible quality, test, security, build, and E2E gates.
- [ ] Require all CI jobs through branch protection on `main`.
- [ ] Reconcile the public version badge, GitHub release, package version, and deployed SHA.
- [ ] Close or reconcile stale WhatsApp Embedded Signup pull requests.
- [ ] Publish a stable release only after post-deployment SHA verification succeeds.

**Exit evidence:** protected `main`, green required checks, stable release tag, and matching `/api/health` SHA.

## P1 — Maintainability and test confidence

- [ ] Refactor dashboard pages larger than 400 lines into feature components, hooks, and service modules.
- [x] Add coverage reporting with minimum thresholds for authentication, tenant guards, encryption, and outbound persistence.
- [ ] Add and enforce coverage thresholds for billing, webhook verification, and outbox processing, including concurrency and rollback cases.
- [x] Add contract tests for Meta WhatsApp and payment-provider boundaries.
- [x] Document a staging-only restore drill (`docs/operations/runbook-backup-restore.md`). *(Awaiting operator execution)*
- [ ] Add migration rollback tests and execute a restore drill.
- [x] Consolidate overlapping audit documents under `docs/audits/` and maintain one current readiness report.

**Exit evidence:** enforced coverage thresholds, no oversized route components without an exception, and a tested rollback procedure.

## P2 — Reliability and observability

- [x] Define service-level indicators and a Target vs Observed worksheet (`docs/slo.md`, `docs/observability.md`).
- [x] Pair first-response inbound/outbound timestamps in code (`response_time_seconds` + conversation-id pairing). *(Observed SLO cells stay empty until a dated production window)*
- [ ] Set alert thresholds and scrape probes in the hosting platform.
- [ ] Fill Observed SLO cells after a dated production window.
- [x] Add correlation IDs across inbound webhooks, outbox records, provider calls, and reconciliation workers.
- [ ] Add dashboards for queue depth, delivery latency, provider errors, tenant-scoped failures, and reconciliation backlog.
- [x] Write IR procedures for webhook, missing outbound, AI, tenant access, bad migration, and leaked credentials (`docs/incident-response.md`). *(Awaiting game days)*
- [ ] Run backup-restore, provider-outage, and duplicate-webhook game days.

**Exit evidence:** actionable alerts, documented ownership, and successful recovery exercises.

## P3 — Product focus and customer proof

- [ ] Select one launch ICP and make the homepage, onboarding, demo data, and activation checklist specific to it.
- [ ] Track time-to-first-value, onboarding completion, conversation automation rate, booking conversion, and retained weekly usage.
- [x] Add reception-label unit checks for login, composer, thread, reactions, and report actions (`src/tests/a11y/reception-labels.test.ts`).
- [ ] Add broader accessibility checks to CI and complete keyboard-only testing of critical flows.
- [ ] Set performance budgets for Core Web Vitals and major dashboard routes.
- [ ] Validate legal, privacy, retention, and healthcare claims with qualified reviewers before expanding clinical deployment.

**Exit evidence:** measurable activation and retention targets, accessibility conformance evidence, and reviewed compliance claims.

## Recommended branch-protection checks

Require these checks before merge:

1. `Formatting, lint, and types`
2. `Unit, integration, and migration tests`
3. `Secrets and dependency security`
4. `Production build`
5. `Critical-path browser tests`

Also require pull requests, dismissal of stale approvals, resolution of review conversations, and no force pushes to `main`.

## Scorecard

Review this scorecard at each stable release:

| Area | Target | Evidence |
| --- | ---: | --- |
| Security | 10/10 | Blocking scans, threat tests, dependency policy |
| Reliability | 10/10 | SLOs, alerts, drills, deployment verification |
| Test confidence | 10/10 | Coverage thresholds and critical-path tests |
| Maintainability | 10/10 | Bounded modules and documented architecture |
| Release discipline | 10/10 | Protected branch and traceable stable releases |
| Product quality | 10/10 | Focused ICP, accessibility, performance, activation |

A release is not labeled 10/10 because a document says so. It earns the label when the evidence above is current and reproducible.
