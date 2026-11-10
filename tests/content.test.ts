import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {PGlite} from '@electric-sql/pglite'
import {defaultContent,validateContent,contentProps} from '../src/content.ts'
import {questions,results,questionWithCopy,resolveResult} from '../src/quiz.ts'
import content from '../api/content.ts'
import upload from '../api/upload.ts'
import {initializeEditorDB,editorEnvironment,editorTransport,editorOrigin} from './editor-db.ts'
function response(){let status=0,value:any;return {res:{set statusCode(n:number){status=n},setHeader(){},end(s:string){value=JSON.parse(s)}} as any,get:()=>({status,value})}}
test('editable schema preserves original defaults, scores, keys and share-code mapping',()=>{
 assert.equal(validateContent(defaultContent).schemaVersion,1)
 for(const q of questions){const edited=questionWithCopy(q,{prompt:'수정 질문',optionA:'수정 A',optionB:'수정 B'});assert.deepEqual(edited.options.map(o=>o.pole),q.options.map(o=>o.pole));assert.equal(defaultContent.questions[q.id].prompt,q.prompt)}
 for(const code of Object.keys(results)){assert.equal(defaultContent.results[code as keyof typeof results].name,results[code as keyof typeof results].name)}
 for(const mutation of [(d:any)=>d.questions.bs1.pole='S',(d:any)=>d.results.BMR.score='BTP',(d:any)=>delete d.questions.pr6,(d:any)=>d.colors.ink='red',(d:any)=>d.results.BMR.image='javascript:alert(1)',(d:any)=>d.results.BMR.keywords=['only-one']]){const d=structuredClone(defaultContent);mutation(d);assert.throws(()=>validateContent(d))}
 const d=structuredClone(defaultContent);d.questions.bs1.prompt='편집 질문';d.results.BMR.displayCode='MY BMR';assert.equal(contentProps(d).resultCopy.BMR.displayCode,'MY BMR');assert.equal(resolveResult(Object.fromEntries(questions.map(q=>[q.id,q.options[q.axis==='BS'?0:1].pole]))),'BMR')
})
test('content API persists edits, enforces admins, conflicts, safe uploads and browser-role isolation without deleting participants',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'plum-editor-'));let db=new PGlite(dir)
 const before={...process.env},oldFetch=globalThis.fetch,images=new Map<string,Uint8Array>()
 const headers={authorization:'Bearer editor',origin:editorOrigin}
 const req=(method:string,body?:unknown,h:Record<string,string>=headers)=>({method,url:'/api/content'+(method==='GET'?'?edit=1':''),headers:h,body}) as any
 try{
  await initializeEditorDB(db);editorEnvironment();globalThis.fetch=editorTransport(db,images)
  await db.exec("insert into public.plum_sessions(id,token_hash,consent_version) values('33333333-3333-4333-8333-333333333333',repeat('c',64),'plum-responses-v1')")
  await db.exec('set role service_role')
  let r=response();await content(req('GET',undefined,{}),r.res);assert.equal(r.get().status,401)
  r=response();await upload(req('POST',{},{}),r.res);assert.equal(r.get().status,401)
  r=response();await content(req('PUT',{}, {...headers,authorization:'Bearer nonadmin'}),r.res);assert.equal(r.get().status,403)
  r=response();await upload(req('POST',{}, {...headers,authorization:'Bearer nonadmin'}),r.res);assert.equal(r.get().status,403)
  r=response();await content(req('GET'),r.res);assert.equal(r.get().value.revision,0);assert.equal(r.get().value.content.general.introTitle,defaultContent.general.introTitle)
  const d=structuredClone(defaultContent);d.general.introTitle='저장된 인트로';d.questions.bs1.prompt='저장된 질문';d.results.BMR.name='저장된 결과'
  r=response();await content(req('PUT',{revision:0,content:d},{...headers,origin:'https://other.example'}),r.res);assert.equal(r.get().status,403)
  const invalid=structuredClone(d) as any;invalid.questions.bs1.pole='S';r=response();await content(req('PUT',{revision:0,content:invalid}),r.res);assert.equal(r.get().status,400)
  r=response();await content(req('PUT',{revision:0,content:d}),r.res);assert.equal(r.get().status,200);assert.equal(r.get().value.revision,1)
  r=response();await content(req('PUT',{revision:0,content:d}),r.res);assert.equal(r.get().status,409)
  r=response();await content({method:'GET',url:'/api/content',headers:{}} as any,r.res);assert.equal(r.get().value.content.general.introTitle,'저장된 인트로')
  r=response();await upload(req('POST',{mime:'image/png',data:Buffer.from('<svg><script>bad</script></svg>').toString('base64')}),r.res);assert.equal(r.get().status,400);assert.equal(images.size,0)
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII='
  r=response();await upload(req('POST',{mime:'image/png',data:png}),r.res);assert.equal(r.get().status,200);assert.match(r.get().value.url,/storage\/v1\/object\/public\/plum-editor-images\/.*\.png$/);assert.equal(images.size,1)
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`)
   await assert.rejects(db.query('select * from public.plum_content'),(e:any)=>e.code==='42501')
   await assert.rejects(db.query("select public.plum_save_content('{}',1)"),(e:any)=>e.code==='42501')
   await assert.rejects(db.query("insert into storage.objects(bucket_id) values('plum-editor-images')"),(e:any)=>e.code==='42501')
   await db.exec('reset role')
  }
  await db.close();db=new PGlite(dir)
  assert.equal((await db.query<{content:any}>('select content from public.plum_content')).rows[0].content.general.introTitle,'저장된 인트로')
  assert.equal((await db.query<{n:number}>('select count(*)::int n from public.plum_sessions')).rows[0].n,1)
 }finally{globalThis.fetch=oldFetch;for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before);await db.close();await rm(dir,{recursive:true,force:true})}
})
