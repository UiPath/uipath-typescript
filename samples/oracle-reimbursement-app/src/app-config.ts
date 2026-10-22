/**
 * Deployment-specific names — the tenant resources this app talks to.
 *
 * Nothing here is baked in: every value comes from `.env` (copy `.env.example`), and the
 * defaults are placeholders so the project builds before it is configured. The entity,
 * group, asset and queue must exist in the tenant named in `uipath.json`.
 */
const value = (name: string, fallback: string): string => {
  const read = (import.meta.env as Record<string, string | undefined>)[name];
  return read && read.trim() ? read.trim() : fallback;
};

export const APP_CONFIG = {
  /** Shown in titles and spinner messages. */
  appName: value('VITE_APP_NAME', 'Reimbursement'),
  /** The Data Fabric entities holding the items, one per runtime. */
  entityDev: value('VITE_ENTITY_DEV', 'DEV_ReimbursementItems'),
  entityProd: value('VITE_ENTITY_PROD', 'PROD_ReimbursementItems'),
  /** Identity groups whose members may assign items to others. */
  adminGroupDev: value('VITE_ADMIN_GROUP_DEV', 'Reimbursement_DEV_Admins'),
  adminGroupProd: value('VITE_ADMIN_GROUP_PROD', 'Reimbursement_PROD_Admins'),
  /** Orchestrator assets: the runtime selector (`dev` / `prod`) and the assignable user list. */
  assetRuntime: value('VITE_ASSET_RUNTIME', 'Reimbursement_Runtime'),
  assetUserList: value('VITE_ASSET_USER_LIST', 'Reimbursement_UserList'),
  /** The performer queue that receives approved and rejected items, and its folder. */
  queueName: value('VITE_QUEUE_NAME', 'Reimbursement_Performer'),
  queueFolderPath: value('VITE_QUEUE_FOLDER_PATH', 'Shared'),
} as const;
