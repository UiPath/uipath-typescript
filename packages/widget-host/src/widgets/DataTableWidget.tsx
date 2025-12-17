// =============================================================================
// DataTable Widget - MCP-UI Wrapper for @uipath/ui-widgets-datatable
// =============================================================================
//
// PURPOSE:
// This widget wraps the DataTable React component to make it MCP-UI compatible.
// It acts as an adapter between URL parameters and React props.
//
// =============================================================================

import React, { useEffect, useState } from 'react';
import { UiPath } from 'uipath-sdk';
import { ColDef } from 'ag-grid-community';
import { getParamAsJSON, getParam, sendActionToHost } from '../utils/postMessage';

import { DataTable } from '@uipath/uipath-ui-widget';

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_CLASS_NAME = '';

// Credentials received via postMessage
interface SDKCredentials {
  baseUrl: string;
  orgName: string;
  tenantName: string;
  secret: string;
}

// MCP-UI render data message types
const MCP_UI_RENDER_DATA_TYPE = 'ui-lifecycle-iframe-render-data';

// Create the Widget component
export function DataTableWidget() {
  // Read props from URL parameters
  const entityName = getParam('entityName', '');
  const pageSize = parseInt(getParam('pageSize', String(DEFAULT_PAGE_SIZE)), 10);
  const className = getParam('className', DEFAULT_CLASS_NAME);
  const columnConfig = getParamAsJSON<Record<string, ColDef>>('columnConfig', {});

  // Read credentials from URL params (fallback for MCP hosts that don't support initial-render-data)
  const baseUrl = getParam('baseUrl', '');
  const orgName = getParam('orgName', '');
  const tenantName = getParam('tenantName', '');
  const secret = getParam('secret', '');

  const waitForRenderData = getParam('waitForRenderData', 'false') === 'true';

  // State for credentials, SDK, and loading
  const [credentials, setCredentials] = useState<SDKCredentials | null>(null);
  const [sdk, setSdk] = useState<UiPath | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get credentials from URL params, postMessage, or env vars
  useEffect(() => {
    // Wait for postMessage from MCP-UI host
    if (waitForRenderData) {
      // Listen for render data from MCP-UI host 
      function handleMessage(event: MessageEvent) {
        if (event.data?.type === MCP_UI_RENDER_DATA_TYPE) {
          const renderData = event.data?.payload?.renderData;
          if (renderData?.credentials) {
            setCredentials(renderData.credentials as SDKCredentials);
          } else {
            setError('Received render data but no credentials found.');
            setIsLoading(false);
          }
        }
      }

      window.addEventListener('message', handleMessage);
      // Notify parent that we're ready to receive render data
      window.parent.postMessage({ type: 'ui-lifecycle-iframe-ready' }, '*');

      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }

    // No credentials available
    setError('No credentials available. Pass credentials via URL params or use waitForRenderData=true for MCP-UI hosts that support initial-render-data.');
    setIsLoading(false);
  }, [baseUrl, orgName, tenantName, secret, waitForRenderData]);

  // Initialize SDK when credentials are available
  useEffect(() => {
    if (!credentials) return;

    // Capture credentials in local const to satisfy TypeScript
    const creds = credentials;

    async function initializeSDK() {
      try {
        setIsLoading(true);
        setError(null);

        // Validate credentials
        if (!creds.baseUrl || !creds.orgName || !creds.tenantName || !creds.secret) {
          throw new Error('Missing required SDK credentials. Required: baseUrl, orgName, tenantName, secret');
        }

        // Initialize UiPath SDK
        const uipath = new UiPath({
          baseUrl: creds.baseUrl,
          orgName: creds.orgName,
          tenantName: creds.tenantName,
          secret: creds.secret,
        });

        setSdk(uipath);

        // Notify host that SDK is ready
        sendActionToHost({
          type: 'SDK_INITIALIZED',
          config: {
            baseUrl: creds.baseUrl,
            orgName: creds.orgName,
            tenantName: creds.tenantName,
          },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize SDK';
        setError(errorMessage);

        // Notify host about the error
        sendActionToHost({
          type: 'SDK_ERROR',
          error: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    initializeSDK();
  }, [credentials]);

  // Render validation errors
  if (!entityName) {
    return (
      <div style={{ padding: '20px', color: '#c62828', fontFamily: 'system-ui' }}>
        <h3>Missing Required Parameter</h3>
        <p>The <code>entityName</code> parameter is required.</p>
        <p>Example: <code>/widgets/datatable?entityName=your-entity-name&waitForRenderData=true</code></p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#c62828', fontFamily: 'system-ui' }}>
        <h3>SDK Initialization Error</h3>
        <p>{error}</p>
        <details style={{ marginTop: '12px' }}>
          <summary style={{ cursor: 'pointer' }}>How credentials are provided</summary>
          <p style={{ marginTop: '8px' }}>
            Credentials are received via postMessage from the MCP-UI host, not URL parameters.
          </p>
          <p>For local development, set environment variables in <code>.env</code>:</p>
          <ul style={{ marginTop: '8px' }}>
            <li><code>VITE_UIPATH_BASE_URL</code></li>
            <li><code>VITE_UIPATH_ORG_NAME</code></li>
            <li><code>VITE_UIPATH_TENANT_NAME</code></li>
            <li><code>VITE_UIPATH_SECRET</code></li>
          </ul>
        </details>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui', textAlign: 'center' }}>
        <p>{waitForRenderData ? 'Waiting for credentials from MCP host...' : 'Initializing UiPath SDK...'}</p>
      </div>
    );
  }

  if (!sdk) {
    return (
      <div style={{ padding: '20px', color: '#c62828', fontFamily: 'system-ui' }}>
        <h3>SDK Not Available</h3>
        <p>Failed to initialize UiPath SDK.</p>
      </div>
    );
  }


  return (
    <div style={{ height: '100%', width: '100%' }}>
      <DataTable
        sdk={sdk}
        entityName={entityName}
        pageSize={pageSize}
        className={className}
        columnConfig={Object.keys(columnConfig).length > 0 ? columnConfig : undefined}
      />
    </div>
  );
}
