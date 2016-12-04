// Saves options to chrome.storage.sync.
function save_options() {
  var csvOutputDesired = document.getElementById('csv').checked;
  var qifOutputDesired = document.getElementById('qif').checked;

  chrome.storage.sync.set({
    csvOutputDesired: csvOutputDesired,
    qifOutputDesired: qifOutputDesired
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get({
    csvOutputDesired: true,
    qifOutputDesired: false
  }, function(items) {
    document.getElementById('csv').checked = items.csvOutputDesired;
    document.getElementById('qif').checked = items.qifOutputDesired;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
var elms = document.getElementsByClassName('saveOnClick');
for(var i = 0; i < elms.length; i++) {
  elms[i].addEventListener('click', save_options);
};
