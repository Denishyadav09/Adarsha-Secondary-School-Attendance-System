import { useState, useEffect, useRef, FormEvent, Fragment } from 'react';
import { 
  GraduationCap, 
  Users, 
  UserCheck, 
  Clock, 
  PlusCircle, 
  Download, 
  FileSpreadsheet, 
  Trash2, 
  RefreshCw, 
  Search, 
  UserX,
  Sparkles,
  QrCode,
  AlertCircle,
  Mail,
  Phone,
  User,
  Image as ImageIcon,
  Calendar,
  Bell,
  Send,
  History,
  Inbox,
  CheckCircle2,
  Lock,
  Camera,
  Volume2,
  VolumeX,
  TrendingUp
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ScannerPanel from './components/ScannerPanel';
import { generateQrDataUrl, downloadStudentBadge } from './utils/qrUtils';
import { Student, AttendanceRecord, AttendanceStats, AttendanceReminder, NotificationLog } from './types';
import schoolBg from './assets/images/school_bg_new_1779465937924.png';
import schoolLogo from './assets/images/adarsha_school_logo_1779285532735.png';
import NepaliDate from 'nepali-date-converter';
import { motion, AnimatePresence } from 'motion/react';

const getBsDateString = (date: Date) => {
  try {
    const npDate = new NepaliDate(date);
    const yr = npDate.getYear();
    const mo = npDate.getMonth();
    const dt = npDate.getDate();
    
    const nepaliMonths = ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
    const nepaliMonthsNp = ['वैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'];
    const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    
    const getNpDigits = (num: number) => {
      return num.toString().split('').map(digit => {
        const dNum = parseInt(digit, 10);
        return isNaN(dNum) ? digit : nepaliDigits[dNum];
      }).join('');
    };

    const monthName = nepaliMonths[mo] || 'Baisakh';
    const monthNp = nepaliMonthsNp[mo] || 'वैशाख';
    
    const weekday = date.toLocaleDateString([], { weekday: 'short' });
    
    return `${weekday}, ${monthName} ${dt}, ${yr} B.S. (${monthNp} ${getNpDigits(dt)}, ${getNpDigits(yr)})`;
  } catch (e) {
    console.error("B.S. date conversion failed:", e);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
};

const getBsShortString = (date: Date) => {
  try {
    const npDate = new NepaliDate(date);
    const yr = npDate.getYear();
    const mo = String(npDate.getMonth() + 1).padStart(2, '0');
    const dt = String(npDate.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dt}`;
  } catch (e) {
    return date.toLocaleDateString();
  }
};

const getBsDateLabelShort = (dateStr: string) => {
  if (!dateStr || dateStr === 'All') return 'All Dates';
  try {
    const parts = dateStr.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const npDate = new NepaliDate(d);
    const yr = npDate.getYear();
    const mo = npDate.getMonth();
    const dt = npDate.getDate();
    const nepaliMonths = ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
    const monthName = nepaliMonths[mo] || 'Baisakh';
    return `${monthName} ${dt}, ${yr} B.S.`;
  } catch (e) {
    return dateStr;
  }
};

const getDaysInNepaliMonth = (year: number, monthIndex: number) => {
  for (let d = 32; d >= 28; d--) {
    const temp = new NepaliDate(year, monthIndex, 1);
    temp.setDate(d);
    if (temp.getMonth() === monthIndex && temp.getYear() === year) {
      return d;
    }
  }
  return 30; // fallback
};


const SUGGESTION_CHIPS = [
  { label: "QR हाजिरी कसरी गर्ने?", question: "हाजिरी स्क्यान कसरी गर्ने भनेर सिकाउनुहोस्।" },
  { label: "QR ब्याज बनाउने तरिका", question: "विद्यार्थीको QR आईडी ब्याज कसरी सिर्जना गर्ने र डाउनलोड गर्ने?" },
  { label: "दैनिक लिमिट नियम", question: "विद्यार्थीले दिनमा ४ पटक भन्दा बढी स्क्यान गर्न किन पाउँदैनन्?" },
  { label: "CSV रिपोर्ट डाउनलोड", question: "फिल्टर गरिएको हाजिरी रेकर्ड CSV फाइलमा कसरी निर्यात गर्ने?" },
  { label: "बायोमेट्रिक सुरक्षा", question: "बायोमेट्रिक सुरक्षा तथा फोटो भेरिफिकेसन प्रणाली के हो?" }
];

const parseBoldText = (text: string) => {
  const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-extrabold text-white text-[12.5px] tracking-wide">{part}</strong>;
    }
    return part;
  });
};

const renderMessageContent = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-xs text-slate-100 font-sans leading-relaxed">
      {lines.map((line, idx) => {
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          const cleanLine = line.trim().slice(2);
          return (
            <div key={idx} className="flex items-start space-x-1.5 pl-2 animate-fadeIn">
              <span className="text-blue-400 text-[10px] mt-0.5">•</span>
              <span>{parseBoldText(cleanLine)}</span>
            </div>
          );
        }
        
        const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start space-x-1.5 pl-2 animate-fadeIn">
              <span className="text-amber-400 font-bold text-[9px] mt-0.5">{numMatch[1]}.</span>
              <span>{parseBoldText(numMatch[2])}</span>
            </div>
          );
        }

        return <p key={idx} className="min-h-[6px] animate-fadeIn">{parseBoldText(line)}</p>;
      })}
    </div>
  );
};


export default function App() {
  // --- STATE ---
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('qr_attendance_students');
    const parsed: Student[] = saved ? JSON.parse(saved) : [];
    const seen = new Set<string>();
    const deduped: Student[] = [];
    for (const s of parsed) {
      if (!s.roll) continue;
      const key = s.roll.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(s);
      }
    }
    if (parsed.length !== deduped.length) {
      localStorage.setItem('qr_attendance_students', JSON.stringify(deduped));
    }
    return deduped;
  });

  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('qr_attendance_records');
    const parsed: AttendanceRecord[] = saved ? JSON.parse(saved) : [];
    
    // Auto-Correct: Deduplicate any pre-existing duplicates on startup.
    // We keep only the first/earliest check-in for each student's roll per calendar day.
    const seen = new Set<string>();
    const sortedAsc = [...parsed].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const deduped: AttendanceRecord[] = [];
    
    for (const rec of sortedAsc) {
      if (!rec.roll || !rec.timestamp) continue;
      const getFormattedLocalDate = (timestampStr: string) => {
        const d = new Date(timestampStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      
      const key = `${rec.roll.toLowerCase()}_${getFormattedLocalDate(rec.timestamp)}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(rec);
      }
    }
    
    // Sort back to descending order (latest check-in first)
    const finalRecords = deduped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    localStorage.setItem('qr_attendance_records', JSON.stringify(finalRecords));
    return finalRecords;
  });

  // Hot reference cache to prevent parallel scan race conditions
  const studentsRef = useRef<Student[]>([]);
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  const recordsRef = useRef<AttendanceRecord[]>([]);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  // Automated reminders and logs state
  const [reminders, setReminders] = useState<AttendanceReminder[]>(() => {
    const saved = localStorage.getItem('qr_attendance_reminders');
    const defaultTime = new Date(Date.now() + 60000).toISOString().slice(0, 16); // 1 min from now
    return saved ? JSON.parse(saved) : [
      {
        id: 'rem_1',
        title: 'Morning Class Call-In',
        dateTime: defaultTime,
        targetClass: 'All',
        channel: 'Both',
        isSent: false,
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>(() => {
    const saved = localStorage.getItem('qr_attendance_notification_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Clock state for kiosk banner
  const [currentTime, setCurrentTime] = useState(new Date());

  // Form input states
  const [formName, setFormName] = useState('');
  const [formRoll, setFormRoll] = useState('');
  const [formClass, setFormClass] = useState('Einstein');
  const [customClass, setCustomClass] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGuardian, setFormGuardian] = useState('');
  const [formPhoto, setFormPhoto] = useState<string>('');

  // Schedulers Form State
  const [remTitle, setRemTitle] = useState('');
  const [remClass, setRemClass] = useState('All');
  const [remDateTime, setRemDateTime] = useState('');
  const [remChannel, setRemChannel] = useState<'Email' | 'Browser Notification' | 'Both'>('Both');

  // Interactive tab configuration for the right side bento layout
  const [rightActiveTab, setRightActiveTab] = useState<'directory' | 'reminders' | 'ai-guide'>('ai-guide');

  // AI Assist / Onboarding Tutor Chat State
  const [aiHistory, setAiHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content: `👋 **क्युआर हाजिरी प्रणालीमा स्वागत छ!** म तपाईंको सहयोगी एआई शिक्षक **Scanner Buddy** हुँ।

म तपाईंलाई यो सफ्टवेयर चलाउन सिकाउनेछु। सुरु गर्न निम्न विषयहरू सोध्न सक्नुहुन्छ:
- नयाँ विद्यार्थीको **दर्ता** कसरी गर्ने र फोटो राख्ने?
- विद्यार्थीको **QR आईडी कार्ड (ब्याज)** कसरी बनाउने?
- क्यामेराबाट हाजिरी वा फोटो **अपलोड गरेर हाजिरी** कसरी लिने?
- सुरक्षा नियम अन्तर्गत विद्यार्थीले दिनमा बढीमा **१ पटक मात्र स्क्यान** किन गर्न सक्छन्?
- हाजिरी रेकर्डहरू फिल्टर गरेर **CSV एक्सेल रिपोर्ट** कसरी डाउनलोड गर्ने?

तलको बटनहरू थिच्नुहोस् वा आफैले खोजेको प्रश्न टाइप गर्नुहोस्! आज म कसरी मद्दत गरूँ?`
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Text-To-Speech (Speech Synthesis) for Nepali text
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    return localStorage.getItem('ai_auto_speak') === 'true';
  });

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIndex(null);
    }
  };

  const speakText = (text: string, index: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    if (speakingMsgIndex === index) {
      stopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();

    // Clean up text format so synthesis is clean
    const cleanText = text
      .replace(/\*\*|__|\*|_/g, '') // remove markdown bold/regular highlights
      .replace(/👋|⚠️|👉|💡|✅|🌟|📎|📝/g, '') // remove modern emojis
      .replace(/B\.S\./gi, 'बिक्रम सम्बत')
      .replace(/CSV/gi, 'सी एस भी')
      .replace(/QR/gi, 'क्यु आर')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ne-NP';

    // Prioritize natural voices
    const voices = window.speechSynthesis.getVoices();
    const nepaliVoice = voices.find(v => v.lang.startsWith('ne') || v.lang.includes('NP'));
    const hindiVoice = voices.find(v => v.lang.startsWith('hi'));

    if (nepaliVoice) {
      utterance.voice = nepaliVoice;
    } else if (hindiVoice) {
      utterance.voice = hindiVoice; // Hindi voice outputs Devanagari character sets perfectly
    }

    utterance.rate = 0.92; // highly clear, slightly pacing down for premium school audit sound

    utterance.onend = () => {
      setSpeakingMsgIndex(null);
    };

    utterance.onerror = () => {
      setSpeakingMsgIndex(null);
    };

    setSpeakingMsgIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const speakEnglishWelcome = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      
      // Exact string from user: Welcome to Adarsh Smart QR Attendance System
      const utterance = new SpeechSynthesisUtterance("Welcome to Adarsh Smart QR Attendance System");
      utterance.lang = 'en-US';
      
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en-US')) || 
                           voices.find(v => v.lang.startsWith('en')) || 
                           voices.find(v => v.lang.includes('US') || v.lang.includes('GB'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      utterance.rate = 0.88; // Elegantly smooth and warm speaking rate
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error on welcome greeting:", e);
    }
  };

  useEffect(() => {
    // Warm up the speech synthesis voices list on component mount
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  const handleToggleAutoSpeak = () => {
    const newVal = !autoSpeak;
    setAutoSpeak(newVal);
    localStorage.setItem('ai_auto_speak', String(newVal));
    if (!newVal) {
      stopSpeaking();
    }
  };

  const handleSendAiMessage = async (textToSend?: string) => {
    const prompt = (textToSend || aiInput).trim();
    if (!prompt) return;

    if (!textToSend) {
      setAiInput('');
    }
    setAiError(null);
    setIsAiLoading(true);
    stopSpeaking();

    const newUserMsg = { role: 'user' as const, content: prompt };
    const updatedHistory = [...aiHistory, newUserMsg];
    setAiHistory(updatedHistory);

    try {
      const response = await fetch('/api/ai-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: updatedHistory
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status code ${response.status}`);
      }

      const data = await response.json();
      const newMsg = { role: 'assistant' as const, content: data.text };
      setAiHistory(prev => {
        const updated = [...prev, newMsg];
        if (autoSpeak) {
          setTimeout(() => {
            speakText(data.text, updated.length - 1);
          }, 100);
        }
        return updated;
      });
    } catch (err: any) {
      console.error("AI Assistant request failed:", err);
      setAiError(err.message || "Unable to reach the AI Assistant.");
      
      const fallbackMsg = { 
        role: 'assistant' as const, 
        content: `⚠️ **एआई सेवा अफलाइन (AI Service Offline)**: अहिले सर्भरसँग सम्पर्क हुन सकेन।

**कृपया यो सामान्य सहयोग पुस्तिका हेर्नुहोस्:**
1. **विद्यार्थी दर्ता (Register)**: बायाँ फारममा विद्यार्थीको नाम, रोल नम्बर र कक्षा हाल्नुहोस्।
2. **हाजिरी स्क्यान (Scan)**: क्युआर कोड क्यामेरा अगाडि देखाउनुहोस् वा फाइल ड्र्याग-ड्रप गरी अपलोड गर्नुहोस्!
3. **दैनिक सीमा नियम (Limit)**: दोहोरो हाजिरी रोक्न एउटा विद्यार्थीले १ दिनमा बढीमा **१ पटक मात्र हाजिरी** गर्न पाउँछ।
4. **CSV एक्सेल फाइल**: "Export CSV Logs" थिचेर आफूले हेरिरहेको कक्षाको हाजिरी फाइल सिधै डाउनलोड गर्नुहोस्।

*यदि यो अफलाइन आइरह्यो भने परियोजना सेटिङमा GEMINI_API_KEY राखेको सुनिश्चित गर्नुहोस्।*` 
      };

      setAiHistory(prev => {
        const updated = [...prev, fallbackMsg];
        if (autoSpeak) {
          setTimeout(() => {
            speakText(fallbackMsg.content, updated.length - 1);
          }, 100);
        }
        return updated;
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Filter logs vs active logs tab inside reminder hub
  const [reminderHubSubTab, setReminderHubSubTab] = useState<'scheduler' | 'logs'>('scheduler');

  // Authentication credentials states
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('school_admin_authorized') === 'true';
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginStep, setLoginStep] = useState(0);

  // Currently generated/selected student preview state
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');
  const [selectedModalPhoto, setSelectedModalPhoto] = useState<{ url: string; name: string; roll: string; timestamp: string } | null>(null);

  // Table search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('Einstein');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // B.S. Date selection popover core states
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [viewBsYear, setViewBsYear] = useState<number>(() => {
    try {
      return new NepaliDate().getYear();
    } catch (e) {
      return 2081;
    }
  });
  const [viewBsMonth, setViewBsMonth] = useState<number>(() => {
    try {
      return new NepaliDate().getMonth();
    } catch (e) {
      return 1;
    }
  });

  const handleOpenDatePicker = () => {
    if (selectedDateFilter && selectedDateFilter !== 'All') {
      try {
        const parts = selectedDateFilter.split('-');
        const adDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const np = new NepaliDate(adDate);
        setViewBsYear(np.getYear());
        setViewBsMonth(np.getMonth());
      } catch (e) {
        // fallback
      }
    } else {
      const np = new NepaliDate();
      setViewBsYear(np.getYear());
      setViewBsMonth(np.getMonth());
    }
    setIsDatePickerOpen(true);
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr || dateStr === 'All') return 'All Dates';
    const todayStr = new Date().toISOString().split('T')[0];
    
    try {
      const parts = dateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const npDate = new NepaliDate(d);
      const yr = npDate.getYear();
      const mo = npDate.getMonth();
      const dt = npDate.getDate();
      const nepaliMonths = ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
      const monthName = nepaliMonths[mo] || 'Baisakh';
      
      if (dateStr === todayStr) {
        return `Today's (${monthName} ${dt}, ${yr} B.S.)`;
      }
      return `${monthName} ${dt}, ${yr} B.S.`;
    } catch (e) {
      return dateStr;
    }
  };

  // School metadata customizable title
  const [schoolName, setSchoolName] = useState(() => {
    const saved = localStorage.getItem('school_name');
    if (!saved || saved === 'Sree Ramakrishna Shishu Tirtha') {
      localStorage.setItem('school_name', 'Adarsha Secondary School');
      return 'Adarsha Secondary School';
    }
    return saved;
  });
  const [isEditingSchool, setIsEditingSchool] = useState(false);

  // School start and late threshold times (configurable operation hours)
  const [schoolStartTime, setSchoolStartTime] = useState(() => {
    return localStorage.getItem('school_start_time') || '10:00';
  });
  const [schoolLateTime, setSchoolLateTime] = useState(() => {
    return localStorage.getItem('school_late_time') || '10:15';
  });

  useEffect(() => {
    localStorage.setItem('school_start_time', schoolStartTime);
  }, [schoolStartTime]);

  useEffect(() => {
    localStorage.setItem('school_late_time', schoolLateTime);
  }, [schoolLateTime]);

  // Success alert overlay for student creation
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Ask for Web notification permissions
  const [notifPermission, setNotifPermission] = useState(typeof window !== 'undefined' ? Notification.permission : 'default');

  const requestNotificationAccess = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
    }
  };

  // --- MUTUAL SYNCHRONIZATION TO LOCAL STORAGE ---
  useEffect(() => {
    localStorage.setItem('qr_attendance_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('qr_attendance_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('qr_attendance_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('qr_attendance_notification_logs', JSON.stringify(notificationLogs));
  }, [notificationLogs]);

  // Updating current time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Live helper for Nepali speech and description text of selected timings
  const getNepaliDescription = () => {
    const toNepaliDigits = (numStr: string) => {
      const numerals: { [key: string]: string } = {
        '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
        '5': '५', '6': '६', '7': '७', '8': '८', '9': '९', ':': ':'
      };
      return numStr.toString().split('').map(char => numerals[char] || char).join('');
    };

    const startStr = schoolStartTime ? toNepaliDigits(schoolStartTime) : '१०:००';
    const lateStr = schoolLateTime ? toNepaliDigits(schoolLateTime) : '१०:१५';

    return `बिहान ${startStr} बजेदेखि हाजिरी सुरु हुन्छ। ${lateStr} बजेभन्दा अगाडि आइपुग्ने विद्यार्थी "Present" (✅) हुनेछन् र ${lateStr} बजे वा सोभन्दा पछि आउनेहरू "Late" (⚠️) मानिनेछन्।`;
  };

  // Set default preview on mount
  useEffect(() => {
    if (students.length > 0 && !previewStudent) {
      updateBadgePreview(students[0]);
    }
  }, [students, previewStudent]);

  // Scroll AI Chat box to the bottom when history shifts or loader turns on
  useEffect(() => {
    const scroller = document.getElementById('ai-chat-scroller');
    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [aiHistory, isAiLoading]);

  // --- REMINDERS AUTOMATED CHECKS ENGINE ---
  useEffect(() => {
    const checkReminders = setInterval(() => {
      const now = new Date();
      let updatedStatus = false;
      
      const newReminders = reminders.map(rem => {
        const remTime = new Date(rem.dateTime);
        if (now >= remTime && !rem.isSent) {
          updatedStatus = true;
          
          // Identify targeted student cohort
          const eligibleStudents = students.filter(
            s => rem.targetClass === 'All' || s.classSection === rem.targetClass
          );
          
          const logs: NotificationLog[] = [];
          
          eligibleStudents.forEach(st => {
            const hasEmail = st.email && st.email.includes('@');
            const targetEmail = hasEmail ? st.email! : `${st.roll}@institutional.edu`;
            
            if (rem.channel === 'Email' || rem.channel === 'Both') {
              logs.push({
                id: `log_email_${Date.now()}_${st.roll}`,
                roll: st.roll,
                studentName: st.name,
                type: 'Email',
                timestamp: new Date().toISOString(),
                address: targetEmail,
                subject: `⚠️ ATTENDANCE PROMPT: ${rem.title}`,
                message: `Hi ${st.name}, this is an automated attendance reminder for ${rem.title} from ${schoolName}. Perfect score, start checking in now!`,
                status: 'Delivered'
              });
            }
            if (rem.channel === 'Browser Notification' || rem.channel === 'Both') {
              logs.push({
                id: `log_browser_${Date.now()}_${st.roll}`,
                roll: st.roll,
                studentName: st.name,
                type: 'Browser',
                timestamp: new Date().toISOString(),
                address: 'Active Interface API Hub',
                subject: rem.title,
                message: `URGENT ALERT: Head to student kiosk to scan roll #${st.roll} for the scheduled ${rem.title}.`,
                status: 'Delivered'
              });
            }
          });

          if (logs.length > 0) {
            setNotificationLogs(prev => [...logs, ...prev]);
          }

          // Trigger standard desktop system alerts
          if (Notification.permission === 'granted' && (rem.channel === 'Browser Notification' || rem.channel === 'Both')) {
            new Notification(`School Reminder: ${rem.title}`, {
              body: `Automated prompts successfully dispatched to ${eligibleStudents.length} students!`,
              icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
            });
          }

          // Trigger screen toast feedback with sound
          setSuccessToast(`🔔 CRON Automated alert "${rem.title}" triggered! Dispatched reminders to ${eligibleStudents.length} student records.`);
          setTimeout(() => setSuccessToast(null), 7000);

          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 octave
            osc.frequency.linearRampToValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5 
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
          } catch(e) {}

          return { ...rem, isSent: true };
        }
        return rem;
      });

      if (updatedStatus) {
        setReminders(newReminders);
      }
    }, 4000);

    return () => clearInterval(checkReminders);
  }, [reminders, students, schoolName]);


  // --- ACTIONS ---
  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanUsername = usernameInput.trim();
    const cleanPassword = passwordInput;

    if (cleanUsername === 'Adarsha school' && cleanPassword === 'Adarsh12345') {
      setLoginError(null);
      setIsLoggingIn(true);
      setLoginStep(0);
      
      // Multi-step staggered credentials Verification animation
      const t1 = setTimeout(() => {
        setLoginStep(1); // School DB connection loading
      }, 800);

      const t2 = setTimeout(() => {
        setLoginStep(2); // Redirecting sequence started
      }, 1600);

      const t3 = setTimeout(() => {
        setIsAdmin(true);
        localStorage.setItem('school_admin_authorized', 'true');
        setIsLoggingIn(false);
        setLoginStep(0);
        setUsernameInput('');
        setPasswordInput('');
        speakEnglishWelcome();
      }, 2500);
    } else {
      setLoginError('Invalid Administrator Username or Password combination. Please re-enter.');
      // Web Audio API feedback error buzz
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, audioCtx.currentTime); // Low buzz
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch(ex) {}
    }
  };

  const handleUpdateSchoolName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      setSchoolName(trimmed);
      localStorage.setItem('school_name', trimmed);
    }
    setIsEditingSchool(false);
  };

  const updateBadgePreview = async (student: Student) => {
    setPreviewStudent(student);
    try {
      const url = await generateQrDataUrl(student.roll, student.name);
      setPreviewQrUrl(url);
    } catch (err) {
      console.error('Error generating preview QR:', err);
    }
  };

  const handleRegisterStudent = async (e: FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    const roll = formRoll.trim();
    const classVal = formClass === 'Custom' ? customClass.trim() : formClass;

    if (!name || !roll || !classVal) {
      alert('Please fill out all student fields.');
      return;
    }

    // Check duplication
    if (students.some(s => s.roll.toLowerCase() === roll.toLowerCase())) {
      alert(`Student with Roll Number "${roll}" already exists in the institutional records.`);
      return;
    }

    const newStudent: Student = {
      roll,
      name,
      classSection: classVal,
      createdAt: new Date().toISOString(),
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
      guardian: formGuardian.trim() || undefined,
      photoUrl: formPhoto || undefined
    };

    const updatedStudents = [newStudent, ...students];
    setStudents(updatedStudents);
    setFormName('');
    setFormRoll('');
    setCustomClass('');
    setFormEmail('');
    setFormPhone('');
    setFormGuardian('');
    setFormPhoto('');
    
    // Auto-update generated preview badge
    updateBadgePreview(newStudent);

    // Trigger feedback Toast
    setSuccessToast(`Registered ${name} successfully with a digital student profile!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleCreateReminder = (e: FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim() || !remDateTime) {
      alert('Please fill in title and schedule date-time.');
      return;
    }

    const newReminder: AttendanceReminder = {
      id: `rem_${Date.now()}`,
      title: remTitle.trim(),
      dateTime: remDateTime,
      targetClass: remClass,
      channel: remChannel,
      isSent: false,
      createdAt: new Date().toISOString()
    };

    setReminders([newReminder, ...reminders]);
    setRemTitle('');
    setRemDateTime('');
    
    setSuccessToast(`🗓️ Attendance threshold reminder scheduler set successfully for ${new Date(remDateTime).toLocaleString()}!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const handleWipeReminderLogs = () => {
    if (window.confirm('Wipe automated prompt delivery logs?')) {
      setNotificationLogs([]);
    }
  };

  const handleManualScan = (roll: string, name: string, capturedPhotoUrl?: string): { isNew: boolean; message: string; success: boolean } => {
    // 1. Locate student in registered list using fresh ref
    const foundStudent = studentsRef.current.find(s => s.roll.toLowerCase() === roll.trim().toLowerCase());
    
    // Auto registering if not exists in records yet to maintain robustness
    let finalStudentName = name.trim();
    let finalClassSection = 'Unassigned';

    if (!foundStudent) {
      const autoRegistered: Student = {
        roll: roll.trim(),
        name: name.trim(),
        classSection: 'Auto-Kiosk',
        createdAt: new Date().toISOString()
      };
      setStudents(prev => {
        if (prev.some(s => s.roll.toLowerCase() === roll.trim().toLowerCase())) {
          return prev;
        }
        const updated = [...prev, autoRegistered];
        studentsRef.current = updated;
        return updated;
      });
      finalStudentName = autoRegistered.name;
      finalClassSection = autoRegistered.classSection;
    } else {
      finalStudentName = foundStudent.name;
      finalClassSection = foundStudent.classSection || 'Unassigned';
    }

    // Helper for robust calendar day matching
    const getFormattedLocalDate = (timestampStr: string) => {
      const d = new Date(timestampStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Base check-in date matching selectedDateFilter or today
    const targetDateStr = (selectedDateFilter && selectedDateFilter !== 'All') 
      ? selectedDateFilter
      : getFormattedLocalDate(new Date().toISOString());

    // 3. Prevent duplicate check-in (Enforce strict max 1 scan per day limit)
    // Finding check-ins for this student on target date inside recordsRef.current (immediate synchronous check)
    const existingCheckInsToday = recordsRef.current.filter(
      r => r.roll.toLowerCase() === roll.trim().toLowerCase() && getFormattedLocalDate(r.timestamp) === targetDateStr
    );

    let recordTimestamp = new Date().toISOString();
    if (selectedDateFilter && selectedDateFilter !== 'All') {
      const todayTime = new Date();
      const parts = selectedDateFilter.split('-');
      const mergedDate = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
        todayTime.getHours(),
        todayTime.getMinutes(),
        todayTime.getSeconds()
      );
      recordTimestamp = mergedDate.toISOString();
    }

    // 2. Determine Attendance Status based on Arrival Time compared with configurable threshold
    const checkInDate = new Date(recordTimestamp);
    const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
    
    const timeToMinutes = (timeStr: string) => {
      const parts = (timeStr || "10:15").split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return h * 60 + m;
    };

    const lateThresholdMinutes = timeToMinutes(schoolLateTime);
    const statusVal: 'Present' | 'Late' = checkInMinutes >= lateThresholdMinutes ? 'Late' : 'Present';

    if (existingCheckInsToday.length >= 1) {
      const lastRec = existingCheckInsToday[0];
      const formattedTime = new Date(lastRec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        isNew: false,
        success: false,
        message: `Attendance Denied. Student #${roll} has already checked in today at ${formattedTime}. Duplicate scans are not allowed.`
      };
    }

    // Standard fresh check-in
    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      roll: roll.trim(),
      name: finalStudentName,
      classSection: finalClassSection,
      status: statusVal,
      timestamp: recordTimestamp,
      capturedPhotoUrl: capturedPhotoUrl || foundStudent?.photoUrl
    };

    // Use state setter with internal double checking before prepending
    let isAlreadyAddedInsidePrev = false;
    setRecords(prev => {
      const isDub = prev.some(
        r => r.roll.toLowerCase() === roll.trim().toLowerCase() && getFormattedLocalDate(r.timestamp) === targetDateStr
      );
      if (isDub) {
        isAlreadyAddedInsidePrev = true;
        return prev;
      }
      const updated = [newRecord, ...prev];
      recordsRef.current = updated;
      return updated;
    });

    if (isAlreadyAddedInsidePrev) {
      // Fetch matching record to show proper warning
      const firstRec = recordsRef.current.find(
        r => r.roll.toLowerCase() === roll.trim().toLowerCase() && getFormattedLocalDate(r.timestamp) === targetDateStr
      );
      const formattedTime = firstRec 
        ? new Date(firstRec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'earlier';
      return {
        isNew: false,
        success: false,
        message: `Attendance Denied. Student #${roll} has already checked in today at ${formattedTime}. Duplicate scans are not allowed.`
      };
    }

    return {
      isNew: true,
      success: true,
      message: `Marked ${statusVal} at ${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    };
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm('Are you sure you want to delete this check-in entry?')) {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleWipeRecords = () => {
    if (window.confirm('⚠️ CRITICAL WARNING: This will permanently delete today\'s logged attendance records. Do you wish to proceed?')) {
      setRecords([]);
    }
  };

  const handleDeleteStudent = (roll: string) => {
    if (window.confirm(`Are you sure you want to remove student (Roll: ${roll})? This will unregister their credentials.`)) {
      setStudents(prev => prev.filter(s => s.roll !== roll));
      if (previewStudent?.roll === roll) {
        setPreviewStudent(null);
        setPreviewQrUrl('');
      }
    }
  };

  const handleExportCSV = () => {
    const listToExport = filteredRecords;
    if (listToExport.length === 0) {
      alert('No attendance entries to export.');
      return;
    }

    const headers = ['Record ID', 'Roll Number', 'Student Name', 'Class/Section', 'Date Checked-In', 'Time Checked-In', 'Status'];
    const rows = listToExport.map(r => {
      const d = new Date(r.timestamp);
      return [
        r.id,
        `"${r.roll}"`,
        `"${r.name}"`,
        `"${r.classSection || 'Unassigned'}"`,
        `"${getBsShortString(d)} B.S."`,
        d.toLocaleTimeString(),
        r.status
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const suffix = selectedDateFilter === 'All' ? 'All_Logs' : selectedDateFilter;
    link.setAttribute("download", `Attendance_Export_${suffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- STATS COMPUTATION ---
  // Stats represent the currently selected view date, or today as default if viewing "All Dates"
  const statsDateStr = (selectedDateFilter && selectedDateFilter !== 'All') 
    ? selectedDateFilter 
    : new Date().toISOString().split('T')[0];

  const targetDateRecords = records.filter(r => new Date(r.timestamp).toISOString().split('T')[0] === statsDateStr);
  
  // Unique students scanned on this date
  const uniqueAttendeesToday = new Set(targetDateRecords.map(r => r.roll.toLowerCase()));
  const totalStudents = students.length;
  const presentCount = uniqueAttendeesToday.size;
  const lateCount = targetDateRecords.filter(r => r.status === 'Late').reduce((set, rec) => {
    set.add(rec.roll.toLowerCase());
    return set;
  }, new Set<string>()).size;

  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  // --- WEEKLY TREND ANALYSIS COMPUTATION ---
  const getWeeklyAttendanceTrend = () => {
    const startOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day;
      const sun = new Date(d.setDate(diff));
      sun.setHours(0,0,0,0);
      return sun;
    };

    const weekMap: { [key: string]: { records: AttendanceRecord[]; dates: Set<string> } } = {};
    
    // Automatically generate placeholder keys for the last 6 weeks so chart always has context
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - i * 7);
      const sun = startOfWeek(pastDate);
      const key = sun.toISOString().split('T')[0];
      weekMap[key] = { records: [], dates: new Set() };
    }

    records.forEach(rec => {
      try {
        const d = new Date(rec.timestamp);
        const sun = startOfWeek(d);
        const key = sun.toISOString().split('T')[0];
        const dateStr = d.toISOString().split('T')[0];
        
        if (!weekMap[key]) {
          weekMap[key] = { records: [], dates: new Set() };
        }
        weekMap[key].records.push(rec);
        weekMap[key].dates.add(dateStr);
      } catch (err) {}
    });

    const trendData = Object.keys(weekMap).sort().map(key => {
      const weekInfo = weekMap[key];
      const sunDate = new Date(key);
      const satDate = new Date(sunDate);
      satDate.setDate(sunDate.getDate() + 6);
      
      const formatMonthDay = (d: Date) => {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };
      const label = `${formatMonthDay(sunDate)} - ${formatMonthDay(satDate)}`;
      
      const activeDaysCount = weekInfo.dates.size;
      const totalStuds = students.length;
      
      let rate = 0;
      if (totalStuds > 0 && activeDaysCount > 0) {
        const uniqueCheckIns = new Set<string>();
        weekInfo.records.forEach(r => {
          try {
            const dateStr = new Date(r.timestamp).toISOString().split('T')[0];
            uniqueCheckIns.add(`${r.roll.toLowerCase()}_${dateStr}`);
          } catch(e){}
        });
        
        const actualScans = uniqueCheckIns.size;
        const potentialScans = totalStuds * activeDaysCount;
        rate = Math.round((actualScans / potentialScans) * 100);
      } else {
        if (records.length === 0) {
          const mockRates: { [key: number]: number } = { 0: 82, 1: 85, 2: 89, 3: 84, 4: 91, 5: 95 };
          const weekIndex = Math.round((today.getTime() - sunDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
          rate = mockRates[(5 - weekIndex) % 6] || 85;
        } else {
          rate = 0;
        }
      }

      return {
        week: label,
        rate: Math.min(100, Math.max(0, rate)),
      };
    });

    return trendData;
  };

  // Class sections drop-down generator
  const classSectionsList = Array.from(new Set([
    'Einstein',
    'Hawkins',
    'Newton',
    'Kelvin',
    'Pascal',
    'Robbins',
    'Darwin',
    'Faraday',
    ...students.map(s => s.classSection || 'Unassigned')
  ])).filter(c => c !== 'Custom' && c !== 'All');

  // Filter records
  const filteredRecords = records.filter(rec => {
    const matchesSearch = rec.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          rec.roll.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClassFilter === 'All' || rec.classSection === selectedClassFilter;
    const matchesStatus = statusFilter === 'All' || rec.status === statusFilter;
    
    // Date filter
    let matchesDate = true;
    if (selectedDateFilter && selectedDateFilter !== 'All') {
      const recDate = new Date(rec.timestamp).toISOString().split('T')[0];
      matchesDate = recDate === selectedDateFilter;
    }
    
    return matchesSearch && matchesClass && matchesStatus && matchesDate;
  });

  return (
    <div 
      className="min-h-screen bg-slate-900 bg-cover bg-center bg-no-repeat bg-fixed relative flex flex-col font-sans"
      style={{ backgroundImage: `url(${schoolBg})` }}
      id="portal-wrapper-root"
    >
      {/* Dark overlay backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs z-0" />

      {/* Main Content Area */}
      <div className={`relative z-10 flex-grow flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 ${!isAdmin ? 'justify-center items-center' : ''}`}>
        
        {!isAdmin ? (
          isLoggingIn ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900/95 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-md shadow-2xl shadow-black/80 my-auto text-center flex flex-col items-center justify-center min-h-[420px]"
            >
              {/* Animated rings around the logo */}
              <div className="relative mb-6 flex items-center justify-center h-32 w-32">
                {/* Expanding pulse ring */}
                <motion.div
                  className="absolute rounded-full bg-blue-500/10 border border-blue-500/20"
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: [0.9, 1.8, 0.9], opacity: [0.6, 0.1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ width: '130px', height: '130px' }}
                />
                
                {/* Rotating accent ring */}
                <motion.div
                  className="absolute border border-dashed border-blue-500/50 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  style={{ width: '110px', height: '110px' }}
                />

                {/* Rotating secondary accent ring in opposite direction */}
                <motion.div
                  className="absolute border border-dotted border-amber-400/40 rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  style={{ width: '120px', height: '120px' }}
                />

                {/* Main animated element harboring the school logo with dynamic scale / rotation */}
                <motion.div
                  className="h-24 w-24 bg-white rounded-3xl p-1.5 flex items-center justify-center shadow-2xl border-2 border-amber-400 overflow-hidden relative z-10"
                  initial={{ scale: 0.3, rotate: -45, y: 50, opacity: 0 }}
                  animate={{ 
                    scale: [0.3, 1.15, 1],
                    rotate: [-45, 10, 0],
                    y: [50, -10, 0],
                    opacity: 1
                  }}
                  transition={{ 
                    duration: 1.2, 
                    times: [0, 0.7, 1], 
                    ease: "easeOut" 
                  }}
                >
                  <img src={schoolLogo} alt="School Logo Locked" className="h-full w-full object-contain" />
                </motion.div>
              </div>

              {/* Status text */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-extrabold tracking-widest uppercase">
                  <CheckCircle2 className="h-3 w-3 animate-pulse" /> ACCESS AUTHORIZED
                </div>
                
                <h3 className="text-xl font-bold text-white tracking-tight mt-1">
                  Welcome to Dashboard
                </h3>
              </motion.div>

              {/* Loader controls */}
              <div className="w-full mt-8 max-w-xs space-y-2.5">
                <div className="relative w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                  <motion.div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.3, ease: "easeInOut" }}
                  />
                </div>

                <div className="h-6 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {loginStep === 0 && (
                      <motion.span
                        key="step0"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-[10px] text-slate-400 font-mono tracking-widest uppercase font-semibold"
                      >
                        ⚡ Establishing encrypted session...
                      </motion.span>
                    )}
                    {loginStep === 1 && (
                      <motion.span
                        key="step1"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-[10px] text-amber-400 font-mono tracking-widest uppercase font-semibold"
                      >
                        🔑 Loading school roster database...
                      </motion.span>
                    )}
                    {loginStep === 2 && (
                      <motion.span
                        key="step2"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase font-bold"
                      >
                        🚀 Redirecting to Central ICT Hub...
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="w-full max-w-md bg-slate-900/95 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-md shadow-2xl shadow-black/80 my-auto text-center">
              {/* School Logo */}
              <div className="h-24 w-24 mx-auto mb-6 bg-white rounded-3xl p-1.5 flex items-center justify-center shadow-lg border border-slate-700 overflow-hidden">
                <img src={schoolLogo} alt="School Logo" className="h-full w-full object-contain" />
              </div>

              {/* Header Titles */}
              <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight">{schoolName}</h2>
              <p className="text-[10px] text-slate-400 font-extrabold tracking-widest mt-2.5 uppercase flex items-center justify-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-red-400 animate-pulse" /> SECURE CONTROL TERMINAL
              </p>

              {/* Error Message */}
              {loginError && (
                <div className="mt-4 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-400 text-xs font-semibold flex items-center space-x-2 text-left">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4 text-left">
                {/* Username field */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-350 tracking-wider uppercase mb-1.5">
                    Administrator Username
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={usernameInput}
                      onChange={(e) => {
                        setUsernameInput(e.target.value);
                        if (loginError) setLoginError(null);
                      }}
                      className="w-full bg-slate-950/60 text-white font-medium text-xs rounded-xl border border-slate-800 focus:border-blue-500 focus:outline-none py-3 pl-10 pr-4 transition-all"
                      placeholder="Enter admin username"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-355 tracking-wider uppercase mb-1.5">
                    Security Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        if (loginError) setLoginError(null);
                      }}
                      className="w-full bg-slate-950/60 text-white font-medium text-xs rounded-xl border border-slate-800 focus:border-blue-500 focus:outline-none py-3 pl-10 pr-12 transition-all"
                      placeholder="•••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-350 transition-colors text-[10px] font-bold tracking-wider uppercase focus:outline-none"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Action Submit */}
                <button
                  type="submit"
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white py-3.5 px-4 font-bold tracking-wider text-xs uppercase rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2"
                >
                  <span>Authorize Access</span>
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>

              <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
                <p className="text-[10px] text-slate-500 font-medium">
                  Authorized personnel strictly allowed.
                </p>
                <p className="text-[9px] text-slate-600 font-mono mt-1">
                  Adarsha Secondary School ICT Administration
                </p>
              </div>
            </div>
          )
        ) : (
          <>
            {/* TOP COMPONENT: GLASS HEADER */}
            <header className="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-6 mb-8 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl shadow-black/40">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-lg border border-slate-700/50 p-1 shrink-0">
              <img src={schoolLogo} alt="School Logo" className="h-full w-full object-contain" />
            </div>
            <div className="text-center md:text-left">
              {isEditingSchool ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue={schoolName}
                    onBlur={(e) => handleUpdateSchoolName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateSchoolName((e.target as HTMLInputElement).value);
                    }}
                    className="bg-slate-800 border border-slate-600 text-white font-bold text-xl px-2 py-1 rounded-lg focus:outline-none focus:border-blue-500"
                    autoFocus
                    maxLength={50}
                  />
                  <span className="text-[10px] text-slate-400 font-mono">(Press Enter)</span>
                </div>
              ) : (
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h1 
                    className="font-extrabold text-2xl tracking-tight text-white hover:text-blue-400 cursor-pointer transition-colors"
                    onClick={() => setIsEditingSchool(true)}
                    title="Click to rename school"
                  >
                    {schoolName}
                  </h1>
                </div>
              )}
              <p className="text-xs text-slate-300 font-medium tracking-wide mt-1 uppercase flex items-center justify-center md:justify-start gap-1">
                <Sparkles className="h-3 w-3 text-blue-400" /> DIGITAL QR ATTENDANCE HUB.CLASS 10
              </p>
            </div>
          </div>

          {/* Clock & Security Controls Group */}
          <div className="flex items-center gap-3">
            {/* Clock Widget */}
            <div className="flex items-center space-x-3.5 bg-slate-950/50 px-4 py-2.5 rounded-2xl border border-slate-800 font-mono">
              <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
              <div className="text-right">
                <div className="text-sm font-bold text-white tracking-widest">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="text-[10px] text-slate-400 font-sans font-semibold uppercase">
                  {getBsDateString(currentTime)}
                </div>
              </div>
            </div>

            {/* Lock Dashboard Trigger */}
            <button
              onClick={() => {
                setIsAdmin(false);
                localStorage.setItem('school_admin_authorized', 'false');
              }}
              className="flex items-center justify-center p-3.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-2xl border border-red-900/50 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
              title="Lock Terminal / Log Out"
              type="button"
            >
              <Lock className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* TOAST ALERT */}
        {successToast && (
          <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-white py-3.5 px-6 rounded-2xl shadow-2xl flex items-center space-x-3 border border-emerald-400/30 animate-bounce">
            <Sparkles className="h-5 w-5 animate-spin" />
            <span className="font-semibold text-sm">{successToast}</span>
          </div>
        )}

        {/* CORE ANALYTICAL DASHBOARD OVERVIEW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="stats-grid">
          {/* Total Registered */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Roster</span>
              <span className="text-3xl font-extrabold text-white mt-1.5 block">{totalStudents}</span>
              <span className="text-[10px] text-slate-400 font-medium mt-1 block">Registered profiles</span>
            </div>
            <div className="p-3 bg-slate-800 text-slate-300 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
          </div>

          {/* Active Present */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Checked In</span>
              <span className="text-3xl font-extrabold text-emerald-400 mt-1.5 block">{presentCount}</span>
              <span className="text-[10px] text-emerald-400/80 font-medium mt-1 block">Unique student scans</span>
            </div>
            <div className="p-3 bg-emerald-950/50 text-emerald-400 rounded-xl border border-emerald-900/30">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>

          {/* Late Checkins */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Late Entries</span>
              <span className="text-3xl font-extrabold text-amber-500 mt-1.5 block">{lateCount}</span>
              <span className="text-[10px] text-amber-500/80 font-medium mt-1 block">Arrived late today</span>
            </div>
            <div className="p-3 bg-amber-950/50 text-amber-400 rounded-xl border border-amber-950/30">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          {/* Rate Percent */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-extrabold text-blue-400 mt-1.5 block">{attendanceRate}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, attendanceRate)}%` }} />
              </div>
            </div>
            <div className="p-3 bg-blue-950/50 text-blue-400 rounded-xl border border-blue-900/30 flex flex-col items-center">
              <span className="text-xs font-bold leading-none">{attendanceRate}%</span>
            </div>
          </div>
        </div>

        {/* WORKSPACE SECTIONS: COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8" id="work-grid">
          
          {/* LEFT CONTAINER column (Span 8) - REGISTRATION & SCANNING WORKFLOWS */}
          <div className="lg:col-span-8 flex flex-col gap-8">

            {/* SCHOOL HOURS & THRESHOLD OPTION CARD */}
            <section className="bg-slate-950/90 border border-slate-850 rounded-xl p-2 px-3 shadow-sm relative overflow-hidden" id="school-hours-setting-card">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-lg pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10">
                <div className="flex items-center space-x-2">
                  <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span className="font-bold text-white text-[11px] tracking-tight">हाजिरी समय (School Hours)</span>
                  <span className="text-[9px] text-slate-400 hidden md:inline">|</span>
                  <p className="text-[10px] text-slate-400 hidden md:inline">विद्यार्थीको हाजिर र ढिलो समय मिलाउनुहोस्</p>
                </div>

                <div className="flex items-center gap-2.5 bg-slate-900/40 p-1 px-2 rounded-lg border border-slate-800/50 shrink-0 self-end sm:self-auto">
                  {/* Start In-Time Input */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-400">सुरु:</span>
                    <input
                      id="school-start-time"
                      type="time"
                      value={schoolStartTime}
                      onChange={(e) => setSchoolStartTime(e.target.value)}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-md focus:outline-none focus:border-blue-500 w-18 cursor-pointer font-mono"
                    />
                  </div>

                  <div className="h-3 w-px bg-slate-800" />

                  {/* Late Threshold Input */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-amber-500">ढिलो:</span>
                    <input
                      id="school-late-time"
                      type="time"
                      value={schoolLateTime}
                      onChange={(e) => setSchoolLateTime(e.target.value)}
                      className="bg-slate-950 border border-amber-950/40 hover:border-amber-700 text-amber-400 font-bold text-[10px] px-1.5 py-0.5 rounded-md focus:outline-none focus:border-amber-500 w-18 cursor-pointer font-mono"
                    />
                  </div>
                </div>
              </div>
            </section>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* COMPONENT 1: REGISTER NEW STUDENT CARD */}
              <section className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 flex flex-col justify-between" id="add-student-section">
                <div>
                  <div className="flex items-center space-x-2.5 mb-4">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                      <PlusCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-800 text-lg">Add Student & Profile</h2>
                      <p className="text-xs text-slate-500">Create digital record & ID Badge</p>
                    </div>
                  </div>

                  <form onSubmit={handleRegisterStudent} className="space-y-3.5">
                    
                    {/* PROFILE PICTURE DRAG-DROP / UPLOAD INPUT */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Profile Photo</label>
                      <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                        <div className="h-14 w-14 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {formPhoto ? (
                            <img src={formPhoto} alt="Upload Preview" className="h-full w-full object-cover animate-fadeIn" />
                          ) : (
                            <User className="h-6 w-6 text-slate-400" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <input
                            type="file"
                            accept="image/*"
                            id="profile-photo-upload"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setFormPhoto(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('profile-photo-upload')?.click()}
                            className="py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                          >
                            {formPhoto ? 'Change Photo' : 'Upload Image'}
                          </button>
                          {formPhoto && (
                            <button
                              type="button"
                              onClick={() => setFormPhoto('')}
                              className="text-[10px] text-red-500 hover:text-red-600 font-bold mt-1 text-left cursor-pointer"
                            >
                              Remove Picture
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* FULL NAME and ROLL SEC Grid */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="student-name-input">Student Full Name *</label>
                        <input
                          id="student-name-input"
                          type="text"
                          required
                          placeholder="e.g. Priyanjali Sen"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          className="w-full text-slate-800 placeholder-slate-400 text-xs py-2.5 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-slate-50 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="student-roll-input">Roll No. *</label>
                          <input
                            id="student-roll-input"
                            type="text"
                            required
                            placeholder="e.g. 109"
                            value={formRoll}
                            onChange={(e) => setFormRoll(e.target.value)}
                            className="w-full text-slate-800 placeholder-slate-400 text-xs py-2.5 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-slate-50 font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="class-select">Class Section</label>
                          <select
                            id="class-select"
                            value={formClass}
                            onChange={(e) => setFormClass(e.target.value)}
                            className="w-full text-slate-800 text-xs py-2.5 px-3 rounded-xl border border-slate-200 focus:outline-none bg-slate-50 font-semibold"
                          >
                            <option value="Einstein">Einstein (Default)</option>
                            <option value="Hawkins">Hawkins</option>
                            <option value="Newton">Newton</option>
                            <option value="Kelvin">Kelvin</option>
                            <option value="Pascal">Pascal</option>
                            <option value="Robbins">Robbins</option>
                            <option value="Darwin">Darwin</option>
                            <option value="Faraday">Faraday</option>
                            <option value="Custom">Custom Section...</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {formClass === 'Custom' && (
                      <div className="animate-fadeIn">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="custom-class-input">Custom Section Name</label>
                        <input
                          id="custom-class-input"
                          type="text"
                          required
                          placeholder="e.g. Section VII-D"
                          value={customClass}
                          onChange={(e) => setCustomClass(e.target.value)}
                          className="w-full text-slate-800 placeholder-slate-400 text-xs py-2.5 px-4 rounded-xl border border-slate-200 focus:outline-none bg-slate-50 font-medium"
                        />
                      </div>
                    )}

                    {/* CONTACT DETAILS GROUP */}
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="student-email-input">Email Contact</label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                            <input
                              id="student-email-input"
                              type="email"
                              placeholder="student@provider.com"
                              value={formEmail}
                              onChange={(e) => setFormEmail(e.target.value)}
                              className="w-full text-slate-800 placeholder-slate-400 text-xs py-2.5 pl-9 pr-3 rounded-xl border border-slate-200 focus:outline-none bg-slate-50 font-medium"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="student-phone-input">Phone Contact</label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                            <input
                              id="student-phone-input"
                              type="tel"
                              placeholder="+91 XXXXX XXXXX"
                              value={formPhone}
                              onChange={(e) => setFormPhone(e.target.value)}
                              className="w-full text-slate-800 placeholder-slate-400 text-xs py-2.5 pl-9 pr-3 rounded-xl border border-slate-200 focus:outline-none bg-slate-50 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="student-guardian-input">Guardian / Family contact</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                          <input
                            id="student-guardian-input"
                            type="text"
                            placeholder="e.g. Mr. Devendra Sen"
                            value={formGuardian}
                            onChange={(e) => setFormGuardian(e.target.value)}
                            className="w-full text-slate-800 placeholder-slate-400 text-xs py-2.5 pl-9 pr-3 rounded-xl border border-slate-200 focus:outline-none bg-slate-50 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full text-center py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2 mt-3"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>Register & Create Profile</span>
                    </button>
                  </form>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold block">💡 Photo Badge Generation:</span>
                  <span className="text-[9px] text-slate-600 leading-normal mt-0.5 block">
                    Uploading a photo dynamically injects the digital portrait on both the HTML preview and the downloaded high-resolution PNG badge.
                  </span>
                </div>
              </section>

              {/* COMPONENT 2: INTERACTIVE KIOSK LIVE QR SCANNER */}
              <section id="scanner-wrapper">
                <ScannerPanel onScan={handleManualScan} students={students} />
              </section>

            </div>

            {/* COMPONENT 3: ATTENDANCE HISTORY LIST & CONTROL FEED */}
            <section className="bg-white rounded-3xl shadow-md border border-slate-100 p-6" id="records-table-container">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-extrabold text-slate-800 text-xl tracking-tight">
                    {selectedDateFilter === 'All' ? 'All Saved Check-In Logs' : `${formatDateLabel(selectedDateFilter)} Action Logs`}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedDateFilter === 'All' ? 'Historical overview organized by database dates' : 'Selected date portal activity stream'}
                  </p>
                </div>

                {/* Bulk tools */}
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl transition-all border border-emerald-200/50 flex items-center space-x-1.5 cursor-pointer"
                    title="Export logs to CSV spreadsheet"
                    type="button"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={handleWipeRecords}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-xl transition-all border border-red-200/50 flex items-center space-x-1.5 cursor-pointer font-sans"
                    title="Clear current attendance records"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Reset Logs</span>
                  </button>
                </div>
              </div>

              {/* Search & Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Name/Roll..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-slate-700 placeholder-slate-400 text-xs py-2.5 pl-9 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                  />
                </div>

                {/* Class filter */}
                <div className="flex items-center">
                  <select
                    value={selectedClassFilter}
                    onChange={(e) => setSelectedClassFilter(e.target.value)}
                    className={`w-full text-xs py-2.5 px-3 rounded-xl border transition-all font-semibold focus:outline-none focus:ring-1 ${
                      selectedClassFilter === 'Einstein'
                        ? 'border-amber-400 bg-amber-50/80 text-amber-900 focus:ring-amber-500 font-bold shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  >
                    {classSectionsList.map(c => (
                      <option key={c} value={c} className={c === 'Einstein' ? 'font-bold text-amber-700 bg-amber-100' : ''}>
                        {c === 'Einstein' ? '🌟 Einstein (Default Section)' : c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* status filter */}
                <div className="flex items-center">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full text-slate-700 text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                  >
                    <option value="All">All Scans</option>
                    <option value="Present">Present Only</option>
                    <option value="Late">Late Only</option>
                  </select>
                </div>

                {/* Date Filter (with Custom Bikram Sambat Date Picker Popover) */}
                <div className="relative flex items-center min-w-[200px]">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    readOnly
                    id="bs-date-filter-selector"
                    value={selectedDateFilter === 'All' ? '' : getBsDateLabelShort(selectedDateFilter)}
                    placeholder="All Dates (B.S.)"
                    onClick={handleOpenDatePicker}
                    className="w-full text-slate-705 text-xs py-2.5 pl-9 pr-10 rounded-xl border border-slate-200 bg-white font-semibold cursor-pointer outline-none select-none h-[38px] shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {selectedDateFilter !== 'All' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDateFilter('All');
                        setIsDatePickerOpen(false);
                      }}
                      className="absolute right-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded px-1.5 py-0.5 text-[9px] font-bold transition-all cursor-pointer z-30"
                      title="Clear to view all dates grouped"
                    >
                      All
                    </button>
                  ) : (
                    <span 
                      onClick={handleOpenDatePicker}
                      className="absolute right-3 top-3 h-4 w-4 text-slate-400 cursor-pointer flex items-center justify-center text-[10px]"
                    >
                      ▾
                    </span>
                  )}

                  {isDatePickerOpen && (
                    <>
                      {/* Fullscreen transparent click-away backdrop */}
                      <div className="fixed inset-0 z-40 bg-transparent cursor-default" onClick={() => setIsDatePickerOpen(false)} />
                      
                      {/* GORGEOUS BIKRAM SAMBAT CALENDAR DROP-DOWN */}
                      <div className="absolute right-0 top-[42px] z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 select-none animate-fadeIn">
                        {/* Header Controls: Arrow Nav and Dropdowns */}
                        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (viewBsMonth === 0) {
                                setViewBsMonth(11);
                                setViewBsYear(prev => prev - 1);
                              } else {
                                setViewBsMonth(prev => prev - 1);
                              }
                            }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>

                          <div className="flex space-x-1">
                            {/* B.S. Month Select Option */}
                            <select
                              value={viewBsMonth}
                              onChange={(e) => setViewBsMonth(Number(e.target.value))}
                              className="text-[11px] font-bold text-slate-705 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                              {['Baisakh (वैशाख)', 'Jestha (जेठ)', 'Ashadh (असार)', 'Shrawan (साउन)', 'Bhadra (भदौ)', 'Ashwin (असोज)', 'Kartik (कात्तिक)', 'Mangsir (मंसिर)', 'Poush (पुस)', 'Magh (माघ)', 'Falgun (फागुन)', 'Chaitra (चैत)'].map((mName, idx) => (
                                <option key={idx} value={idx}>{mName}</option>
                              ))}
                            </select>

                            {/* B.S. Year Select Option */}
                            <select
                              value={viewBsYear}
                              onChange={(e) => setViewBsYear(Number(e.target.value))}
                              className="text-[11px] font-bold text-slate-705 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                              {Array.from({ length: 30 }, (_, i) => 2060 + i).map(yr => (
                                <option key={yr} value={yr}>{yr} B.S.</option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (viewBsMonth === 11) {
                                setViewBsMonth(0);
                                setViewBsYear(prev => prev + 1);
                              } else {
                                setViewBsMonth(prev => prev + 1);
                              }
                            }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m9 5 7 7-7 7" />
                            </svg>
                          </button>
                        </div>

                        {/* Weekday indicator labels */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-1 bg-slate-50 py-1 rounded-lg">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((dName, i) => (
                            <span key={i} className={`text-[9px] font-extrabold ${i === 6 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {dName}
                            </span>
                          ))}
                        </div>

                        {/* Gregorian/BS Dates selection values */}
                        <div className="grid grid-cols-7 gap-1 text-center mt-1">
                          {(() => {
                            const cells = [];
                            try {
                              const startOffset = new NepaliDate(viewBsYear, viewBsMonth, 1).getDay();
                              const totalDays = getDaysInNepaliMonth(viewBsYear, viewBsMonth);
                              
                              for (let i = 0; i < startOffset; i++) {
                                cells.push(<div key={`blank-${i}`} className="h-6 w-6" />);
                              }

                              for (let d = 1; d <= totalDays; d++) {
                                const todayNp = new NepaliDate();
                                const isToday = todayNp.getYear() === viewBsYear && todayNp.getMonth() === viewBsMonth && todayNp.getDate() === d;
                                
                                let isSelected = false;
                                if (selectedDateFilter !== 'All') {
                                  try {
                                    const parts = selectedDateFilter.split('-');
                                    const actNp = new NepaliDate(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
                                    isSelected = actNp.getYear() === viewBsYear && actNp.getMonth() === viewBsMonth && actNp.getDate() === d;
                                  } catch (err) {}
                                }

                                cells.push(
                                  <button
                                    key={`day-${d}`}
                                    type="button"
                                    onClick={() => {
                                      const parsedBsDate = new NepaliDate(viewBsYear, viewBsMonth, d);
                                      const jsDate = parsedBsDate.toJsDate();
                                      const y = jsDate.getFullYear();
                                      const m = String(jsDate.getMonth() + 1).padStart(2, '0');
                                      const dayVal = String(jsDate.getDate()).padStart(2, '0');
                                      setSelectedDateFilter(`${y}-${m}-${dayVal}`);
                                      setIsDatePickerOpen(false);
                                    }}
                                    className={`h-6 w-6 text-[11px] font-semibold rounded-md flex items-center justify-center transition-all relative mx-auto cursor-pointer ${
                                      isSelected 
                                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25' 
                                        : isToday
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>{d}</span>
                                    {isToday && !isSelected && (
                                      <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 bg-amber-600 rounded-full animate-ping" />
                                    )}
                                  </button>
                                );
                              }
                            } catch (e) {
                              console.error(e);
                            }
                            return cells;
                          })()}
                        </div>

                        {/* Quick filter tools footer */}
                        <div className="flex items-center justify-between border-t border-slate-100 mt-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const nowNp = new NepaliDate();
                              const jsDate = nowNp.toJsDate();
                              const y = jsDate.getFullYear();
                              const m = String(jsDate.getMonth() + 1).padStart(2, '0');
                              const dayVal = String(jsDate.getDate()).padStart(2, '0');
                              setSelectedDateFilter(`${y}-${m}-${dayVal}`);
                              setViewBsYear(nowNp.getYear());
                              setViewBsMonth(nowNp.getMonth());
                              setIsDatePickerOpen(false);
                            }}
                            className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all cursor-pointer"
                          >
                            Today
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDateFilter('All');
                              setIsDatePickerOpen(false);
                            }}
                            className="px-2 py-1 text-[10px] font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                          >
                            All Logs
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* Table wrapper */}
              <div className="overflow-x-auto rounded-2xl border border-slate-100 max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse" id="main-attendance-table">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                      <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Roll No</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Student Name</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Class Section</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Stamp Time</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Verification</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredRecords.length > 0 ? (
                      (() => {
                        let lastDateHeader = '';
                        return filteredRecords.map((r, idx) => {
                          const recTime = new Date(r.timestamp);
                          const dateHeaderLabel = getBsDateString(recTime);
                          
                          const showHeader = dateHeaderLabel !== lastDateHeader;
                          if (showHeader) {
                            lastDateHeader = dateHeaderLabel;
                          }
                          
                          return (
                            <Fragment key={`${r.id}-${idx}`}>
                              {showHeader && (
                                <tr className="bg-slate-100/80 border-y border-slate-200/60 font-sans">
                                  <td colSpan={7} className="py-2.5 px-4 text-xs font-extrabold text-slate-700 bg-slate-50/90 tracking-wide">
                                    <div className="flex items-center space-x-1.5">
                                      <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                      <span className="uppercase tracking-wider">{dateHeaderLabel}</span>
                                      <span className="text-[10px] text-slate-400 font-medium font-mono normal-case">
                                        ({filteredRecords.filter(item => getBsDateString(new Date(item.timestamp)) === dateHeaderLabel).length} entries)
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              <motion.tr 
                                initial={{ x: 40, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                                className="hover:bg-slate-50/70 transition-all border-b border-slate-50"
                              >
                                <td className="py-3 px-4 text-xs text-slate-900 font-bold font-mono">#{r.roll}</td>
                                <td className="py-3 px-4 text-xs text-slate-800 font-bold">{r.name}</td>
                                <td className="py-3 px-4 text-xs">
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md uppercase font-mono">
                                    {r.classSection || 'Unassigned'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-xs font-mono text-slate-500">
                                  {recTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </td>
                                <td className="py-3 px-4 text-xs">
                                  <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    r.status === 'Present'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${r.status === 'Present' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    <span className="uppercase tracking-wider">{r.status}</span>
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-xs">
                                  {r.capturedPhotoUrl ? (
                                    <div className="flex items-center space-x-2">
                                      <div className="relative group/photo cursor-zoom-in">
                                        <div className="h-9 w-9 rounded-lg overflow-hidden border border-slate-205/85 bg-slate-100 shrink-0 shadow-2xs">
                                          <img
                                            referrerPolicy="no-referrer"
                                            src={r.capturedPhotoUrl}
                                            alt="Verification"
                                            className="h-full w-full object-cover"
                                            onClick={() => setSelectedModalPhoto({
                                              url: r.capturedPhotoUrl!,
                                              name: r.name,
                                              roll: r.roll,
                                              timestamp: r.timestamp
                                            })}
                                          />
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 bg-emerald-600 text-white text-[6px] text-center font-bold tracking-normal py-0.5 rounded-b-lg scale-y-0 group-hover/photo:scale-y-100 transition-all origin-bottom">
                                          VIEW
                                        </div>
                                      </div>
                                      
                                      <span className="text-[9px] text-emerald-600 bg-emerald-50/50 px-1.5 py-0.5 rounded-md font-semibold border border-emerald-100 font-mono tracking-tight shrink-0 flex items-center gap-0.5 max-w-[64px] truncate">
                                        <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                                        <span>SECURE</span>
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">No Capture</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-xs text-right">
                                  <button
                                    onClick={() => handleDeleteRecord(r.id)}
                                    className="p-1 px-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-all cursor-pointer inline-flex items-center gap-0.5"
                                    title="Remove attendance entry"
                                    type="button"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span className="text-[10px] font-medium font-sans">Delete</span>
                                  </button>
                                </td>
                              </motion.tr>
                            </Fragment>
                          );
                        });
                      })()
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          <UserX className="h-9 w-9 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-sm">No Attendance Logged</p>
                          <p className="text-xs text-slate-400 max-w-[200px] mx-auto mt-0.5">
                            Scan student QR cards or search filters above.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </div>

          {/* RIGHT CONTAINER column (Span 4) - BADGES GENERATOR PREVIEW & STUDENT LIST */}
          <div className="lg:col-span-4 flex flex-col gap-6">

            {/* TAB SELECTOR FOR RIGHT COLUMN */}
            <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setRightActiveTab('ai-guide')}
                className={`flex-1 py-1.5 px-2 text-[10.5px] font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                  rightActiveTab === 'ai-guide'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10 bg-gradient-to-r from-blue-600 to-indigo-650'
                    : 'text-slate-400 hover:text-white'
                }`}
                type="button"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                <span>एआई गाइड शिक्षक</span>
              </button>
              <button
                onClick={() => setRightActiveTab('directory')}
                className={`flex-1 py-1.5 px-2 text-[10.5px] font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                  rightActiveTab === 'directory'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                    : 'text-slate-400 hover:text-white'
                }`}
                type="button"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Profiles & Badges</span>
              </button>
              <button
                onClick={() => setRightActiveTab('reminders')}
                className={`flex-1 py-1.5 px-2 text-[10.5px] font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                  rightActiveTab === 'reminders'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                    : 'text-slate-400 hover:text-white'
                }`}
                type="button"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Reminders</span>
              </button>
            </div>

            {/* TAB-AI PANEL: INTERACTIVE PORTAL TUTOR */}
            {rightActiveTab === 'ai-guide' && (
              <div className="flex flex-col gap-4 animate-fadeIn">
                
                {/* HEAD DETAILS */}
                <div className="bg-slate-900/65 border border-slate-800 p-4 rounded-3xl text-left flex items-start space-x-3 shadow-md">
                  <div className="p-2.5 bg-blue-500/15 text-blue-400 rounded-2xl border border-blue-500/30 shrink-0">
                    <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                      सहयोगी Scanner Buddy
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold animate-pulse">
                        सक्रिय छ
                      </span>
                    </h3>
                    <p className="text-[10.5px] text-slate-400 font-medium leading-normal mt-0.5">
                      तपाईंको डिजिटल एआई शिक्षक। क्युआर हाजिरी प्रणाली चलाउने बारे सरल नेपालीमा जे पनि सोध्नुहोस्!
                    </p>
                  </div>
                </div>

                {/* CHAT VIEW ENGINE */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-4 flex flex-col h-[525px] shadow-inner">
                  
                  {/* Voice assistant controls */}
                  <div className="flex items-center justify-between pb-3.5 mb-2.5 border-b border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      वचन आवाज सेटिङ (Voice Assist)
                    </span>
                    <button
                      onClick={handleToggleAutoSpeak}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border ${
                        autoSpeak
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-extrabold shadow shadow-amber-500/5 hover:bg-amber-500/20'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-300'
                      }`}
                      title="Toggle automatic speech synthesis readout on new response (आफैं पढ्ने सेवा)"
                      type="button"
                    >
                      <Volume2 className={`h-3 w-3 ${autoSpeak ? 'animate-pulse' : ''}`} />
                      <span>{autoSpeak ? 'आफैं बोल्ने: अन' : 'आफैं बोल्ने: अफ'}</span>
                    </button>
                  </div>

                  {/* Messages Stream scroll container */}
                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-slate-100" id="ai-chat-scroller">
                    {aiHistory.map((msg, index) => {
                      const isAi = msg.role === 'assistant';
                      return (
                        <div 
                          key={index} 
                          className={`flex items-start gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}
                        >
                          {isAi && (
                            <div className="h-6 w-6 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-[9px] shrink-0 font-mono">
                              SB
                            </div>
                          )}
                          <div 
                            className={`relative p-3 rounded-2xl text-xs max-w-[85%] text-left border ${
                              isAi 
                                ? 'bg-slate-950/70 border-slate-800 text-slate-100 shadow-sm pr-9' 
                                : 'bg-blue-600/90 border-blue-500 text-white shadow shadow-blue-500/10 font-medium'
                            }`}
                          >
                            {isAi ? (
                              <>
                                {renderMessageContent(msg.content)}
                                <button
                                  onClick={() => speakText(msg.content, index)}
                                  className={`absolute right-1.5 top-1.5 p-1.5 rounded-lg transition-colors ${
                                    speakingMsgIndex === index
                                      ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                                      : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50'
                                  }`}
                                  title={speakingMsgIndex === index ? "आवाज बन्द गर्नुहोस्" : "नेपालीमा सुन्नुहोस् (Voice Readout)"}
                                  type="button"
                                >
                                  {speakingMsgIndex === index ? (
                                    <VolumeX className="h-3.5 w-3.5 animate-pulse" />
                                  ) : (
                                    <Volume2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </>
                            ) : (
                              <p className="font-semibold">{msg.content}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Loader */}
                    {isAiLoading && (
                      <div className="flex items-start gap-2.5 justify-start">
                        <div className="h-6 w-6 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-[9px] shrink-0 font-mono animate-pulse">
                          SB
                        </div>
                        <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl text-xs flex items-center space-x-2 text-slate-300">
                          <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          <span className="text-[10px] text-slate-500 font-medium">analyzing portal operations...</span>
                        </div>
                      </div>
                    )}

                    {aiError && (
                      <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-xl text-left flex items-start space-x-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <p>{aiError}</p>
                      </div>
                    )}
                  </div>

                  {/* Dynamic suggestion chips list */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block text-left mb-1.5">
                      सुरुवाती मद्दत? कुनै एक विकल्पमा थिच्नुहोस्:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto">
                      {SUGGESTION_CHIPS.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => !isAiLoading && handleSendAiMessage(chip.question)}
                          disabled={isAiLoading}
                          className="bg-slate-950/60 hover:bg-slate-950 hover:active:bg-blue-950/40 font-semibold text-[9.5px] text-blue-400 hover:text-blue-300 border border-slate-800 hover:border-slate-700 hover:scale-[0.98] py-1 px-2.5 rounded-full transition-all cursor-pointer whitespace-nowrap"
                          type="button"
                        >
                          {chip.label} →
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input form */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendAiMessage();
                    }}
                    className="flex mt-3 gap-2"
                  >
                    <input
                      type="text"
                      className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-semibold font-sans resize-none"
                      placeholder="नयाँ कुरा सोध्नुहोस् (जस्तै: QR आईडी कसरी बनाउने?)..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      disabled={isAiLoading}
                    />
                    <button
                      type="submit"
                      disabled={isAiLoading || !aiInput.trim()}
                      className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer shadow-md disabled:bg-slate-800 disabled:text-slate-600 flex items-center justify-center shrink-0 w-8.5 h-8.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
                
              </div>
            )}

            {/* TAB-1 PANEL: DIRECTORY ROSTER & BADGE SYSTEM */}
            {rightActiveTab === 'directory' && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                
                {/* BADGE CARD GENERATION PREVIEW SCREEN */}
                <section className="bg-white rounded-3xl shadow-md border border-slate-100 p-5 flex flex-col items-center text-center" id="badge-card-container">
                  <div className="w-full flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                        <QrCode className="h-4 w-4" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-xs">Student ID Badge Card</h3>
                    </div>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 font-bold rounded-full uppercase tracking-wider">
                      Print Matrix
                    </span>
                  </div>

                  {previewStudent ? (
                    <div className="w-full flex flex-col items-center">
                      
                      {/* Badge visualization layout mirror */}
                      <div className="w-full max-w-[250px] bg-white border-2 border-slate-100 rounded-2xl shadow-lg overflow-hidden relative flex flex-col p-0.5">
                        
                        {/* Badge top colored banner */}
                        <div className="bg-slate-900 text-white py-2 px-2.5 relative z-10 flex items-center space-x-2 justify-center min-h-[48px]">
                          <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center shrink-0 p-0.5 border border-slate-700">
                            <img src={schoolLogo} alt="Logo" className="h-full w-full object-contain rounded-full" />
                          </div>
                          <div className="flex flex-col text-left truncate flex-1 md:max-w-[150px]">
                            <span className="text-[6px] font-extrabold tracking-widest text-slate-400 uppercase">STUDENT ROSTER</span>
                            <h4 className="text-[8.5px] font-bold mt-0.5 tracking-tight truncate uppercase leading-none">{schoolName}</h4>
                            <p className="text-[5px] text-slate-550 tracking-wider uppercase font-mono mt-0.5 leading-none">INSTITUTIONAL CREDENTIALS</p>
                          </div>
                          <div className="bg-blue-500 h-1.5 w-1.5 rounded-full absolute top-2 right-2" />
                        </div>

                        <div className="bg-blue-500 h-1 w-full" />

                        {/* QR Code + Portrait Photo Area */}
                        <div className="bg-white p-3.5 flex flex-row items-center justify-center gap-4 min-h-[150px]">
                          {previewStudent.photoUrl && (
                            <div className="w-20 h-24 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                              <img src={previewStudent.photoUrl} alt={previewStudent.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className={`${previewStudent.photoUrl ? 'w-[105px] h-[105px]' : 'w-44 h-44'} flex justify-center items-center relative transition-all`}>
                            {previewQrUrl ? (
                              <img 
                                src={previewQrUrl} 
                                alt="Badge QR Code" 
                                className="w-full h-full object-contain filter drop-shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="animate-pulse w-24 h-24 bg-slate-100 rounded-lg" />
                            )}
                          </div>
                        </div>

                        {/* Student Info Box */}
                        <div className="px-3 pb-2.5 pt-1.5 bg-white flex flex-col text-left text-slate-800 border-t border-slate-100">
                          <div className="text-[6px] text-slate-400 font-extrabold tracking-wider uppercase mb-0.5">REGISTERED CANDIDATE</div>
                          <h5 className="font-extrabold text-[12px] text-slate-900 truncate uppercase tracking-tight leading-tight mb-2">{previewStudent.name}</h5>
                          
                          <div className="grid grid-cols-2 gap-y-1 gap-x-1.5 border-t border-slate-100 pt-1.5 text-[8.5px]">
                            <div>
                              <span className="text-[6px] text-slate-400 font-bold block uppercase leading-none">Roll Number</span>
                              <span className="font-extrabold text-blue-600 font-mono text-[10px]">#{previewStudent.roll}</span>
                            </div>
                            <div>
                              <span className="text-[6px] text-slate-400 font-bold block uppercase leading-none">Class / Grade</span>
                              <span className="font-extrabold text-slate-800 uppercase font-mono text-[10px]">{previewStudent.classSection || 'N/A'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-[6px] text-slate-400 font-bold block uppercase leading-none">Guardian Name</span>
                              <span className="font-bold text-slate-700 truncate block text-[9px]">{previewStudent.guardian || 'N/A'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-[6px] text-slate-400 font-bold block uppercase leading-none">Phone Contact</span>
                              <span className="font-bold text-slate-700 font-mono block text-[9px]">{previewStudent.phone || 'N/A'}</span>
                            </div>
                          </div>
                        </div>



                      </div>

                      {/* Download Badge Trigger */}
                      <button
                        onClick={async () => {
                          try {
                            await downloadStudentBadge(
                              previewStudent.roll, 
                              previewStudent.name, 
                              previewStudent.classSection,
                              previewStudent.photoUrl,
                              schoolName,
                              schoolLogo,
                              previewStudent.phone,
                              previewStudent.guardian
                            );
                          } catch (error) {
                            console.error("Failed to download badge:", error);
                          }
                        }}
                        className="w-full mt-3 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                        type="button"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Badge PNG</span>
                      </button>

                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                      <UserX className="h-8 w-8 text-slate-300 animate-pulse mb-2" />
                      <p className="font-semibold text-xs">No Profile Preview Selected</p>
                    </div>
                  )}
                </section>

                {/* DETAILED STUDENT CONTACT PROFILE PANEL */}
                {previewStudent && (
                  <section className="bg-slate-900/60 border border-slate-800 p-4 rounded-3xl text-left animate-fadeIn">
                    <h4 className="text-xs font-bold text-slate-300 tracking-wider uppercase mb-3 flex items-center space-x-1">
                      <Users className="h-3.5 w-3.5 text-blue-500" />
                      <span>Student Contact Dossier</span>
                    </h4>

                    <div className="space-y-2.5">
                      {/* Name Card */}
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="truncate">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">FullName</span>
                          <span className="text-xs font-bold text-white uppercase">{previewStudent.name}</span>
                        </div>
                      </div>

                      {/* Email Card */}
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                          <Mail className="h-5 w-5" />
                        </div>
                        <div className="truncate">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Guardian Email Address</span>
                          <span className="text-xs font-bold text-white">{previewStudent.email || 'No email registered'}</span>
                        </div>
                      </div>

                      {/* Phone Card */}
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                          <Phone className="h-4.5 w-4.5" />
                        </div>
                        <div className="truncate">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Emergency Contact</span>
                          <span className="text-xs font-bold text-white font-mono">{previewStudent.phone || 'No active phone'}</span>
                        </div>
                      </div>

                      {/* Family/Guardian Name Card */}
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                          <Users className="h-4.5 w-4.5" />
                        </div>
                        <div className="truncate">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Guardian Name</span>
                          <span className="text-xs font-bold text-white">{previewStudent.guardian || 'No guardian listed'}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* REGISTERED PORTAL STUDENT DIRECTORY FILTER */}
                <section className="bg-white rounded-3xl shadow-md border border-slate-100 p-5 flex flex-col" id="directory-panel">
                  <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-50">
                    <div>
                      <h3 className="font-bold text-slate-800 text-xs">Registered Profiles Directory</h3>
                      <p className="text-[10px] text-slate-400 font-semibold">{students.length} students enrolled</p>
                    </div>
                    <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Scroll list directory */}
                  <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                    {students.map((stud) => {
                      const isSelected = previewStudent && previewStudent.roll === stud.roll;
                      return (
                        <div 
                          key={stud.roll}
                          onClick={() => updateBadgePreview(stud)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                            isSelected 
                              ? 'bg-blue-50/60 border-blue-200 shadow-xs' 
                              : 'bg-white hover:bg-slate-50 border-slate-100'
                          }`}
                        >
                          <div className="max-w-[70%] flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {stud.photoUrl ? (
                                <img src={stud.photoUrl} alt={stud.name} className="h-full w-full object-cover" />
                              ) : (
                                <User className="h-4.5 w-4.5 text-slate-400" />
                              )}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-1">
                                <h4 className="font-bold text-xs text-slate-800 truncate">{stud.name}</h4>
                                <span className="text-[9px] bg-slate-100 text-slate-500 font-mono px-0.5 rounded shrink-0">
                                  #{stud.roll}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-500 truncate uppercase font-mono">
                                {stud.classSection || 'Unassigned'}
                              </p>
                            </div>
                          </div>

                          {/* delete student */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStudent(stud.roll);
                            }}
                            className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50/40 rounded-lg transition-all shrink-0 cursor-pointer"
                            title="Delete profile"
                            type="button"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>

              </div>
            )}

            {/* TAB-2 PANEL: AUTOMATED REMINDERS MANAGER */}
            {rightActiveTab === 'reminders' && (
              <div className="flex flex-col gap-5 animate-fadeIn">
                
                {/* SUB LOG TABS SWITCHER */}
                <div className="flex bg-slate-950/40 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setReminderHubSubTab('scheduler')}
                    className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                      reminderHubSubTab === 'scheduler' ? 'bg-blue-600/90 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    type="button"
                  >
                    <Calendar className="h-3 w-3" />
                    <span>Scheduler Panel</span>
                  </button>
                  <button
                    onClick={() => setReminderHubSubTab('logs')}
                    className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                      reminderHubSubTab === 'logs' ? 'bg-blue-600/90 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    type="button"
                  >
                    <History className="h-3 w-3" />
                    <span>Simulated logs ({notificationLogs.length})</span>
                  </button>
                </div>

                {reminderHubSubTab === 'scheduler' ? (
                  <div className="space-y-5 animate-fadeIn">
                    
                    {/* BROWSER DESKTOP API AUTHORIZATION */}
                    <section className="bg-slate-900/70 border border-slate-800 p-4 rounded-3xl text-left">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shrink-0">
                          <Bell className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-white">Browser Notifications</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                            System issues hardware popups when reminders trigger.
                          </p>
                          <div className="mt-2 flex items-center space-x-2">
                            {notifPermission === 'granted' ? (
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Active Desktop Alerts
                              </span>
                            ) : (
                              <button
                                onClick={requestNotificationAccess}
                                className="py-1 px-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                                type="button"
                              >
                                Enable Hardware Popups
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* SCHEDULER FORM */}
                    <section className="bg-white rounded-3xl shadow-md border border-slate-100 p-5 text-left">
                      <div className="flex items-center space-x-2 mb-3.5 pb-2 border-b border-slate-50">
                        <div className="p-1 bg-blue-5 text-blue-600 rounded">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-xs">Configure Reminder Task</h4>
                      </div>

                      <form onSubmit={handleCreateReminder} className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Reminder Title</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Afternoon Section Roll Call"
                            value={remTitle}
                            onChange={(e) => setRemTitle(e.target.value)}
                            className="w-full text-slate-800 placeholder-slate-400 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:outline-none bg-slate-50 font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Target Cohort</label>
                            <select
                              value={remClass}
                              onChange={(e) => setRemClass(e.target.value)}
                              className="w-full text-slate-800 text-[11px] py-2 px-2.1 rounded-xl border border-slate-200 focus:outline-none bg-slate-50 font-semibold"
                            >
                              <option value="All">All Classes</option>
                              <option value="Einstein">Einstein (Default)</option>
                              <option value="Hawkins">Hawkins</option>
                              <option value="Newton">Newton</option>
                              <option value="Kelvin">Kelvin</option>
                              <option value="Pascal">Pascal</option>
                              <option value="Robbins">Robbins</option>
                              <option value="Darwin">Darwin</option>
                              <option value="Faraday">Faraday</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Delivery Channel</label>
                            <select
                              value={remChannel}
                              onChange={(e) => setRemChannel(e.target.value as any)}
                              className="w-full text-slate-800 text-[11px] py-2 px-2.1 rounded-xl border border-slate-200 focus:outline-none bg-slate-50 font-semibold"
                            >
                              <option value="Both">Both (No. + Mail)</option>
                              <option value="Email">Email Prompt Only</option>
                              <option value="Browser Notification">Hardware Alerts</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Schedule date & time</label>
                          <input
                            type="datetime-local"
                            required
                            value={remDateTime}
                            onChange={(e) => setRemDateTime(e.target.value)}
                            className="w-full text-slate-800 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:outline-none bg-slate-50 font-medium cursor-pointer"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-750 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Queue Automation reminders</span>
                        </button>
                      </form>
                    </section>

                    {/* ALREADY PLANNED REMINDERS TRIGGER list */}
                    <section className="bg-slate-900/60 border border-slate-800 p-4 rounded-3xl text-left">
                      <h4 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center space-x-1.5">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>Planned Automation Queues</span>
                      </h4>

                      <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                        {reminders.length > 0 ? (
                          reminders.map(rem => {
                            const isScheduled = new Date(rem.dateTime) > new Date();
                            return (
                              <div key={rem.id} className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
                                <div className="max-w-[75%]">
                                  <div className="flex items-center space-x-1 flex-wrap">
                                    <span className="text-xs font-bold text-white truncate max-w-[130px]">{rem.title}</span>
                                    <span className={`text-[8px] font-bold px-1 rounded ${
                                      rem.isSent 
                                        ? 'bg-emerald-500/10 text-emerald-400' 
                                        : isScheduled 
                                          ? 'bg-sky-500/10 text-sky-450' 
                                          : 'bg-amber-500/10 text-amber-400'
                                    }`}>
                                      {rem.isSent ? 'Sent' : isScheduled ? 'Active' : 'Triggering'}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-400 mt-1 font-medium font-sans">
                                    ⏰ {new Date(rem.dateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  <p className="text-[8px] text-slate-500 mt-0.5 uppercase font-mono">
                                    Target: {rem.targetClass} • Route: {rem.channel}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDeleteReminder(rem.id)}
                                  className="p-1 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                                  type="button"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-slate-500 text-[10px] py-4 text-center">No reminders scheduled in current roster.</p>
                        )}
                      </div>
                    </section>

                  </div>
                ) : (
                  // AUDIT VIEW simulated mail deliveries logs inbox
                  <div className="space-y-4 animate-fadeIn">
                    <section className="bg-slate-900/60 border border-slate-800 p-4 rounded-3xl text-left">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                          <Inbox className="h-4 w-4 text-emerald-500" />
                          <span>Simulated Mail & Inbox Stream</span>
                        </h4>
                        {notificationLogs.length > 0 && (
                          <button
                            onClick={handleWipeReminderLogs}
                            className="text-red-400 hover:text-red-500 text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                            type="button"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Wipe Sandbox Logs</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                        {notificationLogs.length > 0 ? (
                          notificationLogs.map(log => (
                            <div key={log.id} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex flex-col space-y-1">
                              <div className="flex items-start justify-between">
                                <span className={`text-[8px] font-bold px-1 rounded shrink-0 uppercase tracking-widest ${
                                  log.type === 'Email' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                                }`}>
                                  {log.type} Prompt
                                </span>
                                <span className="text-[8px] text-slate-500 font-mono">
                                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                              <div className="text-[10px] font-bold text-white truncate max-w-full">
                                To: {log.studentName} <span className="text-slate-400 text-[8px] font-normal font-mono">&lt;{log.address}&gt;</span>
                              </div>
                              <p className="text-[9px] text-[#3b82f6] font-bold tracking-tight">{log.subject}</p>
                              <p className="text-[9px] text-slate-305 leading-normal bg-slate-950 p-2 rounded-lg border border-slate-800/60 italic font-medium font-sans">
                                {log.message}
                              </p>
                              <div className="flex items-center space-x-1">
                                <span className="h-1 w-1 bg-emerald-450 rounded-full animate-ping" />
                                <span className="text-[8px] font-bold text-emerald-400 lowercase">dispatched and delivered successfully</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center text-slate-400">
                            <h5 className="font-extrabold text-[11px] mb-1">Queue is Clear</h5>
                            <p className="text-[10px] text-slate-500 max-w-[190px] mx-auto">
                              No reminders have fired yet. Set up a scheduler countdown to test alerts.
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </>
      )}

      {/* 📸 LIVE CAM BIOMETRIC VERIFICATION COMPARISON MODAL */}
      <AnimatePresence>
        {selectedModalPhoto && (() => {
          const matchedStudent = students.find(s => s.roll.toLowerCase() === selectedModalPhoto.roll.toLowerCase());
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedModalPhoto(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col p-6 text-slate-800"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Camera className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">Biometric Security Verification</h3>
                      <p className="text-xs text-slate-500">Compare live check-in capture against directory card records</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedModalPhoto(null)}
                    className="p-1 px-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg text-xs font-bold transition-all"
                  >
                    Close
                  </button>
                </div>

                {/* Secure Status Badge */}
                <div className="mb-5 p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center gap-3 text-left">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-800 block">✓ Biometric Match Confirmed</span>
                    <span className="text-emerald-700 leading-normal font-medium block mt-0.5">
                      Student identity verified at high threshold. QR pattern roll match #{selectedModalPhoto.roll} is logged.
                    </span>
                  </div>
                </div>

                {/* Photo Grid Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  {/* Photo 1: Registered Identity Profile Photo */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Registered Profile Photo</span>
                    <div className="relative w-full aspect-square max-w-[220px] rounded-2xl border-2 border-slate-200 overflow-hidden bg-slate-50 shadow-xs flex items-center justify-center">
                      {matchedStudent?.photoUrl ? (
                        <img 
                          referrerPolicy="no-referrer" 
                          src={matchedStudent.photoUrl} 
                          alt="Registered Portrait" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="text-center p-4">
                          <UserX className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 italic font-medium">No registered photo on file</p>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 py-1 bg-slate-950/80 text-[8px] text-slate-300 font-mono text-center uppercase tracking-widest font-black">
                        DIRECTORY PROFILE
                      </div>
                    </div>
                  </div>

                  {/* Photo 2: Captured Snapped Verification Frame */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Kiosk Snapshot Capture</span>
                    <div className="relative w-full aspect-square max-w-[220px] rounded-2xl border-2 border-emerald-600 overflow-hidden bg-slate-950 shadow-sm flex items-center justify-center">
                      <img 
                        referrerPolicy="no-referrer" 
                        src={selectedModalPhoto.url} 
                        alt="Captured Camera Snapshot" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-600 text-white text-[8px] font-mono rounded font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                        <span>LIVE CAP</span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 py-1 bg-emerald-900/90 text-[8px] text-emerald-300 font-mono text-center uppercase tracking-widest font-extrabold border-t border-emerald-800">
                        ATTENDANCE SNAPSHOT
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Information Table */}
                <div className="bg-slate-50 p-4 rounded-2xl text-left text-xs font-medium text-slate-600 grid grid-cols-2 gap-y-2.5 gap-x-4 border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Attendee Name:</span>
                    <span className="font-extrabold text-slate-800 text-sm">{selectedModalPhoto.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Assigned Class Roll:</span>
                    <span className="font-mono text-slate-700 font-semibold block mt-0.5">Roll Number #{selectedModalPhoto.roll}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Verification Date:</span>
                    <span>{new Date(selectedModalPhoto.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Verification Hour:</span>
                    <span className="font-mono">{new Date(selectedModalPhoto.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      </div>

      {/* FOOTER METADATA */}
      <footer className="relative z-10 bg-slate-950/80 border-t border-slate-800 text-slate-400 py-6 text-center text-xs w-full backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500">
          <div>
            &copy; {currentTime.getFullYear()} {schoolName}. All rights reserved under local compliance.
          </div>
          <div className="flex items-center space-x-2 text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-ping" />
            <span className="font-semibold uppercase tracking-wider text-slate-400">TERMINAL ACTIVE ON PORT 3000</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
