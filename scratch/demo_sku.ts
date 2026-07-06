import { prisma } from '../src/lib/prisma';

async function main() {
  console.log("🚀 Starting SKU Mapping Demonstration...\n");

  // 1. Clean up old demo data if exists
  await prisma.skuItem.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.product.deleteMany({ where: { name: { startsWith: 'Demo' } } });

  // 2. Create Products
  console.log("📦 Creating physical products...");
  const oil = await prisma.product.create({
    data: {
      name: 'Demo Oil 1L',
      brand: 'DemoBrand',
      size: '1L',
    }
  });
  
  const filter = await prisma.product.create({
    data: {
      name: 'Demo Oil Filter',
      brand: 'DemoBrand',
      size: '1 EA',
    }
  });
  console.log(`- Created Product: ${oil.name}`);
  console.log(`- Created Product: ${filter.name}\n`);

  // 3. Create a Bundle SKU for Shopee (4 Oils + 1 Filter)
  console.log("🛍️ Creating Shopee Bundle SKU...");
  const shopeeBundle = await prisma.sku.create({
    data: {
      platform: 'SHOPEE',
      skuCode: 'BUNDLE-OIL4-FILTER1',
      items: {
        create: [
          { productId: oil.id, quantity: 4 },
          { productId: filter.id, quantity: 1 }
        ]
      }
    },
    include: { items: { include: { product: true } } }
  });
  console.log(`- Created Shopee SKU: ${shopeeBundle.skuCode}`);

  // 4. Create a Single SKU for TikTok (1 Oil)
  console.log("📱 Creating TikTok Single SKU...");
  const tiktokSingle = await prisma.sku.create({
    data: {
      platform: 'TIKTOK',
      skuCode: 'OIL-1L-SINGLE',
      items: {
        create: [
          { productId: oil.id, quantity: 1 }
        ]
      }
    },
    include: { items: { include: { product: true } } }
  });
  console.log(`- Created TikTok SKU: ${tiktokSingle.skuCode}\n`);

  // 5. Query and Display Results
  console.log("✅ Demonstration Results (How the system sees it):\n");

  const allSkus = await prisma.sku.findMany({
    include: {
      items: {
        include: {
          product: { select: { name: true } }
        }
      }
    }
  });

  console.log(JSON.stringify(allSkus, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    // nothing needed
  });
