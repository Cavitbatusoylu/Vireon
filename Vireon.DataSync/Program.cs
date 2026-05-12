using Microsoft.EntityFrameworkCore;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

const string sqliteConn = "Data Source=c:\\Users\\cavit\\OneDrive\\Desktop\\Vireon\\vireon_local.db";
var options = new DbContextOptionsBuilder<VireonContext>().UseSqlite(sqliteConn).Options;

try
{
    using var ctx = new VireonContext(options, null!);
    
    // List all users
    var allUsers = await ctx.Users.ToListAsync();
    // Tüm şifreleri '123456' olarak sıfırla
    foreach (var u in allUsers)
    {
        u.Password = "123456"; // Backend Program.cs bunu otomatik hash'leyecek
        Console.WriteLine($"{u.Email} şifresi '123456' olarak ayarlandı.");
    }
    await ctx.SaveChangesAsync();

    var cavit = await ctx.Users.FirstOrDefaultAsync(u => u.Email == "cavit@vireon.com");
    if (cavit != null) {
        cavit.Role = "User";
        await ctx.SaveChangesAsync();
        Console.WriteLine("Cavit rolü 'User' olarak güncellendi.");
    }
}
catch (Exception ex) { Console.WriteLine(ex.Message); }
