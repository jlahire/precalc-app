/* Offline copy for the GitHub Pages site.
   Network first: when online you always get the newest version; offline you get the last one saved. */
var CACHE = 'precalc-prep-v3';
var FILES = ['./', './index.html', './precalc-prep.html', './manifest.webmanifest',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function(res){
    var copy = res.clone();
    caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
    return res;
  }).catch(function(){
    return caches.match(e.request, {ignoreSearch:true}).then(function(r){ return r || caches.match('./precalc-prep.html'); });
  }));
});
