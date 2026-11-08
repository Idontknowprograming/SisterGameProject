//=============================================================================
//
//=============================================================================
/*:
 * @target MV MZ
 * @plugindesc [弹幕模板库][远程武器-弓]
 * @author 仇九
 *
 * @help 
 * 
 *
 */
//=============================================================================
//
//=============================================================================

//=============================================================================
//弓箭
//=============================================================================

QJ.MPMZ.tl.ex_playerBowAttackCheck = function() {
	
     $dataMap.disableDashing = false;
	 $gamePlayer.drill_EASA_setEnabled( true );
	 let bow = $gameParty.leader().equips()[0];
	 if(!bow) return;
	 let weaponType = bow.wtypeId;
	 if (weaponType !== 3) return;	 
	 
	 if($gameMap.getGroupBulletListQJ('playerBow').length > 0) return;
     $gameParty.leader().removeState(94);
	 destroyTemporaryBar(-1);	   
       QJ.MPMZ.Shoot({
            groupName: ['playerBow','attackMonitoring'],
            position: [['P'], ['P']],
            initialRotation: ['S',0],
            moveType: ['B',-1],
			opacity:0,
			collisionBox:['C',1],
            existData: [
            ],          
            moveF: [
			[2,2,QJ.MPMZ.tl.ex_playerBowAttackTypeCheck],
            //[2,2,QJ.MPMZ.tl.ex_playerSpecialAttackTrigger],
            ],
			moveJS: [
				[2, 2, "$gamePlayer._directionFix = false"]
			]
        });
	
};

//弓攻击行为检测
QJ.MPMZ.tl.ex_playerBowAttackTypeCheck = function() {
	const player = $gameParty.leader();
	const bow = player.equips()[0];
	if (bow?.wtypeId !== 3) {
		// 检测到装备的不是弓
		this.setDead({t:['Time',0]});	
		return;		
	}
	let GamepadsAttack = false;
	let isMobileDevice = Utils.isMobileDevice();
	let isLeftSkill,isRightSkill;
	// 手柄检测
	if ( navigator.getGamepads() && navigator.getGamepads()[0] !== null ) {
		$gamePlayer._directionFix = false;
		GamepadsAttack = Input.drill_isPadPressed('右摇杆上') || Input.drill_isPadPressed('右摇杆下') || Input.drill_isPadPressed('右摇杆左') || Input.drill_isPadPressed('右摇杆右');
		QJ.MPMZ.tl.ex_GamepadsChangePlayerDirection();
	}

	isRightSkill = isMobileDevice ? $gameMap.chahuiMapTemp?.bowChargedAttack : TouchInput.drill_isRightPressed();
	isLeftSkill  = isMobileDevice ? $gameMap.chahuiMapTemp?.bowAttack : TouchInput.drill_isLeftPressed();

	if (isRightSkill) {
		if ( QJ.MPMZ.tl.ex_playerAntiClickDetection("normalAttack") )  return;
		QJ.MPMZ.tl.ex_chargedBowDraw();
		this.setDead({t:['Time',0]});	
		return;
	}

	if ( isLeftSkill || GamepadsAttack) {
        if (window.isHoveringHotbar?.()) return;
		if ( QJ.MPMZ.tl.ex_playerAntiClickDetection("normalAttack") )  return;
		if (SLGSceneFreeExploration.Buttons.isPointerOverButton()) return;
		QJ.MPMZ.tl.ex_bowReady(GamepadsAttack);
		this.setDead({t:['Time',0]});	
		return;
	}
   
};	
	

//左键拉弓
QJ.MPMZ.tl.ex_bowReady = function (GamepadsAttack) {

    $dataMap.disableDashing = true;
    if ($gamePlayer?._drill_EASe_controller !== undefined) {
        $gamePlayer.drill_EASe_setSimpleStateNode(["弓箭蓄力"]);
    }

    // ==================== 拉弓音效(随机音高) ====================
    AudioManager.playSe({
        name: "弓を引き絞る1",
        volume: 90,
        pitch: Math.randomInt(20) + 90,
        pan: 0
    });

    // ==================== 计算射击间隔 ====================
    const leader = $gameParty.leader();
    $gameMap.chahuiMapTemp = $gameMap.chahuiMapTemp || {};
    $gameMap.chahuiMapTemp.normalBowAttack = true;
    leader.addState(94);

    // ==================== 根据操作方式决定瞄准模式 ====================
    let iniRotation = ['M'];  
    if (Utils.isMobileDevice()) {
        iniRotation = ['S', "Input._pressAngle['ok']?Input._pressAngle['ok']:0"];
    }
    if (GamepadsAttack) {
        iniRotation = ['S', 'QJ.MPMZ.tl.ex_gamepadsCheckDirection()'];
    }

    // ==================== 武器贴图路径 ====================
    const weaponImage = `weapon/weapon${leader.equips()[0].baseItemId}`;

    const bowReady = QJ.MPMZ.Shoot({
        groupName: ['playerBullet', 'playerSkill', 'weaponMarker'],
        img: weaponImage,
        scale: 1,
        position: [['P'], ['P']],
        initialRotation: iniRotation,
        imgRotation: ['F'],
        moveType: ['D', true],
        anchor: [0.5, 1],
        blendMode: 0,
        z: "W",
        collisionBox: ['C', 5],
        existData: [
            { t: ['S', '$gameParty?.leader()?.equips()?.[0]?.wtypeId !== 3', true] },
            {
                t: ['S', '$gameMap.regionId(Math.floor($gamePlayer.centerRealX()), Math.floor($gamePlayer.centerRealY())) === 8', true],
                a: ['S', '$gamePlayer.drill_EASA_setEnabled( true )']
            },
        ],
        moveF: [
            [45, 0, QJ.MPMZ.tl.ex_shootArrows, [GamepadsAttack]],
			[4, 4, QJ.MPMZ.tl.ex_checkBowAlignment]
        ],
        deadJS: ["QJ.MPMZ.tl.ex_playerBowAttackCheck()"] // 重置监听器
    });

    // ==================== 终止条件:依设备类型注入 ====================
    if (Utils.isMobileDevice()) {
        // 移动端
        bowReady.addExistData({ t: ['S', '!$gameMap.chahuiMapTemp?.bowAttack', true] });
    } else {
        // PC 端:松开左键则停止
        bowReady.addExistData({ t: ['S', '!TouchInput.drill_isLeftPressed()', true] });
    }
    // ==================== 手柄模式额外处理 ====================
    if (GamepadsAttack) {
        const padReleasedExpr = [
            "Input.drill_isPadPressed('右摇杆上')",
            "Input.drill_isPadPressed('右摇杆下')",
            "Input.drill_isPadPressed('右摇杆左')",
            "Input.drill_isPadPressed('右摇杆右')"
        ].join('||');

        // 任一摇杆方向松开 → 停止蓄力
        bowReady.addExistData({ t: ['S', padReleasedExpr, false] });
        bowReady.addMoveData('F', [4, 4, QJ.MPMZ.tl.ex_checkBowAlignment], [GamepadsAttack]);
    }
};

//手柄状态校准弓箭Z轴
QJ.MPMZ.tl.ex_gamepadsCheckDirection = function(change) {
   if (change) {
    var up    = Input.drill_isPadPressed('左摇杆上');
    var down  = Input.drill_isPadPressed('左摇杆下');
    var left  = Input.drill_isPadPressed('左摇杆左');
    var right = Input.drill_isPadPressed('左摇杆右');	   
   } else {
    var up    = Input.drill_isPadPressed('右摇杆上');
    var down  = Input.drill_isPadPressed('右摇杆下');
    var left  = Input.drill_isPadPressed('右摇杆左');
    var right = Input.drill_isPadPressed('右摇杆右');
   }
    var isPadPressed = up || down || left || right;
    if (isPadPressed) {
        // 上下优先判断
        if (up) {
            if (left) {
                return 315;	  // ↖(上左)
            } else if (right) {
                return 45;	// ↗(上右)
            } else {
                return 0;	// ↑(上)
            }
        } else if (down) {
            if (left) {
                return 225;	// ↙(下左)
            } else if (right) {
                return 135;	// ↘(下右)
            } else {
                return 180;	// ↓(下)
            }
        } else {
            // 这里说明既没上也没下，但检测到左右
            if (left) {
                return 270;	// ←(左)
            } else if (right) {
                return 90;	// →(右)
            }
        }
    } else {
		return 0;
	}
};

//校准弓箭Z轴
QJ.MPMZ.tl.ex_checkBowAlignment = function(GamepadsAttack) {

    if (GamepadsAttack) {
		QJ.MPMZ.tl.ex_GamepadsChangePlayerDirection();
	}

	if (this.rotationImg <= 90 || this.rotationImg >= 270) {
	this.changeAttribute("z","E");
	} else {
	this.changeAttribute("z","W");
	}
	
	if ($gameVariables.value(129) >= 60 && TouchInput.drill_isRightPressed()){ 
	var red = $gameVariables.value(129) - 45;
	this.changeAttribute("tone",[red,0,0,0]);
	}
	// 防止玩家被锁视角
	$gamePlayer._directionFix = false;
}

// 弓武器通用耐久度结算
QJ.MPMZ.tl.ex_consumeBowDurability = function (weaponDamage, extraCount = 0) {
    const leader = $gameParty.leader();
    const weapon = leader.equips()[0];
    if (!weapon) return;
 
    let durabilityDamage = weaponDamage;
    if (durabilityDamage < 0) durabilityDamage = 0;
	// 减少耐久损耗
    if (leader.hasSkill(30)) {
        const reduction = Math.max(0, (100 - leader.skillMasteryLevel(30)) / 100);
        durabilityDamage *= reduction;
    }
 
    // 扣耐久
    weapon.durability -= Math.floor(durabilityDamage);
    if (extraCount > 0) {
		// 连发箭也会扣除耐久度
		weapon.durability -= Math.floor(durabilityDamage * 0.66 * extraCount);
	} 
    // 武器破损处理
    if (weapon.durability <= 0) {
        const weaponBullets = $gameMap.getGroupBulletListQJ('playerWeaponImg');
        if (weaponBullets.length > 0) {
            const bulletId = weaponBullets[0];
            $gameMap._mapBulletsQJ[bulletId]._broken = true;
        }
    }
};

// 左键的普通射击箭矢
QJ.MPMZ.tl.ex_shootArrows = function (GamepadsAttack) {
    // 冷却时间   
    this._coolDown = this._coolDown || 0;	
    if (this._coolDown > 0) {
        this._coolDown -= 1;
        return;
    }
    const leader = $gameParty.leader();
    const weapon = leader.equips()[0];
    // ==================== 角色动作 + 射箭音效 ====================
    $gamePlayer.drill_EASe_stopAct();
    $gamePlayer.drill_EASe_setAct("弓箭射击");
    AudioManager.playSe({
        name: "弓矢を放つ",
        volume: 90,
        pitch: Math.randomInt(40) + 81,
        pan: 0
    });
    // ==================== 基础参数 ====================
    const weaponImage = `weapon/weaponBullet${weapon.baseItemId}`;
    const baseDamage = chahuiUtil.getVarianceDamage(1);
    const extraCount = leader.skillMasteryLevel(99);   // 连发箭
    let afterImage = null;
    // ==================== 血箭:自损 + 加伤 ====================
    if (leader.hasSkill(53)) {
        afterImage = ['#ff0000', '0|1~10/0', 10, 3];
        const baseCostHp = Math.round(leader.mhp * 0.03);
        const totalCostHp = baseCostHp * (1 + extraCount);
        // 延迟扣血(避免与本帧战斗逻辑冲突)
        QJ.MPMZ.Shoot({
            groupName: ['costHp'],
            existData: [
                { t: ['Time', 20], a: ['S', `$gameParty.leader().gainHp(${-totalCostHp})`] }
            ],
        });
    }
 
    // 注意:血箭加伤要叠到 baseDamage 上
    const weaponDamage = leader.hasSkill(53)
        ? baseDamage + 4 * Math.round(leader.mhp * 0.03)
        : baseDamage;
 
    // ==================== 瞄准模式 ====================
    // ★Shiroin: 必须每次返回【全新数组】，不能把同一个数组喂给两次发射。
    //   QJ.MPMZ.Shoot 会就地改写传进去的 initialRotation：
    //   model.initialRotationExtra 里 `value[0] = Number(eval(value[1]))`，
    //   主箭射完后数组就从 ['S',表达式] 变成 [算好的角度数字, 表达式]。
    //   再把它交给 Shooter_ArcRange，getRotationAddValueIndex 拿 value[0] 做 switch
    //   已经匹配不到 'S'/'M' → 返回 -1 → 走进"当成数字直接相加"的分支
    //   （数组 + 数字 = 字符串拼接）→ 角度变成垃圾值，表现为固定朝 0 度。
    const makeAimRotation = () => Utils.isMobileDevice()
        ? ['S', "Input._pressAngle['ok']?Input._pressAngle['ok']:0"]
        : ['M'];
    let iniRotation = makeAimRotation();
    // if (GamepadsAttack) iniRotation = ['S', 'QJ.MPMZ.tl.ex_gamepadsCheckBowAlignment()'];
    // ==================== 主箭弹幕 ====================
    let PenCount = leader._defPenCount || 0;
	const speed = `0|${13 + PenCount*2}~60/8~999/8`;    
    const arrowConfig = {
        groupName: ['playerBullet'],
        collisionBox: ['auto'],
        img: weaponImage,
        moveType: ['S', speed],
        position: [['P'], ['P']],
        initialRotation: iniRotation,
        imgRotation: ['F'],
        afterImage,
		z:15,
        existData: [
            { t: ['Time', 120] },
            { t: ['R', [255]], c: ['S', 'this.time > 10'] },
            {
                t: ['G', ['"enemy"', '"object"']],
                a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [weaponDamage, { noDurLoss: true, weaponAttack: true }]],
                p: [PenCount, false, true]
            },
        ]
    };
    const Arrows = QJ.MPMZ.Shoot(arrowConfig);
    // 火属性标记
    if (weapon.baseItemId === 103) {
        Arrows.data.groupName.push("fire");
        $gameMap.addMapBulletsNameQJ(Arrows.index, Arrows.data.groupName);
    }
    // 追踪效果
    if (leader.hasSkill(41)) {
        Arrows.addMoveData("F", [10, 10, QJ.MPMZ.tl.ex_projectileTrackingEffect]);
    }
    // ==================== 连发箭:弧形扇射 ====================
	let extra = 0;
    if (leader.hasSkill(86)) {
        // 概率连发
        let skillLevel = leader.skillMasteryLevel(86);
        let chance = (0.1 + 0.08 * skillLevel) * 1.2 * QJ.MPMZ.tl.randHighByLuckSmooth(leader.luk);
        if (Math.random() < chance) {
            extra += 1 + Math.randomInt(4);
        }
    }
    if (extraCount > 0 || extra > 0) {
        QJ.MPMZ.Shooter_ArcRange(
            makeAimRotation(),
            {
                groupName: Arrows.data.groupName,
                collisionBox: ['auto'],
                img: weaponImage,
                moveType: ['S', speed],
                position: [['P'], ['P']],
                initialRotation: makeAimRotation(),
                imgRotation: ['F'],
                subBullet: true,
				z:15,
                moveF: Arrows.data.moveF,
                existData: [
                    { t: ['Time', 120] },
                    { t: ['R', [255]], c: ['S', 'this.time > 10'] },
                    {
                        t: ['G', ['"enemy"', '"object"']],
                        a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [weaponDamage, { noDurLoss: true, weaponAttack: true }]],
                        p: [PenCount, false, true]
                    },
                ],
            },
            -20, 20, extraCount + extra, 15, 1, 1
        );
    }
    // ==================== 耐久度结算 ====================
    QJ.MPMZ.tl.ex_consumeBowDurability?.(weaponDamage, extraCount);
    // ==================== 下次攻击 CD 结算 ====================
    // 攻速 cnt 分两段计算,在 cnt=0 处衔接:
    //   正攻速(cnt ≥ 0):指数加速,快速逼近极限
    //     cnt = 1   → 90/30   = 3 帧(最快)
    //     cnt = 0.5 → 90/5.48 ≈ 16 帧
    //     cnt = 0   → 90/1    = 90 帧(基准)
    //   负攻速(cnt < 0):线性衰减,避免 CD 暴涨产生"卡 bug"错觉
    //     每 -1.0 攻速增加 180 帧
    //     cnt = -0.5 → 90 + 90  = 180 帧
    //     cnt = -1.0 → 90 + 180 = 270 帧
    const MAX_DPS_MULTIPLIER = 30;        // 正攻速:cnt=1 时的倍率基数
    const BASE_INTERVAL = 90;             // cnt=0 的基准 CD
    const NEGATIVE_SLOPE = 180;           // 负攻速:每 -1.0 攻速增加的帧数
    const MIN_INTERVAL = 3;               // 下限:防超高攻速算出过小/为 0

    const cnt = leader.cnt;
    const rawInterval = cnt >= 0
        ? Math.round(BASE_INTERVAL / Math.pow(MAX_DPS_MULTIPLIER, cnt))   // 指数加速
        : Math.round(BASE_INTERVAL - cnt * NEGATIVE_SLOPE);              // 线性衰减(cnt 为负)

    const intervalTime = Math.max(rawInterval, MIN_INTERVAL);

    this._coolDown = intervalTime;
};

//右键蓄力拉弓
QJ.MPMZ.tl.ex_chargedBowDraw = function () {
 
    const leader = $gameParty.leader();
    // ==================== 状态初始化 ====================
    leader.addState(94);
    $gameVariables.setValue(129, 0);          // 蓄力进度变量清零
    $dataMap.disableDashing = true;
    if ($gamePlayer?._drill_EASe_controller !== undefined) {
        $gamePlayer.drill_EASe_setSimpleStateNode(["弓箭蓄力"]);
    }
    // 创建蓄力进度条
    createTemporaryBar(-1, 129, 300, { offsetY: 64, radius: 20, lineWidth: 6, shape: 'circle' });
    // ==================== 拉弓音效(随机音高) ====================
    AudioManager.playSe({
        name: "弓を引き絞る1",
        volume: 90,
        pitch: Math.randomInt(20) + 90,
        pan: 0
    });
    // ==================== 武器贴图 ====================
    const weaponImage = `weapon/weapon${leader.equips()[0].baseItemId}`;
    // ==================== 瞄准模式 ====================
    let iniRotation = ['M'];
    if (Utils.isMobileDevice()) {
        iniRotation = ['S', "Input._pressAngle['ok']?Input._pressAngle['ok']:0"];
    }	
    // ==================== 蓄力期间的弓体弹幕 ====================    
    const bowReady = QJ.MPMZ.Shoot({
        groupName: ['playerBullet', 'playerSkill'],
        img: weaponImage,
        scale: 1,
        position: [['P'], ['P']],
        initialRotation: iniRotation,
        imgRotation: ['F'],
        moveType: ['D', true],
        anchor: [0.5, 1],
        blendMode: 0,
        z: 15,
        collisionBox: ['C', 5],
        existData: [
            // 武器切换为非弓 → 中断蓄力
            { t: ['S', '$gameParty?.leader()?.equips()?.[0]?.wtypeId !== 3', true] },
            // 在水域中断蓄力
            {
                t: ['S', '$gameMap.regionId(Math.floor($gamePlayer.centerRealX()), Math.floor($gamePlayer.centerRealY())) === 8', true],
                a: ['S', '$gamePlayer.drill_EASA_setEnabled( true )']
            },
        ],
        moveF: [
            [4, 4, QJ.MPMZ.tl.ex_checkBowAlignment]
        ],
        moveJS: [
            // 每 10 帧累加蓄力值
            // 攻速 cnt 影响蓄力速率,分两段避免负攻速算出负增量:
            //   正攻速:rate = 1 + 3*cnt(满攻速 4 倍速)
            //   负攻速:rate = max(0.2, 1 + cnt)(线性放缓,但始终正向)
            // 每次增量再用 max(1, ...) 兜底,保证至少 +1
            [30, 10, `var cnt = $gameParty.leader().cnt;
                     var rate = cnt >= 0 ? (1 + 3 * cnt) : Math.max(0.2, 1 + cnt);
                     var number = Math.max(1, Math.round(10 * rate));
                     $gameVariables.setValue(129, $gameVariables.value(129) + number)`]
        ],
        deadJS: ["QJ.MPMZ.tl.ex_playerBowAttackCheck()"]
    });
    // ==================== 终止条件:依设备类型注入 ====================
    const releaseCondition = Utils.isMobileDevice()
        ? "!$gameMap.chahuiMapTemp?.bowChargedAttack"
        : "!TouchInput.drill_isRightPressed()";

    bowReady.addExistData({
        t: ['S', releaseCondition, true],
        a: ['F', QJ.MPMZ.tl.ex_shootChargedArrows],
        c: ['S', 'this.time>60']      // 蓄力 ≥ 90 帧才允许射出
    });
};

//蓄力箭矢发射
QJ.MPMZ.tl.ex_shootChargedArrows = function () {

    const leader = $gameParty.leader();
    const weapon = leader.equips()[0];
    // ==================== 角色动作 + 射箭音效 ====================
    $gamePlayer.drill_EASe_setAct("弓箭射击");
    AudioManager.playSe({
        name: "弓矢を放つ",
        volume: 90,
        pitch: Math.randomInt(40) + 81,
        pan: 0
    });
    destroyTemporaryBar(-1);
    // ==================== 基础参数 ====================
    const weaponImage = `weapon/weaponBullet${weapon.baseItemId}`;
    const extraCount = leader.skillMasteryLevel(99);

    // 蓄力值上限 300,转换为伤害倍率
    const chargeValue = $gameVariables.value(129);
    let damageRatio = 1.5 * (1 + Math.min(chargeValue, 300) / 100);
    if (chargeValue > 300) damageRatio += 0.5;
    let weaponDamage = Math.round(chahuiUtil.getVarianceDamage(1) * damageRatio);
    let afterImage = [['P', weaponImage], '0|1~16/0', 16, 2];
    // ==================== 武器特殊技能解析 ====================
    let specialSkill = null;
    const skillMatch = $dataWeapons[weapon.baseItemId]?.note?.match(/<specialSkill:([^>]+)>/i);
    if (skillMatch) {
        specialSkill = eval(`QJ.MPMZ.tl.ex_${skillMatch[1]}`);
    }
    // ==================== 血箭:自损 + 加伤 ====================
    if (leader.hasSkill(53)) {
        afterImage = ['#ff0000', '0|1~16/0', 16, 3];
        const baseCostPerHp = Math.round(leader.mhp * 0.03);
        const costMultiplier = Math.min(chargeValue / 10, 30);
        const scaledCost = baseCostPerHp * costMultiplier;
        // 加伤(基于缩放后的扣血,但不算 extraCount)
        weaponDamage += Math.round(4 * scaledCost);
        // 实际扣血量(扩展到 extraCount)
        let totalCostHp = scaledCost * (1 + extraCount);
        let costTime = 9;
        // 大量扣血时拉长时间分摊
        if (totalCostHp > 60) {
            costTime = 60;
            totalCostHp = Math.round(totalCostHp / 6);
        }
        QJ.MPMZ.Shoot({
            groupName: ['costHp'],
            existData: [
                { t: ['Time', costTime] }
            ],
            moveJS: [
                [0, 10, `$gameParty.leader().gainHp(${-totalCostHp})`]
            ]
        });
    }
    // ==================== 主蓄力箭弹幕 ====================
    let PenCount = leader._defPenCount || 0;
	const speed = `0|${20 + PenCount*2}~120/7~999/7`;        
	let angle = this.inheritRotation();
    const ChargedArrows = QJ.MPMZ.Shoot({
        groupName: ['playerBullet'],
        collisionBox: ['auto'],
        img: weaponImage,
        moveType: ['S', speed],
        position: [['P'], ['P']],
        initialRotation: ['S', angle],
        imgRotation: ['F'],
        afterImage,
        existData: [
            { t: ['Time', 120] },
            { t: ['R', [255]], c: ['S', 'this.time > 10'] },
            {
                t: ['G', ['"enemy"', '"object"']],
                a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [weaponDamage, {
                    noDurLoss: true,
                    attackFallOff: true,
                    specifyAddedStatus: true,
                    addedStatusType: true,
                    weaponAttack: true
                }]],
                p: [3 + PenCount, false, true, specialSkill]   // 穿透效果
            },
        ],
    });
    if (!ChargedArrows) return;
    // 火属性标记
    if (weapon.baseItemId === 103) {
        ChargedArrows.data.groupName.push("fire");
        $gameMap.addMapBulletsNameQJ(ChargedArrows.index, ChargedArrows.data.groupName);
    }
    // 追踪效果
    if (leader.hasSkill(41)) {
        ChargedArrows.addMoveData("F", [10, 10, QJ.MPMZ.tl.ex_projectileTrackingEffect]);
    }
    // ==================== 连发箭:弧形扇射 ====================
    let extra = 0;
    if (leader.hasSkill(86)) {
        // 概率连发
        let skillLevel = leader.skillMasteryLevel(86);
        let chance = (0.1 + 0.08 * skillLevel) * 1.2 * QJ.MPMZ.tl.randHighByLuckSmooth(leader.luk);
        if (Math.random() < chance) {
            extra += 1 + Math.randomInt(4);
        }
    }    
    if (extraCount + extra > 0) {
        QJ.MPMZ.Shooter_ArcRange(
            ['S', angle],
            {
                groupName: ChargedArrows.data.groupName,
                collisionBox: ['auto'],
                img: weaponImage,
                moveType: ['S', speed],
                position: [['P'], ['P']],
                initialRotation: ['S', angle],
                imgRotation: ['F'],
                subBullet: true,
                moveF: ChargedArrows.data.moveF,
                afterImage: [['P', weaponImage], '0|1~16/0', 16, 2],
                existData: [
                    { t: ['Time', 120] },
                    { t: ['R', [255]], c: ['S', 'this.time > 10'] },
                    {
                        t: ['G', ['"enemy"', '"object"']],
                        a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [weaponDamage, {
                            noDurLoss: true,
                            attackFallOff: true,
                            weaponAttack: true
                        }]],
                        p: [3 + PenCount, false, true, specialSkill]
                    },
                ],
            },
            -5, 5, extraCount + extra, 2, 1, 1
        );
    }
    // ==================== 耐久度结算 ====================
	let durabilityDamage = weaponDamage * 1.2;
	if (specialSkill) durabilityDamage *= 2;
    QJ.MPMZ.tl.ex_consumeBowDurability?.(weaponDamage, extraCount);	
};

//火烧云：爆炸箭
QJ.MPMZ.tl.ex_explosiveArrows = function() {

    let posX = this.inheritX();
    let posY = this.inheritY();
        posX +=  24 * Math.sin(this.rotationMove*Math.PI/180);
        posY += -24 * Math.cos(this.rotationMove*Math.PI/180);		
    const magicImage = "Magic/explosion_3[8,3,3]";
    let magicScale = 1 + ($gameVariables.value(129) / 150);
	magicScale = Math.min(magicScale, 10);
	let magicDamage = 10 + chahuiUtil.getVarianceDamage(3) * 2.5;
	    magicDamage = Math.round(magicDamage * magicScale);
	let timing = 'this.time > 12 && this.time < 30';
    QJ.MPMZ.Shoot({
		groupName:['playerBullet','fire'],
        img:magicImage,
        position:[['S',posX],['S',posY]],
        initialRotation:['S',Math.randomInt(360)],
        scale:magicScale,
        moveType:['S',0],
        imgRotation:['F'],
        anchor:[0.5,0.5],
		blendMode:0,
        existData:[	
			{t:['Time',70]},
			{t:['G',['"enemy"','"object"']],a:['C',152,[magicDamage,0,0,0]],p:[-1,true,true],c:['S',timing]},
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.attackKnockbackEffect,[null]],p:[-1,false,true],c:['S',timing]},
			{t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[magicDamage,2]],p:[-1,false,true],c:['S',timing]},
			{t:['P'],a:['F',QJ.MPMZ.tl.attackKnockbackEffect,[null]],p:[-1,false,true],c:['S',timing]},
        ],
        z:"W",
		collisionBox:['C',32],
    });
	
     let seNames = "Fire3";
     let randomPitch = Math.randomInt(40) + 81;
     let se = { name: seNames, volume: 80, pitch: randomPitch, pan: 0 };
     AudioManager.playSe(se);	
	this.setDead({t:['Time',0]});
};

//雪见：冰封箭
QJ.MPMZ.tl.ex_iceboundArrows = function() {

    let posX = this.inheritX();
    let posY = this.inheritY();
        posX +=  24 * Math.sin(this.rotationMove*Math.PI/180);
        posY += -24 * Math.cos(this.rotationMove*Math.PI/180);		
    var magicImage = "Magic/PapoyCore_IceEffect2[6,4]";
    var magicScale = 1 + ($gameVariables.value(129) / 200);
	magicScale = Math.min(magicScale, 3);
	var magicDamage = 20 + chahuiUtil.getVarianceDamage(3) * 0.5;
	    magicDamage = Math.round(magicDamage * magicScale);

    QJ.MPMZ.Shoot({
		groupName:['playerBullet'],
        img:magicImage,
        position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
        scale:[magicScale,magicScale],//动态缩放
        moveType:['S',0],
        imgRotation:['F'],
        anchor:[0.5,0.8],
		blendMode:0,
        existData:[	
			{t:['Time',23]},
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[magicDamage,{noHitEffect:true,magicAttack:true,specifyAddedStatus:true,addedStatusType:9,addedStatusChance:15000}]],p:[-1,true,true],c:['S','this.time > 10']},
        ],
        z:"MF_UG",
		collisionBox:['R',20,60],
		deadF:[[QJ.MPMZ.tl.ex_iceboundArrowsEffect,[magicDamage]]]
    });
	
     var seNames = "氷が砕ける音・氷系の魔法SE（中レベル）";
     var randomPitch = Math.randomInt(40) + 81;
     var se = { name: seNames, volume: 70, pitch: randomPitch, pan: 0 };
     AudioManager.playSe(se);	
	 this.setDead({t:['Time',0]});
	
};

//冰封箭效果
QJ.MPMZ.tl.ex_iceboundArrowsEffect = function(damage) {
	
    let posX = this.inheritX();
    let posY = this.inheritY();
    let magicScale = this.scaleX;
    let	time = Math.floor(60 + 150 * magicScale);
	let endTime = time - 1;
	if (damage && damage > 0) {
		damage = Math.floor(damage * 0.15);
	} else {
		damage = 1;
	}
    QJ.MPMZ.Shoot({
		groupName:['playerBullet'],
        img:"Magic/PapoyCore_IceEffect2",
        position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
        scale:magicScale,
        moveType:['S',0],
		opacity:0.75,
        imgRotation:['F'],
        anchor:[0.5,0.8],
		blendMode:0,
        existData:[	
			{t:['Time',time]},
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[damage,{noHitEffect:true,magicAttack:true,specifyAddedStatus:true,addedStatusType:9,addedStatusChance:5000}]],p:[-1,true,true],c:['T',0,40,true]}
        ],
		moveF:[
		  [endTime,9999,QJ.MPMZ.tl.ex_iceboundArrowsEnd]
		],
        z:"MF_UG",
		collisionBox:['R',20,60],
		//dead:[[QJ.MPMZ.tl.ex_iceboundArrowsEnd]]
    });
};

//冰封箭消失
QJ.MPMZ.tl.ex_iceboundArrowsEnd = function() {
	
    let posX = this.inheritX();
    let posY = this.inheritY();
    let magicScale = this.scaleX; 
	
    QJ.MPMZ.Shoot({
		groupName:['playerBullet'],
        img:"Magic/PapoyCore_IceEffect2_end[6,2,4]",
        position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
        scale:magicScale,
        moveType:['S',0],
		opacity:0.75,
        imgRotation:['F'],
        anchor:[0.5,0.8],
		blendMode:0,
        existData:[	
			{t:['Time',47]},
			//{t:['G',['"enemy"','"object"']],a:['C',152,[magicDamage,0,0,0]],p:[-1,true,true],c:['S','this.time > 20']},
        ],
        z:"MF_UG",
		collisionBox:['R',20,60],
		//dead:[[QJ.MPMZ.tl.ex_iceboundArrowsEnd]]
    });
};

//千鸟-雷击箭
QJ.MPMZ.tl.ex_lightningBolt = function() {


    let posX = this.inheritX();
    let posY = this.inheritY();
    let magicScale = 0.2 + ($gameVariables.value(129) / 200);
	magicScale = Math.min(magicScale, 1.5);
	let magicDamage = Math.round((20 + chahuiUtil.getVarianceDamage(3)) * magicScale);
    const effectTag = 'shiroinLightningBoltEffect';
    const showEffect = $gameMap.getGroupBulletListQJ(effectTag).length < 2;
    let bullet = QJ.MPMZ.Shoot({
		img: showEffect ? ['A', 184] : "null1",
        position:[['S',posX],['S',posY]],
		groupName:showEffect ? [effectTag] : [],
        initialRotation:['S',0],
        imgRotation:['F'],
        scale:magicScale,
        opacity:1,
		anchor:[0.5,0.5],
        moveType:['S',0],
		collisionBox:['E', 200, 150],
        blendMode:1,
        existData:[	
		    {t:['Time',59]},
			{t:['G',['"enemy"','"object"']], a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[magicDamage,{noDurLoss:true,noHitEffect:true,magicAttack:true,specifyAddedStatus:true,addedStatusType:7,addedStatusChance:5000}]],p:[-1,true,true],c:['S',"this.time > 30 && this.time < 38"]},
        ],
        z:"MF_UA"
    });
	
	let chance = 8000;
	let onWater = $gameMap.regionId(Math.round(this.x/48), Math.round(this.y/48)) === 8;
	if( onWater || chance > Math.randomInt(10000) ){
	    bullet.addMoveData("F",[30,9999,QJ.MPMZ.tl.ex_electricTrap]);
	}
}

//电击陷阱
QJ.MPMZ.tl.ex_electricTrap = function() {

    let posX = this.inheritX();
    let posY = this.inheritY();
	let magicScaleX = this.scaleY;
	let magicScaleY = magicScaleX * 0.6;
	let damage = Math.round(0.2 * chahuiUtil.getVarianceDamage(2) * magicScaleX);
	const effectTag = 'shiroinElectricTrapEffect';
	const showEffect = $gameMap.getGroupBulletListQJ(effectTag).length < 2;
	QJ.MPMZ.Shoot({
		img: showEffect ? ['A', 132, -1] : "null1",
		groupName:showEffect ? [effectTag] : [],
        position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
        imgRotation:['F'],
        scale:[magicScaleX,magicScaleY],
        opacity: 1,
        moveType:['S',0],
        //blendMode:3,
        hue: 236,
		collisionBox:['E', 220, 165],
		//collisionBox:['R',160,160],
        existData:[	
		    {t:['Time',300]},
			{t:['G',['"enemy"','"object"']],
          a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [
            damage,
            {
			  magicAttack:true,
              orbitingDamage:true,
              noHitEffect:true,
              noDurLoss:true,
              specifyAddedStatus:true,
              addedStatusType:7,
              addedStatusChance:3300
            }
          ]],p:[-1,true,true],c:['T',0,15,true]},
		    {t:['B',['playerFeet']],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[10,2,7,3300]],p:[-1,true,true],c:['T',0,15,true]}
        ],
        z:"MF_BA",
        moveF: [ 
        ]
    });
}
