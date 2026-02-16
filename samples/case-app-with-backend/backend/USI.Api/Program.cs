using USI.Api.Configuration;
using USI.Api.Middleware;
using USI.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Bind UiPath OAuth configuration
builder.Services.Configure<UiPathOAuthSettings>(
    builder.Configuration.GetSection(UiPathOAuthSettings.SectionName));

// Register services
builder.Services.AddSingleton<ITokenStore, InMemoryTokenStore>();
builder.Services.AddHttpClient<ITokenService, TokenService>();
builder.Services.AddHttpClient("UiPathApi");
builder.Services.AddControllers();

// CORS - allow frontend origin with credentials (cookies)
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:3000"];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors();
app.UseMiddleware<TokenRefreshMiddleware>();
app.MapControllers();

app.Run();
