namespace USI.Api.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using USI.Api.Configuration;
using USI.Api.Models;
using USI.Api.Services;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ITokenService _tokenService;
    private readonly ITokenStore _tokenStore;
    private readonly UiPathOAuthSettings _settings;

    public AuthController(
        ITokenService tokenService,
        ITokenStore tokenStore,
        IOptions<UiPathOAuthSettings> settings)
    {
        _tokenService = tokenService;
        _tokenStore = tokenStore;
        _settings = settings.Value;
    }

    /// <summary>
    /// Returns the UiPath authorize URL for the frontend to redirect to.
    /// </summary>
    [HttpGet("login-url")]
    public IActionResult GetLoginUrl()
    {
        var state = Guid.NewGuid().ToString("N");

        Response.Cookies.Append("oauth_state", state, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = false,
            MaxAge = TimeSpan.FromMinutes(10)
        });

        var authorizeUrl = $"{_settings.AuthorizeEndpoint}" +
            $"?response_type=code" +
            $"&client_id={Uri.EscapeDataString(_settings.ClientId)}" +
            $"&scope={Uri.EscapeDataString(_settings.Scopes)}" +
            $"&redirect_uri={Uri.EscapeDataString(_settings.RedirectUri)}" +
            $"&state={state}";

        return Ok(new { url = authorizeUrl, state });
    }

    /// <summary>
    /// Receives the authorization code from frontend, exchanges it for tokens.
    /// </summary>
    [HttpPost("callback")]
    public async Task<IActionResult> Callback([FromBody] AuthCallbackRequest request)
    {
        var storedState = Request.Cookies["oauth_state"];
        if (string.IsNullOrEmpty(storedState) || storedState != request.State)
        {
            return BadRequest(new { error = "Invalid state parameter" });
        }

        Response.Cookies.Delete("oauth_state");

        try
        {
            var tokenResponse = await _tokenService.ExchangeCodeForTokenAsync(request.Code);

            var sessionId = Guid.NewGuid().ToString("N");
            var session = new UserSession
            {
                SessionId = sessionId,
                AccessToken = tokenResponse.AccessToken,
                RefreshToken = tokenResponse.RefreshToken,
                ExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn),
                Scope = tokenResponse.Scope
            };

            _tokenStore.Store(sessionId, session);

            Response.Cookies.Append("session_id", sessionId, new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Secure = false,
                MaxAge = TimeSpan.FromDays(60)
            });

            return Ok(new { authenticated = true, expiresAt = session.ExpiresAt });
        }
        catch (HttpRequestException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Checks if the current session is authenticated.
    /// </summary>
    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var sessionId = Request.Cookies["session_id"];
        if (string.IsNullOrEmpty(sessionId))
            return Ok(new { authenticated = false });

        var session = _tokenStore.Get(sessionId);
        if (session == null)
            return Ok(new { authenticated = false });

        return Ok(new { authenticated = true, expiresAt = session.ExpiresAt });
    }

    /// <summary>
    /// Logs out the current session.
    /// </summary>
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        var sessionId = Request.Cookies["session_id"];
        if (!string.IsNullOrEmpty(sessionId))
        {
            _tokenStore.Remove(sessionId);
            Response.Cookies.Delete("session_id");
        }
        return Ok(new { authenticated = false });
    }
}
