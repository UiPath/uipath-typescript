import {
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import type { UiPath } from '@uipath/uipath-typescript/core'
import { UiPathError } from '@uipath/uipath-typescript/core'
import {
  Connectors,
  Elements,
  execute,
  type ConnectionGetResponse,
  type ConnectorGetResponse,
  type ElementActivity,
  type ElementMethodParameter,
  type ElementObjectMetadataResponse,
  type ExecuteResult,
} from '@uipath/uipath-typescript/connections'
import { useEffect, useMemo, useState } from 'react'
import {
  bodyFieldsFor,
  coerce,
  hasRequestBody,
  resolveMethod,
  stateColor,
} from './connections'

interface ConnectorsPageProps {
  uipathSdk: UiPath
}

type Level = 'connectors' | 'detail' | 'activity'

/**
 * Which kind of folder reference the user is supplying.
 *
 * The Connections API accepts a folder key *or* a folder path, and the SDK
 * forwards every folder field it is given, leaving precedence to the server.
 * Holding the mode alongside a single value makes "exactly one of them" true
 * by construction rather than something the UI has to validate.
 */
type FolderScopeMode = 'key' | 'path'

const FOLDER_SCOPE_LABELS: Record<FolderScopeMode, string> = {
  key: 'Folder key',
  path: 'Folder path',
}

const FOLDER_SCOPE_PLACEHOLDERS: Record<FolderScopeMode, string> = {
  key: '00000000-0000-0000-0000-000000000000',
  path: 'Shared/Finance',
}

const DEFAULT_FOLDER_KEY: string | undefined = import.meta.env
  .VITE_UIPATH_FOLDER_KEY
const DEFAULT_FOLDER_PATH: string | undefined = import.meta.env
  .VITE_UIPATH_FOLDER_PATH

/** Every SDK call here surfaces its message to the user, so normalize once. */
function messageOf(err: unknown, fallback: string): string {
  if (err instanceof UiPathError || err instanceof Error) return err.message
  return fallback
}

function ConnectorsPage({ uipathSdk }: ConnectorsPageProps) {
  const connectorsService = useMemo(() => new Connectors(uipathSdk), [uipathSdk])
  const elementsService = useMemo(() => new Elements(uipathSdk), [uipathSdk])

  const [level, setLevel] = useState<Level>('connectors')

  // ---- Connectors list ----
  const [connectors, setConnectors] = useState<ConnectorGetResponse[]>([])
  const [loadingConnectors, setLoadingConnectors] = useState(true)
  const [connectorsError, setConnectorsError] = useState<string | null>(null)
  const [connectorFilter, setConnectorFilter] = useState('')

  // ---- Folder scope (required; a key or a path, never both) ----
  // A key wins when both env defaults are set, matching the field order below.
  const [folderMode, setFolderMode] = useState<FolderScopeMode>(
    !DEFAULT_FOLDER_KEY && DEFAULT_FOLDER_PATH ? 'path' : 'key',
  )
  const [folderValue, setFolderValue] = useState<string>(
    DEFAULT_FOLDER_KEY ?? DEFAULT_FOLDER_PATH ?? '',
  )

  // ---- Selected connector detail ----
  const [connector, setConnector] = useState<ConnectorGetResponse | null>(null)
  const [connections, setConnections] = useState<ConnectionGetResponse[]>([])
  const [activities, setActivities] = useState<ElementActivity[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('')
  const [activityFilter, setActivityFilter] = useState('')

  // ---- Selected activity form ----
  const [activity, setActivity] = useState<ElementActivity | null>(null)
  const [activityMeta, setActivityMeta] =
    useState<ElementObjectMetadataResponse | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [rawBody, setRawBody] = useState('')
  const [showOptionalBody, setShowOptionalBody] = useState(false)
  const [snippetCopied, setSnippetCopied] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<ExecuteResult | null>(null)
  const [execError, setExecError] = useState<string | null>(null)

  // The single source of folder scope for every call and the code snippet.
  // Exactly one of folderKey / folderPath is ever present.
  const folderScope = useMemo(() => {
    const value = folderValue.trim()
    if (!value) return null
    return folderMode === 'key'
      ? ({ folderKey: value } as const)
      : ({ folderPath: value } as const)
  }, [folderMode, folderValue])

  const folderLabel = FOLDER_SCOPE_LABELS[folderMode]

  // Fetch all connectors once.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoadingConnectors(true)
        const all = await connectorsService.getAll()
        if (!cancelled) setConnectors(all)
      } catch (err) {
        console.error('Failed to fetch connectors:', err)
        if (!cancelled) {
          setConnectorsError(messageOf(err, 'Failed to load connectors'))
        }
      } finally {
        if (!cancelled) setLoadingConnectors(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [connectorsService])

  const openConnector = async (c: ConnectorGetResponse) => {
    // The grid disables its cards without a folder scope; this is the guard
    // for the programmatic path.
    if (!folderScope) return
    setConnector(c)
    setLevel('detail')
    setConnections([])
    setActivities([])
    setSelectedConnectionId('')
    setActivityFilter('')
    setDetailError(null)
    setLoadingDetail(true)
    try {
      const [conns, acts] = await Promise.all([
        connectorsService.getConnections(c.key, {
          ...folderScope,
          pageSize: 100,
        }),
        elementsService.getActivities(c.key),
      ])
      setConnections(conns)
      setActivities(acts.filter((a) => !a.trigger && !a.isTrigger))
      if (conns.length > 0) setSelectedConnectionId(conns[0].id)
    } catch (err) {
      console.error('Failed to load connector detail:', err)
      setDetailError(
        messageOf(err, 'Failed to load connections / activities'),
      )
    } finally {
      setLoadingDetail(false)
    }
  }

  const openActivity = async (a: ElementActivity) => {
    setActivity(a)
    setLevel('activity')
    setActivityMeta(null)
    setFormValues({})
    setRawBody('')
    setShowOptionalBody(false)
    setSnippetCopied(false)
    setResult(null)
    setExecError(null)
    setMetaError(null)

    if (!connector || !a.objectName) return
    setLoadingMeta(true)
    try {
      const meta = await elementsService.getObjectMetadata(
        connector.key,
        a.objectName,
        { hydrateParameters: true },
      )
      setActivityMeta(meta)
      // Seed defaults.
      const { def } = resolveMethod(meta, a)
      const seed: Record<string, string> = {}
      for (const p of def?.parameters ?? []) {
        if (p.defaultValue !== undefined && p.defaultValue !== null) {
          seed[p.name] = String(p.defaultValue)
        }
      }
      setFormValues(seed)
    } catch (err) {
      console.error('Failed to load activity metadata:', err)
      setMetaError(messageOf(err, 'Failed to load activity inputs'))
    } finally {
      setLoadingMeta(false)
    }
  }

  const { verb, def } = useMemo(
    () => resolveMethod(activityMeta, activity),
    [activityMeta, activity],
  )

  const hasBody = hasRequestBody(verb)

  const parameters: ElementMethodParameter[] = useMemo(
    () =>
      (def?.parameters ?? []).filter(
        (p) => (p.type ?? '').toLowerCase() !== 'header',
      ),
    [def],
  )

  // Path / query inputs come from the method's declared parameters.
  const pathQueryParams = useMemo(
    () =>
      parameters.filter((p) => {
        const t = (p.type ?? '').toLowerCase()
        return t === 'path' || t === 'query'
      }),
    [parameters],
  )

  // Body params declared on the method — used only when the object exposes no
  // field schema to build the body form from.
  const bodyParams = useMemo(
    () =>
      parameters.filter((p) => {
        const t = (p.type ?? 'body').toLowerCase()
        return t !== 'path' && t !== 'query' && t !== 'header'
      }),
    [parameters],
  )

  // Preferred source for the body form: the object's writable field schema.
  const bodyFields = useMemo(
    () => (hasBody ? bodyFieldsFor(activityMeta, verb) : []),
    [hasBody, activityMeta, verb],
  )

  // Body inputs normalized for renderField, split so required fields render
  // up front and optional ones collapse behind a toggle.
  const bodyInputs = useMemo(
    () =>
      bodyFields.length > 0
        ? bodyFields.map((f) => ({
            name: f.name,
            label: f.displayName + (f.required ? ' *' : ''),
            dataType: f.dataType,
            required: f.required,
            helper: f.description,
          }))
        : bodyParams.map((p) => ({
            name: p.name,
            label: (p.displayName || p.name) + (p.required ? ' *' : ''),
            dataType: p.dataType,
            required: p.required,
            helper: p.description,
          })),
    [bodyFields, bodyParams],
  )
  const requiredBodyInputs = bodyInputs.filter((f) => f.required)
  const optionalBodyInputs = bodyInputs.filter((f) => !f.required)

  // The request runActivity will send, rebuilt from the form on every change.
  // Drives both the live code snippet and the actual call so they can't drift.
  const builtRequest = useMemo(() => {
    let path = activity?.objectName ?? ''
    const queryParams: Record<string, string> = {}
    const body: Record<string, unknown> = {}

    // Path & query come from the method parameters.
    for (const p of pathQueryParams) {
      const val = formValues[p.name]
      if (val === undefined || val === '') continue
      if ((p.type ?? '').toLowerCase() === 'path') {
        if (path.includes(`{${p.name}}`)) {
          path = path.replace(`{${p.name}}`, encodeURIComponent(val))
        } else {
          path += `/${encodeURIComponent(val)}`
        }
      } else {
        queryParams[p.name] = val
      }
    }

    // Body: prefer the field-schema-derived form, fall back to body params.
    if (hasBody) {
      for (const f of bodyFields.length > 0 ? bodyFields : bodyParams) {
        const val = formValues[f.name]
        if (val === undefined || val === '') continue
        body[f.name] = coerce(val, f.dataType)
      }
    }

    let finalBody: unknown = Object.keys(body).length ? body : undefined
    let rawBodyError = false
    if (hasBody && rawBody.trim()) {
      try {
        finalBody = JSON.parse(rawBody)
      } catch {
        rawBodyError = true
      }
    }

    return {
      path,
      queryParams: Object.keys(queryParams).length ? queryParams : undefined,
      body: hasBody ? finalBody : undefined,
      rawBodyError,
    }
  }, [
    activity,
    pathQueryParams,
    hasBody,
    bodyFields,
    bodyParams,
    formValues,
    rawBody,
  ])

  const codeSnippet = useMemo(() => {
    const fmt = (v: unknown, pad: string) =>
      JSON.stringify(v, null, 2).split('\n').join(`\n${pad}`)

    const opts: string[] = []
    if (builtRequest.body !== undefined) {
      opts.push(`    body: ${fmt(builtRequest.body, '    ')},`)
    }
    if (builtRequest.queryParams) {
      opts.push(`    queryParams: ${fmt(builtRequest.queryParams, '    ')},`)
    }
    if (folderScope) {
      const [field, value] = Object.entries(folderScope)[0]
      opts.push(`    ${field}: ${JSON.stringify(value)},`)
    }

    const lines = [
      `import { execute } from "@uipath/uipath-typescript/connections";`,
      ``,
    ]
    if (builtRequest.rawBodyError) {
      lines.push(
        `// Raw JSON body is not valid JSON — showing field values instead.`,
      )
    }
    lines.push(
      `const result = await execute(`,
      `  uipathSdk,`,
      `  ${JSON.stringify(selectedConnectionId || '<connection-id>')},`,
      `  ${JSON.stringify(builtRequest.path)},`,
      `  ${JSON.stringify(verb)},`,
    )
    if (opts.length > 0) {
      lines.push(`  {`, ...opts, `  },`)
    }
    lines.push(`);`)
    return lines.join('\n')
  }, [builtRequest, selectedConnectionId, verb, folderScope])

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(codeSnippet)
      setSnippetCopied(true)
      setTimeout(() => setSnippetCopied(false), 1500)
    } catch (err) {
      // Clipboard unavailable (e.g. insecure context) — leave the label as-is.
      console.warn('Copy to clipboard failed:', err)
    }
  }

  const runActivity = async () => {
    if (!activity?.objectName) return
    if (!folderScope) {
      setExecError(`A ${folderLabel.toLowerCase()} is required to execute.`)
      return
    }
    if (!selectedConnectionId) {
      setExecError('Select a connection to execute against.')
      return
    }
    if (hasBody && bodyFields.length > 0) {
      const missing = bodyFields
        .filter((f) => f.required)
        .filter((f) => {
          const v = formValues[f.name]
          return v === undefined || v === ''
        })
      if (missing.length > 0) {
        setExecError(
          `Missing required field(s): ${missing
            .map((f) => f.displayName)
            .join(', ')}`,
        )
        return
      }
    }
    if (builtRequest.rawBodyError) {
      setExecError('Raw JSON body is not valid JSON.')
      return
    }
    setExecuting(true)
    setExecError(null)
    setResult(null)

    try {
      const res = await execute(
        uipathSdk,
        selectedConnectionId,
        builtRequest.path,
        verb,
        {
          body: builtRequest.body,
          queryParams: builtRequest.queryParams,
          ...folderScope,
        },
      )
      // execute() resolves for non-2xx too — `res.ok` / `res.status` carry the
      // connector's own error, which is exactly what we want to render.
      setResult(res)
    } catch (err) {
      console.error('Activity execution failed:', err)
      setExecError(messageOf(err, 'Execution failed'))
    } finally {
      setExecuting(false)
    }
  }

  const filteredConnectors = useMemo(() => {
    const q = connectorFilter.trim().toLowerCase()
    if (!q) return connectors
    return connectors.filter(
      (c) => c.name.toLowerCase().includes(q) || c.key.toLowerCase().includes(q),
    )
  }, [connectors, connectorFilter])

  const filteredActivities = useMemo(() => {
    const q = activityFilter.trim().toLowerCase()
    if (!q) return activities
    return activities.filter(
      (a) =>
        (a.displayName ?? a.name).toLowerCase().includes(q) ||
        (a.objectName ?? '').toLowerCase().includes(q),
    )
  }, [activities, activityFilter])

  // Renders one form input (checkbox / number / text) bound to formValues.
  const renderField = (field: {
    name: string
    label: string
    dataType?: string
    required?: boolean
    helper?: string
  }) => {
    const dt = (field.dataType ?? 'string').toLowerCase()
    if (dt === 'boolean') {
      return (
        <FormControlLabel
          key={field.name}
          control={
            <Checkbox
              checked={formValues[field.name] === 'true'}
              onChange={(e) =>
                setFormValues((v) => ({
                  ...v,
                  [field.name]: e.target.checked ? 'true' : 'false',
                }))
              }
            />
          }
          label={field.label}
        />
      )
    }
    const isNumber =
      dt === 'integer' || dt === 'number' || dt === 'long' || dt === 'double'
    return (
      <TextField
        key={field.name}
        size="small"
        fullWidth
        type={isNumber ? 'number' : 'text'}
        label={field.label}
        required={field.required}
        value={formValues[field.name] ?? ''}
        onChange={(e) =>
          setFormValues((v) => ({ ...v, [field.name]: e.target.value }))
        }
        helperText={field.helper || undefined}
        sx={{ mb: 1.5 }}
      />
    )
  }

  return (
    <>
      {/* ---------- LEVEL 1: CONNECTORS GRID ---------- */}
      {level === 'connectors' && (
        <div className="connectors-panel">
          <div className="connectors-toolbar">
            <TextField
              size="small"
              placeholder="Search connectors…"
              value={connectorFilter}
              onChange={(e) => setConnectorFilter(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
            />
            <div className="folder-scope">
              <ToggleButtonGroup
                size="small"
                exclusive
                value={folderMode}
                aria-label="Folder reference type"
                onChange={(_, next: FolderScopeMode | null) => {
                  // `exclusive` yields null when the active button is clicked
                  // again — keep the current mode rather than clearing it.
                  if (!next || next === folderMode) return
                  setFolderMode(next)
                  // A key is never a valid path, so start the other one clean.
                  setFolderValue('')
                }}
                sx={{ height: 40 }}
              >
                <ToggleButton value="key">Key</ToggleButton>
                <ToggleButton value="path">Path</ToggleButton>
              </ToggleButtonGroup>
              <TextField
                size="small"
                required
                error={!folderScope}
                label={folderLabel}
                placeholder={FOLDER_SCOPE_PLACEHOLDERS[folderMode]}
                helperText={
                  folderScope
                    ? `Connections are scoped to this ${folderLabel.toLowerCase()}.`
                    : `Required — supply a ${folderLabel.toLowerCase()} to browse connections.`
                }
                value={folderValue}
                onChange={(e) => setFolderValue(e.target.value)}
                sx={{ minWidth: 300 }}
              />
            </div>
          </div>

          {loadingConnectors ? (
            <div className="loading-container">
              <div className="loading-spinner" />
              <div className="loading-text">Loading connectors…</div>
            </div>
          ) : connectorsError ? (
            <div className="connectors-error">{connectorsError}</div>
          ) : filteredConnectors.length === 0 ? (
            <div className="empty-state">
              <p>No connectors found.</p>
            </div>
          ) : (
            <>
              {!folderScope && (
                <div className="folder-scope-notice">
                  Enter a {folderLabel.toLowerCase()} above to open a connector —
                  connections are always looked up within a folder.
                </div>
              )}
              <div className="connector-grid">
                {filteredConnectors.map((c) => (
                  <button
                    key={c.key}
                    className="connector-card"
                    onClick={() => openConnector(c)}
                    disabled={!folderScope}
                    title={
                      folderScope
                        ? c.description
                        : `Enter a ${folderLabel.toLowerCase()} to browse this connector's connections`
                    }
                  >
                    <div className="connector-card-logo">
                      {c.image ? (
                        <img src={c.image} alt={c.name} />
                      ) : (
                        <span>{c.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="connector-card-body">
                      <span className="connector-card-name">{c.name}</span>
                      <span className="connector-card-key">{c.key}</span>
                    </div>
                    <div className="connector-card-meta">
                      {c.lifeCycleStage && (
                        <Chip
                          size="small"
                          label={c.lifeCycleStage}
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      )}
                      {typeof c.connectionCount === 'number' && (
                        <span className="connector-card-count">
                          {c.connectionCount} conn.
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------- LEVEL 2: CONNECTOR DETAIL ---------- */}
      {level === 'detail' && connector && (
        <div className="connectors-panel">
          <button className="inline-back" onClick={() => setLevel('connectors')}>
            ← All connectors
          </button>
          <div className="connector-detail-head">
            <div className="connector-card-logo small">
              {connector.image ? (
                <img src={connector.image} alt={connector.name} />
              ) : (
                <span>{connector.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h2 className="content-header-title">{connector.name}</h2>
              {connector.description && (
                <p className="connector-detail-desc">{connector.description}</p>
              )}
            </div>
          </div>

          {loadingDetail ? (
            <div className="loading-container">
              <div className="loading-spinner" />
              <div className="loading-text">
                Loading connections &amp; activities…
              </div>
            </div>
          ) : detailError ? (
            <div className="connectors-error">{detailError}</div>
          ) : (
            <div className="detail-columns">
              {/* Connections */}
              <div className="detail-col">
                <div className="detail-col-header">
                  Connections ({connections.length})
                </div>
                <div className="detail-col-scroll">
                  {connections.length === 0 ? (
                    <div className="detail-empty">
                      No connections in this folder.
                    </div>
                  ) : (
                    connections.map((conn) => (
                      <button
                        key={conn.id}
                        className={`connection-row${
                          selectedConnectionId === conn.id ? ' selected' : ''
                        }`}
                        onClick={() => setSelectedConnectionId(conn.id)}
                      >
                        <span
                          className="connection-dot"
                          style={{ background: stateColor(conn.state) }}
                        />
                        <span className="connection-name">{conn.name}</span>
                        <span className="connection-state">{conn.state}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Activities */}
              <div className="detail-col">
                <div className="detail-col-header">
                  Activities ({activities.length})
                </div>
                <div className="detail-col-toolbar">
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Search activities…"
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value)}
                  />
                </div>
                <div className="detail-col-scroll">
                  {filteredActivities.length === 0 ? (
                    <div className="detail-empty">No activities.</div>
                  ) : (
                    filteredActivities.map((a) => (
                      <button
                        key={a.name}
                        className="activity-row"
                        onClick={() => openActivity(a)}
                        disabled={!a.objectName}
                        title={
                          a.objectName
                            ? (a.description ?? '')
                            : 'No object bound — cannot build a form'
                        }
                      >
                        <div className="activity-row-main">
                          <span className="activity-name">
                            {a.displayName ?? a.name}
                          </span>
                          {a.objectName && (
                            <span className="activity-object">
                              {a.objectName}
                            </span>
                          )}
                        </div>
                        <span className="activity-arrow">→</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- LEVEL 3: ACTIVITY FORM ---------- */}
      {level === 'activity' && activity && connector && (
        <div className="connectors-panel">
          <button className="inline-back" onClick={() => setLevel('detail')}>
            ← {connector.name} activities
          </button>

          <div className="activity-form-layout">
            <div className="activity-form-main">
              <div className="connector-detail-head">
                <div className="content-header-icon">⚡</div>
                <div>
                  <h2 className="content-header-title">
                    {activity.displayName ?? activity.name}
                  </h2>
                  <p className="connector-detail-desc">
                    <Chip
                      size="small"
                      label={verb}
                      sx={{ height: 20, mr: 1, fontWeight: 600 }}
                    />
                    {activity.objectName}
                    {activity.description ? ` — ${activity.description}` : ''}
                  </p>
                </div>
              </div>

              {/* Connection selector */}
              <TextField
                select
                size="small"
                label="Connection"
                value={selectedConnectionId}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                helperText={
                  connections.length === 0
                    ? 'No connections available for this connector.'
                    : 'The connection this activity runs against.'
                }
              >
                {connections.map((conn) => (
                  <MenuItem key={conn.id} value={conn.id}>
                    {conn.name} ({conn.state})
                  </MenuItem>
                ))}
              </TextField>

              {loadingMeta ? (
                <div className="loading-container">
                  <div className="loading-spinner" />
                  <div className="loading-text">Loading inputs…</div>
                </div>
              ) : metaError ? (
                <div className="connectors-error">{metaError}</div>
              ) : (
                <form
                  className="dynamic-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    runActivity()
                  }}
                >
                  {pathQueryParams.length === 0 &&
                    bodyFields.length === 0 &&
                    bodyParams.length === 0 && (
                      <p className="dynamic-form-note">
                        This activity declares no input parameters.
                      </p>
                    )}

                  {/* Path & query parameters */}
                  {pathQueryParams.map((p) =>
                    renderField({
                      name: p.name,
                      label: (p.displayName || p.name) + (p.required ? ' *' : ''),
                      dataType: p.dataType,
                      required: p.required,
                      helper:
                        [p.type, p.description].filter(Boolean).join(' · ') ||
                        undefined,
                    }),
                  )}

                  {/* Request body — built from the object's writable field schema */}
                  {hasBody && bodyInputs.length > 0 && (
                    <>
                      <p className="dynamic-form-section">Request body</p>
                      {requiredBodyInputs.map((f) => renderField(f))}
                      {optionalBodyInputs.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="optional-fields-toggle"
                            aria-expanded={showOptionalBody}
                            onClick={() => setShowOptionalBody((s) => !s)}
                          >
                            {showOptionalBody ? '▾' : '▸'} Optional fields (
                            {optionalBodyInputs.length})
                          </button>
                          {showOptionalBody && (
                            <div className="optional-fields-body">
                              {optionalBodyInputs.map((f) => renderField(f))}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {hasBody && (
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      minRows={4}
                      label="Raw JSON body (optional — overrides fields above)"
                      placeholder='{ "key": "value" }'
                      value={rawBody}
                      onChange={(e) => setRawBody(e.target.value)}
                      sx={{ mb: 2, fontFamily: 'monospace' }}
                    />
                  )}

                  {execError && <div className="connectors-error">{execError}</div>}

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={executing || !selectedConnectionId}
                    sx={{
                      background:
                        'linear-gradient(135deg, var(--teal-600), var(--teal-700))',
                    }}
                  >
                    {executing ? (
                      <>
                        <CircularProgress
                          size={16}
                          sx={{ mr: 1, color: 'white' }}
                        />
                        Executing…
                      </>
                    ) : (
                      `Execute ${verb}`
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Code snippet panel — mirrors the execute() call in realtime */}
            <div className="activity-code">
              <div className="detail-col-header activity-code-header">
                Code snippet
                <button
                  type="button"
                  className="code-copy-btn"
                  onClick={copySnippet}
                >
                  {snippetCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="activity-code-body">
                <pre className="code-snippet">{codeSnippet}</pre>
              </div>
            </div>

            {/* Result panel */}
            <div className="activity-result">
              <div className="detail-col-header">Result</div>
              <div className="activity-result-body">
                {!result ? (
                  <div className="detail-empty">
                    Run the activity to see the response.
                  </div>
                ) : (
                  <>
                    <div className={`result-status ${result.ok ? 'ok' : 'err'}`}>
                      {result.status} {result.statusText}
                    </div>
                    <pre className="result-json">
                      {typeof result.body === 'string'
                        ? result.body
                        : JSON.stringify(result.body, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ConnectorsPage
