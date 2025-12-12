'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, DollarSign, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import PackageDialog from '@/components/packages/PackageDialog'
import DeletePackageDialog from '@/components/packages/DeletePackageDialog'

interface Package {
  id: string
  package_name: string
  duration_days: number
  price: number
  description: string | null
  is_active: boolean
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)

  useEffect(() => {
    console.log('[PACKAGES] Loading packages data...')
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      console.log('[PACKAGES] Starting fetchPackages')
      setLoading(true)
      const { data, error } = await supabase
        .from('membership_packages')
        .select('id, package_name, duration_days, price, description, is_active')
        .order('duration_days', { ascending: true })

      if (error) throw error
      console.log('[PACKAGES] Data fetched:', data?.length || 0, 'packages')
      setPackages(data || [])
      console.log('[PACKAGES] Loading complete')
    } catch (error) {
      console.error('Error fetching packages:', error)
      toast.error('Gagal memuat data paket')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSuccess = () => {
    fetchPackages()
    toast.success('Paket berhasil ditambahkan')
  }

  const handleEditSuccess = () => {
    fetchPackages()
    setIsEditDialogOpen(false)
    setSelectedPackage(null)
    toast.success('Paket berhasil diupdate')
  }

  const handleDeleteSuccess = () => {
    fetchPackages()
    setIsDeleteDialogOpen(false)
    setSelectedPackage(null)
    toast.success('Paket berhasil dihapus')
  }

  const handleEdit = (pkg: Package) => {
    setSelectedPackage(pkg)
    setIsEditDialogOpen(true)
  }

  const handleDelete = (pkg: Package) => {
    setSelectedPackage(pkg)
    setIsDeleteDialogOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getDurationText = (days: number) => {
    if (days === 1) return '1 Hari'
    if (days === 7) return '1 Minggu'
    if (days === 30) return '1 Bulan'
    if (days === 90) return '3 Bulan'
    if (days === 180) return '6 Bulan'
    if (days === 365) return '1 Tahun'
    return `${days} Hari`
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-blue-50 p-3 sm:p-6 space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 rounded-3xl p-4 sm:p-8 shadow-xl text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-violet-400/30 to-blue-400/30 animate-pulse"></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4">
              <Calendar className="w-8 h-8 sm:w-12 sm:h-12 text-purple-200" />
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Paket Membership</h1>
                <p className="text-lg sm:text-xl text-purple-100 mt-1 sm:mt-2">
                  Kelola paket membership gym Anda
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 transition-all duration-300 rounded-xl px-4 sm:px-6 py-4 text-base lg:text-lg font-semibold hover:cursor-pointer"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="hidden sm:inline">Tambah Paket</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          </div>
        </div>

        {/* Package Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64 sm:h-80">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm sm:text-base text-muted-foreground">Memuat data paket...</p>
            </div>
          </div>
        ) : packages.length === 0 ? (
          <div className="flex items-center justify-center h-64 sm:h-80">
            <div className="text-center">
              <p className="text-base sm:text-lg text-muted-foreground">Belum ada paket membership</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {packages.map((pkg, index) => {
              const colors = [
                'bg-gradient-to-br from-blue-500 to-blue-600',
                'bg-gradient-to-br from-green-500 to-green-600',
                'bg-gradient-to-br from-purple-500 to-purple-600',
                'bg-gradient-to-br from-orange-500 to-orange-600',
                'bg-gradient-to-br from-teal-500 to-teal-600',
                'bg-gradient-to-br from-pink-500 to-pink-600'
              ]

              return (
                <Card key={pkg.id} className="border-0 shadow-lg bg-white overflow-hidden hover:cursor-pointer">
                  <CardHeader className={`${colors[index % colors.length]} text-white relative`}>
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative flex items-start justify-between">
                      <CardTitle className="text-xl font-bold">{pkg.package_name}</CardTitle>
                      <Badge variant={pkg.is_active ? 'default' : 'secondary'} className="bg-white/20 text-white border-white/30">
                        {pkg.is_active ? 'Aktif' : 'Tidak Aktif'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4 p-6">
                    <div className="flex items-center gap-3 text-base text-gray-600">
                      <Calendar className="w-5 h-5 text-primary-teal" />
                      <span className="font-medium">{getDurationText(pkg.duration_days)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <DollarSign className="w-6 h-6 text-green-500" />
                      <span className="text-3xl font-bold text-green-600">
                        {formatCurrency(pkg.price)}
                      </span>
                    </div>

                    {pkg.description && (
                      <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-primary-blue">
                        <p className="text-sm text-gray-700">{pkg.description}</p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex gap-2 p-6 pt-0">
                    <Button
                      onClick={() => handleEdit(pkg)}
                      className="flex-1 h-12 text-base hover:cursor-pointer border-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:border-blue-600 font-medium transition-all duration-200"
                      variant="outline"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(pkg)}
                      className="flex-1 h-12 text-base hover:cursor-pointer border-2 border-red-500 text-red-600 bg-red-50 hover:bg-red-50 hover:border-red-600 font-medium transition-all duration-200"
                      variant="outline"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Hapus
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <PackageDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <PackageDialog
        open={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setSelectedPackage(null)
        }}
        onSuccess={handleEditSuccess}
        package={selectedPackage}
        isEdit
      />

      <DeletePackageDialog
        open={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false)
          setSelectedPackage(null)
        }}
        package={selectedPackage}
        onSuccess={handleDeleteSuccess}
      />
    </Layout>
  )
}
