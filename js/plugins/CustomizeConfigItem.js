//=============================================================================
// CustomizeConfigItem.js
// ----------------------------------------------------------------------------
// (C) 2015 Triacontane
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 2.4.1-local 2026/09/14 选中设置项增加可点击的左右调节箭头
// 2.4.0 2023/02/16 スクリプトで現在の設定値を取得できるよう修正
// 2.3.0 2021/12/21 項目に余白を設定できる機能を追加
// 2.2.1 2021/08/05 セーブがある状態で隠し項目を追加した時に上手く動作しない問題を修正(by柊菜緒さま)
// 2.2.0 2021/03/09 スクリプトが指定されているときに項目決定すると決定SEを演奏するよう修正
// 2.1.2 2020/10/13 Mano_InputConfig.jsと併用したとき、項目を末尾以外に追加すると表示不整合が発生する競合を修正
// 2.1.0 2017/12/15 追加項目のデフォルト項目を含めた並び順を自由に設定できる機能を追加
//                  項目名称を日本語化
// 2.0.1 2017/10/15 2.0.0の修正によりスイッチ項目を有効にしたときにゲーム開始するとエラーになる問題を修正
// 2.0.0 2017/09/10 ツクールの型指定機能に対応し、各オプション項目を任意の数だけ追加できる機能を追加
// 1.2.3 2017/06/08 1.2.2の修正により起動できなくなっていた問題を修正
// 1.2.2 2017/05/27 競合の可能性のある記述（Objectクラスへのプロパティ追加）をリファクタリング
// 1.2.1 2016/12/08 1.2.0の機能追加以降、デフォルト項目で決定ボタンを押すとエラーになっていた現象を修正
// 1.2.0 2016/12/02 各項目で決定ボタンを押したときに実行されるスクリプトを設定できる機能を追加
// 1.1.1 2016/08/14 スイッチ項目、音量項目の初期値が無効になっていた問題を修正
// 1.1.0 2016/04/29 項目をクリックしたときに項目値が循環するよう修正
// 1.0.0 2016/01/17 初版
// ----------------------------------------------------------------------------
// [Blog]   : http://triacontane.blogspot.jp/
// [Twitter]: https://twitter.com/triacontane/
// [GitHub] : https://github.com/triacontane/
//=============================================================================

/*:
 * @plugindesc オプション任意項目作成プラグイン
 * @author トリアコンタン
 *
 * @param 数値項目
 * @desc 追加する数値項目のオプション項目情報です。
 * @default
 * @type struct<NumberData>[]
 *
 * @param 文字項目
 * @desc 追加する文字項目のオプション項目情報です。
 * @default
 * @type struct<StringData>[]
 *
 * @param スイッチ項目
 * @desc 追加するスイッチ項目のオプション項目情報です。
 * @default
 * @type struct<BooleanData>[]
 *
 * @param 音量項目
 * @desc 追加する音量項目のオプション項目情報です。
 * @default
 * @type struct<VolumeData>[]
 *
 * @help オプション画面に任意の項目を追加します。
 *
 * 选中的数值、音量项两侧显示 ◂ ▸，点击等同于左右方向键。
 * 左侧减小，右侧增大；到达上下限不循环。点击数值项本身只选中。
 * 开关项不显示箭头，仍可直接点击切换；键盘操作保持原样。
 * 执行脚本的文字入口（例如游戏指南、语言）不显示新箭头。
 * 箭头点击区域宽度、间距和字号可在文件末尾 configArrow 常量处调整。
 * 脚本按参数原始 Name 修改设置值：
 * ConfigManager.setCustomParam('Language', ConfigManager.language);
 * 此接口仅赋值；保存、游戏变量同步仍由调用方按原流程执行。
 * 項目の種類は、以下の四種類があります。
 * 不要な項目は値を空に設定してください。
 *
 * ・スイッチ項目：
 * ON/OFFを選択する項目です。指定した番号のスイッチと値が同期されます。
 * オプションから値を設定すれば、それがスイッチに反映され、
 * スイッチを変更すれば、オプションの値に反映されます。
 * さらに、値はセーブデータ間で共有されます。
 * 隠しフラグを設定すると、オプション画面に表示されなくなります。
 * ゲームを進めないと出現しない項目などに利用できます。
 * 隠しフラグはプラグインコマンドから解除できます。
 *
 * スクリプトは上級者向け項目です。対象にカーソルを合わせて決定ボタンを
 * 押下すると指定したJavaScriptを実行できます。
 * 主に専用の設定画面などの遷移に使用します。
 *
 * ・数値項目：
 * 数値を選択する項目です。指定した番号の変数と値が同期されます。
 * スイッチ項目で指定した内容に加えて、
 * 最小値と最大値および一回の入力で変化する値を指定します。
 *
 * ・音量項目：
 * 音量を選択する項目です。BGMボリュームなどと同じ仕様で
 * キャラクターごとのボイス音量等に使ってください。
 *
 * ・文字項目：
 * 文字を選択する項目です。指定した文字の配列から項目を選択します。
 * 選択した文字のインデックス(開始位置は0)が変数に設定されます。
 * 初期値に設定する値もインデックスです。
 *
 * プラグインコマンド詳細
 *  イベントコマンド「プラグインコマンド」から実行。
 *  （パラメータの間は半角スペースで区切る）
 *
 *  CC_UNLOCK or
 *  オプション任意項目の隠し解除 [項目名]
 *  　指定した項目の隠しフラグを解除します。
 *  使用例：CC_UNLOCK 数値項目1
 *
 *  CC_LOCK or
 *  オプション任意項目の隠し設定 [項目名]
 *  　指定した項目の隠しフラグを設定します。
 *  使用例：CC_LOCK 数値項目1
 *
 * 利用規約：
 *  作者に無断で改変、再配布が可能で、利用形態（商用、18禁利用等）
 *  についても制限はありません。
 *  このプラグインはもうあなたのものです。
 */

/*~struct~NumberData:
 * @param Name
 * @text 項目名称
 * @desc 項目の名称です。
 * @default 数値項目1
 *
 * @param DefaultValue
 * @text 初期値
 * @desc 項目の初期値です。
 * @default 0
 * @type number
 *
 * @param VariableID
 * @text 変数番号
 * @desc 項目の設定内容が格納される変数番号です。
 * @default 0
 * @type variable
 *
 * @param HiddenFlag
 * @text 隠しフラグ
 * @desc 項目がデフォルトで隠されるようになります。プラグインコマンドの実行で表示されます。
 * @default false
 * @type boolean
 *
 * @param Script
 * @text スクリプト
 * @desc 項目を決定したときに実行されるスクリプトです。
 * @default
 *
 * @param NumberMin
 * @text 最小値
 * @desc 項目の最小値です。
 * @default 0
 * @type number
 *
 * @param NumberMax
 * @text 最大値
 * @desc 項目の最大値です。
 * @default 100
 * @type number
 *
 * @param NumberStep
 * @text 変化値
 * @desc 項目を操作したときの数値の変化量です。
 * @default 20
 * @type number
 *
 * @param AddPosition
 * @text 追加位置
 * @desc 項目を追加する位置です。指定した項目の上に追加されます。
 * @default
 * @type select
 * @option 末尾に追加
 * @value
 * @option 常時ダッシュ
 * @value alwaysDash
 * @option コマンド記憶
 * @value commandRemember
 * @option BGM 音量
 * @value bgmVolume
 * @option BGS 音量
 * @value bgsVolume
 * @option ME 音量
 * @value meVolume
 * @option SE 音量
 * @value seVolume
 *
 * @param PaddingTop
 * @text 余白
 * @desc 項目の上の余白ピクセル数です。項目の間隔を開けたいときに指定します。
 * @default 0
 * @type number
 */
/*~struct~BooleanData:
 * @param Name
 * @text 項目名称
 * @desc 項目の名称です。
 * @default スイッチ項目1
 *
 * @param DefaultValue
 * @text 初期値
 * @desc 項目の初期値です。
 * @default false
 * @type boolean
 *
 * @param SwitchID
 * @text スイッチ番号
 * @desc 項目の設定内容が格納されるスイッチ番号です。
 * @default 0
 * @type switch
 *
 * @param HiddenFlag
 * @text 隠しフラグ
 * @desc 項目がデフォルトで隠されるようになります。プラグインコマンドの実行で表示されます。
 * @default false
 * @type boolean
 *
 * @param Script
 * @text スクリプト
 * @desc 項目を決定したときに実行されるスクリプトです。
 * @default
 *
 * @param AddPosition
 * @text 追加位置
 * @desc 項目を追加する位置です。指定した項目の上に追加されます。
 * @default
 * @type select
 * @option 末尾に追加
 * @value
 * @option 常時ダッシュ
 * @value alwaysDash
 * @option コマンド記憶
 * @value commandRemember
 * @option BGM 音量
 * @value bgmVolume
 * @option BGS 音量
 * @value bgsVolume
 * @option ME 音量
 * @value meVolume
 * @option SE 音量
 * @value seVolume
 *
 * @param PaddingTop
 * @text 余白
 * @desc 項目の上の余白ピクセル数です。項目の間隔を開けたいときに指定します。
 * @default 0
 * @type number
 */
/*~struct~StringData:
 * @param Name
 * @text 項目名称
 * @desc 項目の名称です。
 * @default 文字列項目1
 *
 * @param DefaultValue
 * @text 初期値
 * @desc 項目の初期値です。インデックスの数値を指定します。
 * @default 0
 * @type number
 *
 * @param VariableID
 * @text 変数番号
 * @desc 項目の設定内容が格納される変数番号です。
 * @default 0
 * @type variable
 *
 * @param HiddenFlag
 * @text 隠しフラグ
 * @desc 項目がデフォルトで隠されるようになります。プラグインコマンドの実行で表示されます。
 * @default false
 * @type boolean
 *
 * @param Script
 * @text スクリプト
 * @desc 項目を決定したときに実行されるスクリプトです。
 * @default
 *
 * @param StringItems
 * @text 内容の配列
 * @desc 項目の設定内容の配列です。
 * @default
 * @type string[]
 *
 * @param AddPosition
 * @text 追加位置
 * @desc 項目を追加する位置です。指定した項目の上に追加されます。
 * @default
 * @type select
 * @option 末尾に追加
 * @value
 * @option 常時ダッシュ
 * @value alwaysDash
 * @option コマンド記憶
 * @value commandRemember
 * @option BGM 音量
 * @value bgmVolume
 * @option BGS 音量
 * @value bgsVolume
 * @option ME 音量
 * @value meVolume
 * @option SE 音量
 * @value seVolume
 *
 * @param PaddingTop
 * @text 余白
 * @desc 項目の上の余白ピクセル数です。項目の間隔を開けたいときに指定します。
 * @default 0
 * @type number
 */
/*~struct~VolumeData:
 * @param Name
 * @text 項目名称
 * @desc 項目の名称です。
 * @default 音量項目1
 *
 * @param DefaultValue
 * @text 初期値
 * @desc 項目の初期値です。
 * @default 0
 * @type number
 *
 * @param VariableID
 * @text 変数番号
 * @desc 項目の設定内容が格納される変数番号です。
 * @default 0
 * @type variable
 *
 * @param HiddenFlag
 * @text 隠しフラグ
 * @desc 項目がデフォルトで隠されるようになります。プラグインコマンドの実行で表示されます。
 * @default false
 * @type boolean
 *
 * @param Script
 * @text スクリプト
 * @desc 項目を決定したときに実行されるスクリプトです。変数[value]で現在の選択値が参照できます。
 * @default
 *
 * @param AddPosition
 * @text 追加位置
 * @desc 項目を追加する位置です。指定した項目の上に追加されます。
 * @default
 * @type select
 * @option 末尾に追加
 * @value
 * @option 常時ダッシュ
 * @value alwaysDash
 * @option コマンド記憶
 * @value commandRemember
 * @option BGM 音量
 * @value bgmVolume
 * @option BGS 音量
 * @value bgsVolume
 * @option ME 音量
 * @value meVolume
 * @option SE 音量
 * @value seVolume
 *
 * @param PaddingTop
 * @text 余白
 * @desc 項目の上の余白ピクセル数です。項目の間隔を開けたいときに指定します。
 * @default 0
 * @type number
 */


(function() {
    'use strict';
    var pluginName = 'CustomizeConfigItem';

    var getParamString = function(paramNames) {
        var value = getParamOther(paramNames);
        return value == null ? '' : value;
    };

    var getParamOther = function(paramNames) {
        if (!Array.isArray(paramNames)) paramNames = [paramNames];
        for (var i = 0; i < paramNames.length; i++) {
            var name = PluginManager.parameters(pluginName)[paramNames[i]];
            if (name) return name;
        }
        return null;
    };

    var getParamArrayJson = function(paramNames, defaultValue) {
        var value = getParamString(paramNames) || null;
        try {
            value = JSON.parse(value);
            if (value === null) {
                value = defaultValue;
            } else {
                value = value.map(function(valueData) {
                    return JSON.parse(valueData);
                });
            }
        } catch (e) {
            alert(`!!!Plugin param is wrong.!!!\nPlugin:${pluginName}.js\nName:[${paramNames}]\nValue:${value}`);
            value = defaultValue;
        }
        return value;
    };

    var getCommandName = function(command) {
        return (command || '').toUpperCase();
    };

    var getArgNumber = function(arg, min, max) {
        if (arguments.length < 2) min = -Infinity;
        if (arguments.length < 3) max = Infinity;
        return (parseInt(arg) || 0).clamp(min, max);
    };

    var getArgBoolean = function(arg) {
        return (arg || '').toUpperCase() === 'TRUE';
    };

    var getArgJson = function(arg, defaultValue) {
        try {
            arg = JSON.parse(arg || null);
            if (arg === null) {
                arg = defaultValue;
            }
        } catch (e) {
            alert(`!!!Plugin param is wrong.!!!\nPlugin:${pluginName}.js\nValue:${arg}`);
            arg = defaultValue;
        }
        return arg;
    };

    var iterate = function(that, handler) {
        Object.keys(that).forEach(function(key, index) {
            handler.call(that, key, that[key], index);
        });
    };

    //=============================================================================
    // パラメータの取得と整形
    //=============================================================================
    var param           = {};
    param.numberOptions = getParamArrayJson(['NumberOptions', '数値項目'], []);
    param.stringOptions = getParamArrayJson(['StringOptions', '文字項目'], []);
    param.switchOptions = getParamArrayJson(['SwitchOptions', 'スイッチ項目'], []);
    param.volumeOptions = getParamArrayJson(['VolumeOptions', '音量項目'], []);

    var localOptionWindowIndex = 0;

    //=============================================================================
    // Game_Interpreter
    //  プラグインコマンドを追加定義します。
    //=============================================================================
    var _Game_Interpreter_pluginCommand      = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        this.pluginCommandCustomizeConfigItem(command, args);
    };

    Game_Interpreter.prototype.pluginCommandCustomizeConfigItem = function(command, args) {
        switch (getCommandName(command)) {
            case 'CC_UNLOCK' :
            case 'オプション任意項目の隠し解除' :
                ConfigManager.customParamUnlock(args[0]);
                break;
            case 'CC_LOCK' :
            case 'オプション任意項目の隠し設定' :
                ConfigManager.customParamLock(args[0]);
                break;
        }
    };

    //=============================================================================
    // ConfigManager
    //  追加項目の設定値や初期値を管理します。
    //=============================================================================
    ConfigManager.customParams   = null;
    ConfigManager.hiddenInfo     = {};
    ConfigManager._symbolNumber  = 'Number';
    ConfigManager._symbolBoolean = 'Boolean';
    ConfigManager._symbolString  = 'String';
    ConfigManager._symbolVolume  = 'Volume';

    ConfigManager.getCustomParams = function() {
        if (this.customParams) {
            return this.customParams;
        }
        this.customParams = {};
        param.numberOptions.forEach(function(optionItem, index) {
            this.makeNumberOption(optionItem, index);
        }, this);
        param.stringOptions.forEach(function(optionItem, index) {
            this.makeStringOption(optionItem, index);
        }, this);
        param.switchOptions.forEach(function(optionItem, index) {
            this.makeSwitchOption(optionItem, index);
        }, this);
        param.volumeOptions.forEach(function(optionItem, index) {
            this.makeVolumeOption(optionItem, index);
        }, this);
        return this.customParams;
    };

    ConfigManager.makeNumberOption = function(optionItem, index) {
        var data    = this.makeCommonOption(optionItem, index, this._symbolNumber);
        data.min    = getArgNumber(optionItem.NumberMin);
        data.max    = getArgNumber(optionItem.NumberMax);
        data.offset = getArgNumber(optionItem.NumberStep);
        this.pushOptionData(data);
    };

    ConfigManager.makeStringOption = function(optionItem, index) {
        var data    = this.makeCommonOption(optionItem, index, this._symbolString);
        data.values = getArgJson(optionItem.StringItems, ['no item']);
        data.min    = 0;
        data.max    = data.values.length - 1;
        this.pushOptionData(data);
    };

    ConfigManager.makeSwitchOption = function(optionItem, index) {
        var data       = this.makeCommonOption(optionItem, index, this._symbolBoolean);
        data.initValue = getArgBoolean(optionItem.DefaultValue);
        data.variable  = getArgNumber(optionItem.SwitchID);
        this.pushOptionData(data);
    };

    ConfigManager.makeVolumeOption = function(optionItem, index) {
        var data = this.makeCommonOption(optionItem, index, this._symbolVolume);
        this.pushOptionData(data);
    };

    ConfigManager.makeCommonOption = function(optionItem, index, type) {

	// 重置系统语言标记
        var lang = ConfigManager.language;
        //var nav = navigator.language.toLowerCase();
        //if (nav.startsWith('zh'))      lang = 0;
        //else if (nav.startsWith('ja')) lang = 1;

		
        var data       = {};
        data.symbol    = `${type}${index + 1}`;
        data.optionName = optionItem.Name;
		data.name      = optionItem.Name;
		if (window.systemFeatureText) {			
		let textArray  = window?.systemFeatureText?.[String(optionItem?.Name)];
		  if (textArray)  {
            data.name  = textArray.join('');
		  }
		}
        data.hidden    = getArgBoolean(optionItem.HiddenFlag);
        data.script    = optionItem.Script;
        data.initValue = getArgNumber(optionItem.DefaultValue);
        data.variable  = getArgNumber(optionItem.VariableID, 0);
        data.addPotion = optionItem.AddPosition;
        data.padding   = getArgNumber(optionItem.PaddingTop);
        return data;
    };

    ConfigManager.pushOptionData = function(data) {
        this.customParams[data.symbol] = data;
    };

    // 按原始 Name 定位，避免参数排序、删除或显示语言变化后写错设置项。
    ConfigManager.setCustomParam = function(optionName, value) {
        const item = Object.values(this.getCustomParams()).find(item => item.optionName === optionName);
        if (!item) throw new Error(`CustomizeConfigItem: unknown option Name "${optionName}"`);
        this[item.symbol] = value;
    };

    var _ConfigManager_makeData = ConfigManager.makeData;
    ConfigManager.makeData      = function() {
        var config        = _ConfigManager_makeData.apply(this, arguments);
        config.hiddenInfo = {};
        iterate(this.getCustomParams(), function(symbol) {
            config[symbol]            = this[symbol];
            config.hiddenInfo[symbol] = this.hiddenInfo[symbol];
        }.bind(this));
        return config;
    };

    var _ConfigManager_applyData = ConfigManager.applyData;
    ConfigManager.applyData      = function(config) {
        _ConfigManager_applyData.apply(this, arguments);
        iterate(this.getCustomParams(), function(symbol, item) {
            if (symbol.contains(this._symbolBoolean)) {
                this[symbol] = this.readFlagCustom(config, symbol, item);
            } else if (symbol.contains(this._symbolVolume)) {
                this[symbol] = this.readVolumeCustom(config, symbol, item);
            } else {
                this[symbol] = this.readOther(config, symbol, item);
            }
            if (config.hiddenInfo) {
                this.hiddenInfo[symbol] = (typeof config.hiddenInfo[symbol] === 'boolean' ? config.hiddenInfo[symbol] : item.hidden);
            } else {
                this.hiddenInfo[symbol] = item.hidden;
            }
        }.bind(this));
    };

    ConfigManager.customParamUnlock = function(name) {
        iterate(this.getCustomParams(), function(symbol, item) {
            if (item.name === name) this.hiddenInfo[symbol] = false;
        }.bind(this));
        this.save();
    };

    ConfigManager.customParamLock = function(name, needSave = false) {
        iterate(this.getCustomParams(), function(symbol, item) {
            if (item.name === name) this.hiddenInfo[symbol] = true;
        }.bind(this));
        if (needSave) this.save();
    };

    ConfigManager.readOther = function(config, name, item) {
        var value = config[name];
        if (value !== undefined) {
            return Number(value).clamp(item.min, item.max);
        } else {
            return item.initValue;
        }
    };

    ConfigManager.readFlagCustom = function(config, name, item) {
        if (config[name] !== undefined) {
            return this.readFlag(config, name);
        } else {
            return item.initValue;
        }
    };

    ConfigManager.readVolumeCustom = function(config, name, item) {
        if (config[name] !== undefined) {
            return this.readVolume(config, name);
        } else {
            return item.initValue;
        }
    };

    ConfigManager.exportCustomParams = function() {
        if (!$gameVariables || !$gameSwitches) return;
        iterate(this.getCustomParams(), function(symbol, item) {
            if (item.variable > 0) {
                if (symbol.contains(this._symbolBoolean)) {
                    $gameSwitches.setValue(item.variable, !!this[symbol]);
                } else {
                    $gameVariables.setValue(item.variable, this[symbol]);
                }
            }
        }.bind(this));
    };

	ConfigManager.importCustomParams = function() {
	  if (!$gameVariables || !$gameSwitches) return;

	  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

	  iterate(this.getCustomParams(), function(symbol, item) {
		if (!item || item.variable <= 0) return;

		if (String(symbol).includes(this._symbolBoolean)) {
		  this[symbol] = $gameSwitches.value(item.variable);
		  return;
		}

		const raw = Number($gameVariables.value(item.variable));
		const val = Number.isFinite(raw) ? raw : 0;

		if (String(symbol).includes(this._symbolVolume)) {
		  this[symbol] = clamp(val, 0, 100);
		} else {
		  const min = Number(item.min);
		  const max = Number(item.max);
		  this[symbol] = clamp(val, Number.isFinite(min) ? min : 0, Number.isFinite(max) ? max : 0);
		}
	  }.bind(this));
	};

    var _ConfigManager_save = ConfigManager.save;
    ConfigManager.save      = function() {
        _ConfigManager_save.apply(this, arguments);
        this.exportCustomParams();
    };

    //=============================================================================
    // Game_Map
    //  リフレッシュ時にオプション値を同期します。
    //=============================================================================
    var _Game_Map_refresh      = Game_Map.prototype.refresh;
    Game_Map.prototype.refresh = function() {
        _Game_Map_refresh.apply(this, arguments);
        ConfigManager.importCustomParams();
    };

    //=============================================================================
    // DataManager
    //  セーブ時とロード時にオプション値を同期します。
    //=============================================================================
    var _DataManager_setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame      = function() {
        _DataManager_setupNewGame.apply(this, arguments);
        ConfigManager.exportCustomParams();
    };

    var _DataManager_loadGameWithoutRescue = DataManager.loadGameWithoutRescue;
    DataManager.loadGameWithoutRescue      = function(savefileId) {
        var result = _DataManager_loadGameWithoutRescue.apply(this, arguments);
        ConfigManager.exportCustomParams();
        return result;
    };

    //=============================================================================
    // Window_Options
    //  追加項目を描画します。
    //=============================================================================
    var _Window_Options_initialize      = Window_Options.prototype.initialize;
    Window_Options.prototype.initialize = function() {
        this._customParams = ConfigManager.getCustomParams();
        _Window_Options_initialize.apply(this, arguments);
        const maxItems = this.maxItems();
        const savedIndex = localOptionWindowIndex;
        // 选项删减或隐藏后，旧位置可能失效；无效时恢复到默认第一项。
        const index = Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < maxItems
            ? savedIndex : (maxItems > 0 ? 0 : -1);
        this.select(index);
        localOptionWindowIndex = 0;
    };

    var _Window_Options_itemRect = Window_Options.prototype.itemRect;
    Window_Options.prototype.itemRect = function(index) {
        var rect = _Window_Options_itemRect.apply(this, arguments);
        rect.y += this.findAdditionalHeight(index);
        return rect;
    };

    Window_Options.prototype.findAdditionalHeight = function(index) {
        return this._list.reduce(function(prev, item, itemIndex) {
            return prev + (itemIndex <= index && item.ext ? item.ext : 0);
        }, 0);
    };

    var _Window_Options_makeCommandList      = Window_Options.prototype.makeCommandList;
    Window_Options.prototype.makeCommandList = function() {
        _Window_Options_makeCommandList.apply(this, arguments);
        this.addCustomOptions();
    };

    Window_Options.prototype.addCustomOptions = function() {
        let bottomItems = [];
        iterate(this._customParams, function(key, item) {
            // 使用本地化前的参数名称，避免选项排序或显示语言改变后控制错项。
            switch (item.optionName) {
                case 'ZakoMode':
                    ConfigManager.hiddenInfo[key] = $gameParty?.leader()?._classId !== 3;
                    break;
                case 'FPSDisplay':
                    ConfigManager.hiddenInfo[key] = !Utils?.isMobileDevice?.();
                    break;
                case 'LockedFPS':
                    // 清除旧索引逻辑误写的显示状态，恢复该项参数中的隐藏设置。
                    ConfigManager.hiddenInfo[key] = item.hidden;
                    break;
            }
            if (!ConfigManager.hiddenInfo[key]) {
                if (item.addPotion === '__bottom__') {
                    bottomItems.push({ key: key, item: item });
                    return;
                }                
                this.addCommand(item.name, key, undefined, item.padding);
                if (item.addPotion) {
                    this.shiftCustomOptions(item.addPotion);
                }
            }
        }.bind(this));
        bottomItems.forEach(function(entry) {
            this.addCommand(entry.item.name, entry.key, undefined, entry.item.padding);
        }.bind(this));        
    };

    Window_Options.prototype.shiftCustomOptions = function(addPotion) {
        var targetCommand = this._list.filter(function(command) {
            return command.symbol === addPotion;
        })[0];
        if (!targetCommand) {
            return;
        }
        var targetIndex = this._list.indexOf(targetCommand);
        var newCommand = this._list.pop();
        this.addIndexForManoInputConfig(targetIndex);
        this._list.splice(targetIndex, 0, newCommand);
    };

    Window_Options.prototype.addIndexForManoInputConfig = function(index) {
        if (this._gamepadOptionIndex > index) {
            this._gamepadOptionIndex += 1;
        }
        if (this._keyboardConfigIndex > index) {
            this._keyboardConfigIndex += 1;
        }
    };

    var _Window_Options_statusText      = Window_Options.prototype.statusText;
    Window_Options.prototype.statusText = function(index) {
        var result = _Window_Options_statusText.apply(this, arguments);
        var symbol = this.commandSymbol(index);
        var value  = this.getConfigValue(symbol);
        if (this.isNumberSymbol(symbol)) {
            result = this.numberStatusText(value);
        } else if (this.isStringSymbol(symbol)) {
            result = this.stringStatusText(value, symbol);
        }
        return result;
    };

    Window_Options.prototype.isNumberSymbol = function(symbol) {
        return symbol.contains(ConfigManager._symbolNumber);
    };

    Window_Options.prototype.isStringSymbol = function(symbol) {
        return symbol.contains(ConfigManager._symbolString);
    };

    Window_Options.prototype.isCustomSymbol = function(symbol) {
        return !!this._customParams[symbol];
    };

    Window_Options.prototype.numberStatusText = function(value) {
        return value;
    };

    Window_Options.prototype.stringStatusText = function(value, symbol) {
        return this._customParams[symbol].values[value];
    };

    var _Window_Options_processOk      = Window_Options.prototype.processOk;
    Window_Options.prototype.processOk = function() {
        if (!this._shiftValue(1, true)) _Window_Options_processOk.apply(this, arguments);
        this.execScript();
    };

    var _Window_Options_cursorRight      = Window_Options.prototype.cursorRight;
    Window_Options.prototype.cursorRight = function(wrap) {
        if (!this._shiftValue(1, false)) _Window_Options_cursorRight.apply(this, arguments);
        this.execScript();
    };

    var _Window_Options_cursorLeft      = Window_Options.prototype.cursorLeft;
    Window_Options.prototype.cursorLeft = function(wrap) {
        if (!this._shiftValue(-1, false)) _Window_Options_cursorLeft.apply(this, arguments);
        this.execScript();
    };

    Window_Options.prototype._shiftValue = function(sign, loopFlg) {
        var symbol = this.commandSymbol(this.index());
        var value  = this.getConfigValue(symbol);
        if (this.isNumberSymbol(symbol)) {
            value += this.numberOffset(symbol) * sign;
            this.changeValue(symbol, this._clampValue(value, symbol, loopFlg));
            return true;
        }
        if (this.isStringSymbol(symbol)) {
            value += sign;
            this.changeValue(symbol, this._clampValue(value, symbol, loopFlg));
            return true;
        }
        return false;
    };
    // 执行自定义脚本
    Window_Options.prototype.execScript = function() {
        var symbol = this.commandSymbol(this.index());
        if (!this.isCustomSymbol(symbol)) return;
        var script = this._customParams[symbol].script;
        var value = this.getConfigValue(symbol);
        if (script) {
			ConfigManager.exportCustomParams();
            eval(script);
            SoundManager.playOk();
        }
        localOptionWindowIndex = this.index();
    };

    Window_Options.prototype._clampValue = function(value, symbol, loopFlg) {
        var maxValue = this._customParams[symbol].max;
        var minValue = this._customParams[symbol].min;
        if (loopFlg) {
            if (value > maxValue) value = minValue;
            if (value < minValue) value = maxValue;
        }
        return value.clamp(this._customParams[symbol].min, this._customParams[symbol].max);
    };

    Window_Options.prototype.numberOffset = function(symbol) {
        var value = this._customParams[symbol].offset;
        if (Input.isPressed('shift')) value *= 10;
        return value;
    };

    Window_Options.prototype.windowHeight = function() {
        var height = this.fittingHeight(Math.min(this.numVisibleRows(), 14));
        return height + this.findAdditionalHeight(this.maxItems());
    };
    // 选中项的触摸左右键。独立子精灵保留原有标题/数值排版，右键可位于窗口边缘外。
    const configArrowWidth = 72;          // 点击区域宽度；高度沿用当前行高（本工程为 68px）
    const configArrowGap = 0;             // 点击区域紧贴数值实际边缘，不追加空隙
    const configArrowFontSize = 24;       // 小箭头字形字号，与点击区域大小独立

    Window_Options.prototype.canShowConfigArrows = function() {
        const index = this.index();
        if (!Number.isInteger(index) || index < 0 || index >= this.maxItems() ||
            !this.isCommandEnabled(index)) return false;
        const symbol = this.commandSymbol(index);
        const item = this._customParams[symbol];
        // 指南、语言等执行脚本的文字项是入口，不能当作普通数值调节。
        if (this.isStringSymbol(symbol)) {
            return !!item && !item.script && item.values.length > 1;
        }
        return this.isVolumeSymbol(symbol) || this.isNumberSymbol(symbol);
    };

    Window_Options.prototype.configArrowLayout = function() {
        if (!this.visible || !this.isOpenAndActive() || !this.canShowConfigArrows()) return null;
        const index = this.index();
        const row = this.itemRect(index);
        const line = this.itemLineRect(index);
        const y = this.padding + row.y - this.origin.y;
        // 滚动到边缘时不显示越过内容区的按钮。
        if (y < this.padding || y + row.height > this.height - this.padding) return null;
        const right = this.padding + line.x + line.width - this.origin.x;
        // 原窗口数值右对齐；按当前字体测量实际宽度，使左箭头紧贴数值左缘。
        const status = String(this.statusText(index));
        const fontKey = [this.contents.fontFace, this.contents.fontSize,
            this.contents.fontBold, this.contents.fontItalic].join(':');
        const cache = this._configArrowText;
        if (!cache || cache.status !== status || cache.fontKey !== fontKey) {
            this._configArrowText = { status: status, fontKey: fontKey, width: this.textWidth(status) };
        }
        const statusWidth = Math.min(this._configArrowText.width, line.width);
        return {
            left: new Rectangle(right - statusWidth - configArrowGap - configArrowWidth,
                y, configArrowWidth, row.height),
            right: new Rectangle(right + configArrowGap, y, configArrowWidth, row.height)
        };
    };

    Window_Options.prototype.createConfigArrows = function() {
        this._configArrowSprites = ['◂', '▸'].map((text, index) => {
            const bitmap = new Bitmap(configArrowWidth, this.lineHeight());
            bitmap.fontFace = this.contents.fontFace;
            bitmap.fontSize = configArrowFontSize;
            bitmap.textColor = this.contents.textColor;
            bitmap.outlineColor = 'transparent';
            bitmap.outlineWidth = 0;
            // 字形贴近数值，72px 点击区域向外展开，不挤入数值文字区域。
            bitmap.drawText(text, 0, 0, bitmap.width, bitmap.height, index === 0 ? 'right' : 'left');
            const sprite = new Sprite(bitmap);
            sprite.visible = false;
            this.addChild(sprite);
            return sprite;
        });
    };

    Window_Options.prototype.updateConfigArrows = function() {
        if (!this._configArrowSprites) return;
        const layout = this.configArrowLayout();
        this._configArrowSprites.forEach((sprite, index) => {
            sprite.visible = !!layout;
            if (layout) {
                const rect = index === 0 ? layout.left : layout.right;
                sprite.x = rect.x;
                sprite.y = rect.y + (rect.height - sprite.bitmap.height) / 2;
            }
        });
    };

    Window_Options.prototype.hitConfigArrow = function() {
        const layout = this.configArrowLayout();
        if (!layout) return 0;
        const point = this.worldTransform.applyInverse(new Point(TouchInput.x, TouchInput.y));
        if (layout.left.contains(point.x, point.y)) return -1;
        if (layout.right.contains(point.x, point.y)) return 1;
        return 0;
    };

    Window_Options.prototype.processConfigArrow = function(direction) {
        if (!this.canShowConfigArrows()) return;
        if (direction < 0) {
            this.cursorLeft(false);
        } else {
            this.cursorRight(false);
        }
    };

    const _configArrowsInitialize = Window_Options.prototype.initialize;
    Window_Options.prototype.initialize = function() {
        _configArrowsInitialize.apply(this, arguments);
        this.createConfigArrows();
        this.updateConfigArrows();
    };

    const _configArrowsUpdate = Window_Options.prototype.update;
    Window_Options.prototype.update = function() {
        _configArrowsUpdate.apply(this, arguments);
        this.updateConfigArrows();
    };

    const _configArrowsOnTouchOk = Window_Options.prototype.onTouchOk;
    Window_Options.prototype.onTouchOk = function() {
        // 可用箭头调节的项：点击行或数值只选中，不再执行原来的循环增加。
        // 开关和脚本入口沿用原有点击行为；键盘操作不受影响。
        if (this.canShowConfigArrows()) return;
        _configArrowsOnTouchOk.apply(this, arguments);
    };

    const _configArrowsProcessTouch = Window_Options.prototype.processTouch;
    Window_Options.prototype.processTouch = function() {
        if (!this.isOpenAndActive()) {
            this._configArrowTouch = null;
            return _configArrowsProcessTouch.apply(this, arguments);
        }
        if (TouchInput.isTriggered()) {
            const direction = this.hitConfigArrow();
            this._configArrowTouch = direction ? {
                direction: direction,
                index: this.index(),
                symbol: this.commandSymbol(this.index())
            } : null;
        }
        const touch = this._configArrowTouch;
        if (touch) {
            if (TouchInput.isCancelled()) {
                this._configArrowTouch = null;
                return _configArrowsProcessTouch.apply(this, arguments);
            }
            if (TouchInput.isClicked()) {
                this._configArrowTouch = null;
                if (this.index() === touch.index && this.commandSymbol(this.index()) === touch.symbol &&
                    this.hitConfigArrow() === touch.direction) {
                    this.processConfigArrow(touch.direction);
                }
            } else if (!TouchInput.isPressed()) {
                this._configArrowTouch = null;
            }
            // 整次手势都由箭头消费，松手不再落入原来的 onTouchOk。
            return;
        }
        _configArrowsProcessTouch.apply(this, arguments);
    };

    const _configArrowsDestroy = Window_Options.prototype.destroy;
    Window_Options.prototype.destroy = function() {
        if (this._configArrowSprites) {
            this._configArrowSprites.forEach(sprite => sprite.bitmap.destroy());
            this._configArrowSprites = null;
        }
        _configArrowsDestroy.apply(this, arguments);
    };
})();
