// Public error classes
export * from './authentication';
export * from './authorization';
export * from './validation';
export * from './not-found';
export * from './rate-limit';
export * from './server';
export * from './network';

// Base error class
export { UiPathError } from './base';

// Type guards and utilities
export * from './guards';

// Selected constants users might need
export { ErrorType, HttpStatus } from './constants';


