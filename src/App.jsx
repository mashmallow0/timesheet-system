import { useState } from 'react'
import Dashboard from './components/Dashboard'
import Settings from './components/Settings'
import Export from './components/Export'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />
      case 'settings':
        return <Settings onNavigate={setCurrentPage} />
      case 'export':
        return <Export onNavigate={setCurrentPage} />
      default:
        return <Dashboard onNavigate={setCurrentPage} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {renderPage()}
    </div>
  )
}

export default App
