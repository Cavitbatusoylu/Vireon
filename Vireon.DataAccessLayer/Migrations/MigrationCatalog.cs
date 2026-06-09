namespace Vireon.DataAccessLayer.Migrations;

/// <summary>
/// EF Core migration grupları — şema evrimi dört aşamada yönetilir.
/// </summary>
public static class MigrationCatalog
{
    public sealed record MigrationInfo(string Name, string DescriptionTr, string DescriptionEn, string[] TablesOrChanges);

    public static readonly IReadOnlyList<MigrationInfo> All = new[]
    {
        new MigrationInfo(
            "InitialCreate",
            "Temel 6 tablo",
            "Core 6 tables",
            new[] { "Users", "Accounts", "Transactions", "DailyLimits", "FraudLogs", "LedgerEntries" }),
        new MigrationInfo(
            "AddRowVersion",
            "Account concurrency token",
            "Account concurrency token",
            new[] { "Accounts.RowVersion (BLOB, optimistic concurrency)" }),
        new MigrationInfo(
            "AddUserRole",
            "Admin/User rolü",
            "Admin/User role",
            new[] { "Users.Role (default: User)" }),
        new MigrationInfo(
            "AddPlainPassword",
            "Demo okunabilir şifre sütunu",
            "Demo readable password column",
            new[] { "Users.PlainPassword (nullable, development visibility)" })
    };
}
