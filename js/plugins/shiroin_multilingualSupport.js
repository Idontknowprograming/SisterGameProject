//=============================================================================
/*:
* @target MZ MV
* @plugindesc 多语言适配
* @author shiroin
*/
//=============================================================================
var universalUrl = universalUrl || '';

window.chahuiUtil = window.chahuiUtil || {};
if (Utils.isOptionValid("test")) {
  Utils.isMobileDevice = function() {
      var r = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      return !!navigator.userAgent.match(r);
  };
}
// 修复新版本NWjs关闭程序的写法问题
SceneManager.exit = function () {
  if (window.nw && nw.App && nw.App.quit) {
    nw.App.quit();
  } else {
    window.close();
  }
};

// ============================================================================
// 字体注册字典（字体名 → fonts/ 下的字体文件名）
//   LEGACY_PRELOAD_FONTS：改造前的原始清单，暂时原样保留，供后续重新分类。
//   PRELOAD_FONTS：无论如何都要在游戏启动时加载的字体。
//   ON_DEMAND_FONTS：只注册文件信息，实际使用时才由 Graphics._createFontLoader 加载。
// ============================================================================
const LEGACY_PRELOAD_FONTS = {
  "Madou Futo Maru Gothic": "MADOUFMG.ttf",
  "Nagurigaki Crayon":  "crayon_1-1.ttf",
  "Maple Mono NF CN": "MapleMono-NF-CN-ExtraBold.ttf",
  "Natsuzemi Maru Gothic Black": "Natsuzemi Maru Gothic Black.ttf",
  "x10y12pxDonguriDuel": "x10y12pxDonguriDuel.ttf",
};

// TODO：根据 LEGACY_PRELOAD_FONTS 逐项整理真正需要在启动时加载的字体。
const PRELOAD_FONTS = {
  "Huninn":             "Huninn-Regular-fixed.ttf",
  "Chiron GoRound Numbers": "ChironGoRoundTC-NumbersSymbols.ttf",
  "RiiTegakiFude":      "RiiT_F.otf",
  "Mali":               "Mali-Regular.ttf",
  "NanumGothic":        "NanumGothic-Bold.ttf",
  "Buildings and under the railway tracks":    "Buildingsandundertherailwaytracks.otf",
};

const ON_DEMAND_FONTS = {
  // Fusion Pixel：根据 ConfigManager.language 只选择其中一个加载。
  "FusionPixel10ZH": "fusion-pixel-10px-proportional-zh_hans.ttf",
  "FusionPixel10ZHT": "fusion-pixel-10px-proportional-zh_hant.ttf",
  "FusionPixel10JA": "fusion-pixel-10px-proportional-ja.ttf",
  "FusionPixel10KO": "fusion-pixel-10px-proportional-ko.ttf",
  "FusionPixel10Latin": "fusion-pixel-10px-proportional-latin.ttf",

  // 原 MZ_CompatPatch 硬编码的按需字体，迁移到项目注册表以保持旧调用兼容。
  "MPLUS2ExtraBold":    "MPLUS2-ExtraBold.ttf",
  "Noto Sans JP Black": "NotoSansJP-Black.ttf",
  "HonobonoPopTTF":  "HonobonoPopTTF-Regular.ttf",
  "Chiron GoRound TC": "ChironGoRoundTC-Medium.ttf",
  "Maple Mono NF CN ExtraBold": "MapleMono-NF-CN-ExtraBold.ttf",
  "Kaisei Decol": "KaiseiDecol-Regular.ttf",
  "KazukiReiwa": "KazukiReiwa - Regular.ttf",
  "Mochiy Pop One": "MochiyPopOne-Regular.ttf"
};

// MZ 版的 gamefont.css 等价注册表：合并只记录信息，不会因此读取字体文件。
if (typeof Graphics !== "undefined") {
  Graphics._fontFileMap = Object.assign(
    {},
    LEGACY_PRELOAD_FONTS,
    PRELOAD_FONTS,
    ON_DEMAND_FONTS
  );

  // 只有 PRELOAD_FONTS 会在插件初始化时主动读取。
  if (Graphics._createFontLoader) {
    for (const family in PRELOAD_FONTS) {
      Graphics._createFontLoader(family);
    }
  }
}

// 根据项目语言编号选择 Fusion Pixel 的地区字形版本。
// 越南语与泰语字符覆盖不足，返回 null 并继续使用原有语言字体。
chahuiUtil.getFusionPixelFont = function(language) {
  switch (Number(language)) {
    case 0:  return "FusionPixel10ZH";    // 简体中文
    case 12: return "FusionPixel10ZHT";   // 繁体中文
    case 1:  return "FusionPixel10JA";    // 日语
    case 8:  return "FusionPixel10KO";    // 韩语
    case 2:  // 英语
    case 3:  // 俄语
    case 4:  // 法语
    case 6:  // 西班牙语
    case 7:  // 巴西葡萄牙语
    case 9:  // 印尼语
    case 11: // 乌克兰语
    case 13: // 意大利语
      return "FusionPixel10Latin";
    case 5:  // 越南语
    case 10: // 泰语
    default:
      return null;
  }
};

const TITLE_BTN_PREFIXES = ["NEW_", "LOAD_", "SETTING_", "CREDITS_", "SUPPORT_", "EXIT_"];
const LANG_CODE   = ["CN", "JP", "EN", "RU", "FR", "VN", "ES", "PTBR", "KR", "ID", "TH", "UA", "TW", "IT"];
const IS_IMOUTO   = ["妹妹", "妹", "imouto", "sister", "sis", "сестра", "сестренка"];
const LANG_LOCALE = [
            { allowMemory:true,  titleLOGO: true,   titleOpt: true,  saveLoadConfirm: true,  saveLoadTips:true,  equipConfirm: true , Achievements:true},   // CN   0
            { allowMemory:true,  titleLOGO: true,   titleOpt: true,  saveLoadConfirm: true,  saveLoadTips:true,  equipConfirm: true , Achievements:true},   // JP   1
            { allowMemory:true,  titleLOGO: true,   titleOpt: true,  saveLoadConfirm: true,  saveLoadTips:true,  equipConfirm: true , Achievements:true},   // EN   2
            { allowMemory:true,  titleLOGO: true,   titleOpt: true,  saveLoadConfirm: true,  saveLoadTips:true,  equipConfirm: true , Achievements:true},   // RU   3
            { allowMemory:false, titleLOGO: false,  titleOpt: true,  saveLoadConfirm: true,  saveLoadTips:true,  equipConfirm: true,  Achievements:true},   // FR   4
            { allowMemory:true,  titleLOGO: false,  titleOpt: true,  saveLoadConfirm: true,  saveLoadTips:true,  equipConfirm: true,  Achievements:true},   // VN   5
            { allowMemory:false, titleLOGO: false,  titleOpt: true,  saveLoadConfirm: true,  saveLoadTips:true,  equipConfirm: false, Achievements:true},   // ES   6
            { allowMemory:true,  titleLOGO: false,  titleOpt: true,  saveLoadConfirm: true,  saveLoadTips:true,  equipConfirm: false, Achievements:true},   // PTBR 7
            { allowMemory:true,  titleLOGO: true,   titleOpt: true,  saveLoadConfirm: true,  saveLoadTips:true,  equipConfirm: false, Achievements:true},   // KR   8
            { allowMemory:true,  titleLOGO: false,  titleOpt: true,  saveLoadConfirm: true,  saveLoadTips:true,  equipConfirm: false, Achievements:true},   // ID   9
            { allowMemory:true,  titleLOGO: false,  titleOpt: true,  saveLoadConfirm: true,  saveLoadTips:true,  equipConfirm: false, Achievements:true},   // TH	  10
            { allowMemory:true,  titleLOGO: false,  titleOpt: true,  saveLoadConfirm: true,  saveLoadTips:true,  equipConfirm: false, Achievements:true},    // UA	11
            { allowMemory:true,  titleLOGO: true,   titleOpt: true,  saveLoadConfirm: true,  saveLoadTips:true,  equipConfirm: true , Achievements:true},   // TW   12		
];
// 将语言配置暴露给全局，方便其他插件适配
//  (不知道为什么不这么做会导致某些环境下无法正确读取到这个变量，可能是加载顺序的问题？反正暴露了就能读到了)
window.LANG_LOCALE = LANG_LOCALE;
window.LANG_CODE   = LANG_CODE;


// 系统功能文本需要最先载入
DataManager._databaseFiles.unshift({
  name: 'systemFeatureText',
  src: 'EN/systemFeatureText_EN.json'
});

DataManager.loadDataFile(
  'systemFeatureText',
  'EN/systemFeatureText_EN.json'
);
// --- 初始化 ---	
ConfigManager.language = 2;
ConfigManager.needsTC = false;
ConfigManager.scaleResolution = false;
ConfigManager.harmonyMode = false;
ConfigManager.FPS_LOCK_MODE = true;
ConfigManager.isImouto = false;
ConfigManager.disableNetwork = false;
ConfigManager.totalPlaytime = 0;
ConfigManager.allowUnlockCreditsScene = false;
ConfigManager.analyticsPlaytime = null;

// BEGIN SHIROIN CROSS-SAVE PLAYTIME
// Session baseline lives outside $gameTemp/$gameSystem, so loading a save cannot reset it.
(() => {
  const DAY = 86400000;
  let last = performance.now(), wasPlaying = false, inGame = false, remainder = 0, unsaved = 0;
  const dayAt = ms => new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
  function playing() {
    const s = SceneManager._scene;
    if (s instanceof Scene_Map || s instanceof Scene_Battle) inGame = true;
    if (s instanceof Scene_Title || s instanceof Scene_Load) inGame = false;
    return inGame && ConfigManager._isLoaded && !document.hidden &&
      (!SceneManager.isGameActive || SceneManager.isGameActive()) && !!$gameSystem &&
      (s instanceof Scene_Map || s instanceof Scene_Battle ||
       (s instanceof Scene_MenuBase && !(s instanceof Scene_Load)));
  }
  function uuid() {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = Array.from(b, v => v.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }
  function totals(data) {
    // Migrate only the new daily meter, never the legacy totalPlaytime counter.
    if (!Number.isFinite(data.totalSeconds) || data.totalSeconds < 0) {
      data.totalSeconds = data.entries.reduce((n,r)=>n+(Number.isFinite(r.seconds)&&r.seconds>0?r.seconds:0),0);
    }
    const previous = Number.isFinite(data.referenceSeconds) ? data.referenceSeconds : 0;
    const scene = SceneManager._scene;
    const hasSave = inGame && (scene instanceof Scene_Map || scene instanceof Scene_Battle ||
      (scene instanceof Scene_MenuBase && !(scene instanceof Scene_Load)));
    const saved = hasSave && typeof $gameSystem?.playtime === 'function' ? $gameSystem.playtime() : 0;
    data.referenceSeconds = Math.floor(Math.max(previous, data.totalSeconds, Number.isFinite(saved)&&saved>0?saved:0));
  }
  function record(seconds, end) {
    if (Utils.isOptionValid('test') || Utils.isOptionValid('btest') || Utils.isOptionValid('etest')) return;
    const version = String(window.$dataSystem?.gameVersion || '').trim();
    if (!/^\d{1,4}\.\d{1,4}(?:\.\d{1,4}){0,2}[A-Za-z]?$/.test(version)) return;
    let data = ConfigManager.analyticsPlaytime;
    if (!data || typeof data.id !== 'string' || !Array.isArray(data.entries)) {
      data = ConfigManager.analyticsPlaytime = {id:uuid(), entries:[]};
    }
    totals(data);
    data.totalSeconds += seconds;
    totals(data);
    // Split short intervals at midnight in Japan; offline time retains its original day/version.
    let at = end - seconds * 1000;
    while (at < end) {
      const day = dayAt(at), boundary = Date.parse(day+'T00:00:00+09:00') + DAY;
      const until = Math.min(end, boundary), amount = (until-at)/1000;
      let row = data.entries.find(r => r.day === day && r.version === version);
      if (!row) { row = {day,version,seconds:0}; data.entries.push(row); }
      row.seconds += amount; at = until;
    }
    const floor = dayAt(end - 90*DAY);
    data.entries = data.entries.filter(r => r.day >= floor);
  }
  function unlock() {
    if (ConfigManager.totalPlaytime >= 1800) ConfigManager.disableNetwork = false;
  }
  function tick() {
    const now = performance.now(), active = playing(), delta = (now-last)/1000;
    last = now;
    // Ignore suspension/large stalls, title/loading screens and background intervals.
    if (active && wasPlaying && delta > 0 && delta <= 5) {
      remainder += delta;
      const seconds = Math.floor(remainder);
      if (seconds) {
        remainder -= seconds;
        ConfigManager.totalPlaytime += seconds;
        try { record(seconds, Date.now()); } catch { /* Optional analytics must not interrupt gameplay. */ }
        unsaved += seconds;
        unlock();
      }
    }
    wasPlaying = active;
    if (unsaved >= 60) { unsaved = 0; ConfigManager.save(); }
  }
  function checkpoint() { tick(); if (unsaved) { unsaved = 0; ConfigManager.save(); } }
  function snapshot(cursor=0) {
    checkpoint();
    const data = ConfigManager.analyticsPlaytime;
    if (!data?.entries?.length) return undefined;
    const floor = dayAt(Date.now() - 90*DAY);
    const rows = data.entries.filter(r=>r.day>=floor).map(r=>({...r,seconds:Math.floor(r.seconds)})).filter(r=>r.seconds>0)
      .sort((a,b)=>b.day.localeCompare(a.day)||b.version.localeCompare(a.version));
    if (!rows.length) return undefined;
    const entries = [rows[0]], older = rows.slice(1);
    for (let i=0; i<Math.min(2,older.length); i++) entries.push(older[(cursor+i)%older.length]);
    totals(data);
    return {id:data.id,entries,referenceSeconds:data.referenceSeconds};
  }
  const updateMain = SceneManager.updateMain;
  SceneManager.updateMain = function() { tick(); return updateMain.apply(this,arguments); };
  const exit = SceneManager.exit;
  SceneManager.exit = function() { checkpoint(); return exit.apply(this,arguments); };
  document.addEventListener('visibilitychange',()=>{ checkpoint(); wasPlaying=false; last=performance.now(); });
  window.addEventListener('pagehide',checkpoint);
  window.ShiroinPlaytime = {checkpoint,snapshot};
})();
// END SHIROIN CROSS-SAVE PLAYTIME


function _isTraditionalChineseLocale() {
  const navLang = String(navigator.language || "").toLowerCase();
  const navList = Array.isArray(navigator.languages) ? navigator.languages : [];
  const allLangs = [navLang].concat(navList.map(v => String(v || "").toLowerCase()));
  return allLangs.some(lang =>
    /^zh(?:[-_](?:hant|tw|hk|mo))/.test(lang) ||
    /(?:^|[-_])hant(?:$|[-_])/.test(lang)
  );
}

function _resolveNeedsTCByLocale(languageCode, savedFlag) {
  if (savedFlag !== undefined) return !!savedFlag;
  return Number(languageCode) === 0 ? _isTraditionalChineseLocale() : false;
}

async function _loadRegisteredFont(fontFace) {
  if (!fontFace) return false;

  if (typeof chahuiUtil.checkFontLoaded === "function" &&
      chahuiUtil.checkFontLoaded(fontFace)) {
    return true;
  }

  if (typeof Graphics === "undefined" || !Graphics._createFontLoader) {
    return false;
  }

  // 未列入项目注册表的系统字体/引擎别名，不在这里发起文件加载。
  if (!Graphics._fontFileMap || !Graphics._fontFileMap[fontFace]) {
    return true;
  }

  const result = Graphics._createFontLoader(fontFace);
  if (result && typeof result.then === "function") {
    return await result;
  }
  return typeof chahuiUtil.checkFontLoaded === "function"
    ? chahuiUtil.checkFontLoaded(fontFace)
    : true;
}

let _localizedFontRequestId = 0;

async function _applyLocalizedFontFace(curLang, needTW) {
  if (!window.DrillUp) return false;
  const requestId = ++_localizedFontRequestId;
  let fallbackFontFace = "Huninn";

  switch (curLang) {
    case 5: // 越南语
      fallbackFontFace = "Mali";
      DrillUp.g_DOp_list[7]['fontSize'] = 24;
      break;
    case 8: // 韩语
      fallbackFontFace = "NanumGothic";
      break;   
    case 0:  // 简体中文
    case 11: // 乌克兰语    
    case 12: // 繁体中文
      fallbackFontFace = "Chiron GoRound TC";
      break;
    default:
      fallbackFontFace = "Huninn";
      break;
  }

  const fallbackLoaded = await _loadRegisteredFont(fallbackFontFace);

  // 用户在字体加载期间再次切换语言时，旧请求不得覆盖新请求的选择。
  if (requestId !== _localizedFontRequestId) return false;

  // Fusion Pixel 只供特殊演出按需选择，不参与全局默认字体设置。
  DrillUp.g_DFF_fontFace = fallbackFontFace;

  return fallbackLoaded;
}

// ============================================================
// 系统语言自动检测:根据浏览器 navigator.language 决定默认语言
// ------------------------------------------------------------
// 注意:中文需细分繁简
//   zh-tw / zh-hk / zh-mo → 繁体(直接对应 langId 12)
//   zh / zh-cn / zh-sg    → 简体(对应 langId 0)
// ============================================================
const NAV_LANG_MAP = [
    { prefixes: ["zh-tw", "zh-hk", "zh-mo"], langId: 12 },  // 繁体中文(必须排在 "zh" 前)
    { prefixes: ["zh"],                       langId: 0 },   // 简体中文
    { prefixes: ["ja"],                       langId: 1 },   // 日文
    { prefixes: ["ru", "uk"],                 langId: 3 },   // 俄文 / 乌克兰文
    { prefixes: ["vi"],                       langId: 5 },   // 越南文
    { prefixes: ["ko"],                       langId: 8 },   // 韩文
    { prefixes: ["id"],                       langId: 9 },   // 印尼文
];
 
const detectLanguageFromNavigator = () => {
    const nav = navigator.language.toLowerCase();
    for (const { prefixes, langId } of NAV_LANG_MAP) {
        if (prefixes.some(p => nav.startsWith(p))) return langId;
    }
    return 2;   // 默认英文
};

// --- 保存时写入新增变量 ---
const _Config_makeData = ConfigManager.makeData;
ConfigManager.makeData = function () {
  const config = _Config_makeData.call(this);
  config.language = this.language;
  config.needsTC = this.needsTC;
  config.FPS_LOCK_MODE = this.FPS_LOCK_MODE;
  config.scaleResolution = this.scaleResolution;
  config.isImouto = this.isImouto;
  config.totalPlaytime = this.totalPlaytime;
  config.analyticsPlaytime = this.analyticsPlaytime;
  config.allowUnlockCreditsScene = this.allowUnlockCreditsScene;
  return config;
};

// ============================================================
// 修复:config 文件缺失（首次运行/被删）时也必须跑一遍 applyData。
//   核心 ConfigManager.load 在 loadObject reject 时只 `.catch(()=>0)`、不调 applyData，
//   导致需要 applyData 才会初始化的自定义项不生效：
//     · SRD masterVolume → AudioManager.masterVolume 未设 → 显示 NaN%
//     · 本插件语言检测   → 不按设备语言矫正、停在默认英语
//     · CustomizeConfigItem 自定义项 → undefined
//   这里重写 load，让"读不到/读取失败"也用空对象 applyData，跑默认值 + 语言检测。
// ============================================================
ConfigManager.load = function () {
    StorageManager.loadObject("config")
        .then(config => this.applyData(config || {}))
        .catch(() => this.applyData({}))               // 缺失/失败 → 空config 应用默认 + 语言检测
        .then(() => { this._isLoaded = true; return 0; })
        .catch(() => 0);
};

// ============================================================
// 加载时应用 language:优先读配置,否则自动检测
// ============================================================
const _Config_applyData = ConfigManager.applyData;
ConfigManager.applyData = function (config) {
    _Config_applyData.call(this, config);
    
    // ==================== 读取/同步系统配置 ====================
    if (config.language !== undefined) {
        this.language        = Number(config.language);
        this.needsTC         = _resolveNeedsTCByLocale(this.language, config.needsTC);
        this.scaleResolution = config.scaleResolution;
        this.isImouto        = config.isImouto;
        this.FPS_LOCK_MODE   = config.FPS_LOCK_MODE;
        this.allowUnlockCreditsScene = config.allowUnlockCreditsScene;
 
        this.totalPlaytime = Number.isFinite(Number(config.totalPlaytime)) ? Math.max(0, Number(config.totalPlaytime)) : 0;
        this.analyticsPlaytime = config.analyticsPlaytime || null;
 
        // 保险装置: 翻译不足的小语种默认会回退为英语版
        const allowMemory = window?.LANG_LOCALE?.[this.language]?.allowMemory;
        if (!allowMemory) this.language = 2;
 
        // 旧存档适配
        if (this.language === 0 && this.needsTC) this.language = 12;
    } else {
        // 第一次运行或未配置:根据系统语言检测
        this.language = detectLanguageFromNavigator();
        // 延迟落盘:此刻仍在 applyData 调用链【中段】，外层插件(SRD masterVolume / CustomizeConfigItem
        //   自定义项等)的值尚未设置；若此处立即 save→makeData 会读到未初始化的 NaN/undefined 并持久化、
        //   污染 config。推迟到本帧微任务，等整条 applyData 链跑完、所有项就绪后再存。
        setTimeout(() => { try { this.save(); } catch (e) { /* 静默失败 */ } }, 0);
    }
 
    // ==================== 应用本地化字体 ====================
    // 冷启动无需阻塞 applyData；字体请求会立刻进入 FontManager.loading，
    // Scene_Boot 会通过 FontManager.isReady() 等待实际加载完成。
    _applyLocalizedFontFace(this.language, this.language === 0 && this.needsTC)
      .catch(error => console.error("[MultiLang] 启动字体准备失败", error));
 
    // ==================== 加载多语言 systemFeatureText 覆盖英文基准 ====================
    const ln = LANG_CODE[this.language] || "EN";
    if (ln !== "EN") {
        const url = `${universalUrl}data/${ln}/systemFeatureText_${ln}.json`;
        httpRequest(url, { responseType: "json" })
            .then(obj => { Object.assign(window.systemFeatureText || {}, obj); })
            .catch(e => { console.warn(`[MultiLang] 解析 ${url} 失败,继续使用英文基准`, e); });
    }
 
    // ==================== 标题界面选项按钮适配 ====================
    // 没做本地化素材的语言fallback到EN版
    const titleOptAllowed = window?.LANG_LOCALE?.[this.language]?.titleOpt;
    const btnSuffix = titleOptAllowed ? this.language : 2;
    DrillUp.g_TSc_command_button.btn_src = TITLE_BTN_PREFIXES.map(s => `${s}${btnSuffix}`);
};

/*
DataManager.loadMapData = function (mapId) {
  // 多语言适配
  let lang = ConfigManager.language;
  // 多语言模块建设完成前，以英语版为主
  if (lang > 3) lang = 2;
  if (mapId > 0) {
    const padded = String(mapId).padStart(3, '0');
    let filename = `Map${padded}.json`;
    // 还未提取完的部分
    const mapIdArray = [19];
    if (mapIdArray.includes(mapId)) {
      filename = `GameLanguage${lang}/Map${padded}.json`;
    }
    // 开发者用
    if (Utils.isOptionValid("test")) filename = `Map${padded}.json`;
    this._mapLoader = ResourceHandler.createLoader(
      'data/' + filename,
      this.loadDataFile.bind(this, '$dataMap', filename)
    );
    this.loadDataFile('$dataMap', filename);
  } else {
    this.makeEmptyMap();
  }
};
*/
//=============================================================================
// 适配QJ事件复制插件和多语言模块
//=============================================================================

DataManager.loadSpawnMapData = function (mapId) {
// 该方法已不需要适配多语言，留着它只是历史遗留问题(也不能删，因为QJ-SpawnEvent.js已删除原型)
// rpg_custom.js定义了universalUrl用来适配安卓版，对PC版来说它是无用的
  if (mapId <= 0) return null;
  const padded = String(mapId).padStart(3, '0');
  let src = `Map${padded}.json`;
  const url = universalUrl + 'data/' + src;
  httpRequest(url, { responseType: 'json' })
    .then(data => {
      $dataSpawnMapList[mapId] = data;
      DataManager.onLoadSpawnMapData($dataSpawnMapList[mapId]);
    })
};

//=============================================================================
// 根据语言加载指定公共事件和场景物件语料库
//=============================================================================
var shiroin_Scene_Boot_start = Scene_Boot.prototype.start;
Scene_Boot.prototype.start = function () {

  shiroin_Scene_Boot_start.call(this);
  // 运行环境检测
  this.detectLaunchEnvironment(); 
  // 画面平滑模式
  window.canvasSmooth?.(true);    
  (async () => {
    try {
      await extraJsonLoad('systemConfiguration', `data/Configuration.json`);
      const [isSFW, isDLsite, isFanza, isImouto] = await Promise.all([
            DataManager.checkPlaceholderExists("SFW.json"),
            DataManager.checkPlaceholderExists("DLsite.json"),
            DataManager.checkPlaceholderExists("Fanza.json"),
            DataManager.checkPlaceholderExists("Imouto.json"),
      ]);

      if (isSFW)     ConfigManager.harmonyMode = true;
      if (isDLsite)  ConfigManager.isDLsite = true;
      if (isFanza)   ConfigManager.isFanza = true;
      if (isDLsite || isFanza || isImouto || ConfigManager.harmonyMode || ConfigManager.isImouto) {
          ConfigManager.isImouto = true;
          if (DrillUp && DrillUp.g_COSt_list && DrillUp.g_COSt_list[119]) {
              DrillUp.g_COSt_list[119]['context'] = "妹";
          }
      }
      if (isDLsite || isFanza) ConfigManager.isJapanesePlatform = true;
      // 联网功能的处理
      if (ConfigManager.isDLsite && !window.systemConfiguration?.forceEnableOnlineFeatures) {
         if (ConfigManager.totalPlaytime < 1800) {
             ConfigManager.disableNetwork = true;
         }
      }
      // 游戏初次启动时，允许无条件触发一次更新检查
      localStorage.removeItem("pendingUpdateVersionCheckTime");      
      // 刷新语言有标记识别需要确保执行顺序
      DataManager.reloadLanguage(false);

    } catch (e) {
      console.error(e);
    }
  })();
  // 手机端适配，需要使用更大号的UI
  if (Utils.isMobileDevice()) {
      this.fixAndroidConfig();
  }

  $gameStrings.setValue(20, "");
  // 玩家不需要看见开关变量数据
  $dataSystem.variables.fill('Do not modify this data. it may cause errors.', 1);  // 索引0本来就是空
  $dataSystem.switches.fill('Do not modify this data. it may cause errors.', 1);

  const invisibleTasks = [
    // 玩家也不需要看见公共事件数据
    $dataCommonEvents,
    // 玩家也不需要看见状态数据
    $dataStates,
    // 玩家也不需要看见技能数据
    $dataSkills
  ];

  for (const tasks of invisibleTasks) {
    if (!tasks) continue;
    for (const task of tasks) {
      if (task) task.name = 'Do not modify this data. it may cause errors.';
    }
  }
  // 预加载成就弹窗背景图
  if (Imported.SMO_Achievements) {
      for (let i = 0; i <= 12; i++) {
        let imgName = `Achievements_popUp${i}`;
        ImageManager.reserveAchievement(imgName);
      }      
  }
  // 预加载音频滤镜
  AudioManager.prepareUnderwaterBgmEffect?.();
};

// 安卓版UI、对话框调整
Scene_Boot.prototype.fixAndroidConfig = function () {

  if ($gameSystem._drill_SCo_list[12]) $gameSystem._drill_SCo_list[12]['enable'] = true;

  DrillUp.g_DOp_defaultStyleId = 9;
  $gameSystem._drill_DOp_curStyle = JSON.parse(JSON.stringify(DrillUp.g_DOp_list[8]));
  let size = 26;
  if (![5].includes(ConfigManager.language)) size = 32;
  DrillUp.g_DOp_list[7]['fontSize'] = size;
  DrillUp.g_COSB_btn[0] = DrillUp.g_COSB_btn[19];
  DrillUp.g_COSB_btn[20] = DrillUp.g_COSB_btn[21];
  // 掉落物演出UI
  if (DrillUp.g_GFTH_style) {
    for (let i = 0; i < DrillUp.g_GFTH_style.length; i++) {
      if (i >= 4) continue;
      const style = DrillUp.g_GFTH_style[i];
      if (!style) continue;
      style.regist_x = 1090;
      style.regist_y = 880;
    }
  }
};

// 检测玩家运行环境
Scene_Boot.prototype.detectLaunchEnvironment = async function () {
  if (!Utils.isNwjs || !Utils.isNwjs()) return;

  // 防止重复弹窗
  if (this._launchEnvChecked) return;
  this._launchEnvChecked = true;

  const os = require("os");
  const path = require("path");

  // 统一成小写 + 正斜杠
  const toNorm = (p) => String(p || "").replace(/\\/g, "/").replace(/\/+$/g, "").toLowerCase();

  // cwd 通常是 www, 用 rootDir 做提示更直观
  const getRootDir = () => {
    let cwd = "";
    try { cwd = process.cwd(); } catch (e) { cwd = ""; }
    if (!cwd) return "";
    const base = path.basename(cwd).toLowerCase();
    if (base === "www") return path.dirname(cwd);
    return cwd;
  };

  const tempRoot = toNorm(os.tmpdir());
  const cwdNorm  = toNorm(process.cwd());
  const rootDir  = getRootDir();
  const rootNorm = toNorm(rootDir);

  // 判断某路径是否在某根目录之下
  const isUnder = (dir, root) => {
    if (!dir || !root) return false;
    return dir === root || dir.indexOf(root + "/") === 0;
  };

  // 检测是否"从压缩包里直接运行"（被解压到系统临时目录再启动）。
  //   旧写法只判 cwd 是否在 os.tmpdir() 之下 → 过度宽泛，会误杀正常玩家：
  //   ① 把游戏正常解压在了 %TEMP% 附近/之下的合法位置；
  //   ② TEMP 被设成盘根/短路径(如 D:\ → toNorm 后为 "d:")，isUnder 用 "d:/" 前缀
  //      匹配会把整个盘判成"临时目录"，该盘上任何正常游戏都被误杀强退。
  //   改为：必须"在有效的临时目录下" 且 "路径命中主流压缩工具的解压子目录特征"，
  //   才判定为压缩包直启并退出；否则一律放行，宁可漏判也不误伤正常玩家。
  const tmpValid = tempRoot && tempRoot.length >= 4 && tempRoot.indexOf("/") !== -1; // 排除盘根/空
  const archiveMarkers = ["/rar$", "/7z", "/wz", "/bnz.", "/temp1_", "/temp2_", "/temp3_", "/temp4_"];
  const underTemp = tmpValid && isUnder(cwdNorm, tempRoot);
  const looksLikeArchiveRun = underTemp && archiveMarkers.some((m) => cwdNorm.indexOf(m) !== -1);

  if (looksLikeArchiveRun) {
    try { console.warn("[LaunchEnv] archive-run detected. cwd=", cwdNorm, " tmp=", tempRoot); } catch (e) {}
    let lines = ["检测到游戏通过压缩包直接启动！", "请正常解压文件再启动游戏！"];
    if (ConfigManager.language > 0) {
      lines = [
        "Game detected as being launched directly from an archive!",
        "Please extract all files properly before running the game!"
      ];
    }
    await confirm (lines.join("\n"), { align: "left" });
    try { nw.App.quit(); } catch (e) { window.close(); }
    return;
  } else if (underTemp) {
    // 在临时目录下但没有压缩工具特征：很可能是玩家正常解压在了 temp 附近，
    //   不强退，只在控制台留痕，便于日后排查（不打扰玩家）。
    try { console.warn("[LaunchEnv] cwd under temp but no archive marker, allowed. cwd=", cwdNorm, " tmp=", tempRoot); } catch (e) {}
  }

  // 先判断是否在系统盘（通常是 C:）。不在系统盘则直接跳过敏感路径检测。
  // 优先使用 SystemDrive（更准确），不行再退回 C:
  const sysDrive = (process.env.SystemDrive || "C:").toLowerCase(); // "C:"
  let rootDrive = "";
  try {
    // Windows: path.parse("C:\\Games\\X").root => "C:\\"
    rootDrive = (path.parse(rootDir).root || "").replace(/\\+$/g, ""); // "C:"
    rootDrive = rootDrive.toLowerCase();
  } catch (e) {
    rootDrive = "";
  }

  // 非 Windows 或取不到盘符时：不做“必须 C 盘”过滤
  const isWindows = process.platform === "win32";
  if (isWindows && rootDrive && rootDrive !== sysDrive) return;

  // 敏感路径检测: 命中只警告，不退出
  const riskyRules = [
    { key: "/onedrive/", reasonCN: "OneDrive 同步目录可能拦截写入", reasonEN: "OneDrive synced folders may block write access" },
    { key: "/windows/",  reasonCN: "系统目录不可写", reasonEN: "Windows system folders are not writable" }
  ];

  let hit = null;
  for (let i = 0; i < riskyRules.length; i++) {
    if (rootNorm.indexOf(riskyRules[i].key) !== -1) { hit = riskyRules[i]; break; }
  }

  if (hit) {
    let text = "";
    if (ConfigManager.language > 0) {
      text =
        "Warning: The game seems to be running in a restricted folder.\n" +
        "Saving settings or save files may fail.\n\n" +
        "Path:\n" + rootDir + "\n\n" +
        "Reason:\n" + hit.reasonEN + "\n\n" +
        "Suggestion:\n" +
        "Move the whole game folder to a normal location, for example:\n" +
        "D:/Games/YourGameName\n";
    } else {
      text =
        "警告: 检测到游戏可能运行在受限制的目录中。\n" +
        "可能导致无法保存设置或存档。\n\n" +
        "路径:\n" + rootDir + "\n\n" +
        "原因:\n" + hit.reasonCN + "\n\n" +
        "建议:\n" +
        "请将整个游戏文件夹移动到普通目录，例如:\n" +
        "D:/Games/YourGameName\n";
    }
    // alert(text, { align: "left" });
  }
};

// 重置设置选项的显示并放置更新检查点
const _ST_start = Scene_Title.prototype.start;
Scene_Title.prototype.start = function () {

  _ST_start.call(this);
  if (!this._hasCheckedUpdate) {
    this._hasCheckedUpdate = true;
    // 确保语言选项始终是正常指向
    ConfigManager.setCustomParam('Language', ConfigManager.language);
    // 重置锁60帧设置选项
    ConfigManager.setCustomParam('LockedFPS', ConfigManager.FPS_LOCK_MODE);
    if (ConfigManager.FPS_LOCK_MODE) Graphics._app.ticker.maxFPS = 60; 
    // 需要延迟触发自动更新检测
    setTimeout(() => this.autoUpdataCheck?.(), 700);
  }
};

//=============================================================================
// 地图事件多语言适配
//=============================================================================
var chahuiUtil = chahuiUtil || {};

// 检查地图数据是否真实存在
chahuiUtil.checkMapEventExists = function (mapId) {

  $gameSelfSwitches.setValue([$gameMap.mapId(), 2, 'D'], true);
  return;
  
  /* 烂摊子的实验品，先放着
  if (!this || !mapId) return;

  const fs = require('fs');
  const path = require('path');
  // process.cwd() 在 NW.js 下就是游戏部署 exe 所在的目录
  const base = process.cwd();

  const filename = `Map${String(mapId).padStart(3, '0')}.json`;
  // 兼容 www/ 包装：data/ 可能在 cwd/data(开发) 或 cwd/www/data(部署套 www)。
  const file = [path.join(base, 'data', filename), path.join(base, 'www', 'data', filename)]
      .find(p => { try { return fs.existsSync(p); } catch (e) { return false; } })
      || path.join(base, 'data', filename);

  try {
    const json = fs.readFileSync(file, 'utf8');
    const map = JSON.parse(json);
    const eventId = this._eventId;
    if (map.events.length > 1) {
      $gameSelfSwitches.setValue([$gameMap.mapId(), eventId, 'D'], true);
    }
  } catch (e) {
    console.error('读取失败：', e);
  }
  */
};

// 快捷显示原型事件文本  
Game_Interpreter.prototype.showPrototypeEventDialogue = function (type, idx, subIdx) {

  const key = "prototypeEventTemplate";
  const table = window[key] || {};
  const entry = table[type]?.[String(idx)];
  let textArray;

  if (subIdx !== undefined) {
    // 如果传了 subIdx，就取第二层
    const sub = entry?.[String(subIdx)];
    // 无论取到的是字符串还是对象，都要包成数组
    textArray = sub !== undefined ? [sub] : [];
  } else {
    // 原先的整体数组
    textArray = Array.isArray(entry) ? entry : [];
  }
  if (textArray.length === 0) {
      textArray = ["\\c[10]Text missing — unable to display!",
      "Please wait for a future update or switch back to the English version."
    ];
  }
  chahuiUtil.multilingualCompatibleDisplayText.call(this, textArray);
};

// 快捷显示公共事件文本
Game_Interpreter.prototype.showCommonEventDialogue = function (type, idx, subIdx, extra={}) {

  const key = "mapCommonEventDialogue";
  const table = window[key] || {};
  let entry, textArray;
  if (idx !== undefined) {
      entry = table[type]?.[String(idx)];
  } else {
      entry = table[type];
  }

  if (subIdx !== undefined) {
    // 如果传了 subIdx，就取第二层
    const sub = entry?.[String(subIdx)];
    // 无论取到的是字符串还是对象，都要包成数组
    textArray = sub !== undefined ? [sub] : [];
  } else {
    // 原先的整体数组
    textArray = Array.isArray(entry) ? entry : [];
  }
  
  if (extra.cookingSystemCompatibility) {
    // 料理环节特殊适配
    let slot = $gameVariables.value($gameVariables.value(85));
    let ii   = `\\ii[${slot}]\\c[0]`;
    textArray = textArray.map(t => t.replace("\\ii[\\v[\\v[85]]]", ii));
    textArray = textArray.map(t => t.replace("\\ii[\\v[85]]", ii));
  }

  if (textArray.length === 0) {
      textArray = ["\\c[10]Text missing — unable to display!",
      "Please wait for a future update or switch back to the English version."
    ];
  }  
  chahuiUtil.multilingualCompatibleDisplayText.call(this, textArray);
};

// 快捷显示地图事件文本
Game_Interpreter.prototype.showMapEventDialogue = function (idx, subIdx, setEventId, extra= {}) {

  if ($gameMap.chahuiMapTemp?.forceSkipText) {
    // 跳过文本显示，为纯动画演出流程而实验的功能
    return;
  }

  // 修改对话框样式
  if (!$dataMap.note.includes("<深渊>") && $gameSystem._drill_DOp_curStyle.id !== 1) {
    $gameSystem._drill_DOp_curStyle = JSON.parse(JSON.stringify(DrillUp.g_DOp_list[0]));
    $gameSystem._drill_DSk_messageStyleId = 3;
  }

  let eid = String(this._eventId);
  if (setEventId) eid = String(setEventId);
  let mapId = $gameMap.mapId();
  // 检测是否为复制事件
  let event = $gameMap.event(this._eventId);
  if (event && event._sourceeventId) {
    eid = event._sourceeventId;
    mapId = event._sourceMapId;
  }

  const key = `MapEventDialogue${mapId}`;
  const table = window[key] || {};
  const entry = table[eid]?.[String(idx)];
  let textArray;

  if (subIdx !== undefined) {
    // 如果传了 subIdx，就取第二层
    const sub = entry?.[String(subIdx)];
    // 无论取到的是字符串还是对象，都要包成数组
    textArray = sub !== undefined ? [sub] : [];
  } else {
    // 原先的整体数组
    textArray = Array.isArray(entry) ? entry : [];
  }

  /* ---------- 如果没取到 & 未重试过 ---------- */
  if (textArray.length === 0) {
      //chahuiUtil.loadMapEventDialogue(2); 	
      textArray = ["\\c[10]Text missing — unable to display!",
      "The language you selected has not been fully translated yet.",
      "Please wait for a future update or switch back to the English version. "
    ];
  }

  chahuiUtil.multilingualCompatibleDisplayText.call(this, textArray, false, extra);
};

// 重置语言标记(已废弃)
chahuiUtil.resetSystemLanguageFlag = function () {
  let lang = ConfigManager.language;
  if (lang === 12) lang = 0;
  if (lang > 2) lang = 2;
  $gameVariables.setValue(1, lang);
};

Game_Interpreter.prototype.getLocalizedTextData = function (idx, extra={}) {
  let eid = String(this._eventId);
  let mapId = $gameMap.mapId();
  // 检测是否为复制事件
  let event = $gameMap.event(this._eventId);
  if (event._sourceeventId) {
      eid   = event._sourceeventId;
      mapId = event._sourceMapId;
  }

  const key = `MapEventDialogue${mapId}`;
  const table = window[key] || {};
  const entry = table[eid]?.[String(idx)];
  let textArray = [];
  if (extra.subIdx !== undefined) {
      const sub = entry?.[String(extra.subIdx)];
      textArray = sub !== undefined ? [sub] : [];
  } else {
      textArray = Array.isArray(entry) ? entry : [];
  }
  return textArray;    
};

// 多语言适配显示文本
chahuiUtil.multilingualCompatibleDisplayText = function (textArray, isBlackBackground, extra = {}) {
  /*
 // $gameSystem._drill_VIMC_curSound = 0;	
 // 喵的诅咒
 let meowCurse = false;
 if (meowCurse) {  
    textArray = chahuiUtil.meowifyArrayCapped(textArray);
   if ( textArray.some( s => typeof s === 'string' && s.includes("\\nl< >")) ) {
     // $gameSystem._drill_VIMC_curSound = 1;
   }
 }
 */

  // 基本设置：清头像区、背景、位置
  let type = 0;
  if (isBlackBackground) type = 1;
  $gameMessage.setFaceImage('', 0);
  $gameMessage.setBackground(type);
  $gameMessage.setPositionType(2);

  // 每页最多显示 4 行
  let maxLines = 4;
  const chunks = [];
  for (let i = 0; i < textArray.length; i += maxLines) {
    chunks.push(textArray.slice(i, i + maxLines));
  }

  let waitFrames = 0;
  if (extra.waitTime) {
    waitFrames = Number(extra.waitTime);
    if (!isFinite(waitFrames) || waitFrames < 0) waitFrames = 0;
    waitFrames = Math.floor(waitFrames);
  }

  chunks.forEach(function (lines, pageIndex) {
    if (pageIndex > 0) {
      // 必须把翻页符附加在上一条文本末尾。
      // 若用 add('\f') 单独添加，allText() 会拼成 "第4行\n\f\n第5行"：
      // 第一个换行已因满4行触发自动分页，紧接着 \f 再分页，就会产生空白页。
      $gameMessage.newPage();
    }
    let text = lines.join('\n');
    // 只在最后一页末尾追加等待，确保文本显示完才延迟
    if (waitFrames > 0 && pageIndex === chunks.length - 1) {
      text += "\\w[" + waitFrames + "]  ";
    }	
    $gameMessage.add(text);
  });
  // 选项适配
  if (!this._preventOptionDisplay && this.nextEventCode() === 102) {
    this._index++;
    this.setupChoices(this.currentCommand().parameters);
  }
  this.setWaitMode('message');
  this._preventOptionDisplay = undefined;
};

// ============================================================================
// COWA 计算模式与 MZ 换页符兼容
//
// Drill_CoreOfWindowAuxiliary 会借用真实的 Window_Message 计算扩展文本宽度。
// 计算过程预读到 \f 时，MZ 的 processNewPage() 会直接 startPause()，从而在真正
// 消费换页符之前凭空建立一次暂停。结果是同一个 \f 必须确认两次：第一次清除
// 计算过程产生的假暂停，第二次才清除真正换页时产生的暂停。
// 计算状态只需要推进临时 textState，不能修改真实消息窗口的分页与暂停状态。
// ============================================================================
const _chahui_WindowMessage_processNewPage = Window_Message.prototype.processNewPage;
Window_Message.prototype.processNewPage = function(textState) {
  const calculating =
    typeof this.drill_COWA_isCalculating === "function" &&
    this.drill_COWA_isCalculating();

  if (calculating) {
    // MZ 在调用本方法前已经消费了 \f；同时跳过 Game_Message.newPage() 后由
    // allText() 拼接出的换行，保持宽度计算与真实换页行为一致。
    if (textState.text[textState.index] === "\n") {
      textState.index++;
    }
    return;
  }

  _chahui_WindowMessage_processNewPage.call(this, textState);
};

// 居中警告文本演出
Game_Interpreter.prototype.showMapEventCenterWarningText = function (idx, subIdx) {

  let eid = String(this._eventId);
  let mapId = $gameMap.mapId();
  // 检测是否为复制事件
  let event = $gameMap.event(this._eventId);
  if (event._sourceeventId) {
    eid = event._sourceeventId;
    mapId = event._sourceMapId;
  }

  const key = `MapEventDialogue${mapId}`;
  const table = window[key] || {};
  const entry = table[eid]?.[String(idx)];
  let textArray;

  if (subIdx !== undefined) {
    // 如果传了 subIdx，就取第二层
    const sub = entry?.[String(subIdx)];
    // 无论取到的是字符串还是对象，都要包成数组
    textArray = sub !== undefined ? [sub] : [];
  } else {
    // 原先的整体数组
    textArray = Array.isArray(entry) ? entry : [];
  }
  /* ---------- 如果没取到 & 未重试过 ---------- */
  if (textArray.length === 0) {
      textArray = ["\\c[10]Text missing — unable to display!",
      "The language you selected has not been fully translated yet.",
      "Please wait for a future update or switch back to the English version. "
    ];
  }
  // 附加居中效果转义字符		
  let template = "\\dac\\c[2]%TEXT%";
  textArray = textArray.map(t => template.replace("%TEXT%", t));
  // 调整文本排版
  const n = textArray.length;                 // 实际行数
  const py = n < 5 ? `${2*(5 - n)}0` : "15";       // 不足5行就上移，够5行固定15
  textArray[0] = `\\py[${py}]\\{` + textArray[0];
  chahuiUtil.multilingualCompatibleDisplayText.call(this, textArray, true);
};

// 妹妹气泡文字演出
Game_Interpreter.prototype.showChibiBubbleText = function (idx, extra = { x: 960, y: 400, time: 180 }) {

  const scene = SceneManager._scene;
  if (scene && scene._drill_GFTT_windowTank) {
    for (const w of scene._drill_GFTT_windowTank) {
      w._drill_destroyed = true;
    }
  }

  let eid = String(this._eventId);
  let mapId = $gameMap.mapId();
  // 检测是否为复制事件
  let event = $gameMap.event(this._eventId);
  if (event._sourceeventId) {
    eid = event._sourceeventId;
    mapId = event._sourceMapId;
  }

  const key = `MapEventDialogue${mapId}`;
  const table = window[key] || {};
  const entry = table[eid]?.[String(idx)];
  let textArray = Array.isArray(entry) ? [...entry] : [];

  if (textArray.length === 0) {
    textArray = ["Text missing — unable to display!"];
  }
  textArray[0] = "\\cc[#d2d2d1]\\dDCOG[1:0:0:0]" + textArray[0];
  let text = textArray.join();
  let typeId = 7;
  if (ConfigManager.language > 0) typeId = 8;
  $gameTemp.drill_GFTT_setBuffer(typeId, 7);
  $gameTemp.drill_GFTT_setStyle_context(text);
  $gameTemp.drill_GFTT_createByBuffer([extra.x, extra.y], extra.time);
  let waitTime = extra.time + 20;
  chahuiUtil.multilingualCompatibleDisplayText.call(this, [` \\w[${waitTime}]\\^`]);
};

// 抖动动画文本演出
Game_Interpreter.prototype.showMapEventShakeText = function (idx, subIdx, extraData = {}) {

  let eid = String(this._eventId);
  let mapId = $gameMap.mapId();
  // 检测是否为复制事件
  let event = $gameMap.event(this._eventId);
  if (event._sourceeventId) {
    eid = event._sourceeventId;
    mapId = event._sourceMapId;
  }
  if (extraData.setEventId) {
      eid = extraData.setEventId;
  }
  let key = `MapEventDialogue${mapId}`;
  if (extraData.specifiedKey) {
      key = extraData.specifiedKey;
  }
  const table = window[key] || {};
  const entry = table[eid]?.[String(idx)];
  let textArray;

  if (subIdx !== undefined) {
    // 如果传了 subIdx，就取第二层
    const sub = entry?.[String(subIdx)];
    // 无论取到的是字符串还是对象，都要包成数组
    textArray = sub !== undefined ? [sub] : [];
  } else {
    // 原先的整体数组
    textArray = Array.isArray(entry) ? entry : [];
  }

  /* ---------- 如果没取到 & 未重试过 ---------- */
  if (textArray.length === 0) {
      textArray = ["\\c[10]Text missing — unable to display!",
      "The language you selected has not been fully translated yet.",
      "Please wait for a future update or switch back to the English version. "
    ];
  }
  // 附加抖动效果转义字符	
  let extra = '';
  if (extraData.colorCode)  extra = extraData.colorCode;
  let template = `${extra}\\{\\dDCCE[文本[%TEXT%]:预设[11]]\\}`;
  textArray = textArray.map(t => t.replace("\\{", "")); // 兜底: 字符块效果内不能出现特定转义字符
  textArray = textArray.map(t => template.replace("%TEXT%", t));
  // 自动结束文本
  let length = textArray.length - 1;
  let waitTime = 240;
  if (extraData.waitTime)  waitTime = extraData.waitTime;  
  textArray[length] += `\\w[${waitTime}]\\^`;
  chahuiUtil.multilingualCompatibleDisplayText.call(this, textArray);
};

// 教程演出用的文本显示
Game_Interpreter.prototype.showTutorialText = function (idx, subIdx, extraData = {}) {

  // 修改对话框样式
  if ($gameSystem._drill_DOp_curStyle.id !== 8) {
      $gameSystem._drill_DOp_curStyle = JSON.parse(JSON.stringify(DrillUp.g_DOp_list[7]));
      $gameSystem._drill_DSk_messageStyleId = 3;
  }

  let key = "mapCommonEventDialogue";
  if (extraData.specifiedKey) key = extraData.specifiedKey;
  const table = window[key] || {};
  const entry = table?.[String(idx)];
  let textArray;

  if (subIdx !== undefined) {
    const sub = entry?.[String(subIdx)];
    // 通常取到的已经是数组结构，不能再嵌套数组
    textArray = sub !== undefined ? sub : []; 
  } else {
    // 原先的整体数组
    textArray = Array.isArray(entry) ? entry : [];
  }

  /* ---------- 如果没取到 & 未重试过 ---------- */
  if (textArray.length === 0) {
      textArray = ["\\c[10]Text missing — unable to display!",
      "The language you selected has not been fully translated yet.",
      "Please wait for a future update or switch back to the English version. "
    ];
  }

  // 附加抖动效果转义字符	
  let extra = '';
  if (extraData.colorCode)  extra = extraData.colorCode;
  if (extraData.faceSize)  extra += `\\fs[${extraData.faceSize}]`;
  // 407号公共事件的作弊码教程：MZ 会按消息窗口 innerRect 裁剪字符块，
  // 第一行从 y=0 向上飘浮时会被切掉。这里只把该教程改为轻微水平漂浮，
  // 保留动态演出且不改变其它教程、窗口尺寸或 DCCE 的全局行为。
  const isCheatCodeTutorial = String(idx) === "cheatCodeTutorial";
  let template = isCheatCodeTutorial
      ? `${extra}\\dDCCE[文本[%TEXT%]:左右震动:持续时间[9999]:周期[120]:震动幅度[3]]`
      : `${extra}\\dDCCE[文本[%TEXT%]:空中飘浮:持续时间[9999]:缓冲时间[0]:飘浮高度[20]:周期[120]:幅度[3]]`;
  textArray = textArray.map(t => t.replace("\\{", "")); // 兜底: 字符块效果内不能出现特定转义字符
  textArray = textArray.map(t => template.replace("%TEXT%", t));
  // 自动结束文本
  let length = textArray.length - 1;
  let waitTime = 240;
  if (extraData.waitTime)  waitTime = extraData.waitTime;  
  textArray[length] += `\\w[${waitTime}]`;

  let posX = extraData.posX ?? 960;
  let posY = extraData.posY ?? 540;
  $gameSystem._drill_DOp_curStyle['x_value'] = posX;
  $gameSystem._drill_DOp_curStyle['y_value'] = posY;  

  chahuiUtil.multilingualCompatibleDisplayText.call(this, textArray);
};

// 为防止坏档或读档失败而采取的措施
const _DM_extractSaveContents = DataManager.extractSaveContents;
DataManager.extractSaveContents = function (contents) {
  _DM_extractSaveContents.call(this, contents);
  if ($gameSystem) {
      $gameSystem.dailyAutoResetFlag =
      $gameSystem.dailyAutoResetFlag || {};
  }
  if (!$gameMap) return;
  $gameActors._data.forEach(actor => {
      if (actor) actor.initCustomMembers?.();   //  旧存档补全缺失的属性变量
  });  
  // 旧存档补全图片快捷变换的叠加变化容器
  if ($gameScreen && Array.isArray($gameScreen._pictures)) {
      for (const picture of $gameScreen._pictures) {
          if (picture && !Array.isArray(picture._drill_PSh_commandChangeTank)) {
              picture._drill_PSh_commandChangeTank = [];
          }
      }
  }
  /*
  // 清除子弹数据防止找不到函数索引报错
  $gameMap._mapBulletsQJ = {};
  $gameMap._mapBulletsNameQJ = {};
  $gameMap._mapBulletsQJLength = 0;
  */
  // 因多语言模块不写入存档，每次读档必须重新加载
  const allowMap = [3, 4, 6, 7, 11, 19, 20, 21, 24, 25, 38, 54, 66];
  const mapId = $gameMap.mapId();
  if (allowMap.includes(mapId)) {
      const key = 'MapEventDialogue' + mapId;
      if (!window[key]) {
          chahuiUtil.loadMapEventDialogue();
      }
  }
  // 初始化游玩时间统计
  let time = Math.round(performance.now());
  $gameSystem._startTime = time;

};

// 检测占位符标记
DataManager.checkPlaceholderExists = function (fileName = 'Map001.json') {
  // ① NW.js（PC）：用 Node fs，避免任何网络请求/404日志
  if (Utils.isNwjs && Utils.isNwjs()) {
    try {
      const fs = require('fs');
      const path = require('path');
      const base = path.dirname(process.mainModule.filename); // 游戏根目录（含 www）
      // 兼容两种目录结构：根/www/data 与根/data
      let p = path.join(base, 'www', 'data', fileName);
      if (!fs.existsSync(p)) p = path.join(base, 'data', fileName);
      return Promise.resolve(fs.existsSync(p));
    } catch (e) {
      // 极端情况下（被沙箱限制等）继续走回退逻辑
    }
  }

  // ② 安卓原生：AndroidSave.checkOrListStorage 查 APK assets（同步、准确、不走网络、不会挂起）。
  //   source="asset" → 查 www/ 下；文件存在返回 "true"，目录返回 JSON 数组，其它 "false"。
  if (window.AndroidSave && typeof AndroidSave.checkOrListStorage === 'function') {
    try {
      return Promise.resolve(AndroidSave.checkOrListStorage('asset', 'data/' + fileName) === 'true');
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  //  浏览器 / 其它环境兜底：用 fetch 探测（非安卓原生、且 resolveLocalFileSystemURL 不可用时）。
  //   ★为什么不用 httpRequest：它在安卓上对 ERR_CONNECTION_REFUSED 既不 resolve 也不
  //    reject、连 ontimeout 都不触发 → Promise 永久挂起 → 调用方 await/Promise.all 永不完成
  //    → shiroin_Scene_Boot_start 的 reloadLanguage 等后续流程永远跑不到。
  //   fetch 对连接被拒会可靠地 reject；再用 Promise.race 加一道硬超时，确保【一定】settle。
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };

    // 硬超时兜底：即使 fetch 因任何原因不回，4 秒后也强制返回 false
    const timer = setTimeout(() => done(false), 4000);

    try {
      fetch('data/' + fileName, { method: 'GET' })
        .then((r) => { clearTimeout(timer); done(!!(r && r.ok)); })
        .catch(() => { clearTimeout(timer); done(false); });
    } catch (e) {
      clearTimeout(timer);
      done(false); // fetch 同步抛出（或未定义）→ 安全返回 false
    }
  });
};

// 根据语言重置数据库信息
DataManager.updateLocalizedNames = async function () {

  // 检测到法语系统，提醒切换AZERTY键盘
  if (!Utils.isMobileDevice()) {
      const nav = navigator.language.toLowerCase();
      if (nav.includes('fr') && $gameSystem._drill_OKe_keyboard_ok.includes("z")) {
          let textArray = ["Système en français détecté. Si vous utilisez un clavier en disposition AZERTY,",
                           "le jeu adaptera automatiquement les touches de déplacement en ZQSD.",
                           "Voulez-vous appliquer ce changement immédiatement ?"];
          let text = textArray.join('\n');
          const ask = await confirm(text);
          if (ask) {
              DrillUp.drill_OKe_addStringInList($gameSystem._drill_OKe_keyboard_up, "z");
              DrillUp.drill_OKe_addStringInList($gameSystem._drill_OKe_keyboard_left, "q");
              $gameSystem._drill_OKe_keyboard_ok = DrillUp.drill_OKe_removeStringInList($gameSystem._drill_OKe_keyboard_ok, "z");
              $gameSystem._drill_OKe_keyboard_pageup = DrillUp.drill_OKe_removeStringInList($gameSystem._drill_OKe_keyboard_pageup, "q");
              $gameSystem._drill_OKe_keyboard_up = DrillUp.drill_OKe_removeStringInList($gameSystem._drill_OKe_keyboard_up, "w");
              $gameSystem._drill_OKe_keyboard_left = DrillUp.drill_OKe_removeStringInList($gameSystem._drill_OKe_keyboard_left, "a");
              $gameTemp.drill_OKe_keyboardKeys_RefreshData();
              $gameTemp.drill_OKe_keyboardKeys_RefreshMapper();
          }
      }
  }

  // 还原正常版本。玩家明确改名后，不再用平台/语言默认称呼覆盖存档中的名称。
  const hasCustomHeroineName = $gameSystem?._heroineNameCustomized === true;
  if (!hasCustomHeroineName &&
      (ConfigManager.isImouto || DrillUp.g_COSt_list[119]['context'] !== "Mio" || Utils.isOptionValid("test"))) {
      let heroineName = window.systemFeatureText.heroineName || "Imouto";
      $gameStrings.setValue(120, String(heroineName));
      $gameVariables.setValue(10, String(heroineName));
      $gameSwitches.setValue(332, true);
      let heroName = window.systemFeatureText.heroName || "onii-chan";
      $gameStrings.setValue(121, String(heroName));
  }
  const name = $gameStrings.value(120);
  // 妹妹名字格式
  DrillUp.g_DNB_nameBox_suffix = `\\fb\\cc[#ffdd46]${name}`;

  // 状态
  const sd = window.statesDescription || {};
  const states = $dataStates;
  for (let n = 1; n < states.length; n++) {
    const obj = states[n];
    if (!obj) continue;
    const entry = sd[obj.id] || {};
    let textArray = [];

    if (entry.subtitle && entry.subtitle.length >= 1 && entry.subtitle[0] !== "") {
        let subtitleArray = entry.subtitle;
        let template = "\\fi\\c[110]%TEXT%\\fr";
        subtitleArray = subtitleArray.map(t => template.replace("%TEXT%", t));
        textArray.push(...subtitleArray);
    }
    if (entry.description && entry.description.length >= 1 && entry.description[0] !== "") {
        let descriptionArray = entry.description;
        textArray.push(...descriptionArray);
    }
    obj.description = textArray.join("\n");
  }

  // 物品
  for (let i = 1; i < $dataItems.length; i++) {
      const desc = window.itemsDescription[String(i)];
      if (desc && desc.name) {
        $dataItems[i].name = desc.name.join();
      }
  }
  // 武器
  for (let i = 1; i < $dataWeapons.length; i++) {
      const desc = window.weaponsDescription[String(i)];
      if (desc && desc.name) {
        $dataWeapons[i].name = desc.name.join();
      }
  }
  // 装备
  for (let i = 1; i < $dataArmors.length; i++) {
      const desc = window.armorsDescription[String(i)];
      if (desc && desc.name) {
        $dataArmors[i].name = desc.name.join();
      }
  }

  function getLocalizedName(descObj, id) {
    const entry = descObj?.[String(id)];
    if (!entry?.name) return null;
    return typeof entry.name === 'string'
      ? entry.name
      : Array.isArray(entry.name) && entry.name.length
        ? entry.name.join('')
        : null;
  }

  function refreshNames(dataArray, descObj) {
    if (!Array.isArray(dataArray)) return;
    dataArray.forEach(item => {
      // —— 跳过空值或没有 baseItemId 的条目 —— 
      if (!item || item.baseItemId == null) return;

      const newName = getLocalizedName(descObj, item.baseItemId);
      if (newName) {
        item.name = newName;
      }
    });
  }

  refreshNames(DataManager._independentWeapons, window.weaponsDescription);
  refreshNames(DataManager._independentArmors, window.armorsDescription);
};

DataManager.convertTitleToImouto = function () {
    let rawTitle = window.systemFeatureText.gameTitle;
    let titleStr = Array.isArray(rawTitle) ? rawTitle.join("") : String(rawTitle);
    let newTitle = titleStr
        .replace(/少女/g, "妹妹")
        .replace(/彼女/g, "妹")
        .replace(/girl/gi, "Sister")
		    .replace(/девушкой/gi, "сестрой");
    window.systemFeatureText.gameTitle = [newTitle];
    /* 确保标记始终存在 */
    ConfigManager.isImouto = true; 
};

// 多语言资源清单
const LOCALE_RESOURCES = [
    ['dataSceneObjectDescriptionText', k => `sceneObjectDescriptionText_${k}.json`],
    ['mapCommonEventDialogue',         k => `MapCommonEventDialogue${k}.json`],
    ['systemFeatureText',              k => `systemFeatureText_${k}.json`],
    ['prototypeEventTemplate',         k => `MapEventDialogue${k}001.json`],
    ['skillDescription',               k => `skillDescription${k}.json`],
    ['itemsDescription',               k => `ItemsDescription${k}.json`],
    ['weaponsDescription',             k => `WeaponsDescription${k}.json`],
    ['armorsDescription',              k => `ArmorsDescription${k}.json`],
    ['statesDescription',              k => `statesDescription${k}.json`],
    ['achievementsLocale',             k => `AchievementsLocale_${k}.json`],
    ['gameTermsText',                  k => `GameTermsText${k}.json`],
];

// 批量加载某个 key 对应的全部本地化资源
const loadLocaleResources = (key, needTW) =>
    Promise.all(
        LOCALE_RESOURCES.map(([varName, fileNameOf]) =>
            extraJsonLoad(varName, `data/${key}/${fileNameOf(key)}`, undefined, needTW)
        )
    );

// 本地化方法
DataManager.reloadLanguage = async function (needSave = false, needTC) {
 
    // ==================== 配置项更新 ====================
    if (typeof needTC === "boolean") ConfigManager.needsTC = needTC;
 
    const curLang = ConfigManager.language;
    const needTW = curLang === 0 && (
        ConfigManager.needsTC ||
        _isTraditionalChineseLocale()
    );
 
    // 运行中切换语言必须等待默认字体，避免首批文本被回退字体永久绘入 Bitmap。
    await _applyLocalizedFontFace(curLang, needTW);

    // 标题界面的部分文本会主动使用像素字体；这里只预加载当前语言对应版本，
    // 不把它写入 DrillUp.g_DFF_fontFace，因此不会改变游戏的全局默认字体。
    const fusionFontFace = chahuiUtil.getFusionPixelFont(curLang);
    if (fusionFontFace) {
        await _loadRegisteredFont(fusionFontFace);
    }
 
    if (needSave) ConfigManager.save();
 
    const key = LANG_CODE[curLang] ?? "EN";
 
    // ==================== 先加载 systemFeatureText 兜底用 ====================
    await extraJsonLoad(
        'systemFeatureText',
        `data/${key}/systemFeatureText_${key}.json`,
        undefined,
        needTW
    );
 
    // ==================== systemFeatureText 加载成功后:刷新各类文本 ====================
    const sysText = window.systemFeatureText;
    if (sysText) {
        // 妹妹身份判定
        const raw = $gameVariables.value(10);
        const input = raw != null ? String(raw).toLowerCase() : "";
 
        let isImouto = IS_IMOUTO.some(keyword => input.includes(keyword.toLowerCase()));
        if (ConfigManager.isImouto || DrillUp.g_COSt_list[119]['context'] !== "Mio") {
            isImouto = true;
        }
        if (isImouto) DataManager.convertTitleToImouto();
 
        // 刷新音量设置文本
        $dataSystem.terms.messages.bgmVolume = sysText.BgmVolume;
        $dataSystem.terms.messages.bgsVolume = sysText.BgsVolume;
        $dataSystem.terms.messages.seVolume  = sysText.SeVolume;
 
        // 刷新自定义选项文本
        ConfigManager.customParams = null;
        ConfigManager.getCustomParams();
 
        // 刷新游戏标题
        DataManager.refreshGameTitle();
 
        // 控制台日志
        console.log(
            `%c🌸 ${document.title} 🌸`,
            `
                background: linear-gradient(90deg, #ffeaf3 0%, #ffb6d5 40%, #ff7aa2 70%, #e6457a 100%);
                color: #fff;
                font-weight: 800;
                font-size: 18px;
                padding: 6px 16px;
                border-radius: 12px;
                letter-spacing: 1.2px;
                font-family: 'Segoe UI', 'Noto Sans TC', sans-serif;
                text-shadow:
                    0 0 4px #ff7aa2,
                    0 0 8px #ff7aa2,
                    0 0 12px #e6457a,
                    0 0 18px #e6457a;
            `
        );
 
        if (window.nw?.Window) nw.Window.get().title = document.title;
    }
 
    // ==================== 刷新标题选项贴图 ====================
    const TITLE_BTN_NAMES = ['NEW_', 'LOAD_', 'SETTING_', 'CREDITS_', 'SUPPORT_', 'EXIT_'];
    const ext = window?.LANG_LOCALE?.[curLang]?.titleOpt ? String(curLang) : "2";
    DrillUp.g_TSc_command_button["btn_src"] = TITLE_BTN_NAMES.map(s => s + ext);
 
    // ==================== 字体使用格式调整(非汉字体系) ====================
    if (window.DrillUp && ![0, 1, 8, 12].includes(curLang)) {
        DrillUp.g_DOp_list[0]["x_value"] = 320;
    }
 
    // ==================== 当前地图对话刷新 ====================
    if ($gameMap && $gameMap.mapId() > 0) {
        const mark = `MapEventDialogue${$gameMap.mapId()}`;
        if (window[mark]) chahuiUtil.loadMapEventDialogue();
        chahuiUtil.clearOtherMapEventDialogueCache();
    }
 
    // ==================== 批量加载多语 JSON ====================
    // 非中文 → 先加载 EN 作为兜底
    if (curLang > 2 && curLang !== 12) {
        await loadLocaleResources('EN', needTW);
    }
    // 繁中需要以简中版作为兜底
    if (curLang === 12) {
        await loadLocaleResources('CN', needTW);
    }
    // 最后加载目标语言(覆盖兜底)
    await loadLocaleResources(key, needTW);
 
    // ==================== RPG事件模版刷新 ====================
    DataManager.loadSpawnMapData(1);
 
    if (needSave) {
        setTimeout(() => DataManager.updateLocalizedNames(), 500);
    }
    // 更新成就系统本地化记录
    setTimeout(() => DataManager.refreshAchievementsLocale?.(), 500);
    // 刷新建言显示
    QJ.AnsuzMsg.loadTables().then(() => {
        QJ.AnsuzMsg.respawnIfOnMap();
    });    
};

// 刷新游戏标题
DataManager.refreshGameTitle = function (extra = {}) {
  const raw = window.systemFeatureText?.gameTitle;
  if (!raw) return;

  const baseTitle = Array.isArray(raw) ? raw.join("") : String(raw);
  
  let ver = $dataSystem?.gameVersion;
  if (!ver) {
      const verData = chahuiUtil.getGameVersion?.();
      ver = (verData && verData.version) ? verData.version : " ERROR";
  }

  // Demo 版只标平台 DEMO（如 "Steam DEMO"），不显示 ver 段（getGameVersion 已在上面或更早写入 demoLabel）
  let finalTitle = $dataSystem.demoLabel ? `${baseTitle} ${$dataSystem.demoLabel}` : baseTitle +  ` ver${ver}`;
  if (extra.showPlaytime) {
    const playedTime = $gameSystem.truePlaytimeText(false, true);
    finalTitle += `    [PlayTime: ${playedTime}]`;
  }

  document.title = finalTitle;
  if (window.nw?.Window) nw.Window.get().title = finalTitle;
};

/*───────────────────────────────────────────────────────────────────
  为兼容更多语言，优先读取英语，然后覆盖正在选择的语言模块，可兼容未完成的文本
 *──────────────────────────────────────────────────────────────────*/
function extraJsonLoad(targetVar, url, { fallback = {} } = {}, needTW) {
  return new Promise(resolve => {
    const prev = window[targetVar] || fallback || {};
    url = universalUrl + url;

    httpRequest(url, {
      onload(xhr) {
        try {
          let text = xhr.responseText;
          const data = JSON.parse(text);
          window[targetVar] = deepMerge(prev, data);
        } catch (e) {
          console.warn(`[extraJsonLoad] JSON parse error in ${url}`, e);
          window[targetVar] = prev;
        }
        resolve(window[targetVar]);
      }
    }).catch(() => {
      console.warn(`[extraJsonLoad] Missing ${url} → keep previous`);
      resolve(prev);
    });
  });
};

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return patch;
  }

  const out = Object.assign({}, base);
  for (const key in patch) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;

    const baseVal = out[key];
    const patchVal = patch[key];

    if (isPlainObject(baseVal) && isPlainObject(patchVal)) {
      out[key] = deepMerge(baseVal, patchVal);
    } else {
      out[key] = patchVal;
    }
  }
  return out;
}

chahuiUtil.loadMapEventDialogue = async function (Specified, mapId, extra = {}) {

  let needTW = false;
  if (extra.needTW || ConfigManager.needsTC) needTW = true;

  if (!Specified) Specified = ConfigManager.language;

  let mapIdRaw = mapId ? mapId : $gameMap.mapId();                
  const mapIdPad = String(mapIdRaw).padStart(3, '0'); 
  const key = `MapEventDialogue${mapIdRaw}`;     

  // 小语种默认优先加载英语
  if (Specified > 2 && Specified !== 12) {
    await extraJsonLoad(key, `data/EN/MapEventDialogueEN${mapIdPad}.json`, {});
  }
  // 繁体中文适配
  if (Specified === 12) {
    await extraJsonLoad(key, `data/CN/MapEventDialogueCN${mapIdPad}.json`, {});
  }

  // ② 目标语言（可能缺）
  const ln = LANG_CODE[Specified] || "EN";
  await extraJsonLoad(key, `data/${ln}/MapEventDialogue${ln}${mapIdPad}.json`, undefined, needTW);

};

// 清空除当前地图外的所有 MapEventDialogueXXX 缓存
chahuiUtil.clearOtherMapEventDialogueCache = function(keepMapId) {
  keepMapId = (keepMapId != null) ? keepMapId : ($gameMap ? $gameMap.mapId() : 0);
  let keepKey = 'MapEventDialogue' + keepMapId;
  let re = /^MapEventDialogue\d+$/;

  for (let k in window) {
    if (!Object.prototype.hasOwnProperty.call(window, k)) continue;
    if (!re.test(k)) continue;
    if (k === keepKey) continue;

    try { delete window[k]; } catch (e) { window[k] = undefined; }
  }
};

// 动态变化状态描述文本
DataManager.changeDifferenceStateDescription = function (id, index) {
  const obj = $dataStates[id];
  const sd = window.statesDescription[String(id)]["variants"];
  const entry = sd[String(index)] || {};
  let textArray = [];

  if (entry.subtitle && entry.subtitle.length >= 1 && entry.subtitle[0] !== "") {
    let subtitleArray = entry.subtitle;
    let template = "\\fi\\c[110]%TEXT%\\fr";
    subtitleArray = subtitleArray.map(t => template.replace("%TEXT%", t));
    textArray.push(...subtitleArray);
  }
  if (entry.description && entry.description.length >= 1 && entry.description[0] !== "") {
    let descriptionArray = entry.description;
    textArray.push(...descriptionArray);
  }
  obj.description = textArray.join("\n");
};


/* 乱码混淆 */
(() => {

  /* ---------- 乱码字符池 ---------- */
  const POOLS = [
    [...'ｦｧｨｩｪｫｬｭｮｯﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓ'],
    [...'БГДЖЙЛПФЩЪЫЬ'],
    [...'ΔΞΠΣΦΨΩΘΛΓ'],
    [...'辟ｶ閠鯉ｼ悟叉萓ｿ蜿ｪ譏ｯ霑吝ｾｮ荳崎ｶｳ驕鍋噪谿句桃鬲費ｼ檎ｻ晞撼閭ｽ豁｣遑ｮ譏ｾ遉ｺ荳堺ｼ壻ｹｱ遐りｿ呎弍蝗蜃｡'],
    [...'莠ｺ謇閭ｽ霓ｻ譏灘小蜚､窶披霑吩ｸｪ鬘ｵ髱｢荳ｻ隕∫畑譚･隗ょｯ滉ｸ谿ｵ譁'],
    [...'餈嗘葵憿菟𢒰銝餉賣迤蝖格遬蝷箔堒銁蝻𣇉糓隞冊摮㛖泵銝'],
    [...'abcdefghijklmnopqrstuvwxyz'],
    [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
  ];

  function garbleOne(str) {
    let out = '';
    for (const ch of str) {
      if (/[\s]/.test(ch)) { out += ch; continue; }

      const pool = POOLS[Math.floor(Math.random() * POOLS.length)];
      out += pool[Math.floor(Math.random() * pool.length)];
    }
    return out;
  }

  /** garble(textOrArray) → 同类型乱码 */
  function garble(input) {
    return Array.isArray(input)
      ? input.map(s => garbleOne(String(s)))
      : garbleOne(String(input));
  }

  // 导出到全局
  if (typeof module !== 'undefined') module.exports = garble;
  else window.garble = garble;

})();

// 修改妹妹名称/改名
chahuiUtil.customizeImoutoName = async function (oldSave) {

  let textArray = window.systemFeatureText && window.systemFeatureText.renameCharacter;
  if (!textArray) textArray = ["I remember now—", "she is..."];

  if (oldSave) {
    switch (ConfigManager.language) {
      case 0:
        textArray.push("（请重新设定你对女主角的称呼！）");
        break;
      case 1:
        textArray.push("（ヒロインの呼び方をもう一度設定してください！）");
        break;
      case 2:
      default:
        textArray.push("(Please reassign how you refer to the heroine!)");
        break;
    }
  }
  let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");

  let ss = await prompt(text, $gameStrings.value(120));
  if (ss == null) {
    chahuiUtil.customizeImoutoName();
    return false;
  }
  //if ( ss != undefined ) {

  // 加权长度计算：汉字/假名算 2，其它算 1
  const weightedLength = str => {
    let len = 0;
    const reWide = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3040-\u309F\u30A0-\u30FF\uFF66-\uFF9F]/;
    for (const ch of str) {
      len += reWide.test(ch) ? 2 : 1;
    }
    return len;
  };
  // 超过 8 点位，重新输入
  if (weightedLength(ss) > 8 || weightedLength(ss) <= 0) {
    chahuiUtil.customizeImoutoName();
    return false;
  }

  // Game_System 会随存档保存，因此每个存档可以保留各自的玩家自定义名称。
  $gameSystem._heroineNameCustomized = true;
  $gameSwitches.setValue(332, true);
  $gameStrings.setValue(120, ss);
  $gameVariables.setValue(10, ss);
  DrillUp.g_DNB_nameBox_suffix = `\\fb\\cc[#ffdd46]${ss}`;

  /* 自动修改女主角认知 */
  const raw = $gameVariables.value(10);
  const input = raw != null ? String(raw).toLowerCase() : "";
  const isImouto = IS_IMOUTO.some(keyword =>
    input.includes(keyword.toLowerCase())
  );
  if (isImouto) {
    DataManager.convertTitleToImouto();
    /* 刷新游戏标题 */
    DataManager.refreshGameTitle({showPlaytime:true});
    /* 自动修改男主角认知 */
    let heroName = window.systemFeatureText.heroName || "onii-chan";
    $gameStrings.setValue(121, heroName);
    /* 解锁成就 */
    chahuiUtil.unlockSpecificAchievement("ItsMyImouto");
  } else {
    chahuiUtil.unlockSpecificAchievement("WhereIsImouto");
  }

  return true;
};


/* ===========================================================
 * 喵化工具（保留标点/空白/MV 转义码）
 * =========================================================== */

chahuiUtil.meowVariants = [
  ["Meow", 2], ["Meow~", 1],
  ["Mew", 2], ["Mew~", 1],
  ["Meo", 2], ["Meo~", 1],
  ["Miaow", 2], ["Miaow~", 1],
  ["meow", 2], ["meow~", 1],
  ["Nya", 2], ["Nya~", 1],
  ["mew", 2], ["mew~", 1]
];

chahuiUtil._pickMeow = function () {
  const list = this.meowVariants.map(v => Array.isArray(v) ? v : [v, 1]);
  const total = list.reduce((s, [, w]) => s + (w | 0 || 1), 0);
  let r = Math.random() * total;
  for (const [word, w0] of list) {
    const w = (w0 | 0) || 1;
    if ((r -= w) <= 0) return word;
  }
  return "Meow";
};

// 保护 MV 转义码（\X 或 \X[...]/\{ \} \! \. \| \> \< \^ 等）
chahuiUtil._protectEscapes = function (s) {
  const bucket = [];
  const escRE = /\\(?:[A-Za-z]+(?:\[[^\]]*\])?|[{}]|[.!><^|])/g;
  const marked = String(s ?? "").replace(escRE, m => {
    const key = `\uE000${bucket.length}\uE001`; // 私用占位
    bucket.push(m);
    return key;
  });
  return { marked, bucket };
};
chahuiUtil._restoreEscapes = function (s, bucket) {
  return s.replace(/\uE000(\d+)\uE001/g, (_, i) => bucket[+i] || "");
};


// 是否保留当前字符（标点/空白）
chahuiUtil._isKeepChar = function (ch) {
  // 空白（含全角空格）、常见中英文标点
  return /[\s\u3000,，.。!?！？:：;；'"“”‘’()（）\[【\]】{}《》「」<>·、…—\-–_]/.test(ch);
};

/** 单行喵化（超出直接截断，不换行） */
chahuiUtil.meowifyLineCapped = function (line, limit = 14) {
  const { marked, bucket } = this._protectEscapes(line);
  let out = "", visible = 0;

  for (let i = 0; i < marked.length; i++) {
    const ch = marked[i];

    // 碰到占位块（转义码）：整体保留且不计入上限
    if (ch === "\uE000") {
      const j = marked.indexOf("\uE001", i + 1);
      if (j === -1) break;                 // 理论不会发生：防御
      out += marked.slice(i, j + 1);
      i = j;
      continue;
    }

    // 已达上限：截断（不再写入任何内容）
    if (visible >= limit) break;

    // 生成本次 token
    const token = this._isKeepChar(ch) ? ch : this._pickMeow();

    out += token;
    visible += 1;                           // 转义不计数；标点/空白计数
  }
  return this._restoreEscapes(out, bucket);
};

/** 多行（数组）喵化：保持与原数组同长度 */
chahuiUtil.meowifyArrayCapped = function (arr, limit = 14) {
  return arr.map(line => this.meowifyLineCapped(String(line ?? ""), limit));
};
