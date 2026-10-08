// Each case declares its handler beside the assertion it drives, so the handlers stay local.
/* oxlint-disable unicorn/consistent-function-scoping */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
    ERROR_MESSAGE_LIMIT,
    PRINT_LINE_LIMIT,
    PRINT_TEXT_LIMIT,
    READ_LIMIT,
    runMutation,
    runRead,
    toSdkOptions,
    type EntityEditHandler,
    type EntityReadHandler,
    type OperationHost,
    type OperationInput,
} from "../../../../src/services/data-fabric/operations-runtime";

interface Invoice {
    Id: string;
    Total: number;
    Status: string | null;
}

interface Params {
    Ceiling: number;
}

const NOW = "2026-09-24T09:00:00.000Z";

function input(): OperationInput<Params> {
    return { params: { Ceiling: 500 }, now: NOW, user: { id: "caller-1" } };
}

/** What a run that failed with this message, having printed nothing, returns. */
function failed(message: unknown) {
    return { status: "failed", error: { message }, prints: [] };
}

const ROWS = [
    { Id: "a", Total: 100 },
    { Id: "b", Total: 900 },
];

/** A host whose every read of the operation's entity answers these rows. */
function host(rows: Record<string, unknown>[] = ROWS): OperationHost {
    return { entity: "Invoice", read: async () => rows };
}

const RUNTIME_PATH = fileURLToPath(new URL("../../../../src/services/data-fabric/operations-runtime.ts", import.meta.url));

describe("the runtime module", () => {
    it("imports nothing, so it runs anywhere the handler does", () => {
        const source = readFileSync(RUNTIME_PATH, "utf8");
        expect(source).not.toMatch(/^\s*import\s/m);
        expect(source).not.toMatch(/\brequire\(/);
        expect(source).not.toMatch(/\bfrom\s+["']/);
    });
});

describe("toSdkOptions", () => {
    it("defaults to one page of the read limit", () => {
        expect(toSdkOptions()).toEqual({ pageSize: READ_LIMIT });
    });
    it("maps a bare value to =, as a string", () => {
        expect(toSdkOptions({ where: { Status: "PENDING", Total: 5, Paid: false } }).filterGroup).toEqual({
            logicalOperator: 0,
            queryFilters: [
                { fieldName: "Status", operator: "=", value: "PENDING" },
                { fieldName: "Total", operator: "=", value: "5" },
                { fieldName: "Paid", operator: "=", value: "false" },
            ],
        });
    });
    it("maps every operator, in through valueList", () => {
        const f = toSdkOptions({ where: { A: { ne: 1, gt: 2, gte: 3, lt: 4, lte: 5 }, B: { in: ["x", "y"] } } }).filterGroup!.queryFilters;
        expect(f).toEqual([
            { fieldName: "A", operator: "!=", value: "1" }, { fieldName: "A", operator: ">", value: "2" },
            { fieldName: "A", operator: ">=", value: "3" }, { fieldName: "A", operator: "<", value: "4" },
            { fieldName: "A", operator: "<=", value: "5" }, { fieldName: "B", operator: "in", valueList: ["x", "y"] },
        ]);
    });
    it("sends no value for null, which Data Fabric reads as an empty field", () => {
        expect(toSdkOptions({ where: { Owner: null, Code: { ne: null } } }).filterGroup!.queryFilters).toEqual([
            { fieldName: "Owner", operator: "=" }, { fieldName: "Code", operator: "!=" },
        ]);
    });
    it("writes a Date as ISO text", () => {
        const at = new Date("2026-09-25T10:00:00Z");
        expect(toSdkOptions({ where: { Due: { lt: at } } }).filterGroup!.queryFilters[0].value).toBe("2026-09-25T10:00:00.000Z");
    });
    it("always selects Id, orders sort options by member order", () => {
        expect(toSdkOptions({ select: ["Total"], orderBy: { Total: "desc", Name: "asc" }, limit: 10 })).toEqual({
            selectedFields: ["Id", "Total"],
            sortOptions: [{ fieldName: "Total", isDescending: true }, { fieldName: "Name", isDescending: false }],
            pageSize: 10,
        });
    });
    it("refuses a limit outside 1..1000, an unknown operator and an undefined value", () => {
        expect(() => toSdkOptions({ limit: 1001 })).toThrow(/1 to 1000/);
        expect(() => toSdkOptions({ limit: 0 })).toThrow(/1 to 1000/);
        expect(() => toSdkOptions({ where: { A: { like: "x" } as never } })).toThrow(/not an operator/);
        expect(() => toSdkOptions({ where: { A: undefined } })).toThrow(/undefined/);
    });
    it("refuses null inside an in-list, which a condition of its own matches", () => {
        expect(() => toSdkOptions({ where: { Status: { in: ["A", null] } } })).toThrow(
            "where.Status.in cannot hold null; use a separate null condition to match an empty field.",
        );
    });
    it("refuses an empty condition, which would otherwise read every row", () => {
        expect(() => toSdkOptions({ where: { Status: {} } })).toThrow(
            "where.Status is an empty condition, so it would be dropped and every row read. Give it an operator, or leave Status out.",
        );
    });
    it("refuses a query option it does not know, a misspelling included", () => {
        for (const name of ["filter", "Where", "take", "orderby"]) {
            expect(() => toSdkOptions({ [name]: { Status: "PENDING" } } as never)).toThrow(
                `${name} is not a query option; use where, select, orderBy or limit.`,
            );
        }
        expect(() => toSdkOptions("Status" as never)).toThrow('A query\'s options must be an object; they were "Status".');
    });
    it("refuses an operator it does not know, one inherited from Object included", () => {
        for (const name of ["like", "constructor", "toString", "__proto__"]) {
            const condition = JSON.parse(`{"${name}": "x"}`) as never;
            expect(() => toSdkOptions({ where: { A: condition } }), name).toThrow(`where.A.${name} is not an operator; use eq, ne, gt, gte, lt, lte or in.`);
        }
    });
    it("refuses an orderBy direction other than asc or desc", () => {
        for (const direction of ["descending", "DESC", 1, true, null]) {
            expect(() => toSdkOptions({ orderBy: { Total: direction as never } }), String(direction)).toThrow(/^orderBy\.Total must be "asc" or "desc"; it was /);
        }
        expect(() => toSdkOptions({ orderBy: { Total: "DESC" as never } })).toThrow('orderBy.Total must be "asc" or "desc"; it was "DESC".');
        expect(() => toSdkOptions({ orderBy: ["Total"] as never })).toThrow('orderBy must be an object of "asc" or "desc" by field name; it was object.');
    });
    it("refuses a select naming a non-string, or one that is not a list", () => {
        for (const field of [1, null, undefined, {}, ["Total"]]) {
            expect(() => toSdkOptions({ select: ["Total", field as never] }), String(field)).toThrow(/^select must list field names as strings; one was /);
        }
        expect(() => toSdkOptions({ select: "Total" as never })).toThrow('select must be a list of field names; it was "Total".');
    });
    it("refuses a where that is not an object of conditions", () => {
        for (const where of ["Status", ["Status"], 5, new Date()]) {
            expect(() => toSdkOptions({ where: where as never }), String(where)).toThrow(/^where must be an object of conditions by field name; it was /);
        }
    });
    it("reads as no option an option that is null, and an empty where or orderBy as none", () => {
        expect(toSdkOptions({ where: null, select: null, orderBy: null, limit: null } as never)).toEqual({ pageSize: READ_LIMIT });
        expect(toSdkOptions({ where: {} })).toEqual({ pageSize: READ_LIMIT });
        expect(toSdkOptions(null as never)).toEqual({ pageSize: READ_LIMIT });
    });
});

describe("one run, reads through the host", () => {
    const input = { params: { Limit: 10 }, now: "2026-09-25T10:00:00Z", user: { id: "u1" } };
    const hostWith = (rows: Record<string, Record<string, unknown>[]>) => {
        const calls: { entity: string; options: unknown }[] = [];
        const host: OperationHost = { entity: "Invoice", read: async (entity, options) => { calls.push({ entity, options }); return rows[entity] ?? []; } };
        return { host, calls };
    };

    it("runs a Mutation once, reading through the host", async () => {
        const { host, calls } = hostWith({ Invoice: [{ Id: "a", Total: 5 }] });
        const out = await runMutation<{ Id: string; Total: number; Status: string }, { Limit: number }>(async (ctx, p) => {
            const rows = await ctx.self.query({ where: { Total: { lte: p.Limit } }, select: ["Total"] });
            ctx.print("rows", rows.length);
            return rows.map((r) => ctx.self.update(r.Id, { Status: "OK" }));
        }, input, host);
        expect(out).toEqual({ status: "done", edits: [{ kind: "update", id: "a", fields: { Status: "OK" } }], prints: ["rows 1"] });
        expect(calls).toEqual([{ entity: "Invoice", options: {
            filterGroup: { logicalOperator: 0, queryFilters: [{ fieldName: "Total", operator: "<=", value: "10" }] },
            selectedFields: ["Id", "Total"], pageSize: 1000 } }]);
    });

    it("ctx.query reads another entity; ctx.self.get reads one row", async () => {
        const { host, calls } = hostWith({ Supplier: [{ Id: "s", Name: "Acme" }], Invoice: [{ Id: "a" }] });
        const out = await runRead(async (ctx) => ({ s: await ctx.query("Supplier", { where: { Name: "Acme" } }), one: await ctx.self.get("a") }), input, host);
        expect(out).toEqual({ status: "done", result: { s: [{ Id: "s", Name: "Acme" }], one: { Id: "a" } }, prints: [] });
        expect(calls.map((c) => c.entity)).toEqual(["Supplier", "Invoice"]);
        expect(calls[1].options).toEqual({ filterGroup: { logicalOperator: 0, queryFilters: [{ fieldName: "Id", operator: "=", value: "a" }] }, pageSize: 1 });
    });

    it("a failed read fails the run with its message, prints kept", async () => {
        const host: OperationHost = { entity: "Invoice", read: async () => { throw new Error("403 Forbidden"); } };
        const out = await runRead(async (ctx) => { ctx.print("before"); return ctx.self.query(); }, input, host);
        expect(out).toEqual({ status: "failed", error: { message: "403 Forbidden" }, prints: ["before"] });
    });

    it("the handler's ctx holds no platform context, token or read function", async () => {
        const token = "SECRET-TOKEN";
        // As the model's closure does: the host's read holds the platform context and its token.
        const platform = { robot: { accessToken: token } };
        const host: OperationHost = { entity: "Invoice", read: async () => (platform.robot.accessToken ? [] : []) };
        let captured: unknown;
        await runRead(async (ctx) => { captured = ctx; return null; }, input, host);
        const c = captured as Record<string, unknown>;
        expect(Object.keys(c).sort()).toEqual(["now", "print", "query", "self", "user"]);
        expect(Object.keys(c.self as object).sort()).toEqual(["get", "query"]);
        const seen = reachable(c);
        expect(seen.some((v) => v === host || v === host.read || v === platform || v === platform.robot)).toBe(false);
        expect(seen.some((v) => typeof v === "string" && v.includes(token))).toBe(false);
    });

    it("reads nothing for an empty in-list, which matches no row, without calling read", async () => {
        const { host, calls } = hostWith({ Invoice: [{ Id: "a" }], Supplier: [{ Id: "s" }] });
        const out = await runRead(async (ctx) => ({
            own: await ctx.self.query({ where: { Id: { in: [] } } }),
            other: await ctx.query("Supplier", { where: { Status: "OPEN", Id: { in: [] } } }),
        }), input, host);
        expect(out).toEqual({ status: "done", result: { own: [], other: [] }, prints: [] });
        expect(calls).toEqual([]);
    });
});

describe("an entity name", () => {
    const input = { params: {}, now: "2026-09-25T10:00:00Z", user: { id: "u1" } };
    const reading = () => {
        const names: string[] = [];
        const host: OperationHost = { entity: "Invoice", read: async (entity) => { names.push(entity); return []; } };
        return { host, names };
    };

    it("refuses anything but a plain entity name before reading, the path escapes included", async () => {
        const escapes: unknown[] = [
            // Aimed at Data Fabric's insert route, and at Orchestrator's StartJobs.
            "Target/insert#",
            "../../../orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs?",
            "..",
            "Supplier/../Invoice",
            "Supplier?x=1",
            "Supplier#x",
            "Supplier%2Fquery",
            "Supplier Name",
            "1Supplier",
            "_Supplier",
            "ab",
            "a".repeat(101),
            "",
            undefined,
            null,
            { toString: () => "Supplier" },
        ];
        for (const name of escapes) {
            const { host, names } = reading();
            const out = await runRead(async (ctx) => ctx.query(name as string), input, host);
            expect(out.status, String(name)).toBe("failed");
            expect(out.status === "failed" ? out.error.message : "").toMatch(/is not an entity name: .*Nothing was read\.$/);
            expect(names).toEqual([]);
        }
    });

    it("says which name it refused", async () => {
        const out = await runRead(async (ctx) => ctx.query("Target/insert#"), input, reading().host);
        expect(out).toEqual(failed('"Target/insert#" is not an entity name: a letter, then letters, digits or underscores, 3 to 100 characters. Nothing was read.'));
    });

    it("reads one with underscores and digits, up to 100 characters, as Data Fabric names allow", async () => {
        const { host, names } = reading();
        const long = `S${"a".repeat(99)}`;
        const out = await runRead(async (ctx) => [await ctx.query("Supplier_Invoice2"), await ctx.query(long)], input, host);
        expect(out.status).toBe("done");
        expect(names).toEqual(["Supplier_Invoice2", long]);
    });

    it("refuses the operation's own entity too, should the host carry a bad one", async () => {
        const names: string[] = [];
        const bad: OperationHost = { entity: "Invoice/delete#", read: async (entity) => { names.push(entity); return []; } };
        const out = await runRead(async (ctx) => [await ctx.self.query(), await ctx.self.get("a")], input, bad);
        expect(out.status).toBe("failed");
        expect(names).toEqual([]);
    });
});

/** Every value reachable from `root` through own properties, getters read, with each function's source. */
function reachable(root: unknown): unknown[] {
    const seen: unknown[] = [];
    const visit = (value: unknown): void => {
        if (seen.includes(value)) return;
        seen.push(value);
        if (typeof value === "function") seen.push(String(value));
        if (value === null || (typeof value !== "object" && typeof value !== "function")) return;
        for (const key of Reflect.ownKeys(value)) {
            let member: unknown;
            try {
                member = (value as Record<PropertyKey, unknown>)[key];
            } catch {
                continue;
            }
            visit(member);
        }
    };
    visit(root);
    return seen;
}

/** Runs these lines as a module in a Node process of its own, with `runRead`, `input` and `later(ms)`
 *  in scope: Vitest's own rejection listener would hide a crash. */
function inNode(lines: string[]) {
    const dir = mkdtempSync(join(tmpdir(), "entity-operations-"));
    try {
        const runtime = join(dir, "runtime.mjs");
        const { outputText } = ts.transpileModule(readFileSync(RUNTIME_PATH, "utf8"), {
            compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
        });
        writeFileSync(runtime, outputText);
        const script = join(dir, "run.mjs");
        writeFileSync(
            script,
            [
                `const { runRead } = await import(${JSON.stringify(new URL(`file://${runtime}`).href)});`,
                "const input = { params: {}, now: '2026-09-25T10:00:00.000Z', user: { id: 'u' } };",
                "const later = (ms) => new Promise((resolve) => setTimeout(resolve, ms));",
                ...lines,
            ].join("\n"),
        );
        return spawnSync(process.execPath, ["--no-warnings", script], { encoding: "utf8" });
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

describe("a read nobody awaits", () => {
    it("cannot end the job: the run fails with the first failure, its prints kept", () => {
        const run = inNode([
            "const host = { entity: 'Invoice', read: async () => { throw new Error('403 Forbidden'); } };",
            "const sequential = async (ctx) => { const a = ctx.self.query(); const b = ctx.query('Supplier'); ctx.print('start'); await a; await b; return 1; };",
            "const mapped = async (ctx) => { const got = ['x', 'y', 'z'].map((id) => ctx.self.get(id)); ctx.print('start'); for (const row of got) await row; return 1; };",
            "const outputs = [await runRead(sequential, input, host), await runRead(mapped, input, host)];",
            "await later(20);",
            "console.log(JSON.stringify(outputs));",
        ]);
        expect(run.stderr).toBe("");
        expect(run.status).toBe(0);
        const failed = { status: "failed", error: { message: "403 Forbidden" }, prints: ["start"] };
        expect(JSON.parse(run.stdout)).toEqual([failed, failed]);
    });

    it("cannot end the job through the author's own async helper, whenever the helper's read fails", () => {
        const run = inNode([
            // Supplier fails at once; Invoice fails, or answers, only after the run has ended.
            "const host = (invoiceFails) => ({ entity: 'Invoice', read: async (name) => {",
            "  if (name === 'Supplier') throw new Error('403 Forbidden');",
            "  await later(10);",
            "  if (invoiceFails) throw new Error('Invoice 403');",
            "  return [{ Id: 'a' }];",
            "} });",
            "const count = async (ctx, name) => (await ctx.query(name)).length;",
            "const both = async (ctx) => { const a = count(ctx, 'Supplier'); const b = count(ctx, 'Invoice'); ctx.print('start'); return (await a) + (await b); };",
            "const second = async (ctx) => { const a = count(ctx, 'Invoice'); const b = count(ctx, 'Supplier'); ctx.print('start'); return (await a) + (await b); };",
            "const refused = async (ctx) => { const a = count(ctx, 'Supplier'); const b = count(ctx, 'Target/insert#'); ctx.print('start'); return (await a) + (await b); };",
            "const outputs = [await runRead(both, input, host(true)), await runRead(second, input, host(false)), await runRead(refused, input, host(false))];",
            "await later(40);",
            "console.log(JSON.stringify(outputs));",
        ]);
        expect(run.stderr).toBe("");
        expect(run.status).toBe(0);
        const failed = { status: "failed", error: { message: "403 Forbidden" }, prints: ["start"] };
        expect(JSON.parse(run.stdout)).toEqual([failed, failed, failed]);
    });

    it("still lets the author's own unhandled rejection end the job, as Node does", () => {
        const run = inNode([
            "const host = { entity: 'Invoice', read: async () => [] };",
            "await runRead(async (ctx) => { await ctx.self.query(); void Promise.reject(new Error('the author\\'s own')); return 1; }, input, host);",
            "await later(20);",
            "console.log('still running');",
        ]);
        expect(run.status).not.toBe(0);
        expect(run.stdout).not.toContain("still running");
        expect(run.stderr).toContain("the author's own");
    });
});

describe("a where that would read every row", () => {
    it("refuses a where value that is undefined", async () => {
        const params: { Customer?: string } = {};
        const widening: EntityEditHandler<Invoice, Params> = async (ctx) => {
            const rows = await ctx.self.query({ where: { Status: params.Customer } });
            return rows.map((row) => ctx.self.delete(row.Id));
        };
        expect(await runMutation(widening, input(), host())).toEqual(failed(expect.stringContaining("where.Status is undefined")));
    });

    it("refuses an undefined operand too", async () => {
        const ceiling: number | undefined = undefined;
        const widening: EntityReadHandler<Invoice, Params> = async (ctx) => ctx.self.query({ where: { Total: { lte: ceiling } } });
        expect(await runRead(widening, input(), host())).toEqual(failed(expect.stringContaining("where.Total.lte is or holds undefined")));
    });

    it("refuses an undefined inside an in-list", async () => {
        const params: { second?: string } = {};
        const widening: EntityReadHandler<Invoice, Params> = async (ctx) =>
            ctx.self.query({ where: { Status: { in: ["PENDING", params.second as string] } } });
        expect(await runRead(widening, input(), host())).toEqual(failed(expect.stringContaining("where.Status.in is or holds undefined")));
    });

    it("refuses a condition built empty, and a misspelled option, before reading or deleting anything", async () => {
        const reads: unknown[] = [];
        const counting: OperationHost = { entity: "Invoice", read: async (_entity, options) => { reads.push(options); return ROWS; } };
        const params: { min?: number } = {};
        const built: EntityEditHandler<Invoice, Params> = async (ctx) => {
            const total: { gte?: number } = {};
            if (params.min !== undefined) total.gte = params.min;
            const rows = await ctx.self.query({ where: { Total: total } });
            return rows.map((row) => ctx.self.delete(row.Id));
        };
        expect(await runMutation(built, input(), counting)).toEqual(failed(expect.stringContaining("where.Total is an empty condition")));
        const misspelled: EntityEditHandler<Invoice, Params> = async (ctx) => {
            const rows = await ctx.self.query({ filter: { Status: "PENDING" } } as never);
            return rows.map((row) => ctx.self.delete(row.Id));
        };
        expect(await runMutation(misspelled, input(), counting)).toEqual(failed("filter is not a query option; use where, select, orderBy or limit."));
        expect(reads).toEqual([]);
    });
});

describe("get", () => {
    const byId: EntityReadHandler<Invoice, Params> = async (ctx) => (await ctx.self.get("a")) ?? "none";

    it("returns the row when there is one", async () => {
        expect(await runRead(byId, input(), host([ROWS[0]]))).toEqual({ status: "done", result: ROWS[0], prints: [] });
    });

    it("returns undefined when there is none", async () => {
        expect(await runRead(byId, input(), host([]))).toEqual({ status: "done", result: "none", prints: [] });
    });

    it("refuses an id that is not a string, rather than reading an arbitrary row", async () => {
        const params: { id?: string } = {};
        const loose: EntityReadHandler<Invoice, Params> = async (ctx) => ctx.self.get(params.id as string);
        expect(await runRead(loose, input(), host())).toEqual(failed("ctx.self.get needs a row's Id, a string; it was given undefined."));
    });
});

describe("edits", () => {
    it("are descriptors built synchronously, and write nothing", async () => {
        let built: unknown[] = [];
        const builder: EntityEditHandler<Invoice, Params> = async (ctx) => {
            built = [ctx.self.create({ Total: 5, Status: "NEW" }), ctx.self.update("b", { Status: "DONE" }), ctx.self.delete("c")];
            return built as never;
        };
        const output = await runMutation(builder, input(), host());
        expect(built.some((edit) => edit instanceof Promise)).toBe(false);
        expect(output).toEqual({
            status: "done",
            edits: [
                { kind: "create", fields: { Total: 5, Status: "NEW" } },
                { kind: "update", id: "b", fields: { Status: "DONE" } },
                { kind: "delete", id: "c" },
            ],
            prints: [],
        });
    });

    it("keep only the members the protocol declares", async () => {
        const sloppy: EntityEditHandler<Invoice, Params> = async () => [{ kind: "delete", id: "c", note: "x" } as never];
        expect(await runMutation(sloppy, input(), host())).toEqual({ status: "done", edits: [{ kind: "delete", id: "c" }], prints: [] });
    });

    it("may be none", async () => {
        expect(await runMutation(async () => [], input(), host())).toEqual({ status: "done", edits: [], prints: [] });
    });

    it("must come back as an array", async () => {
        const wrong = (async () => ({ kind: "delete", id: "c" })) as unknown as EntityEditHandler<Invoice, Params>;
        expect(await runMutation(wrong, input(), host())).toEqual(failed("A Mutation handler must return an array of edits; return [] for none."));
    });
});

describe("the handler's context", () => {
    it("fixes now from the input and passes the caller through", async () => {
        let seen: { now?: Date; user?: unknown } = {};
        const look: EntityReadHandler<Invoice, Params> = async (ctx) => {
            seen = { now: ctx.now, user: ctx.user };
            return null;
        };
        const sent = input();
        await runRead(look, sent, host());
        expect(seen.now).toBeInstanceOf(Date);
        expect(seen.now?.toISOString()).toBe(NOW);
        expect(seen.user).toBe(sent.user);
    });

    it("keeps now fixed even when the handler changes the Date it was given", async () => {
        const moving: EntityReadHandler<Invoice, Params> = async (ctx) => {
            ctx.now.setFullYear(2000);
            return ctx.now.toISOString();
        };
        expect(await runRead(moving, input(), host())).toEqual({ status: "done", result: NOW, prints: [] });
    });
});

describe("a Read implemented as Code", () => {
    it("returns what the handler returns as the result", async () => {
        const summarize: EntityReadHandler<Invoice, Params> = async (ctx) => {
            const rows = await ctx.self.query({ select: ["Total"] });
            return { count: rows.length, total: rows.reduce((sum, row) => sum + row.Total, 0) };
        };
        const output = await runRead(summarize, input(), host());
        expect(output).toEqual({ status: "done", result: { count: 2, total: 1000 }, prints: [] });
    });

    it("sends null for a handler that returns nothing, so the result is always there", async () => {
        expect(await runRead(async () => undefined, input(), host())).toEqual({ status: "done", result: null, prints: [] });
    });

    it("has no edit builders", async () => {
        let self: object = {};
        await runRead(async (ctx) => {
            self = ctx.self;
            return null;
        }, input(), host());
        expect(Object.keys(self).sort()).toEqual(["get", "query"]);
    });

    it("fails with the handler's own message", async () => {
        const failing: EntityReadHandler<Invoice, Params> = async () => {
            throw new Error("bad data");
        };
        expect(await runRead(failing, input(), host())).toEqual(failed("bad data"));
    });
});

/** The lines one Read run printed, given what its handler does with `print`. */
async function printedBy(write: (print: (...values: unknown[]) => void) => void): Promise<string[]> {
    return (await runRead(async (ctx) => write(ctx.print), input(), host())).prints;
}

describe("ctx.print", () => {
    it("writes a string as it is and anything else as JSON, arguments joined by one space", async () => {
        expect(await printedBy((print) => print("total", 5, { a: 1, b: "x" }, [1, "y"], null, true))).toEqual([
            'total 5 {"a":1,"b":"x"} [1,"y"] null true',
        ]);
    });

    it("writes a Date as its ISO time, on its own or inside a value", async () => {
        const at = new Date(NOW);
        expect(await printedBy((print) => print(at, { at }, new Date(Number.NaN)))).toEqual([
            `${NOW} {"at":"${NOW}"} Invalid Date`,
        ]);
    });

    it("writes what JSON cannot — undefined, a symbol, a bigint, NaN — as String shows it", async () => {
        expect(await printedBy((print) => print(undefined, Symbol("tag"), 10n, Number.NaN, { big: 10n }))).toEqual([
            'undefined Symbol(tag) 10 NaN {"big":"10"}',
        ]);
    });

    it("writes a function by its name, as console.log does, never its source", async () => {
        const fn = (x: number) => x + 1;
        expect(await printedBy((print) => print(fn, function named() {}, () => 1))).toEqual([
            "[Function: fn] [Function: named] [Function (anonymous)]",
        ]);
    });

    it("writes [Circular] for an object inside itself, and a value two members share twice", async () => {
        const loop: { name: string; self?: unknown; list?: unknown[] } = { name: "a" };
        loop.self = loop;
        loop.list = [loop];
        const shared = { x: 1 };
        expect(await printedBy((print) => print(loop, { l: shared, r: [shared] }))).toEqual([
            '{"name":"a","self":"[Circular]","list":["[Circular]"]} {"l":{"x":1},"r":[{"x":1}]}',
        ]);
    });

    it("writes an Error, a subclass included, as `Name: message` — never its stack", async () => {
        class QuotaError extends Error {
            public override name = "QuotaError";
        }
        const coded = Object.assign(new Error("with a code"), { code: "E42" });
        const lines = await printedBy((print) => print(new Error("boom"), new TypeError("bad"), new QuotaError("over"), coded));
        expect(lines).toEqual(["Error: boom TypeError: bad QuotaError: over Error: with a code"]);
        expect(lines[0]).not.toMatch(/\bat /);
    });

    it("writes a plain object holding only a string name and message the same way", async () => {
        const bare = Object.assign(Object.create(null) as object, { name: "Bare", message: "no prototype" });
        expect(await printedBy((print) => print({ name: "Refused", message: "over the ceiling" }, bare))).toEqual([
            "Refused: over the ceiling Bare: no prototype",
        ]);
    });

    it("writes anything else shaped like an Error as JSON: another member, a non-string, a class instance", async () => {
        class Named {
            public name = "N";
            public message = "m";
        }
        expect(
            await printedBy((print) => print({ name: "E", message: "m", code: 1 }, { name: "E", message: 5 }, { message: "m" }, new Named())),
        ).toEqual(['{"name":"E","message":"m","code":1} {"name":"E","message":5} {"message":"m"} {"name":"N","message":"m"}']);
    });

    it("writes an Error inside an object or array as the same string", async () => {
        const value = { error: new RangeError("too far"), list: [new Error("first"), { name: "Plain", message: "shaped" }], ok: 1 };
        expect(await printedBy((print) => print(value))).toEqual([
            '{"error":"RangeError: too far","list":["Error: first","Plain: shaped"],"ok":1}',
        ]);
    });

    it("never throws over a value it cannot write as JSON", async () => {
        const throwing = { get boom(): never { throw new Error("getter"); } };
        const bare = Object.create(null) as { boom?: never };
        Object.defineProperty(bare, "boom", { enumerable: true, get: () => { throw new Error("getter"); } });
        expect(await printedBy((print) => print(throwing, bare))).toEqual(["[object Object] [unprintable]"]);
    });

    it("never throws, whatever the value: one that throws on the way is [unprintable]", async () => {
        const { proxy: revoked, revoke } = Proxy.revocable({}, {});
        revoke();
        const lying = new Proxy({}, { getPrototypeOf: () => { throw new Error("no prototype"); } });
        const notADate = Object.create(Date.prototype) as Date;
        const output = await runRead(async (ctx) => {
            ctx.print(revoked, lying, notADate, "still printing");
            return 1;
        }, input(), host());
        expect(output).toEqual({ status: "done", result: 1, prints: ["[unprintable] [unprintable] [unprintable] still printing"] });
    });

    it("keeps one call as one line, newlines and all; no arguments print an empty line", async () => {
        expect(await printedBy((print) => { print("a\nb"); print(); print({ text: "c\nd" }); })).toEqual([
            "a\nb",
            "",
            '{"text":"c\\nd"}',
        ]);
    });

    it("works detached from ctx, and is not on ctx.self", async () => {
        let self: object = {};
        const output = await runMutation(async (ctx) => {
            const { print } = ctx;
            print("detached");
            self = ctx.self;
            return [];
        }, input(), host());
        expect(output.prints).toEqual(["detached"]);
        expect(Object.keys(self).sort()).toEqual(["create", "delete", "get", "query", "update"]);
    });

    it("keeps 200 lines a run, then ends with one line counting the calls it dropped", async () => {
        expect(PRINT_LINE_LIMIT).toBe(200);
        const lines = await printedBy((print) => {
            for (let i = 0; i < 250; i++) print(`line ${i}`);
        });
        expect(lines).toHaveLength(201);
        expect(lines[199]).toBe("line 199");
        expect(lines[200]).toBe("[50 more lines truncated]");
    });

    it("counts the lines past 200 in a closing line, which the 16 KB does not include", async () => {
        const lines = await printedBy((print) => {
            print("x".repeat(PRINT_TEXT_LIMIT));
            for (let i = 1; i < 250; i++) print(`line ${i}`);
        });
        expect(lines).toHaveLength(201);
        expect(lines[199]).toBe("line 199");
        expect(lines.slice(0, -1).join("\n")).toHaveLength(PRINT_TEXT_LIMIT);
        expect(lines[200]).toBe("[50 more lines truncated]");
    });

    it("keeps lines that come to exactly 16 KB whole", async () => {
        expect(PRINT_TEXT_LIMIT).toBe(16 * 1024);
        const half = "a".repeat(PRINT_TEXT_LIMIT / 2);
        expect(await printedBy((print) => { print(half); print(half.slice(1)); })).toEqual([half, half.slice(1)]);
        const emoji = "😀".repeat(PRINT_TEXT_LIMIT / 2);
        expect(await printedBy((print) => print(emoji))).toEqual([emoji]);
    });

    it("cuts one line longer than 16 KB to fit, ending with how much it lost", async () => {
        const lines = await printedBy((print) => print("x".repeat(20_000)));
        expect(lines).toEqual(["x".repeat(16_366) + "… [3634 chars cut]"]);
        expect(lines[0]).toHaveLength(PRINT_TEXT_LIMIT);
    });

    it("cuts a big print to fit and keeps every line around it whole", async () => {
        const rows = Array.from({ length: 200 }, (_, i) => ({ Id: `id-${i}`, Total: i * 10, Status: "PENDING", Note: "x".repeat(40) }));
        const json = JSON.stringify(rows);
        expect(json.length).toBeGreaterThan(PRINT_TEXT_LIMIT);
        const lines = await printedBy((print) => { print("start"); print(rows); print("after big"); print("done"); });
        expect(lines).toHaveLength(4);
        expect([lines[0], lines[2], lines[3]]).toEqual(["start", "after big", "done"]);
        expect(lines.join("\n")).toHaveLength(PRINT_TEXT_LIMIT);
        expect(lines[1]).toBe(json.slice(0, json.length - 3035) + "… [3035 chars cut]");
    });

    it("cuts lines of one length to one share, the leftover to the last ones, so the total fits exactly", async () => {
        const lines = await printedBy((print) => {
            for (let i = 0; i < 17; i++) print("x".repeat(1000));
        });
        // 16,368 characters of room shared by 17 lines: 962 each, 14 left over.
        expect(lines.map((line) => line.length)).toEqual([...Array(3).fill(962), ...Array(14).fill(963)]);
        expect(lines[0]).toBe("x".repeat(962 - "… [54 chars cut]".length) + "… [54 chars cut]");
        expect(lines[16]).toBe("x".repeat(963 - "… [53 chars cut]".length) + "… [53 chars cut]");
        expect(lines.join("\n")).toHaveLength(PRINT_TEXT_LIMIT);
    });

    it("never cuts a character in half", async () => {
        const [line, empty] = await printedBy((print) => { print("😀".repeat(PRINT_TEXT_LIMIT / 2)); print(""); });
        expect(line).toBe("😀".repeat(8183) + "… [18 chars cut]");
        expect(empty).toBe("");
    });

    it("caps each run on its own, and starts each run empty", async () => {
        const handler: EntityReadHandler<Invoice, Params> = async (ctx) => {
            for (let i = 0; i < 150; i++) ctx.print(i);
            return (await ctx.self.query()).length;
        };
        const first = await runRead(handler, input(), host());
        const second = await runRead(handler, input(), host());
        const lines = Array.from({ length: 150 }, (_, i) => String(i));
        expect(first).toEqual({ status: "done", result: 2, prints: lines });
        expect(second).toEqual({ status: "done", result: 2, prints: lines });
    });

    it("ignores a print made after the run returned", async () => {
        const output = await runMutation(async (ctx) => {
            void (async () => {
                await new Promise((resolve) => setTimeout(resolve, 5));
                ctx.print("late");
            })();
            ctx.print("on time");
            return [];
        }, input(), host());
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(output.prints).toEqual(["on time"]);
    });
});

describe("every output carries its prints", () => {
    it("on done, for a Mutation and a Read", async () => {
        const approving: EntityEditHandler<Invoice, Params> = async (ctx) => {
            ctx.print("approving", 1);
            return [ctx.self.delete("a")];
        };
        expect(await runMutation(approving, input(), host())).toEqual({ status: "done", edits: [{ kind: "delete", id: "a" }], prints: ["approving 1"] });
        const summing: EntityReadHandler<Invoice, Params> = async (ctx) => {
            ctx.print({ step: "sum" });
            return 3;
        };
        expect(await runRead(summing, input(), host())).toEqual({ status: "done", result: 3, prints: ['{"step":"sum"}'] });
    });

    it("on failed: a handler that throws fails the run, message only, its prints kept", async () => {
        const throwing: EntityEditHandler<Invoice, Params> = async (ctx) => {
            ctx.print("step 1");
            throw new Error("boom");
        };
        const output = await runMutation(throwing, input(), host());
        expect(output).toEqual({ status: "failed", error: { message: "boom" }, prints: ["step 1"] });
        // No stack: it can carry the job's file paths.
        expect(output.status === "failed" ? Object.keys(output.error) : []).toEqual(["message"]);
    });

    it("on a Mutation that returns something other than edits, which fails like a throw", async () => {
        const wrong = (async (ctx: { print: (...values: unknown[]) => void }) => {
            ctx.print("returning");
            return { kind: "delete", id: "c" };
        }) as unknown as EntityEditHandler<Invoice, Params>;
        expect(await runMutation(wrong, input(), host())).toEqual({
            status: "failed",
            error: { message: "A Mutation handler must return an array of edits; return [] for none." },
            prints: ["returning"],
        });
        const notAnEdit = (async () => [null]) as unknown as EntityEditHandler<Invoice, Params>;
        expect(await runMutation(notAnEdit, input(), host())).toEqual(
            failed("Edit #1 is not an edit; build edits with ctx.self.create, update or delete."),
        );
    });

    it("on a return JSON cannot write, which fails the run rather than faulting the job after it", async () => {
        const unsendable = "The handler returned a value that cannot be sent as JSON: ";
        const loop: { self?: unknown } = {};
        loop.self = loop;
        const big = await runRead(async (ctx) => {
            ctx.print("counted");
            return { n: 10n };
        }, input(), host());
        expect(big).toEqual({ status: "failed", error: { message: `${unsendable}Do not know how to serialize a BigInt` }, prints: ["counted"] });
        for (const output of [
            await runRead(async () => loop, input(), host()),
            await runMutation(async (ctx) => [ctx.self.create(loop as Partial<Invoice>)], input(), host()),
        ]) {
            expect(output.status).toBe("failed");
            expect(output.status === "failed" ? output.error.message : "").toMatch(new RegExp(`^${unsendable}Converting circular structure to JSON`));
        }
    });
});

describe("a failed run's message", () => {
    const thrown = async (value: unknown) => runRead(async () => { throw value; }, input(), host());

    it("is whatever was thrown, as text, when it is not an Error", async () => {
        expect(await thrown("plain")).toEqual(failed("plain"));
        expect(await thrown({ message: 42 })).toEqual(failed("42"));
        expect(await thrown(null)).toEqual(failed("null"));
        expect(await thrown(undefined)).toEqual(failed("undefined"));
    });

    it("is the Error's name when it has no message", async () => {
        expect(await thrown(new Error(""))).toEqual(failed("Error"));
        expect(await thrown(new TypeError())).toEqual(failed("TypeError"));
    });

    it("says so when the thrown value cannot become text", async () => {
        expect(await thrown(Object.create(null))).toEqual(failed("The handler failed with a value that cannot be shown as text."));
    });

    it("is cut to 2 KB", async () => {
        expect(ERROR_MESSAGE_LIMIT).toBe(2 * 1024);
        const output = await thrown(new Error("x".repeat(5000)));
        expect(output.status === "failed" ? output.error.message : "").toBe("x".repeat(ERROR_MESSAGE_LIMIT));
    });
});
