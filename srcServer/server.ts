import "dotenv/config";
import express from "express";
import cors from "cors";

import {
  addLog,
  createRequest,
  getRequestById,
  getSnapshot,
  listLogs,
  listRequests,
  patchRequest,
} from "./store.js";

const app = express();
const port = Number(process.env.PORT || 1337);

// Middleware
app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser tools (curl, server-to-server)
      if (!origin) return cb(null, true);

      const ok =
        origin === "http://localhost:5173" ||
        origin.endsWith(".railway.app");

      if (ok) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: false,
  })
);

app.use(express.json());

// Root
app.get("/", (_req, res) => {
  res
    .status(200)
    .send("Backend is running : Use /api/health, /api/requests, /api/logs");
});

// API: Health
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), store: getSnapshot() });
});

// API: Requests
app.get("/api/requests", (_req, res) => {
  res.json(listRequests());
});

app.get("/api/requests/:id", (req, res) => {
  const id = String(req.params.id || "");
  const r = getRequestById(id);
  if (!r) return res.status(404).json({ ok: false, message: "Request not found" });
  res.json(r);
});

app.post("/api/requests", (req, res) => {
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
      message: "Missing required fields: ownerKey, serial, studentName, classRoom, reason",
    });
  }

  const created = createRequest(body);

  addLog({
    user: ownerKey || "unknown",
    action: "Submitted request",
    requestId: created.id,
    detail: "",
  });

  res.status(201).json({ ok: true, request: created });
});

app.patch("/api/requests/:id", (req, res) => {
  const id = String(req.params.id || "");
  const patch = req.body || {};

  const updated = patchRequest(id, patch);
  if (!updated) return res.status(404).json({ ok: false, message: "Request not found" });

  const user = String(patch.user || patch.userKey || patch.ownerKey || "staff");
  addLog({
    user,
    action: "Updated request",
    requestId: id,
    detail: "",
  });

  res.json({ ok: true, request: updated });
});

// API: Logs
app.get("/api/logs", (_req, res) => {
  res.json(listLogs());
});

app.post("/api/logs", (req, res) => {
  const body = req.body || {};
  const created = addLog(body);
  res.status(201).json({ ok: true, log: created });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
