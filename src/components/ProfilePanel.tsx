import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { syncToCloud, syncFromCloud, exportData, downloadExport } from '@/services/syncService';
import { LogOut, Upload, Download, FileJson, Cloud, User, ChevronRight } from 'lucide-react';

interface Props {
  onToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

export function ProfilePanel({ onToast }: Props) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const stats = useUserStore((s) => s.stats);
  const selectedClass = useGamificationStore((s) => s.selectedClass);
  const [syncing, setSyncing] = useState(false);

  const handleSyncToCloud = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      await syncToCloud(user.uid);
      onToast('☁️ Data synced ke cloud!', 'success');
    } catch {
      onToast('❌ Sync gagal, coba lagi', 'warning');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncFromCloud = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      await syncFromCloud(user.uid);
      onToast('☁️ Data restored dari cloud!', 'success');
      window.location.reload();
    } catch {
      onToast('❌ Restore gagal', 'warning');
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    const data = await exportData();
    downloadExport(data);
    onToast('📁 Backup downloaded!', 'success');
  };

  return (
    <div className="px-4 py-3">
      {/* User Profile */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-full bg-quest-accent/15 flex items-center justify-center text-xl overflow-hidden">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-quest-accent" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-quest-text-primary truncate">
            {user?.displayName || 'Guest Adventurer'}
          </p>
          <p className="text-[11px] text-quest-text-tertiary">
            {isAuthenticated ? '☁️ Cloud sync aktif' : '💾 Mode lokal'}
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="p-3 rounded-xl bg-quest-surface border border-quest-border text-center">
            <div className="text-lg font-bold text-quest-text-primary">{stats.level}</div>
            <div className="text-[10px] text-quest-text-tertiary">Level</div>
          </div>
          <div className="p-3 rounded-xl bg-quest-surface border border-quest-border text-center">
            <div className="text-lg font-bold text-quest-positive">{stats.streak}</div>
            <div className="text-[10px] text-quest-text-tertiary">Streak</div>
          </div>
          <div className="p-3 rounded-xl bg-quest-surface border border-quest-border text-center">
            <div className="text-lg font-bold text-quest-accent">{stats.totalQuestsCompleted}</div>
            <div className="text-[10px] text-quest-text-tertiary">Quest Done</div>
          </div>
          <div className="p-3 rounded-xl bg-quest-surface border border-quest-border text-center">
            <div className="text-lg font-bold text-quest-warning">{stats.totalXpEarned}</div>
            <div className="text-[10px] text-quest-text-tertiary">Total XP</div>
          </div>
        </div>
      )}

      {/* Cloud Actions */}
      <div className="space-y-2 mb-5">
        <h3 className="text-[11px] font-semibold text-quest-text-secondary uppercase tracking-wider mb-2">
          Cloud Sync
        </h3>

        {isAuthenticated ? (
          <>
            <button
              onClick={handleSyncToCloud}
              disabled={syncing}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-quest-surface border border-quest-border hover:border-quest-accent/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-quest-accent" />
                <span className="text-xs text-quest-text-primary">Sync ke Cloud</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-quest-text-quaternary" />
            </button>

            <button
              onClick={handleSyncFromCloud}
              disabled={syncing}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-quest-surface border border-quest-border hover:border-quest-accent/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-quest-positive" />
                <span className="text-xs text-quest-text-primary">Restore dari Cloud</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-quest-text-quaternary" />
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-quest-surface border border-quest-border hover:border-quest-danger/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="w-4 h-4 text-quest-danger" />
                <span className="text-xs text-quest-text-primary">Logout</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-quest-text-quaternary" />
            </button>
          </>
        ) : (
          <div className="p-4 rounded-xl bg-quest-surface border border-quest-border text-center">
            <Cloud className="w-6 h-6 text-quest-text-quaternary mx-auto mb-2" />
            <p className="text-xs text-quest-text-secondary mb-3">
              Login untuk backup otomatis dan akses multi-device
            </p>
            <p className="text-[10px] text-quest-text-quaternary">
              Data lokal tetap tersimpan tanpa login
            </p>
          </div>
        )}
      </div>

      {/* Data Export */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-quest-text-secondary uppercase tracking-wider mb-2">
          Data
        </h3>
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-quest-surface border border-quest-border hover:border-quest-positive/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <FileJson className="w-4 h-4 text-quest-positive" />
            <span className="text-xs text-quest-text-primary">Export Backup (.json)</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-quest-text-quaternary" />
        </button>
      </div>
    </div>
  );
}
