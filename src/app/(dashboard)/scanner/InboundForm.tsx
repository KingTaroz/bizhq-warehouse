'use client'

import { useState, useEffect } from 'react'
import { getProductsForMapping } from '@/app/actions/scanner'

export default function InboundForm({
  barcode,
  initialData,
  onSave,
  onCancel
}: {
  barcode: string,
  initialData?: any, // null if new product
  onSave: (data: any) => Promise<void>,
  onCancel: () => void
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('NEW');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    brand: '',
    name: '',
    model: '',
    viscosity: '',
    size: '',
    qtyPerCarton: 1,
    currentAvgCost: 0,
    packaging: 'BOTTLE', // BOTTLE or CARTON
    receiveQty: 1
  });

  useEffect(() => {
    getProductsForMapping().then(data => {
      setProducts(data);
      setFetching(false);
    }).catch(err => {
      console.error(err);
      setFetching(false);
    });
  }, []);

  useEffect(() => {
    if (initialData && initialData.id) {
      setSelectedProductId(initialData.id);
      setFormData(prev => ({
        ...prev,
        brand: initialData.brand || '',
        name: initialData.name || '',
        model: initialData.model || '',
        viscosity: initialData.viscosity || '',
        size: initialData.size || '',
        qtyPerCarton: initialData.qtyPerCarton || 1,
        currentAvgCost: initialData.currentAvgCost || 0
      }));
    } else {
      setSelectedProductId('NEW');
    }
  }, [initialData]);

  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProductId(val);
    
    if (val === 'NEW') {
      setFormData(prev => ({
        ...prev, brand: '', name: '', model: '', viscosity: '', size: '', qtyPerCarton: 1
      }));
    } else {
      const p = products.find(x => x.id === val);
      if (p) {
        setFormData(prev => ({
          ...prev,
          brand: p.brand || '',
          name: p.name || '',
          model: p.model || '',
          viscosity: p.viscosity || '',
          size: p.size || '',
          qtyPerCarton: p.qtyPerCarton || 1,
          currentAvgCost: p.currentAvgCost || 0
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave({
      ...formData,
      productId: selectedProductId === 'NEW' ? undefined : selectedProductId
    });
    setLoading(false);
  };

  const isNew = selectedProductId === 'NEW';
  const isBarcodeKnown = !!initialData;

  return (
    <div className="bg-background/80 backdrop-blur-md border border-border rounded-2xl p-5 md:p-6 mb-6 text-left shadow-xl animate-in fade-in zoom-in-95">
      <h3 className="text-primary font-extrabold mb-4 border-b border-border pb-3 flex flex-col gap-1">
        <span>{isBarcodeKnown ? 'พบข้อมูลสินค้าในระบบ' : 'ระบุสินค้าสำหรับบาร์โค้ดนี้'}</span>
        <span className="text-sm text-muted-foreground font-medium">บาร์โค้ด: {barcode}</span>
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase">เลือกสินค้าจากฐานข้อมูล</label>
          {fetching ? (
            <div className="text-sm">กำลังโหลด...</div>
          ) : (
            <select
              value={selectedProductId}
              onChange={handleProductSelect}
              disabled={isBarcodeKnown}
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary disabled:opacity-70 font-semibold truncate"
            >
              <option value="NEW">➕ สร้างสินค้าใหม่ (เพิ่มลงฐานข้อมูล)</option>
              {products.map(p => (
                <option key={p.id} value={p.id} className="truncate">
                  {p.brand} {p.name} {p.model ? `(${p.model})` : ''} {p.viscosity} {p.size} [{p.qtyPerCarton} ชิ้น/ลัง]
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">ยี่ห้อ (Brand)</label>
            <input 
              required
              type="text" 
              value={formData.brand}
              onChange={e => setFormData({...formData, brand: e.target.value})}
              disabled={!isNew}
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary disabled:opacity-70"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">ชื่อสินค้า (Name)</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              disabled={!isNew}
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary disabled:opacity-70"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">รุ่น (Model)</label>
            <input 
              type="text" 
              value={formData.model}
              onChange={e => setFormData({...formData, model: e.target.value})}
              disabled={!isNew}
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary disabled:opacity-70"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">เบอร์ความหนืด (Viscosity)</label>
            <input 
              type="text" 
              value={formData.viscosity}
              onChange={e => setFormData({...formData, viscosity: e.target.value})}
              disabled={!isNew}
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary disabled:opacity-70"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">ขนาด (Size)</label>
            <input 
              type="text" 
              value={formData.size}
              onChange={e => setFormData({...formData, size: e.target.value})}
              disabled={!isNew}
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary disabled:opacity-70"
            />
          </div>
          
          <div className="space-y-2 md:col-span-2 pt-2 border-t border-border">
            <label className="text-sm font-bold text-primary">📦 ระบุการรับเข้า (ชิ้น/ลัง)</label>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">รูปแบบแพ็คเกจ</label>
            <select
              value={formData.packaging}
              onChange={e => setFormData({...formData, packaging: e.target.value})}
              className="w-full bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-2 text-foreground font-bold focus:border-orange-500"
            >
              <option value="BOTTLE">ชิ้น / ขวด (1 ชิ้น)</option>
              <option value="CARTON">ยกลัง (หลายชิ้น)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">จำนวนที่สแกนรับเข้า</label>
            <input 
              required
              type="number"
              min="1"
              value={formData.receiveQty}
              onChange={e => setFormData({...formData, receiveQty: parseInt(e.target.value) || 1})}
              className="w-full bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-2 text-foreground font-bold focus:border-orange-500 text-lg"
            />
          </div>

          {formData.packaging === 'CARTON' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">จำนวนชิ้นต่อ 1 ลัง</label>
              <input 
                required
                type="number"
                min="2"
                value={formData.qtyPerCarton}
                onChange={e => setFormData({...formData, qtyPerCarton: parseInt(e.target.value) || 1})}
                disabled={!isNew}
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground disabled:opacity-70"
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
              className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3 pt-4 border-t border-border">
          <button type="button" onClick={onCancel} disabled={loading} className="flex-1 py-3.5 rounded-xl text-foreground bg-muted hover:bg-muted/80 font-bold transition-all border border-border">ยกเลิก</button>
          <button type="submit" disabled={loading} className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 hover:scale-105">
            {loading ? 'กำลังบันทึก...' : 'บันทึกสต๊อก (นับสต๊อก)'}
          </button>
        </div>
      </form>
    </div>
  )
}
