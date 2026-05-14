import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Loader2, Bot, User, Trash2, ChevronDown } from 'lucide-react'
import { authFetch } from '../../lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  tool_name?: string
  created_at: string
}

interface ChatSession {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

interface ChatBotProps {
  projectId?: string
  materialId?: string
  quizId?: string
}

const API_BASE = '/api/v1/agent'

async function sendMessage(params: {
  message: string
  sessionId?: string
  projectId?: string
  materialId?: string
  quizId?: string
}): Promise<{ session_id: string; reply: string; tool_calls: unknown[] }> {
  const res = await authFetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      session_id: params.sessionId,
      project_id: params.projectId,
      material_id: params.materialId,
      quiz_id: params.quizId,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to send message')
  }
  return res.json()
}

async function fetchSessions(): Promise<ChatSession[]> {
  const res = await authFetch(`${API_BASE}/sessions`)
  if (!res.ok) return []
  return res.json()
}

async function fetchSessionMessages(sessionId: string): Promise<Message[]> {
  const res = await authFetch(`${API_BASE}/sessions/${sessionId}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.messages || []
}

async function deleteSession(sessionId: string): Promise<void> {
  await authFetch(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' })
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === 'tool') return null // don't render tool messages

  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isUser ? 'bg-indigo-600' : 'bg-slate-100'
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-indigo-600" />
        )}
      </div>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm shadow-sm'
        }`}
      >
        {msg.content}
      </div>
    </div>
  )
}

export const ChatBot: React.FC<ChatBotProps> = ({ projectId, materialId, quizId }) => {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const loadSessions = useCallback(async () => {
    const data = await fetchSessions()
    setSessions(data)
  }, [])

  const handleOpen = () => {
    setOpen(true)
    loadSessions()
  }

  const handleSelectSession = async (sid: string) => {
    setLoadingHistory(true)
    setShowSessions(false)
    try {
      const msgs = await fetchSessionMessages(sid)
      setSessionId(sid)
      setMessages(msgs.filter((m) => m.role !== 'tool'))
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleNewChat = () => {
    setSessionId(undefined)
    setMessages([])
    setShowSessions(false)
  }

  const handleDeleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteSession(sid)
    setSessions((prev) => prev.filter((s) => s.id !== sid))
    if (sessionId === sid) handleNewChat()
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await sendMessage({
        message: text,
        sessionId,
        projectId,
        materialId,
        quizId,
      })

      setSessionId(res.session_id)

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.reply,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      loadSessions() // refresh session list
    } catch (err) {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const contextLabel = materialId
    ? 'Tutor Mode'
    : quizId
    ? 'Quiz Assistant'
    : projectId
    ? 'Project Assistant'
    : 'General Assistant'

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleOpen}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl shadow-indigo-600/30 flex items-center justify-center transition-colors"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-5rem)] bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-200/60 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-indigo-600 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-black text-sm">LuminaPrep AI</p>
                  <p className="text-indigo-200 text-[10px] font-medium">{contextLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSessions((v) => !v)}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
                  title="Chat history"
                >
                  <ChevronDown
                    className={`w-4 h-4 text-white transition-transform ${showSessions ? 'rotate-180' : ''}`}
                  />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Session list dropdown */}
            <AnimatePresence>
              {showSessions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-slate-100 bg-slate-50 overflow-hidden shrink-0"
                >
                  <div className="p-3 space-y-1 max-h-48 overflow-y-auto">
                    <button
                      onClick={handleNewChat}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-black text-indigo-600 hover:bg-indigo-50 transition-colors uppercase tracking-wider"
                    >
                      + New Chat
                    </button>
                    {sessions.length === 0 && (
                      <p className="text-[11px] text-slate-400 px-3 py-2">No previous sessions</p>
                    )}
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectSession(s.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors group ${
                          s.id === sessionId
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="text-[11px] font-medium truncate flex-1">
                          {s.title || 'Untitled'}
                        </span>
                        <button
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <Bot className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-700">Hi! I'm your AI tutor.</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                      Ask me anything about your materials, quizzes, or learning goals.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {[
                      'What are my quizzes?',
                      'Explain this material',
                      'Help me study',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-xl text-[10px] font-medium transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
              )}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-100 shrink-0">
              <div className="flex gap-2 items-end bg-slate-50 rounded-2xl border border-slate-200 px-4 py-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 resize-none outline-none max-h-24 leading-relaxed"
                  style={{ minHeight: '20px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 bg-indigo-600 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl flex items-center justify-center transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[9px] text-slate-300 text-center mt-2 font-medium">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
