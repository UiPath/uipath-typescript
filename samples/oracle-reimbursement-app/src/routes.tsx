import type { ReactElement } from 'react';
import { Guarded } from './components/ui/ui-base';
import { IntermediateLoadingPage } from './pages/IntermediateLoadingPage';
import { LaunchPage } from './pages/LaunchPage';
import { MainPage } from './pages/MainPage';
import { ItemSelectionPage } from './pages/ItemSelectionPage';

/** Authored page name -> route path. */
export const ROUTES: Record<string, string> = {
  "IntermediateLoadingPage": "/intermediateloadingpage",
  "LaunchPage": "/",
  "MainPage": "/mainpage",
  "ItemSelectionPage": "/itemselectionpage",
};

/** The page the app opens on — Apps' start page. */
export const START_PATH = "/";

/**
 * Whether an inner page may be opened DIRECTLY — a pasted or bookmarked URL, or a reload
 * while on it.
 *
 * Off (the default): a cold load anywhere but the start page goes to the start page first,
 * as Apps does — Apps has one URL for the whole app, so a reload always restarts there.
 * The app's variables live in memory and the start page's load rules fill them; a page
 * opened directly ran without them, and one app then chose its PROD entity because the
 * runtime variable it read was blank. On: deep links work, the back button and shared
 * links land on the page itself — and every page has to cope with being the first shown.
 */
export const DEEP_LINKS = false;

export const ROUTE_ELEMENTS: { path: string; element: ReactElement }[] = [
  { path: "/intermediateloadingpage", element: <Guarded ctl="IntermediateLoadingPage"><IntermediateLoadingPage /></Guarded> },
  { path: "/", element: <Guarded ctl="LaunchPage"><LaunchPage /></Guarded> },
  { path: "/mainpage", element: <Guarded ctl="MainPage"><MainPage /></Guarded> },
  { path: "/itemselectionpage", element: <Guarded ctl="ItemSelectionPage"><ItemSelectionPage /></Guarded> },
];

/**
 * Authored page name -> its component, for pages EMBEDDED rather than navigated
 * to. A page container hosts another page inline (a tab panel is the common
 * case), so it needs the component, not a route.
 */
export const PAGES: Record<string, () => ReactElement> = {
  "IntermediateLoadingPage": () => <IntermediateLoadingPage />,
  "LaunchPage": () => <LaunchPage />,
  "MainPage": () => <MainPage />,
  "ItemSelectionPage": () => <ItemSelectionPage />,
};
