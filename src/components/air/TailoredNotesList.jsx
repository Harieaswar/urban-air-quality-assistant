/**
 * @fileoverview Shared tailored health advice cards for sensitive household groups.
 */

import React from 'react';

/**
 * Render tailored guidance blocks for selected sensitive family profiles.
 * @param {{ notes: Array<Object>, emptyFallback?: string }} props - Tailored advice list and optional empty message.
 * @returns {JSX.Element|null} List of advisory cards or fallback text.
 */
export default function TailoredNotesList({ notes, emptyFallback = '' }) {
  if (!notes || notes.length === 0) {
    return emptyFallback ? <p className="field-help">{emptyFallback}</p> : null;
  }
  return (
    <div className="tailored-list">
      {notes.map((note) => (
        <div key={note.id} className="tailored-item">
          <div className="tailored-item-title">
            <span aria-hidden="true">{note.icon}</span>
            <strong>{note.label}</strong>
          </div>
          <p>{note.advice}</p>
          <p className="tailored-rationale">{note.rationale}</p>
        </div>
      ))}
    </div>
  );
}
