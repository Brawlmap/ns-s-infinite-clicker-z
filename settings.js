// ⚙️ menu toggle logic
document.getElementById('toggle-settings').onclick = function() {
    const menu = document.getElementById('menu');
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    
    // sync the account text (logged in as...) when opening the menu
    if (window.updateAccountStatus) {
        window.updateAccountStatus();
    }
};

// 🧹 full reset button logic (nukes everything)
document.getElementById('reset-game').onclick = function() {
    if (confirm("rip your progress 2026-2026. i hope that 1 coin was worth it!")) {
        // kill the game data cookie (the important one)
        document.cookie = "sim_session_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
        // kill everything else just in case
        localStorage.clear();
        
        window.resetting = true;
        location.reload();
    }
};

// 🚪 logout button logic
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.onclick = function() {
        if (window.auth && typeof window.auth.logout === 'function') {
            // this calls the logout in account.js which clears cookies + account info
            window.auth.logout();
        } else {
            // fallback: if account.js is broken, at least we manually nuke the session
            document.cookie = "player_username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "player_password=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "sim_session_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            localStorage.clear();
            location.reload();
        }
    };
}