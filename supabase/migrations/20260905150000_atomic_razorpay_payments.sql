begin;

-- Orders are persisted before checkout. The payment id is unknown until the
-- provider emits a signed event, so pending order rows must not invent one.
alter table public.platform_payments
  alter column razorpay_payment_id drop not null;

alter table public.platform_payments
  drop constraint if exists uq_platform_payments_payment_id;

create unique index if not exists uq_platform_payments_payment_id_present
  on public.platform_payments (razorpay_payment_id)
  where razorpay_payment_id is not null;

create or replace function public.apply_razorpay_captured_payment(
  p_order_id text,
  p_payment_id text,
  p_amount numeric,
  p_currency text,
  p_plan_id uuid,
  p_signature_digest text,
  p_event_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.platform_payments%rowtype;
  v_subscription_id uuid;
  v_existing_end timestamptz;
  v_existing_status text;
  v_period_start timestamptz := now();
  v_period_end timestamptz;
begin
  if nullif(trim(coalesce(p_order_id, '')), '') is null
     or nullif(trim(coalesce(p_payment_id, '')), '') is null
     or p_amount is null or p_amount <= 0
     or nullif(trim(coalesce(p_currency, '')), '') is null
     or p_plan_id is null then
    return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMETERS');
  end if;

  select * into v_payment
    from public.platform_payments
   where razorpay_order_id = p_order_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'ORDER_NOT_FOUND');
  end if;

  if v_payment.status = 'captured' then
    if v_payment.razorpay_payment_id = p_payment_id then
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'subscription_id', v_payment.subscription_id,
        'period_end', v_payment.period_end
      );
    end if;
    return jsonb_build_object('ok', false, 'error', 'PAYMENT_CONFLICT');
  end if;

  if v_payment.amount <> p_amount
     or upper(v_payment.currency) <> upper(p_currency) then
    return jsonb_build_object('ok', false, 'error', 'PAYMENT_MISMATCH');
  end if;

  if not exists (select 1 from public.accounts where id = v_payment.account_id) then
    return jsonb_build_object('ok', false, 'error', 'ACCOUNT_NOT_FOUND');
  end if;
  if not exists (select 1 from public.plans where id = p_plan_id) then
    return jsonb_build_object('ok', false, 'error', 'PLAN_NOT_FOUND');
  end if;

  select id, end_date, status
    into v_subscription_id, v_existing_end, v_existing_status
    from public.subscriptions
   where account_id = v_payment.account_id
   for update;

  if v_subscription_id is not null then
    v_period_start := case
      when v_existing_status = 'active' and v_existing_end > now()
        then v_existing_end
      else now()
    end;
    v_period_end := v_period_start + interval '30 days';
    update public.subscriptions
       set plan_id = p_plan_id,
           status = 'active',
           end_date = v_period_end,
           updated_at = now()
     where id = v_subscription_id and account_id = v_payment.account_id;
  else
    v_period_start := now();
    v_period_end := v_period_start + interval '30 days';
    insert into public.subscriptions (
      account_id, plan_id, status, start_date, end_date
    ) values (
      v_payment.account_id, p_plan_id, 'active', v_period_start, v_period_end
    ) returning id into v_subscription_id;
  end if;

  update public.platform_payments
     set subscription_id = v_subscription_id,
         razorpay_payment_id = p_payment_id,
         razorpay_signature = p_signature_digest,
         status = 'captured',
         period_start = v_period_start,
         period_end = v_period_end,
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'gateway', 'razorpay',
           'event', left(coalesce(p_event_type, 'payment.captured'), 80),
           'signature_storage', 'sha256'
         ),
         updated_at = now()
   where id = v_payment.id;

  insert into public.audit_logs (
    account_id, action, target_type, target_id, metadata
  ) values (
    v_payment.account_id,
    'payment.captured',
    'subscription',
    v_subscription_id,
    jsonb_build_object(
      'gateway', 'razorpay',
      'razorpay_payment_id', p_payment_id,
      'razorpay_order_id', p_order_id,
      'amount', p_amount,
      'currency', upper(p_currency),
      'plan_slug', v_payment.plan_slug,
      'period_end', v_period_end
    )
  );

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'subscription_id', v_subscription_id,
    'period_end', v_period_end
  );
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'PAYMENT_CONFLICT');
end;
$$;

revoke all on function public.apply_razorpay_captured_payment(
  text, text, numeric, text, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.apply_razorpay_captured_payment(
  text, text, numeric, text, uuid, text, text
) to service_role;

create or replace function public.record_razorpay_failed_payment(
  p_order_id text,
  p_payment_id text,
  p_amount numeric,
  p_currency text,
  p_error_code text,
  p_error_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.platform_payments%rowtype;
begin
  if nullif(trim(coalesce(p_order_id, '')), '') is null
     or nullif(trim(coalesce(p_payment_id, '')), '') is null
     or p_amount is null or p_amount <= 0
     or nullif(trim(coalesce(p_currency, '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'INVALID_PARAMETERS');
  end if;

  select * into v_payment
    from public.platform_payments
   where razorpay_order_id = p_order_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'ORDER_NOT_FOUND');
  end if;
  if v_payment.status = 'captured' then
    return jsonb_build_object('ok', true, 'status', 'already_processed');
  end if;
  if v_payment.amount <> p_amount
     or upper(v_payment.currency) <> upper(p_currency) then
    return jsonb_build_object('ok', false, 'error', 'PAYMENT_MISMATCH');
  end if;

  update public.platform_payments
     set razorpay_payment_id = p_payment_id,
         status = 'failed',
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'gateway', 'razorpay',
           'error_code', left(coalesce(p_error_code, 'PAYMENT_FAILED'), 100),
           'reason', left(coalesce(p_error_reason, 'Provider reported failure'), 255)
         ),
         updated_at = now()
   where id = v_payment.id;

  insert into public.audit_logs (
    account_id, action, target_type, target_id, metadata
  ) values (
    v_payment.account_id,
    'payment.failed',
    'payment',
    v_payment.id,
    jsonb_build_object(
      'gateway', 'razorpay',
      'razorpay_payment_id', p_payment_id,
      'razorpay_order_id', p_order_id,
      'error_code', left(coalesce(p_error_code, 'PAYMENT_FAILED'), 100)
    )
  );

  return jsonb_build_object('ok', true, 'status', 'payment_failure_recorded');
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'PAYMENT_CONFLICT');
end;
$$;

revoke all on function public.record_razorpay_failed_payment(
  text, text, numeric, text, text, text
) from public, anon, authenticated;
grant execute on function public.record_razorpay_failed_payment(
  text, text, numeric, text, text, text
) to service_role;

commit;
