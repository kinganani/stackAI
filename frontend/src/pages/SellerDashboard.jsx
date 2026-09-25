import { useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import DashboardLayout, { CatalogCard, PageHeader, catalogCell, catalogHead } from "../components/DashboardLayout.jsx";
import PlaceFields from "../components/PlaceFields.jsx";
import { api } from "../api.js";
import { useNotify } from "../notify.jsx";

function compressPhoto(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const longest = Math.max(image.width, image.height) || 1;
      const scale = Math.min(1, 1280 / longest);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob ? new File([blob], "produit.jpg", { type: "image/jpeg" }) : file);
      }, "image/jpeg", 0.82);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    image.src = url;
  });
}

const groups = [
  {
    label: "Espace",
    links: [
      { to: "/vendeur", label: "Vue d’ensemble", icon: "dashboard", end: true },
      { to: "/vendeur/publier", label: "Publier un lot", icon: "add" },
    ],
  },
  {
    label: "Catalogue",
    links: [
      { to: "/vendeur/produits", label: "Mes produits", icon: "inventory_2" },
      { to: "/vendeur/demandes", label: "Demandes", icon: "notifications" },
    ],
  },
];

const categoryLabel = {
  tomate: "Tomates",
  banane: "Plantains",
  poisson: "Poisson",
  autre: "Autres produits",
};

const LEVEL_LABEL = {
  ok: "Fenêtre encore large",
  surveiller: "À surveiller",
  urgent: "Vider le stock maintenant",
  critique: "Dernières heures — agir",
};

function needsDump(plan) {
  return Boolean(plan && (plan.level === "urgent" || plan.level === "critique" || plan.apply));
}

function ConservePanel({ plan, product, image, channel, onDump, dumping }) {
  if (!plan || plan.level === "ok") return null;
  const level = plan.level;
  const hot = needsDump(plan);
  if (!hot) {
    return (
      <article className="rounded-2xl border border-[rgba(0,59,41,0.14)] bg-white px-4 py-3 text-[#003b29]">
        <p className="font-label-md font-bold">{product} · {LEVEL_LABEL.surveiller}</p>
        <p className="mt-1 font-body-sm text-on-surface-variant">{plan.why}</p>
      </article>
    );
  }
  const critique = level === "critique";
  return (
    <article className={`relative overflow-hidden rounded-[24px] p-4 text-white shadow-[0_18px_40px_-16px_rgba(167,57,24,0.7)] ${critique ? "bg-[#8c1d18]" : "bg-[#a73918]"}`}>
      <span className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
      <div className="relative flex items-start gap-3">
        {image ? (
          <img src={image} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/40" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <span className="material-symbols-outlined text-[28px]">hourglass_bottom</span>
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 font-label-sm font-bold uppercase tracking-wide">
            <span className="inline-block h-2 w-2 animate-ping rounded-full bg-white" />
            {LEVEL_LABEL[level]}
          </p>
          <h2 className="mt-1 font-headline-sm text-[22px] font-extrabold leading-tight">{product}</h2>
          <p className="mt-1 font-body-sm text-white/90">{plan.why} {plan.buyers}.</p>
          {channel === "transform" && (
            <p className="mt-2 rounded-xl bg-white/15 px-3 py-2 font-label-md font-bold">Plus proposé sur le marché classique : fil valorisation, prix abaissé.</p>
          )}
        </div>
      </div>
      <ul className="relative mt-3 space-y-1 font-body-sm text-white/95">
        {(plan.keep || []).map((item) => (
          <li key={item} className="flex gap-2">
            <span className="material-symbols-outlined mt-0.5 text-[18px] text-white/80">check_circle</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/12 px-3 py-2">
          <p className="font-label-sm uppercase tracking-wide text-white/70">En ligne</p>
          <p className="font-headline-sm font-extrabold">{Number(plan.current_price || 0).toLocaleString("fr-FR")} F</p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-2 text-[#a73918]">
          <p className="font-label-sm uppercase tracking-wide">Sauvetage{plan.cut_percent ? ` −${plan.cut_percent} %` : ""}</p>
          <p className="font-headline-sm font-extrabold">{Number(plan.dump_price || 0).toLocaleString("fr-FR")} F</p>
        </div>
        <div className="col-span-2 rounded-2xl bg-white/12 px-3 py-2 sm:col-span-1">
          {plan.next_drop ? (
            <>
              <p className="font-label-sm uppercase tracking-wide text-white/70">Prochain palier</p>
              <p className="font-label-md font-bold">{plan.next_drop.in_hours} h · {Number(plan.next_drop.price).toLocaleString("fr-FR")} F</p>
            </>
          ) : (
            <>
              <p className="font-label-sm uppercase tracking-wide text-white/70">Palier</p>
              <p className="font-label-md font-bold">Dernier palier atteint</p>
            </>
          )}
        </div>
      </div>
      {plan.apply && onDump && (
        <button type="button" onClick={onDump} disabled={dumping} className="relative mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-4 font-label-lg font-extrabold text-[#a73918] disabled:opacity-60">
          {dumping ? "Application…" : `Appliquer ${Number(plan.dump_price).toLocaleString("fr-FR")} FCFA en ligne`}
        </button>
      )}
    </article>
  );
}

function Frame({ children }) {
  return (
    <DashboardLayout groups={groups} home="/vendeur">
      {children}
    </DashboardLayout>
  );
}

function Home() {
  const notes = useNotify();
  const [stocks, setStocks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [dumping, setDumping] = useState("");

  useEffect(() => {
    Promise.all([api.myStocks(), api.myReservations()])
      .then(([lots, rows]) => {
        setStocks(lots);
        setRequests(rows);
        (Array.isArray(lots) ? lots : []).forEach((row) => {
          if (!needsDump(row.conservation)) return;
          notes.push({
            id: `conserve:${row.id}`,
            tone: "warning",
            keep: true,
            title: `Vider ${row.product}`,
            body: `${Number(row.hours_left || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} h restantes · sauvetage ${Number(row.conservation.dump_price).toLocaleString("fr-FR")} FCFA`,
            href: "/vendeur",
          });
        });
      })
      .catch((err) => setError(err.message));
  }, []);

  const liveRows = stocks.filter((row) => row.status === "live" || row.status === "partial");
  const live = liveRows.length;
  const waiting = requests.filter((row) => row.status === "pending_payment" || row.status === "pending_priority").length;
  const fragile = liveRows.filter((row) => needsDump(row.conservation));
  const watching = liveRows.filter((row) => row.conservation?.level === "surveiller" && !needsDump(row.conservation));

  async function applyDump(row) {
    const plan = row.conservation;
    if (!plan?.apply) return;
    setDumping(row.id);
    setError("");
    try {
      const updated = await api.updateStock(row.id, {
        product: row.product,
        description: lotDescription(row),
        quarter: row.quarter,
        qty: row.qty_available,
        market_price: plan.dump_market_price,
        category: row.category,
      });
      setStocks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      notes.push({
        tone: "success",
        title: "Prix de sauvetage appliqué",
        body: `${updated.product} : ${Number(updated.published_price).toLocaleString("fr-FR")} FCFA en ligne.`,
      });
    } catch (err) {
      setError(err.message);
      notes.push({ tone: "error", title: "Baisse impossible", body: err.message });
    } finally {
      setDumping("");
    }
  }

  return (
    <Frame>
      <PageHeader icon="dashboard" title="Vue d’ensemble" subtitle="Les lots publiés sont enregistrés, puis visibles dans le rayon des clients.">
        <Link to="/vendeur/publier" className="inline-flex h-11 items-center gap-1 rounded-xl bg-primary px-4 font-label-md text-on-primary">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nouveau lot
        </Link>
      </PageHeader>
      {error && <p className="mb-4 rounded-xl bg-error-container px-3 py-2 font-body-sm text-on-error-container">{error}</p>}
      {fragile.length > 0 && (
        <div className="mb-5 flex flex-col gap-3">
          {fragile.map((row) => (
            <ConservePanel
              key={row.id}
              plan={row.conservation}
              product={row.product}
              image={row.image_url}
              channel={row.channel}
              dumping={dumping === row.id}
              onDump={() => applyDump(row)}
            />
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Lots en ligne", String(live), "inventory_2"],
          ["Demandes à valider", String(waiting), "notifications"],
          ["Lots enregistrés", String(stocks.length), "dataset"],
        ].map(([label, value, icon]) => (
          <article key={label} className="rounded-[22px] bg-white p-5 shadow-[0_10px_30px_-18px_rgba(0,59,41,0.45)]">
            <span className="material-symbols-outlined text-primary">{icon}</span>
            <p className="mt-3 font-label-sm uppercase tracking-[0.08em] text-[#8b95a1]">{label}</p>
            <p className="mt-1 text-[28px] font-extrabold text-[#102033]">{value}</p>
          </article>
        ))}
      </div>
      {watching.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {watching.map((row) => (
            <ConservePanel key={row.id} plan={row.conservation} product={row.product} image={row.image_url} />
          ))}
        </div>
      )}
    </Frame>
  );
}

function Publish() {
  const navigate = useNavigate();
  const notes = useNotify();
  const cameraInput = useRef(null);
  const importInput = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const jobs = useRef(new Map());
  const [error, setError] = useState("");
  const [refusal, setRefusal] = useState("");
  const [pending, setPending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("200");
  const [qty, setQty] = useState("10");
  const [listening, setListening] = useState(false);

  async function listenVoice() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) {
      notes.push({ tone: "error", title: "Voix indisponible", body: "Utilise Chrome pour dicter le lot." });
      return;
    }
    setListening(true);
    setError("");
    const rec = new Speech();
    rec.lang = "fr-FR";
    rec.interimResults = false;
    rec.onresult = async (event) => {
      const transcript = Array.from(event.results).map((row) => row[0].transcript).join(" ").trim();
      try {
        const extracted = await api.voiceDeclare(transcript);
        if (extracted.product) setProduct(extracted.product);
        if (extracted.qty) setQty(String(extracted.qty));
        notes.push({
          tone: "success",
          title: "Déclaration vocale",
          body: extracted.product ? `${extracted.product}${extracted.qty ? ` · ${extracted.qty} kg` : ""}` : "Aucun produit reconnu. Reprends.",
        });
      } catch (err) {
        notes.push({ tone: "error", title: "Voix illisible", body: err.message });
      } finally {
        setListening(false);
      }
    };
    rec.onerror = () => {
      setListening(false);
      notes.push({ tone: "error", title: "Micro refusé", body: "Autorise le micro ou saisis le lot à la main." });
    };
    rec.onend = () => setListening(false);
    rec.start();
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function adopt(next) {
    stopCamera();
    setAnalysis(null);
    setRefusal("");
    setError("");
    const prepared = await compressPhoto(next);
    setFile(prepared);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return prepared ? URL.createObjectURL(prepared) : "";
    });
  }

  function onFile(event) {
    const next = event.target.files?.[0] || null;
    event.target.value = "";
    if (next) adopt(next);
  }

  async function openCamera() {
    setError("");
    setRefusal("");
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInput.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      cameraInput.current?.click();
    }
  }

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      adopt(new File([blob], "prise.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }

  useEffect(() => {
    if (!file) return undefined;
    const key = `${file.size}:${file.lastModified}:${file.name}`;
    let job = jobs.current.get(key);
    if (!job) {
      job = (async () => {
        let last;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const body = new FormData();
          body.append("image", file);
          try {
            return await api.analyzeLot(body);
          } catch (err) {
            last = err;
            if ((err.status !== 503 && err.status !== 429) || attempt === 1) throw err;
            await new Promise((resolve) => setTimeout(resolve, 2500));
          }
        }
        throw last;
      })();
      jobs.current.set(key, job);
    }
    let cancelled = false;
    setAnalyzing(true);
    setAnalysis(null);
    setRefusal("");
    setError("");
    job
      .then((result) => {
        if (cancelled) return;
        setAnalysis(result);
        setProduct(result.product || "");
      })
      .catch((err) => {
        if (cancelled) return;
        jobs.current.delete(key);
        setAnalysis(null);
        if (err.payload?.refused) setRefusal(err.message);
        else {
          setError(err.message);
          notes.push({ tone: "error", title: "Analyse impossible", body: err.message });
        }
      })
      .finally(() => {
        if (!cancelled) setAnalyzing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  async function onSubmit(event) {
    event.preventDefault();
    if (!analysis) {
      setError("Analyse la photo avant de publier le lot.");
      return;
    }
    const data = new FormData(event.currentTarget);
    const description = String(data.get("description") || "").trim();
    const quarter = String(data.get("quarter") || "").trim();
    setPending(true);
    setError("");
    try {
      await api.createStock({
        analysis_id: analysis.id,
        product: product.trim(),
        qty: Number(qty),
        unit: "kg",
        market_price: Number(price),
        quarter,
        lat: Number(data.get("lat")),
        lng: Number(data.get("lng")),
        adresse_collecte: description ? `${quarter}, Lomé — ${description}` : `${quarter}, Lomé`,
      });
      notes.push({ tone: "success", keep: true, title: "Lot publié", body: `${product.trim()} est en ligne.`, href: "/vendeur/produits" });
      navigate("/vendeur/produits");
    } catch (err) {
      if (err.payload?.refused) {
        setRefusal(err.message);
        notes.push({ tone: "error", title: "Publication refusée", body: err.message });
      } else {
        setError(err.message);
        notes.push({ tone: "error", title: "Publication impossible", body: err.message });
      }
      setPending(false);
    }
  }

  const asked = Number(price) || 0;

  return (
    <Frame>
      <PageHeader icon="add_box" title="Nouveau lot" subtitle="Prends ou importe une photo. L’analyse démarre toute seule, avant la publication." />
      <form className="grid max-w-xl gap-3 rounded-[22px] bg-white p-5 shadow-[0_10px_30px_-18px_rgba(0,59,41,0.45)]" onSubmit={onSubmit}>
        {error && <p className="rounded-xl bg-error-container px-3 py-2 font-body-sm text-on-error-container">{error}</p>}
        {refusal && (
          <div role="alert" className="rounded-xl border border-[rgba(167,57,24,0.28)] bg-[rgba(167,57,24,0.12)] px-4 py-3 text-[#6b2414]">
            <p className="font-label-md font-bold">Publication refusée</p>
            <p className="mt-1 font-body-sm">{refusal}</p>
          </div>
        )}
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" onChange={onFile} />
        <input ref={importInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} />
        <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-[#f4f7f6] ${refusal ? "border-secondary" : "border-[#e2e8f0]"}`}>
          {cameraOn ? (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          ) : preview ? (
            <img src={preview} alt="Aperçu du lot" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-outline">
              <span className="material-symbols-outlined text-[36px] text-primary">photo_camera</span>
              <p className="font-body-sm">Cadre 4:3. La photo du produit s’affiche ici, prise ou importée.</p>
            </div>
          )}
          {analyzing && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/55 text-on-primary font-label-md">
              Analyse de la photo…
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {cameraOn ? (
            <>
              <button type="button" onClick={capture} className="h-11 rounded-xl bg-primary font-label-md text-on-primary">Prendre la photo</button>
              <button type="button" onClick={stopCamera} className="h-11 rounded-xl border border-[#e2e8f0] font-label-md">Annuler</button>
            </>
          ) : (
            <>
              <button type="button" onClick={openCamera} className="inline-flex h-11 items-center justify-center gap-1 rounded-xl bg-primary font-label-md text-on-primary">
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                Appareil photo
              </button>
              <button type="button" onClick={() => importInput.current?.click()} className="inline-flex h-11 items-center justify-center gap-1 rounded-xl border border-primary font-label-md text-primary">
                <span className="material-symbols-outlined text-[18px]">upload</span>
                Importer
              </button>
              <button type="button" onClick={listenVoice} disabled={listening} className="inline-flex h-11 items-center justify-center gap-1 rounded-xl border border-primary font-label-md text-primary disabled:opacity-60 sm:col-span-1 col-span-2">
                <span className="material-symbols-outlined text-[18px]">mic</span>
                {listening ? "Écoute…" : "Dicter le lot"}
              </button>
            </>
          )}
        </div>
        {analysis && (
          <div className="rounded-xl border border-[rgba(0,59,41,0.16)] bg-[rgba(0,59,41,0.08)] px-3 py-3 font-body-sm text-[#003b29]">
            <p className="font-label-md font-bold">Produit acceptable · qualité {Math.round(Number(analysis.quality_percent) || 0)} %</p>
            <p className="mt-1">{analysis.disclaimer}</p>
            <p className="mt-2">Conservation estimée : <strong>{analysis.hours_left} h</strong>. Altération estimée : {Math.round(Number(analysis.spoilage_percent) || 0)} %. Confiance : {Math.round(Number(analysis.confidence) * 100)} %.</p>
            {Array.isArray(analysis.aspects) && analysis.aspects.length > 0 && (
              <ul className="mt-2 grid grid-cols-2 gap-1">
                {analysis.aspects.map((item) => (
                  <li key={item.key}>{item.label} · {item.score} %</li>
                ))}
              </ul>
            )}
            <p className="mt-1">{analysis.reason}</p>
            {analysis.printed_expiry && (
              <p className="mt-1">Une date est lisible sur la photo ({analysis.printed_expiry}). Elle est affichée à part et ne sert pas de preuve.</p>
            )}
            <ul className="mt-3 space-y-1">
              {(analysis.bands || []).map((band) => {
                const active = Number(analysis.ratio) === Number(band.ratio);
                const amount = Math.round(asked * Number(band.ratio));
                return (
                  <li key={band.label} className={active ? "font-bold text-[#003b29]" : "text-[#1e523f]/80"}>
                    {band.label} · dès {band.min_hours} h restantes · {Math.round(band.ratio * 100)} % · {amount.toLocaleString("fr-FR")} FCFA
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {analysis?.conservation && needsDump(analysis.conservation) && (
          <ConservePanel
            plan={{
              ...analysis.conservation,
              current_price: Math.max(1, Math.round(asked * Number(analysis.ratio || 1))),
              dump_price: Math.max(1, Math.round(asked * Number(analysis.ratio || 1) * (1 - Number(analysis.conservation.extra_cut || 0)))),
              cut_percent: asked ? Math.round((1 - Math.max(1, Math.round(asked * Number(analysis.ratio || 1) * (1 - Number(analysis.conservation.extra_cut || 0)))) / asked) * 100) : 0,
              apply: false,
            }}
            product={product || analysis.product}
            image={preview}
          />
        )}
        <label className="flex flex-col gap-1 font-label-md">Produit
          <input required value={product} onChange={(event) => setProduct(event.target.value)} className="h-12 rounded-xl border border-[#e2e8f0] px-3" placeholder="Tomates de Kovié" />
        </label>
        <label className="flex flex-col gap-1 font-label-md">Description
          <textarea required name="description" rows={3} className="rounded-xl border border-[#e2e8f0] px-3 py-2" placeholder="Cageots du matin, encore fermes" />
        </label>
        <label className="flex flex-col gap-1 font-label-md">Quantité (kg)
          <input required name="qty" type="number" min="1" value={qty} onChange={(event) => setQty(event.target.value)} className="h-12 rounded-xl border border-[#e2e8f0] px-3" />
        </label>
        <PlaceFields />
        <label className="flex flex-col gap-1 font-label-md">Prix quand le produit est encore frais (FCFA / kg)
          <input required name="price" type="number" min="1" value={price} onChange={(event) => setPrice(event.target.value)} className="h-12 rounded-xl border border-[#e2e8f0] px-3" />
        </label>
        <button type="submit" disabled={pending || analyzing || !analysis || Boolean(refusal)} className="h-12 rounded-xl bg-primary font-label-lg text-on-primary disabled:opacity-60">
          {pending ? "Enregistrement…" : "Publier"}
        </button>
      </form>
    </Frame>
  );
}

const quarters = ["Assigamé", "Bè", "Tokoin", "Hedzranawoé", "Déckon", "Adidogomé", "Kégué", "Agoè"];

function stockState(row) {
  if (row.status === "cancelled") return "Retiré";
  if (row.status === "expired") return "Expiré";
  if (row.qty_available <= 0 || row.status === "exhausted") return "Rupture";
  return "En ligne";
}

function lotDescription(row) {
  const text = String(row.adresse_collecte || "");
  const cut = text.indexOf(" — ");
  return cut === -1 ? "" : text.slice(cut + 3).trim();
}

function Products() {
  const notes = useNotify();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dumping, setDumping] = useState("");

  useEffect(() => {
    api.myStocks().then(setRows).catch((err) => setError(err.message));
  }, []);

  function openEdit(row) {
    setError("");
    setEditing({
      id: row.id,
      product: row.product,
      description: lotDescription(row),
      quarter: row.quarter || "",
      qty: String(row.qty_available),
      market_price: String(row.market_price),
      category: row.category,
      published_price: row.published_price,
      unit: row.unit,
    });
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateStock(editing.id, {
        product: editing.product.trim(),
        description: editing.description.trim(),
        quarter: editing.quarter.trim(),
        qty: Number(editing.qty),
        market_price: Number(editing.market_price),
        category: editing.category,
      });
      setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setEditing(null);
      notes.push({ tone: "success", title: "Lot modifié", body: updated.product });
    } catch (err) {
      setError(err.message);
      notes.push({ tone: "error", title: "Modification impossible", body: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function applyDump(row) {
    const plan = row.conservation;
    if (!plan?.apply) return;
    setDumping(row.id);
    setError("");
    try {
      const updated = await api.updateStock(row.id, {
        product: row.product,
        description: lotDescription(row),
        quarter: row.quarter,
        qty: row.qty_available,
        market_price: plan.dump_market_price,
        category: row.category,
      });
      setRows((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      notes.push({
        tone: "success",
        title: "Prix de sauvetage appliqué",
        body: `${updated.product} : ${Number(updated.published_price).toLocaleString("fr-FR")} FCFA en ligne.`,
      });
    } catch (err) {
      setError(err.message);
      notes.push({ tone: "error", title: "Baisse impossible", body: err.message });
    } finally {
      setDumping("");
    }
  }

  async function remove(id) {
    setError("");
    try {
      const updated = await api.cancelStock(id);
      setRows((current) => current.map((row) => (row.id === id ? updated : row)));
      setEditing((current) => (current?.id === id ? null : current));
      notes.push({ tone: "success", title: "Lot retiré", body: "Il n’est plus visible sur le marché." });
    } catch (err) {
      setError(err.message);
      notes.push({ tone: "error", title: "Retrait impossible", body: err.message });
    }
  }

  return (
    <Frame>
      <PageHeader icon="inventory_2" title="Catalogue des lots" subtitle="Gère les produits publiés depuis ton exploitation.">
        <Link to="/alertes" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-sm" aria-label="Alertes">
          <span className="material-symbols-outlined">notifications</span>
        </Link>
        <Link to="/vendeur/publier" className="inline-flex h-11 items-center gap-1 rounded-xl bg-primary px-4 font-label-md text-on-primary">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nouveau lot
        </Link>
      </PageHeader>
      {error && <p className="mb-4 rounded-xl bg-error-container px-3 py-2 font-body-sm text-on-error-container">{error}</p>}
      <div className="mb-4 flex flex-col gap-3">
        {rows.filter((row) => (row.status === "live" || row.status === "partial") && needsDump(row.conservation)).map((row) => (
          <ConservePanel
            key={row.id}
            plan={row.conservation}
            product={row.product}
            image={row.image_url}
            channel={row.channel}
            dumping={dumping === row.id}
            onDump={() => applyDump(row)}
          />
        ))}
      </div>
      {editing && (
        <form onSubmit={saveEdit} className="mb-4 grid gap-3 rounded-[22px] bg-white p-5 shadow-[0_10px_30px_-18px_rgba(0,59,41,0.45)]">
          <p className="font-label-lg text-[#102033]">Modifier le lot</p>
          <label className="flex flex-col gap-1 font-label-md">Produit
            <input required value={editing.product} onChange={(event) => setEditing({ ...editing, product: event.target.value })} className="h-12 rounded-xl border border-[#e2e8f0] px-3" />
          </label>
          <label className="flex flex-col gap-1 font-label-md">Description
            <textarea value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} rows={3} className="rounded-xl border border-[#e2e8f0] px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 font-label-md">Catégorie
            <select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} className="h-12 rounded-xl border border-[#e2e8f0] bg-white px-3">
              {Object.entries(categoryLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-label-md">Quartier
            <input required value={editing.quarter} onChange={(event) => setEditing({ ...editing, quarter: event.target.value })} list="quartiers-edition" className="h-12 rounded-xl border border-[#e2e8f0] px-3" placeholder="Quartier de Lomé" />
            <datalist id="quartiers-edition">
              {quarters.map((quarter) => <option key={quarter} value={quarter} />)}
            </datalist>
          </label>
          <label className="flex flex-col gap-1 font-label-md">Quantité restante ({editing.unit})
            <input required type="number" min="1" value={editing.qty} onChange={(event) => setEditing({ ...editing, qty: event.target.value })} className="h-12 rounded-xl border border-[#e2e8f0] px-3" />
          </label>
          <label className="flex flex-col gap-1 font-label-md">Prix quand le produit est encore frais (FCFA / {editing.unit})
            <input required type="number" min="1" value={editing.market_price} onChange={(event) => setEditing({ ...editing, market_price: event.target.value })} className="h-12 rounded-xl border border-[#e2e8f0] px-3" />
          </label>
          <p className="font-body-sm text-outline">Prix en ligne actuel : {Number(editing.published_price).toLocaleString("fr-FR")} FCFA. Il se recalcule selon le temps restant. Les commandes déjà envoyées gardent leur montant.</p>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="h-11 rounded-xl bg-primary px-4 font-label-md text-on-primary disabled:opacity-60">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="h-11 rounded-xl border border-[#e2e8f0] px-4 font-label-md">Annuler</button>
          </div>
        </form>
      )}
      <CatalogCard title="Tous les lots" count={rows.length}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead className={catalogHead}>
              <tr>
                {["Article", "Catégorie", "Prix (FCFA)", "Délai", "Stock", "Statut", "Actions"].map((head) => (
                  <th key={head} className={`${catalogCell} font-semibold`}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const state = stockState(row);
                const gone = state === "Rupture" || state === "Retiré" || state === "Expiré";
                return (
                  <tr key={row.id} className="border-t border-[#eef2f4]">
                    <td className={catalogCell}>
                      <div className="flex items-center gap-3">
                        {row.image_url ? (
                          <img src={row.image_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
                        ) : (
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                            <span className="material-symbols-outlined">nutrition</span>
                          </span>
                        )}
                        <span>
                          <span className="block font-label-md font-bold text-[#102033]">{row.product}</span>
                          {row.channel === "transform" && <span className="block font-label-sm font-bold text-[#a73918]">Fil valorisation</span>}
                          <span className="block font-body-sm text-outline">{row.adresse_collecte}</span>
                        </span>
                      </div>
                    </td>
                    <td className={`${catalogCell} font-body-sm text-on-surface-variant`}>{categoryLabel[row.category] || row.category} • {row.quarter}</td>
                    <td className={`${catalogCell} font-label-md`}>{Number(row.published_price).toLocaleString("fr-FR")} / {row.unit}</td>
                    <td className={`${catalogCell} font-body-sm text-on-surface-variant`}>{Number(row.hours_left || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} h</td>
                    <td className={`${catalogCell} font-bold ${gone ? "text-secondary" : "text-primary"}`}>{gone && row.qty_available <= 0 ? "Rupture" : row.qty_available}</td>
                    <td className={`${catalogCell} font-body-sm text-on-surface-variant`}>{state}</td>
                    <td className={catalogCell}>
                      {row.status === "live" || row.status === "partial" ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openEdit(row)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary text-primary" aria-label={`Modifier ${row.product}`}>
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button type="button" onClick={() => remove(row.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-on-secondary" aria-label={`Retirer ${row.product}`}>
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      ) : (
                        <span className="font-body-sm text-outline">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && !error && <p className="px-5 py-8 font-body-md text-outline">Aucun lot enregistré pour ce compte.</p>}
      </CatalogCard>
    </Frame>
  );
}

function readPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}

function Requests() {
  const notes = useNotify();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState("");

  useEffect(() => {
    api.myReservations().then(setRows).catch((err) => setError(err.message));
  }, []);

  async function accept(id) {
    setError("");
    setNotice("");
    setSending(id);
    try {
      const point = await readPosition();
      const updated = await api.acceptReservation(id, point || {});
      setRows((current) => current.map((row) => (row.id === id ? updated : row)));
      const body = point
        ? "Ta position a été envoyée au client comme point de collecte."
        : "Position non partagée : le point du lot a été envoyé au client.";
      setNotice(`Commande validée. ${body}`);
      notes.release("live:pending");
      notes.push({ id: `validated:${id}`, tone: "success", keep: true, title: "Commande validée", body, href: `/rdv?id=${id}` });
    } catch (err) {
      setError(err.message);
      notes.push({ tone: "error", title: "Validation impossible", body: err.message });
    } finally {
      setSending("");
    }
  }

  return (
    <Frame>
      <PageHeader icon="notifications" title="Demandes d’achat" subtitle="Seul le producteur valide. La validation envoie ta position comme point de collecte.">
        <Link to="/alertes" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-sm" aria-label="Alertes">
          <span className="material-symbols-outlined">notifications</span>
        </Link>
      </PageHeader>
      {error && <p className="mb-4 rounded-xl bg-error-container px-3 py-2 font-body-sm text-on-error-container">{error}</p>}
      {notice && <p className="mb-4 rounded-xl border border-[rgba(0,59,41,0.16)] bg-[rgba(0,59,41,0.08)] px-3 py-2 font-body-sm text-[#003b29]">{notice}</p>}
      <CatalogCard title="Toutes les demandes" count={rows.length}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className={catalogHead}>
              <tr>
                {["Produit", "Quantité", "Retrait", "Statut", "Actions"].map((head) => (
                  <th key={head} className={`${catalogCell} font-semibold`}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pending = row.status === "pending_payment" || row.status === "pending_priority";
                return (
                  <tr key={row.id} className="border-t border-[#eef2f4]">
                    <td className={catalogCell}>
                      <div className="flex min-w-[190px] items-center gap-3">
                        {row.image_url ? (
                          <img src={row.image_url} alt="" className="h-14 w-14 rounded-2xl object-cover ring-1 ring-[#e2e8f0]" />
                        ) : (
                          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
                            <span className="material-symbols-outlined">nutrition</span>
                          </span>
                        )}
                        <span className="font-label-md font-bold leading-tight text-[#102033]">{row.product}</span>
                      </div>
                    </td>
                    <td className={`${catalogCell} font-body-sm`}>{row.qty} {row.unit}</td>
                    <td className={`${catalogCell} font-body-sm text-on-surface-variant`}>{row.adresse_collecte}</td>
                    <td className={`${catalogCell} font-body-sm ${row.status === "accepted" ? "text-primary" : "text-on-surface-variant"}`}>
                      {row.status === "accepted" ? "Validée · point envoyé" : pending ? "En attente" : row.status}
                    </td>
                    <td className={catalogCell}>
                      <div className="flex justify-end gap-2">
                        {row.buyer_phone && (
                          <a href={`tel:+228${row.buyer_phone}`} className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#003b29] px-4 font-label-md text-white shadow-[0_8px_16px_-10px_rgba(0,59,41,0.9)]">
                            <span className="material-symbols-outlined text-[18px]">call</span>
                            {String(row.buyer_phone).replace(/(\d{2})(?=\d)/g, "$1 ").trim()}
                          </a>
                        )}
                        {pending && (
                          <button type="button" onClick={() => accept(row.id)} disabled={sending === row.id} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 font-label-md text-on-primary shadow-sm disabled:opacity-60">
                            <span className="material-symbols-outlined text-[18px]">verified</span>
                            {sending === row.id ? "Envoi du point…" : "Valider"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && !error && <p className="px-5 py-8 font-body-md text-outline">Aucune demande enregistrée.</p>}
      </CatalogCard>
    </Frame>
  );
}

export default function SellerDashboard() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="publier" element={<Publish />} />
      <Route path="produits" element={<Products />} />
      <Route path="demandes" element={<Requests />} />
    </Routes>
  );
}
