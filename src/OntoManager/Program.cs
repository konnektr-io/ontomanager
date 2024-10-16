var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient();
var app = builder.Build();

app.UseHttpsRedirection();

// Serve static files
app.UseDefaultFiles();
app.UseStaticFiles();

// Endpoint to exchange GitHub authorization code for access token
app.MapPost("/api/github/oauth/exchange_code", async (HttpContext context, IHttpClientFactory httpClientFactory) =>
{
    var clientId = Environment.GetEnvironmentVariable("GITHUB_CLIENT_ID");
    var clientSecret = Environment.GetEnvironmentVariable("GITHUB_CLIENT_SECRET");
    var redirectUri = Environment.GetEnvironmentVariable("GITHUB_REDIRECT_URI");

    if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret) || string.IsNullOrEmpty(redirectUri))
    {
        context.Response.StatusCode = 500;
        await context.Response.WriteAsync("GitHub client ID, secret or redirect URI not configured.");
        return;
    }

    var form = await context.Request.ReadFormAsync();
    var code = form["code"];
    if (string.IsNullOrEmpty(code))
    {
        context.Response.StatusCode = 400;
        await context.Response.WriteAsync("GitHub authorization code not provided.");
        return;
    }

    var client = httpClientFactory.CreateClient();
    client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
    var response = await client.PostAsync("https://github.com/login/oauth/access_token", new FormUrlEncodedContent(
    new[]
    {
        new KeyValuePair<string, string>("client_id", clientId),
        new KeyValuePair<string, string>("client_secret", clientSecret),
        new KeyValuePair<string, string>("code", code.ToString()),
        new KeyValuePair<string, string>("redirect_uri", redirectUri)
    }));

    var responseContent = await response.Content.ReadAsStringAsync();
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsync(responseContent);
});

// Endpoint to retrieve a new authentication token using a refresh token
app.MapPost("/api/github/oauth/refresh_token", async (HttpContext context, IHttpClientFactory httpClientFactory) =>
{
    var clientId = Environment.GetEnvironmentVariable("GITHUB_CLIENT_ID");
    var clientSecret = Environment.GetEnvironmentVariable("GITHUB_CLIENT_SECRET");

    if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
    {
        context.Response.StatusCode = 500;
        await context.Response.WriteAsync("GitHub client ID, secret or redirect URI not configured.");
        return;
    }

    var form = await context.Request.ReadFormAsync();
    var refreshToken = form["refresh_token"];
    if (string.IsNullOrEmpty(refreshToken))
    {
        context.Response.StatusCode = 400;
        await context.Response.WriteAsync("GitHub refresh token not provided.");
        return;
    }

    var client = httpClientFactory.CreateClient();
    client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
    var response = await client.PostAsync("https://github.com/login/oauth/access_token", new FormUrlEncodedContent(
    new[]
    {
        new KeyValuePair<string, string>("client_id", clientId),
        new KeyValuePair<string, string>("client_secret", clientSecret),
        new KeyValuePair<string, string>("grant_type", "refresh_token"),
        new KeyValuePair<string, string>("refresh_token", refreshToken.ToString())
    }));

    var responseContent = await response.Content.ReadAsStringAsync();
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsync(responseContent);
});

app.Run();
