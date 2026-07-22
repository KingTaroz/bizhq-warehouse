'use client'

import { useState } from 'react'
import { getAnalyticsOverview } from '@/app/actions/analytics'

export default function AnalyticsClient({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData);
  const [range, setRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('MONTH');
  const [loading, setLoading] = useState(false);

  const handleFilter = async (newRange: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL') => {
    setLoading(true);
    setRange(newRange);
    const newData = await getAnalyticsOverview(newRange);
    setData(newData);
    setLoading(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val ?? 0);
  };

  const pct = (val: number) => `${(val ?? 0).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2">
        {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map(r => (
          <button
            key={r}
            onClick={() => handleFilter(r)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              range === r
                ? 'bg-orange-500 text-white'
                : 'bg-muted text-foreground hover:bg-muted'
            }`}
          >
            {r === 'TODAY' ? 'วันนี้' : r === 'WEEK' ? '7 วันที่ผ่านมา' : r === 'MONTH' ? 'เดือนนี้' : 'ทั้งหมด'}
          </button>
        ))}
      </div>

      {loading && <div className="text-orange-500">กำลังโหลดข้อมูล...</div>}

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${loading ? 'opacity-50' : ''}`}>
        <div className="bg-card p-6 rounded-2xl border border-border">
          <p className="text-sm font-medium text-muted-foreground mb-1">ยอดขายรวม (Revenue)</p>
          <div className="text-3xl font-bold text-foreground">{formatCurrency(data.totalRevenue)}</div>
          <p className="text-xs text-muted-foreground mt-2">จาก {data.orderCount} ออเดอร์</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border">
          <p className="text-sm font-medium text-muted-foreground mb-1">ต้นทุนรวม (COGS)</p>
          <div className="text-3xl font-bold text-red-500">{formatCurrency(data.totalCost)}</div>
          <p className="text-xs text-muted-foreground mt-2">ภาษีซื้อขอคืนได้ {formatCurrency(data.inputVat)}</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border">
          <p className="text-sm font-medium text-muted-foreground mb-1">ค่าธรรมเนียมแพลตฟอร์ม</p>
          <div className="text-3xl font-bold text-amber-500">{formatCurrency(data.totalFees)}</div>
          <p className="text-xs text-muted-foreground mt-2">
            กำไรก่อนหัก VAT {formatCurrency(data.profitBeforeVat)}
          </p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <p className="text-sm font-medium text-emerald-500 mb-1">กำไรสุทธิหลังหัก VAT</p>
          <div className={`text-3xl font-bold ${data.netProfitAfterVat >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatCurrency(data.netProfitAfterVat)}
          </div>
          <p className="text-xs text-emerald-500/70 mt-2">
            {pct(data.marginOnCost)} ของทุน · {pct(data.marginOnRevenue)} ของยอดขาย
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        กำไรสุทธิคำนวณด้วยสูตร (ยอดขาย − ทุน − ค่าธรรมเนียม) × 100/107 ตรงกับตารางราคาขาย ·
        ค่าธรรมเนียมรายสินค้าเฉลี่ยตามสัดส่วนยอดขายในออเดอร์
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">สินค้าทำกำไรสูงสุด 10 อันดับ</h2>
            <p className="text-xs text-muted-foreground mt-1">กำไรสุทธิหลังหัก VAT</p>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground border-b border-border text-sm">
                  <th className="px-6 py-3 font-medium">Platform SKU</th>
                  <th className="px-6 py-3 font-medium text-right">ยอดขาย</th>
                  <th className="px-6 py-3 font-medium text-right">กำไรสุทธิ</th>
                  <th className="px-6 py-3 font-medium text-right">% ทุน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.topProducts.map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium text-foreground">{p.skuCode}</td>
                    <td className="px-6 py-4 text-right text-foreground">{formatCurrency(p.revenue)}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-500">{formatCurrency(p.profit)}</td>
                    <td className="px-6 py-4 text-right text-muted-foreground">{pct(p.marginOnCost)}</td>
                  </tr>
                ))}
                {data.topProducts.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">ยังไม่มีข้อมูลการขาย</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Loss Products Warning */}
        <div className="bg-card rounded-2xl border border-red-500/20 overflow-hidden">
          <div className="p-6 border-b border-red-500/20 bg-red-500/5">
            <h2 className="text-lg font-bold text-red-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              เตือน! สินค้าขาดทุน
            </h2>
            <p className="text-xs text-red-500/70 mt-1">กำไรสุทธิหลังหัก VAT ติดลบ (รวมค่าธรรมเนียมแล้ว)</p>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-red-500/10 text-red-500/70 border-b border-red-500/20 text-sm">
                  <th className="px-6 py-3 font-medium">Platform SKU</th>
                  <th className="px-6 py-3 font-medium text-right">ต้นทุนรวม</th>
                  <th className="px-6 py-3 font-medium text-right">ยอดขายรวม</th>
                  <th className="px-6 py-3 font-medium text-right">ขาดทุนสุทธิ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-500/20">
                {data.lossProducts.map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-red-500/10">
                    <td className="px-6 py-4 font-medium text-red-500">{p.skuCode}</td>
                    <td className="px-6 py-4 text-right text-muted-foreground">{formatCurrency(p.cost)}</td>
                    <td className="px-6 py-4 text-right text-foreground">{formatCurrency(p.revenue)}</td>
                    <td className="px-6 py-4 text-right font-bold text-red-500">{formatCurrency(p.profit)}</td>
                  </tr>
                ))}
                {data.lossProducts.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">ยอดเยี่ยม! ไม่มีสินค้าขาดทุนเลย</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low Margin Warning */}
      <div className="bg-card rounded-2xl border border-amber-500/20 overflow-hidden">
        <div className="p-6 border-b border-amber-500/20 bg-amber-500/5">
          <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            เฝ้าระวัง — กำไรบางกว่าเกณฑ์ {data.lowMarginThreshold}% ของทุน
          </h2>
          <p className="text-xs text-amber-500/70 mt-1">ยังไม่ขาดทุน แต่ถ้าทุนขึ้นอีกนิดจะติดลบทันที ควรทบทวนราคา</p>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-amber-500/10 text-amber-500/70 border-b border-amber-500/20 text-sm">
                <th className="px-6 py-3 font-medium">Platform SKU</th>
                <th className="px-6 py-3 font-medium text-right">ต้นทุนรวม</th>
                <th className="px-6 py-3 font-medium text-right">ยอดขายรวม</th>
                <th className="px-6 py-3 font-medium text-right">กำไรสุทธิ</th>
                <th className="px-6 py-3 font-medium text-right">% ทุน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-500/20">
              {(data.lowMarginProducts ?? []).map((p: any, i: number) => (
                <tr key={i} className="hover:bg-amber-500/10">
                  <td className="px-6 py-4 font-medium text-amber-500">{p.skuCode}</td>
                  <td className="px-6 py-4 text-right text-muted-foreground">{formatCurrency(p.cost)}</td>
                  <td className="px-6 py-4 text-right text-foreground">{formatCurrency(p.revenue)}</td>
                  <td className="px-6 py-4 text-right font-bold text-amber-500">{formatCurrency(p.profit)}</td>
                  <td className="px-6 py-4 text-right font-bold text-amber-500">{pct(p.marginOnCost)}</td>
                </tr>
              ))}
              {(data.lowMarginProducts ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">ไม่มีสินค้ากำไรบางกว่าเกณฑ์</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
