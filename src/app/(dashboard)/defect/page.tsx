import DefectClient from './DefectClient'

export default function DefectPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">แจ้งสินค้าเสียหาย (Defect)</h1>
        <p className="text-slate-400">สแกนบาร์โค้ดสินค้าที่ชำรุด สูญหาย หรือหมดอายุ เพื่อตัดออกจากสต๊อก</p>
      </div>
      <DefectClient />
    </div>
  );
}
