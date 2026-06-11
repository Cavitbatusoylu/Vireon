using FluentValidation;
using Vireon.DtoLayer.DTOs;

namespace Vireon.PresentationLayer.Validators
{
    public class DepositDtoValidator : AbstractValidator<DepositDto>
    {
        public DepositDtoValidator()
        {
            RuleFor(x => x.AccountNumber)
                .NotEmpty().WithMessage("Hesap numarasÄ± zorunludur.")
                .Matches(@"^VR-\d{5}$").WithMessage("GeÃ§erli bir hesap numarasÄ± giriniz (VR-XXXXX formatÄ±nda).");

            RuleFor(x => x.Amount)
                .GreaterThan(0).WithMessage("YatÄ±rÄ±lacak tutar 0'dan bÃ¼yÃ¼k olmalÄ±dÄ±r.")
                .LessThanOrEqualTo(1000000).WithMessage("Tek seferde en fazla 1.000.000 TRY yatÄ±rabilirsiniz.");

            RuleFor(x => x.Description)
                .MaximumLength(200).WithMessage("AÃ§Ä±klama en fazla 200 karakter olabilir.");
        }
    }
}
