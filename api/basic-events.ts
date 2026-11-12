import {json,body,enabled,sameOrigin,db,databaseFailure,type Request,type Response} from '../server/http.js'
export default async function handler(req:Request,res:Response){
 if(req.method!=='POST')return json(res,405,{errorCode:'METHOD_NOT_ALLOWED'})
 if(!sameOrigin(req))return json(res,403,{errorCode:'ORIGIN_REJECTED'})
 let kind:string
 try{const value=body(req);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!['visit','start','complete','share'].includes((value as {kind:string}).kind))throw Error();kind=(value as {kind:string}).kind}catch{return json(res,400,{errorCode:'INVALID_BASIC_EVENT'})}
 if(!enabled())return json(res,503,{errorCode:'COLLECTION_DISABLED'})
 try{
  const receipt=await db('/rest/v1/rpc/plum_increment_basic',{method:'POST',body:JSON.stringify({p_kind:kind})})
  if(receipt?.recorded!==true) return json(res,503,{errorCode:'BASIC_WRITE_UNCONFIRMED'})
  return json(res,200,{recorded:true})
 }catch(error){const problem=databaseFailure(error);console.warn(JSON.stringify({scope:'plum.basic',stage:kind,...problem}));return json(res,503,problem)}
}
