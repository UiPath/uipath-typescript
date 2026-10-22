import s from './IntermediateLoadingPage.module.css';
import { PageProvider, UiPageHeading, UiPanel } from '../components/ui';
import { rootPanel_load } from './IntermediateLoadingPage.bindings';

export function IntermediateLoadingPage() {
  return (
    <PageProvider name="IntermediateLoadingPage">
        <UiPanel
          ctl="rootPanel"
          holdUntilLoaded
          className={s.rootPanel}
          onLoad={rootPanel_load}
        >
          <UiPageHeading
            ctl="Header"
            className={s.header}
            text="Updating data"
            variant="customized"
          />
        </UiPanel>
    </PageProvider>
  );
}
