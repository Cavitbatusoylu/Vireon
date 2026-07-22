const FX_RATES = { TRY: 1, USD: 46.14, EUR: 53.33, GBP: 61.82 };
const FX_CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'];
let currentAccountCurrency = 'TRY';
let accountByNumber = {};
let transferReceiverCurrency = null;

function currencySymbol(code) {
   const c = String(code || 'TRY').toUpperCase();
   if (c === 'TRY') return '₺';
   if (c === 'USD') return '$';
   if (c === 'EUR') return '€';
   if (c === 'GBP') return '£';
   return c + ' ';
}

function convertCurrencyClient(amount, fromCurrency, toCurrency) {
   const from = String(fromCurrency || 'TRY').toUpperCase();
   const to = String(toCurrency || 'TRY').toUpperCase();
   if (from === to) return Number(amount) || 0;
   if (!FX_RATES[from] || !FX_RATES[to]) return null;
   const inTry = (Number(amount) || 0) * FX_RATES[from];
   return inTry / FX_RATES[to];
}

function formatMoney(amount, currencyCode) {
   const code = String(currencyCode || 'TRY').toUpperCase();
   return `${currencySymbol(code)}${formatNumber(amount, 2, 2)} ${code}`;
}

function indexAccountsByNumber(accounts) {
   accountByNumber = {};
   (accounts || []).forEach(a => {
      const num = String(a.accountNumber ?? a.AccountNumber ?? '').trim().toUpperCase();
      if (!num) return;
      accountByNumber[num] = {
         currency: String(a.currency ?? a.Currency ?? 'TRY').toUpperCase(),
         balance: Number(a.balance ?? a.Balance ?? 0)
      };
   });
}

function updateBalanceCurrencyDisplay(currencyCode) {
   const code = String(currencyCode || 'TRY').toUpperCase();
   currentAccountCurrency = code;
   const symEl = getEl('dashBalanceSymbol');
   const curEl = getEl('dashCurrency');
   const labelEl = getEl('transferAmountLabel');
   if (symEl) symEl.textContent = currencySymbol(code);
   if (curEl) curEl.textContent = code;
   if (labelEl) {
      labelEl.textContent = t(`Miktar (${currencySymbol(code)}${code})`, `Amount (${currencySymbol(code)}${code})`);
   }
   renderExchangeRatesPanel();
}

function renderBalanceFxBreakdown(tryBalance) {
   const panel = getEl('dashFxBreakdown');
   if (!panel) return;
   const base = Number(tryBalance) || 0;
   const chips = FX_CURRENCIES.map(code => {
      const converted = convertCurrencyClient(base, 'TRY', code);
      if (converted == null) return '';
      return `<span class="fx-balance-chip" title="${code}"><span class="fx-balance-symbol">${currencySymbol(code)}</span><span class="fx-balance-value">${formatNumber(converted, 2, 2)}</span><span class="fx-balance-code">${code}</span></span>`;
   }).join('');
   panel.innerHTML = chips;
}

function renderExchangeRatesPanel() {
   const panel = getEl('fxRatesPanel');
   if (!panel) return;
   const base = currentAccountCurrency;
   const rows = FX_CURRENCIES.filter(c => c !== base).map(c => {
      const oneUnit = convertCurrencyClient(1, c, base);
      if (oneUnit == null) return '';
      return `<span class="fx-rate-chip">1 ${c} = ${formatMoney(oneUnit, base)}</span>`;
   }).join('');
   panel.innerHTML = rows || `<span class="fx-rate-chip">${base}</span>`;
}

function getTransferTargetCurrency() {
   const sim = getEl('transferFxSimCurrency')?.value;
   if (sim) return String(sim).toUpperCase();
   if (transferReceiverCurrency) return transferReceiverCurrency;
   const acc = getEl('transferTarget')?.value?.trim()?.toUpperCase();
   if (acc && accountByNumber[acc]) return accountByNumber[acc].currency;
   return currentAccountCurrency;
}

function updateTransferFxPreview() {
   const preview = getEl('transferFxPreview');
   if (!preview) return;
   const amount = parseFloat(getEl('transferAmount')?.value);
   const targetCur = getTransferTargetCurrency();
   const senderCur = currentAccountCurrency;

   if (!amount || amount <= 0) {
      preview.innerHTML = `<span class="fx-preview-muted">${t('Tutar girince kur önizlemesi burada görünür.', 'Enter an amount to preview the exchange rate.')}</span>`;
      preview.className = 'transfer-fx-preview';
      return;
   }

   if (senderCur === targetCur) {
      preview.innerHTML = `<span class="fx-preview-same">${t('Aynı para birimi — kur dönüşümü yok.', 'Same currency — no conversion.')}</span> <strong>${formatMoney(amount, senderCur)}</strong>`;
      preview.className = 'transfer-fx-preview is-same';
      return;
   }

   const converted = convertCurrencyClient(amount, senderCur, targetCur);
   if (converted == null) {
      preview.innerHTML = `<span class="fx-preview-muted">${t('Desteklenmeyen para birimi.', 'Unsupported currency.')}</span>`;
      preview.className = 'transfer-fx-preview';
      return;
   }

   const simNote = getEl('transferFxSimCurrency')?.value && !transferReceiverCurrency
      ? t(' (simülasyon)', ' (simulated)')
      : '';
   preview.innerHTML = `
      <span class="fx-preview-label">${t('Tahmini karşılık', 'Estimated equivalent')}${simNote}:</span>
      <strong>${formatMoney(amount, senderCur)}</strong>
      <span class="fx-preview-arrow">→</span>
      <strong class="fx-preview-target">${formatMoney(converted, targetCur)}</strong>
      <span class="fx-preview-muted">${t('Simülasyon kuru — backend ile aynı tablo', 'Simulated rate — same table as backend')}</span>`;
   preview.className = 'transfer-fx-preview is-cross';
}

async function fetchJsonOrThrow(url, options) {
   const response = await fetch(url, options);
   const payload = await response.json().catch(() => ({}));
   if (!response.ok) {
      const message = payload?.mesaj || payload?.message || `HTTP ${response.status}`;
      throw new Error(message);
   }
   return payload;
}

