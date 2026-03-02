import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import sqlite3 from "better-sqlite3";
import jwt from "jsonwebtoken";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "edubrain-secret-key";

app.use(express.json());

// Database Initialization
const db = sqlite3("edubrain.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'student')) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    course TEXT,
    total_fee REAL,
    paid_amount REAL DEFAULT 0,
    due_date TEXT,
    payment_status TEXT DEFAULT 'Pending',
    last_reminder_date TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    reminder_date TEXT,
    reminder_type TEXT,
    status TEXT,
    message TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );
`);

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", "admin123", "admin");
}

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API Routes ---

// Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;

  if (user) {
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, role: user.role, username: user.username });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// Admin: Get Dashboard Stats
app.get("/api/admin/stats", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);

  const totalStudents = db.prepare("SELECT COUNT(*) as count FROM students").get() as any;
  const pendingFees = db.prepare("SELECT SUM(total_fee - paid_amount) as total FROM students WHERE payment_status = 'Pending'").get() as any;
  const collectedFees = db.prepare("SELECT SUM(paid_amount) as total FROM students").get() as any;
  const overdueCount = db.prepare("SELECT COUNT(*) as count FROM students WHERE payment_status = 'Pending' AND date(due_date) < date('now')").get() as any;

  res.json({
    totalStudents: totalStudents.count,
    pendingFees: pendingFees.total || 0,
    collectedFees: collectedFees.total || 0,
    overdueCount: overdueCount.count
  });
});

// Admin: Get Students
app.get("/api/admin/students", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const students = db.prepare("SELECT * FROM students").all();
  res.json(students);
});

// Admin: Add Student
app.post("/api/admin/students", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { name, phone, email, course, total_fee, due_date } = req.body;

  // Create a student user account
  const username = name.toLowerCase().replace(/\s/g, '') + Math.floor(1000 + Math.random() * 9000);
  const password = "password123";
  const userResult = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, password, 'student');
  const userId = userResult.lastInsertRowid;

  db.prepare(`
    INSERT INTO students (user_id, name, phone, email, course, total_fee, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, name, phone, email, course, total_fee, due_date);

  res.status(201).json({ message: "Student added", username, password });
});

// Admin: Mark as Paid
app.patch("/api/admin/students/:id/pay", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { id } = req.params;
  const { amount } = req.body;

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(id) as any;
  if (!student) return res.status(404).json({ message: "Student not found" });

  const newPaidAmount = student.paid_amount + amount;
  const status = newPaidAmount >= student.total_fee ? 'Paid' : 'Pending';

  db.prepare("UPDATE students SET paid_amount = ?, payment_status = ? WHERE id = ?")
    .run(newPaidAmount, status, id);

  res.json({ message: "Payment updated" });
});

// Student: Get My Info
app.get("/api/student/me", authenticateToken, (req: any, res) => {
  const student = db.prepare("SELECT * FROM students WHERE user_id = ?").get(req.user.id);
  res.json(student);
});

// Reminder Logs
app.get("/api/admin/reminders", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const logs = db.prepare(`
    SELECT r.*, s.name as student_name
    FROM reminders r
    JOIN students s ON r.student_id = s.id
    ORDER BY r.reminder_date DESC
    LIMIT 100
  `).all();
  res.json(logs);
});

// --- Reminder Logic ---
const sendReminders = () => {
  console.log("Checking for due payments...");
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Find students with pending fees whose due date has passed or is today
  // AND either never had a reminder OR last reminder was >= 2 days ago
  const studentsToRemind = db.prepare(`
    SELECT * FROM students
    WHERE payment_status = 'Pending'
    AND date(due_date) <= date('now')
    AND (last_reminder_date IS NULL OR date(last_reminder_date, '+2 days') <= date('now'))
  `).all() as any[];

  studentsToRemind.forEach(student => {
    const dueAmount = student.total_fee - student.paid_amount;
    const message = `Dear ${student.name}, This is a reminder from eDU Brain Education that your fee of ₹${dueAmount} is pending. Kindly make the payment at the earliest. Thank you.`;

    console.log(`Sending reminder to ${student.name} (${student.phone}): ${message}`);

    // Log reminder
    db.prepare("INSERT INTO reminders (student_id, reminder_date, reminder_type, status, message) VALUES (?, ?, ?, ?, ?)")
      .run(student.id, todayStr, 'SMS/Email', 'Sent', message);

    // Update last reminder date
    db.prepare("UPDATE students SET last_reminder_date = ? WHERE id = ?")
      .run(todayStr, student.id);
  });
};

// Run reminder check every 1 minute for demo purposes (usually daily)
setInterval(sendReminders, 60000);

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
