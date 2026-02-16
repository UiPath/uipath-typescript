namespace USI.Api.Controllers;

using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using USI.Api.Configuration;
using USI.Api.Services;

[ApiController]
[Route("api/[controller]")]
public class CasesController : ControllerBase
{
    private readonly ITokenStore _tokenStore;
    private readonly UiPathOAuthSettings _settings;
    private readonly HttpClient _httpClient;
    private readonly ILogger<CasesController> _logger;

    public CasesController(
        ITokenStore tokenStore,
        IOptions<UiPathOAuthSettings> settings,
        IHttpClientFactory httpClientFactory,
        ILogger<CasesController> logger)
    {
        _tokenStore = tokenStore;
        _settings = settings.Value;
        _httpClient = httpClientFactory.CreateClient("UiPathApi");
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetCases()
    {
        var sessionId = Request.Cookies["session_id"];
        if (string.IsNullOrEmpty(sessionId))
            return Unauthorized(new { error = "No session" });

        var session = _tokenStore.Get(sessionId);
        if (session == null || session.IsExpired)
            return Unauthorized(new { error = "Session expired" });

        var url = $"{_settings.BaseUrl}/{_settings.OrganizationName}/{_settings.TenantName}" +
                  "/pims_/api/v1/processes/summary?processType=CaseManagement";

        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("UiPath Cases API failed: {StatusCode} - {Body}",
                    response.StatusCode, body);
                return StatusCode((int)response.StatusCode,
                    new { error = "Failed to fetch cases", details = body });
            }

            return Content(body, "application/json");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to call UiPath Cases API");
            return StatusCode(502, new { error = "Failed to reach UiPath API" });
        }
    }

    [HttpGet("{processKey}/instances")]
    public async Task<IActionResult> GetCaseInstances(string processKey)
    {
        var sessionId = Request.Cookies["session_id"];
        if (string.IsNullOrEmpty(sessionId))
            return Unauthorized(new { error = "No session" });

        var session = _tokenStore.Get(sessionId);
        if (session == null || session.IsExpired)
            return Unauthorized(new { error = "Session expired" });

        var url = $"{_settings.BaseUrl}/{_settings.OrganizationName}/{_settings.TenantName}" +
                  $"/pims_/api/v1/instances?processKey={processKey}&pageSize=200&processType=CaseManagement";

        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("UiPath Instances API failed: {StatusCode} - {Body}",
                    response.StatusCode, body);
                return StatusCode((int)response.StatusCode,
                    new { error = "Failed to fetch case instances", details = body });
            }

            return Content(body, "application/json");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to call UiPath Instances API");
            return StatusCode(502, new { error = "Failed to reach UiPath API" });
        }
    }

    [HttpGet("instances/{instanceId}/hitl-link")]
    public async Task<IActionResult> GetHitlLink(string instanceId, [FromQuery] string folderKey)
    {
        var sessionId = Request.Cookies["session_id"];
        if (string.IsNullOrEmpty(sessionId))
            return Unauthorized(new { error = "No session" });

        var session = _tokenStore.Get(sessionId);
        if (session == null || session.IsExpired)
            return Unauthorized(new { error = "Session expired" });

        var url = $"{_settings.BaseUrl}/{_settings.OrganizationName}/{_settings.TenantName}" +
                  $"/pims_/api/v1/element-executions/case-instances/{instanceId}";

        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.Add("x-uipath-folderkey", folderKey);

        try
        {
            var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("UiPath Element Executions API failed: {StatusCode} - {Body}",
                    response.StatusCode, body);
                return StatusCode((int)response.StatusCode,
                    new { error = "Failed to fetch element executions", details = body });
            }

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            string? externalLink = null;
            if (root.TryGetProperty("elementExecutions", out var executions))
            {
                foreach (var elem in executions.EnumerateArray())
                {
                    var elementType = elem.GetProperty("elementType").GetString();
                    var status = elem.GetProperty("status").GetString();

                    if (elementType == "UserTask" && status == "InProgress")
                    {
                        var rawLink = elem.GetProperty("externalLink").GetString();
                        if (!string.IsNullOrEmpty(rawLink))
                        {
                            var taskId = rawLink.Split('/').Last();
                            externalLink = $"{_settings.BaseUrl}/{_settings.OrganizationName}/{_settings.TenantName}/actions_/current-task/tasks/{taskId}";
                        }
                        break;
                    }
                }
            }

            return Ok(new { externalLink });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to call UiPath Element Executions API");
            return StatusCode(502, new { error = "Failed to reach UiPath API" });
        }
    }

    [HttpGet("instances/{instanceId}/task-details")]
    public async Task<IActionResult> GetTaskDetails(string instanceId, [FromQuery] string folderKey)
    {
        var sessionId = Request.Cookies["session_id"];
        if (string.IsNullOrEmpty(sessionId))
            return Unauthorized(new { error = "No session" });

        var session = _tokenStore.Get(sessionId);
        if (session == null || session.IsExpired)
            return Unauthorized(new { error = "Session expired" });

        try
        {
            // 1. Call element-executions API to get taskId + externalLink
            var elemUrl = $"{_settings.BaseUrl}/{_settings.OrganizationName}/{_settings.TenantName}" +
                          $"/pims_/api/v1/element-executions/case-instances/{instanceId}";
            var elemRequest = new HttpRequestMessage(HttpMethod.Get, elemUrl);
            elemRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
            elemRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            elemRequest.Headers.Add("x-uipath-folderkey", folderKey);

            var elemResponse = await _httpClient.SendAsync(elemRequest);
            var elemBody = await elemResponse.Content.ReadAsStringAsync();
            if (!elemResponse.IsSuccessStatusCode)
            {
                _logger.LogError("Element Executions API failed: {StatusCode} - {Body}", elemResponse.StatusCode, elemBody);
                return StatusCode((int)elemResponse.StatusCode, new { error = "Failed to fetch element executions", details = elemBody });
            }

            string? taskId = null;
            string? externalLink = null;
            using (var elemDoc = JsonDocument.Parse(elemBody))
            {
                if (elemDoc.RootElement.TryGetProperty("elementExecutions", out var executions))
                {
                    foreach (var elem in executions.EnumerateArray())
                    {
                        var elementType = elem.GetProperty("elementType").GetString();
                        var status = elem.GetProperty("status").GetString();
                        if (elementType == "UserTask" && status == "InProgress")
                        {
                            var rawLink = elem.GetProperty("externalLink").GetString();
                            if (!string.IsNullOrEmpty(rawLink))
                            {
                                taskId = rawLink.Split('/').Last();
                                externalLink = $"{_settings.BaseUrl}/{_settings.OrganizationName}/{_settings.TenantName}/actions_/current-task/tasks/{taskId}";
                            }
                            break;
                        }
                    }
                }
            }

            // Fallback: if externalLink was empty, try GetTasksAcrossFolders API
            if (taskId == null)
            {
                var fallbackUrl = $"{_settings.BaseUrl}/{_settings.OrganizationName}/{_settings.TenantName}" +
                                  $"/orchestrator_/odata/Tasks/UiPath.Server.Configuration.OData.GetTasksAcrossFolders?jobId={instanceId}";
                var fallbackRequest = new HttpRequestMessage(HttpMethod.Get, fallbackUrl);
                fallbackRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
                fallbackRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                var fallbackResponse = await _httpClient.SendAsync(fallbackRequest);
                if (fallbackResponse.IsSuccessStatusCode)
                {
                    var fallbackBody = await fallbackResponse.Content.ReadAsStringAsync();
                    using var fallbackDoc = JsonDocument.Parse(fallbackBody);
                    if (fallbackDoc.RootElement.TryGetProperty("value", out var tasks))
                    {
                        foreach (var task in tasks.EnumerateArray())
                        {
                            if (task.TryGetProperty("Id", out var idProp))
                            {
                                taskId = idProp.GetInt64().ToString();
                                externalLink = $"{_settings.BaseUrl}/{_settings.OrganizationName}/{_settings.TenantName}/actions_/current-task/tasks/{taskId}";
                                break;
                            }
                        }
                    }
                }
                else
                {
                    _logger.LogWarning("GetTasksAcrossFolders fallback failed: {StatusCode}", fallbackResponse.StatusCode);
                }
            }

            if (taskId == null)
                return Ok(new { externalLink = (string?)null, task = (object?)null });

            // 2. Call GetAllForCurrentUser to resolve folderKey → folderId
            var foldersUrl = $"{_settings.BaseUrl}/{_settings.OrganizationName}/{_settings.TenantName}" +
                             "/orchestrator_/api/Folders/GetAllForCurrentUser";
            var foldersRequest = new HttpRequestMessage(HttpMethod.Get, foldersUrl);
            foldersRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
            foldersRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var foldersResponse = await _httpClient.SendAsync(foldersRequest);
            var foldersBody = await foldersResponse.Content.ReadAsStringAsync();
            if (!foldersResponse.IsSuccessStatusCode)
            {
                _logger.LogError("Folders API failed: {StatusCode} - {Body}", foldersResponse.StatusCode, foldersBody);
                return StatusCode((int)foldersResponse.StatusCode, new { error = "Failed to fetch folders", details = foldersBody });
            }

            long? folderId = null;
            using (var foldersDoc = JsonDocument.Parse(foldersBody))
            {
                if (foldersDoc.RootElement.TryGetProperty("PageItems", out var pageItems))
                {
                    foreach (var folder in pageItems.EnumerateArray())
                    {
                        var key = folder.GetProperty("Key").GetString();
                        if (string.Equals(key, folderKey, StringComparison.OrdinalIgnoreCase))
                        {
                            folderId = folder.GetProperty("Id").GetInt64();
                            break;
                        }
                    }
                }
            }

            if (folderId == null)
            {
                _logger.LogError("Folder with key {FolderKey} not found", folderKey);
                return BadRequest(new { error = "Folder not found for the given key" });
            }

            // 3. Call GetAppTaskById
            var taskUrl = $"{_settings.BaseUrl}/{_settings.OrganizationName}/{_settings.TenantName}" +
                          $"/orchestrator_/tasks/AppTasks/GetAppTaskById?taskId={taskId}";
            var taskRequest = new HttpRequestMessage(HttpMethod.Get, taskUrl);
            taskRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
            taskRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            taskRequest.Headers.Add("X-UIPATH-OrganizationUnitId", folderId.ToString());

            var taskResponse = await _httpClient.SendAsync(taskRequest);
            var taskBody = await taskResponse.Content.ReadAsStringAsync();
            if (!taskResponse.IsSuccessStatusCode)
            {
                _logger.LogError("GetAppTaskById failed: {StatusCode} - {Body}", taskResponse.StatusCode, taskBody);
                return StatusCode((int)taskResponse.StatusCode, new { error = "Failed to fetch task", details = taskBody });
            }

            // Extract current user email from JWT
            var currentUserEmail = ExtractEmailFromJwt(session.AccessToken);

            // Parse task JSON and return consolidated response
            using var taskDoc = JsonDocument.Parse(taskBody);
            var taskElement = taskDoc.RootElement;

            return Ok(new
            {
                taskId,
                folderId,
                externalLink,
                task = JsonSerializer.Deserialize<JsonElement>(taskBody),
                currentUserEmail
            });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to fetch task details");
            return StatusCode(502, new { error = "Failed to reach UiPath API" });
        }
    }

    [HttpPost("tasks/complete")]
    public async Task<IActionResult> CompleteTask([FromBody] JsonElement body)
    {
        var sessionId = Request.Cookies["session_id"];
        if (string.IsNullOrEmpty(sessionId))
            return Unauthorized(new { error = "No session" });

        var session = _tokenStore.Get(sessionId);
        if (session == null || session.IsExpired)
            return Unauthorized(new { error = "Session expired" });

        var taskId = body.GetProperty("taskId").GetInt64();
        var folderId = body.GetProperty("folderId").GetInt64();
        var action = body.GetProperty("action").GetString();
        var data = body.GetProperty("data");

        var url = $"{_settings.BaseUrl}/{_settings.OrganizationName}/{_settings.TenantName}" +
                  "/orchestrator_/tasks/AppTasks/CompleteAppTask";

        var completeBody = new
        {
            taskId,
            data = JsonSerializer.Deserialize<JsonElement>(data.GetRawText()),
            action
        };

        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        request.Headers.Add("X-UIPATH-OrganizationUnitId", folderId.ToString());
        request.Content = new StringContent(
            JsonSerializer.Serialize(completeBody),
            System.Text.Encoding.UTF8,
            "application/json");

        try
        {
            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("CompleteAppTask API failed: {StatusCode} - {Body}", response.StatusCode, responseBody);
                return StatusCode((int)response.StatusCode, new { error = "Failed to complete task", details = responseBody });
            }

            return Ok(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to call CompleteAppTask API");
            return StatusCode(502, new { error = "Failed to reach UiPath API" });
        }
    }

    [HttpPost("tasks/assign")]
    public async Task<IActionResult> AssignTask([FromBody] JsonElement body)
    {
        var sessionId = Request.Cookies["session_id"];
        if (string.IsNullOrEmpty(sessionId))
            return Unauthorized(new { error = "No session" });

        var session = _tokenStore.Get(sessionId);
        if (session == null || session.IsExpired)
            return Unauthorized(new { error = "Session expired" });

        var taskId = body.GetProperty("taskId").GetInt64();
        var folderId = body.GetProperty("folderId").GetInt64();

        var email = ExtractEmailFromJwt(session.AccessToken);
        if (string.IsNullOrEmpty(email))
            return BadRequest(new { error = "Could not determine user email" });

        var url = $"{_settings.BaseUrl}/{_settings.OrganizationName}/{_settings.TenantName}" +
                  "/orchestrator_/odata/Tasks/UiPath.Server.Configuration.OData.AssignTasks";

        var assignBody = new
        {
            taskAssignments = new[]
            {
                new { TaskId = taskId, UserNameOrEmail = email }
            }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        request.Headers.Add("X-UIPATH-OrganizationUnitId", folderId.ToString());
        request.Content = new StringContent(
            JsonSerializer.Serialize(assignBody),
            System.Text.Encoding.UTF8,
            "application/json");

        try
        {
            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("AssignTasks API failed: {StatusCode} - {Body}", response.StatusCode, responseBody);
                return StatusCode((int)response.StatusCode, new { error = "Failed to assign task", details = responseBody });
            }

            return Ok(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to call AssignTasks API");
            return StatusCode(502, new { error = "Failed to reach UiPath API" });
        }
    }

    private static string? ExtractEmailFromJwt(string accessToken)
    {
        var segments = accessToken.Split('.');
        if (segments.Length != 3) return null;

        var payload = segments[1];
        // base64url → base64
        payload = payload.Replace('-', '+').Replace('_', '/');
        switch (payload.Length % 4)
        {
            case 2: payload += "=="; break;
            case 3: payload += "="; break;
        }

        var bytes = Convert.FromBase64String(payload);
        var json = System.Text.Encoding.UTF8.GetString(bytes);
        using var doc = JsonDocument.Parse(json);

        if (doc.RootElement.TryGetProperty("email", out var email))
            return email.GetString();

        return null;
    }
}
