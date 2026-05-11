import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';
import type { MaestroProcessGetAllResponse } from '@uipath/uipath-typescript/maestro-processes';
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

export const MaestroProcessesGetByName = (props: Props) => {
  const { sdk } = useAuth();

  return (
    <GetByNameForm<MaestroProcessGetAllResponse>
      {...props}
      title="maestroProcesses.getByName()"
      description={
        <>
          Client-side lookup over <code>maestroProcesses.getAll()</code> — Maestro's{' '}
          <code>/processes/summary</code> endpoint has no name-based filter, so the SDK
          fetches the list once and matches locally.
        </>
      }
      helpText={
        <>
          <code>folderPath</code> is matched against the response's <code>folderName</code>
          {' '}field. Leave blank to fall back to the init-time <code>folderKey</code>
          {' '}(<code>uipath:folder-key</code> meta tag).
        </>
      }
      namePlaceholder="MyMaestroProcess"
      submitLabel="Get process"
      fetch={(name, options) => new MaestroProcesses(sdk).getByName(name, options)}
    />
  );
};
