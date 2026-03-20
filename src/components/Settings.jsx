import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Plus, Pencil, Trash2, User, Building2, Briefcase, FolderOpen, ListTodo } from 'lucide-react'

function Settings({ onNavigate }) {
  const [settings, setSettings] = useState({
    Name: '',
    Department: '',
    Position: ''
  })
  
  const [presets, setPresets] = useState({
    features: [],
    activities: []
  })
  
  const [newFeature, setNewFeature] = useState('')
  const [newActivity, setNewActivity] = useState('')
  const [editingFeature, setEditingFeature] = useState(null)
  const [editingActivity, setEditingActivity] = useState(null)
  const [editFeatureValue, setEditFeatureValue] = useState('')
  const [editActivityValue, setEditActivityValue] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchSettings()
    fetchPresets()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setSettings({
        Name: data.Name || '',
        Department: data.Department || '',
        Position: data.Position || ''
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
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

  const saveSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (res.ok) {
        showMessage('บันทึกข้อมูลสำเร็จ!', 'success')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      showMessage('เกิดข้อผิดพลาด', 'error')
    }
  }

  const savePresets = async (newPresets) => {
    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPresets)
      })
      
      if (res.ok) {
        setPresets(newPresets)
      }
    } catch (error) {
      console.error('Error saving presets:', error)
    }
  }

  const addFeature = () => {
    if (!newFeature.trim()) return
    const updated = {
      ...presets,
      features: [...presets.features, newFeature.trim()]
    }
    savePresets(updated)
    setNewFeature('')
  }

  const addActivity = () => {
    if (!newActivity.trim()) return
    const updated = {
      ...presets,
      activities: [...presets.activities, newActivity.trim()]
    }
    savePresets(updated)
    setNewActivity('')
  }

  const deleteFeature = (index) => {
    const updated = {
      ...presets,
      features: presets.features.filter((_, i) => i !== index)
    }
    savePresets(updated)
  }

  const deleteActivity = (index) => {
    const updated = {
      ...presets,
      activities: presets.activities.filter((_, i) => i !== index)
    }
    savePresets(updated)
  }

  const startEditFeature = (index, value) => {
    setEditingFeature(index)
    setEditFeatureValue(value)
  }

  const startEditActivity = (index, value) => {
    setEditingActivity(index)
    setEditActivityValue(value)
  }

  const saveEditFeature = () => {
    if (!editFeatureValue.trim()) return
    const updated = {
      ...presets,
      features: presets.features.map((f, i) => i === editingFeature ? editFeatureValue.trim() : f)
    }
    savePresets(updated)
    setEditingFeature(null)
    setEditFeatureValue('')
  }

  const saveEditActivity = () => {
    if (!editActivityValue.trim()) return
    const updated = {
      ...presets,
      activities: presets.activities.map((a, i) => i === editingActivity ? editActivityValue.trim() : a)
    }
    savePresets(updated)
    setEditingActivity(null)
    setEditActivityValue('')
  }

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
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
            <h1 className="page-title">ตั้งค่า</h1>
            <p className="page-subtitle">จัดการข้อมูลส่วนตัวและ presets</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Personal Info */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-gray-800">
          <User className="w-5 h-5 text-blue-600" />
          ข้อมูลส่วนตัว
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              ชื่อ
            </label>
            <input
              type="text"
              value={settings.Name}
              onChange={(e) => setSettings({...settings, Name: e.target.value})}
              className="input-field"
              placeholder="ชื่อ-นามสกุล"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              แผนก
            </label>
            <input
              type="text"
              value={settings.Department}
              onChange={(e) => setSettings({...settings, Department: e.target.value})}
              className="input-field"
              placeholder="แผนก/ฝ่าย"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              ตำแหน่ง
            </label>
            <input
              type="text"
              value={settings.Position}
              onChange={(e) => setSettings({...settings, Position: e.target.value})}
              className="input-field"
              placeholder="ตำแหน่งงาน"
            />
          </div>
        </div>

        <button
          onClick={saveSettings}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          บันทึกข้อมูลส่วนตัว
        </button>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Features */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
            <FolderOpen className="w-5 h-5 text-purple-600" />
            Feature Presets
          </h2>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addFeature()}
              className="input-field flex-1"
              placeholder="เพิ่ม Feature ใหม่..."
            />
            <button
              onClick={addFeature}
              className="btn-primary p-2"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {presets.features.length === 0 ? (
              <p className="text-gray-400 text-center py-4">ยังไม่มี Feature</p>
            ) : (
              presets.features.map((feature, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  {editingFeature === index ? (
                    <>
                      <input
                        type="text"
                        value={editFeatureValue}
                        onChange={(e) => setEditFeatureValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveEditFeature()}
                        className="input-field flex-1 mr-2"
                        autoFocus
                      />
                      <button
                        onClick={saveEditFeature}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{feature}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditFeature(index, feature)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteFeature(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activities */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
            <ListTodo className="w-5 h-5 text-green-600" />
            Activity Presets
          </h2>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newActivity}
              onChange={(e) => setNewActivity(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addActivity()}
              className="input-field flex-1"
              placeholder="เพิ่ม Activity ใหม่..."
            />
            <button
              onClick={addActivity}
              className="btn-primary p-2"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {presets.activities.length === 0 ? (
              <p className="text-gray-400 text-center py-4">ยังไม่มี Activity</p>
            ) : (
              presets.activities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  {editingActivity === index ? (
                    <>
                      <input
                        type="text"
                        value={editActivityValue}
                        onChange={(e) => setEditActivityValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveEditActivity()}
                        className="input-field flex-1 mr-2"
                        autoFocus
                      />
                      <button
                        onClick={saveEditActivity}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{activity}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditActivity(index, activity)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteActivity(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
