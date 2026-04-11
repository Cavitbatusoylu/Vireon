using System;
using Vireon.BusinessLayer.Abstract;
using Vireon.EntityLayer.Concrete;

namespace Vireon.BusinessLayer.Concrete
{
    public class TransactionManager : ITransactionService // Sözleşmeyi imzaladık
    {
        public void ProcessTransaction(Transaction transaction)
        {
            // 1. İŞ KURALI (BUSINESS RULE): Hacker Enes'e Geçit Yok!
            if (transaction.SenderAccountId == transaction.ReceiverAccountId)
            {
                // Eğer gönderen ile alıcı aynı kişiyse, sistemi durdur ve hata fırlat!
                throw new InvalidOperationException("İşlem hatası: Bir kullanıcı kendi hesabına para gönderemez!");
            }

            // 2. VERİTABANI KAYDI SİMÜLASYONU
            Console.WriteLine($"İşlem Başarılı: {transaction.Amount} TL veritabanına işlenmek üzere hazırlanıyor...");
        }
    }
}