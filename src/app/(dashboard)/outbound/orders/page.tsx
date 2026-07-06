import { getProducts } from '@/app/actions/product';
import OrderClient from './OrderClient';

export default async function OrdersPage() {
  const products = await getProducts();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">📥 อัปโหลดออเดอร์ (Online Orders)</h1>
        <p className="text-slate-400">อัปโหลดไฟล์ Excel จาก Shopee/TikTok เพื่อจับคู่ SKU และตัดสต๊อกอัตโนมัติ</p>
      </div>

      <OrderClient products={products} />
    </div>
  );
}
