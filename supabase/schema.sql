-- WEC Live Timing — Supabase schema (Phase 1)
-- Run once in the Supabase SQL editor (or `supabase db push`) for a fresh project.
-- Mirrors app/types/replay.ts. See MIGRATION_PLAN.md §3.

-- ── 레이스 메타 (RaceMeta) ────────────────────────────────────────
create table if not exists races (
  id             text primary key,                 -- "2026-r1"
  year           int  not null,
  round          int  not null,
  name           text not null,
  circuit        text not null,
  country_flag   text,
  duration       text,
  date           date,
  status         text not null default 'live',     -- 'live' | 'finished'
  snapshot_count int  not null default 0,
  updated_at     timestamptz not null default now()
);

-- ── 영속 스냅샷 (RaceSnapshot) — 다시보기 소스 ────────────────────
-- payload = RaceSnapshot 에서 idx/ts 를 뺀 나머지
--           { cars, raceInfo, stats, messages, carStints?, driverStats?, lapHistory? }
create table if not exists snapshots (
  race_id  text not null references races(id) on delete cascade,
  idx      int    not null,                         -- 단일 writer 가 발급 (충돌 없음)
  ts       bigint not null,                          -- Unix ms
  payload  jsonb  not null,
  primary key (race_id, idx)
);
create index if not exists snapshots_race_ts_idx on snapshots (race_id, ts);

-- ── 라이브 현재 상태 (late-join 용 단일 행) — Phase 2/3 에서 사용 ──
create table if not exists live_state (
  race_id    text primary key references races(id) on delete cascade,
  payload    jsonb not null,                         -- 최신 RaceState 전체
  updated_at timestamptz not null default now()
);

-- ── RLS: 클라(anon)는 읽기 전용, 쓰기는 service_role 만 ───────────
alter table races      enable row level security;
alter table snapshots  enable row level security;
alter table live_state enable row level security;

drop policy if exists "public read races"      on races;
drop policy if exists "public read snapshots"  on snapshots;
drop policy if exists "public read live_state" on live_state;

create policy "public read races"      on races      for select using (true);
create policy "public read snapshots"  on snapshots  for select using (true);
create policy "public read live_state" on live_state for select using (true);
-- write 정책 없음 → anon write 차단. service_role 은 RLS 우회.
