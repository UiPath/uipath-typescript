Service for reading and updating the current user's profile and context settings.

User settings are user-supplied profile fields (name, email, role, department, company, country, timezone) that the SDK passes to a UiPath Conversational Agent on every conversation so the agent can personalize its responses. Settings are scoped to the calling user — identified by the access token for user tokens, or by the externalUserId option for app-scoped tokens.

Accessed via `conversationalAgent.user`.

## Examples

```
import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';

const conversationalAgent = new ConversationalAgent(sdk);

const settings = await conversationalAgent.user.getSettings();
console.log(settings.name, settings.email, settings.timezone);
```

```
await conversationalAgent.user.updateSettings({
  name: 'John Doe',
  timezone: 'America/New_York'
});
```

```
await conversationalAgent.user.updateSettings({
  department: null
});
```

## Methods

### getSettings()

> **getSettings**(): `Promise`\<`UserSettingsGetResponse`>

Gets the current user's profile and context settings.

Returns the full user settings record — profile fields the agent uses for personalization (name, email, role, department, company, country, timezone) plus identifiers and timestamps. Fields the user has not set are returned as `null`.

#### Returns

`Promise`\<`UserSettingsGetResponse`>

Promise resolving to the current user's settings [UserSettingsGetResponse](../UserSettingsGetResponse/)

#### Example

```
const settings = await conversationalAgent.user.getSettings();
console.log(settings.name);      // e.g. 'John Doe' or null
console.log(settings.email);     // e.g. 'john@example.com' or null
console.log(settings.timezone);  // e.g. 'America/New_York' or null
```

### updateSettings()

> **updateSettings**(`options`: `UserSettingsUpdateOptions`): `Promise`\<`UserSettingsUpdateResponse`>

Updates the current user's profile and context settings.

Accepts a partial payload — only fields included in `options` are changed. Pass `null` to explicitly clear a field. Omitting a field leaves it unchanged. Returns the full updated settings record.

#### Parameters

- `options`: `UserSettingsUpdateOptions` — Fields to update; omit fields to leave them unchanged, set to `null` to clear

#### Returns

`Promise`\<`UserSettingsUpdateResponse`>

Promise resolving to the updated user settings [UserSettingsUpdateResponse](../UserSettingsUpdateResponse/)

#### Examples

```
const updated = await conversationalAgent.user.updateSettings({
  name: 'John Doe',
  timezone: 'America/New_York'
});
```

```
await conversationalAgent.user.updateSettings({
  role: null,
  department: null
});
```
