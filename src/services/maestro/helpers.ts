import { NO_INSTANCE, UNKNOWN } from '../../utils/constants/common';
import { transformData } from '../../utils/transform';
import { ProcessIncidentMap } from '../../models/maestro/process-incidents.constants';
import type { ProcessIncidentGetResponse } from '../../models/maestro/process-incidents.types';

/**
* Helpers for fetching BPMN XML and extracting element details used to annotate responses
*/
export class BpmnHelpers {
  /**
   * Parse BPMN XML and extract element id → {name,type} used for incidents
   */
  static parseBpmnElementsForIncidents(bpmnXml: string): Record<string, { name: string; type: string }> {
    const elementInfo: Record<string, { name: string; type: string }> = {};
    
    try {
      // Find <bpmn:...> start tags and capture the element type.
      // Then read 'id' and 'name' attributes from each tag.
      const bpmnOpenTagRegex = /<bpmn:([A-Za-z][\w.-]*)\b[^>]*>/g;

      for (const tagMatch of bpmnXml.matchAll(bpmnOpenTagRegex)) {
        const [fullTag, elementType] = tagMatch;

        // Extract attributes from the current tag text.
        const idMatch = /\bid\s*=\s*"([^"]*)"/.exec(fullTag);
        if (!idMatch) {
          continue;
        }
        const elementId = idMatch[1];

        const nameMatch = /\bname\s*=\s*"([^"]*)"/.exec(fullTag);
        const name = nameMatch ? nameMatch[1] : '';

        // Convert BPMN element type to human-readable format
        const activityType = this.formatActivityTypeForIncidents(elementType);
        const activityName = name || elementId;

        elementInfo[elementId] = {
          type: activityType,
          name: activityName
        };
      }
    } catch (error) {
      console.warn('Failed to parse BPMN XML for incidents:', error);
    }
    
    return elementInfo;
  }

  /**
   * Format BPMN element type to human-readable activity type for incidents
   */
  static formatActivityTypeForIncidents(elementType: string): string {
    // Convert camelCase BPMN element types to human-readable format
    // e.g., "serviceTask" -> "Service Task", "exclusiveGateway" -> "Exclusive Gateway"
    return elementType
      .replace(/([A-Z])/g, ' $1') // Add space before uppercase letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim(); // Remove any leading/trailing spaces
  }

  /**
   * Fetch BPMN via getBpmn and add element name/type to each incident
   */
  static async enrichIncidentsWithBpmnData(
    incidents: any[], 
    folderKey: string,
    service: any
  ): Promise<ProcessIncidentGetResponse[]> {
    // Check if all incidents have the same instanceId
    const uniqueInstanceIds = [...new Set(incidents.map(i => i.instanceId))];

    if (uniqueInstanceIds.length === 1) {
      // Single instance optimization (in case of process instance incidents)
      const elementInfo = await this.getBpmnElementInfo(uniqueInstanceIds[0], folderKey, service);
      return incidents.map((incident: any) => 
        this.transformIncidentWithBpmn(incident, elementInfo)
      );
    } else {
      // Multiple instances optimization (in case of process incidents)
      return this.enrichMultipleInstanceIncidents(incidents, folderKey, service);
    }
  }

  /**
   * When incidents span multiple instances, fetch BPMN per instance and annotate
   */
  private static async enrichMultipleInstanceIncidents(
    incidents: any[],
    folderKey: string,
    service: any
  ): Promise<ProcessIncidentGetResponse[]> {
    const groups = incidents.reduce((acc, incident) => {
      const id = incident.instanceId || NO_INSTANCE;
      (acc[id] = acc[id] || []).push(incident);
      return acc;
    }, {} as Record<string, any[]>);

    const results = await Promise.all(
      Object.entries(groups).map(async (entry) => {
        const [instanceId, groupIncidents] = entry;
        const elementInfo = await this.getBpmnElementInfo(instanceId, folderKey, service);

        return (groupIncidents as any[]).map((incident: any) => 
          this.transformIncidentWithBpmn(incident, elementInfo)
        );
      })
    );

    return results.flat();
  }

  /**
   * Retrieve BPMN XML for an instance and derive element id → {name,type}
   */
  private static async getBpmnElementInfo(
    instanceId: string,
    folderKey: string,
    service: any
  ): Promise<Record<string, { name: string; type: string }>> {
    if (!instanceId || instanceId === NO_INSTANCE) {
      return {};
    }

    try {
      const bpmnXml = await service.getBpmn(instanceId, folderKey);
      return this.parseBpmnElementsForIncidents(bpmnXml);
    } catch (error) {
      console.warn(`Failed to get BPMN for instance ${instanceId}:`, error);
      return {};
    }
  }

  /**
   * Transform a raw incident by attaching element name/type from BPMN
   */
  private static transformIncidentWithBpmn(
    incident: any,
    elementInfo: Record<string, { name: string; type: string }>
  ): ProcessIncidentGetResponse {
    const element = elementInfo[incident.elementId];
    const transformed = transformData(incident, ProcessIncidentMap) as unknown as ProcessIncidentGetResponse;
    
    return {
      ...transformed,
      incidentElementActivityType: element?.type || UNKNOWN,
      incidentElementActivityName: element?.name || UNKNOWN
    };
  }
}