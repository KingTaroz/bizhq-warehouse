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

  // Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      type: 'OUTBOUND',
      reference: order.orderId,
      notes: `Auto-Deduct: ${order.trackingNo || order.orderId}`
    }
  });

  // Deduct inventory
  for (const { item, skuRecord } of knownSkus) {
    const totalSetQuantity = item.quantity;
    for (const skuItem of skuRecord.items) {
      const deductQty = skuItem.quantity * totalSetQuantity;
      
      await prisma.transactionItem.create({
        data: {
          transactionId: transaction.id,
          productId: skuItem.productId,
          locationId: location.id,
          quantity: deductQty
        }
      });

      await prisma.inventory.upsert({
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

  // Mark order as packed
  await prisma.platformOrder.update({
    where: { id: order.id },
    data: { status: 'PACKED' }
  });

  revalidatePath('/scanner');
  revalidatePath('/orders');
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
