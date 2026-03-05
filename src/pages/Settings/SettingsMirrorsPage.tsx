// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  Button,
  Modal,
  TextInput,
  Toggle,
  Select,
  SelectItem,
  InlineNotification,
  SkeletonText,
  Tag,
  Tile,
} from '@carbon/react';
import { Add, TrashCan, Share } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mirrorsApi } from '../../api/mirrors';

interface PushMirror {
  id: number;
  remote_name: string;
  remote_address: string;
  sync_on_commit: boolean;
  interval: string;
  last_update?: string;
  last_error?: string;
}

interface RepoMirrorInfo {
  name: string;
  full_name: string;
  clone_url: string;
  empty: boolean;
  push_mirrors: PushMirror[];
}

export default function SettingsMirrorsPage() {
  const [repos, setRepos] = useState<RepoMirrorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Push mirror modal
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [pushRepo, setPushRepo] = useState('');
  const [pushRemote, setPushRemote] = useState('');
  const [pushToken, setPushToken] = useState('');
  const [pushInterval, setPushInterval] = useState('1h');
  const [pushSyncOnCommit, setPushSyncOnCommit] = useState(true);

  // Pull mirror modal
  const [pullModalOpen, setPullModalOpen] = useState(false);
  const [pullName, setPullName] = useState('');
  const [pullCloneAddr, setPullCloneAddr] = useState('');
  const [pullDescription, setPullDescription] = useState('');
  const [pullInterval, setPullInterval] = useState('8h');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await mirrorsApi.getStatus();
      setRepos(data || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Flatten push mirrors for table
  const pushRows = repos.flatMap(repo =>
    (repo.push_mirrors || []).map((m: PushMirror) => ({
      id: `${repo.name}-${m.id}`,
      repoName: repo.full_name,
      repoSlug: repo.name,
      remoteAddress: m.remote_address,
      interval: m.interval || '-',
      syncOnCommit: m.sync_on_commit,
      lastSync: m.last_update || '-',
      lastError: m.last_error || '',
      mirrorId: m.id,
    }))
  );

  const pushHeaders = [
    { key: 'repoName', header: '\ub808\ud3ec' },
    { key: 'remoteAddress', header: '\ub300\uc0c1 URL' },
    { key: 'interval', header: '\uc8fc\uae30' },
    { key: 'syncOnCommit', header: '\ucee4\ubc0b \uc2dc \ub3d9\uae30' },
    { key: 'lastSync', header: '\ub9c8\uc9c0\ub9c9 \ub3d9\uae30' },
    { key: 'actions', header: '' },
  ];

  const handleAddPush = async () => {
    try {
      setError('');
      await mirrorsApi.addPushMirror('polyon', pushRepo, {
        remote_address: pushRemote,
        token: pushToken,
        interval: pushInterval,
        sync_on_commit: pushSyncOnCommit,
      });
      setSuccess('Push Mirror \ucd94\uac00 \uc644\ub8cc');
      setPushModalOpen(false);
      setPushRemote('');
      setPushToken('');
      loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDeletePush = async (repoSlug: string, mirrorId: number) => {
    try {
      await mirrorsApi.deletePushMirror('polyon', repoSlug, mirrorId);
      setSuccess('Push Mirror \uc0ad\uc81c \uc644\ub8cc');
      loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleAddPull = async () => {
    try {
      setError('');
      await mirrorsApi.createPullMirror({
        name: pullName,
        clone_addr: pullCloneAddr,
        description: pullDescription,
        interval: pullInterval,
      });
      setSuccess('Pull Mirror \uc0dd\uc131 \uc644\ub8cc');
      setPullModalOpen(false);
      setPullName('');
      setPullCloneAddr('');
      setPullDescription('');
      loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Git \ubbf8\ub7ec\ub9c1" description="\uc678\ubd80 Git \uc11c\ube44\uc2a4\uc640 \uc790\ub3d9 \ub3d9\uae30\ud654\ub97c \uad00\ub9ac\ud569\ub2c8\ub2e4" />
        <div style={{ padding: '1rem 2rem' }}><SkeletonText paragraph lineCount={5} /></div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Git \ubbf8\ub7ec\ub9c1" description="\uc678\ubd80 Git \uc11c\ube44\uc2a4\uc640 \uc790\ub3d9 \ub3d9\uae30\ud654\ub97c \uad00\ub9ac\ud569\ub2c8\ub2e4" />

      <div style={{ padding: '0 2rem 2rem' }}>
        {error && (
          <InlineNotification
            kind="error"
            title="\uc624\ub958"
            subtitle={error}
            onCloseButtonClick={() => setError('')}
            style={{ marginBottom: '1rem' }}
          />
        )}
        {success && (
          <InlineNotification
            kind="success"
            title="\uc131\uacf5"
            subtitle={success}
            onCloseButtonClick={() => setSuccess('')}
            style={{ marginBottom: '1rem' }}
          />
        )}

        {/* Summary */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <Tile style={{ flex: 1 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>{'\uc804\uccb4 \ub808\ud3ec'}</p>
            <p style={{ fontSize: '2rem', fontWeight: 600 }}>{repos.length}</p>
          </Tile>
          <Tile style={{ flex: 1 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>Push Mirror</p>
            <p style={{ fontSize: '2rem', fontWeight: 600 }}>{pushRows.length}</p>
          </Tile>
          <Tile style={{ flex: 1 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>Pull Mirror</p>
            <p style={{ fontSize: '2rem', fontWeight: 600 }}>{repos.filter(r => r.clone_url?.includes('mirror')).length}</p>
          </Tile>
        </div>

        {/* Push Mirrors */}
        <h4 style={{ marginBottom: '1rem' }}>Push Mirror (\ub0b4\ubd80 \u2192 \uc678\ubd80 \ubc31\uc5c5)</h4>
        <DataTable rows={pushRows} headers={pushHeaders}>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <TableToolbar>
                <TableToolbarContent>
                  <Button
                    kind="primary"
                    size="sm"
                    renderIcon={Add}
                    onClick={() => setPushModalOpen(true)}
                  >
                    Push Mirror \ucd94\uac00
                  </Button>
                </TableToolbarContent>
              </TableToolbar>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map(h => (
                      <TableHeader {...getHeaderProps({ header: h })} key={h.key}>
                        {h.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={headers.length} style={{ textAlign: 'center', color: 'var(--cds-text-secondary)' }}>
                        {'\ub4f1\ub85d\ub41c Push Mirror\uac00 \uc5c6\uc2b5\ub2c8\ub2e4'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map(row => {
                      const original = pushRows.find(r => r.id === row.id);
                      return (
                        <TableRow {...getRowProps({ row })} key={row.id}>
                          {row.cells.map(cell => (
                            <TableCell key={cell.id}>
                              {cell.info.header === 'syncOnCommit' ? (
                                <Tag type={cell.value ? 'green' : 'gray'} size="sm">
                                  {cell.value ? 'ON' : 'OFF'}
                                </Tag>
                              ) : cell.info.header === 'actions' ? (
                                <Button
                                  kind="danger--ghost"
                                  size="sm"
                                  renderIcon={TrashCan}
                                  hasIconOnly
                                  iconDescription="\uc0ad\uc81c"
                                  onClick={() => original && handleDeletePush(original.repoSlug, original.mirrorId)}
                                />
                              ) : (
                                cell.value
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>

        {/* Pull Mirrors */}
        <h4 style={{ margin: '2rem 0 1rem' }}>Pull Mirror (\uc678\ubd80 \u2192 \ub0b4\ubd80 \ub3d9\uae30\ud654)</h4>
        <Button
          kind="tertiary"
          size="sm"
          renderIcon={Add}
          onClick={() => setPullModalOpen(true)}
          style={{ marginBottom: '1rem' }}
        >
          Pull Mirror \ucd94\uac00
        </Button>

        <DataTable
          rows={repos.filter(r => r.clone_url).map(r => ({
            id: r.name,
            name: r.full_name,
            cloneUrl: r.clone_url,
            empty: r.empty ? 'Yes' : 'No',
          }))}
          headers={[
            { key: 'name', header: '\ub808\ud3ec' },
            { key: 'cloneUrl', header: 'Clone URL' },
            { key: 'empty', header: 'Empty' },
          ]}
        >
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <Table {...getTableProps()} size="sm">
                <TableHead>
                  <TableRow>
                    {headers.map(h => (
                      <TableHeader {...getHeaderProps({ header: h })} key={h.key}>
                        {h.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(row => (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map(cell => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      </div>

      {/* Push Mirror Modal */}
      <Modal
        open={pushModalOpen}
        onRequestClose={() => setPushModalOpen(false)}
        onRequestSubmit={handleAddPush}
        modalHeading="Push Mirror \ucd94\uac00"
        primaryButtonText="\ucd94\uac00"
        secondaryButtonText="\ucde8\uc18c"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Select
            id="push-repo"
            labelText="\ub808\ud3ec"
            value={pushRepo}
            onChange={(e) => setPushRepo(e.target.value)}
          >
            <SelectItem value="" text="\ub808\ud3ec \uc120\ud0dd" />
            {repos.map(r => (
              <SelectItem key={r.name} value={r.name} text={r.full_name} />
            ))}
          </Select>
          <TextInput
            id="push-remote"
            labelText="\ub300\uc0c1 URL"
            placeholder="https://github.com/org/repo.git"
            value={pushRemote}
            onChange={(e) => setPushRemote(e.target.value)}
          />
          <TextInput
            id="push-token"
            labelText="\uc778\uc99d \ud1a0\ud070"
            placeholder="ghp_... \ub610\ub294 glpat-..."
            type="password"
            value={pushToken}
            onChange={(e) => setPushToken(e.target.value)}
          />
          <Select
            id="push-interval"
            labelText="\ub3d9\uae30\ud654 \uc8fc\uae30"
            value={pushInterval}
            onChange={(e) => setPushInterval(e.target.value)}
          >
            <SelectItem value="30m" text="30\ubd84" />
            <SelectItem value="1h" text="1\uc2dc\uac04" />
            <SelectItem value="4h" text="4\uc2dc\uac04" />
            <SelectItem value="8h" text="8\uc2dc\uac04" />
            <SelectItem value="24h" text="24\uc2dc\uac04" />
          </Select>
          <Toggle
            id="push-sync-on-commit"
            labelText="\ucee4\ubc0b \uc2dc \uc790\ub3d9 \ub3d9\uae30\ud654"
            toggled={pushSyncOnCommit}
            onToggle={(v) => setPushSyncOnCommit(v)}
          />
        </div>
      </Modal>

      {/* Pull Mirror Modal */}
      <Modal
        open={pullModalOpen}
        onRequestClose={() => setPullModalOpen(false)}
        onRequestSubmit={handleAddPull}
        modalHeading="Pull Mirror \ucd94\uac00"
        primaryButtonText="\uc0dd\uc131"
        secondaryButtonText="\ucde8\uc18c"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextInput
            id="pull-name"
            labelText="\ub808\ud3ec \uc774\ub984"
            placeholder="my-external-repo"
            value={pullName}
            onChange={(e) => setPullName(e.target.value)}
          />
          <TextInput
            id="pull-addr"
            labelText="\uc18c\uc2a4 URL"
            placeholder="https://github.com/org/repo.git"
            value={pullCloneAddr}
            onChange={(e) => setPullCloneAddr(e.target.value)}
          />
          <TextInput
            id="pull-desc"
            labelText="\uc124\uba85"
            placeholder="\uc120\ud0dd\uc0ac\ud56d"
            value={pullDescription}
            onChange={(e) => setPullDescription(e.target.value)}
          />
          <Select
            id="pull-interval"
            labelText="\ub3d9\uae30\ud654 \uc8fc\uae30"
            value={pullInterval}
            onChange={(e) => setPullInterval(e.target.value)}
          >
            <SelectItem value="1h" text="1\uc2dc\uac04" />
            <SelectItem value="4h" text="4\uc2dc\uac04" />
            <SelectItem value="8h" text="8\uc2dc\uac04 (\uae30\ubcf8)" />
            <SelectItem value="24h" text="24\uc2dc\uac04" />
          </Select>
        </div>
      </Modal>
    </>
  );
}
