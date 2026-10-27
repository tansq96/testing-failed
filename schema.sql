-- Run this once in the Supabase SQL editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  currency text not null default 'USD',
  cycle text not null check (cycle in ('week', 'month', 'year')),
  next_charge date not null,
  is_trial boolean not null default false,
  last_reminded date,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_next_charge_idx on public.subscriptions (next_charge);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

create policy "own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "own subscriptions" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create a profile row whenever someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
