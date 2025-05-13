export interface RetryConfig<T = any> {
    /**
     * number of maximal retry attempts
     * @defaultValue 10
     */
    retries: number | "INFINITELY";
    /**
     * wait time between retries in ms
     * @defaultValue 100
     */
    delay: number;
    /**
     * check the result, will retry until true
     * @defaultValue () => true
     */
    until: (t: T) => boolean;
    /**
     * log events
     * @defaultValue () => undefined
     */
    logger: (msg: string) => void;
    /**
     * overall timeout in ms
     * @defaultValue 60 * 1000
     */
    timeout: number | "INFINITELY";
    /**
     * increase delay with every retry
     * @defaultValue "FIXED"
     */
    backoff: "FIXED" | "EXPONENTIAL" | "LINEAR" | ((attempt: number, delay: number) => number);
    /**
     * maximal backoff in ms
     * @defaultValue 5 * 60 * 1000
     */
    maxBackOff: number;
    /**
     * allows to abort retrying for certain errors
     */
    retryIf: (error: any) => boolean;
}
export declare const defaultRetryConfig: RetryConfig<any>;
export declare function wait(ms: number): Promise<void>;
export declare function retry<T>(f: () => Promise<T>, config?: Partial<RetryConfig<T>>): Promise<T>;
export declare function retryDecorator<T, F extends (...args: any[]) => Promise<T>>(func: F, config?: Partial<RetryConfig<T>>): (...funcArgs: Parameters<F>) => ReturnType<F>;
export declare function customizeDecorator<T>(customConfig: Partial<RetryConfig<T>>): typeof retryDecorator;
export declare function customizeRetry<T>(customConfig: Partial<RetryConfig<T>>): (f: () => Promise<T>, config?: Partial<RetryConfig<T>>) => Promise<T>;
export declare const notEmpty: (result: any) => boolean;
export declare class RetryError extends Error {
    readonly lastError: Error;
    constructor(message: string, lastError: Error);
}
declare class BaseError {
    message?: string | undefined;
    constructor(message?: string | undefined, ...args: unknown[]);
}
export declare class NotRetryableError extends BaseError {
    constructor(message?: string);
}
export {};
