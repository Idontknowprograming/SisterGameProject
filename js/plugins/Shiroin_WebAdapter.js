/*:
 * @target MZ
 * @plugindesc v1.0 网页版专属适配集合：全屏API修复 + 标题正版验证门禁。NW.js/安卓自动跳过。
 * @author Shiroin
 *
 * @help
 * 本插件只在【网页版】生效，判定条件：
 *   !Utils.isNwjs() && !window.cordova && !window.AndroidSave
 * NW.js 本地版和安卓版加载本插件时直接 return，不应用任何改动。
 *
 * ── 功能 1：全屏 API 现代化（原 Shiroin_WebFullscreenFix，已并入） ──
 * MZ 核心的 Graphics._isFullScreen/_requestFullScreen/_cancelFullScreen
 * 使用上古前缀 API。Firefox 在非全屏时调 exitFullscreen() 会返回 rejected
 * Promise（TypeError: Not in fullscreen mode），配合 Fullscreen_Options.js
 * 在 Scene_Title.start 的无条件调用，导致 Firefox 玩家一进标题就弹 Error。
 * 此处改用标准 API + 状态守卫 + 吞掉两个方向的 Promise 拒绝。
 *
 * ── 功能 2：标题正版验证门禁 ──
 * 进入标题后，若玩家未登录或未验证游戏所有权：
 *   - 立即弹 confirm 提示需要登录验证；
 *   - OK → 进入 Scene_PatreonVerify（登录/验证界面）；
 *   - 取消 → 停留在标题，但任何点击/确认键都会重新弹 confirm；
 *   - 登录且验证所有权成功后恢复正常。
 * 所有权判定口径与 2den1580_PatreonVerify.js 的 _isSponsor 一致：
 *   已登录(playerId) 且 ( subscribed || specialRoles 含 'discord'、'itch.io' 或 'ImoutoFavorite' )
 * 需要调整口径时改下方 hasOwnership()。
 *
 * 加载顺序：插件列表末尾（Shiroin_OffscreenSpriteCull 之前），
 * 需要晚于 Drill_TitleScene / Fullscreen_Options / 2den1580_PatreonVerify。
 */
(() => {
    "use strict";

    // ====== 网页版判定：NW.js / 安卓(cordova 或原生桥) 一律不生效 ======
    if (Utils.isNwjs() || window.cordova || window.AndroidSave) return;

    //=========================================================================
    // 功能 1：全屏 API 现代化
    //=========================================================================
    const fullscreenElement = () =>
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        null;

    const swallow = p => {
        if (p && typeof p.catch === "function") p.catch(() => {});
    };

    Graphics._isFullScreen = function() {
        return !!fullscreenElement();
    };

    Graphics._requestFullScreen = function() {
        if (fullscreenElement()) return;
        const el = document.body;
        try {
            if (el.requestFullscreen) {
                swallow(el.requestFullscreen());
            } else if (el.webkitRequestFullScreen) {
                swallow(el.webkitRequestFullScreen());
            } else if (el.mozRequestFullScreen) {
                swallow(el.mozRequestFullScreen());
            }
        } catch (e) { /* 全屏不可用（如 iOS Safari）时静默 */ }
    };

    Graphics._cancelFullScreen = function() {
        if (!fullscreenElement()) return;
        try {
            if (document.exitFullscreen) {
                swallow(document.exitFullscreen());
            } else if (document.webkitCancelFullScreen) {
                swallow(document.webkitCancelFullScreen());
            } else if (document.mozCancelFullScreen) {
                swallow(document.mozCancelFullScreen());
            }
        } catch (e) { /* 同上 */ }
    };

    //=========================================================================
    // 功能 2：标题正版验证门禁
    //=========================================================================
    const AUTH_STORAGE_KEY = "gm_patreon_verify"; // 与 2den1580_PatreonVerify.js 保持一致

    function readAuth() {
        try {
            const raw = localStorage.getItem(AUTH_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    // 本地所有权判定（口径 = 2den1580 的 _isSponsor 为真）：要收紧/放宽改这里
    function localOwnership() {
        const c = readAuth();
        if (!c || !c.playerId) return false;
        const roles = Array.isArray(c.specialRoles) ? c.specialRoles : [];
        return !!(
            c.subscribed ||
            roles.includes("discord") ||
            roles.includes("itch.io") ||
            roles.includes("ImoutoFavorite")
        );
    }

    // ── 服务端校验（防伪造 localStorage）────────────────────────────────
    // 拿缓存里的 playerId+deviceId 问服务器（patreon_subs 只读比对），
    // 库里查无此会话一律视为未验证——控制台伪造的缓存到这一步就失效了。
    const VALIDATE_URL = "https://nlch.io/api/itch/auth/validate";
    // 过渡开关：校验端点尚未部署（HTTP 404）时暂时放行本地判定。
    // /auth/validate 已于 2026-07-12 部署上线，此开关已关死。
    const ALLOW_WHEN_ENDPOINT_MISSING = false;
    const VALIDATE_TIMEOUT_MS = 8000;

    let serverVerdict = null; // null=校验中(拦输入但不弹窗), true=通过, false=否决

    function startServerValidation() {
        const c = readAuth();
        if (!c || !c.playerId || !c.device_id) {
            // 缺 device_id 的缓存不可能是正常登录产生的（伪造或损坏）：清掉并立刻提示
            serverVerdict = false;
            try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch (e) {}
            setTimeout(() => {
                if (SceneManager._scene instanceof Scene_Title) promptGate();
            }, 0);
            return;
        }
        serverVerdict = null;
        let settled = false;
        const settle = v => {
            if (settled) return;
            settled = true;
            serverVerdict = v;
            if (v === false) {
                // 无效会话：清掉本地缓存（伪造的、或已被服务端注销的）
                try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch (e) {}
                // 玩家正停在标题时立刻提示
                if (SceneManager._scene instanceof Scene_Title) promptGate();
            }
        };
        setTimeout(() => settle(false), VALIDATE_TIMEOUT_MS); // 超时/请求被掐断按不通过处理
        const q = VALIDATE_URL +
            "?player_id=" + encodeURIComponent(c.playerId) +
            "&device_id=" + encodeURIComponent(c.device_id);
        fetch(q).then(r => {
            if (r.status === 404 && ALLOW_WHEN_ENDPOINT_MISSING) return { ok: true, valid: true, eligible: true };
            return r.json();
        }).then(res => {
            settle(!!(res && res.ok && res.valid && res.eligible));
        }).catch(() => settle(false));
    }

    // 门禁是否拦输入：本地无凭证 → 拦；服务端否决/校验中 → 拦
    function gateActive() {
        if (!localOwnership()) return true;
        return serverVerdict !== true;
    }
    // 是否弹 confirm：校验中不弹（通常<1秒），避免正常玩家看到误弹窗
    function gateShouldPrompt() {
        if (!localOwnership()) return true;
        return serverVerdict === false;
    }

    function confirmText() {
        let t = "This is a paid game. Please log in and verify game ownership to continue.\n" +
                "OK: open the verification screen / Cancel: stay on title";
        try {
            if (ConfigManager.language === 0) {
                t = "本游戏为付费版本，需要先登录并验证游戏所有权才能继续游玩。\n" +
                    "「确定」前往登录验证界面 /「取消」留在标题画面";
            } else if (ConfigManager.language === 1) {
                t = "このゲームは有料版です。続けるにはログインして所有権の認証が必要です。\n" +
                    "「OK」で認証画面へ /「キャンセル」でタイトルに留まる";
            }
        } catch (e) {}
        return t;
    }

    let gateBusy = false; // confirm 弹出期间防重入

    function promptGate() {
        if (gateBusy) return;
        gateBusy = true;
        const ok = window.confirm(confirmText());
        // confirm 阻塞期间积累的输入全部丢弃，防止穿透触发标题按钮
        TouchInput.clear();
        Input.clear();
        gateBusy = false;
        if (ok && window.Scene_PatreonVerify) {
            SceneManager.snapForBackground(); // 给 Scene_MenuBase 一张标题截图当背景
            SceneManager.push(window.Scene_PatreonVerify);
        }
    }

    const _ST_start = Scene_Title.prototype.start;
    Scene_Title.prototype.start = function() {
        _ST_start.call(this);
        if (localOwnership()) {
            // 有本地凭证：每次进标题都重新向服务器核验
            startServerValidation();
        } else {
            // 没有登录缓存：直接弹（推迟到本帧结束，避免阻塞场景切换）
            const self = this;
            setTimeout(() => {
                if (SceneManager._scene === self && gateShouldPrompt()) promptGate();
            }, 0);
        }
    };

    const _ST_update = Scene_Title.prototype.update;
    Scene_Title.prototype.update = function() {
        if (gateActive()) {
            // 任何点击/确认/取消操作都拦下；校验期间静默吞掉，否决后重新弹窗
            if (TouchInput.isTriggered() || TouchInput.isCancelled() ||
                Input.isTriggered("ok") || Input.isTriggered("cancel")) {
                TouchInput.clear();
                Input.clear();
                if (gateShouldPrompt()) promptGate();
                return; // 本帧不再执行标题逻辑
            }
        }
        _ST_update.call(this);
    };
})();
