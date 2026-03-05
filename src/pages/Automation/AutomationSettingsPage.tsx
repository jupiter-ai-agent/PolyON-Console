// @ts-nocheck
import { Settings } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

export default function AutomationSettingsPage() {
  return (
    <>
      <PageHeader title="Automation 설정" description="n8n 엔진 설정" icon={Settings} />
      <div className="he-stub">
        <Settings size={48} />
        <p className="he-stub__title">설정</p>
        <p className="he-stub__desc">n8n 자동화 엔진 설정을 관리합니다.</p>
      </div>
    </>
  );
}
