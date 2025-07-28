import { EntityData } from '../data-fabric/entity';

/**
 * Result object with count functionality
 */
export interface CountableResult<T> {
  /** Array of result data */
  data: T[];
  /** Get the count of items in the result */
  count(): number;
  /** Get the data array directly */
  getData(): T[];
}

/**
 * Case definition data structure
 */
export interface CaseDefinitionData extends EntityData {
  /** Unique identifier for the case entity */
  CaseEntityId: string;
  /** Name of the case definition */
  CaseName: string;
  /** Creation timestamp */
  CreatedTime: string;
  /** ID of user who created the case definition */
  CreatedBy: string;
  /** Unique identifier for the case */
  CaseId: string;
  /** Service level agreement time in minutes */
  Sla: string;
  /** Last update timestamp */
  UpdatedTime: string;
  /** ID of user who last updated the case definition */
  UpdatedBy: string;
  /** Version number */
  Version: string;
}

/**
 * State definition data structure
 */
export interface StateDefinitionData extends EntityData {
  /** Reference to the case definition */
  CaseDefId: string;
  /** Whether this is a final stage */
  IsFinalStage: boolean;
}

/**
 * Case definition instance with associated methods
 */
export interface CaseDefinition {
  /** 
   * Get active cases for this definition 
   * @returns Countable result object with active cases
   */
  getActiveCases(): Promise<CountableResult<any>>;
  
  /** 
   * Get SLA breaches for this definition 
   * @returns Countable result object with SLA breach cases
   */
  getSLABreaches(): Promise<CountableResult<any>>;
}

/**
 * Chainable operation that can be executed
 */
export interface CaseDefinitionOperation<T> {
  /** Execute the operation */
  execute(): Promise<T>;
} 