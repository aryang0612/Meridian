// Modern Professional Icon System
// Centralized icon configuration for consistent UI/UX

import {
  // Navigation & UI
  Home,
  BarChart3,
  Settings,
  HelpCircle,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  
  // File & Data Management
  Upload,
  Download,
  FileText,
  File,
  FolderOpen,
  Save,
  RefreshCw,
  
  // Financial & Business
  DollarSign,
  CreditCard,
  Building2,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart,
  Calculator,
  Receipt,
  
  // Status & Feedback
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  
  // Actions & Tools
  Edit,
  Trash2,
  Search,
  Filter,
  Copy,
  Share,
  Zap,
  Target,
  
  // Categories & Organization
  Tag,
  Bookmark,
  Archive,
  Folder,
  Users,
  User,
  
  // Transportation & Services
  Car,
  Truck,
  Plane,
  Wifi,
  Phone,
  Mail,
  
  // Security & System
  Shield,
  Lock,
  Key,
  Database,
  Cloud,
  Server,
  
  // Communication
  MessageCircle,
  Bell,
  BellOff,
  Send,
  
  // Time & Calendar
  Calendar,
  Clock,
  Timer,
  
  // Shopping & Commerce
  ShoppingCart,
  Store,
  Package,
  
  // Utilities
  Wrench,
  Cog,
  Sliders,
  
  type LucideIcon
} from 'lucide-react';

// Icon Categories for organized access
export const AppIcons = {
  // Navigation
  navigation: {
    home: Home,
    dashboard: BarChart3,
    reports: PieChart,
    settings: Settings,
    help: HelpCircle,
    menu: Menu,
    close: X,
    back: ChevronLeft,
    forward: ChevronRight,
    expand: ChevronDown,
    collapse: ChevronRight,
  },

  // File Operations
  files: {
    upload: Upload,
    download: Download,
    file: FileText,
    document: File,
    folder: FolderOpen,
    save: Save,
    refresh: RefreshCw,
  },

  // Financial Icons
  financial: {
    money: DollarSign,
    creditCard: CreditCard,
    business: Building2,
    trending: TrendingUp,
    decline: TrendingDown,
    chart: BarChart,
    pie: PieChart,
    calculator: Calculator,
    receipt: Receipt,
  },

  // Status & Feedback
  status: {
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Info,
    approved: CheckCircle,
    pending: Clock,
    processing: RefreshCw,
  },

  // Actions
  actions: {
    edit: Edit,
    delete: Trash2,
    search: Search,
    filter: Filter,
    copy: Copy,
    share: Share,
    add: Plus,
    remove: Minus,
    ai: Zap,
    target: Target,
  },

  // Feedback
  feedback: {
    thumbsUp: ThumbsUp,
    thumbsDown: ThumbsDown,
    correct: CheckCircle,
    incorrect: X,
    view: Eye,
    hide: EyeOff,
  },

  // Categories
  categories: {
    tag: Tag,
    bookmark: Bookmark,
    archive: Archive,
    folder: Folder,
    users: Users,
    user: User,
  },

  // Business Categories
  business: {
    office: Building2,
    vehicle: Car,
    transport: Truck,
    travel: Plane,
    utilities: Wifi,
    phone: Phone,
    communication: Mail,
    shopping: ShoppingCart,
    store: Store,
    package: Package,
  },

  // Security
  security: {
    shield: Shield,
    lock: Lock,
    key: Key,
    secure: Shield,
  },

  // System
  system: {
    database: Database,
    cloud: Cloud,
    server: Server,
    tools: Wrench,
    settings: Cog,
    controls: Sliders,
  },

  // Communication
  communication: {
    message: MessageCircle,
    notification: Bell,
    mute: BellOff,
    send: Send,
  },

  // Time
  time: {
    calendar: Calendar,
    clock: Clock,
    timer: Timer,
  },
} as const;

// Icon sizes for consistent sizing
export const IconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-10 h-10',
  '3xl': 'w-12 h-12',
  '4xl': 'w-16 h-16',
} as const;

// Icon colors for consistent theming
export const IconColors = {
  primary: 'text-purple-600',
  secondary: 'text-slate-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
  info: 'text-blue-600',
  muted: 'text-slate-400',
  white: 'text-white',
  current: 'text-current',
} as const;

// Helper function to get icon with consistent styling
export const getIcon = (
  category: keyof typeof AppIcons,
  name: string,
  size: keyof typeof IconSizes = 'md',
  color: keyof typeof IconColors = 'current'
): { icon: LucideIcon; className: string } => {
  const iconCategory = AppIcons[category] as Record<string, LucideIcon>;
  const icon = iconCategory[name];
  
  if (!icon) {
    console.warn(`Icon not found: ${category}.${name}`);
    return { icon: AlertCircle, className: `${IconSizes[size]} ${IconColors.error}` };
  }
  
  return {
    icon,
    className: `${IconSizes[size]} ${IconColors[color]}`
  };
};

// Predefined icon combinations for common use cases
export const CommonIcons = {
  // Upload states
  uploadIdle: { icon: AppIcons.files.upload, className: `${IconSizes.xl} ${IconColors.primary}` },
  uploadSuccess: { icon: AppIcons.status.success, className: `${IconSizes.xl} ${IconColors.success}` },
  uploadError: { icon: AppIcons.status.error, className: `${IconSizes.xl} ${IconColors.error}` },
  uploadProcessing: { icon: AppIcons.status.processing, className: `${IconSizes.xl} ${IconColors.primary} animate-spin` },

  // Navigation steps
  stepUpload: { icon: AppIcons.files.upload, className: `${IconSizes.lg} ${IconColors.current}` },
  stepReview: { icon: AppIcons.financial.chart, className: `${IconSizes.lg} ${IconColors.current}` },
  stepExport: { icon: AppIcons.files.download, className: `${IconSizes.lg} ${IconColors.current}` },

  // Actions
  aiCategorize: { icon: AppIcons.actions.ai, className: `${IconSizes.sm} ${IconColors.current}` },
  approve: { icon: AppIcons.status.approved, className: `${IconSizes.sm} ${IconColors.success}` },
  edit: { icon: AppIcons.actions.edit, className: `${IconSizes.sm} ${IconColors.current}` },
  delete: { icon: AppIcons.actions.delete, className: `${IconSizes.sm} ${IconColors.error}` },

  // Business categories
  payroll: { icon: AppIcons.categories.users, className: `${IconSizes.md} ${IconColors.current}` },
  office: { icon: AppIcons.business.office, className: `${IconSizes.md} ${IconColors.current}` },
  vehicle: { icon: AppIcons.business.vehicle, className: `${IconSizes.md} ${IconColors.current}` },
  utilities: { icon: AppIcons.business.utilities, className: `${IconSizes.md} ${IconColors.current}` },
  insurance: { icon: AppIcons.security.shield, className: `${IconSizes.md} ${IconColors.current}` },
  creditCard: { icon: AppIcons.financial.creditCard, className: `${IconSizes.md} ${IconColors.current}` },
  revenue: { icon: AppIcons.financial.money, className: `${IconSizes.md} ${IconColors.current}` },
  expense: { icon: AppIcons.financial.receipt, className: `${IconSizes.md} ${IconColors.current}` },

  // Status indicators
  compliant: { icon: AppIcons.security.shield, className: `${IconSizes.sm} ${IconColors.success}` },
  processing: { icon: AppIcons.status.processing, className: `${IconSizes.sm} ${IconColors.primary} animate-spin` },
  ready: { icon: AppIcons.status.success, className: `${IconSizes.sm} ${IconColors.success}` },
  pending: { icon: AppIcons.status.pending, className: `${IconSizes.sm} ${IconColors.warning}` },
} as const;

// Export type for TypeScript support
export type IconCategory = keyof typeof AppIcons;
export type IconName<T extends IconCategory> = keyof typeof AppIcons[T];
export type IconSize = keyof typeof IconSizes;
export type IconColor = keyof typeof IconColors; 