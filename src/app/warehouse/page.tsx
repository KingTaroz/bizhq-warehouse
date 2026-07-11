import Link from 'next/link';
import { ScanLine, Box, UploadCloud, Package, Lightbulb } from 'lucide-react';

export default function WarehouseDashboard() {
  return (
    <div className="flex flex-col gap-6 relative">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">สวัสดี, ทีมคลังสินค้า</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">เลือกเมนูการทำงานที่ต้องการ</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Receive (AI) */}
        <Link href="/inbound/ocr" className="glass rounded-[2rem] p-5 flex flex-col items-center justify-center gap-3 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 group shadow-sm">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-foreground">รับเข้าด้วย AI</h3>
            <p className="text-xs text-muted-foreground mt-1 font-medium">ถ่ายรูปบิล</p>
          </div>
        </Link>

        {/* Scan Barcode */}
        <Link href="/scanner" className="glass rounded-[2rem] p-5 flex flex-col items-center justify-center gap-3 hover:border-green-500/50 hover:bg-green-500/5 transition-all duration-300 group shadow-sm">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform shadow-inner">
            <ScanLine className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-foreground">สแกนบาร์โค้ด</h3>
            <p className="text-xs text-muted-foreground mt-1 font-medium">ค้นหาสินค้าด่วน</p>
          </div>
        </Link>

        {/* Outbound */}
        <Link href="/outbound" className="glass rounded-[2rem] p-5 flex flex-col items-center justify-center gap-3 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all duration-300 group shadow-sm">
          <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform shadow-inner">
            <Box className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-foreground">เบิกจ่ายสินค้า</h3>
            <p className="text-xs text-muted-foreground mt-1 font-medium">แพ็คของส่งลูกค้า</p>
          </div>
        </Link>

        {/* Check Stock */}
        <Link href="/products" className="glass rounded-[2rem] p-5 flex flex-col items-center justify-center gap-3 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all duration-300 group shadow-sm">
          <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform shadow-inner">
            <Package className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-foreground">เช็คสต๊อก</h3>
            <p className="text-xs text-muted-foreground mt-1 font-medium">รายการสินค้า</p>
          </div>
        </Link>
      </div>
      
      <div className="mt-4 bg-primary/10 border border-primary/20 rounded-[1.5rem] p-5 relative overflow-hidden shadow-sm">
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Lightbulb className="w-24 h-24 text-primary" />
        </div>
        <h3 className="text-primary font-extrabold mb-2 flex items-center gap-2 relative z-10">
          <Lightbulb className="w-5 h-5" /> โหมดหน้างาน (Mobile)
        </h3>
        <p className="text-sm text-foreground/80 leading-relaxed font-medium relative z-10">
          หน้านี้ถูกออกแบบมาให้ปุ่มใหญ่ กดง่าย และตัดเมนูที่ซับซ้อนออก เพื่อให้ทีมงานเดินใช้โทรศัพท์สแกนและจัดการสต๊อกได้อย่างรวดเร็ว
        </p>
      </div>

      {/* Floating Action Button (FAB) for quick scan */}
      <Link href="/scanner" className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform z-40">
        <ScanLine className="w-6 h-6" />
      </Link>
    </div>
  );
}
