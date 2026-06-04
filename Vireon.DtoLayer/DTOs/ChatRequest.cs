using System.Collections.Generic;

namespace Vireon.DtoLayer.DTOs
{
    public class ChatRequest
    {
        public string? Message { get; set; }

        /// <summary>UI dili: "tr" veya "en". Boşsa Türkçe varsayılır.</summary>
        public string? Lang { get; set; }

        /// <summary>Sohbet geçmişi (bağlam için son mesajlar).</summary>
        public List<ChatMessage>? History { get; set; }
    }

    public class ChatMessage
    {
        public string Role { get; set; } = "user";
        public string Content { get; set; } = "";
    }
}
