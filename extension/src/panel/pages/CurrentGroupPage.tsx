import { useEffect } from 'react';
import { useGroup } from '../state/group.store';
import StatsCards from '../components/StatsCards';
import ScanControls from '../components/ScanControls';
import MemberList from '../components/MemberList';

export default function CurrentGroupPage() {
  const { detected, refreshDetect, error, loadMembers, loadStats, groupId } = useGroup();

  useEffect(() => { refreshDetect(); }, []);
  useEffect(() => {
    if (groupId) { loadMembers(); loadStats(); }
  }, [groupId]);

  return (
    <div className="p-3 space-y-3">
      <button onClick={() => refreshDetect()} className="text-xs underline">Refresh from current tab</button>
      {error && <div className="text-xs text-red-600">{error}</div>}
      {detected ? (
        <div className="bg-white border rounded p-3 space-y-1">
          <div className="text-base font-semibold">{detected.name ?? detected.fbGroupId}</div>
          <div className="text-xs text-slate-500">
            id: {detected.fbGroupId}
            {detected.privacy ? ` · ${detected.privacy}` : ''}
            {detected.visibleMemberCount != null ? ` · ${detected.visibleMemberCount} members` : ''}
          </div>
          {detected.isMembersPageOpen && (
            <div className="text-[11px] text-emerald-700">On members page · sub-tab: {detected.currentSubTab ?? 'all'}</div>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-500">Open a Facebook group page to detect.</div>
      )}
      {groupId && (
        <>
          <StatsCards />
          <ScanControls />
          <MemberList />
        </>
      )}
    </div>
  );
}
