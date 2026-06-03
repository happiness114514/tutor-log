export type PageId = 'dashboard' | 'schedule' | 'lessons' | 'students' | 'settlement';

export type LessonStatus = 'completed' | 'cancelled' | 'leave' | 'makeup' | 'trial';

export type TrialFeeMode = 'free' | 'half' | 'normal' | 'custom';

export interface Course {
  id: string;
  time: string;
  studentName: string;
  subject: string;
  type: '固定课程' | '临时补课';
  reminder?: string;
  status?: string;
}

export type BillingType = 'hourly' | 'per_session';

export type SettlementCycle = 'per_session' | 'weekly' | 'monthly' | 'custom';

export type ScheduleType = 'recurring' | 'one_time';

export type ScheduleStatus = 'active' | 'paused' | 'ended';

export type Schedule = {
  id: string;
  studentId: string;
  studentNameSnapshot?: string;
  studentSubjectSnapshot?: string;
  studentGradeSnapshot?: string;
  title?: string;
  subject?: string;
  scheduleType: ScheduleType;
  repeatRule?: {
    frequency: 'weekly';
    weekdays: number[];
  };
  date?: string;
  startTime: string;
  endTime: string;
  location?: string;
  reminderMinutesBefore?: number;
  postClassReminderEnabled: boolean;
  defaultDuration: number;
  defaultRate: number;
  billingType: BillingType;
  status: ScheduleStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

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

export type Lesson = {
  id: string;
  studentId: string;
  studentNameSnapshot?: string;
  studentSubjectSnapshot?: string;
  studentGradeSnapshot?: string;
  scheduleId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  rate: number;
  billingType: BillingType;
  amount: number;
  status: LessonStatus;
  trialFeeMode?: TrialFeeMode;
  isSettled: boolean;
  content?: string;
  homework?: string;
  note?: string;
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
