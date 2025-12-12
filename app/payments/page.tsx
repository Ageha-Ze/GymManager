'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, DollarSign, Calendar, CreditCard, CheckCircle, XCircle, Trash2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import PaymentDialog from '@/components/payments/PaymentDialog'
import InvoicePrint from '@/components/payments/InvoicePrint'

interface Payment {
  id: string
  member_id: string
  membership_id: string | null
  payment_date: string
  amount: number
  payment_method: string
  payment_status: string
  invoice_number: string | null
  notes: string | null
  created_at: string
  members?: {
    member_code: string
    full_name: string
    phone: string
    photo_url: string | null
  } | null
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  useEffect(() => {
    console.log('[PAYMENTS] Loading payments data...')
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      console.log('[PAYMENTS] Starting fetchPayments')
      setLoading(true)
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          members (
            member_code,
            full_name,
            phone,
            photo_url
          )
        `)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      console.log('[PAYMENTS] Data fetched:', data?.length || 0, 'payments')
      setPayments(data || [])
      console.log('[PAYMENTS] Loading complete')
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Gagal memuat data pembayaran')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
  try {
    setIsDeleting(true)
    console.log('🗑️ Deleting payment ID:', paymentId)
    
    // Optimistic update - hapus dari UI dulu
    const paymentToRemove = payments.find(p => p.id === paymentId)
    setPayments(prev => prev.filter(p => p.id !== paymentId))
    
    const { data, error, status, statusText } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)
      .select()

    console.log('📤 Delete response:', { data, error, status, statusText })

    if (error) {
      console.error('❌ Delete error:', error)
      // Rollback jika gagal
      if (paymentToRemove) {
        setPayments(prev => [...prev, paymentToRemove].sort((a, b) => 
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        ))
      }
      throw error
    }

    console.log('✅ Payment deleted successfully')
    toast.success('Pembayaran berhasil dihapus!')
    
    // Close dialog
    setIsConfirmDeleteOpen(false)
    setPaymentToDelete(null)
    
  } catch (error: unknown) {
    console.error('💥 Error deleting payment:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    toast.error(`Gagal menghapus pembayaran: ${message}`)
  } finally {
    setIsDeleting(false)
  }
}

  const filteredPayments = payments.filter(payment => {
    if (!searchQuery) return true

    const member = payment.members
    if (!member) return false

    return (
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.member_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery) ||
      (payment.invoice_number && payment.invoice_number.includes(searchQuery))
    )
  })

  const getPaymentMethodLabel = (method: string) => {
    const methods: {[key: string]: string} = {
      cash: 'Tunai',
      bank_transfer: 'Transfer Bank',
      qris: 'QRIS',
      gopay: 'GoPay',
      ovo: 'OVO',
      shopeepay: 'ShopeePay',
      credit_card: 'Kartu Kredit',
      other: 'Lainnya'
    }
    return methods[method] || method
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Sudah Dibayar</Badge>
      case 'pending':
        return <Badge variant="secondary">Menunggu</Badge>
      case 'failed':
        return <Badge variant="destructive">Gagal</Badge>
      case 'refunded':
        return <Badge variant="outline">Dikembalikan</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
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

  const handleAddSuccess = () => {
    fetchPayments()
    toast.success('Pembayaran berhasil dicatat')
  }

  const totalRevenue = payments
    .filter(p => p.payment_status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

  const pendingPayments = payments.filter(p => p.payment_status === 'pending').length
  const paidPayments = payments.filter(p => p.payment_status === 'paid').length

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 p-6 space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-pink-600 to-orange-600 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-400/30 via-pink-400/30 to-orange-400/30 animate-pulse"></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <DollarSign className="w-8 h-8 sm:w-12 sm:h-12 text-red-200" />
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold">Pembayaran</h1>
                <p className="text-lg sm:text-xl text-red-100 mt-2">
                  Kelola dan pantau semua transaksi pembayaran
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 transition-all duration-300 rounded-xl px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-lg font-semibold hover:cursor-pointer w-full sm:w-auto justify-center sm:justify-start"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
              <span className="text-center sm:text-left">Catat Pembayaran</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          <Card className="card-simple border-primary-green hover:cursor-pointer">
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-primary-green">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                Total Pendapatan
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pt-0 pb-4 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-primary-green mb-1 sm:mb-2">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs sm:text-sm text-gray-600">
                Dari semua pembayaran yang sudah diterima
              </p>
            </CardContent>
          </Card>

          <Card className="card-simple border-primary-teal hover:cursor-pointer">
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-primary-teal">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                Pembayaran Sudah Dibayar
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pt-0 pb-4 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-primary-teal mb-1 sm:mb-2">{paidPayments}</div>
              <p className="text-xs sm:text-sm text-gray-600">
                Transaksi yang telah selesai
              </p>
            </CardContent>
          </Card>

          <Card className="card-simple border-primary-orange hover:cursor-pointer">
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-primary-orange">
                <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                Pembayaran Tertunda
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pt-0 pb-4 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-primary-orange mb-1 sm:mb-2">{pendingPayments}</div>
              <p className="text-xs sm:text-sm text-gray-600">
                Menunggu konfirmasi pembayaran
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Cari nama member, kode member, nomor invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="border-border rounded-lg overflow-hidden bg-card">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Memuat data pembayaran...</p>
              </div>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-lg text-muted-foreground">
                  {searchQuery ? 'Tidak ada pembayaran yang sesuai dengan pencarian' : 'Belum ada data pembayaran'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border-2 border-blue-100 shadow-lg">
  <table className="w-full">
    <thead className="bg-gradient-to-r from-blue-500 to-purple-500">
      <tr>
        <th className="text-left p-4 text-base font-semibold text-white">👤 Member</th>
        <th className="text-left p-4 text-base font-semibold text-white">📄 Invoice</th>
        <th className="text-left p-4 text-base font-semibold text-white">📅 Tanggal</th>
        <th className="text-left p-4 text-base font-semibold text-white">💰 Jumlah</th>
        <th className="text-left p-4 text-base font-semibold text-white">💳 Metode</th>
        <th className="text-left p-4 text-base font-semibold text-white">✅ Status</th>
        <th className="text-left p-4 text-base font-semibold text-white">⚙️ Aksi</th>
      </tr>
    </thead>
    <tbody className="bg-white">
      {filteredPayments.map((payment, index) => (
        <tr 
          key={payment.id} 
          className={`border-t-2 border-blue-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 ${
            index % 2 === 0 ? 'bg-blue-50/30' : 'bg-white'
          }`}
        >
          <td className="p-4">
            {payment.members ? (
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 border-2 border-blue-300 shadow-md">
                  <AvatarImage src={payment.members.photo_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                    {getInitials(payment.members.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-base text-blue-900">{payment.members.full_name}</div>
                  <div className="text-sm text-blue-600 font-medium">
                    {payment.members.member_code} • {payment.members.phone}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-gray-400 italic">Member tidak ditemukan</span>
            )}
          </td>
          <td className="p-4">
            <div className="inline-block bg-orange-100 text-orange-700 font-mono font-semibold text-sm px-3 py-1 rounded-lg border border-orange-300">
              {payment.invoice_number || '-'}
            </div>
          </td>
          <td className="p-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 text-blue-700 font-medium text-base px-3 py-1 rounded-lg">
                {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: idLocale })}
              </div>
            </div>
          </td>
          <td className="p-4">
            <div className="text-xl font-bold text-green-600 bg-green-50 inline-block px-4 py-2 rounded-xl border-2 border-green-200 shadow-sm">
              {formatCurrency(payment.amount)}
            </div>
          </td>
          <td className="p-4">
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200 w-fit">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span className="text-base font-medium text-purple-700">{getPaymentMethodLabel(payment.payment_method)}</span>
            </div>
          </td>
          <td className="p-4">
            {getPaymentStatusBadge(payment.payment_status)}
          </td>
          <td className="p-4">
            <div className="flex gap-2">
              <InvoicePrint payment={payment} />
              <Button
                onClick={() => {
                  setPaymentToDelete(payment)
                  setIsConfirmDeleteOpen(true)
                }}
                size="sm"
                variant="ghost"
                className="text-xs text-red-600 hover:text-white hover:bg-red-500 hover:cursor-pointer rounded-lg transition-all duration-200 border-2 border-red-200 hover:border-red-600"
              >
                <Trash2 className="w-4 h-4" />
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

        {/* Result count */}
        {!loading && filteredPayments.length > 0 && (
          <p className="text-muted-foreground text-base">
            Menampilkan {filteredPayments.length} dari {payments.length} transaksi
          </p>
        )}
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Delete Payment Confirmation Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="bg-white rounded-2xl shadow-2xl border-blue-100">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-red-600 flex items-center gap-3">
              ⚠️ Hapus Pembayaran
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex items-center gap-4 p-6 bg-red-50 border-red-300 rounded-xl">
              <Trash2 className="w-10 h-10 text-red-500" />
              <div>
                <p className="text-xl font-semibold text-red-700">Apakah Anda yakin ingin menghapus pembayaran ini?</p>
                <p className="text-lg text-red-600 mt-2">Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi laporan keuangan.</p>
              </div>
            </div>

            {paymentToDelete && (
              <div className="flex items-center gap-6 p-6 bg-blue-50 rounded-xl border-blue-200">
                <Avatar className="w-20 h-20  border-orange-300 shadow-lg">
                  <AvatarImage src={paymentToDelete.members?.photo_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-orange-500 text-white font-bold text-3xl">
                    {getInitials(paymentToDelete.members?.full_name || '')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-bold text-blue-800">{paymentToDelete.members?.full_name}</h3>
                  <p className="text-lg text-blue-600">Invoice: {paymentToDelete.invoice_number}</p>
                  <p className="text-base text-blue-500">
                    {formatCurrency(paymentToDelete.amount)} • {format(new Date(paymentToDelete.payment_date), 'dd MMM yyyy', { locale: idLocale })}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-6 border-t">
            <Button
              onClick={async () => {
                if (paymentToDelete) {
                  await handleDeletePayment(paymentToDelete.id)
                  setIsConfirmDeleteOpen(false)
                  setPaymentToDelete(null)
                }
              }}
              variant="destructive"
              className="flex-1 h-16 text-xl font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
            >
              <Trash2 className="w-6 h-6 mr-3" />
              Ya, Hapus Pembayaran
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmDeleteOpen(false)
                setPaymentToDelete(null)
              }}
              className="flex-1 h-16 text-xl font-semibold border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300 cursor-pointer"
            >
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
