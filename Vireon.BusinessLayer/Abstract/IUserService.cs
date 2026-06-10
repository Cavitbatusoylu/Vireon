using Vireon.BusinessLayer.Models;
using Vireon.DtoLayer.DTOs;

namespace Vireon.BusinessLayer.Abstract;

public interface IUserService
{
    object GetAllUsers();
    object? GetUserById(int id);
    ServiceResult<object> Register(RegisterDto model);
    ServiceResult<object> Login(LoginDto model);
    ServiceResult<object> ForgotPassword(ForgotPasswordModel model);
    ServiceResult<object> DeleteAccount(int id, DeleteAccountModel model);
    ServiceResult<object> UpdateUser(int id, UserUpdateModel model);
    object? SearchByAccountNumber(string accountNumber);
    object GetAdminStats();
    object GetAdminUsers();
    object GetAdminTransactions();
}
