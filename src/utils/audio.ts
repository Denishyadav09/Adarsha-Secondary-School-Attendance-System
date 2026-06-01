/**
 * Uses Web Audio API to play a pleasing confirmation beep on successful QR scan
 */
export function playSuccessBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    
    // Quick rising dual-tone chime
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime); 
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
    console.log("Audio feedback suppressed by browser auto-play policy:", e);
  }
}

/**
 * Plays a low warning buzz for duplicate/invalid scans
 */
export function playErrorBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // Low note
    oscillator.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.25);
    
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.25);
  } catch (e) {
    console.log("Audio feedback suppressed:", e);
  }
}

/**
 * Speaks a welcome message using the Web Speech API Synthesis
 */
export function speakWelcome(studentName: string) {
  try {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech to avoid backlog lag if scanning rapidly
      window.speechSynthesis.cancel();
      
      const text = `Welcome ${studentName}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // Natural speed
      utterance.pitch = 1.0;  // Standard warm pitch
      
      // Query available voices
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        // Look for English or high-quality vocal engines
        const englishVoice = voices.find(v => 
          v.lang.toLowerCase().startsWith('en') && 
          (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('microsoft'))
        ) || voices.find(v => v.lang.toLowerCase().startsWith('en')) || voices[0];
        
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Speech Synthesis not supported in this browser.");
    }
  } catch (e) {
    console.error("Speech Synthesis error:", e);
  }
}

/**
 * Speaks a denial message when the student has already checked in today
 */
export function speakDeniedAlreadyDone(studentName: string) {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const text = `${studentName} your attendance already done`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 0.95; // Slightly lower warm/polite pitch for apology info
      
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const englishVoice = voices.find(v => 
          v.lang.toLowerCase().startsWith('en') && 
          (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('microsoft'))
        ) || voices.find(v => v.lang.toLowerCase().startsWith('en')) || voices[0];
        
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Speech Synthesis not supported in this browser.");
    }
  } catch (e) {
    console.error("Speech Synthesis error:", e);
  }
}

/**
 * Plays a mechanical camera shutter sound using Web Audio API to indicate security photo capture
 */
export function playCameraShutter() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create random white noise for the shutter click
    const bufferSize = audioCtx.sampleRate * 0.12; // 0.12 seconds
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, audioCtx.currentTime);
    filter.frequency.linearRampToValueAtTime(8000, audioCtx.currentTime + 0.08);
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.11);
    
    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noiseNode.start();
    noiseNode.stop(audioCtx.currentTime + 0.12);
  } catch (e) {
    console.log("Audio feedback suppressed:", e);
  }
}



