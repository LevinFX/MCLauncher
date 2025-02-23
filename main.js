const { app, BrowserWindow, ipcMain, window } = require('electron');
const path = require('path');
const fs = require('fs');
const mcl = require('minecraft-launcher-core');
const { Auth } = require("msmc");
const {Downloader} = require("nodejs-file-downloader");
const Admzip = require('adm-zip');
let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.loadFile('src/index.html');

    ipcMain.handle('save-settings', (event, settings) => {
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    });

    ipcMain.handle('load-settings', () => {
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');
        if (fs.existsSync(settingsPath)) {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        return {};
    });

    async function downloadForge(){
        console.log("Forge wird heruntergeladen...");
        mainWindow.webContents.send('minecraft-log', "Forge wird heruntergeladen...");
        const downloader = new Downloader({
            url: "https://maven.minecraftforge.net/net/minecraftforge/forge/1.20.1-47.3.33/forge-1.20.1-47.3.33-installer.jar",
            directory: app.getPath('userData'),
            fileName: "forge_1_20_1.jar",
            cloneFiles: false,
            onProgress: function (percentage, chunk, remainingSize) {
                console.log(`${percentage}%`);
                console.log(`Remaining Bytes: ${remainingSize}`);
                mainWindow.webContents.send('minecraft-progress', percentage);

            }
        });

        try {
            await downloader.download();
            console.log(`Forge erfolgreich heruntergeladen!`);
            mainWindow.webContents.send('minecraft-log', "Forge wurde erfolgreich heruntergeladen...");
        } catch (error) {
            console.log(`Fehler beim Herunterladen von Forge: ${error}`);
            mainWindow.webContents.send('minecraft-log', `Fehler beim Herunterladen von Forge: ${error}`);
        }
    }

    function extractMods(){
        console.log("Mods werden entpackt...");
        mainWindow.webContents.send('minecraft-log', "Mods werden extrahiert...");
        var zip = new Admzip("./minecraft/mods/mods.zip");
        try {
            zip.extractAllTo("./minecraft/mods/", true);
            console.log("Mods erfolgreich entpackt!");
            mainWindow.webContents.send('minecraft-log', `Mods erfolgreich extrahiert!`);

        } catch (error) {
            console.log(`Fehler beim Entpacken der Mods: ${error}`);
            mainWindow.webContents.send('minecraft-log', `Fehler beim entpacken der Mods: ${error}`);

        }
        try {
            fs.unlinkSync("./minecraft/mods/mods.zip");
            console.log("Zip-Datei gelöscht!");
            mainWindow.webContents.send('minecraft-log', `Zip-Datei erfolgreich gelöscht!`);
        } catch (error) {
            console.log(`Fehler beim Löschen der Zip-Datei: ${error}`);
            mainWindow.webContents.send('minecraft-log', `Fehler beim löschen der Zip-Datei: ${error}`);

        }
        
    }

    async function downloadMods() {
        console.log("Mods werden heruntergeladen...");
        mainWindow.webContents.send('minecraft-log', "Mods werden aktualisiert...");
        
        const downloader = new Downloader({
            url: "https://www.dropbox.com/scl/fo/k3bgafwk3g8gv20z89je9/AIAh3Z8CR_ssUGh2SBqYg5c?rlkey=sc958rganokob1wz809pudf01&st=ndu2kww6&dl=1",
            directory: "./minecraft/mods",
            fileName: "mods.zip",
            cloneFiles: false,
            onProgress: function (percentage, chunk, remainingSize) {
                console.log(`${percentage}%`);
                console.log(`Remaining Bytes: ${remainingSize}`);
                mainWindow.webContents.send('minecraft-progress', percentage);

            }
        });

        try {
            await downloader.download();
            console.log(`Mods erfolgreich heruntergeladen!`);
            mainWindow.webContents.send('minecraft-log', `Mods erfolgreich heruntergeladen!`);
            extractMods();
        } catch (error) {
            console.log(`Fehler beim Herunterladen der Mods: ${error}`);
            mainWindow.webContents.send('minecraft-log', `Fehler beim Herunterladen der Mods: ${error}`);

        }
}

const authPath = path.join(app.getPath('userData'), 'auth.json');

ipcMain.handle('launch-minecraft', () => {
  console.log('Launching Minecraft...');
  const launcher = new mcl.Client();
  const authManager = new Auth("select_account");
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');

  if (!fs.existsSync(path.join(app.getPath('userData'), 'forge_1_20_1.jar'))) {
    downloadForge();
  }
    downloadMods().then(() => {
    
  if (fs.existsSync(settingsPath)) {
    let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    // Prüfe, ob ein Auth-Token zwischengespeichert wurde
    if (fs.existsSync(authPath)) {
      let cached = JSON.parse(fs.readFileSync(authPath, 'utf8'));
      let launchOpts = {
        clientPackage: null,
        authorization: cached.token, 
        root: "./minecraft",
        version: { number: "1.20.1", type: "release" },
        memory: { max: settings.ramMax + "M", min: settings.ramMin + "M" },
        forge: path.join(app.getPath('userData'), 'forge_1_20_1.jar')
      };

      launcher.launch(launchOpts);
      
      launcher.on('debug', (e) => {
        console.log(e);
        mainWindow.webContents.send('minecraft-log', e);
        if (e.toString().includes("Launching with arguments")) {
            console.log("App schließt in 15 Sekunden...");
            setTimeout(() => {
              app.quit();
            }, 15000);
          }
      });
      launcher.on('data', (e) => {
        console.log(e);
        mainWindow.webContents.send('minecraft-log', e);

      });
    } else {
      // Kein gespeicherter Token – führe die Authentifizierung durch
      authManager.launch("electron").then(async (xboxManager) => {
        const token = await xboxManager.getMinecraft();
        // Speichere den erhaltenen Token
        fs.writeFileSync(authPath, JSON.stringify({ token: token.mclc() }));
        let launchOpts = {
          clientPackage: null,
          authorization: token.mclc(),
          root: "./minecraft",
          version: { number: "1.20.1", type: "release" },
          memory: { max: settings.ramMax + "M", min: settings.ramMin + "M" },
          forge: path.join(app.getPath('userData'), 'forge_1_20_1.jar')
        };

        launcher.launch(launchOpts);
        
        launcher.on('debug', (e) => {
          console.log(e);
          mainWindow.webContents.send('minecraft-log', e);
          if (e.toString().includes("Launching with arguments")) {
            console.log("App schließt in 15 Sekunden...");
            setTimeout(() => {
              app.quit();
            }, 15000);
          }
        });
        launcher.on('data', (e) => {
          console.log(e);
          mainWindow.webContents.send('minecraft-log', e);
        });
      });
    }
  } else {
    console.log('Error Launching because of not existing settings.');
         }
        });
    });
});