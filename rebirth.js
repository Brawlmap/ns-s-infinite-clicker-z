// 🚨 failsafe: ensure globals exist so the script doesn't brick 💀
window.rebirthCoins = window.rebirthCoins || 0;
window.rbUpgrades = window.rbUpgrades || { 
    cpsLvl: 0, 
    tierMasteryLvl: 0, 
    rebirthCoinLvl: 0, 
    autoT1Unlocked: false, 
    autoT1On: false 
};
window.owned = window.owned || { t1:0, t2:0, t3:0, t4:0, t5:0, t6:0, t7:0, t8:0, t9:0, t10:0 };

const rebirthCoinCosts = [2, 5, 10];

function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

// ♻️ the missing rebirth function!
window.rebirth = function() {
    // requirement: e.g., 1 million clicks to rebirth
    const requirement = 1000000; 
    
    if (window.clicks >= requirement) {
        window.resetting = true;
        
        // calculate coins earned (base 1 + multiplier upgrade)
        const earned = 1 + (window.rbUpgrades.rebirthCoinLvl || 0);
        window.rebirthCoins += earned;
        
        // reset game state
        window.clicks = 0;
        window.owned = { t1:0, t2:0, t3:0, t4:0, t5:0, t6:0, t7:0, t8:0, t9:0, t10:0 };
        
        alert(`rebirth successful! earned ${earned} RC 🏆`);
        
        if (window.updateUI) window.updateUI();
        window.updateRBUI();
        window.syncToLeaderboard(); // sync immediately after rebirth!
        
        window.resetting = false;
        location.reload(); // reload to clear active intervals/timers
    } else {
        alert("not enough clicks to rebirth yet bro 💀");
    }
};

// 🌐 saves tiers and upgrades to the supabase column
window.syncToLeaderboard = async function() {
    const user = getCookie('player_username'); 
    const pass = getCookie('player_password'); 
    if (!user || !pass || typeof window.clicks === 'undefined') return;

    try {
        const fullData = {
            owned: window.owned || { t1:0, t2:0, t3:0, t4:0, t5:0, t6:0, t7:0, t8:0, t9:0, t10:0 },
            rbUpgrades: window.rbUpgrades || { cpsLvl: 0, tierMasteryLvl: 0, rebirthCoinLvl: 0, autoT1Unlocked: false, autoT1On: false }
        };

        await _supabase
            .from('leaderboard')
            .update({ 
                clicks: Math.floor(window.clicks), 
                rebirths: window.rebirthCoins || 0,
                game_data: JSON.stringify(fullData),
                updated_at: new Date()
            })
            .eq('username', user)
            .eq('password', pass);
        
        console.log("cloud sync successful! 🔥");
    } catch (e) {
        console.error("sync error 💀", e);
    }
};

window.updateRBUI = function() {
    if (!window.rbUpgrades) return;

    const cpsLvl = window.rbUpgrades.cpsLvl || 0;
    const cpsLvlEl = document.getElementById('rb-lvl-1');
    if (cpsLvlEl) cpsLvlEl.innerText = cpsLvl;
    const cpsBtn = document.getElementById('rb-upgrade-1');
    if (cpsBtn) {
        cpsBtn.disabled = window.rebirthCoins < 1 || cpsLvl >= 5;
        cpsBtn.innerText = cpsLvl >= 5 ? "MAXED" : "buy (1 RC)";
    }

    const autoBtn = document.getElementById('rb-upgrade-2');
    const autoToggle = document.getElementById('auto-t1-toggle');
    const autoUnlocked = window.rbUpgrades.autoT1Unlocked || false;
    if (autoBtn) {
        if (autoUnlocked) {
            autoBtn.innerText = "UNLOCKED";
            autoBtn.disabled = true;
            if (autoToggle) autoToggle.disabled = false;
        } else {
            autoBtn.disabled = window.rebirthCoins < 5;
            autoBtn.innerText = "unlock (5 RC)";
            if (autoToggle) autoToggle.disabled = true;
        }
    }
    if (autoToggle) autoToggle.checked = window.rbUpgrades.autoT1On || false;

    const masteryLvl = window.rbUpgrades.tierMasteryLvl || 0;
    const masteryLvlEl = document.getElementById('rb-lvl-3');
    if (masteryLvlEl) masteryLvlEl.innerText = masteryLvl;
    const masteryBtn = document.getElementById('rb-upgrade-3');
    if (masteryBtn) {
        masteryBtn.disabled = window.rebirthCoins < 2 || masteryLvl >= 5;
        masteryBtn.innerText = masteryLvl >= 5 ? "MAXED" : "buy (2 RC)";
    }

    const RBLvl = window.rbUpgrades.rebirthCoinLvl || 0;
    const RBLvlEl = document.getElementById('rb-lvl-4');
    if (RBLvlEl) RBLvlEl.innerText = RBLvl;
    const rebirthCoinBtn = document.getElementById('rb-upgrade-4');
    if (rebirthCoinBtn) {
        const nextCost = RBLvl < 3 ? rebirthCoinCosts[RBLvl] : null;
        rebirthCoinBtn.disabled = RBLvl >= 3 || window.rebirthCoins < (nextCost || 999999);
        rebirthCoinBtn.innerText = RBLvl >= 3 ? "MAXED" : `buy (${nextCost} RC)`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const up1 = document.getElementById('rb-upgrade-1');
    if (up1) up1.onclick = () => {
        if (window.rebirthCoins >= 1 && window.rbUpgrades.cpsLvl < 5) {
            window.rebirthCoins -= 1; window.rbUpgrades.cpsLvl++;
            if (window.updateUI) window.updateUI(); window.updateRBUI();
        }
    };

    const up2 = document.getElementById('rb-upgrade-2');
    if (up2) up2.onclick = () => {
        if (window.rebirthCoins >= 5 && !window.rbUpgrades.autoT1Unlocked) {
            window.rebirthCoins -= 5; window.rbUpgrades.autoT1Unlocked = true;
            if (window.updateUI) window.updateUI(); window.updateRBUI();
        }
    };

    const up3 = document.getElementById('rb-upgrade-3');
    if (up3) up3.onclick = () => {
        if (window.rebirthCoins >= 2 && window.rbUpgrades.tierMasteryLvl < 5) {
            window.rebirthCoins -= 2; window.rbUpgrades.tierMasteryLvl++;
            if (window.updateUI) window.updateUI(); window.updateRBUI();
        }
    };

    const up4 = document.getElementById('rb-upgrade-4');
    if (up4) up4.onclick = () => {
        const RBLvl = window.rbUpgrades.rebirthCoinLvl || 0;
        if (RBLvl < 3 && window.rebirthCoins >= rebirthCoinCosts[RBLvl]) {
            window.rebirthCoins -= rebirthCoinCosts[RBLvl]; window.rbUpgrades.rebirthCoinLvl++;
            if (window.updateUI) window.updateUI(); window.updateRBUI();
        }
    };

    const toggle = document.getElementById('auto-t1-toggle');
    if (toggle) toggle.onchange = (e) => {
        window.rbUpgrades.autoT1On = e.target.checked;
        window.updateRBUI();
    };

    window.updateRBUI();
});

// ⚡ auto-buyer logic
setInterval(() => {
    if (window.resetting) return;
    if (window.rbUpgrades && window.rbUpgrades.autoT1Unlocked && window.rbUpgrades.autoT1On) {
        if (window.buy) window.buy(1, 50, 't1'); 
    }
}, 2000);

// cloud sync heartbeat
setInterval(() => {
    if (!window.resetting && window.syncToLeaderboard && window.cloudDataReady) {
        window.syncToLeaderboard();
    }
}, 15000);

setInterval(() => { window.updateRBUI(); }, 500);
