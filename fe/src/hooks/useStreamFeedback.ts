import { useState, useCallback, useRef, useEffect } from 'react'

export function useStreamFeedback() {
  const [feedback, setFeedback] = useState<string>('')
  const [progressMsg, setProgressMsg] = useState<string>('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [score, setScore] = useState<number | null>(null)
  
  const [streaming, setStreaming] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const startStream = useCallback((sessionId: string, questionId: string) => {
    if (esRef.current) esRef.current.close()
    setFeedback('')
    setProgressMsg('')
    setSuggestions([])
    setScore(null)
    setIsCorrect(null)
    setStreaming(true)
    
    const es = new EventSource(`/api/v1/stream/feedback/${sessionId}/${questionId}`)
    esRef.current = es

    es.onmessage = (e) => {
      if (e.data === '[DONE]') {
        setStreaming(false)
        es.close()
        return
      }
      try {
        const parsed = JSON.parse(e.data)
        if (parsed.type === 'progress') {
          setProgressMsg(`${parsed.message} (${parsed.step}/${parsed.total})`)
        } else if (parsed.type === 'feedback') {
          setFeedback(parsed.feedback)
          setSuggestions(parsed.suggestions || [])
          setScore(parsed.score)
          if (parsed.score !== undefined) {
             setIsCorrect(parsed.score >= 50)
          }
          setProgressMsg('')
        } else if (parsed.type === 'start') {
          setIsCorrect(parsed.is_correct)
        } else if (parsed.type === 'token') {
          setFeedback((prev) => prev + parsed.content)
        } else if (parsed.type === 'done') {
          setStreaming(false)
          es.close()
        } else if (parsed.type === 'error') {
          setStreaming(false)
          es.close()
        }
      } catch { /* ignore parse errors */ }
    }
    es.onerror = () => { setStreaming(false); es.close() }
  }, [])

  const clearFeedback = useCallback(() => {
    esRef.current?.close()
    setFeedback('')
    setProgressMsg('')
    setSuggestions([])
    setScore(null)
    setIsCorrect(null)
    setStreaming(false)
  }, [])

  useEffect(() => () => esRef.current?.close(), [])

  return { feedback, progressMsg, suggestions, score, streaming, isCorrect, startStream, clearFeedback }
}
