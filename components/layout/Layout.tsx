'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import ConnectionModal from '@/components/ConnectionModal'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // If no user and not on login page → redirect to login
    if (!user && pathname !== '/login') {
      router.replace('/login') // Use replace instead of push
      return
    }

    // If user exists and on login page → redirect to dashboard
    if (user && pathname === '/login') {
      router.replace('/dashboard')
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <Sidebar isOpen={sidebarOpen} onCloseAction={() => setSidebarOpen(false)} />

        <div className="lg:pl-64">
          <Header onMenuClickAction={() => setSidebarOpen(true)} />

          <main className="p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>

      <ConnectionModal />
    </>
  )
}
