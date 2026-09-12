import type { UiPath } from '@uipath/uipath-typescript/core';
import { Attachments } from '@uipath/uipath-typescript/attachments';
import { Functions } from '@uipath/uipath-typescript/functions';
import { Jobs } from '@uipath/uipath-typescript/jobs';
import { Processes } from '@uipath/uipath-typescript/processes';
import {
  FUNCTIONS_PACKAGE,
  FUNCTION_NAMES,
  INPUT_INLINE_LIMIT_CHARS,
  OUTPUT_INLINE_LIMIT_KB,
  entryPointPath,
  makeText,
  qualifiedName,
  type CallInput,
  type CallOutput,
} from '../../../calling-mode-functions/lib/contract';

/**
 * The same work, called two ways.
 *
 * HTTP: the function declares `method` + `path`, so `Functions.invoke()` calls
 * it and returns the answer.
 *
 * Job: the function declares neither, so there is no URL to call. It is started
 * with `Processes.start()` and polled — and that channel can carry megabytes,
 * because a job puts large payloads in attachments.
 */

export type { CallOutput };
export { INPUT_INLINE_LIMIT_CHARS, OUTPUT_INLINE_LIMIT_KB };

export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

export interface Run {
  channel: 'http' | 'job';
  /** How big the payload we sent was. */
  sentKb: number;
  /** How the payload travelled. Only a job has a second option. */
  transport: 'inline' | 'attachment';
  output: CallOutput | null;
  /** Round trip as the browser measured it. */
  clientMs: number;
  /** Job runs only. */
  jobKey?: string;
  state?: string;
}

const ENV_FOLDER_ID = Number(import.meta.env.VITE_UIPATH_FOLDER_ID);

/**
 * The job APIs want the folder's numeric id, but a deployed app is only given
 * its key, so one lookup converts it. Locally it comes from `.env`.
 */
let folderIdCache: number | null = null;

async function folderId(sdk: UiPath): Promise<number> {
  if (folderIdCache) return folderIdCache;
  if (Number.isFinite(ENV_FOLDER_ID) && ENV_FOLDER_ID > 0) return (folderIdCache = ENV_FOLDER_ID);

  const key = document.querySelector<HTMLMetaElement>('meta[name="uipath:folder-key"]')?.content;
  if (!key) throw new Error('No folder context. Set VITE_UIPATH_FOLDER_ID in .env to run locally.');

  const { baseUrl, orgName, tenantName } = sdk.config;
  const res = await fetch(
    `${baseUrl.replace(/\/+$/, '')}/${orgName}/${tenantName}/orchestrator_/odata/Folders?$filter=Key%20eq%20${encodeURIComponent(key)}&$top=1&$select=Id`,
    { headers: { Authorization: `Bearer ${sdk.getToken()}` } },
  );
  if (!res.ok) throw new Error(`Could not resolve the folder id: ${res.status}`);

  const id = ((await res.json()) as { value?: { Id?: number }[] }).value?.[0]?.Id;
  if (!id) throw new Error(`No folder with key ${key}.`);
  return (folderIdCache = id);
}

const TERMINAL = new Set(['Successful', 'Faulted', 'Stopped']);

export function createApi(sdk: UiPath) {
  const functions = new Functions(sdk);

  const input = (sendKb: number, askKb: number, label: string): CallInput => ({
    data: makeText(sendKb),
    outputKb: askKb,
    label,
  });

  return {
    /** HTTP semantics — one call, the answer returned. */
    http: async (sendKb: number, askKb: number): Promise<Run> => {
      const started = Date.now();
      const payload = input(sendKb, askKb, `${sendKb} KB in / ${askKb} KB out`);

      const output = (await functions.invoke(
        { name: qualifiedName(FUNCTION_NAMES.echo) },
        payload as unknown as Record<string, unknown>,
      )) as CallOutput;

      return {
        channel: 'http',
        sentKb: Math.round((JSON.stringify(payload).length / 1024) * 10) / 10,
        transport: 'inline',
        output,
        clientMs: Date.now() - started,
      };
    },

    /** Job semantics — start, poll, read the result. */
    job: async (
      sendKb: number,
      askKb: number,
      onTick?: (state: string, ms: number) => void,
    ): Promise<Run> => {
      const started = Date.now();
      const folder = await folderId(sdk);
      const payload = input(sendKb, askKb, `${sendKb} KB in / ${askKb} KB out`);
      const json = JSON.stringify(payload);
      const tooBig = json.length > INPUT_INLINE_LIMIT_CHARS;

      // Creates the attachment and uploads the bytes.
      const inputFile = tooBig
        ? (await new Attachments(sdk).create('input.json', new Blob([json]), { folderId: folder })).id
        : undefined;

      const [job] = await new Processes(sdk).start(
        {
          processName: FUNCTIONS_PACKAGE,
          // Required: one release covers every function in the package.
          entryPointPath: entryPointPath(FUNCTION_NAMES.bulk),
          ...(inputFile ? { inputFile } : { inputArguments: json }),
        },
        { folderId: folder },
      );

      const jobs = new Jobs(sdk);
      let state = job.state;
      while (!TERMINAL.has(state)) {
        if (Date.now() - started > 180_000) throw new Error(`Job still ${state}.`);
        await new Promise((r) => setTimeout(r, 1_500));
        state = (await jobs.getById(job.key, folder, { select: 'state' })).state;
        onTick?.(state, Date.now() - started);
      }

      // Inline or attachment — getOutput handles both.
      const output = (await jobs.getOutput(job.key, folder)) as CallOutput | null;

      return {
        channel: 'job',
        sentKb: Math.round((json.length / 1024) * 10) / 10,
        transport: tooBig ? 'attachment' : 'inline',
        output,
        clientMs: Date.now() - started,
        jobKey: job.key,
        state,
      };
    },
  };
}

export type Api = ReturnType<typeof createApi>;
