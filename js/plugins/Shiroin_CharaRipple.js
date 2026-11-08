//=============================================================================
// Shiroin_CharaRipple.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 角色波纹/漩涡滤镜（自包含·从 SAN_ShaderFilter 提取） 1.1.0
 * @author shiroin (原滤镜: Sanshiro https://github.com/rev2nym, MIT)
 *
 * @help
 * ■概要
 * 在指定角色周围显示圆形扩散的水波纹/涟漪扭曲效果。
 * 这是把 Sanshiro 的 SAN_ShaderFilterCharaRipple 单独抽出、改写为
 * 完全自包含的 MZ(PIXI5) 版本。
 *
 * ★不需要 SAN_ShaderFilter.js 核心插件。
 * ★不需要 glsl 文件夹（着色器已内嵌进本文件）。
 *   单装本插件即可使用，调用语法与原版完全一致。
 *
 * ■创建参数
 * new GLSLCharaRippleFilterParam({
 *     speed: 1.0,        // 波纹速度（可负）
 *     fadeFrame: 60,     // 淡入淡出帧数
 *     fadeState: 'fadedOut', // 初始淡入淡出状态
 *     charaType: 'player',   // 'player' / 'event' / 'follower'
 *     charaId: 1,        // 事件ID / 跟随者索引(队伍第2人=1)
 *     pitch: 1.0,        // 纹路密度（越大越细）
 *     innerRadius: 24.0, // 内半径(像素，中间空洞)
 *     outerRadius: 72.0, // 外半径(像素，超出不显示)
 *     strength: 1.0,     // 扭曲强度
 *     scaleX: 1.0,       // 横向缩放率
 *     scaleY: 1.0,       // 纵向缩放率
 *     offsetX: 0,        // 中心X偏移(像素，地图单位)
 *     offsetY: 0,        // 中心Y偏移(像素，正=向下)
 *     color: {r: 1.0, g: 1.0, b: 2.0} // RGB染色
 * });
 * 各项均可省略；整个对象也可省略：new GLSLCharaRippleFilterParam();
 *
 * ■椭圆/缩放（scaleX / scaleY）
 * 控制波纹在两个轴上的半径倍率，默认 1.0 = 正圆。
 * - 俯视透视压扁：scaleY 设小于 scaleX，例如 scaleX:1.0, scaleY:0.6
 *   表示纵向半径只有横向的 60%，得到横向椭圆。
 * - 整体放大/缩小：两者同时调，例如都设 1.5 = 放大到 1.5 倍。
 * 注意：内/外半径(innerRadius/outerRadius)是在缩放前的单位，
 * 实际像素半径 = 半径 × 对应轴缩放率。
 * 这两个值每帧读取，可在运行中实时修改 param._scaleY 来动态调整。
 *
 * ■中心偏移（offsetX / offsetY）
 * 在角色精灵的中心基础上再临时平移波纹中心，单位为像素。
 * 偏移在乘以地图缩放(zoomScale)之前叠加，所以会随地图缩放一起缩放、
 * 始终贴着角色。offsetY 为正表示向下、为负向上。
 * 对“事件”作为释放对象时尤其有用，可逐个微调到合适位置。
 * 例：让中心相对事件向下 12px → offsetY: 12
 * 同样每帧读取，可运行中改 param._offsetY 实时调整。
 *
 * ■注册（出现效果）
 * $gameScreen.glslFilterParamMap().set(
 *     'playerRipple',                 // 滤镜ID(任意字符串)
 *     new GLSLCharaRippleFilterParam() // 参数对象
 * );
 *
 * ■操作
 * var p = $gameScreen.glslFilterParamMap().get('playerRipple');
 * p.fadeIn();   // 淡入
 * p.fadeOut();  // 淡出
 * p.show();     // 立即显示
 * p.hide();     // 立即隐藏
 *
 * ■移除
 * $gameScreen.glslFilterParamMap().delete('playerRipple');
 *
 * =====================================================================
 * ■漩涡/黑洞滤镜（GLSLVortexFilterParam）
 * 把周围画面向中心扭转吸入，适合做漩涡、传送门、黑洞等演出。
 * 用法与波纹完全一致，只是换一个参数类：
 *
 * new GLSLVortexFilterParam({
 *     speed: 1.0,        // 时间流速（影响旋转）
 *     fadeFrame: 60,     // 淡入淡出帧数
 *     fadeState: 'fadedOut',
 *     charaType: 'event',// 'player' / 'event' / 'follower'
 *     charaId: 5,        // 事件ID等
 *     radius: 140,       // 影响半径(像素，会随地图缩放)
 *     strength: 0.35,    // 内吸强度(越大吸得越狠)
 *     swirl: 3.0,        // 基础扭转角(弧度，决定漩涡形状/缠绕)
 *     flow: 1.5,         // 环波振幅(运动感强度，0=静止扭转)
 *     wind: 3.0,         // 环波圈数(半径内有几圈在流动)
 *     rotateSpeed: 2.0,  // 环波流动速度(也是循环频率)
 *     scaleX: 1.0,       // 椭圆/缩放
 *     scaleY: 1.0,
 *     offsetX: 0,
 *     offsetY: 0,
 *     targetLayer: 'all' // 作用层: 'all'整画面 / 'tile'仅地面图块 / 'upper'仅上层图块
 * });
 *
 * ★只扭曲地图、不扭曲角色/事件：targetLayer: 'tile'
 *   水面在地面图块层，角色/事件是其上的精灵。设为 'tile' 后滤镜
 *   只挂在地面图块层(_lowerLayer)，强烈的扭曲就不会糊到角色外形。
 *   （波纹 GLSLCharaRippleFilterParam 同样支持 targetLayer。）
 *
 * ★循环原理：动画来自“向内流动的环波”，时间藏在 sin 内，
 *   空间频率固定，所以画面有界、可无限循环、自动复原，
 *   长时间播放也不会越来越扭曲（区别于线性累加的旋转）。
 *   循环周期约为 2π/rotateSpeed 秒。
 *   想要纯静止扭转把 flow 设 0；想更强的流动加大 flow。
 *   方向：负 swirl 反转扭转手性，负 rotateSpeed 反转流动方向。
 *
 * 注册 / 操作 / 删除 与波纹相同：
 * $gameScreen.glslFilterParamMap().set('whirl',
 *     new GLSLVortexFilterParam({ charaType:'event', charaId:5 }));
 * $gameScreen.glslFilterParamMap().get('whirl').fadeIn();
 * $gameScreen.glslFilterParamMap().get('whirl').fadeOut();
 * $gameScreen.glslFilterParamMap().delete('whirl');
 *
 * 提示：玩家被吸入时，可逐帧加大 strength/swirl 做“越陷越深”：
 * var p = $gameScreen.glslFilterParamMap().get('whirl');
 * p._strength += 0.02; p._swirl += 0.1;
 *
 * ■利用规约
 * MIT 许可。原滤镜版权 (c) 2018 Sanshiro。
 */

(function() {
'use strict';

//-----------------------------------------------------------------------------
// 内嵌的片段着色器（原 glsl/SAN_CharaRippleFrag.txt）
//-----------------------------------------------------------------------------

var RIPPLE_FRAG = [
    'varying vec2 vTextureCoord;',
    'uniform sampler2D uSampler;',
    'uniform float uTime;',
    'uniform float uFadeRate;',
    'uniform vec2 uPosition;',
    'uniform float uInnerRadius;',
    'uniform float uOuterRadius;',
    'uniform float uStrength;',
    'uniform float uPitch;',
    'uniform vec2 uScale;',
    'uniform float uR;',
    'uniform float uG;',
    'uniform float uB;',
    '',
    'const float PI = 3.1415926535897932384626433832795;',
    '',
    'float cos2(float theta) {',
    '    return (cos(theta) + 1.0) / 2.0;',
    '}',
    '',
    'float sin2(float theta) {',
    '    return (sin(theta) + 1.0) / 2.0;',
    '}',
    '',
    'float cosWindow(float l, float lMin, float lMax) {',
    '    l = max(lMin, min(l, lMax));',
    '    return cos2((2.0 * PI * (l - lMin) / (lMax - lMin)) - PI);',
    '}',
    '',
    'vec4 colorCoef(float rate) {',
    '    vec4 color = vec4(uR, uG, uB, 1.0);',
    '    return ((color - vec4(1.0)) * rate) + vec4(1.0);',
    '}',
    '',
    'void main(void) {',
    '    vec2 relVecXy = (gl_FragCoord.xy - uPosition) / uScale;',
    '    float relLen = length(relVecXy);',
    '    float power = uStrength * uFadeRate;',
    '    float wave = sin2(PI / 2.0 * relLen / 4.0 * uPitch - uTime * 8.0);',
    '    float window = cosWindow(relLen, uInnerRadius, uOuterRadius);',
    '    float texLen = 0.01 * wave * power * window;',
    '    vec2 texVec = normalize(relVecXy) * texLen;',
    '    vec4 color = texture2D(uSampler, vTextureCoord + texVec);',
    '    vec4 colorCoef = colorCoef(wave * power * window);',
    '    gl_FragColor = color * colorCoef;',
    '}'
].join('\n');

//-----------------------------------------------------------------------------
// 工具：从当前场景查找角色精灵
//-----------------------------------------------------------------------------

function findCharacterSprite(type, id) {
    var scene = SceneManager._scene;
    if (!(scene instanceof Scene_Map) || !scene._spriteset) {
        return undefined;
    }
    var sprites = scene._spriteset._characterSprites;
    return sprites.find(function(sprite) {
        var ch = sprite._character;
        if (type === 'player') {
            return ch instanceof Game_Player;
        } else if (type === 'event') {
            return ch instanceof Game_Event && ch.eventId() === id;
        } else if (type === 'follower') {
            return ch instanceof Game_Follower && ch._memberIndex === id;
        }
        return false;
    });
}

// 角色精灵中心 → 屏幕像素坐标（含偏移，乘地图缩放）
function characterCenterX(sprite, offsetX) {
    return (
        (sprite.x -
        sprite.width * sprite.anchor.x +
        sprite.width / 2.0 +
        4.0 +
        offsetX) * $gameScreen.zoomScale()
    );
}

function characterCenterY(sprite, offsetY) {
    if (sprite._characterName === '') {
        return (
            (sprite.y -
            $gameMap.tileHeight() / 2.0 +
            8.0 +
            offsetY) * $gameScreen.zoomScale()
        );
    }
    return (
        (sprite.y -
        sprite.height * sprite.anchor.y +
        sprite.height / 2.0 +
        4.0 +
        offsetY) * $gameScreen.zoomScale()
    );
}

//-----------------------------------------------------------------------------
// 内嵌的片段着色器：漩涡/黑洞（swirl 扭转 + pinch 内吸 + 持续旋转）
//-----------------------------------------------------------------------------

var VORTEX_FRAG = [
    'precision highp float;',         // 必须与顶点着色器的 inputSize 精度(highp)一致
    'varying vec2 vTextureCoord;',
    'uniform sampler2D uSampler;',
    'uniform vec4 inputSize;',        // PIXI 自动注入: .xy=纹理像素尺寸 .zw=1/尺寸
    'uniform float uTime;',
    'uniform float uFadeRate;',
    'uniform vec2 uCenter;',          // 中心(屏幕像素, 与 gl_FragCoord 同一空间)
    'uniform float uRadius;',         // 影响半径(像素)
    'uniform float uStrength;',       // 内吸强度(正=吸入)',
    'uniform float uSwirl;',          // 基础扭转角(弧度，决定漩涡形状)',
    'uniform float uFlow;',           // 环波振幅(运动感强度)',
    'uniform float uWind;',           // 环波圈数(影响半径内有几圈)',
    'uniform float uRotateSpeed;',    // 环波流动速度(循环频率)',
    'uniform vec2 uScale;',           // 椭圆压扁',
    '',
    'void main(void) {',
    '    vec2 frag = gl_FragCoord.xy;',
    '    vec2 d = (frag - uCenter) / uScale;',
    '    float r = length(d);',
    '    if (uRadius <= 0.0 || r >= uRadius) {',
    '        gl_FragColor = texture2D(uSampler, vTextureCoord);',
    '        return;',
    '    }',
    '    float percent = 1.0 - r / uRadius;',         // 0 边缘 -> 1 中心
    '    float ease = percent * percent;',            // 在整个半径内平滑收敛到边缘(=0)，消除边缘噪点环
    '    float amp = uFadeRate * ease;',
    '    float rn = r / uRadius;',                     // 归一化半径 0..1
    '    float wave = sin(uWind * 6.2831853 * rn + uTime * uRotateSpeed);', // 向内流动的环波；时间在 sin 内→有界、可循环、自动复原
    '    float theta = (uSwirl + uFlow * wave) * amp;', // 基础扭转 + 周期波动，永不累积变形
    '    float cs = cos(theta);',
    '    float sn = sin(theta);',
    '    vec2 rot = vec2(d.x * cs + d.y * sn, -d.x * sn + d.y * cs);', // 顺时针(正数);负 swirl/rotateSpeed 则逆时针
    '    float pinch = 1.0 + uStrength * amp;',        // >1 → 从更外侧采样 → 画面向内被吸
    '    vec2 srcXy = uCenter + rot * pinch * uScale;',
    '    vec2 texOffset = (srcXy - frag) * inputSize.zw;',
    '    gl_FragColor = texture2D(uSampler, vTextureCoord + texOffset);',
    '}'
].join('\n');

//-----------------------------------------------------------------------------
// GLSLFilterParamMap （精简版，仅供 Game_Screen 使用）
//-----------------------------------------------------------------------------

window.GLSLFilterParamMap = window.GLSLFilterParamMap || function GLSLFilterParamMap() {
    this.initialize.apply(this, arguments);
};

if (!GLSLFilterParamMap.prototype.initialize) {
    GLSLFilterParamMap.prototype.initialize = function() {
        this._map = {};
    };
    GLSLFilterParamMap.prototype.clear = function() {
        this._map = {};
    };
    GLSLFilterParamMap.prototype.delete = function(key) {
        delete this._map[key];
    };
    GLSLFilterParamMap.prototype.set = function(key, value) {
        this._map[key] = value;
    };
    GLSLFilterParamMap.prototype.get = function(key) {
        return this._map[key];
    };
    GLSLFilterParamMap.prototype.has = function(key) {
        return !!this._map[key];
    };
    GLSLFilterParamMap.prototype.keys = function() {
        return Object.keys(this._map);
    };
    GLSLFilterParamMap.prototype.values = function() {
        return Object.values(this._map);
    };
    GLSLFilterParamMap.prototype.key = function(value) {
        var entry = Object.entries(this._map).find(function(e) {
            return e[1] === value;
        });
        return entry ? entry[0] : undefined;
    };
    GLSLFilterParamMap.prototype.remove = function(value) {
        this.delete(this.key(value));
    };
    GLSLFilterParamMap.prototype.update = function() {
        this.values().forEach(function(value) {
            if (value && typeof value.update === 'function') {
                value.update();
            }
        });
    };
}

//-----------------------------------------------------------------------------
// Game_Screen
//-----------------------------------------------------------------------------

if (!Game_Screen.prototype.glslFilterParamMap) {
    var _Game_Screen_initialize = Game_Screen.prototype.initialize;
    Game_Screen.prototype.initialize = function() {
        _Game_Screen_initialize.apply(this, arguments);
        this._glslFilterParamMap = new GLSLFilterParamMap();
    };

    Game_Screen.prototype.glslFilterParamMap = function() {
        // 不存在，或来自旧/异常存档反序列化成了普通对象(丢失原型方法) → 重建为合格实例。
        // 旧存档不含本字段，或反序列化后丢类，都会落到这里，避免 map.values is not a function。
        if (!this._glslFilterParamMap ||
            typeof this._glslFilterParamMap.values !== 'function') {
            this._glslFilterParamMap = new GLSLFilterParamMap();
        }
        return this._glslFilterParamMap;
    };

    var _Game_Screen_update = Game_Screen.prototype.update;
    Game_Screen.prototype.update = function() {
        _Game_Screen_update.apply(this, arguments);
        this.glslFilterParamMap().update();
    };
}

//-----------------------------------------------------------------------------
// GLSLCharaRippleFilterParam
//-----------------------------------------------------------------------------

window.GLSLCharaRippleFilterParam = function GLSLCharaRippleFilterParam() {
    this.initialize.apply(this, arguments);
};

GLSLCharaRippleFilterParam.prototype.initialize = function(param) {
    param = param || {};
    this._time = 0.0;
    this._fadeRate = 0.0;
    this._speed       = param.hasOwnProperty('speed')       ? param.speed       : 1.0;
    this._fadeFrame   = param.hasOwnProperty('fadeFrame')   ? param.fadeFrame   : 60;
    this._fadeState   = param.hasOwnProperty('fadeState')   ? param.fadeState   : 'fadedOut';
    this._charaType   = param.hasOwnProperty('charaType')   ? param.charaType   : 'player';
    this._charaId     = param.hasOwnProperty('charaId')     ? param.charaId     : 1;
    this._pitch       = param.hasOwnProperty('pitch')       ? param.pitch       : 1.0;
    this._innerRadius = param.hasOwnProperty('innerRadius') ? param.innerRadius : 24.0;
    this._outerRadius = param.hasOwnProperty('outerRadius') ? param.outerRadius : 72.0;
    this._strength    = param.hasOwnProperty('strength')    ? param.strength    : 1.0;
    this._scaleX      = param.hasOwnProperty('scaleX')      ? param.scaleX      : 1.0;
    this._scaleY      = param.hasOwnProperty('scaleY')      ? param.scaleY      : 1.0;
    this._offsetX     = param.hasOwnProperty('offsetX')     ? param.offsetX     : 0.0;
    this._offsetY     = param.hasOwnProperty('offsetY')     ? param.offsetY     : 0.0;
    this._targetLayer = param.hasOwnProperty('targetLayer') ? param.targetLayer : 'all';
    this._color       = param.hasOwnProperty('color')       ? param.color       : {r: 1.0, g: 1.0, b: 2.0};
    this._character = this.character();
};

GLSLCharaRippleFilterParam.prototype.time        = function() { return this._time; };
GLSLCharaRippleFilterParam.prototype.fadeRate    = function() { return this._fadeRate; };
GLSLCharaRippleFilterParam.prototype.charaType   = function() { return this._charaType; };
GLSLCharaRippleFilterParam.prototype.charaId     = function() { return this._charaId; };
GLSLCharaRippleFilterParam.prototype.pitch       = function() { return this._pitch; };
GLSLCharaRippleFilterParam.prototype.innerRadius = function() { return this._innerRadius; };
GLSLCharaRippleFilterParam.prototype.outerRadius = function() { return this._outerRadius; };
GLSLCharaRippleFilterParam.prototype.strength    = function() { return this._strength; };
GLSLCharaRippleFilterParam.prototype.scaleX      = function() { return this._scaleX; };
GLSLCharaRippleFilterParam.prototype.scaleY      = function() { return this._scaleY; };
GLSLCharaRippleFilterParam.prototype.offsetX     = function() { return this._offsetX; };
GLSLCharaRippleFilterParam.prototype.offsetY     = function() { return this._offsetY; };
GLSLCharaRippleFilterParam.prototype.r           = function() { return this._color.r; };
GLSLCharaRippleFilterParam.prototype.g           = function() { return this._color.g; };
GLSLCharaRippleFilterParam.prototype.b           = function() { return this._color.b; };

GLSLCharaRippleFilterParam.prototype.filterClass = function() { return GLSLCharaRippleFilter; };
GLSLCharaRippleFilterParam.prototype.targetLayer = function() { return this._targetLayer; };

GLSLCharaRippleFilterParam.prototype.character = function() {
    if (this._charaType === 'player') {
        return $gamePlayer;
    } else if (this._charaType === 'event') {
        return $gameMap.event(this._charaId);
    } else if (this._charaType === 'follower') {
        return $gamePlayer.followers().follower(this._charaId - 1);
    }
    return null;
};

GLSLCharaRippleFilterParam.prototype.update = function() {
    this.checkCharacter();
    this.updateTime();
    this.updateFade();
};

// 角色对象变化时自动移除（如离开地图、事件刷新）
GLSLCharaRippleFilterParam.prototype.checkCharacter = function() {
    if (!(SceneManager._scene instanceof Scene_Map)) {
        return;
    }
    if (this._character !== this.character()) {
        $gameScreen.glslFilterParamMap().remove(this);
    }
};

GLSLCharaRippleFilterParam.prototype.updateTime = function() {
    this._time += 1.0 / 60.0 * this._speed;
};

GLSLCharaRippleFilterParam.prototype.updateFade = function() {
    if (this._fadeState === 'fadingIn') {
        this._fadeRate += 1.0 / this._fadeFrame;
        if (this._fadeRate >= 1.0) {
            this._fadeRate = 1.0;
            this._fadeState = 'fadedIn';
        }
    } else if (this._fadeState === 'fadingOut') {
        this._fadeRate -= 1.0 / this._fadeFrame;
        if (this._fadeRate <= 0.0) {
            this._fadeRate = 0.0;
            this._fadeState = 'fadedOut';
        }
    }
};

GLSLCharaRippleFilterParam.prototype.fadeIn  = function() { this._fadeState = 'fadingIn'; };
GLSLCharaRippleFilterParam.prototype.fadeOut = function() { this._fadeState = 'fadingOut'; };
GLSLCharaRippleFilterParam.prototype.show    = function() { this._fadeRate = 1.0; this._fadeState = 'fadedIn'; };
GLSLCharaRippleFilterParam.prototype.hide    = function() { this._fadeRate = 0.0; this._fadeState = 'fadedOut'; };

//-----------------------------------------------------------------------------
// GLSLCharaRippleFilter （PIXI5 自包含滤镜）
//-----------------------------------------------------------------------------

window.GLSLCharaRippleFilter = function GLSLCharaRippleFilter() {
    this.initialize.apply(this, arguments);
};

GLSLCharaRippleFilter.prototype = Object.create(PIXI.Filter.prototype);
GLSLCharaRippleFilter.prototype.constructor = GLSLCharaRippleFilter;

GLSLCharaRippleFilter.prototype.initialize = function(sprite, param) {
    var uniforms = {
        uTime: param.time(),
        uFadeRate: param.fadeRate(),
        uPosition: new Float32Array([0.0, 0.0]),
        uInnerRadius: param.innerRadius(),
        uOuterRadius: param.outerRadius(),
        uStrength: param.strength(),
        uPitch: param.pitch(),
        uScale: new Float32Array([param.scaleX(), param.scaleY()]),
        uR: param.r(),
        uG: param.g(),
        uB: param.b()
    };
    PIXI.Filter.call(this, null, RIPPLE_FRAG, uniforms);
    this._sprite = sprite;
    this._param = param;
    this._characterSprite = null;
};

GLSLCharaRippleFilter.prototype.param = function() {
    return this._param;
};

GLSLCharaRippleFilter.prototype.characterSprite = function() {
    // 角色精灵可能在场景切换后失效，每帧重新解析
    this._characterSprite = findCharacterSprite(
        this._param.charaType(),
        this._param.charaId()
    );
    return this._characterSprite;
};

GLSLCharaRippleFilter.prototype.targetX = function() {
    return characterCenterX(this._characterSprite, this._param.offsetX());
};

GLSLCharaRippleFilter.prototype.targetY = function() {
    return characterCenterY(this._characterSprite, this._param.offsetY());
};

GLSLCharaRippleFilter.prototype.update = function() {
    var sprite = this.characterSprite();
    if (!sprite) {
        return;
    }
    this.uniforms.uTime = this._param.time();
    this.uniforms.uFadeRate = this._param.fadeRate();
    this.uniforms.uPosition[0] = this.targetX();
    this.uniforms.uPosition[1] = this.targetY();
    this.uniforms.uScale[0] = this._param.scaleX();
    this.uniforms.uScale[1] = this._param.scaleY();
};

//-----------------------------------------------------------------------------
// GLSLVortexFilterParam （漩涡/黑洞 参数）
//-----------------------------------------------------------------------------

window.GLSLVortexFilterParam = function GLSLVortexFilterParam() {
    this.initialize.apply(this, arguments);
};

GLSLVortexFilterParam.prototype.initialize = function(param) {
    param = param || {};
    this._time = 0.0;
    this._fadeRate = 0.0;
    this._speed       = param.hasOwnProperty('speed')       ? param.speed       : 1.0;
    this._fadeFrame   = param.hasOwnProperty('fadeFrame')   ? param.fadeFrame   : 60;
    this._fadeState   = param.hasOwnProperty('fadeState')   ? param.fadeState   : 'fadedOut';
    this._charaType   = param.hasOwnProperty('charaType')   ? param.charaType   : 'player';
    this._charaId     = param.hasOwnProperty('charaId')     ? param.charaId     : 1;
    this._radius      = param.hasOwnProperty('radius')      ? param.radius      : 140.0;
    this._strength    = param.hasOwnProperty('strength')    ? param.strength    : 0.35;
    this._swirl       = param.hasOwnProperty('swirl')       ? param.swirl       : 3.0;
    this._flow        = param.hasOwnProperty('flow')        ? param.flow        : 1.5;
    this._wind        = param.hasOwnProperty('wind')        ? param.wind        : 3.0;
    this._rotateSpeed = param.hasOwnProperty('rotateSpeed') ? param.rotateSpeed : 2.0;
    this._scaleX      = param.hasOwnProperty('scaleX')      ? param.scaleX      : 1.0;
    this._scaleY      = param.hasOwnProperty('scaleY')      ? param.scaleY      : 1.0;
    this._offsetX     = param.hasOwnProperty('offsetX')     ? param.offsetX     : 0.0;
    this._offsetY     = param.hasOwnProperty('offsetY')     ? param.offsetY     : 0.0;
    this._targetLayer = param.hasOwnProperty('targetLayer') ? param.targetLayer : 'all';
    this._character = this.character();
};

GLSLVortexFilterParam.prototype.filterClass  = function() { return GLSLVortexFilter; };
GLSLVortexFilterParam.prototype.targetLayer  = function() { return this._targetLayer; };
GLSLVortexFilterParam.prototype.time         = function() { return this._time; };
GLSLVortexFilterParam.prototype.fadeRate     = function() { return this._fadeRate; };
GLSLVortexFilterParam.prototype.charaType    = function() { return this._charaType; };
GLSLVortexFilterParam.prototype.charaId      = function() { return this._charaId; };
GLSLVortexFilterParam.prototype.radius       = function() { return this._radius; };
GLSLVortexFilterParam.prototype.strength     = function() { return this._strength; };
GLSLVortexFilterParam.prototype.swirl        = function() { return this._swirl; };
GLSLVortexFilterParam.prototype.flow         = function() { return this._flow; };
GLSLVortexFilterParam.prototype.wind         = function() { return this._wind; };
GLSLVortexFilterParam.prototype.rotateSpeed  = function() { return this._rotateSpeed; };
GLSLVortexFilterParam.prototype.scaleX       = function() { return this._scaleX; };
GLSLVortexFilterParam.prototype.scaleY       = function() { return this._scaleY; };
GLSLVortexFilterParam.prototype.offsetX      = function() { return this._offsetX; };
GLSLVortexFilterParam.prototype.offsetY      = function() { return this._offsetY; };

GLSLVortexFilterParam.prototype.character = function() {
    if (this._charaType === 'player') {
        return $gamePlayer;
    } else if (this._charaType === 'event') {
        return $gameMap.event(this._charaId);
    } else if (this._charaType === 'follower') {
        return $gamePlayer.followers().follower(this._charaId - 1);
    }
    return null;
};

GLSLVortexFilterParam.prototype.update = function() {
    this.checkCharacter();
    this._time += 1.0 / 60.0 * this._speed;
    this.updateFade();
};

GLSLVortexFilterParam.prototype.checkCharacter = function() {
    if (!(SceneManager._scene instanceof Scene_Map)) {
        return;
    }
    if (this._character !== this.character()) {
        $gameScreen.glslFilterParamMap().remove(this);
    }
};

GLSLVortexFilterParam.prototype.updateFade = function() {
    if (this._fadeState === 'fadingIn') {
        this._fadeRate += 1.0 / this._fadeFrame;
        if (this._fadeRate >= 1.0) {
            this._fadeRate = 1.0;
            this._fadeState = 'fadedIn';
        }
    } else if (this._fadeState === 'fadingOut') {
        this._fadeRate -= 1.0 / this._fadeFrame;
        if (this._fadeRate <= 0.0) {
            this._fadeRate = 0.0;
            this._fadeState = 'fadedOut';
        }
    }
};

GLSLVortexFilterParam.prototype.fadeIn  = function() { this._fadeState = 'fadingIn'; };
GLSLVortexFilterParam.prototype.fadeOut = function() { this._fadeState = 'fadingOut'; };
GLSLVortexFilterParam.prototype.show    = function() { this._fadeRate = 1.0; this._fadeState = 'fadedIn'; };
GLSLVortexFilterParam.prototype.hide    = function() { this._fadeRate = 0.0; this._fadeState = 'fadedOut'; };

//-----------------------------------------------------------------------------
// GLSLVortexFilter （PIXI5 自包含漩涡滤镜）
//-----------------------------------------------------------------------------

window.GLSLVortexFilter = function GLSLVortexFilter() {
    this.initialize.apply(this, arguments);
};

GLSLVortexFilter.prototype = Object.create(PIXI.Filter.prototype);
GLSLVortexFilter.prototype.constructor = GLSLVortexFilter;

GLSLVortexFilter.prototype.initialize = function(sprite, param) {
    var uniforms = {
        uTime: param.time(),
        uFadeRate: param.fadeRate(),
        uCenter: new Float32Array([0.0, 0.0]),
        uRadius: param.radius(),
        uStrength: param.strength(),
        uSwirl: param.swirl(),
        uFlow: param.flow(),
        uWind: param.wind(),
        uRotateSpeed: param.rotateSpeed(),
        uScale: new Float32Array([param.scaleX(), param.scaleY()])
    };
    PIXI.Filter.call(this, null, VORTEX_FRAG, uniforms);
    this._sprite = sprite;
    this._param = param;
    this._characterSprite = null;
};

GLSLVortexFilter.prototype.param = function() {
    return this._param;
};

GLSLVortexFilter.prototype.characterSprite = function() {
    this._characterSprite = findCharacterSprite(
        this._param.charaType(),
        this._param.charaId()
    );
    return this._characterSprite;
};

GLSLVortexFilter.prototype.update = function() {
    var sprite = this.characterSprite();
    if (!sprite) {
        return;
    }
    // 半径随地图缩放，跟着画面一起放大
    var zoom = $gameScreen.zoomScale();
    this.uniforms.uTime = this._param.time();
    this.uniforms.uFadeRate = this._param.fadeRate();
    this.uniforms.uCenter[0] = characterCenterX(sprite, this._param.offsetX());
    this.uniforms.uCenter[1] = characterCenterY(sprite, this._param.offsetY());
    this.uniforms.uRadius = this._param.radius() * zoom;
    this.uniforms.uStrength = this._param.strength();
    this.uniforms.uSwirl = this._param.swirl();
    this.uniforms.uFlow = this._param.flow();
    this.uniforms.uWind = this._param.wind();
    this.uniforms.uRotateSpeed = this._param.rotateSpeed();
    this.uniforms.uScale[0] = this._param.scaleX();
    this.uniforms.uScale[1] = this._param.scaleY();
};

//-----------------------------------------------------------------------------
// Spriteset_Base （监视屏幕参数表，自动挂载/卸载滤镜）
//-----------------------------------------------------------------------------

// 受本插件管理的滤镜：带 param() 方法（波纹/漩涡均可），占位滤镜没有
function isManagedGlslFilter(filter) {
    return !!filter && typeof filter.param === 'function';
}

// 每个宿主各自的占位滤镜：避免“数组最后一个滤镜坐标上下翻转”的 PIXI 问题
function glslDummyFilterFor(host) {
    if (!host.__glslDummyFilter) {
        host.__glslDummyFilter = new PIXI.Filter();
    }
    return host.__glslDummyFilter;
}

// 参数的目标层（未声明则视为 'all'）
function glslTargetLayer(param) {
    return (param && typeof param.targetLayer === 'function') ? param.targetLayer() : 'all';
}

// 本插件支持挂载滤镜的层
var GLSL_FILTER_LAYERS = ['all', 'tile', 'upper'];

var _Spriteset_Base_update = Spriteset_Base.prototype.update;
Spriteset_Base.prototype.update = function() {
    _Spriteset_Base_update.apply(this, arguments);
    this.updateGlslManagedFilters();
};

// 目标层 → 挂载宿主 DisplayObject
//   'all'         整个画面（含角色/事件精灵），等同旧行为
//   'tile'/'ground' 仅地面图块层（_lowerLayer），不影响其上的角色/事件
//   'upper'       仅上层覆盖图块（_upperLayer）
Spriteset_Base.prototype.glslFilterHost = function(layerKey) {
    if (layerKey === 'tile' || layerKey === 'ground') {
        return this._tilemap ? this._tilemap._lowerLayer : null;
    }
    if (layerKey === 'upper') {
        return this._tilemap ? this._tilemap._upperLayer : null;
    }
    return this;
};

Spriteset_Base.prototype.updateGlslManagedFilters = function() {
    if (typeof $gameScreen === 'undefined' || !$gameScreen) {
        return;
    }
    var map = $gameScreen.glslFilterParamMap();
    // 按目标层把参数分组
    var groups = {};
    map.values().forEach(function(param) {
        if (!param || typeof param.filterClass !== 'function') {
            return;
        }
        var key = glslTargetLayer(param);
        (groups[key] || (groups[key] = [])).push(param);
    });
    // 对每个可能的宿主层做清理/添加/更新
    GLSL_FILTER_LAYERS.forEach(function(key) {
        var host = this.glslFilterHost(key);
        if (host) {
            this.refreshGlslHostFilters(host, groups[key] || []);
        }
    }, this);
};

Spriteset_Base.prototype.refreshGlslHostFilters = function(host, params) {
    var dummy = glslDummyFilterFor(host);
    // 清理：移除目标已不在该层的受管滤镜
    if (host.filters) {
        host.filters = host.filters.filter(function(filter) {
            if (isManagedGlslFilter(filter)) {
                return params.indexOf(filter.param()) !== -1;
            }
            return true;
        });
    }
    // 添加：该层新出现的参数
    var existing = (host.filters || []).filter(isManagedGlslFilter).map(function(f) {
        return f.param();
    });
    params.forEach(function(param) {
        if (existing.indexOf(param) !== -1) {
            return;
        }
        var FilterClass = param.filterClass();
        var filter = new FilterClass(this, param);
        host.filters = (host.filters || []).filter(function(f) { return f !== dummy; });
        host.filters = host.filters.concat([filter, dummy]);
    }, this);
    // 该层已无受管滤镜 → 移除占位滤镜
    var managed = (host.filters || []).filter(isManagedGlslFilter);
    if (managed.length === 0 && host.filters) {
        host.filters = host.filters.filter(function(f) { return f !== dummy; });
    }
    // 逐帧更新
    managed.forEach(function(filter) {
        filter.update();
    });
};

})();
