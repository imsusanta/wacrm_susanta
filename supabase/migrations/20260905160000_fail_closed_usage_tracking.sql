begin;

create or replace function public.increment_usage_tracking(
  p_account_id uuid,
  p_metric text,
  p_quantity integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', now())::date;
begin
  if p_account_id is null
     or p_metric not in ('ai_requests', 'whatsapp_messages')
     or p_quantity is null
     or p_quantity < 1
     or p_quantity > 100000 then
    return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMETERS');
  end if;
  if not exists (select 1 from public.accounts where id = p_account_id) then
    return jsonb_build_object('ok', false, 'error', 'ACCOUNT_NOT_FOUND');
  end if;

  insert into public.usage_tracking (
    account_id, month, ai_requests, whatsapp_messages, created_at, updated_at
  ) values (
    p_account_id,
    v_month,
    case when p_metric = 'ai_requests' then p_quantity else 0 end,
    case when p_metric = 'whatsapp_messages' then p_quantity else 0 end,
    now(),
    now()
  )
  on conflict (account_id, month) do update
    set ai_requests = public.usage_tracking.ai_requests +
          case when p_metric = 'ai_requests' then p_quantity else 0 end,
        whatsapp_messages = public.usage_tracking.whatsapp_messages +
          case when p_metric = 'whatsapp_messages' then p_quantity else 0 end,
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.increment_usage_tracking(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.increment_usage_tracking(uuid, text, integer)
  to service_role;

commit;
