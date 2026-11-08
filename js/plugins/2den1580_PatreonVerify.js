/*:
 * @plugindesc Patreon Verify for RPG Maker MV (UI improved)
 * @author 2den1580
 *
 * @help
 * - Shows avatar + name/ID + sponsor status after login
 * - Verify button switches to Logout immediately after successful login
 */

(() => {
  'use strict';

  const GAS_BASE = appScript;
  const PATREON_OAUTH_BASE = 'https://nlch.io/api/patreon';
  const AUTH_STORAGE_KEY = 'gm_patreon_verify';
  const POLL_INTERVAL_MS = 1000;
  const POLL_TIMEOUT_MS = 60000;
  const ITCH_LOGO_NAME = 'Itch';
  const ITCH_LOGO_HOVER_NAME = 'Itch_hover';
  const PATREON_LOGO_NAME = 'Patreon';
  const PATREON_LOGO_HOVER_NAME = 'Patreon_hover';
  const DISCORD_LOGO_NAME = 'discord';
  const DISCORD_LOGO_HOVER_NAME = 'discord_hover';
  const ITCH_WORKER_BASE = 'https://nlch.io/api/itch';
  const DISCORD_WORKER_BASE = 'https://discordoauth.shiroin.workers.dev';
  const ITCH_RESULT_URLS = [
    `${ITCH_WORKER_BASE}/oauth/itch/result`
  ];

  const CFG = {
    avatarRatio: 0.20,
    button: { wFactor: 0.50, h: 64, fontSize: 32 },
    titleY: 0.3,
    avatarY: 0.06,
    nameYGap: 16,
    infoYGap: 38,
  };
  // ---- UI scale (MV default: 816x624) ----
  const BASE_W = 1920;
  const BASE_H = 1080;
  const getUiScale = () => {
	  const w = (Graphics.boxWidth || Graphics.width || 1920);
	  const h = (Graphics.boxHeight || Graphics.height || 1080);
	  return Math.min(w / BASE_W, h / BASE_H, 2.20);
  };

  const fs = (n) => Math.max(12, Math.round(n * getUiScale())); // font size
  const vh = (n) => Math.max(24, Math.round(n * getUiScale())); // bitmap/button height
  // ====== auth storage (same style as Drive plugin) ======
  const auth = {
    set(data) {
      try {
        const previous = localStorage.getItem(AUTH_STORAGE_KEY);
        let oldPid = '';
        try { oldPid = previous ? String((JSON.parse(previous) || {}).playerId || '').trim() : ''; }
        catch (e) {}
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
        const newPid = String((data || {}).playerId || '').trim();
        if (newPid !== oldPid) window.ShiroinPlayerAnalytics?.identityChanged();
        if (!/^\d+$/.test(oldPid) && /^\d+$/.test(newPid)) {
          window.ShiroinCloudSave?.notifyLoginSuccess?.(newPid);
        }
        // 新安装时公共建言批次可能早于登录完成；首次登录或切换账号后
        // 立即恢复该账号的服务器建言历史，不再等待下一轮批次同步。
        if (/^\d+$/.test(newPid) && newPid !== oldPid) {
          window.QJ?.AnsuzMsg?.syncMine?.();
        }
      }
      catch (e) { console.error(e); }
    },
    get() {
      try {
        const data = localStorage.getItem(AUTH_STORAGE_KEY);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    del() {
      try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch (e) {}
      window.ShiroinPlayerAnalytics?.identityChanged();
    }
  };

  // ====== http wrapper ======
  const httpSend = (() => {
    const send = ({ url, method = 'GET' }) =>
      new Promise((resolve, reject) => {
        if (typeof httpRequest === 'function') {
          httpRequest(url, { method, responseType: 'json' }).then(resolve).catch(reject);
        } else {
          fetch(url, { method, cache: 'no-store' })
            .then(r => r.json())
            .then(resolve)
            .catch(reject);
        }
      });
    return { getJson: (url) => send({ url, method: 'GET' }) };
  })();

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function tryGetJson(url) {
    try {
      return await httpSend.getJson(url);
    } catch (e) {
      console.warn('[PatreonVerify] request failed:', url, e);
      return null;
    }
  }

  function loadLocalization(tag) { 
    if (window?.systemFeatureText?.memberMenu?.[String(tag)])  {
        let textArray = window.systemFeatureText.memberMenu[String(tag)];
        let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
        return String(text);
    }
    return String(tag); 
  }

  // ====== UI helpers (ported from Drive plugin style) ======
const drawCircleBitmap = (size, bgColor, imageUrl, onReady) => {
    const bmp = new Bitmap(size, size);
    const ctx = bmp._context;
    ctx.clearRect(0, 0, size, size);

    // 背景圆
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = bgColor || '#555';
    ctx.fill();
    ctx.restore();

    // 兜底默认头像
    const defBmp = ImageManager.loadBitmap('img/system/', 'PFP_default', 0, true);

    // 如果传进来本来就是 Bitmap就走原来的 bitmap 分支
    if (imageUrl && typeof imageUrl === 'object' && imageUrl.isReady) {
      const srcBmp = imageUrl;
      const tryDraw = () => {
        if (!srcBmp.isReady()) return false;
        // MZ：从文件加载的 Bitmap 数据在 _image，_canvas 懒创建可能为 null；两者都可作为 drawImage 源
        const src = srcBmp._canvas || srcBmp._image;
        if (!src) return false;

        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(src, 0, 0, srcBmp.width, srcBmp.height, 0, 0, size, size);
        ctx.restore();

        bmp._baseTexture.update();
        onReady && onReady(bmp);
        return true;
      };

      if (!tryDraw()) srcBmp.addLoadListener(() => tryDraw());
      return bmp;
    }

    // 传入为空：直接用默认头像
    if (!imageUrl) {
      drawCircleBitmap(size, bgColor, defBmp, onReady);
      return bmp;
    }

    // 传入 string：远程 URL
    const img = new Image();

    // Helper function for final rendering
    const finalizeDraw = (loadedImg) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const aspect = loadedImg.width / loadedImg.height;
      let sx = 0, sy = 0, sw = loadedImg.width, sh = loadedImg.height;
      if (aspect > 1) { sw = loadedImg.height; sx = Math.floor((loadedImg.width - loadedImg.height) / 2); }
      else if (aspect < 1) { sh = loadedImg.width; sy = Math.floor((loadedImg.height - loadedImg.width) / 2); }

      ctx.drawImage(loadedImg, sx, sy, sw, sh, 0, 0, size, size);
      ctx.restore();

      bmp._baseTexture.update();
      onReady && onReady(bmp);
    };

    img.onerror = () => {
      // 无论什么原因失败：回退到默认头像
      drawCircleBitmap(size, bgColor, defBmp, onReady);
    };

    // --- METHOD FOR PHONE (Cordova) ---
    const isCordova = !!(window.cordova && cordova.plugin && cordova.plugin.http);
    const isRemote = typeof imageUrl === 'string' && imageUrl.startsWith('http');

    if (isCordova && isRemote) {
      // Uses advanced-http to get an image as a Blob (bypassing CORS)
      cordova.plugin.http.sendRequest(imageUrl, {
        method: 'get',
        responseType: 'blob',
        timeout: 15000
      }, (response) => {
        // A local link to the downloaded data is being created
        const blobUrl = URL.createObjectURL(response.data);
        img.onload = () => {
          finalizeDraw(img);
          URL.revokeObjectURL(blobUrl);
        };
        img.src = blobUrl;
      }, (err) => {
        console.error("Cordova download error:", err);
        drawCircleBitmap(size, bgColor, defBmp, onReady);
      });
    } else {
      // --- STANDARD METHOD FOR PC / WEB ---
      img.crossOrigin = 'anonymous';
      img.onload = () => finalizeDraw(img);
      let finalUrl = String(imageUrl);
      // 网页版：第三方头像 CDN（Patreon/itch）的 CORS 只认自家域名，
      // 直连会被浏览器拦截，改走 nlch.io 网关的 /api/avatar 代理
      if (!Utils.isNwjs() && isRemote && !finalUrl.startsWith('https://nlch.io/')) {
        finalUrl = 'https://nlch.io/api/avatar?url=' + encodeURIComponent(finalUrl);
      }
      img.src = finalUrl;
    }

    return bmp;
};

  const makeButtonBitmap = (label, w, h, fontSize) => {
    const BW = Math.max(64, w | 0), BH = Math.max(32, h | 0);
    const bmp = new Bitmap(BW, BH);
    const ctx = bmp._context;
    const r = Math.min(12, Math.floor(BH / 2));

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(BW, 0, BW, r, r);
    ctx.arcTo(BW, BH, BW - r, BH, r);
    ctx.arcTo(0, BH, 0, BH - r, r);
    ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath();
    ctx.fillStyle = '#2a2a2a';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = `${fontSize || 20}px ${DrillUp.g_DFF_fontFace}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, BW / 2, BH / 2);
    ctx.restore();

    bmp._baseTexture.update();
    return bmp;
  };

  // ====== Normalize GAS response => cache ======
  function normalizeResultToCache(res) {
    // 兼容 res.user 可能是 string / object
    let userName = '';
    let playerId = '';
    let avatarUrl = '';

    const u = res ? res.user : null;
    if (u && typeof u === 'object') {
      userName = String(u.full_name || u.name || u.display_name || u.username || '');
      playerId = String(u.playerId || '');
      avatarUrl = String(u.avatar ||'');
    } else if (typeof u === 'string') {
      userName = u;
    }

    // 有些后端可能直接放在 res 里
    if (!playerId) playerId = String(res.playerId || '');
    if (!userName) userName = String(res.user_name || res.name || '');
    if (!avatarUrl) avatarUrl = String(res.avatar || res.avatar_url || res.picture || '');
    return {
      ts: Date.now(),
      subscribed: !!res.subscribed,
      device_id: res.device_id || '',
      specialRoles: Array.isArray(res.specialRoles) ? res.specialRoles : [],
      userName,
      playerId,
      avatarUrl,
      rawUser: res.user || null,
      accountUid: String(res.accountUid || res.account_uid || ''),
      discordUserId: String(res.discordUserId || res.discord_user_id || ''),
      itchUserId: String(res.itchUserId || res.itch_user_id || ''),
      linkedProviders: Array.isArray(res.linkedProviders)
        ? res.linkedProviders.slice()
        : (Array.isArray(res.linked_providers) ? res.linked_providers.slice() : []),
    };
  }

  const PROVIDER_ORDER = ['patreon', 'discord', 'itch.io'];

  function normalizeRoleList_(value) {
    if (!value) return new Set();
    if (Array.isArray(value)) {
      return new Set(value.map((item) => String(item).trim()).filter(Boolean));
    }
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return new Set();
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return new Set(parsed.map((item) => String(item).trim()).filter(Boolean));
        }
      } catch (_) {
        return new Set(text.split(',').map((item) => item.trim()).filter(Boolean));
      }
    }
    return new Set();
  }

  function normalizeProviderName_(provider) {
    const name = String(provider || '').trim().toLowerCase();
    if (name === 'patreon') return 'patreon';
    if (name === 'discord') return 'discord';
    if (name === 'itch' || name === 'itch.io') return 'itch.io';
    return '';
  }

  function addLinkedProvider_(cache, provider) {
    if (!cache) return;
    const normalized = normalizeProviderName_(provider);
    if (!normalized) return;
    const providers = Array.isArray(cache.linkedProviders)
      ? cache.linkedProviders.map(normalizeProviderName_).filter(Boolean)
      : [];
    if (!providers.includes(normalized)) providers.push(normalized);
    cache.linkedProviders = providers;
  }

  // linkedProviders 与专用身份字段表示真实绑定；verified_group /
  // subscribed 只表示当前或历史资格，不能作为平台身份的替代证明。
  function getLinkedProviders_(cache) {
    if (!cache) return [];
    const providers = new Set();
    const saved = Array.isArray(cache.linkedProviders) ? cache.linkedProviders : [];
    for (const provider of saved) {
      const normalized = normalizeProviderName_(provider);
      if (normalized) providers.add(normalized);
    }

    if (cache.itchUserId || cache.itch_user_id) providers.add('itch.io');
    if (cache.discordUserId || cache.discord_user_id) providers.add('discord');

    // Worker 返回的 D1 uID 本身也能辨识原生账号来源：
    // discord:<id> / itch:<id>；无前缀的数字 ID 为 Patreon。
    const accountUid = String(cache.accountUid || cache.account_uid || '').trim();
    if (/^discord:\d+$/i.test(accountUid)) providers.add('discord');
    else if (/^itch:\d+$/i.test(accountUid)) providers.add('itch.io');
    else if (/^\d+$/.test(accountUid)) providers.add('patreon');

    return PROVIDER_ORDER.filter((provider) => providers.has(provider));
  }

  function openAuthUrlExternal(url, fallbackStyle, scene) {
    // 只做最小清理：去掉首尾空白、把非法空格变成 %20
    let authUrl = String(url || '').trim();
    authUrl = authUrl.replace(/ /g, '%20');
    // console.log('[PatreonVerify] open authUrl=', authUrl);

    // 点击瞬间预开的空白窗口（网页版防弹窗拦截），取出即清空
    const preopened = scene ? (scene._preopenedPopup || null) : null;
    if (scene) scene._preopenedPopup = null;
    const closePreopened = () => {
      try { if (preopened && !preopened.closed) preopened.close(); } catch (e) {}
    };

    // ① 安卓 App（cordova）：系统浏览器打开
    if (window.cordova && window.cordova.InAppBrowser) {
      closePreopened();
      window.cordova.InAppBrowser.open(authUrl, "_system");
      return null;
    }

    // ② NW.js 本地版：交给系统默认浏览器
    if (Utils.isNwjs()) {
      closePreopened();
      try { nw.Shell.openExternal(authUrl); } catch (e) {}
      return null;
    }

    // ③ 网页版（桌面/手机浏览器）：优先用预开窗口定向，绕过弹窗拦截
    if (preopened && !preopened.closed) {
      try {
        preopened.location.href = authUrl;
        return preopened;
      } catch (e) {}
    }
    const w = window.open(authUrl, "_blank", fallbackStyle);
    if (!w && scene && typeof scene._setHint === 'function') {
      let tip = 'The browser blocked the login window. Please allow pop-ups for this site and retry.';
      if (ConfigManager.language === 0) tip = '浏览器拦截了登录窗口，请允许本站弹窗后重试。';
      if (ConfigManager.language === 1) tip = 'ブラウザがログインウィンドウをブロックしました。ポップアップを許可して再試行してください。';
      scene._setHint(tip);
    }
    return w;
  }

  // 网页版：在用户点击时预开空白窗口，避免异步请求结束后被浏览器拦截。
  function preopenPopupForWeb(scene) {
    if (Utils.isNwjs() || window.cordova) return;
    try {
      const w = window.open('', '_blank');
      if (w && w.document) {
        w.document.write('<p style="font-family:sans-serif;margin:2em">Loading login page...</p>');
      }
      scene._preopenedPopup = w;
    } catch (e) { scene._preopenedPopup = null; }
  }

  // 流程失败时收掉尚未定向的预开窗口，避免留下孤儿标签页
  function closePreopenedPopup(scene) {
    try { if (scene._preopenedPopup && !scene._preopenedPopup.closed) scene._preopenedPopup.close(); } catch (e) {}
    scene._preopenedPopup = null;
  }

  async function startVerifyFlowInteractive(scene) {
    scene._setHint(loadLocalization('RequestingLogin'));
    const start = await httpSend.getJson(`${PATREON_OAUTH_BASE}/oauth/patreon/start`);
    if (!start || !start.ok || !start.authorize_url || !start.session) {
      throw new Error('start_failed: ' + JSON.stringify(start));
    }

    const session = String(start.session);
    scene._setHint(loadLocalization('openingWindow'));

    let popup = openAuthUrlExternal(start.authorize_url, scene._authWindowStyle, scene);
    scene._popupWindow = popup;

    const startedAt = Date.now();

    // 可选优化：记录 popup 关闭时刻，给 callback/KV 收尾一点时间
    let popupClosedAt = 0;
    const POPUP_CLOSE_GRACE_MS = 10000; // 10秒宽限，可按需调小/调大

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      // 不要在 popup.closed 的瞬间立刻判定取消（避免 callback 已完成但轮询尚未拿到）
      if (popup && popup.closed) {
        if (!popupClosedAt) popupClosedAt = Date.now();

        // 宽限期到了还没结果，才当作取消
        if (Date.now() - popupClosedAt > POPUP_CLOSE_GRACE_MS) {
          scene._setButtonLabelByKind('majorUpdate', loadLocalization('CheckUpdates'));
          throw new Error('verify_canceled');
        }
      }

      const res = await httpSend.getJson(
        `${PATREON_OAUTH_BASE}/oauth/patreon/result?session=${encodeURIComponent(session)}`
      );

      // console.log('[PatreonVerify] poll result:', res);

      if (res && res.ok && !res.pending) {
        const cache = normalizeResultToCache(res);
        addLinkedProvider_(cache, 'patreon');
        auth.set(cache);

        // 关闭 popup（如果还开着）
        try {
          if (popup && !popup.closed) {
            setTimeout(() => {
              try { if (popup && !popup.closed) popup.close(); } catch (e) {}
            }, 1500);
          }
        } catch (e) {}

        return { res, cache };
      }

      // 如果 result 接口明确返回失败，也立即抛错（方便显示具体错误）
      if (res && res.ok === false && !res.pending) {
        const errMsg = res.error || 'verify_failed';
        throw new Error(errMsg);
      }

      scene._setHint(loadLocalization('waitingLogin'));
      await sleep(POLL_INTERVAL_MS);
    }

    throw new Error('verify_timeout');
  }

  async function startItchVerifyFlowInteractive(scene) {
    scene._setHint(loadLocalization('RequestingLogin'));

    // 1) 调 Worker 的 /oauth/itch/start（不再用 ?mode=xxx）
    const cached = auth.get() || {};
    const playerId = String(cached.playerId || cached.player_id || '').trim();
    const deviceId = String(cached.device_id || '').trim();
    if (!/^\d+$/.test(playerId) || !deviceId) {
       // 没有完整的已登录会话记录
       let text = "Login credentials are incomplete!\nPlease log out and sign in again before retrying verification.";
       if (ConfigManager.language === 0) text = "登录凭证不完整！请主动注销并重新登录后再尝试验证！";
       if (ConfigManager.language === 1) text = "ログイン情報が不完全です！\n一度ログアウトして再ログインした後、もう一度認証をお試しください。";
       alert(text, { align: "left" });       
       return;
    }
    const startUrl = `${ITCH_WORKER_BASE}/oauth/itch/start` +
      `?player_id=${encodeURIComponent(playerId)}` +
      `&device_id=${encodeURIComponent(deviceId)}`;
    const start = await tryGetJson(startUrl);
    if (!start || !start.ok || !start.authorize_url || !start.session) {
      throw new Error(start?.error || 'itch_start_failed_or_endpoint_unavailable');
    }

    const session = String(start.session);
    scene._setHint(loadLocalization('openingWindow'));
    const popup = openAuthUrlExternal(start.authorize_url, scene._authWindowStyle, scene);
    scene._popupWindow = popup;

    const startedAt = Date.now();
    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      if (popup && popup.closed) throw new Error('itch_verify_canceled');

      // 2) 轮询 Worker 的 /oauth/itch/result?session=...
      let res = null;
      for (const baseUrl of ITCH_RESULT_URLS) {
        const url = `${baseUrl}?session=${encodeURIComponent(session)}`;
        const probe = await tryGetJson(url);

        // pending=false 的失败结果也必须进入处理，避免安全拒绝被误表现为超时。
        if (probe && (probe.pending === true || probe.pending === false)) {
          res = probe;
          break;
        }
      }

      if (res && !res.pending) {
        if (res.ok === false) {
          throw new Error(res.error || 'itch_verify_failed');
        }

        const cached = auth.get() || {};
        // 服务端可能把旧 playerId 重定向/合并到主账号：以返回值为准更新本地缓存
        const canonicalPid = String(res.player_id ?? '').trim();
        if (/^\d+$/.test(canonicalPid) && canonicalPid !== String(cached.playerId || '')) {
          cached.playerId = canonicalPid;
        }
        if (res.is_itch_player) {
          cached.isItchPlayer = true;
          if (res.device_id) cached.device_id = String(res.device_id);
          if (typeof res.subscribed === 'boolean') cached.subscribed = res.subscribed;
          if (typeof res.accountUid === 'string' || typeof res.account_uid === 'string') {
            cached.accountUid = String(res.accountUid || res.account_uid || '');
          }
          if (typeof res.discordUserId === 'string' ||
              typeof res.discord_user_id === 'string') {
            cached.discordUserId = String(
              res.discordUserId || res.discord_user_id || ''
            );
          }
          if (typeof res.itchUserId === 'string' ||
              typeof res.itch_user_id === 'string') {
            cached.itchUserId = String(res.itchUserId || res.itch_user_id || '');
          }

          if (Array.isArray(res.specialRoles)) {
            cached.specialRoles = res.specialRoles.slice();
          } else {
            const roles = Array.isArray(cached.specialRoles)
              ? cached.specialRoles.slice()
              : [];
            if (!roles.includes('itch.io')) roles.push('itch.io');
            cached.specialRoles = roles;
          }

          const returnedProviders = Array.isArray(res.linkedProviders)
            ? res.linkedProviders
            : (Array.isArray(res.linked_providers) ? res.linked_providers : null);
          if (returnedProviders) {
            const providerSet = new Set(
              returnedProviders
                .map(normalizeProviderName_)
                .filter(Boolean)
            );
            cached.linkedProviders = PROVIDER_ORDER
              .filter(provider => providerSet.has(provider));
          } else {
            addLinkedProvider_(cached, 'itch.io');
          }
        } else {
          // itch验证未通过
           let text = window?.systemFeatureText?.memberMenu?.nonItchUser || 'nonItchUser';
           alert(text, { align: "left" });         
        }
        cached.ts = Date.now();
        auth.set(cached);
        return { res, cache: cached };
      }

      scene._setHint(loadLocalization('waitingLogin'));
      await sleep(POLL_INTERVAL_MS);
    }

    throw new Error('itch_verify_timeout');
  }

  // itch.io 直接登录（无需已有 playerId，由 Worker 在 D1 中 find-or-create 账号）
  async function startItchLoginFlowInteractive(scene) {
    scene._setHint(loadLocalization('RequestingLogin'));

    const start = await tryGetJson(`${ITCH_WORKER_BASE}/oauth/itch/start?mode=login`);
    if (!start || !start.ok || !start.authorize_url || !start.session) {
      throw new Error('itch_login_start_failed: ' + JSON.stringify(start));
    }

    const session = String(start.session);
    scene._setHint(loadLocalization('openingWindowItch'));
    const popup = openAuthUrlExternal(start.authorize_url, scene._authWindowStyle, scene);
    scene._popupWindow = popup;

    const startedAt = Date.now();
    let popupClosedAt = 0;
    const POPUP_CLOSE_GRACE_MS = 10000;

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      if (popup && popup.closed) {
        if (!popupClosedAt) popupClosedAt = Date.now();
        if (Date.now() - popupClosedAt > POPUP_CLOSE_GRACE_MS) {
          throw new Error('itch_login_canceled');
        }
      }

      const res = await tryGetJson(
        `${ITCH_WORKER_BASE}/oauth/itch/result?session=${encodeURIComponent(session)}`
      );

      if (res && res.ok && !res.pending) {
        const cache = normalizeResultToCache(res);
        addLinkedProvider_(cache, 'itch.io');
        // 通过 itch 登录：Worker 若确认拥有本游戏则补上 itch.io 身份
        if (res.is_itch_player) {
          cache.isItchPlayer = true;
          if (!cache.specialRoles.includes('itch.io')) cache.specialRoles.push('itch.io');
        } else if (res.is_itch_player === false && !cache.specialRoles.includes('itch.io')) {
          // 登录成功但 itch 库中没有本游戏：账号照常生成，提示无法获得 itch 玩家身份
          const text = window?.systemFeatureText?.memberMenu?.nonItchUser || 'nonItchUser';
          alert(text, { align: 'left' });
        }
        auth.set(cache);

        try {
          if (popup && !popup.closed) {
            setTimeout(() => {
              try { if (popup && !popup.closed) popup.close(); } catch (e) {}
            }, 1500);
          }
        } catch (e) {}

        return { res, cache };
      }

      if (res && res.ok === false && !res.pending) {
        throw new Error(res.error || 'itch_login_failed');
      }

      scene._setHint(loadLocalization('waitingLogin'));
      await sleep(POLL_INTERVAL_MS);
    }

    throw new Error('itch_login_timeout');
  }

  // Discord 直接登录（Worker 侧使用 Discord 身份 find-or-create D1 账号）
  async function startDiscordLoginFlowInteractive(scene) {
    scene._setHint(loadLocalization('RequestingLogin'));

    const start = await tryGetJson(`${DISCORD_WORKER_BASE}/oauth/discord/start?mode=login`);
    if (!start || !start.ok || !start.authorize_url || !start.session) {
      throw new Error('discord_login_start_failed: ' + JSON.stringify(start));
    }

    const session = String(start.session);
    scene._setHint(loadLocalization('openingWindow'));
    const popup = openAuthUrlExternal(start.authorize_url, scene._authWindowStyle, scene);
    scene._popupWindow = popup;

    const startedAt = Date.now();
    let popupClosedAt = 0;
    const POPUP_CLOSE_GRACE_MS = 10000;

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      if (popup && popup.closed) {
        if (!popupClosedAt) popupClosedAt = Date.now();
        if (Date.now() - popupClosedAt > POPUP_CLOSE_GRACE_MS) {
          throw new Error('discord_login_canceled');
        }
      }

      const res = await tryGetJson(
        `${DISCORD_WORKER_BASE}/oauth/discord/result?session=${encodeURIComponent(session)}`
      );

      if (res && res.ok && !res.pending) {
        const cache = normalizeResultToCache(res);
        cache.discordUserId = String(res.discordUserId || res.discord_user_id || '');
        addLinkedProvider_(cache, 'discord');
        // 只有 Worker 实时确认付费身份时才写入 Discord 资格；OAuth 成功本身不等于有付费 role。
        if (res.eligible === true && !cache.specialRoles.includes('discord')) {
          cache.specialRoles.push('discord');
        }
        auth.set(cache);

        try {
          if (popup && !popup.closed) {
            setTimeout(() => {
              try { if (popup && !popup.closed) popup.close(); } catch (e) {}
            }, 1500);
          }
        } catch (e) {}

        return { res, cache };
      }

      if (res && res.ok === false && !res.pending) {
        throw new Error(res.error || 'discord_login_failed');
      }

      scene._setHint(loadLocalization('waitingLogin'));
      await sleep(POLL_INTERVAL_MS);
    }

    throw new Error('discord_login_timeout');
  }

  // 已登录账号绑定 Discord：携带 player_id + device_id，保留原 playerId。
  async function startDiscordVerifyFlowInteractive(scene) {
    scene._setHint(loadLocalization('RequestingLogin'));

    const cached = auth.get() || {};
    const playerId = String(cached.playerId || cached.player_id || '').trim();
    const deviceId = String(cached.device_id || '').trim();
    if (!/^\d+$/.test(playerId) || !deviceId) {
      throw new Error('missing_player_or_device_id');
    }

    const startUrl = `${DISCORD_WORKER_BASE}/oauth/discord/start` +
      `?player_id=${encodeURIComponent(playerId)}` +
      `&device_id=${encodeURIComponent(deviceId)}`;
    const start = await tryGetJson(startUrl);
    if (!start || !start.ok || !start.authorize_url || !start.session) {
      throw new Error('discord_verify_start_failed: ' + JSON.stringify(start));
    }

    const session = String(start.session);
    scene._setHint(loadLocalization('openingWindow'));
    const popup = openAuthUrlExternal(start.authorize_url, scene._authWindowStyle, scene);
    scene._popupWindow = popup;

    const startedAt = Date.now();
    let popupClosedAt = 0;
    const POPUP_CLOSE_GRACE_MS = 10000;

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      if (popup && popup.closed) {
        if (!popupClosedAt) popupClosedAt = Date.now();
        if (Date.now() - popupClosedAt > POPUP_CLOSE_GRACE_MS) {
          throw new Error('discord_verify_canceled');
        }
      }

      const res = await tryGetJson(
        `${DISCORD_WORKER_BASE}/oauth/discord/result?session=${encodeURIComponent(session)}`
      );

      if (res && res.ok && !res.pending) {
        const updated = auth.get() || cached;
        const canonicalPlayerId = String(res.playerId || res.player_id || '').trim();
        if (/^\d+$/.test(canonicalPlayerId)) updated.playerId = canonicalPlayerId;
        if (res.device_id) updated.device_id = String(res.device_id);
        updated.discordUserId = String(res.discordUserId || res.discord_user_id || '');
        updated.itchUserId = String(res.itchUserId || res.itch_user_id || '');
        if (res.accountUid || res.account_uid) {
          updated.accountUid = String(res.accountUid || res.account_uid);
        }
        if (typeof res.subscribed === 'boolean') updated.subscribed = res.subscribed;

        const roles = Array.isArray(res.specialRoles)
          ? res.specialRoles.slice()
          : (Array.isArray(updated.specialRoles) ? updated.specialRoles.slice() : []);
        if (res.eligible === true && !roles.includes('discord')) roles.push('discord');
        updated.specialRoles = roles;
        const returnedProviders = Array.isArray(res.linkedProviders)
          ? res.linkedProviders
          : (Array.isArray(res.linked_providers) ? res.linked_providers : null);
        if (returnedProviders) {
          const providerSet = new Set(
            returnedProviders.map(normalizeProviderName_).filter(Boolean)
          );
          updated.linkedProviders = PROVIDER_ORDER
            .filter(provider => providerSet.has(provider));
        } else {
          addLinkedProvider_(updated, 'discord');
        }
        updated.ts = Date.now();
        auth.set(updated);

        try {
          if (popup && !popup.closed) {
            setTimeout(() => {
              try { if (popup && !popup.closed) popup.close(); } catch (e) {}
            }, 1500);
          }
        } catch (e) {}

        return { res, cache: updated };
      }

      if (res && res.ok === false && !res.pending) {
        throw new Error(res.error || 'discord_verify_failed');
      }

      scene._setHint(loadLocalization('waitingLogin'));
      await sleep(POLL_INTERVAL_MS);
    }

    throw new Error('discord_verify_timeout');
  }

  // 已登录账号绑定 Patreon：Worker 校验 player_id + device_id，成功后继续使用同一 playerId。
  async function startPatreonVerifyFlowInteractive(scene) {
    scene._setHint(loadLocalization('RequestingLogin'));

    const cached = auth.get() || {};
    const playerId = String(cached.playerId || cached.player_id || '').trim();
    const deviceId = String(cached.device_id || '').trim();
    if (!/^\d+$/.test(playerId) || !deviceId) {
      throw new Error('missing_player_or_device_id');
    }

    const startUrl = `${PATREON_OAUTH_BASE}/oauth/patreon/start` +
      `?mode=link&player_id=${encodeURIComponent(playerId)}` +
      `&device_id=${encodeURIComponent(deviceId)}`;
    const start = await tryGetJson(startUrl);
    if (!start || !start.ok || !start.authorize_url || !start.session) {
      throw new Error('patreon_verify_start_failed: ' + JSON.stringify(start));
    }

    const session = String(start.session);
    scene._setHint(loadLocalization('openingWindow'));
    const popup = openAuthUrlExternal(start.authorize_url, scene._authWindowStyle, scene);
    scene._popupWindow = popup;

    const startedAt = Date.now();
    let popupClosedAt = 0;
    const POPUP_CLOSE_GRACE_MS = 10000;

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      if (popup && popup.closed) {
        if (!popupClosedAt) popupClosedAt = Date.now();
        if (Date.now() - popupClosedAt > POPUP_CLOSE_GRACE_MS) {
          throw new Error('patreon_verify_canceled');
        }
      }

      const res = await tryGetJson(
        `${PATREON_OAUTH_BASE}/oauth/patreon/result?session=${encodeURIComponent(session)}`
      );

      if (res && res.ok && !res.pending) {
        const updated = auth.get() || cached;
        const canonicalPlayerId = String(res.playerId || res.player_id || '').trim();
        if (/^\d+$/.test(canonicalPlayerId)) updated.playerId = canonicalPlayerId;
        if (res.device_id) updated.device_id = String(res.device_id);
        if (typeof res.subscribed === 'boolean') updated.subscribed = res.subscribed;
        if (res.accountUid || res.account_uid) {
          updated.accountUid = String(res.accountUid || res.account_uid);
        }
        if (typeof res.discordUserId === 'string' ||
            typeof res.discord_user_id === 'string') {
          updated.discordUserId = String(
            res.discordUserId || res.discord_user_id || ''
          );
        }
        if (typeof res.itchUserId === 'string' ||
            typeof res.itch_user_id === 'string') {
          updated.itchUserId = String(res.itchUserId || res.itch_user_id || '');
        }
        if (Array.isArray(res.specialRoles)) updated.specialRoles = res.specialRoles.slice();
        const returnedProviders = Array.isArray(res.linkedProviders)
          ? res.linkedProviders
          : (Array.isArray(res.linked_providers) ? res.linked_providers : null);
        if (returnedProviders) {
          const providerSet = new Set(
            returnedProviders.map(normalizeProviderName_).filter(Boolean)
          );
          updated.linkedProviders = PROVIDER_ORDER
            .filter(provider => providerSet.has(provider));
        } else {
          addLinkedProvider_(updated, 'patreon');
        }
        updated.ts = Date.now();
        auth.set(updated);

        try {
          if (popup && !popup.closed) {
            setTimeout(() => {
              try { if (popup && !popup.closed) popup.close(); } catch (e) {}
            }, 1500);
          }
        } catch (e) {}

        return { res, cache: updated };
      }

      if (res && res.ok === false && !res.pending) {
        throw new Error(res.error || 'patreon_verify_failed');
      }

      scene._setHint(loadLocalization('waitingLogin'));
      await sleep(POLL_INTERVAL_MS);
    }

    throw new Error('patreon_verify_timeout');
  }

  class Scene_PatreonVerify extends Scene_MenuBase {
    constructor() {
      super();
      this._btnObjs = [];
      this._popupWindow = null;
      this._busy = false;

      // UI sprites
      this._titleSprite = null;
      this._avatarSprite = null;
      this._nameSprite = null;
      this._infoSprite = null;
      this._hintSprite = null;
      this._playerIdSprite = null;
      // first-time notice
      this._noticeSprite = null;
      this._noticeStartedAt = 0;
      this._noticeDurationMs = 22000;   // 提示文本显示时长     
      // logout icon
      this._logoutSprite = null;
      this._logoutBmp = null;
      this._logoutBmpHover = null;
      this._logoutHover = false;
      this._itchVerifySprite = null;
      this._itchBmp = null;
      this._itchBmpHover = null;
      this._itchVerifyHover = false;
      this._itchVerifyLabel = null;
      this._discordVerifySprite = null;
      this._discordVerifyHover = false;
      this._discordVerifyLabel = null;
      this._patreonVerifySprite = null;
      this._patreonVerifyHover = false;
      this._patreonVerifyLabel = null;
      this._itchNoticeSprite = null;
      this._itchNoticeStartedAt = 0;
      // 是否限时消失
      this._itchNoticeDurationMs = 0;
      // login choice (Patreon / Discord / itch.io)
      this._loginChoiceBtns = [];
      this._loginChoiceVisible = false;
      this._patreonBmp = null;
      this._patreonBmpHover = null;
      this._discordBmp = null;
      this._discordBmpHover = null;
      this._boundProviderSprites = {};

      const authW = 520, authH = 760;
      const authLeft = (window.screen.width - authW) / 2;
      const authTop = (window.screen.height - authH) / 2;
      this._authWindowStyle = `width=${authW},height=${authH},left=${authLeft},top=${authTop}`;
    }

    create() {
      super.create();
      this._createUI();
      this._applyCacheToUI();      // 初次进来就刷新一次
      this._updateButtonsState();  // 修复：确保按钮初始显示正确
      if (this._shouldShowFirstTimeNotice()) {
        this._showFirstTimeNotice();
      }      
    }

    terminate() {
      super.terminate();
      // 离场清滤镜（noticeSprite 在 _createUI 里被套了 GlowFilter）
      if (this._noticeSprite) {
        this._noticeSprite.filters = null;
        // 可选：不复用该 sprite，可以直接从场景移除
        if (this._noticeSprite.parent) this._noticeSprite.parent.removeChild(this._noticeSprite);
        this._noticeSprite = null;
      }
      // itchNoticeSprite也要清滤镜
      if (this._itchNoticeSprite) {
        this._itchNoticeSprite.filters = null;
        if (this._itchNoticeSprite.parent) this._itchNoticeSprite.parent.removeChild(this._itchNoticeSprite);
        this._itchNoticeSprite = null;
      }      
      if (this._popupWindow && !this._popupWindow.closed) {
        try { this._popupWindow.close(); } catch (e) {}
      }
    }

	_createUI() {
	  const w = Graphics.width, h = Graphics.height;
	  const minSide = Math.min(w, h);

	  // avatar size (keep your CFG ratio, but you can also scale it if you want)
	  const avatarSize = Math.floor(minSide * CFG.avatarRatio);

	  // ---- Text sprites (increase bitmap height to avoid clipping on 1920x1080) ----
	  this._titleSprite = new Sprite(new Bitmap(w, vh(48)));
	  this._titleSprite.x = 0;
	  this._titleSprite.y = Math.floor(h * CFG.titleY);
	  this.addChild(this._titleSprite);

	  this._avatarSprite = new Sprite(new Bitmap(avatarSize, avatarSize));
	  this._avatarSprite.anchor.set(0.5, 0);
	  this._avatarSprite.x = Math.floor(w / 2);
	  this._avatarSprite.y = Math.floor(h * CFG.avatarY);
	  this.addChild(this._avatarSprite);

    // === Logout icon (top-right of avatar) ===
    this._logoutBmp = ImageManager.loadBitmap('img/system/', 'Logout', 0, true);
    this._logoutBmpHover = ImageManager.loadBitmap('img/system/', 'Logout_hover', 0, true);

    this._logoutSprite = new Sprite(this._logoutBmp);
    this._logoutSprite.anchor.set(0.5, 0.5);
    // 放到头像右上角
    const ax = this._avatarSprite.x;
    const ay = this._avatarSprite.y;
    // 右上角点
    this._logoutSprite.x = Math.floor(ax + 104);
    this._logoutSprite.y = Math.floor(ay + 32);

    this._logoutSprite.scale.set(0.4); 
    this._logoutSprite.visible = false;     
    this.addChild(this._logoutSprite);

    this._itchBmp = ImageManager.loadBitmap('img/system/', ITCH_LOGO_NAME, 0, true);
    this._itchBmpHover = ImageManager.loadBitmap('img/system/', ITCH_LOGO_HOVER_NAME, 0, true);
    this._discordBmp = ImageManager.loadBitmap('img/system/', DISCORD_LOGO_NAME, 0, true);
    this._discordBmpHover = ImageManager.loadBitmap('img/system/', DISCORD_LOGO_HOVER_NAME, 0, true);
    this._patreonBmp = ImageManager.loadBitmap('img/system/', PATREON_LOGO_NAME, 0, true);
    this._patreonBmpHover = ImageManager.loadBitmap('img/system/', PATREON_LOGO_HOVER_NAME, 0, true);

    this._patreonVerifySprite = new Sprite(this._patreonBmp);
    this._patreonVerifySprite.anchor.set(0.5, 0.5);
    this._patreonVerifySprite.x = Math.floor(ax);
    this._patreonVerifySprite.y = Math.floor(ay + 480);
    this._patreonVerifySprite.visible = false;
    this.addChild(this._patreonVerifySprite);

    this._itchVerifySprite = new Sprite(this._itchBmp);
    this._itchVerifySprite.anchor.set(0.5, 0.5);
    this._itchVerifySprite.x = Math.floor(ax);
    this._itchVerifySprite.y = Math.floor(ay + 480);
    this._itchVerifySprite.visible = true;
    this.addChild(this._itchVerifySprite);

    this._discordVerifySprite = new Sprite(this._discordBmp);
    this._discordVerifySprite.anchor.set(0.5, 0.5);
    this._discordVerifySprite.x = Math.floor(ax);
    this._discordVerifySprite.y = Math.floor(ay + 480);
    this._discordVerifySprite.visible = false;
    this.addChild(this._discordVerifySprite);

    const makeProviderVerifyLabel = (name) => {
      const labelBmp = new Bitmap(240, vh(34));
      labelBmp.fontFace = DrillUp.g_DFF_fontFace;
      labelBmp.fontSize = fs(24);
      labelBmp.textColor = '#ffffff';
      labelBmp.outlineColor = 'rgba(0,0,0,0.6)';
      labelBmp.outlineWidth = 4;
      labelBmp.drawText(name, 0, 0, labelBmp.width, labelBmp.height, 'center');
      const label = new Sprite(labelBmp);
      label.anchor.set(0.5, 1);
      label.visible = false;
      this.addChild(label);
      return label;
    };
    this._patreonVerifyLabel = makeProviderVerifyLabel('Patreon');
    this._itchVerifyLabel = makeProviderVerifyLabel('itch.io');
    this._discordVerifyLabel = makeProviderVerifyLabel('Discord');
    // ---- Itch verify guide text (near itch button) ----
    const itchNoticeW = Math.floor(w * 0.36);
    const itchNoticeH = Math.floor(h * 0.15);
    this._itchNoticeSprite = new Sprite(new Bitmap(itchNoticeW, itchNoticeH)); 
    this._itchNoticeSprite.visible = false;
    this._itchNoticeSprite.opacity = 0;
    this._itchNoticeSprite.anchor.set(0.5, 0);   // 以中心为基准
    this._itchNoticeSprite.x = Math.floor(w / 2);
    // 套滤镜（和 _noticeSprite 一样）
    if (PIXI.filters && PIXI.filters.GlowFilter) {
      this._itchNoticeSprite.filters = [
        new PIXI.filters.GlowFilter({ distance: 8, outerStrength: 1, innerStrength: 0, color: 0xf3a64a, quality: 0.66 })
      ];
    }
    this.addChild(this._itchNoticeSprite);

	  this._nameSprite = new Sprite(new Bitmap(w, vh(56)));
	  this._nameSprite.x = 0;
	  this._nameSprite.y = this._avatarSprite.y + avatarSize + Math.round(CFG.nameYGap * getUiScale());
	  this.addChild(this._nameSprite);

	  this._infoSprite = new Sprite(new Bitmap(w, vh(56)));
	  this._infoSprite.x = 0;
	  this._infoSprite.y = this._nameSprite.y + Math.round(CFG.infoYGap * getUiScale());
	  this.addChild(this._infoSprite);

    this._playerIdSprite = new Sprite(new Bitmap(w, vh(52)));
    this._playerIdSprite.x = 0;
    this._playerIdSprite.y = this._infoSprite.y + vh(48); 
    this.addChild(this._playerIdSprite);

	  this._hintSprite = new Sprite(new Bitmap(w, vh(84)));
	  this._hintSprite.x = 0;
	  this._hintSprite.y = this._playerIdSprite.y + vh(2);
	  this.addChild(this._hintSprite);

	  // ---- Buttons (3 rows): Cloud Save (top) -> Major Update (mid) -> Verify/Logout (bottom) ----
	  const btnW = Math.floor(w * CFG.button.wFactor);
	  const btnH = vh(CFG.button.h);
	  const gapY = vh(18);

	  // Move the main button further down to make room for 2 buttons above it
	  const mainY = Math.floor(h * 0.80);
	  const updateY = mainY - (btnH + gapY);
	  const cloudY = updateY - (btnH + gapY);

	  // ① Cloud Save (top)
	  const cloudSpr = new Sprite(makeButtonBitmap(loadLocalization('cloudSave'), btnW, btnH, fs(CFG.button.fontSize)));
	  cloudSpr.anchor.set(0.5, 0.5);
	  cloudSpr.x = Math.floor(w / 2);
	  cloudSpr.y = cloudY;
	  this.addChild(cloudSpr);

	  this._btnObjs.push({
		spr: cloudSpr,
		hover: false,
		onClick: this._onCloudSaveClick.bind(this),
		kind: 'cloudSave',
	  });

	  // ② Major Update (mid)
	  const updateSpr = new Sprite(makeButtonBitmap(loadLocalization('logInFirst'), btnW, btnH, fs(CFG.button.fontSize)));
	  updateSpr.anchor.set(0.5, 0.5);
	  updateSpr.x = Math.floor(w / 2);
	  updateSpr.y = updateY;
	  this.addChild(updateSpr);

	  this._btnObjs.push({
		spr: updateSpr,
		hover: false,
		onClick: this._onMajorUpdateClick.bind(this),
		kind: 'majorUpdate',
	  });

	  // === Login choice: Patreon / Discord / itch.io 圆形按钮（未登录点击登录按钮后替换其显示） ===
	  // 身份文字后的已绑定平台标记：使用普通 64x64 图标，固定缩放为 0.5。
	  this._boundProviderSprites = {
		patreon: new Sprite(this._patreonBmp),
		discord: new Sprite(this._discordBmp),
		'itch.io': new Sprite(this._itchBmp),
	  };
	  for (const provider of PROVIDER_ORDER) {
		const providerSprite = this._boundProviderSprites[provider];
		providerSprite.anchor.set(0, 0.5);
		providerSprite.scale.set(0.5);
		providerSprite.visible = false;
		this._infoSprite.addChild(providerSprite);
	  }

	  const choiceSpacing = vh(104) * 2;         // 保持原 Patreon 与 itch.io 的中心距离作为相邻间距
	  const choiceY = updateY + vh(72);          // 下移72px：远离云存档按钮 + 给悬停平台名留空间
	  const makeChoiceBtn = (bmp, bmpHover, x, name, onClick) => {
		const spr = new Sprite(bmp);
		spr.anchor.set(0.5, 0.5);
		spr.x = x;
		spr.y = choiceY;
		spr.visible = false;
		this.addChild(spr);

		// 悬停时显示在图标上方的平台名（玩家可能不认识 logo）
		const labelBmp = new Bitmap(240, vh(34));
		labelBmp.fontFace = DrillUp.g_DFF_fontFace;
		labelBmp.fontSize = fs(24);
		labelBmp.textColor = '#ffffff';
		labelBmp.outlineColor = 'rgba(0,0,0,0.6)';
		labelBmp.outlineWidth = 4;               // 与本场景标题/提示文字的描边一致
		labelBmp.drawText(name, 0, 0, labelBmp.width, labelBmp.height, 'center');
		const label = new Sprite(labelBmp);
		label.anchor.set(0.5, 1);                // 底边对齐基准，贴在图标上缘之上
		label.x = x;
		label.y = choiceY - vh(42);              // hover 态图标半高36 + 边距
		label.visible = false;
		this.addChild(label);

		this._loginChoiceBtns.push({ spr, bmp, bmpHover, hover: false, onClick, label });
		return spr;
	  };
	  makeChoiceBtn(this._patreonBmp, this._patreonBmpHover, Math.floor(w / 2 - choiceSpacing), 'Patreon', this._onPatreonLoginClick.bind(this));
	  makeChoiceBtn(this._discordBmp, this._discordBmpHover, Math.floor(w / 2), 'Discord', this._onDiscordLoginClick.bind(this));
	  makeChoiceBtn(this._itchBmp, this._itchBmpHover, Math.floor(w / 2 + choiceSpacing), 'itch.io', this._onItchLoginClick.bind(this));

	  // ③ Verify / Logout (bottom)
    /*
	  const mainSpr = new Sprite(makeButtonBitmap('Verify', btnW, btnH, fs(CFG.button.fontSize)));
	  mainSpr.anchor.set(0.5, 0.5);
	  mainSpr.x = Math.floor(w / 2);
	  mainSpr.y = mainY;
	  this.addChild(mainSpr);

	  this._btnObjs.push({
		spr: mainSpr,
		hover: false,
		onClick: this._onMainButtonClick.bind(this),
		kind: 'main',
	  });
    */
	  // Initial text
	  this._setTitle('Legitimate Player Verification');
	  this._setHint('Ready');
    // ---- First-time notice  ----
    const noticeW = Math.floor(w * 0.4);
    const noticeH = Math.floor(h * 0.6);

    this._noticeSprite = new Sprite(new Bitmap(noticeW, noticeH));
    this._noticeSprite.x = Math.floor(w * 0.013);   // 右侧区域起点
    this._noticeSprite.y = Math.floor(h * 0.1);     // 顶部偏下
    this._noticeSprite.visible = false;            // 默认不显示
    this._noticeSprite.opacity = 0;
    if (PIXI.filters && PIXI.filters.GlowFilter) {
      // 套滤镜
      this._noticeSprite.filters = [
        new PIXI.filters.GlowFilter({ distance: 8, outerStrength: 1, innerStrength: 0, color: 0xf3a64a, quality: 0.66 })
      ];
    }    
    this.addChild(this._noticeSprite);    
	}

  _resolveUserIdentity(cached) {
    const DEFAULT = 'NotSubscribed';
    if (!cached) return DEFAULT;
    const subscribed = !!cached.subscribed;
    // 兼容 future：specialRoles / special_roles / verified_group 等多种字段名
    const roles = normalizeRoleList_(
      cached.specialRoles ?? cached.special_roles ?? cached.verified_group
    );
    // Patreon 有效订阅、Discord 付费身份和 itch.io 游戏凭证统一视为正版验证。
    const isVerifiedPlayer = subscribed || roles.has('discord') || roles.has('itch.io');
    // 规则表：priority 越大，身份越靠前
    const RULES = [
      {
        id: 'NotSubscribed',
        priority: 0,
        when: () => true,
      },
      {
        id: 'Subscribed',
        priority: 15,
        when: () => isVerifiedPlayer,
      },
      {
        id: 'ImoutoFavorite',
        priority: 30,
        when: () => roles.has('ImoutoFavorite'),
      },
    ];

    let best = RULES[0];
    for (const r of RULES) {
      if (r.when(cached, roles) && r.priority > best.priority) best = r;
    }
    return best.id;
  }

    _setTitle(text) {
      const bmp = this._titleSprite.bitmap;
      bmp.clear(); 
      bmp.fontSize = fs(28);
      bmp.outlineColor = 'rgba(0,0,0,0.6)';
      bmp.outlineWidth = 4;            
      bmp.drawText(String(text || ''), 0, 0, bmp.width, bmp.height, 'center');
    }

    _setHint(text) {
      const bmp = this._hintSprite.bitmap;
      bmp.clear(); 
      bmp.fontSize = fs(25);
      bmp.outlineColor = 'rgba(0,0,0,0.6)';
      bmp.outlineWidth = 4;            
      bmp.drawText(String(text || ''), 0, 0, bmp.width, bmp.height, 'center');
    }

    _shouldShowFirstTimeNotice() {
      // 第一次进入时显示的提示文本
      return !this._isLoggedIn();
    }

    _drawMultilineText(bmp, text, x, y, width, lineHeight, align = 'left') {
      const raw = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const paragraphs = raw.split('\n');

      const lines = [];
      for (const p of paragraphs) {
        if (!p) { lines.push(''); continue; }

        // 简易按字符折行（避免没空格的语言不换行）
        let cur = '';
        for (let i = 0; i < p.length; i++) {
          const ch = p[i];
          const next = cur + ch;
          // 使用 Bitmap 当前的字体与字号测量。直接使用 ctx 时字体状态可能尚未同步，
          // 会低估文本宽度，并让 drawText 把整行文字横向压缩进 maxWidth。
          const w = bmp.measureTextWidth(next);
          if (w > width && cur.length > 0) {
            lines.push(cur);
            cur = ch;
          } else {
            cur = next;
          }
        }
        if (cur.length > 0) lines.push(cur);
      }

      let yy = y;
      for (const line of lines) {
        bmp.drawText(line, x, yy, width, lineHeight, align);
        yy += lineHeight;
      }
    }

    // 显示提示文本（仅首次进入时显示）
    _showFirstTimeNotice() {
      if (!this._noticeSprite) return;

      const bmp = this._noticeSprite.bitmap;
      bmp.clear();

      const text = loadLocalization('firstTimeNotice'); 
      bmp.fontSize = fs(26);
      bmp.fontFace = DrillUp.g_DFF_fontFace;
      bmp.textColor = '#ffffff';
      //bmp.outlineColor = 'rgba(0,0,0,0.5)';
      //bmp.outlineWidth = 3;

      const pad = vh(10);
      const lineH = vh(34);
      this._drawMultilineText(
        bmp,
        text,
        pad,
        pad,
        bmp.width - pad * 2,
        lineH,
        'left'
      );
      bmp._baseTexture.update();
      this._noticeSprite.visible = true;
      this._noticeSprite.opacity = 0;
      this._noticeStartedAt = Date.now();
    }    

    _showItchVerifyNotice() {
      if (!this._itchNoticeSprite) return;
      const bmp = this._itchNoticeSprite.bitmap;
      bmp.clear();
      const noticeKey = 'additionalPlatformVerifyNotice';
      const localizedText = loadLocalization(noticeKey);
      const text = localizedText === noticeKey
        ? 'You can also link accounts from other platforms to share the same playerId data!'
        : localizedText;
      bmp.fontSize = fs(26);
      bmp.fontFace = DrillUp.g_DFF_fontFace;
      bmp.textColor = '#ffffff';
      const pad = vh(6);
      const lineH = vh(30);
      this._drawMultilineText(
        bmp,
        text,
        pad,
        pad,
        bmp.width - pad * 2,
        lineH,
        'center'
      );
      bmp._baseTexture.update();
      this._itchNoticeSprite.visible = true;
      this._itchNoticeSprite.opacity = 0;
      this._itchNoticeStartedAt = Date.now();
    }

    _setNameLine(text) {
      const bmp = this._nameSprite.bitmap;
      bmp.clear(); 
      bmp.fontSize = fs(36);
      // 默认白色
      bmp.textColor = '#ffffff';
      bmp.outlineColor = 'rgba(0,0,0,0.6)';
      bmp.outlineWidth = 4;      
      bmp.drawText(String(text || ''), 0, 0, bmp.width, bmp.height, 'center');
    }

    _setInfoLine(text, color, linkedProviders = []) {
      const bmp = this._infoSprite.bitmap;
      bmp.clear();
      bmp.fontSize = fs(25);
      // 默认白色
      bmp.textColor = color || '#ffffff';
      bmp.outlineColor = 'rgba(0,0,0,0.6)';
      bmp.outlineWidth = 4;

      const providers = PROVIDER_ORDER.filter((provider) => linkedProviders.includes(provider));
      for (const provider of PROVIDER_ORDER) {
        const providerSprite = this._boundProviderSprites[provider];
        if (providerSprite) providerSprite.visible = false;
      }

      const label = String(text || '');
      const textWidth = label ? Math.ceil(bmp.measureTextWidth(label)) : 0;
      const iconSize = 64 * 0.5;
      const textIconGap = label && providers.length ? 8 : 0;
      const iconGap = 4;
      const iconsWidth = providers.length
        ? providers.length * iconSize + (providers.length - 1) * iconGap
        : 0;

      if (label) {
        // 身份文字始终单独对齐头像中心；右侧平台图标不参与居中计算。
        bmp.drawText(label, 0, 0, bmp.width, bmp.height, 'center');
      }

      let iconX = label
        ? Math.ceil(bmp.width / 2 + textWidth / 2 + textIconGap)
        : Math.floor((bmp.width - iconsWidth) / 2);
      for (const provider of providers) {
        const providerSprite = this._boundProviderSprites[provider];
        if (!providerSprite) continue;
        providerSprite.x = iconX;
        providerSprite.y = Math.floor(bmp.height / 2);
        providerSprite.scale.set(0.5);
        providerSprite.visible = true;
        iconX += iconSize + iconGap;
      }
      bmp.textColor = '#ffffff';
    }

    _setPlayerIdLine(text) {
      if (!this._playerIdSprite) return;
      const bmp = this._playerIdSprite.bitmap;
      bmp.clear();
      bmp.fontSize = fs(24);
      bmp.textColor = '#ffffff';
      bmp.outlineColor = 'rgba(0,0,0,0.6)';
      bmp.outlineWidth = 4;
      bmp.drawText(String(text || ''), 0, 0, bmp.width, bmp.height, 'center');
      bmp.textColor = '#ffffff';
    }

    _isLoggedIn() {
      const c = auth.get();
      // 也可以加一个“过期时间”的判断，这里先按“有缓存就算已登录”
      return !!(c && c.playerId);
    }

    _isItchVerified() {
      const c = auth.get();
      if (!c) return false;
      return !!((Array.isArray(c.specialRoles) && c.specialRoles.includes('itch.io')));
    }

    _isDiscordVerified() {
      const c = auth.get();
      if (!c) return false;
      return !!(Array.isArray(c.specialRoles) && c.specialRoles.includes('discord'));
    }

    _isPatreonLinked() {
      return getLinkedProviders_(auth.get()).includes('patreon');
    }

	_isSponsor() {
	  const c    = auth.get();
    if (!c) return false;
    const specialRoles = normalizeRoleList_(
      c.specialRoles ?? c.special_roles ?? c.verified_group
    );
    return !!c.subscribed ||
      specialRoles.has('discord') ||
      specialRoles.has('itch.io') ||
      specialRoles.has('ImoutoFavorite');
	}
  _setButtonLabelByKind(kind, labelText) {
    const b = this._btnObjs.find(x => x && x.kind === kind);
    if (!b || !b.spr || !b.spr.bitmap) return;

    const bw = b.spr.bitmap.width;
    const bh = b.spr.bitmap.height;
    b.spr.bitmap = makeButtonBitmap(String(labelText || ''), bw, bh, fs(CFG.button.fontSize));
  }

  _updateButtonsState() {
    const logged = this._isLoggedIn();
    const sponsor = this._isSponsor();

    const getBtn = (kind) => this._btnObjs.find(b => b && b.kind === kind);

    const bCloud  = getBtn('cloudSave');
    const bUpdate = getBtn('majorUpdate');
    const bMain   = getBtn('main');

    // 主按钮：Verify / Logout
    if (bMain && bMain.spr && bMain.spr.bitmap) {
      const bw = bMain.spr.bitmap.width;
      const bh = bMain.spr.bitmap.height;
      const label = logged ? 'Logout' : 'Verify';
      bMain.spr.bitmap = makeButtonBitmap(label, bw, bh, fs(CFG.button.fontSize));
      bMain.spr.opacity = 255;
    }
    
    // 云存档：目前完全开放
    if (bCloud && bCloud.spr) {
      const enabled = true; // logged;
      bCloud.spr.opacity = enabled ? 255 : 140;
    }

    // 大版本更新：需登录 + 正版验证才可用
    if (bUpdate && bUpdate.spr) {
      const enabled = true; 
      bUpdate.spr.opacity = enabled ? 255 : 140;
      // 根据当前登录/赞助状态刷新按钮文案，避免停留在 "notSponsor"
      let label;
      if (!logged) {
        label = loadLocalization('logInFirst');
      } else if (!sponsor) {
        label = loadLocalization('notSponsor');
      } else {
        // itch 玩家或 Patreon 订阅者都应该显示可更新
        label = loadLocalization('CheckUpdates');
      }
      const bw = bUpdate.spr.bitmap.width;
      const bh = bUpdate.spr.bitmap.height;
      bUpdate.spr.bitmap = makeButtonBitmap(label, bw, bh, fs(CFG.button.fontSize));
    }
  }

  // 显示/隐藏登录方式选择按钮（与 majorUpdate 登录按钮互斥显示）
  _setLoginChoiceVisible(visible) {
    if (this._isLoggedIn()) visible = false;
    this._loginChoiceVisible = !!visible;
    for (const b of this._loginChoiceBtns) {
      b.spr.visible = this._loginChoiceVisible;
      if (b.label) b.label.visible = false;   // 平台名只在悬停时出现
      if (!this._loginChoiceVisible) {
        b.hover = false;
        b.spr.bitmap = b.bmp;
      }
    }
    const bUpdate = this._btnObjs.find(x => x && x.kind === 'majorUpdate');
    if (bUpdate && bUpdate.spr) bUpdate.spr.visible = !this._loginChoiceVisible;
    if (this._loginChoiceVisible) this._setHint(loadLocalization('chooseLoginMethod'));
  }

  _refreshItchNoticeVisibility() {
    if (!this._itchNoticeSprite) return;
    // 通用附加绑定提示：仍有任意平台可绑定时显示，全部绑定后隐藏。
    const providerSprites = [
      this._patreonVerifySprite,
      this._discordVerifySprite,
      this._itchVerifySprite,
    ];
    const providerSprite = providerSprites.find((sprite) => sprite && sprite.visible);
    const shouldShow = !!providerSprite;
    if (!shouldShow) {
      this._itchNoticeSprite.visible = false;
      this._itchNoticeSprite.opacity = 0;
      return;
    }
    this._itchNoticeSprite.x = Math.floor(Graphics.width / 2);
    this._itchNoticeSprite.y = Math.floor(providerSprite.y + 20);
    // 如果还没画过内容
    this._showItchVerifyNotice();
  }

  _refreshProviderVerifyButtonPositions() {
    const centerX = Math.floor(Graphics.width / 2);
    const spacing = vh(208);
    const buttons = [
      { sprite: this._patreonVerifySprite, label: this._patreonVerifyLabel },
      { sprite: this._discordVerifySprite, label: this._discordVerifyLabel },
      { sprite: this._itchVerifySprite, label: this._itchVerifyLabel },
    ];
    const visibleButtons = buttons.filter((item) => item.sprite && item.sprite.visible);
    const startX = centerX - ((visibleButtons.length - 1) * spacing) / 2;

    visibleButtons.forEach((item, index) => {
      item.sprite.x = Math.floor(startX + index * spacing);
    });
    for (const item of buttons) {
      if (!item.sprite || !item.label) continue;
      item.label.x = item.sprite.x;
      item.label.y = item.sprite.y - vh(42);
      if (!item.sprite.visible) item.label.visible = false;
    }
  }

    _applyCacheToUI() {
      const w = Graphics.width, h = Graphics.height;
      const minSide = Math.min(w, h);
      const avatarSize = Math.floor(minSide * CFG.avatarRatio);

      const cached = auth.get();
      if (!cached) {
		    this._titleSprite.visible = true;        // 未登录显示标题
        this._setTitle('Legitimate Player Verification');	
        const defBmp = ImageManager.loadBitmap('img/system/', 'PFP_default', 0, true);
        drawCircleBitmap(avatarSize, '#555', defBmp, (bmp) => { this._avatarSprite.bitmap = bmp; });	
        //drawCircleBitmap(avatarSize, '#555', null, (bmp) => { this._avatarSprite.bitmap = bmp; });
        this._setNameLine('');
        this._setInfoLine('');
        this._setPlayerIdLine('');
        this._setHint(loadLocalization('notLoggedIn'));
        if (this._logoutSprite) this._logoutSprite.visible = false;
        if (this._patreonVerifySprite) this._patreonVerifySprite.visible = false;
        if (this._itchVerifySprite) this._itchVerifySprite.visible = false;
        if (this._discordVerifySprite) this._discordVerifySprite.visible = false;
        this._refreshProviderVerifyButtonPositions();
        this._refreshItchNoticeVisibility();
        this._setLoginChoiceVisible(this._loginChoiceVisible);
        return;
      }
      this._titleSprite.visible = false;         // 已登录隐藏标题
      // avatar
      drawCircleBitmap(avatarSize, '#555', cached.avatarUrl || null, (bmp) => { this._avatarSprite.bitmap = bmp; });

      // name
      const name = cached.userName || '';
      const nameLine = (name) ? `${name}` : '？？？';
      this._setNameLine(nameLine);

      // sponsor status
      let type = this._resolveUserIdentity(cached);
      let subLine = loadLocalization(type);
      let color   = '#ea7e30eb';
      if (type === "Subscribed") color = '#ffd700';
      if (type === "ImoutoFavorite") color = '#f9b5dc'; 
      this._setInfoLine(subLine, color, getLinkedProviders_(cached));
      // playerId
      const pid = String(cached.playerId || 'error').trim(); 
      this._setPlayerIdLine(pid ? `(playerId: ${pid})` : '');
      // hint
      const last = cached.ts ? new Date(cached.ts).toLocaleString() : '';
      this._setHint(last ? (loadLocalization('lastCheck') + last) : 'OK');
      if (this._logoutSprite) this._logoutSprite.visible = true;
      const linkedProviders = getLinkedProviders_(cached);
      if (this._patreonVerifySprite) this._patreonVerifySprite.visible = !linkedProviders.includes('patreon');
      if (this._itchVerifySprite) this._itchVerifySprite.visible = !linkedProviders.includes('itch.io');
      if (this._discordVerifySprite) this._discordVerifySprite.visible = !linkedProviders.includes('discord');
      this._refreshProviderVerifyButtonPositions();
      this._refreshItchNoticeVisibility();
      // 已登录：收起登录方式选择、还原登录按钮
      this._setLoginChoiceVisible(false);
    }

	async _onMajorUpdateClick() {
	  // 未登录：隐藏本按钮，改为显示 Patreon / Discord / itch.io 登录方式选择
    if (!this._isLoggedIn()) {
      SoundManager.playOk();
      this._setLoginChoiceVisible(true);
      return;
    }
    // 必须是赞助者才执行功能
    if (!this._isSponsor()) {
      SoundManager.playOk();
      chahuiUtil.openOfficialWebsite({from:'nonSubscriber'});
      return;
    }
    if (this._busy || this._isLatestVersion) return;   
    this._busy = true;
    SoundManager.playOk();
    this._setButtonLabelByKind('majorUpdate', loadLocalization('checkLatestVersion'));
    const result = await chahuiUtil.autoUpdataCheck({manualUpdate:true});
    if ( result && result.ok && result.version) {
        let version = result.version;
        const needBusy =  await chahuiUtil.showUpdateNotification(version);
        if (needBusy) return;
        this._setButtonLabelByKind('majorUpdate', loadLocalization('CheckUpdates'));
    } else {
        // 未能捕获到最新版本信息,一般意味着是最新版本
        this._isLatestVersion = true;
        this._setButtonLabelByKind('majorUpdate', loadLocalization('isLatestVersion'));
    }
    this._busy = false;
	}
	_onCloudSaveClick() {
    SoundManager.playOk();
    // R2 云存档（新）；旧 GoogleDrive 场景保留，之后由隐蔽入口进入
		SceneManager.push(window.Scene_CloudSave || Scene_GoogleDrive);
	}
	
    async _onMainButtonClick() {
      if (this._busy) return;
      this._busy = true;

      try {
        /*
        // 已登录 => Logout
        if (this._isLoggedIn()) {
          SoundManager.playCancel();
          auth.del();
          this._applyCacheToUI();
          this._updateButtonsState(); 
          return;
        }
        */
        // 未登录 => Verify
        // SoundManager.playOk();
        preopenPopupForWeb(this);
        const { res, cache } = await startVerifyFlowInteractive(this);
        const oldCache = auth.get();
        if (oldCache && oldCache.playerId && oldCache.playerId === cache.playerId && oldCache.isItchPlayer) {
          cache.isItchPlayer = true;
          auth.set(cache);
        }
        // 根据结果提示
        let type = this._resolveUserIdentity(cache);
        const subLine = loadLocalization(type);
        this._setHint(subLine);
        // 立刻刷新 UI + 按钮变 Logout
        this._applyCacheToUI();
        this._updateButtonsState();
      } catch (e) {
        console.error(e);
        closePreopenedPopup(this);
        this._setHint('Verify failed: ' + (e && e.message ? e.message : String(e)));
        // 出错也保证按钮状态一致
        this._updateButtonsState();
      } finally {
        this._busy = false;
      }
    }

    // 登录方式选择：Patreon（沿用原 Patreon 登录流程）
    async _onPatreonLoginClick() {
      if (this._busy || this._isLoggedIn()) return;
      SoundManager.playOk();
      await this._onMainButtonClick();
    }

    // 登录方式选择：Discord 直接登录（Worker 侧 find-or-create D1 账号）
    async _onDiscordLoginClick() {
      if (this._busy || this._isLoggedIn()) return;
      this._busy = true;
      try {
        SoundManager.playOk();
        preopenPopupForWeb(this);
        const { cache } = await startDiscordLoginFlowInteractive(this);
        const type = this._resolveUserIdentity(cache);
        this._setHint(loadLocalization(type));
        this._applyCacheToUI();
        this._updateButtonsState();
      } catch (e) {
        console.error(e);
        closePreopenedPopup(this);
        this._setHint('Discord login failed: ' + (e && e.message ? e.message : String(e)));
        this._updateButtonsState();
      } finally {
        this._busy = false;
      }
    }

    // 登录方式选择：itch.io 直接登录（Worker 侧 find-or-create D1 账号）
    async _onItchLoginClick() {
      if (this._busy || this._isLoggedIn()) return;
      this._busy = true;
      try {
        SoundManager.playOk();
        preopenPopupForWeb(this);
        const { cache } = await startItchLoginFlowInteractive(this);
        const type = this._resolveUserIdentity(cache);
        this._setHint(loadLocalization(type));
        this._applyCacheToUI();
        this._updateButtonsState();
      } catch (e) {
        console.error(e);
        closePreopenedPopup(this);
        this._setHint('itch login failed: ' + (e && e.message ? e.message : String(e)));
        this._updateButtonsState();
      } finally {
        this._busy = false;
      }
    }

    _onLogoutIconClick() {
      // 忙碌时不处理
      if (this._busy) return;

      SoundManager.playCancel();
      auth.del();

      // 刷新 UI：头像回默认、文字清空、隐藏 logout
      this._applyCacheToUI();
      this._updateButtonsState(); 

      // 保险：清掉 hover 状态
      this._logoutHover = false;
      if (this._logoutSprite) this._logoutSprite.bitmap = this._logoutBmp;
      this._patreonVerifyHover = false;
      if (this._patreonVerifySprite) this._patreonVerifySprite.bitmap = this._patreonBmp;
      this._itchVerifyHover = false;
      if (this._itchVerifySprite) this._itchVerifySprite.bitmap = this._itchBmp;
      this._discordVerifyHover = false;
      if (this._discordVerifySprite) this._discordVerifySprite.bitmap = this._discordBmp;
    }

    async _onPatreonVerifyClick() {
      if (this._busy || this._isPatreonLinked() || !this._isLoggedIn()) return;
      this._busy = true;
      try {
        SoundManager.playOk();
        preopenPopupForWeb(this);
        await startPatreonVerifyFlowInteractive(this);
        this._applyCacheToUI();
        this._updateButtonsState();
      } catch (e) {
        console.error(e);
        closePreopenedPopup(this);
        this._setHint('Patreon verify failed: ' + (e && e.message ? e.message : String(e)));
      } finally {
        this._busy = false;
      }
    }

    async _onDiscordVerifyClick() {
      if (this._busy || this._isDiscordVerified() || !this._isLoggedIn()) return;
      this._busy = true;
      try {
        SoundManager.playOk();
        preopenPopupForWeb(this);
        await startDiscordVerifyFlowInteractive(this);
        this._applyCacheToUI();
        this._updateButtonsState();
      } catch (e) {
        console.error(e);
        closePreopenedPopup(this);
        this._setHint('Discord verify failed: ' + (e && e.message ? e.message : String(e)));
      } finally {
        this._busy = false;
      }
    }

    async _onItchVerifyClick() {
     //  Itch认证流程
      if (this._busy || this._isItchVerified()) return;
      this._busy = true;
      try {
        SoundManager.playOk();
        if (!this._isLoggedIn()) {
          //  未登录无法验证
          let text = window?.systemFeatureText?.memberMenu?.itchVerifyAlert || 'itch Verify Alert';
          alert(text, { align: "left" });
          this._busy = false;
          return;       
        }
        preopenPopupForWeb(this);
        await startItchVerifyFlowInteractive(this);
        this._applyCacheToUI();
        this._updateButtonsState();
      } catch (e) {
        console.error(e);
        closePreopenedPopup(this);
        this._setHint('itch verify failed: ' + (e && e.message ? e.message : String(e)));
      } finally {
        this._busy = false;
      }
    }

    update() {
      super.update();
      // ---- first-time notice blinking & auto-hide ----
      if (this._noticeSprite && this._noticeSprite.visible) {
        const elapsed = Date.now() - (this._noticeStartedAt || 0);

        // 3 秒后自动消失
        if (elapsed >= this._noticeDurationMs) {
          this._noticeSprite.visible = false;
          this._noticeSprite.opacity = 0;
        } else {
          // 闪烁：opacity 在 [80, 255] 来回变化
          const t = elapsed / 1000; // seconds
          const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.4); 
          this._noticeSprite.opacity = Math.floor(40 + wave * 215);
        }
      }

      // ---- additional-provider notice blinking & follow visibility ----
      if (this._itchNoticeSprite) {
        const hasProviderToBind = !!(
          (this._patreonVerifySprite && this._patreonVerifySprite.visible) ||
          (this._itchVerifySprite && this._itchVerifySprite.visible) ||
          (this._discordVerifySprite && this._discordVerifySprite.visible)
        );
        // 所有附加平台均已绑定时，提示也隐藏
        if (!hasProviderToBind) {
          this._itchNoticeSprite.visible = false;
          this._itchNoticeSprite.opacity = 0;
        } else {
          // 按钮可见 -> 提示可见（如果之前被隐藏）
          if (!this._itchNoticeSprite.visible) {
            this._showItchVerifyNotice();
          }
          const elapsed2 = Date.now() - (this._itchNoticeStartedAt || 0);
          // 如需限时消失，启用下面判断；当前 _itchNoticeDurationMs=0 表示常驻
          if (this._itchNoticeDurationMs > 0 && elapsed2 >= this._itchNoticeDurationMs) {
            this._itchNoticeSprite.visible = false;
            this._itchNoticeSprite.opacity = 0;
          } else if (this._itchNoticeSprite.visible) {
            const t2 = elapsed2 / 1000;
            const wave2 = 0.5 + 0.5 * Math.sin(t2 * Math.PI * 2 * 0.4);
            this._itchNoticeSprite.opacity = Math.floor(40 + wave2 * 215);
          }
        }
      }

      if (this._busy) return;

      const mx = TouchInput.x, my = TouchInput.y;
      for (const b of this._btnObjs) {
        if (!b.spr.visible) { b.hover = false; continue; }
        const bmp = b.spr.bitmap;
        const w = bmp.width, h = bmp.height;
        const x = b.spr.x - w * b.spr.anchor.x;
        const y = b.spr.y - h * b.spr.anchor.y;
        b.hover = (mx >= x && mx <= x + w && my >= y && my <= y + h);
      }

      // === Login choice buttons (Patreon / Discord / itch.io) hover & click ===
      for (const b of this._loginChoiceBtns) {
        if (!b.spr || !b.spr.visible) { b.hover = false; continue; }
        const bmp = b.spr.bitmap;
        const bw = bmp && bmp.width ? (bmp.width * b.spr.scale.x) : 0;
        const bh = bmp && bmp.height ? (bmp.height * b.spr.scale.y) : 0;
        const bx = b.spr.x - bw * b.spr.anchor.x;
        const by = b.spr.y - bh * b.spr.anchor.y;
        const hit = (bw > 0 && bh > 0 && mx >= bx && mx <= bx + bw && my >= by && my <= by + bh);
        if (hit !== b.hover) {
          b.hover = hit;
          b.spr.bitmap = hit ? b.bmpHover : b.bmp;
          if (b.label) b.label.visible = hit;   // 悬停显示平台名，移开即消失
          if (hit) SoundManager.playCursor();
        }
        if (hit && TouchInput.isTriggered()) {
          b.onClick();
          return;
        }
      }

      // === Logout icon hover & click ===
      let logoutHit = false;
      let patreonHit = false;
      let discordHit = false;
      let itchHit = false;
      if (this._logoutSprite && this._logoutSprite.visible) {
        const spr = this._logoutSprite;
        const bmp = spr.bitmap;
        // bitmap 可能还没 ready，先做保护
        const w = bmp && bmp.width ? (bmp.width * spr.scale.x) : 0;
        const h = bmp && bmp.height ? (bmp.height * spr.scale.y) : 0;
        const x = spr.x - w * spr.anchor.x;
        const y = spr.y - h * spr.anchor.y;

        logoutHit = (w > 0 && h > 0 && TouchInput.x >= x && TouchInput.x <= x + w && TouchInput.y >= y && TouchInput.y <= y + h);

        if (logoutHit !== this._logoutHover) {
          this._logoutHover = logoutHit;
          spr.bitmap = logoutHit ? this._logoutBmpHover : this._logoutBmp;
          if (logoutHit) SoundManager.playCursor();
        }
        // 优先处理点击
        if (logoutHit && TouchInput.isTriggered()) {
          this._onLogoutIconClick();
          return; // 阻止点到 logout 的同时触发下面按钮
        }
      }      

      if (this._patreonVerifySprite && this._patreonVerifySprite.visible) {
        const spr = this._patreonVerifySprite;
        const bmp = spr.bitmap;
        const w = bmp && bmp.width ? (bmp.width * spr.scale.x) : 0;
        const h = bmp && bmp.height ? (bmp.height * spr.scale.y) : 0;
        const x = spr.x - w * spr.anchor.x;
        const y = spr.y - h * spr.anchor.y;

        patreonHit = (w > 0 && h > 0 && TouchInput.x >= x && TouchInput.x <= x + w && TouchInput.y >= y && TouchInput.y <= y + h);
        if (patreonHit !== this._patreonVerifyHover) {
          this._patreonVerifyHover = patreonHit;
          spr.bitmap = patreonHit ? this._patreonBmpHover : this._patreonBmp;
          if (this._patreonVerifyLabel) this._patreonVerifyLabel.visible = patreonHit;
          if (patreonHit) SoundManager.playCursor();
        }
        if (patreonHit && TouchInput.isTriggered()) {
          this._onPatreonVerifyClick();
          return;
        }
      }

      if (this._discordVerifySprite && this._discordVerifySprite.visible) {
        const spr = this._discordVerifySprite;
        const bmp = spr.bitmap;
        const w = bmp && bmp.width ? (bmp.width * spr.scale.x) : 0;
        const h = bmp && bmp.height ? (bmp.height * spr.scale.y) : 0;
        const x = spr.x - w * spr.anchor.x;
        const y = spr.y - h * spr.anchor.y;

        discordHit = (w > 0 && h > 0 && TouchInput.x >= x && TouchInput.x <= x + w && TouchInput.y >= y && TouchInput.y <= y + h);
        if (discordHit !== this._discordVerifyHover) {
          this._discordVerifyHover = discordHit;
          spr.bitmap = discordHit ? this._discordBmpHover : this._discordBmp;
          if (this._discordVerifyLabel) this._discordVerifyLabel.visible = discordHit;
          if (discordHit) SoundManager.playCursor();
        }
        if (discordHit && TouchInput.isTriggered()) {
          this._onDiscordVerifyClick();
          return;
        }
      }

      if (this._itchVerifySprite && this._itchVerifySprite.visible) {
        const spr = this._itchVerifySprite;
        const bmp = spr.bitmap;
        const w = bmp && bmp.width ? (bmp.width * spr.scale.x) : 0;
        const h = bmp && bmp.height ? (bmp.height * spr.scale.y) : 0;
        const x = spr.x - w * spr.anchor.x;
        const y = spr.y - h * spr.anchor.y;

        itchHit = (w > 0 && h > 0 && TouchInput.x >= x && TouchInput.x <= x + w && TouchInput.y >= y && TouchInput.y <= y + h);
        if (itchHit !== this._itchVerifyHover) {
          this._itchVerifyHover = itchHit;
          spr.bitmap = itchHit ? this._itchBmpHover : this._itchBmp;
          if (this._itchVerifyLabel) this._itchVerifyLabel.visible = itchHit;
          if (itchHit) SoundManager.playCursor();
        }
        if (itchHit && TouchInput.isTriggered()) {
          this._onItchVerifyClick();
          return;
        }
      }

      if (TouchInput.isTriggered()) {
        for (let i = 0; i < this._btnObjs.length; i++) {
        const b = this._btnObjs[i];
        if (!b.hover) continue;

        // 0: Cloud Save（暂时：仅需登录）
        if (i === 0) {
          const enabled = true;
          if (!enabled) { SoundManager.playBuzzer(); break; }
        }
        // 1: Major Update（需登录+赞助）
        if (i === 1) {
          const enabled = true; // this._isLoggedIn() && this._isSponsor();
          if (!enabled) { SoundManager.playBuzzer(); break; }
        }

        b.onClick();
        break;
        }
      }

      if (Input.isTriggered('cancel') || TouchInput.isCancelled()) {
        SoundManager.playCancel();
        // 登录方式选择展开时：先收起并还原登录按钮，不退出场景
        if (this._loginChoiceVisible && !this._isLoggedIn()) {
          this._setLoginChoiceVisible(false);
          this._setHint(loadLocalization('notLoggedIn'));
          return;
        }
        SceneManager.pop();
      }
    }
  }

  window.Scene_PatreonVerify = Scene_PatreonVerify;

})();
