import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'

interface StreamChatParams {
  message: string
  sessionId?: string
  projectId?: string
  materialId?: string
  quizId?: string
  attachedMaterialIds?: string[]
}

interface ToolCall {
  tool: string
  args: Record<string, unknown>
  id?: string
  result?: Record<string, unknown>
}

export function useStreamChat() {
  const [streaming, setStreaming] = useState(false)
  const [streamedContent, setStreamedContent] = useState('')
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  const startStream = useCallback(
    async (
      params: StreamChatParams,
      onComplete: (sessionId: string, content: string, tools: ToolCall[]) => void,
      onError: (error: string) => void
    ) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      setStreamedContent('')
      setToolCalls([])
      setStreaming(true)

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      const token = localStorage.getItem('lumina_token')

      let accumulatedContent = ''
      const accumulatedTools: ToolCall[] = []

      try {
        await fetchEventSource('/api/v1/agent/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            message: params.message,
            session_id: params.sessionId,
            project_id: params.projectId,
            material_id: params.materialId,
            quiz_id: params.quizId,
            attached_material_ids: params.attachedMaterialIds,
          }),
          signal: abortController.signal,
          
          onopen(response) {
            if (response.ok) {
              return Promise.resolve()
            } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
              throw new Error(`HTTP ${response.status}`)
            } else {
              throw new Error(`HTTP ${response.status}`)
            }
          },

          onmessage(event) {
            try {
              const data = JSON.parse(event.data)

              if (data.type === 'text_delta') {
                accumulatedContent += data.delta
                setStreamedContent(accumulatedContent)
              } else if (data.type === 'tool_call') {
                const toolCall: ToolCall = {
                  tool: data.tool_name,
                  id: data.tool_call_id,
                  args: typeof data.argument === 'string' 
                    ? JSON.parse(data.argument || '{}') 
                    : data.argument || {},
                }
                accumulatedTools.push(toolCall)
                setToolCalls([...accumulatedTools])
              } else if (data.type === 'tool_result') {
                // Find the matching tool call and attach the result
                const toolIndex = accumulatedTools.findIndex(
                  tc => tc.id === data.tool_call_id
                )
                if (toolIndex !== -1) {
                  accumulatedTools[toolIndex].result = data.result
                  setToolCalls([...accumulatedTools])
                }
              } else if (data.type === 'done') {
                setStreaming(false)
                onComplete(params.sessionId || '', accumulatedContent, accumulatedTools)
              } else if (data.type === 'error') {
                throw new Error(data.message || 'Stream error')
              }
            } catch (parseErr) {
              console.error('SSE parse error:', parseErr, 'Data:', event.data)
            }
          },

          onerror(err) {
            setStreaming(false)
            throw err
          },

          openWhenHidden: true,
        })
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Stream aborted by user')
        } else {
          console.error('Stream error:', err)
          onError(err.message || 'Failed to stream response')
        }
        setStreaming(false)
      }
    },
    []
  )

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setStreaming(false)
    setStreamedContent('')
    setToolCalls([])
  }, [])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return { streaming, streamedContent, toolCalls, startStream, stopStream }
}
