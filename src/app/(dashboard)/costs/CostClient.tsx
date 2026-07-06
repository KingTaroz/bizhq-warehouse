'use client'

import { useState } from 'react'
import { exportCosts, importCosts, updateSingleCost } from '@/app/actions/cost'
import { useRouter } from 'next/navigation'

export default function CostClient({ initialProducts }: { initialProducts: any[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleSaveCost = async (p: any) => {
    const newCartonCost = parseFloat(editValue);
    if (!isNaN(newCartonCost) && newCartonCost >= 0) {
      const newPieceCost = newCartonCost / (p.qtyPerCarton || 1);
      const res = await updateSingleCost(p.id, newPieceCost);
      if (res.error) {
        setMessage({ text: res.error, type: 'error' });
      } else {
        setMessage({ text: 'อัปเดตราคาทุนสำเร็จ', type: 'success' });
        router.refresh();
      }
    }
    setEditingId(null);
  };

  const filteredProducts = initialProducts.filter(p => {
    if (!searchQuery.trim()) return true;
    
    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);
    const searchableText = [
      p.name,
      p.brand,
      p.model,
      p.viscosity,
      p.size
    ].filter(Boolean).join(' ').toLowerCase();

    return searchTerms.every(term => searchableText.includes(term));
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      setMessage({ text: 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ', type: 'error' });
      return;
    }

    setIsExporting(true);
    setMessage(null);
    try {
      const res = await exportCosts(Array.from(selectedIds));
      if (res.error) throw new Error(res.error);
      
      if (res.base64) {
        // Create download link
        const byteCharacters = atob(res.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Cost_Update_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setMessage({ text: 'โหลดไฟล์ Excel สำเร็จ! แก้ไขช่อง "ราคาทุนใหม่" แล้วอัปโหลดกลับเข้ามาได้เลย', type: 'success' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Export error', type: 'error' });
    }
    setIsExporting(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await importCosts(formData);
      
      if (res.error) throw new Error(res.error);
      
      setMessage({ text: `✅ อัปเดตต้นทุนสำเร็จ ${res.count} รายการ!`, type: 'success' });
      setSelectedIds(new Set());
      router.refresh(); // Refresh page to see new data
    } catch (e: any) {
      setMessage({ text: e.message || 'Import error', type: 'error' });
    }
    setIsImporting(false);
    e.target.value = ''; // Reset input
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val);
  };

  return (
    <div className="space-y-4">
      
      {/* Search and Actions Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-[#18181b] p-4 rounded-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
          <div className="text-slate-300 whitespace-nowrap">
            เลือกแล้ว <span className="font-bold text-orange-400">{selectedIds.size}</span> รายการ
          </div>
          <div className="relative w-full sm:w-64 md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-slate-500">🔍</span>
            </div>
            <input
              type="text"
              placeholder="ค้นหา ยี่ห้อ, รุ่น, ขนาด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleExport}
            disabled={isExporting || selectedIds.size === 0}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2
              ${selectedIds.size > 0 
                ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
          >
            {isExporting ? '⏳ กำลังสร้างไฟล์...' : '📥 1. โหลดข้อมูลไปแก้ (Export)'}
          </button>

          <label className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer
            ${isImporting ? 'bg-orange-500/50 text-white cursor-wait' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}>
            {isImporting ? '⏳ กำลังอัปเดต...' : '📤 2. อัปโหลดข้อมูลที่แก้แล้ว (Import)'}
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileChange} disabled={isImporting} />
          </label>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50' : 'bg-red-900/30 text-red-400 border border-red-900/50'
        }`}>
          {message.text}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#18181b] rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800 text-sm">
                <th className="px-6 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size > 0 && selectedIds.size === filteredProducts.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 accent-orange-500"
                  />
                </th>
                <th className="px-6 py-4 font-medium">ยี่ห้อ</th>
                <th className="px-6 py-4 font-medium">รุ่น</th>
                <th className="px-6 py-4 font-medium">ความหนืด</th>
                <th className="px-6 py-4 font-medium">ขนาด</th>
                <th className="px-6 py-4 font-medium text-center">จำนวน/ลัง</th>
                <th className="px-6 py-4 font-medium text-right">ราคาทุน/ลัง</th>
                <th className="px-6 py-4 font-medium text-right">ราคาทุน/ชิ้น</th>
                <th className="px-6 py-4 font-medium text-right">ราคาทุนเฉลี่ย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredProducts.map(p => (
                <tr key={p.id} className={`hover:bg-slate-800/30 transition-colors ${selectedIds.has(p.id) ? 'bg-orange-500/5' : ''}`}>
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 accent-orange-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-medium">{p.brand || '-'}</td>
                  <td className="px-6 py-4 text-slate-400">{p.model || '-'}</td>
                  <td className="px-6 py-4 text-slate-400">{p.viscosity || '-'}</td>
                  <td className="px-6 py-4 text-slate-400">{p.size || '-'}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{p.qtyPerCarton || 1}</td>
                  <td className="px-6 py-4 text-right">
                    {editingId === p.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input 
                          type="number" 
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right text-amber-500 focus:outline-none focus:border-orange-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCost(p);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button onClick={() => handleSaveCost(p)} className="text-green-500 hover:text-green-400 p-1" title="บันทึก">💾</button>
                        <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-400 p-1" title="ยกเลิก">❌</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 group">
                        <span className="font-bold text-amber-500">
                          {formatCurrency((p.currentAvgCost || 0) * (p.qtyPerCarton || 1))}
                        </span>
                        <button 
                          onClick={() => {
                            setEditingId(p.id);
                            setEditValue(((p.currentAvgCost || 0) * (p.qtyPerCarton || 1)).toString());
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-orange-500 p-1"
                          title="แก้ไขราคาทุนต่อลัง"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-orange-400">
                    {formatCurrency(p.currentAvgCost || 0)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400">
                    {formatCurrency(p.currentAvgCost || 0)}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    ไม่พบข้อมูลสินค้าที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
