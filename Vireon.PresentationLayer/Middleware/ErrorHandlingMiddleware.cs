using System.Net;
using System.Text.Json;

namespace Vireon.PresentationLayer.Middleware
{
    /// <summary>
    /// Tüm API isteklerinde oluşan hataları yakalayan ve standart JSON formatında döndüren middleware.
    /// Controller'larda her seferinde try-catch yazmak yerine, tüm hatalar merkezi olarak burada yönetilir.
    /// </summary>
    public class ErrorHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ErrorHandlingMiddleware> _logger;

        public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ İşlenmeyen hata: {Path} — {Message}", context.Request.Path, ex.Message);
                await HandleExceptionAsync(context, ex);
            }
        }

        private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            var (statusCode, errorCode) = exception switch
            {
                InvalidOperationException => (HttpStatusCode.BadRequest, "BUSINESS_RULE_VIOLATION"),
                KeyNotFoundException => (HttpStatusCode.NotFound, "RESOURCE_NOT_FOUND"),
                UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "UNAUTHORIZED"),
                ArgumentException => (HttpStatusCode.BadRequest, "INVALID_ARGUMENT"),
                _ => (HttpStatusCode.InternalServerError, "INTERNAL_ERROR")
            };

            context.Response.StatusCode = (int)statusCode;

            var response = new
            {
                success = false,
                message = exception.Message,
                code = errorCode
            };

            var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            await context.Response.WriteAsync(json);
        }
    }
}
