# 🎮 Game Buds

A social app for gamers — talk, find players, share clips, discover indies.

## What it is

Game Buds combines four things gamers currently juggle across many apps:

- **💬 Group chats** — one room per game, real-time
- **🎮 LFG (Looking For Group)** — post what you want to play, find players
- **📹 Clip feed** — vertical TikTok-style feed for gaming clips
- **🕹️ Indie corner** — discover indie games and plan co-op buys

## Status

Early scaffold. The UI shell is done — auth, backend, and real features are next.

## Tech stack

- **Frontend:** React Native + Expo (iOS, Android, Web from one codebase)
- **Backend:** Supabase (planned) — Postgres, auth, real-time, file storage
- **Language:** JavaScript

## Run it on your phone

1. Install [Expo Go](https://expo.dev/go) on your phone (App Store / Play Store).
2. Install dependencies:
   ```bash
   cd game-buds
   npm install
   ```
3. Start the dev server:
   ```bash
   npm start
   ```
4. Scan the QR code in your terminal with Expo Go (Android) or your iPhone Camera app (iOS).

## Run in a web browser

```bash
npm run web
```

## Roadmap

### Phase 1 — MVP
- [x] App shell with bottom tab nav
- [ ] Email + Google sign-in
- [ ] User profile (username, avatar, favorite games)
- [ ] Real-time game chat rooms
- [ ] LFG post board
- [ ] Video upload + vertical feed

### Phase 2 — Social depth
- [ ] DMs and friends
- [ ] Likes, comments, follows on clips
- [ ] Push notifications

### Phase 3 — Indie corner
- [ ] Indie game directory
- [ ] Co-buy planning + wishlists
- [ ] Verified indie dev accounts
