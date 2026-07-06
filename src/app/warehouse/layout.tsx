import Link from 'next/link';

export default function WarehouseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-slate-200 pb-20">
      {/* Mobile-friendly Header */}
      <header className="bg-[#18181b] border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <Link href="/warehouse" className="font-bold text-xl text-orange-500">
            BizHQ <span className="text-white text-sm ml-1 font-normal">Warehouse</span>
          </Link>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-sm">
              WH
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area optimized for mobile */}
      <main className="max-w-md mx-auto p-4 pt-6">
        {children}
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 w-full bg-[#18181b] border-t border-slate-800 pb-safe z-50">
        <div className="flex justify-around items-center max-w-md mx-auto h-16">
          <Link href="/warehouse" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-orange-500">
            <span className="text-xl mb-1">🏠</span>
            <span className="text-[10px] font-medium uppercase tracking-wider">หน้าแรก</span>
          </Link>
          <Link href="/inbound/ocr" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-orange-500">
            <span className="text-xl mb-1">📥</span>
            <span className="text-[10px] font-medium uppercase tracking-wider">รับเข้า (AI)</span>
          </Link>
          <Link href="/outbound" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-orange-500">
            <span className="text-xl mb-1">📤</span>
            <span className="text-[10px] font-medium uppercase tracking-wider">เบิกของ</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
