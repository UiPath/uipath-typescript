import { Response } from 'node-fetch';
import { MESSAGES, getHttpErrorMessage } from '../constants/messages.js';

/**
 * Creates a user-friendly error message from an HTTP response
 * @param response The HTTP response object
 * @param context Optional context for more specific error messages (e.g., 'registration', 'publishing')
 * @returns Promise<string> A comprehensive error message
 */
export async function createHttpErrorMessage(response: Response, context?: string): Promise<string> {
  const errorText = await response.text();
  const userFriendlyMessage = getHttpErrorMessage(response.status, context);
  
  // Combine user-friendly message with API details
  let fullMessage = userFriendlyMessage;
  if (errorText && errorText !== '{}' && errorText.trim() !== '') {
    fullMessage += `\nAPI Response: ${errorText}`;
  } else {
    fullMessage += `\nHTTP ${response.status}: ${MESSAGES.ERRORS.NO_ERROR_DETAILS}`;
  }
  
  return fullMessage;
}

/**
 * Handles HTTP error responses by throwing an error with a comprehensive message
 * @param response The HTTP response object
 * @param context Optional context for more specific error messages
 * @throws Error with user-friendly and technical details
 */
export async function handleHttpError(response: Response, context?: string): Promise<never> {
  const errorMessage = await createHttpErrorMessage(response, context);
  throw new Error(errorMessage);
}