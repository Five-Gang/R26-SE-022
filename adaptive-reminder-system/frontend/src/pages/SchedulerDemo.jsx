import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1'

export default function SchedulerDemo() {
  const navigate = useNavigate()
  const [readiness, setReadiness] = useState('HIGH')
  const [retention, setRetention] = useState(0.42)
  const [priority, setPriority] = useState(71)
  const [output, setOutput] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        readiness_level: readiness,
        retention_probability: parseFloat(retention),
        priority_score: priority / 100,
      }
      const res = await axios.post(`${API_BASE}/scheduler/decide`, payload)
      setOutput(res.data)
    } catch (err) {
      setOutput({ error: err?.response?.data || String(err) })
    } finally {
      setLoading(false)
    }
  }

  const handlePreset = (preset) => {
    if (preset === 'send_now') {
      setReadiness('HIGH')
      setRetention(0.42)
      setPriority(71)
    } else if (preset === 'delay') {
      setReadiness('MEDIUM')
      setRetention(0.5)
      setPriority(45)
    } else if (preset === 'skip') {
      setReadiness('LOW')
      setRetention(0.5)
      setPriority(50)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <nav className="bg-white shadow-md border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
              SCH
            </div>
            <div>
              <div className="font-semibold text-gray-900">Model 3</div>
              <div className="text-xs text-gray-500">Adaptive Scheduling</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-pink-600 text-white rounded-2xl p-8 mb-8 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-purple-200 text-sm font-semibold mb-1">DECISION INTELLIGENCE</p>
              <h1 className="text-4xl font-bold mb-3">Adaptive Reminder Scheduler</h1>
              <p className="text-purple-100 max-w-2xl text-lg">
                Decides whether to SEND reminders NOW, DELAY them, or SKIP them by analyzing student readiness, content retention risk, and item priority.
              </p>
            </div>
            <div className="text-5xl">⏰🎯</div>
          </div>
        </div>

        {/* Preset Scenarios */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Test Scenarios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => handlePreset('send_now')}
              className="px-4 py-3 bg-green-100 hover:bg-green-200 border-2 border-green-300 text-green-800 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <span>📤</span> Perfect Send Moment
            </button>
            <button
              onClick={() => handlePreset('delay')}
              className="px-4 py-3 bg-yellow-100 hover:bg-yellow-200 border-2 border-yellow-300 text-yellow-800 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <span>⏱️</span> Hold & Monitor
            </button>
            <button
              onClick={() => handlePreset('skip')}
              className="px-4 py-3 bg-red-100 hover:bg-red-200 border-2 border-red-300 text-red-800 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <span>❌</span> Skip This Round
            </button>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Decide Reminder Action</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Student Readiness Level</label>
              <select
                value={readiness}
                onChange={(e) => setReadiness(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              >
                <option value="HIGH">🚀 HIGH - Student is energized & ready to learn</option>
                <option value="MEDIUM">📊 MEDIUM - Student has moderate focus & energy</option>
                <option value="LOW">😴 LOW - Student is tired or distracted</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">Retention Probability</label>
                <span className="text-sm font-semibold text-purple-600">{(retention * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={retention}
                onChange={(e) => setRetention(e.target.value)}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="mt-3 flex items-center gap-2 text-xs">
                {retention < 0.4 ? (
                  <><span className="text-red-500 font-semibold">🔴 HIGH RISK</span> <span className="text-gray-600">Content being forgotten</span></>
                ) : retention < 0.6 ? (
                  <><span className="text-yellow-600 font-semibold">🟡 MODERATE RISK</span> <span className="text-gray-600">Student may forget</span></>
                ) : (
                  <><span className="text-green-600 font-semibold">🟢 LOW RISK</span> <span className="text-gray-600">Content well remembered</span></>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">Priority Score</label>
                <span className="text-sm font-semibold text-purple-600">{priority}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="mt-3 flex items-center gap-2 text-xs">
                {priority >= 60 ? (
                  <><span className="text-green-600 font-semibold">★ HIGH</span> <span className="text-gray-600">Priority item - important</span></>
                ) : priority >= 40 ? (
                  <><span className="text-yellow-600 font-semibold">◆ MEDIUM</span> <span className="text-gray-600">Priority - somewhat important</span></>
                ) : (
                  <><span className="text-gray-500 font-semibold">○ LOW</span> <span className="text-gray-600">Priority - optional</span></>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 px-6 py-3 font-semibold text-white transition shadow-md"
              >
                {loading ? '⏳ Deciding...' : '🤔 Get Recommendation'}
              </button>
              <span className="text-sm text-gray-600">Calls <code className="bg-gray-100 px-2 py-1 rounded text-purple-600">/scheduler/decide</code></span>
            </div>
          </form>
        </div>

        {/* Result Display */}
        {output && !output.error && (
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Decision & Analysis</h2>

            {/* Action Badge */}
            <div className="mb-8">
              <div
                className={`inline-flex items-center gap-3 px-6 py-4 rounded-xl font-bold text-white shadow-lg ${
                  output.action === 'SEND_NOW'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : output.action === 'DELAY'
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                    : 'bg-gradient-to-r from-red-500 to-pink-500'
                }`}
              >
                {output.action === 'SEND_NOW' ? '📤' : output.action === 'DELAY' ? '⏱️' : '❌'}
                <span className="text-2xl">
                  {output.action === 'SEND_NOW' ? 'SEND NOW' : output.action === 'DELAY' ? 'DELAY' : 'SKIP'}
                </span>
              </div>
            </div>

            {/* Reasoning */}
            {output.reasons && output.reasons.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">Decision Factors</h3>
                <div className="space-y-3">
                  {output.reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <span className="text-xl flex-shrink-0">{reason.charAt(0)}</span>
                      <span className="text-gray-700">{reason.substring(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <p className="text-2xl font-bold text-amber-900">{output.priority_score.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">Raw API Response</p>
              <pre className="text-xs text-gray-700 overflow-auto max-h-32 font-mono">{JSON.stringify(output, null, 2)}</pre>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="inline-block animate-spin text-5xl mb-4">⏳</div>
            <p className="text-gray-600 font-semibold text-lg">Making intelligent decision...</p>
          </div>
        )}
      </main>
    </div>
  )
}
