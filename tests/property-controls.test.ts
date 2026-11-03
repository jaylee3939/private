import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as React from 'react'
import {questions,supplements,results,legacyCodes} from '../src/quiz.ts'

// Registration/forwarding contract harness; not the proprietary Framer canvas runtime.
function load(){
 let registered:any
 const ControlType=Object.fromEntries(['Enum','String','Boolean','Object','Image','Color','ComponentInstance'].map(k=>[k,k]))
 const source=fs.readFileSync(new URL('../framer/PlumFramer.tsx',import.meta.url),'utf8')
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText
 const module={exports:{} as any}
 const fakeCore=()=>null
 vm.runInNewContext(code,{module,exports:module.exports,require:(name:string)=>{
  if(name==='react')return React
  if(name==='framer')return {ControlType,addPropertyControls:(component:any,controls:any)=>{assert.equal(registered,undefined);registered={component,controls}}}
  if(name==='./quiz.ts')return {questions,supplements,results,legacyCodes}
  if(name==='./PlumType.tsx')return {__esModule:true,default:fakeCore}
  throw new Error('Unexpected runtime import: '+name)
 }})
 return {component:module.exports.default,registered}
}
test('controls register on default export; editor menu is always visible',()=>{
 const {component,registered}=load()
 assert.equal(registered.component,component)
 assert.equal(registered.controls.editorSection.title,'편집할 항목')
 assert.equal(registered.controls.editorSection.hidden,undefined)
 const sections=registered.controls.editorSection.options
 for(const section of sections){
  const visible=Object.values(registered.controls).filter((c:any)=>!c.hidden?.({editorSection:section}))
  assert.ok(visible.length>1)
 }
 assert.equal(registered.controls.headlineLine1.hidden({}),false)
})
test('all questions, tie questions, results, images and colors have supported controls',()=>{
 const {registered:{controls}}=load()
 for(let i=1;i<=18;i++){
  const q=controls[`v2Question${String(i).padStart(2,'0')}`]
  assert.equal(q.type,'Object');assert.equal(q.hidden({editorSection:'questions'}),false)
  assert.deepEqual(Object.keys(q.controls),['prompt','optionA','optionB'])
 }
 for(const axis of ['BS','TM','PR'])assert.ok(controls[`v2Tie${axis}`])
 for(const code of Object.keys(results)){
  const r=controls[code];assert.equal(r.type,'Object')
  for(const key of ['name','quote','description','tag1','tag2','tag3','image'])assert.ok(r.controls[key])
 }
 for(const key of ['orange','cream','wine','ink'])assert.equal(controls[key].type,'Color')
 assert.equal(controls.characterUrl.type,'Image')
 const allowed=new Set(['type','title','defaultValue','hidden','controls','displayTextArea','options','optionTitles'])
 function validate(cs:any){for(const c of Object.values(cs) as any[]){for(const key of Object.keys(c))assert.ok(allowed.has(key),key);if(c.controls)validate(c.controls)}}
 validate(controls)
})
test('property edits forward to stable question IDs and preserve main rendering component',()=>{
 const {component}=load()
 const element=component({v2Question01:{prompt:'운영자 질문',optionA:'운영자 A',optionB:'운영자 B'},v2TieBS:{prompt:'동점 수정'},BTP:{name:'운영자 결과',description:'운영자 설명',tag1:'하나',tag2:'둘',tag3:'셋',image:'https://example.com/master.png'},orange:'#F36B38'})
 assert.equal(element.props.questionCopy.bs1.prompt,'운영자 질문')
 assert.equal(element.props.questionCopy.tieBS.prompt,'동점 수정')
 assert.equal(element.props.resultCopy.BTP.name,'운영자 결과')
 assert.deepEqual([...element.props.resultCopy.BTP.keywords],['하나','둘','셋'])
 assert.equal(element.props.resultAssets.BTP,'https://example.com/master.png')
 assert.equal(element.props.orange,'#F36B38')
})

test('existing legacy result images remain connected without importing old default copy',()=>{
 const {component}=load()
 const old=component({ESP:{image:'https://example.com/old.png',name:'old text'}})
 assert.equal(old.props.resultAssets.BTP,'https://example.com/old.png')
 assert.equal(old.props.resultCopy.BTP,undefined)
 const override=component({ESP:{image:'https://example.com/old.png'},BTP:{image:'https://example.com/new.png'}})
 assert.equal(override.props.resultAssets.BTP,'https://example.com/new.png')
})
