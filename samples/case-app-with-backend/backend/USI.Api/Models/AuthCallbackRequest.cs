namespace USI.Api.Models;

public class AuthCallbackRequest
{
    public string Code { get; set; } = string.Empty;
    public string? State { get; set; }
}
