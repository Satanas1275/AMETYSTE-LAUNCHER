const { ipcRenderer, shell } = require('electron');
const pkg = require('../package.json');
const os = require('os');
const fetch = require('node-fetch');

class Splash {
    constructor() {
        this.splash = document.querySelector(".splash");
        this.splashMessage = document.querySelector(".splash-message");
        this.splashAuthor = document.querySelector(".splash-author");
        this.message = document.querySelector(".message");

        /* =======================
           URLS UPDATE WEB
        ======================= */

        this.UPDATE_PAGES = {
            win32: 'https://amethyste.rocknite-studio.com/update/windows',
            darwin: 'https://amethyste.rocknite-studio.com/update/mac',
            linux: 'https://amethyste.rocknite-studio.com/update/linux'
        };

        document.addEventListener('DOMContentLoaded', () => {
            if (process.platform === 'win32') {
                ipcRenderer.send('update-window-progress-load');
            }
            this.startAnimation();
        });
    }

    async startAnimation() {
        const splashes = [
            { message: "Je... vie...", author: "Satanas1275" },
            { message: "Salut je suis du code.", author: "Satanas1275" },
            { message: "Nous sommes heureux de vous annoncer... de vous annoncer.", author: "Satanas1275" }
        ];

        const splash = splashes[Math.floor(Math.random() * splashes.length)];
        this.splashMessage.textContent = splash.message;
        this.splashAuthor.children[0].textContent = "@" + splash.author;

        await sleep(300);
        document.querySelector("#splash").style.display = "block";

        await sleep(600);
        this.splash.classList.add("opacity");

        await sleep(600);
        this.splash.classList.add("translate");
        this.splashMessage.classList.add("opacity");
        this.splashAuthor.classList.add("opacity");
        this.message.classList.add("opacity");

        await sleep(800);
        this.checkUpdate();
    }

    async checkUpdate() {
        this.setStatus("Vérification de la version...");

        try {
            const res = await fetch('https://amethyste.rocknite-studio.com/update/version.txt');
            if (!res.ok) throw new Error("Version non disponible");

            const latest = (await res.text()).trim();

            if (latest !== pkg.version) {
                this.redirectUpdate();
            } else {
                this.startLauncher();
            }

        } catch (e) {
            console.error(e);
            this.startLauncher();
        }
    }

    redirectUpdate() {
        const platform = os.platform();
        const url = this.UPDATE_PAGES[platform];

        if (url) {
            shell.openExternal(url);
        }

        this.shutdown("Mise à jour requise.");
    }

    startLauncher() {
        this.setStatus("Démarrage du launcher...");
        ipcRenderer.send('main-window-open');
        ipcRenderer.send('update-window-close');
    }

    shutdown(text) {
        let i = 5;
        this.setStatus(`${text}<br>Arrêt dans ${i}s`);

        const interval = setInterval(() => {
            i--;
            this.setStatus(`${text}<br>Arrêt dans ${i}s`);
            if (i <= 0) {
                clearInterval(interval);
                ipcRenderer.send('update-window-close');
            }
        }, 1000);
    }

    setStatus(text) {
        this.message.innerHTML = text;
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey && e.shiftKey && e.key === "I") || e.key === "F12") {
        ipcRenderer.send("update-window-dev-tools");
    }
});

new Splash();
