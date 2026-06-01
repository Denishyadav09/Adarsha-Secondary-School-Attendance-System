export interface Student {
  roll: string;
  name: string;
  classSection?: string;
  createdAt: string;
  photoUrl?: string; // Base64 data URL
  email?: string;
  phone?: string;
  guardian?: string;
}

export interface AttendanceRecord {
  id: string;
  roll: string;
  name: string;
  timestamp: string; // ISO string
  status: 'Present' | 'Late' | 'Absent';
  classSection?: string;
  capturedPhotoUrl?: string; // live security verification snapshot
}

export interface AttendanceStats {
  totalStudents: number;
  totalPresent: number;
  totalLate: number;
  attendancePresentRate: number;
}

export interface AttendanceReminder {
  id: string;
  title: string;
  dateTime: string; // date-time string input
  targetClass: string; // "All" or a specific section
  channel: 'Email' | 'Browser Notification' | 'Both';
  isSent: boolean;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  roll: string;
  studentName: string;
  type: 'Email' | 'Browser';
  timestamp: string;
  address: string; // email address or "Browser API"
  subject: string;
  message: string;
  status: 'Delivered' | 'Pending';
}

