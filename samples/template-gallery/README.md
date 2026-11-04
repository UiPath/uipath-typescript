# Template gallery (POC)

Proof of concept for the OOTB coded app templates design: a gallery that lists templates from
template storage, opens the hosted copy, or creates an editable copy in Studio Web.

```
template storage (blob, public read)
  index.json                      catalog
  <template>/<version>/           index.html, assets/   -> what "Open" serves
                                  template.json, release-notes.md
                                  project.zip           -> source + dist, what "Edit" copies

gallery (this app, React + @uipath/uipath-typescript)
  Open   -> {portal}/{org}/apps_/system/{tenant}/<template>/   (served by the Apps server)
  Edit   -> POST /copies with the user's token

api/functions/copies.ts  (a coded function; hosted locally by api/server.ts)
  reads project.zip for the requested version, then does what `uip codedapp push` does:
  create a solution + coded web app project, upload source/ and source/dist/, set bundlePath.
  The copy is created as the caller, in the caller's workspace. Nothing is built anywhere.
```

## Run locally

Terminal 1, the function:

```bash
cd api
npm install
cp .env.example .env             # base URL, org id, tenant id, template storage, allowed origin
bun --env-file=.env run server.ts
curl -s http://localhost:7070/    # health + routes
```

Terminal 2, the gallery:

```bash
cp uipath.json.example uipath.json   # your external app: clientId, orgName, tenantName, baseUrl, redirectUri http://localhost:5173
cp .env.example .env                 # VITE_TEMPLATES_STORAGE_BASE, VITE_COPIES_API
npm install
npm run dev                          # port 8104: the redirect URI registered on the client used here
```

Sign in, pick a template, Edit, give the solution a name. The function creates the copy and the
gallery opens the Studio Web designer on it. Publish and deploy from there: the stored `dist` ships
as is.

Without the browser: POST /copies with `{"templateId": "process-app"}` and a Bearer token.

## What the POC shows

- The built bundle is the stored artifact; the solution path reuses it unchanged (`isCompiled: true`).
- "Edit" is `uip codedapp push` run server side with the user's token: one Studio Web call to create
  the solution and project, the FileOperations API to upload files under a lock, one manifest update.
- The function needs only the caller's token and the platform coordinates (`ctx.user`, `ctx.platform`);
  the template id and version are validated against the catalog, and the storage path is built from
  those, never from the request.

## Notes

- `api/functions/copies.ts` is written against the coded functions SDK contract. `api/functions/_sdk-shim.ts`
  stands in for `@uipath/coded-functions-js-sdk` and `api/server.ts` for `uip function serve` only
  because the function tool was not installable on this machine; both are replaced by the real ones
  without changing `copies.ts`.
- Deployed as a function, the copy must finish inside the gateway's timeout (about 45 files today,
  uploads run 8 at a time). A larger template would move this to a run-as-job function or to the
  Apps server, which is where the design puts it anyway.
- `uipath.json` and `.env` hold your local values and are git-ignored.
