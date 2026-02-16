namespace USI.Api.Services;

using System.Collections.Concurrent;
using USI.Api.Models;

public class InMemoryTokenStore : ITokenStore
{
    private readonly ConcurrentDictionary<string, UserSession> _sessions = new();

    public void Store(string sessionId, UserSession session) =>
        _sessions[sessionId] = session;

    public UserSession? Get(string sessionId) =>
        _sessions.TryGetValue(sessionId, out var session) ? session : null;

    public void Remove(string sessionId) =>
        _sessions.TryRemove(sessionId, out _);

    public void Update(string sessionId, UserSession session) =>
        _sessions[sessionId] = session;
}
