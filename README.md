# LocalMatch

Vente d’urgence de stocks périssables — ESIG Tech Arena. Le navigateur parle à Django. Django parle à PostgreSQL (Supabase). Le SQL du schéma est dans `backend/sql/`.

## 1. Créer la base

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Ouvrir **SQL Editor** et exécuter, dans l’ordre :
   - `backend/sql/001_schema.sql`
   - `backend/sql/003_phone.sql` si la table existait déjà sans téléphone
   - `backend/sql/006_promo.sql`
   - `backend/sql/007_push.sql`
3. **Project Settings → Database → Connection string → URI**, mode **Session** (port **5432**), hôte du pooler `aws-1-….pooler.supabase.com`. L’utilisateur est `postgres.<ref-projet>`.
4. Copier `backend/.env.example` vers `backend/.env` et coller l’URI dans `DATABASE_URL`. Elle doit finir par `?sslmode=require`.

Il n’y a pas de compte de démonstration. L’inscription sur le site crée le compte dans `profiles`.

## 2. Lancer l’API

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

`migrate` crée seulement les tables internes de Django. Les tables métier viennent du SQL.

## 3. Lancer l’interface

```bash
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173/connexion

## 4. Déploiement Vercel (toute l’app)

Un seul projet Vercel sert l’interface **et** l’API (`/api/...`) sur le même domaine.

Dans Vercel → Project Settings → General :
- **Root Directory** : vide (racine du dépôt, **pas** `frontend`)
- **Framework Preset** : Django (forcé aussi dans `vercel.json`)

Ne te fie pas à un log `Commit: a65364e` + `pattern "wsgi.py"` : c’est l’ancien `vercel.json`. Le fichier actuel **n’a plus** de bloc `functions`.

1. Import [kinganani/stackAI](https://github.com/kinganani/stackAI).
2. Colle uniquement ces variables (Settings → Environment Variables), Production + Preview :

| Variable | Rôle |
| --- | --- |
| `SECRET_KEY` | Clé Django (longue et unique) |
| `DATABASE_URL` | **Obligatoire.** URI Supabase (port 5432, `sslmode=require`). Sans elle, login/marché plantent. |
| `GEMINI_API_KEY` | Analyse photo |
| `CLOUDINARY_URL` | `cloudinary://KEY:SECRET@CLOUD` |
| `VAPID_PUBLIC_KEY` | Push PWA (déjà dans `backend/.env` local) |
| `VAPID_PRIVATE_KEY` | Même paire, une ligne, `\n` pour les retours PEM |

Le site se déploie même si `DATABASE_URL` n’est pas encore collé (le build Vercel importe Django sans secrets). **Login / marché / API** ne marchent qu’après `DATABASE_URL` en Production + Preview, puis un nouveau deploy.

Ne mets **pas** `VITE_API_URL` : le site appelle `/api` sur le même hôte.

3. Deploy. Les hôtes `*.vercel.app` et les cookies HTTPS sont réglés tout seuls.
