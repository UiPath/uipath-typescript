import { Buckets } from '@uipath/uipath-typescript/buckets';
import type { BucketGetResponse } from '@uipath/uipath-typescript/buckets';
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

export const BucketsGetByName = (props: Props) => {
  const { sdk } = useAuth();

  return (
    <GetByNameForm<BucketGetResponse>
      {...props}
      title="buckets.getByName()"
      description={
        <>
          Resolves a bucket by name via the <code>X-UIPATH-FolderPath-Encoded</code> /{' '}
          <code>X-UIPATH-FolderKey</code> header.
        </>
      }
      namePlaceholder="MyBucket"
      submitLabel="Get bucket"
      fetch={(name, options) => new Buckets(sdk).getByName(name, options)}
    />
  );
};
