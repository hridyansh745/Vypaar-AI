import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { LANGUAGES, changeLanguage, type LanguageCode } from '../i18n';
import { cn } from '../lib/utils';

export function LanguageSelector({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[1];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const select = async (code: LanguageCode) => {
    setOpen(false);
    if (code !== i18n.language) await changeLanguage(code);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language')}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border border-line bg-charcoal/80 text-sm text-white/90 transition hover:border-line-strong hover:bg-raised focus-visible:outline-2 focus-visible:outline-brand',
          compact ? 'px-3 py-2' : 'px-3.5 py-2.5',
        )}
      >
        <Languages size={16} className="text-brand" aria-hidden="true" />
        <span className="font-medium">{current.nativeName}</span>
        <ChevronDown
          size={15}
          className={cn('text-muted transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('common.language')}
          className="animate-slide-in absolute end-0 z-50 mt-2 min-w-48 overflow-hidden rounded-xl border border-line bg-raised p-1.5 shadow-2xl shadow-black/60"
        >
          {LANGUAGES.map((language) => {
            const selected = language.code === current.code;
            return (
              <li key={language.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => void select(language.code)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start text-sm transition',
                    selected
                      ? 'bg-brand/10 text-brand'
                      : 'text-white/85 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <span
                    lang={language.code}
                    className={language.code === 'ur' ? 'font-medium' : 'font-medium'}
                  >
                    {language.nativeName}
                  </span>
                  {selected && <Check size={15} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default LanguageSelector;
