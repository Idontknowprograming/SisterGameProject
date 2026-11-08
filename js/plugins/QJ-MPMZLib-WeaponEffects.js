//=============================================================================
//
//=============================================================================
/*:
 * @target MV MZ
 * @plugindesc [弹幕模板库][武器特效模板]
 * @author 仇九
 *
 * @help 
 * 
 *
 */
//=============================================================================
//近战武器特效
//=============================================================================

// 米斯特汀武器化按钮：与武器图标使用同一屏幕坐标系。
QJ.MPMZ.tl.mistilteinnButtonIsMobile = function (bullet) {
    const options = bullet.data.extra.mistilteinnButton;
    // 新按钮在创建时缓存；旧存档中的按钮只补查一次。
    if (options.mobile === undefined) options.mobile = Utils.isMobileDevice();
    return options.mobile;
};

// 提示是按钮 Sprite 的子节点，自动继承缩放/透明度，返回地图重建 Sprite 时恢复。
(() => {
    const prototype = Sprite_QJBulletMZ.prototype;
    if (prototype._mistilteinnKeyHintPatched) return;
    prototype._mistilteinnKeyHintPatched = true;
    const initialize = prototype.initialize;
    prototype.initialize = function () {
        initialize.apply(this, arguments);
        if (!this.data?.data?.extra?.mistilteinnButton || QJ.MPMZ.tl.mistilteinnButtonIsMobile(this.data)) return;
        const bitmap = new Bitmap(32, 36);
        bitmap.fontFace = 'Arial';
        bitmap.fontSize = 22;
        bitmap.fontBold = true;
        bitmap.textColor = '#ffffff';
        bitmap.outlineColor = '#181018';
        bitmap.outlineWidth = 5;
        bitmap.drawText('E', 0, 0, 32, 36, 'center');
        const hint = new Sprite(bitmap);
        hint.anchor.set(1, 1);
        hint.x = this._frame.width * (1 - this.anchor.x) + 4;
        hint.y = this._frame.height * (1 - this.anchor.y) + 4;
        this._mistilteinnKeyHintBitmap = bitmap;
        this.addChild(hint);
    };
    const destroy = prototype.destroy;
    prototype.destroy = function () {
        const bitmap = this._mistilteinnKeyHintBitmap;
        this._mistilteinnKeyHintBitmap = null;
        destroy.apply(this, arguments);
        if (bitmap) bitmap.destroy();
    };
})();

QJ.MPMZ.tl.isPointerOverMistilteinnButton = function (bullet) {
    const checkAttackCapture = !bullet;
    if (!bullet) {
        const id = $gameMap.getGroupBulletListQJ('MistilteinnWeapon')[0];
        bullet = id === undefined ? null : $gameMap.bulletQJ(id);
    }
    if (!bullet || bullet.dead || !bullet.data.extra?.mistilteinnButton) return false;
    const mobile = QJ.MPMZ.tl.mistilteinnButtonIsMobile(bullet);
    // 激活后按钮虽然隐藏，仍吞掉本次尚未松开的按压，避免同帧或长按穿透为普攻。
    if (checkAttackCapture && bullet._mistilteinnClickCaptured && (mobile ? TouchInput.isPressed() : TouchInput.drill_isLeftPressed())) return true;
    const actor = $gameParty.leader();
    const weapon = actor?.equips()[0];
    if (!weapon || (weapon.baseItemId || weapon.id) !== 37 || actor.isStateAffected(96)) return false;
    const parent = SceneManager._scene?._spriteset;
    if (!parent || SceneManager.isSceneChanging()) return false;
    const pointer = mobile ? TouchInput : TouchInput.drill_COI_getMousePos();
    // 使用基础图标范围，悬停演出不会改变命中范围；无需遍历子弹精灵。
    const x = bullet.screenXShowQJ() * parent.scale.x + parent.x;
    const y = bullet.screenYShowQJ() * parent.scale.y + parent.y;
    const baseScale = bullet.data.extra.mistilteinnButton.scale * 2 / $gameScreen.zoomScale();
    return Math.abs(pointer.x - x) <= ImageManager.iconWidth * baseScale * Math.abs(parent.scale.x) / 2 &&
        Math.abs(pointer.y - y) <= ImageManager.iconHeight * baseScale * Math.abs(parent.scale.y) / 2;
};

// 独立发射器 ID，不覆盖场景火炬或玩家身上的激活粒子。
QJ.MPMZ.tl.updateMistilteinnButtonParticle = function (visible) {
    const particle = $gameScreen._particle;
    if (!visible) {
        if (this._mistilteinnParticleId) particle.particleClear(this._mistilteinnParticleId, true);
        this._mistilteinnParticleId = null;
        return;
    }
    const current = this._mistilteinnParticleId && particle.dataWithId(this._mistilteinnParticleId, true);
    if (current && !current.destroy && !current.quit) return;
    // Sprite 尚未建立时绑定会失败，下帧重试。
    this._mistilteinnParticleSerial = (this._mistilteinnParticleSerial || 0) + 1;
    const id = `MistilteinnButton-${this.index}-${this._mistilteinnParticleSerial}`;
    const data = particle.particleSet(0, id, `QJBullet:${this.index}`, 'mysterious_torch_c', 1);
    if (!data) return;
    this._mistilteinnParticleId = id;
    particle.particleUpdate([id, 'pos', 0, 15]);
    particle.particleUpdate([id, 'color', '#ff5d78']);
};

// 只在激活/状态切换时更新现有武器图标，不重建装备栏、不修改武器数据库图标。
QJ.MPMZ.tl.refreshMistilteinnWeaponIcon = function () {
    const actor = $gameParty.leader();
    const weapon = actor?.equips()[0];
    if (!weapon || (weapon.baseItemId || weapon.id) !== 37) return;
    const icon = actor.isStateAffected(96) ? 261 : 277;
    for (const id of $gameMap.getGroupBulletListQJ('playerWeaponImg')) {
        const bullet = $gameMap.bulletQJ(id);
        if (!bullet || bullet.dead || !bullet.data) continue;
        if (bullet.data.img?.[0] !== 'I' || bullet.data.img[1] !== icon) {
            bullet.changeAttribute('img', ['I', icon]);
        }
    }
};

QJ.MPMZ.tl.MistilteinnWeaponizationEffect = function (extra = {}) {
    const tag = 'MistilteinnWeapon';
    const actor = $gameParty.leader();
    const weapon = actor?.equips()[0];
    const equipped = weapon && (weapon.baseItemId || weapon.id) === 37;

    // 仅由96号状态的到期计时器调用；卸装/死亡移除状态不会进入这里。
    if (extra.expire) {
        const owner = $gameActors.actor(1);
        if (!owner.isStateAffected(96)) return;
        if (actor === owner) QJ.MPMZ.tl.MistilteinnWeaponAttack({finish: true});
        owner.removeState(96);
        return;
    }
    // 兼容旧存档中尚未到期的remove计时器，保留原定到期时间。
    if (!extra.refresh && equipped && actor.isStateAffected(96)) {
        const timer = $gameSystem.getGameTimeEventByKey('state96');
        if (timer && timer.command === 'remove' && timer.target === 96) {
            timer.command = 'script';
            timer.target = 'QJ.MPMZ.tl.MistilteinnWeaponizationEffect({expire:true});';
        }
    }

    if (extra.refresh) {
        if (this.dead) return;
        if (!equipped) {
            QJ.MPMZ.tl.updateMistilteinnButtonParticle.call(this, false);
            this.setDead();
            return;
        }
        // 旧存档中的无图监听弹幕也迁移为按钮，不再检查攻击动作。
        if (!this.data.extra?.mistilteinnButton) {
            QJ.MPMZ.tl.MistilteinnWeaponizationEffect();
            return;
        }
        const options = this.data.extra.mistilteinnButton;
        const mobile = QJ.MPMZ.tl.mistilteinnButtonIsMobile(this);
        // 装备恢复可能先于地图缩放恢复：不能只在 Shoot 时除以 zoomScale。
        // 每帧抵消地图缩放、镜头偏移和滚动，维持固定 HUD 坐标与屏幕尺寸。
        const zoom = $gameScreen.zoomScale();
        const parent = SceneManager._scene?._spriteset;
        const displayX = $gameMap.displayX() * QJ.tileSize;
        const displayY = $gameMap.displayY() * QJ.tileSize;
        this._x = this.x = (1776 - (parent?.x || 0)) / zoom + displayX;
        this._y = this.y = (228 - (parent?.y || 0)) / zoom + displayY;
        this._orginDisplayX = displayX;
        this._orginDisplayY = displayY;
        const scale = this.data.extra.mistilteinnButton.scale * 2 / zoom;
        const previousZoom = this._mistilteinnZoom || this.data.extra.mistilteinnButton.initialZoom || zoom;
        const zoomChanged = previousZoom !== zoom;
        let currentScale = this.scaleX * previousZoom / zoom;
        this._mistilteinnZoom = zoom;
        if (this._mistilteinnClickCaptured && !(mobile ? TouchInput.isPressed() : TouchInput.drill_isLeftPressed())) {
            this._mistilteinnClickCaptured = false;
        }
        const active = actor.isStateAffected(96);
        if (this._mistilteinnActive !== active) {
            QJ.MPMZ.tl.refreshMistilteinnWeaponIcon();
            this._mistilteinnActive = active;
            this.changeAttribute('opacity', active ? 0 : 1);
            this._mistilteinnHovered = false;
            this.timelineEffectList.B.length = 0;
            this.changeAttribute('scale', scale);
            currentScale = scale;
        }
        // 保留这一枚隐藏按钮监听状态结束，隐藏期间不进行指针或点击检测。
        if (active) {
            QJ.MPMZ.tl.updateMistilteinnButtonParticle.call(this, false);
            if (zoomChanged) this.changeAttribute('scale', scale);
            return;
        }
        const stone = $dataItems[20];
        const hasStone = $gameParty.numItems(stone) > 0;
        // 数量直接查库存；只有可用性变化时更新静态 tone，避免每帧重设滤镜。
        if (options.hasStone !== hasStone) {
            options.hasStone = hasStone;
            this.changeAttribute('tone', hasStone ? [0, 0, 0, 0] : [0, 0, 0, 255]);
        }
        QJ.MPMZ.tl.updateMistilteinnButtonParticle.call(this, hasStone);
        const hovered = QJ.MPMZ.tl.isPointerOverMistilteinnButton(this);
        if (hovered !== !!this._mistilteinnHovered || zoomChanged) {
            this.timelineEffectList.B.length = 0;
            const targetScale = scale * (hovered ? 1.35 : 1);
            // 从当前大小过渡，快速移入移出时也连续；只在状态/缩放变化时重建。
            this.changeAttribute('scale', `0|${currentScale}~10/${targetScale}~9999999|${targetScale}`);
        }
        this._mistilteinnHovered = hovered;
        const clicked = hovered && (mobile ? TouchInput.isTriggered() : TouchInput.drill_isLeftTriggered());
        const keyTriggered = !mobile && !SceneManager.isSceneChanging() &&
            !$gameMessage.isBusy() && !$gameMap.isEventRunning() && Input.drill_isKeyTriggered('e');
        if (!clicked && !keyTriggered) return;
        if (clicked) this._mistilteinnClickCaptured = true;
        if (!hasStone) {
            SoundManager.playBuzzer();
            return;
        }
        /*
        const particleTag = 'Mistilteinn-P';
        $gameScreen._particle.particleSet(0, particleTag, 'player', 'monster_sp2');
        $gameScreen._particle.particleUpdate([particleTag, 'color', '#ff0000']);
        */
        actor.addState(96);
        QJ.MPMZ.tl.refreshMistilteinnWeaponIcon();
        weapon.wtypeId = 1;
        $gameParty.gainItem(stone, -1);
        $gameSystem._drill_GFTH_styleId = 4;
        $gameTemp.drill_GFTH_pushNewText("\\ii[20]");
        this._mistilteinnActive = true;
        this._mistilteinnHovered = false;
        this.changeAttribute('opacity', 0);
        this.timelineEffectList.B.length = 0;
        QJ.MPMZ.tl.updateMistilteinnButtonParticle.call(this, false);
        return;
    }

    QJ.MPMZ.deleteProjectile(tag);
    if (!equipped) return;
    const mobile = Utils.isMobileDevice();
    const scale = mobile ? 1 : 0.5;
    const hasStone = $gameParty.numItems($dataItems[20]) > 0;
    QJ.MPMZ.Shoot({
        groupName: [tag],
        img: ['I', 64],
        // 武器图标为 (1872, 228)，按钮向左留出 96 像素。
        position: [['S', 1776 / $gameScreen.zoomScale()], ['S', 228 / $gameScreen.zoomScale()]],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        scale: scale * 2 / $gameScreen.zoomScale(),
        opacity: actor.isStateAffected(96) ? 0 : 1,
        tone: hasStone ? [0, 0, 0, 0] : [0, 0, 0, 255],
        immuneTimeStop: true,
        onScreen: true,
        z: actor.hasSkill(55) ? 'MF_UR' : 'A',
        moveType: ['S', 0],
        existData: [],
        extra: { mistilteinnButton: { mobile, hasStone, scale, initialZoom: $gameScreen.zoomScale() } },
        moveF: [[1, 0, QJ.MPMZ.tl.MistilteinnWeaponizationEffect, [{ refresh: true }]]]
    });
};


// 魔剑自身的追加攻击：唤醒期间每个实际攻击动作/回旋周期必定追加一次剑波。
QJ.MPMZ.tl.MistilteinnWeaponAttack = function (extra = {}) {
    const actor = $gameParty.leader();
    const weapon = actor?.equips()[0];
    if (!weapon || (weapon.baseItemId || weapon.id) !== 37
        || actor.isDead() || !actor.isStateAffected(96)) return;

    const spinningSlash = extra.finish && Math.randomInt(2) === 1;
    // 初版倍率：剑波/散射每击60%攻击力，回旋斩每击100%，沿用±10%伤害浮动。
    let damage = Math.round(chahuiUtil.getVarianceDamage(3) * 0.6);
    if (spinningSlash) damage = Math.round(20 + 2 * chahuiUtil.getVarianceDamage(1));
    const posX = extra.finish ? $gamePlayer.screenBoxXShowQJ() : this.inheritX();
    const posY = extra.finish ? $gamePlayer.screenBoxYShowQJ() : this.inheritY();
    let angle = extra.angle ?? (extra.bladeDirection ? this.rotationImg : chahuiUtil.getCharacterAngle(-1));
    if (extra.mouseDirection) {
        // 与ex_swordEnergyAttack的方向模式1一致，每次发射时读取当前瞄准方向。
        angle = Utils.isMobileDevice() ? (Input._pressAngle['ok'] || 0)
            : QJ.MPMZ.model[0].initialRotationExtra(['M'], null, [posX, posY]);
    }
    const options = {
        playerCast: true, posX, posY, angle, damage,
        // 只保留96号状态提供的20%物理/魔法穿透，不复制其他来源的穿透。
        defPenetration: 20, mdfPenetration: 20
    };
    if (spinningSlash) {
        // 收招时在10格内选择最近的存活敌人，只锁定初始方向，不改变回旋轨迹。
        let nearestDistance = 480 * 480;
        const mapId = $gameMap.mapId();
        for (const eid of $gameMap.getGroupEventListQJ('"enemy"')) {
            const enemy = $gameMap.event(eid);
            if (!enemy || enemy._erased || $gameSelfSwitches.value([mapId, eid, 'D'])
                || !($gameSelfVariables.value([mapId, eid, 'HP']) > 0)) continue;
            const x = enemy.screenBoxXShowQJ();
            const y = enemy.screenBoxYShowQJ();
            const distance = (x - posX) ** 2 + (y - posY) ** 2;
            if (distance > nearestDistance) continue;
            nearestDistance = distance;
            // 完全重叠时没有有效瞄准角度，沿用原始朝向。
            options.angle = distance > 0 ? QJ.calculateAngleByTwoPointAngle(posX, posY, x, y) : angle;
        }
        return QJ.MPMZ.tl.MystletainnSpinningSlash(options);
    }
    options.beam = !extra.finish;
    return QJ.MPMZ.tl.MystletainnScatterSwordBeamCluster(options);
};

// 冲撞攻击移动路线
QJ.MPMZ.tl.ex_playerDashAttackPath = function (initialize, angle) {
	
  if (initialize && initialize === "start") {
	  let angle = 0;
	  if (Utils.isMobileDevice()) {
		 angle = Input._pressAngle['ok']?Input._pressAngle['ok']:0;
	  } else {
        let ax = ($gamePlayer._realX + 0.5 - $gameMap.displayX()) * 48;
        let ay = ($gamePlayer._realY + 0.5 - $gameMap.displayY()) * 48;
        let bx = TouchInput.x / 2 + $gameMap.displayX();
        let by = TouchInput.y / 2 + $gameMap.displayY();
        angle = QJ.calculateAngleByTwoPointAngle(ax, ay, bx, by);
	}
    let deadCode =
      `$gameParty.leader().removeState(82);
       $gamePlayer.drill_EASe_stopAct();
       $gamePlayer.drill_EASA_setEnabled( true );`;

    let color = [255, 255, 255, 255];
    if (!$gameParty.leader().isStateAffected(67)) {
      var r = 255, g = 150, b = 0;
      color = [r, g, b, 255];
    } else {
      var r = 50, g = 140, b = 200;
      color = [r, g, b, 255];
    }

    // 幽灵闪步效果
    if ($gameParty.leader().hasSkill(92)) {
      r = 144; g = 0; b = 255;
      color = [r, g, b, 255];
    }

    // 附加加速 buff
    $gameParty.leader().addState(82);

    var dash = QJ.MPMZ.Shoot({
      position:       [['P'], ['P']],
      initialRotation:['S', 0],
      imgRotation:    ['F'],
      moveType:       ['D', true],
      collisionBox:   ['C', 30],
      existData: [
        { t: ['Time', 65], a: ['S', deadCode] },
        { t: ['G', ['"enemy"', '"object"']], a: ['F', QJ.MPMZ.tl.ex_playerDashCombo, ['start']] }
      ],
      moveF: [
        [1, 0, QJ.MPMZ.tl.ex_playerDashAttackPath, ['move', angle]],
        [0, 3, QJ.MPMZ.tl.ex_senpoResidualEffect, [-1, color]]
      ]
    });
    return;
  }

  if (initialize && initialize === "move") {
    let target = $gamePlayer;
    target.dotMoveByDeg(angle);
  }
};


// 玩家必杀技
QJ.MPMZ.tl.ex_playerDashCombo = function (initialize, args) {

	
  if (initialize && initialize === "start") {
	  
    if (!args.target || !args.target instanceof Game_Event) {
	    return;
    }
	
	let posX = args.target.screenBoxXShowQJ();
    let posY = args.target.screenBoxYShowQJ(); - 4; 	
	const player = $gameParty.leader();
    $gameScreen.showPicture(9, "black", 0, 0, 0, 120, 120, 0, 0);
    $gameScreen.movePicture(9, 0, 0, 0, 120, 120, 255, 0, 20);
    // 敌人被控
	args.target._IsDisabledCounter += 210;
	// 玩家被控
	$gameSwitches.setValue(14, true);
	$gameSystem._drill_COI_map_mouse = false;
	player.addState(69);
    TouchInput._mousePressed = false;
	$gameSystem._drill_COI_map_KPMove = false;
    if (player.equips()?.[0]?.wtypeId === 1) {
        QJ.MPMZ.Shoot({
        img: ['A', 223],
	    initialRotation: ['S', 0],
        imgRotation: ['S', 0],
        position: [["S",posX], ["S",posY]],	
        eid:args.target._eventId,
        moveType: ["S", 0],	
        z: "A",
        existData: [{ t: ["Time", 175] }],
        deadF: [[QJ.MPMZ.tl.ex_playerDashCombo, ["end"]]]
        });
    } else {
        QJ.MPMZ.Shoot({
        position: [["S",posX], ["S",posY]],	
        eid:args.target._eventId,
        moveType: ["S", 0],		  
        existData: [{ t: ["Time", 150] }],
        moveF: [[30, 5, QJ.MPMZ.tl.ex_playerDashCombo]],
        deadF: [[QJ.MPMZ.tl.ex_playerDashCombo, ["end"]]]
        });
    }
    return;
  }

  if (initialize && initialize === "end") {
	  
	  $gamePlayer.drill_EASA_setEnabled( true );
	  $gamePlayer.drill_EASe_setAct( "技能动作1" );
    setTimeout(() => {
      $gameScreen.erasePicture(9);
      AudioManager.playSe({ name: "Battle3", volume: 60, pitch: 70, pan: 0 });
    let posX = this.inheritX();
    let posY = this.inheritY();
    let damage = Math.round(5 * chahuiUtil.getVarianceDamage(1) + (0.5 * $gameParty.leader().mhp));
	if ($gameParty.leader().equips()[0] && $gameParty.leader().equips()[0].baseItemId == 4) {
		damage += 20 * chahuiUtil.getVarianceDamage(1);
	}
	damage += Math.round(damage * (1 - $gameParty.leader().hpRate()));

    QJ.MPMZ.Shoot({
	  img: "Magic/kusa",
	  initialRotation: ['S', 0],
      imgRotation: ['S', 0],
	  scale: '0|0.6~60/1.2~999|1.2',
	  opacity:'0|1~60/0~999|0',
	  collisionBox:['C',4],
      position: [["S",posX], ["S",posY]],
      moveType: ["S", 0],	
      z: "A",	  
      existData: [
	                { t: ["Time", 60], a: ["S", `$gameSwitches.setValue(14, false);
					                            $gameParty.leader().removeState(69);
	                                            $gameParty.leader().removeState(82);
	                                            $gameSystem._drill_COI_map_mouse = true;
	                                        `] },
					{ t:['G',['"enemy"','"object"']], a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[damage,{noHitEffect:true,noDurLoss:true,specifyAddedStatus:true,addedStatusType:0,weaponAttack:true}]], p:[-1,false,true], c:['T',10,66,true] },						
											
				],
    });	  
    }, 350);
    return;
  }

  function randPointInCircle(cx, cy, R) {
    const a = Math.random() * Math.PI * 2;     // 随机角度
    const r = Math.sqrt(Math.random()) * R;    // 半径开方，保证均匀分布
    const x = Math.round(cx + r * Math.cos(a));
    const y = Math.round(cy + r * Math.sin(a));
    return { x, y };
  }

  let angle = Math.randomInt(360);
  let posX = this.inheritX();
  let posY = this.inheritY();

  const p = randPointInCircle(posX, posY, 40);
  posX = p.x;
  posY = p.y;

  let scale = (50 + Math.randomInt(50)) / 100;

  QJ.MPMZ.Shoot({
      //img: "Magic/HitSpecial2[5,2,4]",
      img: ['A', 222],
      initialRotation: ["S", angle],
      //existData: [{ t: ["Time", 39] }],
      existData: [{ t: ["AE"] }],
      position: [["S", posX], ["S", posY]],
      moveType: ["S", 0],
      z: "A",
      scale: scale,
      moveJS: [[
        1, 999,
        `let seName = 'Blow' + (1 + Math.randomInt(3));
         AudioManager.playSe({ name: seName, volume: 50, pitch: 80 + Math.randomInt(40), pan: 0 });`
      ]]
   });
  
};

// 弹反子弹
QJ.MPMZ.tl.ex_weaponParry = function(target) {
    if (!target) return;

    let posX = target.inheritX();
    let posY = target.inheritY();
    
    if (!$gameParty.leader().equips()[0]) return;
    
    let weapon = $gameParty.leader().equips()[0];
    let wtype = weapon.wtypeId;

    if (wtype === 1) {
        // 剑类武器 - 斩断
        target.setDead({ t: ['Time', 0], d: [0, 15] });

        // 斩断音效
        let se = {
            name: "剣の必殺技発動",
            volume: 40,
            pitch: Math.randomInt(60) + 70,
            pan: 0
        };
        AudioManager.playSe(se);

        // 斩击特效
        QJ.MPMZ.Shoot({
            img: '01_斬撃[3,5,2]',
            initialRotation: ['S', Math.randomInt(360)],
            position: [['S', posX], ['S', posY]],
            scale: [1, 1],
            moveType: ['S', 0],
            alpha: 0.6,
            blendMode: 1,
            z: "W",
            existData: [{ t: ['Time', 29] }],
        });

        return;
    }

    if (wtype === 2 && !target._countered) {
        // 棍棒类武器 - 击飞
        let parryRotation = (target.rotationMove + 180) % 360;
        target.rotationMove = parryRotation;
        target._countered = true;
        target.data.nonPlayerDamage = false;
        if (weapon.baseItemId === 12) {
			if (target.data.damage) target.data.damage *= 2;
			if (target.data.moveType && target.data.moveType[0] == "S") {
				let speed = target.data.moveType[2].speed;
				    speed *= 2;
				target.changeAttribute("moveType",['S', speed]);
			}
	    }
		
		
        // 击飞特效
        QJ.MPMZ.Shoot({
            img: 'animehit[5,4]',
            position: [['S', posX], ['S', posY]],
            scale: [1.5, 1.5],
            moveType: ['S', 0],
            alpha: 1,
            z: "W",
            existData: [{ t: ['Time', 18] }],
        });

        // 击飞音效
        let se = {
            name: "金属バットで打つ（至近距離から録音）",
            volume: 45,
            pitch: Math.randomInt(60) + 70,
            pan: 0
        };
        AudioManager.playSe(se);
    }
};

//击退效果
QJ.MPMZ.tl.attackKnockbackEffect = function(power,args) {

	let posX = this.inheritX(); 
    let posY = this.inheritY();
	let tarX = 0;
	let tarY = 0;
    let angle = 0;
	if (!power) power = this.scaleX;
	if (!args.target) return;	
	
	tarX = args.target.screenShootXQJ();
	tarY = args.target.screenShootYQJ();
	angle = QJ.calculateAngleByTwoPointAngle(posX, posY, tarX, tarY);
	
    if ( args.target instanceof Game_Player ) {	
	
	QJ.MPMZ.tl.ex_jumpWithAngle(-1,angle,power);
	
	} else if ( args.target instanceof Game_Event ) {
		
	let eventId = args.target._eventId;
	QJ.MPMZ.tl.ex_jumpWithAngle(eventId,angle,power);
	
	}	
};


//飞行物追踪效果
QJ.MPMZ.tl.ex_projectileTrackingEffect = function() {
	

	let enabled = this._Tracking || false;
	let posX = this.inheritX();
    let posY = this.inheritY();	  
	let range = 120;
	let angle = 10;
	let skillLevel = $gameParty.leader().skillMasteryLevel(41);
	range += 20 * skillLevel;
	angle += 4 * skillLevel;
	if (QJ.MPMZ.rangeAtk([['S',posX],['S',posY]],['G','"enemy"'],[],['C',range]).length > 0) {
		if (enabled) return;
		this.remMoveType = this.data.moveType;
		this.changeAttribute("moveType",['TG','"enemy"',10,angle,Math.floor(angle/2)]);
		if (!Utils.isMobileDevice())  this.changeAttribute("tone",['20|0~70/134~20/0','20|0~70/61~20/0','20|0~70/255~20/0',0]);
		this._Tracking = true;
	} else {
		if (enabled) {
		this.changeAttribute("moveType",this.remMoveType);	
		if (!Utils.isMobileDevice())  this.changeAttribute("tone",[0,0,0,0]);
		this._Tracking = false;
		}
	}

};

// 柳叶剑-飞镖
QJ.MPMZ.tl.ex_willowLeafEffects = function(type,subBullet = false) {
    if (!type) return;

    let weaponDamage = 10 + Math.floor(0.3 * chahuiUtil.getVarianceDamage(1));

    // 近战攻击效果
    if (type === "meleeAttack") {
		
	    // 发射弹幕消耗耐久度
        if ($gameParty.leader().equips()[0]) {
	        $gameParty.leader().equips()[0].durability -= 5;
        }		
        let seNames = "Wind7";
        let randomPitch = Math.randomInt(40) + 81;
        let se = { name: seNames, volume: 60, pitch: randomPitch, pan: 0 };
        AudioManager.playSe(se);
        
        let id = this.index;
        let weaponScale = $gameParty.leader().pdr;
        let time = 180;
        if ($gameParty.leader().hasSkill(41)) {
            time += 90;
        }
        
        var bullet = QJ.MPMZ.Shoot({
            groupName: ['playerBullet'],
            collisionBox: ['C', 20],
            img: "weapon/weaponBullet80",
            moveType: ['S', 9],
            position: [['B', id], ['B', id]],
            initialRotation: ['PD'],
            imgRotation: ['R', 36, true],
            scale: weaponScale,
            //trailEffect: TrailEffect,
			afterImage:['#43db22','0|1~10/0',10,'0|10~10/0'],
            existData: [
                { t: ['Time', time] },
                { t: ['NP'], rb: [1, false, true] },
                {
                    t: ['G', ['"enemy"', '"object"']],
                    a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [
                        weaponDamage,
                        {
                            noHitEffect: true,
                            noDurLoss: true,
                            specifyAddedStatus: true,
                            addedStatusType: 0
                        }
                    ]]
                }
            ]
        });
        
        // 追踪效果：如果拥有技能 41，则添加追踪效果数据
        if ($gameParty.leader().hasSkill(41)) {
            bullet.addMoveData("F", [10, 10, QJ.MPMZ.tl.ex_projectileTrackingEffect]);
        }
        return true;
    }

    // 旋风斩蓄力中时点
    if (type === "senpuuGiri") {
        // 检查旋转数据是否满足要求
        if (this.data.imgRotation[1].get() < 9) return;
	    // 发射弹幕消耗耐久度
        if ($gameParty.leader().equips()[0]) {
	        $gameParty.leader().equips()[0].durability -= 3;
        }
        let baseValue = 300;
        let luk = $gameParty.leader().luk;
        luk = Math.max(0, Math.min(600, luk));
        let adjustedValue = baseValue + (luk / 600) * 700;
        if (subBullet) adjustedValue *= 0.5; 
        if (Math.randomInt(1001) > adjustedValue) return;

        let seNames = "Wind7";
        let randomPitch = Math.randomInt(40) + 81;
        let se = { name: seNames, volume: 60, pitch: randomPitch, pan: 0 };
        AudioManager.playSe(se);

        let id = this.index;
        let weaponScale = $gameParty.leader().pdr;
        let time = 180;
        if ($gameParty.leader().hasSkill(41)) {
            time += 90;
        }

        var bullet = QJ.MPMZ.Shoot({
            groupName: ['playerBullet'],
            collisionBox: ['C', 20],
            img: "weapon/weaponBullet80",
            moveType: ['S', 9],
            position: [['B', id], ['B', id]],
            initialRotation: ['S', Math.randomInt(360)],
            imgRotation: ['R', 36, true],
            scale: weaponScale,
			afterImage:['#43db22','0|1~10/0',10,'0|10~10/0'],
            //trailEffect: TrailEffect,
            existData: [
                { t: ['Time', time] },
                { t: ['NP'], rb: [1, false, true] },
                {
                    t: ['G', ['"enemy"', '"object"']],
                    a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [
                        weaponDamage,
                        {
                            noHitEffect: true,
                            noDurLoss: true,
                            specifyAddedStatus: true,
                            addedStatusType: 0
                        }
                    ]]
                }
            ]
        });

        // 追踪效果
        if ($gameParty.leader().hasSkill(41)) {
            bullet.addMoveData("F", [10, 10, QJ.MPMZ.tl.ex_projectileTrackingEffect]);
        }
        return true;
    }

    // 旋风斩投掷后（蓄力后或投掷后）
    if (type === "senpuuGiriHold" || type === "senpuuGiriThrow") {
        let baseValue = 300;
        let luk = $gameParty.leader().luk;
        luk = Math.max(0, Math.min(600, luk));
        let adjustedValue = baseValue + (luk / 600) * 700;
        if (Math.randomInt(1001) > adjustedValue) return;

	    // 发射弹幕消耗耐久度
        if ($gameParty.leader().equips()[0]) {
	        $gameParty.leader().equips()[0].durability -= 3;
        }

        let seNames = "Wind7";
        let randomPitch = Math.randomInt(40) + 81;
        let se = { name: seNames, volume: 60, pitch: randomPitch, pan: 0 };
        AudioManager.playSe(se);

        let posX = this.inheritX();
        let posY = this.inheritY();
        let weaponScale = $gameParty.leader().pdr;
        let time = 180;
        if ($gameParty.leader().hasSkill(41)) {
            time += 90;
        }

        var bullet = QJ.MPMZ.Shoot({
            groupName: ['playerBullet'],
            collisionBox: ['C', 20],
            img: "weapon/weaponBullet80",
            moveType: ['S', 9],
            position: [['S', posX], ['S', posY]],
            initialRotation: ['S', Math.randomInt(360)],
            imgRotation: ['R', 36, true],
            scale: weaponScale,
			afterImage:['#43db22','0|1~10/0',10,'0|10~10/0'],
            //trailEffect: TrailEffect,
            existData: [
                { t: ['Time', time] },
                { t: ['NP'], rb: [1, false, true] },
                {
                    t: ['G', ['"enemy"', '"object"']],
                    a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [
                        weaponDamage,
                        {
                            noHitEffect: true,
                            noDurLoss: true,
                            specifyAddedStatus: true,
                            addedStatusType: 0
                        }
                    ]]
                }
            ]
        });

        // 追踪效果
        if ($gameParty.leader().hasSkill(41)) {
            bullet.addMoveData("F", [10, 10, QJ.MPMZ.tl.ex_projectileTrackingEffect]);
        }
        return true;
    }
};


//香蕉大剑：香蕉榴弹炮
QJ.MPMZ.tl.ex_activateBananaGrenade = function(type) {
	
  if(!type) return;	
  if (type === "senpuuGiri" && Math.random() > 0.5) {	
  
     if ( this.data.img.includes("alt") ) return;  
     if ($gameParty.leader().equips()[0]) {
		 $gameParty.leader().equips()[0].durability -= 300;
	 }
     var seNames = "Explosion1" ;
     var se = { name: seNames, volume: 80, pitch: 150, pan: 0 };
     AudioManager.playSe(se);  
	 this.changeAttribute("img","weapon/weapon60_alt");
	 QJ.MPMZ.deleteProjectile('senpuuGiriTrail');
	 
     let posX = this.inheritX();
     let posY = this.inheritY();
     let angle = this.inheritRotation();	 
     var weaponScale = this.scaleX;
     QJ.MPMZ.Shoot({
		groupName:['playerBullet','bananaGrenade'],
        img:"weapon/weaponTrail60_alt",
        position:[['S',posX],['S',posY]],
        initialRotation:['M'],
		imgRotation:['F',180],
        scale:weaponScale,
        anchor:[0.5,0.5],
        existData:[
           // {t:['R',[255]],a:['F',QJ.MPMZ.tl.ex_senpuuGiriHold]},	
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_bananaGrenadeExplosive]},					
        ],
		moveType:['S',7],
		moveF:[
		],
        z:"E",
		collisionBox:['R',8,64],
		judgeAccuracyMove:8,
    });	 
  }
  
};

//香蕉榴弹炮爆炸
QJ.MPMZ.tl.ex_bananaGrenadeExplosive = function() {
	
	let posX = this.inheritX(); 
    let posY = this.inheritY();
	
     var se = { name: "Explosion2", volume: 60, pitch: 100, pan: 0 };
     AudioManager.playSe(se);
	
    QJ.MPMZ.Shoot({
		groupName: ['JackBomb'],
        img:'MGC_W2_Explosion_V4_Lv1[5,10,2]',
        position:[['S',posX],['S',posY]],
		scale:[3,3],
        initialRotation:['S',0],
        imgRotation:['F'],
		collisionBox:['C',60],
		opacity:1,
        moveType:['S',0],
        blendMode:1,
        existData:[	
		{t:['Time',98]},
		{t:['P'],a:['F',QJ.MPMZ.tl.ex_JackBombExplode,[1]],p:[-1,true,true],c:['S','this.time > 16 && this.time < 24']},
		{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_JackBombExplode,[1]],p:[-1,true,true],c:['S','this.time > 16 && this.time < 24']},
        ],       
    });
	
};

//臭鱼骨-恶臭
QJ.MPMZ.tl.ex_stenchWeaponEffect = function() {
	
	if ($gameMap.getGroupBulletListQJ('stenchWeapon').length > 0) return;
      QJ.MPMZ.Shoot({
        //img:"Absorb0002[5,4,4]",
        img:"pipofm-badstate10_192[5,2,5]",
		groupName: ['stenchWeapon'],
        position:[['P'],['P']],
        initialRotation:['S',0],
        imgRotation:['F'],
        scale: 1,
        opacity: 0.7,
        moveType:['D',true],
        collisionBox:['C',48],
        blendMode: 0,
        existData:[
		  {t:['S','$gameActors.actor(1).equips()[0] && $gameActors.actor(1).equips()[0].baseItemId == 13',false],d:[1,30,0.1]},
          {t:['G',['"enemy"','"NPC"']],a:[],p:[-1,true,true,QJ.MPMZ.tl.ex_enemyInFear],d:['T',15,15,true]}	
        ],
		moveJS:[
		  [60,60,`let chance = 0.06;
		          let actor = $gameParty.leader();
		          chance *= actor.stateRate(5);
				  let condition = $gameMessage.isBusy();
				  if (chance > Math.random() && !condition) {
					 QJ.MPMZ.tl.ex_playerPoison(1);
				  }
				  if (!actor.isStateAffected(60)) {
					   actor.addState(60);
				  }`]
		],
        z:"W"
    });
};

// 远程剑气斩击
QJ.MPMZ.tl.ex_swordEnergyAttack = function (rate = 0.75, randomAngle, extra = {}) {

    const posX = this.inheritX();
    const posY = this.inheritY();

    // 残影效果
    if (extra.trailEffect) {
        QJ.MPMZ.Shoot({
            img: "swordEnergyAttack",
            position: [
                ["S", posX],
                ["S", posY]
            ],
            initialRotation: this.inheritRotation(),
            imgRotation: ["F"],
            scale: this.scaleX,
            moveType: ["S", 0],
            opacity: "0|0.5~10/0",
            anchor: [0.5, 0.65],
            existData: [
                { t: ["Time", 9] }
            ]
        });

        return;
    }

    const weaponDamage =
        10 + Math.round(rate * chahuiUtil.getVarianceDamage(1) * 0.6);

    const scaleExpression = `0|0~10/${rate}~999/${rate}`;
    const projectileScale = [scaleExpression, scaleExpression];

    let rotation = ["PD"];

    switch (randomAngle) {
        // 朝鼠标或触摸方向发射
        case 1:
            rotation = Utils.isMobileDevice()
                ? ["S", "Input._pressAngle['ok'] || 0"]
                : ["M"];
            break;

        // 随机方向发射
        case 2:
            rotation = ["S", Math.randomInt(360)];
            break;
    }

    const swordEnergy = QJ.MPMZ.Shoot({
        img: "swordEnergyAttack",
        groupName: ["playerBullet"],
        position: [
            ["S", posX],
            ["S", posY]
        ],
        initialRotation: rotation,
        imgRotation: ["F"],
        scale: projectileScale,
        moveType: ["S", "0|0~10/10~360/16~999|16"],
        opacity: 0.75,
        collisionBox: ["M", 82, 76, -150, 120, 0.5, 0.42],
        anchor: [0.5, 0.65],
        existData: [
            { t: ["R", [255]] },
            { t: ["Time", 120] },
            {
                t: ["G", ['"enemy"', '"object"']],
                a: [
                    "F",
                    QJ.MPMZ.tl.ex_toEnemyAttack,
                    [weaponDamage, {}]
                ],
                p: [4, false, true]
            }
        ],
        moveF: [
            [
                1,
                1,
                QJ.MPMZ.tl.ex_swordEnergyAttack,
                [projectileScale, randomAngle, { trailEffect: true }]
            ]
        ]
    });
    if (!swordEnergy) return;
    // 为剑气添加追踪效果
    if ($gameParty.leader().hasSkill(41)) {
        swordEnergy.addMoveData(
            "F",
            [10, 10, QJ.MPMZ.tl.ex_projectileTrackingEffect]
        );
    }

    const pitch = 80 + Math.randomInt(40);

    AudioManager.playSe({
        name: "剣で斬る2",
        volume: 70,
        pitch,
        pan: 0
    });
};

// 色拉的笔：为普通攻击留下的刀光创建持续伤害判定
QJ.MPMZ.tl.lingeringSwordWaveCollision = function () {
    if (!this || !this.data) return;

    const posX = this.inheritX();
    const posY = this.inheritY();
    const sourceBox = this.data.collisionBox || ["R", 8, 64];
    const trailData = this.data.trailEffect && this.data.trailEffect[0];
    // 移动端关闭了刀光渲染时，不生成玩家看不见的残留伤害区。
    if (!trailData) return;

    // 普通攻击使用锚点 [0.5, 1] 的纵向矩形作为刀身判定，
    // 矩形高度就是刀光从挥砍中心向外延伸的半径。
    let radius = 64 * Math.abs(this.scaleY || 1);
    if (sourceBox[0] === "R") {
        radius = Math.abs(sourceBox[2] * (this.scaleY || 1));
    } else if (sourceBox[0] === "C") {
        radius = Math.abs(sourceBox[1]) *
            (Math.abs(this.scaleX || 1) + Math.abs(this.scaleY || 1)) / 2;
    }

    const coreRemData = (this.dataRem || []).filter(point => point && point.ic);
    const firstRotation = coreRemData.length > 0
        ? coreRemData[0].ir
        : this.inheritImgRotation();

    // imgRotation 为 ['R', angle, true]。保留未归约角度后，可以直接由
    // 每帧旋转量和普通攻击总帧数还原整道刀光覆盖的扇形。
    let rotationStep = 0;
    if (this.data.imgRotation && this.data.imgRotation[0] === "R") {
        const rotationFrame = this.data.imgRotation[1];
        rotationStep = rotationFrame && rotationFrame.getOnly
            ? rotationFrame.getOnly()
            : Number(rotationFrame) || 0;
    }

    const timeData = this.data.existData.find(detail =>
        detail && detail.t && detail.t[0] === "Time"
    );
    const attackTime = timeData ? Number(timeData.t[1]) || 1 : 1;
    let sweepRotation = rotationStep * attackTime;

    // S 型碰撞体使用屏幕坐标系中的数学角度；刀身 0 度朝上，需减 90 度。
    let startRotation = firstRotation - 90;
    if (sweepRotation < 0) {
        startRotation += sweepRotation;
        sweepRotation = Math.abs(sweepRotation);
    }
    sweepRotation = Math.min(180, Math.max(1, sweepRotation));

    const totalTrailLife = trailData
        ? (Number(trailData.existTime) || 0) + (Number(trailData.disappearTime) || 0)
        : 216;
    const remainLife = Math.max(1, totalTrailLife - this.time);
    const segments = Math.max(6, Math.ceil(sweepRotation / 10));
    const weaponDamage = Math.floor(chahuiUtil.getVarianceDamage(1));

    return QJ.MPMZ.Shoot({
        img: "null1",
        groupName: ["lingeringSwordWaveCollision"],
        position: [["S", posX], ["S", posY]],
        initialRotation: ["S", 0],
        imgRotation: ["S", 0],
        scale: 1,
        opacity: 0,
        anchor: [0.5, 0.5],
        moveType: ["S", 0],
        collisionBox: [
            "S",
            radius,
            startRotation,
            sweepRotation,
            0.5,
            0.5,
            segments
        ],
        existData: [
            { t: ["Time", remainLife] },
            {
                t: ["G", ['"enemy"', '"object"']],
                a: [
                    "F",
                    QJ.MPMZ.tl.ex_toEnemyAttack,
                    [
                        weaponDamage,
                        {
                            extraAttack: true,
                            weaponAttack: true,
                            noDurLoss: true,
                            noHitEffect: true
                        }
                    ]
                ],
                p: [-1, false, true],
                c: ["T", 0, 20, true]
            }
        ],
        z: "E"
    });
};

// 色拉的笔：不规则刀光轨迹的采样与复合碰撞。
// 每段四边形拆成最多两个凸三角形，交给 QJ 的 type==2 SAT 复合体统一判定。
QJ.MPMZ.tl.lingeringTrailCollisionConfig = {
    moveThreshold: 12,
    sampleDistance: 8,
    sampleRotation: 15,
    spinMaxSamples: 12,
    senpoTachiMaxSamples: 32,
    innerRadiusRate: 0.45,
    outerRadiusRate: 1.0,
    edgePadding: 1
};

QJ.MPMZ.tl.lingeringTrailLife = function (source, fallback = 220) {
    const trailData = source?.data?.trailEffect?.[0];
    if (!trailData) return Math.max(1, fallback);
    return Math.max(
        1,
        (Number(trailData.existTime) || 0) +
        (Number(trailData.disappearTime) || 0)
    );
};

QJ.MPMZ.tl.lingeringTrailRadius = function (source) {
    const sourceBox = source?.data?.collisionBox || ["R", 8, 64];
    if (sourceBox[0] === "R") return Math.abs(Number(sourceBox[2]) || 64);
    if (sourceBox[0] === "C") return Math.abs(Number(sourceBox[1]) || 64);
    return 64;
};

QJ.MPMZ.tl.sampleLingeringTrailPoints = function (points, maxSamples) {
    const config = QJ.MPMZ.tl.lingeringTrailCollisionConfig;
    const valid = (points || []).filter(point =>
        point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
        Number.isFinite(point.ir)
    );
    if (valid.length <= 2) return valid;

    const sampled = [valid[0]];
    let previous = valid[0];
    for (let i = 1; i < valid.length - 1; i++) {
        const point = valid[i];
        const centerDistance = Math.hypot(point.x - previous.x, point.y - previous.y);
        const rotationDistance = Math.abs(point.ir - previous.ir);
        const anchorDistance = Math.abs((point.ay || 0) - (previous.ay || 0)) * 64;
        if (centerDistance >= config.sampleDistance ||
            rotationDistance >= config.sampleRotation ||
            anchorDistance >= 4) {
            sampled.push(point);
            previous = point;
        }
    }
    sampled.push(valid[valid.length - 1]);

    const limit = Math.max(2, Math.floor(maxSamples || sampled.length));
    if (sampled.length <= limit) return sampled;
    const reduced = [];
    for (let i = 0; i < limit; i++) {
        reduced.push(sampled[Math.round(i * (sampled.length - 1) / (limit - 1))]);
    }
    return reduced;
};

QJ.MPMZ.tl.makeLingeringTrailPolygons = function (source, points, originX, originY, maxSamples) {
    const config = QJ.MPMZ.tl.lingeringTrailCollisionConfig;
    const baseRadius = QJ.MPMZ.tl.lingeringTrailRadius(source);
    const sampled = QJ.MPMZ.tl.sampleLingeringTrailPoints(points, maxSamples);
    const sections = sampled.map(point => {
        const rotation = point.ir * Math.PI / 180;
        const scaleY = Math.abs(Number(point.sy) || 1);
        const anchorY = Math.max(0, Number(point.ay) || 0);
        const fullLength = baseRadius * scaleY * anchorY;
        const innerLength = fullLength * config.innerRadiusRate;
        const outerLength = fullLength * config.outerRadiusRate + config.edgePadding;
        const centerX = point.x - originX;
        const centerY = point.y - originY;
        const inner = [
            centerX + Math.sin(rotation) * innerLength,
            centerY - Math.cos(rotation) * innerLength
        ];
        const outer = [
            centerX + Math.sin(rotation) * outerLength,
            centerY - Math.cos(rotation) * outerLength
        ];
        return { inner, outer };
    });

    const polygons = [];
    const pushTriangle = function (a, b, c) {
        const twiceArea = (b[0] - a[0]) * (c[1] - a[1]) -
            (b[1] - a[1]) * (c[0] - a[0]);
        if (Math.abs(twiceArea) < 0.5) return;
        polygons.push(twiceArea > 0 ? [a, b, c] : [a, c, b]);
    };
    for (let i = 1; i < sections.length; i++) {
        const previous = sections[i - 1];
        const current = sections[i];
        pushTriangle(previous.inner, previous.outer, current.outer);
        pushTriangle(previous.inner, current.outer, current.inner);
    }
    return polygons;
};

QJ.MPMZ.tl.spawnLingeringTrailCollision = function (source, options = {}) {
    if (!source || !source.data) return null;
    const points = options.points || source.dataRem || [];
    if (points.length < 2) return null;

    const originX = Number(options.originX ?? points[0].x);
    const originY = Number(options.originY ?? points[0].y);
    const tileSize = Number(QJ.tileSize) || 48;
    // dataRem 保存地图绝对像素；Shoot 的 S 坐标是屏幕像素，内部还会加地图偏移。
    const screenOriginX = originX - $gameMap.displayX() * tileSize;
    const screenOriginY = originY - $gameMap.displayY() * tileSize;
    const life = Math.max(1, Math.floor(Number(options.life) || 220));
    const maxSamples = Number(options.maxSamples) || 12;
    const polygons = QJ.MPMZ.tl.makeLingeringTrailPolygons(
        source, points, originX, originY, maxSamples
    );
    if (polygons.length === 0) return null;

    const weaponDamage = Math.floor(
        Number(options.damage ?? source._lingeringSwordWaveDamage) ||
        chahuiUtil.getVarianceDamage(1)
    );
    const collision = QJ.MPMZ.Shoot({
        img: "null1",
        groupName: ["lingeringSwordWaveCollision", options.groupName || "lingeringTrailCollision"],
        position: [["S", screenOriginX], ["S", screenOriginY]],
        initialRotation: ["S", 0],
        imgRotation: ["S", 0],
        scale: 1,
        opacity: 0,
        anchor: [0.5, 0.5],
        moveType: ["S", 0],
        collisionBox: ["C", 1],
        existData: [
            { t: ["Time", life] },
            {
                t: ["G", ['"enemy"', '"object"']],
                a: ["F", QJ.MPMZ.tl.ex_toEnemyAttack, [weaponDamage, {
                    extraAttack: true,
                    weaponAttack: true,
                    noDurLoss: true,
                    noHitEffect: true
                }]],
                p: [-1, false, true],
                // QJBody 在 Shoot 返回后才替换完成，首次检测延到下一帧。
                c: ["T", 1, 20, true]
            }
        ],
        z: "E"
    });
    if (!collision) return null;
    const body = QJ.SAT.makePolygonCompound(originX, originY, polygons);
    if (body) {
        collision.QJBody = body;
        collision._qjKeepCustomCollisionBody = true;
    }
    return collision;
};

// 旋风斩每完成一圈时调用。原地或低位移使用廉价圆形；移动时才固化该圈轨迹。
QJ.MPMZ.tl.lingeringSenpuuGiriCollision = function () {
    if (!this || !this.data) return;
    if (!this.data.trailEffect || this.data.trailEffect.length === 0) return;
    const config = QJ.MPMZ.tl.lingeringTrailCollisionConfig;
    const allPoints = this.dataRem || [];
    const startIndex = Math.max(0, Number(this._lingeringTurnRemIndex) || 0);
    const points = allPoints.slice(startIndex);
    this._lingeringTurnRemIndex = Math.max(0, allPoints.length - 1);
    if (points.length < 2) return;

    const radius = QJ.MPMZ.tl.lingeringTrailRadius(this) * Math.abs(this.scaleY || 1);
    let pathLength = 0;
    for (let i = 1; i < points.length; i++) {
        pathLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    const life = QJ.MPMZ.tl.lingeringTrailLife(this);

    if (pathLength > config.moveThreshold) {
        return QJ.MPMZ.tl.spawnLingeringTrailCollision(this, {
            points,
            life,
            maxSamples: config.spinMaxSamples,
            groupName: "lingeringSenpuuGiriCollision"
        });
    }

    const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const tileSize = Number(QJ.tileSize) || 48;
    const screenCenterX = centerX - $gameMap.displayX() * tileSize;
    const screenCenterY = centerY - $gameMap.displayY() * tileSize;
    let centerDeviation = 0;
    for (const point of points) {
        centerDeviation = Math.max(centerDeviation, Math.hypot(point.x - centerX, point.y - centerY));
    }
    const weaponDamage = Math.floor(
        Number(this._lingeringSwordWaveDamage) || chahuiUtil.getVarianceDamage(1)
    );
    return QJ.MPMZ.Shoot({
        img: "null1",
        groupName: ["lingeringSwordWaveCollision", "lingeringSenpuuGiriCollision"],
        position: [["S", screenCenterX], ["S", screenCenterY]],
        initialRotation: ["S", 0],
        imgRotation: ["S", 0],
        scale: 1,
        opacity: 0,
        anchor: [0.5, 0.5],
        moveType: ["S", 0],
        collisionBox: ["C", radius + centerDeviation + config.edgePadding],
        existData: [
            { t: ["Time", life] },
            {
                t: ["G", ['"enemy"', '"object"']],
                a: ["F", QJ.MPMZ.tl.ex_toEnemyAttack, [weaponDamage, {
                    extraAttack: true,
                    weaponAttack: true,
                    noDurLoss: true,
                    noHitEffect: true
                }]],
                p: [-1, false, true],
                c: ["T", 0, 20, true]
            }
        ],
        z: "E"
    });
};

// 闪步太刀持续读取源刀身留下的 remData，并在挥舞过程中实时扩展复合碰撞。
QJ.MPMZ.tl.updateSenpoTachiLingeringCollision = function () {
    const state = this?._senpoTachiLingeringState;
    if (!state || state.complete) return;
    const source = $gameMap.bulletQJ(state.sourceIndex);
    if (source && source.data && source.dataRem) {
        state.points = source.dataRem.slice();
        state.collisionBox = source.data.collisionBox || state.collisionBox;
    }
    if (state.points.length < 2) {
        if (!source || source.dead || !source.data) state.complete = true;
        return;
    }

    const geometrySource = source && source.data
        ? source
        : { data: { collisionBox: state.collisionBox } };

    const polygons = QJ.MPMZ.tl.makeLingeringTrailPolygons(
        geometrySource,
        state.points,
        this.x,
        this.y,
        state.maxSamples
    );
    const body = QJ.SAT.makePolygonCompound(this.x, this.y, polygons);
    if (body) this.QJBody = body;
    if (!source || source.dead || !source.data) state.complete = true;
};

QJ.MPMZ.tl.startSenpoTachiLingeringCollision = function (source) {
    if (!source || !source.data) return null;
    const config = QJ.MPMZ.tl.lingeringTrailCollisionConfig;
    const trailLife = QJ.MPMZ.tl.lingeringTrailLife(source, 230);
    const timeData = source.data.existData.find(detail =>
        detail && detail.t && detail.t[0] === "Time"
    );
    // 管理器从挥舞开始就存在，因此把挥舞时长也计入总寿命，
    // 保证最后生成的那段可见刀光消失前仍有判定。
    const life = trailLife + (timeData ? Math.max(0, Number(timeData.t[1]) || 0) : 0);
    const damage = Math.floor(
        Number(source._lingeringSwordWaveDamage) || chahuiUtil.getVarianceDamage(1)
    );
    const collision = QJ.MPMZ.Shoot({
        img: "null1",
        groupName: ["lingeringSwordWaveCollision", "lingeringSenpoTachiCollision"],
        position: [["S", source.inheritX()], ["S", source.inheritY()]],
        initialRotation: ["S", 0],
        imgRotation: ["S", 0],
        scale: 1,
        opacity: 0,
        anchor: [0.5, 0.5],
        moveType: ["S", 0],
        collisionBox: ["C", 1],
        existData: [
            { t: ["Time", life] },
            {
                t: ["G", ['"enemy"', '"object"']],
                a: ["F", QJ.MPMZ.tl.ex_toEnemyAttack, [damage, {
                    extraAttack: true,
                    weaponAttack: true,
                    noDurLoss: true,
                    noHitEffect: true
                }]],
                p: [-1, false, true],
                // 构造帧仍是占位 C1，下一帧复合体就绪后再开始检测。
                c: ["T", 1, 20, true]
            }
        ],
        moveF: [[0, 0, QJ.MPMZ.tl.updateSenpoTachiLingeringCollision]],
        z: "E"
    });
    if (!collision) return null;
    collision._qjKeepCustomCollisionBody = true;
    collision._senpoTachiLingeringState = {
        sourceIndex: source.index,
        collisionBox: source.data.collisionBox,
        points: source.dataRem ? source.dataRem.slice() : [],
        maxSamples: config.senpoTachiMaxSamples
    };
    QJ.MPMZ.tl.updateSenpoTachiLingeringCollision.call(collision);
    return collision;
};

// 忍者系技能-天诛触发检查
QJ.MPMZ.tl.ex_skillTenchuuCheck = function() {
	$gamePlayer.drill_EASe_stopAct();
	$gamePlayer.drill_EASe_setSimpleStateNode( ["技能动作1"] );
	QJ.MPMZ.Shoot({
		groupName:['tenchuuCheck'],
        img:"null1",
        position:[['M'],['M']],
        initialRotation:['S',0],
        scale:1,
        moveType:['S',0],
        opacity:1,
        blendMode:0,
        imgRotation:['F'],
        anchor:[0.5,0.5],
        existData:[
            {t:['Time',60],a:['F',QJ.MPMZ.tl.ex_skillTenchuu,[{result:"fail"}]]},
			{t:['G',['"enemy"']],a:['F',QJ.MPMZ.tl.ex_skillTenchuu,[{result:"succeed"}]],c:['S','this.time > 30']},
        ],
		collisionBox:['C',24],
    });
	
    //$gameScreen._particle.particleClear('warp')
};

// 忍者系技能-天诛
QJ.MPMZ.tl.ex_skillTenchuu = function(extraData,args) {
	
	if (extraData.result && extraData.result == "fail") {
		$gameScreen._particle.particleSet(0,'warp','player','warp_hole_c');
	}
	
	
	 if (args && args.target && args.target instanceof Game_Event) {
		 
		 if (extraData.result && extraData.result == "succeed") {
			$gameScreen._particle.particleSet(0,'warp','player','warp_hole_c');
	QJ.MPMZ.Shoot({
		groupName:['tenchuuCheck'],
        img:"null1",
        moveType:['S',0],
		moveJS:[
		     [20,999,"$gameScreen._particle.particleClear('warp');$gamePlayer.drill_EFOE_playHidingVerticalFlat( 10,2, false );"]
		],
        existData:[
            {t:['Time',40],a:['F',QJ.MPMZ.tl.ex_skillTenchuuTeleportation,[args.target]]},
        ],
      });			

		 }
		 
	 }
};

// 忍者系技能-天诛瞬移
QJ.MPMZ.tl.ex_skillTenchuuTeleportation = function(target) {
	
	        if (!target) return;
            var direction = target.direction();
			var posX = target.centerRealX();
			var posY = target.centerRealY();
			
	        switch (direction) {
              case 2: // 下
              posY -= 1; 
              break;
              case 4: // 左
              posX += 1;     
              break;
              case 6: // 右
              posX -= 1;        
              break;
              case 8: // 上
              posY += 1;      
              break;
           }		
			 $gamePlayer.locate(posX, posY);	
			 $gamePlayer.startOpacity(20, 255);
			 $gameScreen._particle.particleGroupSet(0,'weapon_b6','player');
			 $gamePlayer.drill_EASA_setEnabled( true );
	
};

// 古树残骸生长效果
QJ.MPMZ.tl.ex_AncientTreeRemnantEffect = function(enemy) {
    const weapon = $gameParty.leader()?.equips()?.[0];
    if (!weapon) return;

    const durMax = Number(weapon.durMax) || 1;

    // 计算红化造成的耐久倍率；未红化时为 1
    const applications = weapon._rubedoFingerprint?.applications;
    const rubedoMultiplier = Array.isArray(applications)
        ? applications.reduce((result, application) => {
            const boost = Math.max(
                0,
                Number(application?.durabilityBoost) || 0
            );
            return result * (1 + boost / 100);
        }, 1)
        : 1;

    if (enemy) {
        const mapId = $gameMap.mapId();
        const eventId = enemy._eventId;
        const enemyMhp =
            Number($gameSelfVariables.value([mapId, eventId, "MHP"])) || 0;

        // 1%部分已经随当前最大耐久增长，只补偿敌人生命值部分
        const heal = Math.floor(
            durMax * 0.01 + enemyMhp * rubedoMultiplier
        );

        weapon.durability = Math.min(
            (Number(weapon.durability) || 0) + heal,
            114514
        );
    }

    const durability = Number(weapon.durability) || 0;
    const durRate = Math.floor(100 * durability / durMax);

    // 顺便修复低于100%后可能残留攻击加成的问题
    weapon.flatParams[2] = Math.max(0, durRate - 100);
};

// 普通攻击燕返
QJ.MPMZ.tl.meleeAttackTsubameGaeshi = function(initialize) {
    const actor = $gameParty.leader();
    const weapon = actor.equips()[0];
    if (!weapon) return;

    let weaponImage = `weapon/weapon${weapon.baseItemId}`;
    let weaponScale = actor.pdr;
    let weaponDamage = chahuiUtil.getVarianceDamage(1);
    let collisionBox = ['R', 8, 64];
    const noteMatch = weapon?.meta?.['hitBox'];
    if (noteMatch) collisionBox = JSON.parse(noteMatch.replace(/'/g, '"'));
    const attackOptions = {
        noHitEffect: undefined,
        noDurLoss: undefined,
        extraAttack: true,
        weaponAttack: true,
        specifyAddedStatus: undefined,
        addedStatusType: undefined,
        addedStatusChance: undefined,
        addedStatusDamage: undefined
    };

    // 胁差二刀流
    if (initialize === "wakizashi") {
        weaponImage = "weapon/weapon30";
        weaponScale = 0.75;
        weaponDamage = 16;
        attackOptions.specifyAddedStatus = "true";
        attackOptions.addedStatusType = 6;
        attackOptions.addedStatusChance = 2400;
        attackOptions.addedStatusDamage = 6;
        attackOptions.noHitEffect = true;
    }

    // 剑术修行加成
    if (actor.hasSkill(26)) {
        const masteryLevel = $gameActors.actor(1).skillMasteryLevel(26);
        weaponDamage *= (100 + 1.8 ** masteryLevel) / 100;
    }

    const level = actor.skillMasteryLevel(26);
    let angle;
    let time;
    if (level > 4) {
        angle = 25;
        time = 6;
    } else if (level > 2) {
        angle = 16.7;
        time = 9;
    } else {
        angle = 12.5;
        time = 12;
    }

    const reverseDirection = Math.random() > 0.5;
    const rotation = reverseDirection ? -135 : 135;
    const trailRotation = reverseDirection ? -90 : 90;
    const scaleXY = reverseDirection
        ? [-weaponScale, weaponScale]
        : [weaponScale, weaponScale];
    const anchor = [1, 1];
    const z = actor.hasSkill(55) ? "MF_BR" : "MF_BG";
    if (!reverseDirection) angle = -angle;

    // 展示武器演出
    QJ.MPMZ.Shoot({
        img: weaponImage,
        groupName: ['meleeAttack', 'playerSkill'],
        position: [['P'], ['P']],
        initialRotation: ['PD', rotation],
        scale: scaleXY,
        opacity: 0.25,
        hue: 180,
        moveType: ['D', true],
        imgRotation: ['R', angle, true],
        anchor,
        existData: [
            { t: ['Time', time], d: [0, 10] }
        ],
        z,
        collisionBox: ['C', 1]
    });

    // 实际武器碰撞体判定
    QJ.MPMZ.Shoot({
        groupName: ['meleeAttack', 'playerSkill'],
        img: weaponImage,
        position: [['P'], ['P']],
        initialRotation: ['PD', trailRotation],
        scale: [weaponScale, weaponScale],
        moveType: ['D', true],
        opacity: 0,
        imgRotation: ['R', angle, true],
        anchor: [0.5, 0.95],
        existData: [
            { t: ['Time', time] },
            {
                t: ['G', ['"enemy"', '"object"']],
                a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [Math.floor(weaponDamage), attackOptions]],
                p: [-1, false, true]
            },
            {
                t: ['B', 'enemyBullet'],
                p: [-1, false, true, QJ.MPMZ.tl.ex_weaponParry]
            }
        ],
        collisionBox,
        judgeAccuracyRotation: 5
    });
};

//旋风斩燕返
QJ.MPMZ.tl.ex_senpuuGiriTsubameGaeshi = function(GamepadsAttack) {
	
	if(!$gameParty.leader().equips()[0]) return;
		
    var weaponImage = "weapon/weapon" + $gameParty.leader().equips()[0].baseItemId;
    var weaponScale = $gameParty.leader().pdr;
	
    var senpuuGiri = QJ.MPMZ.Shoot({
		groupName:['playerSkill','senpuuGiri'],
        img:weaponImage,
        position:[['P'],['P']],
        initialRotation:['S',-225],
        scale:[-weaponScale,weaponScale],//动态缩放
        moveType:['D',false],
		opacity:0.25,
		hue:180,
        imgRotation:['R','64|5.625~56|6.428~48|7.5~40|9~32|11.25~99999|15',true],//剑的旋转，速度是动态的
        anchor:[1.05,1.05],
        existData:[
		    {t:['S','$gameParty.leader().equips()[0]&&$gameParty.leader().equips()[0].baseItemId==4',true]},
			{t:['S','Fuku_Plugins.EventTremble.getRemainingCycles(-1) === 0',false]},	
            {t:['S','$gameMap.regionId( Math.floor($gamePlayer.centerRealX()), Math.floor($gamePlayer.centerRealY()) ) === 8',true]},				
        ],
        z:"MF_BG",
		collisionBox:['C',1],
    });
	
	QJ.MPMZ.tl.ex_senpuuGiriTrail.call(senpuuGiri);
		//读取操作模式
    if (GamepadsAttack) {
		var AnyPadReleased = "Input.drill_isPadPressed('右摇杆上')||Input.drill_isPadPressed('右摇杆下')||Input.drill_isPadPressed('右摇杆左')||Input.drill_isPadPressed('右摇杆右')";
		senpuuGiri.addExistData({t:['S',AnyPadReleased,false]});
	} else {
		senpuuGiri.addExistData({t:['S','!TouchInput.drill_isRightPressed()||!$gameParty.leader().equips()[0]',true]});
	}
	
		//柳叶剑特效
	if ($gameParty.leader().equips()[0].baseItemId === 80) {
		senpuuGiri.addMoveData("F",[10,10,QJ.MPMZ.tl.ex_willowLeafEffects,["senpuuGiri"]]);
	}
	//斩裂剑-斩剑波
	if ($gameParty.leader().hasSkill(44)) {
		senpuuGiri.addMoveData("JS",[64,99999,'QJ.MPMZ.tl.ex_swordEnergyAttack.call(this, undefined, 1)']);
		senpuuGiri.addMoveData("JS",[120,99999,'QJ.MPMZ.tl.ex_swordEnergyAttack.call(this, undefined, 1)']);
		senpuuGiri.addMoveData("JS",[168,99999,'QJ.MPMZ.tl.ex_swordEnergyAttack.call(this, undefined, 1)']);
		senpuuGiri.addMoveData("JS",[208,99999,'QJ.MPMZ.tl.ex_swordEnergyAttack.call(this, undefined, 1)']);
		senpuuGiri.addMoveData("JS",[240,24,'QJ.MPMZ.tl.ex_swordEnergyAttack.call(this, undefined, 1)']);
	}		
};

//旋风斩燕返判定
QJ.MPMZ.tl.ex_senpuuGiriTsubameGaeshiTrail = function() {
	
    var weaponImage = "weapon/weaponTrail" + $gameParty.leader().equips()[0].baseItemId;
    var weaponScale = $gameParty.leader().pdr;
	var weaponDamage = chahuiUtil.getVarianceDamage(1);

	// 安卓版刀光会报错
	let TrailEffect = [];

    if (!Utils.isMobileDevice()) {
        TrailEffect = [{
            img:['L',0.5,1,0,0.999999999,0.2,0,0,0],
            existTime:0,
			blendMode:1,
			alpha:Talpha,
            disappearTime:20,
            imgStretchMode:0,
			ifProjctileWait:true,
            hOrV:true,
        }];
    }
	
    QJ.MPMZ.Shoot({
		groupName:['playerSkill','senpuuGiriTrail'],
        img:weaponImage,
        position:[['P'],['P']],
        initialRotation:['S',-180],
        scale:weaponScale,//动态缩放
        moveType:['B',-1,0,0,0,0,0,0,0,0],
		opacity:0,
        imgRotation:['R','64|5.625~56|6.428~48|7.5~40|9~32|11.25~99999|15',true],//剑的旋转，速度是动态的
        anchor:[0.5,1],
        existData:[
			//{t:['G',['"enemy"','"object"']],a:['C',155,[weaponDamage,0,0,0]],p:[-1,true,true]},
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[weaponDamage,{extraAttack:true, weaponAttack:true}]],p:[-1,false,true]},
            {t:['BE',this.index]},      
            {t:['B','enemyBullet'],p:[-1,false,true,QJ.MPMZ.tl.ex_weaponParry]}			
        ],
        z:"E",
		collisionBox:['R',8,64],
        judgeAccuracyRotation:10,
        trailEffect:TrailEffect,
    });
};

// 旋风斩-回旋镖效果
QJ.MPMZ.tl.ex_senpuuGiriReturnToPlayer = function(args) {
	
    let posX = this.inheritX();
    let posY = this.inheritY();
	let angle = this.inheritRotation();
	let zz,Talpha;	
    let weaponImage = "weapon/weaponTrail" + $gameParty.leader().equips()[0].baseItemId;
    let weaponScale = this.scaleX;
	let weaponDamage = Math.round(0.5 * chahuiUtil.getVarianceDamage(3));	
    $gameMap.chahuiMapTemp.DensHandScytheCount = $gameMap.chahuiMapTemp.DensHandScytheCount || 0;
    weaponDamage +=  Math.round($gameMap.chahuiMapTemp.DensHandScytheCount * chahuiUtil.getVarianceDamage(3));
	if ($gameParty.leader().hasSkill(38)) {
		weaponDamage = Math.floor(1.5 * weaponDamage);
	}
    if ($gameParty.leader().hasSkill(55)) {
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
            img:['L',0.5,1,0,0.999999999,0.4,0,0,0],
            existTime:0,
			blendMode:1,
			alpha:Talpha,
            disappearTime:10,
            imgStretchMode:0,
            hOrV:true
        }];
    }
    
    let senpuuGiri = QJ.MPMZ.Shoot({
		groupName:['playerBullet','SenpuuGiri','weaponMarker'],
        img:weaponImage,
        position:[['S',posX],['S',posY]],
        initialRotation:['M'],
		imgRotation:['S',angle],
        scale:weaponScale,
        imgRotation:['R',45,true],
        anchor:[0.5,0.5],
        existData:[
            {t:['Time',600]},
			{t:['S',"!$gameParty.leader().equips()[0]",true]},
			{t:['P'],a:['S',"$gameMap.steupCEQJ(163,1,{rotation:8,removeStun:true})"],d:[1,30,1.2],cb:['C',2]},
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[weaponDamage,{weaponAttack:true}]],p:[-1,false,true]},
        ],
		moveType:['TP',8,12+Math.randomInt(36),12+Math.randomInt(36)],
        z:zz,
		collisionBox:['R',8,64],
        judgeAccuracyRotation:12,
		moveF:[
		],
        trailEffect:TrailEffect,
		deadJS:["AudioManager.fadeOutBgsByLine(1,9);$gameSwitches.setValue(182, false);"]
    });	
};

// 巨大蟹钳-夹住目标
QJ.MPMZ.tl.ex_giantCrabClawGrabsEnemy = function(args) {

  if (args && args.target && args.target instanceof Game_Event) {

    let weaponId = $gameParty.leader().equips()[0].id;
	$gameParty.leader().changeEquipById(1, 4);
    $gameMap.steupCEQJ(100,1,{equipChange:true,equipIndex:-1});
	let diffX = this.inheritX() - args.target.screenBoxXShowQJ();
	let diffY = this.inheritY() - args.target.screenBoxYShowQJ();
	
	let target = args.target._eventId;
    let posX = `if($gameMap.event(${target})){
                    $gameMap.event(${target}).screenBoxXShowQJ()+${diffX};
                } else {
                    $gameMap.displayX();
                }`;

    let posY = `if($gameMap.event(${target})){
                    $gameMap.event(${target}).screenBoxYShowQJ()+${diffY};
                } else {
                    $gameMap.displayX();
                }`;
    let angle = this.inheritRotation()+180;
    let weaponImage = "weapon/weaponTrail14";
    let weaponScale = this.scaleX;
	let damage = Math.abs($dataWeapons[weaponId].params[2] * weaponScale);

	QJ.MPMZ.Shoot({
		groupName:['playerBullet','giantCrabClaw'],
        img:weaponImage,
        position:[['S',posX],['S',posY]],
        initialRotation:['S',angle],
        scale:weaponScale,
        imgRotation:['F'],
		countDown:4,
        anchor:[0.5,0.75],
        existData:[
		    {t:['Time',7200],a:['F',QJ.MPMZ.tl.ex_giantCrabClawDrops,[weaponId]]},
			{t:['S',`$gameSelfSwitches.value([${$gameMap.mapId()}, ${target}, 'D'])||$gameMap.event(${target})`,true],a:['F',QJ.MPMZ.tl.ex_giantCrabClawDrops,[weaponId]]},
			{t:['S','this.data.countDown<=0',true],a:['F',QJ.MPMZ.tl.ex_giantCrabClawDrops,[weaponId]]},
			{t:['G',['"enemy"','"object"']],a:['S','this.data.countDown+=1'],p:[-1,false,true],c:['T',0,15,true]},
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[damage,{noHitEffect:true,noDurLoss:true,specifyAddedStatus:true,addedStatusType:0}]],p:[-1,false,true],c:['T',0,15,true]},
        ],
		moveType:['D',true],
        z: 10,
		collisionBox:['R',6,48],
		moveJS:[
		  [0,15,'this.data.countDown-=1']
		],

    });
	
	$gameParty.loseItem($dataWeapons[weaponId], 1);
  }
};

// 蟹钳松了，返还武器
QJ.MPMZ.tl.ex_giantCrabClawDrops = function(weaponId) {
	
    let weapon = $dataWeapons[weaponId];
	let dropX = this.x / 48;
	let dropY = this.y / 48;
    dingk.Loot.specifyPositionGetMapDrops(dropX,dropY,weapon);
};


// 剑刃风暴
QJ.MPMZ.tl.ex_skillBladestorm = function() {
	
   if (!this) return;
   let user;
   if (this instanceof Game_Player) {
	   user = -1;
   }
   if (this instanceof Game_Event) {
	   user = this._eventId;	   
   }    
   
   let posX = this.screenShootXQJ();
   let posY = this.screenShootYQJ();
   
   var damage = 15;
   
   var bladestorm = QJ.MPMZ.Shoot({
		groupName:['bladestorm'],
        img:"Magic/air_start[7,3]",
        position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
        scale:1,
        imgRotation:['S',0],
        anchor:[0.4,0.7],
		opacity:0.6,
        existData:[
		    {t:['Time',180],a:['F',QJ.MPMZ.tl.ex_skillBladestormFinish]},
			{t:['R',[255]],a:['F',QJ.MPMZ.tl.ex_skillBladestormFinish],c:['S','this.time>22']},
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[damage,{noHitEffect:true,noDurLoss:true,specifyAddedStatus:true}]],p:[-1,false,true],c:['T',0,10,true]},
        ],
		moveType:['TP',4,2,10],
        z:"MF_UG",
		collisionBox:['R',20,48],
		moveJS:[
		  [20,9999,"this.changeAttribute('img','Magic/air_loop[6,3]')"]
		],
		moveF:[
		  [6,6,QJ.MPMZ.tl.ex_skillBladestormEffect]
		]
    });  
	
	if (user > 0) {
		bladestorm.addExistData();
	} else {
		bladestorm.addExistData({t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[damage,{magicAttack:true,noHitEffect:true,noDurLoss:true,specifyAddedStatus:true}]],p:[-1,false,true],c:['T',0,10,true]});
	}
	
};

// 剑刃风暴的粒子效果
QJ.MPMZ.tl.ex_skillBladestormEffect = function() {
	
   let posX = this.x / 48;
   let posY = this.y / 48;
   var name = "dust_walk" + this.time;
   var data = $gameScreen._particle.particleSet(0, name, 'tilemap', 'dust_walk', 'below', posX, posY);   
   $gameScreen._particle.reservePluginCommand(30,{},["clear",name],1);
   
   if ($gameMap.regionId(Math.floor(posX), Math.floor(posY)) === 5) {
      var name = "grass_walk" + this.time;
      var data = $gameScreen._particle.particleSet(0, name, 'tilemap', 'grass_walk', 'below', posX, posY);   
      $gameScreen._particle.reservePluginCommand(30,{},["clear",name],1);	   
   }
   
};

// 剑刃风暴结束
QJ.MPMZ.tl.ex_skillBladestormFinish = function() {
	
    let posX = this.inheritX();
    let posY = this.inheritY();
	let scale = this.scaleX;
   
 	QJ.MPMZ.Shoot({
		groupName:['bladestorm'],
        img:"Magic/air_dismiss[6,3]",
        position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
        scale:scale,
        imgRotation:['F'],
        anchor:[0.5,0.5],
        existData:[
		    {t:['Time',17]},
        ],
		moveType:['S',0],
        z:"MF_UG",
		collisionBox:['C',10],
    }); 	
};


// 日轮：陨石术（直接召唤）
QJ.MPMZ.tl.ex_meteorStrike = function(posX, posY) {
     
   if (!posX && !posY) {
     function randPointInCircle(cx, cy, R) {
       const a = Math.random() * Math.PI * 2;   // 随机角度
       const r = Math.sqrt(Math.random()) * R;  // 半径要开方，保证均匀分布
       const x = Math.round(cx + r * Math.cos(a));
       const y = Math.round(cy + r * Math.sin(a));
       return { x, y };
     }
	 
	 const playerX = $gamePlayer.screenBoxXShowQJ();
	 const playerY = $gamePlayer.screenBoxYShowQJ();
     const p = randPointInCircle(playerX, playerY, 250);
     posX = p.x;
     posY = p.y;
   }
   var seNames = "Magic2";
   var randomPitch = Math.randomInt(40) + 61;
   var se = { name: seNames, volume: 70, pitch: randomPitch, pan: 0 };
   AudioManager.playSe(se);
   
   var chargeCounter = 200 + Math.randomInt(300);
   
   var baseSize = 0.2;
   var maxCorrection = 2.8;
   var correctionValue = (chargeCounter / 6000) * maxCorrection; 
   var extraSize = ($gameParty.leader().mdr - 1) * 0.25;     
   var finalSize = correctionValue + baseSize + extraSize;
   var magicScale = '0|0~60/' + baseSize + '~9999|' + baseSize;
   var circleName = "meteorStrikeCircle" + $gameMap.getGroupBulletListQJ('meteorStrikeCircle').length + 1;
   var moveType = ['S',0];
   
   if ($gameParty.leader().hasSkill(41)) {
       moveType = ['TG','"enemy"',0.5,2];
   }   
   
   var circle = QJ.MPMZ.Shoot({
        img:"MeteorStrikeCircle[5,15,2]",
		groupName:['meteorStrikeCircle','magic','Circle',circleName],
        position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
		collisionBox:['C',4],
        imgRotation:['S',0],
        scale:finalSize,
		anchor:[0.5,0.5],
        opacity:1,
        moveType:moveType,
        blendMode:1,
        existData:[	
		    {t:['Time',600]},
		    {t:['B','meteorStrikeCircle']},
        ],
        z:"E"
    });	
   if (!circle) return;
   var posX = circle.inheritX() + (Math.randomInt(600) - 300);	
   var posY = circle.inheritY() - 1200;	
   var index = circle.index;
       magicScale = circle.scaleX * 3;
   var deadCode = `$gameMap.bulletQJ(${index}).setDead({t:['Time',0],d:[0,30]})`;
   var speed = 5;
       speed += $gameParty.leader().cnt * 5;
	   moveType = ['S',speed];
   if ($gameParty.leader().hasSkill(41)) {
       moveType = ['TB',circleName,speed,6];
   }

	   
	    QJ.MPMZ.Shoot({
        img: ['A', 130, -1],
		groupName:['meteorStrikeBullet','magic'],
        position:[['S',posX],['S',posY]],
        initialRotation:['BT', index],
        imgRotation: ['F', -180],
		collisionBox:['C', 40],
        scale:magicScale,
        opacity:1,
		anchor:[0.5,0.3],
		moveType:moveType,
        blendMode:0,
        existData:[	
		    {t:['B',circleName]},
		    {t:['Time',600]},
		    {t:['BE',index]},
        ],
        z:"MF_UG",
		deadF:[[QJ.MPMZ.tl.ex_meteorStrikeBoom, [360]]],
		deadJS:[deadCode]		
    });

};

//旋风斩派生-穿刺击退
QJ.MPMZ.tl.ex_spiralThrust = function(weaponDamage, initialize, args) { 

  const target = args && args.target;
  if (!(target instanceof Game_Event)) return;
  
	  let fudou = $gameSelfVariables.value([$gameMap.mapId(), target.eventId(), 'fudou']);
	  this._coolDown = this._coolDown || 0;
	  if (this._coolDown > 0) {
	     this._coolDown -= 1;
	  }	else {
		 QJ.MPMZ.tl.ex_toEnemyAttack.call(this, weaponDamage,{weaponAttack:true}, args);
		 this._coolDown = 20;
	  }
	  if (fudou > 90) return;
	  
	  if (initialize && initialize === "fixed") {
	     this._orgX = this._orgX || target._x;
	     this._orgY = this._orgY || target._y;
         target.locate(this._orgX, this._orgY);	
         return;		 
	  }
	  
	  this._disX = this._disX || this.x;
	  this._disY = this._disY || this.y;
	  
	  let disX = this.x - this._disX;
	  let disY = this.y - this._disY;	  
	  let posX = target._x + (disX / 55);
	  let posY = target._y + (disY / 55);
	  target.locate(posX, posY);
      this._disX = this.x;
	  this._disY = this.y;

};

//旋风斩派生-钉在墙上
QJ.MPMZ.tl.ex_senpuuGiriWallPinned = function(chargeTime,args) {
	
	if(!$gameParty.leader().equips()[0]) {
	AudioManager.fadeOutBgsByLine(1,9);
	$gameSwitches.setValue(182, false);	
	return;
	}
	
    let posX = this.inheritX();
    let posY = this.inheritY();
    let angle = this.inheritRotation();
	let zz,Talpha;
    let weaponImage = "weapon/weaponTrail" + $gameParty.leader().equips()[0].baseItemId;
    let weaponScale = this.scaleX;
	let weaponDamage = Math.round(0.5 * chahuiUtil.getVarianceDamage(1));
  	
	if ($gameParty.leader().hasSkill(38)) {
		weaponDamage = Math.floor(1.5 * weaponDamage);
	}
	let time = 60;
	if (chargeTime && chargeTime > 30) {
	    time += Math.min(Math.round(chargeTime/6),210);
	}
	$gameSwitches.setValue(182, true);
	// 克里乌之光
    if ($gameParty.leader().hasSkill(55)) {
		zz = "MF_BR";
		Talpha = 0.1;
	} else {
		zz = "E";
		Talpha = 0.75;
	}	
	
    var senpuuGiriWallPinned = QJ.MPMZ.Shoot({
		groupName:['playerBullet','SenpuuGiri','weaponMarker'],
        img:weaponImage,
        position:[['S',posX],['S',posY]],
        initialRotation:['S',angle],
		imgRotation:['F',180],
        scale:weaponScale,
        anchor:[0.5,0.5],
        existData:[
            {t:['Time',time]},
			{t:['S',"!$gameParty.leader().equips()[0] || $gameParty.leader().equips()[0].baseItemId == 4",true]},
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[weaponDamage,{weaponAttack:true}]],p:[-1,false,true]},
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_spiralThrust,[weaponDamage,"fixed"]],p:[-1,true,true],c:['T',0,0,true]}
        ],
		moveType:['S',0],
        z:zz,
		collisionBox:['R',8,64],
        judgeAccuracyRotation:12,
		moveF:[
		],
		deadJS:["$gameSwitches.setValue(182, false)"]
    });

	//柳叶剑特效
	if ($gameParty.leader().equips()[0].baseItemId === 80) {
		senpuuGiriHold.addMoveData("F",[5,5,QJ.MPMZ.tl.ex_willowLeafEffects,["senpuuGiriHold"]]);
	}
	
};

// 赫拉克勒斯的断角
QJ.MPMZ.tl.herculesBrokenHornEffectProcess = function (extra = {}) {
	
	let base = 30;
	const leader = $gameParty.leader();
    const weapon = leader.equips()[0];
	if (!weapon) return base;
	
	let attack   = weapon.params[2] + weapon.flatParams[2];
	attack      += leader.paramFlat(2);
	
	base         = Math.max(30, attack);
	return base;
};


// 鹿管-时间到了
QJ.MPMZ.tl.ItsTimeEffect = function (extra = {}) {
    let leader = $gameParty.leader();
    if (extra.trigger) {
        $gamePlayer.refresh();
        leader.states();
        $gamePlayer.requestAnimation(173);
        let randomSeArray = ["ThatRemindsMe~", "It’sTime~"];
        let randomSe = randomSeArray[Math.floor(Math.random() * randomSeArray.length)];   
        let random = 90 + Math.randomInt(20);
        AudioManager.playSe({ name: randomSe, volume: 100, pitch: random, pan: 0 });
        return;
    }

    if ($gameSystem.minute() === 0) {
        if (leader.isStateAffected(118)) return;
        QJ.MPMZ.tl.ItsTimeEffect({trigger:true});
    }
};

// 恶魔眼球-真视效果
QJ.MPMZ.tl.DemonEyeballEffect = function (extra = {}) {

    if (extra.clearEffect) {
        $gameScreen._particle.particleClear("tag:trueSightEye");
        return;
    }

    const particle = $gameScreen._particle;
    // 显现隐藏通道
    particle.particleSet(0, 'revealHiddenPassage', 'region:240', 'trueSightEye');
    particle.particleTag('revealHiddenPassage', 'trueSightEye');
    // 显现隐藏可互动实体
    const hiddenItem = $gameMap.drill_COET_getEventsByTag_direct("hiddenItem");
    if (hiddenItem.length > 0) {
        for (let Item of hiddenItem) {
             let xx   = Math.floor(Item.centerRealX());
             let yy   = Item.centerRealY();
             let name = 'hiddenItem' + Item._eventId;
             particle.particleSet(0, name, 'tilemap', 'trueSightEye', 'above', xx, yy);
             particle.particleTag(name, 'trueSightEye');
        }
    }
};

// 支配者的凝视效果
QJ.MPMZ.tl.GazeOfTheRulerPassiveEffect = function (extra = {}, args) {
    const stateId = 92;

    // 只判定被动是否激活
    if (extra.envDetector) {
        const player = $gamePlayer;
        const onWater = player._characterName === "$player_swim";
        const isWaterlogged = this.isStateAffected(93);
        return !!(onWater || isWaterlogged);
    }

    if (extra.effectsOnMonsters) {
        const target = args && args.target;
        if (!(target instanceof Game_Event)) return;
        if (!target._canBeAlerted || target._enemyState === 3) return;
        if (target._enemyState === 2) {
            // 概率令其恐惧
            let chance = 0.01 + this.data.stacks * 0.03;
            if (Math.random() < chance) {
                target.requestAnimation(216);
                setTimeout(() => QJ.MPMZ.tl.ex_enemyInFear(target, {}), 200);
            }
            return;
        }
        target.enterChaseState();
        return;
    }
  
    if (extra.applyParams) {
        const stacks = this.passiveStateStacks(stateId);  
        const state = $dataStates[stateId];
        state.flatXParams[1] = 0.15 + stacks * 0.25;  // 强化移速
        state.flatXParams[6] = 0.05 + stacks * 0.2;   // 强化攻速             
    }

    // 范围怪物仇恨变化
    const groupName = "GazeOfTheRuler";
    let stacks = $gameParty.leader().passiveStateSourceCount(stateId);
    QJ.MPMZ.deleteProjectile(groupName);
    QJ.MPMZ.Shoot({
            groupName: [groupName],
            position: [['P'],['P']],
            initialRotation: ["S", 0],
            imgRotation: ["S", 0],
            moveType: ['D', true],
            opacity: 1,
            stacks,
            collisionBox: ['C', 200],
            scale: 0.5 + stacks * 0.5,		 
            existData: [ 
                {
                    t: ['G', ['"enemy"']],
                    c: ['T', 0, 30], p: [-1, false, true],
                    a: ['F', QJ.MPMZ.tl.GazeOfTheRulerPassiveEffect, [{effectsOnMonsters: true}]]
                },   
            ]
    });     
};
