using Vireon.BusinessLayer.Concrete;

namespace Vireon.Tests
{
    public class FraudModelServiceTests
    {
        private readonly FraudModelService _fraudService;

        public FraudModelServiceTests()
        {
            _fraudService = new FraudModelService();
        }

        [Fact]
        public void Predict_LowAmount_ShouldReturnNotFraud()
        {
            var (isFraud, probability) = _fraudService.Predict(100f);
            Assert.False(isFraud);
        }

        [Fact]
        public void Predict_MediumAmount_ShouldReturnNotFraud()
        {
            var (isFraud, probability) = _fraudService.Predict(500f);
            Assert.False(isFraud);
        }

        [Fact]
        public void Predict_HighAmountAtNight_ShouldReturnFraud()
        {
            var (isFraud, probability) = _fraudService.Predict(25000f, 3f, 8f);
            Assert.True(isFraud);
        }
    }
}
