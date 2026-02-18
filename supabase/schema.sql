create extension if not exists pgcrypto;

create table if not exists public.progress_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  watched boolean not null default false,
  watched_at timestamptz null,
  updated_at timestamptz not null default now(),
  unique(user_id, item_key)
);

alter table public.progress_items enable row level security;

drop policy if exists "progress_select_own" on public.progress_items;
create policy "progress_select_own"
on public.progress_items
for select
using (auth.uid() = user_id);

drop policy if exists "progress_insert_own" on public.progress_items;
create policy "progress_insert_own"
on public.progress_items
for insert
with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.progress_items;
create policy "progress_update_own"
on public.progress_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "progress_delete_own" on public.progress_items;
create policy "progress_delete_own"
on public.progress_items
for delete
using (auth.uid() = user_id);

create or replace function public.set_progress_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_progress_items_updated_at on public.progress_items;

create trigger trg_progress_items_updated_at
before update on public.progress_items
for each row
execute function public.set_progress_items_updated_at();
