(() => {
  const KEY = 'ay-torq-v1';
  const Model = window.AYTORQModel;
  const days = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];
  const dayNames = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const icons = ['⌑','⌁','⌘','⟡','⌖','◈','◇'];
  const $ = (s, root=document) => root.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const makeId = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const parseDate = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d,12); };
  const fmtDate = s => new Intl.DateTimeFormat('es-MX',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(parseDate(s));
  const localToday = () => dateKey(new Date());
  const mondayIndex = d => (d.getDay()+6)%7;
  let storageLoadError = false;
  let state = load();
  let lastSavedState = JSON.stringify(state);
  let view = 'dashboard';
  let selectedDate = localToday();
  let progressExercise = '';
  let progressPeriod = 'all';
  let progressGroup = 'week';
  let progressMetric = 'weight';
  let progressRoutine = 'all';
  let historyTab = 'semana';
  let historyAnchor = localToday();
  let toastTimer;
  let installEvent;
  let editingExerciseDraft = null;

  function load(){
    try {
      const raw=localStorage.getItem(KEY);if(raw===null)return {routines:[],sessions:[],drafts:{},profile:{name:'Atleta',goal:''}};
      const v=JSON.parse(raw);if(v&&Array.isArray(v.routines)&&Array.isArray(v.sessions))return {...v,drafts:v.drafts||{},profile:v.profile||{name:'Atleta',goal:''}};
      storageLoadError=true;return {routines:[],sessions:[],drafts:{},profile:{name:'Atleta',goal:''}};
    } catch(e){storageLoadError=true;return {routines:[],sessions:[],drafts:{},profile:{name:'Atleta',goal:''}};}
  }
  function persist(){
    if(storageLoadError){toast('No se pudo leer el almacenamiento anterior; no guardé cambios para protegerlo.');return false;}
    try{const raw=JSON.stringify(state);localStorage.setItem(KEY,raw);lastSavedState=raw;return true;}
    catch(e){state=JSON.parse(lastSavedState);toast('No se pudieron guardar los cambios. Se restauró el último estado guardado. Libera espacio o exporta una copia.');render();return false;}
  }
  function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2300); }
  function dateForWeek(dayIndex, around=selectedDate){ const date=parseDate(around); date.setDate(date.getDate()-mondayIndex(date)+dayIndex); return dateKey(date); }
  function routineFor(date){ const idx=mondayIndex(parseDate(date)); return state.routines.find(r=>r.days.includes(idx)); }
  function draftFor(date){ return state.drafts[date]; }
  function countSets(r){return r.exercises.reduce((a,e)=>a+e.sets.length,0)}
  function countDone(r){return r.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0)}
  function completedVolume(workout){return Model.completedVolume(workout)}
  function estimateMinutes(workout){const sets=countSets(workout);return sets?sets+(sets-1)*3:0}
  function exerciseKey(name){return Model.exerciseKey(name)}
  function exerciseSyncId(ex){return Model.exerciseSyncId(ex)}
  function syncExercisePlan(source){return Model.syncExercisePlan(source,state.routines)}
  function activeWorkout(date){ return draftFor(date) || null; }
  function safeDateLabel(date){return new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',year:'numeric'}).format(parseDate(date));}
  function button(label,action,cls='btn-secondary',attrs=''){return `<button class="btn ${cls}" data-action="${action}" ${attrs}>${label}</button>`}
  function pageHead(eyebrow,title,sub='',extra=''){return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div>${extra}</div>`}

  function render(){
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    const main=$('#main');
    if(view==='dashboard') main.innerHTML=renderDashboard();
    else if(view==='routines') main.innerHTML=renderRoutines();
    else if(view==='history') main.innerHTML=renderHistory();
    else if(view==='progress') main.innerHTML=renderProgress();
    else main.innerHTML=renderProfile();
  }
  function renderDashboard(){
    const date=parseDate(selectedDate), routine=routineFor(selectedDate), draft=activeWorkout(selectedDate);
    const workout=draft || routine;
    const label=selectedDate===localToday()?'ENTRENAMIENTO DE HOY':dayNames[mondayIndex(date)].toUpperCase();
    const wstart=dateForWeek(0), weekDates=Array.from({length:7},(_,i)=>dateForWeek(i));
    const completedDays=new Set(state.sessions.filter(s=>s.date>=wstart&&s.date<=dateForWeek(6)).map(s=>s.date));
    const done=workout ? countDone(workout) : 0, total=workout ? countSets(workout) : 0;
    const pct=total ? Math.round(done/total*100) : 0;
    const metrics=`<div class="metrics"><div class="metric"><span class="label">Ejercicios</span><strong>${workout?.exercises.length||0}</strong><em>en la rutina</em></div><div class="metric"><span class="label">Series</span><strong>${total}</strong><em>planificadas</em></div><div class="metric"><span class="label">Completadas</span><strong>${done}</strong><em>de ${total} series</em></div><div class="metric"><span class="label">Progreso</span><strong>${pct}%</strong><em>de la sesión</em></div></div>`;
    let week=`<div class="week-strip">${days.map((d,i)=>{const dk=weekDates[i];return `<button class="day-chip ${dk===selectedDate?'selected':''}" data-date="${dk}" data-action="select-date">${d}<b>${parseDate(dk).getDate()}${completedDays.has(dk)?' ·':''}</b></button>`}).join('')}</div>`;
    let inner='';
    if(!workout){inner=`<section class="card empty"><div class="empty-icon">◈</div><h3>${routine ? 'Prepara tu sesión' : 'Día de descanso'}</h3><p>${routine ? `Hoy está programada <b>${esc(routine.name)}</b>. Inicia una sesión para registrar cada serie.` : 'No hay una rutina asignada para este día. Puedes asignarla desde Mis rutinas o disfrutar tu descanso.'}</p>${routine?button('INICIAR ENTRENAMIENTO','start-workout','btn-primary'):button('ASIGNAR UNA RUTINA','routines','btn-secondary')}</section>`}
    else if(!draft){inner=`<section class="card routine-card"><div class="routine-heading"><div><h2>${esc(workout.name)}</h2><p>${esc(workout.muscles||'Grupos musculares por definir')}</p></div><span class="pill">${workout.exercises.length} ejercicios</span></div><p class="duration-estimate">◷ DURACIÓN ESTIMADA · ~${estimateMinutes(workout)} MIN <small>1 min por serie + 3 min de descanso entre series</small></p><p class="notes" style="margin:12px 0 0">Tu plan está listo. Al iniciar, se creará un registro independiente de esta sesión.</p>${button('INICIAR ENTRENAMIENTO →','start-workout','btn-primary btn-block')}</section>`}
    else {inner=`<section class="card routine-card"><div class="routine-heading"><div><h2>${esc(draft.name)}</h2><p>${esc(draft.muscles||'Entrenamiento')}</p></div><span class="pill red">EN CURSO</span></div><p class="duration-estimate">◷ DURACIÓN ESTIMADA · ~${estimateMinutes(draft)} MIN <small>1 min por serie + 3 min de descanso entre series</small></p><div class="progress-line"><i style="width:${pct}%"></i></div><div class="progress-copy"><span>${done} de ${total} series completadas</span><span>${pct}%</span></div>${renderExercises(draft,true)}<p class="notes">Los pesos y repeticiones de esta sesión son registros reales. Para cambiar el plan de futuras sesiones, edita el ejercicio desde Rutinas.</p>${button('FINALIZAR Y GUARDAR SESIÓN','save-workout','btn-primary btn-block')}${button('Descartar sesión','discard-workout','btn-quiet btn-block')}</section>`}
    return `${pageHead(label,'Entrenamiento',fmtDate(selectedDate),`<div class="date-row"><button data-action="shift-date" data-delta="-1" aria-label="Día anterior">‹</button><span>${safeDateLabel(selectedDate)}</span><button data-action="shift-date" data-delta="1" aria-label="Día siguiente">›</button></div>`)}${week}${metrics}<div class="section-title"><h2>${workout?'Rutina del día':'Tu plan'}</h2><span>${draft?'REGISTRO EN VIVO':routine?'PLANIFICADA':'SIN RUTINA'}</span></div>${inner}`;
  }
  function renderExercises(workout,editable){
    if(!workout.exercises.length) return `<div class="empty"><h3>Aún no hay ejercicios</h3><p>Agrega ejercicios a esta rutina desde la sección Rutinas.</p></div>`;
    return `<div class="exercise-list">${workout.exercises.map((e,ei)=>`<article class="exercise-card"><div class="exercise-top"><div class="exercise-symbol">${icons[ei%icons.length]}</div><div class="exercise-info"><b>${esc(e.name)}</b><small>${esc(e.group||'Sin grupo muscular')}${e.notes?` · ${esc(e.notes)}`:''}</small></div><span class="exercise-meta">${e.sets.filter(s=>s.done).length}/${e.sets.length}</span>${editable?`<button class="complete-dot ${e.sets.length&&e.sets.every(s=>s.done)?'done':''}" data-action="toggle-exercise" data-exercise="${e.id}" aria-label="Completar todas las series">✓</button>`:''}</div>${editable?`<div class="sets-panel">${e.sets.map((s,si)=>`<div class="set-row"><span class="set-label">SERIE ${si+1}</span><div class="field-wrap"><label for="w-${e.id}-${s.id}">Peso · kg</label><input id="w-${e.id}-${s.id}" type="number" min="0" max="999" step="0.25" inputmode="decimal" value="${esc(s.weight)}" data-action="set-field" data-exercise="${e.id}" data-set="${s.id}" data-field="weight" aria-label="Peso serie ${si+1}"></div><div class="field-wrap"><label for="r-${e.id}-${s.id}">Reps</label><input id="r-${e.id}-${s.id}" type="number" min="0" max="999" step="1" inputmode="numeric" value="${esc(s.reps)}" data-action="set-field" data-exercise="${e.id}" data-set="${s.id}" data-field="reps" aria-label="Repeticiones serie ${si+1}"></div><button class="set-check ${s.done?'checked':''}" data-action="toggle-set" data-exercise="${e.id}" data-set="${s.id}" aria-label="Marcar serie ${si+1} ${s.done?'pendiente':'completada'}">✓</button><button class="set-remove" data-action="remove-active-set" data-exercise="${e.id}" data-set="${s.id}" aria-label="Eliminar serie ${si+1}">×</button></div>`).join('')}</div><div class="row-actions"> <button class="btn btn-quiet btn-small" data-action="add-active-set" data-exercise="${e.id}">+ Añadir serie</button><button class="btn btn-quiet btn-small" data-action="remove-active-set" data-exercise="${e.id}">− Quitar última</button></div>`:`<div class="sets-panel">${e.sets.map((s,si)=>`<div class="set-row"><span class="set-label">SERIE ${si+1}</span><span>${esc(s.weight||'—')} kg</span><span>${esc(s.reps||'—')} reps</span><span>${s.done?'✓':'·'}</span></div>`).join('')}</div>`}</article>`).join('')}</div>`;
  }
  function renderRoutines(){
    return `${pageHead('PLANIFICACIÓN','Mis rutinas','Organiza tu semana y prepara cada sesión.',button('+ CREAR RUTINA','new-routine','btn-primary'))}<div class="routine-grid">${state.routines.length?state.routines.map(r=>`<article class="card routine-tile" data-action="edit-routine" data-id="${r.id}"><div class="routine-heading"><div><h3>${esc(r.name)}</h3><p>${esc(r.muscles||'Grupos musculares')}</p></div><span class="chevron">›</span></div><p class="tile-days">${r.days.length?r.days.map(i=>dayNames[i].slice(0,3)).join(' · '):'Sin días asignados'} &nbsp;·&nbsp; ${r.exercises.length} ejercicios &nbsp;·&nbsp; ${countSets(r)} series &nbsp;·&nbsp; ~${estimateMinutes(r)} min</p><div class="row-actions">${button('Editar','edit-routine','btn-quiet btn-small',`data-id="${r.id}"`)}${button('Ejercicios','manage-exercises','btn-secondary btn-small',`data-id="${r.id}"`)}</div></article>`).join(''):`<section class="card empty" style="grid-column:1/-1"><div class="empty-icon">◫</div><h3>Diseña tu primera rutina</h3><p>Crea tu propio plan, añade ejercicios y asígnalo a los días que prefieras. Los datos de ejemplo no se mostrarán como registros personales.</p>${button('CREAR RUTINA','new-routine','btn-primary')}</section>`}</div><div class="section-title"><h2>Semana</h2><span>ASIGNACIÓN ACTUAL</span></div><section class="card" style="padding:12px">${dayNames.map((d,i)=>{const r=state.routines.find(x=>x.days.includes(i));return `<div class="history-item" style="padding:10px 4px;border-bottom:1px solid #252d35"><div class="history-date">${days[i]}</div><div class="history-description"><b>${r?esc(r.name):'Descanso'}</b><small>${r?`${r.exercises.length} ejercicios · ${countSets(r)} series`:'Sin rutina asignada'}</small></div></div>`}).join('')}</section>`;
  }
  function renderHistory(){
    let entries=state.sessions.slice().sort((a,b)=>b.date.localeCompare(a.date));
    const anchor=parseDate(historyAnchor);
    if(historyTab==='semana'){const start=dateForWeek(0,historyAnchor),end=dateForWeek(6,historyAnchor);entries=entries.filter(s=>s.date>=start&&s.date<=end)}
    if(historyTab==='mes'){entries=entries.filter(s=>parseDate(s.date).getMonth()===anchor.getMonth()&&parseDate(s.date).getFullYear()===anchor.getFullYear())}
    return `${pageHead('REGISTROS','Historial','Cada sesión guardada conserva una copia de lo que registraste.') }<div class="tabs"><button data-action="history-tab" data-tab="semana" class="${historyTab==='semana'?'active':''}">SEMANA</button><button data-action="history-tab" data-tab="mes" class="${historyTab==='mes'?'active':''}">MES</button><button data-action="history-tab" data-tab="todo" class="${historyTab==='todo'?'active':''}">TODO</button></div><section class="card history-tools"><label for="history-date">Fecha de referencia</label><input id="history-date" type="date" value="${historyAnchor}"><div class="row-actions"><button class="btn btn-quiet btn-small" data-action="delete-history-range" data-range="day">BORRAR DÍA</button><button class="btn btn-danger btn-small" data-action="delete-history-range" data-range="week">BORRAR SEMANA</button></div></section>${entries.length?`<div class="history-list">${entries.map(s=>`<button class="card history-item" style="text-align:left" data-action="session-detail" data-id="${s.id}"><span class="history-date">${new Intl.DateTimeFormat('es-MX',{month:'short'}).format(parseDate(s.date))}<b>${parseDate(s.date).getDate()}</b></span><span class="history-description"><b>${esc(s.name)}</b><small>${s.doneSets}/${s.totalSets} series · ${s.exercises.length} ejercicios · ${Math.round(completedVolume(s)).toLocaleString('es-MX')} kg × reps · ${s.duration?`${s.duration} min`:'duración sin registrar'}</small></span><span class="chevron">›</span></button>`).join('')}</div>`:`<section class="card empty"><div class="empty-icon">◷</div><h3>${state.sessions.length?'No hay sesiones en este periodo':'Tu historial empieza aquí'}</h3><p>${state.sessions.length?'Elige otro periodo o selecciona “Todo” para consultar las demás sesiones.':'Cuando finalices y guardes una sesión, aparecerá en esta lista con los pesos y repeticiones que registraste.'}</p></section>`}`;
  }
  function deleteHistoryRange(range){
    const anchor=$('#history-date')?.value||historyAnchor;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(anchor)){toast('Elige una fecha válida.');return}
    const start=range==='week'?dateForWeek(0,anchor):anchor,end=range==='week'?dateForWeek(6,anchor):anchor;
    const matches=state.sessions.filter(s=>s.date>=start&&s.date<=end);
    if(!matches.length){toast(range==='week'?'No hay sesiones guardadas esa semana.':'No hay sesiones guardadas ese día.');return}
    const period=range==='week'?`la semana del ${fmtDate(start)} al ${fmtDate(end)}`:`el ${fmtDate(start)}`;
    if(!confirm(`¿Eliminar ${matches.length} ${matches.length===1?'sesión':'sesiones'} de ${period}? Esta acción no se puede deshacer.`))return;
    const ids=new Set(matches.map(s=>s.id));state.sessions=state.sessions.filter(s=>!ids.has(s.id));if(!persist())return;render();toast(`${matches.length} ${matches.length===1?'sesión eliminada':'sesiones eliminadas'}.`);
  }
  function progressStart(period){
    if(period==='all')return '';
    const end=parseDate(localToday()),start=new Date(end);
    const shiftMonths=months=>{const day=start.getDate();start.setDate(1);start.setMonth(start.getMonth()-months);start.setDate(Math.min(day,new Date(start.getFullYear(),start.getMonth()+1,0).getDate()))};
    if(period==='7d')start.setDate(start.getDate()-6);else if(period==='14d')start.setDate(start.getDate()-13);else if(period==='1m')shiftMonths(1);else if(period==='3m')shiftMonths(3);else if(period==='6m')shiftMonths(6);else if(period==='1y')start.setFullYear(start.getFullYear()-1);
    return dateKey(start);
  }
  function renderProgress(){
    const exerciseOptions=new Map();
    [...state.routines,...state.sessions].forEach(r=>(r.exercises||[]).forEach(e=>{const id=exerciseSyncId(e);if(!exerciseOptions.has(id))exerciseOptions.set(id,e.name)}));
    if(!exerciseOptions.has(progressExercise))progressExercise=exerciseOptions.keys().next().value||'';
    const start=progressStart(progressPeriod),today=localToday();
    let records=state.sessions.filter(s=>(!start||s.date>=start)&&s.date<=today);
    if(progressRoutine!=='all')records=records.filter(s=>s.routineId===progressRoutine||(!s.routineId&&s.name===state.routines.find(r=>r.id===progressRoutine)?.name));
    records.sort((a,b)=>a.date.localeCompare(b.date));
    const allSelected=records.flatMap(s=>(s.exercises||[]).filter(e=>exerciseSyncId(e)===progressExercise).flatMap(e=>(e.sets||[]).filter(x=>x.done).map(x=>({date:s.date,weight:Number(x.weight)||0,reps:Number(x.reps)||0}))));
    const daily=records.map(s=>{const sets=(s.exercises||[]).filter(e=>exerciseSyncId(e)===progressExercise).flatMap(e=>(e.sets||[]).filter(x=>x.done).map(x=>({weight:Number(x.weight)||0,reps:Number(x.reps)||0})));const validWeight=sets.filter(x=>x.weight>0&&x.reps>0);return {date:s.date,weight:Math.max(0,...validWeight.map(x=>x.weight)),reps:sets.reduce((n,x)=>n+(x.reps>0?x.reps:0),0),volume:validWeight.reduce((n,x)=>n+x.weight*x.reps,0)}}).filter(x=>x.weight||x.reps||x.volume);
    const bucketKey=date=>progressGroup==='day'?date:progressGroup==='week'?dateForWeek(0,date):date.slice(0,7);
    const buckets=new Map();daily.forEach(p=>{const key=bucketKey(p.date),x=buckets.get(key)||{date:key,value:0,sessions:0};x.sessions++;if(progressMetric==='weight')x.value=Math.max(x.value,p.weight);else x.value+=p[progressMetric];buckets.set(key,x)});
    const points=[...buckets.values()].filter(p=>p.value>0);
    const completedSets=records.reduce((n,s)=>n+(s.exercises||[]).reduce((m,e)=>m+(e.sets||[]).filter(x=>x.done).length,0),0);
    const sessionVolume=records.reduce((n,s)=>n+(s.exercises||[]).reduce((m,e)=>m+(e.sets||[]).filter(x=>x.done&&Number(x.weight)>0&&Number(x.reps)>0).reduce((v,x)=>v+Number(x.weight)*Number(x.reps),0),0),0);
    const rangeLabel=start?`${safeDateLabel(start)} – ${safeDateLabel(today)}`:(records.length?`${safeDateLabel(records[0].date)} – ${safeDateLabel(records.at(-1).date)}`:'Todo el historial');
    const metricLabel={weight:'Peso máximo (kg)',reps:'Repeticiones',volume:'Volumen (kg × reps)'}[progressMetric];
    const change=points.length>1?(()=>{const first=points[0].value,last=points.at(-1).value,diff=last-first,pct=first?Math.round(diff/first*100):null;return `${diff>=0?'+':''}${Number(diff.toFixed(1))}${pct===null?'':` (${pct>=0?'+':''}${pct}%)`}`})():'Se necesitan dos periodos con datos para comparar.';
    const exerciseSelect=exerciseOptions.size?`<select id="progress-select" class="select-input" aria-label="Seleccionar ejercicio">${[...exerciseOptions].map(([id,name])=>`<option value="${esc(id)}" ${id===progressExercise?'selected':''}>${esc(name)}</option>`).join('')}</select>`:'<span class="notes">Sin ejercicios registrados</span>';
    const controls=`<div class="progress-filters"><label>Periodo<select id="progress-period" class="select-input"><option value="7d" ${progressPeriod==='7d'?'selected':''}>Última semana</option><option value="14d" ${progressPeriod==='14d'?'selected':''}>Últimas 2 semanas</option><option value="1m" ${progressPeriod==='1m'?'selected':''}>Último mes</option><option value="3m" ${progressPeriod==='3m'?'selected':''}>Últimos 3 meses</option><option value="6m" ${progressPeriod==='6m'?'selected':''}>Últimos 6 meses</option><option value="1y" ${progressPeriod==='1y'?'selected':''}>Último año</option><option value="all" ${progressPeriod==='all'?'selected':''}>Todo el historial</option></select></label><label>Ejercicio${exerciseSelect}</label><label>Métrica<select id="progress-metric" class="select-input"><option value="weight" ${progressMetric==='weight'?'selected':''}>Peso máximo</option><option value="reps" ${progressMetric==='reps'?'selected':''}>Repeticiones</option><option value="volume" ${progressMetric==='volume'?'selected':''}>Volumen</option></select></label><label>Agrupar<select id="progress-group" class="select-input"><option value="day" ${progressGroup==='day'?'selected':''}>Por día</option><option value="week" ${progressGroup==='week'?'selected':''}>Por semana</option><option value="month" ${progressGroup==='month'?'selected':''}>Por mes</option></select></label><label>Rutina<select id="progress-routine" class="select-input"><option value="all">Todas las rutinas</option>${state.routines.map(r=>`<option value="${esc(r.id)}" ${progressRoutine===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label></div>`;
    const chart=points.length?renderChart(points,progressMetric):'';
    const maxWeight=Math.max(0,...allSelected.map(x=>x.weight));
    const totalReps=allSelected.reduce((n,x)=>n+x.reps,0);
    return `${pageHead('ANÁLISIS','Progresión','Solo se incluyen entrenamientos y series completadas.', '')}${controls}<p class="notes progress-range">Periodo seleccionado: <b>${esc(rangeLabel)}</b></p><div class="metrics"><div class="metric"><span class="label">Entrenamientos</span><strong>${records.length}</strong><em>en el periodo</em></div><div class="metric"><span class="label">Series completadas</span><strong>${completedSets}</strong><em>registros reales</em></div><div class="metric"><span class="label">Volumen</span><strong>${Math.round(sessionVolume).toLocaleString('es-MX')}</strong><em>kg × reps realizados</em></div><div class="metric"><span class="label">Último entrenamiento</span><strong>${records.length?new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short'}).format(parseDate(records.at(-1).date)):'—'}</strong><em>${records.length?esc(records.at(-1).name):'Sin sesiones en el periodo'}</em></div></div>${points.length?`<section class="card chart-card"><h3>${esc(metricLabel)} · ${esc(exerciseOptions.get(progressExercise)||'Ejercicio')}</h3><div class="chart-wrap">${chart}</div><p class="notes">Cambio entre el primer y último periodo: ${esc(change)}. ${progressMetric==='volume'?'Volumen calculado solo con series completadas que registran peso y repeticiones.':progressMetric==='weight'?'Se muestra el peso máximo de cada periodo.':'Se suman las repeticiones de series completadas.'}</p></section>`:`<section class="card empty"><div class="empty-icon">▥</div><h3>No hay datos para este filtro</h3><p>${exerciseOptions.size?'Prueba otro periodo, rutina o ejercicio. Solo cuentan las series completadas con datos reales.':'Al guardar sesiones con series completadas, aquí aparecerán la carga, las repeticiones y el volumen reales.'}</p></section>`}<div class="section-title"><h2>Marcas personales</h2><span>EN EL PERIODO · ${esc(exerciseOptions.get(progressExercise)||'')}</span></div><section class="card progress-prs"><div class="history-item"><span class="history-description"><b>Peso máximo registrado</b><small>Serie completada · kg</small></span><b>${maxWeight?`${maxWeight} kg`:'—'}</b></div><div class="history-item"><span class="history-description"><b>Repeticiones realizadas</b><small>Series completadas seleccionadas</small></span><b>${totalReps||'—'}</b></div></section>`;
  }
  function renderChart(points,metric='weight'){
    if(!points.length)return '';
    const W=640,H=195,pad={l:42,r:12,t:14,b:32},max=Math.max(...points.map(p=>p.value)),min=Math.min(...points.map(p=>p.value)),spread=max-min||Math.max(max*.18,1),lo=Math.max(0,min-spread*.25),hi=max+spread*.15;
    const x=i=>pad.l+(points.length===1?(W-pad.l-pad.r)/2:i*(W-pad.l-pad.r)/(points.length-1));
    const y=v=>pad.t+(hi-v)*(H-pad.t-pad.b)/(hi-lo);
    const coords=points.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ');
    const unit=metric==='weight'?'kg':metric==='volume'?'kg·reps':'reps';
    const grid=[0,.5,1].map(k=>{const val=lo+(hi-lo)*k,yy=y(val);return `<line x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}" stroke="#273039"/><text class="chart-label" x="0" y="${yy+3}">${Math.round(val)}</text>`}).join('');
    const labels=points.map((p,i)=>i===0||i===points.length-1||i%Math.ceil(points.length/5)===0?`<text class="chart-label" text-anchor="middle" x="${x(i)}" y="${H-5}">${p.date.length===7?new Intl.DateTimeFormat('es-MX',{month:'short',year:'2-digit'}).format(new Date(Number(p.date.slice(0,4)),Number(p.date.slice(5,7))-1,1)):new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short'}).format(parseDate(p.date))}</text>`:'').join('');
    const dots=points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="4" fill="#e3314b" stroke="#f5f5f5" stroke-width="1.5"><title>${p.value} ${unit} · ${p.sessions} ${p.sessions===1?'sesión':'sesiones'} · ${p.date}</title></circle>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de ${unit}"><text class="chart-label" x="${pad.l}" y="11">${unit}</text>${grid}<polyline points="${coords}" fill="none" stroke="#dc2941" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${dots}${labels}</svg>`;
  }
  function weeklyCount(){const start=dateForWeek(0,localToday()),end=dateForWeek(6,localToday());return state.sessions.filter(s=>s.date>=start&&s.date<=end).length}
  function renderProfile(){
    const duration=state.sessions.reduce((a,s)=>a+(Number(s.duration)||0),0);
    const data=`<div class="metrics"><div class="metric"><span class="label">Sesiones</span><strong>${state.sessions.length}</strong><em>guardadas</em></div><div class="metric"><span class="label">Tiempo total</span><strong>${duration?`${(duration/60).toFixed(1)}`:'0'}</strong><em>horas registradas</em></div></div>`;
    return `${pageHead('TU ESPACIO','Perfil','Tus datos y preferencias.') }<section class="card profile-card"><div class="profile-avatar">${esc((state.profile.name||'T')[0].toUpperCase())}</div><div><h2>${esc(state.profile.name||'Atleta')}</h2><p>Disciplina · Proceso · Resultados</p></div>${button('EDITAR','edit-profile','btn-quiet btn-small')}</section>${data}<div class="section-title"><h2>Objetivo</h2></div><section class="card" style="padding:16px"><p style="margin:0 0 12px;font-size:13px">${esc(state.profile.goal||'Aún no has definido un objetivo.')}</p>${button('CONFIGURAR OBJETIVO','edit-profile','btn-secondary btn-small')}</section><div class="section-title"><h2>Datos y almacenamiento</h2></div><section class="card" style="padding:16px"><p class="notes">Tus rutinas y registros se guardan en este navegador. Puedes crear una copia JSON para respaldarlos o llevarlos a otro dispositivo. No hay sincronización automática entre dispositivos.</p><div class="row-actions">${button('EXPORTAR COPIA','export-data','btn-secondary btn-small')}${button('IMPORTAR COPIA','import-data','btn-quiet btn-small')}</div>${button('BORRAR TODOS LOS DATOS','clear-data','btn-danger btn-small btn-block')}</section><p class="notes" style="text-align:center;margin:22px">AY TORQ · Training Log · v1.0</p>`;
  }

  function showModal(title,body,submitText='GUARDAR'){
    const d=$('#modal');d.innerHTML=`<form id="modal-form"><h2>${title}</h2>${body}<div class="modal-actions"><button type="button" class="btn btn-quiet" data-action="close-modal">Cancelar</button><button class="btn btn-primary" type="submit">${submitText}</button></div></form>`;d.showModal();
  }
  function routineForm(r){
    const selected=r?.days||[];
    return `<label for="routine-name">Nombre</label><input id="routine-name" name="name" maxlength="48" required value="${esc(r?.name||'')}" placeholder="Ej. Empuje A"><label for="routine-muscles">Grupos musculares</label><input id="routine-muscles" name="muscles" maxlength="80" value="${esc(r?.muscles||'')}" placeholder="Pecho · Hombros · Tríceps"><label>Días asignados</label><div class="check-grid">${dayNames.map((d,i)=>`<label><input type="checkbox" name="days" value="${i}" ${selected.includes(i)?'checked':''}> ${d.slice(0,3)}</label>`).join('')}</div><input type="hidden" name="routineId" value="${esc(r?.id||'')}">`;
  }
  function exerciseForm(e){
    const options=new Map();state.routines.flatMap(r=>r.exercises).forEach(x=>{const id=exerciseSyncId(x);if(id!==exerciseSyncId(e||{}))options.set(id,x.name)});
    const linked=[...options].map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');
    const series=e?e.sets.map((set,i)=>`<div class="exercise-set-edit"><b>Serie ${i+1}</b><label>Peso · kg<input name="setWeight" type="number" min="0" max="999" step="0.25" inputmode="decimal" value="${esc(set.weight)}" data-action="exercise-set-field" data-index="${i}" data-field="weight"></label><label>Reps<input name="setReps" type="number" min="0" max="999" step="1" inputmode="numeric" value="${esc(set.reps)}" data-action="exercise-set-field" data-index="${i}" data-field="reps"></label><input type="hidden" name="setId" value="${esc(set.id)}"><button type="button" class="btn btn-danger btn-small" data-action="remove-exercise-set" data-index="${i}" aria-label="Eliminar serie ${i+1}">Eliminar serie</button></div>`).join(''):'';
    const syncId=e?exerciseSyncId(e):'';
    return `<label for="exercise-name">Nombre del ejercicio</label><input id="exercise-name" name="name" maxlength="60" required value="${esc(e?.name||'')}" placeholder="Press de banca"><label for="exercise-group">Grupo muscular</label><input id="exercise-group" name="group" maxlength="45" value="${esc(e?.group||'')}" placeholder="Pecho"><label for="exercise-notes">Notas permanentes del ejercicio</label><textarea id="exercise-notes" name="notes" maxlength="300" placeholder="Ajustes, técnica o recordatorios">${esc(e?.notes||'')}</textarea><label for="exercise-sync">Sincronización del plan</label><select id="exercise-sync" name="syncMode">${e?`<option value="weight" ${e.syncMode==='weight'?'selected':''}>Sincronizar solo el peso; conservar reps por día</option><option value="weight-reps" ${e.syncMode==='weight-reps'?'selected':''}>Sincronizar peso y repeticiones</option><option value="independent" ${e.syncMode==='independent'?'selected':''}>Mantener independiente</option>`:`<option value="auto" selected>Usar configuración del ejercicio vinculado; si no existe, solo peso</option><option value="weight">Sincronizar solo el peso; conservar reps por día</option><option value="weight-reps">Sincronizar peso y repeticiones</option><option value="independent">Mantener independiente</option>`}</select><label for="exercise-link">Vincular con un ejercicio existente (opcional)</label><select id="exercise-link" name="syncId"><option value="">Vincular automáticamente solo si el nombre coincide exactamente</option>${linked.replace(`value="${esc(syncId)}"`,`value="${esc(syncId)}" selected`)}</select>${e?`<label>Series planificadas · puedes editar o quitar cada serie</label><div id="exercise-set-editor">${series}</div><button type="button" class="btn btn-secondary btn-small" data-action="add-exercise-set">+ Añadir serie</button><input type="hidden" name="setCount" value="${e.sets.length}">`:`<label for="exercise-sets">Número de series iniciales</label><input id="exercise-sets" name="setCount" type="number" min="1" max="20" step="1" required value="3"><label for="exercise-reps">Repeticiones objetivo</label><input id="exercise-reps" name="reps" type="number" min="0" max="100" step="1"><label for="exercise-weight">Peso objetivo kg</label><input id="exercise-weight" name="weight" type="number" min="0" max="999" step="0.25">`}<input type="hidden" name="exerciseId" value="${esc(e?.id||'')}">`;
  }
  function editRoutine(id){const r=state.routines.find(x=>x.id===id);showModal(id?'Editar rutina':'Nueva rutina',routineForm(r));}
  function manageExercises(id){const r=state.routines.find(x=>x.id===id);if(!r)return;const body=`<input type="hidden" name="routineId" value="${r.id}"><p class="notes">${esc(r.name)} · ${r.exercises.length} ejercicios</p><div>${r.exercises.map((e,i)=>`<div class="card exercise-manage"><span class="grow"><b>${esc(e.name)}</b><small class="notes"> · ${e.sets.length} series · ${esc(e.group)}</small></span><button type="button" class="btn btn-quiet btn-small" data-action="move-exercise" data-id="${r.id}" data-index="${i}" data-delta="-1" ${i===0?'disabled':''}>↑</button><button type="button" class="btn btn-quiet btn-small" data-action="move-exercise" data-id="${r.id}" data-index="${i}" data-delta="1" ${i===r.exercises.length-1?'disabled':''}>↓</button><button type="button" class="btn btn-quiet btn-small" data-action="edit-exercise" data-routine="${r.id}" data-exercise="${e.id}">Editar</button><button type="button" class="btn btn-danger btn-small" data-action="delete-exercise" data-routine="${r.id}" data-exercise="${e.id}">×</button></div>`).join('')}</div><button type="button" class="btn btn-secondary btn-block" data-action="new-exercise" data-id="${r.id}">+ AÑADIR EJERCICIO</button>`;showModal('Ejercicios',body,'LISTO');$('#modal-form').dataset.intent='close';}
  function startWorkout(){
    const r=routineFor(selectedDate);if(!r){toast('No hay rutina asignada a este día.');return}
    if(state.drafts[selectedDate]){toast('Ya hay una sesión en curso.');return}
    state.drafts[selectedDate]={id:makeId(),routineId:r.id,name:r.name,muscles:r.muscles,startedAt:Date.now(),exercises:r.exercises.map(e=>({...e,sets:e.sets.map(s=>({id:makeId(),weight:s.weight,reps:s.reps,done:false}))}))};if(!persist())return;render();toast('Sesión iniciada. Tus cambios se guardan automáticamente.');
  }
  function saveWorkout(){
    const w=state.drafts[selectedDate];if(!w)return;
    const done=countDone(w);if(!done){toast('Completa al menos una serie antes de guardar.');return}
    const mins=Math.max(1,Math.round((Date.now()-w.startedAt)/60000));
    const session={id:makeId(),routineId:w.routineId||'',date:selectedDate,name:w.name,muscles:w.muscles,duration:mins,estimatedDuration:estimateMinutes(w),doneSets:done,totalSets:countSets(w),exercises:JSON.parse(JSON.stringify(w.exercises)),savedAt:Date.now()};
    state.sessions.push(session);delete state.drafts[selectedDate];if(!persist())return;render();toast('Sesión guardada en tu historial.');
  }
  function fieldChanged(target){
    const w=state.drafts[selectedDate];if(!w)return;
    const e=w.exercises.find(x=>x.id===target.dataset.exercise),s=e?.sets.find(x=>x.id===target.dataset.set);if(!s)return;
    if(target.value!==''&&Number(target.value)<0){target.value=0;return}
    if(target.dataset.field==='reps'&&target.value!==''&&!Number.isInteger(Number(target.value))){target.value='';return}
    s[target.dataset.field]=target.value;persist();
  }

  document.addEventListener('click',ev=>{
    const nav=ev.target.closest('[data-view]');if(nav){view=nav.dataset.view;render();return}
    const el=ev.target.closest('[data-action]');if(!el)return;
    const a=el.dataset.action;
    if(a==='select-date'){selectedDate=el.dataset.date;render()}
    else if(a==='shift-date'){const d=parseDate(selectedDate);d.setDate(d.getDate()+Number(el.dataset.delta));selectedDate=dateKey(d);render()}
    else if(a==='routines'){view='routines';render()}
    else if(a==='new-routine')editRoutine('')
    else if(a==='edit-routine')editRoutine(el.dataset.id)
    else if(a==='manage-exercises')manageExercises(el.dataset.id)
    else if(a==='close-modal'){editingExerciseDraft=null;$('#modal').close();render()}
    else if(a==='start-workout')startWorkout()
    else if(a==='save-workout')saveWorkout()
    else if(a==='add-active-set'){const w=state.drafts[selectedDate],e=w?.exercises.find(x=>x.id===el.dataset.exercise);if(!e)return;if(e.sets.length>=20){toast('Cada ejercicio admite hasta 20 series.');return}const last=e.sets.at(-1)||{};e.sets.push({id:makeId(),weight:last.weight||'',reps:last.reps||'',done:false});if(!persist())return;render();toast('Serie añadida al borrador.')}
    else if(a==='remove-active-set'){const w=state.drafts[selectedDate],e=w?.exercises.find(x=>x.id===el.dataset.exercise);if(!e||e.sets.length<=1){toast('Cada ejercicio debe conservar al menos una serie.');return}const set=el.dataset.set?e.sets.find(x=>x.id===el.dataset.set):e.sets.at(-1);if(!set)return;if(set.done&&!confirm('¿Eliminar esta serie completada del borrador de entrenamiento?'))return;e.sets=e.sets.filter(x=>x.id!==set.id);if(!persist())return;render();toast('Serie eliminada del borrador.')}
    else if(a==='toggle-set'){
      const w=state.drafts[selectedDate],e=w?.exercises.find(x=>x.id===el.dataset.exercise),s=e?.sets.find(x=>x.id===el.dataset.set);if(!s)return;
      if(!s.done&&(!Number.isInteger(Number(s.reps))||Number(s.reps)<1)){toast('Registra las repeticiones realizadas antes de completar la serie.');return}
      s.done=!s.done;if(!persist())return;render();
    }
    else if(a==='toggle-exercise'){
      const w=state.drafts[selectedDate],e=w?.exercises.find(x=>x.id===el.dataset.exercise);if(!e)return;const done=e.sets.every(s=>s.done);if(!done&&e.sets.some(s=>!Number.isInteger(Number(s.reps))||Number(s.reps)<1)){toast('Añade las repeticiones de cada serie antes de completarlas.');return}e.sets.forEach(s=>s.done=!done);if(!persist())return;render();
    }
    else if(a==='discard-workout'){if(confirm('¿Descartar esta sesión y todos sus registros? Esta acción no se puede deshacer.')){delete state.drafts[selectedDate];if(!persist())return;render();toast('Sesión descartada.')}}
    else if(a==='new-exercise'){const r=state.routines.find(x=>x.id===el.dataset.id);showModal('Añadir ejercicio',exerciseForm(null));$('#modal-form').dataset.routine=r?.id||'';}
    else if(a==='edit-exercise'){const r=state.routines.find(x=>x.id===el.dataset.routine),e=r?.exercises.find(x=>x.id===el.dataset.exercise);if(r&&e){editingExerciseDraft=JSON.parse(JSON.stringify(e));showModal('Editar ejercicio',exerciseForm(editingExerciseDraft));$('#modal-form').dataset.routine=r.id}}
    else if(a==='add-exercise-set'){if(editingExerciseDraft&&editingExerciseDraft.sets.length<20){const last=editingExerciseDraft.sets.at(-1)||{};editingExerciseDraft.sets.push({id:makeId(),weight:last.weight||'',reps:last.reps||'',done:false});showModal('Editar ejercicio',exerciseForm(editingExerciseDraft));$('#modal-form').dataset.routine=state.routines.find(r=>r.exercises.some(e=>e.id===editingExerciseDraft.id))?.id||''}}
    else if(a==='remove-exercise-set'){if(editingExerciseDraft?.sets.length>1){editingExerciseDraft.sets.splice(Number(el.dataset.index),1);showModal('Editar ejercicio',exerciseForm(editingExerciseDraft));$('#modal-form').dataset.routine=state.routines.find(r=>r.exercises.some(e=>e.id===editingExerciseDraft.id))?.id||''}}
    else if(a==='delete-exercise'){if(confirm('¿Eliminar este ejercicio y sus valores planificados? Las sesiones ya guardadas se conservan.')){const r=state.routines.find(x=>x.id===el.dataset.routine);if(r)r.exercises=r.exercises.filter(e=>e.id!==el.dataset.exercise);if(!persist())return;manageExercises(el.dataset.routine)}}
    else if(a==='move-exercise'){const r=state.routines.find(x=>x.id===el.dataset.id),i=Number(el.dataset.index),j=i+Number(el.dataset.delta);if(r&&r.exercises[j]){[r.exercises[i],r.exercises[j]]=[r.exercises[j],r.exercises[i]];if(!persist())return;manageExercises(r.id)}}
    else if(a==='history-tab'){historyTab=el.dataset.tab;render()}
    else if(a==='session-detail'){const s=state.sessions.find(x=>x.id===el.dataset.id);if(s)sessionDetail(s)}
    else if(a==='delete-history-range')deleteHistoryRange(el.dataset.range)
    else if(a==='delete-session'){const s=state.sessions.find(x=>x.id===el.dataset.id);if(s&&confirm(`¿Eliminar la sesión “${s.name}” del ${fmtDate(s.date)}? Esta acción no se puede deshacer.`)){state.sessions=state.sessions.filter(x=>x.id!==s.id);if(!persist())return;$('#modal').close();render();toast('Sesión eliminada del historial.')}}
    else if(a==='edit-profile')profileForm()
    else if(a==='export-data')exportData()
    else if(a==='import-data')$('#file-import')?.click()
    else if(a==='clear-data'){if(confirm('¿Borrar todas tus rutinas, borradores e historial guardados en este navegador? Exporta una copia antes si quieres conservarlos.')){localStorage.removeItem(KEY);state=load();render();toast('Datos eliminados.')}}
  });
  document.addEventListener('input',ev=>{if(ev.target.matches('[data-action="set-field"]'))fieldChanged(ev.target);if(ev.target.matches('[data-action="exercise-set-field"]')&&editingExerciseDraft){const set=editingExerciseDraft.sets[Number(ev.target.dataset.index)];if(set)set[ev.target.dataset.field]=ev.target.value}});
  document.addEventListener('change',ev=>{
    if(ev.target.id==='progress-select'){progressExercise=ev.target.value;render()}
    if(ev.target.id==='progress-period'){progressPeriod=ev.target.value;render()}
    if(ev.target.id==='progress-group'){progressGroup=ev.target.value;render()}
    if(ev.target.id==='progress-metric'){progressMetric=ev.target.value;render()}
    if(ev.target.id==='progress-routine'){progressRoutine=ev.target.value;render()}
    if(ev.target.id==='history-date'){historyAnchor=ev.target.value||localToday();render()}
    if(ev.target.id==='file-import'&&ev.target.files[0]) importFile(ev.target.files[0]);
  });
  document.addEventListener('submit',ev=>{
    if(ev.target.id==='modal-form'){
      ev.preventDefault();const fd=new FormData(ev.target),form=ev.target;
      if(form.dataset.intent==='close'){$('#modal').close();render();return}
      if(form.dataset.routine && !fd.has('name')){$('#modal').close();return}
      if(fd.has('routineId') && !fd.has('setCount')){
        const id=fd.get('routineId'),name=String(fd.get('name')||'').trim(),muscles=String(fd.get('muscles')||'').trim(),assigned=fd.getAll('days').map(Number);
        if(!name){toast('Escribe un nombre para la rutina.');return}
        if(assigned.some(d=>state.routines.some(r=>r.id!==id&&r.days.includes(d)))){toast('Cada día admite una rutina. Revisa los días ya asignados.');return}
        let r=state.routines.find(x=>x.id===id);if(r){r.name=name;r.muscles=muscles;r.days=assigned}else state.routines.push({id:makeId(),name,muscles,days:assigned,exercises:[]});if(!persist())return;$('#modal').close();render();toast('Rutina guardada.');return;
      }
      if(fd.has('setCount')){
        const rid=form.dataset.routine,r=state.routines.find(x=>x.id===rid);if(!r)return;
        const eid=String(fd.get('exerciseId')||''),name=String(fd.get('name')||'').trim(),group=String(fd.get('group')||'').trim(),notes=String(fd.get('notes')||'').trim(),n=Math.max(1,Math.min(20,Number(fd.get('setCount'))||3)),reps=fd.get('reps'),weight=fd.get('weight');
        if(!name){toast('Escribe un nombre para el ejercicio.');return}
        const selectedSyncId=String(fd.get('syncId')||'');let mode=String(fd.get('syncMode')||'weight');
        const existingLink=state.routines.flatMap(x=>x.exercises).find(x=>selectedSyncId?exerciseSyncId(x)===selectedSyncId:exerciseKey(x.name)===exerciseKey(name));
        if(mode==='auto')mode=existingLink?.syncMode||'weight';
        let e=r.exercises.find(x=>x.id===eid);
        if(e){
          const ids=fd.getAll('setId'),weights=fd.getAll('setWeight'),repsList=fd.getAll('setReps');
          const sets=ids.length?ids.map((id,i)=>({id:String(id),weight:String(weights[i]??''),reps:String(repsList[i]??''),done:false})):Array.from({length:n},(_,i)=>({id:e.sets[i]?.id||makeId(),weight:String(weight||''),reps:String(reps||''),done:false}));
          if(!sets.length||sets.some(x=>(x.weight!==''&&(!Number.isFinite(Number(x.weight))||Number(x.weight)<0))||(x.reps!==''&&(!Number.isInteger(Number(x.reps))||Number(x.reps)<0)))){toast('Revisa los pesos y repeticiones de cada serie.');return}
          e.name=name;e.group=group;e.notes=notes;e.sets=sets;e.syncId=mode==='independent'?`exercise:${makeId()}`:(selectedSyncId||((exerciseKey(name)===exerciseKey(editingExerciseDraft?.name))?exerciseSyncId(editingExerciseDraft):`exercise:${makeId()}`));e.syncMode=mode;
        }else{
          const sameName=state.routines.flatMap(x=>x.exercises).find(x=>exerciseKey(x.name)===exerciseKey(name));
          const syncId=mode==='independent'?`exercise:${makeId()}`:(selectedSyncId|| (sameName?exerciseSyncId(sameName):`exercise:${makeId()}`));
          r.exercises.push({id:makeId(),syncId,syncMode:mode,name,group,notes,sets:Array.from({length:n},()=>({id:makeId(),weight:String(weight||''),reps:String(reps||''),done:false}))});
          e=r.exercises[r.exercises.length-1];
        }
        syncExercisePlan(e);editingExerciseDraft=null;if(!persist())return;$('#modal').close();manageExercises(r.id);return;
      }
      if(fd.has('profileName')){state.profile.name=String(fd.get('profileName')||'Atleta').trim()||'Atleta';state.profile.goal=String(fd.get('goal')||'').trim();if(!persist())return;$('#modal').close();render();toast('Perfil actualizado.');}
    }
  });
  function sessionDetail(s){
    const body=`<p class="notes">${fmtDate(s.date)} · ${s.duration?s.duration+' min':'sin duración'}</p><div class="metrics" style="grid-template-columns:repeat(3,1fr)"><div class="metric"><span class="label">Series completadas</span><strong>${s.doneSets}/${s.totalSets}</strong></div><div class="metric"><span class="label">Duración</span><strong>${s.duration||'—'}<em> min</em></strong></div><div class="metric"><span class="label">Volumen</span><strong>${Math.round(completedVolume(s)).toLocaleString('es-MX')}<em> kg × reps</em></strong></div></div>${s.exercises.map(e=>`<div class="section-title"><h2>${esc(e.name)}</h2></div>${e.notes?`<p class="notes">${esc(e.notes)}</p>`:''}${e.sets.map((t,i)=>`<div class="history-item" style="padding:10px 2px;border-bottom:1px solid #252d35"><span class="history-description">Serie ${i+1}</span><b>${esc(t.weight||'—')} kg</b><span>${esc(t.reps||'—')} reps</span><span>${t.done?'✓':'·'}</span></div>`).join('')}`).join('')}`;
    showModal(esc(s.name),body,'CERRAR');
    $('#modal-form').dataset.intent='close';
    $('#modal .modal-actions').insertAdjacentHTML('afterbegin',`<button type="button" class="btn btn-danger btn-small" data-action="delete-session" data-id="${s.id}">ELIMINAR SESIÓN</button>`);
  }
  function profileForm(){showModal('Editar perfil',`<label for="profileName">Nombre</label><input id="profileName" name="profileName" maxlength="45" value="${esc(state.profile.name)}"><label for="goal">Objetivo de entrenamiento</label><select id="goal" name="goal"><option value="" ${state.profile.goal===''?'selected':''}>Sin definir</option>${['Mantenerme en forma','Ganar masa muscular','Perder grasa','Rendimiento deportivo'].map(g=>`<option ${state.profile.goal===g?'selected':''}>${g}</option>`).join('')}<option value="Personalizado" ${state.profile.goal==='Personalizado'?'selected':''}>Personalizado</option></select>`);}
  function exportData(){const blob=new Blob([JSON.stringify({app:'AY TORQ',version:1,exportedAt:new Date().toISOString(),data:state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ay-torq-backup-${localToday()}.json`;a.click();URL.revokeObjectURL(a.href);toast('Copia de seguridad descargada.');}
  function importFile(file){const reader=new FileReader();reader.onload=()=>{try{const obj=JSON.parse(reader.result),incoming=obj.data;if(!incoming||!Array.isArray(incoming.routines)||!Array.isArray(incoming.sessions))throw Error('El archivo no parece una copia válida de AY TORQ.');if(!confirm('Restaurar esta copia sustituirá las rutinas, borradores y el historial de este navegador. Descarga primero una copia actual desde Perfil → Exportar copia. ¿Ya tienes un respaldo y quieres continuar?'))return;state={...incoming,drafts:incoming.drafts||{},profile:incoming.profile||{name:'Atleta',goal:''}};if(!persist())return;render();toast('Copia restaurada.')}catch(e){toast(e.message||'No se pudo leer la copia.')}};reader.readAsText(file);}

  window.addEventListener('beforeinstallprompt',ev=>{ev.preventDefault();installEvent=ev;$('#install-button').hidden=false});
  $('#install-button').addEventListener('click',async()=>{if(installEvent){installEvent.prompt();await installEvent.userChoice;installEvent=null;$('#install-button').hidden=true}else toast('En iPhone: Safari → Compartir → Añadir a pantalla de inicio.');});
  $('#profile-shortcut').addEventListener('click',()=>{view='profile';render()});
  const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='application/json,.json';fileInput.id='file-import';fileInput.hidden=true;document.body.append(fileInput);
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  render();
})();
