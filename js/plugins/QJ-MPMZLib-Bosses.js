//=============================================================================
//
//=============================================================================
/*:
 * @target MV MZ
 * @plugindesc [弹幕模板库][BOSS模板]
 * @author 仇九
 *
 * @help 
 * 
 *
 */
//=============================================================================
//
//=============================================================================

// 换图时QJ直接清空掠袭子弹，不执行消失回调，因此同步结束该技能的循环音效。
(() => {
    const setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        AudioManager.stopVoice(null, 'dragonGirlFlyby');
        return setup.apply(this, arguments);
    };
})();

// 龙娘登场：二方向行走图朝右(6)从左上方飞入，朝左(4)从右上方飞入。
// 按当前镜头缩放计算屏幕外起点；目标只采样一次，默认180帧停在玩家上方2格。
QJ.MPMZ.tl.ex_dragonGirlEntrancePlan = function(direction = 6, extra = {}) {
    direction = direction === 4 ? 4 : 6;
    const zoom = $gameScreen.zoomScale();
    const screenOffsetX = Math.round(-$gameScreen.zoomX() * (zoom - 1)) + Math.round($gameScreen.shake());
    const screenEdgeX = ((direction === 4 ? Graphics.width : 0) - screenOffsetX) / zoom;
    const startX = $gameMap.displayX() + (screenEdgeX + (direction === 4 ? 128 : -128)) / $gameMap.tileWidth() - 0.5;
    const targetX = Math.max(0, Math.min($gameMap.width() - 1, $gamePlayer.centerRealX() - 0.5));
    const targetY = Math.max(0, Math.min($gameMap.height() - 1, $gamePlayer.centerRealY() - 2.5));
    const entryHeight = extra.entryHeight ?? 192;
    return {
        direction, startX, startY: targetY - entryHeight / $gameMap.tileHeight(), targetX, targetY,
        duration: extra.duration ?? 180, entryHeight
    };
};

// 常规召唤入口，返回动态事件ID。示例：QJ.MPMZ.tl.ex_spawnDragonGirl(6);
// 可选第二参数 {duration:180, entryHeight:192}：总帧数、起点高于停靠点的地图像素数。
QJ.MPMZ.tl.ex_spawnDragonGirl = function(direction = 6, extra = {}) {
    const entrance = QJ.MPMZ.tl.ex_dragonGirlEntrancePlan(direction, extra);
    return $gameMap.spawnEventQJ(1, 124, entrance.startX, entrance.startY, false, {
        _direction: entrance.direction, _dragonEntrance: entrance
    });
};

// 第一页自动执行：初始化后，每帧调用 {step:true}，抵达时返回true再进入对话。
QJ.MPMZ.tl.ex_dragonGirlEntrance = function(extra = {}) {
    const event = $gameMap.event(this._eventId);
    if (!event) return true;
    if (!extra.step) {
        // 直接用spawnEventQJ召唤时也可运行；推荐用上面的入口避免初始位置闪现。
        const entrance = event._dragonEntrance || QJ.MPMZ.tl.ex_dragonGirlEntrancePlan(event.direction());
        // 第一页也可传入参数覆盖本次登场；不读取事件移速或DotMove的Dpf。
        entrance.duration = Math.max(1, Math.round(extra.duration ?? entrance.duration ?? 180));
        entrance.entryHeight = extra.entryHeight ?? entrance.entryHeight ?? 192;
        entrance.startY = entrance.targetY - entrance.entryHeight / $gameMap.tileHeight();
        entrance.frame = 0;
        event._dragonEntrance = entrance;
        event.cancelMove();
        event.setThrough(true);
        event.setDirectionFix(false);
        event.setDirection(entrance.direction);
        event.setDirectionFix(true);
        event.setPosition(entrance.startX, entrance.startY);
        // 飞入时不叠加上下摆动，接近目标后逐渐恢复到常规±6px悬浮。
        event.drill_ECE_playSustainingFloating(60 * 60 * 60 * 24 * 100, 20, 8, 120, 0);
        return false;
    }
    const entrance = event._dragonEntrance;
    if (!entrance) return true;
    const time = Math.min(++entrance.frame / entrance.duration, 1);
    // 前65%时间推进，最后35%时间平滑减速到零；总行程归一化到1。
    const brakeStart = 0.65, brakeTime = 1 - brakeStart;
    const u = (time - brakeStart) / brakeTime;
    const progress = (time <= brakeStart ? time : brakeStart + brakeTime * (u - u * u / 2)) /
        (brakeStart + brakeTime / 2);
    const hoverBlend = Math.max(0, Math.min(u, 1));
    event._Drill_ECE.fB_scope = 6 * hoverBlend * hoverBlend * (3 - 2 * hoverBlend);
    // 屏幕外起点可能超出地图边界，登场期间直接插值坐标，避免DotMove边界挡住飞入。
    if (time >= 1) {
        event.setPosition(entrance.targetX, entrance.targetY);
        delete event._dragonEntrance;
        return true;
    }
    event.setPosition(
        entrance.startX + (entrance.targetX - entrance.startX) * progress,
        // 二次曲线：控制点在横向中点、目标高度，末端切线自然变为水平。
        entrance.targetY + (entrance.startY - entrance.targetY) * (1 - progress) ** 2
    );
    return false;
};

// 龙娘浅羽：在进入喷火状态时调用一次，duration 为持续发射帧数。
// 普通：QJ.MPMZ.tl.ex_dragonGirlFlameBullet.call(this, {duration:180});
// 大型：QJ.MPMZ.tl.ex_dragonGirlFlameBullet.call(this, {large:true, duration:180});
// 提前收招：QJ.MPMZ.tl.ex_dragonGirlFlameBullet.call(this, {stop:true});
// 被控制中断：{stop:true, interrupt:true}，空中已喷出的火焰随即消散且不再伤人（弹反火焰除外）。
// 固定向下喷射；damage 为魔法基础伤害，mouthX/mouthY 为相对贴图嘴部的微调（像素）。
// 判定弹属于 fire 组（火属性），可引爆杀虫剂毒雾、毒雾瓶粉尘，烧掉诱饵；淡出后退出 fire 组。
QJ.MPMZ.tl.ex_dragonGirlFlameBullet = function(extra = {}, args) {
    const flame = QJ.MPMZ.tl.ex_dragonGirlFlameBullet;

    if (extra.soundStop) {
        AudioManager.stopVoice(null, extra.channel);
        return;
    }

    if (extra.particleSetup) {
        if (this.deadOver || this._dragonFlameFading) return;
        const particle = $gameScreen._particle;
        if (!particle) return;
        const id = `dragonGirlFlame_${$gameMap.mapId()}_${this.index}`;
        const data = particle.particleSet(
            0, id, `QJBullet:${this.index}`,
            extra.large ? 'dragonGirlLargeFlameMist' : 'dragonGirlFlameMist',
            1, 0, 0, 'smog2,smoke2,smoke1'
        );
        // QJ 构造期间还没有可绑定的弹幕 Sprite，成功后才停止重试。
        if (!data) return;
        this.data.dragonFlameParticleId = id;
        if (extra.particleSpeed) particle.particleUpdate([id, 'speed', ...extra.particleSpeed]);
        // 先在喷口绑定可见粒子，再开始飞行，避免绑定前已向下移动数十像素。
        this.data.moveType = ['S', this.data.dragonFlameSpeed];
        args[4] = -2;
        return;
    }

    if (extra.particleFade) {
        if (!this.data.dragonFlameParticleId) return;
        const movement = this.data.moveType[2];
        if (!movement || movement.speed > 0) return;
        const id = this.data.dragonFlameParticleId;
        if (id) $gameScreen._particle.particleClear(id, false);
        // 粒子自然淡出期间保留载体，但不再造成伤害，也不再作为火源点燃毒雾。
        this._dragonFlameFading = true;
        $gameMap.deleteMapBulletsNameQJ(this.index, ['fire']);
        args[4] = -2;
        return;
    }

    if (extra.hit || extra.hitEvent) {
        if ((!this.data.dragonFlameParticleId && !this.data.dragonFlameVisualReady) || this._dragonFlameFading) return;
        // 使用子弹自身伤害，兼容球棒弹反对data.damage的增幅。
        const damage = this.data.damage ?? extra.damage;
        if (extra.hitEvent) {
            QJ.MPMZ.tl.ex_toEnemyAttack.call(this, damage, {
                nonPlayerDamage: true, magicAttack: true,
                // 弹反会设置_countered和data.nonPlayerDamage=false，允许火焰伤到龙娘。
                immuneItself: this._countered ? 0 : this.data.eid,
                noHitEffect: true, noDurLoss: true, independentAttack: true,
                specifyAddedStatus: true, addedStatusType: 0
            }, args);
        } else if (!this._countered) {
            QJ.MPMZ.tl.ex_playerDamageCheck.call(this, damage, 2);
        }
        return;
    }

    const eid = extra.eid ?? this._eventId;
    const controllerGroup = `dragonGirlFlameController${eid}`;
    const soundChannel = `dragonGirlFlame_${$gameMap.mapId()}_${eid}`;
    if (extra.stop) {
        // deleteProjectile 的直接销毁不执行 deadF，主动收招需在这里停声。
        AudioManager.stopVoice(null, soundChannel);
        QJ.MPMZ.deleteProjectile(controllerGroup);
        if (extra.interrupt) {
            for (const index of $gameMap.getGroupBulletListQJ('dragonGirlFlame')) {
                const bullet = $gameMap.bulletQJ(index);
                if (!bullet || bullet.data.eid !== eid || bullet._countered || bullet._dragonFlameFading) continue;
                // 与速度归零时相同：粒子停发后自然淡出，载体保留到Time结束但不再判定；未绑定粒子的不再绑定。
                if (bullet.data.dragonFlameParticleId) $gameScreen._particle.particleClear(bullet.data.dragonFlameParticleId, false);
                delete bullet.data.dragonFlameParticleId;
                bullet._dragonFlameFading = true;
                $gameMap.deleteMapBulletsNameQJ(bullet.index, ['fire']);
            }
        }
        return;
    }
    const event = $gameMap.event(eid);
    if (!event || event._erased || $gameSelfSwitches.value([$gameMap.mapId(), eid, 'D'])) {
        if (extra.thrower) {
            AudioManager.stopVoice(null, soundChannel);
            this.setDead();
        }
        return;
    }

    if (extra.thrower) {
        const large = extra.large;
        const sprite = SceneManager._scene._spriteset._characterSprites.find(s => s._character === event);
        if (!sprite || !sprite._frame.height) return;
        // 动画序列37每个方向为100×100：普通喷火嘴部约(50,62)，大型约(50,56)。
        // 使用当前贴图的锚点、缩放和位置，包含跳跃/悬浮产生的显示偏移。
        const mouthX = sprite.x + (50 - sprite.anchor.x * sprite._frame.width) * sprite.scale.x + extra.mouthX;
        const mouthY = sprite.y + ((large ? 56 : 62) - sprite.anchor.y * sprite._frame.height) * sprite.scale.y + extra.mouthY;
        const number = large ? 3 : 2;
        const spread = large ? 10 : 6;
        const initialSpeed = (large ? 27 : 18) + Math.randomInt(3);
        // 普通明显减速、大型略微减速；延长飞行时间，保持普通短、大型远的射程差。
        const speed = large
            ? `0|${initialSpeed}~27/20~27/7~14/0~999|0`
            : `0|${initialSpeed}~16/13~22/4~14/0~999|0`;
        // 固定以正下方（180°）为中心；补偿 ArcRange 不包含右端点的半个间隔。
        return QJ.MPMZ.Shooter_ArcRange(['S', 180 + spread / number], {
            groupName: ['enemyBullet', 'dragonGirlFlame', 'fire'],
            eid,
            damage: extra.damage,
            nonPlayerDamage: true,
            position: [
                ['S', mouthX],
                ['S', mouthY]
            ],
            img: 'null1', opacity: 0,
            moveType: ['S', 0],
            dragonFlameSpeed: speed,
            anchor: [0.5, 0.5],
            collisionBox: ['C', large ? 44 : 32],
            existData: [
                // 速度归零后预留 30 帧，容纳最长 0.32 秒的粒子淡出。
                {t: ['Time', large ? 100 : 84]},
                {t: ['P'], a: ['F', flame, [{hit: true}]], p: [-1, false, true]},
                {t: ['G', ['"enemy"', '"object"']], a: ['F', flame, [{hitEvent: true}]], p: [-1, false, true]}
            ],
            moveF: [
                [1, 0, flame, [{particleSetup: true, large}]],
                [1, 0, flame, [{particleFade: true}]]
            ]
        // 每批在各自的角度区间内随机取样，填满扇形，避免形成几条分离的烟柱。
        }, -spread, spread, number, 2 * spread / number, 1, 1.15);
    }

    QJ.MPMZ.tl.ex_dragonGirlFlamePresets();

    // 同一事件重复调用时重新计时，避免叠加多个发射器。
    AudioManager.stopVoice(null, soundChannel);
    QJ.MPMZ.deleteProjectile(controllerGroup);
    const controller = QJ.MPMZ.Shoot({
        groupName: [controllerGroup],
        position: [['S', 0], ['S', 0]],
        img: 'null1', opacity: 0,
        moveType: ['S', 0],
        existData: [{t: ['Time', extra.duration ?? 180]}],
        deadF: [[flame, [{soundStop: true, channel: soundChannel}]]],
        // 每隔 2 帧发射一批，比玩家冰焰、毒雾的发射间隔更短。
        moveF: [[0, 1, flame, [{
            thrower: true, eid, large: !!extra.large,
            damage: extra.damage ?? (extra.large ? 40 : 24),
            mouthX: extra.mouthX ?? 0,
            mouthY: extra.mouthY ?? -10
        }]]]
    });
    if (controller) {
        AudioManager.playVoice({
            isSE: true,
            name: extra.large ? '火炎放射器：ヘビーブラスト' : '火炎放射・火柱や火災１０',
            volume: extra.large ? 80 : 55,
            pitch: extra.large ? 85 : 105,
            pan: 0
        }, true, soundChannel);
    }
    return controller;
};

// 战斗喷火与探索地图掠袭共用火焰预设。
QJ.MPMZ.tl.ex_dragonGirlFlamePresets = function() {
    // 参考 fire_c 的贴图组合、加色混合及透明度曲线，单独定义向下的喷射火焰。
    // QJ 判定弹从同一个喷口向扇形散开，粒子从小到大再收尖，避免整团云雾膨胀。
    for (const [name, size, flow] of [['dragonGirlFlameMist', 0.65, 0.6], ['dragonGirlLargeFlameMist', 0.95, 0.8]]) {
        if ($dataTrpParticlePreset[name]) continue;
        $dataTrpParticlePreset[name] = {
            version: 4,
            alpha: {list: [
                {time: 0, value: 0.8},
                {time: 0.12, value: 1},
                {time: 0.5, value: 1},
                {time: 1, value: 0}
            ]},
            scale: {
                list: [
                    {time: 0, value: 0.16},
                    {time: 0.35, value: size},
                    {time: 0.7, value: size * 0.65},
                    {time: 1, value: 0}
                ],
                minimumScaleMultiplier: 0.75
            },
            speed: {
                list: [
                    {time: 0, value: 260 * flow},
                    {time: 0.2, value: 220 * flow},
                    {time: 1, value: 100 * flow}
                ],
                minimumSpeedMultiplier: 0.75
            },
            color: {list: [
                {time: 0, value: '#ff6a16'},
                {time: 0.35, value: '#ffb92e'},
                {time: 1, value: '#ff2e2e'}
            ]},
            colorMode: 0,
            acceleration: {x: 0, y: 0},
            maxSpeed: NaN,
            // TRP 粒子以向右为 0°，向下为 90°，与 QJ 的角度定义不同。
            startRotation: {min: 87, max: 93},
            rotationSpeed: {min: 0, max: 0},
            angle: 0, mirrorType: 0, orderedArt: 0,
            lifetime: {min: 0.22, max: 0.32},
            blendMode: 'add',
            frequency: 0.01,
            spawnChance: 1,
            // 视觉粒子数量翻倍，增加尾部重叠；判定弹数量和伤害频率保持原样。
            particlesPerWave: 2,
            emitterLifetime: -1,
            maxParticles: 80,
            fluctuation: {max: 0, sensitivity: 0},
            spawnType: 'circle',
            pos: {x: 0, y: 0},
            spawnCircle: {x: 0, y: 0, r: 2, minR: 0},
            noRotation: false, addAtBack: false,
            image: 'smog2,smoke2,smoke1',
            targetType: 0,
            comment: '龙娘喷射火焰：窄喷口、向下扩散、火舌收尖'
        };
    }
};

// 探索地图掠袭：QJ.MPMZ.tl.ex_dragonGirlFlyby({direction:6, duration:240, y:160});
// direction省略时首次随机、之后与上一次实际出场方向相反；显式指定时按指定方向。
// y为出场时的画面像素，默认画面高度25%；scale为贴图缩放。
// 出场位置按当前画面计算一次，此后沿固定地图路线飞行，正常受镜头滚动影响。
// duration为飞过一屏的参考帧数（控制速度），实际飞到地图对面边界外才停止。
// interval为循环间隔帧数，首次立即出现；{stop:true}停止当前地图循环并清除技能。
// 只创建QJ子弹，不创建BOSS事件、不占用事件解释器。进入战斗时由事件调用stop。
QJ.MPMZ.tl.ex_dragonGirlFlyby = function(extra = {}) {
    const flyby = QJ.MPMZ.tl.ex_dragonGirlFlyby;
    const flame = QJ.MPMZ.tl.ex_dragonGirlFlameBullet;
    if (extra.stop) {
        AudioManager.stopVoice(null, 'dragonGirlFlyby');
        QJ.MPMZ.deleteProjectile('dragonGirlFlybyTimer');
        QJ.MPMZ.deleteProjectile('dragonGirlFlyby');
        return;
    }
    if (extra.reflectedFlame) {
        if (!this._countered || this.data.dragonFlameParticleId) return;
        const id = `dragonGirlFlybyReturn_${$gameMap.mapId()}_${this.index}`;
        // 只有被反弹的判定弹才携带小火团；零粒子速度让视觉紧贴实际伤害位置。
        const data = $gameScreen._particle.particleSet(0, id, `QJBullet:${this.index}`,
            'dragonGirlFlybyReturn', 1, 0, 0, 'smog2,smoke2,smoke1');
        if (data) this.data.dragonFlameParticleId = id;
        return;
    }
    if (extra.emit) {
        const flight = this.data.dragonFlyby;
        const particle = $gameScreen._particle;
        if (flight.finishedAt !== undefined) {
            if (this.time - flight.finishedAt >= 30) this.setDead();
            return;
        }
        if (flight.direction === 6 ? this.x >= flight.endX : this.x <= flight.endX) {
            flight.finishedAt = this.time;
            this.changeAttribute('opacity', 0);
            if (flight.particleId) {
                particle.particleClear(flight.particleId, false);
                delete flight.particleId;
                AudioManager.stopVoice(null, 'dragonGirlFlyby');
            }
            return;
        }
        const x = this.inheritX(), y = this.inheritY();
        const angle = flight.direction === 6 ? 135 : 225;
        const sign = flight.direction === 6 ? 1 : -1;
        if (!flight.particleId) {
            const id = `dragonGirlFlybyMouth_${$gameMap.mapId()}_${this.index}`;
            const data = particle.particleSet(0, id, `QJBullet:${this.index}`,
                'dragonGirlFlybyStream', 1, sign * flight.mouthForward * flight.scale,
                flight.mouthY * flight.scale, 'smog2,smoke2,smoke1');
            // Sprite未就绪时重试；看得见火焰之后才发出伤害判定。
            if (!data) return;
            particle.particleUpdate([id, 'startRotation', angle - 90 - 6, angle - 90 + 6]);
            flight.particleId = id;
            AudioManager.playVoice({
                isSE: true, name: '火炎放射・火柱や火災１０',
                volume: 65, pitch: 100, pan: 0
            }, true, 'dragonGirlFlyby');
        }
        const spread = 6, number = 2;
        return QJ.MPMZ.Shooter_ArcRange(['S', angle + spread / number], {
            groupName: ['enemyBullet', 'dragonGirlFlame', 'dragonGirlFlyby', 'fire'],
            damage: flight.damage, nonPlayerDamage: true,
            position: [['S', x + sign * flight.mouthForward * flight.scale], ['S', y + flight.mouthY * flight.scale]],
            img: 'null1', opacity: 0, z: 'W',
            // 1500px/秒的视觉火焰对应25px/帧，约0.36秒飞行后一起消失。
            moveType: ['S', 25], dragonFlameVisualReady: true,
            anchor: [0.5, 0.5], collisionBox: ['C', 20],
            existData: [
                {t: ['Time', 21]},
                {t: ['P'], a: ['F', flame, [{hit: true}]], p: [-1, false, true]},
                {t: ['G', ['"enemy"', '"object"']], a: ['F', flame, [{hitEvent: true}]], p: [-1, false, true]}
            ],
            moveF: [[1, 0, flyby, [{reflectedFlame: true}]]]
        }, -spread, spread, number, 2 * spread / number, 1, 1);
    }
    if (extra.interval > 0) {
        QJ.MPMZ.deleteProjectile('dragonGirlFlybyTimer');
        flyby({...extra, interval: 0});
        return QJ.MPMZ.Shoot({
            groupName: ['dragonGirlFlybyTimer'], img: 'null1', opacity: 0,
            position: [['S', 0], ['S', 0]], moveType: ['S', 0], existData: [],
            moveF: [[1, Math.max(1, Math.round(extra.interval)) - 1, flyby, [{...extra, interval: 0}]]]
        });
    }
    // 间隔短于一次飞行时也不叠出多个龙娘。
    if ($gameMap.getGroupBulletListQJ('dragonGirlFlybyBody').length > 0) return;
    QJ.MPMZ.tl.ex_dragonGirlFlamePresets();
    if (!$dataTrpParticlePreset.dragonGirlFlybyStream) {
        const stream = QJ.makeDeepCopy($dataTrpParticlePreset.dragonGirlFlameMist);
        stream.alpha = {list: [{time: 0, value: 1}, {time: 0.7, value: 1}, {time: 1, value: 0}]};
        // 单一发射源需要足够的火舌尺寸和重叠，才能在高速运动中连成火束。
        stream.scale = {list: [{time: 0, value: 0.18}, {time: 0.4, value: 0.72}, {time: 1, value: 0.5}], minimumScaleMultiplier: 0.85};
        stream.speed = {list: [{time: 0, value: 1500}, {time: 1, value: 1500}], minimumSpeedMultiplier: 1};
        stream.lifetime = {min: 0.34, max: 0.36};
        stream.frequency = 0.005;
        stream.particlesPerWave = 6;
        stream.maxParticles = 480;
        stream.spawnCircle.r = 1.5;
        stream.comment = '龙娘掠袭：嘴部单一发射源，高速喷出后扩散消散';
        $dataTrpParticlePreset.dragonGirlFlybyStream = stream;
        const returned = QJ.makeDeepCopy(stream);
        returned.speed = {list: [{time: 0, value: 0}, {time: 1, value: 0}], minimumSpeedMultiplier: 1};
        returned.scale = {list: [{time: 0, value: 0.16}, {time: 0.4, value: 0.24}, {time: 1, value: 0.08}], minimumScaleMultiplier: 0.8};
        returned.lifetime = {min: 0.1, max: 0.15};
        returned.frequency = 0.016;
        returned.particlesPerWave = 1;
        returned.maxParticles = 12;
        returned.comment = '龙娘掠袭：反弹后随判定弹移动的小火团';
        $dataTrpParticlePreset.dragonGirlFlybyReturn = returned;
    }
    const lastDirection = $gameSystem._dragonGirlFlybyLastDirection;
    const direction = extra.direction ?? (lastDirection ? 10 - lastDirection : (Math.random() < 0.5 ? 4 : 6));
    const duration = Math.max(1, Math.round(extra.duration ?? 240));
    const scale = Math.max(0.1, extra.scale ?? 1);
    // 仅在出场时按镜头缩放换算可视边缘；QJ将S起点转换为地图坐标。
    const zoom = $gameScreen.zoomScale();
    const offsetX = Math.round(-$gameScreen.zoomX() * (zoom - 1)) + Math.round($gameScreen.shake());
    const offsetY = Math.round(-$gameScreen.zoomY() * (zoom - 1));
    const left = -offsetX / zoom, right = (Graphics.width - offsetX) / zoom;
    const margin = 50 * scale + 32;
    const x = direction === 6 ? left - margin : right + margin;
    const y = ((extra.y ?? Graphics.height * 0.25) - offsetY) / zoom;
    const bullet = QJ.MPMZ.Shoot({
        groupName: ['dragonGirlFlyby', 'dragonGirlFlybyBody'],
        img: 'DragonGirlAsaba_SideFireBreath[4,6]',
        position: [['S', x], ['S', y]],
        initialRotation: ['S', direction === 6 ? 90 : 270], imgRotation: ['S', 0],
        // 原始四帧朝左，向右飞时水平翻转，保持角色本身不旋转。
        scale: [direction === 6 ? -scale : scale, scale], anchor: [0.5, 0.5],
        z: 'W', opacity: 1,
        moveType: ['S', (right - left + margin * 2) / duration],
        dragonFlyby: {direction, scale,
            endX: direction === 6 ? $gameMap.width() * $gameMap.tileWidth() + margin : -margin,
            damage: extra.damage ?? 24,
            mouthForward: extra.mouthForward ?? 14, mouthY: extra.mouthY ?? 18},
        // 飞行结束后隐藏角色，保留载体30帧，让已喷出的嘴部粒子自然消散。
        existData: [],
        deadF: [[flame, [{soundStop: true, channel: 'dragonGirlFlyby'}]]],
        moveF: [[0, 1, flyby, [{emit: true}]]]
    });
    // 只记录实际出场，重复调用被跳过时不改变顺序；换图、读档后仍沿用上次方向。
    if (bullet) $gameSystem._dragonGirlFlybyLastDirection = direction;
    return bullet;
};

// 咳嗽嘴部冒烟：事件页负责开始/停止，现有飞行控制器逐帧修正嘴部偏移。
QJ.MPMZ.tl.ex_dragonGirlCoughSmoke = function(extra = {}) {
    const event = $gameMap.event(this._eventId);
    if (!event) return;
    const particle = $gameScreen._particle;
    if (extra.stop) {
        if (event._dragonCoughSmoke) particle.particleClear(event._dragonCoughSmoke, false);
        delete event._dragonCoughSmoke;
        return;
    }
    if (!extra.update) {
        const id = `dragonGirlCough_${$gameMap.mapId()}_${this._eventId}`;
        particle.particleSet(this._eventId, id, `event:${this._eventId}`, 'smoke_c', 'above');
        event._dragonCoughSmoke = id;
    }
    if (!event._dragonCoughSmoke) return;
    const sprite = SceneManager._scene._spriteset._characterSprites.find(s => s._character === event);
    if (!sprite || !sprite._frame.height) return;
    const direction = event.direction();
    const leftFacing = direction === 4 ||
        ((direction === 2 || direction === 8) && sprite._drill_EASe_lastSpriteDir === 4);
    // Cough单帧100×100，嘴部随左右镜像位于x46/54，咳嗽起伏中心约y50。
    const x = sprite.x + ((leftFacing ? 54 : 46) - sprite.anchor.x * sprite._frame.width) * sprite.scale.x;
    const y = sprite.y + (50 - sprite.anchor.y * sprite._frame.height) * sprite.scale.y;
    // 覆盖smoke_c默认的(0,-64)偏移，补上动画序列和悬浮造成的显示位移。
    particle.particleUpdate([event._dragonCoughSmoke, 'pos', x - event.screenX(), y - event.screenY()]);
};

// 龙娘浅羽：保持玩家上方的站位，带惯性飞行。
// 战斗页开头调用一次（重复调用不会重启）；死亡页先调用 {stop:true}。
// distance 为上方间隔（格）；reactionFrames 为从静止加速到满速的帧数，越大惯性越重、越容易被折返甩开。
// 速度均为玩家当前移速的倍率：巡航chaseRate，喷火时再×sprayRate；突进rushRate。
// 突进时机：离落点超过rushDistance格，或处于rushActs/rushStates（大型喷火准备）且离落点超过1.5格。
// holdActs/holdStates（得意、咳嗽）期间刹停不动，留给玩家输出。
// 冰冻、感电、眩晕、时停期间原地定住；若正在喷火则立即掐火，并让战斗页跳到recoverLabel（被呛到），解除控制后接着咳嗽。
// 悬停点在玩家上方随多组随机周期的正弦缓慢漂移（横向约±1.35×sway格），并不定期换边，轨迹平滑但不重复。
QJ.MPMZ.tl.ex_dragonGirlFlight = function(extra = {}) {
    const eid = extra.eid ?? this._eventId;
    const event = $gameMap.event(eid);
    const group = `dragonGirlFlight${eid}`;

    if (extra.stop) {
        QJ.MPMZ.deleteProjectile(group);
        if (event) {
            if (event._dragonCoughSmoke) QJ.MPMZ.tl.ex_dragonGirlCoughSmoke.call(event, {stop: true});
            event.cancelMove();
            // 用20帧缓冲落下，随后再进入死亡页第30帧的抛物线击飞。
            event.drill_ECE_endSustainingFloating();
        }
        return;
    }

    if (!event || event._erased || $gameSelfSwitches.value([$gameMap.mapId(), eid, 'D']) ||
        (extra.tick && event._pageIndex !== extra.pageIndex)) {
        if (extra.tick) QJ.MPMZ.tl.ex_dragonGirlFlight.call(this, {eid, stop: true});
        return;
    }

    if (extra.tick) {
        if (event._dragonCoughSmoke) QJ.MPMZ.tl.ex_dragonGirlCoughSmoke.call(event, {update: true});
        if (event.isJumping()) return;
        let flight = this._dragonFlight;
        if (!flight) {
            // 每场随机抽取四组互不成整数倍的周期，叠加出平滑且不重复的悬停轨迹。
            const wave = (min, max) => ({
                speed: Math.PI * 2 / (min + Math.random() * (max - min)),
                phase: Math.random() * Math.PI * 2
            });
            flight = this._dragonFlight = {
                frame: 0, vx: 0, vy: 0, hover: 1, bias: 0, biasTarget: 0, biasRemaining: 0,
                px: $gamePlayer._realX, py: $gamePlayer._realY, pvx: 0, pvy: 0,
                waves: [wave(220, 320), wave(110, 170), wave(260, 380), wave(130, 200)]
            };
        }
        // 平滑估计玩家每帧位移，让她跟上玩家的移动；传送等瞬移不计入。受控期间照常记录，解除时不会猛冲。
        const pdx = $gameMap.deltaX($gamePlayer._realX, flight.px);
        const pdy = $gameMap.deltaY($gamePlayer._realY, flight.py);
        flight.px = $gamePlayer._realX;
        flight.py = $gamePlayer._realY;
        if (Math.abs(pdx) + Math.abs(pdy) < 1) {
            flight.pvx += (pdx - flight.pvx) * 0.2;
            flight.pvy += (pdy - flight.pvy) * 0.2;
        }
        // 冰冻、感电、眩晕、时停领域（_IsDisabledCounter）及全局时停期间原地定住：
        // 飞行控制器是弹幕，不会随事件update一起被跳过，需在此拦截；惯性清零，悬停相位暂停，解除后从原地重新起飞。
        if (event._IsDisabledCounter > 0 || event._IsDisabled ||
            ($gameSystem.getZzyTWFIsSetup?.() && $gameSystem.getZzyTWFTheWorlding?.() && event.IsZzyTWFTheWorld?.())) {
            // 喷火途中被控制：立即掐火；事件页此时停在喷火后的等待上，改跳到被呛到分支。
            // 受控期间事件update被跳过，分支在控制结束时才开始：口中爆炸→咳嗽→生气2→大型喷火。
            if ($gameMap.getGroupBulletListQJ(`dragonGirlFlameController${eid}`).length > 0) {
                QJ.MPMZ.tl.ex_dragonGirlFlameBullet.call(event, {eid, stop: true, interrupt: true});
                const interpreter = event._interpreter;
                const label = interpreter?._list?.findIndex(c => c.code === 118 && c.parameters[0] === extra.recoverLabel) ?? -1;
                if (label >= 0) {
                    interpreter.jumpTo(label);
                    interpreter._waitCount = 0;
                }
            }
            flight.vx = flight.vy = 0;
            flight.rush = false;
            event.cancelMove();
            return;
        }
        flight.frame++;
        // 以实际喷火控制器为准：准备动作不减速，收招后立即恢复。
        const spraying = $gameMap.getGroupBulletListQJ(`dragonGirlFlameController${eid}`).length > 0;
        // 按当前动作元/状态元判断：得意、咳嗽时停飞；大型喷火准备期间突进到玩家上方。
        const controller = event._drill_EASe_controller;
        const act = controller ? controller.drill_controllerMain_Act_getCurName() : '';
        const state = controller ? controller.drill_controllerMain_Node_getCurStateName() : '';
        const hold = extra.holdActs.includes(act) || extra.holdStates.includes(state);
        const charging = extra.rushActs.includes(act) || extra.rushStates.includes(state);
        // 喷火及大型喷火准备时悬停幅度渐收到三成，靠近玩家正上方；之后再慢慢放开。
        flight.hover += ((spraying || charging ? 0.3 : 1) - flight.hover) * 0.05;
        // 每4~7秒随机换一次偏向的一侧，用约2秒缓缓滑过去。
        if (--flight.biasRemaining <= 0) {
            flight.biasRemaining = 240 + Math.randomInt(180);
            flight.biasTarget = (Math.random() * 2 - 1) * extra.sway * 0.6;
        }
        flight.bias += (flight.biasTarget - flight.bias) * 0.01;
        const sine = w => Math.sin(flight.frame * w.speed + w.phase);
        const [w1, w2, w3, w4] = flight.waves;
        const offsetX = (flight.bias + extra.sway * (0.5 * sine(w1) + 0.25 * sine(w2))) * flight.hover;
        const offsetY = extra.sway * (0.2 * sine(w3) + 0.1 * sine(w4)) * flight.hover;
        const tx = Math.max(0, Math.min($gameMap.width() - event.width(),
            $gamePlayer.centerRealX() + offsetX - event.width() / 2));
        const ty = Math.max(0, Math.min($gameMap.height() - event.height(),
            $gamePlayer.centerRealY() + offsetY - event.height() / 2 - extra.distance));
        // 速度以玩家当前移速为基准；积水等移速倍率按比例生效，移速被设为0时原地停住。
        const raw = Game_CharacterBase.prototype.distancePerFrame.call(event);
        const base = $gamePlayer.distancePerFrame() * (raw > 0 ? event.distancePerFrame() / raw : 0);
        if (base <= 0) {
            flight.vx = flight.vy = 0;
            event.cancelMove();
            return;
        }
        const dx = $gameMap.deltaX(tx, event._realX);
        const dy = $gameMap.deltaY(ty, event._realY);
        const distance = Math.hypot(dx, dy);
        // 突进：被甩开rushDistance格以上，或大型喷火准备期间离落点超过1.5格时触发，飞到0.75格内结束；喷火时不突进。
        if (hold || spraying || distance < 0.75) {
            flight.rush = false;
        } else if (distance > (charging ? 1.5 : extra.rushDistance)) {
            flight.rush = true;
        }
        if (hold) {
            // 得意、咳嗽：约15帧刹停后悬在原地，直到动作结束。
            flight.vx *= 0.8;
            flight.vy *= 0.8;
        } else {
            // 玩家从下方逼近到上方间隔以内时急退，速度按逼近程度向突进速度过渡。
            const gap = $gamePlayer.centerRealY() - event._realY - event.height() / 2;
            const evade = Math.max(0, Math.min((extra.distance - 0.5 - gap) / Math.max(extra.distance - 0.5, 0.5), 1));
            const maxSpeed = base * (flight.rush ? extra.rushRate : extra.chaseRate + (extra.rushRate - extra.chaseRate) * evade) *
                (spraying ? extra.sprayRate : 1);
            // 期望速度 = 玩家速度 + 约24帧消除偏差。
            let wantX = flight.pvx + dx / 24;
            let wantY = flight.pvy + dy / 24;
            const want = Math.hypot(wantX, wantY);
            if (want > maxSpeed) {
                wantX *= maxSpeed / want;
                wantY *= maxSpeed / want;
            }
            let ax = wantX - flight.vx;
            let ay = wantY - flight.vy;
            // 加速度上限使满速需reactionFrames帧，转向划出弧线；突进起步、超速刹车时提到3倍，急退时按逼近程度提高。
            const speedNow = Math.hypot(flight.vx, flight.vy);
            const accel = Math.max(maxSpeed, speedNow) / extra.reactionFrames *
                (flight.rush || speedNow > maxSpeed ? 3 : 1 + 2 * evade);
            const length = Math.hypot(ax, ay);
            if (length > accel) {
                ax *= accel / length;
                ay *= accel / length;
            }
            flight.vx += ax;
            flight.vy += ay;
        }
        const step = Math.hypot(flight.vx, flight.vy);
        if (step < 0.002) {
            flight.vx = flight.vy = 0;
            event.cancelMove();
        } else {
            const degree = (Math.atan2(flight.vy, flight.vx) * 180 / Math.PI + 450) % 360;
            event.mover().dotMoveByDeg(new DotMoveSystem.Degree(degree), step);
        }
        return;
    }

    if ($gameMap.getGroupBulletListQJ(group).length > 0) return;
    QJ.MPMZ.tl.ex_dragonGirlCorpseCollision.call(event, {restore: true});
    event.cancelMove();
    // 从登场对话切入战斗时延续已有悬浮，避免重新起浮导致贴图突然下沉。
    if (event._Drill_ECE.playing_type !== '空中飘浮') {
        event.drill_ECE_playSustainingFloating(60 * 60 * 60 * 24 * 100, 20, 8, 120, 6);
    }
    return QJ.MPMZ.Shoot({
        groupName: [group],
        position: [['S', 0], ['S', 0]],
        img: 'null1', opacity: 0,
        moveType: ['S', 0],
        existData: [],
        moveF: [[1, 0, QJ.MPMZ.tl.ex_dragonGirlFlight, [{
            tick: true, eid, pageIndex: event._pageIndex, distance: extra.distance ?? 2,
            reactionFrames: Math.max(1, extra.reactionFrames ?? 20),
            chaseRate: extra.chaseRate ?? 0.75, sprayRate: extra.sprayRate ?? 0.5,
            rushRate: extra.rushRate ?? 1.6, rushDistance: extra.rushDistance ?? 3,
            sway: extra.sway ?? 1,
            holdActs: extra.holdActs ?? ['得意'], holdStates: extra.holdStates ?? ['咳嗽'],
            rushActs: extra.rushActs ?? ['准备大型蓄力', '准备大型喷火'], rushStates: extra.rushStates ?? ['大型蓄力'],
            recoverLabel: extra.recoverLabel ?? '被呛到'
        }]]]
    });
};

// 坠机优先落在附近安全陆地；没有陆地才选择熔浆（250号区域）。
QJ.MPMZ.tl.ex_dragonGirlCrashLanding = function(extra = {}) {
    const event = $gameMap.event(this._eventId);
    const range = extra.range ?? 8;
    const minDistance = extra.minDistance ?? 3;
    const x = Math.round(event._realX), y = Math.round(event._realY);
    // 与哥哥复活跳跃使用同一筛选器：可通行、无事件，排除玩家位置。
    const condition = {...DrillUp.g_COFA_condition_list[10]};
    let candidates = $gameMap.drill_COFA_getShapePointsWithCondition(x, y, '圆形区域', range, condition);
    if (candidates.length === 0) {
        candidates = $gameMap.drill_COFA_getShapePoints(x, y, '圆形区域', range)
            .filter(p => $gameMap.isValid(p.x, p.y) && $gameMap.regionId(p.x, p.y) === 250);
    }
    const far = candidates.filter(p => Math.hypot(
        $gameMap.deltaX(p.x, event._realX), $gameMap.deltaY(p.y, event._realY)
    ) >= minDistance);
    if (far.length > 0) candidates = far;
    // 极小陆地仍优先保留；正常战斗场地使用上面的3～8格落点。
    const point = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : {x, y};
    event._dragonCrashLanding = {x: point.x, y: point.y, lava: $gameMap.regionId(point.x, point.y) === 250};
    return event._dragonCrashLanding;
};

// 熔浆落点替代倒地：复用公共事件135的落浆动画，角色不留下实体尸体。
QJ.MPMZ.tl.ex_dragonGirlLavaCrash = function() {
    const event = $gameMap.event(this._eventId);
    const point = event._dragonCrashLanding;
    event.setOpacity(0);
    event.setThrough(true);
    QJ.MPMZ.Shoot({
        img: '60FPS_ASWater_04_Geyser_alt[5,6,1]',
        position: [['Map', point.x], ['Map', point.y]],
        initialRotation: ['S', 0], scale: [0.8, 0.8],
        imgRotation: ['F'], anchor: [0.5, 0.75],
        collisionBox: ['C', 1], opacity: 1,
        moveType: ['S', 0], blendMode: 0,
        existData: [{t: ['Time', 29]}]
    });
    AudioManager.playSe({name: 'Water1', volume: 70, pitch: 70, pan: 0});
};

// 倒地扬尘：以身体接地处为中心，在地图上播放一次，不跟随之后的碰撞箱调整。
QJ.MPMZ.tl.ex_dragonGirlLandingDust = function() {
    const event = $gameMap.event(this._eventId);
    const sprite = SceneManager._scene._spriteset._characterSprites.find(s => s._character === event);
    if (!sprite || !sprite._frame.height) return;
    const direction = event.direction();
    const leftFacing = direction === 4 ||
        ((direction === 2 || direction === 8) && sprite._drill_EASe_lastSpriteDir === 4);
    // FallDown身体中心：右朝向x73、左朝向x27，接地边缘约y72（100×100单帧）。
    const x = sprite.x + ((leftFacing ? 27 : 73) - sprite.anchor.x * sprite._frame.width) * sprite.scale.x;
    // 在身体接地坐标基础上向下微调10px。
    const y = sprite.y + (72 - sprite.anchor.y * sprite._frame.height) * sprite.scale.y + 20;
    // TRP的tilemap目标使用格坐标，并在转换屏幕坐标时固定加24px。
    const mapX = $gameMap.displayX() + (x - 24) / $gameMap.tileWidth();
    const mapY = $gameMap.displayY() + (y - 24) / $gameMap.tileHeight();
    const id = `dragonGirlLanding_${$gameMap.mapId()}_${this._eventId}`;
    const particle = $gameScreen._particle;
    particle.particlePlay(this._eventId, id, 'tilemap', 'jump_fuss_sp', 'above', mapX, mapY);
    particle.particleUpdate([id, 'scale', '0.3', '0.3@0.45', '0.1']);
    particle.particleUpdate([id, 'rect', -24 * sprite.scale.x, -2 * sprite.scale.y, 48 * sprite.scale.x, 4 * sprite.scale.y]);
    particle.particleUpdate([id, 'startRotation', -170, -10]);
    particle.particleUpdate([id, 'speed', '220', '70@0.2', '0']);
    particle.particleUpdate([id, 'particlesPerWave', 4]);
};

// 龙娘气绝贴图的身体位于100×100画布的一侧；DotMove默认1×1格与它不重合。
// 倒地动作完成后调用一次；重新进入飞行时恢复。尺寸/位置按当前贴图缩放换算。
QJ.MPMZ.tl.ex_dragonGirlCorpseCollision = function(extra = {}) {
    const event = $gameMap.event(this._eventId);
    if (!event) return;
    const saved = event._dragonCorpseCollision;
    if (extra.restore) {
        if (!saved) return;
        event.setOffsetX(saved.offsetX);
        event.setOffsetY(saved.offsetY);
        event.setWidth(saved.width);
        event.setHeight(saved.height);
        event._boxOffsetX = saved.boxOffsetX;
        event._boxOffsetY = saved.boxOffsetY;
        event.setPosition(event._realX - saved.dx, event._realY - saved.dy);
        event.updateBoxDataQJ();
        delete event._dragonCorpseCollision;
        return;
    }
    if (saved || event.isJumping()) return;
    const sprite = SceneManager._scene._spriteset._characterSprites.find(s => s._character === event);
    if (!sprite || !sprite._frame.height) return;
    const direction = event.direction();
    const leftFacing = direction === 4 ||
        ((direction === 2 || direction === 8) && sprite._drill_EASe_lastSpriteDir === 4);
    // FallDown_切片_9：右朝向身体约x48~98，左朝向约x2~52；两者y50~75。
    // 左右各留6px、下方留15px出血位，避免玩家贴近时身体贴图相互穿入；上沿不变。
    const paddingX = 6, paddingBottom = 15;
    const left = sprite.x + ((leftFacing ? 2 : 48) - paddingX - sprite.anchor.x * sprite._frame.width) * sprite.scale.x;
    const top = sprite.y + (50 - sprite.anchor.y * sprite._frame.height) * sprite.scale.y;
    const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
    const x = $gameMap.displayX() + left / tw;
    const y = $gameMap.displayY() + top / th;
    const dx = x - event._realX, dy = y - event._realY;
    event._dragonCorpseCollision = {
        width: event._width, height: event._height,
        offsetX: event._offsetX, offsetY: event._offsetY,
        boxOffsetX: event._boxOffsetX, boxOffsetY: event._boxOffsetY, dx, dy
    };
    event.cancelMove();
    // 移动逻辑坐标才能移动DotMove碰撞箱；反向补偿显示偏移，保持尸体原地不动。
    event.setOffsetX(event.offsetX() - dx);
    event.setOffsetY(event.offsetY() - dy);
    event.setWidth((50 + paddingX * 2) * sprite.scale.x / tw);
    event.setHeight((25 + paddingBottom) * sprite.scale.y / th);
    // QJ的显示坐标不读取DotMove显示偏移，另行补偿，保持死亡气泡等特效对齐。
    event._boxOffsetX -= dx * tw;
    event._boxOffsetY -= dy * th;
    event.setPosition(x, y);
    event.updateBoxDataQJ();
};

// 四个主 BOSS 的复活日独立存放，不能与地图每日生成的 day 标记共用。
QJ.MPMZ.tl.initializeBossRespawnDays = function() {
    if ($gameSystem._bossRespawnDaysMigrated) return;
    const currentDay = $gameSystem.day();
    for (const [bossId, mapId] of [[40, 12], [46, 48], [59, 56], [80, 50]]) {
        const oldDay = $gameSelfVariables.value([mapId, 1, 'day']);
        // 旧版在觉醒或召唤时也会记时；无论是否击杀过，都保留尚未结束的冷却。
        $gameSelfVariables.setValue([1, bossId, 'respawnDay'], oldDay > currentDay ? oldDay : 0);
        $gameSelfVariables.setValue([mapId, 1, 'day'], 0);
    }
    $gameSystem._bossRespawnDaysMigrated = true;
};

QJ.MPMZ.tl.getBossRespawnDay = function(bossId) {
    QJ.MPMZ.tl.initializeBossRespawnDays();
    return $gameSelfVariables.value([1, bossId, 'respawnDay']);
};

QJ.MPMZ.tl.recordBossRespawnDay = function(bossId) {
    QJ.MPMZ.tl.initializeBossRespawnDays();
    $gameSelfVariables.setValue([1, bossId, 'respawnDay'], $gameSystem.day() + 7);
};

// 世界塔罗牌主动刷新全部 BOSS；日常物件清理不修改复活日。
QJ.MPMZ.tl.resetBossRespawnDays = function() {
    QJ.MPMZ.tl.initializeBossRespawnDays();
    // 124 龙娘浅羽尚未正式实装，不进倒计时提示列表，但同样随世界刷新
    for (const bossId of [40, 46, 59, 80, 124]) {
        $gameSelfVariables.setValue([1, bossId, 'respawnDay'], 0);
    }
    // 世界会先清空当前地图；在湖区使用时也要允许同日重新生成漩涡前置触手。
    $gameSelfVariables.setValue([48, 1, 'day'], 0);
    $gameSelfSwitches.setValue([1, 40, 'D'], false);
    $gameSelfSwitches.setValue([1, 60, 'D'], false);
};

QJ.MPMZ.tl.keyBossData = Object.freeze([
    { eventId: 8,   name: "ASABA",      mainStory: false },
    { eventId: 28,  name: "沙卡班甲鱼王", mainStory: false },
    { eventId: 29,  name: "阿萨谢尔",     mainStory: false },
    { eventId: 40,  name: "支配者",       mainStory: true  },
    { eventId: 41,  name: "猫车",         mainStory: false },
    { eventId: 59,  name: "箱庭的白兔",   mainStory: true  },
    { eventId: 80,  name: "红兽",         mainStory: true  },
    { eventId: 110, name: "稻草人",       mainStory: false }
]);

// BOSS讨伐进度
QJ.MPMZ.tl.getKeyBossDefeatProgress = function(extra = {}) {
    const checkMainStoryBoss = extra.checkMainStoryBoss === true;

    if (Utils.isOptionValid("test")) return 7;

    return QJ.MPMZ.tl.keyBossData.filter(boss => {
        // 指定检查主线BOSS时，排除非主线BOSS
        if (checkMainStoryBoss && !boss.mainStory) {
            return false;
        }

        return $gameSelfVariables.value([
            1,
            boss.eventId,
            "KillCount"
        ]) > 0;
    }).length;
};

// 首次击败的旋转击飞。事件脚本：QJ.MPMZ.tl.MystletainnKnockback.call(this);
// distance/height/searchRadius为地图像素；duration/turns为240像素距离下的基准帧数/翻转圈数。
QJ.MPMZ.tl.MystletainnKnockback = function (extra = {}) {
    const eid = extra.eid ?? this?._eventId;
    const event = $gameMap.event(eid);
    if (!event || event._erased || !event.drill_COET_hasTag("Mistilteinn")) return;

    if (extra.recover) {
        const point = event._mistilteinnKnockbackLanding;
        if (!point) return;
        event.setPosition(
            event._realX + (point.x - event.screenBoxXQJ()) / $gameMap.tileWidth(),
            event._realY + (point.y - event.screenBoxYQJ()) / $gameMap.tileHeight()
        );
        //event.drill_EASe_stopAct();
        event.drill_EASe_setSimpleStateNode(["剑形态-待机"]);
        event.updateBoxBodyPositionQJ();
        delete event._mistilteinnKnockbackLanding;
        return;
    }

    // 沿用最终击败的技能清理，防止旧技能回调覆盖落地后的封印状态。
    QJ.MPMZ.deleteProjectile(extra.servantDeath ? "MistilteinnServantCast-" + event._mistilteinnArmorId : "Mistilteinn");
    const startX = event.screenBoxXQJ();
    const startY = event.screenBoxYQJ();
    const dx = startX - $gamePlayer.screenBoxXQJ();
    const dy = startY - $gamePlayer.screenBoxYQJ();
    const length = Math.hypot(dx, dy);
    const ux = length > 0 ? dx / length : (event.direction() === 4 ? -1 : 1);
    const uy = length > 0 ? dy / length : 0;
    const distance = Math.max(0, extra.distance ?? 240);
    const landing = QJ.MPMZ.tl.MystletainnKnockbackLanding(
        startX, startY, ux, uy, distance, Math.max(distance, extra.searchRadius ?? 960)
    );
    // 全图没有允许区域时跳过击飞，既不隐藏本体，也不让事件页等待不存在的子弹。
    if (!landing) return;
    // 换页与隐藏本体不会清空DotMove的剩余移动，击飞前主动取消。
    event.cancelMove();
    const landX = landing.x;
    const landY = landing.y;
    // 按最终落点的平面距离换算圈数，屏内选点或岸边兜底改变距离后也能保持旋转密度。
    // 取整保留原来的落地角度；turns: 0仍只做最后的姿态调整。
    const baseTurns = Math.max(0, extra.turns ?? 2);
    const travelDistance = Math.hypot(landX - startX, landY - startY);
    const turns = baseTurns > 0 ? Math.max(1, Math.round(baseTurns * travelDistance / 240)) : 0;
    // 距离翻倍时耗时约增至1.41倍，既延长演出，也保留远距离飞得更快的力度。
    // 短距离至少保留一半基准时长，避免抛物线和翻转一闪而过。
    const baseDuration = Math.max(1, extra.duration ?? 32);
    const duration = Math.max(1, Math.round(baseDuration * Math.sqrt(Math.max(0.25, travelDistance / 240))));
    const right = landX === startX ? ux >= 0 : landX > startX;
    const endAngle = right ? 165 : 195;
    const radians = endAngle * Math.PI / 180;
    const scale = extra.scale ?? (extra.servantDeath ? event._mistilteinnScale ?? 1 : 1);
    const sword = QJ.MPMZ.Shoot({
        img: "Mistilteinn_swordIdle[6,6]",
        groupName: [extra.servantDeath ? "MistilteinnServantDeath-" + eid : "MistilteinnKnockback"],
        eid,
        knockbackMapId: $gameMap.mapId(),
        knockbackStartX: startX,
        knockbackStartY: startY,
        knockbackLandX: landX,
        knockbackLandY: landY,
        // 绕剑柄翻转，最后让剑尖略插入地面，再交接给封印贴图。
        knockbackEndX: landX - Math.sin(radians) * 82 * scale,
        knockbackEndY: landY + Math.cos(radians) * 82 * scale,
        knockbackScale: scale,
        knockbackHeight: Math.max(0, extra.height ?? 120),
        knockbackDuration: duration,
        knockbackTurns: turns,
        knockbackSeTurn: 0,
        knockbackRight: right,
        position: [['S', event.screenBoxXShowQJ()], ['S', event.screenBoxYShowQJ()]],
        initialRotation: ['S', right ? 90 : 270],
        imgRotation: ['R', 0, true],
        anchor: [0.5, 0.9],
        scale,
        moveType: ['S', 0],
        z: 11,
        existData: [],
        moveF: [[0, 0, QJ.MPMZ.tl.MystletainnKnockbackUpdate]]
    });
    if (!sword) return;
    event.drill_EASe_stopAct();
    event.drill_EASe_setSimpleStateNode(["占位符"]);
    event.drill_ECE_stopEffect();
    if (extra.servantDeath) {
        event._Drill_ECE.scale_x = event._Drill_ECE.scale_y = scale - 1;
        event._Drill_ECE.playing_type = '王权征令';
    }
    event._groupListQJ = [];
    $gameMap.refreshUpdateBoxDataQJ();
    return sword;
};

// 只在发动时检索。区域0/5是硬条件，屏内落点优先于距离和击飞方向。
QJ.MPMZ.tl.MystletainnKnockbackLanding = function (startX, startY, ux, uy, distance, searchRadius) {
    const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
    const width = $gameMap.width(), height = $gameMap.height();
    // 对应DP_MapZoom的Spriteset偏移，不能只用Graphics.width / zoom忽略缩放中心。
    const zoom = $gameScreen.zoomScale();
    const baseScale = drowsepost.rendersize.scale;
    const left = $gameMap.displayX() * tw + Math.round($gameScreen.zoomX() * (zoom - baseScale)) / zoom;
    const top = $gameMap.displayY() * th + Math.round($gameScreen.zoomY() * (zoom - baseScale)) / zoom;
    const right = left + Graphics.width / zoom;
    const bottom = top + Graphics.height / zoom;
    const padding = 48 / zoom;
    // 剑尖是落点，封印剑身向上延伸约90像素，顶部额外留出剑身空间。
    const innerLeft = left + padding, innerRight = right - padding;
    const innerTop = top + Math.max(padding, 96), innerBottom = bottom - padding;
    let forward = distance;
    if (ux > 0) forward = Math.min(forward, (width * tw - tw / 2 - startX) / ux);
    if (ux < 0) forward = Math.min(forward, (tw / 2 - startX) / ux);
    if (uy > 0) forward = Math.min(forward, (height * th - th / 2 - startY) / uy);
    if (uy < 0) forward = Math.min(forward, (th / 2 - startY) / uy);
    forward = Math.max(0, forward);
    const preferredX = startX + ux * forward;
    const preferredY = startY + uy * forward;
    const tileX = Math.floor(preferredX / tw), tileY = Math.floor(preferredY / th);
    // 越界regionId也可能返回0，因此必须先检查地图边界。
    if (tileX >= 0 && tileX < width && tileY >= 0 && tileY < height) {
        const region = $gameMap.regionId(tileX, tileY);
        if ((region === 0 || region === 5) && preferredX >= innerLeft && preferredX <= innerRight
            && preferredY >= innerTop && preferredY <= innerBottom) return {x: preferredX, y: preferredY};
    }

    // 按优先级分层检索：屏内留白区 → 整个屏幕 → 常规搜索半径 → 全图兜底。
    const bounds = [
        [innerLeft, innerTop, innerRight, innerBottom],
        [left, top, right, bottom],
        [startX - searchRadius, startY - searchRadius, startX + searchRadius, startY + searchRadius],
        [0, 0, width * tw, height * th]
    ];
    for (let pass = 0; pass < bounds.length; pass++) {
        const [x1, y1, x2, y2] = bounds[pass];
        // 候选点取图块中心，确保它确实落在当前层的可见边界内。
        const minX = Math.max(0, Math.ceil(x1 / tw - 0.5));
        const maxX = Math.min(width - 1, Math.floor(x2 / tw - 0.5));
        const minY = Math.max(0, Math.ceil(y1 / th - 0.5));
        const maxY = Math.min(height - 1, Math.floor(y2 / th - 0.5));
        let best = null, bestScore = Infinity;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const region = $gameMap.regionId(x, y);
                if (region !== 0 && region !== 5) continue;
                const px = (x + 0.5) * tw, py = (y + 0.5) * th;
                const dx = px - startX, dy = py - startY;
                const length = Math.hypot(dx, dy);
                if (pass === 2 && length > searchRadius) continue;
                const alignment = length > 0 ? (dx * ux + dy * uy) / length : 0;
                // 方向惩罚最多两格，避免为了坚持向外飞而舍弃附近的岸上落点。
                const score = Math.abs(length - distance) + Math.max(tw, th) * (1 - alignment);
                if (score < bestScore) {
                    bestScore = score;
                    best = {x: px, y: py};
                }
            }
        }
        if (best) return best;
    }
    return null;
};

QJ.MPMZ.tl.MystletainnKnockbackUpdate = function () {
    const data = this.data;
    const event = $gameMap.event(data.eid);
    if (data.knockbackMapId !== $gameMap.mapId() || !event || event._erased || !event.drill_COET_hasTag("Mistilteinn")) {
        this.setDead();
        return;
    }
    // QJ创建时先执行一次update，此时time=1；从原位置开始完整播放duration帧。
    const t = Math.min((this.time - 1) / data.knockbackDuration, 1);
    this.x = data.knockbackStartX + (data.knockbackEndX - data.knockbackStartX) * t;
    this.y = data.knockbackStartY + (data.knockbackEndY - data.knockbackStartY) * t
        - 4 * data.knockbackHeight * t * (1 - t);
    const sign = data.knockbackRight ? 1 : -1;
    const rotatedAngle = (360 * data.knockbackTurns + 75) * t;
    this.rotationImg = (data.knockbackRight ? 90 : 270) + sign * rotatedAngle;
    const completedTurns = Math.floor(rotatedAngle / 360);
    while (data.knockbackSeTurn < completedTurns) {
        data.knockbackSeTurn++;
        // 旋转SE模板：每完成一整圈播放一次；可替换音效名、音量、音调和声像。
        AudioManager.playSe({name: "Wind7", volume: 80, pitch: 100+Math.randomInt(30), pan: 0});
    }
    if (t < 1) return;

    // 落地交接前再次清空移动，避免事件继续位移而裂痕留在原地。
    event.cancelMove();
    // 第一阶段击败资源50×200，二方向每帧50×100；入地点约在(43,99)/(7,99)。
    // 中心对齐后偏移为(+18,49)/(-18,49)，补偿裁去的透明边缘。
    event.setDirection(data.knockbackRight ? 6 : 4);
    event.drill_EASe_setCenterAlign(true);
    const screenX = data.knockbackLandX - $gameMap.displayX() * $gameMap.tileWidth();
    const screenY = data.knockbackLandY - $gameMap.displayY() * $gameMap.tileHeight();
    const scale = data.knockbackScale ?? 1;
    event.setPosition(
        event._realX + (screenX - sign * 18 * scale - event.screenX()) / $gameMap.tileWidth(),
        event._realY + (screenY - 49 * scale - event.screenY()) / $gameMap.tileHeight()
    );
    event._mistilteinnKnockbackLanding = {x: data.knockbackLandX, y: data.knockbackLandY};
    event.drill_EASe_stopAct();
    event.drill_EASe_setSimpleStateNode(["第一阶段击败"]);
    event.setOpacity(255);
    event.updateBoxBodyPositionQJ();
    // 裂痕对齐剑尖的实际入地点；screenX/Y已扣除地图滚动，供QJ的S坐标使用。
    QJ.MPMZ.Shoot({
        img: "swordGraveSlot",
        position: [['S', screenX], ['S', screenY]],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        moveType: ['S', 0],
        anchor: [0.5, 0.5],
        scale,
        z: "E",
        existData: [
            {t: ['Time', 360], d: [0, 120]}
        ]
    });
    // 插地SE模板：本体显形、击飞子弹消失时播放一次。
    AudioManager.playSe({name: "Sword7", volume: 90, pitch: 90, pan: 0});
    // 演出期间保持不可被攻击，二阶段事件页负责重新加入碰撞分组。
    this.setDead();
};

// 米斯特汀回旋斩击
// 技能子弹负责控制中断；事件被冻结时解释器和动作序列均不会自行刷新。
// 返回true表示本段已中止。只挂在剑身/施法阶段上，已射出的独立剑气不受影响。
QJ.MPMZ.tl.MystletainnSkillInterrupt = function (mapId, moveType) {
    if (this.dead) return true;
    const data = this.data;
    if (data.mistilteinnServant && QJ.MPMZ.tl.MistilteinnServantInterrupted.call(this)) return true;
    if (data.vortexChargeId != null) {
        const owner = $gameMap.bulletQJ(data.vortexChargeId);
        if (!owner || owner.dead || QJ.MPMZ.tl.MystletainnSkillInterrupt.call(owner,
            owner.data.vortexMapId, owner.data.vortexMoveType)) {
            this.setDead();
            return true;
        }
        return false;
    }
    const event = mapId === $gameMap.mapId() ? $gameMap.event(data.eid) : null;
    const defeated = !event || event._erased || !event.drill_COET_hasTag("Mistilteinn")
        || $gameSelfSwitches.value([mapId, data.eid, 'D']);
    const controlled = !defeated && (event._IsDisabledCounter > 0 || event._IsDisabled);
    if (!defeated && !controlled) return false;

    if (controlled) {
        // 落剑归位中断时，在当前落剑的位置显形，不能跳回冲锋停止的屏外坐标。
        const returnBody = data.vortexReturning ? $gameMap.bulletQJ(data.vortexReturnId)
            : data.mistilteinnReturnBody ? this : null;
        if (returnBody && !returnBody.dead) event.setPosition(returnBody._realX, returnBody._realY);
        else if (data.slashCasterMapId != null) {
            event.setPosition(
                event._realX + (this.x - event.screenBoxXQJ()) / $gameMap.tileWidth(),
                event._realY + (this.y - event.screenBoxYQJ()) / $gameMap.tileHeight()
            );
        }
        if (moveType != null) event._moveType = moveType;
        event.drill_EASe_stopAct();
        event.drill_EASe_setSimpleStateNode(["剑形态-待机"]);
        // 只补一次刷新，使暂停中的事件也能立即输出待机贴图；不解除控制计时。
        event._drill_EASe_controller.update();
        event._groupListQJ = ["object", '"object"'];
        event.updateBoxBodyPositionQJ();
        $gameMap.refreshUpdateBoxDataQJ();
        if (event._interpreter) {
            event._interpreter._mistilteinnComboStep = 1;
            event._interpreter._waitCount = 0;
        }
    }
    if (data.slashEffectId != null) {
        const effect = $gameMap.bulletQJ(data.slashEffectId);
        if (effect && !effect.dead) effect.setDead();
    }
    this.dataRem.length = 0;
    this.setDead();
    return true;
};

// 事件脚本：QJ.MPMZ.tl.MystletainnSpinningSlash.call(this, {angle: 90});
// 坐标调用：QJ.MPMZ.tl.MystletainnSpinningSlash({posX: 300, posY: 400, angle: 90, damage: 10});
// posX/posY 使用QJ的['S']坐标（未乘地图zoom），作为原施法点，仍应用动画前移105px的补偿。
// angle：0上/90右/180下/270左；spinFrames：剑身自转每圈帧数。
// speed 可选：按中心前进速度同步调整特效播放速度；省略时使用224号动画的速度。
QJ.MPMZ.tl.MystletainnSpinningSlash = function (extra = {}) {
    const cast = extra.servantCast ?? this?.data?.mistilteinnServant;
    const skillScale = extra.scale ?? cast?.scale ?? this?.data?.mistilteinnScale ?? 1;

    const playerCast = extra.playerCast === true || !!cast;
    const eid = cast ? cast.eid : playerCast ? null : (extra.eid ?? this?._eventId);
    const caster = eid != null ? $gameMap.event(eid) : null;
    const posX = extra.posX ?? caster?.screenBoxXShowQJ();
    const posY = extra.posY ?? caster?.screenBoxYShowQJ();
    if (posX == null || posY == null) return;
    const restoreCaster = caster && !caster._erased && caster.drill_COET_hasTag("Mistilteinn");
    const casterMapId = restoreCaster ? $gameMap.mapId() : null;
    const deathScript = restoreCaster ? `$gameSelfSwitches.value([${casterMapId}, ${eid}, 'D'])` : null;
    if (restoreCaster && ($gameSelfSwitches.value([casterMapId, eid, 'D'])
        || caster._IsDisabledCounter > 0 || caster._IsDisabled)) return;

    const angle = extra.angle ?? 0;
    const spinFrames = Math.max(1, Math.round(extra.spinFrames ?? 30));
    const damage = extra.damage ?? (playerCast ? chahuiUtil.getVarianceDamage(1) : 60);
    const attackData = playerCast
        ? {mistilteinnFriendlyDamage: true, nonPlayerDamage: true, immuneItself: cast?.eid, magicAttack: false, defPenetration: cast ? 0 : (extra.defPenetration ?? 20)}
        : {nonPlayerDamage: true, magicAttack: false, immuneItself: eid};
    const radian = angle * Math.PI / 180;
    const effect = QJ.MPMZ.Shoot({
        mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
        img: ['A', 224],
        groupName: [cast ? cast.group : playerCast ? "MistilteinnWeaponSkill" : "Mistilteinn"],
        initialRotation: ['S', angle - 90],
        existData: [...(restoreCaster ? [{t: ['S', deathScript, true]}] : []), {t: ['AE']}],
        position: [['S', posX + Math.sin(radian) * 105 * skillScale], ['S', posY - Math.cos(radian) * 105 * skillScale]],
        moveType: ['S', 0],
        opacity: 0.8,
        z: "MF_BG",
        scale: skillScale
    });
    if (!effect) return;

    const sword = QJ.MPMZ.Shoot({
        mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
        img: "Mistilteinn_swordIdle[6,6]",
        groupName: [cast ? cast.group : playerCast ? "MistilteinnWeaponSkill" : "Mistilteinn"],
        eid,
        playerMapId: playerCast ? $gameMap.mapId() : null,
        slashAttackData: attackData,
        slashCasterMapId: casterMapId,
        slashCasterMoveType: restoreCaster ? caster._moveType : null,
        slashLastCasterSync: -4,
        slashEffectId: effect.index,
        slashSpeed: extra.speed,
        slashDuration: extra.duration,
        slashSpinFrames: spinFrames,
        slashSpinSign: extra.clockwise === false ? -1 : 1,
        slashReady: false,
        slashTurn: -1,
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', angle],
        moveType: ['S', 0],
        // 位置和自转统一按特效实际播放时间更新，加载期间不显示、不命中。
        imgRotation: ['R', 0, true],
        opacity: 0,
        // 单帧 61×118，旋转轴放在约 y=106 的剑柄处。
        damage,
        anchor: [0.5, 0.9],
        scale: skillScale,
        // 判定从剑柄延伸至剑尖，独立锚点让剑身矩形也绕剑柄转动。
        collisionBox: ['R', 22, 106, 0.5, 1],
        judgeAccuracyRotation: 6,
        judgeAccuracyMove: 8,
        z: 11,
        existData: [
            ...(playerCast ? [] : [{
                t: ['P'], p: [-1, false, true],
                c: ['S', 'this.data.slashReady'],
                a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [damage, 1]]
            }]),
            {
                t: ['G', ['"enemy"', '"object"', 'object']], p: [-1, false, true],
                c: ['S', 'this.data.slashReady'],
                a: ['F', (cast ? QJ.MPMZ.tl.MistilteinnServantHit : playerCast ? QJ.MPMZ.tl.MistilteinnFriendlyHit : QJ.MPMZ.tl.ex_toEnemyAttack), [playerCast ? damage : damage * 2, attackData]]
            },
            ...(restoreCaster ? [{t: ['S', deathScript, true]}] : [])
        ],
        moveF: [[0, 0, QJ.MPMZ.tl.MystletainnSpinningSlashUpdate]]
    });
    if (!sword) {
        effect.setDead();
        return;
    }
    if (restoreCaster) {
        caster.drill_EASe_setSimpleStateNode(["占位符"]);
        // 事件页的其他技能会先清空分组，回旋斩必须重新加入，隐藏期间仍可受击。
        caster._groupListQJ = ["object", '"object"'];
        caster._moveType = 0;
        $gameMap.refreshUpdateBoxDataQJ();
    }
    return sword;
};

// 仅让带有米斯特汀标签的施法本体归位；纯坐标及其他事件模板不改变本体。
QJ.MPMZ.tl.MystletainnSpinningSlashEnd = function () {
    const data = this.data;
    if (data.slashCasterMapId != null && data.slashCasterMapId === $gameMap.mapId()) {
        if ($gameSelfSwitches.value([data.slashCasterMapId, data.eid, 'D'])) {
            // 死亡页接管本体，不能再移动本体、恢复碰撞或覆盖死亡演出。
            const effect = $gameMap.bulletQJ(data.slashEffectId);
            if (effect && !effect.dead) effect.setDead();
            this.setDead();
            return;
        }
        const event = $gameMap.event(data.eid);
        if (event && !event._erased && event.drill_COET_hasTag("Mistilteinn")) {
            // x/y为地图像素坐标，将事件碰撞中心对齐剑柄，包含BoxOffset的补偿。
            const x = event._realX + (this.x - event.screenBoxXQJ()) / $gameMap.tileWidth();
            const y = event._realY + (this.y - event.screenBoxYQJ()) / $gameMap.tileHeight();
            event.setPosition(x, y);
            event._moveType = data.slashCasterMoveType;
            event.drill_EASe_setAct("闪现");
            event.drill_EASe_setSimpleStateNode(["剑形态-待机"]);
            event._groupListQJ = ["object", '"object"'];
            event.updateBoxBodyPositionQJ();
            $gameMap.refreshUpdateBoxDataQJ();
        }
    }
    // 无参数setDead不会执行deadF，因此在销毁之前显式恢复本体。
    this.setDead();
};

// MGC_W2_Slash 的 RotBase 初始Z角固定为0；剑柄跟随 Slash_SingleB 的中心。
QJ.MPMZ.tl.MystletainnSpinningSlashUpdate = function () {
    const data = this.data;
    const skillScale = data.mistilteinnScale ?? 1;
    if (data.playerCast && (data.playerMapId !== $gameMap.mapId() || $gameParty.leader().isDead())) {
        const effect = $gameMap.bulletQJ(data.slashEffectId);
        if (effect && !effect.dead) effect.setDead();
        this.setDead();
        return;
    }
    // 在moveF的移动/伤害之前检查，避免existData尚未执行时再推进一帧技能。
    if (data.slashCasterMapId != null && QJ.MPMZ.tl.MystletainnSkillInterrupt.call(this,
        data.slashCasterMapId, data.slashCasterMoveType)) return;
    const effect = $gameMap.bulletQJ(data.slashEffectId);
    if (!effect || effect.dead) {
        QJ.MPMZ.tl.MystletainnSpinningSlashEnd.call(this);
        return;
    }
    let sprite = this._mistilteinnSlashSprite;
    if (!sprite || !sprite.transform || sprite.data !== effect) {
        sprite = $gameMap.findBulletSpriteQJ(effect);
        if (!sprite || !sprite.selfAnimationSprite) {
            data.slashReady = false;
            this.opacity = 0;
            return;
        }
        // 缓存仅用于运行时，避免逐帧扫描容器，也不把PIXI对象写进存档。
        Object.defineProperty(this, '_mistilteinnSlashSprite', {value: sprite, writable: true, configurable: true});
        data.slashElapsed = 0;
        data.slashLastFrame = Graphics.frameCount;
        if (data.slashSpeed > 0) {
            const animation = sprite.selfAnimationSprite;
            const viewport = animation._viewportSize;
            const height = Graphics._app.renderer.view.height;
            const unitPixels = viewport * (animation._animation.scale / 100) * skillScale / (2 * (1 + 10 * viewport / height));
            const speed = data.slashSpeed * $gameScreen.zoomScale() * 168 / (20.9 * unitPixels) * 100;
            // 每次施法单独调速，不修改$dataAnimations[224]。
            animation._animation = Object.assign({}, animation._animation, {speed});
        }
    }
    const animation = sprite.selfAnimationSprite;
    if (!animation || !animation._started) {
        data.slashReady = false;
        this.opacity = 0;
        data.slashLastFrame = Graphics.frameCount;
        return;
    }
    // QJ既手动更新动画精灵，父容器也更新它，_frameIndex会每游戏帧增加两次。
    // Effekseer在SceneManager.updateMain中先于地图更新，每个有效游戏帧只前进一步。
    // 不累加快进造成的同帧重复回调，也不累加失焦时Effekseer暂停的帧。
    if (data.slashLastFrame !== Graphics.frameCount) {
        if (SceneManager.isGameActive()) data.slashElapsed++;
        data.slashLastFrame = Graphics.frameCount;
    }
    const elapsed = data.slashElapsed;
    const t = elapsed * animation._animation.speed / 100;
    if (t >= 168 || (data.slashDuration != null && elapsed >= data.slashDuration)) {
        QJ.MPMZ.tl.MystletainnSpinningSlashEnd.call(this);
        return;
    }

    const phase = 4.9 * t * Math.PI / 180;
    const tilt = 20 * Math.PI / 180;
    const x = -10.1 + 20.9 * t / 168 + 4.4 * Math.sin(phase);
    const y = -4.4 * Math.cos(phase) * Math.cos(tilt);
    const z = -4.4 * Math.cos(phase) * Math.sin(tilt);
    const scale = animation._animation.scale / 100 * skillScale;
    const viewport = animation._viewportSize;
    const height = Graphics._app.renderer.view.height;
    // 对应当前MZ的透视矩阵；投影所得屏幕位移再除地图zoom，转换为子弹坐标。
    const pixels = viewport * scale / (2 * (1 + (10 - z * scale) * viewport / height)) / $gameScreen.zoomScale();
    const direction = data.initialRotation * Math.PI / 180;
    this.x = effect.x + pixels * (x * Math.sin(direction) - y * Math.cos(direction));
    this.y = effect.y + pixels * (-x * Math.cos(direction) - y * Math.sin(direction));
    this.rotationImg = data.initialRotation + data.slashSpinSign * 360 * elapsed / data.slashSpinFrames;
    this._needRefreshBox = true;
    this.opacity = 1;
    if (!data.slashReady) this.dataRem.length = 0; // 首次定位不从施法点扫出一条伤害路径。
    data.slashReady = true;

    if (data.slashCasterMapId != null && data.slashCasterMapId === $gameMap.mapId()
        && elapsed - data.slashLastCasterSync >= 4) {
        data.slashLastCasterSync = elapsed;
        const event = $gameMap.event(data.eid);
        if (event && !event._erased && event.drill_COET_hasTag("Mistilteinn")) {
            // 与正常结束时相同，以剑柄位置对齐事件碰撞中心，包含BoxOffset补偿。
            event.setPosition(
                event._realX + (this.x - event.screenBoxXQJ()) / $gameMap.tileWidth(),
                event._realY + (this.y - event.screenBoxYQJ()) / $gameMap.tileHeight()
            );
            event.updateBoxBodyPositionQJ();
        }
    }

    const turn = Math.floor(elapsed / data.slashSpinFrames);
    if (turn !== data.slashTurn) {
        data.slashTurn = turn;
        for (const detail of data.existData) {
            if (detail.t && (detail.t[0] === 'P' || detail.t[0] === 'G')) detail.havePierceCharacters = {};
        }
        if (turn > 0) {
            // 每完成一圈播放一次SE；在此替换音效名、音量、音调和声像。
            AudioManager.playSe({name: "Sword5", volume: 70, pitch: 100, pan: 0});
            const damage = this.data.damage;
            console.log(damage);
            const posX = this.inheritX();
            const posY = this.inheritY();
            const extra = data.slashAttackData ?? {nonPlayerDamage: true, immuneItself: data.eid};
            QJ.MPMZ.rangeAtk([['S',posX],['S',posY]],['G',['"enemy"','"object"']],['F',(data.mistilteinnServant ? QJ.MPMZ.tl.MistilteinnServantHit : data.playerCast ? QJ.MPMZ.tl.MistilteinnFriendlyHit : QJ.MPMZ.tl.ex_toEnemyAttack),[damage,extra]],['C', 70 * skillScale]);
            if (!data.playerCast) {
                QJ.MPMZ.rangeAtk([['S',posX],['S',posY]],['G',['P']],['F',QJ.MPMZ.tl.ex_playerDamageCheck, [damage, 1]],['C', 70 * skillScale]);
            }
        }
    }
};

// 米斯特汀漩涡冲锋：同一入口负责发动、逐帧推进及ScarletFork归位后的收尾。
// QJ.MPMZ.tl.MystletainnVortexCharge.call(this, {angle: 90, damage: 10});
// angle只覆盖首轮朝向；每轮蓄势开始记录玩家位置，弧线瞄准后直线冲锋。
// speed为最高速度，startSpeed为蓄势速度，acceleration为冲锋每帧加速度（地图像素/帧）。
// windupFrames为每轮蓄势帧数，chargeFrames为每轮直线冲锋帧数。
// 冲锋出屏立即重新蓄势追击；duration为整段追击时长，默认300帧，结束后接ScarletFork归位。
QJ.MPMZ.tl.MystletainnVortexCharge = function (extra = {}) {
    const cast = extra.servantCast ?? this?.data?.mistilteinnServant;
    const skillScale = extra.scale ?? cast?.scale ?? this?.data?.mistilteinnScale ?? 1;
    const playerCast = extra.playerCast === true || this?.data?.playerCast === true || !!cast;

    if (extra.update || extra.finish) {
        if (this.dead) return;
        const data = this.data;
        if (QJ.MPMZ.tl.MystletainnSkillInterrupt.call(this, data.vortexMapId, data.vortexMoveType)) return;
        const event = $gameMap.event(data.eid);
        if (extra.finish) {
            event._moveType = data.vortexMoveType;
            this.setDead();
            return;
        }
        if (data.vortexReturning) return;
        if (data.vortexLastFrame === Graphics.frameCount) return;
        data.vortexLastFrame = Graphics.frameCount;
        if (!SceneManager.isGameActive()) return;
        data.vortexElapsed++;

        if (data.vortexRoundFrame === 0) {
            // 只在每轮开始读取玩家坐标，蓄势期间瞄准的是这个固定点。
            data.vortexTargetX = this.x + (cast ? QJ.MPMZ.tl.MistilteinnServantAim(cast) : $gamePlayer).screenBoxXShowQJ() - this.inheritX();
            data.vortexTargetY = this.y + (cast ? QJ.MPMZ.tl.MistilteinnServantAim(cast) : $gamePlayer).screenBoxYShowQJ() - this.inheritY();
            if (cast?.resonanceAngle != null) {
                // 共鸣无敌人时，每轮朝触发时玩家的面朝方向冲锋，不瞄准自身位置。
                const angle = cast.resonanceAngle * Math.PI / 180;
                data.vortexTargetX = this.x + 600 * Math.sin(angle);
                data.vortexTargetY = this.y - 600 * Math.cos(angle);
            }
            if (data.vortexTurn === 0 && data.vortexFirstAngle != null) {
                const distance = Math.max(240, Math.hypot(data.vortexTargetX - this.x, data.vortexTargetY - this.y));
                const angle = data.vortexFirstAngle * Math.PI / 180;
                data.vortexTargetX = this.x + distance * Math.sin(angle);
                data.vortexTargetY = this.y - distance * Math.cos(angle);
            }
            data.vortexWindupStartSpeed = data.vortexCurrentSpeed;
            for (const detail of data.existData) {
                if (detail.t && (detail.t[0] === 'P' || detail.t[0] === 'G')) detail.havePierceCharacters = {};
            }
            AudioManager.playSe({name: "Sword5", volume: 60, pitch: 85, pan: 0});
        }
        const charging = data.vortexRoundFrame >= data.vortexWindupFrames;
        let heading;
        if (!charging) {
            // 前6帧平滑刹车，余下时间保持低速，并逐渐弯向本轮锁定点。
            const brake = Math.min(1, (data.vortexRoundFrame + 1) / Math.min(6, data.vortexWindupFrames));
            const ease = brake * brake * (3 - 2 * brake);
            data.vortexCurrentSpeed = data.vortexWindupStartSpeed
                + (data.vortexStartSpeed - data.vortexWindupStartSpeed) * ease;
            const remaining = data.vortexWindupFrames - data.vortexRoundFrame;
            const targetHeading = Math.atan2(data.vortexTargetX - this.x, this.y - data.vortexTargetY)
                - data.vortexSign * Math.PI / 3 * (remaining - 1) / data.vortexWindupFrames;
            const currentHeading = this.rotationImg * Math.PI / 180;
            const turn = Math.atan2(Math.sin(targetHeading - currentHeading), Math.cos(targetHeading - currentHeading));
            heading = currentHeading + turn / remaining;
            // 最后一帧蓄势已指向锁定点；保存方向，之后整段冲锋不再转弯。
            data.vortexAim = heading;
        } else {
            if (data.vortexRoundFrame === data.vortexWindupFrames) {
                AudioManager.playSe({name: "Sword5", volume: 80, pitch: 125, pan: 0});
            }
            data.vortexCurrentSpeed = Math.min(data.vortexSpeed, data.vortexCurrentSpeed + data.vortexAcceleration);
            heading = data.vortexAim;
        }
        data.vortexRoundFrame++;
        this.x += data.vortexCurrentSpeed * Math.sin(heading);
        this.y -= data.vortexCurrentSpeed * Math.cos(heading);
        // 连续累计最短转角，避免atan2跨越±180°时让QJ插值出一次整圈碰撞。
        this.rotationImg += ((heading * 180 / Math.PI - this.rotationImg) % 360 + 540) % 360 - 180;
        // 横向速度尾迹读取移动角r；手动推进坐标时需同步，才能始终垂直于冲锋方向。
        this.rotationMove = this.rotationImg;
        const speedTrail = data.trailEffect[1];
        speedTrail.alpha = data.vortexRoundFrame > data.vortexWindupFrames
            ? Math.min(0.85, speedTrail.alpha + 0.08)
            : Math.max(0, speedTrail.alpha - 0.04);
        this._needRefreshBox = true;
        event.setPosition(
            event._realX + (this.x - event.screenBoxXQJ()) / $gameMap.tileWidth(),
            event._realY + (this.y - event.screenBoxYQJ()) / $gameMap.tileHeight()
        );
        event.updateBoxBodyPositionQJ();

        if (data.vortexRoundFrame >= data.vortexWindupFrames + data.vortexChargeFrames) {
            data.vortexTurn++;
            data.vortexRoundFrame = 0;
        }

        // 以61×118贴图旋转后的外框判断整把剑出屏，包含滚屏、缩放中心与震屏。
        const zoom = $gameScreen.zoomScale();
        const baseScale = drowsepost.rendersize.scale;
        const left = (Math.round($gameScreen.zoomX() * (zoom - baseScale)) - Math.round($gameScreen.shake())) / zoom;
        const top = Math.round($gameScreen.zoomY() * (zoom - baseScale)) / zoom;
        const sin = Math.sin(heading), cos = Math.cos(heading);
        const cx = this.inheritX() + 47.2 * skillScale * sin;
        const cy = this.inheritY() - 47.2 * skillScale * cos;
        const halfWidth = (30.5 * Math.abs(cos) + 59 * Math.abs(sin)) * skillScale;
        const halfHeight = (30.5 * Math.abs(sin) + 59 * Math.abs(cos)) * skillScale;
        const outside = cx + halfWidth < left || cx - halfWidth > left + Graphics.width / zoom
            || cy + halfHeight < top || cy - halfHeight > top + Graphics.height / zoom;
        if (data.vortexElapsed >= data.vortexDuration) {
            data.vortexReturning = true;
            // QJ每帧从data.opacity刷新透明度；归位期间持续隐藏剑身，避免下一帧重新显形。
            data.opacity = QJ.MPMZ.createDEFrameQJ(0, 0);
            this.opacity = 0;
            // 保留已有轨迹供拖尾淡出，停止追击控制子弹的记录和插值判定。
            this.needRemData = false;
            this.needAccuracy = false;
            event._groupListQJ = [];
            event.hideHpBar();
            $gameMap.refreshUpdateBoxDataQJ();
            // 追击计时结束，直接接落剑段，在此时锁定玩家附近并完成归位。
            QJ.MPMZ.tl.MystletainnScarletFork.call(this, {plungingAttack: true, vortexChargeId: this.index});
        } else if (charging && outside && !data.vortexOutside) {
            // 刚出屏就结束本轮冲锋，下一帧重新锁定玩家；不再带着高速惯性冲远。
            if (data.vortexRoundFrame !== 0) data.vortexTurn++;
            data.vortexRoundFrame = 0;
            data.vortexCurrentSpeed = data.vortexStartSpeed;
        }
        // 仍在屏外时不反复重置蓄势，允许新一轮追击正常冲回画面。
        data.vortexOutside = outside;
        return;
    }

    const eid = cast?.eid ?? extra.eid ?? this?._eventId;
    const event = eid != null ? $gameMap.event(eid) : null;
    if (!event || event._erased || !event.drill_COET_hasTag("Mistilteinn")
        || $gameSelfSwitches.value([$gameMap.mapId(), eid, 'D'])
        || event._IsDisabledCounter > 0 || event._IsDisabled) return;
    const posX = event.screenBoxXShowQJ(), posY = event.screenBoxYShowQJ();
    const angle = extra.angle ?? QJ.calculateAngleByTwoPointAngle(
        posX, posY, (cast ? QJ.MPMZ.tl.MistilteinnServantAim(cast) : $gamePlayer).screenBoxXShowQJ(), (cast ? QJ.MPMZ.tl.MistilteinnServantAim(cast) : $gamePlayer).screenBoxYShowQJ());
    const sign = extra.clockwise === false ? -1 : 1;
    const damage = extra.damage ?? 60;
    const speed = Math.max(1, extra.speed ?? 24);
    const startSpeed = Math.min(speed, Math.max(1, extra.startSpeed ?? 3));
    const sword = QJ.MPMZ.Shoot({
        mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
        img: "Mistilteinn_swordIdle[6,6]",
        groupName: [cast ? cast.group : "Mistilteinn"],
        eid,
        vortexMapId: $gameMap.mapId(),
        vortexMoveType: event._moveType,
        vortexSign: sign, vortexFirstAngle: extra.angle ?? null,
        vortexAim: angle * Math.PI / 180,
        vortexRoundFrame: 0, vortexWindupFrames: Math.max(1, Math.round(extra.windupFrames ?? 30)),
        vortexChargeFrames: Math.max(1, Math.round(extra.chargeFrames ?? 48)),
        vortexDuration: Math.max(1, Math.round(extra.duration ?? 300)), vortexOutside: false,
        vortexSpeed: speed,
        vortexStartSpeed: startSpeed, vortexCurrentSpeed: startSpeed,
        vortexAcceleration: Math.max(0, extra.acceleration ?? 0.9),
        vortexTurn: 0, vortexElapsed: 0, vortexLastFrame: Graphics.frameCount,
        vortexReturning: false,
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', angle - sign * 90],
        imgRotation: ['R', 0, true],
        moveType: ['S', 0],
        anchor: [0.5, 0.9], scale: skillScale, z: 11,
        // 取六帧横排素材第一帧的剑身中线，按历史剑身角度铺出拖尾。
        trailEffect: [{
            img: ['L', 30, 1, 0, 0.999999999],
            existTime: 0, disappearTime: 24,
            alpha: 0.55, blendMode: 1,
            imgStretchMode: 0, hOrV: true,
            aboveProjectile: false, ifProjctileWait: false
        }, {
            // 第一帧y=78的横向截面，生成有宽度的后方尾迹；QJ裁切高度用比例指定1像素。
            img: ['L', 0, 61, 78, 1 / 118],
            existTime: 0, disappearTime: 24,
            alpha: 0, blendMode: 1,
            imgStretchMode: 0, hOrV: false,
            aboveProjectile: false, ifProjctileWait: false
        }],
        collisionBox: ['R', 22, 106, 0.5, 1],
        judgeAccuracyRotation: 6,
        judgeAccuracyMove: 4,
        existData: [
            ...(playerCast ? [] : [{t: ['P'], p: [-1, false, true], c: ['S', '!this.data.vortexReturning'],
                a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [damage, 1]]}]),
            {t: ['G', ['"enemy"', '"object"', 'object']], p: [-1, false, true],
                c: ['S', '!this.data.vortexReturning'],
                a: ['F', (cast ? QJ.MPMZ.tl.MistilteinnServantHit : playerCast ? QJ.MPMZ.tl.MistilteinnFriendlyHit : QJ.MPMZ.tl.ex_toEnemyAttack), [playerCast ? damage : damage * 2, {...(playerCast ? {mistilteinnFriendlyDamage: true} : {}), nonPlayerDamage: true, immuneItself: eid}]]}
        ],
        moveF: [[0, 0, QJ.MPMZ.tl.MystletainnVortexCharge, [{update: true}]]]
    });
    if (!sword) return;
    event.drill_EASe_setSimpleStateNode(["占位符"]);
    event._groupListQJ = ["object", '"object"'];
    event._moveType = 0;
    $gameMap.refreshUpdateBoxDataQJ();
    return sword;
};

// 米斯特汀散射剑气簇：原地旋转240帧，以剑柄为轴，每隔随机4～8帧沿剑尖方向发射。
// QJ.MPMZ.tl.MystletainnScatterSwordBeamCluster.call(this, {damage: 10});
// angle为起始朝向；spinFrames为每圈帧数；clockwise:false反转旋转方向。
QJ.MPMZ.tl.MystletainnScatterSwordBeamCluster = function (extra = {}) {
    const cast = extra.servantCast ?? this?.data?.mistilteinnServant;
    const skillScale = extra.scale ?? cast?.scale ?? this?.data?.mistilteinnScale ?? 1;

    if (extra.update) {
        if (this.dead) return;
        const data = this.data;
        if (data.mistilteinnServant && QJ.MPMZ.tl.MistilteinnServantInterrupted.call(this)) return;
        if (data.playerCast) {
            if (data.scatterMapId !== $gameMap.mapId() || $gameParty.leader().isDead()) {
                this.setDead();
                return;
            }
        } else if (QJ.MPMZ.tl.MystletainnSkillInterrupt.call(this, data.scatterMapId, data.scatterMoveType)) return;
        const event = data.playerCast && !data.mistilteinnServant ? null : $gameMap.event(data.eid);
        if (data.scatterLastFrame === Graphics.frameCount) return;
        data.scatterLastFrame = Graphics.frameCount;
        if (!SceneManager.isGameActive()) return;
        data.scatterElapsed++;
        if (data.scatterElapsed >= 240) {
            if (event) {
                event._moveType = data.scatterMoveType;
                event.drill_EASe_setAct("闪现");
                event.drill_EASe_setSimpleStateNode(["剑形态-待机"]);
                event.updateBoxBodyPositionQJ();
            }
            // 正常结束后已射出的剑气继续飞行，剑身拖尾由QJ自然淡出。
            this.setDead();
            return;
        }

        this.rotationImg = data.scatterAngle + data.scatterSign * 360 * data.scatterElapsed / data.scatterSpinFrames;
        this._needRefreshBox = true;
        const turn = Math.floor(data.scatterElapsed / data.scatterSpinFrames);
        if (turn > data.scatterTurn) {
            data.scatterTurn = turn;
            for (const detail of data.existData) {
                if (detail.t && (detail.t[0] === 'P' || detail.t[0] === 'G')) detail.havePierceCharacters = {};
            }
        }
        if (data.scatterElapsed < data.scatterNextShot) return;
        data.scatterNextShot = data.scatterElapsed + 4 + Math.randomInt(5);
        const angle = this.rotationImg;
        const radians = angle * Math.PI / 180;
        QJ.MPMZ.tl.MystletainnScatterSwordBeamCluster({
            beam: true, scale: skillScale, playerCast: data.playerCast, eid: data.eid, servantCast: data.mistilteinnServant,
            damage: data.scatterDamage, defPenetration: data.scatterDefPenetration,
            mdfPenetration: data.scatterMdfPenetration,
            posX: this.inheritX() + 106 * skillScale * Math.sin(radians),
            posY: this.inheritY() - 106 * skillScale * Math.cos(radians), angle
        });
        AudioManager.playSe({name: "Sword5", volume: 60, pitch: 110, pan: 0});
        return;
    }

    const playerCast = extra.playerCast === true || !!cast;
    const eid = cast ? cast.eid : playerCast ? null : (extra.eid ?? this?._eventId);
    const damage = extra.damage ?? (playerCast ? Math.round(chahuiUtil.getVarianceDamage(1) * 0.6) : 60);
    const attackData = playerCast
        ? {mistilteinnFriendlyDamage: true, nonPlayerDamage: true, immuneItself: cast?.eid, magicAttack: extra.beam === true,
            defPenetration: cast ? 0 : (extra.defPenetration ?? 20), mdfPenetration: cast ? 0 : (extra.mdfPenetration ?? 20)}
        : {nonPlayerDamage: true, magicAttack: extra.beam === true, immuneItself: eid};
    // 单枚剑波与散射中的剑波共用贴图、运动、寿命和伤害规则。
    if (extra.beam) {
        return QJ.MPMZ.Shoot({
            mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
            img: "ForceWaveBeam2[7,6]",
            // 独立分组，魔剑击倒时清理Mistilteinn组不会抹除已射出的剑气。
            groupName: [cast ? cast.beamGroup : playerCast ? "MistilteinnWeaponBeam" : "MistilteinnScatterBeam"],
            position: [['S', extra.posX], ['S', extra.posY]],
            initialRotation: ['S', extra.angle],
            imgRotation: ['F'],
            moveType: ['S', '0|6~30/15~999|15'],
            scale: skillScale,
            anchor: [0.5, 0.65], opacity: 0.66,
            collisionBox: ['M', 90, 65, -165, 150, 0.5, 0.35],
            reuseCollisionBody: true, // 每枚剑气保留独立月牙体，高速补点时复用。
            judgeAccuracyMove: 6,
            blendMode: 0,
            z: "MF_UG",
            existData: [
                {t: ['R', [255]]},
                {t: ['Time', 90], d: [0, 12]},
                ...(playerCast ? [] : [{t: ['P'], p: [-1, false, true], a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [damage, 2]]}]),
                {t: ['G', ['"enemy"', '"object"', 'object']], p: [-1, false, true],
                    a: ['F', (cast ? QJ.MPMZ.tl.MistilteinnServantHit : playerCast ? QJ.MPMZ.tl.MistilteinnFriendlyHit : QJ.MPMZ.tl.ex_toEnemyAttack), [playerCast ? damage : damage * 2, attackData]]}
            ]
        });
    }
    const event = eid != null ? $gameMap.event(eid) : null;
    if (!playerCast && (!event || event._erased || !event.drill_COET_hasTag("Mistilteinn")
        || $gameSelfSwitches.value([$gameMap.mapId(), eid, 'D'])
        || event._IsDisabledCounter > 0 || event._IsDisabled)) return;
    const posX = extra.posX ?? event?.screenBoxXShowQJ();
    const posY = extra.posY ?? event?.screenBoxYShowQJ();
    if (posX == null || posY == null) return;
    const angle = extra.angle ?? 0;
    const sword = QJ.MPMZ.Shoot({
        mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
        img: "Mistilteinn_swordIdle[6,6]",
        groupName: [cast ? cast.group : playerCast ? "MistilteinnWeaponSkill" : "Mistilteinn"],
        eid,
        scatterDefPenetration: attackData.defPenetration,
        scatterMdfPenetration: attackData.mdfPenetration,
        scatterMapId: $gameMap.mapId(), scatterMoveType: event?._moveType,
        scatterAngle: angle, scatterSign: extra.clockwise === false ? -1 : 1,
        scatterSpinFrames: Math.max(1, extra.spinFrames ?? 18),
        scatterElapsed: 0, scatterLastFrame: Graphics.frameCount, scatterTurn: 0,
        scatterNextShot: 4 + Math.randomInt(5), scatterDamage: damage,
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', angle], imgRotation: ['R', 0, true], moveType: ['S', 0],
        // 单帧61×118，旋转轴位于约y=106的剑柄；判定从剑柄延伸至剑尖。
        anchor: [0.5, 0.9], scale: skillScale, z: 11,
        collisionBox: ['R', 22, 106, 0.5, 1], judgeAccuracyRotation: 6,
        trailEffect: [{
            img: ['L', 30, 1, 0, 0.999999999],
            existTime: 0, disappearTime: 18, alpha: 0.55, blendMode: 1,
            imgStretchMode: 0, hOrV: true, aboveProjectile: false, ifProjctileWait: false
        }],
        existData: [
            ...(playerCast ? [] : [{t: ['P'], p: [-1, false, true], a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [damage, 1]]}]),
            {t: ['G', ['"enemy"', '"object"', 'object']], p: [-1, false, true],
                a: ['F', (cast ? QJ.MPMZ.tl.MistilteinnServantHit : playerCast ? QJ.MPMZ.tl.MistilteinnFriendlyHit : QJ.MPMZ.tl.ex_toEnemyAttack), [playerCast ? damage : damage * 2, attackData]]}
        ],
        moveF: [[0, 0, QJ.MPMZ.tl.MystletainnScatterSwordBeamCluster, [{update: true}]]]
    });
    if (!sword) return;
    if (playerCast && !cast) return sword;
    event.drill_EASe_setSimpleStateNode(["占位符"]);
    event._groupListQJ = ["object", '"object"'];
    event._moveType = 0;
    event.updateBoxBodyPositionQJ();
    $gameMap.refreshUpdateBoxDataQJ();
    return sword;
};

// 米斯特汀弧光斩攻击
QJ.MPMZ.tl.MystletainnMoonlightSlash = function (extra = {}) {
    const cast = extra.servantCast ?? this?.data?.mistilteinnServant;
    const skillScale = extra.scale ?? cast?.scale ?? this?.data?.mistilteinnScale ?? 1;
    const playerCast = extra.playerCast === true || this?.data?.playerCast === true || !!cast;

    const skillMapId = this.data?.mistilteinnMapId ?? this.data?.vortexMapId ?? $gameMap.mapId();
    if (this.data?.mistilteinnMapId != null
        && QJ.MPMZ.tl.MystletainnSkillInterrupt.call(this, skillMapId)) return;


    if (extra.MoonlightSlash) {
        let posX = this.inheritX();
        let posY = this.inheritY();         
        let damage = cast?.damage ?? extra.damage ?? this.data?.castDamage ?? 60;
        let scaleX = this.data.isRight ? -1 : 1;
        QJ.MPMZ.Shoot({
            mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
            castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
            castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
            img: "Mistilteinn_MoonlightSlash[10,6]",
            groupName: [cast ? cast.group : "Mistilteinn"],
            position: [['S',posX], ['S',posY]],
            initialRotation: ['S', 0],
            imgRotation: ['S', 0],
            scale: [scaleX * skillScale, skillScale],
            opacity: 1,
            eid: this.data.eid, mistilteinnMapId: skillMapId,
            anchor: [0.5, 0.5],
            moveType: ['S', 0],
            collisionBox: this.data.isRight ? ['S', 135, 105, 120] : ['S', 135, -45, 120],
            z: 6,
            existData: [
                {t:['Time', 59], a:['S', `const Mistilteinn = $gameMap.event(${this.data.eid});
                                            if (Mistilteinn && !$gameSelfSwitches.value([$gameMap.mapId(), ${this.data.eid}, 'D'])) {
                                                Mistilteinn.drill_EASe_setAct( "攻击后摇" );
                                                Mistilteinn.drill_EASe_setSimpleStateNode( ["剑形态-待机"] );
                                                Mistilteinn._groupListQJ = ["object", '"object"'];
                                                Mistilteinn.updateBoxBodyPositionQJ();
                                                $gameMap.refreshUpdateBoxDataQJ();
                                            }`]},
                ...(playerCast ? [] : [{t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[damage, 1]], p:[-1,false,true], c:['S', "this.time > 30 && this.time < 36"]}]),
                {
                    t: ['G', ['"enemy"', '"object"', 'object']],
                    c: ['S', 'this.time > 30 && this.time < 36'], p: [-1, false, true],
                    a: ['F', (cast ? QJ.MPMZ.tl.MistilteinnServantHit : playerCast ? QJ.MPMZ.tl.MistilteinnFriendlyHit : QJ.MPMZ.tl.ex_toEnemyAttack), [playerCast ? damage : damage*2, {...(playerCast ? {mistilteinnFriendlyDamage: true} : {}), nonPlayerDamage: true, immuneItself: this.data.eid}]]
                },
            ],
            moveF: [[0, 0, QJ.MPMZ.tl.MystletainnSkillInterrupt, [skillMapId]]],
            moveJS: [
                24, 999, "AudioManager.playSe({name: '剣で斬る3', volume: 85, pitch: 120 + Math.randomInt(30), pan: 0})"
            ]
        });     
        return;
    }

    const eid = cast?.eid ?? extra.eid ?? this._eventId;
    const Mistilteinn = $gameMap.event(eid);
    if (!Mistilteinn || Mistilteinn._erased || $gameSelfSwitches.value([skillMapId, eid, 'D'])
        || Mistilteinn._IsDisabledCounter > 0 || Mistilteinn._IsDisabled) return;
    Mistilteinn.drill_EASe_setAct( "攻击前摇" );
    Mistilteinn.drill_EASe_setSimpleStateNode( ["占位符"] );
    let posX = (cast ? QJ.MPMZ.tl.MistilteinnServantAim(cast) : $gamePlayer).screenBoxXShowQJ() - 20 + Math.randomInt(40);
    let posY = (cast ? QJ.MPMZ.tl.MistilteinnServantAim(cast) : $gamePlayer).screenBoxYShowQJ() - 12 + Math.randomInt(36);
    const isRight = Mistilteinn.screenBoxXShowQJ() > posX;
    if (isRight) {
        posX += 72 * skillScale;
    } else {
        posX -= 72 * skillScale;
    } 
    QJ.MPMZ.Shoot({
        mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
        castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
        castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
        position: [['S',posX], ['S',posY]],
        groupName: [cast ? cast.group : "Mistilteinn"],
        initialRotation: ['S', 0],
        imgRotation: ['S', 0],
        eid, mistilteinnMapId: skillMapId,
        isRight,
        moveType: ['S', 0],
        moveF: [[0, 0, QJ.MPMZ.tl.MystletainnSkillInterrupt, [skillMapId]]],
        existData: [
            {t:['Time', 40], a:['F', QJ.MPMZ.tl.MystletainnMoonlightSlash, [{MoonlightSlash:true}]]}        
        ]
    }); 
};

// 米斯特汀裂地波攻击
QJ.MPMZ.tl.MystletainnForceWave = function (extra = {}) {
    const cast = extra.servantCast ?? this?.data?.mistilteinnServant;
    const skillScale = extra.scale ?? cast?.scale ?? this?.data?.mistilteinnScale ?? 1;
    const playerCast = extra.playerCast === true || this?.data?.playerCast === true || !!cast;

    const skillMapId = this.data?.mistilteinnMapId ?? this.data?.vortexMapId ?? $gameMap.mapId();
    if (this.data?.mistilteinnMapId != null
        && QJ.MPMZ.tl.MystletainnSkillInterrupt.call(this, skillMapId)) return;


    if (extra.trailingEffect) {
        const animX = this.inheritX();
        const animY = this.inheritY();
        let scaleX = this.scaleX;    
        QJ.MPMZ.Shoot({
            mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
            castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
            castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
            img:"ForceWaveBeam_start[4,4]",
            groupName: [cast ? cast.beamGroup : "Mistilteinn"],
            position:[['S', animX],['S', animY]],
            initialRotation: ['S', this.rotationMove],
            imgRotation:['S', 0],
            scale: [scaleX, 2 * skillScale],
            moveType:['S',0],
            opacity:'0|0.5~13/0',
            existData:[
               {t:['Time', 12]},	  
            ],
            //z: "MF_UG"
        });           

        if (this.time % 5 !== 0) return;

        const posX = this.x / 48;
        const posY = (this.y + 90) / 48;
        let name = "dust_walk" + this.time;
        let data = $gameScreen._particle.particleSet(0, name, 'tilemap', 'dust_walk', 'below', posX, posY);   
        $gameScreen._particle.reservePluginCommand(30,{},["clear",name],1);
        
        if ($gameMap.regionId(Math.floor(posX), Math.floor(posY)) === 5) {
            name = "grass_walk" + this.time;
            data = $gameScreen._particle.particleSet(0, name, 'tilemap', 'grass_walk', 'below', posX, posY);   
            $gameScreen._particle.reservePluginCommand(30,{},["clear",name],1);	   
        }        
        return;
    }

    if (extra.ForceWaveBeamEffect) {
        const animX = this.inheritX();
        const animY = this.inheritY() - 144 * skillScale;
        const scaleX = this.scaleX < 0 ? -2 : 2;
        let damage = cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage ?? 24;
        QJ.MPMZ.Shoot({
            mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
            castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
            castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
            img:"ForceWaveBeam_start[4,4]",
            groupName: [cast ? cast.beamGroup : "Mistilteinn"],
            position: [['S',animX], ['S',animY]],
            initialRotation: ['S', this.rotationMove],
            imgRotation: ['S', 0],
            moveType: ['S', 9],
            anchor:[0.5, 0.5], 
            scale: [scaleX * skillScale, 2 * skillScale],
            collisionBox: this.scaleX < 0 ? ['S', 25, 90, 180, 0.6, -0.1] : ['S', 25, -90, 180, 0.6, -0.1],
            z: "MF_UG", 
            existData: [ 
                {t:['Time', 120], d:[0, 30]},
                ...(playerCast ? [] : [{t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[damage, 1]], p:[-1,false,true]}]),
                {
                    t: ['G', ['"enemy"', '"object"', 'object']], p: [-1, false, true],
                    a: ['F', (cast ? QJ.MPMZ.tl.MistilteinnServantHit : playerCast ? QJ.MPMZ.tl.MistilteinnFriendlyHit : QJ.MPMZ.tl.ex_toEnemyAttack), [playerCast ? damage : damage*2, {...(playerCast ? {mistilteinnFriendlyDamage: true} : {}), nonPlayerDamage: true, magicAttack: playerCast, immuneItself: cast?.eid}]]
                },                
            ],
            moveF: [
                [1, 1, QJ.MPMZ.tl.MystletainnForceWave, [{trailingEffect:true}]]
            ]
        });           	          
        return;
    }

    if (extra.ForceWaveBeam) {
        const animX = this.inheritX();
        const animY = this.inheritY() + 35 * skillScale;
        let Rotation = this.scaleX < 0 ? 270 : 90;
        let scaleX = this.scaleX < 0 ? -2 : 2;
        QJ.MPMZ.Shoot({
            mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
            castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
            castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
            img:"ForceWaveBeam_start[4,4]",
            groupName: [cast ? cast.beamGroup : "Mistilteinn"],
            position: [['S',animX], ['S',animY]],
            initialRotation: ['S', Rotation],
            imgRotation: ['S', 0],
            moveType: ['S', '0|0~10/9~99|9'],
            anchor:[0.5, 1], 
            scale: [scaleX * skillScale, 2 * skillScale],
            z: "MF_UG", 
            existData: [ 
                {t:['Time', 15], a:['F', QJ.MPMZ.tl.MystletainnForceWave, [{ForceWaveBeamEffect:true}]]}
            ]
        });           	   
        AudioManager.playSe({name: "Fire1", volume: 70, pitch: 120 + Math.randomInt(30), pan: 0});	         
        return;
    }

    if (extra.terrainDamageEffect) {
        const animX = this.inheritX();
        const animY = this.inheritY() + 4 * skillScale;
        QJ.MPMZ.Shoot({
            mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
            castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
            castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
            img:"swordGraveSlot",
            position: [['S',animX], ['S',animY]],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            moveType: ['S', 0],
            anchor:[0.5,0.5], 
            scale: [this.scaleX, skillScale],
            z:"E", 
            existData: [ 
                {t:['Time', 360], d:[0,120]}
            ]
        });           	   
        AudioManager.playSe({name: "Earth1", volume: 70, pitch: 120 + Math.randomInt(30), pan: 0});	         
        return;
    }

    if (extra.forceWaveAction) {
        let posX = this.inheritX();
        let posY = this.inheritY();         
        let damage = cast?.damage ?? extra.damage ?? this.data?.castDamage ?? 60;
        let scaleX = this.data.isRight ? -1 : 1;
        QJ.MPMZ.Shoot({
            mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
            castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
            castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
            img: "Mistilteinn_forceWave[10,6]",
            groupName: [cast ? cast.group : "Mistilteinn"],
            position: [['S',posX], ['S',posY]],
            initialRotation: ['S', 0],
            imgRotation: ['S', 0],
            scale: [scaleX * skillScale, skillScale],
            opacity: 1,
            eid: this.data.eid, mistilteinnMapId: skillMapId,
            anchor: [0.8, 0.8],
            moveType: ['S', 0],
            collisionBox:['R', 40, 20],
            z: 6,
            existData: [
                {t:['Time', 59], a:['S', `const Mistilteinn = $gameMap.event(${this.data.eid});
                                            if (Mistilteinn && !$gameSelfSwitches.value([$gameMap.mapId(), ${this.data.eid}, 'D'])) {
                                                Mistilteinn.drill_EASe_setAct( "攻击后摇" );
                                                Mistilteinn.drill_EASe_setSimpleStateNode( ["剑形态-待机"] );
                                                Mistilteinn._groupListQJ = ["object", '"object"'];
                                                Mistilteinn.updateBoxBodyPositionQJ();
                                                $gameMap.refreshUpdateBoxDataQJ();
                                            }`]},
                ...(playerCast ? [] : [{t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[damage, 1]], p:[-1,false,true], c:['S', "this.time > 30 && this.time < 36"]}]),
                {
                    t: ['G', ['"enemy"', '"object"', 'object']],
                    c: ['S', 'this.time > 30 && this.time < 36'], p: [-1, false, true],
                    a: ['F', (cast ? QJ.MPMZ.tl.MistilteinnServantHit : playerCast ? QJ.MPMZ.tl.MistilteinnFriendlyHit : QJ.MPMZ.tl.ex_toEnemyAttack), [playerCast ? damage : damage*2, {...(playerCast ? {mistilteinnFriendlyDamage: true} : {}), nonPlayerDamage: true, immuneItself: this.data.eid}]]
                },
            ],
            moveF: [
                [0, 0, QJ.MPMZ.tl.MystletainnSkillInterrupt, [skillMapId]],
                [28, 999, QJ.MPMZ.tl.MystletainnForceWave, [{ForceWaveBeam: true}]],
                [32, 999, QJ.MPMZ.tl.MystletainnForceWave, [{terrainDamageEffect: true}]]
            ]
        });     
        return;
    }

    const eid = cast?.eid ?? extra.eid ?? this._eventId;
    const Mistilteinn = $gameMap.event(eid);
    if (!Mistilteinn || Mistilteinn._erased || $gameSelfSwitches.value([skillMapId, eid, 'D'])
        || Mistilteinn._IsDisabledCounter > 0 || Mistilteinn._IsDisabled) return;
    Mistilteinn.drill_EASe_setAct( "攻击前摇" );
    Mistilteinn.drill_EASe_setSimpleStateNode( ["占位符"] );
    let posX = (cast ? QJ.MPMZ.tl.MistilteinnServantAim(cast) : $gamePlayer).screenBoxXShowQJ();
    let posY = (cast ? QJ.MPMZ.tl.MistilteinnServantAim(cast) : $gamePlayer).screenBoxYShowQJ() - 12 + Math.randomInt(50);
    const isRight = Mistilteinn.screenBoxXShowQJ() > posX;
    if (isRight) {
        posX += 120 * skillScale;
    } else {
        posX -= 120 * skillScale;
    }
    QJ.MPMZ.Shoot({
        mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
        castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
        castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
        groupName: [cast ? cast.group : "Mistilteinn"],
        position: [['S',posX], ['S',posY]],
        initialRotation: ['S', 0],
        imgRotation: ['S', 0],
        eid, mistilteinnMapId: skillMapId,
        isRight,
        moveType: ['S', 0],
        moveF: [[0, 0, QJ.MPMZ.tl.MystletainnSkillInterrupt, [skillMapId]]],
        existData: [
            {t:['Time', 40], a:['F', QJ.MPMZ.tl.MystletainnForceWave, [{forceWaveAction:true}]]}        
        ]
    }); 
};

// 米斯特汀真红落刃攻击
QJ.MPMZ.tl.MystletainnScarletFork = function (extra = {}) {
    const cast = extra.servantCast ?? this?.data?.mistilteinnServant;
    const skillScale = extra.scale ?? cast?.scale ?? this?.data?.mistilteinnScale ?? 1;
    const playerCast = extra.playerCast === true || this?.data?.playerCast === true || !!cast;

    const skillMapId = this.data?.mistilteinnMapId ?? this.data?.vortexMapId ?? $gameMap.mapId();
    if (this.data?.mistilteinnMapId != null
        && QJ.MPMZ.tl.MystletainnSkillInterrupt.call(this, skillMapId)) return;

    // 漩涡追击沿用本技能的落剑/收剑流程，并绑定到冲锋子弹的生命周期。
    const vortexId = extra.vortexChargeId ?? this.data?.vortexChargeId;
    const vortex = vortexId != null ? $gameMap.bulletQJ(vortexId) : null;
    const vortexMapId = this.data?.vortexMapId ?? vortex?.data.vortexMapId;
    if (vortexId != null && (!vortex || vortex.dead || vortexMapId !== $gameMap.mapId()
        || $gameSelfSwitches.value([vortexMapId, vortex.data.eid, 'D']))) return;
    const vortexData = vortex ? {vortexChargeId: vortexId, vortexMapId, eid: vortex.data.eid} : {};
    const vortexEnd = vortex ? [{t: ['S',
        `$gameMap.mapId() !== ${vortexMapId} || !$gameMap.bulletQJ(${vortexId}) || $gameMap.bulletQJ(${vortexId}).dead || $gameSelfSwitches.value([${vortexMapId}, ${vortex.data.eid}, 'D'])`, true]}] : [];

    if (extra.autoSheathe) {
        let posX = this.inheritX();
        let posY = this.inheritY(); 
        let mapX = this._realX;
        let mapY = this._realY;
        let eid  = this.data.eid;  
        const sword = QJ.MPMZ.Shoot({
            mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
            castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
            castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
            img: "Mistilteinn_scarletFork4[2,12]",
            mistilteinnMapId: skillMapId, mistilteinnReturnBody: true,
            eid,
            groupName: [cast ? cast.group : "Mistilteinn"],
            ...vortexData,
            position: [['S',posX], ['S',posY]],
            initialRotation: ['S', 0],
            imgRotation: ['S', 0],
            scale: skillScale,
            opacity: 1,
            anchor: [0.72, 1.06],
            moveType: ['S', 0],
            z: 6,
            moveF: [[0, 0, QJ.MPMZ.tl.MystletainnSkillInterrupt, [skillMapId]]],
            existData: [
                ...vortexEnd,
                {t:['Time', 23], a:['S', `const event = $gameMap.event(${eid});
                                          if (event && event._drill_EASe_controller !== undefined && !$gameSelfSwitches.value([$gameMap.mapId(), ${eid}, 'D'])) {
                                              event._realX = ${mapX};
                                              event._realY = ${mapY};
                                              ${vortex || cast ? `event.setPosition(${mapX}, ${mapY});` : ''}
                                              event.drill_EASe_setAct( "闪现" );
                                              event.drill_EASe_setSimpleStateNode( ["剑形态-待机"] );
                                              event._groupListQJ = ["object", '"object"'];
                                              event.updateBoxBodyPositionQJ();
                                              $gameMap.refreshUpdateBoxDataQJ();
                                              ${vortex ? `QJ.MPMZ.tl.MystletainnVortexCharge.call($gameMap.bulletQJ(${vortexId}), {finish: true});` : ''}
                                         }`]}
            ]
        });
        if (vortex && sword) vortex.data.vortexReturnId = sword.index;
        AudioManager.playSe({name: "Sword5", volume: 70, pitch: 110 + Math.randomInt(30), pan: 0});     
        return;
    }

    if (extra.lingeringEffect) {
        let posX = this.inheritX();
        let posY = this.inheritY();   
        const sword = QJ.MPMZ.Shoot({
            mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
            castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
            castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
            img: "Mistilteinn_scarletFork3",
            mistilteinnMapId: skillMapId, mistilteinnReturnBody: true,
            groupName: [cast ? cast.group : "Mistilteinn"],
            ...vortexData,
            position: [['S',posX], ['S',posY]],
            initialRotation: ['S', 0],
            imgRotation: ['S', 0],
            scale: skillScale,
            opacity: 1,
            eid: this.data.eid,
            anchor: [0.72, 1.06],
            moveType: ['S', 0],
            z: 6,
            moveF: [[0, 0, QJ.MPMZ.tl.MystletainnSkillInterrupt, [skillMapId]]],
            existData: [
                ...vortexEnd,
                {t:['Time', 16], a:['F', QJ.MPMZ.tl.MystletainnScarletFork, [{autoSheathe:true}]]}
            ]
        });
        if (vortex && sword) vortex.data.vortexReturnId = sword.index;
        return;
    }    

    if (extra.plungingAttack) {
        if (extra.hitEffect) {
            const animX = this.inheritX() - 8 * skillScale;
            const animY = this.inheritY() - 24 * skillScale;
            QJ.MPMZ.Shoot({
                mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
                castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
                castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
                img: ['A', 211],
                position: [['S',animX], ['S',animY]],
                initialRotation: ['S', 0],
                imgRotation: ['F'],
                moveType: ['S', 0],
                anchor:[0.5,0.5], 
                scale: skillScale,
                z:"E", 
                existData: [ 
                   {t:['Time', 90], d:[0,30]}
                ]
            });             
            return;
        }

        if (extra.terrainDamageEffect) {
            const animX = this.inheritX() - 8 * skillScale;
            const animY = this.inheritY() - 24 * skillScale;
            QJ.MPMZ.Shoot({
                mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
                castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
                castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
                img:"swordGraveSlot",
                position: [['S',animX], ['S',animY]],
                initialRotation: ['S', 0],
                imgRotation: ['F'],
                moveType: ['S', 0],
                anchor:[0.5,0.5], 
                scale: skillScale,
                z:"E", 
                existData: [ 
                   {t:['Time', 360], d:[0,120]}
                ]
            });           	   
            AudioManager.playSe({name: "Sword7", volume: 70, pitch: 90 + Math.randomInt(30), pan: 0});	         
            return;
        }

        let posX = (cast ? QJ.MPMZ.tl.MistilteinnServantAim(cast) : $gamePlayer).screenBoxXShowQJ() - 20 + Math.randomInt(40);
        let posY = (cast ? QJ.MPMZ.tl.MistilteinnServantAim(cast) : $gamePlayer).screenBoxYShowQJ() - 12 + Math.randomInt(36);

        let damage = (vortex ? cast?.returnDamage : cast?.damage) ?? extra.damage ?? this.data?.castDamage ?? 60;
        const sword = QJ.MPMZ.Shoot({
            mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
            castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
            castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
            img: "Mistilteinn_scarletFork2[5,9]",
            mistilteinnMapId: skillMapId, mistilteinnReturnBody: true,
            groupName: [cast ? cast.group : "Mistilteinn"],
            ...vortexData,
            position: [['S',posX], ['S',posY]],
            initialRotation: ['S', 0],
            imgRotation: ['S', 0],
            scale: skillScale,
            opacity: 1,
            eid: this.data.eid,
            anchor: [0.72, 1.06],
            moveType: ['S', 0],
            collisionBox:['E', 80, 60],
            z: 6,
            existData: [
                ...vortexEnd,
                {t:['Time', 44]},
                ...(playerCast ? [] : [{t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[damage, 1, 6, 33]], p:[-1,false,true], c:['S', "this.time > 12 && this.time < 25"]}]),
                {
                    t: ['G', ['"enemy"', '"object"', 'object']],
                    c: ['S', 'this.time > 12 && this.time < 25'], p: [-1, false, true],
                    a: ['F', (cast ? QJ.MPMZ.tl.MistilteinnServantHit : playerCast ? QJ.MPMZ.tl.MistilteinnFriendlyHit : QJ.MPMZ.tl.ex_toEnemyAttack), [playerCast ? damage : damage*2, {...(playerCast ? {mistilteinnFriendlyDamage: true} : {}), nonPlayerDamage: true, immuneItself: this.data.eid}]]
                },
            ],
            moveF: [
                [0, 0, QJ.MPMZ.tl.MystletainnSkillInterrupt, [skillMapId]],
                //[11, 999, QJ.MPMZ.tl.MystletainnScarletFork, [{plungingAttack:true, hitEffect:true}]],
                [10, 999, QJ.MPMZ.tl.MystletainnScarletFork, [{plungingAttack:true, terrainDamageEffect:true}]],
                [42, 999, QJ.MPMZ.tl.MystletainnScarletFork, [{lingeringEffect:true}]],
            ]
        });
        if (vortex && sword) vortex.data.vortexReturnId = sword.index;
        return;
    }

    const eid = cast?.eid ?? extra.eid ?? this._eventId;
    const Mistilteinn = $gameMap.event(eid);
    if (!Mistilteinn || Mistilteinn._erased || $gameSelfSwitches.value([skillMapId, eid, 'D'])
        || Mistilteinn._IsDisabledCounter > 0 || Mistilteinn._IsDisabled) return;
    //Mistilteinn.drill_EASe_setAct( "闪现" );
    Mistilteinn.drill_EASe_setSimpleStateNode( ["占位符"] );
    let posX = `$gameMap.event(${eid}).screenBoxXShowQJ()`;
    let posY = `$gameMap.event(${eid}).screenBoxYShowQJ()`;   
    QJ.MPMZ.Shoot({
        mistilteinnServant: cast, playerCast, mistilteinnScale: skillScale,
        castDamage: cast?.damage ?? extra.damage ?? this.data?.castDamage,
        castBeamDamage: cast?.beamDamage ?? extra.beamDamage ?? this.data?.castBeamDamage,
        img: "Mistilteinn_scarletFork1[4,9]",
        groupName: [cast ? cast.group : "Mistilteinn"],
        position: [['S',posX], ['S',posY]],
        initialRotation: ['S', 0],
        imgRotation: ['S', 0],
        scale: skillScale,
        opacity: 1,
        eid, mistilteinnMapId: skillMapId,
        anchor: [0.5, 0.5],
        moveType: ['D', true],
        collisionBox:['C', 10],
        z: 6,
        moveF: [[0, 0, QJ.MPMZ.tl.MystletainnSkillInterrupt, [skillMapId]]],
        existData: [
            {t:['Time', 35], a:['F', QJ.MPMZ.tl.MystletainnScarletFork, [{plungingAttack:true}]]}        
        ]
    });
};

// 入图时补回石碑；冷却到期后恢复被打碎的石碑，不再等待雨天。
QJ.MPMZ.tl.restoreMystletainnEntrance = function() {
    const respawnDay = QJ.MPMZ.tl.getBossRespawnDay(46);
    const stone = $gameMap.events().find(event => !event._erased && event._sourceMapId === 1 && event._sourceeventId === 18);
    if (!stone) {
        $gameMap.spawnEventQJ(1, 18, 9, 55, true);
        return;
    }
    if ($gameSystem.day() < respawnDay) return;
    $gameSelfSwitches.setValue([$gameMap.mapId(), stone._eventId, 'A'], false);
    $gameSelfSwitches.setValue([$gameMap.mapId(), stone._eventId, 'D'], false);
    stone.refresh();
    QJ.MPMZ.tl.checkMystletainnSpawn.call(stone);
};

// 米斯特汀生成检测
QJ.MPMZ.tl.checkMystletainnSpawn = function (extra = {}) {
    const eid = this._eventId;
    // 石碑属性初始化
    const mapId = $gameMap.mapId();
    const HP    = 1000;
    $gameSelfVariables.setValue([mapId, eid, 'fudou'], 99);
    $gameSelfVariables.setValue([mapId, eid, 'enemyId'], 158);
    $gameSelfVariables.setValue([mapId, eid, 'HP'], HP);
    $gameSelfVariables.setValue([mapId, eid, 'MHP'], HP); 

    const unlocked = Utils.isOptionValid("test") || $gameSelfSwitches.value([1, 46, 'A']);
    const result = unlocked && $gameSystem.day() >= QJ.MPMZ.tl.getBossRespawnDay(46);
    if (result) {
        setTimeout(() => {
          // 石碑初始化和入图补生可能同时检查；只保留当前地图的一只魔剑。
          if ($gameMap.mapId() !== mapId || $gameMap.event(eid) !== this || this._erased) return;
          if ($gameMap.events().some(event => !event._erased && event._sourceMapId === 1 && event._sourceeventId === 46)) return;
          // 生成米斯特汀
          $gameMap.spawnEventQJ(1, 46, 6, 51, false);
        }, 100);
    }
    // 正常描述文本
    let id = 18;
    setTimeout(() => {
        const text = `QJ.MPMZ.tl.enemyDescriptionTextGeneration(${eid}, ${id})`;
        Saikey.MPMZ.bindEvent(eid, text, {
                background: "Window_enemyhud",
                backgroundScale: 1,
                needEval: true,
                backgroundOffsetX: -18,
                backgroundOffsetY: -18
        });  
    }, 250);
};

// 支配者的触手行动模式
QJ.MPMZ.tl.rulerTentacleMoveSet = function (extra = {}, args) {

    if (extra.RulerHpListener) {
        const aliveTentacles = $gameMap.drill_COET_getEventsByTag_direct("支配者的触手").length;
        if (aliveTentacles <= 0) {
            $gameSelfVariables.setValue([$gameMap.mapId(), extra.RulerHpListener, 'HP'], 0);
            $gameSelfSwitches.setValue([$gameMap.mapId(), extra.RulerHpListener, 'D'], true);
        }
        return;
    }

    if (extra.piercingAttack) {
        // 触手穿刺攻击
        if (extra.chasePlayer) {
            let action = [];
            let chance = extra.isProactive ? 1 : 0
            if (!extra.isProactive) {
                const aliveTentacles = $gameMap.drill_COET_getEventsByTag_direct("支配者的触手").length;
                chance = aliveTentacles * 0.2;
            } else {
                action = ['S', `$gameMap.event(${extra.isProactive})?.steupCEQJ?.(4, {resurface:true,needCheck:true});`];
            }
            if (chance < Math.random()) return; 
            let posX = $gamePlayer.screenBoxXShowQJ() - 20 + Math.randomInt(40);
            let posY = $gamePlayer.screenBoxYShowQJ() - 12 + Math.randomInt(36);  
            QJ.MPMZ.Shoot({
                position: [['S',posX], ['S',posY]],
                initialRotation: ['S', 0],
                imgRotation: ['S', 0],
                scale: 1,
                immuneItself: this._eventId,
                opacity: 0.9,
                eid: extra.isProactive,
                moveType: ['S', 0],
                collisionBox:['C', 10],
                z: "E",
                existData: [
                    {t:['Time', 60], d:[0, 40], a: action}        
                ],
                moveF: [
                    [30, 999, QJ.MPMZ.tl.rulerTentacleMoveSet, [{piercingAttack:true}]]
                ]
            });
            return;
        }       

        let posX = this.inheritX();
        let posY = this.inheritY();        
        let damage = 60 + Math.randomInt(40);
        QJ.MPMZ.Shoot({
            img: "rulerPiercingAttack[15,4]",
            position: [['S',posX], ['S',posY]],
            initialRotation: ['S', 0],
            imgRotation: ['S', 0],
            scale: 1,
            opacity: 1,
            moveType: ['S', 0],
            collisionBox:['C', 22],
            anchor: [0.5, 0.7],
            z: 10,
            existData: [
                {t:['Time', 59]},
                {t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[damage, 1, 6, 33]], p:[-1,false,true], c:['S', "this.time > 12 && this.time < 20"]},
                {
                    t: ['G', ['"object"', 'object']],
                    c: ['S', 'this.time > 12 && this.time < 20'], p: [-1, false, true],
                    a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [damage*5, {nonPlayerDamage: true, immuneItself: this.data.immuneItself}]]
                },                
            ]
        }); 
        AudioManager.playSe({ name: "Slash7", volume: 75, pitch: 90+Math.randomInt(20), pan: 0 });	       
       return;
    }

    if (extra.dashAttack) {
        let posX = this.inheritX();
        let posY = this.inheritY();           
        let damage = 60 + Math.randomInt(40);
        QJ.MPMZ.Shoot({
            img: "rulerTentacle_dashAttack[4,5]",
            position: [['S',posX], ['S',posY]],
            initialRotation: ['S', this.rotationMove],
            imgRotation: ['S', 0],
            scale: [this.scaleX, this.scaleY],
            opacity: 1,
            moveType: ['S', 6],
            collisionBox:['C', 22],
            anchor: [0.5, 0.85],
            z: 6,
            existData: [
                {t:['S', `$gameSelfSwitches.value([$gameMap.mapId(), ${this.data.immuneItself}, 'D'])`, true]},
                {t:['Time', 150], d:[1, 20, 0], a:['S', `$gameMap.event(${this.data.immuneItself})?.steupCEQJ?.(4, {resurface:true, needCheck:true})`]},
                {t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[damage, 1]], p:[-1,false,true]},
                {
                    t: ['G', ['"object"', 'object']],
                    p: [-1, false, true],
                    a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [damage*5, {nonPlayerDamage: true, immuneItself: this.data.immuneItself}]]
                },                
            ]
        }); 
        AudioManager.playSe({ name: "Slash7", volume: 75, pitch: 90+Math.randomInt(20), pan: 0 });	       
       return;
    }
    
    let eveX = $gameMap.event(this._eventId).screenBoxXShowQJ();
    let posX = $gamePlayer.screenBoxXShowQJ() - 150 - Math.randomInt(150);
    let posY = $gamePlayer.screenBoxYShowQJ() - 48 + Math.randomInt(96);  

    let angle = 90;
    let scaleX = 1; 
    if (eveX > $gamePlayer.screenBoxXShowQJ()) {
        posX = $gamePlayer.screenBoxXShowQJ() + 150 + Math.randomInt(150);
        angle = 270;
        scaleX = -1; 
    }
    QJ.MPMZ.Shoot({
        img:"rulerTentacle_rise[4,5]",
        position: [['S',posX], ['S',posY]],
        initialRotation: ['S', angle],
        imgRotation: ['S', 0],
        scale: [scaleX, 1],
        opacity: 1,
        immuneItself: this._eventId,
        moveType: ['S', 6],
        collisionBox:['C', 16],
        z: 10,
        anchor: [0.5, 0.8],
        existData: [
            {t:['Time', 19]}        
        ],
        moveF: [
            [18, 999, QJ.MPMZ.tl.rulerTentacleMoveSet, [{dashAttack:true}]]
        ]
    });        
};

// 潜入水中接近玩家
QJ.MPMZ.tl.diveAndApproachPlayer = function (extra = {}, args) {

    if (extra.ascendTrigger) {
        QJ.MPMZ.deleteProjectile("playerBait");
        const eid = this.data.eid;
        const boss = $gameMap.event(eid);
        if (!boss) return;
        const newX = this._realX - 1;
        const newY = this._realY - 0.4;
        boss.locate(newX, newY);
        boss.steupCEQJ(3);
        // 浮出水面还有撞击伤害
        setTimeout(() => QJ.MPMZ.tl.diveAndApproachPlayer.call(this, {impactDamage:true}), 500);	
        return;
    }

    if (extra.impactDamage) {
        let posX = this.inheritX();
        let posY = this.inheritY() + 20;  
        let damage = 120;
        QJ.MPMZ.Shoot({
            position: [['S',posX], ['S',posY]],
            initialRotation: ['S', 0],
            imgRotation: ['S', 0],
            scale: 5,
            anchor: [0.5, 0.9],
            moveType: ['S', 0],
            collisionBox:['R', 30, 20],
            existData: [
                {t:['Time', 30]},
                {t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[damage, 1]], p:[-1,false,true]},
                {
                    t: ['G', ['"object"', 'object']],
                    p: [-1, false, true],
                    a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [damage*10, {nonPlayerDamage: true}]]
                }                         
            ]
        });
        return;
    }

    const eid  = this._eventId;
    const time = 320;
    let posX = `$gamePlayer.screenBoxXShowQJ()`;
    let random = 48 + Math.randomInt(48);
    let posY = `$gamePlayer.screenBoxYShowQJ() - ${random}`;  
    const playerBait = QJ.MPMZ.Shoot({
        position: [['S',posX], ['S',posY]],
        groupName: ['playerBait'],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        moveType: ['D', true],
        collisionBox:['C', 2],
        existData: [
            {t:['Time', time]},
        ]
    });    

    posX = `$gameMap.event(${eid}).screenBoxXShowQJ()`;
    posY = `$gameMap.event(${eid}).screenBoxYShowQJ()+48`;      
    const shadow = QJ.MPMZ.Shoot({
        img: "Shadow1",
        position: [['S',posX], ['S',posY]],
        initialRotation: ['S', 0],
        imgRotation: ['S', 0],
        scale: 4,
        eid,
        anchor: [0.5, 0.9],
        opacity: 0.9,
        moveType: ['TB','playerBait', 2, 2, 3],
        collisionBox:['R', 30, 8],
        z: "E",
        existData: [
            {t:['R',[0, 5, 254, 255]], a:['F', QJ.MPMZ.tl.diveAndApproachPlayer, [{ascendTrigger:true}]], d:[0, 30], c: ['S', 'this.time > 30']},
            {t:['Time', time], a:['F', QJ.MPMZ.tl.diveAndApproachPlayer, [{ascendTrigger:true}]], d:[0, 30]},
            {t:['B', ['playerBait']], a:['F', QJ.MPMZ.tl.diveAndApproachPlayer, [{ascendTrigger:true}]], d:[0, 30]},          
        ],
        moveF: [
            [30, 20, QJ.MPMZ.tl.rulerTentacleMoveSet, [{piercingAttack: true, chasePlayer: true}]]
        ],
        timeline:[['B', 0, 60, [1.2, 30]]]
    });
};

// 蓄力水激光
QJ.MPMZ.tl.waterChargedBeam = function (extra = {}, args) {

    const eid = this._eventId;
    if (extra.beamFire) {
        let posX = `$gameMap.event(${eid}).screenBoxXShowQJ()`;
        let posY = `$gameMap.event(${eid}).screenBoxYShowQJ()+56`;
        let damage = 88;
        QJ.MPMZ.Shoot({
            img: ['A', 205],
            position: [['S',posX], ['S',posY]],
            initialRotation: ['S', 180],
            imgRotation: ['F'],
            hue: 180,
            scale: 0.75,
            opacity: 0.9,
            moveType: ['D', true],
            collisionBox:['R', 150, 1600],
            anchor: [0.5, 1],
            z:"MF_UG",
            existData: [
                {t:['Time',120]},
                {t:['S', `$gameSelfSwitches.value([$gameMap.mapId(), ${eid}, 'D'])`, true]},
                {t:['P'],a:['F',QJ.MPMZ.tl.waterCannonSpreadBurst, [{applyWaterloggedEffect:true, damageForPlayer: damage, applyChance: 0.15}]],p:[-1,false,true],c:['T',0,4,true]},
                {
                    t: ['G', ['"enemy"', '"object"', 'object']],
                    c: ['T', 0, 4, true], p: [-1, false, true],
                    a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [damage*2, {nonPlayerDamage: true, magicAttack:true}]]
                },                
            ]
        });
        return;
    }

    let posX = `$gameMap.event(${eid}).screenBoxXShowQJ()`;
    let posY = `$gameMap.event(${eid}).screenBoxYShowQJ()+4`;
    QJ.MPMZ.Shoot({
        img: ['A', 204, -1],
        position: [['S',posX], ['S',posY]],
        initialRotation: ['S', 0],
        imgRotation: ['F', 270],
        hue: 180,
        scale: 0.5,
        opacity: 0.9,
        z:"MF_UG",
        moveType: ['D', true],
        existData: [
            //{t:['AE'], a:['S', "console.log(this.time)"]}
            {t:['Time',155]}
        ]
    });    
};

// 水炮弹-霰弹形式发射
QJ.MPMZ.tl.waterCannonSpreadBurst = function (extra = {}, args) {

    if (extra.hitEffect) {
        let posX = this.inheritX();
        let posY = this.inheritY();    
        let damage = 40;
        QJ.MPMZ.Shoot({
            img: ['A', 207],
            groupName: [],
            collisionBox: ['C', 25],
            position: [['S', posX], ['S', posY]],
            initialRotation:['S',0],
            imgRotation:['F'],
            moveType:['S',0],
            scale: this.scaleX,
            existData:[
                {t:['Time', 70]},
                {
                    t: ['G', ['"enemy"', '"object"', 'object']],
                    c: ['S', 'this.time < 2'], p: [-1, false, true],
                    a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [damage*5, {nonPlayerDamage: true, magicAttack:true, immuneItself: this.data.immuneItself}]]
                },
                {
                    t: ['P'],
                    c: ['S', 'this.time > 6'], p: [-1, false, true],
                    a: ['F', QJ.MPMZ.tl.waterCannonSpreadBurst, [{applyWaterloggedEffect:true, damageForPlayer: damage}]]
                },                              
            ],
        });	            
        return;
    }

    if (extra.applyWaterloggedEffect) {
        if (QJ.MPMZ.tl.ex_playerBulletPhasing()) return;
        const player = $gameParty.leader();
        let damage = extra.damageForPlayer || 40;
        QJ.MPMZ.tl.ex_playerDamageCheck.call(this, damage, 2);
        const effectId = 93; // 水浸状态效果ID
        const probability = player.stateRate(effectId);
        let chance = 0.8 * probability;
        if (extra.applyChance) {
            chance = extra.applyChance * probability;
        }
        if (chance > Math.random()) {
            player.addState(effectId);
        }
        return;
    }

    let target = $gameMap.event(this._eventId);
    if (!target) return;

	let posX  = target.screenBoxXShowQJ();
	let posY  = target.screenBoxYShowQJ()+52;
    let count = 3 + Math.randomInt(4);
    QJ.MPMZ.Shooter_ArcRange(
        ['S', 180],
        {
            groupName: [],
            collisionBox: ['C', 20],
            img: ['A', 206, -1],
            moveType: ['S', '0|15~30/9~999/9'],
            position: [['S', posX], ['S', posY]],
            initialRotation: ['S', 180],
            scale: 0.8,
            immuneItself: this._eventId,
            existData: [
                { t: ['Time', 150], d: [0, 30] },
                { t: ['R', [254, 255]], a: ['F', QJ.MPMZ.tl.waterCannonSpreadBurst, [{hitEffect: true}]], c: ['S', 'this.time > 10'] },
                {
                    t: ['G', ['"enemy"', '"object"', 'object']],
                    c: ['S', 'this.time > 6'],
                    a: ['F', QJ.MPMZ.tl.waterCannonSpreadBurst, [{hitEffect: true}]]
                },
                {
                    t: ['P'],
                    c: ['S', 'this.time > 6'],
                    a: ['F', QJ.MPMZ.tl.waterCannonSpreadBurst, [{hitEffect: true}]]
                },                
            ]
        },
        -20, 20, count, 8, 1, 1
    );
};

// 召唤堕落圣堂传送门
QJ.MPMZ.tl.playSummonDemonGateAnimation = async function (extra = {}) {
  let lang      = ConfigManager.language;
  let checkName = "demonSummon" + lang;

  const ok = await Promise.resolve(
    QJ.MPMZ.tl.checkPictureExists(['img','projectiles','object_name'], `${checkName}.rpgmvp`)
  );

  if (!ok) checkName = "demonSummon2";
  let imgName = "object_name/" + checkName;

  QJ.MPMZ.Shoot({
    img: imgName,
    opacity: '0|0~30/1~9999/1',
    position: [['S', 480], ['S', 270]],
    initialRotation: ['S', 0],
    imgRotation: ['F'],
    scale: 0.5,
    onScreen: true,
    moveType: ['S', 0],
    existData: [{ t:['Time',120], d:[1,30,1.25] }],
    z: "A"
  });
  
  AudioManager.playSe({
        name: '魔の時計塔の鐘',
        volume: 90,
        pitch: 100,
        pan: 0
  });    
};

// 汐音台词
QJ.MPMZ.tl.ShioneLinesEffect = function () {
	
  let textArray = window.MapEventDialogue53 && window.MapEventDialogue53?.["13"]?.["30"];
  if (!textArray) {
      textArray = [
	      "Look forward to it, little lamb ♥",
		  "I’ll squeeze you until every last trace of malice is gone~"
      ];
  }
  const zoom  = $gameScreen.zoomScale();
  const scale = 1 / zoom;
  // —— 屏幕上的目标位置（像素）——
  const baseX = 960;   
  const baseY = 720;
  // 折算成 QJ 坐标系
  const posX  = baseX / zoom;
  const posY  = baseY / zoom;
  
  let fontFace = "MPLUS2ExtraBold";
  if (ConfigManager.language === 0)  fontFace = "Mochiy Pop One";
  
  for (let i = 0; i < textArray.length; i++) {
	  let BulletText = textArray[i];
	  let yy = posY + (48*i);
	  QJ.MPMZ.Shoot({	  
		  img: ['T', {
				text: BulletText,
				arrangementMode: 0,
				textColor: "#ffffd5",
				fontSize: 54,
				outlineColor: "#e53789",
				outlineWidth: 0,
				fontFace: fontFace,
				fontItalic: false,
				fontBold: true,
				width: -1,
				height: -1,
				textAlign: 5,
				lineWidth: 0,
				lineColor: "#ffffff",
				lineRate: 1.0,
				backgroundColor: null,
				backgroundOpacity: 1,
				shadowBlur: 12,
				shadowColor: "#000000",
				shadowOffsetX: 0,
				shadowOffsetY: 0
		  }],
		  position: [['S', posX], ['S', yy]],
		  groupName: ['ShioneLines'],
		  initialRotation: ['S', 0],
		  imgRotation: ['F'],
		  opacity: '0|0~60/1~99999|1',
		  moveType: ['S', '0'],
		  z: 'A',
		  scale: scale,
		  onScreen: true,
		  anchor: [0.5, 0],         
		  existData: [
				  { t: ['Time', 360], d:[0,60] },
				  { t: ['S', "TouchInput.drill_isLeftPressed()||TouchInput.drill_isLeftTriggered()", true], d:[0,60], c:['S', `this.time > 120`] },
		  ],  
	  }); 
   }
};

// BOSS名演出(BOSS单位要加BOSS标签，不然不会显示血条)
QJ.MPMZ.tl.BossSpecialNameDisplay = function (extra = {}) {
	
  if (!this) return;
  let oeid = this._eventId; 
  let boss = $gameMap.event(oeid);
  if (!boss || !boss._sourceeventId)  return;
  let bossName =  "?????";
  let subtitle =  "★${}★";
  let stext = "?????";
  
  let eid = String(boss._sourceeventId);
  let textArray1 = window?.prototypeEventTemplate?.[eid]?.bossName;
  if (textArray1) {
	  bossName = Array.isArray(textArray1) ? textArray1.join("\n") : (textArray1 ?? "");
  }
  let textArray2 = window?.prototypeEventTemplate?.[eid]?.subtitle;
  if (textArray2) {
	  stext = Array.isArray(textArray2) ? textArray2.join("\n") : (textArray2 ?? "");
  }
  if (window?.prototypeEventTemplate?.[eid]?.garble) {
  // 加密混淆  
      bossName = garble(bossName);
      stext    = garble(stext);
  }
  subtitle = subtitle.replace(/\$\{[^}]*\}/g, stext);

  // 初始化血条变量框
  let BossCount = $gameMap.drill_COET_getEventsByTag_direct("BOSS").length;
  boss.BossCount = BossCount;
  let HP  = $gameSelfVariables.get(this, 'HP');
  let MAX = $gameSelfVariables.get(this, 'MHP');
  if (HP <= 0 || MAX <= 0 ) {
	  HP  = 99999;
	  MAX = 99999; 
  }
  $gameVariables.setValue(160 + BossCount, HP);
  let bindTankId = 9 + BossCount;
  let dataBind = $gameSystem._drill_GFV_bindTank[ bindTankId ];
  dataBind['slot_list'][ 0 ]['var_id'] = 160 + BossCount;
  dataBind['slot_list'][ 0 ]['level_max'] = MAX;
  dataBind['commandParamChanged'] = true;
  dataBind.frame_x = 462;  
  dataBind.frame_y = 200 + 800 * (BossCount - 1);
  dataBind.style_id = 11;  
  if (!extra.hideHPbar) {
    dataBind.visible = true;
    $gameTemp._drill_GFV_needRefresh = true;
  }
  
  
  // 生成boss名称
  let bulletId = 0;
  for (let i = 0; i < 2; i++) {
  let shootText = QJ.MPMZ.tl.BossNameshootText({
    text: bossName,
    x: 960, 
	y: 130 + 800 * (BossCount - 1),           
    fontSize: 100,
	oeid: oeid,
	BossIndex: BossCount,
    outlineWidth: 0,
    width: 1920,
    shadowBlur: 15,
	z: extra.z ?? "A",
	existData: [
	   {t: ['S', `!$gameMap.event(${oeid})?._Immortality && $gameSelfSwitches.value([$gameMap.mapId(), ${oeid}, 'D'])`, true], a: ['S','$gameVariables.setValue(82, this.time)'], d:[0,60]},
	],
    //moveJS: [[60, 60, "this.addTimelineEffect('S',[-1,4,5])"]]
  });
  if (i == 0) bulletId = shootText;
  // 副标题
  QJ.MPMZ.tl.BossNameshootText({
    text: subtitle,
    x: 960, 
	y: 55 + 800 * (BossCount - 1),
    fontSize: 34,
	oeid: oeid,
    outlineWidth: 1,
    shadowBlur: 8,
	z: extra.z ?? "A",
	existData: [
	   {t: ['S', `!$gameMap.event(${oeid})?._Immortality && $gameSelfSwitches.value([$gameMap.mapId(), ${oeid}, 'D'])`, true], d:[0,60]},
	]
  });
 }
  // 血量值显示
  if ($gameMap.chahuiMapTemp.canShowEnemyHP) {
      QJ.MPMZ.tl.ShowBossHPNumber.call(this, {HP});
  }

  // 追加血量监听和特殊机制
    setTimeout(() => {
		  let bullet = $gameMap._mapBulletsQJ[bulletId];
		  if (!bullet) return;
		  let bidList = $gameMap.getGroupBulletListQJ('boosBar');
		  bullet.addMoveData("F",[10,10,QJ.MPMZ.tl.ex_BossHealthCheck,[oeid,bidList]]);
		  // 支配者
		  if (Number(eid) == 40) {
		     bullet.addMoveData("F",[10,10,QJ.MPMZ.tl.rulerTentacleMoveSet,[{RulerHpListener:Number(oeid)}]]);
		  }		  
		  // 妹抖兔
		  if (Number(eid) == 59) {
		     bullet.addMoveData("F",[10,10,QJ.MPMZ.tl.MaidBunnyActionListener]);
		  }        		  
    }, 100); 
  // BOSS遭遇成就  
  setTimeout(() => chahuiUtil.unlockSpecificAchievement("BossFirstAppearance"), 600); 
 
};

// BOSS血量数值显示
QJ.MPMZ.tl.ShowBossHPNumber = function(extra = {}) {
    
    if (extra.refresh) {
        let HP = $gameSelfVariables.value([$gameMap.mapId(), this.data.eid, 'HP']);
        if (HP === this.data.bossHP) return;
        if (HP <= 0) {
            this.setDead({ t: ["Time", 0], d: [0, 30] });
            return;
        }
        const img = [
            "T",
            {
                text: String(HP),
                arrangementMode: 0,
                textColor: "#ffffff",
                fontSize: 28,
                outlineColor: "#000000",
                outlineWidth: 1,
                fontFace: "Noto Sans JP Black",
                fontItalic: false,
                fontBold: true,
                width: 640,
                height: 100,
                textAlign: 4,
                lineWidth: 0,
                lineColor: "#ffffff",
                lineRate: 1.0,
                backgroundColor: null,
                backgroundOpacity: 1,
                shadowBlur: 10,
                shadowColor: "#ff0000",
                shadowOffsetX: 0,
                shadowOffsetY: 0
            }
        ];        
        this.changeAttribute("img", img);
        return;
    }


    const eid = this._eventId;
    const HP = extra.HP || 1000;

    const zoom = 2;
    const posX = 1110 / zoom;
    const posY = 248 / zoom;
    const Scale = 1 / zoom;

    const img = [
        "T",
        {
            text: ` ${HP} `,
            arrangementMode: 0,
            textColor: "#ffffff",
            fontSize: 26,
            outlineColor: "#000000",
            outlineWidth: 1,
            fontFace: "Noto Sans JP Black",
            fontItalic: false,
            fontBold: true,
            width: 640,
            height: 100,
            textAlign: 4,
            lineWidth: 0,
            lineColor: "#ffffff",
            lineRate: 1.0,
            backgroundColor: null,
            backgroundOpacity: 1,
            shadowBlur: 10,
            shadowColor: "#ff0000",
            shadowOffsetX: 0,
            shadowOffsetY: 0
        }
    ];

    QJ.MPMZ.Shoot({
        img: img,
        groupName: ['BossHPNumber'],
        position: [["S", posX], ["S", posY]],
        initialRotation: ["S", 0],
        imgRotation: ["S", 0],
        opacity : '0|0~120/1~99999999|1',
        moveType: ["S", 0],
        z: "A",
        scale: Scale,
        onScreen: true,
        anchor: [1, 1],
        existData: [],
        eid,
        bossHP: HP,
        moveF: [
            [30, 30, QJ.MPMZ.tl.ShowBossHPNumber, [{refresh: true}]]
        ]
    });
};


QJ.MPMZ.tl.BossNameshootText = function (opts) {
  opts = opts || {};
  var z = 2;
  var autoScale = (opts.autoScale !== false);     // 默认自动适配缩放

  var sx = autoScale ? (opts.x / z) : (opts.x || 0);
  var sy = autoScale ? (opts.y / z) : (opts.y || 0);
  // 为移动动画预留空间
      sy -= 120;
  var scale = autoScale ? (1 / z) : (opts.scale != null ? opts.scale : 1);

  var textCfg = {
    text: String(opts.text || ""),
    arrangementMode: 0,
    textColor: opts.textColor || "#ffffff",
    fontSize: (opts.fontSize != null ? opts.fontSize : 28),
    outlineColor: (opts.outlineColor || "#ff1818"),
    outlineWidth: (opts.outlineWidth != null ? opts.outlineWidth : 1),
    fontFace: (opts.fontFace || "Noto Sans JP Black"),
    fontItalic: !!opts.fontItalic,
    fontBold: (opts.fontBold !== false),          // 默认加粗
    width: (opts.width != null ? opts.width : -1),
    height: (opts.height != null ? opts.height : -1),
    textAlign: (opts.textAlign != null ? opts.textAlign : 5),
    lineWidth: 0,
    lineColor: "#ffffff",
    lineRate: 1.0,
    backgroundColor: null,
    backgroundOpacity: 1,
    shadowBlur: (opts.shadowBlur != null ? opts.shadowBlur : 5),
    shadowColor: (opts.shadowColor || "#ff0000"),
    shadowOffsetX: (opts.shadowOffsetX || 0),
    shadowOffsetY: (opts.shadowOffsetY || 0),
	BossIndex: (opts.BossIndex|| 1),
  };

  let bullet = QJ.MPMZ.Shoot({
    img: ['T', textCfg],
    position: [['S', sx], ['S', sy]],
	groupName: ['boosBar'],
    initialRotation: ['S', 180],
    imgRotation: ['S',0],
    opacity: (opts.opacity != null ? opts.opacity : '0|0~120/1~99999999|1'),
    moveType: ['S', '0|2~120/0~99999999|0'],
    z: (opts.z || "A"),
    scale: scale,
	oeid: opts.oeid,
	BossIndex: opts.BossIndex,
    onScreen: true,
    anchor: (opts.anchor || [0.5, 0.5]),
    existData: (opts.existData || []),
  });
  return bullet.index;
  
};


//BOSS血量监听
QJ.MPMZ.tl.ex_BossHealthCheck = function(EID,bidList) {
	
	 if (!EID) return;
	 
	 let currentHp = $gameSelfVariables.value([$gameMap.mapId(), EID, "HP"]);
	 this._recordHP = this._recordHP || currentHp;
	 let BossIndex = this.data.BossIndex || 1;
	 let Variables = 160 + BossIndex;
     $gameVariables.setValue(Variables, currentHp);
	 
	 if (currentHp < this._recordHP) {
		let value =  this._recordHP - currentHp;		 
		this._recordHP = currentHp;
		
		if (value < 200) return;
		
		if (bidList) {
			let angle = Math.randomInt(360);
			let distance = 1 + Math.randomInt(4);
    		bidList.forEach(function(bid) {
        		let bullet = $gameMap._mapBulletsQJ[bid];
				if (bullet) {
				    bullet.addTimelineEffect('S',[angle,distance,4]);
				}
    		});			
		}
	 }
	 
};

// BOSS皇冠-王权征令
QJ.MPMZ.tl.RoyalDecreeMark = function(extraData = {offsetX: 0, offsetY: 0, scale: 1}) {

    if (extraData.refresh) {
	  let eid   = this.data.eid;
	  let user  = $gameMap.event(eid); 
	  if (!user) {
		  this.setDead({ t: ["Time", 0] }); 
		  return;
	  }
	  let isDead = $gameSelfSwitches.value([$gameMap.mapId(), eid, 'D']);
	  if (!isDead) return;
	  if (!user.drill_EFOE_isPlaying()) return;
	  // 无伤逃跑
	  if (user.NoDamageEscape) {
		  this.setDead({ t: ["Time", 0], d: [0, 20] });
		  return;
	  }
	  // 在岸上无力化
	  if (user.CannotEscape) {	  
	      QJ.MPMZ.tl.RoyalDecreeMark.call(this, {checkDrops:true});
		  this.setDead({ t: ["Time", 0], d: [0, 20] });
	  }
	  this.setDead({ t: ["Time", 0] });
	  return;	
	}
	
	if (extraData.checkDrops) {
	  let eid    = this.data.eid;
	  let target = $gameMap.event(eid);
	  if (!target) return;
	  let chance = 0.05;
	  if (target._interruptSleep) chance += 0.15;
	  let regionId = $gameMap.regionId(Math.round(this.x/48), Math.round(this.y/48));
	  if (regionId !== 8) chance += 0.3;
	  if (chance < Math.random()) return;
      let item   = $dataArmors[80];
      dingk.Loot.getMapDrops(target,item);
	  AudioManager.playSe({ name: "キラン☆キラーン 派手なインパクト3", volume: 80, pitch: 100, pan: 0 });	
	  return;
	}
	
    let eid     =  this._eventId;
	let offsetX = extraData.offsetX;
	let offsetY = extraData.offsetY;
	let scale   = extraData.scale;
    let posX    = `$gameMap.event(${eid})?$gameMap.event(${eid}).screenShootXQJ()+${offsetX}:0`;
    let posY    = `$gameMap.event(${eid})?$gameMap.event(${eid}).screenShootYQJ()+${offsetY}:0`;
	
    QJ.MPMZ.Shoot({
		img: "Magic/RoyalDecreeMark[10,7]",
		groupName: ['RoyalDecreeMark'],
        position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
        moveType:['D',true],
		anchor:[0.5,0.5],
		scale: scale,
		eid: eid,
		opacity: "0|0~40/1~999999|1",
		imgRotation:['S',0],
		collisionBox:['C', 1],
		timeline:['S',0,120,[0,4,60]],
        existData:[
        ],
		moveF: [
		   [15,15,QJ.MPMZ.tl.RoyalDecreeMark,[{refresh:true}]]
		]
    });	
	
};
	

//兔子洞-出现
QJ.MPMZ.tl.rabbitHoleAppear = function(target, offsetX = 0, offsetY = 0, z = 1) {  
   
   if (!target) return;
   AudioManager.playSe({ name: "Push", volume: 70, pitch: 70, pan: 0 });
   let scale = 0.75;   
   let posX = 0;
   let posY = 0;
   
   if (target instanceof Game_Event || target instanceof Game_Player) {   
      posX = target.screenBoxXShowQJ() + offsetX;
      posY = target.screenBoxYShowQJ() + offsetY;
   } else {
      if ( Object.getPrototypeOf(target) == Object.prototype ) {
         posX = target.x + offsetX;
		 posY = target.y + offsetY;
	  }		  
   }
	 
   QJ.MPMZ.Shoot({
        img:'pipofm-groundeffect05[5,4,4]',
		position:[["S",posX],["S",posY]],
        initialRotation:['S',0],
		groupName:["rabbitHole"],
		scale:scale,
		opacity:1,
		anchor:[0.5,0.54],
        moveType:['S',0],
		z:z,
		existData:[
           {t:['Time',76]},
        ],
        collisionBox:['E', 46, 20],
		//collisionBox:['S', 48, 0, 60],
		moveF:[[74,999,QJ.MPMZ.tl.rabbitHoleEffect,["start"]]]
    });
	  	  
};

QJ.MPMZ.tl.rabbitHoleEffect = function(initialize) {  
   if (initialize && initialize === "refresh") {
     let hp = this.data.hp || 100;
	 if (hp > 0) return false;
     let posX    = this.inheritX();	
     let posY    = this.inheritY();
	 if ( QJ.MPMZ.rangeAtk([['S', posX],['S', posY]],['G','BOSS'],[],['C',8]).length > 0) { 
	     this.data.hp = 10;
	     return false;
	 }
	 return true;
   }

   if (initialize && initialize === "start") {   
    let posX    = this.inheritX();	
    let posY    = this.inheritY();
    let scale   = this.scaleX;	
	let z       = this.data.z;
    let rabbitHole = QJ.MPMZ.Shoot({
        img:'pipofm-groundeffect05',
		position:[["S",posX],["S",posY]],
	    initialRotation: ['S', 0],
        imgRotation: ['S', 0],
		groupName:["rabbitHole","Destructible","rabbitHoleEffect"],
		scale:scale,
		hp: 120,
		opacity:1,
		anchor:[0.5,0.54],
        moveType:['S',0],
		z:z,
		existData:[
           //{t:['Time',78]},
		   {t:['F',QJ.MPMZ.tl.rabbitHoleEffect,["refresh"],true], a:['F',QJ.MPMZ.tl.rabbitHoleDisappear,["needSE"]]},
		   {t:['B',["playerFeet"]],a:['C',134,[-1]],p:[-1,false,true],c:['S',"QJ.MPMZ.tl.ex_playerFallCheck('rabbitHole')"]},
		   {t:['G',['"object"','starDoor']],a:['C',134],p:[-1,false,true],c:['T',0,60,true],cb:['E',52, 26]},
        ],
        collisionBox:['E', 46, 20],
		//moveF:[[180,180,QJ.MPMZ.tl.rabbitHoleJackBomb]]
      });
   }
};

// 兔子洞投掷炸弹
QJ.MPMZ.tl.rabbitHoleJackBomb = function() { 
   
   let bid = this.index;
   if (QJ.MPMZ.rangeAtk([['B', bid],['B', bid]],['G','BOSS'],[],['C',20]).length > 0) return
   
   let posX = this.x / 48;
   let posY = this.y / 48;
   let eid = $gameMap.spawnEventQJ(1, 23, posX, posY, false);
   let e = $gameMap.event(eid);
   if (!e) return;   
   e._opacity = 0;
   
   let angle = Math.randomInt(360);
   if (Math.random() > 0.3) {
	   let tarX = $gamePlayer._x;
	   let tarY = $gamePlayer._y;
	   angle = QJ.calculateAngleByTwoPointAngle(posX, posY, tarX, tarY);
   }
   
   let dis = 1.5 + (2 * Math.random());
   QJ.MPMZ.tl.ex_jumpWithAngle(eid, angle, dis);
   AudioManager.playSe({ name: "Jump2", volume: 50, pitch: 80 + Math.randomInt(40), pan: 0 });
	  
   
};

// 兔子洞消失
QJ.MPMZ.tl.rabbitHoleDisappear = function(initialize, returnPoint) {  

    if (initialize === "summonCarrot") {
        const trySpawnCarrot = (pixelX, pixelY) => {
            if (!Number.isFinite(pixelX) ||
                !Number.isFinite(pixelY)) {
                return false;
            }

            const tileX = pixelX / 48;
            const tileY = pixelY / 48;
            const mapX = Math.floor(tileX);
            const mapY = Math.floor(tileY);

            if (!$gameMap.isValid(mapX, mapY)) return false;

            // 保留原来的地形限制。
            const regionId = $gameMap.regionId(mapX, mapY);
            if (![0, 5, 15].includes(regionId)) return false;

            // 保留原来的胡萝卜显示位置偏移。
            const eid = $gameMap.spawnEventQJ(
                1, 60,
                tileX - 0.5,
                tileY - 0.4,
                true
            );

            const carrot = $gameMap.event(eid);
            if (!carrot) return false;

            carrot._opacity = 0;
            carrot.drill_EFIE_playShowingEnlarge(60, 1, false);

            AudioManager.playSe({
                name: "Jump2",
                volume: 80,
                pitch: 80 + Math.randomInt(40),
                pan: 0
            });

            return true;
        };

        // 第一优先：死亡时保存的位置。
        if (returnPoint &&
            returnPoint.mapId === $gameMap.mapId() &&
            trySpawnCarrot(returnPoint.x, returnPoint.y)) {
            return;
        }

        // 兜底：死亡位置不适合生成时，再查找其他洞。
        for (const id of $gameMap.getGroupBulletListQJ("rabbitHoleEffect")) {
            const hole = $gameMap._mapBulletsQJ[id];
            if (!hole || hole.dead) continue;

            if (trySpawnCarrot(hole.x, hole.y)) {
                return;
            }
        }

        // 最终兜底：使用固定地图坐标，不检查洞口区域或套用洞口偏移。
        const fallbackId = $gameMap.spawnEventQJ(1, 60, 13, 14, true);
        const fallbackCarrot = $gameMap.event(fallbackId);

        if (fallbackCarrot) {
            fallbackCarrot._opacity = 0;
            fallbackCarrot.drill_EFIE_playShowingEnlarge(60, 1, false);

            AudioManager.playSe({
                name: "Jump2",
                volume: 80,
                pitch: 80 + Math.randomInt(40),
                pan: 0
            });
        } else {
            console.warn(
                "[兔子BOSS] 地图中央兜底生成胡萝卜失败。",
                returnPoint
            );
        }
        return;
    }

    if (initialize && initialize === "needSE") {
		AudioManager.playSe({ name: "Push", volume: 30, pitch: 100, pan: 0 });
    }
	
    if (
      !(this instanceof Game_QJBulletMZ) &&
      !(this instanceof Game_QJLaserMZ) &&
      Object.getPrototypeOf(this) !== Object.prototype
    ) {
      return;
    }

    let posX    = this.inheritX();	
    let posY    = this.inheritY();
    let scale   = this.scaleX;	
	let z       = this.data.z;	 
       QJ.MPMZ.Shoot({
        img:'pipofm-groundeffect05_alt[5,4,4]',
		position:[["S",posX],["S",posY]],
        initialRotation:['S',0],
		//groupName:["rabbitHole"],
		scale:scale,
		opacity:1,
		anchor:[0.5,0.54],
        moveType:['S',0],
		z:z,
		existData:[
           {t:['Time',79]},
        ],
        collisionBox:['E', 58, 24],
      });
	  	  
};

// 连续召唤兔子洞
QJ.MPMZ.tl.spawnRabbitHoleChain = function(initialize) {

   if ( initialize && initialize === "start" ) {
	let eid = this._eventId; 
    let time = 240 + Math.randomInt(180);
    let deadCode = `!$gameMap.event(${eid}) || $gameMap.event(${eid})._IsDisabledCounter > 0`;	
    QJ.MPMZ.Shoot({
		groupName: ['spawnRabbitHole'],
        initialRotation: ['S', 0],
        position: [['E',eid], ['E',eid]],
        moveType: ['S', 0],
        existData: [
	       { t: ['Time', time] },
		   { t: ['S', deadCode,true], a:['S',`if ($gameMap.event(${eid})) {
			                                     $gameMap.event(${eid})._skillInterrupted = true;
		                                       }`]},
	    ],
		chance: 12,
	    moveF: [
	       [30,30,QJ.MPMZ.tl.spawnRabbitHoleChain,["spawn"]]
	   ]
    });
	return;
   }	

	
   if ( initialize && initialize === "spawn" ) {
     function randPointInCircle(cx, cy, R) {
       const a = Math.random() * Math.PI * 2;   // 随机角度
       const r = Math.sqrt(Math.random()) * R;  // 半径要开方，保证均匀分布
       const x = Math.round(cx + r * Math.cos(a));
       const y = Math.round(cy + r * Math.sin(a));
       return { x, y };
     }
	 
	 const playerX = $gamePlayer.screenBoxXShowQJ();
	 const playerY = $gamePlayer.screenBoxYShowQJ();
     const p = randPointInCircle(playerX, playerY, 350);
	 
	 const tileX = (p.x / 48) + $gameMap.displayX() - 0.5;
	 const tileY = (p.y / 48) + $gameMap.displayY() - 0.5;
	 const regionId = $gameMap.regionId(tileX, tileY);
     if ( QJ.MPMZ.rangeAtk([['S', p.x],['S', p.y]],['B','rabbitHole'],[],['C',40]).length == 0 && ![3,255].includes(regionId)) {
		 QJ.MPMZ.tl.rabbitHoleAppear(p);
	 } else if (this.data.chance > 0) {
        this.data.chance -= 1;		 
		QJ.MPMZ.tl.spawnRabbitHoleChain.call(this, "spawn");		
	 }
   }
   
   if ( initialize && initialize === "spawnJackBomb" ) {
	 
	 const playerX = $gamePlayer.screenBoxXShowQJ();
	 const playerY = $gamePlayer.screenBoxYShowQJ();	 
	 const list = QJ.MPMZ.rangeAtk([['S', playerX],['S', playerY]],['B','rabbitHole'],[],['C',80]);
	 if (list.length > 0) {
		 list.forEach(function(bullet) {
			 if (Math.random() > 0.7) return; 
			 if (bullet) {
				 QJ.MPMZ.tl.rabbitHoleJackBomb.call(bullet);
			 }			 
		});
	  }
   }   
};


// 随机切换兔子洞
QJ.MPMZ.tl.randomSwitchRabbitHole = function (initialize) {

  if (initialize && initialize === "check") {
    const eid  = this._eventId;
    const base = 0.1;
    const dis  = $gamePlayer.calcDistance(eid);

    // dis=600 → t=0；dis=0 → t=1
    const t = Math.max(0, Math.min(1, 1 - dis / 600));
    let chance = base + (0.8 - base) * t;
    chance = Math.min(chance, 0.99);

    return Math.random() < chance;
  }

  // BOSS进行兔子洞传送
  if (initialize && initialize === "switch") {
    const listRaw = $gameMap.getGroupBulletListQJ("rabbitHoleEffect") || [];
    const bidRaw  = $gameSelfVariables.get(this, "rabbitHole");

    // 统一成字符串比较、去空并去重
    const list = [...new Set(listRaw.filter(v => v != null).map(String))];
    const cur  = String(bidRaw);

    // 排除当前的兔子洞
    let pool = list.filter(id => id !== cur);
    if (pool.length === 0) return;

    // 打乱顺序（Fisher–Yates）
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // 选一个存在且未触发追踪(_moved=false)的洞
    let chosen = null;
    let bullet = null;
    while (pool.length > 0) {
      const id = pool.pop();
      const b  = $gameMap._mapBulletsQJ[id];
      if (b && !b._moved) {
        chosen = id;
        bullet = b;
        break;
      }
    }
    if (!bullet) return; 

    // 更新记录 & 切换位置
    $gameSelfVariables.set(this, "rabbitHole", chosen);
    const xx = (bullet.x - 25) / 48;
    const yy = (bullet.y -  9) / 48;
    $gameMap.event(this._eventId).setPosition(xx, yy);
    return;
  }

  // 随机选一个非当前洞，让它追踪玩家
  if (initialize && initialize === "track") {
    const bulletList = $gameMap.getGroupBulletListQJ("rabbitHoleEffect") || [];
    const bidRaw     = $gameSelfVariables.get(this, "rabbitHole");

    const listKeys = [...new Set(bulletList.filter(v => v != null).map(String))];
    const bidKey   = String(bidRaw);

    // 过滤掉当前兔子洞记录
    let candidates = listKeys.filter(k => k !== bidKey);
    if (candidates.length === 0) candidates = listKeys.slice();

    let randomKey = null;
    while (candidates.length > 0) {
      const i   = Math.floor(Math.random() * candidates.length);
      const key = candidates.splice(i, 1)[0];
      const bullet = $gameMap._mapBulletsQJ[key];
      if (bullet) {
        randomKey = key;
        AudioManager.playSe({ name: "Magic2", volume: 80, pitch: 60, pan: 0 });
        bullet.changeAttribute("moveType", ["TB", "playerFeet", 1, 6, 12]);
        bullet._moved = true;
        bullet.addExistData({
          t: ["B", ["playerFeet"]],
          a: ["F", QJ.MPMZ.tl.rabbitHoleDisappear, ["needSE"]]
        });
        break;
      }
    }

    if (!randomKey) {
      console.warn("没有可用的兔子洞可选（可能都失效了）");
    }
    return;
  }

  // —— 玩家掉进兔子洞—— 
  if (initialize && initialize === "playerFall") {
	  
	function playerFallIntoAir() {
	  // 被送到了空中
      let labelName = "FallIntoAir";
      for (let i = 0; i < this._list.length; i++) {
        let command = this._list[i];
        if (command.code === 118 && command.parameters[0] === labelName) {
           this.jumpTo(i);
           break;
        }
      }		
	}			  
    const list = $gameMap.getGroupBulletListQJ("rabbitHole") || [];
    if (list.length > 1) {		
	  // 小概率还是被送去了空中		
	  if(Math.random() > 0.9) {
		playerFallIntoAir.call(this);  
        return;
	  }		  
      const bid         = this.bulletId;
      const candidates  = list.filter(v => v !== bid);
      const randomValue = candidates[Math.floor(Math.random() * candidates.length)];
      const bullet      = $gameMap._mapBulletsQJ[randomValue];

      if (bullet) {
        const xx = bullet.x / 48;
        const yy = bullet.y / 48;
        $gamePlayer.setPosition(xx, yy);
      }

      // 复原镜头位置
      drowsepost.camera.zoom($gameScreen.zoomScale(), 20, -1);
    } else {
	  playerFallIntoAir.call(this);   
    }
    return;
  }
};



// 妹抖兔BOSS行为监听
QJ.MPMZ.tl.MaidBunnyActionListener = function() {
	
	
	let eid = this.data.oeid;
	let bid = $gameSelfVariables.value([$gameMap.mapId(), eid, 'rabbitHole']);
	if (this.time % 60 > 50) {
		let posX = $gameMap.event(eid)?.screenBoxXShowQJ() || 0;
		let posY = $gameMap.event(eid)?.screenBoxYShowQJ() || 0;
		let check = QJ.MPMZ.rangeAtk([['S', posX],['S', posY]],['B','rabbitHole'],[],['C',4]);
		if (check.length > 0) {
			let newId = check[0].index;
		   // 记录值不匹配时需及时更新兔子洞ID	
		   if (newId !== bid) {
			  bid = newId; 
		      $gameSelfVariables.setValue([$gameMap.mapId(), eid, 'rabbitHole'], newId);
		   }
		}
	}
	
	let bullet = $gameMap._mapBulletsQJ[bid];
	// 妹抖兔待着的洞被破坏
	if (!bullet) {
		if ($gameMap.drill_COET_getEventsByTag_direct("妹抖兔").length > 0) {
			
		}
	}
};

// 胡萝卜导弹攻击模式
QJ.MPMZ.tl.carrotMissileAttack = function(initialize) {


   if (initialize && initialize === "MissileDropStart") {
   let offsetX = 100;  
   let offsetY = 360 + Math.randomInt(200);
   let angle = 90;   
   let posX = $gamePlayer.screenShootXQJ() - offsetX;
   let posY = $gamePlayer.screenShootYQJ() - offsetY;
   
   if (Math.random() > 0.5) {
	   posX  = $gamePlayer.screenShootXQJ() + offsetX;
	   angle = 270;
   }
   
   QJ.MPMZ.Shoot({
		position:[['S',posX],['S',posY]],
        initialRotation:['S',angle],
		imgRotation:['S',0],
		moveType:["S", '0|2~180/15~999|15'],
        existData:[ 
		    {t: ['Time', 150]}  
		],
		offsetX: offsetX,
		offsetY: offsetY,
        moveF: [
		    [0,15,QJ.MPMZ.tl.carrotMissileAttack,["MissileDrop"]]
		]
    });	
	
	return;
  }
  
  if (initialize && initialize === "MissileDrop") { 	  
  let posX = this.inheritX();
  let posY = this.inheritY(); 
  let angle = this.inheritRotation();
  let tarX = posX - this.data.offsetX;
  if (angle > 90)  tarX = posX + this.data.offsetX;
  var tarY = posY + this.data.offsetY + 32;  
  let peakRate = 0.5;
  let targetY = tarY + $gameMap.displayY() * 48;
  let { time, xExp, yExp } = QJ.MPMZ.tl.BulletMissileDropFormula(posX, posY, tarX, tarY, peakRate, 4, 40, 40);
  // 胡萝卜导弹
  let carrot = QJ.MPMZ.Shoot({
        img:'carrotMissle', 
		groupName:["carrotBomb","Stoppable"],
		position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
		scale:1,
		bombType: 1,
		anchor:[0.5,1],
		collisionBox: ['R', 18, 80],
		opacity:'0|1~${time-1}|1~999|0',
        imgRotation:['S',0],
		moveType:["F", xExp, yExp],
        existData:[ 
		    // {t: ['Time', time], a:['F',QJ.MPMZ.tl.ex_enemy_carrotThrowEffect,[0,4]]}  
			{t: ['Time', time], a:['F',QJ.MPMZ.tl.ex_JackBomb]},
            {t: ['B', "rabbitHole"], a:["S","AudioManager.playSe({ name: 'Fall', volume: 70, pitch: 90+Math.randomInt(20), pan: 0 })"],d:[1,30,0], cb:['R', 4, 85], c:['S',`this.y >= ${targetY} - 4`]}			
		],
    });
   // 导弹的影子
   let scaleXY = carrot.scaleX * 0.66;
   let index = carrot.index;
   QJ.MPMZ.Shoot({
        img:'missile_shadow', 
		groupName:["Stoppable"],
		position:[['S',posX],['S',tarY]],
        initialRotation: ['S', 0],
		scale:`0|0~${time}/${scaleXY}~999|${scaleXY}`,
        imgRotation:['S',180],
		moveType: ["F", '0', yExp],
		anchor:[0.5,1],
        existData:[ 
		    {t: ['BE', index]}  
		],

    });		
	AudioManager.playSe({ name: "Fall", volume: 50, pitch: 80, pan: 0 });
	return;
  }
   // 定点打击-自由落体
   if (initialize && initialize === "TargetedBombing") {
   let offsetX = 30;  
   let offsetY = 420 + Math.randomInt(240);
   let angle   = 180;   
   let posX    = $gamePlayer.screenBoxXShowQJ() - offsetX + Math.randomInt(60);
   let posY    = $gamePlayer.screenBoxYShowQJ() - offsetY;
   let tarY    = $gamePlayer.screenBoxYShowQJ() - 10 + Math.randomInt(32);
   let targetY = tarY + $gameMap.displayY() * 48;
   let { time, xExp, yExp } = QJ.MPMZ.tl.freeFallByTime(posY, tarY, 70);
   
   let carrot  = QJ.MPMZ.Shoot({
	    img:'carrotMissle', 
		groupName:["carrotBomb","Stoppable"],
		position:[['S',posX],['S',posY]],
        initialRotation:['S',180],
		imgRotation:['S',0],
		collisionBox: ['R', 18, 80],
		scale:1,
		bombType: 1,
		anchor:[0.5,1],
		opacity:'0|1~${time}|1~999|0',
		moveType:["F", yExp, "0"],
        existData:[ 
		    //{t: ['Time', time], a:['F',QJ.MPMZ.tl.ex_enemy_carrotThrowEffect,[0,4]]}  
			{t: ['Time', time], a:['F',QJ.MPMZ.tl.ex_JackBomb]},
			{t: ['B', "rabbitHole"], a:["S","AudioManager.playSe({ name: 'Fall', volume: 70, pitch: 90+Math.randomInt(20), pan: 0 })"],d:[1,30,0], cb:['R', 4, 85], c:['S',`this.y >= ${targetY} - 4`]}
		]
    });	
   // 导弹的影子
   time -= 4;
   tarY += 18;
   let scaleXY = carrot.scaleX * 0.66;
   let index = carrot.index;
   QJ.MPMZ.Shoot({
        img:'missile_shadow',
        groupName:["Stoppable"],		
		position:[['S',posX],['S',tarY]],
        initialRotation: ['S', 0],
		scale:`0|0~${time}/${scaleXY}~999|${scaleXY}`,
        imgRotation:['S',0],
		moveType: ["S", 0],
		anchor:[0.5,0.5],
        existData:[ 
		    {t: ['BE', index]}  
		],

    });		
	AudioManager.playSe({ name: "Fall", volume: 50, pitch: 80, pan: 0 });
	return;
  }  

   // 沙皇核弹
   if (initialize && initialize === "TsarCarrotNuke") {
   let offsetX = 30;  
   let offsetY = 420 + Math.randomInt(240);
   let angle   = 180;   
   let posX    = $gamePlayer.screenBoxXShowQJ() - offsetX + Math.randomInt(60);
   let posY    = $gamePlayer.screenBoxYShowQJ() - offsetY;
   let tarY    = $gamePlayer.screenBoxYShowQJ() - 10 + Math.randomInt(32);
   let targetY = tarY + $gameMap.displayY() * 48;
   let { time, xExp, yExp } = QJ.MPMZ.tl.freeFallByTime(posY, tarY, 120);
   
   let carrot  = QJ.MPMZ.Shoot({
	    img:'carrotMissle', 
		groupName:["carrotBomb","Stoppable"],
		position:[['S',posX],['S',posY]],
        initialRotation:['S',180],
		imgRotation:['S',90],
		collisionBox: ['R', 18, 80],
		scale:12,
		bombType: 1,
		anchor:[0.75,0.5],
		opacity:'0|1~${time}|1~999|0',
		moveType:["F", yExp, "0"],
        existData:[ 
		    //{t: ['Time', time], a:['F',QJ.MPMZ.tl.ex_enemy_carrotThrowEffect,[0,4]]}  
			{t: ['Time', time], a:['C',306]},
			{t: ['B', "rabbitHole"], a:["S","AudioManager.playSe({ name: 'Fall', volume: 70, pitch: 90+Math.randomInt(20), pan: 0 })"],d:[1,30,0], cb:['R', 4, 85], c:['S',`this.y >= ${targetY} - 4`]}
		]
    });	
   // 导弹的影子
   time -= 4;
   tarY += 18;
   let scaleXY = carrot.scaleX * 0.66;
   let index = carrot.index;
   QJ.MPMZ.Shoot({
        img:'missile_shadow',
        groupName:["Stoppable"],		
		position:[['S',posX],['S',tarY]],
        initialRotation: ['S', 0],
		scale:[`0|0~${time}/${2.2*scaleXY}~999|${2.2*scaleXY}`,`0|0~${time}/${scaleXY}~999|${scaleXY}`],
        imgRotation:['S',0],
		moveType: ["S", 0],
		anchor:[0.5,0.5],
        existData:[ 
		    {t: ['BE', index]}  
		],

    });		
	AudioManager.playSe({ name: "Fall", volume: 50, pitch: 80, pan: 0 });
	return;
  }
  
};


// 冲撞攻击box
QJ.MPMZ.tl.ex_dashCollisionBulletGeneration = function(damage, collisionBox) {
    let eid = this._eventId;
    QJ.MPMZ.Shoot({
        img: "null1",
        position: [['E', eid], ['E', eid]],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        moveType: ['D', true],
        collisionBox: ['C', 25],
        existData: [
            { t: ['Time', 20] },
            { t: ['P'], a: ['F', QJ.MPMZ.tl.ex_dashCollisionBulletHitEffect], p: [-1, false, true] },
            { t: ['P'], a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [damage, 1, 0, 0]] }
        ]
    });
};

// 冲撞攻击演出
QJ.MPMZ.tl.ex_dashCollisionBulletHitEffect = function() {
    let posX = this.inheritX();
    let posY = this.inheritY();

    QJ.MPMZ.Shoot({
        img: "animehit[5,4]",
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        moveType: ['S', 0],
        scale: 0.6,
        collisionBox: ['C', 1],
        z: "MF_UG",
        existData: [
            { t: ['Time', 19] }
        ]
    });
};

// 冲撞攻击移动路线
QJ.MPMZ.tl.ex_dashAttackPath = function(initialize,angle) {

  if (initialize && initialize === "start") {
    this._moveSpeed = 0;	  
    let angle = this.calcDeg($gamePlayer);
    let eid = this._eventId;  
    let posX = `$gameMap.event(${eid})?.screenBoxXShowQJ()||0`;
    let posY = `$gameMap.event(${eid})?.screenBoxYShowQJ()||0`;
    let deadCode = `let target = $gameMap.event(${eid});
                    if (target) {
                        target._skillFailed = true;
                    }`;

  
    QJ.MPMZ.Shoot({
        position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
        imgRotation:['F'],
        moveType:['D',true],
        collisionBox:['C',26],
        eid:eid,
        existData:[ 
        {t:['Time',25],a:["S",deadCode]},
        {t:['P'],a:["F",QJ.MPMZ.tl.ex_enemy_AsabaDashCombo,["start",eid]]}
        ],
        moveF:[
        [1,0,QJ.MPMZ.tl.ex_dashAttackPath,["move",angle]]
        ]
    });
    return;
  }

  if (initialize && initialize === "move") {
    let eid = this.data.eid;
    let target = $gameMap.event(eid);
    if (!target) return;
    target._moveSpeed = 72;
    target.dotMoveByDeg(angle);	
  }
};

//猫娘浅羽速攻投掷
QJ.MPMZ.tl._asabaThrowCfg = QJ.MPMZ.tl._asabaThrowCfg || (function() {
  const WEAPON_POOL = [1,2,3,8,9,10,11,12,13,14,15,16,17,18,19,20,21,27,36,42,51,53,60,62,63,70,80,81,82];

  // 魔法武器索引: attackType = 2
  const MAGIC_WEAPONS = new Set([15,16,17,19,42]);

  // 特效映射: weaponIndex -> [effect1, effect2]
  const EFFECT_MAP = {
    13: [5, 33],
    20: [5, 33],
    27: [5, 33],
    21: [6, 22],
    81: [6, 22],
    16: [7, 10],
    17: [8, 25],
    19: [8, 25],
    15: [9, 10],
    51: [9, 25],
  };

  const SE_POOL = ["キックの素振り1","パンチの素振り2","パンチの素振り3"];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function hasStarDoor() {
    const list = $gameMap.drill_COET_getEventsByTag_direct("星之门");
    return list && list.length > 0;
  }

  return {
    WEAPON_POOL,
    MAGIC_WEAPONS,
    EFFECT_MAP,
    SE_POOL,
    pick,
    hasStarDoor,
  };
})();

QJ.MPMZ.tl.ex_enemy_AsabaWeaponThrow = function() {
  // 兼容一些“脱离事件对象直接调用”的情况
  if (!this) return;

  const cfg = QJ.MPMZ.tl._asabaThrowCfg;
  let effect1,effect2;
  // 随机武器
  const weaponIndex = cfg.pick(cfg.WEAPON_POOL);
  const weaponData = $dataWeapons && $dataWeapons[weaponIndex];
  if (!weaponData) return;

  const weaponDamage = (weaponData.params[2] || 0) + (weaponData.params[4] || 0);
  const weaponImg = "weapon/weapon" + weaponIndex;

  // 攻击类型
  const attackType = cfg.MAGIC_WEAPONS.has(weaponIndex) ? 2 : 1;

  // 特效覆盖
  const mapped = cfg.EFFECT_MAP[weaponIndex];
  if (mapped) {
    effect1 = mapped[0];
    effect2 = mapped[1];
  }

  // 发射起点
  const posX = this.screenShootXQJ();
  const posY = this.screenShootYQJ() - 5;

  // 锁定目标
  // 有星之门且概率满足 -> 朝 starDoor，否则朝玩家
  const target = (cfg.hasStarDoor() && Math.random() > 0.4)
    ? ['G','starDoor']
    : ['P'];

  // 弹道类型 + 存在时间
  const useTP = Math.random() > 0.75;
  const moveType = useTP ? ['TP', 12, 10, 12] : ['S','0|18~90/9~999/9'];
  const time = useTP ? 180 : 360;

  // 生成子弹
  const weapon = QJ.MPMZ.Shoot({
    img: weaponImg,
    position: [['S', posX], ['S', posY]],
    initialRotation: target,
    moveType: moveType,
    imgRotation: ['R', 32, true],
    collisionBox: ['R', 64, 8],
    scale: 0.8,
    existData: [
      { t: ['Time', time] },
      { t: ['R', [255]], c: ['S', 'this.time > 5'] },

      // 命中玩家
      {
        t: ['P'],
        a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [weaponDamage, attackType, effect1, effect2]],
        c: ['S', '!QJ.MPMZ.tl.ex_playerBulletPhasing()']
      },

      // 命中敌人/物体
      {
        t: ['G', '"enemy"'],
		a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [weaponDamage, {nonPlayerDamage:true, immuneItself: this._eventId, magicAttack:attackType>1,orbitingDamage:true,noHitEffect:true,noDurLoss:true,specifyAddedStatus:true,addedStatusType:effect1,addedStatusChance:effect2*100}]],
        c: ['S', 'this.time > 24||this._countered']
      },
      { t: ['G', '"object"'], a: ['C', 151, [weaponDamage, effect1, effect2]], c: ['S', 'this.time > 24||this._countered'] },

      // 星之门特殊处理
      { t: ['G', 'starDoor'], a: ['SS', 'C', true] },

      // 被 cancelEnemyBullet 之类击中则消失
      { t: ['B', 'cancelEnemyBullet'], d: [0, 10] },
    ],
    groupName: ['enemyBullet'],
  });

  // 音效
  const seName = cfg.pick(cfg.SE_POOL);
  const pitch = 95 + Math.randomInt(40);
  AudioManager.playSe({ name: seName, volume: 50, pitch: pitch, pan: 0 });

  return weapon;
};

// 萨卡班甲鱼王睡觉回复
QJ.MPMZ.tl.sacabambaspisSleepRecoverHP = function(initialize) {
	
	if (initialize && initialize === "sleep") {
        let eid = this.data.eid;
	    let currentHp = $gameSelfVariables.value([$gameMap.mapId(), eid, 'HP']);
	    let MHP = $gameSelfVariables.value([$gameMap.mapId(), eid, 'MHP']);
	    let name = 'enemyBleeding' + eid;
		let value = 1;
	    if ($gameMap.getGroupBulletListQJ(name).length == 0) { 
		   value = 5 + Math.randomInt(15);
	    }
		currentHp += value;
	    currentHp = Math.min(currentHp,MHP);
	    $gameSelfVariables.setValue([$gameMap.mapId(), eid, 'HP'], currentHp);
		if (currentHp < MHP) {
           QJ.MPMZ.Shoot({
               img: ['T', value, 0, '#06ff00', 12],
               position: [['S',this.inheritX()], ['S',this.inheritY()-72]],
               initialRotation: ['S', 0],
               imgRotation: ['F'],
               opacity: '0|1~90/0',
               moveType: ['S', '0|1~90/0.1~999/0.1'],
               existData: [{ t: ['Time', 90] }]
           });		
		}
		return;
	}
	
	if (initialize && initialize === "start") {	
	let eid  = this._eventId;
    let posX = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootXQJ() : $gameMap.displayX()`;
    let posY = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootYQJ() : $gameMap.displayY()`;
	let time = 360 + Math.randomInt(360);
    QJ.MPMZ.Shoot({
		img: "states/Regen[8,7]",
        position:[['S',posX],['S',posY]],
        moveType:['D',true],
		opacity:'0|0~90|0~60/1~9999|1',
        initialRotation:['S',0],
        imgRotation:['F'],
		anchor:[0.5,0.65],
		scale:2,
		eid: eid,
        collisionBox:['C',15],
        existData:[
            {t:['Time',time], d:[0,20]},
			{t:['S',`$gameSelfSwitches.value([$gameMap.mapId(), ${eid}, 'D'])`,true]},
            {t:['B',[`enemyparalysis${eid}`,`enemyFreeze${eid}`,`enemyDizzy${eid}`]], a:['S',`let target = $gameMap.event(${eid});
			                                                                                  if (target) {
																								  target._interruptSleep = true;																								  
																								 }`], c:['S','this.time > 120']}
        ],
		moveF: [
		    [120,10,QJ.MPMZ.tl.sacabambaspisSleepRecoverHP,["sleep"]]
		],
		deadJS: [
		    `let target = $gameMap.event(${eid});
			 if (target) {
				 target._stopSleep = true;
			 }`
		]
    });
     return;
	}
	
	if (initialize && initialize === "escape") {
        let eid = this._eventId;
        let target = $gameMap.event(this._eventId);
		// 直接水遁
		if (target.NoDamageEscape) return;		
        target.drill_EASA_setEnabled( true );
        let condition = DrillUp.g_COFA_condition_list[7];
        let c_area = $gameMap.drill_COFA_getShapePointsWithCondition(Math.floor(target._x), Math.floor(target._y), "圆形区域", 4, condition);
        if (c_area.length > 0) {
        let p      = c_area[Math.floor(Math.random() * c_area.length)];
        let xPlus  = p.x - target._x; 
		let yPlus  = p.y - target._y;
		let dis    = Math.sqrt(Math.abs(xPlus) + Math.abs(yPlus));
		let height = Math.round(60 + (dis * 6));
		let time   = Math.round(30 + (dis * 5));
        target._drill_JSp['enabled'] = true;
        target._drill_JSp['height'] = height;
        target._drill_JSp['time'] = time;
        target._drill_JSp['speed'] = -1;			
        target.jump(xPlus, yPlus);
		AudioManager.playSe({ name: "Jump2", volume: 80, pitch: 60, pan: 0 });	
        this.wait(time);        
		} else {
		  target.CannotEscape = true;	
		  for (var i = 0; i < this._list.length; i++) {
    		  let command = this._list[i];
    		  if (command.code === 118 && command.parameters[0] === "CannotEscape") {
        		  this.jumpTo(i);
        		  break;
    		  }
		  }
		}			
		return;
	}
	
};

// 萨卡班甲鱼王地震冲击
QJ.MPMZ.tl.sacabambaspisQuakeImpact = function(initialize, args) {
  

  if (initialize && initialize === "damage")  {
  let angle = 0;
  if (!args || !args.target) return;  
  const isPlayer = args.target instanceof Game_Player;
  const isEvent  = args.target instanceof Game_Event;

  const posX    = this.inheritX();
  const posY    = this.inheritY();
  const tarX    = args.target?.screenBoxXShowQJ() || 0;
  const tarY    = args.target?.screenBoxYShowQJ() || 0;
  angle = QJ.calculateAngleByTwoPointAngle(posX, posY, tarX, tarY);
  if (!Number.isFinite(angle)) angle = 0;
  if (isPlayer) {
      const damage = 233;
      QJ.MPMZ.tl.ex_playerDamageCheck(damage, 1);
      QJ.MPMZ.tl.ex_jumpWithAngle(-1, angle, 2);
  } else if (isEvent) {
	  const eventId = args.target._eventId;
	  if (this.data.eid === eventId) return;
      const damage  = 233;
      QJ.MPMZ.tl.ex_toEnemyAttack.call(
        this,
        damage,
        { nonPlayerDamage: true, noHitEffect: true, noDurLoss: true, independentAttack: true },
        args
      );
      QJ.MPMZ.tl.ex_jumpWithAngle(eventId, angle, 2);
    }
   return;
  }   

  if (initialize && initialize === "start")  {	  
	let eid  = this._eventId;
    let posX = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootXQJ() : $gameMap.displayX()`;
    let posY = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootYQJ() : $gameMap.displayY()`;
	let time = 15;
    QJ.MPMZ.Shoot({
        img: ['A', 190],
        position:[['S',posX],['S',posY]],
        moveType:['D',true],
        initialRotation:['S',0],
        imgRotation:['F'],
		eid: eid,
        //anchor: [0.5, 0.85],
        collisionBox:['R',200, 120],
        z: "E",
        existData:[
           // {t:['Time',time]},
            {t:['AE']},
			{t:['S',`$gameSelfSwitches.value([$gameMap.mapId(), ${eid}, 'D'])`,true]},
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.sacabambaspisQuakeImpact,["damage"]],p:[-1,false,true]},
            {t:['P'],a:['F',QJ.MPMZ.tl.sacabambaspisQuakeImpact,["damage"]],p:[-1,false,true]}
        ],
    });	
  }
};


// 使用草莓召唤ASABA
QJ.MPMZ.tl.spawnASABAchototsumoushin = function(extra = {}) {

  if (extra.dustWalk) {
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
	   return;
  }

  if (extra.trySpawn) {  
      let reverseDirection = this.data.isRight;
	  let tarX = this._realX - 1 + (Math.random() * 2); 
	  let posX = tarX - (7 + Math.randomInt(6));
	  if (reverseDirection) posX = tarX + (7 + Math.randomInt(6));
	  let posY = this._realY - 2 + (Math.random() * 4);	
	  let time = 150;
	  let speed = 6;
	  let scaleX = reverseDirection ? -1 : 1;
	  let ASABAstrawberry = false;
	  if (this.data.ASABAstrawberry) ASABAstrawberry = true;
		// ASABA猪突猛进
	  let chahui = QJ.MPMZ.Shoot({
			img: "ASABA_run[5,4]",
			groupName: ['ASABA'],
			position: [['Map',posX],['Map',posY]],
			initialRotation: ['S', reverseDirection ? 270 : 90],
			imgRotation: ['S',0],
			scale: [scaleX,1],
			opacity: '0|0~20/1~9999|1',
			moveType: ['S',speed],
			blendMode: 0,
			anchor: [0.5,0.5],
			collisionBox: ['C',25],
			ASABAstrawberry: ASABAstrawberry,
			existData:[
				{t:['S',` !${reverseDirection} ? this._realX > ${tarX} : this._realX < ${tarX} `,true],a:['F',QJ.MPMZ.tl.spawnASABAchototsumoushin,[{spawnSuccess:true, strawberryX:this._realX, strawberryY:this._realY}]], d:[0, 5]},
				{t:['P'],a:['C', 326, [150,6,0]], p:[-1,false,true]},	
				{t:['P'],a:['F', QJ.MPMZ.tl.spawnASABAchototsumoushin,[{spawnSuccess:true, collisionSuccess:true}]], p:[-1,false,true]},
			],
			moveF:[	   
			   [2,2,QJ.MPMZ.tl.spawnASABAchototsumoushin,[{dustWalk:true}]]
			],
			z: 35
		});
	  return;
  }
   
  if (extra.spawnSuccess) {
	   let posX  = this.x / 48;
	   let posY  = (this.y-10) / 48;
	   let name  = "fuss_startdash" + this.time;
       $gameScreen._particle.particlePlay(0, name, 'tilemap', 'fuss_startdash', 'below', posX, posY);	   
	   let eid   = $gameMap.spawnEventQJ(1, 8, posX, posY, true);
	   let ASABA = $gameMap.event(eid);
	   if (!ASABA) return;	
       ASABA._disableRandom = true;
	   ASABA._strawberryX  = Math.round(extra.strawberryX*10) / 10;
	   ASABA._strawberryY  = Math.round(extra.strawberryY*10) / 10;
	   console.log(ASABA);
	   if (this.data.ASABAstrawberry) {
	       ASABA._ASABAstrawberry = true;
	   }
	   if (extra.collisionSuccess) {
		   ASABA._collisionSuccess = true;
		   this.setDead({t:['Time',0]});
	   }
	   return;
  }

  if (!this) return;
  let mapName = $dataMapInfos[$gameMap.mapId()].name;
  let nameWithoutNumbers = mapName.replace(/[0-9]/g, ''); 
  if ( !["冒険の遊歩道", "遺跡の森"].includes(nameWithoutNumbers) )  {
	 // ASABA只会出现在这两个地方 
	  return;
  }
  
  let posX   = this.inheritX(); 
  let posY   = this.inheritY(); 
  let bonus  = Math.min(2, this.time / 3600);  
  let range  = Math.round(180 * (1 + bonus));
  let ASABAstrawberry = false;
  let ASABA  = $gameMap.drill_COET_getEventsByTag_direct("ASABA").length;
  if (ASABA >= 2) return;  
  let num    = QJ.MPMZ.rangeAtk([['S', posX],['S', posY]],['B',"Strawberry"],[],['C',range]).length;
  num       += QJ.MPMZ.rangeAtk([['S', posX],['S', posY]],['B',"ASABAstrawberry"],[],['C',range]).length * 5;
  if (this.data.groupName.includes("ASABAstrawberry")) {
	  ASABAstrawberry = true; 
  }

  let chance = num * 500 - (ASABA * 300);
  chance    += chance * bonus;
  chance     = Math.max(1, chance);
  if (chance < Math.randomInt(10000)) return;
  
  let isRight = Math.random() > 0.5;
  let anchorX = isRight ? -0.04 : 1.04;
  let bullet = QJ.MPMZ.Shoot({
				  position:[['S',posX],['S',posY]],
                  initialRotation:['S',0], 
				  imgRotation:['F'],
                  moveType:['D',true], 
				  anchor:[anchorX,0.5],
                  collisionBox:['R', 540, 80],
				  isRight: isRight,
				  ASABAstrawberry: ASABAstrawberry,
                  existData:[				
						//{t:['NP'], a:[], cb:['R', 540, 1]},
						{t:['R', [8, 250, 254, 255]], a:[]},
						{t:['Time', 5], a:['F', QJ.MPMZ.tl.spawnASABAchototsumoushin, [{trySpawn:true}]]}			 
                  ]				  
			    });	

};

//ASABA旋转攻击
QJ.MPMZ.tl.ex_enemy_AsabaSpinAttack = function() {
	
	if (!this) return;
	let eid = this._eventId;
	let posX = `$gameMap.event(${eid})?.screenBoxXShowQJ()||0`;
	let posY = `$gameMap.event(${eid})?.screenBoxYShowQJ()||0`;
    QJ.MPMZ.Shoot({
        img:"null1",
        position:[['S',posX],['S',posY]],
        moveType:['D',true],
        initialRotation:['S',0],
        imgRotation:['F'],
        collisionBox:['C',33],
		scale:1,
        existData:[
            {t:['Time',240]},
			{t:['S',`$gameSelfSwitches.value([$gameMap.mapId(), ${eid}, 'D'])`,true]},
			{t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[20,1,0,0]],c:['T',0,10,true],p:[-1,false,true]},
			{t:['G','"enemy"','"object"'],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[20,{nonPlayerDamage:true,immuneItself:eid,orbitingDamage:true,noHitEffect:true,noDurLoss:true}]],c:['T',0,10,true],p:[-1,false,true]},
            {t:['B',['enemyBullet','playerBullet']],a:['F',QJ.MPMZ.tl.ex_enemy_AsabaSpinAttackParry],p:[-1,false,true]}
        ],
		moveJS: [
		    [0,30,"AudioManager.playSe({ name: 'Raise2', volume: 50, pitch: 150, pan: 0 })"]
		]
    });
	
};

//ASABA反复横跳
QJ.MPMZ.tl.ex_enemy_AsabaZigZagMove = function() {
	
	if (!this) return;
	let eid = this._eventId;
	let posX = `$gameMap.event(${eid})?.screenBoxXShowQJ()||0`;
	let posY = `$gameMap.event(${eid})?.screenBoxYShowQJ()||0`;
    QJ.MPMZ.Shoot({
        eid: eid,
        position:[['S',posX],['S',posY]],
        moveType:['D',true],
        initialRotation:['S',0],
        imgRotation:['F'],
        collisionBox:['C',33],
		scale:1,
        existData:[
            {t:['Time',240]},
			{t:['S',`$gameSelfSwitches.value([$gameMap.mapId(), ${eid}, 'D'])`,true]},
			{t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[10,1,0,0]],c:['T',0,10,true],p:[-1,false,true]},
			{t:['G','"enemy"','"object"'],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[10,{nonPlayerDamage:true,immuneItself:eid,orbitingDamage:true,noHitEffect:true,noDurLoss:true}]],c:['T',0,10,true],p:[-1,false,true]},
            {t:['B',['playerSkill','enemyBullet','playerBullet']],a:['S',`AudioManager.playSe({ name: 'Evasion1', volume: 70, pitch: 100, pan: 0 });
			                                                             let eid = this.data.eid;
			                                                             QJ.MPMZ.tl.ex_effectFonts("miss", eid); `], p:[-1,false,true]}
        ],
		moveJS: [
		    [0,30,"AudioManager.playSe({ name: 'Evasion1', volume: 60, pitch: 75, pan: 0 })"]
		]
    });
	
};

QJ.MPMZ.tl.ex_enemy_AsabaSpinAttackParry = function(args) {

	if (args && args.bulletTarget) {
		
    let posX = args.bulletTarget.inheritX();
    let posY = args.bulletTarget.inheritY();
	let angle = Math.randomInt(360);
	// 格挡演出
    QJ.MPMZ.Shoot({
      img: "animehit[5,4]",
      initialRotation: ['S', angle],
      position: [['S', posX], ['S', posY]],
      scale: 1,
      moveType: ['S', 0],
      opacity: 1,
      blendMode: 0,
      z: "MF_UG",
      existData: [
	  { t: ['Time', 19] }
	  ]
    });		
		// 反弹弹幕
		args.bulletTarget.rotationMove = (args.bulletTarget.rotationMove + 180) % 360;
		args.bulletTarget.addExistData({t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[8,1,0,0]],c:['S','!QJ.MPMZ.tl.ex_playerBulletPhasing()']});
		args.bulletTarget._countered = true;
        args.bulletTarget.data.nonPlayerDamage = true;
        let se = {
            name: "Hammer",
            volume: 50,
            pitch: Math.randomInt(60) + 70,
            pan: 0
        };
        AudioManager.playSe(se);		
	}
};


//ASABA咬人并吃掉食物
QJ.MPMZ.tl.ex_enemy_AsabaBite = function() {
	
	if (!this) return;
	let eid = this._eventId;	
	
    let posX = `$gameMap.event(${eid})?$gameMap.event(${eid}).screenBoxXShowQJ():0`;
    let posY = `$gameMap.event(${eid})?$gameMap.event(${eid}).screenBoxYShowQJ():0`;
    let damage = Math.round($dataEnemies[45].params[2] * (1 + 3 * Math.random())); 
    let bite = QJ.MPMZ.Shoot({
        position:[['S',posX],['S',posY]],
        initialRotation:['P'],
        moveType:['D',true],
		anchor:[0.5,0.85],
		imgRotation:['F'],
		collisionBox:['R',12,40],
        existData:[
			{t:['Time',8]},
			{t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[damage,1]],p:[-1,false,true],c:['T',0,15,true]},
			{t:['P'],a:['F',QJ.MPMZ.tl.ex_enemy_AsabaStealFood,[eid]],p:[-1,false,true],c:['T',0,15,true]},
        ],
    });
    
};

QJ.MPMZ.tl.ex_enemy_AsabaStealFood = function(eid) {

    const items = $gameParty.items();
    // ASABA只吃食材	
    const ingredients = items.filter(item =>
        item && item.note && item.note.includes("Ingredients")
    );
    // ASABA会吃掉随机数量的食材
	if (ingredients.length > 0) {
		
    const count = Math.min(
        ingredients.length,
        Math.floor(Math.random() * 3) + 1
    );
    // 随机抽选ASABA会吃掉的食材
    for (let i = ingredients.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ingredients[i], ingredients[j]] = [ingredients[j], ingredients[i]];
    }
    let selected = ingredients.slice(0, count);
        selected.forEach(item => {			
            $gameParty.loseItem(item, 1);
			$gameSystem._drill_GFTH_styleId = 4;
			let context = "\\fs[22]\\ii[" + item.id + "]";
			if (ConfigManager.language > 1) context = "\\fs[18]\\ii[" + item.id + "]";
			$gameTemp.drill_GFTH_pushNewText( context );
			
            let srandomSeName = ["リンゴをかじる", "お菓子を食べる1", "お菓子を食べる2"];
            let seNames = srandomSeName[Math.floor(Math.random() * srandomSeName.length)];	
            let randomPitch = Math.randomInt(80) + 41;
            AudioManager.playSe({ name: seNames, volume: 90, pitch: randomPitch, pan: 0 });	
            // 恢复体力
			let value = $gameSelfVariables.value([$gameMap.mapId(), eid, 'HP']);
			value += 25 + Math.randomInt(25);
			$gameSelfVariables.setValue([$gameMap.mapId(), eid, 'HP'], value);
        });

	}
	
};

// ASABA必杀技
QJ.MPMZ.tl.ex_enemy_AsabaDashCombo = function (initialize, eid) {
	
  if (initialize && initialize === "start") {
    $gameScreen.showPicture(9, "black", 0, 0, 0, 120, 120, 0, 0);
    $gameScreen.movePicture(9, 0, 0, 0, 120, 120, 255, 0, 20);
	if ($gameMap.event(eid)) {
		$gameMap.event(eid)._moveSpeed = 18;
		$gameMap.event(eid)._IsDisabledCounter += 210;
	}
	// 玩家被控
	$gameSwitches.setValue(14, true);
	$gameSystem._drill_COI_map_mouse = false;
	$gameParty.leader().addState(69);
    TouchInput._mousePressed = false;
	$gameSystem._drill_COI_map_KPMove = false;
    QJ.MPMZ.Shoot({
	  position: [["P"], ["P"]],	
	  eid:eid,
      moveType: ["S", 0],		  
      existData: [{ t: ["Time", 150] }],
      moveF: [[30, 5, QJ.MPMZ.tl.ex_enemy_AsabaDashCombo]],
      deadF: [[QJ.MPMZ.tl.ex_enemy_AsabaDashCombo, ["end"]]]
    });
    return;
  }

  if (initialize && initialize === "end") {
	  
	  let eid = this.data.eid;
	  let target = $gameMap.event(eid);
	  if (target) {
		  target.drill_EASe_setSimpleStateNode( ["待机"] );
		  target.drill_EASA_setEnabled( true );
	  }
	  
    setTimeout(() => {
        $gameScreen.erasePicture(9);
        AudioManager.playSe({ name: "Battle3", volume: 60, pitch: 70, pan: 0 });
        let posX = this.inheritX();
        let posY = this.inheritY();
        let hp = $gameSelfVariables.value([$gameMap.mapId(), eid, 'HP']);
        let mhp = $gameSelfVariables.value([$gameMap.mapId(), eid, 'MHP']);
        let hpRate = hp / mhp;
        let damage = 199;
        damage += Math.round(damage * (1 - hpRate)); 
        setTimeout(() => QJ.MPMZ.tl.ex_playerDamageCheck.call({data:{groupName:["Musou Burst Stream"]}}, damage,1), 500);
        QJ.MPMZ.Shoot({
        img: "Magic/kusa",
        initialRotation: ['S', 0],
        imgRotation: ['S', 0],
        scale: '0|0.6~60/1.2~999|1.2',
        opacity:'0|1~60/0~999|0',
        position: [["P"], ["P"]],
        moveType: ["S", 0],	  
        existData: [{ t: ["Time", 60], a: ["S", `	$gameSwitches.setValue(14, false);
                                                    $gameParty.leader().removeState(69);
                                                    $gameSystem._drill_COI_map_mouse = true;
                                                `] }],
        });	  
    }, 350);
	// 累加命中次数
	let count = $gameSelfVariables.value([1, 8, 'specialHitCount']);
	count += 1;
	$gameSelfVariables.setValue([1, 8, 'specialHitCount'], count);
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
  let posX = $gamePlayer.screenBoxXShowQJ();
  let posY = $gamePlayer.screenBoxYShowQJ();

  const p = randPointInCircle(posX, posY, 35);
  posX = p.x;
  posY = p.y;

  let scale = (50 + Math.randomInt(50)) / 100;

    QJ.MPMZ.Shoot({
        //img: "Magic/Hit2[3,4]",
        img: ['A', 222],
        initialRotation: ["S", angle],
        existData: [{ t: ["AE"] }],
        position: [["S", posX], ["S", posY]],
        moveType: ["S", 0],
        blendMode: 1,
        z: "A",
        scale: scale,
        moveJS: [[
            1, 999,
            `let seName = 'Blow' + (1 + Math.randomInt(3));
            AudioManager.playSe({ name: seName, volume: 50, pitch: 80 + Math.randomInt(40), pan: 0 });`
        ]]
    });
};


//红兽-猩红爪击
QJ.MPMZ.tl.ex_redBeastClawStrike = function() {
	
	if (!this) return;
    let enemyId = $gameSelfVariables.value([$gameMap.mapId(), this._eventId, 'enemyId']);
    let enemy = $dataEnemies[116]; 	
    let baseDamage = enemy.params[2];
	
	let bulletX = this.screenBoxXShowQJ();
	let bulletY = this.screenBoxYShowQJ();
	let targetX = $gamePlayer.screenBoxXShowQJ();
	let targetY = $gamePlayer.screenBoxYShowQJ();
	let angle = QJ.calculateAngleByTwoPointAngle(bulletX, bulletY, targetX, targetY);	
	
    let length;
    if ((angle >= 60 && angle <= 120) || (angle >= 240 && angle <= 300)) {
		length = 128;
	} else {
		length = 48;
	}	
	
    QJ.MPMZ.Shoot({
        img:"null1",
        anchor:[0.5,1],blendMode:0,
        position:[['S',bulletX],['S',bulletY]],
		collisionBox:['R',10,length],
        imgRotation:['F'],
		scale:1,
        moveType:['S',0],
		initialRotation:['P'],
        existData:[
         {t:['Time',24]},	
         {t:['P'],a:['F',QJ.MPMZ.tl.ex_redBeastDamageEvaluation,[baseDamage,{bleed:true}]],p:[-1,true,true],c:['S','!QJ.MPMZ.tl.ex_playerBulletPhasing()']},
        ],     
    });	
};

//红兽-血裂冲击
QJ.MPMZ.tl.ex_redBeastBloodRiven = function() {
	
	if (!this) return;
    let enemyId = $gameSelfVariables.value([$gameMap.mapId(), this._eventId, 'enemyId']);
    let enemy = $dataEnemies[116]; 	
    let baseDamage = Math.floor(1.3 * enemy.params[2]);
	
    let posX = `$gameMap.event(${this._eventId}).screenBoxXShowQJ()`;
    let posY = `$gameMap.event(${this._eventId}).screenBoxYShowQJ()`;
   // this.requestAnimation(200);
    QJ.MPMZ.Shoot({
        img:['A',200], 
        z: "MF_UG",
        anchor:[0.5,0.5],
        onScreen: true, 
        position:[['S',posX],['S',posY]],
		collisionBox:['R',160, 96],
        imgRotation:['S', 0],
		scale: 0.66,
        opacity: 0.66,
		moveType:['D',true],
        initialRotation:['S',0],
		existData:[
         {t:['Time',68]},	
         {t:['P'],a:['F',QJ.MPMZ.tl.ex_redBeastDamageEvaluation,[baseDamage,{increasedDamage:true}]],p:[-1,false,true],c:['S','!QJ.MPMZ.tl.ex_playerBulletPhasing()']},
        ],     
    });	
	
};

//红兽-攻击伤害判定
QJ.MPMZ.tl.ex_redBeastDamageEvaluation = function(damage,extraData = {}) {
	var type,probability,effect,time;
	type = 1;
	// 出血攻击
	if (extraData.bleed) {
	   probability = 66;
	   effect = 2;
	   time = 6;		
	}
    // 处于出血状态时
    if ( $gameParty.leader().isStateAffected(6) && extraData.increasedDamage) {
	   damage = Math.floor(1.25 * damage);
	   type = 2;
	   probability = 50;
	   effect = 4;
	   time = 6;
    } 
	
	QJ.MPMZ.tl.ex_playerDamageCheck(damage,type,6,probability,effect,time);
	
};

//红兽-召唤小红怪
QJ.MPMZ.tl.ex_redBeastSummonServent = function(target) {
	
	if (!target) return;
    var XX = target.centerRealX();
    var YY = target.centerRealY();	
    var condition = DrillUp.g_COFA_condition_list[10];
    //var c_area = $gameMap.drill_COFA_getShapePointsWithCondition(XX, YY, "圆形区域", 5, condition);	
	
	var p = c_area[Math.floor(Math.random() * c_area.length)];
	var eid = $gameMap.spawnEventQJ(1,101,XX,YY,false);	
	    $gameMap.event(eid)._opacity = 0;
    /*
    var posX = "$gameMap.event("+eid+").screenBoxXShowQJ()";
    var posY = "$gameMap.event("+eid+").screenBoxYShowQJ()-54";
	    QJ.MPMZ.Shoot({
        img:"Blood Summon[5,8,3]",
        position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
        imgRotation:['F'],
        scale:0.4,
        opacity:0.8,
        moveType:['S',0],
        blendMode:0,
        existData:[	
		  {t:['Time',119]},
        ],
        z:"W"
    });
	*/
};

// 鹿管/淫奔恶魔 战斗指令集
QJ.MPMZ.tl.theLustDemonBattleCommand = function(extra={}) {

    if (extra.timeCheck) {
        let eid   = this.data.eid;
        let enemy = $gameMap.event(eid);
        if (!enemy) return;
        if ($gameSystem.minute() !== 0) {
        // 取消状态标记    
            enemy._ItsTimeMask = false;
            enemy.clearPageAura();
            enemy._auraSticky = null;  
            if (enemy._moveSpeed >= 15) enemy._moveSpeed = 15;
            return;
        }
        enemy._ItsTimeMask = true;
        enemy.setAuraSticky('red');
        return;
    }

    if (extra.attack) {
        if (!this) return;
        let baseDamage = 66;
        let chance = 30;
        if (this._ItsTimeMask) {
            baseDamage *= 6;
            chance = 66;
        }
        let posX = this.screenBoxXShowQJ();
        let posY = this.screenBoxYShowQJ(); 
        let targetX = $gamePlayer.screenBoxXShowQJ();
        let targetY = $gamePlayer.screenBoxYShowQJ();
        let angle = QJ.calculateAngleByTwoPointAngle(posX, posY, targetX, targetY);	       
        let length = 64;
        if ((angle >= 60 && angle <= 120) || (angle >= 240 && angle <= 300)) {
            length = 120;
        }
        QJ.MPMZ.Shoot({
            anchor:[0.5,1],
            position:[['S',posX],['S',posY]],
            collisionBox:['R',10,length],
            imgRotation:['F'],
            moveType:['S',0],
            initialRotation:['P'],
            existData:[
               {t:['Time',12]},	
               {t:['P'], a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[baseDamage, 1, 11, chance]], p:[-1,false,true], c:['S','!QJ.MPMZ.tl.ex_playerBulletPhasing()']},
            ],     
        });	
        return;
    }
    if (extra.shouldResetTime) {
	    if (!this) return false;
	    let eid = this._eventId;
	    let enemy = $gameMap.event(eid);
        if (!enemy) return false;
        let dis = $gamePlayer.calcDistance(eid);
        let chance = 0.2;
        if (dis > 250) chance += 0.2;
        return chance > Math.random();
    }
    if (extra.ItsTime) {
        let randomSeArray = ["ThatRemindsMe~", "It’sTime~~"];
        let randomSe = randomSeArray[Math.floor(Math.random() * randomSeArray.length)];   
        let random = 90 + Math.randomInt(20);
        AudioManager.playSe({ name: randomSe, volume: 100, pitch: random, pan: 0 });

        const name = "ItsTime";
        // 20帧展开、保留约10帧后由事件原有脚本在10帧内收束并删除。
        // 使用FilterControllerMZ的单次取样圆形负片，比叠加遮罩/多滤镜更轻量。
        $gameMap.startNegativeField(name, 20);
        if (!Utils.isMobileDevice()) {
            // 安卓版可能带不动两个滤镜
            let name2 = "RGB";
            $gameMap.createFilter(name2, "rgbsplit", 0);
            $gameMap.setFilter(name2 ,[4,0]);
            $gameMap.moveFilter(name2, [0,0], 40);
            $gameMap.eraseFilterAfterMove(name2);
        }
        // 让时间重置回整点
        const needsCarry = $gameSystem.minute() > 30;
        $gameSystem.set_minute(0);
        if (needsCarry) $gameSystem.add_hour(1);
        $gamePlayer.refresh();
        let eid = this._eventId;
        // 短暂的时滞
        QJ.MPMZ.Shoot({
            position:[['E',eid],['E',eid]],
            groupName:["timeStopField"],
            moveType:['D',true],
            collisionBox: ['C', 420],
            eid: eid,
            existData:[
                {t:['Time',120]},
            ]
        });        
        return;
    }

	if (!this) return;
	let eid = this._eventId;
	let posX = `$gameMap.event(${eid})?.screenBoxXShowQJ()||0`;
	let posY = `$gameMap.event(${eid})?.screenBoxYShowQJ()||0`;
    QJ.MPMZ.Shoot({
        position:[['S',posX],['S',posY]],
        groupName:["TheLustDemon"],
        moveType:['D',true],
        eid: eid,
        existData:[
			{t:['S',`$gameSelfSwitches.value([$gameMap.mapId(), ${eid}, 'D'])`,true]},
        ],
        moveF: [
            [20, 20, QJ.MPMZ.tl.theLustDemonBattleCommand, [{timeCheck:true}]]
        ]
    });    
};
