namespace USI.Api.Middleware;

using USI.Api.Models;
using USI.Api.Services;

public class TokenRefreshMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TokenRefreshMiddleware> _logger;

    public TokenRefreshMiddleware(RequestDelegate next, ILogger<TokenRefreshMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(
        HttpContext context,
        ITokenStore tokenStore,
        ITokenService tokenService)
    {
        var sessionId = context.Request.Cookies["session_id"];
        if (!string.IsNullOrEmpty(sessionId))
        {
            var session = tokenStore.Get(sessionId);
            if (session != null && session.IsExpiringSoon && !string.IsNullOrEmpty(session.RefreshToken))
            {
                try
                {
                    _logger.LogInformation("Token expiring soon for session {SessionId}, refreshing...", sessionId);

                    var tokenResponse = await tokenService.RefreshTokenAsync(session.RefreshToken);

                    var updatedSession = new UserSession
                    {
                        SessionId = sessionId,
                        AccessToken = tokenResponse.AccessToken,
                        RefreshToken = tokenResponse.RefreshToken ?? session.RefreshToken,
                        ExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn),
                        Scope = tokenResponse.Scope
                    };

                    tokenStore.Update(sessionId, updatedSession);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to refresh token for session {SessionId}", sessionId);
                }
            }
        }

        await _next(context);
    }
}
