//=============================================================================
//
//=============================================================================
/*:
 * @target MV MZ
 * @plugindesc [弹幕模板库][道具特效模板]
 * @author 仇九
 *
 * @help 
 * 
 *
 */
//=============================================================================
//
//=============================================================================

(() => {
	const SALMON_ITEM_ID = 142;
	const KING_SALMON_ITEM_ID = 143;
	const ICON_X = 1880;
	const COUNT_X = 1780;
	const SALMON_Y = 1000;
	const KING_SALMON_Y = 920;

	const itemCount = itemId => {
		const item = $dataItems[itemId];
		return item ? $gameParty.numItems(item) : 0;
	};

	const countImage = count => ({
		text: count,
		arrangementMode: 0,
		textColor: "#ffffff",
		fontSize: 40,
		outlineColor: "#000000",
		outlineWidth: 0,
		fontFace: "x10y12pxDonguriDuel",
		fontItalic: false,
		fontBold: true,
		immuneTimeStop: true,
		width: 120,
		height: 60,
		textAlign: 6,
		lineWidth: 0,
		lineColor: "#ffffff",
		lineRate: 1.0,
		backgroundColor: null,
		backgroundOpacity: 1,
		shadowBlur: 8,
		shadowOffsetX: 0,
		shadowOffsetY: 0
	});

	const shootIcon = (iconIndex, posY, scale, zoom) => QJ.MPMZ.Shoot({
		img: ["I", iconIndex],
		groupName: ["fish"],
		position: [["S", ICON_X / zoom], ["S", posY / zoom]],
		initialRotation: ["S", 0],
		imgRotation: ["S", 0],
		moveType: ["S", 0],
		opacity: 1,
		scale,
		z: "S",
		onScreen: true,
		existData: [],
		timeline: ["B", 0, 120, [0.75, 60]]
	});

	const shootCount = (count, posY, zoom, monitor) => {
		const bullet = QJ.MPMZ.Shoot({
			img: ["T", countImage(count)],
			position: [["S", COUNT_X / zoom], ["S", posY / zoom]],
			groupName: ["fish"],
			initialRotation: ["S", 0],
			imgRotation: ["F"],
			opacity: 1,
			moveType: ["S", 0],
			z: "S",
			scale: 1 / zoom,
			onScreen: true,
			existData: [],
			moveF: monitor
				? [[40, 40, QJ.MPMZ.tl.countTradableSalmon, [{refresh: true}]]]
				: []
		});
		if (bullet) bullet._tradableSalmonCount = count;
		return bullet;
	};

	const clearKingSalmon = monitor => {
		const icon = monitor._tradableKingSalmonIcon;
		const counter = monitor._tradableKingSalmonCounter;
		if (icon && !icon.dead) icon.setDead();
		if (counter && !counter.dead) counter.setDead();
		monitor._tradableKingSalmonIcon = null;
		monitor._tradableKingSalmonCounter = null;
	};

	const showKingSalmon = (monitor, count, zoom) => {
		clearKingSalmon(monitor);
		monitor._tradableKingSalmonIcon = shootIcon(1330, KING_SALMON_Y, 1 / zoom, zoom);
		monitor._tradableKingSalmonCounter = shootCount(count, KING_SALMON_Y, zoom, false);
	};

	const refreshCounts = monitor => {
		if (!monitor || monitor.dead) return;

		const salmonCount = itemCount(SALMON_ITEM_ID);
		if (monitor._tradableSalmonCount !== salmonCount) {
			monitor._tradableSalmonCount = salmonCount;
			monitor.changeAttribute("img", ["T", countImage(salmonCount)]);
		}

		const kingSalmonCount = itemCount(KING_SALMON_ITEM_ID);
		const icon = monitor._tradableKingSalmonIcon;
		const counter = monitor._tradableKingSalmonCounter;
		const displayExists = icon && !icon.dead && counter && !counter.dead;

		if (kingSalmonCount <= 0) {
			if (icon || counter) clearKingSalmon(monitor);
			return;
		}

		const zoom = $gameScreen.zoomScale() || 2;
		if (!displayExists) {
			showKingSalmon(monitor, kingSalmonCount, zoom);
		} else if (counter._tradableSalmonCount !== kingSalmonCount) {
			counter._tradableSalmonCount = kingSalmonCount;
			counter.changeAttribute("img", ["T", countImage(kingSalmonCount)]);
		}
	};

	QJ.MPMZ.tl.countTradableSalmon = function(extra = {}) {
		if (extra.refresh) {
			refreshCounts(this);
			return;
		}

		const zoom = $gameScreen.zoomScale() || 2;
		const salmonCount = itemCount(SALMON_ITEM_ID);

		// 142 号道具无论持有量多少都显示，未持有时显示 0。
		shootIcon(1329, SALMON_Y, 0.5, zoom);
		const monitor = shootCount(salmonCount, SALMON_Y, zoom, true);
		if (!monitor) return;

		// 143 号道具只在持有量大于 0 时显示，并由 142 号计数器统一监视。
		const kingSalmonCount = itemCount(KING_SALMON_ITEM_ID);
		if (kingSalmonCount > 0) showKingSalmon(monitor, kingSalmonCount, zoom);
	};
})();

// aki商店初始化商品布局
QJ.MPMZ.tl.initializeAkiShopItems = function(extra = {}) {
    const shop = $gameMap.event(this._eventId);
	if (!shop || shop._productList) return;

    let list = [];
	// 三色糖果
	for (let itemId = 30; itemId < 33; itemId++) {
		for (let i = 0; i < 2 + Math.randomInt(4); i++) {
			list.push(itemId);
		}
    }
	// 水馒头
 	for (let itemId = 0; itemId < 3; itemId++) {
		list.push(33);
    }   
	// 寿司布丁
	if (!$gameParty.hasItem($dataItems[77])) list.push(77);
	// 成人录像带
	if (!$gameParty.hasItem($dataItems[189])) list.push(189);
	// 猫娘同人本
	if (!$gameParty.hasItem($dataItems[192])) list.push(192);	
	// 触手玩具
	if (!$gameParty.hasItem($dataItems[193])) list.push(193);

	// aki的祈祷
	const hasArmor77 = DataManager._independentArmors.some(
    armor => armor && armor.baseItemId === 77);
	if (!hasArmor77) list.push(2077);

	// 爱神荡漾
	const hasArmor300 = DataManager._independentArmors.some(
    armor => armor && armor.baseItemId === 300);
	if (!hasArmor300) list.push(2300);

	shop._productList = list;
    
};

// 头顶名称显示
QJ.MPMZ.tl.targetDisplayNameMonitor = async function(extra = {offsetX:0, offsetY:0}) {
	if (!this) return;
	if (extra.groupName) {
		// 监听名称框显示/隐藏
		let value = 1;
		if ($gameMessage.isBusy()) {
			if (this.opacity >= value) this.changeAttribute("opacity", `0|${value}~30/0~99999|0`);
			return;
		}
		let tag   = extra.groupName;
		let check = QJ.MPMZ.getBulletNumberBM(-1, ['C', 24], [tag]);
		if (check === 0) {
			if (this.opacity >= value)  this.changeAttribute("opacity", `0|${value}~30/0~99999|0`);
		} else {
			if (this.opacity <= 0)      this.changeAttribute("opacity", `0|0~30/${value}~99999|${value}`);   
		}
		return;
	}

    let groupName = extra.object + this._eventId;
    if ($gameMap.getGroupBulletListQJ(groupName).length > 0) return;

	let lang = ConfigManager.language; 
	let checkName = extra.object + lang;
	const ok = await Promise.resolve(
			QJ.MPMZ.tl.checkPictureExists(['img','projectiles','object_name'], `${checkName}.png_`)
		);	
	if (!ok) lang = 2;	
	let imgName = "object_name/" + extra.object + lang;
	const offsetX = extra.offsetX || 0;
	const offsetY = extra.offsetY || 0;
	const scale = extra.scale || 0.75;
	const eid = this._eventId;
	let posX = `$gameMap.event(${eid})?.screenBoxXShowQJ() + ${offsetX}`; 
	let posY = `$gameMap.event(${eid})?.screenBoxYShowQJ() + ${offsetY}`;
	QJ.MPMZ.Shoot({
		img:imgName,
		groupName:[groupName],
		position:[['S',posX],['S',posY]],
		initialRotation:['S',0],
		scale,
		opacity: 1,
		imgRotation:['F'],
		z: 6,
		collisionBox:['C',420],
		moveType:['D',true],
		existData:[   
			{t:['S', `!$gameMap.event(${eid})`, true]}
		],
		moveF:[
			[30,30,QJ.MPMZ.tl.targetDisplayNameMonitor, [{groupName}]]
		]
	});
};

// 自动贩售机功能初始化
QJ.MPMZ.tl.initVendingMachineFunctions = function(extra = {}) {

    if (extra.calculateDrinkPrice) {
		// 计算饮料价格（考虑罚金）
		let value = 100;
		value    += $gameSelfVariables.value([1, 12, 'penaltyRate']) * 100;
		$gameVariables.setValue(86, value);
		this.itemPrice = value;		
	    return;
    }

    if (extra.checkPurchase) {
		this.isBulkPurchase = false;
		const selectedValue = $gameVariables.value(90);
		const event = $gameMap.event(this._eventId);
		const selectedIds = Array.isArray(selectedValue)
			? selectedValue
			: (selectedValue > 0 ? [selectedValue] : []);
		event._selectedId = selectedIds;
		if (selectedIds.length > 0) {
			this.coinCount = selectedIds.length;
			if (selectedIds.length > 1) {
				// 批量购买的情况
				this.isBulkPurchase = true;
				this.itemPrice *= selectedIds.length;
				if ($gameParty.gold() < this.itemPrice ) {
                    return;
				}
			}
			// 从商品列表逐一剔除
			const arr = event._productList;
			for (const id of selectedIds) {
				const index = arr.indexOf(id);
				if (index !== -1) arr.splice(index, 1);
			}
		}		
	    return;
    }
    // 根据天气调整可乐的出货率
	$gameSystem.cloneDefaultEnemyLoot(5);
	let tables  = $gameSystem.getEnemyLootOverride(5);
	let weight =$gameSwitches.value(123) ? 15 : 1;
	if (tables && tables[0]) {
		let t = tables[0];
		t.pools.forEach(function(pool) {
			if (pool.name === "Item 35") {
				pool.weight = weight;
			}
		});
	}
	// 填充贩售机货物列表
    let ev = $gameMap.event(this._eventId);
    let num = 10 + Math.randomInt(10);
    ev._productList = [];
    for (let i = 0; i < num; i++) {
        let id = dingk.Loot.calculateRandomItemIndex(5);
        ev._productList.push(id);
    }	
};


// 大瓶可乐投掷物
QJ.MPMZ.tl.bigBottleCokeThrowables = function(extra = {}, args) {

   if (extra.checkShake) {
	  const player = $gamePlayer;
	  if (!player.isMoved()) return;
	  const direction = player._direction;
	  if (this._remDirection === direction && Math.random() > 0.1) return;
	  this._remDirection = direction;
	  this.addTimelineEffect('S',[-1, 2+Math.randomInt(3), 2]);
      if (Math.random() > 0.5) return;
	  let seName = "coke_shaking_vfx" + Math.randomInt(4);
	  AudioManager.playSe({name: seName, volume: 70, pitch: 90 + Math.randomInt(20), pan: 0});	
	  this._shakeCount = this._shakeCount || 0;
	  this._shakeCount += 1;
	  // 根据摇晃次数决定临界状态
	  let heat = Math.min(255, this._shakeCount);
	  if (heat > 180 && Math.random() > 0.6) {
		  // 超过临界值会自爆
		  $gamePlayer.drill_EASA_setEnabled( true );
		  QJ.MPMZ.tl.bigBottleCokeThrowables.call(this, {cokeExplosion: true});
		  this.setDead();
		  return;
	  }
      this.changeAttribute('tone', [heat, 0, 0, 0]);
	  let newScale = this.data.oldScale * (1 + (heat / 150));
	  this.changeAttribute('scale', newScale);
	  return;
   }

   if (extra.Shoot) {
		$gamePlayer.drill_EASA_setEnabled( true );
		let ImgIndex = $gameParty.lastItem().iconIndex; 
	    let seName = "Wind7";
	    AudioManager.playSe({name: seName, volume: 85, pitch: 90 + Math.randomInt(20), pan: 0});				
		QJ.MPMZ.Shoot({
			groupName:['Coke'],
			img:['I',ImgIndex],
			position:[['S', this.inheritX()],['S', this.inheritY()]],
			initialRotation:['M'],
			oldScale: this.data.oldScale,
			moveType:['S','0|12~120/4~999/4'],
			scale: this.scaleX,
			imgRotation:['R',16,true],
			existData:[	
				{t:['Time',120]},
				{t:['R',[255]], a:['F', QJ.MPMZ.tl.bigBottleCokeThrowables, [{cokeExplosion: true}]]},
				{t:['G',['"enemy"', '"object"']], a:['F', QJ.MPMZ.tl.bigBottleCokeThrowables, [{cokeExplosion: true}]], d:[1,30,2]},
				{t:['P'], a:['F', QJ.MPMZ.tl.bigBottleCokeThrowables, [{cokeExplosion: true}]], d:[1,30,2], c: ['S', 'this.time > 10'] }
			],
			collisionBox:['C', 24]
		});	
		return;
   }

   if (extra.cokeExplosion) {
	   let posX = this.inheritX();
	   let posY = this.inheritY();	
	   let scale = this.scaleX * 2;
	   // 只有蓄力到一定程度才会爆炸
	   if (scale  < this.data.oldScale * 2.4) {
		   let damage = 20 + Math.randomInt(20);
		   let extra = {nonPlayerDamage:true,noHitEffect:true,noDurLoss:true,specifyAddedStatus:true,addedStatusType:0};
		   QJ.MPMZ.rangeAtk([['S',posX],['S',posY]],['G',['"enemy"','"object"']],['F',QJ.MPMZ.tl.ex_toEnemyAttack,[damage,extra]],['C',30]);		
           return;
	   }
	   QJ.MPMZ.tl.ex_JackBombEffect(posX, posY, 1, scale);
	   let seName = "大爆発 ドカーン 炎上 爆弾 兵器 火薬";
	   AudioManager.playSe({name: seName, volume: 85, pitch: 90 + Math.randomInt(20), pan: 0});	   
	   return;
   }

   let ImgIndex = $gameParty.lastItem().iconIndex;   
   let time = 15;
   let scale = 0.5;
   if (Utils.isMobileDevice()) {
	   time = 45;
	   scale = 1;
   }   
   QJ.MPMZ.Shoot({
        img:['I',ImgIndex],
		position:[['P'],['P']],
        initialRotation:['S',0],
		imgRotation:['F'],
        moveType:['B',-1,0,-20,0,-20,0,-20,0,-20],
		oldScale: scale,
        scale,
        existData:[
			{t:['S','TouchInput.drill_isLeftPressed()',true], a:['F',QJ.MPMZ.tl.bigBottleCokeThrowables,[{Shoot:true}]], c: ['S', `this.time > ${time}`]},  
        ],
		moveF: [
            [0, 0, QJ.MPMZ.tl.bigBottleCokeThrowables,[{checkShake:true}]]
		],
		trailEffect:[],
    });
};

// 水馒头投掷物
QJ.MPMZ.tl.SpringyMizumanjuThrowables = function(extra = {}, args) {

   if (extra.getEaten) {
		let eid = args.target._eventId;
		let Event = "event:" + eid;
		let Ename = "heart-" + eid;
		let Effectiveness = QJ.MPMZ.tl.ex_getEnemyStateEffectiveness(eid, 10);
		if (Effectiveness <= 0) return;
		args.target._SensitivityUp = true;
        $gameScreen._particle.particleSet(0,Ename,Event,"heart");	
		QJ.MPMZ.tl.ex_enemyFullness.call(args.target, {value: Math.floor(300 * Effectiveness)});
		QJ.MPMZ.Shoot({
			groupName:['SensitivityUp'],
			position:[['P'],['P']],
			initialRotation:['S',0],
			imgRotation:['F'],
			moveType:['S',0],
			existData:[
				{t:['Time', 420]} 
			],
			deadJS: [
				 `$gameScreen._particle.particleClear("${Ename}");
				  if ($gameMap.event(${eid})) {
					  $gameMap.event(${eid})._SensitivityUp = false;			
				}`
			]
		});			
        return;
   }

   if (extra.eatenByOniichan) {
        // --- 吃东西音效 ---
		const sePool = ["リンゴをかじる", "お菓子を食べる1", "お菓子を食べる2"];
		const seName = sePool[Math.floor(Math.random() * sePool.length)];
		const se = {
			name: seName,
			volume: 90,
			pitch: Math.randomInt(80) + 41,
			pan: 0,
		};
		AudioManager.playSe(se);	
		let time = 5;       		
		let player = $gameParty.leader();
		if ($gameSystem.hasGameTimeEvent("state76")) {
			player.addState(76);
			$gameSystem.adjustGameTimeEventDelay('state7', time, true);
		} else {
			player.addState(76);
			$gameSystem.addGameTimeEvent({
				key: 'state76',
				command: 'remove',
				delayMinutes: time,
				target: 76,
				condition: 'true'
			});
		}
		// O奋度上升
		let value = $gameVariables.value(25);
		if (value < 80) {
			value += 5 + Math.randomInt(10);
            $gameVariables.setValue(25, value);
		}			
        return;
   }

   if (extra.Shoot) {
		$gamePlayer.drill_EASA_setEnabled( true );
		let ImgIndex = $gameParty.lastItem().iconIndex; 
		let collisionBox = 32;
		if (extra.scale > 0.5) collisionBox = 16;		
		QJ.MPMZ.Shoot({
			groupName:['SpringyMizumanju'],
			img:['I',ImgIndex],
			position:[['P'],['P']],
			initialRotation:['M'],
			moveType:['S','0|9~120/0~999/0'],
			scale: extra.scale ? extra.scale : 0.5,
			imgRotation:['R',16,true],
			existData:[	
				{t:['Time',120]},
				{t:['R',[255]]},
				{t:['G',['"enemy"']], a:['F',QJ.MPMZ.tl.SpringyMizumanjuThrowables,[{getEaten:true}]], d:[1,30,2]},
				{t:['P'], a:['F',QJ.MPMZ.tl.SpringyMizumanjuThrowables,[{eatenByOniichan:true}]], d:[1,30,2], c: ['S', 'this.time > 10'] }
			],
			collisionBox:['C',collisionBox],
		});	
	    return;
   }

   let ImgIndex = $gameParty.lastItem().iconIndex;   
   let time = 15;
   let scale = 0.5;
   if (Utils.isMobileDevice()) {
	   time = 45;
	   scale = 1;
   }   
   QJ.MPMZ.Shoot({
        img:['I',ImgIndex],
		position:[['P'],['P']],
        initialRotation:['S',0],
		imgRotation:['F'],
        moveType:['B',-1,0,-30,0,-30,0,-30,0,-30],
        scale,
        existData:[
			{t:['Time',1200]},
			{t:['S','TouchInput.drill_isLeftPressed()',true], a:['F',QJ.MPMZ.tl.SpringyMizumanjuThrowables,[{Shoot:true,scale}]], c: ['S', `this.time > ${time}`]},  
        ],
		trailEffect:[],
    });
};

// 塔罗牌-死亡/死神
QJ.MPMZ.tl.summonTheDeathDevil = function(extra = {}, args) {

    if (extra.death) {
		if (args.target && args.target instanceof Game_Event) {
			let eid = args.target._eventId;
			args.target.requestAnimation(145);
			setTimeout(() => {
				if (!$gameSelfSwitches.value([$gameMap.mapId(), eid, 'G'])) {
					// 需要考虑是否处于点金状态
					$gameSelfVariables.setValue([$gameMap.mapId(), eid, 'HP'], 0);
					$gameSelfSwitches.setValue([$gameMap.mapId(), eid, 'D'], true);
				}
			}, 600);				
			return;
		}

		if (args.target && args.target instanceof Game_Player) {
			args.target.requestAnimation(145);
			setTimeout(() => {
			   $gameParty.leader().setHp(0);
			   chahuiUtil.unlockSpecificAchievement('YouAreAlreadyDead');
			}, 600);				
			return;
		}		
        return;
	}

    if (!this) return;
	QJ.MPMZ.Shoot({
		collisionBox:['R',1920,1080],
		position: [['E', 0], ['E', 0]],
		groupName:['death'],
		initialRotation: ['S', 0], 
		imgRotation: ['F'],		
		moveType: ['S', 0],
		existData: [
			{ t: ['Time', 40] },
			{ t:['G',['"enemy"']], a:['F', QJ.MPMZ.tl.summonTheDeathDevil, [{death:true}]], p:[-1,false,true] },
			{ t:['P'], a:['F', QJ.MPMZ.tl.summonTheDeathDevil, [{death:true}]], p:[-1,false,true], c:['S','this.time > 20']}
		],
	});
};

// 塔罗牌-女祭司
QJ.MPMZ.tl.summonTheFallenChurchEntrance = function(extra = {}) {
	const player = $gamePlayer;
	const c_area = $gameMap.drill_COFA_getShapePointsWithCondition(
		player._x, player._y, "圆形区域", 5,
		DrillUp.g_COFA_condition_list[10]);
	let valid = c_area.filter(function(p){
	var tx = p.x, ty = p.y + 1;
	return player.canPass(tx,ty,2)||player.canPass(tx,ty,4)||player.canPass(tx,ty,6)||player.canPass(tx,ty,8);
	});

	if (valid.length) {
	// 随机打乱候选点顺序
	for (let i = valid.length - 1; i > 0; i--) {
		let j = Math.randomInt(i + 1);
		[valid[i], valid[j]] = [valid[j], valid[i]];
	}

	$gameTemp._portalSpawned = false;

	valid.forEach(function(p) {
		let xx = p.x, yy = p.y;
		let code = `if(!$gameTemp._portalSpawned){
		                $gameParty.loseItem($dataItems[48], 1);
						$gameTemp._portalSpawned=true;
						let eid=$gameMap.spawnEventQJ(1,104,${xx},${yy},false);
						$gameMap.event(eid)._opacity=0;
					   }`;
		QJ.MPMZ.Shoot({
			position: [['Map', xx], ['Map', yy]],
			initialRotation: ['S', 0],
			imgRotation: ['F'],
			moveType: ['S', 0],
			anchor: [0.5, 0.5],
			collisionBox: ['C', 96],
			existData: [
				{t:['Time', 4], a:['S', code]},
				{t:['G',['"enemy"','"object"']], a:['S', ""]},
				{t:['NP'], a:['S', ""]},
			],
		});
	});
	}
};

// 封术卷轴
QJ.MPMZ.tl.sealingScrollEffects = function(extra = {}) {
	
	if (extra.displayFix) {
		(() => {
			const baseItemId = 80;
			const result = {
				checked: 0,
				migrated: 0,
				alreadyFingerprinted: 0,
				notHeld: 0,
				failed: 0
			};
			const baseItem = $dataItems[baseItemId];
			const list = Array.isArray(DataManager._independentItems)
            ? DataManager._independentItems
            : [];
			if (!baseItem) {
				console.error(
					"[SealingScrollMigration] 找不到基础物品:",
					baseItemId
				);
				result.failed++;
				return result;
			}
			const fingerprint =
				DataManager.makeIndependentTemplateFingerprint(baseItem);

			if (typeof fingerprint !== "string") {
				console.error(
					"[SealingScrollMigration] 无法生成模板指纹:",
					baseItem
				);
				result.failed++;
				return result;
			}

			for (const item of list) {
				if (!item || Number(item.baseItemId) !== baseItemId) {
					continue;
				}

				// 只处理玩家当前持有的卷轴实例
				if (!$gameParty || $gameParty.numItems(item) <= 0) {
					result.notHeld++;
					continue;
				}
				result.checked++;
				// 有指纹的实例已经由通用迁移函数负责
				if (typeof item._templateFingerprint === "string") {
					result.alreadyFingerprinted++;
					continue;
				}
				try {
					// 只修复备注解析结果，不触碰 sealingItems
					item.infoEval = String(baseItem.infoEval || "");
					item._templateFingerprint = fingerprint;
					result.migrated++;
				} catch (error) {
					result.failed++;
					console.error(
						"[SealingScrollMigration] 卷轴迁移失败:",
						item.id,
						error
					);
				}
			}
			console.log("[SealingScrollMigration]", result);
			return result;
		})();
        return;
	}


	const actor  = $gameParty.leader();	
	if (extra.sealToScroll) {
		let record = actor._equips.map(e => {
			return {_dataClass: e._dataClass, _itemId: e._itemId};
		  });
		this.sealingItems = record;
		// 封印完成，收掉玩家的装备
		const eqs = actor.equips();
		for (let slotIndex = 0; slotIndex <= 5; slotIndex++) {
			 let equips = eqs[slotIndex];
			 let target = slotIndex === 0 ? 4 : null;
			 actor.changeEquipById(slotIndex+1, target);
			 if (equips)  {
				 equips.isSealed = true;
				 $gameParty.loseItem(equips, 1);
				 $gameMap.steupCEQJ(100,1,{equipChange:true, equipIndex:slotIndex, equipFadeOut:true, isSealed:true});
			 }
		}
	    return;
	}

	if (extra.releaseSeal) {
		for (let i = 0; i < this.sealingItems.length; i++) {
		  const e = this.sealingItems[i];
		  if (!e) continue;

		  let obj = null;
		  if (e._dataClass === 'weapon') obj = $dataWeapons[e._itemId];
		  else if (e._dataClass === 'armor') obj = $dataArmors[e._itemId];

		  if (obj) {
			//console.log(i, obj);  
			$gameParty.gainItem(obj, 1);
			obj.isSealed = undefined;
			actor.changeEquip(i, obj);
			$gameMap.steupCEQJ(100,1,{equipChange:true, equipIndex:i, isSealed:true});
		  }
		}
		this.sealingItems = undefined;
	    return;
	}
	if (!this) return;
	let textArray = window.mapCommonEventDialogue?.sealingScroll;
	if (!textArray) textArray = [ "No items sealed yet",
                                  "Under Seal:"];
	let text      = textArray[0];							  
	// 若存在被封印的物品，显示出来							  								  
	if (this.sealingItems) {
		text = textArray[1];
		let sealing = "";
		for (let i = 0; i < this.sealingItems.length; i++) {
		  const e = this.sealingItems[i];
		  if (!e) continue;

		  let obj = null;
		  if (e._dataClass === 'weapon') obj = $dataWeapons[e._itemId];
		  else if (e._dataClass === 'armor') obj = $dataArmors[e._itemId];

		  if (obj && obj.iconIndex != null) {
			sealing += ` \\fs[34]\\i[${obj.iconIndex}]`;
		  }
		}		
		text += sealing;
	}
	console.log(text);
	$gameStrings.setValue(110, text);
};

// 稻草人/训练假人状态初始化
QJ.MPMZ.tl.initializeScarecrowState = async function(extra = {}) {
	
	if (!this) return;
	
	let OffsetX = 0;
	let OffsetY = -10;
	let scale   = 0.8;
	QJ.MPMZ.tl.ex_objectShadowGeneration.call(this,OffsetX,OffsetY,scale);
	QJ.MPMZ.tl.targetDisplayNameMonitor.call(this,{object:'Scarecrow', scale: 0.5, offsetY: -60});

	return;
	let posX = this.screenShootXQJ(); 
	let posY = this.screenShootYQJ() - 80;
	let lang = ConfigManager.language; 
	let checkName = "Scarecrow" + lang;
    const ok = await Promise.resolve(
      QJ.MPMZ.tl.checkPictureExists(['img','projectiles','object_name'], `${checkName}.rpgmvp`)
    );

    if (!ok) lang = 2;	
	let imgName = "object_name/Scarecrow" + lang;
	QJ.MPMZ.Shoot({
		 img:imgName,
		 groupName:['Scarecrow'],
		 position:[['S',posX],['S',posY]],
		 anchor:[0.5,0.5],
		 initialRotation:['S',0],
		 scale:0.5,
		 existData:[   ],
		 imgRotation:['F'],
		 z:"W",
		 moveType:['S',0],
		 blendMode:0,
		 collisionBox:['C',420],
		 moveF:[
			[20,20,QJ.MPMZ.tl.ex_AnuszEffectActivationCheck,["Scarecrow"]]
		 ]
	});	
};

// 奇怪的骑士状态初始化
QJ.MPMZ.tl.initializeWeirdKnightState = async function(extra = {}) {
	
    if (extra.groupName) {
		// 监听名称框显示/隐藏
		let value = 0.6;
		if ($gameMessage.isBusy()) {
			if (this.opacity >= value) this.changeAttribute("opacity", `0|${value}~30/0~99999|0`);
			return;
		}
		let tag   = extra.groupName;
        let check = QJ.MPMZ.getBulletNumberBM(-1, ['C', 24], [tag]);
        if (check === 0) {
           if (this.opacity >= value)  this.changeAttribute("opacity", `0|${value}~30/0~99999|0`);
        } else {
           if (this.opacity <= 0)      this.changeAttribute("opacity", `0|0~30/${value}~99999|${value}`);   
        }
		return;
    }

    if (extra.dialogueOpeningLine) {
        // 扭蛋检测必须最开始进行
		let gachaArray = $gameMap.drill_COET_getEventsByTag_direct("扭蛋");
		let throwArray = []; 
		let eid = this._eventId;
		if (gachaArray.length > 0) {
		  for (let idx = 0; idx < gachaArray.length; idx++) {
			   const i = gachaArray[idx];
			   if ($gameMap.event(eid)?.calcDistance(i._eventId) < 48) {
				   throwArray.push(i._eventId);
				   this._preventOptionDisplay = true;
			   }  
		    }
		}
		let type = String(this._sourceeventId);
		// 刷新选项文本
		QJ.MPMZ.tl._imoutoUtilGenerateOptionText.call(this, 30, type, {specifiedKey: "prototypeEventTemplate"});
        // 开场白后紧接着选项显示
		let index = 32;
		if ($gameSwitches.value(500)) index = 31;
		if ($gameSwitches.value(123)) index = 114;
		this.showPrototypeEventDialogue(type,String(index));
		if ($gameSwitches.value(500) && Math.random() > 0.7) {
			index = 33;
			if (throwArray.length > 0) this._preventOptionDisplay = true;
			this.showPrototypeEventDialogue(type,String(index));
		}
        // 如果实际存在扭蛋，切断选项显示的流程
		if (throwArray.length > 0) {
		this._gachaArray = throwArray;
		let labelName = "gachaProxyOpen";
			for (let i = 0; i < this._list.length; i++) {
				let command = this._list[i];
				if (command.code === 118 && command.parameters[0] === labelName) {
					this.jumpTo(i);
					return;
				}
			}
		}
		return;
	} 

    if (extra.checkItemPurchase) {
		let target = $gameMap.event(this._eventId);
		let type   = String(this._sourceeventId);
		if ($gameParty.gold() < this.price) {
            // 钱不够，购买失败
		    let index = 49 + Math.randomInt(2);
		    this.showPrototypeEventDialogue(type,String(index));
			return;
		}
		$gameParty.gainGold(-this.price);
		const itemsId = this.selectedIds;
		for (const id of itemsId) {
			let item = $dataItems[id];
			if (item) {
				$gameParty.gainItem(item, 1);
				if (id !== 410) QJ.collectionCheck(0, id); 
				let index = target._productList.indexOf(id);
				target._productList.splice(index, 1); 
				// 成功购买游戏机标记
				if (id === 15) this.hasPurchased = true;		
			}
		}		
		AudioManager.playSe({ name: "Shop1", volume: 80, pitch: 100, pan: 0 });
        if (!this.hasPurchase) {
		    index = 47 + Math.randomInt(2);
		    this.showPrototypeEventDialogue(type,String(index));
		}		
		return;
	}
 
	if (!this) return;
	
	if ($gameMap.getGroupBulletListQJ('Knight').length > 0) return;
	let target = this._eventId;
	// 初次接触的自动监听
	if (!$gameSelfSwitches.value([1, 11, 'A'])) {
		if ($gameParty.hasItem($dataItems[15])) {
		// 旧存档适配	
	        $gameSelfSwitches.setValue([$gameMap.mapId(), target, 'A'], true);
			$gameSelfSwitches.setValue([1, 11, 'A'], true);
		}		
		QJ.MPMZ.Shoot({
			position: [['Map', 21],['Map', 5]],
			initialRotation: ['S', 0],
			imgRotation: ['F'],
			moveType: ['S', 0],
			collisionBox: ['R',288,144],
			existData: [	
			   { t:['S', "$gameSelfSwitches.value([1, 11, 'A'])", true] }, 
			   { t:['P'], a:['S', `if (!$gameTemp._isInBattle) {
									  $gameMap.event(${target})?.start();							  
								  }`] 
			   }
			],
		});
	} else {
		$gameSelfSwitches.setValue([$gameMap.mapId(), target, 'A'], true);
		if ($gameParty.hasItem($dataItems[15])) {
			const item = $dataItems[411];
            if (!$gameParty.hasItem(item, false)) {
                 $gameParty.gainItem(item, 1);
            }
		}

		// 炎热天气特殊事件适配
		if (!$gameVariables.value(60) && $gameSwitches.value(123)) {
			if (!$gameSelfSwitches.value([1, 11, 'H'])) {
				setTimeout(() => {
					const id = "adjustment" + this._eventId;
					const filterTarget = 4000 + this._eventId;
					$gameMap.createFilter(id, "adjustment", filterTarget);
					$gameMap.setFilter( id ,[0.6,2,1,3,0.9,0.3,0.1,1]);
					$gameScreen._particle.particleSet(0,`smoke_c-${this._eventId}`,`event:${this._eventId}`,'smoke_c');	
					$gameScreen._particle.particleUpdate([`smoke_c-${this._eventId}`, 'pos', 0, -24]);
					this.drill_EASe_setSimpleStateNode( ["中暑"] );
				}, 200);
		    }
		}		
	}
	// 名称框
	let lang = ConfigManager.language; 
    let checkName = "Knight" + lang;
    const ok = await Promise.resolve(
        QJ.MPMZ.tl.checkPictureExists(['img','projectiles','object_name'], `${checkName}.png_`)
    );	
	if (!ok) lang = 2;
	let imgName = "object_name/Knight" + lang;
	let posX = this.screenShootXQJ() - 4; 
	let posY = this.screenShootYQJ() - 54;
	QJ.MPMZ.Shoot({
		img:imgName,
		groupName:['Knight'],
		position:[['S',posX],['S',posY]],
		initialRotation:['S',0],
		scale:0.5,
		opacity: 0.6,
		imgRotation:['F'],
		z:"W",
		collisionBox:['C',420],
		moveType:['S',0],
		existData:[   
		],
		moveF:[
		   [30,30,QJ.MPMZ.tl.initializeWeirdKnightState, [{groupName:"Knight"}]]
		],
	});
	// 重置动作和朝向
	setTimeout(() => {
        // 影子
        QJ.MPMZ.tl.ex_objectShadowGeneration.call(this, 1, -1, 1.1);
        this.setDirection(6);		
		if (!$gameParty.hasItem($dataItems[15]) && this._drill_EASe_controller !== undefined) {
			this.drill_EASe_setSimpleStateNode( ["记笔记"] );			
		}
    }, 200);	
    // 骑士商店的商品布局	
	if (!this._productList) {
		this._productList = [];
		if (!$gameParty.hasItem($dataItems[15])) {
			this._productList.push(15);  // 游戏主机
		}
		if (!$gameParty.hasItem($dataItems[16]) && $gameNumberArray.value(37).length > 6) {
			this._productList.push(16);  // DLC道具
		}
		if (!$gameParty.hasItem($dataItems[188]) && $gameSelfSwitches.value([1, 11, 'V'])) { 
			this._productList.push(188);  // 恐怖录像带
		}
		if (!$gameParty.hasItem($dataItems[43])) {
			this._productList.push(43);  // Ansuz符文
		}	
		if (!$gameParty.hasItem($dataItems[22]) && $gameSelfSwitches.value([1, 11, 'H'])) { 
			this._productList.push(22);  // 夏日套装
		}
		// 13合1洗发水
	    if (!$gameParty.hasItem($dataItems[184])) this._productList.push(184);	
		// 常规商品
		for (let i = 0; i < 10 + Math.randomInt(20); i++) {
			let id = dingk.Loot.calculateRandomItemIndex(191);
			this._productList.push(id);
		}
		// 作弊码商品
		const num1  = $gameParty.numItems($dataItems[410]);
		const value = QJ.MPMZ.tl.generateSecretCodeDescription({countResult: true});
		if (num1 >= value) return;
		const num2 = value - num1;
		for (let i = 0; i < num2; i++) {
			this._productList.push(410);
		}		
	}

};

// 神秘代码道具描述生成
QJ.MPMZ.tl.generateSecretCodeDescription = function (extra = {}) {

    const id = 21;
    const descTable = [
		  "hard2k1ll",
		  "get40rfree",
		  "6a1n60ld",
		  "healmeplz",
		  "unshatter",
		  "60dpat",
		  "muestacz",
		  "1f0g0ty0u",
		  "yes1mh0rny"
	];

    if (extra.countResult) {
		return descTable.length || 0;
	}

	const ITEM = $dataItems[id];
	const NUM  = $gameParty.numItems(ITEM);
    const ITEMDESC = window.itemsDescription?.[String(id)];
    const STYLE = "\\fn[Madou Futo Maru Gothic]\\fs[25]";
    const SEPARATOR = "  ";        // 段间分隔:两个空格
    const SEGMENTS_PER_LINE = 2;   // 每行容纳的段数(8 段分成 3+3+2 共 3 行)

    if (extra.popUp) {
	   if (!extra.backToInputScreen && !$gameSelfSwitches.value([1, 1, 'heatCodeTutorial'])) {
		  // 第一次打开时播放教程
		  $gameTemp.reserveCommonEvent(407);
		  return;
	   }	
	   const baseLines = ITEMDESC["howToUse"]
			? JSON.parse(JSON.stringify(ITEMDESC["howToUse"]))
			: [];
	   let lines = [...baseLines];
	   if (NUM > 0) {
		 for (let i = 1; i <= NUM; i++) {
				const tag = descTable[i-1];
				if (tag) {
				const textArray = ITEMDESC[tag];
				if (textArray) lines.push(textArray.join('\n'));
				}
		 }
	   } else {
		 const textArray = ITEMDESC["notUnlocked"];
		 if (textArray) lines.push(textArray.join('\n'));
	   }
	   const escapeBrackets = (s) => String(s)
	   .replace(/<</g, '&lt;&lt;')
	   .replace(/>>/g, '&gt;&gt;');	
	   alert (escapeBrackets(lines.join("\n")), { align: "left" });
	   if (extra.backToInputScreen) {
		   chahuiUtil.enterCheatCode?.();
	   }	   
	   return;
	}

    // 收集 code1 ~ code8 的文本
	if (NUM < 0) return;
    const segments = [];
	if (!$gameTemp._itemDescription21) {
		$gameTemp._itemDescription21 = JSON.parse(JSON.stringify(ITEMDESC["description"]));
	}
    for (let i = 1; i <= NUM; i++) {
        const text = descTable[i-1];
        segments.push(text);
    }

    // 按 SEGMENTS_PER_LINE 分组,每组合并为一行
    const lines = [];
    for (let i = 0; i < segments.length; i += SEGMENTS_PER_LINE) {
        const group = segments.slice(i, i + SEGMENTS_PER_LINE);
        lines.push(STYLE + group.join(SEPARATOR));
    }
	const newDescription = [
		...$gameTemp._itemDescription21,   // 备份的副本(展开)
		...lines                          // 新生成的行
	];
	ITEMDESC["description"] = newDescription;
};

// 召唤封印之柱
QJ.MPMZ.tl.summonSealingPillar = function(extra = {}) {

    if (extra.challengeSuccess) {
		let name = this.data.particleName;
		$gameScreen._particle.particleClear(name);
		return;
	}
		
	if (extra.tarotSummon) {
		
		let mapName = $dataMapInfos[$gameMap.mapId()]?.name;
		let nameWithoutNumbers = mapName.replace(/[0-9]/g, ''); 
		if ( !["浅层遗迹迷宫", "遗忘的墓穴"].includes(nameWithoutNumbers) )  {
			return false;
		}		
		if ( $gameMap.drill_COET_getEventsByTag_direct("pillar").length > 0 || $gameSelfSwitches.value([1, 121, 'A'])) {
			return false;
		}
		let condition = DrillUp.g_COFA_condition_list[10];
		const playerX = Math.floor($gamePlayer.centerRealX());
		const playerY = Math.floor($gamePlayer.centerRealY());
		let c_area    = $gameMap.drill_COFA_getShapePointsWithCondition(playerX, playerY, "圆形区域", 6, condition);
		if (c_area.length > 0) {
			let p     = c_area[Math.floor(Math.random() * c_area.length)];
			let eid   = $gameMap.spawnEventQJ(1, 121, p.x, p.y, false);
			$gameMap.event(eid)?.setOpacity(0);
			return true;
		} else {

		}
		return false;
	}
	
	if (extra.AbyssSummon) {
		QJ.SE.spawnRegionNum(1,121,[66],1,true);
		return;
	}	
};

// 封印之柱-解除封印
QJ.MPMZ.tl.sealingPillarDomainExpansion = function(cx, cy, range = 9) {

  function getOuterRingCoordsByCenterOddSize(cx, cy, size = 9) {
    if (size < 3 || size % 2 === 0) return [];

    const w = $gameMap.width();
    const h = $gameMap.height();
    const blocked = { 8: true, 250: true, 254: true, 255: true };

    const r = (size - 1) / 2;
    const x0 = cx - r, x1 = cx + r;
    const y0 = cy - r, y1 = cy + r;

    const out = [];
    function pushIfValid(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const rid = $gameMap.regionId(x, y);
      if (blocked[rid]) return;
      out.push({ x, y });
    }

    for (let x = x0; x <= x1; x++) pushIfValid(x, y0);
    for (let x = x0; x <= x1; x++) pushIfValid(x, y1);
    for (let y = y0 + 1; y <= y1 - 1; y++) pushIfValid(x0, y);
    for (let y = y0 + 1; y <= y1 - 1; y++) pushIfValid(x1, y);

    return out;
  }

  // 新增：获取围栏内部(不含外圈)的可用坐标池
  function getInnerCoordsByCenterOddSize(cx, cy, size = 9) {
    if (size < 3 || size % 2 === 0) return [];

    const w = $gameMap.width();
    const h = $gameMap.height();
    const blocked = { 8: true, 250: true, 254: true, 255: true };

    const r = (size - 1) / 2;
    const x0 = cx - r, x1 = cx + r;
    const y0 = cy - r, y1 = cy + r;

    const out = [];
    for (let x = x0 + 1; x <= x1 - 1; x++) {
      for (let y = y0 + 1; y <= y1 - 1; y++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const rid = $gameMap.regionId(x, y);
        if (blocked[rid]) continue;

        // 避免刷在玩家/已有事件上
        if ($gamePlayer.x === x && $gamePlayer.y === y) continue;
        if ($gameMap.eventsXy(x, y).length > 0) continue;

        // 粗略判定：至少有一个方向可通行（更像“能站人”）
        // 如果你项目里有更严格的可通行/地形判断，建议替换这里
        const passable =
          $gameMap.isPassable(x, y, 2) ||
          $gameMap.isPassable(x, y, 4) ||
          $gameMap.isPassable(x, y, 6) ||
          $gameMap.isPassable(x, y, 8);
        if (!passable) continue;

        out.push({ x, y });
      }
    }
    return out;
  }

  // 1) 先做外圈火焰围栏
  const coords = getOuterRingCoordsByCenterOddSize(cx, cy, range);
  for (let i = 0; i < coords.length; i++) {
    const p = coords[i];
    let name = "fire_pillar_c" + i;
    $gameScreen._particle.particleSet(0, name, 'tilemap', 'fire_pillar_c', 'above', p.x, p.y);
    $gameScreen._particle.particleUpdate([name, 'color', '#4a0000', '#8a1d00@0.6', '#ffb9ad']);
    let posX = (p.x + 0.5 - $gameMap.displayX()) * 48;
    let posY = (p.y + 0.5 - $gameMap.displayY()) * 48 - 24;

    QJ.MPMZ.Shoot({
      position: [['S', posX], ['S', posY]],
      initialRotation: ['S', 0],
      imgRotation: ['F'],
      groupName: ["firePillar"],
      particleName: name,
      moveType: ['S', 0],
      mapPassable: [false, false, false, false],
      collisionBox: ['R', 48, 64],
      existData: [
        { t: ['P'], a: ['F', QJ.MPMZ.tl.ex_playerDamageCheck, [12, 2, 8, 10]], c: ['T', 0, 10, true], p: [-1, false, true] },
        { t: ['G', ['"enemy"', '"object"']], a: ['F', QJ.MPMZ.tl.ex_burningEffect, [20]], p: [-1, true, true], c: ['T', 0, 10, true] },
      ]
    });
  }

  // 2) 新增：在围栏内部随机召唤怪
  const inner = getInnerCoordsByCenterOddSize(cx, cy, range);
  if (inner.length > 0) {
    const spawnCount = 5 + Math.randomInt(4); 

    // 随机抽点（不重复）
    const pool = inner.slice();
    for (let i = pool.length - 1; i > 0; i--) { // Fisher-Yates 洗牌
      const j = Math.randomInt(i + 1);
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }

    const n = Math.min(spawnCount, pool.length);
	const specialIndex = Math.randomInt(n);
    for (let k = 0; k < n; k++) {
      const s = pool[k];
	  const enemyTemplateId = (k === specialIndex) ? 29 : 22;
      let eid = $gameMap.spawnEventQJ(1, enemyTemplateId, s.x, s.y, false);
	  let e   = $gameMap.event(eid);
	  if (e) {
		  e._pillarSummon = true;
		  $gameSelfVariables.setValue([$gameMap.mapId(), eid, 'enemyLevel'], 200+Math.randomInt(200));
		  setTimeout(() => e.enterChaseState(), 1000);		  
	  }
    }
  }
};

// 拍立得收藏集数量检查
QJ.MPMZ.tl.checkPolaroidCount = function() {
    
    let count = 0;
    for (let id = 200; id <= 234; id++) {
      if ($gameParty.hasItem($dataItems[id], false)) count++;
    }

	// 失去全收集道具时要同时没收道具
    if (count === 35 && !$gameParty.hasItem($dataItems[236], false) && $gameSwitches.value(474)) {	
        for (let id = 200; id <= 234; id++) {
          $gameParty.gainItem($dataItems[id], -1);
        }
       // 重新计算收集情况
       count = 0;
       for (let id = 200; id <= 234; id++) {
         if ($gameParty.hasItem($dataItems[id], false)) count++;
       }	   
	}
	
	if (count > 0 && count < 35 && !$gameParty.hasItem($dataItems[235], false)) {
		$gameParty.gainItem($dataItems[235], 1);
		$gameParty.gainItem($dataItems[236], -1);
	}
	
	if (count === 35 && !$gameParty.hasItem($dataItems[236], false)) {
		$gameParty.gainItem($dataItems[235], -1);
		$gameParty.gainItem($dataItems[236], 1);
		if (!$gameSwitches.value(474)) {
		  $gameSwitches.setValue(474, true);
		  $gameParty.leader().addLuk(35);		
		}
	}
	
    return count;
	
};

// 篝火音效音量变化
QJ.MPMZ.tl.bonfireSoundVolumeChange = function(eid) {
    
	let target = $gameMap.event(eid);
	if (!target) return;

    $gameTemp._drill_ESo_event = eid;
    $gameTemp._drill_ESo_isOff = $gameTemp._drill_ESo_nextSEOff;
	$gameTemp._drill_ESo_nextSEOff = false;
    let volume = 60;
    let se = { name: "木が燃える音", volume: volume, pitch: 100, pan: 0 };
    AudioManager.playSe(se);
	
};

// 忍者的肚子咕噜声
QJ.MPMZ.tl.weirdBellyBuzzingSound = function(eid) {
	if (!$dataMap || $gamePlayer.isTransferring()) return;

	let target = $gameMap.event(eid);
	if (!target) return;
	// 标记子弹
	 const randomX = Math.randomInt(1600) - 300;
	 const name = 'guuuu' + randomX;
     let bullet = QJ.MPMZ.Shoot({
        img:"null1",
		groupName: [name],
		position:[['S',randomX],['S',0]],
        initialRotation:['S',0],
		imgRotation:['F'],
		onScreen:true,
        moveType:['S',0],
        scale:0.5,
        existData:[
        {t:['Time',61]}	
		],
	});
	if (!bullet) return;
	
	let index = bullet.index;	
	let posX = target.screenBoxXShowQJ();
	let posY = target.screenBoxYShowQJ();
	let distance = $gamePlayer.calcDistance(eid);
	let opacityMax = 100;
    if (distance > 96) {
        opacityMax -= Math.floor((distance - 96) / 3);
    }
	opacityMax *= 0.01;
	if (opacityMax <= 0) opacityMax = 0.1;
    QJ.MPMZ.Shoot({
        img:"guuuu",
		position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
		imgRotation:['S',0],
        moveType:['TB',name,0.9,10,20],
		opacity:`0|0~70/${opacityMax}~80/0`,
        scale:'0|0.2~150/0.8',
		z:"W",
        existData:[
          {t:['Time',150],d:[0,10]}	
        ],
		moveF:[
		  //[90,999,QJ.MPMZ.tl.ex_sushiPuddingSummonAki]
		],
		timeline:['S',0,10,[-1,4,5]],
    });		
    // 肚子饿了的音效
    let random = 1 + Math.randomInt(4);
    let seName = "Hungry03-" + random;
    let randomPitch = Math.randomInt(40) + 80;

    // 计算音量
    let volume = 50;
    if (distance > 96) {
        volume -= Math.floor((distance - 96) / 6);
    }
    if (volume <= 0) return; // 音量为0则不播放
    let se = { name: seName, volume: volume, pitch: randomPitch, pan: 0 };
    AudioManager.playSe(se);
	
};


//召唤星之门的前置工作
QJ.MPMZ.tl.ex_summonStarDoorPreset = function () {
	
    var gachagacha = QJ.MPMZ.Shoot({
       img:"object_name/StarDoor",
	   groupName: ['summonStarDoor'],
	   position:[['M'],['M']],
       initialRotation:['S',0],
       imgRotation:['F'],
	   moveType:['D',true],
	   opacity: '0|0.6~60/0.2~60/0.6',
       existData:[
         {t:['S','TouchInput.drill_isRightPressed()||TouchInput.drill_isRightTriggered()',true],d:[0,10]}, 		
       ],
	   moveF: [
	     [6,6,QJ.MPMZ.tl.ex_summonPointDetection,[null,"StarDoor"]]
	   ],
	   z:"MF_UG"
    });
    if ($gameMap.getGroupBulletListQJ('chantingTarotCard').length > 0) {	
	   var index = $gameMap.getGroupBulletListQJ('chantingTarotCard')[0];
        QJ.MPMZ.Laser({
			imgPoint:'null1',
			img:"electricity[4,5]",
			rotation:['BT',index],
			position:[['M'],['M']],
			judgeWidth:10,
			judgeMode:['W',5],
			blendMode:0,
			opacity: '0|0.9~60/0.35~60/0.9',
			rotationStatic:false,
	        positionStatic:false,
			positionSpread:0,
            z:"MF_UG",
			length:['D',['M'],['M'],['B',index],['B',index]],
            existData:[
			    { t: ['BE', index] },
			],
        });	
	}
};

//召唤扭蛋机的前置工作
QJ.MPMZ.tl.ex_summonGachaMachinePreset = function () {
	
    var gachagacha = QJ.MPMZ.Shoot({
       img:"object_name/gachagacha",
	   groupName: ['summonGachaMachine'],
	   position:[['M'],['M']],
       initialRotation:['S',0],
       imgRotation:['F'],
	   moveType:['D',true],
	   opacity: '0|0.6~60/0.2~60/0.6',
       existData:[
         {t:['S','TouchInput.drill_isRightPressed()||TouchInput.drill_isRightTriggered()',true],d:[0,10]}, 		
       ],
	   moveF: [
	     [6,6,QJ.MPMZ.tl.ex_summonPointDetection,[null,"gachagacha"]]
	   ],
	   z:"MF_UG"
    });
    if ($gameMap.getGroupBulletListQJ('chantingTarotCard').length > 0) {	
	   var index = $gameMap.getGroupBulletListQJ('chantingTarotCard')[0];
        QJ.MPMZ.Laser({
			imgPoint:'null1',
			img:"electricity[4,5]",
			rotation:['BT',index],
			position:[['M'],['M']],
			judgeWidth:10,
			judgeMode:['W',5],
			blendMode:1,
			opacity: '0|0.9~60/0.35~60/0.9',
			rotationStatic:false,
	        positionStatic:false,
			positionSpread:0,
            z:"MF_UG",
			length:['D',['M'],['M'],['B',index],['B',index]],
            existData:[
			    { t: ['BE', index] },
			],
        });	
	}
};

QJ.MPMZ.tl.ex_summonPointDetection = function (result,type) {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}	

    if (result && result == "succeed") {
		QJ.MPMZ.deleteProjectile("chantingTarotCard",{d:[1,30,1.5]});
		  if (type && type == "gachagacha") {
		    QJ.MPMZ.deleteProjectile("summonGachaMachine",{a:['F',QJ.MPMZ.tl.ex_summonGachaMachine],d:[0,30]});
		  }
		  if (type && type == "StarDoor") {
		    QJ.MPMZ.deleteProjectile("summonStarDoor",{a:['F',QJ.MPMZ.tl.ex_summonGateOfStars],d:[0,30]});
		  }		  
		 return;	   
	}

    if (result && result == "defeated") {
           const lang = ConfigManager.language;
           var BulletText;
           switch(lang) {
              case 0:
			  case 12:
              BulletText = "\\c[10]\\dDCOG[11:2:2:2]\\fs[28]这里无法进行召唤！!";
			  break;
			  case 1:
              BulletText = "\\c[10]\\dDCOG[11:2:2:2]\\fs[28]ここでは召喚できない！！"
              break;
              default:
              BulletText = "\\c[10]\\dDCOG[11:2:2:2]\\fs[28]Summoning is not possible here!!"
              break;
           }		
		   this._coolDown = 10;
		   var posX = this.inheritX() * $gameScreen.zoomScale();
           var posY = ( this.inheritY() - 36 ) * $gameScreen.zoomScale();	
           $gameTemp.drill_GFTT_createSimple( [posX,posY], BulletText, 5, 0, 120);
           AudioManager.playSe({ name: "012myuu_YumeSE_SystemBuzzer01", volume: 70, pitch: 100, pan: 0 });		   
		   return;
	}
	
	if (TouchInput.drill_isLeftPressed() || TouchInput.drill_isLeftTriggered()) {
		this._coolDown = 4;
    QJ.MPMZ.Shoot({
       img:"null1",
	   position:[['M'],['M']],
       initialRotation:['S',0],
       imgRotation:['F'],
	   moveType:['S',0],
	   collisionBox:['C',27],
	   anchor:[0.55,0.25],
       existData:[
	      {t:['Time',10],a:['F',QJ.MPMZ.tl.ex_summonPointDetection,["succeed",type]]},
          {t:['NP'],a:['F',QJ.MPMZ.tl.ex_summonPointDetection,["defeated",type]]}, 	
		  {t:['P'],a:['F',QJ.MPMZ.tl.ex_summonPointDetection,["defeated",type]]}, 
          {t:['G',['"enemy"','"object"','NPC']],a:['F',QJ.MPMZ.tl.ex_summonPointDetection,["defeated",type]]},		  
       ],
    });

	}
};

//星之门召唤
QJ.MPMZ.tl.ex_summonGateOfStars = function() {  

   if ($gameMap.drill_COET_getEventsByTag_direct("星之门").length > 0 ) {
	   return false; 
   }
	   var xx = (this.x - 36) / 48;
	   var yy = (this.y + 3) / 48;
       var eid = $gameMap.spawnEventQJ(1,47,xx,yy,false);
       $gameMap.event(eid)?.setOpacity(0);
};

//召唤扭蛋机
QJ.MPMZ.tl.ex_summonGachaMachine = function () {
	   var xx = (this.x - 24) / 48;
	   var yy = (this.y - 1) / 48;
       var eid = $gameMap.spawnEventQJ(1,32,xx,yy,true);
       $gameMap.event(eid)?.setOpacity(0);
};

//生成树上的采集物
QJ.MPMZ.tl.ex_treeHarvestables = function (item, count) {
    if (!this) return;
    let eid = this._eventId;
    if (DataManager.isItem(item) || DataManager.isWeapon(item) || DataManager.isArmor(item)) {
        if (!count) count = Math.randomInt(5) + 0;
        if (count < 1) return;
        const eveX = $gameMap.event(eid).centerRealX();
        const eveY = $gameMap.event(eid).centerRealY();

        // 定义最小距离和尝试次数
        const minDistance = 0.8;  // 最小间隔距离，可根据需要调整
        const maxTries = 20;      // 最大尝试次数
        const placedPositions = []; // 记录已经放置的果实坐标

        for (let i = 0; i < count; i++) {
            let posX, posY;
            let foundPosition = false;

            // 多次尝试寻找合适的坐标
            for (let attempt = 0; attempt < maxTries; attempt++) {
                const xx = (1.6 * Math.random()) - 1.2;
                const yy = (-1.4 * Math.random()) - 1.4;
                const tryX = eveX + xx;
                const tryY = eveY + yy;

                // 检查与已放置果实的距离
                let tooClose = false;
                for (const [px, py] of placedPositions) {
                    const dx = tryX - px;
                    const dy = tryY - py;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < minDistance) {
                        tooClose = true;
                        break;
                    }
                }

                if (!tooClose) {
                    // 找到了满足距离要求的坐标
                    posX = tryX;
                    posY = tryY;
                    foundPosition = true;
                    break;
                }
            }

            // 如果尝试多次仍未找到合适坐标，就直接使用最后一次随机生成的结果
            if (!foundPosition) {
                const xx = (1.6 * Math.random()) - 1.2;
                const yy = (-1.4 * Math.random()) - 1.4;
                posX = eveX + xx;
                posY = eveY + yy;
            }

            // 创建果实事件
            const tagName = "Harvestables" + eid;
            const copy = $gameMap.spawnEventQJ(1, 86, posX, posY, true);
            const e = $gameMap.event(copy);
            if (!e) return;
            e._opacity = 0;
            e.drill_COET_addTag(tagName);
            $gameSelfVariables.setValue([$gameMap.mapId(), copy, "HP"], 40);

			e._dropItemId = item.id;
			
			if (DataManager.isItem(item)) {
				e._dropItemType = 0;      
			} else if (DataManager.isWeapon(item)) {
				e._dropItemType = 1;  
			} else if (DataManager.isArmor(item)) {
				e._dropItemType = 2;
			}

            $gameSelfVariables.setValue([$gameMap.mapId(), copy, "fudou"], 99);
            $gameSelfSwitches.setValue([$gameMap.mapId(), copy, "A"], true);

            const iconIndex = "$DrillEIIconSet_" + item.iconIndex;
            e.setImage(iconIndex, e._characterIndex);
            e._opacity = 255;

            // 将已放置的果实坐标记录下来
            placedPositions.push([posX, posY]);
        }
    }
};

//树上的采集物掉落
QJ.MPMZ.tl.ex_treeHarvestableDrops = function(drop) {
	
	let XX = this.x / 48;
	let YY = this.y / 48;
            // 正常掉落生成
            let text;

			var eid = $gameMap.spawnEventQJ(1,85,XX,YY,true);
			var e = $gameMap.event(eid);

            e._opacity = 0;
            $gameSelfVariables.setValue([$gameMap.mapId(), e._eventId, 'dropsId'], drop.id);

            if (DataManager.isItem(drop)) {
                $gameSelfVariables.setValue([$gameMap.mapId(), e._eventId, 'dropsType'], 1);
                //text = "\\fs[14]\\dDCOG[11:2:2:2]\\si[" + drop.id + "]";
            } else if (DataManager.isWeapon(drop)) {
                $gameSelfVariables.setValue([$gameMap.mapId(), e._eventId, 'dropsType'], 2);
                //text = "\\fs[14]\\dDCOG[11:2:2:2]\\sw[" + drop.id + "]";
            } else if (DataManager.isArmor(drop)) {
                $gameSelfVariables.setValue([$gameMap.mapId(), e._eventId, 'dropsType'], 3);
               // text = "\\fs[14]\\dDCOG[11:2:2:2]\\sa[" + drop.id + "]";
            }

            $gameSelfSwitches.setValue([$gameMap.mapId(), e._eventId, 'A'], true);
            var iconIndex = "$DrillEIIconSet_" + drop.iconIndex;
            e.setImage(iconIndex, e._characterIndex);
            e._opacity = 255;

            //e.setMiniLabelText(text);

            var condition = DrillUp.g_COFA_condition_list[10];
            var c_area = $gameMap.drill_COFA_getShapePointsWithCondition(XX, YY, "圆形区域", 3, condition);
            if (c_area.length > 0) {
                var p = c_area[Math.floor(Math.random() * c_area.length)];
                var xPlus = p.x - XX;
                var yPlus = p.y - YY;
                e.jump(xPlus, yPlus);
            } else {
                e.jump(0, 0);
            }

            var se = { name: "Heal1", volume: 60, pitch: 130, pan: 0 };
            AudioManager.playSe(se);	
};		
	
	
//星之门传送
QJ.MPMZ.tl.ex_starGateTeleportationObject = function(extra = {},args) {

	if (extra.isAbsorbed) {
		 if (args.target && args.target instanceof Game_Event) {
			 
			 if (args.target.drill_COET_hasTag("星之门")) return;			 
				args.target.drill_EFOE_playHidingHorizonFlat( 20,1.5, false );
				var se = { name: "Darkness3", volume: 90, pitch: 100, pan: 0 };
				AudioManager.playSe(se);

				let EID = args.target._eventId;
				let Event = "event:" + EID;
				let Ename = "monster_sp-" + EID;
				let Ecode = "$gameMap.eraseEvent(" + EID + ")";
				$gameScreen._particle.particleSet(0,Ename,Event,"monster_sp");
				QJ.MPMZ.Shoot({
							moveType:['D',false],
							existData:[
								{t:['Time',20],a:['S',Ecode]}, 		
							],
				});		  
				return;		 
		 }

		if (args.bulletTarget && args.bulletTarget instanceof Game_QJBulletMZ) {

			  this._hitcount = this._hitcount || 0;
			  this._hitcount += 1;
			  args.bulletTarget.setDead({t:['Time',0],d:[1,15,0.1]})			   		 			 
		 }
		 return;
	}
	
	if (extra.SuccessfullyStolen) {
		if (args.target && args.target instanceof Game_Event) {
		    if (args.target.isJumping() || args.target._SuccessfullyStolen) return;
			args.target._SuccessfullyStolen = true;
		    args.target.steupCEQJ(2, {SuccessfullyStolen:true});
		}
		return;
	}
	
    if (!this || !(this instanceof Game_Event)) return;
	let eid   = this._eventId;
	let Ecode = `$gameMap.event(${eid})?.start()`;
    let posX = this.screenBoxXShowQJ();
	let posY = this.screenBoxYShowQJ();	
        QJ.MPMZ.Shoot({
            groupName: ['tarot', 'starGate'],
            position:[['S',posX],['S',posY]],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            blendMode: 0,
            opacity: 1,
            scale: 1,
            anchor: [0.5, 0.5],
            moveType: ['S', 0],
            collisionBox: ['C', 20],
            existData: [
			  {t:['P'],a:['S',Ecode],c:['S','this.time > 30'],p:[-1,true,true],cb:['C',8]},
			  {t:['G',['goods']], a:['F',QJ.MPMZ.tl.ex_starGateTeleportationObject,[{SuccessfullyStolen:true}]],p:[-1,true,true], c: ['T', 0, 10, true]},
			  {t:['G',['"object"','"NPC"','object']],a:['F',QJ.MPMZ.tl.ex_starGateTeleportationObject,[{isAbsorbed:true}]],p:[-1,true,true]},
			  {t:['B',['playerBullet','evemyBullet']],a:['F',QJ.MPMZ.tl.ex_starGateTeleportationObject,[{isAbsorbed:true}]],p:[-1,true,true]},
			],
			moveF:[
			  [15,15,QJ.MPMZ.tl.ex_starGateDurabilityCheck]
			]
        });   		
};

//星之门耐久度检测
QJ.MPMZ.tl.ex_starGateDurabilityCheck = function() {
    this._hitcount = this._hitcount || 0;
	if ( this._hitcount > 10 && this._hitcount < 30) {
		if ( $gameMap.drill_COET_getEventsByTag_direct("星之门").length > 0 ) {
			let gate = $gameMap.drill_COET_getEventsByTag_direct("星之门")[0];
			this._hitcount = 99;
			$gameMap.event(gate._eventId).steupCEQJ(4);
		}
	}
};

//星之门传送效果-已被废弃
QJ.MPMZ.tl.ex_starGateTeleportationObjectEffect = function(args) {

     if (args.target && args.target instanceof Game_Event) {
		 
		 if (args.target.drill_COET_hasTag("星之门")) return;
		 
		 args.target.drill_EFOE_playHidingHorizonFlat( 20,1.5, false );
		 var se = { name: "Darkness3", volume: 90, pitch: 100, pan: 0 };
		 AudioManager.playSe(se);

		  let EID = args.target._eventId;
		  let Event = "event:" + EID;
		  let Ename = "monster_sp-" + EID;
		  let Ecode = "$gameMap.eraseEvent(" + EID + ")";
		  $gameScreen._particle.particleSet(0,Ename,Event,"monster_sp");
       QJ.MPMZ.Shoot({
        img:"null1",
        moveType:['D',false],
        existData:[
            {t:['Time',20],a:['S',Ecode]}, 		
          ],
        });		  
		  
		  return;		 
	 }

    if (args.bulletTarget && args.bulletTarget instanceof Game_QJBulletMZ) {

		  this._hitcount = this._hitcount || 0;
		  this._hitcount += 1;
	      args.bulletTarget.setDead({t:['Time',0],d:[1,15,0.1]})			   		 
		  return;
	 }

};
//塔罗牌激活演出
QJ.MPMZ.tl.ex_chantingTarotCard = function(imgIndex,itemId,starDoor=false) {

   if (!imgIndex) {
	   imgIndex = $gameParty.lastItem().iconIndex;
   }
   if (!itemId) {
	   itemId = $gameParty.lastItem().id;
   }   
   let posX = "$gamePlayer.screenBoxXShowQJ() + 1";
   let posY = "$gamePlayer.screenBoxYShowQJ() - 30";  
 
   var iconScale = 0.4;
   if (Utils.isMobileDevice()) iconScale = 0.8;
   
   var card = QJ.MPMZ.Shoot({
        img:['I',imgIndex],
		groupName: ['chantingTarotCard'],
		position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
		imgRotation:['F'],
        moveType:['D',true],
        scale:0.4,
        existData:[
        ],
		deadJS:["$gameSystem._drill_PAlM_enabled = true;$gamePlayer.drill_EASA_setEnabled(true);$gameSwitches.setValue(14, false)"]
    });
	if (!card) return;
	// 皇帝
	if (itemId == 50) {
	  card.addExistData({t:['Time',60],d:[1,30,20]});
      return;	  
	}
	// 战车
	if (itemId == 53) {
	   QJ.MPMZ.tl.ex_chahuiExpressPreprocess();	
  
	}	
	// 节制
	if (itemId == 60) {
	  card.addExistData({t:['S','TouchInput.drill_isRightPressed()||TouchInput.drill_isRightTriggered()',true],d:[1,30,1.5]});
      return;	  
	}
	// 星
	if (itemId == 63 && starDoor) {
	  card.addExistData({t:['S','TouchInput.drill_isRightPressed()||TouchInput.drill_isRightTriggered()',true],d:[1,30,1.5]});
      return;	  
	}	
    // 默认效果	
	  card.addExistData({t:['Time',60],d:[1,30,1.5]});
};

//塔罗牌"日"：火鸟的祝福
QJ.MPMZ.tl.ex_fireBirdBlessing = function() {

     	var se = { name: "Fire1", volume: 80, pitch: 50, pan: 0 };
        AudioManager.playSe(se);

        QJ.MPMZ.Shoot({
            groupName: ['tarot', 'fireBirdBlessing'],
            img: "Minto_Magic_90[5,14,2]",
            position: [['P'], ['P']],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            blendMode: 3,
            opacity: 1,
            scale: 1,
            anchor: [0.5, 0.5],
            moveType: ['D', true],
            collisionBox: ['C', 1],
            existData: [
			{ t: ['Time', 138] }
			],
			moveF:[
			   [80,999,QJ.MPMZ.tl.ex_fireBirdBlessingEffect]
			]
        });   

};

QJ.MPMZ.tl.ex_fireBirdBlessingEffect = function() {

    var se = { name: "Fire3", volume: 80, pitch: 60, pan: 0 };
    AudioManager.playSe(se);
	
    if ($gameSystem.hasGameTimeEvent("state77")) {
        $gameParty.leader().addState(77);
        $gameSystem.adjustGameTimeEventDelay('state77', 15, true);
    } else {
	    $gameScreen._particle.particleSet(0,'fireBirdBlessing','player','sparks_c');
        $gameParty.leader().addState(77);
        $gameSystem.addGameTimeEvent({
            key: 'state77',
            command: 'remove',
            delayMinutes: 15,
            target: 77,
            condition: 'true'
        });
    }	
	
	//$gameScreen._particle.particleClear('fireBirdBlessing')
	
};

//龙吼魔法
QJ.MPMZ.tl.ex_dragonShouts = function() {

	let posX = $gamePlayer.screenBoxXShowQJ() * $gameScreen.zoomScale();
	let posY = $gamePlayer.screenBoxYShowQJ() * $gameScreen.zoomScale();
	let id = "zoomBlur-T";
	$gameMap.createFilter(id, "zoomblur", 1);
	$gameMap.setFilter( id ,[posX,posY,0,0]);
	$gameMap.moveFilter(id, [posX,posY,0,0.3], 40);
	$gameMap.eraseFilterAfterMove(id);
	
    QJ.MPMZ.Shoot({
		groupName:['tarot','Shouts'],
        position:[['P'],['P']],
        initialRotation:['S',0],
        moveType:['S',0],
        imgRotation:['F'],
        existData:[	
			{t:['Time',40]},
			{t:['G',['"enemy"']], a:['S',`QJ.MPMZ.tl.ex_enemyDizzy.call(target, 360)`], p:[-1,true,true]},
			{t:['G',['"NPC"']], a:['C',239,[0,0,0]], p:[-1,true,true]},
        ],
		collisionBox:['C',450],
    });
};

//卢恩之石:Raido
QJ.MPMZ.tl.ex_runes_Raido = function(extra={}) {

    if (extra.check) {
		if (TouchInput.drill_isLeftPressed()) {
			QJ.MPMZ.Shoot({
				groupName:['RaidoCheck'],
				position:[['M'],['M']],
				initialRotation:['S',0],
				scale:1,
				moveType:['S',0],
				opacity:1,
				blendMode:0,
				imgRotation:['F'],
				anchor:[0.5,0.5],
				existData:[
					{t:['Time',10]},
					{t:['G',['Raido']],a:['EP',3]},
				],
				collisionBox:['C',5],
			});
		}
		return;		
	}

	let deadCode = "!$gameMap.event(" + this._eventId + ")";
	let eraseCode = "$gameMap.eraseEvent(" + this._eventId + ")";
	
	QJ.MPMZ.Shoot({
		groupName:['runes','Raido'],
        position:[['E',0],['E',0]],
        initialRotation:['S',0],
        scale:1,
        moveType:['D',true],
        opacity:1,
        blendMode:0,
        imgRotation:['F'],
        anchor:[0.5,0.5],
        existData:[
            {t:['Time',3600],a:['S',eraseCode],d:[0,30]},
			{t:['S',deadCode,true]},
        ],
        moveF:[
          [60,2,QJ.MPMZ.tl.ex_runes_Raido, [{check:true}]]
        ],
		collisionBox:['C',10],
    });
};

//卢恩之石:Fehu
QJ.MPMZ.tl.ex_runes_Fehu = function(extra={}, args) {

   if (extra.check) {
	    let posX = this.screenBoxXShowQJ();
		let posY = this.screenBoxYShowQJ();
		let eId  = this._eventId;
		let code = `$gameSelfVariables.value([$gameMap.mapId(), ${eId}, 'HP']) <=0||$gameSelfSwitches.value([$gameMap.mapId(), ${eId}, 'D'])`;
		QJ.MPMZ.Shoot({
			groupName:['runes','Fehu'],
			position:[['S',posX],['S',posY]],
			moveType:['S', 0],
			existData:[	
				{t:['Time', 300]},
				{t:['S', code, true], a:['S', `$gameMap.steupCEQJ(278,${eId}, {intoCurrency:true})`]},
			]
		});	
        return;
   }	

   if (extra.intoGolden) {
		let eid = args.target._eventId;
		let id = "adjustment" + eid;
		let filterTarget = 4000 + eid;
		if (args.target?.drill_COET_hasTag("免疫异常")) return;
		AudioManager.playSe({ name: "凍りつく時の効果音「キーーーン」", volume: 60, pitch: 80, pan: 0 });
		$gameMap.createFilter(id, "adjustment", filterTarget);
		$gameMap.setFilter( id ,[1,1,1,2,0.9,0.8,0,1]);
		$gameMap.moveFilter(id, [1,1,1,2,0.9,0.8,0,1], 300);
        $gameMap.eraseFilterAfterMove(id);
		$gameSelfSwitches.setValue([$gameMap.mapId(), eid, 'G'], true);
		if (args.target) {
			// 记录并改变目标的受体属性
			args.target._oldGroup = args.target._groupListQJ;
			args.target._groupListQJ = ['"object"'];
            $gameMap.refreshUpdateBoxDataQJ();
			QJ.MPMZ.tl.ex_runes_Fehu.call(args.target, {check:true});
		}
		$gameMap.steupCEQJ(278,eid);
        return;
   }

   if (extra.FehuShoot) {
		$gamePlayer.drill_EASA_setEnabled( true );
		let ImgIndex = $gameParty.lastItem().iconIndex; 
		let collisionBox = 32;
		if (extra.scale > 0.5) collisionBox = 16;
		QJ.MPMZ.Shoot({
			groupName:['runes','Fehu'],
			img:['I',ImgIndex],
			position:[['P'],['P']],
			initialRotation:['M'],
			moveType:['S','0|9~120/0~999/0'],
			scale: extra.scale ? extra.scale : 0.5,
			imgRotation:['R',16,true],
			existData:[	
				{t:['Time',120]},
				{t:['R',[255]]},
				{t:['G',['"enemy"','"object"']], a:['F',QJ.MPMZ.tl.ex_runes_Fehu,[{intoGolden:true}]], d:[1,30,2]}
			],
			collisionBox:['C',collisionBox],
		});	
	    return;
   }

   let ImgIndex = $gameParty.lastItem().iconIndex;
   let time = 15;
   let scale = 0.5;
   if (Utils.isMobileDevice()) {
	   time = 45;
	   scale = 1;
   }
   QJ.MPMZ.Shoot({
        img:['I',ImgIndex],
		position:[['P'],['P']],
        initialRotation:['S',0],
		imgRotation:['F'],
        moveType:['B',-1,0,-30,0,-30,0,-30,0,-30],
        scale:scale,
        existData:[
			{t:['Time',1200]},
			{t:['S','TouchInput.drill_isLeftPressed()',true], a:['F',QJ.MPMZ.tl.ex_runes_Fehu,[{FehuShoot:true,scale}]], c: ['S', `this.time > ${time}`]},  
        ],
		trailEffect:[],
    });
	
};

//卢恩之石:Kenaz
QJ.MPMZ.tl.ex_runes_Kenaz = function(extra={}) {
   
   if (extra.KenazShoot) {
		$gamePlayer.drill_EASA_setEnabled( true );
		let ImgIndex = $gameParty.lastItem().iconIndex; 
		let collisionBox = 32;
		if (extra.scale > 0.5) collisionBox = 16;		
		QJ.MPMZ.Shoot({
			groupName:['runes','Ehwaz'],
			img:['I',ImgIndex],
			position:[['P'],['P']],
			initialRotation:['M'],
			moveType:['S','0|9~120/0~999/0'],
			scale: extra.scale ? extra.scale : 0.5,
			imgRotation:['R',16,true],
			existData:[	
			{t:['Time',120]},
			{t:['R',[255]]},
			{t:['G',['"enemy"','"object"']],a:['S','QJ.MPMZ.tl.ex_turnIntoBomb.call(this,target)'], d:[1,30,2]}
			],
			collisionBox:['C',collisionBox],
		});	
	    return;
   }

   let ImgIndex = $gameParty.lastItem().iconIndex; 
   let time = 15;
   let scale = 0.5;
   if (Utils.isMobileDevice()) {
	   time = 45;
	   scale = 1;
   }     
   QJ.MPMZ.Shoot({
        img:['I',ImgIndex],
		position:[['P'],['P']],
        initialRotation:['S',0],
		imgRotation:['F'],
        moveType:['B',-1,0,-30,0,-30,0,-30,0,-30],
        scale,
        existData:[
			{t:['Time',1200]},
			{t:['S','TouchInput.drill_isLeftPressed()',true],a:['F',QJ.MPMZ.tl.ex_runes_Kenaz,[{KenazShoot:true,scale}]], c: ['S', `this.time > ${time}`]},  
        ],
		trailEffect:[],
    });
	
};

// 变成炸弹
QJ.MPMZ.tl.ex_turnIntoBomb = function(target) {
	
	  if (target instanceof Game_Event) {
		  let eid = target._eventId;
		  let id = "adjustment" + eid;
		  let filterTarget = 4000 + eid;
		  $gameMap.createFilter(id, "adjustment", filterTarget);
		  $gameMap.setFilter( id ,[1,1,1,1,1,1,1,1]);
		  $gameMap.moveFilter(id, [1,1,1,2,0.6,0,0,1], 180);
		  let scale = 1;
		  if (target._boxBodyQJ) {
			  if (target._boxBodyQJ.type === 1) {
				 scale = (target._boxBodyQJ.w + target._boxBodyQJ.h) / 64; 
			  } else {
				 scale = target._boxBodyQJ.r / 20; 
			  }
		  }
		  let code = "QJ.MPMZ.tl.ex_JackBomb(" + eid + ",1,"+ scale +")";

		  let se = { name: "爆弾の燃焼", volume: 70, pitch: 100, pan: 0 };
		  AudioManager.playSe(se);
          
		  let posX = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootXQJ() : $gameMap.displayX()`;
		  let posY = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootYQJ()-12 : $gameMap.displayY()`;
		  QJ.MPMZ.Shoot({
   		      //img: ["I",1093], 
			  moveType: ['D', true],
   		      scale:0.4, 
			  anchor:[0.5,1], 
			  initialRotation: ['S', 0],
    	      position: [['S',posX], ['S',posY]], 
			  imgRotation: ['F'],
   		      groupName: ['turnIntoBomb'], 
			  collisionBox: ['C', 6],
			  //timeline:['S',0,12,[-1,1,6]],
   		      existData: [
      		      //{ t:['G',['"enemy"','"object"']], a:['F',QJ.MPMZ.tl.ex_JackBombExplode,[1]], c:['S','this.time > 180'] }
				  { t:['Time',180] }
   		      ],
			  deadJS:[
                  `let id = "adjustment" + ${eid};$gameMap.eraseFilter(id);
				  AudioManager.playSe({ name: "Explosion2", volume: 85, pitch: 100, pan: 0 });
				  ${code}`			  
			  ]
		  });
	 }	
};

//卢恩之石:Ehwaz
QJ.MPMZ.tl.ex_runes_Ehwaz = function(extra={},args) {

   if (extra.EhwazShoot) {
		$gamePlayer.drill_EASA_setEnabled( true );
		let ImgIndex = $gameParty.lastItem().iconIndex; 
		let collisionBox = 32;
		if (extra.scale > 0.5) collisionBox = 16;			
		QJ.MPMZ.Shoot({
			groupName:['runes','Ehwaz'],
			img:['I',ImgIndex],
			position:[['P'],['P']],
			initialRotation:['M'],
			moveType:['S','0|9~120/0~999/0'],
			scale: extra.scale ? extra.scale : 0.5,
			imgRotation:['R',16,true],
			existData:[	
				{t:['Time',120]},
				{t:['NP']},
				//{t:['G',['"enemy"','"NPC"']],a:['S','QJ.MPMZ.tl.ex_runes_EhwazSwap.call(this,target)']}
				{t:['G',['"enemy"','"NPC"']],a:['F',QJ.MPMZ.tl.ex_runes_Ehwaz, [{EhwazSwap:true}]]}
			],
			collisionBox:['C',collisionBox],
		});	   
	   return;
   }	

   if (extra.EhwazSwap) {
		let AX = args.target.centerRealX(); 
		let AY = args.target.centerRealY();
		let BX = $gamePlayer.centerRealX(); 
		let BY = $gamePlayer.centerRealY();

		let se = { name: "Darkness3", volume: 90, pitch: 100, pan: 0 };
		AudioManager.playSe(se);

		let EID = args.target._eventId;
		let Event = "event:" + EID;
		let Ename = "monster_sp-" + EID;
		$gameScreen._particle.particleSet(0,Ename,Event,"monster_sp");
		$gameScreen._particle.particleSet(0,"monster_sp-P","player","monster_sp");
		$gamePlayer.locate(AX, AY);
		args.target.locate(BX, BY);
	    return;
   }

   let ImgIndex = $gameParty.lastItem().iconIndex; 
   let time = 15;
   let scale = 0.5;
   if (Utils.isMobileDevice()) {
	   time = 45;
	   scale = 1;
   }          
   QJ.MPMZ.Shoot({
        img:['I',ImgIndex],
		position:[['P'],['P']],
        initialRotation:['S',0],
		imgRotation:['F'],
        moveType:['B',-1,0,-30,0,-30,0,-30,0,-30],
        scale:scale,
        existData:[
        {t:['Time',1200]},
		{t:['S','TouchInput.drill_isLeftPressed()',true],a:['F',QJ.MPMZ.tl.ex_runes_Ehwaz, [{EhwazShoot:true,scale}]], c: ['S', `this.time > ${time}`]},  
        ],
		trailEffect:[],
    });
	
};

//爆炸物
QJ.MPMZ.tl.ex_explosiveBullet = function(eid) {
    
    let position = [['P'],['P']];
	if (eid) {
		let posX = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootXQJ() : $gameMap.displayX()`;
		let posY = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenShootYQJ() - 24 : $gameMap.displayY()`;	
		position = [['S',posX],['S',posY]];
	}

    QJ.MPMZ.Shoot({
		groupName: ['JackBomb'],
        img:'MGC_W2_Explosion_V4_Lv1[5,10,2]',
        position:position,
		scale:[1,1],
        initialRotation:['S',0],
        imgRotation:['F'],
		opacity:1,
		hue:0,
        moveType:['S',0],
        blendMode:1,
        existData:[	
		   {t:['Time',98]},
        ],       
		moveF:[[16,999,QJ.MPMZ.tl.ex_JackBombExplode,[0,200,1]]],
    });
}	

//杰克爆弹演出
QJ.MPMZ.tl.ex_JackBombEffect = function(xx,yy,type,boomScale = 1) {
	
	let eveX = Math.floor((xx / 48) + $gameMap.displayX()); 
    let eveY = Math.floor((yy / 48) + $gameMap.displayY()); 
	
	let HUE = 0;
	let damage = 200;
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
    }
	let animation = QJ.MPMZ.Shoot({
        img:'MGC_W2_Explosion_V4_Lv1[5,10,2]',
        position:[['S',xx],['S',yy]],
		scale:boomScale,
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
    });
		
    let effect = QJ.MPMZ.Shoot({
		groupName: ['JackBomb'],
        position:[['S',xx],['S',yy]],
		scale:boomScale,
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
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_JackBombExplode,[type]],p:[-1,false,true],c:['S','this.time > 12 && this.time < 24']},
			{t:['R',[8,248]],a:['F',QJ.MPMZ.tl.bombInWaterEffect],p:[-1,false,true],cb:['C',1],c:['S','this.time > 12 && this.time < 24']},
        ],       
    });
};

// 炸弹在水中的效果/炸鱼
QJ.MPMZ.tl.bombInWaterEffect = function(xx,yy) {

    if (!xx || !yy) {
	    xx = this.x / 48; 
        yy = this.y / 48; 		
	}
	const mapId = $gameMap.mapId();
	let chance = 500 + Math.randomInt(2000);
    let luk = $gameParty.leader().luk;
        luk = Math.max(0, Math.min(999, luk));
        chance = chance + (luk / 999) * 9000;
    // 阴天气概率增加
	if ($gameVariables.value(60) == 1) chance += 1000 + Math.randomInt(1000);		
	// 下雨天气概率增加
	if (hasRainParticle()) chance += 3000 + Math.randomInt(2000);
	//  诱饵效果
	let bait = QJ.MPMZ.rangeAtk([['S', this.inheritX()],['S', this.inheritY()]],['B','bait'],[],['C',20]).length;
	if (bait > 0) {
		chance += 3000 + bait * 2000;
	}
	
	if (Math.randomInt(10000) > chance) return;
	let maxFishing = $gameSelfVariables.value([mapId, 1, 'maxFishing']);
	if (maxFishing <= 0) return;
	// 避开初始化标记的1
	if (maxFishing <= 2) {
		maxFishing = 0;
	} else {
		maxFishing -= 1;
	}
	$gameSelfVariables.setValue([mapId, 1, 'maxFishing'], maxFishing);
    let value = $gameSelfVariables.value([1, 1, 'bombFishing']);
	    value += 1;
	$gameSelfVariables.setValue([1, 1, 'bombFishing'], value);	
	if (value >= 10) {
		// 解锁炸鱼成就
		chahuiUtil.unlockSpecificAchievement?.("WhoNeedsAFishingRod");
	}
	// 炸出敌人	
	let enemyChance = 0.2;	
	// 诱饵效果会提升敌人出现概率
	//enemyChance = enemyChance + (Math.max(0, chance) / 18000 * 0.9);
	enemyChance += bait * 0.2;
	
	if(enemyChance > Math.random()) {
    let posX = this.inheritX();
    let posY = this.inheritY();
    QJ.MPMZ.Shoot({
        img:"60FPS_ASWater_04_Geyser[5,6,1]",
        position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
		scale:[0.8,0.8],
        imgRotation:['F'],
		anchor:[0.5,0.65],
        collisionBox:['C',1],
		opacity:0.8,
        moveType:['S',0],
		blendMode:3,
        existData:[	
           {t:['Time',29]},
        ],
    });		
	 AudioManager.playSe({ name: "Water1", volume: 70, pitch: 100, pan: 0 });
	 
function weightedPickEid(list) {
  if (!list || !list.length) return null;

  // 过滤非法/非正权重，并把权重转成数值
  var pool = [];
  for (var i = 0; i < list.length; i++) {
    var w = Number(list[i].weight);
    if (isFinite(w) && w > 0) pool.push({ eid: list[i].eid, weight: w });
  }
  if (!pool.length) return null;

  // 求总权重并在 [0, total) 上采样
  var total = 0;
  for (var j = 0; j < pool.length; j++) total += pool[j].weight;

  var r = Math.random() * total;
  for (var k = 0; k < pool.length; k++) {
    if (r < pool[k].weight) return pool[k].eid;
    r -= pool[k].weight;
  }
  // 理论到不了这里，容错返回最后一个
  return pool[pool.length - 1].eid;
}	 
	 
     let enemyList = [
            {eid: 26, weight: 40},
            {eid: 73, weight: 50},
            {eid: 42, weight: 10}
        ];
     if (mapId === 48) {
		 // 支配者的触手
		 const tentacles  = $gameMap.drill_COET_getEventsByTag_direct("支配者的触手");
		 const summoningProgress = $gameSelfVariables.value([1, 39, 'summoningProgress']);
		 const currentDay = $gameSystem.day();
		 const BOSSAlive  = currentDay >= QJ.MPMZ.tl.getBossRespawnDay(40);
         if (tentacles.length < 4 && summoningProgress < 4 && BOSSAlive) {
             enemyList.push({eid: 39, weight: 150});
		 }	
	 }
	 // 渔力超过上限值后开始出现新的敌人分布
	 if (chance > 10000) {
		 if ($gameSelfVariables.value([mapId, 1, 'waterArea']) > 20) { 
		     let value = 5;
			 value +=  Math.round((chance - 10000) / 100);
			 let reSpawn = $gameSelfVariables.value([1, 28, 'reSpawn']);
			 if ($gameSystem.day() >= reSpawn) { 
		         enemyList.push({eid: 28, weight: value});
			 }
		}
	 }
     let enemy = weightedPickEid(enemyList);
	 let eid = $gameMap.spawnEventQJ(1,enemy,xx,yy,false,{_opacity:0});
	 let e   = $gameMap.event(eid);
	 if (!e || [39,73].includes(enemy)) return;
     let condition = DrillUp.g_COFA_condition_list[10];
     let c_area = $gameMap.drill_COFA_getShapePointsWithCondition(Math.floor(xx), Math.floor(yy), "圆形区域", 5, condition);	 
        if (c_area.length > 0) {
                let p = c_area[Math.floor(Math.random() * c_area.length)];
                let xPlus = p.x - xx;
                let yPlus = p.y - yy;
                e.jump(xPlus, yPlus);
        } else {
                e.jump(0, 0);
        }	 
	 AudioManager.playSe({ name: "Jump2", volume: 80, pitch: 80 + Math.randomInt(40), pan: 0 });		
		return;
	}	
	
	// 炸鱼出货演出
    let posX = this.inheritX();
    let posY = this.inheritY();	
    QJ.MPMZ.Shoot({
        img:"Water_Spell_1[13,4]",
        position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
		scale:1,
        imgRotation:['F'],
		anchor:[0.5,0.65],
        collisionBox:['C',1],
		opacity:1,
        moveType:['S',0],
		blendMode:1,
        existData:[	
           {t:['Time',51]},
        ],
		moveF: [
		   [16,999,dingk.Loot.specifiedLocationGenerateDrops,[110,Math.floor(xx),Math.floor(yy)]]
		]
    });	

};

//杰克爆弹演出
QJ.MPMZ.tl.ex_JackBomb = function(user, type = 1, scale) {

    let posX = 0;
    let posY = 0;
    let bombScale = 1;	
	let HUE = 0;
	let damage = 200;
	let isBullet = this && this instanceof Game_QJBulletMZ;
	
	if (isBullet) {
		posX      = this.inheritX(); 
		posY      = this.inheritY(); 
		bombScale = this.scaleX;
		type      = this.data.bombType;
	} else {
	if (!$gameMap.event(user)) return;

    posX = `$gameMap.event(${user}) ? $gameMap.event(${user}).screenShootXQJ() : $gameMap.displayX()`;
    posY = `$gameMap.event(${user}) ? $gameMap.event(${user}).screenShootYQJ() : $gameMap.displayY()`;	
	if (scale) {
		bombScale = scale;
	}
	if ($gameParty.leader().hasSkill(33)) {
		bombScale += $gameParty.leader().skillMasteryLevel(33) / 100;
	 }
	}

    switch(type) {
    case 1:
        HUE = 0;
		damage = 200; 
		AudioManager.playSe({ name: "Explosion2", volume: 80, pitch: 90+Math.randomInt(20), pan: 0 });
        break;
    case 2:
        HUE = 171;
		damage = 40;
        AudioManager.playSe({ name: "Ice6", volume: 80, pitch: 90+Math.randomInt(20), pan: 0 });		
        break;
    case 3:
        HUE = 244;
		damage = 40;
        AudioManager.playSe({ name: "Explosion1", volume: 80, pitch: 90+Math.randomInt(20), pan: 0 });		
        break;
     }
	
    let bombeffect = QJ.MPMZ.Shoot({
		groupName: ['JackBomb'],
        img:'MGC_W2_Explosion_V4_Lv1[5,10,2]',
        position:[['S',posX],['S',posY]],
		scale:bombScale,
        initialRotation:['S',0],
        imgRotation:['F'],
		opacity:1,
		hue:HUE,
		collisionBox:['C',60],
        moveType:['S',0],
        blendMode:1,
        existData:[	
			{t:['Time',98]},
			{t:['P'],a:['F',QJ.MPMZ.tl.ex_JackBombExplode,[type]],p:[-1,false,true],c:['S','this.time > 12 && this.time < 24']},
			{t:['G',['"enemy"','"object"','isExplodable']],a:['F',QJ.MPMZ.tl.ex_JackBombExplode,[type]],p:[-1,false,true],c:['S','this.time > 12 && this.time < 24']},
    	    {t:['B',['Destructible']],a:['F',QJ.MPMZ.tl.ex_JackBombExplode,[type]],p:[-1,false,true],c:['S','this.time > 12 && this.time < 24']},
			{t:['R',[8,248]],a:['F',QJ.MPMZ.tl.bombInWaterEffect],p:[-1,false,true],cb:['C',1],c:['S','this.time > 12 && this.time < 24']},
        ],       
    });
	
	if (type === 2) {
		// 冰霜杰克爆弹的冰地板
		bombeffect.addMoveData("F",[10,999,QJ.MPMZ.tl.ex_frozenEarth]);
	}	
	if (type === 3) {
		// 剧毒杰克爆弹的毒雾
		bombeffect.addMoveData("F",[40,999,QJ.MPMZ.tl.generatePoisonFog]);
	}
	// 纵火狂手套
	if (!isBullet && $gameParty.leader().hasSkill(33)) {		
		let chance = 10 + 8 * ($gameParty.leader().skillMasteryLevel(33)/30);
		if (chance > Math.randomInt(100)) {
        bombeffect.addMoveData("F",[24,999,QJ.MPMZ.tl.ex_bombFiendSoul,[null,null,true,true]]);
	  }
	}	
};

//杰克爆弹爆炸伤害判定
QJ.MPMZ.tl.ex_JackBombExplode = function (type, args) {
  if (!(this instanceof Game_QJBulletMZ)) return;
  if (!args) return;
  // 爆炸自身是独立伤害，玩家投掷或弹反触发也不继承玩家被动。
  this.data.nonPlayerDamage = true;

  const posX    = this.inheritX();
  const posY    = this.inheritY();
  const tarX    = args.target?.screenBoxXShowQJ() || 0;
  const tarY    = args.target?.screenBoxYShowQJ() || 0;
  const scaleXY = this.scaleX;

  // 炸弹魔抗性
  const resist = 1 * (0.5 ** $gameParty.leader().skillMasteryLevel(34));
  
  // 命中弹幕的场合
  if (args.bulletTarget && args.bulletTarget instanceof Game_QJBulletMZ) {
	  const damage = Math.floor(233 * scaleXY * resist);
	  QJ.MPMZ.tl.ex_toBulletAttack.call(this, damage, {noHitEffect:true, independentAttack:true, noDurLoss:true}, args);
	  return;
  }

  let angle = 0;
  const isPlayer = args.target instanceof Game_Player;
  const isEvent  = args.target instanceof Game_Event;

  // 普通炸弹的通用击退流程
  const knockback = () => {
    angle = QJ.calculateAngleByTwoPointAngle(posX, posY, tarX, tarY);
    if (!Number.isFinite(angle)) angle = 0;

    if (isPlayer) {
      const damage = Math.floor(233 * scaleXY * resist);
      QJ.MPMZ.tl.ex_playerDamageCheck.call(this, damage, 2);
      QJ.MPMZ.tl.ex_jumpWithAngle(-1, angle, 2);
    } else if (isEvent) {
      const eventId = args.target._eventId;
      const damage  = Math.floor(233 * scaleXY);
      QJ.MPMZ.tl.ex_toEnemyAttack.call(
        this,
        damage,
        { noHitEffect: true, noDurLoss: true, magicAttack: true, independentAttack: true },
        args
      );
      QJ.MPMZ.tl.ex_jumpWithAngle(eventId, angle, 2);
    }
  };

  switch (type || 1) {
    case 1: {
      // 普通炸弹（击退）
      knockback();
      break;
    }
    case 2: {
      // 冰霜炸弹
      if (isPlayer) {
        const damage = Math.floor(66 * scaleXY);
        QJ.MPMZ.tl.ex_playerDamageCheck.call(this, damage, 3, 9, 85); 
      } else if (isEvent) {
        const eventId = args.target._eventId;
        const damage  = Math.floor(66 * scaleXY * resist);
        $gameMap.steupCEQJ(151, eventId, { sendValue: [damage] });
        QJ.MPMZ.tl.ex_checkAddedStatus(9, 8500, undefined, args);
      }
      break;
    }
    case 3: {
      // 猛毒炸弹
      if (isPlayer) {
        const damage = Math.floor(66 * scaleXY * resist);
        QJ.MPMZ.tl.ex_playerDamageCheck.call(this, damage, 3, 5, 100); // 必定中毒
      } else if (isEvent) {
        const eventId = args.target._eventId;
        const damage  = Math.floor(66 * scaleXY);
        $gameMap.steupCEQJ(151, eventId, { sendValue: [damage] });
        QJ.MPMZ.tl.ex_enemyPoison.call(args.target, 5);
      }	  
      break;
    }
    default: {
      // 默认：普通炸弹（击退）
      knockback();
      break;
    }
  }
};


// 生成毒雾
QJ.MPMZ.tl.generatePoisonFog = function(extraData = {},args) {

    if (extraData && extraData.dustExplosion) {
	  const target = args && args.bulletTarget;
      if (target) {
		// 清除诱饵演出
		let name = "PoisonFog" + this.data.decoyIndex;
		$gameScreen._particle.reservePluginCommand(1,{},["clear",name],1);
		// 粉尘爆炸
		QJ.MPMZ.tl.ex_bombFiendSoul.call(this,null,null,{scaleFix:1.3});
	  }
	  return;
	}
    let posX    = this.inheritX();
    let posY    = this.inheritY();
    let time    = 360;
	let index   = Math.randomInt(10000);
	let name    = "PoisonFog" + index;
	let range   = 80;
    QJ.MPMZ.Shoot({
        position:[['S',posX],['S',posY]],
		groupName: ['PoisonFog'],
        initialRotation:['S',0],
        moveType:['S',0],
		imgRotation:['F'],
		collisionBox:['C', range],
		scale:1,
		decoyIndex: index,
        existData:[
			{t:['Time',time]},
			{t:['G','"enemy"'],a:['F',QJ.MPMZ.tl.ex_toEnemyAttack, [
            1,
            {
			  magicAttack:true,
              nonPlayerDamage:true,
              orbitingDamage:true,
              noHitEffect:true,
              noDurLoss:true,
              specifyAddedStatus:true,
              addedStatusType:5,
              addedStatusChance:6600,
			  addedStatusDamage:2
            }
          ]],p:[-1,false,true], c:['T',0,30,true]},
			{t:['B','fire'],a:['F',QJ.MPMZ.tl.generatePoisonFog,[{dustExplosion:true}]],cb:['C',Math.round(range/2.5)]}
        ],
    });
    // 毒雾动画演出
      let xx   = (this.x - 30) / 48;
      let yy   = (this.y - 12) / 48;
      $gameScreen._particle.particleSet(0, name, 'tilemap', 'aura_static_b', 'above', xx, yy);
	  $gameScreen._particle.particleUpdate([name,'scale',"0","3@0.5","0.1@1.5","0"]);
	  $gameScreen._particle.particleUpdate([name,'alpha',"1"]);
	  $gameScreen._particle.particleUpdate([name,'color',"#460276"]);
      $gameScreen._particle.reservePluginCommand(360,{},["clear",name],1);	  
};



//迟钝魔法，局部时停
QJ.MPMZ.tl.ex_SluggishFieldSpell = function() {

    if (!this) return;
	
	let posX = this.screenBoxXShowQJ();
    let posY = this.screenBoxYShowQJ();
    
	 var seNames = "Magic3";
     var randomPitch = 80;
     var se = { name: seNames, volume: 70, pitch: randomPitch, pan: 0 };
     AudioManager.playSe(se);	
	
    QJ.MPMZ.Shoot({
        img:'pipo-btleffect212_192[5,3,6]',
        scale:[2,1.5],
        position:[['S',posX],['S',posY]],
        initialRotation:0,
        moveType:['S',0],
        existData:[
            {t:['Time',80]}
        ],
        z:"MF_BG",
        opacity:0.66,
        blendMode:1,
        collisionBox:['C',1],
		moveF:[
		    [75,999,QJ.MPMZ.tl.ex_SluggishField]
		 ],
    });
}

QJ.MPMZ.tl.ex_SluggishField = function() {

	 var seNames = "Switch3";
     var randomPitch = 60;
     var se = { name: seNames, volume: 60, pitch: randomPitch, pan: 0 };
     AudioManager.playSe(se);		

	
	let posX = this.inheritX();
    let posY = this.inheritY();
	let time = 360;
	let inCode = 'QJ.MPMZ.tl.ex_eventHalt(1,' + time + ',this.time,target)';
	let outCode = 'QJ.MPMZ.tl.ex_eventHalt(2,' + time + ',this.time,target)';
    QJ.MPMZ.Shoot({
        img:'pipo-btleffect212_192[5,2,8]',
		groupName: ["timeStopField"],
        scale:[2,1.5],
        position:[['S',posX],['S',posY]],
        initialRotation:0,
        moveType:['S',0],
        existData:[
            {t:['Time',time],d:[1,30,0]},
			{t:['G',['"enemy"','"object"']],a:[],p:[-1,false,true,QJ.MPMZ.tl.ex_eventHalt,QJ.MPMZ.tl.ex_eventRestart]},
            {t:['B',['Stoppable','enemyBullet','playerBullet']],p:[-1,false,true,QJ.MPMZ.tl.ex_20_inFunc,QJ.MPMZ.tl.ex_20_outFunc]}
        ],
        z:"MF_BG",
        opacity:0.66,
        blendMode:1,
        collisionBox:['C',60],
    });
}

//时停：事件停止
QJ.MPMZ.tl.ex_eventHalt = function(target) {
	
	let totalTime = this.data.existData[1].t[1];
    let leftover = totalTime - this.time;
  if (target instanceof Game_Event) {
	 let eid = 4000 + target._eventId;
	 let tag = "invert" + eid;
	 $gameMap.createFilter(tag, "invert", eid);
     $gameMap.setFilter(tag ,[1]);
	 target._IsDisabledCounter += leftover;
   }
}
//时停：事件恢复
QJ.MPMZ.tl.ex_eventRestart = function(target) {

   if (target instanceof Game_Event) {
	   let eventID = target._eventId;
	   let eid = 4000 + eventID;
	   let tag = "invert" + eid;
       $gameMap.eraseFilter(tag);
	 if ($gameSelfVariables.value([$gameMap.mapId(), eventID, 'preStored']) > 0) {
		 
		 var realDamage = $gameSelfVariables.value([$gameMap.mapId(), eventID, 'preStored']);
		 var currentHp = $gameSelfVariables.value([$gameMap.mapId(), eventID, 'HP']);
		 
		 $gameSelfVariables.setValue([$gameMap.mapId(), eventID, 'preStored'], 0); 
		$gameSelfVariables.setValue([$gameMap.mapId(), eventID, 'HP'], currentHp-realDamage);
		 target.showHpBar();
		 
		  if ($gameSelfVariables.value([$gameMap.mapId(), eventID, 'HP']) <= 0) {
			  $gameSelfSwitches.setValue([$gameMap.mapId(), eventID, 'D'], true);
		     }
		 }
	 }	  
};	  


//进入领域子弹减速
QJ.MPMZ.tl.ex_20_inFunc = function(target) {

    if (target) {
        //if (!target.remMoveType) {
        //    target.remMoveType = target.data.moveType;//记录原moveType
       // }
       // target.changeAttribute("moveType",['S',0.05]);//改变敌人弹幕，让其降速
       // if (!target.remRotation) {
      //      target.remRotation = target.data.imgRotation;//记录原转速
		// if(target.data.imgRotation[0] === 'R'){
		//	target.changeAttribute("imgRotation",['R',1,false]);//改变敌人弹幕的转速，让其降速
		//	}
		if (!target.remHue) {
          target.remHue = target.data.hue;//记录原色相
        }
        target.changeAttribute("hue",180);//改变敌人弹幕的色相，使其变成冷色调
		target.data.paused = true;
        }		   
};
//离开领域子弹恢复
QJ.MPMZ.tl.ex_20_outFunc = function(target) {
    if (target) {
        //target.changeAttribute("moveType",target.remMoveType);//立场不和敌人弹幕碰撞时复原moveType
		//target.changeAttribute("imgRotation",target.remRotation);//复原转速
		target.data.paused = false;
		target.changeAttribute("hue",target.remHue);//复原色相
    }
};



//巨蜗吸尘器使用监听
QJ.MPMZ.tl.ex_giantSnailVacuumsListener = function() {

	if(!$gameParty.leader().equips()[0]) return;
	if($gameMap.getGroupBulletListQJ('attackMonitoring').length > 0) return;
	 
	QJ.MPMZ.Shoot({
		groupName: ['attackMonitoring'],
		position: [['P'], ['P']],
		initialRotation: ['S',0],
		moveType: ['B',-1],
		opacity:0,
		collisionBox:['C',1],
		existData: [
		],          
		moveJS: [
			[30,10,`if (TouchInput.drill_isLeftPressed() && !QJ.MPMZ.tl.ex_playerAntiClickDetection("normalAttack")) {
				        QJ.MPMZ.tl.ex_giantSnailVacuums()
					}`],
		],
	});	
};

//巨蜗吸尘器
QJ.MPMZ.tl.ex_giantSnailVacuums = function(extra = {}, args) {
	
	
	if (extra.vacuumPulling) {
	  const target = args && args.bulletTarget;
	  if (target && !target._ManekiNeko) {
		  const dx = this.x - target.x;
		  const dy = this.y - target.y;
		  const dist = Math.hypot(dx, dy);

		  const nearDist = 40;   // 近距离阈值：<=40 时吸力最强
		  const farDist  = 480;  // 远距离阈值：>=240 时吸力最弱

		  // t: 0(远) -> 1(近)
		  const t = Math.max(0, Math.min(1, (farDist - dist) / (farDist - nearDist)));
		  const speed = 1 + 3 * (t * t);

		  const inv = 1 / (dist || 1);
		  target.x += dx * inv * speed;
		  target.y += dy * inv * speed;
		  return;
	  }
	  
	  const EVENT = args && args.target;
	  if (EVENT) {
		  let fudou = $gameSelfVariables.value([$gameMap.mapId(), EVENT._eventId, 'fudou']);
		  if (fudou > 20) return;
		  let dis = $gamePlayer.calcDistance(EVENT._eventId);
		  EVENT.dotMoveToPlayer();
		  if (dis < 450)  EVENT.dotMoveToPlayer();
		  if (dis < 250)  EVENT.dotMoveToPlayer();
		  // 吸引猫车商品的情形
		  if (Math.random() > 0.95 && EVENT.drill_COET_hasTag("商品")) {
			  let Asaba = $gameMap.drill_COET_getEventsByTag_direct("猫耳浅羽");
			  if (Asaba.length > 0) {
				 let eventId = Asaba[0]._eventId;
				 setTimeout(() => {
				     $gameSelfSwitches.setValue([$gameMap.mapId(), eventId, 'B'], true);
				 }, 400);
			  }
	      }			  
	  }
		  return;
	}
	

	if($gameMap.getGroupBulletListQJ('giantSnailVacuums').length > 0) return;
    let weaponImage = "weapon/weapon61";
	$dataMap.disableDashing = true;
	$gameSystem.setBgsLine(9);
    AudioManager.playBgs({ name: "掃除機の電源を入れる", volume: 60, pitch: 100, pan: 0 });
	
	QJ.MPMZ.Shoot({
			groupName:['giantSnailVacuums'],
			img:weaponImage,
			scale:[1,1],
			position:[['P'],['P']],
			initialRotation:['M'],
			imgRotation:['F'],
			moveType:['D',-1,0,0,0,0,0,0,0,0],
			anchor:[0.5,1],
			imgRotation:['F'],
			blendMode:0,
			z:"W",
			collisionBox:['C',5],
			existData:[
				{t:['S','!TouchInput.drill_isLeftPressed()',true],a:['S',"$dataMap.disableDashing = false"]},   
			],
			moveF:[[4,4,QJ.MPMZ.tl.ex_checkStickAlignment]],
			deadJS:["$dataMap.disableDashing=false;AudioManager.stopBgsByLine(9);AudioManager.playSe({ name: '掃除機の電源を切る', volume: 60, pitch: 100, pan: 0 })"]
	});	

	QJ.MPMZ.Shoot({
			groupName:['giantSnailVacuums'],
			img:"giantSnailVacuumsEffect[6,3]",
			scale:[1,1],
			position:[['P'],['P']],
			initialRotation:['M'],
			imgRotation:['F'],
			moveType:['D',-1,0,0,0,0,0,0,0,0],
			anchor:[0.4,1.87],
			opacity:0.75,
			imgRotation:['F'],
			blendMode:0,
			z:"W",collisionBox:['C',5],
			existData:[
				{t:['S','!TouchInput.drill_isLeftPressed()',true]},   
			],
	});	
	
    QJ.MPMZ.Laser({
			imgPoint:'null1',
			img:"null1",
			groupName:['giantSnailVacuums'],
			rotation:['M'],
			positionStatic:false,
			rotationStatic:false,
			z:"W",
			judgeMode:['W',1],
			position:[['P'],['P']],
			judgeWidth:42,length:['S',420,0,[]],
			positionSpread:60,
			existData:[
				{t:['G',['"object"','drops','money','"enemy"','goods']],a:['F',QJ.MPMZ.tl.ex_giantSnailVacuums,[{vacuumPulling:true}]],p:[-1,true,true],c: ['T', 0, 1, true]},
				{t:['B',['itemDrops']],a:['F',QJ.MPMZ.tl.ex_giantSnailVacuums,[{vacuumPulling:true}]],p:[-1,true,true],c: ['T', 0, 1, true]},
				{t:['S','!TouchInput.drill_isLeftPressed()',true]},
			]        
     })
};

//吸尘器吸引效果
QJ.MPMZ.tl.ex_giantSnailVacuumsEffect = function(target) {
	
    let fudou = $gameSelfVariables.value([$gameMap.mapId(), target._eventId, 'fudou']);	
	if (!$gameMap.event(target._eventId) || fudou > 20) {
	  return;
	}
	
	if ($gamePlayer.calcDistance(target._eventId) > 450 ) {
	target.dotMoveToPlayer();
	} else if ( $gamePlayer.calcDistance(target._eventId) > 250 ) {
	target.dotMoveToPlayer();
	target.dotMoveToPlayer();	
	}  else if ( $gamePlayer.calcDistance(target._eventId) > 0 ) {
	target.dotMoveToPlayer();
	target.dotMoveToPlayer();
	target.dotMoveToPlayer();
	target.dotMoveToPlayer();		
	}
};

// 玩家环绕物初始化
QJ.MPMZ.tl.ex_orbitingBulletInitialization = function(bulletTypes) {
	
    const numBullets = bulletTypes.length;
    // 先消灭环绕物
    QJ.MPMZ.deleteProjectile("surrounds");
    if (numBullets <= 0) return;
	
    for (let i = 0; i < numBullets; i++) {
        let bulletType = bulletTypes[i];
        let bulletGetter = QJ.MPMZ.tl.bulletConfig[bulletType];
        if (!bulletGetter) {
            console.warn(`未找到 '${bulletType}' 的配置`);
            continue;
        }

        // 如果 bulletGetter 是函数，则调用它得到配置对象
        let cfg = (typeof bulletGetter === "function") ? bulletGetter() : bulletGetter;

        let initialRotationValue = (360 / numBullets) * i;
        let bulletName = bulletType + '_' + i;

        // 深拷贝, 以防多次弹幕对 cfg 存在改动
        let clonedExistData = QJ.makeDeepCopy(cfg.existData);
       
        var surrounds = QJ.MPMZ.Shoot({
            groupName: cfg.groupName.concat(bulletName),
            img: cfg.img,
            position: [['P'], ['P']],
            initialRotation: ['S', initialRotationValue],
            moveType: ['C', -1, cfg.moveEllipse || [64, 21], cfg.rotationSpeed || 3,3],
            scale: cfg.scale || 1.0,
            collisionBox: cfg.collisionBox || ['C', 4],
            existData: clonedExistData || [],
			trailEffect: cfg.trailEffect || [],
            z: 'E',
            moveJS: [
              [2, 2, "var angle = ((this.rotationMove % 360) + 360) % 360;if (angle >= 60 && angle <= 100) {this.changeAttribute('z','E');} else {this.changeAttribute('z','W')}"]
            ]
        });
		// 逆咒缚契约
		if ($gameParty.leader().hasSkill(71)) {	 
	       let index = surrounds.index;
		   QJ.MPMZ.tl.ex_chainSpellBinding(undefined, index);		
		}		
    }
};


//石像喷火
QJ.MPMZ.tl.ex_flameSpewingStatueTrap = function(initialize, args) {

   	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   if (this._coolDown == 0) {
		   this._actived = false;
		   this.changeAttribute("img","pressurePlate_off");
	   }
	}
    
    if ( initialize && initialize === "fire" ) {

        let target = args?.target;
        if (args.bulletTarget && args.bulletTarget instanceof Game_QJBulletMZ) target = $gamePlayer;
        // 只对事件和玩家生效
        if (!(target instanceof Game_Event) && !(target instanceof Game_Player)) return;
        // 飞行单位不触发陷阱
        if (target._Drill_ECE?.playing_type === "空中飘浮") return;

	   if (!this._actived) {
		    this._actived = true;
			this.changeAttribute("img","pressurePlate_on");
			AudioManager.playSe( { name: "Switch3", volume: 65, pitch: 80, pan: 0 } );
	   }

       // 已经在喷火就不再触发
	   //if ($gameMap.getGroupBulletListQJ('Trap').length > 0) return;
       
       this._coolDown = 3;	   
	   let angle = 180;	
        QJ.MPMZ.Shoot({
            groupName: ['Flame','magic','Trap'],
            position:[['Map',52],['Map',63]],
            initialRotation: ['S',0],
            moveType:['S',0],
            existData: [
               {t:['Time',6]},
            ],       
            moveF: [
			  [1,1,QJ.MPMZ.tl.ex_flameSpewingStatueThrower,[angle]]
            ]
        });
	   if (this.time % 24 > 20) {	
		  AudioManager.playSe( { name: "Fire1", volume: 70, pitch: 100, pan: 0 } );
	   }
    }		
};

//石像喷火判定
QJ.MPMZ.tl.ex_flameSpewingStatueThrower = function(angle) {
	let posX = this.inheritX();
    let posY = this.inheritY();	
	let number = 5 + Math.randomInt(5);
    let time = 30 + Math.randomInt(60);
    let speed = '0|' + (4 + Math.randomInt(6)) + '~90/0~300|0';
	QJ.MPMZ.Shooter_ArcRange(['S',angle],{
		groupName: ['Flame','fire'],
		position:[["S",posX],["S",posY]],
		img:'fire[11,4]',
		imgRotation:['F'],
		blendMode:1,
		//tone:[134,53,150,0],
		opacity:'0|1.0~30/0.1~300|0.1',
		moveType:['S',speed],
		anchor:[0.5,1],
		collisionBox:['C',4],
		existData:[
		{t:['Time',time],d:[0,20]},
		{t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[10,2]],c:['S','!QJ.MPMZ.tl.ex_playerBulletPhasing()'],},
		{t:['G',['"enemy"','"object"']], a: ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [10, {nonPlayerDamage: true, magicAttack:true}]], p:[-1,false,true]},
		]
	},-5,5,number,15,0.01,0.8);

};

// 创伤救援小组解锁条件；只返回判定结果，不记录解锁、不执行转生。
// 137号公共事件：QJ.MPMZ.tl.canUnlockTraumaRescueTeam()
// 确认死亡且排除复活后，转生分支调用一次：
// QJ.MPMZ.tl.canUnlockTraumaRescueTeam({chahuiExpressDeath:true})
// 猫车分支每次调用都会重新抽签，调用方应保存本次结果。
QJ.MPMZ.tl.canUnlockTraumaRescueTeam = function(extra = {}) {
    const actor = $gameParty.leader();
    const hasHairpin = $gameParty.hasItem($dataArmors[3], true);

    if (extra.chahuiExpressDeath) {
        if (!actor.isDead()) return false;
        const records = actor._defeatRecord || [];
        const cause = records[records.length - 1]?.type;
        const killedByTruck = Array.isArray(cause)
            ? cause.includes("chahuiExpressHitBox")
            : cause === "chahuiExpressHitBox";
        if (!killedByTruck) return false;
        return hasHairpin || Math.random() < 0.33;
    }

    if (!hasHairpin && !(actor._deadCount > 66)) return false;
    // 沿用主线BOSS名单，直接读取击杀记录，避开测试模式固定返回7的进度方法。
    return QJ.MPMZ.tl.keyBossData.some(boss =>
        boss.mainStory && $gameSelfVariables.value([1, boss.eventId, "KillCount"]) > 0
    );
};

//茶会地狱宅急便预处理/猫车商店
QJ.MPMZ.tl.ex_chahuiExpressPreprocess = function(extra = {}) {	

  let posX = $gamePlayer.screenBoxXShowQJ();  
  let posY = $gamePlayer.screenBoxYShowQJ();  
  
  if (extra.WarningText) {
      let tag     = "nekoTruck";
      let index   = extra.WarningText || 10;	  
	  let langText = window.mapCommonEventDialogue?.[tag]?.[String(index)] || "There isn’t a wide enough lane!";
	  let text = "\\c[101]\\dDCOG[11:2:2:2]\\fs[28]" + langText;
	  // 弹出提示 + 音效
	  if ($gameTemp && $gameTemp.drill_GFTT_createSimple) {
		posX *= $gameScreen.zoomScale();
		posY *= $gameScreen.zoomScale();
		$gameTemp.drill_GFTT_createSimple([posX, posY], text, 5, 0, 60);
	  }
	  AudioManager.playSe({ name: "012myuu_YumeSE_SystemBuzzer01", volume: 100, pitch: 100, pan: 0 });
      return;
  }
  
  
  if ( [51, 53].includes($gameMap.mapId()) )  {
	  QJ.MPMZ.tl.ex_chahuiExpressPreprocess({WarningText:13});
	  return;
  }
  
  QJ.MPMZ.tl.removeAllBulletHitboxes();
  let bullet = QJ.MPMZ.Shoot({
				  position:[['S',posX],['S',posY]],
                  initialRotation:['S',0], 
				  imgRotation:['F'],
                  moveType:['D',true], 
				  anchor:[-0.04,0.5],
                  collisionBox:['R', 720, 150],
                  deadJS: [
				     ["QJ.MPMZ.tl.removeBulletHitbox(this._index)"]
				  ],
                  existData:[
						{t:['S',"$gameSelfSwitches.value([1, 41, 'A'])",true], a:['F',QJ.MPMZ.tl.ex_chahuiExpressPreprocess,[{WarningText:12}]], c:['S', "this.time > 29"]},
						{t:['NP'], a:['F',QJ.MPMZ.tl.ex_chahuiExpressPreprocess,[{WarningText:11}]], cb:['R',720, 48], c:['S', "this.time > 30"]},
						{t:['R',[8, 250, 254, 255]], a:['F',QJ.MPMZ.tl.ex_chahuiExpressPreprocess,[{WarningText:10}]], c:['S', "this.time > 30"]},
						{t:['Time',70], a:['F',QJ.MPMZ.tl.ex_chahuiExpress]}			 
                  ],
				  moveJS: [
						[35, 999, `let seName = Math.random() > 0.5 ? "車の警nk" : "車のクラクション";
								   AudioManager.playSe({name:seName, volume: 60, pitch: 100, pan: 0}); `]
				  ]				  
			    });	
  QJ.MPMZ.tl.showBulletHitbox( bullet.index, { color:0xff2a00, alpha:0.4 });

	
};

//茶会地狱宅急便警告
QJ.MPMZ.tl.ex_chahuiExpressWarning = function(type) {

  let posX = $gamePlayer.screenShootXQJ() * $gameScreen.zoomScale();
  let posY = $gamePlayer.screenShootYQJ() * $gameScreen.zoomScale();


  let t = Number(type) | 0;
  if (t < 1 || t > 6) t = 1;

  // 语言：0=中文 1=日文 2=英文（其他值回退英文）
  let L = ConfigManager.language;
  if (L > 2)  L = 2;


  let MSG = {
    1: {
      0: "没有足够的空间进行召唤！",
      1: "召喚スペース不足！",
      2: "Not enough space to summon!"
    },
    2: {
      0: "系统忙碌中！请等待其他事件结束！",
      1: "システムがビジーです！他のイベント終了を待ってください！",
      2: "System busy! Please wait for other events to finish!"
    },
    3: {
      0: "正在举着其他物品！",
      1: "他の物を持ち上げています！",
      2: "Holding another item!"
    },
    4: {
      0: "水中无法召唤！",
      1: "水中では召喚できません！",
      2: "Cannot summon in water!"
    },
    5: {
      0: "附近有障碍物！",
      1: "近くに障害物がある！",
      2: "There’s an obstacle nearby!"
    },
    6: {
      0: "该武器无法使用铁砧修复！",
      1: "この武器は金床で修復できない！",
      2: "This weapon cannot be repaired with the anvil!"
    }
  };

  let langText = (MSG[t][L] != null) ? MSG[t][L] : MSG[t][2]; // 回退英文
  let text = "\\c[101]\\dDCOG[11:2:2:2]\\fs[28]" + langText;

  // 弹出提示 + 音效
  if ($gameTemp && $gameTemp.drill_GFTT_createSimple) {
    $gameTemp.drill_GFTT_createSimple([posX, posY], text, 5, 0, 60);
  }
  AudioManager.playSe({ name: "012myuu_YumeSE_SystemBuzzer01", volume: 100, pitch: 100, pan: 0 });
};

//茶会地狱宅急便监听器
QJ.MPMZ.tl.ex_chahuiExpressListener = function(extra={}) {
	
    if (extra.healthCheck) {
        let eid = this.data.eid;
		if (!this.data?.ASABA) {
            const events = $gameMap.drill_COET_getEventsByTag_direct("猫耳浅羽");
			if (events.length > 0) {
				const eventId = events[0]._eventId;
				this.data.ASABA = eventId;
		    }			
		}
		let truck = $gameMap.event(eid);
		let asaba = $gameMap.event(this.data.ASABA);
		if (!truck || truck._erased) {
			if (this.data._chahuiDying) return;
            this.data._chahuiDying = true;
			// 商店车消失时，浅羽也必须跟着消失
			dingk.Loot.getMapDrops(asaba,$dataArmors[3]);
            asaba?.erase();
			QJ.MPMZ.deleteProjectile('chahui_express_shadow');
			this.setDead({t:['Time',0]});
			return;		
		}
		let hp = $gameSelfVariables.value([$gameMap.mapId(), eid, 'HP']);
		let mhp = $gameSelfVariables.value([$gameMap.mapId(), eid, 'MHP']);
		let hpRate = hp / mhp;
		if (!asaba) return;
		if ( hpRate < 0.98 && !this._hatred ) {
			// 激怒浅羽进入战斗状态
			$gameSelfSwitches.setValue([$gameMap.mapId(), this.data.ASABA, 'B'], true);
			this._hatred = true;		     		
		}
		// 浅羽和商店车状态互相绑定，共享眩晕时间
		if (truck._IsDisabledCounter > 0) {
			asaba._IsDisabledCounter = truck._IsDisabledCounter;
		}
		// 点金效果检测
		let golden = $gameSelfSwitches.value([$gameMap.mapId(), eid, 'G']) || false;
		$gameSelfSwitches.setValue([$gameMap.mapId(), this.data.ASABA, 'G'], golden);						
		return;
	}


	if (!this) return;
	this.drill_EFIE_playShowingAppear?.( 1 );
	let eid = this._eventId;
	let posX = `$gameMap.event(${eid})?.screenBoxXShowQJ()`;
    let posY = `$gameMap.event(${eid})?.screenBoxYShowQJ()`;
	let code = `!$gameMap.event(${eid}) || $gameSelfSwitches.value([$gameMap.mapId(), ${eid}, 'D'])`;	
	QJ.MPMZ.Shoot({
		eid,
		ASABA: extra.ASABA,
		groupName: ['BossMonitor'],
		position:[["S",posX],["S",posY]],
		initialRotation: ['S',0],
		moveType:['S',0],
		imgRotation:['S',0],
		collisionBox:['C',1],
		existData: [
			{t:['S',code,true]},
		],       
		moveF: [
			[10,6,QJ.MPMZ.tl.ex_chahuiExpressListener,[{healthCheck:true}]]
		],
		deadF: [
            [QJ.MPMZ.tl.ex_chahuiExpressListener,[{healthCheck:true}]]
		]
    });	  		
};

//茶会地狱宅急便
QJ.MPMZ.tl.ex_chahuiExpress = function(extra = {}) {

  if (extra.exhaustFumes) {
     let posX = this._realX + 1;
     let posY = this._realY + 1.5;
     let name = "dust_walk" + this.time;
     $gameScreen._particle.particleSet(0, name, 'tilemap', 'dust_walk', 'below', posX, posY);     
	 $gameScreen._particle.reservePluginCommand(30,{},["clear",name],1);
     return;
  }

  if (extra.cryingCatgirls) {
	 let eid  = this._eventId; 
     let posX = `$gameMap.event(${eid})?.screenShootXQJ() + 144`;
     let posY = `$gameMap.event(${eid})?.screenShootYQJ() + 20`;
     QJ.MPMZ.Shoot({
         img:"NekoAsaba_Defeat", anchor:[0.22,1], 
         position:[['S',posX],['S',posY]], z:4,existData:[], 
         initialRotation:['S',0],imgRotation:['S',0],
         mapPassable:[false, false, false, false],
         collisionBox:['C',20],moveType:['D',true],
         moveJS: [
            [20, 20, `if (this._realY+0.4 >$gamePlayer.centerRealY()) {this.changeAttribute("z",4)} else {this.changeAttribute("z","E")}`]			
         ]
     });
     posX += "+40";
     posY += "-9";	 
     QJ.MPMZ.Shoot({
         img:"NekoMio_Defeat", anchor:[0.22,1], 
         position:[['S',posX],['S',posY]], z:4,existData:[], 
         initialRotation:['S',0],imgRotation:['S',0],
         mapPassable:[false, false, false, false],
         collisionBox:['C',20],moveType:['D',true],
         moveJS: [
            [20, 20, `if (this._realY+0.4 >$gamePlayer.centerRealY()) {this.changeAttribute("z",4)} else {this.changeAttribute("z","E")}`]
         ]
     });  
     return;
  }
	
  if (extra.commonOccurrence) {
      if ($gameSelfSwitches.value([1, 41, 'A'])) return;
      if ($gameVariables.value(60) > 1 || $gameSwitches.value(123)) return;
      if (Math.random() > 0.9) {
          $gameSelfSwitches.setValue([1, 41, 'A'], true);
          QJ.SE.spawnRegionNum(1,41,[110],1,true);
      }	  
     return;
  }	  
	
  $gameParty.gainItem($dataItems[53], -1);
  $gameSelfSwitches.setValue([1, 41, 'A'], true);
  let posX = this.inheritX() + 720;
  let posY = this.inheritY() - 24;	
  let time = 150;
  let speed = '0|11~' + time + '/0~999/0';
  // 预加载好事件资源
  QJ.SE.preloadEventResources?.(1, 41);
  // 车车本体
  let chahui = QJ.MPMZ.Shoot({
        img:"chahui_express[6,8]",
		groupName: ['chahuiExpress'],
        position:[['S',posX],['S',posY]],
        initialRotation:['S',270],
        imgRotation:['S',0],
        scale:1,
        opacity:'0|0~20/1~99999/0',
        moveType:['S',speed],
        blendMode:0,
		anchor:[0.5,0.5],
		collisionBox:['C',1],
        existData:[
          	{t:['S',"$gamePlayer.screenShootXQJ()>=this.inheritX()",true],a:['F',QJ.MPMZ.tl.ex_chahuiExpressNormalParking,[null]]},
        ],
		moveF:[
		   [1,1,QJ.MPMZ.tl.ex_chahuiExpress,[{exhaustFumes:true}]],
		   [time,99999,QJ.MPMZ.tl.ex_chahuiExpressNormalParking,[null]]
		],
        timeline:['S',0,10,[180,2,5]],
		//afterImage:['#bfb095','0|1~25/0~999/0',45,120],
        z: 5
    });
	
	let Bindex = chahui.index;
          posX = chahui.inheritX() + 12;
          posY = chahui.inheritY() - 76;	
     // 车车阴影
     QJ.MPMZ.Shoot({
        img:"chahui_express_shadow",
		groupName: ['chahuiExpressShadow'],
        position:[['S',posX],['S',posY]],
        initialRotation:['S',270],
        imgRotation:['S',0],
        scale:1,
		anchor:[0.5,0,5],
        opacity:0.6,
		collisionBox:['C',1],
        moveType:['S',speed],
        blendMode:2,
        existData:[
		  {t:['BE',Bindex]},  
        ],
        z:"E"
    });	
	
    posY = chahui.inheritY();		
	// 碰撞判定
     QJ.MPMZ.Shoot({
		groupName: ['chahuiExpressHitBox'],
        nonPlayerDamage: true,
        position:[['S',posX],['S',posY]],
        initialRotation:['S',270],
        imgRotation:['S',0],
        scale:1,
		anchor:[0.5,0],
        opacity:0,
		collisionBox:['R',260,60],
        moveType:['S',speed],
        blendMode:0,
        existData:[
		  {t:['BE',Bindex]},
          {t:['P'],a:['F',QJ.MPMZ.tl.ex_playerDamageCheck,[250,2]],p:[-1,false,true]},	  
		  {t:['P'],a: ['F', QJ.MPMZ.tl.customPositionKnockbackTarget, [3]],p:[-1,false,true]},
		  {t:['P'],a:['F',QJ.MPMZ.tl.ex_chahuiExpressNormalParking,[Bindex]]},	
		  {t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_JackBombExplode,[0]],p:[-1,false,true]},	
        ],
    });	

};	

//茶会地狱宅急便-正常停车	
QJ.MPMZ.tl.ex_chahuiExpressNormalParking = function(bid) {

	let eveX = (this.x - 130) / 48;
	let eveY = (this.y - 4) / 48;
	console.log(QJ.SE.isEventResourcesReady(1, 41));
	let eid = $gameMap.spawnEventQJ(1,41,eveX,eveY,true);
	this.changeAttribute("moveType",['S',0]);
	if (!bid) return;
	// 和玩家发生了碰撞
	let target = $gameMap.event(eid);
	if (target) {
		
		AudioManager.playSe({ name: "靴でブレーキ", volume: 60, pitch: 100, pan: 0 });	 
		target._directionFix = false;
		target.setDirection(8);
		target._directionFix = true;
		target.drill_COET_addTag('撞人');
		$gameTemp._drill_COET_needRestatistics = true;
	}
 
    QJ.MPMZ.Shoot({
       img: "animehit[5,4]",
       initialRotation: ['S', 0],
       position: [['P'], ['P']],
       scale: 2,
       moveType: ['S', 0],
       opacity: 1,
       blendMode: 0,
       z: "MF_UG",
       existData: [
		 { t: ['Time', 19] }
	  ]
    }); 

    let bullet = $gameMap._mapBulletsQJ[bid];
    if (bullet) {
        bullet.changeAttribute("moveType",['S',0]);
    }
};

//茶会地狱宅急便-猫耳澪判定生成
QJ.MPMZ.tl.ex_chahuiExpressNPCDialogueTrigger = function() {
	
	if (!this) return;
    let posX = this.screenBoxXShowQJ() - 60;
    let posY = this.screenBoxYShowQJ();
    QJ.MPMZ.Shoot({
        img:"null1",
		groupName: ['shopkeeperMio'],
        position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
        imgRotation:['F'],
        collisionBox:['R',48,72],
		anchor: [0.6, 0.2],
        moveType:['S',0],
        existData:[	
		  //{t:['Time',19]},
        ],
    });
};

//茶会地狱宅急便-商品互动文本
QJ.MPMZ.tl.ex_chahuiExpressGoodsTrigger = function() {
	if (!this) return;
    let eid = this._eventId;
    let itemId = this._dropItemId   || $gameSelfVariables.value([$gameMap.mapId(), eid, 'dropsId']);
	let type   = this._dropItemType || $gameSelfVariables.value([$gameMap.mapId(), eid, 'dropsType']);
	let lang   = ConfigManager.language;
	let item,colorCode,descTable,itemName;
	
	switch (type) {
       case 1:
	      descTable = window.itemsDescription;
		  item = $dataItems[itemId];
		  colorCode = ($gameTemp.drill_ITC_getColorCode_Item && $gameTemp.drill_ITC_getColorCode_Item(itemId)) || "";
          break;	
       case 2:	 
	      descTable = window.weaponsDescription;
          item = $dataWeapons[itemId];
          colorCode = ($gameTemp.drill_ITC_getColorCode_Weapon && $gameTemp.drill_ITC_getColorCode_Weapon(itemId)) || "";			 
          break;
       case 3: 
	      descTable = window.armorsDescription;
          item = $dataArmors[itemId];
          colorCode = ($gameTemp.drill_ITC_getColorCode_Armor && $gameTemp.drill_ITC_getColorCode_Armor(item.id)) || "";			 
          break;		 
	}
    if (!item) item = $dataItems[3];
	
	let price = item.price * 2;
	    price = Math.max(500, price);
	this._itemPrice = price;
	
	const nameSuffix = item.nameSuffix || "";
	const descObj = (descTable && descTable[String(itemId)]) ? descTable[String(itemId)] : null;
    const displayName = descObj ? (descObj["name"] || item.name) : (item.name || "");
    if (colorCode) {
        itemName = "\x1bcsave\x1bcc[" + colorCode + "]" + displayName + nameSuffix + "\x1bcload";
    } else {
        itemName = displayName + nameSuffix;
    }

	$gameVariables.setValue(84, itemName);
	$gameVariables.setValue(85, price);

    let tag     = "nekoTruck";
    let index   = 1;	
    let option1 = window.mapCommonEventDialogue?.[tag]?.[String(index)]?.[0] || "buy it!";
    let option2 = window.mapCommonEventDialogue?.[tag]?.[String(index)]?.[1] || "Never mind…";	
    let option3 = window.mapCommonEventDialogue?.[tag]?.[String(index)]?.[2] || "Sneakily take it…";	
    $gameStrings.setValue(6,option1);
    $gameStrings.setValue(7,option2);	
	$gameStrings.setValue(8,option3);

};

// 放生寿司布丁
QJ.MPMZ.tl.ex_sushiPudding = function(extra={}) {

    if (extra.standByAki) {
	   // 出现在aki旁边的版本
       let posX = this.screenBoxXShowQJ() + 100;
       let posY = this.screenBoxYShowQJ() - 45;	 
       QJ.MPMZ.Shoot({
			img:"Sushi Pudding[3,10]",
			groupName: ['sushiPudding'],
			position:[['S', posX],['S', posY]],
			initialRotation:['S',0],
			imgRotation:['S',0],
			moveType:['S',0],
			scale:[-0.5,0.5],
			existData:[
			],
			timeline:['S',0,60,[0,4,30]]
        });
        return;	 
    }
	
    if (extra.summonAki) {
	   // 放飞寿司布丁
		let bullet = QJ.MPMZ.Shoot({
				groupName: ['sushiPuddingTarget'],
				position:[['S',1300],['S',0]],
				initialRotation:['S',0],
				imgRotation:['F'],
				onScreen:true,
				moveType:['S',0],
				scale:0.5,
				existData:[
					{t:['Time', 6000]}
				]
		});
        // 让寿司布丁去追踪标记
		const index = bullet.index;
		const voice = "Sushi Pudding_voice" + (3 + Math.randomInt(2));
		AudioManager.playSe({ name: voice, volume: 90, pitch: 100, pan: 0 });	
		
		let posX = $gamePlayer.screenBoxXShowQJ();
		let posY = $gamePlayer.screenBoxYShowQJ() - 20;
		QJ.MPMZ.Shoot({
			img:"Sushi Pudding[3,10]",
			groupName: ['sushiPudding'],
			position:[['S',posX],['S',posY]],
			initialRotation:['S',0],
			imgRotation:['S',0],
			moveType:['TB','sushiPuddingTarget',3,10,20],
			scale:0.5,
			existData:[
			  {t:['Time',999],d:[0,30]}	
			],
			timeline:['S',0,40,[-1,8,20]],
		});			
		return;	
    }

    let voice = "Sushi Pudding_voice" + Math.randomInt(2);
    AudioManager.playSe({ name: voice, volume: 90, pitch: 100, pan: 0 });
	
    QJ.MPMZ.Shoot({
        img:"Sushi Pudding[3,10]",
		groupName: ['sushiPudding'],
		position:[['P'],['P']],
        initialRotation:['S',0],
		imgRotation:['S',0],
        moveType:['B',-1,0,-20,0,-20,0,-20,0,-20],
        scale:0.5,
        existData:[
          {t:['Time', 120],a:['F', QJ.MPMZ.tl.ex_sushiPudding, [{summonAki:true}]]}	
        ]
    });	
};

// 玩家乘坐公共交通工具
QJ.MPMZ.tl.playerRideVehicle = function() {

    let eid   = this._eventId;    
    let posX = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenBoxXShowQJ() : $gameMap.displayX()`;
    let posY = `$gameMap.event(${eid}) ? $gameMap.event(${eid}).screenBoxYShowQJ() : $gameMap.displayY()`;
	let listener = QJ.MPMZ.Shoot({
		groupName:['Vehicle'],
		position:[['S',posX],['S',posY]],
		initialRotation:['S',0],
		imgRotation:['F'],
		anchor:[0.5,0.5],
		eid: eid,
		moveType:['D',true],
		collisionBox:['C',18],
		existData:[ 
		    {t:['B',['playerFeet']],a:['F',QJ.MPMZ.tl.playerRideVehicleDetection],p:[-1,false,true],c:['T',0,0,true]}, 		  
		],
		moveF:[
		  [15,15,QJ.MPMZ.tl.ex_exitVehicleDetection]
		]
	});	
};

// 按压式石板陷阱
QJ.MPMZ.tl.ex_pressurePlateTrap = function(XX,YY) {
   	
   QJ.MPMZ.Shoot({
        img:"pressurePlate_off",
		groupName: ['pressurePlate'],
		position:[['Map',XX],['Map',YY]],
        initialRotation:['S',0],
		imgRotation:['S',0],
        moveType:['S',0],
        scale:1,
		collisionBox:['C',18],
		anchor:[0.5,0.65],
		trapTaget: [],
		z: "E",
        existData:[
            {t:['B',["playerFeet"]],a:['F',QJ.MPMZ.tl.ex_flameSpewingStatueTrap,["fire"]],p:[-1,false,true],c:['T',0,6,true]},
			{t:['G',['"enemy"','"object"']],a:['F',QJ.MPMZ.tl.ex_flameSpewingStatueTrap,["fire"]],p:[-1,false,true],c:['T',0,6,true]},
        ],
		moveF:[
		    [10,10,QJ.MPMZ.tl.ex_flameSpewingStatueTrap]
		]
    });   
	
};


// 变成河里的祭品
QJ.MPMZ.tl.becomeWaterSacrifice = function() {
	
	if (!this) return;
	let eid    = this._eventId;
	let target = $gameMap.event(eid);
	if (!target) return;
    let posX   = target.screenBoxXShowQJ();
    let posY   = target.screenBoxYShowQJ() + 6; 
    
    QJ.MPMZ.Shoot({
        position:[['S',posX],['S',posY]],
		img:"baitAnimation[4,18]",
        groupName: ['bait'],
		collisionBox:['C',45],
        initialRotation:['S',0],
		imgRotation:['F'],
		opacity: '0|0~30/1~7200|1',
        moveType:['S',0],
		anchor:[0.5,0.4],
		blendMode: 0,
		z:"E",
        existData:[
           {t:['Time',7200], d:[0,30]}
        ],
    });    	
	// 增加河内掉落物
	let maxFishing = $gameSelfVariables.value([$gameMap.mapId(), 1, 'maxFishing']);
	maxFishing += 2 + Math.randomInt(3);
	$gameSelfVariables.setValue([$gameMap.mapId(), 1, 'maxFishing'], maxFishing);
};

// 放置诱饵
QJ.MPMZ.tl.generateDecoyObject = function() {
	
	if (!this) return;
    let posX    = this.screenBoxXShowQJ();
    let posY    = this.screenBoxYShowQJ();
	let time    = 720;
	let range   = 180;
	let inWater = $gameMap.regionId( this._x, this._y ) === 8;
	// 在水里持续时间更长
	if (inWater) {
		time += 720;
		range = 90;
	}
	
    let Decoy = QJ.MPMZ.Shoot({
        position:[['S',posX],['S',posY]],
		groupName: ['bait'],
        initialRotation:['S',0],
        moveType:['S',0],
		imgRotation:['F'],
		collisionBox:['C', range],
		scale:1,
        existData:[
			{t:['Time',time]},
			{t:['G','"enemy"'],a:['F',QJ.MPMZ.tl.decoyAffectsEnemy,[undefined]],p:[-1,false,true,QJ.MPMZ.tl.decoyAffectsEnemy,QJ.MPMZ.tl.decoyStopsAffectingEnemy], c:['T',0,30,true]},
			{t:['B','fire'],a:['F',QJ.MPMZ.tl.decoyStopsAffectingEnemy,[undefined]],cb:['C',Math.round(range/2.5)]}
        ],
    });
	time -= 100;
    posX  = this._x;
    posY  = this._y;
	let name    = "aura_static_b" + Decoy.index;
    $gameScreen._particle.particleSet(0, name, 'tilemap', 'aura_static_b', 'above', posX, posY);
	if (inWater) {
		$gameScreen._particle.particleUpdate([name,'scale',"0","2@1","0.1@1.5","0"]);
	} else {
		$gameScreen._particle.particleUpdate([name,'scale',"0","5@1","0.1@1.5","0"]);
	}
	$gameScreen._particle.particleUpdate([name,'alpha',"0.05"]);
    $gameScreen._particle.reservePluginCommand(time,{},["clear",name],1);
    AudioManager.playSe({ name: "Fire1", volume: 75, pitch: 50, pan: 0 });	
};
// 诱饵生效
QJ.MPMZ.tl.decoyAffectsEnemy = function(user,args) {
	
    const target = args && args.target;
    if (target instanceof Game_Event) {
		// 非深渊魔物也会被引诱
		if (!target._canBeAlerted) {
			target._waitCount += 3;
			if (!target.isMoved() && target._moveType > 0) {
			  let xx = this.x / 48;
			  let yy = this.y / 48;
			  target.moveToTarget(xx,yy);
			}
	  }
	  return;
	}
	
	if (user instanceof Game_Event) {
	  let xx = Math.floor(this.x / 4.8) / 10;
      let yy = Math.floor(this.y / 4.8) / 10;
	  user.decoyObject = {x:xx, y:yy};
	}

};
// 诱饵失效
QJ.MPMZ.tl.decoyStopsAffectingEnemy = function(user,args) {
	
	const target = args && args.bulletTarget;
    if (target) {
		// 清除诱饵演出
		let name = "aura_static_b" + this.index;
		$gameScreen._particle.reservePluginCommand(1,{},["clear",name],1);
		// 粉尘爆炸
		QJ.MPMZ.tl.ex_bombFiendSoul.call(this,null,null,{scaleFix:2});
		return;
	}
	
	if (user instanceof Game_Event) {
	  if (user._moveType > 0) {
	    user.decoyObject = null;
	    user.requestBalloon(7);
	    user.enterNormalState();
	  }
	}
};

// 恶魔石板
QJ.MPMZ.tl.ex_demonTabletPulse = function(damage) {
    const leader = $gameParty.leader();
    const level = leader.skillMasteryLevel(103);
    const radius = 60 + 30 * level;
    const posX = $gamePlayer.screenBoxXShowQJ();
    const posY = $gamePlayer.screenBoxYShowQJ();
    const pulseDamage = damage * (3 + 3 * level);
    const attackData = {
        noHitEffect: true,
        noDurLoss: true,
        magicAttack: true,
        independentAttack: true,
        specifyAddedStatus: true,
        addedStatusType: 0
    };

    // 一次性范围结算，每个敌人只命中一次。
    QJ.MPMZ.rangeAtk(
        [['S', posX], ['S', posY]],
        ['G', ['"enemy"']],
        ['F', QJ.MPMZ.tl.ex_toEnemyAttack, [pulseDamage, attackData]],
        ['C', radius]
    );

    // circle3g 原图为 134×134，最终缩放值与伤害半径共用 radius。
    const maxScale = radius / 67;
    const particle = $gameScreen._particle;
    $gameTemp._demonTabletPulseSerial = ($gameTemp._demonTabletPulseSerial || 0) + 1;
    const particleId = `demonTabletPulse_${$gameTemp._demonTabletPulseSerial}`;

    AudioManager.playSe({ name: 'Darkness3', volume: 60, pitch: 100, pan: 0 });
    const data = particle.particleSet(0, particleId, 'player', 'aura_bp2');
    particle.particleUpdate([
        particleId, 'pos',
        String(posX - $gamePlayer.screenX()),
        String(posY - $gamePlayer.screenY())
    ]);
    // 保留原预设 0 → 4 → 4.5 的扩散节奏，按目标半径等比缩放。
    particle.particleUpdate([
        particleId, 'scale', '0@0', `${maxScale * 4 / 4.5}@0.18`, `${maxScale}@1`
    ]);
    particle.particleUpdate([particleId, 'speed', '0']);
    particle.particleUpdate([particleId, 'color', '#ff4665']);
    data.clear = true;
};

//玩家接近伤害监听器
QJ.MPMZ.tl.ex_playerCloseRangePiercingAttackListeners = function() {

	 if($gameMap.getGroupBulletListQJ('playerCloseRangePiercingAttack').length > 0) return;
	 
       let listeners = QJ.MPMZ.Shoot({
            groupName: ['playerCloseRangePiercingAttack','equipmentEffect'],
            img: "null1",
            position: [['P'], ['P']],
            initialRotation: ['S',0],
            moveType: ['B',-1],
			opacity:0,
			collisionBox:['C',28],
            existData: [			  
            ],          
        });	
		
		 if ($gameParty.leader().hasSkill(89)) {
		 listeners.addExistData({t:['G',['"enemy"']],a:['F',QJ.MPMZ.tl.ex_playerCloseRangePiercingAttack,[{type:"auto"}]],p:[-1,false,true],c:['T',0,20,true]});
		 }		
		 if ($gameParty.leader().hasSkill(90)) {
		 listeners.addExistData({t:['G',['"enemy"']],a:['F',QJ.MPMZ.tl.ex_playerCloseRangePiercingAttack,[{type:"attack"}]],p:[-1,false,true],c:['T',0,20,true]});
		 }
		 if ($gameParty.leader().hasSkill(91)) {
		 listeners.addExistData({t:['G',['"enemy"']],a:['F',QJ.MPMZ.tl.ex_playerCloseRangePiercingAttack,[{type:"move"}]],p:[-1,false,true],c:['T',0,20,true]});
		 }		 
		 
};

//玩家接近伤害
QJ.MPMZ.tl.ex_playerCloseRangePiercingAttack = function(extraData = {},args) {
	
   if (args && args.target && args.target instanceof Game_Event) {	
	if (extraData.type && extraData.type == "auto") {
		let damage = 1 + $gameParty.leader().skillMasteryLevel(89);
	    QJ.MPMZ.tl.customEnemyDamageCalculation(damage,args.target);
		return;
	 }
	 
	if (extraData.type && extraData.type == "attack") {
		if (TouchInput.drill_isLeftPressed()) {
		let damage = 2 + $gameParty.leader().skillMasteryLevel(90);
	    QJ.MPMZ.tl.customEnemyDamageCalculation(damage,args.target);
	   }
        return;
	 }	 

	if (extraData.type && extraData.type == "move") {
		if ($gamePlayer.isMoved()) {
		let damage = 2 + $gameParty.leader().skillMasteryLevel(91);
		damage *= 1.02 ** $gamePlayer.realMoveSpeed();
	    QJ.MPMZ.tl.customEnemyDamageCalculation(Math.floor(damage),args.target);
	   }
        return;
	 }
	 
   }
};

//矿车监听器
QJ.MPMZ.tl.ex_minecartListener = function(ID) {
	
	let Mcode = "$gameMap.event(" + ID + ").isMoved()";
	let Dcode = "!$gameMap.event(" + ID + ")";	
	
	QJ.MPMZ.Shoot({
		img:"null1",
		groupName:['minecart'],
		position:[['E',ID],['E',ID]],
		initialRotation:['S',0],
		imgRotation:['F'],
		anchor:[0.5,2.0],
		eid: ID,
		moveType:['D',true],
		collisionBox:['C',18],
		existData:[ 
		  {t:['S',Dcode,true]},
		  {t:['P'],a:['F',QJ.MPMZ.tl.playerRideVehicleDetection],p:[-1,false,true],c:['T',0,0,true]}, 
		  {t:['G',['"enemy"',]],a:['F',QJ.MPMZ.tl.customEnemyDamageCalculation,[100,{}]],p:[-1,false,true],c:['S',Mcode]},
		],
		moveF:[
		  [15,15,QJ.MPMZ.tl.ex_exitVehicleDetection]
		]
	});
	
};

//乘坐交通工具检测
QJ.MPMZ.tl.playerRideVehicleDetection = function() {
	 
	 let eid    = this.data.eid;
	 let target = $gameMap.event(eid);
	 if (!target) return;
	 
	 if (!this._playerRiding) {
	 // 标记乘坐状态 
       this._playerRiding = true;
	   $gameSwitches.setValue(188, true);
	 }
     this._oldrealX = this._oldrealX || target._realX;
     this._oldrealY = this._oldrealY || target._realY; 
	 
	 if (target.isMoved()) {
     let difX = target._realX - this._oldrealX;
     let difY = target._realY - this._oldrealY;
     difX += $gamePlayer._realX;
     difY += $gamePlayer._realY;
     // 让玩家强制移动
     $gamePlayer.locate(difX, difY);
     this._oldrealX = target._realX;
     this._oldrealY = target._realY;	 
   }
};

//离开交通工具检测
QJ.MPMZ.tl.ex_exitVehicleDetection = function() {
	
	if (!this._playerRiding) return;
	let xx = this.inheritX(); 
    let yy = this.inheritY();

	if (QJ.MPMZ.rangeAtk([['S', xx],['S', yy]],['B','playerFeet'],[],['C',24]).length == 0) {
	   this._oldrealX = undefined;
	   this._oldrealY = undefined;
	   this._playerRiding = false;
	   $gameSwitches.setValue(188, false);
    }	
	
};
