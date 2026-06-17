drop policy if exists "admin_paths_all" on public.learning_paths;

create policy "admin_paths_insert" on public.learning_paths
  for insert to authenticated
  with check ((select private.is_admin()));
create policy "admin_paths_update" on public.learning_paths
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "admin_paths_delete" on public.learning_paths
  for delete to authenticated
  using ((select private.is_admin()));

drop policy if exists "admin_units_all" on public.learning_units;

create policy "admin_units_insert" on public.learning_units
  for insert to authenticated
  with check ((select private.is_admin()));
create policy "admin_units_update" on public.learning_units
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "admin_units_delete" on public.learning_units
  for delete to authenticated
  using ((select private.is_admin()));

drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;

create policy "profiles_update_own_or_admin" on public.profiles
  for update to authenticated
  using (
    (select auth.uid()) = id
    or (select private.is_admin())
  )
  with check (
    (select private.is_admin())
    or (
      (select auth.uid()) = id
      and role = (select private.current_profile_role())
      and status = (select private.current_profile_status())
    )
  );
