// 🚨 failsafe: ensure globals exist so the script doesn't brick 💀
window.rebirthCoins = window.rebirthCoins || 0;
window.rbUpgrades = { cpsLvl: 0, tierMasteryLvl: 0, rebirthCoinLvl: 0, coinGainLvl: 0, autoT1Unlocked: false, autoT1On: false, ...(window.rbUpgrades || {}) };
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

// 💰 calculation logic for coin gain scaling tiers
function getCoinGainConfig(level) {
    switch(level) {
        case 1: return { max: 3, rate: 1000000 };  // 3 coins at 3M
        case 2: return { max: 7, rate: 1000000 };  // 7 coins at 7M
        case 3: return { max: 10, rate: 1000000 }; // 10 coins at 10M
        case 4: return { max: 15, rate: 1000000 }; // 15 coins at 15M
        case 5: return { max: 25, rate: 1000000 }; // 25 coins at 25M
        default: return { max: 1, rate: 1000000 };  // Tier 0: 1 coin per 1M
    }
}

function calculateEarnedCoins(clicks, level) {
    const { max, rate } = getCoinGainConfig(level);
    const baseEarned = Math.min(Math.floor(clicks / rate), max);
    const multiplier = 1 + (window.rbUpgrades?.rebirthCoinLvl || 0);
    return baseEarned * multiplier;
}

function getCoinGainMinClicks(level) {
    return getCoinGainConfig(level).rate;
}

window.rebirth = async function() {
    const currentClicks = window.clicks || 0;
    const level = window.rbUpgrades.coinGainLvl || 0;
    const earned = calculateEarnedCoins(currentClicks, level);
    
    const minRate = getCoinGainMinClicks(level);

    if (currentClicks >= minRate && earned >= 1) {
        window.resetting = true;
        window.rebirthCoins += earned;
        window.clicks = 0;
        window.owned = { t1:0, t2:0, t3:0, t4:0, t5:0, t6:0, t7:0, t8:0, t9:0, t10:0 };
        
        if (window.updateUI) window.updateUI();
        window.updateRBUI();
        
        await window.syncToLeaderboard(true); 
        alert(`rebirth successful! earned ${earned} RB 🏆`);
        window.resetting = false;
        location.reload(); 
    } else {
        alert(`not enough clicks bro you need at least ${minRate.toLocaleString()} for 1 coin at your current tier!`);
    }
};

window.syncToLeaderboard = async function(isRebirth = false) {
    const user = getCookie('player_username'); 
    const pass = getCookie('player_password'); 
    if (!user || !pass || typeof window.clicks === 'undefined') return;

    try {
        const supabaseClient = window._supabase;
        if (!supabaseClient) {
            console.error('sync error 💀 no Supabase client available');
            return;
        }

        const cleanTiers = { t1:0, t2:0, t3:0, t4:0, t5:0, t6:0, t7:0, t8:0, t9:0, t10:0 };
        const dataToSync = {
            owned: isRebirth ? cleanTiers : window.owned,
            rbUpgrades: window.rbUpgrades
        };

        await supabaseClient
            .from('leaderboard')
            .update({ 
                clicks: isRebirth ? 0 : Math.floor(window.clicks), 
                rebirths: window.rebirthCoins, 
                game_data: JSON.stringify(dataToSync),
                updated_at: new Date()
            })
            .eq('username', user)
            .eq('password', pass);
    } catch (e) { console.error("sync error 💀", e); }
};

window.updateRBUI = function() {
    const rcDisplay = document.getElementById('rebirth-coins'); 
    if (rcDisplay) rcDisplay.innerText = window.rebirthCoins;

    if (!window.rbUpgrades) return;

    // helper function to update each card's button and text
    const updateCard = (lvl, btnId, txtId, max, costs) => {
        const btn = document.getElementById(btnId);
        const txt = document.getElementById(txtId);
        if (txt) txt.innerText = lvl + "/" + max;
        
        if (btn) {
            // handle both single costs and arrays of costs
            const cost = Array.isArray(costs) ? (costs[lvl] || costs[costs.length - 1]) : costs;
            
            if (lvl >= max) {
                btn.disabled = true;
                btn.innerText = "maxed";
            } else {
                btn.disabled = window.rebirthCoins < cost;
                btn.innerText = `buy (${cost} RB)`;
            }
        }
    };

    updateCard(window.rbUpgrades.cpsLvl, 'rb-upgrade-1', 'rb-lvl-1', 5, 1);
    updateCard(window.rbUpgrades.tierMasteryLvl, 'rb-upgrade-2', 'rb-lvl-2', 5, 2);
    updateCard(window.rbUpgrades.rebirthCoinLvl, 'rb-upgrade-3', 'rb-lvl-3', 3, 2);
    
    // 🆕 new card 5: coin gain scaling
    const coinGainCosts = [7, 15, 30, 50, 50]; 
    updateCard(window.rbUpgrades.coinGainLvl || 0, 'rb-upgrade-5', 'rb-lvl-5', 5, coinGainCosts);

    // rebirth reward preview
    const rewardText = document.getElementById('rebirth-reward-text');
    if (rewardText) {
        const level = window.rbUpgrades.coinGainLvl || 0;
        const earned = calculateEarnedCoins(window.clicks || 0, level);
        const minClicks = getCoinGainMinClicks(level);
        const coinLabel = earned === 1 ? 'coin' : 'coins';

        if (earned >= 1) {
            rewardText.innerText = `gives +${earned} rebirth ${coinLabel}`;
        } else {
            rewardText.innerText = `need ${minClicks.toLocaleString()} clicks for 1 coin`;
        }
    }

    // auto-buy t1 card
    const autoBtn = document.getElementById('rb-upgrade-4');
    const autoToggle = document.getElementById('auto-t1-toggle');
    if (autoBtn) {
        if (window.rbUpgrades.autoT1Unlocked) {
            autoBtn.innerText = window.rbUpgrades.autoT1On ? "active" : "unlocked";
            autoBtn.disabled = false;
        } else {
            autoBtn.disabled = window.rebirthCoins < 5;
            autoBtn.innerText = "unlock (5 RB)";
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const mainRBBtn = document.getElementById('rebirth-action');
    if (mainRBBtn) mainRBBtn.onclick = () => window.rebirth();

    const handleBuy = async (btnId, key, costs, max) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.onclick = async () => {
                const currentLvl = window.rbUpgrades[key] || 0;
                const cost = Array.isArray(costs) ? (costs[currentLvl] || costs[costs.length - 1]) : costs;
                
                if (window.rebirthCoins >= cost && currentLvl < max) {
                    window.rebirthCoins -= cost;
                    window.rbUpgrades[key] = currentLvl + 1;
                    if (window.updateUI) window.updateUI(); 
                    window.updateRBUI();
                    await window.syncToLeaderboard(false);
                }
            };
        }
    };

    handleBuy('rb-upgrade-1', 'cpsLvl', 1, 5);
    handleBuy('rb-upgrade-2', 'tierMasteryLvl', 2, 5);
    handleBuy('rb-upgrade-3', 'rebirthCoinLvl', 2, 3);
    
    // 🆕 shop 5: coin gain click handler
    handleBuy('rb-upgrade-5', 'coinGainLvl', [7, 15, 30, 50, 50], 5);

    const up4 = document.getElementById('rb-upgrade-4');
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

    window.updateRBUI();
});

setInterval(() => { window.updateRBUI(); }, 500);

// --- AUTO-BUY T1 LOGIC ---
setInterval(() => {
    if (window.rbUpgrades?.autoT1Unlocked && window.rbUpgrades?.autoT1On && window.owned && typeof window.clicks === 'number') {
        const t1Cost = 50;
        if (window.clicks >= t1Cost) {
            window.clicks -= t1Cost;
            window.owned.t1 = (window.owned.t1 || 0) + 1;
            if (window.updateUI) window.updateUI();
        }
    }
}, 2000);