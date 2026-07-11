'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { processScannedBarcode, saveSkuMapping, processProductBarcode, saveProductMappingAndCount } from '@/app/actions/scanner'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraIcon, Smartphone, X, Box, CheckCircle2, XCircle, Loader2, PackagePlus, PackageMinus } from 'lucide-react'
import InboundForm from './InboundForm'

export default function ScannerClient() {
  const [mode, setMode] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');
  const [barcode, setBarcode] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'MAPPING' | 'PRODUCT_MAPPING' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');
  
  // Mapping state
  const [mappingData, setMappingData] = useState<{ platform: string, skuCode: string, orderId: string } | null>(null);
  const [productInitialData, setProductInitialData] = useState<any>(null);
  const [scannedItems, setScannedItems] = useState<Record<string, number>>({});
  
  // Camera State
  const [cameraMode, setCameraMode] = useState<'NONE' | 'ENVIRONMENT' | 'USER'>('NONE');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus for physical scanner
  useEffect(() => {
    if (cameraMode === 'NONE' && status !== 'LOADING') {
      inputRef.current?.focus();
    }
  }, [status, cameraMode]);

  const statusRef = useRef(status);
  const modeRef = useRef(mode);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const handleBarcodeScanned = async (code: string) => {
    const currentStatus = statusRef.current;
    const currentMode = modeRef.current;
    if (currentStatus === 'LOADING') return;

    if (currentStatus === 'IDLE' || currentStatus === 'SUCCESS' || currentStatus === 'ERROR') {
      setStatus('LOADING');
      setMessage(`กำลังตรวจสอบรหัส:\n${code}`);
      
      if (currentMode === 'OUTBOUND') {
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
      } else if (currentMode === 'INBOUND') {
        const res = await processProductBarcode(code);
        
        if (res.action === 'REQUIRE_PRODUCT_MAPPING') {
          setProductInitialData(null);
          setStatus('PRODUCT_MAPPING');
          setMessage(''); 
        } else if (res.action === 'KNOWN_PRODUCT') {
          setProductInitialData(res.product);
          setStatus('PRODUCT_MAPPING');
          setMessage(''); 
        }
      }
    } else if (currentStatus === 'MAPPING') {
      setScannedItems(prev => ({
        ...prev,
        [code]: (prev[code] || 0) + 1
      }));
    }
  };

  // Camera Scanner Initialization
  useEffect(() => {
    if (cameraMode === 'NONE') {
      if (html5QrCodeRef.current) {
        // Only stop if currently scanning
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current?.clear();
          }).catch(err => console.error(err));
        } else {
          html5QrCodeRef.current.clear();
        }
      }
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      try {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        }
        
        const qrCode = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = qrCode;

        await qrCode.start(
          { 
            facingMode: cameraMode === 'ENVIRONMENT' ? "environment" : "user",
            advanced: [{ focusMode: "continuous" }] as any
          },
          { 
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            const now = Date.now();
            if (now - lastScannedTimeRef.current < 1500) return;
            if (decodedText === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 3000) return;
            
            lastScannedCodeRef.current = decodedText;
            lastScannedTimeRef.current = now;
            handleBarcodeScanned(decodedText);
          },
          () => {} // Ignore spammy errors
        );
      } catch (err) {
        console.error("Camera start error", err);
        if (isMounted) {
          setMessage("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้อง");
          setStatus('ERROR');
          setCameraMode('NONE');
        }
      }
    };

    // Need slight delay so DOM element #qr-reader is ready
    setTimeout(() => {
      if (isMounted) startCamera();
    }, 100);

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, [cameraMode]);

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
    if (cameraMode === 'NONE') inputRef.current?.focus();
  };

  return (
    <div className="space-y-6">
      {/* Mode Tabs */}
      <div className="flex bg-muted/50 p-1.5 rounded-2xl border border-border w-full max-w-lg mx-auto relative z-10 shadow-sm">
        <button
          onClick={() => { setMode('INBOUND'); resetScanner(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-sm md:text-base ${
            mode === 'INBOUND' ? 'bg-background shadow-md text-primary border border-border' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <PackagePlus className="w-5 h-5" /> นับสต๊อก / รับเข้า
        </button>
        <button
          onClick={() => { setMode('OUTBOUND'); resetScanner(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-sm md:text-base ${
            mode === 'OUTBOUND' ? 'bg-background shadow-md text-orange-500 border border-border' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <PackageMinus className="w-5 h-5" /> ตัดสต๊อก (แพ็ค)
        </button>
      </div>

      <div 
        className="glass rounded-[2rem] p-4 md:p-10 text-center min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden shadow-lg border border-border/50" 
        onClick={() => { if (cameraMode === 'NONE' && status !== 'PRODUCT_MAPPING') inputRef.current?.focus(); }}
      >
        
        {/* Background Glow based on status */}
        <div className={`absolute inset-0 opacity-[0.15] transition-colors duration-500 pointer-events-none blur-3xl rounded-[2rem] ${
          status === 'SUCCESS' ? 'bg-green-500' :
          status === 'ERROR' ? 'bg-red-500' :
          (status === 'MAPPING' || status === 'PRODUCT_MAPPING') ? 'bg-orange-500' :
          mode === 'INBOUND' ? 'bg-primary' : 'bg-orange-500'
        }`} />

      {/* Camera Selection Buttons */}
      <div className="absolute top-4 inset-x-0 px-4 flex justify-center gap-2 z-20">
        {cameraMode !== 'NONE' && (
          <button
            onClick={() => setCameraMode('NONE')}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 shadow-sm"
          >
            <X className="w-5 h-5" /> ปิดกล้อง
          </button>
        )}
        {cameraMode === 'NONE' && (
          <>
            <button
              onClick={() => setCameraMode('ENVIRONMENT')}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 hover:scale-105"
            >
              <Camera className="w-5 h-5" /> เปิดกล้องสแกน
            </button>
          </>
        )}
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto mt-20 md:mt-16">
        
        {/* Camera Viewport */}
        {cameraMode !== 'NONE' && (
          <div className="mb-8 w-full max-w-sm mx-auto overflow-hidden rounded-3xl border-4 border-primary/20 bg-black shadow-2xl">
            <div id="qr-reader" className="w-full"></div>
          </div>
        )}

        {/* Status Icon */}
        {(cameraMode === 'NONE' || status !== 'IDLE') && (
          <div className="flex justify-center mb-6">
            {status === 'SUCCESS' ? <CheckCircle2 className="w-20 h-20 text-green-500 drop-shadow-md" /> :
             status === 'ERROR' ? <XCircle className="w-20 h-20 text-red-500 drop-shadow-md" /> :
             status === 'MAPPING' ? <Box className="w-20 h-20 text-orange-500 drop-shadow-md" /> :
             status === 'LOADING' ? <Loader2 className="w-20 h-20 text-primary animate-spin" /> : 
             <CameraIcon className="w-20 h-20 text-muted-foreground opacity-50" />}
          </div>
        )}

        {/* Message */}
        <h2 className={`text-2xl md:text-3xl font-extrabold mb-4 tracking-tight drop-shadow-sm ${
          status === 'SUCCESS' ? 'text-green-600 dark:text-green-500' :
          status === 'ERROR' ? 'text-red-600 dark:text-red-500' :
          (status === 'MAPPING' || status === 'PRODUCT_MAPPING') ? 'text-orange-600 dark:text-orange-500' :
          'text-foreground'
        }`}>
          {status === 'IDLE' ? (
            cameraMode === 'NONE' ? 
              (mode === 'INBOUND' ? 'พร้อมสแกนสินค้านับสต๊อก' : 'พร้อมสแกน Tracking No.') 
              : 'กำลังสแกน...'
          ) : 
           status === 'MAPPING' ? 'โหมดสร้างการจับคู่เซตจัดส่ง' :
           status === 'PRODUCT_MAPPING' ? 'บาร์โค้ดใหม่!' :
           status === 'SUCCESS' ? 'เสร็จสิ้น!' :
           status === 'ERROR' ? 'ข้อผิดพลาด!' : 'กำลังประมวลผล...'}
        </h2>
        
        {message && (
          <div className="text-foreground/90 font-medium mb-6 md:mb-8 whitespace-pre-line text-base md:text-lg bg-background/50 p-5 md:p-6 rounded-2xl border border-border shadow-inner break-words">
            {message}
          </div>
        )}

        {/* Product Mapping Form */}
        {status === 'PRODUCT_MAPPING' && (
          <InboundForm
            barcode={lastScannedCodeRef.current}
            initialData={productInitialData}
            onCancel={resetScanner}
            onSave={async (data) => {
              const res = await saveProductMappingAndCount(lastScannedCodeRef.current, data);
              if (res.success) {
                setStatus('SUCCESS');
                setMessage(res.message);
              } else {
                setStatus('ERROR');
                setMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
              }
            }}
          />
        )}

        {/* SKU Mapping Mode UI */}
        {status === 'MAPPING' && (
          <div className="bg-background/80 backdrop-blur-md border border-border rounded-2xl p-5 md:p-6 mb-6 text-left shadow-xl">
            <h3 className="text-orange-500 font-extrabold mb-4 border-b border-border pb-3 flex justify-between items-center text-sm md:text-base">
              <span>รายการที่สแกนเข้าเซตแล้ว:</span>
              <span className="bg-orange-500/10 text-orange-600 dark:text-orange-500 text-xs px-2.5 py-1 rounded-md border border-orange-500/20 font-bold animate-pulse">รอรับค่าสแกน...</span>
            </h3>
            {Object.entries(scannedItems).length === 0 ? (
              <div className="text-muted-foreground text-center py-8 font-medium">
                <Box className="w-10 h-10 mx-auto mb-2 opacity-50" />
                ยังไม่มีสินค้าในเซต<br/>(สแกนบาร์โค้ดบนขวดได้เลย)
              </div>
            ) : (
              <ul className="space-y-3">
                {Object.entries(scannedItems).map(([code, qty]) => (
                  <li key={code} className="flex justify-between items-center text-foreground bg-muted/50 px-4 py-3 rounded-xl border border-border/50">
                    <span className="font-mono text-sm font-bold">{code}</span>
                    <span className="bg-orange-500 text-white px-3 py-1 rounded-lg font-black shadow-sm">x {qty}</span>
                  </li>
                ))}
              </ul>
            )}
            
            <div className="mt-8 flex gap-3">
              <button onClick={resetScanner} className="flex-1 py-3.5 rounded-xl text-foreground bg-muted hover:bg-muted/80 font-bold transition-all border border-border text-sm md:text-base">ยกเลิก</button>
              <button onClick={handleSaveMapping} disabled={Object.keys(scannedItems).length === 0} className="flex-1 py-3.5 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-500/20 text-sm md:text-base disabled:hover:scale-100 hover:scale-105">บันทึกการจับคู่</button>
            </div>
          </div>
        )}

        {/* Hidden Input for Scanner (Only if not using camera) */}
        {cameraMode === 'NONE' && (
          <form onSubmit={handleFormSubmit} className="opacity-0 absolute -z-10 h-0 w-0 overflow-hidden">
            <input 
              ref={inputRef}
              type="text" 
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              disabled={status === 'LOADING'}
              onBlur={() => {
                if (status !== 'LOADING' && cameraMode === 'NONE') setTimeout(() => inputRef.current?.focus(), 50);
              }}
            />
          </form>
        )}

        {/* Helper Actions */}
        {(status === 'ERROR' || status === 'SUCCESS') && (
          <button 
            onClick={resetScanner}
            className="w-full md:w-auto px-8 py-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all font-bold text-lg shadow-lg shadow-primary/20"
          >
            เตรียมสแกนรายการต่อไป
          </button>
        )}

        </div>
      </div>
    </div>
  )
}
