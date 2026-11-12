export const PARTICIPATION_CONSENT='plum-responses-v3' as const
export type ParticipationConsent='plum-responses-v1'|'plum-responses-v2'|typeof PARTICIPATION_CONSENT
export const PARTICIPATION_FLOW='plum-flow-4' as const
export type ParticipationSnapshot={verified:true;started:boolean;completed:boolean;answerCount:number;supplementaryCount:number;startEvents:number;completeEvents:number;shares:number|null;resultRecorded:boolean;flowVersion:string;projectHint:string}
export type FlowFailure={stage:string;code:string;status?:number;requestId?:string;databaseCode?:string}
export type ParticipationTrace={queued:Record<string,number>;sent:Record<string,number>;confirmed:Record<string,number>;failures:FlowFailure[];snapshot?:ParticipationSnapshot;snapshotError?:FlowFailure;serverFlowVersion?:string}
export function emptyParticipationTrace():ParticipationTrace{return {queued:{},sent:{},confirmed:{},failures:[]}}
