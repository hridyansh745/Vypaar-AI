import { cn } from '../lib/utils';

type Size = 'sm' | 'md' | 'lg';

const sizeMap: Record<Size, { box: string; text: string; gap: string }> = {
  sm: { box: 'h-8 w-8', text: 'text-lg', gap: 'gap-2' },
  md: { box: 'h-10 w-10', text: 'text-xl', gap: 'gap-2.5' },
  lg: { box: 'h-14 w-14', text: 'text-3xl', gap: 'gap-3.5' },
};

export function VyaparAILogo({
  size = 'md',
  className,
  showWordmark = true,
}: {
  size?: Size;
  className?: string;
  showWordmark?: boolean;
}) {
  const s = sizeMap[size];
  return (
    <span className={cn('inline-flex items-center select-none', s.gap, className)}>
      <span className={cn('relative inline-flex shrink-0 items-center justify-center', s.box)}>
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="vyLogoGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFD43B" />
              <stop offset="100%" stopColor="#E8B600" />
            </linearGradient>
          </defs>
          <rect
            x="1"
            y="1"
            width="30"
            height="30"
            rx="9"
            fill="#151515"
            stroke="rgba(255,212,59,0.38)"
            strokeWidth="1.5"
          />
          <path
            d="M9 23V16.5M15 23V11.5M21 23V18"
            stroke="url(#vyLogoGrad)"
            strokeWidth="2.7"
            strokeLinecap="round"
          />
          <path
            d="M24 6.5l1.05 2.45L27.5 10l-2.45 1.05L24 13.5l-1.05-2.45L20.5 10l2.45-1.05L24 6.5z"
            fill="#FFD43B"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className={cn('font-bold tracking-tight leading-none text-white', s.text)}>
          Vyapar<span className="text-brand">AI</span>
        </span>
      )}
    </span>
  );
}

export default VyaparAILogo;
