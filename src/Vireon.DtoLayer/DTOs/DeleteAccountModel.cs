namespace Vireon.DtoLayer.DTOs
{
    public class DeleteAccountModel
    {
        public string Password { get; set; } = string.Empty;
        public string ConfirmEmail { get; set; } = string.Empty;
        public string ConfirmPhrase { get; set; } = string.Empty;
    }
}
