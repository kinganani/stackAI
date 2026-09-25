# LocalMatch

**Défi 1 — Agriculture & Commerce** (ESIG Tech Arena) : vente d’urgence de denrées périssables à Lomé.

Un producteur photographie son lot → le **scan IA** (Django) estime fruit ou légume, fraîcheur et moisissure, propose un prix → les acheteurs du rayon sont notifiés → réservation → **collecte** (`adresse_collecte` + Google Maps).

Dépôt : [github.com/kinganani/stackAI](https://github.com/kinganani/stackAI)

## Stack

| Couche | Techno |
| --- | --- |
| Frontend | React.js (Vite) — `frontend/` |
| Backend | Django 5 + DRF + SimpleJWT — `backend/` |
| Base | PostgreSQL (`DATABASE_URL`) ou SQLite en local |

Pas de Next.js, pas de Supabase. Le JWT **access** reste en mémoire ; le **refresh** est un cookie HttpOnly. Pas de JWT dans `localStorage`.

## Fonctionnalités (vague 1)

- Déclaration vendeur : photo du lot, quantité, quartier, expirabilité, prix
- Matching Django (proximité + urgence + volume + profil), pas un filtre km côté React
- Notifications acheteur (polling) : nouveau lot, commande acceptée (téléphone + Maps)
- Réservation avec `select_for_update` : les autres voient **la quantité restante** ; à 0, **le produit est indisponible**
- La fiche affiche **la photo du producteur**, pas une image générique
- Scan IA : fruits / légumes uniquement (pas de poisson) ; lot pourri → publication bloquée

## Lancer en local

Deux processus en parallèle. Si Django n’écoute pas sur `:8000`, Vite affiche `ECONNREFUSED` sur `/api/...`.

**1. API**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env   # ou backend/.env
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Vérifier : http://127.0.0.1:8000/api/health/

PostgreSQL optionnel :

```bash
docker compose up -d
# dans .env : DATABASE_URL=postgres://fraislink:fraislink@localhost:5432/fraislink
```

**2. Interface**

```bash
cd frontend
npm install
npm run dev
```

Ouvrir **http://localhost:5173**. Le proxy Vite envoie `/api` et `/media` vers Django.

Créer un compte via **Inscription** (producteur ou acheteur). Les comptes de seed restent possibles en local uniquement :

```bash
python manage.py seed_demo
```

## Parcours

1. Producteur → Scan IA (photo) → publier le lot
2. Acheteur → Marché (lots scorés du rayon) → bloquer une quantité → Maps
3. Producteur → Demandes → accepter → contact et itinéraire

## Sécurité (rappel)

CORS en whitelist, secrets dans `.env` (gitignoré), permissions vendeur / acheteur, ORM + `select_for_update` sur le stock.
