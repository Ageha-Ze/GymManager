'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  DollarSign,
  CheckCircle,
  ChevronRight,
  Bell,
  Clock,
  LogOut,
  User,
  Settings,
  Shield,
  ChevronsRight
} from 'lucide-react'
import { useState, useEffect, useCallback, memo } from 'react'
import { supabase } from '@/lib/supabase'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'Member',
    href: '/members',
    icon: Users,
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    name: 'Check-in',
    href: '/check-ins',
    icon: CheckCircle,
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    name: 'Pembayaran',
    href: '/payments',
    icon: DollarSign,
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Laporan Keuangan',
    href: '/financial-reports',
    icon: DollarSign,
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    name: 'Paket Member',
    href: '/packages',
    icon: CreditCard,
    gradient: 'from-indigo-500 to-purple-500',
  },
]

interface Notification {
  id: string
  type: 'membership_expiring' | 'payment_overdue' | 'inactive_members'
  title: string
  message: string
  count?: number
  urgent: boolean
}

// Time Display Component
const TimeDisplay = memo(({ isCollapsed }: { isCollapsed: boolean }) => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center w-full py-2">
        <Clock className="w-5 h-5 text-blue-400" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
      <Clock className="w-5 h-5 text-blue-400 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs font-semibold text-white truncate">
          {currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
        </div>
        <div className="text-xs text-gray-400 font-medium tabular-nums">
          {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
})
TimeDisplay.displayName = 'TimeDisplay'

interface SidebarProps {
  isExpanded?: boolean;
  setIsExpanded?: (expanded: boolean) => void;
  onMobileSidebarStateChange?: (isOpen: boolean) => void;
}

export default function Sidebar({ isExpanded, setIsExpanded, onMobileSidebarStateChange }: SidebarProps) {
  const { user, profile, signOut } = useAuth()
  const pathname = usePathname()
  const [internalCollapsed, setInternalCollapsed] = useState(true) // Default collapsed

  // Use external state if provided, otherwise use internal state
  const isCollapsed = isExpanded !== undefined ? !isExpanded : internalCollapsed
  const handleSetCollapsed = (collapsed: boolean) => {
    if (setIsExpanded) {
      setIsExpanded(!collapsed)
    } else {
      setInternalCollapsed(collapsed)
    }

    // Notify mobile sidebar state change
    if (window.innerWidth < 1024 && onMobileSidebarStateChange) {
      onMobileSidebarStateChange(!collapsed)
    }
  }
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  const checkNotifications = useCallback(async () => {
    const newNotifications: Notification[] = []

    try {
      // Check inactive members
      const { data: inactiveMembers } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', false)

      if (inactiveMembers && inactiveMembers.length > 0) {
        newNotifications.push({
          id: 'inactive_members',
          type: 'inactive_members',
          title: 'Member Tidak Aktif',
          message: `${inactiveMembers.length} member berstatus tidak aktif`,
          count: inactiveMembers.length,
          urgent: false
        })
      }

      // Check overdue payments
      const { data: overduePayments } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('payment_status', 'pending')
        .lt('payment_date', new Date().toISOString())

      if (overduePayments && overduePayments.length > 0) {
        newNotifications.push({
          id: 'overdue_payments',
          type: 'payment_overdue',
          title: 'Pembayaran Terlambat',
          message: `${overduePayments.length} pembayaran belum lunas`,
          count: overduePayments.length,
          urgent: true
        })
      }
    } catch (error) {
      console.debug('Notification check failed')
    }

    setNotifications(newNotifications)
  }, [])

  useEffect(() => {
    checkNotifications()
  }, [pathname, checkNotifications])

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const roleBadge = profile?.role ? {
    owner: { color: 'from-yellow-500 to-orange-500', icon: Shield, text: 'Owner' },
    admin: { color: 'from-blue-500 to-cyan-500', icon: Shield, text: 'Admin' },
    staff: { color: 'from-purple-500 to-pink-500', icon: User, text: 'Staff' }
  }[profile.role.toLowerCase() as 'owner' | 'admin' | 'staff'] : null

  return (
    <>
      {/* Sidebar - Always visible, collapsed by default */}
      <aside
        onMouseEnter={() => {
          // Desktop only: expand on hover
          if (window.innerWidth >= 1024) {
            handleSetCollapsed(false)
          }
        }}
        onMouseLeave={() => {
          // Desktop only: collapse on mouse leave
          if (window.innerWidth >= 1024) {
            handleSetCollapsed(true)
          }
        }}
        className={cn(
          'fixed top-0 left-0 z-40 h-screen transition-all duration-300',
          'bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950',
          'border-r border-gray-800/50 shadow-2xl',
          'flex flex-col',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Header with User Info */}
        <div className="relative p-4 border-b border-gray-800/50">
          <div className="flex items-center justify-between gap-3 mb-4">
            {!isCollapsed && (
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="w-10 h-10 ring-2 ring-blue-500/30 shrink-0">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">
                    {profile?.full_name || 'User'}
                  </div>
                  {roleBadge && (
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${roleBadge.color}`} />
                      <span className="text-xs text-gray-400">{roleBadge.text}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isCollapsed && (
              <div className="flex items-center justify-center w-full">
                <Avatar className="w-10 h-10 ring-2 ring-blue-500/30">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>

          {/* Time & Notifications */}
          <div className={cn("flex gap-2", isCollapsed ? "flex-col items-center" : "items-center")}>
            <TimeDisplay isCollapsed={isCollapsed} />
            
            {/* Notifications */}
            <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "relative rounded-lg hover:bg-white/10 shrink-0",
                    isCollapsed ? "w-full h-10" : "w-10 h-10"
                  )}
                >
                  <Bell className="w-5 h-5 text-gray-300" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                side={isCollapsed ? "right" : "bottom"}
                className="w-80 bg-gray-900/95 backdrop-blur-xl border-gray-800 rounded-xl p-0"
              >
                <div className="p-4 border-b border-gray-800">
                  <h3 className="font-semibold text-white flex items-center">
                    <Bell className="w-4 h-4 mr-2 text-blue-400" />
                    Pemberitahuan
                    {notifications.length > 0 && (
                      <span className="ml-2 bg-gray-700 text-xs px-2 py-0.5 rounded-full">
                        {notifications.length}
                      </span>
                    )}
                  </h3>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          "p-4 hover:bg-gray-800/30 cursor-pointer",
                          notif.urgent && "border-l-4 border-red-500 bg-red-500/5"
                        )}
                      >
                        <h4 className="font-medium text-white text-sm">{notif.title}</h4>
                        <p className="text-sm text-gray-400 mt-1">{notif.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center">
                      <Bell className="w-12 h-12 text-gray-600 mx-auto mb-2 opacity-50" />
                      <p className="text-gray-400 text-sm">Tidak ada pemberitahuan</p>
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className="group relative block"
              >
                {isActive && !isCollapsed && (
                  <div className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b",
                    item.gradient
                  )} />
                )}
                
                <div
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200',
                    'text-sm font-medium',
                    isCollapsed && 'justify-center',
                    isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                  )}
                >
                  <div
                    className={cn(
                      'absolute inset-0 rounded-xl transition-all duration-200',
                      isActive
                        ? cn('bg-gradient-to-r opacity-100', item.gradient)
                        : 'bg-gray-800/50 opacity-0 group-hover:opacity-100'
                    )}
                  />
                  
                  <div className={cn(
                    "relative flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                    isActive ? "bg-white/20" : "bg-transparent group-hover:bg-white/10"
                  )}>
                    <Icon className="w-5 h-5 relative z-10" />
                  </div>
                  
                  {!isCollapsed && (
                    <>
                      <span className="relative z-10 flex-1">{item.name}</span>
                      <ChevronRight 
                        className={cn(
                          "w-4 h-4 relative z-10 transition-all",
                          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )} 
                      />
                    </>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* User Menu & Logout */}
        <div className="p-3 border-t border-gray-800/50 space-y-2">
          {/* Expand/Collapse Toggle Button - Mobile */}
          <Button
            onClick={() => handleSetCollapsed(!isCollapsed)}
            className={cn(
              "lg:hidden w-full gap-3 h-12 hover:bg-white/5 rounded-xl text-gray-300 hover:text-white transition-all",
              isCollapsed ? "justify-center px-0" : "justify-start"
            )}
            variant="ghost"
          >
            <ChevronsRight className={cn("w-5 h-5 transition-transform", !isCollapsed && "rotate-180")} />
            {!isCollapsed && <span>Perkecil Menu</span>}
          </Button>

          {/* Profil Saya - Expanded */}
          {!isCollapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 hover:bg-white/5 rounded-xl text-gray-300 hover:text-white"
                >
                  <User className="w-5 h-5" />
                  <span>Profil Saya</span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                side="right"
                className="w-64 bg-gray-900/95 backdrop-blur-xl border-gray-800 rounded-xl p-2"
              >
                <DropdownMenuLabel className="p-3">
                  <div className="text-sm font-semibold text-white">{profile?.full_name}</div>
                  <div className="text-xs text-gray-400">{user?.email}</div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-gray-800" />

                <DropdownMenuItem className="p-3 rounded-lg cursor-pointer hover:bg-white/5">
                  <Settings className="w-4 h-4 mr-3 text-purple-400" />
                  <span className="text-gray-300">Pengaturan</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Profil Saya - Collapsed */}
          {isCollapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full h-12 hover:bg-white/5 rounded-xl text-gray-300 hover:text-white"
                >
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                side="right"
                className="w-64 bg-gray-900/95 backdrop-blur-xl border-gray-800 rounded-xl p-2"
              >
                <DropdownMenuLabel className="p-3">
                  <div className="text-sm font-semibold text-white">{profile?.full_name}</div>
                  <div className="text-xs text-gray-400">{user?.email}</div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-gray-800" />

                <DropdownMenuItem className="p-3 rounded-lg cursor-pointer hover:bg-white/5">
                  <Settings className="w-4 h-4 mr-3 text-purple-400" />
                  <span className="text-gray-300">Pengaturan</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Logout Button */}
          <Button
            onClick={signOut}
            variant="ghost"
            className={cn(
              "w-full gap-3 h-12 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl",
              isCollapsed ? "justify-center px-0" : "justify-start"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </aside>
    </>
  )
}
