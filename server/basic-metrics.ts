import {db,DatabaseError} from './http.js'
export type BasicDay={day:string;visits:number;starts:number;completions:number;shares:number}
export async function basicMetrics(from:string,to:string){
 try{
  const daily=await db(`/rest/v1/plum_basic_daily?select=day,visits,starts,completions,shares&day=gte.${from}&day=lte.${to}&order=day.asc`)
  const keys=['visits','starts','completions','shares'] as const
  if(!Array.isArray(daily)||daily.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d?.day)||keys.some(k=>!Number.isSafeInteger(d[k])||d[k]<0)))throw new DatabaseError(502,'BASIC_METRICS_INVALID')
  const counts={visits:0,starts:0,completions:0,shares:0}
  for(const day of daily as BasicDay[])for(const key of keys)counts[key]+=day[key]
  return {ready:true as const,...counts,daily:daily as BasicDay[],verification:'daily-table-v1'}
 }catch(error){if(error instanceof DatabaseError&&error.status===404)return {ready:false as const,errorCode:'BASIC_SETUP_REQUIRED'};throw error}
}
