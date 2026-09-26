-- Lots dont le producteur a appliqué le prix de sauvetage proposé par l’IA.

ALTER TABLE stocks
    ADD COLUMN IF NOT EXISTS promo_applied_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS promo_from_price integer NULL;
