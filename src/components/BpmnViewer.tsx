// @ts-nocheck
import { useEffect, useRef } from 'react';

interface BpmnViewerProps {
  xml: string;
  activeActivityIds?: string[];
  incidentActivityIds?: string[];
  completedActivityIds?: string[];
  badges?: Record<string, number>;
  height?: string;
  onElementClick?: (elementId: string) => void;
}

const BPMN_CSS = `
  .bjs-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }
  .bjs-powered-by { display: none; }
  .djs-container {
    width: 100%;
    height: 100%;
  }
  .djs-container svg {
    width: 100%;
    height: 100%;
  }
  .djs-element .djs-hit { cursor: default; }
  .djs-element.hover .djs-hit { cursor: pointer; }
  .djs-shape .djs-visual > :nth-child(1) {
    stroke: #8d8d8d;
    fill: #fff;
  }
  .bpmn-active .djs-visual > :nth-child(1) {
    stroke: #24a148 !important;
    fill: #defbe6 !important;
    stroke-width: 2px !important;
  }
  .bpmn-incident .djs-visual > :nth-child(1) {
    stroke: #da1e28 !important;
    fill: #fff1f1 !important;
    stroke-width: 2px !important;
  }
  .bpmn-completed .djs-visual > :nth-child(1) {
    stroke: #8d8d8d !important;
    fill: #f4f4f4 !important;
  }
  .bpmn-badge {
    background: #0f62fe;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    min-width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    position: absolute;
    top: -10px;
    right: -10px;
    pointer-events: none;
    font-family: 'IBM Plex Sans', sans-serif;
  }
`;

export default function BpmnViewer({
  xml,
  activeActivityIds = [],
  incidentActivityIds = [],
  completedActivityIds = [],
  badges = {},
  height = '500px',
  onElementClick,
}: BpmnViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !xml) return;

    let viewer: any = null;
    let destroyed = false;

    async function init() {
      try {
        // Try NavigatedViewer first
        let ViewerClass: any;
        try {
          const mod = await import('bpmn-js/lib/NavigatedViewer');
          ViewerClass = mod.default || mod;
        } catch {
          const mod = await import('bpmn-js/lib/Viewer');
          ViewerClass = mod.default || mod;
        }

        if (destroyed) return;

        viewer = new ViewerClass({ container: containerRef.current });
        viewerRef.current = viewer;

        await viewer.importXML(xml);

        if (destroyed) return;

        const canvas = viewer.get('canvas');
        canvas.zoom('fit-viewport');

        // Apply markers
        activeActivityIds.forEach((id: string) => {
          try { canvas.addMarker(id, 'bpmn-active'); } catch {}
        });
        incidentActivityIds.forEach((id: string) => {
          try { canvas.addMarker(id, 'bpmn-incident'); } catch {}
        });
        completedActivityIds.forEach((id: string) => {
          try { canvas.addMarker(id, 'bpmn-completed'); } catch {}
        });

        // Add badges
        const overlays = viewer.get('overlays');
        Object.entries(badges).forEach(([id, count]) => {
          try {
            const el = document.createElement('div');
            el.className = 'bpmn-badge';
            el.textContent = String(count);
            overlays.add(id, { position: { top: -10, right: -10 }, html: el });
          } catch {}
        });

        // Click handler
        if (onElementClick) {
          const eventBus = viewer.get('eventBus');
          eventBus.on('element.click', (e: any) => {
            if (e.element && e.element.id) {
              onElementClick(e.element.id);
            }
          });
        }
      } catch (err) {
        console.error('BpmnViewer error:', err);
      }
    }

    init();

    return () => {
      destroyed = true;
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {}
        viewerRef.current = null;
      }
    };
  }, [xml, activeActivityIds.join(','), incidentActivityIds.join(','), completedActivityIds.join(','), JSON.stringify(badges)]);

  return (
    <>
      <style>{BPMN_CSS}</style>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height,
          background: '#fafafa',
          border: '1px solid #e0e0e0',
          position: 'relative',
          overflow: 'hidden',
        }}
      />
    </>
  );
}
