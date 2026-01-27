export type RequestStatus = "Submitted" | "IT Approved" | "Rejected";

export type RemovalRequest = {
  id: string;

  parentName: string;
  phone1: string;
  phone2: string;
  email: string;

  studentName: string;
  classRoom: string;

  deviceSerial: string;
  deviceModel: string;

  reason: string;

  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
};

const REQ_KEY = "irrs_requests_v1";

function readAll(): RemovalRequest[] {
  const raw = localStorage.getItem(REQ_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RemovalRequest[];
  } catch {
    return [];
  }
}

function writeAll(list: RemovalRequest[]) {
  localStorage.setItem(REQ_KEY, JSON.stringify(list));
}

function norm(s: string) {
  return (s || "").trim().toLowerCase();
}

export function listRequests(): RemovalRequest[] {
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getRequestById(id: string): RemovalRequest | null {
  return readAll().find((r) => r.id === id) || null;
}

export function createRequest(
  input: Omit<RemovalRequest, "id" | "status" | "createdAt" | "updatedAt">
) {
  const now = new Date().toISOString();
  const id = `REQ-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;

  const list = readAll();

  // ✅ prevent duplicate active request for same serial (active = Submitted)
  const serial = norm(input.deviceSerial);
  const hasActive = list.some(
    (r) => norm(r.deviceSerial) === serial && r.status === "Submitted"
  );
  if (hasActive) {
    throw new Error("มีคำขอที่กำลังดำเนินการ (Submitted) สำหรับ Serial นี้อยู่แล้ว");
  }

  const req: RemovalRequest = {
    id,
    ...input,
    status: "Submitted",
    createdAt: now,
    updatedAt: now,
  };

  list.unshift(req);
  writeAll(list);
  return req;
}

export function updateRequestStatus(id: string, nextStatus: RequestStatus) {
  const list = readAll();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("ไม่พบ request นี้");

  list[idx] = {
    ...list[idx],
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };

  writeAll(list);
  return list[idx];
}

/**
 * ✅ อัปเดตข้อมูล request (ใช้กับปุ่ม Edit)
 * - อนุญาตแก้เฉพาะตอน status = Submitted (กันข้อมูลเปลี่ยนหลังอนุมัติ)
 * - ถ้าแก้ deviceSerial จะเช็ค serial ซ้ำกับ request อื่นที่ยัง Submitted
 */
export function updateRequest(
  id: string,
  patch: Partial<
    Pick<
      RemovalRequest,
      | "parentName"
      | "phone1"
      | "phone2"
      | "email"
      | "studentName"
      | "classRoom"
      | "deviceSerial"
      | "deviceModel"
      | "reason"
    >
  >
) {
  const list = readAll();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("ไม่พบ request นี้");

  const current = list[idx];

  if (current.status !== "Submitted") {
    throw new Error("แก้ไขได้เฉพาะรายการที่ยังเป็น Submitted");
  }

  const nextSerial = patch.deviceSerial ? norm(patch.deviceSerial) : norm(current.deviceSerial);

  // ✅ ถ้า serial เปลี่ยน/หรือเช็คเสมอ → ห้ามซ้ำกับ Submitted อื่น
  const hasActive = list.some(
    (r) => r.id !== id && norm(r.deviceSerial) === nextSerial && r.status === "Submitted"
  );
  if (hasActive) {
    throw new Error("Serial นี้มีคำขอ Submitted อยู่แล้ว (ห้ามซ้ำ)");
  }

  const updated: RemovalRequest = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  list[idx] = updated;
  writeAll(list);
  return updated;
}
