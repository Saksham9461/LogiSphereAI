-- Enable Supabase Realtime for trips table and configure RLS policies
alter table trips enable row level security;

-- Ensure read access policy for trips table
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'trips' and policyname = 'trips_select_policy'
  ) then
    create policy "trips_select_policy" on trips for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'trips' and policyname = 'trips_insert_policy'
  ) then
    create policy "trips_insert_policy" on trips for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'trips' and policyname = 'trips_update_policy'
  ) then
    create policy "trips_update_policy" on trips for update using (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'trips' and policyname = 'trips_delete_policy'
  ) then
    create policy "trips_delete_policy" on trips for delete using (true);
  end if;
end $$;

-- Enable Supabase Realtime publication on trips table
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table trips;
