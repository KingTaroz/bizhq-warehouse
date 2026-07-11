import Link from 'next/link';
import { ThemeToggle } from "@/components/ThemeToggle";
import { Home, ScanBarcode, Box } from "lucide-react";

export default function WarehouseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground pb-20 transition-colors duration-300">
      {/* Mobile-friendly Header */}
      <header className="glass p-4 sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <Link href="/warehouse" className="font-bold text-xl text-primary tracking-wide">
            BizHQ <span className="text-foreground text-sm ml-1 font-normal">Warehouse</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shadow-inner text-sm">
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
      <nav className="fixed bottom-0 w-full glass pb-safe z-50">
        <div className="flex justify-around items-center max-w-md mx-auto h-16">
          <Link href="/warehouse" className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary transition-colors">
            <Home className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider">หน้าแรก</span>
          </Link>
          <Link href="/inbound/ocr" className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary transition-colors">
            <ScanBarcode className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider">รับเข้า (AI)</span>
          </Link>
          <Link href="/outbound" className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary transition-colors">
            <Box className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider">เบิกของ</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
