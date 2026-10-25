(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.AYTORQModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function exerciseKey(name){return String(name||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toLocaleLowerCase('es-MX')}
  function exerciseSyncId(ex){return ex?.syncId||(`legacy:${exerciseKey(ex?.name)}`)}
  function syncExercisePlan(source,routines){
    const syncId=exerciseSyncId(source),mode=source?.syncMode||'weight';
    if(!syncId||mode==='independent'||!source?.sets?.length)return 0;
    let updated=0;
    (routines||[]).forEach(r=>(r.exercises||[]).forEach(target=>{
      if(target===source||exerciseSyncId(target)!==syncId)return;
      target.syncId=syncId;target.syncMode=mode;
      target.sets.forEach((set,i)=>{const planned=source.sets[i];if(!planned)return;set.weight=planned.weight;if(mode==='weight-reps')set.reps=planned.reps;updated++;});
    }));
    return updated;
  }
  function completedVolume(workout){return (workout?.exercises||[]).reduce((total,e)=>total+(e.sets||[]).filter(s=>s.done&&Number.isFinite(Number(s.weight))&&Number(s.weight)>0&&Number.isFinite(Number(s.reps))&&Number(s.reps)>0).reduce((sum,s)=>sum+Number(s.weight)*Number(s.reps),0),0)}
  return {exerciseKey,exerciseSyncId,syncExercisePlan,completedVolume};
});
