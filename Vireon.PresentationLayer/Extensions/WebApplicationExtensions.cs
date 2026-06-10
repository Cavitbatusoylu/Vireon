namespace Vireon.PresentationLayer.Extensions;

public static class WebApplicationExtensions
{
    public static WebApplication UseVireonSecurityHeaders(this WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.Headers["X-Frame-Options"] = "DENY";
            context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
            context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            await next();
        });
        return app;
    }

    public static WebApplication UseVireonCaching(this WebApplication app, bool isDevelopment)
    {
        app.Use(async (context, next) =>
        {
            var path = context.Request.Path.Value ?? "";
            if (path.EndsWith(".html") || path == "/")
            {
                context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                context.Response.Headers["Pragma"] = "no-cache";
                context.Response.Headers["Expires"] = "0";
            }
            else if (path.EndsWith(".js") || path.EndsWith(".css"))
            {
                context.Response.Headers["Cache-Control"] = isDevelopment
                    ? "no-cache, no-store, must-revalidate"
                    : "public, max-age=3600";
            }
            else if (path.EndsWith(".png") || path.EndsWith(".jpg") || path.EndsWith(".ico") || path.EndsWith(".webp"))
            {
                context.Response.Headers["Cache-Control"] = "public, max-age=86400";
            }
            await next();
        });
        return app;
    }

    public static WebApplication UseVireonHtmlCharset(this WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            await next();
            var ct = context.Response.ContentType;
            if (ct != null && ct.StartsWith("text/html", StringComparison.OrdinalIgnoreCase)
                && !ct.Contains("charset", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.ContentType = "text/html; charset=utf-8";
            }
        });
        return app;
    }

    public static WebApplication UseVireonApiLogging(this WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            var path = context.Request.Path;
            if (path.StartsWithSegments("/api"))
                logger.LogInformation("📡 {Method} {Path}", context.Request.Method, path);
            await next();
        });
        return app;
    }
}
