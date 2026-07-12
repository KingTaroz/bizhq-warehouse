'use client'

import { useState } from 'react'
import { cancelOrder, returnOrder } from '@/app/actions/order'
import { useRouter } from 'next/navigation'

const STATUS_BADGE: Record<string, { label: string, cls: string }> = {
  PENDING: { label: 'รอแพ็ค', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  PACKED: { label: 'ตัดสต๊อกแล้ว', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  CANCELLED: { label: 'ยกเลิก', cls: 'bg-muted text-muted-foreground border-border' },
  RETURNED: { label: 'คืนของแล้ว', cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
}

export default function OrderList({ orders }: { orders: any[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleCancel = async (o: any) => {
    if (!confirm(`ยกเลิกออเดอร์ ${o.orderId}?`)) return
    setBusyId(o.id)
    const res = await cancelOrder(o.id)
    setMessage(res.error || `ยกเลิกออเดอร์ ${o.orderId} แล้ว`)
    setBusyId(null)
    router.refresh()
  }

  const handleReturn = async (o: any) => {
    if (!confirm(`รับคืนของออเดอร์ ${o.orderId}?\nระบบจะบวกสต๊อกกลับตามที่เคยตัดไว้`)) return
    setBusyId(o.id)
    const res = await returnOrder(o.id)
    setMessage(res.error || `รับคืนออเดอร์ ${o.orderId} แล้ว (คืนสต๊อก ${res.restocked} รายการ)`)
    setBusyId(null)
    router.refresh()
  }

  if (orders.length === 0) return null

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">ออเดอร์ล่าสุด</h2>
        <p className="text-muted-foreground text-sm mt-1">ยกเลิก / รับคืนของ ได้จากรายการนี้</p>
      </div>

      {message && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm text-foreground">
          {message}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b border-border text-sm">
              <th className="px-6 py-3 font-medium">Order ID</th>
              <th className="px-6 py-3 font-medium">วันที่ขาย</th>
              <th className="px-6 py-3 font-medium">แพลตฟอร์ม</th>
              <th className="px-6 py-3 font-medium text-right">ยอด</th>
              <th className="px-6 py-3 font-medium text-center">สถานะ</th>
              <th className="px-6 py-3 font-medium text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map(o => {
              const badge = STATUS_BADGE[o.status] || STATUS_BADGE.PENDING
              return (
                <tr key={o.id} className="hover:bg-muted/30">
                  <td className="px-6 py-3 font-mono text-sm text-foreground">{o.orderId}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {o.orderDate ? new Date(o.orderDate).toLocaleDateString('th-TH') : `(อัปโหลด ${new Date(o.createdAt).toLocaleDateString('th-TH')})`}
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{o.platform}</td>
                  <td className="px-6 py-3 text-sm text-right text-foreground">{o.totalAmount.toLocaleString('th-TH')} ฿</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${badge.cls}`}>{badge.label}</span>
                  </td>
                  <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                    {o.status === 'PENDING' && (
                      <button onClick={() => handleCancel(o)} disabled={busyId === o.id}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muted hover:bg-muted/70 text-foreground border border-border disabled:opacity-50">
                        ยกเลิก
                      </button>
                    )}
                    {o.status === 'PACKED' && (
                      <button onClick={() => handleReturn(o)} disabled={busyId === o.id}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 disabled:opacity-50">
                        {busyId === o.id ? 'กำลังคืน...' : 'รับคืนของ'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
