// Saves options to chrome.storage
function save_options() {
    var rules = document.getElementById('rules').value;

    localStorage.setItem('rules', rules);

    alert('rules saved');
}


function restore_options() {
    document.getElementById('rules').value = localStorage.getItem('rules') || '';
    document.getElementById('blacklist').value = localStorage.getItem('blacklist') || '';
}

document.addEventListener('DOMContentLoaded', restore_options);

document.getElementById('save').addEventListener('click', save_options);
document.getElementById('saveBlacklist').addEventListener('click', save_blacklist);

function save_blacklist() {
    var blacklist = document.getElementById('blacklist').value;

    localStorage.setItem('blacklist', blacklist);

    alert('blacklist saved');
}
