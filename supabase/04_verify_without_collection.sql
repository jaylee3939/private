-- 공개 수집은 계속 false로 유지합니다. SQL Editor에서 실행하세요.
-- 아래 행은 사람이 아닌 합성 검증 데이터입니다. 전체 작업은 마지막에 롤백됩니다.
-- 기존 테이블/함수/계정/응답을 교체하거나 삭제하지 않습니다.
begin;
set local role service_role;
do $$
declare
 sid uuid; ids uuid[]:='{}'; code text; a jsonb; m jsonb;
 h text:=repeat('a',64); today date:=(now() at time zone 'Asia/Seoul')::date;
begin
 foreach code in array array['BTP','BTR','BMP','BMR','STP','STR','SMP','SMR'] loop
  sid:=gen_random_uuid();ids:=array_append(ids,sid);
  select jsonb_object_agg(q, p) into a from (
   select 'bs'||i q,substr(code,1,1) p from generate_series(1,6) i
   union all select 'tm'||i,substr(code,2,1) from generate_series(1,6) i
   union all select 'pr'||i,substr(code,3,1) from generate_series(1,6) i
  ) options;
  perform public.plum_ingest(sid,h,gen_random_uuid(),'visit',null,null,null,'plum-responses-v1');
  perform public.plum_ingest(sid,h,gen_random_uuid(),'start',null,null,null,'plum-responses-v1');
  perform public.plum_ingest(sid,h,gen_random_uuid(),'answer',a,'bs1',null,'plum-responses-v1');
  perform public.plum_ingest(sid,h,gen_random_uuid(),'complete',a,null,code,'plum-responses-v1');
  if (select count(*) from public.plum_answers where session_id=sid)<>18 then raise exception '18 answers not stored';end if;
  if not exists(select 1 from public.plum_sessions where id=sid and completed_at is not null and result_code=code) then raise exception 'Result not stored';end if;
 end loop;
 m:=public.plum_metrics(today,today);
 if (m->>'starts')::int<8 or (m->>'completions')::int<8 or jsonb_array_length(m->'results')<>8 or jsonb_array_length(m->'answers')<36 then raise exception 'Statistics verification failed';end if;
 if (select count(*) from public.plum_sessions where id=any(ids))<>8 then raise exception 'Sessions missing';end if;
 if exists(select 1 from unnest(array['anon','authenticated']) r cross join unnest(array['plum_sessions','plum_answers','plum_events','plum_admins']) t where has_table_privilege(r,'public.'||t,'SELECT')) then raise exception 'Browser role can read raw data';end if;
 if has_function_privilege('anon','public.plum_metrics(date,date)','EXECUTE') or has_function_privilege('authenticated','public.plum_metrics(date,date)','EXECUTE') then raise exception 'Browser role can query metrics';end if;
 foreach sid in array ids loop
  perform public.plum_withdraw(sid,h);
 end loop;
 if exists(select 1 from public.plum_sessions where id=any(ids)) or exists(select 1 from public.plum_answers where session_id=any(ids)) or exists(select 1 from public.plum_events where session_id=any(ids)) then raise exception 'Withdrawal did not cascade';end if;
end $$;
select 'PASS: 8 results, 18 answers each, metrics, raw-data isolation, withdrawal. Synthetic changes will be rolled back.' as verification;
rollback;
-- 오류가 발생하면 에디터에서 ROLLBACK;을 실행하세요. 성공할 때만 PASS가 표시됩니다.
