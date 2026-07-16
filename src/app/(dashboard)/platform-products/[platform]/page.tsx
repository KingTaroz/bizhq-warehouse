import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { buildSkuCode } from '@/lib/skucode'
import PlatformProductClient from '../PlatformProductClient'

const LABELS: Record<string, { title: string, emoji: string }> = {
  SHOPEE: { title: 'Shopee', emoji: '🛒' },
  TIKTOK: { title: 'TikTok', emoji: '🎵' },
}

export default async function PlatformPage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform: raw } = await params
  const platform = raw.toUpperCase()
  const label = LABELS[platform]
  if (!label) notFound()

  const rawItems = await prisma.platformProduct.findMany({
    where: { platform },
    orderBy: [{ productId: { sort: 'asc', nulls: 'first' } }, { itemName: 'asc' }],
    include: { product: { select: { brand: true, name: true, viscosity: true, size: true } } }
  })
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, brand: true, name: true, viscosity: true, size: true, qtyPerCarton: true }
  })

  // แนบส่วนประกอบเซต (เก็บใน Sku/SkuItem) ให้รายการที่จับคู่แบบเซต
  const skus = await prisma.sku.findMany({
    where: { platform },
    include: { items: { include: { product: { select: { brand: true, name: true, viscosity: true, size: true } } } } }
  })
  const skuMap = new Map(skus.map(s => [s.skuCode, s.items]))
  const items = rawItems.map(pp => ({
    ...pp,
    setItems: pp.isSet ? (skuMap.get(buildSkuCode(pp.itemName, pp.variationName)) || []) : null
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-foreground mb-2">{label.emoji} สินค้า {label.title}</h1>
        <p className="text-muted-foreground">จับคู่สินค้า {label.title} กับสินค้าจริงในระบบ เพื่อให้ตัดสต๊อกออเดอร์อัตโนมัติ</p>
      </div>
      <PlatformProductClient items={items} products={products} platform={platform} />
    </div>
  )
}
