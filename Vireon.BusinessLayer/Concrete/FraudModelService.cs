namespace Vireon.BusinessLayer.Concrete
{
    /// <summary>
    /// Kural tabanlı Fraud Tespit Servisi.
    /// 3 özellik kullanarak risk skoru hesaplar:
    ///   1. Amount (İşlem tutarı)
    ///   2. Hour (İşlem saati — gece işlemleri daha riskli)
    ///   3. Frequency (Sıklık — çok sayıda ardışık işlem riskli)
    /// </summary>
    public class FraudModelService
    {
        private const float FraudThreshold = 0.70f;

        public FraudModelService()
        {
        }

        /// <summary>
        /// Tek parametre ile geriye uyumlu tahmin (mevcut çağrılar bozulmaz)
        /// </summary>
        public (bool IsFraud, float Probability) Predict(float amount)
        {
            return Predict(amount, DateTime.Now.Hour, 1);
        }

        /// <summary>
        /// 3 özellik ile genişletilmiş tahmin
        /// </summary>
        public (bool IsFraud, float Probability) Predict(float amount, float hour, float frequency)
        {
            var safeAmount = amount < 0 ? 0 : amount;
            var safeHour = Math.Clamp(hour, 0f, 23f);
            var safeFrequency = frequency < 0 ? 0 : frequency;

            var probability = CalculateRiskScore(safeAmount, safeHour, safeFrequency);
            return (probability >= FraudThreshold, probability);
        }

        private static float CalculateRiskScore(float amount, float hour, float frequency)
        {
            // Toplam skor 0-1 aralığında normalize edilir.
            var amountRisk = Math.Clamp(amount / 25000f, 0f, 1f);
            var nightRisk = (hour <= 5f || hour >= 23f) ? 1f : 0f;
            var frequencyRisk = Math.Clamp(frequency / 8f, 0f, 1f);

            var score = (amountRisk * 0.6f) + (nightRisk * 0.2f) + (frequencyRisk * 0.2f);
            return Math.Clamp(score, 0f, 1f);
        }
    }
}
