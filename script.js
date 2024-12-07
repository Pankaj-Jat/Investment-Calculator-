// Initialize charts
let sipChart = null;
let swpChart = null;

// Format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

// Calculate SIP returns
function calculateSIP(monthlyInvestment, expectedReturn, years, taxRate) {
    const monthlyRate = expectedReturn / (12 * 100);
    const months = years * 12;
    const totalInvestment = monthlyInvestment * months;
    
    // Calculate future value using SIP formula
    const futureValue = monthlyInvestment * 
        ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * 
        (1 + monthlyRate);
    
    const returns = futureValue - totalInvestment;
    const taxAmount = (returns * taxRate) / 100;
    const finalAmount = futureValue - taxAmount;

    return {
        totalInvestment,
        returns,
        taxAmount,
        finalAmount,
        monthlyValues: generateSIPMonthlyValues(monthlyInvestment, expectedReturn, months)
    };
}

// Generate monthly values for SIP chart
function generateSIPMonthlyValues(monthlyInvestment, expectedReturn, months) {
    const monthlyRate = expectedReturn / (12 * 100);
    const values = [];
    let currentValue = 0;

    for (let i = 0; i <= months; i++) {
        currentValue = (currentValue + monthlyInvestment) * (1 + monthlyRate);
        values.push(Math.round(currentValue));
    }

    return values;
}

// Calculate SWP returns
function calculateSWP(initialInvestment, expectedReturn, years, monthlyWithdrawal) {
    const monthlyRate = expectedReturn / (12 * 100);
    const months = years * 12;
    const totalWithdrawals = monthlyWithdrawal * months;
    
    let balance = initialInvestment;
    const monthlyValues = [balance];

    for (let i = 0; i < months; i++) {
        balance = (balance * (1 + monthlyRate)) - monthlyWithdrawal;
        monthlyValues.push(Math.max(0, balance));
    }

    return {
        totalWithdrawals,
        finalBalance: Math.max(0, balance),
        returns: Math.max(0, balance) - (initialInvestment - totalWithdrawals),
        monthlyValues
    };
}

// Update SIP chart
function updateSIPChart(monthlyValues) {
    const ctx = document.getElementById('sip-chart').getContext('2d');
    const labels = Array.from({length: monthlyValues.length}, (_, i) => i);

    if (sipChart) {
        sipChart.destroy();
    }

    sipChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Investment Value',
                data: monthlyValues,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'SIP Growth Over Time'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Months'
                    }
                }
            }
        }
    });
}

// Update SWP chart
function updateSWPChart(monthlyValues) {
    const ctx = document.getElementById('swp-chart').getContext('2d');
    const labels = Array.from({length: monthlyValues.length}, (_, i) => i);

    if (swpChart) {
        swpChart.destroy();
    }

    swpChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Remaining Balance',
                data: monthlyValues,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'SWP Balance Over Time'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Months'
                    }
                }
            }
        }
    });
}

// Form Validation
function validateInput(input, min, max) {
    const value = parseFloat(input.value);
    const formGroup = input.closest('.form-group');
    const errorMessage = formGroup.querySelector('.error-message') || 
        (() => {
            const error = document.createElement('div');
            error.className = 'error-message';
            formGroup.appendChild(error);
            return error;
        })();

    if (isNaN(value)) {
        formGroup.classList.add('error');
        errorMessage.textContent = 'Please enter a valid number';
        return false;
    }

    if (value < min) {
        formGroup.classList.add('error');
        errorMessage.textContent = `Value must be at least ${min}`;
        return false;
    }

    if (max && value > max) {
        formGroup.classList.add('error');
        errorMessage.textContent = `Value must not exceed ${max}`;
        return false;
    }

    formGroup.classList.remove('error');
    return true;
}

// Save and Load Calculator State
function saveCalculatorState(formId) {
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input');
    const state = {};
    
    inputs.forEach(input => {
        state[input.id] = input.value;
    });
    
    localStorage.setItem(formId + '-state', JSON.stringify(state));
}

function loadCalculatorState(formId) {
    const savedState = localStorage.getItem(formId + '-state');
    if (savedState) {
        const state = JSON.parse(savedState);
        const form = document.getElementById(formId);
        
        Object.entries(state).forEach(([id, value]) => {
            const input = form.querySelector('#' + id);
            if (input) {
                input.value = value;
            }
        });
    }
}

// Load saved states on page load
loadCalculatorState('sip-form');
loadCalculatorState('swp-form');

// Event Listeners
document.getElementById('sip-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Validate inputs
    const validations = [
        validateInput(document.getElementById('sip-amount'), 500),
        validateInput(document.getElementById('sip-return'), 1, 30),
        validateInput(document.getElementById('sip-tenure'), 1, 40),
        validateInput(document.getElementById('tax-rate'), 0, 40)
    ];
    
    if (!validations.every(v => v)) return;
    
    const form = this;
    form.classList.add('loading');
    
    setTimeout(() => {
        const monthlyInvestment = parseFloat(document.getElementById('sip-amount').value);
        const expectedReturn = parseFloat(document.getElementById('sip-return').value);
        const years = parseInt(document.getElementById('sip-tenure').value);
        const taxRate = parseFloat(document.getElementById('tax-rate').value);

        const result = calculateSIP(monthlyInvestment, expectedReturn, years, taxRate);

        // Update results
        document.getElementById('total-investment').textContent = formatCurrency(result.totalInvestment);
        document.getElementById('expected-returns').textContent = formatCurrency(result.returns);
        document.getElementById('tax-amount').textContent = formatCurrency(result.taxAmount);
        document.getElementById('final-amount').textContent = formatCurrency(result.finalAmount);

        // Update chart
        updateSIPChart(result.monthlyValues);
        
        // Save state
        saveCalculatorState('sip-form');
        
        form.classList.remove('loading');
    }, 500);
});

document.getElementById('swp-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const initialInvestment = parseFloat(document.getElementById('initial-investment').value);
    const expectedReturn = parseFloat(document.getElementById('swp-return').value);
    const years = parseInt(document.getElementById('swp-tenure').value);
    const monthlyWithdrawal = parseFloat(document.getElementById('monthly-withdrawal').value);

    const result = calculateSWP(initialInvestment, expectedReturn, years, monthlyWithdrawal);

    // Update results
    document.getElementById('total-withdrawals').textContent = formatCurrency(result.totalWithdrawals);
    document.getElementById('swp-returns').textContent = formatCurrency(result.returns);
    document.getElementById('final-balance').textContent = formatCurrency(result.finalBalance);

    // Update chart
    updateSWPChart(result.monthlyValues);
    
    // Save state
    saveCalculatorState('swp-form');
});

// Reset form handlers
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('reset', function() {
        setTimeout(() => {
            const results = this.closest('.calculator-section').querySelector('.result-card');
            results.querySelectorAll('span').forEach(span => {
                span.textContent = '₹0';
            });

            // Reset charts
            if (this.id === 'sip-form' && sipChart) {
                sipChart.destroy();
                sipChart = null;
            } else if (this.id === 'swp-form' && swpChart) {
                swpChart.destroy();
                swpChart = null;
            }
        }, 0);
    });
});
