import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api.js";
import { useNotify } from "../notify.jsx";

const PROFILE = {
  driving: "driving",
  walking: "foot",
  bicycling: "bike",
  transit: "driving",
};

const MANEUVER = {
  depart: "Départ",
  arrive: "Arrivée",
  turn: "Tourner",
  "new name": "Continuer",
  continue: "Continuer",
  merge: "S’insérer",
  "on ramp": "Prendre la bretelle",
  "off ramp": "Sortir",
  fork: "À la fourche",
  "end of road": "Fin de route",
  roundabout: "Rond-point",
  rotary: "Rond-point",
  "roundabout turn": "Rond-point",
  "exit roundabout": "Sortir du rond-point",
  notification: "Continuer",
};

const MODIFIER = {
  left: "à gauche",
  right: "à droite",
  "slight left": "légèrement à gauche",
  "slight right": "légèrement à droite",
  "sharp left": "franchement à gauche",
  "sharp right": "franchement à droite",
  straight: "tout droit",
  uturn: "demi-tour",
};

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
}

function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function stepLabel(step) {
  const maneuver = step.maneuver || {};
  const action = MANEUVER[maneuver.type] || "Continuer";
  const side = MODIFIER[maneuver.modifier] || "";
  const road = step.name ? ` sur ${step.name}` : "";
  return `${action}${side ? ` ${side}` : ""}${road}`.replace(/\s+/g, " ").trim();
}

function haversine(a, b) {
  const radius = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function nearestOnPath(point, coords) {
  let best = Infinity;
  let index = 0;
  coords.forEach((pair, cursor) => {
    const meters = haversine(point, { lat: pair[0], lng: pair[1] });
    if (meters < best) {
      best = meters;
      index = cursor;
    }
  });
  return { meters: best, index };
}

function pinIcon(kind) {
  const color = kind === "depart" ? "#1e523f" : "#a73918";
  const glyph = kind === "depart" ? "navigation" : "flag";
  const arrow = kind === "depart" ? " data-arrow" : "";
  return L.divIcon({
    className: "collecte-pin",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;background:${color};color:#fff;border:3px solid #fff;box-shadow:0 6px 14px rgba(0,0,0,.28)"><span${arrow} class="material-symbols-outlined" style="font-size:18px;line-height:1">${glyph}</span></span>`,
  });
}

export default function CollecteMap({ destination, mode, fallback }) {
  const notes = useNotify();
  const box = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef(null);
  const startRef = useRef(null);
  const pathRef = useRef([]);
  const fittedRef = useRef(false);
  const rerouteAt = useRef(0);
  const told = useRef(false);
  const gpsRef = useRef(false);
  const notesRef = useRef(notes);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(null);
  const [gpsOn, setGpsOn] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [summary, setSummary] = useState(null);
  const [steps, setSteps] = useState([]);
  const [active, setActive] = useState(0);
  const [guide, setGuide] = useState("");
  const [remain, setRemain] = useState(null);
  const [arrived, setArrived] = useState(false);
  const [status, setStatus] = useState("Localisation en cours…");
  gpsRef.current = gpsOn;
  notesRef.current = notes;

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("Localisation indisponible sur cet appareil.");
      return undefined;
    }
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        setGpsOn(true);
        setLive({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
        });
      },
      () => setGpsOn(false),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  useEffect(() => {
    if (anchor || !live) return undefined;
    setAnchor({ lat: live.lat, lng: live.lng });
    return undefined;
  }, [anchor, live]);

  useEffect(() => {
    if (anchor || live) return undefined;
    const timer = setTimeout(() => {
      if (fallback?.lat != null && fallback?.lng != null) {
        setAnchor({ lat: Number(fallback.lat), lng: Number(fallback.lng) });
        setStatus("Position non partagée : trajet depuis ton quartier.");
        return;
      }
      setAnchor({ lat: 6.1725, lng: 1.2123 });
      setStatus("Position non partagée : trajet depuis le centre de Lomé.");
    }, 4000);
    return () => clearTimeout(timer);
  }, [anchor, live, fallback?.lat, fallback?.lng]);

  useEffect(() => {
    if (!box.current || mapRef.current) return undefined;
    const map = L.map(box.current, { zoomControl: true }).setView([destination.lat, destination.lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setReady(true);
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
      startRef.current = null;
      setReady(false);
    };
  }, [destination.lat, destination.lng]);

  useEffect(() => {
    if (!ready || !anchor || !mapRef.current || !layersRef.current) return undefined;
    const map = mapRef.current;
    const layers = layersRef.current;
    const profile = PROFILE[mode] || "driving";
    let cancelled = false;
    setStatus(gpsRef.current ? "Tracé depuis ta position…" : "Tracé du trajet…");
    const url = `https://router.project-osrm.org/route/v1/${profile}/${anchor.lng},${anchor.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("route");
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const routes = Array.isArray(data.routes) ? data.routes : [];
        const route = routes.slice().sort((left, right) => left.duration - right.duration)[0];
        if (!route?.geometry?.coordinates?.length) throw new Error("empty");
        layers.clearLayers();
        const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        pathRef.current = latlngs;
        L.polyline(latlngs, { color: "#ffffff", weight: 10, opacity: 0.9, lineCap: "round", lineJoin: "round" }).addTo(layers);
        const line = L.polyline(latlngs, { color: "#003b29", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(layers);
        L.marker([destination.lat, destination.lng], { icon: pinIcon("arrivee"), zIndexOffset: 400, keyboard: false })
          .addTo(layers)
          .bindTooltip("Arrivée", { direction: "top" });
        startRef.current = L.marker([anchor.lat, anchor.lng], { icon: pinIcon("depart"), zIndexOffset: 600, keyboard: false })
          .addTo(layers)
          .bindTooltip("Départ", { direction: "top" });
        if (!fittedRef.current) {
          map.fitBounds(line.getBounds(), { padding: [42, 42] });
          fittedRef.current = true;
        }
        const nextSteps = (route.legs || []).flatMap((leg) => leg.steps || []).filter((step) => step.distance > 0 || step.maneuver?.type === "arrive");
        setSummary({ distance: route.distance, duration: route.duration });
        setSteps(nextSteps.slice(0, 12));
        setStatus(gpsRef.current ? "L’icône de départ suit ton déplacement." : "Position non partagée : le départ reste au quartier.");
        const packed = nextSteps.slice(0, 6).map((step) => ({ text: stepLabel(step), meters: Math.round(step.distance || 0) }));
        api.guideRoute({
          origin: anchor,
          destination,
          mode,
          distance_m: Math.round(route.distance || 0),
          steps: packed,
        }).then((advice) => {
          if (!cancelled && advice?.guidance) setGuide(advice.next ? `${advice.next}. ${advice.guidance}` : advice.guidance);
        }).catch(() => {});
      })
      .catch(() => {
        if (cancelled) return;
        layers.clearLayers();
        pathRef.current = [];
        L.marker([destination.lat, destination.lng], { icon: pinIcon("arrivee"), zIndexOffset: 400, keyboard: false }).addTo(layers);
        startRef.current = L.marker([anchor.lat, anchor.lng], { icon: pinIcon("depart"), zIndexOffset: 600, keyboard: false }).addTo(layers);
        map.fitBounds(L.latLngBounds([[anchor.lat, anchor.lng], [destination.lat, destination.lng]]), { padding: [42, 42] });
        setSummary(null);
        setSteps([]);
        setGuide("");
        setStatus("Le tracé routier est indisponible. Les icônes de départ et d’arrivée restent sur le plan.");
      });
    return () => {
      cancelled = true;
    };
  }, [ready, anchor, destination.lat, destination.lng, mode]);

  useEffect(() => {
    if (!live || !startRef.current) return undefined;
    startRef.current.setLatLng([live.lat, live.lng]);
    const arrow = startRef.current.getElement()?.querySelector("[data-arrow]");
    if (arrow && live.heading != null) arrow.style.transform = `rotate(${live.heading}deg)`;
    const meters = haversine(live, destination);
    setRemain(meters);
    const threshold = Math.min(80, Math.max(45, Number(live.accuracy) || 45));
    if (meters <= threshold) {
      setArrived(true);
      if (!told.current) {
        told.current = true;
        notesRef.current.push({
          id: `arrived:${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`,
          tone: "success",
          keep: true,
          title: "Tu es arrivé",
          body: "Le point de collecte est atteint.",
        });
      }
    }
    const coords = pathRef.current;
    if (coords.length > 1 && meters > threshold) {
      const nearest = nearestOnPath(live, coords);
      let best = 0;
      let bestDistance = Infinity;
      steps.forEach((step, index) => {
        const location = step.maneuver?.location;
        if (!location) return;
        const gap = haversine(live, { lng: location[0], lat: location[1] });
        if (gap < bestDistance) {
          bestDistance = gap;
          best = index;
        }
      });
      setActive(best);
      const moved = haversine(live, anchor || live);
      if (nearest.meters > 80 && moved > 25 && Date.now() - rerouteAt.current > 20000) {
        rerouteAt.current = Date.now();
        setAnchor({ lat: live.lat, lng: live.lng });
        setStatus("Tu as quitté le tracé. Nouveau trajet en cours…");
      }
    }
    const map = mapRef.current;
    if (map) {
      const inside = map.getBounds().pad(-0.2).contains([live.lat, live.lng]);
      if (!inside) map.panTo([live.lat, live.lng], { animate: true });
    }
    return undefined;
  }, [live, destination.lat, destination.lng, steps, anchor]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-surface-container-lowest">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="font-label-md font-bold text-on-surface">Plan de collecte</p>
          <p className="font-body-sm text-on-surface-variant">{arrived ? "Tu es arrivé" : status}</p>
        </div>
        <div className="text-right">
          {arrived ? (
            <p className="font-label-md font-bold text-primary">Arrivé</p>
          ) : (
            <>
              <p className="font-label-md font-bold text-primary">{summary ? formatDuration(summary.duration) : "—"}</p>
              <p className="font-body-sm text-on-surface-variant">{remain != null ? `${formatDistance(remain)} restants` : summary ? formatDistance(summary.distance) : ""}</p>
            </>
          )}
        </div>
      </div>
      <div className="relative">
        <div ref={box} className="collecte-map relative z-0 h-[420px] w-full" />
        {arrived && (
          <div className="absolute inset-x-4 top-4 z-10 rounded-2xl bg-[#003b29] px-4 py-3 text-white shadow-lg">
            <p className="font-label-md font-bold">Tu es arrivé</p>
            <p className="font-body-sm text-white/85">Le point de collecte est là.</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 px-4 pt-3 font-label-sm text-on-surface-variant">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1e523f]" /> Départ</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a73918]" /> Arrivée</span>
      </div>
      {guide && !arrived && <p className="px-4 pt-2 font-body-sm text-on-surface">{guide}</p>}
      {mode === "transit" && !arrived && (
        <p className="px-4 pt-2 font-body-sm text-on-surface-variant">Le transport suit le réseau routier jusqu’au point de collecte.</p>
      )}
      {steps.length > 0 && !arrived && (
        <ol className="flex max-h-56 flex-col gap-2 overflow-auto px-4 py-3">
          {steps.map((step, index) => (
            <li key={`${index}-${step.distance}`} className={`flex items-start gap-2 font-body-sm ${index === active ? "font-bold text-primary" : "text-on-surface"}`}>
              <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-label-sm ${index === active ? "bg-primary text-on-primary" : "bg-primary-fixed text-primary"}`}>{index + 1}</span>
              <span>{stepLabel(step)}{step.distance ? ` · ${formatDistance(step.distance)}` : ""}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
