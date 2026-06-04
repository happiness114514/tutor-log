import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { SectionTitle } from '../components/SectionTitle';
import { useLessons } from '../store/useLessons';
import { useStudents } from '../store/useStudents';
import { formatDuration, formatMoney } from '../utils/dashboardStats';
import {
  formatChartDuration,
  formatChartMoney,
  getMonthStats,
  getRecentMonthTrend,
  getStatusDistribution,
  getStudentMonthlyRanking,
} from '../utils/statisticsStats';

interface StatisticsProps {
  onBack: () => void;
}

const statusColors = ['#171717', '#525252', '#737373', '#a3a3a3', '#d4d4d4'];

function getCurrentMonth() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

function shiftMonth(year: number, month: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

function monthTitle(year: number, month: number) {
  return `${year}年${month}月`;
}

function shortMoney(amount: number) {
  if (amount >= 10000) {
    return `${Number((amount / 10000).toFixed(1))}万`;
  }

  return `${amount}`;
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 text-center text-sm text-neutral-500">
      {message}
    </div>
  );
}

export function Statistics({ onBack }: StatisticsProps) {
  const { students } = useStudents();
  const { lessons } = useLessons();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);

  const monthStats = useMemo(
    () => getMonthStats(lessons, students, selectedMonth.year, selectedMonth.month),
    [lessons, selectedMonth.month, selectedMonth.year, students],
  );
  const recentTrend = useMemo(
    () => getRecentMonthTrend(lessons, students, selectedMonth.year, selectedMonth.month, 6),
    [lessons, selectedMonth.month, selectedMonth.year, students],
  );
  const studentRanking = useMemo(
    () => getStudentMonthlyRanking(lessons, students, selectedMonth.year, selectedMonth.month),
    [lessons, selectedMonth.month, selectedMonth.year, students],
  );
  const incomeRanking = studentRanking.slice(0, 5);
  const durationRanking = [...studentRanking].sort((a, b) => b.duration - a.duration).slice(0, 5);
  const statusDistribution = useMemo(
    () => getStatusDistribution(lessons, selectedMonth.year, selectedMonth.month),
    [lessons, selectedMonth.month, selectedMonth.year],
  );

  const overviewCards = [
    { label: '本月应收', value: formatMoney(monthStats.receivable) },
    { label: '本月已收', value: formatMoney(monthStats.received) },
    { label: '本月未结算', value: formatMoney(monthStats.unsettled), highlight: true },
    { label: '本月课时', value: formatDuration(monthStats.duration) },
    { label: '本月课次', value: `${monthStats.lessonCount}次` },
    { label: '上课学生数', value: `${monthStats.studentCount}人` },
  ];

  function updateMonth(offset: number) {
    setSelectedMonth((current) => shiftMonth(current.year, current.month, offset));
  }

  return (
    <div>
      <header className="mb-5 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition active:bg-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </button>
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-800">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[26px] font-semibold tracking-normal text-neutral-900">数据统计</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-500">查看你的家教收入、课时和结算情况</p>
          </div>
        </div>
      </header>

      <Card className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => updateMonth(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 transition active:bg-neutral-100"
            aria-label="上个月"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-xs text-neutral-500">当前月份</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">{monthTitle(selectedMonth.year, selectedMonth.month)}</p>
          </div>
          <button
            type="button"
            onClick={() => updateMonth(1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 transition active:bg-neutral-100"
            aria-label="下个月"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </Card>

      <Card className="p-0">
        <section className="grid grid-cols-2 divide-x divide-y divide-neutral-100 overflow-hidden rounded-2xl">
          {overviewCards.map((item) => (
            <div key={item.label} className="p-4">
              <p className="text-xs text-neutral-500">{item.label}</p>
              <p className={`mt-2 text-lg font-semibold tracking-normal ${item.highlight ? 'text-neutral-950' : 'text-neutral-900'}`}>
                {item.value}
              </p>
            </div>
          ))}
        </section>
      </Card>

      <SectionTitle>趋势图表</SectionTitle>
      <div className="grid gap-4">
        <ChartCard title="最近 6 个月收入趋势" description={`以 ${monthTitle(selectedMonth.year, selectedMonth.month)} 为终点`}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recentTrend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={shortMoney} />
                <Tooltip
                  formatter={(value, name) => [
                    formatChartMoney(Number(value)),
                    name === 'receivable' ? '应收金额' : '已收金额',
                  ]}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: '#e5e5e5',
                    boxShadow: '0 12px 30px rgba(23,23,23,0.08)',
                  }}
                />
                <Line type="monotone" dataKey="receivable" stroke="#171717" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="received" stroke="#737373" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-neutral-900" />
              应收金额
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-neutral-500" />
              已收金额
            </span>
          </div>
        </ChartCard>

        <ChartCard title="学生收入排行" description="按本月有效课时收入排序，最多展示前 5 名">
          {incomeRanking.length === 0 ? (
            <EmptyChart message="本月还没有学生收入数据。" />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeRanking} layout="vertical" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#eeeeee" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={shortMoney} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={72}
                    tick={{ fill: '#525252', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [formatChartMoney(Number(value)), '本月收入']}
                    contentStyle={{
                      borderRadius: 12,
                      borderColor: '#e5e5e5',
                      boxShadow: '0 12px 30px rgba(23,23,23,0.08)',
                    }}
                  />
                  <Bar dataKey="income" fill="#262626" radius={[0, 8, 8, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="学生课时排行" description="按本月有效课时时长排序，最多展示前 5 名">
          {durationRanking.length === 0 ? (
            <EmptyChart message="本月还没有课时数据。" />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={durationRanking.map((item) => ({
                    ...item,
                    durationHours: Number(item.duration.toFixed(2)),
                  }))}
                  layout="vertical"
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid stroke="#eeeeee" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#737373', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value}h`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={72}
                    tick={{ fill: '#525252', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [formatChartDuration(Number(value)), '本月课时']}
                    contentStyle={{
                      borderRadius: 12,
                      borderColor: '#e5e5e5',
                      boxShadow: '0 12px 30px rgba(23,23,23,0.08)',
                    }}
                  />
                  <Bar dataKey="durationHours" fill="#525252" radius={[0, 8, 8, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="本月课程状态分布" description="统计本月全部课时记录状态，包含请假、取消和免费试课">
          {statusDistribution.length === 0 ? (
            <EmptyChart message="本月还没有课程状态数据。" />
          ) : (
            <div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      formatter={(value, name) => [`${value}次`, name]}
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: '#e5e5e5',
                        boxShadow: '0 12px 30px rgba(23,23,23,0.08)',
                      }}
                    />
                    <Pie
                      data={statusDistribution}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={46}
                      outerRadius={76}
                      paddingAngle={2}
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {statusDistribution.map((item, index) => (
                        <Cell key={item.status} fill={statusColors[index % statusColors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-2">
                {statusDistribution.map((item, index) => {
                  const total = statusDistribution.reduce((sum, current) => sum + current.count, 0);
                  const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;

                  return (
                    <div key={item.status} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm">
                      <span className="inline-flex items-center gap-2 text-neutral-700">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: statusColors[index % statusColors.length] }}
                        />
                        {item.label}
                      </span>
                      <span className="font-medium text-neutral-900">
                        {item.count}次 · {percent}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      <SectionTitle>学生贡献榜</SectionTitle>
      <Card>
        {studentRanking.length === 0 ? (
          <p className="text-sm text-neutral-500">本月还没有学生贡献数据。</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {studentRanking.map((item, index) => (
              <div key={item.studentId} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900">
                      {index + 1}. {item.name}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">{item.subject}</p>
                  </div>
                  <p className="shrink-0 text-base font-semibold text-neutral-950">{formatMoney(item.income)}</p>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl bg-neutral-50 px-3 py-2">
                    <dt className="text-neutral-500">课时</dt>
                    <dd className="mt-1 font-medium text-neutral-900">{formatDuration(item.duration)}</dd>
                  </div>
                  <div className="rounded-xl bg-neutral-50 px-3 py-2">
                    <dt className="text-neutral-500">课次</dt>
                    <dd className="mt-1 font-medium text-neutral-900">{item.lessonCount}次</dd>
                  </div>
                  <div className="rounded-xl bg-neutral-50 px-3 py-2">
                    <dt className="text-neutral-500">未结算</dt>
                    <dd className="mt-1 font-medium text-neutral-900">{formatMoney(item.unsettledAmount)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-4">
        <ActionButton className="w-full" onClick={onBack}>
          返回首页
        </ActionButton>
      </div>
    </div>
  );
}

