-- Supabase에서 pg_cron을 활성화하고 하루 한 번 90일 초과 기록을 삭제합니다.
-- 이미 있는 다른 프로젝트의 Cron 작업은 변경하지 않습니다.
create extension if not exists pg_cron;
do $$ begin
 if not exists(select 1 from cron.job where jobname='plum-retention-90-days') then
  perform cron.schedule('plum-retention-90-days','0 18 * * *','select public.plum_purge_expired();');
 end if;
end $$;
select jobid,jobname,schedule,active from cron.job where jobname='plum-retention-90-days';
