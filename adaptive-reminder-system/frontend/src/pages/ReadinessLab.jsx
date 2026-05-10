import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1'

// Restrict emotions to the five labels used in model training
const EMOTIONS = ['Focused', 'Neutral', 'Frustrated', 'Bored', 'Confused']
const TIMES = ['Morning', 'Afternoon', 'Evening', 'Night']

export default function ReadinessLab() {
  const navigate = useNavigate()
  const [emotion, setEmotion] = useState('Focused')
  const [timeOfDay, setTimeOfDay] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePredict = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await axios.post(`${API_BASE}/predict/readiness`, {
        emotion,
        time_of_day: timeOfDay || null,
      })
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePreset = (preset) => {
    if (preset === 'focused_morning') {
      setEmotion('Focused')
      setTimeOfDay('Morning')
    } else if (preset === 'frustrated_afternoon') {
      setEmotion('Frustrated')
      setTimeOfDay('Afternoon')
    } else if (preset === 'bored_evening') {
      setEmotion('Bored')
      setTimeOfDay('Evening')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white shadow-md border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
              ARS
            </div>
            <div>
              <div className="font-semibold text-gray-900">Model 1</div>
              <div className="text-xs text-gray-500">Readiness Prediction</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 text-white rounded-2xl p-8 mb-8 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-200 text-sm font-semibold mb-1">EMOTION ANALYSIS</p>
              <h1 className="text-4xl font-bold mb-3">Readiness Prediction</h1>
              <p className="text-blue-100 max-w-2xl text-lg">
                Analyzes emotion and time of day to predict student readiness for learning activities.
              </p>
            </div>
            <div className="text-5xl">🧠</div>
          </div>
        </div>

        {/* Preset Scenarios */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Test Scenarios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => handlePreset('focused_morning')}
              className="px-4 py-3 bg-green-100 hover:bg-green-200 border-2 border-green-300 text-green-800 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <span>✨</span> Focused Morning
            </button>
            <button
              onClick={() => handlePreset('frustrated_afternoon')}
              className="px-4 py-3 bg-yellow-100 hover:bg-yellow-200 border-2 border-yellow-300 text-yellow-800 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <span>😤</span> Frustrated Afternoon
            </button>
            <button
              onClick={() => handlePreset('bored_evening')}
              className="px-4 py-3 bg-orange-100 hover:bg-orange-200 border-2 border-orange-300 text-orange-800 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <span>😴</span> Bored Evening
            </button>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Predict Readiness</h2>
          <form onSubmit={handlePredict} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Student Emotion</label>
                <select
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  {EMOTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Time of Day</label>
                <select
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="">Auto-detect from server</option>
                  {TIMES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 px-6 py-3 font-semibold text-white transition shadow-md"
              >
                {loading ? '⏳ Predicting...' : '🔍 Predict Readiness'}
              </button>
              <span className="text-sm text-gray-600">Calls <code className="bg-gray-100 px-2 py-1 rounded text-blue-600">/predict/readiness</code></span>
            </div>
          </form>

        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-8 border-l-4 border-red-500">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-900">Prediction Error</p>
                <p className="text-red-700">{typeof error === 'string' ? error : 'Prediction failed'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Prediction Result</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                <p className="text-sm font-semibold text-gray-600 mb-2">EMOTION DETECTED</p>
                <p className="text-3xl font-bold text-gray-900">{result.emotion}</p>
                <div className="mt-4 h-1 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full"></div>
              </div>
              <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                <p className="text-sm font-semibold text-gray-600 mb-2">TIME OF DAY</p>
                <p className="text-3xl font-bold text-gray-900">{result.time_of_day || '—'}</p>
                <div className="mt-4 h-1 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full"></div>
              </div>
              <div className="rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 shadow-md">
                <p className="text-sm font-semibold text-blue-700 mb-2">PREDICTED READINESS</p>
                <p className="text-3xl font-bold text-blue-900">{result.predicted_readiness}</p>
                {result.source && (
                  <p className="mt-4 text-xs text-blue-600 font-medium">Source: {result.source}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}