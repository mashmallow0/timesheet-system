const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const xlsx = require('xlsx');
const lockfile = require('proper-lockfile');
const { body, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

// Rate limiting - prevent brute force and abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('dist'));
app.use('/api/', apiLimiter); // Apply rate limiting to all API routes

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
    fs.writeFileSync(TIMESHEET_FILE, 'Id,Date,Feature,Activity,Hours,Minutes,Note\n');
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, 'Name,Department,Position\n,,\n');
  }
  if (!fs.existsSync(PRESETS_FILE)) {
    fs.writeFileSync(PRESETS_FILE, JSON.stringify({ features: [], activities: [] }, null, 2));
  }
}

initFiles();

// Validation middleware helper
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// File locking helpers
async function withFileLock(filePath, operation) {
  const lockPath = `${filePath}.lock`;
  const release = await lockfile.lock(filePath, {
    lockfilePath: lockPath,
    stale: 5000, // Lock is stale after 5 seconds
    updateInterval: 1000, // Update lock every 1 second
    retries: {
      retries: 10,
      factor: 2,
      minTimeout: 100,
      maxTimeout: 1000
    }
  });
  
  try {
    return await operation();
  } finally {
    await release();
  }
}

// Read timesheet data with file locking
function readTimesheet() {
  return withFileLock(TIMESHEET_FILE, () => {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(TIMESHEET_FILE)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  });
}

// Write timesheet data with file locking
async function writeTimesheet(data) {
  return withFileLock(TIMESHEET_FILE, async () => {
    const csvWriter = createCsvWriter({
      path: TIMESHEET_FILE,
      header: [
        { id: 'Id', title: 'Id' },
        { id: 'Date', title: 'Date' },
        { id: 'Feature', title: 'Feature' },
        { id: 'Activity', title: 'Activity' },
        { id: 'Hours', title: 'Hours' },
        { id: 'Minutes', title: 'Minutes' },
        { id: 'Note', title: 'Note' }
      ]
    });
    await csvWriter.writeRecords(data);
  });
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

// Input sanitization helper
function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength).replace(/[\x00-\x1F\x7F]/g, '');
}

// ==================== API Routes ====================

// Get all timesheet entries
app.get('/api/timesheet', async (req, res) => {
  try {
    const data = await readTimesheet();
    res.json(data);
  } catch (error) {
    console.error('Error reading timesheet:', error);
    res.status(500).json({ error: 'Failed to read timesheet data' });
  }
});

// Add new entry with validation
app.post('/api/timesheet', [
  body('Date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),
  body('Feature')
    .notEmpty().withMessage('Feature is required')
    .isLength({ min: 1, max: 100 }).withMessage('Feature must be 1-100 characters'),
  body('Activity')
    .notEmpty().withMessage('Activity is required')
    .isLength({ min: 1, max: 100 }).withMessage('Activity must be 1-100 characters'),
  body('Hours')
    .notEmpty().withMessage('Hours is required')
    .isInt({ min: 0, max: 23 }).withMessage('Hours must be 0-23'),
  body('Minutes')
    .optional()
    .isInt({ min: 0, max: 59 }).withMessage('Minutes must be 0-59'),
  body('Note')
    .optional()
    .isLength({ max: 500 }).withMessage('Note must not exceed 500 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const entries = await readTimesheet();
    
    const newEntry = {
      Id: uuidv4(),
      Date: sanitizeString(req.body.Date, 10),
      Feature: sanitizeString(req.body.Feature, 100),
      Activity: sanitizeString(req.body.Activity, 100),
      Hours: String(parseInt(req.body.Hours)),
      Minutes: String(parseInt(req.body.Minutes) || 0),
      Note: sanitizeString(req.body.Note || '', 500)
    };
    
    entries.push(newEntry);
    await writeTimesheet(entries);
    
    res.json({ success: true, entry: newEntry });
  } catch (error) {
    console.error('Error adding entry:', error);
    res.status(500).json({ error: 'Failed to add entry' });
  }
});

// Update entry with validation (UUID-based)
app.put('/api/timesheet/:id', [
  param('id')
    .notEmpty().withMessage('ID is required')
    .isUUID().withMessage('Invalid ID format'),
  body('Date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),
  body('Feature')
    .notEmpty().withMessage('Feature is required')
    .isLength({ min: 1, max: 100 }).withMessage('Feature must be 1-100 characters'),
  body('Activity')
    .notEmpty().withMessage('Activity is required')
    .isLength({ min: 1, max: 100 }).withMessage('Activity must be 1-100 characters'),
  body('Hours')
    .notEmpty().withMessage('Hours is required')
    .isInt({ min: 0, max: 23 }).withMessage('Hours must be 0-23'),
  body('Minutes')
    .optional()
    .isInt({ min: 0, max: 59 }).withMessage('Minutes must be 0-59'),
  body('Note')
    .optional()
    .isLength({ max: 500 }).withMessage('Note must not exceed 500 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const entries = await readTimesheet();
    const id = req.params.id;
    
    const entryIndex = entries.findIndex(e => e.Id === id);
    
    if (entryIndex === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    entries[entryIndex] = {
      Id: id,
      Date: sanitizeString(req.body.Date, 10),
      Feature: sanitizeString(req.body.Feature, 100),
      Activity: sanitizeString(req.body.Activity, 100),
      Hours: String(parseInt(req.body.Hours)),
      Minutes: String(parseInt(req.body.Minutes) || 0),
      Note: sanitizeString(req.body.Note || '', 500)
    };
    
    await writeTimesheet(entries);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// Delete entry (UUID-based)
app.delete('/api/timesheet/:id', [
  param('id')
    .notEmpty().withMessage('ID is required')
    .isUUID().withMessage('Invalid ID format'),
  handleValidationErrors
], async (req, res) => {
  try {
    const entries = await readTimesheet();
    const id = req.params.id;
    
    const entryIndex = entries.findIndex(e => e.Id === id);
    
    if (entryIndex === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    entries.splice(entryIndex, 1);
    await writeTimesheet(entries);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const data = await readSettings();
    res.json(data);
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// Update settings with validation
app.post('/api/settings', [
  body('Name')
    .optional()
    .isLength({ max: 100 }).withMessage('Name must not exceed 100 characters'),
  body('Department')
    .optional()
    .isLength({ max: 100 }).withMessage('Department must not exceed 100 characters'),
  body('Position')
    .optional()
    .isLength({ max: 100 }).withMessage('Position must not exceed 100 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const sanitizedData = {
      Name: sanitizeString(req.body.Name || '', 100),
      Department: sanitizeString(req.body.Department || '', 100),
      Position: sanitizeString(req.body.Position || '', 100)
    };
    
    await writeSettings(sanitizedData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Get presets
app.get('/api/presets', (req, res) => {
  try {
    const data = readPresets();
    res.json(data);
  } catch (error) {
    console.error('Error reading presets:', error);
    res.status(500).json({ error: 'Failed to read presets' });
  }
});

// Update presets with validation
app.post('/api/presets', [
  body('features')
    .optional()
    .isArray({ max: 100 }).withMessage('Features array too large (max 100)'),
  body('features.*')
    .optional()
    .isLength({ max: 100 }).withMessage('Feature must not exceed 100 characters'),
  body('activities')
    .optional()
    .isArray({ max: 100 }).withMessage('Activities array too large (max 100)'),
  body('activities.*')
    .optional()
    .isLength({ max: 100 }).withMessage('Activity must not exceed 100 characters'),
  handleValidationErrors
], (req, res) => {
  try {
    const sanitizedData = {
      features: (req.body.features || [])
        .map(f => sanitizeString(f, 100))
        .filter(f => f.length > 0)
        .slice(0, 100),
      activities: (req.body.activities || [])
        .map(a => sanitizeString(a, 100))
        .filter(a => a.length > 0)
        .slice(0, 100)
    };
    
    writePresets(sanitizedData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving presets:', error);
    res.status(500).json({ error: 'Failed to save presets' });
  }
});

// Export to Excel with validation
app.get('/api/export/:year/:month', [
  param('year')
    .isInt({ min: 2000, max: 2100 }).withMessage('Year must be 2000-2100'),
  param('month')
    .isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12'),
  handleValidationErrors
], async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    const allData = await readTimesheet();
    
    // Filter by month/year
    const filteredData = allData.filter(entry => {
      if (!entry.Date) return false;
      const entryDate = new Date(entry.Date);
      return entryDate.getFullYear() === year && (entryDate.getMonth() + 1) === month;
    });

    // Create workbook
    const wb = xlsx.utils.book_new();
    
    // Format data for export (remove Id field from display)
    const exportData = filteredData.map(({ Id, ...rest }) => rest);
    const ws = xlsx.utils.json_to_sheet(exportData);
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
    
    res.setHeader('Content-Disposition', `attachment; filename=timesheet-${year}-${String(month).padStart(2, '0')}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app - must be last route
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Security features enabled: file locking, input validation, rate limiting, UUID-based CRUD`);
});
