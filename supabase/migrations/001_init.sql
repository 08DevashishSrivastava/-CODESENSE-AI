create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  voice_enabled boolean not null default true,
  voice_language text not null default 'en-IN',
  voice_personality text not null default 'professional',
  profanity_enabled boolean not null default false,
  speech_rate float not null default 1.0,
  speech_volume float not null default 0.8,
  alert_cooldown integer not null default 5000,
  enabled_languages jsonb not null default '[]'::jsonb,
  analysis_mode text not null default 'balanced',
  save_history boolean not null default false,
  voice_message_override text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.diagnostic_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  language text not null,
  problem_title text,
  error_type text not null,
  line_number integer not null,
  confidence float not null default 0,
  error_message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_type text not null,
  language text not null,
  processing_time_ms integer not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.diagnostic_history enable row level security;
alter table public.usage_logs enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can view own settings" on public.user_settings for select using (auth.uid() = user_id);
create policy "Users can update own settings" on public.user_settings for update using (auth.uid() = user_id);
create policy "Users can insert own settings" on public.user_settings for insert with check (auth.uid() = user_id);

create policy "Users can view own diagnostics" on public.diagnostic_history for select using (auth.uid() = user_id);
create policy "Users can insert own diagnostics" on public.diagnostic_history for insert with check (auth.uid() = user_id);

create policy "Users can view own usage" on public.usage_logs for select using (auth.uid() = user_id);
create policy "Users can insert own usage" on public.usage_logs for insert with check (auth.uid() = user_id);
