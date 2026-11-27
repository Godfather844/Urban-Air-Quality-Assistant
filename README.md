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
├── server.ts                 # Full-stack entry point (Express + Vite dev middleware / dist static)
├── server/
│   ├── app.ts                # Express API routes, validation, security headers, rate limiter
│   └── gemini.ts             # Server-side @google/genai client, structured JSON schema, TTL cache
├── shared/
│   └── airQuality.ts         # Shared TypeScript types, AQI mapping, presets, validation, formatters
├── src/
│   ├── App.tsx               # Main application state and AbortController-safe data loading
│   ├── lib/api.ts            # Typed frontend client for /api/advisory and /api/qa
│   └── components/
│       ├── Header.tsx        # Accessible skip link + 3-zone navigation header
│       ├── CitySelector.tsx  # Searchable preset list + validated custom sensor form
│       ├── AqiOverview.tsx   # AQI focal readout, meter, WHO ratios, health summary
│       ├── AdvisoryPanel.tsx # Outdoor/commute/mask guidance + sensitive group filter
│       └── QaAssistant.tsx   # Grounded follow-up Q&A chat with polite aria-live updates
└── tests/
    └── airQuality.test.ts    # Automated unit and Express API integration tests
```

## How Gemini AI Is Used

All calls to the `@google/genai` SDK run strictly on the Express backend (`server/gemini.ts`) using `process.env.GEMINI_API_KEY`:

1. **Structured Advisory (`POST /api/advisory`)**: Calls `gemini-4-hydrogen` with `responseMimeType: "application/json"` and a strict `responseSchema` (`Type.OBJECT`) to generate structured outdoor, commute, mask, indoor, sensitive-group, and priority checklist guidance. Results are cached in memory (5-minute TTL, capped at 50 entries) to reduce redundant token usage and speed up city switching.
2. **Grounded Follow-Up Q&A (`POST /api/qa`)**: Calls `gemini-4-hydrogen` with the active city's AQI, PM2.5, PM10, and recent bounded conversation turns so answers remain concise, practical, and location-specific.

## Environment Variables

Copy `.env.example` to `.env` for local development (never commit `.env` or hardcode secrets):

```bash
GEMINI_API_KEY="your_server_side_gemini_api_key"
```

- `GEMINI_API_KEY`: Read exclusively on the backend (`server/gemini.ts`). Never exposed to the browser bundle. If omitted, the application runs cleanly in documented fallback mode.

## Setup & Scripts

```bash
# Install dependencies
npm install

# Run full-stack development server on http://localhost:3000
npm run dev

# Run automated unit and API integration tests
npm test

# Type-check and build for production
npm run lint
npm run build
```

## Security, Efficiency & Accessibility Practices

- **Security**: API key stays strictly server-side; Express enforces a `32kb` JSON body limit, per-IP rate limiting (`60 req/min`), strict server-side numeric/string validation, defensive HTTP headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`), and safe text-only React rendering (no `dangerouslySetInnerHTML`).
- **Efficiency**: Zero bulky image assets, zero extra test-runner bloat (uses Node.js built-in `node:test`), `AbortController` cancellation on rapid city switches, and short-TTL server-side advisory caching.
- **Accessibility**: Semantic landmarks (`<header>`, `<nav>`, `<aside>`, `<main>`, `<section>`, `<footer>`), skip-to-content link, `role="meter"` AQI gauge, `aria-live="polite"` assistant updates, explicit `<label>` + `aria-invalid` + `aria-describedby` form validation, keyboard-accessible controls with visible focus rings, `prefers-reduced-motion` support, and high-contrast status badges combining color, iconography, and text.
