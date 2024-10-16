var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient();
var app = builder.Build();

app.UseHttpsRedirection();

// Serve static files
app.UseDefaultFiles();
app.UseStaticFiles();

// Endpoint to exchange GitHub authorization code for access token
app.MapGet("/api/github/oauth/exchange", async (HttpContext context, IHttpClientFactory httpClientFactory) =>
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
    var response = await client.PostAsync("https://github.com/login/oauth/access_token", new FormUrlEncodedContent(
    [
        new KeyValuePair<string, string>("client_id", clientId),
        new KeyValuePair<string, string>("client_secret", clientSecret),
        new KeyValuePair<string, string>("code", code.ToString()),
        new KeyValuePair<string, string>("redirect_uri", redirectUri)
    ]));

    var responseContent = await response.Content.ReadAsStringAsync();
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsync(responseContent);
});

app.Run();
