/* ============================================================
 * Vireon Digital Bank - Frontend Application
 * Version: 2.0 | Clean, deduplicated, production-ready
 * ============================================================ */

// ========== TOAST NOTIFICATION SYSTEM ==========
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    }[type] || 'ℹ';
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" data-action="close-toast">×</button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
    return container;
}

// ABSOLUTE SAFETY: This runs globally at the very start
(function() {
    const clearLoader = () => {
        const ls = document.getElementById('loadingScreen');
        if (ls) {
            ls.classList.remove('show');
            ls.classList.add('hidden');
            ls.style.opacity = '0';
            ls.style.pointerEvents = 'none';
            ls.style.visibility = 'hidden';
            setTimeout(() => ls.style.display = 'none', 800);
        }
    };
    setTimeout(clearLoader, 1500);
    setTimeout(clearLoader, 3500);
})();

// Loading Screen & PWA Registration
window.addEventListener('load', () => {
   if ('serviceWorker' in navigator) {
      // Service worker'ı güncellemeye zorla
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
         .then(reg => {
            console.log('SW Registered', reg);
            // Güncelleme varsa hemen uygula
            reg.addEventListener('updatefound', () => {
               const newWorker = reg.installing;
               if (newWorker) {
                  newWorker.addEventListener('statechange', () => {
                     if (newWorker.state === 'activated') {
                        console.log('New SW activated — cache refreshed');
                     }
                  });
               }
            });
         })
         .catch(err => console.log('SW Reg Error', err));
   }
});

// Global state tracking
let isTransitioning = false;
let currentUser = null;
let deferredPrompt; 
let lastDashboardContext = { account: null, transactions: [] };

// ========== RATE LIMITING ==========
const loginAttempts = { count: 0, firstAttempt: 0, lockedUntil: 0 };
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_LOCKOUT = 60000; // 1 minute lockout

function checkRateLimit() {
    const now = Date.now();
    if (now < loginAttempts.lockedUntil) {
        const remaining = Math.ceil((loginAttempts.lockedUntil - now) / 1000);
        return { allowed: false, remaining };
    }
    if (now - loginAttempts.firstAttempt > RATE_LIMIT_WINDOW) {
        loginAttempts.count = 0;
        loginAttempts.firstAttempt = now;
    }
    if (loginAttempts.count >= RATE_LIMIT_MAX) {
        loginAttempts.lockedUntil = now + RATE_LIMIT_LOCKOUT;
        loginAttempts.count = 0;
        return { allowed: false, remaining: Math.ceil(RATE_LIMIT_LOCKOUT / 1000) };
    }
    return { allowed: true };
}

function recordLoginAttempt() {
    if (loginAttempts.count === 0) loginAttempts.firstAttempt = Date.now();
    loginAttempts.count++;
}

// ========== SESSION TIMEOUT ==========
let sessionTimer = null;
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

function resetSessionTimer() {
    if (sessionTimer) clearTimeout(sessionTimer);
    if (!currentUser) return;
    sessionTimer = setTimeout(() => {
        const lang = window.currentLang || 'en';
        showToast(lang === 'tr' ? 'Oturum zaman aşımına uğradı.' : 'Session timed out due to inactivity.', 'warning');
        handleLogout();
    }, SESSION_TIMEOUT);
}

// Track user activity for session timeout
['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => {
        if (currentUser) resetSessionTimer();
    }, { passive: true });
});

// ========== INLINE VALIDATION ==========
function showFieldError(inputEl, message) {
    clearFieldError(inputEl);
    inputEl.classList.add('input-error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-msg';
    errorDiv.textContent = message;
    inputEl.parentElement.appendChild(errorDiv);
}

function clearFieldError(inputEl) {
    inputEl.classList.remove('input-error');
    const existing = inputEl.parentElement.querySelector('.field-error-msg');
    if (existing) existing.remove();
}

function clearAllFieldErrors(form) {
    if (!form) return;
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    form.querySelectorAll('.field-error-msg').forEach(el => el.remove());
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { level: 'weak', label: 'Weak', percent: 20 };
    if (score <= 2) return { level: 'fair', label: 'Fair', percent: 40 };
    if (score <= 3) return { level: 'good', label: 'Good', percent: 65 };
    if (score <= 4) return { level: 'strong', label: 'Strong', percent: 85 };
    return { level: 'excellent', label: 'Excellent', percent: 100 };
}

// Safely get elements
const getEl = (id) => document.getElementById(id);
const getEls = (selector) => document.querySelectorAll(selector);

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
   try {
       // Restore user from localStorage or sessionStorage
       const savedUser = localStorage.getItem('vireonUser') || sessionStorage.getItem('vireonUser');
       if (savedUser) {
           try {
               currentUser = JSON.parse(savedUser);
               console.log('User restored:', currentUser.name);
               updateNavbarForLoggedInUser();
               resetSessionTimer();
               
               // Restore to dashboard immediately if session exists
               showSection('dashboard');
               fetchDashboardData();
           } catch (e) {
               localStorage.removeItem('vireonUser');
               sessionStorage.removeItem('vireonUser');
           }
       }

       initNavigation();
       initSidebarNavigation();
       initInteractions();
       initFormValidation();
       console.log("NEON AI: Systems Initialized Successfully");
   } catch (e) {
       console.error("NEON AI: Init Error", e);
   }
});

// ========== CENTRALIZED EVENT DELEGATION ==========
document.addEventListener('click', function(e) {
   const el = e.target.closest('[data-action]');
   if (!el) return;

   const tagName = el.tagName.toLowerCase();
   const isForm = tagName === 'form';
   if (isForm) return;

   const action = el.getAttribute('data-action');
   const actionFn = actionHandlers[action];
   if (actionFn) actionFn(el, e);
});

document.addEventListener('submit', function(e) {
   const form = e.target.closest('[data-action]');
   if (!form) return;
   const action = form.getAttribute('data-action');
   const actionFn = actionHandlers[action];
   if (actionFn) { e.preventDefault(); actionFn(form, e); }
});

document.addEventListener('keydown', function(e) {
   if (e.key !== 'Enter') return;
   
   // If in a form, let the browser handle it via 'submit' unless it's a specific data-enter-action
   const el = e.target.closest('[data-enter-action]');
   if (el) {
       const action = el.getAttribute('data-enter-action');
       const actionFn = actionHandlers[action];
       if (actionFn) actionFn(el, e);
       return;
   }

   // Special case: If Enter is pressed in login/register form, we let the 'submit' event handle it.
   // We don't want to trigger login manually here if it's already handled by form submit.
});

const actionHandlers = {};

function registerAction(name, fn) {
   actionHandlers[name] = fn;
}

// Click/action handlers registration
(function registerAllActions() {
   // Toast
   registerAction('close-toast', (el) => el.parentElement.remove());

   // Language & Theme
   registerAction('switch-lang', (el) => switchLang(el.getAttribute('data-lang')));
   registerAction('toggle-theme', () => toggleTheme());

   // Navigation
   registerAction('back-to-menu', () => backToMenu());
   registerAction('logout', () => handleLogout());
   registerAction('show-section', (el) => showSection(el.getAttribute('data-section')));
   registerAction('scroll-to-section', (el) => scrollToSection(el.getAttribute('data-section')));

   // Modals
   registerAction('close-login-modal', () => closeLoginModal());
   registerAction('open-register-modal', () => openRegisterModal());
   registerAction('close-register-modal', () => closeRegisterModal());
   registerAction('open-login-from-register', () => openLoginModalFromRegister());
   registerAction('open-forgot-password-modal', () => openForgotPasswordModal());
   registerAction('close-forgot-password-modal', () => closeForgotPasswordModal());
   registerAction('open-login-from-forgot', () => openLoginModalFromForgot());

   // Forms
  registerAction('submit-login', (form, e) => handleLogin(e, form));
  registerAction('submit-register', (form, e) => handleRegister(e, form));
  registerAction('submit-forgot-password', (form, e) => handleForgotPassword(e));

   // Dashboard
   registerAction('switch-dash-section', (el) => switchDashSection(el.getAttribute('data-dash') || el.dataset.dash));
    registerAction('switch-transfer-tab', (el) => {
        const targetId = el.getAttribute('data-target');
        const container = el.closest('.transfer-combined-card');
        if (!container) return;
        
        container.querySelectorAll('.transfer-tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        
        container.querySelectorAll('.transfer-tab-content').forEach(c => {
            c.classList.remove('active');
            c.style.display = 'none';
        });
        
        const target = getEl(targetId);
        if (target) {
            target.classList.add('active');
            target.style.display = 'block';
        }
    });
    registerAction('deposit-request', () => handleDepositRequest());
    registerAction('send-transfer', () => handleSendTransfer());
    registerAction('save-profile', () => handleProfileSave());
    registerAction('change-password', () => handlePasswordChange());
    registerAction('toggle-limit-edit', () => toggleLimitEdit());
    registerAction('update-limit', () => handleUpdateLimit());
    registerAction('refresh-qr-code', () => refreshQrCode());
    registerAction('refresh-database-stats', () => fetchDatabaseStats());
    registerAction('admin-filter-transactions', () => loadAdminTransactions());
    registerAction('admin-filter-users', () => loadAdminAccounts());
    registerAction('save-ai-settings', () => showToast('AI Settings saved successfully (Demo)', 'success'));

   // Tabs
   registerAction('switch-tab', (el) => switchTab(el, el.getAttribute('data-tab')));

   // AI Chat
   registerAction('toggle-ai-chat', () => toggleAIChat());
   registerAction('send-ai-message', () => sendAiMessage());
   registerAction('send-floating-ai-message', () => sendAIMessage());

   // Password Toggle
   registerAction('toggle-password-visibility', (el) => {
       const inputId = el.getAttribute('data-target');
       const input = document.getElementById(inputId);
       if (input) {
           const isPassword = input.type === 'password';
           input.type = isPassword ? 'text' : 'password';
           // Use modern icons
           el.innerHTML = isPassword ? '👁️' : '🔒';
           el.classList.toggle('visible', isPassword);
       }
   });
})();

function initNavigation() {
   // Main menu items - event delegation for better performance
   const menuGrid = document.getElementById('menuGrid');
   if (menuGrid) {
      menuGrid.addEventListener('click', (e) => {
         const button = e.target.closest('.menu-item');
         if (button) {
            const section = button.getAttribute('data-section');
            if (section) {
               scrollToSection(section);
            }
         }
      });
   }
   
   console.log('Vireon Event System: Active');
}

function smoothScrollTo(id) {
    const element = document.getElementById(id);
    if (element) {
        const navbarHeight = 80;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - navbarHeight;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
}

function scrollToSection(id) {
    console.log('scrollToSection called with:', id);
    
    document.querySelectorAll('.content-section, .landing-content-section').forEach(sec => {
        sec.classList.remove('active');
        sec.style.display = 'none';
        sec.style.visibility = 'hidden';
    });

    const menuGrid = getEl('menuGrid');
    const mainHeader = getEl('mainHeader');
    const mainFooter = getEl('mainFooter');

    if (menuGrid) { menuGrid.style.display = 'none'; menuGrid.style.visibility = 'hidden'; }
    if (mainHeader) { mainHeader.style.display = 'none'; mainHeader.style.visibility = 'hidden'; }
    if (mainFooter) { mainFooter.style.display = 'none'; mainFooter.style.visibility = 'hidden'; }

    const el = document.getElementById(id);
    if (el) {
        el.classList.add('active');
        el.style.display = 'block';
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (id === 'section-introduction') setTimeout(animateStats, 500);
    } else {
        backToMenu();
    }
}

function initInteractions() {
   const loginBtn = getEl('loginBtn');
   if (loginBtn) {
      loginBtn.addEventListener('click', (e) => {
         e.preventDefault();
         if (currentUser) {
            showSection('dashboard');
         } else {
            openLoginModal(e);
         }
      });
   }

   const installBtn = getEl('installBtn');
   window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) installBtn.hidden = false;
   });

   if (installBtn) {
      installBtn.addEventListener('click', async () => {
         if (!deferredPrompt) return;
         deferredPrompt.prompt();
         const { outcome } = await deferredPrompt.userChoice;
         if (outcome === 'accepted') { installBtn.hidden = true; }
         deferredPrompt = null;
      });
   }

   document.querySelectorAll('.intro-cta-primary').forEach(btn => {
      btn.addEventListener('click', () => scrollToSection('section-components'));
   });
   document.querySelectorAll('.intro-cta-secondary').forEach(btn => {
      btn.addEventListener('click', () => scrollToSection('section-architecture'));
   });

   const contactForm = document.querySelector('.contact-form');
   if (contactForm) {
      const submitBtn = contactForm.querySelector('.submit-btn');
      if (submitBtn) {
         submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const msg = (typeof window.currentLang !== 'undefined' && window.currentLang === 'tr')
               ? 'Mesajınız alındı (demo). Teşekkürler!'
               : 'Message received (demo). Thank you!';
            showToast(msg, 'success');
         });
      }
   }

   document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
         closeLoginModal();
         closeRegisterModal();
         closeForgotPasswordModal();
         const win = getEl('aiChatWindow');
         if (win && win.classList.contains('active')) toggleAIChat();
      }
   });

   // Modal backdrop click-to-close
   ['loginModal', 'registerModal', 'forgotPasswordModal'].forEach(id => {
      const m = getEl(id);
      if (m) {
         m.addEventListener('click', (ev) => {
            if (ev.target === m) {
               m.classList.remove('active');
               document.body.style.overflow = '';
            }
         });
      }
   });
}

function showSection(sectionId) {
   console.log('showSection called with:', sectionId);
   
   document.querySelectorAll('.content-section, .landing-content-section').forEach(sec => {
      sec.classList.remove('active');
      sec.style.display = 'none';
      sec.style.visibility = 'hidden';
   });

   const menuGrid = getEl('menuGrid');
   const mainHeader = getEl('mainHeader');
   const mainFooter = getEl('mainFooter');
   const contentArea = getEl('contentArea');

   if (menuGrid) { menuGrid.style.display = 'none'; menuGrid.style.visibility = 'hidden'; }
   if (mainHeader) { mainHeader.style.display = 'none'; mainHeader.style.visibility = 'hidden'; }
   if (mainFooter) { mainFooter.style.display = 'none'; mainFooter.style.visibility = 'hidden'; }
   if (contentArea) contentArea.style.display = 'block';

   const section = getEl(sectionId);
   if (section) {
      section.classList.add('active');
      section.style.display = 'block';
      section.style.opacity = '1';
      section.style.visibility = 'visible';
   }

   if (sectionId === 'dashboard') {
      document.body.classList.add('dashboard-active');
      
      document.querySelectorAll('.landing-content-section').forEach(sec => {
         sec.style.display = 'none';
         sec.style.visibility = 'hidden';
      });
      
      const wrapper = document.querySelector('#dashboard .dashboard-wrapper');
      if (wrapper) wrapper.style.display = 'flex';
      
      const backBtn = getEl('backToHomeBtn');
      if (backBtn) backBtn.style.display = 'inline-flex';
      
      if (!currentUser) {
         document.body.classList.remove('dashboard-active');
         backToMenu();
      } else {
         const isAdmin = currentUser.role === 'Admin';
         if (isAdmin) {
             switchDashSection('dash-admin-overview');
         } else {
             switchDashSection('dash-overview');
         }
         fetchDashboardData();
         window.scrollTo(0, 0);
      }
   } else {
      document.body.classList.remove('dashboard-active');
      const backBtn = getEl('backToHomeBtn');
      if (backBtn) backBtn.style.display = 'none';
   }

   if (sectionId === 'section-introduction') setTimeout(animateStats, 500);
}

function backToMenu() {
   document.querySelectorAll('.content-section').forEach(sec => {
      sec.classList.remove('active');
      sec.style.display = 'none';
      sec.style.visibility = 'hidden';
   });
   
   document.querySelectorAll('.landing-content-section').forEach(sec => {
      sec.classList.add('active');
      sec.style.display = 'block';
      sec.style.visibility = 'visible';
      sec.style.opacity = '1';
   });

   const menuGrid = getEl('menuGrid');
   const mainHeader = getEl('mainHeader');
   const mainFooter = getEl('mainFooter');

   if (menuGrid) { menuGrid.style.display = 'grid'; menuGrid.style.visibility = 'visible'; }
   if (mainHeader) { mainHeader.style.display = 'block'; mainHeader.style.visibility = 'visible'; }
   if (mainFooter) { mainFooter.style.display = 'block'; mainFooter.style.visibility = 'visible'; }

   // Ensure overall layout wrapper is visible
   const contentArea = getEl('contentArea');
   if (contentArea) contentArea.style.display = 'block';

   document.body.classList.remove('dashboard-active');
   
   const backBtn = getEl('backToHomeBtn');
   if (backBtn) backBtn.style.display = 'none';
   
   window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToDashboardTop() {
   window.scrollTo(0, 0);
   const dash = getEl('dashboard');
   if (dash) dash.scrollIntoView({ block: 'start', behavior: 'auto' });
}

// Animate Stats
function animateStats() {
   getEls('.metric-value[data-target]').forEach((el, index) => {
      setTimeout(() => {
         const target = parseInt(el.dataset.target);
         let current = 0;
         const increment = target / 40;
         const timer = setInterval(() => {
            current += increment;
            if (current >= target) { current = target; clearInterval(timer); }
            el.textContent = Math.floor(current);
         }, 30);
      }, index * 200);
   });
}

// Tab Switching & Gallery
function switchTab(btn, tabId) {
   const container = btn.closest('.tabs-container');
   if (!container) return;
   container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
   btn.classList.add('active');
   container.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
   const target = document.getElementById(tabId);
   if (target) target.classList.add('active');
}

function filterGallery(category, btn) {
   getEls('.filter-btn').forEach(b => b.classList.remove('active'));
   btn.classList.add('active');
   getEls('.gallery-item').forEach(item => {
      if (category === 'all' || item.dataset.category === category) {
         item.style.display = 'block';
         item.style.animation = 'tabFade 0.4s ease-out';
      } else {
         item.style.display = 'none';
      }
   });
}

// ========== MODAL SYSTEM ==========
function openLoginModal(e) {
    if (e) e.preventDefault();
    closeRegisterModal();
    closeForgotPasswordModal();
    const modal = getEl('loginModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeLoginModal() {
    const modal = getEl('loginModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openRegisterModal(e) {
    if (e) e.preventDefault();
    closeLoginModal();
    const modal = getEl('registerModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeRegisterModal() {
    const modal = getEl('registerModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openLoginModalFromRegister(e) {
    if (e) e.preventDefault();
    closeRegisterModal();
    openLoginModal();
}

function openForgotPasswordModal(e) {
    if (e) e.preventDefault();
    closeLoginModal();
    const modal = getEl('forgotPasswordModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeForgotPasswordModal() {
    const modal = getEl('forgotPasswordModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openLoginModalFromForgot(e) {
    if (e) e.preventDefault();
    closeForgotPasswordModal();
    openLoginModal();
}

function handleForgotPassword(e) {
    e.preventDefault();
    const lang = window.currentLang || 'en';
    showToast(lang === 'tr'
       ? 'Şifre sıfırlama bu sürümde mevcut değildir.'
       : 'Password reset is not available in this version.', 'info');
    closeForgotPasswordModal();
}

// ========== FORM VALIDATION INIT ==========
function initFormValidation() {
    // Real-time validation on blur
    const loginEmail = getEl('loginEmail');
    const loginPassword = getEl('loginPassword');
    const regName = getEl('registerName');
    const regEmail = getEl('registerEmail');
    const regPassword = getEl('registerPassword');
    const regConfirm = getEl('registerConfirmPassword');

    if (loginEmail) {
        loginEmail.addEventListener('blur', () => {
            const val = loginEmail.value.trim();
            if (val && !validateEmail(val)) {
                showFieldError(loginEmail, window.currentLang === 'tr' ? 'Geçersiz e-posta' : 'Invalid email');
            } else { clearFieldError(loginEmail); }
        });
        loginEmail.addEventListener('input', () => clearFieldError(loginEmail));
    }
    if (loginPassword) {
        loginPassword.addEventListener('input', () => clearFieldError(loginPassword));
    }
    if (regEmail) {
        regEmail.addEventListener('blur', () => {
            const val = regEmail.value.trim();
            if (val && !validateEmail(val)) {
                showFieldError(regEmail, window.currentLang === 'tr' ? 'Geçersiz e-posta' : 'Invalid email');
            } else { clearFieldError(regEmail); }
        });
        regEmail.addEventListener('input', () => clearFieldError(regEmail));
    }
    if (regPassword) {
        regPassword.addEventListener('input', () => {
            clearFieldError(regPassword);
            updatePasswordStrengthMeter(regPassword);
        });
    }
    if (regConfirm) {
        regConfirm.addEventListener('blur', () => {
            if (regPassword && regConfirm.value && regConfirm.value !== regPassword.value) {
                showFieldError(regConfirm, window.currentLang === 'tr' ? 'Şifreler eşleşmiyor' : 'Passwords do not match');
            } else { clearFieldError(regConfirm); }
        });
        regConfirm.addEventListener('input', () => clearFieldError(regConfirm));
    }
    [regName, regEmail, regPassword, regConfirm].forEach(el => {
        if (el) el.addEventListener('input', () => clearFieldError(el));
    });
}

function updatePasswordStrengthMeter(inputEl) {
    const parent = inputEl.closest('.form-group');
    if (!parent) return;
    let meter = parent.querySelector('.password-strength-meter');
    const val = inputEl.value;
    if (!val) { if (meter) meter.remove(); return; }
    if (!meter) {
        meter = document.createElement('div');
        meter.className = 'password-strength-meter';
        meter.innerHTML = '<div class="strength-bar"><div class="strength-fill"></div></div><span class="strength-label"></span>';
        parent.appendChild(meter);
    }
    const strength = getPasswordStrength(val);
    const fill = meter.querySelector('.strength-fill');
    const label = meter.querySelector('.strength-label');
    if (fill) { fill.style.width = strength.percent + '%'; fill.className = 'strength-fill strength-' + strength.level; }
    if (label) { label.textContent = strength.label; label.className = 'strength-label strength-' + strength.level; }
}

// ========== AUTHENTICATION ==========
async function handleLogin(event, form) {
    if (event) event.preventDefault();
    clearAllFieldErrors(form);
    
    const emailEl = getEl('loginEmail');
    const passwordEl = getEl('loginPassword');
    const rememberMeEl = getEl('rememberMe');
    
    const email = emailEl?.value?.trim();
    const password = passwordEl?.value;
    const lang = window.currentLang || 'en';
    
    // 1. Rate Limiting Check
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
        showToast(lang === 'tr' 
            ? `Çok fazla deneme. ${rateCheck.remaining} saniye bekleyin.` 
            : `Too many attempts. Please wait ${rateCheck.remaining} seconds.`, 'error');
        return;
    }
    
    // 2. Inline Validation
    let hasError = false;
    if (!email) {
        showFieldError(emailEl, lang === 'tr' ? 'E-posta gerekli' : 'Email is required');
        hasError = true;
    } else if (!validateEmail(email)) {
        showFieldError(emailEl, lang === 'tr' ? 'Geçerli bir e-posta girin' : 'Enter a valid email');
        hasError = true;
    }
    if (!password) {
        showFieldError(passwordEl, lang === 'tr' ? 'Şifre gerekli' : 'Password is required');
        hasError = true;
    } else if (password.length < 6) {
        showFieldError(passwordEl, lang === 'tr' ? 'En az 6 karakter' : 'At least 6 characters');
        hasError = true;
    }
    if (hasError) return;
    
    // 3. Loading State
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="loader-tiny"></span> ${lang === 'tr' ? 'Giriş Yapılıyor...' : 'Signing In...'}`;
    btn.disabled = true;
    btn.classList.add('loading');
    
    try {
        recordLoginAttempt();
        await new Promise(resolve => setTimeout(resolve, 600));

        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            loginAttempts.count = 0; // Reset on success
            
            // Remember Me logic
            if (rememberMeEl && rememberMeEl.checked) {
                localStorage.setItem('vireonUser', JSON.stringify(user));
                localStorage.setItem('rememberVireon', 'true');
            } else {
                sessionStorage.setItem('vireonUser', JSON.stringify(user));
                localStorage.removeItem('vireonUser');
                localStorage.removeItem('rememberVireon');
            }
            
            showToast(lang === 'tr' ? `Hoş geldin, ${user.name}!` : `Welcome back, ${user.name}!`, 'success');
            
            const modal = getEl('loginModal');
            if (modal) modal.classList.remove('active');
            
            updateNavbarForLoggedInUser();
            resetSessionTimer();
            
            setTimeout(() => {
                showSection('dashboard');
                fetchDashboardData();
                document.body.style.overflow = '';
            }, 400);
        } else {
            const error = await response.json().catch(() => ({}));
            const msg = error.message || (lang === 'tr' ? 'E-posta veya şifre hatalı.' : 'Invalid email or password.');
            showToast(msg, 'error');
            showFieldError(passwordEl, msg);
            if (passwordEl) { passwordEl.value = ''; passwordEl.focus(); }
        }
    } catch (err) {
        console.error('Login error:', err);
        showToast(lang === 'tr' ? 'Sunucuya bağlanılamadı.' : 'Could not connect to server.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

async function handleRegister(event, form) {
    if (event) event.preventDefault();
    const lang = window.currentLang || 'en';
    
    const fullNameEl = getEl('registerName');
    const emailEl = getEl('registerEmail');
    const passwordEl = getEl('registerPassword');
    const confirmPasswordEl = getEl('registerConfirmPassword');

    const fullName = fullNameEl?.value?.trim();
    const email = emailEl?.value?.trim();
    const password = passwordEl?.value;
    const confirmPassword = confirmPasswordEl?.value;
    
    // 1. Validation
    if (!fullName || !email || !password || !confirmPassword) {
        showToast(lang === 'tr' ? 'Lütfen tüm alanları doldurun.' : 'Please fill all fields.', 'warning');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast(lang === 'tr' ? 'Geçerli bir e-posta adresi girin.' : 'Please enter a valid email address.', 'warning');
        if (emailEl) emailEl.focus();
        return;
    }
    
    if (password.length < 6) {
        showToast(lang === 'tr' ? 'Şifre en az 6 karakter olmalı.' : 'Password must be at least 6 characters.', 'warning');
        if (passwordEl) passwordEl.focus();
        return;
    }

    if (password !== confirmPassword) {
        showToast(lang === 'tr' ? 'Şifreler eşleşmiyor.' : 'Passwords do not match.', 'error');
        if (confirmPasswordEl) {
            confirmPasswordEl.value = '';
            confirmPasswordEl.focus();
        }
        return;
    }
    
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const name = nameParts[0] || 'User';
    const surname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ' ';
    
    // 2. Loading State
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="loader-tiny"></span> ${lang === 'tr' ? 'Kaydediliyor...' : 'Creating Account...'}`;
    btn.disabled = true;
    
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, surname, email, password })
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(
                lang === 'tr'
                    ? `Kayıt başarılı! Hesap No: ${result.accountNumber}`
                    : `Account created successfully! Your Account No: ${result.accountNumber}`,
                'success'
            );
            
            // Transition to Login
            const regModal = getEl('registerModal');
            if (regModal) regModal.classList.remove('active');
            
            setTimeout(() => {
                const loginEmail = getEl('loginEmail');
                const loginPassword = getEl('loginPassword');
                if (loginEmail) loginEmail.value = email;
                if (loginPassword) loginPassword.value = password;
                
                openLoginModal();
                showToast(lang === 'tr' ? 'Şimdi giriş yapabilirsiniz.' : 'You can now sign in.', 'info');
            }, 1000);
        } else {
            const error = await response.json().catch(() => ({}));
            showToast(error.message || (lang === 'tr' ? 'Kayıt başarısız. Bu e-posta zaten kullanımda olabilir.' : 'Registration failed. This email might already be in use.'), 'error');
        }
    } catch (err) {
        console.error('Register error:', err);
        showToast(lang === 'tr' ? 'Sunucuya bağlanılamadı.' : 'Connection error.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ========== NAVBAR MANAGEMENT ==========
function updateNavbarForLoggedInUser() {
    const loginBtn = getEl('loginBtn');
    const logoutBtn = getEl('logoutBtn');
    const dashboardBtn = getEl('homeDashboardBtn');
    const landingDashCard = getEl('landingDashboardCard');
    const landingAdminCard = getEl('landingAdminCard');
    
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (dashboardBtn) dashboardBtn.style.display = 'inline-flex';

    const isAdmin = currentUser && currentUser.role === 'Admin';
    const userMenu = getEl('userSidebarMenu');
    const adminMenu = getEl('adminSidebarMenu');

    if (isAdmin) {
        document.body.classList.add('admin-mode');
        if (userMenu) userMenu.style.display = 'none';
        if (adminMenu) adminMenu.style.display = 'block';
        if (landingDashCard) landingDashCard.style.display = 'none';
        if (landingAdminCard) landingAdminCard.style.display = 'flex';
    } else {
        document.body.classList.remove('admin-mode');
        if (userMenu) userMenu.style.display = 'block';
        if (adminMenu) adminMenu.style.display = 'none';
        if (landingDashCard) landingDashCard.style.display = 'flex';
        if (landingAdminCard) landingAdminCard.style.display = 'none';
    }
}

function updateNavbarForLoggedOutUser() {
    const loginBtn = getEl('loginBtn');
    const logoutBtn = getEl('logoutBtn');
    const dashboardBtn = getEl('homeDashboardBtn');
    const landingDashCard = getEl('landingDashboardCard');
    const landingAdminCard = getEl('landingAdminCard');
    
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (dashboardBtn) dashboardBtn.style.display = 'none';

    if (landingDashCard) landingDashCard.style.display = 'none';
    if (landingAdminCard) landingAdminCard.style.display = 'none';

    const userMenu = getEl('userSidebarMenu');
    const adminMenu = getEl('adminSidebarMenu');
    if (userMenu) userMenu.style.display = 'none';
    if (adminMenu) adminMenu.style.display = 'none';
}

function updateDashboardOverview(account, txs) {
    const lang = window.currentLang || 'en';
    const welcomeName = getEl('dashWelcomeName');
    const welcomeRole = getEl('dashWelcomeRole');
    const txCountEl = getEl('dashQuickTxCount');
    const incomingEl = getEl('dashQuickIn');
    const outgoingEl = getEl('dashQuickOut');

    const txList = Array.isArray(txs) ? txs : [];
    const accountId = account?.id;
    const incomingTotal = accountId
        ? txList.filter(t => t.receiverAccountId === accountId && t.senderAccountId !== accountId).reduce((sum, t) => sum + (t.amount || 0), 0)
        : 0;
    const outgoingTotal = accountId
        ? txList.filter(t => t.senderAccountId === accountId && t.receiverAccountId !== accountId).reduce((sum, t) => sum + (t.amount || 0), 0)
        : 0;

    if (welcomeName) {
        welcomeName.textContent = currentUser?.name || (lang === 'tr' ? 'Misafir' : 'Guest');
    }

    if (welcomeRole) {
        if (!currentUser) {
            welcomeRole.textContent = lang === 'tr'
                ? 'Hesap özeti ve günlük işlem görünürlüğü burada yer alır.'
                : 'Your account summary and daily activity stay visible here.';
        } else if (currentUser.role === 'Admin') {
            welcomeRole.textContent = lang === 'tr'
                ? 'Admin görünümü aktif. Operasyon ve sistem özetleri tek akışta görünür.'
                : 'Admin view is active. Operations and system summaries stay visible in one stream.';
        } else {
            welcomeRole.textContent = lang === 'tr'
                ? `Hesap ${account?.accountNumber || '-'} icin guncel finansal gorunum`
                : `Live financial snapshot for account ${account?.accountNumber || '-'}`;
        }
    }

    if (txCountEl) {
        txCountEl.textContent = txList.length.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US');
    }
    if (incomingEl) {
        incomingEl.textContent = `₺${incomingTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (outgoingEl) {
        outgoingEl.textContent = `₺${outgoingTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

window.refreshFrontendCopy = function () {
    updateDashboardOverview(lastDashboardContext.account, lastDashboardContext.transactions);
};

function handleLogout() {
    const lang = window.currentLang || 'en';
    currentUser = null;
    lastDashboardContext = { account: null, transactions: [] };
    localStorage.removeItem('vireonUser');
    sessionStorage.removeItem('vireonUser');
    if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
    document.body.classList.remove('admin-mode');
    showToast(lang === 'tr' ? 'Çıkış yapıldı.' : 'Logged out successfully.', 'info');
    updateNavbarForLoggedOutUser();
    updateDashboardOverview(null, []);
    backToMenu();
}

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// ========== DASHBOARD NAVIGATION ==========
function switchDashSection(targetId) {
   document.querySelectorAll('.sidebar-menu-btn').forEach(btn => {
      const dash = btn.getAttribute('data-dash');
      if (dash === targetId) {
         btn.classList.add('active');
      } else {
         btn.classList.remove('active');
      }
   });

   document.querySelectorAll('.dash-sub-section').forEach(sec => sec.classList.remove('active'));
   const target = getEl(targetId);
   if (target) target.classList.add('active');

   // User triggers
   if (targetId === 'dash-qr') refreshQrCode();
   if (targetId === 'dash-account-info') loadAccountInfo();
   
   // Admin triggers
   if (targetId === 'dash-admin') loadAdminPanel(); // Legacy/Settings
   if (targetId === 'dash-db-explorer') fetchDatabaseStats();
   if (targetId === 'dash-admin-overview') loadAdminOverview();
   if (targetId === 'dash-admin-transactions') loadAdminTransactions();
   if (targetId === 'dash-admin-accounts') loadAdminAccounts();
   if (targetId === 'dash-admin-ai') loadAdminAI();
}

// Initialize sidebar navigation
function initSidebarNavigation() {
   document.querySelectorAll('.sidebar-menu').forEach(sidebar => {
      sidebar.addEventListener('click', (e) => {
         const button = e.target.closest('.sidebar-menu-btn');
         if (button) {
            const targetSection = button.getAttribute('data-dash');
            if (targetSection) {
               switchDashSection(targetSection);
            }
         }
      });
   });
}

// ========== DASHBOARD DATA ==========
async function fetchDashboardData() {
    if (!currentUser) return;
    const lang = window.currentLang || 'en';
    try {
        const response = await fetch('/api/accounts');
        const accounts = await response.json();
        const userAccount = accounts.find(a => a.userId === currentUser.id);
        
        if (userAccount) {
            // Update balance display
            const balEl = getEl('dashBalance');
            const accEl = getEl('dashAccountNo');
            const curEl = getEl('dashCurrency');
            
            if (balEl) balEl.textContent = userAccount.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
            if (accEl) accEl.textContent = userAccount.accountNumber;
            if (curEl) curEl.textContent = userAccount.currency;

            // Fetch transactions
            const txResponse = await fetch('/api/transactions');
            const transactions = await txResponse.json();
            const userTxs = transactions.filter(t => t.senderAccountId === userAccount.id || t.receiverAccountId === userAccount.id);
            lastDashboardContext = { account: userAccount, transactions: userTxs };
            
            // Update overview transaction list
            const overviewList = getEl('overviewTransactions');
            if (overviewList) updateTransactionList(userTxs, userAccount.id, overviewList);
            
            // Update full history
            const historyList = getEl('fullTransactionHistory');
            if (historyList) updateTransactionList(userTxs, userAccount.id, historyList);
            
            initModernDashboardCharts(userTxs, userAccount.id, userAccount.balance);
            initOverviewChart(userTxs, userAccount.id);
            updateDashboardOverview(userAccount, userTxs);
            refreshQrCode();

            // Update daily limits
            try {
                const limitsRes = await fetch('/api/dailylimits');
                const limits = await limitsRes.json();
                const userLimit = limits.find(l => l.userId === currentUser.id);
                if (userLimit) {
                    const maxEl = getEl('maxLimit');
                    const usedEl = getEl('usedLimit');
                    if (maxEl) maxEl.textContent = userLimit.maxDailyLimit.toLocaleString('tr-TR');
                    if (usedEl) usedEl.textContent = userLimit.usedLimit.toLocaleString('tr-TR');
                }
            } catch (e) { console.error('Limits fetch error:', e); }
        } else {
            lastDashboardContext = { account: null, transactions: [] };
            updateDashboardOverview(null, []);
        }

        // Profile fields
        const pn = getEl('profileName');
        const ps = getEl('profileSurname');
        const pe = getEl('profileEmail');
        if (pn) pn.value = currentUser.name || '';
        if (ps) ps.value = currentUser.surname || '';
        if (pe) pe.value = currentUser.email || '';

    } catch (err) { 
        console.error('Dashboard Sync Error:', err);
        showToast(lang === 'tr' ? 'Dashboard yüklenemedi.' : 'Failed to load dashboard.', 'error');
    }
}

let balanceChart = null;
let expensePieChart = null;

function initModernDashboardCharts(txs, accountId, currentBalance) {
    const lineCtx = document.getElementById('balanceLineChart');
    const pieCtx = document.getElementById('expensePieChart');
    if (!lineCtx || !pieCtx) return;

    if (balanceChart) balanceChart.destroy();
    if (expensePieChart) expensePieChart.destroy();

    const labels = txs.slice(-6).map(t => new Date(t.date).toLocaleDateString('tr-TR', {day:'numeric', month:'short'}));
    const dataPoints = txs.slice(-6).map(t => t.amount);

    balanceChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['Starting'],
            datasets: [{
                label: 'Balance',
                data: labels.length ? dataPoints : [currentBalance],
                borderColor: '#00b4d8',
                backgroundColor: 'rgba(0, 180, 216, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,0.05)' } } }
        }
    });

    const sent = txs.filter(t => t.senderAccountId === accountId).reduce((sum, t) => sum + t.amount, 0);
    const received = txs.filter(t => t.receiverAccountId === accountId).reduce((sum, t) => sum + t.amount, 0);

    expensePieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: [(window.currentLang === 'tr' ? 'Giden' : 'Outgoing'), (window.currentLang === 'tr' ? 'Gelen' : 'Incoming')],
            datasets: [{
                data: [sent || 1, received || 1],
                backgroundColor: ['#e11d48', '#00b4d8'],
                hoverOffset: 4,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#fff', boxWidth: 10 } } }
        }
    });
}

async function fetchDatabaseStats() {
    try {
        const isAdmin = currentUser && currentUser.role === 'Admin';
        
        const [users, accounts, transactions] = await Promise.all([
            fetch('/api/users').then(r => r.json()),
            fetch('/api/accounts').then(r => r.json()),
            fetch('/api/transactions').then(r => r.json())
        ]);

        const container = getEl('dbStatsContainer');
        if (container) {
            container.innerHTML = `
                <div class="db-stat-mini glass-card"><span>Users</span><strong>${users.length}</strong></div>
                <div class="db-stat-mini glass-card"><span>Accounts</span><strong>${accounts.length}</strong></div>
                <div class="db-stat-mini glass-card"><span>Transactions</span><strong>${transactions.length}</strong></div>
            `;
        }

        // Kullanıcı tablosunu sadece admin görebilir
        const userTableParent = document.querySelector('#dbUsersTable')?.closest('.db-preview-card');
        if (userTableParent) {
            userTableParent.style.display = isAdmin ? 'block' : 'none';
        }

        if (isAdmin) {
            const tbody = document.querySelector('#dbUsersTable tbody');
            if (tbody) {
                tbody.innerHTML = users.slice(0, 10).map(u => {
                    const acc = accounts.find(a => a.userId === u.id);
                    return `
                        <tr>
                            <td>${u.id}</td>
                            <td>${escapeHtml(u.name)} ${escapeHtml(u.surname || '')}</td>
                            <td>${u.accountNumber || '-'}</td>
                            <td class="bal-text">₺${acc ? acc.balance.toLocaleString() : '0'}</td>
                        </tr>
                    `;
                }).join('');
            }
        }
    } catch (e) { console.error('DB Explorer error:', e); }
}

// ========== AI CHAT ==========
function toggleAIChat() {
   const win = getEl('aiChatWindow');
   const launcher = getEl('aiLauncher');
   if (win) {
      win.classList.toggle('active');
      const open = win.classList.contains('active');
      win.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (launcher) launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
         const inp = getEl('floatingAiInput');
         if (inp) setTimeout(() => inp.focus(), 100);
      }
   }
}

async function sendAiMessage() {
    const input = getEl('aiInput');
    const display = getEl('aiChatContent');
    if (!input || !display || !input.value.trim()) return;

    const userText = escapeHtml(input.value.trim());
    input.value = '';

    display.innerHTML += `<div class="user-bubble"><div class="bubble-text">${userText}</div></div>`;
    display.scrollTop = display.scrollHeight;

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText })
        });
        const data = await response.json();
        
        display.innerHTML += `
            <div class="bot-bubble">
                <div class="bubble-icon">🤖</div>
                <div class="bubble-text">${escapeHtml(data.response || 'Hata oluştu.')}</div>
            </div>
        `;
    } catch (err) {
        display.innerHTML += `
            <div class="bot-bubble error">
                <div class="bubble-icon">⚠️</div>
                <div class="bubble-text">Neon AI şu an yanıt veremiyor.</div>
            </div>
        `;
    }
    display.scrollTop = display.scrollHeight;
}

async function sendAIMessage() {
   const input = getEl('floatingAiInput');
   if (!input) return;
   const message = input.value.trim();
   if (!message) return;
   appendMessage('user', message);
   input.value = '';
   const loadingId = 'ai-loading-' + Date.now();
   appendMessage('bot', '...', loadingId);
   try {
      const response = await fetch('/api/ai/chat', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ message: message })
      });
      let text = '';
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
         const data = await response.json();
         text = data.response || data.message || '';
         if (!response.ok && !text) {
            text = data.title || `HTTP ${response.status}`;
         }
      } else {
         text = await response.text();
         if (!response.ok) text = `Server error (${response.status})`;
      }
      const loadingEl = getEl(loadingId);
      if (loadingEl) {
         loadingEl.innerHTML = '';
         const p = document.createElement('p');
         p.textContent = text;
         loadingEl.appendChild(p);
      }
   } catch (err) {
      const loadingEl = getEl(loadingId);
      if (loadingEl) loadingEl.innerHTML = `<p>Neon System Error, please try again.</p>`;
   }
}

function appendMessage(sender, text, id = null) {
   const body = getEl('aiChatBody');
   if (!body) return;
   const msgDiv = document.createElement('div');
   msgDiv.className = `ai-message ${sender}`;
   if (id) msgDiv.id = id;
   const p = document.createElement('p');
   p.textContent = text;
   msgDiv.appendChild(p);
   body.appendChild(msgDiv);
   body.scrollTop = body.scrollHeight;
}

// ========== QR CODE ==========
function refreshQrCode() {
   const accEl = getEl('dashAccountNo');
   const accNo = accEl ? accEl.textContent.trim() : '';
   const payload = encodeURIComponent(`VIREON|PAY|TRY|IBAN|${accNo}|vireon.bank`);
   const img = getEl('qrPaymentImg');
   const lbl = getEl('qrAccountLabel');
   if (lbl) lbl.textContent = accNo || '-';
   if (img) {
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${payload}`;
      img.alt = 'QR Code';
   }
}

// ========== DEPOSIT ==========
async function handleDepositRequest() {
   if (!currentUser) return;
   const lang = window.currentLang || 'en';
   const amtField = getEl('depositAmount');
   if (!amtField) return;
   
   const amt = parseFloat(amtField.value);
   if (!amt || amt <= 0) {
      showToast(lang === 'tr' ? 'Geçerli tutar girin.' : 'Enter a valid amount.', 'warning');
      return;
   }
   const noteField = getEl('depositNote');
   const note = noteField ? noteField.value : '';
   
   const btn = document.querySelector('#dash-deposit .login-submit-btn');
   if (btn) btn.disabled = true;

   try {
       const response = await fetch('/api/transfers/deposit', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               accountNumber: currentUser.accountNumber,
               amount: amt,
               description: note || (lang === 'tr' ? 'Para Yatırma' : 'Deposit')
           })
       });

       if (response.ok) {
           showToast(lang === 'tr' ? 'Para başarıyla yatırıldı!' : 'Deposit successful!', 'success');
           amtField.value = '';
           if (noteField) noteField.value = '';
           // Fetch updated balance and transactions
           fetchDashboardData();
       } else {
           const err = await response.json();
           showToast(err.mesaj || err.message || 'Error', 'error');
       }
   } catch (e) {
       console.error('Deposit error:', e);
       showToast(lang === 'tr' ? 'Sunucu hatası.' : 'Server error.', 'error');
   } finally {
       if (btn) btn.disabled = false;
   }
}

// ========== PROFILE ==========
async function handleProfileSave() {
   if (!currentUser) return;
   const lang = window.currentLang || 'en';
   const nameField = getEl('profileName');
   const surnameField = getEl('profileSurname');
   const emailField = getEl('profileEmail');
   if (!nameField || !emailField) return;
   
   const name = nameField.value.trim();
   const surname = surnameField ? surnameField.value.trim() : '';
   const email = emailField.value.trim();
   
   if (!name || !email) {
      showToast(lang === 'tr' ? 'Ad ve e-posta zorunludur.' : 'Name and email are required.', 'warning');
      return;
   }
   
   try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ id: currentUser.id, name, surname: surname || ' ', email, password: '' })
      });
      if (res.ok) {
         currentUser = { ...currentUser, name, surname: surname || ' ', email };
         localStorage.setItem('vireonUser', JSON.stringify(currentUser));
         showToast(lang === 'tr' ? 'Bilgiler güncellendi.' : 'Profile updated.', 'success');
      } else {
         const err = await res.json().catch(() => ({}));
         showToast(err.message || (lang === 'tr' ? 'Güncelleme başarısız.' : 'Update failed.'), 'error');
      }
   } catch (e) {
      showToast(lang === 'tr' ? 'Sunucu hatası.' : 'Server error.', 'error');
   }
}

async function handlePasswordChange() {
   if (!currentUser) return;
   const lang = window.currentLang || 'en';
   const curPwdField = getEl('pwdCurrent');
   const newPwdField = getEl('pwdNew');
   const confirmField = getEl('pwdConfirm');
   if (!curPwdField || !newPwdField || !confirmField) return;
   
   const curPwd = curPwdField.value;
   const newPwd = newPwdField.value;
   const confirm = confirmField.value;
   
   if (!curPwd || !newPwd) {
      showToast(lang === 'tr' ? 'Tüm alanları doldurun.' : 'Fill all fields.', 'warning');
      return;
   }
   if (newPwd.length < 6) {
      showToast(lang === 'tr' ? 'Yeni şifre en az 6 karakter olmalı.' : 'New password must be at least 6 characters.', 'warning');
      return;
   }
   if (newPwd !== confirm) {
      showToast(lang === 'tr' ? 'Yeni şifreler eşleşmiyor.' : 'New passwords do not match.', 'error');
      return;
   }
   try {
      const cur = await fetch(`/api/users/${currentUser.id}`).then(r => r.json());
      if (cur.password !== curPwd) {
         showToast(lang === 'tr' ? 'Mevcut şifre yanlış.' : 'Current password is incorrect.', 'error');
         return;
      }
      const res = await fetch(`/api/users/${currentUser.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ id: currentUser.id, name: cur.name, surname: cur.surname, email: cur.email, password: newPwd })
      });
      if (res.ok) {
         curPwdField.value = '';
         newPwdField.value = '';
         confirmField.value = '';
         showToast(lang === 'tr' ? 'Şifre güncellendi.' : 'Password updated.', 'success');
      } else {
         showToast(lang === 'tr' ? 'İşlem başarısız.' : 'Operation failed.', 'error');
      }
   } catch (e) {
      showToast(lang === 'tr' ? 'Sunucu hatası.' : 'Server error.', 'error');
   }
}
// ========== TRANSFERS ==========
async function handleSendTransfer() {
    if (!currentUser || !currentUser.accountNumber) {
        showToast('Please login first', 'warning');
        return;
    }
    
    const lang = window.currentLang || 'en';
    const receiverAccountNumber = getEl('transferTarget')?.value?.trim()?.toUpperCase();
    const amount = parseFloat(getEl('transferAmount')?.value);
    const description = getEl('transferDesc')?.value || '';
    const btn = getEl('sendBtn');
    
    if (!receiverAccountNumber || !amount) {
        showToast(lang === 'tr' ? 'Alıcı hesap ve tutar gerekli.' : 'Receiver account and amount required.', 'warning');
        return;
    }
    
    if (amount <= 0) {
        showToast(lang === 'tr' ? 'Tutar 0\'dan büyük olmalı.' : 'Amount must be greater than 0.', 'warning');
        return;
    }
    
    if (receiverAccountNumber === currentUser.accountNumber) {
        showToast(lang === 'tr' ? 'Kendi hesabınıza transfer yapamazsınız.' : 'Cannot transfer to your own account.', 'error');
        return;
    }
    
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<span class="loader-tiny"></span>'; btn.disabled = true; }
    
    try {
        const response = await fetch('/api/transfers/send-by-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderAccountNumber: currentUser.accountNumber,
                receiverAccountNumber: receiverAccountNumber,
                amount: amount,
                description: description || 'Transfer'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(
                lang === 'tr' ? (result.mesaj || 'Transfer başarılı!') : (result.message || 'Transfer successful!'),
                'success'
            );
            
            const targetField = getEl('transferTarget');
            const amountField = getEl('transferAmount');
            const descField = getEl('transferDesc');
            if (targetField) targetField.value = '';
            if (amountField) amountField.value = '';
            if (descField) descField.value = '';
            
            fetchDashboardData();
        } else {
            const error = await response.json().catch(() => ({}));
            showToast(
                lang === 'tr' ? (error.mesaj || 'Transfer başarısız!') : (error.message || 'Transfer failed!'),
                'error'
            );
        }
    } catch (err) {
        showToast(lang === 'tr' ? 'Sunucuya bağlanılamadı.' : 'Connection error.', 'error');
    } finally {
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
}

function updateTransactionList(txs, accountId, listElement) {
   if (!listElement) return;
   const lang = window.currentLang || 'en';
   if (!txs || txs.length === 0) {
      listElement.innerHTML = `<p class="tx-empty">${lang === 'tr' ? 'Henüz işlem bulunamadı.' : 'No transactions found.'}</p>`;
      return;
   }
   const outLabel = lang === 'tr' ? 'Giden transfer' : 'Outgoing';
   const inLabel = lang === 'tr' ? 'Gelen transfer' : 'Incoming';
   const depositLabel = lang === 'tr' ? 'Para Yatırma' : 'Deposit';
   listElement.innerHTML = txs.slice().reverse().map(tx => {
      const isDeposit = tx.senderAccountId === tx.receiverAccountId;
      const isOut = !isDeposit && tx.senderAccountId === accountId;
      const amountClass = isDeposit ? 'tx-in' : (isOut ? 'tx-out' : 'tx-in');
      const symbol = isDeposit ? '+' : (isOut ? '-' : '+');
      const label = isDeposit ? depositLabel : (isOut ? outLabel : inLabel);
      const icon = isDeposit ? '💰' : (isOut ? '📤' : '📥');
      const statusText = typeof tx.status === 'number' ? ['Pending','Completed','Failed','Cancelled'][tx.status] || '' : (tx.status || '');
      const statusBadge = statusText ? `<span class="tx-status tx-status-${statusText}">${statusText}</span>` : '';
      const desc = tx.description ? `<span class="tx-detail">${escapeHtml(tx.description)}</span>` : '';
      return `
            <div class="tx-item">
                <div class="tx-info">
                    <span class="tx-icon">${icon}</span>
                    <div class="tx-meta">
                        <span class="tx-desc">${label}</span>
                        ${desc}
                        <span class="tx-date">${new Date(tx.date).toLocaleDateString('tr-TR', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div class="tx-amount ${amountClass}">${symbol}₺${tx.amount.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</div>
            </div>`;
    }).join('');
}

// ========== ANALYTICS CHART ==========
let overviewChartInstance = null;

function initOverviewChart(txs, accountId) {
    const ctx = document.getElementById('overviewChart');
    if (!ctx) return;
    if (overviewChartInstance) overviewChartInstance.destroy();

    const labels = [];
    const outgoingData = [];
    const incomingData = [];

    const sortedTxs = [...txs].sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-7);

    sortedTxs.forEach(t => {
        const dateStr = new Date(t.date).toLocaleDateString(window.currentLang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
        labels.push(dateStr);
        if (t.senderAccountId === accountId) {
            outgoingData.push(t.amount);
            incomingData.push(0);
        } else {
            incomingData.push(t.amount);
            outgoingData.push(0);
        }
    });

    if (labels.length === 0) {
        labels.push('Demo 1', 'Demo 2', 'Demo 3', 'Demo 4');
        incomingData.push(5000, 2000, 4500, 3000);
        outgoingData.push(1200, 3100, 800, 2500);
    }

    overviewChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: window.currentLang === 'tr' ? 'Gelen' : 'Incoming',
                    data: incomingData,
                    backgroundColor: 'rgba(0, 180, 216, 0.6)',
                    borderColor: '#00b4d8',
                    borderWidth: 1,
                    borderRadius: 5
                },
                {
                    label: window.currentLang === 'tr' ? 'Giden' : 'Outgoing',
                    data: outgoingData,
                    backgroundColor: 'rgba(225, 29, 72, 0.6)',
                    borderColor: '#e11d48',
                    borderWidth: 1,
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
                x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)' } }
            },
            plugins: { legend: { labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Outfit' } } } }
        }
    });
}

// ========== LIMIT MANAGEMENT ==========
function toggleLimitEdit() {
    const form = getEl('limitEditForm');
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

async function handleUpdateLimit() {
    if (!currentUser) return;
    const lang = window.currentLang || 'en';
    const limitField = getEl('newMaxLimit');
    if (!limitField) return;
    
    const newLimit = parseFloat(limitField.value);
    if (!newLimit || newLimit < 0) {
        showToast(lang === 'tr' ? 'Geçerli bir limit girin.' : 'Enter a valid limit.', 'warning');
        return;
    }

    try {
        const limitRes = await fetch('/api/dailylimits');
        const allLimits = await limitRes.json();
        const userLimit = allLimits.find(l => l.userId === currentUser.id);

        if (!userLimit) {
            showToast(lang === 'tr' ? 'Limit kaydı bulunamadı.' : 'Limit record not found.', 'error');
            return;
        }

        const response = await fetch(`/api/dailylimits/${userLimit.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: userLimit.id,
                userId: currentUser.id,
                maxDailyLimit: newLimit,
                usedLimit: userLimit.usedLimit,
                lastResetDate: userLimit.lastResetDate
            })
        });

        if (response.ok) {
            showToast(lang === 'tr' ? 'Limit güncellendi.' : 'Limit updated.', 'success');
            toggleLimitEdit();
            fetchDashboardData();
        } else {
            showToast(lang === 'tr' ? 'Güncelleme başarısız.' : 'Update failed.', 'error');
        }
    } catch (err) {
        showToast(lang === 'tr' ? 'Sunucu hatası.' : 'Server error.', 'error');
    }
}

// ========== ACCOUNT INFORMATION ==========
async function loadAccountInfo() {
    if (!currentUser) return;
    const lang = window.currentLang || 'en';

    try {
        // User details
        const accNumEl = getEl('infoAccountNumber');
        const nameEl = getEl('infoFullName');
        const emailEl = getEl('infoEmail');
        const createdEl = getEl('infoCreatedAt');
        
        if (accNumEl) accNumEl.textContent = currentUser.accountNumber || '-';
        if (nameEl) nameEl.textContent = `${currentUser.name} ${currentUser.surname || ''}`.trim();
        if (emailEl) emailEl.textContent = currentUser.email || '-';
        if (createdEl) createdEl.textContent = currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('tr-TR') : '-';

        // Balance
        const response = await fetch('/api/accounts');
        const accounts = await response.json();
        const userAccount = accounts.find(a => a.userId === currentUser.id);
        
        const balEl = getEl('infoBalance');
        const curEl = getEl('infoCurrency');
        if (balEl) balEl.textContent = userAccount ? `₺${userAccount.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '₺0.00';
        if (curEl) curEl.textContent = userAccount?.currency || 'TRY';

        // Transaction history
        if (userAccount) {
            const txResponse = await fetch('/api/transactions');
            const transactions = await txResponse.json();
            const userTxs = transactions.filter(t => t.senderAccountId === userAccount.id || t.receiverAccountId === userAccount.id);
            
            const historyEl = getEl('infoTransactionHistory');
            if (historyEl) updateTransactionList(userTxs, userAccount.id, historyEl);
            
            const txCountEl = getEl('infoTxCount');
            if (txCountEl) txCountEl.textContent = userTxs.length;
        }
    } catch (err) {
        console.error('Account info error:', err);
    }
}

// ========== ADMIN PANEL FUNCTIONS ==========
async function loadAdminOverview() {
    if (!currentUser || currentUser.role !== 'Admin') return;
    try {
        const [statsRes, usersRes] = await Promise.all([
            fetch('/api/users/admin-stats'),
            fetch('/api/users/admin-users')
        ]);
        const stats = await statsRes.json();
        const users = await usersRes.json();

        const setVal = (id, val) => { const el = getEl(id); if (el) el.textContent = val; };
        
        setVal('aoTotalUsers', stats.totalUsers || users.length);
        setVal('aoActiveUsers', Math.floor((stats.totalUsers || users.length) * 0.8)); // Mock
        setVal('aoOnlineUsers', Math.floor(Math.random() * 10) + 1); // Mock
        setVal('aoNewUsers', Math.floor(Math.random() * 5)); // Mock
        setVal('aoTotalBalance', '₺' + (stats.totalBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }));
        setVal('aoTotalTx', stats.totalTransactions || 0);
        
        setVal('aoFraudCount', stats.totalFraudLogs || 0);
        setVal('aoLedgerCount', stats.totalLedgerEntries || 0);
        setVal('aoAdminCount', users.filter(u => u.role === 'Admin').length);
        setVal('aoServerUptime', '99.9%');

        const recentUsersBody = getEl('aoRecentUsersBody');
        if (recentUsersBody) {
            recentUsersBody.innerHTML = users.slice(-5).reverse().map(u => `
                <tr>
                    <td>${u.id}</td>
                    <td>${escapeHtml(u.name)} ${escapeHtml(u.surname || '')}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : 'New'}</td>
                    <td><span class="role-badge role-${(u.role || 'User').toLowerCase()}">${u.role || 'User'}</span></td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Admin overview error:', err);
    }
}

async function loadAdminTransactions() {
    if (!currentUser || currentUser.role !== 'Admin') return;
    try {
        const txRes = await fetch('/api/users/admin-transactions');
        const txs = await txRes.json();
        
        const setVal = (id, val) => { const el = getEl(id); if (el) el.textContent = val; };
        setVal('atTotalCount', txs.length);
        const totalVolume = txs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        setVal('atTotalVolume', '₺' + totalVolume.toLocaleString('tr-TR', { minimumFractionDigits: 2 }));
        setVal('atAvgAmount', '₺' + (txs.length ? (totalVolume / txs.length) : 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }));

        const txBody = getEl('adminAllTxBody');
        if (txBody) {
            txBody.innerHTML = txs.reverse().map(tx => `
                <tr>
                    <td>${tx.id}</td>
                    <td><span class="type-badge type-${tx.type.toLowerCase()}">${tx.type}</span></td>
                    <td>${escapeHtml(tx.senderName || tx.senderAccount || '-')}</td>
                    <td>${escapeHtml(tx.receiverName || tx.receiverAccount || '-')}</td>
                    <td class="bal-text">₺${tx.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                    <td>${escapeHtml(tx.description || '-')}</td>
                    <td>${new Date(tx.date).toLocaleDateString('tr-TR', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                    <td><span class="tx-status tx-status-${tx.status}">${tx.status}</span></td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Admin transactions error:', err);
    }
}

async function loadAdminAccounts() {
    if (!currentUser || currentUser.role !== 'Admin') return;
    try {
        const usersRes = await fetch('/api/users/admin-users');
        const users = await usersRes.json();
        
        const countEl = getEl('aaUserCount');
        if (countEl) countEl.textContent = `${users.length} users`;

        const usersBody = getEl('adminAllUsersBody');
        if (usersBody) {
            usersBody.innerHTML = users.map(u => `
                <tr>
                    <td>${u.id}</td>
                    <td>${escapeHtml(u.name)} ${escapeHtml(u.surname || '')}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>${u.accountNumber || '-'}</td>
                    <td class="bal-text">₺${(u.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                    <td>${u.transactionCount || 0}</td>
                    <td>
                        <span class="role-badge role-${(u.role || 'User').toLowerCase()}">${u.role || 'User'}</span>
                    </td>
                    <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Admin accounts error:', err);
    }
}

async function loadAdminAI() {
    if (!currentUser || currentUser.role !== 'Admin') return;
    // Mock data for AI settings
    const setVal = (id, val) => { const el = getEl(id); if (el) el.textContent = val; };
    setVal('aiTotalChats', Math.floor(Math.random() * 500) + 120);
    setVal('aiTokenUsage', Math.floor(Math.random() * 50000) + 15000);
    setVal('aiAvgResponse', '1.2s');
}

async function loadAdminPanel() {
    // Legacy support if anything still links to dash-admin directly
    loadAdminOverview();
}
