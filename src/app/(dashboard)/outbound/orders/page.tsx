import { getProducts } from '@/app/actions/product';
import { getRecentOrders } from '@/app/actions/order';
import OrderClient from './OrderClient';
import OrderList from './OrderList';

export default async function OrdersPage() {
  const products = await getProducts();
  const orders = await getRecentOrders();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">📥 อัปโหลดออเดอร์ (Online Orders)</h1>
        <p className="text-muted-foreground">อัปโหลดไฟล์ Excel จาก Shopee/TikTok เพื่อจับคู่ SKU และตัดสต๊อกอัตโนมัติ</p>
      </div>

      <OrderClient products={products} />
      <OrderList orders={orders} />
    </div>
  );
}
