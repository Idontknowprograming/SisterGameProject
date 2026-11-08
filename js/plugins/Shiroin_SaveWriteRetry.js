//=============================================================================
// Shiroin_SaveWriteRetry.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.1] 本地存档写入失败重试 + 启动配置写入失败兜底
 * @author shiroin
 *
 * @help Shiroin_SaveWriteRetry.js
 *
 * Windows 上的同步盘、杀毒软件或只读属性可能暂时阻止覆盖存档文件。
 * 本插件会对这类可恢复错误进行三次短暂重试；持续失败时根据
 * ConfigManager.language 以简中、日语或英语弹窗提醒玩家（其他语言回退英语）。
 *
 * config、全局存档索引和 Drill 全局配置属于后台写入，失败后会停止继续写入，
 * 但不会中断游戏流程。玩家主动保存游戏时仍会把失败交回存档界面，避免
 * 将未写入的数据误报为保存成功。
 */

(() => {
    "use strict";

    if (
        typeof StorageManager === "undefined" ||
        typeof StorageManager.fsWriteFile !== "function" ||
        typeof require !== "function"
    ) {
        return;
    }

    const RETRY_DELAYS = [50, 150, 350];
    const RETRYABLE_CODES = {
        EPERM: true,
        EACCES: true,
        EBUSY: true,
        EROFS: true
    };

    const guard = window.ShiroinSaveWriteGuard = window.ShiroinSaveWriteGuard || {};
    guard.notificationShown = !!guard.notificationShown;
    guard.backgroundWriteBlocked = !!guard.backgroundWriteBlocked;
    guard.reportedFailures = guard.reportedFailures || {};

    const isRetryable = error => !!(error && RETRYABLE_CODES[error.code]);

    const makeWritable = filePath => {
        if (!filePath) return;
        try {
            const fs = require("fs");
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                fs.chmodSync(filePath, 0o666);
            }
        } catch (error) {
            // chmod is only a best-effort recovery step; the retry keeps the original error semantics.
        }
    };

    const waitSynchronously = milliseconds => {
        try {
            if (typeof SharedArrayBuffer !== "undefined" && typeof Atomics !== "undefined") {
                const buffer = new SharedArrayBuffer(4);
                Atomics.wait(new Int32Array(buffer), 0, 0, milliseconds);
                return;
            }
        } catch (error) {
            // Some renderer contexts disallow Atomics.wait on the main thread.
        }
        const endTime = Date.now() + milliseconds;
        while (Date.now() < endTime) {
            // MZ's local file writer is synchronous, so keep a short fallback for restricted renderers.
        }
    };

    const showWriteFailure = (error, filePath) => {
        const errorCode = error && error.code ? error.code : "UNKNOWN";
        const diagnosticKey = errorCode + ":" + filePath;
        if (!guard.reportedFailures[diagnosticKey]) {
            guard.reportedFailures[diagnosticKey] = true;
            console.error("[Shiroin_SaveWriteRetry] Save write failed:", filePath, error);
        }
        if (guard.notificationShown) return;
        guard.notificationShown = true;
        if (typeof window === "undefined" || typeof window.alert !== "function") return;
        const language = typeof ConfigManager !== "undefined"
            ? Number(ConfigManager.language)
            : 2;
        const messages = {
            0: [
                "无法创建存档配置文件",
                "",
                "游戏没有当前文件夹的写入权限，因此无法创建存档或保存设置。",
                "游戏仍可继续运行，但本次进度和设置将无法保存。",
                "",
                "请将完整游戏文件夹移动到可写入的位置（例如 D:\\Games），",
                "或在安全软件中允许游戏程序写入文件，然后重新启动游戏。",
                "",
                `错误代码：${errorCode}`,
                `文件：${filePath}`
            ],
            1: [
                "セーブ設定ファイルを作成できませんでした",
                "",
                "ゲームに現在のフォルダーへの書き込み権限がないため、",
                "セーブデータや設定ファイルを作成できません。",
                "ゲームは続行できますが、今回の進行状況と設定は保存されません。",
                "",
                "ゲームフォルダー全体を書き込み可能な場所（例：D:\\Games）へ移動するか、",
                "セキュリティソフトでゲームによるファイル書き込みを許可してから、",
                "ゲームを再起動してください。",
                "",
                `エラーコード：${errorCode}`,
                `ファイル：${filePath}`
            ],
            2: [
                "Unable to create save/configuration files",
                "",
                "The game does not have permission to write to the current folder, so it cannot",
                "create save data or store settings. You may continue playing, but your progress",
                "and settings from this session cannot be saved.",
                "",
                "Move the entire game folder to a writable location (for example, D:\\Games),",
                "or allow the game to write files in your security software, then restart the game.",
                "",
                `Error: ${errorCode}`,
                `File: ${filePath}`
            ]
        };
        window.alert((messages[language] || messages[2]).join("\n"));
    };

    const runWithRetry = (writeAction, filePath, suppressFailure) => {
        for (let attempt = 0; ; attempt++) {
            try {
                const result = writeAction();
                guard.backgroundWriteBlocked = false;
                return result;
            } catch (error) {
                if (!isRetryable(error)) throw error;
                if (attempt >= RETRY_DELAYS.length) {
                    showWriteFailure(error, filePath);
                    guard.backgroundWriteBlocked = true;
                    if (suppressFailure) return false;
                    throw error;
                }
                makeWritable(filePath);
                waitSynchronously(RETRY_DELAYS[attempt]);
            }
        }
    };

    // Retry only the write itself, preserving MZ's original backup/restore transaction.
    const originalFsWriteFile = StorageManager.fsWriteFile;
    StorageManager.fsWriteFile = function(filePath, data) {
        return runWithRetry(
            () => originalFsWriteFile.call(this, filePath, data),
            filePath,
            false
        );
    };

    // The whole local transaction can also fail in mkdir/rename/unlink before fsWriteFile.
    const originalSaveToLocalFile = StorageManager.saveToLocalFile;
    StorageManager.saveToLocalFile = function(saveName, zip) {
        const filePath = this.filePath(saveName);
        let result;
        try {
            result = originalSaveToLocalFile.call(this, saveName, zip);
        } catch (error) {
            if (isRetryable(error)) showWriteFailure(error, filePath);
            throw error;
        }
        return Promise.resolve(result).catch(error => {
            if (isRetryable(error)) showWriteFailure(error, filePath);
            throw error;
        });
    };

    // ConfigManager.save does not observe its Promise. Resolve permission failures here so
    // startup/default-language config creation cannot become an unhandled rejection.
    const originalSaveObject = StorageManager.saveObject;
    StorageManager.saveObject = function(saveName, object) {
        if (saveName === "config" && guard.backgroundWriteBlocked) {
            return Promise.resolve(false);
        }

        let result;
        try {
            result = originalSaveObject.call(this, saveName, object);
        } catch (error) {
            if (saveName === "config" && isRetryable(error)) {
                guard.backgroundWriteBlocked = true;
                showWriteFailure(error, this.filePath(saveName));
                return Promise.resolve(false);
            }
            throw error;
        }

        if (saveName !== "config") return result;
        return Promise.resolve(result).catch(error => {
            if (!isRetryable(error)) throw error;
            guard.backgroundWriteBlocked = true;
            showWriteFailure(error, this.filePath(saveName));
            return false;
        });
    };

    // MZ does not return/observe the global-info Promise. Keep this background failure contained.
    if (typeof DataManager !== "undefined") {
        DataManager.saveGlobalInfo = function() {
            if (guard.backgroundWriteBlocked) return Promise.resolve(false);
            return Promise.resolve(StorageManager.saveObject("global", this._globalInfo))
                .catch(error => {
                    if (!isRetryable(error)) throw error;
                    guard.backgroundWriteBlocked = true;
                    showWriteFailure(error, StorageManager.filePath("global"));
                    return false;
                });
        };
    }

    // Drill_CoreOfGlobalSave writes through fs.writeFileSync directly, bypassing MZ's writer.
    if (typeof StorageManager.drill_COGS_saveToLocalFile === "function") {
        const originalDrillSaveToLocalFile = StorageManager.drill_COGS_saveToLocalFile;
        StorageManager.drill_COGS_saveToLocalFile = function(fileSet, jsonString) {
            let fileRoot = "C:/";
            if (fileSet.url_type === "当前游戏根目录") {
                fileRoot = this.drill_COGS_parentDirectoryPath();
            }
            const filePath = fileRoot + fileSet.url_path + fileSet.name + "." + fileSet.suffix;
            if (guard.backgroundWriteBlocked) return false;
            return runWithRetry(
                () => originalDrillSaveToLocalFile.call(this, fileSet, jsonString),
                filePath,
                true
            );
        };
    }
})();
