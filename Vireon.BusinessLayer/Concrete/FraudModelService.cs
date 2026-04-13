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
    /// Klasik ML.NET tabanlı Fraud Tespit Servisi.
    /// (Not: Projede AI özellikleri artık KumruAIService üzerinden dönse de, 
    /// bu servis sistemin bir parçası olarak çalışmaya devam eder.)
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
            // Sentetik Eğitim Verisi (Demo için)
            var data = new List<TransactionData>
            {
                new TransactionData { Amount = 100, IsFraud = false },
                new TransactionData { Amount = 500, IsFraud = false },
                new TransactionData { Amount = 10000, IsFraud = true }, 
                new TransactionData { Amount = 200, IsFraud = false },
                new TransactionData { Amount = 15000, IsFraud = true },
                new TransactionData { Amount = 300, IsFraud = false },
                new TransactionData { Amount = 25000, IsFraud = true }
            };

            var trainData = _mlContext.Data.LoadFromEnumerable(data);

            // Pipeline: Veriyi özellik olarak işle ve FastTree algoritmasıyla modeli eğit
            var pipeline = _mlContext.Transforms.Concatenate("Features", "Amount")
                            .Append(_mlContext.BinaryClassification.Trainers.SdcaLogisticRegression(labelColumnName: "IsFraud"));
            _model = pipeline.Fit(trainData);
        }

        public (bool IsFraud, float Probability) Predict(float amount)
        {
            var predictionEngine = _mlContext.Model.CreatePredictionEngine<TransactionData, FraudPrediction>(_model);
            var input = new TransactionData { Amount = amount };
            var prediction = predictionEngine.Predict(input);
            return (prediction.Prediction, prediction.Probability);
        }
    }
}
