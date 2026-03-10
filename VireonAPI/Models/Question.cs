using System;

namespace VireonAPI.Models
{
    public class Question
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public string Category { get; set; } = "General";
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
