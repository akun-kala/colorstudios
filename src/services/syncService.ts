import { db } from '@/db';
import { db_firestore, doc, setDoc, getDoc, Timestamp } from '@/config/firebase';
import { Quest, UserStats } from '@/types';
import { Achievement, CharacterClass } from '@/types/gamification';

export interface SyncData {
  quests: Quest[];
  userStats: UserStats | null;
  achievements: Achievement[];
  selectedClass: CharacterClass | null;
  lastSyncAt: string;
}

export async function syncToCloud(userId: string): Promise<void> {
  const quests = await db.quests.toArray();
  const stats = await db.userStats.get(1);
  const achievements = await db.achievements.toArray();
  const selectedClass = localStorage.getItem('quest-ai-class') as CharacterClass | null;

  const data: SyncData = {
    quests,
    userStats: stats || null,
    achievements,
    selectedClass,
    lastSyncAt: new Date().toISOString(),
  };

  await setDoc(doc(db_firestore, 'users', userId), {
    data: JSON.parse(JSON.stringify(data)),
    updatedAt: Timestamp.now(),
  });
}

export async function syncFromCloud(userId: string): Promise<SyncData | null> {
  const docRef = doc(db_firestore, 'users', userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const cloudData = docSnap.data().data as SyncData;

  // Restore to IndexedDB
  if (cloudData.quests) {
    await db.quests.clear();
    await db.quests.bulkAdd(cloudData.quests);
  }
  if (cloudData.userStats) {
    await db.userStats.put(cloudData.userStats);
  }
  if (cloudData.achievements) {
    await db.achievements.clear();
    await db.achievements.bulkAdd(cloudData.achievements);
  }
  if (cloudData.selectedClass) {
    localStorage.setItem('quest-ai-class', cloudData.selectedClass);
  }

  return cloudData;
}

export async function exportData(): Promise<string> {
  const quests = await db.quests.toArray();
  const stats = await db.userStats.get(1);
  const achievements = await db.achievements.toArray();
  const patterns = await db.table('patterns').get(1);

  const exportObj = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    quests,
    userStats: stats,
    achievements,
    patterns,
    selectedClass: localStorage.getItem('quest-ai-class'),
  };

  return JSON.stringify(exportObj, null, 2);
}

export function downloadExport(data: string, filename: string = 'quest-ai-backup.json'): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
