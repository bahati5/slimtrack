<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>✦ SlimTrack</strong></p>
<p><em>Product Requirements Document &amp; Architecture Technique</em></p>
<p>──────────────────────────────────────</p>
<p>Version 1.0 • Avril 2026</p>
<p>Stack: Next.js 14 • Supabase • Cloudinary • PWA</p></td>
</tr>
</tbody>
</table>

**1. Vision & Objectifs**

SlimTrack est une Progressive Web App mobile-first dédiée au suivi de perte de poids. L\'application permet à une utilisatrice de logger ses repas avec composition détaillée, ses activités sportives avec preuves photo/vidéo, et de partager automatiquement son bilan quotidien avec sa coach. L\'ensemble est construit sur Next.js 14, Supabase et Cloudinary.

**Objectifs principaux**

- Calculer automatiquement le TDEE et l\'objectif calorique via la formule Mifflin-St Jeor

- Logger chaque repas aliment par aliment (grammage + kcal) avec preuve photo/vidéo

- Logger chaque activité sportive (YouTube ou libre) avec preuve photo et kcal dépensées

- Calculer en temps réel le bilan calorique journalier et afficher si le déficit est respecté

- Offrir une vue Coach dédiée avec analytics, timeline et commentaires

- Fonctionner hors ligne en PWA avec synchronisation au retour de connexion

**Utilisateurs cibles**

|                         |                                                                                                 |
|-------------------------|-------------------------------------------------------------------------------------------------|
| **Profil**              | **Description**                                                                                 |
| Utilisatrice principale | La personne qui suit sa perte de poids, utilise l\'app quotidiennement sur mobile               |
| Coach                   | La coach qui accède à une vue dédiée, laisse des commentaires, suit les analytics de son client |

**2. Stack Technique Complète**

|                  |                                              |                                                  |
|------------------|----------------------------------------------|--------------------------------------------------|
| **Couche**       | **Technologie**                              | **Rôle**                                         |
| Frontend         | Next.js 14 (App Router)                      | Interface mobile-first, SSR/SSG, routing, PWA    |
| Styles           | Tailwind CSS + CSS Variables                 | Design system coloré, responsive                 |
| Backend/API      | Next.js API Routes + Supabase Edge Functions | Logique métier, calculs kcal, agrégations stats  |
| Base de données  | Supabase (PostgreSQL)                        | Toutes les données utilisateur                   |
| Authentification | Supabase Auth (magic link + email/password)  | Sessions utilisateur et coach                    |
| Stockage médias  | Cloudinary                                   | Photos repas, vidéos, captures activité, preuves |
| Temps réel       | Supabase Realtime                            | Mises à jour live coach ↔ utilisatrice           |
| PWA              | next-pwa + Service Worker                    | Offline, installable, notifications push         |
| Notifications    | Web Push API + Supabase Edge Functions       | Rappels quotidiens, alertes coach                |
| Charts           | Recharts                                     | Graphiques statistiques                          |
| State            | Zustand + React Query (TanStack)             | State global + cache serveur                     |
| Déploiement      | Vercel                                       | Hosting Next.js, edge functions, CI/CD           |

**3. Architecture Base de Données (Supabase)**

Supabase utilise PostgreSQL avec Row Level Security (RLS) pour que chaque utilisatrice ne voie que ses propres données, et que la coach n\'accède qu\'aux données de ses clientes.

**3.1 Schéma des tables**

**Table: profiles**

Étendue de auth.users. Contient toutes les données personnelles et paramètres.

|                   |                                                                |
|-------------------|----------------------------------------------------------------|
| **Colonne**       | **Type & Description**                                         |
| id                | UUID --- référence auth.users.id (PK)                          |
| role              | ENUM(\'user\',\'coach\') --- différencie utilisatrice et coach |
| full_name         | TEXT --- prénom et nom                                         |
| avatar_url        | TEXT --- URL Cloudinary de la photo de profil                  |
| age               | INTEGER --- âge en années                                      |
| sex               | ENUM(\'F\',\'M\') --- pour calcul BMR                          |
| height_cm         | NUMERIC(5,1) --- taille en cm                                  |
| current_weight_kg | NUMERIC(5,2) --- poids actuel                                  |
| goal_weight_kg    | NUMERIC(5,2) --- objectif de poids                             |
| activity_level    | NUMERIC(4,3) --- multiplicateur TDEE (1.2 à 1.725)             |
| deficit_kcal      | INTEGER --- déficit calorique choisi (100 à 1000)              |
| tdee              | INTEGER --- calculé auto (stored computed)                     |
| target_kcal       | INTEGER --- tdee - deficit_kcal                                |
| coach_id          | UUID --- FK vers profiles.id du coach assigné                  |
| timezone          | TEXT --- ex: \'Africa/Libreville\'                             |
| created_at        | TIMESTAMPTZ                                                    |
| updated_at        | TIMESTAMPTZ                                                    |

**Table: weight_logs**

Historique des pesées pour la courbe d\'évolution.

|             |                           |
|-------------|---------------------------|
| **Colonne** | **Type & Description**    |
| id          | UUID (PK)                 |
| user_id     | UUID --- FK profiles.id   |
| weight_kg   | NUMERIC(5,2)              |
| logged_at   | DATE --- date de la pesée |
| note        | TEXT --- note optionnelle |
| created_at  | TIMESTAMPTZ               |

**Table: measurements**

Mensurations corporelles pour suivre l\'évolution du corps.

|                |                                   |
|----------------|-----------------------------------|
| **Colonne**    | **Type & Description**            |
| id             | UUID (PK)                         |
| user_id        | UUID --- FK profiles.id           |
| waist_cm       | NUMERIC(5,1) --- tour de taille   |
| hips_cm        | NUMERIC(5,1) --- tour de hanches  |
| chest_cm       | NUMERIC(5,1) --- tour de poitrine |
| left_thigh_cm  | NUMERIC(5,1) --- cuisse gauche    |
| right_thigh_cm | NUMERIC(5,1) --- cuisse droite    |
| left_arm_cm    | NUMERIC(5,1) --- bras gauche      |
| right_arm_cm   | NUMERIC(5,1) --- bras droit       |
| measured_at    | DATE --- date des mesures         |
| created_at     | TIMESTAMPTZ                       |

**Table: daily_logs**

Bilan journalier agrégé --- une ligne par utilisatrice par jour. Mise à jour en temps réel via triggers.

|                    |                                                                      |
|--------------------|----------------------------------------------------------------------|
| **Colonne**        | **Type & Description**                                               |
| id                 | UUID (PK)                                                            |
| user_id            | UUID --- FK profiles.id                                              |
| log_date           | DATE --- la journée concernée                                        |
| total_kcal_eaten   | INTEGER --- total kcal consommées (calculé)                          |
| total_kcal_burned  | INTEGER --- total kcal brûlées activité                              |
| total_steps        | INTEGER --- nombre de pas                                            |
| steps_kcal_burned  | INTEGER --- kcal brûlées par les pas (estimé)                        |
| net_kcal           | INTEGER --- total_kcal_eaten - total_kcal_burned - steps_kcal_burned |
| target_kcal        | INTEGER --- copie de profiles.target_kcal au moment du log           |
| deficit_respected  | BOOLEAN --- net_kcal \<= target_kcal                                 |
| coach_comment      | TEXT --- commentaire de la coach                                     |
| coach_commented_at | TIMESTAMPTZ                                                          |
| status             | ENUM(\'complete\',\'partial\',\'empty\')                             |
| created_at         | TIMESTAMPTZ                                                          |
| updated_at         | TIMESTAMPTZ                                                          |

**Table: meals**

Chaque repas loggé dans la journée.

|                 |                                                         |
|-----------------|---------------------------------------------------------|
| **Colonne**     | **Type & Description**                                  |
| id              | UUID (PK)                                               |
| user_id         | UUID --- FK profiles.id                                 |
| daily_log_id    | UUID --- FK daily_logs.id                               |
| name            | TEXT --- nom du repas ex: \'Déjeuner\', \'Snack\'       |
| meal_type       | ENUM(\'breakfast\',\'lunch\',\'dinner\',\'snack\')      |
| total_kcal      | INTEGER --- somme calculée des meal_items               |
| total_protein_g | NUMERIC(6,1)                                            |
| total_carbs_g   | NUMERIC(6,1)                                            |
| total_fat_g     | NUMERIC(6,1)                                            |
| media_urls      | TEXT\[\] --- tableau d\'URLs Cloudinary (photos/vidéos) |
| eaten_at        | TIMESTAMPTZ --- heure du repas                          |
| notes           | TEXT                                                    |
| created_at      | TIMESTAMPTZ                                             |

**Table: meal_items**

Chaque aliment composant un repas. C\'est ici que se fait le détail de composition.

|               |                                                                |
|---------------|----------------------------------------------------------------|
| **Colonne**   | **Type & Description**                                         |
| id            | UUID (PK)                                                      |
| meal_id       | UUID --- FK meals.id                                           |
| user_id       | UUID --- FK profiles.id                                        |
| food_name     | TEXT --- ex: \'Riz blanc cuit\', \'Tomate\', \'Poulet grillé\' |
| quantity_g    | NUMERIC(7,1) --- quantité en grammes                           |
| kcal_per_100g | NUMERIC(6,1) --- valeur calorique pour 100g                    |
| kcal_total    | NUMERIC(7,1) --- calculé: (quantity_g \* kcal_per_100g) / 100  |
| protein_g     | NUMERIC(6,1) --- protéines pour cette quantité                 |
| carbs_g       | NUMERIC(6,1) --- glucides                                      |
| fat_g         | NUMERIC(6,1) --- lipides                                       |
| fiber_g       | NUMERIC(5,1) --- fibres                                        |
| created_at    | TIMESTAMPTZ                                                    |

**Table: activities**

Chaque session d\'activité physique loggée.

|                   |                                                                           |
|-------------------|---------------------------------------------------------------------------|
| **Colonne**       | **Type & Description**                                                    |
| id                | UUID (PK)                                                                 |
| user_id           | UUID --- FK profiles.id                                                   |
| daily_log_id      | UUID --- FK daily_logs.id                                                 |
| activity_type     | ENUM(\'youtube\',\'gym\',\'walk\',\'run\',\'cycling\',\'swim\',\'other\') |
| name              | TEXT --- ex: \'Yoga Pamela Reif 30min\', \'Course à pied\'                |
| youtube_url       | TEXT --- lien YouTube si applicable                                       |
| youtube_thumbnail | TEXT --- URL thumbnail auto-extraite                                      |
| duration_min      | INTEGER --- durée en minutes                                              |
| kcal_burned       | INTEGER --- kcal dépensées (saisie manuelle ou estimée)                   |
| steps             | INTEGER --- nombre de pas (si type walk/run)                              |
| media_urls        | TEXT\[\] --- photos/captures preuve (Cloudinary)                          |
| notes             | TEXT --- remarques                                                        |
| done_at           | TIMESTAMPTZ                                                               |
| created_at        | TIMESTAMPTZ                                                               |

**Table: food_database**

Base d\'aliments communs pour l\'autocomplete (pré-remplie + enrichie par l\'utilisatrice).

|                  |                                                                           |
|------------------|---------------------------------------------------------------------------|
| **Colonne**      | **Type & Description**                                                    |
| id               | UUID (PK)                                                                 |
| name             | TEXT --- nom standardisé de l\'aliment                                    |
| name_fr          | TEXT --- nom en français                                                  |
| kcal_per_100g    | NUMERIC(6,1)                                                              |
| protein_per_100g | NUMERIC(5,1)                                                              |
| carbs_per_100g   | NUMERIC(5,1)                                                              |
| fat_per_100g     | NUMERIC(5,1)                                                              |
| fiber_per_100g   | NUMERIC(5,1)                                                              |
| category         | TEXT --- \'viande\', \'légume\', \'féculent\', \'fruit\', \'laitier\'\... |
| is_custom        | BOOLEAN --- ajouté par un utilisateur vs pré-chargé                       |
| created_by       | UUID --- FK profiles.id si custom                                         |
| created_at       | TIMESTAMPTZ                                                               |

**Table: notifications**

Historique des notifications envoyées.

|             |                                                                             |
|-------------|-----------------------------------------------------------------------------|
| **Colonne** | **Type & Description**                                                      |
| id          | UUID (PK)                                                                   |
| user_id     | UUID --- FK profiles.id                                                     |
| type        | TEXT --- \'reminder_meal\', \'coach_comment\', \'streak\', \'goal_reached\' |
| title       | TEXT                                                                        |
| body        | TEXT                                                                        |
| is_read     | BOOLEAN                                                                     |
| created_at  | TIMESTAMPTZ                                                                 |

**3.2 Triggers & Fonctions PostgreSQL**

Supabase permet d\'écrire des fonctions PL/pgSQL qui s\'exécutent automatiquement.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Trigger 1 — Recalcul du total kcal d'un repas</strong></p>
<p>Déclenché: AFTER INSERT OR UPDATE OR DELETE ON meal_items</p>
<p>Action: Met à jour meals.total_kcal, total_protein_g, total_carbs_g, total_fat_g</p>
<p>via: SUM(kcal_total) WHERE meal_id = NEW.meal_id</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Trigger 2 — Mise à jour du bilan journalier</strong></p>
<p>Déclenché: AFTER INSERT OR UPDATE ON meals (via trigger 1)</p>
<p>Action: Met à jour daily_logs.total_kcal_eaten = SUM(meals.total_kcal) pour ce jour</p>
<p>Recalcule: net_kcal = total_kcal_eaten - total_kcal_burned - steps_kcal_burned</p>
<p>Met à jour: deficit_respected = (net_kcal &lt;= target_kcal)</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Trigger 3 — Estimation kcal depuis les pas</strong></p>
<p>Déclenché: AFTER INSERT OR UPDATE ON activities WHERE activity_type = 'walk'</p>
<p>Formule: kcal_steps ≈ steps * 0.04 (approximation standard, ajustée au poids)</p>
<p>Action: Met à jour daily_logs.steps_kcal_burned et reclenche trigger 2</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Trigger 4 — Mise à jour du profil déclenche recalcul TDEE</strong></p>
<p>Déclenché: AFTER UPDATE ON profiles (age, sex, height_cm, current_weight_kg, activity_level, deficit_kcal)</p>
<p>Formule Mifflin-St Jeor (Femme): BMR = 10×poids + 6.25×taille - 5×âge - 161</p>
<p>Formule Mifflin-St Jeor (Homme): BMR = 10×poids + 6.25×taille - 5×âge + 5</p>
<p>TDEE = BMR × activity_level</p>
<p>target_kcal = TDEE - deficit_kcal</p>
<p>Met à jour profiles.tdee et profiles.target_kcal automatiquement</p></td>
</tr>
</tbody>
</table>

**3.3 Row Level Security (RLS)**

Chaque table a des politiques RLS qui s\'appliquent côté base de données, indépendamment du code.

|               |                                                                                        |
|---------------|----------------------------------------------------------------------------------------|
| **Table**     | **Politique RLS**                                                                      |
| profiles      | SELECT/UPDATE: id = auth.uid() OU (role=\'user\' ET coach_id = auth.uid())             |
| daily_logs    | Toutes ops: user_id = auth.uid() OU user est coach de l\'utilisatrice                  |
| meals         | Toutes ops: user_id = auth.uid()                                                       |
| meal_items    | Toutes ops: user_id = auth.uid()                                                       |
| activities    | Toutes ops: user_id = auth.uid()                                                       |
| weight_logs   | Toutes ops: user_id = auth.uid()                                                       |
| measurements  | Toutes ops: user_id = auth.uid()                                                       |
| food_database | SELECT: tout le monde \| INSERT: authentifié \| UPDATE/DELETE: created_by = auth.uid() |
| notifications | SELECT/UPDATE: user_id = auth.uid()                                                    |

**4. Architecture Next.js 14**

**4.1 Structure des fichiers**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Arborescence du projet</strong></p>
<p>slimtrack/</p>
<p>├── app/ # App Router Next.js 14</p>
<p>│ ├── (auth)/ # Groupe de routes auth (layout différent)</p>
<p>│ │ ├── login/page.tsx</p>
<p>│ │ └── register/page.tsx</p>
<p>│ ├── (app)/ # App principale (authentifiée)</p>
<p>│ │ ├── layout.tsx # Layout avec bottom nav mobile</p>
<p>│ │ ├── today/page.tsx # Vue du jour</p>
<p>│ │ ├── stats/page.tsx # Statistiques &amp; graphiques</p>
<p>│ │ ├── profile/page.tsx # Paramètres &amp; profil</p>
<p>│ │ ├── log-meal/page.tsx # Formulaire ajout repas détaillé</p>
<p>│ │ ├── log-activity/page.tsx # Formulaire ajout activité</p>
<p>│ │ └── coach/page.tsx # Vue coach (protégée rôle coach)</p>
<p>│ ├── api/ # API Routes</p>
<p>│ │ ├── meals/route.ts</p>
<p>│ │ ├── activities/route.ts</p>
<p>│ │ ├── daily-log/route.ts</p>
<p>│ │ ├── stats/route.ts</p>
<p>│ │ └── upload/route.ts # Proxy upload Cloudinary</p>
<p>│ ├── layout.tsx # Root layout</p>
<p>│ └── manifest.json # PWA manifest</p>
<p>├── components/</p>
<p>│ ├── ui/ # Composants de base (Button, Card, Badge...)</p>
<p>│ ├── meals/ # MealCard, MealItemForm, MealComposition</p>
<p>│ ├── activities/ # ActivityCard, ActivityForm, YouTubeInput</p>
<p>│ ├── stats/ # WeightChart, KcalChart, StatsGrid</p>
<p>│ ├── coach/ # CoachDashboard, CommentBox, ClientCard</p>
<p>│ ├── daily/ # KcalRing, DailyHeader, DayBadge</p>
<p>│ └── shared/ # MediaUploader, FoodSearchInput</p>
<p>├── lib/</p>
<p>│ ├── supabase/ # Client Supabase (server &amp; client)</p>
<p>│ ├── cloudinary/ # Helpers upload</p>
<p>│ ├── calculations/ # Mifflin-St Jeor, kcal steps, TDEE</p>
<p>│ └── hooks/ # useToday, useMeals, useActivities...</p>
<p>├── store/ # Zustand stores</p>
<p>├── types/ # TypeScript types générés Supabase</p>
<p>├── public/ # Icons PWA, splash screens</p>
<p>└── next.config.js # Config next-pwa</p></td>
</tr>
</tbody>
</table>

**4.2 Pages et fonctionnalités détaillées**

**Page: Today (/today)**

- Hero card: date, prénom, 3 KPIs (kcal mangées / brûlées / restantes)

- Anneau de progression SVG animé: % de l\'objectif atteint

- Badge statut: \'Déficit respecté ✓\' ou \'Déficit dépassé ✗\' calculé en temps réel

- Liste des repas de la journée avec total et macros

- Liste des activités avec kcal dépensées

- Bouton FAB rose \'+ Repas\' et bouton \'+ Activité\'

- Data fetchée via Supabase Realtime (updates live)

**Page: Log Meal (/log-meal)**

- Sélection du type: Petit-déj / Déjeuner / Dîner / Snack

- Upload photo/vidéo du repas → Cloudinary (avec preview)

- Champ \'Ajouter un aliment\' avec autocomplete sur food_database

- Pour chaque aliment: nom + quantité en grammes → kcal calculés automatiquement

- Tableau récapitulatif: chaque aliment, ses grammes, ses kcal, ses macros

- Total en bas: kcal + P/G/L du repas entier

- Bouton valider → INSERT dans meals + meal_items → triggers recalculent tout

**Page: Log Activity (/log-activity)**

- Sélection du type d\'activité: YouTube / Salle / Marche / Course / Vélo / Natation / Autre

- Si YouTube: champ URL → extraction auto du titre et thumbnail via YouTube oEmbed API

- Durée en minutes (slider ou saisie)

- Kcal dépensées: saisie manuelle OU estimation auto selon type et durée

- Nombre de pas (si marche/course): saisie + calcul kcal automatique

- Upload photo preuve: appareil photo direct ou galerie → Cloudinary

- Notes texte optionnelles

- Validation → INSERT activities → trigger met à jour daily_log

**Page: Stats (/stats)**

- Courbe d\'évolution du poids (30j / 90j / 6 mois --- toggle)

- Graphique kcal consommées vs objectif par semaine (barres + ligne)

- Heatmap des jours respectés/ratés (style GitHub contributions)

- Grid mensurations avec delta depuis le début

- Streak actuel (X jours consécutifs de déficit respecté)

- Camembert de répartition macros moyen sur la période

**Page: Profile (/profile)**

- Formulaire paramètres complets: âge, sexe, taille, poids, niveau d\'activité

- Slider déficit 100-1000 kcal avec affichage de la vitesse de perte (kg/semaine)

- Résultat TDEE + Objectif kcal calculés en live

- IMC calculé et affiché avec interprétation

- Formulaire mensurations avec historique

- Upload photo de profil → Cloudinary

- Section \'Ma coach\': nom et email de la coach assignée

**Page: Coach (/coach) --- rôle coach uniquement**

- Vue d\'ensemble de toutes les clientes actives

- Pour chaque cliente: bilan de la semaine, % compliance, delta poids

- Vue détaillée d\'une cliente: calendrier semaine, liste repas du jour avec photos

- Bouton \'Laisser un commentaire\' sur n\'importe quelle journée

- Charts analytics: compliance sur 30 jours, évolution poids, kcal moyennes

- Filtre par période, export du bilan semaine

- Notification push envoyée à la cliente dès qu\'un commentaire est posté

**5. Gestion des Médias --- Cloudinary**

Cloudinary est utilisé pour stocker toutes les photos et vidéos de preuve. Next.js expose une API Route /api/upload qui sert de proxy signé pour ne jamais exposer les credentials côté client.

**5.1 Organisation des dossiers Cloudinary**

|                                        |                                       |
|----------------------------------------|---------------------------------------|
| **Dossier Cloudinary**                 | **Contenu**                           |
| slimtrack/avatars/{user_id}/           | Photo de profil utilisatrice et coach |
| slimtrack/meals/{user_id}/{date}/      | Photos et vidéos des repas du jour    |
| slimtrack/activities/{user_id}/{date}/ | Photos preuve des activités sportives |
| slimtrack/progress/{user_id}/          | Photos de progression corporelle      |

**5.2 Flux d\'upload**

1.  Utilisatrice sélectionne une photo/vidéo sur son mobile

2.  L\'app appelle /api/upload (Next.js API Route) avec le fichier

3.  L\'API Route génère une signature Cloudinary sécurisée côté serveur

4.  Upload direct vers Cloudinary avec les transformations configurées

5.  Cloudinary retourne l\'URL publique + public_id

6.  L\'URL est stockée dans media_urls\[\] dans Supabase (meals ou activities)

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Transformations Cloudinary automatiques</strong></p>
<p>Photos repas: resize auto (max 1200px), format WebP, qualité auto, watermark date</p>
<p>Vidéos: compress auto, format MP4, limite 30 secondes, thumbnail auto-générée</p>
<p>Activités: resize 1200px, format WebP, qualité 85</p>
<p>Avatars: crop circulaire 200x200, format WebP</p>
<p>Toutes les URLs retournées incluent le paramètre f_auto,q_auto pour optimisation</p></td>
</tr>
</tbody>
</table>

**6. Progressive Web App (PWA)**

SlimTrack est une PWA installable sur iOS et Android depuis le navigateur. Elle fonctionne hors ligne pour la consultation et met en file d\'attente les actions (ajout repas, activité) pour les synchroniser au retour de connexion.

**6.1 Configuration next-pwa**

- Service Worker généré par next-pwa (Workbox sous le capot)

- Stratégie de cache: NetworkFirst pour les données Supabase, CacheFirst pour les assets statiques

- Background sync: les mutations (POST/PATCH) en file d\'attente si hors ligne

- Manifest.json: icônes, splash screens, theme_color: \#A855F7, display: standalone

**6.2 Notifications Push**

- Utilisatrice s\'abonne aux notifications au premier lancement

- Supabase Edge Function planifiée envoie un rappel à 12h et 19h si pas de log

- Notification push instantanée quand la coach poste un commentaire

- Alerte \'Objectif atteint !\' quand le poids objectif est enregistré

**7. Fonctionnalités --- Détail Technique**

**7.1 Calcul kcal depuis les aliments**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Formule de base</strong></p>
<p>kcal_total d'un aliment = (quantity_g × kcal_per_100g) / 100</p>
<p>Exemple: 150g de riz blanc (130 kcal/100g) = (150 × 130) / 100 = 195 kcal</p>
<p>Macros calculés de la même façon (protein_g, carbs_g, fat_g)</p>
<p>Le total du repas = SUM(kcal_total) de tous les meal_items</p>
<p>Le total du jour = SUM(meals.total_kcal) pour ce daily_log</p></td>
</tr>
</tbody>
</table>

**7.2 Estimation kcal depuis les pas**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Formule d'estimation</strong></p>
<p>Formule simplifiée: kcal_steps ≈ pas × 0.04 × (poids_kg / 70)</p>
<p>Exemple: 8000 pas, 75 kg → 8000 × 0.04 × (75/70) ≈ 343 kcal</p>
<p>Note: cette formule est une approximation. Pour la précision, recommander un appareil de tracking.</p>
<p>La valeur reste modifiable manuellement par l'utilisatrice.</p></td>
</tr>
</tbody>
</table>

**7.3 Calcul TDEE (Mifflin-St Jeor)**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Formules</strong></p>
<p>BMR Femme = (10 × poids_kg) + (6.25 × taille_cm) - (5 × âge) - 161</p>
<p>BMR Homme = (10 × poids_kg) + (6.25 × taille_cm) - (5 × âge) + 5</p>
<p>TDEE = BMR × Niveau d'activité</p>
<p>→ Sédentaire (peu/pas d'exercice): ×1.2</p>
<p>→ Légèrement actif (1-3j/sem): ×1.375</p>
<p>→ Modérément actif (3-5j/sem): ×1.55</p>
<p>→ Très actif (6-7j/sem): ×1.725</p>
<p>Objectif calorique = TDEE - Déficit choisi</p>
<p>Vitesse de perte estimée = (Déficit × 7) / 7700 kg/semaine</p></td>
</tr>
</tbody>
</table>

**8. Design System**

SlimTrack utilise un thème sombre (dark mode uniquement) avec une palette de couleurs vives et contrastées, orientée mobile-first.

|                      |                  |                                                  |
|----------------------|------------------|--------------------------------------------------|
| **Couleur**          | **Variable CSS** | **Utilisation**                                  |
| Violet \#A855F7      | \--color-primary | Actions principales, anneau kcal, déficit slider |
| Rose \#EC4899        | \--color-accent  | kcal mangées, FAB, prix                          |
| Vert menthe \#10B981 | \--color-success | kcal brûlées, déficit respecté, succès           |
| Corail \#F97316      | \--color-warning | Alertes, calories dépassées                      |
| Ciel \#38BDF8        | \--color-info    | TDEE, objectifs, coach view                      |
| Ambre \#F59E0B       | \--color-neutral | Statistiques neutres, IMC                        |
| Fond \#0F0A1A        | \--color-bg      | Background principal                             |
| Carte \#1A1028       | \--color-card    | Background des cards                             |
| Texte \#F0E6FF       | \--color-text    | Texte principal                                  |
| Texte muted \#9B89B8 | \--color-muted   | Labels, sous-titres, placeholders                |

**8.1 Principes mobile-first**

- Toutes les pages conçues pour 375px de wide en premier

- Bottom navigation fixe avec 4 onglets: Aujourd\'hui / Stats / Profil / Coach

- FAB (Floating Action Button) pour les actions principales

- Modales bottom sheet (slide depuis le bas) pour les formulaires

- Tap targets minimum 44×44px (recommandation Apple/Google)

- Swipe to delete sur les repas et activités

- Haptic feedback sur les actions importantes (Web Vibration API)

**9. Roadmap de Développement**

**Phase 1 --- MVP Core (Semaines 1-3)**

7.  Setup projet: Next.js 14, Supabase, Tailwind, next-pwa

8.  Authentification: login/register avec Supabase Auth

9.  Profil: formulaire paramètres + calcul TDEE automatique

10. Log repas: formulaire complet avec aliments détaillés

11. Log activité: formulaire avec upload photo

12. Vue Today: dashboard journalier avec bilan kcal

**Phase 2 --- Media & Stats (Semaines 4-5)**

13. Intégration Cloudinary: upload photos/vidéos repas et activités

14. Base d\'aliments: seed food_database avec \~500 aliments courants

15. Page Stats: courbe poids, graphique kcal, heatmap

16. PWA: manifest, service worker, cache offline

**Phase 3 --- Coach & Temps Réel (Semaines 6-7)**

17. Vue Coach: dashboard clientes, analytics, commentaires

18. Supabase Realtime: updates live Today page

19. Notifications push: rappels repas, commentaires coach

20. Système d\'assignation coach/cliente

**Phase 4 --- Polish & Launch (Semaine 8)**

21. Onboarding: flow de bienvenue pour nouvelle utilisatrice

22. Animations et micro-interactions

23. Tests E2E (Playwright) sur les flows critiques

24. Déploiement Vercel, variables d\'environnement production

25. Documentation utilisatrice

**10. Configuration & Variables d\'Environnement**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Fichier .env.local (ne jamais committer)</strong></p>
<p># Supabase</p>
<p>NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co</p>
<p>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...</p>
<p>SUPABASE_SERVICE_ROLE_KEY=eyJ... # Serveur uniquement</p>
<p># Cloudinary</p>
<p>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=slimtrack</p>
<p>CLOUDINARY_API_KEY=123456789</p>
<p>CLOUDINARY_API_SECRET=xxxx # Serveur uniquement</p>
<p># App</p>
<p>NEXT_PUBLIC_APP_URL=https://slimtrack.vercel.app</p>
<p>NEXTAUTH_SECRET=xxxx</p></td>
</tr>
</tbody>
</table>

**11. Guide Supabase pour Débutant**

Voici comment utiliser Supabase dans le projet. Tu n\'as pas besoin de savoir gérer une base de données --- Supabase fournit une interface visuelle et du code prêt à l\'emploi.

**Créer un projet Supabase**

26. Va sur supabase.com → New Project

27. Choisis un nom (ex: slimtrack), un mot de passe de base de données fort

28. Région: choisir la plus proche (Europe West pour Gabon)

29. Attends la création (\~2 minutes)

30. Dans Settings → API: copie l\'URL et l\'anon key dans ton .env.local

**Créer les tables**

31. Dans Supabase: onglet \'Table Editor\' → \'New Table\'

32. OU mieux: onglet \'SQL Editor\' → colle les scripts SQL fournis dans ce document

33. Active Row Level Security sur chaque table (bouton toggle dans l\'UI)

34. Ajoute les policies RLS via SQL Editor

**Utiliser Supabase dans le code Next.js**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Installation et client</strong></p>
<p>npm install @supabase/supabase-js @supabase/ssr</p>
<p>// lib/supabase/client.ts (côté navigateur)</p>
<p>import { createBrowserClient } from '@supabase/ssr'</p>
<p>export const supabase = createBrowserClient(</p>
<p>process.env.NEXT_PUBLIC_SUPABASE_URL!,</p>
<p>process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!</p>
<p>)</p>
<p>// Lire des données</p>
<p>const { data, error } = await supabase</p>
<p>.from('meals')</p>
<p>.select('*, meal_items(*)')</p>
<p>.eq('user_id', userId)</p>
<p>.order('eaten_at', { ascending: false })</p>
<p>// Insérer un repas</p>
<p>const { data, error } = await supabase</p>
<p>.from('meals')</p>
<p>.insert({ name: 'Déjeuner', total_kcal: 450, user_id: userId })</p>
<p>.select()</p>
<p>// Écouter en temps réel</p>
<p>supabase.channel('daily-log')</p>
<p>.on('postgres_changes', { event: '*', table: 'daily_logs' }, (payload) =&gt; {</p>
<p>// Met à jour l'UI automatiquement</p>
<p>}).subscribe()</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>✦ SlimTrack — Tous droits réservés</strong></p>
<p>Document généré le 17 Avril 2026 — Confidentiel</p></td>
</tr>
</tbody>
</table>
