/* ==========================================================================
   INTERACTIVE PRICING CALCULATOR — JAVASCRIPT CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE CONTAINER ---
  const state = {
    price: 0,
    quantity: 1,
    taxPct: 15,
    discountType: 'none',
    discountVal: 0,
    currency: 'USD',
    activePromo: '',
    
    // Calculated Results
    subtotal: 0,
    volPct: 0,
    volDiscountAmt: 0,
    customDiscountAmt: 0,
    promoDiscountAmt: 0,
    taxAmt: 0,
    grandTotal: 0,
    totalSaved: 0,

    // App Configurations
    theme: 'light'
  };

  // --- DOM NODES & SELECTORS ---
  const nodes = {
    // Inputs & Forms
    form: document.getElementById('calculator-form'),
    currencySelect: document.getElementById('currency-select'),
    inputPrice: document.getElementById('input-price'),
    inputQuantity: document.getElementById('input-quantity'),
    inputTax: document.getElementById('input-tax'),
    discountType: document.getElementById('discount-type'),
    inputDiscountVal: document.getElementById('input-discount-val'),
    inputPromo: document.getElementById('input-promo'),
    
    // Quick buttons
    qtyMinus: document.getElementById('qty-minus'),
    qtyPlus: document.getElementById('qty-plus'),
    presetBtns: document.querySelectorAll('.preset-btn'),
    btnPromoApply: document.getElementById('btn-promo-apply'),
    btnReset: document.getElementById('btn-reset'),
    btnCalculate: document.getElementById('btn-calculate'),
    
    // Display Suffix / Prefixes
    pricePrefix: document.getElementById('price-prefix'),
    discountSuffix: document.getElementById('discount-suffix'),
    quantityBadge: document.getElementById('quantity-badge'),
    displayCurrencySymbol: document.getElementById('display-currency-symbol'),
    
    // Results Displays
    displayGrandTotal: document.getElementById('display-grand-total'),
    savingsTickerBox: document.getElementById('savings-ticker-box'),
    tickerSavingsAmount: document.getElementById('ticker-savings-amount'),
    
    breakdownQtyLabel: document.getElementById('breakdown-qty-label'),
    breakdownSubtotal: document.getElementById('breakdown-subtotal'),
    
    rowVolumeDiscount: document.getElementById('row-volume-discount'),
    volumeDiscountPct: document.getElementById('volume-discount-pct'),
    breakdownVolumeDiscount: document.getElementById('breakdown-volume-discount'),
    
    rowCustomDiscount: document.getElementById('row-custom-discount'),
    customDiscountPct: document.getElementById('custom-discount-pct'),
    breakdownCustomDiscount: document.getElementById('breakdown-custom-discount'),
    
    rowPromoDiscount: document.getElementById('row-promo-discount'),
    promoDiscountLabel: document.getElementById('promo-discount-label'),
    breakdownPromoDiscount: document.getElementById('breakdown-promo-discount'),
    
    breakdownTaxLabel: document.getElementById('breakdown-tax-label'),
    breakdownTaxAmount: document.getElementById('breakdown-tax-amount'),
    breakdownTotalSaved: document.getElementById('breakdown-total-saved'),
    
    // Error nodes
    errorPrice: document.getElementById('error-price'),
    errorQuantity: document.getElementById('error-quantity'),
    errorTax: document.getElementById('error-tax'),
    errorDiscountVal: document.getElementById('error-discount-val'),
    promoFeedback: document.getElementById('promo-feedback'),
    
    // Visual Charts Segment
    barNet: document.getElementById('bar-net'),
    barTax: document.getElementById('bar-tax'),
    barSaved: document.getElementById('bar-saved'),
    legendPctNet: document.getElementById('legend-pct-net'),
    legendPctTax: document.getElementById('legend-pct-tax'),
    legendPctSaved: document.getElementById('legend-pct-saved'),
    
    // Export actions
    btnCopyTotal: document.getElementById('btn-copy-total'),
    btnPrint: document.getElementById('btn-print'),
    btnPdf: document.getElementById('btn-pdf'),
    
    // Theme Switcher & Globals
    themeToggle: document.getElementById('theme-toggle'),
    toastContainer: document.getElementById('toast-container')
  };

  // --- CURRENCY SYMBOLS DEFINITIONS ---
  const currencyMeta = {
    USD: { symbol: '$', locale: 'en-US' },
    EUR: { symbol: '€', locale: 'de-DE' },
    PKR: { symbol: '₨', locale: 'en-PK' }
  };

  // --- INITIALIZATION ---
  const init = () => {
    // Render Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
    
    // Load theme setting from LocalStorage
    const savedTheme = localStorage.getItem('calculator-theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
    } else {
      setTheme('light');
    }

    // Set initial values & execute calculations
    nodes.inputPrice.value = "149.99";
    nodes.inputQuantity.value = "1";
    nodes.inputTax.value = "15";
    
    readInputsAndCalculate();
    addEventListeners();
  };

  // --- THEME SWITCHING ---
  const setTheme = (theme) => {
    state.theme = theme;
    localStorage.setItem('calculator-theme', theme);
    if (theme === 'dark') {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
    }
  };

  // --- FORMATTING UTILITIES ---
  const formatValue = (value) => {
    const meta = currencyMeta[state.currency];
    return value.toLocaleString(meta.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // --- TOAST NOTIFICATIONS ---
  const showToast = (title, desc, type = 'info') => {
    const id = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = id;
    
    // Choose icon based on type
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-desc">${desc}</div>
      </div>
    `;
    
    nodes.toastContainer.appendChild(toast);
    
    // Re-trigger lucide for dynamic icons
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Anim entry
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  };

  // --- VALIDATIONS ---
  const validateInputs = () => {
    let isValid = true;

    // Helper: Reset specific error state
    const resetError = (inputNode, errorNode) => {
      inputNode.closest('.form-group').classList.remove('has-error');
      errorNode.innerHTML = '';
    };

    // Helper: Set error state
    const setError = (inputNode, errorNode, message) => {
      inputNode.closest('.form-group').classList.add('has-error');
      errorNode.innerHTML = `<i data-lucide="info" class="w-3.5 h-3.5 inline"></i> ${message}`;
      if (window.lucide) window.lucide.createIcons();
      isValid = false;
    };

    // 1. Price Validation
    resetError(nodes.inputPrice, nodes.errorPrice);
    const priceRaw = nodes.inputPrice.value;
    if (priceRaw === "") {
      setError(nodes.inputPrice, nodes.errorPrice, "Unit Price is required");
    } else {
      const priceVal = parseFloat(priceRaw);
      if (isNaN(priceVal)) {
        setError(nodes.inputPrice, nodes.errorPrice, "Price must be a valid number");
      } else if (priceVal < 0) {
        setError(nodes.inputPrice, nodes.errorPrice, "Price cannot be negative");
      }
    }

    // 2. Quantity Validation
    resetError(nodes.inputQuantity, nodes.errorQuantity);
    const qtyRaw = nodes.inputQuantity.value;
    if (qtyRaw === "") {
      setError(nodes.inputQuantity, nodes.errorQuantity, "Quantity is required");
    } else {
      const qtyVal = parseInt(qtyRaw);
      if (isNaN(qtyVal)) {
        setError(nodes.inputQuantity, nodes.errorQuantity, "Quantity must be an integer");
      } else if (qtyVal <= 0) {
        setError(nodes.inputQuantity, nodes.errorQuantity, "Quantity must be greater than zero");
      }
    }

    // 3. Tax Validation
    resetError(nodes.inputTax, nodes.errorTax);
    const taxRaw = nodes.inputTax.value;
    if (taxRaw === "") {
      setError(nodes.inputTax, nodes.errorTax, "Tax is required");
    } else {
      const taxVal = parseFloat(taxRaw);
      if (isNaN(taxVal)) {
        setError(nodes.inputTax, nodes.errorTax, "Tax must be a valid percentage");
      } else if (taxVal < 0) {
        setError(nodes.inputTax, nodes.errorTax, "Tax cannot be negative");
      } else if (taxVal > 100) {
        setError(nodes.inputTax, nodes.errorTax, "Tax cannot exceed 100%");
      }
    }

    // 4. Custom Discount Value Validation
    resetError(nodes.inputDiscountVal, nodes.errorDiscountVal);
    if (!nodes.inputDiscountVal.disabled) {
      const discRaw = nodes.inputDiscountVal.value;
      if (discRaw === "") {
        setError(nodes.inputDiscountVal, nodes.errorDiscountVal, "Discount value is required");
      } else {
        const discVal = parseFloat(discRaw);
        if (isNaN(discVal)) {
          setError(nodes.inputDiscountVal, nodes.errorDiscountVal, "Discount must be a valid number");
        } else if (discVal < 0) {
          setError(nodes.inputDiscountVal, nodes.errorDiscountVal, "Discount cannot be negative");
        } else if (state.discountType === 'percentage' && discVal > 100) {
          setError(nodes.inputDiscountVal, nodes.errorDiscountVal, "Percentage discount cannot exceed 100%");
        }
      }
    }

    return isValid;
  };

  // --- PRICING ENGINE CALCULATIONS ---
  const readInputsAndCalculate = () => {
    // 1. Basic properties mapping
    state.currency = nodes.currencySelect.value;
    state.price = parseFloat(nodes.inputPrice.value) || 0;
    
    // Safely parse quantity
    let parsedQty = parseInt(nodes.inputQuantity.value);
    if (isNaN(parsedQty) || parsedQty < 1) parsedQty = 1;
    state.quantity = parsedQty;

    state.taxPct = parseFloat(nodes.inputTax.value) || 0;
    state.discountType = nodes.discountType.value;

    // Suffix/Prefix setups
    const currentMeta = currencyMeta[state.currency];
    nodes.pricePrefix.innerText = currentMeta.symbol;
    nodes.displayCurrencySymbol.innerText = currentMeta.symbol;
    
    if (state.discountType === 'none') {
      nodes.inputDiscountVal.disabled = true;
      nodes.inputDiscountVal.value = "";
      state.discountVal = 0;
    } else {
      nodes.inputDiscountVal.disabled = false;
      state.discountVal = parseFloat(nodes.inputDiscountVal.value) || 0;
      if (state.discountType === 'percentage') {
        nodes.discountSuffix.innerText = "%";
      } else {
        nodes.discountSuffix.innerText = currentMeta.symbol;
      }
    }

    // Validation Check before calculations run
    if (!validateInputs()) {
      renderZeros();
      return;
    }

    // 2. Perform Mathematical Pricing Calculations
    
    // Formula: Subtotal = Unit Price x Quantity
    state.subtotal = state.price * state.quantity;

    // Rule: Volume Discounts
    // - Qty 1–4 -> 0%
    // - Qty 5–9 -> 10%
    // - Qty 10–19 -> 15%
    // - Qty 20+ -> 20%
    if (state.quantity >= 20) {
      state.volPct = 20;
    } else if (state.quantity >= 10) {
      state.volPct = 15;
    } else if (state.quantity >= 5) {
      state.volPct = 10;
    } else {
      state.volPct = 0;
    }
    state.volDiscountAmt = state.subtotal * (state.volPct / 100);

    let remainingAmt = state.subtotal - state.volDiscountAmt;

    // Apply custom discount AFTER the volume discount
    state.customDiscountAmt = 0;
    if (state.discountType === 'percentage') {
      state.customDiscountAmt = remainingAmt * (state.discountVal / 100);
    } else if (state.discountType === 'fixed') {
      // Clamped to make sure custom discount doesn't exceed current remaining
      state.customDiscountAmt = Math.min(state.discountVal, remainingAmt);
    }
    remainingAmt -= state.customDiscountAmt;

    // Apply active Promo code discount on the remaining amount
    state.promoDiscountAmt = 0;
    if (state.activePromo === 'SAVE10') {
      state.promoDiscountAmt = remainingAmt * 0.10;
    } else if (state.activePromo === 'WELCOME20') {
      state.promoDiscountAmt = remainingAmt * 0.20;
    }
    remainingAmt -= state.promoDiscountAmt;

    // Apply tax on remaining amount
    state.taxAmt = remainingAmt * (state.taxPct / 100);

    // Formula: Grand Total = Remaining Amount + Tax
    state.grandTotal = remainingAmt + state.taxAmt;

    // Total Amount Saved calculation
    state.totalSaved = state.volDiscountAmt + state.customDiscountAmt + state.promoDiscountAmt;

    // 3. Render calculations to screen
    renderResults();
  };

  // --- RENDER DYNAMIC CALCULATOR OUTPUTS ---
  const renderResults = () => {
    const symbol = currencyMeta[state.currency].symbol;

    // Grand total ticker update
    nodes.displayGrandTotal.innerText = formatValue(state.grandTotal);

    // Subtotal text labels
    nodes.quantityBadge.innerText = `${state.quantity} Unit${state.quantity > 1 ? 's' : ''}`;
    nodes.breakdownQtyLabel.innerText = `(${state.quantity} × ${formatValue(state.price)})`;
    nodes.breakdownSubtotal.innerText = formatValue(state.subtotal);

    // Volume discount rendering
    if (state.volDiscountAmt > 0) {
      nodes.rowVolumeDiscount.classList.remove('hidden');
      nodes.volumeDiscountPct.innerText = `${state.volPct}%`;
      nodes.breakdownVolumeDiscount.innerText = `-${formatValue(state.volDiscountAmt)}`;
    } else {
      nodes.rowVolumeDiscount.classList.add('hidden');
    }

    // Custom discount rendering
    if (state.customDiscountAmt > 0) {
      nodes.rowCustomDiscount.classList.remove('hidden');
      if (state.discountType === 'percentage') {
        nodes.customDiscountPct.innerText = `${state.discountVal}%`;
      } else {
        nodes.customDiscountPct.innerText = 'Fixed';
      }
      nodes.breakdownCustomDiscount.innerText = `-${formatValue(state.customDiscountAmt)}`;
    } else {
      nodes.rowCustomDiscount.classList.add('hidden');
    }

    // Promo code savings rendering
    if (state.promoDiscountAmt > 0) {
      nodes.rowPromoDiscount.classList.remove('hidden');
      nodes.promoDiscountLabel.innerText = state.activePromo;
      nodes.breakdownPromoDiscount.innerText = `-${formatValue(state.promoDiscountAmt)}`;
    } else {
      nodes.rowPromoDiscount.classList.add('hidden');
    }

    // Tax amount rendering
    nodes.breakdownTaxLabel.innerText = `Tax (${state.taxPct}%)`;
    nodes.breakdownTaxAmount.innerText = formatValue(state.taxAmt);

    // Total Saved rendering
    nodes.breakdownTotalSaved.innerText = formatValue(state.totalSaved);

    // Savings announcement box
    if (state.totalSaved > 0) {
      nodes.savingsTickerBox.classList.remove('hidden');
      nodes.tickerSavingsAmount.innerText = `${symbol}${formatValue(state.totalSaved)}`;
    } else {
      nodes.savingsTickerBox.classList.add('hidden');
    }

    // Preset button statuses
    nodes.presetBtns.forEach(btn => {
      const val = parseInt(btn.dataset.value);
      if (val === state.quantity) {
        btn.classList.add('active');
      } else if (val === 20 && state.quantity >= 20) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Dynamic Chart rendering
    // Prevent Division-By-Zero errors
    const totalRepresented = state.grandTotal + state.totalSaved;
    if (totalRepresented > 0) {
      const netPct = (state.grandTotal - state.taxAmt) / totalRepresented * 100;
      const taxPct = state.taxAmt / totalRepresented * 100;
      const savedPct = state.totalSaved / totalRepresented * 100;

      nodes.barNet.style.width = `${netPct}%`;
      nodes.barTax.style.width = `${taxPct}%`;
      nodes.barSaved.style.width = `${savedPct}%`;

      nodes.legendPctNet.innerText = `${Math.round(netPct)}%`;
      nodes.legendPctTax.innerText = `${Math.round(taxPct)}%`;
      nodes.legendPctSaved.innerText = `${Math.round(savedPct)}%`;
    } else {
      nodes.barNet.style.width = `0%`;
      nodes.barTax.style.width = `0%`;
      nodes.barSaved.style.width = `0%`;

      nodes.legendPctNet.innerText = `0%`;
      nodes.legendPctTax.innerText = `0%`;
      nodes.legendPctSaved.innerText = `0%`;
    }
  };

  // --- RENDER FALLBACK VALUES ---
  const renderZeros = () => {
    nodes.displayGrandTotal.innerText = "0.00";
    nodes.breakdownSubtotal.innerText = "0.00";
    nodes.breakdownTaxAmount.innerText = "0.00";
    nodes.breakdownTotalSaved.innerText = "0.00";
    nodes.savingsTickerBox.classList.add('hidden');
    nodes.rowVolumeDiscount.classList.add('hidden');
    nodes.rowCustomDiscount.classList.add('hidden');
    nodes.rowPromoDiscount.classList.add('hidden');
    
    nodes.barNet.style.width = `0%`;
    nodes.barTax.style.width = `0%`;
    nodes.barSaved.style.width = `0%`;
  };

  // --- REGISTER INTERACTIVE EVENT LISTENERS ---
  const addEventListeners = () => {
    
    // 1. Live Typing Calculations & Selectors change
    const inputs = [
      nodes.currencySelect, nodes.inputPrice, nodes.inputQuantity, 
      nodes.inputTax, nodes.discountType, nodes.inputDiscountVal
    ];
    inputs.forEach(input => {
      input.addEventListener('input', readInputsAndCalculate);
      input.addEventListener('change', readInputsAndCalculate);
    });

    // 2. Incrementor buttons
    nodes.qtyMinus.addEventListener('click', () => {
      let qty = parseInt(nodes.inputQuantity.value) || 1;
      if (qty > 1) {
        nodes.inputQuantity.value = String(qty - 1);
        readInputsAndCalculate();
      }
    });

    nodes.qtyPlus.addEventListener('click', () => {
      let qty = parseInt(nodes.inputQuantity.value) || 1;
      nodes.inputQuantity.value = String(qty + 1);
      readInputsAndCalculate();
    });

    // 3. Preset capsules
    nodes.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const value = parseInt(btn.dataset.value);
        nodes.inputQuantity.value = String(value);
        readInputsAndCalculate();
      });
    });

    // 4. Promo code validator
    nodes.btnPromoApply.addEventListener('click', () => {
      const code = nodes.inputPromo.value.trim().toUpperCase();
      
      if (code === "") {
        nodes.promoFeedback.className = "promo-feedback error";
        nodes.promoFeedback.innerHTML = "Please enter a promo code first.";
        state.activePromo = "";
        readInputsAndCalculate();
        return;
      }

      if (code === "SAVE10" || code === "WELCOME20") {
        state.activePromo = code;
        nodes.promoFeedback.className = "promo-feedback success";
        nodes.promoFeedback.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 inline"></i> Code applied successfully! (${code === 'SAVE10' ? '10%' : '20%'} Off)`;
        showToast("Promo Code Applied", `Code ${code} saved you an extra ${code === 'SAVE10' ? '10%' : '20%'}!`, "success");
        readInputsAndCalculate();
      } else {
        nodes.promoFeedback.className = "promo-feedback error";
        nodes.promoFeedback.innerHTML = "Invalid promo code. Please try SAVE10 or WELCOME20.";
        state.activePromo = "";
        showToast("Invalid Code", "Please verify the spelling and try again.", "error");
        readInputsAndCalculate();
      }
      
      if (window.lucide) window.lucide.createIcons();
    });

    // Quick fill helper for clicking the hint capsules
    document.querySelectorAll('.code-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        nodes.inputPromo.value = pill.innerText;
        nodes.btnPromoApply.click();
      });
    });

    // 5. Manual submit / Calculate button (shows spinner mock for extra quality)
    nodes.form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateInputs()) {
        showToast("Validation Failed", "Check form parameters for invalid inputs.", "error");
        return;
      }

      const spinner = nodes.btnCalculate.querySelector('.btn-spinner');
      const text = nodes.btnCalculate.querySelector('.btn-text');
      
      spinner.classList.remove('hidden');
      text.style.opacity = '0.3';
      nodes.btnCalculate.disabled = true;

      setTimeout(() => {
        spinner.classList.add('hidden');
        text.style.opacity = '1';
        nodes.btnCalculate.disabled = false;
        
        showToast("Calculated Successfully", "Pricing parameters processed with high precision.", "success");
        
        // Scroll to total layout on smaller mobile screens
        if (window.innerWidth < 992) {
          document.getElementById('total-card').scrollIntoView({ behavior: 'smooth' });
        }
      }, 600);
    });

    // 6. Reset all parameters button
    nodes.btnReset.addEventListener('click', () => {
      nodes.inputPrice.value = "149.99";
      nodes.inputQuantity.value = "1";
      nodes.inputTax.value = "15";
      nodes.discountType.value = "none";
      nodes.inputDiscountVal.value = "";
      nodes.inputPromo.value = "";
      state.activePromo = "";
      nodes.currencySelect.value = "USD";
      
      nodes.promoFeedback.className = "promo-feedback";
      nodes.promoFeedback.innerHTML = "";
      
      showToast("Reset Completed", "All inputs set back to original defaults.", "info");
      readInputsAndCalculate();
    });

    // 7. Clipboard Copier
    nodes.btnCopyTotal.addEventListener('click', () => {
      const symbol = currencyMeta[state.currency].symbol;
      const formatted = `${symbol}${formatValue(state.grandTotal)}`;
      
      navigator.clipboard.writeText(formatted).then(() => {
        showToast("Copied to Clipboard", `${formatted} is ready to paste!`, "success");
        
        // Quick visual checkmark anim
        const icon = document.getElementById('copy-icon');
        icon.setAttribute('data-lucide', 'check');
        if (window.lucide) window.lucide.createIcons();
        icon.style.color = '#10b981';
        
        setTimeout(() => {
          icon.setAttribute('data-lucide', 'copy');
          if (window.lucide) window.lucide.createIcons();
          icon.style.color = '';
        }, 1500);
      }).catch(err => {
        showToast("Clipboard Error", "Unable to copy total value.", "error");
      });
    });

    // 8. Print Receipt Trigger
    nodes.btnPrint.addEventListener('click', () => {
      window.print();
    });

    // 9. jsPDF Multi-Line Business PDF Generator
    nodes.btnPdf.addEventListener('click', () => {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Document Header Accent
        doc.setFillColor(37, 99, 235); // Blue Accent
        doc.rect(0, 0, 210, 8, "F");

        // Brand Title
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text("COMMERCIAL QUOTATION", 14, 25);

        // Subtitle
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("Interactive Pricing Calculator Receipt", 14, 31);
        doc.text(`Document Reference: IPC-${Date.now().toString().slice(-6)}`, 14, 36);
        doc.text(`Issued On: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 41);

        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 46, 196, 46);

        // Client / Valuation Metadata
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text("Valuation Metrics & Reference Status", 14, 55);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Currency Parameter: ${state.currency}`, 14, 62);
        doc.text(`Status Verification: Approved & Live Calculated`, 14, 67);

        // Items Table Headers
        doc.setFillColor(241, 245, 249);
        doc.rect(14, 76, 182, 8, "F");
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text("VALUED DESCRIPTION", 18, 81.5);
        doc.text("QTY", 120, 81.5);
        doc.text("UNIT PRICE", 145, 81.5);
        doc.text("NET VALUATION", 172, 81.5);

        // Items Table Row
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text("Commercial SaaS License Subscription Base", 18, 92);
        doc.text(String(state.quantity), 122, 92);
        doc.text(`${currencyMeta[state.currency].symbol}${formatValue(state.price)}`, 145, 92);
        doc.text(`${currencyMeta[state.currency].symbol}${formatValue(state.subtotal)}`, 172, 92);

        doc.setDrawColor(226, 232, 240);
        doc.line(14, 98, 196, 98);

        // Summary Calculations layout
        let currentY = 106;
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139);

        // Subtotal row
        doc.text("Subtotal Rate:", 125, currentY);
        doc.setTextColor(15, 23, 42);
        doc.text(`${currencyMeta[state.currency].symbol}${formatValue(state.subtotal)}`, 172, currentY);

        // Volume Discount row
        if (state.volDiscountAmt > 0) {
          currentY += 7;
          doc.setTextColor(100, 116, 139);
          doc.text(`Volume Discount (${state.volPct}%):`, 125, currentY);
          doc.setTextColor(22, 163, 74); // green
          doc.text(`-${currencyMeta[state.currency].symbol}${formatValue(state.volDiscountAmt)}`, 172, currentY);
        }

        // Custom Discount row
        if (state.customDiscountAmt > 0) {
          currentY += 7;
          doc.setTextColor(100, 116, 139);
          doc.text(`Custom Discount:`, 125, currentY);
          doc.setTextColor(22, 163, 74);
          doc.text(`-${currencyMeta[state.currency].symbol}${formatValue(state.customDiscountAmt)}`, 172, currentY);
        }

        // Promo Discount row
        if (state.promoDiscountAmt > 0) {
          currentY += 7;
          doc.setTextColor(100, 116, 139);
          doc.text(`Promo Code (${state.activePromo}):`, 125, currentY);
          doc.setTextColor(22, 163, 74);
          doc.text(`-${currencyMeta[state.currency].symbol}${formatValue(state.promoDiscountAmt)}`, 172, currentY);
        }

        // Tax row
        currentY += 7;
        doc.setTextColor(100, 116, 139);
        doc.text(`Taxation Charge (${state.taxPct}%):`, 125, currentY);
        doc.setTextColor(15, 23, 42);
        doc.text(`${currencyMeta[state.currency].symbol}${formatValue(state.taxAmt)}`, 172, currentY);

        // Divider for grand total
        currentY += 5;
        doc.setDrawColor(71, 85, 105);
        doc.line(125, currentY, 196, currentY);
        
        // Grand Total row
        currentY += 8;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11.5);
        doc.setTextColor(15, 23, 42);
        doc.text("Grand Total Rate:", 125, currentY);
        doc.text(`${currencyMeta[state.currency].symbol}${formatValue(state.grandTotal)}`, 172, currentY);

        // Amount Saved Summary line
        if (state.totalSaved > 0) {
          currentY += 8;
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(22, 163, 74);
          doc.text(`Accumulated Savings: ${currencyMeta[state.currency].symbol}${formatValue(state.totalSaved)}`, 125, currentY);
        }

        // Terms & Conditions Footer Block
        currentY += 30;
        doc.setDrawColor(226, 232, 240);
        doc.line(14, currentY, 196, currentY);
        
        currentY += 8;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text("Quotation Notice & Terms", 14, currentY);
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("1. This quotation is calculated dynamically using live server formulas based on original user inputs.", 14, currentY + 5);
        doc.text("2. Values rendered do not constitute credit guarantees; active pricing shifts apply based on contract timeline.", 14, currentY + 9);
        doc.text("3. Commercial taxation rates vary between geographical regions and active business registries.", 14, currentY + 13);

        // PDF document download action
        doc.save(`Pricing_Receipt_IPC_${Date.now().toString().slice(-5)}.pdf`);
        showToast("PDF Invoice Downloaded", "Pristine quotation sheet created and downloaded.", "success");
      } catch (err) {
        console.error(err);
        showToast("PDF Error", "Unable to download PDF. Please check if browser blocked script.", "error");
      }
    });

    // 10. Light/Dark mode switcher
    nodes.themeToggle.addEventListener('click', () => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      setTheme(nextTheme);
      showToast(`${nextTheme === 'dark' ? 'Dark Mode' : 'Light Mode'} Enabled`, `App theme successfully converted to ${nextTheme}.`, 'info');
    });

  };

  // Run initializer
  init();
});
