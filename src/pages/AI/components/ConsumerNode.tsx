import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ConsumerNodeData } from '../utils/layoutNodes';

const STATUS_DOT: Record<string, string> = {
  healthy:  '#24a148',
  degraded: '#f1c21b',
  down:     '#da1e28',
  unknown:  '#8d8d8d',
};

export function ConsumerNode({ data, selected }: NodeProps) {
  const d = data as ConsumerNodeData;
  const isMemory    = d.subType === 'memory';
  const accentColor = isMemory ? '#6929c4' : '#8a3ffc';
  const headerBg    = isMemory ? '#f3e8ff' : '#f6f2ff';
  const dotColor    = STATUS_DOT[d.status] || '#8d8d8d';
  const typeLabel   = isMemory ? 'Memory Engine' : 'AI Agent';

  return (
    <div
      style={{
        background:   '#fff',
        border:       `1.5px solid ${selected ? '#0f62fe' : '#e0e0e0'}`,
        borderTop:    `3px solid ${accentColor}`,
        minWidth:     160,
        boxShadow:    selected
          ? '0 0 0 2px rgba(15,98,254,0.2), 0 4px 12px rgba(0,0,0,0.12)'
          : '0 1px 3px rgba(0,0,0,0.08)',
        fontFamily: "'IBM Plex Sans', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding:        '8px 12px',
        background:     headerBg,
        display:        'flex',
        alignItems:     'center',
        gap:            8,
        borderBottom:   '1px solid #e8e8e8',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: dotColor, flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.8125rem', fontWeight: 700, color: accentColor,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {d.name}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#6f6f6f' }}>
            {typeLabel}
          </div>
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{
          width: 12, height: 12, background: '#fff',
          border: '2px solid #8a3ffc', borderRadius: '50%',
          right: -6,
        }}
      />
    </div>
  );
}
