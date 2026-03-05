import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ServiceNodeData } from '../utils/layoutNodes';

interface ServiceNodeProps extends NodeProps {
  onDelete?: (name: string) => void;
}

export function ServiceNode({ data, selected }: ServiceNodeProps) {
  const d = data as ServiceNodeData;
  const items = d.items || [];
  const modelCount = d.modelCount || items.length;

  return (
    <div
      style={{
        background:   '#fff',
        border:       `1.5px solid ${selected ? '#0f62fe' : '#e0e0e0'}`,
        borderTop:    '3px solid #0f62fe',
        minWidth:     200,
        boxShadow:    selected
          ? '0 0 0 2px rgba(15,98,254,0.2), 0 4px 12px rgba(0,0,0,0.12)'
          : '0 1px 3px rgba(0,0,0,0.08)',
        fontFamily: "'IBM Plex Sans', sans-serif",
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{
          width: 12, height: 12, background: '#fff',
          border: '2px solid #0f62fe', borderRadius: '50%',
          left: -6,
        }}
      />

      {/* Header */}
      <div style={{
        padding:      '8px 12px',
        background:   '#edf5ff',
        display:      'flex',
        alignItems:   'center',
        gap:          8,
        borderBottom: '1px solid #e8e8e8',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#24a148', flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.8125rem', fontWeight: 700, color: '#0043ce',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {d.name.length > 22 ? d.name.slice(0, 21) + '…' : d.name}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#6f6f6f' }}>
            {modelCount} model{modelCount !== 1 ? 's' : ''} · loadbalance
          </div>
        </div>
      </div>

      {/* Models list (compact, inside service node) */}
      <div style={{ padding: 0 }}>
        {modelCount === 0 ? (
          <div style={{
            padding: '10px 12px', fontSize: '0.75rem',
            color: '#8d8d8d', textAlign: 'center', fontStyle: 'italic',
          }}>
            No models connected
          </div>
        ) : (
          items.map((item, mi) => {
            const shortName = item.actual.includes('/')
              ? item.actual.split('/').pop()!
              : item.actual;
            const isPrimary  = mi === 0;
            const provColor  = item.prov?.color || '#8d8d8d';

            return (
              <div
                key={item.model_id || mi}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          6,
                  padding:      '6px 12px',
                  fontSize:     '0.75rem',
                  borderBottom: mi < items.length - 1 ? '1px solid #f4f4f4' : 'none',
                  position:     'relative',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: provColor, flexShrink: 0,
                }} />
                <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {shortName.length > 18 ? shortName.slice(0, 17) + '…' : shortName}
                </span>
                <span style={{
                  fontSize:      '0.625rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color:         isPrimary ? '#0043ce' : '#6f6f6f',
                  fontWeight:    600,
                  flexShrink:    0,
                }}>
                  {isPrimary ? 'PRIMARY' : 'FALLBACK'}
                </span>

                {/* Per-model output handle */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`out_${mi}`}
                  style={{
                    width:      12,
                    height:     12,
                    background: '#fff',
                    border:     `2px solid ${provColor}`,
                    borderRadius: '50%',
                    right:      -6,
                    top:        '50%',
                    transform:  'translateY(-50%)',
                    position:   'absolute',
                  }}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Fallback single output handle for empty service */}
      {modelCount === 0 && (
        <Handle
          type="source"
          position={Position.Right}
          id="out_0"
          style={{
            width: 12, height: 12, background: '#fff',
            border: '2px solid #0f62fe', borderRadius: '50%',
            right: -6,
          }}
        />
      )}
    </div>
  );
}
