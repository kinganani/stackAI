-- L'inscription client ne demande pas de type d'acheteur : buyer_type devient facultatif.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_check;
