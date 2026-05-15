# Frontend: Public Quiz Feature Implementation Plan

## Overview
Enable users to publish their generated quizzes and allow other logged-in users to discover and attempt those public quizzes.

**Flow:**
1. User generates a quiz → quiz appears in "My Quizzes" list
2. User clicks the `MoreVertical` menu → selects "Publish" → quiz becomes public
3. Other users navigate to "Explore Quizzes" → see the published quiz in a list
4. Other users click "Attempt" → take the quiz using the same session flow as private quizzes
5. After completion → redirected back to "Explore Quizzes"

---

## Files to Modify / Create

### 1. `fe/src/routes/dashboard/quizzes/index.tsx` — Wire Publish/Unpublish

**Current State:**
- Line 244: `MoreVertical` button is a visual stub with no `onClick` handler
- No dropdown menu exists

**Changes Required:**

#### A. Add state to track published quizzes
```typescript
const [publishedQuizIds, setPublishedQuizIds] = useState<Set<string>>(new Set())
```

#### B. Fetch published quiz IDs on page load
In the existing `fetchData` function (around line 97), after fetching quizzes and materials, add:
```typescript
// Fetch list of all public quizzes to know which ones are published
const publicQuizzesRes = await api.get<Array<{ quiz_id: string }>>('/public_quizzes')
const published = new Set(publicQuizzesRes.map(pq => pq.quiz_id))
setPublishedQuizIds(published)
```

#### C. Import Ant Design Dropdown
Add to imports (line 5):
```typescript
import { Skeleton, message, Dropdown, Menu } from 'antd'
```

#### D. Replace the stub MoreVertical button (lines 244-246)
Replace:
```tsx
<button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
  <MoreVertical className="w-4 h-4" />
</button>
```

With:
```tsx
<Dropdown
  menu={{
    items: [
      {
        key: 'publish',
        label: 'Publish',
        onClick: () => handlePublishQuiz(info.row.original.id, info.row.original.project_id),
        disabled: info.row.original.status !== 'completed' || publishedQuizIds.has(info.row.original.id),
      },
      {
        key: 'unpublish',
        label: 'Unpublish',
        onClick: () => handleUnpublishQuiz(info.row.original.id),
        disabled: !publishedQuizIds.has(info.row.original.id),
      },
    ],
  }}
  trigger={['click']}
>
  <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
    <MoreVertical className="w-4 h-4" />
  </button>
</Dropdown>
```

#### E. Add handler functions
Add these functions inside the `QuizzesPage` component (before the return statement):

```typescript
const handlePublishQuiz = async (quizId: string, projectId: string) => {
  try {
    // Get the first material from the project (pragmatic approach)
    const material = materials.find(m => m.project_id === projectId)
    if (!material) {
      message.error('No material found for this quiz')
      return
    }

    await api.post('/public_quizzes', {
      quiz_id: quizId,
      material_id: material.id,
    })

    message.success('Quiz published successfully!')
    // Update published set
    setPublishedQuizIds(prev => new Set([...prev, quizId]))
  } catch (error) {
    message.error('Failed to publish quiz')
    console.error(error)
  }
}

const handleUnpublishQuiz = async (quizId: string) => {
  try {
    await api.delete(`/public_quizzes/${quizId}`)
    message.success('Quiz unpublished successfully!')
    // Update published set
    setPublishedQuizIds(prev => {
      const updated = new Set(prev)
      updated.delete(quizId)
      return updated
    })
  } catch (error) {
    message.error('Failed to unpublish quiz')
    console.error(error)
  }
}
```

---

### 2. `fe/src/components/dashboard/Sidebar.tsx` — Add Explore Link

**Current State:**
- Sidebar has nav items for Dashboard, Materials, Quizzes, etc.

**Changes Required:**

#### A. Add a new nav item for "Explore Quizzes"
Find the existing nav items (likely in a list or map) and add:
```tsx
{
  icon: <Sparkles className="w-5 h-5" />,
  label: 'Explore',
  to: '/dashboard/public-quizzes',
}
```

Or if using a different pattern, add a `<Link>` to `/dashboard/public-quizzes` with label "Explore Quizzes" or "Public Quizzes".

**Icon suggestion:** Use `Sparkles` from lucide-react (already imported in other files) or `Globe` for a public/explore feel.

---

### 3. `fe/src/routes/dashboard/public-quizzes/index.tsx` — New Public Quiz List Page

**Create new file** at: `fe/src/routes/dashboard/public-quizzes/index.tsx`

**Template:**

```typescript
import { useMemo, useState, useEffect, useCallback } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { api } from '../../../lib/api'
import { Skeleton, message } from 'antd'
import {
  Search,
  Filter,
  Sparkles,
  Globe,
  Calendar,
} from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table'
import { DataTable } from '../../../components/dashboard/DataTable'

export const Route = createFileRoute('/dashboard/public-quizzes/')({
  component: PublicQuizzesPage,
})

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
}

type PublicQuiz = {
  quiz_id: string
  topic: string | null
  difficulty_level: string
  question_count: number
  created_at: string
}

const complexityMap: Record<string, 'Beginner' | 'Intermediate' | 'Mastery'> = {
  'beginner': 'Beginner',
  'intermediate': 'Intermediate',
  'expert': 'Mastery'
}

const columnHelper = createColumnHelper<PublicQuiz>()

function PublicQuizzesPage() {
  const [quizzes, setQuizzes] = useState<PublicQuiz[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPublicQuizzes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<PublicQuiz[]>('/public_quizzes')
      setQuizzes(data)
    } catch (error) {
      message.error('Failed to load public quizzes')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPublicQuizzes()
  }, [fetchPublicQuizzes])

  const columns = useMemo(() => [
    columnHelper.accessor('topic', {
      header: 'Topic',
      cell: info => (
        <span className="font-semibold text-slate-700">
          {info.getValue() || 'Untitled'}
        </span>
      ),
    }),
    columnHelper.accessor('difficulty_level', {
      header: 'Difficulty',
      cell: info => {
        const level = info.getValue()
        const mapped = complexityMap[level] || level
        const colors: Record<string, string> = {
          'Beginner': 'bg-emerald-100 text-emerald-700',
          'Intermediate': 'bg-amber-100 text-amber-700',
          'Mastery': 'bg-rose-100 text-rose-700',
        }
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[mapped] || 'bg-slate-100 text-slate-700'}`}>
            {mapped}
          </span>
        )
      },
    }),
    columnHelper.accessor('question_count', {
      header: 'Questions',
      cell: info => (
        <span className="text-slate-600 font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('created_at', {
      header: 'Published',
      cell: info => {
        const date = new Date(info.getValue())
        return (
          <span className="text-slate-500 text-sm">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="text-right block">Actions</span>,
      cell: info => (
        <div className="flex items-center justify-end gap-3 pr-4">
          <Link
            to="/dashboard/public-quizzes/attempt/$uuid"
            params={{ uuid: info.row.original.quiz_id }}
            className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 bg-slate-900 text-white hover:bg-violet-600 shadow-slate-900/10"
          >
            Attempt
          </Link>
        </div>
      ),
    }),
  ], [])

  const table = useReactTable({
    data: quizzes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  })

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-20"
    >
      {/* Page Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 text-[10px] font-black uppercase tracking-widest mb-4">
            <Globe className="w-3 h-3" />
            Community
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">
            Explore Quizzes
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-3">Discover and attempt quizzes shared by the community.</p>
        </div>
      </motion.div>

      {/* Quizzes Table */}
      <motion.div variants={item} className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="relative group flex-1 max-w-md">
            <Search strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Filter quizzes..."
              className="w-full pl-11 pr-6 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all shadow-sm">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            <Skeleton active />
            <Skeleton active />
            <Skeleton active />
          </div>
        ) : quizzes.length > 0 ? (
          <DataTable table={table} totalItems={quizzes.length} />
        ) : (
          <div className="py-24 px-8 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100">
              <Sparkles className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">No public quizzes yet</h3>
            <p className="text-slate-500 font-medium max-w-xs mx-auto">
              Check back soon! Community members will be sharing their quizzes here.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
```

---

### 4. `fe/src/routes/dashboard/public-quizzes/attempt.$uuid.tsx` — New Public Quiz Attempt Page

**Create new file** at: `fe/src/routes/dashboard/public-quizzes/attempt.$uuid.tsx`

**Template:**

Copy the entire content of `fe/src/routes/dashboard/quizzes/start.$uuid.tsx` and make these changes:

#### A. Update the route definition (line 7)
```typescript
export const Route = createFileRoute('/dashboard/public-quizzes/attempt/$uuid')({
  component: AttemptPublicQuizPage,
})
```

#### B. Rename the component function (line 35)
```typescript
function AttemptPublicQuizPage() {
```

#### C. Change the session-start API call (line 66)
Replace:
```typescript
const sessionRes = await fetch(`/api/v1/quizzes/${uuid}/sessions`, {
```

With:
```typescript
const sessionRes = await fetch(`/api/v1/public_quizzes/${uuid}/sessions`, {
```

#### D. Update the navigation on completion (line 144)
Replace:
```typescript
navigate({ to: '/dashboard/quizzes' })
```

With:
```typescript
navigate({ to: '/dashboard/public-quizzes' })
```

#### E. (Optional) Change the color theme to violet/purple
- Line 191: Change `bg-emerald-500` to `bg-violet-500`
- Line 210: Change `bg-emerald-500` to `bg-violet-500`
- Line 216: Change `text-emerald-400` to `text-violet-400`
- Line 230: Change `bg-emerald-50` and `text-emerald-600` to violet equivalents
- Line 248: Change `border-emerald-500` and `bg-emerald-50` to violet
- Line 249: Change `border-emerald-300` and `bg-emerald-50/30` to violet
- Line 255: Change `bg-emerald-500` and `border-emerald-500` to violet
- Line 262: Change `text-emerald-500` to `text-violet-500`
- Line 292: Change `hover:bg-emerald-500` to `hover:bg-violet-500`

---

## Implementation Checklist

- [ ] **Step 1:** Modify `fe/src/routes/dashboard/quizzes/index.tsx`
  - [ ] Add `publishedQuizIds` state
  - [ ] Fetch published quiz IDs in `fetchData`
  - [ ] Import `Dropdown` and `Menu` from Ant Design
  - [ ] Replace `MoreVertical` stub with Dropdown menu
  - [ ] Add `handlePublishQuiz` function
  - [ ] Add `handleUnpublishQuiz` function

- [ ] **Step 2:** Modify `fe/src/components/dashboard/Sidebar.tsx`
  - [ ] Add "Explore" nav link to `/dashboard/public-quizzes`

- [ ] **Step 3:** Create `fe/src/routes/dashboard/public-quizzes/index.tsx`
  - [ ] Copy template above
  - [ ] Verify imports and styling

- [ ] **Step 4:** Create `fe/src/routes/dashboard/public-quizzes/attempt.$uuid.tsx`
  - [ ] Copy from `start.$uuid.tsx`
  - [ ] Update route definition
  - [ ] Update session-start API endpoint
  - [ ] Update completion navigation
  - [ ] (Optional) Update color theme to violet

- [ ] **Step 5:** Test
  - [ ] Publish a quiz from "My Quizzes"
  - [ ] Verify it appears in "Explore Quizzes"
  - [ ] Attempt the public quiz
  - [ ] Verify completion redirects to "Explore Quizzes"
  - [ ] Unpublish the quiz
  - [ ] Verify it disappears from "Explore Quizzes"

---

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/v1/public_quizzes` | List all public quizzes |
| `POST` | `/api/v1/public_quizzes` | Publish a quiz |
| `DELETE` | `/api/v1/public_quizzes/{quiz_id}` | Unpublish a quiz |
| `POST` | `/api/v1/public_quizzes/{quiz_id}/sessions` | Start a public quiz attempt |
| `GET` | `/api/v1/quiz_sessions/{session_id}/questions` | Load questions (reused) |
| `POST` | `/api/v1/quiz_sessions/{session_id}/submit_answer` | Submit answer (reused) |
| `POST` | `/api/v1/quiz_sessions/{session_id}/complete` | Complete session (reused) |

---

## Notes

- **Material ID:** When publishing, we use `materials[0].id` from the project. This is pragmatic since all quizzes in a project share the same materials pool.
- **Color Scheme:** Public quiz attempt uses violet/purple to distinguish from private quiz attempts (emerald/start, amber/continue, indigo/retake).
- **Reusability:** The quiz attempt page is nearly identical to `start.$uuid.tsx` — only the session-start endpoint differs.
- **Auth:** All routes are under `/dashboard/*`, so they're automatically protected by the existing auth guard in `dashboard.tsx`.
