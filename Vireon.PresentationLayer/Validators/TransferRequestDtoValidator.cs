using FluentValidation;
using Vireon.DtoLayer.DTOs;

namespace Vireon.PresentationLayer.Validators
{
    // Kural sınıfımız AbstractValidator'dan miras almalı ve hangi DTO'yu koruyacağını bilmeli
    public class TransferRequestDtoValidator : AbstractValidator<TransferRequestDto>
    {
        public TransferRequestDtoValidator()
        {
            // Kural 1: Gönderici Hesap ID boş olamaz ve 0'dan büyük olmalıdır.
            RuleFor(x => x.SenderAccountId)
                .NotEmpty().WithMessage("Gönderici hesap numarası boş bırakılamaz.")
                .GreaterThan(0).WithMessage("Geçerli bir gönderici hesap numarası giriniz.");

            // Kural 2: Alıcı Hesap ID boş olamaz ve 0'dan büyük olmalıdır.
            RuleFor(x => x.ReceiverAccountId)
                .NotEmpty().WithMessage("Alıcı hesap numarası boş bırakılamaz.")
                .GreaterThan(0).WithMessage("Geçerli bir alıcı hesap numarası giriniz.");

            // Kural 3: Gönderilecek miktar kesinlikle 0'dan büyük olmalıdır! (Eksi bakiye gönderilemez)
            RuleFor(x => x.Amount)
                .GreaterThan(0).WithMessage("Gönderilecek havale tutarı 0'dan büyük olmalıdır.");

            // Kural 4: Açıklama en fazla 100 karakter olabilir (Veritabanını şişirmesin diye)
            RuleFor(x => x.Description)
                .MaximumLength(100).WithMessage("Açıklama 100 karakteri geçemez.");
        }
    }
}