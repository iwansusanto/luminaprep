import { useState, useEffect, useCallback, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import { Skeleton, message, Modal, ConfigProvider } from 'antd'
import {
  Plus,
  FileText,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table'
import { DataTable } from '../../components/dashboard/DataTable'
import { MaterialUploader } from '../../components/dashboard/MaterialUploader'
import { QuizGenerationDrawer } from '../../components/dashboard/QuizGenerationDrawer'
import { setting_material } from '../../lib/utils'

export const Route = createFileRoute('/dashboard/materials')({
  component: MaterialsPage,
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

interface Material {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: string;
  file_size: number | null;
  citations: string | null;
  status: string;
  summary: string | null;
  project_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const getFileStyles = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('pdf')) return { color: 'text-rose-500', bgColor: 'bg-rose-50' };
  if (t.includes('doc')) return { color: 'text-blue-500', bgColor: 'bg-blue-50' };
  if (t.includes('ppt')) return { color: 'text-orange-500', bgColor: 'bg-orange-50' };
  if (t.includes('xls')) return { color: 'text-emerald-500', bgColor: 'bg-emerald-50' };
  return { color: 'text-indigo-500', bgColor: 'bg-indigo-50' };
}

const columnHelper = createColumnHelper<Material>()

function MaterialsPage() {
  const auth = useAuth()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false)
  const [quizDrawerVisible, setQuizDrawerVisible] = useState(false)
  const [selectedMaterialForQuiz, setSelectedMaterialForQuiz] = useState<Material | null>(null)

  const projectId = auth?.user?.projects?.[0]?.id

  const fetchMaterials = useCallback(async () => {
    if (!projectId) return;
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/materials/project/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setMaterials(Array.isArray(data.materials) ? data.materials : [])
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error)
      message.error('Failed to load materials')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  const handleRemoveMaterial = async (id: string) => {
    Modal.confirm({
      title: 'Remove Material',
      content: 'Are you sure you want to remove this material? This action cannot be undone.',
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      onOk: async () => {
        try {
          const response = await fetch(`/api/v1/materials/${id}`, {
            method: 'DELETE',
          })
          if (response.ok) {
            setMaterials(prev => prev.filter(m => m.id !== id))
            message.success('Material removed successfully')
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || errorData.message || 'Failed to remove material')
          }
        } catch (error: any) {
          console.error('Failed to remove material:', error)
          message.error(error.message || 'Failed to remove material')
        }
      },
    })
  }

  const handleOpenQuizDrawer = (material: Material) => {
    setSelectedMaterialForQuiz(material)
    setQuizDrawerVisible(true)
  }

  const handleGenerateQuiz = (materialId: string) => {
    // This could trigger a refresh or navigate to the quiz page
    console.log('Generating quiz for material:', materialId)
    setQuizDrawerVisible(false)
    message.success('Quiz generation initialized')
  }

  const data = materials;

  const columns = useMemo(() => [
    columnHelper.accessor('file_name', {
      header: 'File Name',
      cell: info => {
        const { color, bgColor } = getFileStyles(info.row.original.file_type);
        return (
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${bgColor} ${color} rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500`}>
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800 leading-none mb-1.5">{info.getValue()}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{info.row.original.file_type}</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Added',
      cell: info => <span className="text-sm font-medium text-slate-500">{new Date(info.getValue()).toLocaleDateString()}</span>,
    }),
    columnHelper.accessor('file_size', {
      header: 'Size',
      cell: info => <span className="text-sm font-medium text-slate-500">{info.getValue() ? formatBytes(info.getValue() as number) : 'N/A'}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="text-right block pr-8">Actions</span>,
      cell: (info) => (
        <div className="flex items-center justify-end gap-2 pr-4 transition-all duration-300">
          <button
            onClick={() => handleOpenQuizDrawer(info.row.original)}
            className="group/btn flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] hover:bg-indigo-600 hover:text-white transition-all duration-500 shadow-sm border border-slate-100 hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-200 active:scale-95"
          >
            <Sparkles className="w-3 h-3 group-hover/btn:rotate-12 transition-transform" />
            Generate Quiz
          </button>
          <button
            onClick={() => handleRemoveMaterial(info.row.original.id)}
            className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300 hover:rotate-6 active:scale-90"
            title="Delete Material"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    }),
  ], [])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black uppercase tracking-widest mb-4">
            Repository
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">
            Study Materials
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-3">Manage and organize your learning resources.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadModalVisible(true)}
            disabled={materials.length >= setting_material.maximal}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {materials.length >= setting_material.maximal ? 'Limit Reached' : 'Add New'}
          </button>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <motion.div variants={item} className="flex justify-end">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none bg-white border border-slate-200/60 rounded-3xl p-4 flex items-center gap-4 shadow-sm min-w-[200px]">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Files</p>
              <p className="text-lg font-black text-slate-800">{materials.length}</p>
            </div>
          </div>
          <div className="flex-1 sm:flex-none bg-white border border-slate-200/60 rounded-3xl p-4 flex items-center gap-4 shadow-sm min-w-[200px]">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Slots Left</p>
              <p className="text-lg font-black text-slate-800">
                {Math.max(0, setting_material.maximal - materials.length)}
              </p>
            </div>
          </div>
          <div className="flex-1 sm:flex-none bg-white border border-slate-200/60 rounded-3xl p-4 flex items-center gap-4 shadow-sm min-w-[200px]">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Storage</p>
              <p className="text-lg font-black text-slate-800">
                {formatBytes(materials.reduce((acc, m) => acc + (m.file_size || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Materials Table/List */}
      <motion.div variants={item} className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <Skeleton active />
            <Skeleton active />
            <Skeleton active />
          </div>
        ) : materials.length > 0 ? (
          <DataTable table={table} totalItems={data.length} />
        ) : (
          <div className="py-24 px-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-30 pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[100px] rounded-full" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[100px] rounded-full" />
            </div>

            <div className="relative mb-10 group">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full group-hover:bg-indigo-500/10 transition-colors"
              />
              <div className="relative w-32 h-32 bg-white rounded-[3.5rem] shadow-2xl shadow-indigo-500/10 border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-700 ease-out">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-white rounded-[2rem] flex items-center justify-center border border-indigo-100/50">
                  <FileText className="w-10 h-10 text-indigo-600" />
                </div>
              </div>
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                className="absolute -top-3 -right-3 w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 border-4 border-white"
              >
                <Plus className="w-7 h-7" />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-md"
            >
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Your repository is empty</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-12">
                Start your journey by uploading study materials. Lumina will process them to unlock quizzes, insights, and mastery tracks.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setIsUploadModalVisible(true)}
                  className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-200 active:scale-95 flex items-center justify-center gap-3 group"
                >
                  <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  Upload First Material
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>

      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#6366f1',
            borderRadius: 24,
          },
        }}
      >
        <Modal
          open={isUploadModalVisible}
          onCancel={() => setIsUploadModalVisible(false)}
          footer={null}
          width={800}
          centered
          styles={{
            mask: {
              backdropFilter: 'blur(12px)',
              background: 'rgba(15, 23, 42, 0.4)',
            },
          }}
          modalRender={(node) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative overflow-hidden rounded-[3rem] bg-white border border-white/50 shadow-2xl"
            >
              {node}
            </motion.div>
          )}
        >
          <div className="p-2">
            <MaterialUploader
              projectId={projectId}
              currentCount={materials.length}
              onUploadSuccess={() => {
                fetchMaterials()
                setIsUploadModalVisible(false)
              }}
              className="bg-transparent border-none shadow-none p-0"
            />
          </div>
        </Modal>
      </ConfigProvider>

      <QuizGenerationDrawer
        isVisible={quizDrawerVisible}
        onClose={() => setQuizDrawerVisible(false)}
        material={selectedMaterialForQuiz}
        onGenerate={handleGenerateQuiz}
      />
    </motion.div>
  )
}
