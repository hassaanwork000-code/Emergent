# Elite AI Basketball Coach — PRD

## Original Problem Statement
Responsive web app (desktop + mobile) for ambitious basketball players acting as a personal trainer, shooting coach, film analyst, and development tracker. Web rebuild of an existing mobile app. Stack: React + FastAPI + MongoDB, Emergent Universal LLM key (Claude Sonnet 5), OpenAI TTS (onyx), Emergent Object Storage for videos, email/password JWT auth.

## User Choices
- AI: Claude Sonnet 5 (`anthropic/claude-sonnet-5`) via Emergent Universal Key
- TTS: OpenAI `tts-1`, voice `onyx`
- Auth: Email/password JWT only (Google login deferred)
- Build order: everything, then test
- Seed data (24 skills, ~20 players) authored in-app
- Budget-conscious build

## Architecture
- Backend `/app/backend/server.py` — all `/api` routes; `seed_data.py` holds skills/players/archetypes/badges/daily pool.
- JWT (7-day) + bcrypt; token in response body, `Authorization: Bearer` header; `?token=` for file serving.
- AI via `emergentintegrations` LlmChat (Claude Sonnet 5) + OpenAITextToSpeech; TTS cached in Mongo by sha256.
- Object Storage for videos (init at startup); owner-isolated file serving.
- Frontend React (CRA + craco `@` alias), react-router, Tailwind, shadcn/ui, lucide icons, sonner toasts. AuthContext + Protected/PublicOnly routes; onboarding gate.

## Personas
- HS/College player chasing a target archetype; wants daily direction, form feedback, and progress tracking.

## Core Requirements (static)
Auth, deep onboarding, dashboard, AI coach (+TTS), training plan generator, shot tracker + SVG heatmap, form analysis (photo), film room (webcam/upload + frame extraction + multi-frame analysis), clip history, pressure mode, weekly report, skill library (24 skills, YouTube + TTS walkthrough), player lab (20 seed + AI lookup), achievements/badges, share card.

## Implemented (2026-06)
- ✅ All core features, end-to-end, DB-backed. Tested 24/24 backend + all frontend flows (iteration_1).
- ✅ MongoDB collections: users, messages, workouts, plans, shots, analyses, videos, challenges, tts_cache.
- ✅ Dark athletic UI: lime #C6FF00 / blue #2F80FF, Barlow Condensed + JetBrains Mono, responsive sidebar + mobile bottom nav.
- Fix: form/video prompt strings switched from `.format()` to `.replace()` (JSON-brace KeyError).

### Follow-up features (2026-06, iteration_2 — 9/9 green)
- ✅ Emergent Google login alongside email/password — converges on the same app JWT (POST /api/auth/google exchanges session_id; AuthCallback stores token). No cookies.
- ✅ AI Coach hands-free mode — toggle auto-speaks every reply via OpenAI TTS onyx.
- ✅ Progress Trends — GET /api/progress/trends (8-week buckets: fg_pct + dev_score); recharts line chart on Weekly Report.
- ✅ Streak reminders — dashboard `trained_today` drives a nudge banner + once-a-day browser Notification.

### Iteration 3 (2026-06 — 14/14 green)
- ✅ Coach Memory — coach prompt now injects recent training (7-day FG%, coldest zone, streak, last analysis score/issue, best pressure run) so advice references real reps.
- ✅ Analyze hub — merged Form Analysis (Photo) + Film Room (Video) into one `/analyze` page with tabs; `/form` & `/film` redirect there.
- ✅ Live Shooting Session (`/session`) — timed session with live heatmap + make/miss/undo, `POST /api/sessions/finish` aggregates + returns an AI recap, writes shots (session_id) and a workout. `sessions` collection.
- ✅ Session Compare (`/compare`) — pick two shooting sessions or two analyses, rendered side-by-side.
- ✅ Goal Countdown (`/goals`) — `/api/goals` seeded from profile goals; per-goal target date + progress slider with live days-left countdown. `goals` collection.
- ✅ Shareable Trend — canvas export of the 8-week dev-score/FG% line as a share/download card.
- ✅ Voice-first Coach — Web Speech API mic on the coach input (STT), auto-sends the transcript.

## Backlog / Remaining
- P1: Emergent Google social login (deferred by user).
- P2 (from code review): async object-storage calls (to_thread/httpx), Mongo aggregations for shots/streak, TTS audio → object storage w/ TTL, rate-limit AI player lookup, signed file URLs instead of `?token=`.

## Next Tasks
- Add Google login when requested; consider splitting server.py into routers as features grow.
