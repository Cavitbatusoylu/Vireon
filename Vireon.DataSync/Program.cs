using Microsoft.EntityFrameworkCore;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

const string sqliteConn = "Data Source=c:\\Users\\cavit\\OneDrive\\Desktop\\Vireon\\vireon_local.db";
var options = new DbContextOptionsBuilder<VireonContext>().UseSqlite(sqliteConn).Options;

try
{
    using var ctx = new VireonContext(options, null!);
    var cavit = await ctx.Users.FirstOrDefaultAsync(u => u.Email == "cavit@vireon.com");
    if (cavit != null) {
        cavit.Role = "Admin";
        await ctx.SaveChangesAsync();
        Console.WriteLine("Cavit role updated to Admin.");
    }
}
catch (Exception ex) { Console.WriteLine(ex.Message); }
