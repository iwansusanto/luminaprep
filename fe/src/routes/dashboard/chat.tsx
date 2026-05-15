import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Bot, User, Trash2, Plus, Loader2,
  X, FileText, ChevronDown, Sparkles,
  Globe, BookOpen, BrainCircuit,
} from 'lucide-react'
import { message as antMessage, Tooltip } from 'antd'
import { useStreamChat } from '../../hooks/useStreamChat'
import { ToolBadge } from '../../components/shared/ToolBadge'

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
  id?: string
  result?: Record<string, unknown>
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

// ── Tool Call Accordion ───────────────────────────────────────────────────────
function ToolCallAccordion({ toolCall }: { toolCall: ToolCall }) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 group"
      >
        <ToolBadge tool={toolCall.tool} />
        {toolCall.result && (
          <ChevronDown 
            className={`w-3 h-3 text-slate-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>
      
      <AnimatePresence>
        {isOpen && toolCall.result && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-2">
                {/* Arguments */}
                {Object.keys(toolCall.args).length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Arguments
                    </p>
                    <pre className="text-xs text-slate-600 overflow-auto max-h-32 bg-white p-2 rounded border border-slate-200">
                      {JSON.stringify(toolCall.args, null, 2)}
                    </pre>
                  </div>
                )}
                
                {/* Result */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Result
                  </p>
                  <div className="text-xs text-slate-700 bg-white p-3 rounded border border-slate-200 max-h-64 overflow-auto">
                    {renderToolResult(toolCall.result)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Helper function to render tool results in a user-friendly way
function renderToolResult(result: Record<string, unknown>): React.ReactNode {
  // Handle get_context results
  if ('projects' in result || 'materials' in result || 'quizzes' in result) {
    return (
      <div className="space-y-3">
        {result.projects && Array.isArray(result.projects) && (
          <div>
            <p className="font-semibold text-slate-700 mb-1">
              Projects ({result.projects.length})
            </p>
            {result.projects.length === 0 ? (
              <p className="text-slate-500 italic">No projects found</p>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {result.projects.map((p: any, i: number) => (
                  <li key={i} className="text-slate-600">
                    {p.title} <span className="text-slate-400">({p.status})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {result.materials && Array.isArray(result.materials) && (
          <div>
            <p className="font-semibold text-slate-700 mb-1">
              Materials ({result.materials.length})
            </p>
            {result.materials.length === 0 ? (
              <p className="text-slate-500 italic">No materials found</p>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {result.materials.slice(0, 10).map((m: any, i: number) => (
                  <li key={i} className="text-slate-600">
                    {m.file_name} <span className="text-slate-400">({m.status})</span>
                  </li>
                ))}
                {result.materials.length > 10 && (
                  <li className="text-slate-500 italic">
                    ... and {result.materials.length - 10} more
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
        
        {result.quizzes && Array.isArray(result.quizzes) && (
          <div>
            <p className="font-semibold text-slate-700 mb-1">
              Quizzes ({result.quizzes.length})
            </p>
            {result.quizzes.length === 0 ? (
              <p className="text-slate-500 italic">No quizzes found</p>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {result.quizzes.slice(0, 10).map((q: any, i: number) => (
                  <li key={i} className="text-slate-600">
                    {q.topic || 'Untitled'} - {q.question_count} questions
                  </li>
                ))}
                {result.quizzes.length > 10 && (
                  <li className="text-slate-500 italic">
                    ... and {result.quizzes.length - 10} more
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    )
  }
  
  // Handle search_material results
  if ('results' in result && Array.isArray(result.results)) {
    return (
      <div>
        <p className="font-semibold text-slate-700 mb-2">
          Found {result.results.length} results
        </p>
        <div className="space-y-2">
          {result.results.slice(0, 5).map((r: any, i: number) => (
            <div key={i} className="p-2 bg-slate-50 rounded border border-slate-200">
              <p className="text-slate-700">{r.text || r.content}</p>
              {r.metadata && (
                <p className="text-xs text-slate-500 mt-1">
                  Source: {r.metadata.source || 'Unknown'}
                </p>
              )}
            </div>
          ))}
          {result.results.length > 5 && (
            <p className="text-slate-500 italic text-xs">
              ... and {result.results.length - 5} more results
            </p>
          )}
        </div>
      </div>
    )
  }
  
  // Default: show raw JSON
  return (
    <pre className="text-xs overflow-auto">
      {JSON.stringify(result, null, 2)}
    </pre>
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
        {/* Enhanced tool badges with expandable results */}
        {!isUser && toolCalls && toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 w-full">
            {toolCalls.map((tc, i) => (
              <ToolCallAccordion key={i} toolCall={tc} />
            ))}
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
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [attachedMaterials, setAttachedMaterials] = useState<Material[]>([])
  const [showAttachPicker, setShowAttachPicker] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { streaming, streamedContent, toolCalls: streamingToolCalls, startStream, stopStream } = useStreamChat()

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loadingHistory, streamedContent])

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
    stopStream()
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
    stopStream()
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
    if (!text || streaming) return

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

    startStream(
      {
        message: text,
        sessionId: activeSession,
        projectId,
        materialId: attached.length === 1 ? attached[0].id : undefined,
        attachedMaterialIds: attached.length > 0 ? attached.map(m => m.id) : undefined,
      },
      (newSessionId, finalContent, finalToolCalls) => {
        setActiveSession(newSessionId || activeSession)

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: finalContent,
          created_at: new Date().toISOString(),
        }

        setMessages(prev => [...prev, assistantMsg])

        if (finalToolCalls.length > 0) {
          setToolCallsMap(prev => ({ ...prev, [assistantMsg.id]: finalToolCalls }))
        }

        loadSessions()
      },
      (_errorMsg) => {
        const errMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, errMsg])
      }
    )
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

          {/* Show streaming message in real-time */}
          {streaming && streamedContent && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="max-w-[75%] space-y-2 flex flex-col items-start">
                {streamingToolCalls.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {streamingToolCalls.map((tc, i) => <ToolBadge key={i} tool={tc.tool} />)}
                  </div>
                )}
                <div className="px-5 py-3.5 rounded-3xl rounded-tl-sm text-sm leading-relaxed whitespace-pre-wrap bg-white text-slate-700 border border-slate-200/80 shadow-sm">
                  {streamedContent}
                  <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-1 animate-pulse" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Typing indicator (only show when streaming but no content yet) */}
          {streaming && !streamedContent && (
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
              disabled={!input.trim() || streaming}
              className="w-9 h-9 bg-indigo-600 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl flex items-center justify-center transition-all shrink-0 hover:bg-indigo-500 active:scale-95"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
