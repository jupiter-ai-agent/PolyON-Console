import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ToastNotification';
import ConsoleLayout from './layouts/ConsoleLayout';
import SetupLayout from './layouts/SetupLayout';
import ModuleGuard from './components/ModuleGuard';

// Dynamic module router
const DynamicModuleRouter = lazy(() => import('./components/DynamicModuleRouter').then(m => ({ default: m.DynamicModuleRouter })));

// ── Lazy imports ──────────────────────────────────────────────────────────────
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));

// Directory
const UsersPage = lazy(() => import('./pages/Users/UsersPage'));
const GroupsPage = lazy(() => import('./pages/Groups/GroupsPage'));
const OUsPage = lazy(() => import('./pages/OUs/OUsPage'));
const ComputersPage = lazy(() => import('./pages/Computers/ComputersPage'));
const TreePage = lazy(() => import('./pages/Directory/TreePage'));
const DrivePage = lazy(() => import('./pages/Directory/DrivePage'));

// Networking
const DNSPage = lazy(() => import('./pages/Networking/DNSPage'));
const DCsPage = lazy(() => import('./pages/Networking/DCsPage'));
const VPNPage = lazy(() => import('./pages/Networking/VPNPage'));
const FirewallPage = lazy(() => import('./pages/Networking/FirewallPage'));

// AppEngine
const AppEnginePage = lazy(() => import('./pages/AppEngine/AppEnginePage'));
const AppEngineModulesPage = lazy(() => import('./pages/AppEngine/AppEngineModulesPage'));
const AppEngineUsersPage = lazy(() => import('./pages/AppEngine/AppEngineUsersPage'));

const AppEngineLDAPPage = lazy(() => import('./pages/AppEngine/AppEngineLDAPPage'));
const AppEngineCronPage = lazy(() => import('./pages/AppEngine/AppEngineCronPage'));

// Mail
const MailPage = lazy(() => import('./pages/Mail/MailPage'));
const MailAccountsPage = lazy(() => import('./pages/Mail/MailAccountsPage'));
const MailGroupsPage = lazy(() => import('./pages/Mail/MailGroupsPage'));
const MailListsPage = lazy(() => import('./pages/Mail/MailListsPage'));
const MailDomainsPage = lazy(() => import('./pages/Mail/MailDomainsPage'));
const MailRolesPage = lazy(() => import('./pages/Mail/MailRolesPage'));
const MailTenantsPage = lazy(() => import('./pages/Mail/MailTenantsPage'));
const MailApiKeysPage = lazy(() => import('./pages/Mail/MailApiKeysPage'));
const MailOAuthPage = lazy(() => import('./pages/Mail/MailOAuthPage'));
const MailQueuePage = lazy(() => import('./pages/Mail/MailQueuePage'));
const MailQueueReportsPage = lazy(() => import('./pages/Mail/MailQueueReportsPage'));
const MailReportsPage = lazy(() => import('./pages/Mail/MailReportsPage'));
const MailHistoryReceivedPage = lazy(() => import('./pages/Mail/MailHistoryReceivedPage'));
const MailHistoryDeliveryPage = lazy(() => import('./pages/Mail/MailHistoryDeliveryPage'));
const MailLogsPage = lazy(() => import('./pages/Mail/MailLogsPage'));
const MailLiveTracingPage = lazy(() => import('./pages/Mail/MailLiveTracingPage'));
const MailSpamTestPage = lazy(() => import('./pages/Mail/MailSpamTestPage'));
const MailSpamUploadPage = lazy(() => import('./pages/Mail/MailSpamUploadPage'));
const MailTroubleshootPage = lazy(() => import('./pages/Mail/MailTroubleshootPage'));
const MailDmarcPage = lazy(() => import('./pages/Mail/MailDmarcPage'));
const MailTLSPage = lazy(() => import('./pages/Mail/MailTLSPage'));
const MailSievePage = lazy(() => import('./pages/Mail/MailSievePage'));
const MailMaintenancePage = lazy(() => import('./pages/Mail/MailMaintenancePage'));
const MailConfigPage = lazy(() => import('./pages/Mail/MailConfigPage'));

// Apps & Homepage
const AppsPage = lazy(() => import('./pages/Apps/AppsPage'));
const AppsSSOPage = lazy(() => import('./pages/Apps/AppsSSOPage'));
const AppsDetailPage = lazy(() => import('./pages/Apps/AppsDetailPage'));
const HomepageSitesPage = lazy(() => import('./pages/Homepage/HomepageSitesPage'));
const HomepageCreatePage = lazy(() => import('./pages/Homepage/HomepageCreatePage'));
const HomepageBuildPage = lazy(() => import('./pages/Homepage/HomepageBuildPage'));

// Automation (n8n)
const AutomationPage = lazy(() => import('./pages/Automation/AutomationPage'));
const AutomationWorkflowsPage = lazy(() => import('./pages/Automation/AutomationWorkflowsPage'));
const AutomationExecutionsPage = lazy(() => import('./pages/Automation/AutomationExecutionsPage'));
const AutomationSettingsPage = lazy(() => import('./pages/Automation/AutomationSettingsPage'));

// AI
const AIOverviewPage = lazy(() => import('./pages/AI/AIOverviewPage'));
const AIModelsPage = lazy(() => import('./pages/AI/AIModelsPage'));
const AIAgentsPage = lazy(() => import('./pages/AI/AIAgentsPage'));
const AIMemoryPage = lazy(() => import('./pages/AI/AIMemoryPage'));
const AIKeysPage = lazy(() => import('./pages/AI/AIKeysPage'));
const AIUsagePage = lazy(() => import('./pages/AI/AIUsagePage'));
const AISettingsPage = lazy(() => import('./pages/AI/AISettingsPage'));
const AIPipelinePage = lazy(() => import('./pages/AI/AIPipelinePage'));

// Monitoring
const MonitoringPage = lazy(() => import('./pages/Monitoring/MonitoringPage'));
const MonitoringAlertsPage = lazy(() => import('./pages/Monitoring/MonitoringAlertsPage'));
const MonitoringLogsPage = lazy(() => import('./pages/Monitoring/MonitoringLogsPage'));
const SentinelPage = lazy(() => import('./pages/Monitoring/SentinelPage'));

// Security
const SecurityPage = lazy(() => import('./pages/Security/SecurityPage'));
const SecurityPoliciesPage = lazy(() => import('./pages/Security/SecurityPoliciesPage'));
const SecurityGPOPage = lazy(() => import('./pages/Security/SecurityGPOPage'));
const SecurityACLPage = lazy(() => import('./pages/Security/SecurityACLPage'));
const SecurityAccessPolicyPage = lazy(() => import('./pages/Security/SecurityAccessPolicyPage'));
const SecurityAuditLogPage = lazy(() => import('./pages/Security/SecurityAuditLogPage'));

// Containers
// PRC
const PRCPage = lazy(() => import('./pages/PRC/PRCPage'));
const ERPEngineFrame = lazy(() => import('./components/ERPEngineFrame'));

const ContainersPage = lazy(() => import('./pages/Containers/ContainersPage'));
const ContainersTopologyPage = lazy(() => import('./pages/Containers/ContainersTopologyPage'));
const ContainersResourcesPage = lazy(() => import('./pages/Containers/ContainersResourcesPage'));

// Databases
const DatabasePostgresqlPage = lazy(() => import('./pages/Databases/DatabasePostgresqlPage'));
const DatabaseRedisPage = lazy(() => import('./pages/Databases/DatabaseRedisPage'));
const DatabaseElasticPage = lazy(() => import('./pages/Databases/DatabaseElasticPage'));
const DatabaseRustfsPage = lazy(() => import('./pages/Databases/DatabaseRustfsPage'));

// Chat
const ChatPage = lazy(() => import('./pages/Chat/ChatPage'));
const ChatTeamsPage = lazy(() => import('./pages/Chat/ChatTeamsPage'));
const ChatChannelsPage = lazy(() => import('./pages/Chat/ChatChannelsPage'));
const ChatUsersPage = lazy(() => import('./pages/Chat/ChatUsersPage'));
const ChatSettingsPage = lazy(() => import('./pages/Chat/ChatSettingsPage'));

// Drive — iframe (C 방식: ModuleSector)
// 구 Nextcloud 페이지 제거 → PolyON-Drive (Rust) 자체 Admin UI 사용
import ModuleSector from './components/ModuleSector';

// Wiki (AFFiNE)
const WikiOverviewPage = lazy(() => import('./pages/Wiki/WikiPage'));
const WikiWorkspacesPage = lazy(() => import('./pages/Wiki/WikiWorkspacesPage'));
const WikiUsersPage = lazy(() => import('./pages/Wiki/WikiUsersPage'));
const WikiSettingsPage = lazy(() => import('./pages/Wiki/WikiSettingsPage'));

// BPMN
const BPMNPage = lazy(() => import('./pages/BPMN/BPMNPage'));
const BPMNProcessesPage = lazy(() => import('./pages/BPMN/BPMNProcessesPage'));
const BPMNInstancesPage = lazy(() => import('./pages/BPMN/BPMNInstancesPage'));
const BPMNTasksPage = lazy(() => import('./pages/BPMN/BPMNTasksPage'));
const BPMNHistoryPage = lazy(() => import('./pages/BPMN/BPMNHistoryPage'));
const BPMNIncidentsPage = lazy(() => import('./pages/BPMN/BPMNIncidentsPage'));
const BPMNDeploymentsPage = lazy(() => import('./pages/BPMN/BPMNDeploymentsPage'));
const BPMNProcessDetailPage = lazy(() => import('./pages/BPMN/BPMNProcessDetailPage'));
const BPMNInstanceDetailPage = lazy(() => import('./pages/BPMN/BPMNInstanceDetailPage'));
const BPMNTaskDetailPage = lazy(() => import('./pages/BPMN/BPMNTaskDetailPage'));
const BPMNDecisionsPage = lazy(() => import('./pages/BPMN/BPMNDecisionsPage'));
const BPMNDecisionDetailPage = lazy(() => import('./pages/BPMN/BPMNDecisionDetailPage'));

// Settings
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage'));
const SettingsDomainPage = lazy(() => import('./pages/Settings/SettingsDomainPage'));
const SettingsTLSPage = lazy(() => import('./pages/Settings/SettingsTLSPage'));
const SettingsBackupPage = lazy(() => import('./pages/Settings/SettingsBackupPage'));
const SettingsSysinfoPage = lazy(() => import('./pages/Settings/SettingsSysinfoPage'));
const SettingsCredentialsPage = lazy(() => import('./pages/Settings/SettingsCredentialsPage'));
const SettingsAccountPage = lazy(() => import('./pages/Settings/SettingsAccountPage'));
const SettingsSmtpPage = lazy(() => import('./pages/Settings/SettingsSmtpPage'));
const SettingsDomainMgmtPage = lazy(() => import('./pages/Settings/SettingsDomainMgmtPage'));
const SettingsResetPage = lazy(() => import('./pages/Settings/SettingsResetPage'));
const SettingsMirrorsPage = lazy(() => import('./pages/Settings/SettingsMirrorsPage'));
const SettingsWorkstreamEventsPage = lazy(() => import('./pages/Settings/SettingsWorkstreamEventsPage'));
const SettingsConfigHistoryPage = lazy(() => import('./pages/Settings/SettingsConfigHistoryPage'));
const CoreUIDetailPage = lazy(() => import('./pages/Settings/SysDetail/CoreUIDetailPage'));
const CoreAPIDetailPage = lazy(() => import('./pages/Settings/SysDetail/CoreAPIDetailPage'));
const CoreDCDetailPage = lazy(() => import('./pages/Settings/SysDetail/CoreDCDetailPage'));
const CoreAuthDetailPage = lazy(() => import('./pages/Settings/SysDetail/CoreAuthDetailPage'));
const CorePolicyDetailPage = lazy(() => import('./pages/Settings/SysDetail/CorePolicyDetailPage'));

// Setup
const SetupPage = lazy(() => import('./pages/Setup/SetupPage'));

// ── Loading fallback ──────────────────────────────────────────────────────────
function PageFallback() {
  return (
    <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>
      Loading...
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ToastProvider>
    <HashRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Setup Wizard — standalone layout */}
          <Route path="/setup" element={<SetupLayout />}>
            <Route index element={<SetupPage />} />
          </Route>

          {/* Console — main layout */}
          <Route element={<ConsoleLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Directory */}
            <Route path="/users" element={<UsersPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/ous" element={<OUsPage />} />
            <Route path="/computers" element={<ComputersPage />} />
            <Route path="/tree" element={<TreePage />} />
            <Route path="/directory/drive" element={<DrivePage />} />

            {/* Networking / Services */}
            <Route path="/dns" element={<DNSPage />} />
            <Route path="/dcs" element={<DCsPage />} />
            <Route path="/services/vpn" element={<VPNPage />} />
            <Route path="/services/firewall" element={<FirewallPage />} />

            {/* Mail */}
            <Route path="/appengine" element={<AppEnginePage />} />
            <Route path="/appengine/users" element={<AppEngineUsersPage />} />
            <Route path="/appengine/modules" element={<AppEngineModulesPage />} />

            <Route path="/appengine/ldap" element={<AppEngineLDAPPage />} />
            <Route path="/appengine/cron" element={<AppEngineCronPage />} />
            <Route path="/mail" element={<MailPage />} />
            <Route path="/mail/accounts" element={<MailAccountsPage />} />
            <Route path="/mail/groups" element={<MailGroupsPage />} />
            <Route path="/mail/lists" element={<MailListsPage />} />
            <Route path="/mail/domains" element={<MailDomainsPage />} />
            <Route path="/mail/roles" element={<MailRolesPage />} />
            <Route path="/mail/tenants" element={<MailTenantsPage />} />
            <Route path="/mail/api-keys" element={<MailApiKeysPage />} />
            <Route path="/mail/oauth-clients" element={<MailOAuthPage />} />
            <Route path="/mail/queue" element={<MailQueuePage />} />
            <Route path="/mail/queue-reports" element={<MailQueueReportsPage />} />
            <Route path="/mail/reports" element={<MailReportsPage />} />
            <Route path="/mail/history-received" element={<MailHistoryReceivedPage />} />
            <Route path="/mail/history-delivery" element={<MailHistoryDeliveryPage />} />
            <Route path="/mail/logs" element={<MailLogsPage />} />
            <Route path="/mail/live-tracing" element={<MailLiveTracingPage />} />
            <Route path="/mail/spam-test" element={<MailSpamTestPage />} />
            <Route path="/mail/spam-upload" element={<MailSpamUploadPage />} />
            <Route path="/mail/troubleshoot" element={<MailTroubleshootPage />} />
            <Route path="/mail/dmarc-troubleshoot" element={<MailDmarcPage />} />
            <Route path="/mail/tls" element={<MailTLSPage />} />
            <Route path="/mail/sieve" element={<MailSievePage />} />
            <Route path="/mail/maintenance" element={<MailMaintenancePage />} />
            <Route path="/mail/config" element={<MailConfigPage />} />

            {/* Apps & Homepage */}
            <Route path="/apps" element={<AppsPage />} />
            <Route path="/apps/sso-setup" element={<AppsSSOPage />} />
            <Route path="/apps/:id" element={<AppsDetailPage />} />
            <Route path="/homepage/sites" element={<HomepageSitesPage />} />
            <Route path="/homepage/create" element={<HomepageCreatePage />} />
            <Route path="/homepage/build" element={<HomepageBuildPage />} />

            {/* Automation (n8n) */}
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/automation/workflows" element={<AutomationWorkflowsPage />} />
            <Route path="/automation/executions" element={<AutomationExecutionsPage />} />
            <Route path="/automation/settings" element={<AutomationSettingsPage />} />

            {/* AI Platform */}
            <Route path="/ai" element={<AIOverviewPage />} />
            <Route path="/ai/models" element={<AIModelsPage />} />
            <Route path="/ai/agents" element={<AIAgentsPage />} />
            <Route path="/ai/memory" element={<AIMemoryPage />} />
            <Route path="/ai/keys" element={<AIKeysPage />} />
            <Route path="/ai/usage" element={<AIUsagePage />} />
            <Route path="/ai/settings" element={<AISettingsPage />} />
            <Route path="/ai/pipeline" element={<AIPipelinePage />} />

            {/* Monitoring */}
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/monitoring/alerts" element={<MonitoringAlertsPage />} />
            <Route path="/monitoring/logs" element={<MonitoringLogsPage />} />
            <Route path="/monitoring/sentinel" element={<SentinelPage />} />

            {/* Security */}
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/security/policies" element={<SecurityPoliciesPage />} />
            <Route path="/security/gpo" element={<SecurityGPOPage />} />
            <Route path="/security/acl" element={<SecurityACLPage />} />
            <Route path="/security/access-policy" element={<SecurityAccessPolicyPage />} />
            <Route path="/security/audit-log" element={<SecurityAuditLogPage />} />

            {/* Containers */}
            {/* PRC */}
            <Route path="/prc" element={<PRCPage />} />
            <Route path="/prc/providers" element={<PRCPage />} />
            <Route path="/prc/claims" element={<PRCPage />} />
            <Route path="/prc/saga-log" element={<PRCPage />} />

            <Route path="/containers" element={<ContainersPage />} />
            <Route path="/containers/topology" element={<ContainersTopologyPage />} />
            <Route path="/containers/resources" element={<ContainersResourcesPage />} />

            {/* Databases */}
            <Route path="/databases/postgresql" element={<DatabasePostgresqlPage />} />
            <Route path="/databases/redis" element={<DatabaseRedisPage />} />
            <Route path="/databases/elasticsearch" element={<DatabaseElasticPage />} />
            <Route path="/databases/rustfs" element={<DatabaseRustfsPage />} />

            {/* Chat (Mattermost) — ModuleGuard로 설치 여부 확인 */}
            <Route path="/chat" element={<ModuleGuard moduleId="mattermost" moduleName="PolyON Chat"><ChatPage /></ModuleGuard>} />
            <Route path="/chat/teams" element={<ModuleGuard moduleId="mattermost" moduleName="PolyON Chat"><ChatTeamsPage /></ModuleGuard>} />
            <Route path="/chat/channels" element={<ModuleGuard moduleId="mattermost" moduleName="PolyON Chat"><ChatChannelsPage /></ModuleGuard>} />
            <Route path="/chat/users" element={<ModuleGuard moduleId="mattermost" moduleName="PolyON Chat"><ChatUsersPage /></ModuleGuard>} />
            <Route path="/chat/settings" element={<ModuleGuard moduleId="mattermost" moduleName="PolyON Chat"><ChatSettingsPage /></ModuleGuard>} />

            {/* Drive — PolyON-Drive (Rust) iframe */}
            <Route path="/drive" element={<ModuleGuard moduleId="drive" moduleName="PolyON Drive"><ModuleSector moduleId="drive" src="/modules/drive/admin/" /></ModuleGuard>} />
            <Route path="/drive/users" element={<ModuleGuard moduleId="drive" moduleName="PolyON Drive"><ModuleSector moduleId="drive" src="/modules/drive/admin/" hashPath="#/users" /></ModuleGuard>} />
            <Route path="/drive/quota" element={<ModuleGuard moduleId="drive" moduleName="PolyON Drive"><ModuleSector moduleId="drive" src="/modules/drive/admin/" hashPath="#/quota" /></ModuleGuard>} />
            <Route path="/drive/activity" element={<ModuleGuard moduleId="drive" moduleName="PolyON Drive"><ModuleSector moduleId="drive" src="/modules/drive/admin/" hashPath="#/activity" /></ModuleGuard>} />
            <Route path="/drive/settings" element={<ModuleGuard moduleId="drive" moduleName="PolyON Drive"><ModuleSector moduleId="drive" src="/modules/drive/admin/" hashPath="#/settings" /></ModuleGuard>} />

            {/* ERPEngine — PolyON ERPEngine (iframe) */}
            <Route path="/erpengine" element={<ModuleGuard moduleId="erpengine" moduleName="PolyON ERPEngine"><ERPEngineFrame /></ModuleGuard>} />

            {/* Wiki (AFFiNE) */}
            <Route path="/wiki" element={<ModuleGuard moduleId="affine" moduleName="PolyON Wiki"><WikiOverviewPage /></ModuleGuard>} />
            <Route path="/wiki/workspaces" element={<ModuleGuard moduleId="affine" moduleName="PolyON Wiki"><WikiWorkspacesPage /></ModuleGuard>} />
            <Route path="/wiki/users" element={<ModuleGuard moduleId="affine" moduleName="PolyON Wiki"><WikiUsersPage /></ModuleGuard>} />
            <Route path="/wiki/settings" element={<ModuleGuard moduleId="affine" moduleName="PolyON Wiki"><WikiSettingsPage /></ModuleGuard>} />

            {/* BPMN */}
            <Route path="/bpmn" element={<BPMNPage />} />
            <Route path="/bpmn/processes" element={<BPMNProcessesPage />} />
            <Route path="/bpmn/processes/:id" element={<BPMNProcessDetailPage />} />
            <Route path="/bpmn/instances" element={<BPMNInstancesPage />} />
            <Route path="/bpmn/instances/:id" element={<BPMNInstanceDetailPage />} />
            <Route path="/bpmn/tasks" element={<BPMNTasksPage />} />
            <Route path="/bpmn/tasks/:id" element={<BPMNTaskDetailPage />} />
            <Route path="/bpmn/history" element={<BPMNHistoryPage />} />
            <Route path="/bpmn/incidents" element={<BPMNIncidentsPage />} />
            <Route path="/bpmn/deployments" element={<BPMNDeploymentsPage />} />
            <Route path="/bpmn/decisions" element={<BPMNDecisionsPage />} />
            <Route path="/bpmn/decisions/:id" element={<BPMNDecisionDetailPage />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/domain" element={<SettingsDomainPage />} />
            <Route path="/settings/tls" element={<SettingsTLSPage />} />
            <Route path="/settings/backup" element={<SettingsBackupPage />} />
            <Route path="/settings/sysinfo" element={<SettingsSysinfoPage />} />
            <Route path="/settings/credentials" element={<SettingsCredentialsPage />} />
            <Route path="/settings/account" element={<SettingsAccountPage />} />
            <Route path="/settings/smtp" element={<SettingsSmtpPage />} />
            <Route path="/settings/domain-mgmt" element={<SettingsDomainMgmtPage />} />
            <Route path="/settings/reset" element={<SettingsResetPage />} />
            <Route path="/settings/config-history" element={<SettingsConfigHistoryPage />} />
            <Route path="/settings/mirrors" element={<SettingsMirrorsPage />} />
            <Route path="/settings/workstream-events" element={<SettingsWorkstreamEventsPage />} />
            <Route path="/settings/sysinfo/polyon-console" element={<CoreUIDetailPage />} />
            <Route path="/settings/sysinfo/polyon-core" element={<CoreAPIDetailPage />} />
            <Route path="/settings/sysinfo/polyon-dc" element={<CoreDCDetailPage />} />
            <Route path="/settings/sysinfo/keycloak" element={<CoreAuthDetailPage />} />
            <Route path="/settings/sysinfo/opa" element={<CorePolicyDetailPage />} />

            {/* Fallback — Dynamic module router */}
            <Route path="*" element={<DynamicModuleRouter />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
    </ToastProvider>
  );
}
