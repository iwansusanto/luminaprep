import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Bot, User, Trash2, Plus, Loader2,
  X, FileText, ChevronDown, Sparkles,
  Globe, Search, BookOpen, BrainCircuit,
} from 'lucide-react'
import { message as antMessage, Tooltip } from 'antd'

export const Route = createFileRoute('/dashboard/chat')({
  component: ChatPage,
})

// ── Types ─────────────────────────────────────────────────────────────────────
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
  material_id: string | null
  quiz_id: string | null
  created_at: string
  updated_at: string
}

interface Material {
  id: string
  file_name: string
  status: string
}

interface ToolCall {
  tool: string
  args: Record<string, unknown>
}

// ── API helpers ───────────────────────────────────────────────────────────────
const API = '/api/v1/agent'
const TOKEN_KEY = 'lumina_token'

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers as Record<string, string> || {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || `Request failed ${res.status}`)
  }
  return res.json()
}

// ── Tool badge ────────────────────────────────────────────────────────────────
function ToolBadge({ tool }: { tool: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    search_material: { icon: <BookOpen className="w-3 h-3" />, label: 'Searched materials', color: 'bg-violet-100 text-violet-700' },
    get_context: { icon: <BrainCircuit className="w-3 h-3" />, label: 'Fetched your data', color: 'bg-indigo-100 text-indigo-700' },
    get_quiz_questions: { icon: <BrainCircuit className="w-3 h-3" />, label: 'Loaded quiz questions', color: 'bg-amber-100 text-amber-700' },
    get_quiz_results: { icon: <Sparkles className="w-3 h-3" />, label: 'Checked quiz results', color: 'bg-emerald-100 text-emerald-700' },
    web_search: { icon: <Globe className="w-3 h-3" />, label: 'Searched the web', color: 'bg-sky-100 text-sky-700' },
    update_quiz: { icon: <BrainCircuit className="w-3 h-3" />, label: 'Updated quiz', color: 'bg-rose-100 text-rose-700' },
  }
  const info = map[tool] ?? { icon: <Search className="w-3 h-3" />, label: tool, color: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${info.color}`}>
      {info.icon}{info.label}
    </span>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, toolCalls }: { msg: Message; toolCalls?: ToolCall[] }) {
  if (msg.role === 'tool') return null
  const isUser = msg.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${isUser ? 'bg-indigo-600' : 'bg-white border border-slate-200'}`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-600" />}
      </div>
      <div className={`max-w-[75%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Tool badges */}
        {!isUser && toolCalls && toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {toolCalls.map((tc, i) => <ToolBadge key={i} tool={tc.tool} />)}
          </div>
        )}
        <div className={`px-5 py-3.5 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm shadow-lg shadow-indigo-200'
            : 'bg-white text-slate-700 border border-slate-200/80 rounded-tl-sm shadow-sm'
        }`}>
          {msg.content}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
function ChatPage() {
  const { user } = useAuth()
  const projectId = user?.projects?.[0]?.id

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<string | undefined>()
  const [messages, setMessages] = useState<Message[]>([])
  const [toolCallsMap, setToolCallsMap] = useState<Record<string, ToolCall[]>>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [attachedMaterials, setAttachedMaterials] = useState<Material[]>([])
  const [showAttachPicker, setShowAttachPicker] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      const data = await apiFetch<ChatSession[]>(`${API}/sessions`)
      setSessions(data)
    } catch { /* ignore */ }
  }, [])

  // Load materials for attach picker
  const loadMaterials = useCallback(async () => {
    if (!projectId) return
    try {
      const data = await apiFetch<{ materials: Material[] }>(`/api/v1/materials/project/${projectId}`)
      setMaterials(data.materials.filter(m => m.status === 'completed'))
    } catch { /* ignore */ }
  }, [projectId])

  useEffect(() => {
    loadSessions()
    loadMaterials()
  }, [loadSessions, loadMaterials])

  // Select session
  const handleSelectSession = async (sid: string) => {
    setLoadingHistory(true)
    setActiveSession(sid)
    try {
      const data = await apiFetch<{ messages: Message[] }>(`${API}/sessions/${sid}`)
      setMessages(data.messages.filter(m => m.role !== 'tool'))
    } catch {
      antMessage.error('Failed to load conversation')
    } finally {
      setLoadingHistory(false)
    }
  }

  // New chat
  const handleNewChat = () => {
    setActiveSession(undefined)
    setMessages([])
    setAttachedMaterials([])
    inputRef.current?.focus()
  }

  // Delete session
  const handleDeleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await apiFetch(`${API}/sessions/${sid}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== sid))
      if (activeSession === sid) handleNewChat()
    } catch {
      antMessage.error('Failed to delete session')
    }
  }

  // Send message
  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: attachedMaterials.length > 0
        ? `📎 ${attachedMaterials.map(m => m.file_name).join(', ')}\n\n${text}`
        : text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    const attached = [...attachedMaterials]
    setAttachedMaterials([])
    setLoading(true)

    try {
      const body: Record<string, unknown> = {
        message: text,
        session_id: activeSession,
        project_id: projectId,
      }
      if (attached.length === 1) body.material_id = attached[0].id
      if (attached.length > 0) body.attached_material_ids = attached.map(m => m.id)

      const res = await apiFetch<{ session_id: string; reply: string; tool_calls: ToolCall[] }>(
        `${API}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      setActiveSession(res.session_id)

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.reply,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])

      // Store tool calls mapped to this assistant message
      if (res.tool_calls?.length > 0) {
        setToolCallsMap(prev => ({ ...prev, [assistantMsg.id]: res.tool_calls }))
      }

      loadSessions()
    } catch (err: unknown) {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
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

  const toggleAttachMaterial = (mat: Material) => {
    setAttachedMaterials(prev =>
      prev.find(m => m.id === mat.id)
        ? prev.filter(m => m.id !== mat.id)
        : [...prev, mat]
    )
  }

  const suggestions = [
    'Apa saja materi yang sudah saya upload?',
    'Jelaskan konsep dari materi saya',
    'Bagaimana hasil quiz saya terakhir?',
    'Buatkan ringkasan topik yang perlu dipelajari',
  ]

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 rounded-[2rem] overflow-hidden border border-slate-200/60 shadow-xl bg-white">

      {/* ── Session sidebar ── */}
      <div className={`${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-72'} transition-all duration-300 border-r border-slate-100 flex flex-col bg-slate-50/50 shrink-0`}>
        <div className="p-4 border-b border-slate-100">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-2">Recent Conversations</p>
          {sessions.length === 0 && (
            <p className="text-xs text-slate-400 px-2 py-4 text-center">No conversations yet</p>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => handleSelectSession(s.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${
                s.id === activeSession
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                  : 'hover:bg-white text-slate-600 border border-transparent'
              }`}
            >
              <Bot className="w-4 h-4 shrink-0 opacity-50" />
              <span className="text-xs font-medium truncate flex-1">{s.title || 'Untitled'}</span>
              <button
                onClick={(e) => handleDeleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all rounded-lg"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Capabilities info */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/60 space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Can Access</p>
            {[
              { icon: <BookOpen className="w-3 h-3" />, label: 'Your uploaded materials' },
              { icon: <BrainCircuit className="w-3 h-3" />, label: 'Your quiz results' },
              { icon: <Globe className="w-3 h-3" />, label: 'Web (with sources)' },
            ].map((cap, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="text-indigo-500">{cap.icon}</span>
                {cap.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-white">
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${sidebarCollapsed ? '-rotate-90' : 'rotate-90'}`} />
          </button>
          <div className="w-9 h-9 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800">LuminaPrep AI</p>
            <p className="text-[10px] text-slate-400 font-medium">
              {activeSession ? 'Active session' : 'Start a new conversation'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-6 max-w-lg mx-auto">
              <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center border border-indigo-100">
                <Sparkles className="w-8 h-8 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 mb-2">LuminaPrep AI Assistant</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Tanya apa saja — dari materi yang kamu upload, hasil quiz, hingga pengetahuan umum dari internet.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); inputRef.current?.focus() }}
                    className="px-4 py-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-2xl text-xs font-medium text-left transition-all border border-slate-200 hover:border-indigo-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                toolCalls={msg.role === 'assistant' ? toolCallsMap[msg.id] : undefined}
              />
            ))
          )}

          {/* Typing indicator */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="bg-white border border-slate-200/80 rounded-3xl rounded-tl-sm px-5 py-3.5 shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="px-6 pb-6 pt-3 border-t border-slate-100 bg-white space-y-3">
          {/* Attached materials */}
          <AnimatePresence>
            {attachedMaterials.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2"
              >
                {attachedMaterials.map(mat => (
                  <div key={mat.id} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-medium text-indigo-700">
                    <FileText className="w-3 h-3" />
                    <span className="max-w-[160px] truncate">{mat.file_name}</span>
                    <button onClick={() => toggleAttachMaterial(mat)} className="text-indigo-400 hover:text-indigo-700">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Material attach picker */}
          <AnimatePresence>
            {showAttachPicker && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="bg-white border border-slate-200 rounded-2xl p-3 shadow-lg max-h-48 overflow-y-auto"
              >
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Attach Material</p>
                {materials.length === 0 ? (
                  <p className="text-xs text-slate-400 px-1 py-2">No completed materials available</p>
                ) : (
                  materials.map(mat => (
                    <button
                      key={mat.id}
                      onClick={() => { toggleAttachMaterial(mat); setShowAttachPicker(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-xs ${
                        attachedMaterials.find(m => m.id === mat.id)
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <FileText className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="truncate">{mat.file_name}</span>
                      {attachedMaterials.find(m => m.id === mat.id) && (
                        <span className="ml-auto text-indigo-500 font-black">✓</span>
                      )}
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input box */}
          <div className="flex gap-3 items-end bg-slate-50 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
            <Tooltip title="Attach material">
              <button
                onClick={() => setShowAttachPicker(v => !v)}
                className={`p-1.5 rounded-xl transition-all shrink-0 ${showAttachPicker || attachedMaterials.length > 0 ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </Tooltip>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your materials, quizzes, or any topic..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 resize-none outline-none max-h-32 leading-relaxed"
              style={{ minHeight: '22px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-9 h-9 bg-indigo-600 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl flex items-center justify-center transition-all shrink-0 hover:bg-indigo-500 active:scale-95"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-300 text-center font-medium">
            Enter to send · Shift+Enter for new line · Attach materials for context
          </p>
        </div>
      </div>
    </div>
  )
}
