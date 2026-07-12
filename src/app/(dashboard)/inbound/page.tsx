import InboundClient from './InboundClient'

export default function InboundPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">รับสินค้าเข้า (Inbound)</h1>
        <p className="text-muted-foreground">สแกนบาร์โค้ดสินค้าที่รับเข้าเพื่อเพิ่มสต๊อก</p>
      </div>
      <InboundClient />
    </div>
  );
}
