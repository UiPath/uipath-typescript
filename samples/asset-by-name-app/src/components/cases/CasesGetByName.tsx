import { Cases } from '@uipath/uipath-typescript/cases';
import type { CaseGetAllResponse } from '@uipath/uipath-typescript/cases';
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

export const CasesGetByName = (props: Props) => {
  const { sdk } = useAuth();

  return (
    <GetByNameForm<CaseGetAllResponse>
      {...props}
      title="cases.getByName()"
      description={
        <>
          Client-side lookup over <code>cases.getAll()</code>. The name matches the
          derived <code>name</code> field (with <code>CaseManagement.</code> stripped
          and hyphens replaced with spaces).
        </>
      }
      helpText={
        <>
          <code>folderPath</code> is matched against the response's <code>folderName</code>
          {' '}field. Leave blank to fall back to the init-time <code>folderKey</code>
          {' '}(<code>uipath:folder-key</code> meta tag).
        </>
      }
      namePlaceholder="Onboarding Case"
      submitLabel="Get case"
      fetch={(name, options) => new Cases(sdk).getByName(name, options)}
    />
  );
};
