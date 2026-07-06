import OCRClient from './OCRClient'
import { getProducts, getDistinctOptions } from '@/app/actions/product'

export default async function OCRPage() {
  const products = await getProducts();
  const options = await getDistinctOptions();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">🤖 รับเข้าด้วย AI (Smart OCR)</h1>
        <p className="text-slate-400">ระบบช่วยอ่านและแปลงใบส่งสินค้าเป็นสต๊อกอัตโนมัติ</p>
      </div>
      
      <OCRClient initialProducts={products} options={options} />
    </div>
  )
}
