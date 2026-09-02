import { useState } from 'react';
import { X, Plus, Minus, Calendar, Repeat } from 'lucide-react';
import { Quest, Stage, Rarity, getRarityFromDifficulty, calculateXpReward } from '@/types';
import { db } from '@/db';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addHours } from 'date-fns';

interface Props {
  onClose: () => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

export function CreateQuestModal({ onClose, onToast }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questType, setQuestType] = useState<'deadline' | 'interval'>('deadline');
  const [deadline, setDeadline] = useState('');
  const [intervalDays, setIntervalDays] = useState(2);
  const [difficulty, setDifficulty] = useState(3);
  const [stages, setStages] = useState(['']);

  const rarity = getRarityFromDifficulty(difficulty);
  const xpReward = questType === 'deadline' && deadline
    ? calculateXpReward(difficulty, Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : difficulty * 10;

  const addStage = () => setStages([...stages, '']);
  const removeStage = (idx: number) => setStages(stages.filter((_, i) => i !== idx));
  const updateStage = (idx: number, val: string) => {
    const copy = [...stages];
    copy[idx] = val;
    setStages(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validStages = stages.filter((s) => s.trim()).map((s) => ({
      id: uuidv4(),
      title: s.trim(),
      completed: false,
    }));

    const now = new Date();
    const quest: Quest = {
      id: uuidv4(),
      title: title.trim(),
      description: description.trim() || undefined,
      rarity,
      questType,
      xpReward,
      stages: validStages.length > 0 ? validStages : [{ id: uuidv4(), title: 'Selesaikan quest', completed: false }],
      deadline: questType === 'deadline' && deadline ? new Date(deadline) : undefined,
      intervalDays: questType === 'interval' ? intervalDays : undefined,
      nextDueAt: questType === 'interval' ? addDays(now, intervalDays) : undefined,
      createdAt: now,
      isCompleted: false,
    };

    await db.quests.add(quest);
    onToast('✨ Quest baru dibuat! Gas mulai!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-quest-surface rounded-t-2xl sm:rounded-2xl border border-quest-border max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-quest-surface z-10 px-4 py-3 border-b border-quest-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-quest-text-primary">Buat Quest Baru</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/5">
            <X className="w-4 h-4 text-quest-text-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[11px] font-semibold text-quest-text-secondary mb-1 block">Nama Quest</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Laporan Bulanan Q3"
              className="w-full px-3 py-2.5 rounded-xl bg-quest-bg border border-quest-border text-sm text-quest-text-primary placeholder:text-quest-text-quaternary focus:outline-none focus:border-quest-accent transition-colors"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold text-quest-text-secondary mb-1 block">Deskripsi (opsional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail tambahan..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-quest-bg border border-quest-border text-sm text-quest-text-primary placeholder:text-quest-text-quaternary focus:outline-none focus:border-quest-accent transition-colors resize-none"
            />
          </div>

          {/* Quest Type */}
          <div>
            <label className="text-[11px] font-semibold text-quest-text-secondary mb-1.5 block">Tipe Quest</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQuestType('deadline')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                  questType === 'deadline'
                    ? 'border-quest-accent bg-quest-accent/10 text-quest-accent'
                    : 'border-quest-border text-quest-text-tertiary hover:text-quest-text-secondary'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Deadline
              </button>
              <button
                type="button"
                onClick={() => setQuestType('interval')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                  questType === 'interval'
                    ? 'border-quest-positive bg-quest-positive/10 text-quest-positive'
                    : 'border-quest-border text-quest-text-tertiary hover:text-quest-text-secondary'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                Rutin
              </button>
            </div>
          </div>

          {/* Deadline / Interval */}
          {questType === 'deadline' ? (
            <div>
              <label className="text-[11px] font-semibold text-quest-text-secondary mb-1 block">Deadline</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-quest-bg border border-quest-border text-sm text-quest-text-primary focus:outline-none focus:border-quest-accent transition-colors"
                required
              />
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-semibold text-quest-text-secondary mb-1 block">Interval (hari)</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIntervalDays(Math.max(1, intervalDays - 1))}
                  className="w-8 h-8 rounded-lg bg-quest-bg border border-quest-border flex items-center justify-center hover:bg-white/5"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-semibold text-quest-text-primary w-6 text-center">{intervalDays}</span>
                <button
                  type="button"
                  onClick={() => setIntervalDays(intervalDays + 1)}
                  className="w-8 h-8 rounded-lg bg-quest-bg border border-quest-border flex items-center justify-center hover:bg-white/5"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-quest-text-tertiary">hari sekali</span>
              </div>
            </div>
          )}

          {/* Difficulty */}
          <div>
            <label className="text-[11px] font-semibold text-quest-text-secondary mb-1.5 block">
              Kesulitan: {difficulty}/10
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-full h-1.5 bg-quest-border rounded-full appearance-none cursor-pointer accent-quest-accent"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-quest-text-quaternary">Mudah</span>
              <span className={`text-[10px] font-semibold ${
                rarity === 'common' ? 'text-quest-positive' :
                rarity === 'rare' ? 'text-quest-accent' :
                rarity === 'epic' ? 'text-quest-warning' : 'text-quest-danger'
              }`}>
                {rarity.toUpperCase()} • +{xpReward} XP
              </span>
              <span className="text-[10px] text-quest-text-quaternary">Sulit</span>
            </div>
          </div>

          {/* Stages */}
          <div>
            <label className="text-[11px] font-semibold text-quest-text-secondary mb-1.5 block">Tahapan</label>
            <div className="space-y-2">
              {stages.map((stage, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={stage}
                    onChange={(e) => updateStage(idx, e.target.value)}
                    placeholder={`Stage ${idx + 1}`}
                    className="flex-1 px-3 py-2 rounded-xl bg-quest-bg border border-quest-border text-sm text-quest-text-primary placeholder:text-quest-text-quaternary focus:outline-none focus:border-quest-accent transition-colors"
                  />
                  {stages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStage(idx)}
                      className="w-9 h-9 rounded-xl bg-quest-bg border border-quest-border flex items-center justify-center hover:bg-quest-danger/10 hover:border-quest-danger/30 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5 text-quest-text-tertiary" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addStage}
              className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-quest-accent hover:text-quest-text-primary transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Stage
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-quest-text-primary text-quest-bg text-sm font-bold hover:bg-quest-text-secondary transition-colors"
          >
            ⚔️ Buat Quest
          </button>
        </form>
      </div>
    </div>
  );
}
