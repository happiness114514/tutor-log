import { ArrowLeft, Download, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ActionButton } from '../components/ActionButton';
import { AppSelect } from '../components/AppSelect';
import { Card } from '../components/Card';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { SectionTitle } from '../components/SectionTitle';
import { useAppSettings } from '../store/useAppSettings';
import type { SettlementCycle } from '../types';
import { clearLocalData, exportLocalData, importLocalData, parseBackupFile } from '../utils/backup';
import { formatDuration } from '../utils/dashboardStats';
import { queueToast, showToast } from '../utils/toast';

interface SettingsProps {
  onBack: () => void;
}

const reminderOptions = [
  { value: '0', label: '0 分钟' },
  { value: '10', label: '10 分钟' },
  { value: '30', label: '30 分钟' },
  { value: '60', label: '60 分钟' },
  { value: '120', label: '120 分钟' },
];

const settlementCycleOptions = [
  { value: 'per_session', label: '按次' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'custom', label: '自定义' },
];

const durationOptions = [
  { value: '1', label: '1 小时' },
  { value: '1.5', label: '1.5 小时' },
  { value: '2', label: '2 小时' },
  { value: 'custom', label: '自定义' },
];

function formatDateTime(value?: string) {
  if (!value) {
    return '还没有导出过';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '还没有导出过';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function durationMode(duration: number) {
  return duration === 1 || duration === 1.5 || duration === 2 ? String(duration) : 'custom';
}

export function Settings({ onBack }: SettingsProps) {
  const { settings, updateSettings, markExportedAt } = useAppSettings();
  const { confirm, confirmDialog } = useConfirmDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [durationSelectValue, setDurationSelectValue] = useState(durationMode(settings.defaultDuration));

  useEffect(() => {
    setDurationSelectValue(durationMode(settings.defaultDuration));
  }, [settings.defaultDuration]);

  function handleExport() {
    const exportedAt = new Date().toISOString();
    const nextSettings = markExportedAt(exportedAt);
    exportLocalData(nextSettings);
    showToast('数据已导出');
  }

  async function handleImportFile(file?: File) {
    if (!file) {
      return;
    }

    try {
      const backup = await parseBackupFile(file);
      const confirmed = await confirm({
        title: '导入数据',
        description: '导入数据会覆盖当前本地数据，确定继续吗？',
        confirmText: '继续导入',
        tone: 'danger',
      });
      if (!confirmed) {
        return;
      }

      importLocalData(backup);
      queueToast('数据导入成功');
      window.location.reload();
    } catch {
      showToast('导入失败，请检查文件格式。', 'error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleClearData() {
    const confirmed = await confirm({
      title: '清空所有本地数据',
      description: '清空后将删除本机浏览器中的学生、课时、课程和设置数据。此操作不可恢复，建议先导出备份。是否继续？',
      confirmText: '清空数据',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    clearLocalData();
    queueToast('数据已清空');
    window.location.reload();
  }

  return (
    <div className="edit-page-transition -mx-4 -mt-6 min-h-screen bg-paper px-4 pb-12 pt-6">
      {confirmDialog}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="pressable inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm active:bg-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">设置</h1>
          <p className="mt-1 text-sm text-neutral-500">管理数据、偏好和应用信息</p>
        </div>
      </div>

      <SectionTitle>数据管理</SectionTitle>
      <Card>
        <p className="text-sm leading-6 text-neutral-600">当前数据保存在本机浏览器中，建议定期导出备份。</p>
        <dl className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-500">最近导出时间</dt>
            <dd className="font-medium text-neutral-800">{formatDateTime(settings.lastExportedAt)}</dd>
          </div>
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <ActionButton variant="primary" className="inline-flex items-center justify-center gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            导出数据
          </ActionButton>
          <ActionButton className="inline-flex items-center justify-center gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            导入数据
          </ActionButton>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleImportFile(event.target.files?.[0])}
        />
      </Card>

      <SectionTitle>默认偏好</SectionTitle>
      <Card>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">默认 App 内提前提醒时间</p>
            <AppSelect
              title="选择默认提醒时间"
              value={String(settings.defaultReminderMinutesBefore)}
              options={reminderOptions}
              onChange={(value) => updateSettings({ defaultReminderMinutesBefore: Number(value) })}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">默认结算周期</p>
            <AppSelect
              title="选择默认结算周期"
              value={settings.defaultSettlementCycle}
              options={settlementCycleOptions}
              onChange={(value) => updateSettings({ defaultSettlementCycle: value as SettlementCycle })}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">默认课程时长</p>
            <AppSelect
              title="选择默认课程时长"
              value={durationSelectValue}
              options={durationOptions}
              onChange={(value) => {
                setDurationSelectValue(value);
                if (value !== 'custom') {
                  updateSettings({ defaultDuration: Number(value) });
                }
              }}
            />
            {durationSelectValue === 'custom' ? (
              <div className="mt-3">
                <input
                  className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/15"
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={settings.defaultDuration}
                  onChange={(event) => updateSettings({ defaultDuration: Number(event.target.value) || 2 })}
                />
                <p className="mt-1 text-xs text-neutral-500">保存为 {formatDuration(settings.defaultDuration)}。</p>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <SectionTitle>数据安全</SectionTitle>
      <Card>
        <p className="text-sm leading-6 text-neutral-600">清空数据会移除本机浏览器中的所有本地记录。建议先导出备份。</p>
        <ActionButton className="mt-4 inline-flex w-full items-center justify-center gap-2 border-rose-200 bg-rose-50 text-rose-700 active:bg-rose-100" onClick={handleClearData}>
          <Trash2 className="h-4 w-4" />
          清空所有本地数据
        </ActionButton>
      </Card>

      <SectionTitle>应用信息</SectionTitle>
      <Card>
        <dl className="grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-500">应用名</dt>
            <dd className="font-medium text-neutral-800">家教课时本</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-500">当前版本</dt>
            <dd className="font-medium text-neutral-800">v0.1.0</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-500">数据存储方式</dt>
            <dd className="font-medium text-neutral-800">本地浏览器存储</dd>
          </div>
        </dl>
        <p className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-600">
          专为个人家教老师设计的课时、课程和结算管理工具。
        </p>
      </Card>

      <SectionTitle>使用说明</SectionTitle>
      <Card>
        <div className="space-y-4 text-sm leading-6">
          <div>
            <p className="font-medium text-neutral-900">数据会同步到云端吗？</p>
            <p className="mt-1 text-neutral-500">当前版本不会，数据保存在本机浏览器中。</p>
          </div>
          <div>
            <p className="font-medium text-neutral-900">换设备怎么办？</p>
            <p className="mt-1 text-neutral-500">可以先导出数据，再在新设备中导入。</p>
          </div>
          <div>
            <p className="font-medium text-neutral-900">关闭网页后数据还在吗？</p>
            <p className="mt-1 text-neutral-500">一般会保留，但清理浏览器数据可能导致丢失，建议定期备份。</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
