using Microsoft.EntityFrameworkCore;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

// Sync & Seed Tool for Vireon: SQLite, MySQL, SQL Server
// Bu araç tüm veritabanlarını aynı test verileriyle (Ahmet, Ayşe, Admin) besler.

const string sqliteConn = "Data Source=c:\\Users\\cavit\\OneDrive\\Desktop\\Vireon\\Database\\vireon_local.db";
const string mysqlConn = "Server=localhost;Database=VireonDB;Uid=root;Pwd=;";
const string sqlserverConn = "Server=.;Database=VireonDB;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true";

var providers = new Dictionary<string, DbContextOptions<VireonContext>>
{
    { "SQLite", new DbContextOptionsBuilder<VireonContext>().UseSqlite(sqliteConn).Options }
    // Diğer veritabanları şimdilik yoruma alındı (çevrimdışı iseler AutoDetect çökmesin diye)
    // { "MySQL", new DbContextOptionsBuilder<VireonContext>().UseMySql(mysqlConn, ServerVersion.AutoDetect(mysqlConn)).Options },
    // { "SQL Server", new DbContextOptionsBuilder<VireonContext>().UseSqlServer(sqlserverConn).Options }
};

Console.WriteLine("--- Vireon Multi-DB Sync & Seed Tool ---");

foreach (var provider in providers)
{
    Console.WriteLine($"\nProcessing {provider.Key}...");
    try
    {
        using var ctx = new VireonContext(provider.Value, null!);
        
        // 1. SEED USERS
        var seedUsers = new List<User>
        {
            new User { Id = 1, Name = "Ahmet", Surname = "Yılmaz", Email = "ahmet.yilmaz@vireon.com", Password = "$2a$11$eO.hK7q3G/eGq5i1L9P.hOGv7H1q7zV5a0Y6QjK6l8T1X3v2QGZmO", AccountNumber = "VR-1001" },
            new User { Id = 2, Name = "Ayşe", Surname = "Demir", Email = "ayse.demir@vireon.com", Password = "$2a$11$eO.hK7q3G/eGq5i1L9P.hOGv7H1q7zV5a0Y6QjK6l8T1X3v2QGZmO", AccountNumber = "VR-1002" },
            new User { Id = 3, Name = "Admin", Surname = "Vireon", Email = "admin@vireon.com", Password = "$2a$11$eO.hK7q3G/eGq5i1L9P.hOGv7H1q7zV5a0Y6QjK6l8T1X3v2QGZmO", AccountNumber = "VR-9999" }
        };

        foreach (var user in seedUsers)
        {
            if (!await ctx.Users.AnyAsync(u => u.Email == user.Email))
            {
                ctx.Users.Add(user);
                Console.WriteLine($"  + User Added: {user.Email}");
            }
        }
        await ctx.SaveChangesAsync();

        // 2. SEED ACCOUNTS
        var seedAccounts = new List<Account>
        {
            new Account { Id = 1, UserId = 1, AccountNumber = "TR1001", Balance = 50000.00m, Currency = "TRY" },
            new Account { Id = 2, UserId = 2, AccountNumber = "TR1002", Balance = 75000.00m, Currency = "TRY" },
            new Account { Id = 3, UserId = 3, AccountNumber = "TR9999", Balance = 9000000.00m, Currency = "TRY" }
        };

        foreach (var acc in seedAccounts)
        {
            if (!await ctx.Accounts.AnyAsync(a => a.AccountNumber == acc.AccountNumber))
            {
                ctx.Accounts.Add(acc);
                Console.WriteLine($"  + Account Added: {acc.AccountNumber}");
            }
        }
        await ctx.SaveChangesAsync();

        // 3. SEED DAILY LIMITS
        var seedLimits = new List<DailyLimit>
        {
            new DailyLimit { UserId = 1, MaxDailyLimit = 100000.00m, UsedLimit = 0.00m, LastResetDate = DateTime.Now },
            new DailyLimit { UserId = 2, MaxDailyLimit = 100000.00m, UsedLimit = 0.00m, LastResetDate = DateTime.Now },
            new DailyLimit { UserId = 3, MaxDailyLimit = 5000000.00m, UsedLimit = 0.00m, LastResetDate = DateTime.Now }
        };

        foreach (var lim in seedLimits)
        {
            if (!await ctx.DailyLimits.AnyAsync(d => d.UserId == lim.UserId))
            {
                ctx.DailyLimits.Add(lim);
                Console.WriteLine($"  + Limit Added for User ID: {lim.UserId}");
            }
        }
        await ctx.SaveChangesAsync();

        Console.WriteLine($"✅ {provider.Key} synchronized successfully!");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error in {provider.Key}: {ex.Message}");
    }
}

Console.WriteLine("\n--- All jobs done! ---");
