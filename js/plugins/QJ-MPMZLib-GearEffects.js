//=============================================================================
//
//=============================================================================
/*:
 * @target MV MZ
 * @plugindesc [弹幕模板库][装备特效模板]
 * @author 仇九
 *
 * @help 
 * 
 *
 */


//=============================================================================
// 
//=============================================================================

// 创伤救援小组：浅羽贴近玩家，澪在对侧寻找空位；返回是否成功生成两人。
// maxDistance 只控制澪的搜索距离；insetPixels 控制两人向玩家靠近的像素数。
QJ.MPMZ.tl.ex_spawnNurseRescueTeam = function (maxDistance = 6, insetPixels = 12) {
    const map = $gameMap;
    const temp = map.chahuiMapTemp;
    const inset = insetPixels / map.tileWidth();
    const px = $gamePlayer._realX + $gamePlayer.offsetX();
    const py = map.roundY($gamePlayer._realY + $gamePlayer.offsetY());
    const directions = [2, 4, 6, 8];
    temp.NurseAsaba = 0;
    temp.NurseMio = 0;
    temp.NurseTurner = 0;

    // 当前两个护士模板的 DotMove 占地都是 1×1，无显示偏移。
    const pass = (x, y, d) => {
        x = map.roundX(x);
        y = map.roundY(y);
        if (!map.isValid(x, y)) return false;
        const region = map.regionId(x, y);
        if (region === 254 || region === 255) return false;
        if (region && map.restrictEventRegions().includes(region)) return false;
        return (region !== 0 && map.allowEventRegions().includes(region)) || map.isPassable(x, y, d);
    };
    const floorClear = (x, width) => {
        const left = Math.floor(x);
        const right = Math.ceil(x + width - 0.000001) - 1;
        const top = Math.floor(py);
        const bottom = Math.ceil(py + 1 - 0.000001) - 1;
        for (let tx = left; tx <= right; tx++) {
            for (let ty = top; ty <= bottom; ty++) {
                if (!directions.some(d => pass(tx, ty, d))) return false;
                if (tx < right && (!pass(tx, ty, 6) || !pass(tx + 1, ty, 4))) return false;
                if (ty < bottom && (!pass(tx, ty, 2) || !pass(tx, ty + 1, 8))) return false;
            }
        }
        return true;
    };

    // 先确定翻面人选，再安排她站左侧；浅羽始终保持贴近玩家。
    let pair = null;
    for (let distance = 1; distance <= maxDistance && !pair; distance++) {
        const asabaDistance = Math.abs(1 - inset) * map.tileWidth();
        const mioDistance = Math.abs(distance - inset) * map.tileWidth();
        const asabaTurns = asabaDistance <= 32.000001 && mioDistance <= 32.000001
            ? Math.random() > 0.5 : asabaDistance <= mioDistance;
        const side = asabaTurns ? -1 : 1;
        const ax = map.roundX(px + side * (1 - inset));
        const mx = map.roundX(px - side * (distance - inset));
        // 循环地图也必须保持两人的相对方向，不能绕一圈选到背后。
        if (Math.abs(map.deltaX(mx, ax) + side * (distance + 1 - 2 * inset)) > 0.000001) continue;
        // 忽略事件、队友和载具占位，只检查墙体和地形通行性。
        const left = side < 0 ? px - 1 + inset : px - distance + inset;
        if (floorClear(left, distance + 2 - 2 * inset)) {
            pair = { ax, mx, direction: side < 0 ? 6 : 4, asabaTurns };
        }
    }
    if (!pair) return false;

    const spawn = (templateId, x, direction) => {
        const id = map.spawnEventQJ(1, templateId, x, py, false, {
            _opacity: 0,
            _direction: direction
        });
        if (!id) return 0;
        const event = map.event(id);
        // 只改本次生成副本；切到第二页、退场页也保留正确朝向。
        for (const page of event.event().pages) page.image.direction = direction;
        return id;
    };
    temp.NurseAsaba = spawn(122, pair.ax, pair.direction);
    if (!temp.NurseAsaba) return false;
    temp.NurseMio = spawn(123, pair.mx, 10 - pair.direction);
    if (!temp.NurseMio) {
        map.clearSpawnEventQJ(temp.NurseAsaba);
        temp.NurseAsaba = 0;
        return false;
    }
    temp.NurseTurner = pair.asabaTurns ? temp.NurseAsaba : temp.NurseMio;
    return true;
};

// 翻面分支读取生成时确定的人选，避免演出中重新随机导致站位不符。
QJ.MPMZ.tl.ex_nurseAsabaTurnsPlayer = function () {
    const temp = $gameMap.chahuiMapTemp;
    return temp.NurseTurner > 0 && temp.NurseTurner === temp.NurseAsaba;
};

// 澪把 AED 抛给浅羽：固定飞行 40 帧，和公共事件的接取音效同步。
QJ.MPMZ.tl.ex_throwNurseAED = function (arcHeight = 72) {
    const map = $gameMap;
    const mio = map.event(map.chahuiMapTemp.NurseMio);
    const asaba = map.event(map.chahuiMapTemp.NurseAsaba);
    if (!mio || !asaba) return;
    // 手部位置：朝向前方 10px、脚底上方 16px。
    const fromHand = mio.direction() === 4 ? -10 : 10;
    const toHand = asaba.direction() === 4 ? -10 : 10;
    const dx = map.deltaX(asaba.screenX() / map.tileWidth(), mio.screenX() / map.tileWidth())
        * map.tileWidth() + toHand - fromHand;
    const dy = map.deltaY(asaba.screenY() / map.tileHeight(), mio.screenY() / map.tileHeight())
        * map.tileHeight();
    return QJ.MPMZ.Shoot({
        img: 'AED', groupName: ['NurseAED'],
        position: [['S', mio.screenX() + fromHand], ['S', mio.screenY() - 35]],
        initialRotation: ['S', 0], imgRotation: ['S', 0],
        anchor: [0.5, 0.5], scale: 1.2, z: 11,
        immuneTimeStop: true,
        // F 轨迹在初始角度 0 时，第一项是向上距离，第二项是向右距离。
        moveType: ['F', `${4 * arcHeight}*(t/40)*(1-t/40)-(${dy})*(t/40)`, `${dx}*(t/40)`],
        existData: [{ t: ['Time', 40] }]
    });
};

// 急救失败后的抬担架离场：6 帧奔跑循环，从屏幕右下方跑向左下方。
QJ.MPMZ.tl.ex_electrotherapyFailureRun = function () {
    const scale = 3 * Graphics.height / 1080 / $gameScreen.zoomScale();
    return QJ.MPMZ.Shoot({
        img: 'electrotherapyFailure[6,10]',
        groupName: ['electrotherapyFailureRun'],
        position: [['S', 0], ['S', 0]],
        initialRotation: ['S', 0], imgRotation: ['S', 0],
        anchor: [0.5, 1], scale, z: 'TOP',
        onScreen: true, immuneTimeStop: true,
        moveType: ['S', 0],
        existData: [{ t: ['Time', 180] }],
        moveF: [[0, 0, QJ.MPMZ.tl.ex_electrotherapyFailureRunUpdate]]
    });
};

QJ.MPMZ.tl.ex_electrotherapyFailureRunUpdate = function () {
    const frame = Math.max(0, this.time - 1);
    const t = Math.min(frame / 180, 1);
    const size = Graphics.height / 1080;
    const zoom = $gameScreen.zoomScale();
    // 每帧宽 144px、显示为 3 倍；两端留出半帧宽，让整副担架跑出画面。
    const margin = (144 * 3 / 2 + 16) * size;
    const progress = 0.85 * t + 0.15 * t * t;
    const stride = 2 * size * Math.sin(frame * Math.PI / 15);
    const bob = 6 * size * Math.abs(Math.sin(frame * Math.PI / 30));
    const x = Graphics.width + margin - (Graphics.width + 2 * margin) * progress + stride;
    const y = Graphics.height * 0.96 - bob;
    // 按屏幕坐标逐帧定位，地图滚动不会改变离场路线。
    this._x = this.x = x / zoom + $gameMap.displayX() * $gameMap.tileWidth();
    this._y = this.y = y / zoom + $gameMap.displayY() * $gameMap.tileHeight();
};

// 米斯特汀从者：绑定独立装备ID；slot只决定按钮位置，换槽不重建从者。
QJ.MPMZ.tl.MistilteinnServantEquipment = function (item, mode = 'equip') {
    if (!item || (item.baseItemId || item.id) !== 81) return;
    const aid = item.id;
    const actor = $gameParty.leader();
    const slot = actor.equips().indexOf(item);
    const timerKey = 'MistilteinnServantAwake-' + aid;
    const servants = $gameMap.drill_COET_getEventsByTag_direct('bindArmor' + aid)
        .filter(event => event._mistilteinnArmorId === aid && !event._erased);
    if (mode === 'expire') {
        if (!item._mistilteinnAwake) return;
        item._mistilteinnAwake = false;
        item._mistilteinnFinishPending = slot > 0;
        return;
    }
    if (mode === 'remove' || slot < 1) {
        item._mistilteinnAwake = false;
        item._mistilteinnFinishPending = false;
        $gameSystem.removeGameTimeEventByKey(timerKey);
        for (const id of $gameMap.getGroupBulletListQJ('MistilteinnServantButton-' + aid)) {
            const button = $gameMap.bulletQJ(id);
            if (button) QJ.MPMZ.tl.updateMistilteinnButtonParticle.call(button, false);
        }
        QJ.MPMZ.deleteProjectile('MistilteinnServantButton-' + aid);
        QJ.MPMZ.deleteProjectile('MistilteinnServantControl-' + aid);
        for (const event of servants) {
            item._mistilteinnServantHp = $gameSelfVariables.value([$gameMap.mapId(), event._eventId, 'HP']);
            QJ.MPMZ.tl.MistilteinnServantFinish(event, false);
            if (!event._mistilteinnDying) $gameMap.clearSpawnEventQJ(event._eventId);
        }
        return;
    }
    let event = servants[0];
    if (!event) {
        const eid = $gameMap.spawnEventQJ(1, 64, $gamePlayer._x, $gamePlayer._y, false,
            {_mistilteinnArmorId: aid});
        event = $gameMap.event(eid);
        if (!event) return;
        event.drill_COET_addTag('bindArmor' + aid);
    }
    if (event._mistilteinnDying) return;
    // While Equipped在读档/换图恢复；已经初始化的事件不重设HP或重复创建控制器。
    if (event._mistilteinnInitialized) QJ.MPMZ.tl.MistilteinnServantAI.call(event, {restore: true});
    if ($gameMap.getGroupBulletListQJ('MistilteinnServantButton-' + aid).length) return;
    const mobile = Utils.isMobileDevice();
    QJ.MPMZ.Shoot({
        img: ['I', 64], groupName: ['MistilteinnServantButtons', 'MistilteinnServantButton-' + aid],
        servantArmorId: aid, servantButtonScale: mobile ? 1 : 0.5, servantButtonMobile: mobile,
        position: [['S', 1776 / $gameScreen.zoomScale()], ['S', (228 + slot * 80) / $gameScreen.zoomScale()]],
        initialRotation: ['S', 0], imgRotation: ['F'], moveType: ['S', 0],
        scale: (mobile ? 2 : 1) / $gameScreen.zoomScale(), opacity: item._mistilteinnAwake ? 0 : 1,
        immuneTimeStop: true, onScreen: true, z: 'A', existData: [],
        moveF: [[1, 0, QJ.MPMZ.tl.MistilteinnServantButton]]
    });
};

// 鼠标与触摸共用命中范围；不分配键盘快捷键，也不创建武器按钮的E提示。
QJ.MPMZ.tl.MistilteinnServantButton = function (extra = {}) {
    if (extra.capture) {
        return $gameMap.getGroupBulletListQJ('MistilteinnServantButtons').some(id => {
            const button = $gameMap.bulletQJ(id);
            return button && !button.dead && QJ.MPMZ.tl.MistilteinnServantButton.call(button, {hit: true});
        });
    }
    if (this.dead) return false;
    const data = this.data;
    const equips = $gameParty.leader().equips();
    const slot = equips.findIndex((item, index) => index > 0 && item && item.id === data.servantArmorId && (item.baseItemId || item.id) === 81);
    const item = equips[slot];
    const mobile = data.servantButtonMobile;
    const pressed = mobile ? TouchInput.isPressed() : TouchInput.drill_isLeftPressed();
    if (!pressed) this._mistilteinnClickCaptured = false;
    if (extra.hit && this._mistilteinnClickCaptured && pressed) return true;
    if (!item) {
        if (!extra.hit) {
            QJ.MPMZ.tl.updateMistilteinnButtonParticle.call(this, false);
            this.setDead();
        }
        return false;
    }
    const parent = SceneManager._scene?._spriteset;
    const zoom = $gameScreen.zoomScale();
    const scale = data.servantButtonScale * 2 / zoom;
    const pointer = mobile ? TouchInput : TouchInput.drill_COI_getMousePos();
    // 从当前槽位直接计算UI坐标，不受按钮上一帧的位置或地图滚动影响。
    const hovered = !item._mistilteinnAwake && !!parent && !SceneManager.isSceneChanging()
        && !$gameMessage.isBusy() && !$gameMap.isEventRunning()
        && Math.abs(pointer.x - 1776) <= ImageManager.iconWidth * data.servantButtonScale
        && Math.abs(pointer.y - (228 + slot * 80)) <= ImageManager.iconHeight * data.servantButtonScale;
    if (extra.hit) return hovered;
    const displayX = $gameMap.displayX() * QJ.tileSize;
    const displayY = $gameMap.displayY() * QJ.tileSize;
    this._x = this.x = (1776 - (parent?.x || 0)) / zoom + displayX;
    this._y = this.y = (228 + slot * 80 - (parent?.y || 0)) / zoom + displayY;
    this._orginDisplayX = displayX;
    this._orginDisplayY = displayY;
    const desiredScale = scale * (hovered ? 1.25 : 1);
    if (this._servantButtonScale !== desiredScale) {
        this._servantButtonScale = desiredScale;
        this.changeAttribute('scale', desiredScale);
    }
    if (this._servantAwake !== !!item._mistilteinnAwake) {
        this._servantAwake = !!item._mistilteinnAwake;
        this.changeAttribute('opacity', item._mistilteinnAwake ? 0 : 1);
    }
    const hasStone = $gameParty.numItems($dataItems[20]) > 0;
    if (this._servantHasStone !== hasStone) {
        this._servantHasStone = hasStone;
        this.changeAttribute('tone', hasStone ? [0, 0, 0, 0] : [0, 0, 0, 255]);
    }
    QJ.MPMZ.tl.updateMistilteinnButtonParticle.call(this, hasStone && !item._mistilteinnAwake);
    if (!hovered || !(mobile ? TouchInput.isTriggered() : TouchInput.drill_isLeftTriggered())) return;
    this._mistilteinnClickCaptured = true;
    if (!hasStone) { SoundManager.playBuzzer(); return; }
    if (item._mistilteinnServantHp <= 0 || $gameParty.leader().isDead()) return;
    const servant = $gameMap.drill_COET_getEventsByTag_direct('bindArmor' + item.id)
        .find(event => event._mistilteinnArmorId === item.id && !event._erased && !event._mistilteinnDying);
    if (!servant) return;
    $gameParty.gainItem($dataItems[20], -1);
    item._mistilteinnAwake = true;
    item._mistilteinnFinishPending = false;
    // 先恢复本体再播放唤醒演出，避免演出截取到共鸣中的占位贴图。
    if (servant._mistilteinnCast?.resonance) QJ.MPMZ.tl.MistilteinnServantFinish(servant, true, true);
    $gameSystem.addGameTimeEvent({
        key: 'MistilteinnServantAwake-' + item.id, command: 'script', delayMinutes: 10,
        target: `QJ.MPMZ.tl.MistilteinnServantEquipment($dataArmors[${item.id}], 'expire');`, condition: 'true'
    });
    // 在对应从者上运行第三页演出，保持当前跟随/战斗页不变。
    servant.steupCEQJ(3);
    this.changeAttribute('opacity', 0);
    QJ.MPMZ.tl.updateMistilteinnButtonParticle.call(this, false);
};

// 搜索只在空闲决策时运行；敌人及Boss的可攻击物体组去重，并排除所有友方从者。
QJ.MPMZ.tl.MistilteinnServantFindTarget = function (event, range = 300) {
    const enemies = new Set($gameMap.getGroupEventListQJ('"enemy"'));
    const ids = new Set([...enemies, ...$gameMap.getGroupEventListQJ('"object"')]);
    let target = null, distance = range * range;
    for (const eid of ids) {
        const enemy = $gameMap.event(eid);
        if (!enemy || enemy === event || enemy._erased || enemy.drill_COET_hasTag('从者')
            || $gameSelfSwitches.value([$gameMap.mapId(), eid, 'D'])
            || !($gameSelfVariables.value([$gameMap.mapId(), eid, 'HP']) > 0)) continue;
        if (!enemies.has(eid) && !enemy.drill_COET_hasTag('BOSS') && !enemy.drill_COET_hasTag('Mistilteinn')) continue;
        const dx = enemy.screenBoxXQJ() - event.screenBoxXQJ();
        const dy = enemy.screenBoxYQJ() - event.screenBoxYQJ();
        if (dx * dx + dy * dy > distance) continue;
        distance = dx * dx + dy * dy;
        target = enemy;
    }
    return target;
};

QJ.MPMZ.tl.MistilteinnServantAim = function (cast) {
    // 共鸣无目标时，冲锋由固定方向控制；ScarletFork收招回到玩家附近。
    return $gameMap.event(cast.targetId) || (cast.resonance ? $gamePlayer : $gameMap.event(cast.eid));
};

// 玩家方魔剑专用命中入口；标记随伤害参数传递，rangeAtk也能识别，不依赖子弹this.data。
QJ.MPMZ.tl.MistilteinnFriendlyHit = function (damage, attackData, args) {
    const target = args?.target;
    if (!target || (attackData.mistilteinnFriendlyDamage && target._mistilteinnArmorId != null)) return;
    QJ.MPMZ.tl.ex_toEnemyAttack.call(this, damage, attackData, args);
};

QJ.MPMZ.tl.MistilteinnServantHit = function (damage, attackData, args) {
    if (!args?.target || args.target.drill_COET_hasTag('从者')) return;
    QJ.MPMZ.tl.MistilteinnFriendlyHit.call(this, damage,
        {...attackData, mistilteinnFriendlyDamage: true, nonPlayerDamage: true}, args);
};

// 王权征令沿用101号熟练度；施法途中保持本次技能的体型，收招后应用最新等级。
QJ.MPMZ.tl.MistilteinnServantScale = function (event) {
    const scale = event._mistilteinnCast?.scale ?? (1 + 0.25 * $gameParty.leader().skillMasteryLevel(101));
    event._mistilteinnScale = scale;
    const effect = event._Drill_ECE = event._Drill_ECE || {};
    effect.scale_x = effect.scale_y = scale - 1;
    if (!effect.playing_type) effect.playing_type = '王权征令';
    // 换页会重建碰撞盒；只在尺寸变化时刷新，保留事件原本的碰撞中心。
    if (event._boxBodyQJ?.w !== 56 * scale || event._boxBodyQJ?.h !== 14 * scale) {
        event.changeCBQJ(['R', 56 * scale, 14 * scale], 0, 6);
    }
    return scale;
};

QJ.MPMZ.tl.MistilteinnServantFinish = function (event, restore = true, immediate = false) {
    const cast = event._mistilteinnCast;
    if (restore && cast) {
        for (const id of $gameMap.getGroupBulletListQJ(cast.group)) {
            const body = $gameMap.bulletQJ(id);
            if (!body || body.dead) continue;
            if (body.data.mistilteinnReturnBody) event.setPosition(body._realX, body._realY);
            else if (body.data.slashReady) event.setPosition(
                event._realX + (body.x - event.screenBoxXQJ()) / $gameMap.tileWidth(),
                event._realY + (body.y - event.screenBoxYQJ()) / $gameMap.tileHeight());
            // 强制结束共鸣时，拖尾与技能本体同时消失，不再等待残影淡出。
            if (immediate) body.dataRem.length = 0;
        }
    }
    event._mistilteinnCast = null; // 先解除绑定，旧回调不能再次恢复或发动下一段。
    QJ.MPMZ.deleteProjectile(cast?.group || 'MistilteinnServantCast-' + event._mistilteinnArmorId);
    if (!restore || event._erased || event._mistilteinnDying
        || $gameSelfSwitches.value([$gameMap.mapId(), event._eventId, 'D'])) return;
    event.cancelMove();
    event._moveType = 3;
    event.setOpacity(255);
    event.drill_EASe_stopAct();
    event.drill_EASe_setSimpleStateNode(['剑形态-待机']);
    event._drill_EASe_controller?.update();
    QJ.MPMZ.tl.MistilteinnServantScale(event);
    event._groupListQJ = ['object', '"object"'];
    event.updateBoxBodyPositionQJ();
    $gameMap.refreshUpdateBoxDataQJ();
    const item = $dataArmors[event._mistilteinnArmorId];
    const actor = $gameParty.leader();
    const weapon = actor.equips()[0];
    const resonance = !item?._mistilteinnAwake && (weapon?.baseItemId || weapon?.id) === 37
        && actor.isStateAffected(96);
    event._mistilteinnCooldown = item?._mistilteinnAwake ? 18 : resonance ? 0 : 120;
};

// 技能子弹执行：即使控制效果暂停了事件解释器，也会立即中止并恢复本体。
QJ.MPMZ.tl.MistilteinnServantInterrupted = function () {
    const cast = this.data.mistilteinnServant;
    const event = cast.mapId === $gameMap.mapId() ? $gameMap.event(cast.eid) : null;
    if (!event || event._erased || event._mistilteinnCast?.serial !== cast.serial) {
        this.setDead();
        return true;
    }
    if (cast.resonance) {
        const actor = $gameParty.leader();
        const weapon = actor.equips()[0];
        if ((weapon?.baseItemId || weapon?.id) !== 37 || !actor.isStateAffected(96)) {
            QJ.MPMZ.tl.MistilteinnServantFinish(event, true, true);
            this.setDead();
            return true;
        }
    }
    if (event._IsDisabledCounter > 0 || event._IsDisabled || event._mistilteinnDying
        || $gameSelfSwitches.value([cast.mapId, cast.eid, 'D'])) {
        if (this.data.slashCasterMapId != null) {
            event.setPosition(event._realX + (this.x - event.screenBoxXQJ()) / $gameMap.tileWidth(),
                event._realY + (this.y - event.screenBoxYQJ()) / $gameMap.tileHeight());
        } else if (this.data.mistilteinnReturnBody) event.setPosition(this._realX, this._realY);
        QJ.MPMZ.tl.MistilteinnServantFinish(event);
        this.setDead();
        return true;
    }
    return false;
};

QJ.MPMZ.tl.MistilteinnServantCast = function (skill, target, extra = {}) {
    const event = this;
    const item = $dataArmors[event._mistilteinnArmorId];
    // 从者固定伤害配置：不读取玩家atk/mat，也不套用武器版的伤害/穿透。
    const damage = {MoonlightSlash: 60, ForceWave: 60, ScarletFork: 60,
        SpinningSlash: 45, VortexCharge: 90, ScatterSwordBeamCluster: 60};
    // 以本次出招时的唤醒状态计算，派生剑气及ScarletFork收招沿用同一份伤害。
    const oldSkillRate = item._mistilteinnAwake ? 1.5 : 1;
    const isOldSkill = ['MoonlightSlash', 'ForceWave', 'ScarletFork'].includes(skill);
    const level = $gameParty.leader().skillMasteryLevel(101);
    const damageRate = 1.33 ** level; // 每级在上一级基础上增加33%，再乘唤醒加成。
    const cast = {
        eid: event._eventId, armorId: item.id, mapId: $gameMap.mapId(), targetId: target?._eventId || 0,
        resonance: extra.resonance === true,
        resonanceAngle: extra.resonance && !target ? chahuiUtil.getCharacterAngle(-1) : undefined,
        serial: event._mistilteinnSerial = (event._mistilteinnSerial || 0) + 1,
        group: 'MistilteinnServantCast-' + item.id, beamGroup: 'MistilteinnServantBeam-' + item.id,
        // 所有倍率相乘后统一取整，避免浮点尾数进入伤害显示和HP结算。
        damage: Math.round(damage[skill] * damageRate * (isOldSkill ? oldSkillRate : 1)),
        beamDamage: Math.round(24 * damageRate * oldSkillRate),
        returnDamage: Math.round(60 * damageRate * oldSkillRate),
        scale: 1 + 0.25 * level
    };
    event._mistilteinnCast = cast;
    QJ.MPMZ.tl.MistilteinnServantScale(event);
    event.cancelMove();
    event._moveType = 0;
    const angle = target ? (QJ.calculateAngleByTwoPointAngle(event.screenBoxXShowQJ(), event.screenBoxYShowQJ(),
        target.screenBoxXShowQJ(), target.screenBoxYShowQJ()) || 0) : chahuiUtil.getCharacterAngle(-1);
    QJ.MPMZ.tl['Mystletainn' + skill].call(event, {
        playerCast: true, servantCast: cast, eid: event._eventId, angle, damage: cast.damage, scale: cast.scale
    });
};

// 初始化/恢复由事件第一页及While Equipped调用；思考由第二页每15帧调用。
// 独立QJ控制器每帧负责HP、死亡、技能结束和受控中断，不依赖事件解释器运行。
QJ.MPMZ.tl.MistilteinnServantAI = function (extra = {}) {
    if (extra.update && this.data.servantMapId !== $gameMap.mapId()) { this.setDead(); return; }
    const event = extra.update ? $gameMap.event(this.data.eid) : $gameMap.event(this._eventId);
    if (!event || event._erased) { if (extra.update) this.setDead(); return; }
    const actor = $gameParty.leader();
    const equips = actor.equips();
    const item = equips.find((equip, index) => index > 0 && equip
        && equip.id === event._mistilteinnArmorId && (equip.baseItemId || equip.id) === 81);
    if (!item) {
        if (!event._mistilteinnDying) {
            const removed = $dataArmors[event._mistilteinnArmorId];
            if (removed) QJ.MPMZ.tl.MistilteinnServantEquipment(removed, 'remove');
            else $gameMap.clearSpawnEventQJ(event._eventId);
        }
        if (extra.update) this.setDead();
        return;
    }
    const weaponAwake = (equips[0]?.baseItemId || equips[0]?.id) === 37 && actor.isStateAffected(96);
    const resonance = !item._mistilteinnAwake && weaponAwake;
    if (!extra.update) QJ.MPMZ.tl.MistilteinnServantScale(event);
    const key = [$gameMap.mapId(), event._eventId, 'HP'];
    if (extra.initialize || extra.restore) {
        event.drill_COET_addTag('Mistilteinn');
        event.drill_COET_addTag('从者');
        event.drill_COET_addTag('bindArmor' + item.id);
        if (!event._mistilteinnInitialized) {
            event._mistilteinnInitialized = true;
            const mhp = 7200 * (1 + $gameParty.leader().skillMasteryLevel(101));
            $gameSelfVariables.setValue(key, item._mistilteinnServantHp ?? mhp);
            $gameSelfVariables.setValue([$gameMap.mapId(), event._eventId, 'MHP'], mhp);
            $gameSelfVariables.setValue([$gameMap.mapId(), event._eventId, 'fudou'], 99);
            $gameSelfVariables.setValue([$gameMap.mapId(), event._eventId, 'enemyId'], 120);
            event.drill_EASe_setSimpleStateNode(['剑形态-待机']);
            event._mistilteinnCooldown = 15 + Math.randomInt(31);
            event._mistilteinnNormalStep = Math.randomInt(3);
            event._mistilteinnAwakeStep = Math.randomInt(9);
            $gameSelfSwitches.setValue([$gameMap.mapId(), event._eventId, 'A'], true);
        }
        if (!$gameMap.getGroupBulletListQJ('MistilteinnServantControl-' + item.id).length) {
            QJ.MPMZ.Shoot({groupName: ['MistilteinnServantControl-' + item.id],
                eid: event._eventId, servantMapId: $gameMap.mapId(),
                position: [['S', 0], ['S', 0]], initialRotation: ['S', 0], moveType: ['S', 0],
                existData: [], moveF: [[1, 0, QJ.MPMZ.tl.MistilteinnServantAI, [{update: true}]]]});
        }
        return;
    }
    if (extra.update) {
        item._mistilteinnServantHp = $gameSelfVariables.value(key);
        if (item._mistilteinnServantHp <= 0) {
            QJ.MPMZ.tl.MistilteinnServantFinish(event, false);
            $gameSelfSwitches.setValue([$gameMap.mapId(), event._eventId, 'D'], true);
            QJ.MPMZ.tl.MistilteinnServantDeath.call(event);
            this.setDead();
            return;
        }
        const cast = event._mistilteinnCast;
        if (cast) {
            const target = cast.targetId ? $gameMap.event(cast.targetId) : null;
            const lost = cast.targetId && (!target || target._erased || $gameSelfSwitches.value([cast.mapId, cast.targetId, 'D'])
                || !($gameSelfVariables.value([cast.mapId, cast.targetId, 'HP']) > 0));
            if (cast.resonance && !weaponAwake) QJ.MPMZ.tl.MistilteinnServantFinish(event, true, true);
            else if (lost || event._IsDisabledCounter > 0 || event._IsDisabled || $gameParty.leader().isDead()
                || !$gameMap.getGroupBulletListQJ(cast.group).length) QJ.MPMZ.tl.MistilteinnServantFinish(event);
        } else if (event._mistilteinnCooldown > 0 && SceneManager.isGameActive()) event._mistilteinnCooldown--;
        // 武器唤醒期间自动共鸣；技能结束即接续，不检测玩家攻击，也不等待普通冷却。
        if (resonance && SceneManager.isGameActive()
            && !event._mistilteinnCast && !event._mistilteinnDying && !item._mistilteinnFinishPending
            && !(event._IsDisabledCounter > 0) && !event._IsDisabled
            && !actor.isDead() && !$gameSelfSwitches.value([$gameMap.mapId(), event._eventId, 'D'])) {
            const target = QJ.MPMZ.tl.MistilteinnServantFindTarget($gamePlayer, 300);
            event._mistilteinnCooldown = 0;
            QJ.MPMZ.tl.MistilteinnServantCast.call(event, 'VortexCharge', target, {resonance: true});
        }
        return;
    }
    if (event._mistilteinnCast || event._mistilteinnDying || event._IsDisabledCounter > 0 || event._IsDisabled
        || $gameParty.leader().isDead() || $gameSelfSwitches.value([$gameMap.mapId(), event._eventId, 'D'])) return;
    // 等第三页演出执行完再出招，避免新的技能重新隐藏剑身。
    if (event._commonEventQJ?.some(interpreter => interpreter.pageIndex === 2 && !interpreter.overLifeQJ)) return;
    if (!item._mistilteinnFinishPending && event._mistilteinnCooldown > 0) return;
    if (resonance && !item._mistilteinnFinishPending) return; // 共鸣出招交给逐帧控制器，避免事件页重复施法。
    const target = QJ.MPMZ.tl.MistilteinnServantFindTarget(event, 300);
    if (item._mistilteinnFinishPending) {
        item._mistilteinnFinishPending = false;
        QJ.MPMZ.tl.MistilteinnServantCast.call(event, 'SpinningSlash', target);
        return;
    }
    if (!target) return; // 保持移动路线中的familiarMove，空闲时始终跟随。
    // 唤醒时每两个高级技能穿插一个旧技能；三种高级技能各出现两次。
    const skills = item._mistilteinnAwake
        ? ['SpinningSlash', 'ScatterSwordBeamCluster', 'ForceWave',
            'VortexCharge', 'SpinningSlash', 'MoonlightSlash',
            'ScatterSwordBeamCluster', 'VortexCharge', 'ScarletFork']
        : ['MoonlightSlash', 'ForceWave', 'ScarletFork'];
    const index = item._mistilteinnAwake ? (event._mistilteinnAwakeStep || 0) : (event._mistilteinnNormalStep || 0);
    if (item._mistilteinnAwake) event._mistilteinnAwakeStep = index + 1;
    else event._mistilteinnNormalStep = index + 1;
    QJ.MPMZ.tl.MistilteinnServantCast.call(event, skills[index % skills.length], target);
};

QJ.MPMZ.tl.MistilteinnServantDeath = function () {
    const event = $gameMap.event(this._eventId);
    if (!event || event._mistilteinnDying) return;
    event._mistilteinnDying = true;
    if (event._IsDisabledCounter > 0 || event._IsDisabled) QJ.MPMZ.tl.enemyClearAllAddedStatus.call(event);
    event.cancelMove();
    QJ.MPMZ.tl.MistilteinnServantFinish(event, false);
    const item = $dataArmors[event._mistilteinnArmorId];
    if (item) {
        QJ.MPMZ.tl.MistilteinnServantEquipment(item, 'remove');
        QJ.MPMZ.tl.ex_unequipPlayerSpecifiedEquipment(item, true);
    }
};

//炸弹魔之魂
QJ.MPMZ.tl.ex_bombFiendSoul = function(posX,posY,extraData = {}) {
	
	if (!posX || !posY) {
	  if (!this) return;
	  if (!(this instanceof Game_QJBulletMZ)) return;
    var posX = this.inheritX();
    var posY = this.inheritY();
	}	
	// 飞行道具需要校准坐标
	if (![1,2].includes($gameParty.leader().equips()[0].wtypeId) && !extraData.posFix) {
        posX +=  24 * Math.sin(this.rotationMove*Math.PI/180);
        posY += -24 * Math.cos(this.rotationMove*Math.PI/180);	
	}

	let bombScale = 1;
	if (extraData.scaleFix) {
	    bombScale *= extraData.scaleFix;
	}
	if ($gameParty.leader().hasSkill(33)) {
		bombScale += $gameParty.leader().skillMasteryLevel(33) / 100;
	}
		
	var type = 1;
	var HUE,damage;
    switch(type) {
    case 1:
        HUE = 0;
		damage = 200; 
        break;
    case 2:
        HUE = 171;
		damage = 40; 
        break;
    case 3:
        HUE = 244;
		damage = 40; 
        break;
    default:
        HUE = 0;
		damage = 200; 
        break;
    }
	var animation = QJ.MPMZ.Shoot({
        img:'MGC_W2_Explosion_V4_Lv1[5,10,2]',
        position:[['S',posX],['S',posY]],
		scale:bombScale,
        initialRotation:['S',0],
        imgRotation:['F'],
		opacity:1,
		hue:HUE,
		collisionBox:['C',1],
        moveType:['S',0],
        blendMode:1,
        existData:[	
		   {t:['Time',98]},
        ],
		moveJS:[
		   [12,999,"AudioManager.playSe({ name: 'Explosion2', volume: 80, pitch: 100, pan: 0 })"]
		]
    });
		
    var bombeffect = QJ.MPMZ.Shoot({
		groupName: ['JackBomb', 'explosion'],
        position:[['S',posX],['S',posY]],
		scale:bombScale,
        initialRotation:['S',0],
        imgRotation:['F'],
		opacity:0,
		hue:HUE,
		collisionBox:['C',60],
        moveType:['S',0],
        blendMode:1,
        existData:[	
		{t:['Time',98]},
		{t:['P'],a:['F',QJ.MPMZ.tl.ex_JackBombExplode,[type]],p:[-1,false,true],c:['S','this.time > 12 && this.time < 24']},
		{t:['G',['"enemy"','"object"','isExplodable']],a:['F',QJ.MPMZ.tl.ex_JackBombExplode,[type]],p:[-1,false,true],c:['S','this.time > 12 && this.time < 24']},
		{t:['R',[8,248]],a:['F',QJ.MPMZ.tl.bombInWaterEffect],p:[-1,false,true],cb:['C',1],c:['S','this.time > 12 && this.time < 24']},
        ],       
    });
	
	// 纵火狂手套
	if ($gameParty.leader().hasSkill(33) && !extraData.canTrigger) {
		let chance = 10 + 8 * ($gameParty.leader().skillMasteryLevel(33)/30);
		if (chance > Math.randomInt(100)) {
        bombeffect.addMoveData("F",[24,999,QJ.MPMZ.tl.ex_bombFiendSoul,[null,null,{posFix:true,canTrigger:true}]]);
	  }
	}		
	
};

//芳草心-效果结算
QJ.MPMZ.tl.ex_fragrantGrassRingEffectResolve = function() {
	
	let actor = $gameParty.leader();
	let value = actor.skillMasteryLevel(35);
	let hp = 25;
	if ( value > 0 ) {
	 	hp = ((value*(value + 1)/2)*hp) / value;
	}
	return Math.round(hp);
	
};

//=============================================================================
//环绕物
//=============================================================================

// 初始化环绕物、从者弹幕配置
QJ.MPMZ.tl.bulletConfig = {
  // 毒蛇之拥
  serpentEmbrace: function() {
    let level = 1 + $gameParty.leader().skillMasteryLevel(101);
    let actor = $gameParty.leader();
    let bulletDamage = Math.floor(actor.mat * 0.1) * level;
	let scale = 0.75 + (0.25 * level);
	let chance = 4000 + (level * 2000);
    let poisonDamage = level;
	// 安卓版刀光会报错
	let TrailEffect = [];
    if (!Utils.isMobileDevice()) {
        TrailEffect = [{
        img: ['L', 0.5, 1, 0, 0.999999999, 0.4, 0, 0, 0],
        existTime: 0,
        blendMode: 1,
        alpha: 0.75,
        scale:scale,
        disappearTime: 20,
        imgStretchMode: 0,
        hOrV: true,
        aboveProjectile: true
      }];
    }	
	
	
    return {
      groupName: ['serpentEmbrace', 'surrounds','playerBullet','servant'],
      img: 'armor/armor45',
      moveEllipse: [64, 21],
      rotationSpeed: 3,
      scale: scale,

      existData: [
        {
          t:['G',['"enemy"']],
          a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [
            bulletDamage,
            {
			  magicAttack:true,
              nonPlayerDamage:true,
              orbitingDamage:true,
              noHitEffect:true,
              noDurLoss:true,
              specifyAddedStatus:true,
              addedStatusType:5,
              addedStatusChance:chance,
			  addedStatusDamage:poisonDamage
            }
          ]],
          p: [-1, false, true],
		  c:['S','!$gameMessage.isBusy()']
        }
      ],

      trailEffect: TrailEffect,
      collisionBox: ['C', 8]
    };
  },

  // 愤怒的拳头
  FacePunchGloves: function() {
    let level = 1 + $gameParty.leader().skillMasteryLevel(101);	  
    let actor = $gameParty.leader();
    let bulletDamage = (10 + Math.floor(actor.atk * 0.1)) * level;
	let scale = 0.5 + (0.2 * level);
	let power = level;
    return {
      groupName: ['FacePunchGloves', 'surrounds','servant'],
      img: 'armor/armor46',
      moveEllipse: [72, 32],
      rotationSpeed: 3,
      scale: scale,
      existData: [
        { t: ['G', '"enemy"'], a: ['F', QJ.MPMZ.tl.customPositionKnockbackTarget, [power]], p: [-1, false, true], c:['S','!$gameMessage.isBusy()'] },
        {
          t:['G',['"enemy"']],
		  c:['S','!$gameMessage.isBusy()'],
          a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[ bulletDamage, {nonPlayerDamage:true,orbitingDamage:true, noHitEffect:true, noDurLoss:true, specifyAddedStatus:true,addedStatusType:0} ]],
          p:[-1,false,true]
        },
      ],
      collisionBox: ['C', 16]
    };
  }
};

// 招财猫
QJ.MPMZ.tl.ex_ManekiNeko = function (target, extra = {}, args) {
    const actor = $gameParty.leader();

    // 获取碰撞回调中的实际目标
    const collisionTarget = args && (args.target || args.bulletTarget);

    // 标记被招财猫吸引的掉落物弹幕
    if (extra.pickUp) {
        const bullet = collisionTarget;

        if (!bullet || bullet._ManekiNeko || bullet._ManekiNekoRejected) {
            return;
        }

        bullet._ManekiNeko = true;
        bullet.changeAttribute("moveType", ["TG", 'manekiNeko', 6, 10, 15]);
        // itemGiverCharacter 的物品信息保存在玩家拾取动作中，没有普通掉落物的 itemType/itemId。
        // 沿用该动作及消失效果，保留赠送数量和生成后 30 帧的拾取等待。
        if (bullet.data.itemType === undefined) {
            const pickup = bullet.data.existData.find(detail => detail.t?.[0] === 'P');
            if (pickup) {
                bullet.addExistData({
                    t: ['G', 'manekiNeko'],
                    a: QJ.makeDeepCopy(pickup.a),
                    d: QJ.makeDeepCopy(pickup.d),
                    c: ['S', 'this.time >= 30']
                });
                return;
            }
        }
		// 掉落物生成后的前 40 帧不能拾取。首次接触若发生得太早，回调会直接
		// 返回，因此必须周期性重置接触记录；否则追踪到目标中心后双方不再分离，
		// 这条碰撞规则也就永远没有第二次触发机会。
		bullet.addExistData({
			t:['G', 'manekiNeko'],
			a:['F',QJ.MPMZ.eventDropItemIndicator,[{pickUp:true}]],
			p:[-1,false,true],
			c:['T',0,1,true]
		});
        return;
    }

    // 定时刷新招财猫的探测范围
    if (extra.refreshDetectionRange) {
        if (!this || !actor) {
            return;
        }

        const equipCount = actor
            .equips()
            .filter(equip => equip && equip.baseItemId === 36)
            .length;

        const masteryLevel = 1 + actor.skillMasteryLevel(101);
        const range = Math.round(
            (70 + 40 * masteryLevel) * (1 + equipCount)
        );

        this.data.collisionBox = ["C", range];
        this.refreshBox();
        return;
    }

    // 吸引并拾取物品
    if (extra.attractsItems) {
        const itemEvent = collisionTarget || target;
        const force = extra.force === true;

        if (!(itemEvent instanceof Game_Event)) {
            return;
        }

        if (itemEvent._drawn || (itemEvent.isJumping() && !force)) {
            return;
        }

        const eventId = itemEvent._eventId;
        const variableKey = [$gameMap.mapId(), eventId];
        const itemType =
            $gameSelfVariables.value([...variableKey, "dropsType"]) - 1;

        // 检查武器栏容量
        if (itemType === 1) {
            const weaponLimit =
                actor._weaponAmountLimit + actor._weaponAmountBonus;
            const weaponCount = Object.keys($gameParty._weapons).length;

            if (weaponCount >= weaponLimit) {
                return;
            }
        }

        // 检查装备栏容量
        if (itemType === 2) {
            const armorLimit =
                actor._armorAmountLimit + actor._armorAmountBonus;
            const armorCount = Object.keys($gameParty._armors).length;

            if (armorCount >= armorLimit) {
                return;
            }
        }

        itemEvent._drawn = true;

        const itemId = $gameSelfVariables.value([
            ...variableKey,
            "dropsId"
        ]);

        QJ.MPMZ.itemGiverCharacter(itemType, itemId, eventId, 1);
        $gameMap.clearSpawnEventQJ(eventId);
        return;
    }

    // 生成招财猫
    if (!target || !actor) {
        return;
    }

    const eventId = target._eventId;

    const equipCount = actor
        .equips()
        .filter(equip => equip && equip.baseItemId === 36)
        .length;

    const masteryLevel = 1 + actor.skillMasteryLevel(101);
    const initialRange = Math.round(
        (60 + 40 * masteryLevel) * (1 + equipCount * 0.5)
    );

    const positionX = `
        $gameMap.event(${eventId})
            ? $gameMap.event(${eventId}).screenShootXQJ()
            : $gameMap.displayX()
    `;

    const positionY = `
        $gameMap.event(${eventId})
            ? $gameMap.event(${eventId}).screenShootYQJ()
            : $gameMap.displayY()
    `;

    const deadCode = `
        if (this._needJS) {
            QJ.MPMZ.tl.ex_ManekiNekoDisappear.call(this);
            $gameMap.clearSpawnEventQJ(${eventId});
        }
    `;

    const manekiNeko = QJ.MPMZ.Shoot({
        groupName: ["servant", "manekiNeko"],
        position: [
            ["S", positionX],
            ["S", positionY]
        ],
        initialRotation: ["S", 0],
        imgRotation: ["F"],
        moveType: ["D", false],
        extra: eventId,
        anchor: [0.5, 0.5],
        collisionBox: ["C", initialRange],

        existData: [
            {
                t: [
                    "S",
                    "$gameMap.drill_COET_getEventsByTag_direct('招财猫').length === 0",
                    true
                ],
                a: ["F", QJ.MPMZ.tl.ex_ManekiNekoDisappear],
                c: ["T", 60, 60, true]
            },
            {
                t: ["G", ["drops"]],
                a: [
                    "F",
                    QJ.MPMZ.tl.ex_ManekiNeko,
                    [null, { attractsItems: true }]
                ],
                p: [-1, true, true],
                c: ["T", 0, 60, true]
            },
            {
                t: ["B", ["itemDrops"]],
                a: [
                    "F",
                    QJ.MPMZ.tl.ex_ManekiNeko,
                    [null, { pickUp: true }]
                ],
                p: [-1, true, true],
                c: ["T", 0, 60, true]
            }
        ],

        moveF: [
            [
                60,
                60,
                QJ.MPMZ.tl.ex_ManekiNeko,
                [null, { refreshDetectionRange: true }]
            ]
        ],

        // 无限穿透碰撞也会执行 deadF/deadJS；仅在卸装或事件消失时清理牵引。
        deadJS: [deadCode]
    });

    // 逆咒缚契约
    if (actor.hasSkill(71)) {
        QJ.MPMZ.tl.ex_chainSpellBinding(
            undefined,
            manekiNeko.index
        );
    }
};

// 招财猫消失时，让已被牵引的掉落物停在原地，并允许下次重新吸引。
QJ.MPMZ.tl.ex_ManekiNekoDisappear = function () {
    for (const id of $gameMap.getGroupBulletListQJ('itemDrops')) {
        const bullet = $gameMap.bulletQJ(id);
        if (!bullet || bullet.dead || !bullet._ManekiNeko) continue;

        bullet.changeAttribute('moveType', ['S', 0]);
        bullet._ManekiNeko = false;
        bullet.data.existData = bullet.data.existData.filter(detail =>
            !(detail.t?.[0] === 'G' && detail.t[1] === 'manekiNeko')
        );
    }
};


// 猪猪存钱罐
QJ.MPMZ.tl.ex_piggyBank = function(target) {
    
	if (!target) return;
    let actor = $gameParty.leader(); 
	let eid = target._eventId;
	let level = 1 + $gameParty.leader().skillMasteryLevel(101);
    let equips = actor.equips().filter(equip => equip && equip.baseItemId === 37);
	let range = 180 + (60 * level);

    for (var equip of equips) {
    var tag = "GearBinding" + equip.id; 
	var BName = 'piggyBank' + equip.id; 
    if ($gameMap.drill_COET_getEventsByTag_direct(tag).length == 0) { 
        target.drill_COET_addTag(tag); 
		$gameTemp._drill_COET_needRestatistics = true;
		break;
       }
    }
	
	let posX = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootXQJ() : $gameMap.displayX()`;
	let posY = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootYQJ() : $gameMap.displayY()`;
	let dCode = "if(this._needJS){$gameMap.clearSpawnEventQJ(" + eid + ")}";
	  var piggyBank = QJ.MPMZ.Shoot({
             img:'null1',
		     moveType:['D',false],
			 groupName:['servant','piggyBank',BName],
             position:[['S',posX],['S',posY]],
			 initialRotation:['S',0],
			 imgRotation:['F'],
			 extra:eid,
			 anchor:[0.5,0.55],
             existData:[
			      {t:['S',`$gameMap.event(${eid})`,false]},
                  //{t:['G',['drops']],a:[],p:[-1,true,true,QJ.MPMZ.tl.ex_piggyBankChasingMoney],c:['T',0,30,true]},
				  {t:['B',['money']],a:['F',QJ.MPMZ.tl.ex_piggyBankChasingMoney],p:[-1,true,true],c:['T',0,30,true]},
				  {t:['B',['money']],a:['F',QJ.MPMZ.tl.ex_piggyBankCollectingMoney],p:[-1,true,true,],cb:['C',15]},
				  {t:['F',QJ.MPMZ.tl.ex_piggyBankChaseStep]}
             ],
             collisionBox:['C',range],
			 deadJS:[dCode],
			 deadF:[
			    //[QJ.MPMZ.tl.ex_piggyBankDisappear,[tag]]
			 ]
       });		

		// 逆咒缚契约
		if ($gameParty.leader().hasSkill(71)) {	 
	       let index = piggyBank.index;
		   QJ.MPMZ.tl.ex_chainSpellBinding(undefined, index);		
		}      	 
};

// 猪猪存钱罐-拆卸装备消失
QJ.MPMZ.tl.ex_piggyBankDisappear = function(tag) {
	
	if (!this._needJS) return;
	
    if ($gameMap.drill_COET_getEventsByTag_direct(tag).length > 0) {
	    let eid = $gameMap.drill_COET_getEventsByTag_direct(tag)[0]._eventId;
		$gameMap.clearSpawnEventQJ(eid);
	}
};

// 猪猪存钱罐-追逐金钱(目标锁定)
// 只负责"选目标/换目标"，实际移动由 ex_piggyBankChaseStep 每帧驱动。
// this = 挂在存钱罐身上的探测弹幕；每个碰撞窗口(31帧)对范围内每个 money 弹幕各回调一次。
// (旧版以事件为目标的 'G' 分支已随注释掉的 existData 一并移除，如需恢复见 git 历史)
QJ.MPMZ.tl.ex_piggyBankChasingMoney = function(args) {

	let money = args && args.bulletTarget;
	if (!(money instanceof Game_QJBulletMZ) && !(money instanceof Game_QJLaserMZ)) return;
	if (money.dead) return;
	let piggyBank = $gameMap.event(this.data.extra);
	if (!piggyBank) return;
	if (piggyBank._evolution) return;
	// 追不上而被拉黑的目标，冷却期内不再锁定
	if (this._chaseBlacklist && this.time < this._chaseBlacklist[money.index]) return;

	let mid = piggyBank._chasingMoney;
	if (mid != null) {  // 不能写 if(mid)：弹幕编号可以为0
		let locked = $gameMap.bulletQJ(mid);
		if (locked && !locked.dead) {
			if (mid === money.index) return;
			// 已有锁定目标时，只有候选目标明显更近(70%以内)才换锁，防止在多个目标间来回摇摆
			let lockedFar    = QJ.MPMZ.tl.ex_piggyBankFarToMoney(piggyBank, locked);
			let candidateFar = QJ.MPMZ.tl.ex_piggyBankFarToMoney(piggyBank, money);
			if (candidateFar < lockedFar * 0.7) piggyBank._chasingMoney = money.index;
			return;
		}
		piggyBank._chasingMoney = null;
	}
	piggyBank._chasingMoney = money.index;
	// 跟随逻辑贴脸时会把移速降到0，起追前恢复基础追逐速度
	if (piggyBank._moveSpeed <= 0) piggyBank.setMoveSpeed(12);
};

// 猪猪存钱罐-吸收锚点到金钱中心的像素距离(锚点=探测/吸收弹幕的挂点，事件中心)
QJ.MPMZ.tl.ex_piggyBankFarToMoney = function(piggyBank, money) {
	let dx = money.x - ($gameMap.displayX() * 48 + piggyBank.screenShootXQJ());
	let dy = money.y - ($gameMap.displayY() * 48 + piggyBank.screenShootYQJ());
	return Math.hypot(dx, dy);
};

// 猪猪存钱罐-追逐移动(每帧执行)
// 每帧读取锁定目标的实时坐标并把吸收锚点对准金钱中心，取代旧版"每31帧用一次
// 过期坐标 moveToTarget、到点被跟随逻辑拉回"造成的左右拉锯。
// 到位后直接结算吸收，绕开"首次接触时金钱未满40帧、穿透机会被消耗，
// 此后一直贴着也吸不到"的死锁(见 QJ setDead 的 havePierceCharacters 机制)。
// 以 existData 的 F 型条件挂载，恒返回 false(不触发弹幕死亡)。
QJ.MPMZ.tl.ex_piggyBankChaseStep = function() {

	let piggyBank = $gameMap.event(this.data.extra);
	if (!piggyBank) return false;
	let mid = piggyBank._chasingMoney;
	if (mid == null) return false;
	if (piggyBank._evolution) { piggyBank._chasingMoney = null; return false; }
	let money = $gameMap.bulletQJ(mid);
	if (!money || money.dead) { piggyBank._chasingMoney = null; return false; }
	if (piggyBank.isJumping()) return false;

	let far = QJ.MPMZ.tl.ex_piggyBankFarToMoney(piggyBank, money);

	// 已进入吸收范围：金钱落地满40帧就直接结算；未满则原地守着等，不反复起步
	if (far <= 15) {
		if (money.time >= 40) {
			QJ.MPMZ.tl.ex_piggyBankCollectingMoney.call(this, {bulletTarget: money});
			piggyBank._chasingMoney = null;
			this._chaseWatchMid = null;
		}
		return false;
	}

	// 看门狗：持续2秒毫无接近(被墙/玩家挡住等)就放弃该目标并拉黑5秒，交还给跟随逻辑
	if (this._chaseWatchMid !== mid) {
		this._chaseWatchMid = mid;
		this._chaseWatch    = 0;
		this._chaseBestFar  = far;
	}
	if (far < this._chaseBestFar - 4) {
		this._chaseBestFar = far;
		this._chaseWatch   = 0;
	} else if (far > this._chaseBestFar + 48) {
		// 目标被重新抛掷/大幅移动(如 positionCheck 换落点)，以新距离为基准重新计时，防误拉黑
		this._chaseBestFar = far;
		this._chaseWatch   = 0;
	} else if (++this._chaseWatch >= 120) {
		this._chaseBlacklist = this._chaseBlacklist || {};
		this._chaseBlacklist[mid] = this.time + 300;
		piggyBank._chasingMoney = null;
		this._chaseWatchMid = null;
		return false;
	}

	// 目标点扣除锚点相对事件坐标原点的偏移(通常为半格)，让锚点正好落在金钱中心，
	// 而不是旧版那样把事件原点开到金钱中心、锚点瞄偏半格导致到点吸不到
	let offX = $gameMap.displayX() + piggyBank.screenShootXQJ() / 48 - piggyBank._realX;
	let offY = $gameMap.displayY() + piggyBank.screenShootYQJ() / 48 - piggyBank._realY;
	piggyBank.moveToTarget(money.x / 48 - offX, money.y / 48 - offY);
	return false;
};

// 猪猪存钱罐-吸收金钱
QJ.MPMZ.tl.ex_piggyBankCollectingMoney = function(args) {

    if (args.bulletTarget instanceof Game_QJBulletMZ || args.bulletTarget instanceof Game_QJLaserMZ) {
		let eid = this.data.extra;
		let piggyBank = $gameMap.event(eid);
		if (!piggyBank) return;
		if (args.bulletTarget.time < 40) return;
		let soundName = "ANIMAL-PIG-Grunt-" + Math.randomInt(3); 
		AudioManager.playSe({name: soundName, volume: 90, pitch: 100, pan: 0}); 
		
		piggyBank.drill_EASe_stopAct();
		
		if (piggyBank.drill_COET_hasTag("贪欲存钱罐")) {
		    piggyBank.drill_EASe_setSimpleStateNode( ["变身待机"] );
	        piggyBank.drill_EASe_setAct( "捡金币2" );			
		} else {
	        piggyBank.drill_EASe_setAct( "捡金币" );			
		}
		setTimeout(() => {
		   let soundName = "ANIMAL-PIG-Grunt-" + Math.randomInt(3); 
		   AudioManager.playSe({name: soundName, volume: 90, pitch: 100, pan: 0}); 	
        }, 330);		
        AudioManager.playSe({ name: "レジスターで精算", volume: 80, pitch: Math.randomInt(30) + 91, pan: 0 });
		let itemId = args.bulletTarget.data.itemId;
		let money  = $dataItems[itemId];
		if (!money) return;
		let price = money.price;
		let deposit = $gameSelfVariables.value([1, 110, 'deposit']);
		// 增加总存款
		$gameSelfVariables.setValue([1, 110, 'deposit'], deposit + price);
		// 额外计算单个存钱罐存款	
	    let tags = piggyBank._drill_COET_tag || [];
	    for (let tag of tags) {
		   let match = tag.match(/^GearBinding(\d+)$/); 
		   if (match) { 
		       let extractedNumber = parseInt(match[1], 10); 
			   let depositIndex    = "deposit" + extractedNumber; 
			   let singleValue     = $gameSelfVariables.value([1, 110, depositIndex]);
			   singleValue += price;
			   $gameSelfVariables.setValue([1, 110, depositIndex], singleValue);
			   break;   
			}  
		}		
		
		let ownerEid = args.bulletTarget.data.ownerEid;
		$gameMap._backUpSpawnEventDataQJ = $gameMap._backUpSpawnEventDataQJ || {};
		delete $gameMap._backUpSpawnEventDataQJ[ownerEid];
		args.bulletTarget.setDead({t:['Time', 0], d:[1, 20, 1.5]});
		// 吃掉的正是锁定目标时立刻解锁，让追逐逻辑马上能选下一个
		if (piggyBank._chasingMoney === args.bulletTarget.index) piggyBank._chasingMoney = null;

	    if ( piggyBank.drill_COET_hasTag("贪欲存钱罐") ) return;
        // 猪猪存钱罐进化
        if ( deposit + price >= 1000000 ) {
		    piggyBank._evolution = true;
		    $gameSelfSwitches.setValue([$gameMap.mapId(), piggyBank._eventId, 'B'], true); 
	    }		
		return;
	}
	
};

// 猪猪存钱罐-失去存款
QJ.MPMZ.tl.ex_piggyBankLosesMoney = function(target) {
    if (!target) return;
    let eid = target._eventId;
    let tags = target._drill_COET_tag || []; 
    let extractedNumber = null;
    for (let tag of tags) {
        let match = tag.match(/^GearBinding(\d+)$/); 
        if (match) {
            extractedNumber = parseInt(match[1], 10); 
            break; // 只提取第一个匹配项
        }
    }	

    // 猪猪存钱罐物品破碎
    let armor = $dataArmors[extractedNumber];
    QJ.MPMZ.tl.ex_unequipPlayerSpecifiedEquipment(armor);
    // 累计被摧毁的次数
    $gameSelfVariables.addValue([1, 111, 'KillCount'], 1);
    // 失去存款
    let totalDeposit = $gameSelfVariables.value([1, 110, 'deposit']);  
    let depositIndex = "deposit" + extractedNumber;
    let deposit = $gameSelfVariables.value([1, 110, depositIndex]); 
    totalDeposit -= deposit;
    $gameSelfVariables.setValue([1, 110, depositIndex], 0);
	$gameSelfVariables.deleteValue([1, 110, depositIndex]);
    $gameSelfVariables.setValue([1, 110, 'deposit'], totalDeposit);
	let lossRate = (20 + Math.randomInt(30)) / 100;
	deposit = Math.floor(deposit * ( 1 - lossRate ));

    QJ.MPMZ.tl.spawnMoneyDropsByAmount(deposit, eid);

    // 消灭绑定子弹	
    let BName = 'piggyBank' + extractedNumber; 
    QJ.MPMZ.deleteProjectile(BName,{});		
};

// 根据金额按照钞票面值生成掉落物
QJ.MPMZ.tl.spawnMoneyDropsByAmount = function(amount, target = -1) {
    
	let string = "$gamePlayer";
    if (target < 0) {
		target = $gamePlayer;
	}
    if (target > 0) {
		string = `$gameMap.event(${target})`;
		target = $gameMap.event(target);
	}
    if (!target) return;

    function splitDeposit(deposit) {
        // 递减顺序的大额优先面值
        const coinValues = [50000, 10000, 5000, 1000, 500, 100, 50, 10];
        let result = [];

        for (let coin of coinValues) {
            let c = Math.floor(deposit / coin);
            if (c > 0) {
                result.push({ coinValue: coin, count: c });
                deposit -= c * coin;
            }
        }
        return result;
    }
	
    function coinValueToItemId(coinValue) {

        let coinArr = [10, 50, 100, 500, 1000, 5000, 10000, 50000];
        let index = coinArr.indexOf(coinValue); 
        // 找到后 itemId = index + 4
        if (index >= 0) {
            return index + 4;
        }
        return 6; 
    }

    let pieces = splitDeposit(amount); 
    // 例如 deposit=12400 => pieces=[ {coinValue:10000,count:1},{coinValue:1000,count:2},{coinValue:100,count:4} ]
    for (let piece of pieces) {
        let coinValue = piece.coinValue;
        let c = piece.count;
        if (c <= 0) continue;

        // 获取 itemId
        let itemId = coinValueToItemId(coinValue);
        QJ.MPMZ.Shoot({
            position:[['P'],['P']],
            initialRotation:['S',0],
            imgRotation:['F'],
            collisionBox:['C',1],
            moveType:['S',0],
            existData:[	
                { t:['S',`${string}`,false] },
				{ t:['Time',c]},
            ],
            moveJS:[
                [1,0,`
                   dingk.Loot.getMapDrops(${string}, $dataItems[${itemId}]);
                `],
                [1,0,"AudioManager.playSe({ name: 'Heal1', volume: 40, pitch: 130, pan: 0 })"],
            ]
        });
    }		
};

// 黄金猪猪存钱罐-光环效果 
QJ.MPMZ.tl.ex_piggyBankGoldenHalo = function(target) {
	
    let actor = $gameParty.leader(); 
	let eid = target._eventId;
	let level = 1 + $gameParty.leader().skillMasteryLevel(101);
    let equips = actor.equips().filter(equip => equip && equip.baseItemId === 37);
	let scale = 1 + (level * 0.25);
	
    for (let equip of equips) {
    let tag = "GearBinding" + equip.id; 
	var BName = 'goldenPiggyBank' + equip.id; 
    if ($gameMap.drill_COET_getEventsByTag_direct(tag).length == 0) { 
        target.drill_COET_addTag(tag); 
		$gameTemp._drill_COET_needRestatistics = true;
		break;
       }
    }
	
    let posX = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootXQJ() : $gameMap.displayX()`;
    let posY = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootYQJ() : $gameMap.displayY()`;
	let dCode = "if(this._needJS){$gameMap.clearSpawnEventQJ(" + eid + ");$gameActors.actor(1).removeState(116);}";
	  var piggyBank = QJ.MPMZ.Shoot({
             img:'Light4[5,6,4]',
		     moveType:['D',true],
			 groupName:['servant','MamonAura','goldenPiggyBank',BName],
             position:[['S',posX],['S',posY]],
			 initialRotation:['S',0],
			 imgRotation:['F'],
			 extra:eid,
			 scale:scale,
			 blendMode:1,
			 opacity:0.75,
			 z:"E",
			 anchor:[0.5,0.52],
             existData:[
			      {t:['S',`$gameMap.event(${eid})`,false]},
				  {t:['B',['money']],a:['F',QJ.MPMZ.tl.ex_piggyBankChasingMoney],p:[-1,true,true],c:['T',0,30,true],cb:['C',240]},
				  //{t:['G',['drops']],a:['F',QJ.MPMZ.tl.ex_piggyBankChasingMoney],p:[-1,true,true],c:['T',0,30,true]},
				  {t:['B',['money']],a:['F',QJ.MPMZ.tl.ex_piggyBankCollectingMoney],p:[-1,true,true,],cb:['C',15]},
				  {t:['F',QJ.MPMZ.tl.ex_piggyBankChaseStep]}
             ],
             collisionBox:['C',80],
			 moveF:[
			    [4,30,QJ.MPMZ.tl.ex_auraMamonsDemand],
				[300,600,QJ.MPMZ.tl.ex_piggyBankGenerateInterest],
			 ],
			 deadJS:[
			      dCode
			 ]
       });
		// 逆咒缚契约
		if (actor.hasSkill(71)) {	 
	       let index = piggyBank.index;
		   QJ.MPMZ.tl.ex_chainSpellBinding(undefined, index);		
		}	   		
};

// 玛门的索取
QJ.MPMZ.tl.ex_auraMamonsDemand = function() {
	
	let check = QJ.MPMZ.getBulletNumberBM(-1,['C',15],["MamonAura"]);
	if (check > 0) {
		$gameActors.actor(1).addState(116);
	} else {
		$gameActors.actor(1).removeState(116);
	}
	
};

// 贪欲存钱罐-吐利息
QJ.MPMZ.tl.ex_piggyBankGenerateInterest = function() {
	
    let eid = this.data.extra;
	let target = $gameMap.event(eid);
	if (!target) return;
	
	let totalDeposit = $gameSelfVariables.value([1, 110, 'deposit']);
 	    totalDeposit *= (1 + 0.5 * $gameParty.leader().skillMasteryLevel(101));
	let interest = Math.floor(totalDeposit * 0.00015);
	if (interest < 10) return;
    if (interest > 1000000) {
        const overflow = interest - 1000000;
        $gameSelfVariables.addValue([1, 110, 'deposit'], overflow);
        interest = 1000000;
    }
    QJ.MPMZ.tl.spawnMoneyDropsByAmount(interest, eid);
};


// 萨卡班甲鱼回旋攻击
QJ.MPMZ.tl.SacabambaspisCycloneJetCannon = function(initialize,args) {
  if (initialize === "attract") {
     const target = args && args.target;
     if (!(target instanceof Game_Event)) return;
     const eventId = target.eventId();
     const fudou = $gameSelfVariables.value([$gameMap.mapId(), eventId, 'fudou']);
     if (!$gameMap.event(eventId) || fudou > 80) return;

     const targetX = target.screenBoxXShowQJ();
     const targetY = target.screenBoxYShowQJ();
     const posX = this.inheritX();
     const posY = this.inheritY();
     const angle = QJ.calculateAngleByTwoPointAngle(targetX, targetY, posX, posY);
     if (Number.isNaN(angle)) return;
     // 每帧最多吸引 8 像素，不依赖敌人移速；接近中心时缩短距离，避免越过中心。
     const distance = Math.min(8, Math.hypot(posX - targetX, posY - targetY)) / $gameMap.tileWidth();
     target.mover().dotMoveByDeg(new DotMoveSystem.Degree(angle), distance);
     target._dotMovingCounter = 5;
     return;
  }
  
  if (initialize && initialize === "damage") { 
     let posX   = this.inheritX();
     let posY   = this.inheritY();
	 let scale  = this.scaleX;
 	 let damage = 5;
	 damage    += Math.randomInt(this.data.extraDamage);
	 //const rotDeg = Number.isFinite(this.rotationMove) ? this.rotationMove : 0;
	 //posX += 24 * Math.sin(rotDeg * Math.PI / 180);
	 //posY += -24 * Math.cos(rotDeg * Math.PI / 180);
	 let randomSeArray = ["軽いパンチ1","軽いパンチ2"];
	 let randomSe = randomSeArray[Math.floor(Math.random() * randomSeArray.length)];
	 AudioManager.playSe({ name: randomSe, volume: 80, pitch: 80 + Math.randomInt(40), pan: 0 });
	 // 撞墙演出
     QJ.MPMZ.Shoot({
          img: "animehit[5,4]",
          initialRotation: ['S', Math.randomInt(360)],
          position: [['S', posX], ['S', posY]],
          scale: scale,
          moveType: ['S', 0],
          opacity: 1,
          blendMode: 0,
          z: "E",
          existData: [
    	    { t: ['Time', 19] }
    	  ]
     });	 
	 // 撞击到目标后减速
	 if (!this._collided) {
		 this._collided = true;
		 this.changeAttribute('moveType',['S', '0|7~10/0~999/0']);
	 }
	 // 伤害结算；吸附由独立的每帧碰撞判定处理。
     const target = args && args.target;
     if (!(target instanceof Game_Event)) return;
	 QJ.MPMZ.tl.ex_toEnemyAttack.call(this, damage,{nonPlayerDamage:true,orbitingDamage:true,noHitEffect:true,noDurLoss:true,specifyAddedStatus:true,addedStatusType:0}, args);
	 
     return;
  }

  if (initialize && initialize === "shoot") {
	  // 发射鱼雷
	 $gameMap.steupCEQJ(140,1,{throwObject:true});
     let posX        = this.inheritX();
     let posY        = this.inheritY();
	 let scale       = this.scaleY;
	 let extraDamage = 5 + $gameParty.leader().skillMasteryLevel(101) * 5;
	    extraDamage += 7 * (this.data.servantLevel || 1);
	 AudioManager.playSe({ name: "Explosion1", volume: 70, pitch: 150, pan: 0 });
     QJ.MPMZ.Shoot({
        img:"Sacabambaspis_attack[4,4]",
		groupName: ['Sacabambaspis'],
		position:[['S',posX],['S',posY]],
        initialRotation:['M'],
		imgRotation:['F'],
        moveType:['S','0|10~40/7~999/7'],
        scale:scale,
		extraDamage: extraDamage,
		aid: this.data.aid,
		collisionBox:['R', 16, 48],
		anchor:[0.5,0.5],
		z: 500,
        existData:[
		    {t:['Time', 180],a:['F',QJ.MPMZ.tl.SacabambaspisCycloneJetCannon,["crash"]]},
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.SacabambaspisCycloneJetCannon,["damage"]],p:[-1,false,true],c:['T',0,4,true]},
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.SacabambaspisCycloneJetCannon,["attract"]],p:[-1,false,true],c:['T',1,1,true]},
        ],
		moveJS:[
		    [4,4,`if (!this._collided) {
				    let xx = this.x / 48;
					let yy = this.y / 48;
				    let regionId = $gameMap.regionId( xx, yy );
					if ([255].includes(regionId)) {
						this._collided = true;
						this.changeAttribute('moveType',['S', 0]);
					}
			     }
		    `]
		]
     });
     return;
  }

  if (initialize && initialize === "crash") {
	  
     // 动作重置
	 if ( $gameMap.getGroupBulletListQJ('SacabambaspisCycloneJetCannon').length <= 1 ) {		 
	   if ($gamePlayer._drill_EASe_controller && $gamePlayer._drill_EASe_controller._drill_curBitmapName.includes("lift")) {
		   setTimeout(() => $gamePlayer.drill_EASA_setEnabled( true ), 200);
	   }
	 }
	 
	 // 考虑玩家有没有临时拆掉装备
     let lives = $gameMap.drill_COET_getEventsByTag_direct("萨卡班甲鱼").length;
	 let equipped = 0;
	 const eqs = $gameParty.leader().equips();
     for (let i = 1; i < eqs.length; i++) {
        const a = eqs[i];
        if (a && DataManager.isArmor(a)) {
          const baseId = (typeof a.baseItemId === 'number') ? a.baseItemId : a.id; 
          if (baseId == 44) equipped += 1;
        }
     }	 
	 if (lives >= equipped) return;
     this.changeAttribute('opacity',0);	  
     let XX  = this.x / 48;
     let YY  = this.y / 48;
	 let eid = $gameMap.spawnEventQJ(1,56,XX,YY,false);
	 let e   = $gameMap.event(eid);
	 if (!e) return;
	 let aid = this.data.aid;
     let tag = "bindArmor" + aid;
	 e.servantLevel = $dataArmors[aid].servantLevel || 1;
     e.drill_COET_addTag(tag);
     let condition = DrillUp.g_COFA_condition_list[10];
     let c_area = $gameMap.drill_COFA_getShapePointsWithCondition(Math.floor(XX), Math.floor(YY), "圆形区域", 3, condition);	 
        if (c_area.length > 0) {
                let p = c_area[Math.floor(Math.random() * c_area.length)];
                let xPlus = p.x - XX;
                let yPlus = p.y - YY;
                e.jump(xPlus, yPlus);
            } else {
                e.jump(0, 0);
        }	 
	 AudioManager.playSe({ name: "Jump2", volume: 80, pitch: 80 + Math.randomInt(40), pan: 0 });	 
	 
     return;
  }

  if (initialize && initialize === "start") {
	 // 举物动作 
	 $gameMap.steupCEQJ(140,1,{liftObject:true}); 
     let posX         = "$gamePlayer.screenBoxXShowQJ()";
	 let fixY         = 24 + (this._Drill_ECE.scale_x * 18);
	 let posY         = "$gamePlayer.screenBoxYShowQJ()-" + fixY; 	
	 let scale        = 1 + this._Drill_ECE.scale_x;
	 let scaleX       = scale;
	 let servantLevel = this.servantLevel || 1;
     let cur_dir      = this.direction();
	 if (cur_dir     == 2 || cur_dir == 4) scaleX = -scale;
	 // 捕获装备ID
	 const tags = this._drill_COET_tag || [];
     let ItemId = null;
     for (var i = 0; i < tags.length; i++) {
       let t = String(tags[i]);
       let m = t.match(/bindArmor\s*(\d+)/);
       if (m) { ItemId = Number(m[1]); break; }
     }
     QJ.MPMZ.Shoot({
        img:"Sacabambaspis",
		groupName: ['SacabambaspisCycloneJetCannon'],
		position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
		imgRotation:['S',0],
        moveType:['D',true],
        scale:[scaleX,scale],
		collisionBox:['C', 1],
		servantLevel: servantLevel,
		anchor:[0.5,0.5],
		aid: ItemId,
		z: 500,
        existData:[
		    {t:['S','TouchInput.drill_isLeftPressed()',true],a:['F',QJ.MPMZ.tl.SacabambaspisCycloneJetCannon,["shoot"]]},  
			{t:['S','TouchInput.drill_isRightPressed()||$gamePlayer.drill_EFOE_isPlaying()',true],a:['F',QJ.MPMZ.tl.SacabambaspisCycloneJetCannon,["crash"]]}, 
        ],
		moveJS:[
		    
		]
     });
      return;	  
  }

  if (initialize && initialize === "summon") {
	  let XX = $gamePlayer._x;
      let YY = $gamePlayer._y;
	  let eid = $gameMap.spawnEventQJ(1,56,XX,YY,false);
	  let e   = $gameMap.event(eid);
	  if (!e) return;
	  let condition = DrillUp.g_COFA_condition_list[10];
      let c_area = $gameMap.drill_COFA_getShapePointsWithCondition(Math.floor(XX), Math.floor(YY), "圆形区域", 3, condition);
        if (c_area.length > 0) {	  
		   let p = c_area[Math.floor(Math.random() * c_area.length)];
		   e.locate(p.x, p.y);
		}
	  let tag = "bindArmor" + this.id;
	  e.servantLevel = this.servantLevel || 1;
      e.drill_COET_addTag(tag);
      return;	  
  }
  
  if (initialize && initialize === "listener") {	  
	  if (!this) return;
	  this._Drill_ECE = this._Drill_ECE || {};
	  let servantLevel = this.servantLevel || 1;
	  let level = $gameParty.leader().skillMasteryLevel(101) + (this.servantLevel - 1);
	  // 适配王权征令
	  this._Drill_ECE.scale_x = 0.25 * level;
      this._Drill_ECE.scale_y = 0.25 * level;
      this._Drill_ECE.playing_type = "王权征令";
	  // 生成影子
	  let OffsetY = 3; 
	  let scale   = 0.9;
	  scale      *= (1 + this._Drill_ECE.scale_x);
	  OffsetY    -= this._Drill_ECE.scale_x  * 16;
	  QJ.MPMZ.tl.ex_objectShadowGeneration.call(this,0,OffsetY,scale);
	  // 事件碰撞体设置
	  let width   = 1 + (0.25 * level);
	  let height  = 0.5 + (0.125 * level);
	  this.setWidth(width);
	  this.setHeight(height);
	  this.setOffsetX(0.125 * level);
	  this.setOffsetY(-0.5 + 0.1 * level);
	  // 移动方式设定
	  this.setDpf(0.05);
      this.setAcc(40, 3);
      this.setInertia(0.5);	  
	  // 子弹碰撞体设置
	  setTimeout(() => {
		  let range = 8 + level * 2;
		  let ox    = 5 * level;
		  let oy    = -15 + 2 * level;;
		  this.changeCBQJ(['C',range],ox,oy);
	  // 从者监听器
	  let eid   =  this._eventId;
      let posX  = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootXQJ() : $gameMap.displayX()`;
      let posY  = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootYQJ() : $gameMap.displayY()`;
	  let sCode = `$gameMap.steupCEQJ(205, ${eid}, {deadType:2})`;
	  let dCode = "if(this._needJS){$gameMap.clearSpawnEventQJ(" + eid + ")}";
	  let Sacabambaspis = QJ.MPMZ.Shoot({
		     moveType:['D',false],
			 groupName:['servant','Sacabambaspis',`Sacabambaspis${eid}`],
             position:[['S',posX],['S',posY]],
			 initialRotation:['S',0],
			 imgRotation:['F'],
			 extra:eid,
			 anchor:[0.5,0.5],
             existData:[
			      {t:['S',`!$gameMap.event(${eid})`,true], c:['T',10,10,true]},  
			      {t:['S',`$gameSelfSwitches.value([$gameMap.mapId(), ${eid}, 'D'])`,true], c:['T',10,10,true]},  
				  {t:['S',`$gameMap.event(${eid}) && !$gameMap.event(${eid}).isJumping() && $gameMap.regionId( $gameMap.event(${eid}).centerRealX(), $gameMap.event(${eid}).centerRealY() ) === 8
				  `,true], a:['S', sCode], c:['T',20,20,true]}, 
             ],
			 moveF: [	
			 ],
             collisionBox:['C',2],
			 deadJS:[dCode],
       });
	   
		// 逆咒缚契约
		if ($gameParty.leader().hasSkill(71)) {	 
	       let index = Sacabambaspis.index;
		   QJ.MPMZ.tl.ex_chainSpellBinding(undefined, index);		
		}
      }, 400);		
      return;	  
  }  
};


// 玩家通过铁砧修复武器/打铁
QJ.MPMZ.tl.playerRepairWeaponWithAnvil = function(initialize) {
	
   // 刷新武器温度和锻造情况
   if (initialize && initialize === "refresh") { 
       this._residualHeat = this._residualHeat || 0;
	   let durMax = this.data.durMax;
	   let ratio = this._residualHeat / durMax;
	   let Heat = 0;
	   if (ratio > 0) {
		   Heat = Math.round(ratio * 255);
		   Heat = Math.min(255, Heat);
		   this._residualHeat -= 8;
		   if (ratio > 0.8)  this._residualHeat -= 14;
		   if (ratio > 0.4)  this._residualHeat -= 10;
		   this._residualHeat = Math.max(0, this._residualHeat);
	   }
	   if (Heat <= 0) return;
	   this.changeAttribute('tone', [Heat, 0, 0, 0]);
	   // 温度恢复、结束过热效果
       if (ratio < 0.8 && this._smoke) {
           this._smoke = false;
		   $gameScreen._particle.reservePluginCommand(20,{},['clear', 'smoke_c-A'],0);
		   AudioManager.playSe({ name: "シューという火が消える時のSE", volume: 60, pitch: 100, pan: 0 });
	   }		   
	   return;
   }
   // 敲打武器的演出
   if (initialize && initialize === "repair") {
       AudioManager.playSe({name: "Hammer",volume: 65,pitch: Math.randomInt(100) + 50,pan: 0});
	   let actor = $gameParty.leader();
  	   let eid = this.data.eid;
	   let wid = this.data.weapon;
	   let index = Math.randomInt(9999);
	   let tag = "tag:event" + index;
	   let xx = -5 + Math.randomInt(10);
       let yy = -30 + Math.randomInt(10);
       $gameScreen._particle.particleGroupSet(eid, `smithHit_cp-${index}`, `event:${eid}`, tag, "smithHit_cp");      
       setTimeout(() => $gameScreen._particle.pluginCommand(null, ['update', tag, 'pos', String(xx), String(yy)], eid), 20);
	   //let distance = 1 + Math.randomInt(2);
	   //this.addTimelineEffect('S',[Math.randomInt(360),distance,4]); 
       this._residualHeat = this._residualHeat || 0;
	   let damage = chahuiUtil.getVarianceDamage(1);
	   if (actor.hasSkill(45)) {
	     let ratio = actor.skillMasteryLevel(45) / 100;
         let extra = Math.round(ratio * chahuiUtil.getVarianceDamage(2));
         damage += extra;		 
	   }
	   this._residualHeat += damage;
	   const dx2 = 15 - Math.randomInt(30);
	   const durMax = this.data.durMax;
	   SimpleMapDamageQJ.put(1, eid, damage, dx2, -68);
	   // 武器过热-失去打磨效果
	   if (this._residualHeat >= durMax && !this._smoke) {
		 $gameScreen._particle.particleSet(0,'smoke_c-A',`event:${eid}`,'smoke_c');	
         $gameScreen._particle.particleUpdate(['smoke_c-A','pos',0,-40]);
		 AudioManager.playSe({ name: "Fire2", volume: 60, pitch: 100, pan: 0 });
         this._smoke = true;		 
	   }
	   // 获得耐久度奖励	   
	   if (!this._smoke) {
		 let ratio = this._residualHeat / durMax;   
		 let dur = Math.randomInt(3);
		 if (ratio > 0.8) dur += Math.randomInt(5);
		 if (ratio > 0.4) dur += Math.randomInt(5);
		 if (dur > 0) {
			if ($dataWeapons[wid].durability >= durMax)  return;
		    $dataWeapons[wid].durability += dur;
			let heal = "+" + dur;
			let index = this.index;
            QJ.MPMZ.Shoot({
                img: ['T', heal, 0, '#06ff00', 12],
                position: [['B',index], ['B',index]],
                initialRotation: ['S', 0],
                imgRotation: ['F'],
                opacity: '0|1~90/0',
                moveType: ['S', '0|1~90/0.1~999/0.1'],
                existData: [{ t: ['Time', 90] }]
            });			
		 }
	   }	   
	   return;
   }
   // 召唤铁砧
   if (initialize && initialize === "summon") {
	   
     let failed = false;
	 let weapon = $gameParty.leader().equips()[0];
     let wtype  = weapon.wtypeId;	 
	 // 无法修理魔法武器和美食武器
	 if (wtype >= 4)  failed = true;
	 if ($gameParty.leader().hasSkill(81))  failed = true;
	 if (weapon.traits && weapon.traits[0].dataId === 2 )  failed = true;
	 // 可能遇到的锻造锤问题
	 if (weapon.baseItemId && weapon.baseItemId === 22 )  failed = true;
	 // 无法修理史诗武器
	 if (weapon?.meta?.颜色 == "13")  failed = true;
	 
	 if (failed) {
		QJ.MPMZ.tl.ex_chahuiExpressWarning(6);
        return;		
	 }
	 
     let xx = (this.x - 25) / 48;
     let yy = (this.y + 60) / 48;
     let code = `$gameMap.spawnEventQJ(1,21,${xx},${yy},true)`;
	 // 铁砧召唤环境判定
	 QJ.MPMZ.Shoot({
        position: [['P'], ['P']],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        moveType: ['S', 0],
        anchor: [0.5, 0.5],
        collisionBox:['S', 120, 45, 90],
        existData: [
		   {t:['Time',4], a:['S', code]},
		   {t:['G',['"enemy"','"object"']],a:['S',"QJ.MPMZ.tl.ex_chahuiExpressWarning(5)"]},
		   {t:['NP'], a:['S', "QJ.MPMZ.tl.ex_chahuiExpressWarning(5)"],cb:['C',32]},
        ],
     });
	
     return;
   }
   // 移除铁砧
   if (initialize && initialize === "remove") {
     let list = $gameMap.getGroupBulletListQJ('Anvil');
	 if (list > 0) {
		 let bid = list[0];
		 let bullet = $gameMap._mapBulletsQJ[bid];
		 if (!bullet || !bullet.data) return;
		 let eid = bullet.data.eid;
		 let wid = bullet.data.weapon;		 
		 // 确保锻造锤被替换
		 let actor = $gameParty.leader();
		 if (!actor.equips()[0] || actor.equips()[0].baseItemId == 22) {
			 actor.changeEquipById(1, 4);
		 }
		 QJ.MPMZ.deleteProjectile('Anvil');
		 $gameMap.clearSpawnEventQJ(eid);
		 let weapon = $dataWeapons[wid];
		 if (weapon) {
			 $gameParty.gainItem(weapon, 1);			 
			 let weapons = $gameParty.allItems().filter(function(item) {
			     return item && DataManager.isWeapon(item) && item.baseItemId === 22;
			 });
			 weapons.forEach(function(w) {
    			 $gameParty.loseItem(w, 1);
			 });
			 // 移除特定状态并更新武器图像
			 QJ.MPMZ.tl.ex_playerWeaponImage(true);
		 }

	 }
     return;
   }   

   if (initialize && initialize === "start") {
	 // 放置铁砧和放置武器  
     AudioManager.playSe({name: "Hammer",volume: 75,pitch: Math.randomInt(60) + 70,pan: 0});	   
	 let weapon = $gameParty.leader().equips()[0];
     let weaponImage = "weapon/weapon" + weapon.baseItemId; 
     let eid = this._eventId;
     let posX = $gameMap.event(eid).screenBoxXShowQJ();
     let posY = $gameMap.event(eid).screenBoxYShowQJ() - 15;	 
     let Anvil = QJ.MPMZ.Shoot({
        img:weaponImage,
		groupName: ['Anvil'],
		position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
		imgRotation:['F',-45],
        moveType:['S',0],
        scale:0.8,
		collisionBox:['R',2,32],
		weapon: weapon.id,
		eid: eid,
		z: 5,
		durMax: weapon.durMax,
        existData:[
           {t:['B',['playerSkill']], a:['F', QJ.MPMZ.tl.playerRepairWeaponWithAnvil, ["repair"]], p:[-1,false,true]},
        ],
		moveF:[
		   [16,16,QJ.MPMZ.tl.playerRepairWeaponWithAnvil, ["refresh"]]
		]
     });
     // 隐藏并替换武器
	 $gameParty.leader().changeEquipById(1, 22);
     $gameParty.loseItem(weapon, 1);
     // 移除特定状态并更新武器图像
     $gameParty.leader().removeState(62);
     QJ.MPMZ.tl.ex_playerWeaponImage(true);
	 // 标记事件
	 $gameSelfVariables.setValue([$gameMap.mapId(), eid, 'weaponId'], weapon.id);
     return;	 
   }
   
   // 检查铁砧召唤环境
   if (initialize && initialize === "environmentCheck") {
      if (!this)  return;
	  // 正在水里
	  if ( $gameParty.leader()._characterName == "$player_swim" ) {
		  QJ.MPMZ.tl.ex_chahuiExpressWarning(4);
		  return false;
	  }	  
	  // 系统忙碌状态
	  if ( !$gameSwitches.value(3) || $gameSwitches.value(14) ) {
		  QJ.MPMZ.tl.ex_chahuiExpressWarning(2);
		  return false;
	  }
	  // 正在举物
	  if ( $gamePlayer._drill_PT_is_lifting ) {
		  QJ.MPMZ.tl.ex_chahuiExpressWarning(3);
		  return false;
	  }
       return true;	  
   }	   
};


// 红色的角/红色有角三倍速
QJ.MPMZ.tl.redHornRecharge = function (extra = {}) {
	
    if (extra.listener) {
      if ($gameMap.getGroupBulletListQJ('redHorn').length > 0) return		
      QJ.MPMZ.Shoot({
		groupName: ['redHorn'],
		position:[['S',0],['S',0]],
        moveType:['S',0],
        existData:[
           {t:['S',"!$gameParty.leader().hasSkill(68)",true]},
        ],
		moveF:[
		   [30,5,QJ.MPMZ.tl.redHornRecharge, [{update:true}]]
		]
     }); 
     return;	 
	}
	
	if (extra.update) {
		
	  this._coolDown = this._coolDown || 0;	
	  if (this._coolDown > 0) {
	     this._coolDown -= 1;
	     return;
	  }
	  
	   const leader = $gameParty.leader();
	   if (leader.hasSkill(68) && leader.skillMasteryUses(68) < 3 ) { 
		   AudioManager.playSe({ name: "Flash1", volume: 60, pitch: 130, pan: 0 });
		   let data = $gameScreen._particle.particleSet(0,'explode_cp_1','player');
		   $gameScreen._particle.particleUpdate(['explode_cp_1','pos','0','-12']);
		   $gameScreen._particle.particleUpdate(['explode_cp_1','color','#ff4665']);
		   if (data) data.clear = true;		   
		   leader.gainSkillMasteryUses(68, 1);
		   QJ.MPMZ.tl.redHornRecharge({redHornMark:true});
		   let baseCD = 70;
		   baseCD    -= 12 * leader.skillMasteryLevel(68);
		   baseCD    *= (100 - (15 * leader.skillMasteryLevel(28))) / 100;
		   baseCD     = Math.max(1, Math.round(baseCD));
		   this._coolDown = baseCD;
	   } else {
		   this._coolDown = 6;
	   }
		return;  
	}
	
	if (extra.redHornMark) {
	   // 更新可使用次数标记
	   for (let i = 1; i <= $gameParty.leader().skillMasteryUses(68); i++) {
          const pos  = PlayerHpHud.getPosition();
          const zoom = $gameScreen.zoomScale();
          const Ad   = Utils.isMobileDevice();
		  let posX   = (pos.x - 10 - 32 * i) / zoom;
          let posY   = (pos.y + 16) / zoom;
          if (Ad)  posY += 8;
		  let name   = `redHornMark${i}`;
		  if ($gameMap.getGroupBulletListQJ(name).length == 0) {
		  QJ.MPMZ.Shoot({
			 img: ['I', 609], 
			 groupName: [`redHornMark${i}`],
			 position: [['S', posX],['S', posY]],
			 initialRotation: ["S", 0],
             imgRotation: ["S", 0],
			 moveType: ['S',0],
             opacity: 1,
             scale: Ad ? 1 : 0.5,
			 onScreen:true,			 
			 existData: [
				{t:['S',`!$gameParty.leader().hasSkill(68) || $gameParty.leader().skillMasteryUses(68) < ${i}`,true]},
			 ],
			 timeline: ['B',0,120,[0.75,60]]
		  });
		 }		  
	   }
     }	   
	
};


// 连锁咒缚
QJ.MPMZ.tl.ex_chainSpellBinding = function(unchain, index) {

    let actor = $gameParty.leader(); 	
	// 解除装备效果
	if (unchain) {
    $dataStates[97].plusXParams[7] = 0;    
    let equips = actor.equips(); 
	let count = 0;
       for (let index = 1; index < equips.length; index++) {
           let equip = equips[index];
           if (!equip) continue; // 跳过空装备
           if ( equip.baseItemId === 48 ) {
			count += 1;			
           }
	     }
	  // 卸除最后一个装备时，视为解除效果	 
	  if (count <= 1) {
		  QJ.MPMZ.deleteProjectile('spellBindingContract',{d:[0,30]});		
	  }
	  return;
    }	  
	
  // ---------- 契约模板 ----------
  const spawnLaserByIndex = (idx) => {
    QJ.MPMZ.Laser({
      imgPoint: 'null1',
      img: "Magic/Eletric A-Red[3,3,4]",
      groupName: ['spellBindingContract'],
      rotation: ['BT', idx],
      position: [['P'], ['P']],
      judgeWidth: 5,
      judgeMode: ['W', 5],
      blendMode: 1,
      scaleX: 0.5,
      opacity: 0.9,
      rotationStatic: false,
      positionStatic: false,
      positionSpread: 0,
      z: "E",
      length: ['D', ['P'], ['P'], ['B', idx], ['B', idx]],
      existData: [
        { t: ['BE', idx] },
      ],
      moveJS: [
            [4, 30, `const list = $gameMap.getGroupBulletListQJ('spellBindingContract');
                let HPvalue = list.length * 0.01;
                $dataStates[97].plusXParams[7] = HPvalue;`]
      ]
    });
  };
  
  // ---------- 指定生成 ----------
  if (index && index > 0) { 
    const list = $gameMap.getGroupBulletListQJ('servant');
    spawnLaserByIndex(index);
    return;
  }

  if ($gameMap.getGroupBulletListQJ('spellBindingContract').length > 0) return;

  // ---------- 针对在场从者生成 ----------
  const list = $gameMap.getGroupBulletListQJ('servant');
  for (let i = 0; i < list.length; i++) {
    spawnLaserByIndex(list[i]);
  }  
  
};	


// 站立回复体力
QJ.MPMZ.tl.ex_standHpRegen = function(initialize, regionId) {

    if (initialize && initialize === "start") {
	 QJ.MPMZ.Shoot({
		groupName:['standHpRegen'],
        position:[['P'],['P']],
		moveType:['D',true],
        existData:[	
		    { t: ["S", "$gameParty.leader().hasSkill(58)", false],a: ["S", "$gameParty.leader().removeState(90)"] }  
        ],
		moveF:[
		    [30, 30, QJ.MPMZ.tl.ex_standHpRegen, [undefined, 5]]			
		]		
     });
	}		
	
	let stand = !$gamePlayer.isMoved();
	let region = null;
	if (regionId) {
		region = $gameMap.regionId( Math.floor($gamePlayer.centerRealX()), Math.floor($gamePlayer.centerRealY()) ) !== regionId;
	}
	
	if (stand && !region) {
		$gameParty.leader().addState(90);
	} else {
		$gameParty.leader().removeState(90);
	}
	
};


// 宝石魔术-宝石攻击
QJ.MPMZ.tl.ex_gemMagicAttack = function(initialize, args) {
	
	if (initialize && initialize === "start") {

    const target = args && args.target;
    if (!(target instanceof Game_Event)) return;

	// 结算宝石属性
    let list = $gameParty.customItemTypeList('gem');
	if (list.length == 0) return;
    let gemId = list[Math.floor(Math.random() * list.length)];
    let item = $dataItems[gemId];
    let color = '#34c2fc';
    let addedStatusType, addedStatusChance, addedStatusDamage;
    switch(gemId) {
        case 314:
        color = '#d00000';
        addedStatusType = 8;
        addedStatusChance = 6000;
        addedStatusDamage = 12;
        break;
    }	  
	let posX = $gamePlayer.screenBoxXShowQJ();
	let posY = $gamePlayer.screenBoxYShowQJ(); 
	let tarX = target.screenBoxXShowQJ();
	let tarY = target.screenBoxYShowQJ();
    let angle = QJ.calculateAngleByTwoPointAngle(posX, posY, tarX, tarY);
    // 播放随机 SE 音效
    let randomSeArray = ["Ice4","Ice5","Ice6","Ice7","Ice8"];
    let randomSe = randomSeArray[Math.floor(Math.random() * randomSeArray.length)];
    let randomPitch = 100 + Math.randomInt(50);
    AudioManager.playSe({ name: randomSe, volume: 45, pitch: randomPitch, pan: 0 });

	let damage = Math.round(item.price / 10);
	damage = QJ.MPMZ.tl.randIntByRatio(damage);
            QJ.MPMZ.Shoot({
               img:['I', item.iconIndex],
			   initialRotation:['S',angle],
               afterImage:[color,'0|1~16/0',16,4],
               moveType:['S','0|12~30/8~999|8'],
               position:[['P'],['P']],
			   imgRotation:['F'],
			   gem: gemId,
			   scale:0.25,
			   collisionBox: ['C', 12],
               existData:[
                  {t:['Time',180],d:[1,20,0.1]},
                  {t:['G',['"enemy"','"object"']],
                   a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,
                     [damage,{magicAttack:true,noHitEffect:true,noDurLoss:true,specifyAddedStatus:true, addedStatusType, addedStatusChance, addedStatusDamage}]]}
               ],
			   deadF:[
			      [QJ.MPMZ.tl.ex_gemMagicAttack,["broken"]]
			   ]
            });
	 return;		
	}			

   if (initialize && initialize === "broken") {
	   this.changeAttribute("opacity",0);	
       let posX = this.inheritX();
       let posY = this.inheritY();
	   let itemId = this.data.gem;
        // 武器碎片破损粒子演出
        QJ.MPMZ.Shoot({
            initialRotation: 90,
            existData: [
                { t: ['Time', 3] }
            ],
            moveType: ['S', 0],
            position: [['S', posX],['S', posY]],
            particles: [
                {
                    img: `weapon/gem${itemId}[8]`,
                    intervalTime: 1,
                    bundleNumber: 5,
                    synScale: true,
                    offsetMin: [-2, 0, -10],
                    offsetMax: [0, 2, 10],
                    existTime: 60,
                    disappearTime: 20,
                    disappearScale: 0.5,
                    scaleXMin: 0.5,
                    scaleXMax: 0.5,
                    moveType: [
                        '(()=>{let a = this.remA = this.remA ? this.remA : (Math.random()*3-1.5);return a*t;})()',
                        '(()=>{let a = t<30?t:(30+(t-30)/2);return 8/60*a*(60-a);})()'
                    ]
                }
            ]
        });
        // 失去宝石
        let item = $dataItems[itemId];
        $gameParty.loseItem(item, 1);
        $gameSystem._drill_GFTH_styleId = 4;
        let context = "\\fs[22]\\ii[" + itemId + "]";
        if (ConfigManager.language > 1) context = "\\fs[18]\\ii[" + itemId + "]";
        $gameTemp.drill_GFTH_pushNewText( context );      
  }
   
};


// 夜雾幻影
QJ.MPMZ.tl.ex_mistyNightPhantom = function(unchain) {

    QJ.MPMZ.deleteProjectile('MistyNightPhantom');
	$gamePlayer._opacity = 255;

    let actor = $gameParty.leader(); 	
    let equips = actor.equips(); 
	let count = 0;
       for (let index = 1; index < equips.length; index++) {
           let equip = equips[index];
           if (!equip) continue; // 跳过空装备
           if ( equip.baseItemId === 31 ) {
			count += 1;			
           }
	     }	 
	  // 卸除最后一个装备时，视为解除效果	 
	  if (count <= 0 && unchain) {
		  return;
	  }
	
	
	 let time = 400;
	 time -= 40 * count;
	 let reTime = time + 90;
	 // 结算状态显示的描述时长
	 let value = Math.round(time / 0.6) / 100;
	 $gameVariables.setValue(221, value);
	 
	 QJ.MPMZ.Shoot({
		groupName:['MistyNightPhantom'],
        position:[['P'],['P']],
		moveType:['D',true],
        existData:[	

        ],
		moveJS:[
		    [time, time, "$gamePlayer.startOpacity(60, 40);AudioManager.playSe({ name: 'Darkness3', volume: 50, pitch: 80, pan: 0 })"],
			[reTime, time, "$gamePlayer.startOpacity(60, 255)"],
		],
		deadJS:[]		
    });

	
};
