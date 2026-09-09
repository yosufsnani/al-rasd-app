-- كشف المتابعة الإلكتروني — جدول البيانات السحابية
-- شغّل هذا الملف مرة واحدة في: Supabase Dashboard → SQL Editor → New query
-- (نفس مشروع Supabase المستخدم في تطبيق «معين» — فقط جدول جديد منفصل تمامًا عن جداول معين)

create table if not exists public.rasd_data (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create index if not exists rasd_data_user_id_idx on public.rasd_data(user_id);

alter table public.rasd_data enable row level security;

-- كل معلم يقرأ ويكتب صفوفه فقط (user_id = هويته في auth.users)
drop policy if exists "rasd_data_select_own" on public.rasd_data;
create policy "rasd_data_select_own" on public.rasd_data
  for select using (auth.uid() = user_id);

drop policy if exists "rasd_data_insert_own" on public.rasd_data;
create policy "rasd_data_insert_own" on public.rasd_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "rasd_data_update_own" on public.rasd_data;
create policy "rasd_data_update_own" on public.rasd_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "rasd_data_delete_own" on public.rasd_data;
create policy "rasd_data_delete_own" on public.rasd_data
  for delete using (auth.uid() = user_id);
