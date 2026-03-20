# TOR - Timesheet System
## Terms of Reference
**Project:** Personal Timesheet System  
**Date:** 2026-03-20  
**Requester:** Art  
**Status:** ✅ Approved - Ready for UX/UI

---

## 1. Project Overview
ระบบลงเวลางานส่วนตัวบนเว็บ สำหรับบันทึกการทำงานรายวันและ Export เป็น Excel

## 2. Requirements

### 2.1 Functional Requirements
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | ลงเวลางานรายวัน (Date, Feature, Activity, Hours, Minutes, Note) | Must |
| FR-002 | แสดงรายการทั้งหมดของเดือนในรูปแบบตาราง | Must |
| FR-003 | Export ข้อมูลเป็น Excel (.xlsx) ตาม format ที่กำหนด | Must |
| FR-004 | คำนวณ "Day" อัตโนมัติจาก Hours (8 ชั่วโมง = 1 วัน) | Must |
| FR-005 | รองรับหลายรายการต่อวัน | Must |
| FR-006 | แก้ไข/ลบรายการได้ | Must |
| FR-007 | Settings page: ตั้งค่า Name, Department, Position | Must |
| FR-008 | Dropdown preset สำหรับ Feature และ Activity (แก้ไขได้) | Should |
| FR-009 | Filter ดูตามเดือน/ปี | Should |

### 2.2 Excel Export Format
```
Row 1: Name: [ชื่อผู้ใช้]
Row 2: Department: [แผนก]
Row 3: Position: [ตำแหน่ง]
Row 4: Month: [เดือน]
Row 6 Header: Date | Feature | Activity | Day | Hours | Minutes | Note | Day
```

### 2.3 Data Structure
- **Feature options:** "0000000-Others / Support", "Internal Project", etc.
- **Activity options:** "Bug Fixing", "Daily Meeting", "Support Case On Jira", "Leave", "Non-development related meeting"
- **Hours calculation:** Day = (Hours + Minutes/60) / 8

### 2.4 Non-Functional Requirements
- Single user (no auth needed)
- SQLite for data storage
- Responsive web interface
- React + Tailwind CSS

---

## 3. Design Decisions (Confirmed)

| Question | Decision |
|----------|----------|
| Name/Dept/Position | ✅ ตั้งค่าได้ (Settings page) |
| Feature/Activity | ✅ Dropdown preset แก้ไขได้ |
| Storage | ✅ SQLite (file-based) |

---

## 4. Tech Stack
- **Frontend:** React + Tailwind CSS + Vite
- **Backend:** Node.js + Express (lightweight)
- **Export:** xlsx library (sheetjs)
- **Storage:** **CSV file** (`data/timesheet.csv`)
  - Read/Write CSV directly
  - Backup อัตโนมัติทุกครั้งที่ save (timesheet_backup_[timestamp].csv)

---

## 5. Pages Required (for UX/UI)
1. **Dashboard/Entry Page** - ลงเวลา + ดูรายการ
2. **Settings Page** - ตั้งค่าส่วนตัว + Preset values
3. **Export Page** - Export Excel

---

## 6. Approval Status
- [x] TOR Approved by Art
- [x] Ready for UX/UI Phase
- [ ] UX/UI Designs Approved
- [ ] Coding Complete
- [ ] QA Passed

---
*Created by Luna | Vibe Team Workflow*
