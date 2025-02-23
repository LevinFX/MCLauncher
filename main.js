const { app, BrowserWindow, ipcMain, window } = require('electron');
const path = require('path');
const fs = require('fs');
const mcl = require('minecraft-launcher-core');
const { Auth } = require("msmc");
const {Downloader} = require("nodejs-file-downloader");
const extract = require('extract-zip');
const axios = require("axios");
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

    function loadSettings(){
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');
        if (fs.existsSync(settingsPath)) {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        return {};
    }

    function downloadForge(){
        console.log("Forge wird heruntergeladen...");
        const forgeVersion = "1.20.1";
        const forgePath = path.join(app.getPath('userData'), 'forge_1_20_1.jar');
        const forgeUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/1.20.1-47.3.33/forge-1.20.1-47.3.33-installer.jar`;
        const forgeFile = fs.createWriteStream(forgePath);
        const request = require('https').get(forgeUrl, (response) => {
            response.pipe(forgeFile);
            forgeFile.on('finish', () => {
                forgeFile.close();
            });
        });
    }

    async function downloadMods() {
        console.log("Mods werden heruntergeladen...");
  // URL des Zip-Archivs (direkter Download-Link)
  const url = "https://www.dropbox.com/scl/fo/k3bgafwk3g8gv20z89je9/AIAh3Z8CR_ssUGh2SBqYg5c?rlkey=sc958rganokob1wz809pudf01&st=ndu2kww6&dl=1";
  
  // Pfad, unter dem die Zip-Datei gespeichert wird
  const zipPath = path.join(__dirname, 'mods.zip');
  
  // Zielordner für die entpackten Mods (Projektordner/minecraft/mods)
  const outputFolder = path.join(__dirname, 'minecraft', 'mods');

  try {
    console.log('Download der Mods gestartet...');

    // Sicherstellen, dass der Zielordner existiert
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // Herunterladen der Zip-Datei als Stream
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    // Speichern des Streams in eine Datei
    const writer = fs.createWriteStream(zipPath);
    response.data.pipe(writer);

    // Warten bis der Download abgeschlossen ist
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log('Download abgeschlossen. Entpacke die Mods...');

    console.log("Out: "+outputFolder)
    console.log("In: "+zipPath)
    // Entpacken der Zip-Datei in den Zielordner
    await extract(zipPath, { dir: outputFolder });

    console.log('Mods wurden erfolgreich nach "minecraft/mods" extrahiert.');

    // Löschen der Zip-Datei nach erfolgreicher Extraktion
    fs.unlink(zipPath, (err) => {
      if (err) {
        console.error('Fehler beim Löschen der Zip-Datei:', err);
      } else {
        console.log('Zip-Datei wurde gelöscht.');
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Herunterladen oder Entpacken der Mods:', error);
  }
}

    ipcMain.handle('launch-minecraft', () => {
        console.log('Launching Minecraft...');
        const launcher = new mcl.Client();
        const authManager = new Auth("select_account");
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');

        if(!fs.existsSync(path.join(app.getPath('userData'), 'forge.jar'))) {
            downloadForge();
        }
        downloadMods();

        if(fs.existsSync(settingsPath)) {
            let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
            authManager.launch("electron").then(async (xboxManager) => {
            const token = await xboxManager.getMinecraft();
            const atoken = await xboxManager;
            let launchOpts = {
                clientPackage: null,
                authorization: token.mclc(),//mcl.Authenticator.validate(atoken.msToken.access_token, token.mcToken),
                root: "./minecraft",
                version: {
                    number: "1.20.1",
                    type: "release"
                },
                memory: {
                    max: settings.ramMax+"M",
                    min: settings.ramMin+"M"
                },
                forge: path.join(app.getPath('userData'), 'forge_1_20_1.jar')
            }
            launcher.launch(launchOpts);
            
        launcher.on('debug', (e) => console.log(e));
        launcher.on('data', (e) => console.log(e));
        })
        }else{
            console.log('Error Launching becuase of not existing settings.')
        }
    });
});