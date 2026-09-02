import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { StatsBar } from '@/components/StatsBar';
import { QuestList } from '@/components/QuestList';
import { AIGuide } from '@/components/AIGuide';
import { AchievementList } from '@/components/AchievementList';
import { CharacterClassSelector } from '@/components/CharacterClassSelector';
import { ProfilePanel } from '@/components/ProfilePanel';
import { LoginModal } from '@/components/LoginModal';
import { CreateQuestModal } from '@/components/CreateQuestModal';
import { Toast } from '@/components/Toast';
import { useUserStore } from '@/stores/userStore';
import { useAIStore } from '@/stores/aiStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useAuthStore } from '@/stores/authStore';
import { requestNotificationPermission } from '@/utils/notifications';

type Tab = 'quests' | 'ai' | 'achievements' | 'class' | 'profile';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('quests');
  const [showCreate, setShowCreate] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const loadStats = useUserStore((s) => s.loadStats);
  const loadPatterns = useAIStore((s) => s.loadPatterns);
  const loadAchievements = useGamificationStore((s) => s.loadAchievements);
  const loadClass = useGamificationStore((s) => s.loadClass);
  const initAuth = useAuthStore((s) => s.initAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    loadStats();
    loadPatterns();
    loadAchievements();
    loadClass();
    initAuth();
    requestNotificationPermission();
  }, [loadStats, loadPatterns, loadAchievements, loadClass, initAuth]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'quests', label: 'Quests' },
    { id: 'ai', label: 'AI' },
    { id: 'achievements', label: 'Trophy' },
    { id: 'class', label: 'Class' },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-quest-bg max-w-lg mx-auto relative flex flex-col">
      <Header onCreateClick={() => setShowCreate(true)} />
      <StatsBar />

      {/* Tab Navigation */}
      <div className="flex border-b border-quest-border sticky top-[57px] bg-quest-bg/95 backdrop-blur-sm z-30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'profile' && !isAuthenticated) {
                setShowLogin(true);
              }
              setActiveTab(tab.id);
            }}
            className={`flex-1 py-3 text-[11px] font-semibold transition-colors relative ${
              activeTab === tab.id
                ? 'text-quest-text-primary'
                : 'text-quest-text-tertiary hover:text-quest-text-secondary'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-quest-text-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'quests' && <QuestList onToast={showToast} />}
        {activeTab === 'ai' && <AIGuide onToast={showToast} />}
        {activeTab === 'achievements' && <AchievementList />}
        {activeTab === 'class' && <CharacterClassSelector onSelect={() => showToast('🎭 Class dipilih!', 'success')} />}
        {activeTab === 'profile' && <ProfilePanel onToast={showToast} />}
      </div>

      {showCreate && (
        <CreateQuestModal 
          onClose={() => setShowCreate(false)} 
          onToast={showToast}
        />
      )}

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
