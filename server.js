const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const xlsx = require('xlsx');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const TIMESHEET_FILE = path.join(DATA_DIR, 'timesheet.csv');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.csv');
const PRESETS_FILE = path.join(DATA_DIR, 'presets.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize CSV files if not exist
function initFiles() {
  if (!fs.existsSync(TIMESHEET_FILE)) {
    fs.writeFileSync(TIMESHEET_FILE, 'Date,Feature,Activity,Hours,Minutes,Note\n');
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, 'Name,Department,Position\n,,\n');
  }
  if (!fs.existsSync(PRESETS_FILE)) {
    fs.writeFileSync(PRESETS_FILE, JSON.stringify({ features: [], activities: [] }, null, 2));
  }
}

initFiles();

// Read timesheet data
function readTimesheet() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(TIMESHEET_FILE)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Write timesheet data
async function writeTimesheet(data) {
  const csvWriter = createCsvWriter({
    path: TIMESHEET_FILE,
    header: [
      { id: 'Date', title: 'Date' },
      { id: 'Feature', title: 'Feature' },
      { id: 'Activity', title: 'Activity' },
      { id: 'Hours', title: 'Hours' },
      { id: 'Minutes', title: 'Minutes' },
      { id: 'Note', title: 'Note' }
    ]
  });
  await csvWriter.writeRecords(data);
}

// Read settings
function readSettings() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(SETTINGS_FILE)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results[0] || { Name: '', Department: '', Position: '' }))
      .on('error', reject);
  });
}

// Write settings
async function writeSettings(data) {
  const csvWriter = createCsvWriter({
    path: SETTINGS_FILE,
    header: [
      { id: 'Name', title: 'Name' },
      { id: 'Department', title: 'Department' },
      { id: 'Position', title: 'Position' }
    ]
  });
  await csvWriter.writeRecords([data]);
}

// Read presets
function readPresets() {
  try {
    const data = fs.readFileSync(PRESETS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { features: [], activities: [] };
  }
}

// Write presets
function writePresets(data) {
  fs.writeFileSync(PRESETS_FILE, JSON.stringify(data, null, 2));
}

// ==================== API Routes ====================

// Get all timesheet entries
app.get('/api/timesheet', async (req, res) => {
  try {
    const data = await readTimesheet();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new entry
app.post('/api/timesheet', async (req, res) => {
  try {
    const entries = await readTimesheet();
    const newEntry = {
      Date: req.body.Date,
      Feature: req.body.Feature,
      Activity: req.body.Activity,
      Hours: req.body.Hours,
      Minutes: req.body.Minutes,
      Note: req.body.Note || ''
    };
    entries.push(newEntry);
    await writeTimesheet(entries);
    res.json({ success: true, entry: newEntry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update entry
app.put('/api/timesheet/:index', async (req, res) => {
  try {
    const entries = await readTimesheet();
    const index = parseInt(req.params.index);
    if (index >= 0 && index < entries.length) {
      entries[index] = {
        Date: req.body.Date,
        Feature: req.body.Feature,
        Activity: req.body.Activity,
        Hours: req.body.Hours,
        Minutes: req.body.Minutes,
        Note: req.body.Note || ''
      };
      await writeTimesheet(entries);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Entry not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete entry
app.delete('/api/timesheet/:index', async (req, res) => {
  try {
    const entries = await readTimesheet();
    const index = parseInt(req.params.index);
    if (index >= 0 && index < entries.length) {
      entries.splice(index, 1);
      await writeTimesheet(entries);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Entry not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const data = await readSettings();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/settings', async (req, res) => {
  try {
    await writeSettings(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get presets
app.get('/api/presets', (req, res) => {
  try {
    const data = readPresets();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update presets
app.post('/api/presets', (req, res) => {
  try {
    writePresets(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export to Excel
app.get('/api/export/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const allData = await readTimesheet();
    
    // Filter by month/year
    const filteredData = allData.filter(entry => {
      const entryDate = new Date(entry.Date);
      return entryDate.getFullYear() == year && (entryDate.getMonth() + 1) == month;
    });

    // Create workbook
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(filteredData);
    xlsx.utils.book_append_sheet(wb, ws, 'Timesheet');

    // Calculate summary
    let totalHours = 0;
    let totalMinutes = 0;
    filteredData.forEach(entry => {
      totalHours += parseInt(entry.Hours) || 0;
      totalMinutes += parseInt(entry.Minutes) || 0;
    });
    totalHours += Math.floor(totalMinutes / 60);
    totalMinutes = totalMinutes % 60;
    const totalDays = (totalHours + totalMinutes / 60) / 8;

    // Add summary
    const summaryData = [
      { Metric: 'Total Hours', Value: `${totalHours}h ${totalMinutes}m` },
      { Metric: 'Total Days (8h/day)', Value: totalDays.toFixed(2) },
      { Metric: 'Total Entries', Value: filteredData.length }
    ];
    const summaryWs = xlsx.utils.json_to_sheet(summaryData);
    xlsx.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Write to buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', `attachment; filename=timesheet-${year}-${month}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React app - must be last route
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
