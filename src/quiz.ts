export type Axis = "BS" | "TM" | "PR"
export type Pole = "B" | "S" | "T" | "M" | "P" | "R"
export type ResultCode = `${"B"|"S"}${"T"|"M"}${"P"|"R"}`
export type LegacyCode = "ESP"|"ESR"|"EMP"|"EMR"|"CSP"|"CSR"|"CMP"|"CMR"
export const legacyCodes:Record<LegacyCode,ResultCode>={ESP:"BTP",ESR:"BTR",EMP:"BMP",EMR:"BMR",CSP:"STP",CSR:"STR",CMP:"SMP",CMR:"SMR"}
export const axes:Axis[]=["BS","TM","PR"]
export const axisTopics:Record<Axis,string>={BS:"탐색 스타일",TM:"설렘 스타일",PR:"즐기는 방식"}
export const codeMeanings:Record<Pole,{english:string;meaning:string}>={B:{english:"Bold",meaning:"대담한 탐색"},S:{english:"Slow",meaning:"신중한 탐색"},T:{english:"Touch",meaning:"감각 중심"},M:{english:"Mood",meaning:"분위기 중심"},P:{english:"Play",meaning:"즉흥적인 재미"},R:{english:"Ritual",meaning:"나만의 리듬"}}
export type Question = {id:string;axis:Axis;prompt:string;options:readonly [{text:string;pole:Pole},{text:string;pole:Pole}]}
const q=(id:string,axis:Axis,prompt:string,a:string,b:string):Question=>({id,axis,prompt,options:[{text:a,pole:axis[0] as Pole},{text:b,pole:axis[1] as Pole}]})
export const questions:Question[]=[
 q("bs1","BS","새로운 즐거움이 궁금해졌을 때 나는?","호기심이 생기면 가볍게 알아보고 시도한다","충분히 알아보고 편안할 때 시작한다"),
 q("bs2","BS","눈길을 끄는 토이를 발견했다면?","처음 보는 기능이 가장 궁금하다","사용법과 후기를 먼저 살펴본다"),
 q("bs3","BS","나도 몰랐던 취향을 발견하는 순간은?","평소와 다른 경험을 해봤을 때","익숙한 경험에서 새로운 매력을 찾았을 때"),
 q("bs4","BS","새로운 제안을 받았을 때 나는?","끌린다면 열린 마음으로 이야기한다","내 마음과 경계를 확인하고 결정한다"),
 q("bs5","BS","취향을 알아가는 나의 스타일은?","다양한 가능성을 먼저 탐색하는 편","하나씩 충분히 이해하며 알아가는 편"),
 q("bs6","BS","새로운 경험을 앞둔 나의 첫 반응은?","어떤 재미가 있을지 기대된다","나에게 잘 맞을지 먼저 궁금하다"),
 q("tm1","TM","설레는 순간 나를 더 끌리게 하는 건?","피부에 닿는 감각과 촉감","눈빛과 음악이 만드는 분위기"),
 q("tm2","TM","토이를 고를 때 먼저 눈길이 가는 건?","촉감과 강도 조절 같은 사용감","디자인과 전체적인 분위기"),
 q("tm3","TM","특별한 순간을 떠올리면 먼저 기억나는 건?","몸으로 느꼈던 기분 좋은 감각","그날의 감정과 분위기"),
 q("tm4","TM","나만의 시간을 준비한다면?","편안한 촉감과 내가 좋아하는 감각부터","조명, 영상, 음악으로 분위기부터"),
 q("tm5","TM","설렘이 시작되는 순간은?","가벼운 스킨십이나 감각적인 자극이 느껴질 때","눈빛이나 말 한마디에 상상이 시작될 때"),
 q("tm6","TM","나를 더 오래 설레게 하는 건?","몸으로 기억하는 기분 좋은 감각","자꾸 떠오르는 장면과 그때의 감정"),
 q("pr1","PR","기분 좋은 시간을 특별하게 만드는 건?","예상 못 한 작은 장난과 변화","내가 좋아하는 익숙한 흐름"),
 q("pr2","PR","토이를 사용한다면 더 끌리는 건?","여러 기능을 바꿔 보며 탐색하기","마음에 드는 설정을 찾아 즐기기"),
 q("pr3","PR","혼자 또는 함께하는 시간에 나는?","그날의 기분에 따라 즉흥적으로","편안한 속도와 나만의 리듬으로"),
 q("pr4","PR","내 취향을 한마디로 표현하면?","오늘은 또 어떤 재미가 있을까?","내가 좋아하는 건 확실히 알지!"),
 q("pr5","PR","마음에 드는 경험을 발견했다면?","다른 방식으로도 즐겨보고 싶다","그 느낌을 다시 경험하고 싶다"),
 q("pr6","PR","계획에 없던 즐거운 순간이 생긴다면?","흐름에 맡기고 새롭게 즐긴다","내가 편안한 방식으로 즐긴다"),
]
export const supplements:Record<Axis,Question>={
BS:q("tieBS","BS","낯선 즐거움 앞에서 나는?","궁금하면 도전","천천히 알아보기"),
TM:q("tieTM","TM","나를 더 설레게 하는 건?","직접 느끼는 감각","감정과 분위기"),
PR:q("tiePR","PR","오늘의 즐거움을 고른다면?","즉흥적인 변화","익숙한 리듬"),
}
export type Answers=Record<string,Pole>
export function tiedAxes(answers:Answers):Axis[]{return axes.filter(axis=>{const qs=questions.filter(q=>q.axis===axis);return qs.every(q=>q.options.some(o=>o.pole===answers[q.id]))&&qs.filter(q=>answers[q.id]===axis[0]).length===qs.length/2})}
export function resolveResult(answers:Answers):ResultCode|null{
 if(questions.some(q=>!q.options.some(o=>o.pole===answers[q.id])))return null
 let code=""
 for(const axis of axes){const qs=questions.filter(q=>q.axis===axis);const first=qs.filter(q=>answers[q.id]===axis[0]).length
 if(first===qs.length/2){const tie=answers[supplements[axis].id];if(!supplements[axis].options.some(o=>o.pole===tie))return null;code+=tie}else code+=first>qs.length/2?axis[0]:axis[1]
 }return code as ResultCode
}
export function displayedOptions(question:Question,flipped:boolean){return flipped?[...question.options].reverse():[...question.options]}
export type Result={name:string;emoji:string;title:string;description:string;keywords:string[]}
export const results:Record<ResultCode,Result>={
BTP:{"name": "짜릿한 탐험가", "emoji": "🔥", "title": "야한 호기심은 못 참지", "description": "새로운 기능에는 눈이 반짝, 마음에 드는 감각에는 집중 모드. 익숙한 공식보다 오늘의 호기심을 따라가는 편이에요. 혼자든 함께든, 끌리는 재미는 내 경계 안에서 가볍게 탐색해요.", "keywords": ["대담한호기심", "감각탐색", "즉흥모드"]},
BTR:{"name": "감각 컬렉터", "emoji": "💎", "title": "취향에도 디테일이 있거든", "description": "새로움은 좋아하지만 아무 느낌이나 수집하진 않아요. 촉감, 강도, 편안한 리듬까지 내 기준으로 꼼꼼히 고르는 편. 마음에 드는 감각을 발견하면 나만의 설정으로 오래 즐겨요.", "keywords": ["감각디테일", "취향수집", "나만의설정"]},
BMP:{"name": "무드왕 플러터", "emoji": "💋", "title": "분위기 잡는 건 내가 1등", "description": "조명 하나, 말 한마디에도 오늘의 시나리오가 바뀌어요. 새로운 무드에 열려 있고 즉흥적인 변화도 반가운 편. 혼자 상상에 빠져도, 파트너와 장난을 나눠도 분위기는 내가 고른 템포로.", "keywords": ["무드메이커", "상상스위치", "즉흥플러팅"]},
BMR:{"name": "로맨틱 디렉터", "emoji": "🌹", "title": "설렘도 내 방식대로", "description": "새로운 장면을 상상하되 연출에는 나만의 기준이 있어요. 좋아하는 음악과 조명, 편안한 순서까지 챙기는 편. 낯선 설렘도 내 리듬에 들어오면 제법 오래 머물러요.", "keywords": ["설렘연출", "무드디테일", "취향루틴"]},
STP:{"name": "반전 플레이어", "emoji": "⚡", "title": "얌전한 줄 알았지?", "description": "처음엔 내 마음과 경계부터 확인해요. 하지만 편안해지면 작은 장난과 새로운 감각에 반전 스위치가 켜지는 편. 서두르지 않는 시작과 즉흥적인 재미는 충분히 함께할 수 있죠.", "keywords": ["편안한시작", "반전스위치", "감각플레이"]},
STR:{"name": "소프트 러버", "emoji": "🫧", "title": "순한 맛이라고 아다는 아님", "description": "천천히 시작해도 좋아하는 느낌은 꽤 분명한 편이에요. 몸이 편안한 촉감과 익숙한 리듬을 소중히 챙겨요. 강한 변화보다 나에게 딱 맞는 설정, 부드럽지만 확실한 취향을 즐겨요.", "keywords": ["부드러운확신", "편안한감각", "익숙한리듬"]},
SMP:{"name": "시크릿 플레이어", "emoji": "🍷", "title": "내 비밀 취향은 나만 알지", "description": "취향을 아무 데서나 공개하진 않지만 상상력까지 조용한 건 아니에요. 안심되는 공간과 분위기가 갖춰지면 그날의 기분대로 변화를 즐기는 편. 나만 알던 장면을 꺼낼 타이밍도 내가 정해요.", "keywords": ["비밀무드", "상상플레이", "나의타이밍"]},
SMR:{"name": "슬로우 로맨티스트", "emoji": "🌙", "title": "천천히 빠져드는 스타일", "description": "급하게 불붙이기보다 편안한 분위기 안에서 마음이 움직이는 편이에요. 좋아하는 음악, 익숙한 공간, 나만의 순서가 설렘의 시작점. 혼자든 함께든 내 속도를 존중하는 순간이 오래 기억에 남아요.", "keywords": ["느린설렘", "편안한무드", "나만의속도"]},
}
export function parseSharedCode(value:string|null):{code:ResultCode;legacy:boolean}|null{
 if(!value)return null
 if(Object.hasOwn(legacyCodes,value))return {code:legacyCodes[value as LegacyCode],legacy:true}
 return Object.hasOwn(results,value)?{code:value as ResultCode,legacy:false}:null
}
// Text overrides never replace IDs, axes or scoring poles.
export type QuestionCopy = {prompt?:string;optionA?:string;optionB?:string}
export function questionWithCopy(question:Question,copy?:QuestionCopy):Question {
 const text=(value:string|undefined,fallback:string)=>value?.trim()?value:fallback
 return {...question,prompt:text(copy?.prompt,question.prompt),options:[
  {...question.options[0],text:text(copy?.optionA,question.options[0].text)},
  {...question.options[1],text:text(copy?.optionB,question.options[1].text)}
 ]}
}
export function shuffledQuestionIds(ids:readonly string[],random:()=>number=Math.random):string[]{
 const order=[...ids];for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}return order
}
