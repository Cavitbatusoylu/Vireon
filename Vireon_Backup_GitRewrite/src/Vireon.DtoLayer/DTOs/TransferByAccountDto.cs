namespace Vireon.DtoLayer.DTOs
{
    public class TransferByAccountDto
    {
        public string SenderAccountNumber { get; set; } = string.Empty;
        public string ReceiverAccountNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Description { get; set; }
    }
}
