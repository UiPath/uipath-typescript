namespace USI.Api.Services;

using USI.Api.Models;

public interface ITokenService
{
    Task<TokenResponse> ExchangeCodeForTokenAsync(string authorizationCode);
    Task<TokenResponse> RefreshTokenAsync(string refreshToken);
}
