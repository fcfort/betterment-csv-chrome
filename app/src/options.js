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

function load_combined_downloads() {
  const linksDiv = document.getElementById('combined_links');
  if (!linksDiv) {
    console.error("Element with ID 'combined_links' not found.");
    return;
  }
  chrome.storage.local.get(['combined_csv', 'combined_qif'], function(items) {
    if (chrome.runtime.lastError) {
      console.error("Error loading combined downloads:", chrome.runtime.lastError);
      linksDiv.textContent = 'Error loading combined data.';
      return;
    }

    linksDiv.innerHTML = ''; // Clear existing links
    let hasData = false;

    if (items && items.combined_csv) {
      console.log("Found combined_csv", items.combined_csv);
      hasData = true;
      const link = createDownloadLink(items.combined_csv);
      linksDiv.appendChild(link);
    } else {
      console.log("No combined_csv found");
    }

    if (items && items.combined_qif) {
      console.log("Found combined_qif", items.combined_qif);
      hasData = true;
      const link = createDownloadLink(items.combined_qif);
      linksDiv.appendChild(link);
    } else {
      console.log("No combined_qif found");
    }

    if (!hasData) {
      linksDiv.textContent = 'No combined data available. Visit the Betterment Activity page to generate it.';
    }
  });
}

function createDownloadLink(fileData) {
  const a = document.createElement('a');
  if (!fileData.data || !fileData.mimetype) {
    console.error("Invalid fileData:", fileData);
    a.textContent = "Error: Invalid file data";
    return a;
  }

  try {
    const blob = new Blob([fileData.data], {type: fileData.mimetype});
    const url = URL.createObjectURL(blob);
    console.log("Created Blob URL:", url, "for", fileData.name, "type:", fileData.mimetype, "size:", blob.size);

    a.href = url;
    a.download = fileData.name;
    a.textContent = fileData.name;
    a.type = fileData.mimetype; // Add type hint

    a.addEventListener('click', function() {
      // Timeout to ensure the download has initiated
      setTimeout(function() {
        URL.revokeObjectURL(url);
        console.log("Revoked Blob URL:", url);
      }, 150);
    });
    return a;
  } catch (e) {
    console.error("Error creating Blob or Object URL:", e, fileData);
    a.textContent = "Error: Could not create download";
    return a;
  }
}

function clear_combined_data() {
  chrome.storage.local.remove(['combined_csv', 'combined_qif'], function() {
    console.log('Combined data cleared.');
    load_combined_downloads(); // Refresh the links display
  });
}

document.addEventListener('DOMContentLoaded', function() {
  restore_options();
  load_combined_downloads();
});

// Note: getElementsByClassName returns an HTMLCollection, not an array.
Array.prototype.forEach.call(
    document.getElementsByClassName('saveOnClick'), function(el) {
      el.addEventListener('click', save_options);
    });

document.getElementById('clear_combined').addEventListener('click', clear_combined_data);
