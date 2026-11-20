import { isRecord } from '../../utils/object';

const HOST_KEY = Symbol.for('uipath.host.v1');

export function hostCapability(name: string, major: number): unknown {
  try {
    const host: unknown = Reflect.get(globalThis, HOST_KEY);
    return isRecord(host) && typeof host.capability === 'function' ? host.capability(name, major) : undefined;
  } catch (error) {
    console.warn(`[UiPath SDK] The host could not answer for ${name}@${major}:`, error);
    return undefined;
  }
}
