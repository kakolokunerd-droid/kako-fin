import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  accent?: 'indigo' | 'teal';
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

const accentStyles = {
  indigo: {
    ring: 'ring-indigo-500/30 border-indigo-400',
    check: 'text-indigo-600',
    active: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200',
  },
  teal: {
    ring: 'ring-teal-500/30 border-teal-400',
    check: 'text-teal-600',
    active: 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200',
  },
};

/** Select customizado — lista arredondada (o &lt;select&gt; nativo não permite estilizar o popup) */
const FormSelect: React.FC<FormSelectProps> = ({
  label,
  value,
  onChange,
  options,
  accent = 'indigo',
  className = '',
  disabled = false,
  placeholder = 'Selecione…',
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const styles = accentStyles[accent];
  const selected = options.find((o) => o.value === value);

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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={[
          'w-full flex items-center justify-between gap-2',
          'pl-4 pr-3.5 py-2.5',
          'bg-slate-50 dark:bg-slate-800',
          'border border-slate-200 dark:border-slate-600',
          'rounded-2xl',
          'text-sm font-medium text-left',
          'outline-none transition-shadow',
          open ? `ring-2 ${styles.ring}` : 'hover:border-slate-300 dark:hover:border-slate-500',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className={selected ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className={[
            'absolute z-50 mt-1.5 w-full max-h-56 overflow-y-auto rounded-2xl py-1.5',
            'border border-slate-200 dark:border-slate-500',
            'bg-white dark:bg-slate-800 shadow-2xl',
            'ring-1 ring-black/5 dark:ring-white/10',
            '[scrollbar-width:thin]',
            '[scrollbar-color:rgb(148_163_184_/_0.55)_transparent]',
            '[&::-webkit-scrollbar]:w-1.5',
            '[&::-webkit-scrollbar-track]:bg-transparent',
            '[&::-webkit-scrollbar-thumb]:rounded-full',
            '[&::-webkit-scrollbar-thumb]:bg-slate-400/50',
            'dark:[&::-webkit-scrollbar-thumb]:bg-slate-500/60',
            '[&::-webkit-scrollbar-thumb]:hover:bg-slate-400/80',
          ].join(' ')}
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={[
                    'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left',
                    'transition-colors',
                    isActive
                      ? styles.active
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800',
                  ].join(' ')}
                >
                  <span className="font-medium">{opt.label}</span>
                  {isActive && <Check size={16} className={`shrink-0 ${styles.check}`} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FormSelect;
