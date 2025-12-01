// ===== IMPORTS =====
import { describe, it, expect, beforeAll } from 'vitest';
import { UiPath } from '../../../../src/uipath';
import type { UiPathSDKConfig } from '../../../../src/core/config/sdk-config';
import { ChoiceSetGetResponse } from '../../../../src/models/data-fabric/choicesets.types';

// ===== CONFIGURATION =====
const config: UiPathSDKConfig = {
  baseUrl: 'https://alpha.uipath.com',
  orgName: 'entity',
  tenantName: 'a4e',
  secret: 'rt_57400A17A1C0F0238218F024EFAB7271ACE21E364566537AEDA27CCEF2256EA0-1',
};

// ===== TEST SUITE =====
describe('ChoiceSetService Integration Tests (Actual SDK Calls)', () => {
  let sdk: UiPath;
  let isAuthenticated: boolean = false;

  beforeAll(async () => {
    try {
      sdk = new UiPath(config);
      
      // Secret-based auth is auto-initialized in constructor
      isAuthenticated = sdk.isAuthenticated();

      if (!isAuthenticated) {
        console.warn('⚠️  Skipping integration tests: Authentication failed');
        console.warn('   Token:', sdk.getToken() ? 'Present' : 'Missing');
      } else {
        console.log('✅ Authentication successful');
      }
    } catch (error: any) {
      console.warn('⚠️  Skipping integration tests:', error?.message || error);
      if (error?.response) {
        console.warn('   Response status:', error.response.status);
        console.warn('   Response data:', error.response.data);
      }
      isAuthenticated = false;
    }
  });

  describe('getAll', () => {
    it('should get all choice sets successfully', async () => {
      if (!isAuthenticated) {
        return; // Skip test if not authenticated
      }

      try {
        const choiceSets = await sdk.entities.choicesets.getAll();

        // Print the response
        console.log('\n📋 Choice Sets Response:');
        console.log('='.repeat(80));
        console.log(JSON.stringify(choiceSets, null, 2));
        console.log('='.repeat(80));
        console.log(`\nTotal choice sets: ${choiceSets.length}\n`);

        // Verify the result
        expect(choiceSets).toBeDefined();
        expect(Array.isArray(choiceSets)).toBe(true);
        
        // If choice sets exist, verify structure
        if (choiceSets.length > 0) {
          const firstChoiceSet = choiceSets[0];
          
          // Verify required fields are present
          expect(firstChoiceSet).toHaveProperty('id');
          expect(firstChoiceSet).toHaveProperty('name');
          expect(firstChoiceSet).toHaveProperty('displayName');
          expect(firstChoiceSet).toHaveProperty('entityType');
          expect(firstChoiceSet).toHaveProperty('folderId');
          
          // Verify field types
          expect(typeof firstChoiceSet.id).toBe('string');
          expect(typeof firstChoiceSet.name).toBe('string');
          expect(typeof firstChoiceSet.displayName).toBe('string');
          expect(typeof firstChoiceSet.entityType).toBe('string');
          expect(typeof firstChoiceSet.folderId).toBe('string');
          
          // Verify entityType is 'ChoiceSet'
          expect(firstChoiceSet.entityType).toBe('ChoiceSet');
          
          // Verify normalized field names (createdTime/updatedTime, not createTime/updateTime)
          expect(firstChoiceSet).toHaveProperty('createdTime');
          expect(firstChoiceSet).toHaveProperty('updatedTime');
          expect(firstChoiceSet).not.toHaveProperty('createTime');
          expect(firstChoiceSet).not.toHaveProperty('updateTime');
          
          // Verify optional fields if present
          if (firstChoiceSet.recordCount !== undefined) {
            expect(typeof firstChoiceSet.recordCount).toBe('number');
          }
          if (firstChoiceSet.isRbacEnabled !== undefined) {
            expect(typeof firstChoiceSet.isRbacEnabled).toBe('boolean');
          }
        }
      } catch (error: any) {
        console.error('❌ API Error:', error?.message || error);
        if (error?.response) {
          console.error('   Status:', error.response.status);
          console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
      }
    });

    it('should transform field names correctly (createTime -> createdTime, updateTime -> updatedTime)', async () => {
      if (!isAuthenticated) {
        return; // Skip test if not authenticated
      }

      const choiceSets = await sdk.entities.choicesets.getAll();

      if (choiceSets.length > 0) {
        const choiceSet = choiceSets[0] as ChoiceSetGetResponse;
        
        // Verify normalized field names exist
        expect(choiceSet.createdTime).toBeDefined();
        expect(choiceSet.updatedTime).toBeDefined();
        
        // Verify old field names don't exist
        expect(choiceSet).not.toHaveProperty('createTime');
        expect(choiceSet).not.toHaveProperty('updateTime');
        
        // Verify timestamps are strings
        expect(typeof choiceSet.createdTime).toBe('string');
        expect(typeof choiceSet.updatedTime).toBe('string');
      }
    });

    it('should return choice sets with all expected properties', async () => {
      if (!isAuthenticated) {
        return; // Skip test if not authenticated
      }

      const choiceSets = await sdk.entities.choicesets.getAll();

      if (choiceSets.length > 0) {
        choiceSets.forEach((choiceSet) => {
          // Required properties
          expect(choiceSet).toHaveProperty('id');
          expect(choiceSet).toHaveProperty('name');
          expect(choiceSet).toHaveProperty('displayName');
          expect(choiceSet).toHaveProperty('entityType');
          expect(choiceSet).toHaveProperty('folderId');
          expect(choiceSet).toHaveProperty('createdBy');
          expect(choiceSet).toHaveProperty('createdTime');
          expect(choiceSet).toHaveProperty('updatedTime');
          expect(choiceSet).toHaveProperty('updatedBy');
          
          // Optional properties (may or may not be present)
          // These are fine if undefined
          if (choiceSet.entityTypeId !== undefined) {
            expect(typeof choiceSet.entityTypeId).toBe('number');
          }
          if (choiceSet.description !== undefined) {
            expect(typeof choiceSet.description).toBe('string');
          }
          if (choiceSet.recordCount !== undefined) {
            expect(typeof choiceSet.recordCount).toBe('number');
          }
          if (choiceSet.storageSizeInMB !== undefined) {
            expect(typeof choiceSet.storageSizeInMB).toBe('number');
          }
          if (choiceSet.usedStorageSizeInMB !== undefined) {
            expect(typeof choiceSet.usedStorageSizeInMB).toBe('number');
          }
          if (choiceSet.isRbacEnabled !== undefined) {
            expect(typeof choiceSet.isRbacEnabled).toBe('boolean');
          }
          if (choiceSet.invalidIdentifiers !== undefined) {
            expect(Array.isArray(choiceSet.invalidIdentifiers)).toBe(true);
          }
          if (choiceSet.isModelReserved !== undefined) {
            expect(typeof choiceSet.isModelReserved).toBe('boolean');
          }
        });
      }
    });

    it('should handle empty results gracefully', async () => {
      if (!isAuthenticated) {
        return; // Skip test if not authenticated
      }

      const choiceSets = await sdk.entities.choicesets.getAll();

      // Should return an array even if empty
      expect(Array.isArray(choiceSets)).toBe(true);
      // Empty array is valid - some tenants may have no choice sets
    });
  });
});
