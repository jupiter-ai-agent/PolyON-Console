// @ts-nocheck
/**
 * Dashboard — Domain Info Card (Row 2 Left)
 * Carbon Tile + StructuredList 사용
 */
import { useEffect, useState } from 'react';
import {
  Tile,
  SkeletonText,
  Tag,
  StructuredListWrapper,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
} from '@carbon/react';
import { Network_4 } from '@carbon/icons-react';
import { dashboardApi, type DomainInfoResponse } from '../../../api/dashboard';

export function DomainInfoCard() {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<DomainInfoResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    dashboardApi.domainInfo()
      .then(d => { if (mounted) setInfo(d); })
      .catch(() => { if (mounted) setInfo({}); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <Tile style={{ height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Network_4 size={16} />
        <h4 className="cds--productive-heading-02">Domain Info</h4>
      </div>

      {loading ? (
        <div>
          <SkeletonText paragraph lineCount={4} />
        </div>
      ) : (
        <StructuredListWrapper>
          <StructuredListBody>
            <StructuredListRow>
              <StructuredListCell noWrap style={{ fontWeight: 600, width: '90px' }}>Realm</StructuredListCell>
              <StructuredListCell>
                <code style={{ fontFamily: '"IBM Plex Mono", monospace', color: 'var(--cds-link-primary)' }}>
                  {info?.realm || '—'}
                </code>
              </StructuredListCell>
            </StructuredListRow>
            <StructuredListRow>
              <StructuredListCell noWrap style={{ fontWeight: 600 }}>Base DN</StructuredListCell>
              <StructuredListCell>
                <code style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px' }}>
                  {info?.base_dn || '—'}
                </code>
              </StructuredListCell>
            </StructuredListRow>
            <StructuredListRow>
              <StructuredListCell noWrap style={{ fontWeight: 600 }}>Level</StructuredListCell>
              <StructuredListCell>
                {(info?.level_info || '—').split('\n')[0]}
              </StructuredListCell>
            </StructuredListRow>
            <StructuredListRow>
              <StructuredListCell noWrap style={{ fontWeight: 600 }}>API</StructuredListCell>
              <StructuredListCell>
                <Tag type="green">Healthy</Tag>
              </StructuredListCell>
            </StructuredListRow>
          </StructuredListBody>
        </StructuredListWrapper>
      )}
    </Tile>
  );
}
