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
            <button
              onClick={() => navigate('/sm2-demo')}
              className="px-4 py-2 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded transition"
            >
              SM-2 Demo
            </button>
            <button
              onClick={() => navigate('/scheduler-demo')}
              className="px-4 py-2 text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 rounded transition"
            >
              Scheduler Demo
            </button>
            <button
              onClick={() => navigate('/content-demo')}
              className="px-4 py-2 text-sm bg-orange-50 text-orange-700 hover:bg-orange-100 rounded transition"
            >
              Content Demo
            </button>
            <button
              onClick={() => navigate('/pipeline-demo')}
              className="px-4 py-2 text-sm bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 hover:from-purple-100 hover:to-pink-100 rounded font-semibold transition"
            >
              🔄 Full Pipeline
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
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white rounded-2xl p-8 mb-8 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-200 text-sm font-semibold mb-1">ADAPTIVE LEARNING SYSTEM</p>
              <h1 className="text-4xl font-bold mb-3">Intelligent Study Reminders</h1>
              <p className="text-blue-100 max-w-3xl text-lg">
                A complete pipeline that adapts to your emotional state, learning progress, memory patterns, and current readiness to deliver personalized study interventions at the perfect moment.
              </p>
            </div>
            <div className="text-5xl">🧠📚💡</div>
          </div>
        </div>

        {/* System Pipeline */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works: 4-Model Pipeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Model 1 */}
            <div className="bg-white rounded-xl shadow-md border-t-4 border-blue-500 p-6 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl mb-4">😊</div>
              <h3 className="font-bold text-gray-900 mb-2">Model 1: Readiness</h3>
              <p className="text-sm text-gray-600 mb-4">
                Analyzes emotion and time of day to classify student readiness as HIGH, MEDIUM, or LOW.
              </p>
              <button
                onClick={() => navigate('/readiness-lab')}
                className="w-full px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition"
              >
                Try Model 1 →
              </button>
            </div>

            {/* Arrow 1 */}
            <div className="flex items-center justify-center">
              <div className="text-3xl text-gray-400 hidden md:block">→</div>
            </div>

            {/* Model 2 */}
            <div className="bg-white rounded-xl shadow-md border-t-4 border-green-500 p-6 hover:shadow-lg transition md:col-span-1 col-span-2">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl mb-4">🧠</div>
              <h3 className="font-bold text-gray-900 mb-2">Model 2: SM-2 Memory</h3>
              <p className="text-sm text-gray-600 mb-4">
                Extended SM-2 algorithm predicts retention probability and calculates optimal review intervals.
              </p>
              <button
                onClick={() => navigate('/sm2-demo')}
                className="w-full px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition"
              >
                Try Model 2 →
              </button>
            </div>

            {/* Arrow 2 */}
            <div className="flex items-center justify-center md:col-span-1 col-span-2">
              <div className="text-3xl text-gray-400 hidden md:block">→</div>
            </div>

            {/* Model 3 */}
            <div className="bg-white rounded-xl shadow-md border-t-4 border-purple-500 p-6 hover:shadow-lg transition md:col-span-1 col-span-2">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl mb-4">⏰</div>
              <h3 className="font-bold text-gray-900 mb-2">Model 3: Scheduler</h3>
              <p className="text-sm text-gray-600 mb-4">
                Decides whether to SEND NOW, DELAY, or SKIP reminders based on readiness, retention, and priority.
              </p>
              <button
                onClick={() => navigate('/scheduler-demo')}
                className="w-full px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-sm font-medium transition"
              >
                Try Model 3 →
              </button>
            </div>

            {/* Arrow 3 */}
            <div className="flex items-center justify-center md:col-span-1 col-span-2">
              <div className="text-3xl text-gray-400 hidden md:block">→</div>
            </div>

            {/* Model 4 */}
            <div className="bg-white rounded-xl shadow-md border-t-4 border-orange-500 p-6 hover:shadow-lg transition md:col-span-1 col-span-2">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl mb-4">🧩</div>
              <h3 className="font-bold text-gray-900 mb-2">Model 4: Content</h3>
              <p className="text-sm text-gray-600 mb-4">
                Recommends the best activity type: Active Recall, Guided Review, Passive Reading, or Break.
              </p>
              <button
                onClick={() => navigate('/content-demo')}
                className="w-full px-3 py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-sm font-medium transition"
              >
                Try Model 4 →
              </button>
            </div>
          </div>
        </div>

        {/* System Flow Explanation */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 mb-8 border border-blue-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">End-to-End System Flow</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
              <div>
                <h4 className="font-semibold text-gray-900">Detect Emotional State</h4>
                <p className="text-sm text-gray-700 mt-1">
                  User inputs their emotion (focused, motivated, anxious, tired, etc.) and current time. Model 1 predicts if they're mentally ready for study reminders.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
              <div>
                <h4 className="font-semibold text-gray-900">Assess Memory Decay</h4>
                <p className="text-sm text-gray-700 mt-1">
                  Model 2 analyzes past quiz scores and study history using SM-2 algorithm. It calculates how likely the student is to remember this content today, and what priority to assign.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
              <div>
                <h4 className="font-semibold text-gray-900">Make Scheduling Decision</h4>
                <p className="text-sm text-gray-700 mt-1">
                  Model 3 combines all signals: student readiness (emotional), memory at-risk (SM-2), and item urgency (priority). It decides the optimal action: SEND NOW (if all good), DELAY (wait for better conditions), or SKIP (avoid overload).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">4</div>
              <div>
                <h4 className="font-semibold text-gray-900">Personalize Content Type</h4>
                <p className="text-sm text-gray-700 mt-1">
                  Model 4 decides HOW to deliver the reminder. For high-readiness learners, use Active Recall quizzes. For struggling learners, use Guided Review. For low energy, suggest a Break.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">✅</span>
              Scientifically Grounded
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Uses Ebbinghaus forgetting curve for memory decay</li>
              <li>• Implements SM-2 spaced repetition algorithm</li>
              <li>• Accounts for emotional state and cognitive load</li>
              <li>• Rule-based scheduling logic (explainable AI)</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Adaptive Personalization
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• No one-size-fits-all reminders</li>
              <li>• Respects student energy levels</li>
              <li>• Adjusts difficulty based on retention risk</li>
              <li>• Prevents cognitive overload (avoids over-prompting)</li>
            </ul>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Recent Reminders</h2>
          {reminders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-3">No reminders recorded yet.</p>
              <p className="text-sm text-gray-500">
                Once you activate study sessions, the system will begin logging reminders and decisions here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.slice(0, 5).map((reminder) => (
                <div key={reminder.reminder_id} className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{reminder.item_title}</p>
                      <p className="text-sm text-gray-600">
                        {reminder.content_type} · {reminder.readiness_tier} · {reminder.bandit_action}
                      </p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {reminder.bandit_action}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
