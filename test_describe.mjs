import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function describePDF() {
  const filePath = 'C:\\Users\\taro\\inventory-system\\DOC PDF Test\\SRH-BC2680343.pdf';
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Extract the exact table of items from this document as a markdown table. Include all columns (qty, unit, price, etc)." },
            { inlineData: { data: base64Data, mimeType: 'application/pdf' } }
          ]
        }
      ]
    });
    console.log(response.text);
  } catch (e) {
    console.error(e);
  }
}

describePDF();
