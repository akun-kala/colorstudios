# 🎮 Quest AI

> Turn your deadlines into epic quests. AI that understands you.

## 🚀 Quick Start

```bash
# 1. Copy environment variables
cp .env.example .env
# Edit .env dengan API key-mu (opsional, tanpa AI tetap jalan rule-based)

# 2. Install dependencies
npm install

# 3. Run dev server
npm run dev

# 4. Build for production
npm run build
```

## 🔧 Setup Firebase (Opsional)

1. Buka [Firebase Console](https://console.firebase.google.com)
2. Buat project baru
3. Aktifkan Authentication → Google Sign-in
4. Aktifkan Firestore Database
5. Copy config ke `.env`

## 🔧 Setup OpenAI (Opsional)

1. Buka [OpenAI Platform](https://platform.openai.com)
2. Generate API key
3. Masukkan ke `VITE_OPENAI_API_KEY` di `.env`
4. Tanpa API key, Nyx pakai rule-based (tetap jalan!)

## 📁 Project Structure

```
quest-ai/
├── src/
│   ├── components/     # React components
│   ├── stores/         # Zustand state management
│   ├── db/             # Dexie (IndexedDB) database
│   ├── types/          # TypeScript types
│   ├── utils/          # Helper functions
│   ├── config/         # Firebase config
│   ├── services/       # Sync & AI NLP services
│   ├── App.tsx         # Main app
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles + Tailwind
├── public/             # Static assets
├── .env.example        # Environment template
├── index.html
├── vite.config.ts      # Vite + PWA config
├── tailwind.config.js  # Tailwind theme
└── package.json
```

## ✨ Features

### Phase 1 — PWA MVP
- ✅ Create Quest (deadline & interval types)
- ✅ Stage Tracker with checklist
- ✅ Smart Alerts (Boss Battle, H-3, H-1, etc.)
- ✅ XP, Level, Streak system
- ✅ Dark mode (default)
- ✅ PWA (installable, offline-first)
- ✅ IndexedDB storage

### Phase 2 — AI Game Master
- ✅ Nyx proactive cards (Morning Brief, Boss Battle, Routine Nudge)
- ✅ Quick Ask dengan jawaban personal
- ✅ Confidence scoring
- ✅ Pattern learning

### Phase 3 — Gamification Polish
- ✅ Achievement System (8 achievements)
- ✅ Character Classes (5 classes dengan buff unik)
- ✅ Class buff calculation
- ✅ Level Up Animation
- ✅ Rarity visual effects

### Phase 4 — Backend & Cloud
- ✅ Firebase Auth (Google Sign-in)
- ✅ Firestore Cloud Sync
- ✅ AI NLP (OpenAI GPT-4o-mini / rule-based fallback)
- ✅ Data Export/Backup (.json)
- ✅ Profile Panel

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Storage | Dexie.js (IndexedDB) + Firestore |
| Auth | Firebase Auth |
| PWA | vite-plugin-pwa |
| AI | OpenAI GPT-4o-mini / Rule-based fallback |
| Icons | Lucide React |

## 🗺️ Roadmap

| Phase | Status | Features |
|-------|--------|----------|
| 0 | ✅ | Concept Validation |
| 1 | ✅ | PWA MVP |
| 2 | ✅ | AI Game Master |
| 3 | ✅ | Gamification Polish |
| 4 | ✅ | **Backend & Cloud** |
| 5 | ⏳ | Native App & Party System |

## 📝 License

MIT — Build for yourself first.
