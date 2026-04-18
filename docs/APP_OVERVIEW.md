# SlimTrack — Documentation fonctionnelle & technique

> Application mobile-first de suivi de perte de poids avec coaching,
> construite en **Next.js 16 (App Router)** + **Supabase** (Postgres/Auth/Storage/Realtime/Edge Functions).
>
> Packagée en **PWA** (installable, notifications push Web Push).

---

## 1. Vue d'ensemble

SlimTrack est une application **mobile-first** pensée pour une pratique quotidienne :

1. La **cliente** configure son profil (âge, sexe, taille, poids, niveau d'activité, objectif).
2. L'application calcule son **objectif kcal journalier** via Mifflin-St Jeor.
3. Chaque jour, elle **logge ses repas** (avec ingrédients, macros, photos) et ses **activités** (séances YouTube, marche, course, etc.).
4. Un **anneau kcal** montre en temps réel les kcal restantes avant d'atteindre l'objectif.
5. Un **coach** affilié peut consulter les journées de ses clientes, commenter chaque repas ou chaque journée complète, et recevoir des notifications push quand une cliente logge.

Trois rôles :
- `user` — cliente standard (par défaut).
- `coach` — coach qui suit aussi ses propres données + celles de ses clientes affiliées.
- `admin` — super-administrateur (gestion utilisateurs, accès global).

---

## 2. Stack technique

| Couche | Tech |
|--------|------|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | TailwindCSS v4, CSS custom properties, palette "Espresso & Rose" |
| State client | React Query (TanStack) |
| Icons | lucide-react |
| Backend | Supabase (Postgres 15, RLS, Storage, Realtime, Edge Functions Deno) |
| Auth | Supabase Auth (email + password) |
| PWA | `next-pwa` manuel (manifest + service worker) + Web Push (VAPID) |
| Recherche aliments | FatSecret API (proxy serveur) + table seed `foods` |
| Envoi HTTP serveur | `pg_net` + `extensions.http_post` (pour déclencher les Edge Functions) |

---

## 3. Rôles & parcours utilisateur

### 3.1 Inscription

À l'inscription (`/register`) l'utilisatrice choisit :

- **Cliente** → `role = user`
- **Coach** → `role = coach` (elle suit ses clientes + ses propres données)

Le rôle est stocké dans `profiles.role` et propagé dès la création du compte via le trigger `handle_new_user()` (lit `raw_user_meta_data->>'role'`).

> Une cliente peut à tout moment activer le **mode coaching** depuis `/profile` (carte "Devenir coach") via la fonction RPC `become_coach()` — sans downgrade possible pour éviter d'orpheliner des clientes.

### 3.2 Onboarding (`/onboarding`)

Flux en plusieurs étapes pour collecter :
- Prénom, âge, sexe
- Taille, poids actuel, poids objectif
- Niveau d'activité (sédentaire → très actif)
- Déficit visé (100–1000 kcal/j)

Dès que le profil est complet, `profiles.target_kcal` est calculé automatiquement par le trigger `recalc_profile_tdee()`.

### 3.3 Accueil selon le rôle

Le routage racine (`/`) redirige :
- `role = coach` ou `admin` → `/coach` (liste des clientes)
- Sinon → `/today`

### 3.4 Navigation

**BottomNav** (barre en bas, mobile) :
- **Cliente** : `Today` · `Stats` · `Profil`
- **Coach** : `Clientes` · `Mes données` · `Aliments` · `Stats` · `Profil`
- **Admin** : ajoute `/admin`

---

## 4. Fonctionnalités détaillées

### 4.1 Tableau de bord journalier (`/today`)

La page "Today" est le cœur de l'app pour la cliente.

Composants :
- **Date nav** — flèches `←/→` pour naviguer jour par jour. Label relatif ("Aujourd'hui", "Hier", "Il y a N jours"). Query string `?date=YYYY-MM-DD` propagée aux formulaires d'ajout.
- **Anneau kcal** (`KcalRing`) — camembert SVG animé, dégradé Espresso. Pourcentage = `net_kcal / target_kcal`. Passe en orange/rouge si l'objectif est dépassé.
- **KPIs** — Mangées (eaten) · Brûlées (burned) · Objectif (target).
- **Badge déficit** — `Déficit respecté` ou `Déficit dépassé`.
- **Liste des repas** — cliquables → `/meal/[id]` (fiche détaillée + commentaires).
- **Liste des activités**.
- **FAB** (bouton flottant) — raccourci vers `Ajouter repas` / `Ajouter activité`.

Mode **readonly** : quand un coach consulte `/coach/[clientId]`, c'est littéralement la même page mais avec `targetUserId = clientId`, `readonly = true`, pas de FAB, pas de liens d'ajout.

### 4.2 Log repas (`/log-meal`)

1. Choix du type (`breakfast` · `lunch` · `dinner` · `snack`).
2. Recherche d'aliments dans la base `foods` (seed) ou via **FatSecret** (fallback API).
3. Ajout d'items (nom, quantité en grammes).
4. Le trigger `recalc_meal_totals` calcule les macros totaux du repas à partir des items.
5. Le trigger `trg_meals_recalc` met à jour le `daily_log` du jour (kcal eaten, macros).
6. Upload de photos optionnel vers Supabase Storage (`media_urls[]`).

### 4.3 Log activité (`/log-activity`)

Types d'activité :
- **YouTube** — on colle l'URL, l'API `/api/youtube-oembed` récupère titre + thumbnail, estime les kcal via MET (4).
- **Gym** (MET 6), **Walk** (3.5), **Run** (9.8), **Cycling** (7.5), **Swim** (8), **Other** (4).

L'utilisatrice peut :
- Laisser l'estimation automatique `kcal = MET × poids × durée(h)`
- Ou saisir manuellement les kcal (champ overridable)
- Saisir le nombre de pas (pour `walk`/`run`), converti en kcal avec `pas × 0.04 × (poids/70)`

### 4.4 Fiche repas (`/meal/[id]`)

Page dédiée à un repas :
- Photo principale
- Macros (kcal, protéines, glucides, lipides)
- Liste des ingrédients avec quantités et kcal
- **Fil de commentaires** (`meal_comments`) en temps réel entre la cliente et son coach. RLS : seuls l'auteur du repas et son coach affilié peuvent lire/écrire. Polling de secours toutes les 10 s en plus du Realtime Supabase.

### 4.5 Commentaires

Deux niveaux de commentaires coexistent :

| Niveau | Table | Usage |
|--------|-------|-------|
| **Par jour** | `daily_logs.coach_comment` + `coach_commented_at` | Retour global du coach sur la journée (1 message remplaçable). |
| **Par repas** | `meal_comments` | Fil de discussion threadé, aller-retour coach ⇄ cliente sur un repas précis. |

### 4.6 Mensurations & poids

- `/profile` — formulaire **MeasurementsForm** : tour de taille, hanches, poitrine, bras G/D, cuisses G/D. Unique `(user_id, measured_at)` pour éviter les doublons dans la même journée.
- `weight_logs` — le poids peut être re-logué (historique séparé du `current_weight_kg` du profil).

### 4.7 Statistiques (`/stats`)

- Évolution du poids sur 30/90 j (courbe).
- Évolution des mensurations.
- Jours respectés vs dépassés (barres).
- IMC calculé à la volée (`computeBmi`) : Insuffisance · Normale · Surpoids · Obésité modérée · Obésité sévère.

### 4.8 Affiliation coach ↔ cliente

Via **code d'invitation** (table `profiles.invite_code` + fonction RPC dédiée) :

1. La coach récupère son code depuis `/profile` (carte "Mon code d'invitation").
2. La cliente saisit le code dans son profil → `profiles.coach_id` est renseigné.
3. Le coach voit alors la cliente dans `/coach`.
4. Désaffiliation possible (migration `0018_coach_unassign_client.sql`).

### 4.9 Notifications push (PWA)

Implémenté avec **Web Push (VAPID)** + Service Worker.

Flux :
1. L'utilisatrice active les notifs → le navigateur enregistre la `subscription` dans `push_subscriptions`.
2. Un événement serveur (trigger Postgres) appelle une **Edge Function** qui envoie les notifs à toutes les subs de la cible.

Triggers & Edge Functions :

| Déclencheur | Edge Function | Cible |
|-------------|---------------|-------|
| `daily_logs` UPDATE (logged something) | `client-log-notify` | Le coach affilié |
| `daily_logs.coach_comment` UPDATE | `coach-notify` | La cliente |
| `meal_comments` INSERT | `meal-comment-notify` | L'autre partie (coach ↔ cliente) |
| Cron hebdomadaire | `push-reminders` | Rappels de peser |

Les secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SERVICE_ROLE_KEY`) sont stockés en **Supabase Functions Secrets**. L'URL + service key sont lus côté Postgres depuis `public.app_config` via le helper `_cfg()` (migrations 0008, 0012).

### 4.10 Admin (`/admin`)

Réservé à `role = admin` :
- Liste globale des utilisateurs
- Fiche utilisateur (`/admin/users/[id]`) : profil + daily_logs + désaffiliation forcée
- Super-admin bootstrap via script SQL (migration 0015), réhashage bcrypt (0014), gestion tokens (0016).

---

## 5. Modèle de données (principales tables)

```
profiles (1↔1 auth.users)
  ├─ role (user | coach | admin)
  ├─ age, sex, height_cm, current_weight_kg, goal_weight_kg
  ├─ activity_level, deficit_kcal, tdee, target_kcal  ← recalculés auto
  ├─ coach_id → profiles(id)  (nullable)
  └─ invite_code (coach)

daily_logs  (1 par user × date, UNIQUE)
  ├─ total_kcal_eaten, total_kcal_burned, steps_kcal_burned
  ├─ net_kcal, target_kcal
  ├─ deficit_respected (bool)
  ├─ status (empty | partial | complete)
  └─ coach_comment, coach_commented_at

meals                  meal_items            activities
  ├─ meal_type          ├─ food_name          ├─ activity_type (youtube…swim)
  ├─ total_kcal*        ├─ quantity_g         ├─ duration_min
  ├─ media_urls[]       ├─ kcal_per_100g      ├─ steps, kcal_burned
  └─ notes              └─ macros/100g        └─ youtube_thumbnail

meal_comments (coach ⇄ cliente par repas)
weight_logs   (historique poids)
measurements  (tour de taille, hanches, etc.)
notifications (journal des push envoyés)
push_subscriptions (endpoints Web Push par user)
foods (catalogue aliments seed + FatSecret cache)
app_config (clés runtime pour triggers → edge functions)
```

---

## 6. Calculs

### 6.1 BMR (métabolisme de base) — Mifflin-St Jeor

```
BMR ♀ = 10 × poids_kg + 6.25 × taille_cm − 5 × âge − 161
BMR ♂ = 10 × poids_kg + 6.25 × taille_cm − 5 × âge + 5
```

### 6.2 TDEE (dépense énergétique totale)

```
TDEE = BMR × multiplicateur d'activité
```

| Niveau | Multiplicateur | Description |
|--------|---------------|-------------|
| Sédentaire | 1.2 | Peu ou pas d'exercice |
| Légèrement actif | 1.375 | 1–3 séances / semaine |
| Modérément actif | 1.55 | 3–5 séances / semaine |
| Très actif | 1.725 | 6–7 séances / semaine |

### 6.3 Objectif kcal journalier

```
target_kcal = TDEE − deficit_kcal   (deficit ∈ [0, 1500])
```

Estimation de la perte :
```
perte_hebdo_kg ≈ (deficit_kcal × 7) / 7700
```
(1 kg de graisse ≈ 7700 kcal).

> Tout ce calcul est fait **côté Postgres** par le trigger `recalc_profile_tdee()` sur `INSERT/UPDATE` de `profiles` (champs `age, sex, height_cm, current_weight_kg, activity_level, deficit_kcal`). Le `computeTdee` côté client n'est utilisé que pour l'aperçu en direct pendant l'onboarding.

### 6.4 Kcal depuis les pas

```
kcal_pas ≈ pas × 0.04 × (poids_kg / 70)
```

### 6.5 Kcal d'une activité libre (formule MET)

```
kcal = MET × poids_kg × (durée_min / 60)
```
Valeurs MET par défaut : YouTube=4, Gym=6, Walk=3.5, Run=9.8, Cycling=7.5, Swim=8, Other=4.

### 6.6 Agrégats quotidiens (`recalc_daily_log`)

À chaque INSERT/UPDATE/DELETE sur `meals`, `meal_items`, `activities`, le trigger appelle `recalc_daily_log(daily_id)` qui recalcule sur ce `daily_log` :

```
total_kcal_eaten     = Σ meals.total_kcal
total_kcal_burned    = Σ activities.kcal_burned
total_steps          = Σ activities.steps
steps_kcal_burned    = Σ (pas × 0.04 × poids/70)  pour walk/run
net_kcal             = eaten − burned − steps_kcal_burned
deficit_respected    = net_kcal ≤ target_kcal
status = empty   si 0 meal ET 0 activité
       | complete si ≥ 2 repas
       | partial  sinon
```

### 6.7 IMC

```
IMC = poids_kg / (taille_m²)
```
Codes couleur : `<18.5` info · `<25` success · `<30` neutral · `<35` warning · `≥35` accent.

### 6.8 Macros d'un item de repas

Les valeurs dans `foods` sont stockées **pour 100 g**. Pour un item :
```
kcal_total = quantity_g × kcal_per_100g / 100    (colonne générée)
protein_g_item = protein_per_100g × quantity_g / 100
carbs_g_item   = carbs_per_100g   × quantity_g / 100
fat_g_item     = fat_per_100g     × quantity_g / 100
```
Puis `recalc_meal_totals` somme tous les items pour obtenir `meals.total_*`.

---

## 7. Objectifs UX

1. **Mobile-first** — toutes les interactions pensées en 375 px, fixed bottom nav.
2. **Temps réel** — l'anneau kcal et les commentaires se mettent à jour instantanément (Supabase Realtime + polling de secours).
3. **Hors ligne léger** — Service Worker caché basique (PWA installable).
4. **Zéro friction** — `get_or_create_daily_log()` crée le journal automatiquement dès qu'on affiche `/today`.
5. **Sécurité** — RLS strict sur chaque table. Une cliente ne voit que ses données. Un coach ne voit que les `profiles.coach_id = auth.uid()`.
6. **Transparence des calculs** — le TDEE et target_kcal sont recalculés côté DB dès que le profil change, impossible d'avoir un écart client/serveur.

---

## 8. Edge Functions & Triggers — flux Push

```
┌────────────────────────────┐
│ cliente logge un repas     │
└────────┬───────────────────┘
         │  (trigger meals→daily_logs)
         ▼
┌────────────────────────────┐
│ daily_logs UPDATE          │
└────────┬───────────────────┘
         │  (trigger webhook via http_post)
         ▼
┌────────────────────────────┐
│ edge fn client-log-notify  │
│  → lit push_subscriptions   │
│  → sendNotification (VAPID) │
│  → insert notifications     │
└────────┬───────────────────┘
         ▼
     coach reçoit le push
```

Même flux pour :
- **coach commente** (`daily_logs.coach_comment` → `coach-notify` → cliente)
- **meal_comment INSERT** (`meal-comment-notify` → l'autre partie)

Les triggers utilisent `public._cfg('supabase_url')` + `public._cfg('service_role_key')` (table `app_config`) pour appeler les functions via `extensions.http_post`.

---

## 9. Migrations Supabase (ordre)

| # | Fichier | Contenu |
|---|---------|---------|
| 0001 | `0001_schema.sql` | Enums, tables principales (profiles, daily_logs, meals, meal_items, activities, weight_logs, measurements) |
| 0002 | `0002_triggers.sql` | `handle_new_user`, `recalc_profile_tdee`, `recalc_meal_totals`, `recalc_daily_log`, `get_or_create_daily_log` |
| 0003 | `0003_rls.sql` | Policies RLS (cliente + coach affilié) |
| 0004 | `0004_seed_food.sql` | Catalogue d'aliments de base |
| 0005 | `0005_admin.sql` | Rôle admin, enum mise à jour |
| 0006 | `0006_invite_code.sql` | Codes d'invitation coach → cliente |
| 0007 | `0007_super_admin.sql` | Bootstrap super-admin |
| 0008 | `0008_webhooks.sql` | `app_config`, helper `_cfg`, triggers HTTP via `pg_net` |
| 0009 | `0009_meal_comments.sql` | Table `meal_comments` + RLS + publication realtime + trigger edge fn |
| 0010 | `0010_become_coach.sql` | RPC `become_coach()` |
| 0011 | `0011_notifications_and_coach_trigger.sql` | Table `notifications` + trigger `coach-notify` |
| 0012 | `0012_fix_pg_net_http_post.sql` | Correctif signature `extensions.http_post` |
| 0013 | `0013_notifications_realtime.sql` | Publication `notifications` en realtime |
| 0014 | `0014_super_admin_bcrypt_rehash.sql` | Rehash bcrypt password |
| 0015 | `0015_ensure_super_admin.sql` | Idempotence création super-admin |
| 0016 | `0016_super_admin_auth_identities_and_tokens.sql` | Identities & session tokens |
| 0017 | `0017_measurements_unique_user_measured_at.sql` | Unicité mensurations par jour |
| 0018 | `0018_coach_unassign_client.sql` | Désaffiliation forcée (admin) |

---

## 10. Palette & design

Theme **Espresso & Rose**, clair par défaut :
- Primary : `#4f2b1f` (espresso)
- Primary-soft : `#7a4535`
- Accent : `#e5a4b8` (rose poudré)
- Background : `#faf0f5`
- Card : `#ffffff`
- Card-soft : `#f7e5ec`
- Success : `#6b8e23`
- Warning : `#d97706`
- Text : `#2c1810`
- Muted : `#8a6f63`

Classe utilitaire `.on-warm` → texte clair sur fonds bruns foncés (remplace l'ancien `text-[var(--color-dominant)]` de la palette Sunset abandonnée).

---

## 11. Sécurité

- **RLS activé sur toutes les tables métier**. Policies vérifiées dans `0003_rls.sql` et complétées dans chaque migration qui ajoute une table.
- Les **Edge Functions** utilisent la `SERVICE_ROLE_KEY` côté serveur uniquement.
- Les **triggers** sont en `SECURITY DEFINER` avec `search_path = public` fixé pour éviter les attaques par schema shadowing.
- Les webhooks Postgres → Edge Functions envoient un `Bearer <service_role_key>` pour l'authentification.
- Upload photos → Supabase Storage bucket privé, URL signées côté serveur (`/api/upload`).

---

## 12. Liens utiles

- **Routes** : `app/(auth)/*` · `app/(app)/*` · `app/api/*`
- **Composants UI** : `components/ui/` (primitives), `components/shared/` (FAB, BottomNav, PwaPrompt, InviteCodeCard, MediaUploader, FoodSearchInput), `components/daily/` (KcalRing)
- **Calculs** : `lib/calculations/{tdee,steps-kcal,bmi}.ts`
- **Supabase clients** : `lib/supabase/{client,server}.ts`
- **Migrations** : `supabase/migrations/*.sql`
- **Edge Functions** : `supabase/functions/*/index.ts`
