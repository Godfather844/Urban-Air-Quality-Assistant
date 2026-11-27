# Urban Air Quality Assistant

An accessible, lightweight full-stack web application that translates urban air quality readings (**AQI**, **PM2.5**, and **PM10**) into actionable outdoor, commute, mask, and sensitive-group health guidance powered by the Gemini API.

## Key Features

- **Preset Urban Profiles & Custom Readings**: Includes realistic presets for **Delhi**, **Prayagraj**, **Mumbai**, **Bengaluru**, **London**, and **Tokyo**, plus a searchable selector and a validated **Custom Input** form for any city and sensor values (`AQI 0–500`, `PM2.5 0–1000 µg/m³`, `PM10 0–2000 µg/m³`).
- **Clear AQI Status & Particulate Calibration**: Displays AQI score, five standardized severity bands (**Good**, **Moderate**, **Poor**, **Unhealthy**, **Severe**) with high-contrast badges (icon + text, never color alone), an accessible AQI severity meter, WHO 24-hour particulate comparisons (`PM2.5: 15 µg/m³`, `PM10: 45 µg/m³`), and a health risk summary.
- **Server-Side Gemini AI Guidance**:
  - Actionable **Outdoor Activity**, **Commute & Transit**, **Mask & Respirator**, and **Indoor Air** recommendations.
  - **Tailored Sensitive Group Advice** for **Children**, **Older Adults**, and people with **Asthma & Respiratory Conditions**.
  - **Follow-Up Q&A Assistant** grounded in the active city's AQI, PM2.5, and PM10 measurements, with quick-start prompts.
- **Resilient Graceful Fallback**: Automatically falls back to deterministic, evidence-based guidance with a transparent status notice if `GEMINI_API_KEY` is missing or rate-limited (`429`).

## Architecture

```text
├── server.ts                       # Full-stack entry point (Express + Vite dev / dist static + graceful shutdown)
├── server/
│   ├── app.ts                      # Express API routes (/api/health, /api/presets, /api/advisory, /api/qa)
│   ├── cache.ts                    # Bounded in-memory TtlCache for fast repeat advisories
│   ├── config.ts                   # Centralized runtime limits, env key lookup, and sanitized logging
│   ├── gemini.ts                   # Server-side @google/genai integration with responseSchema and fallback
│   └── middleware.ts               # Security headers, memory-bounded per-IP rate limiter, JSON error handler
├── shared/
│   ├── airQuality.ts               # Public domain barrel re-export
│   ├── aqi.ts                      # Five-band AQI classification, metadata tokens, and WHO ratio math
│   ├── fallback.ts                 # Evidence-based fallback advisory and topic-aware Q&A builders
│   ├── presets.ts                  # Curated preset cities, WHO guidelines, and validation bounds
│   ├── types.ts                    # Shared strict TypeScript contracts
│   └── validation.ts               # Input validation, text sanitization, and response formatting
├── src/
│   ├── App.tsx                     # Root application layout
│   ├── main.tsx                    # StrictMode + ErrorBoundary entry mount
│   ├── lib/api.ts                  # Typed fetch client with AbortController guard
│   ├── hooks/
│   │   ├── useAdvisory.ts          # Advisory fetch lifecycle and stale-request cancellation
│   │   └── useAirQualityQa.ts      # Grounded Q&A state and automatic reading-change reset
│   └── components/
│       ├── Header.tsx              # Accessible skip link + 3-zone navigation bar
│       ├── CitySelector.tsx        # Tabbed monitoring station container
│       ├── PresetCityList.tsx      # Searchable preset city list
│       ├── CustomReadingForm.tsx   # Validated custom city/AQI/PM2.5/PM10 input form
│       ├── AqiOverview.tsx         # AQI readout, calibrated severity meter, WHO particulate benchmarks
│       ├── AdvisoryPanel.tsx       # Outdoor/commute/mask guidance + filterable sensitive groups
│       ├── QaAssistant.tsx         # Grounded follow-up Q&A interface with aria-live updates
│       └── ErrorBoundary.tsx       # Accessible React error boundary
└── tests/
    └── airQuality.test.ts          # Automated unit, cache, and Express API integration tests
```

## How Gemini AI Is Used

All calls to the `@google/genai` SDK run strictly on the Express backend (`server/gemini.ts`) using `process.env.GEMINI_API_KEY`:

1. **Structured Advisory (`POST /api/advisory`)**: Calls `gemini-4-hydrogen` with `responseMimeType: "application/json"` and a strict `responseSchema` (`Type.OBJECT`) to generate structured outdoor, commute, mask, indoor, sensitive-group, and priority checklist guidance. Results are cached in memory via `TtlCache` (5-minute TTL, capped at 50 entries) to reduce redundant token usage and speed up city switching.
2. **Grounded Follow-Up Q&A (`POST /api/qa`)**: Calls `gemini-4-hydrogen` with the active city's AQI, PM2.5, PM10, and recent bounded conversation turns so answers remain concise, practical, and location-specific.

## Environment Variables

Copy `.env.example` to `.env` for local development (never commit `.env` or hardcode secrets):

```bash
GEMINI_API_KEY="your_server_side_gemini_api_key"
```

- `GEMINI_API_KEY`: Read exclusively on the backend (`server/config.ts`). Never exposed to the browser bundle. If omitted, the application runs cleanly in documented fallback mode.

## Setup & Scripts

```bash
# Install dependencies
npm install

# Run full-stack development server on http://localhost:3000
npm run dev

# Run automated unit, cache, and API integration tests
npm test

# Run strict TypeScript type-checking, tests, and production build together
npm run check
```

## Security, Efficiency & Accessibility Practices

- **Security**: API key stays strictly server-side; Express enforces a `32kb` JSON body limit, per-IP rate limiting (`60 req/min`), strict server-side numeric/string validation, defensive HTTP headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`), and safe text-only React rendering (no `dangerouslySetInnerHTML`).
- **Efficiency**: Zero bulky image assets, zero extra test-runner bloat (uses Node.js built-in `node:test`), `AbortController` cancellation on rapid city switches, and short-TTL server-side advisory caching.
- **Accessibility**: Semantic landmarks (`<header>`, `<nav>`, `<aside>`, `<main>`, `<section>`, `<footer>`), skip-to-content link, `role="meter"` AQI gauge, `aria-live="polite"` assistant updates, explicit `<label>` + `aria-invalid` + `aria-describedby` form validation, keyboard-accessible controls with visible focus rings, `prefers-reduced-motion` support, and high-contrast status badges combining color, iconography, and text.
