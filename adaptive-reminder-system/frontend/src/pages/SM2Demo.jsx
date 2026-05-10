import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1'

export default function SM2Demo() {
  const navigate = useNavigate()
  const [itemId, setItemId] = useState('demo_item')
  const [quality, setQuality] = useState(80)
  const [readiness, setReadiness] = useState('MEDIUM')
  const [output, setOutput] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        item: { item_id: itemId },
        quality_percentage: Number(quality),
        readiness_level: readiness,
      }
      const res = await axios.post(`${API_BASE}/sm2/process`, payload)
      setOutput(res.data)
    } catch (err) {
      setOutput({ error: err?.response?.data || String(err) })
    } finally {
      setLoading(false)
    }
  }

  const handlePreset = (preset) => {
    if (preset === 'perfect') {
      setQuality(95)
      setReadiness('HIGH')
    } else if (preset === 'moderate') {
      setQuality(70)
      setReadiness('MEDIUM')
    } else if (preset === 'poor') {
      setQuality(30)
      setReadiness('LOW')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      <nav className="bg-white shadow-md border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
              SM-2
            </div>
            <div>
              <div className="font-semibold text-gray-900">Model 2</div>
              <div className="text-xs text-gray-500">Memory Decay</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white rounded-2xl p-8 mb-8 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-green-200 text-sm font-semibold mb-1">SPACED REPETITION</p>
              <h1 className="text-4xl font-bold mb-3">SM-2 Memory Model</h1>
              <p className="text-green-100 max-w-2xl text-lg">
                Extended SM-2 algorithm predicts retention probability and optimal review intervals based on quiz performance and student readiness.
              </p>
            </div>
            <div className="text-5xl">🧠💾</div>
          </div>
        </div>

        {/* Preset Scenarios */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Test Scenarios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => handlePreset('perfect')}
              className="px-4 py-3 bg-green-100 hover:bg-green-200 border-2 border-green-300 text-green-800 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <span>✨</span> Perfect (95%)
            </button>
            <button
              onClick={() => handlePreset('moderate')}
              className="px-4 py-3 bg-yellow-100 hover:bg-yellow-200 border-2 border-yellow-300 text-yellow-800 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <span>📊</span> Moderate (70%)
            </button>
            <button
              onClick={() => handlePreset('poor')}
              className="px-4 py-3 bg-red-100 hover:bg-red-200 border-2 border-red-300 text-red-800 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <span>⚠️</span> Poor (30%)
            </button>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Process Study Item</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Item ID</label>
                <input
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                  placeholder="e.g., DBMS_01"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Quiz Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Readiness Level</label>
                <select
                  value={readiness}
                  onChange={(e) => setReadiness(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                >
                  <option>HIGH</option>
                  <option>MEDIUM</option>
                  <option>LOW</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-400 px-6 py-3 font-semibold text-white transition shadow-md"
              >
                {loading ? '⏳ Processing...' : '▶️ Process Item'}
              </button>
              <span className="text-sm text-gray-600">Calls <code className="bg-gray-100 px-2 py-1 rounded text-green-600">/sm2/process</code></span>
            </div>
          </form>
        </div>

        {/* Result Display */}
        {output && (
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">SM-2 Processing Result</h2>
            {output.error ? (
              <div className="rounded-xl border-2 border-red-300 bg-red-50 p-6">
                <p className="text-red-900 font-semibold">Error Processing Item</p>
                <pre className="mt-2 text-sm text-red-700 overflow-auto max-h-64">{JSON.stringify(output.error, null, 2)}</pre>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6">
                  <p className="text-sm font-semibold text-green-700 mb-2">RETENTION PROBABILITY</p>
                  <p className="text-4xl font-bold text-green-900">{(output.retention_probability * 100).toFixed(1)}%</p>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${output.retention_probability * 100}%` }}></div>
                  </div>
                </div>
                <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
                  <p className="text-sm font-semibold text-amber-700 mb-2">PRIORITY SCORE</p>
                  <p className="text-4xl font-bold text-amber-900">{output.priority_score.toFixed(2)}</p>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(output.priority_score * 50, 100)}%` }}></div>
                  </div>
                </div>
                <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
                  <p className="text-sm font-semibold text-blue-700 mb-2">INTERVAL (DAYS)</p>
                  <p className="text-4xl font-bold text-blue-900">{output.interval_days.toFixed(1)}</p>
                  <p className="mt-2 text-xs text-blue-600">Days until next review</p>
                </div>
                <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6">
                  <p className="text-sm font-semibold text-purple-700 mb-2">EASINESS FACTOR</p>
                  <p className="text-4xl font-bold text-purple-900">{output.easiness_factor.toFixed(2)}</p>
                  <p className="mt-2 text-xs text-purple-600">Difficulty modifier</p>
                </div>
              </div>
            )}
            <div className="mt-6 rounded-xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Full Response</p>
              <pre className="text-xs text-gray-700 overflow-auto max-h-48 font-mono">{JSON.stringify(output, null, 2)}</pre>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <div className="inline-block animate-spin text-4xl mb-3">⏳</div>
            <p className="text-gray-600 font-medium">Processing with SM-2 algorithm...</p>
          </div>
        )}
      </main>
    </div>
  )
}
