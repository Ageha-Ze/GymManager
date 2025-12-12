'use client'

import { useState, useEffect, useMemo } from 'react'
import Layout from '@/components/layout/Layout'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, Pencil, Trash2, Dumbbell } from 'lucide-react'
import { toast } from 'sonner'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import MemberDialog from '@/components/members/MemberDialog'
import MemberDetailDialog from '@/components/members/MemberDetailDialog'
import DeleteMemberDialog from '@/components/members/DeleteMemberDialog'

interface Member {
  id: string
  member_code: string
  full_name: string
  phone: string
  email: string | null
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | null
  address: string | null
  emergency_contact: string | null
  emergency_name: string | null
  join_date: string
  photo_url: string | null
  notes: string | null
  is_active: boolean
}

// Interface for member list view (without unnecessary fields)
interface MemberListItem {
  id: string
  member_code: string
  full_name: string
  phone: string
  email: string | null
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | null
  address: string | null
  join_date: string
  photo_url: string | null
  is_active: boolean
  created_at: string
}

const ITEMS_PER_PAGE = 20

export default function MembersPage() {
  const [members, setMembers] = useState<MemberListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async (page: number = 1) => {
    try {
      console.log('[MEMBERS] Starting fetchMembers for page:', page)
      setLoading(true)
      // Calculate offset for server-side pagination
      const offset = (page - 1) * ITEMS_PER_PAGE

      const query = supabase
        .from('members')
        .select(`
          id,
          member_code,
          full_name,
          phone,
          email,
          date_of_birth,
          gender,
          address,
          join_date,
          photo_url,
          is_active,
          created_at
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1)

      const { data, error } = await query

      if (error) throw error

      console.log('[MEMBERS] Data fetched:', data?.length || 0, 'members')

      // If this is page 1 or we're doing a full reload, replace the data
      // Otherwise append for additional pages (though for now we'll keep it simple)
      setMembers(data || [])
      console.log('[MEMBERS] Loading complete')
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('Gagal memuat data member')
    } finally {
      setLoading(false)
    }
  }

  // Separate function to get total count for pagination
  const getTotalMembersCount = async () => {
    try {
      const { data: filteredData, error } = await supabase
        .from('members')
        .select('id', { count: 'exact' })

      if (error) throw error
      return filteredData?.length || 0
    } catch (error) {
      console.error('Error getting total count:', error)
      return 0
    }
  }

  // Function to fetch full member details for editing/detailed view
  const fetchMemberDetails = async (memberId: string) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching member details:', error)
      toast.error('Gagal memuat detail member')
      return null
    }
  }

  // Load members when page changes
  useEffect(() => {
    fetchMembers(currentPage)
  }, [currentPage])

  // Initial load
  useEffect(() => {
    fetchMembers(1)
    getTotalMembersCount().then(total => {
      const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
      // For now we'll keep client-side filtering for simplicity
    })
  }, [])

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch =
        member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.member_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.phone?.includes(searchQuery)

      const matchesFilter =
        filterStatus === 'all' ||
        (filterStatus === 'active' && member.is_active) ||
        (filterStatus === 'inactive' && !member.is_active)

      return matchesSearch && matchesFilter
    })
  }, [members, searchQuery, filterStatus])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus])

  // Pagination logic
  const totalItems = filteredMembers.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentItems = filteredMembers.slice(startIndex, endIndex)

  // Update current page when filters change and no items left on current page
  useEffect(() => {
    if (currentPage > 1 && currentItems.length === 0 && filteredMembers.length > 0) {
      setCurrentPage(Math.max(1, Math.ceil(filteredMembers.length / ITEMS_PER_PAGE)))
    }
  }, [currentItems.length, filteredMembers.length, currentPage])

  const handleAddSuccess = () => {
    fetchMembers()
    setIsAddDialogOpen(false)
    toast.success('Member berhasil ditambahkan')
  }

  const handleEditSuccess = () => {
    fetchMembers()
    setIsEditDialogOpen(false)
    setSelectedMember(null)
    toast.success('Member berhasil diupdate')
  }

  const handleDeleteSuccess = () => {
    fetchMembers()
    setIsDeleteDialogOpen(false)
    setSelectedMember(null)
    toast.success('Member berhasil dihapus')
  }

  const handleEdit = async (member: MemberListItem) => {
    const fullMember = await fetchMemberDetails(member.id)
    if (fullMember) {
      setSelectedMember(fullMember)
      setIsEditDialogOpen(true)
    }
  }

  const handleViewDetail = async (member: MemberListItem) => {
    const fullMember = await fetchMemberDetails(member.id)
    if (fullMember) {
      const memberData: Member = {
        ...fullMember,
        emergency_contact: fullMember.emergency_contact || null,
        emergency_name: fullMember.emergency_name || null,
        notes: fullMember.notes || null
      }
      setSelectedMember(memberData)
      setIsDetailDialogOpen(true)
    }
  }

  const handleDelete = async (member: MemberListItem) => {
    const fullMember = await fetchMemberDetails(member.id)
    if (fullMember) {
      const memberData: Member = {
        ...fullMember,
        emergency_contact: fullMember.emergency_contact || null,
        emergency_name: fullMember.emergency_name || null,
        notes: fullMember.notes || null
      }
      setSelectedMember(memberData)
      setIsDeleteDialogOpen(true)
    }
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

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-3 sm:p-6 space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-orange-500 rounded-2xl p-4 sm:p-8 text-white shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4">
              <Dumbbell className="w-8 h-8 sm:w-12 sm:h-12 text-orange-300" />
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Data Member Gym</h1>
                <p className="text-lg sm:text-xl text-blue-100 mt-1 sm:mt-2">
                  Kelola anggota fitness Anda dengan energi maksimal!
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white h-12 lg:h-16 px-4 lg:px-8 text-base lg:text-xl font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <Plus className="w-4 h-4 lg:w-6 lg:h-6 mr-2 sm:mr-3" />
              <span className="hidden sm:inline">Tambah Member Baru</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-blue-100">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 sm:w-6 h-5 sm:h-6 text-blue-400" />
              <Input
                placeholder="Cari nama, kode member, atau telepon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 sm:pl-12 h-12 sm:h-14 text-base sm:text-lg border-2 border-blue-200 focus:border-orange-400 rounded-xl bg-blue-50"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-12 sm:h-14 w-full sm:w-52 items-center justify-between rounded-xl border-2 border-blue-200 bg-blue-50 px-3 sm:px-4 py-3 text-base sm:text-lg ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl overflow-hidden shadow-2xl border border-blue-100">
          {loading ? (
            <div className="flex items-center justify-center h-64 sm:h-80">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-t-4 border-b-4 border-orange-500 mx-auto"></div>
                <p className="mt-4 sm:mt-6 text-lg sm:text-xl text-blue-600 font-semibold">Memuat data member...</p>
              </div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex items-center justify-center h-64 sm:h-80">
              <div className="text-center">
                <Dumbbell className="w-12 sm:w-16 h-12 sm:h-16 text-blue-300 mx-auto mb-4" />
                <p className="text-lg sm:text-xl text-blue-600 font-semibold">
                  {searchQuery || filterStatus !== 'all'
                    ? 'Tidak ada member yang sesuai dengan filter'
                    : 'Belum ada data member. Ayo tambah yang pertama!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gradient-to-r from-blue-500 to-orange-500 text-white">
                  <tr>
                    <th className="text-left p-3 sm:p-6 text-base sm:text-lg lg:text-xl font-bold">Member</th>
                    <th className="text-left p-3 sm:p-6 text-base sm:text-lg lg:text-xl font-bold">Kode</th>
                    <th className="text-left p-3 sm:p-6 text-base sm:text-lg lg:text-xl font-bold">Telepon</th>
                    <th className="text-left p-3 sm:p-6 text-base sm:text-lg lg:text-xl font-bold">Status</th>
                    <th className="text-center p-3 sm:p-6 text-base sm:text-lg lg:text-xl font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((member, index) => (
                    <tr key={member.id} className={`border-b border-blue-100 hover:bg-blue-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-25'}`}>
                      <td className="p-3 sm:p-6">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <Avatar className="w-12 sm:w-14 h-12 sm:h-14 border-4 border-orange-300 shadow-lg">
                            <AvatarImage src={member.photo_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-orange-500 text-white font-bold text-sm sm:text-lg">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-base sm:text-lg lg:text-xl text-blue-800">{member.full_name}</div>
                            {member.email && (
                              <div className="text-sm sm:text-base lg:text-lg text-blue-600">{member.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-6 text-base sm:text-lg lg:text-xl font-semibold text-blue-700">{member.member_code}</td>
                      <td className="p-3 sm:p-6 text-base sm:text-lg lg:text-xl text-blue-700">{member.phone}</td>
                      <td className="p-3 sm:p-6">
                        <Badge variant={member.is_active ? 'default' : 'secondary'} className={`text-sm sm:text-base lg:text-lg px-2 sm:px-4 py-1 sm:py-2 rounded-full ${member.is_active ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-400 text-white'}`}>
                          {member.is_active ? 'Aktif' : 'Tidak Aktif'}
                        </Badge>
                      </td>
                      <td className="p-3 sm:p-6 text-center">
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetail(member)}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition-all duration-200"
                          >
                            <Eye className="w-4 h-4 sm:w-6 sm:h-6" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(member)}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-600 transition-all duration-200"
                          >
                            <Pencil className="w-4 h-4 sm:w-6 sm:h-6" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(member)}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-all duration-200"
                          >
                            <Trash2 className="w-4 h-4 sm:w-6 sm:h-6" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Result count and Pagination */}
        {!loading && filteredMembers.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <p className="text-blue-700 text-xl font-semibold">
                Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredMembers.length)} dari {filteredMembers.length} member
              </p>

              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent className="gap-2">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={`rounded-xl px-4 py-2 text-lg font-semibold transition-all duration-200 ${currentPage === 1 ? 'pointer-events-none opacity-50 bg-gray-200' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                      />
                    </PaginationItem>

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNumber = Math.max(1, Math.min(
                        totalPages - 4,
                        currentPage - 2
                      )) + i

                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNumber)}
                            isActive={pageNumber === currentPage}
                            className={`rounded-xl px-4 py-2 text-lg font-semibold transition-all duration-200 ${pageNumber === currentPage ? 'bg-orange-500 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        className={`rounded-xl px-4 py-2 text-lg font-semibold transition-all duration-200 ${currentPage === totalPages ? 'pointer-events-none opacity-50 bg-gray-200' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <MemberDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <MemberDialog
        open={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setSelectedMember(null)
        }}
        onSuccess={handleEditSuccess}
        member={selectedMember}
        isEdit
      />

      <MemberDetailDialog
        open={isDetailDialogOpen}
        onClose={() => {
          setIsDetailDialogOpen(false)
          setSelectedMember(null)
        }}
        member={selectedMember}
        onEdit={(member) => {
          const memberListItem: MemberListItem = {
            id: member.id,
            member_code: member.member_code,
            full_name: member.full_name,
            phone: member.phone,
            email: member.email,
            date_of_birth: member.date_of_birth,
            gender: member.gender,
            address: member.address,
            join_date: member.join_date,
            photo_url: member.photo_url,
            is_active: member.is_active,
            created_at: new Date().toISOString() // This will be refetched anyway
          }
          handleEdit(memberListItem)
        }}
        onDelete={(member) => {
          const memberListItem: MemberListItem = {
            id: member.id,
            member_code: member.member_code,
            full_name: member.full_name,
            phone: member.phone,
            email: member.email,
            date_of_birth: member.date_of_birth,
            gender: member.gender,
            address: member.address,
            join_date: member.join_date,
            photo_url: member.photo_url,
            is_active: member.is_active,
            created_at: new Date().toISOString() // This will be refetched anyway
          }
          handleDelete(memberListItem)
        }}
        onMembershipSuccess={fetchMembers}
      />

      <DeleteMemberDialog
        open={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false)
          setSelectedMember(null)
        }}
        member={selectedMember}
        onSuccess={handleDeleteSuccess}
      />
    </Layout>
  )
}
