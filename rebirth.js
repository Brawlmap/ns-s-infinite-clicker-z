const rebirthCoinCosts = [2, 5, 10];

window.syncToLeaderboard = async function() {
    const user = localStorage.getItem('player_username');
    const pass = localStorage.getItem('player_password');
    if (!user || !pass) return;

    await _supabase
        .from('leaderboard')
        .update({ 
            clicks: Math.floor(window.clicks), 
            rebirths: window.rebirthCoins,
            updated_at: new Date()
        })
        .eq('username', user)
        .eq('password', pass);
};

window.updateRBUI = function() {
    // update rebirth CPS boost UI
    document.getElementById('rb-lvl-1').innerText = window.rbUpgrades.cpsLvl;
    const cpsBtn = document.getElementById('rb-upgrade-1');
    if (cpsBtn) {
        cpsBtn.disabled = window.rebirthCoins < 1 || window.rbUpgrades.cpsLvl >= 5;
        cpsBtn.innerText = window.rbUpgrades.cpsLvl >= 5 ? "MAXED" : "buy (1 RC)";
    }

    // update tier mastery UI
    document.getElementById('rb-lvl-3').innerText = window.rbUpgrades.tierMasteryLvl;
    const masteryBtn = document.getElementById('rb-upgrade-3');
    if (masteryBtn) {
        masteryBtn.disabled = window.rebirthCoins < 2 || window.rbUpgrades.tierMasteryLvl >= 5;
        masteryBtn.innerText = window.rbUpgrades.tierMasteryLvl >= 5 ? "MAXED" : "buy (2 RC)";
    }

    // update rebirth coin multiplier UI
    document.getElementById('rb-lvl-4').innerText = window.rbUpgrades.rebirthCoinLvl;
    const rebirthCoinBtn = document.getElementById('rb-upgrade-4');
    if (rebirthCoinBtn) {
        const nextCost = window.rbUpgrades.rebirthCoinLvl < 3 ? rebirthCoinCosts[window.rbUpgrades.rebirthCoinLvl] : null;
        rebirthCoinBtn.disabled = window.rbUpgrades.rebirthCoinLvl >= 3 || window.rebirthCoins < (nextCost || 999999);
        rebirthCoinBtn.innerText = window.rbUpgrades.rebirthCoinLvl >= 3 ? "MAXED" : `buy (${nextCost} RC)`;
    }

    // update auto-buy UI
    const autoBtn = document.getElementById('rb-upgrade-2');
    const autoToggle = document.getElementById('auto-t1-toggle');
    if (autoBtn && window.rbUpgrades.autoT1Unlocked) {
        autoBtn.innerText = "UNLOCKED";
        autoBtn.disabled = true;
        autoToggle.disabled = false;
    } else if (autoBtn) {
        autoBtn.disabled = window.rebirthCoins < 5;
    }
    autoToggle.checked = window.rbUpgrades.autoT1On;

    if (!window.resetting) {
        localStorage.setItem('sim_rb_upgrades', JSON.stringify(window.rbUpgrades));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // rebirth CPS boost upgrade logic
    document.getElementById('rb-upgrade-1').onclick = () => {
        if (window.rebirthCoins >= 1 && window.rbUpgrades.cpsLvl < 5) {
            window.rebirthCoins -= 1;
            window.rbUpgrades.cpsLvl++;
            window.updateUI(); // refresh shop.js stats
            window.updateRBUI();
        }
    };

    // auto-buy unlock logic
    document.getElementById('rb-upgrade-2').onclick = () => {
        if (window.rebirthCoins >= 5 && !window.rbUpgrades.autoT1Unlocked) {
            window.rebirthCoins -= 5;
            window.rbUpgrades.autoT1Unlocked = true;
            window.updateUI();
            window.updateRBUI();
        }
    };

    // tier mastery upgrade logic
    document.getElementById('rb-upgrade-3').onclick = () => {
        if (window.rebirthCoins >= 2 && window.rbUpgrades.tierMasteryLvl < 5) {
            window.rebirthCoins -= 2;
            window.rbUpgrades.tierMasteryLvl += 1;
            window.updateUI();
            window.updateRBUI();
        }
    };

    // rebirth coin multiplier upgrade logic
    document.getElementById('rb-upgrade-4').onclick = () => {
        if (window.rbUpgrades.rebirthCoinLvl < 3) {
            const cost = rebirthCoinCosts[window.rbUpgrades.rebirthCoinLvl];
            if (window.rebirthCoins >= cost) {
                window.rebirthCoins -= cost;
                window.rbUpgrades.rebirthCoinLvl += 1;
                window.updateUI();
                window.updateRBUI();
            }
        }
    };

    // auto-buy toggle
    document.getElementById('auto-t1-toggle').onchange = (e) => {
        window.rbUpgrades.autoT1On = e.target.checked;
        window.updateRBUI();
    };

    window.updateRBUI();
});

// the auto-buyer loop (runs every 2 seconds)
window.autoBuyerIntervalId = setInterval(() => {
    if (window.resetting) return;
    if (window.rbUpgrades.autoT1Unlocked && window.rbUpgrades.autoT1On) {
        // try to buy tier 1 using the function from shop.js
        window.buy(1, 50, 't1'); 
    }
}, 2000);

window.stopAutoBuyer = function() {
    if (window.autoBuyerIntervalId) {
        clearInterval(window.autoBuyerIntervalId);
        window.autoBuyerIntervalId = null;
    }
};

setInterval(() => {
    if (!window.resetting) {
        window.syncToLeaderboard();
    }
}, 15000);
