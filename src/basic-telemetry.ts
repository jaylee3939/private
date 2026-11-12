// No cookies, IDs, result codes, answers, timestamps or local storage.
export type BasicKind='visit'|'start'|'complete'|'share'
export class BasicParticipation {
 private enabled=false
 private visited=false
 private started=false
 private completed=false
 configure(enabled:boolean){this.enabled=enabled;if(enabled&&!this.visited){this.visited=true;this.send('visit')}}
 start(){if(!this.enabled||this.started)return;this.started=true;this.send('start')}
 complete(){if(!this.enabled||!this.started||this.completed)return;this.completed=true;this.send('complete')}
 share(){if(this.enabled)this.send('share')}
 reset(){this.started=false;this.completed=false}
 private send(kind:BasicKind){
  // Intentionally no automatic retry: retry deduplication would require a persisted identifier.
  void fetch('/api/basic-events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind}),credentials:'omit',referrerPolicy:'no-referrer',keepalive:true,signal:AbortSignal.timeout(10000)}).catch(()=>{})
 }
}
