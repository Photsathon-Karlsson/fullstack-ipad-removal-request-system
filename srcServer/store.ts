// ใช้เก็บข้อมูลแบบ in-memory ชั่วคราว (ค่อยเปลี่ยนเป็น MySQL)
// srcServer/store.ts
// In-memory store (STEP 3): ใช้แทน DB ชั่วคราวก่อนเชื่อม MySQL (STEP 4)
// เก็บ Requests + Logs + counter สำหรับออก Request ID (000001...)

export type RequestStatus = "submitted" | "pending_it" | "it_approved";

export type RequestItem = {
  id: string; // "000001"
  ownerKey: string; // เช่น "parent" หรือ userKey
  status: RequestStatus;

  parentName: string;
  phone: string;

  // ✅ optional fields (ของที่หายอยู่)
  email?: string;
  phone2?: string;

  studentName: string;
  classRoom: string;
  serial: string;

  // ✅ optional fields (ของที่หายอยู่)
  deviceModel?: string;

  reason: string;

  note: string;
  submittedAt: string; // ISO
  updatedAt: string; // ISO
};

export type LogItem = {
  time: string; // ISO
  user: string; // session.userKey หรือ role
  action: string; // "Submitted request", "Saved note", "Status -> pending_it" ...
  requestId: string; // อาจว่างได้ (เช่นเปลี่ยนรหัสผ่าน)
  detail: string; // optional
};

// ----------------------
// Private in-memory state
// ----------------------
let reqCounter = 0;
const requests: RequestItem[] = [];
const logs: LogItem[] = [];

// ----------------------
// Helpers
// ----------------------
function nowISO() {
  return new Date().toISOString();
}

function pad6(n: number) {
  return String(n).padStart(6, "0");
}

function normStr(v: any) {
  return String(v ?? "").trim();
}

// ✅ “-” ใช้แค่แสดงผล ห้ามเก็บเป็นค่าจริง
function cleanOptional(v: any) {
  const s = normStr(v);
  return s === "-" ? "" : s;
}

export function nextRequestId() {
  reqCounter += 1;
  return pad6(reqCounter);
}

export function getSnapshot() {
  return {
    reqCounter,
    requestsCount: requests.length,
    logsCount: logs.length,
    time: nowISO(),
  };
}

// Requests API (store layer)
export function listRequests() {
  // ใหม่สุดก่อน
  return [...requests].sort((a, b) => (a.id < b.id ? 1 : -1));
}

export function getRequestById(id: string) {
  return requests.find((r) => r.id === id) || null;
}

export function createRequest(input: Partial<RequestItem>) {
  const id = (input.id && String(input.id)) || nextRequestId();

  const item: RequestItem = {
    id,
    ownerKey: normStr(input.ownerKey),
    status: (input.status as any) || "submitted",

    parentName: normStr(input.parentName),
    phone: normStr(input.phone),

    // ✅ เก็บด้วย (ถ้าไม่ส่งมาก็เป็น "")
    email: cleanOptional(input.email),
    phone2: cleanOptional(input.phone2),

    studentName: normStr(input.studentName),
    classRoom: normStr(input.classRoom),
    serial: normStr(input.serial),

    // ✅ เก็บด้วย
    deviceModel: cleanOptional(input.deviceModel),

    reason: normStr(input.reason),

    note: normStr(input.note),
    submittedAt: normStr(input.submittedAt) || nowISO(),
    updatedAt: normStr(input.updatedAt) || "",
  };

  // upsert (ถ้า id ซ้ำให้แทนที่)
  const idx = requests.findIndex((r) => r.id === id);
  if (idx >= 0) requests[idx] = item;
  else requests.unshift(item);

  // sync counter ถ้า client ส่ง id ใหญ่กว่า counter
  const asNum = Number(id);
  if (!Number.isNaN(asNum) && asNum > reqCounter) reqCounter = asNum;

  return item;
}

export function patchRequest(id: string, patch: Partial<RequestItem>) {
  const r = getRequestById(id);
  if (!r) return null;

  // อนุญาตแก้ฟิลด์ที่จำเป็น
  if (patch.ownerKey !== undefined) r.ownerKey = normStr(patch.ownerKey);
  if (patch.status !== undefined) r.status = patch.status as RequestStatus;

  if (patch.parentName !== undefined) r.parentName = normStr(patch.parentName);
  if (patch.phone !== undefined) r.phone = normStr(patch.phone);

  // ✅ optional fields (อย่าทับด้วย "-" และอย่าหาย)
  if (patch.email !== undefined) r.email = cleanOptional(patch.email);
  if (patch.phone2 !== undefined) r.phone2 = cleanOptional(patch.phone2);

  if (patch.studentName !== undefined) r.studentName = normStr(patch.studentName);
  if (patch.classRoom !== undefined) r.classRoom = normStr(patch.classRoom);
  if (patch.serial !== undefined) r.serial = normStr(patch.serial);

  // ✅ optional fields
  if (patch.deviceModel !== undefined) r.deviceModel = cleanOptional(patch.deviceModel);

  if (patch.reason !== undefined) r.reason = normStr(patch.reason);

  if (patch.note !== undefined) r.note = normStr(patch.note);

  r.updatedAt = nowISO();
  return r;
}

// Logs API (store layer)
export function listLogs() {
  // ใหม่สุดก่อน
  return [...logs].sort((a, b) => (a.time < b.time ? 1 : -1));
}

export function addLog(input: Partial<LogItem>) {
  const item: LogItem = {
    time: String(input.time || nowISO()),
    user: String(input.user || "system"),
    action: String(input.action || "log"),
    requestId: String(input.requestId || ""),
    detail: String(input.detail || ""),
  };
  logs.unshift(item);
  return item;
}
