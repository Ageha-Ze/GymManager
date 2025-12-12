'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface Member {
  id: string
  member_code: string
  full_name: string
  phone: string
}

interface Package {
  id: string
  package_name: string
  duration_days: number
  price: number
  is_active: boolean
}

interface MembershipDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  member?: Member | null
}

export default function MembershipDialog({ open, onClose, onSuccess, member = null }: MembershipDialogProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState<Package[]>([])

  const [formData, setFormData] = useState({
    package_id: '',
    notes: '',
    payment_amount: 0
  })

  useEffect(() => {
    if (open) {
      fetchPackages()
      if (member) {
        resetForm()
      }
    }
  }, [open, member])

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_packages')
        .select('*')
        .eq('is_active', true)
        .order('duration_days', { ascending: true })

      if (error) throw error
      setPackages(data || [])
    } catch (error) {
      console.error('Error fetching packages:', error)
      toast.error('Gagal memuat paket membership')
    }
  }

  const resetForm = () => {
    setFormData({
      package_id: '',
      notes: '',
      payment_amount: 0
    })
  }

  const handlePackageChange = (packageId: string) => {
    const selectedPackage = packages.find(p => p.id === packageId)
    if (selectedPackage) {
      setFormData(prev => ({
        ...prev,
        package_id: packageId,
        payment_amount: selectedPackage.price
      }))
    }
  }

  const getMembershipEndDate = (): string => {
    const selectedPackage = packages.find(p => p.id === formData.package_id)
    if (selectedPackage) {
      const startDate = new Date()
      const endDate = addDays(startDate, selectedPackage.duration_days)
      return endDate.toISOString().split('T')[0]
    }
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!member || !formData.package_id) {
      toast.error('Member dan paket harus dipilih')
      return
    }

    const selectedPackage = packages.find(p => p.id === formData.package_id)
    if (!selectedPackage) {
      toast.error('Paket tidak ditemukan')
      return
    }

    try {
      setLoading(true)

      // Check if member already has an active membership
      const { data: existingMembership, error: checkError } = await supabase
        .from('member_memberships')
        .select('*')
        .eq('member_id', member.id)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString().split('T')[0])
        .maybeSingle()

      if (checkError) throw checkError

      if (existingMembership) {
        toast.error('Member masih memiliki membership aktif. Tidak dapat membuat membership baru.')
        return
      }

      // Calculate dates
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = getMembershipEndDate()

      // Create membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('member_memberships')
        .insert({
          member_id: member.id,
          package_id: formData.package_id,
          start_date: startDate,
          end_date: endDate,
          status: 'active',
          price_paid: selectedPackage.price,
          notes: formData.notes.trim() || null,
          created_by: user?.id
        })
        .select()
        .single()

      if (membershipError) {
        console.error('Membership creation failed:', membershipError)
        // Try to get more specific error message
        if (membershipError.message) {
          throw new Error(`Gagal membuat membership: ${membershipError.message}`)
        }
        throw new Error('Gagal membuat membership - periksa koneksi database')
      }

      if (!membershipData || !membershipData.id) {
        throw new Error('Membership berhasil dibuat namun tidak dapat mengambil ID')
      }

      // Create payment record with the membership ID
      try {
        const { data: invoiceData, error: invoiceError } = await supabase
          .rpc('generate_invoice_number')

        if (invoiceError) {
          console.warn('Invoice number generation failed:', invoiceError)
        }

        const invoiceNumber = invoiceData || `INV-${Date.now().toString().slice(-6)}`

        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            member_id: member.id,
            membership_id: membershipData.id, // Use the actual membership ID
            payment_date: startDate,
            amount: selectedPackage.price,
            payment_method: 'cash', // Default, can be changed
            payment_status: 'paid',
            invoice_number: invoiceNumber,
            notes: `Pembayaran membership ${selectedPackage.package_name}`,
            received_by: user?.id
          })

        if (paymentError) {
          console.error('Payment creation error:', paymentError)
          // Membership created successfully, but payment failed
          toast.warning('Membership dibuat berhasil, namun pencatatan pembayaran gagal')
        }
      } catch (paymentErr) {
        console.error('Error creating payment:', paymentErr)
        toast.warning('Membership dibuat berhasil, namun ada masalah dengan pembayaran')
        // Don't throw - membership was created successfully
      }

      onSuccess()
      resetForm()
      onClose()
      toast.success(`Membership ${selectedPackage.package_name} berhasil dibuat untuk ${member.full_name}`)

    } catch (error) {
      console.error('Error creating membership:', error)
      toast.error('Gagal membuat membership')
    } finally {
      setLoading(false)
    }
  }

  const selectedPackage = packages.find(p => p.id === formData.package_id)

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-2xl shadow-2xl border border-blue-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-blue-800 flex items-center gap-3">
            💪 Buat Membership Baru
          </DialogTitle>
        </DialogHeader>

        {member && (
          <div className="flex items-center gap-6 p-6 bg-blue-50 rounded-xl border border-blue-200 mb-4">
            <Avatar className="w-20 h-20 border-4 border-orange-300 shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-orange-500 text-white font-bold text-3xl">
                {getInitials(member.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-blue-800">{member.full_name}</h3>
              <p className="text-lg text-blue-600">Kode: {member.member_code}</p>
              <p className="text-lg text-blue-500">Telp: {member.phone}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Package Selection */}
            <div className="space-y-2">
              <Label htmlFor="package_id" className="text-base">Pilih Paket Membership *</Label>
              <Select
                value={formData.package_id}
                onValueChange={handlePackageChange}
                disabled={loading}
              >
                <SelectTrigger className="h-12 text-base border-blue-200 focus:border-orange-400 rounded-xl bg-blue-100 cursor-pointer">
                  <SelectValue placeholder="Pilih paket membership" />
                </SelectTrigger>
 <SelectContent 
  className="bg-white border-2 border-blue-200 rounded-lg shadow-lg max-h-[300px]"
  position="popper"
  sideOffset={5}
>
  {packages.map((pkg) => (
    <SelectItem 
      key={pkg.id} 
      value={pkg.id}
      className="cursor-pointer"
    >
      {pkg.package_name} - {formatCurrency(pkg.price)}
    </SelectItem>
  ))}
</SelectContent>
              </Select>
            </div>

            {/* Package Details */}
            {selectedPackage && (
              <div className="p-6 bg-gradient-to-r from-blue-50 to-orange-50 border border-blue-200 rounded-xl space-y-4 shadow-lg">
                <h4 className="font-bold text-xl text-blue-800 flex items-center gap-3">
                  📋 Detail Paket
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    <div>
                      <span className="text-base text-blue-800 font-semibold">Durasi</span>
                      <p className="text-lg text-blue-600">{selectedPackage.duration_days} hari</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200">
                    <DollarSign className="w-6 h-6 text-orange-600" />
                    <div>
                      <span className="text-base text-orange-800 font-semibold">Harga</span>
                      <p className="text-lg text-orange-600">{formatCurrency(selectedPackage.price)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-blue-300">
                  <p className="text-lg text-blue-700 font-semibold">
                    Mulai: {format(new Date(), 'dd MMMM yyyy', { locale: idLocale })}
                  </p>
                  <p className="text-lg text-blue-600">
                    Berakhir: {format(new Date(getMembershipEndDate()), 'dd MMMM yyyy', { locale: idLocale })}
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base">Catatan</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Catatan tambahan (opsional)"
                rows={3}
                className="text-base border-blue-200 focus:border-orange-400 rounded-xl bg-blue-50"
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter className="gap-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-16 text-xl font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300 cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.package_id}
              className="flex-1 h-16 text-xl font-bold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
            >
              {loading ? 'Membuat...' : '💪 Buat Membership'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
