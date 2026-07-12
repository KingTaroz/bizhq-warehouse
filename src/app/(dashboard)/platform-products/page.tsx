import { prisma } from '@/lib/prisma'
import PlatformProductClient from './PlatformProductClient'

export default async function PlatformProductsPage() {
  const items = await prisma.platformProduct.findMany({
    orderBy: [{ productId: { sort: 'asc', nulls: 'first' } }, { itemName: 'asc' }],
    include: { product: { select: { brand: true, name: true, viscosity: true, size: true } } }
  })
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, brand: true, name: true, viscosity: true, size: true, qtyPerCarton: true }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-foreground mb-2">🛍️ สินค้าออนไลน์ (Shopee / TikTok)</h1>
        <p className="text-muted-foreground">จับคู่สินค้าบนแพลตฟอร์มกับสินค้าจริงในระบบ เพื่อให้ตัดสต๊อกออเดอร์อัตโนมัติ</p>
      </div>
      <PlatformProductClient items={items} products={products} />
    </div>
  )
}
