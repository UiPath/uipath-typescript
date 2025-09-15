import { createServer, connect } from 'net';
import { AUTH_CONSTANTS } from '../../constants/auth.js';

/**
 * Checks if a port is available for use by attempting multiple connection methods
 * @param port The port number to check
 * @returns Promise that resolves to true if port is available, false otherwise
 */
const checkConnection = (port: number, host: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const client = connect({ port, host }, () => {
      // Connection successful - port is in use
      client.end();
      resolve(true);
    });

    client.on('error', () => {
      // Connection failed - port might be available
      resolve(false);
    });

    // Set a short timeout
    client.setTimeout(100);
    client.on('timeout', () => {
      client.destroy();
      resolve(false);
    });
  });
};

const tryBindToPort = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.once('error', () => {
      // Can't bind - port is in use
      resolve(false);
    });
    
    server.once('listening', () => {
      // Successfully bound to port, it's available
      server.close(() => {
        resolve(true);
      });
    });
    
    // Try to listen on all interfaces (same as Express default)
    server.listen(port);
  });
};

export const isPortAvailable = async (port: number): Promise<boolean> => {
  // Check multiple interfaces using constants
  const connectionChecks = await Promise.all(
    AUTH_CONSTANTS.PORT_CHECK_HOSTS.map(host => checkConnection(port, host))
  );
  
  // If any host shows the port is in use, return false
  if (connectionChecks.some(isInUse => isInUse)) {
    return false;
  }

  // If no connections succeeded, try to bind to the port
  return await tryBindToPort(port);
};