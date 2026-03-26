const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const lockfile = require('proper-lockfile');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [] });
}

function convertDate(dateStr) {
  if (!dateStr) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return dateStr;
}

async function readCSV(filePath) {
  const release = await lockfile.lock(filePath, {
    retries: { retries: 10, factor: 2, minTimeout: 100, maxTimeout: 1000 }
  });
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const lines = data.trim().split('\n');
    if (lines.length <= 1) return [];
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = values[i] || '');
      return obj;
    });
  } finally { await release(); }
}

async function writeCSV(filePath, data, headers) {
  const release = await lockfile.lock(filePath, {
    retries: { retries: 10, factor: 2, minTimeout: 100, maxTimeout: 1000 }
  });
  try {
    const lines = [headers.join(',')];
    data.forEach(row => lines.push(headers.map(h => row[h] || '').join(',')));
    await fs.writeFile(filePath, lines.join('\n'));
  } finally { await release(); }
}

const validateTimesheet = [
  body('Date').custom(value => {
    if (!value) throw new Error('Date required');
    const converted = convertDate(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(converted)) throw new Error('Invalid date');
    return true;
  }),
  body('Feature').isLength({ min: 1, max: 100 }).trim(),
  body('Activity').isLength({ min: 1, max: 100 }).trim(),
  body('Hours').optional().isInt({ min: 0, max: 23 }),
  body('Minutes').optional().isInt({ min: 0, max: 59 })
];

app.get('/api/timesheet', async (req, res) => {
  try { res.json(await readCSV('./data/timesheet.csv')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/timesheet', validateTimesheet, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed' });
  try {
    const data = await readCSV('./data/timesheet.csv');
    const hours = req.body.Hours !== undefined && req.body.Hours !== '' ? parseInt(req.body.Hours) : 0;
    const minutes = req.body.Minutes !== undefined && req.body.Minutes !== '' ? parseInt(req.body.Minutes) : 0;
    const newEntry = {
      Id: uuidv4(),
      Date: convertDate(sanitizeString(req.body.Date)),
      Feature: sanitizeString(req.body.Feature),
      Activity: sanitizeString(req.body.Activity),
      Hours: String(hours),
      Minutes: String(minutes),
      Note: sanitizeString(req.body.Note || '')
    };
    data.push(newEntry);
    await writeCSV('./data/timesheet.csv', data, ['Id', 'Date', 'Feature', 'Activity', 'Hours', 'Minutes', 'Note']);
    res.json(newEntry);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/timesheet/:id', validateTimesheet, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed' });
  try {
    const data = await readCSV('./data/timesheet.csv');
    const index = data.findIndex(row => row.Id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    const hours = req.body.Hours !== undefined && req.body.Hours !== '' ? parseInt(req.body.Hours) : 0;
    const minutes = req.body.Minutes !== undefined && req.body.Minutes !== '' ? parseInt(req.body.Minutes) : 0;
    data[index] = { Id: req.params.id, Date: convertDate(sanitizeString(req.body.Date)), Feature: sanitizeString(req.body.Feature), Activity: sanitizeString(req.body.Activity), Hours: String(hours), Minutes: String(minutes), Note: sanitizeString(req.body.Note || '') };
    await writeCSV('./data/timesheet.csv', data, ['Id', 'Date', 'Feature', 'Activity', 'Hours', 'Minutes', 'Note']);
    res.json(data[index]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/timesheet/:id', async (req, res) => {
  try {
    const data = await readCSV('./data/timesheet.csv');
    const filtered = data.filter(row => row.Id !== req.params.id);
    if (filtered.length === data.length) return res.status(404).json({ error: 'Not found' });
    await writeCSV('./data/timesheet.csv', filtered, ['Id', 'Date', 'Feature', 'Activity', 'Hours', 'Minutes', 'Note']);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/settings', async (req, res) => {
  try { res.json(JSON.parse(await fs.readFile('./data/settings.json', 'utf8'))); }
  catch { res.json({ Name: '', Department: '', Position: '' }); }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settings = { Name: sanitizeString(req.body.Name || ''), Department: sanitizeString(req.body.Department || ''), Position: sanitizeString(req.body.Position || '') };
    await fs.writeFile('./data/settings.json', JSON.stringify(settings));
    res.json(settings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/presets', async (req, res) => {
  try { res.json(JSON.parse(await fs.readFile('./data/presets.json', 'utf8'))); }
  catch { res.json({ features: [], activities: [] }); }
});

app.post('/api/presets', async (req, res) => {
  try {
    const presets = { features: (req.body.features || []).map(f => sanitizeString(f)), activities: (req.body.activities || []).map(a => sanitizeString(a)) };
    await fs.writeFile('./data/presets.json', JSON.stringify(presets));
    res.json(presets);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/export/:year/:month', async (req, res) => {
  try {
    // Get settings
    let settings = { Name: '', Department: '', Position: '' };
    try {
      settings = JSON.parse(await fs.readFile('./data/settings.json', 'utf8'));
    } catch {}

    // Get data
    const data = await readCSV('./data/timesheet.csv');
    const filtered = data.filter(row => row.Date && row.Date.startsWith(`${req.params.year}-${req.params.month.padStart(2, '0')}`));

    // Month names in Thai
    const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 
                        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const monthName = monthNames[parseInt(req.params.month) - 1] || req.params.month;

    // Build CSV with header info OUTSIDE the table
    // Use 8 columns (matching the data table) for header rows so they span correctly
    let csvContent = '\ufeff'; // UTF-8 BOM
    csvContent += `Name,${settings.Name || ''},,,,,,\n`;
    csvContent += `Department,${settings.Department || ''},,,,,,\n`;
    csvContent += `Position,${settings.Position || ''},,,,,,\n`;
    csvContent += `Month,${monthName},,,,,,\n`;
    csvContent += `\n`; // Empty row
    csvContent += `Date,Feature,Activity,Day,Hours,Minutes,Note,Day\n`;

    // Add data rows
    filtered.forEach(row => {
      const hours = parseFloat(row.Hours) || 0;
      const minutes = parseFloat(row.Minutes) || 0;
      const totalHours = hours + (minutes / 60);
      const day = (totalHours / 8).toFixed(2);

      const values = [
        row.Date || '',
        row.Feature || '',
        row.Activity || '',
        day,
        row.Hours || '0',
        row.Minutes || '0',
        row.Note || '',
        day
      ];
      csvContent += values.map(v => {
        const str = String(v);
        return str.includes(',') || str.includes('"') ? '"' + str.replace(/"/g, '""') + '"' : str;
      }).join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="timesheet-${req.params.year}-${req.params.month.padStart(2, '0')}.csv"`);
    res.send(csvContent);
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

async function ensureDataDir() {
  try {
    await fs.mkdir('./data', { recursive: true });
    try { await fs.access('./data/timesheet.csv'); } catch { await fs.writeFile('./data/timesheet.csv', 'Id,Date,Feature,Activity,Hours,Minutes,Note\n'); }
    try { await fs.access('./data/settings.json'); } catch { await fs.writeFile('./data/settings.json', JSON.stringify({ Name: '', Department: '', Position: '' })); }
    try { await fs.access('./data/presets.json'); } catch { await fs.writeFile('./data/presets.json', JSON.stringify({ features: [], activities: [] })); }
  } catch (e) { console.error('Error:', e); }
}

app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

ensureDataDir().then(() => {
  app.listen(PORT, () => console.log(`Server on port ${PORT}`));
});
