'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User, AuthResponse } from '@supabase/supabase-js'

interface Profile {
  id: string
  full_name: string
  role: 'owner' | 'admin' | 'staff'
  phone?: string
  avatar_url?: string
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<AuthResponse>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const isFetchingProfile = useRef(false)

  const fetchProfile = async (userId: string) => {
    // Prevent concurrent fetches
    if (isFetchingProfile.current) {
      console.log('[AUTH] Profile fetch already in progress, skipping...')
      return
    }

    isFetchingProfile.current = true
    setError(null)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      // Check if user is active
      if (!data.is_active) {
        throw new Error('Account is deactivated. Please contact administrator.')
      }

      setProfile(data)
    } catch (error: any) {
      console.error('[AUTH] Error fetching profile:', error)
      setError(error.message || 'Failed to load user profile')
      setProfile(null)
    } finally {
      isFetchingProfile.current = false
    }
  }

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error

        if (mounted) {
          setUser(session?.user ?? null)

          if (session?.user) {
            await fetchProfile(session.user.id)
          }
        }
      } catch (error: any) {
        console.error('[AUTH] Session check failed:', error)
        if (mounted) {
          setError(error.message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] Auth state changed:', event)

      if (!mounted) return

      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN' && session?.user) {
        // Only fetch profile on sign in, not on initial load (already fetched above)
        if (!loading) {
          await fetchProfile(session.user.id)
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        setError(null)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // router intentionally omitted as it's stable

  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    setError(null)
    setLoading(true)

    try {
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (response.error) {
        setError(response.error.message)
      }

      return response
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    setError(null)

    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      router.push('/login')
    } catch (error: any) {
      console.error('[AUTH] Sign out error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    profile,
    loading,
    error,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}