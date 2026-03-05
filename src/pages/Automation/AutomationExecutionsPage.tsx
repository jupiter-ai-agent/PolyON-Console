// @ts-nocheck
import { Activity } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

export default function AutomationExecutionsPage() {
  return (
    <>
      <PageHeader title="실행 이력" description="n8n 워크플로우 실행 이력" icon={Activity} />
      <div className="he-stub">
        <Activity size={48} />
        <p className="he-stub__title">실행 이력</p>
        <p className="he-stub__desc">워크플로우 실행 이력을 확인합니다.</p>
      </div>
    </>
  );
}
