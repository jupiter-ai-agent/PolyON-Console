import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ProviderNodeData } from '../utils/layoutNodes';

export function ProviderNode({ data, selected }: NodeProps) {
  const d = data as ProviderNodeData;
  const prov      = d.prov || { color: '#525252', bg: '#f4f4f4', label: 'Unknown', key: '' };
  const provColor = prov.color;
  const provBg    = prov.bg;
  const label     = (prov.label || prov.key || '');
  const displayLabel = label.length > 16 ? label.slice(0, 15) + '…' : label;

  return (
    <div
      style={{
        background:   provBg,
        border:       `1.5px solid ${selected ? '#0f62fe' : provColor}`,
        minWidth:     140,
        padding:      '8px 14px',
        display:      'flex',
        alignItems:   'center',
        gap:          8,
        boxShadow:    selected
          ? '0 0 0 2px rgba(15,98,254,0.2), 0 4px 12px rgba(0,0,0,0.12)'
          : '0 1px 3px rgba(0,0,0,0.06)',
        fontFamily: "'IBM Plex Sans', sans-serif",
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

      <span style={{
        width: 10, height: 10, borderRadius: '50%',
        background: provColor, flexShrink: 0,
      }} />

      <span style={{
        fontSize:       '0.8rem',
        fontWeight:     600,
        color:          provColor,
        whiteSpace:     'nowrap',
        overflow:       'hidden',
        textOverflow:   'ellipsis',
      }}>
        {displayLabel}
      </span>
    </div>
  );
}
