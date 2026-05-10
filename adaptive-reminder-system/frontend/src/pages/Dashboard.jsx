import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1'

export default function DashboardPage({ onLogout }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    const token = localStorage.getItem('access_token')

    if (userData) {
      setUser(JSON.parse(userData))
    }

    const loadReminders = async () => {
      try {
        if (!token) {
          setReminders([])
          setLoading(false)
          return
        }

        const response = await axios.get(`${API_BASE}/reminders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        setReminders(response.data.reminders || [])
      } catch {
        setReminders([])
      } finally {
        setLoading(false)
      }
    }

    loadReminders()
  }, [])

  const handleLogout = () => {
    onLogout()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              ARS
            </div>
            <span className="font-semibold text-gray-900 hidden sm:inline">
              Adaptive Study Reminder
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/readiness-lab')}
              className="px-4 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition"
            >
              Readiness Lab
            </button>
            <span className="text-sm text-gray-600">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-8 mb-6">
          <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
          <p className="text-blue-100">Your study dashboard is ready</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Items to Review</p>
            <p className="text-3xl font-bold text-gray-900">{reminders.length}</p>
            <p className="text-xs text-gray-500 mt-2">Today</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Study Streak</p>
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500 mt-2">Days</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Retention Rate</p>
            <p className="text-3xl font-bold text-gray-900">0%</p>
            <p className="text-xs text-gray-500 mt-2">This week</p>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          {reminders.length === 0 ? (
            <p className="text-gray-600">
              No reminders yet. Your learning analytics will appear here once the backend starts sending study items.
            </p>
          ) : (
            <div className="space-y-3">
              {reminders.slice(0, 5).map((reminder) => (
                <div key={reminder.reminder_id} className="rounded-lg border border-gray-200 p-4">
                  <p className="font-semibold text-gray-900">{reminder.item_title}</p>
                  <p className="text-sm text-gray-600">
                    {reminder.content_type} · {reminder.readiness_tier} · {reminder.bandit_action}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
