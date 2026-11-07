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

  // Data Service's shape for a refused request: error + traceId, and each reason in problems.
  ENTITY_ERROR_MESSAGE: 'The SQL query was refused with 2 problem(s).',
  ENTITY_TRACE_ID: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
  ENTITY_PROBLEMS: ["Sql line 1, column 15: 'sys.tables' must be a one-part name.", "Sql line 1, column 1: 'OPTION (…)' is not allowed."],
} as const;
