import type { Course, SettlementItem, StatCardData, Student } from '../types';

export const dashboardStats: StatCardData[] = [
  { label: '本月应收', value: '¥3200', tone: 'mint' },
  { label: '本月已收', value: '¥2400', tone: 'blue' },
  { label: '未结算', value: '¥800', tone: 'coral' },
  { label: '本月课时', value: '21h', tone: 'sunshine' },
];

export const todayCourse: Course = {
  id: 'course-today-1',
  time: '19:00-21:00',
  studentName: '小明',
  subject: '初二数学',
  type: '固定课程',
  reminder: '提前30分钟提醒',
  status: '待上课',
};

export const todos = ['小红有 3 节课未结算，共 ¥900', '小明有 1 节课待记录'];

export const courses: Course[] = [
  {
    id: 'course-1',
    time: '每周一 19:00-21:00',
    studentName: '小明',
    subject: '初二数学',
    type: '固定课程',
    reminder: '提前30分钟提醒',
  },
  {
    id: 'course-2',
    time: '6月5日 15:00-17:00',
    studentName: '小红',
    subject: '英语',
    type: '临时补课',
  },
];

export const defaultStudents: Student[] = [
  {
    id: 'student-1',
    name: '小明',
    grade: '初二',
    subject: '数学',
    defaultRate: 150,
    defaultDuration: 2,
    billingType: 'hourly',
    settlementCycle: 'monthly',
    parentContact: '13800000001',
    note: '基础不错，近期重点练习几何题。',
    isActive: true,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'student-2',
    name: '小红',
    grade: '高一',
    subject: '英语',
    defaultRate: 120,
    defaultDuration: 2,
    billingType: 'per_session',
    settlementCycle: 'weekly',
    parentContact: '13800000002',
    note: '每周补一次阅读和语法。',
    isActive: true,
    createdAt: '2026-05-30T10:00:00.000Z',
    updatedAt: '2026-05-30T10:00:00.000Z',
  },
];

export const settlementItems: SettlementItem[] = [
  {
    id: 'settlement-1',
    studentName: '小明',
    lessonCount: 2,
    hours: '4小时',
    amount: '¥600',
    latestLesson: '6月1日',
  },
  {
    id: 'settlement-2',
    studentName: '小红',
    lessonCount: 3,
    hours: '6小时',
    amount: '¥900',
    latestLesson: '5月30日',
  },
];
