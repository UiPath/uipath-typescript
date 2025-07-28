import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { BaseService } from '../base-service';
import { EntityService } from '../data-fabric/entity';
import { CaseDefinition, CaseDefinitionData, StateDefinitionData, CountableResult } from '../../models/case/case-definition';
import { FilterOperator, LogicalOperator } from '../../models/data-fabric/entity';
import { createTransform } from '../../utils/transform';
import { TokenManager } from '../../core/auth/token-manager';

/**
 * Creates a countable result from an array
 */
function createCountableResult<T>(data: T[]): CountableResult<T> {
  return {
    data,
    count(): number {
      return this.data.length;
    },
    getData(): T[] {
      return this.data;
    }
  };
}

// Create a reusable transform function for case definitions
const transformCaseDefinition = createTransform<CaseDefinitionData>({
  Id: 'CaseId',
  CreateTime: 'CreatedTime',
  UpdateTime: 'UpdatedTime'
});

/**
 * Handles operations for a specific case definition
 */
class CaseDefinitionHandler implements CaseDefinition {
  constructor(
    private readonly definitionName: string,
    private readonly entityService: EntityService
  ) {}

  /**
   * Load the case definition data from the entity service
   */
  private async loadDefinition(): Promise<CaseDefinitionData> {
    console.log("definitionName", this.definitionName);
    // First get the case definition entity
    const response = await this.entityService.getByName<CaseDefinitionData>("CaseDefinition")
      .filter({
        operator: LogicalOperator.And,
        conditions: [
          {
            field: 'CaseName',
            operator: FilterOperator.Equals,
            value: this.definitionName
          }
        ]
      })
      .limit(1);
    console.log("response", response);
    if (!response.value?.length) {
      throw new Error(`Case definition '${this.definitionName}' not found`);
    }

    return transformCaseDefinition(response.value[0]);
  }

  /**
   * Get count of active cases for this definition
   * @returns Countable result object with active cases
   */
  async getActiveCases(): Promise<CountableResult<StateDefinitionData>> {
    const definition = await this.loadDefinition();
    console.log("definitionloaded", definition);
    // Query states that reference this case definition and are not final
    const response = await this.entityService.getById<StateDefinitionData>(definition.CaseEntityId)
      .filter({
        operator: LogicalOperator.And,
        conditions: [
          {
            field: 'StateDefinitionId.IsFinalStage',
            operator: FilterOperator.Equals,
            value: false
          }
        ],
        expansions: [
            {
                field: 'StateDefinitionId',
                select: ['id', 'name', 'isFinalStage']
              }
        ]
      });
    console.log("responseactive", response);
    return createCountableResult(response.value || []);
  }

  /**
   * Get SLA breaches for this definition
   * @returns Countable result object with SLA breach cases
   */
  async getSLABreaches(): Promise<CountableResult<StateDefinitionData>> {
    const definition = await this.loadDefinition();
    // Query states that reference this case definition and are not final
    const response = await this.entityService.getById<StateDefinitionData>(definition.CaseEntityId)
      .filter({
        operator: LogicalOperator.And,
        conditions: [
          {
            field: 'Status',
            operator: FilterOperator.Equals,
            value: 3
          }
        ]
      });
    console.log("slabreached", response);
    return createCountableResult(response.value || []);
  }
}

/**
 * Service for interacting with Case Management APIs
 */
export class CaseService extends BaseService {
  private readonly entityService: EntityService;

  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
    this.entityService = new EntityService(config, executionContext, tokenManager);
  }

  /**
   * Object containing definition-related methods
   */
  public readonly definition = {
    /**
     * Get a case definition by name
     * 
     * @param definitionName Name of the case definition to retrieve
     * @returns Case definition instance with associated methods
     * 
     * @example
     * ```typescript
     * // Get definition and call methods directly
     * const activeCases = await sdk.case.definition.get("HR Onboarding")
     *   .getActiveCases();
     *   
     * // Get the count of active cases
     * const activeCount = (await sdk.case.definition.get("HR Onboarding")
     *   .getActiveCases()).count();
     *   
     * // Get the count of SLA breaches
     * const breachCount = (await sdk.case.definition.get("HR Onboarding")
     *   .getSLABreaches()).count();
     *   
     * // Access the data directly - two equivalent ways
     * const caseData1 = (await sdk.case.definition.get("HR Onboarding")
     *   .getActiveCases()).data;
     * const caseData2 = (await sdk.case.definition.get("HR Onboarding")
     *   .getActiveCases()).getData();
     * ```
     */
    getByName: (definitionName: string): CaseDefinition => {
      return new CaseDefinitionHandler(definitionName, this.entityService);
    },

    /**
     * Get all case definitions
     * 
     * @returns Promise resolving to an array of case definitions
     * 
     * @example
     * ```typescript
     * // Get all case definitions
     * const definitions = await sdk.case.definition.getAll();
     * console.log(`Found ${definitions.length} case definitions`);
     * 
     * // Process each definition
     * for (const def of definitions) {
     *   console.log(`Case: ${def.CaseName}, ID: ${def.CaseId}`);
     * }
     * ```
     */
    getAll: async (): Promise<CaseDefinitionData[]> => {
      const response = await this.entityService.getByName<CaseDefinitionData>("CaseDefinition");
      return (response.value || []).map(transformCaseDefinition);
    }
  };
} 