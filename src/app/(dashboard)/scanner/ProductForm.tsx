'use client'

import { useState } from 'react'

export default function ProductForm({
  barcode,
  onSave,
  onCancel
}: {
  barcode: string,
  onSave: (data: any) => Promise<void>,
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    brand: '',
    name: '',
    viscosity: '',
    size: '',
    qtyPerCarton: 1,
    currentAvgCost: 0,
    packaging: 'BOTTLE' // BOTTLE or CARTON
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <div className="bg-background/80 backdrop-blur-md border border-border rounded-2xl p-5 md:p-6 mb-6 text-left shadow-xl animate-in fade-in zoom-in-95">
      <h3 className="text-primary font-extrabold mb-4 border-b border-border pb-3 flex flex-col gap-1">
        <span>ไม่พบข้อมูลบาร์โค้ดนี้ในระบบ</span>
        <span className="text-sm text-muted-foreground font-medium">เพิ่มสินค้าใหม่และราคาทุนสำหรับบาร์โค้ด {barcode}</span>
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">ยี่ห้อ (Brand)</label>
            <input 
              required
              type="text" 
              value={formData.brand}
              onChange={e => setFormData({...formData, brand: e.target.value})}
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">ชื่อสินค้า</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">เบอร์ความหนืด (Viscosity)</label>
            <input 
              type="text" 
              value={formData.viscosity}
              onChange={e => setFormData({...formData, viscosity: e.target.value})}
              placeholder="เช่น 10W-40"
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">ขนาดบรรจุ (Size)</label>
            <input 
              required
              type="text" 
              value={formData.size}
              onChange={e => setFormData({...formData, size: e.target.value})}
              placeholder="เช่น 1L หรือ 4L"
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">บาร์โค้ดนี้สำหรับ (บรรจุภัณฑ์)</label>
            <select
              value={formData.packaging}
              onChange={e => setFormData({...formData, packaging: e.target.value})}
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="BOTTLE">ชิ้น / ขวด (1 ชิ้น)</option>
              <option value="CARTON">ลัง (หลายชิ้น)</option>
            </select>
          </div>
          {formData.packaging === 'CARTON' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">จำนวนขวดต่อลัง</label>
              <input 
                required
                type="number"
                min="2"
                value={formData.qtyPerCarton}
                onChange={e => setFormData({...formData, qtyPerCarton: parseInt(e.target.value) || 1})}
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">ราคาทุนต่อชิ้น (บาท)</label>
            <input 
              required
              type="number"
              step="0.01"
              min="0"
              value={formData.currentAvgCost}
              onChange={e => setFormData({...formData, currentAvgCost: parseFloat(e.target.value) || 0})}
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3 pt-4 border-t border-border">
          <button type="button" onClick={onCancel} disabled={loading} className="flex-1 py-3.5 rounded-xl text-foreground bg-muted hover:bg-muted/80 font-bold transition-all border border-border">ยกเลิก</button>
          <button type="submit" disabled={loading} className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 hover:scale-105">
            {loading ? 'กำลังบันทึก...' : 'บันทึกและจับคู่'}
          </button>
        </div>
      </form>
    </div>
  )
}
