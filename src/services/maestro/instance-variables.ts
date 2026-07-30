import { InstanceGetVariablesOptions, InstanceGetVariablesResponse, GlobalVariableMetaData } from '../../models/maestro/instance-variables.types';
import { BpmnVariableMetadata, RawInstanceGetVariablesResponse } from '../../models/maestro/instance-variables.internal-types';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';
import { createHeaders } from '../../utils/http/headers';
import { FOLDER_KEY, CONTENT_TYPES } from '../../utils/constants/headers';
import { PaginationServiceAccess } from '../../utils/pagination/internal-types';

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
  serviceAccess: PaginationServiceAccess,
  instanceId: string,
  folderKey: string,
  options?: InstanceGetVariablesOptions
): Promise<InstanceGetVariablesResponse> {
  // Fetch the BPMN XML to get variable metadata
  let variableMetadata = new Map<string, BpmnVariableMetadata>();

  try {
    const bpmnResponse = await serviceAccess.get<string>(MAESTRO_ENDPOINTS.INSTANCES.GET_BPMN(instanceId), {
      headers: createHeaders({
        [FOLDER_KEY]: folderKey,
        'Accept': CONTENT_TYPES.XML
      })
    });
    variableMetadata = parseBpmnVariables(bpmnResponse.data);
  } catch (error) {
    console.warn(`Failed to fetch BPMN metadata for instance ${instanceId} :`, error);
  }

  // Fetch the variables
  const queryParams = options?.parentElementId ? { parentElementId: options.parentElementId } : undefined;

  const response = await serviceAccess.get<RawInstanceGetVariablesResponse>(MAESTRO_ENDPOINTS.INSTANCES.GET_VARIABLES(instanceId), {
    headers: createHeaders({ [FOLDER_KEY]: folderKey }),
    params: queryParams
  });

  // Transform the globals object to include metadata from BPMN
  const enrichedGlobalVariables = transformGlobalVariables(response.data.globals, variableMetadata);

  return {
    elements: response.data.elements,
    globalVariables: enrichedGlobalVariables,
    instanceId: response.data.instanceId,
    parentElementId: response.data.parentElementId
  };
}
