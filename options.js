// Saves options to chrome.storage
function save_options() {
    var rules = document.getElementById('rules').value;

    localStorage.setItem('rules', rules);

    alert('rules saved');
}


function restore_options() {
    document.getElementById('rules').value = localStorage.getItem('rules') || '';
}

document.addEventListener('DOMContentLoaded', restore_options);

document.getElementById('save').addEventListener('click',
    save_options);