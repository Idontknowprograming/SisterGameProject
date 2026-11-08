//=============================================================================
//
//=============================================================================
/*:
 * @target MV MZ
 * @plugindesc [弹幕模板库][玩家模板]
 * @author 仇九
 *
 * @help 
 * 
 *
 */
//=============================================================================
//
//=============================================================================

var SMO = SMO || {};

QJ.MPMZ.tl.checkPictureExists = function (pathSegments, fileNameWithExtension) {

  // MV→MZ：调用方普遍传入 MV 加密扩展名 .rpgmvp，但 MZ 实际资源是 .png（或 MZ 加密的 .png_）。
  //   若按 .rpgmvp 去查，文件永远不存在 → 误判图片缺失 → 功能（如敌人投掷武器）被提前 return 掉。
  //   这里忽略传入的扩展名，依次尝试 .png / .png_ / 原扩展名，任一存在即视为存在。
  const baseName = String(fileNameWithExtension).replace(/\.[^.]+$/, '');
  const givenExt = (String(fileNameWithExtension).match(/\.[^.]+$/) || ['.png'])[0];
  const candNames = [];
  for (const ext of ['.png', '.png_', givenExt]) {
    const n = baseName + ext;
    if (!candNames.includes(n)) candNames.push(n);
  }

  // PC / NW.js：保持同步返回
  if (Utils.isNwjs && Utils.isNwjs()) {
    const fs = require('fs');
    const path = require('path');
    const base = path.dirname(process.mainModule.filename);
    return candNames.some(n => fs.existsSync(path.join(base, ...pathSegments, n)));
  }

  // 安卓原生：AndroidSave.checkOrListStorage 同步查 APK assets 与自动更新临时区。
  //   ★同步返回 boolean：既满足 await 调用，也修正了同步调用方在安卓上的误判
  //    （原 resolveLocalFileSystemURL 分支返回 Promise，对 `if(!check(...))` 这类同步用法恒为真）。
  if (window.AndroidSave && typeof AndroidSave.checkOrListStorage === 'function') {
    try {
      for (const n of candNames) {
        const rel = pathSegments.join('/') + '/' + n;
        // 先查自动更新临时区（root = getFilesDir，对应 cordova.file.dataDirectory），
        // 再查包内原资源（asset = www/）；任一存在即视为存在。
        if (AndroidSave.checkOrListStorage('root', rel) === 'true') return true;
        if (AndroidSave.checkOrListStorage('asset', rel) === 'true') return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  // 网页版：查部署时生成的清单（img/projectiles/manifest.json，插件载入时异步装进 Set）
  if (QJ.MPMZ.tl._webPicManifest instanceof Set) {
    const rel = pathSegments.join('/') + '/';
    return candNames.some(n => QJ.MPMZ.tl._webPicManifest.has(rel + n));
  }
  // 清单未就绪或加载失败：沿用旧行为（视为存在），避免误杀功能
  return true;
};

// 网页版：启动时载入 img/projectiles 文件清单，供 checkPictureExists 同步查询
// （清单由 make_projectiles_manifest.py 在重新生成部署版后重跑；NW.js / 安卓原生不走这里）
if (!(Utils.isNwjs && Utils.isNwjs()) && !window.AndroidSave) {
  fetch('img/projectiles/manifest.json')
    .then(r => (r.ok ? r.json() : null))
    .then(list => {
      if (Array.isArray(list)) QJ.MPMZ.tl._webPicManifest = new Set(list);
    })
    .catch(() => {});
}

Spriteset_Map.prototype.findTargetSprite = function (target) {
    return this._characterSprites.find(sprite => sprite._character === target);
};

//清除玩家冗余存档数据
QJ.MPMZ.tl.clearPlayerSaveRedundantData = function () {
    const TAG = "不可删除";
    const result = {
        removedWeapons: 0,
        removedArmors: 0,
        prunedWeaponColorSlots: 0,
        prunedArmorColorSlots: 0
    };

    const clearIndependent = (
        independentList,
        dataTable,
        partyStore
    ) => {
        if (
            !Array.isArray(independentList) ||
            !dataTable ||
            !partyStore
        ) {
            return 0;
        }

        let removed = 0;
        for (let i = 0, len = independentList.length; i < len; i++) {
            const item = independentList[i];
            if (!item || typeof item !== "object") continue;

            const id = item.id;
            if (!id) continue;

            if (item.isSealed) continue;

            const baseData = dataTable[id];
            if (!baseData || baseData !== item) continue;

            const desc = baseData.description;
            if (desc && desc.indexOf(TAG) !== -1) continue;

            const count = partyStore[id] || 0;
            if (count <= 0) {
                if (DataManager.removeIndependentItem(item)) {
                    delete partyStore[id];
                    removed++;
                }
            }
        }
        return removed;
    };

    const pruneColorTable = (
        property,
        independentList,
        baseLength
    ) => {
        if (
            typeof $gameSystem === "undefined" ||
            !$gameSystem
        ) {
            return 0;
        }

        const table = $gameSystem[property];
        if (!table || typeof table !== "object") return 0;

        const liveIds = new Set();
        if (Array.isArray(independentList)) {
            for (const item of independentList) {
                const id = Number(item && item.id);
                if (Number.isInteger(id) && id >= 0) {
                    liveIds.add(id);
                }
            }
        }

        const firstIndependentId = Number(baseLength);
        const hasValidBoundary =
            Number.isInteger(firstIndependentId) &&
            firstIndependentId >= 0;
        let pruned = 0;

        for (const key of Object.keys(table)) {
            if (!/^\d+$/.test(key)) continue;
            const id = Number(key);
            const colorCode = table[key];
            const isEmpty =
                colorCode === undefined ||
                colorCode === null;
            const isOrphanedIndependentColor =
                hasValidBoundary &&
                id >= firstIndependentId &&
                !liveIds.has(id);

            if (!isEmpty && !isOrphanedIndependentColor) continue;
            delete table[key];
            pruned++;
        }

        if (Array.isArray(table)) {
            while (
                table.length > 0 &&
                (
                    table[table.length - 1] === undefined ||
                    table[table.length - 1] === null
                )
            ) {
                table.pop();
            }
        }
        return pruned;
    };

    result.removedWeapons = clearIndependent(
        DataManager._independentWeapons,
        $dataWeapons,
        $gameParty._weapons
    );
    result.removedArmors = clearIndependent(
        DataManager._independentArmors,
        $dataArmors,
        $gameParty._armors
    );
    result.prunedWeaponColorSlots = pruneColorTable(
        "_drill_ITC_colorCode_Weapon",
        DataManager._independentWeapons,
        DataManager._baseWeaponsLength
    );
    result.prunedArmorColorSlots = pruneColorTable(
        "_drill_ITC_colorCode_Armor",
        DataManager._independentArmors,
        DataManager._baseArmorsLength
    );
    return result;
};

// Restore persistent equipment listeners after map/player initialization.
QJ.MPMZ.tl.retriggerEquippedEffects = function () {
    return window.WAY_CustomOnEquipEval?.retriggerEquippedEffects() || 0;
};

//玩家身上的基础监听器
QJ.MPMZ.tl.ex_playerConditionCheck = function () {

    QJ.MPMZ.deleteProjectile('system');
	if (!$gameTemp._waitForPerformanceEnd) {
      for (let pictureId = 100; pictureId <= 119; pictureId++) {
          $gameScreen.erasePicture(pictureId);
      }
	}

    let posX = "$gamePlayer.screenShootXQJ()";
    let posY = "$gamePlayer.screenShootYQJ() + 18";
    let actor = $gameParty.leader();
    // 监听器兼影子
    let system = QJ.MPMZ.Shoot({
        img: "Shadow1",
        groupName: ['system', 'playerFeet'],
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        blendMode: 2,
        z: "E",
        opacity: 0.8,
        anchor: [0.5, 0.86],
        collisionBox: ['R', 20, 4],
        moveType: ['D', true],
        existData: [
        ],
        moveJS: [
            [20, 20, "QJ.MPMZ.tl.ex_PlayerHitCheck.call(this)"],           // 受击检测和无敌帧重置
            [60, 60, "QJ.MPMZ.tl.ex_playerStuckCheck.call(this)"],         // 玩家卡墙检测
            [60, 120, "QJ.MPMZ.tl.ex_playerAttributeRefresh.call(this)"],  // 玩家属性框刷新
			[5, 5, "QJ.MPMZ.tl.ex_playerSwimmingCheck.call(this)"],        // 检测是否处于水面
            [60, 30, "QJ.AnsuzMsg._updateActivation()"],
            [60, 4, "QJ.AnsuzMsg._updateVoteUI()"],
            [30, 30, "$gameParty.refreshMembers();$gameSystem.checkGameTimeEvents()"]
        ]
    });
    
    // 修正帧率
    Garasu_Descongelar();
    // 修正血条位置
    PlayerHpHud.resetPosition(); 
    // 初始化 RPG 按钮
    SLGSceneFreeExploration.Buttons.initializeRpgButtons();
    // 像素锐利模式
    window.canvasSmooth?.(false);
    // 同步游戏时长
    DataManager.refreshGameTitle?.({showPlaytime:true});
    // 显示持有金UI
    QJ.MPMZ.tl.showMoneyDisplay();
    const isMobile = Utils.isMobileDevice();
    $gameSwitches.setValue(118, false);
    // 快捷道具栏刷新
    QJ.MPMZ.tl.ex_playerItemRefresh();
	// 加载建言
    QJ?.AnsuzMsg?.syncBatch(false).then(() => {
       QJ.AnsuzMsg.summon();
    });
    // 重置死因统计
    $gameStrings.setValue(20, "");
	// 重置特殊标记
	$gameTemp._isInBattle = false;
	$gamePlayer.drill_EFLAZ_restore();
    Fuku_Plugins?.EventTremble?.stop(-1);
    // 重置从者穿透标签
    $gamePlayer.drill_ETh_removeTagsByPattern("servant");
    // 显示时间
    QJ.MPMZ.tl.showGameTimeAndDaysnew();
    // 任务指引
    // 旧存档缺少字段时默认展开；只有主动隐藏写入的 false 才收起。
    if (actor._shouldShowQuestGuide !== false) {
        chahuiUtil.questObjectiveGuide();
    } else {
        chahuiUtil.questObjectiveGuide({createButton:true});
    }
	// 强制显示虚拟按钮布局
	if (window.QJ) QJ.VB.controlVisible = true;
    // 初始化左上角功能按钮
    SLGSceneFreeExploration.Buttons.initializeEventFunctionButton();
    $gameSystem.drill_DFi_setGlow?.("只对话框", "#313131", 3, 0, 4, 0.4);
    // 快捷道具栏
    if (Imported.Hendrix_Hotbar_Creator) {
        // 平台快捷键集合：用于在切换平台时显式互相隐藏
        const PC_KEYS     = ["R Key"];
        const MOBILE_KEYS = ["R Key M", "R Key M Left", "R Key M Right"];

        // 显式隐藏对方平台的槽 —— 必须显式调用，否则 _hiddenSlots
        // 不会被填充，进出设置界面重建场景后这些槽会冒出来
        const inactiveKeys = isMobile ? PC_KEYS : MOBILE_KEYS;
        inactiveKeys.forEach(slot => setHotbarSlotVisible(slot, false));

        let key = "R Key";
        let needKey = true;
        if (isMobile) {
            key = "R Key M";
            needKey = false;
            // 安卓版还额外需要一堆切换键
            ["R Key M Left", "R Key M Right"].forEach(slot => {
                setHotbarSlotVisible(slot, true);
                setHotbarSlotKeyVisible(slot, false);
            });
            SceneManager._scene._skillUI.setSkill("R Key M Left", 195, 0, 0);
            SceneManager._scene._skillUI.setSkill("R Key M Right", 196, 0, 0);
        }
        setHotbarSlotKeyVisible(key, needKey);
        setHotbarSlotVisible(key, true);
        if (Ritter.ActiveItem) {
            SceneManager._scene._skillUI.setSkill(key, 0, Ritter.ActiveItem, 0);
        }
    }
    // 重置武器栏
	if ($gameMap.getGroupBulletListQJ('playerEquipment').length == 0) {
	    $gameMap.steupCEQJ(100,1);
	}	
	
    // 解决无武器问题 / 锻造锤卡手 
    if (!actor.equips()[0] || actor.equips()[0]?.baseItemId === 22) {
        actor.changeEquipById(1, 4);
    }
    // 初始化一些信息
    QJ.MPMZ.tl.initializeWaterDropState();

    // 生成从者
    QJ.MPMZ.tl.ServantResetAndRegeneration();
    // 防范行走图标记丢失
    QJ.MPMZ.tl.ex_playerSwitchesSpiritType();
    let applyBan = false;
    if ([51,53].includes($gameMap.mapId())) {
        // 星之门和教堂不允许攻击,也没有时间流逝
        applyBan = true;
        return;
    }
    if (!applyBan) { 
        system.addMoveData("F", [90, 30, QJ.MPMZ.tl.ex_abyssTimeFlow]);            // 在深渊时间自动流逝
    }
    if (actor.isStateAffected(77)) {
        if ($gameSystem.hasGameTimeEvent("state77")) {
            $gameScreen._particle.particleSet(0, 'fireBirdBlessing', 'player', 'sparks_c');
        } else {
            actor.removeState(77);
        }
    }

    // 优化策略： 在大地图降低视野外事件的刷新频率
    if ([5, 28, 37, 47, 48].includes($gameMap.mapId()) && isMobile) {
		let startTime = $gameTemp._waitForPerformanceEnd ? 90 : 60;
        system.addMoveData("F", [startTime, 10, QJ.MPMZ.tl.ex_refreshFarEventDisabledCounters]);
    }

    // 临时方案：重制HP回复
    if (actor.hrg < 0) {
        actor.setHrg(0);
    }
    // 重置装备中特效
    QJ.MPMZ.tl.retriggerEquippedEffects();

};

// 要事件不在当前画面内（考虑缩放），就标记为屏外
QJ.MPMZ.tl.ex_refreshFarEventDisabledCounters = function () {
    const list = $gameMap.events();
    if (!list || !list.length) return;

    //console.log("所有事件："+count);  
    // 取当前可视范围（以未缩放的地图像素为单位）
    const rs = (window.drowsepost && drowsepost.rendersize) || null;
    const scale = 2;
    const viewW = rs?.width || Math.ceil(Graphics.width / scale);
    const viewH = rs?.height || Math.ceil(Graphics.height / scale);

    const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
    const margin = tw + 48; // 边缘缓冲一格，避免抖动频繁进出

    for (let i = 0; i < list.length; i++) {
        const ev = list[i];
        if (!ev || !ev.page()) continue;
        if (ev.event()?.note?.includes('<ImmuneSlow>')) continue;
        // 事件相对屏幕左上角的像素坐标（已考虑滚动/循环）
        const x = ev.scrolledX() * tw;
        const y = ev.scrolledY() * th;

        const onScreen = (x >= -margin && x <= viewW + margin &&
            y >= -margin && y <= viewH + margin);

        // _perfOffscreen 已废弃（LiuYue 的视觉剔除已移除，改由 Shiroin_OffscreenSpriteCull 统一负责）。
        // 保留 _IsDisabledCounter：它同时是麻痹/眩晕/冻结等异常状态的实现载体，必须保留。
        if (!onScreen) {
            ev._IsDisabledCounter = (ev._IsDisabledCounter || 0) + 6;
        }
    }

};

// 刷新地图时段缓存。地图事件可直接调用 refreshTimePeriodCache()；
// 已读取小时的调用方可传入 hour，避免重复读取。返回当前地图缓存对象。
QJ.MPMZ.tl.refreshTimePeriodCache = function (hour = $gameSystem.hour()) {
    const temp = $gameMap.chahuiMapTemp || ($gameMap.chahuiMapTemp = {});
    // 四个时段互斥：白天6～15，黄昏16～17，晚上18～22，深夜23～5。
    const isDay = hour >= 6 && hour < 16;
    const isDusk = hour >= 16 && hour < 18;
    const isNight = hour >= 18 && hour < 23;
    const isLateNight = hour >= 23 || hour < 6;
    // 仅在状态变化时写入，同时清除上一时段的标记。
    if (temp.isDay !== isDay) temp.isDay = isDay;
    if (temp.isDusk !== isDusk) temp.isDusk = isDusk;
    if (temp.isNight !== isNight) temp.isNight = isNight;
    if (temp.isLateNight !== isLateNight) temp.isLateNight = isLateNight;
    return temp;
};

// 新版时间 HUD：背景、天数、装饰和时间都是独立弹幕，便于后续扩展效果。
QJ.MPMZ.tl.showGameTimeAndDaysnew = function (extraData = {}) {
    const backgroundScale = 1;
    const textScale = 1;
    const hudWidth = 370 * backgroundScale;
    const hudHeight = 88 * backgroundScale;
    const hudRight = 20;
    const hudTop = 20;
    const decorationWidth = 28 * backgroundScale;
    const textGap = 20;
    const dayTextWidth = 132;
    const timeTextWidth = 118;
    const getTimeText = (fakeTime) => {
        const realHour = $gameSystem.hour();

        // 地图昼夜状态仍然按真实时间计算
        QJ.MPMZ.tl.refreshTimePeriodCache(realHour);

        const hour = fakeTime?.hour ?? realHour;
        const minute = fakeTime?.minute ?? $gameSystem.minute();

        return hour.padZero(2) + ":" + minute.padZero(2);
    };
    const getDayText = () => "DAY" + $gameSystem.day();
    const setTextGlow = enabled => {
        const groupNames = ["gameTimeHudNewDay", "gameTimeHudNewTime"];
        for (const groupName of groupNames) {
            const bulletIds = $gameMap.getGroupBulletListQJ(groupName);
            for (const bulletId of bulletIds) {
                const bullet = $gameMap.bulletQJ(Number(bulletId));
                const img = bullet?.data?.img;
                if (!bullet || !img || img[0] !== 'T' || bullet._timeHudGlowEnabled === enabled) continue;
                bullet._timeHudGlowEnabled = enabled;
                img[1].textColor  = enabled ? "#ffffff" : "#ffffff";
                img[1].shadowBlur = enabled ? 10 : 0;
                img[1].shadowColor = enabled ? "rgba(0, 0, 0, 0.9)" : "rgba(0,0,0,0)";
                img[1].shadowOffsetX = 0;
                img[1].shadowOffsetY = 0;
                bullet.changeAttribute("img", img);
            }
        }
    };
    const setDecorationGlow = enabled => {
        const bulletIds = $gameMap.getGroupBulletListQJ("gameTimeHudNewDecoration");
        for (const bulletId of bulletIds) {
            const bullet = $gameMap.bulletQJ(Number(bulletId));
            if (!bullet || bullet._timeHudGlowEnabled === enabled) continue;
            bullet._timeHudGlowEnabled = enabled;
            bullet.changeAttribute(
                "img",
                enabled ? "imoutoUtil/TimeHUDDecoration" : "imoutoUtil/TimeHUDDecoration_glow"
            );
        }
    };

    if (extraData.updateText) {
        if (!this || this.dead || !this.data?.img?.[1]) return;
        const text = extraData.updateText === "day" ? getDayText() : getTimeText(this._fakeTime);

        const img = this.data.img;
        if (img[1].text !== text) {
            img[1].text = text;
            this.changeAttribute("img", img);
        }
        return;
    }
    // 背景仅在鼠标进入 HUD 区域时显示，进出各用 12 帧过渡。
    if (extraData.updateHover) {
        if (!this || this.dead) return;
        const centerX = Graphics.width - hudRight - hudWidth / 2;
        const centerY = hudTop + hudHeight / 2;
        const hovered = TouchInput.x >= centerX - hudWidth / 2 &&
            TouchInput.x <= centerX + hudWidth / 2 &&
            TouchInput.y >= centerY - hudHeight / 2 &&
            TouchInput.y <= centerY + hudHeight / 2;

        if (this._timeHudHovered !== hovered) {
            this._timeHudHovered = hovered;
            const from = Math.max(0, Math.min(1, Number(this.opacity) || 0));
            const to = hovered ? 1 : 0;
            this.changeAttribute("opacity", `0|${from}~12/${to}~99999999|${to}`);
            setTextGlow(!hovered);
            setDecorationGlow(hovered);
        }
        return;
    }

    if ($gameMap.getGroupBulletListQJ("gameTimeHudNew").length > 0) return;

    const zoom = $gameScreen.zoomScale();
    const centerX = Graphics.width - hudRight - hudWidth / 2;
    const centerY = hudTop + hudHeight / 2;
    const shootHudPart = (img, x, y, groupName, partScale, moveJS = []) => {
        const isTextImage = Array.isArray(img) && img[0] === 'T';
        return QJ.MPMZ.Shoot({
            img,
            position: [['S', x / zoom], ['S', y / zoom]],
            groupName: ["gameTimeHudNew", groupName],
            initialRotation: ['S', 0],
            imgRotation: ['S', 0],
            moveType: ['S', 0],
            scale: partScale / zoom,
            opacity: isTextImage ? 0.6 : 1,
            onScreen: true,
            z: "S",
            anchor: [0.5, 0.5],
            existData: [],
            moveJS
        });
    };

    const makeTextImage = (text, width, textAlign) => ['T', {
        text,
        arrangementMode: 0,
        textColor: "#b8b8b8",
        fontSize: 28,
        outlineColor: "rgba(0,0,0,0)",
        outlineWidth: 0,
        fontFace: "MPLUS2ExtraBold",
        fontItalic: false,
        fontBold: true,
        width,
        height: 44,
        textAlign,
        lineWidth: 0,
        lineColor: "#ffffff",
        lineRate: 1,
        backgroundColor: null,
        backgroundOpacity: 0,
        advanced: false,
        shadowBlur: 10,
        shadowColor: "rgba(0, 0, 0, 0.9)",
        shadowOffsetX: 0,
        shadowOffsetY: 0
    }];

    const background = shootHudPart(
        "imoutoUtil/TimeHUDbackground",
        centerX,
        centerY,
        "gameTimeHudNewBackground",
        backgroundScale,
        [10, 10, "QJ.MPMZ.tl.showGameTimeAndDaysnew.call(this, { updateHover: true })"]
    );
    if (background) {
        background._timeHudHovered = null;
        background.changeAttribute("opacity", 0);
    }

    shootHudPart(
        makeTextImage(getDayText(), dayTextWidth, 6),
        centerX - decorationWidth / 2 - textGap - dayTextWidth * textScale / 2,
        centerY,
        "gameTimeHudNewDay",
        textScale,
        [60, 60, "QJ.MPMZ.tl.showGameTimeAndDaysnew.call(this, { updateText: 'day' })"]
    );
    shootHudPart(
        "imoutoUtil/TimeHUDDecoration",
        centerX,
        centerY,
        "gameTimeHudNewDecoration",
        backgroundScale
    );
    shootHudPart(
        makeTextImage(getTimeText(), timeTextWidth, 4),
        centerX + decorationWidth / 2 + textGap + timeTextWidth * textScale / 2,
        centerY,
        "gameTimeHudNewTime",
        textScale,
        [60, 60, "QJ.MPMZ.tl.showGameTimeAndDaysnew.call(this, { updateText: 'time' })"]
    );
};

// 显示游戏内时间和天数
QJ.MPMZ.tl.showGameTimeAndDays = function (extraData = {}) {

    if (extraData.updateTime) {
        let img = this.data.img;
        let time = $gameSystem.hour().padZero(2) + ":" + $gameSystem.minute().padZero(2);
        if (img[1].text !== time) {
            img[1].text = time;
            this.changeAttribute("img", img);
        }
        return;
    }

    if (extraData.updateDay) {
        let img = this.data.img;
        let dayText = "\\FS[34]Day\\px[1]\\fi\\FS[52]" + $gameSystem.day();
        if (img[1].text !== dayText) {
            img[1].text = dayText;
            this.changeAttribute("img", img);
        }
        return;
    }

    if ($gameMap.getGroupBulletListQJ('gameTime').length === 0) {
        let time = $gameSystem.hour().padZero(2) + ":" + $gameSystem.minute().padZero(2);
        let timeArgs = {
            text: time,
            x: 1816,
            y: 72,
            width: -1,
            textAlign: 5,
            fontSize: 32,
            fontFace: "RiiTegakiFude",
            groupName: ['gameTime'],
            opacity: 1,
            scale: 1,
            z: "S",
            moveJS: [
                60, 60, "QJ.MPMZ.tl.showGameTimeAndDays.call(this, { updateTime: true })"
            ]
        };
        QJ.MPMZ.tl.customShootText(timeArgs);
    }

    if ($gameMap.getGroupBulletListQJ('gameDay').length === 0) {
        const Zoom = $gameScreen.zoomScale();
        QJ.MPMZ.Shoot({
            img: "imoutoUtil/gold",
            position: [['S', 1832/Zoom], ['S', 40/Zoom]],
            initialRotation: ['S', 0],
            moveType: ['S', 0],
            existData: [],
            moveType: ['S', 0],
            scale: 1/Zoom,
            onScreen: true,
            z: "S"
        });

        let moveJS = [];
        if ($dataMap?.note?.includes("<宅>")) {
            moveJS = [90, 90, "QJ.MPMZ.tl.showGameTimeAndDays.call(this, { updateDay: true })"];
        }
        let dayArgs = {
            text: "\\FS[34]Day\\px[1]\\fi\\FS[52]" + $gameSystem.day(),
            x: 1805,
            y: 30,
            width: -1,
            textAlign: 6,
            fontSize: 52,
            fontFace: "RiiTegakiFude",
            groupName: ['gameDay'],
            opacity: 1,
            scale: 1,
            z: "S",
            advanced: true,
            moveJS
        };
        QJ.MPMZ.tl.customShootText(dayArgs);
    }
};

// 右下角持有金UI
QJ.MPMZ.tl.showMoneyDisplay = function (extraData = {}) {
    /*
    QJ.MPMZ.Shoot({
        img: "imoutoUtil/gold",
        position: [['S', 905], ['S', 526]],
        initialRotation: ['S', 0],
        moveType: ['S', 0],
        existData: [],
        moveType: ['S', 0],
        scale: 0.5,
        onScreen: true,
        z: "S"
    });    

    let goldArgs = {
        text: window.systemFeatureText?.goldHeld?.join() || "Gold",
        x: 1890,
        y: 1050,
        width: 100,
        textAlign: 4,
        fontSize: ConfigManager.language > 1 ? 28 : 24,
        fontFace: "RiiTegakiFude",
        groupName: ['gold'],
        opacity: 1,
        scale: 1,
        z: "S"
    };
    QJ.MPMZ.tl.customShootText(goldArgs);
    */
    // 处理玩家身上未清算掉的金钱道具	
    const itemIdArray = [4, 5, 6, 7, 8, 9, 10, 11, 12];
    const allItems = $gameParty.allItems();
    for (const item of allItems) {
        if (!item) continue;
        if (!DataManager.isItem(item)) continue;
        if (!itemIdArray.includes(item.id)) continue;
        const qty = $gameParty.numItems(item);
        for (let i = 0; i < qty; i++) {
            QJ.MPMZ.tl.ex_playerDropsValueChange(item);
        }
    }
};

// 从者重置-生成
(() => {
    // 每张地图只保留当前队长的一项请求；状态不进入地图对象或存档。
    const pending = new WeakMap();
    const retryDelay = 100;

    function cancel(job) {
        if (pending.get(job.map) === job) pending.delete(job.map);
        if (job.timer !== null) clearTimeout(job.timer);
        job.timer = null;
    }

    function ownsCurrentMap(job) {
        return $gameMap === job.map && job.map.mapId() === job.mapId &&
            job.map._events === job.events && $gameParty === job.party &&
            job.party.leader() === job.actor;
    }

    function mapIsRunning() {
        const scene = SceneManager._scene;
        return scene && scene.constructor === Scene_Map && scene._mapLoaded &&
            scene._spriteset && scene.isStarted() && scene.isActive() &&
            !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring() &&
            SceneManager.isGameActive() && Graphics._app?.ticker?.started !== false &&
            !($gameSystem.getZzyTWFIsSetup?.() && $gameSystem.getZzyTWFTheWorlding?.());
    }

    function schedule(job) {
        if (job.timer === null) job.timer = setTimeout(() => run(job), retryDelay);
    }

    function run(job) {
        job.timer = null;
        if (pending.get(job.map) !== job || !ownsCurrentMap(job)) {
            cancel(job);
            return;
        }
        if (!mapIsRunning()) {
            schedule(job);
            return;
        }
        try {
            // 保留原有清理链；旧从者确实清理完毕后才读取最终装备并生成。
            if (job.map.drill_COET_getEventsByTag_direct("从者").some(event => !event._mistilteinnArmorId)) {
                QJ.MPMZ.deleteProjectile('servant', { a: ['S', "this._needJS=true"] });
                schedule(job);
                return;
            }
            regenerate(job);
            cancel(job);
        } catch (error) {
            cancel(job);
            throw error;
        }
    }

    function regenerate(job) {
        const { map, actor } = job;
        const eqs = actor.equips();
        let sacabambaspis = [], mistilteinn = [], cursedHand = 0, manekiNeko = 0;

        for (let i = 1; i < eqs.length; i++) {
            const a = eqs[i];
            if (a && DataManager.isArmor(a)) {
                const baseId = (typeof a.baseItemId === 'number') ? a.baseItemId : a.id;
                if (baseId === 36) manekiNeko++;
                if (baseId === 44) sacabambaspis.push(a.id);
                if (baseId === 81) mistilteinn.push(a);
                if (baseId === 47) cursedHand++;
            }
        }

        // 自动环绕型从者
        const bullets = $gameNumberArray.value(22);
        if (bullets.length > 0) QJ.MPMZ.tl.ex_orbitingBulletInitialization(bullets);

        // 招财猫
        if (manekiNeko > 0) {
            const { _x: XX, _y: YY } = $gamePlayer;
            map.spawnEventQJ(1, 118, XX, YY, false);
        }

        // 猪猪存钱罐
        if (actor.hasSkill(32)) {
            const { _x: XX, _y: YY } = $gamePlayer;
            const piggyBankCount = eqs.filter(e => e && DataManager.isArmor(e) && e.baseItemId === 37).length;
            // 同批生成，随后同步有效事件容器，让各猪的初始化能按实例依次绑定装备。
            // 不再遗留跨场景运行的延迟生成监听器。
            for (let i = 0; i < piggyBankCount; i++) {
                map.spawnEventQJ(1, 111, XX, YY, false);
            }

            if (eqs.some(e => e && DataManager.isArmor(e) && e.baseItemId === 38)) {
                const eid = map.spawnEventQJ(1, 112, XX, YY, false);
                const e = map.event(eid);
                if (e) {
                    e._needSE = false;
                    const cond = DrillUp.g_COFA_condition_list[6];
                    const pts = map.drill_COFA_getShapePointsWithCondition(Math.floor(XX), Math.floor(YY), "圆形区域", 3, cond);
                    if (pts.length) { const p = pts[(Math.random() * pts.length) | 0]; e.locate(p.x, p.y); }
                }
            }
        }

        // 薯条和海鸥
        if ($gameSwitches.value(223)) map.steupCEQJ(291, 1);

        // 谢里斯的诅咒手
        if (cursedHand > 0) QJ.MPMZ.tl.ex_XerisesCursedHand();

        // 萨卡班甲鱼
        if (sacabambaspis.length) {
            sacabambaspis.forEach(aid => {
                QJ.MPMZ.tl.SacabambaspisCycloneJetCannon.call($dataArmors[aid], "summon");
            });
        }

        // 魔剑按实例自行恢复，保留当前HP、唤醒计时及已存在的事件。
        mistilteinn.forEach(item => QJ.MPMZ.tl.MistilteinnServantEquipment(item));

        // 此时是正常运行的地图；只同步容器，不推进事件、战斗或地图时间。
        map.drill_COEM_updateAvailableEventChanged?.();
        map.drill_COEM_updateAvailableEventRemove?.();
    }

    QJ.MPMZ.tl.ServantResetAndRegeneration = function () {
        const map = $gameMap;
        const party = $gameParty;
        const actor = party?.leader();
        if (!map || !actor) return;
        const previous = pending.get(map);
        if (previous && ownsCurrentMap(previous)) return;
        if (previous) cancel(previous);
        const job = { map, mapId: map.mapId(), events: map._events, party, actor, timer: null };
        pending.set(map, job);
        // 首次也只登记：让同一次同步换装中的卸下、装备和技能修改先全部完成。
        schedule(job);
    };
})();

// 玩家攻击模式检测
QJ.MPMZ.tl.ex_playerAttackModeDetection = function () {

    const player = $gameParty.leader();
    // 死亡演出期间不补建攻击监听；复活并解除事件锁后恢复检测。
    if ($gameTemp._eventReserved || player?.hp <= 0) return;
    const weapon = player?.equips()?.[0];
    if (!weapon) return;
    if ($gamePlayer.isStealthMode()) return;
    if ($gameMap.getGroupBulletListQJ('attackMonitoring').length > 0) return;

    // 某个编组已存在弹幕则视为"正在攻击中",跳过本次监听
    const isBusy = (...groups) =>
        groups.some(g => $gameMap.getGroupBulletListQJ(g).length > 0);

    const weaponType = weapon.wtypeId;
    const SWORD_TYPES = [1, 2];
    const BOW_TYPES   = [3];
    const STAFF_TYPES = [5, 6, 7];

    // 剑:近战攻击监听
    if (SWORD_TYPES.includes(weaponType)) {
        if (isBusy('playerWeapon')) return;
        QJ.MPMZ.tl.ex_playermeleeAttackCheck();
        return;
    }

    // 弓:射击监听
    if (BOW_TYPES.includes(weaponType)) {
        if (isBusy('playerSkill', 'playerBow')) return;
        QJ.MPMZ.tl.ex_playerBowAttackCheck();
        return;
    }

    // 法杖:常驻显示监听
    if (STAFF_TYPES.includes(weaponType)) {
        if (isBusy('playerStaff')) return;
        QJ.MPMZ.tl.ex_staffAlwaysVisible();
        return;
    }

    // 特殊武器:按 baseItemId 分派
    switch (weapon.baseItemId) {
        case 61:  // 巨蜗吸尘器
            QJ.MPMZ.tl.ex_giantSnailVacuumsListener();
            break;
        case 4:   // 拳头
            QJ.MPMZ.tl.ex_punchAttackListener();
            break;
    }
};

// 捡取物品转化为金钱
QJ.MPMZ.tl.ex_playerDropsValueChange = function (item) {

    if (!item) return;

    const itemType = DataManager.isItem(item)
        ? "item"
        : DataManager.isWeapon(item)
            ? "weapon"
            : DataManager.isArmor(item)
                ? "armor"
                : null;

    if (!itemType) return;

    let yieldRate = 1;

    if ($gameParty.leader().hasSkill(43)) {
        yieldRate *= 2;
    }

    const price = item.price || 0;
    const totalValue = Math.floor(price * yieldRate);

    if ($gameParty.hasItem(item, false)) {
        $gameParty.gainGold(totalValue);
        $gameParty.loseItem(item, 1);
    }
};

// 背包大小描述
QJ.MPMZ.tl.ex_playerCheckInventory = function (type) {

    const player = $gameParty.leader();
    //保险
    if (player._weaponAmountBonus < 0) {
        player._weaponAmountBonus = 0;
    }
    if (player._armorAmountBonus < 0) {
        player._armorAmountBonus = 0;
    }

    const MAP = {
        weapon: {
            pool: () => $gameParty._weapons,               // 所有武器实例
            capacity: () => player._weaponAmountLimit
                + player._weaponAmountBonus
        },
        gear: {
            pool: () => $gameParty._armors,                // 所有防具实例
            capacity: () => player._armorAmountLimit
                + player._armorAmountBonus
        }
    };

    const cfg = MAP[type];
    if (!cfg) return "";

    // 统计数量 / 上限
    const currentValue = Object.values(cfg.pool()).length;
    const maximumValue = cfg.capacity();
    const rate = currentValue / maximumValue;

    // 颜色与超限提示
    let color = 6, extraDesc = "";
    if (rate >= 0.5) color = 14;
    if (rate >= 0.7) color = 2;
    if (rate >= 1) {
        color = 10;
        let lang = ConfigManager.language;
        extraDesc = "\\fs[18]\\c[10]" + window.systemFeatureText.bagFull;
    }

    return `\\c[${color}]${currentValue}\\c[0]/${maximumValue}  ${extraDesc}`;
};

// 技能描述生成
QJ.MPMZ.tl.ex_playerSetSkillDescription = function (item) {

    if (!window.skillDescription) return "";
    let lines = [];
    let skillId = item.id;
    let skill = window.skillDescription[String(skillId)];
    if (!skill) return "";

    const fontSize = (ConfigManager.language >= 2) ? "\\fr\\fs[16]" : "\\fr\\fs[18]";
    let skillName = skill.name;
    let skillLevel = "";
    // 技能等级显示
    if (skill.subtitle && skill.subtitle.join() === "true") {
        skillLevel = QJ.MPMZ.tl.playerSkillLevelDisplay(skillId);
    }
    // 技能开关状态
    if (item.animationId > 0) {
        let skillToggle = item.animationId - 1;
        skillToggle = window.skillDescription["skillToggle"][String(skillToggle)];
        skillLevel += `  \\fr\\fs[18]<${skillToggle}>`;
    }
    lines.push(`\\c[27]\\fs[28]${skillName} ${skillLevel}\\c[0]\\py[16]`);
    // 导入描述文本
    let descriptionArray = skill.description;
    let template = fontSize + "%TEXT%";
    descriptionArray = descriptionArray.map(t => template.replace("%TEXT%", t));
    descriptionArray[0] = `${fontSize}•` + descriptionArray[0];
    lines.push(...descriptionArray);

    // 技能特殊效果
    if (skill["ability"].length >= 1 && skill["ability"][0] !== "") {
        let abilityArray = skill["ability"];
        let template = `${fontSize}•\\c[108]` + "%TEXT%";
        abilityArray = abilityArray.map(t => template.replace("%TEXT%", t));
        lines.push(...abilityArray);
    }

    let combinedText = lines.join("\n");
    return combinedText;

};

// 物品、武器、装备描述生成
QJ.MPMZ.tl.ex_playerSetItemDescription = function (item, extra={}) {
  if (!item || !DataManager.isItem(item)) return "";

  const lines = [];
  const bodyFontSize = [0, 1, 12].includes(ConfigManager.language) ? 18 : 16;
  const statsPixelFontCode = "\\fn[x10y12pxDonguriDuel]";

  // 每种分类都从完整重置状态开始，防止颜色、斜体和字号泄漏到下一类。
  // 标题/正文/副标题/能力保持原有默认字体，只有属性数值使用旧版像素字体。
  const baseStyle = "\\fr";
  const textStyles = {
    title:       `${baseStyle}\\fs[28]`,
    body:        `${baseStyle}\\fs[${bodyFontSize}]`,
    subtitle:    `${baseStyle}\\fs[${bodyFontSize}]\\c[110]\\fi`,
    ability:     `${baseStyle}\\fs[${bodyFontSize}]`,
    stats:       `${baseStyle}${statsPixelFontCode}\\fs[30]`
  };

  // 独立物品适配
  let itemId = item.baseItemId != null ? item.baseItemId : item.id;

  let descTable = null;
  let colorCode = "";
  let showQuantity = false;

  // 判定类型 + 取颜色/描述表
  if (DataManager.isItem(item)) {
    descTable = window.itemsDescription;
    colorCode = ($gameTemp.drill_ITC_getColorCode_Item && $gameTemp.drill_ITC_getColorCode_Item(itemId)) || "";
    if (!!$gameTemp._shouldShowSwitchButton || $gameNumberArray.value(25).length === 0) showQuantity = true;
  }

  // 安全取：多语言描述对象
  const descObj = (descTable && descTable[String(itemId)]) ? descTable[String(itemId)] : null;

  // 工具：安全数组（避免 undefined.length）
  const asArray = (v) => Array.isArray(v) ? v : [];

  // 工具：把一种分类渲染成独立样式的多行文本。
  function pushStyledLines(arr, style, firstPrefix = "", eachPrefix = "") {
    const a = asArray(arr).filter(t => t != null && String(t) !== "");
    if (a.length <= 0) return;

    const mapped = a.map((text, index) =>
      style + eachPrefix + (index === 0 ? firstPrefix : "") + String(text)
    );
    lines.push(...mapped);
  }

  // 道具名（descObj 有则用 descObj.name，否则用 item.name）
  const nameSuffix = item.nameSuffix || "";
  const displayName = descObj 
    ? (item.needAlias ? (descObj["Alias"] || descObj["name"]) : descObj["name"]) || item.name
    : (item.name || "");

  let itemName = "";
  if (colorCode) {
    itemName = textStyles.title + "\x1bcsave\x1bcc[" + colorCode + "]" + displayName + nameSuffix + "\x1bcload";
  } else {
    itemName = textStyles.title + displayName + nameSuffix;
  }
  itemName += "\\py[12]";
  lines.push(itemName);
  if (extra.separatorLine) lines.push("\\HSEP");
  // 显示道具持有数
  if (showQuantity) {
	const shouldHide = descObj?.["beIndependent"];
    if (!shouldHide) {
      const num = $gameParty.numItems(item);
      let quantityText = (window.systemFeatureText && window.systemFeatureText["quantityHeld"])
        ? window.systemFeatureText["quantityHeld"].join()
        : "";
      quantityText = quantityText.replace(/\$\{[^}]*\}/g, num);
      if (quantityText) lines.push(textStyles.body + quantityText + "\\py[10]");
    }
  }

  // 道具效果与习得技能能力文本共用同一个道具图标前缀。
  const iconIndex = item.iconIndex || 0;
  const abilityPrefix = `•\\fs[32]\\i[${iconIndex}]${textStyles.ability}`;

  // 没有多语言记录：走旧逻辑（同样做安全处理）
  if (!descObj) {
    const bottom = item.infoTextBottom || "";
    const top = item.infoTextTop || "";
    if (bottom && top) {
      lines.push(textStyles.body + bottom, textStyles.body + top);
    } else if (bottom) {
      lines.push(textStyles.body + bottom);
    } else if (top) {
      lines.push(textStyles.body + top);
    }
  } else {
    if (extra.asProduct) {
        // subtitle
        const subtitleArr = descObj["productSubtitle"]?.length
        ? descObj["productSubtitle"]
        : descObj["subtitle"];    
        pushStyledLines(subtitleArr, textStyles.subtitle, "•");
        // 道具描述文本
        const descriptionArr = descObj["productDescription"]?.length
        ? descObj["productDescription"]
        : descObj["description"];    
        pushStyledLines(descriptionArr, textStyles.body, "•");
    } else {
        // subtitle
        const subtitleArr = (item.needAlias && descObj["AliasSubtitle"]?.length)
        ? descObj["AliasSubtitle"]
        : descObj["subtitle"];    
        pushStyledLines(subtitleArr, textStyles.subtitle, "•");
        // 道具描述文本
        const descriptionArr = (item.needAlias && descObj["AliasDescription"]?.length)
        ? descObj["AliasDescription"]
        : descObj["description"];    
        pushStyledLines(descriptionArr, textStyles.body, "•");
    }
    // 道具效果/能力
    pushStyledLines(descObj["ability"], textStyles.ability, "", abilityPrefix);
}

  // 独立物品的习得技能词条存在于实例本身，不能通过 baseItemId 回查。
  const learnedSkillIds = asArray(item.traits)
    .filter(trait => trait?.code === 43)
    .map(trait => trait.dataId);

  // 将所有习得技能的能力文本依次追加在物品 ability 文本下方。
  for (const skillId of learnedSkillIds) {
    const skillAbility = window.skillDescription?.[String(skillId)]?.ability;
    if (skillAbility !== undefined) {
      pushStyledLines(skillAbility, textStyles.ability, "", abilityPrefix);
    }
  }

  // 封闭本方法的文本状态，避免调用方在后面拼接内容时继承像素字体或分类效果。
  return lines.join("\n") + "\\fr";
};

// 装备与属性说明共用测量画布；仅运行时持有，不进入存档或显示树。
QJ.MPMZ.tl.ex_descriptionMeasureBitmap = (() => {
  let bitmap;
  return function () {
    if (!bitmap) bitmap = new Bitmap(1, 1);
    bitmap.fontFace = $gameSystem.mainFontFace();
    bitmap.fontSize = 22;
    bitmap.fontBold = false;
    bitmap.fontItalic = false;
    return bitmap;
  };
})();

// 武器/防具描述生成
QJ.MPMZ.tl.ex_playerSetEquipmentDescription = function (item, extra={}) {
  if (!item || !(DataManager.isWeapon(item) || DataManager.isArmor(item))) return "";
  const weapon = DataManager.isWeapon(item);
  const id = item.baseItemId != null ? item.baseItemId : item.id;
  const table = weapon ? window.weaponsDescription : window.armorsDescription;
  const desc = table?.[String(id)];
  const keywords = window.mapCommonEventDialogue?.equipmentDescriptionKeyword || {};
  const label = key => keywords[key] || key;
  const body = "\\fr\\fs[22]";
  const subtitle = body + "\\c[110]\\fi";
  const lines = [];
  const name = (item.needAlias ? desc?.Alias || desc?.name : desc?.name) || item.name || "";
  const color = weapon ? $gameTemp.drill_ITC_getColorCode_Weapon?.(item.id)
    : $gameTemp.drill_ITC_getColorCode_Armor?.(item.id);
  const title = name + (item.nameSuffix || "");
  lines.push("\\fr\\fs[28]" + (color ? "\x1bcsave\x1bcc[" + color + "]" + title + "\x1bcload" : title) + "\\py[12]");
  if (extra.separatorLine) lines.push("\\HSEP");

  let durabilityRow = null;
  if (Number(item.durMax) > 0 && Number(item.durability) >= 0) {
    const percent = Math.max(0, Math.min(100, Math.round(Number(item.durability) / Number(item.durMax) * 100)));
    durabilityRow = [label('durability'), percent + ' / 100', 1];
  }
  const stats = [];
  for (const [index, key, icon] of [[2, 'ATK', 2], [3, 'DEF', 4], [4, 'MAT', 3], [5, 'MDF', 5], [7, 'LUK', 6]]) {
    const flat = item.flatParams?.[index] || 0;
    const value = (item.params?.[index] || 0) + flat;
    const rate = item.rateParams?.[index] ?? 1;
    if (value === 0 && rate === 1) continue;
    let text = value === 0 ? '' : (flat > 0 ? '\\c[10]' + value + '\\c[0]' : String(value));
    if (rate !== 1) {
      const percent = Math.round((rate - 1) * 100);
      text += (text ? ' ' : '') + (percent > 0 ? '+' : '') + percent + '%';
    }
    stats.push([label(key), text, icon]);
  }
  const xparamDefs = [{ dataId: 6, key: 'ASP', icon: 8 }, { dataId: 7, key: 'HRG', icon: 9 }];
  for (const def of xparamDefs) {
    const sum = (item.traits || []).reduce((total, trait) =>
      total + (trait.code === 22 && trait.dataId === def.dataId ? trait.value : 0), 0);
    if (!sum) continue;
    const value = Math.round(sum * 100);
    stats.push([label(def.key), (value > 0 ? '+' : '\\c[20]') + value +
      (def.dataId === 7 ? '' : '%') + '\\c[0]', def.icon]);
  }
  const rankLineIndex = lines.length + (durabilityRow ? 1 : 0);
  if (stats.length || durabilityRow) {
    // Durability and attributes share one localized value column.
    const rows = durabilityRow ? [durabilityRow, ...stats] : stats;
    const measure = QJ.MPMZ.tl.ex_descriptionMeasureBitmap();
    const widths = rows.map(row => measure.measureTextWidth(row[0]));
    const iconAdvance = 36; // 24px slot + 8px gap + PX[4].
    const bodyWidth = extra.descriptionWidth || 368;
    const maxValueX = 240;
    const valueWidth = Math.ceil(Math.max(...rows.map(row =>
      measure.measureTextWidth(row[1].replace(/\\c\[\d+\]/gi, '')))));
    const column = Math.min(Math.ceil(Math.max(...widths)) + 72,
      maxValueX - iconAdvance, bodyWidth - iconAdvance - valueWidth - 4);
    rows.forEach((row, index) => {
      // Only exceptionally long names shrink; values keep their normal size.
      const nameSize = Math.min(22, Math.floor(22 * Math.max(1, column - 8) / widths[index]));
      measure.fontSize = nameSize;
      const nameWidth = measure.measureTextWidth(row[0]);
      measure.fontSize = 22;
      const name = nameSize < 22 ? '\\fs[' + nameSize + ']' + row[0] + '\\fs[22]' : row[0];
      lines.push(body + '\\dimg[' + row[2] + ']\\px[4]' + name +
        '\\px[' + (column - nameWidth) + ']' + row[1]);
    });
  }
  const rank = DataManager.itemRank(item);
  lines.splice(rankLineIndex, 0, body + '\\dimg[10]'.repeat(rank + 1));
  const array = value => Array.isArray(value) ? value.filter(text => text != null && String(text) !== '') : [];
  const section = (value, style = body) => {
    const texts = array(value);
    if (texts.length) lines.push(...texts.map((text, index) => style + (index === 0 ? '\\py[16]' : '') + text));
  };
  const variant = (normal, alias, product) => extra.asProduct && array(desc?.[product]).length
    ? desc[product] : !extra.asProduct && item.needAlias && array(desc?.[alias]).length
      ? desc[alias] : desc?.[normal];
  if (desc) {
    section(variant('description', 'AliasDescription', 'productDescription'));
  } else {
    section([item.infoTextBottom, item.infoTextTop]);
  }
  const abilities = array(desc?.ability);
  for (const trait of item.traits || []) {
    if (trait.code === 43) abilities.push(...array(window.skillDescription?.[String(trait.dataId)]?.ability));
  }
  section(abilities);
  section(variant('subtitle', 'AliasSubtitle', 'productSubtitle'), subtitle);
  return lines.join('\n') + '\\fr';
};


// 玩家武器换装
QJ.MPMZ.tl.ex_playerWeaponImage = function (fadeOut, weaponBroken) {
    
	let leader = $gameParty.leader();
	let weapon = leader.equips()[0];
    leader.removeStateCategoryAll('refreshNeeded');
    QJ.MPMZ.deleteProjectile('attackMonitoring');

    if (fadeOut) {
        QJ.MPMZ.deleteProjectile('playerWeaponImg', { d: [1, 10, 0] });
    } else {
        QJ.MPMZ.deleteProjectile('playerWeaponImg');
    }
    if (weapon) {
        let xx = 1872;
        let yy = 228;
        let pid = 74;
        $gameScreen.showPicture(pid, 'equip slot', 1, xx, yy, 100, 100, 255, 0);

        let posX = xx / $gameScreen.zoomScale();
        let posY = yy / $gameScreen.zoomScale();
        // 读档、换图或装备栏重建时也保持米斯特汀当前形态。
        const index = (weapon.baseItemId || weapon.id) === 37
            ? (leader.isStateAffected(96) ? 261 : 277)
            : weapon.iconIndex;

        if (leader.hasSkill(55)) {
		// 不可视效果	
            zz = "MF_UR";
        } else {
            zz = "A";
        }

        let iconScale = 0.5;
        if (Utils.isMobileDevice()) iconScale = 1;

        let playerWeaponImg = QJ.MPMZ.Shoot({
            groupName: ['playerWeaponImg', 'playerEquipment'],
            img: ['I', index],
            position: [['S', posX], ['S', posY]],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            scale: `0|0~10/1~5/${iconScale}~999999999|${iconScale}`,
            opacity: 1,
            immuneTimeStop: true,
            onScreen: true,
            moveType: ['S', 0],
            existData: [
                { t: ['S', 'this._broken', true], a: ['F', QJ.MPMZ.tl.ex_playerWeaponBroken], d: [0, 20] }
            ],
            moveJS: [
                [4, 30, `QJ.MPMZ.tl.ex_playerWeaponDurabilityMonitoring.call(this, 	$gameParty.leader().equips()[0])`]
            ],
            z: zz
        });
        
		if ($gameSwitches.value(444)) {
			QJ.MPMZ.deleteProjectile('weaponDurabilityReminder');
			QJ.MPMZ.tl.ex_playerWeaponDurabilityText(weapon);
		}

        // 绑定描述窗口
        const text = "QJ.MPMZ.tl.ex_playerSetEquipmentDescription($gameParty.leader()?.equips()[0], {separatorLine: true})";
        Saikey.MPMZ.bindPicture(pid, text, {
            //context: { weapon },
            decoration: "Gemini",
            minWidth: 450,
            maxWidth: 500,
            minHeight: 450,
            maxHeight: 850,
            needEval: true,
            textDisplayHeight: 850,
            paddingBottom: 100,
            fixedLineCount: 1
        });       
        // 刷新攻击模组
        if (weaponBroken) {
            setTimeout(() => QJ.MPMZ.tl.ex_playerAttackModeDetection(), 500);
            return;
        }
        QJ.MPMZ.tl.ex_playerAttackModeDetection();

    } else {
        let xx = 1872;
        let yy = 228;
        let pid = 74;
        $gameScreen.showPicture(pid, 'equip slot', 1, xx, yy, 100, 100, 255, 0);
        Saikey.MPMZ.clearPicture(pid);
    }

    if (leader.hasSkill(89) || leader.hasSkill(90) || leader.hasSkill(91)) {
        QJ.MPMZ.tl.ex_playerCloseRangePiercingAttackListeners();
    }  
        
};

// 玩家武器描述刷新
QJ.MPMZ.tl.ex_playerWeaponDescriptionRefresh = function (extra = {}) {

	let leader  = $gameParty.leader();
	let weapon  = leader.equips()[0];
    if (!weapon) return;

	if (extra.durabilityReminder) {
		// 武器耐久度显示器
        if (!$gameScreen.isPointerInnerPicture(74)) return;
		if ($gameMap.getGroupBulletListQJ('weaponDurabilityReminder').length > 0) return;
		QJ.MPMZ.tl.ex_playerWeaponDurabilityText(weapon);
		return;
	}

};

// 武器耐久度显示器文本
QJ.MPMZ.tl.ex_playerWeaponDurabilityText = function (weapon, extra = {}) {

  const DUR_INFINITY   = 114514;
  const POINTER_PIC_ID = 74;

  // 颜色阈值表
  const RULES = [
    { min: 40, text: "#ffffff", shadow: "#000000" },
    { min: 20, text: "#ffcfd7", shadow: "#bc8992" },
    { min:  5, text: "#ff738a", shadow: "#b85364" },
    { min: -Infinity, text: "#b9001f", shadow: "#b91e38" },
  ];

  const fadeOutAndKill = () => this.setDead({ t: ["Time", 0], d: [0, 30] });

  const getWeapon = () => weapon || $gameParty.leader().equips()[0];

  const buildDurImg = (wpn) => {
    if (!wpn) return null;

    const durMax = Number(wpn.durMax || 0);
    const dur    = Number(wpn.durability || 0);

    let rate = durMax > 0 ? (dur / durMax) * 100 : 0;

    let text = "";
    let fontSize = 12;

    if (dur >= DUR_INFINITY) {
      text = "∞";
      rate = 100;
      fontSize = 20;
    } else {
      text = Math.floor(rate) + "%";
    }

    const rule = RULES.find(r => rate > r.min) || RULES[RULES.length - 1];

    return {
      text,
      arrangementMode: 0,
      textColor: rule.text,
      fontSize,
      outlineColor: "#000000",
      outlineWidth: 0,
      fontFace: "MPLUS2ExtraBold",
      fontItalic: false,
      fontBold: true,
      immuneTimeStop: true,
      width: 60,
      height: 100,
      textAlign: 4,
      lineWidth: 0,
      lineColor: "#ffffff",
      lineRate: 1.0,
      backgroundColor: null,
      backgroundOpacity: 1,
      shadowBlur: 8,
      shadowColor: rule.shadow,
      shadowOffsetX: 0,
      shadowOffsetY: 0
    };
  };

  // =========================
  // 刷新耐久度
  // =========================
  if (extra.durabilityTextChange) { 
    const alwaysShow = $gameSwitches.value(444);
    const shouldShow = alwaysShow || $gameScreen.isPointerInnerPicture(POINTER_PIC_ID);
    if (!shouldShow) return fadeOutAndKill();

    const wpn = getWeapon();
    if (!wpn) {
      if (alwaysShow) fadeOutAndKill();
      return;
    }

    const durImg = buildDurImg(wpn);
    if (durImg) {
      // 显示内容(文本+颜色)没变就不重建文本位图——changeAttribute 会触发
      // 文本重渲染和 Drill 的 z 排序刷新，耐久不掉时全是白做
      const durKey = durImg.text + "|" + durImg.textColor;
      if (durKey !== this._durTextKey) {
        this._durTextKey = durKey;
        this.changeAttribute("img", ["T", durImg]);
      }
    }
    return;
  }

  // =========================
  // 监听器初始化
  // =========================
  const wpn = getWeapon();
  if (!wpn) return;

  const zoom = $gameScreen.zoomScale() || 2;
  const durImg = buildDurImg(wpn);
  if (!durImg) return;
  QJ.MPMZ.Shoot({
    img: ['T', durImg],
    position: [['S', 1905 / zoom], ['S', 302 / zoom]],
    groupName: ['weaponDurabilityReminder', 'playerEquipment'],
    initialRotation: ['S', 0],
    imgRotation: ['F'],
    opacity: '0|0~30/1~999999|1',
    moveType: ['S', 0],
    z: "A",
    scale: 1 / zoom,
    onScreen: true,
    anchor: [1, 1],
    existData: [],
    moveJS: [
      [30, 30, `QJ.MPMZ.tl.ex_playerWeaponDurabilityText.call(this, $gameParty.leader().equips()[0], { durabilityTextChange: true })`]
    ]
  });
};

// 耐久度归零玩家武器被破坏
QJ.MPMZ.tl.ex_playerWeaponBroken = function () {
	let player = $gameParty.leader();
	let obj    = player.equips()[0];
	if (!player || !obj) return;
    if (obj.unbreakable) return;

    // 播放随机 SE 音效
    let randomSeArray = ["剣で打ち合う3"];
    let randomSe = randomSeArray[Math.floor(Math.random() * randomSeArray.length)];
    let randomPitch = 85 + Math.randomInt(40);
    AudioManager.playSe({
        name: randomSe,
        volume: 100,
        pitch: randomPitch,
        pan: 0
    });

    // 取消攻击能力
    QJ.MPMZ.deleteProjectile('attackMonitoring');
    let posX, posY, mapX, mapY;
    // 标记武器破损的演出位置
    if ($gameMap.getGroupBulletListQJ('weaponMarker').length > 0) {
        let bulletId = $gameMap.getGroupBulletListQJ('weaponMarker')[0];
		posX = $gameMap._mapBulletsQJ[bulletId].inheritX();
		posY = $gameMap._mapBulletsQJ[bulletId].inheritY();
        mapX = $gameMap._mapBulletsQJ[bulletId]._realX;
        mapY = $gameMap._mapBulletsQJ[bulletId]._realY;
    } else {
		posX = $gamePlayer.screenBoxXShowQJ();
		posX = $gamePlayer.screenBoxYShowQJ();
        mapX = $gamePlayer.centerRealX()-0.5;
        mapY = $gamePlayer.centerRealY()-0.5;
    }

    // 武器破损闪光演出
	let name = "weaponBroken" + Math.randomInt(300);
    let data = $gameScreen._particle.particleSet(0, name, 'tilemap', 'aura_bp', 'above', mapX, mapY);  
    //$gameScreen._particle.particleUpdate(['aura_bp', 'pos', '0', '-12']);
    // $gameScreen._particle.particleUpdate(['aura_bp', 'color', '#ff4665']);
    if (data) data.clear = true;

    let chips = "weapon/weaponChip" + obj.baseItemId + "[6]";

    // 武器碎片破损粒子演出
    QJ.MPMZ.Shoot({
        initialRotation: 90,
        existData: [
            { t: ['Time', 6] }
        ],
        moveType: ['S', 0],
        position: [
            ['S', posX],
            ['S', posY]
        ],
        particles: [
            {
                img: chips,
                intervalTime: 1,
                bundleNumber: 5,
                synScale: true,
                offsetMin: [-36, -24, -10],
                offsetMax: [0, 24, 10],
                existTime: 80,
                disappearTime: 20,
                disappearScale: 0.5,
                scaleXMin: 1,
                scaleXMax: 1,
                moveType: [
                    '(()=>{let a = this.remA = this.remA ? this.remA : (Math.random()*3-1.5);return a*t;})()',
                    '(()=>{let a = t<30?t:(30+(t-30)/2);return 8/60*a*(60-a);})()'
                ]
            }
        ]
    });

    // 清理耐久度文本
    QJ.MPMZ.deleteProjectile('weaponDurabilityReminder');
    player.durabilityBreakItem(obj);

    // 移除特定状态并更新武器图像
    player.removeState(62);
    QJ.MPMZ.tl.ex_playerWeaponImage(true, true);
	
	// 记录被破坏武器数量
	let weaponBroken = $gameSelfVariables.value([1, 1, "weaponBroken"]);
    weaponBroken += 1;
	$gameSelfVariables.setValue([1, 1, "weaponBroken"], weaponBroken);
	if (weaponBroken > 99) {
        chahuiUtil.unlockSpecificAchievement("UnlimitedBladeWaste");
    } 

    // 武器破坏后且播放完演出效果强制唤出换装栏
	setTimeout(() => {      
      $gameTemp.reserveCommonEvent(101);
	}, 600);
};

// 玩家武器耐久度监听
QJ.MPMZ.tl.ex_playerWeaponDurabilityMonitoring = async function (weapon) {

  // --- 初始化状态（只做一次）---
  if (this._lastAboutToBreak == null) this._lastAboutToBreak = false;
  if (this._lastPower == null) this._lastPower = 0;
  // --- 无武器：清理并注销 ---
  if (!weapon) {
    QJ.MPMZ.deleteProjectile('playerWeaponImg');
    this._broken = false;
    this._aboutToBreak = false;
    return;
  }

  // 悬停耐久提示独立于破损/变色逻辑，沿用现有入口的悬停判定和去重。
  QJ.MPMZ.tl.ex_playerWeaponDescriptionRefresh({ durabilityReminder: true });
  
  if (weapon.unbreakable) return;
  const durMax = Number(weapon.durMax || 0);
  const dur = Number(weapon.durability || 0);
  if (durMax <= 0 || dur < 0) {
    this._broken = true;
    return;
  }

  // 安卓版扛不住tone渐变效果性能消耗，关了
  if (Utils.isMobileDevice()) return;

  // --- 计算阶段 ---
  const rate = dur / durMax;
  this._broken = (dur <= 0);

  let aboutToBreak = false;
  let power = 0;

  if (rate < 0.05) {
    aboutToBreak = true;
    power = 250;
    // 低耐久弹提示（仅一次）
    if (!this._brokenWarning) {
      this._brokenWarning = true;

      let lang = ConfigManager.language;
	  let checkName = "durabilityLow" + lang;
	  const ok = await Promise.resolve(
		  QJ.MPMZ.tl.checkPictureExists(['img','projectiles','weapon'], `${checkName}.rpgmvp`)
	  );	  
      if (!ok) lang = 2;
      const imgName = 'weapon/durabilityLow' + lang;

      QJ.MPMZ.Shoot({
        groupName: ['durabilityLow'],
        img: imgName,
        position: [['S', 480], ['S', 270]],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        scale: 0.5,
        opacity: '0|0~30/1~9999/1',
        onScreen: true,
        moveType: ['S', 0],
        existData: [{ t: ['Time', 120], d: [1, 30, 1.25] }],
        z: "A"
      });
    }
  } else if (rate < 0.20) {
    aboutToBreak = true;
    power = 100;
  } else if (rate < 0.40) {
    aboutToBreak = true;
    power = 40;
  }

  // --- tone 只在状态变更时更新 ---
  if (aboutToBreak !== this._lastAboutToBreak || power !== this._lastPower) {
    if (aboutToBreak) {
      const change = `0|0~45/${power}~45/0`;
      this.changeAttribute('tone', [change, 0, 0, 0]);
    } else {
      this.changeAttribute('tone', [0, 0, 0, 0]);
    }
    this._lastAboutToBreak = aboutToBreak;
    this._lastPower = power;
  }

  this._aboutToBreak = aboutToBreak;
};



// 玩家装备换装
QJ.MPMZ.tl.ex_playerArmorImage = function (id, extra={}) {

  const actor = $gameParty.leader();
  actor.removeStateCategoryAll('refreshNeeded');

  const imgIndex = 74 + id;
  const bulletName = 'playerArmorImg' + id;

  const xx = 1872;
  const yy = 228 + id * 80;

  const zoom = $gameScreen.zoomScale() || 2;
  const posX = xx / zoom;
  const posY = yy / zoom;

  // 先清理旧显示
  QJ.MPMZ.deleteProjectile(bulletName, extra.fadeOut ? { d: [1, 10, 0] } : undefined);
  QJ.MPMZ.deleteProjectile("equipmentEffect");

  // 当前装备
  const equip = actor.equips && actor.equips()[id];

  // 小工具：取得 picture 并绑定描述窗口
  const setupBean = (imgIndex, eid) => {
    if (!$gameScreen.picture(imgIndex)) return;
    const text = `QJ.MPMZ.tl.ex_playerSetEquipmentDescription($gameParty.leader()?.equips()[${eid}], {separatorLine: true})`;
    Saikey.MPMZ.bindPicture(imgIndex, text, {
        //context: { weapon },
        decoration: "Gemini",
        minWidth: 450,
        maxWidth: 500,
        minHeight: 450,
        maxHeight: 850,
        needEval: true,
        paddingBottom: 100,
        textDisplayHeight: 850,
        fixedLineCount: 1
    });    
  };

  const hideBean = (pictureId) => {
     Saikey.MPMZ.clearPicture(pictureId);
  };

  if (equip) {
    // 槽位底图
    $gameScreen.showPicture(imgIndex, 'equip slot', 1, xx, yy, 100, 100, 255, 0);
    const icon = equip.iconIndex;
    const iconScale = Utils.isMobileDevice() ? 1 : 0.5;

    const gear = QJ.MPMZ.Shoot({
      groupName: [bulletName, 'playerEquipment'],
      img: ['I', icon],
      position: [['S', posX], ['S', posY]],
      initialRotation: ['S', 0],
      imgRotation: ['F'],
      scale: `0|0~10/1~5/${iconScale}~999999999|${iconScale}`,
      opacity: 1,
      onScreen: true,
      immuneTimeStop: true,
      moveType: ['S', 0],
      existData: [],
      z: "A"
    });
    
    // 绑定装备描述窗口
    setupBean(imgIndex, id);

  } else {
    // 空槽
    $gameScreen.showPicture(imgIndex, 'equip slot', 1, xx, yy, 100, 100, 255, 0);
    hideBean(imgIndex);
	/*
	// 闪烁效果，但看起来性能消耗太高了
	if ($gameScreen.picture(imgIndex) && !Utils.isMobileDevice()) {
		$gameScreen.picture(imgIndex).drill_PCE_playSustainingFlickerCos( 518400000, 120 );
	}
	*/
  }

  // 技能监听
  if (actor.hasSkill(89) || actor.hasSkill(90) || actor.hasSkill(91)) {
    QJ.MPMZ.tl.ex_playerCloseRangePiercingAttackListeners();
  }
};

// 玩家拆卸装备时触发特殊效果
QJ.MPMZ.tl.ex_playerUnequippingSpecialEffects = function (index, Equip, effect) {

    if (effect != null) return;

    let actor = $gameParty.leader();
    if (!actor) return;
    if (!Equip) {
        Equip = actor.equips()[index];
    }
    if (!Equip) return;

    if (DataManager.isWeapon(Equip)) {
        return;
    }

    if (DataManager.isArmor(Equip)) {
        // 招财猫
        if (Equip.baseItemId == 36) {
            let equips = actor.equips().filter(equip => equip && equip.baseItemId === 36);
            equips = equips.length;
            if (equips <= 0) {
                let BName = 'manekiNeko';
                QJ.MPMZ.deleteProjectile(BName, { a: ['S', 'this._needJS=true'] });
            }
            return;
        }
        // 猪猪存钱罐
        if (Equip.baseItemId == 37) {
            let BName = 'piggyBank' + Equip.id;
            QJ.MPMZ.deleteProjectile(BName, { a: ['S', 'this._needJS=true'] });
            return;
        }
        // 贪欲存钱罐
        if (Equip.baseItemId == 38) {
            let BName = 'goldenPiggyBank';
            QJ.MPMZ.deleteProjectile(BName, { a: ['S', 'this._needJS=true'] });
            return;
        }
    }

};

// 拆卸玩家身上的指定装备
QJ.MPMZ.tl.ex_unequipPlayerSpecifiedEquipment = function (item, effect, KeepIt) {

    let actor = $gameActors.actor(1);
    let equips = actor.equips();
    let isWeapon = DataManager.isWeapon(item);
    let isArmor = DataManager.isArmor(item);
    //console.log(isArmor);
    for (let index = 1; index < equips.length; index++) {
        let equip = equips[index];

        if (!equip) continue; // 跳过空装备
        if (isArmor && equip.id === item.id) {
            actor.changeEquipById(index + 1, null, effect);
            $gameMap.steupCEQJ(100, index, { equipFadeOut: true, equipChange: true, equipIndex: index });
            if (!KeepIt) $gameParty.loseItem(equip, 1);
            //console.log(`成功卸下装备: ${item.name} (槽位: ${index+1})`);
            return;
        }
    }

    //console.log(`未找到需要卸下的装备: ${item.name}`);
};

// 玩家在深渊的时间流动
QJ.MPMZ.tl.ex_abyssTimeFlow = function () {
    
    this._timeCoolDown = this._timeCoolDown || 0;
    if (this._timeCoolDown > 0) {
        this._timeCoolDown--;
        return;
    }

    this._timeCoolDown = 5;
    if (this.time % 3600 > 3300) {
        // 同步游戏时长
        let playedTime = $gameSystem.truePlaytimeText(false, true);
        document.title = $dataSystem.gameTitle + `    [PlayTime: ${playedTime}]`;
        if (window.nw?.Window) nw.Window.get().title = document.title;
    }

    $gamePlayer.refresh();

    // 检查是否处于时停条件
    if (!$gameSwitches.value(118) && !QJ.MPMZ.tl.ex_playerAntiClickDetection("timeFlow")) {

        if (QJ.MPMZ.rangeAtk([['P'],['P']],['B','timeStopField'],[],['C',10]).length == 0) {
            // 如果身处时停领域内，时间不流动
            $gameSystem.add_minute(1);
        }

        // 强制结束当天行程(玩家不可移动状态不触发)
        if ($gameSystem.hour() >= 17 && $gameSystem._drill_PAlM_enabled && !Utils.isOptionValid("test")) {
            $gameSwitches.setValue(3, false);
            $gameMap.steupCEQJ(90, 1, {lockFlow: true});
        }
    }

    // 动态监听玩家可能持有的异常状态
    let leader = $gameParty.leader();
	let equippedWeapon = leader.equips()[0];
    // 法杖吟唱状态
    if (leader.isStateAffected(68)) {
        let clearStatesAndEffects = () => {
            leader.removeState(65);
            leader.removeState(68);
            $gamePlayer.drill_ECE_endSustainingFloating();
            $gameScreen._particle.particleClear('mahoujin_c-P');
            $gamePlayer.drill_EASA_setEnabled(true);
        };
        if (!equippedWeapon) {
            clearStatesAndEffects();
            return;
        }
        let weaponType = equippedWeapon?.wtypeId;
        let staffTypes = [5, 6, 7];
        if (!staffTypes.includes(weaponType)) {
            clearStatesAndEffects();
        }
    }
    // 玩家攻击模式检测
    QJ.MPMZ.tl.ex_playerAttackModeDetection.call(this);

    // 防止闪步BUFF持续
    if (leader.isStateAffected(63)) {
        if ($gameMap.getGroupBulletListQJ('senPo').length == 0) {
            leader.removeState(63);
        }
    }
    // 防止闪步太刀BUFF持续
    if (leader.isStateAffected(80)) {
        if ($gameMap.getGroupBulletListQJ('senpoTach').length == 0) {
            leader.removeState(80);
        }
    }
    // 麻痹状态-如果计时器不存在了，需要立即删除状态
    if (leader.isStateAffected(7)) {
        if (!$gameSystem.hasGameTimeEvent("state7")) {
            leader.removeState(7);
        }
    }
    // 冻结状态-如果计时器不存在了，需要立即删除状态
    if (leader.isStateAffected(9)) {
        if (!$gameSystem.hasGameTimeEvent("state9")) {
            leader.removeState(9);
        }
    }
    // 眩晕状态-如果计时器不存在了，需要立即删除状态
    if (leader.isStateAffected(11)) {
        if (!$gameSystem.hasGameTimeEvent("state11")) {
            leader.removeState(11);
        }
    }
    // 美食武器-随时间融化
    if (equippedWeapon) {
        let weaponId = leader.equips()[0]?.baseItemId;
        if ([51, 53].includes(weaponId)) {
            let value = 1;
            if (leader.isStateAffected(14)) value += 1;
            equippedWeapon.durability -= value;
        }
    }
    // 鹿管-时间到了
    if (leader.hasSkill(85)) {
        QJ.MPMZ.tl.ItsTimeEffect();
    }
};


//玩家穿透子弹
QJ.MPMZ.tl.ex_playerBulletPhasing = function () {

    if ($gameSystem._ZzyTWFTheWorlding) return true;
    if ($gameSwitches.value(100)) return true;
    if ($gamePlayer.isJumping() || $gamePlayer._opacity < 150) return true;
    return false;

};

//玩家受伤判定
QJ.MPMZ.tl.ex_playerDamageCheck = function (baseDamage, damageType = 1, effectId, probability, effectValue1, effectValue2) {

    // 无敌
    if ($gameSwitches.value(100)) return;

    let actor        = $gameParty.leader();
    let player       = $gamePlayer;
    let damageSource = this?.data?.groupName || [];
    

    if (!damageSource.includes("forceTrigger") && (player.drill_EFIE_isPlaying() || player.drill_EFOE_isPlaying())) return;

    if (actor._damageableCount > 0) {
        actor._damageableCount -= 1;

        let randomPitch = Math.randomInt(30) + 91;
        AudioManager.playSe({ name: "Damage5", volume: 40, pitch: randomPitch, pan: 0 });

        if (!Utils.isMobileDevice()) player.requestAnimation(141);
        // 伤害衰减
        if (this.opacity) {
            baseDamage *= this.opacity;
        }
        if (!damageSource.includes("ignoreDefense")) {
            // 物理伤害
            if (damageType === 1) {
                baseDamage -= actor.def;
                baseDamage *= actor.grd;
                baseDamage = Math.max(1, Math.min(baseDamage, 99999));
            }
            // 魔法伤害
            if (damageType === 2) {
                let damageReduction = 0.01 * chahuiUtil.magicDefenseDamageReduction(actor.mdf);
                baseDamage -= baseDamage * damageReduction;
                baseDamage *= actor.grd;
                baseDamage = Math.max(1, Math.min(baseDamage, 99999));
            }
        }
        let finalDamage = Math.floor(baseDamage);

        //伤害演出和实际受伤
        let posX = Math.randomInt(25) - 12;
        if (damageType === 1) {
            SimpleMapDamageQJ.put(2, -1, finalDamage, posX, -64);   //物理伤害演出
        } else if (damageType === 2) {
            SimpleMapDamageQJ.put(3, -1, finalDamage, posX, -72);	 //魔法伤害演出 
        }
        // 死亡登记
        if (finalDamage >= actor.hp) {
            QJ.MPMZ.tl.tryRecordOniiChanDefeatCause.call(this, {damageType, damage:finalDamage});
        }        
        actor.gainHp(-finalDamage);

        // 恶魔石板：受到至少 10 点伤害时释放冲击波
        if (actor.hasSkill(103) && finalDamage >= 5) {
            QJ.MPMZ.tl.ex_demonTabletPulse(finalDamage);
        }

        //装备效果判定
        if (finalDamage > 0) {
            QJ.MPMZ.tl.ex_playerHitTriggerEffect(finalDamage);
        }
        //重伤判定
        if (actor.hpRate() <= 0.2 && finalDamage > 1) {
            $gameScreen.startShake(1, 8, 30);
            QJ.MPMZ.tl.ex_playerDamageFlash();
        }
    }

    // 异常状态判定
    if (!effectId || !probability) return;
    if (effectId <= 0) return;
    probability = probability * 1000 * actor.stateRate(effectId);
    if (probability < Math.randomInt(100000)) return;
    // 中毒
    if (effectId === 5) {
        if (!effectValue1) effectValue1 = 1;
        if (!effectValue2) effectValue1 = 4;
        QJ.MPMZ.tl.ex_playerPoison(effectValue1, effectValue2);
    }
    // 出血
    if (effectId === 6) {
        if (!effectValue1) effectValue1 = 1;
        if (!effectValue2) effectValue1 = 4;
        QJ.MPMZ.tl.ex_playerBleeding(effectValue1, effectValue2);
    }
    // 打雷
    if (effectId === 7) {
        if (!effectValue1) effectValue1 = 1;
        QJ.MPMZ.tl.ex_playerElectrified(effectValue1);
    }
    // 炎上
    if (effectId === 8) {
        if (!effectValue1) effectValue1 = 1;
        if (!effectValue2) effectValue1 = 4;
        QJ.MPMZ.tl.ex_playerBurning(effectValue1, effectValue2);
    }
    // 冰结
    if (effectId === 9) {
        if (!effectValue1) effectValue1 = 1;
        QJ.MPMZ.tl.ex_playerFreeze(effectValue1);
    }
    // 眩晕
    if (effectId === 11) {
        if (!effectValue1) effectValue1 = 1;
        QJ.MPMZ.tl.ex_playerParalysis(effectValue1);
    }
    // 积水
    if (effectId === 93) {
        QJ.MPMZ.tl.ex_playerWaterlogged();
    }         
};

// 尝试记录哥哥死亡原因/ 死亡记录
QJ.MPMZ.tl.tryRecordOniiChanDefeatCause = function (extra={damage:1}) {
    const oniichan = $gameParty.leader();
    if ($gameTemp._eventReserved || oniichan._deadness) {
      // 这些情况不判断为死亡  
       return; 
    }
    let deadType = "unknown";
    oniichan._defeatRecord =  oniichan._defeatRecord || [];
    if (this?.data?.groupName) {
        deadType = this.data.groupName; 
    }
    let defeatRecord = {damage: extra.damage, type: deadType, deadTime: $gameSystem.day()};
    oniichan._defeatRecord.push(defeatRecord);

    // 击坠王成就
    if (!oniichan.hasSkill(9)) {
         let fallCount = 0;
         for (let i = 0; i < oniichan._defeatRecord.length; i++) {
              let record = oniichan._defeatRecord[i]?.type;
              record = Array.isArray(record) ? record.join("\n") : (record ?? "");
              if (record.includes("fallDamage")) {
                  fallCount += 1;
              }
         }
         if (fallCount >= 8) oniichan.learnSkill(9);
    }
    let deadString = Array.isArray(deadType) ? deadType.join("\n") : (deadType ?? "");
    if (deadString.includes("Musou Burst Stream")) {
        chahuiUtil.unlockSpecificAchievement("Shichosei");
    }
    if (deadString.includes("chahuiExpressHitBox")) {
        chahuiUtil.unlockSpecificAchievement("TransportedToIsekai");
    }
    chahuiUtil.unlockSpecificAchievement("PeopleDieIfTheyAreKilled");
};

// 玩家受击触发特效
QJ.MPMZ.tl.ex_playerHitTriggerEffect = function (damage) {
    const actor = $gameParty.leader();
    //炸弹魔自爆	
    if (actor.hasSkill(34)) {
        let chance = 10 + 6 * actor.skillMasteryLevel(34);
        if (chance > Math.randomInt(100)) {
            let posX = $gamePlayer.screenBoxXShowQJ();
            let posY = $gamePlayer.screenBoxYShowQJ();
            QJ.MPMZ.tl.ex_bombFiendSoul(posX, posY, { posFix: true });
        }
    }
    //苹果头套的回复效果	
    if (actor.hasSkill(52)) {
        if (Math.random() > 0.5) {
            let extra = 10 + 2 * actor.skillMasteryLevel(52);
            let heal = Math.randomInt(extra) + extra - 9;
            heal = Math.round(heal * actor.pha);
            actor.gainHp(heal);
            heal = heal.toString();
            QJ.MPMZ.Shoot({
                img: ['T', heal, 0, '#06ff00', 12],
                position: [['P'], ['P']],
                initialRotation: ['S', 0],
                imgRotation: ['F'],
                opacity: '0|1~90/0',
                moveType: ['S', '0|1~90/0.1~999/0.1'],
                existData: [{ t: ['Time', 90] }]
            });
        }
    }
    //贪欲存钱罐-玛门的索取	
    if (actor.isStateAffected(116)) {

        if (damage < 10) damage = 10;
        if ($gameParty._gold <= 0) return;
        $gameParty.gainGold(-damage);
        QJ.MPMZ.tl.spawnMoneyDropsByAmount(damage, -1);

    }
};

//玩家重伤演出
QJ.MPMZ.tl.ex_playerDamageFlash = function () {
	
	if ($gameMap.getGroupBulletListQJ('damageFlash').length > 5) return;
	
    QJ.MPMZ.Shoot({
        img: "damageFlash",
        groupName: ['damageFlash'],
        position: [['S', 0], ['S', 0]], 
		scale: 0.5,
        initialRotation: ['S', 0], 
		moveType: ['S', 0],
        opacity: '0|0~30/1~30/0', 
		anchor: [0, 0],
        imgRotation: ['F'], 
		existData: [
            { t: ['Time', 59] },
        ],
        z: "A", 
		onScreen: true
    })
};

//玩家感到兴奋
QJ.MPMZ.tl.ex_playerFeelsExcited = function () {
    let random = 80 + Math.randomInt(40);
    let se = { name: "039myuu_YumeSE_FukidashiHeart01", volume: 70, pitch: random, pan: 0 };
    AudioManager.playSe(se);

    let zoom = 1 / $gameScreen.zoomScale();

    QJ.MPMZ.Shoot({
        img: "imoutoUtil/feelsExcited",
        groupName: ['feelsExcited'],
        position: [['S', 0], ['S', 0]],
        scale: zoom,
        initialRotation: ['S', 0],
        moveType: ['S', 0],
        opacity: '0|0~30/1~30/0',
        anchor: [0, 0],
        imgRotation: ['F'],
        existData: [
            { t: ['Time', 59] },
        ],
        z: "A",
        onScreen: true
    })
};

//玩家可复活检测
QJ.MPMZ.tl.ex_playerCanRevive = function () {
    var actor = $gameParty.leader();
    // 火鸟的祝福
    if (actor.isStateAffected(77)) {
        $gameSystem.triggerGameTimeEventNow('fireBirdBlessing');
        actor.removeState(77);
        return 1;
    }

    var armorId = 26;
    var equips = actor.equips();
    var result = 0;

    for (var i = 0; i < equips.length; i++) {
        var item = equips[i];
        if (item && item.etypeId === 2 && item.baseItemId === armorId) {
            result = 1; // 拥有火鸟的羽毛
            break;
        }
    }

    return result;
};

// 玩家防误触检测:返回 true 表示"当前不应响应点击"
QJ.MPMZ.tl.ex_playerAntiClickDetection = function (type) {

    const player = $gamePlayer;
    const leader = $gameParty.leader();

    // 多数场景共享的基础拦截条件:不在深渊 / 忙碌锁 / 消息中 / 正在举物
    const baseBlocked =
        !$gameSwitches.value(3) ||
        $gameSwitches.value(14) ||
        $gameMessage.isBusy() ||
        player._drill_PT_is_lifting;

    // EASA 控制未启用
    const easaDisabled = !player._drill_EASA_enabled;

    switch (type) {
        case "generic":
            return baseBlocked;

        // 使用道具 / 投掷:基础条件 + EASA 未启用
        case "itemUsing":
        case "throwing":
            return baseBlocked || easaDisabled;

        // 举起:不走基础条件,独立判定
        case "lifting":
            return $gameSwitches.value(14) ||
                player._drill_PT_is_lifting ||
                easaDisabled ||
                player.drill_EASe_isPlayingAct();

        // 普通攻击:基础条件 + 事件运行中 + 特殊形态 + 装备槽点击
        case "normalAttack":
            return baseBlocked ||
                $gameMap.isEventRunning() ||
                leader._characterName === "$player_swim" ||
                leader._characterName === "$player_maid" ||
                QJ.MPMZ.tl.isPointerOverMistilteinnButton() ||
                QJ.MPMZ.tl.MistilteinnServantButton({capture: true}) ||
                // 右侧装备栏的粗略范围，使用游戏画布坐标。
                (TouchInput.x >= 1820 && TouchInput.x <= 1920 &&
                 TouchInput.y >= 168 && TouchInput.y <= 680);

        // 时间停止状态
        case "timeFlow":
            return $gameSystem._ZzyTWFTheWorlding;

        default:
            return true;
    }
};

//玩家快捷道具栏刷新
QJ.MPMZ.tl.ex_playerItemRefresh = function () {

    // Use the new list only after the player has committed an inventory edit.
    if (StandaloneItemScene.syncQuickItems()) return;

    const useableItems = [];
    let minItemId = Infinity;
    /*
    for (const item of $gameParty.allItems()) {
        if (DataManager.isItem(item) && item.note.includes('<useableItem>')) {
            useableItems.push(item.id);
            minItemId = Math.min(minItemId, item.id);
        }
    }

    Ritter.ActiveItem_System.updateActiveIds(useableItems);
    */

    const hotbar = SceneManager._scene?._skillUI;
    const slotNames = ['R Key', 'R Key M'];
    if (!hotbar || !slotNames.every(name => hotbar._slots.has(name))) return;

    // 无登记、无效道具、数量为 0，均视为没有可用道具。
    const slotData = $gameSystem._uiSlotData || {};
    const currentIds = slotNames.map(name => {
        const data = slotData[name];
        const item = data?.type === 'item' ? $dataItems[data.id] : null;
        return item && $gameParty.numItems(item) > 0 ? item.id : 0;
    });

    // 两边都有可用道具，不进行替换。
    if (currentIds.every(id => id > 0)) return;

    // 优先沿用另一边的有效道具；两边都无效才选择最小 ID。
    const targetId = currentIds.find(id => id > 0) || minItemId;
    if (!Number.isFinite(targetId)) return;

    for (let i = 0; i < slotNames.length; i++) {
        if (currentIds[i] !== targetId) {
            hotbar.setSkill(slotNames[i], 0, targetId, 0);
        }
    }
    hotbar.refreshSlots();

    // 确认两个槽位均登记成功后，再同步轮盘。
    const registered = $gameSystem._uiSlotData || {};
    if (!slotNames.every(name =>
        registered[name]?.type === 'item' &&
        registered[name].id === targetId
    )) return;

    Ritter.ActiveItem = targetId;
    Ritter.ActiveQuantity = $gameParty.numItems($dataItems[targetId]);

    if (Ritter.popupActive) {
        Ritter.ActiveItem_System.HudCycle();
    }
}

//玩家受击情况检查
QJ.MPMZ.tl.ex_PlayerHitCheck = function () {
    const player = $gameParty.leader();
    //玩家自动回复能力
    if (player.hrg > 0) {
        QJ.MPMZ.tl.ex_playerAutoRecovery();
    }
    //玩家可受伤次数刷新 
    let damageableCount = 5;
    player._damageableCount = damageableCount;

    //防止玩家没死成
    if (!$gameTemp._eventReserved && (player.isStateAffected(1) || player.hp <= 0)) {
        // 稻草人发动
        if (!$gameSystem.hasGameTimeEvent('scarecrowHeart') && player.isStateAffected(115)) {
            if (!$gameSystem.hasGameTimeEvent('scarecrowHeartActivated')) {
                $gameSystem.addGameTimeEvent({ key: 'scarecrowHeart', delayMinutes: 3 });
                $gameSystem.addGameTimeEvent({ key: 'scarecrowHeartActivated', delayMinutes: 60 });
                $gameScreen._particle.particleSet(0, 'dark_hole_r_3', 'player');
                $gameScreen.startTint([-100, -100, -100, 0], 450);
            }
        }

        $gameMap.steupCEQJ(4, 1);

    }
    // 举物状态重置
    if ($gamePlayer._drill_PT_is_lifting) {
        $gameSwitches.setValue(195, true);
    }

    // 长按触发闪步
    if (Input.drill_isKeyPressed('空格')) {
        if (!$gameSwitches.value(203)) {
            QJ.MPMZ.tl.ex_senpo.call(this);
        }
    }

};

// 玩家自动回复能力
QJ.MPMZ.tl.ex_playerAutoRecovery = function () {

    // 死亡条件下不发动
    if ($gameTemp._eventReserved) return;

    if ($gameMap.getGroupBulletListQJ('playerAutoRecovery').length > 0) {
        let player = $gameParty.leader();
        let heal = 100 * player.hrg * player.pha;
        heal = Math.floor(heal);
		if (heal <= 0) return;
        player.gainHp(heal);
        if (player.hpRate() < 1) {
            heal = heal.toString();
            QJ.MPMZ.Shoot({
                img: ['T', heal, 0, '#06ff00', 12],
                position: [['P'], ['P']],
                initialRotation: ['S', 0],
                imgRotation: ['F'],
                opacity: '0|1~90/0',
                moveType: ['S', '0|1~90/0.1~999/0.1'],
                existData: [{ t: ['Time', 90] }]
            });
        }

    } else {

        QJ.MPMZ.Shoot({
            groupName: ['playerAutoRecovery'],
            img: "states/Regen[8,7]",
            position: [['P'], ['P']],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            blendMode: 0,
            scale: 1,
            anchor: [0.5, 0.6],
            moveType: ['D', true],
            collisionBox: ['C', 1],
            existData: [
                { t: ['S', '$gameParty.leader().hrg > 0 && $gameTemp._eventReserved', false], d: [0, 30] }
            ],
            moveJS: [
                [0, 60, "if ($gameParty.leader().hpRate() < 1) {this.changeAttribute('opacity',1)} else {this.changeAttribute('opacity',0)}"]
            ],
            //deadJS:["$gameScreen._particle.particleClear('mahoujin_c-H')"]
        });
    }
};

// 玩家刷新攻击模式
QJ.MPMZ.tl.ex_playerUpdatesAttackMode = function () {

    // ==================== 清除旧的武器监听器 ====================
    ['playerWeapon', 'playerBow', 'playerStaff', 'playerPunch']
        .forEach(name => QJ.MPMZ.deleteProjectile(name));

    // ==================== 前置校验 ====================
    if ($gamePlayer.isStealthMode()) return;

    const weapon = $gameParty.leader()?.equips()?.[0];
    if (!weapon) return;

    // ==================== 按武器类型分派对应监听器 ====================
    const SWORD_TYPES = [1, 2];
    const BOW_TYPES = [3]; 
    const STAFF_TYPES = [5, 6, 7];

    if (SWORD_TYPES.includes(weapon.wtypeId)) {
        QJ.MPMZ.tl.ex_playermeleeAttackCheck();
    }
    if (BOW_TYPES.includes(weapon.wtypeId)) {
        QJ.MPMZ.tl.ex_playerBowAttackCheck();
    }    
    if (STAFF_TYPES.includes(weapon.wtypeId)) {
        QJ.MPMZ.tl.ex_staffAlwaysVisible();
    }
    // 拳头
    const weaponId = weapon.baseItemId || weapon.id;
    if (weaponId === 4) {
        QJ.MPMZ.tl.ex_punchAttackListener();
    }
};

// 玩家属性框/战斗力
QJ.MPMZ.tl.ex_playerAttributeRefresh = function (extra={}) {
    
    // 已存在信息框：仅更新文本
    if (extra.refreshTraits) {
        const actor = $gameActors.actor(1);
        if (!actor) return "";
        const keywords = window.mapCommonEventDialogue?.equipmentDescriptionKeyword || {};
        const label = key => keywords[key] || key;
        const body = '\\fr\\fs[22]';
        // 强制窗口恢复原有加成构成；显示模式由打开窗口时的绑定表达式传入。
        const showDetails = extra.forceDisplay === true;
        // Use the same localized label measurement and relative PX spacing as equipment descriptions.
        const detailOf = (value, index, positive, negative) => {
            if (!showDetails) return '';
            if (value >= 999) return ' \\fr\\c[10]\\fs[20] REACHLIMIT!';
            const plus = actor.paramPlus(index), flat = actor.paramFlat(index);
            let text = '';
            if (plus > 0) text += ` \\c[110]\\fs[20]\\fi(+${plus})`;
            if (flat > 0) text += ` \\c[${positive}](+${flat})\\c[0]`;
            if (flat < 0) text += ` \\c[${negative}](${flat})\\c[0]`;
            return text;
        };
        const percent = value => {
            const amount = Math.floor(value * 100);
            return (amount > 0 ? '+' : amount < 0 ? '\\c[2]' : '') + amount + '%\\c[0]';
        };
        // DIMG resources: combat power=11, healing/health=9, magic=3.
        const rows = [
            ['sentouryoku', String($gameVariables.value(113)), 11],
            ['ATK', actor.atk + detailOf(actor.atk, 2, 10, 2), 2],
            ['MAT', actor.mat + detailOf(actor.mat, 4, 23, 22), 3],
            ['DEF', actor.def + detailOf(actor.def, 3, 6, 14), 4],
            ['ASP', percent(actor.cnt), 8],
            ['MDF', String(actor.mdf) + (showDetails
                ? ` \\fs[20]\\c[31][-${chahuiUtil.magicDefenseDamageReduction(actor.mdf)}%]\\c[0]` : '') +
                (actor.mdf < 999 ? detailOf(actor.mdf, 5, 6, 14) : ''), 5],
            ['LUK', String(actor.luk), 6],
            ['SPD', String($gamePlayer.realMoveSpeed()), 7],
            ['HP', String(actor.mhp), 12]
        ];
        if (actor.mev !== 0) rows.push(['CSP', percent(actor.mev), 13]);
        if (actor.hrg !== 0) rows.push(['HRG', (actor.hrg < 0 ? '\\c[2]' : '') +
            Math.floor(actor.hrg * 100) * 3 + '/s\\c[0]', 9]);
        const measure = QJ.MPMZ.tl.ex_descriptionMeasureBitmap();
        const widths  = rows.map(row => measure.measureTextWidth(label(row[0])));
        const pad     = [0, 1, 2, 12].includes(ConfigManager.language) ? 64 : 32;
        const column  = Math.ceil(Math.max(...widths)) + pad;
        const lines   = ['\\fr\\fs[28]' + $gameStrings.value(121) + '\\py[12]', '\\HSEP'];
        rows.forEach((row, index) => lines.push(body + '\\dimg[' + row[2] + ']\\px[4]' + label(row[0]) +
            '\\px[' + (column - widths[index]) + ']' + row[1]));
        return lines.join('\n') + '\\fr';
    }
    // 刷新成就完成情况
    SMO?.AM?.refreshAchievements?.();
    QJ.MPMZ.tl.bindCheatCodeToAvatarFrame();
};

// 为头像框绑定作弊码功能
QJ.MPMZ.tl.bindCheatCodeToAvatarFrame = function (extra={}) {

    let PIC_ID = 111;
    // needEval 在窗口打开时执行，只在这里读取一次强制显示状态。
    const text = `QJ.MPMZ.tl.ex_playerAttributeRefresh({refreshTraits: true, forceDisplay: Saikey.MPMZ.pictureBean(${PIC_ID}).forceShow === true})`;
    const pic = $gameScreen.picture(PIC_ID);
    if (pic?._saikeyHoverBean) {
        // 旧存档可能保留旧表达式：仅更新该表达式，当前文本缓存留到下次打开时重算。
        const bean = pic._saikeyHoverBean;
        const source = bean._textSource;
        const expression = Array.isArray(source) && source.length === 1 ? source[0] : source;
        if (expression === "QJ.MPMZ.tl.ex_playerAttributeRefresh({refreshTraits: true})") {
            bean._textSource = text;
        }
        return;
    }
    const isMobile = Utils.isMobileDevice();
    const pos = PlayerHpHud.getPosition();
    // 未创建：初始化图片与信息框
    if (isMobile) {
        $gameScreen.showPicture(PIC_ID, "null", 0, pos.x, pos.y, 6800, 600, 0, 0);
    } else {
        $gameScreen.showPicture(PIC_ID, "null", 0, pos.x, pos.y, 4600, 400, 0, 0);
    }
    if (!extra.isAtHome) {
        Saikey.MPMZ.bindPicture(PIC_ID, text, {
            decoration: "Gemini",
            minWidth: 450,
            maxWidth: 700,
            minHeight: 450,
            maxHeight: 700,  
            needEval: true,
            textDisplayHeight: 700,
            paddingBottom: 100
        });
    }
    // 绑定作弊码输入器
    $gameScreen.setPictureCallCommon(PIC_ID, 405, 3, false);
};

//玩家水中检查
QJ.MPMZ.tl.ex_playerSwimmingCheck = function () {

    if (!this || !$gamePlayer._drill_EASA_enabled) return;

    const leader = $gameParty.leader();
    const playerX = Math.floor($gamePlayer.centerRealX());
    const playerY = Math.floor($gamePlayer.centerRealY());
    const inWater = $gameMap.regionId(playerX, playerY) === 8 && !$gamePlayer.isJumping() && $gamePlayer._Drill_ECE.playing_type !== "空中飘浮";

    /* 玩家在水中 -------------------------------------------------- */
    if (inWater) {

        this.changeAttribute?.('opacity', 0);	
        if (!$gameMap.chahuiMapTemp?.isPlayerInWater) {
			$gameMap.chahuiMapTemp.isPlayerInWater = true;
			QJ.MPMZ.tl.handlePlayerWaterEntryOrExit.call(this, { Entry: true });
			return;
		}
        if (leader._characterName !== '$player_swim') {
            $gameScreen._particle.particleGroupSet(0, 'splash_cp', 'player');
            $gamePlayer.drill_EASe_stopAct();
            leader._characterName = '$player_swim';
            $gamePlayer.refresh();
            $gamePlayer.drill_EASA_setEnabled(true);
            leader.addState(67);
            $gameSwitches.setValue(14, true);
        }

        /* 玩家离开水面 ----------------------------------------------- */
    } else {

        if ($gameStrings.value(20).trim() === '') {
            this.changeAttribute?.('opacity', 0.8);
        }
		
        if ($gameMap.chahuiMapTemp?.isPlayerInWater) {
			$gameMap.chahuiMapTemp.isPlayerInWater = null;
			QJ.MPMZ.tl.handlePlayerWaterEntryOrExit.call(this, { Exit: true });
			return;
		}

        if (leader._characterName === '$player_swim') {
            QJ.MPMZ.tl.handlePlayerWaterEntryOrExit.call(this, { Exit: true });
        }
    }
};

QJ.MPMZ.tl.handlePlayerWaterEntryOrExit = function (extra={}) {
    
   const player = $gamePlayer;
   const leader = $gameParty.leader();
   if (!player._drill_EASA_enabled) return;   

   $gameSystem._drill_COI_map_mouse = false;
   TouchInput._mousePressed = false;
   player.drill_PT_clearLifting();
   setTimeout( () => {
        $gameSystem._drill_COI_map_mouse = true;
        let se = { name: "水面に浮かび上がる", volume: 80, pitch: 90+Math.randomInt(20), pan: 0 };
        AudioManager.playSe(se);        

        if (extra.Entry) {
            // 进入水面
            if (player.isJumping()) return;
            $gameSwitches.setValue(14, true);
            leader._characterName = "$player_swim";
            leader.addState(67);
            $gameScreen._particle.particleGroupSet(0,'splash_cp','player');
        }

        if (extra.Exit) {
            // 离开水面
            $gameSwitches.setValue(14, false);
            if (player.isStealthMode()) {
                leader._characterName = "$player_maid";
            } else {
                leader._characterName = "$player";
            }         
            leader.removeState(66);
            leader.removeState(67);   
        } 

        player.refresh(); 
        player.drill_EASA_setEnabled( true );              
    }, 20);
};

// 玩家是否可移动（返回true就是卡墙里了）
QJ.MPMZ.tl.isPlayerImmovable = function (playerX, playerY, extra = {}) {

    let noPass = false;
    let region = $gameMap.regionId(playerX, playerY);
    if ($gameNumberArray.value(5).includes(region)) {
        noPass = true;
    }
    let canThrough = $gamePlayer._through || $gamePlayer.isJumping() || $gameSwitches.value(100);
	
	if (extra.dropsCheck) {
		return	noPass && !canThrough;
	}
	
    let canMove = $gamePlayer.canPass(playerX, playerY, 2) ||
        $gamePlayer.canPass(playerX, playerY, 4) ||
        $gamePlayer.canPass(playerX, playerY, 6) ||
        $gamePlayer.canPass(playerX, playerY, 8);
    return	(noPass && !canThrough) || !canMove;
};
// 玩家卡墙检查
QJ.MPMZ.tl.ex_playerStuckCheck = function () {

    if ($gameMessage.isBusy()) {
        QJ.MPMZ.tl.ex_playerAttackCommandBlock();
    }

    let playerX = Math.floor($gamePlayer.centerRealX());
    let playerY = Math.floor($gamePlayer.centerRealY());

    if (QJ.MPMZ.tl.isPlayerImmovable(playerX, playerY)) {

        // 卡墙的碰撞伤害
        QJ.MPMZ.tl.ex_playerStuckCollisionDamage();

        var condition = DrillUp.g_COFA_condition_list[10];
        var c_area = $gameMap.drill_COFA_getShapePointsWithCondition(playerX, playerY, "圆形区域", 8, condition);

        if (c_area.length > 0) {
            var p = c_area[Math.floor(Math.random() * c_area.length)];
            var xPlus = p.x - playerX;
            var yPlus = p.y - playerY;
            $gamePlayer.jump(xPlus, yPlus);
        } else {
            $gamePlayer.jump(0, 0);
        }
    }

};

// 视情况切换行走图动画类型
QJ.MPMZ.tl.ex_playerSwitchesSpiritType = function () {

    const player = $gamePlayer;
    const actor  = $gameParty.leader();
    if (!player._drill_EASe_controller) return;
    const controller = player._drill_EASe_controller.drill_data();
    if (!controller) return;

    // 初始化移速记录
    actor._baseSpeed = actor._baseSpeed || 8;
    let baseSpeed = actor._baseSpeed;
    let extraSpeed = 0;

    // 处于奔跑状态
    if (ConfigManager.alwaysDash) {
        player._moveSpeed = baseSpeed + extraSpeed;
        return;
    }
    // 处于走路或潜行状态
    if (actor.hasSkill(10) && $gameSwitches.value(145)) {
        // 忍者潜行
        controller.state_tank[0].tag_tank = [];
        controller.state_tank[31].tag_tank = ["<行走图-移动>"];
        extraSpeed += Math.floor(actor.skillMasteryLevel(10) / 2) - 4;
        // 激活潜行检测脚本
        QJ.MPMZ.Shoot({
            groupName: ['playerStealth'],
            position: [['P'], ['P']],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            anchor: [0.5, 0.5],
            collisionBox: ['C', 60],
            moveType: ['D', true],
            existData: [
                { t: ['S', '$gameSwitches.value(145)', false] },
                { t: ['G', ['"enemy"']], a: ['S', "QJ.MPMZ.tl.ex_playerStealthDetectionRange.call(this, {target: target})"], p: [-1, true, true], c: ['T', 0, 30, true] },
            ],
            moveJS: [
                [30, 15, "QJ.MPMZ.tl.ex_playerStealthDetectionRange.call(this)"]
            ],
        });
    } else {
        controller.state_tank[0].tag_tank = ["<行走图-移动>"];
        controller.state_tank[31].tag_tank = [""];
    }

    player._moveSpeed = baseSpeed + extraSpeed;
};

// 玩家潜行中范围检测
QJ.MPMZ.tl.ex_playerStealthDetectionRange = function (args={}) {

    if (args.target instanceof Game_Event) {

        let chasing = false;
        let moved = $gamePlayer.isMoved();
        let alerted = !args.target._shouldAlert && args.target._canBeAlerted;
        if (args.target._enemyState && args.target._enemyState === 2) {
            chasing = true;
        }

        if (moved && alerted && !chasing) {

            // 标记子弹
            const randomX = Math.randomInt(1600) - 300;
            const name = 'stealth' + randomX;
            let bullet = QJ.MPMZ.Shoot({
                img: "null1",
                groupName: [name],
                position: [['S', randomX], ['S', 0]],
                initialRotation: ['S', 0],
                imgRotation: ['F'],
                onScreen: true,
                moveType: ['S', 0],
                scale: 0.5,
                existData: [
                    { t: ['Time', 61] }
                ],
            });

            let index = bullet.index;
            let posX = $gamePlayer.screenBoxXShowQJ();
            let posY = $gamePlayer.screenBoxYShowQJ() + 20;
            QJ.MPMZ.Shoot({
                img: "kosokoso",
                //groupName: ['sushiPudding'],
                position: [['S', posX], ['S', posY]],
                initialRotation: ['S', 0],
                imgRotation: ['S', 0],
                moveType: ['TB', name, 1.5, 10, 20],
                opacity: '0|0~30/1~60/0',
                scale: 0.5,
                z: "W",
                existData: [
                    { t: ['Time', 60], d: [0, 30] }
                ],
                moveF: [
                    //[90,999,QJ.MPMZ.tl.ex_sushiPuddingSummonAki]
                ],
                timeline: ['S', 0, 40, [-1, 8, 20]],
            });
            // 增加熟练度
            if (Math.random() > 0.4) {
                QJ.MPMZ.tl.ex_playerStealthProficiencyIncreased(1);
            }
        }
    }

};

// 潜行技能熟练度变化
QJ.MPMZ.tl.ex_playerStealthProficiencyIncreased = function (value = 0) {
    const player = $gameParty.leader();
    const skillId = 10;
    if (value !== 0) {
        player.gainSkillMasteryUses(skillId, value);
    }
    const uses = player.skillMasteryUses(skillId);
    const masteryTable = [4, 15, 50, 150, 500, 1600, 4800, 12000, 24000, 36000];
    let newLevel = 0;
    for (let i = 0; i < masteryTable.length; i++) {
        if (uses >= masteryTable[i]) {
            newLevel = i + 1;
        } else {
            break;
        }
    }
    // 猎人鞋效果
    if (player.hasArmor($dataArmors[4])) {
        newLevel = Math.max(3, newLevel);
    }

    // 猎人套装效果只改变有效等级，不应通过 gainSkillMasteryLevel
    // 修改永久熟练度；后者还会把累计 uses 清零。
    const hunterArmorIds = [4, 24, 25, 30, 51];
    const hasHunterSet = player.hasWeapon($dataWeapons[102]) &&
        hunterArmorIds.every(id => player.hasArmor($dataArmors[id]));
    if (hasHunterSet) {
        newLevel = $dataSkills[skillId].masteryMaxLevel;
    }

    player.setSkillMasteryLevel(skillId, newLevel);
    player.setSkillMasteryUses(skillId, uses);

};

// 剑术修行
QJ.MPMZ.tl.playerSwordsmanshipTraining = function (extra = 0) {
    const player  = $gameParty.leader();
    const skillId = 26; 
    if (extra === 1) {
        return player.skillMasteryUses(skillId);
    }
    if (extra === 2) {
        let level = player.skillMasteryLevel(skillId);
        return Math.floor(1.8**level);
    }
    return "error"       
};

// 卡墙的碰撞伤害
QJ.MPMZ.tl.ex_playerStuckCollisionDamage = function () {

    if (!Utils.isMobileDevice()) $gamePlayer.requestAnimation(140);
    var realDamage = Math.floor($gameParty.leader().mhp * 0.05);
    SimpleMapDamageQJ.put(2, -1, realDamage, 0, -72);
    $gameParty.leader().gainHp(-realDamage);

    QJ.MPMZ.Shoot({
        img: "animehit[5,4]",
        position: [['P'], ['P']],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        collisionBox: ['C', 1],
        moveType: ['S', 0],
        existData: [
            { t: ['Time', 19] },
        ],
    });
};

//玩家坠落检测
QJ.MPMZ.tl.ex_playerFallCheck = function (Terrain) {

    // 确实处于踩空状态没有借助落脚点
    var condition1 = !$gameSwitches.value(188) && (Terrain || $gameMap.regionId(Math.floor($gamePlayer.centerRealX()), Math.floor($gamePlayer.centerRealY())) === 250);

    // 没有死因记录也不是虚无状态
    var condition2 = $gameStrings.value(20).trim() == "" && $gamePlayer._opacity > 100 && !$gamePlayer.isJumping() && !$gameTemp._eventReserved;

    var condition3 = $gameMap.getGroupBulletListQJ('playerInAir').length === 0

    return condition1 && condition2 && condition3;

};

//玩家攻击指令阻塞（防止对话框关闭时失误攻击）
QJ.MPMZ.tl.ex_playerAttackCommandBlock = function () {

    if ($gameMap.getGroupBulletListQJ('attackBlock').length == 0) {

        $gameSwitches.setValue(14, true);
        QJ.MPMZ.Shoot({
            img: "null1",
            groupName: ['attackBlock'],
            extra: 0,
            existData: [
                { t: ['Time', 600] },
                { t: ['S', "this.data.extra > 4", true] },
            ],
            moveJS: [
                [30, 15, "if($gameMessage.isBusy()){this.data.extra=0}else{this.data.extra+=1}"]
            ],
            deadJS: [
                "$gameSwitches.setValue(14, false)"
            ]
        });

    }

};

//检查玩家背包中武器容量
QJ.MPMZ.tl.checkplayerWeaponWeight = function () {
    const player = $gameParty.leader();
    if (player._weaponAmountLimit === undefined) player._weaponAmountLimit = 10;
    if (player._weaponAmountBonus === undefined) player._weaponAmountBonus = 0;
    const limit = player._weaponAmountLimit + player._weaponAmountBonus;
    const weapons = Object.values($gameParty._weapons).length;

    if (weapons < limit) return true;
    if ($gameTemp._inventoryWeightWarningActive) return false;

    const gameTemp = $gameTemp;
    gameTemp._inventoryWeightWarningActive = true;
    setTimeout(() => {
        gameTemp._inventoryWeightWarningActive = false;
    }, 500);

    var randomPitch = Math.randomInt(40) + 80;
    var se = { name: "014myuu_YumeSE_SystemBuzzer03", volume: 55, pitch: randomPitch, pan: 0 };
    AudioManager.playSe(se);

	let textArray = window.mapCommonEventDialogue?.inventoryOverweight?.weapon;
	if (!textArray) textArray = "Can’t carry more weapons!";
	let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
	text = "\\fs[28]\\c[101]\\dDCOG[11:1:1:1]" + text;
    let posX = $gamePlayer.screenX() * $gameScreen.zoomScale();
    let posY = ($gamePlayer.screenY() * $gameScreen.zoomScale()) - 48;
    $gameTemp.drill_GFTT_createSimple([posX, posY], text, 5, 0, 120);
    return false;

};


//检查玩家背包中装备容量
QJ.MPMZ.tl.checkplayerGearWeight = function () {
    const player = $gameParty.leader();    
    if (player._armorAmountLimit === undefined) player._armorAmountLimit = 20;
    if (player._armorAmountBonus === undefined) player._armorAmountBonus = 20;
    const limit = player._armorAmountLimit + player._armorAmountBonus;
    const armors = Object.values($gameParty._armors).length;

    if (armors < limit) return true;
    if ($gameTemp._inventoryWeightWarningActive) return false;

    const gameTemp = $gameTemp;
    gameTemp._inventoryWeightWarningActive = true;
    setTimeout(() => {
        gameTemp._inventoryWeightWarningActive = false;
    }, 500);

    var randomPitch = Math.randomInt(40) + 80;
    var se = { name: "014myuu_YumeSE_SystemBuzzer03", volume: 55, pitch: randomPitch, pan: 0 };
    AudioManager.playSe(se);

	let textArray = window.mapCommonEventDialogue?.inventoryOverweight?.gear;
	if (!textArray) textArray = "Can’t carry more gears!";
	let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
	text = "\\fs[28]\\c[101]\\dDCOG[11:1:1:1]" + text;
    let posX = $gamePlayer.screenX() * $gameScreen.zoomScale();
    let posY = ($gamePlayer.screenY() * $gameScreen.zoomScale()) - 48;
    $gameTemp.drill_GFTT_createSimple([posX, posY], text, 5, 0, 120);
    return false;
};

//检查玩家背包中装备容量
QJ.MPMZ.tl.upgradeWeaponArmorLimit = function (type) {

    const isWeapon = (type === 'weapon');
    const isArmor = (type === 'armor');
    if (!isWeapon && !isArmor) {
        return false;
    }

    const actor = $gameParty.leader();
    if (!actor) return false;


    if (actor._weaponAmountLimit === undefined) actor._weaponAmountLimit = 10;
    if (actor._armorAmountLimit === undefined) actor._armorAmountLimit = 20;

    const limitKey = isWeapon ? '_weaponAmountLimit' : '_armorAmountLimit';
    let currentLimit = actor[limitKey];
    const maxLimit = 50;

    if (currentLimit >= maxLimit) {
        return false;
    }

    const base = isWeapon ? 10 : 20;
    const upgrades = currentLimit - base;        // 已经扩容过多少次
    const cost = Math.min(128, Math.pow(2, upgrades));

    if ($gameParty.numItems($dataItems[312]) < cost) {
        return false;
    }

    $gameParty.loseItem($dataItems[312], cost);

    actor[limitKey] = currentLimit + 1;
    return true;
};


//=============================================================================
//体术
//=============================================================================



//闪步
QJ.MPMZ.tl.ex_senpo = function () {

    // 传送开始后旧地图仍可能多更新一帧；此时禁止启动新的闪步弹幕。
    if (!$dataMap || $gamePlayer.isTransferring()) return;
    if (!$dataMap.note?.startsWith("<深渊>")) return;
    const leader = $gameParty.leader();

    // 屁股痛
    if (leader.isStateAffected(61)) return;

    if ($gameMessage.isBusy() || $gameSwitches.value(14) && !leader.isStateAffected(67)) return;
    // 潜行状态不允许冲刺
    if (!ConfigManager.alwaysDash && $gameSwitches.value(145)) return;

    if ($gameSwitches.value(203) || $gameSwitches.value(95) || $dataMap.disableDashing) {
		
		let textArray = window.mapCommonEventDialogue && window.mapCommonEventDialogue.skillOnCooldown?.[0];
        if (!textArray) textArray = "Skill On Cooldown!!";
        let text = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
        text = "\\fs[28]\\c[101]\\dDCOG[11:1:1:1]" + text;
        const x = $gamePlayer.screenX() * $gameScreen.zoomScale();
        const y = ($gamePlayer.screenY() * $gameScreen.zoomScale()) - 48;
        $gameTemp.drill_GFTT_createSimple([x, y], text, 5, 0, 90);
        AudioManager.playSe({ name: "012myuu_YumeSE_SystemBuzzer01", volume: 70, pitch: 100, pan: 0 });
        return;
    }

    if ($gameMap.getGroupBulletListQJ('senpoTachi').length > 0) return;
    if ($gameMap.getGroupBulletListQJ('playerSkill').length > 0) return;
    // 铁砧打铁
    if (leader.hasSkill(77) && $gameMap.getGroupBulletListQJ('Anvil').length <= 0) {
        $gameTemp.reserveCommonEvent(307);
        return;
    }

    // 技能持续时间，基于玩家技能熟练度增加
    let skillDuration = 15 + leader.skillMasteryLevel(39);
    let time = 10;

    // 根据状态选择演出效果
    const isSpecialState = leader.isStateAffected(67);
    let r, g, b;

    if (!isSpecialState) {
        $gameScreen._particle.particlePlay(0, "fuss_startdash", "player", "def", "0.9");
        [r, g, b] = [255, 150, 0];
    } else {
        $gameScreen._particle.particleGroupSet(0, "splash_cp", "player");
        [r, g, b] = [50, 140, 200];
    }
    let color = [r, g, b, 255];

    // 播放音效
    AudioManager.playSe({ name: "Wind1", volume: 60, pitch: 140, pan: 0 });

    // 设置闪步状态开关
    $gameSwitches.setValue(95, false);
    $gameSwitches.setValue(100, true);
    $gameSwitches.setValue(203, true);
    leader.addState(63);

    // 保证走路时触发闪步时有最低位移
    if ($gamePlayer.realMoveSpeed() < 25) {
        $gamePlayer._moveSpeed = 20;
    }

    // 幽灵闪步效果：改变颜色、透明度和穿透性
    if (leader.hasSkill(92) || leader.hasSkill(73)) {
        color = [144, 0, 255, 255];
        if (leader.hasSkill(73)) {
            time += 30 + (20 * leader.skillMasteryLevel(73));
        }
        if (leader.hasSkill(92)) {
            $gamePlayer._through = true;
        }
    }

    // 红色有角三倍速效果：改变颜色、提升速度
    let redHorn = false;
    if (leader.hasSkill(68)) {
        if (leader.skillMasteryUses(68) > 0) {
            leader.gainSkillMasteryUses(68, -1);
            redHorn = true;
            color = [255, 0, 0, 255];
            skillDuration += 120;
            $gamePlayer._moveSpeed += 4;
            let tag = "tag:dash-P";
            $gameScreen._particle.particleGroupSet(0, tag, "screen", tag, "warp_s");
            setTimeout(() => $gameScreen._particle.pluginCommand(null, ['update', tag, 'color', '#ff0000'], 0), 10);
            AudioManager.playSe({ name: "Wind6", volume: 60, pitch: 140, pan: 0 });
        }
    }
    // 设置运动滤镜效果
    if (!Utils.isMobileDevice() && $gamePlayer.isMoved()) {
        const filterName = "motionblurP";
        $gameMap.createFilter(filterName, "motionblur", "SpecificChar", [-1]);
        $gameMap.setFilter(filterName, [30, 0]);
        $gameMap.moveFilter(filterName, [0, 0], 60);
        $gameMap.eraseFilterAfterMove(filterName);
    }
    // 计算残影间隔（根据移动速度）
    const moveSpeed = $gamePlayer.realMoveSpeed();
    const period = Math.max(0, 4 - Math.floor(moveSpeed / 48));

    let Senpo = QJ.MPMZ.Shoot({
        groupName: ['senPo', 'playerInAir'],
        position: [['P'], ['P']],
        initialRotation: ['PD'],
        scale: [1, 1],
        moveType: ['B', -1],
        opacity: 0,
        imgRotation: ['F'],
        anchor: [0.5, 0.5],
        existData: [
            { t: ['Time', skillDuration] }
        ],
        moveF: [
            [0, period, QJ.MPMZ.tl.ex_senpoResidualEffect, [-1, color, true, undefined, time]]
        ],
        z: "E",
        collisionBox: ['C', 1],
        deadF: [[QJ.MPMZ.tl.ex_senpoFinish, [{ redHorn: redHorn }]]]
    });

    // Shoot 也可能因弹幕初始化失败而返回空值，恢复闪步已经修改的状态。
    if (!Senpo) {
        $gamePlayer._moveSpeed = 8;
        $gamePlayer._through = false;
        $gameSwitches.setValue(95, false);
        $gameSwitches.setValue(100, false);
        $gameSwitches.setValue(203, false);
        leader.removeState(63);
        if (redHorn) {
            leader.gainSkillMasteryUses(68, 1);
            $gameScreen._particle.reservePluginCommand(4, {}, ['clear', 'tag:dash-P'], 0);
        }
        return;
    }

    // 女仆装状态下禁止以下操作
    if ($gamePlayer.isStealthMode()) return;

    // 闪步太刀监听器
    if (leader.hasSkill(3)) {
        QJ.MPMZ.Shoot({
            groupName: ['senpoTachiListener'],
            position: [['P'], ['P']],
            initialRotation: ['PD'],
            moveType: ['B', -1],
            opacity: 0,
            existData: [{ t: ['Time', 60] }],
            moveF: [[0, 0, QJ.MPMZ.tl.ex_senpoTachiListener]]
        });
    }

    // 适配荆棘套装的接近攻击能力
    if (leader.hasSkill(91)) {
		let damage = 2 + leader.skillMasteryLevel(91);
		damage *= 1.03 ** $gamePlayer.realMoveSpeed();
        QJ.MPMZ.Shoot({
            groupName: ['2'],
            position: [['P'], ['P']],
            initialRotation: ['PD'],
            collisionBox: ['C', 30],
            moveType: ['B', -1],
            opacity: 0,
            existData: [
                { t: ['Time', skillDuration] },
                { t: ['G', ['"enemy"']], a: ['F', QJ.MPMZ.tl.customEnemyDamageCalculation, [Math.floor(damage), false]], p: [-1, false, true] }
            ]
        });
    }

    if (redHorn) {
        Senpo.addExistData({ t: ['S', "!$gamePlayer.isMoved()", true], a: ['S', "$gameMap.eraseFilter('モーションブラー')"], c: ['S', "this.time > 40"] });
    }
};

// 闪步残像生成
QJ.MPMZ.tl.ex_senpoResidualEffect = function (user, color = [0, 0, 0, 0], IsActionSequence = null, zIndex, time) {
    if (!$dataMap || $gamePlayer.isTransferring()) return;

    let finalZIndex = Utils.isMobileDevice() ? "W" : "MF_UG";
    if (typeof zIndex === "string") {
        finalZIndex = zIndex;
    }

    const target = (user > 0) ? $gameMap.event(user) : $gamePlayer;
    if (!target || !target.isMoved()) return;

    // 残影第一次引用动作序列 PNG 时，浏览器可能把延迟解码塞进当帧的
    // texSubImage2D，造成一次明显卡顿。这里只对本方法即将使用的当前动作图
    // 提前发起异步解码；不等待 Promise，因此不会延迟或省略任何一张残影。
    // WeakSet 不持有图片的强引用，地图/图片缓存释放后不会因此泄漏资源。
    const actionController = target._drill_EASe_controller;
    const actionBitmapName = actionController && actionController._drill_curBitmapName;
    if (actionBitmapName) {
        const actionBitmap = ImageManager.loadActionSeq(actionBitmapName);
        const image = actionBitmap && actionBitmap._image;
        if (actionBitmap && actionBitmap.isReady() && image && typeof image.decode === "function") {
            const prepareCache = QJ.MPMZ.tl.ex_senpoResidualEffect._decodedImageCache ||
                (QJ.MPMZ.tl.ex_senpoResidualEffect._decodedImageCache = new WeakSet());
            if (!prepareCache.has(image)) {
                prepareCache.add(image);
                try {
                    const promise = image.decode();
                    if (promise && typeof promise.catch === "function") {
                        // 解码失败时保持已尝试标记，避免高速移动期间每帧重复创建
                        // 一个必然失败的 Promise；正常渲染仍会走 Bitmap 原始路径。
                        promise.catch(() => {});
                    }
                } catch (e) {
                    // decode() 同步失败时沿用原始 Bitmap 加载/上传路径。
                }
            }
        }
    }

    const posX = target.screenBoxXShowQJ();
    const posY = target.screenBoxYShowQJ();
    const isActionSequenceValue = (user > 0) ? !!IsActionSequence : !!$gamePlayer._drill_EASe_controller;
    const duration = (typeof time === 'number' && time > 0 && time <= 300) ? time : 10;

    const residual = QJ.MPMZ.Shoot({
        img: ['C', user],
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        moveType: ['S', 0],
        opacity: 0.3,
        blendMode: 0,
        tone: color,
        collisionBox: ['R', 22, 28],
        existData: [
            { t: ['Time', duration], d: [0, 60] },
            { t: ['G', ['"enemy"', '"object"']], a: [], p: [-1, false, true] }
        ],
        isActionSequence: isActionSequenceValue,
        z: finalZIndex,
    });

    if (!residual) return;

    if (user < 0 && $gameParty.leader().hasSkill(73)) {
        const commonParams = { p: [-1, false, true, undefined, undefined], cb: ['R', 48, 34] };
        residual.addExistData({ t: ['G', ['"enemy"', '"object"']], a: [], ...commonParams, p: [-1, false, true, QJ.MPMZ.tl.ex_eventHalt, QJ.MPMZ.tl.ex_eventRestart] });
        residual.addExistData({ t: ['B', ['enemyBullet', 'playerBullet']], p: [-1, false, true, QJ.MPMZ.tl.ex_20_inFunc, QJ.MPMZ.tl.ex_20_outFunc], cb: ['R', 48, 34] });
    }
    /*
    if ( $gameParty.leader().hasSkill(52) ) {
        residual.addTimeline(['S',0,2,[-1,1,1]]);
    }		
    */
};

//闪步太刀攻击模式监听
QJ.MPMZ.tl.ex_senpoTachiListener = function () {
    if (!$dataMap || $gamePlayer.isTransferring()) return;
    if ($gameSwitches.value(14) || $gameParty.leader()._characterName == "$player_swim") return;

    if ($gamePlayer.isDashing()) {
        $gamePlayer._moveSpeed = 8;
    }

    if ($gameSwitches.value(95) || $gameMap.getGroupBulletListQJ('playerSkill').length > 0) {
        return;
    }

    const performAttack = (attackFunction) => {
        QJ.MPMZ.deleteProjectile('senpoTachEffects');
        attackFunction();
        QJ.MPMZ.deleteProjectile('senpoTachiListener');
    };

    // 手柄检测（仅在摇杆有实际输入时才进入手柄模式，避免插入手柄但不使用时干扰鼠标操作）
    const gamepads = navigator.getGamepads();
    if (gamepads && gamepads[0]) {
        const isPadAttack = Input.drill_isPadPressed('右摇杆上') || Input.drill_isPadPressed('右摇杆下') || Input.drill_isPadPressed('右摇杆左') || Input.drill_isPadPressed('右摇杆右');
        if (isPadAttack) {
            QJ.MPMZ.tl.ex_GamepadsChangePlayerDirection();
            performAttack(QJ.MPMZ.tl.ex_senpoTachiRelease);
            return;
        }
    }


    if (TouchInput.drill_isLeftPressed()) {
        performAttack(QJ.MPMZ.tl.ex_senpoTachiRelease);
    } else if (TouchInput.drill_isRightPressed()) {
        performAttack(QJ.MPMZ.tl.ex_senpoTachi);
    }
};


//闪步结束效果
QJ.MPMZ.tl.ex_senpoFinish = function (extra = {}) {
    const character = $gamePlayer;
    const leader = $gameParty.leader();
    if (this.time >= 120) chahuiUtil.unlockSpecificAchievement("DonotYouEverStop");
    
    if (!leader.hasSkill(36)) character._opacity = 255;
    character._moveSpeed = 8;
    character._through = false;
    $gameSwitches.setValue(95, false);
    $gameSwitches.setValue(100, false);
    leader.removeState(63);

    const isSpecialState = leader.isStateAffected(67);
    const type = isSpecialState ? 1 : 0;
    let coolDown = isSpecialState ? 120 : 60;

    if (leader.hasSkill(28)) {
        coolDown -= 15 * leader.skillMasteryLevel(28);
    }
    coolDown = Math.max(1, coolDown);
    // 红色有角三倍速
    if (extra.redHorn) {
        coolDown = 0;
        let tag = "tag:dash-P";
        $gameScreen._particle.reservePluginCommand(4, {}, ['clear', tag], 0);
    }
    leader.addState(64);
    const senPokinshi = QJ.MPMZ.Shoot({
        groupName: ['senPokinshi'],
        position: [['P'], ['P']],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        extra: type,
        collisionBox: ['C', 1],
        moveType: ['D', false],
        existData: [{ t: ['Time', coolDown] }],
        deadJS: ["$gameParty.leader().removeState(64);$gameSwitches.setValue(203, false)"]
    });

    // 地图切换期间 Shoot 会返回 null；此时直接清理冷却状态，避免后续调用报错或状态残留。
    if (!senPokinshi) {
        leader.removeState(64);
        $gameSwitches.setValue(203, false);
        return;
    }

    if (coolDown > 10) {
        const animationId = (type === 1) ? 183 : 147;
        senPokinshi.addMoveData("JS", [coolDown - 10, 99999, `$gamePlayer.requestAnimation(${animationId})`]);
    }
};

//=============================================================================
//玩家技能
//=============================================================================

//近战普通攻击行为检测
QJ.MPMZ.tl.ex_playermeleeAttackCheck = function () {
    const player = $gameParty.leader();
    const weapon = player.equips()?.[0];
    let weaponType = weapon?.wtypeId;
    let swordType = [1, 2];
    if (!swordType.includes(weaponType)) return;
    if ($gameMap.getGroupBulletListQJ('playerWeapon').length > 0) return;

    var Monitor = QJ.MPMZ.Shoot({
        groupName: ['playerWeapon', 'attackMonitoring'],
        position: [['P'], ['P']],
        initialRotation: ['S', 0],
        moveType: ['B', -1],
        opacity: 0,
        collisionBox: ['C', 1],
        existData: [
        ],
        moveF: [
            [30, 0, QJ.MPMZ.tl.ex_playerMeleeAttackTrigger],
            [30, 1, QJ.MPMZ.tl.ex_playerSpecialAttackTrigger],
        ],
    });

    // 标记移动端
    if (Utils.isMobileDevice()) {
        Monitor._isMobile = true;
    }
};

// 手柄控制玩家朝向
QJ.MPMZ.tl.ex_GamepadsChangePlayerDirection = function () {

    $gamePlayer._directionFix = false;
    // 检测右摇杆
    const up = Input.drill_isPadPressed('右摇杆上');
    const down = Input.drill_isPadPressed('右摇杆下');
    const left = Input.drill_isPadPressed('右摇杆左');
    const right = Input.drill_isPadPressed('右摇杆右');

    // 是否有任何方向输入
    const isPadPressed = up || down || left || right;

    // 若玩家有推动右摇杆，则按4方向进行朝向
    if (isPadPressed) {
        // 优先级： 上 > 下 > 左 > 右
        // 如果按上+左 或 上+右，也都视作“上”。
        // 如果按下+左 或 下+右，也都视作“下”。
        if (up) {
            $gamePlayer.setDirection(8); // 向上
        } else if (down) {
            $gamePlayer.setDirection(2); // 向下
        } else if (left) {
            $gamePlayer.setDirection(4); // 向左
        } else if (right) {
            $gamePlayer.setDirection(6); // 向右
        }
    }
    $gamePlayer._directionFix = true;
};


// 近战普通攻击行为检测
QJ.MPMZ.tl.ex_playerMeleeAttackTrigger = function () {
    this._coolDown = this._coolDown || 0;
    if (this._coolDown > 0) {
        this._coolDown -= 1;
        return;
    }

    let GamepadsAttack = false;
    // 手柄检测
    if (navigator.getGamepads()?.[0] !== null) {
        GamepadsAttack = !Input.drill_isPadPressed('LT') && (
            Input.drill_isPadPressed('右摇杆上') ||
            Input.drill_isPadPressed('右摇杆下') ||
            Input.drill_isPadPressed('右摇杆左') ||
            Input.drill_isPadPressed('右摇杆右')
        );
        if (GamepadsAttack) QJ.MPMZ.tl.ex_GamepadsChangePlayerDirection();
    }

    let Triggered = false;
    if (Utils.isMobileDevice()) {
        Triggered = $gameSwitches.value(201);
    } else {
        if (window.isHoveringHotbar?.()) return;
        Triggered = TouchInput.drill_isLeftPressed();
    }

    if (!$gameSystem._drill_PAlM_enabled) return;

    if (Triggered || GamepadsAttack) {
        const player = $gameParty.leader();
        const weapon = player.equips()?.[0];
        const weaponType = weapon?.wtypeId;
        if (![1, 2].includes(weaponType)) return;

        if (QJ.MPMZ.tl.ex_playerAntiClickDetection("normalAttack")) return;
        //if ($gameMap.getGroupBulletListQJ('playerSkill').length > 0) return;
        if (SLGSceneFreeExploration.Buttons.isPointerOverButton()) return;
        if (player.isStateAffected(63) || $gameSwitches.value(181)) return;
        // 拔刀斩准备期间，不启动普通攻击。
        if ($gameMap.getGroupBulletListQJ('senpoTachi').length > 0 ||
            $gameMap.getGroupBulletListQJ('senpoTach').length > 0) return; 
        const baseCoolDown = 50;
        let extra = {};
        let coolDown = baseCoolDown;
        // 攻速修正        
        coolDown -= Math.round(1.5 * baseCoolDown * player.cnt);
        if (coolDown < 0) {
            // 溢出的攻速部分将转换为额外攻击次数
            extra.replayAttack = Math.floor(Math.abs(coolDown) / 15);
            coolDown = 0;
        }
        this._coolDown = coolDown;
        extra.coolDown = coolDown;
        // 普攻触发
        QJ.MPMZ.tl.ex_playerMeleeAttack(extra);        
    }
};

// 近战普通攻击演出
QJ.MPMZ.tl.ex_playerMeleeAttack = function (extra={}) {
	    $gameSystem._drill_PAlM_enabled = false;
		const player = $gamePlayer;  
		let coolDown = extra.coolDown ?? 50;
		let phase    = "";
		let weapon   = extra.weaponId ?? undefined;
		let waitTime = 8;
		if (coolDown < 10) {
			phase    = 2;
			waitTime = 4;
		} else if (coolDown < 30) {
			phase    = 1;
			waitTime = 6;
		} 
        let attackDir = Math.random() > 0.5 ? "逆砍" : "正砍";
		let actName = attackDir + phase;
		player.drill_EASe_stopAct();
		player.drill_EASe_setAct( actName );
        extra.attackDir = attackDir;
        const extraSource = JSON.stringify(extra || {});
		QJ.MPMZ.Shoot({
		   existData: [ 
			 {t:['Time',waitTime*2],a:['S',`$gameSystem._drill_PAlM_enabled = true;
			                                if (Utils.isMobileDevice()) {
                                                $gamePlayer._directionFix = false;
                                            }`]}
		   ],
		   // 素振音效和斩击碰撞盒
		   moveJS:[
			 [waitTime,999,`let seNames = ["風切り音（誇張のない音。素早く）", "剣・棒状の風切り音1 ヒュン！"];
							let randomSeName = seNames[Math.floor(Math.random() * seNames.length)];
							let randomPitch = Math.randomInt(40) + 81;
							AudioManager.playSe({ name: randomSeName, volume: 60, pitch: randomPitch, pan: 0 });
							//QJ.MPMZ.deleteProjectile('meleeAttack');
							QJ.MPMZ.tl.meleeAttack(${extraSource});
							`]
		   ]
		});
};


// 近战特殊攻击行为检测
QJ.MPMZ.tl.ex_playerSpecialAttackTrigger = function () {
    var GamepadsAttack = false;

    if (this._isMobile) {
        if (Input.getPressTime('ok') > 30) GamepadsAttack = true;
    }

    // 手柄检测
    if (navigator.getGamepads() && navigator.getGamepads()[0] !== null) {
        GamepadsAttack = Input.drill_isPadPressed('LT') && (
            Input.drill_isPadPressed('右摇杆上') ||
            Input.drill_isPadPressed('右摇杆下') ||
            Input.drill_isPadPressed('右摇杆左') ||
            Input.drill_isPadPressed('右摇杆右')
        );
        if (GamepadsAttack) {
            QJ.MPMZ.tl.ex_GamepadsChangePlayerDirection();
            GamepadsAttack = 'Gamepad';
        }
    }

    if (TouchInput.drill_isRightPressed() || GamepadsAttack) {
        if (!$gamePlayer._drill_EASA_enabled) return;
        if (QJ.MPMZ.tl.ex_playerAntiClickDetection("normalAttack")) return;
        if ($gameSwitches.value(181)) return;
        if ($gameMap.getGroupBulletListQJ('Senpo').length > 0) return;
        if (!$gameParty.leader().equips()[0]) return;
        let weaponType = $gameParty.leader().equips()[0].wtypeId;
        let swordType = [1, 2];
        if (!swordType.includes(weaponType)) return;
        // 旋风斩
        QJ.MPMZ.tl.ex_senpuuGiri(GamepadsAttack);
    }
};


//近战普通攻击
QJ.MPMZ.tl.meleeAttack = function (extra={}) {

    const actor  = $gameParty.leader();
	if (extra.attackMiss) {
		if (!this || this._effectiveHit) return;
		// 剑术修行: 空挥
		if (actor.hasSkill(26)) {
			let value = Math.floor(1 * actor.pdr);
			actor.gainSkillMasteryUses(26, value);
			const uses = actor.skillMasteryUses(26);
			const masteryTable = [4, 15, 50, 150, 500, 1600, 4800, 12000, 24000, 36000];
			let newLevel = 0;
			for (let i = 0; i < masteryTable.length; i++) {
				if (uses >= masteryTable[i]) {
					newLevel = i + 1;
				} else {
					break;
				}
			}
			actor.setSkillMasteryLevel(26, newLevel);
			actor.setSkillMasteryUses(26, uses);
			$gamePlayer._directionFix = false;
            // 适配攻速成长
            $dataStates[84].plusXParams[6] = 0.03 * Math.floor(newLevel / 2);
		}
        return;		
	}
    // 拦截已经排队、延迟到现在才执行的普攻。
    if ($gameMap.getGroupBulletListQJ('senpoTachi').length > 0 ||
        $gameMap.getGroupBulletListQJ('senpoTach').length > 0) return;
    let weapon = actor.equips()[0];
	if (extra.weaponId) weapon = $dataWeapons[extra.weaponId];
    if (!weapon) return;
    //if ($gameMap.getGroupBulletListQJ('playerSkill').length > 0) return;

    let wid          = weapon.baseItemId ? weapon.baseItemId : weapon.id;
    let weaponImage  = "weapon/weapon" + wid;
    let weaponTrail  = "weapon/weaponTrail" + wid;
    let weaponScale  = actor.pdr;
    let weaponDamage = chahuiUtil.getVarianceDamage(1);
    let opacity      = $gamePlayer._opacity / 255;

    // 剑术修行加成
    if (actor.hasSkill(26)) {
        weaponDamage *= (100 + (1.8 ** actor.skillMasteryLevel(26))) / 100;
    }
    let rotation, angle, time, trailRotation, skillTime, zz, Talpha;
	let coolDown = extra.coolDown ?? 50;
    if (coolDown < 10) {
        angle = 25;
        time = 6;
        skillTime = 4;
    } else if (coolDown < 30) {
        angle = 16.7;
        time = 9;
        skillTime = 6;
    } else {
        angle = 12.5;
        time = 12;
        skillTime = 8;
    }
    
    let Anchor = [1, 1];
    if (extra.attackDir === '正砍') {
        rotation = -135;
        trailRotation = -90;
        scaleXY = [-weaponScale, weaponScale];
        Anchor = [1, 1];
    } else {
        rotation = 135;
        trailRotation = 90;
        angle = -angle;
        scaleXY = [weaponScale, weaponScale];
    }

    if (actor.hasSkill(55)) {
        zz = "MF_BR";
        Talpha = 0.1 * opacity;
    } else {
        zz = "E";
        Talpha = 0.75 * opacity;
    }
    
    if (actor.isStateAffected(96)) {
        weaponImage  = "weapon/weapon_alt37";
        weaponTrail  = "weapon/weaponTrail37[6,8]";
    }
    // 展示武器演出
    QJ.MPMZ.Shoot({
        img: weaponImage,
        groupName: ['meleeAttack', 'playerSkill'],
        position: [['P'], ['P']],
        initialRotation: ['PD', rotation],
        scale: scaleXY,
        opacity: opacity,
        moveType: ['D', true],
        imgRotation: ['R', angle, true],
        anchor: Anchor,
        existData: [
            { t: ['Time', time], d: [0, 10] }
        ],
        z: zz,
        collisionBox: ['C', 1],
    });

    // 安卓版刀光会报错
    let TrailEffect = [];

    if (!Utils.isMobileDevice()) {
        TrailEffect = [{
            img: ['L', 0.5, 1, 0, 0.999999999, 0.2, 0, 0, 0],
            blendMode: 1,
            alpha: Talpha,
            existTime: 0,
            disappearTime: 6,
            imgStretchMode: 0,
            ifProjctileWait: false,
            hOrV: true,
        }];
        if (actor.hasSkill(94)) {
            TrailEffect[0].existTime = 210;
        }
    }

    //武器伤害判定宽度
    const noteMatch = weapon?.meta?.['hitBox'];

    // 实际武器碰撞体判定
    let realBullet = QJ.MPMZ.Shoot({
        groupName: ['meleeAttack', 'playerSkill'],
        img: weaponTrail,
        position: [['P'], ['P']],
        initialRotation: ['PD', trailRotation],
        scale: [weaponScale, weaponScale],
        moveType: ['D', true],
        opacity: 0,
        imgRotation: ['R', angle, true],
        anchor: [0.5, 1],
        existData: [
            { t: ['Time', time], a: ['F', QJ.MPMZ.tl.meleeAttack, [{attackMiss:true}]] },
            { t: ['G', ['"enemy"', '"object"']], a: ['S', "this._effectiveHit = true"], p: [-1, false, true] },
            { t: ['G', ['"enemy"', '"object"']], a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [Math.floor(weaponDamage), { allowAssassination: true, weaponAttack: true }]], p: [-1, false, true] },
            { t: ['B', 'enemyBullet'], p: [-1, false, true, QJ.MPMZ.tl.ex_weaponParry] }
        ],
        z: "E",
        collisionBox: noteMatch ? JSON.parse(noteMatch.replace(/'/g, '"')) : ['R', 8, 64],
        judgeAccuracyRotation: 5,
        trailEffect: TrailEffect,
    });
    // 火属性
    if ([17, 19].includes(wid)) {
        realBullet.data.groupName.push("fire");
        $gameMap.addMapBulletsNameQJ(realBullet.index, realBullet.data.groupName);
    }

    //日轮-陨石术
    if (actor.hasSkill(57)) {
        let baseValue = 300;
        let luk = actor.luk;
        luk = Math.max(0, Math.min(600, luk));
        let adjustedValue = baseValue + (luk / 660) * 660;
        if (Math.randomInt(1001) < adjustedValue) {
            weapon.durability -= 40;
            realBullet.addMoveData("JS", [skillTime, 999, 'QJ.MPMZ.tl.ex_meteorStrike.call(this)']);
        }
    }

    if (wid === 37 && actor.isStateAffected(96)) {
        realBullet.addMoveData("F", [skillTime, 999, QJ.MPMZ.tl.MistilteinnWeaponAttack]);
    }

    //斩裂剑-斩剑波
    if (actor.hasSkill(44)) {
        realBullet.addMoveData("JS", [skillTime, 999, 'QJ.MPMZ.tl.ex_swordEnergyAttack.call(this)']);
    }

    //色拉的笔-斩击残响
    if (actor.hasSkill(94)) {
        realBullet.addMoveData("JS", [skillTime, 999, 'QJ.MPMZ.tl.lingeringSwordWaveCollision.call(this)']);
    }

    //暴风兽人斧-剑刃风暴
    if (actor.hasSkill(56)) {
        realBullet.addMoveData("JS", [skillTime, 999, 'QJ.MPMZ.tl.ex_skillBladestorm.call($gamePlayer)']);
    }

    //柳叶剑特效
    if (wid === 80) {
        realBullet.addMoveData("F", [skillTime, 999, QJ.MPMZ.tl.ex_willowLeafEffects, ["meleeAttack"]]);
    }

    //多次攻击次数-燕返斩
    if (actor.hasSkill(99) || extra.replayAttack) {
        let tsubameGaeshi = extra.replayAttack ?? 0;
        tsubameGaeshi += actor.hasSkill(99) ? actor.skillMasteryLevel(99) : 0;
        let tsubameGaeshiTime = time;
        for (let i = 1; i <= tsubameGaeshi; i++) {
            tsubameGaeshiTime = Math.round(tsubameGaeshiTime / 2);
            realBullet.addMoveData("JS", [tsubameGaeshiTime, 999, 'QJ.MPMZ.tl.meleeAttackTsubameGaeshi.call(this)']);
        }
    }

    //多次攻击次数-胁差
    if (actor.hasSkill(78)) {
        let tsubameGaeshi = actor.skillMasteryLevel(78);
        let tsubameGaeshiTime = time;
        for (let i = 1; i <= tsubameGaeshi; i++) {
            tsubameGaeshiTime = Math.round(tsubameGaeshiTime / 2);
            realBullet.addMoveData("JS", [tsubameGaeshiTime, 999, "QJ.MPMZ.tl.meleeAttackTsubameGaeshi.call(this,'wakizashi')"]);
        }
    }

};

// 忍者技能-背刺熟练度变化
QJ.MPMZ.tl.backstabProficiencyChange = function () {
    let actor = $gameParty.leader();
    actor.gainSkillMasteryUses(11, 1);
    const uses = actor.skillMasteryUses(11);
    const masteryTable = [5, 27, 60, 120, 256, 530, 960, 1587, 2452, 3600];
    let newLevel = 1;
    for (let i = 0; i < masteryTable.length; i++) {
        if (uses >= masteryTable[i]) {
            newLevel = i + 2;
        } else {
            break;
        }
    }
    actor.setSkillMasteryLevel(11, newLevel);
    actor.setSkillMasteryUses(11, uses);
};

// 玩家技能等级显示
QJ.MPMZ.tl.playerSkillLevelDisplay = function (skillId) {

    let level = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][
        $gameActors.actor(1).skillMasteryLevel(skillId).clamp(0, 11)
    ];
    return level
};

//闪步太刀-准备动作
QJ.MPMZ.tl.ex_senpoTachi = function (extra={}) {

    if (!$dataMap || $gamePlayer.isTransferring()) return;

    if (extra.Charge) {
        this._chargeCounter = this._chargeCounter || 0;
		if (this._chargeCounter < 999) {
			$gameScreen._particle.particleGroupSet(0, 'weapon_b1', 'player');
			let se = { name: "Up4", volume: 20, pitch: 120, pan: 0 };
			AudioManager.playSe(se);
			this._chargeCounter = this._chargeCounter || 0;
			this._chargeCounter += 150;
			this._chargeCounter = Math.min(1000, this._chargeCounter);
			this._chargeTone = Math.floor(Math.min(250, this._chargeCounter / 4));
			this.changeAttribute("tone", [this._chargeTone, 0, 0, 0]);
		} else if (!this._charged && this._chargeCounter > 999) {
			let se = { name: "Skill2", volume: 60, pitch: 100, pan: 0 };
			AudioManager.playSe(se);
			this._charged = true;
			this._chargeCounter = 1000;
			let data = $gameScreen._particle.particleSet(0, 'aura_bp2', 'player');
			$gameScreen._particle.particleUpdate(['aura_bp2', 'pos', '0', '-12']);
			$gameScreen._particle.particleUpdate(['aura_bp2', 'color', '#ff4665']);
			data.clear = true;
		}		
		return;
	}

    let actor = $gameParty.leader();
    if (actor._characterName !== "$player") return;
    if ($gameMap.getGroupBulletListQJ('playerSkill').length > 0) return;
	let weapon = actor.equips()[0];
    if (!weapon) return;
    let weaponType = weapon.wtypeId;
    let staffType = [1, 2];
    if (!staffType.includes(weaponType)) return;

    let se = { name: "剣を鞘にしまう", volume: 60, pitch: 100, pan: 0 };
    AudioManager.playSe(se);

    $gameSystem._drill_PAlM_enabled = false;
    $gamePlayer.drill_EASe_stopAct();
    $gamePlayer.drill_EASe_setSimpleStateNode(["闪步太刀准备"]);

    let zz          = actor.hasSkill(55) ? "MF_BR" : "E";
    let baseItemId  = weapon.baseItemId || 1;
    let weaponImage = "weapon/weaponTrail" + baseItemId;
    if (actor.isStateAffected(96)) {
        weaponImage  = "weapon/weaponTrail37[6,8]";
    }    
    let weaponScale = actor.pdr;
    let Tachi = QJ.MPMZ.Shoot({
        img: weaponImage,
        groupName: ['playerSkill', 'senpoTachi'],
        position: [['P'], ['P']],
        initialRotation: ['S', 45],
        moveType: ['D', true],
        opacity: 1,
        scale: weaponScale,
        imgRotation: ['F'],
        anchor: [0.5, 0.7],
        existData: [
            { t: ['S', '!TouchInput.drill_isRightPressed()', true], a: ['F', QJ.MPMZ.tl.ex_senpoTachiRelease], c: ['S', 'this.time > 30'] },
            //{t:['P'],a:['C',269,[weaponDamage,0,0,0]],p:[-1,false,true]}
        ],
        z: zz,
        collisionBox: ['R', 8, 64],
        moveF: [
            [60, 60, QJ.MPMZ.tl.ex_senpoTachi, [{Charge:true}]],
        ],
        deadF: [[QJ.MPMZ.tl.ex_senpoTachiEffects]]
    });

    if (!Tachi) {
        $gameSystem._drill_PAlM_enabled = true;
        $gamePlayer.drill_EASe_stopAct();
        return;
    }
};

//闪步太刀-释放
QJ.MPMZ.tl.ex_senpoTachiRelease = function () {
    let actor = $gameParty.leader();
    if (!$dataMap || $gamePlayer.isTransferring()) {
        actor?.removeState(80);
        $gameSystem._drill_PAlM_enabled = true;
        return;
    }
    if (actor._characterName !== "$player") return;
    let weapon = actor.equips()[0];
    if (!weapon) return;
    let weaponType = weapon.wtypeId;
    let staffType = [1, 2];
    if (!staffType.includes(weaponType)) return;

    $gameSystem._drill_PAlM_enabled = true;
    actor.addState(80);

    let se = { name: "剣を抜く", volume: 80, pitch: 100, pan: 0 };
    AudioManager.playSe(se);

    let character = $gamePlayer;
    if (!$gameSwitches.value(191)) {
        var r = 255;
        var g = 150;
        var b = 0;
        var color = [r, g, b, 255];
    } else {
        var r = 50;
        var g = 140;
        var b = 200;
        var color = [r, g, b, 255];
    }

    //检测移动方向
    let mouseX = TouchInput.x / $gameScreen.zoomScale();
    let mouseY = TouchInput.y / $gameScreen.zoomScale();
    let ax = character.centerRealX();
    let ay = character.centerRealY();
    let bx = (mouseX / 48) + $gameMap.displayX();
    let by = (mouseY / 48) + $gameMap.displayY();
    let deg = QJ.calculateAngleByTwoPointAngle(ax, ay, bx, by);

    character.drill_EASe_stopAct();
    let direction;
    let angle;
    let speed;
    if (deg > 180) {
        character.drill_EASe_setAct(["闪步太刀-左"]);
        direction = 1;
        angle = 60;
        speed = 28.3;
    } else {
        character.drill_EASe_setAct(["闪步太刀-右"]);
        direction = 2;
        angle = 300;
        speed = -28.3;
    }
    character.drill_EASA_setEnabled(true);
    let posX = "$gamePlayer.screenBoxXShowQJ() - 10";
    let posY = "$gamePlayer.screenBoxYShowQJ() + 8";
    let weaponImage = "weapon/weaponTrail" + weapon.baseItemId;
    if (actor.isStateAffected(96)) {
        weaponImage  = "weapon/weaponTrail37[6,8]";
    }        
    let weaponDamage = chahuiUtil.getVarianceDamage(1);
    let weaponScale = actor.pdr;
    let knockUp = 0;
    let knockUpHight = 0;
    //蓄力的情况
    if (this && this._chargeCounter) {
        let extraDamage = weapon.params[2];
        extraDamage *= (1.02 ** (this._chargeCounter / 10)) - 1;
        weaponDamage += Math.floor(extraDamage);
        knockUp = 20;
        knockUpHight = Math.floor(this._chargeCounter / 2);
    }

    let zz, Talpha;
    if (actor.hasSkill(55)) {
	// 无影剑	
        zz = "MF_UR";
        Talpha = 0.1;
    } else {
        zz = "W";
        Talpha = 0.75;
    }
    // 安卓版刀光会报错
    let TrailEffect = [];
    if (!Utils.isMobileDevice()) {
        TrailEffect = [{
            img: ['L', 0.5, 72, 0, 0.999999999, 0.2, 0, 0, 0],
            existTime: actor.hasSkill(94) ? 210 : 0,
            blendMode: 1,
            alpha: Talpha,
            disappearTime: 20,
            imgStretchMode: 0,
            ifProjctileWait: !actor.hasSkill(94),
            hOrV: true
        }];
    }

    let Tachi = QJ.MPMZ.Shoot({
        groupName: ['senpoTach', 'playerSkill'],
        img: weaponImage,
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', angle],
        moveType: ['D', true],
        opacity: '0|1~10|1~14/0',
        scale: weaponScale,
        extra: direction,
        imgRotation: ['R', speed, true],
        judgeAccuracyAnchor: 0.04,
        anchor: [0.5, 0.8],
        existData: [
            { t: ['Time', 24] },
            { t: ['G', ['"enemy"', '"object"']], a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [weaponDamage, { fullPower: true, weaponAttack: true }]], p: [-1, false, true] },
            { t: ['G', ['"enemy"', '"object"']], a: ['C', 148, [0, knockUp, knockUpHight, 0]], p: [-1, false, true] },
            { t: ['B', 'enemyBullet'], p: [-1, false, true, QJ.MPMZ.tl.ex_weaponParry] }
        ],
        z: zz,
        collisionBox: ['R', 8, 64],
        trailEffect: TrailEffect,
        moveF: [
            [1, 0, QJ.MPMZ.tl.ex_senpoTachiFix],
            [0, 2, QJ.MPMZ.tl.ex_senpoResidualEffect, [-1, color]]
        ],
        deadJS: ["$gameParty.leader().removeState(80);$gameSystem._drill_PAlM_enabled = true;"]
    });

    if (!Tachi) {
        actor.removeState(80);
        $gameSystem._drill_PAlM_enabled = true;
        return;
    }

    Tachi._lingeringSwordWaveDamage = weaponDamage;
    if (actor.hasSkill(94) && TrailEffect.length > 0) {
        QJ.MPMZ.tl.startSenpoTachiLingeringCollision(Tachi);
    }

    // 火属性
    if ([17, 19].includes(weapon.baseItemId)) {
        Tachi.data.groupName.push("fire");
        $gameMap.addMapBulletsNameQJ(Tachi.index, Tachi.data.groupName);
    }

    //柳叶剑特效
    if (weapon.baseItemId === 80) {
        Tachi.addMoveData("F", [5, 5, QJ.MPMZ.tl.ex_willowLeafEffects, ["meleeAttack"]]);
    }

    if ((weapon.baseItemId || weapon.id) === 37 && actor.isStateAffected(96)) {
        Tachi.addMoveData("F", [5, 999, QJ.MPMZ.tl.MistilteinnWeaponAttack, [{angle: deg}]]);
    }

    //斩裂剑-斩剑波
    if (actor.hasSkill(44)) {
        let swordEnergyAttackScale = 0.75 * actor.pdr;
        if (this && this._chargeCounter && this._chargeCounter > 0) {
            swordEnergyAttackScale += this._chargeCounter / 500;
        }
        let swordEnergyAttackCode = 'QJ.MPMZ.tl.ex_swordEnergyAttack.call(this,' + swordEnergyAttackScale + ')';
        Tachi.addMoveData("JS", [5, 999, swordEnergyAttackCode]);
    }

    //日轮-陨石术
    if (actor.hasSkill(57)) {
        const playerX = $gamePlayer.screenBoxXShowQJ();
        const playerY = $gamePlayer.screenBoxYShowQJ();
        weapon.durability -= 40;
        Tachi.addMoveData("JS", [20, 999, `QJ.MPMZ.tl.ex_meteorStrike.call(this,${playerX},${playerY})`]);
    }

    //剑圣-免许皆传
    if (actor.hasSkill(100)) {
        const extraTachi = QJ.MPMZ.Shoot({
            groupName: ['senpoTach', 'playerSkill'],
            img: weaponImage,
            position: [['S', posX], ['S', posY]],
            initialRotation: ['S', angle],
            moveType: ['D', true],
            opacity: 0,
            scale: weaponScale * 3,
            imgRotation: ['R', speed, true],
            judgeAccuracyAnchor: 0.04,
            anchor: [0.5, 0.8],
            existData: [
                { t: ['Time', 24] },
                { t: ['G', ['"enemy"', '"object"']], a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [weaponDamage, { fullPower: true, weaponAttack: true }]], p: [-1, false, true] },
                { t: ['G', ['"enemy"', '"object"']], a: ['C', 148, [0, knockUp, knockUpHight, 0]], p: [-1, false, true] },
                { t: ['B', 'enemyBullet'], p: [-1, false, true, QJ.MPMZ.tl.ex_weaponParry] }
            ],
            z: "MF_UR",
            collisionBox: ['R', 8, 64],
            trailEffect: TrailEffect,
            moveF: [
                [1, 0, QJ.MPMZ.tl.ex_senpoTachiFix],
            ],
        });
        if (extraTachi) {
            extraTachi._lingeringSwordWaveDamage = weaponDamage;
            if (actor.hasSkill(94) && TrailEffect.length > 0) {
                QJ.MPMZ.tl.startSenpoTachiLingeringCollision(extraTachi);
            }
        }
    }

};

//闪步太刀特效
QJ.MPMZ.tl.ex_senpoTachiEffects = function (extra={}) {
	if (!$dataMap || $gamePlayer.isTransferring()) return;
	
	if (extra.clickDetection) {
		if (TouchInput.drill_isLeftPressed() || TouchInput.drill_isLeftTriggered()) {
			QJ.MPMZ.deleteProjectile('senpoTach');
			QJ.MPMZ.deleteProjectile('meleeAttack');
			QJ.MPMZ.tl.ex_senpoTachiRelease();
		}		
		return;
	}
	
    if (this.time < 30) {
        return;
    }
    QJ.MPMZ.deleteProjectile('senpoTachEffects');
    let extraCount = 0;

    if (!this._charged) {
        extraCount += Math.floor(this.time / 90);
    } else {
        extraCount += 3;
    }
    extraCount += $gameMap.getAttackExtraCount();

    if (extraCount > 0) {
        let time = extraCount * 40;
        let effects = QJ.MPMZ.Shoot({
            groupName: ['senpoTachEffects'],
            position: [['P'], ['P']],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            collisionBox: ['C', 1],
            moveType: ['D', false],
            existData: [
                { t: ['Time', time] },
            ],
            moveF: [
                [37, 30, QJ.MPMZ.tl.ex_senpoTachiEffects, [{clickDetection:true}]],
            ],
        });
    }

};

//闪步太刀演出矫正
QJ.MPMZ.tl.ex_senpoTachiFix = function () {

    let newAnchorX = this.anchorX;
    let newAnchorY = this.anchorY;
    if (this.data.extra && this.data.extra < 2) {

        if (this.anchorY < 1.0) {
            newAnchorX = this.anchorX - 0.03;
            newAnchorY = this.anchorY + 0.022;
        }
        if (this.rotationImg > 270 || this.rotationImg <= 40) {
            if ($gameParty.leader().hasSkill(55)) {
                this.changeAttribute("z", "MF_BR");
            } else {
                this.changeAttribute("z", "E");
            }
        } else {
            if ($gameParty.leader().hasSkill(55)) {
                this.changeAttribute("z", "MF_UR");
            } else {
                this.changeAttribute("z", "W");
            }
        }

        if (this.rotationImg > 390) {
            this.changeAttribute("imgRotation", ['S', 40]);
        }

    } else { //分歧


        if (this.anchorY < 1.1) {
            newAnchorX = this.anchorX - 0.03;
            newAnchorY = this.anchorY + 0.022;
        }
        if (this.rotationImg > 90) {
            if ($gameParty.leader().hasSkill(55)) {
                this.changeAttribute("z", "MF_UR");
            } else {
                this.changeAttribute("z", "W");
            }
        } else {
            if ($gameParty.leader().hasSkill(55)) {
                this.changeAttribute("z", "MF_BR");
            } else {
                this.changeAttribute("z", "E");
            }
        }

        if (this.rotationImg < -30) {
            this.changeAttribute("imgRotation", ['S', -40]);
        }

    }
    this.changeAttribute("anchor", [newAnchorX, newAnchorY]);

    this.y = $gamePlayer.centerRealY() * 48;
    if (this.data.extra && this.data.extra < 2) {
        this.x = $gamePlayer.centerRealX() * 48 - 10;
    } else {
        this.x = $gamePlayer.centerRealX() * 48;
    }


    if (this.time > 14) {
        $gameParty.leader().removeState(80);
        //$gameSystem._drill_PAlM_enabled = false;
    }
};


// 旋风斩动态时钟。
// phaseIntervals 是零攻速时的基础单图等待帧：五次升档后从 8 降到 3。
// 外部攻速再整体缩放这张表；cnt=2（+200%）时，满功率等待帧刚好从 3 降到 1。
// 负攻速会反向拉长每一档；8倍仅作为不抽帧的最终安全上限。
QJ.MPMZ.tl.senpuuGiriSpinConfig = {
    sourceFrameCount: 8,
    sourceFrameInterval: 8,
    phaseIntervals: [8, 7, 6, 5, 4, 3],
    maxPlaybackRate: 8
};

QJ.MPMZ.tl.ex_senpuuGiriAttackSpeedRate = function (actor) {
    const cnt = Number(actor?.cnt);
    const value = Number.isFinite(cnt) ? cnt : 0;
    return value >= 0 ? 1 + value : 1 / (1 - value);
};

QJ.MPMZ.tl.ex_senpuuGiriPlaybackRate = function (actor, phase) {
    const config = QJ.MPMZ.tl.senpuuGiriSpinConfig;
    const maxPhase = config.phaseIntervals.length - 1;
    const safePhase = Math.max(0, Math.min(maxPhase, Math.floor(Number(phase) || 0)));
    const interval = Math.max(0.000001, Number(config.phaseIntervals[safePhase]) || config.sourceFrameInterval);
    const phaseRate = config.sourceFrameInterval / interval;
    const combinedRate = phaseRate * QJ.MPMZ.tl.ex_senpuuGiriAttackSpeedRate(actor);
    return Math.max(0, Math.min(config.maxPlaybackRate, combinedRate));
};

QJ.MPMZ.tl.ex_setSenpuuGiriRotationRate = function (bullet, playbackRate) {
    if (!bullet?.data?.imgRotation) return;
    const config = QJ.MPMZ.tl.senpuuGiriSpinConfig;
    const baseCircleTime = config.sourceFrameCount * config.sourceFrameInterval;
    const safeRate = Math.max(0, Math.min(config.maxPlaybackRate, Number(playbackRate) || 0));
    const rotationSpeed = 360 * safeRate / baseCircleTime;

    bullet.data.imgRotation[0] = 'R';
    bullet.data.imgRotation[1] = QJ.MPMZ.createDEFrameQJ(rotationSpeed, 0);
    bullet._senpuuGiriRotationSpeed = rotationSpeed;
    if (bullet._senpuuGiriSpin) {
        bullet._senpuuGiriSpin.currentRate = safeRate;
        bullet._senpuuGiriSpin.rotationSpeed = rotationSpeed;
    }
};

QJ.MPMZ.tl.ex_getSenpuuGiriRotationSpeed = function (bullet) {
    if (Number.isFinite(bullet?._senpuuGiriRotationSpeed)) {
        return bullet._senpuuGiriRotationSpeed;
    }
    const rotationData = bullet?.data?.imgRotation?.[1];
    if (rotationData && typeof rotationData.getOnly === 'function') {
        return Number(rotationData.getOnly()) || 0;
    }
    return 0;
};

// QJ 在 moveF 后才更新 rotationImg，因此在这里预判本帧是否刚好跨过一圈。
// 新档位从下一帧开始生效，这与 COAS 在本帧输出当前末图的时序一致。
QJ.MPMZ.tl.ex_updateSenpuuGiriSpin = function (Tsubame) {
    const spin = this._senpuuGiriSpin;
    if (!spin) return;

    if (spin.pendingRate !== null) {
        QJ.MPMZ.tl.ex_setSenpuuGiriRotationRate(this, spin.pendingRate);
        const trail = $gameMap.bulletQJ(spin.trailIndex);
        if (trail) {
            QJ.MPMZ.tl.ex_setSenpuuGiriRotationRate(trail, spin.pendingRate);
        }
        spin.pendingRate = null;
    }

    const rotationSpeed = spin.rotationSpeed;
    if (!(rotationSpeed > 0)) return;
    if (this.rotationImg + rotationSpeed + 1e-8 < spin.nextTurnRotation) return;

    // 色拉的笔：每实际完成一圈，就把这一圈刀光固化为残留判定。
    // 原地旋转走圆形快路径，移动时由本圈采样点生成复合轨迹。
    // 使用这里的跨圈时钟，不受旋风斩升档和攻速变化影响。
    if (!Tsubame && $gameParty.leader().hasSkill(94)) {
        const trail = $gameMap.bulletQJ(spin.trailIndex);
        if (trail) {
            // 主刀比轨迹弹先更新；延后一帧读取，确保 dataRem 已包含跨圈终点。
            trail.addMoveData("F", [1, -1, QJ.MPMZ.tl.lingeringSenpuuGiriCollision]);
        }
    }

    spin.nextTurnRotation += 360;
    spin.phase = Math.min(spin.phase + 1, QJ.MPMZ.tl.senpuuGiriSpinConfig.phaseIntervals.length - 1);
    spin.pendingRate = QJ.MPMZ.tl.ex_senpuuGiriPlaybackRate($gameParty.leader(), spin.phase);
    QJ.MPMZ.tl.ex_senpuuGiriAccelerationEffect.call(this, spin.phase, Tsubame, spin.pendingRate);
};

// 旋风斩演出
QJ.MPMZ.tl.ex_senpuuGiri = function (GamepadsAttack, Tsubame = false) {

    const leader = $gameParty.leader();
    const weapon = leader.equips()[0];
    if (!weapon) return;

    const initialPlaybackRate = QJ.MPMZ.tl.ex_senpuuGiriPlaybackRate(leader, 0);

    // ==================== 主刀演出前置(多段攻击不走) ====================
    if (!Tsubame) {
        // 同一时刻只能存在一次旋风斩
        if ($gameMap.getGroupBulletListQJ('playerSkill').length > 0) return;

        $gameSwitches.setValue(14, true);
        $gameSwitches.setValue(181, true);
        leader.addState(62);
        $dataMap.disableDashing = true;
        const controller = $gamePlayer._drill_EASe_controller;
        if (controller !== undefined) {
            controller.drill_COAS_setStateSpeed(initialPlaybackRate);
            $gamePlayer.drill_EASe_setSimpleStateNode( ["旋转中(1档)"] );
        }
    }

    // ==================== 武器贴图与缩放 ====================
    const wid = weapon.baseItemId;
    let weaponImage = `weapon/weapon${wid}`;
    if (leader.isStateAffected(96)) {
        weaponImage  = "weapon/weapon_alt37";
    }    
    const weaponScale = leader.pdr;

    // ==================== 主刀/多段攻击的视觉差异 ====================
    const hueValue = Tsubame ? 180 : 0;
    const opacity = Tsubame ? 0.25 * ($gamePlayer._opacity / 255) : ($gamePlayer._opacity / 255);
    const zLayer = Tsubame ? "MF_BG" : "E";
    const isSubBullet = Tsubame;

    // ==================== 主刀弹幕 ====================
    const senpuuGiri = QJ.MPMZ.Shoot({
        groupName: ['playerSkill', 'senpuuGiri'],
        img: weaponImage,
        position: [['P'], ['P']],
        initialRotation: ['S', -225],
        scale: [-weaponScale, weaponScale],
        moveType: ['D', false],
        // 创建帧使用0速，避免 QJ 构造时的强制 update 偷跑一步。
        imgRotation: ['R', 0, true],
        anchor: [1.03, 1],
        opacity,
        hue: hueValue,
        subBullet: isSubBullet,
        existData: [
            // 玩家被眩晕
            { t: ['S', 'Fuku_Plugins.EventTremble.getRemainingCycles(-1) > 0 || $gamePlayer._moveSpeed <= 0', true] },
            // 切武器
            { t: ['S', '!$gameParty.leader().equips()[0] || $gameParty.leader().equips()[0].baseItemId == 4', true] },
            // 进入水面
            {
                t: ['S', '$gameMap.regionId(Math.floor($gamePlayer.centerRealX()), Math.floor($gamePlayer.centerRealY())) === 8 && $gamePlayer._Drill_ECE?.playing_type !== "空中飘浮"', true],
                a: ['S', '$gamePlayer.drill_EASA_setEnabled( true )']
            },
            // 即时投掷信号(来自接回旋镖技能)
            {
                t: ['B', 'throwImmediately1'],
                a: ['F', QJ.MPMZ.tl.ex_senpuuGiriThrow, [GamepadsAttack, Tsubame, { throwImmediately: true }]]
            }
        ],
        z: zLayer,
        collisionBox: ['C', 1],
        moveF: [
            [0, 0, QJ.MPMZ.tl.ex_updateSenpuuGiriSpin, [Tsubame]],
            [2, 2, QJ.MPMZ.tl.ex_checkSenpuuGiriAlignment, [GamepadsAttack, Tsubame]]
        ],
        deadF: [
            [QJ.MPMZ.tl.ex_senpuuGiriFinishAction, [GamepadsAttack, Tsubame]]
        ]
    });

    senpuuGiri._senpuuGiriSpin = {
        phase: 0,
        currentRate: initialPlaybackRate,
        pendingRate: null,
        rotationSpeed: 0,
        nextTurnRotation: senpuuGiri.rotationImg + 360,
        trailIndex: -1
    };
    QJ.MPMZ.tl.ex_setSenpuuGiriRotationRate(senpuuGiri, initialPlaybackRate);

    // ==================== 火属性攻击标记 ====================
    if ([17, 19].includes(wid)) {
        senpuuGiri.data.groupName.push("fire");
        $gameMap.addMapBulletsNameQJ(senpuuGiri.index, senpuuGiri.data.groupName);
    }

    // ==================== 操作模式:松手即投掷 ====================
    if (GamepadsAttack === 'Gamepad') {
        // 手柄:右摇杆全部松开 → 投掷
        const padReleasedExpr = [
            "Input.drill_isPadPressed('右摇杆上')",
            "Input.drill_isPadPressed('右摇杆下')",
            "Input.drill_isPadPressed('右摇杆左')",
            "Input.drill_isPadPressed('右摇杆右')"
        ].join(' || ');

        senpuuGiri.addExistData({
            t: ['S', padReleasedExpr, false],
            a: ['F', QJ.MPMZ.tl.ex_senpuuGiriThrow, [GamepadsAttack, Tsubame]]
        });
    } else if (!Utils.isMobileDevice()) {
        // PC:松开鼠标右键 → 投掷
        senpuuGiri.addExistData({
            t: ['S', '!TouchInput.drill_isRightPressed()', true],
            a: ['F', QJ.MPMZ.tl.ex_senpuuGiriThrow, [false, Tsubame]]
        });
    } else {
        // 移动端
        senpuuGiri.addExistData({
            t: ['S', '!TouchInput.drill_isLeftPressed()', true],
            a: ['F', QJ.MPMZ.tl.ex_senpuuGiriThrow, [GamepadsAttack, Tsubame]]
        });
    }

    // ==================== 接住回旋镖时立即投掷 ====================
    if (leader.hasSkill(70) && $gameMap.getGroupBulletListQJ('throwImmediately').length > 0) {
        senpuuGiri._throwImmediately = true;
        senpuuGiri.addExistData({
            t: ['Time', 1],
            a: ['F', QJ.MPMZ.tl.ex_senpuuGiriThrow, [GamepadsAttack, Tsubame, { throwImmediately: true }]]
        });
    }

    // ==================== 武器专属特效 ====================
    // 柳叶剑:柳叶飞镖效果
    if (wid === 80) {
        senpuuGiri.addMoveData("F", [10, 10, QJ.MPMZ.tl.ex_willowLeafEffects, ["senpuuGiri", Tsubame]]);
    }
    // ==================== 额外多段攻击 ====================
    if (!Tsubame && leader.hasSkill(99)) {
        const tsubameLevel = leader.skillMasteryLevel(99);
        let tsubameTime = 2;
        for (let i = 1; i <= tsubameLevel; i++) {
            tsubameTime += 4;
            senpuuGiri.addMoveData("F", [tsubameTime, 99999, QJ.MPMZ.tl.ex_senpuuGiri, [GamepadsAttack, true]]);
        }
    }

    // ==================== 伤害判定 hitbox + 刀光 ====================
    const trailImage = `weapon/weaponTrail${wid}`;
    const weaponDamage = chahuiUtil.getVarianceDamage(1);

    // 刀光透明度(无影剑虚化)
    const trailAlpha = leader.hasSkill(55) ? 0.1 : 0.75;

    // 安卓版不渲染刀光(性能问题)
    const trailEffect = (!Tsubame && !Utils.isMobileDevice())
        ? [{
            img: ['L', 0.5, 1, 0, 0.999999999, 0.2, 0, 0, 0],
            existTime: leader.hasSkill(94) ? 210 : 0,
            blendMode: 1,
            alpha: trailAlpha,
            disappearTime: 10,
            imgStretchMode: 0,
            ifProjctileWait: !leader.hasSkill(94),
            hOrV: true
        }]
        : [];

    // 武器碰撞体大小
    const noteMatch = weapon?.meta?.['hitBox'];
    const senpuuGiriTrail = QJ.MPMZ.Shoot({
        groupName: ['playerSkill', 'senpuuGiriTrail'],
        img: trailImage,
        position: [['P'], ['P']],
        initialRotation: ['S', -180],
        scale: weaponScale,
        moveType: ['D', false],
        opacity: 0,
        imgRotation: ['R', 0, true],
        anchor: [0.5, 1],
        existData: [
            {
                t: ['G', ['"enemy"', '"object"']],
                a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [weaponDamage, { weaponAttack: true }]],
                p: [-1, false, true]
            },
            { t: ['BE', senpuuGiri.index] },
            { t: ['B', 'enemyBullet'], p: [-1, false, true, QJ.MPMZ.tl.ex_weaponParry] }
        ],
        z: "E",
        collisionBox: noteMatch ? JSON.parse(noteMatch.replace(/'/g, '"')) : ['R', 8, 64],
        judgeAccuracyRotation: 10,
        trailEffect,
    });
    senpuuGiriTrail._lingeringSwordWaveDamage = weaponDamage;
    senpuuGiriTrail._lingeringTurnRemIndex = 0;
    senpuuGiri._senpuuGiriSpin.trailIndex = senpuuGiriTrail.index;
    QJ.MPMZ.tl.ex_setSenpuuGiriRotationRate(senpuuGiriTrail, initialPlaybackRate);
};

QJ.MPMZ.tl.playerAttackInterruptedCheck = function () {

    let actor = $gameParty.leader();

    let check1 = Fuku_Plugins.EventTremble.getRemainingCycles(-1) > 0 || $gamePlayer._moveSpeed <= 0;
    let check2 = !actor.equips()[0] || actor.equips()[0].baseItemId == 4;
    let check3 = $gameMap.regionId(Math.floor($gamePlayer.centerRealX()), Math.floor($gamePlayer.centerRealY())) === 8;

    return check1 || check2 || check3 || check4;
};

//旋风斩加速过程效果（由“刚好完成一圈”的时钟触发）
QJ.MPMZ.tl.ex_senpuuGiriAccelerationEffect = function (Phase, Tsubame, playbackRate) {

    const actor = $gameParty.leader();

    if (!Tsubame) {
        if (!actor.equips()[0]) return;
        const wid = actor.equips()[0].baseItemId;
        const weapon = $dataWeapons[wid];

        const controller = $gamePlayer._drill_EASe_controller;
        const nextPlaybackRate = Number.isFinite(playbackRate)
            ? playbackRate
            : QJ.MPMZ.tl.ex_senpuuGiriPlaybackRate(actor, Phase);
        if (controller !== undefined) {
            controller.drill_COAS_setStateSpeed(nextPlaybackRate);
        }

        const seNames = '剣の素振り（大剣を振る）'
        const randomPitch = Math.randomInt(40) + 110;
        AudioManager.playSe({ name: seNames, volume: 60, pitch: randomPitch, pan: 0 });

        let speed = 1;
        if (Phase) {
            speed += 0.15 * Phase;
            // 怪鸟的羽毛
            if (weapon?.note?.includes("<旋风斩加速>")) {
                speed += 0.45 * Phase;
                if (Phase === 3) {
                    this.data.groupName.push("playerInAir");
                    $gameMap.addMapBulletsNameQJ(this.index, this.data.groupName);
                    $gamePlayer.drill_ECE_playSustainingFloating(518400000, 30, 12, 120, 2);
                }
            }
        }
        // 额外受到旋风斩攻速影响，负攻速使用与 COAS 相同的换算规则。
        speed *= QJ.MPMZ.tl.ex_senpuuGiriAttackSpeedRate(actor);

        speed = Math.round(speed * 35) / 100;
        $dataStates[62].rateXParams[1] = speed;
        $gameParty.refreshMembers();

        // 香蕉大剑原本在第4档的预计时间启动，现改为真正完成第4圈时启动。
        if (Phase === 3 && wid === 60 && !this._senpuuGiriBananaTimerStarted) {
            this._senpuuGiriBananaTimerStarted = true;
            QJ.MPMZ.tl.ex_activateBananaGrenade.call(this, "senpuuGiri");
            this.addMoveData("F", [59, 60, QJ.MPMZ.tl.ex_activateBananaGrenade, ["senpuuGiri"]]);
        }
    }
    if ((actor.equips()[0]?.baseItemId || actor.equips()[0]?.id) === 37 && actor.isStateAffected(96)) {
        QJ.MPMZ.tl.MistilteinnWeaponAttack.call(this, {mouseDirection: true});
    }
    // 斩裂剑 - 斩剑波
    if (actor.hasSkill(44)) {
        QJ.MPMZ.tl.ex_swordEnergyAttack.call(this, undefined, 1);
    }

    //日轮-陨石术
    if (actor.hasSkill(57)) {
        let baseValue = 250;
        let luk = actor.luk;
        luk = Math.max(0, Math.min(600, luk));
        let adjustedValue = baseValue + (luk / 550) * 550;
        if (Math.randomInt(1001) < adjustedValue) {
            actor.equips()[0].durability -= 40;
            QJ.MPMZ.tl.ex_meteorStrike.call(this);
        }
    }
};

//旋风斩结束动作
QJ.MPMZ.tl.ex_senpuuGiriFinishAction = function (GamepadsAttack, Tsubame) {

    if (Tsubame) return;

    if ($gamePlayer._drill_EASe_controller !== undefined) {
        $gamePlayer._drill_EASe_controller.drill_COAS_clearStateSpeed();
    }
    // 停止漂浮效果
    $gamePlayer.drill_ECE_endSustainingFloating();
    $gameSystem.addGameTimeEvent({ key: 'state11', delayMinutes: 10 });
    $gameParty.leader().addState(11);
    $gameParty.leader().removeState(62);
    $dataMap.disableDashing = false;
    let rotationSpeed = QJ.MPMZ.tl.ex_getSenpuuGiriRotationSpeed(this);

    if (this._throwImmediately) {
        rotationSpeed = Math.max(rotationSpeed, 9);
    }

    $gameMap.steupCEQJ(163, 1, { rotation: rotationSpeed });

};

//旋风斩Z轴适配
QJ.MPMZ.tl.ex_checkSenpuuGiriAlignment = function (GamepadsAttack, Tsubame) {

    if (Tsubame) return;
    const player  = $gameParty.leader();

    if (this._senpuuGiriSpin?.phase >= 5 && !this._fullPower) {
        this._fullPower = true;
        //$gamePlayer.drill_EASe_setSimpleStateNode(["旋转中(全速)"]);
    }

    let adjustedRotation = (this.rotationImg + 405) % 360;
    if (adjustedRotation <= 90 || adjustedRotation >= 270) {
        if (player.hasSkill(55)) {
            this.changeAttribute("z", "MF_BR");
        } else {
            this.changeAttribute("z", "E");
        }
    } else {
        if (player.hasSkill(55)) {
            this.changeAttribute("z", "MF_UR");
        } else {
            this.changeAttribute("z", 10);
        }
    }

    let opacity = $gamePlayer._opacity / 255;
    this.changeAttribute("opacity", opacity);
};

//投掷出去的旋风斩
QJ.MPMZ.tl.ex_senpuuGiriThrow = function (GamepadsAttack, Tsubame, extraData = {}) {

    if (Tsubame) return;
    const actor = $gameParty.leader();
    let weapon = actor.equips()[0];
    if (!weapon) return;
    let rotationSpeed = QJ.MPMZ.tl.ex_getSenpuuGiriRotationSpeed(this);

    if (extraData.throwImmediately) {
        QJ.MPMZ.deleteProjectile("throwImmediately",{d:[1,20,1.5]});
        $gameMap.chahuiMapTemp.DensHandScytheCount = $gameMap.chahuiMapTemp.DensHandScytheCount || 0;
        $gameMap.chahuiMapTemp.DensHandScytheCount += 0.5;
        rotationSpeed = 12;
    }
    if (rotationSpeed < 9) return;
    var BulletImage = "weapon/weapon" + weapon.baseItemId;
    if (actor.isStateAffected(96)) {
        BulletImage  = "weapon/weapon_alt37";
    }    
    if (this.data.img != BulletImage) {
        console.log(this.data.img, BulletImage);
        return;
    }
    let posX = this.inheritX();
    let posY = this.inheritY();
    rotationSpeed = Math.max(30, rotationSpeed * 3);
    let throwSpeed = 4 + (rotationSpeed / 8);
    let zz, Talpha;

    $gameSystem.setBgsLine(9);
    var weaponImage = "weapon/weaponTrail" + weapon.baseItemId;
    if (actor.isStateAffected(96)) {
        weaponImage  = "weapon/weaponTrail37[6,8]";
    }   
    var weaponScale = this.scaleX;
    var weaponDamage = Math.floor(0.75 * chahuiUtil.getVarianceDamage(1));
    let imgRotation = ['R', rotationSpeed, true];
    let particles = [
        {
            img: weaponImage,
            scaleXMin: 1, scaleXMax: 1,
            intervalTime: -4,
            synScale: true,
            existTime: 0,
            offsetMin: [0, 0, 0],
            offsetMax: [0, 0, 0],
            offset: [0, 0, 0],
            disappearScale: 1, disappearTime: 30,
            opacityMax: 0.4,
            opacityMin: 0.4,
            moveType: ['0', '0']
        }
    ];
    // 旋风斩突刺形态
    if (actor.hasSkill(76)) {
        AudioManager.playSe({ name: "Sword4", volume: 90, pitch: 150, pan: 0 });
        particles = null;
        imgRotation = ['F', 180];
        weaponDamage *= 2;
    } else {
        AudioManager.playBgs({ name: "繰り返し風を切るほどの回転音", volume: 60, pitch: 100, pan: 0 });
    }
    // 兽人斧
    if (actor.hasSkill(38)) {
        weaponDamage = Math.floor(1.5 * weaponDamage);
    }
    // 克里乌之光
    if (actor.hasSkill(55)) {
        zz = "MF_BR";
        Talpha = 0.1;
    } else {
        zz = "E";
        Talpha = 0.75;
    }

    var iniRotation = ['M'];

    if (GamepadsAttack) {
        if (GamepadsAttack === 'Gamepad') {
            iniRotation = ['S', 'QJ.MPMZ.tl.ex_gamepadsCheckDirection(true)'];
        } else {
            iniRotation = ['S', "Input._pressAngle['ok']?Input._pressAngle['ok']:0"];
        }
    }

    let time = 60 + this.time;
    time = Math.min(time, 180);


    // 安卓版刀光会报错
    let TrailEffect = [];
    if (!Utils.isMobileDevice()) {
        TrailEffect = [{
            img: ['L', 0.5, 1, 0, 0.999999999, 0.4, 0, 0, 0],
            existTime: 0,
            blendMode: 1,
            alpha: Talpha,
            disappearTime: 10,
            imgStretchMode: 0,
            hOrV: true
        }];
    }

    var senpuuGiriThrow = QJ.MPMZ.Shoot({
        groupName: ['playerBullet', 'SenpuuGiri', 'weaponMarker'],
        img: weaponImage,
        position: [['S', posX], ['S', posY]],
        initialRotation: iniRotation,
        scale: weaponScale,
        imgRotation: imgRotation,
        anchor: [0.5, 0.5],
        existData: [
            { t: ['S', "!$gameParty.leader().equips()[0] || $gameParty.leader().equips()[0].baseItemId == 4", true] },
            { t: ['Time', time], a: ['S', 'AudioManager.fadeOutBgsByLine(1,9);$gameSwitches.setValue(182, false)'] },
            { t: ['G', ['"enemy"', '"object"']], a: [], p: [-1, true, true], c: ['T', 0, 60, true] },
        ],
        moveType: ['S', throwSpeed],
        moveF: [
        ],
        z: zz,
        collisionBox: ['R', 8, 64],
        judgeAccuracyRotation: 0,//判定精度，防止挥剑速度太快导致无法攻击到敌人
        judgeAccuracyMove: 8,
        particles: particles,
        trailEffect: TrailEffect,
        deadJS: [
            "if (this._destroyed) {AudioManager.stopBgsByLine(9)}"
        ]
    });
    if (!senpuuGiriThrow) return;
    // 火属性
    if ([17, 19].includes(weapon.baseItemId)) {
        senpuuGiriThrow.data.groupName.push("fire");
        $gameMap.addMapBulletsNameQJ(senpuuGiriThrow.index, senpuuGiriThrow.data.groupName);
    }

    // 旋风斩突刺形态
    if (actor.hasSkill(76)) {
        // senpuuGiriThrow.addExistData({t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[weaponDamage,{weaponAttack:true}]],p:[-1,true,true]});	
        senpuuGiriThrow.addExistData({ t: ['NP'], a: ['F', QJ.MPMZ.tl.ex_senpuuGiriWallPinned, [this.time]], c: ['S', 'this.time>10'], cb: ['C', 4] });
        senpuuGiriThrow.addExistData({ t: ['G', ['"enemy"', '"object"']], a: ['F', QJ.MPMZ.tl.ex_spiralThrust, [weaponDamage, "knockback"]], p: [-1, true, true], c: ['T', 0, 0, true] });
    } else {
        senpuuGiriThrow.addExistData({ t: ['G', ['"enemy"', '"object"']], a: ['F', QJ.MPMZ.tl.ex_senpuuGiriHold, [this.time]] });
        senpuuGiriThrow.addExistData({ t: ['R', [255]], a: ['F', QJ.MPMZ.tl.ex_senpuuGiriHold, [this.time]], c: ['S', 'this.time>10'] });
    }

    //柳叶剑特效
    if (weapon.baseItemId === 80) {
        senpuuGiriThrow.addMoveData("F", [5, 5, QJ.MPMZ.tl.ex_willowLeafEffects, ["senpuuGiriThrow", false]]);
    }

    //追踪效果
    if (actor.hasSkill(41)) {
        senpuuGiriThrow.addMoveData("F", [10, 10, QJ.MPMZ.tl.ex_projectileTrackingEffect]);
    }

    if ((weapon.baseItemId || weapon.id) === 37 && actor.isStateAffected(96)) {
        const interval = Math.ceil(360 / rotationSpeed);
        senpuuGiriThrow.addMoveData("F", [interval, interval, QJ.MPMZ.tl.MistilteinnWeaponAttack,
            [{bladeDirection: !actor.hasSkill(76), angle: actor.hasSkill(76) ? senpuuGiriThrow.rotationMove : undefined}]]);
    }

    //斩裂剑-斩剑波
    if (actor.hasSkill(44)) {
        senpuuGiriThrow.addMoveData("JS", [10, 10, 'QJ.MPMZ.tl.ex_swordEnergyAttack.call(this, undefined, 2)']);
    }

};

//旋风斩三段效果
QJ.MPMZ.tl.ex_senpuuGiriHold = function (chargeTime, args) {

    const actor = $gameParty.leader();
    if (!actor.equips()[0]) {
        AudioManager.fadeOutBgsByLine(1, 9);
        $gameSwitches.setValue(182, false);
        return;
    }

    // 回旋镖
    if (actor.hasSkill(70)) {
        QJ.MPMZ.tl.ex_senpuuGiriReturnToPlayer.call(this, args);
        return;
    }
    // 巨大蟹钳	
    if (actor.equips()[0].baseItemId === 14) {
        AudioManager.fadeOutBgsByLine(1, 9);
        $gameSwitches.setValue(182, false);
        QJ.MPMZ.tl.ex_giantCrabClawGrabsEnemy.call(this, args);
        return;
    }

    let posX = this.inheritX();
    let posY = this.inheritY();
    let angle = this.inheritRotation();
    let zz, Talpha;
    let weaponImage = "weapon/weaponTrail" + actor.equips()[0].baseItemId;
    if (actor.isStateAffected(96)) {
        weaponImage  = "weapon/weaponTrail37[6,8]";
    }    
    let weaponScale = this.scaleX;
    let weaponDamage = Math.round(0.5 * chahuiUtil.getVarianceDamage(1));
    if (actor.hasSkill(38)) {
        weaponDamage = Math.floor(1.5 * weaponDamage);
    }
    let time = 30;
    if (chargeTime && chargeTime > 30) {
        time += Math.min(Math.round(chargeTime / 6), 150);
    }
    if (actor.hasSkill(41)) {
        time += 120;
    }
    $gameSwitches.setValue(182, true);

    if (actor.hasSkill(55)) {
        zz = "MF_BR";
        Talpha = 0.1;
    } else {
        zz = "E";
        Talpha = 0.75;
    }

    // 安卓版刀光会报错
    let TrailEffect = [];
    if (!Utils.isMobileDevice()) {
        TrailEffect = [{
            img: ['L', 0.5, 1, 0, 0.999999999, 0.4, 0, 0, 0],
            existTime: 0,
            blendMode: 1,
            alpha: Talpha,
            disappearTime: 10,
            imgStretchMode: 0,
            hOrV: true
        }];
    }

    var senpuuGiriHold = QJ.MPMZ.Shoot({
        groupName: this.data.groupName,
        img: weaponImage,
        position: [['S', posX], ['S', posY]],
        initialRotation: ['M'],
        imgRotation: ['S', angle],
        scale: weaponScale,
        imgRotation: ['R', 36, true],
        anchor: [0.5, 0.5],
        existData: [
            { t: ['Time', time] },
            { t: ['S', "!$gameParty.leader().equips()[0] || $gameParty.leader().equips()[0].baseItemId == 4", true] },
            //{t:['G',['"enemy"','"object"']],a:['C',155,[weaponDamage,0,0,0]],p:[-1,true,true]},
            { t: ['G', ['"enemy"', '"object"']], a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [weaponDamage, { weaponAttack: true }]], p: [-1, false, true], c: ['T', 0, 6, true] },
        ],
        moveType: ['S', 0],
        z: zz,
        collisionBox: ['C', 32],
        moveF: [
        ],
        trailEffect: TrailEffect,
        deadJS: ["AudioManager.fadeOutBgsByLine(1,9);$gameSwitches.setValue(182, false);"]
    });
    if (!senpuuGiriHold) return;
    //柳叶剑特效
    if (actor.equips()[0].baseItemId === 80) {
        senpuuGiriHold.addMoveData("F", [5, 5, QJ.MPMZ.tl.ex_willowLeafEffects, ["senpuuGiriHold"]]);
    }

    //追踪效果
    if (actor.hasSkill(41)) {
        senpuuGiriHold.addMoveData("F", [10, 10, QJ.MPMZ.tl.ex_projectileTrackingEffect]);
    }

};

//旋风斩结束效果
QJ.MPMZ.tl.ex_senpuuGiriFinishEffect = function () {
    AudioManager.fadeOutBgsByLine(1, 9);
    $gameSwitches.setValue(182, false);
};

//=============================================================================
//玩家异常状态
//=============================================================================

// 玩家积水
QJ.MPMZ.tl.ex_playerWaterlogged = function(extra={}) {
    const stateName = 'playerWaterlogged';
    const player = $gameParty.leader();
    if (extra.consumeStacks) {
        let stacks = player.getStateCounter(93);
        stacks -= 1;
        player.addStateCounter(93, -1);
        $dataStates[93].rateXParams[1] = (1-stacks*0.1);
        if (stacks <= 0) {
            this.setDead({t:['Time',0],d:[0, 20]});
        }
        return;
    } 

    if ($gameMap.getGroupBulletListQJ(stateName).length > 0) {
        return;
    }
    if (!player.isStateAffected(93)) {
        player.addState(93);
    }
    let posX = `$gamePlayer.screenBoxXShowQJ()`;
    let posY = `$gamePlayer.screenBoxYShowQJ()+($gameParty.leader().isStateAffected(67) ? 5 : 20)`;
    QJ.MPMZ.Shoot({
        groupName: [stateName, 'Waterlogged'],
        img: ['A', 196, -1],
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        blendMode: 0,
        scale: 0.5,
        anchor:[0.5, 0.5],
        moveType: ['D', true],
        collisionBox: ['C', 30],
        z: "E",
        existData: [
            { t: ['S', "$gameParty.leader().isStateAffected(93)", false], d: [0, 20] },
        ],
        moveF: [
            [300, 300, QJ.MPMZ.tl.ex_playerWaterlogged, [{consumeStacks: true}]]
        ]
    });
  
};

//玩家中毒
QJ.MPMZ.tl.ex_playerPoison = function (damage = 1, time = 4, extra={}) {
    const player = $gameParty.leader();
    if (extra.poisonEffect) {
        if ($gameMessage.isBusy() || $gameMap.isEventRunning() || $gameSystem._ZzyTWFTheWorlding) return;

        let randomPitch = Math.randomInt(30) + 91;
        AudioManager.playSe({ name: "Poison", volume: 40, pitch: randomPitch, pan: 0 });
        if (!Utils.isMobileDevice()) $gamePlayer.requestAnimation(187);
        let finalDamage = damage;
        if (this._extraDamage) {
            finalDamage += this._extraDamage;
        }
        finalDamage *= 1 + (this.time / 600);
        finalDamage = Math.max(1, Math.floor(finalDamage));
        SimpleMapDamageQJ.put(3, -1, finalDamage, 0, -72);
        player.gainHp(-finalDamage);
        // 死亡登记
        if (finalDamage >= player.hp) {
            QJ.MPMZ.tl.tryRecordOniiChanDefeatCause.call(this, {damageType:2, damage:finalDamage});
        }                
        //重伤判定
        if (player.hpRate() <= 0.2) {
            $gameScreen.startShake(1, 8, 30);
            QJ.MPMZ.tl.ex_playerDamageFlash();
        }
        return;
    } 


    if ($gameSystem.hasGameTimeEvent("state5")) {
        player.addState(5);
        time = Math.floor(time / 2);
        $gameSystem.adjustGameTimeEventDelay('state5', time, true);
    } else {
        player.addState(5);
        $gameSystem.addGameTimeEvent({
            key: 'state5',
            command: 'remove',
            delayMinutes: time,
            target: 5,
            condition: 'true'
        });
    }

    if ($gameMap.getGroupBulletListQJ('playerPoison').length > 0) {
        let BID = $gameMap.getGroupBulletListQJ('playerPoison')[0];
        let bullet = $gameMap._mapBulletsQJ[BID];
        if (!bullet) return;
        bullet._extraDamage = bullet._extraDamage || 0;
        bullet._extraDamage += damage;
    } else {
        const Poison = QJ.MPMZ.Shoot({
            groupName: ['playerPoison', 'poison', 'Status'],
            img: "poison[6,10,1]",
            position: [['P'], ['P']],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            blendMode: 1,
            scale: [0.4, 0.4],
            moveType: ['B', -1],
            collisionBox: ['C', 1],
            existData: [
                { t: ['S', '!$gameParty.leader().isStateAffected(5)', true], d: [0, 30], c: ['S', 'this.time>30'] },
            ],
            moveF: [
                [60, 60, QJ.MPMZ.tl.ex_playerPoison, [damage, 1, {poisonEffect: true}]]
            ],
        });
        if (!Poison) return;
        //中毒时的全屏幕演出
        if (!Utils.isMobileDevice()) {
            let index = Poison.index;
            QJ.MPMZ.Shoot({
                groupName: ['playerPoisonEffect',],
                img: "pipofm-fullscreeneffect_020[5,4,5]",
                position: [['S', 0], ['S', 0]],
                initialRotation: ['S', 0],
                imgRotation: ['F'],
                blendMode: 3,
                immuneTimeStop: true,
                opacity: 1,
                scale: 0.75,
                onScreen: true,
                anchor: [0, 0],
                moveType: ['S', 0],
                collisionBox: ['C', 1],
                existData: [{ t: ['BE', index] }]
            });
        }

    }
    //获取异常状态的演出
    QJ.MPMZ.tl.ex_effectFonts("zhongdu", -1);
};

//玩家中毒效果（已废弃
QJ.MPMZ.tl.ex_playerPoisonEffect = function (damage) {

    if ($gameMessage.isBusy() || $gameMap.isEventRunning() || $gameSystem._ZzyTWFTheWorlding) return;

    let randomPitch = Math.randomInt(30) + 91;
    AudioManager.playSe({ name: "Poison", volume: 40, pitch: randomPitch, pan: 0 });
    if (!Utils.isMobileDevice()) $gamePlayer.requestAnimation(187);
    let finalDamage = damage;
    if (this._extraDamage) {
        finalDamage += this._extraDamage;
    }
    finalDamage *= 1 + (this.time / 600);
    finalDamage = Math.max(1, Math.floor(finalDamage));
    SimpleMapDamageQJ.put(3, -1, finalDamage, 0, -72);
    $gameParty.leader().gainHp(-finalDamage);
    //重伤判定
    if ($gameParty.leader().hpRate() <= 0.2) {
        $gameScreen.startShake(1, 8, 30);
        QJ.MPMZ.tl.ex_playerDamageFlash();
    }
};

//打雷
QJ.MPMZ.tl.ex_playerElectrified = function (time = 1) {

    $gameSwitches.setValue(14, true);
    if (typeof time !== 'number' || !Number.isFinite(time)) {
        time = 1;
    }
    if ($gameSystem.hasGameTimeEvent("state7")) {
        // $gameParty.leader().addState(7);
        // $gameSystem.adjustGameTimeEventDelay('state7', time, true);
    } else {
        $gameParty.leader().addState(7);
        $gameSystem.addGameTimeEvent({
            key: 'state7',
            command: 'remove',
            delayMinutes: time,
            target: 7,
            condition: 'true'
        });
    }

    if ($gameMap.getGroupBulletListQJ('playerElectrified').length === 0) {

        // 电流音效
        var se = { name: "バチバチ（感電したような音）", volume: 70, pitch: 100, pan: 0 };
        AudioManager.playSe(se);

        $gamePlayer.drill_EASe_stopAct();
        if (!$gameParty.leader().isStateAffected(9) && !$gameParty.leader().isStateAffected(67)) {
            $gamePlayer.drill_EASe_setSimpleStateNode(["被雷劈"]);
        }
        Fuku_Plugins.EventTremble.start(-1, 1, 8);

        var Electrified = QJ.MPMZ.Shoot({
            groupName: ['playerElectrified', 'electrified'],
            img: "paralysis[6,10,1]",
            position: [['P'], ['P']],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            blendMode: 1,
            scale: 0.5,
            anchor: [0.5, 0.5],
            moveType: ['D', true],
            collisionBox: ['C', 48],
            existData: [
                { t: ['S', '!$gameParty.leader().isStateAffected(7)', true], a: [], c: ['S', 'this.time > 30'] },
                //{ t: ['B', ['enemyBullet']], a: ['F', QJ.MPMZ.tl.ex_FreezeBreak, [damage]], c: ['S', 'this.time > 30 && Math.random() > 0.8'] },
                //{t:['S','$gameParty.leader().isStateAffected(67)',true],a:[],p: [-1, false, true],c:['T',15,15,true]},	
            ],
            moveF: [
                [20, 20, QJ.MPMZ.tl.ex_playerElectrifiedEffect]
            ],
            deadJS: ["$gamePlayer.drill_EASA_setEnabled(true);$gameSwitches.setValue(14, false);Fuku_Plugins.EventTremble.stop(-1)"]
        });
        //打雷时的全屏幕演出
        if (!Utils.isMobileDevice()) {
            let index = Electrified.index;
            QJ.MPMZ.Shoot({
                groupName: ['playerElectrifiedEffect',],
                img: "pipofm-fullscreeneffect_019[5,4,5]",
                position: [['S', 0], ['S', 0]],
                initialRotation: ['S', 0],
                imgRotation: ['F'],
                blendMode: 3,
                opacity: 1,
                scale: 0.75,
                onScreen: true,
                anchor: [0, 0],
                moveType: ['S', 0],
                collisionBox: ['C', 1],
                existData: [{ t: ['BE', index] }]
            });
        }
    }

};

//打雷中效果判定
QJ.MPMZ.tl.ex_playerElectrifiedEffect = function () {
    this._count = this._count || 0;
    this._count += 1;
    if (this._count >= 5) {
        // 电流音效
        var se = { name: "バチバチ（感電したような音）", volume: 70, pitch: 100, pan: 0 };
        AudioManager.playSe(se);
        this._count = 0;
    }

    if ($gameParty.leader().isStateAffected(9) || $gameParty.leader().isStateAffected(67)) {
        QJ.MPMZ.tl.ex_conductiveEffectOnWater.call(this);
    }
};

//冰结
QJ.MPMZ.tl.ex_playerFreeze = function (time) {
    $gameSwitches.setValue(14, true);
    if (!time) var time = 5;

    if ($gameSystem.hasGameTimeEvent("state9")) {
        $gameParty.leader().addState(9);
        time = Math.floor(time / 2);
        $gameSystem.adjustGameTimeEventDelay('state9', time, true);
    } else {
        $gameParty.leader().addState(9);
        $gameSystem.addGameTimeEvent({
            key: 'state9',
            command: 'remove',
            delayMinutes: time,
            target: 9,
            condition: 'true'
        });
    }

    // 冻结音效
    var se = { name: "凍りつく時の効果音「キーーーン」", volume: 60, pitch: 100, pan: 0 };
    AudioManager.playSe(se);

    $gamePlayer.drill_EASe_stopAct();
    if (!$gameParty.leader().isStateAffected(67) && $gameParty.leader()._characterName !== "$player_swim") {
        $gamePlayer.drill_EASe_setSimpleStateNode(["被冻结"]);
    }

    if ($gameMap.getGroupBulletListQJ('playerFreeze').length > 0) {
        let index = $gameMap.getGroupBulletListQJ('playerFreeze')[0];
        QJ.MPMZ.Shoot({
            groupName: ['playerFreezeExa', 'freeze'],
            img: "Ice[8,6]",
            position: [['P'], ['P']],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            blendMode: 3,
            opacity: 0.4,
            scale: 0.5,
            anchor: [0.45, 0.55],
            moveType: ['D', true],
            collisionBox: ['C', 1],
            existData: [{ t: ['BE', index] }]
        });
    } else {
        let damage = Math.floor($gameParty.leader().mhp * 0.15);
        const isMobile = Utils.isMobileDevice();
        let Frozen = QJ.MPMZ.Shoot({
            groupName: ['playerFreeze', 'freeze'],
            img: "Ice[8,6]",
            position: [['P'], ['P']],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            blendMode: 1,
            scale: [0.5, 0.5],
            anchor: [0.45, 0.55],
            moveType: ['B', -1],
            collisionBox: ['C', 48],
            existData: [
                { t: ['S', '!$gameParty.leader().isStateAffected(9)', true], a: ['F', QJ.MPMZ.tl.ex_playFreezeBreak, [0]], c: ['S', 'this.time > 30'] },
                { t: ['B', ['enemyBullet']], a: ['F', QJ.MPMZ.tl.ex_playFreezeBreak, [damage]], c: ['S', 'this.time > 30 && Math.random() > 0.8'] }
            ],
            moveF: [
                [20, 1, QJ.MPMZ.tl.ex_playerFrozenStruggle, [isMobile]]
            ]
        });
        //冻结时的全屏幕演出
        if (!Utils.isMobileDevice()) {
            let index = Frozen.index;
            QJ.MPMZ.Shoot({
                groupName: ['playerFreezeEffect',],
                img: "pipofm-fullscreeneffect_017[5,6,5]",
                position: [['S', 0], ['S', 0]],
                initialRotation: ['S', 0],
                imgRotation: ['F'],
                blendMode: 3,
                opacity: 1,
                scale: 0.75,
                onScreen: true,
                anchor: [0, 0],
                moveType: ['S', 0],
                collisionBox: ['C', 1],
                existData: [{ t: ['BE', index] }]
            });
        }

    }

    // 效果字演出
    QJ.MPMZ.tl.ex_effectFonts("bingjie", -1);
};

//被冻结时的挣扎行动
QJ.MPMZ.tl.ex_playerFrozenStruggle = function (isMobile) {

    let triggered = false;
    if (isMobile) {
      triggered = Input.isTriggered('up') || Input.isTriggered('down') ||
      Input.isTriggered('left') || Input.isTriggered('right');  
    } else {
      triggered = Input.drill_isKeyTriggered('w') ||
        Input.drill_isKeyTriggered('s') ||
        Input.drill_isKeyTriggered('a') ||
        Input.drill_isKeyTriggered('d');
    }   

    if (triggered && Math.random() > 0.15) {
        if (Fuku_Plugins.EventTremble.getRemainingCycles(-1) === 0) {
            Fuku_Plugins.EventTremble.start(-1, 2, 1, 4);

            if ($gameSystem.hasGameTimeEvent("state9")) {
                $gameSystem.adjustGameTimeEventDelay('state9', -1, true);
            }
        }
    }
};

QJ.MPMZ.tl.ex_playFreezeBreak = function (damage, args) {
    var se = { name: "氷系魔法を発動した効果音", volume: 65, pitch: 100, pan: 0 };
    AudioManager.playSe(se);

    let posX = this.inheritX();
    let posY = this.inheritY();
    var magicScale = this.scaleX;

    QJ.MPMZ.Shoot({
        img: 'IceBreak[8,4]',
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', 0],
        scale: magicScale,
        moveType: ['S', 0],
        imgRotation: ['F'],
        anchor: [0.5, 0.5],
        opacity: 0.8,
        blendMode: 1,
        existData: [
            { t: ['Time', 31] },
        ],
        collisionBox: ['C', 1],
    });
    $gamePlayer.drill_EASA_setEnabled(true);
    if ($gameParty.leader()._characterName !== "$player_swim") {
        let character = $gamePlayer;
        character._drill_JSp['enabled'] = true;
        character._drill_JSp['height'] = 64;
        character._drill_JSp['time'] = 45;
        character._drill_JSp['speed'] = -1;
        $gamePlayer.jump(0, 0);
    }
    $gameSwitches.setValue(14, false);

    if (damage && typeof damage === 'number' && damage > 0) {
        QJ.MPMZ.tl.ex_playerDamageCheck(damage, 2);
    }

};

//玩家出血
QJ.MPMZ.tl.ex_playerBleeding = function (damage = 1, time = 4, extra={}) {
    const player = $gameParty.leader();
    if (extra.bleedingEffect) {
        if ($gameMessage.isBusy() || $gameMap.isEventRunning() || $gameSystem._ZzyTWFTheWorlding) return;
        //if (!Utils.isMobileDevice()) $gamePlayer.requestAnimation(186);
        let randomPitch = Math.randomInt(30) + 91;
        AudioManager.playSe({ name: "血がたれる1", volume: 90, pitch: randomPitch, pan: 0 });

        let finalDamage = damage;
        if (this._extraDamage) {
            finalDamage += this._extraDamage;
        }
        finalDamage += 0.005 * player.mhp;
        // 结算玩家的出血抵抗
        if (player.hasSkill(53)) {
            finalDamage *= 0.7 ** player.skillMasteryLevel(53);
        }

        finalDamage = Math.max(1, Math.floor(finalDamage));
        SimpleMapDamageQJ.put(2, -1, finalDamage, 0, -64);
        // 死亡登记
        if (finalDamage >= player.hp) {
            QJ.MPMZ.tl.tryRecordOniiChanDefeatCause.call(this, {damageType: 1, damage:finalDamage});
        }        
        player.gainHp(-finalDamage);                
        //重伤判定
        if (player.hpRate() <= 0.2) {
            $gameScreen.startShake(1, 8, 30);
            QJ.MPMZ.tl.ex_playerDamageFlash();
        }
        return;
    }

    if ($gameSystem.hasGameTimeEvent("state6")) {
        player.addState(6);
        time = Math.floor(time / 2);
        $gameSystem.adjustGameTimeEventDelay('state6', time, true);
    } else {
        player.addState(6);
        $gameSystem.addGameTimeEvent({
            key: 'state6',
            command: 'remove',
            delayMinutes: time,
            target: 6,
            condition: 'true'
        });
    }

    if ($gameMap.getGroupBulletListQJ('playerBleeding').length > 0) {
        let BID = $gameMap.getGroupBulletListQJ('playerBleeding')[0];
        let bullet = $gameMap._mapBulletsQJ[BID];
        if (!bullet) return;
        bullet._extraDamage = bullet._extraDamage || 0;
        bullet._extraDamage += damage;
    } else {
        let Bleeding = QJ.MPMZ.Shoot({
            groupName: ['playerBleeding', 'bleeding', 'Status'],
            img: "Bleeding[6,10,1]",
            position: [['P'], ['P']],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            blendMode: 1,
            scale: [0.4, 0.4],
            moveType: ['B', -1],
            collisionBox: ['C', 1],
            existData: [
                { t: ['S', '!$gameParty.leader().isStateAffected(6)', true], d: [0, 30], c: ['S', 'this.time>30'] },
            ],
            moveF: [
                [60, 60, QJ.MPMZ.tl.ex_playerBleeding, [damage, 1, {bleedingEffect:true}]]
            ],
        });

        //出血时的全屏幕演出
        if (!Utils.isMobileDevice()) {
            let index = Bleeding.index;
            QJ.MPMZ.Shoot({
                groupName: ['playerBleedingEffect',],
                img: "pipofm-fullscreeneffect_024[5,6,5]",
                position: [['S', 0], ['S', 0]],
                initialRotation: ['S', 0],
                imgRotation: ['F'],
                blendMode: 0,
                opacity: 0.8,
                scale: 0.75,
                onScreen: true,
                anchor: [0, 0],
                moveType: ['S', 0],
                collisionBox: ['C', 1],
                existData: [{ t: ['BE', index] }]
            });
        }
    }
    //获取异常状态的演出
    QJ.MPMZ.tl.ex_effectFonts("xueyan", -1);
};

//玩家出血效果
QJ.MPMZ.tl.ex_playerBleedingEffect = function (damage) {

    if ($gameMessage.isBusy() || $gameMap.isEventRunning() || $gameSystem._ZzyTWFTheWorlding) return;
    if (!Utils.isMobileDevice()) $gamePlayer.requestAnimation(186);
    let randomPitch = Math.randomInt(30) + 91;
    AudioManager.playSe({ name: "血がたれる1", volume: 90, pitch: randomPitch, pan: 0 });

    let finalDamage = damage;
    if (this._extraDamage) {
        finalDamage += this._extraDamage;
    }
    finalDamage += 0.005 * $gameParty.leader().mhp;
    // 结算玩家的出血抵抗
    if ($gameParty.leader().hasSkill(53)) {
        finalDamage *= 0.7 ** $gameParty.leader().skillMasteryLevel(53);
    }

    finalDamage = Math.max(1, Math.floor(finalDamage));
    SimpleMapDamageQJ.put(2, -1, finalDamage, 0, -64);
    $gameParty.leader().gainHp(-finalDamage);
    //重伤判定
    if ($gameParty.leader().hpRate() <= 0.2) {
        $gameScreen.startShake(1, 8, 30);
        QJ.MPMZ.tl.ex_playerDamageFlash();
    }
};

//玩家炎上
QJ.MPMZ.tl.ex_playerBurning = function (damage, time) {

    if (!damage) var damage = 1;
    if (!time) var time = 4;

    if ($gameSystem.hasGameTimeEvent("state8")) {
        $gameParty.leader().addState(8);
        time = Math.floor(time / 2);
        $gameSystem.adjustGameTimeEventDelay('state8', time, true);
    } else {
        $gameParty.leader().addState(8);
        $gameSystem.addGameTimeEvent({
            key: 'state8',
            command: 'remove',
            delayMinutes: time,
            target: 8,
            condition: 'true'
        });
    }



    if ($gameMap.getGroupBulletListQJ('playerBurning').length > 0) {
        let BID = $gameMap.getGroupBulletListQJ('playerBurning')[0];
        let bullet = $gameMap._mapBulletsQJ[BID];
        if (!bullet) return;
        bullet._extraDamage = bullet._extraDamage || 0;
        bullet._extraDamage += damage;
    } else {
        var Burning = QJ.MPMZ.Shoot({
            groupName: ['playerBurning', 'burning', 'Status', 'fire'],
            img: "burn[6,10,1]",
            position: [['P'], ['P']],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            blendMode: 1,
            scale: [0.4, 0.4],
            moveType: ['D', true],
            collisionBox: ['C', 80],
            existData: [
                { t: ['S', '!$gameParty.leader().isStateAffected(8)', true], d: [0, 30], c: ['S', 'this.time>30'] },
                { t: ['G', ['"enemy"', '"object"']], a: ['F', QJ.MPMZ.tl.ex_burningEffect, [damage]], p: [-1, true, true], c: ['T', 15, 15, true] },
                { t: ['P'], a: ['F', QJ.MPMZ.tl.ex_burningEffect, [damage]], p: [-1, true, true], c: ['T', 15, 15, true] },
                { t: ['B', ['freeze']], a: ['S', "$gameSystem.triggerGameTimeEventNow('state8')"], d: [0, 30], an: 181, cb: ['C', 1] },
                { t: ['S', '$gameParty.leader().isStateAffected(67)', true], a: ['S', "$gameSystem.triggerGameTimeEventNow('state8')"], d: [0, 30], an: 181 },
            ],
            deadF: [[QJ.MPMZ.tl.ex_playerBurningEndEffect]]
        });

        //炎上时的全屏幕演出
        if (!Utils.isMobileDevice()) {
            let index = Burning.index;
            QJ.MPMZ.Shoot({
                groupName: ['playerBurningEffect',],
                img: "pipofm-fullscreeneffect_016[5,4,5]",
                position: [['S', 0], ['S', 0]],
                initialRotation: ['S', 0],
                imgRotation: ['F'],
                blendMode: 3,
                opacity: 1,
                scale: 0.75,
                onScreen: true,
                anchor: [0, 0],
                moveType: ['S', 0],
                collisionBox: ['C', 1],
                existData: [{ t: ['BE', index] }]
            });
        }
    }
    //获取异常状态的演出
    QJ.MPMZ.tl.ex_effectFonts("yanshang", -1);
};

//玩家炎上结束效果
QJ.MPMZ.tl.ex_playerBurningEndEffect = function () {
    if (!$gameParty.leader().isStateAffected(8)) {
        //$gamePlayer.drill_EASe_stopAct();
        //$gamePlayer.drill_EASe_setSimpleStateNode( ["被烧焦"] );
        var id = "Scorched";
        var filterTarget = 3999;
        $gameMap.createFilter(id, "adjustment", filterTarget);
        $gameMap.setFilter(id, [1, 1, 1, 0.8, 0.4, 0.4, 0.4, 1]);
        $gameMap.moveFilter(id, [1, 1, 1, 1, 1, 1, 1, 1], 120);
        $gameMap.eraseFilterAfterMove(id);
        $gameScreen._particle.particleSet(0, 'smoke_c-P', 'player', 'smoke_c');
        $gameScreen._particle.particleUpdate(['smoke_c-P', 'pos', 0, -20]);
        $gameScreen._particle.reservePluginCommand(120, {}, ['clear', 'smoke_c-P'], 0);
    }
};


//炎上效果
QJ.MPMZ.tl.ex_burningEffect = function (damage, args) {

    if (args.target && args.target instanceof Game_Player) {
        if (!Utils.isMobileDevice()) $gamePlayer.requestAnimation(188);
        let randomPitch = Math.randomInt(30) + 91;
        AudioManager.playSe({ name: "Fire2", volume: 30, pitch: randomPitch, pan: 0 });

        let finalDamage = damage;
        if (this._extraDamage) {
            finalDamage += this._extraDamage;
        }
        finalDamage = Math.max(1, Math.floor(finalDamage));
        SimpleMapDamageQJ.put(2, -1, finalDamage, 0, -64);
        $gameParty.leader().gainHp(-finalDamage);

        // 重伤判定
        if ($gameParty.leader().hpRate() <= 0.2) {
            $gameScreen.startShake(1, 8, 30);
            QJ.MPMZ.tl.ex_playerDamageFlash();
        }
        return;
    }

    if (args.target && args.target instanceof Game_Event) {
        let eventId = args.target._eventId;
        if (!Utils.isMobileDevice()) args.target.requestAnimation(188);
        let randomPitch = Math.randomInt(30) + 91;
        AudioManager.playSe({ name: "Fire2", volume: 30, pitch: randomPitch, pan: 0 });

        let finalDamage = damage;
        if (this._extraDamage) {
            finalDamage += this._extraDamage;
        }

        // 伤害计算
        let enemyDEF = $gameSelfVariables.value([$gameMap.mapId(), eventId, 'DEF']);
        let enemyHP = $gameSelfVariables.value([$gameMap.mapId(), eventId, 'HP']);

        finalDamage -= enemyDEF;
        finalDamage = Math.max(1, finalDamage);
        finalDamage = Math.min(99999999, finalDamage);
        finalDamage = Math.max(1, Math.floor(finalDamage));
        SimpleMapDamageQJ.put(2, eventId, finalDamage, 0, -64);

        // 伤害结算
        $gameSelfVariables.setValue([$gameMap.mapId(), eventId, 'HP'], enemyHP - finalDamage);

        // 显示血条变化
        args.target.showHpBar();

        // 死亡判断
        enemyHP = $gameSelfVariables.value([$gameMap.mapId(), eventId, 'HP']);
        if (enemyHP <= 0) {
            $gameSelfSwitches.setValue([$gameMap.mapId(), eventId, 'D'], true);
            return;
        }
    }
};

//眩晕
QJ.MPMZ.tl.ex_playerParalysis = function (time) {

    $gameSwitches.setValue(14, true);
    if (!time) var time = 1;

    if ($gameSystem.hasGameTimeEvent("state11")) {
        // $gameParty.leader().addState(7);
        // $gameSystem.adjustGameTimeEventDelay('state7', time, true);
    } else {
        $gameParty.leader().addState(11);
        $gameSystem.addGameTimeEvent({
            key: 'state11',
            command: 'remove',
            delayMinutes: time,
            target: 11,
            condition: 'true'
        });
    }

    if ($gameMap.getGroupBulletListQJ('playerParalysis').length > 0) return;

    // 眩晕音效
    let seNames = "ヒヨコが頭の上を回る";
    let se = { name: seNames, volume: 100, pitch: 100, pan: 0 };
    AudioManager.playSe(se);

    $gamePlayer.drill_EASe_stopAct();
    if (!$gameParty.leader()._drill_EASA_enabled && !$gameParty.leader().isStateAffected(67)) {
        if ($gameParty.leader()._characterName !== "$player_swim") {
            $gamePlayer.drill_EASe_setSimpleStateNode(["虚弱"]);
        }
    }
    let paralysis = QJ.MPMZ.Shoot({
        groupName: ['playerParalysis', 'paralysis'],
        img: "dizzy[5,3,4]",
        position: [['P'], ['P']],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        blendMode: 1,
        scale: 0.5,
        anchor: [0.5, 0.7],
        moveType: ['D', true],
        collisionBox: ['C', 48],
        existData: [
            { t: ['S', '!$gameParty.leader().isStateAffected(11)', true], a: [], c: ['S', 'this.time > 30'] },
        ],
        deadJS: ["$gamePlayer.drill_EASA_setEnabled(true);$gameSwitches.setValue(14, false)"]
    });
};


//玩家穿越星之门
QJ.MPMZ.tl.ex_playerTravelsthroughStarGate = function () {

    //Zzy.TWF.ToTheWorld(true);


    var angle;
    switch ($gamePlayer.direction()) {
        case 2:  // 下
            angle = 90;
            break;
        case 4:  // 左
            angle = 180;
            break;
        case 6:  // 右
            angle = 0;
            break;
        case 8:  // 上
            angle = 270;
            break;
        default:
            angle = 270;
            break;
    }
    $gamePlayer.drill_EFOE_playHidingMoveDisappear(45, angle, 24);

    if (!this) return;
    let MHP = $gameSelfVariables.get(this, 'MHP');
    let HP = $gameSelfVariables.get(this, 'HP');
    let rate = HP / MHP;
    if (rate < 0.5) {
        $gameVariables.setValue(13, 3);
    } else {
        $gameVariables.setValue(13, 3);
    }

};

/*
var data = $gameSystem._drill_GFPT_dataTank[ 10 ];
var text = "\\str[41]妹 \n";
text += "\\{\\i[2]\\} ??? \n";
text += "\\py[-8]" + $dataStates[$gameActors.actor(2)._states[0]].description;
text += "\n\\fs[16]\\py[20]✦ドロップアイテム:  \n";
text += "\\fs[14]\\py[-10]" + $dataArmors[$gameActors.actor(2)._equips[1]._itemId].infoTextTop;
data['context'] = text;
$gameTemp._drill_GFPT_windowTank[ 10 ].drill_initMessage();
*/


//=============================================================================
//妹妹场景相关
//=============================================================================

//妹妹状态hud
QJ.MPMZ.tl._imoutoUtilStatesHud = function () {
    if ($gameSystem._drill_GFPT_dataTank[10]) {
        var data = $gameSystem._drill_GFPT_dataTank[10];

        var text = "\\str[41]妹 \n";
        text += "\\fs[28]\\i[2]\\fr ??? ";
        var stateList = $gameActors.actor(2).getStateCategoryAffectedList('imoutoState');
        if (stateList.length > 0) {
            stateList.forEach(function (stateId) {
                text += "\n${$dataStates[" + stateId + "].description}";
                //text += "\n"+$dataStates[ stateId ].description;
            });
        }

        text += "\n\\fs[16]\\py[20]✦ドロップアイテム:  \n";
        if ($gameActors.actor(2).equips()[1]) {
            text += "\\fs[14]\\py[-10]" + $dataArmors[$gameActors.actor(2)._equips[1]._itemId].infoTextTop;
        } else {
            text += "\\fs[14]\\py[-10]" + $dataArmors[159].infoTextTop;
        }
        //data['context'] = text;
        $gameTemp._drill_GFPT_windowTank[10].drill_refreshMessage(text);
    }
};

//拳头武器攻击行为监听
QJ.MPMZ.tl.ex_punchAttackListener = function () {

    if (!$gameParty.leader().equips()[0]) return;
    if ($gameMap.getGroupBulletListQJ('attackMonitoring').length > 0) return;

    let time = 10;
    if ($gameMap.getGroupBulletListQJ('weaponBroken').length > 0) {
        time = 70;
    }

    let type = "PC";
    if (Utils.isMobileDevice()) type = "Mobile";

    QJ.MPMZ.Shoot({
        groupName: ['playerPunch', 'attackMonitoring'],
        img: "null1",
        position: [['P'], ['P']],
        initialRotation: ['S', 0],
        moveType: ['B', -1],
        opacity: 0,
        collisionBox: ['C', 1],
        existData: [
        ],
        moveF: [
            [time, 0, QJ.MPMZ.tl.ex_playerLeftPunchAttack, [type]],
            [time, 120, QJ.MPMZ.tl.ex_PunchAttackEffectRefresh],
        ],
    });

};

QJ.MPMZ.tl.ex_PunchAttackEffectRefresh = function () {

    if (!$gameParty.leader().equips()[0]) return;
    let weapon = $gameParty.leader().equips()[0];
    if (weapon.baseItemId !== 4) return;

    let bonus = Math.floor($gameParty.leader().mhp * 0.01);
    weapon.flatParams[2] = bonus;

};

//左拳普通攻击连打
QJ.MPMZ.tl.ex_playerLeftPunchAttack = function (type) {

    this._coolDown = this._coolDown || 0;
    if (this._coolDown > 0) {
        this._coolDown -= 100;
        return;
    }

    let triggered = false;

    if (type && type === "Mobile") {
        triggered = $gameSwitches.value(201);
    } else {
        triggered = TouchInput.drill_isLeftPressed() || TouchInput.drill_isLeftTriggered();
    }
    if (triggered) {
        let player = $gameParty.leader();
        if (QJ.MPMZ.tl.ex_playerAntiClickDetection("normalAttack")) return;
        if ($gameSystem.isMapSelectEquipOpen()) return;
        if (player._characterName !== "$player") return;

        // 忍杀动作
        if (!ConfigManager.alwaysDash) {
            if (player.hasSkill(10) && $gameSystem._drill_PAlM_enabled) {
                $gameMap.steupCEQJ(164, 1);
                this._coolDown += 10000;
                return;
            }
        }

        if ($gamePlayer._drill_EASA_enabled) {
            $gamePlayer.drill_EASe_setSimpleStateNode(["普通拳连打"]);
        }

        $gameSystem._drill_PAlM_enabled = false;
        let type;
        let posX = $gamePlayer.screenBoxXShowQJ();
        let posY = $gamePlayer.screenBoxYShowQJ();
        // 发射拳头数，会影响攻击范围面积
        let PunchCount = 1;
        PunchCount += player.skillMasteryLevel(99);
        let baseangle = 10 + PunchCount * 2;
        let startAngle = -baseangle;
        let endAngle = baseangle;
        switch ($gamePlayer.direction()) {
            case 2:  // 下
                type = "W";
                posX += 10;
                startAngle += baseangle + 15;
                endAngle += baseangle + 15;
                break;
            case 4:  // 左
                type = "W";
                posY += 6;
                startAngle += 8;
                endAngle += 8;
                break;
            case 6:  // 右
                type = "W";
                posY += 8;
                break;
            case 8:  // 上
                type = "E";
                posX -= 5;
                posY += 2;
                startAngle += baseangle + 5;
                endAngle += baseangle + 5;
                break;
            default:
                type = "W";
                break;
        }

        let time = 3 + Math.randomInt(3);
        //time *= $gameParty.leader().pdr;
        let speed = 7 + Math.randomInt(4);
        speed *= player.pdr;
        speed = '0|' + speed + '~10/0~10|0';

        let coolDown = Math.round(2000 * (1 - player.cnt));
        coolDown = Math.max(coolDown, 50);

        let randomSeArray = ["キックの素振り1", "パンチの素振り2", "パンチの素振り3"];
        let randomSe = randomSeArray[Math.floor(Math.random() * randomSeArray.length)];
        let randomPitch = 95 + Math.randomInt(40);
        AudioManager.playSe({ name: randomSe, volume: 80, pitch: randomPitch, pan: 0 });

        let minScale = player.pdr * 0.5;
        let maxScale = player.pdr * 0.7;
        let damage = chahuiUtil.getVarianceDamage(1);
        var leftPunch = QJ.MPMZ.Shooter_ArcRange(["PD"], {
            groupName: ['leftPunch', 'playerBullet'],
            position: [["S", posX], ["S", posY]],
            img: 'weapon/player_fist[5,4]',
            blendMode: 0,
            //tone:[134,53,150,0],
            opacity: 1,
            moveType: ['S', speed],
            anchor: [0.5, 0.3],
            collisionBox: ['C', 6],
            z: type,
            existData: [
                { t: ['Time', time], d: [0, 10] },
                { t: ['G', ['"enemy"', '"object"']], a: ['F', QJ.MPMZ.tl.ex_toEnemyPunchAttack, [damage, {}]], p: [2, false, true] },
            ],
        }, startAngle, endAngle, PunchCount, baseangle * 3, minScale, maxScale);

        time *= 2;
        QJ.MPMZ.Shoot({
            img: "null1",
            position: [['P'], ['P']],
            initialRotation: ['S', 0],
            moveType: ['B', -1],
            opacity: 0,
            collisionBox: ['C', 1],
            existData: [
                { t: ['Time', time] },
            ],
            deadF: [
                [QJ.MPMZ.tl.ex_playerRightPunchAttack]
            ],
        });

        this._coolDown = coolDown;
    } else {
        if (!$gamePlayer._drill_EASA_enabled && $gamePlayer?._drill_EASe_controller?._drill_curBitmapName?.includes("boxing")) {
            $gamePlayer.drill_EASA_setEnabled(true);
        }
        $gameSystem._drill_PAlM_enabled = true;
    }
};

//右拳普通攻击连打
QJ.MPMZ.tl.ex_playerRightPunchAttack = function () {

    let posX = $gamePlayer.screenBoxXShowQJ();
    let posY = $gamePlayer.screenBoxYShowQJ();
    // 发射拳头数，会影响攻击范围面积
    let PunchCount = 1;
    PunchCount += $gameParty.leader().skillMasteryLevel(99);
    let baseangle = 10 + PunchCount * 2;
    let startAngle = -baseangle;
    let endAngle = baseangle;
    switch ($gamePlayer.direction()) {
        case 2:  // 下
            type = "W";
            posX -= 10;
            startAngle -= baseangle;
            endAngle -= baseangle;
            break;
        case 4:  // 左
            type = "W";
            posY += 6;
            startAngle += 8;
            endAngle += 8;
            break;
        case 6:  // 右
            type = "W";
            posY += 8;
            break;
        case 8:  // 上
            type = "E";
            posX += 10;
            posY += 2;
            startAngle -= baseangle;
            endAngle -= baseangle;
            break;
        default:
            type = "W";
            break;
    }

    let time = 3 + Math.randomInt(3);
    time *= $gameParty.leader().pdr;
    let speed = 7 + Math.randomInt(4);
    speed *= $gameParty.leader().pdr;
    speed = '0|' + speed + '~10/0~10|0';
    let coolDown = Math.round(2000 * (1 - $gameParty.leader().cnt));
    coolDown = Math.max(coolDown, 50);

    let randomSeArray = ["キックの素振り1", "パンチの素振り2", "パンチの素振り3"];
    let randomSe = randomSeArray[Math.floor(Math.random() * randomSeArray.length)];
    let randomPitch = 95 + Math.randomInt(40);
    AudioManager.playSe({ name: randomSe, volume: 80, pitch: randomPitch, pan: 0 });

    let minScale = $gameParty.leader().pdr * 0.5;
    let maxScale = $gameParty.leader().pdr * 0.7;
    let damage = chahuiUtil.getVarianceDamage(1);
    var RightPunch = QJ.MPMZ.Shooter_ArcRange(["PD"], {
        groupName: ['rightPunch', 'playerBullet'],
        position: [["S", posX], ["S", posY]],
        img: 'weapon/player_fist[5,4]',
        blendMode: 0,
        //tone:[134,53,150,0],
        opacity: 1,
        moveType: ['S', speed],
        anchor: [0.5, 0.3],
        collisionBox: ['C', 6],
        z: type,
        existData: [
            { t: ['Time', time], d: [0, 10] },
            { t: ['G', ['"enemy"', '"object"']], a: ['F', QJ.MPMZ.tl.ex_toEnemyPunchAttack, [damage, {}]], p: [2, false, true] },
        ]
    }, startAngle, endAngle, PunchCount, baseangle * 3, minScale, maxScale);

};

//对敌人格斗攻击反馈
QJ.MPMZ.tl.ex_toEnemyPunchAttack = function (Damage, attackData = {}, args) {

    // 若主角无武器则直接返回
    if (!$gameParty.leader().equips()[0]) return;

    if (!args || !args.target || !args.target instanceof Game_Event) return;

    let UjoHagan = false;
    // 受击动画参数
    let angle = Math.randomInt(360);
    let posX = this.inheritX();
    let posY = this.inheritY();
    let fixValue = 20 * this.scaleX;
    posX += fixValue * Math.sin(this.rotationMove * Math.PI / 180);
    posY += -fixValue * Math.cos(this.rotationMove * Math.PI / 180);

    let effectScale = this.scaleX;
    // 暴击的情形
    if ($gameParty.leader().hasSkill(69)) {
        let chance = 4 + $gameParty.leader().skillMasteryLevel(69) * 4;
        if (Math.randomInt(101) < chance) {
            UjoHagan = true;
            effectScale *= 3;
        }
    }
    // 受击音效
    let randomSeArray = ["軽いパンチ1", "軽いパンチ2"];
    let randomSe = randomSeArray[Math.floor(Math.random() * randomSeArray.length)];
    let randomPitch = 80 + Math.randomInt(40);
    if (UjoHagan) randomSe = "Damage3";
    AudioManager.playSe({ name: randomSe, volume: 80, pitch: randomPitch, pan: 0 });
    // 受击演出
    QJ.MPMZ.Shoot({
        img: "animehit[5,4]",
        initialRotation: ['S', angle],
        position: [['S', posX], ['S', posY]],
        scale: effectScale,
        moveType: ['S', 0],
        opacity: 1,
        blendMode: 0,
        z: "MF_UG",
        existData: [
            { t: ['Time', 19] }
        ]
    });

    // 伤害计算
    let eventId = args.target._eventId;
    // 破颜拳适配
    if (UjoHagan) {
        let MHP = $gameSelfVariables.value([$gameMap.mapId(), eventId, 'MHP']);
        let extraDamage = Math.round(MHP * 0.01);
        extraDamage = Math.max(Damage * 3, Math.min(extraDamage, 999999));
        Damage += extraDamage;
    }
    let realDamage = QJ.MPMZ.tl.getEnemyRaceDamageFactor(Damage, args.target);
    if (!realDamage) return;

    // 敌人的 DEF、HP
    let enemy = $dataEnemies[$gameSelfVariables.value([$gameMap.mapId(), eventId, 'enemyId'])];
    if (!enemy) enemy = $dataEnemies[3];
    let enemyDEF = enemy.params[3];
    let enemyHP = $gameSelfVariables.value([$gameMap.mapId(), eventId, 'HP']);

    // 感度上升
    if (args.target._SensitivityUp) {
        enemyDEF = Math.floor(enemyDEF/2);
        realDamage *= 2;
    }    
    realDamage -= enemyDEF;
    realDamage = Math.max(1, realDamage);
    realDamage = Math.min(99999999, realDamage);

    // 显示伤害数字
    SimpleMapDamageQJ.put(2, eventId, realDamage, 0, -72);

    // 魔法混合伤害
    let ID = $gameParty.leader().equips()[0].baseItemId;
    if ($dataWeapons[ID]?.traits?.[0]?.dataId === 2 || $gameParty.leader().hasSkill(45)) {
        let mixDamage = Math.round(chahuiUtil.getVarianceDamage(2));
        if (!$gameParty.leader().hasSkill(55)) {
            let enemyMDF = enemy.params[5];
            let damageReduction = 0.01 * chahuiUtil.magicDefenseDamageReduction(enemyMDF);
            mixDamage -= mixDamage * damageReduction;
            mixDamage = Math.floor(Math.max(1, Math.min(mixDamage, 99999)));
        }
        let posX2 = 15 - Math.randomInt(30); // 让伤害数字稍微偏移
        SimpleMapDamageQJ.put(3, eventId, mixDamage, posX2, -64);
        let newHP = $gameSelfVariables.value([$gameMap.mapId(), eventId, 'HP']);
        $gameSelfVariables.setValue([$gameMap.mapId(), eventId, 'HP'], newHP - mixDamage);
    }

    // 伤害结算
    $gameSelfVariables.setValue([$gameMap.mapId(), eventId, 'HP'], enemyHP - realDamage);
    // 刷新血条
    args.target.showHpBar();
    // 死亡判断
    enemyHP = $gameSelfVariables.value([$gameMap.mapId(), eventId, 'HP']);
    if (enemyHP <= 0) {
        $gameSelfSwitches.setValue([$gameMap.mapId(), eventId, 'D'], true);
        QJ.MPMZ.tl.ex_enemyDeathEffectResolution.call(this, args.target);
        return;
    }
};

// 空中坠落伤害
QJ.MPMZ.tl.calculateFallDamage = function (extra={}) {
    const player = $gameParty.leader();
    let damage = 999 * player.fdr;
    if (player.mhp > 999){
        damage = $gameParty.leader().mhp * $gameParty.leader().fdr;
    } 
    damage = Math.floor(damage);
    
    let day = $gameTemp._airKingAlreadyTriggered;
    if (player.hasSkill(9) && (!day || day < $gameSystem.day())) {
        // 击坠王-受到致命伤害时强制保留1点HP
        if (damage >= player.hp) {
            damage = player.hp - 1;
            $gameTemp._airKingAlreadyTriggered = $gameSystem.day();
        }
    } 

    let posX = $gamePlayer.screenBoxXShowQJ();
    let posY = $gamePlayer.screenBoxYShowQJ() + 18;
    let AoEDamage = 999 * (1 + player.skillMasteryLevel(79)); 
	QJ.MPMZ.Shoot({
		groupName: ['fallDamage', 'forceTrigger', 'ignoreDefense'],
        img:'animehit[5,4]',
		collisionBox:['C',48],
		position:[['S', posX],['S', posY]],
		initialRotation: ['S',Math.randomInt(360)],
		moveType:['S',0],
		existData: [
	        {t:['Time',19]},
	        {t:['P'], a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[damage,1]], p:[-1,false,true], c:['T',0,18,true]},
            {t:['G',['"enemy"']],
             a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[ AoEDamage, {orbitingDamage:true, noHitEffect:true, noDurLoss:true, specifyAddedStatus:true,addedStatusType:0} ]],
             p:[-1,false,true]
            },
	    ],       
	});    
};

// 兄杀演出
QJ.MPMZ.tl.ex_oniichanExecutionAnimation = function () {

    // 临时措施，优化玩家未捡取掉落物就被杀死
    $gameParty.leader().removeStateCategory('ijou', 1);

    $gameSwitches.setValue(14, true);
    // 演出期间禁止玩家移动
    $gameSystem._drill_PAlM_enabled = false;

    QJ.MPMZ.Shoot({
        groupName: ['oniichanExecution'],
        img: "object_name/OniichanExecution",
        position: [['S', 0], ['S', 0]],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        blendMode: 0,
        opacity: "0|0~120/1~999|1",
        scale: 0.5,
        onScreen: true,
        anchor: [0, 0],
        moveType: ['S', 0],
        collisionBox: ['C', 1],
        z: 'A',
        existData: [
            { t: ['Time', 300], d: [0, 60] }
        ],
        moveJS: [
            [10, 999, "AudioManager.playSe({ name: 'Collapse2', volume: 90, pitch: 50, pan: 0 })"]
        ],
        deadJS: [
            `$gameMap.moveFilter('mapBlur', [0], 60);
			  $gameMap.eraseFilterAfterMove('mapBlur');
			  AudioManager.fadeInBgm(4);
			  setTimeout(() => {
			     $gameSwitches.setValue(14, false);
			     $gameSystem._drill_PAlM_enabled = true;
	          }, 1000);	 `
        ]
    });
    // 地图模糊滤镜
    const id = "mapBlur";
    const filterTarget = 21;
    $gameMap.createFilter(id, "blur", filterTarget);
    $gameMap.setFilter(id, [0]);
    $gameMap.moveFilter(id, [2], 90);

};


// 检测玩家是否应该死亡，适配各种特殊生存手段
QJ.MPMZ.tl.ex_shouldPlayerDieCheck = function () {

    if (!this) return;
    // 防止死亡事件重复触发
    let player = $gameParty.leader();
    if ($gameTemp._eventReserved || player._deadness) {
        this._index = this._list.length;
        return;
    }

    // 特殊死亡方式无法激活保命手段
    if ($gameStrings.value(20).trim() !== "") return;

    //  稻草人之心适配
    if (player.isStateAffected(115)) {
        if ($gameSystem.hasGameTimeEvent('scarecrowHeart')) {
            this._index = this._list.length;
            return;
        }
    }

    //  毅力头巾-毅力效果
    if (player.hasSkill(42)) {
        let chance = 5 + player.skillMasteryLevel(42) * 10;
        if (chance > Math.randomInt(101)) {
            // 受到致命伤锁血
            player.setHp(1);
            AudioManager.playSe({ name: "Skill3", volume: 60, pitch: 85, pan: 0 });
            QJ.MPMZ.tl.ex_effectFonts("buqu", -1);
            this._index = this._list.length;
            return;
        }
    }

};

// 玩家死亡清理多余演出效果
QJ.MPMZ.tl.ex_cleanupDeathExtraEffects = async function (extra={}) {

    if (extra.weakAnim) {
		const zoom  = $gameScreen.zoomScale();
		let posX    = 960 / zoom; 
		let posY    = 540 / zoom;
		let lang    = ConfigManager.language; 
		const scale = 1 / zoom;
		let checkName = "WEAK" + lang;
		const ok = await Promise.resolve(
		  QJ.MPMZ.tl.checkPictureExists(['img','projectiles','object_name'], `${checkName}.rpgmvp`)
		);

		if (!ok) lang = 2;	
		let imgName = "object_name/WEAK" + lang;
		// 黑色遮罩
		QJ.MPMZ.Shoot({	  
			  img: "blackk",
			  position: [['S', 0], ['S', 0]],
			  initialRotation: ['S', 0],
			  imgRotation: ['F'],
			  opacity: '0|0~120/1~9999999/1',
			  moveType: ['S', '0'],
			  z: 'TOP',
			  scale: 10,
			  onScreen: true,
			  anchor: [0, 0],         
			  existData:[   ],
			  moveJS:[
			     [30,999999, `AudioManager.playSe({name: '魔の時計塔の鐘',volume: 90,pitch: 100,pan: 0});`]
			  ]
		});		
		// 弱字演出
		QJ.MPMZ.Shoot({
			 img:imgName,
			 groupName:['WEAK'],
			 position:[['S',posX],['S',posY]],
			 anchor:[0.5,0.5],
			 initialRotation:['S',0],
			 opacity: '0|0~120|0~150/1~9999999/1',
			 scale:scale,
			 existData:[   ],
			 imgRotation:['F'],
			 z:"TOP",
			 onScreen:true,
			 moveType:['S',0]
		});	
        if ($gameMap.chahuiMapTemp.electrotherapyFailure === true) {
            setTimeout(() => {
               QJ.MPMZ.tl.ex_electrotherapyFailureRun();
            }, 1800);   
        }
        return;		
	}

    // 清除掉存在的选项和对话框以及正在执行的事件
    resetMessageWindow();

    $gamePlayer.mppHidPasZ = 0;
    // 死亡事件锁
    $gameTemp._eventReserved = true;
    $gameSystem._drill_COI_map_mouse = false;
    TouchInput._mousePressed = false;
    $gameScreen._pictureCidArray = [];
    $gamePlayer.drill_PT_clearLifting();
    ctb.useTurnPlayer = false;
    // 强制恢复鼠标权限
    $gameSystem._drill_COI_map_mouse = true;
    $gameSwitches.setValue(3, false);
    // 禁止玩家移动
    $gameSystem._drill_PAlM_enabled = false;
    Zzy.TWF.ToTheWorld(true);
};

// 玩家复活跳跃演出
QJ.MPMZ.tl.ex_oniichanReviveJump = function () {

    if (!this) return;

    let player = $gamePlayer;
    // 玩家当前坐标区域
    let regionId = $gameMap.regionId(player._realX + player.offsetX(), player._realY - 0.3);
    let noPassable = !$gameMap.checkPlayerIsPassable();
    // 玩家处于无法移动的状态
    if ($gameNumberArray.value(5).includes(regionId) || noPassable) {
        player._drill_JSp['enabled'] = true;
        player._drill_JSp['height'] = -1;
        player._drill_JSp['time'] = 35;
        player._drill_JSp['speed'] = 10;

        let XX = Math.round(player.centerRealX());
        let YY = Math.round(player.centerRealY());
        let condition = DrillUp.g_COFA_condition_list[10];
        let c_area = $gameMap.drill_COFA_getShapePointsWithCondition(XX, YY, "圆形区域", 12, condition);
        // 跳出不可通行区域		
        if (c_area.length > 0) {
            let p = c_area[Math.floor(Math.random() * c_area.length)];
            let xPlus = p.x - XX;
            let yPlus = p.y - YY;
            player.jump(xPlus, yPlus);
        } else {
            player.jump(0, 0);
        }
    }
};

// 方差工具
QJ.MPMZ.tl.randIntByRatio = function (base, ratios) {
    if (!Array.isArray(ratios)) ratios = [Number(ratios) || 0.1, Number(ratios) || 0.1];
    var down = Math.max(0, Number(ratios[0]) || 0);
    var up = Math.max(0, Number(ratios[1] != null ? ratios[1] : ratios[0]) || 0);

    // 计算浮动区间，并取整到整数边界
    var min = Math.floor(base * (1 - down));
    var max = Math.ceil(base * (1 + up));

    // 随机整数 [min, max]
    return Math.floor(Math.random() * (max - min + 1)) + min;
};



// 初号机强化定义。新增强化时在此追加，等级会按实际获得的能力数量计算，
// 不依赖玩家选择的升级顺序。legacySuffix 用于保持旧补丁定义与已有存档兼容。
QJ.MPMZ.tl.unitINexusUpgradeDefinitions = [
    { skillId: 22, patchId: 'prototype-unit-upgrade-22', legacySuffix: ' II' },
    { skillId: 23, patchId: 'prototype-unit-upgrade-23', legacySuffix: ' III' },
    { skillId: 24, patchId: 'prototype-unit-upgrade-24', legacySuffix: ' IV' }
];

QJ.MPMZ.tl.unitINexusMaxLevel = 8;

QJ.MPMZ.tl.unitINexusRomanLevel = function (value) {
    let number = Math.floor(Number(value));
    if (!Number.isFinite(number) || number <= 0) return '';
    const table = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let result = '';
    for (const [amount, numeral] of table) {
        while (number >= amount) {
            result += numeral;
            number -= amount;
        }
    }
    return result;
};

// 初号机每两级进入一个颜色阶段：II–III=15、IV–V=14、VI–VII=13、Max=12。
QJ.MPMZ.tl.unitINexusLevelColorCode = function (level) {
    const normalizedLevel = Math.max(
        2,
        Math.min(QJ.MPMZ.tl.unitINexusMaxLevel, Math.floor(Number(level) || 2))
    );
    return 16 - Math.floor(normalizedLevel / 2);
};

QJ.MPMZ.tl.findEquippedUnitINexus = function (actor, itemId) {
    const specified = Number(itemId) > 0 ? $dataArmors[Number(itemId)] : null;
    if (specified && DataManager.isArmor(specified) && specified.baseItemId === 100) {
        return specified;
    }
    return actor.equips().find(item => (
        item && DataManager.isArmor(item) && item.baseItemId === 100
    )) || null;
};

QJ.MPMZ.tl.syncUnitINexusLevel = function (item) {
    if (!item || !DataManager.isArmor(item) || item.baseItemId !== 100) {
        return { applied: false, level: 0, suffix: '' };
    }

    const definitions = QJ.MPMZ.tl.unitINexusUpgradeDefinitions;
    const acquiredCount = definitions.filter(data => (
        Array.isArray(item.traits) && item.traits.some(trait => (
            Number(trait.code) === 43 && Number(trait.dataId) === data.skillId
        ))
    )).length;
    const level = Math.min(
        QJ.MPMZ.tl.unitINexusMaxLevel,
        1 + acquiredCount
    );
    const suffix = level >= QJ.MPMZ.tl.unitINexusMaxLevel
        ? ' Max'
        : ' ' + QJ.MPMZ.tl.unitINexusRomanLevel(level);

    // I 级由护甲的 On Creation Eval 负责；只登记实际发生过的强化等级。
    if (level <= 1) return { applied: false, level, suffix };
    const patchId = 'prototype-unit-level-' + level;
    const applied = DataManager.hasIndependentEquipPatch(item, patchId)
        ? false
        : DataManager.applyIndependentEquipPatch(item, {
            id: patchId,
            operations: [
                { type: 'setProperty', key: 'nameSuffix', value: suffix }
            ]
        });

    // 颜色补丁按“等级+颜色阶段”分开登记，始终排在当次能力补丁之后，
    // 避免未来升级再次将颜色覆盖回 15。
    const colorCode = QJ.MPMZ.tl.unitINexusLevelColorCode(level);
    const colorPatchId = 'prototype-unit-level-' + level + '-color-' + colorCode;
    const colorApplied = DataManager.hasIndependentEquipPatch(item, colorPatchId)
        ? false
        : DataManager.applyIndependentEquipPatch(item, {
            id: colorPatchId,
            operations: [
                {
                    type: 'setColor',
                    value: String(DrillUp.drill_COC_getColor(colorCode))
                }
            ]
        });
    return { applied: applied || colorApplied, level, suffix, colorApplied };
};

QJ.MPMZ.tl.applyUnitINexusUpgrade = function (actor, extra) {
    const item = QJ.MPMZ.tl.findEquippedUnitINexus(actor, extra.itemId);
    if (!item) return { applied: false, reason: 'unit-inexus-not-found' };

    const skillId = Number(extra.upgradeSkillId);
    const definitions = QJ.MPMZ.tl.unitINexusUpgradeDefinitions;
    const definition = definitions.find(data => data.skillId === skillId);
    if (!definition) {
        return { applied: false, reason: 'unknown-upgrade', skillId };
    }

    const acquiredBefore = definitions.filter(data => (
        Array.isArray(item.traits) && item.traits.some(trait => (
            Number(trait.code) === 43 && Number(trait.dataId) === data.skillId
        ))
    )).length;
    const alreadyHasAbility = Array.isArray(item.traits) && item.traits.some(trait => (
        Number(trait.code) === 43 && Number(trait.dataId) === skillId
    ));
    if (!alreadyHasAbility && acquiredBefore >= QJ.MPMZ.tl.unitINexusMaxLevel - 1) {
        return {
            applied: false,
            reason: 'max-level',
            item,
            skillId,
            level: QJ.MPMZ.tl.unitINexusMaxLevel,
            suffix: ' Max'
        };
    }

    // 保留公共事件时期的补丁定义，确保旧存档中同 ID 补丁可幂等识别。
    const abilityApplied = DataManager.hasIndependentEquipPatch(item, definition.patchId)
        ? false
        : DataManager.applyIndependentEquipPatch(item, {
            id: definition.patchId,
            operations: [
                {
                    type: 'setProperty',
                    key: 'nameSuffix',
                    value: definition.legacySuffix
                },
                {
                    type: 'addTrait',
                    trait: { code: 43, dataId: skillId, value: 1 }
                },
                {
                    type: 'setColor',
                    value: String(DrillUp.drill_COC_getColor(15))
                }
            ]
        });

    // 等级补丁在能力补丁之后登记，最终覆盖旧流程中与技能 ID 绑定的后缀。
    const levelResult = QJ.MPMZ.tl.syncUnitINexusLevel(item);

    return {
        applied: abilityApplied || levelResult.applied,
        abilityApplied,
        levelApplied: levelResult.applied,
        item,
        skillId,
        level: levelResult.level,
        suffix: levelResult.suffix
    };
};

// 左上角 HUD：生命周期事件触发布局；初号机 GUI 每 120 帧检查一次显示变换。
(() => {
    const layout = QJ.MPMZ.tl.topLeftHud = {
        // 任务与能力共用中心行距；第四行是任务允许的最高位置（从 0 计数）。
        baseY: 140, rowStep: 56, questMinRow: 3,
        questY: 0,
        // 图片中心对齐到同一列；偏移固定，不随素材宽高变化。
        iconCenterX: 54, abilityTextX: 502, questTextX: 360, abilityIconCenterY: 34, questIconCenterY: 22,
        invalidate() { schedule(); },
        questPicturePosition() {
            // 展开素材包含旗帜、标题底板和横线；对齐旗帜位置而非整张背景的中心。
            const bitmap = ImageManager.loadPicture('characters/questMarker');
            if (!bitmap.isReady() && !pendingBitmaps.has(bitmap)) {
                pendingBitmaps.add(bitmap);
                bitmap.addLoadListener(() => this.invalidate());
            }
            return {
                x: this.iconCenterX + bitmap.width / 2 - 34,
                y: this.questY + this.questIconCenterY + bitmap.height / 2 - 22
            };
        }
    };
    layout.questY = layout.baseY + layout.questMinRow * layout.rowStep
        + layout.abilityIconCenterY - layout.questIconCenterY;
    let pending = false;
    function schedule() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
            pending = false;
            if (!(SceneManager._scene instanceof Scene_Map)) return;
            layout.update();
        });
    }
    const pendingBitmaps = new WeakSet();
    let entries = [];
    let lastTransform = null;
    const pictureIds = [101, 102, 103];
    const groups = ['ShowPlayerCoordinates', 'ShowCollectibleObjectCount', 'checkBossUnitSpawnStatus'];
    function bullets(group) {
        return $gameMap.getGroupBulletListQJ(group)
            .map(id => $gameMap.bulletQJ(id)).filter(b => b && !b.dead);
    }
    function collect() {
        entries = [];
        // 子弹 index 保留实际创建顺序；每个能力是一项，与文字数量无关。
        const abilities = groups.flatMap((group, i) => bullets(group).slice(0, 1)
            .map(b => ({ b, pictureId: pictureIds[i] })))
            .filter(e => $gameScreen.picture(e.pictureId))
            .sort((a, b) => a.b.index - b.b.index);
        abilities.forEach((e, i) => {
            const y = layout.baseY + i * layout.rowStep;
            const picture = $gameScreen.picture(e.pictureId);
            picture._origin = 1;
            picture._x = picture._targetX = layout.iconCenterX;
            picture._y = picture._targetY = y + layout.abilityIconCenterY;
            entries.push({ b: e.b, x: layout.abilityTextX, y: y + 85, text: false });
        });
        const questRow = Math.max(layout.questMinRow, abilities.length);
        layout.questY = layout.baseY + questRow * layout.rowStep
            + layout.abilityIconCenterY - layout.questIconCenterY;
        const picture = $gameScreen.picture(16);
        if (picture?.name() === "characters/questMarker") {
            const position = layout.questPicturePosition();
            picture._origin = 1;
            picture._x = picture._targetX = position.x;
            picture._y = picture._targetY = position.y;
            bullets('quest').forEach((b, i) => entries.push({ b, x: layout.questTextX,
                y: layout.questY + (i === 0 ? 22 : 60), text: true }));
        }
    }
    layout.checkZoom = function() {
        const parent = SceneManager._scene?._spriteset;
        if (!parent) return;
        const zoom = $gameScreen.zoomScale();
        if (lastTransform && lastTransform.zoom === zoom &&
            lastTransform.sx === parent.scale.x && lastTransform.sy === parent.scale.y &&
            lastTransform.x === parent.x && lastTransform.y === parent.y) return;
        // 三项 GUI 共用现有调度，同一帧的请求只执行一次布局。
        schedule();
    };
    layout.update = function() {
        const currentScene = SceneManager._scene;
        const parent = currentScene && currentScene._spriteset;
        if (!parent) return;
        const sx = parent.scale.x, sy = parent.scale.y;
        const zoom = $gameScreen.zoomScale();
        if (!sx || !sy || !zoom) return;
        collect();
        const dx = $gameMap.displayX() * QJ.tileSize, dy = $gameMap.displayY() * QJ.tileSize;
        for (const e of entries) {
            const b = e.b;
            if (b.dead) continue;
            b._x = b.x = (e.x - parent.x) / sx + dx;
            b._y = b.y = (e.y - parent.y) / sy + dy;
            b._orginDisplayX = dx; b._orginDisplayY = dy;
            if (e.text) {
                // 保留 customShootText 的 zoom 补偿。scaleX/Y 是含 freeScale 的
                // 计算结果，不能用它判断 data.scale 是否已设置，否则下一帧会反弹。
                b.freeScale = 1 / zoom;
                b.changeAttribute('scale', [zoom / sx, zoom / sy]);
            } else if (b.scaleX !== 1 / sx || b.scaleY !== 1 / sy) {
                b.changeAttribute('scale', [1 / sx, 1 / sy]);
            }
        }
        lastTransform = { zoom, sx, sy, x: parent.x, y: parent.y };
    };
})();

// 初号机功能初始化
QJ.MPMZ.tl.InitializeUnitINexusFunction = function (extra = {}) {
    const actor = $gameParty.leader();

    if (extra.refresh) {
        // 玩家脱下初号机后停止检测
        if (!actor.hasArmor($dataArmors[100]) || $dataMap.note.includes("<宅>")) {
            this.setDead();
            return;
        }
        if ($gameMap.isEventRunning()) return;

        const upgradeStatus = {
            isUpgradable22: !actor.hasSkill(22) && actor.hasWeapon($dataWeapons[52]),
            isUpgradable23: !actor.hasSkill(23) && $gameParty.hasItem($dataItems[2]),
            isUpgradable24: !actor.hasSkill(24) && actor.hasArmor($dataArmors[75])
        };
        if (Object.values(upgradeStatus).some(Boolean)) {
            $gameMap.steupCEQJ(330, 1, { lockFlow: true, ...upgradeStatus });
        }
        return;
    }

    if (extra.enhanceUpgrade) {
        return QJ.MPMZ.tl.applyUnitINexusUpgrade(actor, extra);
    }

    // 装备时同步一次，可自动修复旧存档中因升级顺序打乱而登记错误的后缀。
    const equippedUnitINexus = QJ.MPMZ.tl.findEquippedUnitINexus(actor);
    if (equippedUnitINexus) {
        QJ.MPMZ.tl.syncUnitINexusLevel(equippedUnitINexus);
    }

    // 坐标显示
    if (actor.hasSkill(21)) {
        QJ.MPMZ.tl.ShowPlayerCoordinates();
    }
    // 采集物探测
    if (actor.hasSkill(22)) {
        QJ.MPMZ.tl.ShowCollectibleObjectCount();
    }
    // BOSS重生探测
    if (actor.hasSkill(23)) {
        QJ.MPMZ.tl.checkBossUnitSpawnStatus();
    }
    // 敌血量探测
    if (actor.hasSkill(24)) {
        $gameMap.chahuiMapTemp.canShowEnemyHP = true;
    }

    // 任一功能尚未升级时，持续监听升级条件
    QJ.MPMZ.deleteProjectile("UnitINexusCheck");
    if ([22, 23, 24].some(skillId => !actor.hasSkill(skillId))) {
        // 绑定监听器
        QJ.MPMZ.Shoot({
            groupName: ['UnitINexusCheck'],
            position: [["P"], ["P"]],
            initialRotation: ["S", 0],
            imgRotation: ["S", 0],
            moveType: ["S", 0],
            existData: [],
            moveJS: [
                [30, 90, "QJ.MPMZ.tl.InitializeUnitINexusFunction.call(this, {refresh:true})"]
            ]
        });
    }
};


// 初号机-显示玩家坐标
QJ.MPMZ.tl.ShowPlayerCoordinates = function (extra = {}) {
    
    function to1Trunc(x) {
        let n = Number(x);
        if (!Number.isFinite(n)) return "0.0";
        let t = (n < 0 ? Math.ceil(n * 10) : Math.floor(n * 10)) / 10; // 向零截断
        return t.toFixed(1); // 始终保留1位小数（字符串）
    }

    const playerX = to1Trunc($gamePlayer.centerRealX());
    const playerY = to1Trunc($gamePlayer.centerRealY());
    const BulletText = " X" + playerX + "  Y" + playerY + " ";  
    const img = [
        "T",
        {
            text: BulletText,
            arrangementMode: 0,
            textColor: "#ffffff",
            fontSize: 28,
            outlineColor: "#000000",
            outlineWidth: 1,
            fontFace: "Chiron GoRound TC",
            fontItalic: false,
            fontBold: true,
            width: 420,
            height: 100,
            textAlign: 4,
            lineWidth: 0,
            lineColor: "#ffffff",
            lineRate: 1.0,
            backgroundColor: null,
            backgroundOpacity: 1,
            shadowBlur: 4,
            shadowColor: "#000000",
            shadowOffsetX: 0,
            shadowOffsetY: 0
        }
    ];

    if (extra.refresh) {
        this.changeAttribute("img", img);
        return;        
    }
    
    if ($gameMap.getGroupBulletListQJ('ShowPlayerCoordinates').length > 0) return;
    const length = $gameMap.getGroupBulletListQJ('UnitINexus').length;
    const picY = QJ.MPMZ.tl.topLeftHud.baseY + length * QJ.MPMZ.tl.topLeftHud.rowStep;
    if (!$gameScreen.picture(101)) {
        const picName = "characters/" + "LocationDisplay";
        $gameScreen.showPicture(101, picName, 1, QJ.MPMZ.tl.topLeftHud.iconCenterX, picY + QJ.MPMZ.tl.topLeftHud.abilityIconCenterY, 100, 100, 255, 0);
    }

    function to1Trunc(x) {
        let n = Number(x);
        if (!Number.isFinite(n)) return "0.0";
        let t = (n < 0 ? Math.ceil(n * 10) : Math.floor(n * 10)) / 10; // 向零截断
        return t.toFixed(1); // 始终保留1位小数（字符串）
    }

    QJ.MPMZ.tl.topLeftHud.invalidate();
    const zoom = $gameScreen.zoomScale();
    const posX = QJ.MPMZ.tl.topLeftHud.abilityTextX / zoom;
    const posY = (picY + 85) / zoom;
    const Scale = 1 / zoom;

    QJ.MPMZ.Shoot({
        img: img,
        groupName: ['ShowPlayerCoordinates', 'UnitINexus'],
        position: [["S", posX], ["S", posY]],
        initialRotation: ["S", 0],
        imgRotation: ["S", 0],
        opacity: 0.7,
        moveType: ["S", 0],
        z: "A",
        scale: Scale,
        onScreen: true,
        anchor: [1, 1],
        existData: [],
        moveF: [
            [30, 30, QJ.MPMZ.tl.ShowPlayerCoordinates, [{refresh: true}]]
        ],
        // QJ 倒计时到 0 的下一次更新执行，119 对应实际间隔 120 帧。
        moveJS: [[119, 119, "QJ.MPMZ.tl.topLeftHud.checkZoom();"]],
        deadJS: [
            "$gameScreen.erasePicture(101); QJ.MPMZ.tl.topLeftHud.invalidate();"
        ]
    });
};

// 魔物、遗物数量探测
QJ.MPMZ.tl.refreshPrototypeCoreDisplayText = function (initialize) {

    let count = 0;
    let treasure = 0;
    let inWater = $gameSelfVariables.value([$gameMap.mapId(), 1, 'maxFishing']);
    if (inWater == 2) inWater = 1;
    if (inWater <= 1) inWater = 0;
    let enemy = $gameMap.drill_COET_getEventsByTag_direct("魔物").length;
    let treasureList = $gameMap.drill_COET_getEventsByTag_direct("宝箱");
    if (treasureList.length > 0) {
        for (let target of treasureList) {
            let eid = target._eventId;
            if ($gameSelfSwitches.value([$gameMap.mapId(), eid, 'A']) || $gameSelfSwitches.value([$gameMap.mapId(), eid, 'D'])) {
                continue;
            }
            treasure += 1;
        }
    }
    count += inWater + enemy + treasure;
    $gameVariables._data[250] = count;

    let enemyText = window.systemFeatureText && window.systemFeatureText.nearbyMonstersCount;
    if (!enemyText) enemyText = "Detected nearby monsters";
    enemyText = Array.isArray(enemyText) ? enemyText.join("\n") : (enemyText ?? "");

    let treasureText = window.systemFeatureText && window.systemFeatureText.nearbyTreasuresCount;
    if (!treasureText) treasureText = "Detected nearby treasures";
    treasureText = Array.isArray(treasureText) ? treasureText.join("\n") : (treasureText ?? "");

    let inWaterText = window.systemFeatureText && window.systemFeatureText.underwaterTreasuresCount;
    if (!inWaterText) inWaterText = "Detected underwater treasures";
    inWaterText = Array.isArray(inWaterText) ? inWaterText.join("\n") : (inWaterText ?? "");

    let textArray = [];
    textArray.push(`${enemyText}: ${enemy}`);
    textArray.push(`${treasureText}: ${treasure}`);
    textArray.push(`${inWaterText}: ${inWater}`);
    return textArray.join('\n');

};

// 初号机-显示可采集对象数量
QJ.MPMZ.tl.ShowCollectibleObjectCount = function (initialize) {

    let count = $gameVariables._data[250];
    let BulletText = ` ${count} `;
    let img = [
        "T",
        {
            text: BulletText,
            arrangementMode: 0,
            textColor: "#ffffff",
            fontSize: 28,
            outlineColor: "#000000",
            outlineWidth: 1,
            fontFace: "Chiron GoRound TC",
            fontItalic: false,
            fontBold: true,
            width: 420,
            height: 100,
            textAlign: 4,
            lineWidth: 0,
            lineColor: "#ffffff",
            lineRate: 1.0,
            backgroundColor: null,
            backgroundOpacity: 1,
            shadowBlur: 4,
            shadowColor: "#000000",
            shadowOffsetX: 0,
            shadowOffsetY: 0
        }
    ];

    if (initialize && initialize === "refresh") {
        this.changeAttribute("img", img);
        return;
    }

    if ($gameMap.getGroupBulletListQJ('ShowCollectibleObjectCount').length > 0) return;
    let picture = $gameScreen.picture(102);
    const length = $gameMap.getGroupBulletListQJ('UnitINexus').length;
    const picY = QJ.MPMZ.tl.topLeftHud.baseY + length * QJ.MPMZ.tl.topLeftHud.rowStep;
    if (!picture) {
        let picName = "characters/" + "LootDetection";
        $gameScreen.showPicture(102, picName, 1, QJ.MPMZ.tl.topLeftHud.iconCenterX, picY + QJ.MPMZ.tl.topLeftHud.abilityIconCenterY, 100, 100, 255, 0);
        // 绑定描述窗口
        let text = 'QJ.MPMZ.tl.refreshPrototypeCoreDisplayText()';
        Saikey.MPMZ.bindPicture(102, text, {
            decoration: "Gemini",
            minWidth: 320,
            maxWidth: 720,
            minHeight: 60,
            maxHeight: 640,  
            paddingRight: 100,
            paddingBottom: 90,
            needEval: true
        });        
    } 

    QJ.MPMZ.tl.topLeftHud.invalidate();
    const zoom = $gameScreen.zoomScale();
    const posX = QJ.MPMZ.tl.topLeftHud.abilityTextX / zoom;
    const posY = (picY + 85) / zoom;
    const Scale = 1 / zoom;

    for (let i = 0; i < 1; i++) {
        QJ.MPMZ.Shoot({
            img: img,
            groupName: ['ShowCollectibleObjectCount', 'UnitINexus'],
            position: [["S", posX], ["S", posY]],
            initialRotation: ["S", 0],
            imgRotation: ["F"],
            opacity: 0.7,
            moveType: ["S", 0],
            z: "A",
            scale: Scale,
            onScreen: true,
            anchor: [1, 1],
            existData: [],
            moveF: [
                [60, 60, QJ.MPMZ.tl.ShowCollectibleObjectCount, ["refresh"]]
            ],
            moveJS: [[119, 119, "QJ.MPMZ.tl.topLeftHud.checkZoom();"]],
            deadJS: [
                "$gameScreen.erasePicture(102); QJ.MPMZ.tl.topLeftHud.invalidate();"
            ]
        });
    }
};

// 初号机可检测的 BOSS 列表。
// templateId：prototypeEventTemplate 中的 BOSS ID。
// defeatKey：击杀计数；复活日统一由 BOSS 独立计时读取。
QJ.MPMZ.tl.unitINexusBossList = [
    { templateId: 40, defeatKey: [1, 40, 'KillCount'] },
    { templateId: 46, defeatKey: [1, 46, 'KillCount'] },
    { templateId: 59, defeatKey: [1, 59, 'KillCount'] },
    { templateId: 80, defeatKey: [1, 80, 'KillCount'] }
];

// 检测 BOSS 单位刷新状态
QJ.MPMZ.tl.checkBossUnitSpawnStatus = function (extra = {}) {
    if (extra.refresh) {
        const bossTable = window.prototypeEventTemplate;
        const textTable = window.mapCommonEventDialogue["UnitINexus"];
        const currentDay = $gameSystem.day();
        const textArray = [];
        const getText = key => {
            const text = textTable[key];
            return Array.isArray(text) ? text.join('\n') : (text ?? "");
        };

        for (const boss of QJ.MPMZ.tl.unitINexusBossList) {
            if ($gameSelfVariables.value(boss.defeatKey) <= 0) continue;

            const bossName = bossTable[String(boss.templateId)]?.bossName || "Unknown Boss";
            const remainingDays = QJ.MPMZ.tl.getBossRespawnDay(boss.templateId) - currentDay;
            const textKey = remainingDays > 0 ? "bossRespawnCountdown" : "bossChallengeAvailable";
            const bossText = getText(textKey)
                .replace("%1", bossName)
                .replace("%2", remainingDays);
            textArray.push(bossText);
        }

        return (textArray.length > 0 ? textArray : [getText("noBossDetected")]).join('\n');
    }

    if ($gameScreen.picture(103)) return;
    const length = $gameMap.getGroupBulletListQJ('UnitINexus').length;
    const picY = QJ.MPMZ.tl.topLeftHud.baseY + length * QJ.MPMZ.tl.topLeftHud.rowStep;
    $gameScreen.showPicture(103, "characters/BossRespawn", 1, QJ.MPMZ.tl.topLeftHud.iconCenterX, picY + QJ.MPMZ.tl.topLeftHud.abilityIconCenterY, 100, 100, 255, 0);
    Saikey.MPMZ.bindPicture(103, 'QJ.MPMZ.tl.checkBossUnitSpawnStatus({refresh:true})', {
        decoration: "Gemini",
        minWidth: 360,
        maxWidth: 820,
        minHeight: 60,
        maxHeight: 640,
        fontSize: 22,
        needEval: true,
        paddingRight: 100,
        paddingBottom: 90,
        textDisplayHeight: 640
    });

    QJ.MPMZ.tl.topLeftHud.invalidate();
    const zoom = $gameScreen.zoomScale();
    const posX = QJ.MPMZ.tl.topLeftHud.abilityTextX / zoom;
    const posY = (picY + 85) / zoom;
    const Scale = 1 / zoom;

    QJ.MPMZ.Shoot({
        groupName: ['checkBossUnitSpawnStatus', 'UnitINexus'],
        position: [["S", posX], ["S", posY]],
        initialRotation: ["S", 0],
        imgRotation: ["S", 0],
        opacity: 1,
        moveType: ["S", 0],
        z: "A",
        scale: Scale,
        onScreen: true,
        anchor: [1, 1],
        existData: [],
        moveF: [
        ],
        moveJS: [[119, 119, "QJ.MPMZ.tl.topLeftHud.checkZoom();"]],
        deadJS: [
            "$gameScreen.erasePicture(103); QJ.MPMZ.tl.topLeftHud.invalidate();"
        ]
    });    
};

(() => {
    // ==================== 配置常量 ====================
    const CONFIG = {
        // ===== 區域安全性配置 =====

        // 說明：不安全區域的 Region ID 列表
        // 作用：逃脫時會避開這些區域，防止跳入危險地帶（如岩漿、毒沼等）
        // 修改：添加或移除 Region ID，例如 new Set([250, 251, 252])
        UNSAFE_REGION_IDS: new Set([250]),

        // ===== 逃脫系統配置 =====

        // 說明：尋找安全出口的最大搜索半徑（格子數）
        // 作用：限制逃脫搜索範圍，避免性能消耗
        // 修改：調大 → 能找到更遠的逃脫點，調小 → 僅搜索附近
        // 建議：10-20（會隨重試次數動態增加）
        MAX_SEARCH_RANGE: 15,

        // 說明：逃脫失敗後的最大重試次數
        // 作用：超過此次數後，傳送玩家到地圖起始點（終極保護）
        // 修改：調大 → 更多重試機會，調小 → 更快觸發終極傳送
        // 建議：5-15
        MAX_RETRY_COUNT: 10,

        // ===== 緩存管理配置 =====

        // 說明：最多緩存的地圖數量（LRU 策略）
        // 作用：保留最近訪問的 N 張地圖數據，超過時自動清除最舊的
        // 修改：調大 → 更多緩存（佔用更多內存），調小 → 更頻繁重新計算
        // 建議：3-5
        MAX_CACHED_MAPS: 5,

        // ===== 內存配置 =====

        // 說明：支持的最大地圖尺寸（單邊長度）
        // 作用：預分配緩衝區大小 = MAX_MAP_SIZE × MAX_MAP_SIZE × 2
        // 修改：調大 → 支持更大地圖（佔用更多內存），調小 → 節省內存
        // 建議：150-250（150 = 360KB，200 = 640KB，250 = 1MB）
        // 注意：超過此尺寸的地圖會導致預處理失敗
        MAX_MAP_SIZE: 200,

        // 說明：逃脫搜索的最大範圍（格子數）
        // 作用：預分配搜索緩衝區大小
        // 修改：通常不需要改動，除非 MAX_RETRY_COUNT 很大
        // 建議：保持 100（足以覆蓋半徑 100 的搜索，佔用 120KB）
        MAX_SEARCH_CELLS: 100,

        // ===== 性能優化配置 =====

        // 說明：通行性檢查模式
        // true：使用 $gamePlayer.canPass（嚴格，考慮事件碰撞）
        // false：使用 $gameMap.checkPassage（寬鬆，僅檢查圖塊通行性，性能更好）
        // 作用：影響所有 isPassable 判斷
        // 修改：false 可提昇 20-30% 性能，但可能無視某些事件阻擋
        // 建議：有複雜事件阻擋邏輯時用 true，否則用 false
        USE_STRICT_CHECK: true
    };

    // 降級跳躍方向（固定模式，由近到遠）
    const FALLBACK_JUMPS = [
        [0, -4], [0, 4], [-4, 0], [4, 0],
        [0, -3], [0, 3], [-3, 0], [3, 0],
        [0, -2], [0, 2], [-2, 0], [2, 0]
    ];

    // 四方向偏移量（避免在循環中重複創建）
    const DIR_OFFSETS = [
        [0, -1],  // 上
        [0, 1],   // 下
        [-1, 0],  // 左
        [1, 0]    // 右
    ];

    // ==================== 核心工具函式 ====================

    // 快取玩家碰撞忽略狀態
    let _canIgnoreCollision = false;

    // 預分配共享緩衝區，避免重複創建
    const _sharedVisited = new Set();
    const _sharedQueue = new Int32Array(CONFIG.MAX_SEARCH_CELLS ** 2 * 3);
    const _preprocessQueue = new Int32Array(CONFIG.MAX_MAP_SIZE ** 2 * 2);

    // 預分配候選點緩衝區（避免在 findSafeExit 中重複創建數組）
    const _candidatesBuffer = new Array(100);
    for (let i = 0; i < 100; i++) {
        _candidatesBuffer[i] = { x: 0, y: 0, openness: 0 };
    }

    // ==================== 地圖預處理系統 ====================

    // LRU 多地圖緩存
    const _mapCacheStore = new Map();
    const _lruOrder = [];

    /**
     * 將座標轉換為整數 Key，避免字串拼接造成的 GC 壓力
     * 假設地圖寬高不超過 65535
     */
    function coordToKey(x, y) {
        return (y << 16) | x;
    }

    /**
     * 檢查指定座標是否可通行
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {boolean} avoidUnsafe - 是否避開不安全區域（僅在尋找逃脫點時使用）
     * @returns {boolean}
     */
    function isPassable(x, y, avoidUnsafe = false) {
        if (!$gameMap.isValid(x, y)) return false;

        const region = $gameMap.regionId(x, y);

        // 檢查禁行區域
        if (!_canIgnoreCollision) {
            const isNoPassRegion = $gameNumberArray.value(5).includes(region);
            if (isNoPassRegion) return false;
        }

        // 避開不安全區域
        if (avoidUnsafe && CONFIG.UNSAFE_REGION_IDS.has(region)) return false;

        return CONFIG.USE_STRICT_CHECK
            ? $gamePlayer.canPass(x, y, 2)
            || $gamePlayer.canPass(x, y, 4)
            || $gamePlayer.canPass(x, y, 6)
            || $gamePlayer.canPass(x, y, 8)
            : $gameMap.checkPassage(x, y, 2)
            || $gameMap.checkPassage(x, y, 4)
            || $gameMap.checkPassage(x, y, 6)
            || $gameMap.checkPassage(x, y, 8);
    }

    /**
     * 檢查玩家是否完全被困（四方向都無法移動）
     */
    function isPlayerTrapped(x, y) {
        return !isPassable(x, y, false);
    }

    /**
     * 計算位置的開放度（周圍可通行方向的加權分數）
     * 四方向權重2，對角線權重1，最高 12 分
     */
    function calculateOpennessScore(x, y, avoidUnsafe = false) {
        let score = 0;

        // 四方向（各 2 分）
        if (isPassable(x, y - 1, avoidUnsafe)) score += 2;
        if (isPassable(x, y + 1, avoidUnsafe)) score += 2;
        if (isPassable(x - 1, y, avoidUnsafe)) score += 2;
        if (isPassable(x + 1, y, avoidUnsafe)) score += 2;

        // 對角線（各 1 分）
        if (isPassable(x - 1, y - 1, avoidUnsafe)) score += 1;
        if (isPassable(x + 1, y - 1, avoidUnsafe)) score += 1;
        if (isPassable(x - 1, y + 1, avoidUnsafe)) score += 1;
        if (isPassable(x + 1, y + 1, avoidUnsafe)) score += 1;

        return score;
    }

    /**
     * 檢查連通分量是否為完全封閉的孤島
     * 邏輯：遍歷該分量的所有格子，檢查其四周是否完全被牆壁包圍
     * 如果有任何一個格子的相鄰位置是主地圖或其他連通區域，則不是孤島
     * @param {number} componentId - 連通分量 ID
     * @param {Int32Array} componentMap - 連通分量地圖
     * @param {number} mainComponentId - 主地圖 ID
     * @param {number} width - 地圖寬度
     * @param {number} height - 地圖高度
     * @returns {boolean} true = 完全封閉的孤島，false = 有出口連接
     */
    function isComponentFullyIsolated(componentId, componentMap, mainComponentId, width, height) {
        // 主地圖本身不可能是孤島
        if (componentId === mainComponentId) return false;

        // 遍歷地圖，檢查該分量的所有格子
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;

                // 只檢查屬於該分量的格子
                if (componentMap[index] !== componentId) continue;

                // 檢查四個方向的相鄰格子（使用預定義的方向數組，避免創建臨時對象）
                for (let d = 0; d < 4; d++) {
                    const nx = x + DIR_OFFSETS[d][0];
                    const ny = y + DIR_OFFSETS[d][1];

                    // 邊界外視為牆壁，跳過
                    if (!$gameMap.isValid(nx, ny)) continue;

                    const nIndex = ny * width + nx;
                    const nComponentId = componentMap[nIndex];

                    // 如果相鄰格子屬於主地圖，說明有出口
                    if (nComponentId === mainComponentId) {
                        return false; // 不是孤島，有連接到主地圖
                    }

                    // 如果相鄰格子屬於其他連通區域（不是牆壁），也算有出口
                    // 這可以處理多個房間通過門互相連接的情況
                    if (nComponentId !== 0 && nComponentId !== componentId) {
                        return false; // 有連接到其他區域
                    }
                }
            }
        }

        // 所有邊界格子的外圍都是牆壁（componentId = 0），判定為孤島
        return true;
    }

    /**
     * 地圖預處理：建立完整的連通分量圖
     * 使用 Flood Fill 算法標記所有連通區域，找出主地圖
     */
    function preprocessMap() {
        const mapId = $gameMap.mapId();

        // 檢查緩存是否存在
        if (_mapCacheStore.has(mapId)) {
            const index = _lruOrder.indexOf(mapId);
            if (index !== -1) _lruOrder.splice(index, 1);
            _lruOrder.push(mapId);
            return;
        }

        // 緩存未命中，檢查是否需要淘汰
        if (_mapCacheStore.size >= CONFIG.MAX_CACHED_MAPS) {
            const oldestMapId = _lruOrder.shift();
            _mapCacheStore.delete(oldestMapId);
        }

        const width = $gameMap.width();
        const height = $gameMap.height();

        const cache = {
            width: width,
            height: height,
            componentMap: null,
            componentSizes: new Map(),
            mainComponentId: -1,
            componentIsIsolated: new Map()
        };

        const totalCells = width * height;
        cache.componentMap = new Int32Array(totalCells);

        const componentMap = cache.componentMap;
        const componentSizes = cache.componentSizes;

        let currentComponentId = 1;
        const queue = _preprocessQueue;

        const rightBound = width - 1;
        const bottomBound = height - 1;

        // Flood Fill 建立所有連通份量
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;

                if (componentMap[index] !== 0 || !isPassable(x, y, false)) {
                    continue;
                }

                let head = 0;
                let tail = 0;
                let componentSize = 0;

                queue[tail++] = x;
                queue[tail++] = y;
                componentMap[index] = currentComponentId;

                while (head < tail) {
                    const cx = queue[head++];
                    const cy = queue[head++];
                    componentSize++;

                    if (cy > 0) {
                        const nIndex = (cy - 1) * width + cx;
                        if (componentMap[nIndex] === 0 && isPassable(cx, cy - 1, false)) {
                            componentMap[nIndex] = currentComponentId;
                            queue[tail++] = cx;
                            queue[tail++] = cy - 1;
                        }
                    }

                    if (cy < bottomBound) {
                        const nIndex = (cy + 1) * width + cx;
                        if (componentMap[nIndex] === 0 && isPassable(cx, cy + 1, false)) {
                            componentMap[nIndex] = currentComponentId;
                            queue[tail++] = cx;
                            queue[tail++] = cy + 1;
                        }
                    }

                    if (cx > 0) {
                        const nIndex = cy * width + (cx - 1);
                        if (componentMap[nIndex] === 0 && isPassable(cx - 1, cy, false)) {
                            componentMap[nIndex] = currentComponentId;
                            queue[tail++] = cx - 1;
                            queue[tail++] = cy;
                        }
                    }

                    if (cx < rightBound) {
                        const nIndex = cy * width + (cx + 1);
                        if (componentMap[nIndex] === 0 && isPassable(cx + 1, cy, false)) {
                            componentMap[nIndex] = currentComponentId;
                            queue[tail++] = cx + 1;
                            queue[tail++] = cy;
                        }
                    }
                }

                componentSizes.set(currentComponentId, componentSize);
                currentComponentId++;
            }
        }

        // 找出主地圖（最大連通份量）
        let mainComponentId = -1;
        let maxSize = 0;

        for (const [id, size] of componentSizes.entries()) {
            if (size > maxSize) {
                maxSize = size;
                mainComponentId = id;
            }
        }

        cache.mainComponentId = mainComponentId;

        // 預先判斷每個連通份量是否為孤島
        for (const [id] of componentSizes.entries()) {
            const isIsolated = isComponentFullyIsolated(
                id, componentMap, mainComponentId, width, height
            );
            cache.componentIsIsolated.set(id, isIsolated);
        }

        _mapCacheStore.set(mapId, cache);
        _lruOrder.push(mapId);
    }

    /**
     * 綜合判斷玩家是否處於孤立區域
     * 完全依賴預處理數據 (O(1) 高效查表)
     */
    function isInIsolatedArea(x, y) {
        if (_canIgnoreCollision) return false;

        const mapId = $gameMap.mapId();
        const cache = _mapCacheStore.get(mapId);
        if (!cache) return false;

        const floorX = Math.floor(x);
        const floorY = Math.floor(y);

        // 邊界檢查
        if (floorX < 0 || floorX >= cache.width || floorY < 0 || floorY >= cache.height) return false;

        const index = floorY * cache.width + floorX;
        const componentId = cache.componentMap[index];

        // 障礙物中（視為被困）
        if (componentId === 0) return true;

        // 在主地圖區域（絕對安全）
        if (componentId === cache.mainComponentId) return false;

        // 直接查表該連通分量是否為孤島
        return cache.componentIsIsolated.get(componentId) || false;
    }

    // ==================== 逃脫系統 ====================

    /**
     * 尋找最近的安全出口
     * 邏輯：BFS 擴展，利用預處理數據快速判斷點位是否安全
     */
    function findSafeExit(startX, startY, maxRange) {
        _sharedVisited.clear();
        const queue = _sharedQueue;
        let head = 0;
        let tail = 0;

        _sharedVisited.add(coordToKey(startX, startY));
        queue[tail++] = startX;
        queue[tail++] = startY;
        queue[tail++] = 0;

        const mapId = $gameMap.mapId();
        const cache = _mapCacheStore.get(mapId);
        if (!cache) return null;

        // 使用預分配的候選點緩衝區，避免創建新數組
        let candidatesCount = 0;
        let foundCandidatesDist = -1;

        while (head < tail) {
            const x = queue[head++];
            const y = queue[head++];
            const dist = queue[head++];

            // 嚴格最短路徑控制：如果已經在更近的距離找到了候選點，立刻停止
            if (candidatesCount > 0 && dist > foundCandidatesDist) {
                break;
            }

            if (dist > maxRange) break;

            // 檢查點位有效性 (避開自身，且物理可通行)
            if (!(x === startX && y === startY) && isPassable(x, y, true)) {
                // 利用預處理數據進行 O(1) 判斷
                const index = y * cache.width + x;
                const componentId = cache.componentMap[index];

                // 必須是 主地圖 OR 不是孤島的區域
                let isSafe = false;
                if (componentId === cache.mainComponentId) {
                    isSafe = true;
                } else {
                    const isIsolated = cache.componentIsIsolated.get(componentId);
                    if (!isIsolated) {
                        isSafe = true;
                    }
                }

                if (isSafe) {
                    if (foundCandidatesDist === -1 || dist === foundCandidatesDist) {
                        foundCandidatesDist = dist;
                        // 複用緩衝區對象，避免創建新對象
                        if (candidatesCount < _candidatesBuffer.length) {
                            const candidate = _candidatesBuffer[candidatesCount++];
                            candidate.x = x;
                            candidate.y = y;
                            candidate.openness = calculateOpennessScore(x, y, true);
                        }
                    }
                }
            }

            // BFS 擴展（使用內聯計算，避免創建臨時變量）
            if (dist < maxRange) {
                const nextDist = dist + 1;

                // 上
                let nx = x;
                let ny = y - 1;
                let nKey = coordToKey(nx, ny);
                if (!_sharedVisited.has(nKey) && $gameMap.isValid(nx, ny)) {
                    _sharedVisited.add(nKey);
                    queue[tail++] = nx;
                    queue[tail++] = ny;
                    queue[tail++] = nextDist;
                }

                // 下
                ny = y + 1;
                nKey = coordToKey(nx, ny);
                if (!_sharedVisited.has(nKey) && $gameMap.isValid(nx, ny)) {
                    _sharedVisited.add(nKey);
                    queue[tail++] = nx;
                    queue[tail++] = ny;
                    queue[tail++] = nextDist;
                }

                // 左
                nx = x - 1;
                ny = y;
                nKey = coordToKey(nx, ny);
                if (!_sharedVisited.has(nKey) && $gameMap.isValid(nx, ny)) {
                    _sharedVisited.add(nKey);
                    queue[tail++] = nx;
                    queue[tail++] = ny;
                    queue[tail++] = nextDist;
                }

                // 右
                nx = x + 1;
                nKey = coordToKey(nx, ny);
                if (!_sharedVisited.has(nKey) && $gameMap.isValid(nx, ny)) {
                    _sharedVisited.add(nKey);
                    queue[tail++] = nx;
                    queue[tail++] = ny;
                    queue[tail++] = nextDist;
                }
            }
        }

        // 在所有「最短距離」的候選點中，選擇地形最開闊的一個
        if (candidatesCount > 0) {
            let bestCandidate = _candidatesBuffer[0];
            for (let i = 1; i < candidatesCount; i++) {
                if (_candidatesBuffer[i].openness > bestCandidate.openness) {
                    bestCandidate = _candidatesBuffer[i];
                }
            }
            // 返回最佳候選點的副本
            return { x: bestCandidate.x, y: bestCandidate.y, openness: bestCandidate.openness };
        }

        return null;
    }

    /**
     * 降級策略：固定方向跳躍
     */
    function tryFallbackJump(playerX, playerY) {
        const mapId = $gameMap.mapId();
        const cache = _mapCacheStore.get(mapId);
        if (!cache) return false;

        for (let i = 0; i < FALLBACK_JUMPS.length; i++) {
            const dx = FALLBACK_JUMPS[i][0];
            const dy = FALLBACK_JUMPS[i][1];
            const tx = playerX + dx;
            const ty = playerY + dy;

            if (isPassable(tx, ty, true)) {
                const index = ty * cache.width + tx;
                const componentId = cache.componentMap[index];

                if (componentId === cache.mainComponentId) {
                    $gamePlayer.jump(dx, dy);
                    return true;
                }

                const isIsolated = cache.componentIsIsolated.get(componentId);
                if (!isIsolated) {
                    $gamePlayer.jump(dx, dy);
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 執行逃脫流程
     */
    function performEscape(playerX, playerY, retryCount) {
        QJ.MPMZ.tl.ex_playerStuckCollisionDamage();

        const searchRange = CONFIG.MAX_SEARCH_RANGE + (retryCount * 3);
        const exit = findSafeExit(playerX, playerY, searchRange);

        if (exit) {
            $gamePlayer.jump(exit.x - playerX, exit.y - playerY);
            return true;
        }

        return tryFallbackJump(playerX, playerY);
    }

    // ==================== 主檢查邏輯 ====================

    let _lastCheckX = -1;
    let _lastCheckY = -1;
    let _lastMapId = -1;

    let _stuckRetryCount = 0;
    let _lastStuckX = -1;
    let _lastStuckY = -1;

    // 基於底部預處理快取判斷：指定格子是否與玩家主可達區連通
    QJ.MPMZ.tl.isTileReachableForPlayer = function (x, y) {
        if (!$gameMap || !$gamePlayer) return false;
        if (!$gameMap.isValid(x, y)) return false;

        const mapId = $gameMap.mapId();

        // 同步碰撞忽略狀態，與卡牆檢測保持一致
        _canIgnoreCollision = $gamePlayer._through || $gamePlayer.isJumping() || $gameSwitches.value(100);

        // 若無此地圖快取，先預處理
        if (!_mapCacheStore.has(mapId) && mapId > 0) {
            preprocessMap();
        }

        const cache = _mapCacheStore.get(mapId);
        if (!cache) return false;

        // 本身不可通行直接視為不可達
        if (!isPassable(x, y, false)) return false;

        const index = y * cache.width + x;
        const componentId = cache.componentMap[index];
        if (!componentId) return false;

        if (componentId === cache.mainComponentId) return true;
        return !(cache.componentIsIsolated.get(componentId) || false);
    };


    QJ.MPMZ.tl.ex_playerStuckCheck = function () {
        const actor = $gameParty.leader();
        // 死亡及急救演出期间不检测卡墙；保底 1HP 仍由死亡锁和标记拦截。
        if ($gameTemp._eventReserved || actor._deadness || actor.hp <= 0) return;

        const currentMapId = $gameMap.mapId();
        // MV→MZ：Game_CharacterBase.setPosition 在 MZ 会对 _x/_y 做 Math.round（MV 不会），
        //   导致 $gamePlayer.x（= _x）在 MZ 下变成“四舍五入后的格子”，配合点像素移动，
        //   贴墙静止于小数位置时会被吸附到墙体那一格，进而被误判为卡墙。
        //   这里直接读未取整的 _realX/_realY，复现 MV 行为，与本插件其余坐标计算保持一致。
        const playerX = Math.floor($gamePlayer._realX);
        const playerY = Math.floor($gamePlayer._realY);

        if ($gameMessage.isBusy()) QJ.MPMZ.tl.ex_playerAttackCommandBlock();

        // 更新碰撞忽略狀態
        _canIgnoreCollision = $gamePlayer._through || $gamePlayer.isJumping() || $gameSwitches.value(100);

        // 切換地圖時，執行一次預處理
        if (currentMapId !== _lastMapId && currentMapId > 0) preprocessMap();

        const isTrapped = isPlayerTrapped(playerX, playerY);

        // 如果不被困 & 座標沒變 & 地圖也沒變，才跳過
        if (!isTrapped &&
            playerX === _lastCheckX &&
            playerY === _lastCheckY &&
            currentMapId === _lastMapId) {
            return;
        }

        // 孤立區域檢測
        const isIsolated = !isTrapped && isInIsolatedArea(playerX, playerY);

        if (isTrapped || isIsolated) {
            if (playerX === _lastStuckX && playerY === _lastStuckY) {
                _stuckRetryCount++;
            } else {
                _stuckRetryCount = 1;
                _lastStuckX = playerX;
                _lastStuckY = playerY;
            }

            if (_stuckRetryCount > CONFIG.MAX_RETRY_COUNT) {
                $gamePlayer.reserveTransfer(
                    currentMapId,
                    $dataMap.startX || 0,
                    $dataMap.startY || 0
                );
                _stuckRetryCount = 0;
                _lastStuckX = -1;
                _lastStuckY = -1;
                return;
            }

            performEscape(playerX, playerY, _stuckRetryCount);

        } else {
            if (_stuckRetryCount > 0) {
                _stuckRetryCount = 0;
                _lastStuckX = -1;
                _lastStuckY = -1;
            }
        }

        _lastCheckX = playerX;
        _lastCheckY = playerY;
        _lastMapId = currentMapId;
    };
})();
