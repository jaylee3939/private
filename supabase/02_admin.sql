-- 먼저 Supabase Authentication > Users에서 관리자 계정을 직접 생성하세요.
-- 아래 이메일만 본인의 실제 관리자 이메일로 바꾸고 실행합니다. 비밀번호를 SQL에 넣지 마세요.
do $$
declare admin_email text := 'CHANGE_ME@example.com'; target uuid;
begin
 if admin_email='CHANGE_ME@example.com' then raise exception '이메일을 실제 관리자 이메일로 바꿔 주세요'; end if;
 select id into target from auth.users where lower(email)=lower(admin_email);
 if target is null then raise exception 'Authentication > Users에서 먼저 사용자를 만들어 주세요'; end if;
 insert into public.plum_admins(user_id) values(target) on conflict(user_id) do nothing;
end $$;
