//=============================================================================
// ImageSmoothSetting.js
// ----------------------------------------------------------------------------
// (C)2017 Triacontane
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 2.2.1 2024/12/04 視差ゼロ遠景用の設定がオブジェクトキャラクターにも適用されていた問題を修正
// 2.2.0 2022/10/07 視差ゼロ遠景に個別のぼかし設定ができる機能を追加
// 2.1.0 2021/03/10 システム画像に対するぼかし設定を追加
// 2.0.0 2021/01/23 MZで動作するよう修正
// 1.1.0 2017/06/24 テキストなど動的画像のぼかし設定を追加
// 1.0.0 2017/02/24 初版
// ----------------------------------------------------------------------------
// [Blog]   : https://triacontane.blogspot.jp/
// [Twitter]: https://twitter.com/triacontane/
// [GitHub] : https://github.com/triacontane/
//=============================================================================

/*:
 * @plugindesc 画像ぼかし個別設定プラグイン
 * @target MZ
 * @url https://github.com/triacontane/RPGMakerMV/tree/mz_master/ImageSmoothSetting.js
 * @base PluginCommonBase
 * @author トリアコンタン
 *
 * @param BattleBack
 * @text 戦闘背景
 * @desc 戦闘背景画像(戦闘背景1、戦闘背景2)にぼかしをかけます。
 * @default true
 * @type boolean
 *
 * @param Battler
 * @text バトラー
 * @desc バトラー画像(アクター、敵キャラ)にぼかしをかけます。
 * @default true
 * @type boolean
 *
 * @param Face
 * @text フェイス
 * @desc フェイス画像にぼかしをかけます。
 * @default true
 * @type boolean
 *
 * @param Parallax
 * @text 遠景
 * @desc 遠景画像にぼかしをかけます。
 * @default true
 * @type boolean
 *
 * @param ZeroParallax
 * @text 視差ゼロ遠景
 * @desc 視差ゼロの遠景画像にぼかしをかけます。
 * @default true
 * @type boolean
 *
 * @param Picture
 * @text ピクチャ
 * @desc ピクチャ画像にぼかしをかけます。
 * @default true
 * @type boolean
 *
 * @param Title
 * @text タイトル
 * @desc タイトル画像(タイトル画像1、タイトル画像2)にぼかしをかけます。
 * @default true
 * @type boolean
 *
 * @param Character
 * @text キャラクター
 * @desc キャラクター画像にぼかしをかけます。
 * @default true
 * @type boolean
 *
 * @param System
 * @text システム
 * @desc システム画像にぼかしをかけます。
 * @default true
 * @type boolean
 *
 * @param DynamicImage
 * @text 動的画像
 * @desc ウィンドウの文字など動的に作成した画像にぼかしをかけます。
 * @default true
 * @type boolean
 *
 * @help 画像を拡大したときに「ぼかし」(Scale Mode:LINEAR)を入れて
 * 表示するかどうかを画像種別ごとに設定できます。
 * 「ぼかし」処理を行わないとくっきり映りますが、ドットが見えます。
 *
 * また「ぼかし」が有効の場合、キャラクター画像やシステム画像のように
 * スプライトシートや複数のパーツをひとつの画像にまとめていて、
 * かつパーツの境界付近が透過色でない場合、
 * ぼかしを入れることで画像の端にゴミのようなものが表示される場合があります。
 *
 * RPGツクールMZのデフォルトでは全ての画像に「ぼかし」が入ります。
 *
 *  ピクセルパーフェクト描画（PIXI NEAREST / ROUND_PIXELS / canvas image-rendering）と、
 *  img/pictures 配下（サブフォルダ含む）のみ平滑にする処理を本プラグインに統合しました。
 *  画面全体のキャンバス最終拡大の平滑は、イベントの「スクリプト」で手動切替できます：
 *      canvasSmooth(true)   // 全画面 2D 立絵演出の前：画布切平滑
 *      canvasSmooth(false)  // 演出後：画布切回像素级（必ず対で呼ぶこと）
 *  ※Picture を true にしておくと img/pictures 配下が LINEAR 平滑になります。
 *  ※DynamicImage は false 推奨（地図/タイルのドット感を保つため）。
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

    //=============================================================================
    // ImageManager
    //  画像種別ごとにぼかしを個別設定可能にします。
    //=============================================================================
    ImageManager._smoothMap = {
        'img/battlebacks1/': param.BattleBack,
        'img/battlebacks2/': param.BattleBack,
        'img/enemies/'     : param.Battler,
        'img/characters/'  : param.Character,
        'img/faces/'       : param.Face,
        'img/parallaxes/'  : param.Parallax,
        // 'img/pictures/' 改由下方 Bitmap.load 的 URL 钩子统一处理(覆盖 living_room 等子目录、
        //   动作序列把整段子目录当 folder 传、以及 QJ 直接 Bitmap.load 等精确匹配漏判的情况)。
        'img/sv_actors/'   : param.Battler,
        'img/sv_enemies/'  : param.Battler,
        'img/titles1/'     : param.Title,
        'img/titles2/'     : param.Title,
        'img/system/'      : param.System,
        'img/movies/'      : true,
        'img/Menu__picturegallery/'      : true,
        'img/Special__actionSeq/'        : false,
    };

    const _ImageManager_loadBitmap = ImageManager.loadBitmap;
    ImageManager.loadBitmap      = function(folder, filename) {
        const bitmap = _ImageManager_loadBitmap.apply(this, arguments);
        if (this._smoothMap.hasOwnProperty(folder)) {
            if (this.isZeroParallax(filename) && folder === 'img/parallaxes/') {
                bitmap.smooth = param.ZeroParallax;
            } else {
                bitmap.smooth = this._smoothMap[folder];
            }
        }
        return bitmap;
    };

    //=============================================================================
    // Bitmap
    //  動的作成画像にぼかしを設定可能にします。
    //=============================================================================
    const _Bitmap_initialize      = Bitmap.prototype.initialize;
    Bitmap.prototype.initialize = function(width, height) {
        _Bitmap_initialize.apply(this, arguments);
        // 全图像默认值 = DynamicImage。像素级表现依赖此项为 false（地图块 img/tilesets 不在
        //   _smoothMap 里，靠这个默认值保持 NEAREST），请勿改为 true。
        this.smooth = param.DynamicImage;
    };

    //=============================================================================
    // ピクセルパーフェクト描画
    //  - 画面全体をニアレスト＝ドット表示（PIXI NEAREST / ROUND_PIXELS / canvas image-rendering）
    //  - img/pictures 配下（サブフォルダ含む）だけ Picture 設定に従って LINEAR 平滑
    //  - canvasSmooth(true/false) でキャンバス最終拡大の平滑を手動切替
    //    （Retina/非整数拡大では canvas image-rendering が最終段を支配するため、
    //     全画面 2D 立絵演出の前後で切り替える）
    //=============================================================================

    // 画布最终缩放是否平滑（状态记忆，窗口缩放/画布重建时自动沿用；不入存档）
    let _canvasSmooth = false;

    const setElementImageRendering = function(element) {
        if (element && element.style) {
            if (_canvasSmooth) {
                element.style.imageRendering = 'auto';               // 平滑（交回浏览器默认）
            } else {
                element.style.imageRendering = 'crisp-edges';
                element.style.imageRendering = '-moz-crisp-edges';
                element.style.imageRendering = 'pixelated';          // 像素级（默认）
            }
        }
    };

    const setPixelPerfectOnPIXI = function() {
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
        PIXI.settings.ROUND_PIXELS = true;
    };
    setPixelPerfectOnPIXI();

    // --- Graphics：キャンバス／body へ image-rendering を適用 ---
    const _Graphics_createCanvas = Graphics._createCanvas;
    Graphics._createCanvas = function() {
        _Graphics_createCanvas.call(this);
        setElementImageRendering(document.body);
        setElementImageRendering(this._canvas);
    };

    const _Graphics_updateCanvas = Graphics._updateCanvas;
    Graphics._updateCanvas = function() {
        _Graphics_updateCanvas.call(this);
        setElementImageRendering(document.body);
        setElementImageRendering(this._canvas);
    };

    const _Graphics_onPixiSetup = Graphics.onPixiSetup;
    Graphics.onPixiSetup = function() {
        setPixelPerfectOnPIXI();
        _Graphics_onPixiSetup.call(this);
    };

    const _Graphics_createLoadingSpinner = Graphics._createLoadingSpinner;
    Graphics._createLoadingSpinner = function() {
        _Graphics_createLoadingSpinner.call(this);
        setElementImageRendering(this._loadingSpinner);
    };

    const _Graphics_centerElement = Graphics._centerElement;
    Graphics._centerElement = function(element) {
        _Graphics_centerElement.call(this, element);
        setElementImageRendering(element);
    };

    // --- Bitmap：テクスチャ生成時にソース要素へも適用（WebGL では実害なし） ---
    const _Bitmap_createBaseTexture = Bitmap.prototype._createBaseTexture;
    Bitmap.prototype._createBaseTexture = function(source) {
        if (source) setElementImageRendering(source);
        _Bitmap_createBaseTexture.call(this, source);
    };

    // --- Bitmap.load：全 URL ロードの唯一の総入口。img/pictures 配下 → Picture 設定で平滑 ---
    const _Bitmap_load = Bitmap.load;
    Bitmap.load = function(url) {
        const bitmap = _Bitmap_load.call(this, url);
        if (/\/pictures\//.test(url)) {
            bitmap.smooth = param.Picture;
        }
        return bitmap;
    };

    // --- 手動スイッチ：イベント「スクリプト」で canvasSmooth(true) / canvasSmooth(false) ---
    const setCanvasSmooth = function(smooth) {
        _canvasSmooth = !!smooth;
        setElementImageRendering(document.body);
        setElementImageRendering(Graphics._canvas);
    };
    window.canvasSmooth = setCanvasSmooth;
})();

