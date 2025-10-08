import { transformData } from '../../utils/transform';
import { ProcessIncidentMap } from '../maestro/process-incidents.constants';
import type { ProcessIncidentGetResponse } from '../maestro/process-incidents.types';

/**
 * Common helper functions for BPMN processing
 */
export class BpmnHelpers {
  /**
   * Parse BPMN XML and extract element information for incidents
   */
  static parseBpmnElementsForIncidents(bpmnXml: string): Record<string, { name: string; type: string }> {
    const elementInfo: Record<string, { name: string; type: string }> = {};
    
    try {
      // First match elements that have an id attribute, then extract type and name
      const bpmnElementWithIdRegex = /<bpmn:(\w+)\s+[^>]*id="([^"]+)"[^>]*>/g;
      
      let match;
      while ((match = bpmnElementWithIdRegex.exec(bpmnXml)) !== null) {
        const [fullMatch, elementType, elementId] = match;
        
        // Extract name attribute from the full match if it exists
        const nameMatch = fullMatch.match(/name="([^"]*)"/);
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
   * Enrich incidents with BPMN data
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
   * Enrich incidents when they span multiple instances (grouping required)
   */
  private static async enrichMultipleInstanceIncidents(
    incidents: any[],
    folderKey: string,
    service: any
  ): Promise<ProcessIncidentGetResponse[]> {
    const groups = incidents.reduce((acc, incident) => {
      const id = incident.instanceId || 'no-instance';
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
   * Get BPMN element information for an instance
   */
  private static async getBpmnElementInfo(
    instanceId: string,
    folderKey: string,
    service: any
  ): Promise<Record<string, { name: string; type: string }>> {
    if (!instanceId || instanceId === 'no-instance') {
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
   * Transform incident with BPMN enrichment
   */
  private static transformIncidentWithBpmn(
    incident: any,
    elementInfo: Record<string, { name: string; type: string }>
  ): ProcessIncidentGetResponse {
    const element = elementInfo[incident.elementId];
    const transformed = transformData(incident, ProcessIncidentMap) as unknown as ProcessIncidentGetResponse;
    
    return {
      ...transformed,
      incidentElementActivityType: element?.type || 'Unknown',
      incidentElementActivityName: element?.name || 'Unknown'
    };
  }
}