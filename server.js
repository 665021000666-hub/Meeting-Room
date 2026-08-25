// server.js
import express from "express";
import cors from "cors";
import pkg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const { Pool } = pkg;
const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.static("public"));

// ✅ PostgreSQL connection
const pool = new Pool({
  user: "postgres",
  password: "rootroot",
  host: "localhost",
  port: 5432,
  database: "meeting",
});

const JWT_SECRET = "supersecretkey123";


//////////////////////////////
app.get("/", (req, res) => {
  res.sendFile("login.html");
});



// ===========================================
// 🔹 สร้าง admin อัตโนมัติถ้ายังไม่มี
// ===========================================
async function ensureAdminUser() {
  const result = await pool.query("SELECT * FROM users WHERE role = 'admin'");
  if (result.rows.length === 0) {
    const hashed = await bcrypt.hash("123456", 10);
    await pool.query(
      "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)",
      ["admin", hashed, "admin"]
    );
    console.log("✅ Created default admin (username: admin, password: 123456)");
  }
}
ensureAdminUser();

// ===========================================
// 🔹 LOGIN
// ===========================================
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
    if (result.rows.length === 0)
      return res.status(400).json({ message: "ไม่พบบัญชีผู้ใช้" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) return res.status(400).json({ message: "รหัสผ่านไม่ถูกต้อง" });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "2h",
    });

    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
  }
});

// ===========================================
// 🔹 REGISTER (เข้ารหัสด้วย bcrypt)
// ===========================================
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const exist = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
    if (exist.rows.length > 0)
      return res.status(400).json({ message: "ชื่อผู้ใช้นี้มีอยู่แล้ว" });

    const hashed = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (username, password, role) VALUES ($1, $2, 'user')", [
      username,
      hashed,
    ]);
    res.json({ message: "สมัครสมาชิกสำเร็จ!" });
  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการสมัครสมาชิก" });
  }
});

// ===========================================
// 🔹 ดึงข้อมูลทั้งหมดของการจอง
// ===========================================
app.get("/api/bookings", async (req, res) => {
  try {
    const query = `
      SELECT b.id, b.start_time, b.end_time,
             r.name AS room_name, f.name AS floor_name, bd.name AS building_name
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN floors f ON r.floor_id = f.id
      JOIN buildings bd ON f.building_id = bd.id
      WHERE b.status = 'approve'
      ORDER BY b.start_time ASC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ GET /api/bookings failed:", err);
    res.status(500).json({ message: "ไม่สามารถโหลดข้อมูลการจองได้" });
  }
});

// ===========================================
// 🔹 เพิ่มการจอง (เช็คเวลาทับกัน)
// ===========================================
app.post("/api/bookings", async (req, res) => {
  try {
    const { building, floor, room, start_time, end_time } = req.body;
    if (!building || !floor || !room || !start_time || !end_time)
      return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });

    const roomResult = await pool.query(
      `
      SELECT r.id FROM rooms r
      JOIN floors f ON r.floor_id = f.id
      JOIN buildings b ON f.building_id = b.id
      WHERE b.name=$1 AND f.name=$2 AND r.name=$3
      `,
      [building, floor, room]
    );

    if (roomResult.rows.length === 0)
      return res.status(404).json({ message: "ไม่พบบันทึกห้องนี้ในระบบ" });

    const room_id = roomResult.rows[0].id;

    const overlap = await pool.query(
      `
      SELECT * FROM bookings
      WHERE room_id=$1
        AND (($2 < end_time) AND ($3 > start_time))
      `,
      [room_id, start_time, end_time]
    );

    if (overlap.rows.length > 0)
      return res.status(400).json({ message: "ช่วงเวลานี้ถูกจองแล้ว" });

    const insert = await pool.query(
      `
      INSERT INTO bookings (room_id, start_time, end_time)
      VALUES ($1, $2, $3)
      RETURNING *;
      `,
      [room_id, start_time, end_time]
    );

    res.json({ message: "จองห้องสำเร็จ", booking: insert.rows[0] });
  } catch (err) {
    console.error("❌ POST /api/bookings failed:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการจอง" });
  }
});

// ===========================================
// 🔹 ลบการจอง (Admin)
// ===========================================
app.delete("/api/admin/bookings/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query("DELETE FROM bookings WHERE id=$1", [id]);
    res.json({ message: "ลบรายการจองสำเร็จ" });
  } catch (err) {
    console.error("❌ DELETE /api/admin/bookings failed:", err);
    res.status(500).json({ message: "ไม่สามารถลบรายการจองได้" });
  }
});

// ===========================================
// 🔹 แก้ไขการจอง (สำหรับ Admin)
// ===========================================
app.put("/api/admin/bookings/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { start_time, end_time } = req.body;

    if (!start_time || !end_time)
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });

    // ตรวจสอบว่ารายการนี้มีอยู่จริง
    const cur = await pool.query("SELECT room_id FROM bookings WHERE id=$1", [id]);
    if (cur.rowCount === 0)
      return res.status(404).json({ message: "ไม่พบรายการนี้" });

    const room_id = cur.rows[0].room_id;

    // ตรวจสอบเวลาทับซ้อน
    const clash = await pool.query(
      `SELECT 1 FROM bookings 
       WHERE room_id=$1 AND id<>$2
       AND ($3 < end_time) AND ($4 > start_time)`,
      [room_id, id, start_time, end_time]
    );
    if (clash.rowCount > 0)
      return res.status(400).json({ message: "เวลาทับกัน" });

    // อัปเดตข้อมูล
    const upd = await pool.query(
      "UPDATE bookings SET start_time=$1, end_time=$2 WHERE id=$3 RETURNING *",
      [start_time, end_time, id]
    );

    res.json({ message: "อัปเดตสำเร็จ", booking: upd.rows[0] });
  } catch (e) {
    res.status(500).json({ message: "ไม่สามารถแก้ไขได้" });
  }
});

app.get("/api/approve", async (req, res) => {
  try {
    const query = `
      SELECT b.id, b.start_time, b.end_time,
             r.name AS room_name, f.name AS floor_name, bd.name AS building_name
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN floors f ON r.floor_id = f.id
      JOIN buildings bd ON f.building_id = bd.id
      WHERE b.status = 'pending'
      ORDER BY b.id ASC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
  }
});
// ===========================================
// 🔹 อนุมัติการจอง (Admin)
// ===========================================
app.get("/api/admin/approve/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query("UPDATE bookings SET status = 'approve' WHERE id=$1", [id]);
    res.json({ message: "เปลี่ยนสถานะเป็นอนุมัติรายการจองสำเร็จ" });
  } catch (err) {
    console.error("❌ ๊UPDATE /api/admin/approve failed:", err);
    res.status(500).json({ message: "ไม่สามารถอนุมัติรายการจองได้" });
  }
});
// ===========================================
// 🔹 ไม่อนุมัติการจอง (Admin)
// ===========================================
app.get("/api/admin/approve-not/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query("UPDATE bookings SET status = 'not approve' WHERE id=$1", [id]);
    res.json({ message: "เปลี่ยนสถานะเป็นไม่อนุมัติรายการจองสำเร็จ" });
  } catch (err) {
    console.error("❌ UPDATE /api/admin/approve-not failed:", err);
    res.status(500).json({ message: "ไม่สามารถไม่อนุมัติรายการจองได้" });
  }
});

// ===========================================
// ✅ START SERVER
// ===========================================
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
