'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { buildSkuCode } from '@/lib/skucode'

// สร้าง/อัปเดต Sku mapping ให้ระบบตัดสต๊อกออเดอร์รู้จัก skuCode นี้
// รองรับหลายสินค้าต่อ 1 SKU (เซต)
async function upsertSkuMapping(platform: string, skuCode: string, items: { productId: string, quantity: number }[]) {
  const existing = await prisma.sku.findUnique({
    where: { platform_skuCode: { platform, skuCode } }
  })
  if (existing) {
    await prisma.skuItem.deleteMany({ where: { skuId: existing.id } })
    await prisma.skuItem.createMany({ data: items.map(i => ({ skuId: existing.id, ...i })) })
  } else {
    await prisma.sku.create({
      data: { platform, skuCode, items: { create: items } }
    })
  }
}

export async function matchPlatformProduct(id: string, productId: string, quantity: number) {
  if (!productId || quantity < 1) return { error: 'ข้อมูลไม่ครบ' }
  const pp = await prisma.platformProduct.findUnique({ where: { id } })
  if (!pp) return { error: 'ไม่พบรายการ' }

  await prisma.platformProduct.update({ where: { id }, data: { productId, quantity, isSet: false } })
  await upsertSkuMapping(pp.platform, buildSkuCode(pp.itemName, pp.variationName), [{ productId, quantity }])

  revalidatePath('/platform-products')
  return { success: true }
}

// จับคู่แบบเซต: 1 ตัวเลือกสินค้า = สินค้าจริงหลายตัว
// เช่น ชุดเปลี่ยนถ่าย Vespa = 7100 1L ×2 + เฟืองท้าย ×2 + ไส้กรอง ×1
export async function matchPlatformProductSet(id: string, items: { productId: string, quantity: number }[]) {
  const valid = items.filter(i => i.productId && i.quantity >= 1)
  if (valid.length === 0) return { error: 'กรุณาเพิ่มสินค้าในเซตอย่างน้อย 1 รายการ' }
  const pp = await prisma.platformProduct.findUnique({ where: { id } })
  if (!pp) return { error: 'ไม่พบรายการ' }

  await prisma.platformProduct.update({ where: { id }, data: { productId: null, quantity: 1, isSet: true } })
  await upsertSkuMapping(pp.platform, buildSkuCode(pp.itemName, pp.variationName), valid)

  revalidatePath('/platform-products')
  return { success: true, count: valid.length }
}

export async function unmatchPlatformProduct(id: string) {
  const pp = await prisma.platformProduct.findUnique({ where: { id } })
  if (!pp) return { error: 'ไม่พบรายการ' }

  await prisma.platformProduct.update({ where: { id }, data: { productId: null, quantity: 1, isSet: false } })
  const skuCode = buildSkuCode(pp.itemName, pp.variationName)
  await prisma.sku.deleteMany({ where: { platform: pp.platform, skuCode } })

  revalidatePath('/platform-products')
  return { success: true }
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/ลิตร/g, 'l')

// จับคู่อัตโนมัติแบบระวัง: จับเฉพาะเคสที่ชัวร์ (สินค้าเดียวที่ field ครบทุกตัวโผล่ในชื่อ)
// เคสกำกวม (เซตไส้กรอง, ยกลังไม่รู้จำนวน, เจอหลายตัว) ปล่อยให้จับคู่เอง
export async function autoMatchPlatformProducts(platform: string) {
  const pps = await prisma.platformProduct.findMany({ where: { platform, productId: null, isSet: false } })
  const products = await prisma.product.findMany({
    select: { id: true, brand: true, name: true, viscosity: true, size: true, qtyPerCarton: true }
  })

  let matched = 0
  for (const pp of pps) {
    // ของแถม/ของสมนาคุณ ไม่ใช่สินค้าขาย → ข้าม
    if (/ของสมนาคุณ|ของแถม/.test(pp.itemName)) continue

    // TikTok: 'Default' / '-, -' = ไม่มีตัวเลือกจริง, ตัด prefix "Flash Sale |"
    let variation = pp.variationName || ''
    if (variation === 'Default' || variation === '-, -') variation = ''
    variation = variation.replace(/Flash Sale\s*\|?/ig, '').trim()

    // ตัวเลือกหลายมิติคั่นด้วย comma — พิจารณาทีละท่อน:
    // ท่อน "ไม่รับ..." = ปฏิเสธของพ่วง ตัดทิ้งได้ (ห้ามใช้ยกเว้นทั้งประโยค — เคสชุด Vespa)
    const segments = variation.split(',').map(s => s.trim()).filter(s => s && s !== '-')
    const kept = segments.filter(s => !s.includes('ไม่รับ'))
    // ท่อนที่เป็นของพ่วง (ไทย/อังกฤษ) → เซต ให้จัดเซตเอง
    if (kept.some(s => /แถม|เฟืองท้าย|ไส้กรอง|gear\s*oil|หลอด/i.test(s))) continue
    if (kept.length > 1) {
      // หลายท่อนจะยอมเป็นสินค้าเดี่ยวได้ ต่อเมื่อทุกท่อนเป็นแค่คุณลักษณะ (ความหนืด/ขนาด)
      const attrLike = (s: string) => /^(sae\s*)?\d+w(-\d+)?$/i.test(s.trim()) || /^\d+(\.\d+)?\s*(ml|l|ลิตร)/i.test(s.trim())
      if (!kept.every(attrLike)) continue
    }
    variation = kept.join(' ')

    const nv = norm(variation)
    const text = norm(pp.itemName) + ' ' + nv

    // ตรวจจำนวนต่อหน่วยขาย — เลขในชื่อตัวเลือกสำคัญกว่าชื่อสินค้า
    // เช่น สินค้า "(ยกลังx6)" แต่ตัวเลือก "12กระป๋อง(ครึ่งลัง)" ต้องได้ 12
    let qty = 1
    const variationCount = variation.match(/(\d+)\s*(?:กระป๋อง|ขวด|กป|ชิ้น|แกลลอน|ถัง)/)
    const cartonMatch = text.match(/ยกลังx?(\d+)|ลังx(\d+)/)
    if (variationCount) {
      qty = parseInt(variationCount[1])
    } else if (cartonMatch) {
      qty = parseInt(cartonMatch[1] || cartonMatch[2])
    } else if (text.includes('ยกลัง') || /(^|[^ก-๙])ลัง([^ก-๙]|$)/.test(pp.itemName + variation)) {
      continue // มีคำว่าลังแต่ไม่รู้จำนวน → จับคู่เอง
    }

    // ขนาด/ความหนืดยึดจากตัวเลือกเป็นหลัก — ชื่อสินค้ามักใส่หลายค่า ("0.5ลิตร/1ลิตร", "10W/15W")
    const sizeInVari = nv.match(/(\d+(?:\.\d+)?)(?:\+\d+)?\s*(?:l|ml)\b/)
    const viscInVari = nv.match(/\d+w(-\d+)?|sae\d+/)
    // เทียบค่าตัวเลขต้องมีขอบเขต: "15w-40" ห้าม match "5w-40", "6+1l" ห้าม match "1l"
    const hasTok = (hay: string, tok: string) => {
      let i = hay.indexOf(tok)
      while (i !== -1) {
        const prev = hay[i - 1]
        if (!(prev >= '0' && prev <= '9') && prev !== '.' && prev !== '+') return true
        i = hay.indexOf(tok, i + 1)
      }
      return false
    }

    const candidates = products.filter(p => {
      if (!p.brand || !p.name) return false
      const base = [p.brand, p.name].filter(Boolean).map(f => norm(f as string))
      if (!base.every(f => text.includes(f))) return false
      // ความหนืด: ใช้ field ก่อน ถ้าว่างสกัดจากชื่อสินค้า (เช่น "Fork Oil 10W Medium")
      const nvi = p.viscosity
        ? norm(p.viscosity)
        : (norm(p.name).match(/\d+w(-\d+)?|sae\d+/)?.[0] ?? null)
      if (nvi) {
        if (viscInVari ? !hasTok(nv, nvi) : !hasTok(text, nvi)) return false
      }
      if (p.size) {
        const ns = norm(p.size)
        // ตัวเลือกระบุขนาด → ขนาดสินค้าต้องอยู่ในตัวเลือกเท่านั้น
        if (sizeInVari) return hasTok(nv, ns)
        return hasTok(text, ns)
      }
      return true
    })

    if (candidates.length === 1) {
      const p = candidates[0]
      await prisma.platformProduct.update({ where: { id: pp.id }, data: { productId: p.id, quantity: qty } })
      await upsertSkuMapping(platform, buildSkuCode(pp.itemName, pp.variationName), [{ productId: p.id, quantity: qty }])
      matched++
    }
  }

  revalidatePath('/platform-products')
  return { success: true, matched, remaining: pps.length - matched }
}
