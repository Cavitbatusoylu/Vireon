using Microsoft.EntityFrameworkCore;
using VireonAPI.Models;


namespace VireonAPI.Data
{
    public class VireonContext : DbContext
    {
        public VireonContext(DbContextOptions<VireonContext> options) : base(options) { }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Account> Accounts { get; set; } = null!;
        public DbSet<Question> Questions { get; set; } = null!;
    }
}
