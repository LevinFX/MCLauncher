const { app, BrowserWindow, ipcMain, window } = require('electron');
const path = require('path');
const fs = require('fs');
const mcl = require('minecraft-launcher-core');
const { Auth } = require("msmc");
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
        return {}; // Falls keine Einstellungen gespeichert wurden
    });

    function loadSettings(){
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');
        if (fs.existsSync(settingsPath)) {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        return {}; // Falls keine Einstellungen gespeichert wurden
    }

    ipcMain.handle('launch-minecraft', () => {
        console.log('Launching Minecraft...');
        const launcher = new mcl.Client();
        const authManager = new Auth("select_account");
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');

        if(fs.existsSync(settingsPath)) {
            let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
            
            //Launch using the 'raw' gui framework (can be 'electron' or 'nwjs')
            authManager.launch("electron").then(async (xboxManager) => {
            //Generate the Minecraft login token
            const token = await xboxManager.getMinecraft();
            const atoken = await xboxManager;
            console.log("Hier")
            let launchOpts = {
                clientPackage: null,
                authorization:mcl.Authenticator.validate(atoken.msToken.access_token, token.mcToken),
                root: "./minecraft",
                version: {
                    number: "1.20",
                    type: "release"
                },
                memory: {
                    max: settings.ramMax+"M",
                    min: settings.ramMin+"M"
                },
            }
            launcher.launch(launchOpts);
            
            console.log("Here")
            launcher.on('debug', (e) => console.log(e));
        launcher.on('data', (e) => console.log(e));
        })
        }else{
            console.log('Error Launching becuase of not existing settings.')
        }
    });
});