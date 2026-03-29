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

window.rebirth = async function() {
    const requirement = 1000000; 
    const currentClicks = window.clicks || 0;
    
    if (currentClicks >= requirement) {
        window.resetting = true;
        const earned = 1 + (window.rbUpgrades.rebirthCoinLvl || 0);
        window.rebirthCoins += earned;
        window.clicks = 0;
        window.owned = { t1:0, t2:0, t3:0, t4:0, t5:0, t6:0, t7:0, t8:0, t9:0, t10:0 };
        
        if (window.updateUI) window.updateUI();
        window.updateRBUI();
        
        await window.syncToLeaderboard(true); 
        alert(`rebirth successful! earned ${earned} rc 🏆`);
        window.resetting = false;
        location.reload(); 
    } else {
        alert(`not enough clicks bro 💀 you have ${Math.floor(currentClicks).toLocaleString()}`);
    }
};

window.syncToLeaderboard = async function(isRebirth = false) {
    const user = getCookie('player_username'); 
    const pass = getCookie('player_password'); 
    if (!user || !pass || typeof window.clicks === 'undefined') return;

    try {
        const cleanTiers = { t1:0, t2:0, t3:0, t4:0, t5:0, t6:0, t7:0, t8:0, t9:0, t10:0 };
        const dataToSync = {
            owned: isRebirth ? cleanTiers : window.owned,
            rbUpgrades: window.rbUpgrades
        };

        await _supabase
            .from('leaderboard')
            .update({ 
                clicks: isRebirth ? 0 : Math.floor(window.clicks), 
                rebirths: window.rebirthCoins, 
                game_data: JSON.stringify(dataToSync),
                updated_at: new Date()
            })
            .eq('username', user)
            .eq('password', pass);
    } catch (e) {
        console.error("sync error 💀", e);
    }
};

window.updateRBUI = function() {
    const rcDisplay = document.getElementById('rebirth-coins'); 
    if (rcDisplay) rcDisplay.innerText = window.rebirthCoins;

    if (!window.rbUpgrades) return;

    // Helper: show 'x/y' (e.g. 5/5)
    const updateCard = (lvl, btnId, txtId, max, cost) => {
        const btn = document.getElementById(btnId);
        const txt = document.getElementById(txtId);
        if (txt) {
            txt.innerText = lvl + "/" + max;
        }
        if (btn) {
            if (lvl >= max) {
                btn.disabled = true;
                btn.innerText = "maxed";
            } else {
                btn.disabled = window.rebirthCoins < cost;
                btn.innerText = `buy (${cost} rc)`;
            }
        }
    };

    // card 1: insane cps
    updateCard(window.rbUpgrades.cpsLvl, 'rb-upgrade-1', 'rb-lvl-1', 5, 1);
    
    // card 2: tier mastery
    updateCard(window.rbUpgrades.tierMasteryLvl, 'rb-upgrade-2', 'rb-lvl-2', 5, 2);
    
    // card 3: 2x rebirth coins
    updateCard(window.rbUpgrades.rebirthCoinLvl, 'rb-upgrade-3', 'rb-lvl-3', 3, 2);

    // card 4: auto-buy t1
    const autoBtn = document.getElementById('rb-upgrade-4');
    const autoToggle = document.getElementById('auto-t1-toggle');
    if (autoBtn) {
        if (window.rbUpgrades.autoT1Unlocked) {
            autoBtn.innerText = window.rbUpgrades.autoT1On ? "active" : "unlocked";
            autoBtn.disabled = false;
            if (autoToggle) {
                autoToggle.disabled = false;
                autoToggle.checked = !!window.rbUpgrades.autoT1On;
            }
        } else {
            autoBtn.disabled = window.rebirthCoins < 5;
            autoBtn.innerText = "unlock (5 rc)";
            if (autoToggle) {
                autoToggle.disabled = true;
                autoToggle.checked = false;
            }
        }
    }

    const mainRBBtn = document.getElementById('rebirth-action');
    if (mainRBBtn) {
        mainRBBtn.disabled = (window.clicks || 0) < 1000000;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const mainRBBtn = document.getElementById('rebirth-action');
    if (mainRBBtn) mainRBBtn.onclick = () => window.rebirth();

    // 🖱️ click logic for all 3 level-based upgrades
    const handleBuy = async (btnId, key, cost, max) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.onclick = async () => {
                if (window.rebirthCoins >= cost && window.rbUpgrades[key] < max) {
                    window.rebirthCoins -= cost;
                    window.rbUpgrades[key]++;
                    if (window.updateUI) window.updateUI(); 
                    window.updateRBUI();
                    await window.syncToLeaderboard(false); // instant cloud save
                }
            };
        }
    };

    handleBuy('rb-upgrade-1', 'cpsLvl', 1, 5);
    handleBuy('rb-upgrade-2', 'tierMasteryLvl', 2, 5);
    handleBuy('rb-upgrade-3', 'rebirthCoinLvl', 2, 3);

    // auto-buy t1 unlock/activate logic
    const up4 = document.getElementById('rb-upgrade-4');
    const autoToggle = document.getElementById('auto-t1-toggle');
    if (up4) {
        up4.onclick = async () => {
            if (!window.rbUpgrades.autoT1Unlocked && window.rebirthCoins >= 5) {
                window.rebirthCoins -= 5;
                window.rbUpgrades.autoT1Unlocked = true;
                window.rbUpgrades.autoT1On = true;
                window.updateRBUI();
                await window.syncToLeaderboard(false);
            } else if (window.rbUpgrades.autoT1Unlocked) {
                window.rbUpgrades.autoT1On = !window.rbUpgrades.autoT1On;
                window.updateRBUI();
                await window.syncToLeaderboard(false);
            }
        };
    }
    if (autoToggle) {
        autoToggle.onchange = async () => {
            if (window.rbUpgrades.autoT1Unlocked) {
                window.rbUpgrades.autoT1On = autoToggle.checked;
                window.updateRBUI();
                await window.syncToLeaderboard(false);
            }
        };
    }

    window.updateRBUI();
});

setInterval(() => {
    if (!window.resetting && window.syncToLeaderboard && window.cloudDataReady) {
        window.syncToLeaderboard(false);
    }
}, 15000);

setInterval(() => { window.updateRBUI(); }, 500);

// --- AUTO-BUY T1 LOGIC ---
setInterval(() => {
    if (
        window.rbUpgrades &&
        window.rbUpgrades.autoT1Unlocked &&
        window.rbUpgrades.autoT1On &&
        window.owned &&
        typeof window.clicks === 'number'
    ) {
        // Find T1 tier info (cost, id)
        const t1 = { id: 't1', power: 1, cost: 50 };
        if (window.clicks >= t1.cost) {
            window.clicks -= t1.cost;
            window.owned.t1 = (window.owned.t1 || 0) + 1;
            if (window.updateUI) window.updateUI();
        }
    }
}, 2000);