// The one list of sections. A new business area adds its sections here.
import {
  Building2,
  DollarSign,
  KanbanSquare,
  LayoutDashboard,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = { label: string; path: string; icon: LucideIcon }

export const NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Organizations', path: '/organizations', icon: Building2 },
  { label: 'Contacts', path: '/contacts', icon: Users },
  { label: 'Deals', path: '/deals', icon: DollarSign },
  { label: 'Pipeline', path: '/pipeline', icon: KanbanSquare },
]
