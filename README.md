# LocalMatch

Vente d’urgence de stocks périssables — ESIG Tech Arena. Le navigateur parle à Django. Django parle à PostgreSQL (Supabase). Le SQL du schéma est dans `backend/sql/`.

## 1. Créer la base

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Ouvrir **SQL Editor** et exécuter, dans l’ordre :
   - `backend/sql/001_schema.sql`
   - `backend/sql/003_phone.sql` si la table existait déjà sans téléphone
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

Vague 1 branchée : inscription, connexion, profil, déclaration de stock, liste vendeur, offres dans le rayon (score), réservation avec adresse et lien Maps. La photo Gemini reste pour la vague 2.
