# LocalMatch (stackAI)

Application **Défi 1 — Agriculture & Commerce** (ESIG Tech Arena) : vente d’urgence de stocks périssables à Lomé.

Producteur déclare un lot → **IA** (matching Django + vision fraîcheur + prix selon maturité) → acheteurs du rayon notifiés → réservation prioritaire → **point de collecte** (`adresse_collecte` + Google Maps).

## Stack

- Frontend : React.js (Vite) — `frontend/`
- Backend : Django + DRF + SimpleJWT — `backend/`
- Base : PostgreSQL (`DATABASE_URL`) ou SQLite en local

## Lancer

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver

cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173 — le proxy Vite envoie `/api` vers Django (`/api/health/` pour vérifier l’API).

JWT access en mémoire ; refresh en cookie HttpOnly. Pas de JWT dans `localStorage`.

## Comptes démo (`Fraislink1!`)

| Email | Rôle |
| --- | --- |
| `afi@localmatch.tg` | Vendeur Assigamé |
| `maquis@localmatch.tg` | Acheteur Port de Pêche (voit les lots du rayon) |
| `kpalime@localmatch.tg` | Acheteur Kpalimé (hors rayon) |

## Parcours jury

1. Connexion vendeur → **Déclarer** (photo + maturité + prix) → publication.
2. Connexion acheteur → **Marché** (lots scorés) → lot → confirmation → Maps.
3. Vendeur → **Demandes** → accepter.

## Dépôt

https://github.com/kinganani/stackAI
