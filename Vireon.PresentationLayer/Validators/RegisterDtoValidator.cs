using FluentValidation;
using Vireon.DtoLayer.DTOs;

namespace Vireon.PresentationLayer.Validators
{
    public class RegisterDtoValidator : AbstractValidator<RegisterDto>
    {
        public RegisterDtoValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Ad zorunludur.")
                .MinimumLength(2).WithMessage("Ad en az 2 karakter olmalıdır.")
                .MaximumLength(50).WithMessage("Ad en fazla 50 karakter olabilir.");

            RuleFor(x => x.Surname)
                .NotEmpty().WithMessage("Soyad zorunludur.")
                .MinimumLength(2).WithMessage("Soyad en az 2 karakter olmalıdır.")
                .MaximumLength(50).WithMessage("Soyad en fazla 50 karakter olabilir.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("E-posta adresi zorunludur.")
                .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.")
                .MaximumLength(100).WithMessage("E-posta adresi en fazla 100 karakter olabilir.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Şifre zorunludur.")
                .MinimumLength(6).WithMessage("Şifre en az 6 karakter olmalıdır.")
                .MaximumLength(100).WithMessage("Şifre en fazla 100 karakter olabilir.")
                .Matches(@"[A-Za-z]").WithMessage("Şifre en az bir harf içermelidir.")
                .Matches(@"[0-9]").WithMessage("Şifre en az bir rakam içermelidir.");
        }
    }
}
