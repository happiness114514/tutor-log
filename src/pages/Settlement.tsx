import { useState } from 'react';
import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { SectionTitle } from '../components/SectionTitle';
import { useLessons } from '../store/useLessons';
import { useStudents } from '../store/useStudents';
import type { Lesson } from '../types';
import { formatDuration, formatMoney } from '../utils/dashboardStats';
import {
  formatLessonDateTime,
  generateSettlementText,
  getLessonStatusLabel,
  getSettlementOverview,
  getUnsettledLessonsByStudent,
  type SettlementStudentSummary,
} from '../utils/settlementStats';

interface SettlementProps {
  onNavigateToLessons: () => void;
}

function summaryText(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.length > 28 ? `${value.slice(0, 28)}...` : value;
}

function fallbackCopyText(text: string) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', 'true');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '0';
  document.body.appendChild(textArea);
  textArea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(textArea);

  if (!success) {
    throw new Error('Copy command failed');
  }
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  fallbackCopyText(text);
}

function SettlementDetail({
  summary,
  onSettleLesson,
}: {
  summary: SettlementStudentSummary;
  onSettleLesson: (summary: SettlementStudentSummary, lesson: Lesson) => void;
}) {
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <div className="space-y-3">
        {summary.lessons.map((lesson) => {
          const content = summaryText(lesson.content);
          const homework = summaryText(lesson.homework);

          return (
            <div key={lesson.id} className="rounded-lg border border-line bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{formatLessonDateTime(lesson)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {summary.subject} · {getLessonStatusLabel(lesson.status)}
                  </p>
                </div>
                <p className="text-lg font-bold text-coral">{formatMoney(lesson.amount)}</p>
              </div>

              <p className="mt-3 text-sm text-slate-700">时长：{formatDuration(lesson.duration)}</p>
              {content ? <p className="mt-2 text-sm text-slate-500">课堂内容：{content}</p> : null}
              {homework ? <p className="mt-1 text-sm text-slate-500">作业：{homework}</p> : null}

              <ActionButton className="mt-3 w-full" onClick={() => onSettleLesson(summary, lesson)}>
                标记本节已收款
              </ActionButton>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg bg-mint/10 p-3 text-sm">
        <p className="font-semibold text-ink">明细合计</p>
        <p className="mt-2 text-slate-600">
          {summary.lessonCount} 次课 · {formatDuration(summary.duration)} · {formatMoney(summary.amount)}
        </p>
      </div>
    </div>
  );
}

export function Settlement({ onNavigateToLessons }: SettlementProps) {
  const { students } = useStudents();
  const { lessons, markLessonsSettled } = useLessons();
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const summaries = getUnsettledLessonsByStudent(students, lessons);
  const overview = getSettlementOverview(summaries);

  async function handleCopy(summary: SettlementStudentSummary) {
    try {
      await copyText(generateSettlementText(summary));
      setNotice('结算明细已复制');
    } catch {
      setNotice('复制失败，请手动复制账单文本');
    }
  }

  function handleSettleStudent(summary: SettlementStudentSummary) {
    const confirmed = window.confirm(`确定将 ${summary.studentName} 的 ${summary.lessonCount} 节课标记为已结算吗？`);
    if (!confirmed) {
      return;
    }

    markLessonsSettled(summary.lessons.map((lesson) => lesson.id));
    setExpandedStudentId(null);
    setNotice(`${summary.studentName} 的未结算课时已标记为已收款`);
  }

  function handleSettleLesson(summary: SettlementStudentSummary, lesson: Lesson) {
    const confirmed = window.confirm(`确定将 ${summary.studentName} ${lesson.date} 的课时标记为已结算吗？`);
    if (!confirmed) {
      return;
    }

    markLessonsSettled([lesson.id]);
    setNotice(`${summary.studentName} ${lesson.date} 的课时已标记为已收款`);
  }

  const overviewItems = [
    { label: '当前未结算', value: formatMoney(overview.amount), highlight: true },
    { label: '未结算课次', value: `${overview.lessonCount}节` },
    { label: '涉及学生', value: `${overview.studentCount}人` },
  ];

  return (
    <div>
      <PageHeader title="结算" />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">结算总览</h2>
          <span className="text-xs text-slate-400">未结算</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {overviewItems.map((item) => (
            <div key={item.label} className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className={`mt-2 text-lg font-bold ${item.highlight ? 'text-coral' : 'text-ink'}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {notice ? (
        <div className="mt-3 rounded-lg border border-mint/20 bg-mint/10 px-3 py-2 text-sm text-mint">{notice}</div>
      ) : null}

      <SectionTitle>学生结算</SectionTitle>
      {summaries.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-slate-500">暂无未结算课时，所有课程都已结清。</p>
          <ActionButton variant="primary" className="mt-4" onClick={onNavigateToLessons}>
            去记录课时
          </ActionButton>
        </Card>
      ) : (
        <div className="space-y-3">
          {summaries.map((summary) => {
            const isExpanded = expandedStudentId === summary.studentId;

            return (
              <Card key={summary.studentId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-ink">{summary.studentName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {summary.subject} · 最近 {summary.latestLessonDate ?? '未填写日期'}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-coral">{formatMoney(summary.amount)}</p>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-md bg-slate-50 p-2">
                    <dt className="text-xs text-slate-500">未结算课次</dt>
                    <dd className="mt-1 font-semibold">{summary.lessonCount}节</dd>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2">
                    <dt className="text-xs text-slate-500">未结算课时</dt>
                    <dd className="mt-1 font-semibold">{formatDuration(summary.duration)}</dd>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2">
                    <dt className="text-xs text-slate-500">未结算金额</dt>
                    <dd className="mt-1 font-semibold text-coral">{formatMoney(summary.amount)}</dd>
                  </div>
                </dl>

                <div className="mt-4 grid gap-2">
                  <ActionButton className="w-full" onClick={() => setExpandedStudentId(isExpanded ? null : summary.studentId)}>
                    {isExpanded ? '收起明细' : '查看明细'}
                  </ActionButton>
                  <div className="grid grid-cols-2 gap-2">
                    <ActionButton className="w-full" onClick={() => handleCopy(summary)}>
                      复制账单
                    </ActionButton>
                    <ActionButton variant="primary" className="w-full" onClick={() => handleSettleStudent(summary)}>
                      标记已收款
                    </ActionButton>
                  </div>
                </div>

                {isExpanded ? <SettlementDetail summary={summary} onSettleLesson={handleSettleLesson} /> : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
