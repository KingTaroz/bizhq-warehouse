import ScannerClient from './ScannerClient'

export default function ScannerPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">โหมดสแกนเนอร์ (Scanner Mode)</h1>
        <p className="text-slate-400">สแกน Tracking No. เพื่อตัดสต๊อก หรือสแกนเพื่อจับคู่สินค้าอัตโนมัติ</p>
      </div>
      <ScannerClient />
    </div>
  );
}
