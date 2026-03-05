import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ModelNodeData } from '../utils/layoutNodes';

export function ModelNode({ data, selected }: NodeProps) {
  const d = data as ModelNodeData;
  const prov       = d.prov || { color: '#525252', bg: '#f4f4f4', label: 'Unknown', key: '' };
  const provColor  = prov.color;
  const provBg     = prov.bg;
  const isPrimary  = d.isPrimary;
  const roleLabel  = isPrimary ? 'PRIMARY' : 'FALLBACK';
  const roleColor  = isPrimary ? provColor : '#8d8d8d';
  const borderColor = isPrimary ? provColor : '#d0d0d0';
  const headerBg   = isPrimary ? provBg : '#fff';
  const displayName = (d.shortName || d.actual || '').length > 19
    ? (d.shortName || d.actual || '').slice(0, 18) + '…'
    : (d.shortName || d.actual || '');

  return (
    <div
      style={{
        background:   '#fff',
        border:       `1.5px solid ${selected ? '#0f62fe' : borderColor}`,
        borderTop:    `3px solid ${borderColor}`,
        minWidth:     190,
        boxShadow:    selected
          ? '0 0 0 2px rgba(15,98,254,0.2), 0 4px 12px rgba(0,0,0,0.12)'
          : '0 1px 3px rgba(0,0,0,0.08)',
        fontFamily: "'IBM Plex Sans', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{
          width: 12, height: 12, background: '#fff',
          border: `2px solid ${provColor}`, borderRadius: '50%',
          left: -6,
        }}
      />

      {/* Header */}
      <div style={{
        padding:    '8px 12px 8px 16px',
        background: headerBg,
        display:    'flex',
        alignItems: 'center',
        gap:        8,
        position:   'relative',
      }}>
        {/* Left accent bar */}
        <span style={{
          position:     'absolute', left: 0, top: 0, bottom: 0,
          width:        3, background: isPrimary ? provColor : '#d0d0d0',
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.8125rem', fontWeight: 700, color: '#161616',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
            title={d.actual}
          >
            {displayName}
          </div>
          <div style={{
            fontSize:      '0.625rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color:         roleColor,
            fontWeight:    600,
          }}>
            {roleLabel}
          </div>
        </div>

        {/* Provider dot */}
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: provColor, flexShrink: 0,
        }} />
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{
          width: 12, height: 12, background: '#fff',
          border: `2px solid ${provColor}`, borderRadius: '50%',
          right: -6,
        }}
      />
    </div>
  );
}
