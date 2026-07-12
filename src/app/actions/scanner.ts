'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function processScannedBarcode(barcode: string) {
  // Find order by trackingNo or orderId
  const order = await prisma.platformOrder.findFirst({
    where: { 
      status: 'PENDING',
      OR: [
        { trackingNo: barcode },
        { orderId: barcode }
      ]
    },
    include: { items: true }
  });

  if (!order) {
    return { error: 'ไม่พบคำสั่งซื้อ หรือคำสั่งซื้อนี้ถูกแพ็ค/ตัดสต๊อกไปแล้ว' };
  }

  const unknownSkus: string[] = [];
  const knownSkus: any[] = [];

  for (const item of order.items) {
    const skuRecord = await prisma.sku.findUnique({
      where: {
        platform_skuCode: {
          platform: order.platform,
          skuCode: item.skuCode
        }
      },
      include: { items: true }
    });

    if (!skuRecord) {
      unknownSkus.push(item.skuCode);
    } else {
      knownSkus.push({ item, skuRecord });
    }
  }

  if (unknownSkus.length > 0) {
    return { 
      action: 'REQUIRE_MAPPING', 
      orderId: order.id, 
      platform: order.platform,
      unknownSkus 
    };
  }

  // Ensure location exists
  let location = await prisma.location.findFirst({ where: { type: 'MAIN_WH' } });
  if (!location) {
    location = await prisma.location.create({ data: { name: 'Main Warehouse', type: 'MAIN_WH' }});
  }

  // Deduct all items + mark packed atomically so a mid-loop failure
  // can't leave inventory half-deducted
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        type: 'OUTBOUND',
        reference: order.orderId,
        notes: `Auto-Deduct: ${order.trackingNo || order.orderId}`
      }
    });

    for (const { item, skuRecord } of knownSkus) {
      const totalSetQuantity = item.quantity;
      for (const skuItem of skuRecord.items) {
        const deductQty = skuItem.quantity * totalSetQuantity;

        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: skuItem.productId,
            locationId: location.id,
            quantity: deductQty
          }
        });

        await tx.inventory.upsert({
          where: {
            productId_locationId: { productId: skuItem.productId, locationId: location.id }
          },
          update: {
            quantity: { decrement: deductQty }
          },
          create: {
            productId: skuItem.productId,
            locationId: location.id,
            quantity: -deductQty
          }
        });
      }
    }

    await tx.platformOrder.update({
      where: { id: order.id },
      data: { status: 'PACKED' }
    });
  });

  revalidatePath('/scanner');
  revalidatePath('/outbound/orders');
  revalidatePath('/products');

  return { success: true, message: `ตัดสต๊อกออเดอร์ ${order.orderId} สำเร็จ!` };
}

export async function saveSkuMapping(platform: string, skuCode: string, barcodeCounts: Record<string, number>) {
  const itemsToCreate: { productId: string; quantity: number }[] = [];
  
  for (const [code, quantity] of Object.entries(barcodeCounts)) {
    const barcodeRecord = await prisma.barcode.findUnique({ where: { code } });
    if (!barcodeRecord) return { error: `ไม่พบบาร์โค้ดในระบบ: ${code}` };
    
    const baseQty = quantity * barcodeRecord.multiplier;
    
    const existing = itemsToCreate.find(i => i.productId === barcodeRecord.productId);
    if (existing) {
      existing.quantity += baseQty;
    } else {
      itemsToCreate.push({ productId: barcodeRecord.productId, quantity: baseQty });
    }
  }

  if (itemsToCreate.length === 0) {
    return { error: 'กรุณาสแกนสินค้าอย่างน้อย 1 ชิ้น' };
  }

  await prisma.sku.create({
    data: {
      platform,
      skuCode,
      items: {
        create: itemsToCreate
      }
    }
  });

  return { success: true };
}

export async function processProductBarcode(barcode: string) {
  const barcodeRecord = await prisma.barcode.findUnique({
    where: { code: barcode },
    include: { product: true }
  });

  if (!barcodeRecord) {
    return { action: 'REQUIRE_PRODUCT_MAPPING' };
  }

  return {
    action: 'KNOWN_PRODUCT',
    barcode: barcodeRecord,
    product: barcodeRecord.product
  };
}

export async function saveProductMappingAndCount(
  barcode: string,
  data: {
    productId?: string;
    brand: string;
    name: string;
    viscosity: string;
    size: string;
    qtyPerCarton: number;
    currentAvgCost: number;
    packaging: string;
    receiveQty: number;
  }
) {
  let location = await prisma.location.findFirst({ where: { type: 'MAIN_WH' } });
  if (!location) {
    location = await prisma.location.create({ data: { name: 'Main Warehouse', type: 'MAIN_WH' }});
  }

  // 1. Check if barcode already exists
  const existingBarcode = await prisma.barcode.findUnique({
    where: { code: barcode },
    include: { product: true }
  });

  let product;
  
  if (existingBarcode) {
    // Known Product -> Update cost if changed
    product = await prisma.product.update({
      where: { id: existingBarcode.productId },
      data: {
        currentAvgCost: data.currentAvgCost
      }
    });
  } else if (data.productId) {
    // Bind to existing Product
    product = await prisma.product.update({
      where: { id: data.productId },
      data: {
        currentAvgCost: data.currentAvgCost
      }
    });
    // Create new Barcode for this existing product
    await prisma.barcode.create({
      data: {
        productId: product.id,
        code: barcode,
        type: data.packaging,
        multiplier: data.packaging === 'CARTON' ? data.qtyPerCarton : 1
      }
    });
  } else {
    // New Product
    product = await prisma.product.create({
      data: {
        brand: data.brand,
        name: data.name,
        viscosity: data.viscosity,
        size: data.size,
        qtyPerCarton: data.packaging === 'CARTON' ? data.qtyPerCarton : 1,
        currentAvgCost: data.currentAvgCost,
        barcodes: {
          create: {
            code: barcode,
            type: data.packaging,
            multiplier: data.packaging === 'CARTON' ? data.qtyPerCarton : 1
          }
        }
      }
    });
  }

  // Log CostPriceHistory always on receive
  await prisma.costPriceHistory.create({
    data: {
      productId: product.id,
      costPrice: data.currentAvgCost
    }
  });

  const transaction = await prisma.transaction.create({
    data: {
      type: 'INBOUND',
      notes: `Inbound via Scanner: ${barcode}`
    }
  });

  // Calculate total pieces to add
  const multiplier = data.packaging === 'CARTON' ? data.qtyPerCarton : 1;
  const qtyToAdd = data.receiveQty * multiplier;

  await prisma.transactionItem.create({
    data: {
      transactionId: transaction.id,
      productId: product.id,
      locationId: location.id,
      quantity: qtyToAdd,
      costPrice: data.currentAvgCost
    }
  });

  await prisma.inventory.upsert({
    where: {
      productId_locationId: { productId: product.id, locationId: location.id }
    },
    update: {
      quantity: { increment: qtyToAdd }
    },
    create: {
      productId: product.id,
      locationId: location.id,
      quantity: qtyToAdd 
    }
  });

  revalidatePath('/scanner');
  revalidatePath('/products');

  return { success: true, message: `✅ นำเข้าสต๊อก ${qtyToAdd} ชิ้นสำเร็จ!` };
}

// countStockByBarcode is removed since we unified it into saveProductMappingAndCount

export async function getProductsForMapping() {
  return await prisma.product.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      brand: true,
      name: true,
      model: true,
      viscosity: true,
      size: true,
      qtyPerCarton: true,
      currentAvgCost: true
    }
  });
}
