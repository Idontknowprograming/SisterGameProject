

    
var chahuiUtil = chahuiUtil || {};
var Imported = Imported || {};
Imported.shiroin_autoUpdateSystem = true;
const updateMap = "https://nlch.io/api/updatemap";
const NLCH_UPDATE_COOLDOWN    = 120 * 1000;
const NLCH_UPDATE_CHANGELOGS  = "updateChangeLogs";
const NLCH_UPDATE_CHANGELOGS_ALL = "updateChangeLogsAllV2";
const NLCH_UPDATE_KEY_VER     = "pendingUpdateVersion";
const NLCH_UPDATE_KEY_TIME    = "pendingUpdateVersionCheckTime";
const USUIMO_PATCH_HASH       = "usuimo_patch_hash";
const USUIMO_TRANSLATION_HASH = "usuimo_translation_hash";
let hasShownOutdatedVersionWarning = false; // 本次运行只提醒一次，标题到地图不重复。
const R2PatchPublicUrl        = "https://patch.nlch.io/";   // 兜底用下载站点

//=============================================================================
// 补丁下载详情提示（QJ 文本弹幕）
//=============================================================================

const PATCH_DOWNLOAD_HINT_X = 960;
const PATCH_DOWNLOAD_HINT_Y = 680;

function formatPatchTransferSize(bytes) {
  let value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return "0B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  const digits = unitIndex === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits).replace(/\.0$/, "")}${units[unitIndex]}`;
}

/**
 * 为一次 ZIP 下载创建独立的传输状态提示。
 * 文本弹幕只在 33 号地图中生成；其他地图或标题画面静默下载时保持无 UI 模式。
 */
function createPatchDownloadProgressHint(fileName, initialTotal = 0) {
  const state = {
    fileName: String(fileName || ""),
    loaded: 0,
    total: Math.max(0, Number(initialTotal) || 0),
    speed: 0,
    samples: [],
    bullet: null,
    lastRenderTime: 0,
    lastText: "",
    closed: false,
  };

  function nowMs() {
    return window.performance?.now?.() ?? Date.now();
  }

  function canShowBullet() {
    return !!(
      window.QJ?.MPMZ?.Shoot &&
      window.$gameMap &&
      $gameMap.mapId?.() === 33 &&
      window.Scene_Map &&
      SceneManager._scene instanceof Scene_Map &&
      SceneManager._scene._spriteset
    );
  }

  function textStyle(text) {
    return {
      text,
      arrangementMode: 0,
      textColor: "#f3eee7",
      fontSize: 26,
      outlineColor: "#000000",
      outlineWidth: 0,
      fontFace: "HonobonoPopTTF",
      fontItalic: false,
      fontBold: false,
      width: 720,
      height: 52,
      textAlign: 5,
      lineWidth: 0,
      lineColor: "#ffffff",
      lineRate: 1,
      backgroundColor: null,
      backgroundOpacity: 1,
      shadowBlur: 5,
      shadowColor: "rgba(0, 0, 0, 0.9)",
      shadowOffsetX: 0,
      shadowOffsetY: 2,
    };
  }

  function render(force = false) {
    if (state.closed || !canShowBullet()) return;

    const now = nowMs();
    // XHR 进度可能每帧触发；限制文字位图的重绘频率。
    if (!force && now - state.lastRenderTime < 180) return;

    const totalText = state.total > 0 ? formatPatchTransferSize(state.total) : "--";
    const text = `${formatPatchTransferSize(state.loaded)} / ${totalText} (${formatPatchTransferSize(state.speed)}/s)`;
    if (!force && text === state.lastText) return;

    state.lastRenderTime = now;
    state.lastText = text;

    try {
      if (state.bullet && !state.bullet.dead) {
        state.bullet.changeAttribute("img", ["T", textStyle(text)]);
        return;
      }

      const zoom = $gameScreen?.zoomScale?.() || 1;
      state.bullet = QJ.MPMZ.Shoot({
        img: ["T", textStyle(text)],
        position: [["S", PATCH_DOWNLOAD_HINT_X / zoom], ["S", PATCH_DOWNLOAD_HINT_Y / zoom]],
        initialRotation: ["S", 0],
        imgRotation: ["F"],
        moveType: ["S", 0],
        opacity: 1,
        z: "A",
        scale: 1 / zoom,
        onScreen: true,
        anchor: [0.5, 0.5],
        collisionBox: ["C", 1],
        groupName: ["patchDownloadProgressHint"],
        existData: [],
      });
    } catch (error) {
      // 下载提示绝不能干扰实际下载。
      console.warn("[patch-download-hint] Failed to draw progress text:", error);
    }
  }

  function updateSpeed(loaded, time) {
    if (state.samples.length && loaded < state.samples[state.samples.length - 1].loaded) {
      // 下载重开或目标文件被重新截断。
      state.samples.length = 0;
      state.speed = 0;
    }

    state.samples.push({ time, loaded });
    const cutoff = time - 2200;
    while (state.samples.length > 2 && state.samples[0].time < cutoff) {
      state.samples.shift();
    }

    if (state.samples.length >= 2) {
      const first = state.samples[0];
      const last = state.samples[state.samples.length - 1];
      const elapsedSeconds = (last.time - first.time) / 1000;
      if (elapsedSeconds >= 0.15) {
        state.speed = Math.max(0, (last.loaded - first.loaded) / elapsedSeconds);
      }
    }
  }

  function destroy(delay = 0) {
    const bullet = state.bullet;
    state.closed = true;
    const remove = () => {
      try {
        if (bullet && !bullet.dead) bullet.setDead();
      } catch (_) { }
      if (state.bullet === bullet) state.bullet = null;
    };
    if (delay > 0) setTimeout(remove, delay);
    else remove();
  }

  const startedAt = nowMs();
  state.samples.push({ time: startedAt, loaded: 0 });

  return {
    update(loaded, total = 0, force = false) {
      if (state.closed) return;
      const currentTime = nowMs();
      state.loaded = Math.max(0, Number(loaded) || 0);
      if (Number(total) > 0) state.total = Number(total);
      updateSpeed(state.loaded, currentTime);
      render(force);
    },
    complete(loaded = state.loaded, total = state.total) {
      if (state.closed) return;
      const finalLoaded = Math.max(0, Number(loaded) || 0);
      const finalTotal = Math.max(0, Number(total) || 0) || finalLoaded;
      this.update(finalLoaded || finalTotal, finalTotal, true);
      destroy(450);
    },
    fail() {
      destroy();
    },
  };
}

/**
 * 开发用：在地图场景模拟一次补丁下载，不进行任何网络或文件操作。
 * 控制台示例：chahuiUtil.testPatchDownloadProgressHint(44, 1.4)
 */
chahuiUtil.testPatchDownloadProgressHint = function(totalMB = 44, speedMBps = 1.4) {
  const total = Math.max(0.1, Number(totalMB) || 44) * 1024 * 1024;
  const bytesPerSecond = Math.max(0.1, Number(speedMBps) || 1.4) * 1024 * 1024;

  if (!(SceneManager._scene instanceof Scene_Map) || $gameMap.mapId?.() !== 33) {
    console.warn("[patch-download-hint-test] 请进入 33 号地图后再运行测试。");
    return null;
  }

  // 防止控制台重复执行后出现多个重叠提示。
  chahuiUtil.stopPatchDownloadProgressHintTest?.();

  const hint = createPatchDownloadProgressHint("test-patch.zip", total);
  const startedAt = window.performance?.now?.() ?? Date.now();
  const previousPercent = window.$gameVariables ? $gameVariables.value(82) : 0;
  let timer = null;
  let stopped = false;

  function nowMs() {
    return window.performance?.now?.() ?? Date.now();
  }

  function stop(completed = false) {
    if (stopped) return;
    stopped = true;
    if (timer) clearInterval(timer);
    timer = null;

    if (completed) {
      hint.complete(total, total);
      setTimeout(() => {
        // 若期间开始了新的模拟，不覆盖新模拟正在写入的百分比。
        if (!chahuiUtil._patchDownloadHintTest && window.$gameVariables) {
          $gameVariables.setValue(82, previousPercent);
        }
      }, 650);
    } else {
      hint.fail();
      if (window.$gameVariables) $gameVariables.setValue(82, previousPercent);
    }

    if (chahuiUtil._patchDownloadHintTest?.stop === stop) {
      chahuiUtil._patchDownloadHintTest = null;
    }
  }

  function tick() {
    const elapsedSeconds = Math.max(0, (nowMs() - startedAt) / 1000);
    const loaded = Math.min(total, elapsedSeconds * bytesPerSecond);
    const percent = Math.min(100, Math.floor((loaded / total) * 100));

    if (window.$gameVariables) $gameVariables.setValue(82, percent);
    hint.update(loaded, total, loaded >= total);

    if (loaded >= total) stop(true);
  }

  chahuiUtil._patchDownloadHintTest = { stop };
  chahuiUtil.stopPatchDownloadProgressHintTest = () => stop(false);

  hint.update(0, total, true);
  tick();
  timer = setInterval(tick, 200);
  console.info(
    `[patch-download-hint-test] 模拟开始：${totalMB}MB @ ${speedMBps}MB/s；` +
    "可执行 chahuiUtil.stopPatchDownloadProgressHintTest() 提前停止。"
  );

  return chahuiUtil._patchDownloadHintTest;
};

//=============================================================================
//github 配置
//=============================================================================
const githubCfg = {
  owner: "shiroin000",
  repo: "RPGmaker",
  branch: "main",
  translation:"USUIMO_translation_source",
  tag: Utils.isMobileDevice() ? "AndroidPatch" : "patch",
  rawTemplate: `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/`,
  downloadURL(name) { // 补丁文件下载链接
    return `https://github.com/${this.owner}/${this.repo}/releases/download/${this.tag}/${encodeURIComponent(name)}`;
  },
  contentsAPI(dir) { // 目錄
    return `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${dir}?ref=${this.branch}`;
  },
  treesAPI() {
    return `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${this.branch}?recursive=1`;
  },
  translationDownloadURL(name) { // 翻译文本下载链接
    return `https://github.com/${this.owner}/${this.translation}/releases/download/latest-data/${encodeURIComponent(name)}`;
  },  
  // 取得版本哈希
  async getReleaseAssetSha256(version) {
    return new Promise((resolve, reject) => {
      if (!version || typeof version !== "string") return reject(false);

      httpRequest(`https://api.github.com/repos/${this.owner}/${this.repo}/releases/tags/${this.tag}`, { responseType: "json" })
        .then(release => {
          const name = version.endsWith(".zip") ? version : `${version}.zip`;
          const asset = release?.assets?.find(item => item.name === name);

          if (!asset) return reject(false);

          resolve({
            name,
            downloadUrl: asset.browser_download_url || null,
            sha256: asset.digest.replace("sha256:", "") || null,
          })
        }).catch(err => {
          reject(false);
        })
    });
  },
  // 取得翻译文本哈希
  async getTranslationReleaseAssetSha256(version = "data.zip") {
    return new Promise((resolve, reject) => {
      if (!version || typeof version !== "string") return reject(false);

      httpRequest(`https://api.github.com/repos/${this.owner}/${this.translation}/releases/tags/latest-data`, { responseType: "json" })
        .then(release => {
          const name = version.endsWith(".zip") ? version : `${version}.zip`;
          const asset = release?.assets?.find(item => item.name === name);

          const digest = typeof asset?.digest === "string"
            ? asset.digest.replace(/^sha256:/i, "")
            : "";
          if (!asset || !asset.browser_download_url || !digest) return reject(false);

          resolve({
            name,
            downloadUrl: asset.browser_download_url,
            sha256: digest,
          })
        }).catch(err => {
          reject(false);
        })
    });
  },  
};

/**
 * @author Canaan HS
 * @description 版本比較更新 (還未加入哈希比較)
 * @param {String} newVersion - 新版本號 (0.5 | 1.5C)
 * @param {String} oldVersion - 當前版本號 (0.5 | 1.5C)
 * @param {Function} updateFunc - 判斷成功後觸發函數
 * @param {Function} silentCheckFunc - 版本相同時觸發函數
 * @returns {Boolean} 是否更新
 */

function versionCompare(newVersion, oldVersion, updateFunc, silentCheckFunc) {

  if ($dataSystem.gameTitle.includes("rev.")) {
  // 已正式转向semver比较，暂时保留旧逻辑用于兜底
    return semverCompare(newVersion, oldVersion, updateFunc, silentCheckFunc);
  }

  if (!newVersion || !oldVersion) return false;

  const regex = /^(\d+(?:\.\d+)*)([A-Za-z]?)$/i;
  const newMatch = regex.exec(newVersion);
  const oldMatch = regex.exec(oldVersion);

  if (!newMatch || !oldMatch) return false;

  const [newNums, newWord] = [newMatch[1].split('.').map(Number), newMatch[2] || ""];
  const [oldNums, oldWord] = [oldMatch[1].split('.').map(Number), oldMatch[2] || ""];

  // 新版本號 > 老版本號
  const len = Math.max(newNums.length, oldNums.length);
  for (let i = 0; i < len; i++) {
    const newN = newNums[i] || 0;
    const oldN = oldNums[i] || 0;

    if (newN > oldN) {
      if (chahuiUtil.checkLegitimatePlayer()) {
        // 只有验证用户才允许大版本更新
	       updateFunc?.({majorUpdate: true});		
         return true;
      }
      return false;
    }
    else if (newN < oldN) return false;
  }

  // 新版本字母 > 老版本字母
  if (newWord > oldWord) {
    updateFunc?.();
    return true;
  }

  // 版本完全相同最終靜音檢查
  //silentCheckFunc?.();
  try {
    const r = silentCheckFunc?.();
    // 如果 silentCheckFunc 返回 Promise，就把 rejection 接住
    if (r && typeof r.then === 'function') {
      r.catch(e => {
        if (e !== false) console.error('[silentCheckFunc] failed:', e);
        // e === false 视为“正常中断/无事发生”，不报红
      });
    }
  } catch (e) {
    if (e !== false) console.error('[silentCheckFunc] failed:', e);
  }  
  return false;
};

function semverCompare(newVersion, oldVersion, updateFunc, silentCheckFunc) {
  if (!newVersion || !oldVersion) return false;
  if (!window.semver) {
    console.error('[versionCompare] semver not loaded');
    return false;
  }

  // 解析（严格）
  const nv = semver.parse(String(newVersion).trim());
  const ov = semver.parse(String(oldVersion).trim());
  if (!nv || !ov) {
    console.error('[versionCompare] invalid semver:', newVersion, oldVersion);
    return false;
  }

  // 新 <= 旧：不更新（相等则走静默）
  const cmp = semver.compare(nv, ov); // 1/0/-1
  if (cmp < 0) return false;

  // 完全相同：静默检查（哈希）
  if (cmp === 0) {
    try {
      const r = silentCheckFunc?.();
      if (r && typeof r.then === 'function') {
        r.catch(e => {
          if (e !== false) console.error('[silentCheckFunc] failed:', e);
        });
      }
    } catch (e) {
      if (e !== false) console.error('[silentCheckFunc] failed:', e);
    }
    return false;
  }

  // cmp > 0：有更新
  const isMajorUpdate = (nv.major !== ov.major) || (nv.minor !== ov.minor);

  // 只有验证用户才允许“大版本更新”
  if (isMajorUpdate && !chahuiUtil.checkLegitimatePlayer()) {
    return false;
  }

  // 触发更新
  updateFunc?.(isMajorUpdate ? { majorUpdate: true } : undefined);
  return true;
}
/**
 * @author Canaan HS
 * @description 解壓文件工具
 * @param {String} zipName - 壓縮檔名
 * @returns 
 */
function zipFile(zipName = "patch.zip") {
  const path = require('path');
  const fs = require('fs/promises');
  const StreamZip = require('node-stream-zip');

  /* 路徑配置 */
  // saveDir = 启动器所在目录（process.cwd()，也是下载补丁 zip 的落点）。
  //   isWrapped：当前部署是否套了 www/（游戏文件在 saveDir/www 下）。
  //   gameRoot：补丁要解压进去的"游戏真实根"——扁平=saveDir，套 www=saveDir/www。
  //   实测补丁 zip 是扁平的（顶层直接是 data/js…，不带 www/），所以直接解压进
  //   gameRoot 即落到正确位置；normalize 仅作"若某补丁自带了 www/ 则摊平"的兜底。
  const saveDir = process.cwd();
  const zipPath = path.join(saveDir, zipName);
  const isWrapped = require('fs').existsSync(path.join(saveDir, "www", "js", "main.js"));
  const gameRoot = isWrapped ? path.join(saveDir, "www") : saveDir;

  async function attachProgress(zip) {
    const total = await zip.entriesCount;
    let count = 0;

    zip.on('extract', () => {
      count++;
      $gameVariables.setValue(82, Math.floor((count / total) * 100));
    })
  };

  // 兜底：若补丁 zip 顶层自带了 www/（老式打包），把 <dir>/www/* 摊平到 <dir>。
  // 扁平补丁没有 www/ 属于正常情况；读取、复制和删除失败必须上报。
  async function normalize(dir) {
    const nestedWww = path.join(dir, "www");
    let files;
    try {
      files = await fs.readdir(nestedWww);
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }

    // 顺序搬运，失败返回时不会还有其它复制任务继续覆盖游戏文件。
    for (const name of files) {
      const src = path.join(nestedWww, name);
      const dst = path.join(dir, name);
      await fs.cp(src, dst, { recursive: true, force: true });
      await fs.rm(src, { recursive: true, force: true });
    }
    await fs.rm(nestedWww, { recursive: true, force: true });
  };

  return {
    saveDir, zipPath,
    async decompress() {
      const zip = new StreamZip.async({ file: zipPath });
      try {
        try {
          await attachProgress(zip);
          await fs.mkdir(gameRoot, { recursive: true });
          await zip.extract(null, gameRoot);   // 直接解压进"游戏真实根"(扁平=根 / 套 www=根/www)
        } finally {
          await zip.close();
        }

        await normalize(gameRoot);            // 兜底：摊平补丁自带的 www/(扁平补丁下为 no-op)
        $gameVariables.setValue(82, 100);

        return true;
      } catch (e) {
        console.error("[patch-install] Failed to install:", zipPath, e);
        throw e;
      } finally {
        // 无论安装成功还是失败，都不复用旧包；重试从下载开始。
        await fs.rm(zipPath, { force: true });
      }
    },
    async save(data) {
      try {
        await fs.mkdir(saveDir, { recursive: true });
        const content = data instanceof ArrayBuffer
          ? Buffer.from(data) : data;
        await fs.writeFile(zipPath, content);
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    }
  };
};

//=============================================================================
//重写源码以添加自动更新功能（泛用的Scene_Title_update移至shiroin_multilingualSupport.js）
//=============================================================================

// 哈希检验-防范更新出现文件遗漏
Scene_Title.prototype.fileIntegrityCheck = async function () {
    if (Utils.isMobileDevice()) return;

    const fs   = require('fs');
    const path = require('path');
    const cwd     = process.cwd();
    // 兼容 www/ 包装：游戏文件在 cwd(扁平部署) 或 cwd/www(套了 www 的部署)。
    const wwwRoot = fs.existsSync(path.join(cwd, "www", "js", "main.js"))
        ? path.join(cwd, "www") : cwd;
    const manifestPath = path.join(wwwRoot, 'manifest.json');

    let manifest;
    try {
        const raw = await fs.promises.readFile(manifestPath, 'utf8');
        manifest  = JSON.parse(raw);
    } catch (e) {
        //console.log("manifest.json 不存在");
        return;
    }

    if (!Array.isArray(manifest) || manifest.length === 0) return;

    const missing = [];

    for (const entry of manifest) {
        const fullPath = path.join(wwwRoot, ...entry.p.split('/'));
        try {
            const stat = await fs.promises.stat(fullPath);
            // 文件存在但大小不符，视为补丁下载不完整
            if (entry.s !== undefined && stat.size !== entry.s) {
                missing.push(entry.p);
            }
        } catch (e) {
            // stat 抛错 = 文件不存在
            missing.push(entry.p);
        }
    }

    // 检测完毕后无论结果如何立即删除 manifest.json
    // 避免下次启动重复触发（该检测仅针对例行的补丁更新后的首次启动）
    await fs.promises.unlink(manifestPath).catch(() => {});    
    if (missing.length === 0) return;
    // -----------------------------------------------------------------------
    // 拼接警告文本
    // -----------------------------------------------------------------------
    let textArray = [
            "Missing or corrupted game files detected!",
            "This may cause unexpected bugs during gameplay.",
            "Please re-download the game and extract it correctly.",
            "",
            "Confirmed problematic files:",
            ""
    ];
    
    let text = textArray.join('\n');
    text += missing.slice(0, 30).join('\n');
    if (missing.length > 30) text += `\n…and ${missing.length - 30} more file(s)`;
    await confirm(text, { align: 'left' });   
};

// 最新版本检查
Scene_Title.prototype.autoUpdataCheck = function () {
  window.ShiroinPlaytime?.checkpoint();
  // 1800 秒后强制允许联网
  if (ConfigManager.totalPlaytime >= 1800) ConfigManager.disableNetwork = false;
  // 公告使用独立的 6 小时持久冷却；离线只读文件，不等待下载或阻塞标题菜单。
  window.StandaloneUpdateLog?.checkAnnouncements();
  if (ConfigManager.disableNetwork) return;

  const versionA = String($dataSystem.gameVersion || "0.1").trim();
  if (versionA.split('.').length < 2) return;



  const now = Date.now();
  const lastCheck = Number(localStorage.getItem(NLCH_UPDATE_KEY_TIME) || 0);
  
  // 首次安装或旧客户端缓存升级时获取一次；已有全语言缓存时不重复请求。
  // 机翻空窗期缺失的单一语言，由玩家点击机翻按钮时按需刷新。
  let changelogCacheReady;
  if (!localStorage.getItem(NLCH_UPDATE_CHANGELOGS) ||
      !localStorage.getItem(NLCH_UPDATE_CHANGELOGS_ALL)) {
    const hadReadableLogs = window.StandaloneUpdateLog?.hasReadableLogs();
    changelogCacheReady = chahuiUtil.fetchAndCacheChangelogs().then(() => {
      // 从无到有也算日志变更；放在初始化回调中，冷却跳过版本检测时仍能生效。
      if (!hadReadableLogs && window.StandaloneUpdateLog?.hasReadableLogs()) {
        chahuiUtil.markTitleChangelogChanged();
      }
    }).catch((error) => {
      console.warn("[changelog] Initial cache refresh failed.", error);
    });
  }

  // 冷却：两分钟内不允许再次联网检测
  if (lastCheck && (now - lastCheck) < NLCH_UPDATE_COOLDOWN) {
     return;
  }
  this._updateCheckLoading = true;
  UsuimoLoading?.show(240, 1005, "Checking for updates...");
  // 记录本次“尝试检测”的时间（失败也冷却，防止刷服务器）
  localStorage.setItem(NLCH_UPDATE_KEY_TIME, String(now));

  // 联网获取最新版本
  let userLang = ConfigManager.language;
  if (userLang === 12) userLang = 0;
  if (userLang > 2) userLang = 2;
  const platform = Utils.isMobileDevice() ? "android" : "pc";
  const url = `${updateMap}/api/latest?curVer=${encodeURIComponent(versionA)}&platform=${platform}&lang=${userLang}`;
  const analytics = window.ShiroinPlayerAnalytics?.prepare?.(url);

  const scene = this;
  const finishUpdateCheck = () => {
    UsuimoLoading?.hide();
    scene._updateCheckLoading = false;
  };

  httpRequest(analytics?.url || url, {
    responseType: 'json',
    usePluginHttp: false,
    onerror() {
      // 失败不清时间戳（已经写入冷却），只保证不残留“待更新版本”
      UsuimoLoading?.setText("Network connection failed!");
      setTimeout(finishUpdateCheck, 3000);
      localStorage.removeItem(NLCH_UPDATE_KEY_VER);
    }
  }).then(result => {
    window.ShiroinPlayerAnalytics?.complete?.(analytics, result);
    const hideUpdateCheckTimer = setTimeout(finishUpdateCheck, 1500);
    if (!result || !result.nextVersion) {
      localStorage.removeItem(NLCH_UPDATE_KEY_VER);
      return;
    }
    const versionB = String(result.nextVersion).trim();
    const regex = /^(\d+(?:\.\d+)*)([A-Za-z]?)$/i;
    if (!regex.test(versionB)) {
      localStorage.removeItem(NLCH_UPDATE_KEY_VER);
      return;
    }

    const cacheChangelog = () => {
      const merge = () => {
        if (chahuiUtil.cacheDetectedChangelog(versionB, result.update, userLang, result)) {
          // 保留未读提示，直到玩家离开公告/更新日志阅读界面。
          chahuiUtil.markTitleChangelogChanged();
        }
      };
      // 首次完整缓存完成后再合并，避免正文被覆盖；不延迟更新确认和提示收尾。
      if (changelogCacheReady) changelogCacheReady.then(merge);
      else merge();
    };

    // 4) 比对：确认可更新才缓存 versionB，并进入确认流程
    const hasUpdate = versionCompare(versionB, versionA, (extra={}) => {
      cacheChangelog();
      $dataSystem.updateLog = result.update;
      if (extra.majorUpdate) {
        // 标记大版本更新，供后续更新流程分流到 autoUpdateMajorVersion
        chahuiUtil.checkLegitimatePlayer({ markMajorUpdate: true });
      }      
      // 缓存“待更新版本”与检测时间
      localStorage.setItem(NLCH_UPDATE_KEY_VER, versionB);
      localStorage.setItem(NLCH_UPDATE_KEY_TIME, String(Date.now()));

      scene.autoUpdataConfirm(versionB);
      scene._startedCustomGame = true;
    }, () => {
      // 同版本检测已带回当前语言的日志，直接补齐静默更新后迟发布的正文。
      // 不再请求日志接口；旧式版本比较的静默分支也可能接收较旧字母版本，故显式核对。
      if (versionB === versionA) {
        cacheChangelog();
      }
      // 翻译检查可能继续使用同一 Loading；避免旧计时器在下载途中将其隐藏
      clearTimeout(hideUpdateCheckTimer);
      finishUpdateCheck();
      return chahuiUtil.silentTranslationUpdate();
    });
    // 优先更新当前可用补丁；没有可用更新时，才提醒无资格玩家获取新版本。
    if (!hasUpdate) {
      chahuiUtil.notifyOutdatedVersion(result.lastVersion || versionB, versionA);
    }

  }).catch(() => {
    localStorage.removeItem(NLCH_UPDATE_KEY_VER);
    // 不动 NLCH_UPDATE_KEY_TIME：保持冷却
  });
};

Scene_Title.prototype.autoUpdataConfirm = async function (version) {

  // 防范玩家在已经点击选项后继续弹窗
  if (this._commandWindowInitialized) {
    if (!this._commandWindow || !this._commandWindow.isOpenAndActive()) {
      return;
    }
  }

  // 标题场景与其它更新入口共用同一套机翻、缓存刷新和确认逻辑；
  // 真正开始更新时仍调用标题场景原有的 commandNewGame，以保留窗口关闭、
  // 淡出、标题视频清理和新游戏音效等插件扩展行为。
  return chahuiUtil.showUpdateNotification(version, {
    startNewGame: () => this.commandNewGame()
  });
};

//=============================================================================
//不同情景的自动更新流程
//=============================================================================

// 自动更新检测
chahuiUtil.autoUpdataCheck = async function (extra={}) {

  if (this && this instanceof Game_QJBulletMZ) {
    // SLG监听器才会触发的流程
    // 同步游戏时长
    DataManager.refreshGameTitle({showPlaytime:true});
    window.ShiroinPlaytime?.checkpoint();
    if (this._checked) return;
    this._checked = true;    
  }

//
//  自动更新检测主流程
//  
  if (!appScript || ConfigManager.disableNetwork) return {ok:false};
  QJ.MPMZ.tl._imoutoUtilGameAnnouncementIcon();
  //  冷却时间检测
  const now = Date.now();
  const lastCheck = Number(localStorage.getItem(NLCH_UPDATE_KEY_TIME) || 0);
  if ($gameTemp._hasUsedFreeUpdateCheck && (lastCheck && (now - lastCheck) < NLCH_UPDATE_COOLDOWN)) {
     return;
  }
  $gameTemp._hasUsedFreeUpdateCheck = true;
  localStorage.setItem(NLCH_UPDATE_KEY_TIME, String(now));
  let versionA = String($dataSystem.gameVersion) || 0.1;
  let userLang = ConfigManager.language;
  if (userLang === 12) userLang = 0;
  if (userLang > 2) userLang = 2;
  const platform = Utils.isMobileDevice() ? "android" : "pc";

  //const url = `${appScript}?mode=LatestVersion&lang=${userLang}&version=${versionA}&isAndroid=${isAndroid}`;
  const url = `${updateMap}/api/latest?curVer=${versionA}&platform=${platform}&lang=${userLang}`;
  const analytics = window.ShiroinPlayerAnalytics?.prepare?.(url);
  // 等待服务器返回最新版本信息
  let result;
  try {
    result = await httpRequest(analytics?.url || url, { responseType: "json", usePluginHttp: false });
    window.ShiroinPlayerAnalytics?.complete?.(analytics, result);
  } catch (_) {
    // 网络请求失败时静默跳过更新检查，不影响游戏流程。
    return {ok:false};
  }
  if (!result || !result.nextVersion) {
    // 返回数据异常时同样静默跳过。
    return {ok:false};
  }

  // 读取游戏公告
  if (result.announcement && result.announcement.trim() !== "") {
      let announcement = result.announcement;
      if (!ConfigManager.disableNetwork) {
          $gameStrings.setValue(25, announcement);
          //QJ.MPMZ.tl._imoutoUtilGameAnnouncementIcon();
      }
  }
  const lastVer  = result.lastVersion;
  const versionB = result.nextVersion;
  const log      = result.update;
	$dataSystem.updateLog = log;
  const hasUpdate = versionCompare(
      versionB, versionA,
      (extra={}) => {
        localStorage.setItem(NLCH_UPDATE_KEY_VER, String(versionB).trim());
        $dataSystem.updateLog = log;
        //QJ.MPMZ.tl._imoutoUtilautoUpdataIcon?.();
        if(extra.majorUpdate) {
          // 要打标记，不然重启游戏就没了
          chahuiUtil.checkLegitimatePlayer({ markMajorUpdate: true });
        } 
      },
      async () => {
        await chahuiUtil.silentIncrementalUpdate(versionB);
        return {ok:true};
      }
  );
	
  // 优先更新当前可用补丁；没有可用更新时，才提醒无资格玩家获取新版本。
  const latestVersion = lastVer || versionB;
  if (!hasUpdate && chahuiUtil.notifyOutdatedVersion(latestVersion, versionA)) {
    return { ok: false, outdated: true, lastVer: latestVersion };
  }
  return { ok: hasUpdate, version:versionB };
};

// 纯版本比较：不能复用 versionCompare，后者还会根据正版资格拒绝大版本更新。
function isNewerGameVersion(newVersion, oldVersion) {
  if (!newVersion || !oldVersion) return false;
  const latest = String(newVersion).trim(), current = String(oldVersion).trim();
  if ($dataSystem.gameTitle.includes("rev.")) {
    if (!window.semver) return false;
    const nv = semver.parse(latest), ov = semver.parse(current);
    return !!(nv && ov && semver.compare(nv, ov) > 0);
  }
  // 兼容旧数字+字母版本（如 0.99A），不改变旧更新入口的版本规则。
  const regex = /^(\d+(?:\.\d+)*)([A-Za-z]?)$/i;
  const nv = regex.exec(latest), ov = regex.exec(current);
  if (!nv || !ov) return false;
  const nn = nv[1].split('.').map(Number), on = ov[1].split('.').map(Number);
  for (let i = 0; i < Math.max(nn.length, on.length); i++) {
    const difference = (nn[i] || 0) - (on[i] || 0);
    if (difference) return difference > 0;
  }
  return (nv[2] || '') > (ov[2] || '');
}

chahuiUtil.notifyOutdatedVersion = function (latestVersion, currentVersion) {
  if ($dataSystem.isDemo || !isNewerGameVersion(latestVersion, currentVersion)) return false;
  // 未登录与已登录但无资格，都由现有资格接口返回 false；不读取更新流程标记 allowMajorUpdate。
  if (chahuiUtil.checkLegitimatePlayer()) return false;
  chahuiUtil.showOutdatedVersionWarning(latestVersion);
  return true;
};

// 过时版本警告
chahuiUtil.showOutdatedVersionWarning = function (version) {
  // 标题阶段 $gameTemp 尚未创建；使用运行期标记，也避免进入地图后再次提醒。
  if (hasShownOutdatedVersionWarning) return;
  hasShownOutdatedVersionWarning = true;
  let textArray = window.systemFeatureText && window.systemFeatureText.outdatedVersionWarning;
  if (!textArray) {
		  textArray = [
        "The current game version has expired. The latest version is ${}.",
        "Major automatic updates are now available, but exclusively for users who have completed the official ownership verification system. ",
        "If you cannot complete the verification, you will still need to redownload the game from official channels to update."
	    ];
	}
  let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
  const match = String(text).match(/\$\{([^}]*)\}/);
  if (match) text = String(text).replace(/\$\{[^}]*\}/g, `${version}`);
  alert(text, 
        { align: "left",
          extraButton: {
            text: "Verification",
            onClick: (ctx) => {
                ctx.close("__reset__");
                SoundManager.playOk();
                SceneManager.push(Scene_PatreonVerify);
              }
            }
        });
};

// 大版本更新
chahuiUtil.autoUpdateMajorVersion = async function (extra={}) {
  
  let auth = JSON.parse(localStorage.getItem('gm_patreon_verify') || '{}');
  if (!auth || !auth.userName || !auth.device_id) {
      // 数据缺失的兜底
      auth = {userName: '233', device_id: '233'};
  }
  const USERNAME = String(auth.userName || '').trim();
  const DEVICE_ID = String(auth.device_id || '').trim();
  // 优先使用 player_id
  const PLAYER_ID_RAW = auth.playerId != null ? auth.playerId : auth.player_id;
  const PLAYER_ID = String(PLAYER_ID_RAW == null ? '' : PLAYER_ID_RAW).trim();
  const TICKET_WORKER_BASE = 'https://ticketworker.shiroin.workers.dev';
  let url = '';
  if (/^\d+$/.test(PLAYER_ID)) {
    // 优先：player_id + device_id
    url =
      `${TICKET_WORKER_BASE}/ticket/get` +
      `?player_id=${encodeURIComponent(PLAYER_ID)}` +
      `&device_id=${encodeURIComponent(DEVICE_ID)}`;
  } else {
    // 兜底：username + device_id
    url =
      `${TICKET_WORKER_BASE}/ticket/get` +
      `?username=${encodeURIComponent(USERNAME)}` +
      `&device_id=${encodeURIComponent(DEVICE_ID)}`;
  }

  return httpRequest(url, { responseType: "json" }).then(async result => {
      if (result.ok && result.ticket && result.ticket.trim() !== "") {
        const ticket      = result.ticket;
        const mark        = localStorage.getItem(NLCH_UPDATE_KEY_VER);
        const version     = `${extra.version || mark}.zip`;
        const downloadUrl = `${TICKET_WORKER_BASE}/download?ticket=${encodeURIComponent(ticket)}&ver=${encodeURIComponent(extra.version)}`;
        const ok = await chahuiUtil.tryDownloadReleaseZip(version, {name:version, downloadUrl:downloadUrl});
        if (ok) {
            // 解压安装成功时自带清理标记功能，这里只是以防万一
            localStorage.removeItem('gm_patreon_verify');
        }
      } else {
        // 更新失败的情况
        if (result.error && result.error.trim() !== "") {
            // 失败了就要清理标记和缓存
            localStorage.removeItem('gm_patreon_verify');        
            let textArray = window.systemFeatureText?.memberMenu?.["majorUpdateFailed"];
            if (!textArray) textArray = ["Major update failed: ${error}"];
            let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? ""); 
            const match = String(text).match(/\$\{([^}]*)\}/);
            if (match) text = String(text).replace(/\$\{[^}]*\}/g, String(result.error));               
            await confirm(text, { align: "left" });
        }
        setTimeout(() => location.reload(), 1000);
     }
  })
};


// 静默迭代更新
chahuiUtil.silentIncrementalUpdate = async function (version) {

  // 日本平台分流  
  if (ConfigManager.isJapanesePlatform && !version.includes("DL")) {
      version += "DL";
  }  

  const info = await githubCfg.getReleaseAssetSha256(version);
  if (!info || !info.sha256)  return;
  const oldSha256 = localStorage.getItem(USUIMO_PATCH_HASH);
  // 没有安装记录时也实际下载、安装，不能把远端哈希直接视为本地已安装。
  if (info.sha256 === oldSha256 || Utils.isOptionValid("test")) return;
  UsuimoLoading?.show(1460, 120, "Silent update in progress…");
  chahuiUtil.fetchAndCacheChangelogs?.();
  const ok = await chahuiUtil.tryDownloadReleaseZip(version, Object.assign(info, { silentUpdate: true }));

  if (ok) {
    // 仅记录游戏补丁已安装；不写入存档，供本次运行的错误提示使用。
    $gameTemp._silentUpdateInstalled = true;
    // 更新成功静默通知 
    setTimeout(() => UsuimoLoading?.hide(), 200); 
    let textArray = window.systemFeatureText?.silentUpdateSuccess;
    if (!textArray) textArray = `New patch content for ${version} has been successfully installed and will take effect upon the next restart.`;
    let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
    const match = String(text).match(/\$\{([^}]*)\}/);
    if (match) text = String(text).replace(/\$\{[^}]*\}/g, `\\fs[24]${version}`);
    text = "\\c[6]\\fs[24]" + text;
    $gameSystem._drill_GFTH_styleId = 6;
    if (Utils.isMobileDevice()) {
      // 安卓版会在初始化阶段修改漂浮框坐标，这里需要校准一下
        DrillUp.g_GFTH_style[5].regist_x = 1900;
        DrillUp.g_GFTH_style[5].regist_y = 420;
    }
    if (ConfigManager.language > 0) $gameTemp.drill_GFTH_pushNewText(text);
    if ($dataSystem.updateLog) {
        // QJ.MPMZ.tl._imoutoUtilautoUpdataIcon();	
	  }
  } else {
    UsuimoLoading?.setText("Network connection failed!");
    setTimeout(() => UsuimoLoading?.hide(), 1500);
  }
};

// 静默更新后的报错提示：保留原错误画面及上报，提醒玩家重启加载新文件。
chahuiUtil.showSilentUpdateErrorWarning = async function () {
  const gameTemp = $gameTemp;
  if (!gameTemp?._silentUpdateInstalled || gameTemp._silentUpdateErrorNoticeOpen) return;
  gameTemp._silentUpdateErrorNoticeOpen = true;
  try {
    let textArray;
    switch (ConfigManager.language) {
      case 0:
      case 12:
        textArray = [
          "本次运行期间已安装过静默更新补丁。",
          "部分新增文件需要重启游戏后才能正常加载，本次报错可能与此有关。",
          "请尝试重启游戏，以刷新并重新加载相关文件。"
        ];
        break;
      case 1:
        textArray = [
          "今回の起動中にサイレントアップデートのパッチがインストールされています。",
          "一部の新規ファイルは、正常に読み込むためにゲームの再起動が必要です。今回のエラーはこれに関連している可能性があります。",
          "ゲームを再起動し、関連ファイルを再読み込みしてみてください。"
        ];
        break;
      default:
        textArray = [
          "A silent update patch has already been installed during this session.",
          "Some newly added files require a game restart to load properly. This error may be related.",
          "Please try restarting the game to refresh and reload the relevant files."
        ];
        break;
    }
    const text = textArray.join("\n");
    // 提示关闭后仍停留在错误画面，由原有“继续游戏”按钮负责恢复。
    await alert(text, { align: "left", resumeGame: false });
  } finally {
    gameTemp._silentUpdateErrorNoticeOpen = false;
  }
};

const silentUpdatePrintError = Graphics.printError;
Graphics.printError = function (...args) {
  const result = silentUpdatePrintError.apply(this, args);
  if (window.$gameTemp?._silentUpdateInstalled) {
    chahuiUtil.showSilentUpdateErrorWarning().catch(error => {
      console.error("[patch-update] Error warning failed:", error);
    });
  }
  return result;
};

// 启动时静默更新游戏翻译文本
chahuiUtil.silentTranslationUpdate = async function () {
  // 开发测试环境绝不能下载或覆盖工程文件
  if (Utils.isOptionValid("test")) return false;

  // Scene_Title.start 可能在同一运行期内多次进入；联网前就加锁，避免并发检测
  if (chahuiUtil._translationUpdateChecked) return false;
  chahuiUtil._translationUpdateChecked = true;

  if (ConfigManager.disableNetwork) return false;

  let info;
  try {
    info = await githubCfg.getTranslationReleaseAssetSha256();
  } catch (error) {
    console.warn("[translation-update] Failed to obtain release information.", error);
    return false;
  }

  if (!info?.sha256 || !info.downloadUrl) return false;

  const oldSha256 = localStorage.getItem(USUIMO_TRANSLATION_HASH);
  if (!oldSha256) {
    // 新安装的游戏以随包翻译为当前基线，首次只记录远端哈希
    localStorage.setItem(USUIMO_TRANSLATION_HASH, info.sha256);
    return false;
  }

  if (info.sha256 === oldSha256) return false;

  UsuimoLoading?.show(1460, 120, "Updating translation text…");
  const ok = await chahuiUtil.tryDownloadReleaseZip(info.name, Object.assign({}, info, {
    silentUpdate: true,
    translationUpdate: true
  }));

  if (!ok) {
    UsuimoLoading?.setText("Network connection failed!");
    setTimeout(() => UsuimoLoading?.hide(), 2000);
    return false;
  }

  // 哈希代表已成功安装到磁盘，因此只在解压成功后更新
  localStorage.setItem(USUIMO_TRANSLATION_HASH, info.sha256);

  try {
    await DataManager.reloadLanguage(false);
    UsuimoLoading?.setText("Text update successful!");
  } catch (error) {
    // 文件已经安装；热加载失败时，下次启动仍会自然读取新文本
    console.warn("[translation-update] Hot reload failed; the new text will apply next launch.", error);
    UsuimoLoading?.setText("Text update installed. It will take effect next launch.");
  }

  setTimeout(() => UsuimoLoading?.hide(), 1500);
  return true;
};

// 同步更新游戏翻译文本
chahuiUtil.TranslationUpdate = async function () {
  UsuimoLoading?.show(1460, 120, "Updating translation text…");
  const info = await githubCfg.getTranslationReleaseAssetSha256();
  if (!info) {
     UsuimoLoading?.setText("Network connection failed!");
     setTimeout(() => UsuimoLoading?.hide(), 2000);    
     return;
  } 
  const oldSha256 = localStorage.getItem(USUIMO_TRANSLATION_HASH);
  if (!oldSha256) {
     // 没有记录值时初始化一次
     localStorage.setItem(USUIMO_TRANSLATION_HASH, info.sha256);
  } else {
     if (info.sha256 === oldSha256 || Utils.isOptionValid("test")) {
         // 没有更新时直接取消更新
         UsuimoLoading?.setText("Already the latest version!");
         setTimeout(() => UsuimoLoading?.hide(), 1500);
         return;
     }
  }
  const zipName = "data.zip";
  const ok   = await chahuiUtil.tryDownloadReleaseZip(zipName, {name:zipName, translationUpdate: true, downloadUrl:githubCfg.translationDownloadURL(zipName)});
  if (ok) {
     // 更新成功
     UsuimoLoading?.setText("Text update successful! ");
     setTimeout(() => UsuimoLoading?.hide(), 1500);
     return true;
  }

  UsuimoLoading?.setText("Network connection failed!");
  setTimeout(() => UsuimoLoading?.hide(), 2000);
  return false;
};

/* 强制触发自动更新（废弃）

chahuiUtil.forceAutoUpdateConfirm = function () {
  const versionA = $dataSystem.gameVersion || "";

  let userLang = ConfigManager.language;
  if (userLang > 2) userLang = 2;
  const isAndroid = Utils.isMobileDevice();

  const url = `${appScript}?mode=ForceRedownloadCurrent&lang=${userLang}&version=${versionA}&isAndroid=${isAndroid}`;
  httpRequest(url, { responseType: "json" }).then(async result => {
    if (result.nextVersion && result.update && result.update.trim() !== "") {
      let version = result.nextVersion;
      let log = result.update;
      $gameVariables.setValue(2, version);
      $dataSystem.updateLog = log;
      chahuiUtil.showUpdateNotification(version);
    }
  })
};
*/

// 显示更新通知/游戏更新弹窗
chahuiUtil.showUpdateNotification = async function (version, extra={}) {

      if (ConfigManager.disableNetwork) return;

      if (!version) return;
      const language = Number(ConfigManager.language);
      // The standalone reader can supply the selected version's log.
      const log = extra.log ?? $dataSystem.updateLog;
      const sourceLog = typeof log === "string" ? log : "";
      const fallbackLog = language === 0 || language === 12
        ? "更新日志获取失败，请检查网络连接后重试！"
        : "Failed to retrieve the update log. Please check your network connection and try again!";
      const hasValidLog = value => {
        if (typeof value !== "string") return false;
        const text = value.replace(/\\(?:fs|c)\s*\[\s*-?\d+\s*\]/gi, '').trim();
        return text !== "" && text !== "0";
      };
      let textArray = window.systemFeatureText?.autoUpdate;
      if (!textArray) textArray = [
                              "Update available: Version ${} game data detected. ",
                              "Would you like to download and update now?"
                            ];
      let promptText = Array.isArray(textArray) ? textArray.join('\n') : String(textArray);
      const match = String(promptText).match(/\$\{([^}]*)\}/);
      if (match && version) {
        promptText = String(promptText).replace(/\$\{[^}]*\}/g, version);
      }

      const buildPrompt = (logText) => {
        let text = promptText;
        text += "\n \n" + (hasValidLog(logText) ? logText : fallbackLog);
        // 删除多余转义字符，但保留原始文本用于缓存一致性校验。
        return text.replace(/\\(?:fs|c)\s*\[\s*-?\d+\s*\]/gi, '');
      };

      let translatedLog = "";
      const readCachedTranslation = () => {
        try {
          const raw = localStorage.getItem(NLCH_UPDATE_CHANGELOGS_ALL);
          const bundle = raw ? JSON.parse(raw) : null;
          const entry = bundle?.schemaVersion === 2
            ? bundle.changelogs?.find((item) => String(item?.version).trim() === String(version).trim())
            : null;
          const logs = entry?.logs || {};
          // 繁中以简中为原文，其它小语种以英文为原文。缓存原文与本次
          // /latest 返回的日志不一致时，说明同版本日志又被编辑过，必须刷新。
          const cachedSource = language === 12
            ? String(logs["0"] ?? logs[0] ?? "")
            : String(logs["2"] ?? logs[2] ?? "");
          if (cachedSource !== sourceLog) return "";
          const translated = logs[String(language)] ?? logs[language] ?? "";
          return hasValidLog(translated) ? translated : "";
        } catch (error) {
          console.warn("[changelog] Update-notification translation cache is invalid.", error);
          return "";
        }
      };

      const machineTranslationEnabled = language > 2 && hasValidLog(sourceLog);
      const sourceHash = changelogTranslationSourceHash(sourceLog);
      const selectionKey = `${language}:${String(version).trim()}:${sourceHash}`;
      const translateSignal = "__translate_update_notification__";

      if (machineTranslationEnabled) {
        if ($gameTemp._changelogMachineTranslationSelectionVersion !==
            CHANGELOG_MACHINE_TRANSLATION_SELECTION_VERSION) {
          $gameTemp._changelogMachineTranslationSelectionVersion =
            CHANGELOG_MACHINE_TRANSLATION_SELECTION_VERSION;
          $gameTemp._changelogMachineTranslationSelections = {};
        }
        $gameTemp._changelogMachineTranslationSelections =
          $gameTemp._changelogMachineTranslationSelections || {};
        $gameTemp._changelogMachineTranslationPending =
          $gameTemp._changelogMachineTranslationPending || {};
        translatedLog = readCachedTranslation();
      }

      let ask;
      while (true) {
        const selected = machineTranslationEnabled &&
          $gameTemp._changelogMachineTranslationSelections[selectionKey] &&
          translatedLog;
        const options = { align: "left" };

        if (machineTranslationEnabled && !selected) {
          options.extraButton = {
            text: CHANGELOG_MACHINE_TRANSLATION_BUTTON_TEXT[language] || "Machine Translation",
            onClick: async (ctx) => {
              if ($gameTemp._changelogMachineTranslationPending[selectionKey]) return;
              $gameTemp._changelogMachineTranslationPending[selectionKey] = true;

              try {
                if (!translatedLog) {
                  await chahuiUtil.fetchAndCacheChangelogs();
                  translatedLog = readCachedTranslation();
                }
              } catch (error) {
                console.warn("[changelog] Update-notification translation refresh failed.", error);
              } finally {
                delete $gameTemp._changelogMachineTranslationPending[selectionKey];
              }

              if (translatedLog) {
                $gameTemp._changelogMachineTranslationSelections[selectionKey] = true;
              }
              // 让外层循环重新打开确认框；失败时仍显示原文并保留机翻按钮。
              ctx.close(translateSignal);
            }
          };
        }

        ask = await confirm(buildPrompt(selected ? translatedLog : sourceLog), options);
        if (ask !== translateSignal) break;
      }

      if (ask) {
        localStorage.setItem(NLCH_UPDATE_KEY_VER, version);
        // 将玩家送进小黑屋
        const preMapId  = $dataSystem.startMapId;
        const preStartX = $dataSystem.startX;
        const preStartY = $dataSystem.startY;  
        $dataSystem.startMapId = 33;
        $dataSystem.startX = 8;
        $dataSystem.startY = 5;              
        if (typeof extra.startNewGame === "function") {
            extra.startNewGame();
        } else {
            if (SceneManager._scene && SceneManager._scene.fadeOutAll) {
                SceneManager._scene.fadeOutAll();
            }
            DataManager.setupNewGame();
            SceneManager.goto(Scene_Map);
        }
        $dataSystem.startMapId = preMapId;
        $dataSystem.startX = preStartX;
        $dataSystem.startY = preStartY;
        return true;        
      } else {
        // 放弃更新，清理标记
        localStorage.removeItem(NLCH_UPDATE_KEY_VER); 
      }
      return false;
};

// 自动更新提醒图标
QJ.MPMZ.tl._imoutoUtilautoUpdataIcon = function() {
  if (ConfigManager.disableNetwork) return; 	
	if (!SceneManager._scene || !(SceneManager._scene instanceof Scene_Map)) return;
	if ($gameMap.mapId() !== 4) return;
	if ($gameScreen.picture(81)) return;
	if ($gameSwitches.value(28)) return;

	if ($gameMap.isEventRunningQJ()) {
	   setTimeout(() => QJ.MPMZ.tl._imoutoUtilautoUpdataIcon(), 2000);
	   return;
	}
	
	let IMG = "autoUpdataIcon";
	$gameScreen.showPictureFromPath(81, "characters", IMG, 0, 388, 360, 100, 100, 0, 0);
	IMG = $gameScreen.picture(81);
	// 更新提示音
	AudioManager.playSe({name: "038myuu_YumeSE_FukidashiOnnpu01", volume: 80, pitch: 100, pan: 0});	
	if (IMG) {
    $gameScreen.movePicture(81, IMG.origin(), IMG.x(), IMG.y(), IMG.scaleX(), IMG.scaleY(), 255, 0, 30);
    IMG.drill_PCE_stopEffect();
	  IMG.drill_PCE_playSustainingFloating( 518400000,1,1,120,3 );
	  $gameScreen.setPictureCallCommon(81, 40, 1,null);
	}	
	
};

// 检查更新日志缓存。
// 缓存原文不变时，不重复解析 JSON。
chahuiUtil.hasGameAnnouncementCache = (() => {
    let lastRaw;
    let hasCache = false;

    return function () {
        try {
            const raw = localStorage.getItem(NLCH_UPDATE_CHANGELOGS);

            if (raw !== lastRaw) {
                lastRaw = raw;
                hasCache = false;

                const data = raw ? JSON.parse(raw) : null;
                hasCache = Array.isArray(data) && data.length > 0;
            }

            return hasCache;
        } catch (_) {
            lastRaw = undefined;
            hasCache = false;
            return false;
        }
    };
})();

QJ.MPMZ.tl._imoutoUtilGameAnnouncementIcon = function (extra = {}) {
    // ==================== 公告内容解析 ====================
    if (extra.linkParsing) {
        function findMatchingParenEnd(src, i) {
            let depth = 1;
            let quote = "";
            let escaped = false;

            for (; i < src.length; i++) {
                const ch = src[i];

                if (quote) {
                    if (escaped) {
                        escaped = false;
                    } else if (ch === "\\") {
                        escaped = true;
                    } else if (ch === quote) {
                        quote = "";
                    }
                    continue;
                }

                if (ch === "'" || ch === '"' || ch === "`") {
                    quote = ch;
                    continue;
                }

                if (ch === "(") depth++;
                if (ch === ")" && --depth === 0) return i + 1;
            }

            return -1;
        }

        let text = String($gameStrings.value(25) || "");

        // 提取公告中的选项链接
        const match = text.match(/<<\s*(https?:\/\/[^>\s]+)\s*>>/i);

        if (match) {
            $gameMap.chahuiMapTemp = $gameMap.chahuiMapTemp || {};
            $gameMap.chahuiMapTemp.optionUrl = match[1];

            text = (
                text.slice(0, match.index) +
                text.slice(match.index + match[0].length)
            ).trim();
        }

        const needle = "EmbedOverlay.show(";
        const start = text.lastIndexOf(needle);

        if (start < 0) {
            $gameStrings.setValue(13, text);
            return;
        }

        const end = findMatchingParenEnd(
            text,
            start + needle.length
        );

        if (end < 0) {
            $gameStrings.setValue(13, text);
            return;
        }

        // 保留原来的广告注入逻辑
        try {
            eval(QJ.MPMZ.tl.steamStorePageAdvertisement(true));
        } catch (error) {
            console.error(error);
        }

        const removed = (
            text.slice(0, start) + text.slice(end)
        ).trim();

        $gameStrings.setValue(13, removed);
        return;
    }

    // ==================== 公告按钮注册 ====================
    const Buttons = SLGSceneFreeExploration.Buttons;
    const id = "AnnouncementIcon";

    // 初始化和公共事件入口共用检查；不加入每帧显示条件。
    // 当前显示方法直接遍历原数组，因此整组记录都必须可安全读取。
    let hasValidLogs = false;
    try {
        const raw = localStorage.getItem(NLCH_UPDATE_CHANGELOGS);
        const changelogs = raw ? JSON.parse(raw) : null;
        const hasText = value => typeof value === "string" && value.trim() !== "";
        let bundle = null;
        try {
            const bundleRaw = localStorage.getItem(NLCH_UPDATE_CHANGELOGS_ALL);
            const parsed = bundleRaw ? JSON.parse(bundleRaw) : null;
            if (parsed?.schemaVersion === 2 && Array.isArray(parsed.changelogs)) {
                bundle = parsed;
            }
        } catch (_) {
            // 与日志显示方法一致：全语言缓存损坏时回退旧缓存。
        }

        const language = Number(ConfigManager.language);
        hasValidLogs = (!bundle || bundle.changelogs.every(item => item && typeof item === "object")) &&
            Array.isArray(changelogs) && changelogs.length > 0 &&
            changelogs.every(entry => {
                if (!entry || typeof entry !== "object" || !hasText(entry.version)) return false;
                const bundleEntry = bundle?.changelogs.find(item => item?.version === entry.version);
                const logs = bundleEntry?.logs || {};
                const englishText = logs["2"] ?? entry.log ?? "";
                // 检查实际会显示的默认正文，保留繁中读简中、小语种读英文的规则。
                const text = language === 12
                    ? logs["0"] ?? entry.log ?? englishText
                    : language > 2
                        ? englishText
                        : logs[String(language)] ?? entry.log ?? englishText;
                return hasText(text);
            });
        if (hasValidLogs && extra.viewLogs) {
            const version = $gameMap.chahuiMapTemp?.viewingVersion;
            hasValidLogs = changelogs.some(entry => entry.version === version);
        }
    } catch (_) {
        hasValidLogs = false;
    }

    // 先清理，再判断是否已注册，保证旧存档恢复的按钮也会经过校验。
    if (ConfigManager.disableNetwork || !hasValidLogs) {
        Buttons.unregister(id);
        if ($gameScreen.picture(83)?.name() === "sister_room_night_diary") {
            $gameScreen.erasePicture(83);
        }
        return false;
    }

    // 公共事件只检查和清理，不在显示菜单前补建按钮。
    if (extra.checkOnly || Buttons.get(id)) return true;

    Buttons.register(id, {
        image: [
            "pictures",
            "characters/gameAnnouncementIcon"
        ],

        x: 1533,
        y: 590,

        scale: Utils.isMobileDevice() ? 1.5 : 1,
        anchor: [0.56, 0.55],
        screenSpace: true,

        visible: true,
        enabled: true,

        visibleCondition: "!$gameSwitches._data[46]",

        // 对话、选项及事件执行期间隐藏
        autoHide: true,
        hideDuringMessage: true,
        hideDuringEvent: true,
        showDuringChoice: false,
        disableDuringChoice: true,

        fadeFrames: 30,
        cooldownFrames: 30,
        updateDuringCooldown: true,

        clickSe: "ok",
        persist: true,

        onClick:
            "$gameMap.steupCEQJ(41, 1, { optionFunction: true });"
    });
    return true;
};

// ------------------------------------------------------------------
// 自动更新下载与安装解压流程
// ------------------------------------------------------------------

// 自动更新主流程
chahuiUtil.autoUpdate = async function (version, isTitle) {

  // 日本平台分流  
  if (ConfigManager.isJapanesePlatform && !version.includes("DL")) {
      version += "DL";
  }  
  // 合法玩家走大版本更新（独立流程）
  if (chahuiUtil.checkLegitimatePlayer({ allowMajorUpdate: true })) {
    // 关闭地图事件以避免干扰
    $gameSelfSwitches.setValue([33, 1, 'C'], true);
    return chahuiUtil.autoUpdateMajorVersion({ version });
  }
  // 刷新更新日志
  chahuiUtil.fetchAndCacheChangelogs?.();
  // 优先尝试 Releases 直链 ZIP
  const ok = await chahuiUtil.tryDownloadReleaseZip(version);
  if (ok) return;

  // 通常来说不会失败，但需要考虑GitHub被防火墙拦截的情况  
  let name = `${version}.zip`;
  let url  = `${R2PatchPublicUrl}${name}`;
  const R2 = await chahuiUtil.tryDownloadReleaseZip(name, {name:name, downloadUrl:url});
  if (R2) return;

  // 兜底也失败就没救了

  let textArray = ["网络连接失败！无法下载更新补丁。", "请确认当前网络可以访问 GitHub 后再重试。"];
  if (ConfigManager.language > 0) {
      textArray = ["Network connection failed. Unable to download the update patch.", "Please make sure your network can access GitHub, then try again."];
  }
  let text = textArray.join("\n");
  await confirm(text, { align: "left" });
  setTimeout(() => location.reload(), 3000);
  return false;
};

// 下载补丁压缩包（默认走gitHub源）
chahuiUtil.tryDownloadReleaseZip = async function (version, opt = {}) {
  // 轻量 HEAD 探测
  async function headOk(url) {
    function disableHeadDetection(url) {
      return url.includes("shiroin.workers");
    }
    if (disableHeadDetection(url)) {
      // 带ticket校验的R2桶不适合探头，而且只应用于大版本更新，直接放行
      return true;
    }
    return new Promise((resolve) => {
      httpRequest(url, { method: 'HEAD' })
        .then(() => resolve(true))
        .catch(() => resolve(false));
    })
  };

  const isTranslationUpdate = !!opt.translationUpdate;
  const previousZipQueueValue = isTranslationUpdate ? $gameVariables.value(86) : undefined;
  const previousZipQueue = Array.isArray(previousZipQueueValue)
    ? previousZipQueueValue.slice()
    : previousZipQueueValue;

  try {
    //————————————————————————
    // 需要考虑日本平台的分歧
    //————————————————————————
    if (ConfigManager.isJapanesePlatform && !version.includes("DL")) {
        version += "DL";
    }
    const name = opt.name || `${version}.zip`;
    const url = opt.downloadUrl || githubCfg.downloadURL(name);

    // 哈希先保存在本次调用中，全部安装成功后才提交。
    let patchSha256 = opt.sha256;
    if (!opt.silentUpdate && !opt.downloadUrl) {
      const info = await githubCfg.getReleaseAssetSha256(version);
      if (info?.sha256) {
        patchSha256 = info.sha256;
        $gameSelfSwitches.setValue([33, 1, 'C'], true);
      }
    };

    if (!(await headOk(url))) return false;
    // 清理标记
    if (!isTranslationUpdate) {
      $gameVariables.setValue(83, 100);
    }
    // 下载到 www/ 下	
    await downloadOneFile(url, name);
    // 解压安装
    let installed = false;
    if (Utils.isMobileDevice()) {
      installed = await chahuiUtil.androidExtractAndInstallPatch([name], opt);
    } else {
      $gameVariables.setValue(86, [name]);
      installed = await chahuiUtil.extractAndInstallPatch(opt);
    }
    if (installed !== true) return false;

    if (!isTranslationUpdate) {
      if (patchSha256) localStorage.setItem(USUIMO_PATCH_HASH, patchSha256);
      // 备用源 / 大版本包没有提供哈希，不能沿用上一次补丁的安装记录。
      else localStorage.removeItem(USUIMO_PATCH_HASH);
      localStorage.removeItem(NLCH_UPDATE_KEY_VER);
    }
    return true;
  } catch (e) {
    console.warn("[releases-zip] 下载或解压失败：", e);
    return false;
  } finally {
    // 翻译包不应污染游戏补丁使用的 ZIP 队列
    if (isTranslationUpdate) $gameVariables.setValue(86, previousZipQueue);
  }
};

// 解压缩 zip 安装补丁（对应PC版）
chahuiUtil.extractAndInstallPatch = async function (extra = {}) {

  function normalizeToArray(val) {
    if (Array.isArray(val)) return val.filter(Boolean).map(String);
    if (val == null) return [];
    if (typeof val === "string") {
      const s = val.trim();
      if (!s) return [];
      // JSON 数组字符串
      if (s[0] === "[" && s[s.length - 1] === "]") {
        try {
          const arr = JSON.parse(s);
          if (Array.isArray(arr)) return arr.filter(Boolean).map(String);
        } catch (e) { /* fallthrough */ }
      }
      // 逗号或空白分隔
      if (s.includes(",")) return s.split(/\s*,\s*/).filter(Boolean);
      const maybeSplit = s.split(/\s+/).filter(Boolean);
      if (maybeSplit.length > 1) return maybeSplit;
      return [s];
    }
    return [String(val)];
  }

  // —— 文本工具 ——
  function joinTextArray(textArray, fallbackArr) {
    let arr = textArray || fallbackArr;
    return Array.isArray(arr) ? arr.join("\n") : String(arr ?? "");
  }

  // —— 读取储存了压缩包文件名的变量并标准化为数组 ——
  const v86 = $gameVariables.value(86);
  const zipNamesRaw = normalizeToArray(v86);
  if (zipNamesRaw.length === 0) return false;

  // —— PC / NW.js 路径 ——
  const fs = require("fs");
  const path = require("path");

  const zipNames = zipNamesRaw;

  // —— 绝对路径 & 先验证所有文件是否存在 ——
  const cwd = process.cwd();
  const zipPaths = zipNames.map(n => path.join(cwd, n));

  const missing = zipPaths
    .map((zp, i) => (!fs.existsSync(zp) ? zipNames[i] : null))
    .filter(Boolean);

  if (missing.length > 0) {
    const failText = joinTextArray(
      window.systemFeatureText && window.systemFeatureText.zipUpdateFail,
      [
        "Failed to extract and install the patch!",
        "Please try the auto-update again or",
        "manually extract the patch files to install!"
      ]
    );
    await confirm(failText + "\nMissing: " + missing.join(", "));
    $gameSelfSwitches.setValue([$gameMap.mapId(), 1, "Z"], false);
    $gameSelfSwitches.setValue([$gameMap.mapId(), 2, "Z"], false);
    return false;
  }

  try {
    // —— 逐个解压 & 删除 ——（顺序即覆盖顺序）
    for (let i = 0; i < zipNames.length; i++) {
      const name = zipNames[i];

      // —— 解压提醒演出 ——
      let textArray = window.systemFeatureText && window.systemFeatureText.startExtractZipFile;
      if (!textArray) textArray = `Extracting ${name}…`;
      let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
      text = "\\fs[24]" + text;
      $gameSystem._drill_GFTH_styleId = 5;
      $gameTemp.drill_GFTH_pushNewText(text);

      // —— 解压进行 ——
      const zip = zipFile(name.replace("www/", "")); // 不需要 www/ 前墜
      const result = await zip.decompress();
      if (!result) throw new Error();
    }

    if (extra.silentUpdate || extra.translationUpdate) return true;
    if (chahuiUtil.checkLegitimatePlayer({ allowMajorUpdate: true })) {
       // 大版本更新场合下清除登录缓存
       localStorage.removeItem('gm_patreon_verify');
    }
    // —— 结束提醒 ——
    setTimeout(async () => {
      const okText = joinTextArray(
        window.systemFeatureText?.zipUpdateComplete,
        ["Patch installed successfully.", "Restarting the game to apply the update!"]
      );
      await confirm(okText);
      if ($gameMap.mapId?.() !== 21) location.reload();
    }, 500);

    return true;

  } catch (error) {
    console.warn("[patch-install] PC extraction failed:", error);
    if (extra.silentUpdate || extra.translationUpdate) {
      return false;
    }

    const failText = joinTextArray(
      window.systemFeatureText && window.systemFeatureText.zipUpdateFail,
      [
        "Failed to extract and install the patch!",
        "Please try the auto-update again or",
        "manually extract the patch files to install!"
      ]
    );
    await confirm(failText);
    // 交给外层重新下载 / 切换下载源，不能在重试途中定时重启。
    return false;
  }
};

// 解压缩 zip 安装补丁流程
chahuiUtil.androidExtractAndInstallPatch = async function (namesOrOne, extra = {}) {
  const root = cordova.file.dataDirectory;

  // —— 工具：把输入规范成数组 —— //
  function normalizeToArray(val) {
    if (Array.isArray(val)) return val.filter(Boolean).map(String);
    if (val == null) return [];
    if (typeof val === "string") {
      const s = val.trim();
      if (!s) return [];
      if (s[0] === "[" && s[s.length - 1] === "]") {
        try { const arr = JSON.parse(s); if (Array.isArray(arr)) return arr.filter(Boolean).map(String); }
        catch { /* ignore */ }
      }
      if (s.includes(",")) return s.split(/\s*,\s*/).filter(Boolean);
      const maybeSplit = s.split(/\s+/).filter(Boolean);
      return maybeSplit.length > 1 ? maybeSplit : [s];
    }
    return [String(val)];
  }

  function joinTextArray(textArray, fallbackArr) {
    let arr = textArray || fallbackArr;
    return Array.isArray(arr) ? arr.join("\n") : String(arr ?? "");
  }

  async function alertFail(extraMsg) {
    let textArray = window.systemFeatureText?.zipUpdateFail;
    if (!textArray) {
      textArray = [
        "Failed to extract and install the patch!",
        "Please try the auto-update again or",
        "manually extract the patch files to install!"
      ];
    }
    const text = joinTextArray(textArray, textArray) + (extraMsg ? ("\n" + extraMsg) : "");
    await confirm(text);
    $gameSelfSwitches.setValue([$gameMap.mapId(), 1, "Z"], false);
    $gameSelfSwitches.setValue([$gameMap.mapId(), 2, "Z"], false);
  }

  function fsExists(fileUrl) {
    return new Promise((res, rej) => {
      window.resolveLocalFileSystemURL(fileUrl, () => res(true), err => rej(err));
    });
  }

  function fsRemove(fileUrl) {
    return new Promise((res, rej) => {
      window.resolveLocalFileSystemURL(
        fileUrl,
        fe => fe.remove(() => res(), err => rej(err)),
        err => rej(err)
      );
    });
  }

  // —— 读取来源（参数优先，否则读 86 号变量） —— //
  const raw = (typeof namesOrOne !== "undefined") ? namesOrOne : $gameVariables.value(86);
  const zipNames = normalizeToArray(raw);
  if (zipNames.length === 0) return false;

  // —— 先校验所有文件是否存在（位于 dataDirectory 下） —— //
  const missing = [];
  for (const name of zipNames) {
    try { await fsExists(root + name); } catch { missing.push(name); }
  }
  if (missing.length) {
    await alertFail("Missing: " + missing.join(", "));
    return false;
  }

  // —— 进度聚合（整体 0~100） —— //
  const total = zipNames.length;
  const updateOverallPct = (idx, pctInCurrent) => {
    const overall = (idx + (pctInCurrent || 0)) / total;
    try { if (overall > 0) $gameVariables.setValue(82, Math.floor(overall * 100)) } catch { }
  };

  try {
    // —— 顺序解压（避免 I/O 争抢；后包覆盖先包） —— //
    for (let i = 0; i < zipNames.length; i++) {
      const name = zipNames[i];

      try {
        await chahuiUtil.androidExtractPatch(name, pct => updateOverallPct(i, pct));
      } finally {
        // 失败包同样删除，下一次更新重新下载。
        await fsRemove(root + name);
      }
      // 把该段收尾到段末
      updateOverallPct(i + 1, 0);
    }

    if (extra.silentUpdate || extra.translationUpdate) return true;

    setTimeout(async () => {
      let textArray = window.systemFeatureText?.zipUpdateComplete;
      if (!textArray) {
        textArray = [
          "Patch installed successfully.",
          "Restarting the game to apply the update!"
        ];
      }
      await confirm(joinTextArray(textArray, textArray));
      if ($gameMap.mapId?.() !== 21) location.reload();
    }, 500);

    return true;

  } catch (err) {
    if (extra.silentUpdate || extra.translationUpdate) {
      console.warn("[patch-install] Silent Android extraction failed:", err);
      return false;
    }
    console.log("Android patch install failed:", err);
    await alertFail();
    return false;
  }
};

// 被单独分离出来的安卓解压工具函数
chahuiUtil.androidExtractPatch = function (zipFileName, onProgress) {
  const isCordova = !!(window.cordova && window.resolveLocalFileSystemURL);
  if (!isCordova) { return Promise.reject(new Error('unsupported environment')); }
  const root = cordova.file.dataDirectory;
  function extractWithNative(zipNativePath, destNativeDir) {
    return new Promise((resolve, reject) => {
      if (!window.zip || !window.zip.unzip) { return reject(new Error('native zip plugin not available')); }
      try {
        window.zip.unzip(
          zipNativePath,
          destNativeDir,
          status => {
            if (status === 0) {
              resolve();
            } else { reject(new Error('unzip failed: ' + status)); }
          },
          rawProgress => {
            let prog;
            if (rawProgress && typeof rawProgress === 'object' && 'loaded' in rawProgress && 'total' in rawProgress) {
              prog = rawProgress.loaded / rawProgress.total * 100;
            } else { prog = Number(rawProgress); }
            if (isNaN(prog)) { prog = 0; }
            const fraction = prog / 100;
            if (onProgress) {
              try {
                onProgress(fraction);
              } catch (e) {
              }
            }
          });
      } catch (e) {
        reject(e);
      }
    });
  }
  const zipNativePath = root + zipFileName;
  const destNativeDir = root;
  return new Promise((resolve, reject) => {
    extractWithNative(zipNativePath, destNativeDir)
      .then(resolve)
      .catch(reject);
  });
};

// ------------------------------------------------------------------
// 和自动更新相关的小工具
// ------------------------------------------------------------------
// 正版玩家验证
chahuiUtil.checkLegitimatePlayer = function (extra={}) {
   const verify = localStorage.getItem('gm_patreon_verify');
   const auth   = verify ? JSON.parse(verify) : null;
   if (auth && extra.markMajorUpdate) {   
      auth.allowMajorUpdate = true;
      localStorage.setItem('gm_patreon_verify', JSON.stringify(auth));
      return;
   }
   if (extra.device_id) {
     return (auth && auth.device_id) || "undefined";
   }
   if (extra.allowMajorUpdate) {
     return auth && auth.allowMajorUpdate || false;
   }   
   // 进行了订阅、或拥有其他平台认证的玩家均视为正版玩家
   return !!(auth && (auth.subscribed || auth.specialRoles?.length));
};
// 成功更新计数
chahuiUtil.autoUpdateSuccessCount = function () {
  if (!appScript) return;
  const match = String($dataSystem.gameVersion) || 0.1;  
  let version = chahuiUtil.parseGameVersionNumber(match);
  let userLang = ConfigManager.language;
  if (userLang === 12) userLang = 0;
  if (userLang > 2) userLang = 2;

  const url = `${appScript}?mode=UpdateSuccessful&lang=${userLang}&version=${version}`;
  httpRequest(url);
};

// 复用标题版本检测响应，仅更新该版本、该响应语言的现有缓存。
// 缓存尚未初始化时，仍由原有的首次获取流程负责完整加载。
chahuiUtil.cacheDetectedChangelog = function (version, log, language, metadata = {}) {
  if (typeof log !== "string" || !log.trim()) return false;
  const lang = String(language);
  if (!["0", "1", "2"].includes(lang)) return false;
  let contentChanged = false;

  for (const key of [NLCH_UPDATE_CHANGELOGS, NLCH_UPDATE_CHANGELOGS_ALL]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const cached = JSON.parse(raw);
      const isBundle = key === NLCH_UPDATE_CHANGELOGS_ALL;
      if (isBundle && cached?.schemaVersion !== 2) continue;
      const entries = isBundle ? cached.changelogs : cached;
      if (!Array.isArray(entries)) continue;

      let entry = entries.find((item) => String(item?.version ?? "").trim() === version);
      let changed = false;
      if (entry) {
        if (isBundle) {
          if (entry.logs?.[lang] !== log) {
            entry.logs = { ...entry.logs, [lang]: log };
            changed = true;
          }
        } else {
          if (entry.log !== log) {
            entry.log = log;
            changed = true;
          }
        }
      } else {
        entry = isBundle ? { version, logs: { [lang]: log } } : { version, log };
        entries.push(entry);
        changed = true;
      }
      const bodyChanged = changed;
      // 正文不变时也更新日期/升级来源；旧服务器未返回字段时保留已有值。
      for (const field of ["published_at", "updated_at", "from_list"]) {
        if (Object.prototype.hasOwnProperty.call(metadata, field) &&
            entry[field] !== metadata[field]) {
          entry[field] = metadata[field];
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(key, JSON.stringify(cached));
        chahuiUtil._changelogCacheRevision = (chahuiUtil._changelogCacheRevision || 0) + 1;
      }
      // 全语言缓存优先：旧缓存可能只是切换语言，不应因此提示正文更新。
      contentChanged = bodyChanged;
    } catch (error) {
      console.warn("[changelog] Detected log cache refresh failed.", key, error);
    }
  }
  return contentChanged;
};

// 缓存游戏更新日志
chahuiUtil.fetchAndCacheChangelogs = async function () {
  const platform = Utils.isMobileDevice() ? "android" : "pc";
  const currentVersion = typeof $dataSystem !== "undefined" ? $dataSystem?.gameVersion : "";
  const versionQuery = `&curVer=${encodeURIComponent(String(currentVersion || "").trim())}`;

  try {
    const bundleRes = await fetch(
      `${updateMap}/api/changelogs/all?platform=${platform}${versionQuery}`
    );
    if (!bundleRes.ok) throw new Error(`HTTP ${bundleRes.status}`);
    const bundle = await bundleRes.json();
    if (bundle?.schemaVersion !== 2 || !Array.isArray(bundle?.changelogs)) {
      throw new Error("Invalid all-language changelog bundle");
    }

    // 新版专用缓存：保留所有语言，不覆盖旧版认识的数组格式。
    localStorage.setItem(NLCH_UPDATE_CHANGELOGS_ALL, JSON.stringify(bundle));

    // 同时维持旧缓存键和旧数据形状，游戏内其它旧逻辑无需跟着改。
    let legacyLang = Number(ConfigManager.language);
    if (legacyLang === 12) legacyLang = 0;
    if (legacyLang > 2) legacyLang = 2;
    const legacyData = bundle.changelogs.map((entry) => {
      const logs = entry?.logs || {};
      return {
        version: entry.version,
        log: String(logs[String(legacyLang)] ?? logs[legacyLang] ?? logs["2"] ?? ""),
        published_at: entry.published_at ?? null,
        updated_at: entry.updated_at ?? null,
        from_list: entry.from_list ?? null
      };
    });
    localStorage.setItem(NLCH_UPDATE_CHANGELOGS, JSON.stringify(legacyData));
    chahuiUtil._changelogCacheRevision = (chahuiUtil._changelogCacheRevision || 0) + 1;
    return legacyData;
  } catch (error) {
    // 服务器尚未升级或全语言接口暂时失败时，完整退回旧接口。
    console.warn("[changelog] All-language bundle unavailable; using legacy API.", error);
    let userLang = Number(ConfigManager.language);
    if (userLang === 12) userLang = 0;
    if (userLang > 2) userLang = 2;
    const legacyRes = await fetch(
      `${updateMap}/api/changelogs?platform=${platform}&lang=${userLang}${versionQuery}`
    );
    if (!legacyRes.ok) throw new Error(`Changelog HTTP ${legacyRes.status}`);
    const legacyData = await legacyRes.json();
    localStorage.setItem(NLCH_UPDATE_CHANGELOGS, JSON.stringify(legacyData));
    chahuiUtil._changelogCacheRevision = (chahuiUtil._changelogCacheRevision || 0) + 1;
    return legacyData;
  }
};

const CHANGELOG_MACHINE_TRANSLATION_BUTTON_TEXT = {
  3: "Машинный перевод",
  4: "Traduction automatique",
  5: "Dịch máy",
  6: "Traducción automática",
  7: "Tradução automática",
  8: "기계 번역",
  9: "Terjemahan mesin",
  10: "แปลด้วยเครื่อง",
  11: "Машинний переклад",
  12: "機器翻譯",
  13: "Traduzione automatica"
};

const CHANGELOG_MACHINE_TRANSLATION_SELECTION_VERSION = 1;

function changelogTranslationSourceHash(text) {
  // 同一版本的日志来源语言或正文更新后，不得复用旧译文。
  let hash = 2166136261;
  const source = String(text ?? "");
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

const CHANGELOG_TIME_LABELS = {
  0: ["发布时间", "修改时间", "日期未知"],
  1: ["公開日時", "更新日時", "日時不明"],
  2: ["Published", "Modified", "Date unknown"],
  3: ["Опубликовано", "Изменено", "Дата неизвестна"],
  4: ["Publication", "Modification", "Date inconnue"],
  5: ["Phát hành", "Chỉnh sửa", "Chưa rõ ngày"],
  6: ["Publicado", "Modificado", "Fecha desconocida"],
  7: ["Publicado", "Modificado", "Data desconhecida"],
  8: ["게시 일시", "수정 일시", "날짜 미상"],
  9: ["Dirilis", "Diubah", "Tanggal tidak diketahui"],
  10: ["เผยแพร่", "แก้ไข", "ไม่ทราบวันที่"],
  11: ["Опубліковано", "Змінено", "Дата невідома"],
  12: ["發布時間", "修改時間", "日期未知"],
  13: ["Pubblicato", "Modificato", "Data sconosciuta"]
};

chahuiUtil.changelogTimeText = function (entry, language) {
  const labels = CHANGELOG_TIME_LABELS[language] || CHANGELOG_TIME_LABELS[2];
  const format = (value) => {
    // 要求明确时区，避免同一补录值在不同时区被解释成不同时间。
    if (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toISOString().slice(0, 19).replace("T", " ") + " UTC";
  };
  const published = format(entry?.published_at);
  const modified = format(entry?.updated_at);
  const lines = [`${labels[0]}: ${published || labels[2]}`];
  if (modified) lines.push(`${labels[1]}: ${modified}`);
  return lines.join("\n");
};

const CHANGELOG_VERSION_LABELS = {
  0: ["目标版本", "可从以下版本升级", "未提供"],
  1: ["更新先バージョン", "更新元の対応バージョン", "情報なし"],
  2: ["Target version", "Upgradeable from", "Not provided"],
  3: ["Целевая версия", "Обновление с версий", "Не указано"],
  4: ["Version cible", "Mise à jour depuis", "Non renseigné"],
  5: ["Phiên bản đích", "Có thể nâng cấp từ", "Chưa cung cấp"],
  6: ["Versión de destino", "Actualizable desde", "No especificado"],
  7: ["Versão de destino", "Atualização a partir de", "Não informado"],
  8: ["대상 버전", "업데이트 가능한 이전 버전", "정보 없음"],
  9: ["Versi tujuan", "Dapat diperbarui dari", "Tidak tersedia"],
  10: ["เวอร์ชันปลายทาง", "อัปเดตได้จากเวอร์ชัน", "ไม่มีข้อมูล"],
  11: ["Цільова версія", "Оновлення з версій", "Не вказано"],
  12: ["目標版本", "可從以下版本升級", "未提供"],
  13: ["Versione di destinazione", "Aggiornabile da", "Non specificato"]
};

chahuiUtil.changelogVersionText = function (entry, language) {
  const labels = CHANGELOG_VERSION_LABELS[language] || CHANGELOG_VERSION_LABELS[2];
  // 与 Worker 的 fromListHasVersion 保持相同的分隔和去空白规则。
  const versions = String(entry?.from_list ?? "").split(/[|,]/)
    .map(version => version.trim()).filter(Boolean);
  const escape = value => String(value).replace(/&/g, "&amp;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return [
    `${labels[0]}: ${escape(entry?.version || labels[2])}`,
    `${labels[1]}: ${escape(versions.length ? versions.join(", ") : labels[2])}`
  ].join("\n");
};

// 安排显示游戏更新日志版本号/内容
chahuiUtil.arrangeDisplayChangelog = function (extra={}) {

  const raw = localStorage.getItem(NLCH_UPDATE_CHANGELOGS);
  if (!raw) {
     return;
  }
  const changelogs = JSON.parse(raw);
  let allLanguageBundle = null;
  try {
    const bundleRaw = localStorage.getItem(NLCH_UPDATE_CHANGELOGS_ALL);
    const parsed = bundleRaw ? JSON.parse(bundleRaw) : null;
    if (parsed?.schemaVersion === 2 && Array.isArray(parsed?.changelogs)) {
      allLanguageBundle = parsed;
    }
  } catch (error) {
    console.warn("[changelog] Invalid all-language cache ignored.", error);
  }
    
  if (extra.viewLogs) {
      const targetVersion = $gameMap.chahuiMapTemp.viewingVersion;
      const entry = changelogs.find((e) => e.version === targetVersion);
      if (entry) {
          const language = Number(ConfigManager.language);
          let bundleEntry = allLanguageBundle?.changelogs?.find(
            (item) => item.version === targetVersion
          );
          const logs = bundleEntry?.logs || {};
          const englishText = String(logs["2"] ?? logs[2] ?? entry.log ?? "");
          const simplifiedChineseText = String(
            logs["0"] ?? logs[0] ?? (language === 12 ? entry.log : null) ?? englishText
          );
          let translatedText = language > 2
            ? String(logs[String(language)] ?? logs[language] ?? "")
            : "";
          const defaultText = language === 12
            ? simplifiedChineseText
            : language > 2
              ? englishText
              : String(logs[String(language)] ?? logs[language] ?? entry.log ?? englishText);
          // 繁中机翻以简中日志为原文；其它机翻仍以英文为原文。
          const translationSourceText = language === 12
            ? simplifiedChineseText
            : englishText;
          const sourceHash = changelogTranslationSourceHash(translationSourceText);
          const selectionKey = `${language}:${targetVersion}:${sourceHash}`;

          if ($gameTemp._changelogMachineTranslationSelectionVersion !==
              CHANGELOG_MACHINE_TRANSLATION_SELECTION_VERSION) {
            $gameTemp._changelogMachineTranslationSelectionVersion =
              CHANGELOG_MACHINE_TRANSLATION_SELECTION_VERSION;
            $gameTemp._changelogMachineTranslationSelections = {};
          }
          $gameTemp._changelogMachineTranslationSelections =
            $gameTemp._changelogMachineTranslationSelections || {};
          $gameTemp._changelogMachineTranslationPending =
            $gameTemp._changelogMachineTranslationPending || {};

          const readRefreshedTranslation = () => {
            try {
              const refreshedRaw = localStorage.getItem(NLCH_UPDATE_CHANGELOGS_ALL);
              const refreshedBundle = refreshedRaw ? JSON.parse(refreshedRaw) : null;
              const refreshedEntry = refreshedBundle?.changelogs?.find(
                (item) => item.version === targetVersion
              );
              if (refreshedEntry) bundleEntry = refreshedEntry;
              const refreshedLogs = refreshedEntry?.logs || {};
              return String(
                refreshedLogs[String(language)] ?? refreshedLogs[language] ?? ""
              );
            } catch (error) {
              console.warn("[changelog] Refreshed translation cache is invalid.", error);
              return "";
            }
          };

          const showChangelog = (text) => {
            const selected =
              $gameTemp._changelogMachineTranslationSelections[selectionKey];
            const options = {
              align: "left",
              video: "movies/dancingImouto_8.webm",
              videoStyle: "width:100%;max-height:360px;height:auto;display:block;margin:0 auto;",
              videoPosition: "header",
              videoHeaderOverlap: 2
            };

            // 小语种默认显示英语；玩家主动选择后才切到服务器预生成的机翻。
            if (language > 2 && !selected) {
              options.extraButton = {
                text: CHANGELOG_MACHINE_TRANSLATION_BUTTON_TEXT[language] || "Machine Translation",
                onClick: async (ctx) => {
                  // 网络请求进行中只接受第一次点击；失败后允许玩家稍后重试。
                  if ($gameTemp._changelogMachineTranslationPending[selectionKey]) return;
                  $gameTemp._changelogMachineTranslationPending[selectionKey] = true;

                  try {
                    if (!translatedText) {
                      await chahuiUtil.fetchAndCacheChangelogs();
                      translatedText = readRefreshedTranslation();
                    }
                  } catch (error) {
                    console.warn("[changelog] On-demand translation refresh failed.", error);
                  } finally {
                    delete $gameTemp._changelogMachineTranslationPending[selectionKey];
                  }

                  ctx.close("__translate_changelog__");
                  if (translatedText) {
                    $gameTemp._changelogMachineTranslationSelections[selectionKey] = true;
                    showChangelog(translatedText);
                  } else {
                    // Cron仍未完成或网络失败：保留英语，并保留按钮供稍后重试。
                    showChangelog(englishText);
                  }
                }
              };
            }

            const metadata = bundleEntry || entry;
            const versionText = chahuiUtil.changelogVersionText(metadata, language);
            const timeText = chahuiUtil.changelogTimeText(metadata, language);
            return alert(`${versionText}\n${timeText}\n\n${text}`, options);
          };

          const selected =
            $gameTemp._changelogMachineTranslationSelections[selectionKey];
          showChangelog(selected && translatedText ? translatedText : defaultText);
          //alert(entry.log, { align: 'left' });
         /*
          NotiflixMV.reportImage({ 
            width: '640px', overlayColor:'rgba(0,0,0,0.5)', 
            type:'info', title:'Change Log', name:'TCN LOGO',
            text:entry.log, btnText:'OK', onOk(){} });      
           */   
      }
      return;
  }

  for (let i = 6; i < 11; i++) {
      $gameStrings.setValue(i, "");
  }

  const versions = changelogs.map((entry) => entry.version).reverse();
  for (let i = 0; i < versions.length; i++) {
      if (i > 4) continue;
      $gameStrings.setValue(6 + i, versions[i]);
  }
};

// 只给安卓 + Cordova + zip 用
function downloadOneFileCordovaZip(remoteUrl, localPath, retries = 3) {
  return new Promise((resolve, reject) => {

    const root = (window.cordova && cordova.file && (cordova.file.dataDirectory || cordova.file.cacheDirectory)) || "";
    const normalizedLocalPath = String(localPath).replace(/^\/+/, "");
    const targetPath = root + normalizedLocalPath;

    let progressTask;
    let progressHint;
    const throttle = 400; // 轮询间隔
    httpRequest(remoteUrl, {
      method: 'HEAD',
      onload(response) {
        try {
          let total = parseInt(response.getResponseHeader('Content-Length'), 10);
          // if (!total || isNaN(total) || total <= 0) throw new Error("Content-Length not found");
          if (!total || isNaN(total) || total <= 0) total = 0; // 针对R2桶的临时兜底

          $gameVariables.setValue(85, 0);
          progressHint = createPatchDownloadProgressHint(localPath, total);
          progressHint.update(0, total, true);

          let lastReported = -1;
          let fake = 0;
          /* ----- 轮询当前文件大小 → 计算百分比、大小与速度 ----- */
          progressTask = setInterval(() => {
            try {
              window.resolveLocalFileSystemURL(
                targetPath,
                function (fileEntry) {
                  fileEntry.file(function (file) {
                    const cur = file.size || 0;
                    progressHint?.update(cur, total);

                    if (total > 0) {
                      const pct = Math.min(100, Math.floor((cur * 100) / total));
                      if (pct !== lastReported) {
                        lastReported = pct;
                        $gameVariables.setValue(82, pct);   // ★ 进度回调
                      }
                    } else {
                      // 服务端未提供 Content-Length 时保留原有伪进度条。
                      fake = Math.min(69, fake + 1);
                      $gameVariables.setValue(82, fake);
                    }
                  }, function () { /* ignore */ });
                },
                function () {
                  progressHint?.update(0, total);
                  if (total > 0 && lastReported !== 0) {
                    lastReported = 0;
                    $gameVariables.setValue(82, 0);
                  } else if (total <= 0) {
                    fake = Math.min(69, fake + 1);
                    $gameVariables.setValue(82, fake);
                  }
                }
              );
            } catch { /* 轮询失败直接忽略，不影响下载本身 */ }
          }, throttle);

          /* ----- 真正开始下载 ----- */
          cordova.plugin.http.downloadFile(
            remoteUrl, {}, {}, targetPath,
            function () {
              clearInterval(progressTask);
              $gameVariables.setValue(85, 100);
              if (total > 0) progressHint?.complete(total, total);
              else progressHint?.complete();

              try {
                // 下载成功提示
                let textArray = window.systemFeatureText && window.systemFeatureText.fileDownloadedSuccessfully;
                if (!textArray) textArray = "${} downloaded successfully!";

                let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");

                const match = String(text).match(/\$\{([^}]*)\}/);
                if (match) text = String(text).replace(/\$\{[^}]*\}/g, `\\fs[24]${localPath}`);

                $gameSystem._drill_GFTH_styleId = 5;
                $gameTemp.drill_GFTH_pushNewText(text);

                $gameSelfSwitches.setValue([$gameMap.mapId(), 1, "Z"], true);
                $gameSelfSwitches.setValue([$gameMap.mapId(), 2, "Z"], true);

                let q = $gameVariables.value(86);
                if (!Array.isArray(q) || q === 0) q = [];
                q.push(String(localPath));

                $gameVariables.setValue(86, q);
              } catch (e) {
                console.warn("downloadOneFileCordovaZip success-log error:", e);
              }

              // 文件已经由插件写入 targetPath，这里不再调用 saveFile
              resolve(localPath);
            },
            function (err) {
              clearInterval(progressTask);
              retryOrReject(err || new Error("downloadFile error"));
            }
          );

        } catch (err) {
          clearInterval(progressTask);
          retryOrReject(err);
        }
      }
    }).catch(err => {
      clearInterval(progressTask); // 雖然不需要, 但為了安全
      retryOrReject(err);
    })

    function retryOrReject(err) {
      progressHint?.fail();
      if (retries > 0) {
        console.warn(`[retry] ${localPath} (${retries} left):`, err && err.message ? err.message : err);

        let textArray = window.systemFeatureText && window.systemFeatureText.fileDownloadFailed;
        if (!textArray) textArray = "${} download failed! Try downloading again!";
        let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
        const match = String(text).match(/\$\{([^}]*)\}/);
        if (match) text = String(text).replace(/\$\{[^}]*\}/g, `\\fs[24]\\c[10]${localPath}`);

        $gameSystem._drill_GFTH_styleId = 5;
        $gameTemp.drill_GFTH_pushNewText(text);

        setTimeout(() => {
          downloadOneFileCordovaZip(remoteUrl, localPath, retries - 1)
            .then(resolve)
            .catch(reject);
        }, 1000);
      } else {
        console.error(`[failed] ${localPath}:`, err && err.message ? err.message : err);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
  })
}

// 下载文件，失败时最多重试2次
function downloadOneFile(remoteUrl, localPath, retries = 3) {

  const isZip = /zip$/i.test(localPath);
  const isCordovaMobile = Utils.isMobileDevice() && window?.cordova?.plugin?.http;

  // ★ 安卓 + Cordova + zip → 用专用下载逻辑（包含进度轮询）
  if (isZip && isCordovaMobile) {
    $gameVariables.setValue(83, 10000);
    return downloadOneFileCordovaZip(remoteUrl, localPath, retries);
  }

  const progressHint = isZip ? createPatchDownloadProgressHint(localPath) : null;
  let observedLoaded = 0;
  let observedTotal = 0;

  return new Promise((resolve, reject) => {

    httpRequest(remoteUrl, {
      // 如果是二进制文件(如 png, ogg),需要 xhr.responseType="arraybuffer"
      responseType: /(zip|png|jpg|ogg|m4a|rpgmvo|rpgmvp|webm|nlch)$/i.test(localPath)
        ? "arraybuffer" : "",
      // 反映大文件下载进度(通常指zip文件)
      onprogress: isZip ? progress => {
        observedLoaded = Math.max(0, Number(progress.loaded) || 0);
        if (progress.lengthComputable && Number(progress.total) > 0) {
          observedTotal = Number(progress.total);
        }
        progressHint?.update(observedLoaded, observedTotal);
        if (progress.lengthComputable) {
          const percent = Math.floor((progress.loaded / progress.total) * 100);
          if (percent > 0) {
              $gameVariables.setValue(82, percent);
          }
        }
      } : null,
      onload(xhr) {
        if (xhr.status < 400) {
          try {
            const responseBytes = xhr.response instanceof ArrayBuffer
              ? xhr.response.byteLength
              : observedLoaded;
            const finalBytes = responseBytes || observedLoaded || observedTotal;
            progressHint?.complete(finalBytes, observedTotal || finalBytes);
            // 增加下载进度
            $gameVariables.setValue(85, $gameVariables.value(85) + 1);
            // 显示下载日志
            let textArray = window.systemFeatureText && window.systemFeatureText.fileDownloadedSuccessfully;
            if (!textArray) textArray = "${} downloaded successfully!";
            let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
            const match = String(text).match(/\$\{([^}]*)\}/);
            if (match) text = String(text).replace(/\$\{[^}]*\}/g, `\\fs[24]${localPath}`);

            $gameSystem._drill_GFTH_styleId = 5;
            $gameTemp.drill_GFTH_pushNewText(text);

            // 对象是压缩包时将激活后续解压缩流程
            if (isZip) {
              $gameSelfSwitches.setValue([$gameMap.mapId(), 1, 'Z'], true);
              $gameSelfSwitches.setValue([$gameMap.mapId(), 2, 'Z'], true);
              // 86号变量：非数组或为0 → 重置为 []
              let q = $gameVariables.value(86);
              if (!Array.isArray(q) || q === 0) q = [];
              q.push(String(localPath));
              $gameVariables.setValue(86, q);
            }

            saveFile(localPath, xhr.response, xhr.responseType)
              .then(() => resolve(localPath))
              .catch(reject);
          } catch (e) {
            retryOrReject(e);
          }
        } else {
          retryOrReject(new Error(`HTTP ${xhr.status}`));
        }
      },
      onerror: () => retryOrReject(new Error(`Network error → ${remoteUrl}`))
    })

    /* ---------------- 内部：失败处理 & 重试 ---------------- */
    function retryOrReject(err) {
      progressHint?.fail();
      if (retries > 0) {
        console.warn(`[retry] ${localPath} (${retries} left):`, err.message);
        // 下载重试日志
        let textArray = window.systemFeatureText && window.systemFeatureText.fileDownloadFailed;
        if (!textArray) textArray = "${} download failed! Try downloading again!";
        let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
        const match = String(text).match(/\$\{([^}]*)\}/);
        if (match) text = String(text).replace(/\$\{[^}]*\}/g, `\\fs[24]\\c[10]${localPath}`);

        $gameSystem._drill_GFTH_styleId = 5;
        $gameTemp.drill_GFTH_pushNewText(text);
        // 简单延迟 1 秒再重试；可按需改成指数退避
        setTimeout(() => {
          downloadOneFile(remoteUrl, localPath, retries - 1)
            .then(resolve)
            .catch(reject);
        }, 1000);
      } else {
        console.error(`[failed] ${localPath}:`, err.message);
        reject(err);
      }
    }
  });
};

function saveFile(localPath, fileData, responseType) {
  if (!localPath || fileData == null) {
    return Promise.reject(new Error('saveFile: invalid args'));
  }

  /* ---------- NW.js / Node ---------- */
  if (!Utils.isMobileDevice()) {
    return new Promise(async (resolve, reject) => {
      const zip = zipFile(localPath);
      const result = await zip.save(fileData);
      result ? resolve(zip.zipPath) : reject();
    })
  };

  /* ---------- Cordova / Capacitor ---------- */
  const isCordova = !!(window.cordova && window.resolveLocalFileSystemURL);
  if (!isCordova) {
    return Promise.reject(new Error('saveFile: unsupported environment'));
  }

  return new Promise((resolve, reject) => {
    const root = cordova.file.dataDirectory;              // 可写目录
    const dirs = localPath.split('/');
    const file = dirs.pop();

    // 递归建目录
    (function makeDir(base, idx) {
      return new Promise((res, rej) => {
        if (idx >= dirs.length) return res(base);
        window.resolveLocalFileSystemURL(base, dir => {
          dir.getDirectory(dirs[idx], { create: true }, sub =>
            res(makeDir(sub.nativeURL, idx + 1)), rej);
        }, rej);
      });
    })(root, 0).then(dirPath => {
      window.resolveLocalFileSystemURL(dirPath, dir => {
        dir.getFile(file, { create: true }, fe => {
          fe.createWriter(w => {
            w.onwriteend = () => resolve(fe.nativeURL);
            w.onerror = reject;
            const blob = (responseType === 'arraybuffer' && fileData instanceof ArrayBuffer)
              ? new Blob([fileData], { type: 'application/octet-stream' })
              : (fileData instanceof Blob)
                ? fileData
                : new Blob([String(fileData)], { type: 'text/plain;charset=utf-8' });
            w.write(blob);
          }, reject);
        }, reject);
      }, reject);
    }).catch(reject);
  });
}

function fetchGitHubDirectory(dirPath) {
  const apiUrl = githubCfg.contentsAPI(dirPath);
  return new Promise((resolve, reject) => {
    httpRequest(apiUrl, {
      responseType: 'json',
      onerror() {
        reject(new Error("Network Error to " + apiUrl));
      }
    }).then(arr => {
      try {
        if (!Array.isArray(arr)) {
          // 可能不是文件夹(如果dirPath指向单个文件)
          return reject(new Error("Not a directory or invalid response."));
        }
        // arr 里每项: { name, path, type, download_url, ... }

        // 准备一个空数组, 用于存储所有最终文件
        let filesList = [];

        // 我们用一个子函数,递归(或迭代)
        function processItem(item) {
          if (item.type === "file") {
            // 直接放入结果
            filesList.push({
              path: item.path,  // "066/www/data/AnsuzRevelation0.json"
              download_url: item.download_url,
              type: "file"
            });
          } else if (item.type === "dir") {
          }
        }

        // 处理 arr 每个元素
        // 这里演示"浅层"做法, 若想深层递归 => 需要在 type=dir时再次调用 fetchGitHubDirectory
        // 并合并返回
        let promises = arr.map(item => {
          if (item.type === "file") {

            if (item.name === "patchFileList.json" && item.download_url) {
              $gameSelfSwitches.setValue([$gameMap.mapId(), this._eventId, 'Z'], true);
              return fetch(item.download_url)
                .then(res => {
                  if (!res.ok) throw new Error("Failed to fetch patchFileList.json");
                  return res.json();
                })
                .then(fileList => {
                  filesList.push(...fileList);
                });
            } else {
              // 非索引文件
              // push后不需要再调, 直接resolve
              processItem(item);
              return Promise.resolve();
            }
          } else if (item.type === "dir") {
            return fetchGitHubDirectory(item.path)
              .then(subFiles => {
                filesList.push(...subFiles);
              });
          } else {
            return Promise.resolve();
          }
        });

        Promise.all(promises)
          .then(() => resolve(filesList))
          .catch(e => reject(e));

      } catch (e) {
        reject(e);
      }
    }).catch(({ status }) => {
      reject(new Error(`HTTP error ${status}`));
    })
  })
};

function downloadGitHubDirectory(dirPath) {
  return fetchGitHubDirectory(dirPath)
    .then(fileList => {
      // => 这是所有 (path, download_url)
      return batchDownloadFiles(fileList);
    });
}

// 读取下载列表的文件数
function listAllGitHubFiles(dirPath) {
  const apiUrl = githubCfg.treesAPI();
  return new Promise((resolve, reject) => {
    httpRequest(apiUrl, {
      responseType: 'json',
      onerror() {
        reject(new Error("Network Error"));
      }
    }).then(data => {
      try {
        // filter 出我们目录下的 blob（文件）
        const files = data.tree
          .filter(e => e.type === 'blob' && e.path.startsWith(dirPath))
          .map(e => ({
            path: e.path,
            download_url: githubCfg.rawTemplate + e.path
          }));
        resolve(files);
      } catch (e) { reject(e) }
    }).catch(({ status }) => {
      reject(new Error(`HTTP ${status}`));
    })
  })
};

/**
 * 批量下载
 * fileList: [ { path, download_url, type:"file" }, ... ]
 * 其中 path 例: "066/www/data/AnsuzRevelation0.json"
 */
function batchDownloadFiles(fileList) {
  let index = 0;
  function next() {
    if (index >= fileList.length) return Promise.resolve();
    let item = fileList[index++];
    return downloadGitHubFileToLocal(item.download_url, item.path).then(() => next());
  }
  return next();
}

/**
 * 例: downloadGitHubFileToLocal(url, path) => 先截取 path 里 "/www/" 后部分 => localPath
 */
function downloadGitHubFileToLocal(remoteUrl, fullPath) {
  // 1) 找 "/www/"
  let idx = fullPath.indexOf("www/");
  if (idx < 0) {
    // maybe we only handle subdir if path contain 'www/'
    console.warn("不含 www/, 跳过:", fullPath);
    return Promise.resolve();
  }
  let subPath = fullPath.substring(idx + 4); //  => "data/AnsuzRevelation0.json"

  // 2) 用之前写好的 downloadOneFile(remoteUrl, subPath)
  return downloadOneFile(remoteUrl, subPath);
}

// PC 关窗保护：嵌套调用及并发更新都结束后，才允许窗口关闭。
chahuiUtil._activeUpdateTasks = 0;
chahuiUtil._updateCloseWarningOpen = false;

chahuiUtil.showUpdateCloseWarning = async function () {
  if (chahuiUtil._updateCloseWarningOpen) return;
  chahuiUtil._updateCloseWarningOpen = true;
  try {
    const text = ConfigManager.language === 0
      ? "游戏正在更新，暂时无法关闭。\n更新过程中退出可能导致数据安装不完整。\n请等待下载和安装完成后再关闭游戏。"
      : ConfigManager.language === 12
        ? "遊戲正在更新，暫時無法關閉。\n更新過程中退出可能導致資料安裝不完整。\n請等待下載和安裝完成後再關閉遊戲。"
        : ConfigManager.language === 1
          ? "ゲームの更新中は終了できません。\n更新中に終了すると、データのインストールが不完全になる可能性があります。\nダウンロードとインストールが完了してからゲームを終了してください。"
          : "The game is updating and cannot close yet.\nExiting during an update may leave game data incompletely installed.\nPlease wait for the download and installation to finish before closing the game.";
    // 使用已有异步 DOM 提示，不阻塞下载和文件 I/O。
    await alert(text, { align: "left" });
  } finally {
    chahuiUtil._updateCloseWarningOpen = false;
  }
};

// F5 直接重载 NW.js，不经过窗口 close 事件，因此复用同一更新保护。
const updateSystemReloadGame = SceneManager.reloadGame;
SceneManager.reloadGame = function () {
  if (chahuiUtil._activeUpdateTasks > 0) {
    chahuiUtil.showUpdateCloseWarning().catch(error => {
      console.error("[patch-update] Reload warning failed:", error);
    });
    return;
  }
  return updateSystemReloadGame.call(this);
};

for (const name of [
  "autoUpdate",
  "autoUpdateMajorVersion",
  "tryDownloadReleaseZip",
  "extractAndInstallPatch"
]) {
  const update = chahuiUtil[name];
  chahuiUtil[name] = async function (...args) {
    chahuiUtil._activeUpdateTasks++;
    try {
      return await update.apply(this, args);
    } finally {
      chahuiUtil._activeUpdateTasks--;
    }
  };
}


// BEGIN SHIROIN PLAYER ANALYTICS
// 玩家趋势统计：随现有更新检查附带上报，在自动更新系统末尾统一注册。
// 沿用旧本地标识与上报进度；无独立请求或轮询，测试模式不上传。
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
    function cheatStatus() {
        // Do not create actor 1 at the title screen: no loaded actor means unknown.
        const actor = window.$gameActors?._data?.[1];
        if (!actor || !Number.isInteger(actor._classId)) return undefined;
        return actor._classId === 3 || !!actor._isZAKO;
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
        const isCheater = cheatStatus();
        if (isCheater !== undefined) body.isCheater = isCheater;
        const playtime = window.ShiroinPlaytime?.snapshot(s.playtimeCursor || 0);
        if (playtime) body.playtime = playtime;
        const signature = JSON.stringify([playtime,day(),s.segmentId,s.playerId,body.version,body.platform,body.language,body.loginState,body.licenseState,body.isCheater]);
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
// END SHIROIN PLAYER ANALYTICS
