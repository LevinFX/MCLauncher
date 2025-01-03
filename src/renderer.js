document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const page = button.getAttribute('data-page');
            location.href = `${page}.html`;
        });
    });

    // Launch Minecraft Button
    const launchButton = document.getElementById('launch-button');
    if (launchButton) {
        launchButton.addEventListener('click', () => {
            window.electronAPI.launchMinecraft();
        });
    }

    // Einstellungen speichern
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const settings = {
                modsPath: document.getElementById('mods-path').value,
                launcherPath: document.getElementById('launcher-path').value,
                ramMin: document.getElementById('ram-min').value,
                ramMax: document.getElementById('ram-max').value,
            };
            window.electronAPI.saveSettings(settings);
            alert('Einstellungen gespeichert!');
        });

        // Einstellungen laden
        window.electronAPI.loadSettings().then((settings) => {
            document.getElementById('mods-path').value = settings.modsPath || '';
            document.getElementById('launcher-path').value = settings.launcherPath || '';
            document.getElementById('ram-min').value = settings.ramMin || '';
            document.getElementById('ram-max').value = settings.ramMax || '';
        });
    }
});
