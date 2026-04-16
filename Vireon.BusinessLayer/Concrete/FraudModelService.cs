using Microsoft.ML;
using Microsoft.ML.Data;
using System;
using System.Collections.Generic;

namespace Vireon.BusinessLayer.Concrete
{
    // ML.NET'in anlayacağı veri modelleri
    public class TransactionData
    {
        [LoadColumn(0)]
        public float Amount { get; set; }
        [LoadColumn(1)]
        public float Hour { get; set; }        // İşlem saati (0-23)
        [LoadColumn(2)]
        public float Frequency { get; set; }   // Son 1 saatteki işlem sayısı
        [LoadColumn(3)]
        public bool IsFraud { get; set; } 
    }

    public class FraudPrediction
    {
        [ColumnName("PredictedLabel")] 
        public bool Prediction { get; set; }
        public float Probability { get; set; }
        public float Score { get; set; }
    }

    /// <summary>
    /// ML.NET tabanlı Fraud Tespit Servisi.
    /// 3 özellik kullanarak risk skoru hesaplar:
    ///   1. Amount (İşlem tutarı)
    ///   2. Hour (İşlem saati — gece işlemleri daha riskli)
    ///   3. Frequency (Sıklık — çok sayıda ardışık işlem riskli)
    /// </summary>
    public class FraudModelService
    {
        private readonly MLContext _mlContext;
        private ITransformer _model;

        public FraudModelService()
        {
            _mlContext = new MLContext(seed: 1);
            TrainModel(); 
        }

        private void TrainModel()
        {
            // Genişletilmiş Sentetik Eğitim Verisi
            var data = new List<TransactionData>
            {
                // Normal işlemler (gün içi, düşük miktar, düşük sıklık)
                new TransactionData { Amount = 50,    Hour = 10, Frequency = 1, IsFraud = false },
                new TransactionData { Amount = 100,   Hour = 14, Frequency = 1, IsFraud = false },
                new TransactionData { Amount = 200,   Hour = 11, Frequency = 2, IsFraud = false },
                new TransactionData { Amount = 500,   Hour = 9,  Frequency = 1, IsFraud = false },
                new TransactionData { Amount = 300,   Hour = 16, Frequency = 1, IsFraud = false },
                new TransactionData { Amount = 1000,  Hour = 13, Frequency = 2, IsFraud = false },
                new TransactionData { Amount = 750,   Hour = 15, Frequency = 1, IsFraud = false },
                new TransactionData { Amount = 150,   Hour = 10, Frequency = 1, IsFraud = false },

                // Şüpheli işlemler (yüksek miktar, gece saatleri, yüksek sıklık)
                new TransactionData { Amount = 10000, Hour = 3,  Frequency = 5, IsFraud = true },
                new TransactionData { Amount = 15000, Hour = 2,  Frequency = 8, IsFraud = true },
                new TransactionData { Amount = 25000, Hour = 4,  Frequency = 6, IsFraud = true },
                new TransactionData { Amount = 8000,  Hour = 1,  Frequency = 10, IsFraud = true },
                new TransactionData { Amount = 20000, Hour = 23, Frequency = 7, IsFraud = true },
                new TransactionData { Amount = 12000, Hour = 3,  Frequency = 4, IsFraud = true },
                new TransactionData { Amount = 30000, Hour = 2,  Frequency = 9, IsFraud = true },
                new TransactionData { Amount = 50000, Hour = 4,  Frequency = 3, IsFraud = true },
            };

            var trainData = _mlContext.Data.LoadFromEnumerable(data);

            // Pipeline: 3 özelliği birleştir ve SdcaLogisticRegression ile modeli eğit
            var pipeline = _mlContext.Transforms.Concatenate("Features", "Amount", "Hour", "Frequency")
                            .Append(_mlContext.BinaryClassification.Trainers.SdcaLogisticRegression(labelColumnName: "IsFraud"));
            _model = pipeline.Fit(trainData);
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
            var predictionEngine = _mlContext.Model.CreatePredictionEngine<TransactionData, FraudPrediction>(_model);
            var input = new TransactionData { Amount = amount, Hour = hour, Frequency = frequency };
            var prediction = predictionEngine.Predict(input);
            return (prediction.Prediction, prediction.Probability);
        }
    }
}
