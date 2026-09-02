export interface UserPattern {
  id: string;
  userId: string;
  productiveHours: number[]; // hours of day (0-23) with productivity score
  avgCompletionTime: Record<string, number>; // quest category -> minutes
  commonProcrastinationHours: number[];
  bestFocusDuration: number; // minutes
  preferredBreakLength: number;
  streakHistory: string[]; // dates
  createdAt: Date;
  updatedAt: Date;
}

export interface AIInsight {
  id: string;
  type: 'morning-brief' | 'boss-battle' | 'routine-nudge' | 'productivity-tip' | 'streak-warning';
  title: string;
  message: string;
  confidence: number; // 0-100
  actionItems?: string[];
  questId?: string;
  createdAt: Date;
  dismissed: boolean;
}

export interface Tactic {
  id: string;
  name: string;
  description: string;
  steps: string[];
  bestFor: string[]; // quest types this works best for
}

export const TACTICS: Tactic[] = [
  {
    id: 'boss-split',
    name: 'Boss Split',
    description: 'Pecah kerjaan jadi 2 sesi dengan break di tengah',
    steps: ['Kerjain 50% dulu (1 jam)', 'Break 10-15 menit', 'Gas sisa 50%'],
    bestFor: ['report', 'analysis', 'writing'],
  },
  {
    id: 'reverse-method',
    name: 'Reverse Method',
    description: 'Mulai dari hasil akhir, mundur ke awal',
    steps: ['Bayangin hasil akhir', 'Tulis poin-poin utama', 'Isi detailnya'],
    bestFor: ['presentation', 'design', 'creative'],
  },
  {
    id: 'pomodoro-plus',
    name: 'Pomodoro+',
    description: '25 menit fokus + 5 menit break, tapi sesuai ritme lo',
    steps: ['Set timer 25 menit', 'Fokus 100%', 'Break 5 menit', 'Repeat 4x, long break'],
    bestFor: ['coding', 'study', 'research'],
  },
  {
    id: 'quick-win',
    name: 'Quick Win',
    description: 'Kerjain yang paling gampang dulu buat build momentum',
    steps: ['Pilih stage termudah', 'Selesaikan dalam 5 menit', 'Rasakan dopamine-nya', 'Lanjut ke yang berat'],
    bestFor: ['overwhelmed', 'adhd', 'low-energy'],
  },
];
