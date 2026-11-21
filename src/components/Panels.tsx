"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The material that is not the conversation.
 *
 * Evidence, the branching futures, the objection, the verification record and
 * the sources all used to sit in one column below the testimony, which made
 * the screen a report that happened to contain a voice. They are now opened
 * from a rail, one at a time.
 *
 * Nothing is removed. The rail says how many of each thing exists, so the
 * reader can see there are six sources before deciding whether to look at
 * them — a panel nobody knows the size of is the same as a panel that is not
 * there. And what must never be behind a door stays outside it: the
 * hypothetical labelling travels with the testimony on the main canvas, not
 * in here.
 */

export interface PanelDefinition {
  readonly id: string;
  readonly label: string;
  /** A count, a state word — whatever tells the reader what is inside. */
  readonly hint?: string;
  readonly content: ReactNode;
}

export function PanelRail({
  panels,
  openId,
  onOpen,
}: {
  panels: PanelDefinition[];
  openId: string | null;
  onOpen: (id: string | null) => void;
}) {
  if (panels.length === 0) return null;
  return (
    <nav className="rail no-print" aria-label="審議の資料">
      {panels.map((panel) => (
        <button
          key={panel.id}
          type="button"
          className="rail__item"
          aria-expanded={openId === panel.id}
          onClick={() => onOpen(openId === panel.id ? null : panel.id)}
        >
          <span className="rail__label">{panel.label}</span>
          {panel.hint ? <span className="rail__hint">{panel.hint}</span> : null}
        </button>
      ))}
    </nav>
  );
}

export function PanelSheet({
  panel,
  onClose,
}: {
  panel: PanelDefinition | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const open = panel !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Move focus into the sheet so the keyboard follows the eye, and so Esc
    // is reachable without tabbing back through the whole page.
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!panel) return null;

  return (
    <div className="sheet no-print" role="dialog" aria-modal="true" aria-label={panel.label}>
      <button
        type="button"
        className="sheet__scrim"
        aria-label="閉じる"
        tabIndex={-1}
        onClick={onClose}
      />
      <div className="sheet__body">
        <header className="sheet__head">
          <h2 className="sheet__title">{panel.label}</h2>
          <button ref={closeRef} type="button" className="sheet__close" onClick={onClose}>
            閉じる
          </button>
        </header>
        <div className="sheet__scroll">{panel.content}</div>
      </div>
    </div>
  );
}
