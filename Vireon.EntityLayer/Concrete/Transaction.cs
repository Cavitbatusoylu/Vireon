using System;
namespace Vireon.EntityLayer.Concrete
{
    public class Transaction // Para transferi işlemlerini tutan sınıf
    {
        public int Id { get; set; } // İşlem kimliği
        public int SenderAccountId { get; set; } // Gönderici hesap kimliği
        public int ReceiverAccountId { get; set; } // Alıcı hesap kimliği
        public decimal Amount { get; set; } // Transfer edilen miktar
        public TransactionStatus Status { get; set; } = TransactionStatus.Pending; // İşlem durumu
        public DateTime Date { get; set; } // İşlem tarihi
        public DateTime CreatedAt { get; set; } = DateTime.Now; // Kayıt oluşturulma zamanı
        public string? Description { get; set; } // İşlem açıklaması

        // Navigation Properties (İlişkili Tablolar)
        public Account? SenderAccount { get; set; } // Gönderici hesap bilgisi
        public Account? ReceiverAccount { get; set; } // Alıcı hesap bilgisi
    }

}
