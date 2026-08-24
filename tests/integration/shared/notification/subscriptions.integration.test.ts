import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, hasUserToken, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import type { Subscriptions } from '../../../../src/services/notification';
import { NotificationCategory, NotificationMode, type SubscriptionEntity, type SubscriptionPublisher } from '../../../../src/models/notification';

const modes: InitMode[] = ['v1'];

// The subscription API rejects PAT tokens, so this suite authenticates with a user
// token and skips when one is not configured.
describe.skipIf(!hasUserToken()).each(modes)('Subscriptions - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode, 'user');

  let subscriptions!: Subscriptions;
  let tenantId!: string;
  let allPublishers!: SubscriptionPublisher[];
  let firstPublisher!: SubscriptionPublisher;

  beforeAll(async () => {
    const service = getServices().subscriptions;
    if (!service) {
      throw new Error('Subscriptions service is not registered for this init mode');
    }
    subscriptions = service;

    const configuredTenantId = getTestConfig().tenantId;
    if (!configuredTenantId) {
      throw new Error(
        'UIPATH_TENANT_ID_DEV is not configured. Set it to the acting tenant GUID ' +
          'so subscription preferences can be queried.',
      );
    }
    tenantId = configuredTenantId;

    // TEMPORARY DIAGNOSTIC — remove once the notification 403 is resolved.
    // Policies.UserContext succeeds only when the token's `prt_id` claim
    // contains the org id from the X-UiPath-Internal-AccountId header, so
    // print the claim and the raw body before the SDK reduces it to "Forbidden".
    const EXPECTED_ORG_ID = '3aa10965-a82d-4d9e-8366-0eff8e87bf7a';
    const diagConfig = getTestConfig();
    const diagToken = diagConfig.userToken;
    if (diagToken) {
      try {
        const claims = JSON.parse(
          Buffer.from(diagToken.split('.')[1], 'base64url').toString('utf8'),
        ) as Record<string, unknown>;
        const prtId = String(claims.prt_id ?? '(absent)');
        console.log('[subs-diag] prt_id          :', prtId);
        console.log('[subs-diag] expected org id :', EXPECTED_ORG_ID);
        console.log(
          '[subs-diag] prt_id matches  :',
          prtId.toLowerCase().includes(EXPECTED_ORG_ID.toLowerCase()),
        );
      } catch (err) {
        console.log('[subs-diag] could not decode token:', (err as Error).message);
      }

      const url =
        `${diagConfig.baseUrl}/${diagConfig.orgName}/notificationservice_` +
        `/usersubscriptionservice/api/v1/UserSubscription`;
      try {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${diagToken}`,
            'X-UIPATH-Internal-TenantId': tenantId,
            Accept: 'application/json',
          },
        });
        console.log('[subs-diag] GET UserSubscription ->', res.status, res.statusText);
        console.log('[subs-diag] x-request-id:', res.headers.get('x-request-id') ?? '(none)');
        console.log('[subs-diag] response body:', (await res.text()).slice(0, 500));
      } catch (err) {
        console.log('[subs-diag] request threw:', (err as Error).message);
      }
    }

    const { publishers } = await subscriptions.getAll(tenantId);
    if (publishers.length === 0) {
      throw new Error('No publishers visible to the test user — cannot run subscription tests.');
    }
    allPublishers = publishers;
    firstPublisher = publishers[0];
  });

  describe('getAll', () => {
    it('should return the user\'s publishers + topics + subscription state', () => {
      expect(firstPublisher).toBeDefined();
      expect(firstPublisher.id).toBeDefined();
      expect(firstPublisher.name).toBeDefined();
      expect(Array.isArray(firstPublisher.topics)).toBe(true);
      expect(Array.isArray(firstPublisher.modes)).toBe(true);
      expect(typeof firstPublisher.isUserOptin).toBe('boolean');
    });

    it('should support filtering by a single publisher name', async () => {
      const { publishers } = await subscriptions.getAll(tenantId, { publishers: [firstPublisher.name] });

      expect(publishers.length).toBeGreaterThanOrEqual(1);
      for (const p of publishers) {
        expect(p.name).toBe(firstPublisher.name);
      }
    });

    it('should support filtering by multiple publisher names', async () => {
      if (allPublishers.length < 2) {
        throw new Error('At least 2 visible publishers are required to test multi-publisher filtering.');
      }
      // Verifies the array query param (Publishers) is serialized and forwarded to the API
      // correctly — getAll() is the first SDK method to pass an array as a query param.
      const requestedNames = allPublishers.slice(0, 2).map(p => p.name);

      const { publishers } = await subscriptions.getAll(tenantId, { publishers: requestedNames });

      expect(publishers.length).toBe(requestedNames.length);
      expect(publishers.map(p => p.name).sort()).toEqual([...requestedNames].sort());
    });
  });

  describe('getPublishers', () => {
    it('should list available publishers with discovery-only fields', async () => {
      const { publishers } = await subscriptions.getPublishers(tenantId);

      expect(Array.isArray(publishers)).toBe(true);
      expect(publishers.length).toBeGreaterThan(0);
      const p = publishers[0];
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(Array.isArray(p.topics)).toBe(true);
    });

    it('should support filtering by publisher name', async () => {
      const { publishers } = await subscriptions.getPublishers(tenantId, { name: firstPublisher.name });

      expect(publishers.length).toBeGreaterThanOrEqual(1);
      expect(publishers[0].name).toBe(firstPublisher.name);
    });
  });

  describe('getSupportedChannels', () => {
    it('should return supported channels for the tenant (excluding implicit InApp)', async () => {
      const { channels } = await subscriptions.getSupportedChannels(tenantId);

      expect(Array.isArray(channels)).toBe(true);
      // InApp is always implicit; the endpoint shouldn't list it
      expect(channels.map(c => c.name)).not.toContain(NotificationMode.InApp);
      for (const channel of channels) {
        expect(channel.name).toBeDefined();
        expect(typeof channel.isEnabled).toBe('boolean');
      }
    });
  });

  describe('updateTopics', () => {
    it('should round-trip a topic subscription change', async () => {
      // Find a non-mandatory topic with at least one mode we can toggle
      const topic = firstPublisher.topics.find((t) => t.isMandatory === false && (t.modes?.length ?? 0) > 0);
      if (!topic) {
        throw new Error('No non-mandatory topics with toggleable modes — cannot run updateTopics round-trip.');
      }
      const mode = topic.modes![0];
      const originalState = mode.isSubscribed;

      // Flip the state
      const flip = await subscriptions.updateTopics(tenantId, [
        { topicId: topic.id, isSubscribed: !originalState, notificationMode: mode.name },
      ]);
      expect(flip.success).toBe(true);

      // Restore — leave the tenant in its original state
      const restore = await subscriptions.updateTopics(tenantId, [
        { topicId: topic.id, isSubscribed: originalState, notificationMode: mode.name },
      ]);
      expect(restore.success).toBe(true);
    });
  });

  describe('updateCategories', () => {
    it('should round-trip a category subscription change', async () => {
      // Snapshot the current Email state of an Error-category topic so we restore to it verbatim
      const errorTopic = firstPublisher.topics.find(
        (t) => t.category === NotificationCategory.Error && (t.modes?.some((m) => m.name === NotificationMode.Email) ?? false),
      );
      if (!errorTopic) {
        throw new Error('No Error-category topic with an Email mode — cannot run updateCategories round-trip.');
      }
      const originalEmailState = errorTopic.modes.find((m) => m.name === NotificationMode.Email)!.isSubscribed;

      // Flip the category subscription
      const flip = await subscriptions.updateCategories(tenantId, [
        {
          publisherId: firstPublisher.id,
          category: NotificationCategory.Error,
          isSubscribed: !originalEmailState,
          notificationMode: NotificationMode.Email,
        },
      ]);
      expect(flip.success).toBe(true);

      // Restore — leave the tenant in its original state
      const restore = await subscriptions.updateCategories(tenantId, [
        {
          publisherId: firstPublisher.id,
          category: NotificationCategory.Error,
          isSubscribed: originalEmailState,
          notificationMode: NotificationMode.Email,
        },
      ]);
      expect(restore.success).toBe(true);
    });
  });

  describe('updatePublishers', () => {
    it('should round-trip a publisher opt-in/out', async () => {
      const original = firstPublisher.isUserOptin === true;

      const flip = await subscriptions.updatePublishers(tenantId, [
        { publisherId: firstPublisher.id, isUserOptin: !original },
      ]);
      expect(flip.success).toBe(true);

      const restore = await subscriptions.updatePublishers(tenantId, [
        { publisherId: firstPublisher.id, isUserOptin: original },
      ]);
      expect(restore.success).toBe(true);
    });
  });

  describe('updateTopicGroups', () => {
    it('should round-trip a topic-group entity subscription change', async () => {
      // Find any publisher with a named topic group that has at least one entity to toggle
      let match: { publisherId: string; topicGroupName: string; entity: SubscriptionEntity } | undefined;
      for (const publisher of allPublishers) {
        const group = publisher.topicGroupEntities?.find(
          (g) => g.name !== null && (g.entities?.length ?? 0) > 0,
        );
        if (group?.name && group.entities?.length) {
          match = { publisherId: publisher.id, topicGroupName: group.name, entity: group.entities[0] };
          break;
        }
      }
      if (!match) {
        throw new Error('No publisher with a configured topic-group entity — cannot run updateTopicGroups round-trip.');
      }
      const originalState = match.entity.isSubscribed;

      // Flip the entity's subscription within the topic group
      const flip = await subscriptions.updateTopicGroups(tenantId, [
        {
          publisherId: match.publisherId,
          topicGroupName: match.topicGroupName,
          entities: [{ id: match.entity.id, type: match.entity.type ?? undefined, isSubscribed: !originalState }],
        },
      ]);
      expect(flip.success).toBe(true);

      // Restore — leave the tenant in its original state
      const restore = await subscriptions.updateTopicGroups(tenantId, [
        {
          publisherId: match.publisherId,
          topicGroupName: match.topicGroupName,
          entities: [{ id: match.entity.id, type: match.entity.type ?? undefined, isSubscribed: originalState }],
        },
      ]);
      expect(restore.success).toBe(true);
    });
  });
});
