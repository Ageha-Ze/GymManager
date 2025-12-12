'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Menu,
  LogOut,
  User,
  Bell,
  Settings,
  Shield,
  Clock,
  Users,
  DollarSign
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: string
  type: 'membership_expiring' | 'payment_overdue' | 'inactive_members'
  title: string
  message: string
  count?: number
  urgent: boolean
}

export default function Header({ onMenuClickAction }: { onMenuClickAction: () => void }) {
  const { user, profile, signOut } = useAuth()
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [loading, setLoading] = useState(false)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Check notifications based on current page
  useEffect(() => {
    checkNotifications()
  }, [pathname])

  const checkNotifications = async () => {
    setLoading(true)
    const newNotifications: Notification[] = []

    // Page-specific notifications
    if (pathname.includes('/members') || pathname.includes('/dashboard')) {
      await checkMembershipNotifications(newNotifications)
    }

    if (pathname.includes('/payments') || pathname.includes('/financial-reports') || pathname.includes('/dashboard')) {
      await checkPaymentNotifications(newNotifications)
    }

    setNotifications(newNotifications)
    setLoading(false)
  }

  const checkMembershipNotifications = async (notifications: Notification[]) => {
    try {
      // Skip membership notifications if table doesn't exist
      // These features will be available when memberships system is implemented

      // For now, only check inactive members (which uses existing members table)
      const { data: inactiveMembers, error: inactiveError } = await supabase
        .from('members')
        .select('id')
        .eq('is_active', false)

      if (!inactiveError && inactiveMembers && inactiveMembers.length > 0) {
        notifications.push({
          id: 'inactive_members',
          type: 'inactive_members',
          title: 'Member Tidak Aktif',
          message: `${inactiveMembers.length} member berstatus tidak aktif`,
          count: inactiveMembers.length,
          urgent: false
        })
      }
    } catch (error) {
      // Silently handle any errors to prevent console spam
      console.debug('Membership notifications check skipped (table may not exist)')
    }
  }

  const checkPaymentNotifications = async (notifications: Notification[]) => {
    try {
      // Check overdue payments (past due date)
      const { data: overduePayments, error } = await supabase
        .from('payments')
        .select(`
          id,
          payment_date,
          members (
            full_name
          )
        `)
        .eq('payment_status', 'pending')
        .lt('payment_date', new Date().toISOString())

      if (!error && overduePayments && overduePayments.length > 0) {
        notifications.push({
          id: 'overdue_payments',
          type: 'payment_overdue',
          title: 'Pembayaran Terlambat',
          message: `${overduePayments.length} pembayaran belum lunas`,
          count: overduePayments.length,
          urgent: true
        })
      }
    } catch (error) {
      console.warn('Failed to check payment notifications:', error)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'membership_expiring':
        return Clock
      case 'payment_overdue':
        return DollarSign
      case 'inactive_members':
        return Users
      default:
        return Bell
    }
  }

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadge = (role: string | undefined) => {
    if (!role) return null
    
    const badges = {
      owner: { color: 'from-yellow-500 to-orange-500', icon: Shield, text: 'Owner' },
      admin: { color: 'from-blue-500 to-cyan-500', icon: Shield, text: 'Admin' },
      staff: { color: 'from-purple-500 to-pink-500', icon: User, text: 'Staff' }
    }
    
    return badges[role.toLowerCase() as keyof typeof badges] || badges.staff
  }

  const roleBadge = getRoleBadge(profile?.role)

  return (
    <header className="sticky top-0 z-30 h-20 bg-gradient-to-r from-gray-900 via-gray-900 to-gray-950 border-b border-gray-800/50 shadow-xl backdrop-blur-lg">
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden w-10 h-10 hover:bg-white/10 transition-all duration-200 rounded-xl"
            onClick={onMenuClickAction}
          >
            <Menu className="w-6 h-6 text-gray-300" />
          </Button>

          {/* Date & Time */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {currentTime.toLocaleDateString('id-ID', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
              <div className="text-xs text-gray-400 font-medium tabular-nums">
                {currentTime.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Notifications dropdown */}
          <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative w-10 h-10 hover:bg-white/10 transition-all duration-200 rounded-xl group"
              >
                <Bell className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
                {/* Notification badge */}
                {notifications.length > 0 && (
                  <span className={`absolute -top-1 -right-1 flex items-center justify-center text-xs font-bold text-white rounded-full ring-2 ring-gray-900 ${
                    notifications.some(n => n.urgent) ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
                  } ${
                    notifications.length < 10 ? 'w-5 h-5' : 'w-6 h-5 px-1'
                  }`}>
                    {notifications.length > 99 ? '99+' : notifications.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-80 bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 shadow-2xl rounded-xl p-0 max-h-96 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 bg-gray-800/50 border-b border-gray-700/50">
                <h3 className="font-semibold text-white text-lg flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-blue-400" />
                  Pemberitahuan
                  {notifications.length > 0 && (
                    <span className="ml-2 bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                      {notifications.length}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {notifications.length > 0
                    ? `${notifications.filter(n => n.urgent).length} kritikal • ${notifications.filter(n => !n.urgent).length} informasi`
                    : 'Belum ada pemberitahuan baru'
                  }
                </p>
              </div>

              {/* Notifications list */}
              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto mb-3"></div>
                    <p className="text-gray-400 text-sm">Memeriksa pemberitahuan...</p>
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="divide-y divide-gray-700/50">
                    {notifications.map((notification) => {
                      const IconComponent = getNotificationIcon(notification.type)
                      return (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-gray-800/30 transition-colors ${
                            notification.urgent ? 'border-l-4 border-red-500 bg-red-500/5' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 p-2 rounded-lg ${
                              notification.urgent
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-white text-sm">
                                  {notification.title}
                                </h4>
                                {notification.count && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    notification.urgent
                                      ? 'bg-red-500/20 text-red-300'
                                      : 'bg-yellow-500/20 text-yellow-300'
                                  }`}>
                                    {notification.count}
                                  </span>
                                )}
                                {notification.urgent && (
                                  <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-medium">
                                    KRITIKAL
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-400 leading-relaxed">
                                {notification.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-400 text-sm">Semua pemberitahuan sudah diperiksa</p>
                    <p className="text-gray-500 text-xs mt-1">Pantau kondisi bisnis Anda di sini</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <>
                  <div className="border-t border-gray-700/50 p-3 bg-gray-800/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowNotifications(false)
                        checkNotifications() // Refresh notifications
                      }}
                      className="w-full text-sm text-gray-300 hover:text-white hover:bg-gray-700/50"
                    >
                      Periksa Ulang
                    </Button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick logout button (desktop) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="hidden lg:flex w-10 h-10 hover:bg-red-500/10 hover:text-red-400 text-gray-400 transition-all duration-200 rounded-xl group"
            title="Logout"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </Button>

          {/* User menu dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-3 h-14 px-3 hover:bg-white/10 transition-all duration-300 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md group"
              >
                {/* Avatar with online indicator */}
                <div className="relative">
                  <Avatar className="w-11 h-11 ring-2 ring-white/20 group-hover:ring-white/40 transition-all duration-300">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-base font-bold">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online status indicator */}
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-gray-900 animate-pulse" />
                </div>
                
                {/* User info (desktop only) */}
                <div className="hidden lg:block text-left">
                  <div className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {profile?.full_name || 'User'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {roleBadge && (
                      <>
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${roleBadge.color}`} />
                        <span className="text-xs text-gray-400 font-medium capitalize">
                          {roleBadge.text}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent 
              align="end" 
              className="w-72 bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 shadow-2xl rounded-xl p-2"
            >
              {/* User info header */}
              <DropdownMenuLabel className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-12 h-12 ring-2 ring-white/20">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-base truncate">
                      {profile?.full_name}
                    </div>
                    <div className="text-sm text-gray-400 truncate">
                      {user?.email}
                    </div>
                  </div>
                </div>
                {/* Role badge */}
                {roleBadge && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r ${roleBadge.color} text-white text-xs font-semibold shadow-lg`}>
                    <roleBadge.icon className="w-3.5 h-3.5" />
                    {roleBadge.text}
                  </div>
                )}
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-gray-800/50 my-2" />

              {/* Menu items */}
              <DropdownMenuItem className="p-3 rounded-lg cursor-pointer hover:bg-white/5 focus:bg-white/5 transition-colors group">
                <User className="w-4 h-4 mr-3 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-gray-300 group-hover:text-white font-medium">
                  Profil Saya
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem className="p-3 rounded-lg cursor-pointer hover:bg-white/5 focus:bg-white/5 transition-colors group">
                <Settings className="w-4 h-4 mr-3 text-purple-400 group-hover:scale-110 group-hover:rotate-90 transition-all duration-300" />
                <span className="text-gray-300 group-hover:text-white font-medium">
                  Pengaturan
                </span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-gray-800/50 my-2" />

              {/* Logout button */}
              <DropdownMenuItem
                onClick={signOut}
                className="p-3 rounded-lg cursor-pointer bg-red-500/10 hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-500 focus:bg-gradient-to-r focus:from-red-500 focus:to-pink-500 transition-all duration-300 group"
              >
                <LogOut className="w-4 h-4 mr-3 text-red-400 group-hover:text-white group-hover:scale-110 transition-all" />
                <span className="text-red-400 group-hover:text-white font-semibold">
                  Logout
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Animated gradient bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50 animate-gradient-x" />

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </header>
  )
}
