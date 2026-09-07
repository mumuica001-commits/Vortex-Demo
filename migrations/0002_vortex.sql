-- Vortex: profiles, friends, DMs, call invites, presence
create table if not exists profiles (
  user_id      text primary key,
  username     text unique not null,
  display_name text not null default '',
  created_at   timestamptz not null default now()
);
create unique index if not exists profiles_username_lower_idx
  on profiles (lower(username));

create table if not exists friendships (
  id           text primary key,
  requester_id text not null,
  addressee_id text not null,
  status       text not null default 'pending',
  created_at   timestamptz not null default now(),
  unique (requester_id, addressee_id)
);
create index if not exists friendships_requester_idx on friendships (requester_id);
create index if not exists friendships_addressee_idx on friendships (addressee_id);

create table if not exists messages (
  id          bigserial primary key,
  sender_id   text not null,
  receiver_id text not null,
  content     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists messages_pair_idx
  on messages (sender_id, receiver_id, created_at);
create index if not exists messages_inbox_idx
  on messages (receiver_id, created_at desc);

create table if not exists call_invites (
  id           text primary key,
  from_user_id text not null,
  to_user_id   text not null,
  room_code    text not null,
  status       text not null default 'ringing',
  created_at   timestamptz not null default now()
);
create index if not exists call_invites_to_idx
  on call_invites (to_user_id, status, created_at desc);

create table if not exists presence (
  user_id   text primary key,
  last_seen timestamptz not null default now(),
  in_call   boolean not null default false
);
