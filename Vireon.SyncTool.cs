using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

// Sync Tool for Vireon: SQLite -> MySQL
// Bu araç SQLite verilerini temizlenmiş olan MySQL veritabanına taşır.

const string sqliteConn = "Data Source=c:\\Users\\cavit\\OneDrive\\Desktop\\Vireon\\Database\\vireon_local.db";
const string mysqlConn = "Server=localhost;Database=VireonDB;Uid=root;Pwd=;";

var sqliteOptions = new DbContextOptionsBuilder<VireonContext>()
    .UseSqlite(sqliteConn)
    .Options;

var mysqlOptions = new DbContextOptionsBuilder<VireonContext>()
    .UseMySql(mysqlConn, ServerVersion.AutoDetect(mysqlConn))
    .Options;

using var sqliteCtx = new VireonContext(sqliteOptions, null!);
using var mysqlCtx = new VireonContext(mysqlOptions, null!);

Console.WriteLine("--- Vireon Data Sync: SQLite -> MySQL ---");

try 
{
    // 1. Users
    var users = await sqliteCtx.Users.AsNoTracking().ToListAsync();
    Console.WriteLine($"Migrating {users.Count} users...");
    foreach(var user in users) {
        if(!await mysqlCtx.Users.AnyAsync(u => u.Id == user.Id)) {
            mysqlCtx.Users.Add(user);
        }
    }
    await mysqlCtx.SaveChangesAsync();

    // 2. Accounts
    var accounts = await sqliteCtx.Accounts.AsNoTracking().ToListAsync();
    Console.WriteLine($"Migrating {accounts.Count} accounts...");
    foreach(var acc in accounts) {
        if(!await mysqlCtx.Accounts.AnyAsync(a => a.Id == acc.Id)) {
            mysqlCtx.Accounts.Add(acc);
        }
    }
    await mysqlCtx.SaveChangesAsync();

    // 3. DailyLimits
    var limits = await sqliteCtx.DailyLimits.AsNoTracking().ToListAsync();
    Console.WriteLine($"Migrating {limits.Count} limits...");
    foreach(var lim in limits) {
        if(!await mysqlCtx.DailyLimits.AnyAsync(d => d.Id == lim.Id)) {
            mysqlCtx.DailyLimits.Add(lim);
        }
    }
    await mysqlCtx.SaveChangesAsync();

    // 4. Transactions
    var txs = await sqliteCtx.Transactions.AsNoTracking().ToListAsync();
    Console.WriteLine($"Migrating {txs.Count} transactions...");
    foreach(var tx in txs) {
        if(!await mysqlCtx.Transactions.AnyAsync(t => t.Id == tx.Id)) {
            mysqlCtx.Transactions.Add(tx);
        }
    }
    await mysqlCtx.SaveChangesAsync();

    // 5. FraudLogs
    var frauds = await sqliteCtx.FraudLogs.AsNoTracking().ToListAsync();
    Console.WriteLine($"Migrating {frauds.Count} fraud logs...");
    foreach(var f in frauds) {
        if(!await mysqlCtx.FraudLogs.AnyAsync(fl => fl.Id == f.Id)) {
            mysqlCtx.FraudLogs.Add(f);
        }
    }
    await mysqlCtx.SaveChangesAsync();

    // 6. LedgerEntries
    var ledgers = await sqliteCtx.LedgerEntries.AsNoTracking().ToListAsync();
    Console.WriteLine($"Migrating {ledgers.Count} ledger entries...");
    foreach(var l in ledgers) {
        if(!await mysqlCtx.LedgerEntries.AnyAsync(le => le.Id == l.Id)) {
            mysqlCtx.LedgerEntries.Add(l);
        }
    }
    await mysqlCtx.SaveChangesAsync();

    Console.WriteLine("-----------------------------------------");
    Console.WriteLine("✅ Senkronizasyon başarıyla tamamlandı!");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Hata: {ex.Message}");
    if (ex.InnerException != null) Console.WriteLine($"   Srt: {ex.InnerException.Message}");
}
