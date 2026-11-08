//=============================================================================
// TMPlugin - ビットマップ拡張
// バージョン: 2.0.2
// 最終更新日: 2017/06/30
// 配布元    : http://hikimoki.sakura.ne.jp/
//-----------------------------------------------------------------------------
// Copyright (c) 2016 tomoaky
// Released under the MIT license.
// http://opensource.org/licenses/mit-license.php
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 角丸の矩形や星を描画する機能を追加します。
 * 各種ゲージの形状を角丸矩形に自動変更する機能もあります。
 *
 * @author tomoaky (http://hikimoki.sakura.ne.jp/)
 *
 * @param gaugeHeight
 * @type number
 * @desc 角丸ゲージの太さ。
 * 初期値: 18
 * @default 18
 *
 * @param gaugeReduction
 * @type number
 * @desc ゲージ背景はそのままにゲージだけを縮小するサイズ。
 * 初期値: 2
 * @default 2
 *
 * @param cornerRadius
 * @type number
 * @desc 角丸ゲージの角丸部分の半径。
 * 初期値: 6
 * @default 6
 *
 * @param minGaugeRate
 * @type string
 * @desc 角丸ゲージの長さの下限値（cornerRadiusの倍率）。
 * 初期値: 1.5
 * @default 1.5
 *
 * @help
 * TMPlugin - ビットマップ拡張 ver2.0.2
 * 
 * 使い方:
 *
 *   このプラグインを導入すると、ＨＰやＭＰのゲージの形状が角丸の矩形に
 *   変更されます。また、Bitmapに複数のメソッドを追加します。
 *
 *   プラグインコマンドはありません。
 *
 *   このプラグインは RPGツクールMV Version 1.5.0 で動作確認をしています。
 *
 *   このプラグインはMITライセンスのもとに配布しています、商用利用、
 *   改造、再配布など、自由にお使いいただけます。
 *
 *
 * 追加されるメソッド（Bitmap）:
 *
 *   fillRoundRect(x, y, width, height, radius, color)
 *     座標(x, y)を左上として幅width、高さheightの角丸矩形を描画します、
 *     radiusは丸部分の半径、colorは塗りつぶす色を文字列で指定してください。
 *     例）bitmap.fillRoundRect(0, 0, 200, 48, 6, '#000000');
 *
 *   gradientFillRoundRect(x, y, width, height, radius, color1, color2, vertical)
 *     グラデーション付きの角丸矩形を描画します。verticalが真なら
 *     グラデーションの向きが縦方向になります。
 *
 *   fillStar(x, y, width, height, color)
 *     座標(x, y)を左上として幅width、高さheightの範囲に内接する星を
 *     描画します。
 *       例: bitmap.fillStar(0, 0, 48, 48, '#ffff00');
 *
 *   gradientFillStar(x, y, width, height, color1, color2, vertical)
 *     グラデーション付きの星を描画します。verticalが真ならグラデーションの向きが
 *     縦方向になります。
 *
 *
 * プラグインパラメータ補足:
 *
 *   gaugeReduction
 *     縮小するサイズはドット数で設定します。
 *
 *   cornerRadius
 *     この値が 0 の場合、ゲージの角丸矩形化が無効になります。
 *
 *   minGaugeRate
 *     角丸ゲージが短すぎる場合に表示が乱れるのを回避するために、ゲージが
 *     ここで設定した長さよりも短くならないようにします。
 *     cornerRadius の値にこの値を乗算したものが実際の下限値になります、
 *     基本的には初期値の 1.5 で問題ないはずですが、表示に違和感があれば
 *     調整してください。
 */

var Imported = Imported || {};
Imported.TMBitmapEx = true;

var TMPlugin = TMPlugin || {};
TMPlugin.BitmapEx = {};
TMPlugin.BitmapEx.Parameters = PluginManager.parameters('TMBitmapEx');
TMPlugin.BitmapEx.GaugeHeight    = +(TMPlugin.BitmapEx.Parameters['gaugeHeight'] || 18);
TMPlugin.BitmapEx.GaugeReduction = +(TMPlugin.BitmapEx.Parameters['gaugeReduction'] || 2);
TMPlugin.BitmapEx.CornerRadius   = +(TMPlugin.BitmapEx.Parameters['cornerRadius'] || 6);
TMPlugin.BitmapEx.MinGaugeRate   = +(TMPlugin.BitmapEx.Parameters['minGaugeRate'] || 1.5);
TMPlugin.BitmapEx.MinGaugeWidth  = Math.floor(TMPlugin.BitmapEx.MinGaugeRate *
                                              TMPlugin.BitmapEx.CornerRadius);

(function() {

  //-----------------------------------------------------------------------------
  // Bitmap
  //

  Bitmap.prototype.fillRoundRect = function(x, y, width, height, radius, color) {
    var context = this._context;
    var pi = Math.PI;
    context.save();
    context.fillStyle = color;
    context.beginPath();
    context.arc(x + radius, y + radius, radius, -pi, -0.5 * pi, false);
    context.arc(x + width - radius, y + radius, radius, -0.5 * pi, 0, false);
    context.arc(x + width - radius, y + height - radius, radius, 0, 0.5 * pi, false);
    context.arc(x + radius, y + height - radius, radius, 0.5 * pi, pi, false);
    context.fill();
    context.restore();
    this._setDirty();
  };

  Bitmap.prototype.gradientFillRoundRect = function(x, y, width, height, radius,
                                                    color1, color2, vertical) {
    var context = this._context;
    var pi = Math.PI;
    var grad = vertical ? context.createLinearGradient(x, y, x, y + height) :
               context.createLinearGradient(x, y, x + width, y);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    context.save();
    context.fillStyle = grad;
    context.beginPath();
    context.arc(x + radius, y + radius, radius, -pi, -0.5 * pi, false);
    context.arc(x + width - radius, y + radius, radius, -0.5 * pi, 0, false);
    context.arc(x + width - radius, y + height - radius, radius, 0, 0.5 * pi, false);
    context.arc(x + radius, y + height - radius, radius, 0.5 * pi, pi, false);
    context.fill();
    context.restore();
    this._setDirty();
  };

  Bitmap.prototype.fillStar = function(x, y, width, height, color) {
    var context = this._context;
    var pi = Math.PI;
    var cx = x + width / 2;
    var cy = y + height / 2;
    var r = pi + pi / 2;
    context.save();
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(Math.cos(r) * width / 2 + cx, Math.sin(r) * height / 2 + cy);
    for (var i = 0; i < 5; i++) {
      r += pi * 4 / 5;
      context.lineTo(Math.cos(r) * width / 2 + cx, Math.sin(r) * height / 2 + cy);
    }
    context.fill();
    context.restore();
    this._setDirty();
  };

  Bitmap.prototype.gradientFillStar = function(x, y, width, height, color1, color2,
                                               vertical) {
    var context = this._context;
    var pi = Math.PI;
    var cx = x + width / 2;
    var cy = y + height / 2;
    var r = pi + pi / 2;
    var grad = vertical ? context.createLinearGradient(x, y, x, y + height) :
               context.createLinearGradient(x, y, x + width, y);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    context.save();
    context.fillStyle = grad;
    context.beginPath();
    context.moveTo(Math.cos(r) * width / 2 + cx, Math.sin(r) * height / 2 + cy);
    for (var i = 0; i < 5; i++) {
      r += pi * 4 / 5;
      context.lineTo(Math.cos(r) * width / 2 + cx, Math.sin(r) * height / 2 + cy);
    }
    context.fill();
    context.restore();
    this._setDirty();
  };

  //-----------------------------------------------------------------------------
  // 弧形 / 半圆 充能条扩展
  //
  // drawArcGauge(cx, cy, radius, rate, options)
  //   在位图上以 (cx, cy) 为圆心画一条弧形充能条（轨道 + 进度）。
  //   cx, cy   圆心坐标（相对本 Bitmap）
  //   radius   弧的半径（到弧条中线）
  //   rate     进度 0~1
  //   options（均可选）:
  //     lineWidth   弧条粗细，默认 8
  //     startAngle  起始角度（度），默认 180（=左侧水平，配合 sweep 180 即为上半圆）
  //     sweepAngle  总扫过角度（度），默认 180（半圆）；360 为整圆
  //     clockwise   方向，true=顺时针填充，默认 true
  //     trackColor  轨道颜色，默认 'rgba(0,0,0,0.25)'
  //     color       进度纯色（与 color1/color2 二选一）
  //     color1,color2  进度渐变两端色（沿弧线方向）；提供则优先于 color
  //     cap         端头形状 'round'(默认) / 'butt' / 'square'
  //     showTrack   是否画轨道，默认 true
  //
  //   示例（上半圆，橙色渐变，充能 50%）：
  //     bmp.drawArcGauge(60, 60, 50, 0.5, {
  //       lineWidth: 8, startAngle: 180, sweepAngle: 180,
  //       color1: '#f1c40f', color2: '#e67e22'
  //     });
  Bitmap.prototype.drawArcGauge = function(cx, cy, radius, rate, options) {
    options = options || {};
    var ctx = this._context;
    var d2r = Math.PI / 180;
    var lineWidth  = options.lineWidth != null ? options.lineWidth : 8;
    var startDeg   = options.startAngle != null ? options.startAngle : 180;
    var sweepDeg   = options.sweepAngle != null ? options.sweepAngle : 180;
    var clockwise  = options.clockwise !== false;
    var trackColor = options.trackColor || 'rgba(0,0,0,0.25)';
    var cap        = options.cap || 'round';
    var showTrack  = options.showTrack !== false;

    rate = Math.max(0, Math.min(1, rate));
    var start = startDeg * d2r;
    var sweep = sweepDeg * d2r * (clockwise ? 1 : -1);

    ctx.save();
    ctx.lineCap = cap;
    ctx.lineWidth = lineWidth;

    // 轨道（完整弧）
    if (showTrack) {
      ctx.beginPath();
      ctx.strokeStyle = trackColor;
      ctx.arc(cx, cy, radius, start, start + sweep, !clockwise);
      ctx.stroke();
    }

    // 进度（按 rate 截取的弧）
    if (rate > 0) {
      var end = start + sweep * rate;
      if (options.color1 && options.color2) {
        // 沿弧的包围盒方向做线性渐变（近似沿弧线）
        var grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
        grad.addColorStop(0, options.color1);
        grad.addColorStop(1, options.color2);
        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = options.color || '#f1c40f';
      }
      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, end, !clockwise);
      ctx.stroke();
    }

    ctx.restore();
    this._setDirty();
  };

  //-----------------------------------------------------------------------------
  // Window_Base
  //

  var _Window_Base_drawGauge = Window_Base.prototype.drawGauge;
  Window_Base.prototype.drawGauge = function(x, y, width, rate, color1, color2) {
    if (TMPlugin.BitmapEx.CornerRadius > 0) {
      y = y + this.lineHeight() - TMPlugin.BitmapEx.GaugeHeight - 2;
      this.contents.fillRoundRect(x, y, width, TMPlugin.BitmapEx.GaugeHeight,
                                  TMPlugin.BitmapEx.CornerRadius, this.gaugeBackColor());
      var fillW = Math.floor((width - TMPlugin.BitmapEx.GaugeReduction * 2) * rate);
      if (fillW > 0) {
        fillW = Math.max(fillW, TMPlugin.BitmapEx.MinGaugeWidth);
        var fillH = TMPlugin.BitmapEx.GaugeHeight - TMPlugin.BitmapEx.GaugeReduction * 2
        this.contents.gradientFillRoundRect(x + TMPlugin.BitmapEx.GaugeReduction,
                                            y + TMPlugin.BitmapEx.GaugeReduction,
                                            fillW, fillH, TMPlugin.BitmapEx.CornerRadius,
                                            color1, color2);
      }
    } else {
      _Window_Base_drawGauge.call(this, x, y, width, rate, color1, color2)
    }
  };

})();
