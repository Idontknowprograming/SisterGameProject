//=============================================================================
// Shiroin_RecallStage.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 回想舞台系统：快照停放当前世界 → 全新世界按预设播放回想事件 → 结束整档还原。
 * @author Shiroin
 *
 * @help
 * ============================================================================
 * 设计概要
 * ============================================================================
 * 回想不在玩家的存档世界里播，而是：
 *   进舞台：把当前所有 $game* 对象"停放"进内存快照（零拷贝零序列化），
 *           然后 DataManager.createGameObjects() 换一套数据库初始模板的新世界，
 *           传送到空白舞台地图；地图明确加载并完成 setup 后，再应用
 *           【通用预设 + 该回想的专属预设 + 该回想的登记记录】，
 *           最后由舞台布置函数用 QJ.SE 复制事件上台自动开演。
 *   出舞台：把停放的原世界对象原样赋回（同读档流程），回到原地图原位置，
 *           舞台期间发生的一切结算/增减全部蒸发。还原后做指纹校验兜底。
 *
 * ============================================================================
 * 使用步骤
 * ============================================================================
 * 1. 在编辑器准备一张空白舞台地图，把地图ID填到下方配置 stageMapId。
 * 2. 在【通用初始参数列表 commonPreset】登记所有回想共用的初始状态
 *    （比如总是给玩家5000元钱）。
 *    需要读取进入前的持有情况时，写在 captureCommonPreset 中，返回本次要带入的预设。
 * 3. 在【舞台布置表 stageSetupMap】按CG选项名(唯一key)登记条目，推荐对象形式：
 *        "tea_party_1": {
 *            maps: [10],
 *            preset: { variables: { 61: 12, 62: 0 } }, // 无登记记录时的事件专属兜底
 *            setup(record){ QJ复制事件上台 }
 *        }
 *    maps 声明用到的事件源地图id，进舞台时才按需异步加载（与转场并行，
 *    不占启动预加载），setup 在舞台与源地图数据都就绪后执行。
 * 4. 画廊的回想脚本表(DrillUp.g_SGaA_recallScriptMap)里对应条目填一行：
 *        "RecallStage.start('tea_party_1');"
 * 5. 剧情事件首次通关时，登记要带进回想的参数（默认只记第一次，不覆盖）：
 *        RecallStage.record("tea_party_1", {
 *            variables: { 3: $gameVariables.value(3) },   // 舞台上自动还原到3号变量
 *            maxHp: $gameParty.leader()?.mhp ?? 1,        // 舞台上同步领队最大HP并回满HP
 *            days: $gameVariables.value(3),               // 自由字段，舞台上手动读取
 *        });
 * 6. 支持回想的事件结尾加分歧：
 *        ◆条件分歧(脚本)：RecallStage.isActive()
 *            ◆脚本：RecallStage.finish(this);      ←（务必传 this，且后面不要再放指令）
 *        ：否则
 *            ◆（正常的结算流程）
 *
 * ============================================================================
 * API 一览
 * ============================================================================
 *   RecallStage.start( optionKey [, setupFn] )  进入回想舞台（一般由画廊按钮调用）
 *   RecallStage.finish( interpreter )           结束回想，整档还原回原地图（舞台事件结尾调用，传 this）
 *   RecallStage.isActive()                      当前是否处于回想舞台（事件分歧用）
 *   RecallStage.activeRecord()                  回想中读取该条登记记录（含自由字段）
 *   RecallStage.record( key, params, overwrite )首次通关登记参数（默认已有记录时不覆盖，返回是否写入）
 *   RecallStage.hasRecord( key )                是否已有登记记录
 *   RecallStage.getRecord( key )                读取登记记录（无则 null）
 *   RecallStage.clearRecord( key )              删除登记记录
 *
 * 应用顺序：commonPreset → captureCommonPreset 的缓存结果 → 条目 preset → 登记记录。
 * 因此真实登记记录中的同名变量会覆盖 preset；作弊解锁等没有记录的情况则保留 preset。
 *
 * 预设/记录支持的自动应用字段（其余字段作为自由字段保留，靠 activeRecord() 读取）：
 *   gold:1000  items:[[id,数量],..]  weapons:[[id,数量],..]  armors:[[id,数量],..]
 *   variables:{变量id:值,..}  switches:{开关id:true,..}
 *   partyMembers:[角色id,..]  actors:{角色id:{level:20},..}  maxHp:领队最大HP（同步后回满）
 *   script:函数或脚本串
 */
//=============================================================================

(() => {
"use strict";

const RecallStage = window.RecallStage = window.RecallStage || {};

//==============================
// * 配置（手动维护）
//==============================
Object.assign( RecallStage, {
	stageMapId: 22,			//（回想舞台地图ID，编辑器里准备的空白地图；0=未配置，start会报错提示）
	stageX:     0,			//（进舞台时玩家落点 x）
	stageY:     0,			//（进舞台时玩家落点 y）
	stageDir:   2,			//（进舞台时玩家朝向 2下/4左/6右/8上）
	backupSavefileId: 0,	//（>0 则进舞台前往该存档位写一份隐藏备份档，防回想中途崩溃丢失最近进度；0=关闭）
});

//==============================
// * 通用初始参数列表（手动维护）
//
//			说明：	所有回想舞台共用的初始状态，舞台地图加载完成后最先应用，
//					之后依次应用入场缓存、该回想条目的专属预设、登记记录（后者优先）。
//==============================
RecallStage.commonPreset = {
	//	gold: 5000,
	//	items:        [ [5,2], [7,1] ],
	//	variables:    { 12: 3 },
	//	switches:     { 21: true },
	//	partyMembers: [ 1 ],
	//	actors:       { 1: { level: 20 } },
	//	maxHp:        500,
	variables:    { 15: 7, 18: 7 },	
	script: () => { 
		    $gameMap.steupCEQJ(6, 1, {setMode: "home"});  // 隐藏UI
			QJ.MPMZ.tl._imoutoUtilCheckInitialization();
	},
};

//==============================
// * 入场通用预设缓存（手动维护）
//
//			说明：	每次 start 在切换世界前调用，此时 $game* 和装备数据库均属于原世界。
//					只读取原世界，返回由编号、数量等纯数据组成的预设（不返回函数或游戏对象）。
//					结果深拷贝后临时缓存，舞台地图就绪时应用一次，退出/下次进入不会沿用。
//					optionKey 为本次回想key；items/weapons/armors 都按填写数量发放。
//==============================
RecallStage.captureCommonPreset = function( optionKey ){
	return {
		// 原世界拥有75号护甲（含已穿戴）时，给舞台背包发放1件。
		armors: $gameParty.hasItem( $dataArmors[75], true ) ? [ [75, 1] ] : [],
	};
};

//==============================
// * 舞台布置表（手动维护）—— key = CG选项名(唯一key)
//
//			说明：	条目为对象 { maps:[源地图id..], preset:{..}, setup(record){..} } 或直接函数。
//					maps 声明的源地图在进舞台时才按需异步加载（不占用启动预加载，
//					回想是低频功能，不让所有玩家承担这份开销），与转场并行，
//					preset 是该回想专属的兜底预设，在登记记录之前应用；若存在真实
//					登记记录，其中同名变量会再覆盖 preset，适合为作弊解锁准备默认时间。
//					setup 于舞台地图与全部源地图数据就绪后执行，参数为该回想的登记记录，
//					一般在这里用 QJ 复制事件上台（复制后 .start() 即开演）。
//					直接函数形式不会按需加载，源地图数据需自行保证就绪。
//==============================
RecallStage.stageSetupMap = {
	//	"tea_party_1": {
	//		maps: [ 10 ],
	//		preset: { variables: { 61: 12, 62: 0 } },	//（当前工程：61=时、62=分）
	//		setup( record ){
	//			QJ.SE.spawnXy( 10, 2, 8, 6 );		//（把10号地图的2号事件复制到舞台(8,6)）
	//		},
	//	},
	"430": {
		maps: [ 6 ],
		setup( record ){
			const eid = $gameMap.spawnEventQJ( 6, 7, 4, 4 );	
			if( eid != null ){
				$gameMap.event( eid ).start();
			}
		},
	},
	"431": {
		maps: [ 6 ],
		setup( record ){
			const eid = $gameMap.spawnEventQJ( 6, 4, 4, 4 );	
			if( eid != null ){
				$gameMap.event( eid ).start();
			}
		},
	},
	"432": {
		maps: [ 6 ],
		setup( record ){
			const eid = $gameMap.spawnEventQJ( 6, 2, 4, 4 );	
			if( eid != null ){
				$gameMap.event( eid ).start();
			}
		},
	},
	"433": {
		maps: [ 38 ],
		preset: {
			variables: {
				61: 12, // 时
				62: 0,  // 分
			},
		},		
		setup( record ){
			const eid = $gameMap.spawnEventQJ( 38, 16, 4, 4 );
			if( eid != null ){
				$gameMap.event( eid ).start();
			}
		},
	},
	"434": {
		maps: [ 54 ],
		setup( record ){
			const eid = $gameMap.spawnEventQJ( 54, 10, 4, 4 );	
			if( eid != null ){
				$gameMap.event( eid ).start();
			}
		},
	},
	"435": {
		maps: [ 3 ],
		setup( record ){
			const eid = $gameMap.spawnEventQJ( 3, 17, 4, 4 );	
			if( eid != null ){
				$gameMap.event( eid ).steupCEQJ(2);
			}
		},
	},
	"436": {
		maps: [ 3 ],
		setup( record ){
			const eid = $gameMap.spawnEventQJ( 3, 13, 4, 4 );	
			if( eid != null ){
				$gameMap.event( eid ).steupCEQJ(1);
			}
		},
	},
	"437": {
		maps: [ 3 ],
		setup( record ){
			const eid = $gameMap.spawnEventQJ(3, 7, 4, 4, false, {}, 7);	
			if( eid != null ){
				$gameMap.event( eid ).steupCEQJ(1);
			}
		},
	},
	"438": {
		maps: [ 6 ],
		preset: {
			variables: {
				61: 17, // 时
				62: 0,  // 分
			},
		},		
		setup( record ){
			const eid = $gameMap.spawnEventQJ( 6, 10, 4, 4 );
			if( eid != null ){
				$gameMap.event( eid ).steupCEQJ(2, {together: true});
			}
		},
	},
	"440": {
		maps: [ 20 ],
		setup( record ){
			const eid = $gameMap.spawnEventQJ(20, 22, 4, 4, false, {recallId:440}, 22);	
			if( eid != null ){
				$gameMap.event( eid ).steupCEQJ(1);
			}
		},
	},
	"441": {
		maps: [ 20 ],
		setup( record ){
			const eid = $gameMap.spawnEventQJ(20, 22, 4, 4, false, {recallId:441}, 22);	
			if( eid != null ){
				$gameMap.event( eid ).steupCEQJ(1);
			}
		},
	},
	"466": {
		maps: [ 6 ],
		setup( record ){
			const eid = $gameMap.spawnEventQJ(6, 5, 4, 4, false, {recallId:466}, 5);	
			if( eid != null ){
				$gameMap.event( eid ).steupCEQJ(1);
			}
		},
	}
};


//==============================
// * 内部状态（模块级，不进存档；回想期间禁存档，崩溃时磁盘存档不受影响）
//==============================
Object.assign( RecallStage, {
	_active:       false,	//（是否处于回想舞台）
	_snapshot:     null,	//（停放的原世界对象包，即 makeSaveContents 的引用集合）
	_activeKey:    "",		//（当前回想的选项名key）
	_activeRecord: null,	//（当前回想的登记记录，换世界前深拷贝取出）
	_pendingSetup: null,	//（待执行的舞台布置函数，舞台地图与源地图数据都就绪时消费）
	_pendingMaps:  null,	//（该回想声明的事件源地图id列表，等待其异步加载完成）
	_pendingWaitCount: 0,	//（源地图数据等待帧数，超时自动退出回想兜底）
	_fingerprint:  null,	//（进舞台前的数据指纹，还原后校验用）
	_nameState:    null,	//（带入临时世界的主角姓名状态；含不进存档的姓名框全局后缀）
	_buttonRuntime: null,	//（原世界按钮的内存快照，独立于 $game*；只用于回想进出）
	_finishing:    false,	//（已请求结束，等待场景切换边界执行真正的还原）
	_justRestored: false,	//（刚完成还原，供新 Scene_Map 补一次淡入，仿读档表现）
});

Object.assign( RecallStage, {

	//==============================
	// * 记录 - 首次通关登记（存 $gameSystem，随存档保存）
	//==============================
	record( optionKey, params, overwrite = false ){
		if( this._active ){
			console.warn("[RecallStage] record() 在回想舞台中被调用，写入的是舞台临时世界，还原时将被丢弃。");
		}
		const tank = $gameSystem._recallStageRecords ?? ( $gameSystem._recallStageRecords = {} );
		const key = String( optionKey ?? "" );
		if( !overwrite && tank[key] != null ){ return false; }			//（默认只记第一次）
		tank[key] = JsonEx.makeDeepCopy( params ?? {} );				//（深拷贝，防外部引用后续被改）
		return true;
	},
	//==============================
	// * 记录 - 查询/删除
	//==============================
	hasRecord( optionKey ){
		return this.getRecord( optionKey ) != null;
	},
	getRecord( optionKey ){
		const tank = $gameSystem._recallStageRecords;
		return tank?.[ String( optionKey ?? "" ) ] ?? null;
	},
	clearRecord( optionKey ){
		const tank = $gameSystem._recallStageRecords;
		if( tank ){ delete tank[ String( optionKey ?? "" ) ]; }
	},

	//==============================
	// * 便捷 - 采集MOG时间系统当前值
	//
	//			返回：	可直接并入 record() 的 variables 片段（{变量id:值,...}）。
	//			说明：	MOG_TimeSystem 的时间本质是普通游戏变量（变量号缓存在
	//					$gameSystem._hour_variableId 等字段），采集后随 variables
	//					字段在舞台上自动应用，MOG 会按新时间自行刷新昼夜相位/色调。
	//			用法：	RecallStage.record( "430", { variables: RecallStage.captureMogTimeVars() } );
	//					需要合并其他变量时：{ variables: { ...RecallStage.captureMogTimeVars(), 25: xxx } }
	//==============================
	captureMogTimeVars(){
		const gs = $gameSystem;
		const vars = {};
		const idList = [
			gs._min_variableId,			//（分）
			gs._hour_variableId,		//（时）
			gs._day_variableId,			//（日）
			gs._month_variableId,		//（月）
			gs._year_variableId,		//（年）
			gs._day_week_variableId,	//（星期）
			gs._season_variableId,		//（季节）
		];
		for( const id of idList ){
			if( id > 0 ){ vars[id] = $gameVariables.value( id ); }
		}
		if( gs._sec_variableId > 0 ){ vars[ gs._sec_variableId ] = 0; }	//（秒归零，舞台从整分开始走）
		return vars;
	},

	//==============================
	// * 判断 - 是否处于回想舞台 / 读取当前登记记录
	//==============================
	isActive(){
		return this._active === true;
	},
	activeRecord(){
		return this._activeRecord;
	},

	//==============================
	// * 预设 - 应用（声明式字段 → 游戏状态；未识别字段忽略，作为自由字段保留）
	//==============================
	applyPreset( preset ){
		if( preset == null ){ return; }

		// > 队伍成员（先清空再按列表加入）
		if( Array.isArray( preset.partyMembers ) ){
			for( const actorId of [ ...$gameParty._actors ] ){ $gameParty.removeActor( actorId ); }
			for( const actorId of preset.partyMembers ){ $gameParty.addActor( Number( actorId ) ); }
		}
		// > 角色属性
		if( preset.actors != null ){
			for( const [ key, conf ] of Object.entries( preset.actors ) ){
				const actor = $gameActors.actor( Number( key ) );
				if( actor == null ){ continue; }
				if( conf?.level != null ){
					actor.changeLevel( Number( conf.level ), false );
					actor.recoverAll();
				}
			}
		}
		// > 队伍领队最大HP（setMaxHp 由 YEP_BaseParamControl 提供；无该插件时走原生参数加成）
		if( preset.maxHp != null ){
			const actor = $gameParty.leader();
			const target = Math.round( Number( preset.maxHp ) );
			if( actor != null && Number.isFinite( target ) && target > 0 ){
				if( typeof actor.setMaxHp === "function" ){
					actor.setMaxHp( target );
				}else{
					actor.addParam( 0, target - actor.mhp );
				}

				// 参数倍率不为1时，单纯增减 paramPlus 可能无法一次命中，按实际倍率补正。
				const rate = Number( actor.paramRate( 0 ) ) * Number( actor.paramBuffRate( 0 ) );
				const diff = target - actor.mhp;
				if( diff !== 0 && Number.isFinite( rate ) && rate > 0 ){
					actor.addParam( 0, diff / rate );
				}
				if( actor.mhp !== target ){
					console.warn(
						`[RecallStage] 领队最大HP同步未能精确命中：目标 ${target}，实际 ${actor.mhp}。`
					);
				}
				actor.setHp( actor.mhp );
			}
		}
		// > 金钱（设为目标值，而非增量）
		if( preset.gold != null ){
			$gameParty.gainGold( Number( preset.gold ) - $gameParty.gold() );
		}
		// > 物品/武器/防具（ [[id,数量],...] ）
		const gainList = ( pairs, dataTank ) => {
			if( !Array.isArray( pairs ) ){ return; }
			for( const [ id, count ] of pairs ){
				const item = dataTank[ Number( id ) ];
				if( item == null ){ continue; }
				$gameParty.gainItem( item, Number( count ?? 1 ) );
			}
		};
		gainList( preset.items,   $dataItems   );
		gainList( preset.weapons, $dataWeapons );
		gainList( preset.armors,  $dataArmors  );
		// > 变量/开关
		if( preset.variables != null ){
			for( const [ key, value ] of Object.entries( preset.variables ) ){
				$gameVariables.setValue( Number( key ), value );
			}
		}
		if( preset.switches != null ){
			for( const [ key, value ] of Object.entries( preset.switches ) ){
				$gameSwitches.setValue( Number( key ), value === true );
			}
		}
		// > 自定义脚本（函数直接调用，字符串eval）
		if( preset.script != null ){
			try{
				if( typeof preset.script === "function" ){ preset.script(); }
				else{ eval( String( preset.script ) ); }
			}catch( e ){
				console.error("[RecallStage] 预设 script 执行出错：", e );
			}
		}
	},

	//==============================
	// * 入场 - 清理残留输入（仅舞台初始化时调用一次）
	//==============================
	_clearEntryInput(){
		Input.clear();
		TouchInput.clear();
		// Drill 的物理按键状态独立于引擎 clear；恢复初始值，不伪造释放/双击。
		if( window.Imported?.Drill_CoreOfInput ){
			for( const button of [ "left", "middle", "right" ] ){
				TouchInput[ `_drill_COI_${button}Pressed` ] = false;
				for( const state of [ "PressedTime", "ReleasedTime", "DoubledTime" ] ){
					TouchInput[ `_drill_COI_${button}${state}` ] = undefined;
				}
			}
			for( const device of [ "keys", "pads" ] ){
				const prefix = `g_COI_${device}_`;
				for( const state of [ "pressed", "pressedTime", "releasedTime", "doubleTime" ] ){
					const data = DrillUp[ prefix + state ];
					const groups = device === "pads" ? ( data ?? [] ) : [ data ];
					for( const group of groups ){
						for( const key of Object.keys( group ?? {} ) ){
							group[key] = state === "pressed" ? false : undefined;
						}
					}
				}
				DrillUp[ prefix + "listenerTime" ] = 0;
			}
		}
		window.SLGSceneFreeExploration?.Buttons?.resetPointerCapture();
	},

	//==============================
	// * 预设 - 舞台地图完成加载后统一应用
	//==============================
	_tryApplyPendingPresets(){
		if( !this._active || this._pendingPresets == null ){ return false; }
		if( !$dataMap || $gameMap.mapId() !== this.stageMapId ){ return false; }

		// 先消费，避免预设 script 间接触发场景逻辑时重复应用。
		const presets = this._pendingPresets;
		this._pendingPresets = null;
		// 确认框可能吞掉鼠标/触屏的松开事件；开演前统一清理，防止文本自动快进。
		this._clearEntryInput();
		for( const preset of presets ){
			this.applyPreset( preset );
		}
		return true;
	},

	//==============================
	// * 校验 - 数据指纹（关键数据序列化后djb2哈希；变量里存了循环引用对象等异常时返回null跳过校验）
	//==============================
	_makeFingerprint(){
		try{
			const members = $gameParty._actors.map( actorId => {
				const actor = $gameActors.actor( actorId );
				if( actor == null ){ return null; }
				return [ actor._level, actor._exp, actor._equips, actor._hp, actor._mp, actor._paramPlus ];
			});
			const src = JSON.stringify({
				gold:      $gameParty._gold,
				items:     $gameParty._items,
				weapons:   $gameParty._weapons,
				armors:    $gameParty._armors,
				partyIds:  $gameParty._actors,
				members:   members,
				switches:  $gameSwitches._data,
				variables: $gameVariables._data,
			});
			let hash = 5381;
			for( let i = 0; i < src.length; i++ ){
				hash = ( ( hash << 5 ) + hash + src.charCodeAt(i) ) >>> 0;
			}
			return `${hash}:${src.length}`;
		}catch( e ){
			return null;
		}
	},

	//==============================
	// * 舞台布置 - 尝试执行（舞台地图已进入 且 声明的源地图数据全部就绪 才消费）
	//==============================
	_tryRunPendingSetup(){
		if( !this._active || this._pendingSetup == null ){ return; }
		if( $gameMap.mapId() !== this.stageMapId ){ return; }
		const maps = this._pendingMaps ?? [];
		if( !maps.every( mapId => window.$dataSpawnMapList?.[mapId] ) ){ return; }	//（源地图还在异步加载中）
		const fn = this._pendingSetup;
		this._pendingSetup = null;
		this._pendingMaps  = null;
		try{
			fn( this._activeRecord );
		}catch( e ){
			console.error("[RecallStage] 舞台布置函数执行出错：", e );
		}
	},

	//==============================
	// * 流程 - 进入回想舞台
	//
	//			optionKey：	CG选项名唯一key。
	//			setupFn：	可选，舞台布置条目（函数或 { maps, setup } 对象）；
	//						不传则查舞台布置表 stageSetupMap[optionKey]。
	//			返回：		是否成功进入。
	//==============================
	start( optionKey, setupFn = null ){
		const key = String( optionKey ?? "" );
		if( this._active ){
			console.warn("[RecallStage] 已在回想舞台中，忽略重复进入。");
			return false;
		}
		if( !( this.stageMapId > 0 ) ){
			console.error("[RecallStage] 未配置舞台地图ID（RecallStage.stageMapId），无法进入回想。");
			return false;
		}
		if( $gameMap == null || $gameMap.mapId() <= 0 ){
			console.error("[RecallStage] 回想需要在游戏内使用（当前没有有效的地图世界可以快照）。");
			return false;
		}
		// > 在原世界生成本次入场预设；失败时尚未快照、淡出或切换世界。
		let capturedPreset;
		try{
			capturedPreset = JsonEx.makeDeepCopy( this.captureCommonPreset( key ) ?? {} );
		}catch( e ){
			console.error("[RecallStage] 入场通用预设生成失败，已取消进入：", e);
			return false;
		}
		const entry = setupFn ?? this.stageSetupMap[key] ?? null;
		if( entry == null ){
			console.warn(`[RecallStage] 选项 ${key} 未在舞台布置表(stageSetupMap)登记，舞台上将没有任何事件。`);
		}
		const setup  = ( typeof entry === "function" ) ? entry : ( entry?.setup ?? null );
		const preset = ( typeof entry === "function" ) ? null  : ( entry?.preset ?? null );
		let needMaps = ( entry != null && Array.isArray( entry.maps ) ) ? entry.maps.map( Number ) : [];

		// > 按需加载事件源地图数据（异步XHR，与舞台转场并行；回想是低频功能，刻意不走启动预加载）
		if( needMaps.length > 0 && typeof DataManager.loadSpawnMapData !== "function" ){
			console.error("[RecallStage] 未找到 QJ-SpawnEventMZ 的地图加载接口(loadSpawnMapData)，无法按需加载源地图。");
			needMaps = [];
		}
		for( const mapId of needMaps ){
			if( !window.$dataSpawnMapList?.[mapId] ){ DataManager.loadSpawnMapData( mapId ); }
		}

		// > 快照停放原世界（makeSaveContents 只收集引用，零拷贝零序列化）
		$gameSystem.onBeforeSave();							//（把当前BGM/BGS、游玩帧数记入快照，与存档流程一致）
		this._fingerprint = this._makeFingerprint();		//（还原后校验用）
		this._snapshot = DataManager.makeSaveContents();

		// > 主角姓名状态需要显式带入临时世界
		//   setupNewGame 会新建 $gameStrings；完整运行 updateLocalizedNames 又会改写全局数据库、
		//   丢失玩家自定义姓名。这里只复制姓名实际依赖的最小状态。
		this._nameState = {
			heroineName:             $gameStrings.value( 120 ),
			heroName:                $gameStrings.value( 121 ),
			heroineVariable:         $gameVariables.value( 10 ),
			heroineSwitch:           $gameSwitches.value( 332 ),
			heroineNameCustomized:   $gameSystem._heroineNameCustomized,
			nameBoxSuffix:           DrillUp.g_DNB_nameBox_suffix,
		};

		// > 原BGM/BGS无条件淡出（1秒）
		//		（播放状态已在上面记入快照，finish 时 onAfterLoad 会从原位置接着播；
		//		  舞台若要配乐由舞台地图自动演奏或回想事件自行播放）
		AudioManager.fadeOutBgm( 1 );
		AudioManager.fadeOutBgs( 1 );

		// > 隐藏备份档（可选；序列化的是刚停放的原世界，回想期间不会被改动，落盘内容一致）
		if( this.backupSavefileId > 0 ){
			try{
				DataManager.saveGame( this.backupSavefileId ).catch( e => {
					console.warn("[RecallStage] 隐藏备份档写入失败（不影响回想流程）：", e );
				});
			}catch( e ){
				console.warn("[RecallStage] 隐藏备份档写入失败（不影响回想流程）：", e );
			}
		}

		// > 换世界前，先把要带进舞台的登记记录深拷贝取出（换世界后 $gameSystem 就是新的了）
		const record = JsonEx.makeDeepCopy( this.getRecord( key ) ?? {} );

		// > 按钮闭包不属于世界快照；换世界前停放，舞台从空的按钮集合开始。
		this._buttonRuntime = window.SLGSceneFreeExploration?.Buttons.suspendRuntime() ?? null;

		// > 换新世界（数据库初始模板；原世界对象原样停放在快照里，不会被触碰）
		//		（必须走完整新游戏路径：MOG_TimeSystem 等插件把自身的 $gameSystem 初始化
		//		  挂在 setupNewGame 钩子上，只调 createGameObjects 会漏初始化导致舞台上报错；
		//		  其中 Graphics.frameCount 归零的副作用由还原时 onAfterLoad 恢复，无影响）
		//		（SMO_Achievements 的新游戏钩子在"当前场景带成就弹窗"时会备份/回灌 achievPopUp：
		//		  非全局模式下备份条件不成立、回灌却照做，会把它灌成 undefined（SMO条件不对称的bug）；
		//		  全局模式下则会把停放世界的弹窗对象引用带进舞台世界。这里换世界期间临时藏起
		//		  场景弹窗引用，让钩子走"无弹窗场景"分支——与从标题开新游戏完全同路径）
		const scene = SceneManager._scene;
		const achievsPopUp = scene?._achievsPopUp ?? null;
		if( achievsPopUp != null ){ scene._achievsPopUp = null; }
		DataManager.setupNewGame();
		DataManager._interceptorType = null;	//（掐掉 CommonInterceptor 的"新游戏公共事件"标记，舞台上不该播开场演出）
		if( achievsPopUp != null ){ scene._achievsPopUp = achievsPopUp; }

		// > 将原存档中已经完成多语言适配（或由玩家自定义）的姓名注入临时世界
		const nameState = this._nameState;
		$gameStrings.setValue( 120, nameState.heroineName );
		$gameStrings.setValue( 121, nameState.heroName );
		$gameVariables.setValue( 10, nameState.heroineVariable );
		$gameSwitches.setValue( 332, nameState.heroineSwitch === true );
		if( nameState.heroineNameCustomized === undefined ){
			delete $gameSystem._heroineNameCustomized;
		}else{
			$gameSystem._heroineNameCustomized = nameState.heroineNameCustomized;
		}
		DrillUp.g_DNB_nameBox_suffix = nameState.nameBoxSuffix;

		// > 回想模式标记 & 禁存档（防止舞台状态被玩家存进档）
		this._active           = true;
		this._activeKey        = key;
		this._activeRecord     = record;
		this._pendingSetup     = setup;
		this._pendingMaps      = needMaps;
		this._pendingPresets   = [ this.commonPreset, capturedPreset, preset, record ];
		this._pendingWaitCount = 0;
		$gameSystem.disableSave();

		// > 传送舞台地图并切场景（预设与舞台布置均在地图加载完成后执行，见下方 onMapLoaded 接管）
		$gamePlayer.reserveTransfer( this.stageMapId, this.stageX, this.stageY, this.stageDir, 0 );
		SceneManager.goto( Scene_Map );
		return true;
	},

	//==============================
	// * 流程 - 结束回想（请求还原）
	//
	//			interpreter：	调用处的事件解释器。在事件脚本里务必写 RecallStage.finish(this);
	//							用于立刻终止舞台事件，防止 finish 之后的残余指令写进舞台世界。
	//			说明：			这里只做淡出与请求，真正的整档还原推迟到场景切换边界
	//							（Scene_RecallRestore）执行——若在帧中途直接换回全局对象，
	//							本帧剩余的更新链（如TRP粒子）会拿原世界数据对着舞台的 $dataMap
	//							解析目标而崩溃。推迟后整帧内世界始终自洽。
	//==============================
	finish( interpreter = null ){
		if( !this._active || this._finishing ){ return false; }
		this._finishing    = true;
		this._pendingSetup = null;		//（舞台布置若还在等待源地图，一并作废）
		this._pendingMaps  = null;
		this._pendingPresets = null;

		// > 终止舞台事件解释器（残余指令防护）
		if( typeof interpreter?.clear === "function" ){
			interpreter.clear();
		}

		// > 画面+声音淡出，并切到还原专用场景（下一帧旧场景完整落幕后才执行还原）
		if( typeof SceneManager._scene?.fadeOutAll === "function" ){
			SceneManager._scene.fadeOutAll();
		}
		SceneManager.goto( Scene_RecallRestore );
		return true;
	},

	//==============================
	// * 流程 - 执行整档还原（仅由 Scene_RecallRestore 在安全边界调用）
	//==============================
	_restoreNow(){
		const { _snapshot: snapshot, _fingerprint: fingerprint, _nameState: nameState } = this;
		const buttons = window.SLGSceneFreeExploration?.Buttons;
		const buttonRuntime = this._buttonRuntime;
		// 必须在舞台 $gameMap 仍为当前地图时清理，不能误删停放的原地图实体。
		if( buttonRuntime != null ){ buttons.clear(); }
		this._buttonRuntime    = null;
		this._active           = false;
		this._snapshot         = null;
		this._activeKey        = "";
		this._activeRecord     = null;
		this._pendingSetup     = null;
		this._pendingMaps      = null;
		this._pendingPresets   = null;
		this._pendingWaitCount = 0;
		this._fingerprint      = null;
		this._nameState        = null;
		this._finishing        = false;

		// > 整档还原（把停放的原世界对象原样赋回，同读档流程）
		DataManager.extractSaveContents( snapshot );
		$gameSystem.onAfterLoad();						//（恢复游玩帧数 + 重放快照时的BGM/BGS，仿 Scene_Load.terminate）
		if( buttonRuntime != null ){ buttons.restoreRuntime( buttonRuntime ); }
		if( nameState != null ){
			DrillUp.g_DNB_nameBox_suffix = nameState.nameBoxSuffix;	//（该全局值不属于存档快照，需单独还原）
		}
		this._justRestored = true;						//（让新 Scene_Map 补一次淡入，仿读档表现）

		// > 指纹校验（还原后关键数据应与进舞台前完全一致）
		const fp = this._makeFingerprint();
		if( fingerprint != null && fp != null && fp !== fingerprint ){
			console.error("[RecallStage] 还原校验失败：回想前后数据指纹不一致！" +
				"请检查是否有插件缓存了 $game* 引用并在回想期间修改了停放中的原世界对象。");
		}
	},

});

//==============================
// * 舞台初始化 - 地图 setup 完成、显示对象创建前应用预设
//
//			说明：	performTransfer 只会在 DataManager 确认 $dataMap 加载完成后执行；
//					原函数返回时 $gameMap.setup(stageMapId) 也已完成。此处正好既能
//					安全调用地图 API，又早于 Scene_Map.createDisplayObjects()。
//==============================
const _RS_GPlayer_performTransfer = Game_Player.prototype.performTransfer;
Game_Player.prototype.performTransfer = function(){
	_RS_GPlayer_performTransfer.call( this );
	RecallStage._tryApplyPendingPresets();
};

//==============================
// * 舞台布置 - 地图加载完成时尝试执行
//
//			说明：	源地图的按需加载与转场并行，通常此时已就绪、当场执行；
//					偶尔没好则留给下方帧刷新兜底重试。
//==============================
const _RS_SMap_onMapLoaded = Scene_Map.prototype.onMapLoaded;
Scene_Map.prototype.onMapLoaded = function(){
	_RS_SMap_onMapLoaded.call( this );
	if( RecallStage._active && $gameMap.mapId() === RecallStage.stageMapId ){
		window.canvasSmooth?.( true );	//（舞台全程为2D CG演出，无条件画布平滑；晚于画廊 terminate 的按地图重设，覆盖之）
		RecallStage._tryApplyPendingPresets();	//（兼容其他插件跳过 performTransfer 包装的异常路径；正常路径已消费）
	}
	RecallStage._tryRunPendingSetup();
};
//==============================
// * 舞台布置 - 帧刷新兜底（仅在回想舞台等待源地图数据时生效；超时自动退出回想，防止空舞台卡死）
//==============================
const _RS_SMap_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function(){
	_RS_SMap_update.call( this );
	if( RecallStage._active && RecallStage._pendingSetup != null ){
		RecallStage._tryRunPendingSetup();
		if( RecallStage._pendingSetup != null && ++RecallStage._pendingWaitCount > 600 ){	//（约10秒）
			console.error("[RecallStage] 事件源地图数据加载超时，自动退出回想。");
			RecallStage.finish();
		}
	}
};

//==============================
// * 还原专用场景 - 在场景切换边界执行整档还原
//
//			说明：	舞台场景完整落幕后才换回全局对象，避免帧中途换世界导致
//					本帧剩余更新链（TRP粒子等）在新旧世界数据错位下崩溃。
//					本身无任何显示物，还原后立即前往原地图的 Scene_Map。
//==============================
function Scene_RecallRestore(){
	this.initialize( ...arguments );
}
Scene_RecallRestore.prototype = Object.create( Scene_Base.prototype );
Scene_RecallRestore.prototype.constructor = Scene_RecallRestore;
Scene_RecallRestore.prototype.start = function(){
	Scene_Base.prototype.start.call( this );
	RecallStage._restoreNow();
	SceneManager.goto( Scene_Map );		//（不带传送：restored $gameMap 状态原样继续，同读档）
};

//==============================
// * 还原后 - 新地图场景补一次淡入（仿 Scene_Load 读档成功后的表现）
//==============================
const _RS_SMap_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function(){
	_RS_SMap_start.call( this );
	if( RecallStage._justRestored ){
		RecallStage._justRestored = false;
		// 正常复用停放的监听器；原本缺失时只在返回地图的边界补建一次。
		window.SLGSceneFreeExploration?.Buttons.ensureListener();
		this.startFadeIn( this.fadeSpeed(), false );
		//（回想结束回到原地图：画布平滑按该地图备注重设，与退出画廊的规则一致）
		window.canvasSmooth?.( String( $dataMap?.note ?? "" ).includes( "<宅>" ) );
	}
};

})();
