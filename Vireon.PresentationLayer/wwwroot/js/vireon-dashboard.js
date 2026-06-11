// ========== DASHBOARD NAVIGATION ==========
function switchDashSection(targetId) {
   const url = DASHBOARD_ROUTES[targetId];
   if (url) {
      window.location.href = url;
      return;
   }
   document.querySelectorAll('.dash-sub-section').forEach(sec => sec.classList.remove('active'));
   const target = getEl(targetId);
   if (target) target.classList.add('active');
}

function populateProfileSettingsFields() {
   if (!currentUser) return;

   const sensitiveIds = [
      'deleteAccountPassword', 'deleteAccountEmailConfirm', 'deleteAccountPhrase',
      'profileResetNewPwd', 'profileResetConfirmPwd', 'pwdCurrent', 'pwdNew', 'pwdConfirm'
   ];
   sensitiveIds.forEach(id => {
      const el = getEl(id);
      if (el) el.value = '';
   });
   const deleteAck = getEl('deleteAccountAck');
   if (deleteAck) deleteAck.checked = false;
   const deleteBtn = getEl('deleteAccountBtn');
   if (deleteBtn) deleteBtn.disabled = true;

   const pn = getEl('profileName');
   const ps = getEl('profileSurname');
   const pe = getEl('profileEmail');
   if (pn) pn.value = currentUser.name || '';
   if (ps) ps.value = currentUser.surname || '';
   if (pe) pe.value = currentUser.email || '';

   const resetEmail = getEl('profileResetEmail');
   const resetAcc = getEl('profileResetAccountNo');
   if (resetEmail) resetEmail.value = currentUser.email || '';
   if (resetAcc) resetAcc.value = currentUser.accountNumber || getEl('dashAccountNo')?.textContent?.trim() || '';

   const deleteEmailHint = getEl('deleteAccountEmailConfirm');
   if (deleteEmailHint) {
      deleteEmailHint.value = '';
      deleteEmailHint.placeholder = currentUser.email || '';
   }
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
        indexAccountsByNumber(accounts);
        const userAccount = accounts.find(a => accountUserId(a) === currentUserId());
        
        if (userAccount) {
            const rawBalance = accountBalance(userAccount);
            const displayBalance = availableBalance(rawBalance);
            const userCurrency = userAccount.currency ?? userAccount.Currency ?? 'TRY';
            currentUser = { ...currentUser, balance: rawBalance, accountNumber: userAccount.accountNumber ?? userAccount.AccountNumber, currency: userCurrency };
            persistCurrentUser();
            // Update balance display
            const balEl = getEl('dashBalance');
            const accEl = getEl('dashAccountNo');
            
            if (balEl) balEl.textContent = formatNumber(displayBalance, 2, 2);
            if (accEl) accEl.textContent = userAccount.accountNumber ?? userAccount.AccountNumber;
            updateBalanceCurrencyDisplay(userCurrency);
            renderBalanceFxBreakdown(displayBalance);

            // Fetch transactions
            const transactions = await fetchJsonOrThrow('/api/transactions');
            const acctId = userAccount.id ?? userAccount.Id;
            const userTxs = transactions.filter(t => txSenderId(t) === acctId || txReceiverId(t) === acctId);
            
            // Update overview transaction list
            const overviewList = getEl('overviewTransactions');
            if (overviewList) updateTransactionList(userTxs, acctId, overviewList);
            
            // Update full history
            const historyList = getEl('fullTransactionHistory');
            if (historyList) updateTransactionList(userTxs, acctId, historyList);
            
            initModernDashboardCharts(userTxs, acctId, displayBalance);
            initOverviewChart(userTxs, acctId);
            refreshQrCode();

            // Update daily limits
            try {
                const limits = await fetchJsonOrThrow('/api/dailylimits');
                const userLimit = limits.find(l => (l.userId ?? l.UserId) === currentUserId());
                if (userLimit) updateLimitsDisplay(userLimit);
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
        populateProfileSettingsFields();

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

    const sorted = [...txs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const timeline = buildBalanceTimeline(sorted, accountId, Number(currentBalance) || 0);
    const labels = timeline.map(p => formatDate(p.date, { day: 'numeric', month: 'short' }));
    const dataPoints = timeline.map(p => p.balance);

    balanceChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : [t('Başlangıç', 'Start')],
            datasets: [{
                label: t('Bakiye', 'Balance'),
                data: dataPoints.length ? dataPoints : [currentBalance],
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
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' },
                    ticks: { color: document.documentElement.getAttribute('data-theme') === 'light' ? '#64748b' : 'rgba(255,255,255,0.6)' }
                },
                x: {
                    ticks: { color: document.documentElement.getAttribute('data-theme') === 'light' ? '#64748b' : 'rgba(255,255,255,0.6)' }
                }
            }
        }
    });

    const sent = sorted
        .filter(t => txSenderId(t) === accountId && txReceiverId(t) !== accountId)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const received = sorted
        .filter(t => txReceiverId(t) === accountId && txSenderId(t) !== accountId)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const deposits = sorted
        .filter(t => txSenderId(t) === accountId && txReceiverId(t) === accountId)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const incoming = received + deposits;
    const outgoing = sent;
    const pieLabels = [t('Giden', 'Outgoing'), t('Gelen', 'Incoming')];
    const pieData = incoming === 0 && outgoing === 0 ? [1, 0] : [outgoing, incoming];

    expensePieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: pieLabels,
            datasets: [{
                data: pieData,
                backgroundColor: ['#e11d48', '#00b4d8'],
                hoverOffset: 4,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: document.documentElement.getAttribute('data-theme') === 'light' ? '#334155' : '#fff', boxWidth: 10 } } }
        }
    });
}

function buildBalanceTimeline(sortedTxs, accountId, currentBalance) {
    if (!sortedTxs.length) {
        return [{ date: new Date(), balance: currentBalance }];
    }
    const points = [];
    let running = currentBalance;
    for (let i = sortedTxs.length - 1; i >= 0; i--) {
        const t = sortedTxs[i];
        points.unshift({ date: t.date, balance: running });
        const sender = txSenderId(t);
        const receiver = txReceiverId(t);
        const amt = Number(t.amount || 0);
        const isDeposit = sender === receiver;
        if (isDeposit && sender === accountId) running -= amt;
        else if (sender === accountId && receiver !== accountId) running += amt;
        else if (receiver === accountId && sender !== accountId) running -= amt;
    }
    return points;
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
                <div class="db-stat-mini glass-card"><span>${window.currentLang === 'tr' ? 'Kullanıcı' : 'Users'}</span><strong>${users.length}</strong></div>
                <div class="db-stat-mini glass-card"><span>${window.currentLang === 'tr' ? 'Hesap' : 'Accounts'}</span><strong>${accounts.length}</strong></div>
                <div class="db-stat-mini glass-card"><span>${window.currentLang === 'tr' ? 'İşlem' : 'Transactions'}</span><strong>${transactions.length}</strong></div>
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
                const sorted = [...users].sort((a, b) => (b.id ?? b.Id ?? 0) - (a.id ?? a.Id ?? 0));
                tbody.innerHTML = sorted.slice(0, 20).map((u, idx) => {
                    const uid = u.id ?? u.Id;
                    const acc = accounts.find(a => (a.userId ?? a.UserId) === uid);
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
function formatBotMessageHtml(text) {
   if (!text) return '';
   const lines = String(text).split('\n').map(l => l.trim()).filter(Boolean);
   const bulletLines = lines.filter(l => /^[â€¢\-\*]/.test(l) || l.includes(':**') || (l.startsWith('â€¢')));
   if (bulletLines.length >= 2 || (lines.length >= 3 && bulletLines.length >= 1)) {
      const items = lines.map(line => {
         let clean = line.replace(/^[â€¢\-\*]\s*/, '');
         clean = clean.replace(/\*\*([^*]+)\*\*:\s*/g, '$1: ');
         clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');
         return `<li>${escapeHtml(clean)}</li>`;
      }).join('');
      return `<ul class="bot-help-list">${items}</ul>`;
   }
   return escapeHtml(text).replace(/\n/g, '<br>');
}

function persistAiChatHistoryToStorage() {
   try {
      localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(chatHistory.slice(-20)));
   } catch (_) { /* ignore quota */ }
}

function loadAiChatHistoryFromStorage() {
   try {
      const raw = localStorage.getItem(AI_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) chatHistory = parsed.slice(-20);
   } catch (_) {
      chatHistory = [];
   }
}

function renderAiHistoryPanel() {
   const lists = [getEl('aiChatHistoryList'), getEl('floatingAiHistoryList')];
   const empty = t('Henüz mesaj yok.', 'No messages yet.');
   const html = chatHistory.length
      ? chatHistory.slice(-10).reverse().map(entry => {
         const role = entry.role === 'user' ? t('Siz', 'You') : 'Neon';
         const preview = escapeHtml(String(entry.content || ''));
         return `<li><span class="ai-history-role">${role}</span><span class="ai-history-text">${preview}</span></li>`;
      }).join('')
      : `<li class="ai-history-empty">${empty}</li>`;
   lists.forEach(list => { if (list) list.innerHTML = html; });
}

function clearAiChatHistory() {
   chatHistory = [];
   persistAiChatHistoryToStorage();
   renderAiHistoryPanel();
   showToast(t('Sohbet geçmişi temizlendi.', 'Chat history cleared.'), 'info');
}

function pushAiChatExchange(userText, botText) {
   chatHistory.push({ role: 'user', content: userText });
   chatHistory.push({ role: 'assistant', content: botText });
   if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
   persistAiChatHistoryToStorage();
   renderAiHistoryPanel();
}

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
      } else {
         const historyPanel = getEl('floatingAiHistoryPanel');
         if (historyPanel) historyPanel.classList.remove('is-open');
         const historyBtn = getEl('floatingAiHistoryBtn');
         if (historyBtn) historyBtn.setAttribute('aria-expanded', 'false');
      }
   }
}

function toggleFloatingAiHistory() {
   const panel = getEl('floatingAiHistoryPanel');
   const btn = getEl('floatingAiHistoryBtn');
   if (!panel) return;
   const willOpen = !panel.classList.contains('is-open');
   panel.classList.toggle('is-open', willOpen);
   if (btn) btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
   if (willOpen) renderAiHistoryPanel();
   panel.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
}

async function sendAiMessage() {
    const input = getEl('aiInput');
    const display = getEl('aiChatContent');
    if (!input || !display || !input.value.trim()) return;

    const userText = input.value.trim();
    input.value = '';

    display.innerHTML += `<div class="user-bubble"><div class="bubble-text">${escapeHtml(userText)}</div></div>`;
    display.scrollTop = display.scrollHeight;

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText, history: chatHistory, lang: lang() })
        });
        const data = await response.json();
        const botResponse = data.response || t('Hata oluştu.', 'An error occurred.');

        pushAiChatExchange(userText, botResponse);

        display.innerHTML += `
            <div class="bot-bubble">
                <div class="bubble-icon">\u{1F916}</div>
                <div class="bubble-text">${formatBotMessageHtml(botResponse)}</div>
            </div>
        `;
    } catch (err) {
        display.innerHTML += `
            <div class="bot-bubble error">
                <div class="bubble-icon">⚠️</div>
                <div class="bubble-text">${escapeHtml(t('Neon AI şu an yanıt veremiyor.', 'Neon AI is unavailable right now.'))}</div>
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
         body: JSON.stringify({ message: message, history: chatHistory, lang: lang() })
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
         pushAiChatExchange(message, text);
      }
      const loadingEl = getEl(loadingId);
      if (loadingEl) {
         loadingEl.innerHTML = '';
         const wrap = document.createElement('div');
         wrap.innerHTML = formatBotMessageHtml(text);
         loadingEl.appendChild(wrap);
      }
   } catch (err) {
      const loadingEl = getEl(loadingId);
      if (loadingEl) loadingEl.innerHTML = `<p>${escapeHtml(t('Neon AI şu an yanıt veremiyor. Lütfen tekrar deneyin.', 'Neon AI is unavailable. Please try again.'))}</p>`;
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
   let accNo = accEl ? accEl.textContent.trim() : '';
   if (!accNo || accNo === '**** ****' || accNo === '-') {
      accNo = currentUser?.accountNumber ?? currentUser?.AccountNumber ?? '';
   }
   const payload = encodeURIComponent(`VIREON|PAY|TRY|IBAN|${accNo}|vireon.bank`);
   const img = getEl('qrPaymentImg');
   const lbl = getEl('qrAccountLabel');
   if (lbl) lbl.textContent = accNo || '-';
   if (img) {
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${payload}`;
      img.alt = 'QR Code';
   }
}

function initDepositFxUi() {
   const curEl = getEl('depositCurrency');
   if (curEl && !curEl.dataset.fxReady) {
      curEl.dataset.fxReady = '1';
      curEl.addEventListener('change', updateDepositFxPreview);
   }
   const amtEl = getEl('depositAmount');
   if (amtEl && !amtEl.dataset.fxReady) {
      amtEl.dataset.fxReady = '1';
      amtEl.addEventListener('input', updateDepositFxPreview);
   }
}

function updateDepositFxPreview() {
   const preview = getEl('depositFxPreview');
   const label = getEl('depositAmountLabel');
   const curEl = getEl('depositCurrency');
   const amtEl = getEl('depositAmount');
   if (!preview || !curEl) return;

   const depositCur = String(curEl.value || 'TRY').toUpperCase();
   if (label) {
      label.textContent = t(
         `Yatırılacak Tutar (${currencySymbol(depositCur)}${depositCur})`,
         `Amount (${currencySymbol(depositCur)}${depositCur})`
      );
   }

   const amount = parseFloat(amtEl?.value);
   if (!amount || amount <= 0) {
      preview.innerHTML = `<span class="fx-preview-muted">${t('Tutar girince TRY karşılığı burada görünür.', 'Enter an amount to see TRY equivalent.')}</span>`;
      preview.className = 'transfer-fx-preview';
      return;
   }

   if (depositCur === 'TRY') {
      preview.innerHTML = `<span class="fx-preview-same">${t('TRY hesabına doğrudan yatırım.', 'Direct deposit to TRY account.')}</span> <strong>${formatMoney(amount, 'TRY')}</strong>`;
      preview.className = 'transfer-fx-preview is-same';
      return;
   }

   const tryAmount = convertCurrencyClient(amount, depositCur, 'TRY');
   if (tryAmount == null) {
      preview.innerHTML = `<span class="fx-preview-muted">${t('Desteklenmeyen para birimi.', 'Unsupported currency.')}</span>`;
      preview.className = 'transfer-fx-preview';
      return;
   }

   preview.innerHTML = `<span>${formatMoney(amount, depositCur)}</span> → <strong>${formatMoney(tryAmount, 'TRY')}</strong> <span class="fx-preview-muted">(${t('simülasyon kuru', 'simulated rate')})</span>`;
   preview.className = 'transfer-fx-preview';
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
   const depositCur = String(getEl('depositCurrency')?.value || 'TRY').toUpperCase();
   const tryAmount = depositCur === 'TRY' ? amt : convertCurrencyClient(amt, depositCur, 'TRY');
   if (tryAmount == null || tryAmount <= 0) {
      showToast(lang === 'tr' ? 'Kur dönüşümü yapılamadı.' : 'Could not convert currency.', 'error');
      return;
   }
   const noteField = getEl('depositNote');
   const baseNote = noteField ? noteField.value : '';
   const fxNote = depositCur !== 'TRY'
      ? (lang === 'tr' ? ` (${formatMoney(amt, depositCur)} → TRY)` : ` (${formatMoney(amt, depositCur)} → TRY)`)
      : '';
   const note = (baseNote || (lang === 'tr' ? 'Para Yatırma' : 'Deposit')) + fxNote;
   
   const btn = document.querySelector('#dash-deposit .login-submit-btn');
   if (btn) btn.disabled = true;

   try {
       const accounts = await fetchJsonOrThrow('/api/accounts');
       const userAccount = accounts.find(a => accountUserId(a) === currentUserId());
       const accountNumber = userAccount?.accountNumber ?? userAccount?.AccountNumber ?? currentUser.accountNumber ?? currentUser.AccountNumber;
       if (!accountNumber) {
           showToast(lang === 'tr' ? 'Hesap numarası bulunamadı.' : 'Account number not found.', 'error');
           return;
       }
       const response = await fetch('/api/transfers/deposit', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               accountNumber: accountNumber,
               amount: tryAmount,
               description: note
           })
       });

       if (response.ok) {
           showToast(lang === 'tr' ? 'Para başarıyla yatırıldı!' : 'Deposit successful!', 'success');
           amtField.value = '';
           if (noteField) noteField.value = '';
           await fetchDashboardData();
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

async function handleProfileForgotPassword() {
   const lang = window.currentLang || 'en';
   submitForgotPassword({
      email: getEl('profileResetEmail')?.value?.trim(),
      accountNumber: getEl('profileResetAccountNo')?.value?.trim()?.toUpperCase(),
      newPassword: getEl('profileResetNewPwd')?.value,
      confirmPassword: getEl('profileResetConfirmPwd')?.value,
      lang,
      onSuccess: () => {
         const fields = ['profileResetNewPwd', 'profileResetConfirmPwd'];
         fields.forEach(id => { const el = getEl(id); if (el) el.value = ''; });
      }
   });
}

function initDeleteAccountGuard() {
   const ack = getEl('deleteAccountAck');
   const btn = getEl('deleteAccountBtn');
   if (!ack || !btn) return;
   ack.addEventListener('change', () => {
      btn.disabled = !ack.checked;
   });
}

async function handleDeleteAccount() {
   if (!currentUser) return;
   const lang = window.currentLang || 'en';
   const password = getEl('deleteAccountPassword')?.value;
   const confirmEmail = getEl('deleteAccountEmailConfirm')?.value?.trim();
   const confirmPhrase = getEl('deleteAccountPhrase')?.value?.trim();
   const ack = getEl('deleteAccountAck')?.checked;

   if (!password || !confirmEmail || !confirmPhrase) {
      showToast(lang === 'tr' ? 'Tüm alanları doldurun.' : 'Fill in all fields.', 'warning');
      return;
   }
   if (!ack) {
      showToast(lang === 'tr' ? 'Onay kutusunu işaretleyin.' : 'Check the confirmation box.', 'warning');
      return;
   }

   const expectedTr = 'HESABIMI SIL';
   const expectedEn = 'DELETE MY ACCOUNT';
   const phraseUpper = confirmPhrase.toUpperCase();
   if (phraseUpper !== expectedTr && phraseUpper !== expectedEn) {
      showToast(lang === 'tr' ? 'Onay metni hatalı. HESABIMI SIL yazın.' : 'Wrong phrase. Type DELETE MY ACCOUNT.', 'error');
      return;
   }

   const msgTr = `"${currentUser.email}" hesabını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`;
   const msgEn = `Permanently delete "${currentUser.email}"? This cannot be undone.`;
   if (!window.confirm(lang === 'tr' ? msgTr : msgEn)) return;

   const btn = getEl('deleteAccountBtn');
   if (btn) btn.disabled = true;

   try {
      const res = await fetch(`/api/users/${currentUser.id}/delete-account`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ password, confirmEmail, confirmPhrase })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
         showToast(data.message || (lang === 'tr' ? 'Hesap silindi.' : 'Account deleted.'), 'success');
         currentUser = null;
         clearSession();
         clearRememberedEmail();
         resetAllApplicationUi();
         updateNavbarForLoggedOutUser();
         backToMenu();
      } else {
         showToast(data.message || (lang === 'tr' ? 'Silme başarısız.' : 'Delete failed.'), 'error');
         if (btn && ack) btn.disabled = !ack.checked;
      }
   } catch (e) {
      console.error('Delete account error:', e);
      showToast(lang === 'tr' ? 'Sunucu hatası.' : 'Server error.', 'error');
      if (btn && ack) btn.disabled = !ack.checked;
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
            showToast(pickApiMessage(result, 'Transfer başarılı!', 'Transfer successful!'), 'success');
            
            const targetField = getEl('transferTarget');
            const amountField = getEl('transferAmount');
            const descField = getEl('transferDesc');
            if (targetField) targetField.value = '';
            if (amountField) amountField.value = '';
            if (descField) descField.value = '';
            transferReceiverCurrency = null;
            const receiverHint = getEl('transferReceiverName');
            if (receiverHint) { receiverHint.textContent = ''; receiverHint.className = 'receiver-name-hint'; }
            updateTransferFxPreview();
            
            await fetchDashboardData();
        } else {
            const error = await response.json().catch(() => ({}));
            const isBlocked = error.status === 'blocked';
            const riskPct = error.riskScore != null ? Math.round(Number(error.riskScore) * 100) : null;
            let msg = pickApiMessage(error, 'Transfer başarısız!', 'Transfer failed!');
            if (isBlocked && riskPct != null) {
                msg = lang === 'tr'
                    ? `${msg} (Risk: %${riskPct})`
                    : `${msg} (Risk: ${riskPct}%)`;
            }
            showToast(msg, isBlocked ? 'warning' : 'error');
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
   (users || []).forEach(u => { ownerByUserId[u.id ?? u.Id] = `${u.name || ''} ${u.surname || ''}`.trim(); });
   const dir = {};
   (accounts || []).forEach(a => {
      const id = a.id ?? a.Id;
      dir[id] = {
         number: a.accountNumber ?? a.AccountNumber,
         owner: ownerByUserId[a.userId ?? a.UserId] || '',
         currency: String(a.currency ?? a.Currency ?? 'TRY').toUpperCase()
      };
   });
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
      const isDeposit = txSenderId(tx) === txReceiverId(tx);
      const isOut = !isDeposit && txSenderId(tx) === accountId;
      const amountClass = isDeposit ? 'tx-in' : (isOut ? 'tx-out' : 'tx-in');
      const symbol = isDeposit ? '+' : (isOut ? '-' : '+');
      const label = isDeposit ? depositLabel : (isOut ? outLabel : inLabel);
      const icon = isDeposit ? '\u{1F4B0}' : (isOut ? '\u{1F4E4}' : '\u{1F4E5}');
      const statusRaw = typeof tx.status === 'number'
         ? ['Pending', 'Completed', 'Failed', 'Cancelled'][tx.status] || ''
         : (tx.status || tx.Status || 'Completed');
      const statusText = localizeAdminStatus(statusRaw, lang);
      const statusKey = String(statusRaw).replace(/\s+/g, '');
      const statusBadge = statusText ? `<span class="tx-status tx-status-${statusKey}">${statusText}</span>` : '';

      // Karşı taraf (hangi hesaba/kimden) bilgisini göster.
      let partyHtml = '';
      if (!isDeposit) {
         const partyId = isOut ? txReceiverId(tx) : txSenderId(tx);
         const party = accountDirectory[partyId];
         const partyLabel = isOut ? toLabel : fromLabel;
         if (party) {
            const who = party.owner ? `${party.owner} · ${party.number}` : party.number;
            partyHtml = `<span class="tx-detail">${partyLabel}: ${escapeHtml(who)}</span>`;
         }
      }

      // Kullanıcının girdiği özel açıklamayı göster (otomatik "Transfer: ..." metnini tekrarlama).
      const formattedDesc = formatTxDescription(tx.description, lang);
      const desc = formattedDesc ? `<span class="tx-detail">${escapeHtml(formattedDesc)}</span>` : '';

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
                    <div class="tx-amount ${amountClass}">${symbol}${formatNumber(tx.amount, 2, 2)} ${currentAccountCurrency}</div>
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
        const sender = txSenderId(t);
        const receiver = txReceiverId(t);
        const isDeposit = sender === receiver;
        if (isDeposit && sender === accountId) {
            incomingData.push(Number(t.amount || 0));
            outgoingData.push(0);
        } else if (sender === accountId && receiver !== accountId) {
            outgoingData.push(Number(t.amount || 0));
            incomingData.push(0);
        } else if (receiver === accountId && sender !== accountId) {
            incomingData.push(Number(t.amount || 0));
            outgoingData.push(0);
        } else {
            incomingData.push(0);
            outgoingData.push(0);
        }
    });

    if (labels.length === 0) {
        return;
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
        const userAccount = accounts.find(a => accountUserId(a) === currentUserId());
        const acctId = userAccount ? (userAccount.id ?? userAccount.Id) : null;
        
        const balEl = getEl('infoBalance');
        const curEl = getEl('infoCurrency');
        if (balEl) balEl.textContent = userAccount
            ? `${formatNumber(availableBalance(accountBalance(userAccount)), 2, 2)} ${lang === 'tr' ? 'TL' : 'TRY'}`
            : `0.00 ${lang === 'tr' ? 'TL' : 'TRY'}`;
        if (curEl) curEl.textContent = userAccount?.currency ?? userAccount?.Currency ?? 'TRY';

        // Transaction history
        if (userAccount && acctId) {
            const transactions = await fetchJsonOrThrow('/api/transactions');
            const userTxs = transactions.filter(t => txSenderId(t) === acctId || txReceiverId(t) === acctId);
            
            const historyEl = getEl('infoTransactionHistory');
            if (historyEl) updateTransactionList(userTxs, acctId, historyEl);
            
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
        Cancelled: lang === 'tr' ? 'İptal' : 'Cancelled',
        completed: lang === 'tr' ? 'Tamamlandı' : 'Completed',
        failed: lang === 'tr' ? 'Başarısız' : 'Failed'
    };
    return map[s] || map[s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()] || s;
}

function localizeFraudRiskType(type, lang) {
    const key = String(type || '').toUpperCase();
    const map = {
        SUSPICIOUS_NIGHT_TRANSFER: lang === 'tr' ? 'Gece Transferi' : 'Night Transfer',
        HIGH_AMOUNT: lang === 'tr' ? 'Yüksek Tutar' : 'High Amount',
        FREQUENT_TRANSFER: lang === 'tr' ? 'Sık Transfer' : 'Frequent Transfer',
        FREQUENT_TRANSACTIONS: lang === 'tr' ? 'Sık İşlem' : 'Frequent Transactions',
        LIMIT_EXCEEDED: lang === 'tr' ? 'Limit Aşımı' : 'Limit Exceeded',
        AI_BLOCKED: lang === 'tr' ? 'AI Engeli' : 'AI Blocked'
    };
    return map[key] || type || '-';
}

/** Admin tablolarında gösterilecek açıklama (eski test/otomatik metinleri temizler). */
function formatAdminDescription(tx, lang) {
    return formatTxDescription(tx.description, lang) || '—';
}

/** Kullanıcı işlem listelerinde gösterilecek açıklama */
function formatTxDescription(rawDesc, lang) {
    const d = (rawDesc || '').trim();
    if (!d || /^transfer\s*:/i.test(d)) return '';
    const lower = d.toLowerCase();
    if (lower === 'final smoke') return lang === 'tr' ? 'Havale işlemi' : 'Transfer';
    if (lower === 'deposit' || lower === 'para yatırma') return lang === 'tr' ? 'Para yatırma' : 'Deposit';
    if (lower === 'transfer') return lang === 'tr' ? 'Havale' : 'Transfer';
    if (lower === 'borç') return lang === 'tr' ? 'Borç ödemesi' : 'Debt payment';
    if (/seed/i.test(d)) return lang === 'tr' ? 'Sistem kaydı' : 'System record';
    return d;
}

function updateLimitsDisplay(userLimit) {
    const max = Number(userLimit.maxDailyLimit ?? userLimit.MaxDailyLimit ?? 0);
    const used = Number(userLimit.usedLimit ?? userLimit.UsedLimit ?? 0);
    const remaining = Math.max(0, max - used);
    const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
    const resetRaw = userLimit.lastResetDate ?? userLimit.LastResetDate;

    const maxEl = getEl('maxLimit');
    const usedEl = getEl('usedLimit');
    const remEl = getEl('remainingLimit');
    const pctEl = getEl('limitUsagePct');
    const fillEl = getEl('limitProgressFill');
    const labelEl = getEl('limitProgressLabel');
    const resetEl = getEl('lastResetDate');

    if (maxEl) maxEl.textContent = formatNumber(max, 0, 2);
    if (usedEl) usedEl.textContent = formatNumber(used, 0, 2);
    if (remEl) remEl.textContent = formatNumber(remaining, 0, 2);
    if (pctEl) pctEl.textContent = `${pct.toFixed(1)}% ${t('kullanıldı', 'used')}`;
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (labelEl) {
        const sym = currencySymbol(currentAccountCurrency);
        labelEl.textContent = `${sym}${formatNumber(used, 0, 2)} / ${sym}${formatNumber(max, 0, 2)} ${currentAccountCurrency}`;
    }
    if (resetEl) {
        resetEl.textContent = resetRaw
            ? new Date(resetRaw).toLocaleString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '—';
    }
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

/** Admin panel sunum bakiyesi — kullanıcı dashboard'unda kullanılmaz */
function presentationBalance(rawBalance, ctx) {
    const email = String(ctx?.email ?? ctx?.Email ?? currentUser?.email ?? '').toLowerCase();
    const role = String(ctx?.role ?? ctx?.Role ?? currentUser?.role ?? '');
    const accNo = String(ctx?.accountNumber ?? ctx?.AccountNumber ?? currentUser?.accountNumber ?? '').toUpperCase();
    if (role === 'Admin' || email === 'cavit@vireon.com' || accNo === 'VR-99999') return 100000;
    if (email === 'enes@vireon.com' || accNo === 'VR-88888') return 50000;
    if (email === 'kerem@vireon.com' || accNo === 'VR-77777') return 50000;
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
            (accountsForFraud || []).forEach(a => {
                const id = pickField(a, 'id', 'Id');
                const num = pickField(a, 'accountNumber', 'AccountNumber');
                if (id != null) accNumById[id] = num || ('#' + id);
            });

            const logs = Array.isArray(fraudLogs) ? fraudLogs : [];
            if (!logs.length) {
                fraudBody.innerHTML = `<tr><td colspan="5" class="tx-empty">${lang === 'tr' ? 'Şüpheli işlem kaydı yok.' : 'No suspicious transactions.'}</td></tr>`;
            } else {
                fraudBody.innerHTML = logs.slice().reverse().map((f, idx) => {
                    const accountId = pickField(f, 'accountId', 'AccountId');
                    const riskType = pickField(f, 'riskType', 'RiskType');
                    const description = pickField(f, 'description', 'Description') || '-';
                    const logDate = pickField(f, 'logDate', 'LogDate');
                    const logId = pickField(f, 'id', 'Id');
                    const dateStr = logDate
                        ? new Date(logDate).toLocaleString(getLocale(), { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
                        : '—';
                    return `
                    <tr title="DB ID: ${logId ?? ''}">
                        <td class="col-seq">${idx + 1}</td>
                        <td>${escapeHtml(accNumById[accountId] || ('#' + accountId))}</td>
                        <td><span class="type-badge type-fraud">${escapeHtml(localizeFraudRiskType(riskType, lang))}</span></td>
                        <td>${escapeHtml(description)}</td>
                        <td>${dateStr}</td>
                    </tr>`;
                }).join('');
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
