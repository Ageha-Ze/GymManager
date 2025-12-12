'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  DollarSign,
  Settings,
  Dumbbell,
  CheckCircle,
  ChevronRight,
  X
} from 'lucide-react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    gradient: 'from-blue-500 to-cyan-500',
    shadowColor: 'shadow-blue-500/30'
  },
  {
    name: 'Member',
    href: '/members',
    icon: Users,
    gradient: 'from-purple-500 to-pink-500',
    shadowColor: 'shadow-purple-500/30'
  },
  {
    name: 'Check-in',
    href: '/check-ins',
    icon: CheckCircle,
    gradient: 'from-green-500 to-emerald-500',
    shadowColor: 'shadow-green-500/30'
  },
  {
    name: 'Pembayaran',
    href: '/payments',
    icon: DollarSign,
    gradient: 'from-emerald-500 to-teal-500',
    shadowColor: 'shadow-emerald-500/30'
  },
  {
    name: 'Laporan Keuangan',
    href: '/financial-reports',
    icon: DollarSign,
    gradient: 'from-amber-500 to-orange-500',
    shadowColor: 'shadow-orange-500/30'
  },
  {
    name: 'Paket Member',
    href: '/packages',
    icon: CreditCard,
    gradient: 'from-indigo-500 to-purple-500',
    shadowColor: 'shadow-indigo-500/30'
  },
  
]

export default function Sidebar({ isOpen, onCloseAction }: { isOpen: boolean; onCloseAction: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay with blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
        onClick={onCloseAction}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out',
          'w-64 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950',
          'border-r border-gray-800/50 shadow-2xl',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header with gradient */}
        <div className="relative h-20 overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x" />
          
          {/* Glass morphism overlay */}
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
          
          {/* Content */}
          <div className="relative flex items-center justify-between h-full px-6">
            <div className="flex items-center gap-3">
              {/* Icon with glow effect */}
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-xl blur-md" />
                <div className="relative flex items-center justify-center w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
              </div>
              
              {/* Text */}
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white tracking-tight">
                  Gym Manager
                </span>
                <span className="text-xs text-white/70 font-medium">
                  Fitness Center
                </span>
              </div>
            </div>

            {/* Close button (mobile only) */}
            <button
              onClick={onCloseAction}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 mt-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseAction}
                className="group relative block hover:cursor-pointer"
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full",
                    "bg-gradient-to-b", item.gradient,
                    "shadow-lg", item.shadowColor
                  )} />
                )}
                
                <div
                  className={cn(
                    'relative flex items-center gap-3 px-4 py-3.5 rounded-xl',
                    'text-base font-medium transition-all duration-300',
                    'overflow-hidden',
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  {/* Background gradient on hover/active */}
                  <div
                    className={cn(
                      'absolute inset-0 rounded-xl transition-all duration-300',
                      isActive
                        ? cn('bg-gradient-to-r opacity-100', item.gradient, 'shadow-lg', item.shadowColor)
                        : 'bg-gray-800/50 opacity-0 group-hover:opacity-100'
                    )}
                  />
                  
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  
                  {/* Icon container with glow */}
                  <div className="relative flex items-center justify-center w-10 h-10">
                    {isActive && (
                      <div className={cn(
                        "absolute inset-0 rounded-lg blur-md opacity-50",
                        "bg-gradient-to-r", item.gradient
                      )} />
                    )}
                    <div className={cn(
                      "relative flex items-center justify-center w-full h-full rounded-lg",
                      "transition-all duration-300",
                      isActive 
                        ? "bg-white/20 backdrop-blur-sm" 
                        : "bg-transparent group-hover:bg-white/10"
                    )}>
                      <Icon className="w-5 h-5 relative z-10" />
                    </div>
                  </div>
                  
                  {/* Text */}
                  <span className="relative z-10 flex-1">
                    {item.name}
                  </span>
                  
                  {/* Arrow indicator */}
                  <ChevronRight 
                    className={cn(
                      "w-5 h-5 relative z-10 transition-all duration-300",
                      isActive 
                        ? "opacity-100 translate-x-0" 
                        : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                    )} 
                  />
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Footer info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-4 border border-gray-700/50">
            {/* Animated gradient border */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 blur-xl animate-gradient-x" />
            
            {/* Content */}
            <div className="relative space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-gray-300">
                  System Online
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Version 1.0.0
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* CSS for gradient animation */}
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
    </>
  )
}
