-- Point de collecte figé au moment où le producteur valide la commande.

ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS pickup_lat double precision,
    ADD COLUMN IF NOT EXISTS pickup_lng double precision,
    ADD COLUMN IF NOT EXISTS pickup_address varchar(240);
