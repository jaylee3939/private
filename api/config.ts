import {PARTICIPATION_FLOW} from '../src/participation-protocol.js'
import {projectHint} from '../server/participation-status.js'
import {json,publicConfig,enabled,env,configurationChecks,COLLECTION_RELEASE_READY,type Request,type Response} from '../server/http.js'
import {CONSENT_VERSION} from '../server/events.js'
export default function handler(req:Request,res:Response){
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'})
 const c=publicConfig()
 const safe={flowVersion:PARTICIPATION_FLOW,deploymentCommit:/^[a-f0-9]{40}$/i.test(env('VERCEL_GIT_COMMIT_SHA'))?env('VERCEL_GIT_COMMIT_SHA').slice(0,7):'unknown',projectHint:projectHint(),configVersion:'plum-config-2',checks:configurationChecks(),authReady:Boolean(c.url&&c.key),collectionEnabled:enabled(),collectionLocked:!COLLECTION_RELEASE_READY}
 // Safe to share: known variable names and status only, never key values or contact details.
 if(new URL(req.url||'/api/config','https://local.invalid').searchParams.get('diagnostics')==='1')return json(res,200,safe)
 return json(res,200,{...safe,consentVersion:CONSENT_VERSION,retentionDays:90,privacyContact:env('PRIVACY_CONTACT'),auth:c.url&&c.key?{url:c.url,key:c.key}:null})
}
