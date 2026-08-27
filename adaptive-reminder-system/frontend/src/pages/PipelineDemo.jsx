import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import LiveEmotionPipeline from '../components/LiveEmotionPipeline'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1'

export default function PipelineDemo() {
  const navigate = useNavigate()
  const [emotion, setEmotion] = useState('')
  const [quality, setQuality] = useState(80)
  const [difficulty, setDifficulty] = useState('medium')
  const [daysSinceLastReview, setDaysSinceLastReview] = useState(2)
  const [output, setOutput] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLiveEmotion = (detectedEmotion) => {
    setEmotion(detectedEmotion.toLowerCase())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!emotion) {
      setOutput({ error: 'Start Mihiraj live emotion detection before running the pipeline.' })
      return
    }
    setLoading(true)
    try {
      const payload = {
        emotion,
        quality_percentage: Number(quality),
        difficulty_level: difficulty,
        days_since_last_review: Number(daysSinceLastReview),
      }
      const res = await axios.post(`${API_BASE}/pipeline/complete`, payload)
      setOutput(res.data)
    } catch (err) {
      setOutput({ error: err?.response?.data || String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <nav className="bg-white shadow-md border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
              ⚡
            </div>
            <div>
              <div className="font-semibold text-gray-900">Complete Pipeline</div>
              <div className="text-xs text-gray-500">All 4 Models Orchestrated</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <LiveEmotionPipeline onEmotion={handleLiveEmotion} />
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm font-semibold mb-1">INTEGRATED SYSTEM</p>
              <h1 className="text-4xl font-bold mb-3">Complete Pipeline Demo</h1>
              <p className="text-blue-50 max-w-3xl text-lg">
                Experience how all 4 models work together: Readiness detection → Memory analysis → Scheduler decision → Content recommendation. A single input flows through the entire intelligent system.
              </p>
            </div>
            <div className="text-6xl">🔄</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Input Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Input Parameters</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Live Emotion From Mihiraj</label>
                  <select
                    value={emotion}
                    disabled
                    className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  >
                    <option value="">Start live feed first</option>
                    {emotion && <option value={emotion}>{emotion}</option>}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-gray-700">Quiz Score (%)</label>
                    <span className="text-sm font-bold text-purple-600">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Topic Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-gray-700">Days Since Last Review</label>
                    <span className="text-sm font-bold text-purple-600">{daysSinceLastReview}d</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={daysSinceLastReview}
                    onChange={(e) => setDaysSinceLastReview(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !emotion}
                  className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 px-6 py-3 font-semibold text-white transition shadow-md"
                >
                  {loading ? '⏳ Running Pipeline...' : '▶️ Run Complete Pipeline'}
                </button>
              </form>

            </div>
          </div>

          {/* Pipeline Visualization */}
          <div className="lg:col-span-2">
            {!output && !loading && (
                <div className="bg-white rounded-2xl shadow-md p-12 text-center">
                <div className="text-6xl mb-4">🚀</div>
                <p className="text-gray-600 font-medium">Enter parameters and run the pipeline to see the complete flow</p>
              </div>
            )}

            {loading && (
                <div className="bg-white rounded-2xl shadow-md p-12 text-center">
                <div className="inline-block">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center">
                      <div className="animate-spin text-6xl">⚙️</div>
                    </div>
                  </div>
                    <p className="text-gray-600 font-semibold">Orchestrating all 4 models...</p>
                  <p className="text-sm text-gray-500 mt-2">Emotional analysis → Memory prediction → Decision making → Content personalization</p>
                </div>
              </div>
            )}

            {output && !output.error && (
                <div className="bg-white rounded-2xl shadow-md p-8 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-3 border-b pb-4">
                    <div>
                      <p className="text-sm font-semibold text-indigo-600">PIPELINE RESULT</p>
                      <h2 className="text-2xl font-bold text-gray-900">End-to-End Recommendation</h2>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                      {output.pipeline_status === 'success' ? '● Success' : '● Error'}
                    </div>
                  </div>

                {/* Stage 1 */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h3 className="font-bold text-blue-900">{output.stages.stage_1_readiness.name}</h3>
                        <p className="text-sm text-blue-700 mt-1">{output.stages.stage_1_readiness.output.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{output.stages.stage_1_readiness.output.readiness_level}</div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="text-3xl text-gray-400">↓</div>
                </div>

                {/* Stage 2 */}
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        2
                      </div>
                      <div>
                        <h3 className="font-bold text-green-900">{output.stages.stage_2_memory.name}</h3>
                        <p className="text-sm text-green-700 mt-1">{output.stages.stage_2_memory.output.description}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div className="text-xs bg-white rounded px-2 py-1 border border-green-200">
                            <span className="font-semibold text-green-700">Retention:</span>{' '}
                            <span className="text-green-900">{output.stages.stage_2_memory.output.retention_percentage}%</span>
                          </div>
                          <div className="text-xs bg-white rounded px-2 py-1 border border-green-200">
                            <span className="font-semibold text-green-700">Priority:</span>{' '}
                            <span className="text-green-900">{output.stages.stage_2_memory.output.priority_percentage}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="text-3xl text-gray-400">↓</div>
                </div>

                {/* Stage 3 */}
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-purple-900">{output.stages.stage_3_scheduler.name}</h3>
                      <div className="mt-2 inline-block">
                        <div
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white ${
                            output.stages.stage_3_scheduler.output.action === 'SEND_NOW'
                              ? 'bg-green-500'
                              : output.stages.stage_3_scheduler.output.action === 'DELAY'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                        >
                          {output.stages.stage_3_scheduler.output.action === 'SEND_NOW'
                            ? '📤'
                            : output.stages.stage_3_scheduler.output.action === 'DELAY'
                            ? '⏱️'
                            : '❌'}
                          {output.stages.stage_3_scheduler.output.action}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="text-3xl text-gray-400">↓</div>
                </div>

                {/* Stage 4 */}
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      4
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-orange-900">{output.stages.stage_4_content.name}</h3>
                      <p className="text-sm text-orange-700 mt-2">{output.stages.stage_4_content.output.reason}</p>
                      <div className="mt-2 text-lg font-bold text-orange-900">{output.stages.stage_4_content.output.activity}</div>
                    </div>
                  </div>
                </div>

                {/* Final Recommendation */}
                <div className="mt-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
                  <h3 className="text-2xl font-bold mb-4">🎯 Final Recommendation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-purple-100 text-sm font-semibold mb-1">DECISION</p>
                      <p className="text-3xl font-bold">{output.final_recommendation.action}</p>
                    </div>
                    <div>
                      <p className="text-pink-100 text-sm font-semibold mb-1">ACTIVITY</p>
                      <p className="text-3xl font-bold">{output.final_recommendation.activity}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white border-opacity-30">
                    <p className="text-sm text-purple-100 mb-2">
                      <span className="font-semibold">Readiness:</span> {output.final_recommendation.full_reasoning.readiness}
                    </p>
                    <p className="text-sm text-purple-100 mb-2">
                      <span className="font-semibold">Retention Risk:</span> {output.final_recommendation.full_reasoning.retention_risk}
                    </p>
                    <p className="text-sm text-purple-100">
                      <span className="font-semibold">Priority:</span> {output.final_recommendation.full_reasoning.priority_urgency}
                    </p>
                  </div>
                </div>

                {/* Raw JSON */}
                <div className="bg-gray-900 rounded-xl p-4 mt-6">
                  <p className="text-xs font-semibold text-gray-300 mb-2">Full Pipeline Response (JSON)</p>
                  <pre className="text-xs text-gray-400 overflow-auto max-h-48 font-mono">{JSON.stringify(output, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
