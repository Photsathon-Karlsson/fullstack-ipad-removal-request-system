// + MySQL

import "dotenv/config";
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

// In-memory store — ใช้เป็น fallback เวลาไม่มี DATABASE_URL
import {
  addLog as addLogStore,
  createRequest as createRequestStore,
  getRequestById as getRequestByIdStore,
  getSnapshot as getSnapshotStore,
  listLogs as listLogsStore,
  listRequests as listRequestsStore,
  patchRequest as patchRequestStore,
} from "./store.js";

const app = express();
const port = Number(process.env.PORT || 1337);

// CORS
const allowedLocalOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
]);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser tools (curl, server-to-server)
      if (!origin) return cb(null, true);

      const ok =
        allowedLocalOrigins.has(origin) ||
        origin.endsWith(".railway.app");

      if (ok) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: false,
  })
);

app.use(express.json());

// DB (MySQL) optional
const DATABASE_URL = process.env.DATABASE_URL?.trim() || "";
const useDb = Boolean(DATABASE_URL);

// pool จะถูกสร้างเฉพาะเมื่อมี DATABASE_URL
const db = useDb ? mysql.createPool(DATABASE_URL) : null;

type DbMode = "mysql" | "memory";

// สร้างตาราง (ใช้ JSON เก็บ payload เพื่อไม่ต้องแตกคอลัมน์เยอะ)
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
  // ให้ store.js เป็นคน generate id / status / createdAt เหมือนเดิม (กัน logic พัง)
  const created = createRequestStore(body);

  await db!.execute(
    "INSERT INTO requests (id, data) VALUES (?, ?)",
    [created.id, JSON.stringify(created)]
  );

  return created;
}

async function dbPatchRequest(id: string, patch: any) {
  const current = await dbGetRequestById(id);
  if (!current) return null;

  // ใช้ store.js ทำการ merge + validation/status rules 
  // โดยให้ store ให้ทำงานกับ object ปัจจุบัน
  // เอา patch ไปใช้กับฟังก์ชันเดิมโดยเรียก patchRequestStore
  // แต่ patchRequestStore ไปอัปเดต memory store ภายใน 
  const updated = { ...current, ...patch };

  await db!.execute(
    "UPDATE requests SET data = ? WHERE id = ?",
    [JSON.stringify(updated), id]
  );

  return updated;
}

async function dbAddLog(body: any) {
  // ให้ addLogStore สร้าง id/createdAt/shape เหมือนเดิม
  const created = addLogStore(body);

  await db!.execute(
    "INSERT INTO logs (data) VALUES (?)",
    [JSON.stringify(created)]
  );

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
  const [[lCount]] = await db!.query<any[]>(
    "SELECT COUNT(*) AS n FROM logs"
  );
  return {
    reqCounter: null,
    requestsCount: Number(rCount?.n || 0),
    logsCount: Number(lCount?.n || 0),
    mode: "mysql" as DbMode,
    time: new Date().toISOString(),
  };
}

// Root
app.get("/", (_req, res) => {
  res
    .status(200)
    .send("Backend is running : Use /api/health, /api/requests, /api/logs");
});

// API: Health
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

// API: Requests
app.get("/api/requests", async (_req, res) => {
  try {
    if (useDb) return res.json(await dbListRequests());
    return res.json(listRequestsStore());
  } catch (err: any) {
    return res.status(500).json({ ok: false, message: "Failed to list requests", error: String(err?.message || err) });
  }
});

app.get("/api/requests/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const r = useDb ? await dbGetRequestById(id) : getRequestByIdStore(id);
    if (!r) return res.status(404).json({ ok: false, message: "Request not found" });
    return res.json(r);
  } catch (err: any) {
    return res.status(500).json({ ok: false, message: "Failed to get request", error: String(err?.message || err) });
  }
});

app.post("/api/requests", async (req, res) => {
  try {
    const body = req.body || {};

    // validate
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
    return res.status(500).json({ ok: false, message: "Failed to create request", error: String(err?.message || err) });
  }
});

app.patch("/api/requests/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const patch = req.body || {};

    const updated = useDb
      ? await dbPatchRequest(id, patch)
      : patchRequestStore(id, patch);

    if (!updated) return res.status(404).json({ ok: false, message: "Request not found" });

    const user = String(patch.user || patch.userKey || patch.ownerKey || "staff");
    const logPayload = {
      user,
      action: "Updated request",
      requestId: id,
      detail: "",
    };

    if (useDb) await dbAddLog(logPayload);
    else addLogStore(logPayload);

    return res.json({ ok: true, request: updated });
  } catch (err: any) {
    return res.status(500).json({ ok: false, message: "Failed to patch request", error: String(err?.message || err) });
  }
});

// API: Logs
app.get("/api/logs", async (_req, res) => {
  try {
    if (useDb) return res.json(await dbListLogs());
    return res.json(listLogsStore());
  } catch (err: any) {
    return res.status(500).json({ ok: false, message: "Failed to list logs", error: String(err?.message || err) });
  }
});

app.post("/api/logs", async (req, res) => {
  try {
    const body = req.body || {};
    const created = useDb ? await dbAddLog(body) : addLogStore(body);
    return res.status(201).json({ ok: true, log: created });
  } catch (err: any) {
    return res.status(500).json({ ok: false, message: "Failed to create log", error: String(err?.message || err) });
  }
});

// Start server (init DB first if needed)
async function start() {
  if (useDb) {
    await initDbIfNeeded();
    console.log("DB ready (MySQL)");
  } else {
    console.log("DB disabled (memory store)");
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start().catch((err) => {
  console.error("Server failed to start", err);
  process.exit(1);
});
