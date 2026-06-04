using FluentValidation;
using Vireon.DtoLayer.DTOs;

namespace Vireon.PresentationLayer.Validators
{
    public class DepositDtoValidator : AbstractValidator<DepositDto>
    {
        public DepositDtoValidator()
        {
            RuleFor(x => x.AccountNumber)
                .NotEmpty().WithMessage("Hesap numarası zorunludur.")
                .Matches(@"^VR-\d{5}$").WithMessage("Geçerli bir hesap numarası giriniz (VR-XXXXX formatında).");

            RuleFor(x => x.Amount)
                .GreaterThan(0).WithMessage("Yatırılacak tutar 0'dan büyük olmalıdır.")
                .LessThanOrEqualTo(1000000).WithMessage("Tek seferde en fazla 1.000.000 TRY yatırabilirsiniz.");

            RuleFor(x => x.Description)
                .MaximumLength(200).WithMessage("Açıklama en fazla 200 karakter olabilir.");
        }
    }
}
