import { useState, useEffect } from 'react'
import { ArrowLeft, Download, FileSpreadsheet, Calendar, Eye, Loader2 } from 'lucide-react'
import DOMPurify from 'dompurify'

// XSS Sanitization helper
function sanitizeHTML(dirty) {
  if (typeof dirty !== 'string') return ''
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

function Export({ onNavigate }) {
  const [entries, setEntries] = useState([])
  const [filteredEntries, setFilteredEntries] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState({
    entries: false,
    download: false
  })
  const [error, setError] = useState(null)

  // Generate year options (current year - 2 to + 2)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  
  // Generate month options
  const months = [
    { value: '1', label: 'มกราคม' },
    { value: '2', label: 'กุมภาพันธ์' },
    { value: '3', label: 'มีนาคม' },
    { value: '4', label: 'เมษายน' },
    { value: '5', label: 'พฤษภาคม' },
    { value: '6', label: 'มิถุนายน' },
    { value: '7', label: 'กรกฎาคม' },
    { value: '8', label: 'สิงหาคม' },
    { value: '9', label: 'กันยายน' },
    { value: '10', label: 'ตุลาคม' },
    { value: '11', label: 'พฤศจิกายน' },
    { value: '12', label: 'ธันวาคม' }
  ]

  useEffect(() => {
    fetchEntries()
    // Set default to current month/year
    const now = new Date()
    setSelectedMonth(String(now.getMonth() + 1))
    setSelectedYear(String(now.getFullYear()))
  }, [])

  useEffect(() => {
    filterEntries()
  }, [entries, selectedMonth, selectedYear])

  const fetchEntries = async () => {
    setLoading(prev => ({ ...prev, entries: true }))
    setError(null)
    try {
      const res = await fetch('/api/timesheet')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch entries')
      }
      const data = await res.json()
      setEntries(data)
    } catch (error) {
      console.error('Error fetching entries:', error)
      setError('โหลดข้อมูลไม่สำเร็จ: ' + error.message)
    } finally {
      setLoading(prev => ({ ...prev, entries: false }))
    }
  }

  const filterEntries = () => {
    if (!selectedMonth || !selectedYear) {
      setFilteredEntries([])
      return
    }

    const filtered = entries.filter(entry => {
      if (!entry.Date) return false
      const entryDate = new Date(entry.Date)
      return entryDate.getFullYear() == selectedYear && (entryDate.getMonth() + 1) == selectedMonth
    })
    
    setFilteredEntries(filtered)
  }

  const handleDownload = async () => {
    if (!selectedMonth || !selectedYear) {
      showMessage('กรุณาเลือกเดือนและปี', 'error')
      return
    }

    setLoading(prev => ({ ...prev, download: true }))
    setError(null)
    
    try {
      const res = await fetch(`/api/export/${selectedYear}/${selectedMonth}`)
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Export failed')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timesheet-${selectedYear}-${selectedMonth.padStart(2, '0')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      showMessage('ดาวน์โหลดสำเร็จ!', 'success')
    } catch (error) {
      console.error('Error downloading:', error)
      setError('ดาวน์โหลดไม่สำเร็จ: ' + error.message)
      showMessage('เกิดข้อผิดพลาดในการดาวน์โหลด', 'error')
    } finally {
      setLoading(prev => ({ ...prev, download: false }))
    }
  }

  // Calculate summary for preview
  const totalHours = filteredEntries.reduce((sum, e) => sum + (parseInt(e.Hours) || 0), 0)
  const totalMinutes = filteredEntries.reduce((sum, e) => sum + (parseInt(e.Minutes) || 0), 0)
  const totalHoursAdjusted = totalHours + Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60
  const totalDays = (totalHoursAdjusted + remainingMinutes / 60) / 8

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
          <span className="font-medium">⚠️ {error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="page-title">Export Excel</h1>
            <p className="page-subtitle">ส่งออกข้อมูลเป็นไฟล์ Excel</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-gray-800">
          <Calendar className="w-5 h-5 text-blue-600" />
          เลือกช่วงเวลา
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">เดือน</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input-field"
              disabled={loading.entries}
            >
              <option value="">เลือกเดือน</option>
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ปี</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input-field"
              disabled={loading.entries}
            >
              <option value="">เลือกปี</option>
              {years.map(y => (
                <option key={y} value={y}>{String(y + 543)} (พ.ศ.)</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDownload}
            disabled={!selectedMonth || !selectedYear || loading.download || loading.entries}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading.download ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            ดาวน์โหลด Excel
          </button>
        </div>
      </div>

      {/* Preview */}
      {selectedMonth && selectedYear && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
              <Eye className="w-5 h-5 text-green-600" />
              ตัวอย่างข้อมูล
            </h2>
            <div className="flex gap-4 text-sm">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                รวม: {loading.entries ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : (
                  `${totalHoursAdjusted}h ${remainingMinutes}m`
                )}
              </span>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                {loading.entries ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : (
                  `${totalDays.toFixed(2)} วัน`
                )}
              </span>
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                {loading.entries ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : (
                  `${filteredEntries.length} รายการ`
                )}
              </span>
            </div>
          </div>

          {loading.entries ? (
            <div className="text-center py-12 text-gray-400">
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-500" />
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>ไม่มีข้อมูลในเดือนที่เลือก</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">วันที่</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Feature</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Activity</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">เวลา</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, index) => (
                    <tr key={entry.Id || index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{sanitizeHTML(entry.Date)}</td>
                      <td className="py-3 px-4">{sanitizeHTML(entry.Feature)}</td>
                      <td className="py-3 px-4">{sanitizeHTML(entry.Activity)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                          {sanitizeHTML(entry.Hours)}h {sanitizeHTML(entry.Minutes)}m
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{entry.Note ? sanitizeHTML(entry.Note) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Export
