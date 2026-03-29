// menu toggle logic
document.getElementById('toggle-settings').onclick = function() {
    const menu = document.getElementById('menu');
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    
    // update the account text every time the menu opens just to be safe
    if (window.updateAccountStatus) window.updateAccountStatus();
};

// reset button logic
document.getElementById('reset-game').onclick = function() {
    if (confirm("rip your progress 2026-2026. i hope that 1 coin was worth it!")) {
        if (typeof window.fullReset === 'function') {
            window.fullReset();
        } else {
            window.resetting = true;
            if (typeof window.stopAutoBuyer === 'function') {
                window.stopAutoBuyer();
            }
            localStorage.clear();
            location.reload();
        }
    }
};

// 🚪 logout button logic (link it to account.js)
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.onclick = function() {
        if (window.auth && typeof window.auth.logout === 'function') {
            window.auth.logout();
        } else {
            // fallback if account.js isn't loaded for some reason
            localStorage.clear();
            location.reload();
        }
    };
}