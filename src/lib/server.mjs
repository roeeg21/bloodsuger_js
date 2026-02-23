import express from "express";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

/**
 * Pick base URL:
 *  - Production US: https://api.dexcom.com
 *  - Production EU (and outside US): https://api.dexcom.eu
 *  - Production JP: https://api.dexcom.jp
 *  - Sandbox: https://sandbox-api.dexcom.com
 */
const DEXCOM_BASE = process.env.DEXCOM_BASE || "https://api.dexcom.eu";
const FALLBACK_API_BASE = process.env.FALLBACK_API_BASE || "https://bloodsuger.vercel.app";

const TOKEN_URL = `${DEXCOM_BASE}/v3/oauth2/token`;
const LOGIN_URL = `${DEXCOM_BASE}/v3/oauth2/login`;

const CLIENT_ID = process.env.DEXCOM_CLIENT_ID || "fPGvwzmjPDis948Oj6K15mWzVa9rlujY";
const CLIENT_SECRET = process.env.DEXCOM_CLIENT_SECRET || "RiehJw8nynYSvhLJ"; // if required, set it in env
const REDIRECT_URI =
  process.env.DEXCOM_REDIRECT_URI || `http://localhost:${PORT}/auth/dexcom/callback`;
const SCOPE = process.env.DEXCOM_SCOPE || "offline_access";

// In real apps store per-user in DB. This is just demo memory storage.
let tokenStore = {
  access_token: null,
  refresh_token: null,
  expires_at: null, // unix seconds
};

// Minimal CSRF protection: keep valid "state" values for a short time
const pendingStates = new Map(); // state -> expires_at

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function createState() {
  return crypto.randomBytes(16).toString("hex");
}

function pruneStates() {
  const t = nowSeconds();
  for (const [state, exp] of pendingStates.entries()) {
    if (exp <= t) pendingStates.delete(state);
  }
}

// Helper: Map Dexcom trend to user-friendly format
function mapDexcomTrend(dexcomTrend) {
  const trendMap = {
    'doubleUp': 'rising quickly',
    'singleUp': 'rising',
    'fortyFiveUp': 'rising slightly',
    'flat': 'steady',
    'fortyFiveDown': 'falling slightly',
    'singleDown': 'falling',
    'doubleDown': 'falling quickly',
  };
  return trendMap[dexcomTrend] || 'steady';
}

// Helper: Determine status based on glucose value
function getGlucoseStatus(value) {
  if (value <= 60) return 'low';
  if (value >= 250) return 'high';
  return 'ok';
}

function normalizeEgvsRecord(record) {
  return {
    Glucose: record.value,
    Status: getGlucoseStatus(record.value),
    Trend: mapDexcomTrend(record.trend),
    Time: record.systemTime,
  };
}

async function fetchFallbackJson(pathname) {
  const url = `${FALLBACK_API_BASE}${pathname}`;
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  const text = await r.text();
  if (!r.ok) {
    const err = new Error(`Fallback API failed (${r.status}) at ${url}: ${text}`);
    err.statusCode = r.status;
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Fallback API returned non-JSON from ${url}`);
  }
}

async function fetchFallbackJsonFromPaths(paths) {
  const errors = [];
  for (const path of paths) {
    try {
      return await fetchFallbackJson(path);
    } catch (err) {
      errors.push(String(err));
    }
  }
  throw new Error(`All fallback paths failed: ${errors.join(" | ")}`);
}

function normalizeFallbackReading(record) {
  if (!record || (typeof record !== "object")) {
    throw new Error("Fallback reading is not an object");
  }

  const glucoseRaw = record.Glucose;
  const glucose =
    typeof glucoseRaw === "string" ? Number.parseInt(glucoseRaw, 10) : glucoseRaw;

  if (!Number.isFinite(glucose)) {
    throw new Error("Fallback reading missing valid Glucose");
  }

  const rawTime = typeof record.Time === "string" ? record.Time.trim() : "";
  // Handle fallback format like "2026-02-23 08:54:47"
  const normalizedTime = rawTime.includes("T")
    ? rawTime
    : rawTime
      ? rawTime.replace(" ", "T")
      : new Date().toISOString();

  const validStatuses = new Set(["low", "ok", "high"]);
  const status = validStatuses.has(record.Status) ? record.Status : getGlucoseStatus(glucose);

  return {
    Glucose: glucose,
    Status: status,
    Time: normalizedTime,
    Trend: typeof record.Trend === "string" ? record.Trend : "steady",
    test: record.test ?? null,
  };
}

// Home
app.get("/", (req, res) => {
  res.type("text").send(
    [
      `Dexcom OAuth demo`,
      ``,
      `1) Go to: http://localhost:${PORT}/auth/dexcom`,
      `2) After connecting:`,
      `   - Check: http://localhost:${PORT}/status`,
      `   - Call:  http://localhost:${PORT}/egvs?start=2026-01-17T00:00:00&end=2026-01-17T06:00:00`,
    ].join("\n")
  );
});

// 1) Start OAuth: redirect user to Dexcom login
app.get("/auth/dexcom", (req, res) => {
  pruneStates();
  const state = createState();
  pendingStates.set(state, nowSeconds() + 10 * 60); // valid for 10 minutes

  const loginUrl =
    `${LOGIN_URL}?` +
    new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: SCOPE,
      state,
    }).toString();

  res.redirect(loginUrl);
});

// 2) OAuth callback: exchange "code" -> tokens
app.get("/auth/dexcom/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res
      .status(400)
      .type("text")
      .send(`OAuth error: ${error}\n${error_description || ""}`);
  }

  if (!code) return res.status(400).type("text").send("Missing ?code=");
  if (!state) return res.status(400).type("text").send("Missing ?state=");

  pruneStates();
  const exp = pendingStates.get(String(state));
  pendingStates.delete(String(state));
  if (!exp) return res.status(400).type("text").send("Invalid/expired state. Try again.");

  try {
    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      code: String(code),
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    });

    // Only include client_secret if you actually have one
    if (CLIENT_SECRET) body.set("client_secret", CLIENT_SECRET);

    const r = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: body.toString(),
    });

    const text = await r.text();
    if (!r.ok) return res.status(r.status).type("text").send(text);

    const tokens = JSON.parse(text);

    tokenStore.access_token = tokens.access_token ?? null;
    tokenStore.refresh_token = tokens.refresh_token ?? null;
    tokenStore.expires_at = nowSeconds() + Number(tokens.expires_in ?? 0);

    res.type("text").send(
      "Dexcom connected ✅\n\nNow try:\n" +
        `- http://localhost:${PORT}/status\n` +
        `- http://localhost:${PORT}/egvs?start=2026-01-17T00:00:00&end=2026-01-17T06:00:00\n`
    );
  } catch (e) {
    res.status(500).type("text").send(String(e));
  }
});

// Status
app.get("/status", (req, res) => {
  res.json({
    dexcom_base: DEXCOM_BASE,
    has_access_token: !!tokenStore.access_token,
    has_refresh_token: !!tokenStore.refresh_token,
    expires_at: tokenStore.expires_at,
    now: nowSeconds(),
    seconds_left:
      tokenStore.expires_at ? Math.max(0, tokenStore.expires_at - nowSeconds()) : null,
  });
});

// Helper: refresh access token when expired
async function ensureAccessToken() {
  if (
    tokenStore.access_token &&
    tokenStore.expires_at &&
    nowSeconds() < tokenStore.expires_at - 30
  ) {
    return tokenStore.access_token;
  }

  if (!tokenStore.refresh_token) {
    throw new Error("No refresh_token stored. Re-auth required: /auth/dexcom");
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    refresh_token: tokenStore.refresh_token,
    grant_type: "refresh_token",
  });
  if (CLIENT_SECRET) body.set("client_secret", CLIENT_SECRET);

  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: body.toString(),
  });

  const text = await r.text();
  if (!r.ok) throw new Error(text);

  const tokens = JSON.parse(text);

  tokenStore.access_token = tokens.access_token ?? null;
  // Dexcom can rotate refresh tokens — store the new one if provided
  tokenStore.refresh_token = tokens.refresh_token ?? tokenStore.refresh_token;
  tokenStore.expires_at = nowSeconds() + Number(tokens.expires_in ?? 0);

  return tokenStore.access_token;
}

async function fetchDexcomEgvsRange(startDate, endDate) {
  const accessToken = await ensureAccessToken();

  const url =
    `${DEXCOM_BASE}/v3/users/self/egvs?` +
    new URLSearchParams({
      startDate: String(startDate),
      endDate: String(endDate),
    }).toString();

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });

  const text = await r.text();
  if (!r.ok) {
    const err = new Error(text || `Dexcom API request failed (${r.status})`);
    err.statusCode = r.status;
    throw err;
  }

  const data = JSON.parse(text);
  return Array.isArray(data.records) ? data.records : [];
}

// 3) Call EGVs endpoint (GET /v3/users/self/egvs) and return latest reading
app.get("/egvs", async (req, res) => {
  const startDate = req.query.start; // ISO: 2026-01-17T00:00:00
  const endDate = req.query.end;     // ISO: 2026-01-17T06:00:00
  if (!startDate || !endDate) return res.status(400).type("text").send("Use ?start=ISO&end=ISO");

  try {
    const records = await fetchDexcomEgvsRange(startDate, endDate);
    
    // Get the most recent reading (records are typically sorted by time, newest first)
    if (records.length === 0) {
      return res.status(404).json({ error: 'No glucose readings found' });
    }

    res.json(normalizeEgvsRecord(records[0]));
  } catch (e) {
    console.warn("Dexcom /egvs failed, trying fallback API:", String(e));
    try {
      const fallbackData = await fetchFallbackJsonFromPaths(["/api/cgm", "/"]);
      return res.json(normalizeFallbackReading(fallbackData));
    } catch (fallbackErr) {
      return res.status(e.statusCode || 500).json({
        error: "Dexcom fetch failed and fallback API also failed",
        dexcom_error: String(e),
        fallback_error: String(fallbackErr),
      });
    }
  }
});

// 4) Return all EGVs in a range (newest-first from Dexcom, plus normalized fields)
app.get("/egvs/history", async (req, res) => {
  const startDate = req.query.start;
  const endDate = req.query.end;
  if (!startDate || !endDate) return res.status(400).type("text").send("Use ?start=ISO&end=ISO");

  try {
    const records = await fetchDexcomEgvsRange(startDate, endDate);
    res.json({
      start: String(startDate),
      end: String(endDate),
      count: records.length,
      records: records.map(normalizeEgvsRecord),
    });
  } catch (e) {
    console.warn("Dexcom /egvs/history failed, trying fallback API:", String(e));
    try {
      const fallbackHistory = await fetchFallbackJsonFromPaths(["/api/cgm/history", "/"]);
      if (Array.isArray(fallbackHistory?.records)) {
        return res.json({
          ...fallbackHistory,
          records: fallbackHistory.records.map(normalizeFallbackReading),
        });
      }

      // Also support fallback APIs that return a single reading object
      if (fallbackHistory && (typeof fallbackHistory === "object") && "Glucose" in fallbackHistory) {
        return res.json({
          start: String(startDate),
          end: String(endDate),
          count: 1,
          records: [normalizeFallbackReading(fallbackHistory)],
        });
      }

      if (!Array.isArray(fallbackHistory?.records)) {
        return res
          .status(502)
          .json({ error: "Fallback API returned unexpected history format" });
      }
    } catch (fallbackErr) {
      return res.status(e.statusCode || 500).json({
        error: "Dexcom history fetch failed and fallback API also failed",
        dexcom_error: String(e),
        fallback_error: String(fallbackErr),
      });
    }
  }
});

app.listen(PORT, () => console.log(`✅ http://localhost:${PORT}`));
