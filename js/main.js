//=============================================================================
// main.js v1.10.0
//=============================================================================

const scriptUrls = [
    "js/libs/pixi.js",
    "js/libs/pako.min.js",
    "js/libs/pako_mz_compat.js",
    "js/libs/localforage.min.js",
    "js/libs/effekseer.min.js",
    "js/libs/vorbisdecoder.js",
    "js/rmmz_core.js",
    "js/rmmz_managers.js",
    "js/rmmz_objects.js",
    "js/rmmz_scenes.js",
    "js/rmmz_sprites.js",
    "js/rmmz_windows.js",
    "js/plugins.js"
];
const effekseerWasmUrl = "js/libs/effekseer.wasm";

class Main {
    constructor() {
        this.xhrSucceeded = false;
        this.loadCount = 0;
        this.error = null;
    }

    run() {
        this.effekseerReady = false;
        this.cordovaReady = false;
        this.gameStarted = false;
        this.showLoadingSpinner();
        this.testXhr();
        this.hookNwjsClose();
        this.loadCordova();
        this.loadMainScripts();
    }

    // [安卓] 加载 Cordova 框架。cordova.js 已在 APK assets 内，但 index.html 未引用过，
    //   导致 window.cordova 一直为 undefined → resolveLocalFileSystemURL / cordova.plugin.http
    //   等插件全部缺失（文件检测失效、自动更新只能走 WebView 的 QUIC 网络栈）。
    //   这里在游戏启动前加载 cordova.js 并等待 deviceready，确保插件就绪；
    //   任何异常（PC 浏览器无 cordova.js、deviceready 不触发等）都会放行，绝不卡死启动。
    loadCordova() {
        if (typeof nw === "object") {  // NW.js 桌面：无 cordova 也不需要
            this.cordovaReady = true;
            return;
        }
        const proceed = () => {
            if (this.cordovaReady) return;
            this.cordovaReady = true;
            this.tryStartGame();
        };
        document.addEventListener("deviceready", proceed, { once: true });
        setTimeout(proceed, 8000);  // 兜底：8 秒没等到 deviceready 也放行
        const script = document.createElement("script");
        script.src = "cordova.js";
        script.onerror = proceed;   // 无 cordova.js（PC 浏览器等）→ 直接放行
        document.head.appendChild(script);
    }

    showLoadingSpinner() {
        // 已禁用 MZ 加载转圈动画：加载阶段保持纯黑屏（body 本就是黑底）。
        // eraseLoadingSpinner 用 getElementById 取元素，取不到会被 if 守卫跳过，安全。
    }

    eraseLoadingSpinner() {
        const loadingSpinner = document.getElementById("loadingSpinner");
        if (loadingSpinner) {
            document.body.removeChild(loadingSpinner);
        }
    }

    testXhr() {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", document.currentScript.src);
        xhr.onload = () => (this.xhrSucceeded = true);
        xhr.send();
    }

    hookNwjsClose() {
        // [Note] When closing the window, the NW.js process sometimes does
        //   not terminate properly. This code is a workaround for that.
        if (typeof nw === "object") {
            nw.Window.get().on("close", () => {
                // 监听器早于插件加载；启动阶段尚不存在更新任务。
                if (window.chahuiUtil?._activeUpdateTasks > 0) {
                    window.chahuiUtil.showUpdateCloseWarning().catch(error => {
                        console.error("[patch-update] Close warning failed:", error);
                    });
                    return;
                }
                nw.App.quit();
            });
        }
    }

    loadMainScripts() {
        for (const url of scriptUrls) {
            const script = document.createElement("script");
            script.type = "text/javascript";
            script.src = url;
            script.async = false;
            script.defer = true;
            script.onload = this.onScriptLoad.bind(this);
            script.onerror = this.onScriptError.bind(this);
            script._url = url;
            document.body.appendChild(script);
        }
        this.numScripts = scriptUrls.length;
        window.addEventListener("load", this.onWindowLoad.bind(this));
        window.addEventListener("error", this.onWindowError.bind(this));
    }

    onScriptLoad() {
        if (++this.loadCount === this.numScripts) {
            PluginManager.setup($plugins);
        }
    }

    onScriptError(e) {
        this.printError("Failed to load", e.target._url);
    }

    printError(name, message) {
        this.eraseLoadingSpinner();
        if (!document.getElementById("errorPrinter")) {
            const errorPrinter = document.createElement("div");
            errorPrinter.id = "errorPrinter";
            errorPrinter.innerHTML = this.makeErrorHtml(name, message);
            document.body.appendChild(errorPrinter);
        }
    }

    makeErrorHtml(name, message) {
        const nameDiv = document.createElement("div");
        const messageDiv = document.createElement("div");
        nameDiv.id = "errorName";
        messageDiv.id = "errorMessage";
        nameDiv.innerHTML = name;
        messageDiv.innerHTML = message;
        return nameDiv.outerHTML + messageDiv.outerHTML;
    }

    onWindowLoad() {
        if (!this.xhrSucceeded) {
            const message = "Your browser does not allow to read local files.";
            this.printError("Error", message);
        } else if (this.isPathRandomized()) {
            const message = "Please move the Game.app to a different folder.";
            this.printError("Error", message);
        } else if (this.error) {
            this.printError(this.error.name, this.error.message);
        } else {
            this.initEffekseerRuntime();
        }
    }

    onWindowError(event) {
        if (!this.error) {
            this.error = event.error;
        }
    }

    isPathRandomized() {
        // [Note] We cannot save the game properly when Gatekeeper Path
        //   Randomization is in effect.
        return (
            typeof process === "object" &&
            process.mainModule.filename.startsWith("/private/var")
        );
    }

    initEffekseerRuntime() {
        const onLoad = this.onEffekseerLoad.bind(this);
        const onError = this.onEffekseerError.bind(this);
        effekseer.initRuntime(effekseerWasmUrl, onLoad, onError);
    }

    onEffekseerLoad() {
        this.effekseerReady = true;
        this.tryStartGame();
    }

    // 仅当 effekseer 与 cordova 都就绪后才启动游戏，
    //   保证 Scene_Boot 阶段 cordova 插件（resolveLocalFileSystemURL / cordova.plugin.http）可用。
    tryStartGame() {
        if (this.effekseerReady && this.cordovaReady && !this.gameStarted) {
            this.gameStarted = true;
            this.eraseLoadingSpinner();
            SceneManager.run(Scene_Boot);
        }
    }

    onEffekseerError() {
        this.printError("Failed to load", effekseerWasmUrl);
    }
}

const main = new Main();
main.run();

//-----------------------------------------------------------------------------
