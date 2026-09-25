import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { CATEGORIES, PRODUCE_TYPE_FR, QUARTIERS, findQuartier, fmtFcfa } from "../quartiers.js";
import { useAuth } from "../AuthContext.jsx";
import { fieldClass } from "../ui.js";

export default function ScanPage() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    product_name: "",
    category: "autre",
    qty_initial: 20,
    unit: "kg",
    quartier: profile?.quartier || "Assigamé",
    adresse_collecte: "",
    description: "",
    hours: 12,
    published_price: "",
  });
  const [hint, setHint] = useState(null);
  const [preview, setPreview] = useState("");
  const [imageB64, setImageB64] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const camRef = useRef(null);
  const galleryRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const geo = useMemo(() => findQuartier(form.quartier), [form.quartier]);

  useEffect(() => {
    if (profile?.quartier) setForm((f) => ({ ...f, quartier: f.quartier || profile.quartier }));
  }, [profile]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function runAnalyze(b64) {
    if (!b64) {
      setError("Photographiez d’abord le lot : le scan IA lit la photo, pas un score figé.");
      return;
    }
    setError("");
    setHint(null);
    const data = await api.analyze({
      category: "autre",
      qty_initial: form.qty_initial,
      image_base64: b64,
    });
    setHint(data);
    setForm((f) => ({
      ...f,
      published_price: data.rotten ? "" : data.suggested_price,
      hours: data.hours_left ? Math.max(1, Math.round(data.hours_left)) : f.hours,
      category: data.category_guess || "autre",
      product_name: data.produce_label || "",
    }));
    if (data.rotten) {
      setError(data.verdict ? `${data.verdict}. Pas de prix : ce lot ne se publie pas.` : "Lot pourri : publication et prix bloqués.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
  }

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (live && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [live]);

  async function applyPhoto(dataUrl) {
    setPreview(dataUrl);
    const b64 = dataUrl.split(",")[1] || "";
    setImageB64(b64);
    try {
      await runAnalyze(b64);
    } catch (err) {
      setError(err.message);
    }
  }

  async function startCamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      camRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setLive(true);
    } catch {
      camRef.current?.click();
    }
  }

  function snap() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    applyPhoto(canvas.toDataURL("image/jpeg", 0.88));
    stopCamera();
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      let priceHint = hint;
      if (!priceHint) {
        if (!imageB64) {
          setError("Photographiez le lot : le scan IA détecte s’il est pourri.");
          setBusy(false);
          return;
        }
        priceHint = await api.analyze({
          category: "autre",
          qty_initial: form.qty_initial,
          image_base64: imageB64,
        });
        setHint(priceHint);
      }
      if (priceHint.rotten) {
        setError(
          priceHint.verdict
            ? `${priceHint.verdict}. Ce lot ne peut pas être publié.`
            : "L’IA a classé ce fruit ou légume comme pourri. Changez de denrée ou reprenez une photo nette.",
        );
        setBusy(false);
        return;
      }
      const price = Number(form.published_price || priceHint.suggested_price);
      const stock = await api.createStock({
        product_name: form.product_name,
        category: form.category,
        qty_initial: Number(form.qty_initial),
        unit: form.unit,
        quartier: form.quartier,
        lat: geo.lat,
        lng: geo.lng,
        adresse_collecte: form.adresse_collecte || `${form.quartier}, Lomé`,
        description: form.description,
        expires_at: new Date(Date.now() + Number(form.hours) * 3600 * 1000).toISOString(),
        published_price: price,
        market_price: priceHint.suggested_price,
        freshness_analysis: priceHint,
        image_base64: imageB64,
      });
      nav(`/lots`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-background text-on-surface pb-10">
      <div className="bg-surface-container-low py-space-sm">
        <div className="max-w-7xl mx-auto px-margin font-body-sm text-on-surface-variant">
          Scan IA vendeur · déclaration d’un stock en souffrance
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-margin py-space-lg grid lg:grid-cols-12 gap-space-xl">
        <div className="lg:col-span-5">
          <p className="font-label-sm text-secondary uppercase tracking-widest">Vision</p>
          <h1 className="font-headline-lg text-primary mb-space-md">Photo du lot</h1>
          <div className="rounded-xl overflow-hidden bg-surface-container-low min-h-[280px] relative">
            {live ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full min-h-[280px] object-cover bg-black" />
            ) : preview ? (
              <img src={preview} alt="Lot photographié" className="w-full max-h-[420px] min-h-[280px] object-contain bg-surface-container-low" />
            ) : (
              <div className="min-h-[280px] flex flex-col items-center justify-center text-on-surface-variant p-space-lg text-center">
                <span className="material-symbols-outlined text-5xl text-secondary">photo_camera</span>
                <p className="font-headline-sm mt-space-sm">Photographiez le lot vous-même</p>
                <p className="font-body-sm">Caméra du téléphone — chaque cliché relance une analyse neuve.</p>
              </div>
            )}
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <div className="mt-space-sm grid grid-cols-2 gap-space-sm">
            {live ? (
              <>
                <button type="button" onClick={snap} className="h-12 rounded-xl bg-secondary text-on-secondary font-label-md inline-flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined">camera</span>
                  Capturer
                </button>
                <button type="button" onClick={stopCamera} className="h-12 rounded-xl bg-surface-container-high font-label-md">
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={startCamera} className="h-12 rounded-xl bg-primary text-on-primary font-label-md inline-flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined">photo_camera</span>
                  Prendre une photo
                </button>
                <button type="button" onClick={() => galleryRef.current?.click()} className="h-12 rounded-xl bg-surface-container-high font-label-md inline-flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined">photo_library</span>
                  Galerie
                </button>
              </>
            )}
          </div>
          {hint && (
            <div className={`mt-space-md rounded-xl p-space-md ${hint.rotten ? "bg-error-container text-on-error-container" : "bg-primary-container text-on-primary-container"}`}>
              <p className="font-label-md uppercase tracking-wide">
                {hint.rotten ? "Pourri — ne pas vendre" : "Sain — publication possible"}
              </p>
              <p className="font-headline-sm mt-space-xs">
                {hint.verdict ||
                  `${PRODUCE_TYPE_FR[hint.produce_type] || "Lot"} ${hint.rotten ? "pourri" : "sain"}`}
              </p>
              <p className="font-body-sm mt-space-xs">
                {hint.produce_label || "Denrée"} · {PRODUCE_TYPE_FR[hint.produce_type] || "—"} · pourriture{" "}
                {Math.round((hint.rotten_proba || 0) * 100)} % · maturité {hint.ripeness}/5
              </p>
              {hint.vision?.metrics && (
                <p className="font-body-sm mt-space-xs opacity-80">
                  Cette photo · rouge {Math.round((hint.vision.metrics.red_ratio || 0) * 100)} % · jaune{" "}
                  {Math.round((hint.vision.metrics.yellow_ratio || 0) * 100)} % · brun{" "}
                  {Math.round((hint.vision.metrics.brown_ratio || 0) * 100)} % · moisissure{" "}
                  {Math.round((hint.vision.metrics.mold_ratio || 0) * 100)} %
                </p>
              )}
              <p className="font-body-sm mt-space-xs">{hint.vision?.rationale || hint.comment}</p>
              {hint.rotten && (
                <p className="font-label-md mt-space-sm">Ce lot ne peut pas être publié : trop dégradé pour la vente d’urgence.</p>
              )}
              {!hint.rotten && (
                <p className="mt-space-sm font-headline-sm">
                  Prix proposé {fmtFcfa(hint.suggested_price)} · conservation ~{hint.hours_left} h
                </p>
              )}
            </div>
          )}
        </div>
        <form onSubmit={submit} className="lg:col-span-7 flex flex-col gap-space-md">
          <h2 className="font-headline-md text-primary">Fiche de déclaration</h2>
          {error && <p className="text-on-error-container bg-error-container rounded-xl px-space-md py-space-sm">{error}</p>}
          <label className="font-label-md text-on-surface">Produit</label>
          <input required placeholder="Ex. Tomates de Kovié" value={form.product_name} onChange={(e) => set("product_name", e.target.value)} className={fieldClass} />
          <div className="grid sm:grid-cols-2 gap-space-md">
            <div>
              <label className="font-label-md text-on-surface">Catégorie</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className={`${fieldClass} mt-space-xs`}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-label-md text-on-surface">Quartier / localisation</label>
              <select value={form.quartier} onChange={(e) => set("quartier", e.target.value)} className={`${fieldClass} mt-space-xs`}>
                {QUARTIERS.map((q) => (
                  <option key={q.name}>{q.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-space-md">
            <div>
              <label className="font-label-md text-on-surface">Quantité</label>
              <input type="number" min="1" value={form.qty_initial} onChange={(e) => set("qty_initial", e.target.value)} className={`${fieldClass} mt-space-xs`} />
            </div>
            <div>
              <label className="font-label-md text-on-surface">Unité</label>
              <input value={form.unit} onChange={(e) => set("unit", e.target.value)} className={`${fieldClass} mt-space-xs`} />
            </div>
            <div>
              <label className="font-label-md text-on-surface">Expirabilité (h)</label>
              <input type="number" min="1" value={form.hours} onChange={(e) => set("hours", e.target.value)} className={`${fieldClass} mt-space-xs`} />
            </div>
          </div>
          <label className="font-label-md text-on-surface">Adresse de collecte</label>
          <input required placeholder="Stand, hangar, allée…" value={form.adresse_collecte} onChange={(e) => set("adresse_collecte", e.target.value)} className={fieldClass} />
          <label className="font-label-md text-on-surface">Précisions</label>
          <textarea placeholder="Variété, cageot, heure d’arrivée au stand…" value={form.description} onChange={(e) => set("description", e.target.value)} className={`${fieldClass} min-h-24`} />
          <label className="font-label-md text-on-surface">Prix publié (FCFA / kg)</label>
          <input
            required={!hint?.rotten}
            type="number"
            step="10"
            min="0"
            disabled={!!hint?.rotten}
            value={hint?.rotten ? "" : form.published_price}
            onChange={(e) => set("published_price", e.target.value)}
            placeholder={hint?.rotten ? "Bloqué — lot pourri" : "Ex. 350"}
            className={fieldClass}
          />
          <button type="button" onClick={() => runAnalyze(imageB64 || undefined).catch((err) => setError(err.message))} className="h-11 rounded-xl border border-primary text-primary font-label-md">
            Relancer le scan IA
          </button>
          <button disabled={busy || !!hint?.rotten} className="h-12 rounded-xl bg-secondary text-on-secondary font-label-lg disabled:opacity-50">
            {hint?.rotten ? "Publication impossible (pourri)" : busy ? "Publication…" : "Publier et notifier le rayon"}
          </button>
        </form>
      </div>
    </div>
  );
}
