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
            if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email.toLowerCase());
            else clearRememberedEmail();
            saveSession(user, remember);
            resetSessionTimer();

            showToast(lang === 'tr' ? `Hoş geldin ${user.name}!` : `Welcome ${user.name}!`, 'success');
            if (typeof closeLoginModal === 'function') closeLoginModal();
            updateNavbarForLoggedInUser();
            setTimeout(() => { window.location.href = '/Dashboard/Overview'; }, 300);
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
    
    const name = getEl('registerName')?.value?.trim();
    const surname = getEl('registerSurname')?.value?.trim();
    const email = getEl('registerEmail')?.value?.trim();
    const password = getEl('registerPassword')?.value;
    const confirmPassword = getEl('registerConfirmPassword')?.value;
    
    if (!name || !surname || !email || !password || !confirmPassword) {
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
    
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<span class="loader-tiny"></span>'; btn.disabled = true; }
    
    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, surname, email: email.toLowerCase(), password })
        });
        
        if (response.ok) {
            const result = await response.json();
            const accountNo = result.accountNumber || result.AccountNumber || '';
            showToast(
                lang === 'tr'
                    ? `Kayıt başarılı! Hesap No: ${accountNo}`
                    : `Account created! Account No: ${accountNo}`,
                'success'
            );
            closeRegisterModal();

            // Admin açıkken kayıt: listeyi yenile (işlem geçmişi değişmez)
            if (currentUser?.role === 'Admin') {
                loadAdminPanel();
                if (getEl('dash-db-explorer')?.classList.contains('active')) fetchDatabaseStats();
            }

            // Yeni kullanıcıyı otomatik giriş yap (dashboard'da görünsün)
            if (!currentUser) {
                try {
                    const loginRes = await fetch('/api/users/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    if (loginRes.ok) {
                        currentUser = await loginRes.json();
                        loginAttempts.count = 0;
                        saveSession(currentUser, !!getEl('rememberMe')?.checked);
                        resetSessionTimer();
                        updateNavbarForLoggedInUser();
                        showToast(lang === 'tr' ? `Hoş geldin ${currentUser.name}!` : `Welcome ${currentUser.name}!`, 'success');
                        setTimeout(() => { window.location.href = '/Dashboard/Overview'; }, 300);
                        return;
                    }
                } catch (e) {
                    console.warn('Auto-login after register failed:', e);
                }
            }

            setTimeout(() => { window.location.href = '/Account/Login'; }, 800);
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
    const page = getVireonPage();
    const isHome = page === 'home';
    const onDashboard = document.body.classList.contains('dashboard-active') || page.startsWith('dashboard-');
    const backBtn = getEl('backToHomeBtn');
    const dashBtn = getEl('dashboardNavBtn');
    if (backBtn) {
        if (!isHome) {
            backBtn.style.display = 'inline-flex';
        } else {
            backBtn.style.display = (currentUser && onDashboard) ? 'inline-flex' : 'none';
        }
    }
    if (dashBtn) {
        dashBtn.style.display = (currentUser && !onDashboard) ? 'inline-flex' : 'none';
    }
    document.body.classList.toggle('nav-landing-mode', !!(currentUser && !onDashboard && isHome));
    document.body.classList.toggle('vireon-logged-in', !!currentUser);
    syncHomeAuthCard();
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
    const dbExplorerMenu = document.querySelector('.sidebar-menu li a[href*="DbExplorer"]')?.closest('li')
        || document.querySelector('.sidebar-menu li[data-dash="dash-db-explorer"]');
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
    if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
    currentUser = null;
    clearSession();
    document.body.classList.remove('admin-mode');
    resetAllApplicationUi();

    showToast(lang === 'tr' ? 'Çıkış yapıldı.' : 'Logged out successfully.', 'info');
    updateNavbarForLoggedOutUser();
    window.location.href = '/Account/Login';
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
            btn.setAttribute('aria-label', show ? t('Şifreyi gizle', 'Hide password') : t('Şifreyi göster', 'Show password'));
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
                transferReceiverCurrency = null;
                hint.textContent = lang === 'tr' ? '⚠ Hesap bulunamadı' : '⚠ Account not found';
                hint.className = 'receiver-name-hint error';
                updateTransferFxPreview();
                return;
            }
            const u = await res.json();
            const fullName = `${u.name || ''} ${u.surname || ''}`.trim();
            const accMeta = accountByNumber[acc];
            transferReceiverCurrency = accMeta?.currency || 'TRY';
            const curLabel = transferReceiverCurrency;
            if (fullName) {
                hint.textContent = `✓ ${fullName} · ${curLabel}`;
            } else {
                hint.textContent = curLabel ? `✓ ${curLabel}` : '';
            }
            hint.className = 'receiver-name-hint ok';
            updateTransferFxPreview();
        } catch {
            transferReceiverCurrency = null;
            hint.textContent = '';
            hint.className = 'receiver-name-hint';
            updateTransferFxPreview();
        }
    }, 350);
}

function initTransferFxUi() {
   const amountEl = getEl('transferAmount');
   const targetEl = getEl('transferTarget');
   const simEl = getEl('transferFxSimCurrency');
   if (amountEl && !amountEl.dataset.fxReady) {
      amountEl.dataset.fxReady = '1';
      amountEl.addEventListener('input', updateTransferFxPreview);
   }
   if (targetEl && !targetEl.dataset.fxReady) {
      targetEl.dataset.fxReady = '1';
      targetEl.addEventListener('input', () => {
         if (!targetEl.value.trim()) transferReceiverCurrency = null;
      });
   }
   if (simEl && !simEl.dataset.fxReady) {
      simEl.dataset.fxReady = '1';
      simEl.addEventListener('change', updateTransferFxPreview);
   }
   renderExchangeRatesPanel();
   updateTransferFxPreview();
}

// ========== LANGUAGE CHANGE HOOK ==========
// switchLang (index.html) statik [data-tr] öğelerini günceller; JS ile üretilen
// içerik (işlem listeleri, admin tabloları) burada yeniden render edilir.
window.onLanguageChange = function () {
    try {
        renderAiHistoryPanel();
        refreshPasswordStrengthMeters();
        const transferTarget = getEl('transferTarget');
        if (transferTarget && transferTarget.value.trim()) lookupReceiverName();
        updateBalanceCurrencyDisplay(currentAccountCurrency);
        updateTransferFxPreview();
        updateDepositFxPreview();
        if (getVireonPage() === 'home') {
            initHomeStatusRotator();
            syncHomeAuthCard();
            balanceHomeNavCardTypography();
        }
        balanceSectionCardTypography();
        balanceArchCodeBlockTypography();
        if (currentUser) {
            fetchDashboardData();
            if (currentUser.role === 'Admin') loadAdminPanel();
            const accInfo = getEl('dash-account-info');
            if (accInfo && accInfo.classList.contains('active')) loadAccountInfo();
        }
    } catch (e) { console.error('Language refresh error:', e); }
};

// ========== FULL APPLICATION RESET (giriş / çıkış / yenileme) ==========
function clearAccountInfoDisplay() {
    const placeholders = {
        infoAccountNumber: '-',
        infoFullName: '-',
        infoEmail: '-',
        infoCreatedAt: '-',
        infoCurrency: 'TRY',
        infoTxCount: '0',
        infoBalance: '₺0.00'
    };
    Object.entries(placeholders).forEach(([id, val]) => {
        const el = getEl(id);
        if (el) el.textContent = val;
    });
    const hist = getEl('infoTransactionHistory');
    if (hist) hist.innerHTML = `<p class="tx-empty">${t('Yükleniyor...', 'Loading...')}</p>`;
}

function clearAdminPanelDisplay() {
    const loading = t('Veriler yükleniyor...', 'Loading data...');
    const statDefaults = {
        adminTotalUsers: '0',
        adminTotalAccounts: '0',
        adminTotalTx: '0',
        adminTotalDeposits: '0',
        adminTotalTransfers: '0',
        adminTotalBalance: '₺0',
        adminTotalFraud: '0',
        adminTotalLedger: '0'
    };
    Object.entries(statDefaults).forEach(([id, val]) => {
        const el = getEl(id);
        if (el) el.textContent = val;
    });
    const updatedEl = getEl('adminLastUpdated');
    if (updatedEl) updatedEl.textContent = loading;
    ['adminUsersBody', 'adminTxBody', 'adminFraudBody'].forEach(id => {
        const el = getEl(id);
        if (el) el.innerHTML = '';
    });
}

function clearDbExplorerDisplay() {
    const container = getEl('dbStatsContainer');
    if (container) container.innerHTML = '';
    const tbody = document.querySelector('#dbUsersTable tbody');
    if (tbody) tbody.innerHTML = '';
}

function clearQrDisplay() {
    const lbl = getEl('qrAccountLabel');
    if (lbl) lbl.textContent = '-';
    const img = getEl('qrPaymentImg');
    if (img) {
        img.removeAttribute('src');
        img.alt = 'QR Code';
    }
}

function clearAllFormInputs() {
    const roots = ['#dashboard', '#loginModal', '#registerModal', '#forgotPasswordModal'];
    roots.forEach(selector => {
        const root = document.querySelector(selector);
        if (!root) return;
        root.querySelectorAll('input, textarea, select').forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = false;
            } else if (el.type !== 'file' && el.type !== 'button' && el.type !== 'submit') {
                el.value = '';
            }
        });
    });

    const deleteBtn = getEl('deleteAccountBtn');
    if (deleteBtn) deleteBtn.disabled = true;
    const deleteEmailConfirm = getEl('deleteAccountEmailConfirm');
    if (deleteEmailConfirm) deleteEmailConfirm.placeholder = '';

    const receiverHint = getEl('transferReceiverName');
    if (receiverHint) {
        receiverHint.textContent = '';
        receiverHint.className = 'receiver-name-hint';
    }

    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.querySelectorAll('.field-error-msg').forEach(el => el.remove());
}

function resetAiChatUi() {
    const dashWelcome = t(
        'Merhaba! Ben Neon. Senin bankacılık işlemlerini analiz ediyorum. Sana nasıl yardımcı olabilirim?',
        'Hi! I\'m Neon. I analyze your banking activity. How can I help you?'
    );
    const floatWelcome = t(
        'Merhaba! Ben Neon. Bankacılık işlemlerinizde size nasıl yardımcı olabilirim?',
        'Hello! I\'m Neon. How can I assist you with your banking transactions today?'
    );

    const aiContent = getEl('aiChatContent');
    if (aiContent) {
        aiContent.innerHTML = `<div class="bot-bubble"><div class="bubble-icon">\u{1F916}</div><div class="bubble-text">${escapeHtml(dashWelcome)}</div></div>`;
    }
    const aiBody = getEl('aiChatBody');
    if (aiBody) {
        aiBody.innerHTML = `<div class="ai-message bot"><p>${escapeHtml(floatWelcome)}</p></div>`;
    }

    chatHistory = [];
    try { localStorage.removeItem(AI_HISTORY_KEY); } catch (_) { /* ignore */ }
    persistAiChatHistoryToStorage();
    renderAiHistoryPanel();
}

function clearLimitsDisplay() {
    ['maxLimit', 'usedLimit', 'remainingLimit'].forEach(id => {
        const el = getEl(id);
        if (el) el.textContent = '0';
    });
    const pctEl = getEl('limitUsagePct');
    if (pctEl) pctEl.textContent = `0% ${t('kullanıldı', 'used')}`;
    const fillEl = getEl('limitProgressFill');
    if (fillEl) fillEl.style.width = '0%';
    const labelEl = getEl('limitProgressLabel');
    if (labelEl) labelEl.textContent = `₺0 / ₺0`;
    const resetEl = getEl('lastResetDate');
    if (resetEl) resetEl.textContent = '—';
    const limitForm = getEl('limitEditForm');
    if (limitForm) limitForm.style.display = 'none';
    const newMax = getEl('newMaxLimit');
    if (newMax) newMax.value = '';
}

function resetAllApplicationUi() {
    clearTimeout(_receiverLookupTimer);
    _receiverLookupTimer = null;
    accountDirectory = {};
    accountByNumber = {};
    transferReceiverCurrency = null;
    currentAccountCurrency = 'TRY';

    if (balanceChart) { balanceChart.destroy(); balanceChart = null; }
    if (expensePieChart) { expensePieChart.destroy(); expensePieChart = null; }
    if (overviewChartInstance) { overviewChartInstance.destroy(); overviewChartInstance = null; }

    clearAllFormInputs();
    clearLimitsDisplay();
    clearAccountInfoDisplay();
    clearAdminPanelDisplay();
    clearDbExplorerDisplay();
    clearQrDisplay();

    const balEl = getEl('dashBalance');
    const accEl = getEl('dashAccountNo');
    const curEl = getEl('dashCurrency');
    if (balEl) balEl.textContent = '0.00';
    if (accEl) accEl.textContent = '**** ****';
    if (curEl) curEl.textContent = 'TRY';
    const symEl = getEl('dashBalanceSymbol');
    if (symEl) symEl.textContent = '₺';
    const labelEl = getEl('transferAmountLabel');
    if (labelEl) labelEl.textContent = t('Miktar (₺TRY)', 'Amount (₺TRY)');
    renderExchangeRatesPanel();
    updateTransferFxPreview();

    const loadingMsg = t('Yükleniyor...', 'Loading...');
    const overviewList = getEl('overviewTransactions');
    const historyList = getEl('fullTransactionHistory');
    if (overviewList) overviewList.innerHTML = `<p class="tx-empty">${loadingMsg}</p>`;
    if (historyList) historyList.innerHTML = `<p class="tx-empty">${loadingMsg}</p>`;

    resetAiChatUi();

    const aiWin = getEl('aiChatWindow');
    const aiLauncher = getEl('aiLauncher');
    if (aiWin) {
        aiWin.classList.remove('active');
        aiWin.setAttribute('aria-hidden', 'true');
    }
    if (aiLauncher) aiLauncher.setAttribute('aria-expanded', 'false');
    const historyPanel = getEl('floatingAiHistoryPanel');
    if (historyPanel) {
        historyPanel.classList.remove('is-open');
        historyPanel.setAttribute('aria-hidden', 'true');
    }
    const historyBtn = getEl('floatingAiHistoryBtn');
    if (historyBtn) historyBtn.setAttribute('aria-expanded', 'false');

    if (getEl('loginModal')) closeLoginModal();
    if (getEl('registerModal')) closeRegisterModal();
    if (getEl('forgotPasswordModal')) closeForgotPasswordModal();
    document.body.style.overflow = '';

    window.scrollTo(0, 0);
}

function resetDashboardState() {
    resetAllApplicationUi();
}

