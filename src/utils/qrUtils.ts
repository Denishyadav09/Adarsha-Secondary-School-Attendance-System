import QRCode from 'qrcode';

/**
 * Generates a standard data URL (Base64) image for a QR Code
 */
export async function generateQrDataUrl(roll: string, name: string): Promise<string> {
  const payload = `${roll.trim()}|${name.trim()}`;
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    margin: 1, // Reduced margin to make the active QR elements larger and easier to scan
    width: 400, // Extremely crisp high-res code
    color: {
      dark: '#0f172a', // Deep slate-900 for premium contrast
      light: '#ffffff', // White background
    },
  });
}

/**
 * Draws a gorgeous customized Student ID Badge on a canvas and triggers a download.
 */
export async function downloadStudentBadge(
  roll: string, 
  name: string, 
  classSection?: string, 
  photoUrl?: string,
  schoolName: string = 'Adarsha Secondary School',
  schoolLogoUrl?: string,
  phone?: string,
  guardian?: string
): Promise<void> {
  async function drawAndExport(includeLogo: boolean, includePhoto: boolean): Promise<void> {
    // Load Logo image safely
    let logoImg: HTMLImageElement | null = null;
    if (includeLogo && schoolLogoUrl) {
      logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = schoolLogoUrl;
      await new Promise<void>((resolve) => {
        if (!logoImg) return resolve();
        logoImg.onload = () => resolve();
        logoImg.onerror = () => { logoImg = null; resolve(); };
      });
    }

    // Load profile Photo image safely
    let profileImg: HTMLImageElement | null = null;
    if (includePhoto && photoUrl) {
      profileImg = new Image();
      profileImg.crossOrigin = 'anonymous';
      profileImg.src = photoUrl;
      await new Promise<void>((resolve) => {
        if (!profileImg) return resolve();
        profileImg.onload = () => resolve();
        profileImg.onerror = () => { profileImg = null; resolve(); };
      });
    }

    // Generate and Load QR Code
    const qrUrl = await generateQrDataUrl(roll, name);
    const qrImage = new Image();
    qrImage.crossOrigin = 'anonymous';
    qrImage.src = qrUrl;
    await new Promise<void>((resolve) => {
      qrImage.onload = () => resolve();
      qrImage.onerror = () => resolve();
    });

    const canvas = document.createElement('canvas');
    // Perfectly sized dimensions (300 x 410 px) of the ID-card layout matches the screen preview exactly
    canvas.width = 300;
    canvas.height = 410;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. White Base Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 300, 410);

    // 2. Banner Header Background (slate-900)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 300, 58);

    // 3. School Logo (drawn inside circular white background)
    if (logoImg) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(30, 29, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(logoImg, 14, 13, 32, 32);
    }

    // 4. Header text labels
    ctx.textAlign = 'left';
    
    // Tag line
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = 'bold 7px system-ui, -apple-system, sans-serif';
    ctx.fillText('STUDENT ROSTER', logoImg ? 58 : 18, 18);

    // Institution Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    const displaySchool = schoolName.toUpperCase().length > 32 
      ? schoolName.substring(0, 31).toUpperCase() + '...' 
      : schoolName.toUpperCase();
    ctx.fillText(displaySchool, logoImg ? 58 : 18, 30);

    // Credentials Sub-tag
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = '600 6.5px system-ui, -apple-system, sans-serif';
    ctx.fillText('INSTITUTIONAL CREDENTIALS', logoImg ? 58 : 18, 41);

    // 5. Blue Accent Line divider (blue-500)
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 58, 300, 4);

    // 6. QR Code + Profile Photo section
    const photoY = 80;
    if (profileImg) {
      // Dynamic Layout: Photo on left, QR on right
      // Draw Photo Box Border
      ctx.strokeStyle = '#e2e8f0'; // slate-200
      ctx.lineWidth = 1;
      ctx.strokeRect(18, photoY, 90, 108);

      // Draw the profile photo inside
      ctx.drawImage(profileImg, 19, photoY + 1, 88, 106);

      // Draw QR Badge on the right side (125 x 125 px)
      ctx.drawImage(qrImage, 142, photoY - 8, 125, 125);
    } else {
      // Standard singular landscape center QR alignment
      ctx.drawImage(qrImage, 60, photoY - 10, 180, 180);
    }

    // 7. Student Metadata Profile Card Coords
    ctx.strokeStyle = '#f1f5f9'; // slate-100 border
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18, 225);
    ctx.lineTo(282, 225);
    ctx.stroke();

    // "REGISTERED CANDIDATE" subtitle
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = 'bold 7.5px system-ui, -apple-system, sans-serif';
    ctx.fillText('REGISTERED CANDIDATE', 18, 240);

    // Bold Student Name
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    const displayStudent = name.toUpperCase().length > 26
      ? name.substring(0, 25).toUpperCase() + '...'
      : name.toUpperCase();
    ctx.fillText(displayStudent, 18, 258);

    // Line separator
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, 268);
    ctx.lineTo(282, 268);
    ctx.stroke();

    // Grid details layout coords (Left X: 18, Right X: 156)
    // Row 1 keys & values (Roll No & Class section)
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 6.5px system-ui, -apple-system, sans-serif';
    ctx.fillText('ROLL NUMBER', 18, 282);
    ctx.fillText('CLASS / GRADE', 156, 282);

    ctx.fillStyle = '#2563eb'; // blue-600
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`#${roll}`, 18, 296);

    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.font = 'bold 12px monospace';
    ctx.fillText(classSection ? classSection.toUpperCase() : 'N/A', 156, 296);

    // Row 2 keys & values (Guardian name - serial block)
    ctx.strokeStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(18, 308);
    ctx.lineTo(282, 308);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 6.5px system-ui, -apple-system, sans-serif';
    ctx.fillText('GUARDIAN NAME', 18, 322);

    ctx.fillStyle = '#475569'; // slate-600
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    const displayGuardian = guardian 
      ? (guardian.length > 28 ? guardian.substring(0, 27).toUpperCase() + '...' : guardian.toUpperCase()) 
      : 'N/A';
    ctx.fillText(displayGuardian, 18, 334);

    // Row 3 keys & values (Phone contact - serial block)
    ctx.beginPath();
    ctx.moveTo(18, 344);
    ctx.lineTo(282, 344);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 6.5px system-ui, -apple-system, sans-serif';
    ctx.fillText('PHONE CONTACT', 18, 356);

    ctx.fillStyle = '#475569'; // slate-600
    ctx.font = 'bold 10px monospace';
    ctx.fillText(phone || 'N/A', 18, 368);

    // Divider Line at y = 380
    ctx.beginPath();
    ctx.moveTo(18, 380);
    ctx.lineTo(282, 380);
    ctx.stroke();

    // System secure stamp label at y = 394
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 7px system-ui, -apple-system, sans-serif';
    ctx.fillText('SYSTEM DIGITALLY SECURED CARD', 18, 394);

    // Outer border lines of the badge to complete framing
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(4, 4, 292, 402);

    // Trigger download action
    const link = document.createElement('a');
    link.download = `BADGE_${roll.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  try {
    // Attempt download with all parameters (CORS permitting)
    await drawAndExport(!!schoolLogoUrl, !!photoUrl);
  } catch (err: any) {
    console.warn("CORS Security Error or tainted canvas detected. Trying fallback level 1 (with photo, no logo logo)...", err);
    try {
      // Fallback 1: Try without school logo (often external school logo causes tainted errors)
      await drawAndExport(false, !!photoUrl);
    } catch (err2: any) {
      console.warn("Fallback level 1 failed. Trying fallback level 2 (with logo, no photo)...", err2);
      try {
        // Fallback 2: Try without photoUrl (if photoUrl from external domain tainted the canvas)
        await drawAndExport(!!schoolLogoUrl, false);
      } catch (err3: any) {
        console.warn("Fallback level 2 failed. Drawing strictly vector badge elements with no external graphics...", err3);
        try {
          // Fallback 3: No external images at all - absolute fail-proof clean canvas
          await drawAndExport(false, false);
        } catch (ultimateError: any) {
          console.error("All canvas badge rendering fallbacks failed:", ultimateError);
        }
      }
    }
  }
}
