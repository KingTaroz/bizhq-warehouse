'use client'

import Link from 'next/link';
import { logout } from '@/app/actions';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  TrendingUp, 
  CircleDollarSign, 
  PackageSearch, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  AlertTriangle, 
  Camera, 
  Users, 
  LogOut,
  ChevronDown,
  UploadCloud
} from 'lucide-react';

export default function Sidebar({ role, onClose }: { role?: string, onClose?: () => void }) {
  const pathname = usePathname() || '';
  const [isInboundOpen, setIsInboundOpen] = useState(pathname.startsWith('/inbound'));
  const [isOutboundOpen, setIsOutboundOpen] = useState(pathname.startsWith('/outbound'));

  return (
    <aside className="w-full h-full glass border-r border-border shadow-lg flex flex-col transition-colors duration-300">
      <div className="p-6 text-center relative border-b border-border">
        <button 
          onClick={onClose} 
          className="md:hidden absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
        <div className="w-20 h-20 mx-auto mb-3 bg-card rounded-full flex items-center justify-center overflow-hidden border border-border p-2 shadow-inner">
             <img src="/logo.png" alt="BizHQ" className="h-full object-contain" />
        </div>
        <h1 className="text-xl font-bold text-primary tracking-wide">BizHQ</h1>
        <div className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-semibold">{role === 'warehouse' ? 'Warehouse' : 'Administrator'}</div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {role === 'warehouse' && (
          <Link href="/scanner" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all font-medium shadow-sm">
            <Camera className="w-5 h-5" /> โหมดสแกนเนอร์
          </Link>
        )}
        
        {role !== 'warehouse' && (
          <Link href="/" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${pathname === '/' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </Link>
        )}

        {role !== 'warehouse' && (
          <div className="pt-2 pb-2">
            <p className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 mt-2">การเงิน & ต้นทุน</p>
            <div className="space-y-1">
              <Link href="/analytics" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${pathname.startsWith('/analytics') ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <TrendingUp className="w-5 h-5" /> วิเคราะห์กำไร
              </Link>
              <Link href="/costs" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${pathname.startsWith('/costs') ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <CircleDollarSign className="w-5 h-5" /> จัดการราคาทุน
              </Link>
            </div>
          </div>
        )}
        
        <Link href="/products" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${pathname.startsWith('/products') ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
          <PackageSearch className="w-5 h-5" /> สินค้า & สต๊อก
        </Link>
        
        {/* Inbound Dropdown */}
        <div>
          <button 
            onClick={() => setIsInboundOpen(!isInboundOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium ${pathname.startsWith('/inbound') ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <div className="flex items-center gap-3"><ArrowDownToLine className="w-5 h-5" /> รับเข้า</div>
            <ChevronDown className={`w-4 h-4 transform transition-transform ${isInboundOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isInboundOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            <div className="pl-4 pr-2 space-y-1 border-l-2 border-border ml-6 py-2">
              <Link href="/inbound" onClick={onClose} className={`block px-4 py-2 rounded-xl transition-colors text-sm font-medium ${pathname === '/inbound' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                สแกนบาร์โค้ด
              </Link>
              <Link href="/inbound/ocr" onClick={onClose} className={`block px-4 py-2 rounded-xl transition-colors text-sm font-medium ${pathname === '/inbound/ocr' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                รับเข้าด้วย AI (OCR)
              </Link>
            </div>
          </div>
        </div>

        {/* Outbound Dropdown */}
        <div>
          <button 
            onClick={() => setIsOutboundOpen(!isOutboundOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium ${pathname.startsWith('/outbound') ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <div className="flex items-center gap-3"><ArrowUpFromLine className="w-5 h-5" /> เบิกจ่าย</div>
            <ChevronDown className={`w-4 h-4 transform transition-transform ${isOutboundOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOutboundOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            <div className="pl-4 pr-2 space-y-1 border-l-2 border-border ml-6 py-2">
              <Link href="/outbound/orders" onClick={onClose} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-medium ${pathname === '/outbound/orders' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <UploadCloud className="w-4 h-4" /> อัปโหลดออเดอร์
              </Link>
              <Link href="/outbound" onClick={onClose} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-medium ${pathname === '/outbound' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Camera className="w-4 h-4" /> สแกนจ่ายออก
              </Link>
            </div>
          </div>
        </div>
        <Link href="/defect" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${pathname.startsWith('/defect') ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
          <AlertTriangle className="w-5 h-5" /> สินค้าเสียหาย
        </Link>
        
        {role !== 'warehouse' && (
          <>
            <Link href="/scanner" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all font-medium mt-6 shadow-sm">
              <Camera className="w-5 h-5" /> โหมดสแกนเนอร์
            </Link>
            <div className="pt-4 mt-4 border-t border-border">
              <Link href="/users" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${pathname.startsWith('/users') ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Users className="w-5 h-5" /> ผู้ใช้งาน
              </Link>
            </div>
          </>
        )}
      </nav>
      
      <div className="p-4 border-t border-border bg-muted/30">
        <form action={logout}>
          <button type="submit" className="w-full py-3 px-4 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all text-sm font-bold flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" /> ออกจากระบบ
          </button>
        </form>
      </div>
    </aside>
  );
}
