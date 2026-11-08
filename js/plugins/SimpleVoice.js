//=============================================================================
// SimpleVoice.js
// ----------------------------------------------------------------------------
// (C)2017 Triacontane
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 2.1.2 2026/08/25 playVoiceにaudio/se読み込み用のisSEオプションを追加
// 2.1.1 2026/07/15 他プラグインによるSE音量更新でフェード曲線が上書きされる競合を修正
// 2.1.0 2026/07/15 SE/Voiceにスクリプト用のフェードイン・フェードアウト機能を追加
// 2.0.5 2025/02/24 config.rmmzsaveが存在しない状態でゲーム開始したとき、ボイス音量のデフォルト値が反映されない問題を修正
// 2.0.4 2024/11/12 オプションウィンドウの項目数をボイス音量の項目に合わせてひとつ追加
// 2.0.3 2023/07/27 サブフォルダを指定したボイス停止ができていなかった問題を修正
// 2.0.2 2022/02/19 ボイスファイルに制御文字\v[n]が指定できるよう修正
// 2.0.1 2021/05/16 サブフォルダを指定できるよう修正
// 2.0.0 2021/03/17 MZで動作するよう修正し、仕様を見直し
// 1.1.3 2020/04/15 1.1.2の修正で同時再生したボイスの停止が動作しない問題を修正
// 1.1.2 2020/04/08 異なるチャンネルで短い間隔で複数のボイスを再生した場合に、先に再生したボイスが演奏されない問題を修正
// 1.1.1 2019/01/22 イベント高速化で再生したとき、SV_STOP_VOICEが効かなくなる場合がある問題を修正
// 1.1.0 2017/07/16 ボイスのチャンネル指定機能を追加。同一チャンネルのボイスが同時再生されないようになります。
// 1.0.1 2017/06/26 英語表記のプラグインコマンドの指定方法を変更
// 1.0.0 2017/06/25 初版
// ----------------------------------------------------------------------------
// [Blog]   : https://triacontane.blogspot.jp/
// [Twitter]: https://twitter.com/triacontane/
// [GitHub] : https://github.com/triacontane/
//=============================================================================

/*:
 * @plugindesc 簡易ボイスプラグイン
 * @target MZ
 * @url https://github.com/triacontane/RPGMakerMV/tree/mz_master/SimpleVoice.js
 * @base PluginCommonBase
 * @author トリアコンタン
 *
 * @param optionName
 * @text オプション名称
 * @type string
 * @desc オプション画面に表示されるボイス音量の設定項目名称です。
 * @default ボイス 音量
 *
 * @param optionValue
 * @text オプション初期値
 * @type number
 * @desc ボイス音量の初期値です。
 * @default 100
 *
 * @param folderName
 * @text ボイスフォルダ
 * @type string
 * @desc audio配下のボイスフォルダ名です。MV版互換のため、この工程では voice を使用します。
 * @default voice
 *
 * @command PLAY_VOICE
 * @text ボイスの演奏
 * @desc ボイスを演奏します。
 *
 * @arg name
 * @text ファイル名称
 * @desc ボイスファイルの名称です。
 * @default
 * @type file
 * @dir audio/voice
 *
 * @arg volume
 * @text 音量
 * @desc ボイスファイルの音量
 * @default 90
 * @min 0
 * @max 100
 * @type number
 *
 * @arg pitch
 * @text ピッチ
 * @desc ボイスファイルのピッチ
 * @default 100
 * @type number
 *
 * @arg pan
 * @text 左右バランス
 * @desc ボイスファイルの左右バランス
 * @default 0
 * @min -100
 * @max 100
 * @type number
 *
 * @arg channel
 * @text チャンネル番号
 * @desc チャンネル番号です。同一のチャンネル番号のボイスは重なって演奏されなくなります。
 * @default 0
 * @type number
 *
 * @arg loop
 * @text ループ有無
 * @desc ボイスの再生をループするかどうかです。
 * @default false
 * @type boolean
 *
 * @arg isSE
 * @text SEフォルダを使用
 * @desc trueの場合はaudio/voiceではなくaudio/seから読み込み、SE音量を使用します。
 * @default false
 * @type boolean
 *
 * @command STOP_VOICE
 * @text ボイスの停止
 * @desc 演奏中のボイスを停止します。ファイルを直接指定するかチャンネル番号を指定して停止します。
 *
 * @arg name
 * @text ファイル名称
 * @desc 停止するボイスファイルの名称です。
 * @default
 * @type file
 * @dir audio/voice
 *
 * @arg channel
 * @text チャンネル番号
 * @desc 停止するボイスのチャンネル番号です。
 * @default 0
 * @type number
 *
 * @help SimpleVoice.js
 *
 * 簡易的なボイス演奏をサポートします。
 * プラグインコマンドから演奏、ループ演奏、停止ができます。
 * 音量は効果音とは区別され、オプション画面から調整できます。
 * チャンネルの概念があり、同一のチャンネル番号のボイスは
 * 重なって演奏されなくなります。
 *
 * このプラグインの利用にはベースプラグイン『PluginCommonBase.js』が必要です。
 * 『PluginCommonBase.js』は、RPGツクールMZのインストールフォルダ配下の
 * 以下のフォルダに格納されています。
 * dlc/BasicResources/plugins/official
 *
 * 利用規約：
 *  作者に無断で改変、再配布が可能で、利用形態（商用、18禁利用等）
 *  についても制限はありません。
 *  このプラグインはもうあなたのものです。
 *
 * --------------------------------------------------------------------------
 * スクリプト：SE / Voice フェード（時間の単位は秒）
 * --------------------------------------------------------------------------
 * // 再生開始時から1秒でフェードイン（推奨）
 * AudioManager.playSe({
 *     name: 'Wind1', volume: 90, pitch: 100, pan: 0, fadeIn: 1
 * });
 * AudioManager.playVoice({
 *     name: 'voice01', volume: 90, pitch: 100, pan: 0, fadeIn: 1
 * }, true, 3);
 * // audio/seのファイルをVoiceチャンネル5でループ再生
 * AudioManager.playVoice({
 *     isSE: true, name: 'Wind1', volume: 70, pitch: 100, pan: 0
 * }, true, 5);
 * // AudioManager.stopVoice(null, 5);
 *
 * // すでに再生中の音に対するフェード
 * AudioManager.fadeInSe(1);                       // 全SE
 * AudioManager.fadeOutSe(1, 'Wind1');             // 指定名のSE
 * AudioManager.fadeInVoice(1, null, 3);            // チャンネル3
 * AudioManager.fadeOutVoice(1, 'voice01', 3);      // 名前かつチャンネル
 * AudioManager.fadeOutVoice(1);                    // 全Voice
 *
 * fadeOutSe / fadeOutVoice はフェード終了時に対象を停止します。
 * 名前を省略すると全ファイル、Voiceのチャンネルを省略すると全チャンネルが
 * 対象です。名前とチャンネルを両方指定した場合は、両方が一致するVoiceだけを
 * 対象にします。プラグインコマンドは追加していません。
 */

(function() {
    'use strict';
    const script = document.currentScript;
    const param = PluginManagerEx.createParameter(script);
    const legacyParam = PluginManager.parameters('SimpleVoice') || {};
    const metaTagPrefix = 'SV_';
    param.folderName = legacyParam.FolderName || legacyParam['フォルダ名'] || param.folderName || 'voice';
    param.optionName = param.optionName || legacyParam.OptionName || legacyParam['オプション名称'] || 'ボイス 音量';
    param.optionValue = Number(param.optionValue ?? legacyParam.OptionValue ?? legacyParam['オプション初期値'] ?? 100);
    if (!Number.isFinite(param.optionValue)) {
        param.optionValue = 100;
    }

    const toNumber = (value, defaultValue, min, max) => {
        const result = Number(PluginManagerEx.convertEscapeCharacters(String(value ?? '')));
        const finite = Number.isFinite(result) ? result : defaultValue;
        return Math.max(min ?? -Infinity, Math.min(max ?? Infinity, finite));
    };

    const convertArgs = args => (args || []).map(arg => PluginManagerEx.convertEscapeCharacters(String(arg ?? '')));

    PluginManagerEx.registerCommand(script, 'PLAY_VOICE', args => {
        AudioManager.playVoice(args, args.loop, args.channel);
    });

    PluginManagerEx.registerCommand(script, 'STOP_VOICE', args => {
        if (args.name) {
            AudioManager.stopVoice(args.name, null);
        } else if (args.channel) {
            AudioManager.stopVoice(null, args.channel);
        } else {
            AudioManager.stopVoice(null, null);
        }
    });

    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        if (_Game_Interpreter_pluginCommand) {
            _Game_Interpreter_pluginCommand.apply(this, arguments);
        }
        if (!String(command || '').match(new RegExp('^' + metaTagPrefix))) {
            return;
        }
        this.pluginCommandSimpleVoice(command.replace(metaTagPrefix, ''), convertArgs(args));
    };

    Game_Interpreter.prototype.pluginCommandSimpleVoice = function(command, args) {
        switch (String(command || '').toUpperCase()) {
            case 'PLAY_VOICE':
            case 'ボイスの演奏':
                this.execSimpleVoicePlay(args, false);
                break;
            case 'PLAY_LOOP_VOICE':
            case 'ボイスのループ演奏':
                this.execSimpleVoicePlay(args, true);
                break;
            case 'RESERVE_VOICE':
            case 'ボイスの演奏の予約':
                this.execSimpleVoiceReserve(args, false);
                break;
            case 'RESERVE_LOOP_VOICE':
            case 'ボイスのループ演奏の予約':
                this.execSimpleVoiceReserve(args, true);
                break;
            case 'STOP_VOICE':
            case 'ボイスの停止':
                this.execSimpleVoiceStop(args);
                break;
        }
    };

    Game_Interpreter.prototype.execSimpleVoicePlay = function(args, loop) {
        const voice = {
            name: args.length >= 1 ? args[0] : '',
            volume: args.length >= 2 ? toNumber(args[1], 90, 0, 100) : 90,
            pitch: args.length >= 3 ? toNumber(args[2], 100, 50, 150) : 100,
            pan: args.length >= 4 ? toNumber(args[3], 0, -100, 100) : 0
        };
        const channel = args.length >= 5 ? toNumber(args[4], 1, 1) : 1;
        AudioManager.playVoice(voice, !!loop, channel);
    };

    Game_Interpreter.prototype.execSimpleVoiceReserve = function(args, loop) {
        const channel = args.length >= 5 ? toNumber(args[4], 1, 1) : undefined;
        if (AudioManager.isExistVoiceChannel(channel)) {
            setTimeout(this.execSimpleVoiceReserve.bind(this, args, loop), 16);
            return;
        }
        this.execSimpleVoicePlay(args, loop);
    };

    Game_Interpreter.prototype.execSimpleVoiceStop = function(args) {
        if (!args || args.length === 0 || !args[0]) {
            AudioManager.stopVoice(null, null);
            return;
        }
        const channel = Number(args[0]);
        if (Number.isNaN(channel)) {
            AudioManager.stopVoice(args[0], null);
        } else {
            AudioManager.stopVoice(null, channel);
        }
    };

    //=============================================================================
    // 向后兼容别名（旧 MV 版方法名）
    //  本插件迁移到 MZ 时把 interpreter 方法改了名（execPlayVoice→execSimpleVoicePlay 等），
    //  但地图/公共事件的脚本指令仍在调用旧名（如 this.execPlayVoice(args, false)）。
    //  这里挂回旧名作为别名，避免逐一改动事件数据。
    //=============================================================================
    Game_Interpreter.prototype.execPlayVoice = function(args, loop) {
        this.execSimpleVoicePlay(args, loop);
    };
    Game_Interpreter.prototype.execPlayLoopVoice = function(args) {
        this.execSimpleVoicePlay(args, true);
    };
    Game_Interpreter.prototype.execReserveVoice = function(args, loop) {
        this.execSimpleVoiceReserve(args, loop);
    };
    Game_Interpreter.prototype.execReserveLoopVoice = function(args) {
        this.execSimpleVoiceReserve(args, true);
    };
    Game_Interpreter.prototype.execStopVoice = function(args) {
        this.execSimpleVoiceStop(args);
    };

    //=============================================================================
    // ConfigManager
    //  ボイスボリュームの設定機能を追加します。
    //=============================================================================
    Object.defineProperty(ConfigManager, 'voiceVolume', {
        get: function() {
            return AudioManager._voiceVolume;
        },
        set: function(value) {
            AudioManager.voiceVolume = value;
        }
    });

    const _ConfigManager_makeData = ConfigManager.makeData;
    ConfigManager.makeData      = function() {
        const config         = _ConfigManager_makeData.apply(this, arguments);
        config.voiceVolume = this.voiceVolume;
        return config;
    };

    const _ConfigManager_load = ConfigManager.load;
    ConfigManager.load = function () {
        this.voiceVolume = param.optionValue;
        _ConfigManager_load.apply(this, arguments);
    };

    const _ConfigManager_applyData = ConfigManager.applyData;
    ConfigManager.applyData      = function(config) {
        _ConfigManager_applyData.apply(this, arguments);
        const symbol       = 'voiceVolume';
        if (config.hasOwnProperty(symbol)) {
            this.voiceVolume = this.readVolume(config, symbol);
        }
    };

    //=============================================================================
    // Window_Options
    //  ボイスボリュームの設定項目を追加します。
    //=============================================================================
    const _Window_Options_addVolumeOptions      = Window_Options.prototype.addVolumeOptions;
    Window_Options.prototype.addVolumeOptions = function() {
        _Window_Options_addVolumeOptions.apply(this, arguments);
        const label = window.systemFeatureText?.voiceVolume || param.optionName;
        this.addCommand(label, 'voiceVolume');
    };

    const _Scene_Options_maxCommands = Scene_Options.prototype.maxCommands;
    Scene_Options.prototype.maxCommands = function() {
        return _Scene_Options_maxCommands.apply(this, arguments) + 1;
    };

    //=============================================================================
    // AudioManager
    //  ボイスの演奏機能を追加定義します。
    //=============================================================================
    Object.defineProperty(AudioManager, 'voiceVolume', {
        get: function() {
            return this._voiceVolume;
        },
        set: function(value) {
            this._voiceVolume = value;
        }
    });

    AudioManager.updateVoiceParameters = function(buffer, voice) {
        this.updateBufferParameters(buffer, this._voiceVolume, voice);
    };

    //=============================================================================
    // AudioManager : SE / Voice fade
    //  WebAudio.fadeOut sets isPlaying to false immediately. SE and Voice are kept
    //  in arrays which periodically discard non-playing buffers, so preserve the
    //  playing flag until the ramp actually finishes and then remove that exact
    //  buffer. This also prevents a later sound with the same name/channel from
    //  being stopped by an older fade timer.
    //=============================================================================
    AudioManager._normalizeAudioFadeDuration = function(duration) {
        const value = Number(duration);
        return Number.isFinite(value) ? Math.max(0, value) : 0;
    };

    AudioManager._cancelAudioBufferFade = function(buffer) {
        if (!buffer) {
            return;
        }
        if (buffer._simpleVoiceFadeTimer) {
            clearTimeout(buffer._simpleVoiceFadeTimer);
        }
        buffer._simpleVoiceFadeTimer = null;
        buffer._simpleVoiceFadeToken = null;
    };

    AudioManager._audioFadeCurrentTime = function(buffer) {
        const context = buffer?._gainNode?.context;
        if (context && Number.isFinite(context.currentTime)) {
            return context.currentTime;
        }
        return typeof WebAudio !== 'undefined' ? WebAudio._currentTime() : 0;
    };

    AudioManager._createAudioFadeGainNode = function(buffer) {
        const sourceGainNode = buffer?._gainNode;
        const pannerNode = buffer?._pannerNode;
        if (!sourceGainNode || !pannerNode) {
            return null;
        }
        if (buffer._simpleVoiceFadeSourceNode === sourceGainNode &&
            buffer._simpleVoiceFadeGainNode) {
            return buffer._simpleVoiceFadeGainNode;
        }
        const context = sourceGainNode.context || (typeof WebAudio !== 'undefined' ? WebAudio._context : null);
        if (!context || typeof context.createGain !== 'function') {
            return null;
        }
        if (buffer._simpleVoiceFadeGainNode) {
            try {
                buffer._simpleVoiceFadeGainNode.disconnect();
            } catch (e) {
                // The old playback graph may already have been removed.
            }
        }
        const fadeGainNode = context.createGain();
        const currentTime = this._audioFadeCurrentTime(buffer);
        fadeGainNode.gain.setValueAtTime(1, currentTime);
        try {
            sourceGainNode.disconnect();
            sourceGainNode.connect(fadeGainNode);
            fadeGainNode.connect(pannerNode);
        } catch (e) {
            try {
                fadeGainNode.disconnect();
                sourceGainNode.connect(pannerNode);
            } catch (restoreError) {
                // Let the WebAudio fallback below handle uncommon audio backends.
            }
            return null;
        }
        buffer._simpleVoiceFadeSourceNode = sourceGainNode;
        buffer._simpleVoiceFadeGainNode = fadeGainNode;
        return fadeGainNode;
    };

    AudioManager._cancelAudioGainAutomation = function(buffer) {
        const gain = buffer?._gainNode?.gain;
        if (gain && typeof gain.cancelScheduledValues === 'function') {
            gain.cancelScheduledValues(this._audioFadeCurrentTime(buffer));
        }
    };

    AudioManager._fadeInAudioBuffer = function(buffer, duration) {
        if (!buffer) {
            return;
        }
        const seconds = this._normalizeAudioFadeDuration(duration);
        this._cancelAudioBufferFade(buffer);
        const token = {};
        buffer._simpleVoiceFadeToken = token;
        const startFade = () => {
            if (buffer._simpleVoiceFadeToken !== token || !buffer.isPlaying()) {
                return;
            }
            const fadeGainNode = this._createAudioFadeGainNode(buffer);
            if (fadeGainNode) {
                const gain = fadeGainNode.gain;
                const currentTime = this._audioFadeCurrentTime(buffer);
                gain.cancelScheduledValues(currentTime);
                gain.setValueAtTime(0, currentTime);
                gain.linearRampToValueAtTime(1, currentTime + seconds);
            } else {
                this._cancelAudioGainAutomation(buffer);
                buffer.fadeIn(seconds);
            }
            if (buffer._simpleVoiceFadeToken === token) {
                buffer._simpleVoiceFadeToken = null;
            }
        };
        if (buffer.isReady()) {
            startFade();
        } else {
            buffer.addLoadListener(startFade);
        }
    };

    AudioManager._fadeOutAudioBuffer = function(buffer, duration, onComplete) {
        if (!buffer) {
            return;
        }
        const seconds = this._normalizeAudioFadeDuration(duration);
        this._cancelAudioBufferFade(buffer);
        const token = {};
        buffer._simpleVoiceFadeToken = token;
        const complete = () => {
            if (buffer._simpleVoiceFadeToken !== token) {
                return;
            }
            if (buffer._simpleVoiceFadeTimer) {
                clearTimeout(buffer._simpleVoiceFadeTimer);
            }
            buffer._simpleVoiceFadeTimer = null;
            buffer._simpleVoiceFadeToken = null;
            onComplete(buffer);
        };
        const startFade = () => {
            if (buffer._simpleVoiceFadeToken !== token) {
                return;
            }
            if (!buffer.isPlaying() || seconds === 0) {
                complete();
                return;
            }
            const fadeGainNode = this._createAudioFadeGainNode(buffer);
            if (fadeGainNode) {
                const gain = fadeGainNode.gain;
                const currentTime = this._audioFadeCurrentTime(buffer);
                if (typeof gain.cancelAndHoldAtTime === 'function') {
                    gain.cancelAndHoldAtTime(currentTime);
                } else {
                    const currentValue = gain.value;
                    gain.cancelScheduledValues(currentTime);
                    gain.setValueAtTime(currentValue, currentTime);
                }
                gain.linearRampToValueAtTime(0, currentTime + seconds);
            } else {
                this._cancelAudioGainAutomation(buffer);
                buffer.fadeOut(seconds);
                // WebAudio.fadeOut marks the buffer stopped before its gain ramp ends.
                // Keep it alive so cleanupSe/filterPlayingVoice cannot cut the fade off.
                buffer._isPlaying = true;
            }
            buffer._simpleVoiceFadeTimer = setTimeout(complete, seconds * 1000);
            buffer.addStopListener(() => {
                if (buffer._simpleVoiceFadeToken === token) {
                    this._cancelAudioBufferFade(buffer);
                }
            });
        };
        if (seconds === 0 || buffer.isReady()) {
            startFade();
        } else {
            buffer.addLoadListener(startFade);
        }
    };

    AudioManager._isTargetSeBuffer = function(buffer, name) {
        return !name || buffer.name === name;
    };

    AudioManager._isTargetVoiceBuffer = function(buffer, name, channel) {
        const hasName = name !== undefined && name !== null && name !== '';
        const hasChannel = channel !== undefined && channel !== null;
        const voicePath = hasName ? PluginManagerEx.convertEscapeCharacters(String(name)) : null;
        return (!hasName || buffer.path === voicePath) &&
            (!hasChannel || buffer.channel === channel);
    };

    AudioManager.fadeInSe = function(duration, name) {
        this.cleanupSe();
        this._seBuffers
            .filter(buffer => this._isTargetSeBuffer(buffer, name))
            .forEach(buffer => this._fadeInAudioBuffer(buffer, duration));
    };

    AudioManager.fadeOutSe = function(duration, name) {
        this.cleanupSe();
        this._seBuffers
            .filter(buffer => this._isTargetSeBuffer(buffer, name))
            .forEach(buffer => this._fadeOutAudioBuffer(buffer, duration, target => {
                if (this._seBuffers.includes(target)) {
                    target.destroy();
                    this._seBuffers = this._seBuffers.filter(buffer => buffer !== target);
                }
            }));
    };

    const _AudioManager_playSe = AudioManager.playSe;
    AudioManager.playSe = function(se) {
        const previousBuffers = new Set(this._seBuffers);
        const result = _AudioManager_playSe.apply(this, arguments);
        if (se && se.fadeIn !== undefined) {
            this._seBuffers
                .filter(buffer => !previousBuffers.has(buffer))
                .forEach(buffer => this._fadeInAudioBuffer(buffer, se.fadeIn));
        }
        return result;
    };

    AudioManager._voiceBuffers = [];
    AudioManager._voiceVolume  = 100;
    AudioManager.playVoice     = function(voice, loop, channel) {
        const voicePath = PluginManagerEx.convertEscapeCharacters(voice.name);
        if (voicePath) {
            const isSE = voice.isSE === true || String(voice.isSE).toLowerCase() === 'true';
            const rootFolder = isSE ? 'se' : String(param.folderName || 'voice').replace(/\/+$/, '');
            const path = (rootFolder + '/' + voicePath).split('/');
            const name = path.pop();
            const folder = path.join('/') + '/';
            this.stopVoice(voice.name, channel);
            const buffer = this.createBuffer(folder, name);
            if (isSE) {
                this.updateBufferParameters(buffer, this._seVolume, voice);
            } else {
                this.updateVoiceParameters(buffer, voice);
            }
            buffer.play(loop, 0);
            buffer.path = voicePath;
            buffer.name = voicePath;
            buffer.channel = channel;
            buffer.isSE = isSE;
            this._voiceBuffers.push(buffer);
            this.attachUnderwaterVoiceBuffer?.(buffer);
            if (voice.fadeIn !== undefined) {
                this._fadeInAudioBuffer(buffer, voice.fadeIn);
            }
        }
    };

    AudioManager.fadeInVoice = function(duration, name, channel) {
        this.filterPlayingVoice();
        this._voiceBuffers
            .filter(buffer => this._isTargetVoiceBuffer(buffer, name, channel))
            .forEach(buffer => this._fadeInAudioBuffer(buffer, duration));
    };

    AudioManager.fadeOutVoice = function(duration, name, channel) {
        this.filterPlayingVoice();
        this._voiceBuffers
            .filter(buffer => this._isTargetVoiceBuffer(buffer, name, channel))
            .forEach(buffer => this._fadeOutAudioBuffer(buffer, duration, target => {
                if (this._voiceBuffers.includes(target)) {
                    target.stop();
                    this._voiceBuffers = this._voiceBuffers.filter(buffer => buffer !== target);
                }
            }));
    };

    AudioManager.stopVoice = function(name, channel) {
        const voicePath = name ? PluginManagerEx.convertEscapeCharacters(name) : null;
        this._voiceBuffers.forEach(function(buffer) {
            if (!name && !channel || buffer.path === voicePath || buffer.channel === channel) {
                buffer.stop();
            }
        });
        this.filterPlayingVoice();
    };

    AudioManager.filterPlayingVoice = function() {
        this._voiceBuffers = this._voiceBuffers.filter(function(buffer) {
            const playing = buffer.isPlaying() || !buffer.isReady();
            if (!playing) {
                buffer.stop();
            }
            return playing;
        });
    };

    AudioManager.isExistVoiceChannel = function(channel) {
        this.filterPlayingVoice();
        return this._voiceBuffers.some(function(buffer) {
            if (buffer._sourceNode && buffer._sourceNode.loop) {
                return false;
            }
            return buffer.channel === channel || channel === undefined;
        });
    };

    const _AudioManager_stopAll = AudioManager.stopAll;
    AudioManager.stopAll = function() {
        _AudioManager_stopAll.apply(this, arguments);
        this.stopVoice();
    };

    //=============================================================================
    // Scene_Base
    //  フェードアウト時にSEの演奏も停止します。
    //=============================================================================
    const _Scene_Base_fadeOutAll = Scene_Base.prototype.fadeOutAll;
    Scene_Base.prototype.fadeOutAll = function() {
        _Scene_Base_fadeOutAll.apply(this, arguments);
        AudioManager.stopVoice();
    };
})();
