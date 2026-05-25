using Vireon.DtoLayer.DTOs;
using Vireon.PresentationLayer.Validators;

namespace Vireon.Tests
{
    public class TransferRequestDtoValidatorTests
    {
        private readonly TransferRequestDtoValidator _validator;

        public TransferRequestDtoValidatorTests()
        {
            _validator = new TransferRequestDtoValidator();
        }

        [Fact]
        public void ValidDto_ShouldPassValidation()
        {
            var dto = new TransferRequestDto
            {
                SenderAccountId = 1,
                ReceiverAccountId = 2,
                Amount = 100m,
                Description = "Test"
            };

            var result = _validator.Validate(dto);
            Assert.True(result.IsValid);
        }

        [Fact]
        public void EmptySenderId_ShouldFailValidation()
        {
            var dto = new TransferRequestDto
            {
                SenderAccountId = 0,
                ReceiverAccountId = 2,
                Amount = 100m
            };

            var result = _validator.Validate(dto);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "SenderAccountId");
        }

        [Fact]
        public void AmountZero_ShouldFailValidation()
        {
            var dto = new TransferRequestDto
            {
                SenderAccountId = 1,
                ReceiverAccountId = 2,
                Amount = 0m
            };

            var result = _validator.Validate(dto);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "Amount");
        }

        [Fact]
        public void DescriptionTooLong_ShouldFailValidation()
        {
            var dto = new TransferRequestDto
            {
                SenderAccountId = 1,
                ReceiverAccountId = 2,
                Amount = 100m,
                Description = new string('x', 150)
            };

            var result = _validator.Validate(dto);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == "Description");
        }
    }
}
