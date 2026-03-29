const SB_URL = 'https://hrmnvtbpjjpsxmhtacgz.supabase.co';
const SB_KEY = 'sb_publishable_jlbV4rkPHukjiGew8jV9Mw_k2Mo4_rg';
const _supabase = supabase.createClient(SB_URL, SB_KEY);

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

        if (checkError && checkError.code !== 'PGRST116') {
            console.error(checkError.message);
            return;
        }

        if (existing) {
            alert("name taken 💀 try another one");
            return;
        }

        const { error } = await _supabase.from('leaderboard').insert([
            { username: user, password: pass, clicks: 0, rebirths: 0 }
        ]);

        if (!error) {
            localStorage.setItem('player_username', user);
            localStorage.setItem('player_password', pass);
            location.reload();
        } else {
            console.error(error.message);
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
            localStorage.setItem('player_username', data.username);
            localStorage.setItem('player_password', data.password);
            // sync stats from DB to local so they don't lose progress
            localStorage.setItem('sim_clicks', data.clicks);
            localStorage.setItem('sim_rebirths', data.rebirths);
            location.reload();
        } else {
            alert("wrong login bro 💀");
            if (error) console.error(error.message);
        }
    },

    // 🚪 logout logic added!
    logout: function() {
        if (confirm("bro 💀 you sure you want to log out?")) {
            localStorage.clear(); // wipes session AND local progress
            location.reload();
        }
    }
};

window.updateAccountStatus = function() {
    const status = document.getElementById('account-status');
    const user = localStorage.getItem('player_username');
    const userInp = document.getElementById('acc-user');
    const passInp = document.getElementById('acc-pass');
    const authBtns = document.getElementById('auth-buttons'); // wrap your btns in a div with this ID!
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
    }
};

document.addEventListener('DOMContentLoaded', window.updateAccountStatus);