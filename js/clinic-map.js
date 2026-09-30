(function(){
  "use strict";
  const el=document.getElementById("clinicMap");
  if(!el || !window.L) return;
  const map=L.map(el,{scrollWheelZoom:false}).setView([12.5228,76.8951],15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"&copy; OpenStreetMap contributors",maxZoom:19}).addTo(map);
  const marker=L.marker([12.5228,76.8951]).addTo(map);
  marker.bindPopup("<strong>Arogya Hospital, Mandya</strong><br><a href='https://www.google.com/maps/search/?api=1&query=Arogya+Hospital+Mandya' target='_blank' rel='noopener'>Open in Google Maps</a>");
  setTimeout(()=>map.invalidateSize(),200);
})();