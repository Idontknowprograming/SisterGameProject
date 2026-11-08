//=============================================================================
//
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [复制事件脚本][v2.4]
 * @author 仇九
 *
 * @param preLoad
 * @type number[]
 * @text 预载地图编号列表
 * @desc 预载地图编号列表
 * @default []
 *
 * @param eventSaveData
 * @type text[]
 * @text 储存事件信息
 * @desc 储存复制事件时需要储存的信息.
 * @default ["_x","_y","_direction"]
 *
 * @help QJ-SpawnEventMZ.js
 * ========================================================
 * 这个事件可以将某个事件从指定的地图中复制过来。
 * **********您需要在插件参数的“预载地图编号列表”中写上储存着复制事件的地图的编号。**********
 * ========================================================
 * 1.从某个地图将某个事件复制到当前地图的某个坐标上，只复制一个事件
 *
 *   QJ.SE.spawnXy(origin map id,origin event id,current map x,current map y[,save or not]);
 *
 *   origin map id：储存需要复制的事件的源地图编号
 *   origin event id:在源地图中要复制的事件的编号
 *                 你可以通过写编号或者范围来从目标地图将随机的事件复制过来。
 *                 "1-7" 就是一个范围，意味着 1 2 3 4 5 6 7 这些事件。
 *                 例如:    [1,2,3,"4-9",13,15]
 *                 那么源地图中的事件 1, 2, 3, 4, 5, 6, 7, 8, 9, 13 or 15 将会被随机选一个来复制到当前地图。
 *   current map x:目标x坐标.   -1 -> 当前地图的x坐标    -2 -> 玩家的x坐标
 *   current map y:目标y坐标.   -1 -> 当前地图的y坐标    -2 -> 玩家的y坐标
 *   save or not:是否储存此复制事件。您可以在插件参数“储存事件信息”中设置要储存的信息。
 *
 *   e.g:
 *      QJ.SE.spawnXy(10,2,7,9);
 *      QJ.SE.spawnXy(7,3,-1,-1);
 *      QJ.SE.spawnXy(4,1,-2,-2);
 *      QJ.SE.spawnXy(12,[1,2,3,"4-9","10-16"],-2,-2);
 *      QJ.SE.spawnXy(15,9,10,17,true);
 * ========================================================
 * 2.从某个地图将某个事件复制到当前地图的某个区域中，对应区域中每个格子生成事件的概率为probability。
 *
 *   QJ.SE.spawnRegion(origin map id,origin event id,region id,probability[,save or not]);
 *
 *   region id: 区域编号或者区域编号数组
 *             e.g:   1   3    [1,2,3,4,5]
 *   probability: 在目标区域的某个地方复制事件的概率。
 *
 *   e.g:
 *     QJ.SE.spawnRegion(10,3,1,0.5);
 *     QJ.SE.spawnRegion(7,5,3,0.5);
 *     QJ.SE.spawnRegion(9,7,[7,10],0.5);
 *     QJ.SE.spawnRegion(2,9,[1,"4-7"],0.8);
 *     QJ.SE.spawnRegion(13,12,7,0.2);
 *     QJ.SE.spawnRegion(24,3,[2,5],1);
 *     QJ.SE.spawnRegion(19,[1,2,3,"4-9","10-16"],[2,5],1);
 *     QJ.SE.spawnRegion(19,[1,2,3],1,1,true);
 *
 * ========================================================
 * 3.从某个地图将某个事件复制到当前地图的某个区域中，复制num个事件，随机分布在对应区域内。
 *
 *   QJ.SE.spawnRegionNum(origin map id,origin event id,region id,num[,save or not]);
 *
 *   region id: 区域编号或者区域编号数组
 *             e.g:   1   3    [1,2,3,4,5]
 *   num: 总共复制的事件个数。
 *        写大于等于1的整数时代表生成的个数。
 *             如果对应区域的格子总数小于这个值，则在对应区域的每个地方都生成事件。
 *        写0时代表队对应区域的每个格子都生成事件。
 *        写大于0小于1的小数时代表生成对应区域的格子数百分比个数的事件。换句话说在百分比个数的
 *             该区域的格子中生成对应事件。
 *             例如，在区域1生成事件，num写0.4时，若当前地图区域1的格子一共有60个，则会
 *             随机选取60*0.4=24个格子生成对应事件。
 *
 *   e.g:
 *     QJ.SE.spawnRegionNum(10,3,1,5);
 *     QJ.SE.spawnRegionNum(7,5,3,3);
 *     QJ.SE.spawnRegionNum(19,[1,2,3,"4-9","10-16"],[2,5],0);
 *     QJ.SE.spawnRegionNum(19,[1,2,3],1,0.4);
 *
 * ========================================================
 * 4.清除复制事件
 *
 *   QJ.SE.clearEvent(id);
 *
 *   若您使用此指令清除了需要保存信息的事件，那么系统将不再保存其信息。
 *   id: event id.   -1 -> 当前事件的编号
 * ========================================================
 * 5.清除某个地图上的所有复制事件
 *
 *   QJ.SE.clearAll(map id);
 *
 *   使用 QJ.SE.clearAll(-1);  或者  QJ.SE.clearAll();  来清除当前地图上的所有事件.
 *
 * ========================================================
 * 6.获取上一次复制的事件的事件id:
 *
 *   QJ.SE.getLastSpawnEventId();
 *
 * ========================================================
 * ========================================================
 * ========================================================
 * ========================================================
 * 
 */
//=============================================================================
//
//=============================================================================
var QJ = QJ || {};
QJ.SE = QJ.SE || {};
var Imported = Imported || {};
Imported.QJSpawnEvent = true;
//=============================================================================
//
//=============================================================================
$dataSpawnMapList = {};
//=============================================================================
//
//=============================================================================
function Game_SpawnEvent() {
    this.initialize.apply(this, arguments);
}
//=============================================================================
//
//=============================================================================
(($ = {})=>{
//=============================================================================
//
//=============================================================================
const pluginName = "QJ-SpawnEventMZ";
const parameters = PluginManager.parameters(pluginName);
const preLoad = eval(parameters["preLoad"]);
const saveData = eval(parameters["eventSaveData"]);
let isMZ = Utils.RPGMAKER_NAME=='MZ';
//=============================================================================
//
//=============================================================================
saveData.push("needSaveDataList");
//=============================================================================
//
//=============================================================================
if (!Imported.QJCore) {
QJ.getPointer = function() {
    return QJ.Pointer?((typeof QJ.Pointer == "number")?QJ.getCharacter(QJ.Pointer):
        (QJ.Pointer.eventId?$gameMap.event(QJ.Pointer.eventId()):QJ.Pointer)):null;
};
QJ.getPointerId = function() {
    return (typeof QJ.Pointer == "number")?$gameMap.event(QJ.Pointer).eventId():$gameMap.event(QJ.Pointer.eventId()).eventId();
};
QJ.getCharacter = function(value) {
    return value==0?QJ.getPointer():(value==-1?$gamePlayer:$gameMap.event(value));
};
QJ.buildCharacter = function(target) {
    return target?(target==$gamePlayer?-1:target.eventId()):0;
};
QJ.calculateRangeAndInt = function(list) {
    let standardList = [],detail;
    for (let i of list) {
        if (typeof i == "number") {
            standardList.push(i);
        } else if (typeof i == "string") {
            detail = i.split('-');
            for (let j=Number(detail[0]),jl=Number(detail[1]);j<=jl;j++) {
                standardList.push(j);
            }
        }
    }
    return standardList;
}
$.Game_Interpreter_executeCommand = Game_Interpreter.prototype.executeCommand;
Game_Interpreter.prototype.executeCommand = function() {
    QJ.Pointer=this;
    return $.Game_Interpreter_executeCommand.apply(this,arguments);
};
}
//=============================================================================
//
//=============================================================================
$.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
DataManager.isDatabaseLoaded = function() {
    if (!$.DataManager_isDatabaseLoaded.call(this)) return false;
    //==================================
    for (let i of preLoad) DataManager.loadSpawnMapData(i);
    //==================================
    return true;
};

DataManager.onLoadSpawnMapData = function(object) {
    var array;
    this.extractMetadata(object);
    array = object.events;
    if (Array.isArray(array)) {
        for (var i = 0; i < array.length; i++) {
            var data = array[i];
            if (data && data.note !== undefined) {
                this.extractMetadata(data);
            }
        }
    }
};

DataManager.loadSpawnMapData = function(mapId) {
    if (mapId <= 0) return null;
    const filename = "Map%1.json".format(mapId.padZero(3));
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "data/" + filename);
    xhr.overrideMimeType("application/json");
    xhr.onload = () => {
        if (xhr.status < 400) {
            $dataSpawnMapList[mapId] = JSON.parse(xhr.responseText);
            if (isMZ) {
                DataManager.extractMetadata($dataSpawnMapList[mapId]);
                DataManager.extractArrayMetadata($dataSpawnMapList[mapId].events);
            } else {
                DataManager.onLoadSpawnMapData($dataSpawnMapList[mapId]);
            }
        }
    };
    xhr.send();
};
//=============================================================================
//
//=============================================================================
QJ.SE.spawnXy = function(mapId,eventId,x,y,save = false, extraData = {}) {
	if (!$dataSpawnMapList[mapId]) return;
	if (typeof eventId == "number") eventId = [eventId];
	else eventId = QJ.calculateRangeAndInt(eventId);
	if (eventId.length == 1) eventId = eventId[0];
	else eventId = eventId[Math.floor(Math.random()*eventId.length)];
	if (!$dataSpawnMapList[mapId].events[eventId]) return;
	let currentEvent = QJ.getPointer();
	if (x==-1) x = currentEvent.x;
	else if (x==-2) x = $gamePlayer.x;
	if (x<0||x>=$gameMap.width()) return;
	if (y==-1) y = currentEvent.y;
	else if (y==-2) y = $gamePlayer.y;
	if (y<0||y>=$gameMap.height()) return;
    // 新增检查：如果该位置已有事件，则跳过复制
    if ($gameMap.eventsXy(x,y).length > 0) {
        return; 
    }	
	$gameMap.spawnEventQJ(mapId,eventId,x,y,save, extraData);
}
//=============================================================================
// 资源预加载：提前把某 spawn 模板事件的角色图解码进缓存，避免复制时卡顿/精灵图闪烁。
//   用法： QJ.SE.preloadEventResources(1, 44);              // 1号地图44号事件
//          QJ.SE.preloadEventResources(1, [44,45,"50-55"]); // 支持数组/区间
//   注意：加载是异步的，必须"提前足够久"调用(进图时/战斗开始时)，让图在 spawn 前真正就绪；
//         临 spawn 前一刻才调=没提前，仍会闪。可配合 QJ.SE.isEventResourcesReady 验证/门控。
//=============================================================================
QJ.SE._preloadedBitmaps = QJ.SE._preloadedBitmaps || [];   // 持引用防止被 GC/缓存清理
QJ.SE.preloadEventResources = function(mapId, eventId, _retries) {
	_retries = _retries || 0;
	// 1) 确保该 spawn 地图数据已加载(异步)；没好就稍后重试(~10s 超时保护)
	if (!$dataSpawnMapList[mapId]) {
		if (_retries === 0) DataManager.loadSpawnMapData(mapId);
		if (_retries > 100) {
			console.warn("[QJ.SE.preload] 地图 " + mapId + " 数据加载超时，预加载中止。");
			return;
		}
		setTimeout(() => QJ.SE.preloadEventResources(mapId, eventId, _retries + 1), 100);
		return;
	}
	// 2) 规整 eventId：数字 / 数组 / 含区间字符串(如 "50-55")
	let ids;
	if (typeof eventId === "number") ids = [eventId];
	else ids = QJ.calculateRangeAndInt(eventId);
	// 3) 遍历各事件的所有页，预加载角色图(任一页都可能成为激活页)
	const data = $dataSpawnMapList[mapId];
	if (!data || !data.events) return;
	for (const id of ids) {
		const ev = data.events[id];
		if (!ev || !ev.pages) continue;
		for (const page of ev.pages) {
			const img = page && page.image;
			if (img && img.characterName) {
				const bmp = ImageManager.loadCharacter(img.characterName);
				if (bmp && QJ.SE._preloadedBitmaps.indexOf(bmp) < 0) {
					QJ.SE._preloadedBitmaps.push(bmp);   // 持引用 + 触发解码
				}
			}
		}
	}
};
//=============================================================================
// 就绪查询：该 spawn 模板事件的角色图是否都已加载完成(可用来验证/门控复制时机)。
//   用法： if (QJ.SE.isEventResourcesReady(1,44)) QJ.SE.spawnXy(1,44,-2,-2);
//   返回 false：地图数据还没加载、或角色图还在异步解码中。
//=============================================================================
QJ.SE.isEventResourcesReady = function(mapId, eventId) {
	if (!$dataSpawnMapList[mapId]) return false;          // 地图数据还没加载
	const data = $dataSpawnMapList[mapId];
	if (!data || !data.events) return false;
	let ids;
	if (typeof eventId === "number") ids = [eventId];
	else ids = QJ.calculateRangeAndInt(eventId);
	for (const id of ids) {
		const ev = data.events[id];
		if (!ev || !ev.pages) continue;
		for (const page of ev.pages) {
			const img = page && page.image;
			if (img && img.characterName) {
				if (!ImageManager.loadCharacter(img.characterName).isReady()) return false;
			}
		}
	}
	return true;
};
QJ.SE.spawnRegion = function(mapId,eventId,regionId,probability = 1,save = false, extraData = {}) {
	if (!$dataSpawnMapList[mapId]) return;
	if (typeof eventId == "number") eventId = [eventId];
	else eventId = QJ.calculateRangeAndInt(eventId);
	if (typeof regionId == "number") regionId = [regionId];
	else regionId = QJ.calculateRangeAndInt(regionId);
	let eId;
	let mapPointer = $gameMap;
	let math = Math;
	let dataEvents = $dataSpawnMapList[mapId].events;
	for (let i=0,il=mapPointer.width();i<il;i++) {
		for (let j=0,jl=mapPointer.height();j<jl;j++) {
			if (math.random()<probability && regionId.includes(mapPointer.regionId(i,j))) {
				if (eventId.length == 1) eId = eventId[0];
				else eId = eventId[math.floor(math.random()*eventId.length)];
				if (!dataEvents[eId]) continue;
				// 新增检查：如果该位置已有事件，则跳过复制
                if ($gameMap.eventsXy(i,j).length > 0) {
                    continue;
                }
				this.spawnXy(mapId,eId,i,j,save, extraData);
			}
		}
	}
}
QJ.SE.spawnRegionNum = function(mapId,eventId,regionId,num = 0,save = false, extraData = {}) {
	if (!$dataSpawnMapList[mapId]) return;
	if (typeof eventId == "number") eventId = [eventId];
	else eventId = QJ.calculateRangeAndInt(eventId);
	if (typeof regionId == "number") regionId = [regionId];
	else regionId = QJ.calculateRangeAndInt(regionId);
	let mapPointer = $gameMap;
	let math = Math;
	let dataEvents = $dataSpawnMapList[mapId].events;
	let posList = [];
	for (let i=0,il=mapPointer.width();i<il;i++) {
		for (let j=0,jl=mapPointer.height();j<jl;j++) {
			if (regionId.includes(mapPointer.regionId(i,j)) && mapPointer.eventsXy(i,j).length === 0) {
				posList.push(i);
				posList.push(j);
			}
		}
	}
	let totalLength = math.floor(posList.length/2);
	if (num===0) num = totalLength;
	else if (num<1) num = math.floor(num*totalLength);
	else num = num.clamp(0,totalLength);
	if (num<=0) return;
	let eId,pos;
	while(num>0) {
		num--;
		pos = math.floor(totalLength*math.random())*2;
		if (eventId.length == 1) eId = eventId[0];
		else eId = eventId[math.floor(math.random()*eventId.length)];
		if (!dataEvents[eId]) continue;

        let tx = posList[pos];
        let ty = posList[pos+1];

        // 新增检查：如果该位置已有事件，则跳过复制
        if ($gameMap.eventsXy(tx,ty).length > 0) {
            posList.splice(pos,2);
            totalLength--;
            continue; // 这个位置已有事件，跳过
        }

		this.spawnXy(mapId,eId,tx,ty,save, extraData);
		posList.splice(pos,2);
		totalLength--;
	}
};
QJ.SE.clearEvent = function(eventId = -1) {
	if (eventId==-1) eventId = QJ.getPointerId();
	if (eventId<=0) return;
	$gameMap.clearSpawnEventQJ(eventId);
}
QJ.SE.clearAll = function(mapId = -1, tag = null) {
    if (mapId==-1) mapId = $gameMap.mapId();
    if (typeof mapId == "number") mapId = [mapId];

    // 删除存档数据中符合条件的事件
    $gameSystem.deleteSaveDataSpawnEventMapQJ(mapId, tag);

    // 如果当前地图在mapId中，则清除当前地图中的事件
    if (mapId.includes($gameMap.mapId())) $gameMap.clearMapQJ(mapId);
};
QJ.SE.getLastSpawnEventId = function() {
	return $gameMap.lastestSpawnEventIdQJ();
}
//=============================================================================
//
//=============================================================================
Game_SelfSwitches.prototype.clearMapSelfSwitchesQJ = function(mapIdList) {
    let mapIdString,splitData;
    for (let i of mapIdList) {
        mapIdString = String(i);
        for (let j in this._data) {
            splitData = j.split(',');
            if (splitData&&splitData[0]==mapIdString) {
                delete this._data[j];
            }
        }
    }
};
Game_SelfSwitches.prototype.clearEventSelfSwitchesQJ = function(mapId,eventId) {
    mapId = String(mapId);
    eventId = String(eventId);
    let splitData;
    for (let j in this._data) {
        splitData = j.split(',');
        if (splitData&&splitData[0]==mapId&&splitData[1]==eventId) {
            delete this._data[j];
        }
    }
};
//=============================================================================
//
//=============================================================================
$.Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
	$.Game_System_initialize.apply(this,arguments);
	this.initSpawnEventSaveDataListQJ();
};
Game_System.prototype.initSpawnEventSaveDataListQJ = function() {
	this._spawnEventSaveDataListQJ = {};
};
Game_System.prototype.initNewSaveDataSpawnEventMapQJ = function(mapId) {
	this._spawnEventSaveDataListQJ[mapId] = {};
};
Game_System.prototype.addSpawnEventSaveDataQJ = function(eventId,data,mapId) {
	mapId = mapId||$gameMap.mapId();
	this._spawnEventSaveDataListQJ[mapId][eventId] = data;
};
Game_System.prototype.addBackUpSpawnEventSaveDataQJ = function(eventId,data) {
	$gameMap._backUpSpawnEventDataQJ = $gameMap._backUpSpawnEventDataQJ || {};
	$gameMap._backUpSpawnEventDataQJ[eventId] = data;
};
Game_System.prototype.getSaveDataSpawnEventMapQJ = function(mapId) {
	mapId = mapId||$gameMap.mapId();
	return this._spawnEventSaveDataListQJ[mapId];
};

Game_System.prototype.deleteSaveDataSpawnEventMapQJ = function(mapIdList, completely = false) {
    
    for (let i of mapIdList) {
		// 强制跳过星之门
		if (i == 51) continue;
        let spawnEvents = this._spawnEventSaveDataListQJ[i];
        if (!spawnEvents) continue;

        for (let eid in spawnEvents) {
            let data = spawnEvents[eid];
            if (!data) continue;
            let saveAttributeList = data[5];
            if (!saveAttributeList) {
                // 如果没有额外属性，直接删除
                delete spawnEvents[eid];
                $gameSelfSwitches.clearEventSelfSwitchesQJ(i, eid);
				$gameSelfVariables.clearVariablesForEvent(i, eid);
                continue;
            }
            
            // 这里判断 _drill_COET_tag
            let tags = saveAttributeList._drill_COET_tag || [];
            // 默认：若事件含有 "needMemory" 则跳过删除
            // 若 completely=true，则无条件删除
            if (!completely && tags.includes("needMemory")) {
                // 跳过不删
                continue;
            }
            // 其余情况全部删除
            delete spawnEvents[eid];
            $gameSelfSwitches.clearEventSelfSwitchesQJ(i, eid);
			$gameSelfVariables.clearVariablesForEvent(i, eid);
        }
    }
};

// 修复星之门吞库存装备的问题
Game_System.prototype.fixStarDoorInventoryLoss = function() {

  // 检查是否符合需要回滚装备的条件
  let mapId = 51;
  let spawnEvents = this._spawnEventSaveDataListQJ[mapId];
  if (!spawnEvents || !$gameNumberArray.value(99).includes(51)) return;
  
  let weaponsList = [];
  let gearsList   = [];
  for (var i = 0; i < DataManager._independentWeapons.length; i++) {
	  let object = DataManager._independentWeapons[i];
	  if (!object) continue;  
	  if (object.description && object.description.indexOf("不可删除") !== -1) {
		  if ($gameParty.hasItem(object, true)) continue;
		  weaponsList.push(object);
          continue;
      }
  }

  for (var i = 0; i < DataManager._independentArmors.length; i++) {
	  let object = DataManager._independentArmors[i];
	  if (!object) continue;  
	  if (object.description && object.description.indexOf("不可删除") !== -1) {
		  if ($gameParty.hasItem(object, true)) continue;
		  weaponsList.push(object);
          continue;
      }
  }
  
  if (weaponsList.length > 0) { 
    for (var i = 0; i < weaponsList.length; i++) {
		let object = weaponsList[i];
		$gameParty.gainItem(object, 1);
	}
  }

  if (gearsList.length > 0) {  
    for (var i = 0; i < gearsList.length; i++) {
		let object = gearsList[i];
		$gameParty.gainItem(object, 1);
	}
  }
  
};
//=============================================================================
//
//=============================================================================
$.Game_Player_performTransfer = Game_Player.prototype.performTransfer;
Game_Player.prototype.performTransfer = function() {
    // 同地图传送保留事件实例，也需保留其独立开关，避免重新执行初始化页。
    if (this.isTransferring() &&
        (this._newMapId !== $gameMap.mapId() || this._needsMapReload)) {
        $gameMap.clearUnsavedSpawnEventSelfSwitches();
    }
    $gameMap.saveSpawnEventDataQJ();
    $.Game_Player_performTransfer.apply(this,arguments);
};
Game_Map.prototype.saveSpawnEventDataQJ = function() {
	$gameSystem.initNewSaveDataSpawnEventMapQJ(this.mapId());
	for (let i of this._events) {
		if (i&&i.constructor==Game_SpawnEvent) {
            if (i._erased) continue;
			if (i.needSaveData()) {//若储存就不删除数据且储存信息
				$gameSystem.addSpawnEventSaveDataQJ(i.eventId(),i.makeSaveData());
			}
		}
	}
	// 如果有备份就追加
    let backUp = this._backUpSpawnEventDataQJ || {};
	if (backUp.length <= 0) return; 
	let mapId = this.mapId();
    for (let id in backUp) {
	     $gameSystem._spawnEventSaveDataListQJ[mapId][id] = backUp[id];
    }
    $gameMap._backUpSpawnEventDataQJ = {};	
};
$.Game_Map_setupEvents = Game_Map.prototype.setupEvents;
Game_Map.prototype.setupEvents = function() {
	$.Game_Map_setupEvents.apply(this,arguments);
	this.executeSpawnEventDataQJ();
};
Game_Map.prototype.executeSpawnEventDataQJ = function() {
	let spawnEventList = $gameSystem.getSaveDataSpawnEventMapQJ();
    if (spawnEventList) {
    	for (let id in spawnEventList) {
    		let data = spawnEventList[id];
    		this.spawnEventQJ.call(this,data[0],data[1],data[2],data[3],data[4],data[5],id);
    	}
    }
};

Game_Map.prototype.clearUnsavedSpawnEventSelfSwitches = function() {
    for (let event of this._events) {
        if (event && event.constructor === Game_SpawnEvent) {
            // 如果该生成事件不需要保存数据，则清除其独立开关数据
            if (!event._ifNeedSaveEventData) {
                $gameSelfSwitches.clearEventSelfSwitchesQJ(this.mapId(), event.eventId());
            }
        }
    }
};
//=============================================================================
//
//=============================================================================
Game_Map.prototype.spawnEventQJ = function(mapId,eventId,x,y,save = false,extraData = {},targetId = -1) {
    if (!$dataSpawnMapList[mapId] || !$dataSpawnMapList[mapId].events[eventId]) return null;
    let currentId = targetId===-1?this._events.length:targetId;
    this._events[currentId] = new Game_SpawnEvent(mapId,eventId,currentId,this.mapId(),x,y,save,extraData);
    if (SceneManager._scene&&SceneManager._scene._spriteset) {
    	SceneManager._scene._spriteset.createSpawnEvent(currentId);
    }
    this.lastestSpawnEventIdRemQJ = currentId;
	//$gameSelfSwitches.clearEventSelfSwitchesQJ(this.mapId(), currentId);
	
    // 强制让Drill_CoreOfFixedArea重新登记事件容器
    //if (this.drill_COFA_forceRefresh) {   
    //    this.drill_COFA_forceRefresh();
   // }	
	
    return currentId;
};
Game_Map.prototype.lastestSpawnEventIdQJ = function() {
    return this.lastestSpawnEventIdRemQJ;
};
Game_Map.prototype.clearSpawnEventQJ = function(eid) {


  // 如果是 Game_Event 实例，直接取 eventId
  if (eid instanceof Game_Event) {
    eid = eid.eventId();

  // 如果是纯数字/数字字符串，转成 Number
  } else if (typeof eid === 'number' && isFinite(eid)) {
    // keep as is
  } else if (typeof eid === 'string' && /^\s*\d+\s*$/.test(eid)) {
    eid = Number(eid.trim());

  //  兜底失败
  } else {
    console.warn('[clearSpawnEventQJ] 无效的 eid 参数：', eid);
    return false;
  }

  // 正式清理
  $gameSelfSwitches.drill_COEM_deleteEventKeys(this._mapId, eid);
  $gameSelfVariables.clearVariablesForEvent(this._mapId, eid);
  this.drill_COEM_primary_deleteEvent(eid);   // 在原型里，直接用 this 更稳
  this.drill_COEM_offspring_deleteEvent(eid);
  return true;
};

Game_Map.prototype.clearMapQJ = function() {
	for (let i of this._events) {
		if (i&&i.constructor==Game_SpawnEvent) {
			this.clearSpawnEventQJ(i);
		}
	}
};
// 远程插入事件模板
Game_Map.prototype.remoteInsertEventToMap = function(tgtMapId, srcMapId, srcEventId, tgtX, tgtY, save) {
    var dummy = new Game_SpawnEvent(srcMapId, srcEventId, 1, tgtMapId, tgtX, tgtY, save);
    var saveData = dummy.makeSaveData();
    if (!$gameSystem._spawnEventSaveDataListQJ[tgtMapId]) {
        $gameSystem.initNewSaveDataSpawnEventMapQJ(tgtMapId);
    }
    var spawnList = $gameSystem._spawnEventSaveDataListQJ[tgtMapId];
    var newId;
    // 如果没有任何复制事件，则设置一个保险起点
    if (Object.keys(spawnList).length === 0) {
        newId = 60;
    } else {
        var maxId = 0;
        for (var id in spawnList) {
            if (spawnList.hasOwnProperty(id)) {
                var n = Number(id);
                if (!isNaN(n) && n > maxId) maxId = n;
            }
        }
        newId = maxId + 1;
    }
    spawnList[newId] = saveData;
};


//=============================================================================
//
//=============================================================================
$.Sprite_Animation_targetSpritePosition = Sprite_Animation.prototype.targetSpritePosition;
Sprite_Animation.prototype.targetSpritePosition = function(sprite) {
	if (sprite.unspawn) return new Point(this._targets[0].x, this._targets[0].y);
    return $.Sprite_Animation_targetSpritePosition.apply(this,arguments);
};
Spriteset_Map.prototype.clearSpawnEvent = function(id) {
	for (let i = 0,sprite,event; i < this._characterSprites.length; i++) {
		sprite = this._characterSprites[i];
		event = sprite._character;
		if (event && event.isSpawnEvent && event.isSpawnEvent() && id == event.eventId()) {
			sprite.unspawn = true;
			this._tilemap.removeChild(sprite);
			return;
		};
	};
};
Spriteset_Map.prototype.createSpawnEvent = function(id) {
	let event = $gameMap._events[id];
	let sprite = new Sprite_Character(event);
	sprite.update();
	this._tilemap.addChild(sprite)
	this._characterSprites.push(sprite);
};
//=============================================================================
//
//=============================================================================
Game_Event.prototype.isSpawnEvent = function() {
    return false;
};
//=============================================================================
//
//=============================================================================
Game_SpawnEvent.prototype = Object.create(Game_Event.prototype);
Game_SpawnEvent.prototype.constructor = Game_SpawnEvent;
Game_SpawnEvent.prototype.initialize = function(mapId,eventId,currentEventId,currentMapId,x,y,save,extraData = null) {
	this.initNeedSaveDataList();
	this._sourceMapId = mapId;
	this._sourceeventId = eventId;
	this._eventId = currentEventId;
	this._mapId = currentMapId;
	this._sourceX = x;
	this._sourceY = y;
	this.__event = JSON.parse(JSON.stringify($dataSpawnMapList[mapId].events[eventId]));
	this.__event.x = x;
	this.__event.y = y;
	this._ifNeedSaveEventData = save;
	
	// 适配额外独立开关插件
    if ($gameTemp && $gameTemp.drill_ESS_dataCovert) {
        $gameTemp.drill_ESS_dataCovert(this.__event);
    }
	
	Game_Event.prototype.initialize.call(this,currentMapId,currentEventId);
	if (extraData) {
		let newData = extraData;
		for (let i in newData) {
			this[i] = newData[i];
			if (i==="_x") this._realX = this[i];
			else if (i==="_y") this._realY = this[i];
		}
	}
};
Game_SpawnEvent.prototype.isSpawnEvent = function() {
    return true;
};
Game_SpawnEvent.prototype.event = function() {
    return this.__event;
};
Game_SpawnEvent.prototype.needSaveData = function() {
	return this._ifNeedSaveEventData;
};
Game_SpawnEvent.prototype.setSaveData = function(value) {
	if (!value.includes("needSaveDataList")) {
		value.push("needSaveDataList");
	}
	this.needSaveDataList = value;
};
Game_SpawnEvent.prototype.getNeedSaveDataList = function() {
	return this.needSaveDataList;
};
Game_SpawnEvent.prototype.initNeedSaveDataList = function() {
	this.needSaveDataList = saveData.slice();
};


/*
Game_SpawnEvent.prototype.makeSaveData = function() {
	//bid,sourcemapid,sourceid,x,y,extraData
	let saveList = [this._sourceMapId,this._sourceeventId,this._sourceX,this._sourceY,this.needSaveData()];
	let saveAttributeList = {};
	for (let i of this.getNeedSaveDataList()) {
		saveAttributeList[i] = this[i];
	}
	saveList.push(saveAttributeList);
	return saveList;
};
*/

Game_SpawnEvent.prototype.makeSaveData = function() {
    // [sourceMapId, sourceEventId, sourceX, sourceY, needSaveData()]
    let saveList = [
        this._sourceMapId,
        this._sourceeventId,
        this._sourceX,
        this._sourceY,
        this.needSaveData()
    ];
    let saveAttributeList = {};
    for (let i of this.getNeedSaveDataList()) {
        saveAttributeList[i] = this[i]; 
    }

    // === 在这里追加检查逻辑 ===
    let tags = saveAttributeList._drill_COET_tag;
    if (!tags || (!tags.includes("needMemory") && !tags.includes("needMemoryPoint"))) {
        // 删除坐标相关字段
        delete saveAttributeList._x;
        delete saveAttributeList._y;
        delete saveAttributeList._realX;
        delete saveAttributeList._realY;
    }

    // 第六个元素是 extraData
    saveList.push(saveAttributeList);
    return saveList;
};

// MZ 的 JsonEx 不保留共享引用。直接读取当前地图时，_events 与 Drill
// 插件的有效事件缓存会被还原成内容相同但彼此独立的事件对象。事件更新、
// $gameMap.event(id) 查询和区域判定因而可能操作不同副本。
// 这里只重连运行时容器，不重新 setup 地图，也不重置事件当前位置、页索引
// 或移动路线进度。
Game_Map.prototype.restoreSpawnEventRuntimeQJ = function() {
    if (!Array.isArray(this._events)) return;

    for (let index = 0; index < this._events.length; index++) {
        const event = this._events[index];
        if (!event || event._sourceMapId === undefined || !event.__event) continue;

        // 正常情况下 JsonEx 会根据 @ 标记恢复原型；这里兼容构造器未成功
        // 挂回 window、旧存档缺少类型信息等情况。
        if (!(event instanceof Game_SpawnEvent)) {
            Object.setPrototypeOf(event, Game_SpawnEvent.prototype);
        }
        event._mapId = this.mapId();
        event._eventId = index;
    }

    const activeEvents = this._events.filter(event => event && !event._erased);

    // Drill_CoreOfEventManager：Game_Map.events() 实际读取此容器。
    if (Array.isArray(this._drill_COEM_availableEventTank)) {
        this._drill_COEM_availableEventTank = activeEvents.slice();
        this._drill_COEM_availableEventCounter = this._events.length;
    }

    // Drill_CoreOfFixedArea：区域查询也必须与 _events 共用事件实例。
    if (Array.isArray(this._drill_COFA_tank)) {
        this._drill_COFA_tank = activeEvents.slice();
        this._drill_COFA_countPrivate = this._events.length;
    }
};

const _QJSpawnEvent_extractSaveContents = DataManager.extractSaveContents;
DataManager.extractSaveContents = function(contents) {
    _QJSpawnEvent_extractSaveContents.call(this, contents);

    if (!$gameSystem._spawnEventSaveDataListQJ) {
        $gameSystem.initSpawnEventSaveDataListQJ();
    }

    // 必须在 Scene_Map 创建角色精灵及 DotMoveSystem 初始化碰撞缓存之前
    // 完成；若延后到 Scene_Map.start，精灵可能已经绑定反序列化出的旧副本。
    if ($gameMap && typeof $gameMap.restoreSpawnEventRuntimeQJ === "function") {
        $gameMap.restoreSpawnEventRuntimeQJ();
    }
};

//=============================================================================
//
//=============================================================================
})();
//=============================================================================
//
//=============================================================================
/*
// SpawnEvent 调试补丁：Game_Interpreter 记录复制事件来源 _sourceMapId/_sourceeventId
 */

(function(){
  'use strict';

  const _setup = Game_Interpreter.prototype.setup;
  Game_Interpreter.prototype.setup = function(list, eventId) {
    _setup.call(this, list, eventId);

    // 统一清空，避免复用残留
    this._sourceMapId = null;
    this._sourceeventId = null;
    this._sourcePageIndex = null; // 0-based

    if (eventId > 0 && $gameMap && $gameMap.event) {
      const ev = $gameMap.event(eventId);

      // 复制事件：继承来源，并记录“当前执行页”
      if (ev && ev.isSpawnEvent && ev.isSpawnEvent()) {
        this._sourceMapId = ev._sourceMapId;
        this._sourceeventId = ev._sourceeventId;
      }
      this._sourcePageIndex = ev?._pageIndex;	  
    }
  };

  const _setupChild = Game_Interpreter.prototype.setupChild;
  Game_Interpreter.prototype.setupChild = function(list, eventId) {
    _setupChild.call(this, list, eventId);
    const c = this._childInterpreter;
    if (c) {
      c._sourceMapId = this._sourceMapId;
      c._sourceeventId = this._sourceeventId;
      c._sourcePageIndex = this._sourcePageIndex;
    }
  };
})();
