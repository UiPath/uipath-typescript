export const getEntityTypeColor = (entityType: string) => {
  switch (entityType) {
    case 'Entity':
      return 'bg-blue-100 text-blue-800';
    case 'ChoiceSet':
      return 'bg-purple-100 text-purple-800';
    case 'InternalEntity':
      return 'bg-orange-100 text-orange-800';
    case 'SystemEntity':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getFieldTypeColor = (fieldType: string) => {
  switch (fieldType?.toUpperCase()) {
    case 'STRING':
    case 'MULTILINE_TEXT':
      return 'bg-green-100 text-green-800';
    case 'INTEGER':
    case 'BIG_INTEGER':
    case 'FLOAT':
    case 'DOUBLE':
    case 'DECIMAL':
      return 'bg-blue-100 text-blue-800';
    case 'BOOLEAN':
      return 'bg-yellow-100 text-yellow-800';
    case 'DATETIME':
    case 'DATETIME_WITH_TZ':
    case 'DATE':
      return 'bg-purple-100 text-purple-800';
    case 'UUID':
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getOperationStatusColor = (success: boolean) => {
  return success
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-red-100 text-red-800 border-red-200';
};

export const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
};

export const formatBytes = (bytes: number | undefined) => {
  if (bytes === undefined || bytes === null) return 'N/A';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatEntityName = (name: string) => {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const truncateId = (id: string, length: number = 8) => {
  if (!id) return 'N/A';
  if (id.length <= length) return id;
  return `${id.substring(0, length)}...`;
};

export const formatFieldDisplayType = (displayType: string | undefined) => {
  if (!displayType) return 'Basic';
  return displayType.replace(/([a-z])([A-Z])/g, '$1 $2');
};

export const getFieldDisplayTypeColor = (displayType: string | undefined) => {
  switch (displayType) {
    case 'Basic':
      return 'bg-gray-100 text-gray-800';
    case 'Relationship':
      return 'bg-blue-100 text-blue-800';
    case 'File':
      return 'bg-orange-100 text-orange-800';
    case 'ChoiceSetSingle':
    case 'ChoiceSetMultiple':
      return 'bg-purple-100 text-purple-800';
    case 'AutoNumber':
      return 'bg-teal-100 text-teal-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
