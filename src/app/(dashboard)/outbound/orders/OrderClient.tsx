'use client'

import { useState } from 'react'
import { parseOrderExcel, checkMappedSkus, mapPlatformSku, confirmOrdersAndDeductStock } from '@/app/actions/order'

export default function OrderClient({ products }: { products: any[] }) {
  const [platform, setPlatform] = useState('SHOPEE')
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  
  const [parsedData, setParsedData] = useState<{ orders: any[], uniqueSkus: string[], skuContext: Record<string, { productName: string, variationName: string }> } | null>(null)
  const [skuStatus, setSkuStatus] = useState<Record<string, { mapped: boolean, items: any[] }>>({})
  
  const [mappingSku, setMappingSku] = useState<string | null>(null)
  const [bundleItems, setBundleItems] = useState<{productId: string, quantity: number, productName: string}[]>([])

  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedQty, setSelectedQty] = useState(1)

  const handleUpload = async () => {
    if (!file) return alert('กรุณาเลือกไฟล์ Excel');
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform', platform);

    const res = await parseOrderExcel(formData);
    
    if (res.error) {
      alert(res.error);
    } else if (res.success && res.orders) {
      setParsedData({ orders: res.orders, uniqueSkus: res.uniqueSkus, skuContext: res.skuContext || {} });
      
      // Check mapped status
      const mapped = await checkMappedSkus(platform, res.uniqueSkus);
      const newStatus: any = {};
      
      // Initialize all as unmapped
      res.uniqueSkus.forEach((sku: string) => {
        newStatus[sku] = { mapped: false, items: [] };
      });
      
      // Update mapped ones
      mapped.forEach((m: any) => {
        newStatus[m.skuCode] = { mapped: true, items: m.items };
      });
      
      setSkuStatus(newStatus);
    }
    setLoading(false);
  };

  const handleAddBundleItem = () => {
    if (!selectedProduct) return;
    const prod = products.find(p => p.id === selectedProduct);
    if (!prod) return;
    
    setBundleItems(prev => [...prev, {
      productId: prod.id,
      quantity: selectedQty,
      productName: prod.name
    }]);
    
    setSelectedProduct('');
    setSelectedQty(1);
  };

  const handleSaveMapping = async () => {
    if (!mappingSku || bundleItems.length === 0) return;
    setLoading(true);
    
    const res = await mapPlatformSku(platform, mappingSku, bundleItems.map(b => ({ productId: b.productId, quantity: b.quantity })));
    
    if (res.success) {
      // Update local state to green
      setSkuStatus(prev => ({
        ...prev,
        [mappingSku]: {
          mapped: true,
          items: bundleItems.map(b => ({ product: { name: b.productName }, quantity: b.quantity }))
        }
      }));
      setMappingSku(null);
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  const handleConfirmDeduct = async () => {
    if (!parsedData) return;
    
    // Ensure all SKUs are mapped
    const unmapped = parsedData.uniqueSkus.filter(s => !skuStatus[s]?.mapped);
    if (unmapped.length > 0) {
      alert(`ไม่สามารถตัดสต๊อกได้ มี SKU ที่ยังไม่ได้จับคู่: ${unmapped.join(', ')}`);
      return;
    }

    if (!confirm(`ยืนยันการตัดสต๊อก ${parsedData.orders.length} ออเดอร์?`)) return;

    setLoading(true);
    const res = await confirmOrdersAndDeductStock(platform, parsedData.orders);
    
    if (res.error) {
      alert(res.error);
    } else {
      alert(`✅ ตัดสต๊อกสำเร็จ ${res.count} ออเดอร์`);
      setParsedData(null);
      setFile(null);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-[#18181b] p-6 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="w-full sm:w-1/3">
            <label className="block text-sm font-medium text-slate-400 mb-2">แพลตฟอร์ม</label>
            <select 
              value={platform} 
              onChange={e => setPlatform(e.target.value)}
              className="w-full bg-[#09090b] border border-slate-700 text-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:border-orange-500"
            >
              <option value="SHOPEE">Shopee</option>
              <option value="TIKTOK">TikTok</option>
            </select>
          </div>
          
          <div className="w-full sm:w-1/3">
            <label className="block text-sm font-medium text-slate-400 mb-2">ไฟล์ออเดอร์ (Excel / CSV)</label>
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600"
            />
          </div>

          <div className="w-full sm:w-1/3">
            <button 
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'กำลังอ่านไฟล์...' : 'อัปโหลดและวิเคราะห์'}
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      {parsedData && (
        <div className="bg-[#18181b] rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-100">รายการ SKU ที่พบในไฟล์</h2>
              <p className="text-slate-400 text-sm mt-1">ทั้งหมด {parsedData.orders.length} ออเดอร์ | รหัส SKU ทั้งหมด {parsedData.uniqueSkus.length} รายการ</p>
            </div>
            <button 
              onClick={handleConfirmDeduct}
              disabled={loading}
              className="px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-bold shadow-lg shadow-green-500/20 disabled:opacity-50"
            >
              📥 ยืนยันตัดสต๊อก
            </button>
          </div>

          <div className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                  <th className="px-6 py-4 font-medium">ชื่อสินค้า</th>
                  <th className="px-6 py-4 font-medium">ตัวเลือก</th>
                  <th className="px-6 py-4 font-medium">สถานะจับคู่</th>
                  <th className="px-6 py-4 font-medium">ผูกกับสินค้าในระบบ</th>
                  <th className="px-6 py-4 font-medium text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {parsedData.uniqueSkus.map(sku => {
                  const status = skuStatus[sku];
                  const isMapped = status?.mapped;

                  return (
                    <tr key={sku} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">
                          {parsedData.skuContext?.[sku]?.productName || sku}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {parsedData.skuContext?.[sku]?.variationName || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {isMapped ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> รู้จักแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium border border-amber-500/20">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span> รอการจับคู่
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isMapped ? (
                          <div className="flex flex-col gap-1">
                            {status.items.map((item: any, idx: number) => (
                              <div key={idx} className="text-sm text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 w-max">
                                <span className="text-orange-400 font-bold">{item.quantity}x</span> {item.product.name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isMapped && (
                          <button 
                            onClick={() => {
                              setMappingSku(sku);
                              setBundleItems([]);
                            }}
                            className="px-4 py-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg text-sm font-medium transition-colors border border-amber-500/20"
                          >
                            จับคู่เซ็ต (Map)
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mapping Modal */}
      {mappingSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#18181b] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-100">จับคู่สินค้าจัดเซ็ต (Bundle Builder)</h2>
              <button onClick={() => setMappingSku(null)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-slate-400 text-sm">รหัส SKU จากแพลตฟอร์ม:</span>
                <div className="text-orange-400 font-mono text-lg font-bold mt-1">{mappingSku}</div>
              </div>

              {/* Added Items List */}
              <div className="mb-6 space-y-2">
                <h3 className="text-sm font-medium text-slate-300 mb-2">สินค้าในเซ็ตนี้ (1 ออเดอร์จะต้องตัดสต๊อกอะไรบ้าง):</h3>
                {bundleItems.length === 0 ? (
                  <div className="text-center p-4 border border-dashed border-slate-700 rounded-xl text-slate-500 text-sm">
                    ยังไม่มีสินค้าในเซ็ต
                  </div>
                ) : (
                  bundleItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                      <div className="font-medium text-slate-200">{item.productName}</div>
                      <div className="flex items-center gap-4">
                        <span className="text-orange-400 font-bold">จำนวน: {item.quantity}</span>
                        <button 
                          onClick={() => setBundleItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300 text-sm font-medium"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Item Form */}
              <div className="flex gap-2 items-end border-t border-slate-800 pt-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-400 mb-2">ค้นหาสินค้าในร้าน</label>
                  <select 
                    value={selectedProduct}
                    onChange={e => setSelectedProduct(e.target.value)}
                    className="w-full bg-[#09090b] border border-slate-700 text-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- เลือกสินค้า --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-slate-400 mb-2">จำนวน</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={selectedQty}
                    onChange={e => setSelectedQty(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#09090b] border border-slate-700 text-slate-200 rounded-xl px-4 py-2 text-center focus:outline-none focus:border-orange-500"
                  />
                </div>
                <button 
                  onClick={handleAddBundleItem}
                  disabled={!selectedProduct}
                  className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
                >
                  + เพิ่มชิ้นนี้
                </button>
              </div>

              <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button 
                  onClick={() => setMappingSku(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleSaveMapping}
                  disabled={bundleItems.length === 0 || loading}
                  className="px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึกเซ็ตสินค้า'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
