// ต้องตรงกับ fallback ของ parseOrderExcel: ไฟล์ออเดอร์ร้านนี้ไม่มี Seller SKU
// ระบบจึงใช้ "ชื่อสินค้า (ชื่อตัวเลือก)" เป็น skuCode ทุกแพลตฟอร์ม
export function buildSkuCode(itemName: string, variationName?: string | null): string {
  let code = itemName.trim()
  if (variationName && variationName !== 'undefined' && variationName !== 'No Variation') {
    code += ` (${variationName.trim()})`
  }
  return code
}
