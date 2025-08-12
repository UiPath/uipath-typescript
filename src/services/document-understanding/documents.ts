import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { DigitizationService } from './digitization';

/**
 * Main service for Document Understanding features
 */
export class DocumentsService extends BaseService {
  private _digitization?: DigitizationService;
  private tokenManager: TokenManager;

  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
    this.tokenManager = tokenManager;
  }

  /**
   * Access to Document Digitization service
   * 
   * @returns {DigitizationService} Instance of the digitization service
   * 
   * @example
   * ```typescript
   * // Access digitization service and start processing
   * const result = await sdk.documents.digitization.start({
   *   projectId: '00000000-0000-0000-0000-000000000000',
   *   file: fileBuffer,
   *   pageRange: '1-10'
   * });
   * 
   * console.log('Document ID:', result.documentId);
   * ```
   */
  get digitization(): DigitizationService {
    if (!this._digitization) {
      this._digitization = new DigitizationService(
        this.config, 
        this.executionContext, 
        this.tokenManager
      );
    }
    return this._digitization;
  } 
}