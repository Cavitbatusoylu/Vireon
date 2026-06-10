using Microsoft.AspNetCore.Mvc;
using Vireon.BusinessLayer.Abstract;
using Vireon.BusinessLayer.Models;
using Vireon.DtoLayer.DTOs;

namespace Vireon.PresentationLayer.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public IActionResult GetUsers() => Ok(_userService.GetAllUsers());

    [HttpGet("{id}")]
    public IActionResult GetUser(int id)
    {
        var user = _userService.GetUserById(id);
        return user == null ? NotFound(new { message = "Kullanıcı bulunamadı." }) : Ok(user);
    }

    [HttpPost]
    public IActionResult AddUser([FromBody] RegisterDto model) => FromResult(_userService.Register(model));

    [HttpPost("register")]
    public IActionResult Register([FromBody] RegisterDto model) => FromResult(_userService.Register(model));

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginDto model) => FromResult(_userService.Login(model));

    [HttpPost("forgot-password")]
    public IActionResult ForgotPassword([FromBody] ForgotPasswordModel model) => FromResult(_userService.ForgotPassword(model));

    [HttpPost("{id}/delete-account")]
    public IActionResult DeleteAccount(int id, [FromBody] DeleteAccountModel model) => FromResult(_userService.DeleteAccount(id, model));

    [HttpPut("{id}")]
    public IActionResult UpdateUser(int id, [FromBody] UserUpdateModel model) => FromResult(_userService.UpdateUser(id, model));

    [HttpGet("search")]
    public IActionResult SearchByAccountNumber([FromQuery] string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
            return BadRequest(new { message = "Hesap numarası gerekli." });

        var result = _userService.SearchByAccountNumber(accountNumber);
        return result == null ? NotFound(new { message = "Kullanıcı bulunamadı." }) : Ok(result);
    }

    [HttpGet("admin-stats")]
    public IActionResult GetAdminStats() => Ok(_userService.GetAdminStats());

    [HttpGet("admin-users")]
    public IActionResult GetAdminUsers() => Ok(_userService.GetAdminUsers());

    [HttpGet("admin-transactions")]
    public IActionResult GetAdminTransactions() => Ok(_userService.GetAdminTransactions());

    private IActionResult FromResult(ServiceResult<object> result)
    {
        if (result.Success) return Ok(result.Data);
        return StatusCode(result.StatusCode, new { message = result.Error });
    }
}
