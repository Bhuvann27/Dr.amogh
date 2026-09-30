(function(){
  "use strict";
  const el=document.getElementById("clinicMap");
  if(!el || !window.L) return;
  const map=L.map(el,{scrollWheelZoom:false}).setView([12.52605,76.90021],15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"&copy; OpenStreetMap contributors",maxZoom:19}).addTo(map);
  const marker=L.marker([12.52605,76.90021]).addTo(map);
  marker.bindPopup("<strong>Mandya Institute of Medical Sciences (MIMS)</strong><br><a href='https://www.google.com/maps/search/?api=1&query=Arogya+Hospital+Mandya' target='_blank' rel='noopener'>Open in Google Maps</a>");
  setTimeout(()=>map.invalidateSize(),200);
})();