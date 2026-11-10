import {json,db,sameOrigin,DatabaseError,databaseFailure,type Request,type Response} from '../server/http.js'
import {authorizeAdmin} from '../server/admin-auth.js'
import {defaultContent,validateContent} from '../src/content.js'
export default async function handler(req:Request,res:Response){
 const edit=new URL(req.url||'/api/content','https://local.invalid').searchParams.get('edit')==='1'
 if(req.method!=='GET'&&req.method!=='PUT')return json(res,405,{errorCode:'METHOD_NOT_ALLOWED'})
 try{
  if(edit||req.method==='PUT'){if(!await authorizeAdmin(req,res))return}
  if(req.method==='GET'){
   try{
    const rows=await db('/rest/v1/plum_content?id=eq.true&select=content,revision')
    if(!Array.isArray(rows)||rows.length!==1)throw new DatabaseError(404)
    return json(res,200,{content:rows[0].content===null?defaultContent:validateContent(rows[0].content),revision:rows[0].revision})
   }catch(error){if(!edit)return json(res,200,{content:defaultContent,revision:0,fallback:true});throw error}
  }
  if(!sameOrigin(req))return json(res,403,{errorCode:'ORIGIN_REJECTED'})
  let input:any,content
  try{
   const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body??null);if(Buffer.byteLength(raw)>150000)throw Error()
   input=JSON.parse(raw);if(!Number.isInteger(input?.revision)||input.revision<0||input.revision>2147483646)throw Error()
   content=validateContent(input.content)
  }catch{return json(res,400,{errorCode:'INVALID_CONTENT'})}
  const saved=await db('/rest/v1/rpc/plum_save_content',{method:'POST',body:JSON.stringify({p_content:content,p_expected_revision:input.revision})})
  return json(res,200,{content:validateContent(saved.content),revision:saved.revision})
 }catch(error){
  if(error instanceof DatabaseError&&error.databaseCode==='40001')return json(res,409,{errorCode:'CONTENT_CONFLICT'})
  const problem=databaseFailure(error);return json(res,503,{...problem,errorCode:error instanceof DatabaseError&&error.status===404?'EDITOR_SETUP_REQUIRED':problem.errorCode})
 }
}
