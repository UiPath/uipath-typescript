// Data Fabric entity-operations runtime: runs an operation's handler once, giving it
// ctx.self reads and edit builders. Import-free, so it runs anywhere the handler does.
//
// The handler's reads go through the host's read function, bound to the job's platform
// context (see entityOperationHost), which the handler itself never sees.

export type Guid = string;

export type Where<T> = {
  [K in keyof T]?: T[K] | { eq?: T[K]; ne?: T[K]; gt?: T[K]; gte?: T[K]; lt?: T[K]; lte?: T[K]; in?: T[K][] };
};

export interface QueryOptions<T, K extends keyof T> {
  where?: Where<T>;
  select?: K[];
  orderBy?: { [F in keyof T]?: "asc" | "desc" };
  limit?: number;
}

/** One condition as the SDK's `queryRecords` takes it. No `value` matches an empty field. */
export interface SdkQueryFilter {
  fieldName: string;
  operator: "=" | "!=" | ">" | ">=" | "<" | "<=" | "in";
  value?: string;
  valueList?: string[];
}

/** Query options as the SDK's `queryRecords` takes them. */
export interface SdkQueryOptions {
  filterGroup?: { logicalOperator: 0; queryFilters: SdkQueryFilter[] };
  selectedFields?: string[];
  sortOptions?: { fieldName: string; isDescending: boolean }[];
  pageSize: number;
}

/** Reads one page of an entity's rows. The model binds it to the job's platform context. */
export type ReadRows = (entityName: string, options: SdkQueryOptions) => Promise<Record<string, unknown>[]>;

/** What the runtime reads through: the operation's own entity, and the bound read. */
export interface OperationHost {
  entity: string;
  read: ReadRows;
}

/** One proposed change to the operation's own entity. */
export interface Edit {
  kind: "create" | "update" | "delete";
  id?: Guid;
  fields?: { [field: string]: unknown };
}

export interface EntityReadContext<T> {
  self: {
    /** Rows of this entity, read as the job's robot in the invocation's folder: at most
     *  `limit` rows, 1000 by default and at most; a larger limit fails the run. One page;
     *  `Id` is always returned. An option or condition a read would drop fails the run. To read
     *  several rows by id, use one `where: { Id: { in: ids } }` rather than a `get` each:
     *  every read is a call to Data Fabric. A failed read left unawaited cannot end the job,
     *  nor can a promise derived from one, such as an async helper's. */
    query<K extends keyof T = keyof T>(opts?: QueryOptions<T, K>): Promise<Pick<T, K | Extract<keyof T, "Id">>[]>;
    /** One row by `Id`, or `undefined` when there is none. */
    get(id: Guid): Promise<T | undefined>;
  };
  /** Rows of another entity in the invocation's folder, by its name, read as `self.query` reads. */
  query(entityName: string, opts?: QueryOptions<Record<string, unknown>, string>): Promise<Record<string, unknown>[]>;
  /** Fixed for the whole invocation; a fresh copy on each read. */
  readonly now: Date;
  /** Who invoked the operation. */
  user: { id: string };
  /** Adds one line to this run's output, like `console.log`: strings as they are, an Error as
   *  `Name: message`, a function as `[Function: name]`, anything else as JSON, joined by a
   *  space. Never throws. The run keeps its first 200 lines; past 16 KB in all, the longest
   *  are cut to fit. */
  print(...values: unknown[]): void;
}

export interface EntityEditContext<T> extends EntityReadContext<T> {
  self: EntityReadContext<T>["self"] & {
    /** Describes a new row. Writes nothing; return it among the handler's edits. */
    create(fields: Partial<T>): Edit;
    /** Describes a change to the row `id`. Writes nothing. */
    update(id: Guid, fields: Partial<T>): Edit;
    /** Describes deleting the row `id`. Writes nothing. */
    delete(id: Guid): Edit;
  };
}

export type EntityEditHandler<T, P> = (ctx: EntityEditContext<T>, params: P) => Promise<Edit[]>;
export type EntityReadHandler<T, P> = (ctx: EntityReadContext<T>, params: P) => Promise<unknown>;

/** What Data Fabric sends the job. */
export interface OperationInput<P> {
  params: P;
  now: string;
  user: { id: string };
}

/** The job's output carries what the handler printed. `failed` is the handler's own error,
 *  message only: a stack can carry paths. */
export type OperationOutput =
  | { status: "done"; edits: Edit[]; prints: string[] }
  | { status: "done"; result: unknown; prints: string[] }
  | { status: "failed"; error: { message: string }; prints: string[] };

/** `ctx.print` keeps its first this many lines; the rest are counted in one closing
 *  `[N more lines truncated]` line. */
export const PRINT_LINE_LIMIT = 200;
/** The kept lines, joined by newlines, come to at most this many UTF-16 code units. Over it,
 *  the longest are cut to one common length, each ending `… [N chars cut]`, so every line
 *  still shows. */
export const PRINT_TEXT_LIMIT = 16 * 1024;
/** A failed handler's message is cut to this many UTF-16 code units. */
export const ERROR_MESSAGE_LIMIT = 2 * 1024;

/** Runs a Mutation's handler once, reading through the host. */
export async function runMutation<T, P>(
  handler: EntityEditHandler<T, P>,
  input: OperationInput<P>,
  host: OperationHost,
): Promise<OperationOutput> {
  ignoreAbandonedReads();
  const prints = capturePrints();
  const ctx: EntityEditContext<T> = contextFor<EntityEditContext<T>["self"]>(
    {
      ...selfReads<T>(host),
      create: (fields) => ({ kind: "create", fields: { ...fields } }),
      update: (id, fields) => ({ kind: "update", id, fields: { ...fields } }),
      delete: (id) => ({ kind: "delete", id }),
    },
    prints.print,
    input,
    host,
  );
  const settled = await settle(() => handler(ctx, input.params));
  return finish(prints, settled, (value) => {
    // The author's mistake like a throw, so it fails the same way, prints kept.
    if (!Array.isArray(value)) throw new TypeError("A Mutation handler must return an array of edits; return [] for none.");
    return { edits: value.map(toEdit) };
  });
}

/** Runs a Read's handler once, reading through the host. */
export async function runRead<T, P>(
  handler: EntityReadHandler<T, P>,
  input: OperationInput<P>,
  host: OperationHost,
): Promise<OperationOutput> {
  ignoreAbandonedReads();
  const prints = capturePrints();
  const settled = await settle(() => handler(contextFor(selfReads<T>(host), prints.print, input, host), input.params));
  return finish(prints, settled, (value) => ({ result: value === undefined ? null : value }));
}

/** The output, which ends the prints. Whatever the handler threw, or returned malformed, is `failed`. */
function finish<R>(
  prints: Pick<Prints, "endPrints">,
  settled: Settled<R>,
  done: (value: R) => { edits: Edit[] } | { result: unknown },
): OperationOutput {
  const lines = prints.endPrints();
  if (!settled.ok) return { status: "failed", error: { message: failureMessage(settled.error) }, prints: lines };
  try {
    const payload = done(settled.value);
    assertSendable(payload);
    return { status: "done", ...payload, prints: lines };
  } catch (error) {
    return { status: "failed", error: { message: failureMessage(error) }, prints: lines };
  }
}

/** The job's output goes out as JSON after this returns, so a value JSON cannot write (a
 *  bigint, an object inside itself) would fault the job and lose its prints. Failed here instead. */
function assertSendable(payload: unknown): void {
  try {
    JSON.stringify(payload);
  } catch (error) {
    throw new TypeError(`The handler returned a value that cannot be sent as JSON: ${failureMessage(error)}`);
  }
}

/** The message only, cut to its limit; a value that cannot become text says so instead. */
function failureMessage(error: unknown): string {
  let message: string;
  try {
    message = String((error as { message?: unknown } | null | undefined)?.message ?? error);
    // An Error thrown without a message still says what it was.
    if (message === "" && error instanceof Error) message = String(error.name);
  } catch {
    message = "The handler failed with a value that cannot be shown as text.";
  }
  return message.length > ERROR_MESSAGE_LIMIT ? message.slice(0, ERROR_MESSAGE_LIMIT) : message;
}

/** `ctx.self`'s reads: the host's read of the operation's own entity. */
function selfReads<T>(host: OperationHost): EntityReadContext<T>["self"] {
  return {
    // The row type's keys are field names, which is what the translation takes.
    query: (opts) => readThrough(host, host.entity, opts as QueryOptions<Record<string, unknown>, string> | undefined) as Promise<never[]>,
    get: (id) => {
      if (typeof id !== "string") {
        throw readError(new TypeError(`ctx.self.get needs a row's Id, a string; it was given ${id === null ? "null" : typeof id}.`));
      }
      return handled(readThrough(host, host.entity, { where: { Id: id }, limit: 1 }).then((rows) => rows[0] as T | undefined));
    },
  };
}

/** An entity name as Data Fabric allows one. The SDK puts the name in the request path
 *  unencoded, so anything more could aim the robot's read at another route. */
export const ENTITY_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,99}$/;

/** One read through the host. An empty `in` list matches no row, and Data Fabric refuses
 *  one, so that read is answered with no rows and never sent. */
function readThrough(
  host: OperationHost,
  entityName: string,
  opts?: QueryOptions<Record<string, unknown>, string>,
): Promise<Record<string, unknown>[]> {
  try {
    if (typeof entityName !== "string" || !ENTITY_NAME_PATTERN.test(entityName)) {
      throw new TypeError(
        `${shown(entityName)} is not an entity name: a letter, then letters, digits or underscores, 3 to 100 characters. Nothing was read.`,
      );
    }
    const options = toSdkOptions(opts);
    const matchesNothing = options.filterGroup?.queryFilters.some((filter) => filter.valueList?.length === 0) ?? false;
    return handled(matchesNothing ? Promise.resolve([]) : host.read(entityName, options));
  } catch (error) {
    throw readError(error);
  }
}

/** Marks a read's rejection as handled, so a read the handler starts and never awaits cannot
 *  end the job. The same promise is returned, so awaiting it still throws. */
function handled<R>(promise: Promise<R>): Promise<R> {
  promise.catch(readError);
  return promise;
}

/** Every error a read failed with, so a rejection derived from one is told from the author's own. */
const readErrors = new WeakSet<object>();

function readError(error: unknown): unknown {
  if (error !== null && (typeof error === "object" || typeof error === "function")) readErrors.add(error);
  return error;
}

/** Just enough of Node's `process` to watch rejections. */
interface RejectionHost {
  on(event: "unhandledRejection", listener: (reason: unknown) => void): unknown;
  listenerCount(event: "unhandledRejection"): number;
  execArgv?: string[];
  env?: { NODE_OPTIONS?: string };
}

let ignoring = false;

/** A promise the author derives from a read and leaves unawaited, such as an async helper's,
 *  rejects with nobody listening when the read fails, and Node would end the job there, output
 *  and prints lost. Such a rejection is ignored: the run fails on the read it awaits, or never
 *  needed this one. Any other still ends the job, as Node's default does. A process that sets
 *  its own rejection mode is left alone. */
function ignoreAbandonedReads(): void {
  const node = (globalThis as { process?: Partial<RejectionHost> }).process;
  if (ignoring || typeof node?.on !== "function" || typeof node.listenerCount !== "function") return;
  if ([...(node.execArgv ?? []), node.env?.NODE_OPTIONS ?? ""].some((flag) => flag.includes("--unhandled-rejections"))) return;
  const host = node as RejectionHost;
  ignoring = true;
  host.on("unhandledRejection", (reason) => {
    if (reason !== null && (typeof reason === "object" || typeof reason === "function") && readErrors.has(reason)) return;
    // With no other listener, Node's default: the rejection ends the process.
    if (host.listenerCount("unhandledRejection") === 1) throw reason;
  });
}

interface Prints {
  print: (...values: unknown[]) => void;
  /** The run's lines; a print after it is ignored. */
  endPrints: () => string[];
}

/** One printed line: its text, kept only up to the text limit since no line can show more,
 *  and its full length. */
interface PrintedLine {
  text: string;
  length: number;
}

function capturePrints(): Prints {
  const lines: PrintedLine[] = [];
  let dropped = 0;
  let ended = false;
  return {
    print: (...values) => {
      if (ended) return;
      // Past the line limit nothing more is kept, so the output never skips a line.
      if (lines.length === PRINT_LINE_LIMIT) {
        dropped++;
        return;
      }
      const line = values.map(printed).join(" ");
      // A copy of a long line's head: a plain slice would keep the whole line alive.
      const text = line.length > PRINT_TEXT_LIMIT ? line.slice(0, PRINT_TEXT_LIMIT).split("").join("") : line;
      lines.push({ text, length: line.length });
    },
    endPrints: () => {
      ended = true;
      const kept = fitPrints(lines);
      return dropped > 0 ? [...kept, `[${dropped} more lines truncated]`] : kept;
    },
  };
}

/** The lines, whole when they fit the text limit together. Otherwise every line longer than
 *  one common length is cut to it: the largest length that fits, so a short line printed after
 *  a long one still shows whole. What equal shares leave over goes one unit each to the last
 *  cut lines, so ties are cut left to right. */
function fitPrints(lines: readonly PrintedLine[]): string[] {
  // The room for text once the newlines between the lines are counted.
  let room = PRINT_TEXT_LIMIT - Math.max(0, lines.length - 1);
  if (lines.reduce((sum, line) => sum + line.length, 0) <= room) return lines.map((line) => line.text);
  const lengths = lines.map((line) => line.length).sort((a, b) => a - b);
  let share = 0;
  let cutCount = 0;
  // Shortest first: a line stays whole while an equal share of the room left would still cover it.
  for (let index = 0; index < lengths.length; index++) {
    cutCount = lengths.length - index;
    if (lengths[index] * cutCount > room) {
      share = Math.floor(room / cutCount);
      break;
    }
    room -= lengths[index];
  }
  const widened = room - share * cutCount;
  let cut = 0;
  return lines.map((line) => {
    if (line.length <= share) return line.text;
    cut++;
    return cutLine(line, cut > cutCount - widened ? share + 1 : share);
  });
}

/** What a cut line ends with, counting the code units it lost. */
const marker = (lost: number) => `… [${lost} chars cut]`;

/** The line in at most `to` code units, its end saying how many it lost. */
function cutLine(line: PrintedLine, to: number): string {
  if (line.length <= to) return line.text;
  // The marker counts what it replaces, so it widens as less is kept.
  let keep = to;
  while (keep > 0 && keep + marker(line.length - keep).length > to) keep--;
  // Never half a surrogate pair.
  const last = line.text.charCodeAt(keep - 1);
  if (last >= 0xd800 && last <= 0xdbff) keep--;
  return line.text.slice(0, keep) + marker(line.length - keep);
}

/** One print argument as text: a string as it is, a Date as its ISO time, an Error as
 *  `Name: message`, a function as `[Function: name]`, another object or null as JSON with
 *  `[Circular]` for an object inside itself, and any other value as `String` shows it — as
 *  JSON would where JSON can write it, and `undefined`, a symbol, a bigint or `NaN` where it
 *  cannot. A value that throws on the way, such as a revoked proxy, is `[unprintable]`. */
function printed(value: unknown): string {
  try {
    if (typeof value === "string") return value;
    if (typeof value === "function") return value.name ? `[Function: ${String(value.name)}]` : "[Function (anonymous)]";
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
    if (value === null || typeof value === "object") {
      try {
        const error = value === null ? undefined : errorText(value);
        if (error !== undefined) return error;
        const json = JSON.stringify(value, jsonReplacer());
        if (json !== undefined) return json;
      } catch {
        // A getter or toJSON that throws: fall back to String below.
      }
    }
    return String(value);
  } catch {
    return "[unprintable]";
  }
}

/** An Error, or a plain object holding only a string `name` and `message`, as `console.log`
 *  shows it — without the stack, which can carry the job's file paths. */
function errorText(value: object): string | undefined {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes("name") || !keys.includes("message")) return undefined;
  const { name, message } = value as { name: unknown; message: unknown };
  return typeof name === "string" && typeof message === "string" ? `${name}: ${message}` : undefined;
}

/** Marks a value already being written further up as `[Circular]` (a value merely shared
 *  by two members is written twice), writes an Error as `Name: message`, and a bigint,
 *  which JSON refuses, as digits. */
function jsonReplacer(): (this: unknown, key: string, value: unknown) => unknown {
  const ancestors: unknown[] = [];
  return function (this: unknown, _key: string, value: unknown): unknown {
    if (typeof value === "bigint") return value.toString();
    if (value === null || typeof value !== "object") return value;
    const error = errorText(value);
    if (error !== undefined) return error;
    // `this` is the object holding `value`; anything above it on the stack is finished.
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) ancestors.pop();
    if (ancestors.includes(value)) return "[Circular]";
    ancestors.push(value);
    return value;
  };
}

function contextFor<S>(
  self: S,
  print: (...values: unknown[]) => void,
  input: OperationInput<unknown>,
  host: OperationHost,
): { self: S; query: EntityReadContext<unknown>["query"]; readonly now: Date; user: { id: string }; print: (...values: unknown[]) => void } {
  const at = new Date(input.now).getTime();
  return {
    self,
    query: (entityName, opts) => readThrough(host, entityName, opts),
    // A fresh Date each time, so a handler that changes one cannot move `now`.
    get now() {
      return new Date(at);
    },
    user: input.user,
    print,
  };
}

export const READ_LIMIT = 1000;
const OPERATORS = { eq: "=", ne: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=", in: "in" } as const;
const QUERY_OPTIONS = ["where", "select", "orderBy", "limit"];

/** The query options the author wrote, as the SDK's `queryRecords` takes them: one AND group,
 *  values as strings, `Id` always selected, one page of at most READ_LIMIT rows. Whatever the
 *  translation would drop, and so widen the read, is refused where it was written. */
export function toSdkOptions(options?: QueryOptions<Record<string, unknown>, string>): SdkQueryOptions {
  const given: unknown = options;
  if (given !== undefined && given !== null && !isObject(given)) {
    throw new TypeError(`A query's options must be an object; they were ${shown(given)}.`);
  }
  for (const name of Object.keys(options ?? {})) {
    if (!QUERY_OPTIONS.includes(name)) throw new TypeError(`${name} is not a query option; use where, select, orderBy or limit.`);
  }
  const limit = options?.limit ?? READ_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > READ_LIMIT) {
    throw new RangeError(`limit must be a whole number from 1 to ${READ_LIMIT}; it was ${String(limit)}.`);
  }
  return {
    ...filterGroupOf(options?.where),
    ...selectedFieldsOf(options?.select),
    ...sortOptionsOf(options?.orderBy),
    pageSize: limit,
  };
}

function filterGroupOf(where: unknown): Pick<SdkQueryOptions, "filterGroup"> {
  if (where === undefined || where === null) return {};
  if (!isObject(where)) throw new TypeError(`where must be an object of conditions by field name; it was ${shown(where)}.`);
  const queryFilters: SdkQueryFilter[] = [];
  for (const [field, condition] of Object.entries(where)) {
    // A condition the author meant and could not fill: dropped, it would widen the read to every row.
    if (condition === undefined) {
      throw new TypeError(
        `where.${field} is undefined, so the condition would be dropped and every row read. ` +
          "Add the condition only when there is a value to compare with; use null to match an empty field.",
      );
    }
    if (!isObject(condition)) {
      queryFilters.push(filterOf(field, "=", condition));
      continue;
    }
    const comparisons = Object.entries(condition);
    if (comparisons.length === 0) {
      throw new TypeError(`where.${field} is an empty condition, so it would be dropped and every row read. Give it an operator, or leave ${field} out.`);
    }
    for (const [name, operand] of comparisons) {
      const operator = Object.prototype.hasOwnProperty.call(OPERATORS, name) ? OPERATORS[name as keyof typeof OPERATORS] : undefined;
      if (!operator) throw new TypeError(`where.${field}.${name} is not an operator; use eq, ne, gt, gte, lt, lte or in.`);
      if (operand === undefined || (Array.isArray(operand) && operand.includes(undefined))) {
        throw new TypeError(`where.${field}.${name} is or holds undefined; give it values, or use null to match an empty field.`);
      }
      if (operator === "in") {
        if (!Array.isArray(operand)) throw new TypeError(`where.${field}.in needs an array of values.`);
        if (operand.includes(null)) {
          throw new TypeError(`where.${field}.in cannot hold null; use a separate null condition to match an empty field.`);
        }
        queryFilters.push({ fieldName: field, operator, valueList: operand.map(filterValue) });
      } else {
        queryFilters.push(filterOf(field, operator, operand));
      }
    }
  }
  return queryFilters.length > 0 ? { filterGroup: { logicalOperator: 0, queryFilters } } : {};
}

function selectedFieldsOf(select: unknown): Pick<SdkQueryOptions, "selectedFields"> {
  if (select === undefined || select === null) return {};
  if (!Array.isArray(select)) throw new TypeError(`select must be a list of field names; it was ${shown(select)}.`);
  for (const field of select) {
    if (typeof field !== "string") throw new TypeError(`select must list field names as strings; one was ${shown(field)}.`);
  }
  return { selectedFields: [...new Set(["Id", ...(select as string[])])] };
}

function sortOptionsOf(orderBy: unknown): Pick<SdkQueryOptions, "sortOptions"> {
  if (orderBy === undefined || orderBy === null) return {};
  if (!isObject(orderBy)) throw new TypeError(`orderBy must be an object of "asc" or "desc" by field name; it was ${shown(orderBy)}.`);
  return {
    sortOptions: Object.entries(orderBy).map(([fieldName, direction]) => {
      if (direction !== "asc" && direction !== "desc") {
        throw new TypeError(`orderBy.${fieldName} must be "asc" or "desc"; it was ${shown(direction)}.`);
      }
      return { fieldName, isDescending: direction === "desc" };
    }),
  };
}

/** An object of named members: not null, a list or a Date, which a query reads as a value. */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

/** A value as a refusal names it: a string quoted, anything else by its type. */
function shown(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : value === null ? "null" : typeof value;
}

/** No value is how Data Fabric's query spells an empty field: `=` reads as IS NULL, `!=` as IS NOT NULL. */
function filterOf(fieldName: string, operator: SdkQueryFilter["operator"], operand: unknown): SdkQueryFilter {
  return operand === null ? { fieldName, operator } : { fieldName, operator, value: filterValue(operand) };
}

function filterValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  throw new TypeError(`A where value must be a string, number, boolean, Date or null; it was ${value === null ? "null" : typeof value}.`);
}

type Settled<R> = { ok: true; value: R } | { ok: false; error: unknown };

async function settle<R>(run: () => Promise<R>): Promise<Settled<R>> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    return { ok: false, error };
  }
}

function toEdit(edit: Edit, index: number): Edit {
  if (edit === null || typeof edit !== "object") {
    throw new TypeError(`Edit #${index + 1} is not an edit; build edits with ctx.self.create, update or delete.`);
  }
  const out: Edit = { kind: edit.kind };
  if (edit.id !== undefined) out.id = edit.id;
  if (edit.fields !== undefined) out.fields = edit.fields;
  return out;
}
