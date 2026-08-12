import { EyeOff, KeyRound, Server } from 'lucide-react';
import { Badge } from '@uipath/apollo-wind/components/ui/badge';

const STEPS = [
  {
    Icon: EyeOff,
    title: 'The browser never sees them',
    body: 'A Secret asset is omitted from the assets API entirely. Not blanked, absent.',
  },
  {
    Icon: Server,
    title: 'The function reads them',
    body: 'Only a deployed job carries the robot key that releases a Secret’s value.',
  },
  {
    Icon: KeyRound,
    title: 'You get a verdict, not a list',
    body: 'A rejected code says only that it is invalid, never how close you were.',
  },
];

/** Sets up the point of the sample before the shop appears below it. */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="hero-grid text-foreground pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="from-primary/10 pointer-events-none absolute inset-x-0 -top-32 h-64 bg-gradient-to-b to-transparent blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-14 pb-10">
        <Badge variant="secondary" className="mb-4">
          UiPath Coded Functions
        </Badge>

        <h1 className="max-w-3xl text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
          Discount codes the browser is never allowed to read
        </h1>

        <p className="text-muted-foreground mt-3 max-w-2xl text-base">
          The valid codes live in an Orchestrator <strong className="text-foreground">Secret asset</strong>.
          Checking one has to happen inside a coded function. If it ran in this page, the page
          would need the list, and anyone could read it.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ Icon, title, body }, i) => (
            <li
              key={title}
              className="bg-card/60 card-in rounded-lg border p-4 backdrop-blur"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <Icon className="text-primary mb-2 size-4" />
              <p className="text-sm font-medium">{title}</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
