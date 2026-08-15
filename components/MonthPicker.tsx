import React, { useEffect, useId, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

const MONTHS_LONG = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function parseYm(ym: string): { year: number; month: number } {
  const [y, m] = (ym || '').split('-').map(Number);
  const now = new Date();
  return {
    year: Number.isFinite(y) ? y : now.getFullYear(),
    month: Number.isFinite(m) && m >= 1 && m <= 12 ? m : now.getMonth() + 1,
  };
}

function toYm(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatYmLabel(ym: string): string {
  const { year, month } = parseYm(ym);
  const label = `${MONTHS_LONG[month - 1]} de ${year}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function currentYm(): string {
  const d = new Date();
  return toYm(d.getFullYear(), d.getMonth() + 1);
}

interface MonthPickerProps {
  label?: string;
  value: string; // YYYY-MM
  onChange: (ym: string) => void;
  className?: string;
  /** Estilo do botão trigger */
  variant?: 'default' | 'onBrand';
  disabled?: boolean;
}

/** Seletor de mês customizado (o input type=month nativo abre popup quadrado do SO/navegador) */
const MonthPicker: React.FC<MonthPickerProps> = ({
  label,
  value,
  onChange,
  className = '',
  variant = 'default',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const parsed = parseYm(value);
  const [viewYear, setViewYear] = useState(parsed.year);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (open) setViewYear(parseYm(value).year);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const triggerClass =
    variant === 'onBrand'
      ? 'h-[42px] px-3 rounded-xl bg-white/95 text-indigo-900 text-sm font-semibold hover:bg-white'
      : 'w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-500';

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={[
          'inline-flex items-center justify-between gap-2 outline-none transition-shadow',
          triggerClass,
          open ? 'ring-2 ring-indigo-500/30 border-indigo-400' : '',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          variant === 'onBrand' ? 'min-w-[11.5rem]' : '',
        ].join(' ')}
      >
        <span className="capitalize truncate">{formatYmLabel(value)}</span>
        <Calendar size={16} className="shrink-0 opacity-60" />
      </button>

      {open && (
        <div
          id={listId}
          role="dialog"
          className={[
            'absolute z-50 mt-1.5 w-[17.5rem] rounded-2xl p-3',
            'border border-slate-200 dark:border-slate-500',
            'bg-white dark:bg-slate-800 shadow-2xl',
            'ring-1 ring-black/5 dark:ring-white/10',
          ].join(' ')}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Ano anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Próximo ano"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS_SHORT.map((name, idx) => {
              const month = idx + 1;
              const ym = toYm(viewYear, month);
              const selected = value === ym;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange(ym);
                    setOpen(false);
                  }}
                  className={[
                    'py-2 rounded-xl text-xs font-semibold capitalize transition-colors',
                    selected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
                  ].join(' ')}
                >
                  {name}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                onChange(currentYm());
                setOpen(false);
              }}
              className="text-xs font-bold text-indigo-600 hover:underline px-1 py-1"
            >
              Este mês
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-1 py-1"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthPicker;
export { formatYmLabel as formatMonthPickerLabel };
