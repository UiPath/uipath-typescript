import { useState, useEffect, useRef, ChangeEvent } from 'react';
import './Form.css';
import { Theme, MessageSeverity } from '@uipath/coded-action-app';
import type { AssetGetResponse } from '@uipath/uipath-typescript/assets';
import type { PaginatedResponse, PaginationCursor } from '@uipath/uipath-typescript';
import type {
  ReadCredentialInput,
  ReadCredentialOutput,
  FUNCTION_NAMES as ContractFunctionNames,
} from '../../coded-functions/lib/contract';
import uipath from '../uipath';
import themeToggler from '../assets/themeToggler.png';

// Page size for the asset listing. getAll() returns ONE page per call, so the loop below
// walks every page via the cursor — reading items.length after a single call under-counts.
const ASSET_PAGE_SIZE = 100;

// Fixed-width mask: deliberately not derived from the value, so the rendered placeholder
// does not leak the secret's length.
const MASK = '•'.repeat(16);

/**
 * Mirrors `FUNCTION_NAMES` from the contract.
 *
 * The contract is imported with `import type` only, so nothing crosses the project boundary at
 * build time. Annotating with `typeof` of the contract's own `as const` still makes a renamed
 * function a compile error here rather than a runtime not-found.
 */
const FUNCTION_NAMES: typeof ContractFunctionNames = {
  readCredential: 'action-app-with-functions-fn_read-credential',
};

interface FormData {
  selectedAssetName: string;
  reviewerComments: string;
}

const defaultFormData: FormData = {
  selectedAssetName: '',
  reviewerComments: '',
};

interface FormProps {
  onInitTheme: (isDark: boolean) => void;
  darkTheme: boolean;
  onToggleTheme: () => void;
}

const isDarkTheme = (theme: Theme): boolean =>
  theme === Theme.Dark || theme === Theme.DarkHighContrast;

const formatTimestamp = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

/**
 * Lists every asset in the folder. Each getAll() call returns a single page, so this walks
 * the cursor until the server reports no further pages.
 *
 * Secret assets are omitted from this listing entirely, so they cannot be offered in the
 * picker — pass such an asset's name in from the automation instead.
 */
const fetchAllAssets = async (folderId: number): Promise<AssetGetResponse[]> => {
  const collected: AssetGetResponse[] = [];
  let cursor: PaginationCursor | undefined;

  do {
    const page: PaginatedResponse<AssetGetResponse> = await uipath.assetService.getAll({
      folderId,
      pageSize: ASSET_PAGE_SIZE,
      cursor,
    });
    collected.push(...page.items);
    cursor = page.hasNextPage ? page.nextCursor : undefined;
  } while (cursor);

  return collected.sort((a, b) => a.name.localeCompare(b.name));
};

const Form = ({ onInitTheme, darkTheme, onToggleTheme }: FormProps) => {
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [folderName, setFolderName] = useState('');
  const [folderId, setFolderId] = useState<number | null>(null);

  // Asset listing state
  const [assets, setAssets] = useState<AssetGetResponse[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  // Credential resolved by the coded function
  const [credential, setCredential] = useState<ReadCredentialOutput | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [isRevealed, setIsRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const didLoadRef = useRef(false);

  // Load the task, then list the assets in the task's folder.
  // Guarded by a ref so it runs exactly once and stays StrictMode-safe.
  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;

    const init = async () => {
      try {
        const task = await uipath.codedActionAppsService.getTask();
        setIsReadOnly(task.isReadOnly);
        setFolderName(task.folderName);
        setFolderId(task.folderId);
        onInitTheme(isDarkTheme(task.theme));

        // task.data carries inputs + inOuts only — outputs are absent on first load, so
        // merge over the defaults to keep every controlled input defined.
        setFormData(
          task.data ? { ...defaultFormData, ...(task.data as Partial<FormData>) } : defaultFormData,
        );

        setIsLoadingAssets(true);
        setAssets(await fetchAllAssets(task.folderId));
      } catch (err: unknown) {
        setAssetsError(
          err instanceof Error ? err.message : 'Failed to load assets from Orchestrator.',
        );
      } finally {
        setIsLoadingAssets(false);
      }
    };

    init();
  }, [onInitTheme]);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;

  const handleAssetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (isReadOnly) return;
    const id = e.target.value === '' ? null : Number(e.target.value);
    setSelectedAssetId(id);

    // Any previously resolved credential belongs to the previous asset.
    setCredential(null);
    setResolveError(null);
    setIsRevealed(false);

    const name = assets.find((asset) => asset.id === id)?.name ?? '';
    const updated = { ...formData, selectedAssetName: name };
    setFormData(updated);
    uipath.codedActionAppsService.setTaskData(updated);
  };

  /**
   * Invokes the coded function, which resolves the asset as a robot and returns its value.
   *
   * The browser never reads the asset itself: a Credential asset's password is not in the
   * Assets API response at all, so this round trip is the only way to obtain it.
   */
  const handleResolve = async () => {
    if (!selectedAsset || folderId === null) return;
    try {
      setIsResolving(true);
      setResolveError(null);
      setIsRevealed(false);
      const result = await uipath.functionService.invoke<ReadCredentialInput, ReadCredentialOutput>(
        { name: FUNCTION_NAMES.readCredential },
        { assetName: selectedAsset.name },
        { folderId },
      );
      setCredential(result);
    } catch (err: unknown) {
      setResolveError(
        err instanceof Error ? err.message : 'The function could not resolve this asset.',
      );
    } finally {
      setIsResolving(false);
    }
  };

  const handleCommentsChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const updated = { ...formData, reviewerComments: e.target.value };
    setFormData(updated);
    uipath.codedActionAppsService.setTaskData(updated);
  };

  const handleCopy = async () => {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(credential.value);
      uipath.codedActionAppsService.showMessage('Value copied to clipboard.', MessageSeverity.Success);
    } catch {
      // Action Center's iframe can withhold clipboard permission — select the text instead.
      uipath.codedActionAppsService.showMessage(
        'Clipboard access was blocked. Reveal the value and copy it manually.',
        MessageSeverity.Warning,
      );
    }
  };

  const submitDecision = async (outcome: 'Approve' | 'Reject') => {
    try {
      setIsSubmitting(true);
      await uipath.codedActionAppsService.completeTask(outcome, formData);
    } catch (err: unknown) {
      uipath.codedActionAppsService.showMessage(
        err instanceof Error ? err.message : 'Submission failed. Please try again.',
        MessageSeverity.Error,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = () => submitDecision('Approve');
  const handleReject = () => submitDecision('Reject');

  const isFormValid = !isReadOnly && !isSubmitting && !isResolving && !!formData.selectedAssetName;

  return (
    <div className="review-app">
      <header className="review-header">
        <div className="review-header__icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3Z" />
            <circle cx="12" cy="11" r="2.2" />
            <path d="M12 13.2V16" />
          </svg>
        </div>
        <div className="review-header__titles">
          <h1 className="review-header__title">Credential Verification</h1>
          <p className="review-header__subtitle">
            Pick the Orchestrator asset holding this integration&apos;s client secret, resolve it through a coded function, then record your decision.
          </p>
        </div>
        <div className="review-header__actions">
          {isReadOnly && <span className="review-badge">Read only</span>}
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={darkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <img src={themeToggler} alt="" width={20} height={20} />
          </button>
        </div>
      </header>

      <div className="form-container form-container--enter">
        <div className="demo-warning" role="note">
          <span className="demo-warning__icon" aria-hidden="true">⚠</span>
          <span>
            <strong>Demo only.</strong> The function returns the resolved secret to the browser so
            the retrieval is visible end to end. A production reviewer app should keep the secret
            inside the function and return only a verdict — a fingerprint, or the result of a live
            token exchange.
          </span>
        </div>

        <section className="form-section">
          <h2 className="form-title">Orchestrator Asset</h2>

          {isLoadingAssets ? (
            <div className="loading-message">
              <div className="spinner"></div>
              Loading assets from Orchestrator…
            </div>
          ) : assetsError ? (
            <div className="empty-message">{assetsError}</div>
          ) : assets.length === 0 ? (
            <div className="empty-message">
              No assets found in folder &ldquo;{folderName || '—'}&rdquo;.
            </div>
          ) : (
            <>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="folderName">Orchestrator Folder</label>
                  <input id="folderName" name="folderName" value={folderName} placeholder="—" readOnly />
                </div>
                <div className="form-group">
                  <label htmlFor="assetPicker">
                    Asset <span className="req" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="assetPicker"
                    name="assetPicker"
                    value={selectedAssetId ?? ''}
                    onChange={handleAssetChange}
                    disabled={isReadOnly || isResolving}
                  >
                    <option value="">Select an asset…</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} ({asset.valueType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedAsset && (
                <div className="secret-panel">
                  <div className="secret-panel__label">
                    <span>Client Secret</span>
                    <span className="secret-panel__actions">
                      {credential ? (
                        <>
                          <button
                            type="button"
                            className="secret-btn"
                            onClick={() => setIsRevealed((r) => !r)}
                          >
                            {isRevealed ? 'Hide' : 'Reveal'}
                          </button>
                          <button type="button" className="secret-btn" onClick={handleCopy}>
                            Copy
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="secret-btn"
                          onClick={handleResolve}
                          disabled={isReadOnly || isResolving}
                        >
                          {isResolving ? 'Resolving…' : 'Resolve via function'}
                        </button>
                      )}
                    </span>
                  </div>

                  {isResolving ? (
                    <div className="loading-message">
                      <div className="spinner"></div>
                      Invoking the coded function…
                    </div>
                  ) : resolveError ? (
                    <div className="empty-message">{resolveError}</div>
                  ) : credential ? (
                    <>
                      {credential.username && (
                        <div className="form-group form-group--spaced">
                          <label htmlFor="credentialUsername">Client ID</label>
                          <input
                            id="credentialUsername"
                            name="credentialUsername"
                            value={credential.username}
                            readOnly
                          />
                        </div>
                      )}
                      <p className={`secret-value${isRevealed ? '' : ' secret-value--masked'}`}>
                        {isRevealed ? credential.value : MASK}
                      </p>
                    </>
                  ) : (
                    <div className="asset-notice">
                      A <strong>Credential</strong> asset&apos;s password and a{' '}
                      <strong>Secret</strong> asset&apos;s value are never returned by the Assets
                      API. Click <strong>Resolve via function</strong> to have the deployed{' '}
                      <code>read-credential</code> function read it as a robot and return it.
                    </div>
                  )}

                  <div className="asset-meta">
                    <span className="asset-chip">
                      <span className="asset-chip__key">Type</span>
                      {selectedAsset.valueType}
                    </span>
                    <span className="asset-chip">
                      <span className="asset-chip__key">Scope</span>
                      {selectedAsset.valueScope}
                    </span>
                    <span className="asset-chip">
                      <span className="asset-chip__key">Last modified</span>
                      {formatTimestamp(selectedAsset.lastModifiedTime)}
                    </span>
                    {credential && (
                      <span className="asset-chip">
                        <span className="asset-chip__key">Resolved</span>
                        {formatTimestamp(credential.resolvedTime)}
                      </span>
                    )}
                    {selectedAsset.description && (
                      <span className="asset-chip">
                        <span className="asset-chip__key">Description</span>
                        {selectedAsset.description}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="form-section">
          <h2 className="form-title">Reviewer Assessment</h2>
          <div className="form-group">
            <label htmlFor="reviewerComments">Reviewer Comments</label>
            <textarea
              id="reviewerComments"
              name="reviewerComments"
              value={formData.reviewerComments}
              onChange={handleCommentsChange}
              placeholder="Add your review notes…"
              rows={5}
              readOnly={isReadOnly}
            />
          </div>
        </section>
      </div>

      <div className="form-buttons">
        <button
          type="button"
          className="outcome-btn outcome-btn--secondary"
          onClick={handleReject}
          disabled={!isFormValid}
        >
          Reject
        </button>
        <button
          type="button"
          className="outcome-btn outcome-btn--primary"
          onClick={handleApprove}
          disabled={!isFormValid}
        >
          Approve
        </button>
      </div>
    </div>
  );
};

export default Form;
