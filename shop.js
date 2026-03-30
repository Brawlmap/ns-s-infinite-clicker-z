// 1. cookie-based data initialization with checksum 🛡️
const SECRET_SALT = 'a7f3k9l2m5n8p1q4'; 
let memoryBackup = {}; 

// 🛑 HARD LOCK: This stays true until the cloud data is confirmed loaded
window.cloudDataReady = false; 

function setCookie(name, value, days = 365) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/;SameSite=Lax";
}

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

function computeChecksum(data) {
    let str = JSON.stringify(data) + SECRET_SALT;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

function secureSave() {
    // ✋ STOP! If cloud data hasn't finished loading, DO NOT OVERWRITE COOKIES.
    if (!window.cloudDataReady) return; 

    const saveData = {
        clicks: internalState.clicks,
        owned: internalState.owned,
        rebirthCoins: internalState.rebirthCoins,
        rbUpgrades: internalState.rbUpgrades
    };
    const checksum = computeChecksum(saveData);
    const finalData = JSON.stringify({ data: saveData, hash: checksum });
    
    setCookie('sim_session_data', finalData);
    memoryBackup = JSON.parse(JSON.stringify(saveData));
}

function secureLoad() {
    const cookieData = getCookie('sim_session_data');
    if (!cookieData) return null;
    
    try {
        const parsed = JSON.parse(cookieData);
        if (computeChecksum(parsed.data) != parsed.hash) {
            console.error("cookie tampering detected 💀");
            return null; 
        }
        return parsed.data;
    } catch(e) {
        return null;
    }
}

const defaultOwned = { t1:0, t2:0, t3:0, t4:0, t5:0, t6:0, t7:0, t8:0, t9:0, t10:0 };
const defaultRbUpgrades = { cpsLvl: 0, tierMasteryLvl: 0, rebirthCoinLvl: 0, coinGainLvl: 0, autoT1Unlocked: false, autoT1On: false };
let savedData = secureLoad() || {
    clicks: 0,
    owned: { ...defaultOwned },
    rebirthCoins: 0,
    rbUpgrades: { ...defaultRbUpgrades }
};

window.resetting = false;

const internalState = {
    clicks: savedData.clicks || 0,
    autoPower: 0, 
    rebirthCoins: savedData.rebirthCoins || 0,
    owned: { ...defaultOwned, ...savedData.owned },
    rbUpgrades: { ...defaultRbUpgrades, ...savedData.rbUpgrades }
};

const tiers = [
    { id: 't1', power: 1, cost: 50 }, { id: 't2', power: 3, cost: 150 },
    { id: 't3', power: 10, cost: 500 }, { id: 't4', power: 50, cost: 2500 },
    { id: 't5', power: 500, cost: 25000 }, { id: 't6', power: 1000, cost: 50000 },
    { id: 't7', power: 2000, cost: 100000 }, { id: 't8', power: 10000, cost: 500000 },
    { id: 't9', power: 25000, cost: 1250000 }, { id: 't10', power: 50000, cost: 2500000 }
];

function computeExpectedAutoPower() {
    return tiers.reduce((sum, t) => sum + ((internalState.owned[t.id] || 0) * t.power), 0);
}

internalState.autoPower = computeExpectedAutoPower();

// 🌉 GLOBAL BRIDGES
Object.defineProperty(window, 'owned', {
    get() { return internalState.owned; },
    set(v) {
        internalState.owned = v;
        secureSave();
    }
});

Object.defineProperty(window, 'clicks', {
    get() { return internalState.clicks; },
    set(v) { 
        internalState.clicks = Math.max(0, v);
        secureSave();
    }
});

Object.defineProperty(window, 'rebirthCoins', {
    get() { return internalState.rebirthCoins; },
    set(v) { 
        internalState.rebirthCoins = Math.max(0, Math.trunc(v)); 
        secureSave();
    }
});

Object.defineProperty(window, 'rbUpgrades', {
    get() { return internalState.rbUpgrades; },
    set(v) { 
        internalState.rbUpgrades = v; 
        secureSave();
    }
});

// 📺 UI Logic
window.updateUI = function() {
    const balEl = document.getElementById('balance');
    const cpsEl = document.getElementById('cps');
    const rbEl = document.getElementById('rebirth-coins');

    if (balEl) balEl.innerText = Math.floor(internalState.clicks).toLocaleString();
    
    let multiplier = 1 + (internalState.rbUpgrades.cpsLvl * 0.1) + (internalState.rbUpgrades.tierMasteryLvl * 0.1);
    if (cpsEl) cpsEl.innerText = Math.floor(internalState.autoPower * multiplier).toLocaleString();
    if (rbEl) rbEl.innerText = (internalState.rebirthCoins || 0).toLocaleString();

    tiers.forEach(t => {
        const btn = document.getElementById(`btn-${t.id}`);
        if (btn) {
            const canAfford = internalState.clicks >= t.cost;
            btn.disabled = !canAfford;
        }
        const countDisplay = document.getElementById(`owned-${t.id}`);
        if (countDisplay) countDisplay.innerText = (internalState.owned[t.id] || 0).toLocaleString();
    });
};

window.buy = function(power, price, tierKey) {
    if (internalState.clicks >= price) {
        internalState.clicks -= price;
        internalState.owned[tierKey] = (internalState.owned[tierKey] || 0) + 1;
        internalState.autoPower = computeExpectedAutoPower();
        secureSave(); // 🚨 FORCED SAVE ON PURCHASE
        window.updateUI();
        return true; 
    }
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    // 🔓 THE FIX: If player is logged in, we unlock saving after a small delay
    // to allow account.js to sync the clicks from the cloud first.
    if (getCookie('player_username')) {
        setTimeout(() => { window.cloudDataReady = true; }, 1000);
    } else {
        window.cloudDataReady = true; 
    }

    const clicker = document.getElementById('clicker');
    if (clicker) {
        clicker.onclick = () => {
            internalState.clicks += (1 + (internalState.rebirthCoins || 0));
            window.updateUI();
        };
    }

    tiers.forEach(t => {
        const btn = document.getElementById(`btn-${t.id}`);
        if (btn) btn.onclick = () => window.buy(t.power, t.cost, t.id);
    });
});

function getCoinGainConfig(level) {
    switch(level) {
        case 1: return { max: 3, rate: 1000000 };
        case 2: return { max: 7, rate: 1000000 };
        case 3: return { max: 10, rate: 1000000 };
        case 4: return { max: 15, rate: 1000000 };
        case 5: return { max: 25, rate: 1000000 };
        default: return { max: 1, rate: 1000000 };
    }
}

function calculateEarnedCoins(clicks, level) {
    const { max, rate } = getCoinGainConfig(level);
    return Math.min(Math.floor(clicks / rate), max);
}

function getCoinGainMinClicks(level) {
    return getCoinGainConfig(level).rate;
}

// ♻️ the rebirth function
window.rebirth = async function() {
    const currentClicks = window.clicks || 0;
    const level = (window.rbUpgrades && window.rbUpgrades.coinGainLvl) ? window.rbUpgrades.coinGainLvl : 0;
    const baseEarned = calculateEarnedCoins(currentClicks, level);
    const multiplier = 1 + (window.rbUpgrades?.rebirthCoinLvl || 0);
    const earned = baseEarned * multiplier;
    const minClicks = getCoinGainMinClicks(level);

    if (currentClicks >= minClicks && earned >= 1) {
        window.resetting = true; 
        
        const newTotalCoins = (window.rebirthCoins || 0) + earned;
        
        const resetData = {
            clicks: 0,
            owned: { t1:0, t2:0, t3:0, t4:0, t5:0, t6:0, t7:0, t8:0, t9:0, t10:0 },
            rebirthCoins: newTotalCoins,
            rbUpgrades: window.rbUpgrades
        };

        const checksum = computeChecksum(resetData);
        const finalCookieValue = JSON.stringify({ data: resetData, hash: checksum });

        window.clicks = 0;
        window.owned = resetData.owned;
        window.rebirthCoins = newTotalCoins;
        setCookie('sim_session_data', finalCookieValue);
        
        localStorage.clear(); 

        console.log("secure reset signed and ready 🚀");

        if (window.updateUI) window.updateUI();
        if (window.updateRBUI) window.updateRBUI();
        
        await window.syncToLeaderboard(); 
        
        alert(`rebirth successful! earned ${earned} RC 🏆\nall tiers reset to 0.`);
        
        window.resetting = false;
        location.reload(); 
    } else {
        alert(`not enough clicks! need ${minClicks.toLocaleString()} but you only have ${Math.floor(currentClicks).toLocaleString()} 💀`);
    }
};

// 🌐 cloud sync
window.syncToLeaderboard = async function() {
    const user = getCookie('player_username'); 
    const pass = getCookie('player_password'); 
    if (!user || !pass || typeof window.clicks === 'undefined') return;

    try {
        const supabaseClient = window._supabase;
        if (!supabaseClient) {
            console.error('cloud sync failed 💀 no Supabase client available');
            return;
        }

        const fullData = {
            owned: window.owned,
            rbUpgrades: window.rbUpgrades
        };

        const { error } = await supabaseClient
            .from('leaderboard')
            .update({ 
                clicks: Math.floor(window.clicks || 0), 
                rebirths: window.rebirthCoins,
                game_data: JSON.stringify(fullData),
                updated_at: new Date()
            })
            .eq('username', user)
            .eq('password', pass);
        
        if (error) throw error;
    } catch (e) {
        console.error("cloud sync failed 💀", e);
    }
};

// heartbeat sync while the user is logged in
setInterval(() => {
    if (window.cloudDataReady && getCookie('player_username')) {
        window.syncToLeaderboard();
    }
}, 15000);

// ... keep existing UI updates and event listeners below ...
window.updateUI();

setInterval(() => {
    if (window.resetting) return;
    if (internalState.autoPower > 0) {
        let multiplier = 1 + (internalState.rbUpgrades.cpsLvl * 0.1) + (internalState.rbUpgrades.tierMasteryLvl * 0.1);
        internalState.clicks += (internalState.autoPower * multiplier) * 0.1;
    }
    window.updateUI(); 
}, 100);