//=============================================================================
 /*:
 * @plugindesc 蓄力条的实现
 * @author 
 */
//=============================================================================

(function() {
    var activeBars = {};

    // ===== 弧形蓄力条外观配置（可调） =====
    var ARC_CFG = {
        radius:      32,                    // 弧半径
        lineWidth:   8,                     // 弧条粗细
        startAngle:  180,                   // 起始角度（度）：180 配合 sweep 180 = 上半圆
        sweepAngle:  180,                   // 扫过角度：180=半圆，360=整圆
        color1:      'rgba(120,255,90,0.95)',  // 充能中渐变色1
        color2:      'rgba(0,220,80,0.95)',   // 充能中渐变色2
        fullColor1:  'rgba(120,255,90,0.95)',  // 充满渐变色1
        fullColor2:  'rgba(0,220,80,0.95)',    // 充满渐变色2
        trackColor:  'rgba(0,0,0,0.5)',    // 轨道颜色
        offsetY:     64,                    // 相对目标的纵向抬升（越大越高）
        smoothSpeed: 0.25,                  // 进度平滑缓动速度（0~1，越大越快）
        cap:         'round'                // 弧端点形状：'round'圆头 / 'butt'平头
    };

    // 形状预设：传 options.shape 即可套用，无需手记角度/端点
    var SHAPE_PRESETS = {
        semicircle: { startAngle: 180, sweepAngle: 180, cap: 'round' },  // 上半圆
        circle:     { startAngle: -90, sweepAngle: 360, cap: 'butt'  }   // 完整圆环（从正上方起，平头避免首尾重叠）
    };

    function Sprite_TemporaryBar(eventId, playerVariableId, fillValueMax, options) {
        this.initialize.apply(this, arguments);
    }

    Sprite_TemporaryBar.prototype = Object.create(Sprite.prototype);
    Sprite_TemporaryBar.prototype.constructor = Sprite_TemporaryBar;

    Sprite_TemporaryBar.prototype.initialize = function(eventId, playerVariableId, fillValueMax, options) {
        Sprite.prototype.initialize.call(this);
        this._active = true;
        this._eventId = eventId;
        this._playerVariableId = playerVariableId;
        this._fillValueMax = fillValueMax || 100;
        // 实例配置组装，优先级（高→低）：用户传入 options > 形状预设(shape) > 全局 ARC_CFG
        // shape 快捷选项：'semicircle'(上半圆,默认) / 'circle'(完整圆环)，自动套用该形状的最佳角度与端点
        options = options || {};
        var shapePreset = SHAPE_PRESETS[options.shape] || {};
        this._cfg = Object.assign({}, ARC_CFG, shapePreset, options);

        // 字符串表达式支持：playerVariableId(当前值) / fillValueMax(最大值) 传字符串则 eval。
        // options.refresh=true 时每帧重新 eval（动态跟踪）；否则只 eval 一次并缓存。
        this._refreshExpr = !!(options && options.refresh);
        this._currentExpr = (typeof playerVariableId === 'string') ? playerVariableId : null;
        this._maxExpr     = (typeof fillValueMax === 'string') ? fillValueMax : null;
        this._curCache = null;
        this._maxCache = null;

        this._target = eventId === -1 ? $gamePlayer : $gameMap.event(eventId);
        this._displayRate = 0;   // 平滑显示用的进度
        this._lastDrawn = -1;    // 上次绘制的进度（避免重复绘制）
        this._wasFull = false;
        this.createBitmap();
        this.update();
        SceneManager._scene.addChild(this);
    };

    // 安全 eval（失败返回 0，不中断游戏）
    Sprite_TemporaryBar.prototype.evalExpr = function(expr) {
        try { return eval(expr); }
        catch (e) { console.warn('[TemporaryBar] eval 失败:', expr, e); return 0; }
    };

    // 当前充能值：① 字符串表达式 → eval（refresh 时每帧算，否则缓存一次）
    //            ② 数字 → 沿用旧逻辑（玩家读 $gameVariables，事件读 selfVariable "cost"）
    Sprite_TemporaryBar.prototype.getCurrentValue = function() {
        if (this._currentExpr !== null) {
            if (this._refreshExpr || this._curCache === null) {
                this._curCache = Number(this.evalExpr(this._currentExpr)) || 0;
            }
            return this._curCache;
        }
        return this._eventId === -1
            ? $gameVariables.value(this._playerVariableId)
            : $gameSelfVariables.value([$gameMap._mapId, this._eventId, "cost"]);
    };

    // 最大值：字符串 → eval（同样支持 refresh 缓存）；数字 → 直接用
    Sprite_TemporaryBar.prototype.getMaxValue = function() {
        if (this._maxExpr !== null) {
            if (this._refreshExpr || this._maxCache === null) {
                this._maxCache = Number(this.evalExpr(this._maxExpr)) || 1;
            }
            return this._maxCache;
        }
        return this._fillValueMax;
    };

    Sprite_TemporaryBar.prototype.createBitmap = function() {
        // 画布需容纳整个弧 + 线宽 + 抗锯齿余量
        var pad = this._cfg.lineWidth + 4;
        var size = this._cfg.radius * 2 + pad * 2;
        this.bitmap = new Bitmap(size, size);
        this._cx = size / 2;
        this._cy = size / 2;
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;   // 以中心锚定，便于围绕目标头顶居中
        this.opacity = 0;
    };

    // 运行时动态调整偏移（如吟唱中玩家浮起，可随时改高度）
    Sprite_TemporaryBar.prototype.setOffsetY = function(value) {
        this._cfg.offsetY = value;
    };

    Sprite_TemporaryBar.prototype.redraw = function(rate, isFull) {
        var o = this._cfg;
        this.bitmap.clear();
        // 降级保护：若 TMBitmapEx 的 drawArcGauge 不可用，退回简单矩形条，避免报错
        if (!this.bitmap.drawArcGauge) {
            var w = this.bitmap.width, h = 4, y = (this.bitmap.height - h) / 2;
            this.bitmap.fillRect(0, y, w, h, 'rgba(0,0,0,0.6)');
            this.bitmap.fillRect(0, y, w * rate, h, isFull ? 'rgba(0,255,0,0.9)' : 'rgba(255,255,255,1)');
            this._lastDrawn = rate;
            return;
        }
        this.bitmap.drawArcGauge(this._cx, this._cy, o.radius, rate, {
            lineWidth: o.lineWidth,
            startAngle: o.startAngle,
            sweepAngle: o.sweepAngle,
            color1: isFull ? o.fullColor1 : o.color1,
            color2: isFull ? o.fullColor2 : o.color2,
            trackColor: o.trackColor,
            cap: o.cap || 'round'
        });
        this._lastDrawn = rate;
    };

    Sprite_TemporaryBar.prototype.update = function() {
        if (!this._active) return;
        Sprite.prototype.update.call(this);
        var fillValue = this.getCurrentValue();
        var maxValue = this.getMaxValue();
        var targetRate = maxValue > 0 ? Math.max(0, Math.min(1, fillValue / maxValue)) : 0;
        var isFull = fillValue >= maxValue;

        // 进度平滑缓动
        if (Math.abs(this._displayRate - targetRate) > 0.003) {
            this._displayRate += (targetRate - this._displayRate) * this._cfg.smoothSpeed;
        } else {
            this._displayRate = targetRate;
        }

        // 仅在进度或充满状态变化时重绘
        if (this._displayRate !== this._lastDrawn || isFull !== this._wasFull) {
            this.redraw(this._displayRate, isFull);
            this._wasFull = isFull;
        }

        // 跟随目标头顶（受缩放正确）
        this.x = $gameScreen.zoomScale() * this._target.screenX();
        this.y = $gameScreen.zoomScale() * (this._target.screenY() - this._cfg.offsetY);

        if (!isFull) {
            this.opacity = Math.min(this.opacity + 8, 255);
        }
    };

    Sprite_TemporaryBar.prototype.destroy = function() {
        if (this.parent) {
            this.parent.removeChild(this);
        }
        this.bitmap = null;
        this._active = false;
        if (activeBars[this._eventId]) {
            delete activeBars[this._eventId];
        }
    };

    window.createTemporaryBar = function(eventId, playerVariableId, fillValueMax, options) {
        if (activeBars[eventId]) {
            return;
        }
        var newBar = new Sprite_TemporaryBar(eventId, playerVariableId, fillValueMax, options);
        activeBars[eventId] = newBar;
    };

    window.destroyTemporaryBar = function(eventId) {
        if (activeBars[eventId]) {
            activeBars[eventId].destroy();
        }
    };

    // 运行时动态调整某条蓄力条的纵向偏移（吟唱中玩家浮起时实时抬高）
    window.setTemporaryBarOffsetY = function(eventId, value) {
        if (activeBars[eventId]) {
            activeBars[eventId].setOffsetY(value);
        }
    };

})();
