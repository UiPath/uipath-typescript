import { Assets } from '@uipath/uipath-typescript/assets';
import type { AssetGetResponse } from '@uipath/uipath-typescript/assets';
import { useAuth } from '../../hooks/useAuth';
import { GetByNameForm } from '../shared/GetByNameForm';

interface Props {
  name: string;
  folderPath: string;
  folderKey: string;
  onNameChange: (v: string) => void;
  onFolderPathChange: (v: string) => void;
  onFolderKeyChange: (v: string) => void;
}

export const AssetsGetByName = (props: Props) => {
  const { sdk } = useAuth();

  return (
    <GetByNameForm<AssetGetResponse>
      {...props}
      title="assets.getByName()"
      description={
        <>
          Resolves an asset by name via the <code>X-UIPATH-FolderPath</code> /{' '}
          <code>X-UIPATH-FolderKey</code> header.
        </>
      }
      namePlaceholder="ApiKey"
      submitLabel="Get asset"
      fetch={(name, options) => new Assets(sdk).getByName(name, options)}
    />
  );
};
