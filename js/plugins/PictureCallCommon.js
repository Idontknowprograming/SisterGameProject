//=============================================================================
// PictureCallCommon.js
// ----------------------------------------------------------------------------
// (C)2015 Triacontane
// This plugin is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 1.6.4 2025/05/20 1.6.3の修正で一部不十分な点があり修正
// 1.6.3 2025/04/29 スプライトシートなどフレーム設定されたピクチャのタッチに対応
// 1.6.2 2024/12/10 1.6.1の修正で拡大率をマイナスに設定したピクチャのタッチイベントが発生しなくなっていた問題を修正
// 1.6.1 2024/06/04 ボタンピクチャを極めて小さい拡大率（負の値への移動も含む）で表示しようとするとエラーになる場合がある問題を修正
// 1.6.0 2023/11/16 プラグインコマンドを「ピクチャの操作拡張プラグイン」が提供する一括指定機能に対応させました。
// 1.5.1 2023/06/12 ピクチャイベント解除時に指定した番号以外の番号のピクチャイベントも一緒に解除される可能性がある問題を修正
// 1.5.0 2023/04/22 ピクチャイベントを発生させる際、透過部分に反応するかどうかを設定できる機能を追加
// 1.4.0 2022/10/22 DTextPicture.jsと組み合わせたとき、フレームウィンドウをクリックイベントの範囲に含めるよう変更
// 1.3.1 2022/05/19 ヘルプ微修正
// 1.3.0 2022/04/14 ピクチャクリック時に変数を操作する機能および任意スクリプトを実行する機能を追加
// 1.2.2 2021/11/07 異なるピクチャのトリガーを同一フレームで同時に満たした場合、すべてのタッチ処理が実行されるよう修正
// 1.2.1 2021/10/08 トリガー種別がマウスが重なった場合のとき無効スイッチ中に条件を満たしていると、無効スイッチがOFFになった瞬間にイベントが発生してしまう問題を修正
// 1.2.0 2021/05/20 APNGピクチャプラグインと組み合わせたときにAPNGピクチャをボタン化できるよう修正（ただし透過色は考慮されない）
// 1.1.2 2021/04/08 トリガー「マウスをピクチャ内で移動した場合」がマウスを押していないと反応しない問題を修正
// 1.1.1 2020/12/21 スクリプト$gameScreen.showPictureを使って未キャッシュのピクチャを表示しようとすると画像が表示されなくなる問題を修正
//                  セーブデータロード時にエラーになる問題を修正
// 1.1.0 2020/12/20 イベントごとに無効スイッチを指定できる機能を追加
// 1.0.0 2020/12/17 MZ版として新規作成
// ----------------------------------------------------------------------------
// [Blog]   : https://triacontane.blogspot.jp/
// [Twitter]: https://twitter.com/triacontane/
// [GitHub] : https://github.com/triacontane/
//=============================================================================

/*:
 * @plugindesc ピクチャのボタン化プラグイン
 * @target MZ
 * @url https://github.com/triacontane/RPGMakerMV/tree/mz_master/PictureCallCommon.js
 * @base PluginCommonBase
 * @author トリアコンタン
 *
 * @param PictureIdVariable
 * @text ピクチャ番号の変数
 * @desc 最後にイベントが発生したピクチャ番号を格納する変数IDです。
 * @default 0
 * @type variable
 *
 * @param InvalidSwitchId
 * @text 無効スイッチ
 * @desc 指定した番号のスイッチがONになっている場合、すべてのピクチャイベントが無効になります。
 * @default 0
 * @type switch
 * 
 * @param FlickDistance
 * @text フリック有効距離
 * @desc フリック判定が有効になる距離(ピクセル数)です。
 * @default 60
 * @type number
 * 
 * @param FlickTimeVariable
 * @text フリック時間の変数
 * @desc フリック判定が有効になるまでに掛かったフレーム数を格納する変数IDです。この値が小さいほど速いフリックです。
 * @default 0
 * @type variable
 *
 * @param FlickDegreeVariable
 * @text フリック角度の変数
 * @desc フリック判定が有効になったときのフリック方向を度数法で格納する変数IDです。
 * @default 0
 * @type variable
 *
 * @command ADD_PICTURE_EVENT
 * @text ピクチャイベント登録
 * @desc ピクチャ操作で発生するイベントを登録します。
 *
 * @arg pictureId
 * @text ピクチャ番号
 * @desc 操作対象のピクチャ番号です。
 * @default 1
 * @type number
 *
 * @arg commonEventId
 * @text コモンイベント番号
 * @desc イベント発生時に呼び出すコモンイベントです。
 * @default 0
 * @type common_event
 *
 * @arg switchId
 * @text スイッチ番号
 * @desc イベント発生時にONになるスイッチです。
 * @default 0
 * @type switch
 *
 * @arg variableId
 * @text 変数番号
 * @desc イベント発生時に値が加減される変数です。
 * @default 0
 * @type variable
 *
 * @arg operationType
 * @parent variableId
 * @text 操作種別
 * @desc イベント発生時に指定した変数の操作種別です。
 * @default 0
 * @type select
 * @option 代入
 * @value 0
 * @option 加算
 * @value 1
 * @option 減算
 * @value 2
 * @option 乗算
 * @value 3
 * @option 除算
 * @value 4
 * @option 剰余
 * @value 5
 *
 * @arg operand
 * @parent variableId
 * @text オペランド
 * @desc イベント発生時に指定した変数の操作値です。
 * @default 0
 * @type number
 * @min -99999999
 *
 * @arg script
 * @text スクリプト
 * @desc イベント発生時に実行されるスクリプトです。
 * @type multiline_string
 *
 * @arg buttonBind
 * @text ボタンバインド
 * @desc イベント発生時に押したことになるボタンです。
 * @default
 * @type combo
 * @option ok
 * @option shift
 * @option control
 * @option escape
 * @option left
 * @option up
 * @option right
 * @option down
 * @option pageup
 * @option pagedown
 *
 * @arg triggerType
 * @text トリガー種別
 * @desc トリガーとなるマウス、タッチ操作の種別です。
 * @default 1
 * @type select
 * @option 1:クリックした場合
 * @value 1
 * @option 2:右クリックした場合
 * @value 2
 * @option 3:長押しした場合
 * @value 3
 * @option 4:マウスをピクチャに重ねた場合
 * @value 4
 * @option 5:マウスをピクチャから放した場合
 * @value 5
 * @option 6:クリックを解放（リリース）した場合
 * @value 6
 * @option 7:クリックした場合（かつ長押しの際の繰り返しを考慮）
 * @value 7
 * @option 8:クリックしている間ずっと
 * @value 8
 * @option 9:ホイールクリックした場合（PCの場合のみ有効）
 * @value 9
 * @option 10:ダブルクリックした場合
 * @value 10
 * @option 11:マウスをピクチャ内で移動した場合
 * @value 11
 * @option 12:マウスを押しつつピクチャ内で移動した場合
 * @value 12
 * @option 13:フリック(マウス押下状態で指定距離以上動かす)した場合
 * @value 13
 * @option 14:ピクチャに重ねてホイールを上に回した場合
 * @value 14
 * @option 15:ピクチャに重ねてホイールを下に回した場合
 * @value 15
 *
 * @arg invalidSwitchId
 * @text 無効スイッチ
 * @desc 指定した番号のスイッチがONになっている場合、ピクチャイベントが無効になります。
 * @default 0
 * @type switch
 *
 * @command SET_PICTURE_PREFERENCE
 * @text ピクチャ設定
 * @desc　ピクチャイベントの設定を変更します。
 *
 * @arg pictureId
 * @text ピクチャ番号
 * @desc 変更対象のピクチャ番号です。
 * @default 1
 * @type number
 *
 * @arg includeOpacityZero
 * @text 透過部分も含む
 * @desc ピクチャの透明部分にも反応するかどうかです。
 * @default false
 * @type boolean
 *
 * @arg checkOcclusion
 * @text 遮蔽チェック
 * @desc ONにすると、より上に表示された不透明なピクチャに覆われている箇所では反応しなくなります。
 * @default false
 * @type boolean
 *
 * @command REMOVE_PICTURE_EVENT
 * @text ピクチャイベント解除
 * @desc 登録したピクチャイベントを解除します。
 *
 * @arg pictureId
 * @text ピクチャ番号
 * @desc 操作対象のピクチャ番号です。
 * @default 1
 * @type number
 *
 * @help PictureCallCommon.js
 *
 * ピクチャに対する様々なマウス操作に反応してコモンイベント実行や
 * スイッチ制御ができます。（これをピクチャイベントと呼びます）
 * 一度登録したピクチャイベントはピクチャを消去しても有効です。
 * 解除は専用のプラグインコマンドから可能です。
 *
 * 各マウス操作について、ピクチャの透明部分には反応しません。
 *
 * ピクチャイベントはマップ画面でも戦闘画面でも
 * 他のイベントや状況の制限を受けずに速やかに並列実行されます。
 * また、ピクチャイベントが発生した瞬間のフレームでは他のクリック処理は
 * 無効となりタッチによるマップ移動やメッセージ送り等は行われません。
 *
 * 利用規約：
 *  作者に無断で改変、再配布が可能で、利用形態（商用、18禁利用等）
 *  についても制限はありません。
 *  このプラグインはもうあなたのものです。
 */

(function() {
    'use strict';
    const script = document.currentScript;
    const param  = PluginManagerEx.createParameter(script);
    const legacyParam = PluginManager.parameters('PictureCallCommon');
    const legacyBool = name => String(legacyParam[name] || '').toUpperCase() === 'TRUE' ||
        String(legacyParam[name] || '').toUpperCase() === 'ON';
    const legacyNumber = name => Number(legacyParam[name] || 0);

    param.PictureIdVariable = Number(param.PictureIdVariable || legacyNumber('GameVariablePictureNum') || 0);
    param.InvalidSwitchId = Number(param.InvalidSwitchId || legacyNumber('InvalidSwitchId') || 0);
    param.FlickDistance = Number(param.FlickDistance || 60);
    param.FlickTimeVariable = Number(param.FlickTimeVariable || 0);
    param.FlickDegreeVariable = Number(param.FlickDegreeVariable || 0);
    param.LegacyTransparentConsideration = legacyParam.TransparentConsideration !== undefined ?
        legacyBool('TransparentConsideration') : true;
    param.LegacyTouchXVariable = legacyNumber('GameVariableTouchX');
    param.LegacyTouchYVariable = legacyNumber('GameVariableTouchY');
    param.LegacySuppressTouch = legacyBool('SuppressTouch');
    param.LegacySuppressTouchSwitch = legacyNumber('SuppressTouchSwitch');
    param.LegacyAlwaysCommonInBattle = legacyBool('AlwaysCommonInBattle');
    param.LegacyAsParallelCommon = legacyBool('AsParallelCommon');

    PluginManagerEx.registerCommand(script, 'ADD_PICTURE_EVENT', args => {
        if ($gameScreen.iteratePictures) {
            $gameScreen.iteratePictures($gameScreen.addPictureEvent, [args.pictureId, args.triggerType, args]);
        } else {
            $gameScreen.addPictureEvent(args.pictureId, args.triggerType, args);
        }
    });

    PluginManagerEx.registerCommand(script, 'REMOVE_PICTURE_EVENT', args => {
        if ($gameScreen.iteratePictures) {
            $gameScreen.iteratePictures($gameScreen.removePictureEvent, [args.pictureId]);
        } else {
            $gameScreen.removePictureEvent(args.pictureId);
        }
    });

    PluginManagerEx.registerCommand(script, 'SET_PICTURE_PREFERENCE', args => {
        if ($gameScreen.iteratePictures) {
            $gameScreen.iteratePictures($gameScreen.setPicturePreference, [args.pictureId, args]);
        } else {
            $gameScreen.setPicturePreference(args.pictureId, args);
        }
    });

    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.apply(this, arguments);
        const name = String(command || '').toUpperCase();
        switch (name) {
            case 'P_CALL_CE':
            case 'ピクチャのボタン化':
                $gameScreen.setPictureCallCommon(
                    getArgNumber(args[0], 1, $gameScreen.maxPictures()),
                    getArgNumber(args[1], 1, $dataCommonEvents.length - 1),
                    getArgNumber(args[2], 1),
                    getArgBooleanOrNull(args[3])
                );
                break;
            case 'P_CALL_SWITCH':
            case 'ピクチャのスイッチ化':
                $gameScreen.setPictureCallCommon(
                    getArgNumber(args[0], 1, $gameScreen.maxPictures()),
                    getArgNumber(args[1], 1) * -1,
                    getArgNumber(args[2], 1),
                    getArgBooleanOrNull(args[3])
                );
                break;
            case 'P_CALL_KEY_BIND':
            case 'ピクチャのキーバインド':
                $gameScreen.setPictureCallCommon(
                    getArgNumber(args[0], 1, $gameScreen.maxPictures()),
                    convertEscapeCharacters(args[1]).toLowerCase(),
                    getArgNumber(args[2], 1),
                    getArgBooleanOrNull(args[3])
                );
                break;
            case 'P_CALL_CE_REMOVE':
            case 'ピクチャのボタン化解除':
                $gameScreen.setPictureRemoveCommon(getArgNumber(args[0], 1, $gameScreen.maxPictures()));
                break;
            case 'P_STROKE':
            case 'ピクチャのなでなで設定':
                $gameScreen.setPictureStroke(
                    getArgNumber(args[0], 1, $gameScreen.maxPictures()),
                    getArgNumber(args[1], 1, $dataSystem.variables.length - 1),
                    getArgBooleanOrNull(args[2])
                );
                break;
            case 'P_STROKE_REMOVE':
            case 'ピクチャのなでなで解除':
                $gameScreen.removePictureStroke(getArgNumber(args[0], 1, $gameScreen.maxPictures()));
                break;
            case 'P_POINTER':
            case 'ピクチャのポインタ化':
                $gameScreen.setPicturePointer(getArgNumber(args[0], 1, $gameScreen.maxPictures()));
                break;
            case 'P_POINTER_REMOVE':
            case 'ピクチャのポインタ化解除':
                $gameScreen.removePicturePointer(getArgNumber(args[0], 1, $gameScreen.maxPictures()));
                break;
        }
    };

    function convertEscapeCharacters(text) {
        if (text == null) {
            return '';
        }
        const scene = SceneManager._scene;
        const windowLayer = scene && scene._windowLayer;
        const window = windowLayer && windowLayer.children ? windowLayer.children[0] : null;
        return window && window.convertEscapeCharacters ? window.convertEscapeCharacters(String(text)) : String(text);
    }

    function getArgNumber(arg, min = -Infinity, max = Infinity) {
        const value = Number(convertEscapeCharacters(arg || '0')) || 0;
        return Math.max(min, Math.min(max, value));
    }

    function getArgBooleanOrNull(arg) {
        if (arg == null) {
            return null;
        }
        const value = String(convertEscapeCharacters(arg)).toUpperCase();
        if (value === 'ON' || value === 'TRUE') {
            return true;
        }
        if (value === 'OFF' || value === 'FALSE') {
            return false;
        }
        return null;
    }

    function legacyTransparentToIncludeOpacityZero(transparent) {
        const considerTransparent = transparent !== null ? transparent : param.LegacyTransparentConsideration;
        return !considerTransparent;
    }

    //=============================================================================
    // Game_Interpreter
    //  MV版PictureCallCommon互換のピクチャ起動コモンイベント識別。
    //=============================================================================
    const _Game_Interpreter_terminate = Game_Interpreter.prototype.terminate;
    Game_Interpreter.prototype.terminate = function() {
        _Game_Interpreter_terminate.apply(this, arguments);
        this._setupFromPicture = false;
    };

    Game_Interpreter.prototype.setupFromPicture = function(eventList, commonId) {
        this.setup(eventList, 0);
        if (this.setEventInfo) {
            this.setEventInfo({ eventType: 'common_event', commonEventId: commonId });
        }
        this._setupFromPicture = true;
    };

    Game_Interpreter.prototype.isSetupFromPicture = function() {
        return !!this._setupFromPicture;
    };

    //=============================================================================
    // Game_Temp
    //  MV版PictureCallCommon互換のクリック予約キュー。
    //=============================================================================
    const _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this.clearPictureCallInfo();
    };

    Game_Temp.prototype.clearPictureCallInfo = function() {
        this._pictureCommonId = 0;
        this._touchPictureId = 0;
        this._touchPictureParam = null;
    };

    Game_Temp.prototype.setPictureCallInfo = function(commonEventId) {
        this._pictureCommonId = Number(commonEventId || 0);
    };

    Game_Temp.prototype.pictureCommonId = function() {
        if (!$gameScreen.picture(this._touchPictureId)) {
            this.clearPictureCallInfo();
        }
        return this._pictureCommonId || 0;
    };

    Game_Temp.prototype.onTouchPicture = function(touchParameter, pictureId) {
        this._touchPictureParam = touchParameter;
        if (this.isTouchPictureSetSwitch()) {
            $gameSwitches.setValue(Number(touchParameter) * -1, true);
        }
        if (this.isTouchPictureCallCommon()) {
            if (!param.LegacyAsParallelCommon && $gameMap.isEventRunning() && !$gameParty.inBattle()) {
                this._touchPictureParam = null;
                return;
            }
            this.setPictureCallInfo(touchParameter);
        }
        if (this.isTouchPictureButtonTrigger()) {
            Input.bindKeyState(String(touchParameter).toLowerCase());
        }
        if (param.PictureIdVariable > 0) {
            $gameVariables.setValue(param.PictureIdVariable, pictureId);
        }
        this._touchPictureId = pictureId;
    };

    Game_Temp.prototype.isTouchPictureButtonTrigger = function() {
        return isNaN(this._touchPictureParam);
    };

    Game_Temp.prototype.isTouchPictureSetSwitch = function() {
        return !isNaN(this._touchPictureParam) && Number(this._touchPictureParam) < 0;
    };

    Game_Temp.prototype.isTouchPictureCallCommon = function() {
        return !isNaN(this._touchPictureParam) && Number(this._touchPictureParam) > 0;
    };

    //=============================================================================
    // Game_Map
    //  MV版PictureCallCommon互換のコモンイベント起動。
    //=============================================================================
    const _Game_Map_setupStartingEvent = Game_Map.prototype.setupStartingEvent;
    Game_Map.prototype.setupStartingEvent = function() {
        const result = _Game_Map_setupStartingEvent.call(this);
        return result || this.setupPictureCommonEvent();
    };

    const _Game_Map_updateInterpreter = Game_Map.prototype.updateInterpreter;
    Game_Map.prototype.updateInterpreter = function() {
        _Game_Map_updateInterpreter.apply(this, arguments);
        this.setupPictureParallelCommonEvent();
    };

    Game_Map.prototype.setupPictureParallelCommonEvent = function() {
        if (!param.LegacyAsParallelCommon) {
            return;
        }
        const commonId = $gameTemp.pictureCommonId();
        const event = $dataCommonEvents[commonId];
        if (!event) {
            return;
        }
        const pictureId = $gameTemp._touchPictureId;
        if (typeof this.steupCEQJ === 'function') {
            this.steupCEQJ(commonId, pictureId);
        } else {
            this.setupDynamicCommon(commonId);
        }
        $gameTemp.clearPictureCallInfo();
    };

    Game_Map.prototype.setupPictureCommonEvent = function() {
        if (param.LegacyAsParallelCommon) {
            return false;
        }
        const commonId = $gameTemp.pictureCommonId();
        const event = $dataCommonEvents[commonId];
        let result = false;
        if (!this.isEventRunning() && event) {
            this._interpreter.setupFromPicture(event.list, commonId);
            result = true;
        }
        $gameTemp.clearPictureCallInfo();
        return result;
    };

    //=============================================================================
    // Game_System
    //  ロード時にピクチャ関連メンバを初期化します。
    //=============================================================================
    const _Game_System_onAfterLoad    = Game_System.prototype.onAfterLoad;
    Game_System.prototype.onAfterLoad = function() {
        _Game_System_onAfterLoad.apply(this, arguments);
        $gameScreen.initPictureEventMap();
    };

    //=============================================================================
    // Game_Screen
    //  ピクチャに対応するコモンイベント呼び出し用のID配列を追加定義します。
    //=============================================================================
    const _Game_Screen_initialize    = Game_Screen.prototype.initialize;
    Game_Screen.prototype.initialize = function() {
        _Game_Screen_initialize.apply(this, arguments);
        this.initPictureEventMap();
    };

    Game_Screen.prototype.initPictureEventMap = function() {
        if (!this._pictureEventMap) {
            this._pictureEventMap = new Game_PictureEventMap();
        }
        if (!this._pictureCidArray) {
            this._pictureCidArray = [];
        }
        if (!this._pictureTransparentArray) {
            this._pictureTransparentArray = [];
        }
        if (!this._pictureStrokeMap) {
            this._pictureStrokeMap = {};
        }
        if (!this._picturePointerMap) {
            this._picturePointerMap = {};
        }
    };

    Game_Screen.prototype.addPictureEvent = function(pictureId, trigger, param) {
        const realPictureId = this.realPictureId(pictureId);
        this._pictureEventMap.append(realPictureId, trigger, param);
    };

    Game_Screen.prototype.removePictureEvent = function(pictureId, trigger = null) {
        const realPictureId = this.realPictureId(pictureId);
        if (trigger === null) {
            this._pictureEventMap.removeById(realPictureId);
        } else {
            this._pictureEventMap.remove(realPictureId, trigger);
        }
    };

    Game_Screen.prototype.findPictureEvent = function(pictureId, trigger) {
        const realPictureId = this.realPictureId(pictureId);
        const legacyEvent = this.findLegacyPictureEvent(realPictureId, trigger);
        if (legacyEvent) {
            return legacyEvent;
        }
        return this._pictureEventMap.find(realPictureId, trigger);
    };

    Game_Screen.prototype.findLegacyPictureEvent = function(realPictureId, trigger) {
        const cidList = this._pictureCidArray && this._pictureCidArray[realPictureId];
        if (!cidList || cidList[trigger] == null) {
            return null;
        }
        return this.createLegacyPictureEventData(realPictureId, trigger, cidList[trigger]);
    };

    Game_Screen.prototype.createLegacyPictureEventData = function(pictureId, trigger, touchParameter) {
        const eventData = {
            pictureId: Number(pictureId),
            triggerType: Number(trigger || 1),
            commonEventId: 0,
            switchId: 0,
            variableId: 0,
            operationType: 0,
            operand: 0,
            script: '',
            buttonBind: '',
            invalidSwitchId: 0,
            legacyTouchParameter: touchParameter
        };
        if (typeof touchParameter === 'string' && isNaN(Number(touchParameter))) {
            eventData.buttonBind = touchParameter.toLowerCase();
        } else {
            const value = Number(touchParameter || 0);
            if (value < 0) {
                eventData.switchId = Math.abs(value);
            } else {
                eventData.commonEventId = value;
            }
        }
        return eventData;
    };

    Game_Screen.prototype.setPicturePreference = function(pictureId, param) {
        const realPictureId = this.realPictureId(pictureId);
        this._pictureEventMap.setPreference(realPictureId, param);
    };

    Game_Screen.prototype.getPicturePreference = function(pictureId) {
        const realPictureId = this.realPictureId(pictureId);
        const preference = this._pictureEventMap.getPreference(realPictureId);
        if (preference) {
            return preference;
        }
        if (this._pictureTransparentArray && realPictureId in this._pictureTransparentArray) {
            return {
                includeOpacityZero: legacyTransparentToIncludeOpacityZero(this._pictureTransparentArray[realPictureId])
            };
        }
        return preference;
    }

    Game_Screen.prototype.disConvertPositionX = function(x) {
        const unshiftX = x - this.zoomX() * (1 - this.zoomScale());
        return Math.round(unshiftX / this.zoomScale());
    };

    Game_Screen.prototype.disConvertPositionY = function(y) {
        const unshiftY = y - this.zoomY() * (1 - this.zoomScale());
        return Math.round(unshiftY / this.zoomScale());
    };

    Game_Screen.prototype.setPictureCallCommon = function(pictureId, touchParameter, trigger = 1, transparent = null) {
        const realPictureId = this.realPictureId(pictureId);
        const realTrigger = Number(trigger || 1);
        if (this._pictureCidArray[realPictureId] == null) {
            this._pictureCidArray[realPictureId] = [];
        }
        this._pictureCidArray[realPictureId][realTrigger] = touchParameter;
        this._pictureTransparentArray[realPictureId] = transparent;
        this.removePictureEvent(pictureId, realTrigger);
    };

    Game_Screen.prototype.setPictureRemoveCommon = function(pictureId) {
        this._pictureCidArray[this.realPictureId(pictureId)] = null;
        this.removePictureEvent(pictureId);
    };

    Game_Screen.prototype.getPictureCid = function(pictureId) {
        return this._pictureCidArray[this.realPictureId(pictureId)];
    };

    Game_Screen.prototype.getPictureTransparent = function(pictureId) {
        return this._pictureTransparentArray[this.realPictureId(pictureId)];
    };

    window.dumpPictureCallCommon = function(pictureId, trigger = 1) {
        const screen = $gameScreen;
        const realPictureId = screen.realPictureId(Number(pictureId));
        const sprite = SceneManager.getPictureSprite(Number(pictureId));
        const cid = screen._pictureCidArray && screen._pictureCidArray[realPictureId];
        const eventData = screen.findPictureEvent(Number(pictureId), Number(trigger));
        const result = {
            pictureId: Number(pictureId),
            realPictureId,
            trigger: Number(trigger),
            pictureExists: !!screen.picture(Number(pictureId)),
            pictureName: screen.picture(Number(pictureId))?.name?.(),
            spriteExists: !!sprite,
            spriteVisible: !!sprite?.visible,
            bitmapReady: !!sprite?.bitmap?.isReady?.(),
            touchX: TouchInput.x,
            touchY: TouchInput.y,
            isPointerInner: !!sprite?.isPointerInner?.(),
            isPointerInnerOpaque: !!sprite?.isPointerInnerOpaque?.(),
            transparent: screen.getPictureTransparent(Number(pictureId)),
            cid,
            cidValue: cid && cid[Number(trigger)],
            eventData,
            queuedCommonId: $gameTemp.pictureCommonId?.(),
            touchPictureId: $gameTemp._touchPictureId
        };
        console.log('[PictureCallCommon dump]', result);
        return result;
    };

    Game_Screen.prototype.setPictureStroke = function(pictureId, variableId, transparent = null) {
        const realPictureId = this.realPictureId(pictureId);
        this._pictureStrokeMap[realPictureId] = Number(variableId || 0);
        this.setPicturePreference(pictureId, {
            includeOpacityZero: legacyTransparentToIncludeOpacityZero(transparent)
        });
    };

    Game_Screen.prototype.removePictureStroke = function(pictureId) {
        delete this._pictureStrokeMap[this.realPictureId(pictureId)];
    };

    Game_Screen.prototype.getPictureStrokeVariable = function(pictureId) {
        return this._pictureStrokeMap[this.realPictureId(pictureId)] || 0;
    };

    Game_Screen.prototype.setPicturePointer = function(pictureId) {
        this._picturePointerMap[this.realPictureId(pictureId)] = true;
    };

    Game_Screen.prototype.removePicturePointer = function(pictureId) {
        delete this._picturePointerMap[this.realPictureId(pictureId)];
    };

    Game_Screen.prototype.isPicturePointer = function(pictureId) {
        return !!this._picturePointerMap[this.realPictureId(pictureId)];
    };

    /**
     * 清除 PictureCallCommon 保存的全部图片绑定。
     * 已经开始执行的公共事件不会被中止。
     */
    Game_Screen.prototype.clearAllPictureCallCommon = function() {
        this.initPictureEventMap();
        this._pictureEventMap.clear();
        this._pictureCidArray = [];
        this._pictureTransparentArray = [];
        this._pictureStrokeMap = {};
        this._picturePointerMap = {};
        if ($gameTemp && $gameTemp.clearPictureCallInfo) {
            $gameTemp.clearPictureCallInfo();
        }
    };

    Game_Screen.prototype.updatePicturePointerVariables = function() {
        if (param.LegacyTouchXVariable) {
            $gameVariables.setValue(param.LegacyTouchXVariable, TouchInput.x);
        }
        if (param.LegacyTouchYVariable) {
            $gameVariables.setValue(param.LegacyTouchYVariable, TouchInput.y);
        }
    };

    const _Game_Screen_update = Game_Screen.prototype.update;
    Game_Screen.prototype.update = function() {
        _Game_Screen_update.apply(this, arguments);
        this.updatePicturePointerVariables();
    };

    Game_Screen.prototype.isPointerInnerPicture = function(pictureId) {
        const sprite = SceneManager.getPictureSprite(pictureId);
        return sprite && sprite.isPointerInner ? sprite.isPointerInner() : false;
    };

    Game_Screen.prototype.isMouseOnOpaquePixel = function(pictureId) {
        const sprite = SceneManager.getPictureSprite(pictureId);
        if (!sprite || !sprite.visible || !sprite.bitmap || !sprite.bitmap.isReady()) {
            return false;
        }
        return sprite.isPointerInnerOpaque ? sprite.isPointerInnerOpaque() : false;
    };

    Game_Screen.prototype.changePictureName = function(pictureId, newName) {
        const picture = this.picture(pictureId);
        if (!picture) {
            return;
        }
        this.showPicture(
            pictureId,
            newName,
            picture.origin(),
            picture.x(),
            picture.y(),
            picture.scaleX(),
            picture.scaleY(),
            picture.opacity(),
            picture.blendMode()
        );
    };

    Game_Troop.prototype.setupDynamicCommon      = Game_Map.prototype.setupDynamicCommon;
    Game_Troop.prototype.setupDynamicInterpreter = Game_Map.prototype.setupDynamicInterpreter;

    const _Game_Troop_setup    = Game_Troop.prototype.setup;
    Game_Troop.prototype.setup = function(troopId) {
        _Game_Troop_setup.apply(this, arguments);
        if (!this._dynamicEvents) {
            this._dynamicEvents = [];
        }
    };

    Game_Troop.prototype.updateDynamicEvents = function() {
        this._dynamicEvents.forEach(interpreter => interpreter.update());
    };

    if (!Scene_Battle.prototype.hasOwnProperty('updateDynamicEvents')) {
        const _Scene_Battle_updateBattleProcess    = Scene_Battle.prototype.updateBattleProcess;
        Scene_Battle.prototype.updateBattleProcess = function() {
            _Scene_Battle_updateBattleProcess.apply(this, arguments);
            this.updateDynamicEvents();
        };

        Scene_Battle.prototype.updateDynamicEvents = function() {
            $gameTroop.updateDynamicEvents();
        };
    }

    /**
     * Game_PictureEventMap
     * ピクチャイベントの登録状態を管理するマップです。
     */
    class Game_PictureEventMap {
        constructor() {
            this._map = {}
            this._preference = {};
        }

        append(pictureId, trigger, option) {
            this._map[this.generateKey(pictureId, trigger)] = option;
        }

        find(pictureId, trigger) {
            return this._map[this.generateKey(pictureId, trigger)];
        }

        remove(pictureId, trigger) {
            delete this._map[this.generateKey(pictureId, trigger)];
        }

        removeById(pictureId) {
            const regExp = new RegExp(`^${pictureId}\:`);
            Object.keys(this._map).forEach(key => {
                if (key.match(regExp)) {
                    delete this._map[key];
                }
            });
        }

        clear() {
            this._map = {};
            this._preference = {};
        }

        generateKey(pictureId, trigger) {
            return `${pictureId}:${trigger}`;
        }

        setPreference(pictureId, option) {
            this._preference[pictureId] = option;
        }

        getPreference(pictureId) {
            return this._preference[pictureId];
        }
    }
    window.Game_PictureEventMap = Game_PictureEventMap;

    //=============================================================================
    // Sprite_Picture
    //  ピクチャのタッチ状態からのコモンイベント呼び出し予約を追加定義します。
    //=============================================================================
    const _Sprite_Picture_initialize    = Sprite_Picture.prototype.initialize;
    Sprite_Picture.prototype.initialize = function(pictureId) {
        _Sprite_Picture_initialize.call(this, pictureId);
        this._touch = new PictureTouch(this, pictureId);
    };

    const _Sprite_update            = Sprite_Picture.prototype.update;
    Sprite_Picture.prototype.update = function() {
        _Sprite_update.apply(this, arguments);
        if (this.picture() && this._touch && !$gameSwitches.value(param.InvalidSwitchId)) {
            this._touch.update();
        }
        this.updateLegacyPictureExtensions();
    };

    Sprite_Picture.prototype.updateLegacyPictureExtensions = function() {
        if (!this.picture() || !this._touch) {
            return;
        }
        this.updateLegacyStroke();
        this.updateLegacyPointer();
    };

    Sprite_Picture.prototype.updateLegacyStroke = function() {
        const variableId = $gameScreen.getPictureStrokeVariable(this._pictureId);
        if (variableId > 0 && TouchInput.isPressed() && this.isPointerInner()) {
            const value = $gameVariables.value(variableId);
            $gameVariables.setValue(variableId, value + TouchInput.pressedDistance);
        }
    };

    Sprite_Picture.prototype.updateLegacyPointer = function() {
        if (!$gameScreen.isPicturePointer(this._pictureId)) {
            return;
        }
        this.opacity = TouchInput.isPressed() ? 255 : 0;
        this.x = TouchInput.x;
        this.y = TouchInput.y;
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
    };

    Sprite_Picture.prototype.isPointerInner = function() {
        return this._touch ? this._touch.isOnPicturePos() : false;
    };

    Sprite_Picture.prototype.isPointerInnerOpaque = function() {
        if (!this.bitmap || !this.bitmap.isReady() ||
            !Number.isFinite(this.scale.x) || !Number.isFinite(this.scale.y) ||
            Math.abs(this.scale.x) < 0.01 || Math.abs(this.scale.y) < 0.01) {
            return false;
        }
        const point = this.pictureLocalPoint(TouchInput.x, TouchInput.y);
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
            return false;
        }
        const frame = this._frame || new Rectangle(0, 0, this.bitmap.width, this.bitmap.height);
        const pixelX = Math.floor(point.x + frame.x);
        const pixelY = Math.floor(point.y + frame.y);
        if (!Number.isFinite(pixelX) || !Number.isFinite(pixelY) ||
            point.x < 0 || point.y < 0 || point.x >= frame.width || point.y >= frame.height) {
            return false;
        }
        return this.bitmap.getAlphaPixel(pixelX, pixelY) > 0;
    };

    Sprite_Picture.prototype.pictureLocalPoint = function(x, y) {
        const dx = $gameScreen.disConvertPositionX(x) - this.x;
        const dy = $gameScreen.disConvertPositionY(y) - this.y;
        const sin = Math.sin(-this.rotation);
        const cos = Math.cos(-this.rotation);
        return new Point(
            Math.floor(dx * cos + dy * -sin) / this.scale.x + this.anchor.x * this.width,
            Math.floor(dx * sin + dy * cos) / this.scale.y + this.anchor.y * this.height
        );
    };

    Sprite_Picture.prototype.isIdEquals = function(pictureId) {
        return this._pictureId === pictureId;
    };

    SceneManager.getPictureSprite = function(pictureId) {
        const scene = this._scene;
        return scene && scene.getPictureSprite ? scene.getPictureSprite(pictureId) : null;
    };

    Scene_Base.prototype.getPictureSprite = function(pictureId) {
        if (!this._spriteset || !this._spriteset.iteratePictures) {
            return null;
        }
        let result = null;
        this._spriteset.iteratePictures(sprite => {
            if (sprite.isIdEquals && sprite.isIdEquals(pictureId)) {
                result = sprite;
                return false;
            }
            return true;
        });
        return result;
    };

    Spriteset_Base.prototype.iteratePictures = function(callback) {
        const children = this._pictureContainer ? this._pictureContainer.children : [];
        for (let i = children.length - 1; i >= 0; i--) {
            if (callback(children[i]) === false) {
                break;
            }
        }
    };

    const _Spriteset_Base_update = Spriteset_Base.prototype.update;
    Spriteset_Base.prototype.update = function() {
        _Spriteset_Base_update.apply(this, arguments);
        TouchInput.suppressIfNeed();
    };

    // [扩展] 鼠标滚轮 上/下 滚动检测（触发号 14/15 用）。
    //   优先复用 Drill_CoreOfInput 的 TouchInput.drill_COI_isWheelUp/Down（wheelY 阈值 ±20）；
    //   若未加载 Drill_CoreOfInput，则回退到 MZ 原生 TouchInput.wheelY，行为一致。
    const drill_PCC_isWheelUp = function() {
        if (typeof TouchInput.drill_COI_isWheelUp === "function") { return TouchInput.drill_COI_isWheelUp(); }
        return TouchInput.wheelY <= -20;
    };
    const drill_PCC_isWheelDown = function() {
        if (typeof TouchInput.drill_COI_isWheelDown === "function") { return TouchInput.drill_COI_isWheelDown(); }
        return TouchInput.wheelY >= 20;
    };

    /**
     * PictureTouch
     * ピクチャのタッチ状態を管理します。
     */
    class PictureTouch {
        constructor(picture, id) {
            this._picture      = picture;
            this._pictureId    = id;
            this._handlers     = [];
            this._handlers[1]  = () => this.isTouchEvent(TouchInput.isTriggered);
            this._handlers[2]  = () => this.isTouchEvent(TouchInput.isCancelled);
            this._handlers[3]  = () => this.isTouchEvent(TouchInput.isLongPressed) &&
                this.isOnPicturePos(TouchInput._triggerX, TouchInput._triggerY);
            this._handlers[4]  = () => this._onMouse;
            this._handlers[5]  = () => this._outMouse;
            this._handlers[6]  = () => this.isTouchEvent(TouchInput.isReleased);
            this._handlers[7]  = () => this.isTouchEvent(TouchInput.isRepeated);
            this._handlers[8]  = () => this.isTouchEvent(TouchInput.isPressed);
            this._handlers[9]  = () => this.isTouchEvent(TouchInput.isWheelTriggered);
            this._handlers[10] = () => this.isTouchEvent(TouchInput.isDoubleTriggered);
            this._handlers[11] = () => this.isTouchEvent(TouchInput.isHovered);
            this._handlers[12] = () => this.isTouchEvent(TouchInput.isMoved);
            this._handlers[13] = () => this._flick;
            this._handlers[14] = () => this.isTouchEvent(drill_PCC_isWheelUp);    // [扩展] 悬停 + 滚轮上滚[一帧]
            this._handlers[15] = () => this.isTouchEvent(drill_PCC_isWheelDown);  // [扩展] 悬停 + 滚轮下滚[一帧]
            this._onMouse      = false;
            this._outMouse     = false;
            this._wasOnMouse   = false;
            this._flick        = false;
            this._interpreter  = new Game_Interpreter();
        }

        update() {
            this.updateFlick();
            this.updatePictureTouch();
            this.updateMouseMove();
        }

        updatePictureTouch() {
            if (SceneManager.isNextScene(Scene_Battle)) {
                return;
            }
            this._handlers.forEach((handler, trigger) => {
                if (this.isValidTrigger(handler, trigger)) {
                    const eventData = this.findPictureEvent(this._pictureId, trigger);
                    this.fireTouchEvent(eventData, trigger);
                }
            });
        }

        updateMouseMove() {
            if (this.isOnPicturePos()) {
                if (!this._wasOnMouse) {
                    this._outMouse   = false;
                    this._onMouse    = true;
                    this._wasOnMouse = true;
                }
            } else if (this._wasOnMouse) {
                this._outMouse   = true;
                this._wasOnMouse = false;
                this._onMouse    = false;
            }
        }

        updateFlick() {
            this._flick = false;
            const data  = TouchInput.createFlickData();
            if (!data) {
                return;
            }
            if (data.distance >= param.FlickDistance && this.isOnPicturePos(data.start.x, data.start.y)) {
                this._flick = true;
                if (param.FlickTimeVariable) {
                    $gameVariables.setValue(param.FlickTimeVariable, data.time);
                }
                if (param.FlickDegreeVariable) {
                    $gameVariables.setValue(param.FlickDegreeVariable, data.degree);
                }
            }
        }

        isValidTrigger(handler, trigger) {
            // 多指参与过的这次按压不再检测图片长按，避免沿用此前的起点。
            if (trigger === 3 && TouchInput._pictureLongPressBlocked) return false;
            const eventData = this.findPictureEvent(this._pictureId, trigger);
            return  eventData && !$gameSwitches.value(eventData.invalidSwitchId) &&
                handler && handler.call(this);
        }

        findPictureEvent(pictureId, trigger) {
            return $gameScreen.findPictureEvent(pictureId, trigger);
        }

        fireTouchEvent(eventData, trigger) {
            if (isLegacyTouchSuppressEnabled()) {
                TouchInput.requestSuppress();
            }
            if (trigger === 3) {
                TouchInput._pressedTime = -60;
            }
            if (trigger === 4) {
                this._onMouse = false;
            }
            if (trigger === 5) {
                this._outMouse = false;
            }
            this.applyTouchEvent(eventData);
        }

        applyTouchEvent(eventData) {
            if (eventData.hasOwnProperty('legacyTouchParameter')) {
                $gameTemp.onTouchPicture(eventData.legacyTouchParameter, this._pictureId);
                return;
            }
            if (eventData.switchId) {
                $gameSwitches.setValue(eventData.switchId, true);
            }
            if (eventData.variableId) {
                this._interpreter.operateVariable(eventData.variableId, eventData.operationType, eventData.operand);
            }
            if (eventData.script) {
                try {
                    eval(eventData.script);
                } catch (e) {
                    console.error('Error Script:' + eventData.script);
                    PluginManagerEx.throwError(e.message, script);
                }
            }
            if (eventData.buttonBind) {
                Input.bindKeyState(eventData.buttonBind);
            }
            if (eventData.commonEventId) {
                if ($gameParty.inBattle()) {
                    $gameTroop.setupDynamicCommon(eventData.commonEventId);
                } else {
                    $gameMap.setupDynamicCommon(eventData.commonEventId);
                }
            }
            if (param.PictureIdVariable > 0) {
                $gameVariables.setValue(param.PictureIdVariable, this._pictureId);
            }
        }

        isOnPicturePos(x = TouchInput.x, y = TouchInput.y) {
            if (!this.isPointInOpaque(x, y)) {
                return false;
            }
            // [扩展] 遮挡检测：仅当该图片偏好开启 checkOcclusion 时生效。
            //   若有渲染在更上层、且可见的图片，其不透明像素也覆盖了同一点，则视为被遮挡，不响应交互。
            const preference = $gameScreen.getPicturePreference(this._pictureId);
            if (preference && preference.checkOcclusion && this.isOccludedAt(x, y)) {
                return false;
            }
            return true;
        }

        // 原始命中判定：指针是否落在本图片的不透明区域内（不考虑遮挡）。
        isPointInOpaque(x = TouchInput.x, y = TouchInput.y) {
            const pic = this._picture;
            if (!Number.isFinite(x) || !Number.isFinite(y) ||
                !pic.bitmap || !pic.bitmap.isReady() ||
                !Number.isFinite(pic.scale.x) || !Number.isFinite(pic.scale.y) ||
                Math.abs(pic.scale.x) < 0.01 || Math.abs(pic.scale.y) < 0.01) {
                return false;
            }
            if (this.isTouchPosInFrameWindow(x, y)) {
                return true;
            }
            const screenX = this.getTouchScreenX(x);
            const screenY = this.getTouchScreenY(y);
            if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) {
                return false;
            }
            const dx  = screenX - pic.x;
            const dy  = screenY - pic.y;
            const sin = Math.sin(-pic.rotation);
            const cos = Math.cos(-pic.rotation);
            const bx = Math.floor(dx * cos + dy * -sin) / pic.scale.x + pic.anchor.x * pic.width;
            const by = Math.floor(dx * sin + dy * cos) / pic.scale.y + pic.anchor.y * pic.height;
            if (!Number.isFinite(bx) || !Number.isFinite(by)) {
                return false;
            }
            const preference = $gameScreen.getPicturePreference(this._pictureId);
            // [扩展] 视频图片(MoviePicture.js)的 bitmap 是视频纹理，getAlphaPixel 读不到像素，
            //   会被误判为全透明而无法遮挡。非 alpha 视频按整块包围盒视为不透明。
            const gamePic = pic.picture && pic.picture();
            const isOpaqueVideo = gamePic && gamePic.isVideo && gamePic.isVideo() &&
                !(gamePic.isVideoUseAlpha && gamePic.isVideoUseAlpha());
            if (pic._apngSprite || preference?.includeOpacityZero || isOpaqueVideo) {
                return bx >= 0 && by >= 0 && bx <= pic.bitmap.width && by <= pic.bitmap.height;
            }
            const frame = pic._frame || new Rectangle(0, 0, pic.bitmap.width, pic.bitmap.height);
            const pixelX = Math.floor(bx + frame.x);
            const pixelY = Math.floor(by + frame.y);
            if (!Number.isFinite(pixelX) || !Number.isFinite(pixelY) ||
                bx < 0 || by < 0 || bx >= frame.width || by >= frame.height) {
                return false;
            }
            return pic.bitmap.getAlphaPixel(pixelX, pixelY) !== 0;
        }

        // [扩展] 指针处是否被“渲染在本图片之上、且可见”的图片的不透明像素遮挡。
        //   _pictureContainer 的子节点按图片号升序排列，索引更大者渲染在更上层。
        isOccludedAt(x = TouchInput.x, y = TouchInput.y) {
            const spriteset = SceneManager._scene && SceneManager._scene._spriteset;
            const container = spriteset && spriteset._pictureContainer;
            if (!container) {
                return false;
            }
            const children = container.children;
            const myIndex  = children.indexOf(this._picture);
            if (myIndex < 0) {
                return false;
            }
            for (let i = myIndex + 1; i < children.length; i++) {  // 仅检查在本图片之上的图片
                const sprite = children[i];
                if (!sprite || !sprite._touch) continue;
                if (!sprite.visible || sprite.opacity <= 0) continue;  // 不可见/全透明的不构成遮挡
                if (sprite._touch.isPointInOpaque(x, y)) {  // 复用原始命中判定，避免递归
                    return true;
                }
            }
            return false;
        }

        // for DTextPicture.js
        isTouchPosInFrameWindow(x, y) {
            if (!this._picture._frameWindow) {
                return false;
            }
            const frame = this._picture._frameWindow;
            const sx    = this.getTouchScreenX(x);
            const sy    = this.getTouchScreenY(y);
            return frame.x <= sx && frame.x + frame.width >= sx &&
                frame.y <= sy && frame.y + frame.height >= sy;
        }

        isTouchEvent(triggerFunc) {
            return triggerFunc.call(TouchInput) && this.isOnPicturePos();
        }

        getTouchScreenX(x) {
            return $gameScreen.disConvertPositionX(x);
        }

        getTouchScreenY(y) {
            return $gameScreen.disConvertPositionY(y);
        }
    }

    function isLegacyTouchSuppressEnabled() {
        return param.LegacySuppressTouchSwitch > 0 ?
            $gameSwitches.value(param.LegacySuppressTouchSwitch) :
            !!param.LegacySuppressTouch;
    }

    //=============================================================================
    // Input
    //  ピクチャクリックをキー入力に紐付けます。
    //=============================================================================
    Input._bindKeyStateFrames = new Map();
    Input.bindKeyState        = function(name) {
        this._currentState[name] = true;
        this._bindKeyStateFrames.set(name, 5);
    };

    const _Input_update = Input.update;
    Input.update        = function() {
        _Input_update.apply(this, arguments);
        this._updateBindKeyState();
    };

    Input._updateBindKeyState = function() {
        this._bindKeyStateFrames.forEach(function(frame, keyName) {
            frame--;
            if (frame === 0 || !this._currentState[keyName]) {
                this._currentState[keyName] = false;
                this._bindKeyStateFrames.delete(keyName);
            } else {
                this._bindKeyStateFrames.set(keyName, frame);
            }
        }, this);
    };

    //=============================================================================
    // TouchInput
    //  ホイールクリック、ダブルクリック等を実装
    //=============================================================================
    TouchInput._pressedDistance = 0;
    TouchInput._prevX = -1;
    TouchInput._prevY = -1;

    // 起点直接复用 _triggerX / _triggerY；这里只记录多指使本次长按作废。
    // 不在 touchend 时恢复：松开其中一指不能让剩余触点重新获得长按资格。
    const _TouchInput_clear = TouchInput.clear;
    TouchInput.clear = function() {
        _TouchInput_clear.apply(this, arguments);
        this._pictureLongPressBlocked = false;
    };

    const _TouchInput_onTouchStart = TouchInput._onTouchStart;
    TouchInput._onTouchStart = function(event) {
        if (event.touches.length >= 2) this._pictureLongPressBlocked = true;
        _TouchInput_onTouchStart.apply(this, arguments);
    };

    Object.defineProperty(TouchInput, 'pressedDistance', {
        get() {
            return this._pressedDistance || 0;
        },
        configurable: true
    });

    const _TouchInput__createNewState = TouchInput._createNewState;
    TouchInput._createNewState        = function() {
        const state           = _TouchInput__createNewState.apply(this, arguments);
        state.wheelTriggered  = false;
        state.doubleTriggered = false;
        return state;
    };

    TouchInput.requestSuppress = function() {
        this._requestSuppress = true;
    };

    TouchInput.suppressIfNeed = function() {
        if (this._requestSuppress) {
            this._currentState = this._createNewState();
            this._requestSuppress = false;
        }
    };

    TouchInput.isWheelTriggered = function() {
        return this._currentState.wheelTriggered;
    };

    TouchInput.isDoubleTriggered = function() {
        return this._currentState.doubleTriggered;
    };

    TouchInput.createFlickData = function() {
        if (!this.isPressed()) {
            return null;
        }
        const data    = {}
        const dx      = this._x - this._triggerX;
        const dy      = this._y - this._triggerY;
        data.distance = Math.round(Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)));
        data.time     = this._pressedTime;
        data.degree   = Math.round((Math.atan2(dy, -dx) + Math.PI) * 180 / Math.PI);
        data.start    = new Point(this._triggerX, this._triggerY);
        data.end      = new Point(this._x, this._y);
        return data;
    };

    const _TouchInput_onMiddleButtonDown = TouchInput._onMiddleButtonDown;
    TouchInput._onMiddleButtonDown       = function(event) {
        _TouchInput_onMiddleButtonDown.apply(this, arguments);
        const x = Graphics.pageToCanvasX(event.pageX);
        const y = Graphics.pageToCanvasY(event.pageY);
        if (Graphics.isInsideCanvas(x, y)) {
            this._newState.wheelTriggered = true;
        }
    };

    const _TouchInput_onTrigger = TouchInput._onTrigger;
    TouchInput._onTrigger       = function(x, y) {
        const prevDate = this._date;
        this._pictureLongPressBlocked = false;
        this._pressedDistance = 0;
        this._prevX = x;
        this._prevY = y;
        _TouchInput_onTrigger.apply(this, arguments);
        if (this._date - prevDate < 300) {
            this._newState.doubleTriggered = true;
        }
    };

    const _TouchInput_onMove = TouchInput._onMove;
    TouchInput._onMove = function(x, y) {
        if (this.isPressed() && this._prevX >= 0 && this._prevY >= 0) {
            const dx = x - this._prevX;
            const dy = y - this._prevY;
            this._pressedDistance = Math.sqrt(dx * dx + dy * dy);
        }
        this._prevX = x;
        this._prevY = y;
        _TouchInput_onMove.apply(this, arguments);
    };

    const _TouchInput_onRelease = TouchInput._onRelease;
    TouchInput._onRelease = function(x, y) {
        this._pressedDistance = 0;
        this._prevX = x;
        this._prevY = y;
        _TouchInput_onRelease.apply(this, arguments);
    };
})();

//=============================================================================
// Loading bitmap flicker guard
// 旧MV魔改：图片 bitmap 还在加载时，尽量维持已有纹理渲染，避免闪烁。
//=============================================================================
(() => {
    'use strict';

    if (Sprite.prototype._renderCanvas) {
        const _Sprite_renderCanvas = Sprite.prototype._renderCanvas;
        Sprite.prototype._renderCanvas = function(renderer) {
            _Sprite_renderCanvas.apply(this, arguments);
            if (this.isExistLoadingBitmap && this.isExistLoadingBitmap() && this._renderCanvas_PIXI) {
                this._renderCanvas_PIXI(renderer);
            }
        };
    }

    if (Sprite.prototype._renderWebGL) {
        const _Sprite_renderWebGL = Sprite.prototype._renderWebGL;
        Sprite.prototype._renderWebGL = function(renderer) {
            _Sprite_renderWebGL.apply(this, arguments);
            if (!this.isExistLoadingBitmap || !this.isExistLoadingBitmap()) {
                return;
            }
            if (this._isPicture && renderer.plugins && renderer.plugins.picture) {
                if (this._speedUpCustomBlendModes) {
                    this._speedUpCustomBlendModes(renderer);
                }
                renderer.setObjectRenderer(renderer.plugins.picture);
                if (!this.isVideoPicture || !this.isVideoPicture()) {
                    renderer.plugins.picture.render(this);
                }
            } else if (renderer.plugins && renderer.plugins.sprite) {
                renderer.setObjectRenderer(renderer.plugins.sprite);
                renderer.plugins.sprite.render(this);
            }
        };
    }

    Sprite.prototype.isExistLoadingBitmap = function() {
        if (!this.bitmap || this.bitmap.isReady()) {
            return false;
        }
        return !!(this.bitmap._image || this.bitmap.__canvas || this.bitmap._canvas);
    };
})();
