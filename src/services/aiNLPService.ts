import { Quest } from '@/types';
import { UserPattern } from '@/types/ai';

// TODO: Ganti dengan API key OpenAI/Claude-mu
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const API_URL = 'https://api.openai.com/v1/chat/completions';

interface NyxContext {
  userName?: string;
  level: number;
  streak: number;
  activeQuests: number;
  completedToday: number;
  productiveHours: number[];
  currentTime: string;
  recentQuests: Quest[];
}

export async function askNyx(question: string, context: NyxContext): Promise<string> {
  // Fallback ke rule-based kalo gak ada API key
  if (!OPENAI_API_KEY) {
    return ruleBasedResponse(question, context);
  }

  try {
    const systemPrompt = `Kamu adalah Nyx, Game Master pribadi user di aplikasi produktivitas "Quest AI". 
Kamu ngomong kayak teman gamer — casual, pake "lo/gas/kita", emoji, dan slang gaming. 
Kamu paham ADHD dan selalu kasih saran yang actionable, spesifik, dan personal.

Info user saat ini:
- Level: ${context.level}
- Streak: ${context.streak} hari
- Quest aktif: ${context.activeQuests}
- Jam produktif: ${context.productiveHours.join(', ')}:00
- Waktu sekarang: ${context.currentTime}

Jawab pendek (1-3 kalimat), langsung to the point, jangan formal.`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Nyx NLP error:', error);
    return ruleBasedResponse(question, context);
  }
}

function ruleBasedResponse(question: string, context: NyxContext): string {
  const q = question.toLowerCase();

  if (q.includes('perform') || q.includes('gimana')) {
    return `Level ${context.level}, streak 🔥 ${context.streak}. ${context.activeQuests} quest nunggu. ${context.completedToday > 0 ? 'Hari ini udah gas ' + context.completedToday + ' quest. Mantap!' : 'Hari ini belum mulai, gas dulu yang paling gampang!'}`;
  }
  if (q.includes('saran') || q.includes('rekomendasi')) {
    return context.activeQuests > 0 
      ? `Ada ${context.activeQuests} quest aktif. Gas yang paling urgent dulu, atau pake Quick Win kalo lagi males.` 
      : `Semua clear! Santai dulu atau plan quest besok. 🎮`;
  }
  if (q.includes('lesu') || q.includes('capek') || q.includes('ngantuk')) {
    const hour = new Date().getHours();
    if (context.productiveHours.includes(hour)) {
      return `Jam sekarang jam produktif lo! Cuma 25 menit, gas dulu baru istirahat. 💪`;
    }
    return `Jam sekarang bukan jam produktif lo. Break dulu 15 menit, minum air, baru lanjut.`;
  }
  if (q.includes('taktik') || q.includes('tips')) {
    return `Boss Split buat quest berat, Quick Win kalo overwhelmed. Lo paling jago fokus ${context.productiveHours.length > 0 ? 'jam ' + context.productiveHours[0] + ':00' : 'malam hari'}.`;
  }
  if (q.includes('streak')) {
    return `Streak lo 🔥 ${context.streak} hari. ${context.streak >= 7 ? 'Legendary! Jangan sampai putus.' : 'Gas terus, bentar lagi 7 hari!'}`;
  }

  return `Hmm, Nyx belum paham maksudnya 😅. Coba tanya tentang performa, saran quest, atau taktik!`;
}
