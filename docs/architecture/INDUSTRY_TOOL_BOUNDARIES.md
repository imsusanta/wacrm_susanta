# Industry tool boundaries

**Date:** 2026-09-07  
**Base:** `origin/main` @ `a2c48afc`  
**Approach:** Port the reviewed architecture from PR #256 onto current main.
Do **not** merge draft PR #253 (conflicting; includes unrelated hardening).

## Decision

Industry-owned AI tools are supplied through `IndustryModulePort.getAiTools()`.
Core keeps an industry-agnostic `AiToolRegistry`. Platform tool names win.
Authorization remains in the trusted executor.

Dependency direction:

```
Application / worker composition root
  -> Industry implementation (src/modules)
  -> Core-owned contracts (IndustryModulePort, AiToolDefinition)
Core AI executor
  -> AiToolRegistry
  -> IndustryModulePort.getAiTools()
```

Core must not import `src/modules` or `@/lib/travel`.

## What this increment changes

- Travel tour-package tools live in `src/modules/travel/ai/tools.ts`.
- Booking/WhatsApp adapters load only when a write tool executes.
- `getAdminClient()` is typed as `SupabaseClient` (SDK types, not generated rows).
- Layer tests resolve relative imports so `../../lib/travel` cannot bypass aliases.

## What this increment does not change

- Tool metadata, confirmation flags, parameter contracts, or tenant context.
- Voice, multilingual, notification, or calling-dashboard behavior.
- Database migrations or RLS.
- Generated database types (follow-up).
