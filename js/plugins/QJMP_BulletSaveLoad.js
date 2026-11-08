//=============================================================================
// QJMP_BulletSaveLoad.js   →  现为「禁止 QJ 子弹进入存档」
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v2.0] 禁止 QJ 子弹数据写入存档（容器设为不可枚举，序列化时被 JsonEx 跳过；活子弹不清除，无演出穿帮）
 * @author shiroin
 *
 * @help
 * ■前提
 * 需要 QJ-MapProjectileMZ.js，放在它【下面】。
 *
 * ■做了什么
 * 把 $gameMap 上的 QJ 子弹容器
 *   _mapBulletsQJ / _mapBulletsNameQJ / _mapBulletsQJLength
 * 设为「不可枚举(non-enumerable)」属性。
 *
 * 原理：RPG Maker 的 JsonEx 用 Object.keys 遍历(只取可枚举属性)来序列化，
 * 所以这些容器会被【直接跳过】，存档里不含任何 QJ 子弹数据 →
 *   · 不会坏档、读档不会因函数变 null 而崩溃；
 *   · 而 QJ 仍按属性名正常读写它们(不可枚举不影响功能)。
 *
 * ■关键好处
 * 整个存档过程【完全不清除地图上的活子弹】，对画面无任何影响。
 * 于是你原先「存档前主动清子弹」的做法可以删掉了 →
 * 不会再有子弹突然消失的演出穿帆。
 *
 * ■读档行为
 * 读档后地图上没有 QJ 子弹(容器为空)，由你游戏自身的进图逻辑
 * (自动执行事件、从者再生等)重新生成需要的子弹——和现状一致。
 *
 * ■请记得
 * 把你之前「存档前清除 QJ 子弹」的那段逻辑【删除/停用】，
 * 本插件已从根源接管，无需再手动清。
 */

(function() {
"use strict";

if (typeof Game_Map === "undefined" || !Game_Map.prototype.initProjectileDataQJ) {
    console.error("QJMP_BulletSaveLoad(no-save): 未找到 QJ 的 initProjectileDataQJ，请放在 QJ-MapProjectileMZ.js 之后。");
    return;
}

// _mapBulletIdListQJ/_mapBulletIdListQJDirty 是碰撞优化版引擎新增的子弹索引容器，
// 同样只在运行期有意义；initProjectileDataQJ 会在读档时一并重建。
var KEYS = ["_mapBulletsQJ", "_mapBulletsNameQJ", "_mapBulletsQJLength",
    "_mapBulletIdListQJ", "_mapBulletIdListQJDirty"];

// 把这些属性改成不可枚举（保留当前值与可写/可配置）。
// 之后再用 this._mapBulletsQJ = {} 赋值，描述符不变(仍不可枚举)，所以一次定型即可。
function makeNonEnum(map) {
    if (!map) return;
    for (var i = 0; i < KEYS.length; i++) {
        var k = KEYS[i];
        if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
        var desc = Object.getOwnPropertyDescriptor(map, k);
        if (desc && desc.enumerable && desc.configurable !== false) {
            Object.defineProperty(map, k, {
                value: map[k],
                writable: true,
                enumerable: false,
                configurable: true
            });
        }
    }
}

// QJ 每次创建子弹容器后，立即将其设为不可枚举 → 序列化会跳过它们
var _initProjectileDataQJ = Game_Map.prototype.initProjectileDataQJ;
Game_Map.prototype.initProjectileDataQJ = function() {
    _initProjectileDataQJ.call(this);
    makeNonEnum(this);
};

// 读档：反序列化出的 $gameMap 不含这些容器(已被排除序列化)。
// 总是重建为空容器(并设不可枚举)，顺带丢弃旧存档里可能残留的(已损坏)子弹数据。
var _extractSaveContents = DataManager.extractSaveContents;
DataManager.extractSaveContents = function(contents) {
    _extractSaveContents.call(this, contents);
    if ($gameMap && typeof $gameMap.initProjectileDataQJ === "function") {
        $gameMap.initProjectileDataQJ();   // = 清空 + 设为不可枚举
    }
};

})();
