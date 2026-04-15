namespace Vireon.PresentationLayer.DTOs
{
    public class DepositDto
    {
        public string AccountNumber { get; set; }
        public decimal Amount { get; set; }
        public string? Description { get; set; }
    }
}
