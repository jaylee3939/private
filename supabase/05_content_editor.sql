-- 기존 참여 테이블/계정/응답은 변경하지 않습니다. SQL Editor에서 전체 1회 실행.
begin;
create table if not exists public.plum_content (
 id boolean primary key default true check(id),
 content jsonb,
 revision integer not null default 0 check(revision>=0),
 updated_at timestamptz not null default now(),
 check(content is null or jsonb_typeof(content)='object')
);
alter table public.plum_content enable row level security;
revoke all on public.plum_content from public,anon,authenticated;
grant select,insert,update on public.plum_content to service_role;
insert into public.plum_content(id) values(true) on conflict(id) do nothing;
create or replace function public.plum_save_content(p_content jsonb,p_expected_revision integer) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare saved public.plum_content;
begin
 if p_content is null or jsonb_typeof(p_content)<>'object' or octet_length(p_content::text)>150000 then raise exception 'Invalid content';end if;
 update public.plum_content set content=p_content,revision=revision+1,updated_at=now() where id=true and revision=p_expected_revision returning * into saved;
 if not found then raise exception using errcode='40001',message='Content revision conflict';end if;
 return jsonb_build_object('content',saved.content,'revision',saved.revision);
end $$;
revoke all on function public.plum_save_content(jsonb,integer) from public,anon,authenticated;
grant execute on function public.plum_save_content(jsonb,integer) to service_role;
-- Dedicated public-read bucket. Uploads go through the authenticated PLUM server API.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('plum-editor-images','plum-editor-images',true,2097152,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
-- Restrictive policies prevent browser roles writing to this bucket even if a broad
-- permissive policy exists for other buckets. Service-role uploads bypass RLS.
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='plum_editor_no_browser_insert') then
  create policy plum_editor_no_browser_insert on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'plum-editor-images');
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='plum_editor_no_browser_update') then
  create policy plum_editor_no_browser_update on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'plum-editor-images') with check(bucket_id<>'plum-editor-images');
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='plum_editor_no_browser_delete') then
  create policy plum_editor_no_browser_delete on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'plum-editor-images');
 end if;
end $$;
commit;
