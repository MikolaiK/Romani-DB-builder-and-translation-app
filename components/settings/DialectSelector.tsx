"use client";

import React from 'react';
import { useSettings, Dialect, Style } from './SettingsProvider';

export function DialectSelector() {
  const { dialect, setDialect, style, setStyle } = useSettings();
  const dOpts: Dialect[] = ['Lovari', 'Kelderash', 'Arli'];
  const sOpts: Style[] = ['Neutral', 'Formal', 'Informal'];

  return (
    <div className="flex items-center gap-2 text-xs">
      <label className="text-gray-600">Dialect:</label>
      <div className="flex gap-1">
        {dOpts.map(d => (
          <button
            key={d}
            onClick={() => setDialect(d)}
            className={`h-7 px-2 rounded border ${dialect===d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 hover:bg-gray-50'}`}
            title={`Use ${d} dialect`}
          >{d}</button>
        ))}
      </div>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <label className="text-gray-600">Style:</label>
      <select
        className="h-7 px-2 border rounded"
        value={style}
        onChange={(e) => setStyle(e.target.value as Style)}
      >
        {sOpts.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}
