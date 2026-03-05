// @ts-nocheck
import { DataShare } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

export default function AutomationWorkflowsPage() {
  return (
    <>
      <PageHeader title="워크플로우" description="n8n 워크플로우 목록" icon={DataShare} />
      <div className="he-stub">
        <DataShare size={48} />
        <p className="he-stub__title">워크플로우 관리</p>
        <p className="he-stub__desc">n8n 워크플로우를 관리합니다.</p>
      </div>
    </>
  );
}
