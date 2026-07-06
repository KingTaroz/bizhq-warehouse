import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testOCR(filePath) {
  console.log(`\n\n=== Testing file: ${filePath} ===`);
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  const mimeType = 'application/pdf';

  try {
    const response = await ai.models.generateContent({
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
    
    let extractedData = JSON.parse(response.text);
    
    if (extractedData.vatExclusive && extractedData.vatRate) {
      console.log(`\n[VAT APPLIED] Document is VAT Exclusive (${extractedData.vatRate}%). Prices will be adjusted.`);
      const vatMultiplier = 1 + (extractedData.vatRate / 100);
      if (extractedData.items && Array.isArray(extractedData.items)) {
        extractedData.items.forEach(item => {
          if (item.unitPrice) {
            item.originalUnitPrice = item.unitPrice; // Just to show in test output
            item.unitPrice = Math.round((item.unitPrice * vatMultiplier) * 100) / 100;
          }
        });
      }
    }
    
    console.log("RESPONSE:");
    console.log(JSON.stringify(extractedData, null, 2));
  } catch (error) {
    console.error("ERROR:", error);
  }
}

async function main() {
  const testDir = 'C:\\Users\\taro\\inventory-system\\DOC PDF Test';
  const files = fs.readdirSync(testDir);
  for (const file of files) {
    if (file.endsWith('.pdf')) {
      await testOCR(path.join(testDir, file));
    }
  }
}

main();
