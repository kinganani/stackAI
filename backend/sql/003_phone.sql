-- Si 001_schema.sql a déjà été exécuté sans la colonne phone.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone varchar(20);
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON profiles (phone);
