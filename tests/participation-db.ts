import type {PGlite} from '@electric-sql/pglite'
// PostgREST transport substitute backed by actual local SQL, never a live project.
export function participationTransport(db:PGlite,userId:string):typeof fetch{return async(url,init)=>{
 const u=new URL(String(url)),path=u.pathname,p=typeof init?.body==='string'?JSON.parse(init.body):null
 if(path==='/rest/v1/rpc/plum_increment_basic')return new Response(JSON.stringify((await db.query<{r:unknown}>('select public.plum_increment_basic($1) r',[p.p_kind])).rows[0].r))
 if(path==='/rest/v1/plum_basic_daily')return new Response(JSON.stringify((await db.query('select day::text,visits::int,starts::int,completions::int,shares::int from public.plum_basic_daily where day>=$1::date and day<=$2::date order by day',[u.searchParams.getAll('day')[0].slice(4),u.searchParams.getAll('day')[1].slice(4)])).rows))
 if(path==='/auth/v1/user')return new Response(JSON.stringify({id:userId}))
 if(path==='/rest/v1/plum_admins')return new Response(JSON.stringify((await db.query('select user_id from public.plum_admins where user_id=$1::uuid',[userId])).rows))
 if(path==='/rest/v1/rpc/plum_metrics'||path==='/rest/v1/rpc/plum_metrics_v3')return new Response(JSON.stringify((await db.query<{m:unknown}>(`select public.${path.endsWith('_v3')?'plum_metrics_v3':'plum_metrics'}($1::date,$2::date) m`,[p.p_from,p.p_to])).rows[0].m))
 if(path==='/rest/v1/rpc/plum_ingest_v3'){try{const r=await db.query<{r:unknown}>('select public.plum_ingest_v3($1::uuid,$2,$3::uuid,$4,$5::jsonb,$6,$7,$8,$9::uuid,$10::uuid) r',[p.p_session,p.p_hash,p.p_event,p.p_kind,p.p_answers?JSON.stringify(p.p_answers):null,p.p_question,p.p_result,p.p_consent,p.p_visit_event,p.p_start_event]);return new Response(JSON.stringify(r.rows[0].r))}catch(e:any){return new Response(JSON.stringify({code:e.code,message:e.message}),{status:400})}}
 if(path==='/rest/v1/rpc/plum_record_share'){try{await db.query('select public.plum_record_share($1::uuid,$2,$3::uuid)',[p.p_session,p.p_hash,p.p_event]);return new Response(null,{status:204})}catch(e:any){return new Response(JSON.stringify({code:e.code,message:e.message}),{status:400})}}
 if(path==='/rest/v1/rpc/plum_ingest'){
  await db.query('select public.plum_ingest($1::uuid,$2,$3::uuid,$4,$5::jsonb,$6,$7,$8)',[p.p_session,p.p_hash,p.p_event,p.p_kind,p.p_answers?JSON.stringify(p.p_answers):null,p.p_question,p.p_result,p.p_consent]);return new Response(null,{status:204})
 }
 if(path==='/rest/v1/rpc/plum_withdraw'){await db.query('select public.plum_withdraw($1::uuid,$2)',[p.p_session,p.p_hash]);return new Response(null,{status:204})}
 if(path==='/rest/v1/plum_events'){
  if((init?.headers as Record<string,string>)?.Prefer==='count=exact'){
   const n=(await db.query<{n:number}>('select count(*)::int n from public.plum_events where session_id=$1::uuid and kind=$2',[u.searchParams.get('session_id')!.slice(3),u.searchParams.get('kind')!.slice(3)])).rows[0].n
   return new Response('[]',{headers:{'Content-Range':n?`0-0/${n}`:'*/0'}})
  }
  return new Response(JSON.stringify((await db.query('select id,kind from public.plum_events where id=$1::uuid and session_id=$2::uuid',[u.searchParams.get('id')!.slice(3),u.searchParams.get('session_id')!.slice(3)])).rows))
 }
 if(path==='/rest/v1/plum_answers')return new Response(JSON.stringify((await db.query('select question_id,pole from public.plum_answers where session_id=$1::uuid',[u.searchParams.get('session_id')!.slice(3)])).rows))
 if(path==='/rest/v1/plum_share_events'){
  if(u.searchParams.has('id'))return new Response(JSON.stringify((await db.query('select id from public.plum_share_events where id=$1::uuid and session_id=$2::uuid',[u.searchParams.get('id')!.slice(3),u.searchParams.get('session_id')!.slice(3)])).rows))
  if(u.searchParams.has('session_id')){const n=(await db.query<{n:number}>('select count(*)::int n from public.plum_share_events where session_id=$1::uuid',[u.searchParams.get('session_id')!.slice(3)])).rows[0].n;return new Response('[]',{headers:{'Content-Range':n?`0-0/${n}`:'*/0'}})}
  const [start,end]=u.searchParams.getAll('created_at').map(f=>f.slice(f.startsWith('gte.')?4:3))
  const n=(await db.query<{n:number}>('select count(*)::int n from public.plum_share_events where created_at>=$1::timestamptz and created_at<$2::timestamptz',[start,end])).rows[0].n
  return new Response('[]',{headers:{'Content-Range':n?`0-0/${n}`:'*/0'}})
 }
 if(path==='/rest/v1/plum_sessions'){
  const sid=u.searchParams.get('id')?.slice(3)
  if(u.searchParams.get('select')==='started_at,completed_at,result_code')return new Response(JSON.stringify((await db.query('select started_at,completed_at,result_code from public.plum_sessions where id=$1::uuid',[sid])).rows))
  if(u.searchParams.get('limit')==='10')return new Response(JSON.stringify((await db.query('select id,created_at,started_at,completed_at from public.plum_sessions order by created_at desc limit 10')).rows))
  if(u.searchParams.get('select')?.includes('token_hash'))return new Response(JSON.stringify((await db.query('select id,token_hash,started_at,completed_at,result_code from public.plum_sessions where id=$1::uuid',[sid])).rows))
  if(u.searchParams.get('select')?.includes('plum_events')){
   const sessions=(await db.query<any>('select id,token_hash,started_at,completed_at,result_code from public.plum_sessions where id=$1::uuid',[sid])).rows
   for(const s of sessions){s.plum_events=(await db.query('select id,kind from public.plum_events where session_id=$1::uuid and id=$2::uuid',[sid,u.searchParams.get('plum_events.id')!.slice(3)])).rows;s.plum_answers=(await db.query('select question_id,pole from public.plum_answers where session_id=$1::uuid',[sid])).rows}
   return new Response(JSON.stringify(sessions))
  }
  if(u.searchParams.get('order'))return new Response(JSON.stringify((await db.query('select created_at from public.plum_sessions order by created_at desc limit 1')).rows))
  const where:string[]=[],args:unknown[]=[]
  if(sid){args.push(sid);where.push(`id=$${args.length}::uuid`)}
  for(const column of ['created_at','started_at'])for(const filter of u.searchParams.getAll(column)){
   if(filter==='not.is.null'){where.push(`${column} is not null`);continue}
   const op=filter.slice(0,3),value=filter.slice(op==='gte'?4:3);if(op!=='gte'&&!filter.startsWith('lt.'))throw Error('Unexpected date filter')
   args.push(value);where.push(`${column}${op==='gte'?'>=':'<'}$${args.length}::timestamptz`)
  }
  if(u.searchParams.get('completed_at')==='not.is.null')where.push('completed_at is not null')
  const clause=where.length?' where '+where.join(' and '):''
  const rows=(await db.query(`select id from public.plum_sessions${clause} limit 1`,args)).rows
  if((init?.headers as Record<string,string>)?.Prefer==='count=exact'){
   const n=(await db.query<{n:number}>(`select count(*)::int n from public.plum_sessions${clause}`,args)).rows[0].n
   return new Response(JSON.stringify(rows),{headers:{'Content-Range':n?`0-0/${n}`:'*/0'}})
  }
  return new Response(JSON.stringify(rows))
 }
 throw Error('Unexpected synthetic participation endpoint')
}}
