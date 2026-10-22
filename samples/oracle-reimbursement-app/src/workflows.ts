import { APP_CONFIG } from './app-config';
/** Event workflows, converted from the solution's XAML. */
import { boolText, dateMin, dictOf, eqIgnoreCase, formatDate, formatString, formatTimeSpan, jsonBool, jsonGet, jsonParse, jsonStringify, jsonText, jsonValues, listData, parseDateExact, queryValue, textContains, timeSpanParse, toInt } from './lib/compat';
import { addToQueue, entityRecordUpdate, fetchEntityRecords, orchestratorAsset } from './lib/data';
import { logMessage, openPage, showMessage, showSpinner } from './lib/rules';
import { currentUser, getAppVar, recordField, resetControl, setAppVar, setControlProp, validationSave } from './lib/runtime';

/** `WorkflowFiles/IntermediateLoadingPage_IntermediateLoadingPage_load.xaml` */
export function IntermediateLoadingPage_IntermediateLoadingPage_load(): void {
  if (getAppVar<boolean>("Boolean_IsRefresh") ?? false) {
    openPage("MainPage");
    setAppVar("Boolean_IsRefresh", false);
}
else {
    openPage("ItemSelectionPage");
}
}

/** `WorkflowFiles/ItemSelectionPage_ItemSelectionPage_load.xaml` */
export async function ItemSelectionPage_ItemSelectionPage_load(): Promise<void> {
  let SkipIndex: number = 0 as number;
  let RetrievedDEVRecords: unknown[] | null | undefined;
  let RetrievedPRODRecords: unknown[] | null | undefined;
  setAppVar("Boolean_ReadOnly", false);
  setAppVar("String_ActionRequest", "");
  setAppVar("String_ItemsJson", "");
  setAppVar("String_UserContextJson", jsonStringify({
    "displayName": currentUser<string>("DisplayName"),
    "isAdmin": getAppVar<boolean>("Boolean_IsAdmin") ?? false,
    "runtime": String(String(getAppVar<string>("String_MilesRuntime") ?? "").trim()).toUpperCase(),
    "users": getAppVar<string[]>("List_MilesUsers") ?? []
}));
  setAppVar("String_PagesToBeDeleted", "");
  setAppVar("String_CurrentMilesItemId", "");
  showSpinner(false);
  if (getAppVar<boolean>("Boolean_ItemInProgress") ?? false) {
    setAppVar("Boolean_ItemInProgress", false);
    showMessage({ title: "Success", message: "Item has been unlocked/processed successfully", position: "top", type: "success", seconds: 5 });
}
  SkipIndex = 0;
  if (String(String(getAppVar<string>("String_MilesRuntime") ?? "").toLowerCase()).trim() === "dev") {
    setAppVar("ListSource_MilesDevItems", []);
    do {
        RetrievedDEVRecords = (await fetchEntityRecords(APP_CONFIG.entityDev, { sortOptions: [{ fieldName: "UpdateTime", isDescending: true }], expansionLevel: 1, pageSize: 1000, skip: Number(SkipIndex), timeoutMs: 30000 })).data;
        setAppVar("ListSource_MilesDevItems", [...listData(getAppVar<unknown[]>("ListSource_MilesDevItems") ?? []), ...RetrievedDEVRecords ?? []]);
        SkipIndex = Number(SkipIndex + toInt((RetrievedDEVRecords ?? []).length));
    } while ((RetrievedDEVRecords ?? []).length !== 0);
    setAppVar("String_ItemsJson", jsonStringify(listData(getAppVar<unknown[]>("ListSource_MilesDevItems") ?? []).map(x => ({
        "Id": String(recordField(x, "Id") ?? ""),
        "ProjectNumber": recordField<string>(x, "ProjectNumber"),
        "StudyID": recordField<string>(x, "StudyID"),
        "StudyDate": recordField<string>(x, "StudyDate"),
        "RSSNumber": recordField<string>(x, "RSSNumber"),
        "Status": recordField<string>(x, "Status"),
        "AssignedTo": recordField<string>(x, "AssignedTo"),
        "LastUpdatedBy": recordField<string>(x, "LastUpdatedBy")
    }))));
}
else {
    setAppVar("ListSource_MilesProdItems", []);
    do {
        RetrievedPRODRecords = (await fetchEntityRecords(APP_CONFIG.entityProd, { sortOptions: [{ fieldName: "UpdateTime", isDescending: true }], expansionLevel: 1, pageSize: 1000, skip: Number(SkipIndex), timeoutMs: 30000 })).data;
        setAppVar("ListSource_MilesProdItems", [...listData(getAppVar<unknown[]>("ListSource_MilesProdItems") ?? []), ...RetrievedPRODRecords ?? []]);
        SkipIndex = Number(SkipIndex + toInt((RetrievedPRODRecords ?? []).length));
    } while ((RetrievedPRODRecords ?? []).length !== 0);
    setAppVar("String_ItemsJson", jsonStringify(listData(getAppVar<unknown[]>("ListSource_MilesProdItems") ?? []).map(x => ({
        "Id": String(recordField(x, "Id") ?? ""),
        "ProjectNumber": recordField<string>(x, "ProjectNumber"),
        "StudyID": recordField<string>(x, "StudyID"),
        "StudyDate": recordField<string>(x, "StudyDate"),
        "RSSNumber": recordField<string>(x, "RSSNumber"),
        "Status": recordField<string>(x, "Status"),
        "AssignedTo": recordField<string>(x, "AssignedTo"),
        "LastUpdatedBy": recordField<string>(x, "LastUpdatedBy")
    }))));
}
}

/** `WorkflowFiles/ItemSelectionPage_Text_ActionTrigger_change.xaml` */
export async function ItemSelectionPage_Text_ActionTrigger_change(): Promise<void> {
  let Req: unknown = [] as unknown;
  let ReqAction: string | null | undefined;
  let ReqIds: (string | null | undefined)[] | null | undefined = [] as (string | null | undefined)[] | null | undefined;
  let ReqAssignee: string | null | undefined;
  let OkIds: (string | null | undefined)[] | null | undefined = [] as (string | null | undefined)[] | null | undefined;
  let FailedItems: unknown = {} as unknown;
  let RetrievedDEVRecords: unknown[] | null | undefined;
  let RetrievedPRODRecords: unknown[] | null | undefined;
  let Boolean_Success: boolean = false as boolean;
  let ItemDataJsonObject: unknown = [] as unknown;
  if (!(String(getAppVar<string>("String_ActionRequest") ?? "").trim() === "")) {
    Req = jsonParse(getAppVar<string>("String_ActionRequest"));
    if (!eqIgnoreCase(jsonText(jsonGet(Req, "requestId")), getAppVar<string>("String_LastRequestId"))) {
        setAppVar("String_LastRequestId", jsonText(jsonGet(Req, "requestId")));
        ReqAction = jsonText(jsonGet(Req, "action"));
        ReqIds = jsonValues(jsonGet(Req, "ids"), "String").map(jsonText);
        ReqAssignee = (getAppVar<boolean>("Boolean_IsAdmin") ?? false) && !(String(jsonText(jsonGet(Req, "assignee")) ?? "").trim() === "") ? jsonText(jsonGet(Req, "assignee")) : currentUser<string>("DisplayName");
        OkIds = [];
        FailedItems = [];
        try {
            switch (ReqAction) {
                case "assign":
                    for (const itemId of (ReqIds as unknown as (string)[])) {
                        if (String(String(getAppVar<string>("String_MilesRuntime") ?? "").trim()).toLowerCase() === "dev") {
                            RetrievedDEVRecords = (await fetchEntityRecords(APP_CONFIG.entityDev, { filterGroup: { logicalOperator: 0, queryFilters: [{ fieldName: "Id", operator: "contains", value: queryValue(String(itemId ?? "")) }] }, expansionLevel: 1, pageSize: 100, timeoutMs: 30000 })).data;
                            setAppVar("Miles_CurrentDEVItem", RetrievedDEVRecords?.[0]);
                            if ((String(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "AssignedTo") ?? "").trim() === "" || eqIgnoreCase(String(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "AssignedTo") ?? "").trim(), "-") || (getAppVar<boolean>("Boolean_IsAdmin") ?? false)) && (eqIgnoreCase(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "Status"), "To be processed") || eqIgnoreCase(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "Status"), "In Progress"))) {
                                await entityRecordUpdate(APP_CONFIG.entityDev, String(itemId ?? ""), {
                                    "AssignedTo": ReqAssignee
                                }, { expansionLevel: 2, timeoutMs: 30000 });
                                OkIds = [...(OkIds ?? []), itemId];
                            }
                            else {
                                FailedItems = [...((FailedItems as unknown[]) ?? []), {
                                        "id": itemId,
                                        "reason": String(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "RSSNumber") ?? "") + " was changed by someone else (now: " + String(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "AssignedTo") ?? "") + ", " + String(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "Status") ?? "") + ")",
                                        "assignedTo": recordField<string>(getAppVar("Miles_CurrentDEVItem"), "AssignedTo"),
                                        "status": recordField<string>(getAppVar("Miles_CurrentDEVItem"), "Status")
                                    }];
                            }
                        }
                        else {
                            RetrievedPRODRecords = (await fetchEntityRecords(APP_CONFIG.entityProd, { filterGroup: { logicalOperator: 0, queryFilters: [{ fieldName: "Id", operator: "contains", value: queryValue(String(itemId ?? "")) }] }, expansionLevel: 1, pageSize: 100, timeoutMs: 30000 })).data;
                            setAppVar("Miles_CurrentPRODItem", RetrievedPRODRecords?.[0]);
                            if ((String(recordField<string>(getAppVar("Miles_CurrentPRODItem"), "AssignedTo") ?? "").trim() === "" || eqIgnoreCase(String(recordField<string>(getAppVar("Miles_CurrentPRODItem"), "AssignedTo") ?? "").trim(), "-") || (getAppVar<boolean>("Boolean_IsAdmin") ?? false)) && (eqIgnoreCase(recordField<string>(getAppVar("Miles_CurrentPRODItem"), "Status"), "To be processed") || eqIgnoreCase(recordField<string>(getAppVar("Miles_CurrentPRODItem"), "Status"), "In Progress"))) {
                                await entityRecordUpdate(APP_CONFIG.entityProd, String(itemId ?? ""), {
                                    "AssignedTo": ReqAssignee
                                }, { expansionLevel: 2, timeoutMs: 30000 });
                                OkIds = [...(OkIds ?? []), itemId];
                            }
                            else {
                                FailedItems = [...((FailedItems as unknown[]) ?? []), {
                                        "id": itemId,
                                        "reason": String(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "RSSNumber") ?? "") + " was changed by someone else (now: " + String(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "AssignedTo") ?? "") + ", " + String(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "Status") ?? "") + ")",
                                        "assignedTo": recordField<string>(getAppVar("Miles_CurrentDEVItem"), "AssignedTo"),
                                        "status": recordField<string>(getAppVar("Miles_CurrentDEVItem"), "Status")
                                    }];
                            }
                        }
                    }
                    break;
                case "unassign":
                    for (const itemId of (ReqIds as unknown as (string)[])) {
                        if (String(String(getAppVar<string>("String_MilesRuntime") ?? "").trim()).toLowerCase() === "dev") {
                            await entityRecordUpdate(APP_CONFIG.entityDev, String(itemId ?? ""), {
                                "AssignedTo": "-"
                            }, { expansionLevel: 2, timeoutMs: 30000 });
                        }
                        else {
                            await entityRecordUpdate(APP_CONFIG.entityProd, String(itemId ?? ""), {
                                "AssignedTo": "-"
                            }, { expansionLevel: 2, timeoutMs: 30000 });
                        }
                        OkIds = [...(OkIds ?? []), itemId];
                    }
                    break;
                case "open":
                    setAppVar("Boolean_ReadOnly", jsonBool(jsonGet(Req, "readOnly")));
                    setAppVar("String_CurrentMilesItemId", ReqIds?.[0]);
                    showSpinner(true, { message: String("Loading details for " + String(jsonText(jsonGet(Req, "label")) ?? "")) });
                    Boolean_Success = true as boolean;
                    if (textContains(jsonText(jsonGet(Req, "status")), "In Progress") && textContains(jsonText(jsonGet(Req, "assignedTo")), currentUser<string>("DisplayName"))) {
                        if (String(String(getAppVar<string>("String_MilesRuntime") ?? "").trim()).toLowerCase() === "dev") {
                            RetrievedDEVRecords = (await fetchEntityRecords(APP_CONFIG.entityDev, { filterGroup: { logicalOperator: 0, queryFilters: [{ fieldName: "Id", operator: "contains", value: queryValue(String(getAppVar<string>("String_CurrentMilesItemId") ?? "")) }] }, expansionLevel: 2, pageSize: 100, timeoutMs: 30000 })).data;
                            setAppVar("Miles_CurrentDEVItem", RetrievedDEVRecords?.[0]);
                        }
                        else {
                            RetrievedPRODRecords = (await fetchEntityRecords(APP_CONFIG.entityProd, { filterGroup: { logicalOperator: 0, queryFilters: [{ fieldName: "Id", operator: "contains", value: queryValue(String(getAppVar<string>("String_CurrentMilesItemId") ?? "")) }] }, expansionLevel: 2, pageSize: 100, timeoutMs: 30000 })).data;
                            setAppVar("Miles_CurrentPRODItem", RetrievedPRODRecords?.[0]);
                        }
                    }
                    else {
                        if (String(String(getAppVar<string>("String_MilesRuntime") ?? "").trim()).toLowerCase() === "dev") {
                            RetrievedDEVRecords = (await fetchEntityRecords(APP_CONFIG.entityDev, { filterGroup: { logicalOperator: 0, queryFilters: [{ fieldName: "Id", operator: "contains", value: queryValue(String(getAppVar<string>("String_CurrentMilesItemId") ?? "")) }] }, expansionLevel: 2, pageSize: 100, timeoutMs: 30000 })).data;
                            setAppVar("Miles_CurrentDEVItem", RetrievedDEVRecords?.[0]);
                            if (!textContains(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "Status"), "To be processed") && !(getAppVar<boolean>("Boolean_ReadOnly") ?? false)) {
                                Boolean_Success = false as boolean;
                            }
                        }
                        else {
                            RetrievedPRODRecords = (await fetchEntityRecords(APP_CONFIG.entityProd, { filterGroup: { logicalOperator: 0, queryFilters: [{ fieldName: "Id", operator: "contains", value: queryValue(String(getAppVar<string>("String_CurrentMilesItemId") ?? "")) }] }, expansionLevel: 2, pageSize: 100, timeoutMs: 30000 })).data;
                            setAppVar("Miles_CurrentPRODItem", RetrievedPRODRecords?.[0]);
                            if (!textContains(recordField<string>(getAppVar("Miles_CurrentPRODItem"), "Status"), "To be processed") && !(getAppVar<boolean>("Boolean_ReadOnly") ?? false)) {
                                Boolean_Success = false as boolean;
                            }
                        }
                    }
                    if (Boolean_Success) {
                        if (String(String(getAppVar<string>("String_MilesRuntime") ?? "").trim()).toLowerCase() === "dev") {
                            if (!(getAppVar<boolean>("Boolean_ReadOnly") ?? false)) {
                                await entityRecordUpdate(APP_CONFIG.entityDev, String(getAppVar<string>("String_CurrentMilesItemId") ?? ""), {
                                    "AssignedTo": String(currentUser<string>("DisplayName") ?? "")
                                }, { expansionLevel: 2, timeoutMs: 30000 });
                            }
                            ItemDataJsonObject = JSON.parse(String(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "ItemData") ?? ""));
                            setAppVar("Dictionary_ActionData", Object.fromEntries(Object.entries(ItemDataJsonObject ?? {}).map(([k, v]) => [k, jsonText(v)])));
                            setAppVar("DataTable_OracleEvent", jsonParse(String(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "GeneratedEvents") ?? "")));
                            setAppVar("ContentValidationData_CurrentItem", jsonParse(String(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "ContentValidationData") ?? "")));
                            if ((recordField<string>(getAppVar("Miles_CurrentDEVItem"), "DiscrepanciesList") ?? "") === "") {
                                setAppVar("List_Discrepancies", []);
                            }
                            else {
                                setAppVar("List_Discrepancies", String(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "DiscrepanciesList") ?? "").split(","));
                            }
                        }
                        else {
                            if (!(getAppVar<boolean>("Boolean_ReadOnly") ?? false)) {
                                await entityRecordUpdate(APP_CONFIG.entityProd, String(getAppVar<string>("String_CurrentMilesItemId") ?? ""), {
                                    "AssignedTo": String(currentUser<string>("DisplayName") ?? "")
                                }, { expansionLevel: 2, timeoutMs: 30000 });
                            }
                            ItemDataJsonObject = JSON.parse(String(recordField<string>(getAppVar("Miles_CurrentPRODItem"), "ItemData") ?? ""));
                            setAppVar("Dictionary_ActionData", Object.fromEntries(Object.entries(ItemDataJsonObject ?? {}).map(([k, v]) => [k, jsonText(v)])));
                            setAppVar("DataTable_OracleEvent", jsonParse(String(recordField<string>(getAppVar("Miles_CurrentPRODItem"), "GeneratedEvents") ?? "")));
                            setAppVar("ContentValidationData_CurrentItem", jsonParse(String(recordField<string>(getAppVar("Miles_CurrentPRODItem"), "ContentValidationData") ?? "")));
                            if ((recordField<string>(getAppVar("Miles_CurrentPRODItem"), "DiscrepanciesList") ?? "") === "") {
                                setAppVar("List_Discrepancies", []);
                            }
                            else {
                                setAppVar("List_Discrepancies", String(recordField<string>(getAppVar("Miles_CurrentPRODItem"), "DiscrepanciesList") ?? "").split(","));
                            }
                        }
                        setAppVar("String_InitialVisitDate", dictOf((getAppVar("Dictionary_ActionData") as Record<string, unknown>)).get("VisitDate"));
                        showSpinner(true);
                        openPage("MainPage");
                    }
                    else {
                        showSpinner(false);
                        FailedItems = [...((FailedItems as unknown[]) ?? []), {
                                "id": getAppVar<string>("String_CurrentMilesItemId"),
                                "reason": "This item cannot be edited right now"
                            }];
                    }
                    break;
            }
        }
        catch (exception) {
            if (exception instanceof Error && exception.message.includes(" was not converted: "))
                throw exception;
            FailedItems = [...((FailedItems as unknown[]) ?? []), {
                    "id": "",
                    "reason": recordField<string>(exception, "message")
                }];
        }
        setAppVar("String_ActionResult", jsonStringify({
            "requestId": jsonText(jsonGet(Req, "requestId")),
            "action": ReqAction,
            "assignee": ReqAssignee,
            "ok": OkIds,
            "failed": FailedItems
        }));
        showSpinner(false);
    }
}
}

/** `WorkflowFiles/LaunchPage_LaunchPage_load.xaml` */
export async function LaunchPage_LaunchPage_load(): Promise<void> {
  let TemporaryMilesUserList: string | null | undefined;
  setAppVar("String_MilesRuntime", await orchestratorAsset(APP_CONFIG.assetRuntime));
  logMessage("warn", "Runtime for " + APP_CONFIG.appName + " is " + String(getAppVar<string>("String_MilesRuntime") ?? ""));
  TemporaryMilesUserList = await orchestratorAsset(APP_CONFIG.assetUserList);
  setAppVar("List_MilesUsers", []);
  setAppVar("List_MilesUsers", String(TemporaryMilesUserList ?? "").split(", "));
  if (String(String(getAppVar<string>("String_MilesRuntime") ?? "").trim()).toLowerCase() === "dev") {
    if ((currentUser<string[]>("Groups") ?? []).includes(APP_CONFIG.adminGroupDev)) {
        setAppVar("Boolean_IsAdmin", true);
    }
    else {
        setAppVar("Boolean_IsAdmin", false);
    }
}
else {
    if ((currentUser<string[]>("Groups") ?? []).includes(APP_CONFIG.adminGroupProd)) {
        setAppVar("Boolean_IsAdmin", true);
    }
    else {
        setAppVar("Boolean_IsAdmin", false);
    }
}
  logMessage("info", "Admin? - " + String(boolText(getAppVar<boolean>("Boolean_IsAdmin") ?? false) ?? ""));
  setAppVar("List_Category", ["Airfare", "Total Mileage Cost", "Meals", "Parking", "Lodging", "Miscellaneous", "Flat Fee for Participant"]);
  setAppVar("Double_IndirectsModifier", 1.3);
  setAppVar("String_CurrencySymbol", "$");
  setAppVar("Boolean_ReadOnly", false);
  showSpinner(true, { message: "Loading " + APP_CONFIG.appName + " items from Data Fabric.." });
  openPage("ItemSelectionPage");
}

/** `WorkflowFiles/MainPage_MainPage_load.xaml` */
export async function MainPage_MainPage_load(): Promise<void> {
  resetControl("MainPage", "ValidationControl");
  setControlProp("MainPage", "ValidationControl", "DataSource", getAppVar("ContentValidationData_CurrentItem"));
  setAppVar("String_MainRequest", "");
  setAppVar("Boolean_MainCollapsed", false);
  setAppVar("String_MainItemJson", jsonStringify({
    "itemId": String(String(getAppVar<string>("String_MilesRuntime") ?? "").trim()).toLowerCase() === "dev" ? String(recordField(getAppVar("Miles_CurrentDEVItem"), "Id") ?? "") : String(recordField(getAppVar("Miles_CurrentPRODItem"), "Id") ?? ""),
    "readOnly": getAppVar<boolean>("Boolean_ReadOnly") ?? false,
    "currency": getAppVar<string>("String_CurrencySymbol"),
    "indirectFactor": getAppVar<number>("Double_IndirectsModifier") ?? 0,
    "itemData": getAppVar("Dictionary_ActionData"),
    "events": getAppVar("DataTable_OracleEvent"),
    "discrepancies": getAppVar<string[]>("List_Discrepancies") ?? [],
    "categories": getAppVar<string[]>("List_Category") ?? [],
    "pagesToDelete": getAppVar<string>("String_PagesToBeDeleted"),
    "initialVisitDate": getAppVar<string>("String_InitialVisitDate"),
    "user": currentUser<string>("DisplayName"),
    "runtime": String(String(getAppVar<string>("String_MilesRuntime") ?? "").trim()).toUpperCase()
}));
  setAppVar("Boolean_ItemInProgress", true);
  showSpinner(false);
  if (getAppVar<boolean>("Boolean_ReadOnly") ?? false) {
    showMessage({ title: "Notification", message: "Item has been opened as read-only", position: "top", type: "warning", seconds: 5 });
}
else {
    if (String(String(getAppVar<string>("String_MilesRuntime") ?? "").toLowerCase()).trim() === "dev") {
        await entityRecordUpdate(APP_CONFIG.entityDev, recordField(getAppVar("Miles_CurrentDEVItem"), "Id"), {
            "LastUpdatedBy": currentUser<string>("DisplayName"),
            "Status": "In Progress"
        }, { expansionLevel: 2, timeoutMs: 30000 });
    }
    else {
        await entityRecordUpdate(APP_CONFIG.entityProd, recordField(getAppVar("Miles_CurrentPRODItem"), "Id"), {
            "LastUpdatedBy": currentUser<string>("DisplayName"),
            "Status": "In Progress"
        }, { expansionLevel: 2, timeoutMs: 30000 });
    }
}
  showSpinner(true, { message: "Loading all the details..." });
  setAppVar("String_StartTime", formatDate(new Date(), "dd/MM/yyyy HH:mm:ss"));
  showSpinner(false);
}

/** `WorkflowFiles/MainPage_Text_MainActionTrigger_change.xaml` */
export async function MainPage_Text_MainActionTrigger_change(args: Record<string, unknown> = {}): Promise<void> {
  let Req: unknown = args["Req"] as unknown;
  let ReqAction: string | null | undefined = args["ReqAction"] as string | null | undefined;
  let boolIsSaved: boolean = (args["boolIsSaved"] ?? false) as boolean;
  if (!(String(getAppVar<string>("String_MainRequest") ?? "").trim() === "")) {
    Req = jsonParse(getAppVar<string>("String_MainRequest"));
    if (!eqIgnoreCase(jsonText(jsonGet(Req, "requestId")), getAppVar<string>("String_LastRequestId"))) {
        setAppVar("String_LastRequestId", jsonText(jsonGet(Req, "requestId")));
        ReqAction = jsonText(jsonGet(Req, "action"));
        try {
            if (eqIgnoreCase(ReqAction, "saveForLater") || eqIgnoreCase(ReqAction, "approve") || eqIgnoreCase(ReqAction, "reject")) {
                setAppVar("DataTable_OracleEvent", jsonParse(jsonText(jsonGet(Req, "events"))));
                setAppVar("Dictionary_ActionData", { ...(getAppVar("Dictionary_ActionData") ?? {}), ["VisitDate"]: jsonText(jsonGet(Req, "visitDate")) });
                setAppVar("List_Discrepancies", jsonValues(jsonGet(Req, "discrepancies"), "String").map(jsonText));
                setAppVar("String_PagesToBeDeleted", jsonText(jsonGet(Req, "pagesToDelete")));
            }
            switch (ReqAction) {
                case "goBack":
                    showSpinner(true, { message: "Loading " + APP_CONFIG.appName + " items from Data Fabric.." });
                    if (getAppVar<boolean>("Boolean_ReadOnly") ?? false) {
                    }
                    else {
                        if (String(String(getAppVar<string>("String_MilesRuntime") ?? "").toLowerCase()).trim() === "dev") {
                            await entityRecordUpdate(APP_CONFIG.entityDev, recordField(getAppVar("Miles_CurrentDEVItem"), "Id"), {
                                "LastUpdatedBy": currentUser<string>("DisplayName"),
                                "Status": "To be processed"
                            }, { expansionLevel: 2, timeoutMs: 30000 });
                        }
                        else {
                            await entityRecordUpdate(APP_CONFIG.entityProd, recordField(getAppVar("Miles_CurrentPRODItem"), "Id"), {
                                "LastUpdatedBy": currentUser<string>("DisplayName"),
                                "Status": "To be processed"
                            }, { expansionLevel: 2, timeoutMs: 30000 });
                        }
                    }
                    openPage("IntermediateLoadingPage");
                    break;
                case "refresh":
                    showSpinner(true, { message: "Refreshing page..." });
                    setAppVar("Boolean_IsRefresh", true);
                    openPage("IntermediateLoadingPage");
                    break;
                case "saveForLater":
                    showSpinner(true, { message: "Saving item for later..." });
                    boolIsSaved = true as boolean;
                    try {
                        await validationSave("VarValidationControl_MainPage");
                    }
                    catch (exception) {
                        if (exception instanceof Error && exception.message.includes(" was not converted: "))
                            throw exception;
                        showMessage({ title: "Error", message: String("There was a problem trying to Save for Later. Please try again\r\nError: " + String(recordField<string>(exception, "message") ?? "")), position: "top", type: "error", seconds: 5 });
                        boolIsSaved = false as boolean;
                    }
                    if (boolIsSaved) {
                        if (String(String(getAppVar<string>("String_MilesRuntime") ?? "").toLowerCase()).trim() === "dev") {
                            await entityRecordUpdate(APP_CONFIG.entityDev, recordField(getAppVar("Miles_CurrentDEVItem"), "Id"), {
                                "DiscrepanciesList": (getAppVar<string[]>("List_Discrepancies") ?? []).join(","),
                                "GeneratedEvents": jsonStringify(getAppVar("DataTable_OracleEvent")),
                                "ItemData": jsonStringify(getAppVar("Dictionary_ActionData")),
                                "LastUpdatedBy": currentUser<string>("DisplayName"),
                                "ProcessingTime": (recordField<string>(getAppVar("Miles_CurrentDEVItem"), "ProcessingTime") ?? "") === "" ? formatTimeSpan(new Date().getTime() - (parseDateExact(getAppVar<string>("String_StartTime"), "dd/MM/yyyy HH:mm:ss") ?? dateMin()).getTime(), "hh\\:mm\\:ss") : formatTimeSpan(new Date().getTime() - (parseDateExact(getAppVar<string>("String_StartTime"), "dd/MM/yyyy HH:mm:ss") ?? dateMin()).getTime() + timeSpanParse(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "ProcessingTime")), "hh\\:mm\\:ss"),
                                "Status": "To be processed"
                            }, { expansionLevel: 2, timeoutMs: 30000 });
                        }
                        else {
                            await entityRecordUpdate(APP_CONFIG.entityProd, recordField(getAppVar("Miles_CurrentPRODItem"), "Id"), {
                                "DiscrepanciesList": (getAppVar<string[]>("List_Discrepancies") ?? []).join(","),
                                "GeneratedEvents": jsonStringify(getAppVar("DataTable_OracleEvent")),
                                "ItemData": jsonStringify(getAppVar("Dictionary_ActionData")),
                                "LastUpdatedBy": currentUser<string>("DisplayName"),
                                "ProcessingTime": (recordField<string>(getAppVar("Miles_CurrentPRODItem"), "ProcessingTime") ?? "") === "" ? formatTimeSpan(new Date().getTime() - (parseDateExact(getAppVar<string>("String_StartTime"), "dd/MM/yyyy HH:mm:ss") ?? dateMin()).getTime(), "hh\\:mm\\:ss") : formatTimeSpan(new Date().getTime() - (parseDateExact(getAppVar<string>("String_StartTime"), "dd/MM/yyyy HH:mm:ss") ?? dateMin()).getTime() + timeSpanParse(recordField<string>(getAppVar("Miles_CurrentPRODItem"), "ProcessingTime")), "hh\\:mm\\:ss"),
                                "Status": "To be processed"
                            }, { expansionLevel: 2, timeoutMs: 30000 });
                        }
                        setAppVar("String_MainDraftJson", "");
                        openPage("IntermediateLoadingPage");
                    }
                    else {
                        showSpinner(false);
                        showMessage({ title: "Error", message: "Failed to save item for later, please retry", position: "top", type: "error", seconds: 5 });
                    }
                    break;
                case "approve":
                    showSpinner(true, { message: "Approving item..." });
                    boolIsSaved = true as boolean;
                    try {
                        await validationSave("VarValidationControl_MainPage");
                    }
                    catch (exception) {
                        if (exception instanceof Error && exception.message.includes(" was not converted: "))
                            throw exception;
                        showMessage({ title: "Error", message: String("Failed to approve item. Please try again\r\nError: " + String(recordField<string>(exception, "message") ?? "")), position: "top", type: "error", seconds: 5 });
                        boolIsSaved = false as boolean;
                    }
                    if (boolIsSaved) {
                        if (String(String(getAppVar<string>("String_MilesRuntime") ?? "").toLowerCase()).trim() === "dev") {
                            await entityRecordUpdate(APP_CONFIG.entityDev, recordField(getAppVar("Miles_CurrentDEVItem"), "Id"), {
                                "DiscrepanciesList": (getAppVar<string[]>("List_Discrepancies") ?? []).join(","),
                                "GeneratedEvents": jsonStringify(getAppVar("DataTable_OracleEvent")),
                                "ItemData": jsonStringify(getAppVar("Dictionary_ActionData")),
                                "LastUpdatedBy": currentUser<string>("DisplayName"),
                                "ProcessingTime": (recordField<string>(getAppVar("Miles_CurrentDEVItem"), "ProcessingTime") ?? "") === "" ? formatTimeSpan(new Date().getTime() - (parseDateExact(getAppVar<string>("String_StartTime"), "dd/MM/yyyy HH:mm:ss") ?? dateMin()).getTime(), "hh\\:mm\\:ss") : formatTimeSpan(new Date().getTime() - (parseDateExact(getAppVar<string>("String_StartTime"), "dd/MM/yyyy HH:mm:ss") ?? dateMin()).getTime() + timeSpanParse(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "ProcessingTime")), "hh\\:mm\\:ss"),
                                "Status": "Approved"
                            }, { expansionLevel: 2, timeoutMs: 30000 });
                        }
                        else {
                            await entityRecordUpdate(APP_CONFIG.entityProd, recordField(getAppVar("Miles_CurrentPRODItem"), "Id"), {
                                "DiscrepanciesList": (getAppVar<string[]>("List_Discrepancies") ?? []).join(","),
                                "GeneratedEvents": jsonStringify(getAppVar("DataTable_OracleEvent")),
                                "ItemData": jsonStringify(getAppVar("Dictionary_ActionData")),
                                "LastUpdatedBy": currentUser<string>("DisplayName"),
                                "ProcessingTime": (recordField<string>(getAppVar("Miles_CurrentPRODItem"), "ProcessingTime") ?? "") === "" ? formatTimeSpan(new Date().getTime() - (parseDateExact(getAppVar<string>("String_StartTime"), "dd/MM/yyyy HH:mm:ss") ?? dateMin()).getTime(), "hh\\:mm\\:ss") : formatTimeSpan(new Date().getTime() - (parseDateExact(getAppVar<string>("String_StartTime"), "dd/MM/yyyy HH:mm:ss") ?? dateMin()).getTime() + timeSpanParse(recordField<string>(getAppVar("Miles_CurrentPRODItem"), "ProcessingTime")), "hh\\:mm\\:ss"),
                                "Status": "Approved"
                            }, { expansionLevel: 2, timeoutMs: 30000 });
                        }
                        await addToQueue(APP_CONFIG.queueName, {
                            "ActionTaken": "Approved",
                            "UserEmail": formatString("{0}", currentUser<string>("Email")),
                            "ContractStartDate": formatString("{0}", dictOf((getAppVar("Dictionary_ActionData") as Record<string, unknown>)).get("ContractStartDate")),
                            "ContractEndDate": formatString("{0}", dictOf((getAppVar("Dictionary_ActionData") as Record<string, unknown>)).get("ContractEndDate")),
                            "AwardType": formatString("{0}", dictOf((getAppVar("Dictionary_ActionData") as Record<string, unknown>)).get("AwardType")),
                            "RedactedFilePath": formatString("{0}", textContains(String(String(getAppVar<string>("String_MilesRuntime") ?? "").toLowerCase()).trim(), "dev") ? recordField<string>(getAppVar("Miles_CurrentDEVItem"), "RedactedFilePath") : recordField<string>(getAppVar("Miles_CurrentPRODItem"), "RedactedFilePath")),
                            "ContentValidationData": formatString("{0}", textContains(String(String(getAppVar<string>("String_MilesRuntime") ?? "").toLowerCase()).trim(), "dev") ? recordField<string>(getAppVar("Miles_CurrentDEVItem"), "ContentValidationData") : recordField<string>(getAppVar("Miles_CurrentPRODItem"), "ContentValidationData")),
                            "PagesToBeDeleted": formatString("{0}", getAppVar<string>("String_PagesToBeDeleted")),
                            "ApprovalOption": jsonText(jsonGet(Req, "approvalOption")),
                            "Project": formatString("{0}", dictOf((getAppVar("Dictionary_ActionData") as Record<string, unknown>)).get("Project")),
                            "GeneratedOracleEvents": formatString("{0}", jsonStringify(getAppVar("DataTable_OracleEvent"))),
                            "CompletionDate": formatString("{0}", dictOf((getAppVar("Dictionary_ActionData") as Record<string, unknown>)).get("StudyDate")),
                            "EmailContact": formatString("{0}", dictOf((getAppVar("Dictionary_ActionData") as Record<string, unknown>)).get("EmailContact")),
                            "ProcessedOn": formatString("{0}", formatDate(new Date(), "MM/dd/yyyy HH:mm")),
                            "DiscrepanciesReason": "Airfare: " + String(jsonValues(jsonGet(jsonGet(Req, "reasons"), "Airfare"), "String").map(jsonText).join(",")) + String("\n") + "Meals: " + String(jsonValues(jsonGet(jsonGet(Req, "reasons"), "Meals"), "String").map(jsonText).join(",")) + String("\n") + "FlatFeePart: " + String(jsonValues(jsonGet(jsonGet(Req, "reasons"), "FlatFeePart"), "String").map(jsonText).join(",")) + String("\n") + "Lodging: " + String(jsonValues(jsonGet(jsonGet(Req, "reasons"), "Lodging"), "String").map(jsonText).join(",")) + String("\n") + "Parking: " + String(jsonValues(jsonGet(jsonGet(Req, "reasons"), "Parking"), "String").map(jsonText).join(",")) + String("\n") + "Mileage Cost: " + String(jsonValues(jsonGet(jsonGet(Req, "reasons"), "MileageCost"), "String").map(jsonText).join(",")) + String("\n") + "Miscellaneous: " + String(jsonValues(jsonGet(jsonGet(Req, "reasons"), "Miscellaneous"), "String").map(jsonText).join(",")) + String("\n"),
                            "Action": "Approve"
                        }, { priority: "Normal", reference: "Processed - Approved - " + String(dictOf((getAppVar("Dictionary_ActionData") as Record<string, unknown>)).get("RSSNumber") ?? "") + " - " + String(dictOf((getAppVar("Dictionary_ActionData") as Record<string, unknown>)).get("Project") ?? "") + " - " + String(currentUser<string>("Email") ?? ""), folderPath: APP_CONFIG.queueFolderPath });
                        setAppVar("String_MainDraftJson", "");
                        openPage("IntermediateLoadingPage");
                    }
                    else {
                        showSpinner(false);
                        showMessage({ title: "Error", message: "Failed to approve item for later, please retry", position: "top", type: "error", seconds: 5 });
                    }
                    break;
                case "reject":
                    showSpinner(true, { message: "Rejecting item..." });
                    if (String(String(getAppVar<string>("String_MilesRuntime") ?? "").toLowerCase()).trim() === "dev") {
                        await entityRecordUpdate(APP_CONFIG.entityDev, recordField(getAppVar("Miles_CurrentDEVItem"), "Id"), {
                            "LastUpdatedBy": currentUser<string>("DisplayName"),
                            "ProcessingTime": (recordField<string>(getAppVar("Miles_CurrentDEVItem"), "ProcessingTime") ?? "") === "" ? formatTimeSpan(new Date().getTime() - (parseDateExact(getAppVar<string>("String_StartTime"), "dd/MM/yyyy HH:mm:ss") ?? dateMin()).getTime(), "hh\\:mm\\:ss") : formatTimeSpan(new Date().getTime() - (parseDateExact(getAppVar<string>("String_StartTime"), "dd/MM/yyyy HH:mm:ss") ?? dateMin()).getTime() + timeSpanParse(recordField<string>(getAppVar("Miles_CurrentDEVItem"), "ProcessingTime")), "hh\\:mm\\:ss"),
                            "Status": "Rejected"
                        }, { expansionLevel: 2, timeoutMs: 30000 });
                    }
                    else {
                        await entityRecordUpdate(APP_CONFIG.entityProd, recordField(getAppVar("Miles_CurrentPRODItem"), "Id"), {
                            "LastUpdatedBy": currentUser<string>("DisplayName"),
                            "ProcessingTime": (recordField<string>(getAppVar("Miles_CurrentPRODItem"), "ProcessingTime") ?? "") === "" ? formatTimeSpan(new Date().getTime() - (parseDateExact(getAppVar<string>("String_StartTime"), "dd/MM/yyyy HH:mm:ss") ?? dateMin()).getTime(), "hh\\:mm\\:ss") : formatTimeSpan(new Date().getTime() - (parseDateExact(getAppVar<string>("String_StartTime"), "dd/MM/yyyy HH:mm:ss") ?? dateMin()).getTime() + timeSpanParse(recordField<string>(getAppVar("Miles_CurrentPRODItem"), "ProcessingTime")), "hh\\:mm\\:ss"),
                            "Status": "Rejected"
                        }, { expansionLevel: 2, timeoutMs: 30000 });
                    }
                    await addToQueue(APP_CONFIG.queueName, {
                        "ActionTaken": "Rejected",
                        "UserEmail": formatString("{0}", currentUser<string>("Email")),
                        "Action": "Reject",
                        "ProcessedOn": formatString("{0}", formatDate(new Date(), "MM/dd/yyyy HH:mm")),
                        "RedactedFilePath": formatString("{0}", textContains(String(String(getAppVar<string>("String_MilesRuntime") ?? "").toLowerCase()).trim(), "dev") ? recordField<string>(getAppVar("Miles_CurrentDEVItem"), "RedactedFilePath") : recordField<string>(getAppVar("Miles_CurrentPRODItem"), "RedactedFilePath")),
                        "RejectionReason": jsonText(jsonGet(Req, "rejectionReason"))
                    }, { priority: "Normal", reference: "Processed - Rejected - " + String(dictOf((getAppVar("Dictionary_ActionData") as Record<string, unknown>)).get("RSSNumber") ?? "") + " - " + String(dictOf((getAppVar("Dictionary_ActionData") as Record<string, unknown>)).get("Project") ?? "") + " - " + String(currentUser<string>("Email") ?? ""), folderPath: APP_CONFIG.queueFolderPath });
                    openPage("IntermediateLoadingPage");
                    break;
            }
        }
        catch (exception) {
            if (exception instanceof Error && exception.message.includes(" was not converted: "))
                throw exception;
        }
    }
}
}
