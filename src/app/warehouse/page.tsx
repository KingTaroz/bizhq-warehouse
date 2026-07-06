import Link from 'next/link';

export default function WarehouseDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">สวัสดี, ทีมคลังสินค้า</h1>
        <p className="text-slate-400 text-sm mt-1">เลือกเมนูการทำงานที่ต้องการ</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Receive (AI) */}
        <Link href="/inbound/ocr" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-orange-500 hover:bg-slate-800 transition-colors">
          <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center text-3xl">
            🤖
          </div>
          <div className="text-center">
            <h3 className="font-bold text-slate-200">รับเข้าด้วย AI</h3>
            <p className="text-xs text-slate-500 mt-1">ถ่ายรูปบิล</p>
          </div>
        </Link>

        {/* Scan Barcode */}
        <Link href="/scanner" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-orange-500 hover:bg-slate-800 transition-colors">
          <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center text-3xl">
            📱
          </div>
          <div className="text-center">
            <h3 className="font-bold text-slate-200">สแกนบาร์โค้ด</h3>
            <p className="text-xs text-slate-500 mt-1">ค้นหาสินค้าด่วน</p>
          </div>
        </Link>

        {/* Outbound */}
        <Link href="/outbound" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-orange-500 hover:bg-slate-800 transition-colors">
          <div className="w-14 h-14 bg-orange-500/10 rounded-full flex items-center justify-center text-3xl">
            📤
          </div>
          <div className="text-center">
            <h3 className="font-bold text-slate-200">เบิกจ่ายสินค้า</h3>
            <p className="text-xs text-slate-500 mt-1">แพ็คของส่งลูกค้า</p>
          </div>
        </Link>

        {/* Check Stock */}
        <Link href="/products" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-orange-500 hover:bg-slate-800 transition-colors">
          <div className="w-14 h-14 bg-purple-500/10 rounded-full flex items-center justify-center text-3xl">
            📦
          </div>
          <div className="text-center">
            <h3 className="font-bold text-slate-200">เช็คสต๊อก</h3>
            <p className="text-xs text-slate-500 mt-1">รายการสินค้า</p>
          </div>
        </Link>
      </div>
      
      <div className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
        <h3 className="text-orange-400 font-bold mb-2">📌 โหมดหน้างาน (Mobile)</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          หน้านี้ถูกออกแบบมาให้ปุ่มใหญ่ กดง่าย และตัดเมนูที่ซับซ้อนออก เพื่อให้ทีมงานเดินใช้โทรศัพท์สแกนและจัดการสต๊อกได้อย่างรวดเร็ว
        </p>
      </div>
    </div>
  );
}
