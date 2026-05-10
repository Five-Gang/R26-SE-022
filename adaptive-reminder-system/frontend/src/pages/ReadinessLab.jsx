import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1'

const EMOTIONS = ['Focused', 'Neutral', 'Frustrated', 'Anxious', 'Bored']
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

  return (
    <div className="min-h-screen bg-gray-50">
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
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition"
          >
            Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-8 mb-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-blue-100 mb-2">Readiness Lab</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Predict student readiness</h1>
          <p className="text-blue-100 max-w-3xl">
            Use the backend readiness predictor with the same visual language as the dashboard.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6 md:p-8">
          <form onSubmit={handlePredict} className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Emotion</span>
            <select
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {EMOTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Time of day</span>
            <select
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Auto-detect from server time</option>
              {TIMES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2 flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {loading ? 'Predicting...' : 'Predict readiness'}
            </button>
            <span className="text-sm text-gray-500">Calls /api/v1/predict/readiness</span>
          </div>
          </form>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {typeof error === 'string' ? error : 'Prediction failed'}
            </div>
          )}

          {result && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-500">Emotion</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{result.emotion}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-500">Time of day</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{result.time_of_day}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-600">Predicted readiness</p>
                <p className="mt-1 text-lg font-semibold text-blue-900">{result.predicted_readiness}</p>
                {result.source && (
                  <p className="mt-2 text-xs text-blue-700">Source: {result.source}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}