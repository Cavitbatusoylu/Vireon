using Microsoft.AspNetCore.Mvc;
using Vireon.PresentationLayer.Models.ViewModels;

namespace Vireon.PresentationLayer.Controllers;

public class AccountController : Controller
{
    [HttpGet]
    public IActionResult Login(string? returnUrl = null)
    {
        return View(new LoginViewModel
        {
            Title = "Sign In to Vireon",
            ReturnUrl = returnUrl
        });
    }

    [HttpGet]
    public IActionResult Register() => View(new LoginViewModel { Title = "Sign Up to Vireon" });

    [HttpGet]
    public IActionResult ForgotPassword() => View(new LoginViewModel { Title = "Forgot Password" });
}
