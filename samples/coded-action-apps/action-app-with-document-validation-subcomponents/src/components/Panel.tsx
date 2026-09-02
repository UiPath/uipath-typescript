import type { ReactNode } from 'react';
import './Panel.css';

interface PanelProps {
  /** CSS grid-area name; positions the panel in the workspace grid. */
  area: string;
  label?: string;
  children: ReactNode;
}

const Panel = ({ area, label, children }: PanelProps) => (
  <section className="panel" style={{ gridArea: area }}>
    {label ? <header className="panel__label">{label}</header> : null}
    <div className="panel__body">{children}</div>
  </section>
);

export default Panel;
