//=============================================================================
//
//=============================================================================
/*:
 * @target MV MZ
 * @plugindesc [弹幕模板库][卢恩特效模板]
 * @author 仇九
 *
 * @help 
 * 
 *
 */
//=============================================================================
//生成并记录谏言

//=============================================================================
var chahuiUtil = chahuiUtil || {};
const appScript = "https://script.google.com/macros/s/AKfycbxmtGHh6D8jrz5Ca6IBlA4c76h4cKaWSwsztVw5YUvEKAfZlTozfBXmLU4hrXtUvEMg/exec";
Imported.shiroin_requiresOnlineConnection = true;

// 非关键统计请求失败时静默结束，不能影响游戏流程。
chahuiUtil.sendTelemetryRequest = function (url, onSuccess) {
  try {
    return Promise.resolve(httpRequest(url)).then(response => {
      if (typeof onSuccess === "function") onSuccess(response);
      return true;
    }).catch(() => false);
  } catch (error) {
    return Promise.resolve(false);
  }
};

/*:
   steam商店页面广告
 */
QJ.MPMZ.tl.steamStorePageAdvertisement = async function(isIframe) {
   
   let appId = 3238940;
   
   if (isIframe) {
	  let url = 'https://store.steampowered.com/widget/3238940/';
	  if (Utils.isMobileDevice()) { 
	    EmbedOverlay?.show?.({ url:url, id:appId, x:360, y:5, w:1200, h:480, closeOutside:true,  });
	  } else {
		  EmbedOverlay?.show?.({ url:url, id:appId, x:560, y:5, w:720, h:240, closeOutside:true,  });  
	  }
	    return; 
   }
	
   let url = `https://store.steampowered.com/app/${appId}/_/`;
   let textArray = [ "Our Steam store page is finally live!", 
                     "We’d be so happy if you could add us to your wishlist!   (*´∀`)~♥", 
					           "⬇Click below to open the Steam page." 
				];
   if (!!window.systemFeatureText.steamWishlist)  {
	     textArray = window.systemFeatureText.steamWishlist;
   }
   let text = textArray.join("\n");  
   const ask = await confirm(text);
   if (ask) {
      chahuiUtil.openOfficialWebsite?.({url});
   }	
};


//=============================================================================
//还没整理出去的联网小工具
//=============================================================================
// 打开赞助官网/support按钮
chahuiUtil.openOfficialWebsite = function (extra={}) {

  let url = 'https://www.patreon.com/c/nlch/home';
  if (extra.url) {
      url = extra.url;
  }
		// 终端识别
		if (Utils.isMobileDevice()) {
        cordova.InAppBrowser.open(url, '_system');
    } else {
        require('nw.gui').Shell.openExternal(url);
   }
   // 记录触发次数
   if (!appScript) return;
   const match = String($dataSystem.gameVersion) || 0.1;  
   let version = chahuiUtil.parseGameVersionNumber(match);
   let mode = 'SupportClick';
   if (extra.from === 'nonSubscriber') mode = 'nonSubscriberSupportClick';
   url = `${appScript}?mode=${mode}&version=${version}`;
   chahuiUtil.sendTelemetryRequest(url);
};

// 统计玩家语言情况
chahuiUtil.countPlayersByLanguage = function () {
  if (!appScript) return;
  const userLang = (navigator.language || '').toLowerCase();
  if (userLang == '') return;

  let version = "";
  if (Utils.isMobileDevice()) version = "AN";

  const url = `${appScript}?mode=CountPlayersByLanguage&lang=${userLang}&version=${version}`;
  chahuiUtil.sendTelemetryRequest(url, () => {
    $gameSwitches.setValue(336, true);
  });
};

// 玩家签到
chahuiUtil.playerDailyLoginReward = function () {
  // 取得当前日期
  if (!appScript) return;

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const todayNum = y * 10000 + m * 100 + d;

  let userLang = ConfigManager.language;
  if (userLang === 12) userLang = 0;
  if (userLang > 2) userLang = 2;

  const lastDate = $gameVariables.value(289);

  if (todayNum > lastDate) {

    // 检测玩家电脑配置
    if (!Utils.isMobileDevice()) {
      GPUProbe.warnByPolicies({ hasVp9Assets: true });
    }

    if (!$gameSwitches.value(336)) {
      chahuiUtil.countPlayersByLanguage();
    }

    const match = String($dataSystem.gameVersion) || 0.1;  
    let version = chahuiUtil.parseGameVersionNumber(match);

    if (Utils.isMobileDevice()) version += "AN";

    const url = `${appScript}?mode=DailyLogin&lang=${userLang}&version=${version}`;
    chahuiUtil.sendTelemetryRequest(url, () => {
      $gameVariables.setValue(289, todayNum);
    });
  }
};

// 新存档记录
chahuiUtil.newSaveRecord = function () {
  if (!appScript) return;

  // 取得当前日期
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const todayNum = y * 10000 + m * 100 + d;

  let userLang = ConfigManager.language;
  if (userLang === 12) userLang = 0;
  if (userLang > 2) userLang = 2;

  const lastDate = $gameVariables.value(289);

  if (todayNum > lastDate) {

    // 检测玩家电脑配置
    if (!Utils.isMobileDevice()) {
      GPUProbe.warnByPolicies({ hasVp9Assets: true });
    }

    const match = String($dataSystem.gameVersion) || 0.1;  
    let version = chahuiUtil.parseGameVersionNumber(match);
    if (Utils.isMobileDevice()) version += "AN";

    const url = `${appScript}?mode=NewSave&lang=${userLang}&version=${version}`;
    chahuiUtil.sendTelemetryRequest(url, () => {
      $gameVariables.setValue(289, todayNum);
    });
  }
};

//=============================================================================
//实验品
//=============================================================================

chahuiUtil.temporarilyShowNetworkPicture = function (pid, url) {
  (async () => {
    // 1. 下载
    const res = await fetch(url, { mode: 'cors' }).catch(() => null);
    if (!res || !res.ok) return false;
    const blobURL = URL.createObjectURL(await res.blob());

    // 2. 创建 <img>
    const img = new Image();
    img.src = blobURL;
    await new Promise(ok => (img.onload = ok));

    // 3. Bitmap
    const base = new PIXI.BaseTexture(img);
    const bmp = new Bitmap(img.width, img.height);
    bmp._image = img;
    bmp._baseTexture = base;
    bmp._baseTexture.hasLoaded = true;
    bmp._setDirty();

    if (!$gameScreen.picture(pid)) {
      URL.revokeObjectURL(blobURL);   // 释放 blob: URL 引用
      bmp.destroy();                 // 让 Bitmap/纹理占用也被 PIXI 释放
      return;
    }
    //  4.切换 
    const sprite = SceneManager._scene._spriteset._pictureContainer
      .children.find(s => s._pictureId === pid);
    if (sprite) {
      sprite.bitmap = bmp;
      sprite._refresh();
    }
  })();
};

/*

EmbedOverlay.show({ url:'guide/RPG事件-Combat.html',
x:20, y:20, w:1600, h:900,enableFind:true  });

steam:
EmbedOverlay.show({ type:'steam', id:appId, x:560, y:10, w:720, h:240, closeOutside:true,  });
itch.io:
EmbedOverlay.show({ type:'itch', id:2935769, x:560, y:10, w:800, h:200 });
安卓版：
EmbedOverlay.show({ type:'itch', id:2935769, x:160, y:10, w:1600, h:400 });
*/
(function () {
  'use strict';
  const D = document, W = window;

  function css(el, obj) { Object.assign(el.style, obj); return el; }
  function make(tag, style) { return css(D.createElement(tag), style || {}); }

  // —— 拿到 MV 画布在页面里的真实像素矩形
  function gameCanvasRect() {
    const canvas =
      (Graphics && Graphics._renderer && Graphics._renderer.view) ||
      document.getElementById('GameCanvas') ||
      document.querySelector('canvas');
    return canvas ? canvas.getBoundingClientRect()
      : { left: 0, top: 0, width: Graphics.boxWidth || 0, height: Graphics.boxHeight || 0 };
  }
  // —— 把“游戏坐标矩形”换算为“页面像素矩形”
  function gameRectToPageRect(gx, gy, gw, gh) {
    const r = gameCanvasRect();
    const sx = r.width / (Graphics.boxWidth || r.width || 1);
    const sy = r.height / (Graphics.boxHeight || r.height || 1);
    return {
      left: Math.round(r.left + gx * sx),
      top: Math.round(r.top + gy * sy),
      width: Math.round(gw * sx),
      height: Math.round(gh * sy)
    };
  }

  function buildUrl(opts) {
    const t = (opts.type || '').toLowerCase();
    if (opts.url) return opts.url;

    if (t === 'steam' && opts.id) {
      // <iframe src="https://store.steampowered.com/widget/3238940/" frameborder="0" width="646" height="190"></iframe>
      return `https://store.steampowered.com/widget/${opts.id}/`;
    }
    if (t === 'itch' && opts.id) {
      return `https://itch.io/embed/${opts.id}`;
    }
    if (t === 'youtube') {
      // 支持 id 或完整的 embed 链接
      if (opts.id) {
        const p = new URLSearchParams();
        if (opts.autoplay) p.set('autoplay', '1');
        if (opts.mute ?? (opts.autoplay ? true : false)) p.set('mute', '1');
        p.set('rel', '0'); p.set('playsinline', '1');
        return `https://www.youtube.com/embed/${opts.id}?${p.toString()}`;
      }
      if (opts.url) return opts.url;
    }
    return '';
  }

  const Overlay = {
    _wrap: null, _mask: null, _iframe: null, _onBlur: null, _onResize: null,
    _opts: null,
    // —— 新增：记录布局参数（coords 模式 + 游戏坐标）
    _layout: { coords: 'game', x: 0, y: 0, w: 640, h: 360 },
    _raf: null,

    show(opts) {
      this.remove();
      opts = Object.assign({
        // 新增：coords 默认 game（按游戏坐标自适应）；也可传 'pixel'
        coords: 'game',
        x: 100, y: 100, w: 640, h: 360, z: 999999,
        showMask: false, autoCloseOnBlur: false,
        closeOutside: true, closeOffsetX: 10, closeOffsetY: 0,
        allowFullscreen: true,
        closeBg: 'rgba(0,0,0,.70)',          // 背景圆的深色
        closeColor: '#fff',                  // X 的颜色
        closeBorder: '1px solid rgba(255,255,255,.75)', // 细白描边
        closeHoverBg: 'rgba(0,0,0,.85)'      // hover 更深一点
      }, opts || {});
      const url = buildUrl(opts) || opts.url;
      if (!url) { console.warn('[EmbedOverlay] missing url/id'); return; }
      this._opts = opts;

      // —— 保存布局基准
      this._layout.coords = opts.coords || 'game';
      this._layout.x = opts.x; this._layout.y = opts.y;
      this._layout.w = opts.w; this._layout.h = opts.h;

      // 遮罩（点击关闭）
      if (opts.showMask) {
        this._mask = make('div', {
          position: 'absolute', left: '0', top: '0', right: '0', bottom: '0',
          background: 'rgba(0,0,0,0.35)', zIndex: opts.z - 1, pointerEvents: 'auto'
        });
        this._mask.addEventListener('pointerdown', () => this.remove());
        D.body.appendChild(this._mask);
      }

      // 容器（先放占位，真正的位置尺寸由 _applyLayout 统一设置）
      this._wrap = make('div', {
        position: 'absolute',
        left: '0px', top: '0px', width: '0px', height: '0px',
        zIndex: opts.z,
        pointerEvents: 'auto', borderRadius: '8px',
        // overflow:'hidden', 
        background: 'transparent'
      });

      // 关闭按钮（可外置到右侧）
      const size = 28;
      const close = make('div', {
        position: 'absolute',
        width: size + 'px', height: size + 'px',
        lineHeight: size + 'px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
        background: 'rgba(0,0,0,.75)',
        border: '1px solid rgba(255,255,255,.85)',
        boxShadow: '0 2px 6px rgba(0,0,0,.35)',
        font: 'bold 16px/1 sans-serif',
        borderRadius: (size / 2) + 'px',
        cursor: 'pointer', userSelect: 'none', zIndex: 10
      });
      close.textContent = 'X';
      close.title = '关闭';
      close.addEventListener('pointerdown', () => this.remove());

      // 外侧 or 内侧定位
      if (opts.closeOutside) {
        // 放到容器“右外侧”的上方位置：left: calc(100% + offsetX)
        close.style.left = `calc(100% + ${opts.closeOffsetX}px)`;
        close.style.top = `${opts.closeOffsetY}px`;
      } else {
        // 仍放容器内侧右上角
        close.style.right = '6px';
        close.style.top = '6px';
      }


      // === 查找栏（仅同源 iframe 可用） ===
      if (!opts.enableFind) {
        const bar = document.createElement('div');
        Object.assign(bar.style, {
          position: 'absolute', right: '-4px', top: '-36px',
          display: 'none', zIndex: 20,
          background: 'rgba(0,0,0,.75)', color: '#fff',
          border: '1px solid rgba(255,255,255,.6)',
          borderRadius: '6px', padding: '4px', gap: '4px',
          font: '12px/1 sans-serif', alignItems: 'center'
        });
        bar.style.display = 'none';
        bar.style.pointerEvents = 'auto';
        bar.style.backdropFilter = 'blur(2px)';
        bar.style.transform = 'translateY(-4px)';

        const input = document.createElement('input');
        Object.assign(input.style, { width: '200px', padding: '3px 6px', border: 'none', outline: 'none', borderRadius: '4px' });
        input.placeholder = '搜索… (Enter=下，Shift+Enter=上)';
        const btnPrev = document.createElement('button');
        const btnNext = document.createElement('button');
        const btnClose = document.createElement('button');
        [btnPrev, btnNext, btnClose].forEach(b => {
          Object.assign(b.style, { padding: '3px 6px', border: 'none', borderRadius: '4px', cursor: 'pointer' });
        });
        btnPrev.textContent = '上一个';
        btnNext.textContent = '下一个';
        btnClose.textContent = '×';
        btnClose.style.fontWeight = 'bold';

        bar.append(input, btnPrev, btnNext, btnClose);
        this._wrap.appendChild(bar);

        const canFind = (() => { try { return !!this._iframe.contentWindow && !!this._iframe.contentWindow.find; } catch (e) { return false; } })();
        const findOnce = (backward = false) => {
          if (!canFind) return;
          const term = input.value || '';
          if (!term) return;
          try {
            // Chromium 的 window.find： (term, caseSensitive, backward, wrap, wholeWord, searchInFrames, showDialog)
            this._iframe.contentWindow.find(term, false, backward, true, false, false, false);
            this._iframe.focus();
          } catch (e) { }
        };

        // 交互
        btnNext.onclick = () => findOnce(false);
        btnPrev.onclick = () => findOnce(true);
        btnClose.onclick = () => { bar.style.display = 'none'; this._wrap.focus(); };

        // 快捷键：Ctrl/⌘ + F 弹出，Enter 查找，Shift+Enter 上一个，Esc 关闭
        const onKey = (ev) => {
          const ctrlCmd = ev.ctrlKey || ev.metaKey;
          if (2 == 2) {
            ev.preventDefault();
            bar.style.display = 'flex';
            input.select(); input.focus();
          } else if (bar.style.display !== 'none') {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              findOnce(ev.shiftKey);
            } else if (ev.key === 'Escape') {
              ev.preventDefault();
              bar.style.display = 'none';
            }
          }
        };
        // 记住，以便 remove 时解绑
        this._onFindKey = onKey;
        window.addEventListener('keydown', onKey);
      }


      // 为了让绝对定位基于容器，确保容器是定位元素
      this._wrap.style.position = 'absolute';
      this._wrap.appendChild(close);

      // iframe
      this._iframe = D.createElement('iframe');
      this._iframe.src = url;
      this._iframe.frameBorder = '0';
      this._iframe.scrolling = 'no';
      if (opts.allowFullscreen) this._iframe.allowFullscreen = true;
      this._iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      this._iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      css(this._iframe, { width: '100%', height: '100%', display: 'block' });
      this._wrap.appendChild(this._iframe);
      D.body.appendChild(this._wrap);

      // 失焦自动关闭
      if (opts.autoCloseOnBlur) {
        this._onBlur = () => this.remove();
        W.addEventListener('blur', this._onBlur);
      }

      // —— 应用一次布局，并监听大小变化/每帧微调
      this._applyLayout();
      this._onResize = () => { this._applyLayout(); if (this._mask) { this._mask.style.right = '0'; this._mask.style.bottom = '0'; } };
      W.addEventListener('resize', this._onResize);

      // 每帧检查（拖拽窗口过程中有些环境不触发 resize）
      const step = () => { this._applyLayout(); this._raf = requestAnimationFrame(step); };
      this._raf = requestAnimationFrame(step);

      // 判断是否 NW 桌面
      const isNW = !!(window.nw || window.require && (function () { try { return require('nw.gui') || require('@nwjs/nwjs'); } catch (e) { return null; } })());

      if (isNW) {
        let loaded = false;
        this._iframe.addEventListener('load', () => { loaded = true; });
        setTimeout(() => {
          if (!loaded) this._openExternal(url);  // 只在桌面尝试外开
        }, 4000); // 给更宽裕时间
      }
    },

    // —— 新增：根据 coords 模式把 “游戏坐标矩形” → “页面像素矩形”
    _applyLayout() {
      if (!this._wrap) return;
      const L = this._layout;
      if (L.coords === 'pixel') {
        Object.assign(this._wrap.style, {
          left: L.x + 'px', top: L.y + 'px',
          width: L.w + 'px', height: L.h + 'px'
        });
      } else { // 'game'
        const r = gameRectToPageRect(L.x, L.y, L.w, L.h);
        Object.assign(this._wrap.style, {
          left: r.left + 'px', top: r.top + 'px',
          width: r.width + 'px', height: r.height + 'px'
        });
      }
    },

    _openExternal(url) {
      try { (require('nw.gui') || require('@nwjs/nwjs')).Shell.openExternal(url); } catch (e) { }
      this.remove();
    },

    hide() { if (this._wrap) this._wrap.style.display = 'none'; if (this._mask) this._mask.style.display = 'none'; },

    // —— 修改：setPos / setSize 会更新布局基准并立即应用
    setPos(x, y) { this._layout.x = x; this._layout.y = y; this._applyLayout(); },
    setSize(w, h) { this._layout.w = w; this._layout.h = h; this._applyLayout(); },

    remove() {
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      if (this._wrap && this._wrap.parentNode) this._wrap.parentNode.removeChild(this._wrap);
      if (this._mask && this._mask.parentNode) this._mask.parentNode.removeChild(this._mask);
      if (this._onBlur) { W.removeEventListener('blur', this._onBlur); this._onBlur = null; }
      if (this._onResize) { W.removeEventListener('resize', this._onResize); this._onResize = null; }
      this._wrap = this._mask = this._iframe = null;
      this._opts = null;
    }
  };

  // 全局 API
  W.EmbedOverlay = Overlay;

  // 场景切换时自动清理
  const _goto = SceneManager.goto;
  SceneManager.goto = function (sc) { try { Overlay.remove(); } catch (e) { } _goto.call(this, sc); };

  // Steam 版本：Overlay 弹出时自动关闭（若接入 greenworks）
  if (W.greenworks && greenworks.initAPI) {
    try { greenworks.on('game-overlay-activated', (active) => { if (active) Overlay.remove(); }); } catch (e) { }
  }
})();

/* === Local HTTP static server + WebView overlay + persistent Find bar (NW.js/Electron) ===
// 用法：
//   // 打开随包的本地文档（相对 www/）：
//   openLocalDocInWebview('guide/Combat.html', { x:50, y:55, w:1400, h:800 });
//   // x/y/w/h 默认使用游戏坐标，会随游戏画布缩放；coords:'pixel' 可改用页面像素。
//   // needTips:true 时才显示 Ctrl/Command+F 操作提示，默认不显示。
//   // 打开网络页面：
     openLocalDocInWebview('https://x.com/niliuchahui/media', { x:50, y:55, w:1400, h:800, needTips:true });
//   openLocalDocInWebview('https://docs.google.com/spreadsheets/u/1/d/1fDTga-dhWarmZjoPLGN9X85UqCQwDj1L9NpInVcVVLE/edit?gid=1857835699#gid=1857835699', { x:50, y:55, w:1400, h:800 });
*/
(function () {
  'use strict';

  // ------------------ 1) 懒加载本地静态服务器（仅服务 www/） ------------------
  const LocalHttp = {
    _started: false,
    _origin: '',
    _server: null,

    async ensure(basePort = 37123) {
      if (this._started) return this._origin;

      const http = require('http');
      const fs = require('fs');
      const path = require('path');

      // 游戏根目录与 www 目录
      const gameRoot = path.dirname(process.execPath);
      const WWW = path.join(gameRoot, 'www');

      // 简单 MIME
      const MIME = {
        '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
        '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
        '.webp': 'image/webp', '.svg': 'image/svg+xml',
        '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
        '.mp4': 'video/mp4', '.webm': 'video/webm', '.wasm': 'application/wasm', '.map': 'application/json'
      };

      // 只允许访问 www（防目录穿越）
      function safeJoin(root, reqPath) {
        const norm = require('path').normalize('/' + reqPath).replace(/^\/+/, '');
        const full = require('path').join(root, norm);
        if (!full.startsWith(root)) return null;
        return full;
      }

      const server = http.createServer((req, res) => {
        try {
          const urlObj = new URL(req.url, 'http://127.0.0.1');
          let reqPath = decodeURIComponent(urlObj.pathname);
          if (reqPath.endsWith('/')) reqPath += 'index.html';
          const full = safeJoin(WWW, reqPath);
          if (!full) return send(403, 'Forbidden');

          fs.stat(full, (err, st) => {
            if (err || !st.isFile()) return send(404, 'Not Found');
            const ext = require('path').extname(full).toLowerCase();
            const mime = MIME[ext] || 'application/octet-stream';
            res.writeHead(200, {
              'Content-Type': mime,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Access-Control-Allow-Origin': '*'
            });
            fs.createReadStream(full).pipe(res);
          });
        } catch (e) {
          send(500, 'Internal Error');
        }

        function send(code, msg) {
          res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(msg);
        }
      });

      // 找可用端口
      const origin = await new Promise((resolve, reject) => {
        let port = basePort;
        server.on('error', (e) => {
          if (e.code === 'EADDRINUSE' && port < basePort + 50) {
            port += 1;
            server.listen(port, '127.0.0.1');
          } else {
            reject(e);
          }
        });
        server.on('listening', () => {
          resolve(`http://127.0.0.1:${server.address().port}`);
        });
        server.listen(port, '127.0.0.1');
      });

      this._server = server;
      this._origin = origin;
      this._started = true;
      console.log('[LocalHttp] Serving', WWW, 'at', origin);
      return origin;
    }
  };

  // ------------------ 2) 公共 UI：覆盖层 + 关闭 ------------------
  function gameCanvas() {
    return (typeof Graphics !== 'undefined' && Graphics._canvas) ||
      document.getElementById('gameCanvas') ||
      document.getElementById('GameCanvas') ||
      document.querySelector('canvas');
  }

  function gameCanvasRect() {
    const canvas = gameCanvas();
    if (canvas) return canvas.getBoundingClientRect();

    const width = (typeof Graphics !== 'undefined' && (Graphics.boxWidth || Graphics.width)) || window.innerWidth;
    const height = (typeof Graphics !== 'undefined' && (Graphics.boxHeight || Graphics.height)) || window.innerHeight;
    return { left: 0, top: 0, width, height };
  }

  function applyOverlayLayout(wrap, { coords, x, y, w, h }) {
    if (coords === 'pixel') {
      Object.assign(wrap.style, {
        left: x + 'px', top: y + 'px',
        width: w + 'px', height: h + 'px'
      });
      return;
    }

    const rect = gameCanvasRect();
    const baseWidth = (typeof Graphics !== 'undefined' && (Graphics.boxWidth || Graphics.width)) || rect.width || 1;
    const baseHeight = (typeof Graphics !== 'undefined' && (Graphics.boxHeight || Graphics.height)) || rect.height || 1;
    const scaleX = rect.width / baseWidth;
    const scaleY = rect.height / baseHeight;
    Object.assign(wrap.style, {
      left: Math.round(rect.left + x * scaleX) + 'px',
      top: Math.round(rect.top + y * scaleY) + 'px',
      width: Math.round(w * scaleX) + 'px',
      height: Math.round(h * scaleY) + 'px'
    });
  }

  function makeOverlay(opts) {
    const { x, y, w, h, z } = opts;
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      position: 'fixed', left: '0px', top: '0px',
      width: '0px', height: '0px', zIndex: z,
      boxShadow: '0 8px 24px rgba(0,0,0,.35)',
      borderRadius: '8px', overflow: 'visible',
      pointerEvents: 'auto', background: '#000'
    });

    const close = document.createElement('div');
    Object.assign(close.style, {
      position: 'absolute', right: '-45px', top: '2px',
      width: '36px', height: '36px', lineHeight: '36px',
      textAlign: 'center', color: '#000000',
      background: 'rgba(255,255,255,1)', borderRadius: '20px',
      cursor: 'pointer', userSelect: 'none', zIndex: 10,
      boxShadow: '0 2px 6px rgba(0,0,0,.35)'
    });
    close.textContent = 'X'; close.title = '关闭';
    close.onclick = () => wrap.remove();
    wrap.appendChild(close);

    document.body.appendChild(wrap);

    // Graphics 会在窗口 resize 时重新缩放并居中画布。延后一帧读取画布矩形，
    // 再把游戏坐标换算成页面像素，避免监听器执行顺序造成一次布局滞后。
    let layoutFrame = 0;
    const updateLayout = () => applyOverlayLayout(wrap, opts);
    const scheduleLayout = () => {
      if (layoutFrame) return;
      layoutFrame = requestAnimationFrame(() => {
        layoutFrame = 0;
        updateLayout();
      });
    };

    window.addEventListener('resize', scheduleLayout);
    document.addEventListener('fullscreenchange', scheduleLayout);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleLayout);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleLayout);
      const canvas = gameCanvas();
      if (canvas) resizeObserver.observe(canvas);
      if (document.documentElement) resizeObserver.observe(document.documentElement);
    }

    wrap._disposeResponsiveLayout = () => {
      if (layoutFrame) cancelAnimationFrame(layoutFrame);
      layoutFrame = 0;
      window.removeEventListener('resize', scheduleLayout);
      document.removeEventListener('fullscreenchange', scheduleLayout);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', scheduleLayout);
      if (resizeObserver) resizeObserver.disconnect();
      resizeObserver = null;
    };

    updateLayout();
    return wrap;
  }

  // ------------------ 2.1 小提示横幅（自动淡出，随 wrap 一起销毁） ------------------
  function showWebHint(wrap, text, durationMs = 6000) {
    const tip = document.createElement('div');
    Object.assign(tip.style, {
      position: 'absolute',
      left: '50%', transform: 'translateX(-50%)',
      top: '-40px',                   // 悬在容器上方，不遮内容
      padding: '6px 10px',
      borderRadius: '6px',
      background: 'rgba(0,0,0,.80)',
      color: '#fff', font: '20px/1.2 sans-serif',
      zIndex: 9,
      pointerEvents: 'none',
      boxShadow: '0 2px 6px rgba(0,0,0,.35)',
      opacity: '1', transition: 'opacity .35s ease'
    });
    tip.textContent = text;
    wrap.appendChild(tip);

    // 自动淡出并移除
    setTimeout(() => {
      tip.style.opacity = '0';
      setTimeout(() => { if (tip.parentNode) tip.parentNode.removeChild(tip); }, 400);
    }, Math.max(1200, durationMs));
  }

  // ------------------ 3) Ctrl/Command+F 搜索栏（兼容 NW.js & Electron） ------------------
  function mountFindBar(wrap, webview) {
    const bar = document.createElement('div');
    Object.assign(bar.style, {
      position: 'absolute', right: '10px', top: '10px', zIndex: 20,
      display: 'none', gap: '6px',
      width: 'min(680px, calc(100% - 20px))', boxSizing: 'border-box',
      background: 'rgba(24,24,24,.94)', color: '#fff',
      border: '1px solid rgba(255,255,255,.55)', borderRadius: '7px',
      padding: '7px', font: '13px/1 sans-serif', alignItems: 'center',
      boxShadow: '0 3px 12px rgba(0,0,0,.45)', backdropFilter: 'blur(3px)'
    });

    const input = document.createElement('input');
    Object.assign(input.style, {
      minWidth: '100px', flex: '1 1 auto', boxSizing: 'border-box',
      padding: '6px 8px', border: 'none', outline: 'none',
      borderRadius: '4px', background: '#fff', color: '#000'
    });
    input.placeholder = 'Find in document…';

    const info = document.createElement('span');
    Object.assign(info.style, { minWidth: '64px', textAlign: 'center', opacity: .9, whiteSpace: 'nowrap' });

    const btnPrev = document.createElement('button');
    const btnNext = document.createElement('button');
    const btnClose = document.createElement('button');
    [btnPrev, btnNext, btnClose].forEach(b => {
      b.type = 'button';
      Object.assign(b.style, {
        minWidth: '30px', height: '28px', padding: '3px 7px',
        border: 'none', borderRadius: '4px', cursor: 'pointer',
        font: 'bold 15px/1 sans-serif'
      });
      b.onmouseenter = () => b.style.filter = 'brightness(1.1)';
      b.onmouseleave = () => b.style.filter = '';
    });
    btnPrev.textContent = '↑'; btnPrev.title = 'Previous match (Shift+Enter)';
    btnNext.textContent = '↓'; btnNext.title = 'Next match (Enter)';
    btnClose.textContent = '×'; btnClose.title = 'Close (Esc)';

    bar.append(input, info, btnPrev, btnNext, btnClose);
    wrap.appendChild(bar);

    // NW.js 使用 Chromium webview.find；Electron 则使用 findInPage。
    const isNW = typeof webview.find === 'function';
    const isElectron = !isNW && typeof webview.findInPage === 'function';

    if (!isElectron && !isNW) {
      console.warn('[FindBar] 当前 <webview> 不支持查找 API');
    }

    let lastTerm = '';
    let inputTimer = 0;
    let disposed = false;

    const updateResult = (result) => {
      const r = result && result.result ? result.result : (result || {});
      if (r.canceled) return;
      const current = Number(r.activeMatchOrdinal) || 0;
      const total = Number(r.numberOfMatches ?? r.matches) || 0;
      info.textContent = total ? `${current} / ${total}` : '0 / 0';
    };

    const stopFind = () => {
      lastTerm = '';
      try {
        if (isNW) webview.stopFinding('clear');
        if (isElectron) webview.stopFindInPage('clearSelection');
      } catch (e) {
        console.warn('[FindBar] stop find failed:', e);
      }
    };

    const doFind = (term, backward = false) => {
      if (inputTimer) clearTimeout(inputTimer);
      inputTimer = 0;
      term = String(term || '');
      if (!term) {
        info.textContent = '';
        stopFind();
        return;
      }

      try {
        info.textContent = '…';
        if (isNW) {
          webview.find(term, { backward, matchCase: false }, updateResult);
        } else if (isElectron) {
          const options = { forward: !backward, findNext: term === lastTerm, matchCase: false };
          webview.findInPage(term, options);
        }
        lastTerm = term;
      } catch (e) {
        info.textContent = 'Error';
        console.warn('[FindBar] find failed:', e);
      }
    };

    const onFound = updateResult;
    if (isElectron) webview.addEventListener('found-in-page', onFound);
    if (isNW) webview.addEventListener('findupdate', onFound);

    const show = () => {
      if (disposed) return;
      bar.style.display = 'flex';
      requestAnimationFrame(() => {
        if (!disposed) { input.focus(); input.select(); }
      });
    };

    const hide = () => {
      if (inputTimer) clearTimeout(inputTimer);
      inputTimer = 0;
      bar.style.display = 'none';
      stopFind();
      try { webview.focus(); } catch (_) { }
    };

    const isFindShortcut = (ev) =>
      (ev.ctrlKey || ev.metaKey) && !ev.altKey &&
      (String(ev.key || '').toLowerCase() === 'f' || ev.code === 'KeyF');

    // 宿主页面拥有焦点时直接处理；捕获阶段可避免 RPG Maker 的输入层抢先消费。
    const onHostKeyDown = (ev) => {
      if (!isFindShortcut(ev)) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      show();
    };
    window.addEventListener('keydown', onHostKeyDown, true);

    input.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') {
        ev.preventDefault();
        doFind(input.value, ev.shiftKey);
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        hide();
      }
    });
    input.addEventListener('keyup', ev => ev.stopPropagation());
    input.addEventListener('input', () => {
      if (inputTimer) clearTimeout(inputTimer);
      inputTimer = setTimeout(() => {
        inputTimer = 0;
        doFind(input.value, false);
      }, 120);
    });
    btnNext.onclick = () => doFind(input.value, false);
    btnPrev.onclick = () => doFind(input.value, true);
    btnClose.onclick = hide;

    // <webview> 的内容运行在独立 guest 进程；焦点在网页中时，宿主收不到 keydown。
    // 向所有 guest frame 注入一个只转发 Ctrl/Command+F 的轻量监听器。
    const token = `ansuz-find-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const guestCode = `(() => {
      const token = ${JSON.stringify(token)};
      const initType = 'ansuz-find-init';
      const openType = 'ansuz-find-open';
      const frameType = 'ansuz-find-frame';

      if (window === window.top && !window.__ansuzFindMessageInstalled) {
        window.__ansuzFindMessageInstalled = true;
        window.__ansuzFindHost = null;
        window.addEventListener('message', event => {
          const data = event.data;
          if (!data || data.token !== token) return;
          if (data.type === initType) window.__ansuzFindHost = event.source;
          if (data.type === frameType && window.__ansuzFindHost) {
            window.__ansuzFindHost.postMessage({ type: openType, token }, '*');
          }
        });
      }

      if (!window.__ansuzFindKeyInstalled) {
        window.__ansuzFindKeyInstalled = true;
        window.addEventListener('keydown', event => {
          const isFind = (event.ctrlKey || event.metaKey) && !event.altKey &&
            (String(event.key || '').toLowerCase() === 'f' || event.code === 'KeyF');
          if (!isFind) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          if (window === window.top) {
            if (window.__ansuzFindHost) {
              window.__ansuzFindHost.postMessage({ type: openType, token }, '*');
            }
          } else {
            window.top.postMessage({ type: frameType, token }, '*');
          }
        }, true);
      }
    })();`;

    let hasContentScript = false;
    try {
      if (typeof webview.addContentScripts === 'function') {
        webview.addContentScripts([{
          name: token,
          matches: ['<all_urls>'],
          js: { code: guestCode },
          run_at: 'document_start',
          all_frames: true
        }]);
        hasContentScript = true;
      }
    } catch (e) {
      console.warn('[FindBar] content script setup failed, using load-time injection:', e);
    }

    const sendGuestInit = () => {
      try {
        if (webview.contentWindow) {
          webview.contentWindow.postMessage({ type: 'ansuz-find-init', token }, '*');
        }
      } catch (e) {
        console.warn('[FindBar] guest shortcut handshake failed:', e);
      }
    };

    const installGuestShortcut = () => {
      if (hasContentScript || typeof webview.executeScript !== 'function') {
        sendGuestInit();
        return;
      }
      try {
        webview.executeScript({ code: guestCode, allFrames: true }, sendGuestInit);
      } catch (e) {
        console.warn('[FindBar] guest shortcut injection failed:', e);
      }
    };

    const onGuestMessage = (ev) => {
      const data = ev.data;
      if (data && data.type === 'ansuz-find-open' && data.token === token) show();
    };
    window.addEventListener('message', onGuestMessage);
    webview.addEventListener('contentload', installGuestShortcut);
    webview.addEventListener('loadstop', installGuestShortcut);

    return {
      dispose() {
        disposed = true;
        if (inputTimer) clearTimeout(inputTimer);
        inputTimer = 0;
        stopFind();
        window.removeEventListener('keydown', onHostKeyDown, true);
        window.removeEventListener('message', onGuestMessage);
        webview.removeEventListener('contentload', installGuestShortcut);
        webview.removeEventListener('loadstop', installGuestShortcut);
        if (isElectron) webview.removeEventListener('found-in-page', onFound);
        if (isNW) webview.removeEventListener('findupdate', onFound);
        bar.remove();
      },
      show,
      hide
    };
  }

  // ------------------ 4) 对外：打开本地或网络页面到 webview（本地走 HTTP） ------------------
  window.openLocalDocInWebview = async function (relOrUrl, opts) {
    opts = Object.assign({
      coords: 'game', x: 40, y: 40, w: 1280, h: 720, z: 999999,
      needTips: false
    }, opts || {});
    if (!window.nw) { console.warn('仅 NW.js/Electron 桌面版支持 <webview>'); return null; }

    let url = String(relOrUrl || '').trim();
    const isHttp = /^https?:\/\//i.test(url);
    const isLocal = !isHttp;

    if (isLocal) {
      // 本地文档：启动本地服务器并组合 URL
      const origin = await LocalHttp.ensure();
      url = `${origin}/${url.replace(/^\/+/, '')}`;
    }

    const wrap = makeOverlay(opts);
    const wv = document.createElement('webview');
    wv.style.width = '100%';
    wv.style.height = '100%';
    wv.style.display = 'block';
    wv.setAttribute('partition', 'persist:embed');

    wv.addEventListener('loadabort', e => {
      console.warn('<webview> loadabort:', e.errorCode, e.reason, e.url);
    });
    wrap.appendChild(wv);

    // webview.find 可以直接搜索 guest 页面，因此本地与跨域网络文档都挂载搜索栏。
    const finder = mountFindBar(wrap, wv);
    wv.src = url;

    if (opts.needTips) {
      let textArray = window.systemFeatureText && window.systemFeatureText.guideHint;
      if (!textArray) textArray = "Press Ctrl+F to open the search bar, click the button at the bottom of the document to switch content, and move the bottom scroll bar to check other language versions simultaneously.";
      let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
      showWebHint(
        wrap,
        text,
        10000
      );
    }

    // --- 通用清理：返还玩家操作权限 ---
    function _cleanup() {
      try {
        $gameSwitches.setValue(14, false);
        $gameSystem._drill_COI_map_mouse = true;
        $gameSystem._drill_PAlM_enabled = true;
        Zzy.TWF.ToTheWorld(false);
        let bulletList = $gameMap._mapBulletsQJ;
        if (bulletList) Object.values(bulletList).forEach(b => { if (b?.data) b.data.paused = false; });
      } catch (e) { console.warn(e); }
    }

    // 关闭时清理（无论有没有 finder 都执行 _cleanup）
    const _remove = wrap.remove.bind(wrap);
    let removed = false;
    wrap.remove = function () {
      if (removed) return;
      removed = true;
      try { if (finder) finder.dispose(); } catch (e) { }
      try { if (wrap._disposeResponsiveLayout) wrap._disposeResponsiveLayout(); } catch (e) { }
      _cleanup();
      _remove();
    };

  };

})();

/*:
 * 比较新旧版本的哈希值以确认是否需要更新文件（作者：Canaan HS）
 * 仅桌面(NW.js)有效；移动端不运行
 * - 首次无 manifest.json：生成一份到 www。
 * - 之后启动：将 www 的当前状态与 manifest 比较，发现差异则写出 differences.json。
 * 可在控制台(F8)查看详情。
 * 用法（任意时机）：
 *   IntegrityScan.run({ useWorker: true }).then(hash => console.log('rootHash=', hash));
 *   或：await IntegrityScan.run({ useWorker:false }) // 主线程计算 
 * - 成功时默认写入 $dataSystem.rootHash；可用 setToSystem:false 关闭。 
 */

(function () {
  'use strict';

  if (!Utils.isNwjs() || Utils.isMobileDevice()) return;

  const path = require('path');
  const fs = require('fs');
  const fsp = fs.promises;
  const crypto = require('crypto');

  // ---------- 解析依赖与目录 ----------
  const libsRel = path.join('js', 'libs');
  // libs 目录同样要兼容 www/ 包装（与下方 JS_DIR / DATA_DIR 的 candidates 一致）：
  //   开发环境文件在 cwd/js/libs；部署套一层 www/ 后在 cwd/www/js/libs。
  //   以 compareVersionHashes.js 是否存在为准自动选，避免"Cannot find module"。
  const LIBS_DIR = [path.join(process.cwd(), libsRel), path.join(process.cwd(), 'www', libsRel)]
      .find(p => fs.existsSync(path.join(p, 'compareVersionHashes.js')))
      || path.join(process.cwd(), libsRel);
  const compareVersionHashesPath = path.join(LIBS_DIR, 'compareVersionHashes.js');
  const createFileHasher = require(compareVersionHashesPath);

  const initialExcludes = [
    '.git', '.gitignore', 'node_modules', 'save', 'saves', 'manifest.json', 'differences.json'
  ];
  const hasher = createFileHasher({ initialExcludes, concurrencyLimit: 64 });

  // 选择实际要扫描的 js/ 与 data/ 目录（自动适配玩家/开发环境）
  const ROOT = process.cwd();
  const JS_DIR_CANDIDATES = [path.join(ROOT, 'js'), path.join(ROOT, 'www', 'js')];
  const DATA_DIR_CANDIDATES = [path.join(ROOT, 'data'), path.join(ROOT, 'www', 'data')];
  const JS_DIR = JS_DIR_CANDIDATES.find(p => fs.existsSync(p));
  const DATA_DIR = DATA_DIR_CANDIDATES.find(p => fs.existsSync(p));
  const targets = [JS_DIR, DATA_DIR].filter(Boolean);

  // ---------- 公用：生成清单后定位“临时清单”的真实落点 ----------
  // 兼容两种实现：hasher.generate(dir, tmpName) 可能把文件写在 dir 下，或写在 CWD
  function resolveTmpPathAfterGenerate(dir, tmpName) {
    const pDir = path.join(dir, tmpName);
    const pCwd = path.join(process.cwd(), tmpName);
    if (fs.existsSync(pDir)) return pDir;
    if (fs.existsSync(pCwd)) return pCwd;
    return null;
  }

  // ---------- 主线程：合并文件清单并计算 rootHash ----------
  async function computeRootHashForTargets() {
    const tmpFiles = [];
    try {
      for (let i = 0; i < targets.length; i++) {
        const dir = targets[i];
        const tmpName = `__ic_now_${i}.json`;
        await hasher.generate(dir, tmpName);

        const tmpPath = resolveTmpPathAfterGenerate(dir, tmpName);
        if (!tmpPath) throw new Error(`tmp manifest not found after generate(): ${tmpName}`);
        tmpFiles.push(tmpPath);
      }

      const files = {};
      for (const f of tmpFiles) {
        const m = JSON.parse(await fsp.readFile(f, 'utf8'));
        Object.assign(files, m.files);
      }

      const keys = Object.keys(files).sort();
      let s = '';
      for (let i = 0; i < keys.length; i++) s += keys[i] + ':' + files[keys[i]] + '\n';
      return crypto.createHash('sha256').update(s).digest('hex');
    } finally {
      for (const f of tmpFiles) { try { await fsp.unlink(f); } catch (_) { } }
    }
  }

  // ---------- Worker 支持（可选） ----------
  function canUseNodeWorker() {
    try { require('worker_threads'); return true; } catch (_) { return false; }
  }

  async function computeRootHashInWorker() {
    const { Worker, isMainThread } = require('worker_threads');
    if (!isMainThread) throw new Error('call from main thread only');

    // 写一个临时 worker 文件到“可写”的 js 目录（若没找到 JS_DIR，则直接回退主线程）
    if (!JS_DIR) return null;
    const tmpWorkerPath = path.join(JS_DIR, '__integrity_worker.js');

    // 注意：把变量都内联进源码，避免跨上下文 require 失败
    const workerSource = `
      const path = require('path');
      const fs   = require('fs');
      const fsp  = fs.promises;
      const crypto = require('crypto');
      const { parentPort } = require('worker_threads');

      const createFileHasher = require(${JSON.stringify(compareVersionHashesPath)});
      const hasher = createFileHasher({ initialExcludes: ${JSON.stringify(initialExcludes)}, concurrencyLimit: 64 });
      const targets = ${JSON.stringify(targets)};

      function resolveTmpPathAfterGenerate(dir, tmpName){
        const pDir = path.join(dir, tmpName);
        const pCwd = path.join(process.cwd(), tmpName);
        if (fs.existsSync(pDir)) return pDir;
        if (fs.existsSync(pCwd)) return pCwd;
        return null;
      }

      async function compute(){
        const tmpFiles = [];
        try{
          for (let i=0;i<targets.length;i++){
            const dir = targets[i];
            const tmpName = "__ic_now_"+i+".json";
            await hasher.generate(dir, tmpName);
            const tmpPath = resolveTmpPathAfterGenerate(dir, tmpName);
            if (!tmpPath) throw new Error("tmp manifest not found: "+tmpName);
            tmpFiles.push(tmpPath);
          }
          const files = {};
          for (const f of tmpFiles){
            const m = JSON.parse(await fsp.readFile(f,'utf8'));
            Object.assign(files, m.files);
          }
          const keys = Object.keys(files).sort();
          let s = '';
          for (let i=0;i<keys.length;i++) s += keys[i]+':'+files[keys[i]]+'\\n';
          return crypto.createHash('sha256').update(s).digest('hex');
        } finally {
          for (const f of tmpFiles){ try{ await fsp.unlink(f); }catch(_){ } }
        }
      }

      compute()
        .then(hash => parentPort.postMessage({ ok:true, hash }))
        .catch(err => parentPort.postMessage({ ok:false, error: String(err && err.stack || err) }));
    `;

    try { fs.writeFileSync(tmpWorkerPath, workerSource, 'utf8'); }
    catch (e) { console.warn('[Integrity] write worker failed, fallback:', e); return null; }

    return new Promise(resolve => {
      const w = new Worker(tmpWorkerPath);
      const cleanup = () => { try { w.terminate(); } catch (_) { } try { fs.unlinkSync(tmpWorkerPath); } catch (_) { } };
      w.on('message', msg => { cleanup(); resolve(msg && msg.ok ? msg.hash : null); });
      w.on('error', err => { console.warn('[Integrity] worker error:', err); cleanup(); resolve(null); });
      w.on('exit', code => { if (code !== 0) { /* 已在 message/error 处理 */ } });
    });
  }

  // ---------- 对外 API：手动触发 ----------
  window.IntegrityScan = {
    _busy: false,
    isBusy() { return this._busy; },

    /**
     * @param {{useWorker?:boolean,setToSystem?:boolean}} opts
     *  useWorker   默认 true；可用则在 worker 线程计算
     *  setToSystem 默认 true；是否把 hash 写入 $dataSystem.rootHash
     * @returns {Promise<string|null>} 64位hex；失败/取消返回 null
     */
    async run(opts = {}) {
      if (!Utils.isNwjs() || Utils.isMobileDevice()) {
        $dataSystem.rootHash = "";
        return null;
      }
      const useWorker = (opts.useWorker !== false);
      const setToSystem = (opts.setToSystem !== false);

      if (this._busy) { console.warn('[Integrity] already running'); return null; }
      this._busy = true;
      try {
        let hash = null;
        if (useWorker && canUseNodeWorker()) {
          hash = await computeRootHashInWorker();
        }
        if (!hash) {
          // worker 不可用或失败 → 回退主线程（会卡 UI；如不希望回退，直接 return null）
          hash = await computeRootHashForTargets();
        }

        if (hash && setToSystem) {
          if (window.$dataSystem) $dataSystem.rootHash = hash;
          else {
            const t = setInterval(() => {
              if (window.$dataSystem) { $dataSystem.rootHash = hash; clearInterval(t); }
            }, 16);
          }
        }
        console.log('[Integrity] rootHash =', hash);
        return hash;
      } catch (e) {
        console.error('[Integrity] run failed:', e);
        return null;
      } finally {
        this._busy = false;
      }
    }
  };

  // 调用方式：
  //   await IntegrityScan.run({ useWorker:true });
})();
