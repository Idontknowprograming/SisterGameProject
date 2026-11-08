//=============================================================================
// Shiroin_AnsuzMessage.js
//=============================================================================
/*:
 * @plugindesc [v1.1] 新一代建言系统：ID化句式组合 + 多语言词表 + 符文显示（安卓原生网络）
 * @author Shiroin & Claude
 *
 * @param serverBase
 * @text 建言服务器基地址
 * @type string
 * @default https://nlch.io/api/ansuz
 *
 * @param syncHours
 * @text 批次同步间隔(小时)
 * @type number
 * @min 1
 * @default 4
 *
 * @help
 * =============================================================================
 * 这是什么
 * =============================================================================
 * 替代 QJ-MPMZLib-AnsuzEffects.js 自由文本方案的新建言系统。
 * 核心原则：留言从头到尾不存在"文本"，只存在 {templateId, wordId} 组合。
 *   - 玩家在 Scene_AnsuzCompose 里通过 句式→类别→单词 三层菜单组合留言，
 *     无法输入任何词表之外的内容，审查压力为零。
 *   - 渲染时才按 ConfigManager.language 拼成句子，语法差异全部由各语言
 *     模板吸收（槽位只放名词，时态/单复数写死在模板里）。
 *
 * =============================================================================
 * 数据文件
 * =============================================================================
 *   data/AnsuzMessages.json                    结构（语言无关）：模板顺序、
 *                                              类别与词条归属。增删词条改这里。
 *   data/{LANG}/AnsuzMessagesLocale_{LANG}.json  各语言词表（id→字符串）。
 *       加载规则与其他多语言资源一致：先 EN 兜底，再覆盖当前语言；
 *       繁中(TW)先垫简中(CN)。没有词表的语言自动显示英语。
 *   data/AnsuzMessagesLocal.json               玩家本地留言（fs 自动追加；
 *                                              浏览器测试环境退化为 localStorage）。
 *
 * =============================================================================
 * 用法
 * =============================================================================
 *   QJ.AnsuzMsg.open()          打开建言书写界面（道具/事件里脚本调用）。
 *                               确认后写入本地，并在返回地图时落下该条符文。
 *   QJ.AnsuzMsg.lastWritten()   最近一次书写会话是否真的写下了建言(boolean)。
 *                               事件在书写界面打开期间冻结，所以 open() 的
 *                               下一条事件指令就能直接用它做条件分歧
 *                               （比如决定是否消耗道具）。详情 lastResult()。
 *   QJ.AnsuzMsg.summon()        手动重新召唤当前地图全部建言。
 *   QJ.AnsuzMsg.renderText(t,w) 按当前语言渲染 ID 组合，返回字符串。
 *
 *   主动调用 summon() 时召唤三个来源：
 *     1. 自己的本地留言全量（作者总能看到自己写的，离线可用）；
 *     2. 官方建言：来自服务器批次 officials 段（管理员在游戏内书写），
 *        全量、金色、可投票；离线时不显示（联网功能本就不可用）；
 *     3. 他人留言：来自服务器批次，数量由 变量55(MaxPlayerMsgs) 控制
 *        （0=不显示），每次进图按积分权重重新洗牌。
 *
 *   联网（服务端见 server/AnsuzWorker/，走 nlch.io 网关）：
 *     - 批次同步：主动调用 QJ.AnsuzMsg.syncBatch(false)，按 syncHours
 *       限流且 ETag 命中 304 零流量；强制刷新传 true，失败沿用旧批次
 *     - 上传：确认书写后自动上传（playerId 取自 PatreonVerify 缓存，
 *       未登录则只留本地）；服务器侧有白名单校验/每日限额/去重
 *     - 投票 UI（内置）：接近符文显示文字后，鼠标悬停(PC)/点按(触屏)
 *       文字 → 显示总分与赞/踩按钮（图标取自 IconSet_large，
 *       换美术改 ICON_LIKE/ICON_DISLIKE 常量；已投票后按钮切换为
 *       ICON_LIKE_ON/ICON_DISLIKE_ON 号图标）。布局：赞在文字最左、
 *       踩在文字最右。触屏首击只聚焦、点区外失焦；点击有放大回弹
 *       反馈，可改票；未登录点击无效(Buzzer)。
 *       只有他人留言（远端批次）会出现投票 UI。
 *       测试开关：QJ.AnsuzMsg.voteUITestMode = true 时无视来源，
 *       官方/自己的留言也显示投票 UI，且投票为本地模拟强制成功
 *       （不访问服务器、不写本地存储），用于确认图标切换/回弹/
 *       分数刷新的完整表现。
 *     - "我的建言"历史：登录时 syncMine 搭 batch 同步顺风车，拉取自己
 *       全部建言+分数写入 AnsuzMine，QJ.AnsuzMsg.openHistory() 查看
 *     - 底层 API：QJ.AnsuzMsg.rate(messageId, +1|-1)、
 *       QJ.AnsuzMsg.nearbyMessageId()（玩家脚下远端留言id）
 *     - 事件通知（非阻塞警告，文案/表现自行实现）：
 *       QJ.AnsuzMsg.onNotify = function(event, detail) { ... };
 *       事件：writeNotLoggedIn(未登录书写,仅本地保留) / uploadFailed(上传
 *       网络失败) / writeLimitReached(每日书写上限) / writeRejected /
 *       rateNotLoggedIn / rateFailed / rateLimitReached(每日投票上限60) /
 *       rateRejected / deleteNotLoggedIn / deleteFailed / deleteRejected。
 *       事件码全集见源码"服务器事件通知"一节。
 *     - 加词条时记得同步改 Worker 里的 TEMPLATES/WORDS 白名单
 *
 * =============================================================================
 * 依赖与顺序
 * =============================================================================
 *   放在 QJ-MapProjectileMZ 与 shiroin_multilingualSupport 之后。
 *   不依赖 QJ-MPMZLib-AnsuzEffects（符文显示逻辑已自包含，组名不冲突）。
 */

var QJ = QJ || {};

(function() {
"use strict";

const PN = "Shiroin_AnsuzMessage";
const params = PluginManager.parameters(PN);
const P_serverBase = String(params["serverBase"] || "https://nlch.io/api/ansuz").replace(/\/+$/, "");
const P_syncHours  = Math.max(1, Number(params["syncHours"] || 4));

const AM = {};
QJ.AnsuzMsg = AM;

//=============================================================================
// 数据加载
//=============================================================================
AM._struct = null;    // data/AnsuzMessages.json
AM._tbl = null;       // 合并后的当前语言词表 {ui,templates,categories,words}
AM._loading = null;

function loadJson(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.overrideMimeType("application/json");
        xhr.onload = () => {
            if (xhr.status < 400) {
                try { resolve(JSON.parse(xhr.responseText)); }
                catch (e) { reject(e); }
            } else reject(new Error(url + " " + xhr.status));
        };
        xhr.onerror = () => reject(new Error(url));
        xhr.send();
    });
}

// 浅两层合并：顶层键(ui/templates/...)内部按键覆盖
function mergeTbl(base, patch) {
    const out = base || {};
    for (const top in patch) {
        if (!out[top]) out[top] = {};
        Object.assign(out[top], patch[top]);
    }
    return out;
}

AM.langCode = function() {
    const codes = window.LANG_CODE || ["CN", "JP", "EN"];
    return codes[ConfigManager.language] || "EN";
};

AM.loadTables = async function() {
    if (!AM._struct) {
        AM._struct = await loadJson("data/AnsuzMessages.json");
    }
    const code = AM.langCode();
    // 兜底链：EN → (TW先垫CN) → 当前语言
    const chain = ["EN"];
    if (code === "TW") chain.push("CN");
    if (code !== "EN" && !chain.includes(code)) chain.push(code);
    let tbl = null;
    for (const k of chain) {
        const data = await loadJson(`data/${k}/AnsuzMessagesLocale_${k}.json`).catch(() => null);
        if (data) tbl = mergeTbl(tbl, data);
    }
    AM._tbl = tbl || { ui: {}, templates: {}, categories: {}, words: {} };
};

AM.ensureLoaded = function() {
    if (AM._tbl && AM._struct) return Promise.resolve();
    if (!AM._loading) {
        AM._loading = AM.loadTables().finally(() => { AM._loading = null; });
    }
    return AM._loading;
};

//=============================================================================
// 渲染
//=============================================================================
AM.renderText = function(t, w) {
    const tbl = AM._tbl || { templates: {}, words: {} };
    const tpl = tbl.templates[String(t)] || "%1";
    const word = tbl.words[String(w)] || ("#" + w);
    return tpl.replace("%1", word);
};

AM.ui = function(key, fallback) {
    return (AM._tbl && AM._tbl.ui && AM._tbl.ui[key]) || fallback || key;
};

//=============================================================================
// 本地留言存储（NW.js 用 fs，浏览器测试环境用 localStorage）
//=============================================================================
const LOCAL_FILE = "AnsuzMessagesLocal";

function isNode() {
    return typeof require === "function" && typeof process === "object" &&
        StorageManager.isLocalMode && StorageManager.isLocalMode();
}

AM.localRead = function() {
    if (isNode()) {
        try {
            const fs = require("fs");
            const path = require("path");
            const fp = path.join(path.dirname(process.mainModule.filename), "data", LOCAL_FILE + ".json");
            if (!fs.existsSync(fp)) return {};
            return JSON.parse(fs.readFileSync(fp, "utf8"));
        } catch (e) { console.warn("[AnsuzMsg] localRead failed", e); return {}; }
    }
    try { return JSON.parse(localStorage.getItem(LOCAL_FILE) || "{}"); }
    catch (e) { return {}; }
};

AM._localWrite = function(data) {
    if (isNode()) {
        try {
            const fs = require("fs");
            const path = require("path");
            const fp = path.join(path.dirname(process.mainModule.filename), "data", LOCAL_FILE + ".json");
            fs.writeFileSync(fp, JSON.stringify(data, null, 4), "utf8");
        } catch (e) { console.warn("[AnsuzMsg] localWrite failed", e); }
    } else {
        try { localStorage.setItem(LOCAL_FILE, JSON.stringify(data)); } catch (e) {}
    }
};

AM.localAdd = function(mapId, entry) {
    const data = AM.localRead();
    if (!data[mapId]) data[mapId] = [];
    data[mapId].push(entry);
    AM._localWrite(data);
};

// 删除建言时：从本地留言(地图符文来源)移除该图同内容条目。
// 服务器"同人同图同内容"去重保证唯一，按 t/w 匹配安全；重进图后符文消失。
AM._localRemove = function(mapId, t, w) {
    const data = AM.localRead();
    const key = String(mapId);
    const list = data[key];
    if (!list) return;
    const wNorm = w != null ? String(w) : null;
    const next = list.filter(e => !(e && e.t === String(t) && (e.w ?? null) === wNorm));
    if (next.length === list.length) return;
    if (next.length) data[key] = next; else delete data[key];
    AM._localWrite(data);
};

//=============================================================================
// 联网：批次同步 / 上传 / 投票（服务端见 server/AnsuzWorker/）
//   - 批次：调用 syncBatch(false) 时按 syncHours 限流，ETag 命中 304 零流量；失败沿用旧批次
//   - 上传：确认书写后 fire-and-forget，未登录(无playerId)则仅本地保留
//   - 他人留言显示数量由 变量55(MaxPlayerMsgs) 控制，0=不显示
//=============================================================================
const KEY_BATCH = "AnsuzBatch";
const KEY_ETAG  = "AnsuzBatchEtag";
const KEY_TIME  = "AnsuzBatchTime";

// 从 PatreonVerify 的缓存里取 playerId（未登录返回 null）
AM.getPlayerId = function() {
    try {
        const raw = localStorage.getItem("gm_patreon_verify");
        if (!raw) return null;
        const pid = String((JSON.parse(raw) || {}).playerId || "").trim();
        return /^\d{1,20}$/.test(pid) ? pid : null;
    } catch (e) { return null; }
};

// 会话凭证 device_id（登录时后端签发，服务端 patreon_subs 表比对同一值做鉴权）
AM.getDeviceId = function() {
    try {
        const raw = localStorage.getItem("gm_patreon_verify");
        if (!raw) return "";
        return String((JSON.parse(raw) || {}).device_id || "").trim();
    } catch (e) { return ""; }
};

// 自己的作者哈希（与服务端批次里的 a 字段同算法），用于过滤自己的留言
AM._ownHash = null;
AM.refreshOwnHash = async function() {
    const pid = AM.getPlayerId();
    if (!pid) { AM._ownHash = null; return; }
    try {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("p" + pid));
        AM._ownHash = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 8);
    } catch (e) { AM._ownHash = null; }
};

AM.batchForMap = function(mapId) {
    try {
        const raw = localStorage.getItem(KEY_BATCH);
        if (!raw) return [];
        const data = JSON.parse(raw);
        return (data && data.maps && data.maps[String(mapId)]) || [];
    } catch (e) { return []; }
};

// 批次里的服务器官方建言段（管理员在游戏内书写、由 Worker 全量下发）
AM.batchOfficialsForMap = function(mapId) {
    try {
        const raw = localStorage.getItem(KEY_BATCH);
        if (!raw) return [];
        const data = JSON.parse(raw);
        return (data && data.officials && data.officials[String(mapId)]) || [];
    } catch (e) { return []; }
};

// 网络请求 + 硬超时：安卓版复用 rpg_custom_MZ.httpRequest 的 Cordova 原生
// HTTP 通道，绕过 WebView CORS；桌面/浏览器仍用 fetch。原生结果包装成
// Fetch Response 的最小兼容接口，以保留 batch 的 304/ETag 与 API 的
// 401/429 状态分支。
const NET_TIMEOUT_MS = 10000;

function usesNativeHttp_() {
    return typeof window.httpRequest === "function" &&
        typeof Utils !== "undefined" && Utils.isMobileDevice && Utils.isMobileDevice() &&
        !!(window.cordova && cordova.plugin && cordova.plugin.http);
}

function nativeResponse_(data, xhr) {
    const status = Number(xhr && xhr.status) || 0;
    const headerSource = (xhr && xhr.headers) || {};
    return {
        status: status,
        ok: status >= 200 && status < 300,
        headers: {
            get(name) {
                if (xhr && typeof xhr.getResponseHeader === "function") {
                    const value = xhr.getResponseHeader(name);
                    if (value != null) return value;
                }
                const target = String(name || "").toLowerCase();
                const key = Object.keys(headerSource).find(k => k.toLowerCase() === target);
                return key == null ? null : headerSource[key];
            }
        },
        text() {
            if (typeof data === "string") return Promise.resolve(data);
            if (data == null) return Promise.resolve("");
            try { return Promise.resolve(JSON.stringify(data)); }
            catch (e) { return Promise.resolve(String(data)); }
        },
        json() {
            if (data && typeof data === "object") return Promise.resolve(data);
            return Promise.resolve().then(() => JSON.parse(String(data == null ? "null" : data)));
        }
    };
}

function nativeFetchTimeout_(url, opts) {
    return new Promise((resolve, reject) => {
        let settled = false;
        let responseXhr = null;
        const finish = (fn, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            fn(value);
        };
        const timer = setTimeout(() => {
            finish(reject, new Error("Ansuz request timeout"));
        }, NET_TIMEOUT_MS);
        const request = window.httpRequest(url, Object.assign({}, opts || {}, {
            responseType: "text",
            reTry: 0,
            onload(xhr) { responseXhr = xhr; },
            onerror(error, xhr) { responseXhr = xhr || responseXhr; }
        }));
        request.then(data => {
            finish(resolve, nativeResponse_(data, responseXhr));
        }).catch(error => {
            // cordova-plugin-advanced-http 会把 HTTP 4xx/5xx 放进 error
            // callback；它们仍是有效响应，需交给现有业务代码判断状态码。
            if (responseXhr && Number(responseXhr.status) > 0) {
                finish(resolve, nativeResponse_(responseXhr.response, responseXhr));
            } else {
                finish(reject, error);
            }
        });
    });
}

function fetchTimeout(url, opts) {
    if (usesNativeHttp_()) return nativeFetchTimeout_(url, opts);
    opts = opts || {};
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), NET_TIMEOUT_MS);
    return fetch(url, Object.assign({}, opts, { signal: ctrl.signal }))
        .finally(() => clearTimeout(timer));
}

AM._syncing = false;
AM.syncBatch = async function(force) {
    if (AM._syncing) return;
    const last = Number(localStorage.getItem(KEY_TIME) || 0);
    if (!force && Date.now() - last < P_syncHours * 3600000) {
        // 公共批次仍在限流期时通常直接返回；但新安装/清缓存后若玩家是在
        // 首次批次完成之后才登录，本地尚无个人历史，必须补拉一次 /mine。
        if (!localStorage.getItem(KEY_MINE)) await AM.syncMine();
        return;
    }
    AM._syncing = true;
    try {
        const headers = {};
        const etag = localStorage.getItem(KEY_ETAG);
        if (etag) headers["If-None-Match"] = etag;
        const res = await fetchTimeout(P_serverBase + "/batch", { headers });
        if (res.status === 304) {
            localStorage.setItem(KEY_TIME, String(Date.now()));
        } else if (res.ok) {
            const text = await res.text();
            JSON.parse(text);   // 先校验合法性，坏数据不落盘
            localStorage.setItem(KEY_BATCH, text);
            const newTag = res.headers.get("ETag");
            if (newTag) localStorage.setItem(KEY_ETAG, newTag);
            localStorage.setItem(KEY_TIME, String(Date.now()));
        }
    } catch (e) {
        console.warn("[AnsuzMsg] batch sync failed, keep old batch", e);
    } finally {
        AM._syncing = false;
    }
    // 搭同一次同步的顺风车，登录时刷新"我的建言"历史（分数会随他人投票变化，
    // 即使批次 304 未变也要刷）。独立失败，不影响批次。
    await AM.syncMine();
};

// 拉取自己的全部建言+分数写入 AnsuzMine（未登录跳过；失败沿用旧数据）
AM._syncingMine = false;
AM._syncMinePromise = null;
AM.syncMine = function() {
    // 登录回调、地图批次和历史页可能同时触发；所有调用者共用同一请求，
    // 需要等待结果的历史页不会因“正在同步”而提前显示空缓存。
    if (AM._syncMinePromise) return AM._syncMinePromise;
    const pid = AM.getPlayerId();
    if (!pid) return Promise.resolve(false);   // 未登录：沿用现有缓存（或为空）
    AM._syncingMine = true;
    AM._syncMinePromise = (async function() {
        try {
            const res = await fetchTimeout(P_serverBase + "/mine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerId: pid, deviceId: AM.getDeviceId() })
            });
            if (res.ok) {
                const data = await res.json();
                // 管理员标志搭 /mine 顺风车同步（登录时 + 每次批次同步刷新）
                if (data && data.admin !== undefined) AM._setAdminFlag(!!data.admin);
                if (data && data.maps) {
                    localStorage.setItem(KEY_MINE, JSON.stringify(data));
                    return true;
                }
            }
            // 401(会话失效)/其他错误：静默保留旧 AnsuzMine，不打断玩家
            return false;
        } catch (e) {
            console.warn("[AnsuzMsg] mine sync failed, keep old data", e);
            return false;
        } finally {
            AM._syncingMine = false;
            AM._syncMinePromise = null;
        }
    })();
    return AM._syncMinePromise;
};

//=============================================================================
// 服务器事件通知（非阻塞）：QJ.AnsuzMsg.onNotify = function(event, detail) {...}
// 插件只负责触发，警告文案与表现形式由游戏侧回调自行实现。事件列表：
//   "writeNotLoggedIn"  确认书写时未登录：建言仅保留在本地，不会对其他玩家显示。
//                       detail.reason==="sessionInvalid" 时为服务器401判定
//                       会话失效（如大版本更新后 device_id 已作废），应提示重新登录
//   "uploadFailed"      上传网络失败（弱网/断网），detail.error 为原因
//   "writeLimitReached" 每日创建建言次数达到服务器上限(429)
//   "writeRejected"     其他上传拒绝（重复/非法等），detail.error / detail.status
//   "rateNotLoggedIn"   未登录尝试投票（同上，reason==="sessionInvalid" 为会话失效）
//   "rateFailed"        投票网络失败
//   "rateLimitReached"  每日投票次数达到服务器上限(429)
//   "rateRejected"      其他投票拒绝（给自己投票/留言不存在等）
//=============================================================================
AM._notify = function(event, detail) {
    if (typeof AM.onNotify !== "function") return;
    try { AM.onNotify(event, detail || {}); }
    catch (e) { console.error("[AnsuzMsg] onNotify error", e); }
};

// 游戏侧回调实现：玩家头顶跳字 + 音效，文案取 mapCommonEventDialogue.AnsuzSystem
// ⚠️ 必须写在此处（命名空间对象建立之后）——AM 与 QJ.AnsuzMsg 是同一个对象，
// 若写在上面的初始化语句之前会被 `AM.onNotify = null` 覆盖掉（已踩坑）
AM.onNotify = function(event, detail) {

    const textArray = window.mapCommonEventDialogue?.AnsuzSystem?.[String(event)];
    if (textArray) {
        const text = Array.isArray(textArray) ? textArray.join('\n') : textArray;
        setTimeout(() => {
           alert(text, { align: "left" }); 
        }, 600);   
    }
    /*
    const zoomScale = $gameScreen.zoomScale();
    const xx =  $gamePlayer.screenX() * zoomScale;
    const yy = ($gamePlayer.screenY() * zoomScale) - 48;
    const textArray = window.mapCommonEventDialogue?.AnsuzSystem?.[String(event)];
    if (textArray) {
        const text = Array.isArray(textArray) ? textArray.join('\n') : textArray;
        $gameTemp.drill_GFTT_createSimple( [xx, yy], text, 5, 0, 120 );
        AudioManager.playSe({ name: "014myuu_YumeSE_SystemBuzzer03", volume: 60, pitch: 100, pan: 0 });
    }
    */
};

// 上传留言（fire-and-forget；被服务器拒绝只记日志+事件，本地照常保留）
AM.uploadMessage = function(mapId, entry) {
    const pid = AM.getPlayerId();
    if (!pid) {
        AM._notify("writeNotLoggedIn", { mapId: mapId, entry: entry });
        return;
    }
    fetchTimeout(P_serverBase + "/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: pid, deviceId: AM.getDeviceId(), mapId: Number(mapId), t: entry.t, w: entry.w, x: entry.x, y: entry.y })
    }).then(r => r.json().then(d => ({ d: d, status: r.status })))
    .then(({ d, status }) => {
        if (!d.ok) {
            if (status === 429) AM._notify("writeLimitReached", { error: d.error });
            else if (status === 401) AM._notify("writeNotLoggedIn", { reason: "sessionInvalid", error: d.error });   // 会话失效(如大版本更新后)
            else AM._notify("writeRejected", { error: d.error, status: status });
            console.warn("[AnsuzMsg] upload rejected:", d.error);
        } else {
            // 服务器已入库：把历史缓存里的本地临时条目(id:0)补上服务器ID，
            // 此后玩家立即可在历史界面删除这条建言
            if (d.id) AM._mineResolveId(mapId, entry.t, entry.w, d.id);
            // 服务器确认本人是管理员（建言已进官方表）：兜底刷新本地标志
            if (d.official) AM._setAdminFlag(true);
        }
    }).catch(e => {
        AM._notify("uploadFailed", { error: String(e) });
        console.warn("[AnsuzMsg] upload failed", e);
    });
};

// 投票 API：AM.rate(messageId, +1/-1) → Promise<{ok,score}>（失败时附带事件通知）
AM.rate = function(messageId, value) {
    const pid = AM.getPlayerId();
    if (!pid) {
        AM._notify("rateNotLoggedIn", { messageId: messageId });
        return Promise.resolve({ ok: false, error: "not logged in" });
    }
    return fetchTimeout(P_serverBase + "/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: pid, deviceId: AM.getDeviceId(), messageId: Number(messageId), value: value })
    }).then(r => r.json().then(d => { d.httpStatus = r.status; return d; }))
    .then(d => {
        if (!d.ok) {
            if (d.httpStatus === 429) AM._notify("rateLimitReached", { messageId: messageId, error: d.error });
            else if (d.httpStatus === 401) AM._notify("rateNotLoggedIn", { messageId: messageId, reason: "sessionInvalid", error: d.error });
            else AM._notify("rateRejected", { messageId: messageId, error: d.error, status: d.httpStatus });
        }
        return d;
    }).catch(e => {
        AM._notify("rateFailed", { messageId: messageId, error: String(e) });
        return { ok: false, error: String(e) };
    });
};

// 删除自己的建言：AM.deleteMessage(messageId) → Promise<{ok}>
// 服务端校验作者匹配后软删除(status=1)；失败附带事件通知
AM.deleteMessage = function(messageId) {
    const pid = AM.getPlayerId();
    if (!pid) {
        AM._notify("deleteNotLoggedIn", { messageId: messageId });
        return Promise.resolve({ ok: false, error: "not logged in" });
    }
    return fetchTimeout(P_serverBase + "/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: pid, deviceId: AM.getDeviceId(), messageId: Number(messageId) })
    }).then(r => r.json().then(d => { d.httpStatus = r.status; return d; }))
    .then(d => {
        if (!d.ok) {
            AM._notify("deleteRejected", { messageId: messageId, error: d.error, status: d.httpStatus });
            console.warn("[AnsuzMsg] delete rejected:", d.error);
        }
        return d;
    }).catch(e => {
        AM._notify("deleteFailed", { messageId: messageId, error: String(e) });
        console.warn("[AnsuzMsg] delete failed", e);
        return { ok: false, error: String(e) };
    });
};

// 查询玩家当前脚下的远端留言 id（给将来的点赞 UI 用；无则返回 null）
AM.nearbyMessageId = function() {
    const playerPos = activationPlayerPosition();
    if (!playerPos) return null;
    for (const runeName in AM._runeMsgIds) {
        if (AM._isRuneNear(AM._runeTexts[runeName], playerPos.x, playerPos.y)) {
            return AM._runeMsgIds[runeName];
        }
    }
    return null;
};

//=============================================================================
// 符文文字样式（spawnRune 与预览窗口共用，保证所见即所得）
//=============================================================================
AM.runeTextStyle = function(author) {
    let textColor = "#c9503c";
    let shadowColor = "#530000";
    let fontFace = "Huninn";
    if (String(author).trim() === "master") {
        textColor = "#fff59f";
        shadowColor = "#000000";
    }
    
    switch (ConfigManager.language) {
        case 1:        
        case 2: 
        fontFace = "RiiTegakiFude";
        break;        
        case 5: // 越南语
        fontFace = "Mali";
        break;
        case 8: // 韩语
        fontFace = "NanumGothic";
        break;   
        case 0:  // 简体中文
        case 11: // 乌克兰语    
        case 12: // 繁体中文
        fontFace = "Chiron GoRound TC";
        break;
    }    
    return { textColor, shadowColor, fontFace, fontBold: true, shadowBlur: 4 };
};

//=============================================================================
// 符文显示（移植自 AnsuzEffects 的 ex_createAnuszRune，组名改为 AnsuzMsg* 避免冲突）
//=============================================================================
AM._runeSeq = 0;
AM._runeMsgIds = {};   // runeName -> 服务器留言id（远端留言才登记，供投票 UI 查询）
AM._runeTexts = {};    // runeName -> 图标/文字子弹、接近半径、悬停包围盒与分数
AM._pendingRunes = []; // 书写场景确认后，回到原地图时只落下本次新建言

AM.spawnRune = function(tileX, tileY, t, w, author) {
    if (!window.$gameMap || !QJ.MPMZ || !QJ.MPMZ.Shoot) return;
    const tileSize = 48;
    const posX = (tileX - $gameMap.displayX()) * tileSize;
    const posY = (tileY - $gameMap.displayY()) * tileSize;
    const text = AM.renderText(t, w);

    const runeName = "AnsuzMsgRune" + (++AM._runeSeq);

    const style = AM.runeTextStyle(author);
    let iconIndex = $dataItems[43].iconIndex - 11;
    let blend = 0;
    if (String(author).trim() === "master") {
        iconIndex -= 21;
        blend = 1;
    }

    let iconScale = 0.5;
    let collisionRadius = 42;
    if (Utils.isMobileDevice()) {
        iconScale = 1.2;
        collisionRadius = 21;
    }

    const rune = QJ.MPMZ.Shoot({
        img: ['I', iconIndex],
        groupName: ['AnsuzMsgRune', runeName],
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        scale: iconScale,
        opacity: '0|1~120/0.3~120/1',
        collisionBox: ['C', collisionRadius],
        moveType: ['S', 0],
        z: "E",
        blendMode: blend,
        existData: [],
        moveF: []
    });

    const textBullet = QJ.MPMZ.Shoot({
        img: ['T', {
            text: text,
            textColor: style.textColor,
            fontSize: 28,
            outlineColor: "#000000",
            outlineWidth: 0,
            fontFace: style.fontFace,
            fontItalic: false,
            fontBold: style.fontBold,
            width: -1,
            height: -1,
            textAlign: 5,
            lineWidth: 0,
            lineColor: "#ffffff",
            lineRate: 1.0,
            backgroundColor: null,
            backgroundOpacity: 1,
            shadowBlur: style.shadowBlur,
            shadowColor: style.shadowColor,
            shadowOffsetX: 0,
            shadowOffsetY: 0
        }],
        position: [['S', rune.inheritX()], ['S', rune.inheritY() - 32]],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        groupName: ['AnsuzMsgText'],
        opacity: 0,
        scale: 0.5,
        moveType: ['S', 0],
        z: "W",
        existData: [
            { t: ['BE', rune.index] }
        ]
    });

    // 登记文字包围盒信息（投票 UI 的悬停检测用；宽度用同款字体实测一次）
    const mb = AM._measureBmp || (AM._measureBmp = new Bitmap(1, 1));
    mb.fontFace = style.fontFace;
    mb.fontSize = 28;
    mb.fontBold = style.fontBold;
    AM._runeTexts[runeName] = {
        rune: rune,
        bullet: textBullet,
        activationRadius: collisionRadius * iconScale,
        w: mb.measureTextWidth(text),
        h: 36,
        author: author
    };

    return runeName;
};

// 不依赖 Scene_Map 生命周期钩子；由已有玩家监听器回到地图后消费一次。
AM._flushPendingRunes = function() {
    if (!AM._pendingRunes.length) return;
    const scene = SceneManager._scene;
    if (!scene || scene.constructor !== Scene_Map || !window.$gameMap) return;

    const mapId = $gameMap.mapId();
    const pending = AM._pendingRunes;
    AM._pendingRunes = [];
    for (const p of pending) {
        if (p.mapId !== mapId) continue;
        AM.spawnRune(p.entry.x, p.entry.y, p.entry.t, p.entry.w, p.entry.author);
    }
};

// 接近检测集中由玩家监听器定时执行。符文与玩家的判定体均为圆形，
// 直接比较距离平方即可，避免每条文字子弹各自查组、建数组和创建 SAT 判定体。
const ACTIVATION_PLAYER_RADIUS = 24;

function activationPlayerPosition() {
    if (!window.$gameMap || !window.$gamePlayer) return null;
    return {
        x: $gamePlayer.screenX() + $gameMap.displayX() * 48,
        y: $gamePlayer.screenY() + $gameMap.displayY() * 48
    };
}

AM._isRuneNear = function(info, playerX, playerY) {
    if (!info || !info.rune || info.rune.dead) return false;
    const body = info.rune.QJBody;
    const offsetX = body && body.offset ? body.offset.x : 0;
    const offsetY = body && body.offset ? body.offset.y : 0;
    const runeX = body && body.pos ? body.pos.x + offsetX : info.rune.x;
    const runeY = body && body.pos ? body.pos.y + offsetY : info.rune.y;
    const runeRadius = body && body.type === 0 && Number.isFinite(body.r)
        ? body.r
        : info.activationRadius;
    const radius = ACTIVATION_PLAYER_RADIUS + runeRadius;
    const dx = playerX - runeX;
    const dy = playerY - runeY;
    return dx * dx + dy * dy <= radius * radius;
};

AM._activationCheck = function() {
    const playerPos = activationPlayerPosition();
    if (!playerPos) return;

    for (const runeName in AM._runeTexts) {
        const info = AM._runeTexts[runeName];
        const textBullet = info && info.bullet;
        if (!textBullet || textBullet.dead || !info.rune || info.rune.dead) {
            delete AM._runeTexts[runeName];
            delete AM._runeMsgIds[runeName];
            continue;
        }

        const near = AM._isRuneNear(info, playerPos.x, playerPos.y);
        if (!near) {
            if (textBullet.opacity >= 1) {
                textBullet.changeAttribute("opacity", '0|1~30/0~99999|0');
            }
        } else if (textBullet.opacity <= 0) {
            textBullet.changeAttribute("opacity", '0|0~30/1~99999|1');
        }
    }
};

AM._updateActivation = function() {
    AM._activationCheck();
};

//=============================================================================
// 召唤：官方建言全量 + 本地玩家留言全量
//=============================================================================
// 客户端权重（与服务端批次选材同一套参数：积分平滑 + 负分保底）
function clientWeight(score) {
    return score < 0 ? 0.5 : Math.max(1, score + 10);
}

function clientWeightedSample(items, count) {
    const pool = items.slice();
    const picked = [];
    while (picked.length < count && pool.length > 0) {
        let total = 0;
        for (const it of pool) total += clientWeight(it.s || 0);
        let r = Math.random() * total;
        let idx = pool.length - 1;
        for (let i = 0; i < pool.length; i++) {
            r -= clientWeight(pool[i].s || 0);
            if (r <= 0) { idx = i; break; }
        }
        picked.push(pool[idx]);
        pool.splice(idx, 1);
    }
    return picked;
}

AM._summonLoaded = function() {
    if (!window.$gameMap || $gameMap.mapId() <= 0) return;
    const mapId = String($gameMap.mapId());
    // 全量主动召唤已经包含刚写入本地的条目，避免监听器随后再落一次。
    AM._pendingRunes = AM._pendingRunes.filter(p => String(p.mapId) !== mapId);
    AM._runeMsgIds = {};
    AM._runeTexts = {};

    const keyOf = (e) => `${e.t}|${e.w ?? null}|${e.x}|${e.y}`;

    // --- 自己的本地留言：全量（作者总能看到自己写的），先落并建去重键 ---
    const locals = AM.localRead()[mapId] || [];
    const localKeys = new Set();
    for (const e of locals) {
        if (e && typeof e.x === "number" && typeof e.y === "number") {
            AM.spawnRune(e.x, e.y, e.t, e.w, e.author || "player");
            localKeys.add(keyOf(e));
        }
    }

    // --- 官方建言：服务器批次 officials 段全量（金色、可投票；离线不显示）---
    // 与本地留言去重（管理员自己写的官方建言本地已有金色副本，走本地）
    const officialKeys = new Set();
    for (const e of AM.batchOfficialsForMap(mapId)) {
        if (!e || typeof e.x !== "number" || typeof e.y !== "number") continue;
        if (AM._ownHash && e.a === AM._ownHash) continue;   // 自己的官方建言走本地副本
        const key = keyOf(e);
        if (localKeys.has(key) || officialKeys.has(key)) continue;
        officialKeys.add(key);
        const runeName = AM.spawnRune(e.x, e.y, e.t, e.w, "master");
        // 注册投票UI（官方内容同样接受玩家反馈）
        if (runeName && e.id != null) {
            AM._runeMsgIds[runeName] = e.id;
            if (AM._runeTexts[runeName]) AM._runeTexts[runeName].score = e.s || 0;
        }
    }

    // --- 他人留言（联网批次）：数量由变量55控制，每次进图按权重重新洗牌 ---
    const limit = Math.max(0, Math.min(99, Number($gameVariables.value(55)) || 0));
    if (limit > 0) {
        const candidates = AM.batchForMap(mapId).filter(e => {
            if (!e || typeof e.x !== "number" || typeof e.y !== "number") return false;
            if (AM._ownHash && e.a === AM._ownHash) return false;   // 自己的走本地
            if (localKeys.has(keyOf(e))) return false;              // 兜底去重
            return true;
        });
        const chosen = clientWeightedSample(candidates, limit);
        for (const e of chosen) {
            const runeName = AM.spawnRune(e.x, e.y, e.t, e.w, "player");
            if (runeName && e.id != null) {
                AM._runeMsgIds[runeName] = e.id;
                if (AM._runeTexts[runeName]) AM._runeTexts[runeName].score = e.s || 0;
            }
        }
    }
};

// 主动召唤入口：只在调用时加载词表并刷新本人哈希，不绑定任何地图生命周期。
AM.summon = function() {
    const hashReady = AM._ownHash === null && AM.getPlayerId()
        ? AM.refreshOwnHash()
        : Promise.resolve();
    return Promise.all([AM.ensureLoaded(), hashReady])
        .then(() => AM._summonLoaded())
        .catch(e => console.error("[AnsuzMsg] summon failed", e));
};

AM._clearRunes = function() {
    if (!window.$gameMap || !$gameMap.getGroupBulletListQJ) return;
    for (const group of ['AnsuzMsgRune', 'AnsuzMsgText']) {
        const list = $gameMap.getGroupBulletListQJ(group) || [];
        for (const id of list.slice()) {
            const b = $gameMap.bulletQJ(id);
            if (b && !b.dead) b.setDead();
        }
    }
};

AM.respawnIfOnMap = function() {
    if (SceneManager._scene && SceneManager._scene.constructor === Scene_Map) {
        AM._clearRunes();
        AM.summon();
    }
};

//=============================================================================
// 投票 UI：接近符文显示文字后，指针悬停(PC)/点按(触屏)文字 → 分数+赞/踩按钮
//   - PC与安卓共用 TouchInput.x/y：桌面随鼠标移动即时聚焦，触屏点文字聚焦、
//     点别处失焦；首次聚焦的那一次点击不触发投票（防触屏一击穿透）
//   - 全场只有一组共享 Sprite，由玩家监听器定时对"文字已显示"的远端符文做 AABB 检测
//=============================================================================
const ICON_LIKE       = 9;    // 赞/踩按钮图标编号（取自 IconSet_large）
const ICON_DISLIKE    = 10;
const ICON_LIKE_ON    = 7;    // 已点赞/已点踩后切换显示的图标编号
const ICON_DISLIKE_ON = 8;
const ICON_SHEET   = "IconSet_large";   // 本项目图标集（64×64 基准，16列）
const ICON_CELL    = 64;                // 单个图标源尺寸
const ICON_DRAW    = 64;                // 期望的桌面端显示尺寸(px)，触屏再乘 VOTE_BTN_SCALE
const VOTE_MOBILE    = Utils.isMobileDevice();
const VOTE_BTN_SCALE = VOTE_MOBILE ? 1.5 : 1.0;   // 图标显示尺寸
const VOTE_BTN_HIT   = VOTE_MOBILE ? 30 : 22;     // 按钮命中半径(px)
const VOTE_TEXT_PAD  = VOTE_MOBILE ? 16 : 6;      // 文字包围盒命中外扩(px)

// 测试模式：true 时无视留言来源（官方/自己/远端），所有符文都显示投票 UI。
// 脚本切换：QJ.AnsuzMsg.voteUITestMode = true
// 注意：官方/本地留言没有服务器id，测试模式下点它们的按钮会播 Buzzer 并打日志。
AM.voteUITestMode = false;

// 已投票记录（本地记忆，用于按钮点亮与改票；服务器侧本来就去重）
AM._voted = null;
AM.votedMap = function() {
    if (!AM._voted) {
        try { AM._voted = JSON.parse(localStorage.getItem("AnsuzVoted") || "{}"); }
        catch (e) { AM._voted = {}; }
    }
    return AM._voted;
};
AM._setVoted = function(key, value) {
    const m = AM.votedMap();
    m[String(key)] = value;
    // 测试模式的模拟投票（test_ 前缀）只留在内存，不写入本地存储
    if (!String(key).startsWith("test_")) {
        try { localStorage.setItem("AnsuzVoted", JSON.stringify(m)); } catch (e) {}
    }
};

// 已投状态的查询键：真实留言用服务器id；测试模式聚焦的官方/本地留言用符文名
AM._votedKey = function(f) {
    return f.msgId != null ? String(f.msgId) : "test_" + f.runeName;
};

AM._focus = null;         // 当前焦点 {runeName, msgId, rect}
AM._focusFrame = 0;       // 获得焦点的帧号（该帧不处理投票点击）
AM._voteInputScene = null;
AM._lastVoteTriggerDate = 0;

// TouchInput.isTriggered() 只保留一帧；投票 UI 降频更新时改用持久化的
// date/触发坐标缓存，并按时间戳消费一次，避免漏掉两次轮询之间的短按。
function consumeVoteTrigger(scene) {
    const date = Number(TouchInput.date) || 0;
    if (AM._voteInputScene !== scene) {
        AM._voteInputScene = scene;
        AM._lastVoteTriggerDate = date;
        return null;
    }
    if (!date || date === AM._lastVoteTriggerDate) return null;
    AM._lastVoteTriggerDate = date;
    return {
        x: Number.isFinite(TouchInput._triggerX) ? TouchInput._triggerX : TouchInput.x,
        y: Number.isFinite(TouchInput._triggerY) ? TouchInput._triggerY : TouchInput.y
    };
}

// 文字子弹在屏幕上的包围盒（TouchInput 坐标系）
function runeTextScreenRect(info) {
    const b = info.bullet;
    const zoom = ($gameScreen && $gameScreen.zoomScale()) || 1;
    const scale = (b.scaleX || 0.5);
    const cx = (b.x - $gameMap.displayX() * 48) * zoom;
    const cy = (b.y - $gameMap.displayY() * 48) * zoom;
    const w = info.w * scale * zoom + VOTE_TEXT_PAD * 2;
    const h = info.h * scale * zoom + VOTE_TEXT_PAD * 2;
    return { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy };
}

function pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// 共享 UI 容器（挂在 Scene_Map 上，场景销毁自动回收）
function ensureVoteUI(scene) {
    if (scene._ansuzVoteUI) return scene._ansuzVoteUI;
    const container = new Sprite();
    container.visible = false;
    const iconSet = ImageManager.loadSystem(ICON_SHEET);
    const makeIcon = (index) => {
        const sp = new Sprite(iconSet);
        sp.setFrame((index % 16) * ICON_CELL, Math.floor(index / 16) * ICON_CELL, ICON_CELL, ICON_CELL);
        sp.anchor.x = 0.5;
        sp.anchor.y = 0.5;
        sp.scale.x = sp.scale.y = VOTE_BTN_SCALE * ICON_DRAW / ICON_CELL;   // 64源→32显示(触屏48)
        container.addChild(sp);
        return sp;
    };
    container._like = makeIcon(ICON_LIKE);
    container._dislike = makeIcon(ICON_DISLIKE);
    container._btnBase = VOTE_BTN_SCALE * ICON_DRAW / ICON_CELL;   // 回弹动画的基准缩放
    const scoreSp = new Sprite(new Bitmap(200, 48));
    scoreSp.anchor.x = 0.5;
    scoreSp.anchor.y = 1;
    container.addChild(scoreSp);
    container._score = scoreSp;
    scene.addChild(container);
    scene._ansuzVoteUI = container;
    return container;
}

// 分数显示完全复刻建言文字的样式（同字体/颜色/发光；字号匹配文字的屏上实际大小）
function redrawScore(container, score, author) {
    // 分数为0（没人评价过）时不显示，避免新留言顶着个"0"碍眼
    container._score.visible = score !== 0;
    if (score === 0) {
        container._score.bitmap.clear();
        return;
    }
    const style = AM.runeTextStyle(author || "player");
    const zoom = ($gameScreen && $gameScreen.zoomScale()) || 1;
    // 符文文字：fontSize 28 × 子弹scale 0.5 × zoom = 屏上实际字号
    const fontSize = Math.max(12, Math.round(28 * 0.5 * zoom));
    const bmp = container._score.bitmap;
    bmp.clear();
    bmp.fontFace = style.fontFace;
    bmp.fontBold = style.fontBold;
    bmp.fontSize = fontSize;
    bmp.textColor = style.textColor;
    bmp.outlineWidth = 0;                        // 同建言：无描边，靠阴影发光
    const ctx = bmp.context;
    ctx.shadowColor = style.shadowColor;
    ctx.shadowBlur = Math.round(style.shadowBlur * fontSize / 28);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    bmp.drawText(String(score > 0 ? "+" + score : score), 0, 0, bmp.width, bmp.height - 4, "center");
    ctx.shadowBlur = 0;
    ctx.shadowColor = "rgba(0,0,0,0)";
    // 图标不透明度恒为255（半透明看不清；点击反馈用放大回弹表达，见 updatePunch）
}

// 投票动作（内部亦供测试直调）：value=+1/-1
AM._doVote = function(value) {
    const f = AM._focus;
    if (!f) return Promise.resolve({ ok: false, error: "no focus" });

    // 测试模式：强制投票——不访问服务器，本地模拟成功，
    // 用于确认 图标切换/回弹/分数刷新 的完整表现（官方/自己的留言也可投）
    if (AM.voteUITestMode) {
        const key = AM._votedKey(f);
        const old = AM.votedMap()[key] || 0;
        if (old === value) {
            if (window.SoundManager) SoundManager.playBuzzer();
            return Promise.resolve({ ok: true, score: null, changed: false });
        }
        AM._setVoted(key, value);
        const info = AM._runeTexts[f.runeName];
        if (info) info.score = (info.score || 0) + (value - old);
        if (window.SoundManager) SoundManager.playOk();
        AM._focusDirty = true;
        console.log("[AnsuzMsg] voteUITestMode: simulated vote", key, value);
        return Promise.resolve({ ok: true, score: info ? info.score : null, changed: true, testMode: true });
    }

    if (f.msgId == null) {
        if (window.SoundManager) SoundManager.playBuzzer();
        return Promise.resolve({ ok: false, error: "no message id" });
    }
    // 未登录不在此拦截：交给 AM.rate() 统一处理（会触发 rateNotLoggedIn 事件），
    // 失败后的 Buzzer 反馈由下方 !r.ok 分支给出
    const voted = AM.votedMap()[String(f.msgId)];
    if (voted === value) {
        if (window.SoundManager) SoundManager.playBuzzer();
        return Promise.resolve({ ok: true, score: null, changed: false });
    }
    return AM.rate(f.msgId, value).then(r => {
        if (r && r.ok) {
            AM._setVoted(f.msgId, value);
            const info = AM._runeTexts[f.runeName];
            if (info && typeof r.score === "number") info.score = r.score;
            if (window.SoundManager) SoundManager.playOk();
            AM._focusDirty = true;   // 触发重绘
        } else {
            // rate() 的所有失败路径都已触发 onNotify 事件；挂了回调时
            // 反馈（音效/文字）由回调全权负责，这里的系统蜂鸣只作无回调时的兜底
            if (typeof AM.onNotify !== "function" && window.SoundManager) {
                SoundManager.playBuzzer();
            }
        }
        return r;
    });
};

// 布局几何：赞在文字最左、踩在文字最右，屏幕边缘自动内收
function voteLayout(rect) {
    const half = (ICON_DRAW * VOTE_BTN_SCALE) / 2;
    const likeX    = Math.max(half + 4, rect.x - half - 8);
    const dislikeX = Math.min(Graphics.width - half - 4, rect.x + rect.w + half + 8);
    const cy = rect.y + rect.h / 2;
    const x0 = likeX - VOTE_BTN_HIT;
    const x1 = dislikeX + VOTE_BTN_HIT;
    const y0 = Math.min(rect.y - 48, cy - VOTE_BTN_HIT);   // 含分数行（复刻建言字号后更高）
    const y1 = Math.max(rect.y + rect.h, cy + VOTE_BTN_HIT);
    return { likeX, dislikeX, cy, ext: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
}

AM._clearFocus = function(ui) {
    AM._focus = null;
    if (ui) ui.visible = false;
};

AM._updateVoteUI = function() {
    const scene = SceneManager._scene;
    if (!scene || scene.constructor !== Scene_Map) return;
    AM._flushPendingRunes();
    const trigger = consumeVoteTrigger(scene);
    const ui = ensureVoteUI(scene);
    // 挂起条件：对话/事件/书写等占用画面时不检测
    if (!window.$gameMap || $gameMessage.isBusy() || !scene.isActive()) {
        AM._clearFocus(ui);
        return;
    }
    const px = TouchInput.x, py = TouchInput.y;

    // --- 1) 维持现有焦点：指针仍在"文字+按钮"联合区内就保持（按钮在文字外侧，
    //        没有这一步鼠标移向按钮的瞬间就会失焦） ---
    if (AM._focus) {
        const info = AM._runeTexts[AM._focus.runeName];
        if (!info || !info.bullet || info.bullet.dead || info.bullet.opacity < 0.9) {
            AM._clearFocus(ui);
        } else {
            const rect = runeTextScreenRect(info);           // 镜头移动时跟随
            const lay = voteLayout(rect);
            const inside = pointInRect(px, py, lay.ext);
            const triggerInside = trigger && pointInRect(trigger.x, trigger.y, lay.ext);
            // 桌面：悬停离开即失焦；触屏：只有"新的一次点击落在区外"才失焦
            const keep = VOTE_MOBILE ? (!trigger || triggerInside) : (inside || triggerInside);
            if (keep) {
                AM._focus.rect = rect;
                layoutAndHandle(ui, lay, trigger);
                return;
            }
            AM._clearFocus(ui);
        }
    }

    // --- 2) 获取新焦点：指针命中"文字包围盒"（多条重叠取中心最近） ---
    // 正常只检测远端他人留言；测试模式下检测全部符文（官方/本地的 msgId 为 null）
    const source = AM.voteUITestMode ? AM._runeTexts : AM._runeMsgIds;
    const focusX = trigger ? trigger.x : px;
    const focusY = trigger ? trigger.y : py;
    let best = null, bestDist = Infinity;
    for (const runeName in source) {
        const info = AM._runeTexts[runeName];
        if (!info || !info.bullet || info.bullet.dead) continue;
        if (info.bullet.opacity < 0.9) continue;
        const rect = runeTextScreenRect(info);
        if (!pointInRect(focusX, focusY, rect)) continue;
        const d = (focusX - rect.cx) * (focusX - rect.cx) + (focusY - rect.cy) * (focusY - rect.cy);
        if (d < bestDist) {
            bestDist = d;
            const msgId = AM._runeMsgIds[runeName] != null ? AM._runeMsgIds[runeName] : null;
            best = { runeName, msgId, rect };
        }
    }
    if (best) {
        AM._focus = best;
        AM._focusFrame = Graphics.frameCount;
        AM._focusDirty = true;
        layoutAndHandle(ui, voteLayout(best.rect), trigger);
    } else {
        ui.visible = false;
    }
};

// 点击回弹：PUNCH_FRAMES 是实际游戏帧数，不受投票 UI 的降频更新间隔影响。
// 数值越小动画越快；12 帧约为 0.2 秒。正弦曲线中段最大放大 35%。
const PUNCH_FRAMES = 12;
function startPunch(sp) {
    sp._punchStartFrame = Graphics.frameCount;
}
function updatePunch(ui) {
    const base = ui._btnBase;
    for (const sp of [ui._like, ui._dislike]) {
        if (Number.isFinite(sp._punchStartFrame)) {
            const elapsed = Graphics.frameCount - sp._punchStartFrame;
            const k = elapsed / PUNCH_FRAMES;
            if (k >= 1) {
                sp._punchStartFrame = null;
                sp.scale.x = sp.scale.y = base;
                continue;
            }
            const s = base * (1 + 0.35 * Math.sin(k * Math.PI)); // 起终点=base，中段最大
            sp.scale.x = sp.scale.y = s;
        } else if (sp.scale.x !== base) {
            sp.scale.x = sp.scale.y = base;
        }
    }
}

// 按已投状态切换按钮图标（未投=普通图标，已投=对应的"点亮"图标）
function setIconFrame(sp, index) {
    if (sp._iconIndex === index) return;
    sp._iconIndex = index;
    sp.setFrame((index % 16) * ICON_CELL, Math.floor(index / 16) * ICON_CELL, ICON_CELL, ICON_CELL);
}
function applyVoteState(ui, votedValue) {
    setIconFrame(ui._like,    votedValue === 1  ? ICON_LIKE_ON    : ICON_LIKE);
    setIconFrame(ui._dislike, votedValue === -1 ? ICON_DISLIKE_ON : ICON_DISLIKE);
}

function layoutAndHandle(ui, lay, trigger) {
    const f = AM._focus;
    const info = AM._runeTexts[f.runeName];
    const rect = f.rect;
    ui._like.x = lay.likeX;       ui._like.y = lay.cy;
    ui._dislike.x = lay.dislikeX; ui._dislike.y = lay.cy;
    ui._score.x = rect.cx;        ui._score.y = rect.y - 2;
    updatePunch(ui);
    if (AM._focusDirty) {
        AM._focusDirty = false;
        redrawScore(ui, (info && info.score) || 0, info && info.author);
        applyVoteState(ui, AM.votedMap()[AM._votedKey(f)] || 0);
    }
    ui.visible = true;

    // 缓存点击只消费一次；获得焦点的同一次轮询不投票（触屏首击只聚焦）
    if (trigger && Graphics.frameCount !== AM._focusFrame) {
        const px = trigger.x, py = trigger.y;
        const hit = (sp) => Math.abs(px - sp.x) <= VOTE_BTN_HIT && Math.abs(py - sp.y) <= VOTE_BTN_HIT;
        const vote = (sp, value) => {
            const voted = AM.votedMap()[AM._votedKey(f)] || 0;
            if (voted === value) {
                if (window.SoundManager) SoundManager.playBuzzer();
                return;
            }
            startPunch(sp);
            AM._doVote(value);
        };
        if (hit(ui._like)) vote(ui._like, 1);
        else if (hit(ui._dislike)) vote(ui._dislike, -1);
    }
}

//=============================================================================
// 确认留言：持久化 + 上传；本次新建言由玩家监听器在返回地图后落下
//=============================================================================
// 书写身份判定：由服务器授予的管理员标志决定（ansuz_admins 表按 playerId 判定，
// /mine 响应的 admin 字段同步，/write 响应的 official 字段兜底）。
// 权限鉴定完全在服务端——本地标志只影响书写时的即时渲染样式（金色官方/白色玩家），
// 伪造标志不会让建言进官方表。未登录一律按普通玩家。
const KEY_ADMIN = "AnsuzAdmin";
AM.isMasterAuthor = function() {
    if (!AM.getPlayerId()) return false;
    try { return localStorage.getItem(KEY_ADMIN) === "1"; } catch (e) { return false; }
};
AM._setAdminFlag = function(on) {
    try {
        if (on) localStorage.setItem(KEY_ADMIN, "1");
        else localStorage.removeItem(KEY_ADMIN);
    } catch (e) {}
};

AM._commitMessage = function(t, w) {
    const author = AM.isMasterAuthor() ? "master" : "player";
    const mapId = $gameMap.mapId();
    let x, y;
    if ($gamePlayer.centerRealX) {
        x = parseFloat($gamePlayer.centerRealX().toFixed(1));
        y = parseFloat($gamePlayer.centerRealY().toFixed(1));
    } else {
        x = $gamePlayer._realX + 0.5;
        y = $gamePlayer._realY + 0.5;
    }
    const entry = { t: String(t), w: w != null ? String(w) : null, x: x, y: y, author: author, ts: Date.now() };
    AM.localAdd(String(mapId), entry);
    // 立即登记进历史缓存（官方建言同样计入历史与分数，金色标记）
    AM._mineAddLocal(mapId, entry, author === "master");
    AM._pendingRunes.push({ mapId: mapId, entry: entry });
    AM.uploadMessage(mapId, entry);   // 未登录时静默跳过，仅本地保留
    AM._lastResult = { written: true, t: entry.t, w: entry.w, mapId: mapId, x: x, y: y };
};

//=============================================================================
// 书写界面入口 + 结果查询
//=============================================================================
// 本次（最近一次）书写会话的结果。事件解释器在书写界面打开期间是冻结的，
// 所以事件里 open() 的下一条指令天然在玩家退出界面后才执行，直接用：
//   ◆脚本：QJ.AnsuzMsg.open()
//   ◆条件分歧（脚本）：QJ.AnsuzMsg.lastWritten()   ← true=写下了建言
// 需要详情时用 lastResult()：{written:true, t, w, mapId, x, y} 或 {written:false}
AM._lastResult = { written: false };
AM._onResult = null;

AM.lastWritten = function() {
    return !!(AM._lastResult && AM._lastResult.written);
};
AM.lastResult = function() {
    return AM._lastResult;
};

// open(onResult?)：可选回调，在玩家退出界面时收到 lastResult 同款对象
AM.open = function(onResult) {
    AM.ensureLoaded().then(() => {
        AM._lastResult = { written: false };
        AM._onResult = typeof onResult === "function" ? onResult : null;
        SceneManager.push(Scene_AnsuzCompose);
    }).catch(e => console.error("[AnsuzMsg] load failed", e));
};

//=============================================================================
// "我的建言"数据（服务器权威历史+分数，与地图召唤源 AnsuzMessagesLocal 分开）
//   localStorage["AnsuzMine"] 结构（由 /mine 端点写入，尚未接入，先留数据层）：
//     { v:1, gen:<ms>, total:<所有建言总分>, maps:{ "18":[{id,t,w,s,ts},...], ... } }
//   已被作者(你)在服务器删除的建言不会同步进来。
//=============================================================================
const KEY_MINE = "AnsuzMine";

AM.mineData = function() {
    try {
        const raw = localStorage.getItem(KEY_MINE);
        if (!raw) return null;
        const d = JSON.parse(raw);
        return (d && d.maps) ? d : null;
    } catch (e) { return null; }
};

// 写完建言后把新条目静默登记进 AnsuzMine：纯本地操作，断网/弱网/未登录时
// 玩家也能立即在历史界面看到自己刚写的建言（符合直觉）。分数记 0，下次
// /mine 同步（4小时节奏）会用服务器权威数据整体覆盖本缓存。
// official=true（管理员书写）时带 o:1 标记，历史界面渲染金色。
AM._mineAddLocal = function(mapId, entry, official) {
    try {
        let d = AM.mineData();
        if (!d) d = { v: 1, gen: 0, total: 0, maps: {} };
        const key = String(mapId);
        (d.maps[key] = d.maps[key] || []).push({
            id: 0,   // 本地临时条目还没有服务器ID
            t: String(entry.t),
            w: entry.w != null ? String(entry.w) : null,
            s: 0,
            ts: entry.ts || Date.now(),
            ...(official ? { o: 1 } : {})
        });
        localStorage.setItem(KEY_MINE, JSON.stringify(d));
    } catch (e) { /* 历史缓存写失败不影响书写主流程 */ }
};

// uploadMessage 回包后：把对应的本地临时条目(id:0)补上服务器ID
// （服务器同人同图同内容去重保证唯一，按 t/w 匹配安全）
AM._mineResolveId = function(mapId, t, w, id) {
    try {
        const d = AM.mineData();
        const list = d && d.maps && d.maps[String(mapId)];
        if (!list) return;
        const wNorm = w != null ? String(w) : null;
        const hit = list.find(e => !e.id && e.t === String(t) && (e.w ?? null) === wNorm);
        if (!hit) return;
        hit.id = Number(id);
        localStorage.setItem(KEY_MINE, JSON.stringify(d));
    } catch (e) {}
};

// 从历史缓存移除一条建言（id>0 按 id 匹配；本地临时条目按 t/w/ts 匹配），
// 同步扣减总获赞；地图已无条目时清掉整个键
AM._mineRemove = function(mapId, entry) {
    try {
        const d = AM.mineData();
        if (!d || !d.maps) return;
        const key = String(mapId);
        const list = d.maps[key] || [];
        const idx = list.findIndex(e => entry.id > 0
            ? e.id === entry.id
            : (!e.id && e.t === entry.t && (e.w ?? null) === (entry.w ?? null) && e.ts === entry.ts));
        if (idx < 0) return;
        const removed = list.splice(idx, 1)[0];
        if (typeof d.total === "number") d.total -= (removed.s || 0);
        if (!list.length) delete d.maps[key];
        localStorage.setItem(KEY_MINE, JSON.stringify(d));
    } catch (e) {}
};

// 有建言的地图ID列表（升序）
AM.mineMapIds = function() {
    const d = AM.mineData();
    if (!d) return [];
    return Object.keys(d.maps).map(Number).sort((a, b) => a - b);
};

// 指定地图的建言列表（按时间倒序，新在前；无 ts 的排后）
AM.mineForMap = function(mapId) {
    const d = AM.mineData();
    const list = (d && d.maps && d.maps[String(mapId)]) || [];
    return list.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
};

// 建言总获赞（服务器返回的聚合值；缺失时客户端兜底求和）
AM.mineTotalScore = function() {
    const d = AM.mineData();
    if (!d) return 0;
    if (typeof d.total === "number") return d.total;
    let sum = 0;
    for (const k in d.maps) for (const e of d.maps[k]) sum += (e.s || 0);
    return sum;
};

// 地图名本地化钩子（用户自行覆盖：AM.onMapName = function(mapId){ return "森林入口" };）
// 默认读取 systemFeatureText.minimapName[mapId]；未登记时回退显示 "MAP <id>"。
AM.onMapName = null;
AM.mapName = function(mapId) {
    if (typeof AM.onMapName === "function") {
        try { const n = AM.onMapName(mapId); if (n) return String(n); } catch (e) {}
    }

    const localizedName = window.systemFeatureText?.minimapName?.[String(mapId)];
    const text = Array.isArray(localizedName) ? localizedName.join("") : localizedName;
    if (text != null && String(text).trim()) return String(text);

    return "MAP " + mapId;
};

// 打开"我的建言"查看界面：先刷新服务器权威历史，再创建读取缓存的窗口。
// 弱网/离线同步失败时仍沿用已有缓存，不阻断玩家进入页面。
AM.openHistory = function() {
    Promise.all([AM.ensureLoaded(), AM.syncMine()]).then(() => {
        SceneManager.push(Scene_AnsuzHistory);
    }).catch(e => console.error("[AnsuzMsg] load failed", e));
};

//=============================================================================
// 调试工具：在 /mine 服务端端点做好前，用来手动填充 AnsuzMine 测试历史界面。
// 控制台或事件脚本里调用，例：QJ.AnsuzMsg.debug.mineFromLocal()
// 【上线前删除本节，或确保只在 test 模式暴露】
//=============================================================================
AM.debug = {
    // （原 playerMode 开关已移除：书写身份改由服务器 ansuz_admins 表授予，
    //   编辑器 --test 参数不再有特权，人人默认普通玩家，无需模拟。）

    // 清空本地留言 AnsuzMessagesLocal（NW=data/ 下的 json 文件，浏览器=localStorage），
    // 获得干净的玩家初始环境；已显示的符文由调用方负责清场或重新召唤
    clearLocal() {
        if (isNode()) {
            try {
                const fs = require("fs");
                const path = require("path");
                const fp = path.join(path.dirname(process.mainModule.filename), "data", LOCAL_FILE + ".json");
                if (fs.existsSync(fp)) fs.writeFileSync(fp, "{}", "utf8");
            } catch (e) { console.warn("[AnsuzMsg.debug] clearLocal failed", e); return; }
        } else {
            try { localStorage.removeItem(LOCAL_FILE); } catch (e) {}
        }
        AM._pendingRunes = [];
        console.log("[AnsuzMsg.debug] AnsuzMessagesLocal cleared");
    },

    // 把玩家本地实际写过的建言(AnsuzMessagesLocal)镜像进 AnsuzMine，
    // 补上随机分数用于测试渲染；时间沿用书写时的真实 ts。
    // 这样你在游戏里正常写几条建言，调一次本函数，就能在历史界面看到它们。
    mineFromLocal(opts) {
        opts = opts || {};
        const local = AM.localRead();
        const maps = {};
        let total = 0, id = 1;
        for (const mapId in local) {
            const arr = local[mapId] || [];
            if (!arr.length) continue;
            maps[mapId] = arr.map(e => {
                const s = opts.zeroScore ? 0 : (Math.floor(Math.random() * 41) - 10); // -10~+30
                total += s;
                return { id: id++, t: e.t, w: e.w, s: s, ts: e.ts || Date.now() };
            });
        }
        const data = { v: 1, gen: Date.now(), total: total, maps: maps };
        localStorage.setItem(KEY_MINE, JSON.stringify(data));
        console.log("[AnsuzMsg.debug] mineFromLocal:", Object.keys(maps).length, "maps, total", total);
        return data;
    },

    // 生成合成数据：n 条建言随机分布到 mapIds 指定的地图（默认[18,48,7]），
    // 用于压测滚动/多地图/长列表。
    seedMine(n, mapIds) {
        n = n || 20;
        mapIds = mapIds || [18, 48, 7];
        const tplIds = (AM._struct && AM._struct.templates) || ["1"];
        const wordIds = Object.keys((AM._tbl && AM._tbl.words) || { "101": 1 });
        const pick = (a) => a[Math.floor(Math.random() * a.length)];
        const maps = {};
        let total = 0, id = 1;
        const now = Date.now();
        for (let i = 0; i < n; i++) {
            const mapId = String(pick(mapIds));
            const t = pick(tplIds);
            const tpl = (AM._tbl.templates[t] || "");
            const w = tpl.includes("%1") ? pick(wordIds) : null;   // 无槽模板不带词
            const s = Math.floor(Math.random() * 41) - 10;
            total += s;
            (maps[mapId] = maps[mapId] || []).push({ id: id++, t: t, w: w, s: s, ts: now - Math.floor(Math.random() * 30 * 86400000) });
        }
        const data = { v: 1, gen: now, total: total, maps: maps };
        localStorage.setItem(KEY_MINE, JSON.stringify(data));
        console.log("[AnsuzMsg.debug] seedMine:", n, "msgs across", Object.keys(maps).length, "maps, total", total);
        return data;
    },

    // 清空历史数据（回到"空界面"状态）
    clearMine() {
        localStorage.removeItem(KEY_MINE);
        console.log("[AnsuzMsg.debug] AnsuzMine cleared");
    },

    // 当前 AnsuzMine 概览
    dumpMine() {
        const d = AM.mineData();
        if (!d) { console.log("[AnsuzMsg.debug] AnsuzMine is empty"); return null; }
        console.log("[AnsuzMsg.debug] total", d.total, "| maps", AM.mineMapIds());
        return d;
    }
};

//=============================================================================
// 界面字号调节（都是相对 $gameSystem.mainFontSize() 的增量，改这里即可）
//=============================================================================
const FONT_LIST_PLUS    = 6;    // 三栏列表 + 确认窗口
const FONT_PREVIEW_PLUS = 12;   // 顶部预览（符文样式那行）
const FONT_HINT_PLUS    = 4;    // 提示行（请选择句式/单字…）
const FONT_TITLE_MINUS  = 2;    // 标题（建立讯息）比主字号小多少
// 选项行的额外行距（在字号增量之外再加，拉开触控间隙防误触；
// 安卓触屏取更大值——总行高 = 36 + FONT_LIST_PLUS + 此值）
const LINE_SPACING_PLUS = Utils.isMobileDevice() ? 14 : 10;
// 每行总增量（行高/窗口高度计算共用）
const ROW_PLUS = FONT_LIST_PLUS + LINE_SPACING_PLUS;

// 列表窗口共用的放大混入（字号与行高同步放大，避免文字裁切；
// 行高多出的部分由 itemLineRect 自动垂直居中，同时扩大触控命中区）
const AnsuzBigFont = {
    lineHeight() {
        return Window_Base.prototype.lineHeight.call(this) + ROW_PLUS;
    },
    resetFontSettings() {
        Window_Base.prototype.resetFontSettings.call(this);
        this.contents.fontSize += FONT_LIST_PLUS;
    }
};

//=============================================================================
// Window_AnsuzHeader —— 顶部标题 + 实时预览（仿黑魂1"输入讯息"头部）
//=============================================================================
function Window_AnsuzHeader() { this.initialize(...arguments); }
Window_AnsuzHeader.prototype = Object.create(Window_Base.prototype);
Window_AnsuzHeader.prototype.constructor = Window_AnsuzHeader;
Window_AnsuzHeader.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this._text = "";
    this.refresh();
};
Window_AnsuzHeader.prototype.setText = function(text) {
    if (this._text !== text) {
        this._text = text;
        this.refresh();
    }
};
// 左侧缩进：避开 Drill_MenuBackButton（按钮中心65,50，图像约占到x≈115）
Window_AnsuzHeader.INDENT = 150;
Window_AnsuzHeader.prototype.refresh = function() {
    this.contents.clear();
    const lh = this.lineHeight();
    const indent = Window_AnsuzHeader.INDENT;
    // 标题改由场景页签精灵渲染（AM._createHeaderTabs），此处只画下划线
    this.contents.paintOpacity = 96;
    this.contents.fillRect(indent, lh - 4, this.innerWidth - indent, 1, ColorManager.normalColor());
    this.contents.paintOpacity = 255;
    // 预览：按 QJ 文字子弹的实际样式预渲染（字体/颜色/发光），所见即所得
    const style = AM.runeTextStyle(AM.isMasterAuthor() ? "master" : "player");
    const fontSize = $gameSystem.mainFontSize() + FONT_PREVIEW_PLUS;
    this.resetFontSettings();
    this.contents.fontFace = style.fontFace;
    this.contents.fontBold = style.fontBold;
    this.contents.fontSize = fontSize;
    this.contents.outlineWidth = 0;                      // 子弹样式无描边，靠阴影发光
    this.changeTextColor(style.textColor);
    const ctx = this.contents.context;
    ctx.shadowColor = style.shadowColor;
    ctx.shadowBlur = Math.round(style.shadowBlur * fontSize / 28);  // 按子弹 fontSize=28 等比放大
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    this.drawText(this._text, indent + 32, Math.floor(lh * 1.4), this.innerWidth - indent - 32, "left");
    ctx.shadowBlur = 0;
    ctx.shadowColor = "rgba(0,0,0,0)";
    this.resetFontSettings();
    this.contents.fontBold = false;   // resetFontSettings 不复位这两项，手动还原
    this.contents.outlineWidth = 3;
};

//=============================================================================
// 顶部页签【建立讯息  我的建言】—— Compose / History 两场景共用：
// 当前页高亮(系统色)，另一页白色半透明；悬停恢复 255 不透明并播提示音，
// 点击跳转对方场景。这样只需维护 QJ.AnsuzMsg.open() 一个入口。
//=============================================================================
const TAB_DIM_OPACITY = 120;   // 非当前页签的半透明度
const TAB_GAP = 36;            // 两个页签的间距
const TAB_SNAP_HOLD = 2;       // 过渡截屏：等新界面画好几帧后再开始淡出
const TAB_SNAP_FADE = 32;      // 过渡截屏：每帧淡出量(255/32≈8帧)

// 页签切换的过渡截屏（goto 前截当前画面，新场景叠顶淡出，消除背景闪烁）
AM._tabSnapBitmap = null;

AM._createHeaderTabs = function(scene, activeKey) {
    const win = scene._headerWindow;
    const pad = $gameSystem.windowPadding();
    const fontSize = $gameSystem.mainFontSize() - FONT_TITLE_MINUS;
    const lh = win.lineHeight();
    const defs = [
        { key: "compose", label: AM.ui("title", "Create Message") },
        { key: "history", label: AM.ui("historyTitle", "My Messages") },
    ];
    scene._ansuzTabs = [];
    scene._ansuzTabSwitching = false;
    let x = win.x + pad + Window_AnsuzHeader.INDENT;
    const y = win.y + pad;
    for (const d of defs) {
        const active = d.key === activeKey;
        const measure = new Bitmap(1, 1);
        measure.fontFace = $gameSystem.mainFontFace();
        measure.fontSize = fontSize;
        const tw = Math.ceil(measure.measureTextWidth(d.label)) + 8;
        const bmp = new Bitmap(tw, lh);
        bmp.fontFace = $gameSystem.mainFontFace();
        bmp.fontSize = fontSize;
        bmp.textColor = active ? ColorManager.systemColor() : ColorManager.normalColor();
        bmp.drawText(d.label, 0, 0, tw, lh, "left");
        const spr = new Sprite(bmp);
        spr.x = x;
        spr.y = y;
        spr.opacity = active ? 255 : TAB_DIM_OPACITY;
        scene.addChild(spr);
        scene._ansuzTabs.push({ key: d.key, spr: spr, active: active, hover: false });
        x += tw + TAB_GAP;
    }

    // 页签切换过渡：上一界面的截屏叠在最上层（本函数在 create 末尾调用，
    // 故截屏位于所有窗口/精灵之上），待新界面画好后交叉淡出
    if (AM._tabSnapBitmap) {
        const snap = new Sprite(AM._tabSnapBitmap);
        AM._tabSnapBitmap = null;
        scene.addChild(snap);
        scene._ansuzTabSnap = snap;
        scene._ansuzTabSnapLife = 0;
    }
};

AM._updateHeaderTabs = function(scene) {
    // 过渡截屏淡出（放在最前：确认窗/切换锁都不该冻结它）
    const snap = scene._ansuzTabSnap;
    if (snap) {
        scene._ansuzTabSnapLife++;
        if (scene._ansuzTabSnapLife > TAB_SNAP_HOLD) {
            snap.opacity -= TAB_SNAP_FADE;
            if (snap.opacity <= 0) {
                scene.removeChild(snap);
                if (snap.bitmap) snap.bitmap.destroy();
                scene._ansuzTabSnap = null;
            }
        }
    }

    const tabs = scene._ansuzTabs;
    if (!tabs || scene._ansuzTabSwitching) return;
    // 确认窗（写下/重写/放弃）弹出期间禁用页签，避免误触丢内容
    if (scene._confirmWindow && scene._confirmWindow.visible) return;
    for (const tab of tabs) {
        if (tab.active) continue;
        const spr = tab.spr;
        const hit = TouchInput.x >= spr.x && TouchInput.x <= spr.x + spr.bitmap.width &&
                    TouchInput.y >= spr.y && TouchInput.y <= spr.y + spr.bitmap.height;
        if (hit !== tab.hover) {
            tab.hover = hit;
            spr.opacity = hit ? 255 : TAB_DIM_OPACITY;
            if (hit) SoundManager.playCursor();
        }
        if (hit && TouchInput.isTriggered()) {
            scene._ansuzTabSwitching = true;
            SoundManager.playOk();
            // 截下当前画面交给新场景做交叉溶解，消除 goto 期间 1-2 帧的背景闪烁
            try { AM._tabSnapBitmap = Bitmap.snap(scene); } catch (e) { AM._tabSnapBitmap = null; }
            SceneManager.goto(tab.key === "compose" ? Scene_AnsuzCompose : Scene_AnsuzHistory);
            return;
        }
    }
};

// open() 的结果回调延迟到真正离开建言界面组再发（页签互切不算离开——
// 否则"写完→切去历史看一眼"会提前发 written:false/true 的错乱回调）
AM._flushResultCallback = function() {
    if (!AM._onResult) return;
    const next = SceneManager._nextScene;
    if (next && (next instanceof Scene_AnsuzCompose || next instanceof Scene_AnsuzHistory)) return;
    const cb = AM._onResult;
    AM._onResult = null;
    try { cb(AM._lastResult); } catch (e) { console.error("[AnsuzMsg] onResult error", e); }
};

//=============================================================================
// 三栏条目整体右移8px（光标/高亮/文字一起挪，分割线不动，避免光标贴线）
//=============================================================================
const ansuzShiftedItemRect = function(index) {
    const rect = Window_Selectable.prototype.itemRect.call(this, index);
    rect.x += 8;
    rect.width -= 8;
    return rect;
};

//=============================================================================
// Window_AnsuzTemplate —— 句式列表（左栏；无%1槽位的短句选中后直接进入确认）
//=============================================================================
function Window_AnsuzTemplate() { this.initialize(...arguments); }
Window_AnsuzTemplate.prototype = Object.create(Window_Command.prototype);
Window_AnsuzTemplate.prototype.constructor = Window_AnsuzTemplate;
Window_AnsuzTemplate.prototype.makeCommandList = function() {
    const order = (AM._struct && AM._struct.templates) || [];
    for (const id of order) {
        const raw = AM._tbl.templates[id] || "%1";
        const label = raw.includes("%1") ? raw.replace("%1", AM.ui("slot", "[ Enter text ]")) : raw;
        this.addCommand(label, "tpl", true, id);
    }
};
Window_AnsuzTemplate.prototype.itemTextAlign = function() { return "left"; };
Window_AnsuzTemplate.prototype.itemRect = ansuzShiftedItemRect;
Object.assign(Window_AnsuzTemplate.prototype, AnsuzBigFont);
Window_AnsuzTemplate.prototype.select = function(index) {
    Window_Command.prototype.select.call(this, index);
    if (this._previewHook) this._previewHook();
};

Window_AnsuzTemplate.prototype.drill_MSB_scrollBarStyleId = function() {
  return 5;
}; 

//=============================================================================
// Window_AnsuzCategory —— 类别列表（选定句式前不显示内容，防止阶段混淆）
//=============================================================================
function Window_AnsuzCategory() { this.initialize(...arguments); }
Window_AnsuzCategory.prototype = Object.create(Window_Command.prototype);
Window_AnsuzCategory.prototype.constructor = Window_AnsuzCategory;
Window_AnsuzCategory.prototype.makeCommandList = function() {
    if (!this._revealed) return;
    const cats = (AM._struct && AM._struct.categories) || [];
    for (const cat of cats) {
        this.addCommand(AM._tbl.categories[cat.id] || cat.id, "cat", true, cat);
    }
};
Window_AnsuzCategory.prototype.itemTextAlign = function() { return "left"; };
Window_AnsuzCategory.prototype.itemRect = ansuzShiftedItemRect;
Object.assign(Window_AnsuzCategory.prototype, AnsuzBigFont);
Window_AnsuzCategory.prototype.reveal = function() {
    if (!this._revealed) {
        this._revealed = true;
        this.refresh();
    }
    if (this.index() < 0) this.select(0);
    this.scrollTo(0, 0);
};
Window_AnsuzCategory.prototype.conceal = function() {
    if (this._revealed) {
        this._revealed = false;
        this.deselect();
        this.refresh();
    }
};
Window_AnsuzCategory.prototype.drill_MSB_scrollBarStyleId = function() {
  return 5;
}; 
//=============================================================================
// Window_AnsuzWord —— 单词列表（选定类别前不显示内容）
//=============================================================================
function Window_AnsuzWord() { this.initialize(...arguments); }
Window_AnsuzWord.prototype = Object.create(Window_Command.prototype);
Window_AnsuzWord.prototype.constructor = Window_AnsuzWord;
Window_AnsuzWord.prototype.setCategory = function(cat) {
    this._cat = cat;
    this.refresh();
    this.select(0);
    this.scrollTo(0, 0);
};
Window_AnsuzWord.prototype.conceal = function() {
    if (this._cat) {
        this._cat = null;
        this.deselect();
        this.refresh();
    }
};
Window_AnsuzWord.prototype.makeCommandList = function() {
    if (!this._cat) return;
    for (const wid of this._cat.words) {
        this.addCommand(AM._tbl.words[wid] || ("#" + wid), "word", true, wid);
    }
};
Window_AnsuzWord.prototype.itemTextAlign = function() { return "left"; };
Window_AnsuzWord.prototype.itemRect = ansuzShiftedItemRect;
Object.assign(Window_AnsuzWord.prototype, AnsuzBigFont);
Window_AnsuzWord.prototype.select = function(index) {
    Window_Command.prototype.select.call(this, index);
    if (this._previewHook) this._previewHook();
};

Window_AnsuzWord.prototype.drill_MSB_scrollBarStyleId = function() {
  return 6;
}; 
//=============================================================================
// Window_AnsuzConfirm —— 确认窗口
//=============================================================================
function Window_AnsuzConfirm() { this.initialize(...arguments); }
Window_AnsuzConfirm.prototype = Object.create(Window_Command.prototype);
Window_AnsuzConfirm.prototype.constructor = Window_AnsuzConfirm;
Window_AnsuzConfirm.prototype.makeCommandList = function() {
    this.addCommand(AM.ui("confirmWrite", "Write it"), "write");
    this.addCommand(AM.ui("confirmRewrite", "Start over"), "rewrite");
    // 注意 symbol 不能用 "cancel"：那会和取消键输入共用处理器，
    // 而两者语义不同（菜单项=明确放弃退出；取消键=只关确认窗回退一级）
    this.addCommand(AM.ui("confirmCancel", "Never mind"), "abandon");
};
Window_AnsuzConfirm.prototype.itemTextAlign = function() { return "center"; };
Object.assign(Window_AnsuzConfirm.prototype, AnsuzBigFont);

//=============================================================================
// Scene_AnsuzCompose —— 建言书写场景
//=============================================================================
function Scene_AnsuzCompose() { this.initialize(...arguments); }
window.Scene_AnsuzCompose = Scene_AnsuzCompose;
Scene_AnsuzCompose.prototype = Object.create(Scene_MenuBase.prototype);
Scene_AnsuzCompose.prototype.constructor = Scene_AnsuzCompose;

Scene_AnsuzCompose.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this._templateId = null;
    this._wordId = null;
    this.createHeaderWindow();
    this.createHintWindow();
    this.createColumnWindows();
    this.createConfirmWindow();
    this.setPhaseTemplate();
    AM._createHeaderTabs(this, "compose");
};

Scene_AnsuzCompose.prototype.createHeaderWindow = function() {
    const ww = Graphics.boxWidth - 16;
    const wh = this.calcWindowHeight(3, false);
    this._headerWindow = new Window_AnsuzHeader(new Rectangle(8, 8, ww, wh));
    this.addWindow(this._headerWindow);
};

Scene_AnsuzCompose.prototype.createHintWindow = function() {
    const y = this._headerWindow.y + this._headerWindow.height + 12;
    const wh = this.calcWindowHeight(1, false) + FONT_HINT_PLUS;
    this._helpWindow = new Window_Help(new Rectangle(8, y, Graphics.boxWidth - 16, wh));
    this._helpWindow.resetFontSettings = function() {
        Window_Base.prototype.resetFontSettings.call(this);
        this.contents.fontSize += FONT_HINT_PLUS;
    };
    this.addWindow(this._helpWindow);
};

// 三栏布局（仿黑魂1）：句式 | 类别 | 单词，栏间画固定竖分割线
Scene_AnsuzCompose.prototype.createColumnWindows = function() {
    const gap = 16;
    const x0 = 8;
    const y0 = this._helpWindow.y + this._helpWindow.height + 12;
    const totalW = Graphics.boxWidth - 16;
    // 高度对齐到行高整数倍：填满剩余空间会让最后一行被拦腰裁切
    // （itemHeight = 基础行高36 + ROW_PLUS + Selectable的8px 内边距）
    const itemH = Window_Base.prototype.lineHeight() + ROW_PLUS + 8;
    const pad2 = $gameSystem.windowPadding() * 2;
    const availH = Graphics.boxHeight - y0 - 16;
    const rows = Math.max(3, Math.floor((availH - pad2) / itemH));
    const wh = rows * itemH + pad2;
    const tplW = Math.floor(totalW * 0.40);
    const catW = Math.floor(totalW * 0.25);
    const wordW = totalW - tplW - catW - gap * 2;

    const tplWin = new Window_AnsuzTemplate(new Rectangle(x0, y0, tplW, wh));
    tplWin._previewHook = this.updatePreview.bind(this);
    tplWin.setHandler("tpl", this.onTemplateOk.bind(this));
    tplWin.setHandler("cancel", this.popScene.bind(this));
    this._templateWindow = tplWin;
    this.addWindow(tplWin);

    const catWin = new Window_AnsuzCategory(new Rectangle(x0 + tplW + gap, y0, catW, wh));
    catWin.setHandler("cat", this.onCategoryOk.bind(this));
    catWin.setHandler("cancel", this.setPhaseTemplate.bind(this));
    this._categoryWindow = catWin;
    this.addWindow(catWin);

    const wordWin = new Window_AnsuzWord(new Rectangle(x0 + tplW + gap + catW + gap, y0, wordW, wh));
    wordWin._previewHook = this.updatePreview.bind(this);
    wordWin.setHandler("word", this.onWordOk.bind(this));
    wordWin.setHandler("cancel", this.onWordCancel.bind(this));
    this._wordWindow = wordWin;
    this.addWindow(wordWin);

    // 栏间固定竖分割线（与栏内容显隐无关，始终可见）
    const divBmp = new Bitmap(Graphics.boxWidth, wh);
    divBmp.paintOpacity = 96;
    const div1x = x0 + tplW + Math.floor(gap / 2);
    const div2x = x0 + tplW + gap + catW + Math.floor(gap / 2);
    divBmp.fillRect(div1x, 8, 1, wh - 16, ColorManager.normalColor());
    divBmp.fillRect(div2x, 8, 1, wh - 16, ColorManager.normalColor());
    const divSprite = new Sprite(divBmp);
    divSprite.y = y0;
    this.addChild(divSprite);
    this._dividerSprite = divSprite;
};

Scene_AnsuzCompose.prototype.createConfirmWindow = function() {
    const ww = 320 + FONT_LIST_PLUS * 6;
    const wh = this.calcWindowHeight(3, true) + ROW_PLUS * 3;   // 行高随字号+行距增大，窗口同步加高
    const rect = new Rectangle((Graphics.boxWidth - ww) / 2, (Graphics.boxHeight - wh) / 2, ww, wh);
    const win = new Window_AnsuzConfirm(rect);
    win.setHandler("write", this.onConfirmWrite.bind(this));
    win.setHandler("rewrite", this.onConfirmRewrite.bind(this));
    win.setHandler("abandon", this.exitScene.bind(this));   // 菜单项「放弃」＝明确退出
    win.setHandler("cancel", this.popScene.bind(this));     // 取消键＝分级回退（见 popScene 重写）
    win.hide();
    win.deactivate();
    this._confirmWindow = win;
    this.addWindow(win);
};

//=============================================================================
// 分级回退：取消键/右键/左上角返回按钮(Drill_MenuBackButton 直接调 popScene)
// 统一走这里——确认窗 → 单词 → 类别 → 句式，句式阶段再取消才真正退出场景。
//=============================================================================
Scene_AnsuzCompose.prototype.popScene = function() {
    if (this._confirmWindow && this._confirmWindow.visible) {
        this.closeConfirm();
        return;
    }
    if (this._wordWindow && this._wordWindow.active) {
        this.onWordCancel();
        return;
    }
    if (this._categoryWindow && this._categoryWindow.active) {
        this.setPhaseTemplate();
        return;
    }
    this.exitScene();
};

Scene_AnsuzCompose.prototype.exitScene = function() {
    Scene_Base.prototype.popScene.call(this);
};

// 关闭确认窗，回到上一阶段（有槽句式→单词选择；无槽短句→句式选择）
Scene_AnsuzCompose.prototype.closeConfirm = function() {
    this._confirmWindow.hide();
    this._confirmWindow.deactivate();
    const tpl = AM._tbl.templates[this._templateId] || "%1";
    if (tpl.includes("%1")) {
        this._wordId = null;
        this._wordWindow.activate();
        this._helpWindow.setText(AM.ui("chooseWord", "Choose a word"));
        this.updatePreview();
    } else {
        this.setPhaseTemplate();
    }
};

// ---------- 阶段切换（逐级揭示：句式→类别→单词，防止阶段混淆） ----------
Scene_AnsuzCompose.prototype.setPhaseTemplate = function() {
    this._templateId = null;
    this._wordId = null;
    this._confirmWindow.hide();
    this._confirmWindow.deactivate();
    this._categoryWindow.deactivate();
    this._categoryWindow.conceal();
    this._wordWindow.deactivate();
    this._wordWindow.conceal();
    this._templateWindow.activate();
    this._helpWindow.setText(AM.ui("chooseTemplate", "Choose a phrase"));
    this.updatePreview();
};

Scene_AnsuzCompose.prototype.setPhaseCategory = function() {
    this._confirmWindow.hide();
    this._confirmWindow.deactivate();
    this._templateWindow.deactivate();
    this._wordWindow.deactivate();
    this._wordWindow.conceal();
    this._categoryWindow.reveal();
    this._categoryWindow.activate();
    this._helpWindow.setText(AM.ui("chooseCategory", "Choose a word category"));
    this.updatePreview();
};

// ---------- 事件处理 ----------
Scene_AnsuzCompose.prototype.onTemplateOk = function() {
    this._templateId = this._templateWindow.currentExt();
    const tpl = AM._tbl.templates[this._templateId] || "%1";
    if (tpl.includes("%1")) {
        this.setPhaseCategory();
    } else {
        // 无槽位短句：直接进入确认
        this._wordId = null;
        this.openConfirm();
    }
};

Scene_AnsuzCompose.prototype.openConfirm = function() {
    this._templateWindow.deactivate();
    this._categoryWindow.deactivate();
    this._wordWindow.deactivate();
    this._confirmWindow.show();
    this._confirmWindow.select(0);
    this._confirmWindow.activate();
    this._helpWindow.setText(AM.ui("confirmAsk", "Leave this message here?"));
    this.updatePreview();
};

Scene_AnsuzCompose.prototype.onCategoryOk = function() {
    const cat = this._categoryWindow.currentExt();
    if (!cat) { this._categoryWindow.activate(); return; }
    this._categoryWindow.deactivate();
    this._wordWindow.setCategory(cat);   // 点击类别后单词栏才显示内容
    this._wordWindow.activate();
    this._helpWindow.setText(AM.ui("chooseWord", "Choose a word"));
};

Scene_AnsuzCompose.prototype.onWordCancel = function() {
    this._wordWindow.deactivate();
    this._wordWindow.conceal();          // 退回类别阶段时清空单词栏
    this._categoryWindow.activate();
    this._helpWindow.setText(AM.ui("chooseCategory", "Choose a word category"));
};

Scene_AnsuzCompose.prototype.onWordOk = function() {
    this._wordId = this._wordWindow.currentExt();
    this.openConfirm();
};

Scene_AnsuzCompose.prototype.onConfirmWrite = function() {
    AM._commitMessage(this._templateId, this._wordId);
    this.exitScene();   // 不能用 popScene：已被重写为分级回退，会被确认窗拦截
};

Scene_AnsuzCompose.prototype.onConfirmRewrite = function() {
    this.setPhaseTemplate();
};

// ---------- 预览 ----------
Scene_AnsuzCompose.prototype.updatePreview = function() {
    if (!this._headerWindow) return;
    let text;
    const slot = AM.ui("slot", "[ Enter text ]");
    if (this._templateId == null) {
        const id = this._templateWindow ? this._templateWindow.currentExt() : null;
        const tpl = id != null ? (AM._tbl.templates[id] || "%1") : "";
        text = tpl.replace("%1", slot);
    } else {
        const tpl = AM._tbl.templates[this._templateId] || "%1";
        const active = this._wordWindow && this._wordWindow.active;
        const confirming = this._confirmWindow && this._confirmWindow.visible;
        let word = slot;
        if (confirming && this._wordId != null) {
            word = AM._tbl.words[this._wordId] || slot;
        } else if (active && this._wordWindow.index() >= 0) {
            word = this._wordWindow.commandName(this._wordWindow.index()) || slot;
        }
        text = tpl.replace("%1", word);
    }
    this._headerWindow.setText(text);
};

Scene_AnsuzCompose.prototype.update = function() {
    Scene_MenuBase.prototype.update.call(this);
    // 单词窗口激活期间光标移动实时回填预览（select 钩子已覆盖，兜底轮询一次开销可忽略）
    if (this._wordWindow && this._wordWindow.active) this.updatePreview();
    AM._updateHeaderTabs(this);
};

// 场景退出时向 open() 的回调通报结果（页签切去历史不算退出，见 _flushResultCallback）
Scene_AnsuzCompose.prototype.terminate = function() {
    Scene_MenuBase.prototype.terminate.call(this);
    AM._flushResultCallback();
};

//=============================================================================
// 历史场景：顶部标题+总获赞 | 左栏地图列表 | 右栏该图我的建言(含分数与时间)
//=============================================================================

// --- 顶部：标题 + "建言总获赞 N"（复刻 Compose 的头部风格） ---
function Window_AnsuzHistoryHeader() { this.initialize(...arguments); }
Window_AnsuzHistoryHeader.prototype = Object.create(Window_Base.prototype);
Window_AnsuzHistoryHeader.prototype.constructor = Window_AnsuzHistoryHeader;
Window_AnsuzHistoryHeader.prototype.initialize = function(rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.refresh();
};
Window_AnsuzHistoryHeader.prototype.refresh = function() {
    this.contents.clear();
    const lh = this.lineHeight();
    const indent = Window_AnsuzHeader.INDENT;
    // 标题改由场景页签精灵渲染（AM._createHeaderTabs），此处只画下划线
    this.contents.paintOpacity = 96;
    this.contents.fillRect(indent, lh - 4, this.innerWidth - indent, 1, ColorManager.normalColor());
    this.contents.paintOpacity = 255;
    // 总获赞：用符文样式渲染，金色官方配色以示"成就感"
    const style = AM.runeTextStyle("master");
    const fontSize = $gameSystem.mainFontSize() + FONT_PREVIEW_PLUS;
    this.resetFontSettings();
    this.contents.fontFace = style.fontFace;
    this.contents.fontBold = style.fontBold;
    this.contents.fontSize = fontSize;
    this.contents.outlineWidth = 0;
    this.changeTextColor(style.textColor);
    const ctx = this.contents.context;
    ctx.shadowColor = style.shadowColor;
    ctx.shadowBlur = Math.round(style.shadowBlur * fontSize / 28);
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    const label = AM.ui("historyKarma", "Total praise: %1").replace("%1", String(AM.mineTotalScore()));
    this.drawText(label, indent + 32, Math.floor(lh * 1.4), this.innerWidth - indent - 32, "left");
    ctx.shadowBlur = 0; ctx.shadowColor = "rgba(0,0,0,0)";
    this.resetFontSettings();
    this.contents.fontBold = false;
    this.contents.outlineWidth = 3;
};

// --- 左栏：有建言的地图列表（地图名走本地化钩子，默认显示ID） ---
function Window_AnsuzHistoryMap() { this.initialize(...arguments); }
Window_AnsuzHistoryMap.prototype = Object.create(Window_Command.prototype);
Window_AnsuzHistoryMap.prototype.constructor = Window_AnsuzHistoryMap;
Window_AnsuzHistoryMap.prototype.makeCommandList = function() {
    for (const mapId of AM.mineMapIds()) {
        this.addCommand(AM.mapName(mapId), "map", true, mapId);
    }
};
Window_AnsuzHistoryMap.prototype.itemTextAlign = function() { return "left"; };
Window_AnsuzHistoryMap.prototype.itemRect = ansuzShiftedItemRect;
Object.assign(Window_AnsuzHistoryMap.prototype, AnsuzBigFont);
Window_AnsuzHistoryMap.prototype.select = function(index) {
    Window_Command.prototype.select.call(this, index);
    if (this._listWindow && index >= 0) {
        const ext = this.currentExt();
        this._listWindow.setMap(ext);
    }
};

// --- 右栏：某图我的建言，每条渲染成实际符文样式 + 分数 + 时间 ---
function Window_AnsuzHistoryList() { this.initialize(...arguments); }
Window_AnsuzHistoryList.prototype = Object.create(Window_Selectable.prototype);
Window_AnsuzHistoryList.prototype.constructor = Window_AnsuzHistoryList;
Window_AnsuzHistoryList.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this._items = [];
    this._confirmIndex = -1;    // 处于"删除确认"态的条目下标（-1=无）
    this._confirmHover = null;  // 悬停中的按钮："del" | "cancel" | null
};
Window_AnsuzHistoryList.prototype.setMap = function(mapId) {
    this._mapId = mapId;
    this._items = mapId != null ? AM.mineForMap(mapId) : [];
    this._confirmIndex = -1;
    this._confirmHover = null;
    this.refresh();
    this.scrollTo(0, 0);
};

// ---- 删除确认态：点击条目后第二行换成【删除 取消】，悬停高亮+提示音 ----
Window_AnsuzHistoryList.CONFIRM_BTN_W = 150;
Window_AnsuzHistoryList.CONFIRM_BTN_GAP = 32;

Window_AnsuzHistoryList.prototype.isConfirming = function() { return this._confirmIndex >= 0; };
Window_AnsuzHistoryList.prototype.setConfirm = function(index) {
    this._confirmIndex = index;
    this._confirmHover = null;
    this.refresh();
};
Window_AnsuzHistoryList.prototype.clearConfirm = function() {
    if (this._confirmIndex < 0) return;
    this._confirmIndex = -1;
    this._confirmHover = null;
    this.refresh();
};

Window_AnsuzHistoryList.prototype._confirmButtonRects = function() {
    if (this._confirmIndex < 0 || this._confirmIndex >= this.maxItems()) return null;
    // 按钮占据整条目的下半区：绘制与命中同框，drawText 在框内垂直居中，
    // 字形必然落在命中区里。（此前用 itemLineRect 的半行高做框，名义行高
    // 比实际字号小、字形溢出到框下方，导致"判定偏上"；整块下半区也让
    // 触屏目标更大。）
    const item = this.itemRectWithPadding(this._confirmIndex);
    const half = Math.floor(item.height / 2);
    const y2 = item.y + half;
    const BW = Window_AnsuzHistoryList.CONFIRM_BTN_W;
    const GAP = Window_AnsuzHistoryList.CONFIRM_BTN_GAP;
    const rightEdge = item.x + item.width - 8;
    return {
        del:    new Rectangle(rightEdge - BW * 2 - GAP, y2, BW, half),
        cancel: new Rectangle(rightEdge - BW, y2, BW, half)
    };
};

Window_AnsuzHistoryList.prototype._drawConfirmButtons = function() {
    const rects = this._confirmButtonRects();
    if (!rects) return;
    this.changePaintOpacity(this._confirmHover === "del");
    this.changeTextColor("#ff8080");
    this.drawText(AM.ui("historyDelete", "Delete"), rects.del.x, rects.del.y, rects.del.width, rects.del.height, "center");
    this.changePaintOpacity(this._confirmHover === "cancel");
    this.changeTextColor(ColorManager.normalColor());
    this.drawText(AM.ui("historyCancel", "Cancel"), rects.cancel.x, rects.cancel.y, rects.cancel.width, rects.cancel.height, "center");
    this.changePaintOpacity(true);
};

// 指针当前落在哪个确认按钮上（窗口内容局部坐标，含滚动修正——同 hitIndex 的换算）
Window_AnsuzHistoryList.prototype._confirmButtonAt = function() {
    const rects = this._confirmButtonRects();
    if (!rects) return null;
    const localPos = this.worldTransform.applyInverse(new Point(TouchInput.x, TouchInput.y));
    const cx = localPos.x - this.padding;
    const cy = localPos.y - this.padding;
    if (rects.del.contains(cx, cy)) return "del";
    if (rects.cancel.contains(cx, cy)) return "cancel";
    return null;
};

Window_AnsuzHistoryList.prototype.update = function() {
    Window_Selectable.prototype.update.call(this);
    if (this._confirmIndex >= 0) {
        const btn = this._confirmButtonAt();
        if (btn !== this._confirmHover) {
            this._confirmHover = btn;
            if (btn) SoundManager.playCursor();
            this.refresh();
        }
    }
};

Window_AnsuzHistoryList.prototype.processTouch = function() {
    // 必须在"松开"(isClicked)阶段处理并吞掉点击：MZ 的条目 onTouchOk 也在
    // 松开阶段触发——若在"按下"(isTriggered)阶段处理按钮，随后的松开会落到
    // 条目上再次触发 ok → 取消后下一帧又弹出确认，形成循环（已踩坑）。
    if (this.isOpenAndActive() && this._confirmIndex >= 0 && TouchInput.isClicked()) {
        const btn = this._confirmButtonAt();
        if (btn === "del") {
            this.updateInputData();
            this.callHandler("delete");
            return;
        }
        if (btn === "cancel") {
            this.updateInputData();
            SoundManager.playCancel();
            this.clearConfirm();
            return;
        }
        // 点在按钮之外：走默认逻辑（点另一条 → 切换确认目标）
    }
    Window_Selectable.prototype.processTouch.call(this);
};
Window_AnsuzHistoryList.prototype.maxItems = function() { return this._items ? this._items.length : 0; };
// 每条两行：建言文字 + (分数/时间)，故行高翻倍
Window_AnsuzHistoryList.prototype.itemHeight = function() {
    return (Window_Base.prototype.lineHeight.call(this) + ROW_PLUS) * 2;
};
Window_AnsuzHistoryList.prototype.drawItem = function(index) {
    const e = this._items[index];
    if (!e) return;
    const rect = this.itemLineRect(index);
    const half = Math.floor(rect.height / 2);
    // 第1行：建言文字（符文样式：玩家红 / 官方金，按条目 o 标志）
    const style = AM.runeTextStyle(e.o ? "master" : "player");
    const fontSize = $gameSystem.mainFontSize() + FONT_LIST_PLUS;
    this.resetFontSettings();
    this.contents.fontFace = style.fontFace;
    this.contents.fontBold = style.fontBold;
    this.contents.fontSize = fontSize;
    this.contents.outlineWidth = 0;
    this.changeTextColor(style.textColor);
    const ctx = this.contents.context;
    ctx.shadowColor = style.shadowColor;
    ctx.shadowBlur = Math.round(style.shadowBlur * fontSize / 28);
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    this.drawText(AM.renderText(e.t, e.w), rect.x + 8, rect.y, rect.width - 16, half, "left");
    ctx.shadowBlur = 0; ctx.shadowColor = "rgba(0,0,0,0)";
    // 第2行：确认态渲染【删除 取消】按钮，常态渲染评分+时间
    this.resetFontSettings();
    this.contents.fontBold = false;
    this.contents.outlineWidth = 3;
    this.contents.fontSize = $gameSystem.mainFontSize();
    if (index === this._confirmIndex) {
        this._drawConfirmButtons();
        this.resetTextColor();
        return;
    }
    const y2 = rect.y + half;
    const rightEdge = rect.x + rect.width - 8;
    const TIME_W = 220;   // 时间列宽（容纳 "2026-06-23 03:55"）
    const SCORE_W = 140;  // 评分列宽
    const GAP = 48;       // 评分与时间之间的间隔
    // 时间：最右，右对齐
    let scoreRight = rightEdge;
    if (e.ts) {
        this.changeTextColor(ColorManager.normalColor());
        this.drawText(formatTs(e.ts), rightEdge - TIME_W, y2, TIME_W, half, "right");
        scoreRight = rightEdge - TIME_W - GAP;   // 评分退到时间左侧
    }
    // 评分：右对齐在时间左侧（无时间时贴最右）
    const s = e.s || 0;
    this.changeTextColor(s < 0 ? "#ff8080" : ColorManager.systemColor());
    const scoreText = AM.ui("historyScore", "Score: %1").replace("%1", (s > 0 ? "+" + s : String(s)));
    this.drawText(scoreText, scoreRight - SCORE_W, y2, SCORE_W, half, "right");
    this.resetTextColor();
};

// 时间戳格式化（unix ms → YYYY-MM-DD HH:mm，本地时区）
function formatTs(ts) {
    const d = new Date(Number(ts));
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
        " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

// --- 场景 ---
function Scene_AnsuzHistory() { this.initialize(...arguments); }
window.Scene_AnsuzHistory = Scene_AnsuzHistory;
Scene_AnsuzHistory.prototype = Object.create(Scene_MenuBase.prototype);
Scene_AnsuzHistory.prototype.constructor = Scene_AnsuzHistory;

Scene_AnsuzHistory.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createHeaderWindow();
    this.createHintWindow();
    this.createColumnWindows();
    this._mapWindow.activate();
    this._mapWindow.select(0);
    AM._createHeaderTabs(this, "history");
};

Scene_AnsuzHistory.prototype.createHeaderWindow = function() {
    const wh = this.calcWindowHeight(3, false);
    this._headerWindow = new Window_AnsuzHistoryHeader(new Rectangle(8, 8, Graphics.boxWidth - 16, wh));
    this.addWindow(this._headerWindow);
};

Scene_AnsuzHistory.prototype.createHintWindow = function() {
    const y = this._headerWindow.y + this._headerWindow.height + 12;
    const wh = this.calcWindowHeight(1, false) + FONT_HINT_PLUS;
    this._helpWindow = new Window_Help(new Rectangle(8, y, Graphics.boxWidth - 16, wh));
    this._helpWindow.resetFontSettings = function() {
        Window_Base.prototype.resetFontSettings.call(this);
        this.contents.fontSize += FONT_HINT_PLUS;
    };
    this._helpWindow.setText(AM.ui("historyHint", "Choose a location"));
    this.addWindow(this._helpWindow);
};

Scene_AnsuzHistory.prototype.createColumnWindows = function() {
    const gap = 16;
    const x0 = 8;
    const y0 = this._helpWindow.y + this._helpWindow.height + 12;
    const totalW = Graphics.boxWidth - 16;
    const availH = Graphics.boxHeight - y0 - 16;
    const pad2 = $gameSystem.windowPadding() * 2;
    // 高度对齐到【列表双倍行高】的整数倍：右栏每条建言占两行(文字+元数据)，
    // 若按单行算，窗口高不是列表条目高的整倍数 → 顶部裁切+光标错位。
    // 左栏地图是单行，此高度对它是 2×rows 行，同样整除，两栏都不会裁。
    const listItemH = (Window_Base.prototype.lineHeight() + ROW_PLUS) * 2;
    const rows = Math.max(2, Math.floor((availH - pad2) / listItemH));
    const wh = rows * listItemH + pad2;
    const mapW = Math.floor(totalW * 0.34);
    const listW = totalW - mapW - gap;

    const mapWin = new Window_AnsuzHistoryMap(new Rectangle(x0, y0, mapW, wh));
    mapWin.setHandler("map", this.onMapOk.bind(this));
    mapWin.setHandler("cancel", this.popScene.bind(this));
    this._mapWindow = mapWin;
    this.addWindow(mapWin);

    const listWin = new Window_AnsuzHistoryList(new Rectangle(x0 + mapW + gap, y0, listW, wh));
    listWin.setHandler("ok", this.onListOk.bind(this));
    listWin.setHandler("delete", this.onListDelete.bind(this));
    listWin.setHandler("cancel", this.onListCancel.bind(this));
    this._listWindow = listWin;
    mapWin._listWindow = listWin;
    this.addWindow(listWin);

    if (mapWin.maxItems() === 0) {
        this._helpWindow.setText(AM.ui("historyEmpty", "No messages yet"));
    }

    // 栏间分割线
    const divBmp = new Bitmap(Graphics.boxWidth, wh);
    divBmp.paintOpacity = 96;
    divBmp.fillRect(x0 + mapW + Math.floor(gap / 2), 8, 1, wh - 16, ColorManager.normalColor());
    divBmp.paintOpacity = 255;
    const divSprite = new Sprite(divBmp);
    divSprite.y = y0;
    this.addChild(divSprite);
};

Scene_AnsuzHistory.prototype.onMapOk = function() {
    if (this._listWindow.maxItems() === 0) { this._mapWindow.activate(); return; }
    this._mapWindow.deactivate();
    this._listWindow.activate();
    this._listWindow.select(0);
    this._helpWindow.setText(AM.ui("historyList", "Your messages here"));
};

// 选中条目 → 进入删除确认态（第二行变成【删除 取消】）
Scene_AnsuzHistory.prototype.onListOk = function() {
    const win = this._listWindow;
    win.activate();   // processOk 会 deactivate，确认态仍需接收点击/取消键
    if (win._items[win.index()]) win.setConfirm(win.index());
};

// 点击【删除】：本地立即移除 + 上报服务器软删除
Scene_AnsuzHistory.prototype.onListDelete = function() {
    const win = this._listWindow;
    const e = win._items[win._confirmIndex];
    const mapId = win._mapId;
    win.clearConfirm();
    if (!e) { win.activate(); return; }
    SoundManager.playOk();

    // 服务器软删除（fire-and-forget；失败的话下次 /mine 同步该条会回来，自愈）
    if (e.id > 0) {
        AM.deleteMessage(e.id);
    } else {
        // id:0 = 该条尚未拿到服务器ID（离线书写/上传失败/未同步），仅本地移除；
        // 若服务器上其实存在同内容记录，syncBatch(true) 刷回权威 id 后可再删
        console.info("[AnsuzMsg] delete: entry has no server id, local-only removal", e);
    }
    // 本地清理：历史缓存（含总分扣减）+ 本地留言（地图符文来源，重进图后消失）
    AM._mineRemove(mapId, e);
    AM._localRemove(mapId, e.t, e.w);

    // 刷新：头部总获赞 / 左栏地图列表（该图可能已无建言）/ 右栏列表
    this._headerWindow.refresh();
    this._mapWindow.refresh();
    const cmds = this._mapWindow._list || [];
    const mapIdx = cmds.findIndex(c => String(c.ext) === String(mapId));
    if (mapIdx >= 0) {
        // 该图还有建言：保持在右栏，光标夹紧
        this._mapWindow.select(mapIdx);   // select 会经 _listWindow.setMap 重建列表
        win.select(Math.min(Math.max(win.index(), 0), win.maxItems() - 1));
        win.activate();
    } else if (this._mapWindow.maxItems() > 0) {
        // 该图已空：回到地图选择
        win.deselect();
        win.deactivate();
        this._mapWindow.select(Math.min(Math.max(this._mapWindow.index(), 0), this._mapWindow.maxItems() - 1));
        this._mapWindow.activate();
        this._helpWindow.setText(AM.ui("historyHint", "Choose a location"));
    } else {
        // 一条建言都不剩
        win.setMap(null);
        win.deactivate();
        this._mapWindow.deselect();
        this._mapWindow.activate();
        this._helpWindow.setText(AM.ui("historyEmpty", "No messages yet"));
    }
};

Scene_AnsuzHistory.prototype.onListCancel = function() {
    // 确认态下取消键/右键：先收起确认，不退回地图选择
    if (this._listWindow.isConfirming()) {
        this._listWindow.clearConfirm();
        this._listWindow.activate();
        return;
    }
    this._listWindow.deselect();
    this._listWindow.deactivate();
    this._mapWindow.activate();
    this._helpWindow.setText(AM.ui("historyHint", "Choose a location"));
};

Scene_AnsuzHistory.prototype.update = function() {
    Scene_MenuBase.prototype.update.call(this);
    AM._updateHeaderTabs(this);
};

// 从历史页真正离场（回地图/菜单）时补发 open() 的回调；切回书写页不触发
Scene_AnsuzHistory.prototype.terminate = function() {
    Scene_MenuBase.prototype.terminate.call(this);
    AM._flushResultCallback();
};

})();
