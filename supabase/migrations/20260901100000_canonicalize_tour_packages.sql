-- Canonicalize tour_packages as the single travel-package table.
--
-- The legacy travel_packages table was a booking-time mirror of tour_packages.
-- This migration moves bookings to the canonical table and removes the mirror
-- only after every referenced legacy package has an unambiguous replacement.
-- Historical bookings without a package remain valid with a NULL
-- tour_package_id; all new application-created bookings provide the column.

begin;

alter table public.travel_bookings
  add column if not exists tour_package_id uuid;

-- Backfill referenced bookings before removing the legacy column. Fail the
-- whole transaction if a referenced package cannot be mapped safely; never
-- silently drop a booking's package relationship.
do $$
declare
  v_ambiguous boolean;
  v_unmapped boolean;
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'travel_bookings'
       and column_name = 'package_id'
  ) then
    if to_regclass('public.travel_packages') is null then
      raise exception
        'Cannot canonicalize travel bookings: travel_packages table is missing while package_id still exists';
    end if;

    select exists (
      select 1
        from public.travel_packages lp
        join public.tour_packages t
          on t.account_id = lp.account_id
         and lower(t.name) = lower(lp.name)
       group by lp.id
      having count(t.id) > 1
    )
      into v_ambiguous;

    if v_ambiguous then
      raise exception
        'Cannot canonicalize travel packages: duplicate canonical package names make the backfill ambiguous';
    end if;

    select exists (
      select 1
        from public.travel_bookings b
        left join public.travel_packages lp
          on lp.id = b.package_id
        left join public.tour_packages t
          on t.account_id = lp.account_id
         and lower(t.name) = lower(lp.name)
       where b.package_id is not null
         and b.tour_package_id is null
         and (lp.id is null or t.id is null)
    )
      into v_unmapped;

    if v_unmapped then
      raise exception
        'Cannot canonicalize travel bookings: one or more package_id values have no unambiguous tour_packages match';
    end if;

    update public.travel_bookings b
       set tour_package_id = t.id
      from public.travel_packages lp
      join public.tour_packages t
        on t.account_id = lp.account_id
       and lower(t.name) = lower(lp.name)
     where b.package_id = lp.id
       and b.tour_package_id is null;

    alter table public.travel_bookings
      drop column if exists package_id;
  end if;
end
$$;

-- Enforce referential integrity for all new canonical booking references.
do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.travel_bookings'::regclass
       and conname = 'travel_bookings_tour_package_id_fkey'
  ) then
    alter table public.travel_bookings
      add constraint travel_bookings_tour_package_id_fkey
      foreign key (tour_package_id)
      references public.tour_packages(id);
  end if;
end
$$;

-- The old mirror is safe to remove after the booking references are migrated.
drop table if exists public.travel_packages cascade;

create index if not exists idx_travel_bookings_tour_package_id
  on public.travel_bookings (tour_package_id);

commit;
