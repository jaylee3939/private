-- 새 기능 확장 전용. 기존 응답/계정/콘텐츠를 삭제하거나 초기화하지 않습니다.
begin;
alter table public.plum_sessions drop constraint if exists plum_sessions_consent_version_check;
alter table public.plum_sessions add constraint plum_sessions_consent_version_check check(consent_version in ('plum-responses-v1','plum-responses-v2'));
create table if not exists public.plum_share_events (
 id uuid primary key,
 session_id uuid not null references public.plum_sessions(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index if not exists plum_share_events_session_idx on public.plum_share_events(session_id);
create index if not exists plum_share_events_created_idx on public.plum_share_events(created_at);
alter table public.plum_share_events enable row level security;
revoke all on public.plum_share_events from public,anon,authenticated;
grant select,insert on public.plum_share_events to service_role;

-- Reuse the existing scoring/validation function; repair prerequisites atomically.
create or replace function public.plum_ingest_v3(p_session uuid,p_hash text,p_event uuid,p_kind text,p_answers jsonb,p_question text,p_result text,p_consent text,p_visit_event uuid,p_start_event uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.plum_sessions; receipt uuid; snapshot jsonb;
begin
 if p_consent not in ('plum-responses-v1','plum-responses-v2') or p_consent is null or p_hash !~ '^[a-f0-9]{64}$' or p_hash is null or p_event is null or p_visit_event is null or p_start_event is null or p_kind not in ('visit','start','answer','complete','abandon','heartbeat') then raise exception 'Invalid event';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_session::text,0));
 select * into s from public.plum_sessions where id=p_session for update;
 if not found then
  if p_kind not in ('visit','start','answer','complete') then raise exception 'Visit required';end if;
  perform public.plum_ingest(p_session,p_hash,p_visit_event,'visit',null,null,null,'plum-responses-v1');
  update public.plum_sessions set consent_version=p_consent where id=p_session;
  select * into s from public.plum_sessions where id=p_session;
 end if;
 if s.token_hash<>p_hash then raise exception 'Invalid session';end if;
 if s.consent_version<>p_consent then raise exception 'Consent version mismatch';end if;
 if p_kind='visit' then
  select id into receipt from public.plum_events where session_id=p_session and kind='visit' order by created_at,id limit 1;
  if receipt is null then raise exception 'Visit required';end if;
  return jsonb_build_object('event_id',receipt);
 end if;
 if s.started_at is null then
  if p_kind in ('abandon','heartbeat') then raise exception 'Start required';end if;
  perform public.plum_ingest(p_session,p_hash,p_start_event,'start',null,null,null,'plum-responses-v1');
  select * into s from public.plum_sessions where id=p_session;
 end if;
 if p_kind='start' then
  select id into receipt from public.plum_events where session_id=p_session and kind='start' order by created_at,id limit 1;
  if receipt is null then raise exception 'Start required';end if;
  return jsonb_build_object('event_id',receipt);
 end if;
 if p_kind='complete' and s.completed_at is not null then
  select coalesce(jsonb_object_agg(question_id,pole),'{}'::jsonb) into snapshot from public.plum_answers where session_id=p_session;
  if s.result_code is distinct from p_result or snapshot is distinct from p_answers then raise exception 'Already completed';end if;
  select id into receipt from public.plum_events where session_id=p_session and kind='complete' order by created_at,id limit 1;
  if receipt is null then raise exception 'Completion missing';end if;
  return jsonb_build_object('event_id',receipt);
 end if;
 perform public.plum_ingest(p_session,p_hash,p_event,p_kind,p_answers,p_question,p_result,'plum-responses-v1');
 return jsonb_build_object('event_id',p_event);
end $$;
revoke all on function public.plum_ingest_v3(uuid,text,uuid,text,jsonb,text,text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.plum_ingest_v3(uuid,text,uuid,text,jsonb,text,text,text,uuid,uuid) to service_role;

create or replace function public.plum_record_share(p_session uuid,p_hash text,p_event uuid) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.plum_sessions;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_session::text,0));
 select * into s from public.plum_sessions where id=p_session for update;
 if not found or s.token_hash<>p_hash then raise exception 'Invalid session';end if;
 if s.consent_version<>'plum-responses-v2' then raise exception 'Share consent required';end if;
 if s.completed_at is null then raise exception 'Completion required';end if;
 if exists(select 1 from public.plum_share_events where id=p_event and session_id=p_session) then return;end if;
 if (select count(*) from public.plum_share_events where session_id=p_session)>=100 then raise exception 'Share limit';end if;
 insert into public.plum_share_events(id,session_id) values(p_event,p_session);
end $$;
revoke all on function public.plum_record_share(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.plum_record_share(uuid,text,uuid) to service_role;

create or replace function public.plum_metrics_v3(p_from date,p_to date) returns jsonb
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare base jsonb; days jsonb; shares bigint;
begin
 base:=public.plum_metrics(p_from,p_to);
 select count(*) into shares from public.plum_share_events where (created_at at time zone 'Asia/Seoul')::date between p_from and p_to;
 select coalesce(jsonb_agg(d.value||jsonb_build_object('shares',(select count(*) from public.plum_share_events where (created_at at time zone 'Asia/Seoul')::date=(d.value->>'date')::date)) order by d.value->>'date'),'[]'::jsonb) into days from jsonb_array_elements(base->'daily') d;
 return base||jsonb_build_object('shares',shares,'daily',days);
end $$;
revoke all on function public.plum_metrics_v3(date,date) from public,anon,authenticated;
grant execute on function public.plum_metrics_v3(date,date) to service_role;
commit;
