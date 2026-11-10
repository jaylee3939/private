import {PGlite} from '@electric-sql/pglite'
import {readFile} from 'node:fs/promises'
export const editorAdminId='11111111-1111-4111-8111-111111111111'
export const editorOrigin='http://127.0.0.1:5173'
export async function initializeEditorDB(db:PGlite){
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id));alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated,service_role;grant all on storage.objects,storage.buckets to service_role;grant select,insert,update,delete on storage.objects to anon,authenticated;
 create policy existing_broad_policy on storage.objects for all to anon,authenticated using(true) with check(true);`)
 await db.exec(await readFile(new URL('../supabase/01_setup.sql',import.meta.url),'utf8'))
 await db.query('insert into auth.users(id,email) values($1::uuid,$2)',[editorAdminId,'editor@example.com'])
 await db.query('insert into public.plum_admins(user_id) values($1::uuid)',[editorAdminId])
 await db.exec(await readFile(new URL('../supabase/05_content_editor.sql',import.meta.url),'utf8'))
}
export function editorEnvironment(){Object.assign(process.env,{SUPABASE_URL:'https://editor-test.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_synthetic',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_synthetic',SITE_ORIGIN:editorOrigin})}
export function editorTransport(db:PGlite,images:Map<string,Uint8Array>=new Map()):typeof fetch{return async(url,init)=>{
 const u=new URL(String(url));const p=typeof init?.body==='string'?JSON.parse(init.body):null
 if(u.pathname==='/auth/v1/user')return new Response(JSON.stringify({id:(init?.headers as Record<string,string>)?.Authorization==='Bearer nonadmin'?'22222222-2222-4222-8222-222222222222':editorAdminId}))
 if(u.pathname==='/rest/v1/plum_admins')return new Response(JSON.stringify((await db.query('select user_id from public.plum_admins where user_id=$1::uuid',[u.searchParams.get('user_id')!.slice(3)])).rows))
 if(u.pathname==='/rest/v1/plum_content')return new Response(JSON.stringify((await db.query('select content,revision from public.plum_content where id=true')).rows))
 if(u.pathname==='/rest/v1/rpc/plum_save_content'){
  try{const r=await db.query<{d:unknown}>('select public.plum_save_content($1::jsonb,$2::int) d',[JSON.stringify(p.p_content),p.p_expected_revision]);return new Response(JSON.stringify(r.rows[0].d))}
  catch(e:any){return new Response(JSON.stringify({code:e.code}),{status:400})}
 }
 if(u.pathname.startsWith('/storage/v1/object/plum-editor-images/')){images.set(u.pathname.split('/').pop()!,Uint8Array.from(init!.body as Uint8Array));return new Response(JSON.stringify({Key:u.pathname}))}
 throw Error('Unexpected synthetic endpoint')
}}
