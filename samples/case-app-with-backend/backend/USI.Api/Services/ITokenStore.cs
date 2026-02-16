namespace USI.Api.Services;

using USI.Api.Models;

public interface ITokenStore
{
    void Store(string sessionId, UserSession session);
    UserSession? Get(string sessionId);
    void Remove(string sessionId);
    void Update(string sessionId, UserSession session);
}
