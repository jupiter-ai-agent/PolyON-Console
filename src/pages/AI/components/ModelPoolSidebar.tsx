import { useState } from 'react';
import { Search } from '@carbon/react';
import type { PoolEntry } from '../utils/pipelineData';

interface ModelPoolSidebarProps {
  poolMap:    Record<string, PoolEntry>;
  onReload:   () => void;
}

export function ModelPoolSidebar({ poolMap }: ModelPoolSidebarProps) {
  const [search, setSearch] = useState('');

  const entries = Object.values(poolMap);
  const filtered = search
    ? entries.filter(e =>
        e.actual.toLowerCase().includes(search.toLowerCase()) ||
        (e.prov.label || '').toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const onDragStart = (e: React.DragEvent, actual: string) => {
    e.dataTransfer.setData('application/pipeline-model', actual);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div style={{
      width:        220,
      minWidth:     220,
      borderRight:  '1px solid #e0e0e0',
      background:   '#fff',
      display:      'flex',
      flexDirection: 'column',
      overflow:     'hidden',
      fontFamily:   "'IBM Plex Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding:      '8px 12px 6px',
        fontSize:     '0.6875rem',
        fontWeight:   600,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        color:        '#8d8d8d',
        borderBottom: '1px solid #f0f0f0',
        flexShrink:   0,
      }}>
        Model Pool
      </div>

      {/* Search */}
      <div style={{ padding: '6px 10px 4px', flexShrink: 0 }}>
        <Search
          id="model-pool-search"
          labelText="Search models"
          placeholder="Search models..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="sm"
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding:   '16px',
            fontSize:  '0.75rem',
            color:     '#8d8d8d',
            textAlign: 'center',
          }}>
            {search ? 'No results' : 'No models registered'}
          </div>
        ) : (
          filtered.map((chip) => {
            const shortName = chip.actual.includes('/')
              ? chip.actual.split('/').pop()!
              : chip.actual;
            const provColor = chip.prov.color || '#8d8d8d';
            const provLabel = chip.prov.label || chip.prov.key || '';

            return (
              <div
                key={chip.actual}
                draggable
                onDragStart={e => onDragStart(e, chip.actual)}
                title={chip.actual}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          10,
                  padding:      '8px 12px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor:       'grab',
                  userSelect:   'none',
                  fontSize:     '0.8rem',
                  transition:   'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f4f9ff')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <div style={{
                  width:        4,
                  height:       36,
                  background:   provColor,
                  flexShrink:   0,
                }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontWeight:    600,
                    fontSize:      '0.775rem',
                    whiteSpace:    'nowrap',
                    overflow:      'hidden',
                    textOverflow:  'ellipsis',
                  }}>
                    {shortName}
                  </div>
                  <div style={{
                    fontSize:     '0.6875rem',
                    color:        '#8d8d8d',
                    whiteSpace:   'nowrap',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {provLabel}
                  </div>
                </div>
                {/* Drag handle icon */}
                <svg viewBox="0 0 16 16" width={14} height={14} fill="#c0c0c0" style={{ flexShrink: 0 }}>
                  <circle cx="5" cy="5" r="1.5"/>
                  <circle cx="5" cy="11" r="1.5"/>
                  <circle cx="11" cy="5" r="1.5"/>
                  <circle cx="11" cy="11" r="1.5"/>
                </svg>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
