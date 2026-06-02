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

export type BillingType = 'hourly' | 'per_session';

export type SettlementCycle = 'per_session' | 'weekly' | 'monthly' | 'custom';

export type Student = {
  id: string;
  name: string;
  grade?: string;
  subject?: string;
  defaultRate: number;
  defaultDuration: number;
  billingType: BillingType;
  settlementCycle: SettlementCycle;
  parentContact?: string;
  note?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export interface SettlementItem {
  id: string;
  studentName: string;
  lessonCount: number;
  hours: string;
  amount: string;
  latestLesson: string;
}
