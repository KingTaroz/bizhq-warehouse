'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { processDefect } from '@/app/actions/inventory'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function DefectClient() {
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  
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
      "qr-reader-defect",
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
    setMessage('กำลังบันทึกตัดสต๊อก...');

    const res = await processDefect(barcode.trim(), quantity, notes.trim());

    if (res.error) {
      setStatus('ERROR');
      setMessage(res.error);
    } else {
      setStatus('SUCCESS');
      setMessage(`✅ ตัดสต๊อก ${res.productName} จำนวน ${res.deducted} ชิ้น (ของเสีย) เรียบร้อยแล้ว!`);
      // Reset form
      setBarcode('');
      setQuantity(1);
      setNotes('');
    }
  };

  const resetForm = () => {
    setStatus('IDLE');
    setMessage('');
    setBarcode('');
    setQuantity(1);
    setNotes('');
    if (!useCamera) inputRef.current?.focus();
  };

  return (
    <div className="bg-[#18181b] border border-red-900/30 rounded-2xl p-6 md:p-8 text-center min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 transition-colors duration-500 pointer-events-none bg-red-500" />
      
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setUseCamera(!useCamera)}
          type="button"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors border text-sm ${
            useCamera 
              ? 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30' 
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          {useCamera ? '❌ ปิดกล้อง' : '📸 เปิดกล้องมือถือ'}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto mt-8 md:mt-0">
        {useCamera && (
          <div className="mb-6 w-full mx-auto overflow-hidden rounded-2xl border-2 border-red-900 bg-black">
            <div id="qr-reader-defect" className="w-full"></div>
          </div>
        )}

        {status === 'SUCCESS' || status === 'ERROR' ? (
          <div className="py-8">
            <div className="text-6xl mb-4">{status === 'SUCCESS' ? '✅' : '❌'}</div>
            <h2 className={`text-2xl font-bold mb-4 ${status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}`}>
              {status === 'SUCCESS' ? 'ตัดของเสียสำเร็จ!' : 'เกิดข้อผิดพลาด!'}
            </h2>
            <div className="text-slate-300 mb-8 whitespace-pre-line text-lg bg-[#09090b] p-4 rounded-xl border border-slate-800">
              {message}
            </div>
            <button onClick={resetForm} className="px-8 py-3 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-semibold border border-slate-700 w-full">
              ทำรายการต่อไป
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="text-left space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">รหัสบาร์โค้ดสินค้าที่ชำรุด (สแกนหรือพิมพ์)</label>
              <input 
                ref={inputRef}
                type="text" 
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                placeholder="คลิกที่นี่แล้วสแกนบาร์โค้ด"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">จำนวนที่เสีย</label>
                <input 
                  type="number" 
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  required
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-1">สาเหตุ (เช่น แตก, ซึม, ฉลากขาด)</label>
                <input 
                  type="text" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ระบุสาเหตุการชำรุด"
                  required
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={status === 'LOADING'}
              className="w-full py-4 mt-6 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-lg shadow-red-500/20 text-lg flex items-center justify-center gap-2"
            >
              {status === 'LOADING' ? 'กำลังบันทึก...' : '⚠️ ตัดสต๊อก (ของเสีย)'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
