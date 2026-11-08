//=============================================================================
//
//=============================================================================
/*:
 * @target MV MZ
 * @plugindesc [弹幕模板库][法杖模板]
 * @author 仇九
 * @requiredAssets img/particles/thunder1_2
 * @requiredAssets img/particles/thunder2
 * @requiredAssets img/particles/thunder3
 *
 * @help 
 *
 */
//=============================================================================
//
//=============================================================================

//=============================================================================
//法杖
//=============================================================================



//法杖跟随
QJ.MPMZ.tl.ex_staffAlwaysVisible = function() {
        const staff = $gameParty.leader().equips()[0];
	    if(!staff) return;
		let staffType = [5,6,7];
		if (!staffType.includes(staff.wtypeId)) return;
		if($gameMap.getGroupBulletListQJ('playerStaff').length > 0) return;

        $gameParty.leader().removeState(65);
		$gameParty.leader().removeState(68);
		$gamePlayer.drill_EASA_setEnabled(true);
		
        let direction = $gamePlayer.direction();	
        let offsetX = 0;
        let offsetY = 0;
        switch (direction) {
			case 2: // 下
				offsetX = 0;       
				offsetY = -32;     
				break;
			case 4: // 左
				offsetX = +32;     
				offsetY = 0;      
				break;
			case 6: // 右
				offsetX = -32;     
				offsetY = 0;      
				break;
			case 8: // 上
				offsetX = 0;      
				offsetY = 32;     
				break;
        }		
		let NormalAttack = true;
		let specialSkill = false;
	    let posX = $gamePlayer.screenShootXQJ() + offsetX;
        let posY = $gamePlayer.screenShootYQJ() + offsetY;
        let weaponImage = "weapon/weapon" + staff.baseItemId;

	    let skillMatch = $dataWeapons[staff.baseItemId]?.note?.match(/<specialSkill:([^>]+)>/i);
	    if (skillMatch) {
			specialSkill = true;
	    }
	
        let listener = QJ.MPMZ.Shoot({
            groupName: ['playerStaff','attackMonitoring','weaponMarker'],
            img: weaponImage,
            position: [['S',posX], ['S',posY]],
            initialRotation: ['S',0],
            moveType: ['S',0],
			imgRotation:['S',-15],
			scale:[-1,1],
			opacity:'0|0~20|0~40/1~999999|1',
			collisionBox:['C',16],
            existData: [
              //{t:['S','TouchInput.drill_isLeftPressed()',true],a:['S','QJ.MPMZ.tl.ex_staffAim()'],p:[-1,false,true],d:[0,30],t:['F',QJ.MPMZ.tl.ex_staffConditionCheck ,[],true],},     
			 // {t:['S','TouchInput.drill_isRightPressed()',true],a:['S','QJ.MPMZ.tl.ex_stickSpecialAttack()'],p:[-1,false,true],d:[0,30]},  
            ],         
            z: 16,
            moveJS: [
			   [30, 4, `QJ.MPMZ.tl.ex_staffConditionCheck.call(this, ${NormalAttack}, ${specialSkill})`],
			   [20, 20, "QJ.MPMZ.tl.ex_staffFollowsPlayer.call(this)"],
            ],
			timeline:[['S',0,119,[0,8,60]]]
        });
				
}	
	
//法杖攻击行为检测
/*
QJ.MPMZ.tl.ex_staffConditionCheck = function(NormalAttack,specialSkill) {
	if (QJ.MPMZ.tl.ex_playerAntiClickDetection("normalAttack")) return;
	const staff = $gameParty.leader().equips()[0];
	if (!staff) return;
	let staffType = [5,6,7];
	if (!staffType.includes(staff.wtypeId)) {
	   this.setDead({t:['Time',0],d:[0,10]});
       return;	   
	}

	let Triggered = false;
	if (Utils.isMobileDevice()) {
	  Triggered = $gameMap.chahuiMapTemp?.stickAttack;
	} else {
      if (window.isHoveringHotbar?.()) return;  
	  Triggered = TouchInput.drill_isLeftPressed();
	}

    if( Triggered ) {  
	  QJ.MPMZ.tl.ex_staffAim();
	  this.setDead({t:['Time',0],d:[0,10]});
	  return;  
	}
	
	if (!specialSkill) return;
	
    if( TouchInput.drill_isRightPressed() ) {
	  QJ.MPMZ.tl.ex_stickSpecialAttack();
	  this.setDead({t:['Time',0],d:[0,10]});
	  return;
	}   
};
*/

QJ.MPMZ.tl.ex_staffConditionCheck = function(NormalAttack,specialSkill) {

	if (QJ.MPMZ.tl.ex_playerAntiClickDetection("normalAttack")) return;
	let GamepadsAttack = false;
	let isMobileDevice = Utils.isMobileDevice();
	let isLeftSkill,isRightSkill;
	// 手柄检测
	if ( navigator.getGamepads() && navigator.getGamepads()[0] !== null ) {
		$gamePlayer._directionFix = false;
		GamepadsAttack = Input.drill_isPadPressed('右摇杆上') || Input.drill_isPadPressed('右摇杆下') || Input.drill_isPadPressed('右摇杆左') || Input.drill_isPadPressed('右摇杆右');
		QJ.MPMZ.tl.ex_GamepadsChangePlayerDirection();
	}

	isRightSkill = isMobileDevice ? $gameMap.chahuiMapTemp?.stickChargedAttack : TouchInput.drill_isRightPressed();
	isLeftSkill  = isMobileDevice ? $gameMap.chahuiMapTemp?.stickAttack : TouchInput.drill_isLeftPressed();

	if (specialSkill && isRightSkill) {
        // specialSkill开关用来确保还没有右键技能的法杖不会误触
		QJ.MPMZ.tl.ex_stickSpecialAttack();
		this.setDead({t:['Time',0],d:[0,10]});
		return;
	}

	if ( isLeftSkill || GamepadsAttack) {
		QJ.MPMZ.tl.ex_staffAim();
	    this.setDead({t:['Time',0],d:[0,10]});
		return;
	}
};	

//法杖跟随玩家
QJ.MPMZ.tl.ex_staffFollowsPlayer = function() {

	let index = this.index;
	if ( QJ.MPMZ.rangeAtk([['B',index],['B',index]],['P'],[],['C',50]).length > 0 ) {
         this.changeAttribute("moveType",['S',0]);
    } else {
		this.changeAttribute("moveType",['TP',3,15]);
	}
	if (this.inheritY() > $gamePlayer.screenShootYQJ()){
	    this.changeAttribute("z", 20);
	} else {
	    this.changeAttribute("z", "E");
	}
}

// 法杖左键攻击瞄准
QJ.MPMZ.tl.ex_staffAim = function () {
	const leader = $gameParty.leader();
	const staff = leader.equips()[0];
	if (![5, 6, 7].includes(staff?.wtypeId)) {
		// 检测到装备的不是法杖
		return;		
	}
    // ==================== 角色状态初始化 ====================
    $gamePlayer.drill_EASe_stopAct();
    leader.addState(68);
    if (leader._characterName === "$player") {
        $gamePlayer.drill_EASe_setSimpleStateNode(["法杖瞄准"]);
    }
    // 持续浮空效果
    $gamePlayer.drill_ECE_playSustainingFloating(518400000, 30, 4, 120, 2);
    // ==================== 武器贴图 ====================
    const weaponImage = `weapon/weaponTrail${leader.equips()[0].baseItemId}`;
    // ==================== 瞄准方法和结束条件判定 ====================
    let iniRotation = ['M'];
    let cancelCode  = '!TouchInput.drill_isLeftPressed()';
    if (Utils.isMobileDevice()) {
        iniRotation = ['S', "Input._pressAngle['ok']?Input._pressAngle['ok']:0"];
        cancelCode  = '!$gameMap.chahuiMapTemp?.stickAttack';
    }
    // ==================== 锚定玩家监听器 ====================
    const playerFeet = $gameMap.getGroupBulletListQJ('playerFeet');
    const playerIndex = playerFeet.length > 0 ? playerFeet[0] : 0;

    // ==================== 发射激光 ====================
    QJ.MPMZ.Laser({
        rotation: iniRotation,
        groupName: ['staffAim', 'attackMonitoring', 'weaponMarker'],
        img: weaponImage,
        judgeWidth: 20,
        length: ['S', 72],
        z: 20,
        playerIndex,
        opacity: '0|0~20/1~999999|1',
        rotationStatic: false,
        positionStatic: false,
        imgPoint: 'null1',
        existData: [
            {
                t: ['S', cancelCode, true],
                a: ['S', '$gamePlayer.drill_ECE_endSustainingFloating();QJ.MPMZ.tl.ex_staffAlwaysVisible()'],
                p: [-1, false, true],
                d: [0, 20],
                c: ['S', 'this.time > 30']
            },
        ],
        moveF: [
            [60, 0, QJ.MPMZ.tl.ex_staffNormalAttack],
        ],
        positionSpread: 24,
    });
};

// 法杖左键攻击弹幕
QJ.MPMZ.tl.ex_staffNormalAttack = function () {

    this._coolDown ??= 0;
    if (this._coolDown > 0) {
        this._coolDown -= 1;
        return;
    }

    // ==================== 计算下一次冷却时长(攻速减少冷却) ====================
    const actor = $gameParty.leader();
    const baseInterval = Math.round(90 * (1 - (actor.cnt || 0)));
    const cdReduction = this._CDReduction || 0;
    const intervalTime = Math.max(baseInterval - cdReduction, 5);

    // 任何提前返回都需要重置冷却,封装成局部函数避免重复
    const setCooldownAndExit = () => {
        this._coolDown = intervalTime;
    };
    // ==================== 输入触发判定 ====================
    const triggered = Utils.isMobileDevice()
        ? $gameMap.chahuiMapTemp?.stickAttack
        : TouchInput.drill_isLeftPressed();
    if (!triggered) return;   // 未触发不进入冷却,允许立即恢复

    // ==================== 武器与 note 解析 ====================
    const weapon = actor.equips()[0];
    const wdata = $dataWeapons[weapon.baseItemId];
    if (!wdata?.note) return setCooldownAndExit();

    const noteMatch = wdata.note.match(/<NormalAttack:([^>]+)>/i);
    if (!noteMatch) return setCooldownAndExit();

    const skillKey = String(noteMatch[1]).trim();
    if (!skillKey) return setCooldownAndExit();

    // ==================== 通过函数名查找并调用对应弹幕函数 ====================
    const fnName = `ex_${skillKey}Bullet`;
    const fn = QJ.MPMZ.tl?.[fnName];

    if (typeof fn === "function") {
        fn.call(this);
    } else {
        console.warn("[staffNormalAttack] Missing function:", fnName, "weaponId:", weapon.baseItemId);
    }
    setCooldownAndExit();
};

//弹幕爆发结算
QJ.MPMZ.tl.ex_staffMagicExplode = function() {
	
    const actor = $gameParty.leader();
    const staff = actor.equips()[0];
    if (!staff) return;

    const weaponId = staff.baseItemId;
    const weapon = $dataWeapons[weaponId];
    if (!weapon || !weapon.note) return;

    const m = weapon.note.match(/<NormalAttack:([^>]+)>/i);
    if (!m) return;

    const skillKey = String(m[1]).trim();
    if (!skillKey) return;

    const fnName = "ex_" + skillKey;
    const fn = QJ.MPMZ.tl && QJ.MPMZ.tl[fnName];

    if (typeof fn === "function") {
        return fn.call(this);
    } else {
        console.warn("[staffMagicExplode] Missing function:", fnName, "for weaponId:", weaponId);
        return;
    }
};

// 法杖右键特殊攻击
QJ.MPMZ.tl.ex_stickSpecialAttack = function () {
 
    const leader = $gameParty.leader();
    const staff = leader.equips()[0];
 
    // ==================== 装备类型校验:必须是法杖 ====================
    if (![5, 6, 7].includes(staff?.wtypeId)) return;
 
    // ==================== 解析武器特殊技能,生成回调代码 ====================
    const skillMatch = $dataWeapons[staff.baseItemId]?.note?.match(/<specialSkill:([^>]+)>/i);
    if (!skillMatch) return;
 
    const skillKey = skillMatch[1];
    const code = `QJ.MPMZ.tl.ex_${skillKey}Circle.call(this);destroyTemporaryBar(-1);`;
 
    // ==================== 防止和点击武器拦指令冲突 ====================
    if ($gameScreen.isPointerInnerPicture(74)) return;
 
    // ==================== 角色状态初始化 ====================
    $gamePlayer.drill_ECE_stopEffect();
    $gamePlayer.drill_EASe_stopAct();
    leader.addState(68);
 
    // 蓄力进度变量清零 + 创建蓄力进度条(目标值 1000)
    $gameVariables.setValue(129, 0);
    createTemporaryBar(-1, 129, 1000, { offsetY: 96, radius: 20, lineWidth: 6, shape: 'circle' });
 
    if (leader._characterName === "$player") {
        $gamePlayer.drill_EASe_setSimpleStateNode(["吟唱中"]);
    }
 
    // 持续浮空 + 粒子演出
    $gamePlayer.drill_ECE_playSustainingFloating(518400000, 30, 24, 120, 2);
    $gameScreen._particle.particleSet(0, "mahoujin_c-P", "player", "mahoujin_c");
 
    // ==================== 武器贴图与魔法阵贴图 ====================
    const weaponImage = `weapon/weaponTrail${staff.baseItemId}`;
 
    const circleMatch = $dataWeapons[staff.baseItemId]?.note.match(/<magicCircle:([^>]+)>/i);
    const magicCircle = circleMatch ? circleMatch[1] : "null1";

    // ==================== 是否有独特吟唱条件 ====================
    const chantMatch = $dataWeapons[staff.baseItemId]?.note.match(/<chantRequirements:([^>]+)>/i);
    const hasChantRequirements = chantMatch ? chantMatch[1] : false;
 
    // ==================== 锚定玩家监听器 ====================
    const playerFeet = $gameMap.getGroupBulletListQJ("playerFeet");
    const playerIndex = playerFeet.length > 0 ? playerFeet[0] : 0;

    const releaseCondition = Utils.isMobileDevice()
        ? "!$gameMap.chahuiMapTemp?.stickChargedAttack"
        : "!TouchInput.drill_isRightPressed()";    

    // ==================== 魔法阵演出 ====================
    let scale = 0.2;
    if (Utils.isMobileDevice()) {
        let time = 5000;
        scale = `0|0.2~${time}/2.8~999999|2.8`;
    }
    QJ.MPMZ.Shoot({
        groupName: ["ChantingCircle", "attackMonitoring", "weaponMarker", "playerInAir"],
        img: magicCircle,
        position: [["P"], ["P"]],
        initialRotation: ["S", 0],
        //moveType: ["D", true],
        moveType: Utils.isMobileDevice() ? ["S", 0] : ["D", true],
        opacity: "0|0~10|0~40/0.8~999999|0.8",
        scale,
        anchor: [0.5, 0.4],
        playerIndex,
        blendMode: 1,
        imgRotation: ["S", 0],
        collisionBox: ["C", 16],
        existData: [
            {
                t: ["S", releaseCondition, true],
                a: ["S", "$gamePlayer.drill_ECE_endSustainingFloating();$gameScreen._particle.particleClear('mahoujin_c-P')"],
                d: [0, 30],
                c: ["S", "this.time > 30"]
            }
        ],
        z: "E",
        moveF: [
            [10, 6, QJ.MPMZ.tl.ex_magicChantingEffect, [{hasChantRequirements}]],
            [0, 0, QJ.MPMZ.VBStickMagicCircle]
        ],
        deadJS: [code]   // 结束后触发魔法
    });
 
    // ==================== 仪式法杖演出 ====================
    QJ.MPMZ.Shoot({
        groupName: ["RitualStaff"],
        img: weaponImage,
        position: [["P"], ["P"]],
        initialRotation: ["S", 0],
        moveType: ["C", -1, [56, 12], -6],
        scale: [1, 1],
        anchor: [0.5, 1.0],
        imgRotation: ["S", 0],
        collisionBox: ["C", 90],
        existData: [
            {
                t: ["S", releaseCondition, true],
                a: ["S", "QJ.MPMZ.tl.ex_staffAlwaysVisible()"],
                p: [-1, false, true],
                d: [0, 20],
                c: ["S", "this.time > 30"]
            }
        ],
        z: "E",
        moveJS: [
            [15, 45, 'this.changeAttribute("z",20)'],
            [45, 60, 'this.changeAttribute("z","E")']
        ]
    });
};

//吟唱中效果
QJ.MPMZ.tl.ex_magicChantingEffect = function(extra={}) {
	
    if (extra.hasChantRequirements) {
        eval(extra.hasChantRequirements);
        return;
    }

	this._chargeCounter = this._chargeCounter||0;
	
	let value = Math.floor(12 * (1 + $gameParty.leader().mev));
	this._chargeCounter += value;
	$gameVariables.setValue( 129, this._chargeCounter );
	
};

// 安卓版使用-遥控魔法阵位置
QJ.MPMZ.VBStickMagicCircle = function() {
    let argLen = arguments.length;
    let detail = arguments[argLen - 1];
    let key = argLen >= 2 ? arguments[0] : 'ok';
    let speed = argLen >= 3 ? arguments[1] : 4;
    let growthRate = argLen >= 4 ? arguments[2] : 0.01;

    let stateMap = Input._currentState;
    let distMap = Input._pressDistance;
    let angleMap = Input._pressAngle;
    if (!stateMap || !stateMap[key]) return;
    if (!distMap || !(distMap[key] > 0)) return;
    if (!angleMap || angleMap[key] === undefined) return;
    let angle = angleMap[key];
    let radian = angle * Math.PI / 180;
    this.x += speed * Math.sin(radian);
    this.y -= speed * Math.cos(radian);
    this.rotationMove = angle;
};


// ============================================================
// 法杖耐久度变化/破坏
// ============================================================
QJ.MPMZ.tl.ex_consumeStaffDurability = function (damage = 0) {
    const leader = $gameParty.leader();
    const staff  = leader.equips()[0];
    // 减少法杖耐久消耗
    if (leader.hasSkill(31)) {
        const rate = Math.max(0.005, (100 - leader.skillMasteryLevel(31)) / 100);
        damage *= rate;
    }
    staff.durability -= Math.floor(damage);
    if (staff.durability <= 0) {
        $gamePlayer.drill_ECE_endSustainingFloating();
        $gameScreen._particle.particleClear('mahoujin_c-P');
        leader.removeState(65);
        leader.removeState(68);
        $gamePlayer.drill_EASA_setEnabled(true);
    
        const weaponBullets = $gameMap.getGroupBulletListQJ('playerWeaponImg');
        if (weaponBullets.length > 0) {
            const bulletId = weaponBullets[0];
            $gameMap._mapBulletsQJ[bulletId]._broken = true;
        }
    }
};

//熔岩杖:陨石术
QJ.MPMZ.tl.ex_meteorStrikeCircle = function () {
 
    // 蓄力值不足直接结束
    if (!this || this._chargeCounter < 60) return;
 
    const leader = $gameParty.leader();
    const weapon = leader.equips()[0];
    // ==================== 施法音效 ====================
    AudioManager.playSe({
        name: "Magic2",
        volume: 70,
        pitch: Math.randomInt(40) + 61,
        pan: 0
    });
    // ==================== 计算魔法阵尺寸 ====================
    const baseSize = 0.2;
    const maxCorrection = 2.8;
    const correctionValue = (this._chargeCounter / 6000) * maxCorrection;
    const extraSize = (leader.mdr - 1) * 0.25;
    const finalSize = correctionValue + baseSize + extraSize;
    // ==================== 魔法阵移动类型(可触发追踪) ====================
    const circleMoveType = leader.hasSkill(41)
        ? ['TG', '"enemy"', 0.5, 2]
        : ['S', 0];
 
    // ==================== 魔法阵放置位置 ====================
    // PC 端:跟随鼠标 / 移动端:继承吟唱魔法阵坐标
    const circlePosition = Utils.isMobileDevice()
        ? [['S', this.inheritX()], ['S', this.inheritY()]]
        : [['M'], ['M']];
 
    // ==================== 唯一编组名(用于陨石追踪魔法阵) ====================
    const circleName = `meteorStrikeCircle${$gameMap.getGroupBulletListQJ('meteorStrikeCircle').length + 1}`;
 
    // ==================== 创建魔法阵弹幕 ====================
    const circle = QJ.MPMZ.Shoot({
        img: "MeteorStrikeCircle[5,15,2]",
        groupName: ['meteorStrikeCircle', 'magic', 'Circle', circleName],
        position: circlePosition,
        initialRotation: ['S', 0],
        collisionBox: ['C', 4],
        imgRotation: ['S', 0],
        scale: finalSize,
        anchor: [0.5, 0.5],
        opacity: 1,
        moveType: circleMoveType,
        blendMode: 1,
        existData: [
            { t: ['Time', 600] },
            { t: ['B', 'meteorStrikeCircle'] },
        ],
        z: "E"
    });
 
    // ==================== 计算陨石起点(随机偏移 + 高空) ====================
    if (!circle) return;
    const meteorPosX = circle.inheritX() + (Math.randomInt(600) - 300);
    const meteorPosY = circle.inheritY() - 1200;
    const circleIndex = circle.index;
    const meteorScale = circle.scaleX * 3;
 
    // ==================== 陨石速度(攻速加成) ====================
    const meteorSpeed = 6 + leader.cnt * 5;
 
    // 陨石锁定追踪魔法阵 / 否则匀速直线
    const meteorMoveType = leader.hasSkill(41)
        ? ['TB', circleName, meteorSpeed, 6]
        : ['S', meteorSpeed];
 
    // ==================== 创建陨石弹幕 ====================
    const damageCorrection = leader.mdr;
    const baseDamage = 120 + chahuiUtil.getVarianceDamage(2);
    let magicDamage = 2 * Math.floor(baseDamage * meteorScale * damageCorrection);    
    QJ.MPMZ.Shoot({
        //img: "MeteorStrike[8,6,2]",
        img: ['A', 130, -1],
        groupName: ['meteorStrikeBullet', 'magic'],
        position: [['S', meteorPosX], ['S', meteorPosY]],
        initialRotation: ['BT', circleIndex],
        //imgRotation: ['F'],
        imgRotation: ['F',-180],
        collisionBox: ['C', 40],
        scale: meteorScale,
        opacity: 1,
        anchor: [0.5, 0.3],
        moveType: meteorMoveType,
        blendMode: 0,
        existData: [
            { t: ['B', circleName] },
            { t: ['Time', 3000] },
            { t: ['BE', circleIndex] },
        ],
        z: "MF_UG",
        deadF: [[QJ.MPMZ.tl.ex_meteorStrikeBoom, [magicDamage]]],
        deadJS: [`$gameMap.bulletQJ(${circleIndex}).setDead({t:['Time',0],d:[0,30]})`]
    });
 
    // ==================== 耐久度结算 ====================
    QJ.MPMZ.tl.ex_consumeStaffDurability(magicDamage);
};


//熔岩杖:陨石冲击
QJ.MPMZ.tl.ex_meteorStrikeBoom = function (baseDamage = 100) {

    const leader = $gameParty.leader();
    // ==================== 爆炸音效 ====================
    AudioManager.playSe({
        name: "Explosion2",
        volume: 70,
        pitch: Math.randomInt(40) + 61,
        pan: 0
    });
    // ==================== 爆心位置 ====================
    const posX = this.inheritX();
    const posY = this.inheritY() + 32;
    // ==================== 火元素增幅 ====================
    let magicDamage = baseDamage;
    if (leader.hasSkill(72)) {
        magicDamage += Math.floor(baseDamage * leader.skillMasteryLevel(72) * 0.1);
    }
    // ==================== 创建爆炸判定弹幕 ====================
    QJ.MPMZ.Shoot({
        //img: "MeteorStrike_Boom[5,8,2]",
        img: ['A', 131],
        groupName: ['meteorStrikeBoom', 'magic', 'explosion', 'fire'],
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', 0],
        imgRotation: ['S', 0],
        scale: this.scaleX,
        opacity: 1,
        moveType: ['S', 0],
        anchor: [0.5, 0.52],
        collisionBox: ['R', 140, 80],
        blendMode: 0,
        damage: magicDamage,
        existData: [
            { t: ['Time', 90] },
            {
                t: ['G', ['"enemy"', '"object"', 'isExplodable']],
                a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [magicDamage, {
                    magicAttack: true,
                    noHitEffect: true,
                    noDurLoss: true,
                    specifyAddedStatus: true
                }]],
                p: [-1, true, true],c:['S','this.time < 45']
            },
            {
                t: ['B', ["Destructible"]],
                a: ['F', QJ.MPMZ.tl.ex_toBulletAttack, [magicDamage, {
                    noHitEffect: true,
                    independentAttack: true,
                    noDurLoss: true
                }]],
                p: [-1, false, true],c:['S','this.time < 45']
            },
            {
                t: ['P'],
                a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [magicDamage, 2]],
                p: [-1, true, true],c:['S','this.time < 45']
            }
        ],
        z: "MF_UG",
    });
};

//熔岩杖:焰弹冲击
QJ.MPMZ.tl.ex_fireballImpactBullet = function() {
    if (!this) return;
    const leader = $gameParty.leader();
    // 子弹起点是法杖的头部
    const angleRad = this.rotation * Math.PI / 180;
    const bulletPosX = this.inheritX() + 72 * Math.sin(angleRad);
    const bulletPosY = this.inheritY() - 72 * Math.cos(angleRad);
 
    // 子弹尺寸(火元素增幅)
    let bulletScale = 0.3 * leader.mdr;
    if (leader.hasSkill(72)) {
        bulletScale += leader.skillMasteryLevel(72) * 0.1;
    }
    const bulletSpeed = 9;
 
    const iniRotation = Utils.isMobileDevice()
        ? ['S', "Input._pressAngle['ok']?Input._pressAngle['ok']:0"]
        : ['M'];
 
    // 发射音效
    AudioManager.playSe({ name: "火炎魔法1", volume: 70, pitch: 100, pan: 0 });
 
    const onImpact = ['F', QJ.MPMZ.tl.ex_staffMagicExplode];
    const Bullet = QJ.MPMZ.Shoot({
        groupName: ['playerBullet', 'magic', 'fire'],
        img: ['A', 159, -1],
        position: [['S', bulletPosX], ['S', bulletPosY]],
        initialRotation: iniRotation,
        imgRotation: ['F', 90],
        opacity: 1,
        scale: bulletScale,
        moveType: ['S', bulletSpeed],
        blendMode: 0,
        anchor: [0.5, 0.5],
        collisionBox: ['C', 40],
        existData: [
            { t: ['R', 255], a: onImpact },
            { t: ['Time', 180] },
            { t: ['G', ['"enemy"', '"object"']], a: onImpact },
        ],
        //z: "MF_UG",
    });
 
    // 追踪效果
    if (leader.hasSkill(41) || leader.hasSkill(72)) {
        Bullet.addMoveData("F", [10, 10, QJ.MPMZ.tl.ex_projectileTrackingEffect]);
    }
 
    // ==================== 耐久度结算 ====================
    const durabilityDamage = 30 + 0.4 * chahuiUtil.getVarianceDamage(2);
    QJ.MPMZ.tl.ex_consumeStaffDurability(durabilityDamage);

};

//熔岩杖:焰弹冲击爆发
QJ.MPMZ.tl.ex_fireballImpact = function() { 
    if (!this) return;
    const leader = $gameParty.leader();
    const posX = this.inheritX();
    const posY = this.inheritY();
    const blastScale = this.scaleX * 1.5;

    // 火元素增幅
    let blastDamage = Math.floor(30 + 0.7 * chahuiUtil.getVarianceDamage(2));
    if (leader.hasSkill(72)) {
        blastDamage += Math.floor(blastDamage * leader.skillMasteryLevel(72) * 0.1);
    }

    QJ.MPMZ.Shoot({
        groupName: ['playerBullet', 'magic', 'fire'],
        img: ['A', 160],
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        opacity: 1,
        scale: blastScale,
        moveType: ['S', 0],
        blendMode: 0,
        anchor: [0.5, 0.5],
        collisionBox: ['C', 50],
        existData: [
            { t: ['Time', 58] },
                    {
                        t: ['G', ['"enemy"', '"object"']],
                a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [blastDamage, {
                    magicAttack: true,
                    noHitEffect: true,
                    noDurLoss: true,
                    specifyAddedStatus: true
                }]],
                p: [-1, true, true]
            },
            {
                t: ['B', ["Destructible"]],
                a: ['F', QJ.MPMZ.tl.ex_toBulletAttack, [blastDamage, {
                    noHitEffect: true,
                    independentAttack: true,
                    noDurLoss: true
                }]],
                p: [-1, false, true]
            },
            {
                t: ['P'],
                a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [blastDamage, 2]],
                p: [-1, true, true]
            }
        ],
        //z: "MF_UG",
    });
};	

// 星月夜:黑暗冲击
QJ.MPMZ.tl.ex_darkBlastBullet = function (extra = {}) {

    if (!this) return;

    // ============================================================
    // 子弹爆炸产生伤害判定
    // ============================================================
    if (extra.darkBlast) {
        const posX = this.inheritX();
        const posY = this.inheritY();
        const blastScale = this.scaleX * 1.5;
        const blastDamage = 20 + Math.floor(0.85 * chahuiUtil.getVarianceDamage(2));

        AudioManager.playSe({ name: "Darkness4", volume: 80, pitch: 100, pan: 0 });

        QJ.MPMZ.Shoot({
            groupName: ['playerBullet', 'magic'],
            //img: "Dark Blast[6,5,2]",
            img: ['A', 134],
            position: [['S', posX], ['S', posY]],
            initialRotation: ['M'],
            imgRotation: ['F'],
            opacity: 1,
            scale: blastScale,
            moveType: ['S', 0],
            blendMode: 0,
            anchor: [0.5, 0.5],
            collisionBox: ['C', 50],
            existData: [
                { t: ['Time', 58] },
                {
                    t: ['G', ['"enemy"', '"object"']],
                    a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [blastDamage, {
                        magicAttack: true,
                        noHitEffect: true,
                        noDurLoss: true,
                        specifyAddedStatus: true
                    }]],
                    p: [-1, true, true]
                },
                {
                    t: ['P'],
                    a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [blastDamage, 2]],
                    p: [-1, true, true]
                }
            ],
            z: "MF_UG",
        });
        return;
    }

    // ============================================================
    // 子弹发射初始化
    // ============================================================
    const leader = $gameParty.leader();

    // 子弹起点为法杖顶端
    const angleRad = this.rotation * Math.PI / 180;
    const bulletPosX = this.inheritX() + 72 * Math.sin(angleRad);
    const bulletPosY = this.inheritY() - 72 * Math.cos(angleRad);

    const bulletScale = 0.3 * leader.mdr;
    const bulletSpeed = 9;
    const iniRotation = Utils.isMobileDevice()
        ? ['S', "Input._pressAngle['ok']?Input._pressAngle['ok']:0"]
        : ['M'];

    AudioManager.playSe({ name: "Darkness3", volume: 60, pitch: 120, pan: 0 });

    // 触发并调用
    const onImpact = ['F', QJ.MPMZ.tl.ex_darkBlastBullet, [{ darkBlast: true }]];

    const Bullet = QJ.MPMZ.Shoot({
        groupName: ['playerBullet', 'magic'],
        //img: "Dark Blast_Bullet[7,2,3]",
        img: ['A', 133, -1],
        position: [['S', bulletPosX], ['S', bulletPosY]],
        initialRotation: iniRotation,
        imgRotation: ['F'],
        opacity: 1,
        scale: bulletScale,
        moveType: ['S', bulletSpeed],
        blendMode: 0,
        anchor: [0.5, 0.5],
        collisionBox: ['C', 40],
        existData: [
            { t: ['R', 255], a: onImpact },
            { t: ['Time', 300] },
            { t: ['G', ['"enemy"', '"object"']], a: onImpact },
        ],
        z: "MF_UG",
    });

    // 追踪效果
    if (leader.hasSkill(41)) {
        Bullet.addMoveData("F", [10, 10, QJ.MPMZ.tl.ex_projectileTrackingEffect]);
    }

    // ==================== 耐久度结算 ====================
    const durabilityDamage = Math.floor(0.65 * chahuiUtil.getVarianceDamage(2));
    QJ.MPMZ.tl.ex_consumeStaffDurability(durabilityDamage);
};

// 黑洞魔法
QJ.MPMZ.tl.ex_blackHoleCircle = function (extra = {}, args) {

    // ============================================================
    // 黑洞吸引效果
    // ============================================================
    if (extra.blackHoleEffects) {
        const target = args?.target;
        if (!(target instanceof Game_Event) && !(target instanceof Game_Player)) return;

        // 敌人保留不动抗性判定，玩家不受此限制。
        if (target instanceof Game_Event) {
            const eventId = target._eventId;
            const fudou = $gameSelfVariables.value([$gameMap.mapId(), eventId, 'fudou']);
            if (!$gameMap.event(eventId) || fudou > 45) return;
        }

        // 按实际受击框中心计算方向，包含目标的碰撞框偏移。
        const targetX = target.screenBoxXShowQJ();
        const targetY = target.screenBoxYShowQJ();
        const posX = this.inheritX();
        const posY = this.inheritY();
        const angle = QJ.calculateAngleByTwoPointAngle(targetX, targetY, posX, posY);
        if (Number.isNaN(angle)) return;

        if (target instanceof Game_Event && extra.blackHoleExplosion) {
            // 黑洞坍缩时，敌人仍按原规则反向击退。
            if (this.time < 20 && !target.isJumping()) {
                const oppositeAngle = ((angle % 360) + 180) % 360;
                const distance = 1.5 * this.scaleX;
                QJ.MPMZ.tl.ex_jumpWithAngle(target._eventId, oppositeAngle, distance);
            }
            return;
        }

        // 每次最多吸引 16 像素，不依赖目标移速；接近中心时缩短距离。
        const distance = Math.min(16, Math.hypot(posX - targetX, posY - targetY)) / $gameMap.tileWidth();
        target.mover().dotMoveByDeg(new DotMoveSystem.Degree(angle), distance);
        target._dotMovingCounter = 5;
        return;
    }
    // ============================================================
    // 黑洞爆炸
    // ============================================================
    if (extra.blackHoleExplosion) {
        const posX = this.inheritX();
        const posY = this.inheritY();
        const magicDamage = 
        QJ.MPMZ.Shoot({
            img: ['A', 210],
            groupName: ['blackHole', 'magic'],
            position: [['S', posX], ['S', posY]],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            collisionBox:['C', 55], 
            scale: this.data.magicScaleX,
            anchor: [0.5, 0.5],
            opacity: 1,
            moveType: ['S', 0],
            existData: [
                { t: ['AE']},
                {
                    t: ['G', ['"enemy"', '"object"']],
                    a: ['F', QJ.MPMZ.tl.ex_blackHoleCircle, [{blackHoleEffects:true, blackHoleExplosion:true}]],
                    p: [-1, false, true],
                    c: ['T', 1, 1, true]
                },
                // 每 10 帧对中央 70x50 区域内的敌人/物体造成伤害
                {
                    t: ['G', ['"enemy"', '"object"']],
                    a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [this.data.explosionDamage, {
                        magicAttack: true,
                        noHitEffect: true,
                        noDurLoss: true,
                        specifyAddedStatus: true
                    }]],
                    p: [-1, false, true],
                    cb: ['R', 70, 50]
                },
                // 每帧吸引玩家(玩家也会被自己的黑洞吸引)
                {
                    t: ['P'],
                    a: ['F', QJ.MPMZ.tl.ex_blackHoleCircle, [{blackHoleEffects:true, blackHoleExplosion:true}]],
                    p: [-1, false, true],
                    c: ['T', 1, 1, true]
                },
                {
                    t: ['P'],
                    a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [this.data.explosionDamage, 2]],
                    p: [-1, false, true],
                    cb: ['R', 70, 50]
                }                
            ],
            z: "MF_BG",
        });        
        return;
    }
    // ============================================================
    // 施法初始化
    // ============================================================
    if (!this || this._chargeCounter < 60) return;
    const leader = $gameParty.leader();

    // ==================== 施法音效 ====================
    AudioManager.playSe({
        name: "Magic2",
        volume: 70,
        pitch: Math.randomInt(40) + 61,
        pan: 0
    });

    // ==================== 计算黑洞尺寸 ====================
    const baseSize = 0.3;
    const maxCorrection = 3;
    const correctionValue = (this._chargeCounter / 5000) * maxCorrection;
    const extraSize = (leader.mdr - 1) * 0.25;
    const finalSize = correctionValue + baseSize + extraSize;

    // ==================== 黑洞放置位置(PC 跟鼠标 / 移动端跟弹幕) ====================
    const circlePosition = Utils.isMobileDevice()
        ? [['S', this.inheritX()], ['S', this.inheritY()]]
        : [['M'], ['M']];

    // ==================== 创建黑洞魔法阵演出 ====================
    const circle = QJ.MPMZ.Shoot({
        img: "blackHoleCircle[5,5,5]",
        groupName: ['blackHole', 'magic', 'Circle'],
        position: circlePosition,
        initialRotation: ['S', 0],
        collisionBox: ['C', 4],
        imgRotation: ['F'],
        scale: finalSize,
        anchor: [0.5, 0.5],
        opacity: 1,
        moveType: ['S', 0],
        blendMode: 1,
        existData: [
            { t: ['Time', 1], d: [1, 120, 0.01] },
        ],
        z: "MF_BG",
    });
    
    // ==================== 计算黑洞主弹幕参数 ====================
    if (!circle) return;
    const posX = circle.inheritX();
    const posY = circle.inheritY();
    const magicScaleX = circle.scaleX * 2;
    const magicScaleY = magicScaleX * 0.7;
    const baseDamage = 1 + (0.14 * chahuiUtil.getVarianceDamage(2));
    const magicDamage = Math.floor(baseDamage * magicScaleX);
    const explosionDamage = 12 * magicDamage;
    let time = 210;

    // 暗黑魔法叠加音效
    AudioManager.playSe({ name: "暗黒魔法", volume: 100, pitch: 100, pan: 0 });

    // ==================== 创建黑洞主弹幕(吸引 + 持续伤害) ====================
    QJ.MPMZ.Shoot({
        //img: "MNT_death[5,20,3]",
        img: ['A', 209, -1],
        groupName: ['blackHoleBullet', 'magic'],
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        collisionBox:['C', 55], 
        //scale: magicScaleX,
        scale: `0|0~40/${magicScaleX}~9999|${magicScaleX}`,
        opacity: 1,
        magicScaleX,
        explosionDamage,
        anchor: [0.5, 0.5],
        moveType: ['S', 0],
        blendMode: 0,
        existData: [
            { t: ['Time', time], a: ['F', QJ.MPMZ.tl.ex_blackHoleCircle, [{blackHoleExplosion:true}]]},
            // 每帧吸引敌人/物体(自递归调用模式 A)
            {
                t: ['G', ['"enemy"', '"object"']],
                a: ['F', QJ.MPMZ.tl.ex_blackHoleCircle, [{blackHoleEffects:true}]],
                p: [-1, false, true],
                c: ['T', 1, 1, true]
            },
            // 每 10 帧对中央 70x50 区域内的敌人/物体造成伤害
            {
                t: ['G', ['"enemy"', '"object"']],
                a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [magicDamage, {
                    magicAttack: true,
                    noHitEffect: true,
                    noDurLoss: true,
                    specifyAddedStatus: true
                }]],
                p: [-1, false, true],
                c: ['T', 10, 10, true],
                cb: ['R', 70, 50]
            },
            // 每帧吸引玩家(玩家也会被自己的黑洞吸引)
            {
                t: ['P'],
                a: ['F', QJ.MPMZ.tl.ex_blackHoleCircle, [{blackHoleEffects:true}]],
                p: [10, false, true],
                c: ['T', 10, 10, true]
            },
            {
                t: ['P'],
                a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [magicDamage, 2]],
                p: [-1, false, true],
                c: ['T', 10, 10, true],
                cb: ['R', 70, 50]
            }
        ],
        z: "MF_BG",
    });

    // ==================== 耐久度结算 ====================
    const durabilityDamage = 25 * magicDamage;
    QJ.MPMZ.tl.ex_consumeStaffDurability(durabilityDamage);
};

// 灭虫魔法
QJ.MPMZ.tl.ex_exterminationMagicBullet = function (extra = {}, args) {

    // ============================================================
    // 火源引爆：以被点燃的雾团为入口，聚合并消耗附近的法杖毒雾。
    // ============================================================
    if (extra.poisonMistIgnition) {
        if (!(this instanceof Game_QJBulletMZ) || this.dead || this._poisonMistIgniting) return;
        const fire = args && args.bulletTarget;
        if (!(fire instanceof Game_QJBulletMZ)) return;

        const searchRadius = 144;
        const radiusSquared = searchRadius * searchRadius;
        const originX = this.x;
        const originY = this.y;
        const mapPixelWidth = $gameMap.width() * (QJ.tileSize || 48);
        const mapPixelHeight = $gameMap.height() * (QJ.tileSize || 48);
        const mistIds = $gameMap.getGroupBulletListQJ('poisonMist');
        const consumed = [];
        let offsetXTotal = 0;
        let offsetYTotal = 0;

        for (const id of mistIds) {
            const mist = $gameMap.bulletQJ(Number(id));
            if (
                !(mist instanceof Game_QJBulletMZ) ||
                mist.dead || mist.deadOver || mist._poisonMistIgniting
            ) continue;

            let dx = mist.x - originX;
            let dy = mist.y - originY;
            if ($gameMap.isLoopHorizontal() && mapPixelWidth > 0) {
                dx -= Math.round(dx / mapPixelWidth) * mapPixelWidth;
            }
            if ($gameMap.isLoopVertical() && mapPixelHeight > 0) {
                dy -= Math.round(dy / mapPixelHeight) * mapPixelHeight;
            }
            if (dx * dx + dy * dy > radiusSquared) continue;

            mist._poisonMistIgniting = true;
            consumed.push(mist);
            offsetXTotal += dx;
            offsetYTotal += dy;
        }

        // 极端情况下分组表尚未刷新，至少仍要消耗并引爆入口雾团。
        if (consumed.length === 0) {
            this._poisonMistIgniting = true;
            consumed.push(this);
        }

        const count = consumed.length;
        const centerMapX = originX + offsetXTotal / count;
        const centerMapY = originY + offsetYTotal / count;
        const centerX = centerMapX - $gameMap.displayX() * (QJ.tileSize || 48);
        const centerY = centerMapY - $gameMap.displayY() * (QJ.tileSize || 48);
        // 1枚约1.25倍，数量越多爆炸越大；平方根增长并限制最大规模。
        const explosionScale = Math.min(3.2, 0.9 + Math.sqrt(count) * 0.35);

        // 先锁定整个雾群，防止同一火源在同一帧制造重复爆炸。
        QJ.MPMZ.tl.ex_bombFiendSoul.call(this, centerX, centerY, {
            posFix: true,
            scaleFix: explosionScale
        });

        for (const mist of consumed) {
            // 当前函数由 setDead(detail) 的碰撞动作调用，不能在外层
            // setDead 尚未返回时再次同步销毁当前子弹；留到下一帧
            // updateJSAndQT 的安全退出点统一处理。
            mist._poisonMistConsumePending = true;
        }
        return;
    }

    // ============================================================
    // 毒雾伤害：逐帧接受 QJ 碰撞，再按“本雾团 × 本目标”控制冷却。
    // 这样高速飞行时不会漏掉目标，停留时仍只会每30帧伤害一次。
    // ============================================================
    if (extra.poisonMistDamage) {
        const target = args && args.target;
        if (!(target instanceof Game_Event)) return;

        const eventId = target._eventId;
        // 5号状态是中毒。毒有效度为0的目标对毒雾伤害完全免疫；
        // 非敌人事件会由该方法回退为1，继续保持原有 object 受伤逻辑。
        const poisonEffectiveness = Number(
            QJ.MPMZ.tl.ex_getEnemyStateEffectiveness(eventId, 5)
        );
        if (!(poisonEffectiveness > 0)) return;

        const targetKey = QJ.buildCharacter(target);
        const cooldowns = this._poisonMistDamageCooldowns ||
            (this._poisonMistDamageCooldowns = {});
        const nextDamageFrame = Number(cooldowns[targetKey]) || 0;
        if (this.time < nextDamageFrame) return;

        cooldowns[targetKey] = this.time + 30;
        QJ.MPMZ.tl.ex_toEnemyAttack.call(this, extra.magicDamage, {
            magicAttack: true,
            noHitEffect: true,
            noDurLoss: true,
            specifyAddedStatus: true,
            addedStatusType: 5,
            addedStatusChance: 1000,
            addedStatusDamage: extra.poisonDamage
        }, args);
        return;
    }

    // 冷却到期时，仅解除对应目标的 QJ 原生穿透锁。
    if (extra.poisonMistDamageCooldown) {
        if (this._poisonMistConsumePending) {
            this._poisonMistConsumePending = false;
            const particle = $gameScreen && $gameScreen._particle;
            const particleId = this.data && this.data.poisonMistParticleId;
            if (particle && particleId && particle._data[particleId]) {
                particle.particleClear(particleId, true);
            }
            if (!this.dead) this.setDead();
            return;
        }

        const cooldowns = this._poisonMistDamageCooldowns;
        if (!cooldowns) return;

        for (const targetKey of Object.keys(cooldowns)) {
            if (this.time < cooldowns[targetKey]) continue;
            for (const detail of this.data.existData) {
                if (detail.poisonMistDamageCollision && detail.havePierceCharacters) {
                    delete detail.havePierceCharacters[targetKey];
                }
            }
            delete cooldowns[targetKey];
        }
        return;
    }

    // ============================================================
    // 为单枚透明毒雾弹创建并绑定 TRP 粒子。
    // ============================================================
    if (extra.poisonMistSetup) {
        if (!(this instanceof Game_QJBulletMZ) || this.deadOver) return;
        // moveF 会在子弹构造期间先更新一次；那时子弹尚未加入地图，
        // QJBullet:index 还无法解析。只有 particleSet 真正成功后才停止重试。
        if (this.data.poisonMistParticleId) {
            if (args) args[4] = -2;
            return;
        }
        const particle = $gameScreen?._particle;
        if (!particle) return;

        const particleId = `exterminationMist_${$gameMap.mapId()}_${this.index}`;
        const particleData = particle.particleSet(
            0,
            particleId,
            `QJBullet:${this.index}`,
            "poisonMist",
            1,
            0,
            0,
            "cloud1,cloud2s,cloud2"
        );
        if (!particleData) return;

        this.data.poisonMistParticleId = particleId;
        // updateJSAndQT 会在回调返回后把 detail[1] 设为 detail[4]。
        // 将重复间隔改成 -2，即可在本次成功后永久停用该初始化回调。
        if (args) args[4] = -2;
        return;
    }

    // ============================================================
    // 毒雾弧形扇射：少量透明伤害弹幕 + TRP 高密度视觉粒子。
    // ============================================================
    if (extra.MagicThrower) {
        const bullet = $gameMap._mapBulletsQJ[extra.staff];
        if (!bullet) return;

        const leader = $gameParty.leader();
        // 以法杖顶端作为喷射起点
        const angleRad = bullet.rotation * Math.PI / 180;
        const posX = bullet.inheritX() + 72 * Math.sin(angleRad);
        const posY = bullet.inheritY() - 72 * Math.cos(angleRad);
        // ==================== 扇射参数(每次稍有随机) ====================
        const number = 2;
        const lifeTime = 180;
        const initialSpeed = 12 + Math.randomInt(8);
        // 高速喷出，约60帧内迅速减速并停留在地图上。
        const speed = `0|${initialSpeed}~12/4~24/1~24/0~999|0`;
        const angleSpread = Math.max(8, Math.floor(6 * leader.mdr));
        const bulletMin = 0.9;
        const bulletMax = 1.15;
        const magicDamage = Math.floor(1 + leader.mat * 0.04);
        const poisonDamage = 2 * magicDamage;

        const iniRotation = Utils.isMobileDevice()
            ? ['S', "Input._pressAngle['ok']?Input._pressAngle['ok']:0"]
            : ['M'];

        const poisonMistBullets = QJ.MPMZ.Shooter_ArcRange(
            iniRotation,
            {
                groupName: ['exterminationMagic', 'poisonMist'],
                position: [["S", posX], ["S", posY]],
                img: 'null1',
                opacity: 0,
                moveType: ['S', speed],
                anchor: [0.5, 0.5],
                effectDecay: 0.4,
                collisionBox: ['C', 40],
                existData: [
                    { t: ['Time', lifeTime] },
                    {
                        t: ['G', ['"enemy"']],
                        a: ['F', QJ.MPMZ.tl.ex_exterminationMagicBullet, [{
                            poisonMistDamage: true,
                            magicDamage,
                            poisonDamage
                        }]],
                        // 不使用 c:['T']：它会令碰撞本身变成每30帧抽样，
                        // 导致高速雾团从两次抽样之间穿过敌人。
                        poisonMistDamageCollision: true,
                        p: [-1, false, true]
                    },
                    {
                        // 与项目内既有 fire 分组保持一致；首次接触立即聚合引爆。
                        t: ['B', 'fire'],
                        a: ['F', QJ.MPMZ.tl.ex_exterminationMagicBullet, [{
                            poisonMistIgnition: true
                        }]],
                        p: [-1, false, true]
                    },
                    {
                        t: ['P'],
                        a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [2, 2, 5, 20]],
                        p: [-1, false, true],
                        c: ['T', 0, 30, true]
                    },
                ],
                moveF: [[
                    1,
                    0,
                    QJ.MPMZ.tl.ex_exterminationMagicBullet,
                    [{ poisonMistSetup: true }]
                ], [
                    1,
                    0,
                    QJ.MPMZ.tl.ex_exterminationMagicBullet,
                    [{ poisonMistDamageCooldown: true }]
                ]]
            },
            -angleSpread * 0.5,
            angleSpread * 1.5,
            number,
            angleSpread,
            bulletMin,
            bulletMax
        );

        // 技能41：为本轮扇射实际创建的每一枚毒雾判定弹追加统一追踪。
        if (leader.hasSkill(41)) {
            for (const mistBullet of poisonMistBullets) {
                mistBullet.addMoveData("F", [10, 10, QJ.MPMZ.tl.ex_projectileTrackingEffect]);
            }
        }
        return;
    }


    if (extra.durabilityConsumption) {
        const durabilityDamage = extra.durabilityDamage;
        QJ.MPMZ.tl.ex_consumeStaffDurability(durabilityDamage);
        return;
    }
    // ============================================================
    // 创建喷射器(绑定到当前法杖)
    // ============================================================
    if (!this) return;
    if ($gameMap.getGroupBulletListQJ('exterminationMagicController').length > 0) return;

    const staffList = $gameMap.getGroupBulletListQJ('staffAim');
    const staff = staffList[0];
    if (staff === undefined) return;   

    const releaseCondition = Utils.isMobileDevice()
        ? '!($gameMap.chahuiMapTemp && $gameMap.chahuiMapTemp.stickAttack)'
        : '!TouchInput.drill_isLeftPressed()';

    const durabilityDamage = Math.floor(20 + $gameParty.leader().mat * 0.1);

    const controller = QJ.MPMZ.Shoot({
        groupName: ['exterminationMagicController', 'magic'],
        position: [["P"], ["P"]],
        initialRotation: ['S', 0],
        moveType: ['D', true],
        anchor: [0.5, 0.5],
        imgRotation: ['S', 0],
        collisionBox: ['C', 16],
        existData: [
            { t: ['S', releaseCondition, true] },
        ],
        z: "E",
        moveF: [
            [9, 9, QJ.MPMZ.tl.ex_exterminationMagicBullet, [{ staff, MagicThrower: true }]],
            [60, 60, QJ.MPMZ.tl.ex_exterminationMagicBullet, [{ durabilityDamage, durabilityConsumption: true }]],
        ],
        deadJS: [
            `AudioManager.stopVoice(null, 5)`
        ]
    });
    if (controller) {
        AudioManager.playVoice({
            isSE: true,
            name: "スプレー噴射",
            volume: 60,
            pitch: 100,
            pan: 0
        }, true, 5);
    }
};

//寒冰杖-冰霜喷射
QJ.MPMZ.tl.ex_frostFlameBullet = function(extra={}, args) {

    // ============================================================
    // 为单枚透明冰焰判定弹创建并绑定蓝色 TRP 粒子。
    // ============================================================
    if (extra.frostFlameParticleSetup) {
        if (!(this instanceof Game_QJBulletMZ) || this.deadOver) return;
        if (this.data.frostFlameParticleId) {
            if (args) args[4] = -2;
            return;
        }

        const particle = $gameScreen?._particle;
        if (!particle) return;

        const particleId = `frostFlame_${$gameMap.mapId()}_${this.index}`;
        const particleData = particle.particleSet(
            0,
            particleId,
            `QJBullet:${this.index}`,
            "frostFlameMist",
            1,
            0,
            0,
            "smog1,smog2,cloud2s,cloud2"
        );
        if (!particleData) return;

        this.data.frostFlameParticleId = particleId;
        // 构造期间 QJ 弹幕还没有可解析的 index，因此只在成功后停用重试。
        if (args) args[4] = -2;
        return;
    }

    // ============================================================
    // 判定弹实际速度归零后停止继续生成粒子；particleClear(false)
    // 会保留已经生成的粒子，让它们自行淡出而不是硬切视觉。
    // ============================================================
    if (extra.frostFlameParticleFade) {
        if (this._frostFlameParticleFading) {
            if (args) args[4] = -2;
            return;
        }

        // 追踪效果会临时把 moveType 换成 TG；此时应检查保存下来的原移动
        // 数据，不能把 TG 的第三项误当成 S 移动的速度状态。
        const baseMoveType = this._Tracking&&this.remMoveType
            ? this.remMoveType
            : this.data?.moveType;
        const moveData = baseMoveType?.[2];
        if (!moveData || moveData.speed > 0) return;

        const particle = $gameScreen?._particle;
        const particleId = this.data?.frostFlameParticleId;
        if (particle && particleId && particle._data[particleId]) {
            particle.particleClear(particleId, false);
        }
        this._frostFlameParticleFading = true;
        if (args) args[4] = -2;
        return;
    }

    if (extra.freezeDetection) {
        // 检测目标是否处于冻结状态来获得增伤效果
        if (args.target && args.target instanceof Game_Event) {
            let eventId = args.target._eventId;
            let baseDamage = extra.magicDamage || 0;
            if ($gameMap.getGroupBulletListQJ(`enemyFreeze${eventId}`).length > 0) baseDamage = Math.floor(baseDamage * 1.5);
            QJ.MPMZ.tl.ex_toEnemyAttack.call(this, baseDamage, {magicAttack:true,noHitEffect:true,noDurLoss:true,specifyAddedStatus:true}, args);
        }
        return;
    }

    if (extra.thrower) {
        // 喷射起点必须是法杖的头部
        const player = $gameParty.leader();
        const bullet = $gameMap._mapBulletsQJ[extra.bid];
        if (!bullet) return;
        let posX = bullet.inheritX();
        let posY = bullet.inheritY();
        posX += 66 * Math.sin(bullet.rotation * Math.PI/180);
        posY += -66 * Math.cos(bullet.rotation * Math.PI/180);

        // 少量透明判定弹负责碰撞，TRP 粒子负责视觉。相比旧版高频
        // 2~4 枚动画弹，现在低频固定2枚，显著降低弹幕对象数量。
        const number = 1 + Math.floor(player.mdr);
        const lifeTime = 90;
        const initialSpeed = 12 + Math.randomInt(6);
        // 初速高于毒雾，并在约28帧后完全归零；余下寿命用于粒子淡出。
        const speed = `0|${initialSpeed}~12/12~18/5~12/0~999|0`;
        // 比毒雾更窄、更稳定，形成聚焦且射程收敛的冰焰束。
        const angleSpread = Math.min(32, Math.floor(8 * player.mdr));
        const bulletMin = 0.8;
        const bulletMax = 1.2;
        const magicDamage = Math.floor(2 + player.mat * 0.03);

        const iniRotation = Utils.isMobileDevice()
            ? ['S', "Input._pressAngle['ok']?Input._pressAngle['ok']:0"]
            : ['M'];

        const frostFlameBullets = QJ.MPMZ.Shooter_ArcRange(iniRotation, {
            groupName: ['frostFlame'],
            position: [["S", posX], ["S", posY]],
            img: 'null1',
            opacity: 0,
            moveType: ['S', speed],
            anchor: [0.5, 0.5],
            effectDecay: 0.5,
            collisionBox: ['C', 24],
            existData: [
                { t: ['Time', lifeTime] },
                {
                    t: ['G', ['"enemy"', '"object"']],
                    a: ['F', QJ.MPMZ.tl.ex_frostFlameBullet, [{
                        magicDamage,
                        freezeDetection: true
                    }]],
                    c: ['S', 'Math.random()>0.7'],
                    // 穿透锁避免同一枚停下来的透明判定弹逐帧重复伤害。
                    p: [3, false, true]
                },
                {
                    t: ['P'],
                    a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [2, 2]],
                    p: [3, false, true]
                },
            ],
            moveF: [[
                1,
                0,
                QJ.MPMZ.tl.ex_frostFlameBullet,
                [{ frostFlameParticleSetup: true }]
            ], [
                1,
                0,
                QJ.MPMZ.tl.ex_frostFlameBullet,
                [{ frostFlameParticleFade: true }]
            ]]
        },
        -angleSpread,
        angleSpread,
        number,
        angleSpread,
        bulletMin,
        bulletMax);

        // Shooter_ArcRange 会返回本次实际创建的全部判定弹，逐枚追加统一的
        // 飞行物追踪逻辑，与其他武器/法杖弹幕保持一致。
        if (player.hasSkill(41)) {
            for (const bullet of frostFlameBullets) {
                bullet.addMoveData("F", [10, 10, QJ.MPMZ.tl.ex_projectileTrackingEffect]);
            }
        }
        return;
    }

    if (!this) return;
    let staff = $gameMap.getGroupBulletListQJ('staffAim');
    staff = staff[0];
    if (staff === undefined) return;

    let time = Math.round(90 * (1 - $gameParty.leader().cnt));
    time = Math.max(time, 5);
    QJ.MPMZ.Shoot({
        groupName: ['frostFlame', 'magic'],
        position: [["P"], ["P"]],
        initialRotation: ['S', 0],
        moveType: ['D', true],
        anchor: [0.5, 0.5],
        imgRotation: ['S', 0],
        collisionBox: ['C', 16],
        existData: [
            { t: ['Time', time] },
        ],
        moveF: [
            // 粒子承担密集视觉，因此无需再逐帧制造大量动画弹。
            [3, 3, QJ.MPMZ.tl.ex_frostFlameBullet, [{ bid: staff, thrower: true }]]
        ]
    });
    // ==================== 耐久度结算 ====================
    const durabilityDamage = 15 * Math.floor(1 + $gameParty.leader().mat * 0.03);
    QJ.MPMZ.tl.ex_consumeStaffDurability(durabilityDamage);
};

//冰封术/冰地板
QJ.MPMZ.tl.ex_frozenEarthCircle = function() {  

    // 吟唱时间不足直接结束
    if (!this || this._chargeCounter < 60) return;
    const leader = $gameParty.leader();
    // ==================== 施法音效 ====================
    AudioManager.playSe({
        name: "凍りつく時の効果音「キーーーン」",
        volume: 70,
        pitch: Math.randomInt(40) + 61,
        pan: 0
    });
    // ==================== 计算冰地板尺寸 ====================
    const baseSize = 0.25;
    const maxCorrection = 2.8;
    const correctionValue = (this._chargeCounter / 5000) * maxCorrection;
    const extraSize = (leader.mdr - 1) * 0.25;
    // 注意:原公式是先把 (蓄力修正 + 基础) 整体乘以 mdr,再加固定的 extraSize
    const circleSize = (correctionValue + baseSize) * leader.mdr + extraSize;

    // ==================== 创建演出效果魔法阵和冰地板 ====================
    const circlePosition = Utils.isMobileDevice()
        ? [['S', this.inheritX()], ['S', this.inheritY()]]
        : [['M'], ['M']];

    const circle = QJ.MPMZ.Shoot({
        img: "Frozen EarthCircle[5,8,3]",
        groupName: ['blackHole', 'magic', 'Circle'],
        position: circlePosition,
        initialRotation: ['S', 0],
        collisionBox: ['C', 4],
        imgRotation: ['F'],
        scale: circleSize,
        anchor: [0.5, 0.5],
        opacity: 1,
        moveType: ['S', 0],
        blendMode: 1,
        existData: [
            { t: ['Time', 1], d: [1, 120, 0.01] },
        ],
        z: "E"
    });      
    if (!circle) return;
    const groundPosX = circle.inheritX();
    const groundPosY = circle.inheritY() - 10;
    const groundSize = circleSize * 2.5;
    QJ.MPMZ.Shoot({
        img: 'pipofm-groundeffect10[5,4,4]',
        position: [["S", groundPosX], ["S", groundPosY]],
        initialRotation: ['S', 0],
        groupName: ['frozenEarth','magic'],
        scale: groundSize,
        opacity: 0.65,
        moveType: ['S', 0],
        z: "MF_BG",
        existData: [
            { t: ['Time', 78] },
        ],
        collisionBox: ['R', 100, 40],
        moveF: [
            [74, 999, QJ.MPMZ.tl.ex_frozenEarth]
        ]
    });    

    // ==================== 耐久度结算 ====================
    let durabilityDamage = this._chargeCounter;
    QJ.MPMZ.tl.ex_consumeStaffDurability(durabilityDamage);
};

//冰地板判定
QJ.MPMZ.tl.ex_frozenEarth = function(extra = {}, args) { 

    if (extra.disappear) {
        // 冰地板消失
        let posX = this.inheritX();
        let posY = this.inheritY();
        let magicScale = this.scaleX;
        QJ.MPMZ.Shoot({
            img:'pipofm-groundeffect10_alt[5,4,4]',
            position:[["S",posX],["S",posY]],
            initialRotation:['S',0],
            groupName:[name],
            scale:magicScale,
            opacity:0.65,
            moveType:['S',0],
            z:"MF_BG",
            existData:[
            {t:['Time',78]},
            ]
        });        
        return;
    }

     if (extra.freezeDetection) {
        // 检测敌人是否处于被冰霜喷射攻击的状态
         if (args.target && args.target instanceof Game_Event) {
             let chance = 1200;
             let eid = args.target._eventId;
             let check = QJ.MPMZ.rangeAtk([['E', eid],['E', eid]],['B','frostFlame'],[],['C',10]);
             if ( check.length > 0 ) {
                 chance = 3000;
             }
             QJ.MPMZ.tl.ex_checkAddedStatus(9, chance, undefined, args);
         }
         return;
     }

     let posX = this.inheritX();
     let posY = this.inheritY();
	 let magicScale = this.scaleX;
	 let time = 480;
	 
	 if ($gameMap.regionId( (this.x/48), (this.y/48) ) == 8) {
		 time += 1440;
	 }
	 
	 let deadTime = time - 2;
       QJ.MPMZ.Shoot({
        img:'pipofm-groundeffect10',
		position:[["S",posX],["S",posY]],
        initialRotation:['S',0],
		groupName:['frozenEarth','magic'],
        moveType:['S',0],
		scale:magicScale,
		opacity:0.65,
		z:"MF_BG",
		existData:[
            {t:['NP'],a:['F',QJ.MPMZ.tl.ex_frozenEarth, [{disappear:true}]],cb:['R',40,16]},
            {t:['Time',time]},
            {t:['P'],a:['F',QJ.MPMZ.tl.ex_slipOnIce],p:[-1,false,true,QJ.MPMZ.tl.ex_intoIceFloors,QJ.MPMZ.tl.ex_outofIceFloors],c:['T',1,2,true]},
            //{t:['G',['"enemy"']],a:['F',QJ.MPMZ.tl.ex_slipOnIce],p:[-1,false,true,QJ.MPMZ.tl.ex_intoIceFloors,QJ.MPMZ.tl.ex_outofIceFloors],c:['T',1,2,true]},
            {t:['G',['"enemy"']],a:['F',QJ.MPMZ.tl.ex_frozenEarth, [{freezeDetection:true}]],p:[-1,false,true],c:['T',20,20,true]},
        ],
        collisionBox:['R',100,40],
		anchor:[0.5,0.5],
		moveF:[[deadTime,99999,QJ.MPMZ.tl.ex_frozenEarth, [{disappear:true}]]]
    });
};

// 冰上滑行
QJ.MPMZ.tl.ex_slipOnIce = function (args) {

    const target = args?.target;
    if (!target) return;

    // 共用滑行音效
    const slipSe = { name: "Fall", volume: 50, pitch: 150, pan: 0 };

    // 角度随机系数(0.75 ~ 1.25 之间的随机数)
    const angleJitter = () => Math.random() * 0.5 + 0.75;

    // ==================== 敌人分支 ====================
    if (target instanceof Game_Event) {
        if (!target.isMoved()) return;

        const eventId = target._eventId;
        const speed = target._chasePlayer ? target._chaseSpeed : target._moveSpeed;
        const moveSpeed = target._moveSpeed;
        const chaseSpeed = target._chaseSpeed;

        // 高速 → 击飞处理  否则按当前朝向滑行
        if (chaseSpeed >= 30 || moveSpeed >= 30) {
            const baseAngle = chahuiUtil.getCharacterAngle(eventId);
            const angle = Math.round(baseAngle * angleJitter());
            const distance = speed / 6;
            QJ.MPMZ.tl.ex_jumpWithAngle(eventId, angle, distance);
        } else {
            target.moveByDirection(target.direction());
        }
        AudioManager.playSe(slipSe);
        return;
    }

    // ==================== 玩家分支 ====================
    if (target instanceof Game_Player) {
        if (!$gamePlayer.isMoved() || $gamePlayer.isJumping()) return;
        const leader = $gameParty.leader();
        // 玩家若在游泳形态,先恢复成普通形态(冰面不游泳)
        if (leader._characterName === "$player_swim") {
            $gameActors.actor(1).removeState(67);
            leader._characterName = "$player";
            $gamePlayer.refresh();
        }
        // 高速 → 击飞处理  否则按当前朝向滑行
        if ($gamePlayer.realMoveSpeed() >= 30) {
            const baseAngle = chahuiUtil.getCharacterAngle(-1);
            const angle = Math.round(baseAngle * angleJitter());
            const distance = $gamePlayer.realMoveSpeed() / 6;
            QJ.MPMZ.tl.ex_jumpWithAngle(-1, angle, distance);
        } else {
            $gamePlayer.moveByDirection($gamePlayer.direction());
        }
        AudioManager.playSe(slipSe);
    }
};

// 进入冰地板
QJ.MPMZ.tl.ex_intoIceFloors = function (target) {

    // ==================== 事件 ====================
    if (target instanceof Game_Event && target.isMoved()) {
        if (target._chaseSpeed < 24 && target._moveSpeed < 24) {
            // 备份原速度,只在第一次进入时记录
            if (!target._remSpeed) {
                target._remSpeed = target._moveSpeed;
                target._moveSpeed = 23;
            }
        }
        return;
    }

    // ==================== 玩家 ====================
    if (target instanceof Game_Player && target.isMoved()) {
        $gameMap.steupCEQJ(318, 1);

        if (target.realMoveSpeed() < 24) {
            $gameParty.leader().addState(81);
            $gamePlayer.drill_EASe_stopAct();
            target.drill_EASe_setSimpleStateNode(["虚弱"]);
        }
    }
};

// 离开冰地板
QJ.MPMZ.tl.ex_outofIceFloors = function (target) {

    // ==================== 敌人 ====================
    if (target instanceof Game_Event) {
        if (target._remSpeed) {
            target._moveSpeed = target._remSpeed;
            target._remSpeed = 0;
        }
        return;
    }

    // ==================== 玩家 ====================
    if (target instanceof Game_Player) {
        QJ.MPMZ.tl.ex_playerSwimmingCheck.call(this);
        $gameParty.leader().removeState(66);
        target.drill_EASA_setEnabled(true);
    }
};

// 水爆弹
QJ.MPMZ.tl.ex_AquaBlastCannonBullet = function(initialize) {
	
	if (initialize && initialize === "blast") {
	  let magicDamage  = this.data.damage;
      let posX         = this.inheritX();
      let posY         = this.inheritY();
	  let angle        = this.inheritRotation();
	  let magicScale   = this.scaleX;

      AudioManager.playSe({ name: "Water4", volume: 50, pitch: Math.randomInt(30) + 91, pan: 0 });	

      let Bullet = QJ.MPMZ.Shoot({
        img:"waterMine[4,2,4]",
		groupName:['playerBullet'],
        position:[['S',posX],['S',posY]],
        initialRotation:['S',angle],
        moveType:['S',7],
		z:'W',
		damage:magicDamage,
		anchor:[0.5,0.5],
		imgRotation:['S',0],
		collisionBox:['C',10],
		scale:magicScale,
        existData:[
			{t:['Time',210]},
			{t:['R',[255]],c:['S','this.time > 10']},	
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[magicDamage,{magicAttack:true,noHitEffect:true,noDurLoss:true,specifyAddedStatus:true}]]},
        ],
		deadJS:["QJ.MPMZ.tl.ex_enemy_waterMineBreak.call(this)"],
      });

        //追踪效果
	    if ($gameParty.leader().hasSkill(41) || $gameParty.leader().hasSkill(72)) {
		    Bullet.addMoveData("F",[10,10,QJ.MPMZ.tl.ex_projectileTrackingEffect]);
	     }
	  
		return;
	}
	
	if (!TouchInput.drill_isLeftPressed()) return;
	let weapon = $gameParty.leader().equips()[0];
	if (!weapon || !this) return;
		
    function randPointInCircle(cx, cy, R) {
       const a = Math.random() * Math.PI * 2;   // 随机角度
       const r = Math.sqrt(Math.random()) * R;  // 半径要开方，保证均匀分布
       const x = Math.round(cx + r * Math.cos(a));
       const y = Math.round(cy + r * Math.sin(a));
       return { x, y };
    }	
	const playerX = $gamePlayer.screenBoxXShowQJ();
	const playerY = $gamePlayer.screenBoxYShowQJ();
    const p = randPointInCircle(playerX, playerY, 75);
    let posX = p.x;
    let posY = p.y;
    let magicScale = 1 * $gameParty.leader().mdr;
	let playerIndex = this.data.playerIndex;
	// 在水域环境附近施法
	let onWater = QJ.MPMZ.tl.hitRegionAroundBullet(playerIndex, [8], 40);
	if (onWater) {
		this._CDReduction = 33;
		magicScale += 0.2 + (Math.round(Math.random() * 10) / 10);
	} else {
		this._CDReduction = 0;
	}
    let baseDamage = Math.floor(25 + (0.3 * chahuiUtil.getVarianceDamage(2)));
	let magicDamage = baseDamage * magicScale;
	
    AudioManager.playSe({ name: "Water5", volume: 50, pitch: Math.randomInt(30) + 91, pan: 0 });	
	
	let iniRotation = ['M']; 
	if (Utils.isMobileDevice())  {
		iniRotation = ['S',"Input._pressAngle['ok']?Input._pressAngle['ok']:0"];
	}	
	
    let Bullet = QJ.MPMZ.Shoot({
		groupName:['playerBullet','magic','water'],
        img:"waterMineStartUp[5,3,6]",
        position:[['S',posX],['S',posY]],
        initialRotation:iniRotation,
		imgRotation:['S',0],
		opacity:1,
        scale:magicScale,
        moveType:['S',0],
		blendMode:0,
		damage: Math.round(magicDamage),
        imgRotation:['F'],
        anchor:[0.5,0.5],
        existData:[	
		   {t:['Time',74],a:['F',QJ.MPMZ.tl.ex_AquaBlastCannonBullet,["blast"]]},
		   //{t:['R',[8]],a:['F',QJ.MPMZ.tl.ex_AquaBlastCannonBullet],p:[-1,true,true],c:['T',20,20,true],cb:['C',48]},
        ],
        z:"W",
		collisionBox:['C',1],
		moveF:[
		//[10,10,QJ.MPMZ.tl.ex_bulletTrajectoryCorrection]
		],
      });			  

    if (initialize && initialize === "noTrigger") {
		return;
	}

	// 耐久度结算
    let durabilityDamage = baseDamage;   
    if ($gameParty.leader().hasSkill(31)) {
	    let rate = (100 - $gameParty.leader().skillMasteryLevel(31)) / 100;
		rate     = Math.max(0.005, rate);		
		durabilityDamage *= rate;
	}   
	weapon.durability -= Math.floor(durabilityDamage);
	// 法杖因耐久度归零破损
	if (weapon.durability <= 0) {
		$gamePlayer.drill_ECE_endSustainingFloating();
		$gameScreen._particle.particleClear('mahoujin_c-P');
        $gameParty.leader().removeState(65);
		$gameParty.leader().removeState(68);	
        $gamePlayer.drill_EASA_setEnabled(true);		
        if ($gameMap.getGroupBulletListQJ('playerWeaponImg').length > 0) {
          let bulletId = $gameMap.getGroupBulletListQJ('playerWeaponImg')[0];
           $gameMap._mapBulletsQJ[bulletId]._broken = true;
        }		
	}
    
	// 在水域环境附近施法
	if (onWater && Math.random() > 0.7) {
		QJ.MPMZ.tl.ex_AquaBlastCannonBullet.call(this, "noTrigger")
	}
	
};

// 穿刺波纹
QJ.MPMZ.tl.ex_rippleThrustCircle = function () {

    // 蓄力不足直接退出
    if (!this || this._chargeCounter < 60) return;

    const leader = $gameParty.leader();
    const weapon = leader.equips()[0];

    // ==================== 计算魔法规模与基础伤害 ====================
    const baseSize = 1;
    const maxCorrection = 3;
    const correctionValue = (this._chargeCounter / 3000) * maxCorrection;
    const extraSize = (leader.mdr - 1) * 0.25;
    let finalSize = correctionValue + baseSize + extraSize;

    const baseDamage = 20 + (0.9 * chahuiUtil.getVarianceDamage(2));
    let magicDamage = Math.floor(baseDamage * finalSize);

    // ==================== 检测施法点是否在水域(region 8) ====================
    const mouseX = TouchInput.x / $gameScreen.zoomScale();
    const mouseY = TouchInput.y / $gameScreen.zoomScale();
    const targetTileX = Math.floor(mouseX / 48 + $gameMap.displayX());
    const targetTileY = Math.floor(mouseY / 48 + $gameMap.displayY());
    const onWater = $gameMap.regionId(targetTileX, targetTileY) === 8;

    // ==================== 水面增强:伤害 ×2.5 + 不同贴图 + 不同时序 ====================
    let img = "Magic/Water_Spell_6[15,4]";
    let lifeTime = 59;
    let damageWindow = "this.time>28 && this.time<35";
    let mAnchor = [0.5, 0.5];

    if (onWater) {
        magicDamage *= 2.5;
        finalSize += 0.5;
        img = "Magic/Water_Spell_3[12,4]";
        lifeTime = 47;
        damageWindow = "this.time>24 && this.time<32";
        mAnchor = [0.5, 0.7];
    }

    // ==================== 施法音效 ====================
    AudioManager.playSe({ name: "Water3", volume: 90, pitch: 100, pan: 0 });

    // ==================== 创建波纹弹幕 ====================
    const circlePosition = Utils.isMobileDevice()
        ? [['S', this.inheritX()], ['S', this.inheritY()]]
        : [['M'], ['M']];
    const rippleThrust = QJ.MPMZ.Shoot({
        img,
        groupName: ['rippleThrust', 'magic'],
        position: circlePosition,
        initialRotation: ['S', 0],
        imgRotation: ['F'],
        collisionBox: ['C', 30],
        scale: finalSize,
        opacity: 1,
        anchor: mAnchor,
        moveType: ['S', 0],
        blendMode: 0,
        existData: [
            { t: ['Time', lifeTime] },
            {
                t: ['G', ['"enemy"', '"object"', 'waterSpellEffective']],
                a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [magicDamage, {
                    magicAttack: true,
                    noHitEffect: true,
                    noDurLoss: true,
                    specifyAddedStatus: true
                }]],
                p: [-1, false, true],
                c: ['S', damageWindow]
            },
        ],
        z: 10,
    });

    // 水面施法额外触发炸鱼效果
    if (onWater && magicDamage > 233) {
        rippleThrust.addExistData({
            t: ['R', [8, 248]],
            a: ['F', QJ.MPMZ.tl.bombInWaterEffect],
            p: [-1, false, true],
            cb: ['C', 1],
            c: ['S', 'this.time > 40']
        });
    }

    // ==================== 耐久度结算 ====================
    let durabilityDamage = magicDamage;
    // 水面施法耐久消耗减半
    if (onWater) durabilityDamage /= 2;
    QJ.MPMZ.tl.ex_consumeStaffDurability(durabilityDamage);
};


QJ.MPMZ.tl.ex_XerisesCursedHand = function(extra={}) {

    if (extra.handEffects) {
        let result = extra.result || 1;
        let iniRotation = extra.iniRotation || 1;
        let damage = (3 * result) + Math.round(chahuiUtil.getVarianceDamage(2) * 0.01 * (2 + result * 4));	
        
        QJ.MPMZ.Laser({
            rotation: iniRotation,
            groupName: ['XerisesCursedHand'],
            judgeWidth:5,
            length:['S',420,0,[['R',[255]]]],	
            opacity: 1,
            rotationStatic:false,
            positionStatic:false,
            imgStretchMode:'C',
            imgPoint:'null1',
            judgeMode:['W',15],
            existData:[
                    { t:['Time',60] },
                    { t:['G',['"enemy"']], c:['S','!$gameMessage.isBusy()'], 
                      a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [damage,{nonPlayerDamage:true,magicAttack:true,orbitingDamage:true,noHitEffect:true,noDurLoss:true,specifyAddedStatus:true,addedStatusType:0}]],
                      p: [-1, false, true] },   			
            ],   		
            positionSpread:36
        });        
        return;
    }

	QJ.MPMZ.deleteProjectile("XerisesCursedHand",{});

   let equips = $gameParty.leader().equips();  
   let result = 0;
   
   for (let i = 0; i < equips.length; i++) {
        let item = equips[i];
        if (item && item.etypeId === 2 && item.baseItemId === 47) {
            result += 1; // 计算装备中数量
        }
    } 
	
	if (result == 0) return; 
	let iniRotation = ['M'];
	if (Utils.isMobileDevice()) {
		iniRotation = ['S',"Input._pressAngle['ok']?Input._pressAngle['ok']:0"];
	}		
	
    let XerisesCursedHand = QJ.MPMZ.Laser({
	   rotation: iniRotation,
	   groupName: ['servant','XerisesCursedHand'],
	   img:'armor/armor47',
	   judgeWidth:20,
       length:['S',32],	
	   z: 4,
	   opacity:'0|0~20/1~999999|1',
	   rotationStatic:false,
	   positionStatic:false,
	   imgPoint:'null1',
       extra: Math.randomInt(99999),
	   existData:[
            //{t:['S',cancelCode,true],a:['S','$gamePlayer.drill_ECE_endSustainingFloating();QJ.MPMZ.tl.ex_staffAlwaysVisible()'],p:[-1,false,true],d:[0,20],c:['S','this.time > 30']},   			
       ],	
       moveF: [
			[30,60,QJ.MPMZ.tl.ex_XerisesCursedHand,[{result, iniRotation, handEffects:true}]]
        ],
       moveJS: [
			[0,0,"this.data.positionSpread = 32 + 4 * Math.sin((2 * Math.PI / 60) * this.time)"],
            [60,60,'console.log(this.data.extra)']
        ],      		
	   positionSpread:32,
	});
  
};

// 爆破魔法
QJ.MPMZ.tl.castExplosionMagicEffect = function(extra={}) {
   if (extra.castWindup) {
       this._CWcoolDown = this._CWcoolDown || 0;	
       if (this._CWcoolDown > 0) {
           this._CWcoolDown -= 1;
           return;
       } 
       let posX = (this.x / 48) - 0.5;
       let posY = this.y / 48;
       this._explodeCp = this._explodeCp || 0;

       if (this._explodeCp > 2) {
           // 准备释放爆炸
           QJ.MPMZ.tl.castExplosionMagicEffect.call(this, {isExploding:true});
           this._CWcoolDown = 999;
           this.setDead({ t: ["Time", 0] });
           return;          
       }      

       let name = "explodeP" + this.data.bid + this._explodeCp;
       $gameScreen._particle.particleClear(name);
       let data = $gameScreen._particle.particleSet(0, name, 'tilemap', 'explode_cp_1', 'above', posX, posY);   
       this._explodeCp += 1;
       this._CWcoolDown = 8;
       if (this._explodeCp == 1) AudioManager.playSe({ name: "Magic1", volume: 90, pitch: 130+Math.randomInt(20), pan: 0 });
       if (this._explodeCp > 2) this._CWcoolDown += 24;
       return;
   }

   if (extra.isExploding) {
       // 爆炸效果+伤害判定
       let posX = (this.x / 48) - 0.5;
       let posY = this.y / 48;
       let name = "Exploding" + this.data.bid;
       $gameScreen._particle.particleClear(name);
       $gameScreen._particle.particleSet(0, name, 'tilemap', 'explode_cp_2', 'above', posX, posY); 
       $gameScreen.startFlash([180, 180, 180, 200], 20);
       $gameScreen.setShakeRandom();
       $gameScreen.startShake(2, 9, 20);
       // 最后的爆炸效果尾气
       name = "explodeP" + this.data.bid;
       $gameScreen._particle.particleClear(name);
       setTimeout(() => $gameScreen._particle.particleSet(0, name, 'tilemap', 'explode_cp_3', 'above', posX, posY), 300);  
       setTimeout(() => $gameScreen._particle.particleSet(0, name, 'tilemap', 'explode_cp_4', 'above', posX, posY), 400); 
       AudioManager.playSe({ name: "Explosion2", volume: 90, pitch: 90+Math.randomInt(20), pan: 0 });      

	   posX = this.inheritX();
       posY = this.inheritY();	       
       let damage = 200 + Math.randomInt(200);
       let extra = {magicAttack: true,noHitEffect:true,noDurLoss:true,specifyAddedStatus:true,addedStatusType:0};
       QJ.MPMZ.Shoot({
            //groupName: ['playerBullet'],
            position:[['S',posX],['S',posY]],
            moveType:['S',0],
            collisionBox:['C',45],
            existData:[
                {t:['Time',20]},
                {t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack,[damage,extra]],p:[3,false,true],c:['S','this.time > 10']},		
                {t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[damage,2]],p:[3,false,true],c:['S','!QJ.MPMZ.tl.ex_playerBulletPhasing() && this.time > 10']}
            ],
       });       
       return;
   }

   let posX = "$gamePlayer.screenBoxXShowQJ() - 20 + Math.randomInt(40)";
   let posY = "$gamePlayer.screenBoxYShowQJ() - 20 + Math.randomInt(40)";
   if (extra.posX && extra.posY) {
       posX = extra.posX;
       posY = extra.posY;
   }
   QJ.MPMZ.Shoot({
        img: ['A', 139],
        groupName: ['ExplosionMagic'],
        position:[['S',posX],['S',posY]],
        moveType:['S',0],
        imgRotation:['S', 0],
        bid: Math.randomInt(10000),
        existData: [ 
            {t:['AE']}
        ],
        moveF: [
            //[20,0,QJ.MPMZ.tl.castExplosionMagicEffect,[{castWindup:true}]]
        ]
   });  

};

// 死神辣椒-辣哭-喷火
QJ.MPMZ.tl.spitFireFromSpiciness = function(extra={}, args) {
    
    if (extra.hitTarget) {
      // 火焰命中判定
      let target = args.target;
      if (target && target instanceof Game_Event) {
          let damage = 20;
          let chance = 1000;
          let tarX = target.screenBoxXShowQJ();
          let tarY = target.screenBoxYShowQJ();
	      let posX = this.inheritX();
	      let posY = this.inheritY();
          let dist = Math.sqrt((tarX - posX) ** 2 + (tarY - posY) ** 2);
          damage  -= Math.floor(dist * 0.03);
          chance  -= Math.floor(dist * 2);
          let config = {nonPlayerDamage:true,magicAttack:true,orbitingDamage:true,noHitEffect:true,noDurLoss:true,specifyAddedStatus:true, addedStatusType: 8, addedStatusChance: chance, addedStatusDamage: 4};
          QJ.MPMZ.tl.ex_toEnemyAttack.call(this, damage, config, args);
      }
      return;
    }

    if (extra.spittingFire) {
        // 火焰喷射中
        let posX = "$gamePlayer.screenBoxXShowQJ()";
        let posY = "$gamePlayer.screenBoxYShowQJ()-2";   
        let deg   = this.rotationMove || 0;   
        QJ.MPMZ.Laser({
            position: [['S', posX], ['S', posY]],
            //rotationAdd:['R', 6,4],
            //rotation: ['S', deg],
            rotation: ['PD'],
            groupName: ['chiliFlameThrow'],
            img:'Magic/FX_Fire00_FlameThrower02_Loop[6,6,3]',
            judgeWidth:12,
            length:['S',600],	
            scaleX: 4,
            z: 10,
            blendMode: 1,
            opacity: 0.9,
            rotationStatic:false,
            positionStatic:false,
            judgeMode:['W',6],
            imgPoint:'null1',
            existData:[
                { t:['G',['"enemy"', '"object"']], c:['S','!$gameMessage.isBusy()'], 
                    a: ['F', QJ.MPMZ.tl.spitFireFromSpiciness, [{hitTarget:true}]], 
                    p: [-1, false, true] },
                {t:['S','$gameTemp._eventReserved', true], d:[0, 30]}   
            ],
            moveJS: [
                [0, 0, "this.data.positionSpread = 8 + 3 * Math.sin((2 * Math.PI / 10) * this.time)"],
                [20, 20, `$gameParty.leader().gainHp(-4)`],
                [40, 140, `AudioManager.playSe({name: "Onoma-Fired_Up_loop", volume: 80, pitch: 100, pan: 0});`]
            ],      		
            positionSpread: 12,
            deadJS: [
                `$gamePlayer.drill_EASA_setEnabled(true);
                Fuku_Plugins.EventTremble.stop(-1);`,
            ]
        });       
        return;
    }

    $gamePlayer.drill_EASe_stopAct();
    $gamePlayer.drill_EASe_setSimpleStateNode(["难受"]);
    Fuku_Plugins.EventTremble.start(-1, 1, 8);
    let posX = "$gamePlayer.screenBoxXShowQJ()";
    let posY = "$gamePlayer.screenBoxYShowQJ()";    
    QJ.MPMZ.Shoot({
        initialRotation: ['PD'],
        groupName: ['chiliFlameThrow'],
        img:'Magic/FX_Fire00_FlameThrower01[8,3]',
        position:[['S',posX],['S',posY]],
        moveType:['D',true],
        imgRotation:['F'],
        z: 10,
        scale: [2,5],
        blendMode: 1,
        opacity: 0.8,
        anchor: [0.5, 1],
        existData: [ 
            {t:['Time',23], a:['F',QJ.MPMZ.tl.spitFireFromSpiciness, [{spittingFire:true}]]}
        ]
    });
    // 自燃演出
    QJ.MPMZ.Shoot({
        initialRotation: ['PD'],
        groupName: ['chiliFlameThrow'],
        img:'Magic/FX_Fire00_Flame_Big[7,5,3]',
        position:[['S',posX],['S',posY]],
        moveType:['D',true],
        imgRotation:['S', 0],
        z: 10,
        scale: `0|1.5~20/1.6~20/1.5`,
        blendMode: 1,
        opacity: `0|0~60/0.5~999999|0.5`,
        anchor: [0.5, 0.75],
        existData: [
            {t:['S','$gameTemp._eventReserved', true], d:[0, 30]}   
        ]
    });    
    AudioManager.playSe({name: "Onoma-Fired_Up_start", volume: 80, pitch: 100, pan: 0});

    let time = 15;
    let stateId = 150;
    $gameParty.leader().addState(stateId);
    let target = "state" + stateId;
    if ($gameSystem.hasGameTimeEvent(target)) {
        $gameSystem.adjustGameTimeEventDelay(target, time);
    } else {
        $gameSystem.addGameTimeEvent({
            key: target,
            command: 'remove',
            delayMinutes: time,
            target: stateId,
            condition: 'true'
        });
    }    	
};

// 在地上生成水迹
QJ.MPMZ.tl.spawnWaterPuddle = function (extra = {}) {

    let posX = this.inheritX() - 16 + Math.randomInt(32);
    let posY = this.inheritY() - 16 + Math.randomInt(32);
    let img = "puddleGround" + Math.randomInt(3);
    let waterVolume = 80 + Math.randomInt(80);
    if (extra.waterVolume) waterVolume = Math.floor(extra.waterVolume);

    QJ.MPMZ.Shoot({
        img,
        groupName: ['water'],
        position: [['S', posX], ['S', posY]],
        initialRotation: ['S', Math.randomInt(360)],
        imgRotation: ['F'],
        moveType: ['S', 0],
        opacity: `0|0~30/1~999999|1`,
        anchor: [0.5,0.5], 
        collisionBox:['C', 12],
        waterVolume,
        scale: waterVolume / 100, 
        z: "E", 
        existData: [ 
            {t:['R',[5, 8, 254, 250, 255]]},
            {t:['Time', 3600], d:[0, 60]}
        ],
    });
};

// 水弹炮霰弹
QJ.MPMZ.tl.ex_WaterCannonSpreadBurstBullet = function(extra={}, args) {

    if (extra.hitEffect) {
        let posX = this.inheritX();
        let posY = this.inheritY();    
        let damage = this.data.magicDamage;
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
                {t:['AE'], a:['F', QJ.MPMZ.tl.spawnWaterPuddle]},
                {
                    t: ['G', ['"enemy"', '"object"']],
                    c: ['S', 'this.time < 12'], p: [-1, false, true],
                    a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [damage, {nonPlayerDamage: true, magicAttack:true}]]
                },
                {
                    t: ['G', ['"enemy"', '"object"']],
                    c: ['S', 'this.time < 12'], p: [-1, false, true],
                    a: ['F', QJ.MPMZ.tl.ex_WaterCannonSpreadBurstBullet, [{applyWaterlogged: true}]]
                },                
                {
                    t: ['P'],
                    c: ['S', 'this.time < 12'], p: [-1, false, true],
                    a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [damage, 2, 93, 30]]
                },               
            ],
        });	            
        return;
    }

    if (extra.applyWaterlogged) {
        let target = args.target;
        if (target && target instanceof Game_Event) {
            //target.addSpeedFactor('waterlogged', 0.9);
            QJ.MPMZ.tl.ex_enemyWaterlogged.call(target);
        }
        return;
    }

	let weapon = $gameParty.leader().equips()[0];
	if (!weapon || !this) return;

    const angleRad = this.rotation * Math.PI / 180;
    const posX = this.inheritX() + 72 * Math.sin(angleRad);
    const posY = this.inheritY() - 72 * Math.cos(angleRad);
    let count = 1;
    let magicScale = 1 * $gameParty.leader().mdr;
	let playerIndex = this.data.playerIndex;
	// 在水域环境附近施法
	let onWater = QJ.MPMZ.tl.hitRegionAroundBullet(playerIndex, [8], 40);
	if (onWater) {
		count += 3;
	} 
    let baseDamage = Math.floor(25 + (0.3 * chahuiUtil.getVarianceDamage(2)));
	let magicDamage = baseDamage * magicScale;
	
    AudioManager.playSe({ name: "Water5", volume: 50, pitch: Math.randomInt(30) + 91, pan: 0 });	
	
	let iniRotation = ['M']; 
	if (Utils.isMobileDevice())  {
		iniRotation = ['S',"Input._pressAngle['ok']?Input._pressAngle['ok']:0"];
	}	
    if (count > 1) {
        QJ.MPMZ.Shooter_ArcRange(
            iniRotation,
            {
                groupName: [],
                collisionBox: ['C', 20],
                img: ['A', 206, -1],
                moveType: ['S', '0|15~30/9~999/9'],
                position: [['S', posX], ['S', posY]],
                initialRotation: iniRotation,
                scale: magicScale,
                magicDamage,
                existData: [
                    { t: ['Time', 150], d: [0, 30] },
                    { t: ['R', [254, 255]], a: ['F', QJ.MPMZ.tl.ex_WaterCannonSpreadBurstBullet, [{hitEffect: true}]], c: ['S', 'this.time > 6'] },
                    {
                        t: ['G', ['"enemy"', '"object"', 'object']],
                        a: ['F', QJ.MPMZ.tl.ex_WaterCannonSpreadBurstBullet, [{hitEffect: true}]]
                    },
                    {
                        t: ['P'],
                        c: ['S', 'this.time > 6'],
                        a: ['F', QJ.MPMZ.tl.ex_WaterCannonSpreadBurstBullet, [{hitEffect: true}]]
                    },                
                ]
            },
            -20, 20, count, 1, 1, 1
        );  
    } else {
        QJ.MPMZ.Shoot({
            groupName: [],
            collisionBox: ['C', 20],
            img: ['A', 206, -1],
            moveType: ['S', '0|15~30/9~999/9'],
            position: [['S', posX], ['S', posY]],
            initialRotation: iniRotation,
            scale: magicScale,
            magicDamage,
            existData: [
                { t: ['Time', 150], d: [0, 30] },
                { t: ['R', [254, 255]], a: ['F', QJ.MPMZ.tl.ex_WaterCannonSpreadBurstBullet, [{hitEffect: true}]], c: ['S', 'this.time > 6'] },
                {
                    t: ['G', ['"enemy"', '"object"', 'object']],
                    a: ['F', QJ.MPMZ.tl.ex_WaterCannonSpreadBurstBullet, [{hitEffect: true}]]
                },
                {
                    t: ['P'],
                    c: ['S', 'this.time > 6'],
                    a: ['F', QJ.MPMZ.tl.ex_WaterCannonSpreadBurstBullet, [{hitEffect: true}]]
                },                
            ]
        });       
    }

    // ==================== 耐久度结算 ====================
    let durabilityDamage = baseDamage;
    QJ.MPMZ.tl.ex_consumeStaffDurability(durabilityDamage);    
};

// 水龙吟-蓄力水激光
QJ.MPMZ.tl.ex_waterChargedBeamCircle = function (extra = {}, args) {


    if (extra.checkChanting) {
        if (!this._changeMaxChargeCapacity) {
            this._changeMaxChargeCapacity = true;
            destroyTemporaryBar(-1);
            createTemporaryBar(-1, 129, 25000, { offsetY: 96, radius: 20, lineWidth: 6, shape: 'circle' });
        }

        const R  = 3;                         // 汲取半径(格)，圆形
        const cx = $gamePlayer.x;
        const cy = $gamePlayer.y;
        const ts = QJ.tileSize || 48;

        this._waterVolume = this._waterVolume || 0;

        // —— ① 地图水格(region 8)，圆形范围 ——
        let count = 0;
        for (let dy = -R; dy <= R; dy++) {
            for (let dx = -R; dx <= R; dx++) {
                if (dx*dx + dy*dy > R*R) continue;          // 圆形判定
                const tx = cx + dx, ty = cy + dy;
                if (tx < 0 || ty < 0 || tx >= $gameMap.width() || ty >= $gameMap.height()) continue;
                if ($gameMap.regionId(tx, ty) === 8) {
                    $gameScreen._particle.particleSet(0, `sp_a_${tx}_${ty}`, 'tilemap', '_auto:0:splash_cp/h', 'below', tx, ty);
                    $gameScreen._particle.particleSet(0, `sp_b_${tx}_${ty}`, 'tilemap', '_auto:1:splash_cp/h', 'below', tx, ty);
                    count++;
                }
            }
        }
        this._waterTiles = count;
        this._waterVolume += Math.floor((count * 18) * (1 + $gameParty.leader().mev));

        // —— ② 人工水域：groupName 含 'water' 的 QJ 子弹，范围内则汲取并消耗 ——
        const BULLET_VALUE = 50;             // 每颗水子弹的蓄能量
        const nameMap    = $gameMap._mapBulletsNameQJ || {};
        const waterNames = Object.keys(nameMap).filter(n => n.includes('water'));
        let   bulletCount = 0;
        if (waterNames.length > 0) {
            const indices = $gameMap.getGroupsBulletListQJ(waterNames);   // 子弹 index 列表
            for (const idx of indices) {
                const b = $gameMap._mapBulletsQJ[idx];
                if (!b || b.dead) continue;
                const btx = Math.floor(b.x / ts);          // 子弹所在格
                const bty = Math.floor(b.y / ts);
                const ddx = btx - cx, ddy = bty - cy;
                if (ddx*ddx + ddy*ddy > R*R) continue;     // 圆形范围外跳过
                // 视为水域：消耗水量
                if (b.data.waterVolume > 0) {
                    bulletCount++;
                    b.data.waterVolume -= 10;
                    if (b.data.waterVolume <= 0) {
                        b.setDead(); 
                        continue;
                    }
                    let newScale = b.data.waterVolume / 100;
                    b.changeAttribute('scale', newScale);
                }
            }
            if (bulletCount > 0) {
                this._waterVolume += Math.floor((bulletCount * BULLET_VALUE) * (1 + $gameParty.leader().mev));
            }
        }

        // 蓄能演出(水格或水子弹任一存在就播)
        if ((count > 0 || bulletCount > 0) && this.time % 70 === 11) {
            let posX = `$gamePlayer.screenBoxXShowQJ()`;
            let posY = `$gamePlayer.screenBoxYShowQJ()-77`;
            let scale = Math.floor(12 * (this._chargeCounter / 40000)) / 10;
            if (scale < 0.05) scale = 0.05;
            QJ.MPMZ.Shoot({
                img: ['A', 204],
                position: [['S',posX], ['S',posY]],
                initialRotation: ['S', 0],
                imgRotation: ['F', 270],
                hue: 180, scale, opacity: 0.8, z: "MF_UG",
                moveType: ['D', true],
                existData: [ {t:['AE']} ]
            });
        }

        this._chargeCounter = this._waterVolume;
        $gameVariables.setValue( 129, this._chargeCounter );
        return;
    }

    // ==================== 水激光 ====================
    this._chargeCounter = Math.min(this._chargeCounter, 25000);
    let scale = Math.floor(12 * (this._chargeCounter / 40000)) / 10;
    if (scale < 0.1) return;
    let posX = $gamePlayer.screenBoxXShowQJ();
    let posY = $gamePlayer.screenBoxYShowQJ() - 77; 
    let iniRotation = ['M'];

    if (Utils.isMobileDevice()) {
        const isDraggingAimStick =
            !!Input._currentState?.ok &&
            Input._pressDistance?.ok > 0 &&
            Number.isFinite(Input._pressAngle?.ok);

        let beamAngle;

        if (isDraggingAimStick) {
            // 仍在拖拽虚拟摇杆：使用摇杆角度
            beamAngle = Input._pressAngle.ok;
        } else {
            // 没有拖拽摇杆：瞄准吟唱魔法阵当前位置
            beamAngle = QJ.calculateAngleByTwoPointAngle(
                posX,
                posY,
                this.inheritX(),
                this.inheritY()
            );
        }

        iniRotation = ['S', beamAngle];
    }
    const baseDamage = 110 + (1.2 * chahuiUtil.getVarianceDamage(2));
    let magicDamage = Math.floor(baseDamage * scale);

    QJ.MPMZ.Shoot({
        img: ['A', 205],
        position: [['S',posX], ['S',posY]],
        initialRotation: iniRotation,
        imgRotation: ['F'],
        hue: 180,
        scale,
        opacity: 0.8,
        moveType: ['S', 0],
        collisionBox:['R', 150, 2200],
        anchor: [0.5, 1],
        z: "MF_UG",
        existData: [
            {t: ['Time', 125]},
            //{t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[damage, 2]],p:[-1,false,true],c:['T',0,4,true]},
            {
                t: ['G', ['"enemy"', '"object"', 'object']],
                c: ['T', 0, 4, true], p: [-1, false, true],
                a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [magicDamage, {nonPlayerDamage: true, magicAttack:true}]]
            },                
        ]
    });
    const durabilityDamage = Math.floor((this._chargeCounter / 60) + magicDamage);
    QJ.MPMZ.tl.ex_consumeStaffDurability(durabilityDamage);    
};

// 连锁闪电弹
QJ.MPMZ.tl.ex_chainLightningBullet = function (extra = {}, args) {

    if (!this) return;

    // 命中后产生雷爆，并从爆炸点连接范围内的敌人
    if (extra.chainLightning) {
        const posX = this.inheritX();
        const posY = this.inheritY();
        const blastScale = this.scaleX * 1.5;
        const rainRate = typeof hasRainParticle === "function" && hasRainParticle()
            ? 2
            : 1;
        const baseBlastDamage = 10 + Math.floor(
            0.5 * chahuiUtil.getVarianceDamage(2)
        );
        const blastDamage = baseBlastDamage * rainRate;
        const chainDamage = Math.max(
            1,
            Math.floor(baseBlastDamage * 0.1)
        ) * rainRate;
        const chainRange = 160 * rainRate;
        const impactTarget = args?.target;

        AudioManager.playSe({ name: "Thunder10", volume: 80, pitch: 100, pan: 0 });

        QJ.MPMZ.Shoot({
            groupName: ['playerBullet', 'magic', 'lightning'],
            img: ['A', 219], // 暂用黑暗冲击的雷爆占位图
            position: [['S', posX], ['S', posY]],
            initialRotation: ['S', 0],
            imgRotation: ['S', 0],
            opacity: 1,
            scale: blastScale,
            moveType: ['S', 0],
            blendMode: 1,
            anchor: [0.5, 0.5],
            collisionBox: ['C', 50],
            existData: [
                { t: ['Time', 58] },
                {
                    t: ['G', ['"enemy"', '"object"']],
                    a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [blastDamage, {
                        magicAttack: true,
                        noHitEffect: true,
                        noDurLoss: true,
                        specifyAddedStatus: true,
                        addedStatusType: 7,
                        addedStatusChance: 1000
                    }]],
                    p: [-1, true, true]
                },
                {
                    t: ['P'],
                    a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [blastDamage, 2]],
                    p: [-1, true, true]
                }
            ],
            z: 10,
        });

        // 将爆炸点本身作为连锁起点。即使命中玩家、地形或物体，
        // 只要附近存在敌人，也能生成第一段闪电链。
        const chainOrigin = {
            _eventId: 0,
            screenBoxXShowQJ: () => posX,
            screenBoxYShowQJ: () => posY
        };
        const impactTargetId = impactTarget instanceof Game_Event &&
            impactTarget._groupListQJ?.includes('"enemy"')
            ? impactTarget._eventId
            : 0;
        const connectedIds = new Set();
        const chainStack = [chainOrigin];

        while (chainStack.length > 0) {
            const current = chainStack[chainStack.length - 1];
            const centerX = current.screenBoxXShowQJ();
            const centerY = current.screenBoxYShowQJ();
            const targets = QJ.MPMZ.rangeAtk(
                [['S', centerX], ['S', centerY]],
                ['G', ['"enemy"', '"object"']],
                [],
                ['C', chainRange]
            ).filter(target => !connectedIds.has(target._eventId));

            if (targets.length === 0) {
                chainStack.pop();
                continue;
            }

            targets.sort((a, b) => {
                // 直接命中的敌人优先成为爆炸点连接的第一名目标。
                if (current === chainOrigin && impactTargetId > 0) {
                    if (a._eventId === impactTargetId) return -1;
                    if (b._eventId === impactTargetId) return 1;
                }
                const distanceA = (a.screenBoxXShowQJ() - centerX) ** 2
                    + (a.screenBoxYShowQJ() - centerY) ** 2;
                const distanceB = (b.screenBoxXShowQJ() - centerX) ** 2
                    + (b.screenBoxYShowQJ() - centerY) ** 2;
                return distanceA - distanceB;
            });

            const target = targets[0];
            const sourceId = current._eventId || 0;
            const targetId = target._eventId;
            const sourceX = sourceId > 0
                ? `$gameMap.event(${sourceId})?.screenBoxXShowQJ() ?? 0`
                : posX;
            const sourceY = sourceId > 0
                ? `$gameMap.event(${sourceId})?.screenBoxYShowQJ() ?? 0`
                : posY;
            const targetX = `$gameMap.event(${targetId})?.screenBoxXShowQJ() ?? 0`;
            const targetY = `$gameMap.event(${targetId})?.screenBoxYShowQJ() ?? 0`;

            QJ.MPMZ.Laser({
                groupName: ['playerBullet', 'magic', 'lightningChain'],
                img: "MSE/lightning_1[9,1,2]",
                imgStretchMode: 'C',
                imgPoint: 'null1',
                position: [['S', sourceX], ['S', sourceY]],
                rotation: ['PO', [['S', targetX], ['S', targetY]]],
                length: ['D', ['S', sourceX], ['S', sourceY],
                    ['S', targetX], ['S', targetY]],
                judgeWidth: 10,
                judgeMode: ['W', 3],
                blendMode: 1,
                scaleX: 1,
                hue: 133,
                opacity: '0|1~12/1~18/0',
                rotationStatic: false,
                positionStatic: false,
                positionSpread: 0,
                existData: [
                    { t: ['Time', 18] },
                    {
                        t: ['G', '"enemy"'],
                        a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [chainDamage, {
                            immuneItself: sourceId,
                            magicAttack: true,
                            orbitingDamage: true,
                            noHitEffect: true,
                            noDurLoss: true,
                            specifyAddedStatus: true,
                            addedStatusType: 7,
                            addedStatusChance: 400   
                        }]],
                        p: [-1, false, true]
                    }
                ],
                z: 10,
            });

            connectedIds.add(targetId);
            chainStack.push(target);
        }
        return;
    }

    // 闪电球发射模板与黑暗冲击相同
    const leader = $gameParty.leader();
    const angleRad = this.rotation * Math.PI / 180;
    const bulletPosX = this.inheritX() + 72 * Math.sin(angleRad);
    const bulletPosY = this.inheritY() - 72 * Math.cos(angleRad);
    const bulletScale = 0.3 * leader.mdr;
    const bulletSpeed = 9;
    const iniRotation = Utils.isMobileDevice()
        ? ['S', "Input._pressAngle['ok']?Input._pressAngle['ok']:0"]
        : ['M'];

    AudioManager.playSe({ name: "Thunder9", volume: 60, pitch: 120, pan: 0 });

    const onImpact = ['F', QJ.MPMZ.tl.ex_chainLightningBullet, [{ chainLightning: true }]];
    const Bullet = QJ.MPMZ.Shoot({
        groupName: ['playerBullet', 'magic', 'lightning'],
        img: ['A', 218, -1],
        position: [['S', bulletPosX], ['S', bulletPosY]],
        initialRotation: iniRotation,
        imgRotation: ['F'],
        opacity: 1,
        scale: bulletScale,
        moveType: ['S', bulletSpeed],
        blendMode: 0,
        anchor: [0.5, 0.5],
        collisionBox: ['C', 40],
        existData: [
            { t: ['R', [254, 255]], a: onImpact },
            { t: ['Time', 180] },
            { t: ['G', ['"enemy"', '"object"']], a: onImpact },
            { t: ['P'], a: onImpact }
        ],
        z: 10,
    });

    if (leader.hasSkill(41)) {
        Bullet.addMoveData("F", [10, 10, QJ.MPMZ.tl.ex_projectileTrackingEffect]);
    }
    // ==================== 耐久度结算 ====================
    const durabilityDamage = Math.floor(0.5 * chahuiUtil.getVarianceDamage(2));
    QJ.MPMZ.tl.ex_consumeStaffDurability(durabilityDamage);
};

//=============================================================================
// 天罡雷云
//=============================================================================
(() => {
    "use strict";

    // 仅覆盖天罡雷云的闪电素材，不改变 thunder_w/thunder_w2
    // 在其他技能中的默认配置。每次放电从其中随机选择一张。
    const THUNDER_PARTICLE_IMAGES = "thunder3,thunder2,thunder1_2";

    // 四层共用 cloud_w，通过尺寸、区域和明暗差异表现云层厚度。
    // 粒子出生时立即具有基础透明度，否则发射器移动后，新位置只有
    // 尚未淡入的透明粒子，会短暂透出地图背景。
    // 所有节点参数必须使用字符串；速度节点不能从 0 过渡到非零，
    // 否则 PIXI particles 会在标准化零向量时产生 NaN 坐标。
    const PARTICLE_LAYERS = [
        {
            suffix: "outer",
            z: 1,
            flashRate: 0.35,
            prewarm: 4.5,
            params: [
                ["rect", "-100", "-40", "200", "80"],
                ["lifetime", "2.4", "3.2"],
                ["frequency", "0.28"],
                ["maxParticles", "24"],
                ["particlesPerWave", "1"],
                ["emitterLifetime", "-1"],
                ["scale", "1.5@0", "1.78@0.32", "1.68@1"],
                ["minimumScaleMultiplier", "0.88"],
                ["alpha", "0.12@0", "0.26@0.12", "0.26@0.62", "0@1"],
                ["speed", "0.08@0", "0.16@1"],
                ["minimumSpeedMultiplier", "0.8"],
                ["color", "#d2d8e0@0", "#b8c1cd@1"],
                ["startRotation", "-180", "180"],
                ["rotationSpeed", "-0.18", "0.18"]
            ]
        },
        {
            suffix: "middle",
            z: 2,
            flashRate: 0.6,
            prewarm: 5,
            params: [
                ["rect", "-75", "-30", "150", "60"],
                ["lifetime", "2.6", "3.4"],
                ["frequency", "0.2"],
                ["maxParticles", "36"],
                ["particlesPerWave", "1"],
                ["emitterLifetime", "-1"],
                ["scale", "1.36@0", "1.66@0.32", "1.58@1"],
                ["minimumScaleMultiplier", "0.89"],
                ["alpha", "0.36@0", "0.54@0.1", "0.55@0.66", "0@1"],
                ["speed", "0.07@0", "0.14@1"],
                ["minimumSpeedMultiplier", "0.82"],
                ["color", "#8995a4@0", "#657181@1"],
                ["startRotation", "-180", "180"],
                ["rotationSpeed", "-0.14", "0.14"]
            ]
        },
        {
            suffix: "body",
            z: 3,
            flashRate: 0.85,
            prewarm: 5.5,
            params: [
                ["rect", "-55", "-20", "110", "40"],
                ["lifetime", "2.8", "3.6"],
                ["frequency", "0.15"],
                ["maxParticles", "44"],
                ["particlesPerWave", "1"],
                ["emitterLifetime", "-1"],
                ["scale", "1.2@0", "1.48@0.3", "1.42@1"],
                ["minimumScaleMultiplier", "0.91"],
                ["alpha", "0.48@0", "0.66@0.08", "0.67@0.7", "0@1"],
                ["speed", "0.06@0", "0.12@1"],
                ["minimumSpeedMultiplier", "0.84"],
                ["color", "#687484@0", "#4b5665@1"],
                ["startRotation", "-180", "180"],
                ["rotationSpeed", "-0.11", "0.11"]
            ]
        },
        {
            suffix: "core",
            z: 4,
            flashRate: 1,
            prewarm: 5.5,
            params: [
                ["rect", "-35", "-7", "70", "26"],
                ["lifetime", "2.4", "3.2"],
                ["frequency", "0.16"],
                ["maxParticles", "38"],
                ["particlesPerWave", "1"],
                ["emitterLifetime", "-1"],
                ["scale", "1.08@0", "1.4@0.3", "1.34@1"],
                ["minimumScaleMultiplier", "0.9"],
                ["alpha", "0.58@0", "0.74@0.08", "0.76@0.68", "0@1"],
                ["speed", "0.05@0", "0.1@1"],
                ["minimumSpeedMultiplier", "0.84"],
                ["color", "#4c5766@0", "#303946@1"],
                ["startRotation", "-180", "180"],
                ["rotationSpeed", "-0.08", "0.08"]
            ]
        }
    ];

    const numberOption = (value, fallback, minimum = -Infinity) => {
        const result = Number(value);
        return Number.isFinite(result) ? Math.max(result, minimum) : fallback;
    };

    const roundDecimal = value => Math.round(value * 1000) / 1000;
    const decimalString = value => String(roundDecimal(value));

    const scaleNodeArgument = (argument, rate) => {
        const elements = String(argument).split("@");
        const value = Number(elements[0]);
        if (!Number.isFinite(value)) return String(argument);
        const result = decimalString(value * rate);
        return elements.length >= 2 ? `${result}@${elements[1]}` : result;
    };

    const chargedParticleParams = (
        params,
        areaScaleRate,
        particleScaleRate,
        densityRate,
        opacityRate,
        lifetimeRate
    ) => {
        return params.map(update => {
            const result = update.slice();
            switch (result[0]) {
            case "rect":
                for (let i = 1; i <= 4; i++) {
                    result[i] = decimalString(Number(result[i]) * areaScaleRate);
                }
                break;
            case "scale":
                for (let i = 1; i < result.length; i++) {
                    result[i] = scaleNodeArgument(result[i], particleScaleRate);
                }
                break;
            case "alpha":
                for (let i = 1; i < result.length; i++) {
                    result[i] = scaleNodeArgument(result[i], opacityRate);
                }
                break;
            case "lifetime":
                for (let i = 1; i < result.length; i++) {
                    result[i] = decimalString(Number(result[i]) * lifetimeRate);
                }
                break;
            case "frequency":
                // 寿命缩短多少，发射间隔也同比缩短。基础寿命相比
                // 长拖尾版本约减半，因此再把间隔减半，以恢复原有云团密度。
                result[1] = decimalString(
                    Number(result[1]) * lifetimeRate * 0.5 / densityRate
                );
                break;
            case "maxParticles":
                result[1] = String(Math.ceil(Number(result[1]) * densityRate));
                break;
            }
            return result;
        });
    };

    const particleSystem = () => SceneManager._scene?._particleSystem || null;

    const loopDelta = (delta, totalSize, isLoop) => {
        if (!isLoop) return delta;
        if (delta > totalSize / 2) return delta - totalSize;
        if (delta < -totalSize / 2) return delta + totalSize;
        return delta;
    };

    const cloudSprite = cloud => {
        if (!cloud || cloud.deadOver) return null;
        return $gameMap.findBulletSpriteQJ(cloud);
    };

    const createParticleLayers = (cloud, state) => {
        if (state.particlesCreated) return true;
        const sprite = cloudSprite(cloud);
        const particle = $gameScreen?._particle;
        if (!sprite || !sprite.parent || !particle) return false;

        let allCreated = true;
        for (const layer of state.layers) {
            const data = particle.particleSet(
                0,
                layer.id,
                sprite,
                "cloud_w",
                layer.config.z,
                0,
                0
            );
            if (!data) {
                allCreated = false;
                continue;
            }
            for (const update of layer.params) {
                particle.particleUpdate([layer.id, ...update]);
            }
            // 等发射器完成 W 层坐标安装后再开始产生粒子。
            data.stop = true;
        }

        state.particlesCreated = allCreated;
        return allCreated;
    };

    const cloudFadeRate = state => {
        if (state.fadeInDuration <= 0) return 1;
        const rate = Math.max(
            0,
            Math.min(1, state.fadeElapsed / state.fadeInDuration)
        );
        // smoothstep：开头和结尾都放缓，避免线性淡入显得生硬。
        return rate * rate * (3 - 2 * rate);
    };

    const updateCloudFade = state => {
        const system = particleSystem();
        if (!system) return;

        const alpha = cloudFadeRate(state);
        let applied = false;
        for (const layer of state.layers) {
            const container = system._emitters[layer.id]?._container;
            if (!container) continue;
            container.alpha = alpha;
            applied = true;
        }

        // 粒子容器尚未就绪时不消耗淡入时间，防止首次显示时发生跳变。
        if (applied && state.fadeElapsed < state.fadeInDuration) {
            state.fadeElapsed += 1;
        }
    };

    const cameraPixelPosition = (tileWidth, tileHeight) => {
        const zoom = $gameScreen.zoomScale() || 1;
        return {
            x: Math.round($gameMap._displayX * tileWidth * zoom) / zoom,
            y: Math.round($gameMap._displayY * tileHeight * zoom) / zoom
        };
    };

    const installMapScrollTracking = (
        wrapper,
        initialCameraX = null,
        initialCameraY = null
    ) => {
        const currentCamera = () => cameraPixelPosition(
            wrapper._tileWidth,
            wrapper._tileHeight
        );
        const current = currentCamera();
        const previousX = Number.isFinite(initialCameraX)
            ? initialCameraX
            : current.x;
        const previousY = Number.isFinite(initialCameraY)
            ? initialCameraY
            : current.y;
        const mapWidth = $gameMap.width() * wrapper._tileWidth;
        const mapHeight = $gameMap.height() * wrapper._tileHeight;
        const initialDx = loopDelta(
            current.x - previousX,
            mapWidth,
            $gameMap.isLoopHorizontal()
        );
        const initialDy = loopDelta(
            current.y - previousY,
            mapHeight,
            $gameMap.isLoopVertical()
        );
        if (initialDx !== 0) wrapper._emitter.shiftParticlePosX(-initialDx);
        if (initialDy !== 0) wrapper._emitter.shiftParticlePosY(-initialDy);
        if (initialDx !== 0 || initialDy !== 0) {
            wrapper._emitter.resetPositionTracking();
        }

        wrapper._heavenlyVajraLastCameraX = current.x;
        wrapper._heavenlyVajraLastCameraY = current.y;
        wrapper._followScroll = true;
        wrapper._updateFollowScroll = function () {
            const next = currentCamera();
            const dx = loopDelta(
                next.x - this._heavenlyVajraLastCameraX,
                mapWidth,
                $gameMap.isLoopHorizontal()
            );
            const dy = loopDelta(
                next.y - this._heavenlyVajraLastCameraY,
                mapHeight,
                $gameMap.isLoopVertical()
            );

            if (dx !== 0) this._emitter.shiftParticlePosX(-dx);
            if (dy !== 0) this._emitter.shiftParticlePosY(-dy);
            if (dx !== 0 || dy !== 0) this._emitter.resetPositionTracking();

            this._heavenlyVajraLastCameraX = next.x;
            this._heavenlyVajraLastCameraY = next.y;
            this._dispX = 0;
            this._dispY = 0;
            return false;
        };
    };

    const installParticleLayer = (cloud, state, layer) => {
        if (layer.ready) return true;
        const system = particleSystem();
        const particle = $gameScreen?._particle;
        const data = particle?._data[layer.id];
        const wrapper = system?._emitters[layer.id];
        const sprite = cloudSprite(cloud);
        if (!data || !wrapper || !wrapper._emitter || !sprite?.parent) return false;
        // 同名旧发射器尚未销毁时，不要把它误绑定到新雷云。
        if (wrapper._data !== data) return false;

        Game_Particle.displayObjects[layer.id] = sprite;
        wrapper.updateParams(data);
        data.pChanged = false;

        const emitter = wrapper._emitter;
        const container = wrapper._container;
        container.x = 0;
        container.y = 0;
        container.alpha = cloudFadeRate(state);
        wrapper._dispX = 0;
        wrapper._dispY = 0;
        wrapper._x = sprite.x;
        wrapper._y = sprite.y;
        wrapper._followScroll = true;
        wrapper._updatePos = true;

        emitter.cleanup();
        emitter.updateOwnerPos(sprite.x, sprite.y);
        emitter.resetPositionTracking();

        // 粒子保持在出生时的地图位置，形成短暂尾迹；这里只补偿
        // 镜头滚动，不继承雷云自身位移。寿命另外按追击速度反向缩放。
        installMapScrollTracking(wrapper);

        data.stop = false;
        data.clear = false;
        data.quit = false;
        wrapper._stop = false;
        emitter.emit = true;
        emitter._spawnTimer = 0;
        // 预生成不同年龄的粒子，让云团出现时已经具有稳定密度。
        emitter.update(layer.config.prewarm);

        layer.ready = true;
        return true;
    };

    const orderParticleLayers = (cloud, state) => {
        if (state.layersOrdered || !state.layers.every(layer => layer.ready)) return;
        const system = particleSystem();
        const sprite = cloudSprite(cloud);
        if (!system || !sprite?.parent) return;

        const wrappers = state.layers.map(layer => system._emitters[layer.id]);
        if (wrappers.some(wrapper => !wrapper?._container)) return;

        const parent = sprite.parent;
        const containers = wrappers.map(wrapper => wrapper._container);
        for (const container of containers) {
            if (container.parent === parent) parent.removeChild(container);
        }

        let index = parent.children.indexOf(sprite) + 1;
        for (const container of containers) {
            parent.addChildAt(container, Math.min(index, parent.children.length));
            index += 1;
        }
        state.layersOrdered = true;
    };

    const stopParticleEmission = state => {
        if (state.ending) return;
        state.ending = true;
        const particle = $gameScreen?._particle;
        if (!particle) return;
        for (const layer of state.layers) {
            if (particle._data[layer.id]) particle.particleClear(layer.id, false);
        }
    };

    const particleCount = state => {
        const system = particleSystem();
        if (!system) return 0;
        return state.layers.reduce((total, layer) => {
            const emitter = system._emitters[layer.id]?._emitter;
            if (!emitter) return total;
            if (typeof emitter.particleTotalCount === "function") {
                return total + emitter.particleTotalCount();
            }
            return total + (emitter.particleCount || 0);
        }, 0);
    };

    const removeLayerFlashFilter = layer => {
        const filter = layer.flashFilter;
        const container = layer.flashContainer;
        if (filter && container?.filters) {
            const filters = container.filters.filter(value => value !== filter);
            container.filters = filters.length > 0 ? filters : null;
        }
        layer.flashFilter = null;
        layer.flashContainer = null;
    };

    const clearCloudFlash = state => {
        state.flashElapsed = -1;
        for (const layer of state.layers) removeLayerFlashFilter(layer);
    };

    const cloudFlashIntensity = (elapsed, duration) => {
        if (elapsed <= 1) return 1;
        if (elapsed === 2) return 0.35;
        if (elapsed === 3) return 0.72;
        const remaining = Math.max(0, 1 - (elapsed - 3) / Math.max(1, duration - 3));
        return 0.72 * remaining * remaining;
    };

    const updateCloudFlash = state => {
        if (state.flashElapsed < 0) return;
        const system = particleSystem();
        if (!system) return;

        const intensity = cloudFlashIntensity(
            state.flashElapsed,
            state.flashDuration
        );
        let applied = false;
        for (const layer of state.layers) {
            const container = system._emitters[layer.id]?._container;
            if (!container) continue;

            if (layer.flashContainer !== container) {
                removeLayerFlashFilter(layer);
                const filter = new ColorFilter();
                const filters = container.filters ? container.filters.slice() : [];
                filters.push(filter);
                container.filters = filters;
                layer.flashFilter = filter;
                layer.flashContainer = container;
            }

            const rate = intensity * layer.config.flashRate;
            const color = state.flashColor;
            layer.flashFilter.setBlendColor([
                color[0],
                color[1],
                color[2],
                Math.round(state.flashAlpha * rate)
            ]);
            applied = true;
        }

        // 粒子层尚未创建时保留闪光请求，等容器就绪后再计时。
        if (!applied) return;
        state.flashElapsed += 1;
        if (state.flashElapsed >= state.flashDuration) clearCloudFlash(state);
    };

    const createThunderParticle = (
        particle,
        sprite,
        id,
        preset,
        midpointX,
        midpointY,
        angle,
        scale,
        alpha,
        z
    ) => {
        const data = particle.particleSet(
            0,
            id,
            sprite,
            preset,
            z,
            0,
            0,
            THUNDER_PARTICLE_IMAGES
        );
        if (!data) return false;

        // 发射器可能到下一帧才创建，先记录本帧的地图镜头位置，
        // 安装坐标补偿时即可追回这期间发生的滚动。
        const camera = cameraPixelPosition(
            $gameMap.tileWidth(),
            $gameMap.tileHeight()
        );
        data._heavenlyVajraCameraX = camera.x;
        data._heavenlyVajraCameraY = camera.y;

        const updates = [
            ["point", decimalString(midpointX), decimalString(midpointY)],
            ["lifetime", "0.12", "0.22"],
            // PIXI 发射器会在首次生成前先从 emitterLifetime 中扣除
            // frequency，因此发射时长必须略大于间隔；否则会零生成。
            // 第二次生成前发射器就会停止，maxParticles 仍限制为一根。
            ["frequency", "0.2"],
            ["spawnChance", "1"],
            ["particlesPerWave", "1"],
            ["emitterLifetime", "0.21"],
            ["maxParticles", "1"],
            [
                "scale",
                `${decimalString(scale)}@0`,
                `${decimalString(scale * 1.04)}@0.16`,
                `${decimalString(scale * 0.98)}@1`
            ],
            ["minimumScaleMultiplier", "0.94"],
            ["alpha", ...alpha],
            [
                "startRotation",
                decimalString(angle - 2),
                decimalString(angle + 2)
            ],
            ["rotationSpeed", "0", "0"],
            ["speed", "0.01@0", "0.01@1"]
        ];
        for (const update of updates) particle.particleUpdate([id, ...update]);

        // particlePlay 的一次性清理标记。参数在发射器创建前已经
        // 写入，emitterLifetime 结束且粒子存活数归零后会自动销毁。
        data.clear = true;
        data.stop = false;
        return true;
    };

    const installThunderMapTracking = (cloud, id) => {
        const particle = $gameScreen?._particle;
        const system = particleSystem();
        const data = particle?._data[id];
        const wrapper = system?._emitters[id];
        const sprite = cloudSprite(cloud);
        if (!data || !wrapper?._emitter || !sprite?.parent) return false;
        if (wrapper._data !== data) return false;
        if (wrapper._heavenlyVajraMapTracking) return true;

        Game_Particle.displayObjects[id] = sprite;
        wrapper._container.x = 0;
        wrapper._container.y = 0;
        wrapper._dispX = 0;
        wrapper._dispY = 0;
        wrapper._x = sprite.x;
        wrapper._y = sprite.y;
        wrapper._updatePos = true;
        installMapScrollTracking(
            wrapper,
            data._heavenlyVajraCameraX,
            data._heavenlyVajraCameraY
        );
        wrapper._heavenlyVajraMapTracking = true;
        return true;
    };

    const updateThunderMapTracking = (cloud, state) => {
        const particle = $gameScreen?._particle;
        if (!particle) return;
        state.strikeParticleIds = (state.strikeParticleIds || []).filter(id => {
            if (!particle._data[id]) return false;
            installThunderMapTracking(cloud, id);
            return true;
        });
    };

    const heavenlyVajraStrikeGeometry = (cloud, target, extra) => {
        if (!cloud || !target) return null;
        if (
            typeof target.screenBoxXQJ !== "function" ||
            typeof target.screenBoxYQJ !== "function"
        ) return null;

        const mapWidth = $gameMap.width() * (QJ.tileSize || $gameMap.tileWidth());
        const mapHeight = $gameMap.height() * (QJ.tileSize || $gameMap.tileHeight());
        const targetX = target.screenBoxXQJ() + numberOption(extra.targetOffsetX, 0);
        const targetY = target.screenBoxYQJ() + numberOption(extra.targetOffsetY, 0);
        const dx = loopDelta(
            targetX - cloud.x,
            mapWidth,
            $gameMap.isLoopHorizontal()
        );
        const dy = loopDelta(
            targetY - cloud.y,
            mapHeight,
            $gameMap.isLoopVertical()
        );
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 8) return null;

        const pixiAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        return {
            dx,
            dy,
            distance,
            pixiAngle,
            // QJ 的矩形长边在0度时朝上；PIXI 闪电在0度时朝右。
            qjAngle: (pixiAngle + 90 + 360) % 360,
            midpointScreenX: cloud.inheritX() + dx / 2,
            midpointScreenY: cloud.inheritY() + dy / 2
        };
    };

    const playHeavenlyVajraThunder = (cloud, state, target, extra) => {
        const particle = $gameScreen?._particle;
        const sprite = cloudSprite(cloud);
        const geometry = heavenlyVajraStrikeGeometry(cloud, target, extra);
        if (!particle || !sprite?.parent || !geometry) return [];
        const { dx, dy, distance, pixiAngle } = geometry;

        // 三张雷电素材均为 300px 宽的横向闪电；放在两点中点，
        // 按距离缩放并按标准 PIXI 角度旋转，即可连接雷云与敌人。
        const scale = Math.max(
            0.2,
            distance / 300 * numberOption(extra.thunderScale, 1.5, 0.1)
        );
        const thunderZ = numberOption(extra.thunderZ, 0);
        state.strikeSerial = (state.strikeSerial || 0) + 1;
        const baseId = `heavenly_vajra_strike_${$gameMap.mapId()}_${cloud.index}_${state.strikeSerial}`;
        // 两种预设逐次轮换，不再同时叠加，避免加法混合后
        // 多根闪电合并成宽阔的纯白光柱。
        const definitions = state.strikeSerial % 2 === 1
            ? [{
                suffix: "yellow",
                preset: "thunder_w2",
                rotation: -1,
                scale: 1.3,
                alpha: ["0.9@0", "1@0.08", "0.8@0.46", "0@1"]
            }]
            : [{
                suffix: "color",
                preset: "thunder_w",
                rotation: 1,
                scale: 1.3,
                alpha: ["0.68@0", "0.9@0.1", "0.62@0.42", "0@1"]
            }];
        const ids = [];
        for (const definition of definitions) {
            const id = `${baseId}_${definition.suffix}`;
            if (createThunderParticle(
                particle,
                sprite,
                id,
                definition.preset,
                dx / 2,
                dy / 2,
                pixiAngle + definition.rotation,
                scale * definition.scale,
                definition.alpha,
                thunderZ
            )) ids.push(id);
        }

        state.strikeParticleIds = (state.strikeParticleIds || []).filter(
            id => !!particle._data[id]
        );
        state.strikeParticleIds.push(...ids);
        return ids;
    };

    QJ.MPMZ.tl.ex_heavenlyVajraStrikeAttack = function (
        damage,
        attackData = {},
        args
    ) {
        const target = args?.target;
        const strike = this.data?.extra?.heavenlyVajraStrike;
        if (!target || !strike) return;
        if (
            typeof target.screenBoxXQJ !== "function" ||
            typeof target.screenBoxYQJ !== "function"
        ) return;

        const tileSize = QJ.tileSize || $gameMap.tileWidth();
        const dx = loopDelta(
            target.screenBoxXQJ() - strike.originX,
            $gameMap.width() * tileSize,
            $gameMap.isLoopHorizontal()
        );
        const dy = loopDelta(
            target.screenBoxYQJ() - strike.originY,
            $gameMap.height() * tileSize,
            $gameMap.isLoopVertical()
        );
        const forwardDistance = dx * strike.unitX + dy * strike.unitY;
        if (
            forwardDistance < strike.startDistance ||
            forwardDistance > strike.endDistance
        ) return;

        if (target instanceof Game_Player) {
            QJ.MPMZ.tl.ex_playerDamageCheck.call(this, damage, 2);
            return;
        }
        QJ.MPMZ.tl.ex_toEnemyAttack.call(this, damage, attackData, args);
    };

    const createHeavenlyVajraDamageBullet = (cloud, state, target, extra) => {
        const geometry = heavenlyVajraStrikeGeometry(cloud, target, extra);
        if (!geometry || state.magicDamage <= 0) return null;

        const width = numberOption(extra.hitboxWidth, 6, 1);
        // 判定不再随视觉贴图向两端等量放大。从雷云前方开始，
        // 只在攻击方向上延伸到目标后方少量距离，杜绝反向命中。
        const startDistance = Math.min(
            geometry.distance,
            numberOption(extra.hitboxStartOffset, 12, 0)
        );
        const endDistance = geometry.distance +
            numberOption(extra.hitboxEndExtension, 18, 0);
        const length = Math.max(width, endDistance - startDistance);
        const centerDistance = startDistance + length / 2;
        const unitX = geometry.dx / geometry.distance;
        const unitY = geometry.dy / geometry.distance;
        const duration = Math.round(numberOption(extra.hitboxDuration, 10, 1));
        const bullet = QJ.MPMZ.Shoot({
            img: "null1",
            opacity: 0,
            groupName: ["heavenlyVajraStrikeHitbox", "magic"],
            position: [
                ["S", cloud.inheritX() + unitX * centerDistance],
                ["S", cloud.inheritY() + unitY * centerDistance]
            ],
            initialRotation: ["S", geometry.qjAngle],
            // F 使图像旋转（也就是矩形碰撞旋转）继承 initialRotation。
            imgRotation: ["F"],
            moveType: ["S", 0],
            anchor: [0.5, 0.5],
            scale: 1,
            collisionBox: ["R", width, roundDecimal(length)],
            damage: state.magicDamage,
            extra: {
                heavenlyVajraStrike: {
                    originX: cloud.x,
                    originY: cloud.y,
                    unitX,
                    unitY,
                    startDistance,
                    endDistance
                }
            },
            existData: [
                { t: ["Time", duration] },
                {
                    t: ["G", state.enemyGroup],
                    a: [
                        "F",
                        QJ.MPMZ.tl.ex_heavenlyVajraStrikeAttack,
                        [state.magicDamage, {
                            magicAttack: true,
                            noHitEffect: true,
                            noDurLoss: true,
                            specifyAddedStatus: true,
                            addedStatusType: 7,
                            addedStatusChance: 3600

                        }]
                    ],
                    // 大正数穿透允许同一根闪电击中路径上的复数敌人；
                    // QJ 的目标记忆仍会阻止10帧内反复伤害同一名敌人。
                    p: [999999, false, true]
                },
                {
                    t: ["P"],
                    a: [
                        "F",
                        QJ.MPMZ.tl.ex_heavenlyVajraStrikeAttack,
                        [state.magicDamage, {}]
                    ],
                    // 玩家与敌人共用同一条前向范围过滤，魔法伤害类型为2。
                    p: [999999, false, true]
                }
            ],
            z: "W"
        });
        return bullet || null;
    };

    const cleanupParticles = cloud => {
        const state = cloud?._heavenlyVajraState;
        if (!state || state.cleaned) return;
        state.cleaned = true;
        clearCloudFlash(state);
        const particle = $gameScreen?._particle;
        if (!particle) return;
        for (const id of state.strikeParticleIds || []) {
            if (particle._data[id]) particle.particleClear(id, true);
        }
        state.strikeParticleIds = [];
        for (const layer of state.layers) {
            if (particle._data[layer.id]) particle.particleClear(layer.id, true);
        }
    };

    const targetPosition = (cloud, state) => {
        const tileSize = QJ.tileSize || $gameMap.tileWidth() || 48;
        let event = state.targetEventId > 0
            ? $gameMap.event(state.targetEventId)
            : null;

        if (cloud.time >= state.nextRetargetFrame || !event || event._erased) {
            state.targetEventId = QJ.MPMZ.getMinEventId(
                cloud.x,
                cloud.y,
                state.targetGroup,
                1,
                state.searchRange
            );
            state.nextRetargetFrame = cloud.time + state.retargetInterval;
            event = state.targetEventId > 0
                ? $gameMap.event(state.targetEventId)
                : null;
        }

        if (event && !event._erased) {
            return {
                x: event.screenBoxXQJ(),
                y: event.screenBoxYQJ() + state.enemyOffsetY
            };
        }

        state.targetEventId = 0;
        if (!state.returnToPlayer) return null;
        return {
            x: $gamePlayer.screenShootXQJ() + $gameMap.displayX() * tileSize,
            y: $gamePlayer.screenShootYQJ() + $gameMap.displayY() * tileSize + state.playerOffsetY
        };
    };

    const updateCloud = cloud => {
        const state = cloud._heavenlyVajraState;
        if (!state) return;

        createParticleLayers(cloud, state);
        if (state.particlesCreated) {
            for (const layer of state.layers) installParticleLayer(cloud, state, layer);
            orderParticleLayers(cloud, state);
        }
        updateThunderMapTracking(cloud, state);
        updateCloudFade(state);
        updateCloudFlash(state);

        if (!state.ending && cloud.time >= state.duration) {
            stopParticleEmission(state);
        }
        if (state.ending) {
            if (particleCount(state) <= 0 && !cloud.deadOver) cloud.setDead();
            return;
        }

        const target = targetPosition(cloud, state);
        if (!target) return;
        const dx = target.x - cloud.x;
        const dy = target.y - cloud.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= state.stopRadius || distance <= 0.001) return;

        const step = Math.min(state.speed, distance - state.stopRadius);
        cloud.x += dx / distance * step;
        cloud.y += dy / distance * step;
        if (cloud.data) cloud.data.heavenlyVajraTargetId = state.targetEventId;
    };

    const isTargetUnderCloud = (cloud, state, target) => {
        if (!cloud || !state || !target) return false;
        if (
            typeof target.eventId !== "function" ||
            typeof target.screenBoxXQJ !== "function" ||
            typeof target.screenBoxYQJ !== "function"
        ) return false;
        if (target.eventId() !== state.targetEventId) return false;

        const tileSize = QJ.tileSize || $gameMap.tileWidth();
        const mapWidth = $gameMap.width() * tileSize;
        const mapHeight = $gameMap.height() * tileSize;
        const targetX = target.screenBoxXQJ();
        const targetY = target.screenBoxYQJ();
        const hoverY = targetY + state.enemyOffsetY;
        const horizontalDistance = Math.abs(loopDelta(
            targetX - cloud.x,
            mapWidth,
            $gameMap.isLoopHorizontal()
        ));
        const hoverDistance = Math.abs(loopDelta(
            hoverY - cloud.y,
            mapHeight,
            $gameMap.isLoopVertical()
        ));
        const targetBelowDistance = loopDelta(
            targetY - cloud.y,
            mapHeight,
            $gameMap.isLoopVertical()
        );

        return targetBelowDistance > 0 &&
            horizontalDistance <= state.contactAlignmentX &&
            hoverDistance <= state.contactAlignmentY;
    };

    /**
     * QJ existData 的前置条件。未真正悬停到目标头顶时完全跳过
     * 碰撞，因此错误的侧面接触不会消耗下一次放电机会。
     */
    QJ.MPMZ.tl.ex_heavenlyVajraCanContact = function () {
        const state = this?._heavenlyVajraState;
        if (!state || state.ending || state.cleaned) return false;
        if (this.time < state.nextContactFrame) return false;

        const target = state.targetEventId > 0
            ? $gameMap.event(state.targetEventId)
            : null;
        if (!target || target._erased || !isTargetUnderCloud(this, state, target)) {
            return false;
        }

        // 自定义冷却结束后清除 QJ 对上次碰撞目标的穿透记忆，
        // 使同一名敌人可以再次触发；真正命中后才设置下一次时间。
        const detail = this.data?.existData?.find(
            value => value.heavenlyVajraContact === true
        );
        if (detail) {
            detail.havePierceCharacters = {};
            detail.pierceCharactersOutJS = {};
        }
        return true;
    };

    /**
     * 雷云与敌人接触时的放电入口。
     * 仅在当前追踪目标位于雷云正下方时触发闪光、闪电和音效。
     */
    QJ.MPMZ.tl.ex_heavenlyVajraContact = function (extra = {}, args) {
        const state = this?._heavenlyVajraState;
        if (!state || state.ending || state.cleaned) return null;

        extra = extra || {};
        const target = args?.target || null;
        if (this.time < state.nextContactFrame) return null;
        if (!isTargetUnderCloud(this, state, target)) return null;
        state.nextContactFrame = this.time + state.contactInterval;

        const color = Array.isArray(extra.color) ? extra.color : [190, 225, 255];
        state.flashColor = [
            Math.max(0, Math.min(255, Number(color[0]) || 0)),
            Math.max(0, Math.min(255, Number(color[1]) || 0)),
            Math.max(0, Math.min(255, Number(color[2]) || 0))
        ];
        state.flashAlpha = Math.min(255, numberOption(extra.alpha, 180, 0));
        state.flashDuration = Math.round(numberOption(extra.duration, 12, 4));
        state.flashElapsed = 0;

        const targetId = target && typeof target.eventId === "function"
            ? target.eventId()
            : 0;
        state.contactTargetEventId = targetId;
        if (this.data) this.data.heavenlyVajraContactTargetId = targetId;

        updateCloudFlash(state);
        const strikeIds = extra.playThunder === false
            ? []
            : playHeavenlyVajraThunder(this, state, target, extra);
        state.lastStrikeParticleIds = strikeIds;
        if (this.data) this.data.heavenlyVajraStrikeParticleIds = strikeIds.slice();

        const damageBullet = createHeavenlyVajraDamageBullet(
            this,
            state,
            target,
            extra
        );
        state.lastStrikeDamageBulletId = damageBullet?.index || 0;
        if (this.data) {
            this.data.heavenlyVajraStrikeDamageBulletId =
                state.lastStrikeDamageBulletId;
        }

        const seArray = ["Thunder1","Thunder5","Thunder6","Thunder10"];
        AudioManager.playSe({
            name: seArray[Math.randomInt(seArray.length)],
            volume: 70,
            pitch: Math.randomInt(30) + 90,
            pan: 0
        });

        return target;
    };

    /**
     * 天罡雷云。
     * 武器备注写 <specialSkill:heavenlyVajra> 即可由法杖右键吟唱调用。
     *
     * 可选 extra：
     * duration          基础持续帧数，默认 900
     * minimumCharge     最低释放充能，默认 60
     * maximumCharge     满充能数值，默认 1000
     * size              基础云团尺寸，默认 1
     * speed             基础追击速度(px/帧)，默认 1.05
     * fullChargeSizeRate  满充能尺寸倍率，默认 3
     * fullChargeSpeedRate 满充能追击速度倍率，默认 3
     * fullChargeDurationRate 满充能持续时间倍率，默认 3
     * fadeInDuration    雷云淡入时间，默认 45 帧
     * opacity           雷云整体不透明度倍率，默认 0.48
     * particleLifetimeRate 粒子寿命调整倍率，默认 1
     * contactRadius     基础触敌半径(px)，默认 120，会随充能尺寸放大
     * contactInterval   持续接触的重复触发间隔，默认 90 帧，雨天默认 60 帧
     * contactAlignmentX 目标中心与雷云的水平容差，默认 32px
     * contactAlignmentY 雷云与悬停点的垂直容差，默认 24px
     * contactFlashDuration 每次放电闪光时长，默认 12 帧
     * contactThunderScale 闪电长度缩放修正，默认 1.5
     * contactThunderZ   闪电粒子层级，默认 0（雷云层为 1~4）
     * contactHitboxWidth 闪电伤害判定宽度，默认 6px
     * contactHitboxDuration 闪电伤害判定持续时间，默认 10 帧
     * contactHitboxStartOffset 判定从雷云前方多少像素开始，默认 12
     * contactHitboxEndExtension 判定越过目标多少像素，默认 18
     * baseDamage        基础魔法伤害，默认 20+0.9倍随机伤害
     * magicDamage       直接指定最终伤害；未指定时基础伤害乘雷云尺寸倍率
     * searchRange       搜敌半径(px)，默认 720
     * enemyGroup        伤害判定 QJ 分组，默认同时包含 '"enemy"' 和 '"object"'
     * enemyOffsetY      敌人上方悬浮高度，默认 -96
     * playerOffsetY     无目标时玩家上方高度，默认 -96
     * scaleHeightWithCharge 是否随尺寸提高悬浮高度，默认 true
     * retargetInterval  重新选敌间隔，默认 15 帧
     * stopRadius        与悬浮目标的停止距离，默认 12px
     * returnToPlayer    无目标时是否返回玩家，默认 true
     * durabilityDamage  直接指定施法耐久消耗；默认随吟唱由 200 增至 600
     * replaceExisting   是否在创建时清除旧雷云，默认 false
     */
    QJ.MPMZ.tl.ex_heavenlyVajraCircle = function (extra = {}, args) {
        extra = extra || {};

        if (extra.heavenlyVajraCleanup) {
            cleanupParticles(this);
            return;
        }
        if (extra.heavenlyVajraUpdate) {
            updateCloud(this);
            return;
        }

        const minimumCharge = numberOption(extra.minimumCharge, 60, 0);
        if (!this) return null;
        const charge = numberOption(this._chargeCounter, 0, 0);
        if (charge < minimumCharge) return null;

        const maximumCharge = Math.max(
            numberOption(extra.maximumCharge, 1000, minimumCharge),
            minimumCharge + 1
        );
        const chargeRate = Math.max(
            0,
            Math.min(1, (charge - minimumCharge) / (maximumCharge - minimumCharge))
        );
        const fullChargeSizeRate = numberOption(extra.fullChargeSizeRate, 3, 1);
        const fullChargeSpeedRate = numberOption(extra.fullChargeSpeedRate, 3, 1);
        const fullChargeDurationRate = numberOption(
            extra.fullChargeDurationRate,
            3,
            1
        );
        const sizeChargeRate = 1 + (fullChargeSizeRate - 1) * chargeRate;
        const speedChargeRate = 1 + (fullChargeSpeedRate - 1) * chargeRate;
        const durationChargeRate = 1 +
            (fullChargeDurationRate - 1) * chargeRate;
        const isRaining = typeof hasRainParticle === "function" &&
            hasRainParticle();
        const rainSizeRate = isRaining ? 2 : 1;
        const baseSize = numberOption(extra.size, 1, 0.1);
        const sizeRate = roundDecimal(
            baseSize * sizeChargeRate * rainSizeRate
        );
        // 满充能时主要扩大云团的分布范围。单张云纹理只放大到
        // 1.7 倍，避免数张巨大贴图叠成没有细节的纯色幕布。
        const particleScaleRate = roundDecimal(
            baseSize * rainSizeRate *
            (1 + Math.max(0, sizeChargeRate - 1) * 0.35)
        );
        // 满充能密度为 1.5 倍，避免重叠层数过多后完全不透明。
        const densityRate = roundDecimal(
            1 + Math.max(0, sizeChargeRate - 1) * 0.25
        );
        const opacityRate = Math.min(1, numberOption(extra.opacity, 0.48, 0));
        // 追击速度越快，地图锚定粒子的寿命越短，使各充能档位
        // 的可见拖尾长度接近，不会因满充能三倍速度而拉长三倍。
        const lifetimeRate = roundDecimal(
            numberOption(extra.particleLifetimeRate, 1, 0.1) /
            Math.max(1, speedChargeRate)
        );
        const trackingSpeed = roundDecimal(
            numberOption(extra.speed, 1.4, 0.05) * speedChargeRate
        );
        const varianceDamage = typeof chahuiUtil !== "undefined" &&
            typeof chahuiUtil.getVarianceDamage === "function"
            ? numberOption(chahuiUtil.getVarianceDamage(2), 0)
            : 0;
        const baseDamage = numberOption(
            extra.baseDamage,
            15 + 0.4 * varianceDamage,
            0
        );
        const magicDamage = Math.floor(numberOption(
            extra.magicDamage,
            baseDamage * sizeRate,
            0
        ));

        // 默认允许复数雷云并存；只有显式要求时才替换旧实例。
        if (extra.replaceExisting === true) {
            const oldCloudIds = $gameMap.getGroupBulletListQJ("heavenlyVajraCloud").slice();
            for (const id of oldCloudIds) {
                const oldCloud = $gameMap.bulletQJ(id);
                if (oldCloud && !oldCloud.deadOver) oldCloud.setDead();
            }
        }

        const baseDuration = numberOption(extra.duration, 300, 60);
        const duration = Math.round(baseDuration * durationChargeRate);
        const heightRate = extra.scaleHeightWithCharge === false
            ? 1
            : 1 + Math.max(0, sizeRate - 1) * 0.5;
        const playerOffsetY = numberOption(extra.playerOffsetY, -96) * heightRate;
        const enemyOffsetY = numberOption(extra.enemyOffsetY, -96) * heightRate;
        // 事件的 <Group:"enemy"> 标签会原样保留引号；雷云只追踪该敌人分组。
        const targetGroup = '"enemy"';
        // existData 的 G 判定使用表达式字符串数组，伤害仍可命中敌人与物体。
        const enemyGroup = extra.enemyGroup || ['"enemy"', '"object"'];
        const contactRadius = roundDecimal(
            numberOption(extra.contactRadius, 120, 8) * sizeRate
        );
        const contactInterval = Math.round(
            numberOption(extra.contactInterval, isRaining ? 60 : 90, 1)
        );
        // PC 端在鼠标位置召唤；移动端继承吟唱法阵的位置。
        const cloudPosition = Utils.isMobileDevice()
            ? [["S", this.inheritX()], ["S", this.inheritY()]]
            : [["M"], ["M"]];

        const cloud = QJ.MPMZ.Shoot({
            groupName: ["heavenlyVajraCloud", "magic", "summon"],
            opacity: 0,
            scale: 1,
            position: cloudPosition,
            initialRotation: ["S", 0],
            imgRotation: ["S", 0],
            moveType: ["S", 0],
            collisionBox: ["C", 40],
            // 正常由 updateCloud 等粒子自然消散后结束；这里是安全兜底。
            existData: [
                { t: ["Time", duration + 420] },
                {
                    t: ["G", enemyGroup],
                    heavenlyVajraContact: true,
                    cb: ["C", contactRadius],
                    // QJ 的负数穿透仍会调用 deadF，会误触发雷云粒子清理。
                    // 使用大正数；悬停检测与90帧冷却由实例状态独立管理。
                    p: [999999, false, true],
                    c: ["F", QJ.MPMZ.tl.ex_heavenlyVajraCanContact],
                    a: [
                        "F",
                        QJ.MPMZ.tl.ex_heavenlyVajraContact,
                        [{
                            duration: Math.round(numberOption(
                                extra.contactFlashDuration,
                                12,
                                4
                            )),
                            alpha: numberOption(extra.contactFlashAlpha, 180, 0),
                            color: extra.contactFlashColor || [190, 225, 255],
                            playThunder: extra.contactThunder !== false,
                            thunderScale: numberOption(
                                extra.contactThunderScale,
                                1.5,
                                0.1
                            ),
                            thunderZ: numberOption(extra.contactThunderZ, 0),
                            hitboxWidth: numberOption(
                                extra.contactHitboxWidth,
                                6,
                                1
                            ),
                            hitboxDuration: Math.round(numberOption(
                                extra.contactHitboxDuration,
                                10,
                                1
                            )),
                            hitboxStartOffset: numberOption(
                                extra.contactHitboxStartOffset,
                                12,
                                0
                            ),
                            hitboxEndExtension: numberOption(
                                extra.contactHitboxEndExtension,
                                18,
                                0
                            ),
                            targetOffsetX: numberOption(
                                extra.contactThunderTargetOffsetX,
                                0
                            ),
                            targetOffsetY: numberOption(
                                extra.contactThunderTargetOffsetY,
                                0
                            )
                        }]
                    ]
                }
            ],
            moveF: [[
                0,
                0,
                QJ.MPMZ.tl.ex_heavenlyVajraCircle,
                [{ heavenlyVajraUpdate: true }]
            ]],
            deadF: [[
                QJ.MPMZ.tl.ex_heavenlyVajraCircle,
                [{ heavenlyVajraCleanup: true }]
            ]],
            z: "W"
        });
        if (!cloud) return null;

        const particleBaseId = `heavenly_vajra_${$gameMap.mapId()}_${cloud.index}`;
        cloud._heavenlyVajraState = {
            duration,
            baseDuration,
            durationChargeRate,
            charge,
            chargeRate,
            isRaining,
            rainSizeRate,
            sizeRate,
            particleScaleRate,
            densityRate,
            opacityRate,
            lifetimeRate,
            speedChargeRate,
            magicDamage,
            speed: trackingSpeed,
            searchRange: numberOption(extra.searchRange, 720, 1),
            targetGroup,
            enemyGroup,
            contactRadius,
            contactInterval,
            contactAlignmentX: numberOption(extra.contactAlignmentX, 32, 0),
            contactAlignmentY: numberOption(extra.contactAlignmentY, 24, 0),
            enemyOffsetY,
            playerOffsetY,
            retargetInterval: Math.round(numberOption(extra.retargetInterval, 15, 1)),
            stopRadius: numberOption(extra.stopRadius, 12, 0),
            returnToPlayer: extra.returnToPlayer !== false,
            targetEventId: 0,
            nextRetargetFrame: 0,
            nextContactFrame: 0,
            particlesCreated: false,
            layersOrdered: false,
            fadeInDuration: Math.round(numberOption(extra.fadeInDuration, 45, 0)),
            fadeElapsed: 0,
            ending: false,
            cleaned: false,
            flashElapsed: -1,
            flashDuration: 12,
            flashAlpha: 180,
            flashColor: [190, 225, 255],
            contactTargetEventId: 0,
            strikeSerial: 0,
            strikeParticleIds: [],
            lastStrikeParticleIds: [],
            lastStrikeDamageBulletId: 0,
            layers: PARTICLE_LAYERS.map(config => ({
                config,
                params: chargedParticleParams(
                    config.params,
                    sizeRate,
                    particleScaleRate,
                    densityRate,
                    opacityRate,
                    lifetimeRate
                ),
                id: `${particleBaseId}_${config.suffix}`,
                ready: false,
                flashFilter: null,
                flashContainer: null
            }))
        };
        cloud.data.heavenlyVajraTargetId = 0;
        cloud.data.heavenlyVajraChargeRate = chargeRate;
        cloud.data.heavenlyVajraRainEnhanced = isRaining;
        cloud.data.heavenlyVajraRainSizeRate = rainSizeRate;
        cloud.data.heavenlyVajraDuration = duration;
        cloud.data.heavenlyVajraDurationRate = durationChargeRate;
        cloud.data.heavenlyVajraSizeRate = sizeRate;
        cloud.data.heavenlyVajraParticleScaleRate = particleScaleRate;
        cloud.data.heavenlyVajraOpacityRate = opacityRate;
        cloud.data.heavenlyVajraLifetimeRate = lifetimeRate;
        cloud.data.heavenlyVajraTrackingSpeed = trackingSpeed;
        cloud.data.heavenlyVajraMagicDamage = magicDamage;
        cloud.data.heavenlyVajraContactTargetId = 0;
        cloud.data.heavenlyVajraStrikeParticleIds = [];
        cloud.data.heavenlyVajraStrikeDamageBulletId = 0;

        if (extra.playSe !== false) {
            AudioManager.playSe({ name: "Thunder12", volume: 90, pitch: 100, pan: 0 });
        }
        // ==================== 耐久度结算 ===================
        // 最低可释放吟唱消耗 150，随吟唱进度线性增加，满吟唱封顶 450。
        const durabilityChargeRate = 1 + 2 * chargeRate;
        const durabilityDamage = Math.round(numberOption(
            extra.durabilityDamage,
            150 * durabilityChargeRate,
            0
        ));
        if (durabilityDamage > 0) {
            QJ.MPMZ.tl.ex_consumeStaffDurability(durabilityDamage);
        }

        // Shoot 构造阶段的首个 moveF 发生在状态写入前，因此这里主动初始化一次。
        updateCloud(cloud);
        return cloud;
    };
})();
