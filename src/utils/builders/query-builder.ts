import { PaginationState } from '../../models/common/pagination';

/**
 * Base pagination parameters
 */
export interface PaginationOptions {
  start?: number;
  limit?: number;
}

/**
 * Base response structure for paginated queries
 */
export interface PaginatedResponse<TValue> {
  totalRecordCount: number;
  value: TValue[] | null;
}

/**
 * Generic query builder for constructing API queries with a fluent interface
 */
export class QueryBuilder<TOptions extends PaginationOptions, TValue> implements PromiseLike<PaginatedResponse<TValue>> {
  protected options: TOptions;
  protected executeQuery: (options: TOptions, ...args: any[]) => Promise<PaginatedResponse<TValue>>;

  constructor(
    defaultOptions: TOptions,
    executeQuery: (options: TOptions, ...args: any[]) => Promise<PaginatedResponse<TValue>>
  ) {
    this.options = { ...defaultOptions };
    this.executeQuery = executeQuery;
  }

  /**
   * Set the maximum number of records to return
   */
  limit(value: number): this {
    this.options.limit = value;
    return this;
  }

  /**
   * Set the starting index for pagination
   */
  start(value: number): this {
    this.options.start = value;
    return this;
  }

  /**
   * Set a custom option value
   */
  selectFields<K extends keyof TOptions>(key: K, value: TOptions[K]): this {
    this.options[key] = value;
    return this;
  }

  /**
   * Implementation of PromiseLike interface
   * This allows the QueryBuilder to be awaited directly
   */
  then<TResult1 = PaginatedResponse<TValue>, TResult2 = never>(
    onfulfilled?: ((value: PaginatedResponse<TValue>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.executeQuery(this.options).then(onfulfilled, onrejected);
  }

  /**
   * Create a paginator for handling paginated results
   */
  paginate(pageSize?: number): Paginator<TOptions, TValue> {
    const limit = pageSize ?? this.options.limit ?? 50;
    return new Paginator<TOptions, TValue>(this, limit);
  }

  /**
   * Helper to check if there are more pages based on the response
   */
  static hasMorePages(response: PaginatedResponse<any>, currentLimit: number, currentStart: number): boolean {
    return (currentStart + (response.value?.length ?? 0)) < response.totalRecordCount;
  }

  /**
   * Helper to get the start index for the next page
   */
  static getNextPageStart(currentStart: number, currentLimit: number): number {
    return currentStart + currentLimit;
  }
}

/**
 * Generic paginator for handling paginated results
 */
export class Paginator<TOptions extends PaginationOptions, TValue> {
  private currentStart: number = 0;
  private currentResponse?: PaginatedResponse<TValue>;
  private builder: QueryBuilder<TOptions, TValue>;
  private state: {
    currentPage: number;
    hasMorePages: boolean;
    totalItems: number;
  };

  constructor(
    builder: QueryBuilder<TOptions, TValue>,
    private readonly limit: number = 50
  ) {
    this.builder = builder;
    this.state = {
      currentPage: 0,
      hasMorePages: true,
      totalItems: 0
    };
  }

  /**
   * Get the current page of results
   */
  getCurrentPage(): TValue[] | null {
    return this.currentResponse?.value ?? null;
  }

  /**
   * Check if there are more pages available
   */
  hasMorePages(): boolean {
    if (!this.currentResponse) return false;
    return QueryBuilder.hasMorePages(this.currentResponse, this.limit, this.currentStart);
  }

  /**
   * Get the total number of records
   */
  getTotalCount(): number {
    return this.currentResponse?.totalRecordCount ?? 0;
  }

  /**
   * Load the next page of results
   */
  async nextPage(): Promise<TValue[] | null> {
    this.currentStart = QueryBuilder.getNextPageStart(this.currentStart, this.limit);
    
    this.currentResponse = await this.builder
      .start(this.currentStart)
      .limit(this.limit);

    return this.getCurrentPage();
  }

  /**
   * Reset pagination state and load the first page
   */
  async reset(): Promise<TValue[] | null> {
    this.currentStart = 0;
    
    this.currentResponse = await this.builder
      .start(this.currentStart)
      .limit(this.limit);

    return this.getCurrentPage();
  }
} 