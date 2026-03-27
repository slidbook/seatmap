create table admins (
  email    text primary key,
  role     text not null check (role in ('owner', 'admin')),
  added_at timestamptz default now()
);

-- Seed the initial owner
insert into admins (email, role) values ('mike@open.gov.sg', 'owner');

-- RLS enabled; all access goes through service role (admin client)
alter table admins enable row level security;
