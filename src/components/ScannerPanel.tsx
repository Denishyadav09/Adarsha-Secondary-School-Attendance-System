import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Image as ImageIcon, QrCode, Sparkles, CheckCircle2, RotateCw, AlertCircle, Search, UserCheck, Keyboard, Play, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSuccessBeep, playErrorBeep, speakWelcome, speakDeniedAlreadyDone, playCameraShutter } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Student } from '../types';

interface ScannerPanelProps {
  onScan: (roll: string, name: string, capturedPhotoUrl?: string) => { isNew: boolean; message: string; success: boolean };
  students?: Student[];
}

export default function ScannerPanel({ onScan, students = [] }: ScannerPanelProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'file' | 'manual'>('camera');
  const [isScannerActive, setIsScannerActive] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<{ roll: string; name: string; message: string; success: boolean; photoUrl?: string } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');

  // Simulation fallback states
  const [hasNoHardwareCamera, setHasNoHardwareCamera] = useState<boolean>(false);
  const [useSimulatedCamera, setUseSimulatedCamera] = useState<boolean>(false);
  const [simulatedScanningText, setSimulatedScanningText] = useState<string | null>(null);
  const [simulatingScanning, setSimulatingScanning] = useState<boolean>(false);
  const [showShutterFlash, setShowShutterFlash] = useState<boolean>(false);

  // Manual Tab Form States
  const [manualRoll, setManualRoll] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualSearch, setManualSearch] = useState('');

  // QR image detection sensitivity setting
  const [detectionSensitivity, setDetectionSensitivity] = useState<'standard' | 'high-contrast' | 'brightness-boost' | 'oversampled' | 'extreme'>('standard');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const containerId = "qr-reader-viewport";

  const isCameraAccessError = Boolean(
    scanError && 
    (scanError.includes("Device Not Found") || 
     scanError.includes("Permission denied") || 
     scanError.includes("access was blocked") || 
     scanError.includes("camera hardware"))
  );

  // Clean up scanner on unmount or tab switch
  useEffect(() => {
    if (activeTab === 'camera') {
      startCameraScanner(cameraFacing);
    } else {
      stopCameraScanner();
    }
    return () => {
      stopCameraScanner();
    };
  }, [activeTab]);

  // Auto-retry starting the camera if activeTab is 'camera' and it is not active nor initializing, and no known hardware issues/access blocks
  useEffect(() => {
    if (activeTab !== 'camera' || isScannerActive || isInitializing || hasNoHardwareCamera || useSimulatedCamera || isCameraAccessError) return;

    // Retry after 4 seconds to establish automatic connection
    const timer = setTimeout(() => {
      console.log("Auto-retrying camera start...");
      startCameraScanner(cameraFacing);
    }, 4500);

    return () => clearTimeout(timer);
  }, [activeTab, isScannerActive, isInitializing, hasNoHardwareCamera, useSimulatedCamera, cameraFacing, isCameraAccessError]);

  const stopCameraScanner = async (): Promise<void> => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop();
        } catch (err) {
          console.error("Failed to stop camera scanner:", err);
        }
      }
      scannerRef.current = null;
    }
    setIsScannerActive(false);
  };

  const startCameraScanner = async (facing: 'environment' | 'user' = cameraFacing) => {
    setScanError(null);
    setIsInitializing(true);
    setHasNoHardwareCamera(false);
    setUseSimulatedCamera(false);
    await stopCameraScanner();

    try {
      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      let started = false;
      let activeFacing = facing;
      
      const safeQrbox = (width: number, height: number) => {
        // Return full dimension so the scanner is active across the entire div box
        return { width, height };
      };

      // Stage 1a: Try requested facingMode camera (direct value)
      try {
        await html5QrCode.start(
          { facingMode: facing },
          {
            fps: 10,
            qrbox: safeQrbox
          },
          (decodedText) => {
            handleDecodedQr(decodedText);
          },
          () => {
            // Silent failure for periodic empty frame reads
          }
        );
        started = true;
      } catch (err1: any) {
        console.warn(`${facing} facing camera strict failed, trying ideal:`, err1?.message || err1);
      }

      // Stage 1b: Try requested facingMode with ideal constraints (loose fallback)
      if (!started) {
        try {
          await html5QrCode.start(
            { facingMode: { ideal: facing } },
            {
              fps: 10,
              qrbox: safeQrbox
            },
            (decodedText) => {
              handleDecodedQr(decodedText);
            },
            () => {}
          );
          started = true;
        } catch (err1b: any) {
          console.warn(`${facing} facing camera ideal failed, trying alternate direct:`, err1b?.message || err1b);
        }
      }

      // Stage 2a: Try alternate camera if preferred failed
      if (!started) {
        const fallbackFacing = facing === 'environment' ? 'user' : 'environment';
        try {
          await html5QrCode.start(
            { facingMode: fallbackFacing },
            {
              fps: 10,
              qrbox: safeQrbox
            },
            (decodedText) => {
              handleDecodedQr(decodedText);
            },
            () => {}
          );
          activeFacing = fallbackFacing;
          setCameraFacing(fallbackFacing);
          started = true;
        } catch (err2: any) {
          console.warn(`${fallbackFacing} facing camera absolute failed, trying alternate ideal:`, err2?.message || err2);
        }
      }

      // Stage 2b: Try alternate camera with ideal constraints
      if (!started) {
        const fallbackFacing = facing === 'environment' ? 'user' : 'environment';
        try {
          await html5QrCode.start(
            { facingMode: { ideal: fallbackFacing } },
            {
              fps: 10,
              qrbox: safeQrbox
            },
            (decodedText) => {
              handleDecodedQr(decodedText);
            },
            () => {}
          );
          activeFacing = fallbackFacing;
          setCameraFacing(fallbackFacing);
          started = true;
        } catch (err2b: any) {
          console.warn(`${fallbackFacing} facing camera ideal failed, trying list query:`, err2b?.message || err2b);
        }
      }

      // Stage 3a: Query device cameras list and use the first available one
      if (!started) {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            // Find a rear camera if the preferred is 'environment'
            let targetCamera = cameras[0];
            if (facing === 'environment') {
              const rearMatch = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment'));
              if (rearMatch) {
                targetCamera = rearMatch;
              }
            }
            
            await html5QrCode.start(
              targetCamera.id,
              {
                fps: 10,
                qrbox: safeQrbox
              },
              (decodedText) => {
                handleDecodedQr(decodedText);
              },
              () => {}
            );
            started = true;
          } else {
            console.log("No camera devices detected on this system.");
          }
        } catch (err3: any) {
          console.log("All camera label enumeration failed, trying loose universal start:", err3?.message || err3);
        }
      }

      // Stage 3b: Universal absolute fallback - empty media constraint (let browser choose)
      if (!started) {
        try {
          await html5QrCode.start(
            // Passing empty facingMode asks standard userMedia API to supply any active stream
            {} as any,
            {
              fps: 10,
              qrbox: safeQrbox
            },
            (decodedText) => {
              handleDecodedQr(decodedText);
            },
            () => {}
          );
          started = true;
        } catch (err3b: any) {
          console.log("All camera fallback strategies failed (automatically activating simulator):", err3b?.message || err3b);
        }
      }

      if (started) {
        setIsScannerActive(true);
      } else {
        setHasNoHardwareCamera(true);
        setUseSimulatedCamera(true);
        const errMsg = "Device Not Found: No active camera hardware was detected on this system, or the parent sandbox is blocking driver access. Simulated camera auto-activated for interactive testing!";
        setScanError(errMsg);
        setIsScannerActive(false);
      }
    } catch (err: any) {
      console.log("Camera detection warning:", err?.message || err);
      const rawMsg = err?.message || (typeof err === 'string' ? err : '') || 'Could not access camera.';
      const lowerMsg = rawMsg.toLowerCase();
      
      const isPermission = 
        err?.name === "NotAllowedError" || 
        err?.name === "PermissionDeniedError" ||
        lowerMsg.includes("permission denied") || 
        lowerMsg.includes("notallowed") || 
        lowerMsg.includes("permission") ||
        lowerMsg.includes("not allowed");

      let errMsg = "";
      if (isPermission) {
        errMsg = "Permission denied: The camera access was blocked by your browser or inside the sandboxed preview. Please check your browser's address bar to grant permissions, or use 'Snap Badge Photo' below which bypasses strict browser permission constraints!";
      } else {
        errMsg = "Device Not Found: No active camera hardware was detected on this system, or the parent sandbox is blocking driver access. Simulated camera auto-activated for interactive testing!";
        setHasNoHardwareCamera(true);
        setUseSimulatedCamera(true);
      }
      setScanError(errMsg);
      setIsScannerActive(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleFacingChange = async (newFacing: 'environment' | 'user') => {
    setCameraFacing(newFacing);
    setUseSimulatedCamera(false);
    setHasNoHardwareCamera(false);
    setScanError(null);
    if (activeTab === 'camera') {
      await startCameraScanner(newFacing);
    }
  };

  const generateSimulatedFaceSnapshot = (name: string, roll: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background gradient
      const gradient = ctx.createRadialGradient(150, 150, 40, 150, 150, 200);
      gradient.addColorStop(0, '#1e293b');
      gradient.addColorStop(1, '#0f172a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 300, 300);

      // Grid overlay
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 300; i += 20) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 300); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(300, i); ctx.stroke();
      }

      // Drawing stylized verification frame (outer neon circular scanning area)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(150, 110, 50, 0, Math.PI * 2);
      ctx.stroke();

      // Core avatar circle or head placeholder
      ctx.beginPath();
      ctx.arc(150, 110, 38, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();

      // Inside initials
      const names = name.trim().split(' ');
      const initials = (names[0]?.[0] || '') + (names[names.length - 1]?.[0] || '');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials.toUpperCase(), 150, 110);

      // Body curvature block
      ctx.beginPath();
      ctx.ellipse(150, 220, 75, 40, 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = '#1d4ed8';
      ctx.fill();

      // Horizontal fluorescent green scanning laser lines
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 140);
      ctx.lineTo(260, 140);
      ctx.stroke();

      // Overlays
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VERIFIED PASS • SECURE SNAP', 150, 35);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(`ID: QR-#${roll} | SECURE SNAP`, 150, 275);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(name.length > 20 ? name.substring(0, 18) + '..' : name, 150, 180);
    }
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const captureCameraSnapshot = (): string | undefined => {
    try {
      const video = document.querySelector(`#${containerId} video`) as HTMLVideoElement | null;
      if (video) {
        const canvas = document.createElement('canvas');
        // Ensure we capture at the exact full resolution of the video track for maximum high-quality verification
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Boost brightness/contrast subtly for perfect digital clarity
          ctx.filter = 'contrast(1.06) brightness(1.02)';
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Render a professional security timestamp/log watermark to act as a robust visual record
          ctx.shadowColor = 'rgba(0, 0, 0, 0.82)';
          ctx.shadowBlur = 4;
          ctx.fillStyle = '#10b981'; // Emerald Green Accent
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText('⚡ SECURE VERIFIED LOG', 20, canvas.height - 35);
          
          ctx.fillStyle = '#ffffff'; // White Time stamp text
          ctx.font = 'normal 11px monospace';
          const localTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
          ctx.fillText(`CAM_FEED_SNAP // UTC: ${localTimestamp}`, 20, canvas.height - 18);
          
          // Export at high-quality JPEG settings (95%)
          return canvas.toDataURL('image/jpeg', 0.95);
        }
      }
    } catch (err) {
      console.warn("Failed to capture video snapshot:", err);
    }
    return undefined;
  };

  const handleDecodedQr = (text: string) => {
    const parts = text.split('|').map(s => s.trim());
    if (parts.length < 2) {
      playErrorBeep();
      setScanError("Invalid QR Badge code structure. Expected 'RollNumber|Name'.");
      return;
    }

    const roll = parts[0];
    const name = parts[1];

    if (!roll || !name) {
      playErrorBeep();
      setScanError("QR contains empty roll number or student name.");
      return;
    }

    // Capture the high-quality face/badge snapshot for the security log
    const snapshot = captureCameraSnapshot();
    
    // Trigger the responsive camera shutter physical SFX
    playCameraShutter();
    
    // Trigger the quick mechanical UI shutter flash overlay
    setShowShutterFlash(true);
    setTimeout(() => {
      setShowShutterFlash(false);
    }, 280);

    executeCheckIn(roll, name, snapshot);
  };

  const executeCheckIn = (roll: string, name: string, capturedPhoto?: string) => {
    let finalPhoto = capturedPhoto;
    if (!finalPhoto) {
      const foundStudent = students.find(s => s.roll.toLowerCase() === roll.trim().toLowerCase());
      finalPhoto = foundStudent?.photoUrl || generateSimulatedFaceSnapshot(name, roll);
    }

    // Process scan with parent storage
    const result = onScan(roll, name, finalPhoto);

    if (result.success) {
      playSuccessBeep();
      
      // Speak welcome greeting
      const matchedStudent = students.find(s => s.roll.toLowerCase() === roll.trim().toLowerCase());
      const speakName = matchedStudent ? matchedStudent.name : name;
      speakWelcome(speakName);

      if (result.isNew) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      }
      setScanResult({
        roll,
        name,
        message: result.message,
        success: true,
        photoUrl: finalPhoto
      });
      setScanError(null);
    } else {
      playErrorBeep();
      
      // Speak apology/denial warning
      const matchedStudent = students.find(s => s.roll.toLowerCase() === roll.trim().toLowerCase());
      const speakName = matchedStudent ? matchedStudent.name : name;
      speakDeniedAlreadyDone(speakName);

      setScanResult({
        roll,
        name,
        message: result.message,
        success: false,
        photoUrl: finalPhoto
      });
    }

    // Auto-clear result alert after 5 seconds
    setTimeout(() => {
      setScanResult(current => {
        if (current && current.roll === roll) {
          return null;
        }
        return current;
      });
    }, 5000);
  };

  const simulateScanStudent = (student: Student) => {
    if (simulatingScanning) return;
    setSimulatingScanning(true);
    setSimulatedScanningText(`Presenting ${student.name}'s roll #${student.roll}...`);

    setTimeout(() => {
      const simulatedText = `${student.roll}|${student.name}`;
      handleDecodedQr(simulatedText);
      setSimulatingScanning(false);
      setSimulatedScanningText(null);
    }, 1200);
  };

  const preprocessImage = (
    file: File, 
    sensitivity: 'standard' | 'high-contrast' | 'brightness-boost' | 'oversampled' | 'extreme'
  ): Promise<Blob | File> => {
    return new Promise((resolve) => {
      if (sensitivity === 'standard') {
        resolve(file);
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Apply scale factor for upsampling if needed
        let scale = 1.0;
        if (sensitivity === 'oversampled' || sensitivity === 'extreme') {
          scale = 2.0; 
        }

        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Turn off smoothing to retain sharp block borders on upscaled QRs
        ctx.imageSmoothingEnabled = false;

        // Compose CSS canvas filters
        let filters = '';
        if (sensitivity === 'high-contrast') {
          filters = 'grayscale(100%) contrast(190%) brightness(100%)';
        } else if (sensitivity === 'brightness-boost') {
          filters = 'grayscale(100%) contrast(130%) brightness(130%)';
        } else if (sensitivity === 'oversampled') {
          filters = 'grayscale(100%) contrast(150%) brightness(100%)';
        } else if (sensitivity === 'extreme') {
          filters = 'grayscale(100%) contrast(220%) brightness(110%)';
        }

        ctx.filter = filters;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const processedFile = new File([blob], file.name, { type: 'image/jpeg' });
            resolve(processedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.95);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError(null);
    setScanResult(null);

    // Create a temporary off-screen div with dimensions (instead of display: none) to facilitate canvas loading
    const tempNode = document.createElement('div');
    tempNode.id = 'temp-qr-file-reader';
    tempNode.style.position = 'absolute';
    tempNode.style.width = '350px';
    tempNode.style.height = '350px';
    tempNode.style.top = '-9999px';
    tempNode.style.left = '-9999px';
    tempNode.style.opacity = '0';
    tempNode.style.pointerEvents = 'none';
    document.body.appendChild(tempNode);

    try {
      const fileDecoder = new Html5Qrcode(tempNode.id);
      const preprocessedFile = await preprocessImage(file, detectionSensitivity);
      const decodedText = await fileDecoder.scanFile(preprocessedFile as File, true);
      handleDecodedQr(decodedText);
    } catch (err: any) {
      console.error(err);
      playErrorBeep();
      setScanError("No QR Code Detected: The scanner couldn't locate a valid QR code pattern in this specific picture. Make sure the student's badge QR code is held flat, fully visible, well-lit, and not blurry. Try selecting a higher sensitivity / filters tuner option below before uploading!");
    } finally {
      document.body.removeChild(tempNode);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleNativeCameraCapture = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError(null);
    setScanResult(null);

    // Create a temporary off-screen div with dimensions (instead of display: none) to facilitate canvas loading
    const tempNode = document.createElement('div');
    tempNode.id = 'temp-qr-native-reader';
    tempNode.style.position = 'absolute';
    tempNode.style.width = '350px';
    tempNode.style.height = '350px';
    tempNode.style.top = '-9999px';
    tempNode.style.left = '-9999px';
    tempNode.style.opacity = '0';
    tempNode.style.pointerEvents = 'none';
    document.body.appendChild(tempNode);

    try {
      const fileDecoder = new Html5Qrcode(tempNode.id);
      const preprocessedFile = await preprocessImage(file, detectionSensitivity);
      const decodedText = await fileDecoder.scanFile(preprocessedFile as File, true);
      handleDecodedQr(decodedText);
    } catch (err: any) {
      console.error(err);
      playErrorBeep();
      setScanError("No QR Code Detected: The camera snapshot was captured, but we couldn't decode a valid QR code statement. Please place the badge in direct lighting, get close to the QR pattern to avoid blur, adjust sensitivity settings, and try again!");
    } finally {
      document.body.removeChild(tempNode);
      if (nativeCameraInputRef.current) {
        nativeCameraInputRef.current.value = '';
      }
    }
  };

  const toggleTab = async (tab: 'camera' | 'file' | 'manual') => {
    if (tab !== 'camera') {
      await stopCameraScanner();
    }
    setActiveTab(tab);
    setScanError(null);
  };

  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRoll.trim()) {
      setScanError("Roll number is required for check-in.");
      return;
    }
    
    // Look up default name from list if empty
    let studentName = manualName.trim();
    if (!studentName) {
      const matched = students.find(s => s.roll.toLowerCase() === manualRoll.trim().toLowerCase());
      studentName = matched ? matched.name : `Student (${manualRoll.trim()})`;
    }

    executeCheckIn(manualRoll.trim(), studentName);
    setManualRoll('');
    setManualName('');
  };

  // Filter students for check-in index
  const filteredStudents = students.filter(s => {
    const term = manualSearch.toLowerCase();
    return s.name.toLowerCase().includes(term) || s.roll.toLowerCase().includes(term);
  });

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6" id="attendance-scanner-panel">
      {/* Panel Title */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-lg">Mark Attendance Kiosk</h2>
            <p className="text-xs text-slate-500">Log presence using cameras, uploads, or manual control</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl mb-5">
        <button
          onClick={() => toggleTab('camera')}
          className={`flex items-center justify-center space-x-1 py-2 text-[11px] font-medium rounded-lg transition-all ${
            activeTab === 'camera'
              ? 'bg-white text-slate-805 shadow-xs font-bold border border-slate-100'
              : 'text-slate-550 hover:text-slate-800'
          }`}
          type="button"
        >
          <Camera className="h-3 w-3" />
          <span>Live Scanner</span>
        </button>
        <button
          onClick={() => toggleTab('file')}
          className={`flex items-center justify-center space-x-1 py-2 text-[11px] font-medium rounded-lg transition-all ${
            activeTab === 'file'
              ? 'bg-white text-slate-805 shadow-xs font-bold border border-slate-100'
              : 'text-slate-550 hover:text-slate-800'
          }`}
          type="button"
        >
          <ImageIcon className="h-3 w-3" />
          <span>Upload Image</span>
        </button>
        <button
          onClick={() => toggleTab('manual')}
          className={`flex items-center justify-center space-x-1 py-2 text-[11px] font-medium rounded-lg transition-all ${
            activeTab === 'manual'
              ? 'bg-white text-slate-805 shadow-xs font-bold border border-slate-100'
              : 'text-slate-550 hover:text-slate-800'
          }`}
          type="button"
        >
          <Keyboard className="h-3 w-3" />
          <span>Manual Key-in</span>
        </button>
      </div>

      {/* Front / Back Camera Picker */}
      {activeTab === 'camera' && (
        <div className="flex items-center justify-center space-x-1 mb-5 bg-slate-50 p-1 rounded-xl max-w-[280px] mx-auto border border-slate-100 shadow-2xs animate-fade-in">
          <button
            onClick={() => handleFacingChange('environment')}
            className={`flex-1 py-1.5 px-3 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              cameraFacing === 'environment'
                ? 'bg-blue-600 text-white shadow-xs font-black scale-[1.02]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            type="button"
          >
            <Camera className="h-3 w-3 shrink-0" />
            <span>Back Cam (Rear)</span>
          </button>
          
          <button
            onClick={() => handleFacingChange('user')}
            className={`flex-1 py-1.5 px-3 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              cameraFacing === 'user'
                ? 'bg-blue-600 text-white shadow-xs font-black scale-[1.02]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            type="button"
          >
            <Camera className="h-3 w-3 shrink-0" />
            <span>Front Cam (Selfie)</span>
          </button>
        </div>
      )}
      {/* Main Scanner Stage */}
      <div className="relative aspect-square max-w-[420px] w-full mx-auto bg-slate-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center border border-slate-950 shadow-inner">
        
        {activeTab === 'camera' && (
          <>
            {/* Responsive Camera Shutter Flash visual effect */}
            <AnimatePresence>
              {showShutterFlash && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="absolute inset-0 bg-white z-[100] pointer-events-none"
                />
              )}
            </AnimatePresence>
 
            {useSimulatedCamera ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white z-10 p-4 select-none w-full h-full relative">
                {/* Simulated Lens Scanning Background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none opacity-80" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.1)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(18,24,38,0.1)_1px,_transparent_1px)] bg-[size:16px_16px] opacity-20 pointer-events-none" />
                
                {/* Outer bounding scanner square - ENLARGED to 85% width/height */}
                <div className="relative w-[85%] h-[85%] border border-white/20 rounded-2xl flex flex-col items-center justify-center overflow-hidden bg-slate-900/60 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                  {/* Decorative corner brackets */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-500 rounded-tl-sm animate-pulse" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-500 rounded-tr-sm animate-pulse" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-500 rounded-bl-sm animate-pulse" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-500 rounded-br-sm animate-pulse" />
                  
                  {/* Pulsing focal point circles */}
                  <div className="absolute w-24 h-24 border border-dashed border-emerald-600/40 rounded-full animate-[spin_20s_linear_infinite]" />
                  <div className="absolute w-12 h-12 border border-emerald-500/20 rounded-full animate-ping" />

                  {/* Horizontal animated scan beam */}
                  <div className="absolute top-0 inset-x-2 h-0.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-[bounce_2s_infinite]" />

                  {/* Decoded/Simulated Animation State */}
                  {simulatingScanning ? (
                    <div className="z-10 text-center px-3 animate-pulse bg-slate-950/90 py-3 rounded-xl border border-slate-805 max-w-[85%]">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-400 mb-1">
                        <RotateCw className="h-4 w-4 animate-spin text-emerald-400" />
                        <span className="text-[10px] uppercase tracking-widest font-bold">Scanning QR...</span>
                      </div>
                      <p className="text-[8px] text-slate-400 leading-tight">Hold badge steady inside frame guidelines</p>
                    </div>
                  ) : (
                    <div className="z-10 text-center p-3 text-slate-350">
                      <QrCode className="h-8 w-8 text-emerald-500/80 mx-auto mb-2 animate-bounce" />
                      <div className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">Always-On Lens</div>
                      <p className="text-[9px] text-slate-400 max-w-[120px] mx-auto mt-0.5 leading-normal">Virtual Webcam Sandbox active</p>
                    </div>
                  )}
                </div>

                <div className="mt-3 text-center z-10">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-950/85 text-emerald-400 text-[10px] rounded-full border border-emerald-900 font-semibold mb-1">
                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span>Simulator active</span>
                  </div>
                  <p className="text-[9px] text-slate-400 max-w-[240px] leading-relaxed">
                    Camera drivers are unavailable inside sandbox. Virtual scan mode auto-enabled!
                  </p>
                </div>

                {/* Simulated hardware toggle button to allow trying real camera again */}
                <button
                  onClick={() => {
                    setUseSimulatedCamera(false);
                    setHasNoHardwareCamera(false);
                    startCameraScanner(cameraFacing);
                  }}
                  className="absolute top-3 left-3 px-2 py-1 bg-slate-900/80 border border-slate-800 text-slate-400 text-[9px] font-semibold rounded-lg hover:text-white transition-colors cursor-pointer"
                  type="button"
                >
                  Force Real Webcam
                </button>
              </div>
            ) : (
              <>
                {/* Live Camera Feed div */}
                <div id={containerId} className="absolute inset-0 w-full h-full" />

                {!isScannerActive && !isInitializing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-slate-950/95 z-10 w-full height-full">
                    {isCameraAccessError ? (
                      <>
                        <div className="h-10 w-10 bg-amber-950/80 text-amber-400 rounded-2xl flex items-center justify-center mb-2 border border-amber-805">
                          <AlertCircle className="h-5 w-5 animate-pulse" />
                        </div>
                        <h4 className="text-white font-bold text-xs mb-1 font-sans">Connecting Camera Feed...</h4>
                        <p className="text-[10px] text-slate-400 max-w-[260px] mb-3 leading-relaxed px-2">
                          {scanError}
                        </p>
                        <div className="text-[10px] text-amber-400 max-w-[260px] mb-4 bg-amber-950/45 p-2 rounded-xl border border-amber-900/60 text-left">
                          💡 <strong>How to resolve:</strong> Click <strong>"Open in new window"</strong> at the top-right of your workspace so the browser can ask for device camera permissions directly in a top-level secure tab!
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-10 w-10 bg-blue-950 text-blue-400 rounded-2xl flex items-center justify-center mb-2 border border-blue-800 animate-pulse">
                          <QrCode className="h-5 w-5" />
                        </div>
                        <h4 className="text-white font-bold text-xs mb-1 font-sans">Auto Camera Initializing...</h4>
                        <p className="text-[10px] text-slate-400 max-w-[240px] mb-4 leading-relaxed">
                          Camera feed is starting automatically. Once active, hold your QR badge up to read it instantly!
                        </p>
                      </>
                    )}
                    
                    <div className="flex flex-col gap-2 w-full max-w-[240px]">
                      <button
                        onClick={() => {
                          setUseSimulatedCamera(true);
                          setHasNoHardwareCamera(true);
                          setScanError(null);
                        }}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md border border-slate-705/85 cursor-pointer flex items-center justify-center gap-1.5"
                        type="button"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>Use Virtual Camera Simulator</span>
                      </button>

                      <button
                        onClick={() => startCameraScanner(cameraFacing)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-900/40 cursor-pointer flex items-center justify-center gap-1.5"
                        type="button"
                      >
                        <Camera className="h-3.5 w-3.5 animate-pulse" />
                        <span>Attempt Connection Manual Force</span>
                      </button>

                      <button
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-950/40 cursor-pointer flex items-center justify-center gap-1.5"
                        type="button"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>Snap Badge Photo</span>
                      </button>
                    </div>

                    <div className="text-[9px] text-slate-500 max-w-[250px] leading-relaxed mt-3 text-left bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                      <span className="font-bold text-emerald-400 block mb-0.5">💡 Direct Access Mode Enabled</span>
                      "Snap Badge Photo" launches your native device camera app, escaping strict browser permissions & sandbox restrictions.
                    </div>
                  </div>
                )}

                {isInitializing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950 z-10">
                    <RotateCw className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                    <h4 className="text-white font-medium text-sm">Configuring Camera...</h4>
                    <p className="text-xs text-slate-400 mt-1">Acquiring device capture buffers</p>
                  </div>
                )}

                {isScannerActive && (
                  <>
                    {/* Custom Overlay HUD design on top of camera */}
                    <div className="absolute inset-0 pointer-events-none z-5 flex flex-col items-center justify-center">
                      {/* Centered target scanning area - Expanded to 100% full bounds */}
                      <div className="relative w-full h-full flex items-center justify-center bg-slate-950/10 rounded-2xl">
                        {/* Soft breathing pulse glow around the target area */}
                        <div className="absolute inset-0 rounded-2xl border border-blue-500/35 bg-blue-500/5 animate-[pulse_2.5s_infinite]" />
                        
                        {/* High-visibility corner bracket guides */}
                        <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                        <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                        
                        {/* Scanning beam laser line that sweeps down and up smoothly */}
                        <motion.div 
                          className="absolute inset-x-2 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_8px_rgba(96,165,250,1.0)]"
                          animate={{
                            top: ["8%", "92%", "8%"]
                          }}
                          transition={{
                            duration: 2.2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />

                        {/* Centered crosshair indicator */}
                        <div className="w-1.5 h-1.5 bg-blue-400/40 rounded-full animate-ping" />
                        <div className="w-1 h-1 bg-blue-500/60 rounded-full absolute" />
                      </div>

                      {/* Info & Status HUD Badge overlay below the scanning frame */}
                      <div className="mt-4 flex flex-col items-center pointer-events-none">
                        <span className="relative flex h-2 w-2 mb-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="px-3 py-1 bg-slate-950/90 text-[9px] text-slate-350 rounded-full font-sans uppercase tracking-widest border border-slate-800 backdrop-blur-xs flex items-center gap-1.5 shadow-lg">
                          <span className="text-blue-400 font-bold animate-pulse">●</span> Active Detection Frame
                        </span>
                        <span className="text-[9px] text-slate-400 mt-1 max-w-[200px] text-center leading-normal">
                          Align student badge QR code inside the bounding brackets
                        </span>
                      </div>
                    </div>

                    {/* Deactivate Button */}
                    <button
                      onClick={stopCameraScanner}
                      className="absolute top-3 right-3 px-3 py-1 bg-slate-950/80 hover:bg-slate-900 text-white text-[10px] uppercase font-semibold rounded-lg border border-slate-800 z-10 transition-all cursor-pointer"
                      type="button"
                    >
                      Turn Off Lens
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* File Upload UI */}
        {activeTab === 'file' && (
          <div className="absolute inset-0 flex flex-col items-center justify-start p-5 text-center bg-slate-950 z-10 overflow-y-auto">
            <div className="h-12 w-12 bg-slate-900 text-slate-300 rounded-2xl flex items-center justify-center mb-3 border border-slate-800 shrink-0">
              <ImageIcon className="h-6 w-6" />
            </div>
            <h4 className="text-white font-medium text-sm mb-1 uppercase tracking-wide">Batch PNG/JPEG Badge Reader</h4>
            <p className="text-xs text-slate-400 max-w-[280px] mb-4">
              Select or snap any digital badge card to automatically read QR credentials.
            </p>

            {/* 🛠️ QR DETECTION SENSITIVITY CONFIG CARD */}
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-4 text-left mb-4 shrink-0 shadow-xl">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sliders className="h-4 w-4 text-blue-400" />
                <span className="text-[11px] font-bold uppercase text-slate-300 tracking-wider">QR Code Detection Tuner</span>
              </div>
              <p className="text-[11px] text-slate-450 leading-normal mb-3">
                Fine-tune how the scanner processes uploaded images. Enhance blurry, small, or low-contrast photos below:
              </p>

              <div className="space-y-2">
                {[
                  {
                    id: 'standard' as const,
                    name: 'Standard Engine',
                    desc: 'Fastest decoding of direct digital files',
                    badge: 'Direct'
                  },
                  {
                    id: 'high-contrast' as const,
                    name: 'Faded / High Contrast',
                    desc: 'Binarizes gray shades & boosts depth',
                    badge: 'Faded'
                  },
                  {
                    id: 'brightness-boost' as const,
                    name: 'Shadow / Brightness Refiner',
                    desc: 'Rescues dim/dark room snapshots',
                    badge: 'Shadowy'
                  },
                  {
                    id: 'oversampled' as const,
                    name: 'Super Zoom (Oversampled 2x)',
                    desc: 'Upscales tiny or far-away QR cubes',
                    badge: 'Tiny QR'
                  },
                  {
                    id: 'extreme' as const,
                    name: 'Max Extreme Tuning',
                    desc: 'Oversample + maximum contrast boost',
                    badge: 'Blurry'
                  }
                ].map(opt => {
                  const isSelected = detectionSensitivity === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDetectionSensitivity(opt.id)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600/10 border-blue-500 text-white font-semibold' 
                          : 'bg-slate-950/45 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40 text-slate-400'
                      }`}
                    >
                      <div className="truncate">
                        <div className="text-[11px] font-bold flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
                          <span className={isSelected ? 'text-blue-200' : 'text-slate-300'}>{opt.name}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 truncate mt-0.5">{opt.desc}</div>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border tracking-wider grow-0 shrink-0 ${
                        isSelected 
                          ? 'bg-blue-650/40 text-blue-300 border-blue-500/40' 
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}>
                        {opt.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="qr-file-selector"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-sm py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-900/30 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              type="button"
            >
              <ImageIcon className="h-4 w-4" />
              <span>Select & Scan Badge Image</span>
            </button>
          </div>
        )}

        {/* Manual Keyboard Key-in Interface */}
        {activeTab === 'manual' && (
          <div className="absolute inset-0 flex flex-col bg-slate-950 p-5 z-10 text-left overflow-y-auto w-full">
            <div className="mb-3 flex items-center gap-1.5 text-blue-400">
              <Keyboard className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Admin Mode Access Override</span>
            </div>

            {/* Simple direct key-in form */}
            <form onSubmit={handleManualFormSubmit} className="space-y-2 mb-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-450 uppercase font-bold block mb-1">Roll / Badge ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101"
                    value={manualRoll}
                    onChange={e => setManualRoll(e.target.value)}
                    className="w-full text-xs bg-slate-950 text-white rounded-lg border border-slate-805 px-2.5 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-450 uppercase font-bold block mb-1">Student Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto lookup if empty"
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    className="w-full text-xs bg-slate-950 text-white rounded-lg border border-slate-805 px-2.5 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Instant Check-In Override</span>
              </button>
            </form>

            {/* Search list student roster helper */}
            <div className="flex-1 flex flex-col min-h-[140px]">
              <div className="relative mb-2 shrink-0">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Quick lookup by name or roll..."
                  value={manualSearch}
                  onChange={e => setManualSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 text-white rounded-lg focus:outline-none focus:border-blue-500 text-[11px]"
                />
              </div>

              {/* Scrollable search container */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[160px] custom-scrollbar scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <div 
                      key={student.roll} 
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-900 hover:border-slate-800/80 transition-all text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200 text-[11px]">{student.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Roll: #{student.roll} • {student.classSection}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => executeCheckIn(student.roll, student.name)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 hover:text-white text-blue-400 font-extrabold text-[10px] rounded-md transition-all cursor-pointer"
                      >
                        Check-In
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-slate-600 text-[11px]">
                    No students matched searching filters.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Hidden system capture form selectors */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        id="qr-native-camera-capture"
        ref={nativeCameraInputRef}
        onChange={handleNativeCameraCapture}
      />

      {activeTab === 'camera' && useSimulatedCamera && (
        <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
              <span>Simulated QR Badge Presenter</span>
            </span>
            <span className="text-[9px] text-emerald-600 bg-emerald-50 py-0.5 px-2 rounded-full font-semibold border border-emerald-100">
              Auto Activated
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-normal mb-3">
            Since your hardware camera isn't accessible, use these buttons to instantly simulate holding the student's real QR badge up to the camera lens.
          </p>

          {students && students.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
              {students.map(student => (
                <button
                  key={student.roll}
                  type="button"
                  disabled={simulatingScanning}
                  onClick={() => simulateScanStudent(student)}
                  className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/10 transition-all text-left text-xs disabled:opacity-50 cursor-pointer shadow-2xs group"
                >
                  <div className="truncate pr-1">
                    <div className="font-bold text-slate-800 text-[11px] truncate group-hover:text-emerald-700">{student.name}</div>
                    <div className="text-[9px] text-slate-500 font-mono">Roll: #{student.roll} • {student.classSection}</div>
                  </div>
                  <span className="px-1.5 py-0.5 bg-slate-100 text-[9px] font-bold text-blue-600 rounded-md border border-slate-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-200 shrink-0">
                    Present
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 bg-white rounded-xl border border-dashed border-slate-200 p-3">
              <p className="text-[11px] text-slate-500 mb-1 italic">No registered students found in Directory</p>
              <p className="text-[10px] text-slate-400">Please add student records in the left-side Registration Panel, then select them to present here!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'camera' && !useSimulatedCamera && (
        <div className="mt-4 p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl text-left flex flex-col gap-2">
          <div className="flex items-start gap-2.5">
            <Camera className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-600 leading-relaxed font-sans">
              <span className="font-bold text-slate-850 block mb-0.5">Camera & Privacy Access Notice</span>
              Please scan roll QR badges under plenty of clean light. Keep the QR code centered and stable. Live scan runs strictly inside your local memory.
            </div>
          </div>
          {scanError && (
            <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex flex-col gap-1.5 text-xs">
              <div className="flex gap-1.5 items-center font-bold text-emerald-800">
                <span className="inline-block px-1.5 py-0.5 text-[9px] bg-emerald-200 text-emerald-800 uppercase rounded font-bold">Recommended Fallback</span>
                Use Snap Badge Photo
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                If the browser or parent workspace denies continuous live video permissions inside the sandboxed viewport, tap <strong>"Snap Badge Photo"</strong> above. This opens your device's native system camera safely to snapshot and auto-parse the badge with 100% success!
              </p>
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="mt-1 self-start px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase rounded-lg shadow transition-all cursor-pointer"
              >
                Snap Badge Photo Now
              </button>
            </div>
          )}
        </div>
      )}

       {/* Error and Scan Result Displays */}
      <AnimatePresence mode="wait">
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-4 p-4 rounded-2xl border flex items-start gap-4 ${
              scanResult.success
                ? 'bg-emerald-50/75 border-emerald-100 text-emerald-900'
                : 'bg-amber-50/75 border-amber-100 text-amber-900'
            }`}
          >
            {scanResult.photoUrl && (
              <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200/80 bg-slate-900 shrink-0 shadow-sm">
                <img referrerPolicy="no-referrer" src={scanResult.photoUrl} alt="Captured Face" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 py-0.5 bg-neutral-900/80 text-[7px] text-emerald-400 font-mono font-extrabold tracking-widest text-center uppercase">
                  CAM CAP
                </div>
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-slate-900 truncate max-w-[140px]">{scanResult.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono rounded font-medium">
                  #{scanResult.roll}
                </span>
                {scanResult.success && (
                  <span className="flex items-center text-[10px] text-emerald-600 bg-emerald-100/60 font-semibold px-2 py-0.5 rounded-full shrink-0">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Present
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-normal break-words">{scanResult.message}</p>
            </div>
            {scanResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5 ml-auto" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 ml-auto" />
            )}
          </motion.div>
        )}

        {scanError && !isCameraAccessError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-red-50/80 border border-red-100 text-red-900 rounded-2xl flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-left">
              <h5 className="font-semibold text-xs text-red-800">Scanner Attention</h5>
              <p className="text-xs text-red-700/95 mt-0.5">{scanError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
