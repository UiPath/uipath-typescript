import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataTableWidget } from './widgets/DataTableWidget';
import { TestRenderDataWidget } from './widgets/TestRenderDataWidget';

// =============================================================================
// WIDGET HOST - Serves React components via URL
// =============================================================================
// This app hosts the ui components and makes them accessible via URL.
// MCP servers can then use the 'externalUrl' content type to embed these
// widgets in MCP-UI clients.
//
// Example URLs:
//   /widgets/task-list?tasks=[...]&title=My%20Tasks
//   /widgets/user-card?user={...}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* UiPath UI Widgets - from uipath-ui-widgets package */}
        <Route path="/widgets/datatable" element={<DataTableWidget />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
