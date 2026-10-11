/* ===== الحفظ والمزامنة =====
   أخطر ما في التطبيق: هنا يضيع عمل المعلّم إن أخطأنا. كل فحصٍ هنا يحرس
   عطلًا وقع فعلًا أو كاد، ومكتوبٌ بجانبه سببه.

   Supabase مزيّف بصفٍّ واحد وزمن استجابة يُتحكَّم فيه. الطلب يقطع نصف
   الزمن ذهابًا ثم يُنفَّذ على الخادم ثم نصفه إيابًا — بهذا وحده يتنافس
   طلبان متداخلان كما يتنافسان على شبكة المدرسة. */

const vm = require('vm');
const { load, suite } = require('./harness.js');

const sleep = (ms)=> new Promise(r=> setTimeout(r, ms));
const snap  = (v)=> JSON.parse(JSON.stringify(v));

function fakeCloud(){
  const row = { value:null, updated_at:'2026-01-01T10:00:00.000Z' };
  const log = [];
  const cfg = { latency:20, failNext:0, loseReply:0, hangNext:0, inflight:0, maxInflight:0 };

  function qb(){
    const q = { _f:{}, _upd:null, _ins:null };
    q.select = ()=> q;
    q.eq = (k,v)=>{ q._f[k] = v; return q; };
    q.update = (o)=>{ q._upd = o; return q; };
    q.insert = (o)=>{ q._ins = o; return q; };
    q.maybeSingle = async ()=>{
      await sleep(cfg.latency);
      return { data: row.value===null ? null : { value:snap(row.value), updated_at:row.updated_at }, error:null };
    };
    q.then = (res, rej)=> (async ()=>{
      const body = q._upd || q._ins;
      const payload = body ? snap(body.value) : null;   /* الحمولة تُسلسل لحظة الإرسال */
      if(body){ cfg.inflight++; if(cfg.inflight > cfg.maxInflight) cfg.maxInflight = cfg.inflight; }
      const done = async (r)=>{ await sleep(cfg.latency/2); if(body) cfg.inflight--; return r; };
      await sleep(cfg.latency/2);
      if(body && cfg.hangNext>0){ cfg.hangNext--; await new Promise(()=>{}); }
      if(body && cfg.failNext>0){ cfg.failNext--; return done({ data:null, error:{ message:'network' } }); }
      /* الخادم كتب ثم ضاع الجواب — أخبث ما يقع على شبكة الجوال */
      if(body && cfg.loseReply>0){
        cfg.loseReply--;
        if(q._upd && q._f.updated_at === row.updated_at){ row.value = payload; row.updated_at = q._upd.updated_at; }
        return done({ data:null, error:{ message:'network' } });
      }
      if(q._ins){
        if(row.value !== null) return done({ data:null, error:{ code:'23505' } });
        row.value = payload; row.updated_at = q._ins.updated_at;
        return done({ data:[{ updated_at:row.updated_at }], error:null });
      }
      if(q._upd){
        log.push({ sent:q._f.updated_at, actual:row.updated_at });
        if(q._f.updated_at !== row.updated_at) return done({ data:[], error:null });   /* قفل الإصدار */
        row.value = payload; row.updated_at = q._upd.updated_at;
        return done({ data:[{ updated_at:row.updated_at }], error:null });
      }
      return done({ data:{ value:snap(row.value), updated_at:row.updated_at }, error:null });
    })().then(res, rej);
    return q;
  }
  return { row, log, cfg, client:{ from:()=> qb(),
    auth:{ getSession: async ()=>({ data:{ session:{ user:{ id:'u1' } } }, error:null }) } } };
}

module.exports = async function run(){
  const t = suite('الحفظ والمزامنة');
  const s = load();
  const cloud = fakeCloud();
  s.supabaseClient = cloud.client;

  /* نافذة التضارب: نلتقط أزرارها لنضغطها كما يضغطها المعلّم */
  const handlers = {};
  let HOLDER = '';
  const holder = {
    get innerHTML(){ return HOLDER; },
    set innerHTML(v){ HOLDER = v; if(v === '') Object.keys(handlers).forEach(k=> delete handlers[k]); }
  };
  s.document.getElementById = (id)=>{
    if(id === 'dialog-holder') return holder;
    const e = require('./harness.js').el(id);
    e.addEventListener = (ev, fn)=>{ if(ev === 'click') handlers[id] = fn; };
    return e;
  };

  const T = {
    scene(stamp, mine, latency){
      cloud.row.value = { sections:{} }; cloud.row.updated_at = stamp;
      cloud.log.length = 0;
      Object.assign(cloud.cfg, { latency, failNext:0, loseReply:0, hangNext:0, inflight:0, maxInflight:0 });
      HOLDER = '';
      vm.runInContext(`
        applyLoadedState(normalizeLoadedState(freshState()));
        CURRENT_UID='u1'; SAVE_ENABLED=true;
        REMOTE_STAMP=${JSON.stringify(mine)}; PENDING_PUSH=false; CONFLICT_OPEN=false;
        SELF_HEAL=0; OUR_STAMPS.length=0; AUTO_RESCUE_MARKS=-1; AUTO_RESCUE_AT=0;
      `, s);
      Object.keys(s.__store).forEach(k=> delete s.__store[k]);
    },
    mark(n){ return vm.runInContext(`(function(){
      const k=SECTION_KEYS[0]; let c=0;
      for(let i=0;i<STATE.sections[k].length && c<${n}; i++){
        STATE.sections[k][i].name='طالب '+(i+1);
        for(let g=0; g<STATE.config.p.count && c<${n}; g++){ STATE.sections[k][i].p[g]='✔️'; c++; }
      }
      return c; })()`, s); },
    marksInCloud(){ return cloud.row.value ? countMarksPlain(cloud.row.value) : 0; },
    dialogOpen(){ return HOLDER.indexOf('cf-keep-local') >= 0; },
    press(id){ if(!handlers[id]) throw new Error('لا زرّ '+id); return handlers[id](); },
    get(name){ return vm.runInContext(name, s); }
  };
  function countMarksPlain(st){
    let n = 0;
    Object.keys(st.sections || {}).forEach(k=> (st.sections[k]||[]).forEach(r=>{
      if(r && typeof r === 'object') Object.keys(r).forEach(c=>{
        if(Array.isArray(r[c])) r[c].forEach(v=>{ if(v && v !== '⬜') n++; });
      });
    }));
    return n;
  }

  /* ١ — تعديلان أبطأ من الشبكة: كان الثاني يسقط في قفل الإصدار فتظهر
     نافذة «تغيّرت من جهاز آخر» على كتابتنا نحن. */
  t.head('تعديلان متتاليان أبطأ من الشبكة');
  T.scene('2026-01-01T10:00:00.000Z', '2026-01-01T10:00:00.000Z', 2000);
  const n1 = T.mark(10);
  vm.runInContext('persistState();', s);
  await sleep(1200);
  T.mark(20);
  vm.runInContext('persistState();', s);
  await sleep(9000);
  t.ok('لا نافذة تضارب على كتابتنا', !T.dialogOpen());
  t.ok('ولا طلبان في وقت واحد', cloud.cfg.maxInflight === 1, 'أقصى تداخل ' + cloud.cfg.maxInflight);
  t.ok('والتعديلان وصلا السحابة', T.marksInCloud() === 20, T.marksInCloud() + ' من 20');
  t.ok('ولا شيء معلّق', T.get('PENDING_PUSH') === false);

  /* ٢ — تعديل يقع أثناء الرفع: كان عَلَمه يُشطب فيُنسى بلا أن يصل. */
  t.head('تعديل أثناء الرفع لا يضيع');
  T.scene('2026-01-01T11:00:00.000Z', '2026-01-01T11:00:00.000Z', 600);
  T.mark(5);
  vm.runInContext('persistState();', s);
  await sleep(1000);
  T.mark(12);
  vm.runInContext('persistState();', s);
  await sleep(5000);
  t.ok('ما رُصد أثناء الرفع وصل', T.marksInCloud() === 12, T.marksInCloud() + ' من 12');
  t.ok('ولا نافذة', !T.dialogOpen());

  /* ٣ — جواب ضاع بعد أن كتب الخادم: ختمنا صار قديمًا ونحن لا ندري. */
  t.head('جواب ضاع بعد أن كتب الخادم');
  T.scene('2026-01-01T12:00:00.000Z', '2026-01-01T12:00:00.000Z', 100);
  cloud.cfg.loseReply = 1;
  T.mark(8);
  vm.runInContext('persistState();', s);
  await sleep(1500);
  t.ok('الكتابة وصلت الخادم فعلًا', T.marksInCloud() === 8, T.marksInCloud() + '');
  t.ok('ولا نافذة تضارب على كتابتنا', !T.dialogOpen());
  T.mark(14);
  vm.runInContext('persistState();', s);
  await sleep(1500);
  t.ok('والتعديل التالي وصل بلا نافذة', T.marksInCloud() === 14 && !T.dialogOpen(), T.marksInCloud() + '');

  /* ٤ — أختامنا تنجو من إعادة تحميل الصفحة. بلا هذا كان المعلّم يرى
     النافذة كلّما خرج من التطبيق ثم عاد. */
  t.head('خروجٌ من التطبيق ثم عودة');
  T.scene('2026-01-01T13:00:00.000Z', '2026-01-01T13:00:00.000Z', 50);
  const n4 = T.mark(16);
  vm.runInContext('persistState();', s);
  await sleep(1200);
  const saved = JSON.parse(s.__store[Object.keys(s.__store).find(k=> k.indexOf('rasd_local')===0)]);
  t.ok('النسخة المحلية تحفظ أختامنا معها', Array.isArray(saved.ours) && saved.ours.length > 0);
  saved.dirty = true; saved.stamp = '2026-01-01T13:00:00.000Z';   /* كما لو لم يصل الجواب */
  s.__store[Object.keys(s.__store).find(k=> k.indexOf('rasd_local')===0)] = JSON.stringify(saved);
  vm.runInContext(`
    OUR_STAMPS.length=0; REMOTE_STAMP=null; PENDING_PUSH=false; SAVE_ENABLED=false;
    applyLoadedState(normalizeLoadedState(freshState()));
  `, s);
  const res = await vm.runInContext('loadState()', s);
  t.ok('الإقلاع لا يرى تضاربًا في كتابتنا', !res.conflict, res.conflict ? 'ظهر تضارب' : '');
  t.ok('ويُحمّل نسخة الجهاز', countMarksPlain(res.state) === n4, countMarksPlain(res.state) + ' من ' + n4);
  t.ok('ويرفعها فورًا', res.pushNow === true);

  /* ٥ — التضارب الحقيقي ما زال يُكتشف، وإلا صار الإصلاح تغطيةً على الخطر. */
  t.head('التضارب الحقيقي');
  T.scene('2026-01-01T14:00:00.000Z', '2026-01-01T13:30:00.000Z', 20);
  cloud.row.value = { sections:{}, mark:'جهاز آخر' };
  T.mark(6);
  vm.runInContext('persistState();', s);
  await sleep(1500);
  t.ok('النافذة تظهر عند تضارب حقيقي', T.dialogOpen());
  t.ok('وتعرض عدد الخانات على الجانبين', /خانة مرصودة/.test(HOLDER), 'بلا أعداد');
  t.ok('وزرّ المحو بمظهرٍ تحذيري لا كزرّ التأكيد', /class="btn-danger" id="cf-take-remote"/.test(HOLDER));

  /* ٦ — «اعتمد ما على هذا الجهاز» يُبقي الرصد، ويحفظ النسختين قبل ذلك. */
  t.head('اختيار المعلّم في النافذة');
  const before = T.get('countMarks(STATE)');
  await T.press('cf-keep-local');
  await sleep(800);
  t.ok('الرصد باقٍ على الشاشة', T.get('countMarks(STATE)') === before, T.get('countMarks(STATE)') + '/' + before);
  t.ok('ووصل السحابة', T.marksInCloud() === before, T.marksInCloud() + '/' + before);
  t.ok('ونسخة النجاة حفظت ما كان يُستبدل', T.get('readRescue().length') > 0);

  return t.done();
};
