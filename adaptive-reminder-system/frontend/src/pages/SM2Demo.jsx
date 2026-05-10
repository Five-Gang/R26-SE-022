import { useState } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1'

export default function SM2Demo() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">SM-2 Demo</h1>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
          <div>
            <label className="block text-sm font-medium text-gray-700">Item ID</label>
            <input value={itemId} onChange={(e) => setItemId(e.target.value)} className="mt-1 block w-full border rounded p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Quality (%)</label>
            <input type="number" value={quality} onChange={(e) => setQuality(e.target.value)} className="mt-1 block w-full border rounded p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Readiness</label>
            <select value={readiness} onChange={(e) => setReadiness(e.target.value)} className="mt-1 block w-full border rounded p-2">
              <option>HIGH</option>
              <option>MEDIUM</option>
              <option>LOW</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>Run</button>
            <span className="text-sm text-gray-500">Calls backend /sm2/process</span>
          </div>
        </form>

        <div className="mt-6">
          <h2 className="text-lg font-medium">Result</h2>
          <pre className="mt-2 bg-white p-4 rounded shadow text-sm overflow-auto max-h-96">{loading ? 'Running...' : JSON.stringify(output, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
