import React from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';

interface RowExpandButtonProps {
  expanded: boolean;
  onToggle: () => void;
  /** Nome acessível (já traduzido pelo painel) — "Expandir". */
  label: string;
}

/**
 * Alvo de teclado/leitor de tela das linhas expansíveis da contabilidade. O `<tr onClick>` continua atendendo o
 * mouse; este botão leva o mesmo gesto ao teclado (Enter/Espaço) e anuncia o estado via aria-expanded.
 * `stopPropagation` evita que o clique no botão também dispare o toggle do `<tr>`.
 */
export function RowExpandButton({ expanded, onToggle, label }: RowExpandButtonProps) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="rounded p-0.5 text-neutral-500 hover:text-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
    >
      {expanded ? <FiChevronDown size={14} aria-hidden="true" /> : <FiChevronRight size={14} aria-hidden="true" />}
    </button>
  );
}
