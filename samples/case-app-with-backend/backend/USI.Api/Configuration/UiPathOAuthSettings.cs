namespace USI.Api.Configuration;

public class UiPathOAuthSettings
{
    public const string SectionName = "UiPathOAuth";

    public string OrganizationName { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
    public string Scopes { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://cloud.uipath.com";

    public string AuthorizeEndpoint => $"{BaseUrl}/{OrganizationName}/identity_/connect/authorize";
    public string TokenEndpoint => $"{BaseUrl}/{OrganizationName}/identity_/connect/token";
}
