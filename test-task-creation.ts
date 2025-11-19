/**
 * Test script to verify task creation works with the SDK
 * This uses the same configuration as the MCP server
 */

import { UiPath } from './dist/index.mjs';

async function testTaskCreation() {
  console.log('Starting task creation test...\n');

  // Get configuration from environment variables (same as MCP server)
  const config = {
    baseUrl: process.env.UIPATH_BASE_URL || 'https://alpha.uipath.com',
    orgName: process.env.UIPATH_ORG_NAME || 'popoc',
    tenantName: 'adetenant',
    secret:'rt_C790F903D6B59050FD462447201927AE3FC6AD13A8F29E41DB9738BFEE288C43-1',
  };

  console.log('Configuration:');
  console.log(`  Base URL: ${config.baseUrl}`);
  console.log(`  Org Name: ${config.orgName}`);
  console.log(`  Tenant: ${config.tenantName}`);
  console.log(`  Secret: ${config.secret ? '***' + config.secret.slice(-4) : 'NOT SET'}\n`);

  // Validate configuration
  if (!config.baseUrl || !config.orgName || !config.tenantName || !config.secret) {
    console.error('ERROR: Missing required environment variables!');
    console.error('Please set: UIPATH_BASE_URL, UIPATH_ORG_NAME, UIPATH_TENANT_NAME, UIPATH_SECRET');
    process.exit(1);
  }

  try {
    // Initialize SDK
    console.log('Initializing UiPath SDK...');
    const sdk = new UiPath({
      baseUrl: config.baseUrl,
      orgName: config.orgName,
      tenantName: config.tenantName,
      secret: config.secret,
    });

    await sdk.initialize();
    console.log('SDK initialized successfully\n');

    // const res = await sdk.assets.getAll();
    // console.log('--------------Assets details--------------', res);
    // const res = await sdk.tasks.complete(
    //   {
    //     taskId: 9001408,
    //     type: 'AppTask' as any,  // TaskType.External/Form/App
    //     action: 'approve',
    //     data: {},
    //   },
    //   2039058
    // );
    const res = await sdk.entities.getRecordsById('3f790d69-62c3-f011-8195-6045bd0240b6');

    console.log('--------------Complete task details--------------', res);

    // // Test parameters (same as MCP server call)
    // const folderId = 1878866;
    // const taskTitle = 'my-task';
    // const taskPriority = 'Medium'; // Default priority

    // console.log('Creating task with parameters:');
    // console.log(`  Title: ${taskTitle}`);
    // console.log(`  Folder ID: ${folderId}`);
    // console.log(`  Priority: ${taskPriority}\n`);

    // // Create task (exactly as MCP server does)
    // console.log('Calling sdk.tasks.create()...');
    // const task = await sdk.tasks.create(
    //   {
    //     title: taskTitle
    //   },
    //   folderId
    // );

    // console.log('\n✓ Task created successfully!\n');

    // // Log the raw response to see what we're actually getting
    // console.log('=== RAW TASK OBJECT INSPECTION ===');
    // console.log('Type:', typeof task);
    // console.log('Is null?:', task === null);
    // console.log('Is undefined?:', task === undefined);
    // console.log('Is object?:', task && typeof task === 'object');
    // console.log('Constructor:', task?.constructor?.name);

    // if (task) {
    //   console.log('\n=== OBJECT KEYS ===');
    //   const keys = Object.keys(task);
    //   console.log('Keys found:', keys.length);
    //   console.log('Keys:', keys);

    //   console.log('\n=== ALL PROPERTIES (including non-enumerable) ===');
    //   const allProps = Object.getOwnPropertyNames(task);
    //   console.log('All property names:', allProps);

    //   console.log('\n=== TASK DETAILS ===');
    //   console.log(`  id: ${(task as any).id} (type: ${typeof (task as any).id})`);
    //   console.log(`  title: ${(task as any).title} (type: ${typeof (task as any).title})`);
    //   console.log(`  priority: ${(task as any).priority} (type: ${typeof (task as any).priority})`);
    //   console.log(`  status: ${(task as any).status} (type: ${typeof (task as any).status})`);
    //   console.log(`  type: ${(task as any).type} (type: ${typeof (task as any).type})`);
    //   console.log(`  key: ${(task as any).key} (type: ${typeof (task as any).key})`);
    //   console.log(`  folderId: ${(task as any).folderId} (type: ${typeof (task as any).folderId})`);

    //   console.log('\n=== FULL JSON REPRESENTATION ===');
    //   console.log(JSON.stringify(task, null, 2));

    //   console.log('\n=== ITERATE ALL PROPERTIES ===');
    //   for (const key in task) {
    //     const value = (task as any)[key];
    //     const type = typeof value;
    //     const displayValue = type === 'function' ? '[Function]' : value;
    //     console.log(`  ${key}: ${type} = ${displayValue}`);
    //   }
    // } else {
    //   console.log('\n⚠️  Task object is null or undefined!');
    // }

  } catch (error: any) {
    console.log('--------------Error details--------------', error);
    // console.error('\n✗ Task creation failed!\n');
    // console.error('Error details:');
    // console.error(`  Message: ${error.message}`);
    // console.error(`  Name: ${error.name}`);

    // // Check if this is the HTML error we're investigating
    // if (error.message && error.message.includes('<!DOCTYPE')) {
    //   console.error('\nAPI returned HTML instead of JSON.');
    //   console.error('Attempting to extract HTML error page...\n');

    //   // The full error message contains the HTML
    //   const htmlSnippet = error.message.substring(error.message.indexOf('<!DOCTYPE'));
    //   console.error('=== HTML ERROR PAGE (first 2000 chars) ===');
    //   console.error(htmlSnippet.substring(0, 2000));
    //   console.error('=== END HTML ERROR PAGE ===\n');
    // }

    // if (error.stack) {
    //   console.error('\nStack trace:');
    //   console.error(error.stack);
    // }

    // // Try to extract response from undici error
    // if (error.cause) {
    //   console.error('\nUnderlying cause:');
    //   console.error(JSON.stringify(error.cause, null, 2));
    // }

    // // The error might have the response in a different place
    // const response = error.response || error.data || error.body;

    // if (response) {
    //   console.error('\nHTTP Response:');
    //   console.error(`  Status: ${response.status || response.statusCode || 'unknown'}`);
    //   console.error(`  Status Text: ${response.statusText || response.statusMessage || 'unknown'}`);

    //   if (response.headers) {
    //     console.error(`  Headers:`, response.headers);
    //   }

    //   const responseData = response.data || response.body || response;
    //   if (responseData) {
    //     console.error('\nResponse Data:');
    //     // If it's HTML, show first 1000 chars to see the error
    //     if (typeof responseData === 'string' && responseData.startsWith('<!DOCTYPE')) {
    //       console.error(responseData.substring(0, 1000));
    //       console.error('\n... (truncated HTML response)');
    //     } else if (typeof responseData === 'string') {
    //       console.error(responseData);
    //     } else {
    //       console.error(JSON.stringify(responseData, null, 2));
    //     }
    //   }
    // }

    // if (error.request) {
    //   console.error('\nRequest details:');
    //   console.error(`  Method: ${error.request.method}`);
    //   console.error(`  URL: ${error.request.url || error.request.path}`);
    //   if (error.request.headers) {
    //     console.error(`  Headers:`, error.request.headers);
    //   }
    // }

    // console.error('\n=== CONCLUSION ===');
    // console.error('The UiPath API is returning an HTML error page instead of JSON.');
    // console.error('This is an API-level issue, not a problem with the SDK or MCP server code.');
    // console.error('Possible causes:');
    // console.error('  1. Folder 1878866 does not have permissions for External task creation');
    // console.error('  2. The Action Center API endpoint is returning an error');
    // console.error('  3. There is a configuration issue with the UiPath tenant/folder');
    // console.error('  4. The API endpoint might be temporarily unavailable');

    // process.exit(1);
  }
}

// Run the test
testTaskCreation().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
