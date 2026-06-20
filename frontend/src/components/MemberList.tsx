import type { MemberInfo } from '../types/socket';
import { Avatar } from './ui';

interface Props {
  members: MemberInfo[];
  hostId: string;
}

export default function MemberList({ members, hostId }: Props) {
  return (
    <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      <p style={{
        margin: '0 0 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'var(--text-faint)',
      }}>
        Thành viên · {members.length}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
        {members.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ position: 'relative' }}>
              <Avatar name={m.displayName} src={m.avatar} size={28} />
              <span style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 9, height: 9, borderRadius: '50%',
                background: '#27b07c', border: '2px solid var(--surface)',
              }} />
            </div>
            <span style={{
              fontSize: 13.5, fontWeight: 500, color: 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              {m.displayName}
            </span>
            {m.id === hostId && (
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                background: 'color-mix(in oklab, var(--accent) 15%, var(--surface-2))',
                color: 'var(--accent-text)', padding: '2px 8px', borderRadius: 999,
                flexShrink: 0,
              }}>
                Host
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
