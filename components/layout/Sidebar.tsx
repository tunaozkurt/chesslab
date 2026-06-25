'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Library,
  AlertTriangle,
  BookOpen,
  GitBranch,
  Target,
  Sword,
  CalendarCheck,
  RotateCcw,
  BarChart3,
  Settings,
  LogOut,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/games', label: 'Oyunlarım', icon: Library },
  { href: '/mistakes', label: 'Hata Haritam', icon: AlertTriangle },
  { href: '/openings', label: 'Açılış Repertuarı', icon: BookOpen },
  { href: '/openings/tree', label: 'Açılış Ağacı', icon: GitBranch },
  { href: '/endgames', label: 'Oyun Sonu Lab', icon: Target },
  { href: '/tactics', label: 'Taktik Defteri', icon: Sword },
  { href: '/study', label: 'Çalışma Planı', icon: CalendarCheck },
  { href: '/reviews', label: 'Tekrarlar', icon: RotateCcw },
  { href: '/reports', label: 'Raporlar', icon: BarChart3 },
  { href: '/settings', label: 'Ayarlar', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-lg flex-shrink-0">
            ♛
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">ChessLab</p>
            <p className="text-zinc-500 text-xs mt-0.5">Gelişim Sistemi</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 font-medium'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  )
}
