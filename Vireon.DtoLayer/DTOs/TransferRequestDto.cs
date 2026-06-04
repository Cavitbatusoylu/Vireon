namespace Vireon.DtoLayer.DTOs
{
    public class TransferRequestDto
    {
        public int SenderAccountId { get; set; }
        public int ReceiverAccountId { get; set; }
        public decimal Amount { get; set; }
        public string? Description { get; set; }
    }
}
