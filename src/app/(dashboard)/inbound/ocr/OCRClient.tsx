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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setLoading(true);
    setStep(2);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Str = event.target?.result as string;
      try {
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
    };
    reader.readAsDataURL(file);
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
    <div className="bg-[#18181b] border border-slate-800 rounded-2xl p-6 shadow-sm min-h-[500px]">
      
      {/* STEP 1: UPLOAD */}
      {step === 1 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-4xl mb-6">
            📷
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">อัปโหลดภาพใบส่งสินค้า</h2>
          <p className="text-slate-400 mb-8 text-center max-w-md">
            รองรับไฟล์ JPG, PNG หรือ PDF<br/>ระบบจะใช้ AI อ่านข้อมูลจากภาพให้โดยอัตโนมัติ
          </p>

          <label className="px-8 py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-bold cursor-pointer text-lg shadow-lg shadow-orange-500/20">
            {loading ? 'กำลังโหลด...' : 'เลือกไฟล์ภาพ'}
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={loading} />
          </label>
        </div>
      )}

      {/* STEP 2: LOADING */}
      {step === 2 && loading && !data && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-orange-500 rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold text-slate-200">AI กำลังอ่านเอกสาร...</h2>
          <p className="text-slate-400 mt-2">อาจใช้เวลาสักครู่</p>
        </div>
      )}

      {/* STEP 2: REVIEW & MAP */}
      {step === 2 && data && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-[#09090b] rounded-xl border border-slate-800">
            <div><div className="text-sm text-slate-500">บริษัท (Supplier)</div><div className="font-bold text-slate-200">{data.supplierName}</div></div>
            <div><div className="text-sm text-slate-500">เลขที่เอกสาร</div><div className="font-bold text-slate-200">{data.documentNo}</div></div>
            <div><div className="text-sm text-slate-500">วันที่</div><div className="font-bold text-slate-200">{data.date}</div></div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-100">รายการสินค้า ({data.items.length} รายการ)</h3>
            {data.items.some((i: any) => i.status === 'UNKNOWN') && (
              <div className="text-yellow-500 text-sm font-medium bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                ⚠️ มีรายการที่ต้องจับคู่
              </div>
            )}
          </div>

          <div className="overflow-x-auto mb-8 rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                  <th className="px-4 py-3 font-medium">รหัสในบิล</th>
                  <th className="px-4 py-3 font-medium">ชื่อในบิล</th>
                  <th className="px-4 py-3 font-medium">หน่วย</th>
                  <th className="px-4 py-3 font-medium text-center">จำนวน</th>
                  <th className="px-4 py-3 font-medium text-right">ราคาทุนบิล</th>
                  <th className="px-4 py-3 font-medium">สถานะ / จับคู่กับสินค้าในร้าน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.items.map((item: any, idx: number) => (
                  <tr key={idx} className={item.status === 'UNKNOWN' ? 'bg-yellow-500/5' : ''}>
                    <td className="px-4 py-3 font-mono text-sm text-slate-300">{item.code}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{item.unitStr}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-200">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      {item.unitPrice ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-slate-200">{item.unitPrice} ฿</span>
                          <span className="text-xs text-slate-500">{(item.unitPrice / item.multiplier).toFixed(2)} ฿/ขวด</span>
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
                                <span className="text-xs text-slate-400 mt-1">{item.productName} ({item.multiplier > 1 ? 'ลัง' : 'ขวด'})</span>
                              </div>
                              <button onClick={() => unMapItem(idx)} className="text-slate-400 hover:text-white p-1 bg-slate-800 rounded-lg text-xs" title="ยกเลิกการจับคู่">
                                🔄 ยกเลิกจับคู่
                              </button>
                            </div>
                            
                            {/* Cost Change Warning */}
                            {item.unitPrice && item.currentAvgCost !== undefined && (
                              <div className="text-xs mt-1">
                                {Math.abs((item.unitPrice / item.multiplier) - item.currentAvgCost) > 0.01 ? (
                                  <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-1 rounded-md inline-block">
                                    ⚠️ ทุนเปลี่ยน: {item.currentAvgCost.toFixed(2)} ➡️ {(item.unitPrice / item.multiplier).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">ทุนเท่าเดิม ({item.currentAvgCost.toFixed(2)})</span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => setMappingRowIndex(idx)} className="bg-yellow-500 text-yellow-950 font-bold px-3 py-1.5 rounded-lg text-sm hover:bg-yellow-400 shadow-sm">
                            คลิกเพื่อจับคู่ (Map)
                          </button>
                        )}
                        <button onClick={() => deleteItem(idx)} className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ml-auto">
                          🗑️ ข้าม/ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={saveBarcode} 
                onChange={(e) => setSaveBarcode(e.target.checked)} 
                className="w-5 h-5 rounded border-slate-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900 bg-slate-800"
              />
              <span className="text-slate-200 font-medium select-none group-hover:text-white transition-colors">
                นำรหัสบิลชุดนี้บันทึกเป็นบาร์โค้ดสินค้า <span className="text-slate-500 text-sm font-normal ml-1">(AI แนะนำให้เปิดเมื่อเป็นบิลซิม)</span>
              </span>
            </label>

            <div className="flex gap-4 w-full md:w-auto">
              <button onClick={() => { setStep(1); setData(null); }} className="px-6 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium flex-1 md:flex-none">
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
          <button onClick={() => { setStep(1); setData(null); }} className="px-8 py-3 mt-4 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-semibold border border-slate-700">
            อัปโหลดบิลถัดไป
          </button>
        </div>
      )}

      {/* MAPPING MODAL */}
      {mappingRowIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#18181b] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-100">{showAddProduct ? 'เพิ่มสินค้าใหม่' : 'จับคู่สินค้า (Smart Mapping)'}</h2>
              <button onClick={() => { setMappingRowIndex(null); setShowAddProduct(false); }} className="text-slate-500 hover:text-white">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {!showAddProduct ? (
                <>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl mb-6">
                    <div className="text-sm text-yellow-500/80 mb-1">รหัสในบิลที่ระบบไม่รู้จัก:</div>
                    <div className="font-mono text-yellow-400 font-bold">{data.items[mappingRowIndex].code}</div>
                    <div className="text-slate-300 text-sm mt-1">
                      {data.items[mappingRowIndex].name}
                      {data.items[mappingRowIndex].unitStr && <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded text-xs border border-yellow-500/30">หน่วย: {data.items[mappingRowIndex].unitStr}</span>}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-slate-400">คัดกรองสินค้า:</label>
                    <button onClick={() => setShowAddProduct(true)} className="text-orange-500 text-sm font-bold hover:underline">
                      + เพิ่มสินค้าใหม่เข้าระบบ
                    </button>
                  </div>

                  {/* Smart Search Filter */}
                  <div className="mb-6">
                    <input 
                      type="text" 
                      placeholder="ค้นหา (ชื่อ, ยี่ห้อ, ความหนืด, บาร์โค้ด)..." 
                      className="w-full bg-[#09090b] border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Results */}
                  <div className="space-y-3">
                    {filteredProducts.length === 0 && (
                      <div className="text-center text-slate-500 py-4">ไม่พบสินค้าที่ตรงกับเงื่อนไข</div>
                    )}
                    {filteredProducts.map(prod => (
                      <div key={prod.id} className="p-4 rounded-xl border border-slate-700 bg-slate-800/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="font-bold text-slate-200">{prod.name}</div>
                          <div className="text-xs text-slate-500 mt-1">สต๊อกรวม: {prod.qtyPerCarton} ชิ้น/ลัง</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => confirmMapping(prod.id, prod.name, 1)} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors">
                            🍾 รับเป็นขวด (x1)
                          </button>
                          <button onClick={() => confirmMapping(prod.id, prod.name, prod.qtyPerCarton || 1)} className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-lg text-sm font-bold transition-colors">
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
                    <div className="font-mono text-yellow-400 font-bold">{data.items[mappingRowIndex].code}</div>
                    <div className="text-slate-300 text-sm mt-1">
                      {data.items[mappingRowIndex].name}
                      {data.items[mappingRowIndex].unitStr && <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded text-xs border border-yellow-500/30">หน่วย: {data.items[mappingRowIndex].unitStr}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">หมวดหมู่</label>
                      <input type="text" name="category" list="categories" required className="w-full bg-[#09090b] border border-slate-700 rounded-lg px-3 py-2 text-white" />
                      <datalist id="categories">
                        <option value="LUBRICANT" />
                        <option value="PART" />
                        {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map((c: any) => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">ยี่ห้อ (Brand)</label>
                      <input type="text" name="brand" list="brands" required className="w-full bg-[#09090b] border border-slate-700 rounded-lg px-3 py-2 text-white" />
                      <datalist id="brands">
                        {options.brands.map((b: string) => <option key={b} value={b} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">รุ่น (Model)</label>
                      <input type="text" name="model" list="models" required className="w-full bg-[#09090b] border border-slate-700 rounded-lg px-3 py-2 text-white" />
                      <datalist id="models">
                        {options.models.map((m: string) => <option key={m} value={m} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">เบอร์ความหนืด</label>
                      <input type="text" name="viscosity" list="viscosities" className="w-full bg-[#09090b] border border-slate-700 rounded-lg px-3 py-2 text-white" />
                      <datalist id="viscosities">
                        {options.viscosities.map((v: string) => <option key={v} value={v} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">ขนาด</label>
                      <input type="text" name="size" list="sizes" required className="w-full bg-[#09090b] border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="เช่น 1L, 5L" />
                      <datalist id="sizes">
                        {options.sizes.map((s: string) => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">จำนวนขวด / ลัง</label>
                      <input type="number" name="qtyPerCarton" defaultValue={1} required min={1} className="w-full bg-[#09090b] border border-slate-700 rounded-lg px-3 py-2 text-white" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-orange-400 mb-1">รูปแบบการรับเข้าของรหัสนี้ (ผูกข้อมูล)</label>
                      <div className="flex gap-4 p-3 bg-slate-900 border border-slate-700 rounded-xl">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="receiveType" value="carton" defaultChecked className="accent-orange-500" />
                          <span className="text-slate-200">📦 รับยกลัง (คูณด้วย จำนวนขวด/ลัง)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="receiveType" value="bottle" className="accent-orange-500" />
                          <span className="text-slate-200">🍾 รับต่อขวด (x1)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button type="button" onClick={() => setShowAddProduct(false)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white">กลับไปหน้าจับคู่</button>
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
