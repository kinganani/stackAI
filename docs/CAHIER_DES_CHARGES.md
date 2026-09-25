# Cahier des charges — StockVite

| Champ | Valeur |
| --- | --- |
| Projet | StockVite |
| Compétition | ESIG Tech Arena — Hackathon Développement, phase finale |
| Défi | Défi 1 — Agriculture & Commerce : vente d’urgence de stocks périssables |
| Dépôt | https://github.com/kinganani/stackAI |
| Version du CDC | 1.1 |
| Date | 25 septembre 2026 |
| Statut | Cadrage validé — stack React / Django / PostgreSQL ; vague 1 |

---

## 1. Objet du document

Le présent cahier des charges définit le besoin, le périmètre, les exigences fonctionnelles et non fonctionnelles, les règles métier, les contrats d’intelligence artificielle, les critères d’acceptation et les livrables de **StockVite**.

Il sert de référence unique pour le développement, la démonstration devant le jury et l’arbitrage des coupes de scope.

En cas de conflit : **le présent CDC prime** sur les notes de travail ; les invariants de la section 8.1 ne se négocient pas pendant les 48 heures.

---

## 2. Contexte et problématique

### 2.1 Contexte

En Afrique de l’Ouest, les producteurs maraîchers et les commerçants subissent des pertes liées à la dégradation rapide des denrées (tomates, fruits de saison, bananes, poissons frais). L’absence de mise en relation **immédiate** avec des acheteurs de proximité (restaurateurs, cantines, ménages, transformateurs) conduit au gaspillage.

Le paiement terrain se fait rarement par carte dans l’application : il passe par **Mobile Money** ou **virement**, puis par une capture d’écran, un SMS ou un bordereau. Le vendeur n’a pas d’outil pour vérifier montant, référence et émetteur **avant** de lâcher le stock.

### 2.2 Situation-problème à traiter

Concevoir une application web/mobile d’urgence permettant à un vendeur ou producteur de :

1. déclarer rapidement un stock périssable en souffrance ;
2. géolocaliser l’offre ;
3. orienter automatiquement les produits vers des acheteurs capables de collecter vite, à prix préférentiel ;
4. **sécuriser l’encaissement** via analyse automatique des preuves de paiement réelles ;
5. **anticiper la trésorerie** à 30 jours et signaler les transactions suspectes ou en double entrée.

### 2.3 Thèse produit

StockVite n’est pas une marketplace généraliste. C’est un **contrôleur de fenêtre de survie** :

> La collecte n’est autorisée que si la denrée est encore dans sa fenêtre de vie **et** si la preuve de paiement est crédible.

Deux boucles, une horloge commune :

| Boucle | Séquence | Horloge |
| --- | --- | --- |
| Denrée | Photo → fraîcheur → heures restantes → prix dégressif → matching → réservation | `expires_at` |
| Argent | Montant dû figé → preuve hors app → OCR/NLP → fraude → verdict → collecte | `reserved_until` |

Couplage : le prix alimente le montant dû ; le montant dû alimente le contrôle OCR ; encaissements + réservations vivantes + stock encore vendable alimentent la projection de caisse `Cash(j)`.

---

## 3. Objectifs

### 3.1 Objectifs de la phase finale (règlement)

| ID | Objectif | Indicateur |
| --- | --- | --- |
| OBJ-01 | Livrer une solution fonctionnelle, exécutable, testable en direct (web, mobile ou hybride) | Parcours vendeur → acheteur → collecte rejouable |
| OBJ-02 | Intégrer au moins une IA **non superficielle**, utile au problème | 5 briques IA liées aux deux boucles (section 7) |
| OBJ-03 | Parcours utilisateur complet : accès, métier, stockage, IA | Auth, offres, preuves, caisse persistées |
| OBJ-04 | Code source sur GitHub, propre et documenté | Dépôt `kinganani/stackAI` + README |
| OBJ-05 | Démonstration 10 minutes, manipulation réelle | Script Demo Day (section 16) |

### 3.2 Objectifs métier

| ID | Objectif |
| --- | --- |
| OBJ-M1 | Réduire le délai entre « stock en souffrance » et « acheteur en route » |
| OBJ-M2 | Justifier un prix préférentiel par l’urgence réelle (fraîcheur), pas par un rabais arbitraire |
| OBJ-M3 | Empêcher de livrer un stock sur une preuve recyclée, sous-payée ou incohérente |
| OBJ-M4 | Rendre visible une tension de trésorerie à 30 jours **avant** le prochain gaspillage |

---

## 4. Périmètre

### 4.1 Découpage en vagues (décision d’équipe)

On **implémente d’abord** les trois fonctionnalités clés du brief. Le reste du CDC (vision, tarif IA, OCR paiement, trésorerie) reste spécifié mais passe en **vague 2**, une fois la vague 1 démontrable bout-en-bout.

**Vague 1 — maintenant (P0 build)**

| Module | Contenu |
| --- | --- |
| Déclaration rapide | Produit, quantité, localisation/quartier, durée d’expirabilité, **adresse de collecte (texte)** |
| Matching + notifs | Moteur de correspondance + notifications aux acheteurs dans le rayon |
| Réservation + collecte | Réservation prioritaire + point de RDV / itinéraire |

Pour rester conforme au règlement (« au moins une IA utile »), le **moteur de matching** (score proximité / urgence / quantité / profil + rayon) **est l’IA de la vague 1**. Ce n’est pas un simple filtre de distance.

**Vague 2 — ensuite (spécifié, pas bloquant)** : photo + vision fraîcheur, tarif dégressif, OCR/NLP des preuves, fraude/doublons, dashboard trésorerie 30 j, bouton « +6 h ».

### 4.2 Hors périmètre (explicite)

Les éléments suivants sont **refusés** pendant les 48 heures, même s’ils sont « nice to have » :

- Intégration API Wave, Orange Money, MTN MoMo, Moov ou banque (PSP).
- Paiement carte / escrow / compensation.
- Applications natives stores (iOS / Android).
- Chatbot conversationnel générique.
- Logistique froide, flotte, tracking GPS continu du livreur.
- Multi-rôles sur un même compte, back-office admin riche.
- Facturation OHADA / comptabilité complète.
- Notation vendeur, messagerie, i18n anglaise.

Le paiement (OCR, trésorerie) est **vague 2** : il n’est pas dans le build actuel.

### 4.4 Stack technique imposée

| Couche | Choix | Rôle |
| --- | --- | --- |
| Frontend | **React.js** (SPA, Vite) | UI vendeur/acheteur, carte, confirmation RDV |
| Backend | **Python Django** + Django REST Framework | Auth, métier, matching, API JSON |
| Base de données | **PostgreSQL** | `profiles`, `stocks`, `reservations` (et tables vague 2 plus tard) |
| Carte | Leaflet côté React | Visualisation du rayon ; GPS / pin / quartier |
| Itinéraire | Lien Google Maps | `https://maps.google.com/?q={lat},{lng}` — pas de moteur de trajet |
| Notifications vague 1 | Polling HTTP (quelques secondes) | Django Channels / WebSocket = option ultérieure |

Le frontend **ne parle jamais** à PostgreSQL. Toute règle métier (matching, lock, droits) s’exécute dans Django.

### 4.5 Zone de démo

Cible fonctionnelle : **Abidjan** (quartiers seed : Adjamé, Yopougon, Cocody, Abobo, Treichville, Marcory, Plateau, Koumassi). Devise : **FCFA (XOF)**, montants entiers.

---

## 5. Parties prenantes et acteurs système

| Acteur | Intention | Interdit |
| --- | --- | --- |
| Vendeur / producteur | Déclarer, tarifer, voir preuves de **ses** réservations, trancher un `review`, suivre la caisse | Voir les preuves des autres vendeurs ; modifier `amount_due` après lock |
| Acheteur (resto, cantine, ménage, transformateur) | Voir les offres **dans son rayon**, réserver, déposer une preuve, se rendre au RDV | Forcer un verdict `accepted` ; voir le stock hors matching |
| Service applicatif (Django) | API REST, matching, lock SQL, secrets IA | Exposer `SECRET_KEY` / `GEMINI_API_KEY` au client |
| Compte démo / jury | Rejouer le parcours seed | Compte admin Django hors démo publique |

Contrainte v1 : **un utilisateur = un seul rôle**.

---

## 6. Exigences fonctionnelles

Les identifiants `EF-xx` sont des critères de recette. Statut P0 = obligatoire pour le Demo Day.

### 6.1 Accès et profils

| ID | Exigence | Priorité |
| --- | --- | --- |
| EF-01 | L’utilisateur s’authentifie (email / mot de passe comptes seed acceptés pour la démo). | P0 |
| EF-02 | À l’inscription ou au premier login, le rôle `seller` ou `buyer` est choisi et persistant. | P0 |
| EF-03 | Le profil stocke : nom, quartier, coordonnées (GPS ou centroïde quartier), `radius_km` (défaut 5), `buyer_type` si acheteur, `momo_alias` si vendeur. | P0 |
| EF-04 | Les routes vendeur / acheteur sont gardées selon le rôle. | P0 |

### 6.2 Déclaration d’urgence

| ID | Exigence | Priorité |
| --- | --- | --- |
| EF-10 | Le vendeur déclare un stock en ≤ 30 s : produit, quantité, unité, quartier/GPS, durée d’expirabilité, **adresse de collecte en texte libre** (`adresse_collecte`, ex. « Marché de Bè, devant la pharmacie »). Pas de géocodage d’adresse. | P0 |
| EF-11 | Une photo peut être prise (caméra) ou importée. Si la caméra est refusée, un fichier image reste possible. | P0 |
| EF-12 | Si le GPS est refusé, un sélecteur de quartier Abidjan + pin carte suffit. | P0 |
| EF-13 | L’offre passe `draft` → `live` à la publication. | P0 |
| EF-14 | Le vendeur peut annuler une offre `live` / `partial` (`cancelled`) : les locks non `accepted` sont libérés. | P0 |

### 6.3 Fraîcheur et tarif

| ID | Exigence | Priorité |
| --- | --- | --- |
| EF-20 | Sur photo, le système estime un score de fraîcheur / maturité et `hours_left`. | P0 |
| EF-21 | `hours_left` est **borné par catégorie** (ex. poisson ≤ 12 h, tomate ≤ 72 h, banane ≤ 96 h). | P0 |
| EF-22 | En cas d’échec IA, le vendeur saisit manuellement les heures ; l’échec est tracé. | P0 |
| EF-23 | Le prix publié suit `published_price = round(market_price × clamp(hours_left / hours_ref, 0.35, 1))`. | P0 |
| EF-24 | Le vendeur peut surcharger le prix proposé ; la surcharge est tracée. | P1 |
| EF-25 | Un mismatch photo / catégorie déclarée à haute confiance lève un flag (ne bloque pas forcément la publication). | P1 |

### 6.4 Matching et découverte

| ID | Exigence | Priorité |
| --- | --- | --- |
| EF-30 | Un acheteur ne voit une offre que si distance Haversine ≤ `radius_km` **et** offre `live`/`partial` **et** non expirée. | P0 |
| EF-31 | Un score `s ∈ [0,1]` est affiché avec une phrase d’explication : `0.45×prox + 0.25×urgence + 0.20×qty_fit + 0.10×profile_fit`. | P0 |
| EF-32 | Carte Leaflet (React) + liste des offres visibles. | P0 |
| EF-33 | Notification in-app (Realtime ou polling ≤ 4 s) lorsqu’une offre entre dans le rayon. | P1 |
| EF-34 | Les 3 meilleurs scores d’une offre reçoivent une fenêtre `pending_priority` de 8 minutes. | P0 |

### 6.5 Réservation et rendez-vous

| ID | Exigence | Priorité |
| --- | --- | --- |
| EF-40 | L’acheteur réserve une quantité ≤ `qty_available`. | P0 |
| EF-41 | Le lock de stock est **atomique** (Django `select_for_update` en transaction). Deux réservations concurrentes : une réussit, l’autre reçoit une erreur 409. | P0 |
| EF-42 | `amount_due = qty × unit_price_snapshot`. Le snapshot est le `published_price` **au moment du lock**. Il ne change plus. | P0 |
| EF-43 | À la confirmation de réservation, l’écran affiche `stocks.adresse_collecte` **et** un lien d’itinéraire `https://maps.google.com/?q={lat},{lng}` construit à partir des coordonnées GPS **déjà** utilisées pour le matching. Aucun calcul d’itinéraire routier, aucun géocodage. Le point de collecte est celui du vendeur, saisi à la déclaration. | P0 |
| EF-43b | `adresse_collecte` est obligatoire à la publication du stock (texte non vide). Les `lat`/`lng` du stock servent au matching **et** au lien Maps ; ils ne sont pas recalculés depuis le texte. | P0 |
| EF-44 | Expiration du timer de réservation : lock libéré, offre `live`/`partial` rétablie. | P0 |
| EF-45 | Confirmation de collecte (vendeur et/ou acheteur) après paiement `accepted`. | P0 |
| EF-46 | No-show : statut `no_show`, stock relâché. | P1 |

### 6.5.1 Liaison producteur ↔ acheteur (RDV / itinéraire — MVP)

Le jury exige ce module. Implémentation **minimale et figée** :

1. **À la déclaration** : le vendeur saisit un point de collecte en texte simple, stocké dans `stocks.adresse_collecte`. Exemple : « Marché de Bè, devant la pharmacie ». Pas d’API de géocodage, pas d’autocomplete d’adresse.
2. **Les GPS du matching** (`stocks.lat`, `stocks.lng` : pin, GPS appareil ou centroïde de quartier) restent indépendants du texte. Ils servent à : (a) le rayon / le score, (b) fabriquer le lien Maps.
3. **À la réservation** : l’écran de confirmation affiche en grand `adresse_collecte`, puis un bouton / lien  
   `https://maps.google.com/?q={lat},{lng}`  
   C’est l’« itinéraire » du CDC : Google Maps ouvre le point ; on ne code pas de polyline ni d’ETA.
4. **Ce que ce n’est pas** : un point milieu acheteur–vendeur, un GPS temps réel, un recalcul d’adresse à partir du texte.

```
Vendeur déclare → stocks(adresse_collecte, lat, lng)
Acheteur dans le rayon réserve → lock
Écran confirmation → texte adresse_collecte + lien Maps(lat,lng)
```

### 6.6 Preuves de paiement (OCR / NLP)

| ID | Exigence | Priorité |
| --- | --- | --- |
| EF-50 | L’acheteur dépose une preuve : image (capture MoMo, photo de bordereau) et/ou texte SMS collé. | P0 |
| EF-51 | Le système extrait : canal, montant entier, devise, `payment_ref`, émetteur, destinataire, datetime, confiance. | P0 |
| EF-52 | Les champs extraits sont **affichés et corrigeables** avant soumission finale du verdict automatique. | P0 |
| EF-53 | Canaux reconnus : `wave`, `orange_money`, `mtn_momo`, `moov`, `bank_transfer`, `unknown`. | P0 |
| EF-54 | Normalisation : espaces insécables, `F` / `FCFA` / `XOF` → montant entier XOF. | P0 |
| EF-55 | Une réservation a **au plus une** preuve `accepted`. | P0 |
| EF-56 | Fallback : saisie manuelle montant + référence si OCR indisponible ; les règles de fraude s’appliquent quand même. | P0 |

### 6.7 Fraude et authenticité

| ID | Exigence | Priorité | Sévérité |
| --- | --- | --- | --- |
| EF-60 | `payment_ref` déjà utilisé sur une preuve `accepted` → rejet. | P0 | Bloquant |
| EF-61 | Écart relatif `|amount − amount_due| / amount_due > 1 %` → rejet. | P0 | Bloquant |
| EF-62 | `paid_at` hors `[création résa, reserved_until + 2 h]` → rejet. | P0 | Bloquant |
| EF-63 | Hash perceptuel trop proche d’une preuve déjà `accepted` → rejet (preuve recyclée / recadrée). | P0 | Bloquant |
| EF-64 | Confiance OCR &lt; 0,4 → rejet ; entre 0,4 et 0,7 → `review`. | P0 | Bloquant / souple |
| EF-65 | Destinataire n’approxime pas `momo_alias` du vendeur → `review`. | P0 | Souple |
| EF-66 | Le vendeur peut `override_accept` avec **motif obligatoire**, tracé dans l’audit. | P0 | Exception |
| EF-67 | L’UI explique le rejet en français (dû vs lu, doublon, etc.). | P0 | UX |

### 6.8 Trésorerie 30 jours

| ID | Exigence | Priorité |
| --- | --- | --- |
| EF-70 | Le vendeur dispose d’un dashboard de caisse projetée j = 0..30. | P0 |
| EF-71 | `Cash(j)` est une **formule** (pas une invention LLM) : solde + encaissements confirmés + attendus des résas `accepted` + espérance du stock non vendu − burn fixe de démo. | P0 |
| EF-72 | `p_sell = clamp(max_match_score × hours_left/hours_ref, 0.05, 0.9)` pour l’espérance du non-vendu. | P0 |
| EF-73 | Alerte « tension » si `min Cash(j) < seuil` (seuil seed : 150 000 FCFA). | P0 |
| EF-74 | Liste des alertes fraude / doublons liées à **ce** vendeur. | P0 |
| EF-75 | Un commentaire LLM de 2 phrases est optionnel pour le pitch ; il ne remplace pas le chiffre. | P1 |

### 6.9 Mode démonstration

| ID | Exigence | Priorité |
| --- | --- | --- |
| EF-80 | Compte vendeur et comptes acheteurs seed (resto proche, ménage hors rayon). | P0 |
| EF-81 | Offres seed (dont tomates ~14 h, poisson bientôt expiré). | P0 |
| EF-82 | Trois preuves types : OK, doublon, mauvais montant. | P0 |
| EF-83 | Bouton « +6 h » : incrémente `clock_offset_hours`, recalcule `hours_left` / `published_price` / `Cash(j)` ; **ne modifie pas** `amount_due` des réservations déjà lockées. | P0 |
| EF-84 | Le bouton n’existe que si `DEMO_MODE` est actif ; action journalisée. | P0 |
| EF-85 | Commande de reset du jeu de démo. | P1 |

---

## 7. Exigences d’intelligence artificielle

### 7.1 Principe directeur (règlement)

L’IA n’est pas un ajout cosmétique. Chaque brique **change une décision métier** (publier, matcher, tarifer, lâcher le stock, alerter la caisse).

**Interdit** : chatbot générique ; laisser le LLM écrire directement les tables métier ; afficher un score sans règle reproductible.

### 7.2 Briques

| ID | Brique | Entrée | Sortie | Décision métier |
| --- | --- | --- | --- | --- |
| IA-A | Vision fraîcheur | Photo + catégorie + now | JSON : `product_guess`, `ripeness` 1–5, `hours_left`, `spoilage_risk`, `defects[]`, `confidence`, `rationale` | Fenêtre de vie + tarif |
| IA-B | Matching | Offre + profils acheteurs | Score déterministe + phrase | Visibilité et priorité 8 min |
| IA-C | Tarif dégressif | `hours_left`, `market_price`, `hours_ref` | `published_price` entier FCFA | Prix préférentiel justifié |
| IA-D | OCR/NLP paiement | Image et/ou SMS | JSON : canal, montant, réf, émetteur, payee, `paid_at`, `confidence`, `missing_fields[]` | Extraction pour le verdict |
| IA-E | Fraude + trésorerie | Sortie OCR + ledger | Verdict + `Cash(j)` + alertes | Lâcher / retenir le stock ; tension 30 j |

IA-B, IA-C et IA-E (chiffres) sont **déterministes**. IA-A et IA-D utilisent Gemini (vision / texte) avec **schéma JSON strict**.

### 7.3 Contrat d’intégration IA

| ID | Exigence |
| --- | --- |
| IA-01 | Clé modèle uniquement côté **Django** (jamais dans le bundle React). |
| IA-02 | Toute invocation est append-only dans `ai_analyses` (`kind` = `freshness` \| `ocr` \| `forecast`). |
| IA-03 | Timeout 12 s → retry unique température 0 si JSON invalide → fallback manuel. |
| IA-04 | En démo, 3 photos denrée et 3 preuves **pré-analysées** en cache pour parer une panne réseau. |
| IA-05 | Le mapping vers `stocks` / `payment_proofs` est un whitelist de champs ; le texte libre du reçu ne peut pas injecter une instruction. |

---

## 8. Règles métier et invariants

### 8.1 Invariants non négociables

1. `qty_available ≥ 0` et `qty_available ≤ qty_initial`.
2. Le lock de quantité se fait dans une **transaction Django** (`select_for_update` + `qty_available >= demandé`). Pas de « lire puis écrire » sans verrou.
3. `amount_due` est immuable après création de la réservation.
4. `payment_ref` unique dès qu’il est non nul.
5. Au plus une preuve `accepted` par réservation.
6. Collecte autorisée seulement si preuve `accepted` **ou** `override_accept` audité.
7. Le LLM n’écrit pas le métier.
8. Montants en **entiers FCFA** (pas de flottants monétaires).

### 8.2 États

**Offre** : `draft` → `live` → `partial` → `exhausted` \| `expired` \| `cancelled`.

**Réservation** : `pending_priority` → `pending_payment` → `proof_review` \| `accepted` \| `rejected` \| `expired` \| `no_show`.

**Preuve** : `accepted` \| `review` \| `rejected` \| `override_accept`.

### 8.3 Paramètres par défaut (démo)

| Paramètre | Valeur |
| --- | --- |
| `radius_km` | 5 |
| Fenêtre priorité top-3 | 8 minutes |
| Fenêtre paiement | 20 minutes (ajustable) |
| Plancher prix | 35 % du prix marché |
| Tolérance montant | 1 % |
| Seuil tension caisse | 150 000 FCFA |
| `hours_ref` tomate / poisson / banane | 36 h / 8 h / 48 h |

---

## 9. Exigences d’information (données)

### 9.1 Entités

| Entité | Rôle |
| --- | --- |
| `profiles` | Identité, rôle, geo, rayon, type acheteur, alias MoMo |
| `stocks` | Stock d’urgence ; champs vague 1 : produit, qty, quartier, `lat`/`lng`, expirabilité, **`adresse_collecte`**. (Le mot « offre » à l’UI = une ligne `stocks`.) |
| `reservations` | Lock, snapshot de prix, RDV, timers |
| `payment_proofs` | Fichier, OCR, `phash`, verdict, flags |
| `cash_events` | Flux attendus / confirmés / extournes |
| `ai_analyses` | Traçabilité jury (jamais écrasée) |
| `audit_logs` | Overrides, +6 h, annulations |

### 9.2 Conservation et vie privée

- Buckets / media Django **privés** (photos produit et preuves, vague 2) ; pas de fichiers servis en listable.
- Pas d’indexation publique des captures (PII : téléphones, noms).
- Vague 1 : pas d’upload ; `adresse_collecte` est du texte, échappé à l’affichage.

---

## 10. Exigences d’interface

### 10.1 Écrans P0

| Écran | Acteur | États à couvrir |
| --- | --- | --- |
| Login / rôle | Tous | Erreur auth |
| Déclarer une offre | Vendeur | Caméra off, GPS off, timeout IA |
| Mes offres | Vendeur | Statuts, preuves en attente |
| Caisse 30 j | Vendeur | Tension, alertes fraude |
| Carte / liste | Acheteur | Vide hors rayon, GPS off |
| Réserver | Acheteur | 409 lock, offre exhausted |
| Dépôt preuve | Acheteur | OK, doublon, mauvais montant, SMS seul |
| Collecte / RDV | Les deux | En attente de preuve, no-show |

### 10.2 Accessibilité démo

- Utilisable au pouce sur mobile (**React** responsive, navigateur). Une PWA n’est pas exigée en vague 1.
- Contrastes lisibles en salle (pas de texte dans les images comme unique information).
- L’écran de confirmation de réservation affiche `adresse_collecte` + bouton Maps.
- En vague 2 : chaque verdict IA affiche le JSON essentiel pour le jury.

### 10.3 API interne minimale

### 10.3 API REST Django (vague 1, minimale)

Préfixe `/api/`. JSON uniquement. Auth requise sauf login / register.

| Méthode | Endpoint | Qui | Rôle |
| --- | --- | --- | --- |
| POST | `/api/auth/register/` | Public | Création compte + rôle |
| POST | `/api/auth/login/` | Public | JWT (access + refresh) |
| POST | `/api/auth/refresh/` | Cookie refresh | Rotation du access token |
| POST | `/api/auth/logout/` | Auth | Invalidation refresh |
| GET/PATCH | `/api/me/` | Auth | Profil (quartier, rayon, GPS) |
| POST | `/api/stocks/` | Vendeur | Déclaration (dont `adresse_collecte`, lat/lng) |
| GET | `/api/stocks/mine/` | Vendeur | Ses stocks |
| POST | `/api/stocks/{id}/cancel/` | Vendeur | Annulation |
| GET | `/api/stocks/nearby/` | Acheteur | Matching rayon + scores (base du polling notifs) |
| POST | `/api/reservations/` | Acheteur | Lock + création résa |
| GET | `/api/reservations/{id}/` | Parties | Confirmation : `adresse_collecte` + `maps_url` |

Vague 2 : `/api/ai/freshness/`, `/api/ai/ocr/`, `/api/proofs/`, `/api/cash/`, `/api/demo/tick/` (`DEMO_MODE` uniquement).

---

## 11. Exigences non fonctionnelles

| ID | Thème | Exigence |
| --- | --- | --- |
| ENF-01 | Plateforme | SPA React utilisable desktop et mobile ; API Django en HTTPS en démo. |
| ENF-02 | Stack | **React.js** (Vite) + **Django** (DRF) + **PostgreSQL**. Carte Leaflet. |
| ENF-03 | IA | Vague 1 : matching déterministe côté Django. Vague 2 : Gemini côté Django seulement. |
| ENF-04 | Performance perçue | Formulaire déclaration immédiat ; matching nearby < 500 ms sur jeu seed. |
| ENF-05 | Concurrence | Double-clic / deux onglets : `select_for_update`, un 201 et un 409. |
| ENF-06 | Notifications | Polling `GET /api/stocks/nearby/` ; pas de dépendance WebSocket en vague 1. |
| ENF-07 | Sécurité | Voir section 12 (prise en charge par l’équipe technique, figée ici). |
| ENF-08 | Observabilité | Logs Django des 4xx/5xx auth et lock ; pas de secrets dans les logs. |
| ENF-09 | Documentation | README : `npm` frontend, `venv` + `migrate` Django, `DATABASE_URL`, comptes seed. |
| ENF-10 | Qualité | Parcours maître vague 1 sans debugger ; reset seed possible. |

---

## 12. Architecture et sécurité

### 12.1 Architecture

```
[React.js (Vite)] --HTTPS JSON--> [Django + DRF]
                                      |
                                      +-- PostgreSQL (ORM Django, pas d’accès front)
                                      +-- (vague 2) client Gemini, secrets .env
```

- Matching, lock, droits : **uniquement Django**.
- Géolocalisation v1 : `lat` / `lng` + Haversine en Python ou SQL ; PostGIS hors vague 1.
- `maps_url` calculé par l’API à la lecture de la réservation, pas inventé dans le front (le front peut aussi composer le même pattern, mais la source de vérité est `stocks.lat/lng` serveur).

### 12.2 Sécurité (responsabilité technique, exigences SEC)

La sécurité n’est pas un module « plus tard » : elle est **dans le socle**. Décisions figées :

| ID | Contrôle | Mise en œuvre |
| --- | --- | --- |
| SEC-01 | Auth | Django + **JWT** (SimpleJWT) : access token court (~15 min) en mémoire React ; **refresh en cookie HttpOnly + Secure + SameSite=Lax** (Strict si même site). Jamais de JWT dans `localStorage`. |
| SEC-02 | Mots de passe | Hasher Django (PBKDF2/Argon2). Politique démo : comptes seed documentés ; en prod min. 8 caractères. |
| SEC-03 | Autorisation | DRF : `IsAuthenticated` + permissions `IsSeller` / `IsBuyer`. Un user = un rôle. Le vendeur ne lit/écrit que **ses** `stocks` ; l’acheteur ne voit les stocks **nearby** (filtre serveur) et que **ses** réservations. |
| SEC-04 | IDOR | Toute ressource par UUID/pk vérifiée `get_object_or_404` + owner. Pas de « id dans l’URL ⇒ accès ». |
| SEC-05 | Injection SQL | ORM Django uniquement. Lock : `transaction.atomic()` + `select_for_update()`. Pas de SQL interpolé avec des chaînes utilisateur. |
| SEC-06 | XSS | API JSON ; React échappe le texte (`adresse_collecte` affiché en texte, pas `dangerouslySetInnerHTML`). |
| SEC-07 | CSRF | Cookie refresh : endpoint refresh/logout protégés CSRF (double cookie) **ou** SameSite strict + CORS serré. Les POST métier passent par `Authorization: Bearer` (access) : pas de CSRF classique. |
| SEC-08 | CORS | Liste blanche : origine du front React uniquement (`CORS_ALLOW_CREDENTIALS=True` si cookies). Pas de `*`. |
| SEC-09 | Secrets | `SECRET_KEY`, `DATABASE_URL`, clés IA dans `.env` / variables d’environnement. `.env` gitignoré. `.env.example` sans valeurs réelles. `DEBUG=False` en démo publique. |
| SEC-10 | Headers | `SecurityMiddleware` Django : `SECURE_BROWSER_XSS_FILTER`, `X-Content-Type-Options=nosniff`, `Referrer-Policy`. HSTS dès HTTPS. |
| SEC-11 | Bruteforce | Throttle DRF sur `/api/auth/login/` (ex. 5/min/IP). |
| SEC-12 | Uploads (vague 2) | Taille max, whitelist MIME, stockage hors webroot. Vague 1 : pas d’upload fichier. |
| SEC-13 | Admin | `/admin/` Django : comptes staff hors seed jury ; pas de lien dans l’UI publique. |
| SEC-14 | DEMO_MODE | Endpoints tick/reset **refusés** si `DEMO_MODE` faux. |
| SEC-15 | Transport | HTTPS en déploiement ; cookies `Secure`. |

**Interdit** : clés dans le repo GitHub, `DEBUG=True` exposé au jury sur internet, endpoints nearby sans auth, matching calculé seulement dans React (contournable).

---

## 13. Scénarios de recette

### 13.1 Scénario maître vague 1 (obligatoire tant que la vague 2 n’est pas livrée)

1. Connexion vendeur → déclaration 30 s : produit, quantité, quartier/GPS, durée d’expirabilité, **adresse de collecte**.
2. Acheteur dans le rayon voit l’offre (score de matching expliqué) et est notifié ; acheteur hors rayon **ne la voit pas**.
3. Réservation → écran : `adresse_collecte` visible + lien `https://maps.google.com/?q=lat,lng`.
4. Deux résas concurrentes sur la dernière unité : une passe, l’autre 409.
5. Expiration du timer : stock relâché, offre à nouveau réservable.

Le scénario OCR / +6 h / caisse (ancienne version) s’applique **à partir de la vague 2**.

### 13.2 Scénarios complémentaires

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| REC-01 | Deux clics Réserver sur la dernière unité | Un 200, un 409 |
| REC-02 | Capture 10 000 F pour un dû 22 400 F | Rejet écart, comparaison à l’écran |
| REC-03 | Gemini timeout | Vague 2 : fallback manuel |
| REC-04 | GPS refusé | Quartier + pin, matching sur centroïde |
| REC-05 | Timer réservation écoulé | Stock relâché, offre à nouveau réservable |
| REC-06 | Override vendeur | Collecte possible + ligne d’audit |

---

## 14. Livrables

Conformément au règlement des 48 heures :

1. **Application fonctionnelle** : frontend React + API Django + PostgreSQL, URL HTTPS, utilisable sur téléphone.
2. **Code source** complet sur https://github.com/kinganani/stackAI (historique propre, `.env.example`, pas de secrets).
3. **Démonstration live + pitch 10 minutes** selon le script ci-dessous.
4. **Documentation** : le présent CDC, README de lancement, comptes seed.

---

## 15. Organisation des 48 heures

**Priorité actuelle = vague 1 uniquement.** L3+ (vision, OCR, caisse) ne commencent que lorsque L1–L2–matching–résa–RDV sont démontrables.

| Fenêtre | Lot | Done when |
| --- | --- | --- |
| H0–H5 | L1 Auth Django + PostgreSQL (`stocks.adresse_collecte`, lock) | Deux users seed se connectent |
| H5–H16 | L2 Déclaration rapide + carte | Offre visible avec quartier/GPS et expirabilité |
| H16–H28 | L3 Matching + notifications rayon | 2 km oui / 30 km non + score + notif |
| H28–H40 | L4 Réservation prioritaire + RDV / itinéraire | Lock 409, Maps, timer |
| H40–H48 | L5 Seed Abidjan, README, répétition, buffer | Script vague 1 fluide |
| Ensuite | Vague 2 | Vision, tarif, OCR, fraude, trésorerie |

Si retard en vague 1 : polling à la place du Realtime. **Ne jamais couper** déclaration, matching (score + rayon), notifications, lock 409, RDV/itinéraire.

---

## 16. Script Demo Day (10 minutes)

| Minutes | Action à l’écran |
| --- | --- |
| 0–1 | Problème : stock qui pourrit, pas d’acheteur assez proche assez vite |
| 1–3 | Déclaration 30 s : produit, qty, quartier, expirabilité |
| 3–6 | Matching : resto dans le rayon notifié ; ménage hors rayon invisible ; score affiché |
| 6–8 | Réservation prioritaire, lock, RDV + itinéraire Maps |
| 8–10 | Double résa 409 ; ce qui vient en vague 2 (vision, preuves, caisse) |

Preuves à laisser visibles : formulaire de déclaration, carte + score, notif, écran RDV.

---

## 17. Risques et parades

| Risque | Impact | Parade (exigée) |
| --- | --- | --- |
| API vision down | Démo cassée | Cache 3+3 analyses seed |
| GPS salle | Matching vide | Quartier + pin + position simulée |
| Scope 5 IA | App inachevée | Vertical slice L4/L5, pas un moteur bancaire |
| Double réservation | Overbooking | `select_for_update` (EF-41) |
| Secret commité | Disqualification / trou sécu | `.gitignore`, `.env.example` |

---

## 18. Glossaire

| Terme | Définition |
| --- | --- |
| Fenêtre de survie | Intervalle pendant lequel la denrée est encore vendable et collectable |
| Preuve | Capture, SMS ou bordereau déposé pour un `amount_due` |
| Lock | Quantité soustraite atomiquement de `qty_available` |
| Snapshot de prix | Prix unitaire copié sur la réservation, immuable |
| `DEMO_MODE` | Environnement où l’horloge peut être avancée artificiellement |
| `stocks` | Table des déclarations d’urgence (une « offre » à l’écran = une ligne) |
| `adresse_collecte` | Texte libre du point de collecte, saisi par le vendeur, affiché à l’acheteur |
| Itinéraire (vague 1) | Lien Google Maps `?q=lat,lng` — pas un calcul de trajet |

---

## 19. Approbation

Ce cahier des charges **v1.1** est la base d’implémentation. Toute demande hors section 4.1 (vague 1) pendant le build en cours est un **changement de périmètre**.

| Rôle | Nom | Accord |
| --- | --- | --- |
| Équipe projet | — | À viser avant L1 |
| Référent technique | — | — |
