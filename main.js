const { app, BrowserWindow, ipcMain, window } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");
const mcl = require("minecraft-launcher-core");
const { Auth, Minecraft } = require("msmc");
const { Downloader } = require("nodejs-file-downloader");
const Admzip = require("adm-zip");
const { exec } = require("child_process");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minHeight: 800,
    minWidth: 600,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#1e1e1e",
      symbolColor: "#ff4444",
      height: 20,
      width: 100,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile("src/index.html");
}

// Event-Listener für den Auto-Updater
autoUpdater.on("checking-for-update", () => {
  console.log("Suche nach Updates...");
});

autoUpdater.on("update-available", (info) => {
  console.log("Update verfügbar:", info);
  // Optional: Sende eine Nachricht an den Renderer, um den Benutzer zu informieren
  mainWindow.webContents.send("update_available", info);
});

autoUpdater.on("update-not-available", (info) => {
  console.log("Kein Update verfügbar:", info);
});

autoUpdater.on("error", (err) => {
  console.log("Fehler beim Updater:", err);
});

autoUpdater.on("download-progress", (progressObj) => {
  let logMessage = `Download-Geschwindigkeit: ${
    progressObj.bytesPerSecond
  } B/s - ${progressObj.percent.toFixed(2)}%`;
  logMessage += ` (${progressObj.transferred}/${progressObj.total})`;
  console.log(logMessage);
  // Sende Fortschrittsdaten an den Renderer
  mainWindow.webContents.send("download_progress", progressObj);
});

autoUpdater.on("update-downloaded", (info) => {
  console.log("Update heruntergeladen:", info);
  // Nach 15 Sekunden Update installieren und App schließen
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 15000);
});

app.whenReady().then(() => {
  createWindow();
  // Prüfe auf Updates und benachrichtige den Benutzer, falls ein Update gefunden wurde.
  autoUpdater.checkForUpdatesAndNotify();
});

// Optional: Beim erneuten Öffnen der App, falls alle Fenster geschlossen wurden
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("save-settings", (event, settings) => {
  const settingsPath = path.join(app.getPath("userData"), "settings.json");
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
});

ipcMain.handle("load-settings", () => {
  const settingsPath = path.join(app.getPath("userData"), "settings.json");
  if (fs.existsSync(settingsPath)) {
    return JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  }
  return {};
});

ipcMain.handle("get-mod-files", () => {
  const modsDir = path.join(__dirname, "minecraft", "mods");
  if(fs.existsSync(modsDir)) {
    return fs.readdirSync(modsDir);
  }
  return [];
});

const javaDir = path.join(app.getPath("userData"), "java");
const javaExePath = path.join(javaDir, "bin", "java.exe");

async function ensureJavaInstalled() {
  const javaPath = "C:\\Program Files\\Java\\jdk-23\\bin\\java.exe"; // ✅ Java 23 Pfad
  if (fs.existsSync(javaPath)) {
    console.log("Java 23 ist bereits installiert.");
    mainWindow.webContents.send("minecraft-log", "Java 23 ist bereits installiert!");
    return;
  }

  console.log("Java nicht gefunden, starte Download...");
  mainWindow.webContents.send("minecraft-log", "Lade Java 23 herunter...");

  const downloader = new Downloader({
    url: "https://download.oracle.com/java/23/latest/jdk-23_windows-x64_bin.exe", // ✅ Java 23 Download
    directory: app.getPath("userData"),
    fileName: "java_installer.exe",
    cloneFiles: false,
  });

  try {
    await downloader.download();
    console.log("Java 23 erfolgreich heruntergeladen!");
    mainWindow.webContents.send("minecraft-log", "Java 23 heruntergeladen!");

    mainWindow.webContents.send("minecraft-log", "Starte Java-Installation...");
    
    // ✅ Installiere Java 23 still (ohne GUI)
    exec(`"${path.join(app.getPath("userData"), "java_installer.exe")}" /s`, (error, stdout, stderr) => {
      if (error) {
        console.log(`Fehler bei der Java-Installation: ${error}`);
        mainWindow.webContents.send("minecraft-log", `Fehler bei der Java-Installation: ${error}`);
        return;
      }
      console.log("Java 23 erfolgreich installiert!");
      mainWindow.webContents.send("minecraft-log", "Java 23 erfolgreich installiert!");
      
      // Lösche die Installer-EXE nach der Installation
      fs.unlinkSync(path.join(app.getPath("userData"), "java_installer.exe"));
    });

  } catch (error) {
    console.log(`Fehler beim Java-Download: ${error}`);
    mainWindow.webContents.send("minecraft-log", `Fehler beim Java-Download: ${error}`);
  }
}


async function downloadForge() {
  console.log("Forge wird heruntergeladen...");
  mainWindow.webContents.send("minecraft-log", "Forge wird heruntergeladen...");
  const downloader = new Downloader({
    url: "https://maven.minecraftforge.net/net/minecraftforge/forge/1.20.1-47.3.33/forge-1.20.1-47.3.33-installer.jar",
    directory: app.getPath("userData"),
    fileName: "forge_1_20_1.jar",
    cloneFiles: false,
    onProgress: function (percentage, chunk, remainingSize) {
      console.log(`${percentage}%`);
      console.log(`Remaining Bytes: ${remainingSize}`);
      mainWindow.webContents.send("minecraft-progress", percentage);
    },
  });

  try {
    await downloader.download();
    console.log(`Forge erfolgreich heruntergeladen!`);
    mainWindow.webContents.send(
      "minecraft-log",
      "Forge wurde erfolgreich heruntergeladen..."
    );
  } catch (error) {
    console.log(`Fehler beim Herunterladen von Forge: ${error}`);
    mainWindow.webContents.send(
      "minecraft-log",
      `Fehler beim Herunterladen von Forge: ${error}`
    );
  }
}

function extractMods() {
  console.log("Mods werden entpackt...");
  mainWindow.webContents.send("minecraft-log", "Mods werden extrahiert...");
  var zip = new Admzip("./minecraft/mods/mods.zip");
  try {
    zip.extractAllTo("./minecraft/mods/", true);
    console.log("Mods erfolgreich entpackt!");
    mainWindow.webContents.send(
      "minecraft-log",
      `Mods erfolgreich extrahiert!`
    );
  } catch (error) {
    console.log(`Fehler beim Entpacken der Mods: ${error}`);
    mainWindow.webContents.send(
      "minecraft-log",
      `Fehler beim entpacken der Mods: ${error}`
    );
  }
  try {
    fs.unlinkSync("./minecraft/mods/mods.zip");
    console.log("Zip-Datei gelöscht!");
    mainWindow.webContents.send(
      "minecraft-log",
      `Zip-Datei erfolgreich gelöscht!`
    );
  } catch (error) {
    console.log(`Fehler beim Löschen der Zip-Datei: ${error}`);
    mainWindow.webContents.send(
      "minecraft-log",
      `Fehler beim löschen der Zip-Datei: ${error}`
    );
  }
}

async function downloadMods() {
  console.log("Mods werden heruntergeladen...");
  mainWindow.webContents.send("minecraft-log", "Mods werden aktualisiert...");

  // Lese die Einstellungen und ermittle die Liste der zu erhaltenden Mods
  let preserved = [];
  const settingsPath = path.join(app.getPath("userData"), "settings.json");
  if (fs.existsSync(settingsPath)) {
    let settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    preserved = settings.preservedMods || [];
  }

  const modsDir = "./minecraft/mods";

  // Lösche nur die Dateien, die nicht in der Liste der zu erhaltenden Mods stehen
  try {
    if (fs.existsSync(modsDir)) {
      const files = fs.readdirSync(modsDir);
      for (const file of files) {
        if (!preserved.includes(file)) {
          fs.unlinkSync(path.join(modsDir, file));
        }
      }
      console.log("Nicht geschützte Mods wurden gelöscht!");
      mainWindow.webContents.send("minecraft-log", "Nicht geschützte Mods wurden gelöscht!");
    }
  } catch (error) {
    console.log(`Fehler beim Löschen der Mods: ${error}`);
    mainWindow.webContents.send("minecraft-log", `Fehler beim Löschen der Mods: ${error}`);
  }

  // Starte den Download der neuen Mods
  const downloader = new Downloader({
    url: "https://www.dropbox.com/scl/fo/k3bgafwk3g8gv20z89je9/AIAh3Z8CR_ssUGh2SBqYg5c?rlkey=sc958rganokob1wz809pudf01&st=ndu2kww6&dl=1",
    directory: modsDir,
    fileName: "mods.zip",
    cloneFiles: false,
    onProgress: function (percentage, chunk, remainingSize) {
      console.log(`${percentage}%`);
      console.log(`Remaining Bytes: ${remainingSize}`);
      mainWindow.webContents.send("minecraft-progress", percentage);
    },
  });

  try {
    await downloader.download();
    console.log("Mods erfolgreich heruntergeladen!");
    mainWindow.webContents.send("minecraft-log", "Mods erfolgreich heruntergeladen!");
    extractMods();
  } catch (error) {
    console.log(`Fehler beim Herunterladen der Mods: ${error}`);
    mainWindow.webContents.send("minecraft-log", `Fehler beim Herunterladen der Mods: ${error}`);
  }
}

const authPath = path.join(app.getPath("userData"), "auth.json");

ipcMain.handle("launch-minecraft", async () => {
  console.log("Starte Minecraft...");
  await ensureJavaInstalled();

  const launcher = new mcl.Client();
  const authManager = new Auth("electron"); // Auth mit electron
  const settingsPath = path.join(app.getPath("userData"), "settings.json");


    // Falls Forge nicht existiert, lade es herunter
    if (!fs.existsSync(path.join(app.getPath("userData"), "forge_1_20_1.jar"))) {
      await downloadForge();
    }
  
    await downloadMods();

    
  if (!fs.existsSync(settingsPath)) {
    console.log("Fehlende Einstellungen. Minecraft kann nicht gestartet werden.");
    return;
  }

  let settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  let tokenData = null;

  // Prüfe, ob ein gespeicherter Auth-Token existiert
  if (fs.existsSync(authPath)) {
    try {
      tokenData = JSON.parse(fs.readFileSync(authPath, "utf8"));
      console.log("Gespeicherten Token gefunden.");
    } catch (error) {
      console.log("Fehler beim Lesen des gespeicherten Tokens, erneute Anmeldung erforderlich.");
    }
  }

  if (tokenData) {
    try {
      console.log("Prüfe gespeicherten Token...");
      const xboxManager = new Auth("electron");

      // **Microsoft-Token erneuern**
      const refreshedToken = await xboxManager.refresh(tokenData.token);

      if (refreshedToken) {
        console.log("Token erfolgreich erneuert.");
        fs.writeFileSync(authPath, JSON.stringify({ token: refreshedToken })); // Speichere den erneuerten Token

        // **Starte Minecraft mit dem erneuerten Token**
        launchGame(refreshedToken.mclc(), settings, launcher);
        return;
      }
    } catch (error) {
      console.log("Gespeicherter Token ungültig oder nicht erneuerbar. Erneute Anmeldung erforderlich.");
    }
  }

  // Falls kein gültiger Token existiert, mache eine neue Anmeldung
  authenticateAndLaunch(authManager, settings, launcher);
});

/**
 * Führt die Authentifizierung durch und startet Minecraft.
 */
async function authenticateAndLaunch(authManager, settings, launcher) {
  try {
    console.log("Benutzer muss sich anmelden...");
    const xboxManager = await authManager.launch("electron"); // Anmeldung
    const token = await xboxManager.getMinecraft();

    // Speichere den neuen Token
    fs.writeFileSync(authPath, JSON.stringify({ token: token }));

    console.log("Neuer Token gespeichert, starte Minecraft...");
    launchGame(token.mclc(), settings, launcher);
  } catch (error) {
    console.log("Fehler bei der Authentifizierung:", error);
    mainWindow.webContents.send("minecraft-log", "Fehler bei der Anmeldung!");
  }
}

/**
 * Startet Minecraft mit den gegebenen Einstellungen.
 */
async function launchGame(authToken, settings, launcher) {

  let launchOpts = {
    clientPackage: null,
    authorization: authToken,
    root: "./minecraft",
    version: { number: "1.20.1", type: "release" },
    memory: { max: settings.ramMax + "M", min: settings.ramMin + "M" },
    forge: path.join(app.getPath("userData"), "forge_1_20_1.jar"),
    javaPath: "C:\\Program Files\\Java\\jdk-23\\bin\\java.exe", // ✅ Java 23 statt Java 8
  };

  launcher.launch(launchOpts);

  launcher.on("debug", (e) => {
    console.log(e);
    mainWindow.webContents.send("minecraft-log", e);
    if (e.toString().includes("Launching with arguments")) {
      console.log("App schließt in 15 Sekunden...");
      setTimeout(() => {
        app.quit();
      }, 15000);
    }
  });

  launcher.on("data", (e) => {
    console.log(e);
    mainWindow.webContents.send("minecraft-log", e);
  });
}


