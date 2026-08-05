// Recently-viewed cases — tracks the cases THIS user actually opened
// (localStorage), so the app never has to enumerate every case to show "recent".
const KEY = 'uipath_recent_cases';

export interface RecentCase {
  instanceId: string;
  folderKey: string;
  label: string;
  at: number;
}

export function getRecentCases(): RecentCase[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentCase[]) : [];
  } catch {
    return [];
  }
}

export function addRecentCase(c: Omit<RecentCase, 'at'>): void {
  try {
    const list = getRecentCases().filter((x) => x.instanceId !== c.instanceId);
    list.unshift({ ...c, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8)));
    window.dispatchEvent(new Event('recent-cases-changed'));
  } catch {
    /* ignore */
  }
}
