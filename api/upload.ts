import {randomUUID} from 'node:crypto'
import {json,db,sameOrigin,publicConfig,databaseFailure,type Request,type Response} from '../server/http.js'
import {authorizeAdmin} from '../server/admin-auth.js'
export const IMAGE_BUCKET='plum-editor-images'
export default async function handler(req:Request,res:Response){
 if(req.method!=='POST')return json(res,405,{errorCode:'METHOD_NOT_ALLOWED'})
 try{
  if(!await authorizeAdmin(req,res))return
  if(!sameOrigin(req))return json(res,403,{errorCode:'ORIGIN_REJECTED'})
  let bytes:Buffer,mime:string,extension:string
  try{
   const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body??null);if(Buffer.byteLength(raw)>2900000)throw Error()
   const input=JSON.parse(raw);if(typeof input.data!=='string'||!input.data||input.data.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(input.data))throw Error()
   bytes=Buffer.from(input.data,'base64');if(bytes.toString('base64')!==input.data)throw Error();if(bytes.length<12||bytes.length>2*1024*1024)throw Error()
   if(input.mime==='image/png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){mime='image/png';extension='png'}
   else if(input.mime==='image/jpeg'&&bytes.subarray(0,3).equals(Buffer.from([255,216,255]))){mime='image/jpeg';extension='jpg'}
   else if(input.mime==='image/webp'&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){mime='image/webp';extension='webp'}
   else throw Error()
  }catch{return json(res,400,{errorCode:'INVALID_IMAGE'})}
  const filename=`${randomUUID()}.${extension}`
  await db(`/storage/v1/object/${IMAGE_BUCKET}/${filename}`,{method:'POST',headers:{'Content-Type':mime,'x-upsert':'false'},body:Uint8Array.from(bytes)})
  return json(res,200,{url:`${publicConfig().url}/storage/v1/object/public/${IMAGE_BUCKET}/${filename}`})
 }catch(error){return json(res,503,databaseFailure(error))}
}
