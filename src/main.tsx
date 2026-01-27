import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

/**
 * NOTE (STEP 5.1):
 * หยุดเรียก legacy initIRRS() ชั่วคราว เพราะมันจะชนกับ React และทำให้หน้า/DOM เพี้ยน
 * เดี๋ยวค่อยย้าย logic จาก legacy เข้า React ทีละส่วนแล้วค่อยลบ legacy ออก
 */
// import { initIRRS } from "./legacy/irrs.js";
// initIRRS();
