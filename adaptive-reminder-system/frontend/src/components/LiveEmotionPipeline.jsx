import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

const EMOTION_API = import.meta.env.VITE_EMOTION_API_URL || 'http://127.0.0.1:8000/api'

export default function LiveEmotionPipeline({ onEmotion }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('Camera is off')
  const [detection, setDetection] = useState(null)

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const detectFrame = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const image = canvas.toDataURL('image/jpeg', 0.75)

    try {
      const response = await axios.post(`${EMOTION_API}/detect-emotion`, { image })
      setDetection(response.data)
      onEmotion(response.data.emotion)
      setStatus('Live emotion feed connected')
    } catch (error) {
      setStatus(error.response?.data?.detail || 'No face detected')
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setRunning(true)
      setStatus('Reading live camera frames...')
      await detectFrame()
    } catch {
      setStatus('Camera permission is required for live emotion detection')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setRunning(false)
    setStatus('Camera is off')
  }

  useEffect(() => {
    if (!running) return undefined
    const interval = window.setInterval(detectFrame, 3000)
    return () => window.clearInterval(interval)
  }, [running])

  return (
    <section className="bg-white rounded-2xl shadow-md p-6 mb-8">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Live Emotion Input</h2>
          <p className="text-sm text-gray-600">Mihiraj's camera detector feeds the adaptive pipeline.</p>
        </div>
        {running ? (
          <button onClick={stopCamera} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold">Stop Camera</button>
        ) : (
          <button onClick={startCamera} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">Start Live Feed</button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <video ref={videoRef} muted playsInline className="w-full aspect-video rounded-lg bg-gray-900 object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{status}</p>
          {detection && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-700">MIHIRAJ DETECTION</p>
              <p className="text-3xl font-bold text-gray-900">{detection.emotion}</p>
              <p className="text-sm text-gray-600">Confidence: {detection.confidence}% · Attention: {detection.attentionScore}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}