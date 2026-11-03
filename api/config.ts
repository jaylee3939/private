import {json,publicConfig,enabled,env,type Request,type Response} from '../server/http.ts'
import {CONSENT_VERSION} from '../server/events.ts'
export default function handler(req:Request,res:Response){if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});const c=publicConfig();json(res,200,{collectionEnabled:enabled(),consentVersion:CONSENT_VERSION,retentionDays:90,privacyContact:env('PRIVACY_CONTACT'),auth:c.url&&c.key?{url:c.url,key:c.key}:null})}
