// No network calls in prototype. Never persist answers, result codes, or email locally.
export type Research = { interests:string[]; barrier:string; price:string }
export type Submission = { research?:Research; researchConsent:boolean; email?:string; marketingConsent:boolean; consentVersion:"prototype-1"; adultConfirmed:true }
export interface QuizAPI { submit(payload:Submission):Promise<{mode:"mock"; stored:false}> }
export const mockAPI:QuizAPI = { async submit(payload) {
 if(!payload.adultConfirmed) throw new Error("Adult confirmation required")
 if(payload.research && !payload.researchConsent) throw new Error("Research consent required")
 if(payload.email && !payload.marketingConsent) throw new Error("Marketing consent required")
 if(payload.marketingConsent && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email??"")) throw new Error("Valid email required")
 return {mode:"mock",stored:false}
}}
export type SafeEvent = "quiz_start"|"quiz_complete"|"quiz_restart"|"share_click"|"card_download"
// Deliberately no payload argument: never send answers, type, interests, email, or consent.
export function analytics(event:SafeEvent,enabled:boolean) {
 if(!enabled) return
 const w=window as unknown as {gtag?:(command:string,event:string,params:Record<string,string>)=>void}
 try { w.gtag?.("event",event,{event_category:"plum_quiz",page_location:window.location.origin,page_referrer:"",page_title:"PLUM TYPE"}) } catch { /* analytics must not interrupt quiz */ }
}

// Framer-facing runtime entry: types are erased, only real JavaScript values cross this boundary.
const plumAPI = { mockAPI, analytics }
export default plumAPI
