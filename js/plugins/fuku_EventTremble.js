// Copyright (c) 2017 fuku
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
//

// 最新版は↓から
// http://www5f.biglobe.ne.jp/~fuku-labo/library/etc/

/*:
 * @target MZ
 * @plugindesc イベントを震えさせる v1.10 (ES6)
 * @author fuku
 *
 * @help プレイヤーキャラクターやイベントを震えさせます。
 * イベントを震えさせた場合、マップを切り替えると効果が切れます。
 *
 * 使い方：全てスクリプトベースで操作します。
 * 
 * 震え開始(イベントID指定)：
 * Fuku_Plugins.EventTremble.start(number イベントID,number 震え強度,number 震え速度 [,number 実行周期])
 * 
 * 「イベントID」のイベント(-1でプレイヤー)を震えさせます。
 * 強度は震える幅で、速度は小数を使えます。
 * 実行周期は左右に一回震えて戻るまでを1として、指定した周期分震えたら停止します。
 * 実行周期を省略した場合、停止させるまで永続して震えます。
 * 例：Fuku_Plugins.EventTremble.start(-1,8,0.8);
 * 
 * 
 * 震え停止(イベントID指定)：
 * Fuku_Plugins.EventTremble.stop(number イベントID)
 * 
 * このプラグインで震えさせている「イベントID」のイベント(-1でプレイヤー)の震えを止めます。
 * 例：Fuku_Plugins.EventTremble.stop(-1);
 * 
 * 
 * 震え開始(イベントオブジェクト指定)：
 * Fuku_Plugins.EventTremble.startObject(Game_CharacterBase イベント,number 震え強度,number 震え速度 [,number 実行周期])
 * 
 * 指定したイベントを震えさせます。強度は震える幅で、速度は小数を使えます。
 * 実行周期は左右に一回震えて戻るまでを1として、指定した周期分震えたら停止します。
 * 実行周期を省略した場合、停止させるまで永続して震えます。
 * 例：Fuku_Plugins.EventTremble.startObject($gamePlayer,8,0.8);
 * 
 * 
 * 震え停止(イベントオブジェクト指定)：
 * Fuku_Plugins.EventTremble.stopObject(Game_CharacterBase イベント)
 * 
 * このプラグインで震えさせている、指定したイベントの震えを止めます。
 * 例：Fuku_Plugins.EventTremble.stopObject($gamePlayer);
*/

globalThis.Fuku_Plugins ??= {};

(() => {
    "use strict";

    const EventTremble = {
        Version: 110
    };
    globalThis.Fuku_Plugins.EventTremble = EventTremble;

    const findOriginalMethod = (event, methodName, hook, storedMethod) => {
        if (typeof storedMethod === "function" && storedMethod !== hook) {
            return storedMethod;
        }

        // An instance may still contain a stale hook. In that case, recover the
        // actual implementation from the prototype chain instead of recursing.
        let prototype = Object.getPrototypeOf(event);
        while (prototype) {
            const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
            if (typeof descriptor?.value === "function" && descriptor.value !== hook) {
                return descriptor.value;
            }
            prototype = Object.getPrototypeOf(prototype);
        }
        return null;
    };

    function hookScreenX() {
        const trembleInfo = this._fuku_trembleinfo;
        const original = findOriginalMethod(
            this,
            "screenX",
            hookScreenX,
            trembleInfo?.screenX
        );

        if (!original) {
            return 0;
        }
        if (trembleInfo) {
            trembleInfo.screenX = original;
        }
        return original.call(this) + (trembleInfo?.offsetx ?? 0);
    }

    function hookUpdate(...args) {
        const trembleInfo = this._fuku_trembleinfo;
        const original = findOriginalMethod(
            this,
            "update",
            hookUpdate,
            trembleInfo?.update
        );

        if (!original) {
            return;
        }
        if (!trembleInfo) {
            original.apply(this, args);
            return;
        }

        trembleInfo.update = original;
        original.apply(this, args);

        if (!trembleInfo.power) {
            return;
        }

        trembleInfo.angle += trembleInfo.speed;
        trembleInfo.offsetx = Math.round(Math.sin(trembleInfo.angle) * trembleInfo.power);

        if (trembleInfo.stopAngle && trembleInfo.angle > trembleInfo.stopAngle) {
            EventTremble.stopObject(this);
        }
    }

    const getCharacter = eventId => (
        eventId < 0 ? $gamePlayer : $gameMap.event(eventId)
    );

    EventTremble.startObject = (event, power, speed, stopCycle) => {
        if (!event) {
            return false;
        }

        if (!event._fuku_trembleinfo) {
            event._fuku_trembleinfo = {
                angle: 0,
                offsetx: 0,
                screenX: findOriginalMethod(event, "screenX", hookScreenX, event.screenX),
                update: findOriginalMethod(event, "update", hookUpdate, event.update),
                power: 0,
                speed: 0,
                stopCycle: null,
                stopAngle: null
            };
            event.screenX = hookScreenX;
            event.update = hookUpdate;
        } else {
            const trembleInfo = event._fuku_trembleinfo;
            trembleInfo.screenX = findOriginalMethod(
                event,
                "screenX",
                hookScreenX,
                trembleInfo.screenX
            );
            trembleInfo.update = findOriginalMethod(
                event,
                "update",
                hookUpdate,
                trembleInfo.update
            );
        }

        const trembleInfo = event._fuku_trembleinfo;
        trembleInfo.power = power;
        trembleInfo.speed = speed;

        if (stopCycle) {
            trembleInfo.stopCycle = stopCycle;
            trembleInfo.stopAngle = trembleInfo.angle + stopCycle * Math.PI * 2;
        } else {
            trembleInfo.stopCycle = null;
            trembleInfo.stopAngle = null;
        }
        return true;
    };

    EventTremble.start = (eventId, power, speed, stopCycle) => (
        EventTremble.startObject(getCharacter(eventId), power, speed, stopCycle)
    );

    EventTremble.stopObject = event => {
        const trembleInfo = event?._fuku_trembleinfo;
        if (!trembleInfo) {
            return false;
        }

        if (event.screenX === hookScreenX && event.update === hookUpdate) {
            event.screenX = findOriginalMethod(
                event,
                "screenX",
                hookScreenX,
                trembleInfo.screenX
            );
            event.update = findOriginalMethod(
                event,
                "update",
                hookUpdate,
                trembleInfo.update
            );
            event._fuku_trembleinfo = undefined;
        } else {
            trembleInfo.power = null;
            trembleInfo.angle = 0;
            trembleInfo.offsetx = 0;
        }
        return true;
    };

    EventTremble.stop = eventId => EventTremble.stopObject(getCharacter(eventId));

    EventTremble.speed2cycleframe = speed => Math.PI * 2 / speed;

    EventTremble.getRemainingCycles = eventId => {
        const trembleInfo = getCharacter(eventId)?._fuku_trembleinfo;
        if (!trembleInfo?.stopAngle) {
            return 0;
        }

        const remainingCycles = (
            (trembleInfo.stopAngle - trembleInfo.angle) / (Math.PI * 2)
        );
        return remainingCycles > 0 ? Math.ceil(remainingCycles) : 0;
    };

    const extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(...args) {
        extractSaveContents.apply(this, args);

        const restore = event => {
            const trembleInfo = event?._fuku_trembleinfo;
            if (!trembleInfo) {
                return;
            }

            const { power, speed, stopCycle } = trembleInfo;
            event._fuku_trembleinfo = undefined;
            if (power) {
                EventTremble.startObject(event, power, speed, stopCycle);
            }
        };

        restore($gamePlayer);
        $gameMap.events().forEach(restore);
    };
})();
