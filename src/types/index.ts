export type PageId = 'dashboard' | 'schedule' | 'lessons' | 'students' | 'settlement';

export type LessonStatus = '待记录' | '未结算' | '已结算';

export interface StatCardData {
  label: string;
  value: string;
  tone: 'mint' | 'coral' | 'sunshine' | 'blue';
}

export interface Course {
  id: string;
  time: string;
  studentName: string;
  subject: string;
  type: '固定课程' | '临时补课';
  reminder?: string;
  status?: string;
}

export interface LessonRecord {
  id: string;
  date: string;
  time: string;
  studentName: string;
  subject: string;
  duration: string;
  rate: string;
  amount: string;
  status: LessonStatus;
}

export interface Student {
  id: string;
  name: string;
  gradeSubject: string;
  defaultRate: string;
  defaultDuration: string;
  monthlyHours: string;
  unsettledAmount: string;
  latestLesson?: string;
}

export interface SettlementItem {
  id: string;
  studentName: string;
  lessonCount: number;
  hours: string;
  amount: string;
  latestLesson: string;
}
