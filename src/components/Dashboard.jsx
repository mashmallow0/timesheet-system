import { useState, useEffect } from 'react'
import { Settings, Download, Plus, Pencil, Trash2, Clock, Calendar, Briefcase } from 'lucide-react'

function Dashboard({ onNavigate }) {
  const [entries, setEntries] = useState([])
  const [presets, setPresets] = useState({ features: [], activities: [] })
  const [settings, setSettings] = useState({ Name: '', Department: '', Position: '' })
  const [editingIndex, setEditingIndex] = useState(null)
  const [showForm, setShowForm] = useState(false)
  
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
    try {
      const res = await fetch('/api/timesheet')
      const data = await res.json()
      setEntries(data)
    } catch (error) {
      console.error('Error fetching entries:', error)
    }
  }

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/presets')
      const data = await res.json()
      setPresets(data)
    } catch (error) {
      console.error('Error fetching presets:', error)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const url = editingIndex !== null 
      ? `/api/timesheet/${editingIndex}` 
      : '/api/timesheet'
    
    const method = editingIndex !== null ? 'PUT' : 'POST'
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (res.ok) {
        resetForm()
        fetchEntries()
        setShowForm(false)
        setEditingIndex(null)
      }
    } catch (error) {
      console.error('Error saving entry:', error)
    }
  }

  const handleEdit = (index) => {
    const entry = entries[index]
    setFormData({
      Date: entry.Date,
      Feature: entry.Feature,
      Activity: entry.Activity,
      Hours: entry.Hours,
      Minutes: entry.Minutes,
      Note: entry.Note || ''
    })
    setEditingIndex(index)
    setShowForm(true)
  }

  const handleDelete = async (index) => {
    if (!confirm('ยืนยันการลบรายการนี้?')) return
    
    try {
      const res = await fetch(`/api/timesheet/${index}`, { method: 'DELETE' })
      if (res.ok) {
        fetchEntries()
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Clock className="w-8 h-8 text-blue-600" />
            Timesheet System
          </h1>
          <p className="page-subtitle">
            {settings.Name ? `${settings.Name} - ${settings.Department || 'No Department'}` : 'ยังไม่ได้ตั้งค่าข้อมูลส่วนตัว'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('settings')}
            className="btn-secondary flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            ตั้งค่า
          </button>
          <button
            onClick={() => onNavigate('export')}
            className="btn-secondary flex items-center gap-2"
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
              <p className="text-3xl font-bold text-gray-800">{totalHoursAdjusted}h {remainingMinutes}m</p>
            </div>
            <Clock className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="card border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">รวมวัน (8 ชม./วัน)</p>
              <p className="text-3xl font-bold text-gray-800">{totalDays.toFixed(2)} วัน</p>
            </div>
            <Calendar className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="card border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">จำนวนรายการ</p>
              <p className="text-3xl font-bold text-gray-800">{entries.length} รายการ</p>
            </div>
            <Briefcase className="w-10 h-10 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Add Entry Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'ยกเลิก' : 'ลงเวลาใหม่'}
        </button>
      </div>

      {/* Entry Form */}
      {showForm && (
        <div className="card mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            {editingIndex !== null ? 'แก้ไขรายการ' : 'ลงเวลาใหม่'}
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feature *</label>
                <select
                  required
                  value={formData.Feature}
                  onChange={(e) => setFormData({...formData, Feature: e.target.value})}
                  className="input-field"
                >
                  <option value="">เลือก Feature</option>
                  {presets.features.map((f, i) => (
                    <option key={i} value={f}>{f}</option>
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
                >
                  <option value="">เลือก Activity</option>
                  {presets.activities.map((a, i) => (
                    <option key={i} value={a}>{a}</option>
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
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary">
                {editingIndex !== null ? 'บันทึกการแก้ไข' : 'บันทึก'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setEditingIndex(null)
                  setShowForm(false)
                }}
                className="btn-secondary"
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
        
        {entries.length === 0 ? (
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
                {entries.map((entry, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{entry.Date}</td>
                    <td className="py-3 px-4">{entry.Feature}</td>
                    <td className="py-3 px-4">{entry.Activity}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                        {entry.Hours}h {entry.Minutes}m
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{entry.Note || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(index)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="แก้ไข"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
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
