'use client';

import { vi } from '@tripflix/i18n';
import { useState } from 'react';

export function ChooseTrip() {
  const [isSelected, setSelected] = useState(false);
  const copy = vi.demo.web;
  return (
    <div>
      <button className="primary-button full-width" onClick={() => setSelected(true)}>
        {isSelected ? copy.selected : copy.choose}
        <span aria-hidden="true">↗</span>
      </button>
      {isSelected && <output className="selection-notice">{copy.selectedBody}</output>}
    </div>
  );
}
