//=============================================================================
 /*:
 * @plugindesc 为敌人事件显示自变量HP槽
 * @author shiroin
 */
//=============================================================================

(function() {

function Sprite_HpGauge() {
    this.initialize.apply(this, arguments);
}

Sprite_HpGauge.prototype = Object.create(Sprite.prototype);
Sprite_HpGauge.prototype.constructor = Sprite_HpGauge;

// ===== 演出配置（可调） =====
var HP_CFG = {
    drainSpeed: 0.20,                      // 主血条向目标值缓动的速度（每帧比例，越大越快）
    trailSpeed: 0.08,                      // 掉血残影追赶主血条的速度
    trailDelay: 12,                        // 受击后残影停留多少帧再开始追（制造“滞后”观感）
    trailColor: 'rgba(255,255,255,0.7)',   // 掉血残影颜色
    color1: 'rgba(255,0,0,0.85)',          // 主血条渐变色1（原版红）
    color2: 'rgba(255,90,0,0.85)',         // 主血条渐变色2（原版橙）
    bgColor: 'rgba(0,0,0,0.5)',            // 底槽颜色
    colorScale: false,                     // true=按血量绿/黄/红变色；false=保持原版红橙
    lowHpThreshold: 0.3,                   // 低血量阈值（≤此比例时高亮脉动）
    spawnAnim: true,                       // 出现时从 0 刷到当前值
    valueFontFace: 'FusionPixel10Latin',   // HP 数值固定字体
    valueFontSize: 28,                     // HP 数值字号
    valueHeight: 30,                       // HP 数值位图高度
    valueGap: 2                            // HP 数值与血条的间距
};

// FusionPixel10Latin 是按需字体；不受当前语言影响，确保 HP 数值始终可用它渲染。
if (typeof Graphics !== 'undefined' && Graphics._createFontLoader) {
    Graphics._createFontLoader(HP_CFG.valueFontFace);
}

Sprite_HpGauge.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this);
    this._currentHp = 0;
    this._maxHp = 0;
    this._targetHp = 0;     // 实际血量（数据源）
    this._displayHp = 0;    // 显示血量（平滑追向 target）
    this._trailHp = 0;      // 残影血量（更慢地追向 display）
    this._trailDelay = 0;
    this._pulse = 0;        // 低血脉动计时
    this._lastDrawHp = -1;
    this._lastDrawTrail = -1;
    this._fadeDuration = 120;
    this._fadeTimer = this._fadeDuration;
    this._hpBarWidth = 64;
    this._hpBarHeight = 6;
    this._radius = 3;
    this._frameHeight = 48;
    this._needsRemoval = false;
    this._hpValueSprite = null;
    this._lastDrawValueHp = null;
    this._lastDrawValueMaxHp = null;
};

Sprite_HpGauge.prototype.checkCharacterFrameSize = function(event) {
    var characterName = event.characterName();
    // 添加检查，如果 characterName 不存在，使用默认值
    if (!characterName || characterName.trim() === '') {
        this._frameHeight = 48; // 默认值
        this._hpBarWidth = 64; // 默认值
        return;
    }
    
    var bitmap = ImageManager.loadCharacter(characterName);
    var frameRows = characterName.startsWith('!$') || characterName.startsWith('$') ? 4 : 8;
    var frameColumns = characterName.startsWith('!$') || characterName.startsWith('$') ? 3 : 12;
    if (bitmap && bitmap.isReady()) {
        this.applyCharacterFrameSize(bitmap, frameRows, frameColumns);
    } else if (bitmap) {
        bitmap.addLoadListener(function() {
            this.applyCharacterFrameSize(bitmap, frameRows, frameColumns);
        }.bind(this));
    }
};

// 行走图可能在血条创建后才加载完成。尺寸变化时必须同步重建两张位图，
// 否则 _hpBarWidth 会与已创建的画布宽度分离，导致较宽单位的血条被裁短。
Sprite_HpGauge.prototype.applyCharacterFrameSize = function(bitmap, frameRows, frameColumns) {
    this._frameHeight = Math.max(bitmap.height / frameRows, 24);
    var newWidth = Math.max(1, Math.round(1.5 * (bitmap.width / frameColumns)));
    this.resizeGaugeWidth(newWidth);
};

Sprite_HpGauge.prototype.resizeGaugeWidth = function(newWidth) {
    if (newWidth === this._hpBarWidth) return;
    this._hpBarWidth = newWidth;

    // bitmap 存在表示血条已经创建，此时是异步回调，需同步更新实际画布。
    if (this.bitmap) {
        var hpBarHeight = Math.round(this._hpBarWidth / 12);
        this._hpBarHeight = Math.max(4, Math.min(hpBarHeight, 12));
        this._radius = Math.min(Math.round(this._hpBarHeight / 2), 6);
        this.bitmap = new Bitmap(this._hpBarWidth, this._hpBarHeight);

        if (this._hpValueSprite) {
            this._hpValueSprite.bitmap = new Bitmap(this._hpBarWidth, HP_CFG.valueHeight);
            this._lastDrawValueHp = null;
            this._lastDrawValueMaxHp = null;
            this.redrawHpValue();
        }
        this._lastDrawHp = -1;
        this._lastDrawTrail = -1;
        this.redraw();
    }
};


Sprite_HpGauge.prototype.createnemyHpBar = function(eventId) {
    this._eventId = eventId;  
    var event = $gameMap.event(eventId);
    if (!event){ return; }
    this.checkCharacterFrameSize(event);

    var currentHp = $gameSelfVariables.value([$gameMap._mapId, eventId, "HP"]);
    var maxHp = $gameSelfVariables.value([$gameMap._mapId, eventId, "MHP"]);

    // 添加检查，确保 currentHp 和 maxHp 有效
    if (currentHp == null || maxHp == null || maxHp <= 0) {
        return;
    }

    var hpBarHeight = Math.round(this._hpBarWidth / 12);
    hpBarHeight = Math.max(4, Math.min(hpBarHeight, 12));
    this._hpBarHeight = hpBarHeight;
    this._radius = Math.min(Math.round(hpBarHeight / 2), 6);

    this._currentHp = currentHp;
    this._maxHp = maxHp;
    this._targetHp = currentHp;
    // 出现动画：从 0 刷到当前；否则直接到位
    this._displayHp = HP_CFG.spawnAnim ? 0 : currentHp;
    this._trailHp = currentHp;
    this._trailDelay = 0;
    this._lastDrawHp = -1;
    this._lastDrawTrail = -1;

    this.bitmap = new Bitmap(this._hpBarWidth, hpBarHeight);
    this.createHpValueSprite();
    this.redraw();
    this.redrawHpValue();

    this.x = $gameScreen.zoomScale() * event.screenX() - this._hpBarWidth / 2;
    this.y = $gameScreen.zoomScale() * (event.screenY());// - frameHeightOffset);
    this.z = 5;
};

// HP 数值是血条的子精灵，因此位置跟随血条，并自动继承完全相同的透明度。
Sprite_HpGauge.prototype.createHpValueSprite = function() {
    var sprite = new Sprite(new Bitmap(this._hpBarWidth, HP_CFG.valueHeight));
    sprite.x = 0;
    sprite.y = -HP_CFG.valueHeight - HP_CFG.valueGap;
    this._hpValueSprite = sprite;
    this.addChild(sprite);
    this.updateHpValueVisibility();
};

Sprite_HpGauge.prototype.canShowHpValue = function() {
    return !!($gameMap && $gameMap.chahuiMapTemp &&
        $gameMap.chahuiMapTemp.canShowEnemyHP === true);
};

Sprite_HpGauge.prototype.updateHpValueVisibility = function() {
    if (this._hpValueSprite) {
        this._hpValueSprite.visible = this.canShowHpValue();
    }
};

// 仅在初始化或 HP / MHP 数据变化时重绘，显示开关变化不会反复刷新位图。
Sprite_HpGauge.prototype.redrawHpValue = function() {
    if (!this._hpValueSprite || !this._hpValueSprite.bitmap) return;
    if (this._lastDrawValueHp === this._currentHp &&
        this._lastDrawValueMaxHp === this._maxHp) return;

    var bmp = this._hpValueSprite.bitmap;
    bmp.clear();
    bmp.fontFace = HP_CFG.valueFontFace;
    bmp.fontSize = HP_CFG.valueFontSize;
    bmp.textColor = '#ffffff';
    bmp.outlineColor = 'rgba(0,0,0,0.8)';
    bmp.outlineWidth = 3;
    bmp.drawText(String(this._currentHp), 0, 0, this._hpBarWidth, HP_CFG.valueHeight, 'right');
    this._lastDrawValueHp = this._currentHp;
    this._lastDrawValueMaxHp = this._maxHp;
};

// 按当前 _displayHp / _trailHp 重绘血条（底槽 → 残影 → 主血条）
Sprite_HpGauge.prototype.redraw = function() {
    if (!this.bitmap || this._maxHp <= 0) return;
    var w = this._hpBarWidth, h = this._hpBarHeight, r = this._radius;
    var bmp = this.bitmap;
    bmp.clear();

    // 底槽
    bmp.fillRoundRect(0, 0, w, h, r, HP_CFG.bgColor);

    var dispRatio = Math.max(0, Math.min(1, this._displayHp / this._maxHp));
    var trailRatio = Math.max(0, Math.min(1, this._trailHp / this._maxHp));

    // 掉血残影（比主血条长时才画出超出的那段）
    if (trailRatio > dispRatio) {
        var tw = Math.round(trailRatio * w);
        if (tw > 0) bmp.fillRoundRect(0, 0, tw, h, r, HP_CFG.trailColor);
    }

    // 主血条
    var dw = Math.round(dispRatio * w);
    if (dw > 0) {
        var c1 = HP_CFG.color1, c2 = HP_CFG.color2;
        if (HP_CFG.colorScale) {
            // 按血量比例：绿 → 黄 → 红
            if (dispRatio > 0.5) { c1 = 'rgba(80,200,60,0.9)'; c2 = 'rgba(150,220,40,0.9)'; }
            else if (dispRatio > HP_CFG.lowHpThreshold) { c1 = 'rgba(230,200,30,0.9)'; c2 = 'rgba(255,160,20,0.9)'; }
            else { c1 = 'rgba(230,40,30,0.95)'; c2 = 'rgba(255,90,0,0.95)'; }
        }
        bmp.gradientFillRoundRect(0, 0, dw, h, r, c1, c2);

        // 低血量高亮：叠一层随脉动变化的亮白
        if (dispRatio <= HP_CFG.lowHpThreshold) {
            var glow = 0.15 + 0.20 * (0.5 + 0.5 * Math.sin(this._pulse * 0.2));
            bmp.fillRoundRect(0, 0, dw, h, r, 'rgba(255,255,255,' + glow.toFixed(3) + ')');
        }
    }
};

Sprite_HpGauge.prototype.update = function() {
    Sprite.prototype.update.call(this);

    var event = $gameMap.event(this._eventId);
    if (!event) {
        this._needsRemoval = true; // 设置为需要移除
        return;
    }

    var newCurrentHp = $gameSelfVariables.value([$gameMap._mapId, this._eventId, "HP"]);
    if (newCurrentHp == null || newCurrentHp <= 0) {
        this._needsRemoval = true; // 设置为需要移除
        return;
    }
    this.updateBarWidthFromRealSprite(event);
    this.updatePosition();
    this.updateHpValueVisibility();
    this.refresh();
    this.updateAnimation();

    if (this._fadeTimer > 0) {
        this._fadeTimer--;
        this.visible = true; 
    } else {
        this.opacity -= 255 / this._fadeDuration;
        if (this.opacity <= 0) {
            this.visible = false; 
            this.opacity = 255; 
            this._fadeTimer = this._fadeDuration; 
            this.clear();
        }
    }
};


// 读取事件当前正在渲染的 Sprite_Character。Drill_EventActionSequence
// 会把序列图直接替换到这个精灵的 bitmap / frame，不会改 event.characterName()。
Sprite_HpGauge.prototype.getRealCharacterSprite = function(event) {
    var scene = SceneManager._scene;
    var spriteset = scene && scene._spriteset;
    if (!spriteset || !spriteset._characterSprites) return null;
    var list = spriteset._characterSprites;
    for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i]._character === event) return list[i];
    }
    return null;
};

// 血条宽度以当前实际帧宽为准。动画序列切换不同尺寸的贴图时，
// patternWidth() 会同步变化，因此这里只在计算结果真正改变时重建血条。
Sprite_HpGauge.prototype.updateBarWidthFromRealSprite = function(event) {
    var sprite = this.getRealCharacterSprite(event);
    if (!sprite) return;

    var frameWidth = 0;
    if (typeof sprite.patternWidth === 'function') {
        try { frameWidth = sprite.patternWidth(); } catch (e) {}
    }
    if (!frameWidth) frameWidth = sprite.width;
    if (!frameWidth) return;

    var scaleX = sprite.scale && sprite.scale.x != null ? Math.abs(sprite.scale.x) : 1;
    var realWidth = frameWidth * scaleX;
    this.resizeGaugeWidth(Math.max(1, Math.round(1.5 * realWidth)));
};


// 读取事件“实际渲染精灵”的真实高度（兼容普通行走图、$大图、Drill动画序列替换的贴图）。
// 直接从 spriteset 找到该事件对应的 Sprite_Character，读其当前显示高度，
// 比靠 characterName() 猜测准确得多。取不到时返回 null，由调用方降级。
Sprite_HpGauge.prototype.getRealSpriteHeight = function(event) {
    var s = this.getRealCharacterSprite(event);
    if (s) {
        // 优先用实际显示高度（含缩放/帧裁切后的结果）
        var h = s.height;
        // 某些情况下 height 尚未就绪，退而用 patternHeight 或 bitmap 帧高
        if (!h && typeof s.patternHeight === 'function') {
            try { h = s.patternHeight(); } catch (e) {}
        }
        if (!h && s.bitmap && s.bitmap.isReady && s.bitmap.isReady()) {
            h = s.bitmap.height / 8; // 普通行走图兜底（8行）
        }
        // 还要考虑精灵自身的纵向缩放
        if (h && s.scale && s.scale.y) h *= Math.abs(s.scale.y);
        return h || null;
    }
    return null;
};

Sprite_HpGauge.prototype.updatePosition = function() {
    var event = $gameMap.event(this._eventId);
    if (event) {
        // 优先用事件精灵的真实高度定位到头顶；取不到时降级用 characterName 估算的 _frameHeight
        var realH = this.getRealSpriteHeight(event);
        var spriteH = (realH != null) ? realH : this._frameHeight;
        // event.screenY() 是脚底（锚点底部），减去精灵高度即头顶，再留 6px 间隙
        var frameHeightOffset = spriteH + 6;
        this.x = $gameScreen.zoomScale() * event.screenX() - this._hpBarWidth / 2;
        this.y = $gameScreen.zoomScale() * (event.screenY() - frameHeightOffset);
    }
};


Sprite_HpGauge.prototype.refresh = function() {
    var event = $gameMap.event(this._eventId);
    if (!event) {
        this._needsRemoval = true; // 设置为需要移除
        return;
    }

    var newCurrentHp = $gameSelfVariables.value([$gameMap._mapId, this._eventId, "HP"]);
    var newMaxHp = $gameSelfVariables.value([$gameMap._mapId, this._eventId, "MHP"]);

    if (newCurrentHp == null || newMaxHp == null || newMaxHp <= 0) {
        this._needsRemoval = true; // 设置为需要移除
        return;
    }

    if (newCurrentHp !== this._currentHp || newMaxHp !== this._maxHp) {
        var damaged = newCurrentHp < this._currentHp; // 是否掉血
        this._currentHp = newCurrentHp;
        this._maxHp = newMaxHp;
        this._targetHp = newCurrentHp;
        this.redrawHpValue();
        // 掉血时启动残影延迟（残影先停一下再追）；回血时残影立即跟上
        if (damaged) {
            this._trailDelay = HP_CFG.trailDelay;
        } else {
            this._trailHp = Math.max(this._trailHp, newCurrentHp);
        }
        // 受击重新点亮并重置淡出计时
        this.opacity = 255;
        this._fadeTimer = this._fadeDuration;
    }
};

// 每帧推进：显示血量缓动追向目标，残影更慢地追向显示血量，低血脉动计时
Sprite_HpGauge.prototype.updateAnimation = function() {
    if (this._maxHp <= 0) return;
    var changed = false;

    // 主血条缓动
    if (Math.abs(this._displayHp - this._targetHp) > 0.5) {
        this._displayHp += (this._targetHp - this._displayHp) * HP_CFG.drainSpeed;
        if (Math.abs(this._displayHp - this._targetHp) <= 0.5) this._displayHp = this._targetHp;
        changed = true;
    } else if (this._displayHp !== this._targetHp) {
        this._displayHp = this._targetHp;
        changed = true;
    }

    // 残影：延迟结束后才追向显示血量
    if (this._trailDelay > 0) {
        this._trailDelay--;
    } else if (this._trailHp > this._displayHp + 0.5) {
        this._trailHp += (this._displayHp - this._trailHp) * HP_CFG.trailSpeed;
        if (this._trailHp <= this._displayHp + 0.5) this._trailHp = this._displayHp;
        changed = true;
    } else if (this._trailHp !== this._displayHp) {
        this._trailHp = this._displayHp;
        changed = true;
    }

    // 低血量脉动：只要处于低血就持续计时并重绘
    var lowHp = (this._displayHp / this._maxHp) <= HP_CFG.lowHpThreshold;
    if (lowHp) { this._pulse++; changed = true; }

    // 仅在数值变化时重绘，省开销
    if (changed || this._lastDrawHp !== this._displayHp || this._lastDrawTrail !== this._trailHp) {
        this.redraw();
        this._lastDrawHp = this._displayHp;
        this._lastDrawTrail = this._trailHp;
    }
};

Sprite_HpGauge.prototype.clear = function() {
    if (this.bitmap) {
        this.bitmap.clear();
    }
    if (this._hpValueSprite && this._hpValueSprite.bitmap) {
        this._hpValueSprite.bitmap.clear();
    }
};

Sprite_HpGauge.prototype.remove = function() {
    this._needsRemoval = true;
};

Game_CharacterBase.prototype.showHpBar = function() {
    if (this instanceof Game_Event) { 
        this.createHpGauge();
    }
};

// 立即移除当前血条及其 HP 数字；下次受击调用 showHpBar 时可重新创建。
Game_Event.prototype.hideHpBar = function() {
    var scene = SceneManager._scene;
    if (scene instanceof Scene_Map) {
        scene.removeHpGaugeForEvent(this._eventId);
    }
};


Game_Event.prototype.createHpGauge = function() {
    var page = this.page();
    
    // 检查页面是否存在，防止报错
    if (!page || !page.list) {
        return null; // 如果页面不存在，直接返回
    }

    var list = page.list;
    for (var i = 0; i < list.length; i++) {
        if (list[i].code === 108 || list[i].code === 408) {
            var comment = list[i].parameters[0];
            if (comment.contains("<No HPGauge>")) {
                return null; // 如果找到注释，则不创建 HP 条
            }
        }
    }

    var currentHp = $gameSelfVariables.value([$gameMap._mapId, this._eventId, "HP"]);
    if (currentHp == null || currentHp <= 0) return null; // 如果 HP 无效或为 0 或以下，不创建 HP 条

    // 调用场景的方法来创建 HP 条
    SceneManager._scene.createHpGaugeForEvent(this._eventId);
};

Scene_Map.prototype.createHpGaugeForEvent = function(eventId) {
    if (!this._hpGaugeSprites) this._hpGaugeSprites = {};
    if (this._hpGaugeSprites[eventId]) return; // 已经有了，不需要再创建

    var sprite = new Sprite_HpGauge();
    sprite.createnemyHpBar(eventId);
    this._hpGaugeSprites[eventId] = sprite;
    this.addChild(sprite);
};

Scene_Map.prototype.removeHpGaugeForEvent = function(eventId) {
    var sprite = this._hpGaugeSprites && this._hpGaugeSprites[eventId];
    if (!sprite) return;
    sprite.visible = false;
    this.removeChild(sprite);
    delete this._hpGaugeSprites[eventId];
};

var _Scene_Map_update_HpGauge = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update_HpGauge.call(this);

    if (this._hpGaugeSprites) {
        for (var eventId in this._hpGaugeSprites) {
            var sprite = this._hpGaugeSprites[eventId];
            if (sprite) {
                sprite.update();

                if (sprite._needsRemoval) {
                    // 移除精灵
                    this.removeChild(sprite);
                    delete this._hpGaugeSprites[eventId];
                }
            }
        }
    }
};

var _Scene_Map_terminate_HpGauge = Scene_Map.prototype.terminate;
Scene_Map.prototype.terminate = function() {
    if (this._hpGaugeSprites) {
        for (var eventId in this._hpGaugeSprites) {
            var sprite = this._hpGaugeSprites[eventId];
            if (sprite) {
                this.removeChild(sprite);
            }
        }
        this._hpGaugeSprites = null;
    }
    _Scene_Map_terminate_HpGauge.call(this);
};

})();
