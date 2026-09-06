begin;

update public.tenant_modules
   set enabled = false,
       updated_at = now()
 where module_key in (
   'real_estate', 'travel', 'coaching', 'restaurant', 'gym',
   'solo_teacher', 'salon'
 )
   and enabled = true;

alter table public.tenant_modules
  drop constraint if exists tenant_modules_unreleased_disabled_check;
alter table public.tenant_modules
  add constraint tenant_modules_unreleased_disabled_check
  check (
    enabled = false
    or module_key not in (
      'real_estate', 'travel', 'coaching', 'restaurant', 'gym',
      'solo_teacher', 'salon'
    )
  );

commit;
