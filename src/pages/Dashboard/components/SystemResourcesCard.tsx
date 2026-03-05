// @ts-nocheck
/**
 * Dashboard — System Resources Card (Row 3)
 * Carbon Tile + Canvas 기반 시계열 차트 유지 (ProgressBar 보조)
 */
import { useEffect, useRef, useState } from 'react';
import { Tile, SkeletonText, InlineNotification, Tag } from '@carbon/react';
import { Time, ContainerSoftware, Activity, Meter } from '@carbon/icons-react';
import { dashboardApi, type SystemResourcesResponse } from '../../../api/dashboard';

interface TimePoint {
  t: number;
  v: number;
}

function drawChart(
  canvas: HTMLCanvasElement,
  data: TimePoint[],
  color: string,
  label: string,
  currentValue: number | null,
) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 300;
  const H = 160;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const padL = 36, padR = 12, padT = 32, padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  ctx.fillStyle = 'var(--cds-layer-02, #f4f4f4)';
  ctx.fillRect(0, 0, W, H);

  const displayVal = currentValue != null ? Math.round(currentValue) : '—';
  const displayStr = `${displayVal}%`;
  ctx.font = '600 22px "IBM Plex Sans", sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(displayStr, padL, 4);

  ctx.font = '11px "IBM Plex Sans", sans-serif';
  ctx.fillStyle = '#525252';
  ctx.fillText(label, padL + displayStr.length * 13.5, 8);

  const yTicks = [0, 25, 50, 75, 100];
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.font = '10px "IBM Plex Sans", sans-serif';
  ctx.fillStyle = '#525252';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (const tick of yTicks) {
    const y = padT + chartH - (tick / 100) * chartH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + chartW, y);
    ctx.stroke();
    if (tick > 0 && tick < 100) {
      ctx.fillText(String(tick), padL - 4, y);
    }
  }

  if (!data || data.length === 0) {
    ctx.font = '12px "IBM Plex Sans", sans-serif';
    ctx.fillStyle = '#8d8d8d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('데이터 없음', padL + chartW / 2, padT + chartH / 2);
    return;
  }

  const tMin = data[0].t;
  const tMax = data[data.length - 1].t;
  const tRange = tMax - tMin || 1;

  ctx.font = '10px "IBM Plex Sans", sans-serif';
  ctx.fillStyle = '#525252';
  ctx.textBaseline = 'top';
  const xLabelCount = 4;
  for (let i = 0; i <= xLabelCount; i++) {
    const t = tMin + (tRange * i) / xLabelCount;
    const x = padL + (i / xLabelCount) * chartW;
    const d = new Date(t * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    ctx.textAlign = i === 0 ? 'left' : i === xLabelCount ? 'right' : 'center';
    ctx.fillText(`${hh}:${mm}`, x, padT + chartH + 4);
  }

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  let first = true;
  for (const pt of data) {
    const x = padL + ((pt.t - tMin) / tRange) * chartW;
    const v = Math.min(Math.max(pt.v, 0), 100);
    const y = padT + chartH - (v / 100) * chartH;
    if (first) { ctx.moveTo(x, y); first = false; }
    else { ctx.lineTo(x, y); }
  }
  ctx.stroke();

  const lastPt = data[data.length - 1];
  const lastX = padL + ((lastPt.t - tMin) / tRange) * chartW;
  const lastV = Math.min(Math.max(lastPt.v, 0), 100);
  const lastY = padT + chartH - (lastV / 100) * chartH;

  ctx.lineTo(lastX, padT + chartH);
  ctx.lineTo(padL, padT + chartH);
  ctx.closePath();
  ctx.fillStyle = color + '20';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

interface ChartBoxProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function ChartBox({ canvasRef }: ChartBoxProps) {
  return (
    <div style={{ border: '1px solid var(--cds-border-subtle-00)', background: 'var(--cds-layer-02)' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
    </div>
  );
}

interface ResourceData {
  sysData: SystemResourcesResponse;
  cpuData: TimePoint[];
  memData: TimePoint[];
  diskData: TimePoint[];
  cpuCurrent: number | null;
  memCurrent: number | null;
  diskCurrent: number | null;
}

export function SystemResourcesCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [resData, setResData] = useState<ResourceData | null>(null);

  const cpuRef = useRef<HTMLCanvasElement>(null);
  const memRef = useRef<HTMLCanvasElement>(null);
  const diskRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const now = Math.floor(Date.now() / 1000);
        const start = now - 3600;
        const step = 300;

        const [sysData, cpuData, memData, diskData] = await Promise.all([
          dashboardApi.systemResources().catch(() => ({} as SystemResourcesResponse)),
          dashboardApi.prometheusQueryRange(
            '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
            start, now, step,
          ),
          dashboardApi.prometheusQueryRange(
            '(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100',
            start, now, step,
          ),
          dashboardApi.prometheusQueryRange(
            '(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100',
            start, now, step,
          ),
        ]);

        if (!mounted) return;

        const cpuCurrent = cpuData.length ? cpuData[cpuData.length - 1].v
          : sysData.cpu_percent != null ? sysData.cpu_percent : null;

        const memCurrent = memData.length ? memData[memData.length - 1].v
          : sysData.memory_total_mb
          ? ((sysData.memory_used_mb ?? 0) / sysData.memory_total_mb) * 100
          : null;

        const diskCurrent = diskData.length ? diskData[diskData.length - 1].v
          : sysData.disk_total_gb
          ? ((sysData.disk_used_gb ?? 0) / sysData.disk_total_gb) * 100
          : null;

        setResData({ sysData, cpuData, memData, diskData, cpuCurrent, memCurrent, diskCurrent });
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!resData) return;
    requestAnimationFrame(() => {
      if (cpuRef.current) drawChart(cpuRef.current, resData.cpuData, '#0f62fe', 'CPU', resData.cpuCurrent);
      if (memRef.current) drawChart(memRef.current, resData.memData, '#198038', 'Memory', resData.memCurrent);
      if (diskRef.current) drawChart(diskRef.current, resData.diskData, '#6929c4', 'Disk', resData.diskCurrent);
    });
  }, [resData]);

  const cardHeader = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <Meter size={16} />
      <h4 className="cds--productive-heading-02">시스템 리소스</h4>
    </div>
  );

  if (loading) {
    return (
      <Tile>
        {cardHeader}
        <SkeletonText paragraph lineCount={3} />
      </Tile>
    );
  }

  if (error || !resData) {
    return (
      <Tile>
        {cardHeader}
        <InlineNotification
          kind="warning"
          title="연결 실패"
          subtitle="시스템 리소스 API에 연결할 수 없습니다. 서비스가 시작 중일 수 있습니다."
          lowContrast
          hideCloseButton
        />
      </Tile>
    );
  }

  const { sysData } = resData;
  const _hb = (b?: number) => {
    if (b == null) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let val = b;
    for (const u of units) {
      if (val < 1024) return `${val.toFixed(1)} ${u}`;
      val /= 1024;
    }
    return `${val.toFixed(1)} TB`;
  };

  return (
    <Tile>
      {cardHeader}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <ChartBox canvasRef={cpuRef} />
        <ChartBox canvasRef={memRef} />
        <ChartBox canvasRef={diskRef} />
      </div>

      {/* 하단 메타 */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {sysData.uptime && (
          <Tag type="blue" renderIcon={Time}>Uptime: {sysData.uptime}</Tag>
        )}
        {sysData.container_count != null && (
          <Tag type="cyan" renderIcon={ContainerSoftware}>Containers: {sysData.container_count}</Tag>
        )}
        {sysData.load_avg && (
          <Tag type="teal" renderIcon={Activity}>Load: {sysData.load_avg}</Tag>
        )}
        {sysData.disk_total_gb && (
          <Tag type="purple">
            Disk: {_hb((sysData.disk_used_gb ?? 0) * 1024 * 1024 * 1024)} / {_hb((sysData.disk_total_gb ?? 0) * 1024 * 1024 * 1024)}
          </Tag>
        )}
      </div>
    </Tile>
  );
}
