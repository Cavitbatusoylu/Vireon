namespace Vireon.DtoLayer.DTOs
{
    public class ChatRequest
    {
        public string? Message { get; set; }

        /// <summary>UI dili: "tr" veya "en". Boşsa Türkçe varsayılır.</summary>
        public string? Lang { get; set; }
    }
}
