'use client'

import { useState, useMemo } from 'react'
import { matchPlatformProduct, matchPlatformProductSet, unmatchPlatformProduct, autoMatchPlatformProducts } from '@/app/actions/platform'
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
  // โหมดจัดเซต: ตะกร้าสินค้าหลายตัวต่อ 1 ตัวเลือกสินค้า
  const [setMode, setSetMode] = useState(false)
  const [basket, setBasket] = useState<{ productId: string, label: string, quantity: number }[]>([])

  const isMatched = (i: any) => !!i.productId || !!i.isSet

  const filtered = useMemo(() => {
    let list = items
    if (tab === 'UNMATCHED') list = list.filter(i => !isMatched(i))
    if (tab === 'MATCHED') list = list.filter(i => isMatched(i))
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

  const unmatchedCount = items.filter(i => !isMatched(i)).length

  const handleAutoMatch = async () => {
    if (!confirm('รันจับคู่อัตโนมัติ? ระบบจะจับเฉพาะรายการที่มั่นใจ')) return
    setBusy(true)
    const res = await autoMatchPlatformProducts(platform)
    setMessage(`จับคู่อัตโนมัติได้ ${res.matched} รายการ เหลือจับคู่เอง ${res.remaining} รายการ`)
    setBusy(false)
    router.refresh()
  }

  const resetPanel = () => {
    setMappingId(null)
    setProductSearch('')
    setQty(1)
    setSetMode(false)
    setBasket([])
  }

  const handleMatch = async (ppId: string, productId: string) => {
    setBusy(true)
    const res = await matchPlatformProduct(ppId, productId, qty)
    setMessage(res.error || 'จับคู่สำเร็จ')
    setBusy(false)
    resetPanel()
    router.refresh()
  }

  const addToBasket = (p: any) => {
    setBasket(prev => {
      const existing = prev.find(b => b.productId === p.id)
      if (existing) return prev.map(b => b.productId === p.id ? { ...b, quantity: b.quantity + qty } : b)
      return [...prev, { productId: p.id, label: `${p.brand || ''} ${p.name} ${p.viscosity || ''} ${p.size || ''}`.trim(), quantity: qty }]
    })
    setProductSearch('')
    setQty(1)
  }

  const handleSaveSet = async (ppId: string) => {
    if (basket.length === 0) return
    setBusy(true)
    const res = await matchPlatformProductSet(ppId, basket.map(b => ({ productId: b.productId, quantity: b.quantity })))
    setMessage(res.error || `จับคู่เซตสำเร็จ (${basket.length} สินค้า)`)
    setBusy(false)
    resetPanel()
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
            placeholder={`ค้นหาชื่อสินค้า ${platform === 'TIKTOK' ? 'TikTok' : 'Shopee'}...`}
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
                  <span>สต๊อก {platform === 'TIKTOK' ? 'TikTok' : 'Shopee'}: {pp.stock}</span>
                </div>
                {pp.product && (
                  <div className="text-sm mt-1 text-emerald-500 font-medium">
                    ✅ {pp.product.brand} {pp.product.name} {pp.product.viscosity || ''} {pp.product.size || ''} × {pp.quantity} ชิ้น/หน่วยขาย
                  </div>
                )}
                {pp.isSet && (
                  <div className="text-sm mt-1 space-y-0.5">
                    <span className="text-purple-500 font-bold">📦 เซต ({pp.setItems?.length || 0} สินค้า):</span>
                    {(pp.setItems || []).map((si: any) => (
                      <div key={si.id} className="text-emerald-500 font-medium pl-5">
                        • {si.product?.brand} {si.product?.name} {si.product?.viscosity || ''} {si.product?.size || ''} × {si.quantity}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {(pp.productId || pp.isSet) ? (
                  <button onClick={() => handleUnmatch(pp)} disabled={busy}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-muted hover:bg-muted/70 text-foreground border border-border disabled:opacity-50">
                    ยกเลิกจับคู่
                  </button>
                ) : (
                  <button onClick={() => { if (mappingId === pp.id) { resetPanel() } else { resetPanel(); setMappingId(pp.id) } }}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20">
                    {mappingId === pp.id ? 'ปิด' : 'จับคู่'}
                  </button>
                )}
              </div>
            </div>

            {/* Inline mapping panel */}
            {mappingId === pp.id && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                {/* โหมด: เดี่ยว / เซต */}
                <div className="flex gap-2">
                  <button onClick={() => { setSetMode(false); setBasket([]) }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${!setMode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                    สินค้าเดี่ยว
                  </button>
                  <button onClick={() => setSetMode(true)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${setMode ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                    📦 จัดเซต (หลายสินค้า)
                  </button>
                </div>

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
                    {setMode ? 'จำนวนชิ้น (ต่อครั้งที่เพิ่ม)' : 'จำนวนชิ้นจริง/หน่วยขาย'}
                    <input type="number" min={1} inputMode="numeric" value={qty}
                      onChange={e => setQty(parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 bg-background border border-border rounded-xl text-foreground text-center font-bold" />
                  </label>
                </div>

                {/* ตะกร้าเซต */}
                {setMode && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 space-y-2">
                    <div className="text-sm font-bold text-purple-500">สินค้าในเซตนี้ ({basket.length}):</div>
                    {basket.length === 0 && (
                      <div className="text-sm text-muted-foreground">ยังว่าง — ตั้งจำนวน แล้วกดสินค้าจากรายการข้างล่างเพื่อเพิ่มเข้าเซต</div>
                    )}
                    {basket.map(b => (
                      <div key={b.productId} className="flex items-center justify-between gap-2 text-sm bg-background rounded-lg px-3 py-2 border border-border">
                        <span className="text-foreground">{b.label} <b className="text-purple-500">× {b.quantity}</b></span>
                        <button onClick={() => setBasket(prev => prev.filter(x => x.productId !== b.productId))}
                          className="text-red-500 hover:text-red-400 font-bold px-2">✕</button>
                      </div>
                    ))}
                    {basket.length > 0 && (
                      <button onClick={() => handleSaveSet(pp.id)} disabled={busy}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50">
                        {busy ? 'กำลังบันทึก...' : `💾 บันทึกเซต (${basket.length} สินค้า)`}
                      </button>
                    )}
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto divide-y divide-border rounded-xl border border-border">
                  {productResults.map(p => (
                    <button key={p.id} onClick={() => setMode ? addToBasket(p) : handleMatch(pp.id, p.id)} disabled={busy}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors disabled:opacity-50">
                      <span className="font-medium text-foreground">{setMode ? '➕ ' : ''}{p.brand} {p.name}</span>
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
