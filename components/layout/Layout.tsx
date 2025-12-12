'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import UIWrapper from './UIWrapper'
import ConnectionModal from '@/components/ConnectionModal'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return

    if (!user && pathname !== '/login') {
      router.replace('/login')
    } else if (user && pathname === '/login') {
      router.replace('/dashboard')
    }
  }, [user, loading, pathname, router])

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show nothing while redirecting (prevent flash of content)
  if (!user && pathname !== '/login') {
    return null
  }

  if (user && pathname === '/login') {
    return null
  }

  return (
    <>
      <UIWrapper>
        {children}
      </UIWrapper>
      <ConnectionModal />
    </>
  )
}
