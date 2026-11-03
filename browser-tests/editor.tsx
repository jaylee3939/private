// Test-only integration fixture, never imported by the production entry point.
import * as React from 'react'
import {createRoot} from 'react-dom/client'
import PlumType from '../src/PlumType'
import {questions,results} from '../src/quiz'
createRoot(document.getElementById('root')!).render(<PlumType randomizeQuestions
 headlineLayer={<div style={{fontSize:'clamp(48px,8vw,100px)',fontWeight:900,lineHeight:1}}>MY PACE.<br/>MY PLUM.</div>}
 introTitleLayer={<div>캔버스 소개 제목</div>}
 introDescriptionLayer={<div>캔버스에서 관리하는 소개 문구</div>}
 questionCopy={Object.fromEntries(questions.map(q=>[q.id,{prompt:`편집 질문 ${q.id}`,optionA:`편집 선택 ${q.id} 첫 번째`,optionB:`편집 선택 ${q.id} 두 번째`}]))}
 resultCopy={Object.fromEntries(Object.keys(results).map(code=>[code,{name:`편집 결과 ${code}`,description:'속성 패널에서 바꾼 성향 설명',keywords:['편집태그1','편집태그2','편집태그3']}]))}
/>)
