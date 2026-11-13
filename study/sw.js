const C='fermat-study-v13';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','roster.json','vendor/face-api.js','vendor/tiny_face_detector_model-weights_manifest.json','vendor/tiny_face_detector_model.bin'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
/* 화면(HTML)과 명단은 인터넷이 되면 항상 새로 받아요(고친 내용이 바로 보이게). 안 되면 저장해 둔 걸 써요.
   나머지 파일(얼굴 감지 파일 등)은 저장해 둔 걸 먼저 써서 데이터를 아껴요. Apps Script 요청은 그대로 보내요. */
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  const fresh=e.request.mode==='navigate'||/\/(index\.html|roster\.json)?$/.test(u.pathname)||u.pathname.endsWith('.html');
  e.respondWith(caches.open(C).then(async c=>{
    if(fresh){try{const r=await fetch(e.request,{cache:'no-store'});if(r.ok)c.put(e.request,r.clone());return r}catch(_){return (await c.match(e.request,{ignoreSearch:true}))||(await c.match('index.html'))}}
    const hit=await c.match(e.request,{ignoreSearch:true});
    const net=fetch(e.request).then(r=>{if(r.ok)c.put(e.request,r.clone());return r}).catch(()=>hit);
    return hit||net}));
});
