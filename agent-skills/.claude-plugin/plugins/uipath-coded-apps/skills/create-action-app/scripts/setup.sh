#!/usr/bin/env bash
# setup.sh — Scaffolds a new UiPath coded action app (React + Vite + TypeScript)
# Usage: bash scripts/setup.sh <app-name> <routing-name> [client-id] [scopes] [sdk-needed] [tgz-path]
#
# Arguments:
#   app-name      Name of the app (used for directory and npm package name)
#   routing-name  Vite base path (e.g. loan-review-app)
#   client-id     OAuth client ID (default: "")
#   scopes        OAuth scopes (default: "")
#   sdk-needed    yes/no — whether to add @uipath/uipath-typescript (default: no)
#   tgz-path      Path to a local .tgz for @uipath/uipath-ts-coded-action-apps (default: "")
#
# Example:
#   bash scripts/setup.sh my-action-app my-action-app "" "" no
#   bash scripts/setup.sh my-action-app my-action-app abc-123 "OR.Tasks" yes /path/to/coded-action-apps.tgz

set -euo pipefail

APP_NAME="${1:?Usage: setup.sh <app-name> <routing-name> [client-id] [scopes] [sdk-needed] [tgz-path]}"
ROUTING_NAME="${2:?ERROR: Routing name is required.}"

# Validate routing name: /^[a-z0-9-]+$/, length 4-32
if ! echo "$ROUTING_NAME" | grep -qE '^[a-z0-9-]+$'; then
  echo "ERROR: Routing name '$ROUTING_NAME' is invalid. Must match /^[a-z0-9-]+$/ (lowercase letters, digits, hyphens only)."
  exit 2
fi
ROUTING_NAME_LEN=${#ROUTING_NAME}
if [ "$ROUTING_NAME_LEN" -lt 4 ] || [ "$ROUTING_NAME_LEN" -gt 32 ]; then
  echo "ERROR: Routing name '$ROUTING_NAME' has length $ROUTING_NAME_LEN. Must be between 4 and 32 characters."
  exit 2
fi

CLIENT_ID="${3:-}"
SCOPES="${4:-}"
SDK_NEEDED="${5:-no}"
TGZ_PATH="${6:-}"

# Determine the version/ref for @uipath/uipath-ts-coded-action-apps
if [ -n "$TGZ_PATH" ]; then
  CODED_APPS_REF="file:${TGZ_PATH}"
else
  CODED_APPS_REF="1.0.0-beta.1"
fi

echo ""
echo "Configuration:"
echo "  App name:     $APP_NAME"
echo "  Routing name: $ROUTING_NAME"
echo "  Client ID:    ${CLIENT_ID:-(none)}"
echo "  Scopes:       ${SCOPES:-(none)}"
echo "  SDK needed:   $SDK_NEEDED"
echo "  Coded Apps:   $CODED_APPS_REF"
echo ""

# --- Create project directory ---
echo "==> Creating project directory: $APP_NAME"
mkdir -p "$APP_NAME/src/components"

cd "$APP_NAME"

# --- package.json ---
echo "==> Writing package.json"
if [ "$SDK_NEEDED" = "yes" ]; then
cat > package.json << EOF
{
  "name": "$APP_NAME",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@uipath/uipath-ts-coded-action-apps": "$CODED_APPS_REF",
    "@uipath/uipath-typescript": "1.1.3",
    "buffer": "^6.0.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "@typescript-eslint/eslint-plugin": "^8.46.4",
    "@typescript-eslint/parser": "^8.46.4",
    "@vitejs/plugin-react": "^5.1.0",
    "dotenv": "^17.2.3",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "typescript": "^5.9.3",
    "vite": "^7.2.2",
    "vite-plugin-node-polyfills": "^0.24.0"
  }
}
EOF
else
cat > package.json << EOF
{
  "name": "$APP_NAME",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@uipath/uipath-ts-coded-action-apps": "$CODED_APPS_REF",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "@typescript-eslint/eslint-plugin": "^8.46.4",
    "@typescript-eslint/parser": "^8.46.4",
    "@vitejs/plugin-react": "^5.1.0",
    "dotenv": "^17.2.3",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "typescript": "^5.9.3",
    "vite": "^7.2.2",
    "vite-plugin-node-polyfills": "^0.24.0"
  }
}
EOF
fi

# --- index.html ---
echo "==> Writing index.html"
cat > index.html << EOF
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>$APP_NAME</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# --- vite.config.ts ---
# Use quoted heredoc for the body (no variable expansion), then echo the base: line (needs ROUTING_NAME), then close with quoted heredoc
echo "==> Writing vite.config.ts"
cat > vite.config.ts << 'EOF'
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      nodePolyfills({
        globals: { Buffer: true, global: true, process: true },
      }),
    ],
    define: {
      'import.meta.env.UIPATH_BASE_URL': JSON.stringify(env.UIPATH_BASE_URL || 'https://cloud.uipath.com'),
      'import.meta.env.UIPATH_ORG_NAME': JSON.stringify(env.UIPATH_ORG_NAME || ''),
      'import.meta.env.UIPATH_TENANT_NAME': JSON.stringify(env.UIPATH_TENANT_NAME || ''),
      'import.meta.env.UIPATH_BEARER_TOKEN': JSON.stringify(env.UIPATH_BEARER_TOKEN || ''),
    },
EOF
echo "    base: '/${ROUTING_NAME}'," >> vite.config.ts
cat >> vite.config.ts << 'EOF'
  };
});
EOF

# --- uipath.json ---
echo "==> Writing uipath.json"
cat > uipath.json << EOF
{
  "scope": "${SCOPES}",
  "clientId": "${CLIENT_ID}",
  "orgName": "",
  "tenantName": "",
  "baseUrl": "",
  "redirectUri": ""
}
EOF

# --- tsconfig.json ---
echo "==> Writing tsconfig.json"
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

# --- tsconfig.node.json ---
echo "==> Writing tsconfig.node.json"
cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["vite.config.ts", "eslint.config.js"]
}
EOF

# --- eslint.config.js ---
echo "==> Writing eslint.config.js"
cat > eslint.config.js << 'EOF'
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2020, globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  }
);
EOF

# --- src/env.d.ts ---
echo "==> Writing src/env.d.ts"
cat > src/env.d.ts << 'EOF'
/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    UIPATH_BASE_URL: string;
    UIPATH_ORG_NAME: string;
    UIPATH_TENANT_NAME: string;
    UIPATH_BEARER_TOKEN: string;
  }
}
EOF

# --- src/uipath.ts ---
echo "==> Writing src/uipath.ts"
cat > src/uipath.ts << 'EOF'
import { CodedActionApps } from '@uipath/uipath-ts-coded-action-apps';

const codedActionApps = new CodedActionApps();

export default codedActionApps;
EOF

# --- src/main.tsx ---
echo "==> Writing src/main.tsx"
cat > src/main.tsx << 'EOF'
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
EOF

# --- src/App.tsx ---
echo "==> Writing src/App.tsx"
cat > src/App.tsx << 'EOF'
import { useState, useEffect } from 'react';
import Form from './components/Form';
import './App.css';

function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <div className="app">
      <button
        type="button"
        className="theme-toggle-button"
        onClick={() => setIsDark(prev => !prev)}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? '☀️' : '🌙'}
      </button>
      <div className="container">
        <Form onInitTheme={setIsDark} />
      </div>
    </div>
  );
}

export default App;
EOF

# --- src/App.css ---
echo "==> Writing src/App.css"
cat > src/App.css << 'EOF'
.app {
  min-height: 100vh;
  padding: 2rem;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background-color: var(--bg-canvas);
}

.container {
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .app { padding: 1rem; }
}

.theme-toggle-button {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  padding: 0.4rem 0.7rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  box-shadow: var(--shadow-sm);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 500;
}

.theme-toggle-button:hover {
  background-color: var(--bg-hover);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}
EOF

# --- src/index.css ---
echo "==> Writing src/index.css"
cat > src/index.css << 'EOF'
:root {
  /* Surface layers */
  --bg-canvas:    #f0f2f5;
  --bg-card:      #ffffff;
  --bg-hover:     #f7f8fa;
  --bg-input:     #ffffff;

  /* Text */
  --text-primary:   #111827;
  --text-secondary: #6b7280;
  --text-muted:     #9ca3af;

  /* Borders */
  --border-color:  #d1d5db;
  --border-strong: #9ca3af;
  --border-focus:  #fa4616;

  /* Accent (UiPath orange) */
  --accent-color: #fa4616;
  --accent-hover: #d93c10;
  --accent-text:  #ffffff;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.10), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

[data-theme="dark"] {
  --bg-canvas:    #0f1117;
  --bg-card:      #1c1f26;
  --bg-hover:     #252830;
  --bg-input:     #1c1f26;

  --text-primary:   #f3f4f6;
  --text-secondary: #9ca3af;
  --text-muted:     #6b7280;

  --border-color:  #2e3340;
  --border-strong: #4b5563;
  --border-focus:  #ff6b47;

  --accent-color: #ff6b47;
  --accent-hover: #ff8566;
  --accent-text:  #ffffff;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  transition: background-color 0.25s ease, color 0.25s ease;
}

a {
  color: var(--accent-color);
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}
EOF

# --- .gitignore ---
echo "==> Writing .gitignore"
cat > .gitignore << 'EOF'
node_modules
dist
.env
.env.local
*.tgz
EOF

# --- npm install ---
echo "==> Installing dependencies (this may take a few minutes)"
if ! npm install; then
  echo ""
  echo "ERROR: npm install failed."
  echo "If @uipath/uipath-ts-coded-action-apps could not be resolved from the registry,"
  echo "re-run this script with the path to the local .tgz as the 6th argument:"
  echo "  bash scripts/setup.sh \"$APP_NAME\" \"$ROUTING_NAME\" \"$CLIENT_ID\" \"$SCOPES\" \"$SDK_NEEDED\" /path/to/coded-action-apps.tgz"
  exit 1
fi

echo ""
echo "==> Setup complete! Project created at ./$APP_NAME"
echo ""
echo "Next steps:"
echo "  1. Generate action-schema.json and src/components/Form.tsx"
echo "  2. cd $APP_NAME && npm run build"
echo "  3. npm run dev"
