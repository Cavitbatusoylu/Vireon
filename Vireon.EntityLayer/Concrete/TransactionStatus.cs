namespace Vireon.EntityLayer.Concrete
{
    /// <summary>
    /// İşlem durumlarını temsil eden enum.
    /// Veritabanında string olarak saklanır (EF Core HasConversion).
    /// </summary>
    public enum TransactionStatus
    {
        Pending,    // İşlem beklemede
        Completed,  // İşlem başarılı
        Failed,     // İşlem başarısız
        Cancelled   // İşlem iptal edildi
    }
}
