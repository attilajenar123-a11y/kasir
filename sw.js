const CACHE='kasir-offline-v2';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE?caches.delete(k):null))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;
  e.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{
    if(req.method==='GET'&&res&&res.status===200){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); }
    return res;
  }).catch(()=>caches.match('./index.html'))));
});
