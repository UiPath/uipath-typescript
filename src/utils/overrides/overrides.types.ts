/** The overrides table as a producer publishes it: `"<resourceType>.<resourceKey>"` → target
 *  properties. Keys are the publisher's data and are matched **case-sensitively**, exactly as
 *  published. `resourceKey` is a name, optionally suffixed with the folder the name was designed
 *  against; producers that resolve the folder themselves put it in the properties and emit the
 *  two-segment form. */
export type ResourceOverrides = Record<string, Record<string, string>>;

/** The fields a lookup acts on, projected out of a table entry's property bag. */
export interface ResourceOverride {
  name?: string;
  folderPath?: string;
}
