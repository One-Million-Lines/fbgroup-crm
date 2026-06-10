import { useGroup } from '../state/group.store';

export default function StatsCards() {
  const stats = useGroup((s) => s.stats);
  if (!stats) return null;
  const items = [
    { label: 'Total members', value: stats.totalMembers },
    { label: 'New', value: stats.newMembers },
    { label: 'Left', value: stats.leftMembers },
    { label: 'Posts', value: stats.detectedPosts ?? 0 },
    { label: 'Reactions', value: stats.totalReactions ?? 0 },
    { label: 'Comments', value: stats.totalComments ?? 0 },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => (
        <div key={it.label} className="rounded bg-white border px-2 py-1.5">
          <div className="text-[10px] uppercase text-slate-500">{it.label}</div>
          <div className="text-lg font-semibold">{it.value ?? 0}</div>
        </div>
      ))}
    </div>
  );
}
