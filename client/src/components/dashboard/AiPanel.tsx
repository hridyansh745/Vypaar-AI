import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Bot, Loader2, Send, Sparkles, User } from 'lucide-react';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import {
  DEMO_DAYS, LOW_STOCK_PRODUCTS, OUT_OF_STOCK_PRODUCTS, DEMO_TRANSACTIONS,
  OUTSTANDING_TOTAL, formatINR, type Granularity,
} from '../../lib/demoData';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'dash2.ai.q1',
  'dash2.ai.q2',
  'dash2.ai.q3',
  'dash2.ai.q4',
  'dash2.ai.q5',
] as const;

/** Honest Demo Assistant: answers computed from the labelled sample dataset. */
function demoAnswer(t: (k: string, params?: Record<string, unknown>) => string, q: string): string {
  const text = q.toLowerCase();
  const today = DEMO_DAYS[DEMO_DAYS.length - 1];
  const week = DEMO_DAYS.slice(-7);
  const month = DEMO_DAYS.slice(-30);
  const sum = (arr: typeof DEMO_DAYS, f: (d: (typeof DEMO_DAYS)[number]) => number) =>
    arr.reduce((s, d) => s + f(d), 0);

  if (/stock|inventory|restock/i.test(text)) {
    const low = [...LOW_STOCK_PRODUCTS, ...OUT_OF_STOCK_PRODUCTS];
    return `${t('dash2.ai.demoPrefix')}${t('dash2.ai.stockAnswer', {
      low: low.map((p) => `${p.name} (${p.stock === 0 ? t('dash2.ai.out') : p.stock})`).join(', '),
    })}`;
  }
  if (/pending|overdue|invoice|payment|udhaar/i.test(text)) {
    const pending = DEMO_TRANSACTIONS.filter((x) => x.status !== 'paid');
    return `${t('dash2.ai.demoPrefix')}${t('dash2.ai.pendingAnswer', {
      count: pending.length,
      amount: formatINR(OUTSTANDING_TOTAL),
    })}`;
  }
  if (/week/i.test(text) && /profit/i.test(text)) {
    const profit = sum(week, (d) => d.sales - d.expenses);
    return `${t('dash2.ai.demoPrefix')}${t('dash2.ai.weekProfitAnswer', { amount: formatINR(profit) })}`;
  }
  if (/month/i.test(text)) {
    const sales = sum(month, (d) => d.sales);
    const profit = sum(month, (d) => d.sales - d.expenses);
    return `${t('dash2.ai.demoPrefix')}${t('dash2.ai.monthAnswer', {
      sales: formatINR(sales),
      profit: formatINR(profit),
    })}`;
  }
  if (/sell|sale|today|revenue/i.test(text)) {
    return `${t('dash2.ai.demoPrefix')}${t('dash2.ai.todayAnswer', { amount: formatINR(today.sales) })}`;
  }
  return `${t('dash2.ai.demoPrefix')}${t('dash2.ai.fallbackAnswer')}`;
}

export function AiPanel({
  compact = false,
  aiConfigured,
  aiProvider,
  granularity = 'daily',
}: {
  compact?: boolean;
  aiConfigured: boolean;
  aiProvider: string | null;
  granularity?: Granularity;
}) {
  void granularity;
  void aiProvider;
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    setMessages((m) => [...m, { role: 'user', text: trimmed }]);
    setInput('');
    setLoading(true);

    if (!aiConfigured) {
      // Clearly-labelled Demo Assistant — answers derived from the sample dataset.
      window.setTimeout(() => {
        setMessages((m) => [...m, { role: 'assistant', text: demoAnswer(t as never, trimmed) }]);
        setLoading(false);
      }, 550);
      return;
    }

    try {
      const res = await api.post<{ reply: string }>('/api/ai/chat', { message: trimmed });
      setMessages((m) => [...m, { role: 'assistant', text: res.reply }]);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'ai_unavailable') {
        setError(t('dash2.ai.notConfigured'));
      } else {
        setError(t('common.errorNetwork'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-[#171717]">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-brand">
            <Bot size={16} aria-hidden="true" />
          </span>
          {t('dash2.ai.title')}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            aiConfigured ? 'border-success/30 bg-success/10 text-success' : 'border-brand/30 bg-brand/10 text-brand',
          )}
        >
          <Sparkles size={11} aria-hidden="true" />
          {aiConfigured ? t('dash2.ai.liveBadge') : t('dash2.ai.demoBadge')}
        </span>
      </div>

      {!aiConfigured && (
        <p className="flex items-start gap-1.5 border-b border-line bg-brand/[0.05] px-4 py-2 text-[11px] leading-relaxed text-brand/80">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          {t('dash2.ai.setupNote')}
        </p>
      )}

      <div
        ref={scrollRef}
        className={cn('flex-1 space-y-3 overflow-y-auto px-4 py-4', compact ? 'min-h-[220px]' : 'min-h-[300px]')}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand">
              <Bot size={22} aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-white">{t('dash2.ai.welcome')}</p>
            <p className="max-w-xs text-xs leading-relaxed text-muted">{t('dash2.ai.welcomeSub')}</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex items-start gap-2.5', m.role === 'user' && 'flex-row-reverse')}>
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                m.role === 'user' ? 'bg-brand text-ink' : 'border border-line bg-raised text-brand',
              )}
              aria-hidden="true"
            >
              {m.role === 'user' ? <User size={13} /> : <Bot size={13} />}
            </span>
            <p
              className={cn(
                'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed',
                m.role === 'user'
                  ? 'rounded-tr-sm bg-brand/90 text-ink'
                  : 'rounded-tl-sm border border-line bg-raised text-white/85',
              )}
            >
              {m.text}
            </p>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-muted">
            <Loader2 size={14} className="animate-spin text-brand" aria-hidden="true" />
            <span className="text-xs">{t('dash2.ai.thinking')}</span>
          </div>
        )}
        {error && (
          <p className="flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertTriangle size={13} aria-hidden="true" />
            {error}
          </p>
        )}
      </div>

      <div className="border-t border-line px-4 pb-4 pt-3">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => void send(t(key))}
              className="rounded-full border border-line bg-charcoal/70 px-2.5 py-1 text-[11px] text-white/75 transition hover:border-brand/40 hover:text-brand"
            >
              {t(key)}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('dash2.ai.inputPh')}
            aria-label={t('dash2.ai.inputPh')}
            className="min-w-0 flex-1 rounded-xl border border-line bg-charcoal/80 px-3.5 py-2.5 text-sm text-white placeholder:text-muted/70 focus:border-brand/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label={t('dash2.ai.send')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-ink transition hover:bg-brand-hover disabled:opacity-40"
          >
            <Send size={16} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default AiPanel;
