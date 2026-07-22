import type { ReactNode } from 'react';

interface PanelProps {
  /** CSS grid-area name; positions the panel in ReviewWorkspace's grid. */
  area: string;
  label?: string;
  children: ReactNode;
}

function Panel({ area, label, children }: PanelProps) {
  return (
    <div
      style={{ gridArea: area }}
      className="min-h-0 min-w-0 border border-gray-200 rounded overflow-hidden flex flex-col bg-white"
    >
      {label ? (
        <div className="px-2 py-1 border-b border-gray-200 text-xs font-semibold text-gray-500 shrink-0">
          {label}
        </div>
      ) : null}
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  );
}

export default Panel;
