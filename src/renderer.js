document.addEventListener("DOMContentLoaded", () => {
  // Navigation
  const navButtons = document.querySelectorAll(".nav-button");
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.getAttribute("data-page");
      location.href = `${page}.html`;
    });
  });

  const launchButton = document.getElementById("launch-button");
  const loadingSpinner = document.getElementById("loading-spinner");

  if (launchButton) {
    launchButton.addEventListener("click", () => {
      launchButton.style.display = "none";
      loadingSpinner.style.display = "block";
      window.electronAPI.launchMinecraft();
    });
  }

  // Konsolen-Logs anzeigen
  window.electronAPI.onMinecraftLog((event, message) => {
    const consoleOutput = document.getElementById("console-output");
    consoleOutput.textContent += message + "\n";
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  });

  // Fortschrittsanzeige aktualisieren
  window.electronAPI.onMinecraftProgress((event, percentage) => {
    const progressBar = document.getElementById("progress-bar");
    progressBar.value = percentage;
  });

  // Nach Spielstart Spinner entfernen
  window.electronAPI.onMinecraftLog((event, message) => {
    if (message.includes("Launching")) {
      loadingSpinner.style.display = "none";
    }
  });

  // Einstellungen speichern
  const settingsForm = document.getElementById("settings-form");
  if (settingsForm) {
    settingsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const settings = {
        modsPath: document.getElementById("mods-path").value,
        launcherPath: document.getElementById("launcher-path").value,
        ramMin: document.getElementById("ram-min").value,
        ramMax: document.getElementById("ram-max").value,
      };
      window.electronAPI.saveSettings(settings);
      alert("Einstellungen gespeichert!");
    });

    // Einstellungen laden
    window.electronAPI.loadSettings().then((settings) => {
      document.getElementById("mods-path").value = settings.modsPath || "";
      document.getElementById("launcher-path").value =
        settings.launcherPath || "";
      document.getElementById("ram-min").value = settings.ramMin || "";
      document.getElementById("ram-max").value = settings.ramMax || "";
    });
  }

  window.electronAPI.onUpdateAvailable((event, info) => {
    // Informiere den Benutzer, dass ein Update verfügbar ist
    console.log("Update verfügbar:", info);
    // Hier kannst du eine Benachrichtigung oder einen visuellen Hinweis einblenden
  });

  window.electronAPI.onDownloadProgress((event, progressObj) => {
    // Aktualisiere eine Fortschrittsanzeige im UI
    console.log("Download-Fortschritt:", progressObj.percent);
  });

  window.electronAPI.onUpdateDownloaded((event, info) => {
    // Informiere den Benutzer, dass das Update installiert wird
    console.log("Update wird installiert in 15 Sekunden...", info);
  });
});
