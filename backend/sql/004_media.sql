-- Photo du lot : le fichier est sur Cloudinary, la base ne garde que l'adresse.
-- L'analyse IA est une ligne liée au lot, pas une copie du produit.

ALTER TABLE stocks
    ADD COLUMN IF NOT EXISTS image_url text,
    ADD COLUMN IF NOT EXISTS image_public_id varchar(255);

ALTER TABLE ai_analyses
    ADD COLUMN IF NOT EXISTS stock_id uuid REFERENCES stocks (id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES profiles (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ai_analyses_stock_idx ON ai_analyses (stock_id);
CREATE INDEX IF NOT EXISTS ai_analyses_seller_idx ON ai_analyses (seller_id);
