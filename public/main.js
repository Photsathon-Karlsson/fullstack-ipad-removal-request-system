// accounts ที่ใช้ในการทดสอบ/เข้าระบบ : (Username)it/(password)123)
// ไฟล์หลักควบคุม “ตรรกะทั้งระบบ” ของเว็บ (Login/Pages/Requests/Logs) โดยใช้ localStorage เป็นฐานข้อมูลจำลอง
// เพิ่มระบบ: กันหน้าเว็บว่าง/กัน element หาย, ตรวจว่ามี <section> สำคัญจริง, ปรับ session ให้ถูกหน้า, ค้นหาใน dashboard รวมสถานะด้วย

// document.addEventListener สั่งให้โค้ดด้านในเริ่มทำงาน “หลังจาก” HTML ของหน้าเว็บโหลดและสร้างเป็น DOM ครบแล้ว
document.addEventListener("DOMContentLoaded", () => {

  // เพิ่ม fetch ทดสอบเรียก API /api/...
  fetch('/api/health')
  .then(r => r.json())
  .then(data => console.log('API HEALTH:', data))
  .catch(err => console.error('API HEALTH ERROR:', err))

  fetch('/api/requests')
  .then(r => r.json())
  .then(data => console.log('API REQUESTS:', data))
  .catch(err => console.error('API REQUESTS ERROR:', err))

  // Storage keys
  // ชื่อคีย์ที่ใช้เก็บข้อมูลใน localStorage 
  const LS_USERS = "irrs_users";         // เก็บบัญชีผู้ใช้
  const LS_REQUESTS = "irrs_requests";   // เก็บรายการคำขอทั้งหมด
  const LS_ACTIVITY = "irrs_activity";   // เก็บประวัติการทำรายการ (log)
  const LS_SESSION = "irrs_session";     // เก็บ session ผู้ที่ล็อกอินอยู่
  const LS_REQ_COUNTER = "irrs_req_counter"; // ตัวนับเพื่อสร้าง Request ID แบบ 000001, 000002 ...

  // Pages (MUST match index.html IDs)
  // ดึง <section id="..."> แต่ละหน้าไว้ เพื่อสลับแสดง/ซ่อนด้วย class "hidden"
  const pages = {
    login: document.getElementById("pageLogin"),                 // หน้า Login
    register: document.getElementById("pageRegister"),           // หน้า Register (IT/Registrar)
    parentForm: document.getElementById("pageParentForm"),       // หน้า Parent Form
    parentTrack: document.getElementById("pageParentTrack"),     // หน้า Parent Track
    staffDashboard: document.getElementById("pageStaffDashboard"), // หน้า Staff Dashboard
    staffView: document.getElementById("pageStaffView"),         // หน้า Staff View รายละเอียดคำขอ
    staffEdit: document.getElementById("pageStaffEdit"),         // หน้า Staff Edit แก้ไขฟอร์ม
    approved: document.getElementById("pageApproved"),           // หน้า Final Approved (หลัง IT approve)
    activityLog: document.getElementById("pageActivityLog"),     // หน้า Activity Log
    changePassword: document.getElementById("pageChangePassword")// หน้า Change Password (IT)
  };

  // Top bar
  // element ในแถบด้านบน (role badge + ปุ่ม logout + ปุ่ม back to login)
  const roleBadge = document.getElementById("uiRoleBadge");
  const btnLogout = document.getElementById("btnLogout");
  const btnGoLogin = document.getElementById("btnGoLogin");

  // Session
  // ตัวแปร session เก็บสถานะคนใช้งานปัจจุบัน (role, userKey, หน้า ล่าสุด)
  let session = { role: null, userKey: null, lastPage: "login" };

  // Parent selection state (track page), เก็บว่า Parent เลือก request id ไหนอยู่ในหน้า Track
  let parentSelectedRequestId = null;

  // ถ้าตรวจเจอส่งซ้ำ จะเก็บ id ของคำขอเดิมไว้ เพื่อพาไปหน้า Track แล้วเลือกอัตโนมัติ
  let parentDuplicateTargetId = null;

  // Utils
  // ฟังก์ชันช่วยงานเล็กๆ เพื่อให้โค้ดหลักอ่านง่ายขึ้น

  // ช็อตคัตเรียก element ด้วย id
  function $(id) { return document.getElementById(id); } 

  // ผูก click event ให้ element ถ้ามีอยู่จริง (กัน error)
  function onClick(id, handler) {
    const el = $(id);
    if (el) el.addEventListener("click", handler);
  }

  // ซ่อนทุกหน้า (ทุก section) ก่อน แล้วค่อย show เฉพาะหน้าที่ต้องการ
  function hideAllPages() {
    Object.values(pages).forEach(p => p && p.classList.add("hidden"));
  }

  // เช็คว่า role เป็น staff ไหม (registrar/it)
  function isStaff(role) { return role === "registrar" || role === "it"; } 

  // เช็คค่าว่าง/เป็นช่องว่าง (ใช้ validate input)
  function isEmpty(...values) { return values.some(v => !v || !String(v).trim()); } 

  // เวลาปัจจุบันเป็นข้อความ (เพื่อเก็บ log/เวลา submitted)
  function nowText() { return new Date().toLocaleString(); } 

  // ตั้งค่า textContent ให้ element แบบกันพัง
  function setText(id, text) { const el = $(id); if (el) el.textContent = text; } 

  // ป้องกัน XSS เวลาเอาข้อมูลผู้ใช้ไปใส่ใน innerHTML (เช่น ตาราง dashboard/log)
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normSerial(s) {
    // ทำ serial ให้เป็นรูปแบบเดียวกันเพื่อเทียบซ้ำได้แม่น:
    // trim + uppercase + เอาช่องว่างออก
    return String(s || "").trim().toUpperCase().replaceAll(" ", "");
  }

  // Visible error (no silent blank)
  // ถ้ามีปัญหาร้ายแรง (เช่น page section หาย) ให้แสดง error ที่หน้า login แทนที่จะขาว
  function showFatalError(message) {
    console.error(message);
    hideAllPages();
    pages.login?.classList.remove("hidden");
    const err = $("loginError");
    if (err) {
      err.textContent = message;
      err.classList.remove("hidden");
    } else {
      alert(message);
    }
  }

  // Validate required sections exist 
  // ตรวจว่ามี section สำคัญใน index.html จริง ไม่งั้นระบบจะสลับหน้าไม่ได้
  function validatePageIds() {
    const required = [
      ["login", "pageLogin"],
      ["parentForm", "pageParentForm"],
      ["staffDashboard", "pageStaffDashboard"]
    ];
    const missing = required.filter(([key]) => !pages[key]).map(([, id]) => id);
    if (missing.length) {
      showFatalError(
        `Page section not found in HTML: ${missing.join(", ")}\n` +
        `Check index.html has <section id="..."> with those IDs.`
      );
      return false;
    }
    return true;
  }

  // localStorage JSON 
  // อ่าน/เขียน JSON ใน localStorage แบบกันพัง (ถ้า parse ไม่ได้ให้ fallback)
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Session persistence 
  // เก็บ/โหลด session ลง localStorage เพื่อ “รีเฟรชแล้วไม่หลุด”
  function saveSession() { writeJSON(LS_SESSION, session); }
  function loadSession() {
    const s = readJSON(LS_SESSION, null);
    if (s && typeof s === "object") session = { ...session, ...s };
  }

  function sanitizeLastPage() {
    // ปรับค่า lastPage ให้ “ถูกต้อง” ตาม role และกันหน้าที่ไม่อนุญาต
    const valid = Object.keys(pages);
    if (!valid.includes(session.lastPage)) session.lastPage = "login";

    if (session.role === "parent") {
      // parent ห้ามไปหน้า staff/register/log/pw
      if (session.lastPage === "login") session.lastPage = "parentForm";
      if (["staffDashboard","staffView","staffEdit","approved","activityLog","changePassword","register"].includes(session.lastPage)) {
        session.lastPage = "parentForm";
      }
    }

    if (isStaff(session.role)) {
      // staff ห้ามไปหน้า parent
      if (session.lastPage === "login") session.lastPage = "staffDashboard";
      if (["parentForm","parentTrack"].includes(session.lastPage)) {
        session.lastPage = "staffDashboard";
      }
    }

    if (!session.role) session.lastPage = "login";
  }

  // Access control 
  // กำหนดสิทธิ์การเข้าหน้าต่างๆ ตาม role
  function canAccessPage(pageName) {
    if (pageName === "login") return true;
    if (!session.role) return false;

    if (pageName === "register") return session.role === "it";
    if (pageName === "activityLog") return session.role === "it";
    if (pageName === "changePassword") return session.role === "it";

    if (pageName === "parentForm" || pageName === "parentTrack") return session.role === "parent";
    if (["staffDashboard","staffView","staffEdit","approved"].includes(pageName)) return isStaff(session.role);

    return true;
  }

  function showPage(name) {
    // แสดงหน้าแบบปลอดภัย: กัน page ไม่เจอ, กัน role เข้าไม่ได้, มี fallback ไปหน้า home ตาม role
    if (!pages[name]) {
      const fallback = session.role === "parent" ? "parentForm" : (isStaff(session.role) ? "staffDashboard" : "login");
      name = fallback;
      if (!pages[name]) {
        showFatalError(`Cannot render page "${name}" because section is missing in HTML.`);
        return;
      }
    }

    // ถ้าเข้าไม่ได้: ถ้าไม่ login -> กลับ login, ถ้า login แล้ว -> ส่งกลับหน้า home
    if (!canAccessPage(name)) {
      if (!session.role) {
        resetTopBar();
        clearLoginInputs();
        hideAllPages();
        pages.login?.classList.remove("hidden");
        session.lastPage = "login";
        saveSession();
        return;
      }
      const home = session.role === "parent" ? "parentForm" : "staffDashboard";
      hideAllPages();
      pages[home]?.classList.remove("hidden");
      session.lastPage = home;
      saveSession();
      return;
    }

    hideAllPages();
    pages[name]?.classList.remove("hidden");
    session.lastPage = name;
    saveSession();
  }

  // Users 
  // จัดการบัญชีผู้ใช้ใน localStorage
  function getUsers() {
    const data = readJSON(LS_USERS, []);
    return Array.isArray(data) ? data : [];
  }
  function saveUsers(users) { writeJSON(LS_USERS, users); }

  function findUserByEmail(email) {
    // หา user จาก email/username (เทียบแบบ lowercase)
    const key = String(email || "").trim().toLowerCase();
    const users = getUsers();
    return users.find(u => String(u.email || "").toLowerCase() === key) || null;
  }

  function ensureDefaultUsers() {
    // สร้างบัญชี default ถ้ายังไม่มี และตั้ง counter เริ่มต้น
    let users = getUsers();

    // ตรวจว่ามี user นี้ใน users แล้วหรือยัง (เทียบ email แบบตัวพิมพ์เล็ก)
    function ensureUser(email, role, password) {
      const key = email.toLowerCase();
      const idx = users.findIndex(u => String(u.email || "").toLowerCase() === key);
      // ถ้ายังไม่มี -> เพิ่มบัญชีใหม่ (email, role, password)
      if (idx < 0) {
        users.push({ email: key, role, password, createdAt: nowText() });
        return; 
      }
      // ไม่ทับ password เดิมที่ผู้ใช้เปลี่ยนเอง (เติมเฉพาะกรณีว่าง)
      if (users[idx].role !== role) users[idx].role = role;
      if (!users[idx].password) users[idx].password = password;
      if (!users[idx].email) users[idx].email = key;
      else users[idx].email = String(users[idx].email).toLowerCase(); // ทำให้เป็น lowercase เสมอ
    }

    // role, username, password
    ensureUser("parent", "parent", "123");
    ensureUser("registrar", "registrar", "123");
    ensureUser("it", "it", "123");

    if (localStorage.getItem(LS_REQ_COUNTER) === null) localStorage.setItem(LS_REQ_COUNTER, "0");
    saveUsers(users);
  }

  // Requests 
  // จัดการข้อมูลคำขอทั้งหมด
  function getRequests() {
    const list = readJSON(LS_REQUESTS, []);
    return Array.isArray(list) ? list : [];
  }
  function saveRequests(requests) { writeJSON(LS_REQUESTS, requests); }

  // หา request ตาม id
  function findRequestById(id) {
    const list = getRequests();
    return list.find(r => r.id === id) || null;
  }

  // update ถ้ามี id เดิม / insert ถ้าใหม่ (insert หน้า list เพื่อให้ใหม่สุดอยู่บน)
  function upsertRequest(updated) {
    const list = getRequests();
    const idx = list.findIndex(r => r.id === updated.id);
    if (idx >= 0) list[idx] = updated;
    else list.unshift(updated);
    saveRequests(list);
  }

  // ดึงคำขอเฉพาะของเจ้าของ (parent คนนี้) และเรียงใหม่สุดก่อน
  function getRequestsByOwner(ownerKey) {
    const list = getRequests();
    return list
      .filter(r => r.ownerKey === ownerKey)
      .sort((a, b) => (a.id < b.id ? 1 : -1)); // id เป็น string แบบ padding จึงเทียบได้
  }

  // เอาอันล่าสุด (ตัวแรกหลัง sort)
  function getLatestRequestForOwner(ownerKey) {
    return getRequestsByOwner(ownerKey)[0] || null;
  }

  // ค้นหา “คำขอที่ยัง active” ของ owner เดิม ที่ serial เดิม (กันส่งซ้ำ)
  function findActiveRequestBySerial(ownerKey, serialRaw) {
    const serial = normSerial(serialRaw);
    if (!ownerKey || !serial) return null;

    const activeStatuses = new Set(["submitted", "pending_it"]);
    const list = getRequestsByOwner(ownerKey);

    return (
      list.find(r =>
        normSerial(r.serial) === serial &&
        activeStatuses.has(r.status)
      ) || null
    );
  }

  // Activity log 
  // เก็บประวัติการกระทำ เช่น Submitted, Edited, Saved note, Status change, Changed password
  function getLogs() { return readJSON(LS_ACTIVITY, []); }
  function addLog(entry) {
    const logs = getLogs();
    logs.unshift(entry); // ใหม่สุดไว้บน
    writeJSON(LS_ACTIVITY, logs);
  }

  // Role-based UI (cosmetic) 
  // ซ่อน/แสดงปุ่มที่มี data-role ตาม role (เอาไว้คุม UI เฉยๆ)
  function applyRoleAccess(role) {
    document.querySelectorAll('[data-role="it"]').forEach(el => el.classList.toggle("hidden", role !== "it"));
    document.querySelectorAll('[data-role="registrar"]').forEach(el => el.classList.toggle("hidden", role !== "registrar"));
  }

  // Top bar 
  // จัดการแถบบน (แสดง role + logout)
  function updateTopBar(role) {
    roleBadge.textContent = String(role || "").toUpperCase();
    roleBadge.classList.remove("hidden");
    btnLogout.classList.remove("hidden");
    btnGoLogin.classList.add("hidden");
  }
  function resetTopBar() {
    roleBadge?.classList.add("hidden");
    btnLogout?.classList.add("hidden");
    btnGoLogin?.classList.add("hidden");
  }

  // เคลียร์ช่องกรอก login
  function clearLoginInputs() {
    if ($("loginUser")) $("loginUser").value = "";
    if ($("loginPass")) $("loginPass").value = "";
  }

  // Status model 
  // แปลง status code เป็นข้อความบน UI
  function statusText(status) {
    const map = {
      submitted: "SUBMITTED",
      pending_it: "REGISTRAR APPROVED (WAITING FOR IT)",
      it_approved: "IT APPROVED"
    };
    return map[status] || "STATUS";
  }
  function statusDesc(status) {
    const map = {
      submitted: "Waiting for staff review",
      pending_it: "Approved by Registrar and forwarded to IT",
      it_approved: "Final approved by IT"
    };
    return map[status] || "Updated";
  }

  // Request ID counter
  function getNextRequestId() {
    // สร้าง id แบบรันเลขต่อเนื่อง แล้ว pad ให้ครบ 6 หลัก
    const n = Number(localStorage.getItem(LS_REQ_COUNTER) || "0") + 1;
    localStorage.setItem(LS_REQ_COUNTER, String(n));
    return String(n).padStart(6, "0");
  }

  // Dashboard 
  // KPI + ตารางรายการคำขอของ staff
  function computeKpi(list) {
    // นับจำนวนคำขอตามสถานะ
    const k = { submitted: 0, pending_it: 0, it_approved: 0 };
    list.forEach(r => { if (k[r.status] !== undefined) k[r.status] += 1; });
    return k;
  }

  function renderDashboard() {
    // แสดง KPI + ตาราง + ค้นหา/กรอง
    const list = getRequests();
    const k = computeKpi(list);
    setText("kpiSubmitted", String(k.submitted));
    setText("kpiWaitingIt", String(k.pending_it));
    setText("kpiApproved", String(k.it_approved));

    const tbody = $("staffTableBody");
    if (!tbody) return;

    // ค่าค้นหา (q) และ filter สถานะ (f)
    const q = ($("staffSearch")?.value || "").trim().toLowerCase();
    const f = $("staffFilterStatus")?.value || "all";

    const filtered = list.filter(r => {
      // matchQ: ค้นได้จาก id/student/class/status และยังรวม statusText ด้วย
      const matchQ =
        !q ||
        String(r.id).toLowerCase().includes(q) ||
        String(r.studentName || "").toLowerCase().includes(q) ||
        String(r.classRoom || "").toLowerCase().includes(q) ||
        String(r.status || "").toLowerCase().includes(q) ||
        String(statusText(r.status) || "").toLowerCase().includes(q);

      // matchF: ถ้าเลือก all ก็ผ่านหมด ไม่งั้นต้องตรงสถานะ
      const matchF = f === "all" ? true : r.status === f;
      return matchQ && matchF;
    });

    if (filtered.length === 0) {
      // ไม่เจอข้อมูล
      tbody.innerHTML = `
        <tr class="text-slate-500">
          <td class="px-5 py-4" colspan="6">No requests found.</td>
        </tr>
      `;
      return;
    }

    // สร้างแถวตารางด้วย template string
    tbody.innerHTML = filtered.map(r => {
      const updated = r.updatedAt || r.submittedAt || "—";
      return `
        <tr>
          <td class="px-5 py-4 font-semibold">${r.id}</td>
          <td class="px-5 py-4">${escapeHtml(r.studentName || "—")}</td>
          <td class="px-5 py-4">${escapeHtml(r.classRoom || "—")}</td>
          <td class="px-5 py-4">${statusText(r.status)}</td>
          <td class="px-5 py-4">${escapeHtml(updated)}</td>
          <td class="px-5 py-4 text-right">
            <button class="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50" data-action="view" data-id="${r.id}">
              View
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  // Parent 
  // ฟังก์ชันฝั่ง Parent: latest status, timeline, track list, duplicate warning, submit/reset/navigate

  // อัปเดตกล่อง “Latest Status” ในหน้า Parent Form จาก request ล่าสุดของ owner นี้
  function updateParentLatestStatus() {
    const statusEl = $("parentLatestStatus");
    const descEl = $("parentLatestStatusDesc");
    if (!statusEl || !descEl) return;

    const r = getLatestRequestForOwner(session.userKey);
    if (!r) {
      statusEl.textContent = "—";
      descEl.textContent = "No request yet";
      return;
    }
    statusEl.textContent = statusText(r.status);
    descEl.textContent = statusDesc(r.status);
  }

  // วาด timeline 3 ขั้น: submitted -> pending_it -> it_approved
  function renderParentTimeline(status) {
    const wrap = $("parentTimeline");
    if (!wrap) return;

    const steps = [
      { key: "submitted", title: "Submitted", desc: "Request received" },
      { key: "pending_it", title: "Registrar Approved", desc: "Forwarded to IT" },
      { key: "it_approved", title: "IT Approved", desc: "Final step" }
    ];

    const state = { submitted: 0, pending_it: 1, it_approved: 2 };
    const current = state[status] ?? -1;

    // กำหนดสี/สถานะจุดใน timeline (done/active/locked)
    wrap.innerHTML = steps.map((s, idx) => {
      
      const isDone = idx < current;
      const isActive = idx === current;

      const dotClass = isActive ? "bg-slate-900" : isDone ? "bg-slate-400" : "bg-slate-200";
      const titleClass = isActive ? "text-slate-900" : isDone ? "text-slate-700" : "text-slate-500";
      const descClass = isActive ? "text-slate-500" : isDone ? "text-slate-500" : "text-slate-400";

      return `
        <div class="flex gap-3">
          <div class="mt-1 h-2.5 w-2.5 rounded-full ${dotClass}"></div>
          <div>
            <p class="text-sm font-medium ${titleClass}">${escapeHtml(s.title)}</p>
            <p class="text-xs ${descClass}">${escapeHtml(s.desc)}</p>
          </div>
        </div>
      `;
    }).join("");
  }

  // เคลียร์ panel รายละเอียดในหน้า Track
  function clearParentTrackDetails() {
    setText("parentTrackId", "—");
    setText("parentTrackDate", "—");
    setText("parentTrackSerial", "—");
    setText("parentTrackStudent", "—");
    setText("parentTrackNote", "—");
    setText("parentTrackStatusPill", "STATUS");
    renderParentTimeline(null);
  }

  // เติมรายละเอียด request ที่เลือกในหน้า Track
  function fillParentTrackDetails(r) {
    if (!r) {
      clearParentTrackDetails();
      return;
    }
    setText("parentTrackId", r.id || "—");
    setText("parentTrackDate", r.submittedAt || "—");
    setText("parentTrackSerial", r.serial || "—");
    setText("parentTrackStudent", r.studentName ? `${r.studentName} (${r.classRoom || "—"})` : "—");
    setText("parentTrackNote", r.note ? r.note : "—");
    setText("parentTrackStatusPill", statusText(r.status));
    renderParentTimeline(r.status);
  }

  // สร้างรายการ “My Requests” ของ parent (เห็นทั้งหมดของตัวเอง)
  function renderParentTrackList() {
    
    const tbody = $("parentTrackListBody");
    if (!tbody) return;

    const list = getRequestsByOwner(session.userKey);

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr class="text-slate-500">
          <td class="px-5 py-4" colspan="3">No requests yet.</td>
        </tr>
      `;
      clearParentTrackDetails();
      parentSelectedRequestId = null;
      return;
    }

    // เลือกอันที่จะ highlight:
    // 1) ถ้าเพิ่งเจอ duplicate -> เลือกตัวนั้นก่อน
    // 2) ถ้าเคยเลือกไว้ -> เลือกเดิม
    // 3) ไม่งั้นเลือกอันล่าสุด (list[0])
    const preferredId = parentDuplicateTargetId || parentSelectedRequestId || list[0].id;
    const selected = list.find(r => r.id === preferredId) || list[0];
    parentSelectedRequestId = selected.id;
    parentDuplicateTargetId = null; // ใช้ครั้งเดียวแล้วล้าง

    tbody.innerHTML = list.map(r => {
      const isSel = r.id === parentSelectedRequestId;
      const rowClass = isSel ? "bg-slate-50" : "";
      const serialShort = (r.serial || "—").toString().slice(0, 12); // ตัดให้สั้น
      return `
        <tr class="${rowClass}">
          <td class="px-5 py-4 font-semibold">
            <button class="text-left underline decoration-slate-300 hover:decoration-slate-900" data-action="select-parent" data-id="${r.id}">
              ${escapeHtml(r.id)}
            </button>
          </td>
          <td class="px-5 py-4">${escapeHtml(serialShort)}${(r.serial || "").length > 12 ? "…" : ""}</td>
          <td class="px-5 py-4">${escapeHtml(statusText(r.status))}</td>
        </tr>
      `;
    }).join("");

    fillParentTrackDetails(selected);
  }

  // ล้างค่าฟอร์ม Parent + ซ่อนกล่อง success + ซ่อน warning duplicate
  function resetParentForm() { 
    ["pParentName", "pPhone", "pStudentName", "pClassRoom", "pSerial", "pReason"].forEach(id => {
      const el = $(id);
      if (el) el.value = "";
    });
    $("parentSubmitSuccess")?.classList.add("hidden");
    hideParentDupWarn();
  }

  // แสดงกล่องเตือนว่า serial ซ้ำ (ยัง active อยู่) และจำ id ไว้พาไป track
  function showParentDupWarn(text, requestId) {
    const box = $("parentDupWarn");
    const p = $("parentDupWarnText");
    if (!box || !p) return;

    p.textContent = text || "Duplicate active request detected.";
    box.classList.remove("hidden");
    parentDuplicateTargetId = requestId || null;

    // ซ่อน success box กันงง
    $("parentSubmitSuccess")?.classList.add("hidden");
  }

  // ซ่อนกล่องเตือน duplicate
  function hideParentDupWarn() {
    $("parentDupWarn")?.classList.add("hidden");
    $("parentDupWarnText") && ($("parentDupWarnText").textContent = "—");
  }

  // Staff view 
  // จัดการหน้า staff view: ดูรายละเอียด, note, next action, pdf buttons, transition status
  let currentViewRequestId = null;

  // ปุ่ม Print/PDF จะแสดงเฉพาะเมื่อ it_approved เท่านั้น
  function updatePdfButtonsForStatus(status) {
    const show = status === "it_approved";
    $("btnPrintPdf")?.classList.toggle("hidden", !show);
    $("btnApprovedPrintPdf")?.classList.toggle("hidden", !show);
  }

  // กำหนด “ปุ่ม Next Action” ตาม role และ status
  function getNextActionFor(role, status) {
    // registrar: submitted -> pending_it
    if (role === "registrar") {
      if (status === "submitted") {
        return { label: "Approve & Forward to IT", toStatus: "pending_it", tip: "Registrar can approve and forward this request to IT (one click)." };
      }
      if (status === "pending_it") return { label: null, toStatus: null, tip: "Already forwarded to IT. Waiting for IT final approval." };
      if (status === "it_approved") return { label: null, toStatus: null, tip: "Completed. Print/PDF is available." };
    }
    // it: pending_it -> it_approved
    if (role === "it") {
      if (status === "pending_it") {
        return { label: "Final Approve (IT)", toStatus: "it_approved", tip: "IT can final approve requests that are waiting for IT." };
      }
      if (status === "submitted") return { label: null, toStatus: null, tip: "Waiting for Registrar approval and forward first." };
      if (status === "it_approved") return { label: null, toStatus: null, tip: "Completed. Print/PDF is available." };
    }

    return { label: null, toStatus: null, tip: "No action available." };
  }

  // จำ action ที่จะทำเมื่อกดปุ่ม Next Action (เช่น toStatus)
  let pendingNextAction = null;
  
  // ตั้งค่าปุ่ม Next Action และข้อความ tip ตาม request ปัจจุบัน
  function applyContextualActionUI(r) {
    const btn = $("btnNextAction");
    const tip = $("staffNextTip");
    if (!btn) return;

    const next = getNextActionFor(session.role, r.status);
    if (tip) tip.textContent = next?.tip || "—";

    const shouldShow = Boolean(next && next.label && next.toStatus);
    btn.classList.toggle("hidden", !shouldShow);

    if (shouldShow) {
      btn.textContent = next.label;
      pendingNextAction = { toStatus: next.toStatus, label: next.label };
    } else {
      pendingNextAction = null;
    }
  }

  // เติมข้อมูล request ลงหน้า staff view
  function fillStaffView(r) { 
    if (!r) return;
    currentViewRequestId = r.id;

    setText("staffViewId", r.id || "—");
    setText("staffViewSubmitted", r.submittedAt || "—");
    setText("staffViewParent", r.parentName || "—");
    setText("staffViewPhone", r.phone || "—");
    setText("staffViewStudent", r.studentName || "—");
    setText("staffViewClass", r.classRoom || "—");
    setText("staffViewReason", r.reason || "—");

    const noteBox = $("staffViewNote");
    if (noteBox) noteBox.value = r.note || "";

    const pill = $("staffViewStatusPill");
    if (pill) pill.textContent = statusText(r.status);

    updatePdfButtonsForStatus(r.status);
    applyContextualActionUI(r);
  }

  // อนุญาตการเปลี่ยนสถานะตาม role
  function canTransition(role, fromStatus, toStatus) {
    if (!isStaff(role)) return false;

    const allowed = new Set();
    if (role === "registrar") allowed.add("submitted->pending_it");
    if (role === "it") allowed.add("pending_it->it_approved");

    // อนุญาตกรณี set ซ้ำสถานะเดิม (no-op)
    if (fromStatus === toStatus) return true;
    return allowed.has(`${fromStatus}->${toStatus}`);
  }

  // เปลี่ยน status ของ request + บันทึก updatedAt + log + อัปเดตหน้าจอ
  function setRequestStatus(id, nextStatus) {
    const r = findRequestById(id);
    if (!r) return;

    if (!canTransition(session.role, r.status, nextStatus)) {
      alert("Access denied or invalid status step.");
      return;
    }

    r.status = nextStatus;
    r.updatedAt = nowText();
    upsertRequest(r);

    addLog({
      time: nowText(),
      user: session.userKey || session.role || "staff",
      action: `Status -> ${nextStatus}`,
      requestId: r.id,
      detail: ""
    });

    fillStaffView(findRequestById(id));
    renderDashboard();
  }

  // Activity log 
  function renderLogTable() {
    // แสดงตาราง log พร้อมค้นหา
    const tbody = $("logTableBody");
    if (!tbody) return;

    const q = ($("logSearch")?.value || "").trim().toLowerCase();
    const logs = getLogs().filter(l => {
      if (!q) return true;
      return (
        String(l.user || "").toLowerCase().includes(q) ||
        String(l.action || "").toLowerCase().includes(q) ||
        String(l.requestId || "").toLowerCase().includes(q)
      );
    });

    if (logs.length === 0) {
      tbody.innerHTML = `
        <tr class="text-slate-500">
          <td class="px-5 py-4" colspan="5">No logs yet.</td>
        </tr>
      `;
      return;
    }

    // จำกัดแสดง 200 รายการล่าสุด (กันยาวเกิน)
    tbody.innerHTML = logs.slice(0, 200).map(l => `
      <tr>
        <td class="px-5 py-4">${escapeHtml(l.time || "—")}</td>
        <td class="px-5 py-4">${escapeHtml(l.user || "—")}</td>
        <td class="px-5 py-4">${escapeHtml(l.action || "—")}</td>
        <td class="px-5 py-4">${escapeHtml(l.requestId || "—")}</td>
        <td class="px-5 py-4">${escapeHtml(l.detail || "—")}</td>
      </tr>
    `).join("");
  }

  // Login/Register UI helpers 
  function syncLoginRegisterRow() {
    // โชว์แถว “Register” ในหน้า login เฉพาะตอนเลือก role เป็น registrar/it (เชิง UI)
    const role = $("loginRole")?.value || "parent";
    const row = $("loginRegisterRow");
    if (!row) return;
    row.classList.toggle("hidden", !(role === "registrar" || role === "it"));
  }

  // ในหน้า register: ถ้า IT -> เลือกสร้างได้ทุก role, ถ้า Registrar -> สร้างได้แค่ parent
  function syncRegisterRoleOptions() {
    const sel = $("regRole");
    if (!sel) return;

    const allowed = session.role === "it" ? ["parent", "registrar", "it"] : ["parent"];
    sel.innerHTML = allowed.map(v => {
      const label = v === "it" ? "IT" : v === "registrar" ? "Registrar" : "Parent";
      return `<option value="${v}">${label}</option>`;
    }).join("");
  }

  // Events 
  // โซนผูก event ทั้งหมด (ปุ่ม/อินพุต)

  // Login
  onClick("btnLogin", () => {
    // อ่านค่าจากฟอร์ม login
    const role = $("loginRole") ? $("loginRole").value : "parent";
    const user = $("loginUser") ? $("loginUser").value : "";
    const pass = $("loginPass") ? $("loginPass").value : "";
    const err = $("loginError");

    const key = user.trim().toLowerCase();

    // validate ว่าง
    if (isEmpty(key, pass)) {
      err?.classList.remove("hidden");
      err && (err.textContent = "Please enter username and password.");
      return;
    }

    // ตรวจบัญชี: ต้องมี user + role ตรง + password ตรง
    const u = findUserByEmail(key);
    if (!u || u.role !== role || u.password !== pass) {
      err?.classList.remove("hidden");
      err && (err.textContent = "Invalid login credentials.");
      return;
    }

    err?.classList.add("hidden");

    // เซ็ต session + บันทึกลง localStorage
    session.role = role;
    session.userKey = key;
    session.lastPage = role === "parent" ? "parentForm" : "staffDashboard";
    saveSession();

    // อัปเดต UI ตาม role
    updateTopBar(role);
    applyRoleAccess(role);

    // พาไปหน้าที่เหมาะสม
    if (role === "parent") {
      updateParentLatestStatus();
      showPage("parentForm");
      return;
    }

    renderDashboard();
    showPage("staffDashboard");
  });

  // Logout
  btnLogout?.addEventListener("click", () => {
    // ล้าง session แล้วกลับหน้า login
    session.role = null;
    session.userKey = null;
    session.lastPage = "login";
    saveSession();

    // ล้าง state ของ parent track
    parentSelectedRequestId = null;
    parentDuplicateTargetId = null;

    resetTopBar();
    clearLoginInputs();
    showPage("login");
  });

  // เปลี่ยน role ใน dropdown login -> ซ่อน/โชว์ register row
  $("loginRole")?.addEventListener("change", syncLoginRegisterRow);

  // ปุ่ม go register (ในหน้า login) แต่บังคับว่า IT เท่านั้นที่สร้าง account ได้จริง
  onClick("btnGoRegister", () => {
    // ขึ้นข้อความแจ้งเตือน
    alert("Register is staff-only. Please log in as IT to create accounts.");
  });

  // ปุ่ม Back ในหน้า register
  onClick("btnRegisterBackToLogin", () => {
    // ถ้ายังมี session -> กลับ home ตาม role, ถ้าไม่มีก็กลับ login
    if (session.role) {
      const home = session.role === "parent" ? "parentForm" : "staffDashboard";
      showPage(home);
    } else {
      showPage("login");
    }
  });

  // ปุ่ม Register บน dashboard (มี data-role="it")
  onClick("btnGoRegisterFromDash", () => {
    if (session.role !== "it") return alert("Access denied: IT only.");
    syncRegisterRoleOptions();
    $("registerDenied")?.classList.add("hidden");
    showPage("register");
  });

  // Create account
  onClick("btnCreateAccount", () => {
    // สร้างบัญชีใหม่ (IT หรือ Registrar เท่านั้น)
    const denied = $("registerDenied");
    const success = $("registerSuccess");
    const error = $("registerError");

    if (session.role !== "it" && session.role !== "registrar") {
      denied?.classList.remove("hidden");
      success?.classList.add("hidden");
      error?.classList.add("hidden");
      return;
    }
    denied?.classList.add("hidden");

    const role = $("regRole") ? $("regRole").value : "parent";
    const email = $("regEmail") ? $("regEmail").value.trim().toLowerCase() : "";
    const pass = $("regPass") ? $("regPass").value : "";
    const confirm = $("regPassConfirm") ? $("regPassConfirm").value : "";

    // registrar สร้างได้แค่ parent
    if (session.role === "registrar" && role !== "parent") {
      alert("Registrar can only create Parent accounts.");
      return;
    }

    // validate input + password length + confirm
    if (isEmpty(email, pass, confirm) || pass.length < 4 || pass !== confirm) {
      error?.classList.remove("hidden");
      success?.classList.add("hidden");
      return;
    }

    // กัน email ซ้ำ
    const users = getUsers();
    if (users.some(u => String(u.email || "").toLowerCase() === email)) {
      error?.classList.remove("hidden");
      success?.classList.add("hidden");
      return;
    }

    users.push({ email, role, password: pass, createdAt: nowText() });
    saveUsers(users);

    error?.classList.add("hidden");
    success?.classList.remove("hidden");
  });

  // Parent submit (Approach 1: prevent duplicate ACTIVE by serial)
  onClick("btnParentSubmit", () => {
    // ส่งคำขอ (เฉพาะ parent)
    if (session.role !== "parent") return alert("Access denied.");

    const parentName = $("pParentName")?.value || "";
    const phone = $("pPhone")?.value || "";
    const studentName = $("pStudentName")?.value || "";
    const classRoom = $("pClassRoom")?.value || "";
    const serialRaw = $("pSerial")?.value || "";
    const reason = $("pReason")?.value || "";

    // validate ช่องจำเป็น
    if (isEmpty(parentName, studentName, classRoom, serialRaw, reason)) {
      alert("Please fill in all required fields.");
      return;
    }

    // DUPLICATE CHECK: ถ้ามีคำขอ active serial เดิม -> ไม่ให้ส่งใหม่
    const dup = findActiveRequestBySerial(session.userKey, serialRaw);
    if (dup) {
      const msg =
        `You already have an active request for serial "${normSerial(serialRaw)}" ` +
        `(Request ID: ${dup.id}, Status: ${statusText(dup.status)}). ` +
        `Please track the existing request instead of submitting again.`;

      showParentDupWarn(msg, dup.id);
      return;
    }

    hideParentDupWarn();

    // สร้าง object request ใหม่
    const req = {
      id: getNextRequestId(),
      ownerKey: session.userKey,
      status: "submitted",
      parentName: parentName.trim(),
      phone: phone.trim(),
      studentName: studentName.trim(),
      classRoom: classRoom.trim(),
      serial: serialRaw.trim(),
      reason: reason.trim(),
      note: "",
      submittedAt: nowText(),
      updatedAt: ""
    };

    // บันทึก request + log
    upsertRequest(req);

    addLog({
      time: nowText(),
      user: session.userKey || "parent",
      action: "Submitted request",
      requestId: req.id,
      detail: ""
    });

    // แสดง success box พร้อม id
    if ($("parentSubmitId")) $("parentSubmitId").textContent = req.id;
    $("parentSubmitSuccess")?.classList.remove("hidden");

    updateParentLatestStatus();
  });

  // Reset form
  onClick("btnParentReset", () => {
    resetParentForm();
    updateParentLatestStatus();
  });

  // ไปหน้า Track
  onClick("btnParentToTrack", () => {
    renderParentTrackList();
    showPage("parentTrack");
  });

  // กลับหน้า Form
  onClick("btnParentToForm", () => {
    updateParentLatestStatus();
    showPage("parentForm");
  });

  // Parent duplicate warning actions
  onClick("btnParentDupGoTrack", () => {
    // ไปหน้า Track และ auto-select คำขอที่ซ้ำ
    renderParentTrackList();
    showPage("parentTrack");
  });
  onClick("btnParentDupDismiss", () => hideParentDupWarn());

  // Parent track list click
  $("parentTrackListBody")?.addEventListener("click", (e) => {
    // คลิกเลือก request ในตาราง My Requests
    const btn = e.target?.closest?.('button[data-action="select-parent"]');
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const r = findRequestById(id);
    if (!r) return;

    parentSelectedRequestId = id;
    renderParentTrackList(); // render ใหม่เพื่อ highlight แถว + อัปเดตรายละเอียด
  });

  // Staff dashboard: ไปหน้า activity log
  onClick("btnGoActivity", () => {
    if (session.role !== "it") return alert("Access denied: IT only.");
    renderLogTable();
    showPage("activityLog");
  });

  // Staff dashboard: ไปหน้า change password
  onClick("btnGoChangePassword", () => {
    if (session.role !== "it") return alert("Access denied: IT only.");
    showPage("changePassword");
  });

  // พิมพ์ค้นหา/เปลี่ยน filter -> render ตารางใหม่ทันที
  $("staffSearch")?.addEventListener("input", renderDashboard);
  $("staffFilterStatus")?.addEventListener("change", renderDashboard);

  // คลิกปุ่ม View ในตาราง dashboard -> เปิดหน้า staffView
  $("staffTableBody")?.addEventListener("click", (e) => {
    const btn = e.target?.closest?.('button[data-action="view"]');
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const r = findRequestById(id);
    if (!r) return;
    fillStaffView(r);
    showPage("staffView");
  });

  // กลับ dashboard จาก staffView
  onClick("btnBackToDashboard", () => {
    renderDashboard();
    showPage("staffDashboard");
  });

  // ไปหน้า edit
  onClick("btnGoEdit", () => {
    // เอาข้อมูล request ปัจจุบันไปเติมฟอร์ม edit
    const r = currentViewRequestId ? findRequestById(currentViewRequestId) : null;
    if (!r) return;

    if ($("eParentName")) $("eParentName").value = r.parentName || "";
    if ($("ePhone")) $("ePhone").value = r.phone || "";
    if ($("eStudentName")) $("eStudentName").value = r.studentName || "";
    if ($("eClassRoom")) $("eClassRoom").value = r.classRoom || "";
    if ($("eSerial")) $("eSerial").value = r.serial || "";
    if ($("eReason")) $("eReason").value = r.reason || "";

    $("editSavedMsg")?.classList.add("hidden");
    showPage("staffEdit");
  });

  // Save note
  onClick("btnSaveNote", () => {
    // staff บันทึก note ถึง parent
    if (!isStaff(session.role)) return alert("Access denied.");
    const r = currentViewRequestId ? findRequestById(currentViewRequestId) : null;
    if (!r) return;

    const text = ($("staffViewNote")?.value || "").trim();
    r.note = text;
    r.updatedAt = nowText();
    upsertRequest(r);

    addLog({
      time: nowText(),
      user: session.userKey || session.role || "staff",
      action: "Saved note",
      requestId: r.id,
      detail: ""
    });

    // แสดงคำว่า Saved ชั่วคราว
    const saved = $("staffNoteSavedMsg");
    if (saved) {
      saved.classList.remove("hidden");
      setTimeout(() => saved.classList.add("hidden"), 1200);
    }
  });

  // Next action (approve)
  onClick("btnNextAction", () => {
    // ทำ step ถัดไปตาม pendingNextAction (registrar forward / it final approve)
    if (!currentViewRequestId) return;
    if (!pendingNextAction?.toStatus) return;

    setRequestStatus(currentViewRequestId, pendingNextAction.toStatus);

    // ถ้า IT approve สำเร็จ -> ไปหน้า approved
    const r = findRequestById(currentViewRequestId);
    if (session.role === "it" && r?.status === "it_approved") {
      showPage("approved");
    }
  });

  // Print/PDF (ยังเป็น demo)
  onClick("btnPrintPdf", () => alert("Demo: Print/Save PDF will be implemented later."));
  onClick("btnApprovedPrintPdf", () => alert("Demo: Print/Save PDF will be implemented later."));

  // Cancel edit
  onClick("btnCancelEdit", () => {
    // ยกเลิกแล้วกลับไป view เดิม
    const r = currentViewRequestId ? findRequestById(currentViewRequestId) : null;
    if (r) fillStaffView(r);
    showPage("staffView");
  });

  // Save edit
  onClick("btnSaveEdit", () => {
    // staff แก้ไขฟิลด์คำขอ แล้วบันทึก + log + refresh dashboard
    if (!isStaff(session.role)) return alert("Access denied.");
    const r = currentViewRequestId ? findRequestById(currentViewRequestId) : null;
    if (!r) return;

    r.parentName = $("eParentName") ? $("eParentName").value.trim() : r.parentName;
    r.phone = $("ePhone") ? $("ePhone").value.trim() : r.phone;
    r.studentName = $("eStudentName") ? $("eStudentName").value.trim() : r.studentName;
    r.classRoom = $("eClassRoom") ? $("eClassRoom").value.trim() : r.classRoom;
    r.serial = $("eSerial") ? $("eSerial").value.trim() : r.serial;
    r.reason = $("eReason") ? $("eReason").value.trim() : r.reason;

    r.updatedAt = nowText();
    upsertRequest(r);

    addLog({
      time: nowText(),
      user: session.userKey || session.role || "staff",
      action: "Edited request",
      requestId: r.id,
      detail: ""
    });

    $("editSavedMsg")?.classList.remove("hidden");
    fillStaffView(findRequestById(r.id));
    showPage("staffView");
    renderDashboard();
  });

  // Approved page navigation
  onClick("btnApprovedToDashboard", () => {
    renderDashboard();
    showPage("staffDashboard");
  });
  onClick("btnApprovedToView", () => {
    const r = currentViewRequestId ? findRequestById(currentViewRequestId) : null;
    if (r) fillStaffView(r);
    showPage("staffView");
  });

  // Activity log navigation
  onClick("btnBackFromLog", () => {
    renderDashboard();
    showPage("staffDashboard");
  });
  $("logSearch")?.addEventListener("input", renderLogTable);

  // Change password navigation
  onClick("btnBackFromPw", () => {
    renderDashboard();
    showPage("staffDashboard");
  });

  // Change password
  onClick("btnSavePassword", () => {
    // IT เท่านั้นที่เปลี่ยนรหัสผ่านได้
    if (session.role !== "it") return alert("Access denied: IT only.");

    // target: ถ้าเว้นว่าง = เปลี่ยนของตัวเอง, ถ้าใส่ = เปลี่ยนของ user เป้าหมาย
    const targetRaw = ($("pwTarget")?.value || "").trim().toLowerCase();
    const target = targetRaw || (session.userKey || "");

    const c = $("pwCurrent")?.value || ""; // รหัสปัจจุบันของ IT (ใช้ยืนยันสิทธิ์)
    const n = $("pwNew")?.value || "";     // รหัสใหม่
    const cf = $("pwConfirm")?.value || "";// ยืนยันรหัสใหม่

    const ok = $("pwSavedMsg");
    const err = $("pwErrorMsg");

    // validate: ห้ามว่าง, รหัสใหม่ต้องตรงกัน, ยาว >=4
    if (isEmpty(target, c, n, cf) || n !== cf || n.length < 4) {
      err?.classList.remove("hidden");
      ok?.classList.add("hidden");
      return;
    }

    // ตรวจว่า IT ที่ล็อกอินอยู่ใส่ current password ถูกจริง
    const itUser = findUserByEmail(session.userKey);
    if (!itUser || itUser.role !== "it" || itUser.password !== c) {
      err?.classList.remove("hidden");
      ok?.classList.add("hidden");
      return;
    }

    // หา user เป้าหมาย แล้วเปลี่ยนรหัส
    const users = getUsers();
    const idx = users.findIndex(u => String(u.email || "").toLowerCase() === target);
    if (idx < 0) {
      alert("Target user not found.");
      err?.classList.remove("hidden");
      ok?.classList.add("hidden");
      return;
    }

    users[idx].password = n;
    users[idx].updatedAt = nowText();
    saveUsers(users);

    addLog({
      time: nowText(),
      user: session.userKey,
      action: `Changed password for ${target}`,
      requestId: "",
      detail: ""
    });

    err?.classList.add("hidden");
    ok?.classList.remove("hidden");
    if ($("pwLastUpdated")) $("pwLastUpdated").textContent = nowText();
  });

  // Init 
  function init() {
    // เริ่มระบบ: ตรวจหน้า, สร้าง default user, โหลด session, สลับหน้าอัตโนมัติ
    if (!validatePageIds()) return;

    ensureDefaultUsers();
    loadSession();
    sanitizeLastPage();
    saveSession();

    resetTopBar();
    syncLoginRegisterRow();

    // ถ้ามี session -> เข้าหน้าเดิมตาม role
    if (session.role) {
      updateTopBar(session.role);
      applyRoleAccess(session.role);

      if (session.role === "parent") {
        updateParentLatestStatus();
        showPage(session.lastPage || "parentForm");
        return;
      }

      renderDashboard();
      showPage(session.lastPage || "staffDashboard");
      return;
    }

    // ถ้าไม่มี session -> ไปหน้า login
    clearLoginInputs();
    showPage("login");
  }

  init();
});