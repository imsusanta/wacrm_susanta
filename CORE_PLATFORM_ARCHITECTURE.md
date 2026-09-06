# Helpa Core Platform Architecture

**Product**: Helpa Studio (`https://helpa.studio`)  
**Architecture Style**: Modular Monolith with Clean Service Boundaries  
**Rule**: `Industry Modules → Core Platform` (Core NEVER imports Industry Modules)

## Implementation status

The modular-monolith boundary is being enforced incrementally, not claimed as
complete. Travel AI tool implementations are owned by `src/modules/travel/ai`
and supplied through the Core `IndustryModulePort`; the platform registry
does not import concrete travel services. The server Supabase facade retains
SDK types, but table-specific generated typing still depends on a verified
canonical schema.

See [Industry tool boundaries and typed database client facade](./docs/architecture/INDUSTRY_TOOL_BOUNDARIES.md)
for the implemented dependency direction, regression tests, and remaining
work. The known migration/membership compatibility blocker is separate from
this behavior-preserving architecture increment.

---

## 1. Overview

Helpa is a multi-tenant, multi-industry AI Business Communication Platform. The system is split cleanly into:

1. **Helpa Core Platform (`src/core/`)**: Shared, industry-agnostic infrastructure, messaging, AI engine, multi-tenancy, and communication tools.
2. **Industry Modules (`src/modules/`)**: Business-specific manifests, terminologies, entities, workflows, campaign templates, and dashboards (e.g., Health, Coaching, Tutor, Salon, Real Estate).

```
                         HELPA
                           │
                     CORE PLATFORM
                           │
       ┌──────────┬────────┼────────┬──────────┐
       │          │        │        │          │
    WhatsApp    Inbox      AI     Contacts   Knowledge
       │          │        │        │          │
       └──────────┴────────┼────────┴──────────┘
                           │
                    Shared Services
                           │
       ┌──────────┬───────┼────────┬──────────┐
       │          │       │        │          │
     Health    Coaching  Tutor    Salon   Real Estate
       │
   Industry-specific
   functionality
```

---

## 2. Core Modules & Service Boundaries

### 1. Authentication & Security (`src/core/auth/`)

- User signup, sign-in, session management, CSRF protection, and role resolution.
- Completely isolated from industry context.

### 2. Multi-Tenant Architecture (`src/core/tenants/`)

- Strict tenant boundary verification (`assertTenantMatch`, `validateTenantPayload`).
- Every query, conversation, message, contact, and KB entry is scoped to `account_id`.

### 3. Workspace (`src/core/workspace/`)

- Business container (Name, Owner, Country, Timezone, Business Hours, Logo, Settings).

### 4. WhatsApp Integration (`src/lib/whatsapp/`)

- Meta Embedded Signup with Coexistence (`sessionInfoVersion: 3`).
- Multi-tenant webhook routing via `phone_number_id` resolution.
- Inbound and outbound message processing with delivery and read status receipts.

### 5. Inbox & Conversations (`src/core/inbox/`)

- Real-time conversation thread management with status (`open`, `closed`, `archived`).
- AI auto-reply mode vs human agent takeover.
- Internal staff notes, tagging, and assignment.

### 6. Contacts Engine (`src/core/contacts/`)

- Phone number normalization (E.164 standard).
- Deduplication and custom metadata attributes.

### 7. AI Engine & OpenRouter (`src/core/ai/`)

- Abstracted `AiProvider` interface with `OpenRouterAiProvider` default.
- Dynamic system prompt generation based on active Industry Manifest.
- Safety sanitization, hallucination guardrails, and prompt injection detection.

### 8. Conversation Memory (`src/core/ai/memory.ts`)

- Tenant-isolated sliding context window.
- Retains recent messages and customer notes for accurate AI reasoning.

### 9. Knowledge Base (`src/core/knowledge/`)

- Tenant-isolated storage for business FAQs, services, pricing, and policies.
- Keyword relevance matching and automatic prompt context injection.

### 10. AI Copilot (`src/core/copilot/`)

- Staff assistance engine: conversation summarization, intent detection, and contextual draft replies.

### 11. Campaigns (`src/core/campaigns/`)

- Outbound WhatsApp broadcasts with tag-based audience segmentation.
- Metrics tracking (sent, delivered, read, failed).

### 12. Automations (`src/core/automations/`)

- Trigger → Condition → Action workflow execution.

### 13. Notifications (`src/core/notifications/`)

- Unified WhatsApp and In-App notification dispatching.

### 14. Event Bus (`src/core/events/`)

- Asynchronous pub/sub event bus (`message.received`, `contact.created`, `booking.created`).
- Allows Industry Modules to listen to Core events without tight coupling.

### 15. Permissions & Roles (`src/core/permissions/`)

- Centralized permission registry (`ROLE_PERMISSIONS`).
- Roles: `owner`, `admin`, `staff`, `viewer`.

### 16. Analytics (`src/core/analytics/`)

- Shared metrics: total conversations, message volumes, AI resolution rate, and contact acquisition.

---

## 3. Data Ownership

| Subsystem                  | Data Owner                     | Table Names                                          |
| -------------------------- | ------------------------------ | ---------------------------------------------------- |
| **Core**                   | Users, Workspaces, Memberships | `users`, `accounts`, `account_memberships`           |
| **Core**                   | Contacts & Conversations       | `contacts`, `conversations`, `messages`              |
| **Core**                   | WhatsApp Integration           | `whatsapp_config`, `whatsapp_templates`              |
| **Core**                   | Knowledge Base                 | `knowledge_base`, `kb_categories`                    |
| **Core**                   | Campaigns & Automations        | `broadcast_campaigns`, `automations`                 |
| **Industry (Health)**      | Clinical Records               | `patients`, `doctors`, `appointments`, `lab_reports` |
| **Industry (Coaching)**    | Academy Records                | `courses`, `batches`, `admissions`                   |
| **Industry (Salon)**       | Salon Records                  | `services`, `staff`, `salon_appointments`            |
| **Industry (Real Estate)** | Property Records               | `properties`, `agents`, `site_visits`                |
