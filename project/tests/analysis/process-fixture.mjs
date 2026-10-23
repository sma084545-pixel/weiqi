// DEVELOPMENT TEST DOUBLE ONLY: transport/fault injection, never engine correctness evidence.
import readline from 'node:readline';
let active=null;
const output=data=>process.stdout.write(JSON.stringify(data)+'\n');
readline.createInterface({input:process.stdin}).on('line',line=>{
 const q=JSON.parse(line);
 if(q.action==='query_version'){output({...q,version:'1.18.1'});return;}
 if(q.action==='query_models'){output({...q,models:[{internalName:'test-model'}]});return;}
 if(q.action==='terminate'){
   output(q);if(process.argv.includes('ignore-cancel'))return;
   if(active?.id===q.terminateId){clearTimeout(active.timer);const id=active.id;setTimeout(()=>output({id,isDuringSearch:false,noResults:true,turnNumber:0}),40);active=null;}return;
 }
 if(q.komi===99){process.exit(13);return;}
 active={id:q.id,timer:setTimeout(()=>{output({id:q.id,isDuringSearch:false,turnNumber:q.moves.length,rootInfo:{currentPlayer:q.initialPlayer,winrate:.6,scoreLead:1.5,visits:64},moveInfos:[{move:'C3',visits:63,winrate:.6,scoreLead:1.5,pv:['C3']}]});active=null;},120)};
});
