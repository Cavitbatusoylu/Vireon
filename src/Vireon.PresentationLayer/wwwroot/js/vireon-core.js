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

const VIREON_BOOT_KEY = 'vireon-booted';
const VIREON_TRANSITION_KEY = 'vireon-nav-transition';

function isReturnVisit() {
    try { return sessionStorage.getItem(VIREON_BOOT_KEY) === '1'; } catch { return false; }
}

function hideLoadingScreen() {
    const ls = document.getElementById('loadingScreen');
    if (!ls) return;
    ls.classList.remove('show');
    ls.classList.add('hidden');
    ls.style.opacity = '0';
    ls.style.pointerEvents = 'none';
    ls.style.visibility = 'hidden';
    setTimeout(() => { ls.style.display = 'none'; }, 400);
}

function finishInitialBoot() {
    try { sessionStorage.setItem(VIREON_BOOT_KEY, '1'); } catch { /* ignore */ }
    hideLoadingScreen();
}

function navigateWithTransition(url) {
    try { sessionStorage.setItem(VIREON_TRANSITION_KEY, '1'); } catch { /* ignore */ }
    const overlay = document.getElementById('pageTransition');
    if (!overlay) {
        window.location.href = url;
        return;
    }
    overlay.classList.remove('is-entering');
    overlay.classList.add('is-exiting');
    setTimeout(() => { window.location.href = url; }, 480);
}

function isDashboardPath(pathname) {
    return /^\/Dashboard(\/|$)/i.test(pathname || '');
}

function isDashboardNavLink(anchor) {
    if (!anchor || !anchor.href) return false;
    try {
        const target = new URL(anchor.href, window.location.origin);
        return isDashboardPath(window.location.pathname) && isDashboardPath(target.pathname);
    } catch {
        return false;
    }
}

function isDashboardInternalArrival() {
    if (!isDashboardPath(window.location.pathname)) return false;
    try {
        const ref = document.referrer;
        if (!ref) return false;
        return isDashboardPath(new URL(ref).pathname);
    } catch {
        return false;
    }
}

function isInternalNavLink(anchor) {
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return false;
    if (anchor.dataset.noTransition != null) return false;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return false;
    try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return false;
        if (url.pathname === window.location.pathname && url.search === window.location.search && !url.hash) return false;
        return true;
    } catch {
        return false;
    }
}

function initPageTransitions() {
    const overlay = document.getElementById('pageTransition');
    const cameFromNav = (() => {
        try { return sessionStorage.getItem(VIREON_TRANSITION_KEY) === '1'; } catch { return false; }
    })();

    const dashboardInternal = isDashboardInternalArrival();

    if (cameFromNav && !dashboardInternal) {
        try { sessionStorage.removeItem(VIREON_TRANSITION_KEY); } catch { /* ignore */ }
        if (overlay) {
            overlay.classList.add('is-entering');
            setTimeout(() => overlay.classList.remove('is-entering'), 700);
        }
    } else if (cameFromNav) {
        try { sessionStorage.removeItem(VIREON_TRANSITION_KEY); } catch { /* ignore */ }
    }

    if ((isReturnVisit() || cameFromNav) && !dashboardInternal) {
        document.documentElement.classList.add('vireon-page-enter');
        setTimeout(() => document.documentElement.classList.remove('vireon-page-enter'), 880);
    }

    document.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (!isReturnVisit()) return;
        const anchor = e.target.closest('a[href]');
        if (!isInternalNavLink(anchor)) return;
        if (isDashboardNavLink(anchor)) return;
        e.preventDefault();
        navigateWithTransition(anchor.href);
    });
}

// İlk ziyaret: tam yükleme ekranı; sonraki sayfalar: hızlı geçiş animasyonu
(function() {
    if (isReturnVisit()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', hideLoadingScreen);
        } else {
            hideLoadingScreen();
        }
        return;
    }
    const clearLoader = () => finishInitialBoot();
    setTimeout(clearLoader, 1200);
    setTimeout(clearLoader, 2800);
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
    if (score <= 1) return { level: 'weak', label: t('Zayıf', 'Weak'), percent: 20 };
    if (score <= 2) return { level: 'fair', label: t('Orta', 'Fair'), percent: 40 };
    if (score <= 3) return { level: 'good', label: t('İyi', 'Good'), percent: 65 };
    if (score <= 4) return { level: 'strong', label: t('Güçlü', 'Strong'), percent: 85 };
    return { level: 'excellent', label: t('Mükemmel', 'Excellent'), percent: 100 };
}

function refreshPasswordStrengthMeters() {
    document.querySelectorAll('.password-strength-meter').forEach(meter => {
        const group = meter.closest('.form-group');
        const input = group?.querySelector('input[type="password"], input[type="text"]');
        if (input) updatePasswordStrengthMeter(input);
    });
}

function initFormValidation() {
    const loginEmail = getEl('loginEmail');
    const loginPassword = getEl('loginPassword');
    const regName = getEl('registerName');
    const regSurname = getEl('registerSurname');
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
    [regName, regSurname, regEmail, regPassword, regConfirm].forEach(el => {
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
const lang = () => window.currentLang || 'en';
const t = (tr, en) => (lang() === 'tr' ? tr : en);
const getLocale = () => (lang() === 'tr' ? 'tr-TR' : 'en-US');
const pickApiMessage = (payload, fallbackTr, fallbackEn) => {
   if (!payload) return t(fallbackTr, fallbackEn);
   return lang() === 'tr'
      ? (payload.mesaj || payload.message || t(fallbackTr, fallbackEn))
      : (payload.message || payload.mesaj || t(fallbackTr, fallbackEn));
};
const formatNumber = (value, minimumFractionDigits = 2, maximumFractionDigits = 2) =>
   new Intl.NumberFormat(getLocale(), { minimumFractionDigits, maximumFractionDigits }).format(Number(value) || 0);
const formatDate = (value, options) => new Date(value).toLocaleDateString(getLocale(), options);

// Backend TransactionManager ile aynı simülasyon kurları (TRY baz)
