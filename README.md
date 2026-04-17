# âœ¦ SlimTrack

PWA mobile-first de suivi de perte de poids. **Next.js 16 + Supabase + Cloudinary + Serwist (PWA)**. Toute la logique mÃ©tier vit dans Supabase (triggers + RLS + Edge Functions) ; Next.js n'expose que 2 API routes serveur : signature Cloudinary et proxy oEmbed YouTube.

Doc complÃ¨te : `docs/PRD.md`. Migrations SQL : `supabase/migrations/`.

## DÃ©marrage rapide

1. `cp .env.example .env.local` puis remplis les clÃ©s **Supabase** (URL + anon + service role) et **Cloudinary** (cloud name + API key + secret).
2. Dans ton projet Supabase, exÃ©cute dans l'ordre (SQL Editor) :
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_triggers.sql`
   - `supabase/migrations/0003_rls.sql`
   - `supabase/migrations/0004_seed_food.sql`
3. Ajoute `http://localhost:3000/auth/callback` dans **Authentication â†’ URL Configuration**.
4. (Optionnel) GÃ©nÃ¨re les types TS : `pnpm dlx supabase gen types typescript --project-id <ref> --schema public > types/database.ts`.
5. `pnpm dev` â†’ http://localhost:3000

## Scripts

```bash
pnpm dev          # dev server
pnpm build        # build production (active Serwist PWA)
pnpm start        # prod server
pnpm lint         # ESLint
```

## Architecture

```
app/
  (auth)/           login, register      â€” groupes de routes non authentifiÃ©es
  (app)/            today, stats, profile, log-meal, log-activity, coach
  api/              upload (Cloudinary sign) + youtube-oembed
  auth/callback/    Ã©change du code OAuth/magic link
  sw.ts             service worker source (compilÃ© vers public/sw.js par Serwist)
components/
  ui/               Button, Card, Input, Slider, BottomSheet, Toast, Badgeâ€¦
  daily/            KcalRing (anneau SVG animÃ©)
  shared/           Providers, BottomNav, FAB, FoodSearchInput, MediaUploader
lib/
  supabase/         client / server / middleware (SSR cookies)
  cloudinary/       signature + transformations + client upload
  calculations/     Mifflin-St Jeor (TDEE), BMI, kcal depuis pas
  utils/            cn, format
supabase/
  migrations/       schÃ©ma + triggers + RLS + seed food
  functions/        push-reminders, coach-notify (Web Push)
```

## Design system

Dark-mode only, tokens CSS dans `app/globals.css` (Â§8 du PRD) :
- Violet #A855F7 (primary) Â· Rose #EC4899 (accent) Â· Vert menthe #10B981 (success)
- Corail #F97316 (warning) Â· Ciel #38BDF8 (info) Â· Ambre #F59E0B (neutral)
- Fond #0F0A1A Â· Card #1A1028 Â· Texte #F0E6FF Â· Muted #9B89B8

## TODO avant prod

- [ ] Fournir icÃ´nes PWA dans `public/icons/` (192, 512, maskable)
- [ ] CrÃ©er VAPID keys (`npx web-push generate-vapid-keys`) et pousser sur Supabase Functions
- [ ] DÃ©ployer les 2 Edge Functions (`push-reminders`, `coach-notify`) + scheduled trigger
- [ ] RÃ©gÃ©nÃ©rer `types/database.ts` via Supabase CLI pour avoir les types stricts
- [ ] Tests Playwright E2E (Phase 4)

---

*Bootstrapped via `create-next-app` ; voir `docs/PRD.md` pour la spec produit complÃ¨te.*
