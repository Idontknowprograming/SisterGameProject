//=============================================================================
// MoviePicture.js
// ----------------------------------------------------------------------------
// (C)2017 Triacontane
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 2.3.1 2025/04/12 The play() request was interrupted by a call to pause()のエラー抑制
// 2.3.0 2025/02/19 プラグインコマンドの動画ファイル指定で@fileに対応
// 2.2.2 2024/09/15 敵キャラを動画表示する機能で、敵キャラの変身に対応できていなかった問題を修正
// 2.2.1 2024/09/11 サブファオルダに配置された動画ファイルを再生できない問題を修正
// 2.2.0 2022/03/10 敵キャラを動画にできる機能を追加
// 2.1.0 2021/08/15 2.0.3の修正により動画音量種別をnoneにするとエラーになっていた問題を修正
//                  動画ファイルの再生でファイル名に制御文字を使えるよう修正
// 2.0.3 2021/07/31 動画音量種別に指定した項目のボリュームを0にしたとき、音量100で再生されてしまう問題を修正
// 2.0.2 2020/09/13 ヘルプ微修正
// 2.0.1 2020/09/13 ヘルプ微修正
// 2.0.0 2020/09/13 MZで動作するよう全面的に改修
// 1.7.1 2019/08/26 他のプラグインとの組み合わせによりエラーになる可能性のある記述を修正
// 1.7.0 2019/06/30 動画の取得元フォルダと拡張子を変更して動画を難読化できるようにしました。
// 1.6.0 2019/06/29 複数の動画を並行してロードしているときは、すべての動画のロードが完了してから再生するよう変更しました
//                  一定フレームで動画を中断させるコマンドを追加
// 1.5.1 2019/06/29 画面遷移したとき、動画でないピクチャまで非表示になってしまう問題を修正
// 1.5.0 2019/06/11 動画再生終了後、動画ピクチャを自動削除せず最終フレームで静止したままにする機能を追加
// 1.4.1 2019/05/21 動画を縮小表示したときのジャギを軽減
//                  ヘルプの記載を本体バージョン1.6を前提に修正
// 1.4.0 2019/01/06 movieフォルダ以外の場所に配置されている動画ファイルを再生できる機能を追加
// 1.3.3 2018/11/08 再生開始直後に停止したとき、特定条件下で正常に停止しない問題を修正
// 1.3.2 2018/06/17 ピクチャの消去によって動画再生を終了した場合に、再生速度と音量が初期化されない問題を修正
// 1.3.1 2017/08/27 二連続で再生したときに動画の音量同期機能が正常に動作しない問題を修正
// 1.3.0 2017/08/26 動画の音量をいずれかのオーディオ音量と同期させる機能を追加
// 1.2.0 2017/08/18 動画の再生速度(倍率)を変更できるプラグインコマンドを追加
// 1.1.0 2017/08/09 アルファチャンネル付き動画の再生に対応（ただし特定の手順を踏む必要あり）
// 1.0.3 2017/08/08 エラー処理を追加
// 1.0.2 2017/08/07 環境に関する制約を追加
// 1.0.1 2017/08/07 リファクタリング（仕様の変更はなし）
// 1.0.0 2017/08/06 初版
// ----------------------------------------------------------------------------
// [Blog]   : https://triacontane.blogspot.jp/
// [Twitter]: https://twitter.com/triacontane/
// [GitHub] : https://github.com/triacontane/
//=============================================================================

/*:
 * @plugindesc 動画のピクチャ表示プラグイン
 * @target MZ
 * @url https://github.com/triacontane/RPGMakerMV/tree/mz_master/MoviePicture.js
 * @base PluginCommonBase
 * @author トリアコンタン
 *
 * @param movieVolumeType
 * @text 動画音量種別
 * @desc 動画再生時に音声が含まれる場合、その音量を参照するオーディオ種別です。指定しない場合、常に100%で再生されます。
 * @default none
 * @type select
 * @option none
 * @option BGM
 * @option BGS
 * @option ME
 * @option SE
 *
 * @param autoEraseOnEnd
 * @text 終了時自動削除
 * @desc 動画再生終了時に動画ピクチャを自動で削除します。削除しない場合、動画は最終フレームで静止します。
 * @default true
 * @type boolean
 *
 * @param webmExt
 * @text webm偽装拡張子
 * @desc webm形式を再生するときの偽装拡張子です。難読化したい場合に指定します。対応フォーマットが増えるわけではありません。
 * @default
 *
 * @param mp4Ext
 * @text mp4偽装拡張子
 * @desc mp4形式を再生するときの偽装拡張子です。難読化したい場合に指定します。対応フォーマットが増えるわけではありません。
 * @default
 *
 * @command PREPARE
 * @text ピクチャ動画準備
 * @desc 指定した動画ファイルをピクチャ動画として準備します。
 *
 * @arg fileName
 * @text ファイル名
 * @desc 再生する動画ファイルです。『movies』フォルダ以下の動画ファイルを拡張子無しで入力します。
 * @default
 * @type file
 * @dir movies
 *
 * @arg loop
 * @text ループ
 * @desc 有効にすると動画をループ再生します。
 * @default false
 * @type boolean
 *
 * @arg smooth
 * @text なめらか表示
 * @desc 有効にすると動画を拡大したときになめらかな表示になります。
 * @default true
 * @type boolean
 *
 * @arg volume
 * @text 音量
 * @desc 動画の音量です。
 * @default 100
 * @type number
 * @max 100
 *
 * @arg reload
 * @text 再読み込み
 * @desc 同一番号のピクチャに対して同一の動画を表示しようとしたときに、最初から再生し直します。
 * @default false
 * @type boolean
 *
 * @arg autoplay
 * @text 自動再生
 * @desc 読み込み完了と同時に再生を開始します。無効にした場合、プラグインコマンドから手動再生します。
 * @default true
 * @type boolean
 *
 * @arg finishSwitch
 * @text 再生終了スイッチ
 * @desc 動画の再生が終了したタイミングでONになるスイッチです。ループ再生の場合は、1ループした時点でONになります。
 * @default 0
 * @type switch
 *
 * @command PAUSE
 * @text 一時停止
 * @desc 再生中の動画を一時停止します。
 *
 * @arg pictureId
 * @text ピクチャ番号
 * @desc 対象のピクチャ番号です。
 * @default 1
 * @type number
 *
 * @command PLAY
 * @text 再生
 * @desc 動作の再生を開始します。
 *
 * @arg pictureId
 * @text ピクチャ番号
 * @desc 対象のピクチャ番号です。
 * @default 1
 * @type number
 *
 * @command WAIT
 * @text 完了までウェイト
 * @desc 動作の再生が完了するまでイベントの進行を待機します。
 *
 * @arg pictureId
 * @text ピクチャ番号
 * @desc 対象のピクチャ番号です。
 * @default 1
 * @type number
 *
 * @command SET_VOLUME
 * @text 音量設定
 * @desc 動画の音量を設定します。
 *
 * @arg pictureId
 * @text ピクチャ番号
 * @desc 対象のピクチャ番号です。
 * @default 1
 * @type number
 *
 * @arg volume
 * @text 音量
 * @desc 動画の音量です。
 * @default 100
 * @type number
 * @max 100
 *
 * @command SET_RATE
 * @text 再生倍率設定
 * @desc 動画の再生倍率を設定します。
 *
 * @arg pictureId
 * @text ピクチャ番号
 * @desc 対象のピクチャ番号です。
 * @default 1
 * @type number
 *
 * @arg rate
 * @text 再生倍率
 * @desc 動画の再生倍率です。
 * @default 100
 * @type number
 *
 * @help ピクチャの表示枠を使って動画を再生します。
 * ピクチャの移動や回転、色調変更による処理の対象になるほか、
 * 複数の動画の並行再生が可能になります。
 * また、動画がウィンドウの下に表示されるようになります。
 *
 * 『ピクチャ動画準備』のコマンド実行後に、ファイルを空にして
 * イベントコマンド『ピクチャの表示』を実行してください。
 *
 * このプラグインは、ローカル実行(Game.exe)のみをサポート対象とします。
 * Webブラウザでも動作する可能性はありますが、自己責任でご利用ください。
 *
 * ピクチャ同様、敵キャラを動画表示できます。
 * 敵キャラのメモ欄に以下の通り設定してください。
 *
 * // 動画[aaa]を敵キャラ画像の代わりに表示します。
 * <動画:aaa>
 * <Movie:aaa>
 *
 * このプラグインの利用にはベースプラグイン『PluginCommonBase.js』が必要です。
 * 『PluginCommonBase.js』は、RPGツクールMZのインストールフォルダ配下の
 * 以下のフォルダに格納されています。
 * dlc/BasicResources/plugins/official
 *
 * We will create an English version when it works well.
 *
 * 可选 A–B 循环（秒；默认关闭）：
 *   const pic = $gameScreen.picture(10);
 *   pic.setVideoABLoop(1.2, 3.4); // 播放区间 [A, B)，返回是否接受设置
 *   pic.clearVideoABLoop();      // 关闭；不跳转、不解除暂停
 * 启用后播放位置在区间外时回到 A；暂停期间不跳转。
 * A–B 启用期间优先于普通循环、setTimeLimit 和 setFrameLimit；关闭后
 * 恢复原设置。新显示的视频默认关闭；有效区间可随存档保存。
 * 本功能仅定位原视频，不转码、不调整画质、不自动寻找或添加关键帧。
 * currentTime 定位仍有解码等待，不保证无缝循环。
 *
 * 利用規約：
 *  作者に無断で改変、再配布が可能で、利用形態（商用、18禁利用等）
 *  についても制限はありません。
 *  このプラグインはもうあなたのものです。
 */

(function() {
    'use strict';
    const script = document.currentScript;
    const param = PluginManagerEx.createParameter(script);
    const legacyParam = PluginManager.parameters('MoviePicture') || {};
    const toBoolean = value => String(value).toLowerCase() === 'true';
    const toNumber = (value, defaultValue) => {
        const number = Number(value);
        return Number.isFinite(number) ? number : defaultValue;
    };
    const hasExplicitParam = name => Object.prototype.hasOwnProperty.call(legacyParam, name);

    param.movieVolumeType = String(param.movieVolumeType || legacyParam.MovieVolumeType || legacyParam['動画音量種別'] || 'none').toUpperCase();
    param.autoEraseOnEnd = hasExplicitParam('autoEraseOnEnd') ? toBoolean(legacyParam.autoEraseOnEnd) :
        hasExplicitParam('AutoEraseOnEnd') ? toBoolean(legacyParam.AutoEraseOnEnd) :
        hasExplicitParam('終了時自動削除') ? toBoolean(legacyParam['終了時自動削除']) : false;
    param.webmExt = 'nlch';
    param.mp4Ext = '';
    param.movieFolder = 'img/movies';
    param.onLoadSwitch = toNumber(legacyParam.OnLoadSwitch || legacyParam['読み込み完了スイッチ'], 125);

    PluginManagerEx.registerCommand(script, 'PREPARE', args => {
        $gameScreen.setVideoPicture(args);
    });

    PluginManagerEx.registerCommand(script, 'PAUSE', args => {
        const picture = $gameScreen.picture(args.pictureId);
        if (picture) {
            picture.setVideoPause(true);
        }
    });

    PluginManagerEx.registerCommand(script, 'PLAY', args => {
        const picture = $gameScreen.picture(args.pictureId);
        if (picture) {
            picture.setVideoPause(false);
        }
    });

    PluginManagerEx.registerCommand(script, 'SET_VOLUME', args => {
        const picture = $gameScreen.picture(args.pictureId);
        if (picture) {
            picture.setVideoVolume(args.volume);
        }
    });

    PluginManagerEx.registerCommand(script, 'WAIT', function(args) {
        const picture = $gameScreen.picture(args.pictureId);
        if (picture) {
            picture.setVideoWait(true);
            this._waitMode = 'videoPicture';
        }
    });

    PluginManagerEx.registerCommand(script, 'SET_RATE', args => {
        const picture = $gameScreen.picture(args.pictureId);
        if (picture) {
            picture.setVideoSpeed(args.rate);
        }
    });

    PluginManagerEx.registerCommand(script, 'SET_TIME_LIMIT', args => {
        const picture = $gameScreen.picture(args.pictureId);
        if (picture) {
            picture.setTimeLimit(toNumber(args.time || args.seconds || args.limit, 0));
        }
    });

    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        if (_Game_Interpreter_pluginCommand) {
            _Game_Interpreter_pluginCommand.apply(this, arguments);
        }
        const methodName = `execMoviePicture${String(command).toUpperCase()}`;
        if (this[methodName]) {
            this[methodName](args || []);
        }
    };

    Game_Interpreter.prototype.execMoviePictureMP_SET_MOVIE = function(args) {
        $gameScreen.setVideoPictureName(args[0], toBoolean(args[1]), false);
    };

    Game_Interpreter.prototype.execMoviePictureMP_SET_OUTER_MOVIE = function(args) {
        $gameScreen.setVideoPictureName(args[0], toBoolean(args[1]), true);
    };

    Game_Interpreter.prototype.execMoviePictureMP_SET_LOOP = function(args) {
        const picture = $gameScreen.picture(toNumber(args[0], 0));
        if (picture) picture.setVideoLoop(toBoolean(args[1]));
    };

    Game_Interpreter.prototype.execMoviePictureMP_SET_PAUSE = function(args) {
        const picture = $gameScreen.picture(toNumber(args[0], 0));
        if (picture) picture.setVideoPause(toBoolean(args[1]));
    };

    Game_Interpreter.prototype.execMoviePictureMP_SET_WAIT = function(args) {
        const picture = $gameScreen.picture(toNumber(args[0], 0));
        if (picture) {
            picture.setVideoWait(true);
            this._waitMode = 'videoPicture';
        }
    };

    Game_Interpreter.prototype.execMoviePictureMP_SET_LIMIT = function(args) {
        const picture = $gameScreen.picture(toNumber(args[0], 0));
        if (picture) picture.setFrameLimit(toNumber(args[1], 0));
    };

    Game_Interpreter.prototype.execMoviePictureMP_SET_VOLUME = function(args) {
        const picture = $gameScreen.picture(toNumber(args[0], 0));
        if (picture) picture.setVideoVolume(toNumber(args[1], 100));
    };

    Game_Interpreter.prototype.execMoviePictureMP_SET_SPEED = function(args) {
        const picture = $gameScreen.picture(toNumber(args[0], 0));
        if (picture) picture.setVideoSpeed(toNumber(args[1], 100));
    };

    Game_Interpreter.prototype.execMoviePictureMP_SET_VOLUME_TYPE = function(args) {
        const picture = $gameScreen.picture(toNumber(args[0], 0));
        if (picture) picture.setVideoVolumeType(args[1]);
    };

    Game_Interpreter.prototype.execMoviePictureMP_SET_TIME_LIMIT = function(args) {
        const picture = $gameScreen.picture(toNumber(args[0], 0));
        if (picture) picture.setTimeLimit(toNumber(args[1], 0));
    };

    const _Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function() {
        if (this._waitMode === 'videoPicture') {
            const waiting = $gameScreen.isVideoWaiting();
            if (!waiting) {
                this._waitMode = '';
            }
            return waiting;
        } else {
            return _Game_Interpreter_updateWaitMode.apply(this, arguments);
        }
    };

    //=============================================================================
    // Game_Screen
    //  動画ピクチャを準備します。
    //=============================================================================
    Game_Screen.prototype.setVideoPicture = function(args) {
        this._videoPicture = args;
    };

    /**
     * @param {string} movieName Video filename without extension.
     * @param {boolean} useAlpha Whether to use alpha-channel drawing.
     * @param {boolean} useOuter Whether movieName is an external path.
     * @param {boolean|string} [smooth=true] LINEAR when true, NEAREST when false.
     */
    Game_Screen.prototype.setVideoPictureName = function(movieName, useAlpha, useOuter, smooth = true) {
        let fileName = PluginManagerEx.convertEscapeCharacters(String(movieName || ''));
        const videoSmooth = smooth == null ? true : toBoolean(smooth);
        if (useOuter && Utils.isNwjs() && fileName && !ImageManager.isAbsoluteVideoPath(fileName)) {
            const path = require('path');
            fileName = path.join(path.dirname(StorageManager.localFileDirectoryPath()), fileName);
        }
        if (param.onLoadSwitch) {
            $gameSwitches.setValue(param.onLoadSwitch, false);
        }
        this.setVideoPicture({
            fileName: fileName,
            loop: false,
            smooth: videoSmooth,
            volume: 100,
            reload: false,
            autoplay: true,
            finishSwitch: 0,
            useAlpha: !!useAlpha,
            outer: !!useOuter,
            onLoadSwitch: param.onLoadSwitch
        });
    };

    Game_Screen.prototype.getVideoPicture = function() {
        return this._videoPicture;
    };

    Game_Screen.prototype.clearVideoPicture = function() {
        this._videoPicture = null;
    };

    Game_Screen.prototype.isVideoWaiting = function() {
        return this._pictures.some(function(picture) {
            return picture && picture.isVideoWait();
        });
    };

    //=============================================================================
    // Game_Picture
    //  動画ピクチャに関連するプロパティを追加定義します。
    //=============================================================================
    const _Game_Picture_show = Game_Picture.prototype.show;
    Game_Picture.prototype.show = function(name, origin, x, y, scaleX,
                                           scaleY, opacity, blendMode) {
        _Game_Picture_show.apply(this, arguments);
        const video = $gameScreen.getVideoPicture();
        if (video && !name) {
            this.showVideo(video)
        } else {
            this._video = false;
            this.clearVideoABLoop();
        }
    };

    Game_Picture.prototype.showVideo = function(video) {
        this._videoReload = video.reload;
        this._name = PluginManagerEx.convertEscapeCharacters(video.fileName);
        this._videoLoop = !!video.loop;
        this._videoSmooth = video.smooth !== false;
        this._videoFinishSwitch = video.finishSwitch;
        this._videoOnLoadSwitch = video.onLoadSwitch || 0;
        this._videoUseAlpha = !!video.useAlpha;
        if (this._videoFinishSwitch) {
            $gameSwitches.setValue(this._videoFinishSwitch, false);
        }
        this._video = true;
        this._ended = false;
        this._frameLimit = 0;
        this._timeLimit = 0;
        this.clearVideoABLoop();
        this.setVideoVolume(video.volume != null ? video.volume : 100);
        this.setVideoVolumeType(param.movieVolumeType);
        this.setVideoPause(!video.autoplay);
        $gameScreen.clearVideoPicture();
    };

    Game_Picture.prototype.onFinishVideo = function() {
        this._ended = true;
        if (this.isVideoWait()) {
            this.setVideoWait(false);
        }
        if (this._videoFinishSwitch) {
            $gameSwitches.setValue(this._videoFinishSwitch, true);
        }
    };

    Game_Picture.prototype.isNeedVideoReload = function() {
        return this._videoReload;
    };

    Game_Picture.prototype.clearNeedVideoReload = function() {
        this._videoReload = false;
    };

    Game_Picture.prototype.isVideo = function() {
        return this._video;
    };

    Game_Picture.prototype.isVideoLoop = function() {
        return this._videoLoop;
    };

    Game_Picture.prototype.isVideoSmooth = function() {
        return this._videoSmooth;
    };

    Game_Picture.prototype.isVideoUseAlpha = function() {
        return this._videoUseAlpha;
    };

    Game_Picture.prototype.setVideoLoop = function(value) {
        this._videoLoop = this.isVideo() && !!value;
    };

    Game_Picture.prototype.setVideoPause = function(value) {
        this._pauseVideo = this.isVideo() && value;
    };

    Game_Picture.prototype.isVideoPause = function() {
        return this._pauseVideo;
    };

    Game_Picture.prototype.setVideoWait = function(value) {
        this._waitVideo = this.isVideo() && value;
    };

    Game_Picture.prototype.isVideoWait = function() {
        return this._waitVideo;
    };

    Game_Picture.prototype.setVideoVolume = function(value) {
        this._volumeVideo = value;
    };

    Game_Picture.prototype.getVideoRealVolume = function() {
        return this._volumeVideo * AudioManager.getVideoPictureVolume(this._volumeVideoType);
    };

    Game_Picture.prototype.setVideoVolumeType = function(value) {
        this._volumeVideoType = value;
    };

    Game_Picture.prototype.setVideoSpeed = function(value) {
        this._speedVideo = value;
    };

    Game_Picture.prototype.getVideoSpeed = function() {
        return this._speedVideo || 100;
    };

    Game_Picture.prototype.setVideoPosition = function(value) {
        this.setVideoTimePosition(value);
    };

    Game_Picture.prototype.getVideoPosition = function() {
        return this.getVideoTimePosition();
    };

    Game_Picture.prototype.setFrameLimit = function(value) {
        this._frameLimit = Number(value) || 0;
    };

    Game_Picture.prototype.getFrameLimit = function() {
        return this._frameLimit || 0;
    };

    Game_Picture.prototype.setTimeLimit = function(value) {
        this._timeLimit = Number(value) || 0;
    };

    Game_Picture.prototype.getTimeLimit = function() {
        return this._timeLimit || 0;
    };

    Game_Picture.prototype.setVideoABLoop = function(start, end) {
        start = Number(start);
        end = Number(end);
        if (!this.isVideo() || !Number.isFinite(start) || !Number.isFinite(end) ||
            start < 0 || end <= start) {
            return false;
        }
        // Only serializable configuration belongs to Game_Picture. No media
        // objects, callbacks or timers are added to saves.
        this._videoABLoopRange = { start: start, end: end };
        return true;
    };

    Game_Picture.prototype.clearVideoABLoop = function() {
        this._videoABLoopRange = null;
    };

    Game_Picture.prototype.setVideoTimePosition = function(value) {
        this._videoTimePosition = value;
    };

    Game_Picture.prototype.getVideoTimePosition = function() {
        return this._videoTimePosition || 0;
    };

    Game_Picture.prototype.isVideoEnd = function() {
        return !!this._ended;
    };

    Game_Picture.prototype.setVideoEnd = function() {
        this.onFinishVideo();
    };

    Game_Picture.prototype.resumeAnimationPlayback = function(options) {
        options = options || {};
        const seekToStart = options.seekToStart !== false;
        const scene = SceneManager._scene;
        const container = scene && scene._spriteset && scene._spriteset._pictureContainer;
        if (!container || !container.children) {
            return false;
        }
        const sprite = container.children.find(child => child && child.picture && child.picture() === this);
        if (!sprite || !sprite.bitmap || !sprite.bitmap.isVideo || !sprite.bitmap.isVideo()) {
            return false;
        }
        if (typeof options.loop === 'boolean') {
            this.setVideoLoop(options.loop);
        }
        this._ended = false;
        sprite.bitmap._ended = false;
        if (seekToStart && sprite.bitmap.setCurrentTime) {
            try {
                sprite.bitmap.setCurrentTime(0.01);
            } catch (e) {
                // Ignore seek failures on not-yet-ready videos.
            }
        }
        this.setVideoPause(false);
        if (sprite.bitmap.play) {
            sprite.bitmap.play();
        }
        return true;
    };

    Game_Map.prototype.getPictureVideoCurrentTime = function(pictureId) {
        const sprite = this.findPictureVideoSprite(pictureId);
        return sprite && sprite.bitmap && sprite.bitmap.getCurrentTime ? sprite.bitmap.getCurrentTime() : 0;
    };

    Game_Map.prototype.setPictureVideoCurrentTime = function(pictureId, seconds) {
        const sprite = this.findPictureVideoSprite(pictureId);
        if (sprite && sprite.bitmap && sprite.bitmap.setCurrentTime) {
            sprite.bitmap.setCurrentTime(Number(seconds) || 0);
            return true;
        }
        return false;
    };

    Game_Map.prototype.findPictureVideoSprite = function(pictureId) {
        if (!$gameScreen.picture(pictureId)) {
            return null;
        }
        const scene = SceneManager._scene;
        const container = scene && scene._spriteset && scene._spriteset._pictureContainer;
        if (!container || !container.children) {
            return null;
        }
        return container.children.find(sprite => sprite && sprite._pictureId === pictureId) || null;
    };

    const _Game_Enemy_setup = Game_Enemy.prototype.setup;
    Game_Enemy.prototype.setup = function(enemyId, x, y) {
        _Game_Enemy_setup.apply(this, arguments);
        this.updateVideoName();
    };

    const _Game_Enemy_transform = Game_Enemy.prototype.transform;
    Game_Enemy.prototype.transform = function(enemyId) {
        _Game_Enemy_transform.apply(this, arguments);
        this.updateVideoName();
    };

    Game_Enemy.prototype.updateVideoName = function() {
        this._videoName = PluginManagerEx.findMetaValue(this.enemy(), ['Movie', '動画']);
    };

    const _Game_Enemy_battlerName = Game_Enemy.prototype.battlerName;
    Game_Enemy.prototype.battlerName = function() {
        return this._videoName ? this._videoName : _Game_Enemy_battlerName.apply(this, arguments);
    };

    Game_Enemy.prototype.isVideo = function() {
        return !!this._videoName;
    };

    const _Sprite_Enemy_loadBitmap = Sprite_Enemy.prototype.loadBitmap;
    Sprite_Enemy.prototype.loadBitmap = function(name) {
        if (this._enemy.isVideo()) {
            this.loadVideo(name);
        } else {
            this.destroyVideo();
            _Sprite_Enemy_loadBitmap.apply(this, arguments);
        }
    };

    Sprite_Enemy.prototype.loadVideo = function(name) {
        if (this.isVideoEnemy()) {
            this.destroyVideo();
        }
        this.bitmap = ImageManager.loadVideo(name, true);
        this.bitmap.setVideoLoop(true);
        this.bitmap.addLoadListener(()=> this.prepareVideo());
        this._loadingState = 'loading';
    };

    Sprite_Enemy.prototype.isVideoEnemy = function() {
        return this.bitmap && this.bitmap.isVideo();
    };

    Sprite_Enemy.prototype.destroyVideo = function() {
        if (!this.isVideoEnemy()) {
            return;
        }
        this.bitmap.destroy();
        this.texture = new PIXI.Texture(Sprite._emptyBaseTexture, new Rectangle());
        this.bitmap = null;
    };

    Sprite_Enemy.prototype.prepareVideo = function() {
        this._refresh();
        this._loadingState = 'prepared';
    };

    //=============================================================================
    // Sprite_Picture
    //  ムービーピクチャを読み込みます。
    //=============================================================================
    const _Sprite_Picture_loadBitmap = Sprite_Picture.prototype.loadBitmap;
    Sprite_Picture.prototype.loadBitmap = function() {
        if (this.picture().isVideo()) {
            this.loadVideo();
        } else {
            this.destroyVideo();
            _Sprite_Picture_loadBitmap.apply(this, arguments);
        }
    };

    Sprite_Picture.prototype.loadVideo = function() {
        if (SceneManager.isBattleStartUnexpectedLoad()) {
            return;
        }
        if (this.isVideoPicture()) {
            this.destroyVideo();
        }
        this.picture().clearNeedVideoReload();
        this.bitmap = ImageManager.loadVideo(this._pictureName, this.picture().isVideoSmooth(), this.picture().isVideoUseAlpha());
        this.restoreVideoTimePosition();
        this.bitmap.addLoadListener(function() {
            this.prepareVideo();
        }.bind(this));
        this._loadingState = 'loading';
    };

    Sprite_Picture.prototype.prepareVideo = function() {
        if (!this.bitmap || !this.bitmap.setCurrentTime) {
            this._loadingState = 'error';
            if (this.picture()) {
                this.picture().setVideoWait(false);
            }
            return;
        }
        this._refresh();
        this._playStart = true;
        const picture = this.picture();
        if (picture) {
            if (picture._videoOnLoadSwitch) {
                $gameSwitches.setValue(picture._videoOnLoadSwitch, true);
            }
            this._volume = null;
            this.updateVideoVolume();
            this._frameCount = 0;
            this._loadingState = 'prepared';
        } else {
            this._loadingState = null;
        }
    };

    const _Sprite_Picture_updateBitmap = Sprite_Picture.prototype.updateBitmap;
    Sprite_Picture.prototype.updateBitmap = function() {
        if (!this.picture()) {
            this.destroyVideo();
        }
        _Sprite_Picture_updateBitmap.apply(this, arguments);
        this.updateVideo();
    };

    Sprite_Picture.prototype.updateVideo = function() {
        if (!this.isVideoPicture()) {
            return;
        }
        const picture = this.picture();
        if (picture.isNeedVideoReload()) {
            this.loadVideo();
        }
        const abLoopActive = !!picture._videoABLoopRange;
        if (!abLoopActive) {
            this.updateVideoFinish();
        }
        if (this._playStart) {
            if (this.bitmap.update) {
                this.bitmap.update();
            }
            this.updateVideoSpeed();
            this.updateVideoPause();
            this.updateVideoVolume();
            this.updateVideoLoop(abLoopActive);
            if (!abLoopActive) {
                this.updateVideoWaiting();
                this.updateVideoFrameLimit();
            }
            this.updateVideoTimeLimit(picture);
        }
    };

    const _Sprite_Picture_setBlendColor = Sprite_Picture.prototype.setBlendColor;
    Sprite_Picture.prototype.setBlendColor = function(color) {
        if (this.isVideoPicture()) {
            return;
        }
        _Sprite_Picture_setBlendColor.apply(this, arguments);
    };

    Sprite_Picture.prototype.updateVideoSpeed = function() {
        const speed = this.picture().getVideoSpeed() / 100;
        if (speed !== this._speed) {
            this._speed = speed;
            this.bitmap.setVideoSpeed(speed);
        }
    };

    Sprite_Picture.prototype.updateVideoPause = function() {
        const pause = this.picture().isVideoPause();
        if (this._pause && !pause) {
            this.bitmap.play();
        }
        if (!this._pause && pause) {
            this.bitmap.pause();
        }
        this._pause = pause;
    };

    Sprite_Picture.prototype.stopVideo = function() {
        if (this.isVideoPicture()) {
            this.bitmap.pause();
            this._pause = true;
        }
    };

    Sprite_Picture.prototype.updateVideoLoop = function(abLoopActive) {
        this.bitmap.setVideoLoop(!!abLoopActive || this.picture().isVideoLoop());
    };

    Sprite_Picture.prototype.updateVideoVolume = function() {
        const volume = this.picture().getVideoRealVolume();
        if (volume !== this._volume) {
            this._volume = volume;
            this.bitmap.setVolume(volume / 100);
        }
    };

    Sprite_Picture.prototype.updateVideoFinish = function() {
        const picture = this.picture();
        const finish = this.bitmap.isEnded();
        if (picture && finish && !picture.isVideoLoop()) {
            picture.onFinishVideo();
        }
        if (this.bitmap.isEnded() && param.autoEraseOnEnd) {
            this.eraseVideo();
        }
    };

    Sprite_Picture.prototype.updateVideoWaiting = function() {
        const picture = this.picture();
        // A paused or buffering video can keep the same currentTime for one or
        // more updates.  That does not mean a non-looping video has finished.
        if (picture && picture.isVideoWait() && !this.bitmap.isPlayingWait()) {
            picture.setVideoWait(false);
        }
    };

    Sprite_Picture.prototype.updateVideoFrameLimit = function() {
        if (!this._pause) {
            this._frameCount = (this._frameCount || 0) + 1;
        }
        const picture = this.picture();
        const limit = picture ? picture.getFrameLimit() : 0;
        if (limit > 0 && limit < this._frameCount) {
            if (picture.isVideoLoop()) {
                this.bitmap.setCurrentTime(0.01);
            } else {
                picture.setVideoEnd();
            }
            this._frameCount = 0;
        }
    };

    Sprite_Picture.prototype.updateVideoTimeLimit = function(picture) {
        picture = picture || this.picture();
        const range = picture && picture._videoABLoopRange;
        if (!range) {
            if (this._videoABLoopState) this._videoABLoopState = null;
            // Preserve the original time-limit path. No AB media/state reads.
            const limit = picture ? picture.getTimeLimit() : 0;
            if (limit > 0 && this.bitmap.getCurrentTime() >= limit) {
                if (picture.isVideoLoop()) {
                    this.bitmap.setCurrentTime(0);
                } else {
                    picture.setTimeLimit(0);
                    picture.setVideoPause(true);
                }
            }
            return;
        }
        if (!this._playStart || picture.isVideoPause() || this._pause) return;
        const bitmap = this.bitmap;
        const video = bitmap && bitmap._video;
        if (!video || video.seeking) return;
        let state = this._videoABLoopState;
        if (!state || state.bitmap !== bitmap || state.range !== range) {
            // Validate/cache the effective endpoint only when the range or
            // loaded bitmap changes, not on every playback update.
            if (video.readyState < 1) return;
            const duration = video.duration;
            if (!(duration > 0)) return;
            const end = Math.min(range.end, duration);
            if (!Number.isFinite(range.start) || !Number.isFinite(range.end) ||
                range.start < 0 || range.start >= end) {
                picture.clearVideoABLoop();
                this._videoABLoopState = null;
                this.updateVideoLoop(false);
                console.warn('MoviePicture: A–B 区间不在视频有效时长内，已关闭 A–B 循环。');
                return;
            }
            state = this._videoABLoopState = {
                bitmap: bitmap, range: range, end: end, duration: duration,
                time: null, pending: false
            };
        }
        const paused = video.paused;
        const ended = paused && video.ended;
        if (paused && !ended) return;
        const time = bitmap.getCurrentTime();
        if (!Number.isFinite(time)) return;
        if (state.pending) {
            state.pending = false;
            if (time < range.start - 0.05) {
                // Do not endlessly retry resource handlers that land at zero.
                picture.clearVideoABLoop();
                this._videoABLoopState = null;
                this.updateVideoLoop(false);
                console.warn('MoviePicture: 视频未能定位到 A 点，已关闭 A–B 循环。');
                return;
            }
        }
        // Detect native EOF wrapping between game updates, including A=0.
        if (state.end === state.duration && state.time !== null && time < state.time - 0.05) {
            picture.setVideoWait(false);
        }
        state.time = time;
        if (time < range.start || time >= state.end || ended) {
            const finishedLap = time >= state.end || ended;
            try {
                bitmap.setCurrentTime(range.start);
            } catch (error) {
                picture.clearVideoABLoop();
                this._videoABLoopState = null;
                this.updateVideoLoop(false);
                console.warn('MoviePicture: A–B 定位失败，已关闭 A–B 循环。', error);
                return;
            }
            state.pending = true;
            state.time = range.start;
            picture._ended = false;
            if (finishedLap) picture.setVideoWait(false);
            if (paused) bitmap.play(); // Resume only a naturally ended video.
        }
    };

    Sprite_Picture.prototype.eraseVideo = function() {
        this.destroyVideo();
        if (this.picture()) {
            $gameScreen.erasePicture(this._pictureId);
            this.visible = false;
        }
    };

    Sprite_Picture.prototype.saveVideoTimePosition = function() {
        const picture = this.picture();
        if (picture && this.isVideoPicture()) {
            picture.setVideoTimePosition(this.bitmap.getCurrentTime());
        }
    };

    Sprite_Picture.prototype.restoreVideoTimePosition = function() {
        const picture = this.picture();
        if (picture && this.isVideoPicture()) {
            this.bitmap.setCurrentTime(picture.getVideoTimePosition());
        }
    };

    Sprite_Picture.prototype.destroyVideo = function() {
        this._videoABLoopState = null;
        if (!this.isVideoPicture()) {
            return;
        }
        this.bitmap.destroy();
        this.texture = new PIXI.Texture(Sprite._emptyBaseTexture, new Rectangle());
        this._volume = null;
        this._speed = null;
        this._pause = null;
        this._frameCount = 0;
        this._playStart = false;
        this.bitmap = null;
    };

    Sprite_Picture.prototype.isVideoPicture = function() {
        return this.bitmap && this.bitmap.isVideo();
    };

    Sprite_Picture.prototype.isLoading = function() {
        return this._loadingState === 'loading';
    };

    Sprite_Picture.prototype.isPrepared = function() {
        return this._loadingState === 'prepared';
    };

    //=============================================================================
    // Spriteset_Base
    //=============================================================================
    Spriteset_Base.prototype.clearAllVideo = function() {
        this.findVideoList().forEach(picture => {
            picture.saveVideoTimePosition();
            picture.destroyVideo();
        });
    };

    Spriteset_Base.prototype.stopAllVideo = function() {
        this.findVideoList().forEach(picture => {
            picture.stopVideo();
        });
    };

    Spriteset_Base.prototype.findVideoList = function() {
        return this._pictureContainer.children.filter(picture => {
            return picture instanceof Sprite_Picture && picture.isVideoPicture();
        })
    };

    //=============================================================================
    // Scene_Base
    //=============================================================================
    const _Scene_Base_terminate = Scene_Base.prototype.terminate;
    Scene_Base.prototype.terminate = function() {
        this.clearAllVideo();
        _Scene_Base_terminate.apply(this, arguments);
    };

    Scene_Base.prototype.clearAllVideo = function() {
        if (this._spriteset) {
            this._spriteset.clearAllVideo();
        }
    };

    Scene_Base.prototype.stopAllVideo = function() {
        if (this._spriteset) {
            this._spriteset.stopAllVideo();
        }
    };

    //=============================================================================
    // Game_Temp
    //  MV 版 MoviePicture 自定义扩展里有 $gameTemp.clearVideoCache()，迁 MZ 时漏搬。
    //  MZ 架构下视频不存在独立的全局缓存：每张图片各自持有 Bitmap_Video，图片被
    //  擦除或场景切换时会自动 destroyVideo() 释放显存，因此不会像 MV 那样累积爆显存。
    //  这里把「已被擦除但精灵尚未更新」的视频立即销毁，等同 MV 版主动清无用缓存、
    //  提前释放显存的效果，且不会影响仍在显示中的视频图片。
    //=============================================================================
    Game_Temp.prototype.clearVideoCache = function() {
        // ① 销毁尚未被使用的预加载视频缓存（释放显存）
        ImageManager.clearVideoCache();
        // ② 立即回收「已被擦除但精灵尚未更新」的视频，不影响仍在显示中的视频图片
        const scene = SceneManager._scene;
        const spriteset = scene && scene._spriteset;
        if (!spriteset || !spriteset._pictureContainer) {
            return;
        }
        spriteset._pictureContainer.children.forEach(sprite => {
            if (sprite instanceof Sprite_Picture &&
                sprite.isVideoPicture && sprite.isVideoPicture() &&
                !sprite.picture()) {
                sprite.destroyVideo();
            }
        });
    };

    //=============================================================================
    // ImageManager
    //  動画の読み込みを追加定義します。
    //=============================================================================
    // 预加载缓存：path -> Bitmap_Video。preloadVideo 提前创建并缓冲视频，
    // loadVideo 命中后把所有权交给精灵（移出缓存），从而避免「换视频时旧贴图消失 1 帧」的闪烁。
    ImageManager._videoCache = {};

    ImageManager.loadVideo = function(filename, smooth, useAlpha) {
        if (!filename) {
            return this._emptyBitmap;
        }
        const loadClass = this.getVideoClass(useAlpha);
        const path = this.getVideoFilePath(filename);
        const cached = this._videoCache[path];
        // 命中预加载缓存：交接所有权给精灵（移出缓存），避免之后被 clearVideoCache 重复销毁；
        // 若缓存里的视频已被销毁、或类型不符（透明 Bitmap_DrawVideo / 非透明 Bitmap_Video），则忽略缓存重新创建。
        if (cached && cached.isVideo && cached.isVideo() && cached.constructor === loadClass) {
            delete this._videoCache[path];
            // 交接给精灵后取消预加载时的静音，由精灵的音量逻辑接管
            if (cached._video) {
                cached._video.muted = false;
            }
            return cached;
        }
        return new loadClass(path, smooth);
    };

    ImageManager.getVideoFilePath = function(filename) {
        if (this.isAbsoluteVideoPath(filename)) {
            return filename;
        }
        return this.getVideoFileFolder() + Utils.encodeURI(this.stripVideoExtension(filename)) + this.getVideoFileExt();
    };

    ImageManager.isAbsoluteVideoPath = function(filename) {
        return /^(?:[A-Z]:[\\/]|\/|file:|https?:)/i.test(String(filename || ''));
    };

    ImageManager.stripVideoExtension = function(filename) {
        return String(filename || '').replace(/\.(?:webm|mp4|nlch)$/i, '');
    };

    ImageManager.getVideoFileFolder = function() {
        return 'img/movies/';
    };

    ImageManager.getVideoFileExt = function() {
        return '.nlch';
    };

    ImageManager.getVideoClass = function(useAlpha) {
        return useAlpha ? Bitmap_DrawVideo : Bitmap_Video;
    };

    ImageManager.preloadVideo = function(filename, useAlpha) {
        if (!filename) {
            return this._emptyBitmap;
        }
        const loadClass = this.getVideoClass(useAlpha);
        const path = this.getVideoFilePath(filename);
        const cached = this._videoCache[path];
        if (cached && cached.isVideo && cached.isVideo() && cached.constructor === loadClass) {
            return cached;
        }
        // smooth 固定 true（与原实现一致），提前创建并开始缓冲，存入预加载缓存。
        const bitmap = new loadClass(path, true);
        // 预加载期间 autoplay 会让视频提前隐形播放，先静音，避免画面未出现就响起声音；
        // 被 loadVideo 交接给精灵时再取消静音。
        if (bitmap._video) {
            bitmap._video.muted = true;
        }
        this._videoCache[path] = bitmap;
        return bitmap;
    };

    // 销毁所有「预加载但尚未被使用」的视频缓存，释放显存（供 $gameTemp.clearVideoCache 调用）。
    ImageManager.clearVideoCache = function() {
        const cache = this._videoCache;
        Object.keys(cache).forEach(key => {
            const bitmap = cache[key];
            if (bitmap && bitmap.destroy) {
                bitmap.destroy();
            }
            delete cache[key];
        });
    };

    // 查询某视频是否已预加载完毕（缓冲就绪）。供事件「预加载→等待就绪→显示」流程做条件判断。
    ImageManager.isVideoPreloaded = function(filename, useAlpha) {
        if (!filename) {
            return false;
        }
        const loadClass = this.getVideoClass(useAlpha);
        const path = this.getVideoFilePath(filename);
        const cached = this._videoCache[path];
        return !!(cached && cached.constructor === loadClass && cached.isLoaded && cached.isLoaded());
    };

    //=============================================================================
    // SceneManager
    //  戦闘開始時にマップピクチャが一瞬読み込まれてしまう現象を回避します
    //=============================================================================
    SceneManager.isBattleStartUnexpectedLoad = function() {
        return this._scene instanceof Scene_Battle && !$gameParty.inBattle();
    };

    //=============================================================================
    // AudioManager
    //  動画ピクチャの音量を取得します。
    //=============================================================================
    AudioManager._movieVolumePropertyMap = {
        BGM: 'bgmVolume',
        BGS: 'bgsVolume',
        ME: 'meVolume',
        SE: 'seVolume',
        VOICE: 'voiceVolume'
    };

    AudioManager.getVideoPictureVolume = function(volumeType) {
        const property = this._movieVolumePropertyMap[volumeType || param.movieVolumeType];
        return Video._volume * (this.hasOwnProperty(property) ? this[property] / 100 : 1.0);
    };

    const _SceneManager_updateScene = SceneManager.updateScene;
    SceneManager.updateScene = function() {
        _SceneManager_updateScene.apply(this, arguments);
        if (this._scene && !this.isGameActive()) {
            this._scene.stopAllVideo();
        }
    };

    //=============================================================================
    // Bitmap
    //  動画かどうかを判定します。
    //=============================================================================
    Bitmap.prototype.isVideo = function() {
        return false;
    };

    /**
     * Bitmap_Video
     * 動画ビットマップクラスです。
     * @constructor
     */
    function Bitmap_Video() {
        this.initialize.apply(this, arguments);
    }

    Bitmap_Video.prototype = Object.create(Bitmap.prototype);
    Bitmap_Video.prototype.constructor = Bitmap_Video;

    Bitmap_Video.prototype.initialize = function(url, smooth) {
        Bitmap.prototype.initialize.call(this);
        this._createCanvas(1, 1);
        this.smooth = smooth;
        this._requestVideo(url);
        this._prevCurrentTime = 0;
    };

    Bitmap_Video.prototype.isVideo = function() {
        return !!this._video;
    };

    Bitmap_Video.prototype.setVolume = function(volume) {
        const value = Number(volume);
        this._video.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
    };

    Bitmap_Video.prototype.pause = function() {
        if (this.isLoaded()) {
            this._video.pause();
        }
    };

    Bitmap_Video.prototype.play = function() {
        if (!this._video) {
            return;
        }
        // A new play request means a previously latched ended event is stale.
        // This is especially important when playback resumes after a time limit.
        this._ended = false;
        const result = this._video.play();
        if (result && result.catch) {
            result.catch(error => {
                if (!error || !/interrupted|abort/i.test(error.message || '')) {
                    console.error(error);
                }
            });
        }
    };

    const _Bitmap_Video_destroy = Bitmap_Video.prototype.destroy;
    Bitmap_Video.prototype.destroy = function() {
        if (this.isReady()) {
            this.pause();
            this._video = null;
        } else {
            this._loadingDestory = true;
            return;
        }
        _Bitmap_Video_destroy.apply(this, arguments);
    };

    Bitmap_Video.prototype._requestVideo = function(url) {
        this._createVideo(url);
        this._createVideoBaseTexture();
        this._loadingState = 'requesting';
    };

    Bitmap_Video.prototype._createVideo = function(url) {
        this._video = document.createElement('video');
        this._video.src = url;
        this._video.addEventListener('canplaythrough', this._loadListener = this._onLoad.bind(this));
        this._video.addEventListener('ended', this._endedListener = this._onEnded.bind(this));
        this._video.addEventListener('error', this._errorListener = this._onError.bind(this));
        this._video.load();
        this._video.autoplay = true;
    };

    Bitmap_Video.prototype._createVideoBaseTexture = function() {
        const scaleMode = this.smooth ? PIXI.SCALE_MODES.LINEAR : PIXI.SCALE_MODES.NEAREST;
        this._baseTexture = PIXI.Texture.from(this._video, {scaleMode: scaleMode});
    };

    Bitmap_Video.prototype._onLoad = function() {
        this._loadingState = 'loaded';
        if (!this._video) {
            return;
        }
        if (this._loadingDestory) {
            this.destroy();
            return;
        }
        const width = this._video.videoWidth;
        const height = this._video.videoHeight;
        this.resize(width, height);
        this._callLoadListeners();
    };

    Bitmap_Video.prototype._onEnded = function() {
        if (!this._video || !this._video.loop) {
            this._ended = true;
        }
    };

    Bitmap_Video.prototype.isLoaded = function() {
        return this._video && this._loadingState === 'loaded';
    };

    Bitmap_Video.prototype._onError = function() {
        const video = this._video;
        if (video) {
            video.removeEventListener('canplaythrough', this._loadListener);
            video.removeEventListener('ended', this._endedListener);
            video.removeEventListener('error', this._errorListener);
        }
        this._loadingState = 'error';
    };

    Bitmap_Video.prototype.isPlayingWait = function() {
        if (this._video.loop) {
            return this.isFirstLap();
        } else {
            return !this.isEnded();
        }
    };

    Bitmap_Video.prototype.isFirstLap = function() {
        const time = this._video.currentTime;
        if (this._prevCurrentTime >= time) {
            return false;
        }
        this._prevCurrentTime = time;
        return true;
    };

    Bitmap_Video.prototype.isEnded = function() {
        const video = this._video;
        if (!video) {
            return !!this._ended;
        }
        // `_ended` is latched by the ended event.  A seek or resumed playback
        // can make that latch stale while the native element is active again.
        if (this._ended && !video.ended && video.currentTime < video.duration) {
            this._ended = false;
        }
        return !!(this._ended || (!video.loop && video.ended));
    };

    Bitmap_Video.prototype.setVideoLoop = function(loop) {
        this._video.loop = loop;
    };

    Bitmap_Video.prototype.setCurrentTime = function(value) {
        this._ended = false;
        this._video.currentTime = value;
    };

    Bitmap_Video.prototype.getCurrentTime = function() {
        return this._video.currentTime;
    };

    Bitmap_Video.prototype.setVideoSpeed = function(value) {
        this._video.playbackRate = value;
    };

    /**
     * Bitmap_DrawVideo
     * 透明動画用に、video要素をCanvasへ描画する動画ビットマップです。
     * MV改造版で使われていた透明動画経路だけをMZ版へ移植しています。
     * @constructor
     */
    function Bitmap_DrawVideo() {
        this.initialize.apply(this, arguments);
    }

    Bitmap_DrawVideo.prototype = Object.create(Bitmap_Video.prototype);
    Bitmap_DrawVideo.prototype.constructor = Bitmap_DrawVideo;

    Bitmap_DrawVideo.prototype._createVideoBaseTexture = function() {
        // Bitmap側のCanvasテクスチャを使うため、PIXIのVideoTextureは作らない。
    };

    Bitmap_DrawVideo.prototype.update = function() {
        if (!this.isLoaded() || !this._video || !this._context) {
            return;
        }
        const time = this.getCurrentTime();
        const wrapped = this._lastDrawTime != null && this._lastDrawTime > 0.1 && time < 0.05;
        this._lastDrawTime = time;
        if (!wrapped && this.isHalfRefreshRateSize() && Graphics.frameCount % 2 !== 0) {
            return;
        }
        this.clear();
        this._context.drawImage(this._video, 0, 0, this.width, this.height);
        this._baseTexture.update();
    };

    Bitmap_DrawVideo.prototype.isHalfRefreshRateSize = function() {
        return false;
        //return this.width * this.height > 1000000;
    };
})();

//=============================================================================
// MoviePicture 无闪烁切换补丁（双缓冲 overlap）
//   问题：原 Sprite_Picture.loadVideo 切换/重载视频时先 destroyVideo()（旧贴图
//        变空白），再挂上尚未画好首帧的新视频 → 出现 1 帧空白闪烁，连播差分尤甚
//        （透明视频 Bitmap_DrawVideo 最严重，纹理要等下一帧 drawImage 才有内容）。
//   修法：不立刻销毁旧贴图。后台把新视频取到（命中插件已有的预加载缓存则直接用）、
//        seek 到目标帧、等"该帧已画进纹理"(seeked / requestVideoFrameCallback，
//        带超时兜底)，再原子交换 this.bitmap，随后才 destroy 旧的。交换前旧视频
//        当前帧一直显示 → 零空白。
//   安全：单个 pending（非无界缓存）；交换后必 destroy 旧的、中止/擦除/场景结束
//        必 destroy pending → 不泄漏显存；overlap 期间静音新视频，避免音频抢跑。
//=============================================================================
(() => {
    'use strict';
    if (typeof Sprite_Picture === 'undefined') { return; }
    const SP = Sprite_Picture.prototype;

    function setMuted(bmp, muted) {
        if (bmp && bmp._video) { try { bmp._video.muted = muted; } catch (e) {} }
    }

    // seek 到 seekTo 并等"该帧已可显示"后回调。
    //   seeked（暂停态也触发）+ requestVideoFrameCallback（播放态）+ 超时，三重保险；
    //   回调前刷新一次纹理，确保该帧进 GL。
    function seekAndWaitFrame(bmp, seekTo, cb) {
        const v = bmp && bmp._video;
        const paint = () => {
            try { if (bmp.update) bmp.update(); } catch (e) {}
            try { if (bmp._baseTexture && bmp._baseTexture.update) bmp._baseTexture.update(); } catch (e) {}
        };
        if (!v) { paint(); cb(); return; }
        let done = false;
        const finish = () => { if (done) { return; } done = true; paint(); cb(); };
        const onSeeked = () => { try { v.removeEventListener('seeked', onSeeked); } catch (e) {} finish(); };
        try { v.addEventListener('seeked', onSeeked, { once: true }); } catch (e) {}
        if (typeof v.requestVideoFrameCallback === 'function') {
            try { v.requestVideoFrameCallback(() => finish()); } catch (e) {}
        }
        setTimeout(finish, 150);
        try {
            if (bmp.setCurrentTime) { bmp.setCurrentTime(seekTo); }
            else { v.currentTime = seekTo; }
        } catch (e) { finish(); }
    }

    SP._mpCancelPending = function() {
        const pend = this._mpPendingVideo;
        if (pend && pend !== this.bitmap) { try { pend.destroy(); } catch (e) {} }
        this._mpPendingVideo = null;
        this._mpFreeze = null;
    };

    SP.loadVideo = function() {
        if (SceneManager.isBattleStartUnexpectedLoad()) { return; }
        const pic = this.picture();
        if (!pic) { return; }

        const newBmp = ImageManager.loadVideo(this._pictureName, pic.isVideoSmooth(), pic.isVideoUseAlpha());
        pic.clearNeedVideoReload();

        // 同一资源（同名 reload）：就是当前 bitmap，回到起点即可，不做 overlap
        if (newBmp === this.bitmap) {
            this.restoreVideoTimePosition();
            this.prepareVideo();
            return;
        }

        this._mpCancelPending();                              // 取消上一个未完成切换
        const oldBmp = this.isVideoPicture() ? this.bitmap : null;
        this._mpPendingVideo = newBmp;
        this._mpOldVideo = oldBmp;
        this._loadingState = 'loading';
        setMuted(newBmp, true);                               // overlap 期间静音新视频

        // 冻结切换前的几何（坐标/原点/缩放）。此刻 updateBitmap 早于 updatePosition，
        //   this.x/y 仍是旧值。pending 期间保持旧内容停在旧位置，避免"旧图被新坐标
        //   带走"的 1 帧偏移；等 commit 时连同新内容一起切到新几何，做到原子。
        this._mpFreeze = {
            x: this.x, y: this.y,
            ax: this.anchor.x, ay: this.anchor.y,
            sx: this.scale.x, sy: this.scale.y
        };

        const targetTime = pic.getVideoTimePosition() || 0;
        const seekTo = targetTime > 0 ? targetTime : 0.01;

        const commit = () => {
            if (this._mpPendingVideo !== newBmp) { return; }  // 被更新的切换取代
            if (!this.picture()) { this._mpCancelPending(); this._mpOldVideo = null; return; }
            this._mpPendingVideo = null;
            this.bitmap = newBmp;                             // 原子交换
            setMuted(newBmp, false);                          // 交换时恢复声音（音量由 updateVideoVolume 接管）
            this.prepareVideo();
            // 释放几何冻结，并立刻把新内容切到当前（新）几何 → 内容与坐标同帧切换
            this._mpFreeze = null;
            if (this.visible && this.picture()) {
                this.updateOrigin();
                this.updatePosition();
                this.updateScale();
            }
            // 建立正确的播放/暂停态并同步 this._pause。
            //   overlap 期间 updateVideo 被短路、updateVideoPause 没跑过，this._pause
            //   会与图片暂停态错位 → 切换后可能卡在暂停帧，且之后 setVideoPause(false)
            //   因缺少 true→false 跳变而无法恢复。这里按图片当前暂停态显式 play()/pause()
            //   并对齐 this._pause，不再依赖边沿跳变。
            const pausedNow = !!(this.picture() && this.picture().isVideoPause());
            try { if (pausedNow) { newBmp.pause(); } else { newBmp.play(); } } catch (e) {}
            this._pause = pausedNow;
            const old = this._mpOldVideo;
            this._mpOldVideo = null;
            if (old && old !== newBmp) { try { old.destroy(); } catch (e) {} }  // 交换后才释放旧的
        };

        const onReady = () => {
            if (this._mpPendingVideo !== newBmp) { return; }
            seekAndWaitFrame(newBmp, seekTo, commit);
        };

        if (newBmp.isLoaded && newBmp.isLoaded()) {
            onReady();
        } else {
            newBmp.addLoadListener(onReady);
        }
    };

    // overlap 期间：保留旧视频显示并刷新其帧，但不跑会改状态的收尾逻辑
    const _updateVideo = SP.updateVideo;
    SP.updateVideo = function() {
        if (this._mpPendingVideo && this.bitmap && this.bitmap !== this._mpPendingVideo) {
            try { if (this.bitmap.update) { this.bitmap.update(); } } catch (e) {}
            return;
        }
        _updateVideo.apply(this, arguments);
    };

    // overlap 期间冻结几何（坐标/原点/缩放）：旧内容停在旧位置，避免"旧图被新坐标
    //   带走"的 1 帧偏移；commit 时连同新内容一起切到新几何。
    // ★ 关键：Drill_CoreOfPicture / DP_MapZoom 也覆盖了这三个方法且加载更晚，会顶掉
    //   本补丁（实测 updatePosition/updateOrigin 被覆盖）。故用幂等 installFreeze()，
    //   并在 Scene_Boot.create（所有插件加载完之后）再装一次，使本冻结包在它们外层；
    //   非冻结时委托回它们的版本，不影响其功能。
    const FREEZE_APPLY = {
        updatePosition: function(fz) { this.x = fz.x; this.y = fz.y; },
        updateOrigin:   function(fz) { this.anchor.x = fz.ax; this.anchor.y = fz.ay; },
        updateScale:    function(fz) { this.scale.x = fz.sx; this.scale.y = fz.sy; }
    };
    function installFreeze() {
        Object.keys(FREEZE_APPLY).forEach(m => {
            const cur = SP[m];
            if (!cur || cur._mpFreezeWrapped) { return; }   // 已是本补丁的包装则跳过
            const apply = FREEZE_APPLY[m];
            const wrapped = function() {
                const fz = this._mpFreeze;
                if (fz) { apply.call(this, fz); return; }    // 冻结期间强制保持旧几何
                return cur.apply(this, arguments);           // 否则委托回 Drill/DP/核心
            };
            wrapped._mpFreezeWrapped = true;
            SP[m] = wrapped;
        });
    }
    installFreeze();                                          // 立即装一次（可能被 Drill/DP 顶掉）
    const _Scene_Boot_create = Scene_Boot.prototype.create;
    Scene_Boot.prototype.create = function() {
        _Scene_Boot_create.apply(this, arguments);
        installFreeze();                                     // 所有插件加载后再装 → 成为最外层
    };

    // 擦除/场景结束：一并清理未完成 pending
    const _destroyVideo = SP.destroyVideo;
    SP.destroyVideo = function() {
        this._mpCancelPending();
        this._mpOldVideo = null;
        _destroyVideo.apply(this, arguments);
    };

    // 兜底：场景结束时对所有图片精灵清 pending（覆盖"首次显示加载中"的边角情况）
    const _clearAllVideo = Spriteset_Base.prototype.clearAllVideo;
    Spriteset_Base.prototype.clearAllVideo = function() {
        const cont = this._pictureContainer;
        if (cont && cont.children) {
            cont.children.forEach(sp => {
                if (sp && sp._mpCancelPending) { sp._mpCancelPending(); sp._mpOldVideo = null; }
            });
        }
        _clearAllVideo.apply(this, arguments);
    };
})();

//=============================================================================
// 可选视频预热：只操作尚在 ImageManager 缓存中的资源。
// 基线：f394b4e（追加首帧/GPU预热之前）。上方原播放代码保持原样。
// 不添加显示等待，不改变视频播放/暂停/定位，不提前通知 Bitmap 加载完成。
//=============================================================================
(() => {
    'use strict';
    const WARMUP_TIMEOUT_MS = 5000; // 读取就绪和 GPU 排队合计的后台尝试期限。
    const CHECK_INTERVAL_MS = 50;
    const jobs = new WeakMap();
    const originalPreload = ImageManager.preloadVideo;
    const originalLoad = ImageManager.loadVideo;
    const originalClear = ImageManager.clearVideoCache;

    const owns = job => !!(job.bitmap && ImageManager._videoCache[job.path] === job.bitmap);
    const mediaFailed = bitmap => !bitmap._video || bitmap.isError() || !!bitmap._video.error;
    const getBaseTexture = bitmap => {
        const texture = bitmap.baseTexture;
        // 基线的原生视频持有 Texture，透明视频持有 BaseTexture；保留两者原来的类型。
        return texture && texture.castToBaseTexture ? texture.castToBaseTexture() : texture;
    };
    const finish = (job, uploaded) => {
        if (!job.active) return;
        job.active = false;
        clearTimeout(job.timer);
        clearTimeout(job.pollTimer);
        clearTimeout(job.workTimer);
        const queued = job.queueTask;
        job.queueTask = null;
        if (queued && typeof queued.cancel === 'function') {
            try { queued.cancel(); } catch (error) {
                console.warn('MoviePicture: 撤销 GPU 预热队列任务失败', job.path, error);
            }
        }
        const bitmap = job.bitmap;
        bitmap._videoPreloadFinished = true;
        bitmap._videoGpuPreloaded = !!uploaded;
        job.resolve(bitmap);
        // 迟到的共享队列任务只持有已取消的空 job，不再持有显示中的视频。
        job.bitmap = null;
        job.resolve = null;
    };

    // 只用于放弃仍由预加载缓存持有的资源，不覆盖 Bitmap_Video.destroy。
    const discardCached = (path, bitmap) => {
        if (ImageManager._videoCache[path] !== bitmap) return;
        delete ImageManager._videoCache[path];
        try {
            const video = bitmap._video;
            if (video) {
                video.removeEventListener('canplaythrough', bitmap._loadListener);
                video.removeEventListener('ended', bitmap._endedListener);
                video.removeEventListener('error', bitmap._errorListener);
                // 本项目 PIXI 6 的 VideoResource.dispose 不解绑这些回调。
                // 未就绪缓存被释放后，迟到的媒体事件不能再访问已销毁的 resource。
                const base = getBaseTexture(bitmap);
                const resource = base && base.resource;
                if (resource instanceof PIXI.VideoResource) {
                    video.removeEventListener('canplay', resource._onCanPlay);
                    video.removeEventListener('canplaythrough', resource._onCanPlay);
                }
                video.pause();
                video.removeAttribute('src');
                video.load();
            }
            bitmap._video = null;
            bitmap._loadListeners.length = 0;
            // Texture.destroy 默认不会释放其 BaseTexture；缓存独占时一并释放。
            if (bitmap._baseTexture instanceof PIXI.Texture) {
                bitmap._baseTexture.destroy(true);
                bitmap._baseTexture = null;
            }
            Bitmap.prototype.destroy.call(bitmap);
        } catch (error) {
            console.warn('MoviePicture: 释放未使用的预加载资源失败', path, error);
        }
    };

    const upload = job => {
        if (!job.active || !owns(job) || Date.now() >= job.deadline) return false;
        const bitmap = job.bitmap;
        const video = bitmap._video;
        if (mediaFailed(bitmap) || !bitmap.isLoaded() || video.seeking || video.readyState < 2 ||
            !video.videoWidth || !video.videoHeight) return false;
        const renderer = Graphics.app && Graphics.app.renderer;
        const base = getBaseTexture(bitmap);
        if (!renderer || !renderer.texture || !renderer.texture.bind ||
            (renderer.context && renderer.context.isLost) || !base || !base.valid || base.destroyed) return false;
        // 透明视频按基线方式画一帧；原生视频更新既有 VideoResource。
        // 只预热当下可用帧和纹理分配，显示时仍由原播放流程决定定位与刷新。
        if (bitmap.update) bitmap.update();
        else if (bitmap.baseTexture.update) bitmap.baseTexture.update();
        renderer.texture.bind(base, 0);
        return true;
    };

    const check = job => {
        if (!job.active) return;
        try {
            if (!owns(job) || Date.now() >= job.deadline) { finish(job, false); return; }
            const bitmap = job.bitmap;
            if (mediaFailed(bitmap)) {
                finish(job, false);
                discardCached(job.path, bitmap);
                return;
            }
            const video = bitmap._video;
            if (!bitmap.isLoaded() || video.readyState < 2 || video.seeking ||
                !video.videoWidth || !video.videoHeight) {
                job.pollTimer = setTimeout(() => check(job), CHECK_INTERVAL_MS);
                return;
            }
            const enqueue = ImageManager._enqueueGpuWarmup;
            const failed = error => {
                if (!job.active) return;
                console.warn('MoviePicture: 跳过本次 GPU 预热', job.path, error);
                finish(job, false);
            };
            if (enqueue) {
                job.queueTask = enqueue(() => upload(job));
                Promise.resolve(job.queueTask).then(result => finish(job, result), failed);
            } else {
                job.workTimer = setTimeout(() => {
                    try { finish(job, upload(job)); } catch (error) { failed(error); }
                }, 16);
            }
        } catch (error) {
            console.warn('MoviePicture: 跳过本次视频预热', job.path, error);
            finish(job, false);
        }
    };

    ImageManager.preloadVideo = function(filename, useAlpha) {
        let bitmap;
        try {
            if (filename) {
                const path = this.getVideoFilePath(filename);
                const cached = this._videoCache[path];
                const pending = cached && jobs.get(cached);
                if (pending && (mediaFailed(cached) || cached.constructor !== this.getVideoClass(useAlpha))) {
                    finish(pending, false);
                    discardCached(path, cached);
                }
            }
            bitmap = originalPreload.apply(this, arguments);
            if (!filename || !bitmap || !bitmap._video) return bitmap;
            const previous = jobs.get(bitmap);
            if (previous && (previous.active || bitmap._videoGpuPreloaded)) return bitmap;
            const path = this.getVideoFilePath(filename);
            if (this._videoCache[path] !== bitmap) return bitmap;
            const job = { bitmap, path, active: true, deadline: Date.now() + WARMUP_TIMEOUT_MS };
            jobs.set(bitmap, job);
            bitmap._videoPreloadFinished = false;
            bitmap._videoGpuPreloaded = false;
            bitmap._videoPreloadPromise = new Promise(resolve => { job.resolve = resolve; });
            job.timer = setTimeout(() => finish(job, false), WARMUP_TIMEOUT_MS);
            job.pollTimer = setTimeout(() => check(job), 0);
        } catch (error) {
            console.warn('MoviePicture: 视频预加载未完成，显示仍可使用普通加载', filename, error);
        }
        return bitmap || this._emptyBitmap;
    };

    ImageManager.loadVideo = function(filename, smooth, useAlpha) {
        if (filename) {
            const path = this.getVideoFilePath(filename);
            const bitmap = this._videoCache[path];
            const job = bitmap && jobs.get(bitmap);
            if (job) {
                // 只撤销缓存的后台任务；不等待任务，不改变交给原加载器的视频状态。
                finish(job, false);
                if (mediaFailed(bitmap) || bitmap.constructor !== this.getVideoClass(useAlpha)) {
                    discardCached(path, bitmap);
                }
            }
        }
        return originalLoad.apply(this, arguments);
    };

    ImageManager.clearVideoCache = function() {
        Object.keys(this._videoCache).forEach(path => {
            const bitmap = this._videoCache[path];
            const job = bitmap && jobs.get(bitmap);
            if (job) {
                finish(job, false);
                discardCached(path, bitmap);
            }
        });
        return originalClear.apply(this, arguments);
    };
})();
