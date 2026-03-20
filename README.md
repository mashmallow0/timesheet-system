# Timesheet System

ระบบลงเวลางานส่วนตัวบนเว็บ พร้อม Export Excel

## Features
- 📝 ลงเวลางานรายวัน (Date, Feature, Activity, Hours, Minutes, Note)
- 📊 Dashboard แสดงสรุปรวมชั่วโมง, รวมวัน (คำนวณ Hours/8)
- 📤 Export ข้อมูลเป็น Excel (.xlsx) ตามเดือน/ปี
- ⚙️ ตั้งค่าข้อมูลส่วนตัว (Name, Department, Position)
- 🏷️ จัดการ Feature Presets และ Activity Presets
- ✏️ แก้ไข/ลบรายการได้
- 💾 บันทึกข้อมูลลง CSV

## Tech Stack
- **Frontend:** React 19 + Tailwind CSS 4 + Vite 8
- **Backend:** Node.js + Express
- **Storage:** CSV files
- **Export:** xlsx (SheetJS)

## Installation

```bash
# Clone repository
git clone https://github.com/mashmallow0/timesheet-system.git
cd timesheet-system

# Install dependencies
npm install

# Build frontend
npm run build

# Start server
npm run server
```

## Usage

### Development Mode
```bash
# Terminal 1: Start backend server
npm run server

# Terminal 2: Start frontend dev server
npm run dev
```

### Production Mode
```bash
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/timesheet` | ดึงรายการทั้งหมด |
| POST | `/api/timesheet` | เพิ่มรายการใหม่ |
| PUT | `/api/timesheet/:index` | แก้ไขรายการ |
| DELETE | `/api/timesheet/:index` | ลบรายการ |
| GET | `/api/settings` | ดึงข้อมูลส่วนตัว |
| POST | `/api/settings` | บันทึกข้อมูลส่วนตัว |
| GET | `/api/presets` | ดึง presets |
| POST | `/api/presets` | บันทึก presets |
| GET | `/api/export/:year/:month` | Export Excel |

## CSV Structure

### timesheet.csv
```csv
Date,Feature,Activity,Hours,Minutes,Note
2026-03-20,Bug Fixing,Daily Meeting,2,30,Fixed login issue
```

### settings.csv
```csv
Name,Department,Position
John Doe,Engineering,Developer
```

## Project Structure
```
timesheet-system/
├── data/              # CSV storage
│   ├── timesheet.csv
│   ├── settings.csv
│   └── presets.json
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   ├── Settings.jsx
│   │   └── Export.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── server.js          # Express API
├── package.json
├── vite.config.js
└── README.md
```

## Pages

### Dashboard
- ฟอร์มลงเวลา (Date, Feature, Activity, Hours, Minutes, Note)
- ตารางแสดงรายการทั้งหมด
- Summary Cards (รวมชั่วโมง, รวมวัน, จำนวนรายการ)
- ปุ่ม Edit/Delete
- Navigation ไป Settings/Export

### Settings
- ฟอร์มข้อมูลส่วนตัว
- Feature Presets (Add/Edit/Delete)
- Activity Presets (Add/Edit/Delete)

### Export
- Dropdown เลือกเดือน/ปี
- Preview Table
- Download Excel (.xlsx)

## License
MIT

---
*Vibe Team Project*
