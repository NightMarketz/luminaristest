import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';

export interface CatalogOption {
  codigo: string;
  descricao: string;
  /** Short badge after the description (TIPO_LANCAMENTO A/E/P/L, or the tributo I/C/A). */
  tag?: string;
}

export interface CatalogComboboxProps {
  options: CatalogOption[];
  /** Selected `codigo` ('' = none). */
  value: string;
  onChange: (codigo: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  /** Styling of the text input (the panels pass `inputClass` from SpedGenerationPanel). */
  inputClassName?: string;
  /** Accessible name of the input. */
  ariaLabel?: string;
}

/**
 * Label + control as a plain block (NOT a `<label>`): `SpedGenerationPanel.Field` wraps its child in a
 * `<label>`, which is fine for a single input but not for a radio group, this combobox's listbox or a
 * read-only box (non-phrasing content). Module-level so its identity is stable across renders.
 */
export function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-neutral-400">
      <span>{label}</span>
      {children}
    </div>
  );
}

/** Accent/case-insensitive — the sheet says "Provisões", the operator types "provisoes". */
// Combining-mark range U+0300–U+036F (same as NfePanel.normalizeName; the FE target lacks the `u` flag).
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * CatalogCombobox (FE-INCR-LALUR, Fork F-FE-3 → a) — select-with-search over a Leiaute 12 sheet
 * (M300A/M350A/N…/PARTEB_PADRAO). Search by código OR descrição from 2 chars (below that, the whole
 * sheet is listed — ≤ 374 rows, no virtualization), keyboard ↑↓⏎ Esc, `role=combobox`/`listbox`/
 * `option` + `aria-activedescendant`. Selection shows `codigo · descrição · TAG`. Text that matches no
 * option is an INLINE error on blur (the server would refuse it with 400 anyway — item 7): the value
 * is cleared, never sent. Pure presentation: the caller owns the options (loaded per livro/year).
 */
export function CatalogCombobox({
  options,
  value,
  onChange,
  disabled,
  loading,
  placeholder,
  inputClassName,
  ariaLabel,
}: CatalogComboboxProps) {
  const { t } = useTranslation('accounting');
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Set right before THIS component clears the parent's value (text outside the catalog): the mirror
  // effect must then keep the typed text + the inline error instead of blanking the field.
  const selfClearRef = useRef(false);

  const selected = useMemo(() => options.find((o) => o.codigo === value), [options, value]);
  const label = (o: CatalogOption) => `${o.codigo} · ${o.descricao}${o.tag ? ` · ${o.tag}` : ''}`;

  // Mirror the selection into the text box whenever it changes from outside (edit mode, reset). Keyed on
  // the label STRING, not on `selected`: callers pass `options` rebuilt with `.map` on every render, so the
  // object identity changes without the selection changing — keying on it would clobber text being typed.
  const selectedLabel = selected ? label(selected) : '';
  useEffect(() => {
    if (selfClearRef.current) {
      selfClearRef.current = false;
      return;
    }
    setQuery(selectedLabel);
    setNotFound(false);
    // `value` is a dep so a parent clear of a value NOT in `options` (label already '') still consumes the flag.
  }, [selectedLabel, value]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (q.length < 2 || (selected && query === label(selected))) return options;
    return options.filter((o) => norm(o.codigo).includes(q) || norm(o.descricao).includes(q));
  }, [options, query, selected]);

  useEffect(() => {
    setActive(0);
  }, [filtered]);

  function pick(o: CatalogOption) {
    onChange(o.codigo);
    setQuery(label(o));
    setNotFound(false);
    setOpen(false);
  }

  /** Blur/outside-click: exact código match selects; anything else that is not the current selection is an inline error. */
  function commitText() {
    setOpen(false);
    const text = query.trim();
    if (text === '') {
      if (value !== '') onChange('');
      setNotFound(false);
      return;
    }
    if (selected && text === label(selected)) return;
    const exact = options.find((o) => o.codigo === text || norm(label(o)) === norm(text));
    if (exact) {
      pick(exact);
      return;
    }
    if (value !== '') {
      selfClearRef.current = true;
      onChange('');
    }
    setNotFound(true);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true); // first ↓ on a closed list opens it on the current row (never skips option 0)
      else setActive((a) => Math.min(a + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[active]) {
        e.preventDefault();
        pick(filtered[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[active] ? optionId(active) : undefined}
        aria-invalid={notFound || undefined}
        value={query}
        disabled={disabled}
        placeholder={loading ? t('lalur.combobox.loading', 'Carregando catálogo…') : placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setNotFound(false);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          // A click on an option moves focus into the list; the option's onMouseDown handles it.
          if (rootRef.current?.contains(e.relatedTarget as Node | null)) return;
          commitText();
        }}
        onKeyDown={onKeyDown}
        className={`w-full ${inputClassName ?? ''} ${notFound ? 'border-red-700' : ''}`}
        autoComplete="off"
      />
      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-900 py-1 text-sm shadow-lg"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-neutral-500">{t('lalur.combobox.noMatch', 'Nenhuma linha do catálogo corresponde.')}</li>
          )}
          {filtered.map((o, i) => (
            <li
              key={o.codigo}
              id={optionId(i)}
              role="option"
              aria-selected={o.codigo === value}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-1.5 ${i === active ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-300'}`}
            >
              <span className="font-mono text-xs text-emerald-300">{o.codigo}</span>
              <span className="mx-1.5 text-neutral-600">·</span>
              <span>{o.descricao}</span>
              {o.tag && <span className="ml-1.5 rounded-full bg-neutral-800 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400">{o.tag}</span>}
            </li>
          ))}
        </ul>
      )}
      {notFound && (
        <p role="alert" className="mt-1 text-xs text-red-300">
          {t('lalur.combobox.notInCatalog', 'Código fora do catálogo — selecione uma linha da lista.')}
        </p>
      )}
    </div>
  );
}
