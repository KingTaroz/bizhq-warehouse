import ScannerClient from './ScannerClient'

export default function ScannerPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-foreground mb-2 tracking-tight">โหมดสแกนเนอร์ (Scanner Mode)</h1>
        <p className="text-muted-foreground font-medium">สแกน Tracking No. เพื่อตัดสต๊อก หรือสแกนเพื่อจับคู่สินค้าอัตโนมัติ</p>
      </div>
      <ScannerClient />
    </div>
  );
}
