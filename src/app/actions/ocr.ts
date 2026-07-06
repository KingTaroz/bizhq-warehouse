'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { GoogleGenAI, Type } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper to get main location
async function getMainLocation() {
  let location = await prisma.location.findFirst({ where: { type: 'MAIN_WH' } });
  if (!location) {
    location = await prisma.location.create({ data: { name: 'Main Warehouse', type: 'MAIN_WH' }});
  }
  return location;
}

export async function searchProductsForMapping(query: string) {
  if (!query) return [];
  return await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { brand: { contains: query } },
        { barcodes: { some: { code: { contains: query } } } }
      ]
    },
    take: 10,
    include: { barcodes: true }
  });
}

export async function saveSupplierMapping(supplierName: string, supplierCode: string, productId: string, multiplier: number) {
  try {
    await prisma.supplierMapping.upsert({
      where: {
        supplierName_supplierCode: {
          supplierName,
          supplierCode
        }
      },
      update: {
        productId,
        multiplier
      },
      create: {
        supplierName,
        supplierCode,
        productId,
        multiplier
      }
    });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteSupplierMapping(supplierName: string, supplierCode: string) {
  try {
    await prisma.supplierMapping.delete({
      where: {
        supplierName_supplierCode: {
          supplierName,
          supplierCode
        }
      }
    });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function processOCRInbound(documentNo: string, arg2: any, arg3?: any, saveBarcodes: boolean = false) {
  try {
    let documentDate: string | null = null;
    let items: any[] = [];
    
    if (Array.isArray(arg2)) {
      items = arg2;
      if (typeof arg3 === 'boolean') {
        saveBarcodes = arg3;
      }
    } else {
      documentDate = arg2;
      items = arg3 || [];
    }

    const location = await getMainLocation();

    let parsedDate: Date | null = null;
    if (documentDate) {
      const d = new Date(documentDate);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        type: 'INBOUND',
        reference: documentNo || `IN-OCR-${Date.now()}`,
        notes: 'รับเข้าผ่านระบบ AI OCR',
        documentDate: parsedDate
      }
    });

    for (const item of items) {
      const actualQuantity = item.quantity * item.multiplier;
      
      if (actualQuantity <= 0) continue;

      const unitCostPrice = Number(item.unitCostPrice) || 0;

      await prisma.transactionItem.create({
        data: {
          transactionId: transaction.id,
          productId: item.productId,
          locationId: location.id,
          quantity: actualQuantity,
          costPrice: unitCostPrice
        }
      });

      const inv = await prisma.inventory.findUnique({
        where: { productId_locationId: { productId: item.productId, locationId: location.id } }
      });
      const currentQty = inv ? inv.quantity : 0;

      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      const currentAvgCost = product?.currentAvgCost || 0;

      let newAvgCost = currentAvgCost;
      if (unitCostPrice >= 0) {
        const totalCurrentValue = Math.max(0, currentQty) * currentAvgCost;
        const totalNewValue = actualQuantity * unitCostPrice;
        const totalQty = Math.max(0, currentQty) + actualQuantity;
        if (totalQty > 0) {
          newAvgCost = (totalCurrentValue + totalNewValue) / totalQty;
        }
      }

      if (Math.abs(newAvgCost - currentAvgCost) > 0.001) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { currentAvgCost: newAvgCost }
        });
      }

      await prisma.inventory.upsert({
        where: {
          productId_locationId: { productId: item.productId, locationId: location.id }
        },
        update: {
          quantity: { increment: actualQuantity }
        },
        create: {
          productId: item.productId,
          locationId: location.id,
          quantity: actualQuantity
        }
      });

      if (saveBarcodes && item.code && item.code !== 'UNKNOWN') {
        const existingBarcode = await prisma.barcode.findUnique({ where: { code: item.code } });
        if (!existingBarcode) {
          await prisma.barcode.create({
            data: {
              code: item.code,
              productId: item.productId,
              type: item.multiplier > 1 ? 'CARTON' : 'BOTTLE',
              multiplier: item.multiplier
            }
          });
        }
      }
    }

    revalidatePath('/inbound');
    revalidatePath('/products');
    revalidatePath('/');
    
    return { success: true, count: items.length };
  } catch (error: any) {
    console.error("processOCRInbound ERROR:", error);
    return { error: error.message };
  }
}

// -------------------------------------------------------------
// MOCK OCR API (Since we don't have real API keys setup yet)
// This simulates sending the image to an AI and getting a parsed JSON back.
// -------------------------------------------------------------
export async function extractInvoiceData(base64Image: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing. Please add it to your .env file.");
  }

  let mimeType = 'image/jpeg';
  let base64Data = base64Image;

  if (base64Image.startsWith('data:')) {
    const parts = base64Image.split(',');
    if (parts.length === 2) {
      mimeType = parts[0].split(':')[1].split(';')[0];
      base64Data = parts[1];
    }
  }

  let response;
  let retries = 3;
  let delay = 2000; // 2 seconds

  while (retries > 0) {
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Extract data from this invoice or delivery note. Return a JSON object with:
- 'documentNo': string
- 'date': ISO string (YYYY-MM-DD)
- 'supplierName': string
- 'vatRate': number (e.g. 7 for 7% VAT, 0 if no VAT is mentioned)
- 'vatExclusive': boolean (true if VAT is added to the total at the bottom of the invoice, false if item prices already include VAT or there is no VAT)
- 'items': array of objects
For each item include:
- 'code': product code or barcode (leave blank if none)
- 'name': product name
- 'unitStr': the unit written on the invoice (e.g. ลัง, ขวด, ชิ้น, PCS)
- 'quantity': total quantity as written
- 'unitPrice': price per unit as written
- 'multiplier': integer. If the invoice quantity represents cartons/boxes, set this to pieces per carton (e.g., 24). If the quantity is already in individual pieces/bottles (verify by unitPrice * quantity = amount), set multiplier to 1.
If the document is a receipt without product details, return an empty items array.`
              },
              {
                inlineData: {
                  data: base64Data,
                  mimeType
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
        }
      });
      break; // Success, exit retry loop
    } catch (e: any) {
      console.error("Gemini API Error:", e.message || e);
      if (e.message?.includes('503') || e.message?.includes('429') || e.message?.includes('high demand') || retries === 1) {
        if (retries === 1) throw new Error("ระบบ AI คิวเต็มชั่วคราว กรุณารอสักครู่แล้วลองใหม่อีกครั้งครับ (503 High Demand)");
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        retries--;
      } else {
        throw e; // Non-retryable error
      }
    }
  }

  if (!response) {
    throw new Error("Failed to get response from AI after retries.");
  }

  const responseText = response.text;
  let extractedData: any;
  try {
    extractedData = JSON.parse(responseText || "{}");
  } catch (e) {
    throw new Error("Failed to parse AI response as JSON.");
  }

  // Adjust prices if VAT is exclusive
  if (extractedData.vatExclusive && extractedData.vatRate) {
    const vatMultiplier = 1 + (extractedData.vatRate / 100);
    if (extractedData.items && Array.isArray(extractedData.items)) {
      extractedData.items.forEach((item: any) => {
        if (item.unitPrice) {
          // Calculate and round to 2 decimal places
          item.unitPrice = Math.round((item.unitPrice * vatMultiplier) * 100) / 100;
        }
      });
    }
  }

  // Now, we need to check our database to see if we already know these codes!
  // We check BOTH the primary Barcode table AND the SupplierMapping table.
  
  const processedItems = await Promise.all((extractedData.items || []).map(async (item: any) => {
    // 1. Check native Barcodes first
    const nativeBarcode = await prisma.barcode.findUnique({
      where: { code: item.code },
      include: { product: true }
    });

    if (nativeBarcode) {
      return { ...item, status: 'MATCHED', productId: nativeBarcode.productId, productName: nativeBarcode.product.name, currentAvgCost: nativeBarcode.product.currentAvgCost };
    }

    // 2. Check Supplier Mappings
    const mapping = await prisma.supplierMapping.findUnique({
      where: {
        supplierName_supplierCode: {
          supplierName: extractedData.supplierName,
          supplierCode: item.code
        }
      },
      include: { product: true }
    });

    if (mapping) {
      return { ...item, status: 'MATCHED', productId: mapping.productId, productName: mapping.product.name, multiplier: mapping.multiplier, currentAvgCost: mapping.product.currentAvgCost };
    }

    // 3. Unknown! (Needs human mapping)
    return { ...item, status: 'UNKNOWN', productId: null, productName: null, currentAvgCost: 0 };
  }));

  return {
    ...extractedData,
    items: processedItems
  };
}
