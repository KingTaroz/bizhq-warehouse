'use client'

import { useState, useMemo } from 'react'
import { matchPlatformProduct, unmatchPlatformProduct, autoMatchPlatformProducts } from '@/app/actions/platform'
import { useRouter } from 'next/navigation'
import { Pagination } from '@/components/Pagination'

export default function PlatformProductClient({ items, products, platform }: { items: any[], products: any[], platform: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<'UNMATCHED' | 'MATCHED' | 'ALL'>('UNMATCHED')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // แถวที่กำลังจับคู่
  const [mappingId, setMappingId] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [qty, setQty] = useState(1)

  const filtered = useMemo(() => {
    let list = items
    if (tab === 'UNMATCHED') list = list.filter(i => !i.productId)
    if (tab === 'MATCHED') list = list.filter(i => i.productId)
    if (search.trim()) {
      const terms = search.toLowerCase().trim().split(/\s+/)
      list = list.filter(i => {
        const text = `${i.itemName} ${i.variationName || ''}`.toLowerCase()
        return terms.every(t => text.includes(t))
      })
    }
    return list
  }, [items, tab, search])

  const productResults = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 20)
    const terms = productSearch.toLowerCase().trim().split(/\s+/)
    return products.filter(p => {
      const text = [p.brand, p.name, p.viscosity, p.size].filter(Boolean).join(' ').toLowerCase()
      return terms.every(t => text.includes(t))
    }).slice(0, 20)
  }, [products, productSearch])

  const unmatchedCount = items.filter(i => !i.productId).length

  const handleAutoMatch = async () => {
    if (!confirm('รันจับคู่อัตโนมัติ? ระบบจะจับเฉพาะรายการที่มั่นใจ')) return
    setBusy(true)
    const res = await autoMatchPlatformProducts(platform)
    setMessage(`จับคู่อัตโนมัติได้ ${res.matched} รายการ เหลือจับคู่เอง ${res.remaining} รายการ`)
    setBusy(false)
    router.refresh()
  }

  const handleMatch = async (ppId: string, productId: string) => {
    setBusy(true)
    const res = await matchPlatformProduct(ppId, productId, qty)
    setMessage(res.error || 'จับคู่สำเร็จ')
    setBusy(false)
    setMappingId(null)
    setProductSearch('')
    setQty(1)
    router.refresh()
  }

  const handleUnmatch = async (pp: any) => {
    if (!confirm(`ยกเลิกการจับคู่ "${pp.itemName}"?`)) return
    setBusy(true)
    const res = await unmatchPlatformProduct(pp.id)
    setMessage(res.error || 'ยกเลิกการจับคู่แล้ว')
    setBusy(false)
    router.refresh()
  }

  const totalItems = filtered.length;
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between bg-card p-4 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {([['UNMATCHED', `รอจับคู่ (${unmatchedCount})`], ['MATCHED', `จับคู่แล้ว (${items.length - unmatchedCount})`], ['ALL', `ทั้งหมด (${items.length})`]] as const).map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า Shopee..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="flex-1 lg:w-72 px-4 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          <button onClick={handleAutoMatch} disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 whitespace-nowrap">
            {busy ? '⏳...' : '⚡ จับคู่อัตโนมัติ'}
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm text-foreground">{message}</div>
      )}

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-12 bg-card rounded-2xl border border-border">ไม่มีรายการ</div>
        )}
        {paginatedItems.map(pp => (
          <div key={pp.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div className="min-w-0">
                <div className="font-bold text-foreground truncate">{pp.itemName}</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {pp.variationName && <span className="mr-3">ตัวเลือก: {pp.variationName}</span>}
                  <span className="mr-3">ราคา {pp.price.toLocaleString('th-TH')} ฿</span>
                  <span>สต๊อก Shopee: {pp.stock}</span>
                </div>
                {pp.product && (
                  <div className="text-sm mt-1 text-emerald-500 font-medium">
                    ✅ {pp.product.brand} {pp.product.name} {pp.product.viscosity || ''} {pp.product.size || ''} × {pp.quantity} ชิ้น/หน่วยขาย
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {pp.productId ? (
                  <button onClick={() => handleUnmatch(pp)} disabled={busy}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-muted hover:bg-muted/70 text-foreground border border-border disabled:opacity-50">
                    ยกเลิกจับคู่
                  </button>
                ) : (
                  <button onClick={() => { setMappingId(mappingId === pp.id ? null : pp.id); setProductSearch(''); setQty(1); }}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20">
                    {mappingId === pp.id ? 'ปิด' : 'จับคู่'}
                  </button>
                )}
              </div>
            </div>

            {/* Inline mapping panel */}
            {mappingId === pp.id && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    autoFocus
                    placeholder="ค้นหาสินค้าในระบบ (ยี่ห้อ รุ่น ขนาด)..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="flex-1 px-4 py-2 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                  />
                  <label className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                    จำนวนชิ้นจริง/หน่วยขาย
                    <input type="number" min={1} inputMode="numeric" value={qty}
                      onChange={e => setQty(parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 bg-background border border-border rounded-xl text-foreground text-center font-bold" />
                  </label>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-border rounded-xl border border-border">
                  {productResults.map(p => (
                    <button key={p.id} onClick={() => handleMatch(pp.id, p.id)} disabled={busy}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors disabled:opacity-50">
                      <span className="font-medium text-foreground">{p.brand} {p.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">{p.viscosity || ''} {p.size || ''} (บรรจุ {p.qtyPerCarton}/ลัง)</span>
                    </button>
                  ))}
                  {productResults.length === 0 && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">ไม่พบสินค้า</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {totalItems > 0 && (
        <Pagination 
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(items) => {
            setItemsPerPage(items);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  )
}
