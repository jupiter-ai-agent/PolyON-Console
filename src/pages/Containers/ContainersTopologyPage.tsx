// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { Renew } from '@carbon/icons-react';

export default function ContainersTopologyPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topoData, setTopoData] = useState(null);
  const containerRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/services/topology');
      if (!res.ok) {
        if (res.status === 404) {
          setError('K8s 서비스 토폴로지 API가 아직 구현되지 않았습니다.');
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setTopoData(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const groupColors = {
    core: '#0f62fe',
    data: '#198038',
    service: '#a56eff',
    monitor: '#005d5d',
    admin: '#8a3800',
  };

  const groupLabels = {
    core: 'Core', data: 'Data Store', service: 'Service', monitor: 'Monitoring', admin: 'Admin Tool',
  };

  const statusColors = {
    healthy: '#24a148',
    running: '#0f62fe',
    stopped: '#da1e28',
    unknown: '#8d8d8d',
  };

  return (
    <div style={{ padding: '0 32px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0 16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>서비스 토폴로지</h1>
          <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', margin: '4px 0 0' }}>Kubernetes 서비스 토폴로지 및 의존 관계</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
            {Object.entries(groupLabels).map(([k, v]) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: groupColors[k], display: 'inline-block' }} />
                {v}
              </span>
            ))}
          </div>
          <Button kind="ghost" size="sm" renderIcon={Renew} onClick={load}>새로고침</Button>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          border: '1px solid var(--cds-border-subtle-00)',
          background: 'var(--cds-layer-01)',
          minHeight: '600px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <InlineLoading description="로딩 중..." />
          </div>
        ) : error ? (
          <div style={{ padding: '32px', color: 'var(--cds-support-error)' }}>토폴로지 로딩 실패: {error}</div>
        ) : topoData ? (
          <TopologyGraph data={topoData} groupColors={groupColors} statusColors={statusColors} />
        ) : null}
      </div>
    </div>
  );
}

function TopologyGraph({ data, groupColors, statusColors }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Simple static layout since D3 is not available in React
    const nodes = data.nodes || [];
    const links = data.links || [];

    const svg = svgRef.current;
    const W = svg.clientWidth || 900;
    const H = svg.clientHeight || 600;

    // Arrange nodes in a circle
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) * 0.38;

    const positions = {};
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      positions[node.id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });

    // Clear
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Draw links
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrow');
    marker.setAttribute('viewBox', '0 -5 10 10');
    marker.setAttribute('refX', '38');
    marker.setAttribute('refY', '0');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0,-5L10,0L0,5');
    path.setAttribute('fill', '#8d8d8d');
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);

    links.forEach(l => {
      const src = positions[typeof l.source === 'object' ? l.source.id : l.source];
      const tgt = positions[typeof l.target === 'object' ? l.target.id : l.target];
      if (!src || !tgt) return;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', src.x);
      line.setAttribute('y1', src.y);
      line.setAttribute('x2', tgt.x);
      line.setAttribute('y2', tgt.y);
      line.setAttribute('stroke', '#8d8d8d');
      line.setAttribute('stroke-opacity', '0.5');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('marker-end', 'url(#arrow)');
      svg.appendChild(line);
    });

    // Draw nodes
    nodes.forEach(node => {
      const pos = positions[node.id];
      if (!pos) return;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${pos.x},${pos.y})`);

      const r = node.group === 'core' ? 36 : node.group === 'data' || node.group === 'service' ? 30 : 24;

      // Circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', r);
      circle.setAttribute('fill', groupColors[node.group] || '#8d8d8d');
      circle.setAttribute('fill-opacity', node.status === 'stopped' ? '0.3' : '0.9');
      circle.setAttribute('stroke', statusColors[node.status] || '#8d8d8d');
      circle.setAttribute('stroke-width', '2.5');
      g.appendChild(circle);

      // Status dot
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', r * 0.65);
      dot.setAttribute('cy', -r * 0.65);
      dot.setAttribute('r', '6');
      dot.setAttribute('fill', statusColors[node.status] || '#8d8d8d');
      dot.setAttribute('stroke', '#fff');
      dot.setAttribute('stroke-width', '2');
      g.appendChild(dot);

      // Label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dy', '0.35em');
      text.setAttribute('fill', '#fff');
      text.setAttribute('font-size', node.group === 'core' ? '12px' : '10px');
      text.setAttribute('font-family', 'IBM Plex Sans, sans-serif');
      text.setAttribute('font-weight', '600');
      text.setAttribute('style', 'pointer-events:none');
      text.textContent = node.label || node.id;
      g.appendChild(text);

      // Tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${node.id}\nStatus: ${node.status}\nGroup: ${node.group}`;
      g.appendChild(title);

      svg.appendChild(g);
    });
  }, [data]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="600"
      style={{ display: 'block' }}
    />
  );
}
