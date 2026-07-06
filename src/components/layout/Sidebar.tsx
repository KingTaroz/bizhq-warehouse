'use client'

import Link from 'next/link';
import { logout } from '@/app/actions';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Sidebar({ role, onClose }: { role?: string, onClose?: () => void }) {
  const pathname = usePathname() || '';
  const [isInboundOpen, setIsInboundOpen] = useState(pathname.startsWith('/inbound'));
  const [isOutboundOpen, setIsOutboundOpen] = useState(pathname.startsWith('/outbound'));

  return (
    <aside className="w-full h-full bg-[#18181b] border-r border-slate-800 shadow-sm flex flex-col">
      <div className="p-6 text-center relative">
        <button 
          onClick={onClose} 
          className="md:hidden absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          ✕
        </button>
        <div className="w-20 h-20 mx-auto mb-3 bg-slate-900 rounded-full flex items-center justify-center overflow-hidden border border-slate-800 p-2">
             <img src="/logo.png" alt="BizHQ" className="h-full object-contain" />
        </div>
        <h1 className="text-xl font-bold text-orange-500">BizHQ</h1>
        <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{role === 'warehouse' ? 'Warehouse Manager' : 'Administrator'}</div>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
        {role === 'warehouse' && (
          <Link href="/scanner" onClick={onClose} className="block px-4 py-3 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 transition-colors font-medium">📸 โหมดสแกนเนอร์</Link>
        )}
        
        {role !== 'warehouse' && (
          <Link href="/" onClick={onClose} className={`block px-4 py-3 rounded-xl transition-colors font-medium ${pathname === '/' ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'}`}>📊 Dashboard</Link>
        )}

        {role !== 'warehouse' && (
          <div className="pt-2 pb-2">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-2">การเงิน & ต้นทุน (Finance)</p>
            <div className="space-y-1">
              <Link href="/analytics" onClick={onClose} className={`block px-4 py-3 rounded-xl transition-colors font-medium ${pathname.startsWith('/analytics') ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'}`}>📈 วิเคราะห์กำไร (P&L)</Link>
              <Link href="/costs" onClick={onClose} className={`block px-4 py-3 rounded-xl transition-colors font-medium ${pathname.startsWith('/costs') ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'}`}>💰 จัดการราคาทุน (Cost)</Link>
            </div>
          </div>
        )}
        
        <Link href="/products" onClick={onClose} className={`block px-4 py-3 rounded-xl transition-colors font-medium ${pathname.startsWith('/products') ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'}`}>📦 สินค้า & สต๊อก</Link>
        
        {/* Inbound Dropdown */}
        <div>
          <button 
            onClick={() => setIsInboundOpen(!isInboundOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors font-medium ${pathname.startsWith('/inbound') ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'}`}
          >
            <div className="flex items-center gap-2">📥 รับสินค้าเข้า (Inbound)</div>
            <span className={`transform transition-transform ${isInboundOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
          
          {isInboundOpen && (
            <div className="pl-4 pr-2 mt-1 space-y-1 border-l-2 border-slate-800 ml-4 py-2">
              <Link href="/inbound" onClick={onClose} className={`block px-4 py-2 rounded-xl transition-colors text-sm font-medium ${pathname === '/inbound' ? 'bg-orange-500/10 text-orange-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
                สแกนบาร์โค้ด
              </Link>
              <Link href="/inbound/ocr" onClick={onClose} className={`block px-4 py-2 rounded-xl transition-colors text-sm font-medium ${pathname === '/inbound/ocr' ? 'bg-orange-500/10 text-orange-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
                🤖 รับเข้าด้วย AI (Smart OCR)
              </Link>
            </div>
          )}
        </div>

        {/* Outbound Dropdown */}
        <div>
          <button 
            onClick={() => setIsOutboundOpen(!isOutboundOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors font-medium ${pathname.startsWith('/outbound') ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'}`}
          >
            <div className="flex items-center gap-2">📤 เบิก/จ่ายสินค้า (Outbound)</div>
            <span className={`transform transition-transform ${isOutboundOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
          
          {isOutboundOpen && (
            <div className="pl-4 pr-2 mt-1 space-y-1 border-l-2 border-slate-800 ml-4 py-2">
              <Link href="/outbound/orders" onClick={onClose} className={`block px-4 py-2 rounded-xl transition-colors text-sm font-medium ${pathname === '/outbound/orders' ? 'bg-orange-500/10 text-orange-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
                📥 อัปโหลดออเดอร์ (Online Orders)
              </Link>
              <Link href="/outbound" onClick={onClose} className={`block px-4 py-2 rounded-xl transition-colors text-sm font-medium ${pathname === '/outbound' ? 'bg-orange-500/10 text-orange-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
                📦 สแกนจ่ายออก (Scanner)
              </Link>
            </div>
          )}
        </div>
        <Link href="/defect" onClick={onClose} className={`block px-4 py-3 rounded-xl transition-colors font-medium ${pathname.startsWith('/defect') ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'}`}>⚠️ สินค้าเสียหาย (Defect)</Link>
        
        {role !== 'warehouse' && (
          <>
            <Link href="/scanner" onClick={onClose} className="block px-4 py-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 transition-colors font-medium mt-4">📸 โหมดสแกนเนอร์</Link>
            <div className="pt-4 mt-4 border-t border-slate-800/50">
              <Link href="/users" onClick={onClose} className={`block px-4 py-3 rounded-xl transition-colors font-medium ${pathname.startsWith('/users') ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'}`}>👥 ผู้ใช้งาน (Users)</Link>
            </div>
          </>
        )}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <form action={logout}>
          <button type="submit" className="w-full py-3 px-4 rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 transition-colors text-sm font-medium flex items-center justify-center gap-2">
            🚪 ออกจากระบบ
          </button>
        </form>
      </div>
    </aside>
  );
}
