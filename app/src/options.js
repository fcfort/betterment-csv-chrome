// Saves options to chrome.storage.sync.
function save_options() {
  chrome.storage.sync.set({
    csvOutputDesired: get_button_state('csv'),
    qifOutputDesired: get_button_state('qif'),
    combinedOutputDesired: get_button_state('combined'),
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get(
      {
        csvOutputDesired: true,
        qifOutputDesired: false,
        combinedOutputDesired: false,
      },
      function(items) {
        set_button_state('csv', items.csvOutputDesired);
        set_button_state('qif', items.qifOutputDesired);
        set_button_state('combined', items.combinedOutputDesired);
      });
}

function get_button_state(id) {
  return document.getElementById(id).checked;
}

function set_button_state(id, value) {
  document.getElementById(id).checked = value;
}

document.addEventListener('DOMContentLoaded', restore_options);

// Note: getElementsByClassName returns an HTMLCollection, not an array.
Array.prototype.forEach.call(
    document.getElementsByClassName('saveOnClick'), function(el) {
      el.addEventListener('click', save_options);
    });
