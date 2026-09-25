# Plan de travail — StockVite

Référence : cahier des charges v1.1 (25 septembre 2026).
Ce document est le plan d’exécution. En cas de conflit de périmètre pendant le build, la section 4.1 du CDC (vague 1) prime. Les invariants de la section 8.1 du CDC ne se négocient pas.

## 1. Décisions figées

| Sujet | Décision |
|---|---|
| Frontend | React + Vite. Jamais d’accès direct à la base. |
| Backend | Django + Django REST Framework. Matching, lock, droits : uniquement ici. |
| Base | **Supabase = PostgreSQL hébergé.** Django s’y connecte par `DATABASE_URL` (ORM, `sslmode=require`). |
| Auth | Django + SimpleJWT. Pas Supabase Auth. Access token en mémoire. Refresh en cookie HttpOnly. |
| Carte | Leaflet. Itinéraire = lien `https://maps.google.com/?q={lat},{lng}` calculé par l’API. |
| IA vague 1 | Matching déterministe (score + phrase). Aucune clé externe. |
| IA images | **Google Gemini**, clé uniquement dans Django, à partir des activités listées en section 4. |
| Secrets | `.env` gitignoré. `.env.example` sans valeurs réelles. |

Supabase fournit la base. Le client JavaScript Supabase, la clé `anon` et la clé `service_role` ne servent pas au métier. `service_role` ne va jamais dans React.

## 2. Clés et variables

À créer avant le code qui en dépend. Les coller dans `backend/.env`, jamais dans le chat ni dans Git.

### 2.1 Tout de suite (vague 1)

| Variable | Où la prendre | Rôle |
|---|---|---|
| `SECRET_KEY` | Chaîne longue générée en local | Django |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → URI | PostgreSQL. Mode **Session** (port 5432) pour les migrations et `select_for_update`. Ajouter `?sslmode=require` si absent. |
| `DEBUG` | `True` en local, `False` en démo publique | |
| `DEMO_MODE` | `True` en démo | |
| `CORS_ALLOWED_ORIGINS` | Origine du front Vite, ex. `http://localhost:5173` | |

Le pooler transaction (port 6543) est incompatible avec les verrous de réservation. On utilise la connexion session / directe.

### 2.2 Quand l’activité image démarre (vague 2)

| Variable | Où la prendre | Activité |
|---|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) → Create API key | Vision fraîcheur et OCR des preuves |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Modèle vision + JSON, timeout 12 s |

Une seule clé. Deux usages, jamais exposés au navigateur.

| Activité CDC | Entrée | Sortie | Décision |
|---|---|---|---|
| IA-A Fraîcheur / maturation | Photo + catégorie | JSON : `product_guess`, `ripeness` 1–5, `hours_left`, `spoilage_risk`, `defects`, `confidence`, `rationale` | Fenêtre de vie, puis tarif |
| IA-D Preuve de paiement | Image et/ou SMS | JSON : canal, montant entier, réf, émetteur, destinataire, `paid_at`, `confidence` | Verdict ensuite **déterministe** (règles EF-60 à EF-67), pas le modèle |

Matching, tarif dégressif et formule `Cash(j)` restent du code Python. Le modèle ne écrit pas les tables métier. Chaque appel est ajouté dans `ai_analyses`.

## 3. Périmètre de cette exécution

### Vague 1 — à livrer en premier

Déclaration rapide, matching + notification par polling (≤ 4 s), réservation atomique, écran RDV (`adresse_collecte` + lien Maps), comptes et offres seed Abidjan, README de lancement.

### Vague 2 — après un parcours vague 1 rejouable

Photo + Gemini fraîcheur, tarif dégressif, OCR/NLP, fraude, caisse 30 jours, bouton « +6 h ». Chaque brique démarre seulement quand la précédente est démontrable, et seulement avec la clé déjà dans `.env`.

Hors de ces deux vagues : PSP Mobile Money, paiement carte, apps stores, chatbot, tracking livreur, multi-rôles, comptabilité OHADA.

## 4. Ordre de travail

### Lot A — Socle (démarrage)

1. Arborescence `backend/` (Django) et `frontend/` (Vite).
2. `backend/.env` branché sur Supabase. Migrations sur cette base.
3. Modèles `Profile`, `Stock`, `Reservation` (UUID, entiers FCFA, `adresse_collecte` non vide à la publication).
4. Auth register / login / refresh / logout + `GET/PATCH /api/me/`.
5. Rôles `seller` / `buyer`, un seul par compte. Permissions DRF.

**Fini quand** deux utilisateurs seed se connectent sur la base Supabase.

### Lot B — Déclaration

1. `POST /api/stocks/`, `GET /api/stocks/mine/`, `POST /api/stocks/{id}/cancel/`.
2. Champs : produit, quantité, unité, quartier, lat/lng, heures restantes (saisie manuelle en vague 1), `adresse_collecte`.
3. Quartiers : Adjamé, Yopougon, Cocody, Abobo, Treichville, Marcory, Plateau, Koumassi, avec centroïde si le GPS est refusé.
4. Statuts : `draft → live → partial → exhausted | expired | cancelled`.
5. Écran vendeur : formulaire ≤ 30 s + liste de ses offres.

**Fini quand** une offre live a un quartier, des coordonnées et une adresse de collecte.

### Lot C — Matching

Score affiché, phrase en français :

`0,45 × proximité + 0,25 × urgence + 0,20 × adéquation quantité + 0,10 × profil`

Visible seulement si Haversine ≤ `radius_km` (défaut 5), statut `live` ou `partial`, non expirée.

1. `GET /api/stocks/nearby/` (acheteur authentifié).
2. Carte Leaflet + liste.
3. Polling toutes les 4 s. Les 3 meilleurs scores : fenêtre `pending_priority` de 8 minutes.

**Fini quand** un acheteur à ~2 km voit l’offre scorée, et un acheteur à ~30 km ne la voit pas.

### Lot D — Réservation et RDV

1. `POST /api/reservations/` dans `transaction.atomic()` + `select_for_update()`.
2. Quantité ≤ `qty_available`. Concurrence : un 201, un 409.
3. `amount_due` et `unit_price_snapshot` immuables après création.
4. `GET /api/reservations/{id}/` : `adresse_collecte` + `maps_url` issus de `stocks.lat` / `stocks.lng`.
5. Timer 20 minutes : lock libéré, offre à nouveau réservable.
6. Annulation vendeur : locks non acceptés libérés.

**Fini quand** l’écran de confirmation montre l’adresse en grand et le lien Maps, et que la double réservation de la dernière unité renvoie 409.

### Lot E — Démo vague 1

1. Seed : vendeur, resto dans le rayon, ménage hors rayon, offre tomates ~14 h, offre poisson bientôt expirée.
2. README : venv, `DATABASE_URL` Supabase, `npm`, comptes seed, pas de secret.
3. Répétition du script 0–10 min (section 16 du CDC).

### Lot F — Images et suite (vague 2, dans l’ordre)

Chaque lot attend `GEMINI_API_KEY` dans `.env` et un parcours vague 1 déjà fluide.

1. **Maturation** — `POST /api/ai/freshness/` : photo privée, schéma JSON, timeout 12 s, un retry, sinon saisie manuelle tracée. `hours_left` borné (poisson ≤ 12 h, tomate ≤ 72 h, banane ≤ 96 h).
2. **Tarif** — `published_price = round(market_price × clamp(hours_left / hours_ref, 0,35, 1))`. Heures de référence : tomate 36 h, poisson 8 h, banane 48 h. La surcharge vendeur est tracée.
3. **OCR** — `POST /api/ai/ocr/` : capture ou SMS → champs corrigibles. Canaux : wave, orange_money, mtn_momo, moov, bank_transfer, unknown.
4. **Fraude** — règles Python sur la sortie OCR (doublon de réf, écart > 1 %, date hors fenêtre, hash perceptuel, confiance, alias MoMo). Override vendeur avec motif, dans `audit_logs`.
5. **Caisse** — `Cash(j)` formule Python j = 0..30, alerte si minimum < 150 000 FCFA. Commentaire modèle optionnel, jamais à la place du chiffre.
6. **Horloge démo** — `POST /api/demo/tick/` seulement si `DEMO_MODE=True`.

## 5. Contrats à ne pas casser

- `qty_available` entre 0 et `qty_initial`.
- Lock uniquement sous `select_for_update`.
- `amount_due` figé au lock. Le bouton « +6 h » ne le modifie pas.
- Montants en entiers FCFA.
- `payment_ref` unique dès qu’il est non nul. Au plus une preuve `accepted` par réservation.
- Collecte seulement si preuve `accepted` ou `override_accept` audité (vague 2).
- `adresse_collecte` affiché en texte React, sans HTML injecté.
- Throttle login (5/min/IP). CORS limité à l’origine du front.

## 6. Arborescence cible

```
stackAI/
  docs/PLAN_DE_TRAVAIL.md
  backend/
    .env              # gitignoré
    .env.example
    config/
    accounts/
    stocks/
    reservations/
    ai/               # vague 2
  frontend/
    src/
  README.md
```

## 7. Definition of done

La vague 1 est terminée quand ce scénario passe sans debugger :

1. Connexion vendeur seed.
2. Déclaration : produit, quantité, quartier ou pin, heures, adresse de collecte.
3. Resto dans le rayon : offre, score, phrase, notification polling. Ménage hors rayon : liste vide.
4. Réservation : adresse + Maps.
5. Deux réservations sur la dernière unité : une réussite, une 409.
6. Timer écoulé : stock relâché.

La vague 2 est terminée activité par activité, dans l’ordre de la section 4 lot F, chacune tracée dans `ai_analyses`.
