import { getBezierPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

interface PipelineEdgeData {
  kind?: 'primary' | 'fallback' | 'consumer' | 'provider';
  provColor?: string;
  [key: string]: unknown;
}

export function PipelineEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, selected,
}: EdgeProps) {
  const d = (data || {}) as PipelineEdgeData;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  let stroke      = '#0f62fe';
  let strokeWidth = 2;
  let strokeDash  = '8,4';
  let marker      = 'url(#arrow-primary)';

  if (d.kind === 'provider') {
    stroke      = d.provColor || '#b0b0b0';
    strokeWidth = 1.5;
    strokeDash  = 'none';
    marker      = '';
  } else if (d.kind === 'fallback') {
    stroke      = selected ? '#da1e28' : '#a8a8a8';
    strokeWidth = selected ? 3.5 : 1.5;
    strokeDash  = '4,4';
    marker      = selected ? 'url(#arrow-selected)' : 'url(#arrow-fallback)';
  } else if (d.kind === 'consumer') {
    stroke      = selected ? '#da1e28' : '#8a3ffc';
    strokeWidth = selected ? 3.5 : 1.5;
    strokeDash  = '6,3';
    marker      = selected ? 'url(#arrow-selected)' : 'url(#arrow-consumer)';
  } else {
    // primary
    stroke      = selected ? '#da1e28' : '#0f62fe';
    strokeWidth = selected ? 3.5 : 2;
    strokeDash  = '8,4';
    marker      = selected ? 'url(#arrow-selected)' : 'url(#arrow-primary)';
  }

  void labelX; void labelY;

  return (
    <>
      {/* SVG defs (only rendered once by first edge, others are no-op) */}
      <defs>
        <marker id="arrow-primary" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#0f62fe"/>
        </marker>
        <marker id="arrow-fallback" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#a8a8a8"/>
        </marker>
        <marker id="arrow-consumer" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#8a3ffc"/>
        </marker>
        <marker id="arrow-selected" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#da1e28"/>
        </marker>
      </defs>

      {/* Hit area */}
      <path
        id={`${id}-hit`}
        d={edgePath}
        strokeWidth={14}
        stroke="transparent"
        fill="none"
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
      />

      {/* Visible path */}
      <path
        id={id}
        d={edgePath}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash === 'none' ? undefined : strokeDash}
        fill="none"
        markerEnd={marker || undefined}
        style={{ pointerEvents: 'none' }}
      />
    </>
  );
}
