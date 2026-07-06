'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { processScannedBarcode, saveSkuMapping } from '@/app/actions/scanner'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function ScannerClient() {
  const [barcode, setBarcode] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'MAPPING' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');
  
  // Mapping state
  const [mappingData, setMappingData] = useState<{ platform: string, skuCode: string, orderId: string } | null>(null);
  const [scannedItems, setScannedItems] = useState<Record<string, number>>({});
  
  // Camera State
  const [useCamera, setUseCamera] = useState(false);
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus for physical scanner
  useEffect(() => {
    if (!useCamera && status !== 'LOADING') {
      inputRef.current?.focus();
    }
  }, [status, useCamera]);

  // Camera Scanner Initialization
  useEffect(() => {
    if (!useCamera) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 150 }, rememberLastUsedCamera: true },
      false
    );

    scanner.render(
      (decodedText) => {
        const now = Date.now();
        // Debounce: prevent same barcode within 3 seconds, or any barcode within 1.5 seconds
        if (now - lastScannedTimeRef.current < 1500) return;
        if (decodedText === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 3000) return;
        
        lastScannedCodeRef.current = decodedText;
        lastScannedTimeRef.current = now;
        
        // Play beep sound (optional, mostly visual feedback is enough)
        handleBarcodeScanned(decodedText);
      },
      (error) => {
        // Ignored, as it constantly emits errors when no code is found
      }
    );

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [useCamera, status]); // Need status as dependency? No, but handleBarcodeScanned uses state. Wait, if handleBarcodeScanned is called inside render, it captures stale state!

  // We must use a ref for status to avoid stale closures in the scanner callback
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  const handleBarcodeScanned = async (code: string) => {
    const currentStatus = statusRef.current;
    if (currentStatus === 'LOADING') return;

    if (currentStatus === 'IDLE' || currentStatus === 'SUCCESS' || currentStatus === 'ERROR') {
      setStatus('LOADING');
      setMessage(`กำลังตรวจสอบรหัส:\n${code}`);
      
      const res = await processScannedBarcode(code);
      
      if (res.error) {
        setStatus('ERROR');
        setMessage(res.error);
      } else if (res.action === 'REQUIRE_MAPPING') {
        setStatus('MAPPING');
        setMappingData({
          platform: res.platform,
          skuCode: res.unknownSkus[0],
          orderId: res.orderId
        });
        setScannedItems({});
        setMessage(`📦 พบ SKU ใหม่ที่ไม่รู้จักในระบบ!\n\nSKU: ${res.unknownSkus[0]}\n\nให้พนักงานนำสินค้าจริงที่จะจับคู่กับ SKU นี้\nมายิงบาร์โค้ดสแกนทีละชิ้นเข้าเครื่องได้เลยครับ`);
      } else {
        setStatus('SUCCESS');
        setMessage(res.message || 'สำเร็จ!');
      }
    } else if (currentStatus === 'MAPPING') {
      setScannedItems(prev => ({
        ...prev,
        [code]: (prev[code] || 0) + 1
      }));
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    const code = barcode.trim();
    setBarcode('');
    handleBarcodeScanned(code);
  };

  const handleSaveMapping = async () => {
    if (!mappingData || Object.keys(scannedItems).length === 0) return;
    
    setStatus('LOADING');
    const res = await saveSkuMapping(mappingData.platform, mappingData.skuCode, scannedItems);
    
    if (res.error) {
      setStatus('ERROR');
      setMessage(res.error);
    } else {
      setStatus('SUCCESS');
      setMessage(`✅ จับคู่ ${mappingData.skuCode} สำเร็จ!\n\nกรุณาสแกน Tracking No. ใบปะหน้าเดิมอีกครั้ง\nเพื่อทำการตัดสต๊อก`);
    }
  };

  const resetScanner = () => {
    setStatus('IDLE');
    setMessage('');
    setMappingData(null);
    setScannedItems({});
    lastScannedCodeRef.current = '';
    if (!useCamera) inputRef.current?.focus();
  };

  return (
    <div 
      className="bg-[#18181b] border border-slate-800 rounded-2xl p-4 md:p-10 text-center min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden" 
      onClick={() => { if (!useCamera) inputRef.current?.focus(); }}
    >
      
      {/* Background Glow based on status */}
      <div className={`absolute inset-0 opacity-10 transition-colors duration-500 pointer-events-none ${
        status === 'SUCCESS' ? 'bg-green-500' :
        status === 'ERROR' ? 'bg-red-500' :
        status === 'MAPPING' ? 'bg-orange-500' :
        'bg-slate-500'
      }`} />

      {/* Camera Toggle Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setUseCamera(!useCamera)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors border ${
            useCamera 
              ? 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30' 
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          {useCamera ? '❌ ปิดกล้อง' : '📸 เปิดกล้องมือถือ'}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto mt-10 md:mt-0">
        
        {/* Camera Viewport */}
        {useCamera && (
          <div className="mb-6 w-full max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-slate-700 bg-black">
            <div id="qr-reader" className="w-full"></div>
          </div>
        )}

        {/* Status Icon (Hide if using camera to save space) */}
        {(!useCamera || status !== 'IDLE') && (
          <div className="text-6xl md:text-7xl mb-4 md:mb-6">
            {status === 'SUCCESS' ? '✅' :
             status === 'ERROR' ? '❌' :
             status === 'MAPPING' ? '📦' :
             status === 'LOADING' ? '⏳' : '📷'}
          </div>
        )}

        {/* Message */}
        <h2 className={`text-2xl md:text-3xl font-bold mb-4 ${
          status === 'SUCCESS' ? 'text-green-400' :
          status === 'ERROR' ? 'text-red-400' :
          status === 'MAPPING' ? 'text-orange-400' :
          'text-slate-200'
        }`}>
          {status === 'IDLE' ? 'พร้อมสแกน Tracking No.' : 
           status === 'MAPPING' ? 'โหมดสร้างการจับคู่แบบเซต' :
           status === 'SUCCESS' ? 'เสร็จสิ้น!' :
           status === 'ERROR' ? 'ข้อผิดพลาด!' : 'กำลังประมวลผล...'}
        </h2>
        
        {message && (
          <div className="text-slate-300 mb-6 md:mb-8 whitespace-pre-line text-base md:text-lg bg-[#09090b] p-4 md:p-6 rounded-2xl border border-slate-800 shadow-inner break-words">
            {message}
          </div>
        )}

        {/* Mapping Mode UI */}
        {status === 'MAPPING' && (
          <div className="bg-[#09090b] border border-slate-800 rounded-2xl p-4 md:p-6 mb-6 text-left shadow-lg">
            <h3 className="text-orange-400 font-semibold mb-4 border-b border-slate-800 pb-3 flex justify-between items-center text-sm md:text-base">
              <span>รายการที่สแกนเข้าเซตแล้ว:</span>
              <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-1 rounded-lg">กำลังรอรับค่าสแกน...</span>
            </h3>
            {Object.entries(scannedItems).length === 0 ? (
              <p className="text-slate-500 text-center py-6 text-sm">ยังไม่มีสินค้าในเซต<br/>(สแกนบาร์โค้ดบนขวดได้เลย)</p>
            ) : (
              <ul className="space-y-3">
                {Object.entries(scannedItems).map(([code, qty]) => (
                  <li key={code} className="flex justify-between items-center text-slate-200 bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700">
                    <span className="font-mono text-sm">{code}</span>
                    <span className="bg-orange-500 text-white px-3 py-1 rounded-lg font-bold">x {qty}</span>
                  </li>
                ))}
              </ul>
            )}
            
            <div className="mt-6 flex gap-3">
              <button onClick={resetScanner} className="flex-1 py-3 rounded-xl text-slate-400 bg-slate-900 border border-slate-700 hover:bg-slate-800 font-medium transition-colors text-sm md:text-base">ยกเลิก</button>
              <button onClick={handleSaveMapping} disabled={Object.keys(scannedItems).length === 0} className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-lg shadow-orange-500/20 text-sm md:text-base">บันทึกการจับคู่</button>
            </div>
          </div>
        )}

        {/* Hidden Input for Scanner (Only if not using camera) */}
        {!useCamera && (
          <form onSubmit={handleFormSubmit} className="opacity-0 absolute -z-10 h-0 w-0 overflow-hidden">
            <input 
              ref={inputRef}
              type="text" 
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              disabled={status === 'LOADING'}
              onBlur={() => {
                if (status !== 'LOADING' && !useCamera) setTimeout(() => inputRef.current?.focus(), 50);
              }}
            />
          </form>
        )}

        {/* Helper Actions */}
        {(status === 'ERROR' || status === 'SUCCESS') && (
          <button 
            onClick={resetScanner}
            className="w-full md:w-auto px-8 py-3 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors font-semibold text-lg border border-slate-700"
          >
            เตรียมสแกนรายการต่อไป
          </button>
        )}

      </div>
    </div>
  )
}
