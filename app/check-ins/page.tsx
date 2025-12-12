'use client'

import { useState, useEffect, useMemo } from 'react'
import Layout from '@/components/layout/Layout'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle, Search, Clock, History, Download, Filter, Calendar, X, Trash2, Dumbbell } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface Member {
  id: string
  member_code: string
  full_name: string
  phone: string
  photo_url: string | null
  is_active: boolean
}

interface Membership {
  id: string
  package_id: string
  start_date: string
  end_date: string
  status: string
  membership_packages: Array<{
    package_name: string
  }> | null
}

interface CheckInRecord {
  id: string
  member_id: string
  check_in_time: string
  check_in_date: string
  check_out_time: string | null
  members?: {
    member_code: string
    full_name: string
    phone: string | null
    photo_url: string | null
  }
}

export default function CheckInsPage() {
  // Check-in tab state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [memberMemberships, setMemberMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [checkInToDelete, setCheckInToDelete] = useState<CheckInRecord | null>(null)

  // History tab state
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('')
  const [searchQueryHistory, setSearchQueryHistory] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [todayCheckIns, setTodayCheckIns] = useState<CheckInRecord[]>([])

  useEffect(() => {
    console.log('[CHECK-INS] Initial loading check-ins page...')
    fetchTodayCheckIns()
    fetchMembers()

    // Default to current month for history tab
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
  }, [])

  const fetchMembers = async () => {
    try {
      console.log('[CHECK-INS] Starting fetchMembers')
      const { data, error } = await supabase
        .from('members')
        .select('id, member_code, full_name, phone, photo_url, is_active')
        .eq('is_active', true)
        .order('full_name', { ascending: true })
        .limit(1000) // Add reasonable limit to prevent large fetches

      if (error) throw error
      console.log('[CHECK-INS] Members fetched:', data?.length || 0, 'active members')
      setMembers(data || [])
      console.log('[CHECK-INS] Members loading complete')
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const fetchTodayCheckIns = async () => {
    try {
      console.log('[CHECK-INS] Starting fetchTodayCheckIns')
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          *,
          members!inner (
            member_code,
            full_name,
            phone,
            photo_url
          )
        `)
        .eq('check_in_date', today)
        .order('check_in_time', { ascending: false })

      if (error) throw error
      console.log('[CHECK-INS] Today check-ins fetched:', data?.length || 0, 'check-ins')
      setTodayCheckIns(data || [])
      console.log('[CHECK-INS] Today check-ins loading complete')
    } catch (error) {
      console.error('Error fetching today check-ins:', error)
    }
  }

  const fetchCheckInsHistory = async () => {
    try {
      console.log('[CHECK-INS] Starting fetchCheckInsHistory')
      setLoadingHistory(true)
      let query = supabase
        .from('check_ins')
        .select(`
          *,
          members!inner (
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

      if (selectedMemberFilter) {
        query = query.eq('member_id', selectedMemberFilter)
      }

      const { data, error } = await query

      if (error) throw error
      console.log('[CHECK-INS] History check-ins fetched:', data?.length || 0, 'records')
      setCheckIns(data || [])
      console.log('[CHECK-INS] History loading complete')
    } catch (error) {
      console.error('Error fetching check-ins history:', error)
      toast.error('Gagal memuat riwayat check-in')
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (startDate && endDate) {
      fetchCheckInsHistory()
    }
  }, [startDate, endDate, selectedMemberFilter])

  const searchMembers = async () => {
    if (!searchQuery.trim()) {
      toast.error('Masukkan kode member, nama, atau nomor telepon')
      return
    }

    try {
      setSearching(true)
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .or(`member_code.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error('Error searching members:', error)
      toast.error('Gagal mencari member')
    } finally {
      setSearching(false)
    }
  }

 const selectMember = async (member: Member) => {
  setSelectedMember(member)
  setSearchResults([])
  setSearchQuery('')
  try {
    // Get active memberships
    const { data: memberships, error } = await supabase
      .from('member_memberships')
      .select('*')
      .eq('member_id', member.id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString().split('T')[0]);

    if (error) throw error

    // If we have memberships, fetch package names separately
    if (memberships && memberships.length > 0) {
      const membershipsWithPackages = await Promise.all(
        memberships.map(async (membership) => {
          const { data: packageData, error: packageError } = await supabase
            .from('membership_packages')
            .select('package_name')
            .eq('id', membership.package_id)
            .single();

          if (packageError) {
            console.error('Error fetching package:', packageError);
            return {
              ...membership,
              membership_packages: [{ package_name: 'Unknown Package' }]
            };
          }

          return {
            ...membership,
            membership_packages: [packageData]
          };
        })
      );

      setMemberMemberships(membershipsWithPackages as Membership[]);
    } else {
      setMemberMemberships([]);
    }
  } catch (error) {
    console.error('Error fetching memberships:', error)
    toast.error('Gagal memuat data membership')
  }
}

  const checkInMember = async () => {
    if (!selectedMember) return

    try {
      setLoading(true)

      // Check if already checked in today
      const today = new Date().toISOString().split('T')[0]
      const { data: existingCheckIns, error: checkError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('member_id', selectedMember.id)
        .eq('check_in_date', today)

      if (checkError) throw checkError

      if (existingCheckIns && existingCheckIns.length > 0) {
        toast.error('Member sudah check-in hari ini')
        return
      }

      // Create check-in record
      const { error: insertError } = await supabase
        .from('check_ins')
        .insert({
          member_id: selectedMember.id,
          check_in_time: new Date().toISOString(),
          check_in_date: today
        })

      if (insertError) throw insertError

      toast.success(`Berhasil check-in ${selectedMember.full_name}!`)

      // Refresh today's check-ins
      await fetchTodayCheckIns()

      // Reset selection
      setSelectedMember(null)
      setMemberMemberships([])
      setIsConfirmDialogOpen(false)

    } catch (error) {
      console.error('Error during check-in:', error)
      toast.error('Gagal melakukan check-in')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = () => {
    if (!selectedMember) return

    // Check if member has active membership
    const hasActiveMembership = memberMemberships.length > 0

    if (!hasActiveMembership) {
      toast.error('Member tidak memiliki membership aktif')
      return
    }

    setIsConfirmDialogOpen(true)
  }

  const handleCheckOut = async (checkInId: string) => {
    try {
      const { error } = await supabase
        .from('check_ins')
        .update({
          check_out_time: new Date().toISOString()
        })
        .eq('id', checkInId)

      if (error) throw error

      toast.success('Berhasil check-out member!')

      // Refresh today's check-ins
      await fetchTodayCheckIns()
    } catch (error) {
      console.error('Error during check-out:', error)
      toast.error('Gagal melakukan check-out')
    }
  }

  const handleDeleteCheckIn = async (checkInId: string) => {
    try {
      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('id', checkInId)

      if (error) throw error

      toast.success('Check-in berhasil dihapus!')

      // Refresh today's check-ins
      await fetchTodayCheckIns()
    } catch (error) {
      console.error('Error deleting check-in:', error)
      toast.error('Gagal menghapus check-in')
    }
  }

  const filteredCheckIns = useMemo(() => {
    if (!searchQueryHistory) return checkIns
    const query = searchQueryHistory.toLowerCase()
    return checkIns.filter(checkIn =>
      checkIn.members?.full_name.toLowerCase().includes(query) ||
      checkIn.members?.member_code.toLowerCase().includes(query) ||
      checkIn.members?.phone?.includes(query) ||
      checkIn.check_in_date.includes(query)
    )
  }, [checkIns, searchQueryHistory])

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

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const stats = getTotalStats()

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-3 sm:p-6 space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-orange-500 rounded-2xl p-4 sm:p-8 text-white shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4">
              <Dumbbell className="w-8 h-8 sm:w-12 sm:h-12 text-orange-300" />
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Sistem Check-in Gym</h1>
                <p className="text-lg sm:text-xl text-blue-100 mt-1 sm:mt-2">
                  Kelola check-in member dengan energi maksimal!
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="checkin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white rounded-xl p-2 h-12 sm:h-16 shadow-sm">
            <TabsTrigger
              value="checkin"
              className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-orange-500 data-[state=active]:text-white h-10 sm:h-12 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Check-in Member</span>
              <span className="sm:hidden">Check-in</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-orange-500 data-[state=active]:text-white h-10 sm:h-12 cursor-pointer"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Riwayat Check-in</span>
              <span className="sm:hidden">Riwayat</span>
            </TabsTrigger>
          </TabsList>

          {/* Check-in Tab */}
          <TabsContent value="checkin" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                
                {/* Search Card */}
                <Card className="bg-white rounded-xl shadow-2xl border border-blue-100">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-t-xl">
                    <CardTitle className="text-2xl font-bold flex items-center gap-3">
                      <Search className="w-6 h-6" />
                      Cari Member
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-400" />
                        <Input
                          placeholder="Kode member, nama, atau nomor telepon..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && searchMembers()}
                          className="pl-12 h-14 text-lg border-2 border-blue-200 focus:border-orange-400 rounded-xl bg-blue-50"
                        />
                      </div>
        <Button
          onClick={searchMembers}
          disabled={searching}
          className="h-14 px-8 text-lg font-semibold bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white rounded-xl cursor-pointer shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          {searching ? 'Mencari...' : 'Cari'}
        </Button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                        {searchResults.map((member) => (
                          <div key={member.id} className="p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarImage src={member.photo_url || ''} />
                                  <AvatarFallback className="bg-blue-600 text-white text-sm">
                                    {getInitials(member.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-medium">{member.full_name}</h4>
                                  <p className="text-sm text-gray-600">
                                    {member.member_code} • {member.phone}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={member.is_active ? 'default' : 'secondary'} className="text-xs">
                                  {member.is_active ? 'Aktif' : 'Tidak Aktif'}
                                </Badge>
                                <Button
                                  onClick={() => selectMember(member)}
                                  size="sm"
                                  className="h-8 px-4 text-sm bg-blue-600 hover:bg-blue-700 cursor-pointer"
                                >
                                  Pilih
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Member Detail Card */}
                {selectedMember && (
                  <Card className="bg-white rounded-xl shadow-2xl border border-blue-100">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-t-xl">
                      <CardTitle className="text-2xl font-bold flex items-center gap-3">
                        <CheckCircle className="w-6 h-6" />
                        Detail Member
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      
                      {/* Member Info */}
                      <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16 border-2 border-blue-200">
                          <AvatarImage src={selectedMember.photo_url || undefined} />
                          <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                            {getInitials(selectedMember.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold">{selectedMember.full_name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Kode: {selectedMember.member_code}
                          </p>
                          <Badge 
                            variant={selectedMember.is_active ? 'default' : 'secondary'} 
                            className="mt-2"
                          >
                            {selectedMember.is_active ? 'Aktif' : 'Tidak Aktif'}
                          </Badge>
                        </div>
                      </div>

                      {/* Membership Info */}
                      <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-blue-600" />
                          Membership Aktif
                        </h4>
                        {memberMemberships.length === 0 ? (
                          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm text-red-700">Tidak ada membership aktif</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {memberMemberships.map((membership) => (
                              <div key={membership.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                                <div>
                                  <p className="font-medium text-sm">
                                    {membership.membership_packages?.[0]?.package_name || 'Unknown Package'}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Berlaku sampai {new Date(membership.end_date).toLocaleDateString('id-ID')}
                                  </p>
                                </div>
                                <Badge className="bg-green-600 text-xs">Aktif</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4 border-t">
                        <Button
                          onClick={handleCheckIn}
                          disabled={loading || memberMemberships.length === 0}
                          className="flex-1 h-11 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-white cursor-pointer shadow-lg transition-all duration-300 transform hover:scale-105"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {loading ? 'Memproses...' : 'Check-in Sekarang'}
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedMember(null)
                            setMemberMemberships([])
                          }}
                          variant="outline"
                          className="h-11 px-6 text-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 rounded-xl transition-all duration-300 cursor-pointer"
                        >
                          Batal
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-8">
                <Card className="bg-white rounded-xl shadow-2xl border border-blue-100">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-t-xl">
                    <CardTitle className="text-2xl font-bold flex items-center gap-3">
                      <Clock className="w-6 h-6" />
                      Check-in Hari Ini ({todayCheckIns.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {todayCheckIns.length === 0 ? (
                      <div className="text-center py-12 text-blue-600">
                        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-blue-300" />
                        <p className="text-xl font-semibold">Belum ada check-in hari ini</p>
                        <p className="text-lg text-blue-500 mt-2">Ayo mulai hari dengan energi!</p>
                      </div>
                    ) : (
                      <div className="space-y-6 max-h-96 overflow-y-auto">
                        {todayCheckIns.map((checkIn) => (
                          <div key={checkIn.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors duration-200">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-14 h-14 border-4 border-orange-300 shadow-lg">
                                <AvatarImage src={checkIn.members?.photo_url || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-orange-500 text-white font-bold text-lg">
                                  {getInitials(checkIn.members?.full_name || '')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xl text-blue-800 truncate">
                                  {checkIn.members?.full_name || 'Unknown'}
                                </p>
                                <p className="text-lg text-blue-600">
                                  Check-in: {format(new Date(checkIn.check_in_time), 'HH:mm', { locale: idLocale })}
                                </p>
                                <p className="text-base text-blue-500">
                                  Durasi: {checkIn.check_out_time
                                    ? calculateDuration(checkIn.check_in_time, checkIn.check_out_time)
                                    : calculateDuration(checkIn.check_in_time, new Date().toISOString()) + ' (masih aktif)'}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 items-end">
                              {checkIn.check_out_time ? (
                                <div className="flex flex-col items-end">
                                  <Badge variant="secondary" className="text-lg px-4 py-2 bg-gray-500 text-white font-semibold rounded-full">
                                    Checked Out
                                  </Badge>
                                  <p className="text-base text-blue-600">
                                    {format(new Date(checkIn.check_out_time), 'HH:mm', { locale: idLocale })}
                                  </p>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => handleCheckOut(checkIn.id)}
                                  size="sm"
                                  variant="outline"
                                  className="text-lg px-4 py-2 border-2 border-orange-300 text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 cursor-pointer"
                                >
                                  Check Out
                                </Button>
                              )}

                              <Button
                                onClick={() => {
                                  setCheckInToDelete(checkIn)
                                  setIsConfirmDeleteOpen(true)
                                }}
                                size="sm"
                                variant="ghost"
                                className="text-lg px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-300 cursor-pointer"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

                    {/* History Tab */}
          <TabsContent value="history" className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold text-blue-800">Riwayat Check-in</h2>
                <p className="text-xl text-blue-600 mt-2">Monitor dan analisa pola kunjungan member dengan data akurat!</p>
              </div>
              <Button onClick={handleExport} disabled={filteredCheckIns.length === 0} className="h-14 px-8 text-lg font-semibold bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer">
                <Download className="w-6 h-6 mr-3" />
                Export CSV
              </Button>
            </div>

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

            <Card className="bg-white rounded-xl shadow-2xl border border-blue-100">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-t-xl">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <Filter className="w-6 h-6" />
                  Filter & Pencarian
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="space-y-3">
                    <label className="text-xl font-semibold text-blue-800">Tanggal Mulai</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-16 text-xl border-2 border-blue-200 focus:border-orange-400 rounded-xl bg-blue-50 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xl font-semibold text-blue-800">Tanggal Akhir</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-16 text-xl border-2 border-blue-200 focus:border-orange-400 rounded-xl bg-blue-50 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xl font-semibold text-blue-800">Filter Member</label>
                    <select
                      value={selectedMemberFilter}
                      onChange={(e) => setSelectedMemberFilter(e.target.value)}
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
                        value={searchQueryHistory}
                        onChange={(e) => setSearchQueryHistory(e.target.value)}
                        className="pl-12 h-14 text-lg border-2 border-blue-200 focus:border-orange-400 rounded-xl bg-blue-50"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl shadow-2xl border border-blue-100">
              <CardContent className="pt-6">
                {loadingHistory ? (
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
                                <CheckCircle className="w-5 h-5 text-red-500" />
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

            {!loadingHistory && filteredCheckIns.length > 0 && (
              <p className="text-blue-700 text-xl font-semibold text-center">
                Menampilkan {filteredCheckIns.length} check-in dari total {checkIns.length} record
              </p>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="bg-white rounded-2xl shadow-2xl border border-blue-100">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-blue-800">Konfirmasi Check-in</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {selectedMember && (
              <div className="flex items-center gap-6 p-6 bg-blue-50 rounded-xl border border-blue-200">
                <Avatar className="w-20 h-20 border-4 border-orange-300 shadow-lg">
                  <AvatarImage src={selectedMember.photo_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-orange-500 text-white font-bold text-3xl">
                    {getInitials(selectedMember.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-3xl font-bold text-blue-800">{selectedMember.full_name}</h3>
                  <p className="text-xl text-blue-600">Kode: {selectedMember.member_code}</p>
                  <p className="text-lg text-blue-500">Telp: {selectedMember.phone}</p>
                </div>
              </div>
            )}

            <p className="text-xl text-blue-700 font-semibold">Apakah Anda yakin ingin check-in member ini?</p>

            <div className="flex gap-4">
              <Button
                onClick={checkInMember}
                disabled={loading}
                className="flex-1 h-16 text-xl font-bold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
              >
                {loading ? 'Memproses...' : 'Ya, Check-in'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsConfirmDialogOpen(false)}
                className="flex-1 h-16 text-xl font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300 cursor-pointer"
                disabled={loading}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Check-in Confirmation Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="bg-white rounded-2xl shadow-2xl border border-blue-100">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-red-600">Hapus Check-in</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex items-center gap-4 p-6 bg-red-50 border border-red-300 rounded-xl">
              <Trash2 className="w-10 h-10 text-red-500" />
              <div>
                <p className="text-xl font-semibold text-red-700">Apakah Anda yakin ingin menghapus check-in ini?</p>
                <p className="text-lg text-red-600 mt-2">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            {checkInToDelete && (
              <div className="flex items-center gap-6 p-6 bg-blue-50 rounded-xl border border-blue-200">
                <Avatar className="w-16 h-16 border-4 border-orange-300 shadow-lg">
                  <AvatarImage src={checkInToDelete.members?.photo_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-orange-500 text-white font-bold text-2xl">
                    {getInitials(checkInToDelete.members?.full_name || '')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-bold text-blue-800">{checkInToDelete.members?.full_name}</h3>
                  <p className="text-lg text-blue-600">Kode: {checkInToDelete.members?.member_code}</p>
                  <p className="text-base text-blue-500">
                    Check-in: {format(new Date(checkInToDelete.check_in_time), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-6">
            <Button
              onClick={async () => {
                if (checkInToDelete) {
                  await handleDeleteCheckIn(checkInToDelete.id)
                  setIsConfirmDeleteOpen(false)
                  setCheckInToDelete(null)
                }
              }}
              variant="destructive"
              className="flex-1 h-16 text-xl font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
            >
              <Trash2 className="w-6 h-6 mr-3" />
              Ya, Hapus Check-in
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmDeleteOpen(false)
                setCheckInToDelete(null)
              }}
              className="flex-1 h-16 text-xl font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300 cursor-pointer"
            >
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  )
}
