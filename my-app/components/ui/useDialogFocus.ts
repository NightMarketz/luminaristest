import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) => !node.hasAttribute('disabled') && node.offsetParent !== null,
  );
}

/**
 * Foco de um diálogo modal: ao abrir, guarda quem tinha o foco (o gatilho) e leva o foco para dentro (primeiro
 * focável, ou o próprio diálogo se não houver); Tab/Shift+Tab circulam dentro; ao fechar, devolve o foco ao gatilho.
 * `ready` = o elemento do diálogo já está no DOM (Modal monta num portal depois do 1º render).
 * A circulação só vale enquanto o foco está dentro do diálogo (ou no body): um diálogo aninhado (ConfirmModal sobre
 * Modal) tem o próprio laço e o Tab dele não pode ser puxado de volta para o diálogo de baixo.
 */
export function useDialogFocus(ready: boolean, ref: RefObject<HTMLElement | null>, initialFocusSelector?: string): void {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!ready) return;
    const el = ref.current;
    if (!el) return;

    const active = document.activeElement;
    triggerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;

    if (!el.contains(document.activeElement)) {
      const preferred = initialFocusSelector ? el.querySelector<HTMLElement>(initialFocusSelector) : null;
      const target = preferred && !preferred.hasAttribute('disabled') ? preferred : focusables(el)[0];
      if (target) target.focus();
      else {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus();
      }
    }

    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const root = ref.current;
      if (!root) return;
      const current = document.activeElement;
      if (current && current !== document.body && !root.contains(current)) return;
      const items = focusables(root);
      if (items.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (current === first || current === root || current === document.body)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || current === document.body)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trap);

    return () => {
      document.removeEventListener('keydown', trap);
      const trigger = triggerRef.current;
      triggerRef.current = null;
      if (trigger && trigger.isConnected) trigger.focus();
    };
  }, [ready, ref, initialFocusSelector]);
}
