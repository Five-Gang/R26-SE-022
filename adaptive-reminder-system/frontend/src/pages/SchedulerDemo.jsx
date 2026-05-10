import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1'

export default function SchedulerDemo() {
  const navigate = useNavigate()
  const [readiness, setReadiness] = useState('HIGH')
  const [retention, setRetention] = useState(0.42)
  const [priority, setPriority] = useState(0.71)
  const [output, setOutput] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        readiness_level: readiness,
        retention_probability: parseFloat(retention),
        priority_score: parseFloat(priority),
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
      setPriority(0.71)
    } else if (preset === 'delay') {
      setReadiness('MEDIUM')
      setRetention(0.5)
      setPriority(0.45)
    } else if (preset === 'skip') {
      setReadiness('LOW')
      setRetention(0.5)
      setPriority(0.5)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700">
            ← Back to Dashboard
          </button>
          <h1 className="text-lg font-semibold">Model 3: Adaptive Scheduler</h1>
          <div className="w-32"></div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        {/* Description */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">Adaptive Reminder Decision Engine</h2>
          <p className="text-sm text-blue-800">
            Decides whether to SEND a reminder NOW, DELAY it, or SKIP it based on student readiness, content retention risk, and item priority.
          </p>
        </div>

        {/* Presets */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-semibold mb-4">Quick Test Scenarios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => handlePreset('send_now')}
              className="px-4 py-3 bg-green-100 hover:bg-green-200 border border-green-300 text-green-800 rounded font-medium transition"
            >
              📤 Perfect Send Moment
            </button>
            <button
              onClick={() => handlePreset('delay')}
              className="px-4 py-3 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 text-yellow-800 rounded font-medium transition"
            >
              ⏱️ Hold & Monitor
            </button>
            <button
              onClick={() => handlePreset('skip')}
              className="px-4 py-3 bg-red-100 hover:bg-red-200 border border-red-300 text-red-800 rounded font-medium transition"
            >
              ❌ Skip This Round
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Readiness Level</label>
            <select
              value={readiness}
              onChange={(e) => setReadiness(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="HIGH">HIGH - Student is energized & ready to learn</option>
              <option value="MEDIUM">MEDIUM - Student has moderate focus</option>
              <option value="LOW">LOW - Student is tired or distracted</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Retention Probability (0-1)</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={retention}
              onChange={(e) => setRetention(e.target.value)}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              {retention < 0.4 ? '🔴 HIGH RISK - Content being forgotten' : retention < 0.6 ? '🟡 MODERATE RISK - Student may forget' : '🟢 LOW RISK - Content well remembered'} ({parseFloat(retention).toFixed(2)})
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority Score (0+)</label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.05"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <div className="text-xs text-gray-500 mt-1">
              {priority >= 0.5 ? '★ HIGH Priority' : priority >= 0.4 ? '◆ MODERATE Priority' : '○ LOW Priority'}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-medium transition"
          >
            {loading ? 'Deciding...' : 'Get Recommendation'}
          </button>
        </form>

        {/* Output */}
        {output && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Decision Result</h3>
              <div
                className={`inline-block px-4 py-2 rounded-lg font-bold text-white ${
                  output.action === 'SEND_NOW'
                    ? 'bg-green-500'
                    : output.action === 'DELAY'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              >
                {output.action === 'SEND_NOW'
                  ? '📤 SEND NOW'
                  : output.action === 'DELAY'
                  ? '⏱️ DELAY'
                  : '❌ SKIP'}
              </div>
            </div>

            {output.reasons && output.reasons.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Reasoning</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  {output.reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5">{reason.charAt(0)}</span>
                      <span>{reason.substring(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-gray-50 rounded p-3 mt-4 text-xs">
              <pre className="overflow-auto">{JSON.stringify(output, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
