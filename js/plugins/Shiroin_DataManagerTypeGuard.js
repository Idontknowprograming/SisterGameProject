//=============================================================================
// Shiroin_DataManagerTypeGuard.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [v1.0.0] 让 DataManager 类型判定支持尚未加入数据库的独立物品。
 * @author Shiroin
 *
 * @help
 * RPG Maker MZ 原生的 DataManager.isItem/isWeapon/isArmor/isSkill 通过
 * 数据库数组的 includes() 判断类型。在 YEP_ItemCore 创建独立物品期间，
 * 新对象会先执行自定义初始化，之后才加入数据库，因此原生方法会暂时误判。
 *
 * 本插件优先使用数据库对象固有的类型字段进行判断，并保留数据库数组判定
 * 作为兼容回退。请放在可能改写这些方法的插件之后。
 */

(() => {
    "use strict";

    const hasField = (object, field) =>
        object != null && object[field] !== undefined;

    const isInDatabase = (database, object) =>
        Array.isArray(database) && database.includes(object);

    DataManager.isSkill = function(object) {
        if (!object) return false;
        if (hasField(object, "stypeId")) return true;
        if (
            hasField(object, "itypeId") ||
            hasField(object, "wtypeId") ||
            hasField(object, "atypeId")
        ) {
            return false;
        }
        return isInDatabase($dataSkills, object);
    };

    DataManager.isItem = function(object) {
        if (!object) return false;
        if (hasField(object, "itypeId")) return true;
        if (
            hasField(object, "stypeId") ||
            hasField(object, "wtypeId") ||
            hasField(object, "atypeId")
        ) {
            return false;
        }
        return isInDatabase($dataItems, object);
    };

    DataManager.isWeapon = function(object) {
        if (!object) return false;
        if (hasField(object, "wtypeId")) return true;
        if (
            hasField(object, "stypeId") ||
            hasField(object, "itypeId") ||
            hasField(object, "atypeId")
        ) {
            return false;
        }
        return isInDatabase($dataWeapons, object);
    };

    DataManager.isArmor = function(object) {
        if (!object) return false;
        if (hasField(object, "atypeId")) return true;
        if (
            hasField(object, "stypeId") ||
            hasField(object, "itypeId") ||
            hasField(object, "wtypeId")
        ) {
            return false;
        }
        return isInDatabase($dataArmors, object);
    };
})();
