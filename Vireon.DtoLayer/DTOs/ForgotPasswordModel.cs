namespace Vireon.DtoLayer.DTOs
{
    public class ForgotPasswordModel
    {
        public string Email { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
