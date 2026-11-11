/* Offline copy for the GitHub Pages site.
   Network first: when online you always get the newest version; offline you get the last one saved. */
var CACHE = 'precalc-prep-v8';
var FILES = ['./', './index.html', './precalc-prep.html', './manifest.webmanifest',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './css/paper.css', './css/device.css', './js/device.js', './fonts/caveat-latin.woff2', './js/paper.js', './js/graph.js', './js/eh-trig.js', './js/eh-plus.js', './js/eh-more.js', './js/eh-ui.js', './js/progress.js', './js/check-work.js', './js/table-graph.js'];

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
