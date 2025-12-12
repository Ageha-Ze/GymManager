'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, DollarSign, Users, CheckCircle, AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface RecentCheckIn {
  id: string
  created_at: string
  member: {
    id: string
    member_code: string
    full_name: string
    photo_url: string | null
  }
}

interface ExpiringMembership {
  id: string
  member_code: string
  full_name: string
  end_date: string
  days_remaining: number
}

interface ChartDataPoint {
  month: string
  members: number
  revenue: number
}

const COLORS = ['#3B82F6', '#EF4444'] // Blue for active, Red for inactive

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    monthlyRevenue: 0,
    todayCheckIns: 0
  })
  const [expiringMembers, setExpiringMembers] = useState<ExpiringMembership[]>([])
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let isMounted = true
    console.log('Dashboard useEffect triggered')

    const loadData = async () => {
      try {
        await fetchDashboardData()
      } catch (error) {
        console.error('Uncaught error in dashboard load:', error)
        if (isMounted) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const fetchDashboardData = async () => {
    try {
      console.log('Starting fetchDashboardData')
      setRefreshing(true)

      const [members, activeMembers, revenue, checkIns, expiring, recent] = await Promise.all([
        fetchTotalMembers(),
        fetchActiveMembers(),
        fetchMonthlyRevenue(),
        fetchTodayCheckIns(),
        fetchExpiringMembers(),
        fetchRecentCheckIns()
      ])

      console.log('Dashboard data fetched:', { members, activeMembers, revenue, checkIns, expiringNotes: expiring.length, recentNotes: recent.length })

      setStats({
        totalMembers: members,
        activeMembers: activeMembers,
        monthlyRevenue: revenue,
        todayCheckIns: checkIns
      })

      setExpiringMembers(expiring)
      setRecentCheckIns(recent)

      // Fetch chart data
      await fetchChartData(members, activeMembers)

    } catch (error) {
      console.error('Error in fetchDashboardData:', error)
      toast.error('Gagal memuat data')
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchTotalMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('id', { count: 'exact' })
    return data?.length || 0
  }

  const fetchActiveMembers = async () => {
    const { data } = await supabase
      .from('v_active_members')
      .select('id', { count: 'exact' })
    return data?.length || 0
  }

  const fetchMonthlyRevenue = async () => {
    const start = startOfMonth(new Date()).toISOString().split('T')[0]
    const end = endOfMonth(new Date()).toISOString().split('T')[0]

    const { data } = await supabase
      .from('payments')
      .select('amount')
      .eq('payment_status', 'paid')
      .gte('payment_date', start)
      .lte('payment_date', end)

    return data?.reduce((sum, p) => sum + p.amount, 0) || 0
  }

  const fetchTodayCheckIns = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('check_ins')
      .select('id', { count: 'exact' })
      .eq('check_in_date', today)
    return data?.length || 0
  }

  const fetchExpiringMembers = async () => {
    const { data } = await supabase
      .from('v_expiring_members')
      .select('*')
      .order('days_remaining', { ascending: true })
      .limit(5)
    return data || []
  }

  const fetchRecentCheckIns = async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('check_ins')
      .select('id, check_in_time, member_id')
      .eq('check_in_date', today)
      .order('check_in_time', { ascending: false })
      .limit(8)

    if (error) {
      console.error('Error fetching check-ins:', error)
      return []
    }

    if (!data || data.length === 0) return []

    // Get member details for these check-ins
    const memberIds = [...new Set(data.map(c => c.member_id))]
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, member_code, full_name, photo_url')
      .in('id', memberIds)

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return []
    }

    const memberMap = new Map(members?.map(m => [m.id, m]) || [])

    return data.map(c => ({
      id: c.id,
      created_at: c.check_in_time,
      member: memberMap.get(c.member_id) || {
        id: '',
        member_code: 'Unknown',
        full_name: 'Unknown Member',
        photo_url: null
      }
    }))
  }

  const fetchChartData = async (totalMembers: number, activeMembers: number) => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      months.push(date)
    }

    const chartPoints: ChartDataPoint[] = []

    for (const month of months) {
      const startDate = startOfMonth(month).toISOString()
      const endDate = endOfMonth(month).toISOString()

      const { data: members } = await supabase
        .from('members')
        .select('id')
        .lte('created_at', endDate)

      const { data: revenueData } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_status', 'paid')
        .gte('payment_date', startDate.split('T')[0])
        .lte('payment_date', endDate.split('T')[0])

      const revenue = revenueData?.reduce((sum, p) => sum + p.amount, 0) || 0

      chartPoints.push({
        month: format(month, 'MMM yy', { locale: idLocale }),
        members: members?.length || 0,
        revenue: revenue / 1000000 // Convert to millions
      })
    }

    setChartData(chartPoints)

    // Pie data
    setPieData([
      { name: 'Aktif', value: activeMembers },
      { name: 'Tidak Aktif', value: totalMembers - activeMembers }
    ])
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Memuat dashboard...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 sm:p-6 space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl p-4 sm:p-8 shadow-xl text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-indigo-400/30 animate-pulse"></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Dashboard</h1>
              <p className="text-lg sm:text-xl text-blue-100 mt-1 sm:mt-2">Selamat datang di sistem manajemen gym</p>
            </div>
            <button
              onClick={fetchDashboardData}
              disabled={refreshing}
              className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 transition-all duration-300 rounded-xl px-4 sm:px-6 py-3 flex items-center gap-2 font-medium hover:cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
                <Users className="h-4 w-4" />
                Member Aktif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeMembers}</div>
              <p className="text-xs opacity-80 mt-1">
                dari {stats.totalMembers} total member
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
                <DollarSign className="h-4 w-4" />
                Pendapatan Bulan Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
              <p className="text-xs opacity-80 mt-1">Pembayaran lunas</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
                <CheckCircle className="h-4 w-4" />
                Check-in Hari Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.todayCheckIns}</div>
              <p className="text-xs opacity-80 mt-1">Kunjungan hari ini</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
                <AlertTriangle className="h-4 w-4" />
                Akan Kadaluarsa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{expiringMembers.length}</div>
              <p className="text-xs opacity-80 mt-1">Dalam 7 hari ke depan</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Line Chart */}
          <Card className="lg:col-span-2 border-0 shadow-lg bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Pertumbuhan Member & Pendapatan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="left" 
                      orientation="left"
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                      formatter={(value, name) => [
                        name === 'members' ? value : `Rp ${(value as number).toFixed(1)}jt`,
                        name === 'members' ? 'Member' : 'Pendapatan'
                      ]}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="members"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#3B82F6' }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10B981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-500">
                  Memuat data chart...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-gray-900">Status Member</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">Aktif ({stats.activeMembers})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium">Tidak Aktif ({stats.totalMembers - stats.activeMembers})</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Check-ins */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Check-in Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {recentCheckIns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Belum ada check-in hari ini
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCheckIns.map((checkIn) => (
                    <div key={checkIn.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                      <Avatar className="w-10 h-10 border-2 border-green-200">
                        <AvatarImage src={checkIn.member.photo_url || undefined} />
                        <AvatarFallback className="bg-green-500 text-white text-sm">
                          {getInitials(checkIn.member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {checkIn.member.full_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {checkIn.member.member_code} • {format(new Date(checkIn.created_at), 'HH:mm')}
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expiring Memberships */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-red-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Calendar className="w-5 h-5 text-orange-600" />
                Membership Akan Habis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {expiringMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada member yang akan kadaluarsa
                </div>
              ) : (
                <div className="space-y-3">
                  {expiringMembers.map((member) => (
                    <div key={member.id} className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                      <div>
                        <p className="font-medium text-gray-900">{member.full_name}</p>
                        <p className="text-sm text-gray-600">{member.member_code}</p>
                      </div>
                      <Badge 
                        variant={member.days_remaining <= 2 ? 'destructive' : 'default'}
                        className="flex-shrink-0"
                      >
                        {member.days_remaining === 0 ? 'Hari Ini' : `${member.days_remaining} hari`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
