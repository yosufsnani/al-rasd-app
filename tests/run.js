#!/usr/bin/env node
/* مُشغّل الفحوص: node tests/run.js
   يُشغّل كل ملفات t-*.js ويطبع ملخّصًا. يخرج برمز ١ إن سقط فحصٌ واحد،
   فيصلح للتشغيل اليدوي ولأي أداة آلية لاحقًا. */

const fs = require('fs');
const path = require('path');

(async ()=>{
  const only = process.argv[2];
  const files = fs.readdirSync(__dirname)
    .filter(f=> /^t-.*\.js$/.test(f))
    .filter(f=> !only || f.indexOf(only) >= 0)
    .sort();

  if(files.length === 0){
    console.log('لا ملفات فحص مطابقة' + (only ? ' لـ «' + only + '»' : ''));
    process.exit(1);
  }

  const results = [];
  for(const f of files){
    try{
      results.push(await require(path.join(__dirname, f))());
    }catch(e){
      console.log('【 ' + f + ' 】');
      console.log('  ✗ انهار الملف — ' + e.message);
      console.log((e.stack || '').split('\n').slice(1,4).join('\n'));
      console.log('');
      results.push({ name:f, pass:0, fail:1 });
    }
  }

  const pass = results.reduce((a,r)=> a + r.pass, 0);
  const fail = results.reduce((a,r)=> a + r.fail, 0);
  console.log('─'.repeat(46));
  results.forEach(r=>{
    const mark = r.fail === 0 ? '✓' : '✗';
    console.log('  ' + mark + ' ' + r.name.padEnd(28) + String(r.pass).padStart(3) + ' ناجح' +
                (r.fail ? '  ·  ' + r.fail + ' ساقط' : ''));
  });
  console.log('─'.repeat(46));
  console.log(fail === 0 ? '  الكل سليم — ' + pass + ' فحصًا' : '  سقط ' + fail + ' من ' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
