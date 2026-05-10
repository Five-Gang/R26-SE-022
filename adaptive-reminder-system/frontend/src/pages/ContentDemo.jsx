import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1'

export default function ContentDemo() {
  const navigate = useNavigate()
  const [readiness, setReadiness] = useState('HIGH')
  const [retention, setRetention] = useState(0.42)
  const [priority, setPriority] = useState(69)
  const [difficulty, setDifficulty] = useState('hard')
  const [output, setOutput] = useState(null)
  const [loading, setLoading] = useState(false)

  const handlePreset = (preset) => {
    if (preset === 'active_recall') {
      setReadiness('HIGH')
      setRetention(0.42)
      setPriority(69)
      setDifficulty('hard')
    } else if (preset === 'guided_review') {
      setReadiness('MEDIUM')
      setRetention(0.35)
      setPriority(45)
      setDifficulty('hard')
    } else if (preset === 'break_rest') {
      setReadiness('LOW')
      setRetention(0.6)
      setPriority(50)
      setDifficulty('medium')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        readiness_level: readiness,
        retention_probability: parseFloat(retention),
        priority_score: priority / 100,
        difficulty_level: difficulty,
      }
      const res = await axios.post(`${API_BASE}/content/recommend`, payload)
      setOutput(res.data)
    } catch (err) {
      setOutput({ error: err?.response?.data || String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      <nav className="bg-white shadow-md border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
              CNT
            </div>
            <div>
              <div className="font-semibold text-gray-900">Model 4</div>
              <div className="text-xs text-gray-500">Content Personalization</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg transition font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 text-white rounded-2xl p-8 mb-8 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-orange-200 text-sm font-semibold mb-1">LEARNING INTERVENTION</p>
              <h1 className="text-4xl font-bold mb-3">Reminder Content Personalization</h1>
              <p className="text-orange-100 max-w-2xl text-lg">
                Recommends the best activity type after scheduling by using readiness, retention risk, priority urgency, and topic difficulty.
              </p>
            </div>
            <div className="text-5xl">🧩📚</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Test Scenarios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => handlePreset('active_recall')}
              className="px-4 py-3 bg-green-100 hover:bg-green-200 border-2 border-green-300 text-green-800 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <span>⚡</span> Active Recall
            </button>
            <button
              onClick={() => handlePreset('guided_review')}
              className="px-4 py-3 bg-yellow-100 hover:bg-yellow-200 border-2 border-yellow-300 text-yellow-800 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <span>🧭</span> Guided Review
            </button>
            <button
              onClick={() => handlePreset('break_rest')}
              className="px-4 py-3 bg-blue-100 hover:bg-blue-200 border-2 border-blue-300 text-blue-800 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <span>🛌</span> Break / Rest
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recommend Study Activity</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Readiness Level</label>
                <select
                  value={readiness}
                  onChange={(e) => setReadiness(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                >
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">Retention Probability</label>
                <span className="text-sm font-semibold text-orange-600">{(retention * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={retention}
                onChange={(e) => setRetention(e.target.value)}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">Priority Score</label>
                <span className="text-sm font-semibold text-orange-600">{priority}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <p className="mt-2 text-xs text-gray-600">UI uses percentage for clarity, backend receives decimal score.</p>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 px-6 py-3 font-semibold text-white transition shadow-md"
              >
                {loading ? '⏳ Recommending...' : '🎯 Recommend Activity'}
              </button>
              <span className="text-sm text-gray-600">Calls <code className="bg-gray-100 px-2 py-1 rounded text-orange-700">/content/recommend</code></span>
            </div>
          </form>
        </div>

        {output && (
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recommendation Result</h2>
            {output.error ? (
              <div className="rounded-xl border-2 border-red-300 bg-red-50 p-6">
                <p className="text-red-900 font-semibold">Error While Recommending</p>
                <pre className="mt-2 text-sm text-red-700 overflow-auto max-h-64">{JSON.stringify(output.error, null, 2)}</pre>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl font-bold text-white shadow-lg bg-gradient-to-r from-orange-500 to-rose-500">
                    <span className="text-2xl">
                      {output.activity === 'Active Recall'
                        ? '⚡'
                        : output.activity === 'Guided Review'
                        ? '🧭'
                        : output.activity === 'Passive Reading'
                        ? '📖'
                        : '🛌'}
                    </span>
                    <span className="text-2xl">{output.activity}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-orange-50 border-2 border-orange-200 p-5 mb-6">
                  <p className="text-sm font-semibold text-orange-700 mb-2">WHY THIS ACTIVITY</p>
                  <p className="text-orange-900 font-medium">{output.reason}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
                    <p className="text-xs font-semibold text-purple-700 mb-1">READINESS</p>
                    <p className="text-2xl font-bold text-purple-900">{output.readiness_level}</p>
                  </div>
                  <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
                    <p className="text-xs font-semibold text-blue-700 mb-1">RETENTION</p>
                    <p className="text-2xl font-bold text-blue-900">{(output.retention_probability * 100).toFixed(0)}%</p>
                  </div>
                  <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                    <p className="text-xs font-semibold text-amber-700 mb-1">PRIORITY</p>
                    <p className="text-2xl font-bold text-amber-900">{output.priority_percentage.toFixed(0)}%</p>
                  </div>
                  <div className="rounded-xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-4">
                    <p className="text-xs font-semibold text-teal-700 mb-1">DIFFICULTY</p>
                    <p className="text-2xl font-bold text-teal-900">{String(output.difficulty_level).toUpperCase()}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Raw API Response</p>
                  <pre className="text-xs text-gray-700 overflow-auto max-h-32 font-mono">{JSON.stringify(output, null, 2)}</pre>
                </div>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="inline-block animate-spin text-5xl mb-4">⏳</div>
            <p className="text-gray-600 font-semibold text-lg">Computing personalized content strategy...</p>
          </div>
        )}
      </main>
    </div>
  )
}
