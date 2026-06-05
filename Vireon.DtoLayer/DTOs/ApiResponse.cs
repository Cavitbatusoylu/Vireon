namespace Vireon.DtoLayer.DTOs
{
    /// <summary>
    /// Standart API response formatı - Tüm endpoint'ler bu formatı kullanmalı
    /// </summary>
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public string? Code { get; set; }

        public static ApiResponse<T> SuccessResponse(string message, T? data = default)
        {
            return new ApiResponse<T>
            {
                Success = true,
                Message = message,
                Data = data
            };
        }

        public static ApiResponse<T> ErrorResponse(string message, string? code = null)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Message = message,
                Code = code
            };
        }
    }

    /// <summary>
    /// Data olmayan response'lar için
    /// </summary>
    public class ApiResponse : ApiResponse<object>
    {
        public static ApiResponse SuccessResponse(string message)
        {
            return new ApiResponse
            {
                Success = true,
                Message = message
            };
        }

        public static ApiResponse ErrorResponse(string message, string? code = null)
        {
            return new ApiResponse
            {
                Success = false,
                Message = message,
                Code = code
            };
        }
    }
}
