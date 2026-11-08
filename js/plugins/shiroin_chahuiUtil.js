/*:
 * @plugindesc 
 * @author shiroin
 *
 * @help
 * 
 */
var chahuiUtil = chahuiUtil || {};

// 通用提醒红点：坐标原点为菱形中心，仅负责绘制和释放自身资源。
// 用法：const badge = chahuiUtil.createNoticeBadge({ size: 16, glow: true });
// 由所属界面 addChild，并管理 position、visible 和点击区域；随父容器销毁。
(() => {
  class NoticeBadge extends Sprite {
    constructor({ size = 18, glow = true } = {}) {
      super();
      // 先以四倍分辨率画圆角白边，再缩回实际尺寸，让小菱形的斜边也有抗锯齿。
      const resolution = 4;
      const extent = Math.ceil(size + 4);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = extent * resolution;
      const context = canvas.getContext('2d');
      context.scale(resolution, resolution);
      context.translate(extent / 2, extent / 2);
      context.rotate(Math.PI / 4);
      const side = (size - 1) / Math.SQRT2;
      const half = side / 2;
      const radius = side * 0.28;
      context.beginPath();
      context.moveTo(-half + radius, -half);
      context.arcTo(half, -half, half, half, radius);
      context.arcTo(half, half, -half, half, radius);
      context.arcTo(-half, half, -half, -half, radius);
      context.arcTo(-half, -half, half, -half, radius);
      context.closePath();
      context.fillStyle = '#f04457';
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.lineJoin = 'round';
      context.stroke();
      this._badgeBitmap = new Bitmap(extent, extent);
      this._badgeBitmap.context.imageSmoothingEnabled = true;
      this._badgeBitmap.context.imageSmoothingQuality = 'high';
      this._badgeBitmap.context.drawImage(canvas, 0, 0, extent, extent);
      this._badgeBitmap.baseTexture.update();
      const diamond = new Sprite(this._badgeBitmap);
      diamond.anchor.set(0.5);
      this.addChild(diamond);
      if (glow) {
        this._glow = new PIXI.filters.GlowFilter({
          distance: 10, outerStrength: 1.2, innerStrength: 0, color: 0xff536a, quality: 0.3
        });
        this.filters = [this._glow];
      }
    }

    destroy() {
      if (this._glow) {
        this.filters = null;
        const renderer = Graphics.app?.renderer;
        if (renderer?.shader?.shader === this._glow) renderer.shader.reset();
        this._glow.destroy();
        this._glow = null;
      }
      super.destroy();
      this._badgeBitmap.destroy();
      this._badgeBitmap = null;
    }
  }

  chahuiUtil.createNoticeBadge = function(options) {
    return new NoticeBadge(options);
  };
})();

QJ.MPMZ.bulletSaveFilter = function (bullet) {
  var gn = bullet._qjSaveInput && bullet._qjSaveInput.groupName;
  var name = Array.isArray(gn) ? gn[0] : gn;
  // 这些组不存档(自我重建的 HUD/时钟/文字等)
  var skip = ['gameTime', 'customText'];
  return skip.indexOf(name) === -1;   // 返回 false = 不存
};

function resetMessageWindow() {
        var messageWindow = SceneManager._scene._messageWindow;
		var cw = SceneManager._scene._messageWindow._choiceWindow;
        if (messageWindow) {
            messageWindow._textState = null;          // 重置文本状态
            messageWindow.close();                    // 关闭消息窗口
            $gameMessage.clear();                     // 清除游戏消息
            messageWindow.updatePlacement();          // 更新消息窗口位置
            messageWindow.contents.clear();           // 清除消息窗口内容

            // 重置输入等待状态
            messageWindow._showFast = false;
            messageWindow._lineShowFast = false;
            messageWindow.pause = false;
            messageWindow._pauseSkip = false;
            messageWindow._waitCount = 0;

            // 隐藏姓名框（如果存在）
            if (messageWindow._drill_DNB_nameWindow) {
                messageWindow._drill_DNB_nameWindow.deactivate();
                messageWindow._drill_DNB_nameWindow.hide();
            }
        }
         // 清空当前选项数据
        if (cw && cw.active) {
         $gameMessage._choices = [];
         // 关闭选项窗口，不触发回调
         cw.deactivate();
         cw.close();
        }		
		
}

// 获取版本号
chahuiUtil.getGameVersion = function () {

  function extractVerRaw(title) {
    if (!title) return "";
    // 允许：0.99B / 0.99.2 / 0.99.2+rev.0 / 0.99.2-beta.1+rev.0
    const re = /ver\s*[:：]?\s*([<\[\(\（\{])?\s*([A-Za-z0-9.+_-]+(?:\s+[A-Za-z0-9.+_-]+)*)\s*([>\]\)\）\}])?/i;
    const m = String(title).match(re);
    if (!m) return "";
    const l = m[1] || "";
    const r = m[3] || "";
    let v = (m[2] || "").trim();
    v = v.replace(/\s+/g, " ");
    return (l && r) ? (l + v + r) : v;
  }

  // Demo 标记可以直接放在标题末尾，不要求前置 "ver"。
  function extractDemoMarker(title) {
    if (!title) return "";
    const m = String(title).match(/<(?:demo|dlsite demo|itch demo|steam demo)>\s*$/i);
    return m ? m[0].trim() : "";
  }

  function stripVerFromTitle(title) {
    if (!title) return "";
    const s = String(title);
    const idx = s.search(/\bver\b/i);
    let out = (idx >= 0 ? s.slice(0, idx) : s);
    out = out.replace(/[\s\-\|\:\[\(\（]+$/g, "").trim();
    return out;
  }

  // 从 "0.99.2+rev.0" 提取：mainVersion="0.99.2", revision=0
  function splitRevision(verRaw) {
    const raw = String(verRaw || "").trim();
    if (!raw) return { mainVersion: "", revision: null };

    // 1) 抽 revision（只认 +rev.<int>）
    let revision = null;
    const mRev = raw.match(/\+[^ ]*?\brev\.(\d+)\b/i);
    if (mRev) revision = Number(mRev[1]);

    // 2) mainVersion = 去掉 build(+...) 部分；玩家只看主版本
    const mainVersion = raw.split("+")[0].trim();

    return { mainVersion, revision };
  }

  // demo 标记 → 显示用标签（窗口标题 / 标题画面版本号），保留平台便于区分是哪家的 demo
  function getDemoLabel(verRaw) {
    const labels = {
      "<demo>": "DEMO",
      "<dlsite demo>": "DLsite DEMO",
      "<itch demo>": "itch DEMO",
      "<steam demo>": "Steam DEMO"
    };
    return labels[String(verRaw || "").trim().toLowerCase()] || "";
  }

  // 读取标题源（兼容 MV / Cordova）
  const sysTitle = (window.$dataSystem && $dataSystem.gameTitle) ? String($dataSystem.gameTitle) : "";
  const docTitle = (typeof document !== "undefined" && document && document.title) ? String(document.title) : "";
  const rawTitle = sysTitle || docTitle || "";
  let isDemo = false;
  // 正式版解析 ver 段；Demo 版也允许直接使用末尾标记。
  const verRaw = extractVerRaw(rawTitle) || extractDemoMarker(rawTitle);
  const split = splitRevision(verRaw);
  // 平台
  const platform =
    (window.Utils && typeof Utils.isMobileDevice === "function" && Utils.isMobileDevice())
      ? "Android"
      : "PC";

  // 纯标题（不含 ver 段）
  let title = stripVerFromTitle(rawTitle) || rawTitle;

  // 把标题里解析到的版本写到 $dataSystem.gameVersion（供自动更新系统）
  const demoLabel = getDemoLabel(verRaw);
  $dataSystem.gameVersion = null;
  if (demoLabel) {
    let demoVer = "0.2.33";
    if (ConfigManager.harmonyMode) demoVer = "0.2.66";
    $dataSystem.gameVersion = demoVer;
    isDemo = true;
    $dataSystem.isDemo = true;
    $dataSystem.demoLabel = demoLabel;
    // 标题需要明确告诉玩家是 DEMO
    if (!/\bdemo\b/i.test(title)) title = (title + " " + demoLabel).trim();
  } else {
    // 非 demo：gameVersion 只保留主版本（不含 +rev）
    if (split.mainVersion) $dataSystem.gameVersion = split.mainVersion;
    // 把 revision 单独存起来方便报错定位
    $dataSystem.gameRevision = (split.revision != null ? split.revision : null);
  }

  const result = {
    version: split.mainVersion || "",   // 0.99.2
    revision: split.revision,           // 0
    platform,
    title,
    isDemo,
    demoLabel                           // "Steam DEMO"，非 demo 为 ""
  };

  // 缓存：有主版本才缓存（避免过早缓存空值）
  if (result.version) {
     chahuiUtil.getGameVersion = function () { return result; };
  }

  // 兜底：如果前面没有设置 gameVersion，但有 verRaw，就写入
  if (!$dataSystem.gameVersion && split.mainVersion) {
     $dataSystem.gameVersion = split.mainVersion;
  }

  return result;
};

// 将游戏版本号转换为数字
chahuiUtil.parseGameVersionNumber = function(verStr) {
  
  let end = 23.3;  
  if (verStr == null) return end;
  const ver = semver.parse(String(verStr).trim());
  if (!ver) return end;
  return ver.major * 100 + ver.minor;
};


// 把任意旧格式版本号规范化为 semver（"0.85" → "0.85.0"；空 / 未知 → "0.0.0"；demo → "0.1.0"）
chahuiUtil.normalizeVersionToSemver = function(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (!s) return "0.0.0";
  const low = s.toLowerCase();
  if (low === "demo" || low === "free demo") return "0.1.0";
  if (s === "<現在装備中>" || s === "<现在装备中>") return "0.0.0";
  if (window.semver && semver.valid(s)) return s;
  // 旧格式：取 major[.minor[.patch]]，缺位补 0
  const m = s.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return "0.0.0";
  return `${m[1] || "0"}.${m[2] || "0"}.${m[3] || "0"}`;
};

// 读档后立即修复可能被 JSON 序列化为 null 的战斗者数值。
// 必须早于 Game_Player.refresh() / $gameParty.refreshMembers() 执行。
chahuiUtil.sanitizeLoadedBattlerValues = function(gameActors) {
  const repairedBattlers = [];
  const actorData = gameActors && Array.isArray(gameActors._data)
      ? gameActors._data
      : [];
  const isValidBattlerValue = value =>
      typeof value === "number" && Number.isFinite(value);

  for (let actorId = 1; actorId < actorData.length; actorId++) {
      const target = actorData[actorId];
      if (!target || typeof target !== "object") continue;

      const repaired = [];
      if (!isValidBattlerValue(target._hp)) {
          const states = Array.isArray(target._states) ? target._states : [];
          target._hp = states.includes(1) ? 0 : 1;
          repaired.push("HP");
      }
      if (!isValidBattlerValue(target._mp)) {
          target._mp = 0;
          repaired.push("MP");
      }
      if (!isValidBattlerValue(target._tp)) {
          target._tp = 0;
          repaired.push("TP");
      }

      if (repaired.length > 0) {
          repairedBattlers.push({
              actorId: actorId,
              repaired: repaired.join(", "),
              hp: target._hp,
              mp: target._mp,
              tp: target._tp
          });
      }
  }

  if (repairedBattlers.length > 0) {
      console.warn("[读档兼容] 已修复非法的角色 HP / MP / TP：", repairedBattlers);
  }

  return repairedBattlers;
};


const _shiroinChahuiUtil_extractSaveContents = DataManager.extractSaveContents;
DataManager.extractSaveContents = function(contents) {
  _shiroinChahuiUtil_extractSaveContents.call(this, contents);
  chahuiUtil.sanitizeLoadedBattlerValues($gameActors);
};

// 玩家版本号检查/ 旧存档检查
chahuiUtil.playerOldSaveVersionCheck = function() {

  const latest = $dataSystem.gameVersion || chahuiUtil.getGameVersion()?.version || "0.0.0";
  const rawPlayerVersion = String($gameStrings.value(2) || "").trim();

  // 兜底：极旧存档可能从未初始化过 $gameStrings，先补齐
  if (rawPlayerVersion === "" || rawPlayerVersion === "<現在装備中>") {
      $gameStrings.drill_COSt_init?.();
  }

  const oldVer = chahuiUtil.normalizeVersionToSemver(rawPlayerVersion);
  const newVer = chahuiUtil.normalizeVersionToSemver(latest);

  // 存档版本高于游戏版本：玩家在把新版存档拿到旧版游戏里跑
  if (window.semver && semver.gt(oldVer, newVer)) {
      chahuiUtil.handleNewerSaveWarning({
        playerVersion: oldVer,
        rawPlayerVersion: rawPlayerVersion,
        currentVersion: newVer,
        rawCurrentVersion: latest
      });
    // 不覆写 $gameStrings.value(2)，保留存档原本的更高版本号
    if (!$gameStrings.value(3)) $gameStrings.setValue(3, rawPlayerVersion || latest);
    return false;
  }

  //  是匹配当前版本的正常存档
  if (!window.semver || !semver.gt(newVer, oldVer)) {
     // 仍然补齐"原始版本号"标记（仅在缺失时）
     if (!$gameStrings.value(3)) $gameStrings.setValue(3, rawPlayerVersion || latest);
     return false;
  }

  // 触发兼容方法，传入规范化与原始两份版本号
  chahuiUtil.handleOldSaveDataCompatibility({
    playerVersion: oldVer,
    rawPlayerVersion: rawPlayerVersion,
    currentVersion: newVer
  });

  // 覆写记录为当前游戏版本
  $gameStrings.setValue(2, latest);
  // 第一次跑兼容时，把"原始入坑版本"也存下来（之后不再覆盖）
  if (!$gameStrings.value(3)) $gameStrings.setValue(3, rawPlayerVersion || latest);

  return true;
};

// 对故意放入旧存档的玩家警告
chahuiUtil.handleNewerSaveWarning = function(opt) {
   opt = opt || {};
};

// 旧存档玩家数据修复
// opt = { playerVersion, rawPlayerVersion, currentVersion }
//   playerVersion    : 规范化后的旧存档版本号（semver，如 "1.0.2"）
//   rawPlayerVersion : 存档里写的原始字符串（可能是 "0.85" / "demo" 等老格式）
//   currentVersion   : 规范化后的当前游戏版本号
//
// 写新的兼容块时推荐两种写法：
//   阈值式（推荐，能覆盖所有早于该版本的存档）：
//     if (semver.lt(playerVersion, '1.0.3')) { ... }
//   精确式（仅对特定版本生效）：
//     if (opt.playerVersion === '1.0.2') { ... }
chahuiUtil.handleOldSaveDataCompatibility = function(opt) {	
   opt = opt || {};
   const actor = $gameParty.leader();
   const playerVersion = opt.playerVersion || "0.0.0";
   const lt = (v) => !!(window.semver && semver.lt(playerVersion, v));
   
   if (semver.lt(playerVersion, '0.95.0') && !$gameSwitches.value(333)) {
        // ---- 旧存档统一兼容处理 ----
        if (actor.isLearnedSkill(3) && !actor.isLearnedSkill(26)) { 
            actor.learnSkill(26); 
        }
            actor.learnSkill(18); 
            actor.learnSkill(21); 
        // 重置所有独立物品
        QJ.MPMZ.tl.fixedItemDataErrors();
        // 适配改名系统
        if (!$gameStrings.value(120)) {
            let name = DrillUp.g_COSt_list[119]['context'];
            $gameStrings.setValue(120, name);
        }
        if (!$gameStrings.value(121)) {
            let name = DrillUp.g_COSt_list[120]['context'];
            $gameStrings.setValue(121, name);
        }     
	    // 重置卡墙数组标记
	    $gameNumberArray.setValue(5,[254,255]);
	    // 重置UI框数据
	    $gameSystem.drill_GFV_initSysData(); 
	    // 修复星之门问题
	    $gameSystem.fixStarDoorInventoryLoss();      
    }
    
    if (semver.lt(playerVersion, '1.2.13')) {
        const mappings = [
            [9, "item"],
            [10, "weapon"],
            [11, "armor"]
        ];

        for (const [arrayId, type] of mappings) {
            const ids = $gameNumberArray.value(arrayId);
            if (!Array.isArray(ids) || ids.length === 0) continue;

            for (const id of ids) {
                $gameSystem.recordCollectedItem(type, id, { historical: true });
            }

            $gameNumberArray.setValue(arrayId, []);
        }      
    }
};
 
// 深渊地图集（存进 $gameNumberArray 99）：每日清理生成的敌人、雨天刷新采集物都只认这个列表
// 新游戏在下方初始化时写入；旧存档由 2 号公共事件「读档后演出」按此列表重刷
chahuiUtil.ABYSS_MAP_IDS = [5, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 22, 23, 26, 27, 28, 29, 30, 31, 32, 34, 35, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 68, 69, 70, 71];

// 新游戏初始化
chahuiUtil.newGameInitialization = function () {

    $gameSystem.time_system(false);
    $gameSystem.dailyAutoResetFlag = {};
    const current = $dataSystem.gameVersion || chahuiUtil.getGameVersion()?.version || "0.99.3";
    $gameStrings.setValue(2, current);
	// 标记原始版本号，该变量后期不可修改
	$gameStrings.setValue(3, current);
	chahuiUtil.resetSystemLanguageFlag?.();

    $gameNumberArray.setValue(1, []);  
    $dataWeapons.forEach(w => {
        if (w?.note?.includes("<颜色:13>")) {
            $gameNumberArray.value(1).push(w.id);
        }
    });

    $gameNumberArray.setValue(2, []);
    $dataArmors.forEach(a => {
        if (a?.note?.includes("<颜色:13>")) {
            $gameNumberArray.value(2).push(a.id);
        }
    });

    /* ---------- 玩家初始属性 ---------- */
    $gamePlayer._moveSpeed  = 8;
    $gamePlayer._throwPower = 5;
    $gameActors.actor(1).changeEquipById(1, 1);   // 为防止技能等级异常累加，不能初始自带武器

    /* ---------- 初始化深渊生成计数 ---------- */
    const abyss = chahuiUtil.ABYSS_MAP_IDS.slice();
    $gameNumberArray.setValue(99, abyss);
    abyss.forEach(mapIndex => {
        $gameSelfVariables.setValue([mapIndex, 1, 'rainyCreation'], 2);
		$gameSelfVariables.setValue([mapIndex, 1, 'maxFishing'], 1);
    });
	
};

// 检查事件变量是否合法
chahuiUtil.checkScriptExecutability = function () {
    let code = $gameStrings.value(20);
    if (code.includes("steupCEQJ")) {
        return true;
    } else {
        $gameStrings.setValue(20,"");
        return false;
    }
};

// 刷新游戏标题画面的动画演出
chahuiUtil.RefreshTitleScreenAnimation = function (type) {

   let animation = {
     "brushingTeeth": {background: 4, video: 1},
     "idleInDining": {background: 5, video: 2},
     "idleInBedroom0": {background: 2, video: 3},
	 "idleInBedroom1": {background: 2, video: 4},
	 "peekingBath": {background: 6, video: 0},
	 "peekingUndressing": {background: 7, video: 5},
	 "rubEyes": {background: 2, video: 6},
	 "hamburgerSteak": {background: 5, video: 7},
   };

   // 先取消所有背景图的显示
   for(var i=1; i < DrillUp.global_TBa_visibleTank.length; i++){
	   if (i === 20) continue;
       DrillUp.global_TBa_visibleTank[i] = false;
   }

   // 先取消所有视频的显示
   for(var i=0; i < DrillUp.global_TVi_visibleTank.length; i++){
       DrillUp.global_TVi_visibleTank[i] = false;
   }
   // 显示指定类型动画
   if (!animation[type]) return;
   let backgroundId = animation[type]["background"] - 1;
   DrillUp.global_TBa_visibleTank[backgroundId] = true;
   
   let videoId = animation[type]["video"] - 1;
   
   if (Utils.isMobileDevice()) {
	   if (videoId == 4) videoId = 3;
   }   
   
   if (videoId >= 0) {
      DrillUp.global_TVi_visibleTank[videoId] = true;
   }
   
   // 储存修改记录
   StorageManager.drill_TBa_saveData();
   StorageManager.drill_TVi_saveData(); 
};

// 解锁成就
chahuiUtil.unlockSpecificAchievement = function(name) {
    if (name == null) return false;

    $gameSystem.setupAchievs();
    SMO.AM.refreshDynamicData();

    const key = String(name).trim();
    if (!key) return false;

    let achievement = $gameSystem.achievement(key);

    if (!achievement) {
        const idByName = SMO.AM.getAchievementIdByName(key);
        if (idByName) achievement = $gameSystem.achievement(idByName);
    }

    if (!achievement && window.achievementsLocale && window.achievementsLocale.achievements) {
        const achievements = window.achievementsLocale.achievements;
        let localeEntry = achievements[key] || null;
        if (!localeEntry) {
            for (const cat in achievements) {
                if (!achievements.hasOwnProperty(cat)) continue;
                const group = achievements[cat];
                if (group && group[key]) {
                    localeEntry = group[key];
                    break;
                }
            }
        }
        const localeName = localeEntry && localeEntry.Name ? localeEntry.Name : '';
        if (localeName) {
            const id = SMO.AM.getAchievementIdByName(localeName);
            if (id) achievement = $gameSystem.achievement(id);
        }
    }

    if (!achievement) return false;

    if (achievement.isUnlocked()) {
        const dynamic = SMO.AM.ensureAchievDynamicDataById(achievement.id);
        const gameDate = dynamic.gameDate;
        const validGameDate = gameDate &&
            Number.isInteger(gameDate.day) && gameDate.day >= 1 &&
            Number.isInteger(gameDate.hour) && gameDate.hour >= 0 && gameDate.hour < 24 &&
            Number.isInteger(gameDate.minute) && gameDate.minute >= 0 && gameDate.minute < 60;

        if (!validGameDate) {
            dynamic.gameDate = {
                day: $gameSystem.day(),
                hour: $gameSystem.hour(),
                minute: $gameSystem.minute()
            };
            DataManager.saveGlobalAchievements();
        }
        return true;
    }

    achievement.unlock();
    return true;
};



// 介入修改好感度属性变动规则/ 变量值变动逻辑
Game_Interpreter.prototype.operateVariable = function(variableId, operationType, value) {
    try {
        var oldValue = $gameVariables.value(variableId);
        switch (operationType) {
        case 0:  // Set
            $gameVariables.setValue(variableId, oldValue = value);
            break;
        case 1:  // Add
		    if ([16,17,19,20].includes(variableId)) {
				value = chahuiUtil.preprocessImoutoStatsValue({variableId, value, isAdd:true});
			}
            $gameVariables.setValue(variableId, oldValue + value);
            break;
        case 2:  // Sub
		    if ([16,17,19,20].includes(variableId)) {
				value = chahuiUtil.preprocessImoutoStatsValue({variableId, value, isSub:true});
			}        
            $gameVariables.setValue(variableId, oldValue - value);
            break;
        case 3:  // Mul
            $gameVariables.setValue(variableId, oldValue * value);
            break;
        case 4:  // Div
            $gameVariables.setValue(variableId, oldValue / value);
            break;
        case 5:  // Mod
            $gameVariables.setValue(variableId, oldValue % value);
            break;
        }
    } catch (e) {
        $gameVariables.setValue(variableId, 0);
    }
};

chahuiUtil.preprocessImoutoStatsValue = function (extra = {}) {

    const Imouto = $gameActors.actor(2);
    let targetId = extra.variableId;
    let value = extra.value;
    if (targetId === 16) {
        // 紫色心情
        if (Imouto.isStateAffected(47)) {
            value *= 2;
        }
    }

    if (targetId === 17) {
        // 好感度
        if (Imouto.isStateAffected(44)) {
            value *= 2;
        }
    }	

	return value;
};


// 为场景物件绑定文本描述
chahuiUtil.bindDescriptionToSceneObjects = function (pid, index, extra={}) {
    
    if (extra.refresh) {
        let descData = window.dataSceneObjectDescriptionText;
        let raw = descData[String(index)];
        if (!raw) return '';
        let prefix = "\\fi\\c[110]";
        if (extra.isMobileDevice) prefix = "\\fs[24]\\fi\\c[110]";	
        let lines = raw.map(function(line) {
        if (!line.startsWith(prefix)) {
            return prefix + line;
        }
            return line;
        });
        return lines.join('\n');
    }

    if (!window.dataSceneObjectDescriptionText) {
        console.error("sceneObjectDescriptionText 数据未加载");
        return;
    }
    
	let isMobileDevice = Utils.isMobileDevice();
    let picture = $gameScreen.picture(pid);
	if (!picture) return;
    let offset = 0;
    const text = `chahuiUtil.bindDescriptionToSceneObjects(${pid}, ${index}, {refresh:true, isMobileDevice:${isMobileDevice}})`;
    const pixelPerfect = [8, 12].includes(index);
    Saikey.MPMZ.bindPicture(pid, text, {
        needEval: true,
        pixelPerfect,
        //background: "item_description",
        decoration: "Gemini_small",
        minWidth: 560,
        maxWidth: 560,
        minHeight: 180,
        maxHeight: 480,
        backgroundOffsetX: offset,
        backgroundOffsetY: offset,
        fontSize: 18
    });	
};

// 作弊码输入界面
chahuiUtil.enterCheatCode = async function (extra={}) {
    const text = $gameStrings.value(6);
    const placeholder = $gameStrings.value(7);
    const result = await prompt(text, "", {
        placeholder,
        extraButton: {
            text: "Tips",
            onClick: (ctx) => {
                // 点击弹出提示窗
                // 可选：调用 ctx.close(value) 来关闭对话框并让 await 返回 value
                // 不调用 close 则对话框保持打开
                ctx.close("__reset__");
                QJ.MPMZ.tl.generateSecretCodeDescription({popUp:true,backToInputScreen:true});
            }
        }
    });
    // 弹窗拦截了鼠标/触屏释放事件；同时清除原生和 Drill 的左键状态。
    TouchInput._mousePressed = false;
    TouchInput._screenPressed = false;
    TouchInput._pressedTime = 0;
    TouchInput._drill_COI_leftPressed = false;
    TouchInput._drill_COI_leftPressedTime = undefined;
    TouchInput._drill_COI_leftReleasedTime = undefined;
    TouchInput._drill_COI_leftDoubledTime = undefined;
    if (result != null) {   
        switch (result) {
            case "yes1mh0rny":
                $gameTemp.reserveCommonEvent(408);
                break;
            case "devTools":
                $gameTemp.reserveCommonEvent(396);
                break;	            
            case "hard2k1ll":
                $gameTemp.reserveCommonEvent(397);
                break;	
            case "get40rfree":
                $gameTemp.reserveCommonEvent(398);
                break;	
            case "1f0g0ty0u":
                $gameTemp.reserveCommonEvent(399);
                break;             
            case "6a1n60ld":
                $gameTemp.reserveCommonEvent(400);
                break;
            case "healmeplz":
                $gameTemp.reserveCommonEvent(401);
                break;	
            case "unshatter":
                $gameTemp.reserveCommonEvent(402);
                break;	
            case "60dpat":
                $gameTemp.reserveCommonEvent(403);
                break;            		       
            case "muestacz":
                $gameTemp.reserveCommonEvent(404);
                break;
            default:
                $gamePlayer.requestBalloon(8);
                break;	           		 
        }        
    }    
};

chahuiUtil.zakoModeDescription = function (extra={}) {
    let lang = ConfigManager.language;
    let lines = [
            "Enabling this mode will activate the ZAKO status marker.",
            "While in this state, you will take 20% less damage from enemies.",
            "It also affects Imouto's evaluation at home, and the save/load sound effects will change.",
            "If this interaction experience does not meet your expectations, please disable the feature at any time."
    ];
    switch (lang) {
        case 0: 
        case 12:
        lines = [
                "开启该模式后，将激活杂鱼状态标记。",
                "持有该状态时，受到攻击的伤害将降低20%，",
                "并影响在家里妹妹对其的评价，存读档音效也会变化。",
                "若此类互动体验不符合您的预期，请随时关闭该功能。"
            ];
        break;        
        case 1: 
        lines = [
                "このモードを有効にすると、",
                "「雑魚」ステータスフラグがアクティブになります。",
                "この状態では被ダメージが20%軽減されます。",
                "自宅での妹による評価に影響し、セーブ・ロード時のSEも変化します。",
                "これらの演出内容が期待に沿わない場合は、いつでも本機能を無効化してください。"
            ];
        break;   
    }
    if (!$gameSwitches.value(447)) return;
    alert (lines.join("\n"), { align: "left" });
};

chahuiUtil.resetAllSelfSwitchesForEvents = function (...eventIds) {
    let mapId = $gameMap._mapId;
    let selfSwitches = ["A", "B", "C", "D", "E"];

    eventIds.forEach(function(eventId) {
        selfSwitches.forEach(function(switchChar) {
            let key = [mapId, eventId, switchChar];
            $gameSelfSwitches.setValue(key, false);
        });
    });
};

chahuiUtil.changeSelfSwitchForEvent = function (eventId, switchCharToActivate) {
    let mapId = $gameMap._mapId;
    let selfSwitches = ["A", "B", "C", "D", "E"];

    selfSwitches.forEach(function(switchChar) {
        if (switchChar !== switchCharToActivate) {
            let key = [mapId, eventId, switchChar];
            $gameSelfSwitches.setValue(key, false);
        }
    });

    let keyToActivate = [mapId, eventId, switchCharToActivate];
    $gameSelfSwitches.setValue(keyToActivate, true);
};

chahuiUtil.checkSelfSwitchesForEvent = function (eventId) {
    let mapId = $gameMap._mapId;
    let selfSwitches = ["A", "B", "C", "D", "E"];
    let isActive = false;

    for (let i = 0; i < selfSwitches.length; i++) {
        let key = [mapId, eventId, selfSwitches[i]];
        if ($gameSelfSwitches.value(key)) {
            isActive = true;
            break;
        }
    }

    if (isActive) {
        selfSwitches.forEach(function(switchChar) {
            let key = [mapId, eventId, switchChar];
            $gameSelfSwitches.setValue(key, false);
        });
        return true;
    } else {
        return false;
    }
};


chahuiUtil.changesisterKao = function (eventId) {
    let Id = $gameVariables.value(36);
    let mapId = $gameMap._mapId;
    let selfSwitches = ["A", "B", "C", "D", "E"];

    selfSwitches.forEach(function(switchChar) {
        let key = [mapId, eventId, switchChar];
        $gameSelfSwitches.setValue(key, false);
    });
   
    if (Id >= 0 && Id < selfSwitches.length) {
        let key = [mapId, eventId, selfSwitches[Id]];
        $gameSelfSwitches.setValue(key, true);
    }
};

//预加载
Game_Map.prototype.chahuiPreloadPicture = function (Path, Id) {

    const folderPath = Path + "/";
    const selectedImages = QJ?.MPMZ?.tl?.preloadNSFWAnimationFrames?.[Id];

    if (selectedImages) {
        selectedImages.forEach(function(imageName) {
            ImageManager.loadPicture(folderPath + imageName);
        });
    }
};

// 哥哥蹲厕所
chahuiUtil.oniichanToiletTimeMonitor = function(extra={}) {

    if (extra.refresh) {
        let fixedHour     = this.data.Hour; 
        let fixedMinute   = this.data.Minute;
        let currentHour   = $gameSystem.hour();  
        let currentMinute = $gameSystem.minute();
        let currentTimeInMinutes = currentHour * 60 + currentMinute;  
        let fixedTimeInMinutes   = fixedHour * 60 + fixedMinute + 20;
        if (currentTimeInMinutes > fixedTimeInMinutes) {
            chahuiUtil.abortEventById(-1);
            $gameMap.event(3).steupCEQJ(3);
            this.setDead({t:['Time',0]});
        }        
        return;
    }

    let fixedHour   = $gameSystem.hour();  
    let fixedMinute = $gameSystem.minute();
    let listener = QJ.MPMZ.Shoot({
        groupName: ['oniichanToiletTime'],
        Hour: fixedHour,
        Minute: fixedMinute,
        existData: [ 
        ],
        moveF: [
            [15,60,chahuiUtil.oniichanToiletTimeMonitor,[{refresh:true}]]
        ]
    });     
};

chahuiUtil.getEventsAroundPlayer = function(range) {
    range = range || 2; 
    var playerX = $gamePlayer.x;
    var playerY = $gamePlayer.y;
    var eventIds = [];

    for (var y = playerY - range; y <= playerY + range; y++) {
        for (var x = playerX - range; x <= playerX + range; x++) {
            // 确保坐标在地图范围内
            if (x >= 0 && y >= 0 && x < $gameMap.width() && y < $gameMap.height()) {
                var events = $gameMap.eventsXy(x, y);
                if (events.length > 0) {
                    events.forEach(function(event) {
                        if (chahuiUtil.eventContainsComment(event, "canMove")) {
                            $gameNumberArray.value(20).push(event.eventId());
                        }
                    });
                }
            }
        }
    }
    return eventIds;
};

chahuiUtil.getEventsAroundEvent = function(eventID) {
	var event = $gameMap.event(eventID);
    var range = 2; 
    var XX = event.x;
    var YY = event.y;
    var eventIds = [];

    for (var y = YY - range; y <= YY + range; y++) {
        for (var x = XX - range; x <= XX + range; x++) {
            // 确保坐标在地图范围内
            if (x >= 0 && y >= 0 && x < $gameMap.width() && y < $gameMap.height()) {
                var events = $gameMap.eventsXy(x, y);
                if (events.length > 0) {
                    events.forEach(function(event) {
						var distance = $gameMap.event(eventID).calcDistance(event.eventId());
                        if (chahuiUtil.eventContainsComment(event, "<Money>") && distance < 32) {
                            event.requestBalloon(2);
                        }
                    });
                }
            }
        }
    }
};

chahuiUtil.eventContainsComment = function(event, comment) {
    var pages = event.event().pages;
    for (var i = 0; i < pages.length; i++) {
        var list = pages[i].list;
        for (var j = 0; j < list.length; j++) {
            var command = list[j];
            if ((command.code === 108 || command.code === 408) && command.parameters[0].includes(comment)) {
                return true;
            }
        }
    }
    return false;
};

chahuiUtil.getVarianceDamage = function(type,variance) {
	switch (type) {
	  case 1:		
	var baseDamage = $gameActors.actor(1).atk; 
	  break;
	  case 2:		
	var baseDamage = $gameActors.actor(1).mat; 
	  break;
	  case 3:		
	var baseDamage = Math.round(0.5 * $gameActors.actor(1).atk + 0.5 * $gameActors.actor(1).mat); 
	  break;
  }	
	variance = variance || 10;
    variance = variance / 100; 
    var minDamage = baseDamage * (1 - variance); 
    var maxDamage = baseDamage * (1 + variance); 
    var randomDamage = Math.random() * (maxDamage - minDamage) + minDamage; 
    return Math.round(randomDamage); 
};

// 魔法抗性减伤
chahuiUtil.magicDefenseDamageReduction = function(mdf) {
    const a = 1.65;
    const K = 167;

    // 幂运算
    const Ra = Math.pow(mdf, a);
    const Ka = Math.pow(K, a);

    // 减伤公式： R^a / (R^a + K^a)
	const reduction = Ra / (Ra + Ka);
    return Math.floor(reduction*100);    
};

chahuiUtil.getCharacterAngle = function(characterId) {
    var angle;
    var character;

    // 确定角色是玩家还是特定事件
    if (characterId === -1) {
        character = $gamePlayer; // 玩家
    } else if (characterId > 0) {
        character = $gameMap.event(characterId); // 指定事件
    } else {
        return $gamePlayer; 
    }

    // 获取角色的朝向
    switch (character.direction()) {
        case 2:  // 下
            angle = 180;
            break;
        case 4:  // 左
            angle = 270;
            break;
        case 6:  // 右
            angle = 90;
            break;
        case 8:  // 上
            angle = 0;
            break;
        case 1:  // 左下
            angle = 225;
            break;
        case 3:  // 右下
            angle = 135;
            break;
        case 7:  // 左上
            angle = 315;
            break;
        case 9:  // 右上
            angle = 45;
            break;
        default: 
            angle = 0;
            break;
    }

    return angle;
};


chahuiUtil.checkWeaponQuality = function(paramName) {
    var weaponId = $gameActors.actor(1).equips()[0].baseItemId; 
	var weapon = $dataWeapons[weaponId]; 
    if (weapon) {
        var notes = weapon.note.split(/[\r\n]+/); 
        var regex = new RegExp("<" + paramName + ":(\\d+)>"); 
        for (var i = 0; i < notes.length; i++) {
            var note = notes[i];
            var match = note.match(regex); 
            if (match) {
                return Number(match[1]); 
            }
        }
    }
    return 0; 
};

chahuiUtil.tsubamegaeshi = function() {
    let flat = 210;
    let angle = QJ.BL.calculateAngleByDirection($gamePlayer.direction())*180/Math.PI;
        angle += flat;
    return angle;
};

chahuiUtil.weightedRandom = function(baseWeights) {
    var numbers = [0, 1, 2, 3, 4, 5]; 
    if ($gameParty.leader().isLearnedSkill(50)) {
        baseWeights[0] = Math.max(baseWeights[0] - 10, 0);
        baseWeights[1] = Math.max(baseWeights[1] - 10, 0);
    }
    var totalWeight = baseWeights.reduce((acc, cur) => acc + cur, 0);
    var randomNum = Math.random() * totalWeight;
    var weightSum = 0;

    for (var i = 0; i < numbers.length; i++) {
        weightSum += baseWeights[i];
        if (randomNum < weightSum) {
            return numbers[i];
        }
    }
};

chahuiUtil.extendStateTime = function(stateId, time) {	
	stateId = stateId.toString();
	var extendTime = time.toString();
    if ($gameSystem._timeEvents) {
     let found = false; 
    $gameSystem._timeEvents.forEach(function(event) {
        if (event.command === "remove" && event.target === stateId) {
            event.minutes += time;
            found = true;
        }
    });
    if (!found) {
        var args = ['remove', extendTime, '100', stateId];
        $gameSystem.addTimeEvent(args);
        }
    } else {
    var args = ['remove', extendTime, '100', stateId];
    $gameSystem.addTimeEvent(args);
    }
};

chahuiUtil.adjustWeaponAngle = function(direction) {
    let ax = ($gamePlayer._realX + 0.5 - $gameMap.displayX()) * 48;
    let ay = ($gamePlayer._realY + 0.5 - $gameMap.displayY()) * 48;
    let bx = TouchInput.x / 2 + $gameMap.displayX();
    let by = TouchInput.y / 2 + $gameMap.displayY();
    let deg = QJ.BL.calculateAngleByTwoPoint(ax, ay, bx, by);
    deg = Math.round((deg * 180) / Math.PI);

    let minAngle, maxAngle;
    switch (direction) {
        case 8: // 上
            minAngle = 300;
            maxAngle = 60;
            break;
        case 4: // 左
            minAngle = 210;
            maxAngle = 330;
            break;
        case 6: // 右
            minAngle = 30;
            maxAngle = 150;
            break;
        case 2: // 下
            minAngle = 120;
            maxAngle = 240;
            break;
        default:
            return deg * (Math.PI / 180); // 如果方向无效，返回原始角度
    }

    // 将角度转换为 0-359 度范围内
    deg = (deg + 360) % 360;

    const angleDifference = (a, b) => {
        let diff = Math.abs(a - b);
        return Math.min(diff, 360 - diff);
    };

    // 处理跨越360°的情况
    if (minAngle > maxAngle) {
        if (deg >= minAngle || deg <= maxAngle) {
            return deg * (Math.PI / 180);
        }
    } else {
        if (deg >= minAngle && deg <= maxAngle) {
            return deg * (Math.PI / 180);
        }
    }

    // 计算到 minAngle 和 maxAngle 的最小距离
    let distanceToMin = angleDifference(deg, minAngle);
    let distanceToMax = angleDifference(deg, maxAngle);

    let adjustedAngle = (distanceToMin < distanceToMax) ? minAngle : maxAngle;
    return adjustedAngle * (Math.PI / 180);
};

chahuiUtil.findAttackStartingAngle = function(type) {
	var direction = $gamePlayer.direction();
    let minAngle, maxAngle;
    switch (direction) {
        case 8: // 上
            minAngle = 300;
            maxAngle = 60;
            break;
        case 4: // 左
            minAngle = 210;
            maxAngle = 330;
            break;
        case 6: // 右
            minAngle = 30;
            maxAngle = 150;
            break;
        case 2: // 下
            minAngle = 120;
            maxAngle = 240;
            break;
        default:
            return 0; 
    }
	if (type == 0) {
		return minAngle;
	} else if (type == 1){
	    return maxAngle;
	}
};

chahuiUtil.gachaWeightedCalculate = function(luk) {

    luk = Math.max(0, Math.min(luk, 999));

    let c, u, r, e, l;

    if (luk < 40) {
        let f = luk / 40;
        // 下限值: C=6500,U=2200,R=1000,E=300,L=0
        // 基准值: C=5000,U=2500,R=1500,E=800,L=200
        // 插值计算: (end - start)*f + start
        c = 6500 - 1500 * f;   // 6500→5000
        u = 2200 + 300 * f;    // 2200→2500
        r = 1000 + 600 * f;    // 1000→1600
        e = 300 + 550 * f;     // 300→850
        l = 0 + 50 * f;       // 0→50
    } else {
        let f = (luk - 40) / 959;
        // 基准值: C=5000,U=2500,R=1500,E=900,L=100
        // 上限值: C=2000,U=1200,R=3000,E=1900,L=1000
        c = 5000 - 3000 * f;   // 5000→2000
        u = 2500 - 1300 * f;   // 2500→1200
        r = 1500 + 1500 * f;   // 1500→3000
        e = 900 + 1900 * f;    // 900→2800
        l = 100 + 900 * f;    // 100→1000
    }

    c = Math.round(c);
    u = Math.round(u);
    r = Math.round(r);
    e = Math.round(e);
    l = Math.round(l);

    return [c, u, r, e, l];
};

chahuiUtil.getImoutoMoodReaction = function() {
	let kimochi = $gameVariables.value(20);
    kimochi = Math.max(0, Math.min(kimochi, 100));
    let c,u,r,e,l;

    if (kimochi <= 50) {
        let f = kimochi / 50.0;
        c = 40 - 20 * f; //40→20
        u = 30 - 10 * f; //30→20
        r = 20;          //20→20
        e = 5  + 15 * f; //5→20
        l = 5  + 15 * f; //5→20
    } else {
        let f = (kimochi - 50) / 50.0;
        c = 20 - 15 * f; //20→5
        u = 20 - 15 * f; //20→5
        r = 20;          //20→20
        e = 20 + 10 * f; //20→30
        l = 20 + 20 * f; //20→40
    }

    c = Math.round(c * 10);
    u = Math.round(u * 10);
    r = Math.round(r * 10);
    e = Math.round(e * 10);
    l = Math.round(l * 10);

    return [c,u,r,e,l];
};

chahuiUtil.gachaWeightedRandom = function(numbers = [1, 2, 3, 4, 5], weights = [50, 25, 15, 9, 1]) {
    
	// 扭蛋保底
	if ( $gameSelfSwitches.value([1, 32, 'pity']) ) {
		$gameSelfSwitches.setValue([1, 32, 'pity'], false);
		return 5;
	}
	
    // 计算总权重
    const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);

    // 生成一个在 0 和 totalWeight 之间的随机数
    const randomNum = Math.random() * totalWeight;

    // 根据权重分布返回一个数字
    let cumulativeWeight = 0;
    for (let i = 0; i < numbers.length; i++) {
        cumulativeWeight += weights[i];
        if (randomNum < cumulativeWeight) {
            return numbers[i];
        }
    }
};

chahuiUtil.gachaNumberRandom = function(input) {
	
	let inputValue = 0;
    let value      = 0;
    let minRange   = 100;
    let maxRange   = 500;
    // 投喂的是物品
	if (DataManager.isItem(input)) {
		inputValue = input.price;
		// 确认到投喂的是金钱道具
		if ([4,5,6,7,8,9,10,11,12].includes(input.id)) {
			let gachaCost = [1, 1, 'gachaCost'];
			let totalCost = [1, 1, 'totalCost'];
			$gameSelfVariables.setValue(gachaCost, $gameSelfVariables.value(gachaCost) + inputValue);
			$gameSelfVariables.setValue(totalCost, $gameSelfVariables.value(totalCost) + inputValue);
		}
		// 茶点心券
		if (input.id === 1) return 11;		
	} else if (isFinite(input)) {
		// 兼容旧逻辑
		inputValue  = input;
		if (inputValue === 11111) return 11;
	}
    
	
    while (inputValue >= minRange) {       
        let randomDecrement = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
        if (inputValue >= randomDecrement) {
            inputValue -= randomDecrement;
            value++;
        } else {
            break; 
        }
    }

    return value;
};

chahuiUtil.gachaRandomRocation = function (EID) {
    let event = $gameMap.event(EID);
    let condition = DrillUp.g_COFA_condition_list[10];
    var c_area = $gameMap.drill_COFA_getCustomPointsByIdWithCondition(EID, 7, condition);

    let xPlus, yPlus;

    if (c_area.length > 0) {
        var p = c_area[Math.floor(Math.random() * c_area.length)];
        if (p && typeof p.x === 'number' && typeof p.y === 'number') {
            // 确保 p 存在且 p.x 和 p.y 是有效的数值
            xPlus = p.x - event.x;
            yPlus = p.y - event.y;
        } else {
            // 如果 p 无效或 p.x/p.y 无法读取，则使用随机值
            xPlus = Math.randomInt(9) - 4;
            yPlus = Math.randomInt(9) - 4;
        }
    } else {
        // 如果 c_area 没有元素，则使用随机值
        xPlus = Math.randomInt(9) - 4;
        yPlus = Math.randomInt(9) - 4;
    }

    $gameMap.event(EID).jump(xPlus, yPlus);
    $gameMap.event(EID)._opacity = 255;
};

chahuiUtil.terminateSpecifiedEvents = function(events) {
	
var eventIds = events;
eventIds.forEach(function(eventId) {
    var event = $gameMap.event(eventId);
    if (event) {
        // 检查地图解释器是否在处理该事件
        if ($gameMap._interpreter._eventId === eventId) {
            if (typeof $gameMap._interpreter.terminate === 'function') {
                $gameMap._interpreter.terminate();
            }
            $gameMap._interpreter.clear();
        }
        // 检查事件自己的解释器是否在运行
        if (event._interpreter && event._interpreter.isRunning()) {
            if (typeof event._interpreter.terminate === 'function') {
                event._interpreter.terminate();
            }
            event._interpreter.clear();
        }
    }
});

// 关闭消息窗口并重置状态
var messageWindow = SceneManager._scene._messageWindow;
if (messageWindow) {
    messageWindow._textState = null;          // 重置文本状态
    messageWindow.close();                    // 关闭消息窗口
    $gameMessage.clear();                     // 清除游戏消息
    messageWindow.updatePlacement();          // 更新消息窗口位置
    messageWindow.contents.clear();           // 清除消息窗口内容
    // 重置输入等待状态
    messageWindow._showFast = false;
    messageWindow._lineShowFast = false;
    messageWindow.pause = false;
    messageWindow._pauseSkip = false;
    messageWindow._waitCount = 0;
}
   // 隐藏姓名框
    if (messageWindow._drill_DNB_nameWindow) {
        messageWindow._drill_DNB_nameWindow.deactivate();
        messageWindow._drill_DNB_nameWindow.hide();
    }
	
};

// 强制中断正在执行的事件
chahuiUtil.abortEventById = function(eventId) {
    // 获取调用该指令的当前事件 ID（支持串行或平行事件）
    var callerId = 0;
    if (this && typeof this.eventId === 'function') {
        callerId = this.eventId();
    } else if ($gameMap._interpreter && $gameMap._interpreter._eventId) {
        callerId = $gameMap._interpreter._eventId;
    }
    
    // 内部函数：重置消息窗口状态


    // 内部函数：终止事件的自定义解释器（新增运行模式）
    function terminateCommonEventQJ(interpreters) {
        if (!Array.isArray(interpreters) || interpreters.length === 0) return;

        // 只终止调用时已在队列中的解释器。不在 update() 调用栈内同步
        // 清空数组，否则 QJ-CoreMZ 返回后访问当前索引时会得到 undefined。
        var targets = interpreters.slice();
        targets.forEach(function(interpreter) {
            if (interpreter && interpreter.isRunning && interpreter.isRunning()) {
                if (typeof interpreter.terminate === 'function') {
                    interpreter.terminate();
                }
            }
        });

        // 当前 update() 调用栈结束后再移除旧解释器，保留期间新加入的解释器。
        Promise.resolve().then(function() {
            var targetSet = new Set(targets);
            for (var i = interpreters.length - 1; i >= 0; i--) {
                if (targetSet.has(interpreters[i])) interpreters.splice(i, 1);
            }
        });
    }

    // 如果传入的是数组，则逐个调用
    if (Array.isArray(eventId)) {
        eventId.forEach(function(id) {
            chahuiUtil.abortEventById(id);
        });
        return;
    }

    // eventId 为 -1 时，中断所有事件，但排除当前调用该指令的事件
    if (eventId === -1) {
        // 首先处理地图上所有标准事件
        $gameMap.events().forEach(function(event) {
            var id;
            if (event.page() && event.page().trigger > 2) { // 并行处理事件
                id = event._eventId;
            } else {
                id = event.eventId();
            }
            // 排除当前事件
            if (id === callerId) return;
            if (event.page() && event.page().trigger > 2) {
                $gameMap.eraseEvent(event.eventId());
            } else {
                if ($gameMap._interpreter && $gameMap._interpreter._eventId === id) {
                    if (typeof $gameMap._interpreter.terminate === 'function') {
                        $gameMap._interpreter.terminate();
                    }
                    $gameMap._interpreter.clear();
                }
            }
            // 同时终止该事件自定义的解释器（新增运行模式）
            if (event._commonEventQJ) {
                terminateCommonEventQJ(event._commonEventQJ);
            }
        });
        // 处理地图层新增的自定义解释器（例如公共事件模式）
        if ($gameMap._commonEventQJ) {
            terminateCommonEventQJ($gameMap._commonEventQJ);
        }
        resetMessageWindow();
        return;
    }

    // 单独处理指定的事件
    var event = $gameMap.event(eventId);
    if (!event) return;
    
    var id;
    if (event.page() && event.page().trigger === 4) { // 并行处理事件
        id = event._eventId;
    } else {
        id = event.eventId();
    }
    // 如果目标事件就是当前调用该指令的事件，则跳过
    if (id === callerId) return;
    
    if (event.page() && event.page().trigger === 4) {
        $gameMap.eraseEvent(event.eventId());
    } else {
        if ($gameMap._interpreter && $gameMap._interpreter._eventId === id) {
            if (typeof $gameMap._interpreter.terminate === 'function') {
                $gameMap._interpreter.terminate();
            }
            $gameMap._interpreter.clear();
        }
    }
    // 同时终止该事件自定义的解释器（新增运行模式）
    if (event._commonEventQJ) {
        terminateCommonEventQJ(event._commonEventQJ);
    }
    resetMessageWindow();
};

// 哥哥睡眠质量检测
chahuiUtil.oniichanSleepQualityCheck = function (extra = {}) {
  const oniichan = $gameParty.leader();
  const hasObsession = oniichan.hasArmor($dataArmors[129]) || oniichan._oniichanHasUpsetStomach;
  const isUnwell = oniichan.hpRate() < 0.3;

  let excitedRaw = Number($gameVariables.value(25) || 0);

  // 允许注入 RNG 方便做回归测试/录像复现
  const rng = (typeof extra.rng === "function") ? extra.rng : Math.random;

  // === 上床时间（触发该方法时捕获到的时间就是上床时间）===
  const hour = Number($gameSystem.hour() || 0);
  const minute = Number($gameSystem.minute() || 0);
  const bedTime = hour * 60 + minute;

  // 合法时间：18:00 ~ 23:00（仅含 23:00 整点）
  const legalStart = 18 * 60; // 1080
  const legalEnd   = 23 * 60; // 1380 (23:00)
  const isLegalBedtime = (bedTime >= legalStart) && (bedTime <= legalEnd);

  // 贤者模式（excited < 0）无条件不会醒，但仍然要走重置
  const isSageMode = excitedRaw < 0;

  // excited 规范化到 0~100（避免负数带入后续重置）
  let excited = Number.isFinite(excitedRaw) ? excitedRaw : 0;
  if (excited < 0) excited = 0;
  if (excited > 100) excited = 100;

  // 默认不会醒：所有“非法/贤者/和谐模式”等都通过 isAwake 统一控制
  let isAwake = false;
  let p = 0;

  if (!ConfigManager.harmonyMode && isLegalBedtime && !isSageMode) {
    // 上床越早（越接近18:00）=> 越容易醒；越接近23:00 => 越不容易醒
    // 18:00 -> 1, 23:00 -> 0
    const maxEarlyMinutes = legalEnd - legalStart; // 300
    const earlyMinutes = legalEnd - bedTime;       // 0..300
    const bedFactor = Math.max(0, Math.min(1, earlyMinutes / maxEarlyMinutes));

    // 原来的 excited 概率曲线
    const sigmoid = (x) => 1 / (1 + Math.exp(-x));
    const k = 0.13;

    const midNormal = 30;
    const midUnwell = 20;

    p = isUnwell
      ? sigmoid((excited - midUnwell) * k)
      : sigmoid((excited - midNormal) * k);

    if (isUnwell) p = Math.min(0.98, p * 1.20);

    // 上床时间加成：上床越早，p 放大越多；不适时放大更明显
    const bedBoostNormal = 1.5;
    const bedBoostUnwell = 0.45;
    const bedBoost = isUnwell ? bedBoostUnwell : bedBoostNormal;

    p = Math.min(0.98, p * (1 + bedBoost * bedFactor));

    const sleptPoorly = rng() < p;
    isAwake = hasObsession || sleptPoorly;
    // 调试用
    if (extra.debug) {
      return {
        isAwake,
        bedHour: hour, bedMinute: minute, bedTime,
        bedFactor,
        isLegalBedtime,
        isSageMode,
        isUnwell, excited,
        p, hasObsession,
        harmonyMode: ConfigManager.harmonyMode
      };
    }    
  } else {
    // 非法上床时间 / 贤者模式 / 和谐模式：无条件不会醒
    isAwake = false;

    if (extra.debug) {
      return  {
        isAwake,
        bedHour: hour, bedMinute: minute, bedTime,
        isLegalBedtime,
        isSageMode,
        isUnwell, excited,
        p,
        hasObsession,
        harmonyMode: ConfigManager.harmonyMode
      };
    }
  }

  // ===== 重置属性（确保一定执行）=====
  oniichan._oniichanHasUpsetStomach = undefined;
  $gameVariables.setValue(
    25,
    Math.min(hasObsession ? 20 : 1, excited + 2 + Math.randomInt(5))
  );
  return isAwake;
};

// 妹妹立绘组合
chahuiUtil.imoutoOutfitloading = function (posX, posY, extra = {}) {
  // 兼容旧写法
  if (typeof extra === 'boolean') extra = { bathTowel: extra };
  /*
  // ishadaka: 是否全果
  // bathTowel: 是否披浴巾（默认 false）
  // nightHour: 视为“犯困/夜晚”的起始小时（默认 21）
  // ahogeOffsetX: 呆毛相对X偏移（默认 +300）
  // pantiesName: 直接覆盖胖次贴图名（默认按装备判定）
  // nail: 指甲款式覆盖 0/1/2（默认读变量60，且做容错）
  // autoPin: 是否在末尾执行图层图钉绑定（默认 true）
  // pinTargetId: 绑定目标图片ID（默认 16）
  // ignoreBgCheck: 犯困判定时是否忽略背景1的名字包含判断（默认 false）
  // posFallback: 若 posX/posY 为空时的备选坐标 {x,y}（默认 1000,1600）
  // forceNemui: 是否强制引入犯困状态 true=必定犯困，false=必定清醒
  */
  const opt = Object.assign({
    ishadaka: false,
    bathTowel: false,
    nightHour: 21,
    ahogeOffsetX: 300,
    pantiesName: null,
    nail: null,
    autoPin: true,
    pinTargetId: 16,
    ignoreBgCheck: false,
    posFallback: { x: 1000, y: 1600 },
	forceNemui: undefined   
  }, extra || {});

  // ------  坐标处理 支持可选 posFallback ------
  if (!posX && posX !== 0) posX = (opt.posFallback && opt.posFallback.x) || 1000;
  if (!posY && posY !== 0) posY = (opt.posFallback && opt.posFallback.y) || 1600;
  const ahogeX = posX + (opt.ahogeOffsetX || 0);

  // ------  表情可继承  ------
  if (!$gameScreen.picture(16)) {
    $gameScreen.showPicture(16, "", 0, posX, posY, 100, 100, 255, 0);
  } else {
    const kao = $gameScreen.picture(16).name();
    $gameScreen.showPicture(16, kao, 0, posX, posY, 100, 100, 255, 0);
  } 
  // ------  和谐模式  ------  
  if (ConfigManager.harmonyMode) {
    $gameNumberArray.setValue(41, [11, 16, 20]);
    $gameScreen.showPicture(11, "mio_tachie_noKao", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(20, "mio_tachie_ahoge", 0, ahogeX, posY, 100, 100, 255, 0);
    for (let pictureId = 10; pictureId <= 20; pictureId++) {
        if ($gameNumberArray.value(41).includes(pictureId)) continue;
        $gameScreen.erasePicture(pictureId);
    }    
    return;
  }

  // ------  强制全果  ------ 
  if (opt.ishadaka || $gameMap.chahuiMapTemp?.ImoutoIsNaked) {
    $gameNumberArray.setValue(41, [10, 11, 16, 20]);
    $gameScreen.showPicture(10, "mio_tachie_ofuro_back", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(11, "mio_tachie_handpose2", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(20, "mio_tachie_ahoge", 0, ahogeX, posY, 100, 100, 255, 0);  
    return;
  }
  
  // ------  特殊版本：穿着泳装  ------ 
  if ($gameMap.chahuiMapTemp?.ImoutoInSwimsuit) {
      $gameNumberArray.setValue(41, [10, 12, 13, 15, 16, 17, 19, 20]);
      $gameScreen.showPicture(10, "mio_tachie_hair", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(12, "mio_tachie_nudepose3", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(13, "mio_tachie_whitebowBra", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(15, "mio_tachie_whitebowPanties", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(17, "mio_tachie_nudepose3_extra", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(19, "mio_tachie_bowknot", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(20, "mio_tachie_ahoge", 0, ahogeX, posY, 100, 100, 255, 0);
      if (extra.actionType === 'hideBodyWithHands') {
          // 用手遮挡身体
          $gameScreen.erasePicture(11);
          $gameScreen.showPicture(17, "mio_tachie_handpose2", 0, posX, posY, 100, 100, 255, 0);
          $gameScreen.changePictureName(12, "mio_tachie_nudepose0");
          $gameScreen.picture(17).drill_PLAZ_setZIndex( 15.5 );
      }       
      if (extra.actionType === 'handsOnHips') {
          // 叉腰动作
          $gameScreen.erasePicture(17);
          $gameNumberArray.value(41).push(11);
          $gameScreen.showPicture(11, "mio_tachie_handpose3", 0, posX, posY, 100, 100, 255, 0);
          $gameScreen.changePictureName(12, "mio_tachie_nudepose0");
          //$gameScreen.picture(13).drill_PLAZ_setZIndex( 10.5 );
      }
      if (extra.actionType === 'handsBehind') {
          // 手放在身后
          $gameScreen.erasePicture(17);
          $gameNumberArray.value(41).push(11);
          $gameScreen.showPicture(11, "mio_tachie_handpose4", 0, posX, posY, 100, 100, 255, 0);
          $gameScreen.changePictureName(12, "mio_tachie_nudepose0");
      }      
      return;
  } 

  // ------  妹妹与胖次判定（允许外部强制覆盖） ------
  const imouto = $gameActors.actor(2);
  let panties = imouto.equips()[1];
  panties = panties ? panties.baseItemId : 0;

  let pantiesName = opt.pantiesName; // 若传入则直接用
  if (!pantiesName) {
    switch (panties) {
      case 154: pantiesName = "mio_tachie_bluepanties"; break;
      case 155: pantiesName = "mio_tachie_pinkpanties"; break;
      case 156: pantiesName = "mio_tachie_whitepanties"; break;
      case 157: pantiesName = "mio_tachie_bandaid"; break;
      case 158: pantiesName = "mio_tachie_whitebowPanties"; break;
      case 160: pantiesName = "mio_tachie_bunnyDoodle"; break;
      case 161: pantiesName = "mio_tachie_whiteTights"; break;
      default:  pantiesName = ""; break;
    }
  }

  // ------ 共同的起始层 ------
  $gameScreen.showPicture(12, pantiesName, 0, posX, posY, 100, 100, 255, 0);
  // 小工具：犯困/夜晚判定（加可配置夜间小时与是否忽略背景校验）
  function isNemui() {
    if (opt.forceNemui === true)  return true;
    if (opt.forceNemui === false) return false;	  
    const late = imouto?.ImoutoAutonomousAI?.isGettingSleepy;
    if (opt.ignoreBgCheck) return imouto.isStateAffected(36) || late;
    const bg1 = $gameScreen.picture(1);
    const bgOK = !!(bg1 && bg1.name && bg1.name().includes("sister_room_night_fine"));
    return imouto.isStateAffected(36) || (late && bgOK) || opt.ignoreBgCheck;
  }

  //=============================================================================
  // 妹妹穿着护士服（state: 20）
  //=============================================================================
  if (imouto.isStateAffected(20)) {
    $gameNumberArray.setValue(41, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    $gameScreen.showPicture(10, "mio_tachie_hair", 0, posX, posY, 100, 100, 255, 0);

    $gameScreen.showPicture(11, "imoto_tachie/mio_tachie_body", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(13, "mio_tachie_handpose1", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(14, "imoto_tachie/mio_tachie_boobShake1", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(15, "mio_tachie_whiteTights", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(17, "imoto_tachie/mio_tachie_nurse_uniform0", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(18, "imoto_tachie/mio_tachie_nurse_cap", 0, posX, posY, 100, 100, 255, 0);

    $gameScreen.showPicture(19, "mio_tachie_bowknot", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(20, "mio_tachie_ahoge", 0, ahogeX, posY, 100, 100, 255, 0);
  }

  //=============================================================================
  // 妹妹穿着T恤（state: 23）
  //=============================================================================
  if (imouto.isStateAffected(23)) {
    $gameNumberArray.setValue(41, [10, 11, 12, 13, 14, 15, 16, 17, 19, 20]);
    $gameScreen.showPicture(10, "mio_tachie_hair", 0, posX, posY, 100, 100, 255, 0);

    if (isNemui()) {
      $gameScreen.showPicture(11, "imoto_tachie/mio_tachie_body", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(13, "imoto_tachie/mio_tachie_boobShake1", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(14, "mio_tachie_T-shirt_nemui", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(17, "mio_tachie_hand_nemui_extra", 0, posX, posY, 100, 100, 255, 0);
    } else {
      let nail = opt.nail != null ? opt.nail : $gameVariables.value(60);
      nail = [0, 1, 2].includes(nail) ? nail : 0; // 容错
      $gameScreen.showPicture(11, "imoto_tachie/mio_tachie_body", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(13, "mio_tachie_handpose1", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(14, "imoto_tachie/mio_tachie_boobShake1", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(15, "mio_tachie_T-shirt1", 0, posX, posY, 100, 100, 255, 0);
    }
    $gameScreen.showPicture(19, "mio_tachie_bowknot", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(20, "mio_tachie_ahoge", 0, ahogeX, posY, 100, 100, 255, 0);
  }

  //=============================================================================
  // 妹妹常态（穿外套）（state: 24）
  //=============================================================================
  if (imouto.isStateAffected(24)) {
    $gameNumberArray.setValue(41, [10, 11, 12, 13, 14, 15, 16, 19, 20]);
    $gameScreen.showPicture(10, "mio_tachie_hair", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(11, "mio_tachie_nudepose0", 0, posX, posY, 100, 100, 255, 0);

    const equip2 = imouto.equips()[2]?.baseItemId || 0;
    const equip3 = imouto.equips()[3]?.baseItemId || 0;

    $gameScreen.showPicture(13, equip3 === 153 ? "mio_tachie_pajamas2" : "", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(14, equip2 === 152 ? "mio_tachie_pajamas1" : "", 0, posX, posY, 100, 100, 255, 0);

    if (isNemui()) {
      const name = (equip3 === 0) ? "mio_tachie_coat_nemui" : "mio_tachie_coat_nemui_shortpants";
      $gameScreen.showPicture(15, name, 0, posX, posY, 100, 100, 255, 0);
      if ($gameScreen.picture(15) && $gameScreen.picture(15).drill_PLAZ_setZIndex) {
        $gameScreen.picture(15).drill_PLAZ_setZIndex(16.5);
      }
    } else {
      if (equip2 === 0 && equip3 === 0) {
        $gameScreen.showPicture(15, "mio_tachie_coat1", 0, posX, posY, 100, 100, 255, 0);
      } else if (equip2 === 0 && equip3 > 0) {
        $gameScreen.showPicture(15, "mio_tachie_coat1", 0, posX, posY, 100, 100, 255, 0);
      } else if (equip2 > 0 && equip3 === 0) {
        $gameScreen.showPicture(15, "mio_tachie_coat2", 0, posX, posY, 100, 100, 255, 0);
      } else {
        $gameScreen.showPicture(15, "mio_tachie_coat0", 0, posX, posY, 100, 100, 255, 0);
      }
    }

    if (extra.actionType === 'handsOnHips') {
        // 叉腰动作
        $gameScreen.changePictureName(15, "mio_tachie_handpose3_coat");
        $gameScreen.picture(15).drill_PLAZ_setZIndex( 10.5 );
    }
    if (extra.actionType === 'handsBehind') {
        // 手放在身后
        $gameScreen.changePictureName(15, "mio_tachie_handpose4_coat");
        $gameScreen.picture(15).drill_PLAZ_setZIndex( 10.5 );
    }
    if (extra.actionType === 'holdingOnigiri') {
        // 叉腰动作
        $gameScreen.changePictureName(15, "mio_tachie_coat_holdingOnigiri1");
        $gameScreen.picture(15).drill_PLAZ_setZIndex( 18 );
    }             
    $gameScreen.showPicture(19, "mio_tachie_bowknot", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(20, "mio_tachie_ahoge", 0, ahogeX, posY, 100, 100, 255, 0);
  }

  //=============================================================================
  // 妹妹洗澡中（state: 25）
  //=============================================================================
  if (imouto.isStateAffected(25)) {
    $gameNumberArray.setValue(41, [10, 11, 12, 13, 16, 20]);
    $gameScreen.showPicture(10, "mio_tachie_hair2", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(20, "mio_tachie_ahoge", 0, ahogeX, posY, 100, 100, 255, 0);

    if ($gameSelfSwitches.value([4, 10, 'B']) || !!opt.bathTowel) { // ← 兼容旧写法：bathTowel
      $gameScreen.showPicture(11, "mio_tachie_nudepose3", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(12, "mio_tachie_towel", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(13, "mio_tachie_nudepose3_extra", 0, posX, posY, 100, 100, 255, 0);
      if (extra.actionType === 'handsOnHips') {
         // 叉腰动作
         $gameScreen.changePictureName(11, "mio_tachie_nudepose0");
         $gameScreen.changePictureName(13, "mio_tachie_handpose3");
         $gameScreen.picture(13).drill_PLAZ_setZIndex( 10.5 );
      }
      if (extra.actionType === 'handsBehind') {
         // 手放在身后
         $gameScreen.changePictureName(11, "mio_tachie_nudepose0");
         $gameScreen.changePictureName(13, "mio_tachie_handpose4");
         $gameScreen.picture(13).drill_PLAZ_setZIndex( 10.5 );
      }      
    } else {
      $gameNumberArray.value(41).push(14);
      $gameScreen.showPicture(11, "mio_tachie_nudepose1_0", 0, posX, posY, 100, 100, 255, 0);

      const equip2b = imouto.equips()[2]?.baseItemId;
      const equip3b = imouto.equips()[3]?.baseItemId;
      $gameScreen.showPicture(13, equip3b === 153 ? "mio_tachie_pajamas2" : "", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(14, equip2b === 152 ? "mio_tachie_pajamas1" : "", 0, posX, posY, 100, 100, 255, 0);
    }
    if ($gameMap.chahuiMapTemp?.forceHadaka) {
        // 临时措施：强制全裸
        $gameScreen.showPicture(11, "mio_tachie_nudepose1_0", 0, posX, posY, 100, 100, 255, 0);
        $gameScreen.erasePicture(12);
        $gameScreen.erasePicture(13);
        $gameScreen.erasePicture(14);
    }
  }

  //=============================================================================
  // 妹妹洗澡后（state: 26）
  //=============================================================================
  if (imouto.isStateAffected(26)) {
    $gameNumberArray.setValue(41, [10, 11, 12, 13, 14, 16, 17, 19, 20]);
    $gameScreen.showPicture(10, "mio_tachie_hair", 0, posX, posY, 100, 100, 255, 0);

    if (isNemui()) {
      $gameScreen.showPicture(11, "mio_tachie_hand_nemui", 0, posX, posY, 100, 100, 255, 0);
      $gameScreen.showPicture(17, "mio_tachie_hand_nemui_extra", 0, posX, posY, 100, 100, 255, 0);
    } else {
      let nail2 = opt.nail != null ? opt.nail : $gameVariables.value(60);
      nail2 = [0, 1, 2].includes(nail2) ? nail2 : 0;
      $gameScreen.showPicture(11, `mio_tachie_nudepose1_${nail2}`, 0, posX, posY, 100, 100, 255, 0);
    }

    if (extra.actionType === 'handsOnHips') {
        // 叉腰动作
        $gameScreen.showPicture(11, "mio_tachie_nudepose0", 0, posX, posY, 100, 100, 255, 0);
        $gameScreen.showPicture(17, "mio_tachie_handpose3", 0, posX, posY, 100, 100, 255, 0);
        $gameScreen.picture(17).drill_PLAZ_setZIndex( 10.5 );        
    }
    if (extra.actionType === 'handsBehind') {
        // 手放在身后
        $gameScreen.showPicture(11, "mio_tachie_nudepose0", 0, posX, posY, 100, 100, 255, 0);
        $gameScreen.showPicture(17, "mio_tachie_handpose4", 0, posX, posY, 100, 100, 255, 0);
        $gameScreen.picture(17).drill_PLAZ_setZIndex( 10.5 );
    }     

    const equip2c = imouto.equips()[2]?.baseItemId;
    const equip3c = imouto.equips()[3]?.baseItemId;
    $gameScreen.showPicture(13, equip3c === 153 ? "mio_tachie_pajamas2" : "", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(14, equip2c === 152 ? "mio_tachie_pajamas1" : "", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(19, "mio_tachie_bowknot", 0, posX, posY, 100, 100, 255, 0);
    $gameScreen.showPicture(20, "mio_tachie_ahoge", 0, ahogeX, posY, 100, 100, 255, 0);
  }
  const picArray = $gameNumberArray.value(41);
  // ------ 图层图钉（可关闭） ------
  if (opt.autoPin) {
    const pinTo = opt.pinTargetId;
    (picArray || []).forEach(n => {
      if (n !== 16 && n !== 20) {
        const p = $gameScreen.picture(n);
        if (p && p.drill_PTh_bindPic) p.drill_PTh_bindPic(pinTo);
      }
    });
  }
  if ($gameMap.mapId() !== 4) return;
  for (let pictureId = 10; pictureId <= 20; pictureId++) {
       if (picArray.includes(pictureId)) continue;
       $gameScreen.erasePicture(pictureId);
  }    
};



//游戏时间流逝和自动进位
chahuiUtil.systemTimeProgression = function (time = 0, extra={}) {

    if (time === 0) return;	
    let text = ` \\fn[MPLUS2ExtraBold]\\cc[#b8b8b8]\\dDCOG[11:4:0:0]+${time} `;
    $gameTemp.drill_GFTT_createSimple( [1845, 63], text, 1, 6, 60 );	
    if (!extra.disableSE) {
        let randomSeArray = ["パパッ", "パッ", "ペタッ"];
        let randomSe = randomSeArray[Math.floor(Math.random() * randomSeArray.length)];	
        AudioManager.playSe({ name: randomSe, volume: 90, pitch: 100, pan: 0 });
    }
    // 这里之所以不直接使用原生的$gameSystem.add_minute方法是因为原生没有处理进位问题，超过60分钟将会重置回整点
    let currentHour = $gameSystem.hour();
    let currentMinute = $gameSystem.minute();
    currentMinute += time;

    if (currentMinute >= 60) {
        let extraHours = Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
        currentHour += extraHours;
    }  if (currentHour >= 24) {
        currentHour = currentHour % 24;  
        $gameSystem.add_day(1);
    }
    $gameSystem.set_hour(currentHour);
    $gameSystem.set_minute(currentMinute);  	
};

//妹妹小人按钮显示初始化
chahuiUtil.imoutoChibiButtonInitialization = function () {
    $gameSystem._drill_DCB_curStyle = 14;

    let style = [];
    style.push("button_touch2","button_talk","button_skinShip");
    /*
    if ($gameSystem.hour() < 20 && $gameSwitches.value(500)) {  //一起玩游戏
        style.push("button_game");
    } else if ( $gameSystem.hour() === 20 ) {  //去客厅看电视
        style.push("button_television");
    } else if ( $gameSystem.hour() > 20 && !$gameSwitches.value(31) ) { //洗澡
        style.push("button_bath");
    }
	*/
	if ( $gameSystem.hour() === 21 ) {  
	    style.push("button_bath");
	} else {
		if ($gameSystem.hour() < 23) {
		   style.push("button_television");
		}
	}
	// 给妹妹零花钱
	if ($gameSwitches.value(485)) {
		style.push("button_okozukai");
	}
    DrillUp.g_DCB_data[13].btn_src = style;
    DrillUp.g_DCB_data[13].x = 545;
    DrillUp.g_DCB_data[13].y = 445;    
    // 异常问题兜底: 非正常时间段强制重置
	let hour = $gameSystem.hour();
	if (hour < 17) {
		$gameSystem.set_hour(20);
		QJ.MPMZ.tl.showGameTimeAndDaysnew();
	}
   	
};

chahuiUtil.quickInteractionIconInitialize = function () {
    // 妹妹监听器初始化
    if ($gameMap.getGroupBulletListQJ("imoutoUtil").length === 0) {
        QJ.MPMZ.tl._imoutoUtilCheckInitialization(true);
    }

    const Buttons = SLGSceneFreeExploration.Buttons;
    const mapId = $gameMap.mapId();
    if (mapId !== 4) return;
    const common = {
        scale: Utils.isMobileDevice() ? 1.5 : 1,
        //anchor: [0.56, 0.55],
        screenSpace: true,

        visible: true,
        enabled: true,

        visibleCondition: "!$gameSwitches._data[46]",

        autoHide: true,
        hideDuringMessage: true,
        hideDuringEvent: true,
        showDuringChoice: false,
        disableDuringChoice: true,

        fadeFrames: 20,
        cooldownFrames: 30,
        updateDuringCooldown: true,

        clickSe: "ok",
        persist: true
    };

    // 逐个防重复，已注册的按钮不销毁、不重建
    const register = (id, config) => {
        if (Buttons.get(id)) return;

        Buttons.register(id, {
            ...common,
            ...config
        });
    };

    // 离开
    register("exitButton", {
        image: "imoutoUtil/button_exit",
        x: 315,
        y: 715,
        onClick:
            "$gameMap.steupCEQJ(48, 1, { exitFunction: true });"
    });

    // 睡觉
    register("sleepButton", {
        image: "imoutoUtil/button_sleep",
        x: 1528,
        y: 480,
        onClick:
            "$gameMap.event(24).steupCEQJ(1);"
    });

    // 喝茶：仅在尚未创建时检查开关
    if (!Buttons.get("teaButton") && $gameSwitches._data[493]) {
        register("teaButton", {
            image: "imoutoUtil/button_tea",
            x: 180,
            y: 610,
            onClick:
                "$gameMap.event(44).steupCEQJ(1);"
        });
    }

    // 回想：仅在尚未创建时检查版本，以及 placeholder 分类是否有可显示词条
    if (
        !Buttons.get("recallButton") &&
        !$dataSystem.isDemo &&
        ShiroinGallery.model.entries("placeholder").length > 0
    ) {
        register("recallButton", {
            image: "imoutoUtil/button_recall",
            x: 1330,
            y: 520,
            onClick:
                "$gameMap.steupCEQJ(42, 1);"
        });
    }

    // 公告按钮：方法内部已包含防重复和创建条件检查
    QJ.MPMZ.tl?._imoutoUtilGameAnnouncementIcon?.();

    // 公告按钮已注册时，补建日记本装饰
    setTimeout(() => {
        if (Buttons.get("AnnouncementIcon")) {
            const pictureId = 83;
            const pictureName = "sister_room_night_diary";

            if ($gameScreen.picture(pictureId)?.name() !== pictureName) {
                $gameScreen.showPicture(
                    pictureId, pictureName, 0,
                    1488, 644, 100, 100, 0, 0
                );

                $gameScreen.movePicture(
                    pictureId, 0,
                    1488, 644, 100, 100, 255, 0, 30
                );

                $gameScreen.picture(pictureId).drill_PLAZ_setZIndex(2);
            }
        }
    }, 500);
};


//读取妹妹的心之容器状态
chahuiUtil.imoutoHeartContainerInitialization = function () {
	
  /* 工具函数
     依据优先级结算心之容器状态
  */	
  function buildHeartDisplay({
    redCount,        
    purpleCount,     
    blackCount,     
    goldenCount,     
    whiteCount,      
    maxHearts = 7,
  }) {
    const HEART_EMPTY         = 0;
    const HEART_BLACK         = 1;
    const HEART_PURPLE        = 2;
    const HEART_RED           = 3;
    const HEART_WHITE         = 4;
    const HEART_GOLDEN        = 6;
    const HEART_GOLDEN_RED    = 7;
    const HEART_GOLDEN_PURPLE = 8;
    const HEART_GOLDEN_WHITE  = 9;

    // 红心转换为紫心
    const R   = Math.min(Math.max(0, redCount | 0), maxHearts);
    const P   = Math.min(Math.max(0, purpleCount | 0), R);
    const arr = new Array(maxHearts).fill(HEART_EMPTY);
    for (let i = 0; i < R; i++) arr[i] = HEART_RED;
    for (let i = 0; i < P; i++) arr[i] = HEART_PURPLE;

    // 黑心覆盖红、紫心
    const B = Math.min(Math.max(0, blackCount | 0), maxHearts);
    for (let i = 0; i < B; i++) {
      const t = arr[i];
      if (t === HEART_EMPTY || t === HEART_RED || t === HEART_PURPLE) {
        arr[i] = HEART_BLACK;
      }
    }

    // 金心优先度高于黑心，同化同槽位下其他心
    const G = Math.min(Math.max(0, goldenCount | 0), maxHearts);
    for (let i = 0; i < G; i++) {
      switch (arr[i]) {
        case HEART_EMPTY:
        case HEART_BLACK:
          arr[i] = HEART_GOLDEN;
          break;
        case HEART_RED:
          arr[i] = HEART_GOLDEN_RED;
          break;
        case HEART_PURPLE:
          arr[i] = HEART_GOLDEN_PURPLE;
          break;
        case HEART_WHITE:
          arr[i] = HEART_GOLDEN_WHITE;
          break;
        default:
          break;
      }
    }

    // 白心优先度高于黑心
    const W = Math.min(Math.max(0, whiteCount | 0), maxHearts);
    for (let i = 0; i < W; i++) {
      switch (arr[i]) {
        case HEART_GOLDEN:
        case HEART_GOLDEN_RED:
        case HEART_GOLDEN_PURPLE:
          arr[i] = HEART_GOLDEN_WHITE;
          break;
        case HEART_RED:
        case HEART_PURPLE:
          arr[i] = HEART_WHITE;
          break;
        case HEART_BLACK:
          arr[i] = HEART_EMPTY;
          break;
        default:
          arr[i] = HEART_WHITE;
          break;
      }
    }

    return arr;
  }
  
  
  /* 好感UI
     根据红心等级调整上限值
  */
  let max = 100 + ($gameVariables.value(15) * 100);
  let dataBind = $gameSystem._drill_GFV_bindTank[7];
  dataBind['slot_list'][0]['level_max'] = max;
  dataBind['commandParamChanged'] = true;

  /* 若满足红心转化条件
     则+1颗红心，清空好感度
  */
  if ($gameVariables.value(17) >= max) {
      //DrillUp.g_GFV_styleList[7].background_src  = 'friendship_bar_extra';
      //DrillUp.g_GFV_styleList[7].foreground_src  = 'friendship_bar_extra';	  	  
	  if ($gameVariables.value(15) < 7) {
        $gameVariables.setValue(15, $gameVariables.value(15) + 1);
        $gameVariables.setValue(17, 0);
        AudioManager.playSe({ 
            name: "032myuu_YumeSE_MassagePositive01", 
            volume: 70, 
            pitch: 100, 
            pan: 0 
        });
		//$gameScreen._particle.particleSet(0,'hearts_sp','screen');
        //$gameScreen._particle.particleUpdate(['hearts_sp','scale',"0","1@0.5","0.1@1.5","0"]);
        //$gameScreen._particle.particleUpdate(['hearts_sp', 'color', '#f4244b']);	

		let textArray = window.mapCommonEventDialogue && window.mapCommonEventDialogue.gainRedHeart;
		if (!textArray) textArray = {0:[" Heart Blooming "], 1:[" \\str[120]’s heart just skipped a beat! "]};
		let font     = "KazukiReiwa";
		let waitTime = 1;
        if (!chahuiUtil.checkFontLoaded(font)) {
			waitTime = 800;
			Graphics._createFontLoader(font);
			Graphics._createFontLoader("Kaisei Decol");
		}
		setTimeout(() => {
			const wb = new Window_Base(0, 0, 0, 0);
			chahuiUtil.gainAchievementFullscreenEffect({
				text1: wb.convertEscapeCharacters(textArray[0].join()),
				text2: wb.convertEscapeCharacters(textArray[1].join()),
				fileName: "imoutoUtil/GainHeartShowEffect",
				fontFace: "KazukiReiwa",
			});
        }, waitTime);		
	 } else {
       // 满红心
       chahuiUtil.unlockSpecificAchievement("MyImoutoIsJustThatCute"); 
     }
  }    /* else {
      DrillUp.g_GFV_styleList[7].background_src  = 'friendship_bar';
      DrillUp.g_GFV_styleList[7].foreground_src  = 'friendship_bar';	  
  }
  */
  
  /* 若满足紫心转化条件
     则转化一颗红心
  */
  // 红心不足时无法发生紫心转化
  if ($gameVariables.value(16) >= 100 && $gameVariables.value(15) <= $gameVariables.value(18)) {
      $gameVariables.setValue(16, 99);
	  
  }
  // 紫心转化
  if ($gameVariables.value(16) >= 100 && $gameVariables.value(15) >= 1) {
        let curPurple = $gameVariables.value(18) + 1;
        if (curPurple > 7) curPurple = 7;  // 紫心最大7颗
        $gameVariables.setValue(18, curPurple);
        $gameVariables.setValue(16, 0);
        AudioManager.playSe({ 
            name: "039myuu_YumeSE_FukidashiHeart01", 
            volume: 80, 
            pitch: 90, 
            pan: 0 
        });
		
		$gameParty.leader().learnSkill(6);
		/*
		let textArray = window.mapCommonEventDialogue && window.mapCommonEventDialogue.gainPurpleHeart;
		if (!textArray) textArray = [" Heart Blooming ", " \\str[120]’s heart just skipped a beat! "];
		let font     = "KazukiReiwa";
		let waitTime = 1;
        if (!chahuiUtil.checkFontLoaded(font)) {
			waitTime = 500;
			Graphics._createFontLoader(font);
		}
		setTimeout(() => {
			const wb = new Window_Base(0, 0, 0, 0);
			chahuiUtil.gainAchievementFullscreenEffect({
				text1: wb.convertEscapeCharacters(textArray[0].join()),
				text2: wb.convertEscapeCharacters(textArray[1].join()),
				fileName: "imoutoUtil/GainHeartShowEffect",
				fontFace: "KazukiReiwa",
			});
        }, waitTime);			
		*/
  }
  
  /*  开始结算心之容器状态     */  
  const redHeartCount    = Math.min(7, $gameVariables.value(15));
  const purpleHeartCount = Math.min(7, $gameVariables.value(18));
  const blackHeartCount  = Math.min(7, $gameSelfVariables.value([1, 2, 'darkeningLevel']));
  const goldenHeartCount = chahuiUtil.calculateImoutoBriberyLevel();
  const oldwhiteHeart    = $gameSelfVariables.value([1, 2, 'whiteHeart']);
  const chitsuNaiRyo     = $gameSelfVariables.value([1, 2, 'chitsuNaiRyo']);
  const whiteHeartCount  = Math.min(7, Math.round( chitsuNaiRyo / 15 ));

  const maxHearts = 7;

  const hearts = buildHeartDisplay({
    redCount:    redHeartCount,
    purpleCount: purpleHeartCount,
    blackCount:  blackHeartCount,
    goldenCount: goldenHeartCount,
    whiteCount:  whiteHeartCount,
    maxHearts,
  });

  // 最后拼接成显示用的格式
  const heartDisplayValue = parseInt(hearts.join(''), 10);
  $gameVariables.setValue(34, heartDisplayValue);
  
  // 记录已获得的心数量
  $gameSelfVariables.setValue([1, 2, 'blackHeart'],   blackHeartCount);
  $gameSelfVariables.setValue([1, 2, 'goldenHeart'],  goldenHeartCount);
  $gameSelfVariables.setValue([1, 2, 'whiteHeart'],   whiteHeartCount);
  
  if (whiteHeartCount > oldwhiteHeart && chitsuNaiRyo < 105) {
		// 获得了新的白心全屏演出	 
		let textArray = window.mapCommonEventDialogue && window.mapCommonEventDialogue.gainWhiteHeart;
		if (!textArray) textArray = {0:[" Overflowing Love "], 1:[" She was filled up! "]};
		let font     = "KazukiReiwa";
		let waitTime = 1;
		if (!chahuiUtil.checkFontLoaded(font)) {
			waitTime = 500;
			Graphics._createFontLoader(font);
			Graphics._createFontLoader("Kaisei Decol");
		}
		setTimeout(() => {
			AudioManager.playSe({ 
				name: "039myuu_YumeSE_FukidashiHeart01", 
				volume: 80, 
				pitch: 90, 
				pan: 0 
			});	
			const wb = new Window_Base(0, 0, 0, 0);
			chahuiUtil.gainAchievementFullscreenEffect({
				text1: wb.convertEscapeCharacters(textArray[0].join()),
				text2: wb.convertEscapeCharacters(textArray[1].join()),
				fileName: "imoutoUtil/GainHeartShowEffect",
				fontFace: "KazukiReiwa",
			});
		}, waitTime);	
				
  }
};

// 金心相关计算
chahuiUtil.calculateImoutoBriberyLevel = function(extra = {}) {
	
	 const briberyAmountRange = [500, 1500, 3500, 7500, 15500, 31500, 63500];
	
	 // 每日重置
	 if (extra.dailyRefresh) {
		 // 临时逻辑，白心也放这里
		 let whiteValue = $gameSelfVariables.value([1, 2, 'chitsuNaiRyo']);
		 whiteValue    -= 20 + Math.randomInt(10);
		 whiteValue     = Math.max(0, whiteValue);
		 $gameSelfVariables.setValue([1, 2, 'chitsuNaiRyo'], whiteValue);
		 
		 let level     = Math.min(7, $gameSelfVariables.value([1, 2, 'briberyLevel']));
		 if (level    == 0) return;
		 level    -= 1;
         // 如果还残留金心，保留对应的贿赂金额
         let index   = level - 1;
         let amount  = briberyAmountRange[index] || 0;
         $gameSelfVariables.setValue([1, 2, 'briberyAmount'], amount); 		 		 
		 $gameSelfVariables.setValue([1, 2, 'briberyLevel'], level);
		 return;
	 }
	 // 刷新金心相关数据
	 const oldLevel           = $gameSelfVariables.value([1, 2, 'briberyLevel']);
	 const briberyAmount      = $gameSelfVariables.value([1, 2, 'briberyAmount']);
     let   briberyLevel       = 0; 
     for (let i = 0; i < briberyAmountRange.length; i++) {
       if (briberyAmount >= briberyAmountRange[i]) {
           briberyLevel = i + 1;
         } else {
           break;
         }
     }
	 $gameSelfVariables.setValue([1, 2, 'briberyLevel'], briberyLevel);
	 if ((briberyLevel > oldLevel) && $gameSelfVariables.value([1, 2, 'deposit']) < 70000) {
		 // 获得了新的金心全屏演出
			let textArray = window.mapCommonEventDialogue && window.mapCommonEventDialogue.gainGoldenHeart;
			if (!textArray) textArray = {0:[" Golden Lust "], 1:[" Lost in a sea of gold "]};
			let font     = "KazukiReiwa";
			let waitTime = 1;
			if (!chahuiUtil.checkFontLoaded(font)) {
				waitTime = 500;
				Graphics._createFontLoader(font);
				Graphics._createFontLoader("Kaisei Decol");
			}
			setTimeout(() => {
				AudioManager.playSe({ 
					 name: "コイン（ジャラジャラザクザクザザー", 
					 volume: 90, 
					 pitch: 100, 
					 pan: 0 
				});
				const wb = new Window_Base(0, 0, 0, 0);
				chahuiUtil.gainAchievementFullscreenEffect({
					text1: wb.convertEscapeCharacters(textArray[0].join()),
					text2: wb.convertEscapeCharacters(textArray[1].join()),
					fileName: "imoutoUtil/GainHeartShowEffect",
					fontFace: "KazukiReiwa",
				});
			}, waitTime);		 
	 }
	 return briberyLevel;
};

// 全屏成就演出
chahuiUtil.gainAchievementFullscreenEffect = function(extra = {}) {

  const waitTime = extra.waitTime ?? 60;
  const duration = extra.duration ?? 210;
  // 贴图和文字共用入场、停留、退场时间；短演出按比例压缩淡入。
  const fadeIn = Math.min(60, Math.floor(duration * 2 / 3));
  const fadeOut = Math.min(30, duration - fadeIn);
  const hold = duration - fadeIn - fadeOut;
  const opacityCurve = peak => `0|0~${fadeIn}/${peak}~${hold}|${peak}~${fadeOut}/0~30|0`;
  const opacity = opacityCurve(1);
  // 数值控制文字亮度；旧的自定义透明度曲线仍可直接传入。
  const textOpacity = typeof extra.opacity === 'string'
    ? extra.opacity : opacityCurve(extra.opacity ?? 1);
  const startScale = extra.startScale ?? 0.85;
  const textScale = `0|${startScale}~${fadeIn}/1~${duration + 30}|1`;
  
  // 黑色遮罩只淡入淡出，不参与缩放。
  QJ.MPMZ.Shoot({
      img: "blackk",
      position: [['S', 0], ['S', 0]],
      initialRotation: ['S', 0],
      imgRotation: ['F'],
      opacity: opacityCurve(0.5),
      moveType: ['S', '0'],
      z: extra.z ?? 'A',
      scale: 10,
      onScreen: true,
      anchor: [0, 0],         
      existData: [
	       { t: ['Time', duration] },
		   { t: ['S', "TouchInput.drill_isLeftPressed()", true], d:[0,30], c:['S', `this.time > ${waitTime}`] }
	  ],  
  });
  
  const zoom  = $gameScreen.zoomScale();
  const scale = 1 / zoom;
  const path  = extra.fileName ? extra.fileName : "null1";
  const posX  = extra.imgX ?? 960;
  const posY  = extra.imgY ?? 540;
  QJ.MPMZ.Shoot({	  
      img: path,
      position: [['S', posX/zoom], ['S', posY/zoom]],
      initialRotation: ['S', 0],
      imgRotation: ['F'],
      opacity: opacity,
      moveType: ['S', '0'],
      z: extra.z ?? 'A',
      scale: `0|${startScale * scale}~${fadeIn}/${scale}~${duration + 30}|${scale}`,
      onScreen: true,
      anchor: [0.5, 0.5],         
      existData: [
	        { t: ['Time', duration] },
			{ t: ['S', "TouchInput.drill_isLeftPressed()", true], d:[0,30], c:['S', `this.time > ${waitTime}`] }
	  ]  
  });
  
  if (extra.text1) {
  let Args1 = { 
	    z: extra.z ?? 'A',
	    text: extra.text1, 
		x: extra.posX1 ?? 960, 
		y: extra.posY1 ?? 535,  
		width: -1, 
		textAlign: 5, 
		fontSize: extra.fontSize ?? 64, 
		fontBold: true,
		textColor: extra.textColor ?? "#c9c8c8",
		shadowBlur: 15,
		shadowColor: "#000000",		
		fontFace: extra.fontFace ?? DrillUp.g_DFF_fontFace, 
		groupName: ['Achievement'],
		opacity: textOpacity,
		// customShootText 自己补偿地图 zoom，这里只传演出缩放。
		scale: textScale,
		existData: [
		     { t: ['Time', duration] },
			 { t: ['S', "TouchInput.drill_isLeftPressed()", true], d:[0,30], c:['S', `this.time > ${waitTime}`] }
		]
	};
    QJ.MPMZ.tl.customShootText(Args1);
  }

  let fontFaceFan = "Kaisei Decol"; 
  switch(ConfigManager.language) {
	case 3:  
        fontFaceFan = "Natsuzemi Maru Gothic Black";
		break;	 
	case 11: 
        fontFaceFan = "Mali";
		break;	  
  }  

  if (extra.text2) {  
  let Args2 = { 
	    z: extra.z ?? 'A',
	    text: extra.text2, 
		x: extra.posX2 ?? 960, 
		y: extra.posY2 ?? 615,
		width: -1, 
		textAlign: 5, 
		fontSize: extra.fontSize2 ?? 24,  
		fontBold: true,
		textColor: extra.textColor ?? "#c9c8c8",
		shadowBlur: 6,
		shadowColor: "#000000",
		fontFace: extra.fontFace2 ?? fontFaceFan, 
		groupName: ['Achievement'],
		opacity: textOpacity,
		scale: textScale,
		existData: [
		     { t: ['Time', duration] },
			 { t: ['S', "TouchInput.drill_isLeftPressed()", true], d:[0,30], c:['S', `this.time > ${waitTime}`] }
		]
	};
    QJ.MPMZ.tl.customShootText(Args2);
  }
};

//检查字体是否已加载
chahuiUtil.checkFontLoaded = function(name) {
  name = String(name || '').trim().replace(/^(["'])(.*)\1$/, '$2');
  if (!name) return false;

  // MZ 项目注册字体以 FontManager 状态为准，避免 Canvas 宽度法把回退字体误判为已加载。
  if (typeof Graphics !== 'undefined' &&
      Graphics._fontFileMap &&
      Graphics._fontFileMap[name] &&
      typeof FontManager !== 'undefined') {
    return FontManager._states[name] === 'loaded';
  }

  // 系统字体或未纳入注册表的字体继续使用 MV 时代的兼容检测。
  const c = chahuiUtil.checkFontLoaded._c || (chahuiUtil.checkFontLoaded._c = document.createElement('canvas'));
  const g = c.getContext('2d'), txt = 'AxmTYjkQW012345!?';
  g.font = '72px serif';        const s = g.measureText(txt).width;
  g.font = '72px sans-serif';   const z = g.measureText(txt).width;
  g.font = `72px "${name}", serif`;      const a = g.measureText(txt).width;
  g.font = `72px "${name}", sans-serif`; const b = g.measureText(txt).width;
  return (a !== s) || (b !== z);  // 只要和基线不同，就说明字体生效了
};

// 任务指引演出；{createButton:true} 生成收起状态的入口，{removeButton:true} 移除入口。
(() => {
const buttonSprites = new WeakMap(); // 只缓存运行时贴图，不放进 QJ 子弹存档数据。
chahuiUtil.questObjectiveGuide = function(extra = {}) {
    const buttonGroup = "questGuideButton";
    const layout = QJ.MPMZ.tl.topLeftHud;
    if (!extra.refreshButton) layout.invalidate();
    const questY = layout.questY;
    const iconX = layout.iconCenterX;
    const iconY = questY + layout.questIconCenterY;
    if (extra.removeButton) {
        QJ.MPMZ.deleteProjectile(buttonGroup);
        return;
    }
    if (extra.createButton) {
        QJ.MPMZ.deleteProjectile(buttonGroup);
        const parent = SceneManager._scene._spriteset;
        return QJ.MPMZ.Shoot({
            groupName: ["SceneButton", buttonGroup],
            img: "imoutoUtil/questMarker",
            position: [["S", (iconX - parent.x) / parent.scale.x], ["S", (iconY - parent.y) / parent.scale.y]],
            initialRotation: ["S", 0], imgRotation: ["S", 0], moveType: ["S", 0],
            anchor: [0.5, 0.5], scale: [1 / parent.scale.x, 1 / parent.scale.y],
            opacity: 0, z: "A", onScreen: true, collisionBox: ["C", 1], existData: [],
            extra: { mapId: $gameMap.mapId() },
            moveF: [[1, 1, chahuiUtil.questObjectiveGuide, [{ refreshButton: true }]]]
        });
    }
    if (extra.refreshButton) {
        if ($gameMap.mapId() !== this.data.extra.mapId || $gameScreen.picture(16)) {
            this.setDead();
            return;
        }
        // A 层仍受地图缩放和平移影响，按实际父容器反算固定屏幕坐标。
        const parent = SceneManager._scene._spriteset;
        const sx = parent.scale.x, sy = parent.scale.y;
        const dx = $gameMap.displayX() * QJ.tileSize, dy = $gameMap.displayY() * QJ.tileSize;
        this._x = this.x = (iconX - parent.x) / sx + dx;
        this._y = this.y = (iconY - parent.y) / sy + dy;
        this._orginDisplayX = dx;
        this._orginDisplayY = dy;
        if (this.scaleX !== 1 / sx || this.scaleY !== 1 / sy) {
            this.changeAttribute("scale", [1 / sx, 1 / sy]);
        }
        const shown = !$gameMessage.isBusy() && !$gameSystem.isMapSelectEquipOpen() &&
            !$gameSystem.isMapSelectSkillOpen() && !SceneManager.isSceneChanging();
        const opacity = shown ? 1 : 0;
        if (this.opacity !== opacity) {
            this.changeAttribute("opacity", opacity);
            this.opacity = opacity;
        }
        let sprite = buttonSprites.get(this);
        if (!sprite || sprite._destroyed || !sprite.parent) {
            sprite = $gameMap.findBulletSpriteQJ(this);
            buttonSprites.set(this, sprite);
        }
        const hovered = shown && sprite && sprite.bitmap && sprite.bitmap.isReady() &&
            Math.abs(TouchInput.x - iconX) <= sprite.bitmap.width / 2 &&
            Math.abs(TouchInput.y - iconY) <= sprite.bitmap.height / 2;
        if (hovered && !this._questButtonHovered) SoundManager.playCursor();
        this._questButtonHovered = hovered;
        if (!shown) this._questButtonPressed = false;
        if (hovered && TouchInput.drill_isLeftTriggered()) this._questButtonPressed = true;
        if (this._questButtonPressed && TouchInput.drill_isLeftReleased()) {
            this._questButtonPressed = false;
            SoundManager.playOk();
            $gameMap.steupCEQJ(333, 0, {});
        }
        // 悬停和按下共用一个普通 Sprite，随主体销毁；不生成叠图子弹。
        const highlighted = hovered || this._questButtonPressed;
        if (sprite) {
            if (highlighted && !sprite._questButtonOverlay) {
                const overlay = new Sprite(ImageManager.loadProjectileQJ("imoutoUtil/questMarker_focus"));
                overlay.anchor.set(0.5);
                sprite.addChild(overlay);
                sprite._questButtonOverlay = overlay;
            }
            if (sprite._questButtonOverlay) sprite._questButtonOverlay.visible = !!highlighted;
        }
        return;
    }

    let posX = layout.questTextX;
	let posY = questY;
    const qusetId = $gameParty.leader()?.questId || 412;

    const opacity = 0.9;
    const markerPosition = layout.questPicturePosition();
    $gameScreen.showPicture(16, "characters/questMarker", 1, markerPosition.x, markerPosition.y, 100, 100, 255, 0);
	$gameScreen.setPictureCallCommon(16, 333, 1);
    QJ.MPMZ.deleteProjectile('quest');
    QJ.MPMZ.deleteProjectile(buttonGroup);
	// 指引文本
	posY += 22;		
    let descTable = window.itemsDescription;
    const descObj = (descTable && descTable[String(qusetId)]) ? descTable[String(qusetId)] : null;
    if (!descObj) return;
    let title = descObj?.["name"]?.join() || '';
	const wb = new Window_Base(0, 0, 0, 0);
    //title = Array.isArray(title) ? title.join("\n") : (title ?? "");
	title = wb.convertEscapeCharacters(title); 
    const padded1 = ` ${title} `;
    let mainTitle = { 
	    text: padded1, 
		x: posX, 
		y: posY,  
		width: 600, 
		textAlign: 4, 
		fontSize: 24, 
		fontBold: true,
		textColor: "#ffffff",
		shadowBlur: 8,
		shadowColor: "#000000",		
		fontFace: DrillUp.g_DFF_fontFace, 
		groupName: ['quest'],
		opacity,
		scale: 1,
		existData: [
		     //{ t: ['Time', 769] },
		]
	};	
	
	posY += 38;	
	//let fontFace = "UoqMunThenKhung";
	//if (ConfigManager.language > 0)  fontFace = DrillUp.g_DFF_fontFace;
    const title2 = descObj?.["subtitle"]?.join?.() || '';
    const padded2 = ` ${title2} `; 
    let subtitle = { 
	    text: padded2, 
		x: posX, 
		y: posY,  
		width: 600, 
		textAlign: 4, 
		fontSize: 18, 
		fontBold: true,
		textColor: "#ffffff",
		shadowBlur: 4,
		shadowColor: "#000000",		
		fontFace: DrillUp.g_DFF_fontFace, 
		groupName: ['quest'],
		opacity,
		scale: 1,
		existData: [
		    // { t: ['Time', 769] },
		]
	};
    const guidePicture = $gameScreen.picture(16);
    // 防止切图、收起或更换任务后，旧的延迟回调重新生成文字。
    setTimeout(() => {
        if ($gameScreen.picture(16) !== guidePicture) return;
        QJ.MPMZ.tl.customShootText(mainTitle);
        QJ.MPMZ.tl.customShootText(subtitle);
        layout.invalidate();
    }, 1);
};
})();

//检查指定装备装备数量
chahuiUtil.checkEquippedItem = function(baseItemId) {
    const actor = $gameParty.leader(); 
    const equips = actor.equips();    
    let equippedCount = 0;         
    for (let i = 1; i < equips.length; i++) {
        let item = equips[i];
        if (item && item.baseItemId === baseItemId) {
            equippedCount++; 
        }
    }

    return equippedCount
};

//丢弃指定装备
chahuiUtil.removeAndDiscardEquip = function(equipId) {

    var actor = $gameParty.leader(); 
    var equips = actor.equips();    

    for (var i = 0; i < equips.length; i++) {
        var item = equips[i];
        if (item && item.etypeId === 2 && item.baseItemId === equipId) {
            // 移除装备
            actor.changeEquipById(i + 1, null);
            // 丢弃装备
            var obj = $dataArmors[item.id]; 
            $gameParty.loseItem(obj, 1);
            break; 
        }
    }
};

// 天气自定义条件变化
chahuiUtil.customWeatherConditionChanges = function () {
    // 清理潜在的音乐
    AudioManager.stopBgs();
    //AudioManager.stopAll();
    // 重置一系列事件开关
	let AtsuatsuBouzu = false;
	$gameSelfSwitches.setValue([1, 41, 'A'], false);
	$gameSelfSwitches.setValue([1, 41, 'B'], false);
    $gameSelfSwitches.setValue([1, 94, 'D'], false);
	$gameSelfVariables.setValue([1, 2, 'ahogePulled'], 0); // 重置拔呆毛次数
	$gameSelfVariables.setValue([4, 25, "level"], 0); // 重置问胖次次数
	$gameSelfSwitches.setValue([4, 42, 'A'], false);  // 重置妹妹强制睡眠开关
	$gameSelfSwitches.setValue([4, 3, 'D'], false);  // 重置向妹妹撒娇机会
	$gameSelfSwitches.setValue([4, 13, 'B'], false);  // 重置偷窥被发现开关
	$gameSelfSwitches.setValue([4, 18, 'L'], false);  // 重置深夜去客厅次数
	$gameSelfSwitches.setValue([1, 121, 'A'], false);  // 深渊柱重置生成
	$gameSwitches.setValue(28, false);    // 自动更新履历标记
	$gameSwitches.setValue(30, false);    // 重置喝茶界面的字体和UI
	$gameSwitches.setValue(55, false);    // 重置料理界面的字体和UI
    $gameSwitches.setValue(123, false);    // 炎热天气标记
    $gameSwitches.setValue(124, false);    // 妹妹早起标记
    $gameSwitches.setValue(440, false);    // 寿司布丁标记
    // 每日自然重置的标记
    $gameSystem.dailyAutoResetFlag = {};
    $gameActors.actor(2).ImoutoAutonomousAI = {};
	// 重置妹妹的心之容器
	chahuiUtil.calculateImoutoBriberyLevel({dailyRefresh: true});
	$gameTemp._ImoutoForcedRest = undefined;
    $gameTemp.chahuiMapTemp = {};  
    // 冰箱饮料的质押奖励
    QJ.MPMZ.tl.getFridgeStatsDescription({ claimStakingRewards: true });
    // 深渊地图集
    const abyss = $gameNumberArray.value(99);

    // 初始化天气预报数组
    if ($gameNumberArray.value(30).length !== 7) {
		$gameNumberArray.setValue(30,[]);
        for (let i = 0; i < 7; i++) {
            $gameNumberArray.value(30).push(dingk.Loot.calculateRandomItemIndex(2));
        }
    }

    // 当天的天气取第一个元素
    let todayWeather = $gameNumberArray.value(30).shift();

    // 娃娃影响
    if (chahuiUtil.checkEquippedItem(126) > 0) {
		todayWeather = 400;
		chahuiUtil.removeAndDiscardEquip(126);
	}	
    if (chahuiUtil.checkEquippedItem(127) > 0) {
		todayWeather = 401;
		chahuiUtil.removeAndDiscardEquip(127);
	}
	// 炎热天气娃娃
    if (chahuiUtil.checkEquippedItem(125) > 0) {
		todayWeather = 403;
		chahuiUtil.removeAndDiscardEquip(125);		
	}	
    if (chahuiUtil.checkEquippedItem(128) > 0) {
		todayWeather = 402;
		chahuiUtil.removeAndDiscardEquip(128);
	}	
	
    // 补充新的一天的天气
    $gameNumberArray.value(30).push(dingk.Loot.calculateRandomItemIndex(2));
    let mappedValue;

    // 从掉落物ID转化成天气ID
    switch (todayWeather) {
        case 400:
            mappedValue = 0;
            break;
        case 401:
            mappedValue = 1;
            break;
        case 402:
            mappedValue = 2;
			break;
        case 403:
            mappedValue = 0;
            AtsuatsuBouzu = true;			
            break;
        default:
            mappedValue = 0; 
            break;
    }
    $gameVariables.setValue(60, mappedValue);

    // 晴天的变化
    if (mappedValue === 0) {
        // 神秘商店出现
        if (Math.random() > 0.3) {
            $gameSelfSwitches.setValue([1, 94, 'D'], true);
        }
        // 转化出炎热天气
        if ($gameParty.hasItem($dataItems[198]) || $gameSelfSwitches.value([24, 14, 'A'])) {
            if (Math.random() > 0.75) {
                $gameSwitches.setValue(123, true);
            }
        } else {
            if (Math.random() > 0.9) {
                $gameSwitches.setValue(123, true);
            }
        }
		// 炎热天气娃娃效果
		if (AtsuatsuBouzu) {
			$gameSwitches.setValue(123, true);
		}		
    }

    // 雨天的变化
    if (mappedValue === 2) {
        $gameSystem.deleteSaveDataSpawnEventMapQJ(abyss, true);
        abyss.forEach(function (mapIndex) {
            $gameSelfVariables.setValue([mapIndex, 1, 'rainyCreation'], 2);
            $gameSelfVariables.setValue([mapIndex, 1, 'maxFishing'], 1);
        });
		$gameSelfSwitches.setValue([1, 12, 'D'], false); // 修复自动贩售机
    }
    // 每日重置
    abyss.forEach(function (mapIndex) {
        $gameSelfSwitches.setValue([mapIndex, 1, 'S'], false);
    });    
};

// 平滑改变BGM音调
chahuiUtil.changeBgmPitch = function(targetRate, duration) {

        if (!AudioManager._currentBgm) return;

        let b = AudioManager._bgmBuffer;

        if (!b || !b._sourceNode || !WebAudio._context) return;

        let now = WebAudio._context.currentTime;

        b._sourceNode.playbackRate.cancelScheduledValues(now);

        let currentRate = b._sourceNode.playbackRate.value;
        b._sourceNode.playbackRate.setValueAtTime(currentRate, now);

        b._sourceNode.playbackRate.linearRampToValueAtTime(targetRate, now + duration);

        b._pitch = targetRate;
		
};

// 多边形碰撞箱预设模板
chahuiUtil.polySets = {
  // 立绘-短裤
  tachieShortpants: [
    { x: 1233, y: 795 },
    { x: 1478, y: 788 },
    { x: 1522, y: 948 },
    { x: 1505, y: 995 },
	{ x: 1211, y: 995 },
	{ x: 1199, y: 934 }	
  ],	
  // 立绘-胖次
  tachiePanties: [
    { x: 1236, y: 806 },
    { x: 1357, y: 840 },
    { x: 1478, y: 800 },
    { x: 1376, y: 908 },
	{ x: 1338, y: 908 }
  ],
  // 立绘-小穴
  tachieOmanko: [
    { x: 1340, y: 890 },
    { x: 1354, y: 875 },
    { x: 1373, y: 897 },
	{ x: 1359, y: 909 }
  ],
  // 立绘-下巴
  tachieChin: [
    { x: 1324, y: 428 },
    { x: 1370, y: 440 },
    { x: 1416, y: 407 },
    { x: 1400, y: 445 },
	{ x: 1352, y: 447 }
  ],  
  // 立绘-锁骨
  tachieClavicle: [
    { x: 1297, y: 478 },
    { x: 1369, y: 488 },
    { x: 1443, y: 480 },
	{ x: 1369, y: 503 },
  ],
  // 立绘-右耳
  tachieRightEar: [
    { x: 1251, y: 387 },
    { x: 1290, y: 372 },
    { x: 1301, y: 400 },
  ], 
  // 立绘-左耳
  tachieLeftEar: [
    { x: 1442, y: 344 },
    { x: 1488, y: 344 },
    { x: 1445, y: 378 },
  ],
  // T恤-衣领
  TshirtCollar: [
    { x: 1295, y: 470 },
    { x: 1310, y: 460 },
    { x: 1385, y: 520 },
    { x: 1508, y: 525 },
    { x: 1508, y: 550 },
    { x: 1378, y: 555 },
    { x: 1320, y: 518 },	
  ],
  // T恤-下摆
  TshirtHem: [
    { x: 1218, y: 845 },
    { x: 1360, y: 875 },
    { x: 1515, y: 886 },
    { x: 1508, y: 942 },
    { x: 1355, y: 940 },
    { x: 1214, y: 900 },	
  ],  
};

// 圆形碰撞箱预设模板
chahuiUtil.circleSets = {
  // 立绘-左乳头
  tachieLeftNipple: {
    cx: 1440,  // 圆心 x
    cy: 600,   // 圆心 y
    r: 20      // 半径
  },	
  // 立绘-右乳头
  tachieRightNipple: {
    cx: 1266,  // 圆心 x
    cy: 591,   // 圆心 y
    r: 20      // 半径
  },	
  // 立绘-右胸
  tachieRightBreast: {
    cx: 1294,  // 圆心 x
    cy: 593,   // 圆心 y
    r: 57      // 半径
  },
  // 立绘-左胸
  tachieLeftBreast: {
    cx: 1425,  // 圆心 x
    cy: 598,   // 圆心 y
    r: 57      // 半径
  }, 
  // 立绘-肚脐
  tachieNavel: {
    cx: 1350,  // 圆心 x
    cy: 760,   // 圆心 y
    r: 30      // 半径
  }, 
  // 立绘-左手
  tachieLeftHand: {
    cx: 1584,  // 圆心 x
    cy: 917,   // 圆心 y
    r: 50      // 半径
  },  
  // 立绘-右手
  tachieRightHand: {
    cx: 1183,  // 圆心 x
    cy: 508,   // 圆心 y
    r: 50      // 半径
  },   
};

// 椭圆形碰撞箱预设模板
chahuiUtil.ellipseSets = {
  // 立绘-摸头
  tachieHead: {
    cx: 1355,     // 椭圆中心 x 坐标
    cy: 240,     // 椭圆中心 y 坐标
    rx: 107,     // x方向半径
    ry: 50       // y方向半径
  }
};
	
// 判断鼠标是否位于指定多边形范围内
chahuiUtil.pointInPolygo = function(presetName) {

    var polygonVertices = chahuiUtil.polySets[presetName];
    if (!polygonVertices) {
        console.error("未找到预设区域名称：" + presetName);
        return false;
    }
    if (ConfigManager.harmonyMode) {
        return false;
    }	
    var mouseX = _drill_mouse_x;
    var mouseY = _drill_mouse_y;
    
    var inside = false;
    // 使用射线法检测：遍历多边形的每一条边
    for (var i = 0, j = polygonVertices.length - 1; i < polygonVertices.length; j = i++) {
        var xi = polygonVertices[i].x, yi = polygonVertices[i].y;
        var xj = polygonVertices[j].x, yj = polygonVertices[j].y;
        // 如果当前边跨过了水平线 mouseY，计算交点的X坐标
        var intersect = ((yi > mouseY) !== (yj > mouseY)) &&
                        (mouseX < (xj - xi) * (mouseY - yi) / (yj - yi) + xi);
        if (intersect) {
            inside = !inside;
        }
    }
    return inside;
};	

// 判断鼠标是否位于指定圆形范围内
chahuiUtil.pointInCircle = function(presetName) {
    var circle = chahuiUtil.circleSets[presetName];
    if (!circle) {
        console.error("pointInCircle: 未找到圆形预设名称：" + presetName);
        return false;
    }
    if (ConfigManager.harmonyMode) {
        return false;
    }    
    // 取鼠标坐标
    var mx = _drill_mouse_x;
    var my = _drill_mouse_y;

    // 圆心(cx, cy) 及半径 r
    var cx = circle.cx;
    var cy = circle.cy;
    var r  = circle.r;

    // 判断 (mx - cx)^2 + (my - cy)^2 <= (r)^2
    var dx = mx - cx;
    var dy = my - cy;
    return (dx * dx + dy * dy <= r * r);
};

// 判断鼠标是否位于指定椭圆形范围内
chahuiUtil.pointInEllipse = function(presetName) {
    var ellipse = chahuiUtil.ellipseSets[presetName];
    if (!ellipse) {
        console.error("pointInEllipse: 未找到椭圆预设名称：" + presetName);
        return false;
    }
    // 当前鼠标坐标
    var mx = _drill_mouse_x;
    var my = _drill_mouse_y;

    // 椭圆中心 & 半径
    var cx = ellipse.cx;
    var cy = ellipse.cy;
    var rx = ellipse.rx;
    var ry = ellipse.ry;

    // 如果半径无效，直接返回false
    if (rx <= 0 || ry <= 0) {
        return false;
    }

    // 计算 (mx - cx)^2 / rx^2 + (my - cy)^2 / ry^2
    var dx = mx - cx;
    var dy = my - cy;
    var val = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);

    return val <= 1; // <=1 表示在椭圆内部
};

// 测试用方法：在当前场景中绘制指定预设区域的填充多边形
chahuiUtil.drawPolygonOverlay = function(presetName, color) {
    // 获取预设多边形顶点集合
    var polygonVertices = chahuiUtil.polySets[presetName];
    if (!polygonVertices) {
        console.error("chahuiUtil.drawPolygonOverlay: 未找到预设区域名称：" + presetName);
        return null;
    }
    
    // 如果未提供颜色，则默认使用半透明红色
    color = color || "rgba(255, 0, 0, 0.5)";
    
    // 创建一个覆盖整个游戏窗口的 Bitmap 与 Sprite
    var bitmap = new Bitmap(Graphics.boxWidth, Graphics.boxHeight);
    var sprite = new Sprite(bitmap);
    // 将该 Sprite 设置到较高层级，以便显示在最前
    sprite.z = 10000;
    
    // 获取 Bitmap 的 canvas context 对象进行绘制
    var ctx = bitmap._context;
    if (!ctx) {
        console.error("chahuiUtil.drawPolygonOverlay: 无法获取 Bitmap 上下文");
        return null;
    }
    
    // 开始绘制多边形
    ctx.beginPath();
    // 注意：这里假设预设顶点坐标已经是屏幕坐标
    ctx.moveTo(polygonVertices[0].x, polygonVertices[0].y);
    for (var i = 1; i < polygonVertices.length; i++) {
        ctx.lineTo(polygonVertices[i].x, polygonVertices[i].y);
    }
    ctx.closePath();
    
    // 设置填充色
    ctx.fillStyle = color;
    ctx.fill();
    
    // 通知 Bitmap 更新（使 canvas 的改变生效）
    bitmap._setDirty();
    
    // 将绘制好的 Sprite 添加到当前场景（例如 Scene_Map）中
    if (SceneManager._scene) {
        SceneManager._scene.addChild(sprite);
    } else {
        console.error("chahuiUtil.drawPolygonOverlay: 当前场景不存在，无法添加 Sprite");
    }
    
    // 返回该 Sprite，便于后续可能的移除操作
    return sprite;
};

// 测试用方法：在当前场景中绘制指定预设区域的填充圆形
chahuiUtil.drawCircleOverlay = function(presetName, color) {
    var circle = chahuiUtil.circleSets[presetName];
    if (!circle) {
        console.error("drawCircleOverlay: 未找到圆形预设名称：" + presetName);
        return null;
    }
    // 若不指定颜色，默认半透明红
    color = color || "rgba(255, 0, 0, 0.5)";

    // 创建一个覆盖整个画面的 Bitmap + Sprite
    var bitmap = new Bitmap(Graphics.boxWidth, Graphics.boxHeight);
    var sprite = new Sprite(bitmap);
    sprite.z = 9999; // 或 10000, 保证在最前端显示

    // 获取 canvas context
    var ctx = bitmap._context;
    if (!ctx) {
        console.error("drawCircleOverlay: 无法获取 canvas 上下文");
        return null;
    }

    // 读取圆心与半径
    var cx = circle.cx;
    var cy = circle.cy;
    var r  = circle.r;

    // 开始绘制
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // 通知位图更新
    bitmap._setDirty();

    // 将 sprite 添加到当前场景
    if (SceneManager._scene) {
        SceneManager._scene.addChild(sprite);
    } else {
        console.error("drawCircleOverlay: 当前无可用场景");
    }

    // 返回 sprite，以便后续可能移除
    return sprite;
};

// 测试用方法：在当前场景中绘制指定预设区域的填充椭圆形
chahuiUtil.drawEllipseOverlay = function(presetName, color) {
    var ellipse = chahuiUtil.ellipseSets[presetName];
    if (!ellipse) {
        console.error("drawEllipseOverlay: 未找到椭圆预设：" + presetName);
        return null;
    }
    color = color || "rgba(255,0,0,0.5)";

    var cx = ellipse.cx, cy = ellipse.cy;
    var rx = ellipse.rx, ry = ellipse.ry;
    if (rx <= 0 || ry <= 0) {
        console.warn("drawEllipseOverlay: 非法椭圆半径 rx/ry");
        return null;
    }

    // 创建一个覆盖画面的 Bitmap+Sprite
    var bitmap = new Bitmap(Graphics.boxWidth, Graphics.boxHeight);
    var sprite = new Sprite(bitmap);
    sprite.z = 9999; // 显示在最前
    var ctx = bitmap._context;
    if (!ctx) {
        console.error("drawEllipseOverlay: 无法获取 canvas context");
        return null;
    }

    // 使用 canvas 的 ellipse 方法
    ctx.beginPath();
    // ellipse(cx, cy, rx, ry, rotation, startAngle, endAngle, anticlockwise)
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // 使bitmap刷新
    bitmap._setDirty();

    // 将sprite添加到当前场景
    if (SceneManager._scene) {
        SceneManager._scene.addChild(sprite);
    } else {
        console.error("drawEllipseOverlay: 当前无可用场景");
    }
    return sprite;
};

    var _Game_Screen_prototype_showPicture = Game_Screen.prototype.showPicture;
    Game_Screen.prototype.showPictureFromPath = function(pictureId, path, filename, origin, x, y, scaleX, scaleY, opacity, blendMode) {
        var fullPath = path.endsWith('/') ? path : path + '/';
        var combinedFilename = fullPath + filename;
        _Game_Screen_prototype_showPicture.call(this, pictureId, combinedFilename, origin, x, y, scaleX, scaleY, opacity, blendMode);
};

Game_Map.prototype.checkPlayerCombatPower = function() {
        let actor = $gameActors.actor(1);
        let weapon = actor.atk + actor.mat;
        let CRB = actor.cri * $gameVariables.value(114) * 0.01;
        weapon *= (1 - actor.cri + CRB);
        let armor = actor.def + actor.mdf;
        let boost = 1 + 4 * ((actor.mhp - 70) / 930);
        let combatPower = Math.round(boost * 1.2 * weapon + 0.8 * armor + actor.agi);

        let num;
		let style;
        if (combatPower >= $gameVariables.value(113)) {
            num = "+" + (combatPower - $gameVariables.value(113)); 
			style = 7;
        } else {
            num = "-" + ($gameVariables.value(113) - combatPower);
			style = 8;
        }
        //战斗力变动演出
        $gameTemp.drill_GFN_createSimple?.([100, 80], num.toString(), style, 2, 120);
        $gameVariables.setValue(113, combatPower);
};

// 自由探索-妹妹位置标记。
// generateMapTransferList 传入地图顺序；位置改变后调用 markImoutoLocation({refresh:true})。
// 标记右对齐在选项框内部；offsetX/offsetY 为标记右边缘相对选项右边缘的偏移。
// 默认 offsetX=-20、scale=1，按素材原始尺寸显示，在框内右侧留有边距。
// 入场时与目标选项共用透明度；fadeInFrames 仅用于入场完成后的显式刷新。
// fadeInFrames/fadeOutFrames 默认各 12 帧（约 0.2 秒）。
chahuiUtil.markImoutoLocation = function(extra={}) {
    const method = chahuiUtil.markImoutoLocation;
    const previous = method._session;
    const refreshing = !extra.mapOrder && previous;
    const options = refreshing ? Object.assign({}, previous.options, extra) : extra;
    const resume = refreshing && previous.started ? {
        choices: previous.choices, callback: previous.callback, serial: previous.serial
    } : null;
    if (previous) previous.dispose();
    if (extra.clear) return null;

    const scene = SceneManager._scene;
    const map = $gameMap;
    const owner = refreshing ? previous.owner : this;
    const mapOrder = options.mapOrder;
    const visibleMapIds = options.visibleMapIds;
    // 未提供位置就不显示，不将空值或其他类型转换为地图编号，也不沿用旧标记。
    const location = $gameActors.actor(2)?.ImoutoAutonomousAI?.currentMapId;
    if ((typeof location !== "number" && typeof location !== "string") ||
        (typeof location === "string" && location.trim() === "")) return null;
    const currentMapId = Number(location);
    if (!Number.isInteger(currentMapId) || currentMapId <= 0) return null;
    if (!(scene instanceof Scene_Map) || !Array.isArray(mapOrder) ||
        !Array.isArray(visibleMapIds) || !visibleMapIds.includes(currentMapId)) return null;
    const originalIndex = mapOrder.indexOf(currentMapId);
    if (originalIndex < 0) return null;

    const group = scene._drill_DCB_sprite;
    const choiceWindow = group?._drill_choiceWindow;
    if (!choiceWindow) return null;
    // 提前加载，避免等目标选项开始淡入时才请求标记图片。
    ImageManager.loadProjectileQJ("imoutoUtil/ImoutoMark");
    const watcher = new Sprite();
    const localPoint = new PIXI.Point();
    const globalPoint = new PIXI.Point();
    const matrix = new PIXI.Matrix();
    const scale = Number.isFinite(options.scale) ? options.scale : 1;
    const offsetX = Number.isFinite(options.offsetX) ? options.offsetX : -20;
    const offsetY = Number.isFinite(options.offsetY) ? options.offsetY : 0;
    const fadeInFrames = Number.isFinite(options.fadeInFrames) ? Math.max(0, options.fadeInFrames) : 12;
    const fadeOutFrames = Number.isFinite(options.fadeOutFrames) ? Math.max(0, options.fadeOutFrames) : 12;
    const offsetMatrix = new PIXI.Matrix(scale, 0, 0, scale, 0, offsetY);
    const initialCallback = $gameMessage._choiceCallback;
    const hasOwner = typeof owner?.isRunning === "function";
    const session = {
        scene, owner, options: Object.assign({}, options), currentMapId,
        started: !!resume, choices: resume?.choices, callback: resume?.callback,
        serial: resume?.serial, visibleIndex: -1, bullet: null, sprite: null,
        opacity: 0, followEntrance: false, closing: false, fadeOutTime: 0, fadeOutStart: 0, target: null, layer: null,
        disposed: false,
        dispose() {
            if (this.disposed) return;
            this.disposed = true;
            if (this.sprite && !this.sprite._destroyed) this.sprite.visible = false;
            // 换图/读档可能复用子弹编号，只删除仍属于当前容器的实体。
            if ($gameMap === map && this.bullet && map.bulletQJ(this.bullet.index) === this.bullet &&
                !this.bullet.deadOver) this.bullet.setDead();
            if (watcher.parent) watcher.parent.removeChild(watcher);
            if (method._session === this) method._session = null;
            Sprite.prototype.destroy.call(watcher);
        }
    };
    method._session = session;
    // 场景销毁也释放会话；不修改 Scene_Map / Drill / QJ 的全局更新方法。
    watcher.destroy = function() { session.dispose(); };
    watcher.update = function() {
        if (session.disposed) return;
        if (SceneManager._scene !== scene || $gameMap !== map ||
            SceneManager.isSceneChanging() || scene._drill_DCB_sprite !== group ||
            !$gameSystem._drill_DCB_enable || $gameSystem._drill_DCB_curStyle !== 2) {
            session.dispose();
            return;
        }
        const layer = group._drill_layer_sprite;
        if (!session.started) {
            // 调用生成列表后，公共事件还会等待 1 帧才显示选项。
            // HIME 合并选项会正常复制 _list，不能用数组引用变化判断事件结束。
            if (hasOwner && !owner.isRunning()) {
                session.dispose();
                return;
            }
            if (!$gameMessage.isChoice() || $gameMessage._choiceCallback === initialCallback ||
                !choiceWindow.active || !layer || group._drill_curSerial !== choiceWindow._drill_DCB_serial) return;
            session.started = true;
            session.choices = $gameMessage.choices();
            session.callback = $gameMessage._choiceCallback;
            session.serial = choiceWindow._drill_DCB_serial;
        }
        if ($gameMessage.isChoice() && ($gameMessage.choices() !== session.choices ||
            $gameMessage._choiceCallback !== session.callback ||
            choiceWindow._drill_DCB_serial !== session.serial)) {
            session.dispose();
            return;
        }
        if (!$gameMessage.isChoice() || !choiceWindow.active) {
            if (!session.bullet || !session.sprite || session.opacity <= 0 || layer !== session.layer) {
                session.dispose();
                return;
            }
            if (!session.closing) {
                session.closing = true;
                session.fadeOutStart = session.opacity;
            }
        }
        if (session.closing) {
            session.fadeOutTime++;
            session.opacity = fadeOutFrames > 0
                ? session.fadeOutStart * Math.max(0, 1 - session.fadeOutTime / fadeOutFrames) : 0;
            if (session.opacity <= 0) {
                session.bullet._imoutoLocationOpacity = 0;
                session.dispose();
                return;
            }
        }
        if (session.visibleIndex < 0) {
            // ALOE 保存的映射是最终显示顺序，不能直接使用原始事件分支索引。
            const indexes = $gameMessage._aloeVisibleChoiceIndexes;
            session.visibleIndex = Array.isArray(indexes)
                ? indexes.indexOf(originalIndex) : visibleMapIds.indexOf(currentMapId);
            if (session.visibleIndex < 0) {
                session.dispose();
                return;
            }
        }
        if (session.bullet?.dead) {
            session.dispose();
            return;
        }
        if (session.sprite) session.sprite.visible = false;
        const target = session.closing ? session.target
            : layer?._drill_button_spriteTank[session.visibleIndex - choiceWindow.topIndex()];
        if (!target?.bitmap?.isReady()) return;
        if (!session.bullet) {
            // Drill 已按显示索引算好 delay = slideDelay + index * slideOrderlyDelay。
            // 使用它的实际播放帧数，兼容图片加载等待；不等最后一个选项入场。
            const entranceTime = target._drill_foldTime - target._drill_delayTime;
            if (!(entranceTime > 0)) return;
            session.followEntrance = entranceTime < target._drill_slideTime;
            session.bullet = QJ.MPMZ.Shoot({
                groupName: ["imoutoLocationMark"], img: "imoutoUtil/ImoutoMark",
                position: [["S", 0], ["S", 0]], moveType: ["S", 0],
                initialRotation: ["S", 0], imgRotation: ["S", 0],
                anchor: [1, 0.5], opacity: 0, z: "S", onScreen: true,
                collisionBox: ["C", 1],
                // 关闭选项先淡出，淡出完成才允许销毁；不能在首个关闭帧直接自灭。
                existData: [{ t: ["S", "!$gameMessage.isChoice() && this._imoutoLocationOpacity <= 0", true] }]
            });
            if (!session.bullet) {
                session.dispose();
                return;
            }
            session.bullet.currentMapId = currentMapId;
            session.bullet.choiceIndex = session.visibleIndex;
            // Shoot 内部已执行一次 update(true)。待实体赋值后再启用身份检查，
            // 防止尚未返回的实体误杀自己，同时清理读档恢复出的旧标记。
            session.bullet.addExistData({ t: ["S", "chahuiUtil.markImoutoLocation._session?.bullet !== this || chahuiUtil.markImoutoLocation._session?.scene !== SceneManager._scene", true] });
        }
        const bullet = session.bullet;
        const sprite = session.sprite || (session.sprite = scene._spriteset.findBulletSpriteQJ(bullet.index));
        if (!sprite?.parent || !sprite.bitmap?.isReady()) return;
        session.target = target;
        session.layer = layer;
        if (!session.closing) {
            // 入场时直接继承选项透明度，避免叠乘另一条淡入曲线导致标记更晚出现。
            session.opacity = session.followEntrance || fadeInFrames === 0
                ? 1 : Math.min(1, session.opacity + 1 / fadeInFrames);
        }
        bullet._imoutoLocationOpacity = session.opacity;
        // watcher 在 scene 子节点末尾运行：此时 Drill 已写入本帧出列/回落坐标。
        // 转换实际父容器坐标，兼容地图缩放；不重复模拟 Drill 动画。
        localPoint.set((1 - target.anchor.x) * target.bitmap.width + offsetX, offsetY);
        target.toGlobal(localPoint, globalPoint);
        sprite.parent.toLocal(globalPoint, undefined, localPoint);
        offsetMatrix.tx = (1 - target.anchor.x) * target.bitmap.width + offsetX;
        matrix.copyFrom(sprite.parent.worldTransform).invert().append(target.worldTransform).append(offsetMatrix);
        sprite.transform.setFromMatrix(matrix);
        sprite.alpha = sprite.parent.worldAlpha > 0
            ? session.opacity * target.worldAlpha / sprite.parent.worldAlpha : 0;
        sprite.visible = target.worldVisible;
        // 同步实体坐标，避免 QJ 下一帧将标记判断为屏外对象。
        bullet._x = bullet.x = localPoint.x + map.displayX() * QJ.tileSize;
        bullet._y = bullet.y = localPoint.y + map.displayY() * QJ.tileSize;
        bullet._orginDisplayX = map.displayX() * QJ.tileSize;
        bullet._orginDisplayY = map.displayY() * QJ.tileSize;
        if (bullet.QJBody) bullet.updateBodyPosition();
    };
    scene.addChild(watcher);
    return session;
};

// 自由探索-地图传送
chahuiUtil.generateMapTransferList = function(extra={}) {
    const maps = {
        24: "MapExplorationOption_entryway",
        11: "MapExplorationOption_diningRoom",
        38: "MapExplorationOption_livingRoom",
        4:  "MapExplorationOption_ImoutoRoom",
        21: "MapExplorationOption_ownRoom",
        66: "MapExplorationOption_masterBedroom",
        3:  "MapExplorationOption_sickroom",
        6:  "MapExplorationOption_bathRoom",
        20: "MapExplorationOption_toilet"
    };

    // 必须与事件中的选项顺序一致
    const mapOrder = [24, 11, 38, 4, 21, 66, 3, 6, 20];
    const mapId    = $gameMap.mapId();
    const hour     = $gameSystem.hour();

    if (extra.startTeleport) {
        if (mapId === 19) return; 
        if ($gameMap.chahuiMapTemp.disableTeleport) return;
        // 进行传送检测
        const choiceIndex = this._branch[this._indent];
        const targetMapId = mapOrder[choiceIndex];
        if (Number.isInteger(choiceIndex) && targetMapId !== undefined) {
            if (($gameMap.chahuiMapTemp.isDusk || $gameMap.chahuiMapTemp.isNight) && !RecallStage.isActive()) {
                // 统一的自由探索触发指令
                const code = "$gameMap.event(1).steupCEQJ(2, {freeExploration: true})";
                $gameStrings.setValue(20, code);           
                const mapId = targetMapId; 
                const x = 5; 
                const y = 5;
                const direction = 0;
                const fadeType = 2;
                this.setupChild([
                    {
                        code: 201,
                        indent: 0,
                        parameters: [0, mapId, x, y, direction, fadeType]
                    },
                    {
                        code: 0,
                        indent: 0,
                        parameters: []
                    }
                ], 0);
                // 成功触发地图传送指令时，需要提前中止解释器
                this.command115();
            } 
        }
        return;
    }

    // 隐藏当前地图
    const hiddenMapIds = new Set([mapId]);

    // 额外判断条件
    
    if (mapId === 54 && hour < 17) {
        // 白天的妹妹房间和客厅场景尚未分离出去
        hiddenMapIds.add(4);
    }

    if (!$gameSelfVariables.value([1, 2, 'sleepTogether'])) {
        // 主卧有解锁条件
        hiddenMapIds.add(66);
    }    

    // 其他隐藏规则继续在此处追加

    const disabledOptions = [];
    const buttonImages = [];
    const visibleMapIds = [];

    mapOrder.forEach((mapId, index) => {
        if (hiddenMapIds.has(mapId)) {
            // 原始选项编号，从 1 开始
            disabledOptions.push(index + 1);
        } else {
            // 按显示顺序排列剩余选项的贴图
            buttonImages.push(maps[mapId]);
            visibleMapIds.push(mapId);
        }
    });

    $gameMap.chahuiMapTemp = $gameMap.chahuiMapTemp || {};
    $gameMap.chahuiMapTemp.disabledOptionArray = disabledOptions;
    const styleId = 1;
    $gameSystem._drill_DCB_curStyle = styleId + 1;
    DrillUp.g_DCB_data[styleId].btn_src = buttonImages;
    DrillUp.g_DCB_data[styleId].x = 166;
    DrillUp.g_DCB_data[styleId].y = 930;
    DrillUp.g_DCB_data[styleId].style_id = 13;    
    const index   = "mapTemplate";
    const eid     = "MapExploration";
    QJ.MPMZ.tl._imoutoUtilGenerateOptionText.call(this, index, eid, {specifiedKey:"mapCommonEventDialogue"});    
    chahuiUtil.markImoutoLocation.call(this, {mapOrder, visibleMapIds});
};

// 存档背景贴图判断
chahuiUtil.selectSaveSlotBackground = function(extra={}) {
    let background = "";
    const mapId  = $gameMap.mapId();
    const hour   = $gameSystem.hour();
    const Imouto = $gameActors.actor(2);
    switch (mapId) {
        case 3:
        //  洗面所 
            background = "washArea_dusk";
            if ($gameMap.chahuiMapTemp.isNight) {
                background = "[NSFW]washArea_peeking";
                if (Imouto.isStateAffected(29)) {
                    background = "[NSFW]washArea_peeking";
                    if ($gameSelfSwitches.value([4, 14, 'B'])) {
                        background = "[NSFW]washArea_peeking2";
                    }
                }
            }           
            break;

        case 4:
        //  妹妹的房间    
            background = "room";
            if ($gameVariables.value(15) > 6) {
                background = "room_idle";
            }
            if ($gameMap.chahuiMapTemp.isDusk) {
                background = "room_dusk";
            }
            if ($gameMap.chahuiMapTemp?.ImoutoAsleep) {
                background = "room_sleep";
            }
            if ($gameMap.chahuiMapTemp?.ImoutoBlowDryingHair) {
                background = "room_ofuro1";
                if ($gameSelfSwitches.value([mapId, 10, 'B'])) {
                    background = "room_ofuro2";
                }
                if ($gameSwitches.value(481) && $gameVariables.value(15) > 4) {
                    background = "room_ofuro3";
                }
            }
            break;

        case 6:
        //  浴室   
            background = "bathroom_dusk";
            if ($gameMap.chahuiMapTemp.isNight) {
                background = "bathroom_night";
            }
            break;
            
        case 7:
        //  和妹妹一起玩游戏   
            background = "gameEvent";
            if ($gameParty.hasItem($dataItems[16], false)) {
                background = "[NSFW]playGamesWithImouto";
            }
            break;

        case 11:
        //  餐厅    
            background = "diningroom";
            if ($gameSelfVariables.value([1, 2, "homeMadeCooking"]) > 6) {
                background = "diningroom_ImoutoCooking";
            }
            if ($gameMap.chahuiMapTemp.isNight) {
                background = "diningroom_night";
            }           
            break;

        case 20:
        //  厕所  
            background = "toilet";
            break;

        case 21:
        //  自己的房间   
            background = "oniichan_room_dusk";
            if ($gameMap.chahuiMapTemp.isNight) {
                background = "oniichan_room1";
            }                         
            if ($gameMap.chahuiMapTemp.isLateNight) {
                background = "oniichan_room1";
            }            
            if ($gameMap.chahuiMapTemp.isDay) {
                background = "oniichan_room2";
            }  
            break;
            
        case 24:
        //  玄关    
            background = "entryway_dusk";
            if ($gameMap.chahuiMapTemp.isNight) {
                background = "entryway_night";
            }                         
            if ($gameMap.chahuiMapTemp.isLateNight) {
                background = "entryway_lateNight";
            }            
            if ($gameMap.chahuiMapTemp.isDay) {
                background = "entryway_morning";
            }  
            break;

        case 25:
        //  走廊    
            background = "hallway_dusk";
            if ($gameMap.chahuiMapTemp.isNight) {
                background = "hallway_night";
            }                         
            if ($gameMap.chahuiMapTemp.isLateNight) {
                background = "hallway_lateNight";
            }            
            if ($gameMap.chahuiMapTemp.isDay) {
                background = "hallway_morning";
            }  
            break;

        case 38:
        //  客厅    
            background = "livingroom";
            if ($gameMap.chahuiMapTemp.isDay) {
                background = "livingroom_morning";
            }
            if ($gameMap.chahuiMapTemp.isNight) {
                background = "livingroom_evening";
            }            
            break;

        case 54:
            if ($gameSystem.hour() < 10) {
                background = "room_rubFace";
                if ($gameVariables.value(60) > 0) background = "room_rubFace2";
            } else {
                if ($gameMap.chahuiMapTemp?.IsHotDay) {
                    background = "room_hotDay1";
                    if ($gameParty.hasItem($dataItems[198], false)) {
                        background = "room_hotDay2";
                        if ($gameParty.hasItem($dataItems[19], false)) {
                            background = "room_hotDay3";
                            if ($gameParty.hasItem($dataItems[35], false) && $gameSelfVariables.value([1, 2, 'colaSpray']) > 0) {
                                background = "room_hotDay4";
                            }
                            if ($gameSelfSwitches.value([54, 15, 'P'])) {
                                background = "room_hotDay5";
                            }
                        }
                    }
                }
            }
            break;

        case 66:
        //  主卧 
            background = "masterBedroom_dusk"; 
            if ($gameMap.chahuiMapTemp.isNight) {
                background = "masterBedroom_night";
            }                         
            if ($gameMap.chahuiMapTemp.isLateNight) {
                background = "masterBedroom_night";
            }            
            if ($gameMap.chahuiMapTemp.isDay) {
                background = "masterBedroom_day";
            }                
            break;

    }

    $gameMap.chahuiMapTemp.SaveSlotBackground = background;
};
