// + MySQL optional + Serve Frontend (Production) + DEV CORS safe (Express v5-safe)

import "dotenv/config";
import express from "express";
import cors, { CorsOptions } from "cors";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// In-memory store — fallback เวลาไม่มี DATABASE_URL
import {
  addLog as addLogStore,
  createRequest as createRequestStore,
  getRequestById as getRequestByIdStore,
  getSnapshot as getSnapshotStore,
  listLogs as listLogsStore,
  listRequests as listRequestsStore,
  patchRequest as patchRequestStore,
} from "./store.js";

// Basic setup
const app = express();
const port = Number(process.env.PORT || 1337);

// DEV / PROD
// - DEV: Vite (5173/5174) → ต้องเปิด CORS
// - PROD: Serve frontend จาก backend (same-origin) → ไม่ต้องใช้ CORS
const isProd = process.env.NODE_ENV === "production";
const isDev = !isProd;

app.use(express.json());

// Paths (กัน distPath หลุด)
// __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// project root = โฟลเดอร์เหนือ srcServer (ตอน build จะอยู่ distServer ก็ยัง .. = root)
const projectRoot = path.resolve(__dirname, "..");

// dist frontend = <root>/dist (ไม่พึ่ง process.cwd())
const distPath = path.resolve(projectRoot, "dist");
const indexHtmlPath = path.join(distPath, "index.html");

console.log("projectRoot =", projectRoot);
console.log("distPath =", distPath);

// CORS (DEV ONLY)
if (isDev) {
  const allowList = new Set([
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:1337",
  ]);

  const corsOptions: CorsOptions = {
    origin(origin, cb) {
      // origin เป็น undefined ได้ (เช่น curl)
      if (!origin) return cb(null, true);
      if (allowList.has(origin)) return cb(null, true);

      // ห้าม throw ไม่งั้น server log จะ spam / crash ได้
      console.warn("[CORS] blocked origin:", origin);
      return cb(null, false);
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: false,
  };

  app.use(cors(corsOptions));
}

// DB (MySQL) optional
const DATABASE_URL = (process.env.DATABASE_URL || "").trim();
const useDb = Boolean(DATABASE_URL);
const db = useDb ? mysql.createPool(DATABASE_URL) : null;

type DbMode = "mysql" | "memory";

async function initDbIfNeeded() {
  if (!db) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS requests (
      id VARCHAR(64) PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      data JSON NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      data JSON NOT NULL
    )
  `);
}

// Helpers: DB CRUD
async function dbListRequests() {
  const [rows] = await db!.query<any[]>(
    "SELECT data FROM requests ORDER BY created_at DESC"
  );
  return rows.map((r) => r.data);
}

async function dbGetRequestById(id: string) {
  const [rows] = await db!.query<any[]>(
    "SELECT data FROM requests WHERE id = ? LIMIT 1",
    [id]
  );
  if (!rows.length) return null;
  return rows[0].data;
}

async function dbCreateRequest(body: any) {
  const created = createRequestStore(body);
  await db!.execute("INSERT INTO requests (id, data) VALUES (?, ?)", [
    created.id,
    JSON.stringify(created),
  ]);
  return created;
}

async function dbPatchRequest(id: string, patch: any) {
  const current = await dbGetRequestById(id);
  if (!current) return null;

  const updated = { ...current, ...patch };

  await db!.execute("UPDATE requests SET data = ? WHERE id = ?", [
    JSON.stringify(updated),
    id,
  ]);

  return updated;
}

async function dbAddLog(body: any) {
  const created = addLogStore(body);
  await db!.execute("INSERT INTO logs (data) VALUES (?)", [
    JSON.stringify(created),
  ]);
  return created;
}

async function dbListLogs() {
  const [rows] = await db!.query<any[]>(
    "SELECT data FROM logs ORDER BY created_at DESC"
  );
  return rows.map((r) => r.data);
}

async function dbSnapshot() {
  const [[rCount]] = await db!.query<any[]>(
    "SELECT COUNT(*) AS n FROM requests"
  );
  const [[lCount]] = await db!.query<any[]>("SELECT COUNT(*) AS n FROM logs");
  return {
    reqCounter: null,
    requestsCount: Number(rCount?.n || 0),
    logsCount: Number(lCount?.n || 0),
    mode: "mysql" as DbMode,
    time: new Date().toISOString(),
  };
}

// API

// Health
app.get("/api/health", async (_req, res) => {
  try {
    if (useDb) {
      const snap = await dbSnapshot();
      return res.json({ ok: true, time: new Date().toISOString(), store: snap });
    }
    return res.json({
      ok: true,
      time: new Date().toISOString(),
      store: { ...getSnapshotStore(), mode: "memory" as DbMode },
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: "Health check failed",
      error: String(err?.message || err),
    });
  }
});

// Requests
app.get("/api/requests", async (_req, res) => {
  try {
    if (useDb) return res.json(await dbListRequests());
    return res.json(listRequestsStore());
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: "Failed to list requests",
      error: String(err?.message || err),
    });
  }
});

app.get("/api/requests/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const r = useDb ? await dbGetRequestById(id) : getRequestByIdStore(id);
    if (!r) return res.status(404).json({ ok: false, message: "Request not found" });
    return res.json(r);
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: "Failed to get request",
      error: String(err?.message || err),
    });
  }
});

app.post("/api/requests", async (req, res) => {
  try {
    const body = req.body || {};

    const ownerKey = String(body.ownerKey || "").trim();
    const serial = String(body.serial || "").trim();
    const studentName = String(body.studentName || "").trim();
    const classRoom = String(body.classRoom || "").trim();
    const reason = String(body.reason || "").trim();

    if (!ownerKey || !serial || !studentName || !classRoom || !reason) {
      return res.status(400).json({
        ok: false,
        message:
          "Missing required fields: ownerKey, serial, studentName, classRoom, reason",
      });
    }

    const created = useDb ? await dbCreateRequest(body) : createRequestStore(body);

    const logPayload = {
      user: ownerKey || "unknown",
      action: "Submitted request",
      requestId: created.id,
      detail: "",
    };

    if (useDb) await dbAddLog(logPayload);
    else addLogStore(logPayload);

    return res.status(201).json({ ok: true, request: created });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: "Failed to create request",
      error: String(err?.message || err),
    });
  }
});

app.patch("/api/requests/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const patch = req.body || {};

    const updated = useDb ? await dbPatchRequest(id, patch) : patchRequestStore(id, patch);
    if (!updated) return res.status(404).json({ ok: false, message: "Request not found" });

    const user = String(patch.user || patch.userKey || patch.ownerKey || "staff");
    const logPayload = { user, action: "Updated request", requestId: id, detail: "" };

    if (useDb) await dbAddLog(logPayload);
    else addLogStore(logPayload);

    return res.json({ ok: true, request: updated });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: "Failed to patch request",
      error: String(err?.message || err),
    });
  }
});

// Logs
app.get("/api/logs", async (_req, res) => {
  try {
    if (useDb) return res.json(await dbListLogs());
    return res.json(listLogsStore());
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: "Failed to list logs",
      error: String(err?.message || err),
    });
  }
});

app.post("/api/logs", async (req, res) => {
  try {
    const body = req.body || {};
    const created = useDb ? await dbAddLog(body) : addLogStore(body);
    return res.status(201).json({ ok: true, log: created });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: "Failed to create log",
      error: String(err?.message || err),
    });
  }
});

// Serve Frontend (Production build)
app.use(express.static(distPath));

// Express v5-safe SPA fallback (ห้ามใช้ "*")
app.get(/^(?!\/api).*/, (_req, res) => {
  if (!fs.existsSync(indexHtmlPath)) {
    return res.status(404).send(
      [
        "Frontend build not found.",
        `Expected: ${indexHtmlPath}`,
        "",
        "Run:",
        "  npm run predeploy",
        "",
        "Then start (production):",
        "  NODE_ENV=production npm run start",
      ].join("\n")
    );
  }
  return res.sendFile(indexHtmlPath);
});

// Start
async function start() {
  if (useDb) {
    await initDbIfNeeded();
    console.log("DB ready (MySQL)");
  } else {
    console.log("DB disabled (memory store)");
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`NODE_ENV=${process.env.NODE_ENV || "(not set)"} isDev=${isDev}`);
  });
}

start().catch((err) => {
  console.error("Server failed to start", err);
  process.exit(1);
});
