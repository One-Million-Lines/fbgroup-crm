import { useGroup } from '../state/group.store';

const ROLE_COLOR: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  moderator: 'bg-amber-100 text-amber-700',
  new_member: 'bg-blue-100 text-blue-700',
  member: 'bg-slate-100 text-slate-700',
};

export default function MemberList() {
  const members = useGroup((s) => s.members);
  if (!members.length) return <div className="text-xs text-slate-500">No members loaded yet. Run a scan and click Finish.</div>;
  return (
    <div className="space-y-1">
      {members.map((m) => {
        const role = (m.role as string) ?? 'member';
        return (
          <div key={m.groupMemberId as string} className="bg-white border rounded p-2 flex items-center gap-2">
            {m.profileImageUrl ? (
              <img src={m.profileImageUrl as string} className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-300" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate flex items-center gap-2">
                {m.profileUrl ? (
                  <a href={m.profileUrl as string} target="_blank" rel="noreferrer" className="hover:underline">
                    {(m.displayName as string) || (m.username as string) || 'Unknown'}
                  </a>
                ) : (
                  (m.displayName as string) || 'Unknown'
                )}
                <span className={`text-[10px] px-1 rounded ${ROLE_COLOR[role] ?? ROLE_COLOR.member}`}>{role}</span>
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                posts {String(m.postCount ?? 0)} · reactions {String(m.reactionCount ?? 0)} · comments {String(m.commentCount ?? 0)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
