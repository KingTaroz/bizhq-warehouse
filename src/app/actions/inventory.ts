'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// Helper to find location
async function getMainLocation() {
  let location = await prisma.location.findFirst({ where: { type: 'MAIN_WH' } });
  if (!location) {
    location = await prisma.location.create({ data: { name: 'Main Warehouse', type: 'MAIN_WH' }});
  }
  return location;
}

// Find product by barcode
async function getProductByBarcode(code: string) {
  const barcodeRecord = await prisma.barcode.findUnique({
    where: { code },
    include: { product: true }
  });
  return barcodeRecord;
}

export async function processInbound(barcode: string, quantity: number, reference: string = '') {
  if (quantity <= 0) return { error: 'จำนวนต้องมากกว่า 0' };
  
  const barcodeRecord = await getProductByBarcode(barcode);
  if (!barcodeRecord) return { error: `ไม่พบบาร์โค้ดในระบบ: ${barcode}` };

  const actualQuantity = quantity * barcodeRecord.multiplier;
  const location = await getMainLocation();

  const transaction = await prisma.transaction.create({
    data: {
      type: 'INBOUND',
      reference: reference || `IN-${Date.now()}`,
      notes: 'รับสินค้าเข้าสต๊อก'
    }
  });

  await prisma.transactionItem.create({
    data: {
      transactionId: transaction.id,
      productId: barcodeRecord.productId,
      locationId: location.id,
      quantity: actualQuantity
    }
  });

  await prisma.inventory.upsert({
    where: {
      productId_locationId: { productId: barcodeRecord.productId, locationId: location.id }
    },
    update: {
      quantity: { increment: actualQuantity }
    },
    create: {
      productId: barcodeRecord.productId,
      locationId: location.id,
      quantity: actualQuantity
    }
  });

  revalidatePath('/inbound');
  revalidatePath('/');
  revalidatePath('/products');

  return { success: true, productName: barcodeRecord.product.name, added: actualQuantity };
}

export async function processDefect(barcode: string, quantity: number, notes: string = '') {
  if (quantity <= 0) return { error: 'จำนวนต้องมากกว่า 0' };
  
  const barcodeRecord = await getProductByBarcode(barcode);
  if (!barcodeRecord) return { error: `ไม่พบบาร์โค้ดในระบบ: ${barcode}` };

  const actualQuantity = quantity * barcodeRecord.multiplier;
  const location = await getMainLocation();

  // Create transaction (DEFECT)
  const transaction = await prisma.transaction.create({
    data: {
      type: 'DEFECT',
      reference: `DEF-${Date.now()}`,
      notes: notes || 'สินค้าชำรุด/เสียหาย'
    }
  });

  await prisma.transactionItem.create({
    data: {
      transactionId: transaction.id,
      productId: barcodeRecord.productId,
      locationId: location.id,
      quantity: actualQuantity // stored as positive in transactionItem
    }
  });

  // Reduce inventory
  await prisma.inventory.upsert({
    where: {
      productId_locationId: { productId: barcodeRecord.productId, locationId: location.id }
    },
    update: {
      quantity: { decrement: actualQuantity }
    },
    create: {
      productId: barcodeRecord.productId,
      locationId: location.id,
      quantity: -actualQuantity // If it wasn't tracked before, it's now negative
    }
  });

  revalidatePath('/defect');
  revalidatePath('/');
  revalidatePath('/products');

  return { success: true, productName: barcodeRecord.product.name, deducted: actualQuantity };
}
