import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

const sqlite = sqlite3.verbose();
const db = new sqlite.Database('./attendance.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to local SQLite database (attendance.db).');
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS active_sessions (
    course_id TEXT PRIMARY KEY,
    is_open INTEGER,
    qr_token TEXT,
    latitude REAL,
    longitude REAL,
    radius_meters REAL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id TEXT,
    full_name TEXT,
    index_number TEXT,
    program_type TEXT,
    level TEXT,
    program_of_study TEXT,
    course_name TEXT,
    timestamp TEXT
  )`);
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

app.get('/api/attendance/session', (req, res) => {
  const { courseId } = req.query;
  db.get(`SELECT * FROM active_sessions WHERE course_id = ?`, [courseId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) {
      return res.json({ is_open: 0, qr_token: '', latitude: null, longitude: null, radius_meters: 100 });
    }
    res.json(row);
  });
});

app.post('/api/attendance/session', (req, res) => {
  const { courseId, isOpen, qrToken, latitude, longitude, radiusMeters } = req.body;
  const openVal = isOpen ? 1 : 0;
  const rad = radiusMeters || 100;

  db.run(
    `INSERT INTO active_sessions (course_id, is_open, qr_token, latitude, longitude, radius_meters) 
     VALUES (?, ?, ?, ?, ?, ?) 
     ON CONFLICT(course_id) DO UPDATE SET is_open = ?, qr_token = ?, latitude = ?, longitude = ?, radius_meters = ?`,
    [courseId, openVal, qrToken, latitude, longitude, rad, openVal, qrToken, latitude, longitude, rad],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, is_open: openVal });
    }
  );
});

app.delete('/api/attendance/records', (req, res) => {
  const { courseId } = req.query;
  if (!courseId) return res.status(400).json({ error: 'Course ID is required' });

  db.run(`DELETE FROM attendance_records WHERE course_id = ?`, [courseId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deletedCount: this.changes });
  });
});

app.post('/api/attendance/submit', (req, res) => {
  const { courseId, fullName, indexNumber, programType, level, programOfStudy, courseName, passcode, latitude, longitude } = req.body;

  db.get(`SELECT * FROM active_sessions WHERE course_id = ?`, [courseId], (err, session) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!session || session.is_open === 0) {
      return res.status(400).json({ error: 'The attendance form is currently closed by the lecturer.' });
    }
    if (session.qr_token.toUpperCase() !== passcode.toUpperCase()) {
      return res.status(400).json({ error: 'The session passcode you entered is incorrect.' });
    }

    if (latitude && longitude && session.latitude && session.longitude) {
      const distanceMeters = calculateDistance(latitude, longitude, session.latitude, session.longitude);
      const allowedRadius = session.radius_meters || 100;

      if (distanceMeters > allowedRadius) {
        return res.status(400).json({ 
          error: `Geofence restriction: You are outside the lecture hall boundary (${Math.round(distanceMeters)}m away).` 
        });
      }
    }

    const cleanIndex = indexNumber.trim().toUpperCase();
    db.get(`SELECT * FROM attendance_records WHERE course_id = ? AND index_number = ?`, [courseId, cleanIndex], (err, existing) => {
      if (err) return res.status(500).json({ error: err.message });
      if (existing) {
        return res.status(400).json({ error: 'You have already submitted attendance for this session.' });
      }

      const timestamp = new Date().toISOString();
      db.run(
        `INSERT INTO attendance_records (course_id, full_name, index_number, program_type, level, program_of_study, course_name, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [courseId, fullName.trim(), cleanIndex, programType, level, programOfStudy, courseName, timestamp],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, message: 'Attendance recorded successfully!' });
        }
      );
    });
  });
});

app.get('/api/attendance/records', (req, res) => {
  const { courseId } = req.query;
  let query = `SELECT * FROM attendance_records`;
  let params = [];

  if (courseId) {
    query += ` WHERE course_id = ?`;
    params.push(courseId);
  }

  query += ` ORDER BY timestamp DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const formattedRows = rows.map(r => ({
      courseId: r.course_id,
      fullName: r.full_name,
      indexNumber: r.index_number,
      programType: r.program_type,
      level: r.level,
      programOfStudy: r.program_of_study,
      courseName: r.course_name,
      timestamp: r.timestamp
    }));
    
    res.json(formattedRows);
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running offline on http://localhost:${PORT}`);
});