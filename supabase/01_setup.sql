-- Supabase SQL Editor에서 전체 실행. 기존 PLUM 테이블이 있다면 먼저 구조를 비교하세요.
begin;
create table if not exists public.plum_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.plum_sessions (
 id uuid primary key,
 token_hash text not null check(length(token_hash)=64),
 created_at timestamptz not null default now(),
 started_at timestamptz,
 completed_at timestamptz,
 last_seen_at timestamptz not null default now(),
 result_code text check(result_code in ('BTP','BTR','BMP','BMR','STP','STR','SMP','SMR')),
 quiz_version text not null default 'plum-type-2.0-final-18',
 consent_version text not null check(consent_version='plum-responses-v1'),
 consented_at timestamptz not null default now()
);
create table if not exists public.plum_events (
 id uuid primary key,
 session_id uuid not null references public.plum_sessions(id) on delete cascade,
 kind text not null check(kind in ('visit','start','answer','complete','abandon','heartbeat')),
 question_id text,
 created_at timestamptz not null default now()
);
create table if not exists public.plum_answers (
 session_id uuid not null references public.plum_sessions(id) on delete cascade,
 question_id text not null check(question_id ~ '^(bs[1-6]|tm[1-6]|pr[1-6]|tieBS|tieTM|tiePR)$'),
 pole text not null check(pole in ('B','S','T','M','P','R')),
 updated_at timestamptz not null default now(),
 primary key(session_id,question_id),
 check((question_id ~ '^bs' or question_id='tieBS') and pole in ('B','S') or (question_id ~ '^tm' or question_id='tieTM') and pole in ('T','M') or (question_id ~ '^pr' or question_id='tiePR') and pole in ('P','R'))
);
create index if not exists plum_events_session_idx on public.plum_events(session_id);
create index if not exists plum_sessions_created_idx on public.plum_sessions(created_at);
create index if not exists plum_sessions_started_idx on public.plum_sessions(started_at);
alter table public.plum_admins enable row level security;
alter table public.plum_sessions enable row level security;
alter table public.plum_events enable row level security;
alter table public.plum_answers enable row level security;
-- No browser-role policies: raw data and administrator membership are server-only.
revoke all on public.plum_admins,public.plum_sessions,public.plum_events,public.plum_answers from anon,authenticated;
grant select,insert,update,delete on public.plum_admins,public.plum_sessions,public.plum_events,public.plum_answers to service_role;

create or replace function public.plum_ingest(p_session uuid,p_hash text,p_event uuid,p_kind text,p_answers jsonb,p_question text,p_result text,p_consent text)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.plum_sessions; n int; a record; axis text; first_count int; second_count int; derived text:=''; tie text;
begin
 if p_consent is distinct from 'plum-responses-v1' or p_hash !~ '^[a-f0-9]{64}$' or p_kind not in ('visit','start','answer','complete','abandon','heartbeat') then raise exception 'Invalid event'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_session::text,0));
 select * into s from public.plum_sessions where id=p_session for update;
 if not found then
  if p_kind <> 'visit' then raise exception 'Visit required'; end if;
  perform pg_advisory_xact_lock(731920100);
  if (select count(*) from public.plum_sessions where created_at>now()-interval '1 minute')>=120 then raise exception 'New session rate limit'; end if;
  insert into public.plum_sessions(id,token_hash,consent_version) values(p_session,p_hash,p_consent) returning * into s;
 elsif s.token_hash<>p_hash then raise exception 'Invalid session'; end if;
 if exists(select 1 from public.plum_events where id=p_event and session_id=p_session) then return; end if;
 if (select count(*) from public.plum_events where session_id=p_session)>=600 then raise exception 'Session event limit'; end if;
 if p_kind in ('answer','complete','heartbeat','abandon') and s.started_at is null then raise exception 'Start required'; end if;
 if s.completed_at is not null and p_kind in ('answer','start','complete') then raise exception 'Already completed'; end if;
 if p_kind in ('answer','complete') then
  if jsonb_typeof(p_answers) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_answers))>21 then raise exception 'Invalid answers'; end if;
  for a in select key,value from jsonb_each_text(p_answers) loop
   if not ((a.key ~ '^bs[1-6]$' or a.key='tieBS') and a.value in ('B','S') or (a.key ~ '^tm[1-6]$' or a.key='tieTM') and a.value in ('T','M') or (a.key ~ '^pr[1-6]$' or a.key='tiePR') and a.value in ('P','R')) then raise exception 'Invalid option'; end if;
  end loop;
  if p_kind='answer' and (p_question is null or not p_answers ? p_question) then raise exception 'Question required'; end if;
  if p_kind='complete' then
   foreach axis in array array['BS','TM','PR'] loop
    select count(*) filter(where value=substr(axis,1,1)),count(*) filter(where value=substr(axis,2,1)) into first_count,second_count from jsonb_each_text(p_answers) where key ~ ('^'||lower(axis)||'[1-6]$');
    if first_count+second_count<>6 then raise exception 'Incomplete quiz'; end if;
    if first_count=3 then
     tie:=p_answers->>('tie'||axis);
     if tie is null or tie not in (substr(axis,1,1),substr(axis,2,1)) then raise exception 'Tie answer required'; end if;
     derived:=derived||tie;
    else derived:=derived||case when first_count>3 then substr(axis,1,1) else substr(axis,2,1) end; end if;
   end loop;
   if p_result is distinct from derived then raise exception 'Result mismatch'; end if;
  end if;
  delete from public.plum_answers where session_id=p_session;
  insert into public.plum_answers(session_id,question_id,pole) select p_session,key,value from jsonb_each_text(p_answers);
 end if;
 update public.plum_sessions set last_seen_at=now(),started_at=case when p_kind='start' then coalesce(started_at,now()) else started_at end,completed_at=case when p_kind='complete' then coalesce(completed_at,now()) else completed_at end,result_code=case when p_kind='complete' then p_result else result_code end where id=p_session;
 insert into public.plum_events(id,session_id,kind,question_id) values(p_event,p_session,p_kind,p_question);
end $$;
revoke all on function public.plum_ingest(uuid,text,uuid,text,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.plum_ingest(uuid,text,uuid,text,jsonb,text,text,text) to service_role;

create or replace function public.plum_metrics(p_from date,p_to date) returns jsonb
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare value jsonb;
begin
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>92 then raise exception 'Invalid range'; end if;
 with cohort as (select * from public.plum_sessions where (started_at at time zone 'Asia/Seoul')::date between p_from and p_to),
 daily as (select d::date as cohort_day from generate_series(p_from::timestamp,p_to::timestamp,'1 day') d)
 select jsonb_build_object(
  'visits',(select count(*) from public.plum_sessions where (created_at at time zone 'Asia/Seoul')::date between p_from and p_to),
  'starts',(select count(*) from cohort),'completions',(select count(*) from cohort where completed_at is not null),
  'dropoffs',(select count(*) from cohort where completed_at is null and last_seen_at<now()-interval '30 minutes'),
  'daily',(select coalesce(jsonb_agg(jsonb_build_object('date',cohort_day,'visits',(select count(*) from public.plum_sessions where (created_at at time zone 'Asia/Seoul')::date=cohort_day),'starts',(select count(*) from cohort where (started_at at time zone 'Asia/Seoul')::date=cohort_day),'completions',(select count(*) from cohort where completed_at is not null and (started_at at time zone 'Asia/Seoul')::date=cohort_day)) order by cohort_day),'[]'::jsonb) from daily),
  'results',(select coalesce(jsonb_agg(row_to_json(r)),'[]'::jsonb) from (select result_code code,count(*) count from cohort where completed_at is not null group by result_code) r),
  'answers',(select coalesce(jsonb_agg(row_to_json(a)),'[]'::jsonb) from (select question_id,pole,count(*) count from public.plum_answers join cohort on cohort.id=session_id group by question_id,pole) a)
 ) into value;return value;
end $$;
revoke all on function public.plum_metrics(date,date) from public,anon,authenticated;
grant execute on function public.plum_metrics(date,date) to service_role;
create or replace function public.plum_purge_expired() returns void language sql security invoker set search_path=public,pg_temp as $$ delete from public.plum_sessions where created_at<now()-interval '90 days'; $$;
revoke all on function public.plum_purge_expired() from public,anon,authenticated;
grant execute on function public.plum_purge_expired() to service_role;
create or replace function public.plum_withdraw(p_session uuid,p_hash text) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_session::text,0));
 delete from public.plum_sessions where id=p_session and token_hash=p_hash;
end $$;
revoke all on function public.plum_withdraw(uuid,text) from public,anon,authenticated;
grant execute on function public.plum_withdraw(uuid,text) to service_role;
commit;
