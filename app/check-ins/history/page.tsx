'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Calendar, Search, Download, User, Clock, TrendingUp, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'

export default function CheckInHistoryPage() {
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedMember, setSelectedMember] = useState('')
  const [members, setMembers] = useState<Member[]>([])

  interface Member {
    id: string
    member_code: string
    full_name: string
  }

  interface CheckInRecord {
    id: string
    member_id: string
    check_in_time: string
    check_out_time: string | null
    check_in_date: string
    members?: {
      member_code: string
      full_name: string
      phone: string | null
      photo_url: string | null
    }
  }

  useEffect(() => {
    fetchMembers()
    fetchCheckInsHistory()

    // Default to current month
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchCheckInsHistory()
    }
  }, [startDate, endDate, selectedMember])

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, member_code, full_name')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const fetchCheckInsHistory = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('check_ins')
        .select(`
          *,
          members!inner (
            id,
            member_code,
            full_name,
            phone,
            photo_url
          )
        `)
        .order('check_in_date', { ascending: false })
        .order('check_in_time', { ascending: false })

      if (startDate) {
        query = query.gte('check_in_date', startDate)
      }

      if (endDate) {
        query = query.lte('check_in_date', endDate)
      }

      if (selectedMember) {
        query = query.eq('member_id', selectedMember)
      }

      const { data, error } = await query

      if (error) throw error
      setCheckIns(data || [])
    } catch (error) {
      console.error('Error fetching check-ins history:', error)
      toast.error('Gagal memuat riwayat check-in')
    } finally {
      setLoading(false)
    }
  }

  const filteredCheckIns = checkIns.filter(checkIn => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      checkIn.members?.full_name.toLowerCase().includes(query) ||
      checkIn.members?.member_code.toLowerCase().includes(query) ||
      checkIn.members?.phone?.includes(query) ||
      checkIn.check_in_date.includes(query)
    )
  })

  const handleExport = () => {
    const csvData = filteredCheckIns.map(checkIn => ({
      'Tanggal': checkIn.check_in_date,
      'Waktu Check-in': checkIn.check_in_time,
      'Waktu Check-out': checkIn.check_out_time || '',
      'Durasi': calculateDuration(checkIn.check_in_time, checkIn.check_out_time),
      'Kode Member': checkIn.members?.member_code || '',
      'Nama Member': checkIn.members?.full_name || '',
      'Telepon': checkIn.members?.phone || ''
    }))

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `checkin_history_${startDate}_to_${endDate}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return '-'
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    const hours = Math.floor(diff / 1000 / 60 / 60)
    const minutes = Math.floor((diff / 1000 / 60) % 60)
    return `${hours}j ${minutes}m`
  }

  const getTotalStats = () => {
    const totalCheckIns = filteredCheckIns.length
    const uniqueMembers = [...new Set(filteredCheckIns.map(c => c.member_id))].length
    const totalDuration = filteredCheckIns.reduce((sum, checkin) => {
      if (checkin.check_out_time) {
        const diff = new Date(checkin.check_out_time).getTime() - new Date(checkin.check_in_time).getTime()
        return sum + (diff / 1000 / 60 / 60) // Convert to hours
      }
      return sum
    }, 0)

    return { totalCheckIns, uniqueMembers, totalDuration }
  }

  const stats = getTotalStats()

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-6 space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-orange-500 rounded-2xl p-8 text-white shadow-2xl">
          <div className="flex items-center gap-4">
            <Calendar className="w-12 h-12 text-orange-300" />
            <div>
              <h1 className="text-4xl font-bold">Riwayat Check-in</h1>
              <p className="text-xl text-blue-100 mt-2">
                Monitor dan analisa pola kunjungan member dengan data akurat!
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold text-blue-800">Data Check-in Member</h2>
            <p className="text-xl text-blue-600 mt-2">Pantau performa kunjungan dan pola kebiasaan member!</p>
          </div>
          <Button
            onClick={handleExport}
            disabled={filteredCheckIns.length === 0}
            className="h-14 px-8 text-lg font-semibold bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <Download className="w-6 h-6 mr-3" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white rounded-xl shadow-lg border border-blue-100 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-t-xl">
              <CardTitle className="text-xl font-bold">Total Check-in</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-blue-800">{stats.totalCheckIns}</div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl shadow-lg border border-blue-100 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-t-xl">
              <CardTitle className="text-xl font-bold">Member Unik</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-blue-800">{stats.uniqueMembers}</div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl shadow-lg border border-blue-100 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-t-xl">
              <CardTitle className="text-xl font-bold">Total Durasi</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-blue-800">{stats.totalDuration.toFixed(1)}j</div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl shadow-lg border border-blue-100 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-t-xl">
              <CardTitle className="text-xl font-bold">Rata-rata</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-blue-800">
                {stats.totalCheckIns > 0 ? (stats.totalDuration / stats.totalCheckIns).toFixed(1) : 0}h
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white rounded-xl shadow-2xl border border-blue-100">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-t-xl">
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <Filter className="w-6 h-6" />
              Filter & Pencarian
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-xl font-semibold text-blue-800">Tanggal Mulai</Label>
                    <div className="relative">
                      <Input
                        id="start_date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-16 text-xl border-2 border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl pr-12 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-clear-button]:hidden"
                        style={{
                          colorScheme: 'light'
                        }}
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-600 pointer-events-none" />
                    </div>
                  </div>

              <div className="space-y-2">
                <Label htmlFor="end_date" className="text-xl font-semibold text-blue-800">Tanggal Akhir</Label>
                <div className="relative">
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-16 text-xl border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl pr-12 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-clear-button]:hidden"
                    style={{
                      colorScheme: 'light'
                    }}
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-600 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xl font-semibold text-blue-800">Filter Member</label>
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="flex h-14 w-full items-center justify-between rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-lg ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Semua Member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} ({member.member_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-xl font-semibold text-blue-800">Cari Member</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-400" />
                  <Input
                    placeholder="Nama/kode/HP..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-14 text-lg border-2 border-blue-200 focus:border-orange-400 rounded-xl bg-blue-50"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card className="bg-white rounded-xl shadow-2xl border border-blue-100">
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center h-80">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mx-auto"></div>
                  <p className="mt-6 text-xl text-blue-600 font-semibold">Memuat riwayat check-in...</p>
                </div>
              </div>
            ) : filteredCheckIns.length === 0 ? (
              <div className="flex items-center justify-center h-80">
                <div className="text-center">
                  <Calendar className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                  <p className="text-xl text-blue-600 font-semibold">Tidak ada data check-in untuk filter yang dipilih</p>
                  <p className="text-lg text-blue-500 mt-2">Coba ubah filter atau tanggal!</p>
                </div>
              </div>
            ) : (
                  <Table>
                    <TableHeader>
                      <tr className="bg-gradient-to-r from-blue-500 to-orange-500 text-white">
                        <th className="text-left p-6 text-xl font-bold">Member</th>
                        <th className="text-left p-6 text-xl font-bold">Tanggal</th>
                        <th className="text-left p-6 text-xl font-bold">Check-in</th>
                        <th className="text-left p-6 text-xl font-bold">Check-out</th>
                        <th className="text-left p-6 text-xl font-bold">Durasi</th>
                      </tr>
                    </TableHeader>
                    <tbody>
                      {filteredCheckIns.map((checkIn, index) => (
                        <tr key={checkIn.id} className={`border-b border-blue-100 hover:bg-blue-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-25'}`}>
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-14 h-14 border-4 border-orange-300 shadow-lg">
                                <AvatarImage src={checkIn.members?.photo_url || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-orange-500 text-white font-bold text-lg">
                                  {getInitials(checkIn.members?.full_name || '')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-bold text-xl text-blue-800">{checkIn.members?.full_name}</div>
                                <div className="text-lg text-blue-600">{checkIn.members?.member_code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6 text-xl font-semibold text-blue-700">
                            {format(new Date(checkIn.check_in_date), 'dd MMM yyyy', { locale: idLocale })}
                          </td>
                          <td className="p-6 text-xl text-blue-700">
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5 text-green-500" />
                              {format(new Date(checkIn.check_in_time), 'HH:mm', { locale: idLocale })}
                            </div>
                          </td>
                          <td className="p-6 text-xl text-blue-700">
                            {checkIn.check_out_time ? (
                              <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-red-500" />
                                {format(new Date(checkIn.check_out_time), 'HH:mm', { locale: idLocale })}
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-lg px-4 py-2 bg-orange-500 text-white font-semibold rounded-full">Masih di Gym</Badge>
                            )}
                          </td>
                          <td className="p-6 text-xl font-semibold text-blue-800">
                            {calculateDuration(checkIn.check_in_time, checkIn.check_out_time)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
            )}
          </CardContent>
        </Card>

        {/* Result count */}
        {!loading && filteredCheckIns.length > 0 && (
          <p className="text-blue-700 text-xl font-semibold text-center">
            Menampilkan {filteredCheckIns.length} check-in dari total {checkIns.length} record
          </p>
        )}
      </div>
    </Layout>
  )
}
