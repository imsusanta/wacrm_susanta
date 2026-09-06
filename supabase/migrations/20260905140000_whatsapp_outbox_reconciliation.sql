begin;

-- Provider acceptance is terminal for provider I/O. A local write failure moves
-- the job into a separate reconciliation state that can never be claimed by a
-- sending worker.
alter table public.whatsapp_outbox
  drop constraint if exists whatsapp_outbox_status_check;

alter table public.whatsapp_outbox
  add constraint whatsapp_outbox_status_check
  check (status in (
    'pending', 'processing', 'retryable', 'retrying', 'sent', 'failed',
    'dead_letter', 'cancelled', 'unknown', 'reconciliation_required'
  ));

create or replace function public.enqueue_whatsapp_outbound_message(
  p_account_id uuid,
  p_conversation_id uuid,
  p_idempotency_key text,
  p_provider text default 'meta',
  p_content_type text default 'text',
  p_content_text text default null,
  p_sender_type text default 'agent',
  p_media_url text default null,
  p_max_attempts integer default 8,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
  v_outbox_id uuid;
  v_existing_outbox_id uuid;
  v_existing_message_id uuid;
  v_existing_status text;
  v_existing_provider_message_id text;
  v_existing_request_hash text;
  v_request_hash text;
  v_conversation_account_id uuid;
begin
  v_request_hash := nullif(trim(coalesce(p_payload ->> 'requestHash', '')), '');
  if p_account_id is null
     or p_conversation_id is null
     or nullif(trim(coalesce(p_idempotency_key, '')), '') is null
     or jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object'
     or v_request_hash is null then
    return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMETERS');
  end if;

  select account_id
    into v_conversation_account_id
    from public.conversations
   where id = p_conversation_id;

  if v_conversation_account_id is null or v_conversation_account_id <> p_account_id then
    return jsonb_build_object('ok', false, 'error', 'CONVERSATION_NOT_FOUND');
  end if;

  select id, message_id, status, provider_message_id,
         provider_result ->> 'requestHash'
    into v_existing_outbox_id, v_existing_message_id, v_existing_status,
         v_existing_provider_message_id, v_existing_request_hash
    from public.whatsapp_outbox
   where account_id = p_account_id
     and idempotency_key = p_idempotency_key;

  if v_existing_outbox_id is not null then
    if v_existing_request_hash is distinct from v_request_hash then
      return jsonb_build_object('ok', false, 'error', 'IDEMPOTENCY_CONFLICT');
    end if;
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'status', v_existing_status,
      'outbox_id', v_existing_outbox_id,
      'message_id', v_existing_message_id,
      'provider_message_id', v_existing_provider_message_id
    );
  end if;

  insert into public.messages (
    account_id, conversation_id, direction, sender_type, content_type,
    content_text, media_url, status, created_at, updated_at
  ) values (
    p_account_id, p_conversation_id, 'outbound',
    coalesce(p_sender_type, 'agent'), coalesce(p_content_type, 'text'),
    p_content_text, p_media_url, 'pending', now(), now()
  ) returning id into v_message_id;

  insert into public.whatsapp_outbox (
    account_id, conversation_id, message_id, idempotency_key, provider,
    status, attempt_count, max_attempts, available_at, provider_result,
    created_at, updated_at
  ) values (
    p_account_id, p_conversation_id, v_message_id, p_idempotency_key,
    coalesce(p_provider, 'meta'), 'pending', 0,
    greatest(coalesce(p_max_attempts, 8), 1), now(), p_payload, now(), now()
  ) returning id into v_outbox_id;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'status', 'pending',
    'outbox_id', v_outbox_id,
    'message_id', v_message_id
  );
exception when unique_violation then
  select id, message_id, status, provider_message_id,
         provider_result ->> 'requestHash'
    into v_existing_outbox_id, v_existing_message_id, v_existing_status,
         v_existing_provider_message_id, v_existing_request_hash
    from public.whatsapp_outbox
   where account_id = p_account_id
     and idempotency_key = p_idempotency_key;

  if v_existing_request_hash is distinct from v_request_hash then
    return jsonb_build_object('ok', false, 'error', 'IDEMPOTENCY_CONFLICT');
  end if;
  return jsonb_build_object(
    'ok', true,
    'duplicate', true,
    'status', coalesce(v_existing_status, 'processing'),
    'outbox_id', v_existing_outbox_id,
    'message_id', v_existing_message_id,
    'provider_message_id', v_existing_provider_message_id
  );
end;
$$;

revoke all on function public.enqueue_whatsapp_outbound_message(
  uuid, uuid, text, text, text, text, text, text, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.enqueue_whatsapp_outbound_message(
  uuid, uuid, text, text, text, text, text, text, integer, jsonb
) to service_role;

-- Completes both records in one transaction. If an older send path inserted a
-- second messages row first, adopt that row and remove the pending duplicate.
create or replace function public.complete_whatsapp_outbound_message(
  p_outbox_id uuid,
  p_account_id uuid,
  p_provider_message_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
  v_existing_message_id uuid;
  v_existing_provider_message_id text;
begin
  if p_outbox_id is null
     or p_account_id is null
     or nullif(trim(coalesce(p_provider_message_id, '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMETERS');
  end if;

  select message_id, provider_message_id
    into v_message_id, v_existing_provider_message_id
    from public.whatsapp_outbox
   where id = p_outbox_id and account_id = p_account_id
   for update;

  if v_message_id is null then
    return jsonb_build_object('ok', false, 'error', 'OUTBOX_NOT_FOUND');
  end if;
  if v_existing_provider_message_id is not null
     and v_existing_provider_message_id <> p_provider_message_id then
    return jsonb_build_object('ok', false, 'error', 'PROVIDER_ID_CONFLICT');
  end if;

  select id
    into v_existing_message_id
    from public.messages
   where account_id = p_account_id
     and provider_message_id = p_provider_message_id
   limit 1
   for update;

  if v_existing_message_id is not null and v_existing_message_id <> v_message_id then
    update public.whatsapp_outbox
       set message_id = v_existing_message_id
     where id = p_outbox_id and account_id = p_account_id;
    delete from public.messages
     where id = v_message_id
       and account_id = p_account_id
       and provider_message_id is null;
    v_message_id := v_existing_message_id;
  else
    update public.messages
       set provider_message_id = p_provider_message_id,
           status = 'sent',
           updated_at = now()
     where id = v_message_id and account_id = p_account_id;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'MESSAGE_NOT_FOUND');
    end if;
  end if;

  update public.whatsapp_outbox
     set status = 'sent',
         provider_message_id = p_provider_message_id,
         sent_at = coalesce(sent_at, now()),
         lease_expires_at = null,
         locked_at = null,
         locked_by = null,
         last_error_message = null,
         updated_at = now()
   where id = p_outbox_id and account_id = p_account_id;

  return jsonb_build_object('ok', true, 'message_id', v_message_id);
end;
$$;

revoke all on function public.complete_whatsapp_outbound_message(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.complete_whatsapp_outbound_message(uuid, uuid, text)
  to service_role;

create or replace function public.claim_whatsapp_reconciliation_batch(
  p_worker_id text,
  p_batch_size integer default 20,
  p_lease_seconds integer default 120
)
returns table (
  id uuid,
  account_id uuid,
  conversation_id uuid,
  message_id uuid,
  provider_message_id text,
  provider_result jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimable as (
    select o.id as outbox_id
      from public.whatsapp_outbox o
     where (
       o.status = 'reconciliation_required'
       or (
         o.status = 'processing'
         and o.provider_message_id is not null
         and o.lease_expires_at is not null
         and o.lease_expires_at < now()
       )
     )
       and o.provider_message_id is not null
     order by o.updated_at asc
     for update of o skip locked
     limit least(greatest(coalesce(p_batch_size, 20), 1), 100)
  ), updated as (
    update public.whatsapp_outbox o
       set status = 'processing',
           locked_at = now(),
           locked_by = coalesce(nullif(trim(p_worker_id), ''), 'reconciler'),
           lease_expires_at = now() +
             (greatest(coalesce(p_lease_seconds, 120), 10) || ' seconds')::interval,
           updated_at = now()
      from claimable c
     where o.id = c.outbox_id
    returning o.id, o.account_id, o.conversation_id, o.message_id,
              o.provider_message_id, o.provider_result
  )
  select u.id, u.account_id, u.conversation_id, u.message_id,
         u.provider_message_id, u.provider_result
    from updated u;
end;
$$;

revoke all on function public.claim_whatsapp_reconciliation_batch(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_whatsapp_reconciliation_batch(text, integer, integer)
  to service_role;

-- A sending worker must never claim a row after the provider has accepted it.
create or replace function public.claim_whatsapp_outbox_batch(
  p_worker_id text,
  p_batch_size integer default 20,
  p_lease_seconds integer default 120
)
returns table (
  id uuid,
  account_id uuid,
  conversation_id uuid,
  message_id uuid,
  idempotency_key text,
  provider text,
  attempt_count integer,
  max_attempts integer,
  payload jsonb,
  content_type text,
  content_text text,
  media_url text,
  sender_type text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimable as (
    select o.id as outbox_id
      from public.whatsapp_outbox o
     where (
       (o.status in ('pending', 'retryable', 'retrying') and o.available_at <= now())
       or (
         o.status = 'processing'
         and o.lease_expires_at is not null
         and o.lease_expires_at < now()
       )
     )
       and o.provider_message_id is null
       and o.attempt_count < o.max_attempts
     order by o.available_at asc, o.created_at asc
     for update of o skip locked
     limit least(greatest(coalesce(p_batch_size, 20), 1), 100)
  ), updated as (
    update public.whatsapp_outbox o
       set status = 'processing',
           locked_at = now(),
           locked_by = coalesce(nullif(trim(p_worker_id), ''), 'worker'),
           lease_expires_at = now() +
             (greatest(coalesce(p_lease_seconds, 120), 10) || ' seconds')::interval,
           attempt_count = o.attempt_count + 1,
           updated_at = now()
      from claimable c
     where o.id = c.outbox_id
    returning o.id, o.account_id, o.conversation_id, o.message_id,
              o.idempotency_key, o.provider, o.attempt_count,
              o.max_attempts, o.provider_result as payload
  )
  select u.id, u.account_id, u.conversation_id, u.message_id,
         u.idempotency_key, u.provider, u.attempt_count, u.max_attempts,
         u.payload, m.content_type, m.content_text, m.media_url, m.sender_type
    from updated u
    left join public.messages m
      on m.id = u.message_id and m.account_id = u.account_id;
end;
$$;

revoke all on function public.claim_whatsapp_outbox_batch(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_whatsapp_outbox_batch(text, integer, integer)
  to service_role;

commit;
