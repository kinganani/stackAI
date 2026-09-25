-- LocalMatch / StockVite — schéma PostgreSQL (Supabase)
-- À coller dans Supabase → SQL Editor → Run.
-- Connexion Django : Database → Connection string → URI, mode Session, port 5432, sslmode=require.
-- Ordre : 1) ce fichier  2) backend/.env  3) python manage.py migrate

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Comptes. Django lit cette table (AUTH_USER_MODEL), il ne la recrée pas.
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone varchar(20) NOT NULL UNIQUE,
    email varchar(254) NULL UNIQUE,
    password varchar(128) NOT NULL,
    last_login timestamptz NULL,
    is_active boolean NOT NULL DEFAULT true,
    full_name varchar(120) NOT NULL,
    role varchar(10) NOT NULL CHECK (role IN ('seller', 'buyer')),
    quarter varchar(80) NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    radius_km numeric(5, 2) NOT NULL DEFAULT 5 CHECK (radius_km > 0 AND radius_km <= 50),
    buyer_type varchar(40) NULL,
    momo_alias varchar(80) NULL,
    date_joined timestamptz NOT NULL DEFAULT now(),
    CHECK (role <> 'buyer' OR buyer_type IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS stocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    product varchar(120) NOT NULL,
    category varchar(40) NOT NULL CHECK (category IN ('tomate', 'poisson', 'banane', 'autre')),
    qty_initial integer NOT NULL CHECK (qty_initial > 0),
    qty_available integer NOT NULL CHECK (qty_available >= 0 AND qty_available <= qty_initial),
    unit varchar(20) NOT NULL,
    quarter varchar(80) NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    hours_left numeric(6, 2) NOT NULL CHECK (hours_left >= 0),
    market_price integer NOT NULL CHECK (market_price >= 0),
    published_price integer NOT NULL CHECK (published_price >= 0),
    adresse_collecte varchar(240) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'live'
        CHECK (status IN ('draft', 'live', 'partial', 'exhausted', 'expired', 'cancelled')),
    published_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (status = 'draft' OR length(btrim(adresse_collecte)) > 0)
);

CREATE INDEX IF NOT EXISTS stocks_seller_idx ON stocks (seller_id);
CREATE INDEX IF NOT EXISTS stocks_status_expires_idx ON stocks (status, expires_at);

CREATE TABLE IF NOT EXISTS reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id uuid NOT NULL REFERENCES stocks (id) ON DELETE CASCADE,
    buyer_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    qty integer NOT NULL CHECK (qty > 0),
    unit_price_snapshot integer NOT NULL CHECK (unit_price_snapshot >= 0),
    amount_due integer NOT NULL CHECK (amount_due >= 0),
    status varchar(24) NOT NULL DEFAULT 'pending_payment'
        CHECK (status IN (
            'pending_priority', 'pending_payment', 'proof_review',
            'accepted', 'rejected', 'expired', 'no_show'
        )),
    reserved_until timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    pickup_lat double precision NULL,
    pickup_lng double precision NULL,
    pickup_address varchar(240) NULL
);

CREATE INDEX IF NOT EXISTS reservations_stock_status_idx ON reservations (stock_id, status);
CREATE INDEX IF NOT EXISTS reservations_buyer_idx ON reservations (buyer_id);

-- Tables vague 2 : créées maintenant, encore vides.
CREATE TABLE IF NOT EXISTS payment_proofs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id uuid NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
    channel varchar(20) NOT NULL DEFAULT 'unknown',
    amount integer NULL,
    payment_ref varchar(80) NULL,
    verdict varchar(20) NOT NULL DEFAULT 'review'
        CHECK (verdict IN ('accepted', 'review', 'rejected', 'override_accept')),
    confidence numeric(4, 3) NULL,
    phash varchar(64) NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_ref_unique
    ON payment_proofs (payment_ref) WHERE payment_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS one_accepted_proof
    ON payment_proofs (reservation_id) WHERE verdict IN ('accepted', 'override_accept');

CREATE TABLE IF NOT EXISTS cash_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    kind varchar(20) NOT NULL,
    amount integer NOT NULL,
    occurred_on date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_analyses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind varchar(20) NOT NULL CHECK (kind IN ('freshness', 'ocr', 'forecast')),
    payload jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NULL REFERENCES profiles (id) ON DELETE SET NULL,
    action varchar(40) NOT NULL,
    target varchar(80) NOT NULL,
    detail jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
