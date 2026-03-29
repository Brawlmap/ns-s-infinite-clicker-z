// 1. Data initialization
const defaultOwned = { t1:0, t2:0, t3:0, t4:0, t5:0, t6:0, t7:0, t8:0, t9:0, t10:0 };
let savedOwned = JSON.parse(localStorage.getItem('sim_owned')) || {};
let savedRbUpgrades = JSON.parse(localStorage.getItem('sim_rb_upgrades')) || {};

window.resetting = false;

// 🧠 THE OMNI-SHIELD CORE
const OmniShield = {
    lastTick: Date.now(),
    lastClick: 0,
    clickBuffer: 0, // detects auto-clicker patterns
    totalClicksThisSecond: 0,
    secondTracker: Date.now(),
    isFlagged: false
};

const internalState = {
    clicks: parseFloat(localStorage.getItem('sim_clicks')) || 0,
    autoPower: 0, 
    rebirthCoins: parseInt(localStorage.getItem('sim_rebirths')) || 0,
    owned: { ...defaultOwned, ...savedOwned },
    rbUpgrades: { cpsLvl: 0, tierMasteryLvl: 0, rebirthCoinLvl: 0, autoT1Unlocked: false, autoT1On: false, ...savedRbUpgrades },
};

function computeExpectedAutoPower() {
    return internalState.owned.t1 * 1 + internalState.owned.t2 * 3 + internalState.owned.t3 * 10 + 
           internalState.owned.t4 * 50 + internalState.owned.t5 * 500 + internalState.owned.t6 * 1000 + 
           internalState.owned.t7 * 2000 + internalState.owned.t8 * 10000 + internalState.owned.t9 * 25000 + 
           internalState.owned.t10 * 50000;
}

internalState.autoPower = computeExpectedAutoPower();

// 🛡️ smarter validation (no hard caps, just logic)
function validateGain(amount, type) {
    if (OmniShield.isFlagged) return 0;

    if (type === 'manual') {
        const now = Date.now();
        const diff = now - OmniShield.lastClick;
        
        // detect clicking faster than 25 times per second (impossible for humans)
        if (diff < 40) {
            OmniShield.clickBuffer++;
            if (OmniShield.clickBuffer > 10) {
                console.warn("shield: auto-clicker pattern detected 💀");
                return 0; 
            }
        } else {
            OmniShield.clickBuffer = Math.max(0, OmniShield.clickBuffer - 1);
        }
        
        OmniShield.lastClick = now;
    }
    return amount;
}

// Global API with Proxy Protection
const ownedProxy = new Proxy(internalState.owned, {
    set(target, key, value) {
        target[key] = Math.max(0, Math.trunc(value));
        internalState.autoPower = computeExpectedAutoPower();
        return true;
    }
});

Object.defineProperty(window, 'owned', { get() { return ownedProxy; }, set() { console.error("nice try 💀"); } });
Object.defineProperty(window, 'clicks', {
    get() { return internalState.clicks; },
    set(v) { 
        const diff = v - internalState.clicks;
        if (diff > 0) internalState.clicks += validateGain(diff, 'script');
        else internalState.clicks = v;
    }
});

const tiers = [
    { id: 't1', power: 1, cost: 50 }, { id: 't2', power: 3, cost: 150 },
    { id: 't3', power: 10, cost: 500 }, { id: 't4', power: 50, cost: 2500 },
    { id: 't5', power: 500, cost: 25000 }, { id: 't6', power: 1000, cost: 50000 },
    { id: 't7', power: 2000, cost: 100000 }, { id: 't8', power: 10000, cost: 500000 },
    { id: 't9', power: 25000, cost: 1250000 }, { id: 't10', power: 50000, cost: 2500000 }
];

window.updateUI = function() {
    document.getElementById('balance').innerText = Math.floor(internalState.clicks).toLocaleString();
    let multiplier = 1 + (internalState.rbUpgrades.cpsLvl * 0.1) + (internalState.rbUpgrades.tierMasteryLvl * 0.1);
    document.getElementById('cps').innerText = Math.floor(internalState.autoPower * multiplier).toLocaleString();
    document.getElementById('rebirth-coins').innerText = internalState.rebirthCoins.toLocaleString();

    tiers.forEach(t => {
        const btn = document.getElementById(`btn-${t.id}`);
        if (btn) btn.disabled = internalState.clicks < t.cost;
        const count = document.getElementById(`owned-${t.id}`);
        if (count) count.innerText = internalState.owned[t.id];
    });

    if (!window.resetting) {
        localStorage.setItem('sim_clicks', internalState.clicks);
        localStorage.setItem('sim_owned', JSON.stringify(internalState.owned));
        localStorage.setItem('sim_rebirths', internalState.rebirthCoins);
        localStorage.setItem('sim_rb_upgrades', JSON.stringify(internalState.rbUpgrades));
    }
};

window.buy = function(power, price, tierKey) {
    if (internalState.clicks >= price) {
        internalState.clicks -= price;
        internalState.owned[tierKey]++;
        internalState.autoPower = computeExpectedAutoPower();
        window.updateUI();
        return true; 
    }
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('clicker').onclick = () => {
        const gain = 1 + internalState.rebirthCoins;
        internalState.clicks += validateGain(gain, 'manual'); 
        window.updateUI();
    };

    tiers.forEach(t => {
        const btn = document.getElementById(`btn-${t.id}`);
        if (btn) btn.onclick = () => window.buy(t.power, t.cost, t.id);
    });

    document.getElementById('rebirth-action').onclick = () => {
        if (internalState.clicks >= 1000000) {
            internalState.rebirthCoins += (1 + (internalState.rbUpgrades.rebirthCoinLvl || 0));
            internalState.clicks = 0;
            Object.keys(internalState.owned).forEach(k => internalState.owned[k] = 0);
            internalState.autoPower = 0;
            window.updateUI();
            if (window.syncToLeaderboard) window.syncToLeaderboard();
        }
    };
    window.updateUI();
});

// ⚡ THE HEARTBEAT (Combined loop with Delta-Time)
setInterval(() => {
    if (window.resetting) return;

    const now = Date.now();
    const deltaTime = (now - OmniShield.lastTick) / 1000; // time in seconds
    OmniShield.lastTick = now;

    if (internalState.autoPower > 0) {
        let multiplier = 1 + (internalState.rbUpgrades.cpsLvl * 0.1) + (internalState.rbUpgrades.tierMasteryLvl * 0.1);
        let gain = (internalState.autoPower * multiplier) * deltaTime;
        
        // Anti-tamper: if gain is impossible for this timeframe, soft-reset current session
        if (gain > (internalState.autoPower * multiplier * 2)) { 
            console.error("Shield: Delta-Time violation 💀");
            internalState.clicks = parseFloat(localStorage.getItem('sim_clicks')) || 0;
        } else {
            internalState.clicks += gain;
        }
        
        document.getElementById('balance').innerText = Math.floor(internalState.clicks).toLocaleString();
    }

    // Reset total tracker every second
    if (now - OmniShield.secondTracker > 1000) {
        OmniShield.totalClicksThisSecond = 0;
        OmniShield.secondTracker = now;
    }
}, 50); // running at 20fps for super smooth gain