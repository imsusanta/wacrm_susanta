begin;

-- Parent keys used by account-scoped foreign keys.
create unique index if not exists uq_pipeline_stages_id_account_pipeline
  on public.pipeline_stages (id, account_id, pipeline_id);
create unique index if not exists uq_automation_executions_id_account
  on public.automation_executions (id, account_id);
create unique index if not exists uq_appointments_id_account
  on public.appointments (id, account_id);

-- Tags and custom values may only reference records from the same account.
alter table public.contact_tags
  drop constraint if exists contact_tags_contact_id_fkey,
  drop constraint if exists contact_tags_tag_id_fkey,
  add constraint contact_tags_contact_account_fkey
    foreign key (contact_id, account_id)
    references public.contacts (id, account_id) on delete cascade,
  add constraint contact_tags_tag_account_fkey
    foreign key (tag_id, account_id)
    references public.tags (id, account_id) on delete cascade;

alter table public.custom_field_values
  drop constraint if exists custom_field_values_contact_id_fkey,
  drop constraint if exists custom_field_values_custom_field_id_fkey,
  add constraint custom_field_values_contact_account_fkey
    foreign key (contact_id, account_id)
    references public.contacts (id, account_id) on delete cascade,
  add constraint custom_field_values_field_account_fkey
    foreign key (custom_field_id, account_id)
    references public.custom_fields (id, account_id) on delete cascade;

-- A stage must belong to the selected pipeline and every referenced CRM row
-- must belong to the deal's account.
alter table public.pipeline_stages
  drop constraint if exists pipeline_stages_pipeline_id_fkey,
  add constraint pipeline_stages_pipeline_account_fkey
    foreign key (pipeline_id, account_id)
    references public.pipelines (id, account_id) on delete cascade;

alter table public.deals
  drop constraint if exists deals_pipeline_id_fkey,
  drop constraint if exists deals_stage_id_fkey,
  drop constraint if exists deals_contact_id_fkey,
  add constraint deals_pipeline_account_fkey
    foreign key (pipeline_id, account_id)
    references public.pipelines (id, account_id) on delete cascade,
  add constraint deals_stage_pipeline_account_fkey
    foreign key (stage_id, account_id, pipeline_id)
    references public.pipeline_stages (id, account_id, pipeline_id)
    on delete cascade,
  add constraint deals_contact_account_fkey
    foreign key (contact_id, account_id)
    references public.contacts (id, account_id)
    on delete set null (contact_id);

alter table public.deal_activities
  drop constraint if exists deal_activities_deal_id_fkey,
  add constraint deal_activities_deal_account_fkey
    foreign key (deal_id, account_id)
    references public.deals (id, account_id) on delete cascade;

-- Automation graphs and execution logs remain inside one account.
alter table public.automation_nodes
  drop constraint if exists automation_nodes_automation_id_fkey,
  add constraint automation_nodes_automation_account_fkey
    foreign key (automation_id, account_id)
    references public.automations (id, account_id) on delete cascade;

alter table public.automation_edges
  drop constraint if exists automation_edges_automation_id_fkey,
  add constraint automation_edges_automation_account_fkey
    foreign key (automation_id, account_id)
    references public.automations (id, account_id) on delete cascade;

alter table public.automation_executions
  drop constraint if exists automation_executions_automation_id_fkey,
  add constraint automation_executions_automation_account_fkey
    foreign key (automation_id, account_id)
    references public.automations (id, account_id) on delete cascade;

alter table public.automation_execution_logs
  drop constraint if exists automation_execution_logs_execution_id_fkey,
  add constraint automation_execution_logs_execution_account_fkey
    foreign key (execution_id, account_id)
    references public.automation_executions (id, account_id) on delete cascade;

-- Conversation-flow references are account scoped, including nullable contacts.
alter table public.flow_nodes
  drop constraint if exists flow_nodes_flow_id_fkey,
  add constraint flow_nodes_flow_account_fkey
    foreign key (flow_id, account_id)
    references public.conversation_flows (id, account_id) on delete cascade;

alter table public.flow_edges
  drop constraint if exists flow_edges_flow_id_fkey,
  add constraint flow_edges_flow_account_fkey
    foreign key (flow_id, account_id)
    references public.conversation_flows (id, account_id) on delete cascade;

alter table public.flow_executions
  drop constraint if exists flow_executions_flow_id_fkey,
  drop constraint if exists flow_executions_conversation_id_fkey,
  drop constraint if exists flow_executions_contact_id_fkey,
  add constraint flow_executions_flow_account_fkey
    foreign key (flow_id, account_id)
    references public.conversation_flows (id, account_id) on delete cascade,
  add constraint flow_executions_conversation_account_fkey
    foreign key (conversation_id, account_id)
    references public.conversations (id, account_id) on delete cascade,
  add constraint flow_executions_contact_account_fkey
    foreign key (contact_id, account_id)
    references public.contacts (id, account_id)
    on delete set null (contact_id);

-- Existing appointment and delivery jobs also carry account_id and must not
-- link to another tenant's parent row.
alter table public.reminder_jobs
  drop constraint if exists reminder_jobs_appointment_id_fkey,
  add constraint reminder_jobs_appointment_account_fkey
    foreign key (appointment_id, account_id)
    references public.appointments (id, account_id) on delete cascade;

alter table public.whatsapp_outbox
  drop constraint if exists whatsapp_outbox_message_id_fkey,
  drop constraint if exists whatsapp_outbox_conversation_id_fkey,
  add constraint whatsapp_outbox_message_account_fkey
    foreign key (message_id, account_id)
    references public.messages (id, account_id) on delete restrict,
  add constraint whatsapp_outbox_conversation_account_fkey
    foreign key (conversation_id, account_id)
    references public.conversations (id, account_id) on delete restrict;

commit;
