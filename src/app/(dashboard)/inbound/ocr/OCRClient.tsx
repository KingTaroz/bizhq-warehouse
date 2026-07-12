'use client'

import { useState, useMemo } from 'react'
import { extractInvoiceData, processOCRInbound, saveSupplierMapping, deleteSupplierMapping } from '@/app/actions/ocr'
import { createProduct } from '@/app/actions/product'

export default function OCRClient({ initialProducts, options }: { initialProducts: any[], options: any }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [saveBarcode, setSaveBarcode] = useState<boolean>(false);

  // Products and Mapping
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [mappingRowIndex, setMappingRowIndex] = useState<number | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');

  // Add Product State
  const [showAddProduct, setShowAddProduct] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!searchTerm.trim()) return true;
      const terms = searchTerm.toLowerCase().trim().split(/\s+/);
      const searchableText = [
        p.name,
        p.category,
        p.brand,
        p.model,
        p.viscosity,
        p.size,
        ...(p.barcodes?.map((b: any) => b.code) || [])
      ].filter(Boolean).join(' ').toLowerCase();

      return terms.every(term => searchableText.includes(term));
    });
  }, [products, searchTerm]);

  // Downscale/compress camera photos client-side so uploads stay small on
  // mobile data and never hit the 10MB server-action body limit.
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
      reader.onload = (event) => {
        const base64Str = event.target?.result as string;
        if (!file.type.startsWith('image/')) {
          resolve(base64Str); // PDF etc. — send as-is
          return;
        }
        const img = new window.Image();
        img.onload = () => {
          const MAX_DIM = 2000;
          const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
          if (scale === 1 && file.size < 1024 * 1024) {
            resolve(base64Str); // already small
            return;
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(base64Str); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => resolve(base64Str); // fall back to original
        img.src = base64Str;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file
    setLoading(true);
    setStep(2);

    (async () => {
      try {
        const base64Str = await compressImage(file);
        const result = await extractInvoiceData(base64Str);
        setData(result);
        
        // Auto-detect if supplier is "ซิม"
        const supplierName = (result.supplierName || '').toLowerCase();
        if (supplierName.includes('ซิม') || supplierName.includes('sim')) {
          setSaveBarcode(true);
        } else {
          setSaveBarcode(false);
        }
        
      } catch (error: any) {
        alert("เกิดข้อผิดพลาดจาก AI: " + error.message);
        setStep(1);
      }
      setLoading(false);
    })();
  };

  const confirmMapping = async (productId: string, productName: string, multiplier: number) => {
    if (mappingRowIndex === null || !data) return;
    
    const row = data.items[mappingRowIndex];
    setLoading(true);

    const res = await saveSupplierMapping(data.supplierName, row.code, productId, multiplier);
    
    if (res.success) {
      const newItems = [...data.items];
      newItems[mappingRowIndex] = {
        ...row,
        status: 'MATCHED',
        productId,
        productName,
        multiplier
      };
      setData({ ...data, items: newItems });
      setMappingRowIndex(null);
      setSearchTerm('');
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  const unMapItem = async (index: number) => {
    if (!data) return;
    const row = data.items[index];
    setLoading(true);

    const res = await deleteSupplierMapping(data.supplierName, row.code);
    if (res.success) {
      const newItems = [...data.items];
      newItems[index] = { ...row, status: 'UNKNOWN', productId: null, productName: null, multiplier: 1 };
      setData({ ...data, items: newItems });
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  const deleteItem = (index: number) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการข้ามและลบรายการนี้ออกจากการรับเข้า?')) {
      const newItems = [...data.items];
      newItems.splice(index, 1);
      setData({ ...data, items: newItems });
    }
  };

  const handleConfirmInbound = async () => {
    const hasUnknowns = data.items.some((i: any) => i.status === 'UNKNOWN');
    if (hasUnknowns) {
      alert('กรุณาจับคู่สินค้าที่ไม่รู้จักให้ครบก่อนยืนยัน');
      return;
    }
    setLoading(true);
    // data.date is passed as documentDate, but data.items needs to pass unitCostPrice
    const itemsToSave = data.items.map((i: any) => {
      let costPerBottle = 0;
      if (i.unitPrice && i.multiplier) {
        costPerBottle = i.unitPrice / i.multiplier;
      }
      return { ...i, unitCostPrice: costPerBottle };
    });

    const res = await processOCRInbound(data.documentNo, data.date, itemsToSave, saveBarcode);
    setLoading(false);
    if (res.success) {
      setStep(3);
    } else {
      alert(res.error);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const receiveType = formData.get('receiveType') as string;

    const res = await createProduct(formData);
    
    if (res.success && res.product) {
      setProducts(prev => [res.product, ...prev]);
      setShowAddProduct(false);
      
      const multiplier = receiveType === 'carton' ? res.product.qtyPerCarton || 1 : 1;
      await confirmMapping(res.product.id, res.product.name, multiplier);
    } else {
      alert(res.error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[500px]">
      
      {/* STEP 1: UPLOAD */}
      {step === 1 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-4xl mb-6">
            📷
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">อัปโหลดภาพใบส่งสินค้า</h2>
          <p className="text-muted-foreground mb-8 text-center max-w-md">
            รองรับไฟล์ JPG, PNG หรือ PDF<br/>ระบบจะใช้ AI อ่านข้อมูลจากภาพให้โดยอัตโนมัติ
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-none sm:w-auto sm:justify-center">
            <label className="px-8 py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-bold cursor-pointer text-lg shadow-lg shadow-orange-500/20 text-center">
              {loading ? 'กำลังโหลด...' : '📷 ถ่ายรูปบิล'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} disabled={loading} />
            </label>
            <label className="px-8 py-4 bg-muted text-white rounded-xl hover:bg-muted/70 transition-colors font-bold cursor-pointer text-lg text-center">
              {loading ? 'กำลังโหลด...' : '🖼️ เลือกไฟล์ / PDF'}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={loading} />
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: LOADING */}
      {step === 2 && loading && !data && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-border border-t-orange-500 rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold text-foreground">AI กำลังอ่านเอกสาร...</h2>
          <p className="text-muted-foreground mt-2">อาจใช้เวลาสักครู่</p>
        </div>
      )}

      {/* STEP 2: REVIEW & MAP */}
      {step === 2 && data && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-background rounded-xl border border-border">
            <div><div className="text-sm text-muted-foreground">บริษัท (Supplier)</div><div className="font-bold text-foreground">{data.supplierName}</div></div>
            <div><div className="text-sm text-muted-foreground">เลขที่เอกสาร</div><div className="font-bold text-foreground">{data.documentNo}</div></div>
            <div><div className="text-sm text-muted-foreground">วันที่</div><div className="font-bold text-foreground">{data.date}</div></div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-lg text-foreground">รายการสินค้า ({data.items.length} รายการ)</h3>
            {data.items.some((i: any) => i.status === 'UNKNOWN') && (
              <div className="text-yellow-500 text-sm font-medium bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                ⚠️ มีรายการที่ต้องจับคู่
              </div>
            )}
          </div>

          <div className="overflow-x-auto mb-8 rounded-xl border border-border">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground border-b border-border">
                  <th className="px-4 py-3 font-medium">รหัสในบิล</th>
                  <th className="px-4 py-3 font-medium">ชื่อในบิล</th>
                  <th className="px-4 py-3 font-medium">หน่วย</th>
                  <th className="px-4 py-3 font-medium text-center">จำนวน</th>
                  <th className="px-4 py-3 font-medium text-right">ราคาทุนบิล</th>
                  <th className="px-4 py-3 font-medium">สถานะ / จับคู่กับสินค้าในร้าน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((item: any, idx: number) => (
                  <tr key={idx} className={item.status === 'UNKNOWN' ? 'bg-yellow-500/5' : ''}>
                    <td className="px-4 py-3 font-mono text-sm text-foreground">{item.code}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{item.unitStr}</td>
                    <td className="px-4 py-3 text-center font-bold text-foreground">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      {item.unitPrice ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-foreground">{item.unitPrice} ฿</span>
                          <span className="text-xs text-muted-foreground">{(item.unitPrice / item.multiplier).toFixed(2)} ฿/ขวด</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.status === 'MATCHED' ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <span className="text-green-500 font-medium text-sm flex items-center gap-1">✅ รู้จักแล้ว</span>
                                <span className="text-xs text-muted-foreground mt-1">{item.productName} ({item.multiplier > 1 ? 'ลัง' : 'ขวด'})</span>
                              </div>
                              <button onClick={() => unMapItem(idx)} className="text-muted-foreground hover:text-foreground p-1 bg-muted rounded-lg text-xs" title="ยกเลิกการจับคู่">
                                🔄 ยกเลิกจับคู่
                              </button>
                            </div>
                            
                            {/* Cost Change Warning */}
                            {item.unitPrice && item.currentAvgCost !== undefined && (
                              <div className="text-xs mt-1">
                                {Math.abs((item.unitPrice / item.multiplier) - item.currentAvgCost) > 0.01 ? (
                                  <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2 py-1 rounded-md inline-block">
                                    ⚠️ ทุนเปลี่ยน: {item.currentAvgCost.toFixed(2)} ➡️ {(item.unitPrice / item.multiplier).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">ทุนเท่าเดิม ({item.currentAvgCost.toFixed(2)})</span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => setMappingRowIndex(idx)} className="bg-yellow-500 text-yellow-950 font-bold px-3 py-1.5 rounded-lg text-sm hover:bg-yellow-400 shadow-sm">
                            คลิกเพื่อจับคู่ (Map)
                          </button>
                        )}
                        <button onClick={() => deleteItem(idx)} className="text-red-500 hover:text-red-500 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ml-auto">
                          🗑️ ข้าม/ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/50 p-4 rounded-xl border border-border">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={saveBarcode} 
                onChange={(e) => setSaveBarcode(e.target.checked)} 
                className="w-5 h-5 rounded border-border text-orange-500 focus:ring-orange-500 focus:ring-offset-background bg-muted"
              />
              <span className="text-foreground font-medium select-none group-hover:text-foreground transition-colors">
                นำรหัสบิลชุดนี้บันทึกเป็นบาร์โค้ดสินค้า <span className="text-muted-foreground text-sm font-normal ml-1">(AI แนะนำให้เปิดเมื่อเป็นบิลซิม)</span>
              </span>
            </label>

            <div className="flex gap-4 w-full md:w-auto">
              <button onClick={() => { setStep(1); setData(null); }} className="px-6 py-3 rounded-xl border border-border text-foreground hover:bg-muted font-medium flex-1 md:flex-none">
                ยกเลิก
              </button>
              <button onClick={handleConfirmInbound} disabled={data.items.some((i: any) => i.status === 'UNKNOWN') || loading} className="px-6 py-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 font-bold disabled:opacity-50 flex-1 md:flex-none">
                {loading ? 'กำลังบันทึก...' : '📥 ยืนยันรับเข้าสต๊อก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS */}
      {step === 3 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">รับเข้าสต๊อกสำเร็จ!</h2>
          <button onClick={() => { setStep(1); setData(null); }} className="px-8 py-3 mt-4 rounded-xl bg-muted text-foreground hover:bg-muted font-semibold border border-border">
            อัปโหลดบิลถัดไป
          </button>
        </div>
      )}

      {/* MAPPING MODAL */}
      {mappingRowIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">{showAddProduct ? 'เพิ่มสินค้าใหม่' : 'จับคู่สินค้า (Smart Mapping)'}</h2>
              <button onClick={() => { setMappingRowIndex(null); setShowAddProduct(false); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {!showAddProduct ? (
                <>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl mb-6">
                    <div className="text-sm text-yellow-500/80 mb-1">รหัสในบิลที่ระบบไม่รู้จัก:</div>
                    <div className="font-mono text-yellow-600 font-bold">{data.items[mappingRowIndex].code}</div>
                    <div className="text-foreground text-sm mt-1">
                      {data.items[mappingRowIndex].name}
                      {data.items[mappingRowIndex].unitStr && <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-600 rounded text-xs border border-yellow-500/30">หน่วย: {data.items[mappingRowIndex].unitStr}</span>}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-muted-foreground">คัดกรองสินค้า:</label>
                    <button onClick={() => setShowAddProduct(true)} className="text-orange-500 text-sm font-bold hover:underline">
                      + เพิ่มสินค้าใหม่เข้าระบบ
                    </button>
                  </div>

                  {/* Smart Search Filter */}
                  <div className="mb-6">
                    <input 
                      type="text" 
                      placeholder="ค้นหา (ชื่อ, ยี่ห้อ, ความหนืด, บาร์โค้ด)..." 
                      className="w-full bg-background border border-border text-foreground rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Results */}
                  <div className="space-y-3">
                    {filteredProducts.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">ไม่พบสินค้าที่ตรงกับเงื่อนไข</div>
                    )}
                    {filteredProducts.map(prod => (
                      <div key={prod.id} className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="font-bold text-foreground">{prod.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">สต๊อกรวม: {prod.qtyPerCarton} ชิ้น/ลัง</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => confirmMapping(prod.id, prod.name, 1)} className="px-3 py-2 bg-muted hover:bg-muted/70 text-foreground rounded-lg text-sm font-medium transition-colors">
                            🍾 รับเป็นขวด (x1)
                          </button>
                          <button onClick={() => confirmMapping(prod.id, prod.name, prod.qtyPerCarton || 1)} className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 border border-orange-500/30 rounded-lg text-sm font-bold transition-colors">
                            📦 รับเป็นลัง (x{prod.qtyPerCarton || 1})
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* ADD PRODUCT INLINE FORM */
                <form onSubmit={handleCreateProduct} className="space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl mb-4">
                    <div className="text-sm text-yellow-500/80 mb-1">รหัสในบิลที่จะผูกกับสินค้านี้:</div>
                    <div className="font-mono text-yellow-600 font-bold">{data.items[mappingRowIndex].code}</div>
                    <div className="text-foreground text-sm mt-1">
                      {data.items[mappingRowIndex].name}
                      {data.items[mappingRowIndex].unitStr && <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-600 rounded text-xs border border-yellow-500/30">หน่วย: {data.items[mappingRowIndex].unitStr}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">หมวดหมู่</label>
                      <input type="text" name="category" list="categories" required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground" />
                      <datalist id="categories">
                        <option value="LUBRICANT" />
                        <option value="PART" />
                        {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map((c: any) => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">ยี่ห้อ (Brand)</label>
                      <input type="text" name="brand" list="brands" required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground" />
                      <datalist id="brands">
                        {options.brands.map((b: string) => <option key={b} value={b} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">รุ่น (Model)</label>
                      <input type="text" name="model" list="models" required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground" />
                      <datalist id="models">
                        {options.models.map((m: string) => <option key={m} value={m} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">เบอร์ความหนืด</label>
                      <input type="text" name="viscosity" list="viscosities" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground" />
                      <datalist id="viscosities">
                        {options.viscosities.map((v: string) => <option key={v} value={v} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">ขนาด</label>
                      <input type="text" name="size" list="sizes" required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground" placeholder="เช่น 1L, 5L" />
                      <datalist id="sizes">
                        {options.sizes.map((s: string) => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">จำนวนขวด / ลัง</label>
                      <input type="number" name="qtyPerCarton" defaultValue={1} required min={1} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-orange-500 mb-1">รูปแบบการรับเข้าของรหัสนี้ (ผูกข้อมูล)</label>
                      <div className="flex gap-4 p-3 bg-muted border border-border rounded-xl">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="receiveType" value="carton" defaultChecked className="accent-orange-500" />
                          <span className="text-foreground">📦 รับยกลัง (คูณด้วย จำนวนขวด/ลัง)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="receiveType" value="bottle" className="accent-orange-500" />
                          <span className="text-foreground">🍾 รับต่อขวด (x1)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <button type="button" onClick={() => setShowAddProduct(false)} className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground">กลับไปหน้าจับคู่</button>
                    <button type="submit" disabled={loading} className="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600">{loading ? 'กำลังบันทึก...' : 'บันทึกสินค้าใหม่'}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
