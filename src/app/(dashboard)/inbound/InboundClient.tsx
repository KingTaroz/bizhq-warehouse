'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { processInbound } from '@/app/actions/inventory'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function InboundClient() {
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reference, setReference] = useState('');
  
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');
  
  const [useCamera, setUseCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');

  useEffect(() => {
    if (!useCamera && status !== 'LOADING') {
      inputRef.current?.focus();
    }
  }, [status, useCamera]);

  useEffect(() => {
    if (!useCamera) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader-inbound",
      { fps: 10, qrbox: { width: 250, height: 150 }, rememberLastUsedCamera: true },
      false
    );

    scanner.render(
      (decodedText) => {
        const now = Date.now();
        if (now - lastScannedTimeRef.current < 1500) return;
        if (decodedText === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 3000) return;
        
        lastScannedCodeRef.current = decodedText;
        lastScannedTimeRef.current = now;
        
        setBarcode(decodedText);
        // Automatically submit if quantity is already set, or just let user click submit?
        // For inbound, user might want to scan, then type quantity.
        // Let's just set the barcode and let user type quantity.
      },
      (error) => {}
    );

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [useCamera]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || quantity <= 0) return;

    setStatus('LOADING');
    setMessage('กำลังบันทึกรับเข้า...');

    const res = await processInbound(barcode.trim(), quantity, reference.trim());

    if (res.error) {
      setStatus('ERROR');
      setMessage(res.error);
    } else {
      setStatus('SUCCESS');
      setMessage(`✅ เพิ่ม ${res.productName} จำนวน ${res.added} ชิ้น เข้าสต๊อกเรียบร้อยแล้ว!`);
      // Reset form
      setBarcode('');
      setQuantity(1);
    }
  };

  const resetForm = () => {
    setStatus('IDLE');
    setMessage('');
    setBarcode('');
    setQuantity(1);
    if (!useCamera) inputRef.current?.focus();
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 text-center min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setUseCamera(!useCamera)}
          type="button"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors border text-sm ${
            useCamera 
              ? 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30' 
              : 'bg-muted text-foreground border-border hover:bg-muted'
          }`}
        >
          {useCamera ? '❌ ปิดกล้อง' : '📸 เปิดกล้องมือถือ'}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto mt-8 md:mt-0">
        {useCamera && (
          <div className="mb-6 w-full mx-auto overflow-hidden rounded-2xl border-2 border-border bg-black">
            <div id="qr-reader-inbound" className="w-full"></div>
          </div>
        )}

        {status === 'SUCCESS' || status === 'ERROR' ? (
          <div className="py-8">
            <div className="text-6xl mb-4">{status === 'SUCCESS' ? '✅' : '❌'}</div>
            <h2 className={`text-2xl font-bold mb-4 ${status === 'SUCCESS' ? 'text-green-400' : 'text-red-500'}`}>
              {status === 'SUCCESS' ? 'รับเข้าสำเร็จ!' : 'เกิดข้อผิดพลาด!'}
            </h2>
            <div className="text-foreground mb-8 whitespace-pre-line text-lg bg-background p-4 rounded-xl border border-border">
              {message}
            </div>
            <button onClick={resetForm} className="px-8 py-3 rounded-xl bg-muted text-foreground hover:bg-muted font-semibold border border-border w-full">
              ทำรายการต่อไป
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="text-left space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">รหัสบาร์โค้ด (สแกนหรือพิมพ์)</label>
              <input 
                ref={inputRef}
                type="text" 
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                required
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                placeholder="คลิกที่นี่แล้วสแกนบาร์โค้ด"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">จำนวนที่รับเข้า</label>
                <input 
                  type="number" 
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  required
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">เลขที่อ้างอิง (ถ้ามี)</label>
                <input 
                  type="text" 
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="เช่น PO-12345"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={status === 'LOADING'}
              className="w-full py-4 mt-6 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-lg shadow-orange-500/20 text-lg flex items-center justify-center gap-2"
            >
              {status === 'LOADING' ? 'กำลังบันทึก...' : '📦 บันทึกรับเข้าสต๊อก'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
