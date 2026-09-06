# Industry tool boundaries and typed database client facade

## Decision

Keep the modular monolith. Improve ownership and dependency direction rather
than introducing separately deployed services.

This increment is based on `65d87dc6016d8d45c7da85ca6880eb46e45ef0c8`
from the existing hardening branch.

## Industry-owned AI capabilities

Travel package tool implementations live in
`src/modules/travel/ai/tools.ts`, not inside `src/core/ai`.
The relocation preserves execution logic and tenant-scoped queries.
Booking/WhatsApp runtime dependencies load only when a relevant tool executes,
not when the application registers or enumerates tool descriptors.

The dependency direction is:

```text
src/instrumentation.ts
  -> src/modules/industry-port.ts       (composition root)
       -> src/modules/travel/ai/tools.ts
       -> Core's IndustryModulePort contract

src/core/ai/tools.ts
  -> src/core/ai/tool-registry.ts
  -> IndustryModulePort.getAiTools()
```

Core defines the contract and industry filtering. The module adapter supplies
implementations. A type-only dependency on `AiToolDefinition` does not load the
AI executor or a concrete industry at runtime.

The registry reads the current provider lazily:

- Before registration, shared platform tools remain available and industry
  extensions are absent.
- Registering the composition root exposes its tools without importing the
  module implementation from Core.
- Reset/re-registration does not leave stale extension registrations.
- An extension cannot replace a platform tool with the same name.
- Name enumeration and lookup use consistent first-extension precedence.
- Existing industry aliases, tool definitions, and execution authorization
  are preserved.

The existing Node server instrumentation, `scripts/worker.ts`, and test setup
register the module adapter. Any new non-Next.js entry point using industry AI tools must register
the composition root before processing work.

## Database client typing

`src/lib/supabase/server.ts` caches and returns `SupabaseClient` explicitly.
The former `any` cache no longer erases the SDK/query-builder type information
from `getAdminClient()` and the `AdminClient` facade alias.

Production caching and authentication/session options are unchanged. This
does not change database grants, RLS, or which requests use service-role access.

**This is not complete schema typing.** The SDK's table row types remain
generic. Binding a generated `Database` type must follow verification of the
canonical schema; attaching the currently inconsistent schema types would not
make the database itself correct.

## Enforcement and regression tests

- ESLint prohibits concrete `@/lib/travel` dependencies from Core.
- Layer conformance tests normalize relative paths as well as alias imports,
  so `../../modules/...` and `../../lib/travel/...` cannot evade the rules.
- Core's runtime dependency-cycle test remains enabled.
- Registry unit tests cover late registration, name collisions, deduplication,
  shared tools, and industry filtering.
- Composition-root tests cover pre-registration behavior and idempotence.
- Existing travel tests continue to exercise tenant scoping and safe failures.
- Client tests cover SDK typing and production versus non-production caching.

## Verification of this increment

Checked locally against the unchanged base commit above, with the same locked
dependencies and Vitest dummy-service configuration. No real tenant credentials
or deployed Supabase permissions were used.

| Check | Result |
| --- | --- |
| TypeScript (`npm run typecheck`) | Pass |
| Strict ESLint on changed TypeScript/config files | Pass; not a whole-repository lint claim |
| Prettier on changed TypeScript/config files | Pass |
| Production build (`npm run build`) | Pass with CI dummy Supabase settings; not a deployment or authenticated smoke test |
| Complete default Vitest selection, baseline | 1,748 passed / 14 failed / 1,762 total |
| Complete default Vitest selection, refactor | 1,764 passed / 14 failed / 1,778 total |
| New failures compared by test file and full test name | None |
| Added tests | 16 passed |

Both default-suite runs exclude `src/tests/integration/**`, matching `npm test`.
The same 14 pre-existing failures remain: four industry-role expectations in
`src/tests/core-ai.test.ts`, eight onboarding expectations in
`src/tests/onboarding-client.test.ts`, and two Razorpay webhook expectations in
`src/app/api/webhooks/razorpay/route.test.ts`. They were not skipped, rewritten,
or counted as passing. This branch is therefore not fully green.

The existing travel/booking/WhatsApp tests passed after making booking runtime
imports lazy. The production build emitted a non-fatal dynamic-font download warning
(HTTP 400 for the checkmark glyph) and exited successfully. Build-generated
metadata is excluded from this change.

## Non-goals and remaining work

This focused increment does not:

- Repair the known full migration replay failure or change membership models.
- Regenerate database types from an unverified schema.
- Convert every direct database query into a repository.
- Move all legacy health/real-estate tool definitions out of Core.
- Replace placeholder business responses in unrelated tools.
- Prove live Supabase, production, or independent security verification.

Next increments should establish the authoritative schema and generated row
types, migrate remaining industry-specific capabilities through the same
port, and introduce typed tenant-scoped repositories one subsystem at a time.