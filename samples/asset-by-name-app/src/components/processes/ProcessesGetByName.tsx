import { Processes } from '@uipath/uipath-typescript/processes';
import type { ProcessGetResponse } from '@uipath/uipath-typescript/processes';
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

export const ProcessesGetByName = (props: Props) => {
  const { sdk } = useAuth();

  return (
    <GetByNameForm<ProcessGetResponse>
      {...props}
      title="processes.getByName()"
      description={
        <>
          Resolves a process by name via the <code>X-UIPATH-FolderPath</code> /{' '}
          <code>X-UIPATH-FolderKey</code> header.
        </>
      }
      namePlaceholder="MyProcess"
      submitLabel="Get process"
      fetch={(name, options) => new Processes(sdk).getByName(name, options)}
    />
  );
};
