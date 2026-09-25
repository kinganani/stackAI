-- Aucun compte de démonstration.
-- Les comptes se créent depuis la page d'inscription.
-- Cette requête retire d'anciens comptes de test s'ils existent encore.

DELETE FROM profiles
WHERE phone IN ('0701000001', '0701000002', '0701000003')
   OR id IN (
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333'
   );
