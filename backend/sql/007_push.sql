-- Abonnements Web Push (VAPID). Django lit cette table, il ne la recrée pas.

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    endpoint text NOT NULL,
    p256dh varchar(200) NOT NULL,
    auth varchar(100) NOT NULL,
    user_agent varchar(240) NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);
