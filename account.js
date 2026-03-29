const SB_URL = 'https://hrmnvtbpjjpsxmhtacgz.supabase.co';
const SB_KEY = 'sb_publishable_jlbV4rkPHukjiGew8jV9Mw_k2Mo4_rg';
const _supabase = supabase.createClient(SB_URL, SB_KEY);

// 🍪 cookie helpers
function setCookie(name, value, days = 7) {
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

window.auth = {
    signUp: async function(user, pass) {
        if (user.length < 3 || pass.length < 4) {
            alert("bro, name 3+ chars, pass 4+ chars!");
            return;
        }

        const { data: existing, error: checkError } = await _supabase
            .from('leaderboard')
            .select('username')
            .eq('username', user)
            .single();

        if (checkError && checkError.code !== 'PGRST116') return;

        if (existing) {
            alert("name taken 💀 try another one");
            return;
        }

        const { error } = await _supabase.from('leaderboard').insert([
            { username: user, password: pass, clicks: 0, rebirths: 0 }
        ]);

        if (!error) {
            setCookie('player_username', user);
            setCookie('player_password', pass);
            location.reload();
        }
    },

    login: async function(user, pass) {
        const { data, error } = await _supabase
            .from('leaderboard')
            .select('*')
            .eq('username', user)
            .eq('password', pass)
            .single();

        if (data) {
            setCookie('player_username', data.username);
            setCookie('player_password', data.password);
            
            // 🛠️ recover data from cloud or local session
            let cloudTiers = null;
            let cloudUpgrades = null;

            // check if the new game_data column has our buildings
            if (data.game_data) {
                try {
                    const parsedDB = typeof data.game_data === 'string' ? JSON.parse(data.game_data) : data.game_data;
                    if (parsedDB.owned) cloudTiers = parsedDB.owned;
                    if (parsedDB.rbUpgrades) cloudUpgrades = parsedDB.rbUpgrades;
                } catch(e) { console.error("couldn't parse cloud data 💀"); }
            }

            // if cloud is empty, try to grab from existing guest cookie so they don't lose progress on first login
            let currentTiers = cloudTiers || { t1:0, t2:0, t3:0, t4:0, t5:0, t6:0, t7:0, t8:0, t9:0, t10:0 };
            let currentUpgrades = cloudUpgrades || { cpsLvl: 0, tierMasteryLvl: 0, rebirthCoinLvl: 0, autoT1Unlocked: false, autoT1On: false };

            if (!cloudTiers) {
                const existingCookie = getCookie('sim_session_data');
                if (existingCookie) {
                    try {
                        const parsed = JSON.parse(existingCookie);
                        if (parsed.data && parsed.data.owned) currentTiers = parsed.data.owned;
                        if (parsed.data && parsed.data.rbUpgrades) currentUpgrades = parsed.data.rbUpgrades;
                    } catch(e) {}
                }
            }

            const saveData = {
                clicks: data.clicks || 0,
                owned: currentTiers,
                rebirthCoins: data.rebirths || 0,
                rbUpgrades: currentUpgrades
            };
            
            const SECRET_SALT = 'a7f3k9l2m5n8p1q4';
            let str = JSON.stringify(saveData) + SECRET_SALT;
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
            }
            
            setCookie('sim_session_data', JSON.stringify({ data: saveData, hash: hash }));
            
            window.cloudDataReady = true; 
            location.reload();
        } else {
            alert("wrong login bro 💀");
        }
    },

    logout: function() {
        if (confirm("bro 💀 logout resets progress as a guest! you sure?")) {
            document.cookie = "player_username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "player_password=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "sim_session_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            localStorage.clear();
            location.reload();
        }
    }
};

window.updateAccountStatus = function() {
    const status = document.getElementById('account-status');
    const user = getCookie('player_username');
    const userInp = document.getElementById('acc-user');
    const passInp = document.getElementById('acc-pass');
    const authBtns = document.getElementById('auth-buttons');
    const logoutBtn = document.getElementById('logout-btn');

    if (user) {
        if (status) status.innerText = `logged in as ${user} ✨`;
        if (userInp) userInp.style.display = 'none';
        if (passInp) passInp.style.display = 'none';
        if (authBtns) authBtns.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
    } else {
        if (status) status.innerText = 'no account found';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userInp) userInp.style.display = 'block';
        if (passInp) passInp.style.display = 'block';
        if (authBtns) authBtns.style.display = 'block';
    }
};

document.addEventListener('DOMContentLoaded', window.updateAccountStatus);