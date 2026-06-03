import { useState } from 'react';
import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { SectionTitle } from '../components/SectionTitle';
import { useLessons } from '../store/useLessons';
import { useStudents } from '../store/useStudents';
import type { Lesson } from '../types';
import { copyTextToClipboard } from '../utils/clipboard';
import { formatDuration, formatMoney } from '../utils/dashboardStats';
import {
  formatLessonDateTime,
  generateSettlementText,
  getLessonStatusLabel,
  getSettlementOverview,
  getUnsettledLessonsByStudent,
  type SettlementStudentSummary,
} from '../utils/settlementStats';
import { showToast } from '../utils/toast';

interface SettlementProps {
  onNavigateToLessons: () => void;
}

function summaryText(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.length > 28 ? `${value.slice(0, 28)}...` : value;
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
                <p className="text-lg font-bold text-neutral-950">{formatMoney(lesson.amount)}</p>
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

      <div className="rounded-2xl bg-neutral-50 p-3 text-sm">
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
  const [manualCopyText, setManualCopyText] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();

  const summaries = getUnsettledLessonsByStudent(students, lessons);
  const overview = getSettlementOverview(summaries);

  async function handleCopy(summary: SettlementStudentSummary) {
    const text = generateSettlementText(summary);

    try {
      await copyTextToClipboard(text);
      setManualCopyText('');
      setNotice('结算明细已复制');
      showToast('结算明细已复制');
    } catch {
      setManualCopyText(text);
      setNotice('自动复制失败，请从下方文本框手动复制');
      showToast('自动复制失败，请手动复制', 'error');
    }
  }

  async function handleSettleStudent(summary: SettlementStudentSummary) {
    const confirmed = await confirm({
      title: '标记已收款',
      description: `确定将 ${summary.studentName} 的 ${summary.lessonCount} 节课标记为已结算吗？`,
      confirmText: '标记已收款',
    });
    if (!confirmed) {
      return;
    }

    markLessonsSettled(summary.lessons.map((lesson) => lesson.id));
    setExpandedStudentId(null);
    setManualCopyText('');
    setNotice(`${summary.studentName} 的未结算课时已标记为已收款`);
    showToast('已标记为已收款');
  }

  async function handleSettleLesson(summary: SettlementStudentSummary, lesson: Lesson) {
    const confirmed = await confirm({
      title: '标记本节已收款',
      description: `确定将 ${summary.studentName} ${lesson.date} 的课时标记为已结算吗？`,
      confirmText: '标记已收款',
    });
    if (!confirmed) {
      return;
    }

    markLessonsSettled([lesson.id]);
    setManualCopyText('');
    setNotice(`${summary.studentName} ${lesson.date} 的课时已标记为已收款`);
    showToast('已标记本节已收款');
  }

  const overviewItems = [
    { label: '当前未结算', value: formatMoney(overview.amount), highlight: true },
    { label: '未结算课次', value: `${overview.lessonCount}节` },
    { label: '涉及学生', value: `${overview.studentCount}人` },
  ];

  return (
    <div>
      <PageHeader title="结算" />
      {confirmDialog}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">结算总览</h2>
          <span className="text-xs text-slate-400">未结算</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {overviewItems.map((item) => (
            <div key={item.label} className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className={`mt-2 text-lg font-bold ${item.highlight ? 'text-neutral-950' : 'text-ink'}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {notice ? (
        <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">{notice}</div>
      ) : null}

      {manualCopyText ? (
        <Card className="mt-3">
          <p className="mb-2 text-sm font-semibold text-ink">手动复制账单</p>
          <textarea
            className="h-40 w-full rounded-md border border-line bg-slate-50 p-3 text-sm text-slate-700 outline-none focus:border-mint"
            readOnly
            value={manualCopyText}
            onFocus={(event) => event.currentTarget.select()}
          />
        </Card>
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
                  <p className="text-xl font-bold text-neutral-950">{formatMoney(summary.amount)}</p>
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
                    <dd className="mt-1 font-semibold text-neutral-950">{formatMoney(summary.amount)}</dd>
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
