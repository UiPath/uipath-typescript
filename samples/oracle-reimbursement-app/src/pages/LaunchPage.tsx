import s from './LaunchPage.module.css';
import { PageProvider, UiImage, UiPageHeading, UiPanel } from '../components/ui';
import { rootPanel_load } from './LaunchPage.bindings';
import { assetUrl, currentUser } from '../lib/runtime';

export function LaunchPage() {
  return (
    <PageProvider name="LaunchPage">
        <UiPanel
          ctl="rootPanel"
          holdUntilLoaded
          className={s.rootPanel}
          onLoad={rootPanel_load}
        >
          <UiPageHeading
            ctl="Header"
            className={s.header}
            text={"Welcome to Miles " + String(currentUser<string>("DisplayName") ?? "") + ", the Oracle Research Finance App"}
            variant="customized"
          />
          <UiImage
            ctl="Image_Logo"
            className={s.imageLogo}
            text="Image"
            url={assetUrl("App_Logo")}
          />
        </UiPanel>
    </PageProvider>
  );
}
