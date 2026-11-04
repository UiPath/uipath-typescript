// GET /folders: the folders the caller can deploy into, in the current tenant.

import { defineFunction, defineSchema, FunctionError } from './_sdk-shim.ts';
import { AppsClient, type Folder } from './_apps.ts';

interface Input {}
interface Output {
  tenantName: string;
  folders: Folder[];
}

export default defineFunction({
  name: 'folders',
  method: 'GET',
  path: '/folders',
  input: defineSchema<Input>(),
  output: defineSchema<Output>(),
  handler: async (_input, ctx): Promise<Output> => {
    const token = ctx.user?.accessToken;
    if (!token) throw new FunctionError('Unauthorized', 401);
    if (!ctx.platform) throw new FunctionError('Platform context missing', 500);
    const apps = new AppsClient({ baseUrl: ctx.platform.baseUrl, orgId: ctx.platform.orgId, tenantId: ctx.platform.tenantId, accessToken: token });
    return { tenantName: '', folders: await apps.folders() };
  },
});
