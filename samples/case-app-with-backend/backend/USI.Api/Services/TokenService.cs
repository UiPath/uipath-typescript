namespace USI.Api.Services;

using System.Text.Json;
using Microsoft.Extensions.Options;
using USI.Api.Configuration;
using USI.Api.Models;

public class TokenService : ITokenService
{
    private readonly HttpClient _httpClient;
    private readonly UiPathOAuthSettings _settings;
    private readonly ILogger<TokenService> _logger;

    public TokenService(
        HttpClient httpClient,
        IOptions<UiPathOAuthSettings> settings,
        ILogger<TokenService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<TokenResponse> ExchangeCodeForTokenAsync(string authorizationCode)
    {
        var parameters = new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = authorizationCode,
            ["redirect_uri"] = _settings.RedirectUri,
            ["client_id"] = _settings.ClientId,
            ["client_secret"] = _settings.ClientSecret
        };

        return await PostTokenRequestAsync(parameters);
    }

    public async Task<TokenResponse> RefreshTokenAsync(string refreshToken)
    {
        var parameters = new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["client_id"] = _settings.ClientId,
            ["client_secret"] = _settings.ClientSecret,
            ["refresh_token"] = refreshToken
        };

        return await PostTokenRequestAsync(parameters);
    }

    private async Task<TokenResponse> PostTokenRequestAsync(Dictionary<string, string> parameters)
    {
        var content = new FormUrlEncodedContent(parameters);
        var response = await _httpClient.PostAsync(_settings.TokenEndpoint, content);

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Token request failed: {StatusCode} - {Body}", response.StatusCode, responseBody);
            throw new HttpRequestException($"Token request failed with status {response.StatusCode}");
        }

        var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(responseBody)
            ?? throw new InvalidOperationException("Failed to deserialize token response");

        return tokenResponse;
    }
}
