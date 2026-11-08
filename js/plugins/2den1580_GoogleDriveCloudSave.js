(() => {
  'use strict';

  const CLIENT_ID = '234536547720-repcba7u7om020oagscbgbja15u5vore.apps.googleusercontent.com';
  const REDIRECT_URI = 'http://127.0.0.1:42813/callback';
  const OAUTH_SCOPE = 'openid profile email https://www.googleapis.com/auth/drive.file';
  const FILES_API = 'https://www.googleapis.com/drive/v3/files';
  const TOKEN_STORAGE_KEY = 'gm_google_auth';
  const LOCAL_SERVER_PORT = 42813;

  const CFG = {
    avatarRatio: 0.20,
    button: { wFactor: 0.6, h: 64, fontSize: 36 },
    welcomePrefix: 'Welcome, '
  };

  // ----------------------------
  // Login error mapping (GooglePlus plugin / Google Play services codes)
  // ----------------------------
  const LOGIN_ERROR_MAP = {
    4:  { en: 'Sign-in required. Please sign in to a Google account on the device.', zh: '需要登录Google账号。请先在系统里登录Google账号。', ja: 'Googleアカウントへのログインが必要です。端末でGoogleにログインしてください。' },
    7:  { en: 'Network error. Please check your internet connection and try again.', zh: '网络错误。请检查网络后重试。', ja: 'ネットワークエラーです。通信状況を確認して再試行してください。' },
    8:  { en: 'Internal error. Please try again later.', zh: '内部错误，请稍后重试。', ja: '内部エラーです。しばらくしてから再試行してください。' },
    10: { en: 'Developer configuration/signature error. (APK signature / SHA-1 / OAuth config mismatch)', zh: '签名或OAuth配置错误（可能是APK签名/证书SHA-1/包名配置不匹配）。', ja: '署名またはOAuth設定エラー（APK署名/SHA-1/パッケージ名の不一致の可能性）。' },
    13: { en: 'Canceled by user.', zh: '用户已取消登录。', ja: 'ユーザーがログインをキャンセルしました。' },
    16: { en: 'Timeout. Please try again.', zh: '登录超时，请重试。', ja: 'タイムアウトしました。再試行してください。' },
    17: { en: 'Google API not connected. (Google Play services unavailable/disabled/outdated)', zh: '无法连接Google服务（Google Play服务不可用、被禁用或版本过旧）。', ja: 'Googleサービスに接続できません（Google Play開発者サービスが無効/未対応/古い可能性）。' }
  };
  
  function _langKey() {
    if (ConfigManager.language === 0) return 'zh';
    if (ConfigManager.language === 1) return 'ja';
    return 'en';
  }

  function _extractLoginErrorCode(err) {
    // googleplus plugin 返回值形态不一，这里尽量兼容
    if (err == null) return null;
    if (typeof err === 'number' && Number.isFinite(err)) return err;

    // 常见字段：status / code / error / errorCode
    const cand = [err.status, err.code, err.errorCode, err.error, err.message];
    for (let i = 0; i < cand.length; i++) {
      const v = cand[i];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string') {
        const m = v.match(/(^|[^\d])(\d{1,3})([^\d]|$)/);
        if (m) return Number(m[2]);
      }
    }

    // 有些会把错误包在 JSON 字符串里
    try {
      const s = JSON.stringify(err);
      const m = s && s.match(/(^|[^\d])(\d{1,3})([^\d]|$)/);
      if (m) return Number(m[2]);
    } catch (e) {}

    return null;
  }

  function _formatLoginErrorAlert(err) {
    const code = _extractLoginErrorCode(err);
    const lang = _langKey();

    if (code != null && LOGIN_ERROR_MAP[code]) {
      const base = LOGIN_ERROR_MAP[code][lang] || LOGIN_ERROR_MAP[code].en;
      if (lang === 'zh') {
        return `登录失败（错误码 ${code}）\n${base}\n\n建议：\n- 确认已安装并启用 Google Play 服务\n- 更新 Google Play 服务 / Play 商店\n- 确认设备已登录 Google 账号`;
      }
      if (lang === 'ja') {
        return `ログイン失敗（エラーコード ${code}）\n${base}\n\n対処：\n- Google Play開発者サービスが有効か確認\n- Google Play開発者サービス/Playストアを更新\n- 端末でGoogleアカウントにログイン`;
      }
      return `Login failed (code ${code})\n${base}\n\nTips:\n- Ensure Google Play services is installed/enabled\n- Update Google Play services / Play Store\n- Make sure a Google account is signed in on the device`;
    }

    // 映射不到：维持原行为（给开发排查用）
    return 'Login error: ' + (() => { try { return JSON.stringify(err); } catch (e) { return String(err); } })();
  }
  
  const auth = {
    set(data) {
      try {
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(data));
      } catch (e) { console.error(e) }
    },
    get() {
      try {
        const data = localStorage.getItem(TOKEN_STORAGE_KEY);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    del() {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  };

  const httpSend = (() => {
    const send = ({ url, token, body, method = 'GET', responseType = 'json' }) =>
      new Promise((resolve, reject) => httpRequest(url, {
        body,
        method,
        responseType,
        headers: token ? { Authorization: 'Bearer ' + token } : {}
      }).then(data => resolve(data)).catch(err => reject(err)))

    return {
      getJson: (url, token) => send({ url, token }),
      getText: (url, token) => send({ url, token, responseType: 'text' }),
      postJson: (url, body, token) => send({ url, token, body, method: 'POST' })
    }
  })();

  const localFilePath = (savefileId) => {
    if (savefileId < 0) return 'config.rpgsave';
    if (savefileId === 0) return 'global.rpgsave';
    return `file${String(savefileId)}.rpgsave`.replace('file', 'file');
  };

  // 玩家现在玩的是 MZ 版：上传、以及下载 MZ 存档时的直接写盘，都用 MZ 名（.rmmzsave）。
  //   localFilePath(.rpgsave) 仅用于识别 Drive 上遗留的【旧 MV 存档】（下载时才需要转换）。
  const mzSaveName  = (sid) => (sid < 0 ? 'config' : sid === 0 ? 'global' : 'file' + String(sid));
  const mzDriveName = (sid) => mzSaveName(sid) + '.rmmzsave';

  const validateToken = (token) => {
    if (!token) return Promise.resolve(false);
    const url = `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`;
    return httpSend.getJson(url, null)
      .then(info => {
        if (!info?.error_description) return true;
        return false;
      }).catch(() => false);
  };

  const findDriveFolderByName = (name, token, parentId) => {
    const safeName = name.replace(/'/g, "\\'");
    let q = `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) q += ` and '${parentId}' in parents`;
    const url = `${FILES_API}?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`;
    return httpSend.getJson(url, token).then((json) => (json && json.files && json.files.length > 0) ? json.files[0].id : null);
  };

  const createDriveFolder = async (name, token, parentId) => {
    const existingId = await findDriveFolderByName(name, token, parentId);
    if (existingId) return existingId;
    const body = { name, mimeType: 'application/vnd.google-apps.folder' };
    if (parentId) body.parents = [parentId];
    const resp = await httpSend.postJson(FILES_API, body, token);
    if (resp && resp.id) return resp.id;
    return findDriveFolderByName(name, token, parentId);
  };

  const listFilesInFolder = (folderId, token) => {
    const q = `'${folderId}' in parents and trashed = false`;
    const url = `${FILES_API}?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1000`;
    return httpSend.getJson(url, token).then((json) => (json && json.files) ? json.files : []);
  };

  const ensureNLCHSavePath = (token) => createDriveFolder('NLCH', token, null).then((nlchId) => createDriveFolder('save', token, nlchId));

  const findFileInFolderByName = (name, folderId, token) => {
    const safeName = name.replace(/'/g, "\\'");
    const q = `name = '${safeName}' and '${folderId}' in parents and trashed = false`;
    const url = `${FILES_API}?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`;
    return httpSend.getJson(url, token).then((json) => (json && json.files && json.files.length > 0) ? json.files[0].id : null);
  };

  const uploadMedia = (fileId, contentString, token, onProgress) => {
    const url = `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`;
    return new Promise((resolve, reject) => {
      httpRequest(url, {
        method: 'PATCH',
        responseType: 'json',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'text/plain'
        },
        onupprogress(progress) {
          if (progress.lengthComputable) onProgress?.(progress.loaded / progress.total);
        },
        body: contentString,
        usePluginHttp: false,
      }).then(data => resolve(data)).catch((err) => reject(err));
    });
  };

  const createOrUpdateFile = async (name, folderId, contentString, token, onProgress) => {
    const fileId = await findFileInFolderByName(name, folderId, token);
    if (fileId) return uploadMedia(fileId, contentString, token, onProgress);
    const resp = await httpSend.postJson(FILES_API, { name, parents: [folderId] }, token);
    const newId = resp && resp.id ? resp.id : null;
    if (!newId) return resp;
    return uploadMedia(newId, contentString, token, onProgress);
  };

  const downloadFileContentById = (fileId, token, onProgress) => {
    const url = `${FILES_API}/${encodeURIComponent(fileId)}?alt=media`;
    const normalizeDownloadedText = (txt) => {
      if (txt == null) return '';
      if (typeof txt === 'object') {
        if (typeof txt.data === 'string') return txt.data;
        try { return JSON.stringify(txt); } catch { return String(txt); }
      }
      return String(txt);
    };
    return new Promise((resolve, reject) =>
      httpRequest(url, {
        headers: {
          Authorization: 'Bearer ' + token
        },
        onprogress(progress) {
          if (progress.lengthComputable) onProgress?.(progress.loaded / progress.total);
        }
      })
        .then(data => resolve(normalizeDownloadedText(data)))
        .catch(err => reject(err)));
  };

  const compressString = (str) => {
    if (typeof LZString !== 'undefined' && LZString && LZString.compressToBase64) {
      return LZString.compressToBase64(str);
    } else {
      try { return btoa(unescape(encodeURIComponent(str))); } catch (e) { return str; }
    }
  };

  const decompressString = (str) => {
    if (typeof LZString !== 'undefined' && LZString && LZString.decompressFromBase64) {
      return LZString.decompressFromBase64(str);
    } else {
      try { return decodeURIComponent(escape(atob(str))); } catch (e) { return str; }
    }
  };

  const drawCircleBitmap = (size, bgColor, imageUrl, onReady) => {
    const bmp = new Bitmap(size, size);
    const ctx = bmp._context;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = bgColor || '#666';
    ctx.fill();
    ctx.restore();

    if (!imageUrl) {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.font = Math.floor(size * 0.5) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', size / 2, size / 2);
      ctx.restore();
      bmp._setDirty();
      if (onReady) onReady(bmp);
      return bmp;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const aspect = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (aspect > 1) {
        sw = img.height; sx = Math.floor((img.width - img.height) / 2);
      } else if (aspect < 1) {
        sh = img.width; sy = Math.floor((img.height - img.width) / 2);
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
      ctx.restore();
      bmp._setDirty();
      if (onReady) onReady(bmp);
    };
    img.onerror = () => {
      bmp._setDirty();
      if (onReady) onReady(bmp);
    };
    img.src = imageUrl;
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
    bmp._setDirty();
    return bmp;
  };

  class Scene_GoogleDrive extends Scene_MenuBase {
    constructor() {
      super();
      this._auth = auth.get();
      this._avatarSprite = null;
      this._welcomeSprite = null;
      this._driveHintSprite = null;
      this._btnObjs = [];
      this._foundDriveSaves = false;
      this._server = null;
      this._popupWindow = null;
      this._progressOverlay = null;
      this._progressText = null;
      this._progressCurrent = 0;
      this._progressTarget = 0;
      this._progressAnimTimer = null;
      this._progressMessage = '';
      this._messageListener = null;
      this._terminated = false;

      this.userinfoAPI = "https://www.googleapis.com/oauth2/v3/userinfo";

      const authW = 500;
      const authH = 700;
      const authLeft = (window.screen.width - authW) / 2;
      const authTop = (window.screen.height - authH) / 2;
      this.authWindowStyle = `width=${authW},height=${authH},left=${authLeft},top=${authTop}`;
    }

    create() {
      super.create();
      this.createUI();
      if (this._auth && this._auth.token) {
        const token = this._auth.token;
        validateToken(token).then((valid) => {
          if (!valid) {
            // 等待验证时可能已重新登录，不能清掉新的凭据。
            if (!this._auth || this._auth.token !== token) return;
            auth.del();
            this._auth = null;
            if (!this._terminated) this._refreshUIAfterAuthChange();
          } else {
            // 玩家已退出登录、换用新 Token 或离开场景时，丢弃旧回调。
            if (this._terminated || !this._auth || this._auth.token !== token) return;
            return this._ensureDriveAndCheckSaves(token);
          }
        }).catch((err) => console.error('Token validation error', err));
      }
    }

    createUI() {
      const w = Graphics.width, h = Graphics.height;
      const minSide = Math.min(w, h);
      const avatarSize = Math.floor(minSide * CFG.avatarRatio);
      const btnW = Math.floor(w * 0.24);
      const btnH = Math.floor(CFG.button.h * 0.85);
      const gap = 12;
      const totalW = btnW * 2 + gap;
      const self = this;

      this._avatarSprite = new Sprite(new Bitmap(avatarSize, avatarSize));
      const avatarUrl = this._auth && this._auth.avatar ? this._auth.avatar : null;
      drawCircleBitmap(avatarSize, '#555', avatarUrl, (bmp) => { self._avatarSprite.bitmap = bmp; });
      this._avatarSprite.anchor.set(0.5, 0);
      this._avatarSprite.x = Math.floor(w / 2);
      this._avatarSprite.y = Math.floor(h * 0.06);
      this.addChild(this._avatarSprite);

      const welcomeBmp = new Bitmap(w, 36);
      welcomeBmp.clear(); welcomeBmp.fontSize = 20;
      if (this._auth && this._auth.name) welcomeBmp.drawText(CFG.welcomePrefix + this._auth.name, 0, 0, w, 36, 'center');
      this._welcomeSprite = new Sprite(welcomeBmp);
      this._welcomeSprite.x = 0; this._welcomeSprite.y = this._avatarSprite.y + avatarSize + 12;
      this.addChild(this._welcomeSprite);

      this._driveHintSprite = new Sprite(new Bitmap(w, 24));
      this._driveHintSprite.x = 0; this._driveHintSprite.y = this._welcomeSprite.y + 36;
      this.addChild(this._driveHintSprite);

      let SaveToDrive = 'Save to Drive';
      let LoadFromDrive = 'Load from Drive';
      if (ConfigManager.language === 0) {
        SaveToDrive = '上传云存档';
        LoadFromDrive = '下载云存档';
      }
      if (ConfigManager.language === 1) {
        SaveToDrive = 'クラウドアップロード';
        LoadFromDrive = 'クラウドダウンロード';
      }

      const saveBmp = makeButtonBitmap(SaveToDrive, btnW, btnH, 24);
      const loadBmp = makeButtonBitmap(LoadFromDrive, btnW, btnH, 24);
      const saveSpr = new Sprite(saveBmp); saveSpr.anchor.set(0, 0.5);
      const loadSpr = new Sprite(loadBmp); loadSpr.anchor.set(0, 0.5);
      saveSpr.x = Math.floor((Graphics.width - totalW) / 2); saveSpr.y = Math.floor(h - btnH - 120);
      loadSpr.x = saveSpr.x + btnW + gap; loadSpr.y = saveSpr.y;
      this.addChild(saveSpr); this.addChild(loadSpr);
      this._btnObjs.push({ spr: saveSpr, onClick: this._onSaveToDrive.bind(this), hover: false });
      this._btnObjs.push({ spr: loadSpr, onClick: this._onLoadFromDrive.bind(this), hover: false });

      let Logout = 'Logout', Login = 'Login';
      if (ConfigManager.language === 0) { Logout = '退出登录'; Login = '登录Drive'; }
      if (ConfigManager.language === 1) { Logout = 'ログアウト'; Login = 'ログイン'; }
      const label = (this._auth && this._auth.token) ? Logout : Login;
      const mainBmp = makeButtonBitmap(label, totalW, btnH, CFG.button.fontSize);
      const mainSpr = new Sprite(mainBmp); mainSpr.anchor.set(0.5, 0.5);
      mainSpr.x = Math.floor(w / 2); mainSpr.y = Math.floor(h - btnH - 40);
      this.addChild(mainSpr);
      this._btnObjs.push({ spr: mainSpr, onClick: this._onMainButtonClick.bind(this), hover: false });

      SoundManager.playOk();
      this._updateButtonsState();
    }

    _updateButtonsState() {
      const logged = this._auth && this._auth.token;
      if (this._btnObjs[2]) {
        const w = Graphics.width;
        const btnW = Math.floor(w * 0.24);
        const gap = 12;
        const totalW = btnW * 2 + gap;
        let Logout = 'Logout', Login = 'Login';
        if (ConfigManager.language === 0) { Logout = '退出登录'; Login = '登录Drive'; }
        if (ConfigManager.language === 1) { Logout = 'ログアウト'; Login = 'ログイン'; }
        const mainLabel = logged ? Logout : Login;
        this._btnObjs[2].spr.bitmap = makeButtonBitmap(mainLabel, totalW, CFG.button.h, CFG.button.fontSize);
      }
      for (let i = 0; i < 2; i++) {
        const btnH = Math.floor(CFG.button.h * 0.85);
        if (this._btnObjs[i]) {
          const btnW = this._btnObjs[i].spr.bitmap.width;
          let SaveToDrive = 'Save to Drive', LoadFromDrive = 'Load from Drive';
          if (ConfigManager.language === 0) { SaveToDrive = '上传云存档'; LoadFromDrive = '下载云存档'; }
          if (ConfigManager.language === 1) { SaveToDrive = 'クラウドアップロード'; LoadFromDrive = 'クラウドダウンロード'; }
          const currentLabel = (i === 0) ? SaveToDrive : LoadFromDrive;
          this._btnObjs[i].spr.bitmap = makeButtonBitmap(currentLabel, btnW, btnH, 24);
          this._btnObjs[i].spr.opacity = logged ? 255 : 140;
        }
      }
    }

    start() {
      super.start();
      const self = this;
      this._messageListener = (ev) => {
        if (!ev || !ev.data || typeof ev.data !== 'string') return;
        if (ev.data.indexOf('access_token') === -1) return;
        window.removeEventListener('message', self._messageListener, false);
        const frag = ev.data.replace(/^#?/, '');
        const params = new URLSearchParams(frag);
        const token = params.get('access_token');
        if (token) {
          try { if (self._popupWindow && typeof self._popupWindow.close === 'function') self._popupWindow.close(); } catch (e) { }
          try { if (self._server) { self._server.close(); self._server = null; } } catch (e) { }

          validateToken(token).then((valid) => {
            if (!valid) { alert('Invalid token received.'); return; }
            httpSend.getJson(this.userinfoAPI, token).then((profile) => {
              const name = profile.name || (profile.email ? profile.email.split('@')[0] : '');
              const avatar = profile.picture || null;
              self._auth = { token, name, avatar };
              auth.set(self._auth);
              self._refreshUIAfterAuthChange();
              self._ensureDriveAndCheckSaves(token).catch((err) => console.error('Drive check', err));
              alert('Login success');
            }).catch((err) => {
              console.error('profile fetch', err);
              self._auth = { token, name: '', avatar: null };
              auth.set(self._auth);
              self._refreshUIAfterAuthChange();
              self._ensureDriveAndCheckSaves(token).catch((e) => console.error(e));
              alert('Login success (token obtained).');
            });
          });
        }
      };
      window.addEventListener('message', this._messageListener, false);
    }

    terminate() {
      this._terminated = true;
      super.terminate();
      if (this._messageListener) {
        window.removeEventListener('message', this._messageListener, false);
      }
      try { if (this._server) { this._server.close(); this._server = null; } } catch (e) { }
      if (this._popupWindow && !this._popupWindow.closed) {
        try { this._popupWindow.close(); } catch (e) { }
      }
    }

    update() {
      if (this._busy) {
        // 忙碌（上传/下载进行中）：所有按钮压暗，表示锁定中
        for (let bi = 0; bi < this._btnObjs.length; bi++) {
          const b = this._btnObjs[bi];
          if (!b) continue;
          b.hover = false;
          b.spr.opacity = 100;
        }
        return;
      }
      super.update();
      const mx = TouchInput.x, my = TouchInput.y;
      const logged = this._auth && this._auth.token;
      for (let bi = 0; bi < this._btnObjs.length; bi++) {
        const b = this._btnObjs[bi];
        const bmp = b.spr.bitmap;
        const w = bmp.width, h = bmp.height;
        const x = b.spr.x - w * b.spr.anchor.x;
        const y = b.spr.y - h * b.spr.anchor.y;
        const isSaveLoad = (bi === 0 || bi === 1);
        const hover = (mx >= x && mx <= x + w && my >= y && my <= y + h) && (!isSaveLoad || logged);
        if (hover && !b.hover) SoundManager.playCursor();
        b.hover = hover;
        if (!isSaveLoad) {
          b.spr.opacity = b.hover ? 255 : 200;
        } else {
          b.spr.opacity = logged ? (b.hover ? 255 : 200) : 140;
        }
      }

      if (TouchInput.isTriggered()) {
        for (let ii = 0; ii < this._btnObjs.length; ii++) {
          const bb = this._btnObjs[ii];
          if (bb.hover) {
            try {
              if ((ii === 0 || ii === 1) && !(this._auth && this._auth.token)) { SoundManager.playCancel(); continue; }
              bb.onClick();
            } catch (e) { console.error(e); }
            break;
          }
        }
      }

      if (Input.isTriggered('cancel') || TouchInput.isCancelled()) {
        SoundManager.playCancel();
        SceneManager.pop();
      }
    }

    async _onMainButtonClick() {
      if (this._auth && this._auth.token) {
        SoundManager.playCancel();
        auth.del();
        this._auth = null;
        this._foundDriveSaves = false;
        this._refreshUIAfterAuthChange();
        try { if (this._server) { this._server.close(); this._server = null; } } catch (e) { }
        return;
      }

      let textArray = window.systemFeatureText && window.systemFeatureText.cloudSaveServiceWarning;
      if (!textArray) textArray = "This application will request access to your Google Drive to store game save files in the folder 'NLCH/save'. /nFiles saved there will be visible in your Google Drive. /nDo you allow granting access?";
      const consentMsg = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
      const consent = await confirm(consentMsg, { width: 500, align: "left" });
      if (consent) {
        if (Utils.isMobileDevice()) {
          setTimeout(() => { try { this._mobileLogin(); } catch (e) { console.error(e); } }, 60);
        } else {
          let popup = null;
          try { popup = window.open('', '_blank', this.authWindowStyle); } catch (e) { popup = null; }
          setTimeout(() => { try { this._desktopLogin(popup); } catch (e) { console.error(e); } }, 60);
        }
      }
    };

    _refreshUIAfterAuthChange() {
      const w = Graphics.width, h = Graphics.height;
      const minSide = Math.min(w, h);
      const avatarSize = Math.floor(minSide * CFG.avatarRatio);
      const avatarUrl = this._auth && this._auth.avatar ? this._auth.avatar : null;
      drawCircleBitmap(avatarSize, '#555', avatarUrl, (bmp) => { this._avatarSprite.bitmap = bmp; });

      const welcomeName = (this._auth && this._auth.name) ? (CFG.welcomePrefix + this._auth.name) : '';
      const wb = new Bitmap(w, 36); wb.clear(); wb.fontSize = 20;
      if (welcomeName) wb.drawText(welcomeName, 0, 0, w, 36, 'center');
      this._welcomeSprite.bitmap = wb;

      const hintBmp = new Bitmap(w, 24); hintBmp.clear(); hintBmp.fontSize = 16;
      let SavesFound = 'Saves found on Google Drive';
      if (ConfigManager.language === 0) SavesFound = '已确认云端存在存档文件';
      if (ConfigManager.language === 1) SavesFound = 'クラウド上にセーブデータが存在することを確認しました';
      if (this._foundDriveSaves) hintBmp.drawText(SavesFound, 0, 0, w, 30, 'center');
      this._driveHintSprite.bitmap = hintBmp;

      this._updateButtonsState();
    };

    _mobileLogin() {
      if (!window.plugins || !window.plugins.googleplus || !window.plugins.googleplus.login) {
        alert('GooglePlus plugin not available. Make sure plugin installed.');
        return;
      }
      const LOGIN_OPTS = { scopes: OAUTH_SCOPE, webClientId: CLIENT_ID, offline: false };
      window.plugins.googleplus.login(LOGIN_OPTS,
        (res) => {
          const token = res.accessToken || (res.authResponse && res.authResponse.accessToken) || null;
          const name = res.displayName || res.userName || (res.email ? res.email.split('@')[0] : '');
          const avatar = (res.imageUrl || res.photoUrl || (res.user && res.user.imageUrl)) || null;
          if (token) {
            validateToken(token).then((valid) => {
              if (!valid) { alert('Invalid token received.'); return; }
              this._auth = { token, name, avatar };
              auth.set(this._auth);
              this._refreshUIAfterAuthChange();
              this._ensureDriveAndCheckSaves(token).catch((err) => console.error('Drive check', err));
              alert('Login success');
            });
          } else {
            console.warn('googleplus.login did not return accessToken. Response:', res);
            alert('Plugin returned serverAuthCode or no access token.');
          }
        },
        (err) => {
          console.error('googleplus.login error', err);
          alert(_formatLoginErrorAlert(err));
        }
      );
    };

    _desktopLogin(popupWindow) {
      const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
        + `?client_id=${encodeURIComponent(CLIENT_ID)}`
        + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
        + '&response_type=token'
        + `&scope=${encodeURIComponent(OAUTH_SCOPE)}`
        + '&prompt=select_account';

      try { if (this._server) { this._server.close(); this._server = null; } } catch (e) { }

      let popup = popupWindow || null;
      let serverStarted = false;
      try {
        if (typeof require === 'function') {
          const http = require('http');
          const url = require('url');
          this._server = http.createServer((req, res) => {
            const parsed = url.parse(req.url);
            if (parsed.pathname === '/callback') {
              const html = `<!doctype html><html><head><meta charset="utf-8"><title>OAuth callback</title></head><body><script>(function(){
                try{
                  var h=window.location.hash||'';
                  if(window.opener && window.opener.postMessage){
                    window.opener.postMessage(h, '*');
                    document.body.innerText='Login complete. Please wait for the application to close this window, or close it manually.';
                    setTimeout(()=>window.close(), 1000);
                  } else {
                    document.body.innerText='Login complete, but cannot communicate with app. Copy this link and paste it into the app, or manually close this window: ' + window.location.href;
                  }
                }catch(e){
                  document.body.innerText='Error in callback script: '+e;
                }
              })();</script></body></html>`;
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html);
            } else {
              res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('OAuth local callback server');
            }
          });

          this._server.on('error', (e) => {
            console.error('Local server error (might be address in use):', e);
            serverStarted = false;
          });

          this._server.listen(LOCAL_SERVER_PORT, '127.0.0.1', () => { serverStarted = true; });
        }
      } catch (e) {
        console.warn('Local server creation failed (likely not NW.js/Electron environment):', e);
        serverStarted = false;
      }

      try {
        if (!popup || popup.closed) {
          popup = window.open(authUrl, '_blank', this.authWindowStyle);
        } else {
          popup.location.href = authUrl;
        }
        this._popupWindow = popup;
      } catch (e) {
        console.error('Error opening popup window:', e);
        this._popupWindow = null;
      }
      setTimeout(() => {
        try {
          if (this._server) {
            console.log('Closing local OAuth server after 5 minutes.');
            this._server.close(); this._server = null;
          }
        } catch (e) { }
      }, 1000 * 60 * 5);
    };

    _handleToken(token) {
      validateToken(token).then((valid) => {
        if (!valid) { alert('Received invalid token.'); return; }
        httpSend.getJson(this.userinfoAPI, token).then((profile) => {
          const name = profile.name || (profile.email ? profile.email.split('@')[0] : '');
          const avatar = profile.picture || null;
          this._auth = { token, name, avatar };
          auth.set(this._auth);
          this._refreshUIAfterAuthChange();
          this._ensureDriveAndCheckSaves(token).catch((err) => console.error('Drive check', err));
          alert('Login success');
        }).catch((err) => {
          console.error('profile fetch', err);
          this._auth = { token, name: '', avatar: null };
          auth.set(this._auth);
          this._refreshUIAfterAuthChange();
          this._ensureDriveAndCheckSaves(token).catch((e) => console.error(e));
          alert('Login success (token obtained).');
        });
      });
    };

    _ensureDriveAndCheckSaves(token) {
      return ensureNLCHSavePath(token).then((saveFolderId) => {
        if (!saveFolderId) return false;
        return listFilesInFolder(saveFolderId, token).then((files) => {
          const fileNames = files.map((f) => f.name);
          const targets = [];
          // MV 名(.rpgsave)与 MZ 名(.rmmzsave)都纳入检测：
          //   纯 MZ 玩家(Drive 上只有 .rmmzsave)也能正确判定为「云端存在存档」。
          targets.push(localFilePath(-1), mzDriveName(-1));
          targets.push(localFilePath(0),  mzDriveName(0));
          for (let i = 1; i <= 20; i++) { targets.push(localFilePath(i), mzDriveName(i)); }
          let found = false;
          for (let t = 0; t < targets.length; t++) { if (fileNames.indexOf(targets[t]) !== -1) { found = true; break; } }
          this._foundDriveSaves = !!found;
          this._refreshUIAfterAuthChange();
          return found;
        });
      }).catch((err) => { console.error('ensureDriveAndCheckSaves error', err); return false; });
    };

    _setProgressTarget(targetPercent, message) {
      try {
        targetPercent = (typeof targetPercent === 'number') ? Math.max(0, Math.min(100, Math.round(targetPercent))) : 0;
        this._progressTarget = targetPercent;
        if (message) this._progressMessage = message;
        if (this._progressAnimTimer) return;
        if (!this._progressOverlay) {
          const w = Graphics.width, h = Graphics.height;
          this._progressOverlay = new Sprite(new Bitmap(w, h));
          this._progressOverlay.bitmap.clear();
          this._progressOverlay.opacity = 200;
          this.addChild(this._progressOverlay);
          this._progressText = new Sprite(new Bitmap(w, 48));
          this._progressText.x = 0; this._progressText.y = Math.floor(h / 2 - 24);
          this.addChild(this._progressText);
        }
        const self = this;
        this._progressAnimTimer = setInterval(() => {
          const cur = self._progressCurrent || 0;
          const tgt = self._progressTarget || 0;
          if (cur >= tgt) {
            if (cur >= 100) { clearInterval(self._progressAnimTimer); self._progressAnimTimer = null; }
            self._updateProgressDisplay(cur, self._progressMessage || '');
            return;
          }
          const step = Math.max(1, Math.round((tgt - cur) * 0.25));
          self._progressCurrent = Math.min(100, cur + step);
          self._updateProgressDisplay(self._progressCurrent, self._progressMessage || '');
          if (self._progressCurrent >= tgt && tgt >= 100) { clearInterval(self._progressAnimTimer); self._progressAnimTimer = null; }
        }, 80);
      } catch (e) { console.error(e); }
    };

    _updateProgressDisplay(percent, message) {
      try {
        if (!this._progressText) return;
        const txt = (message ? message + ' ' : '') + (typeof percent === 'number' ? String(Math.min(100, Math.max(0, Math.round(percent)))) + '%' : '...');
        const bmp = this._progressText.bitmap;
        bmp.clear(); bmp.fontSize = 24; bmp.drawText(txt, 0, 0, bmp.width, 48, 'center');
      } catch (e) { console.error(e); }
    };

    _hideProgress() {
      try {
        if (this._progressAnimTimer) { clearInterval(this._progressAnimTimer); this._progressAnimTimer = null; }
        this._progressCurrent = 0; this._progressTarget = 0; this._progressMessage = '';
        if (this._progressOverlay) { try { this.removeChild(this._progressOverlay); } catch (e) { } this._progressOverlay = null; }
        if (this._progressText) { try { this.removeChild(this._progressText); } catch (e) { } this._progressText = null; }
      } catch (e) { console.error(e); }
    };

    async _onSaveToDrive() {
      // 正在进行流程时忽略新的点击
      if (this._busy) return;
      this._busy = true;
      try {
        if (!(this._auth && this._auth.token)) {
          let alertText = 'Not logged in.';
          if (ConfigManager.language === 0) alertText = '登录失败或没有登录信息！';
          if (ConfigManager.language === 1) alertText = 'ログインに失敗した、またはログイン情報がありません。';
          alert(alertText);
          return;
        }
        const token = this._auth.token;

        const folderId = await ensureNLCHSavePath(token);
        if (!folderId) {
          alert('Failed to find/create save folder.');
          return;
        }

        // 确保 LZString 已加载：MZ 存档是 pako 二进制串，需 LZString 做无损 base64 往返。
        if (window.ShiroinSaveUI && window.ShiroinSaveUI.ensureLZString) {
          try { await window.ShiroinSaveUI.ensureLZString(); } catch (e) {}
        }

        const ids = [-1, 0];
        for (let i = 1; i <= 20; i++) ids.push(i);

        let uploadedCount = 0;
        const filesToProcess = [];
        for (const sid of ids) {
          let rawData = null;
          const saveName = mzSaveName(sid);   // "config"/"global"/"fileN" —— 读 MZ 存档的正确名字
          try {
            // MZ 统一入口会按实际运行环境选择存储后端：
            //   NW.js -> loadFromLocalFile
            //   浏览器/Android WebView -> loadFromForage
            // 本项目的 AndroidSave 适配也正是覆盖 loadFromForage。
            // 不可再调用 MV 的 loadFromWebStorage（MZ 中已不存在）。
            rawData = await StorageManager.loadZip(saveName);
          } catch (e) {
            console.error('Error loading save', sid, e);
            rawData = null;
          }
          if (rawData) filesToProcess.push({ id: sid, rawData });
        }

        const totalFiles = filesToProcess.length;
        if (totalFiles === 0) {
          let alertText = 'No local save data found to upload.';
          if (ConfigManager.language === 0) alertText = '找不到用于上传的本地存档文件！';
          if (ConfigManager.language === 1) alertText = 'アップロードに使用するローカルのセーブデータが見つかりません！';
          alert(alertText);
          return;
        }

        const fileProgressStep = 100 / totalFiles;
        for (let idx = 0; idx < totalFiles; idx++) {
          const fileObj = filesToProcess[idx];
          const sid = fileObj.id;
          const rawData = fileObj.rawData;
          const json = (typeof rawData === 'string') ? rawData : JSON.stringify(rawData);
          const compressed = compressString(json);
          const filename = mzDriveName(sid);   // Drive 上以 MZ 名（.rmmzsave）存放
          const baseProgress = idx * fileProgressStep;

          await createOrUpdateFile(filename, folderId, compressed, token, (fileProgress) => {
            const frac = (typeof fileProgress === 'number' && !isNaN(fileProgress)) ? fileProgress : 0;
            const overall = baseProgress + (frac * fileProgressStep);
            this._setProgressTarget(Math.floor(overall), 'Uploading ' + filename);
          });

          this._setProgressTarget(Math.floor((idx + 1) * fileProgressStep), 'Uploaded ' + filename);
          uploadedCount++;
        }

        this._hideProgress();
        if (uploadedCount > 0) {
          alert('Uploaded ' + uploadedCount + ' save files to Google Drive.');
        } else {
          alert('No local save data found to upload.');
        }
        await this._ensureDriveAndCheckSaves(token);

      } catch (e) {
        console.error('Save to Drive error', e);
        this._hideProgress();
        alert('Save to Drive error: ' + (e && e.message ? e.message : JSON.stringify(e)));
      } finally {
        // 无论成功/失败/中途 return，最后都解除忙碌锁
        this._busy = false;
      }
    };


    async _onLoadFromDrive() {

      if (this._busy) return;
      this._busy = true;

      try {
        if (!(this._auth && this._auth.token)) {
          let alertText = 'Not logged in.';
          if (ConfigManager.language === 0) alertText = '登录失败或没有登录信息！';
          if (ConfigManager.language === 1) alertText = 'ログインに失敗した、またはログイン情報がありません。';
          alert(alertText);
          return;
        }

        const token = this._auth.token;

        let textArray = window.systemFeatureText && window.systemFeatureText.uploadSaveFile;
        if (!textArray) {
          textArray = "Loading saves from Google Drive will overwrite your current local save files. \nContinue?";
        }
        const confirmText = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
        const loadConsent = await confirm(confirmText, { width: 500, align: "left" });
        if (!loadConsent) return;

        // 从这里开始，原先“内层 try”里的逻辑，直接写在同一个 try 里即可
        const folderId = await ensureNLCHSavePath(token);
        if (!folderId) {
          let alertText = 'Save folder not found.';
          if (ConfigManager.language === 0) alertText = '找不到save文件夹！';
          if (ConfigManager.language === 1) alertText = 'saveフォルダが見つかりません！';
          alert(alertText);
          return;
        }

        const files = await listFilesInFolder(folderId, token);
        if (!files || files.length === 0) {
          let alertText = 'No files on Drive.';
          if (ConfigManager.language === 0) alertText = 'Google drive上没有文件！';
          if (ConfigManager.language === 1) alertText = 'Drive上にファイルがありません！';
          alert(alertText);
          return;
        }

        const fileMap = {};
        for (let fi = 0; fi < files.length; fi++) {
          const f = files[fi];
          fileMap[f.name] = f.id;
        }

        const targetIds = [-1, 0];
        for (let j = 1; j <= 20; j++) targetIds.push(j);

        const filesToDownload = [];
        for (const sid of targetIds) {
          const mzName = mzDriveName(sid);    // fileN.rmmzsave —— MZ 存档（玩家现版本，直接写盘）
          const mvName = localFilePath(sid);  // fileN.rpgsave  —— 旧 MV 存档（需转换）
          const hasMz = !!fileMap[mzName];
          const hasMv = !!fileMap[mvName];
          // 识别【该玩家是否已完成此槽位的存档转换】：
          //   · 同号 MV 与 MZ 都在 Drive 上 → 视为已转换过 → 只下 MZ，故意【跳过 MV 下载】，
          //     从而避免重复下载与「已停止转换」警告；Drive 上的 MV 备份保留不动。
          //   · 只有 MZ → 下 MZ。
          //   · 只有 MV（尚未转换过此槽位）→ 下 MV，走转换流程。
          if (hasMz) {
            filesToDownload.push({ sid, name: mzName, fileId: fileMap[mzName], format: 'mz' });
          } else if (hasMv) {
            filesToDownload.push({ sid, name: mvName, fileId: fileMap[mvName], format: 'mv' });
          }
        }
        const totalFiles = filesToDownload.length;
        if (totalFiles === 0) {
          let textArr = window.systemFeatureText && window.systemFeatureText.failedToSyncCloudSave;
          if (!textArr) textArr = "No matching save files found on Drive to restore!";
          const alertText = Array.isArray(textArr) ? textArr.join("\n") : (textArr ?? "");
          alert(alertText);
          return;
        }

        const fileProgressStep = 100 / totalFiles;
        let restored = 0, failed = 0;
        // 确保 LZString 已加载：MZ 存档直接写盘要用它无损解压；MV 转换内部也依赖它。
        if (window.ShiroinSaveUI && window.ShiroinSaveUI.ensureLZString) {
          try { await window.ShiroinSaveUI.ensureLZString(); } catch (e) {}
        }
        // 收集游戏存档槽(sid>0)下载到的 MV .rpgsave 原文(LZString base64)，
        //   循环结束后统一交给 ShiroinSaveUI.importMvSavesFromCloud 做对齐转换。
        const cloudGameSaves = {};

        for (let idx = 0; idx < totalFiles; idx++) {
          const fileObj = filesToDownload[idx];
          const sid = fileObj.sid;
          const name = fileObj.name;
          const fileId = fileObj.fileId;
          const baseProgress = idx * fileProgressStep;

          let compressed = null;
          try {
            compressed = await downloadFileContentById(fileId, token, (fileProgress) => {
              const frac = (typeof fileProgress === 'number' && !isNaN(fileProgress)) ? fileProgress : 0;
              const overall = baseProgress + (frac * fileProgressStep);
              this._setProgressTarget(Math.floor(overall), 'Downloading ' + name);
            });
          } catch (e) {
            compressed = null;
          }

          this._setProgressTarget(Math.floor(baseProgress + fileProgressStep), 'Processing ' + name);

          if (!compressed) {
            failed++;
            alert('Failed to download ' + name + ' from Drive.');
            continue;
          }

          // —— 把下载内容规整成干净字符串 ——
          try {
            if (typeof compressed !== 'string' && compressed !== null && compressed !== undefined) {
              if (typeof compressed.data === 'string') { compressed = compressed.data; }
              else if (compressed instanceof ArrayBuffer) { compressed = (new TextDecoder('utf-8')).decode(new Uint8Array(compressed)); }
              else if (compressed instanceof Uint8Array) { compressed = (new TextDecoder('utf-8')).decode(compressed); }
              else if (compressed instanceof Blob) {
                compressed = await new Promise((res) => {
                  try { const fr = new FileReader(); fr.onload = () => res(String(fr.result || '')); fr.onerror = () => res(''); fr.readAsText(compressed); }
                  catch (e) { res(''); }
                });
              } else { compressed = String(compressed); }
            }
            if (typeof compressed === 'string') {
              const s = compressed.trim();
              if (s.length >= 2 && ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
                  (s.charAt(0) === '\'' && s.charAt(s.length - 1) === '\''))) {
                compressed = s.substring(1, s.length - 1);
              } else { compressed = s; }
            } else { compressed = ''; }
          } catch (e) { compressed = ''; }

          if (!compressed) { failed++; continue; }

          // —— MZ 存档(.rmmzsave)：解压回原始 .rmmzsave 内容(pako 串)，直接写盘，无需转换 ——
          if (fileObj.format === 'mz') {
            const saveName = mzSaveName(sid);   // "config"/"global"/"fileN"
            let mzContent = '';
            try { mzContent = decompressString(compressed); } catch (e) { mzContent = ''; }
            if (!mzContent) { failed++; continue; }
            let ok = false;
            try {
              // 与上传相同，交给 MZ 根据运行环境选择本地文件、
              // localforage 或项目的 AndroidSave 后端。
              await StorageManager.saveZip(saveName, mzContent);
              ok = true;
            } catch (e) { ok = false; }
            if (ok) { restored++; } else { failed++; }
            this._setProgressTarget(Math.floor((idx + 1) * fileProgressStep), 'Saved ' + name + ' locally');
            continue;
          }

          // —— MV 存档(.rpgsave)：游戏槽收集起来，循环后统一转换（带同号 MZ 冲突保护）——
          //   config(-1)/global(0) 的旧 MV 版不恢复（玩家已是 MZ 版）。
          if (sid > 0 && window.ShiroinSaveUI && window.ShiroinSaveUI.importMvSavesFromCloud) {
            cloudGameSaves[sid] = compressed;
          }
          this._setProgressTarget(Math.floor((idx + 1) * fileProgressStep), 'Processing ' + name);
        }

        // 游戏存档：统一用 Shiroin 的转换流程把下载到的 MV 原文对齐转换为可加载的 .rmmzsave。
        if (Object.keys(cloudGameSaves).length > 0 &&
            window.ShiroinSaveUI && window.ShiroinSaveUI.importMvSavesFromCloud) {
          this._setProgressTarget(99, 'Converting saves');
          try {
            const conv = await window.ShiroinSaveUI.importMvSavesFromCloud(cloudGameSaves);
            restored += conv.converted.length;
            failed += conv.failed.length;
            // 同号 MZ 存档已存在 → 拒绝转换这些 MV 存档，三语警告。
            if (conv.conflicted && conv.conflicted.length > 0) {
              const slots = conv.conflicted.join('、');
              let warn;
              switch (ConfigManager.language) {
                case 0:
                  warn = `检测到槽位 ${slots} 已存在同序号的 MZ 存档，已停止这些存档的转换。\n如需转换，请先删除对应的 MZ 存档文件后再试。`;
                  break;
                case 1:
                  warn = `スロット ${slots} に同じ番号の MZ セーブデータが既に存在するため、これらの変換を中止しました。\n変換するには、該当する MZ セーブファイルを削除してから再度お試しください。`;
                  break;
                default:
                  warn = `Slot(s) ${slots} already have an MZ save with the same number, so their conversion was stopped.\nTo convert them, delete the corresponding MZ save file(s) first, then try again.`;
              }
              await alert(warn, { align: 'left' });
            }
          } catch (e) {
            console.error('[CloudSave] MV→MZ 存档转换失败:', e);
            failed += Object.keys(cloudGameSaves).length;
          }
        }

        this._hideProgress();

        // 关键：下载会把 global.rmmzsave / fileN.rmmzsave 直接写盘，但 DataManager._globalInfo
        // 仍是内存里的旧值，导致返回存读档界面看不到新存档（要重启才刷新）。这里同步重载全局信息，立即生效。
        if (restored > 0) {
          try {
            const globalInfo = await StorageManager.loadObject("global");
            DataManager._globalInfo = globalInfo;
            DataManager.removeInvalidGlobalInfo();
          } catch (e) {
            DataManager._globalInfo = [];
          }
        }

        if (restored > 0 || failed > 0) {
          let restoredAlert = `Restored ${restored} save files from Drive.`;
          if (ConfigManager.language === 0) restoredAlert = `从云端总计恢复了${restored}份存档文件！`;
          if (ConfigManager.language === 1) restoredAlert = `クラウドから合計${restored}個のセーブデータを復元しました！`;
          alert(restoredAlert);
        } else {
          let textArr = window.systemFeatureText && window.systemFeatureText.failedToSyncCloudSave;
          if (!textArr) textArr = "No matching save files found on Drive to restore!";
          const alertText = Array.isArray(textArr) ? textArr.join("\n") : (textArr ?? "");
          alert(alertText);
        }

        await this._ensureDriveAndCheckSaves(token);

      } catch (e) {
        this._hideProgress();
        alert('Load from Drive error: ' + (e && e.message ? e.message : JSON.stringify(e)));
      } finally {
        this._busy = false;
      }
    };
  }

  window.Scene_GoogleDrive = Scene_GoogleDrive;
})();
