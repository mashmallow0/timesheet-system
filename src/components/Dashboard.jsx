import { useState, useEffect } from 'react'
import { Settings, Download, Plus, Pencil, Trash2, Clock, Calendar, Briefcase, Loader2 } from 'lucide-react'
import DOMPurify from 'dompurify'

// XSS Sanitization helper
function sanitizeHTML(dirty) {
  if (typeof dirty !== 'string') return ''
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

function Dashboard({ onNavigate }) {
  const [entries, setEntries] = useState([])
  const [presets, setPresets] = useState({ features: [], activities: [] })
  const [settings, setSettings] = useState({ Name: '', Department: '', Position: '' })
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState({
    entries: false,
    save: false,
    delete: null // stores id being deleted
  })
  const [error, setError] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    Date: new Date().toISOString().split('T')[0],
    Feature: '',
    Activity: '',
    Hours: '',
    Minutes: '',
    Note: ''
  })

  // Fetch data
  useEffect(() => {
    fetchEntries()
    fetchPresets()
    fetchSettings()
  }, [])

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
      setError('ไม่สามารถโหลดข้อมูลได้: ' + error.message)
    } finally {
      setLoading(prev => ({ ...prev, entries: false }))
    }
  }

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/presets')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch presets')
      }
      const data = await res.json()
      setPresets(data)
    } catch (error) {
      console.error('Error fetching presets:', error)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch settings')
      }
      const data = await res.json()
      setSettings(data)
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  // Calculate totals
  const totalHours = entries.reduce((sum, e) => sum + (parseInt(e.Hours) || 0), 0)
  const totalMinutes = entries.reduce((sum, e) => sum + (parseInt(e.Minutes) || 0), 0)
  const totalHoursAdjusted = totalHours + Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60
  const totalDays = (totalHoursAdjusted + remainingMinutes / 60) / 8

  const validateForm = () => {
    const errors = []
    
    if (!formData.Date) errors.push('กรุณาระบุวันที่')
    if (!formData.Feature) errors.push('กรุณาเลือก Feature')
    if (!formData.Activity) errors.push('กรุณาเลือก Activity')
    
    const hours = parseInt(formData.Hours)
    if (isNaN(hours) || hours < 0 || hours > 23) errors.push('ชั่วโมงต้องอยู่ระหว่าง 0-23')
    
    const minutes = parseInt(formData.Minutes) || 0
    if (minutes < 0 || minutes > 59) errors.push('นาทีต้องอยู่ระหว่าง 0-59')
    
    if (errors.length > 0) {
      alert(errors.join('\n'))
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(prev => ({ ...prev, save: true }))
    setError(null)
    
    const url = editingId !== null 
      ? `/api/timesheet/${editingId}` 
      : '/api/timesheet'
    
    const method = editingId !== null ? 'PUT' : 'POST'
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || data.details?.map(d => d.message).join(', ') || 'Failed to save')
      }
      
      resetForm()
      await fetchEntries()
      setShowForm(false)
      setEditingId(null)
    } catch (error) {
      console.error('Error saving entry:', error)
      setError('บันทึกไม่สำเร็จ: ' + error.message)
    } finally {
      setLoading(prev => ({ ...prev, save: false }))
    }
  }

  const handleEdit = (entry) => {
    setFormData({
      Date: entry.Date,
      Feature: entry.Feature,
      Activity: entry.Activity,
      Hours: entry.Hours,
      Minutes: entry.Minutes,
      Note: entry.Note || ''
    })
    setEditingId(entry.Id)
    setShowForm(true)
    setError(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('ยืนยันการลบรายการนี้?')) return
    
    setLoading(prev => ({ ...prev, delete: id }))
    setError(null)
    
    try {
      const res = await fetch(`/api/timesheet/${id}`, { method: 'DELETE' })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete')
      }
      
      await fetchEntries()
    } catch (error) {
      console.error('Error deleting entry:', error)
      setError('ลบไม่สำเร็จ: ' + error.message)
    } finally {
      setLoading(prev => ({ ...prev, delete: null }))
    }
  }

  const resetForm = () => {
    setFormData({
      Date: new Date().toISOString().split('T')[0],
      Feature: '',
      Activity: '',
      Hours: '',
      Minutes: '',
      Note: ''
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
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
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Clock className="w-8 h-8 text-blue-600" />
            Timesheet System
          </h1>
          <p className="page-subtitle">
            {settings.Name ? `${sanitizeHTML(settings.Name)} - ${sanitizeHTML(settings.Department || 'No Department')}` : 'ยังไม่ได้ตั้งค่าข้อมูลส่วนตัว'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('settings')}
            className="btn-secondary flex items-center gap-2"
            disabled={loading.entries}
          >
            <Settings className="w-4 h-4" />
            ตั้งค่า
          </button>
          <button
            onClick={() => onNavigate('export')}
            className="btn-secondary flex items-center gap-2"
            disabled={loading.entries}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">รวมชั่วโมง</p>
              <p className="text-3xl font-bold text-gray-800">
                {loading.entries ? (
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                ) : (
                  `${totalHoursAdjusted}h ${remainingMinutes}m`
                )}
              </p>
            </div>
            <Clock className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="card border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">รวมวัน (8 ชม./วัน)</p>
              <p className="text-3xl font-bold text-gray-800">
                {loading.entries ? (
                  <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                ) : (
                  `${totalDays.toFixed(2)} วัน`
                )}
              </p>
            </div>
            <Calendar className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="card border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">จำนวนรายการ</p>
              <p className="text-3xl font-bold text-gray-800">
                {loading.entries ? (
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                ) : (
                  `${entries.length} รายการ`
                )}
              </p>
            </div>
            <Briefcase className="w-10 h-10 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Add Entry Button */}
      <div className="mb-6">
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (showForm) {
              resetForm()
              setEditingId(null)
            }
            setError(null)
          }}
          className="btn-primary flex items-center gap-2"
          disabled={loading.save}
        >
          {loading.save ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {showForm ? 'ยกเลิก' : 'ลงเวลาใหม่'}
        </button>
      </div>

      {/* Entry Form */}
      {showForm && (
        <div className="card mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            {editingId !== null ? 'แก้ไขรายการ' : 'ลงเวลาใหม่'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ *</label>
                <input
                  type="date"
                  required
                  value={formData.Date}
                  onChange={(e) => setFormData({...formData, Date: e.target.value})}
                  className="input-field"
                  disabled={loading.save}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feature *</label>
                <select
                  required
                  value={formData.Feature}
                  onChange={(e) => setFormData({...formData, Feature: e.target.value})}
                  className="input-field"
                  disabled={loading.save}
                >
                  <option value="">เลือก Feature</option>
                  {presets.features.map((f, i) => (
                    <option key={i} value={f}>{sanitizeHTML(f)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity *</label>
                <select
                  required
                  value={formData.Activity}
                  onChange={(e) => setFormData({...formData, Activity: e.target.value})}
                  className="input-field"
                  disabled={loading.save}
                >
                  <option value="">เลือก Activity</option>
                  {presets.activities.map((a, i) => (
                    <option key={i} value={a}>{sanitizeHTML(a)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชั่วโมง (0-23)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={formData.Hours}
                    onChange={(e) => setFormData({...formData, Hours: e.target.value})}
                    className="input-field"
                    placeholder="0"
                    disabled={loading.save}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">นาที (0-59)</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={formData.Minutes}
                    onChange={(e) => setFormData({...formData, Minutes: e.target.value})}
                    className="input-field"
                    placeholder="0"
                    disabled={loading.save}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  value={formData.Note}
                  onChange={(e) => setFormData({...formData, Note: e.target.value})}
                  className="input-field"
                  placeholder="รายละเอียดเพิ่มเติม..."
                  maxLength={500}
                  disabled={loading.save}
                />
                <p className="text-xs text-gray-500 mt-1">{formData.Note.length}/500 ตัวอักษร</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="submit" 
                className="btn-primary flex items-center gap-2"
                disabled={loading.save}
              >
                {loading.save && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId !== null ? 'บันทึกการแก้ไข' : 'บันทึก'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setEditingId(null)
                  setShowForm(false)
                  setError(null)
                }}
                className="btn-secondary"
                disabled={loading.save}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Entries Table */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">รายการทั้งหมด</h3>
        
        {loading.entries ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-500" />
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>ยังไม่มีรายการ</p>
            <p className="text-sm">กด "ลงเวลาใหม่" เพื่อเริ่มบันทึก</p>
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
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.Id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{sanitizeHTML(entry.Date)}</td>
                    <td className="py-3 px-4">{sanitizeHTML(entry.Feature)}</td>
                    <td className="py-3 px-4">{sanitizeHTML(entry.Activity)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                        {sanitizeHTML(entry.Hours)}h {sanitizeHTML(entry.Minutes)}m
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{entry.Note ? sanitizeHTML(entry.Note) : '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="แก้ไข"
                          disabled={loading.delete === entry.Id || loading.save}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.Id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="ลบ"
                          disabled={loading.delete === entry.Id || loading.save}
                        >
                          {loading.delete === entry.Id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
