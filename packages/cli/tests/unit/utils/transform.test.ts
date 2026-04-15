import { describe, it, expect } from 'vitest';
import { pascalToCamelCase, pascalToCamelCaseKeys } from '../../../src/utils/transform.js';

describe('transform', () => {
  describe('pascalToCamelCase', () => {
    it('should convert PascalCase to camelCase', () => {
      expect(pascalToCamelCase('TaskName')).toBe('taskName');
    });
    it('should handle single character', () => {
      expect(pascalToCamelCase('A')).toBe('a');
    });
    it('should return empty string for empty input', () => {
      expect(pascalToCamelCase('')).toBe('');
    });
    it('should handle already camelCase', () => {
      expect(pascalToCamelCase('taskName')).toBe('taskName');
    });
  });

  describe('pascalToCamelCaseKeys', () => {
    it('should convert object keys', () => {
      const result = pascalToCamelCaseKeys({ Id: '123', TaskName: 'Invoice' });
      expect(result).toEqual({ id: '123', taskName: 'Invoice' });
    });

    it('should handle nested objects', () => {
      const result = pascalToCamelCaseKeys({
        TaskId: '456',
        TaskDetails: { AssignedUser: 'John', Priority: 'High' },
      });
      expect(result).toEqual({
        taskId: '456',
        taskDetails: { assignedUser: 'John', priority: 'High' },
      });
    });

    it('should handle arrays of objects', () => {
      const result = pascalToCamelCaseKeys([{ FirstName: 'John' }, { FirstName: 'Jane' }]);
      expect(result).toEqual([{ firstName: 'John' }, { firstName: 'Jane' }]);
    });

    it('should handle arrays with primitive values', () => {
      const result = pascalToCamelCaseKeys({ Items: ['a', 'b'] } as any);
      expect(result).toEqual({ items: ['a', 'b'] });
    });

    it('should handle null values without recursing', () => {
      const result = pascalToCamelCaseKeys({ FieldName: null } as any);
      expect(result).toEqual({ fieldName: null });
    });
  });
});
