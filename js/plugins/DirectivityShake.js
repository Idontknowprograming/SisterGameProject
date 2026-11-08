//=============================================================================
// DirectivityShake.js
// ----------------------------------------------------------------------------
// (C)2016 Triacontane
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 1.2.0-MZ-MVCompat 2026/06/12 MZ native commands + MV command/script compatibility
// 1.2.0 2022/01/08 Add random shake command
// 1.1.1 2021/07/10 Fix SIN curve starting offset
// 1.1.0 2021/01/10 Support MZ
// 1.0.0 2016/11/03 Initial release
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 设置震动方向插件 / Directivity Shake
 * @author Triacontane / MZ merge by shiroin
 *
 * @command SHAKE_SETTING
 * @text シェイク指向設定
 * @desc 设置下一次“震动屏幕”的方向和 SIN 曲线。
 *
 * @arg rotation
 * @text 角度
 * @desc 指定震动角度。(0-360)
 * @default 0
 * @type number
 * @min 0
 * @max 360
 *
 * @arg sinWave
 * @text SIN曲线
 * @desc 是否使用 SIN 曲线震动。
 * @default false
 * @type boolean
 *
 * @command RANDOM_SHAKE_SETTING
 * @text ランダムシェイク設定
 * @desc 设置下一次“震动屏幕”为随机角度震动。
 *
 * @arg sinWave
 * @text SIN曲线
 * @desc 是否使用 SIN 曲线震动。
 * @default false
 * @type boolean
 *
 * @arg interval
 * @text 更新间隔
 * @desc 随机角度更新间隔。0 表示不更新，1 表示逐帧更新。
 * @default 1
 * @type number
 *
 * @command SIN_WAVE
 * @text SIN振动
 * @desc 仅将下一次“震动屏幕”设置为 SIN 曲线。
 *
 * @help
 * 为事件指令“震动屏幕”设置震动方向。
 *
 * MZ 插件命令：
 *   SHAKE_SETTING
 *   RANDOM_SHAKE_SETTING
 *   SIN_WAVE
 *
 * 兼容 MV 插件命令：
 *   DS_方向設定 90
 *   DS_SET_ROTATION 90
 *   DS_SIN振動
 *   DS_SIN_WAVE
 *   DS_随机角度
 *   DS_RANDOM_ROTATION
 *
 * 兼容脚本调用：
 *   $gameScreen.setShakeRotation(90)
 *   $gameScreen.setShakeRotation(90, true)
 *   $gameScreen.setShakeSinWave()
 *   $gameScreen.setShakeRandom()
 *   $gameScreen.setShakeRandom(1, true)
 *
 * 在执行“震动屏幕”之前设置。震动结束后设置会自动重置。
 *
 * 使用条款：
 * 可自由修改、再发布、商用、18禁使用。
 */

(function() {
    'use strict';

    var pluginName = 'DirectivityShake';
    var metaTagPrefix = 'DS_';

    var toBoolean = function(value) {
        return value === true || String(value).toLowerCase() === 'true';
    };

    var convertEscapeCharacters = function(text) {
        if (text == null) return '';
        var scene = SceneManager._scene;
        var windowLayer = scene && scene._windowLayer;
        var window = windowLayer && windowLayer.children && windowLayer.children[0];
        if (window && typeof window.convertEscapeCharacters === 'function') {
            return window.convertEscapeCharacters(String(text));
        }
        return String(text);
    };

    var getArgNumber = function(arg, min, max) {
        if (min == null) min = -Infinity;
        if (max == null) max = Infinity;
        var value = parseInt(convertEscapeCharacters(arg), 10);
        if (isNaN(value)) value = 0;
        if (typeof value.clamp === 'function') {
            return value.clamp(min, max);
        }
        return Math.max(min, Math.min(max, value));
    };

    var getCommandName = function(command) {
        return (command || '').toUpperCase();
    };

    var registerMZCommand = function(commandName, handler) {
        if (typeof PluginManager !== 'undefined' &&
            typeof PluginManager.registerCommand === 'function') {
            PluginManager.registerCommand(pluginName, commandName, handler);
        }
    };

    registerMZCommand('SHAKE_SETTING', function(args) {
        $gameScreen.setShakeRotation(getArgNumber(args.rotation, 0, 360), toBoolean(args.sinWave));
    });

    registerMZCommand('RANDOM_SHAKE_SETTING', function(args) {
        $gameScreen.setShakeRandom(getArgNumber(args.interval, 0), toBoolean(args.sinWave));
    });

    registerMZCommand('SIN_WAVE', function() {
        $gameScreen.setShakeSinWave();
    });

    //=============================================================================
    // Game_Interpreter
    //  MV-style plugin command compatibility.
    //=============================================================================
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        if (_Game_Interpreter_pluginCommand) {
            _Game_Interpreter_pluginCommand.apply(this, arguments);
        }
        var commandPrefix = new RegExp('^' + metaTagPrefix, 'i');
        if (!command || !command.match(commandPrefix)) return;
        this.pluginCommandDirectivityShake(command.replace(commandPrefix, ''), args || []);
    };

    Game_Interpreter.prototype.pluginCommandDirectivityShake = function(command, args) {
        switch (getCommandName(command)) {
            case '方向設定':
            case 'SET_ROTATION':
                $gameScreen.setShakeRotation(getArgNumber(args[0], 0, 360));
                break;
            case 'SIN振動':
            case 'SIN_WAVE':
                $gameScreen.setShakeSinWave();
                break;
            case '随机角度':
            case 'RANDOM_ROTATION':
                $gameScreen.setShakeRandom();
                break;
        }
    };

    //=============================================================================
    // Game_Screen
    //  Shake direction state.
    //=============================================================================
    Game_Screen.prototype.getShakeRotation = function() {
        return this._shakeRotation || 0;
    };

    Game_Screen.prototype.setShakeRotation = function(value, sin) {
        this._shakeRotation = getArgNumber(value, 0, 360) * Math.PI / 180;
        this._shakeSinWave = !!sin;
        this._shakeRandom = false;
        this._shakeRandomInterval = 0;
    };

    Game_Screen.prototype.setShakeSinWave = function() {
        this._shakeSinWave = true;
    };

    Game_Screen.prototype.setShakeRandom = function(interval, sin) {
        this._shakeRotation = Math.randomInt(360) * Math.PI / 180;
        this._shakeSinWave = !!sin;
        this._shakeRandom = true;
        this._shakeRandomInterval = interval == null ? 1 : Math.max(0, Number(interval) || 0);
    };

    var _Game_Screen_clearShake = Game_Screen.prototype.clearShake;
    Game_Screen.prototype.clearShake = function() {
        _Game_Screen_clearShake.apply(this, arguments);
        this.clearDirectivityShake();
    };

    Game_Screen.prototype.clearDirectivityShake = function() {
        this._shakeRotation = 0;
        this._shakeSinWave = false;
        this._shakeRandom = false;
        this._shakeRandomInterval = 0;
    };

    var _Game_Screen_updateShake = Game_Screen.prototype.updateShake;
    Game_Screen.prototype.updateShake = function() {
        var wasShake = this.isNeedShakeUpdate();
        if (this._shakeRandom && this._shakeRandomInterval > 0 &&
            Graphics.frameCount % this._shakeRandomInterval === 0) {
            this._shakeRotation = Math.randomInt(360) * Math.PI / 180;
        }
        if (this._shakeSinWave && wasShake) {
            this.updateSinShake();
        } else {
            _Game_Screen_updateShake.apply(this, arguments);
        }
        if (wasShake && !this.isNeedShakeUpdate()) {
            this.clearDirectivityShake();
        }
    };

    var _Game_Screen_startShake = Game_Screen.prototype.startShake;
    Game_Screen.prototype.startShake = function(power, speed, duration) {
        _Game_Screen_startShake.apply(this, arguments);
        this._shakeDurationTarget = duration;
        this._lastShake = 0;
    };

    Game_Screen.prototype.updateSinShake = function() {
        var target = this._shakeDurationTarget || this._shakeDuration;
        var pos = target - this._shakeDuration;
        this._shake = Math.sin(3 * pos * this._shakeSpeed * Math.PI / 180) * this._shakePower * 3;
        this._shakeDuration--;
        if (this._shakeDuration === 0) {
            this._lastShake = this._shake;
        }
        if (this._lastShake * this._shake < 0) {
            this._shake = 0;
            this._lastShake = 0;
        }
    };

    Game_Screen.prototype.isNeedShakeUpdate = function() {
        return this._shakeDuration > 0 || this._shake !== 0;
    };

    //=============================================================================
    // Spriteset_Base
    //  Apply direction to the normal screen shake.
    //=============================================================================
    var _Spriteset_Base_updatePosition = Spriteset_Base.prototype.updatePosition;
    Spriteset_Base.prototype.updatePosition = function() {
        _Spriteset_Base_updatePosition.apply(this, arguments);
        var shakeRotation = $gameScreen.getShakeRotation();
        if (shakeRotation) {
            var shakeDistance = Math.round($gameScreen.shake());
            this.x -= shakeDistance;
            this.x += Math.cos(shakeRotation) * shakeDistance;
            this.y += Math.sin(shakeRotation) * shakeDistance;
        }
    };
})();
