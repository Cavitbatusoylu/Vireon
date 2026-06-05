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
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
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

// Service Worker: localhost/electron'da devre dışı, prod ortamda aktif.
window.addEventListener('load', async () => {
   if (!('serviceWorker' in navigator)) return;

   const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
   const isFileProtocol = window.location.protocol === 'file:';

   if (isLocalhost || isFileProtocol) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
         await registration.unregister();
      }
      return;
   }

   try {
      await navigator.serviceWorker.register('/sw.js');
   } catch (error) {
      console.warn('Service worker register failed:', error);
   }
});

// Global state tracking
let isTransitioning = false;
let currentUser = null;
let deferredPrompt; 
let hasAnimatedStats = false;
let chatHistory = [];

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
    if (!inputEl) return;
    clearFieldError(inputEl);
    inputEl.classList.add('input-error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-msg';
    errorDiv.textContent = message;
    inputEl.parentElement.appendChild(errorDiv);
}

function clearFieldError(inputEl) {
    if (!inputEl) return;
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

function initFormValidation() {
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

// Safely get elements
const getEl = (id) => document.getElementById(id);
const getEls = (selector) => document.querySelectorAll(selector);
const getLocale = () => (window.currentLang === 'tr' ? 'tr-TR' : 'en-US');
const formatNumber = (value, minimumFractionDigits = 2, maximumFractionDigits = 2) =>
   new Intl.NumberFormat(getLocale(), { minimumFractionDigits, maximumFractionDigits }).format(Number(value) || 0);
const formatDate = (value, options) => new Date(value).toLocaleDateString(getLocale(), options);

async function fetchJsonOrThrow(url, options) {
   const response = await fetch(url, options);
   const payload = await response.json().catch(() => ({}));
   if (!response.ok) {
      const message = payload?.mesaj || payload?.message || `HTTP ${response.status}`;
      throw new Error(message);
   }
   return payload;
}

// ========== SESSION ==========
// "Beni Hatırla" işaretliyse localStorage (kalıcı), değilse sessionStorage (sekme kapanınca silinir).
const SESSION_KEY = 'vireonUser';
function saveSession(user, remember) {
   const data = JSON.stringify(user);
   if (remember) {
      localStorage.setItem(SESSION_KEY, data);
      sessionStorage.removeItem(SESSION_KEY);
   } else {
      sessionStorage.setItem(SESSION_KEY, data);
      localStorage.removeItem(SESSION_KEY);
   }
}
function loadSession() {
   return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
}
function clearSession() {
   localStorage.removeItem(SESSION_KEY);
   sessionStorage.removeItem(SESSION_KEY);
}
// currentUser güncellendiğinde mevcut oturumu (hangi store kullanılıyorsa) yeniden yazar.
function persistCurrentUser() {
   if (!currentUser) return;
   const data = JSON.stringify(currentUser);
   if (localStorage.getItem(SESSION_KEY) !== null) localStorage.setItem(SESSION_KEY, data);
   else if (sessionStorage.getItem(SESSION_KEY) !== null) sessionStorage.setItem(SESSION_KEY, data);
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
   try {
       // Restore user from session (localStorage = remembered, sessionStorage = this tab only)
       const savedUser = loadSession();
       if (savedUser) {
           try {
               currentUser = JSON.parse(savedUser);
               updateNavbarForLoggedInUser();
               resetSessionTimer();

               // Restore to dashboard immediately if session exists
               showSection('dashboard');
               fetchDashboardData();
           } catch (e) {
               clearSession();
           }
       }

       initNavigation();
       initInteractions();
       initPasswordToggles();
       initFormValidation();
       // Landing sayfasında metrikler ilk açılışta da dolsun.
       setTimeout(animateStats, 300);
   } catch (e) {
       console.error("NEON AI: Init Error", e);
   }
});

function initNavigation() {
   document.querySelectorAll('.menu-item').forEach(item => {
      // Kartlarda inline onclick zaten var; çift tetiklenmeyi önle.
      if (item.hasAttribute('onclick')) return;

      item.addEventListener('click', function() {
         const onclick = this.getAttribute('onclick');
         if (onclick) {
            const match = onclick.match(/scrollToSection\('([^']+)'\)/);
            if (match && match[1]) {
               scrollToSection(match[1]);
            }
         }
      });
   });
}

function scrollToSection(id) {
    const target = getEl(id);
    if (!target) return;

    // Landing akışında kartlar sabit kalır, kullanıcı aşağı doğru section'lara iner.
    const menuGrid = getEl('menuGrid');
    const mainHeader = getEl('mainHeader');
    const mainFooter = getEl('mainFooter');
    if (menuGrid) { menuGrid.style.display = 'grid'; menuGrid.style.visibility = 'visible'; }
    if (mainHeader) { mainHeader.style.display = 'block'; mainHeader.style.visibility = 'visible'; }
    if (mainFooter) { mainFooter.style.display = 'block'; mainFooter.style.visibility = 'visible'; }

    document.querySelectorAll('.landing-content-section').forEach(sec => {
        sec.style.display = 'block';
        sec.style.visibility = 'visible';
        sec.style.opacity = '1';
    });

    document.body.classList.remove('dashboard-active');

    // Kart tıklamasında hedef bölüme güvenilir şekilde git.
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);

    if (id === 'section-introduction') setTimeout(animateStats, 500);
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
   } else {
      backToMenu();
      return;
   }

   if (sectionId === 'dashboard') {
      document.body.classList.add('dashboard-active');
      
      document.querySelectorAll('.landing-content-section').forEach(sec => {
         sec.style.display = 'none';
         sec.style.visibility = 'hidden';
      });
      
      const wrapper = document.querySelector('#dashboard .dashboard-wrapper');
      if (wrapper) wrapper.style.display = 'flex';
      
      if (!currentUser) {
         document.body.classList.remove('dashboard-active');
         backToMenu();
      } else {
         fetchDashboardData();
         window.scrollTo(0, 0);
      }
      syncNavbarContext();
   } else {
      document.body.classList.remove('dashboard-active');
      syncNavbarContext();
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
   syncNavbarContext();
   
   window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Animate Stats
function animateStats() {
   if (hasAnimatedStats) return;

   const statElements = getEls('.metric-value[data-target]');
   if (!statElements.length) return;

   hasAnimatedStats = true;
   statElements.forEach((el, index) => {
      setTimeout(() => {
         const target = parseInt(el.dataset.target, 10);
         if (Number.isNaN(target)) return;

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

// ========== AUTHENTICATION ==========
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    clearAllFieldErrors(form);

    const emailEl = getEl('loginEmail');
    const passwordEl = getEl('loginPassword');
    const email = emailEl?.value?.trim();
    const password = passwordEl?.value;
    const lang = window.currentLang || 'en';

    // Rate limiting: çok fazla başarısız denemede geçici kilit
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
        showToast(lang === 'tr'
            ? `Çok fazla deneme. ${rateCheck.remaining} saniye bekleyin.`
            : `Too many attempts. Please wait ${rateCheck.remaining} seconds.`, 'error');
        return;
    }

    // Inline validation
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
    }
    if (hasError) return;
    
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<span class="loader-tiny"></span>'; btn.disabled = true; }
    
    try {
        recordLoginAttempt();
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            loginAttempts.count = 0; // başarılı girişte rate limit sayacını sıfırla
            const remember = !!getEl('rememberMe')?.checked;
            saveSession(user, remember);
            resetSessionTimer();

            showToast(lang === 'tr' ? `Hoş geldin ${user.name}!` : `Welcome ${user.name}!`, 'success');
            closeLoginModal();
            updateNavbarForLoggedInUser();
            
            setTimeout(() => {
                showSection('dashboard');
                fetchDashboardData();
            }, 300);
        } else {
            const error = await response.json().catch(() => ({}));
            showToast(error.message || (lang === 'tr' ? 'E-posta veya şifre hatalı.' : 'Invalid email or password.'), 'error');
        }
    } catch (err) {
        console.error('Login error:', err);
        showToast(lang === 'tr' ? 'Sunucuya bağlanılamadı.' : 'Could not connect to server.', 'error');
    } finally {
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const lang = window.currentLang || 'en';
    
    const fullName = getEl('registerName')?.value?.trim();
    const email = getEl('registerEmail')?.value?.trim();
    const password = getEl('registerPassword')?.value;
    const confirmPassword = getEl('registerConfirmPassword')?.value;
    
    if (!fullName || !email || !password || !confirmPassword) {
        showToast(lang === 'tr' ? 'Lütfen tüm alanları doldurun.' : 'Please fill all fields.', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast(lang === 'tr' ? 'Şifreler eşleşmiyor.' : 'Passwords do not match.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast(lang === 'tr' ? 'Şifre en az 6 karakter olmalı.' : 'Password must be at least 6 characters.', 'warning');
        return;
    }
    
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const name = nameParts[0] || 'User';
    const surname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : name;
    
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<span class="loader-tiny"></span>'; btn.disabled = true; }
    
    try {
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
                    : `Account created! Account No: ${result.accountNumber}`,
                'success'
            );
            closeRegisterModal();
            
            setTimeout(() => {
                const loginEmail = getEl('loginEmail');
                const loginPassword = getEl('loginPassword');
                if (loginEmail) loginEmail.value = email;
                if (loginPassword) loginPassword.value = password;
                openLoginModal();
            }, 1500);
        } else {
            const error = await response.json().catch(() => ({}));
            showToast(error.message || (lang === 'tr' ? 'Kayıt başarısız.' : 'Registration failed.'), 'error');
        }
    } catch (err) {
        console.error('Register error:', err);
        showToast(lang === 'tr' ? 'Sunucuya bağlanılamadı.' : 'Connection error.', 'error');
    } finally {
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
}

// ========== NAVBAR MANAGEMENT ==========
/** Dashboard: Ana Menü görünür. Ana sayfa (giriş sonrası): buton sırası ters, Ana Menü gizli. */
function syncNavbarContext() {
    const onDashboard = document.body.classList.contains('dashboard-active');
    const backBtn = getEl('backToHomeBtn');
    if (backBtn) {
        backBtn.style.display = (currentUser && onDashboard) ? 'inline-flex' : 'none';
    }
    document.body.classList.toggle('nav-landing-mode', !!(currentUser && !onDashboard));
}

function updateNavbarForLoggedInUser() {
    const loginBtn = getEl('loginBtn');
    const logoutBtn = getEl('logoutBtn');
    
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    syncNavbarContext();

    const isAdmin = currentUser && currentUser.role === 'Admin';

    // Admin menü öğesini göster/gizle
    const adminMenu = getEl('adminMenuItem');
    if (adminMenu) {
        adminMenu.style.display = isAdmin ? 'flex' : 'none';
    }

    // DB Explorer yalnızca admin kullanıcılarda görünür.
    const dbExplorerMenu = document.querySelector('.sidebar-menu li[data-dash="dash-db-explorer"]');
    if (dbExplorerMenu) dbExplorerMenu.style.display = isAdmin ? 'flex' : 'none';

    // Admin kırmızı tema
    if (currentUser && currentUser.role === 'Admin') {
        document.body.classList.add('admin-mode');
    } else {
        document.body.classList.remove('admin-mode');
    }

    // DB Explorer'da kullanıcı tablosunu sadece admin görsün
    const dbUsersCard = document.querySelector('#dash-db-explorer .db-preview-card');
    if (dbUsersCard) {
        dbUsersCard.style.display = (currentUser && currentUser.role === 'Admin') ? 'block' : 'none';
    }
}

function updateNavbarForLoggedOutUser() {
    const loginBtn = getEl('loginBtn');
    const logoutBtn = getEl('logoutBtn');
    
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    document.body.classList.remove('nav-landing-mode');
    syncNavbarContext();

    const adminMenu = getEl('adminMenuItem');
    if (adminMenu) adminMenu.style.display = 'none';

    const dbUsersCard = document.querySelector('#dash-db-explorer .db-preview-card');
    if (dbUsersCard) dbUsersCard.style.display = 'none';
}

function handleLogout() {
    const lang = window.currentLang || 'en';
    currentUser = null;
    clearSession();
    chatHistory = [];
    if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
    document.body.classList.remove('admin-mode');

    // Giriş formundaki bilgileri de temizle (önceki oturum sızmasın).
    ['loginEmail', 'loginPassword'].forEach(id => { const el = getEl(id); if (el) el.value = ''; });
    const remember = getEl('rememberMe');
    if (remember) remember.checked = false;

    showToast(lang === 'tr' ? 'Çıkış yapıldı.' : 'Logged out successfully.', 'info');
    updateNavbarForLoggedOutUser();
    backToMenu();
}

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// ========== PASSWORD SHOW/HIDE ==========
const PWD_ICON_EYE = '<svg class="pwd-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const PWD_ICON_EYE_OFF = '<svg class="pwd-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function initPasswordToggles() {
    document.querySelectorAll('input[type="password"]').forEach(input => {
        if (input.dataset.toggleReady === '1') return;
        input.dataset.toggleReady = '1';

        const wrap = document.createElement('div');
        wrap.className = 'pwd-wrap';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pwd-toggle';
        btn.setAttribute('aria-label', 'Show password');
        btn.innerHTML = PWD_ICON_EYE;
        btn.addEventListener('click', () => {
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.innerHTML = show ? PWD_ICON_EYE_OFF : PWD_ICON_EYE;
            btn.classList.toggle('active', show);
            btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        });
        wrap.appendChild(btn);
    });
}

// ========== RECEIVER NAME LOOKUP ==========
let _receiverLookupTimer = null;
function lookupReceiverName() {
    const input = getEl('transferTarget');
    const hint = getEl('transferReceiverName');
    if (!input || !hint) return;

    const acc = input.value.trim().toUpperCase();
    const lang = window.currentLang || 'en';
    clearTimeout(_receiverLookupTimer);

    if (!acc || acc.length < 4) { hint.textContent = ''; hint.className = 'receiver-name-hint'; return; }

    _receiverLookupTimer = setTimeout(async () => {
        try {
            const res = await fetch(`/api/users/search?accountNumber=${encodeURIComponent(acc)}`);
            if (!res.ok) {
                hint.textContent = lang === 'tr' ? '⚠ Hesap bulunamadı' : '⚠ Account not found';
                hint.className = 'receiver-name-hint error';
                return;
            }
            const u = await res.json();
            const fullName = `${u.name || ''} ${u.surname || ''}`.trim();
            hint.textContent = fullName ? `✓ ${fullName}` : '';
            hint.className = 'receiver-name-hint ok';
        } catch {
            hint.textContent = '';
            hint.className = 'receiver-name-hint';
        }
    }, 350);
}

// ========== LANGUAGE CHANGE HOOK ==========
// switchLang (index.html) statik [data-tr] öğelerini günceller; JS ile üretilen
// içerik (işlem listeleri, admin tabloları) burada yeniden render edilir.
window.onLanguageChange = function () {
    try {
        if (currentUser) {
            fetchDashboardData();
            if (currentUser.role === 'Admin') loadAdminPanel();
            const accInfo = getEl('dash-account-info');
            if (accInfo && accInfo.classList.contains('active')) loadAccountInfo();
        }
    } catch (e) { console.error('Language refresh error:', e); }
};

// ========== DASHBOARD NAVIGATION ==========
function switchDashSection(targetId) {
   document.querySelectorAll('.sidebar-menu li').forEach(li => {
      const dash = li.getAttribute('data-dash');
      li.classList.toggle('active', dash === targetId);
   });

   document.querySelectorAll('.dash-sub-section').forEach(sec => sec.classList.remove('active'));
   const target = getEl(targetId);
   if (target) target.classList.add('active');

   if (targetId === 'dash-qr') refreshQrCode();
   if (targetId === 'dash-db-explorer') fetchDatabaseStats();
   if (targetId === 'dash-account-info') loadAccountInfo();
   if (targetId === 'dash-admin') loadAdminPanel();
   if (targetId === 'dash-history' && currentUser) fetchDashboardData();
}

// ========== DASHBOARD DATA ==========
async function fetchDashboardData() {
    if (!currentUser) return;
    const lang = window.currentLang || 'en';
    try {
        const accounts = await fetchJsonOrThrow('/api/accounts');
        // Karşı taraf isimlerini gösterebilmek için kullanıcı rehberini oluştur.
        const directoryUsers = await fetchJsonOrThrow('/api/users').catch(() => []);
        buildAccountDirectory(accounts, directoryUsers);
        const userAccount = accounts.find(a => a.userId === currentUser.id);
        
        if (userAccount) {
            // Update balance display
            const balEl = getEl('dashBalance');
            const accEl = getEl('dashAccountNo');
            const curEl = getEl('dashCurrency');
            
            if (balEl) balEl.textContent = formatNumber(presentationBalance(userAccount.balance, { ...currentUser, accountNumber: userAccount.accountNumber }), 2, 2);
            if (accEl) accEl.textContent = userAccount.accountNumber;
            if (curEl) curEl.textContent = userAccount.currency;

            // Fetch transactions
            const transactions = await fetchJsonOrThrow('/api/transactions');
            const userTxs = transactions.filter(t => t.senderAccountId === userAccount.id || t.receiverAccountId === userAccount.id);
            
            // Update overview transaction list
            const overviewList = getEl('overviewTransactions');
            if (overviewList) updateTransactionList(userTxs, userAccount.id, overviewList);
            
            // Update full history
            const historyList = getEl('fullTransactionHistory');
            if (historyList) updateTransactionList(userTxs, userAccount.id, historyList);
            
            initModernDashboardCharts(userTxs, userAccount.id, presentationBalance(userAccount.balance, { ...currentUser, accountNumber: userAccount.accountNumber }));
            initOverviewChart(userTxs, userAccount.id);
            refreshQrCode();

            // Update daily limits
            try {
                const limits = await fetchJsonOrThrow('/api/dailylimits');
                const userLimit = limits.find(l => l.userId === currentUser.id);
                if (userLimit) {
                    const maxEl = getEl('maxLimit');
                    const usedEl = getEl('usedLimit');
                    if (maxEl) maxEl.textContent = formatNumber(userLimit.maxDailyLimit, 0, 2);
                    if (usedEl) usedEl.textContent = formatNumber(userLimit.usedLimit, 0, 2);
                }
            } catch (e) { 
                console.error('Limits fetch error:', e); 
            }
        } else {
            // Self-healing mechanism: clear corrupt or stale session if user ID is missing in the database
            console.warn('Session user account not found in database. Clearing stale session.');
            currentUser = null;
            clearSession();
            showToast(lang === 'tr' ? 'Oturum süreniz doldu veya veritabanı sıfırlandı. Lütfen tekrar giriş yapın.' : 'Your session expired or database was reset. Please login again.', 'warning');
            updateNavbarForLoggedOutUser();
            backToMenu();
            return;
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

    const labels = txs.slice(-6).map(t => formatDate(t.date, { day: 'numeric', month: 'short' }));
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
            fetchJsonOrThrow('/api/users'),
            fetchJsonOrThrow('/api/accounts'),
            fetchJsonOrThrow('/api/transactions')
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
                tbody.innerHTML = users.slice(0, 10).map((u, idx) => {
                    const acc = accounts.find(a => a.userId === u.id);
                    return `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${escapeHtml(u.name)} ${escapeHtml(u.surname || '')}</td>
                            <td>${u.accountNumber || '-'}</td>
                            <td class="bal-text">₺${formatNumber(presentationBalance(acc?.balance, { email: u.email, role: u.role, accountNumber: u.accountNumber }), 2, 2)}</td>
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
            body: JSON.stringify({ message: userText, history: chatHistory, lang: window.currentLang || 'en' })
        });
        const data = await response.json();
        const botResponse = data.response || 'Hata oluştu.';

        // Sohbet geçmişini güncelle (son 10 mesaj çifti)
        chatHistory.push({ role: 'user', content: userText });
        chatHistory.push({ role: 'assistant', content: botResponse });
        if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

        display.innerHTML += `
            <div class="bot-bubble">
                <div class="bubble-icon">🤖</div>
                <div class="bubble-text">${escapeHtml(botResponse)}</div>
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
         body: JSON.stringify({ message: message, history: chatHistory, lang: window.currentLang || 'en' })
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
      if (text) {
         chatHistory.push({ role: 'user', content: message });
         chatHistory.push({ role: 'assistant', content: text });
         if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
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
         persistCurrentUser();
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
      // Backend hash kullandığı için mevcut şifreyi login endpoint'i ile doğruluyoruz.
      const verifyRes = await fetch('/api/users/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: currentUser.email, password: curPwd })
      });

      if (!verifyRes.ok) {
         showToast(lang === 'tr' ? 'Mevcut şifre yanlış.' : 'Current password is incorrect.', 'error');
         return;
      }

      const res = await fetch(`/api/users/${currentUser.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            id: currentUser.id,
            name: currentUser.name,
            surname: currentUser.surname || ' ',
            email: currentUser.email,
            password: newPwd
         })
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
        const lang = window.currentLang || 'en';
        showToast(lang === 'tr' ? 'Lutfen once giris yapin.' : 'Please login first.', 'warning');
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

// Hesap rehberi: accountId -> { number, owner }. İşlem listelerinde karşı tarafı göstermek için.
let accountDirectory = {};
function buildAccountDirectory(accounts, users) {
   const ownerByUserId = {};
   (users || []).forEach(u => { ownerByUserId[u.id] = `${u.name || ''} ${u.surname || ''}`.trim(); });
   const dir = {};
   (accounts || []).forEach(a => { dir[a.id] = { number: a.accountNumber, owner: ownerByUserId[a.userId] || '' }; });
   accountDirectory = dir;
}

function updateTransactionList(txs, accountId, listElement) {
   if (!listElement) return;
   const lang = window.currentLang || 'en';
   if (!txs || txs.length === 0) {
      listElement.innerHTML = `<p class="tx-empty">${lang === 'tr' ? 'Henüz işlem bulunamadı.' : 'No transactions found.'}</p>`;
      return;
   }
   const outLabel = lang === 'tr' ? 'Giden transfer' : 'Outgoing transfer';
   const inLabel = lang === 'tr' ? 'Gelen transfer' : 'Incoming transfer';
   const depositLabel = lang === 'tr' ? 'Para Yatırma' : 'Deposit';
   const toLabel = lang === 'tr' ? 'Alıcı' : 'To';
   const fromLabel = lang === 'tr' ? 'Gönderen' : 'From';

   listElement.innerHTML = txs.slice().reverse().map(tx => {
      const isDeposit = tx.senderAccountId === tx.receiverAccountId;
      const isOut = !isDeposit && tx.senderAccountId === accountId;
      const amountClass = isDeposit ? 'tx-in' : (isOut ? 'tx-out' : 'tx-in');
      const symbol = isDeposit ? '+' : (isOut ? '-' : '+');
      const label = isDeposit ? depositLabel : (isOut ? outLabel : inLabel);
      const icon = isDeposit ? '💰' : (isOut ? '📤' : '📥');
      const statusText = typeof tx.status === 'number' ? ['Pending','Completed','Failed','Cancelled'][tx.status] || '' : (tx.status || '');
      const statusBadge = statusText ? `<span class="tx-status tx-status-${statusText}">${statusText}</span>` : '';

      // Karşı taraf (hangi hesaba/kimden) bilgisini göster.
      let partyHtml = '';
      if (!isDeposit) {
         const partyId = isOut ? tx.receiverAccountId : tx.senderAccountId;
         const party = accountDirectory[partyId];
         const partyLabel = isOut ? toLabel : fromLabel;
         if (party) {
            const who = party.owner ? `${party.owner} · ${party.number}` : party.number;
            partyHtml = `<span class="tx-detail">${partyLabel}: ${escapeHtml(who)}</span>`;
         }
      }

      // Kullanıcının girdiği özel açıklamayı göster (otomatik "Transfer: ..." metnini tekrarlama).
      const customDesc = (tx.description && !/^transfer\s*:/i.test(tx.description)) ? tx.description : '';
      const desc = customDesc ? `<span class="tx-detail">${escapeHtml(customDesc)}</span>` : '';

      return `
            <div class="tx-item">
                <div class="tx-info">
                    <span class="tx-icon">${icon}</span>
                    <div class="tx-meta">
                        <span class="tx-desc">${label}</span>
                        ${partyHtml}
                        ${desc}
                        <span class="tx-date">${new Date(tx.date).toLocaleString(getLocale(), {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                        ${statusBadge}
                    </div>
                </div>
                <div class="tx-amount-box">
                    <div class="tx-amount ${amountClass}">${symbol}${formatNumber(tx.amount, 2, 2)} TRY</div>
                </div>
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
        if (createdEl) createdEl.textContent = currentUser.createdAt ? formatDate(currentUser.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

        // Balance
        const accounts = await fetchJsonOrThrow('/api/accounts');
        const directoryUsers = await fetchJsonOrThrow('/api/users').catch(() => []);
        buildAccountDirectory(accounts, directoryUsers);
        const userAccount = accounts.find(a => a.userId === currentUser.id);
        
        const balEl = getEl('infoBalance');
        const curEl = getEl('infoCurrency');
        if (balEl) balEl.textContent = userAccount
            ? `${formatNumber(presentationBalance(userAccount.balance, { ...currentUser, accountNumber: userAccount.accountNumber }), 2, 2)} TRY`
            : `0.00 TRY`;
        if (curEl) curEl.textContent = userAccount?.currency || 'TRY';

        // Transaction history
        if (userAccount) {
            const transactions = await fetchJsonOrThrow('/api/transactions');
            const userTxs = transactions.filter(t => t.senderAccountId === userAccount.id || t.receiverAccountId === userAccount.id);
            
            const historyEl = getEl('infoTransactionHistory');
            if (historyEl) updateTransactionList(userTxs, userAccount.id, historyEl);
            
            const txCountEl = getEl('infoTxCount');
            if (txCountEl) txCountEl.textContent = userTxs.length;
        }
    } catch (err) {
        console.error('Account info error:', err);
        showToast(lang === 'tr' ? 'Hesap bilgileri yuklenemedi.' : 'Could not load account details.', 'error');
    }
}

// ========== ADMIN PANEL ==========
function formatAdminParty(name, account) {
    const n = (name || '').trim().replace(/\s+/g, ' ');
    const a = (account || '').trim();
    if (n && a) return `${n} · ${a}`;
    return n || a || '-';
}

function localizeAdminTxType(type, lang) {
    const t = (type || '').toLowerCase();
    if (t === 'deposit') return lang === 'tr' ? 'Para Yatırma' : 'Deposit';
    if (t === 'transfer') return lang === 'tr' ? 'Transfer' : 'Transfer';
    return type || '-';
}

function localizeAdminStatus(status, lang) {
    const s = (status || '').toString();
    const map = {
        Pending: lang === 'tr' ? 'Beklemede' : 'Pending',
        Completed: lang === 'tr' ? 'Tamamlandı' : 'Completed',
        Failed: lang === 'tr' ? 'Başarısız' : 'Failed',
        Cancelled: lang === 'tr' ? 'İptal' : 'Cancelled'
    };
    return map[s] || s;
}

/** Admin tablolarında gösterilecek açıklama (eski test/otomatik metinleri temizler). */
function formatAdminDescription(tx, lang) {
    const d = (tx.description || '').trim();
    if (!d) return '—';
    if (/^transfer\s*:/i.test(d)) return '—';
    const lower = d.toLowerCase();
    if (lower === 'deposit' || lower === 'para yatırma') return lang === 'tr' ? 'Para yatırma' : 'Deposit';
    if (lower === 'transfer') return lang === 'tr' ? 'Havale' : 'Transfer';
    if (lower === 'borç') return lang === 'tr' ? 'Borç ödemesi' : 'Debt payment';
    if (lower === 'final smoke') return lang === 'tr' ? 'Test işlemi' : 'Test transaction';
    if (/seed/i.test(d)) return lang === 'tr' ? 'Sistem kaydı' : 'System record';
    return d;
}

function formatAdminSenderCell(tx, lang) {
    const typeKey = (tx.type || '').toLowerCase();
    if (typeKey === 'deposit') {
        return lang === 'tr' ? '—' : '—';
    }
    return formatAdminParty(tx.senderName, tx.senderAccount);
}

function formatAdminReceiverCell(tx, lang) {
    return formatAdminParty(tx.receiverName, tx.receiverAccount);
}

/** Sunum bakiyesi — yalnızca ekranda; transfer/ledger dokunulmaz */
function presentationBalance(rawBalance, ctx) {
    const email = String(ctx?.email ?? ctx?.Email ?? currentUser?.email ?? '').toLowerCase();
    const role = String(ctx?.role ?? ctx?.Role ?? currentUser?.role ?? '');
    const accNo = String(ctx?.accountNumber ?? ctx?.AccountNumber ?? currentUser?.accountNumber ?? '').toUpperCase();
    if (role === 'Admin' || email === 'cavit@vireon.com' || accNo === 'VR-99999') return 100000;
    if (email === 'enes@vireon.com' || accNo === 'VR-88888') return 50000;
    const n = Number(ctx?.balance ?? ctx?.Balance ?? rawBalance);
    return Number.isFinite(n) ? n : 0;
}

async function loadAdminPanel() {
    if (!currentUser || currentUser.role !== 'Admin') return;

    const lang = window.currentLang || 'en';
    const setVal = (id, val) => { const el = getEl(id); if (el) el.textContent = val; };
    const usersBody = getEl('adminUsersBody');
    const txBody = getEl('adminTxBody');
    const fraudBody = getEl('adminFraudBody');
    const updatedEl = getEl('adminLastUpdated');

    if (updatedEl) {
        updatedEl.textContent = lang === 'tr' ? 'Veriler yükleniyor...' : 'Loading data...';
    }
    if (usersBody) usersBody.innerHTML = '';
    if (txBody) txBody.innerHTML = '';
    if (fraudBody) fraudBody.innerHTML = '';

    try {
        const [stats, users, txs, fraudLogs, accountsForFraud] = await Promise.all([
            fetchJsonOrThrow('/api/users/admin-stats'),
            fetchJsonOrThrow('/api/users/admin-users'),
            fetchJsonOrThrow('/api/users/admin-transactions'),
            fetchJsonOrThrow('/api/fraudlogs').catch(() => []),
            fetchJsonOrThrow('/api/accounts').catch(() => [])
        ]);

        setVal('adminTotalUsers', stats.totalUsers ?? 0);
        setVal('adminTotalAccounts', stats.totalAccounts ?? 0);
        setVal('adminTotalTx', stats.totalTransactions ?? 0);
        setVal('adminTotalDeposits', stats.totalDeposits ?? 0);
        setVal('adminTotalTransfers', stats.totalTransfers ?? 0);
        setVal('adminTotalFraud', stats.totalFraudLogs ?? 0);
        setVal('adminTotalLedger', stats.totalLedgerEntries ?? 0);

        if (updatedEl && stats.serverTime) {
            const when = new Date(stats.serverTime).toLocaleString(getLocale(), {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            updatedEl.textContent = lang === 'tr'
                ? `Son güncelleme: ${when}`
                : `Last updated: ${when}`;
        }

        if (usersBody) {
            if (!users.length) {
                usersBody.innerHTML = `<tr><td colspan="7" class="tx-empty">${lang === 'tr' ? 'Kullanıcı bulunamadı.' : 'No users found.'}</td></tr>`;
                setVal('adminTotalBalance', `₺${formatNumber(stats.totalBalance ?? 0, 2, 2)}`);
            } else {
                const displayTotalBalance = users.reduce((sum, u) => sum + presentationBalance(u.balance ?? u.Balance, u), 0);
                setVal('adminTotalBalance', `₺${formatNumber(displayTotalBalance, 2, 2)}`);

                usersBody.innerHTML = users.map((u, idx) => {
                    const roleKey = (u.role || u.Role || 'User').toLowerCase();
                    const roleLabel = (u.role || u.Role) === 'Admin'
                        ? (lang === 'tr' ? 'Admin' : 'Admin')
                        : (lang === 'tr' ? 'Kullanıcı' : 'User');
                    const displayBal = presentationBalance(u.balance ?? u.Balance, u);
                    return `
                <tr title="DB ID: ${u.id}">
                    <td class="col-seq">${idx + 1}</td>
                    <td class="col-party">${escapeHtml(u.name)} ${escapeHtml(u.surname || '')}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>${escapeHtml(u.accountNumber || '-')}</td>
                    <td class="bal-text">₺${formatNumber(displayBal, 2, 2)}</td>
                    <td>${u.transactionCount ?? 0}</td>
                    <td><span class="role-badge role-${roleKey}">${roleLabel}</span></td>
                </tr>`;
                }).join('');
            }
        } else {
            setVal('adminTotalBalance', `₺${formatNumber(stats.totalBalance ?? 0, 2, 2)}`);
        }

        if (txBody) {
            if (!txs.length) {
                txBody.innerHTML = `<tr><td colspan="8" class="tx-empty">${lang === 'tr' ? 'İşlem kaydı yok.' : 'No transactions found.'}</td></tr>`;
            } else {
                txBody.innerHTML = txs.map((tx, idx) => {
                    const typeKey = (tx.type || 'transfer').toLowerCase();
                    const statusKey = (tx.status || 'Pending').toString();
                    const desc = formatAdminDescription(tx, lang);
                    return `
                <tr title="DB ID: ${tx.id}">
                    <td class="col-seq">${idx + 1}</td>
                    <td><span class="type-badge type-${typeKey}">${localizeAdminTxType(tx.type, lang)}</span></td>
                    <td class="col-party">${escapeHtml(formatAdminSenderCell(tx, lang))}</td>
                    <td class="col-party">${escapeHtml(formatAdminReceiverCell(tx, lang))}</td>
                    <td class="bal-text">₺${formatNumber(tx.amount, 2, 2)}</td>
                    <td>${escapeHtml(desc)}</td>
                    <td>${new Date(tx.date).toLocaleString(getLocale(), { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                    <td><span class="tx-status tx-status-${statusKey}">${localizeAdminStatus(statusKey, lang)}</span></td>
                </tr>`;
                }).join('');
            }
        }

        if (fraudBody) {
            const accNumById = {};
            accountsForFraud.forEach(a => { accNumById[a.id] = a.accountNumber; });

            if (!fraudLogs.length) {
                fraudBody.innerHTML = `<tr><td colspan="5" class="tx-empty">${lang === 'tr' ? 'Şüpheli işlem kaydı yok.' : 'No suspicious transactions.'}</td></tr>`;
            } else {
                fraudBody.innerHTML = fraudLogs.slice().reverse().map((f, idx) => `
                    <tr title="DB ID: ${f.id}">
                        <td class="col-seq">${idx + 1}</td>
                        <td>${escapeHtml(accNumById[f.accountId] || ('#' + f.accountId))}</td>
                        <td><span class="type-badge type-fraud">${escapeHtml(f.riskType || '-')}</span></td>
                        <td>${escapeHtml(f.description || '-')}</td>
                        <td>${new Date(f.logDate).toLocaleString(getLocale(), { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                    </tr>
                `).join('');
            }
        }

    } catch (err) {
        console.error('Admin panel error:', err);
        showToast(lang === 'tr' ? 'Admin panel verileri yüklenemedi.' : 'Could not load admin panel data.', 'error');
        if (updatedEl) {
            updatedEl.textContent = lang === 'tr' ? 'Veri yüklenemedi.' : 'Failed to load data.';
        }
    }
}
