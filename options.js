// Saves options to chrome.storage
function save_options() {
    var rules = document.getElementById('rules').value;

    chrome.storage.sync.set({
        rules: rulesString,
    }, function () {
        alert('Options Saved');
    });
}


function restore_options() {
    chrome.storage.sync.get({
        rules: '',
    }, function (items) {
        document.getElementById('rules').value = items.rules;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);