export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'running':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
    case 'successful':
      return 'bg-green-100 text-green-800';
    case 'faulted':
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'pending':
    case 'waiting':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
    case 'canceled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const formatDuration = (startTime: string, endTime?: string) => {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const durationMs = end.getTime() - start.getTime();
  
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export const formatProcessName = (packageId: string) => {
  return packageId
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const getEmbedTaskUrl = (taskUrl: string) => {
  try {
    // Extract parts from the URL
    const url = new URL(taskUrl);
    const parts = url.pathname.split('/');
    const orgId = parts[1];
    const tenantId = parts[2];
    const taskId = parts[parts.length - 1];
    
    // Construct the embed URL
    return `${url.origin}/embed_/${orgId}/${tenantId}/actions_/current-task/tasks/${taskId}`;
  } catch (e) {
    console.error('Error parsing task URL:', e);
    return taskUrl;
  }
};