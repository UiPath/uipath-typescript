import { Briefcase } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@uipath/apollo-wind/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@uipath/apollo-wind/components/ui/card';
import { EmptyState } from '@uipath/apollo-wind/components/ui/empty-state';
import { useCases } from '@/hooks/useCases';
import { ThemeToggle } from '@/components/Theme';

/** Compact case selector for the sidebar — switch which case the app is scoped to. */
export function CaseSwitcher() {
  const { allDefinitions, caseProcessKey, selectCase } = useCases();

  if (allDefinitions.length === 0) {
    return (
      <div className="rounded-lg border px-2.5 py-2 text-sm text-muted-foreground">No cases available</div>
    );
  }

  return (
    <Select value={caseProcessKey} onValueChange={selectCase}>
      <SelectTrigger className="w-full" aria-label="Select case">
        <SelectValue placeholder="Select a case" />
      </SelectTrigger>
      <SelectContent>
        {allDefinitions.map((d) => (
          <SelectItem key={d.processKey} value={d.processKey}>
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Full-screen prompt shown when the tenant has cases but none is selected yet. */
export function CasePickerScreen() {
  const { allDefinitions, selectCase } = useCases();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      {allDefinitions.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-8 w-8 text-muted-foreground" />}
          title="No cases found"
          description="This tenant has no Maestro case processes, or your account can't access them."
        />
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Briefcase className="h-6 w-6" />
            </div>
            <CardTitle>Choose a case</CardTitle>
            <CardDescription>Pick the Maestro case to manage. You can switch anytime from the sidebar.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {allDefinitions.map((d) => (
                <li key={d.processKey}>
                  <button
                    type="button"
                    onClick={() => selectCase(d.processKey)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left hover:opacity-80"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{d.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{d.folderName}</span>
                    </span>
                    <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
