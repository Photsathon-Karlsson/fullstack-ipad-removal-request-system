// PRODUCTION: ให้ใช้ same-origin (base = "")
// DEVELOPMENT: ถ้าไม่ตั้ง env ให้ยิง localhost:1337
// ถ้าตั้ง VITE_API_BASE เป็น "" จะ "ไม่" โดน fallback เพราะใช้ ?? ไม่ใช้ ||
const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.PROD ? "" : "http://localhost:1337");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  // พยายามอ่าน json (เผื่อ backend ส่ง error เป็น json)
  const text = await res.text();

  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // ถ้า backend ส่ง HTML/ข้อความเปล่า จะไม่ให้โค้ดพังด้วย JSON.parse
      data = null;
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) ||
      (text && text.slice(0, 200)) ||
      `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export type RequestStatus = "submitted" | "pending_it" | "it_approved";

export type RequestItem = {
  id: string;
  ownerKey: string;
  status: RequestStatus;

  parentName: string;
  phone: string;
  studentName: string;
  classRoom: string;
  serial: string;
  reason: string;

  // optional fields (กัน TS error + รองรับ backend ตอนเพิ่ม field)
  email?: string;
  phone2?: string;
  deviceModel?: string;

  note: string;
  submittedAt: string;
  updatedAt: string;
};

export function apiListRequests() {
  return request<RequestItem[]>("/api/requests");
}

export function apiGetRequest(id: string) {
  return request<RequestItem>(`/api/requests/${id}`);
}

// create ใช้ Partial ได้เหมือนเดิม
export function apiCreateRequest(payload: Partial<RequestItem>) {
  return request<{ ok: true; request: RequestItem }>("/api/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// patch: อนุญาตส่ง partial + user
export function apiPatchRequest(id: string, payload: Partial<RequestItem> & { user?: string }) {
  return request<{ ok: true; request: RequestItem }>(`/api/requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
