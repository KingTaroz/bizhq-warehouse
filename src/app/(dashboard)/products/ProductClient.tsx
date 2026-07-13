'use client'

import { useState } from 'react'
import { createProduct, importProductsExcel, deleteProduct, addBarcodeToProduct, deleteBarcode, verifyAndDeleteProduct, updateProductStock } from '@/app/actions/product'
import * as xlsx from 'xlsx'
import { Pagination } from '@/components/Pagination'

interface ProductClientProps {
  initialProducts: any[];
  options: {
    brands: string[];
    models: string[];
    sizes: string[];
    categories: string[];
  };
  role: string;
}

export default function ProductClient({ initialProducts, options, role }: ProductClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [manageBarcodesProductId, setManageBarcodesProductId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockValue, setEditingStockValue] = useState<string>('');

  const products = initialProducts.filter(p => {
    if (!searchTerm.trim()) return true;
    const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);
    const searchableText = [
      p.name,
      p.category,
      p.brand,
      p.viscosity,
      p.size,
      ...(p.barcodes?.map((b: any) => b.code) || [])
    ].filter(Boolean).join(' ').toLowerCase();

    return searchTerms.every(term => searchableText.includes(term));
  });

  const handleSaveStock = async (p: any) => {
    const newStock = parseInt(editingStockValue, 10);
    if (!isNaN(newStock) && newStock >= 0) {
      setLoading(true);
      const res = await updateProductStock(p.id, newStock);
      setLoading(false);
      if (res.error) {
        alert(res.error);
      }
    }
    setEditingStockId(null);
  };

  const downloadTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([
      { 
        Brand: 'PTT', 
        Model: 'Performa Synthetic',
        Viscosity: '5W-30',
        Size: '1L',
        QtyPerCarton: 4,
        Category: 'Engine Oil', 
        Description: 'Fully synthetic oil', 
        BottleBarcode: '885000000001',
        CartonBarcode: '885000000002'
      }
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Template");
    xlsx.writeFile(wb, "Product_Template.xlsx");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    const res = await importProductsExcel(formData);
    if (res.error) alert('Error: ' + res.error);
    else alert(`นำเข้าสินค้า ${res.count} รายการ สำเร็จ!`);
    setLoading(false);
    e.target.value = '';
  };

  const [deleteConfirmProductId, setDeleteConfirmProductId] = useState<string | null>(null);

  const handleDeleteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!deleteConfirmProductId) return;
    
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    
    const res = await verifyAndDeleteProduct(deleteConfirmProductId, password);
    setLoading(false);
    
    if (res.success) {
      setDeleteConfirmProductId(null);
    } else {
      alert(res.error);
    }
  };

  const totalItems = products.length;
  const paginatedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-2xl border border-border">
        <div className="relative w-full sm:w-96">
          <input 
            type="text" 
            placeholder="ค้นหา (บาร์โค้ด, ชื่อ, ยี่ห้อ, หมวดหมู่)..." 
            className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-2 focus:outline-none focus:border-orange-500 transition-colors"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
          <button 
            onClick={downloadTemplate}
            className="whitespace-nowrap px-4 py-2 bg-muted text-foreground rounded-xl border border-border hover:bg-muted transition-colors flex-1 sm:flex-none text-sm font-medium"
          >
            📥 โหลด Template Excel
          </button>
          <label className="whitespace-nowrap px-4 py-2 bg-muted text-foreground rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer flex-1 sm:flex-none text-sm font-medium text-center">
            {loading ? '⏳ กำลังนำเข้า...' : '📤 Import Excel'}
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleUpload} disabled={loading} />
          </label>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="whitespace-nowrap px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors flex-1 sm:flex-none text-sm font-medium"
          >
            + เพิ่มสินค้าใหม่
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground border-b border-border">
                <th className="px-6 py-4 font-medium">ยี่ห้อ (Brand)</th>
                <th className="px-6 py-4 font-medium">ชื่อสินค้า/รุ่น (Name/Model)</th>
                <th className="px-6 py-4 font-medium">ความหนืด (Viscosity)</th>
                <th className="px-6 py-4 font-medium">สต๊อกรวม (Total Stock)</th>
                <th className="px-6 py-4 font-medium">บาร์โค้ด (Barcodes)</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    ไม่พบข้อมูลสินค้า (No products found)
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-foreground">{product.brand || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{product.name}</div>
                      {product.size && <div className="text-sm text-muted-foreground">ขนาด: {product.size} {product.qtyPerCarton > 1 ? `(${product.qtyPerCarton} ขวด/ลัง)` : ''}</div>}
                    </td>
                    <td className="px-6 py-4 text-orange-500 font-medium">
                      {product.viscosity || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {editingStockId === product.id ? (
                        <div className="flex flex-col gap-2">
                          <input 
                            type="number" 
                            value={editingStockValue}
                            onChange={(e) => setEditingStockValue(e.target.value)}
                            className="w-24 px-2 py-1 bg-muted border border-border rounded text-foreground focus:outline-none focus:border-orange-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveStock(product);
                              if (e.key === 'Escape') setEditingStockId(null);
                            }}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveStock(product)} className="text-xs bg-green-500/10 text-green-500 hover:bg-green-500/20 px-2 py-1 rounded border border-green-500/20">บันทึก</button>
                            <button onClick={() => setEditingStockId(null)} className="text-xs bg-muted text-muted-foreground hover:text-foreground px-2 py-1 rounded">ยกเลิก</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <div className="text-white font-bold text-lg bg-muted inline-block px-3 py-1 rounded-lg border border-border">
                            {product.inventory?.reduce((acc: number, inv: any) => acc + inv.quantity, 0) || 0}
                          </div>
                          {product.qtyPerCarton > 1 && (
                            <div className="text-xs text-muted-foreground pl-1">
                              ≈ {((product.inventory?.reduce((acc: number, inv: any) => acc + inv.quantity, 0) || 0) / product.qtyPerCarton).toFixed(1)} ลัง
                            </div>
                          )}
                          <button 
                            onClick={() => {
                              setEditingStockId(product.id);
                              setEditingStockValue((product.inventory?.reduce((acc: number, inv: any) => acc + inv.quantity, 0) || 0).toString());
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 mt-1 pl-1"
                          >
                            ✏️ แก้ไข
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {product.barcodes?.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {product.barcodes.map((b: any) => (
                            <span key={b.id} className="bg-muted px-2 py-0.5 rounded border border-border text-xs w-max">
                              {b.type === 'CARTON' ? '📦 ' : '🍾 '}{b.code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-3 items-center">
                      <button 
                        onClick={() => setManageBarcodesProductId(product.id)}
                        className="text-blue-400 hover:text-blue-300 transition-colors p-2 rounded-lg hover:bg-blue-500/10"
                        title="บาร์โค้ด (Barcodes)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>
                      </button>
                      
                      {role === 'admin' && (
                        <button 
                          onClick={() => setDeleteConfirmProductId(product.id)}
                          className="text-red-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                          title="ลบ (Delete)"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 overflow-y-auto py-10">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">เพิ่มสินค้าใหม่ (Add Product)</h2>
            </div>
            
            <form action={async (formData) => {
              setLoading(true);
              const res = await createProduct(formData);
              setLoading(false);
              if (res.success) setIsModalOpen(false);
            }} className="p-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Barcode Section Moved to Top */}
                <div className="sm:col-span-2 mb-2 pb-4 border-b border-border">
                  <h3 className="text-foreground font-medium mb-3">รหัสบาร์โค้ด (Barcodes) - ใช้เป็นรหัสหลัก</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">บาร์โค้ดบนขวด (Bottle Barcode) *</label>
                      <input required name="bottleBarcode" type="text" className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-2 focus:outline-none focus:border-orange-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">บาร์โค้ดยกลัง (Carton Barcode)</label>
                      <input name="cartonBarcode" type="text" className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-2 focus:outline-none focus:border-orange-500 transition-colors" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">ยี่ห้อ (Brand) *</label>
                  <input required list="brand-list" name="brand" type="text" placeholder="เช่น PTT, Shell" className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-2 focus:outline-none focus:border-orange-500 transition-colors" />
                  <datalist id="brand-list">
                    {options.brands.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">รุ่น *</label>
                  <input required name="name" list="model-list" type="text" placeholder="เช่น Performa Synthetic" className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-2 focus:outline-none focus:border-orange-500 transition-colors" />
                  <datalist id="model-list">
                    {options.models.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">เบอร์ความหนืด (Viscosity)</label>
                  <input name="viscosity" type="text" placeholder="เช่น 5W-30" className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-2 focus:outline-none focus:border-orange-500 transition-colors" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">ขนาดต่อชิ้น (Size)</label>
                  <input list="size-list" name="size" type="text" placeholder="เช่น 1L, 4L" className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-2 focus:outline-none focus:border-orange-500 transition-colors" />
                  <datalist id="size-list">
                    {options.sizes.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">จำนวนต่อลัง (Qty per Carton)</label>
                  <input name="qtyPerCarton" type="number" min="1" defaultValue="1" className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-2 focus:outline-none focus:border-orange-500 transition-colors" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">หมวดหมู่ (Category)</label>
                  <input list="category-list" name="category" type="text" placeholder="เช่น น้ำมันเครื่องเบนซิน" className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-2 focus:outline-none focus:border-orange-500 transition-colors" />
                  <datalist id="category-list">
                    {options.categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

              </div>

              <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-border">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  ยกเลิก (Cancel)
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึก (Save)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Manage Barcodes Modal */}
      {manageBarcodesProductId && (() => {
        const product = products.find(p => p.id === manageBarcodesProductId);
        if (!product) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="text-xl font-bold text-foreground">จัดการบาร์โค้ด</h2>
                <button onClick={() => setManageBarcodesProductId(null)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              
              <div className="p-6">
                <div className="mb-4 text-sm text-muted-foreground">
                  สินค้า: <span className="text-orange-500 font-bold">{product.name}</span>
                </div>

                {/* Existing Barcodes */}
                <div className="space-y-2 mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-2">บาร์โค้ดที่มีอยู่:</h3>
                  {product.barcodes?.length === 0 ? (
                    <p className="text-muted-foreground text-sm">ยังไม่มีบาร์โค้ด</p>
                  ) : (
                    product.barcodes.map((b: any) => (
                      <div key={b.id} className="flex justify-between items-center bg-muted px-3 py-2 rounded-lg border border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{b.type === 'CARTON' ? '📦' : '🍾'}</span>
                          <span className="font-mono text-foreground">{b.code}</span>
                        </div>
                        <button 
                          onClick={async () => {
                            if (confirm('ลบบาร์โค้ดนี้?')) {
                              setLoading(true);
                              await deleteBarcode(b.id);
                              setLoading(false);
                            }
                          }}
                          className="text-red-500 hover:text-red-500 text-sm font-medium"
                          disabled={loading}
                        >
                          ลบ
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add New Barcode */}
                <form action={async (formData) => {
                  const code = formData.get('code') as string;
                  const type = formData.get('type') as 'BOTTLE' | 'CARTON';
                  if (!code) return;
                  
                  setLoading(true);
                  const res = await addBarcodeToProduct(product.id, code, type, type === 'CARTON' ? product.qtyPerCarton : 1);
                  setLoading(false);
                  if (res.error) alert(res.error);
                  else (document.getElementById('new-barcode-form') as HTMLFormElement).reset();
                }} id="new-barcode-form" className="space-y-3 pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground">เพิ่มบาร์โค้ดใหม่ (ยิงสแกนเนอร์ได้เลย):</h3>
                  
                  <div className="flex gap-2">
                    <select name="type" className="bg-background border border-border text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500">
                      <option value="BOTTLE">ขวด (Bottle)</option>
                      <option value="CARTON">ลัง (Carton)</option>
                    </select>
                    <input 
                      required 
                      name="code" 
                      type="text" 
                      placeholder="บาร์โค้ด..." 
                      className="flex-1 bg-background border border-border text-foreground rounded-xl px-4 py-2 focus:outline-none focus:border-orange-500" 
                      autoFocus
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
                  >
                    {loading ? 'กำลังเพิ่ม...' : '+ เพิ่มบาร์โค้ด'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Modal */}
      {deleteConfirmProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-card border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-red-500/5">
              <h2 className="text-xl font-bold text-red-500 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                ยืนยันการลบสินค้า
              </h2>
            </div>
            <form onSubmit={handleDeleteSubmit} className="p-6">
              <p className="text-foreground text-sm mb-6">
                กรุณาใส่ <strong>รหัสผ่านของเจ้าของร้าน (Admin Password)</strong> เพื่อยืนยันการลบสินค้านี้ออกจากระบบ
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-2">รหัสผ่าน (Password)</label>
                <input 
                  type="password" 
                  name="password" 
                  required 
                  className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors" 
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setDeleteConfirmProductId(null)}
                  className="px-4 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'กำลังตรวจสอบ...' : 'ยืนยันลบ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
