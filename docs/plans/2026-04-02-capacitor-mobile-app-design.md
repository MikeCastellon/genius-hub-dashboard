# Pro Hub Mobile App — Capacitor Design

**Date:** 2026-04-02
**Status:** Approved
**Approach:** Capacitor (wrap existing React app in native shell)

## Context

Pro Hub is a SaaS detailing business management app (React 19 + Vite + Tailwind + Supabase) deployed to Netlify. It needs to ship as native apps on the Apple App Store and Google Play Store with full feature parity and push notifications.

## Architecture

```
App Store / Play Store
        |
Capacitor Native Shell
  ┌─────────────────────────┐
  │  React App (WebView)    │
  │  Same code, Vite build  │
  └─────────────────────────┘
  Native Plugins:
  - @capacitor/push-notifications
  - @capacitor/camera
  - @capacitor/splash-screen
  - @capacitor/status-bar
  - @capacitor/app
  - @capacitor/haptics
  - @capawesome/barcode-scanner
        |
Supabase Backend (unchanged)
  Auth · Database · Edge Functions
```

The web version on Netlify remains untouched. Same codebase serves web + iOS + Android.

## Native Plugin Strategy

### Replaced with native
- **Barcode scanning**: Zxing/Barkoder WASM replaced with `@capawesome/barcode-scanner` (native camera, faster autofocus)
- **Push notifications**: `@capacitor/push-notifications` for FCM (Android) and APNs (iOS)

### New native capabilities
- **Splash screen**: ACG logo, white background, fade transition
- **Status bar**: Styled to match red brand theme
- **App lifecycle**: Deep links, Android back button, resume/pause events
- **Haptic feedback**: Subtle taps on clock in/out, button confirmations

### Unchanged
- All routing, pages, components, business logic
- Supabase auth + database calls
- Tailwind styling, Recharts charts

## Push Notification Flow

1. App registers with FCM/APNs on launch, receives device token
2. Token stored in new Supabase `device_tokens` table (linked to user profile)
3. Supabase Edge Function fires on database events (new appointment, shift reminder, etc.)
4. Edge Function sends push via FCM/APNs using stored tokens

### `device_tokens` table schema
```sql
id uuid primary key default gen_random_uuid()
user_id uuid references profiles(id) on delete cascade
token text not null
platform text not null check (platform in ('ios', 'android'))
created_at timestamptz default now()
updated_at timestamptz default now()
unique(user_id, token)
```

## App Identity

- **App name:** Pro Hub
- **Subtitle:** Sales & Service by Auto Care Genius
- **Bundle ID:** com.autocaregenius.prohub (both platforms)
- **App icon:** ACG logo mark, 1024x1024 source
- **Splash screen:** ACG logo centered, white background

## Permissions

- Camera (barcode scanning)
- Push notifications
- Internet access

## Build & Deployment

### Project structure
```
DetailersIntakeApp/
├── src/                    (React code, unchanged)
├── dist/                   (Vite build output)
├── ios/                    (Xcode project, generated)
├── android/                (Android Studio project, generated)
├── capacitor.config.ts     (Capacitor config, new)
├── vite.config.ts          (unchanged)
└── package.json            (+ capacitor dependencies)
```

### Build flow
1. `vite build` produces `dist/`
2. `npx cap sync` copies dist into native projects
3. Xcode (iOS) or Android Studio (Android) to build/test

### Update strategy
- **Web layer changes** (features, bug fixes, UI): Live update, no store review
- **Native shell changes** (new plugin, permissions, splash): Requires store review

## Accounts Required

- Apple Developer: Already have ($99/yr)
- Google Play Developer: Need to set up ($25 one-time)

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind 4, Vite 7 |
| Backend | Supabase (auth, database, edge functions) |
| Native wrapper | Capacitor 6 |
| iOS build | Xcode on MacBook Air |
| Android build | Android Studio |
| Web deploy | Netlify (unchanged) |
| Push (iOS) | APNs via Supabase Edge Functions |
| Push (Android) | FCM via Supabase Edge Functions |
