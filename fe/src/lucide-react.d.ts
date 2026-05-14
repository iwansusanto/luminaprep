declare module 'lucide-react' {
  import type { FC, SVGProps } from 'react'
  export type LucideProps = SVGProps<SVGSVGElement> & {
    size?: number | string
    strokeWidth?: number | string
    absoluteStrokeWidth?: boolean
  }
  export type LucideIcon = FC<LucideProps>

  export const Activity: LucideIcon
  export const AlertCircle: LucideIcon
  export const AlertTriangle: LucideIcon
  export const AlignLeft: LucideIcon
  export const ArrowLeft: LucideIcon
  export const ArrowRight: LucideIcon
  export const ArrowUpRight: LucideIcon
  export const BarChart3: LucideIcon
  export const BookOpen: LucideIcon
  export const Bot: LucideIcon
  export const BrainCircuit: LucideIcon
  export const Calendar: LucideIcon
  export const Check: LucideIcon
  export const CheckCircle: LucideIcon
  export const CheckCircle2: LucideIcon
  export const ChevronDown: LucideIcon
  export const ChevronLeft: LucideIcon
  export const ChevronRight: LucideIcon
  export const ChevronUp: LucideIcon
  export const Clock: LucideIcon
  export const Copy: LucideIcon
  export const Download: LucideIcon
  export const Edit: LucideIcon
  export const ExternalLink: LucideIcon
  export const Eye: LucideIcon
  export const FileText: LucideIcon
  export const Filter: LucideIcon
  export const Globe: LucideIcon
  export const History: LucideIcon
  export const Home: LucideIcon
  export const Info: LucideIcon
  export const Layout: LucideIcon
  export const LayoutDashboard: LucideIcon
  export const Loader2: LucideIcon
  export const Lock: LucideIcon
  export const LogOut: LucideIcon
  export const Mail: LucideIcon
  export const Menu: LucideIcon
  export const MessageCircle: LucideIcon
  export const MessageSquare: LucideIcon
  export const MessageSquarePlus: LucideIcon
  export const Moon: LucideIcon
  export const MoreVertical: LucideIcon
  export const Plus: LucideIcon
  export const PlusCircle: LucideIcon
  export const RefreshCw: LucideIcon
  export const Save: LucideIcon
  export const Search: LucideIcon
  export const Send: LucideIcon
  export const Settings: LucideIcon
  export const Shield: LucideIcon
  export const ShieldCheck: LucideIcon
  export const Sparkles: LucideIcon
  export const Star: LucideIcon
  export const Sun: LucideIcon
  export const Target: LucideIcon
  export const Trash2: LucideIcon
  export const Trophy: LucideIcon
  export const Upload: LucideIcon
  export const UploadCloud: LucideIcon
  export const User: LucideIcon
  export const Users: LucideIcon
  export const X: LucideIcon
  export const Zap: LucideIcon
}
