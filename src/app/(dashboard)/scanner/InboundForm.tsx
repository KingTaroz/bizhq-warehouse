'use client'

import { useState, useEffect, useRef } from 'react'
import { getProductsForMapping } from '@/app/actions/scanner'
import { Search, Plus, X, ArrowLeft } from 'lucide-react'

export default function InboundForm({
  barcode,
  initialData,
  onSave,
  onCancel
}: {
  barcode: string,
  initialData?: any,
  onSave: (data: any) => Promise<void>,
  onCancel: () => void
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Smart Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    brand: '',
    name: '',
    model: '',
    viscosity: '',
    size: '',
    qtyPerCarton: 1,
    currentAvgCost: 0,
    packaging: 'BOTTLE', 
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
    }
  }, [initialData]);

  // Handle outside click for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProductSelect = (p: any) => {
    setSelectedProductId(p.id);
    setSearchQuery('');
    setIsDropdownOpen(false);
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
  };

  const handleClearSelection = () => {
    setSelectedProductId('');
    setFormData(prev => ({
      ...prev, brand: '', name: '', model: '', viscosity: '', size: '', qtyPerCarton: 1
    }));
  };

  const handleManualModeToggle = (enable: boolean) => {
    setIsManualMode(enable);
    setSelectedProductId('');
    if (enable) {
      setFormData(prev => ({
        ...prev, brand: '', name: '', model: '', viscosity: '', size: '', qtyPerCarton: 1
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId && !isManualMode) {
      alert('กรุณาเลือกสินค้า หรือกดเพิ่มสินค้าใหม่');
      return;
    }
    setLoading(true);
    await onSave({
      ...formData,
      productId: isManualMode ? undefined : selectedProductId
    });
    setLoading(false);
  };

  const isBarcodeKnown = !!initialData;
  const isInputDisabled = isBarcodeKnown || (selectedProductId !== '' && !isManualMode);
  const showProductForm = isBarcodeKnown || selectedProductId !== '' || isManualMode;

  const filteredProducts = products.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || 
           (p.brand || '').toLowerCase().includes(q) || 
           (p.model || '').toLowerCase().includes(q) ||
           (p.viscosity || '').toLowerCase().includes(q);
  }).slice(0, 50); // limit to 50 results

  return (
    <div className="bg-background/80 backdrop-blur-md border border-border rounded-2xl p-5 md:p-6 mb-6 text-left shadow-xl animate-in fade-in zoom-in-95">
      <h3 className="text-primary font-extrabold mb-4 border-b border-border pb-3 flex flex-col gap-1">
        <span>{isBarcodeKnown ? 'พบข้อมูลสินค้าในระบบ' : 'ระบุสินค้าสำหรับบาร์โค้ดนี้'}</span>
        <span className="text-sm text-muted-foreground font-medium">บาร์โค้ด: {barcode}</span>
      </h3>
      
      {!isBarcodeKnown && !selectedProductId && !isManualMode && (
        <div className="space-y-4 mb-6">
          <div className="relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">ค้นหาอัจฉริยะ (Smart Search)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="พิมพ์ ชื่อ, ยี่ห้อ, รุ่น เพื่อค้นหาสินค้าเดิม..."
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            
            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                {fetching ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">กำลังโหลดข้อมูล...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">ไม่พบสินค้าที่ตรงกับ "{searchQuery}"</div>
                ) : (
                  <ul className="py-2">
                    {filteredProducts.map(p => (
                      <li 
                        key={p.id} 
                        onClick={() => handleProductSelect(p)}
                        className="px-4 py-3 hover:bg-muted cursor-pointer transition-colors border-b border-border/50 last:border-0"
                      >
                        <div className="font-bold text-foreground">{p.brand} {p.name} {p.model ? `(${p.model})` : ''}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {p.viscosity && `ความหนืด: ${p.viscosity} | `} 
                          {p.size && `ขนาด: ${p.size} | `} 
                          บรรจุ: {p.qtyPerCarton} ชิ้น/ลัง
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-xs text-muted-foreground font-bold uppercase">หรือ</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          <button
            type="button"
            onClick={() => handleManualModeToggle(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/50 text-primary font-bold hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-5 h-5" />
            เพิ่มสินค้าใหม่เข้าฐานข้อมูล
          </button>
        </div>
      )}

      {showProductForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isBarcodeKnown && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-primary">
                {isManualMode ? '📝 กำลังสร้างสินค้าใหม่' : '✅ เลือกสินค้าแล้ว'}
              </span>
              <button
                type="button"
                onClick={() => isManualMode ? handleManualModeToggle(false) : handleClearSelection()}
                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors bg-muted px-3 py-1.5 rounded-lg font-medium"
              >
                {isManualMode ? <ArrowLeft className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {isManualMode ? 'กลับไปค้นหา' : 'เปลี่ยนสินค้า'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">ยี่ห้อ (Brand)</label>
              <input 
                required
                type="text" 
                value={formData.brand}
                onChange={e => setFormData({...formData, brand: e.target.value})}
                disabled={isInputDisabled}
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
                disabled={isInputDisabled}
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">รุ่น (Model)</label>
              <input 
                type="text" 
                value={formData.model}
                onChange={e => setFormData({...formData, model: e.target.value})}
                disabled={isInputDisabled}
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">เบอร์ความหนืด (Viscosity)</label>
              <input 
                type="text" 
                value={formData.viscosity}
                onChange={e => setFormData({...formData, viscosity: e.target.value})}
                disabled={isInputDisabled}
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-2 text-foreground focus:border-primary disabled:opacity-70"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">ขนาด (Size)</label>
              <input 
                type="text" 
                value={formData.size}
                onChange={e => setFormData({...formData, size: e.target.value})}
                disabled={isInputDisabled}
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
                  disabled={isInputDisabled}
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
      )}
    </div>
  )
}
