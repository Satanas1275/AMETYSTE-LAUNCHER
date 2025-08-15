/**
 * @author Satanas1275
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { ipcRenderer, shell } = require('electron');
const pkg = require('../package.json');
const os = require('os');
const nodeFetch = require("node-fetch");
const fs = require('fs');
const path = require('path');

class Splash {
    constructor() {
        this.splash = document.querySelector(".splash");
        this.splashMessage = document.querySelector(".splash-message");
        this.splashAuthor = document.querySelector(".splash-author");
        this.message = document.querySelector(".message");
        this.progress = document.querySelector(".progress");

        // Valeurs par défaut (au cas où la récupération échoue)
        this.configBaseURL = 'https://siphonium.alwaysdata.net/launcher/config-launcher/config.json';
        this.downloadBaseURL = 'https://siphonium.alwaysdata.net/launcher/download/version.txt';
        this.downloadFileURL = 'https://siphonium.alwaysdata.net/siphonium%20Launcher-win-x64.exe';

        document.addEventListener('DOMContentLoaded', async () => {
            if (process.platform === 'win32') ipcRenderer.send('update-window-progress-load');
            this.startAnimation();
        });
    }

    async startAnimation() {
        const splashes = [
            { "message": "Je... vie...", "author": "Satanas1275" },
            { "message": "Salut je suis du code.", "author": "Satanas1275" },
            { "message": "Nous sommes heureux de vous annoncer... de vous annoncer.", "author": "Satanas1275" }
        ];
        const splash = splashes[Math.floor(Math.random() * splashes.length)];
        this.splashMessage.textContent = splash.message;
        this.splashAuthor.children[0].textContent = "@" + splash.author;

        await sleep(100);
        document.querySelector("#splash").style.display = "block";
        await sleep(500);
        this.splash.classList.add("opacity");
        await sleep(500);
        this.splash.classList.add("translate");
        this.splashMessage.classList.add("opacity");
        this.splashAuthor.classList.add("opacity");
        this.message.classList.add("opacity");
        await sleep(1000);

        // On commence par récupérer les URLs dynamiques
        await this.fetchTunnelUrls();

        // Ensuite on lance la vérification de mise à jour
        this.checkUpdate();
    }

    async fetchTunnelUrls() {
        try {
            const res = await nodeFetch('https://siphonium.github.io/url/tunnels.txt');
            if (!res.ok) throw new Error("Impossible de récupérer tunnels.txt");
            const text = await res.text();

            // Extraction des lignes
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            for (const line of lines) {
                if (line.startsWith("SIPHONIUM-LAUNCHER-CONFIG")) {
                    this.configBaseURL = line.split('=').pop().trim() + '/launcher/config-launcher/config.json';
                } else if (line.startsWith("SIPHONIUM-LAUNCHER-DOWNLOAD")) {
                    const base = line.split('=').pop().trim();
                    this.downloadBaseURL = base + '/version.txt';
                    this.downloadFileURL = base + '/siphonium%20Launcher-win-x64.exe';
                }
            }

            console.log("URLs mises à jour :", {
                config: this.configBaseURL,
                version: this.downloadBaseURL,
                exe: this.downloadFileURL
            });
        } catch (err) {
            console.error("Erreur récupération tunnels.txt :", err);
        }
    }

    async checkUpdate() {
        this.setStatus(`Recherche de mise à jour...`);

        const UPDATE_CHECK_ENABLED = true;
        if (!UPDATE_CHECK_ENABLED) {
            console.log("Check update désactivé.");
            this.maintenanceCheck();
            return;
        }

        try {
            const res = await nodeFetch(this.downloadBaseURL);
            if (!res.ok) throw new Error("Impossible de récupérer la version en ligne.");
            const latestVersion = (await res.text()).trim();

            if (latestVersion !== pkg.version) {
                if (os.platform() === 'win32') {
                    const downloadURL = this.downloadFileURL;
                    this.setStatus(`Mise à jour disponible !<br><div class="download-update">Télécharger</div>`);

                    document.querySelector(".download-update").addEventListener("click", async () => {
                        const file = await nodeFetch(downloadURL);
                        const buffer = Buffer.from(await file.arrayBuffer());
                        const tmp = require('os').tmpdir();
                        const fileName = path.join(tmp, path.basename(downloadURL));
                        fs.writeFileSync(fileName, buffer);

                        const { exec } = require('child_process');
                        exec(`"${fileName}"`, (err) => {
                            if (err) console.error(err);
                        });

                        this.shutdown("Téléchargement et installation en cours...");
                    });

                } else if (os.platform() === 'darwin') {
                    shell.openExternal('https://siphonium.github.io/update/mac');
                    this.shutdown("Veuillez suivre les instructions pour mettre à jour votre launcher Mac.");
                } else if (os.platform() === 'linux') {
                    shell.openExternal('https://siphonium.github.io/update/linux');
                    this.shutdown("Veuillez suivre les instructions pour mettre à jour votre launcher Linux.");
                }

            } else {
                console.log("Launcher à jour.");
                this.maintenanceCheck();
            }
        } catch (err) {
            console.error(err);
            this.maintenanceCheck();
        }
    }

    async maintenanceCheck() {
        try {
            const res = await nodeFetch(this.configBaseURL);
            const configLauncher = await res.json();
            if (configLauncher.maintenance) {
                this.shutdown(configLauncher.maintenance_message);
            } else {
                this.startLauncher();
            }
        } catch (e) {
            console.error(e);
            this.shutdown("Aucune connexion internet détectée,<br>veuillez réessayer ultérieurement.");
        }
    }

    startLauncher() {
        this.setStatus(`Démarrage du launcher`);
        ipcRenderer.send('main-window-open');
        ipcRenderer.send('update-window-close');
    }

    shutdown(text) {
        this.setStatus(`${text}<br>Arrêt dans 5s`);
        let i = 4;
        const interval = setInterval(() => {
            this.setStatus(`${text}<br>Arrêt dans ${i--}s`);
            if (i < 0) {
                ipcRenderer.send('update-window-close');
                clearInterval(interval);
            }
        }, 1000);
    }

    setStatus(text) {
        this.message.innerHTML = text;
    }

    toggleProgress() {
        if (this.progress.classList.toggle("show")) this.setProgress(0, 1);
    }

    setProgress(value, max) {
        this.progress.value = value;
        this.progress.max = max;
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey && e.shiftKey && e.keyCode === 73) || e.keyCode === 123) {
        ipcRenderer.send("update-window-dev-tools");
    }
});

new Splash();
