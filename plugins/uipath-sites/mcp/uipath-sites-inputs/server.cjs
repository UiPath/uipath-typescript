#!/usr/bin/env node
"use strict";

const readline = require("node:readline");

const SERVER_NAME = "uipath-sites-inputs";
const SERVER_VERSION = "0.1.0";
const DEFAULT_REDIRECT_URI = "http://localhost:5173";
const DEFAULT_SCOPES_MESSAGE =
  "Use the OAuth scopes required by the installed uipath-coded-apps skill for this app type and target services.";

let nextRequestId = 1;
let clientSupportsFormElicitation = false;
const pendingClientRequests = new Map();

const inputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    promptSummary: {
      type: "string",
      description: "Short summary of the app the user asked to build."
    },
    oauthScopes: {
      type: "string",
      description:
        "Exact OAuth scope string required by uipath-coded-apps for this app. The form will show it next to the client ID field."
    },
    redirectUri: {
      type: "string",
      description: "Redirect URI expected by the generated coded app.",
      default: DEFAULT_REDIRECT_URI
    },
    knownInputs: {
      type: "object",
      additionalProperties: true,
      description:
        "Values already supplied by the user. These are used as form defaults and are returned unchanged unless the user edits them."
    }
  }
};

function setupInputSchema(knownInputs = {}, redirectUri = DEFAULT_REDIRECT_URI, oauthScopes = DEFAULT_SCOPES_MESSAGE) {
  return {
    type: "object",
    required: [
      "appType",
      "environment",
      "appName",
      "externalClientId",
      "organizationName",
      "tenantName",
      "deploymentFolder"
    ],
    properties: {
      appType: {
        type: "string",
        description: "Choose the UiPath coded app type.",
        enum: ["Coded Web App", "Coded Action App"],
        default: knownInputs.appType || "Coded Web App"
      },
      environment: {
        type: "string",
        description: "Target UiPath environment.",
        enum: ["cloud", "staging", "alpha"],
        default: knownInputs.environment || "cloud"
      },
      appName: {
        type: "string",
        description: "UiPath coded app package/display name.",
        default: knownInputs.appName || ""
      },
      externalClientId: {
        type: "string",
        description:
          `OAuth external application client ID. It must be configured with redirect URI ${redirectUri} and scopes: ${oauthScopes}`,
        default: knownInputs.externalClientId || ""
      },
      organizationName: {
        type: "string",
        description: "UiPath organization name.",
        default: knownInputs.organizationName || knownInputs.orgName || ""
      },
      tenantName: {
        type: "string",
        description: "UiPath tenant name.",
        default: knownInputs.tenantName || "DefaultTenant"
      },
      deploymentFolder: {
        type: "string",
        description: "Folder key or folder name to resolve for publish/deploy.",
        default: knownInputs.deploymentFolder || knownInputs.folderName || knownInputs.folderKey || ""
      }
    }
  };
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function result(id, value) {
  send({ jsonrpc: "2.0", id, result: value });
}

function error(id, code, message, data) {
  send({ jsonrpc: "2.0", id, error: { code, message, data } });
}

function sendClientRequest(method, params, timeoutMs = 240000) {
  const id = `uipath-sites-${nextRequestId++}`;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingClientRequests.delete(id);
      reject(new Error("Timed out waiting for the MCP client to complete the input form."));
    }, timeoutMs);

    pendingClientRequests.set(id, {
      resolve: (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      reject: (reason) => {
        clearTimeout(timeout);
        reject(reason);
      }
    });

    send({ jsonrpc: "2.0", id, method, params });
  });
}

function textContent(text) {
  return [{ type: "text", text }];
}

function fallbackResult(reason, args = {}, diagnostic = {}) {
  const redirectUri = args.redirectUri || DEFAULT_REDIRECT_URI;
  const oauthScopes = args.oauthScopes || DEFAULT_SCOPES_MESSAGE;
  const fallbackPrompt = [
    "MCP form input is unavailable for this Codex runtime.",
    "Ask the user for these setup inputs before writing files or running commands:",
    "1. App type: Coded Web App or Coded Action App",
    "2. UiPath environment: cloud, staging, or alpha",
    "3. App name",
    "4. External client ID",
    `   - Required redirect URI: ${redirectUri}`,
    `   - Required scopes: ${oauthScopes}`,
    "5. Organization name",
    "6. Tenant name",
    "7. Deployment folder key or folder name"
  ].join("\n");

  return {
    content: textContent(`${reason}\n\n${fallbackPrompt}`),
    structuredContent: {
      status: "fallback_required",
      reason,
      diagnostic,
      redirectUri,
      oauthScopes,
      fallbackPrompt
    },
    isError: false
  };
}

function getElicitationData(elicitationResult) {
  if (!elicitationResult || elicitationResult.action !== "accept") {
    return null;
  }

  // Wire-level MCP currently uses `content`, while some SDK helpers expose
  // accepted form values as `data`. Accept both so client/server version
  // differences do not force a fallback after a successful form submission.
  if (elicitationResult.content && typeof elicitationResult.content === "object") {
    return elicitationResult.content;
  }
  if (elicitationResult.data && typeof elicitationResult.data === "object") {
    return elicitationResult.data;
  }
  return null;
}

function resultDiagnostic(elicitationResult) {
  if (!elicitationResult || typeof elicitationResult !== "object") {
    return { resultType: typeof elicitationResult };
  }

  return {
    action: elicitationResult.action || null,
    topLevelKeys: Object.keys(elicitationResult),
    contentKeys:
      elicitationResult.content && typeof elicitationResult.content === "object"
        ? Object.keys(elicitationResult.content)
        : [],
    dataKeys:
      elicitationResult.data && typeof elicitationResult.data === "object"
        ? Object.keys(elicitationResult.data)
        : []
  };
}

function normalizedInputs(content, args) {
  const redirectUri = args.redirectUri || DEFAULT_REDIRECT_URI;
  const oauthScopes = args.oauthScopes || DEFAULT_SCOPES_MESSAGE;

  return {
    appType: content.appType,
    environment: content.environment,
    appName: content.appName,
    externalClientId: content.externalClientId,
    organizationName: content.organizationName,
    tenantName: content.tenantName,
    deploymentFolder: content.deploymentFolder,
    redirectUri,
    oauthScopes
  };
}

async function collectUiPathCodedAppInputs(args = {}) {
  if (!clientSupportsFormElicitation) {
    return fallbackResult("The MCP client did not advertise form elicitation support.", args);
  }

  const redirectUri = args.redirectUri || DEFAULT_REDIRECT_URI;
  const oauthScopes = args.oauthScopes || DEFAULT_SCOPES_MESSAGE;
  const knownInputs = args.knownInputs && typeof args.knownInputs === "object" ? args.knownInputs : {};
  const appSummary = args.promptSummary ? `\n\nApp request: ${args.promptSummary}` : "";

  let elicitationResult;
  try {
    elicitationResult = await sendClientRequest("elicitation/create", {
      mode: "form",
      message:
        "Provide UiPath coded-app setup inputs. The client ID must already be configured with the redirect URI and scopes shown in the form." +
        appSummary,
      requestedSchema: setupInputSchema(knownInputs, redirectUri, oauthScopes)
    });
  } catch (cause) {
    return fallbackResult(cause.message || "The MCP input form could not be completed.", args);
  }

  const elicitationData = getElicitationData(elicitationResult);

  if (!elicitationData) {
    return fallbackResult(
      "The MCP input form was cancelled, declined, or returned no accepted form data.",
      args,
      resultDiagnostic(elicitationResult)
    );
  }

  const inputs = normalizedInputs(elicitationData, args);

  return {
    content: textContent(
      "Collected UiPath coded-app setup inputs. Use structuredContent.inputs as the initial setup gate result before generating files."
    ),
    structuredContent: {
      status: "complete",
      inputs,
      nextSteps: [
        "Continue with uipath-coded-apps instructions.",
        "Use these inputs consistently in uipath.json, local verification, pack, publish, and deploy.",
        "Do not ask the user for these same setup values again unless validation fails."
      ]
    },
    isError: false
  };
}

function listTools() {
  return {
    tools: [
      {
        name: "collect_uipath_coded_app_inputs",
        title: "Collect UiPath coded-app setup inputs",
        description:
          "Collect the mandatory UiPath Sites setup inputs through MCP form elicitation before coded-app generation starts. Falls back with a normal chat prompt if form elicitation is unavailable.",
        inputSchema,
        outputSchema: {
          type: "object",
          additionalProperties: true,
          properties: {
            status: { type: "string", enum: ["complete", "fallback_required"] },
            inputs: { type: "object", additionalProperties: true },
            fallbackPrompt: { type: "string" }
          }
        },
        annotations: {
          title: "Collect UiPath setup inputs",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false
        }
      }
    ]
  };
}

async function handleRequest(message) {
  const { id, method, params } = message;

  switch (method) {
    case "initialize": {
      const clientCapabilities = params && params.capabilities ? params.capabilities : {};
      clientSupportsFormElicitation = Boolean(
        clientCapabilities.elicitation && clientCapabilities.elicitation.form
      );

      result(id, {
        protocolVersion: params && params.protocolVersion ? params.protocolVersion : "2025-06-18",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION
        },
        instructions:
          "Use collect_uipath_coded_app_inputs at the start of a matched UiPath Sites coded-app flow. If it returns fallback_required, ask the fallbackPrompt in normal Codex chat."
      });
      return;
    }
    case "ping":
      result(id, {});
      return;
    case "tools/list":
      result(id, listTools());
      return;
    case "tools/call": {
      if (!params || params.name !== "collect_uipath_coded_app_inputs") {
        error(id, -32602, `Unknown tool: ${params && params.name ? params.name : "<missing>"}`);
        return;
      }

      const toolResult = await collectUiPathCodedAppInputs(params.arguments || {});
      result(id, toolResult);
      return;
    }
    default:
      error(id, -32601, `Method not found: ${method}`);
  }
}

function handleClientResponse(message) {
  const pending = pendingClientRequests.get(message.id);
  if (!pending) {
    return false;
  }

  pendingClientRequests.delete(message.id);
  if (message.error) {
    pending.reject(new Error(message.error.message || "MCP client returned an error."));
  } else {
    pending.resolve(message.result);
  }
  return true;
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity
});

rl.on("line", (line) => {
  if (!line.trim()) {
    return;
  }

  let message;
  try {
    message = JSON.parse(line);
  } catch (cause) {
    error(null, -32700, "Parse error", { cause: cause.message });
    return;
  }

  if (message.id !== undefined && !message.method && handleClientResponse(message)) {
    return;
  }

  if (!message.method) {
    return;
  }

  if (message.id === undefined || message.id === null) {
    return;
  }

  handleRequest(message).catch((cause) => {
    error(message.id, -32603, cause.message || "Internal error");
  });
});
