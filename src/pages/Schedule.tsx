import { ActionButton } from '../components/ActionButton';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Tag } from '../components/Tag';
import { courses } from '../store/mockData';

export function Schedule() {
  return (
    <div>
      <PageHeader title="课程表" />

      <div className="mb-4 grid grid-cols-3 rounded-lg border border-line bg-white p-1">
        {['今日', '本周', '固定课程'].map((item, index) => (
          <button
            key={item}
            type="button"
            className={`h-9 rounded-md text-sm font-medium ${
              index === 0 ? 'bg-mint text-white' : 'text-slate-600'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {courses.map((course) => (
          <Card key={course.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{course.time}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {course.studentName} · {course.subject}
                </p>
              </div>
              <Tag active={course.type === '固定课程'}>{course.type}</Tag>
            </div>
            {course.reminder ? <p className="mt-3 text-sm text-slate-500">{course.reminder}</p> : null}
          </Card>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <ActionButton variant="primary">新增固定课程</ActionButton>
        <ActionButton>新增临时课程</ActionButton>
      </div>
    </div>
  );
}
