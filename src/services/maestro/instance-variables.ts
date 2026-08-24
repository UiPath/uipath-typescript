import { InstanceGetVariablesOptions, InstanceGetVariablesResponse, GlobalVariableMetaData } from '../../models/maestro/instance-variables.types';
import { BpmnVariableMetadata, RawInstanceGetVariablesResponse } from '../../models/maestro/instance-variables.internal-types';
import { RequestSpec } from '../../models/common/request-spec';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';
import { createHeaders } from '../../utils/http/headers';
import { FOLDER_KEY, CONTENT_TYPES } from '../../utils/constants/headers';

/**
 * The single authenticated-HTTP capability `fetchInstanceVariables` needs from its calling
 * service. Services pass an arrow closing over their protected `BaseService.get`, so the
 * method itself never becomes public.
 * @internal
 */
export type AuthenticatedGet = <T>(path: string, options?: RequestSpec) => Promise<{ data: T }>;

// Match both self-closing and content-bearing uipath:inputOutput elements
// Handles: <uipath:inputOutput .../> and <uipath:inputOutput ...>content</uipath:inputOutput>
const INPUT_OUTPUT_REGEX = /<uipath:inputOutput\s+([^/]+?)(?:\/(?:>)?|>[\s\S]*?<\/uipath:inputOutput>)/g;

// Regex to capture the attribute block of any BPMN element — id/name are extracted
// independently afterwards, since XML does not guarantee attribute ordering
const BPMN_ELEMENT_REGEX = /<bpmn:\w+\s+([^>]+)/g;

/**
 * Extracts element names from BPMN XML and maps them to their element IDs
 * @internal
 */
function getVariableSource(bpmnXml: string): Map<string, string> {
  const elementNameMap = new Map<string, string>();

  const elementMatches = bpmnXml.matchAll(BPMN_ELEMENT_REGEX);

  for (const match of elementMatches) {
    const attributes = match[1];
    const idMatch = attributes.match(/id="([^"]+)"/);
    const nameMatch = attributes.match(/name="([^"]+)"/);

    if (idMatch && nameMatch) {
      elementNameMap.set(idMatch[1], nameMatch[1]);
    }
  }

  return elementNameMap;
}

/**
 * Parses BPMN XML to extract variable metadata from uipath:inputOutput elements
 * @internal
 */
function parseBpmnVariables(bpmnXml: string): Map<string, BpmnVariableMetadata> {
  const variableMap = new Map<string, BpmnVariableMetadata>();
  const variableSourceMap = getVariableSource(bpmnXml);

  const inputOutputMatches = bpmnXml.matchAll(INPUT_OUTPUT_REGEX);

  for (const match of inputOutputMatches) {
    const attributes = match[1];

    // Extract attributes from the inputOutput element
    const idMatch = attributes.match(/id="([^"]+)"/);
    const nameMatch = attributes.match(/name="([^"]+)"/);
    const typeMatch = attributes.match(/type="([^"]+)"/);
    const elementIdMatch = attributes.match(/elementId="([^"]+)"/);

    if (idMatch && nameMatch && typeMatch && elementIdMatch) {
      const elementId = elementIdMatch[1];
      const sourceName = variableSourceMap.get(elementId) || elementId;

      const metadata: BpmnVariableMetadata = {
        id: idMatch[1],
        name: nameMatch[1],
        type: typeMatch[1],
        elementId: elementId,
        source: sourceName
      };

      variableMap.set(metadata.id, metadata);
    }
  }

  return variableMap;
}

/**
 * Enriches global variables with metadata from BPMN
 * @internal
 */
function transformGlobalVariables(
  globals: Record<string, unknown> | undefined,
  variableMetadata: Map<string, BpmnVariableMetadata>
): GlobalVariableMetaData[] {
  const enrichedGlobalVariables: GlobalVariableMetaData[] = [];

  if (globals && typeof globals === 'object') {
    for (const [variableId, value] of Object.entries(globals)) {
      const metadata = variableMetadata.get(variableId);

      if (metadata) {
        enrichedGlobalVariables.push({
          id: metadata.id,
          name: metadata.name,
          type: metadata.type,
          elementId: metadata.elementId,
          source: metadata.source,
          value: value
        });
      }
    }
  }

  return enrichedGlobalVariables;
}

/**
 * Fetches global variables for an instance and enriches them with metadata parsed from the
 * instance BPMN XML. Shared by ProcessInstances and CaseInstances — the endpoint and response
 * are identical for both instance kinds.
 * @internal
 */
export async function fetchInstanceVariables(
  httpGet: AuthenticatedGet,
  instanceId: string,
  folderKey: string,
  options?: InstanceGetVariablesOptions
): Promise<InstanceGetVariablesResponse> {
  const queryParams = options?.parentElementId ? { parentElementId: options.parentElementId } : undefined;

  // Fetch BPMN XML (variable metadata) and variables in parallel — BPMN failure is
  // tolerated (globals stay unenriched), a variables failure propagates to the caller
  const [bpmnResult, variablesResult] = await Promise.allSettled([
    httpGet<string>(MAESTRO_ENDPOINTS.INSTANCES.GET_BPMN(instanceId), {
      headers: createHeaders({
        [FOLDER_KEY]: folderKey,
        'Accept': CONTENT_TYPES.XML
      })
    }),
    httpGet<RawInstanceGetVariablesResponse>(MAESTRO_ENDPOINTS.INSTANCES.GET_VARIABLES(instanceId), {
      headers: createHeaders({ [FOLDER_KEY]: folderKey }),
      params: queryParams
    })
  ]);

  if (variablesResult.status === 'rejected') {
    throw variablesResult.reason;
  }
  const response = variablesResult.value;

  let variableMetadata = new Map<string, BpmnVariableMetadata>();

  try {
    if (bpmnResult.status === 'rejected') {
      throw bpmnResult.reason;
    }
    variableMetadata = parseBpmnVariables(bpmnResult.value.data);
  } catch (error) {
    console.warn(`Failed to fetch BPMN metadata for instance ${instanceId} :`, error);
  }

  // Transform the globals object to include metadata from BPMN
  const enrichedGlobalVariables = transformGlobalVariables(response.data.globals, variableMetadata);

  return {
    elements: response.data.elements,
    globalVariables: enrichedGlobalVariables,
    instanceId: response.data.instanceId,
    parentElementId: response.data.parentElementId
  };
}
