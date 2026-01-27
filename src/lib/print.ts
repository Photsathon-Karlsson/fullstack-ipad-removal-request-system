import type { RemovalRequest } from "./requests";

function esc(s: string) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmt(dtIso: string) {
  try {
    return new Date(dtIso).toLocaleString();
  } catch {
    return dtIso;
  }
}

export function printRequest(req: RemovalRequest) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Pop-up blocked. Enable pop-ups and retry.");
    return;
  }

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(req.id)}</title>
  <style>
    /* ===============================
       PRINT SETUP
       =============================== */
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color:#111; margin:0; }

    /* ลดโอกาสแตกหน้า */
    .topbar, .grid, .notesBox, .signWrap, .footer { break-inside: avoid; page-break-inside: avoid; }

    /* ===============================
       HEADER
       =============================== */
    .topbar {
      display:flex; align-items:flex-start; justify-content:space-between;
      border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 10px;
      gap: 12px;
    }
    .brand { display:flex; gap:12px; align-items:center; }
    .logo {
      width:40px; height:40px; border-radius:999px;
      border:2px solid #111; display:flex; align-items:center; justify-content:center;
      font-weight:900; letter-spacing:.5px;
      flex: 0 0 auto;
    }
    .title { font-size: 17px; font-weight: 900; margin:0; line-height:1.15; }
    .subtitle { font-size: 11px; color:#444; margin-top:3px; }
    .meta { text-align:right; font-size:11px; line-height:1.3; white-space: nowrap; }
    .meta b { font-weight: 900; }

    /* ===============================
       SECTIONS / GRID
       =============================== */
    .sectionTitle { font-size: 12.5px; font-weight: 900; margin: 10px 0 6px; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
    .field { border:1px solid #ccc; border-radius:10px; padding:8px; min-height:46px; }
    .label { font-size: 10.5px; color:#333; font-weight: 800; margin-bottom:4px; }
    .value { font-size: 12px; color:#111; }
    .full { grid-column: 1 / -1; }
    .value pre { white-space: pre-wrap; margin:0; font-family: inherit; }

    /* กัน reason ยาวแล้วดันไปหน้า 2 (เอาให้อยู่หน้าเดียว) */
    .reasonBox pre {
      max-height: 88px;           /* ปรับได้เล็ก/ใหญ่ตามต้องการ */
      overflow: hidden;
    }

    /* คั่นส่วนให้สั้นลง */
    .divider { height: 1px; background:#ddd; margin: 10px 0; }

    /* ===============================
       IT NOTES (6 lines)
       =============================== */
    .notesBox { border:1px solid #111; border-radius:10px; padding:8px; }
    .noteLines { margin-top: 6px; }
    .noteLine { border-bottom: 1px dotted #777; height: 16px; }

    /* ===============================
       SIGNATURES
       =============================== */
    .signWrap { margin-top: 10px; }
    .signGrid { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .signBox {
      border:1px solid #111; border-radius:10px; padding:8px; min-height:76px;
      display:flex; flex-direction:column; justify-content:space-between;
    }
    .signLine { border-top:1px solid #111; margin-top: 26px; }
    .signLabel { font-size: 10.5px; font-weight: 900; color:#111; margin-top:6px; }

    /* ===============================
       FOOTER
       =============================== */
    .footer {
      margin-top: 10px; border-top:1px solid #ddd; padding-top:8px;
      font-size: 10.5px; color:#555; display:flex; justify-content:space-between;
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="brand">
      <div class="logo">SS</div>
      <div>
        <div class="title">School System</div>
        <div class="subtitle">iPad Removal Request Form (Printable)</div>
      </div>
    </div>

    <div class="meta">
      <div><b>Request ID:</b> ${esc(req.id)}</div>
      <div><b>Status:</b> ${esc(req.status)}</div>
      <div><b>Printed:</b> ${esc(new Date().toLocaleString())}</div>
    </div>
  </div>

  <div class="sectionTitle">Request Details</div>
  <div class="grid">
    <div class="field">
      <div class="label">Parent/Guardian Full Name</div>
      <div class="value">${esc(req.parentName)}</div>
    </div>
    <div class="field">
      <div class="label">Email</div>
      <div class="value">${esc(req.email || "-")}</div>
    </div>

    <div class="field">
      <div class="label">Phone Number 1</div>
      <div class="value">${esc(req.phone1)}</div>
    </div>
    <div class="field">
      <div class="label">Phone Number 2</div>
      <div class="value">${esc(req.phone2 || "-")}</div>
    </div>

    <div class="field">
      <div class="label">Student Full Name</div>
      <div class="value">${esc(req.studentName)}</div>
    </div>
    <div class="field">
      <div class="label">Class/Room</div>
      <div class="value">${esc(req.classRoom)}</div>
    </div>

    <div class="field">
      <div class="label">Device Serial Number</div>
      <div class="value">${esc(req.deviceSerial)}</div>
    </div>
    <div class="field">
      <div class="label">Device Model</div>
      <div class="value">${esc(req.deviceModel || "-")}</div>
    </div>

    <div class="field">
      <div class="label">Created</div>
      <div class="value">${esc(fmt(req.createdAt))}</div>
    </div>
    <div class="field">
      <div class="label">Updated</div>
      <div class="value">${esc(fmt(req.updatedAt))}</div>
    </div>

    <div class="field full reasonBox">
      <div class="label">Reason for Removal Request</div>
      <div class="value"><pre>${esc(req.reason)}</pre></div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="sectionTitle">IT Notes</div>
  <div class="notesBox">
    <div class="label">หมายเหตุ IT</div>
    <div class="noteLines">
      <div class="noteLine"></div>
      <div class="noteLine"></div>
      <div class="noteLine"></div>
      <div class="noteLine"></div>
      <div class="noteLine"></div>
      <div class="noteLine"></div>
    </div>
  </div>

  <div class="signWrap">
    <div class="sectionTitle">Signatures</div>
    <div class="signGrid">
      <div class="signBox">
        <div class="label">Signature</div>
        <div class="signLine"></div>
        <div class="signLabel">Parent/Guardian</div>
      </div>
      <div class="signBox">
        <div class="label">Signature</div>
        <div class="signLine"></div>
        <div class="signLabel">IT Staff</div>
      </div>
      <div class="signBox">
        <div class="label">Date</div>
        <div class="signLine"></div>
        <div class="signLabel">DD / MM / YYYY</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div>© 2026 School System</div>
    <div>${esc(req.id)}</div>
  </div>

  <script>
    window.focus();
    setTimeout(() => window.print(), 200);
  </script>
</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}
