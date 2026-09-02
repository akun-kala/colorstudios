import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Quest } from '@/types';
import { useAIStore } from '@/stores/aiStore';
import { useUserStore } from '@/stores/userStore';
import { AIInsight } from '@/types/ai';
import { askNyx } from '@/services/aiNLPService';
import { Flame, Sun, AlertTriangle, Repeat, Lightbulb, X, Zap } from 'lucide-react';

interface Props {
  onToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

const typeConfig = {
  'morning-brief': { icon: Sun, color: 'text-quest-accent', bg: 'bg-quest-accent/5', border: 'border-quest-accent/20' },
  'boss-battle': { icon: Flame, color: 'text-quest-danger', bg: 'bg-quest-danger/5', border: 'border-quest-danger/30' },
  'routine-nudge': { icon: Repeat, color: 'text-quest-positive', bg: 'bg-quest-positive/5', border: 'border-quest-positive/20' },
  'productivity-tip': { icon: Lightbulb, color: 'text-quest-warning', bg: 'bg-quest-warning/5', border: 'border-quest-warning/20' },
  'streak-warning': { icon: Zap, color: 'text-quest-accent', bg: 'bg-quest-accent/5', border: 'border-quest-accent/20' },
};

const quickQuestions = [
  { label: '📊 Gimana performaku?', query: 'performance' },
  { label: '🎯 Saran quest hari ini', query: 'recommend' },
  { label: '😴 Kenapa aku lesu?', query: 'energy' },
  { label: '⚡ Taktik terbaik buatku', query: 'tactic' },
];

export function AIGuide({ onToast }: Props) {
  const quests = useLiveQuery(() => db.quests.where('isCompleted').equals(0).toArray()) || [];
  const insights = useAIStore((s) => s.insights);
  const loadPatterns = useAIStore((s) => s.loadPatterns);
  const generateInsights = useAIStore((s) => s.generateInsights);
  const dismissInsight = useAIStore((s) => s.dismissInsight);
  const stats = useUserStore((s) => s.stats);
  const [activeTab, setActiveTab] = useState<'feed' | 'ask'>('feed');
  const [askResponse, setAskResponse] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  useEffect(() => {
    if (quests.length > 0) {
      generateInsights(quests);
    }
  }, [quests, generateInsights]);

  const handleQuickAsk = async (query: string) => {
    setIsAsking(true);
    const patterns = await db.table('patterns').get(1);
    const completedToday = (await db.quests.toArray()).filter(
      q => q.isCompleted && q.completedAt && new Date(q.completedAt).toDateString() === new Date().toDateString()
    ).length;

    const context = {
      level: stats?.level || 1,
      streak: stats?.streak || 0,
      activeQuests: quests.length,
      completedToday,
      productiveHours: patterns?.productiveHours || [21, 22],
      currentTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      recentQuests: quests.slice(0, 3),
    };

    try {
      const response = await askNyx(query, context);
      setAskResponse(response);
    } catch {
      onToast('Nyx lagi sibuk, coba lagi ya!', 'warning');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="px-4 py-3">
      {/* Nyx Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center text-lg">
          🎲
        </div>
        <div>
          <div className="font-bold text-sm text-quest-text-primary">Nyx, Your Game Master</div>
          <div className="text-[10px] text-quest-text-tertiary">Mengenalmu sejak Day 1</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => { setActiveTab('feed'); setAskResponse(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'feed'
              ? 'bg-quest-text-primary text-quest-bg'
              : 'bg-quest-surface text-quest-text-tertiary'
          }`}
        >
          📋 Feed
        </button>
        <button
          onClick={() => { setActiveTab('ask'); setAskResponse(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'ask'
              ? 'bg-quest-text-primary text-quest-bg'
              : 'bg-quest-surface text-quest-text-tertiary'
          }`}
        >
          💬 Tanya Nyx
        </button>
      </div>

      {activeTab === 'feed' ? (
        <div className="space-y-3">
          {insights.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-2">🎲</div>
              <p className="text-xs text-quest-text-tertiary">Nyx sedang menganalisis pattern-mu...</p>
              <p className="text-[10px] text-quest-text-quaternary mt-1">Buat quest dulu untuk melihat insight!</p>
            </div>
          ) : (
            insights.map((insight) => {
              const config = typeConfig[insight.type];
              const Icon = config.icon;

              return (
                <div
                  key={insight.id}
                  className={`rounded-xl border ${config.border} ${config.bg} p-3.5 animate-fade-in relative group`}
                >
                  <button
                    onClick={() => dismissInsight(insight.id)}
                    className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                  >
                    <X className="w-3 h-3 text-quest-text-quaternary" />
                  </button>

                  <div className="flex items-start gap-2.5">
                    <Icon className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-quest-text-primary">{insight.title}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-quest-text-tertiary">
                          {insight.confidence}% akurat
                        </span>
                      </div>
                      <p className="text-[11px] text-quest-text-secondary mt-1 leading-relaxed">{insight.message}</p>

                      {insight.actionItems && insight.actionItems.length > 0 && (
                        <div className="mt-2.5 space-y-1.5">
                          {insight.actionItems.map((action, idx) => (
                            <button
                              key={idx}
                              onClick={() => onToast(`✅ ${action}`, 'success')}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-quest-bg/50 border border-quest-border/50 text-[11px] text-quest-text-primary hover:bg-white/5 transition-colors text-left"
                            >
                              <span>{action}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {askResponse ? (
            <div className="rounded-xl border border-quest-accent/20 bg-quest-accent/5 p-4 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center text-[10px]">🎲</div>
                <p className="text-xs text-quest-text-primary leading-relaxed">{askResponse}</p>
              </div>
              <button
                onClick={() => setAskResponse(null)}
                className="mt-3 text-[10px] text-quest-text-tertiary hover:text-quest-text-secondary transition-colors"
              >
                ← Kembali
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-quest-text-secondary mb-3">Tanya Nyx apa aja tentang produktivitasmu:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickQuestions.map((q) => (
                  <button
                    key={q.query}
                    onClick={() => !isAsking && handleQuickAsk(q.query)}
                    disabled={isAsking}
                    className="p-3 rounded-xl bg-quest-surface border border-quest-border text-left hover:border-quest-accent/30 transition-colors disabled:opacity-50"
                  >
                    <span className="text-xs text-quest-text-primary">{q.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Atau ketik pertanyaanmu..."
                  disabled={isAsking}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-quest-bg border border-quest-border text-xs text-quest-text-primary placeholder:text-quest-text-quaternary focus:outline-none focus:border-quest-accent disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value;
                      if (val.trim()) handleQuickAsk(val.trim());
                    }
                  }}
                />
                <button 
                  disabled={isAsking}
                  className="px-4 py-2.5 rounded-xl bg-quest-text-primary text-quest-bg text-xs font-bold disabled:opacity-50"
                >
                  {isAsking ? '...' : 'Kirim'}
                </button>
              </div>
              <p className="text-[10px] text-quest-text-quaternary mt-2">
                {import.meta.env.VITE_OPENAI_API_KEY ? 'Powered by GPT-4o-mini' : 'Mode rule-based (tambah API key untuk AI penuh)'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
