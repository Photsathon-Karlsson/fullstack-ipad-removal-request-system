export type SessionUser = { username: string };

export type ITAccount = {
  username: string;
  password: string;
  createdAt: string;
};

const SESSION_KEY = "irrs_session_user_v1";
const ACCOUNTS_KEY = "irrs_it_accounts_v1";

function seedIfEmpty() {
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (raw) return;

  const seed: ITAccount[] = [
    { username: "it", password: "123", createdAt: new Date().toISOString() },
  ];
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(seed));
}

export function listAccounts(): ITAccount[] {
  seedIfEmpty();
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ITAccount[];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: ITAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function norm(s: string) {
  return (s || "").trim().toLowerCase();
}

export function addAccount(usernameRaw: string, passwordRaw: string) {
  seedIfEmpty();
  const username = norm(usernameRaw);
  const password = (passwordRaw || "").trim();

  if (!username || !password) throw new Error("กรอก username และ password ให้ครบ");
  if (password.length < 4) throw new Error("Password ต้องอย่างน้อย 4 ตัวอักษร");

  const accounts = listAccounts();
  if (accounts.some((a) => a.username === username)) {
    throw new Error("มี username นี้แล้ว");
  }

  accounts.unshift({
    username,
    password,
    createdAt: new Date().toISOString(),
  });

  saveAccounts(accounts);
}

/**
 * ✅ Edit account แบบง่าย (กรอกเอง ไม่ใช้ dropdown)
 * - ต้องมี oldUsername + oldPassword เพื่อยืนยันตัวตนของบัญชีที่จะถูกแก้
 * - newUsername / newPassword เป็น optional (ไม่กรอก = ไม่เปลี่ยน)
 */
export function editAccount(params: {
  oldUsername: string;
  oldPassword: string;
  newUsername?: string;
  newPassword?: string;
}) {
  seedIfEmpty();
  const oldUsername = norm(params.oldUsername);
  const oldPassword = (params.oldPassword || "").trim();
  const newUsername = norm(params.newUsername || "");
  const newPassword = (params.newPassword || "").trim();

  if (!oldUsername || !oldPassword) {
    throw new Error("กรอก old username และ old password ให้ครบ");
  }

  const accounts = listAccounts();
  const idx = accounts.findIndex((a) => a.username === oldUsername);
  if (idx === -1) throw new Error("ไม่พบบัญชี old username นี้");

  // verify old password
  if (accounts[idx].password !== oldPassword) {
    throw new Error("old password ไม่ถูกต้อง");
  }

  // nothing to change?
  const willChangeUsername = !!newUsername && newUsername !== oldUsername;
  const willChangePassword = !!newPassword;

  if (!willChangeUsername && !willChangePassword) {
    throw new Error("ยังไม่ได้กรอกข้อมูลที่จะเปลี่ยน (new username หรือ new password)");
  }

  // validate new password
  if (willChangePassword && newPassword.length < 4) {
    throw new Error("new password ต้องอย่างน้อย 4 ตัวอักษร");
  }

  // validate new username unique
  if (willChangeUsername) {
    if (accounts.some((a, i) => i !== idx && a.username === newUsername)) {
      throw new Error("new username นี้ถูกใช้แล้ว");
    }
  }

  // protect primary account rename? (ถ้าต้องการให้เปลี่ยนได้ ลบ if นี้ออก)
  if (oldUsername === "it" && willChangeUsername) {
    throw new Error("ไม่อนุญาตให้เปลี่ยนชื่อบัญชี it หลัก");
  }

  const updated: ITAccount = {
    ...accounts[idx],
    username: willChangeUsername ? newUsername : accounts[idx].username,
    password: willChangePassword ? newPassword : accounts[idx].password,
  };

  accounts[idx] = updated;
  saveAccounts(accounts);

  // ถ้า user ที่ login อยู่ คือบัญชีที่ถูก rename -> อัปเดต session ให้ตามชื่อใหม่
  const session = getSessionUser();
  if (session && norm(session.username) === oldUsername && willChangeUsername) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: newUsername }));
  }
}

export function deleteAccount(usernameRaw: string) {
  seedIfEmpty();
  const username = norm(usernameRaw);

  if (!username) throw new Error("กรอก username ให้ครบ");
  if (username === "it") throw new Error("ไม่อนุญาตให้ลบบัญชี it หลัก");

  const accounts = listAccounts();
  const next = accounts.filter((a) => a.username !== username);
  if (next.length === accounts.length) throw new Error("ไม่พบบัญชีนี้");

  saveAccounts(next);

  // ถ้าลบบัญชีที่กำลัง login อยู่ -> logout
  const session = getSessionUser();
  if (session && norm(session.username) === username) {
    logout();
  }
}

export function login(usernameRaw: string, passwordRaw: string): SessionUser {
  seedIfEmpty();
  const username = norm(usernameRaw);
  const password = (passwordRaw || "").trim();

  if (!username || !password) throw new Error("กรอก username และ password ให้ครบ");

  const accounts = listAccounts();
  const found = accounts.find((a) => a.username === username);
  if (!found) throw new Error("บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน (IT only)");
  if (found.password !== password) throw new Error("รหัสผ่านไม่ถูกต้อง");

  const user: SessionUser = { username };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSessionUser(): SessionUser | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isITUser(user: SessionUser | null): boolean {
  if (!user?.username) return false;
  const accounts = listAccounts();
  return accounts.some((a) => a.username === norm(user.username));
}
