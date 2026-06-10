import { useState } from 'react';
import { useGroup } from '../state/group.store';

const SUB_TABS = [
  { key: 'all', label: 'All' },
  { key: 'members', label: 'Members' },
  { key: 'admins', label: 'Admins' },
  { key: 'moderators', label: 'Moderators' },
  { key: 'new_members', label: 'New' },
  { key: 'friends', label: 'Friends' },
] as const;

export default function ScanControls() {
  const { scanStatus, scanInfo, postScanInfo, startScan, scanMore, finishScan, scanPostsOnce, detected } = useGroup();
  const [subTab, setSubTab] = useState<string>(detected?.currentSubTab ?? 'all');
  const isScanning = scanStatus === 'scanning';

  return (
    <div className="rounded bg-white border p-3 space-y-2">
      <div className="text-sm font-semibold">Member scan</div>
      <div className="flex flex-wrap gap-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`text-[11px] px-2 py-0.5 rounded border ${subTab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {!isScanning && (
          <button
            onClick={() => startScan(subTab)}
            className="bg-blue-600 text-white text-sm px-3 py-1 rounded"
          >Start scan</button>
        )}
        {isScanning && (
          <>
            <button onClick={() => scanMore()} className="bg-slate-700 text-white text-sm px-3 py-1 rounded">
              Scan more visible
            </button>
            <button
              onClick={() => finishScan(subTab === 'all' || subTab === 'members' ? 'all' : 'sub_tab_only')}
              className="bg-emerald-600 text-white text-sm px-3 py-1 rounded"
            >
              Finish scan
            </button>
          </>
        )}
      </div>
      {scanInfo && (
        <div className="text-xs text-slate-600">
          chunks: {scanInfo.chunks} · unique detected: {scanInfo.unique}
        </div>
      )}
      <hr />
      <div className="text-sm font-semibold">Post scan (feed)</div>
      <button onClick={() => scanPostsOnce()} className="bg-slate-700 text-white text-sm px-3 py-1 rounded">
        Scan visible posts
      </button>
      {postScanInfo && (
        <div className="text-xs text-slate-600">
          accepted: {postScanInfo.accepted} · matched authors: {postScanInfo.matched}
        </div>
      )}
    </div>
  );
}
