/**
 * @fileoverview Shared bullet list rendering attributed public data sources from assumptions.json.
 */

import React from 'react';
import assumptionsData from '@/data/assumptions.json';

/**
 * Render attributed data sources with license and purpose summary.
 * @returns {JSX.Element} Unordered list of cited sources.
 */
export default function DataSourcesList() {
  return (
    <ul className="sources-list">
      {assumptionsData.dataSources.map((src, idx) => (
        <li key={src.name || idx}>
          <strong>{src.name}</strong> ({src.license}) — {src.purpose}
        </li>
      ))}
    </ul>
  );
}
