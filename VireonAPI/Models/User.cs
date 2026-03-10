using System.Collections.Generic;

namespace VireonAPI.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public ICollection<Account> Accounts { get; set; } = new List<Account>();
    }
}
