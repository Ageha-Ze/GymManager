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
import { Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface PaymentDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Member {
  id: string
  member_code: string
  full_name: string
  phone: string
  photo_url: string | null
}

export default function PaymentDialog({ open, onClose, onSuccess }: PaymentDialogProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])

  const [formData, setFormData] = useState({
    member_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'cash',
    notes: ''
  })

  useEffect(() => {
    if (open) {
      fetchMembers()
      resetForm()
    }
  }, [open])

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('Gagal memuat data member')
    }
  }

  const resetForm = () => {
    setFormData({
      member_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      amount: '',
      payment_method: 'cash',
      notes: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.member_id || !formData.amount) {
      toast.error('Member dan jumlah harus diisi')
      return
    }

    const amount = parseFloat(formData.amount)
    if (amount <= 0) {
      toast.error('Jumlah pembayaran harus lebih dari 0')
      return
    }

    try {
      setLoading(true)

      // Generate invoice number
      const { data: invoiceData, error: invoiceError } = await supabase
        .rpc('generate_invoice_number')

      const invoiceNumber = invoiceData || `INV-${Date.now()}`

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          member_id: formData.member_id,
          payment_date: formData.payment_date,
          amount: amount,
          payment_method: formData.payment_method,
          payment_status: 'paid',
          invoice_number: invoiceNumber,
          notes: formData.notes.trim() || null,
          received_by: user?.id
        })

      if (paymentError) throw paymentError

      toast.success('Pembayaran berhasil dicatat')
      onSuccess()
      resetForm()
      onClose()

    } catch (error) {
      console.error('Error creating payment:', error)
      toast.error('Gagal mencatat pembayaran')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '')
    return numericValue
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-2xl shadow-2xl border border-blue-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-blue-800 flex items-center gap-3">
            💰 Catat Pembayaran Baru
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Member Selection */}
            <div className="space-y-2">
              <Label htmlFor="member_id" className="text-base">Pilih Member *</Label>
              <Select
                value={formData.member_id}
                onValueChange={(value) => setFormData({ ...formData, member_id: value })}
                disabled={loading}
              >
                <SelectTrigger className="h-12 text-base border-blue-200 focus:border-orange-400 rounded-xl bg-blue-50 cursor-pointer">
                  <SelectValue placeholder="Pilih member" />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-blue-200 rounded-lg shadow-lg">
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.full_name}</span>
                        <span className="text-sm text-muted-foreground">({member.member_code})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Payment Date */}
              <div className="space-y-2">
                <Label htmlFor="payment_date" className="text-base">Tanggal Pembayaran *</Label>
                <div className="relative">
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    required
                    className="h-12 text-base border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl pr-12 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-clear-button]:hidden"
                    disabled={loading}
                  />
                  <div 
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    onClick={() => {
                      const input = document.getElementById('payment_date') as HTMLInputElement
                      input?.showPicker?.()
                    }}
                  >
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-base">Jumlah (Rp) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.amount}
                  onChange={(e) => {
                    const value = formatCurrency(e.target.value)
                    setFormData({ ...formData, amount: value })
                  }}
                  placeholder="300000"
                  required
                  className="h-12 text-base border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="payment_method" className="text-base">Metode Pembayaran</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                disabled={loading}
              >
                <SelectTrigger className="h-12 text-base border-blue-200 focus:border-orange-400 rounded-xl bg-blue-50 cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-blue-200 rounded-lg shadow-lg">
                  <SelectItem value="cash" className="cursor-pointer">💵 Tunai</SelectItem>
                  <SelectItem value="bank_transfer" className="cursor-pointer">🏦 Transfer Bank</SelectItem>
                  <SelectItem value="qris" className="cursor-pointer">📱 QRIS</SelectItem>
                  <SelectItem value="gopay" className="cursor-pointer">💚 GoPay</SelectItem>
                  <SelectItem value="ovo" className="cursor-pointer">💜 OVO</SelectItem>
                  <SelectItem value="shopeepay" className="cursor-pointer">🧡 ShopeePay</SelectItem>
                  <SelectItem value="credit_card" className="cursor-pointer">💳 Kartu Kredit</SelectItem>
                  <SelectItem value="other" className="cursor-pointer">🔹 Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base">Catatan</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Catatan tambahan (opsional)"
                rows={3}
                className="text-base border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl"
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
              disabled={loading || !formData.member_id || !formData.amount}
              className="flex-1 h-16 text-xl font-bold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Menyimpan...' : '💰 Simpan Pembayaran'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}