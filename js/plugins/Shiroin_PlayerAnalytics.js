/*:
 * @target MZ
 * @plugindesc 轻量玩家趋势统计：每日活跃、版本与分布；测试模式不上传。
 * @author Shiroin
 * @help
 * 附加到已有的自动更新 GET 请求，无独立请求或轮询。登录后关联本机匿名记录。
 * 只发送随机客户端标识、身份阶段标识、可选 playerId、完整版本、平台、语言、登录／正版验证状态和每日游玩秒数。
 * 不发送存档、账号凭证、头像或昵称；失败静默，不影响更新和登录。
 */
(() => {
    'use strict';
    const KEY = 'usuimoPlayerAnalyticsV1';
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const LANGUAGES = ['CN','JP','EN','RU','FR','VN','ES','PTBR','KR','ID','TH','UA','TW','IT'];
    function uuid() {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
        const h = Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
        return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
    }
    function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
    function day() { return new Date(Date.now() + 9*3600000).toISOString().slice(0,10); }
    function playerId() {
        const id = String(read('gm_patreon_verify')?.playerId || '').trim();
        return /^\d{1,30}$/.test(id) ? id : null;
    }
    function platform() {
        if (window.cordova?.platformId === 'android' || /Android/i.test(navigator.userAgent)) return 'android';
        if (window.cordova?.platformId === 'ios' || /iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'ios';
        if (Utils.isNwjs()) {
            const p = typeof process !== 'undefined' ? process.platform : require('process').platform;
            return ({win32:'windows',darwin:'macos',linux:'linux'})[p] || 'unknown';
        }
        return 'web';
    }
    function save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }
    function licenseState() {
        try {
            if (typeof window.chahuiUtil?.checkLegitimatePlayer !== 'function') return 'unknown';
            return window.chahuiUtil.checkLegitimatePlayer() ? 'verified' : 'unverified';
        } catch { return 'unknown'; }
    }
    function identity() {
        let s = read(KEY);
        if (!s || !UUID.test(s.clientId) || !UUID.test(s.segmentId)) {
            s = {clientId:uuid(),segmentId:uuid(),playerId:null};
        }
        const pid = playerId();
        if (s.playerId !== pid) {
            // Keep the anonymous stage on first login. Logout/account switch begins a new stage.
            if (s.playerId) s.segmentId = uuid();
            s.playerId = pid; s.sent = ''; s.retryAfter = 0;
        }
        save(s); // If persistence is unavailable, do not generate/upload a new identity every run.
        return s;
    }
    function prepareActivity(url) {
        if (ConfigManager.disableNetwork || Utils.isOptionValid('test') || Utils.isOptionValid('btest') || Utils.isOptionValid('etest')) return {url};
        const version = String(window.$dataSystem?.gameVersion || '').trim();
        if (!/^\d{1,4}\.\d{1,4}(?:\.\d{1,4}){0,2}[A-Za-z]?$/.test(version)) return {url};
        const s = identity();
        const body = {clientId:s.clientId,segmentId:s.segmentId,playerId:s.playerId,
            version,platform:platform(),
            loginState:s.playerId ? 'logged_in' : 'logged_out',licenseState:licenseState(),
            language:LANGUAGES[ConfigManager.language === 0 && ConfigManager.needsTC ? 12 : ConfigManager.language] || 'unknown'};
        const playtime = window.ShiroinPlaytime?.snapshot(s.playtimeCursor || 0);
        if (playtime) body.playtime = playtime;
        const signature = JSON.stringify([playtime,day(),s.segmentId,s.playerId,body.version,body.platform,body.language,body.loginState,body.licenseState]);
        if (s.sent === signature || Number(s.retryAfter) > Date.now()) return {url};
        const requestUrl = url + (url.includes('?') ? '&' : '?') + '_pa=' + encodeURIComponent(JSON.stringify(body));
        s.attempt = signature;
        s.retryAfter = Date.now() + 30*60*1000; save(s);
        return {url:requestUrl,signature,segmentId:s.segmentId,playerId:s.playerId,hasPlaytime:!!playtime};
    }
    function prepare(url) {
        // Storage/identity failures must never stop the original update request.
        try { return prepareActivity(url); } catch { return {url}; }
    }
    function complete(ticket,result) {
        try {
            if (!ticket?.signature || result?.playerAnalytics?.accepted !== true || result.playerAnalytics.schemaVersion !== 1) return;
            const current = read(KEY);
            // Ignore old responses after a login, account switch or newer attempt.
            if (current?.segmentId !== ticket.segmentId || current.playerId !== ticket.playerId || current.attempt !== ticket.signature) return;
            current.sent = ticket.signature; current.retryAfter = 0;
            if (ticket.hasPlaytime) current.playtimeCursor = (current.playtimeCursor || 0) + 2;
            save(current);
        } catch { /* Statistics must not interrupt update processing. */ }
    }
    function identityChanged() {
        // Prepare the next normal update check; login/logout never sends a request.
        try { identity(); } catch { return; }
    }
    window.ShiroinPlayerAnalytics = {prepare, complete, identityChanged};
})();
