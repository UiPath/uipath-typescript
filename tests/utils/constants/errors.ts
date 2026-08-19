/**
 * Error parser test constants
 * Error-parsing-specific constants only
 */

export const ERROR_PARSER_TEST_CONSTANTS = {
  // Shape Orchestrator actually returns: message + numeric errorCode + traceId.
  ORCHESTRATOR_ERROR_MESSAGE: 'A folder is required for this action.',
  ORCHESTRATOR_ERROR_CODE: 1101,
  ORCHESTRATOR_TRACE_ID: '00-d0c08db7f3eeac1477da0882ffc7-35f88125b7e01d82-01',

  // A representative non-JSON error body — Azure Storage answers in XML, which
  // is what a failed attachment or bucket upload surfaces.
  XML_ERROR_BODY:
    '<?xml version="1.0" encoding="utf-8"?><Error><Code>AuthenticationFailed</Code>' +
    '<Message>Signature not valid in the specified time frame</Message></Error>',
  XML_ERROR_STATUS_TEXT: 'Server failed to authenticate the request.',
} as const;
