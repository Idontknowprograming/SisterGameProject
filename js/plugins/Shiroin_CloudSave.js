/*:
 * @plugindesc [v1.3] R2 云存档：登录自动对照/恢复 + 24h 尾随合并上传（桌面/安卓）
 * @author Shiroin & Claude
 *
 * @param serverBase
 * @text 云存档服务端地址
 * @default https://nlch.io/api/saves
 *
 * @param syncHours
 * @text 自动上传间隔(小时)
 * @default 24
 *
 * @help
 * =============================================================================
 * R2 云存档（服务端见 server/SavesWorker/，走 nlch.io 网关）
 * =============================================================================
 * 设计（Steam 式自动化 + 手动恢复）：
 *   - 登录（gm_patreon_verify 有 playerId）后全自动运行，无需玩家操作
 *   - 每次手动/自动存档 → 槽位进"脏集合"（localStorage 持久，崩溃不丢）
 *   - 尾随合并上传：距上次同步 ≥ syncHours 才真正上传全部脏槽位——
 *     频繁存档只是反复标脏，永远只传最后状态，绝不丢最新档
 *   - 登录成功先自动对照：仅云端槽直接恢复；本地/云端重叠槽一次确认后决定
 *     云端覆盖本地，或保留本地并继续按常规自动上传
 *   - 首次登录 backfill：把本地已有的全部存档标脏（老玩家从 GoogleDrive
 *     旧云存档恢复到本地后，登录即自动收进 R2，迁移零操作）
 *   - Scene_CloudSave 仍支持单槽/一键同步，覆盖前有确认
 *   - NW.js 桌面端走 fs，安卓版走 AndroidSave；网络请求在安卓版复用
 *     rpg_custom_MZ 的原生 HTTP 通道，避免 WebView CORS 预检限制
 *
 * 槽位：file0(自动存档)..file20 + global(存档列表元数据)。
 * 恢复单槽时会顺带从云端 global 提取该槽的列表条目合并进本地
 * （只动这一条，不污染其他槽位的显示信息）。
 *
 * 多语言：systemFeatureText.cloudSave 段（EN 兜底，语言文件缺失该段时自动回退英文）。
 * 旧 GoogleDrive 云存档插件保持共存，互不感知。
 * =============================================================================
 */
(() => {
"use strict";

const params = PluginManager.parameters("Shiroin_CloudSave");
const P_serverBase = String(params["serverBase"] || "https://nlch.io/api/saves").replace(/\/+$/, "");
const P_syncHours = Number(params["syncHours"] || 24);

const CS = {};
window.ShiroinCloudSave = CS;
CS._cloudVersions = Object.create(null);
CS._cloudEntries = Object.create(null);

const KEY_DIRTY      = "CloudSaveDirty";
const KEY_LAST       = "CloudSaveLastSync";
const KEY_BACKFILLED = "CloudSaveBackfilled";
const KEY_RESTORED   = "CloudSaveRestoredVersions";
const KEY_RECONCILED = "CloudSaveLoginReconciled";
const SLOT_MAX = 20;
const NET_TIMEOUT_MS = 60000;   // 存档可达 MB 级，超时放宽到 60s

//=============================================================================
// 基础工具
//=============================================================================
function isNode() {
    return typeof require === "function" && typeof process === "object" &&
        StorageManager.isLocalMode && StorageManager.isLocalMode();
}

function isAndroidStorage_() {
    return !!(window.AndroidSave &&
        typeof AndroidSave.loadSave === "function" &&
        typeof AndroidSave.saveGame === "function" &&
        typeof AndroidSave.SaveExists === "function");
}

function hasSaveStorage_() {
    return isNode() || isAndroidStorage_();
}

// rpg_custom_MZ.httpRequest 在安卓上会调用 cordova-plugin-advanced-http，
// 不受 WebView 的同源策略约束。桌面仍保留原生 fetch/Response 路径。
function usesNativeHttp_() {
    return typeof window.httpRequest === "function" &&
        typeof Utils !== "undefined" && Utils.isMobileDevice && Utils.isMobileDevice() &&
        !!(window.cordova && cordova.plugin && cordova.plugin.http);
}

function fetchTimeout(url, opts) {
    opts = opts || {};
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), NET_TIMEOUT_MS);
    return fetch(url, Object.assign({}, opts, { signal: ctrl.signal }))
        .finally(() => clearTimeout(timer));
}

function nativeRequestTimeout_(url, opts, responseType) {
    const request = window.httpRequest(url, Object.assign({}, opts, {
        responseType: responseType,
        reTry: 0
    }));
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("CloudSave request timeout")), NET_TIMEOUT_MS);
        request.then(
            value => { clearTimeout(timer); resolve(value); },
            error => { clearTimeout(timer); reject(error); }
        );
    });
}

async function requestJson_(url, opts) {
    if (usesNativeHttp_()) return nativeRequestTimeout_(url, opts, "json");
    const response = await fetchTimeout(url, opts);
    return response.json();
}

async function requestArrayBuffer_(url, opts) {
    if (usesNativeHttp_()) return nativeRequestTimeout_(url, opts, "arraybuffer");
    const response = await fetchTimeout(url, opts);
    if (!response.ok) return null;
    return response.arrayBuffer();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// 多语言：systemFeatureText.cloudSave 段（顶层浅合并 → 无该段的语言自动回退 EN）
function T(key, fallback) {
    const sec = (window.systemFeatureText && window.systemFeatureText.cloudSave) || {};
    const v = sec[key];
    if (v == null) return fallback != null ? fallback : key;
    return Array.isArray(v) ? v.join("\n") : String(v);
}

CS.getPlayerId = function() {
    try {
        const raw = localStorage.getItem("gm_patreon_verify");
        if (!raw) return null;
        const pid = String((JSON.parse(raw) || {}).playerId || "").trim();
        return /^\d+$/.test(pid) ? pid : null;
    } catch (e) { return null; }
};
CS.getDeviceId = function() {
    try {
        const raw = localStorage.getItem("gm_patreon_verify");
        if (!raw) return "";
        return String((JSON.parse(raw) || {}).device_id || "");
    } catch (e) { return ""; }
};

// 所有同步状态均按 playerId 分区，避免 A 账号留下的 dirty/backfill 状态
// 在切换到 B 账号后被误用。未登录期间产生的本地写入暂存到 anonymous，
// 下次登录时再并入该账号；实际文件仍会在首次 backfill 中被完整扫描一次。
function normalizedPid_(playerId) {
    const pid = String(playerId == null ? "" : playerId).trim();
    return /^\d+$/.test(pid) ? pid : null;
}
function resolvedPid_(playerId) {
    return normalizedPid_(playerId == null ? CS.getPlayerId() : playerId);
}
function accountKey_(base, playerId) {
    const pid = resolvedPid_(playerId);
    return base + ":" + (pid || "anonymous");
}
function reconcileComplete_(playerId) {
    const pid = resolvedPid_(playerId);
    if (!pid) return false;
    try { return localStorage.getItem(accountKey_(KEY_RECONCILED, pid)) === "1"; }
    catch (e) { return false; }
}
function setReconcileComplete_(playerId, complete) {
    const pid = resolvedPid_(playerId);
    if (!pid) return;
    try {
        const key = accountKey_(KEY_RECONCILED, pid);
        if (complete) localStorage.setItem(key, "1");
        else localStorage.removeItem(key);
    } catch (e) {}
}

//=============================================================================
// 存档文件读写：NW.js 读写文件字节；安卓经 AndroidSave 读写 UTF-8 字符串。
// MZ 的 .rmmzsave 正是 pako 二进制串按 UTF-8 落盘，两条路径可互相还原。
//=============================================================================
function readSaveBytes(saveName) {
    try {
        if (isAndroidStorage_()) {
            const data = AndroidSave.loadSave(String(StorageManager.filePath(saveName)));
            return data ? String(data) : null;
        }
        const fs = require("fs");
        const p = StorageManager.filePath(saveName);
        if (!fs.existsSync(p)) return null;
        return fs.readFileSync(p);
    } catch (e) { return null; }
}
function writeSaveBytes(saveName, arrayBuffer) {
    if (isAndroidStorage_()) {
        AndroidSave.saveGame(
            String(StorageManager.filePath(saveName)),
            saveBytesToZipString_(arrayBuffer)
        );
        if (/^file\d+$/.test(String(saveName))) realSavePresenceCache_ = true;
        return;
    }
    const fs = require("fs");
    const path = require("path");
    const filePath = StorageManager.filePath(saveName);
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    if (/^file\d+$/.test(String(saveName))) realSavePresenceCache_ = true;
}
function localSaveExists_(saveName) {
    try {
        if (isAndroidStorage_()) {
            return !!AndroidSave.SaveExists(String(StorageManager.filePath(saveName)));
        }
        const fs = require("fs");
        return fs.existsSync(StorageManager.filePath(saveName));
    } catch (e) { return false; }
}

// config/global 本身不算真实存档；至少有一个 file0..file20 才允许上传。
// 负结果会缓存，避免频繁写 config 时每次扫描 21 个文件；
// fileN/global 写入会在下方 markDirty 中确认或失效该缓存。
let realSavePresenceCache_ = null;
function hasRealLocalSave_() {
    if (realSavePresenceCache_ !== null) return realSavePresenceCache_;
    for (let i = 0; i <= SLOT_MAX; i++) {
        if (localSaveExists_("file" + i)) {
            realSavePresenceCache_ = true;
            return true;
        }
    }
    realSavePresenceCache_ = false;
    return false;
}

//=============================================================================
// 脏集合（localStorage 持久：崩溃/退出没传完的，下次启动补传）
//=============================================================================
function getDirty(playerId) {
    try {
        const value = JSON.parse(localStorage.getItem(accountKey_(KEY_DIRTY, playerId)) || "[]");
        return Array.isArray(value) ? value.map(String).filter(s => SYNCABLE_RE.test(s)) : [];
    } catch (e) { return []; }
}
function setDirty(arr, playerId) {
    try { localStorage.setItem(accountKey_(KEY_DIRTY, playerId), JSON.stringify(arr)); } catch (e) {}
}
CS.markDirty = function(slot, playerId) {
    const pid = resolvedPid_(playerId);
    const name = String(slot);
    if (/^file\d+$/.test(name)) realSavePresenceCache_ = true;
    else if (name === "global") realSavePresenceCache_ = null;
    forgetRestoredVersion_(name, pid);
    const d = getDirty(pid);
    if (!d.includes(name)) { d.push(name); setDirty(d, pid); }
};
CS.lastSync = function(playerId) {
    try { return Number(localStorage.getItem(accountKey_(KEY_LAST, playerId)) || 0); }
    catch (e) { return 0; }
};

// 与 maybeFlush 使用同一时间戳和间隔计算界面倒计时。向上取整到分钟，
// 避免尚有几十秒冷却时提前显示“下次存档将上传”。
function uploadCooldownMinutes_(playerId) {
    const last = CS.lastSync(playerId);
    if (!last) return 0;
    const remainingMs = last + Math.max(0, P_syncHours) * 3600000 - Date.now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 60000) : 0;
}

function autoUploadHint_(playerId) {
    const minutes = uploadCooldownMinutes_(playerId);
    if (minutes <= 0) {
        return T("nextSaveWillUpload",
            "(Your cloud save will upload automatically the next time you save)");
    }
    return formatText_(T("nextUploadIn",
        "(Next upload can be triggered in %1 hr %2 min)"),
        Math.floor(minutes / 60), minutes % 60);
}

function adoptAnonymousDirty_(playerId) {
    const pid = resolvedPid_(playerId);
    if (!pid) return;
    const anonymousKey = KEY_DIRTY + ":anonymous";
    let anonymous = [];
    try {
        const value = JSON.parse(localStorage.getItem(anonymousKey) || "[]");
        if (Array.isArray(value)) anonymous = value.map(String).filter(s => SYNCABLE_RE.test(s));
    } catch (e) {}
    if (!anonymous.length) return;
    const merged = [...new Set(getDirty(pid).concat(anonymous))];
    setDirty(merged, pid);
    for (const slot of anonymous) forgetRestoredVersion_(slot, pid);
    try { localStorage.removeItem(anonymousKey); } catch (e) {}
}

//=============================================================================
// 存档钩子：钩在 StorageManager.saveObject（所有存档类文件的统一落盘点）——
// fileN(存档)/global(列表)/config(设置)/drill_global(Drill全局变量) 全覆盖，
// 本地写入成功 → 标脏 → 尝试冲刷（受 24h 尾随合并约束）
//=============================================================================
const SYNCABLE_RE = /^(file\d+|global|config|drill_global)$/;

const _SM_saveObject = StorageManager.saveObject;
StorageManager.saveObject = function(saveName, object) {
    return _SM_saveObject.call(this, saveName, object).then(result => {
        try {
            if (SYNCABLE_RE.test(String(saveName))) {
                CS.markDirty(String(saveName));
                CS.maybeFlush(false);   // fire-and-forget
            }
        } catch (e) { console.warn("[CloudSave] mark failed", e); }
        return result;
    });
};

//=============================================================================
// 首次 backfill：本地已有的全部存档标脏（含 GoogleDrive 恢复来的）
//=============================================================================
// 可同步文件全集：存档槽 + 三个全局文件（global=列表 / config=设置 / drill_global=Drill全局变量）
function syncableNames_() {
    const names = ["global", "config", "drill_global"];
    for (let i = 0; i <= SLOT_MAX; i++) names.push("file" + i);
    return names;
}

CS.backfillIfNeeded = function(playerId) {
    try {
        const pid = resolvedPid_(playerId);
        if (!hasSaveStorage_() || !pid) return;
        adoptAnonymousDirty_(pid);
        const key = accountKey_(KEY_BACKFILLED, pid);
        if (localStorage.getItem(key) === "1") return;
        for (const n of syncableNames_()) {
            if (localSaveExists_(n)) CS.markDirty(n, pid);
        }
        localStorage.setItem(key, "1");
    } catch (e) { /* 静默 */ }
};

//=============================================================================
// 冲刷：把脏槽位逐个上传（force=true 时无视 24h 间隔，供手动同步按钮用）
//=============================================================================
CS._flushing = false;
CS._restoring = false;
CS._reconciling = false;
CS._reconcilePendingPid = null;
CS._reconcileUploadBlockedPid = null;
CS._reconcileSnapshot = null;
CS._reconcileAttemptedPids = new Set();
CS._reconcileLaunchToken = null;
CS.maybeFlush = async function(force) {
    const currentPid = CS.getPlayerId();
    if (CS._reconciling || CS._reconcilePendingPid) {
        return { done: false, reason: "reconciling" };
    }
    if (currentPid && (CS._reconcileUploadBlockedPid === currentPid ||
        !reconcileComplete_(currentPid))) {
        return { done: false, reason: "reconcileRequired" };
    }
    if (CS._restoring) return { done: false, reason: "restoring" };
    if (CS._flushing) return { done: false, reason: "busy" };
    if (!hasSaveStorage_()) return { done: false, reason: "unsupportedStorage" };
    const pid = currentPid;
    if (!pid) return { done: false, reason: "notLoggedIn" };
    CS.backfillIfNeeded(pid);
    if (!getDirty(pid).length) return { done: false, reason: "clean" };
    if (!hasRealLocalSave_()) {
        // 旧版可能因只上传 config 写入了冷却时间；清掉它，
        // 使首个真实存档产生后可以立即同步。脏标记全部保留。
        try { localStorage.removeItem(accountKey_(KEY_LAST, pid)); } catch (e) {}
        return { done: false, reason: "noLocalSave" };
    }
    const due = force || CS.lastSync(pid) === 0 ||
        Date.now() - CS.lastSync(pid) >= P_syncHours * 3600000;
    if (!due) return { done: false, reason: "cooldown" };

    CS._flushing = true;
    let okCount = 0, failCount = 0;
    try {
        // 动态取队列：DataManager 保存 fileN 后才写 global，global 可能在本轮
        // fileN 上传期间才入队；固定快照会漏掉它并被 24h cooldown 卡住。
        const attempted = new Set();
        while (true) {
            if (CS.getPlayerId() !== pid) break;
            const slot = getDirty(pid).find(s => !attempted.has(s));
            if (!slot) break;
            attempted.add(slot);
            const bytes = readSaveBytes(slot);
            if (!bytes) {   // 本地文件已不存在（被删的槽位）：出队
                setDirty(getDirty(pid).filter(s => s !== slot), pid);
                continue;
            }
            const ok = await uploadSlot_(pid, slot, bytes);
            if (ok) { okCount++; setDirty(getDirty(pid).filter(s => s !== slot), pid); }
            else failCount++;   // 保留脏标记，下个窗口/下次启动重试
            await sleep(150);
        }
        if (okCount > 0) localStorage.setItem(accountKey_(KEY_LAST, pid), String(Date.now()));
    } finally { CS._flushing = false; }
    console.log("[CloudSave] flush:", okCount, "ok,", failCount, "failed,", getDirty(pid).length, "still dirty");
    return { done: true, ok: okCount, fail: failCount };
};

async function uploadSlot_(pid, slot, bytes) {
    try {
        const headers = { "X-Player-Id": pid, "X-Device-Id": CS.getDeviceId() };
        const m = /^file(\d+)$/.exec(slot);
        if (m && DataManager._globalInfo && DataManager._globalInfo[Number(m[1])]) {
            const info = DataManager._globalInfo[Number(m[1])];
            // day/hour/min/gold 来自 Shiroin_SaveUI 写入 savefileInfo 的字段，
            // 云存档列表与存读档界面显示同源信息（图标+数值同款绘制）
            const meta = {
                title: info.title, playtime: info.playtime, timestamp: info.timestamp,
                day: info.svuiDay, hour: info.svuiHour, min: info.svuiMin, gold: info.svuiGold
            };
            headers["X-Save-Meta"] = encodeURIComponent(JSON.stringify(meta));
        }
        const uploadBody = typeof bytes === "string" ? bytes : new Uint8Array(bytes);
        const d = await requestJson_(P_serverBase + "/upload/" + slot, {
            method: "POST", headers: headers, body: uploadBody
        });
        if (!d.ok) console.warn("[CloudSave] upload rejected:", slot, d.error);
        return !!d.ok;
    } catch (e) {
        console.warn("[CloudSave] upload failed:", slot, e);
        return false;
    }
}

//=============================================================================
// 触发点：标题/进图时检查。账号尚未完成过登录对照（含上次中断/失败）时
// 优先恢复对照流程；完成后才允许 backfill 的本地数据进入自动上传。
//=============================================================================
function reconcileOrFlush_() {
    const pid = CS.getPlayerId();
    if (pid && !reconcileComplete_(pid)) {
        // 同一运行期间失败/中断后保持上传封锁，但不循环弹窗；玩家重新登录
        // 会直接调用 notifyLoginSuccess，或下次启动时再自动尝试一次。
        if (!CS._reconcileAttemptedPids.has(pid)) CS.notifyLoginSuccess(pid);
        return;
    }
    CS.maybeFlush(false);
}
const _SceneTitle_start_CS = Scene_Title.prototype.start;
Scene_Title.prototype.start = function() {
    _SceneTitle_start_CS.call(this);
    try { reconcileOrFlush_(); } catch (e) {}
};
const _SceneMap_start_CS = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
    _SceneMap_start_CS.call(this);
    try { reconcileOrFlush_(); } catch (e) {}
};

//=============================================================================
// 维护工具：强制全量重新上传（控制台/事件脚本用，玩家无入口）
//   ShiroinCloudSave.forceSyncAll()
// 用途：刷新云端旧版 meta（如补 day/gold 字段）、迁移 R2 路径后重建对象等。
// 注意：服务端同槽位有 5 分钟背压，刚上传过的槽会 429 并保留脏标记，
//       稍后再跑一次或等下次自然冲刷即可补齐。
//=============================================================================
CS.forceSyncAll = function() {
    if (!hasSaveStorage_()) {
        console.warn("[CloudSave] forceSyncAll: unsupported storage backend");
        return Promise.resolve(null);
    }
    try {
        for (const n of syncableNames_()) {
            if (localSaveExists_(n)) CS.markDirty(n);
        }
    } catch (e) {}
    return CS.maybeFlush(true);
};

//=============================================================================
// ★★★ confirm() 多语言接口（覆写即可接入你的多语言系统，每次打开动态调用）★★★
//   API 1: 单槽提示   ShiroinCloudSave.getConfirmTitle(slotLabel)
//   API 2: 批量提示   ShiroinCloudSave.getConfirmAllTitle(total, localNewer)
//   API 3: 登录对照   ShiroinCloudSave.getReconcileConfirmTitle(overlap, cloudOnly)
//   API 4: 按钮文本   ShiroinCloudSave.getOptionText(symbol)  symbol: "yes"|"no"
//   默认按钮文本委托 Shiroin_SaveUI 已接好的 Yes/No 词表；提示文本回退
//   systemFeatureText.cloudSave。多行本地化建议使用字符串数组，由 T() 统一 join。
//   覆写示例（写在你自己的插件里，本插件之后加载）：
//     ShiroinCloudSave.getConfirmTitle = label => MyI18N.t("cloud.askDownload") + "\n" + label;
//=============================================================================
CS.getConfirmTitle = CS.getConfirmTitle || function(slotLabel) {
    return T("confirmDownload", "Overwrite local:") + "\n" + (slotLabel || "");
};
CS.getConfirmAllTitle = CS.getConfirmAllTitle || function(total, localNewer) {
    let text = formatText_(T("confirmSyncAll",
        "Download %1 unsynced cloud saves?\nOverwrite the matching local slots."), total);
    if (localNewer > 0) {
        text += "\n" + formatText_(T("confirmSyncAllLocalNewer",
            "Warning: %1 local saves are newer."), localNewer);
    }
    return text;
};
CS.getReconcileConfirmTitle = CS.getReconcileConfirmTitle || function(overlap, cloudOnly) {
    return formatText_(T("confirmReconcileOverlap",
        "Overlapping save slots: %1.\n" +
        "Yes: replace local with cloud.\n" +
        "No: keep local for normal cloud sync.\n" +
        "Cloud-only downloads: %2 (automatic)."), overlap, cloudOnly);
};
CS.getOptionText = CS.getOptionText || function(symbol) {
    if (window.ShiroinSaveUI && typeof ShiroinSaveUI.getOptionText === "function") {
        return ShiroinSaveUI.getOptionText(symbol);
    }
    return symbol === "yes" ? "Yes" : "No";
};

// rpg_custom_Dialog_MZ.js 将 window.confirm 改写为可 await 的 DOM 对话框。
// 统一从这里传入左对齐、宽度和多语言按钮文本，避免各场景重复配置。
function cloudConfirm_(message, width) {
    return Promise.resolve(window.confirm(String(message || ""), {
        width: Number(width) || 560,
        align: "left",
        //confirmText: String(CS.getOptionText("yes")),
        //cancelText: String(CS.getOptionText("no"))
    })).then(Boolean);
}

//=============================================================================
// 服务器 API：清单 / 下载 / 恢复
//=============================================================================
CS.fetchList = async function() {
    const pid = CS.getPlayerId();
    if (!pid) return { ok: false, error: "notLoggedIn" };
    try {
        return await requestJson_(P_serverBase + "/list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId: pid, deviceId: CS.getDeviceId() })
        });
    } catch (e) { return { ok: false, error: String(e) }; }
};

CS.downloadSlot = async function(slot) {
    const pid = CS.getPlayerId();
    if (!pid) return null;
    try {
        return await requestArrayBuffer_(P_serverBase + "/download/" + slot, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId: pid, deviceId: CS.getDeviceId() })
        });
    } catch (e) { return null; }
};

// 解析云端下载的 .rmmzsave 字节（MZ 编码：pako.deflate 二进制串 → utf8 落盘）
function saveBytesToZipString_(data) {
    if (typeof data === "string") return data;
    const bytes = data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength);
    if (typeof TextDecoder === "function") return new TextDecoder("utf-8").decode(bytes);
    if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("utf8");
    throw new Error("UTF-8 decoder unavailable");
}
function parseSaveBytes_(arrayBuffer) {
    const zipStr = saveBytesToZipString_(arrayBuffer);
    const jsonStr = pako.inflate(zipStr, { to: "string" });
    return JsonEx.parse(jsonStr);
}
function validateSaveBytes_(arrayBuffer) {
    const zipStr = saveBytesToZipString_(arrayBuffer);
    const jsonStr = pako.inflate(zipStr, { to: "string" });
    JSON.parse(jsonStr);
}

// 旧云档可能只有 fileN 本体与 D1 meta，没有同步上传 global，或 global 里的
// 对应条目已经过期。此时从已验证的存档内容重建 savefileInfo，避免因为一个
// 共享索引文件缺失而让所有实际完好的槽位都无法恢复。
function rebuildSavefileInfo_(slot, contents) {
    const entry = (CS._cloudEntries && CS._cloudEntries[slot]) || {};
    const meta = entry.meta && typeof entry.meta === "object" ? entry.meta : {};
    let info = null;

    if (window.ShiroinSaveUI &&
        typeof ShiroinSaveUI.buildSavefileInfoFromContents === "function") {
        try { info = ShiroinSaveUI.buildSavefileInfoFromContents(contents); }
        catch (e) { console.warn("[CloudSave] savefileInfo rebuild hook failed:", slot, e); }
    }
    if (!info || typeof info !== "object" || Array.isArray(info)) info = {};

    // D1 meta 保存的是上传当时的展示值，优先覆盖重建函数中只能估算的字段。
    if (meta.title != null) info.title = String(meta.title);
    if (meta.playtime != null) info.playtime = String(meta.playtime);
    if (meta.day != null) info.svuiDay = meta.day;
    if (meta.hour != null) info.svuiHour = meta.hour;
    if (meta.min != null) info.svuiMin = meta.min;
    if (meta.gold != null) info.svuiGold = meta.gold;

    const timestamp = Number(meta.timestamp) || Number(entry.ts) || Number(info.timestamp);
    info.timestamp = timestamp > 0 ? timestamp : Date.now();
    if (info.title == null) {
        try { info.title = String($dataSystem.gameTitle || ""); }
        catch (e) { info.title = ""; }
    }
    if (info.playtime == null) {
        try { info.playtime = String(contents.system.playtimeText() || ""); }
        catch (e) { info.playtime = ""; }
    }
    if (!Array.isArray(info.characters)) {
        try { info.characters = contents.party.charactersForSavefile(); }
        catch (e) { info.characters = []; }
    }
    if (!Array.isArray(info.faces)) {
        try { info.faces = contents.party.facesForSavefile(); }
        catch (e) { info.faces = []; }
    }
    return info;
}

// 批量恢复：fileN 串行下载；global/config/drill_global 各只下载一次。
// 仅合并成功槽位的 globalInfo，失败槽和本地独有槽位保持不动。
CS.restoreSlots = async function(slots, onProgress) {
    if (!hasSaveStorage_()) {
        return { ok: false, error: "unsupportedStorage", okCount: 0, failCount: 0 };
    }
    const pid = CS.getPlayerId();
    if (!pid) return { ok: false, error: "notLoggedIn", okCount: 0, failCount: 0 };
    const targets = [...new Set((slots || []).map(String).filter(s => /^file\d+$/.test(s)))];
    if (!targets.length) return { ok: true, okCount: 0, failCount: 0, failedSlots: [] };
    if (CS._flushing || CS._restoring) {
        return { ok: false, error: "busy", okCount: 0, failCount: targets.length, failedSlots: targets };
    }

    // 首次登录后若尚未 backfill，必须在覆盖前记录原有本地文件；否则下次
    // backfill 会把刚恢复的云端文件重新标脏并反向上传。
    CS.backfillIfNeeded(pid);
    CS._restoring = true;
    const written = [];
    const completed = [];
    const restoredShared = [];
    const restoredInfo = Object.create(null);
    try {
        // 先取一次云端 global。若它缺失或没有某个槽位条目，下方会从该槽位
        // 的存档内容重建 savefileInfo，不再把 global 当作恢复的单点故障。
        let cloudGlobal = null;
        const gbuf = await CS.downloadSlot("global");
        if (gbuf) {
            try { cloudGlobal = parseSaveBytes_(gbuf); }
            catch (e) { console.warn("[CloudSave] globalInfo parse failed", e); }
        }

        for (let i = 0; i < targets.length; i++) {
            const slot = targets[i];
            let ok = false;
            const n = Number(slot.slice(4));
            try {
                const buf = await CS.downloadSlot(slot);
                if (!buf) throw new Error("downloadFailed");
                let info = cloudGlobal && cloudGlobal[n];
                if (info) {
                    // 完整解压并验证 JSON 后才覆盖本地，避免损坏的云对象先毁掉本地档。
                    validateSaveBytes_(buf);
                } else {
                    const contents = parseSaveBytes_(buf);
                    info = rebuildSavefileInfo_(slot, contents);
                    console.info("[CloudSave] rebuilt missing globalInfo:", slot);
                }
                restoredInfo[slot] = info;
                writeSaveBytes(slot, buf);
                written.push(slot);
                ok = true;
            } catch (e) {
                console.warn("[CloudSave] slot restore failed:", slot, e);
            }
            if (typeof onProgress === "function") {
                try { onProgress(i + 1, targets.length, slot, ok); } catch (e) {}
            }
        }

        // 用副本合并，并直接调用捕获的原始 saveObject：只绕过本插件本次 global
        // 落盘的标脏钩子；恢复期间其他真实保存仍会正常进入 dirty 集合。
        if (written.length) {
            try {
                const mergedGlobal = Array.isArray(DataManager._globalInfo)
                    ? DataManager._globalInfo.slice() : [];
                for (const slot of written) {
                    const n = Number(slot.slice(4));
                    mergedGlobal[n] = restoredInfo[slot];
                }
                await _SM_saveObject.call(StorageManager, "global", mergedGlobal);
                DataManager._globalInfo = mergedGlobal;
                completed.push(...written);
                for (const slot of completed) rememberRestoredVersion_(slot, pid);
            } catch (e) {
                console.warn("[CloudSave] globalInfo merge failed", e);
            }
        }

        if (completed.length) {
            // config：只恢复一次并热重载；完整视觉刷新仍在场景切换/重启后生效。
            const cbuf = await CS.downloadSlot("config");
            if (cbuf) {
                try {
                    const configData = parseSaveBytes_(cbuf);
                    writeSaveBytes("config", cbuf);
                    restoredShared.push("config");
                    ConfigManager.applyData(configData || {});
                } catch (e) { console.warn("[CloudSave] config restore failed", e); }
            }
            // drill_global：只写盘一次，下次启动时由 Drill 自行读取。
            const dbuf = await CS.downloadSlot("drill_global");
            if (dbuf) {
                try {
                    validateSaveBytes_(dbuf);
                    writeSaveBytes("drill_global", dbuf);
                    restoredShared.push("drill_global");
                } catch (e) { console.warn("[CloudSave] drill_global restore failed", e); }
            }
        }

        // 被云端覆盖的本地文件不再是待上传脏数据，防止稍后反向覆盖云端。
        // global 是所有槽共享的索引表：保留其恢复前已有的 dirty 标记，确保
        // 本地独有槽位的元数据仍会上传。只清掉确实被云端覆盖的文件。
        const restored = new Set(written.concat(restoredShared));
        if (restored.size) setDirty(getDirty(pid).filter(s => !restored.has(s)), pid);
    } finally {
        CS._restoring = false;
    }

    return {
        ok: completed.length === targets.length,
        okCount: completed.length,
        failCount: targets.length - completed.length,
        failedSlots: targets.filter(slot => !completed.includes(slot))
    };
};

// 单槽恢复沿用同一编排，避免与批量路径产生不同的落盘/脏标记行为。
CS.restoreSlot = async function(slot) {
    const result = await CS.restoreSlots([slot]);
    return result.okCount === 1
        ? { ok: true }
        : { ok: false, error: result.error || "downloadFailed" };
};

//=============================================================================
// Scene_CloudSave —— 云存档界面：清单 + 单槽/批量下载恢复（覆盖前确认）
//=============================================================================
const CLOUD_HELP_NOTICE_FONT_OFFSET = 8;

function Window_CloudSaveHelp() { this.initialize(...arguments); }
Window_CloudSaveHelp.prototype = Object.create(Window_Help.prototype);
Window_CloudSaveHelp.prototype.constructor = Window_CloudSaveHelp;
Window_CloudSaveHelp.prototype.initialize = function(rect) {
    this._fontSizeOffset = 0;
    Window_Help.prototype.initialize.call(this, rect);
};
Window_CloudSaveHelp.prototype.resetFontSettings = function() {
    Window_Help.prototype.resetFontSettings.call(this);
    if (this.contents) this.contents.fontSize += this._fontSizeOffset;
};
Window_CloudSaveHelp.prototype.setNoticeText = function(text, fontSizeOffset) {
    const value = String(text == null ? "" : text);
    const offset = Number(fontSizeOffset) || 0;
    const textChanged = this._text !== value;
    const offsetChanged = this._fontSizeOffset !== offset;
    this._fontSizeOffset = offset;
    Window_Help.prototype.setText.call(this, value);
    // Window_Help.setText 只会在文字变化时刷新；只有字号变化时需主动重绘。
    if (!textChanged && offsetChanged) this.refresh();
};

function Scene_CloudSave() { this.initialize(...arguments); }
window.Scene_CloudSave = Scene_CloudSave;
Scene_CloudSave.prototype = Object.create(Scene_MenuBase.prototype);
Scene_CloudSave.prototype.constructor = Scene_CloudSave;

Scene_CloudSave.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this._slots = [];
    this._loading = true;
    this._confirming = false;
    this.createHeaderWindow();
    this.createHintWindow();
    this.createListWindow();
    this.createGDriveButton();
    this.refreshHeader();
    this.setHelpText(T("loading", "Loading cloud saves..."));
    this.requestList();
};

//=============================================================================
// 右上角 Google Drive 按钮 —— 进入旧版云存档界面（玩家自有网盘托管，
// 不要求登录状态；留给尚未迁移存档的老玩家）
//=============================================================================
const GDRIVE_BTN_SCALE_HOVER = 1.2;   // 悬停放大倍率

Scene_CloudSave.prototype.createGDriveButton = function() {
    const spr = new Sprite(ImageManager.loadSystem("googleDrive"));
    spr.anchor.set(0.5, 0.5);
    spr.x = Graphics.boxWidth - 96;   // 右上角（标题行右侧空区，滚动条上方）
    spr.y = 56;
    this._gdriveButton = spr;
    this._gdriveHover = false;
    this.addChild(spr);
};

Scene_CloudSave.prototype.updateGDriveButton = function() {
    const spr = this._gdriveButton;
    if (!spr || !spr.bitmap) return;
    // DOM confirm 期间禁用，防误触跳场景
    if (this._confirming) {
        if (this._gdriveHover) { this._gdriveHover = false; spr.scale.set(1); }
        return;
    }
    const w = spr.bitmap.width * spr.scale.x;
    const h = spr.bitmap.height * spr.scale.y;
    const x = spr.x - w * spr.anchor.x;
    const y = spr.y - h * spr.anchor.y;
    const hit = w > 0 && h > 0 &&
        TouchInput.x >= x && TouchInput.x <= x + w &&
        TouchInput.y >= y && TouchInput.y <= y + h;
    if (hit !== this._gdriveHover) {
        this._gdriveHover = hit;
        spr.scale.set(hit ? GDRIVE_BTN_SCALE_HOVER : 1);
        if (hit) SoundManager.playCursor();
    }
    if (hit && TouchInput.isTriggered() && window.Scene_GoogleDrive) {
        SoundManager.playOk();
        SceneManager.push(window.Scene_GoogleDrive);
    }
};

Scene_CloudSave.prototype.update = function() {
    Scene_MenuBase.prototype.update.call(this);
    this.updateGDriveButton();
    // 场景停留跨分钟时自动更新；上传在后台完成并改变 lastSync 时也会刷新。
    if (this._headerCooldownMinutes !== uploadCooldownMinutes_()) {
        this.refreshHeader();
    }
};

Scene_CloudSave.prototype.createHeaderWindow = function() {
    const wh = this.calcWindowHeight(2, false);
    this._headerWindow = new Window_Base(new Rectangle(8, 8, Graphics.boxWidth - 16, wh));
    this.addWindow(this._headerWindow);
};

Scene_CloudSave.prototype.refreshHeader = function() {
    const w = this._headerWindow;
    w.contents.clear();
    const indent = 150;   // 避开 Drill_MenuBackButton
    w.resetFontSettings();
    w.changeTextColor(ColorManager.systemColor());
    w.drawText(T("title", "Cloud Save"), indent, 0, w.innerWidth - indent, "left");
    w.resetTextColor();
    const last = CS.lastSync();
    const lastText = T("lastSync", "Last sync: ") +
        (last ? formatTs_(last) : T("neverSynced", "never"));
    w.drawText(lastText, indent, w.lineHeight(), w.innerWidth - indent, "left");
    this._headerCooldownMinutes = uploadCooldownMinutes_();
    if (CS.getPlayerId()) {
        const hintX = indent + w.textWidth(lastText) + 16;
        w.contents.fontSize = Math.max(18, w.contents.fontSize - 4);
        w.changeTextColor(ColorManager.systemColor());
        w.drawText(autoUploadHint_(), hintX, w.lineHeight(),
            Math.max(0, w.innerWidth - hintX), "left");
        w.resetFontSettings();
    }
};

Scene_CloudSave.prototype.createHintWindow = function() {
    const y = this._headerWindow.y + this._headerWindow.height + 8;
    // drawTextEx 的单行实际高度为 fontSize + (lineHeight - mainFontSize)。
    // 提示字号放大 8px 后实际绘制高度也增加 8px，内容位图必须同步扩高。
    const wh = this.calcWindowHeight(1, false) + CLOUD_HELP_NOTICE_FONT_OFFSET;
    this._helpWindow = new Window_CloudSaveHelp(new Rectangle(8, y, Graphics.boxWidth - 16, wh));
    this.addWindow(this._helpWindow);
};

Scene_CloudSave.prototype.setHelpText = function(text, fontSizeOffset) {
    this._helpWindow.setNoticeText(text, fontSizeOffset);
};

Scene_CloudSave.prototype.createListWindow = function() {
    const y = this._helpWindow.y + this._helpWindow.height + 8;
    // 窗口高度对齐 itemHeight 整数倍，防止底行被拦腰裁切（铁律）
    const itemH = Window_CloudSaveList.prototype.itemHeight.call({ });
    const pad2 = $gameSystem.windowPadding() * 2;
    const availH = Graphics.boxHeight - y - 16;
    const rows = Math.max(3, Math.floor((availH - pad2) / itemH));
    const wh = rows * itemH + pad2;
    // 窗口整体左右留白：光标框(=itemRect)与滚动条跟随窗口几何，收窄窗口
    // 才能让它们离开屏幕边缘（只改绘制位置不够）
    const marginX = Window_CloudSaveList.MARGIN_X;
    const win = new Window_CloudSaveList(new Rectangle(marginX, y, Graphics.boxWidth - marginX * 2, wh));
    win.setHandler("ok", this.onListOk.bind(this));
    win.setHandler("cancel", this.popScene.bind(this));
    this._listWindow = win;
    this.addWindow(win);
    // 未登录时从首帧起就不创建“一键同步”这一行，避免清单请求返回前闪现。
    win.setData([], !!CS.getPlayerId());
    win.activate();
    // 不自动选中任何行：防止误按 OK 触发非预期的同步行为
    win.select(-1);
};

// 批量/单槽写盘期间禁止从列表取消或点击 Drill 左上返回按钮离场。
Scene_CloudSave.prototype.popScene = function() {
    if (this._confirming ||
        (this._listWindow && this._listWindow._syncBusy) || CS._restoring) {
        // Drill_MenuBackButton 默认假定 popScene 一定成功，拒绝离场时需手动
        // 清掉其按下锁；否则下一次松开指针会在同步结束后意外再次返回。
        resetDrillBackButton_(this);
        SoundManager.playBuzzer();
        return;
    }
    Scene_MenuBase.prototype.popScene.call(this);
};

Scene_CloudSave.prototype.requestList = function() {
    CS.fetchList().then(d => {
        if (SceneManager._scene !== this) return;   // 场景已离开
        this._loading = false;
        const notLoggedIn = !d.ok && d.error === "notLoggedIn";
        if (!d.ok) {
            this._slots = [];
            cacheCloudEntries_([]);
            this.setHelpText(
                notLoggedIn ? T("notLoggedIn", "Please log in first")
                            : T("listFailed", "Failed to load cloud saves"),
                notLoggedIn ? CLOUD_HELP_NOTICE_FONT_OFFSET : 0);
        } else {
            // 界面只列存档槽；config/drill_global 不单独罗列——
            // 它们随每一次存档下载自动一并恢复（见 restoreSlot）
            this._slots = (d.slots || [])
                .filter(s => /^file\d+$/.test(s.slot))
                .sort((a, b) => Number(a.slot.slice(4)) - Number(b.slot.slice(4)));
            cacheCloudEntries_(this._slots);
            this.setHelpText(this._slots.length
                ? T("hint", "Download one cloud save, or use the top button to sync all")
                : T("empty", "No cloud saves yet"));
        }
        // 当前已退出登录或明确收到 notLoggedIn 时，列表连 index 0 也不存在。
        this._listWindow.setData(this._slots, !notLoggedIn && !!CS.getPlayerId());
    });
};

Scene_CloudSave.prototype.onListOk = async function() {
    const win = this._listWindow;
    if (this._confirming || win._syncBusy) return;
    win.activate();
    if (!hasSaveStorage_()) {
        SoundManager.playBuzzer();
        this.setHelpText(T("unsupportedStorage", "Cloud restore is not supported on this device"));
        return;
    }

    const index = win.index();
    const isBatch = win.isSyncAllIndex(index);
    const entries = isBatch ? win.unsyncedEntries() : [win.entryAt(index)].filter(Boolean);
    if (!entries.length) return;
    const slots = entries.map(e => e.slot);
    const prompt = isBatch
        ? CS.getConfirmAllTitle(entries.length,
            entries.filter(e => compareStatus_(e).state === "localNewer").length)
        : CS.getConfirmTitle(slotLabel_(entries[0].slot));

    this._confirming = true;
    win.deactivate();
    Input.clear();
    TouchInput.clear();
    let accepted = false;
    try {
        accepted = await cloudConfirm_(prompt, isBatch ? 720 : 600);
    } catch (e) {
        console.warn("[CloudSave] confirmation failed", e);
    } finally {
        this._confirming = false;
    }
    if (SceneManager._scene !== this) return;
    Input.clear();
    TouchInput.clear();
    if (!accepted) {
        win.activate();
        return;
    }
    this.startDownload(slots, isBatch);
};

Scene_CloudSave.prototype.startDownload = function(slots, isBatch) {
    slots = (slots || []).slice();
    isBatch = !!isBatch;
    if (!slots.length) {
        this._listWindow.activate();
        return;
    }

    const list = this._listWindow;
    list.setBusy(true);
    const progress = (done, total) => {
        if (SceneManager._scene !== this || !isBatch) return;
        this.setHelpText(formatText_(T("syncAllProgress",
            "Syncing cloud saves... %1/%2"), done, total));
    };
    this.setHelpText(isBatch
        ? formatText_(T("syncAllProgress", "Syncing cloud saves... %1/%2"), 0, slots.length)
        : T("downloading", "Downloading..."));

    const task = isBatch ? CS.restoreSlots(slots, progress) : CS.restoreSlot(slots[0]);
    Promise.resolve(task).then(r => {
        if (SceneManager._scene !== this) return;
        if (isBatch) {
            if (r.failCount === 0) {
                SoundManager.playSave();
                this.setHelpText(formatText_(T("syncAllDone",
                    "Cloud saves synced: %1 restored"), r.okCount));
            } else {
                SoundManager.playBuzzer();
                this.setHelpText(formatText_(T("syncAllPartial",
                    "Sync finished: %1 restored, %2 failed"), r.okCount, r.failCount));
            }
        } else if (r.ok) {
            SoundManager.playSave();
            this.setHelpText(T("downloadDone", "Restored to local save"));
        } else {
            SoundManager.playBuzzer();
            this.setHelpText(T("downloadFailed", "Download failed"));
        }
    }).catch(e => {
        console.warn("[CloudSave] restore task failed", e);
        if (SceneManager._scene !== this) return;
        SoundManager.playBuzzer();
        this.setHelpText(T("downloadFailed", "Download failed"));
    }).finally(() => {
        if (SceneManager._scene !== this) return;
        list.setBusy(false);
        list.refresh();   // 本地时间戳变了，刷新状态和 index 0 的启用状态
        list.activate();
    });
};

//=============================================================================
// 列表窗口：每行一个云端存档槽（名称 / 游戏内Day·时间 / 状态 / 云端时间）
// 上传没有手动入口——完全由存档行为自动触发（24h 尾随合并），避免无谓写入
//=============================================================================
function Window_CloudSaveList() { this.initialize(...arguments); }
Window_CloudSaveList.prototype = Object.create(Window_Selectable.prototype);
Window_CloudSaveList.prototype.constructor = Window_CloudSaveList;
Window_CloudSaveList.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this._slots = [];
    this._showSyncAll = false;
    this._syncBusy = false;
    this.refresh();
};
Window_CloudSaveList.prototype.setSlots = function(slots) {
    this.setData(slots, this._showSyncAll);
};
Window_CloudSaveList.prototype.setData = function(slots, showSyncAll) {
    this._slots = slots || [];
    this._showSyncAll = !!showSyncAll;
    this.refresh();
};
Window_CloudSaveList.prototype.setBusy = function(busy) {
    if (this._syncBusy === !!busy) return;
    this._syncBusy = !!busy;
    this.refresh();
};
// 行高加大：触屏（安卓）点击目标更宽裕，也顺带拉开视觉密度
Window_CloudSaveList.prototype.itemHeight = function() {
    return Window_Base.prototype.lineHeight.call(this) + 24;
};
// 窗口整体左右外边距（收窄窗口本体：光标框/滚动条随之离开屏幕边缘）
Window_CloudSaveList.MARGIN_X = 56;
// 窗口内再给内容留一点呼吸位：左给光标箭头(Drill_MenuCursor)与文字的间隙，
// 右给滚动条与时间列的间隙（此处只是行内绘制内缩，主收窄由 MARGIN_X 承担）
Window_CloudSaveList.INSET_L = 36;
Window_CloudSaveList.INSET_R = 24;
// 登录时 index 0 保留给“一键同步”；未登录时不创建该项，真实存档从 index 0 起。
Window_CloudSaveList.prototype.maxItems = function() {
    return this._slots.length + (this._showSyncAll ? 1 : 0);
};
Window_CloudSaveList.prototype.isSyncAllIndex = function(index) {
    return this._showSyncAll && index === 0;
};
Window_CloudSaveList.prototype.entryAt = function(index) {
    return this._slots[index - (this._showSyncAll ? 1 : 0)] || null;
};
Window_CloudSaveList.prototype.unsyncedEntries = function() {
    return this._slots.filter(e => compareStatus_(e).state !== "synced");
};
Window_CloudSaveList.prototype.isSyncAllEnabled = function() {
    return !this._syncBusy && this.unsyncedEntries().length > 0;
};
Window_CloudSaveList.prototype.isCurrentItemEnabled = function() {
    if (this._syncBusy) return false;
    if (this.isSyncAllIndex(this.index())) return this.isSyncAllEnabled();
    return !!this.entryAt(this.index());
};
Window_CloudSaveList.prototype.drawItem = function(index) {
    const rect = this.itemLineRect(index);
    this.resetFontSettings();
    // 内容区：从行矩形左右各收进一段，光标/滚动条不再贴内容
    const cx = rect.x + Window_CloudSaveList.INSET_L;
    const cw = rect.width - Window_CloudSaveList.INSET_L - Window_CloudSaveList.INSET_R;
    if (this.isSyncAllIndex(index)) {
        const enabled = this.isSyncAllEnabled();
        this.changePaintOpacity(enabled);
        this.changeTextColor(enabled ? ColorManager.systemColor() : ColorManager.normalColor());
        // 左对齐（与下方 Slot 列首字对齐）+ 字号加大，突出入口层级
        this.contents.fontSize = $gameSystem.mainFontSize() + 4;
        this.drawText(T("syncAll", "Sync All Cloud Saves"), cx, rect.y, cw, "left");
        this.resetFontSettings();
        this.resetTextColor();
        this.changePaintOpacity(true);
        return;
    }

    const e = this.entryAt(index);
    if (!e) return;
    const meta = e.meta || {};
    const TIME_W = 280;    // 云端时间列
    const STATUS_W = 210;  // 状态列
    const GAP = 24;
    const metaW = cw - 232 - TIME_W - STATUS_W - GAP * 2;
    // 名称 + 游戏内元数据（存读档界面同款：时间/天数/金币 图标+数值）
    this.drawText(slotLabel_(e.slot), cx, rect.y, 220, "left");
    if (meta.day != null) {
        this._drawMetaIcons(meta, cx + 232, rect.y);
    } else {
        // 旧版上传的 meta 无字段：回退显示存档标题
        this.drawText(String(meta.title || ""), cx + 232, rect.y, metaW, "left");
    }
    // 对比状态
    const st = compareStatus_(e);
    this.changeTextColor(st.color);
    this.drawText(st.text, cx + cw - TIME_W - GAP - STATUS_W, rect.y, STATUS_W, "right");
    this.resetTextColor();
    // 云端时间（来源：上传时打包的 globalInfo.timestamp = 该档最后保存时刻；
    // 无 meta 的槽位回退为服务器收到上传的时间）
    this.drawText(formatTs_(metaTs_(e)), cx + cw - TIME_W, rect.y, TIME_W, "right");
};

//=============================================================================
// 游戏内元数据绘制：[时间图标]HH:MM [天数图标]DAY N [金币图标]NG
// 完全复刻 Shiroin_SaveUI_MZ 的 drawSlotMeta 配方（图标46px、RiiTegakiFude 29号、
// 文字/图标双层黑色外发光），保证与存读档界面观感一致
//=============================================================================
const META_TEXT_GLOW = { color: "rgba(0,0,0,0.66)", blur: 9, passes: 4 };
const META_ICON_GLOW = { color: "rgba(0,0,0,0.5)",  blur: 6, passes: 2 };

Window_CloudSaveList.prototype._drawMetaIcons = function(meta, x, y) {
    const hh = String(meta.hour ?? 0).padStart(2, "0");
    const mm = String(meta.min ?? 0).padStart(2, "0");
    const items = [
        { icon: "save_time", text: hh + ":" + mm },
        { icon: "save_day",  text: "DAY " + (meta.day ?? "?") },
        { icon: "save_gold", text: (meta.gold ?? "?") + "G" }
    ];
    const iconSize = 46;
    const gap = 2;       // 图标与文字间距
    const groupGap = 18; // 组间距
    this.contents.fontSize = 29;
    this.contents.fontFace = "RiiTegakiFude";
    this.contents.outlineWidth = 0;
    this.resetTextColor();
    const ctx = this.contents.context;
    let dx = x;
    const iconY = y + Math.floor((36 - iconSize) / 2);   // 图标相对文字行垂直居中
    for (const it of items) {
        const bmp = ImageManager.loadSystem(it.icon);
        if (bmp.isReady()) {
            ctx.save();
            ctx.shadowColor = META_ICON_GLOW.color;
            ctx.shadowBlur = META_ICON_GLOW.blur;
            ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
            for (let i = 0; i < META_ICON_GLOW.passes; i++) {
                this.contents.blt(bmp, 0, 0, bmp.width, bmp.height, dx, iconY, iconSize, iconSize);
            }
            ctx.restore();
        } else if (!this._metaReloadHooked) {
            this._metaReloadHooked = true;
            bmp.addLoadListener(() => { this._metaReloadHooked = false; if (this.contents) this.refresh(); });
        }
        const tw = this.textWidth(it.text);
        ctx.save();
        ctx.shadowColor = META_TEXT_GLOW.color;
        ctx.shadowBlur = META_TEXT_GLOW.blur;
        ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        for (let i = 0; i < META_TEXT_GLOW.passes; i++) {
            this.drawText(it.text, dx + iconSize + gap, y, tw + 4, "left");
        }
        ctx.restore();
        dx += iconSize + gap + tw + groupGap;
    }
    this.resetFontSettings();
};


//=============================================================================
// 登录成功后的自动对照场景
//   cloud-only：无条件恢复；conflict：一次确认后决定云端覆盖或保留本地。
//   本地/云端时间戳（或已恢复云版本）一致的槽位已同步，不参与冲突计数。
//   独立场景提供进度背景；确认交给可 await 的 DOM confirm()，不会与窗口层叠画。
//=============================================================================
function Scene_CloudLoginReconcile() { this.initialize(...arguments); }
window.Scene_CloudLoginReconcile = Scene_CloudLoginReconcile;
Scene_CloudLoginReconcile.prototype = Object.create(Scene_MenuBase.prototype);
Scene_CloudLoginReconcile.prototype.constructor = Scene_CloudLoginReconcile;

Scene_CloudLoginReconcile.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
    this._startedReconcile = false;
    this._awaitingDecision = false;
    this._finishTimer = null;
    this._reconcilePid = null;
    this._finishedReconcile = false;
};

Scene_CloudLoginReconcile.prototype.needsCancelButton = function() { return false; };

Scene_CloudLoginReconcile.prototype.createBackground = function() {
    this._backgroundSprite = new Sprite();
    this._backgroundSprite.bitmap = CS._reconcileSnapshot || SceneManager.backgroundBitmap();
    this._backgroundSprite.opacity = 176;
    if (PIXI.filters && PIXI.filters.BlurFilter) {
        this._backgroundFilter = new PIXI.filters.BlurFilter();
        this._backgroundSprite.filters = [this._backgroundFilter];
    }
    this.addChild(this._backgroundSprite);
};

Scene_CloudLoginReconcile.prototype.create = function() {
    const launchToken = CS._reconcileLaunchToken;
    if (launchToken && launchToken.scene === this) {
        if (launchToken.timer) clearTimeout(launchToken.timer);
        CS._reconcileLaunchToken = null;   // 快照与 gate 的所有权正式交给本 Scene
    }
    Scene_MenuBase.prototype.create.call(this);
    const helpW = Graphics.boxWidth - 160;
    const helpH = this.calcWindowHeight(2, false);
    this._statusWindow = new Window_Help(new Rectangle(
        80, Math.floor(Graphics.boxHeight * 0.13), helpW, helpH));
    this.addWindow(this._statusWindow);
};

Scene_CloudLoginReconcile.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    Input.clear();
    TouchInput.clear();
    if (!this._startedReconcile) {
        this._startedReconcile = true;
        this.runReconcile();
    }
};

Scene_CloudLoginReconcile.prototype.setStatus = function(text) {
    if (this._statusWindow) this._statusWindow.setText(String(text || ""));
};

Scene_CloudLoginReconcile.prototype.runReconcile = async function() {
    const pid = String(CS._reconcilePendingPid || "");
    this._reconcilePid = pid;
    try {
        if (!pid || CS.getPlayerId() !== pid) throw new Error("loginChanged");
        this.setStatus(T("reconcileChecking", "Comparing local and cloud saves..."));
        CS.backfillIfNeeded(pid);

        const data = await CS.fetchList();
        if (SceneManager._scene !== this || CS.getPlayerId() !== pid) throw new Error("sceneChanged");
        if (!data || !data.ok) throw new Error((data && data.error) || "listFailed");

        const entries = (data.slots || [])
            .filter(e => /^file\d+$/.test(String(e.slot)))
            .sort((a, b) => Number(a.slot.slice(4)) - Number(b.slot.slice(4)));
        cacheCloudEntries_(entries);

        const cloudOnly = [];
        const conflicts = [];
        const synced = [];
        for (const entry of entries) {
            if (!localSaveExists_(entry.slot)) {
                cloudOnly.push(entry);
            } else if (syncState_(entry, pid) === "synced") {
                synced.push(entry);
            } else {
                conflicts.push(entry);
            }
        }

        // 首次 backfill 会把所有本地槽位标脏。对照已证明与云端一致的
        // 槽位应直接出队，否则虽然不再弹冲突框，稍后仍会被无意义地重复上传。
        if (synced.length) {
            const syncedSlots = new Set(synced.map(entry => String(entry.slot)));
            setDirty(getDirty(pid).filter(slot => !syncedSlots.has(slot)), pid);
        }

        // 没有云端独有槽位，也没有真正差异时，立即结束，不弹冲突确认框。
        if (!cloudOnly.length && !conflicts.length) {
            this.finishReconcile(true, 0);
            return;
        }

        let overwriteConflicts = false;
        if (conflicts.length) {
            overwriteConflicts = await this.askConflict(conflicts.length, cloudOnly.length);
            if (SceneManager._scene !== this || CS.getPlayerId() !== pid) throw new Error("sceneChanged");
        }

        const targets = cloudOnly.concat(overwriteConflicts ? conflicts : []).map(e => e.slot);
        let result = { ok: true, okCount: 0, failCount: 0, failedSlots: [] };
        if (targets.length) {
            this.setStatus(formatText_(T("reconcileProgress",
                "Restoring cloud saves... %1/%2"), 0, targets.length));
            result = await CS.restoreSlots(targets, (done, total) => {
                if (SceneManager._scene !== this) return;
                this.setStatus(formatText_(T("reconcileProgress",
                    "Restoring cloud saves... %1/%2"), done, total));
            });
        }

        const failed = new Set(result.failedSlots || []);
        const downloaded = cloudOnly.filter(e => !failed.has(e.slot)).length;
        const overwritten = overwriteConflicts
            ? conflicts.filter(e => !failed.has(e.slot)).length : 0;
        const keptLocal = overwriteConflicts ? 0 : conflicts.length;

        if (result.failCount > 0) {
            this.setStatus(formatText_(T("reconcilePartial",
                "Comparison finished: %1 restored, %2 failed."),
                result.okCount, result.failCount));
            this.finishReconcile(false, 2200);
        } else if (!entries.length) {
            this.setStatus(T("reconcileNothing", "No cloud saves were found; local saves will sync normally."));
            this.finishReconcile(true, 1200);
        } else {
            this.setStatus(formatText_(T("reconcileDone",
                "Comparison complete: %1 downloaded, %2 overwritten, %3 kept local."),
                downloaded, overwritten, keptLocal));
            this.finishReconcile(true, 1800);
        }
    } catch (e) {
        console.warn("[CloudSave] login reconciliation failed", e);
        if (SceneManager._scene === this) {
            this.setStatus(T("reconcileFailed",
                "Automatic cloud save comparison failed. Sign in again to retry."));
        }
        this.finishReconcile(false, 2400);
    }
};

Scene_CloudLoginReconcile.prototype.askConflict = async function(overlap, cloudOnly) {
    this._awaitingDecision = true;
    Input.clear();
    TouchInput.clear();
    try {
        return await cloudConfirm_(
            CS.getReconcileConfirmTitle(overlap, cloudOnly), 860);
    } finally {
        this._awaitingDecision = false;
        Input.clear();
        TouchInput.clear();
    }
};

Scene_CloudLoginReconcile.prototype.popScene = function() {
    // 自动对照场景不可手动退出；confirm 的“否”只表示保留重叠的本地存档，
    // 仅云端槽位仍会继续下载。
    resetDrillBackButton_(this);
    SoundManager.playBuzzer();
};

Scene_CloudLoginReconcile.prototype.finishReconcile = function(success, delay) {
    if (this._finishedReconcile) return;
    this._finishedReconcile = true;
    const pid = String(this._reconcilePid || CS._reconcilePendingPid || "");
    if (CS._reconcilePendingPid === pid) CS._reconcilePendingPid = null;
    CS._reconciling = false;
    CS._reconcileUploadBlockedPid = success ? null : pid;
    setReconcileComplete_(pid, success);
    if (SceneManager._scene !== this) return;
    if (this._finishTimer) clearTimeout(this._finishTimer);
    this._finishTimer = setTimeout(() => {
        if (SceneManager._scene !== this ||
            (SceneManager.isSceneChanging && SceneManager.isSceneChanging()) ||
            (this.isActive && !this.isActive())) return;
        Input.clear();
        TouchInput.clear();
        SceneManager.pop();
        if (success) setTimeout(() => { CS.maybeFlush(false); }, 0);
    }, Math.max(0, Number(delay) || 0));
};

Scene_CloudLoginReconcile.prototype.terminate = function() {
    // 若被其他插件强制切走场景，将本次视为未完成；下次标题/地图启动时
    // 会依据持久状态自动重试。DOM confirm 自行维护并最终 resolve。
    if (!this._finishedReconcile) {
        this._finishedReconcile = true;
        const pid = String(this._reconcilePid || CS._reconcilePendingPid || "");
        if (CS._reconcilePendingPid === pid) CS._reconcilePendingPid = null;
        CS._reconciling = false;
        CS._reconcileUploadBlockedPid = pid;
        setReconcileComplete_(pid, false);
    }
    // 外部代码若在本对照场景上又 push 了别的 Scene，MZ 会把本 Scene 的
    // 构造器压栈；它不能被重建（重建后没有 pending pid），故改为回到原场景。
    const sceneStack = SceneManager._stack || [];
    if (SceneManager._nextScene &&
        sceneStack[sceneStack.length - 1] === Scene_CloudLoginReconcile) {
        sceneStack.pop();
    }
    Scene_MenuBase.prototype.terminate.call(this);
    if (this._finishTimer) clearTimeout(this._finishTimer);
    if (this._backgroundSprite) this._backgroundSprite.filters = null;
    const snapshot = CS._reconcileSnapshot;
    if (snapshot && this._backgroundSprite && this._backgroundSprite.bitmap === snapshot) {
        this._backgroundSprite.bitmap = null;
        try { snapshot.destroy(); } catch (e) {}
    }
    CS._reconcileSnapshot = null;
};

//=============================================================================
// 小工具
//=============================================================================
function slotLabel_(slot) {
    if (slot === "config") return T("slotConfig", "Game Settings");
    if (slot === "drill_global") return T("slotDrill", "Global Data");
    const n = Number(String(slot).slice(4));
    if (n === 0) return T("slotAuto", "Autosave");
    return T("slotN", "Save %1").replace("%1", n);
}
function metaTs_(e) {
    return (e.meta && Number(e.meta.timestamp)) || Number(e.ts) || 0;
}
function cloudVersion_(e) {
    const ts = e && Number(e.ts);
    return ts > 0 ? String(ts) : "";
}
function cacheCloudEntries_(entries) {
    CS._cloudVersions = Object.create(null);
    CS._cloudEntries = Object.create(null);
    for (const entry of entries || []) {
        if (!entry || !/^file\d+$/.test(String(entry.slot))) continue;
        CS._cloudEntries[entry.slot] = entry;
        const version = cloudVersion_(entry);
        if (version) CS._cloudVersions[entry.slot] = version;
    }
}
function restoredVersions_(playerId) {
    const pid = resolvedPid_(playerId);
    const cacheId = pid || "anonymous";
    if (!CS._restoredVersionsByPid) CS._restoredVersionsByPid = Object.create(null);
    if (!CS._restoredVersionsByPid[cacheId]) {
        try {
            const data = JSON.parse(localStorage.getItem(accountKey_(KEY_RESTORED, pid)) || "{}");
            CS._restoredVersionsByPid[cacheId] =
                data && typeof data === "object" && !Array.isArray(data) ? data : {};
        } catch (e) { CS._restoredVersionsByPid[cacheId] = {}; }
    }
    return CS._restoredVersionsByPid[cacheId];
}
function saveRestoredVersions_(playerId) {
    const pid = resolvedPid_(playerId);
    try {
        localStorage.setItem(accountKey_(KEY_RESTORED, pid),
            JSON.stringify(restoredVersions_(pid)));
    } catch (e) {}
}
function rememberRestoredVersion_(slot, playerId) {
    const pid = resolvedPid_(playerId);
    const version = CS._cloudVersions && CS._cloudVersions[slot];
    if (!version) return;
    restoredVersions_(pid)[slot] = version;
    saveRestoredVersions_(pid);
}
function forgetRestoredVersion_(slot, playerId) {
    if (!/^file\d+$/.test(String(slot))) return;
    const pid = resolvedPid_(playerId);
    const versions = restoredVersions_(pid);
    if (Object.prototype.hasOwnProperty.call(versions, slot)) {
        delete versions[slot];
        saveRestoredVersions_(pid);
    }
}
function syncState_(e, playerId) {
    if (!e || !/^file\d+$/.test(String(e.slot))) return "unknown";
    const n = Number(String(e.slot).slice(4));
    const info = DataManager._globalInfo && DataManager._globalInfo[n];
    const localTs = info ? Number(info.timestamp || 0) : 0;
    const cloudTs = metaTs_(e);
    if (!info) return "cloudOnly";
    // 旧版云对象没有 meta.timestamp，只能拿服务器上传时间 e.ts 展示。
    // 成功恢复后记录该云版本，避免它与存档内时间戳天然不同而永久显示未同步。
    const version = cloudVersion_(e);
    if (version && restoredVersions_(playerId)[e.slot] === version) return "synced";
    if (cloudTs > localTs + 2000) return "cloudNewer";
    if (localTs > cloudTs + 2000) return "localNewer";
    return "synced";
}
function compareStatus_(e) {
    const state = syncState_(e);
    if (state === "cloudOnly") {
        return { state: state, text: T("statusNoLocal", "cloud only"), color: "#f3a64a" };
    }
    if (state === "cloudNewer") {
        return { state: state, text: T("statusCloudNewer", "cloud newer"), color: ColorManager.systemColor() };
    }
    if (state === "localNewer") {
        return { state: state, text: T("statusLocalNewer", "local newer"), color: ColorManager.normalColor() };
    }
    if (state === "synced") {
        return { state: state, text: T("statusSynced", "synced"), color: "#88cc88" };
    }
    return { state: state, text: "", color: ColorManager.normalColor() };
}
function formatText_(text) {
    let result = String(text == null ? "" : text);
    for (let i = 1; i < arguments.length; i++) {
        result = result.split("%" + i).join(String(arguments[i]));
    }
    return result;
}
function formatTs_(ts) {
    const d = new Date(Number(ts));
    const p = n => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
        " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

function resetDrillBackButton_(scene) {
    const normal = scene._drill_MBB_sprites || [];
    const highlight = scene._drill_MBB_sprites_highlight || [];
    const pushdown = scene._drill_MBB_sprites_pushdown || [];
    for (let i = 0; i < pushdown.length; i++) {
        if (pushdown[i]) {
            pushdown[i]._needPopScene = false;
            pushdown[i].visible = false;
        }
        if (normal[i]) normal[i].visible = true;
        if (highlight[i]) {
            highlight[i]._touched = false;
            highlight[i].visible = false;
        }
    }
}

function abandonQueuedReconcile_(token) {
    if (!token) return;
    if (token.timer) clearTimeout(token.timer);
    if (CS._reconcileLaunchToken === token) CS._reconcileLaunchToken = null;
    if (token.stack[token.stackIndex] === token.originClass) {
        token.stack.splice(token.stackIndex, 1);
    }
    if (CS._reconcilePendingPid === token.pid) CS._reconcilePendingPid = null;
    CS._reconciling = false;
    CS._reconcileUploadBlockedPid = token.pid;
    if (CS._reconcileSnapshot === token.snapshot) CS._reconcileSnapshot = null;
    try { if (token.snapshot) token.snapshot.destroy(); } catch (e) {}
}

// 对照 Scene 仍在 _nextScene 排队时，外部 pop 应作用于“排队之前”的原栈，
// 不能先消费本插件为对照 Scene 压入的返回项。
const _SceneManager_pop_CS = SceneManager.pop;
SceneManager.pop = function() {
    const token = CS._reconcileLaunchToken;
    if (token && this._nextScene === token.scene && this._scene !== token.scene) {
        abandonQueuedReconcile_(token);
        this._nextScene = null;
    }
    return _SceneManager_pop_CS.apply(this, arguments);
};

// Patreon/itch 登录成功后由包装钩子调用。先同步立上传闸门，再在下一帧
// 推入独立对照场景，避免首次 backfill 在玩家选择前覆盖云端。
CS.notifyLoginSuccess = function(playerId) {
    const pid = String(playerId || "").trim();
    if (!/^\d+$/.test(pid) || !hasSaveStorage_()) return false;
    if (CS._reconcilePendingPid === pid || CS._reconciling) return false;

    CS._reconcileAttemptedPids.add(pid);
    setReconcileComplete_(pid, false);
    adoptAnonymousDirty_(pid);
    CS._reconcilePendingPid = pid;
    CS._reconciling = true;
    CS._reconcileUploadBlockedPid = null;

    const launch = () => {
        if (CS._reconcilePendingPid !== pid || CS.getPlayerId() !== pid) {
            CS._reconcilePendingPid = null;
            CS._reconciling = false;
            return;
        }
        if (SceneManager.isSceneChanging && SceneManager.isSceneChanging()) {
            setTimeout(launch, 50);
            return;
        }
        try { CS._reconcileSnapshot = SceneManager.snap(); }
        catch (e) { CS._reconcileSnapshot = null; }
        const stack = SceneManager._stack || [];
        const stackIndex = stack.length;
        const originClass = SceneManager._scene && SceneManager._scene.constructor;
        try {
            Input.clear();
            TouchInput.clear();
            SceneManager.push(Scene_CloudLoginReconcile);
            const token = {
                pid: pid,
                scene: SceneManager._nextScene,
                snapshot: CS._reconcileSnapshot,
                stack: stack,
                stackIndex: stackIndex,
                originClass: originClass,
                timer: null
            };
            CS._reconcileLaunchToken = token;
            const watchLaunch = () => {
                if (CS._reconcileLaunchToken !== token) return;
                if (SceneManager._scene === token.scene) {
                    CS._reconcileLaunchToken = null;
                    return;
                }
                if (SceneManager._nextScene === token.scene) {
                    token.timer = setTimeout(watchLaunch, 50);
                    return;
                }
                // 排队中的对照场景被其他 goto/push/pop 覆盖，不会收到 terminate。
                // 回收它留下的返回栈、快照和上传闸门，持久完成标记仍保持缺失。
                abandonQueuedReconcile_(token);
            };
            token.timer = setTimeout(watchLaunch, 0);
        } catch (e) {
            console.warn("[CloudSave] failed to open login reconciliation", e);
            if (stack[stackIndex] === originClass) stack.splice(stackIndex, 1);
            CS._reconcilePendingPid = null;
            CS._reconciling = false;
            CS._reconcileUploadBlockedPid = pid;
            const snapshot = CS._reconcileSnapshot;
            CS._reconcileSnapshot = null;
            try { if (snapshot) snapshot.destroy(); } catch (destroyError) {}
        }
    };
    setTimeout(launch, 0);
    return true;
};

function installLoginSuccessHooks_() {
    if (typeof window.Scene_PatreonVerify !== "function") return;
    const proto = window.Scene_PatreonVerify.prototype;
    if (proto._shiroinCloudLoginHooksInstalled) return;
    proto._shiroinCloudLoginHooksInstalled = true;

    const wrap = name => {
        const original = proto[name];
        if (typeof original !== "function") return;
        proto[name] = async function() {
            const before = CS.getPlayerId();
            try {
                return await original.apply(this, arguments);
            } finally {
                const after = CS.getPlayerId();
                if (!before && after) CS.notifyLoginSuccess(after);
            }
        };
    };
    wrap("_onMainButtonClick");      // Patreon 登录
    wrap("_onItchLoginClick");       // itch.io 直接登录
}

installLoginSuccessHooks_();

})();
