//=============================================================================
//
//=============================================================================
/*:
 * @target MZ MV
 * @plugindesc [MapFilter For QJ-MapProjectileMZ][24-12-2]
 * @author Qiu Jiu
 * @base QJ-MapProjectileMZ
 * @orderAfter QJ-MapProjectileMZ
 *
 * @help 
 * need QJ-MapProjectileMZ
 * set the attribute z of projectile or laser to:
 *"MF_BR"     Transform the current projectile to a distorted effect and place it below the player
 *"MF_BG"     Transform the current projectile to a exposure effect and place it below the player
 *"MF_UR"     Transform the current projectile to a distorted effect and place it above the player
 *"MF_UG"     Transform the current projectile to a exposure effect and place it above the player
 *"MF_BA"     Transform the current projectile to an additive(linear add) effect and place it below the player
 *"MF_UA"     Transform the current projectile to an additive(linear add) effect and place it above the player
 *
 *
*/

/*:zh
 * @target MZ MV
 * @plugindesc [QJ-MapProjectileMZ滤镜弹幕][24-12-2]
 * @author Qiu Jiu
 *
 * @help 
 * 需要有QJ-MapProjectileMZ
 * 在发射弹幕时将z值设置成如下值即可将弹幕变成对应的功能：
 *"MF_BR"     将当前弹幕变成扭曲效果，且在玩家之下
 *"MF_BG"     将当前弹幕变成曝光效果，且在玩家之下
 *"MF_UR"     将当前弹幕变成扭曲效果，且在玩家之上
 *"MF_UG"     将当前弹幕变成曝光效果，且在玩家之上
 *"MF_BA"     将当前弹幕变成加算(线性叠加)效果，且在玩家之下
 *"MF_UA"     将当前弹幕变成加算(线性叠加)效果，且在玩家之上
 *
 *
*/
//=============================================================================
//
//=============================================================================
QJ.mapFilter = {reWrite:{}};
//=============================================================================
//
//=============================================================================
//=============================================================================
//
//=============================================================================
(($ = {}) => {
//=============================================================================
//
//=============================================================================
var isMV = Utils.RPGMAKER_NAME === 'MV';
//=============================================================================
//
//=============================================================================
$.Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
Spriteset_Map.prototype.createLowerLayer = function() {

    this.addChild(this._mapFilterContainer0 = new Sprite_ProjectileContainerQJMZ());
    this.addChild(this._mapFilterContainer1 = new Sprite_ProjectileContainerQJMZ());
    this._mapFilterBelow = new MapEffectFilter(this._mapFilterContainer0,this._mapFilterContainer1);

    this.addChild(this._mapFilterContainer2 = new Sprite_ProjectileContainerQJMZ());
    this.addChild(this._mapFilterContainer3 = new Sprite_ProjectileContainerQJMZ());

    this._mapFilterContainer0.visible = false;
    this._mapFilterContainer1.visible = false;
    this._mapFilterContainer2.visible = false;
    this._mapFilterContainer3.visible = false;

    // MF_UA uses PIXI's native ADD blend in QJ's above-all container.  It does
    // not need a full-screen render texture or a filter pass.
    this._mapFilterUpper = new MapEffectFilter(this._mapFilterContainer2,this._mapFilterContainer3);
    $.Spriteset_Map_createLowerLayer.call(this);

    // MF_BA can use native ADD too.  z=0 in the tilemap keeps it below map
    // characters (the same stage as QJ's E container) without filtering the
    // entire lower layer.
    this._mapFilterContainer4 = new Sprite_ProjectileContainerQJMZ();
    this._mapFilterContainer4.blendMode = PIXI.BLEND_MODES.ADD;
    this._mapFilterContainer4.z = 0;
    this._tilemap.addChild(this._mapFilterContainer4);

    if (isMV) {
        if (this._tilemap.lowerZLayer) this.addFilterTo(this._mapFilterBelow,this._tilemap.lowerZLayer);
        this.addFilterTo(this._mapFilterUpper,this);
    }
};
// Put the direct MF_UA layer at the same "above all" stage as QJ's A layer,
// but keep it separate so MF_UA projectiles remain above ordinary A bullets.
$.Spriteset_Map_createTimer = Spriteset_Map.prototype.createTimer;
Spriteset_Map.prototype.createTimer = function() {
    $.Spriteset_Map_createTimer.call(this);
    if (this.constructor === Spriteset_Map) {
        this._mapFilterContainer5 = new Sprite_ProjectileContainerQJMZ();
        this._mapFilterContainer5.blendMode = PIXI.BLEND_MODES.ADD;
        this.addChild(this._mapFilterContainer5);
    }
};
if (!isMV) {
$.Spriteset_Base_createOverallFilters = Spriteset_Base.prototype.createOverallFilters;
Spriteset_Base.prototype.createOverallFilters = function() {
    $.Spriteset_Base_createOverallFilters.call(this);
    if (this._tilemap._lowerLayer) this.addFilterTo(this._mapFilterBelow,this._tilemap._lowerLayer);
    this.addFilterTo(this._mapFilterUpper,this);
};
}
$.Spriteset_Map_createBulletQJExtra_Lightning = Spriteset_Map.prototype.createBulletQJExtra;
Spriteset_Map.prototype.createBulletQJExtra = function(index,type,data,spriteData) {
    $.Spriteset_Map_createBulletQJExtra_Lightning.apply(this,arguments);
	let z = data && data.data ? data.data.z : null;
    if        (z==="MF_BR") {//Below charter, Replace filter
        this._mapFilterContainer0.addChild(spriteData);
    } else if (z==="MF_BG") {//Below charter, Glow filter
        this._mapFilterContainer1.addChild(spriteData);
    } else if (z==="MF_UR") {//Upper charter, Replace filter
        this._mapFilterContainer2.addChild(spriteData);
    } else if (z==="MF_UG") {//Upper charter, Glow filter
        this._mapFilterContainer3.addChild(spriteData);
    } else if (z==="MF_BA") {//Below character, Native additive layer
        this._mapFilterContainer4.addChild(spriteData);
    } else if (z==="MF_UA") {//Upper character, Native additive layer
        this._mapFilterContainer5.addChild(spriteData);
    }
};
$.Spriteset_Map_addBulletToContainerQJ = Spriteset_Map.prototype.addBulletToContainerQJ;
Spriteset_Map.prototype.addBulletToContainerQJ = function(index,spriteData) {
    let data = $gameMap.bulletQJ(index);
    if (data && data.data && (data.data.z === "MF_UA" || data.data.z === "MF_BA")) {
        // The old implementation composited an entire full-HD render texture
        // only to perform this ADD operation.  Native ADD is visually
        // equivalent for the projectile and keeps the cost proportional to the
        // projectile's pixels instead of the whole map.
        let addMode = PIXI.BLEND_MODES.ADD;
        if (!Object.prototype.hasOwnProperty.call(data,"_mapFilterOriginalBlendMode")) {
            data._mapFilterOriginalBlendMode = data.data.blendMode;
        }
        data.data.blendMode = addMode;
        spriteData.blendMode = addMode;
    } else if (data && data.data &&
               Object.prototype.hasOwnProperty.call(data,"_mapFilterOriginalBlendMode")) {
        // Preserve changeAttribute("z", ...) behaviour when a live projectile
        // leaves either direct additive MF layer again.
        data.data.blendMode = data._mapFilterOriginalBlendMode;
        spriteData.blendMode = data._mapFilterOriginalBlendMode;
        delete data._mapFilterOriginalBlendMode;
    }
    $.Spriteset_Map_addBulletToContainerQJ.apply(this,arguments);
};
$.Spriteset_Map_findBulletContainerQJ = Spriteset_Map.prototype.findBulletContainerQJ;
Spriteset_Map.prototype.findBulletContainerQJ = function(index) {
    let data = $gameMap.bulletQJ(index);
    let container = $.Spriteset_Map_findBulletContainerQJ.apply(this,arguments);
    if (!!container) return container;
	if (!data || !data.data) return null;  // <- 关键保护
	let z = data.data.z;
    if      (z==="MF_BR") return this._mapFilterContainer0;
    else if (z==="MF_BG") return this._mapFilterContainer1;
    else if (z==="MF_UR") return this._mapFilterContainer2;
    else if (z==="MF_UG") return this._mapFilterContainer3;
    else if (z==="MF_BA") return this._mapFilterContainer4;
    else if (z==="MF_UA") return this._mapFilterContainer5;
    else return null;
};
$.Spriteset_Map_update = Spriteset_Map.prototype.update;
Spriteset_Map.prototype.update = function() {
    $.Spriteset_Map_update.call(this);
    //=== 没有对应 MF 滤镜弹幕时整体摘掉滤镜，避免每帧整张地图多走一遍离屏全屏 pass ===
    // MF_BA is rendered directly with native ADD and does not activate the
    // lower-layer full-screen filter.
    let belowActive = this._mapFilterContainer0.children.length > 0
                   || this._mapFilterContainer1.children.length > 0;
    // MF_UA is rendered directly with native ADD and must not activate this
    // full-screen filter.
    let upperActive = this._mapFilterContainer2.children.length > 0
                   || this._mapFilterContainer3.children.length > 0;
    let lowerTarget = this._tilemap ? (isMV ? this._tilemap.lowerZLayer : this._tilemap._lowerLayer) : null;
    this.toggleMapFilterQJ(this._mapFilterBelow,lowerTarget,belowActive);
    this.toggleMapFilterQJ(this._mapFilterUpper,this,upperActive);
};
Spriteset_Map.prototype.toggleMapFilterQJ = function(filter,target,active) {
    if (!filter || !target) return;
    let list = target.filters;
    let idx = list ? list.indexOf(filter) : -1;
    if (active) {
        if (idx < 0) {
            if (list) { list.push(filter); target.filters = list; }
            else { target.filters = [filter]; }
        }
        filter.update();//只在挂着时才重渲那几张 RT
    } else if (idx >= 0) {
        list.splice(idx,1);
        target.filters = list;
    }
};
Spriteset_Map.prototype.addFilterTo = function(filter,target) {
    if (target.filters) {
        target.filters.push(filter);
        target.filters = target.filters;
    } else {
        target.filters = [filter];
    }
    let margin = 20;
    target.filterArea = new PIXI.Rectangle(-margin,-margin,Graphics.width+margin*2,Graphics.height+margin*2);
};
//=============================================================================
//
//=============================================================================
if (isMV) {
//=============================================================================
//
//=============================================================================
var vertex = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;
uniform vec4 colorTone;

varying vec2 vTextureCoord;

void main(void) {
    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
}
`;

var fragment = `
varying vec2 vTextureCoord;
uniform sampler2D uSampler;

uniform vec2 rate;
uniform sampler2D replaceTexture;
uniform sampler2D glowTexture;
uniform float uReplaceActive;
uniform float uGlowActive;

void main(void) {
    float x = vTextureCoord.x;
    float y = vTextureCoord.y;

    vec2 effectCoord = vec2(vTextureCoord.x/rate.x,vTextureCoord.y/rate.y);

    if (uReplaceActive > 0.5) {
        vec4 e0 = texture2D(replaceTexture, effectCoord);
        float ox = (e0.r - 0.5) * 0.1 * e0.a;
        float oy = (e0.g - 0.5) * 0.1 * e0.a;

        if (x + ox >= rate.x) {
            x += e0.r * (rate.x - x);
        } else if (x + ox <= 0.0) {
            x += e0.r * x;
        } else {
            x += ox;
        }

        if (y + oy >= rate.y) {
            y += e0.g * (rate.y - y);
        } else if (y + oy <= 0.0) {
            y += e0.g * y;
        } else {
            y += oy;
        }
    }

    vec4 c = texture2D(uSampler, vec2(x,y));

    float r = c.r;
    float g = c.g;
    float b = c.b;
    float a = c.a;

    if (uGlowActive > 0.5) {
        vec4 e1 = texture2D(glowTexture, effectCoord);

        if (e1.r >= 1.0) r = 1.0;
        else r *= e1.r/(1.0-e1.r);

        if (e1.g >= 1.0) g = 1.0;
        else g *= e1.g/(1.0-e1.g);

        if (e1.b >= 1.0) b = 1.0;
        else b *= e1.b/(1.0-e1.b);
    }

    gl_FragColor = vec4(r,g,b,a);
}
`;
//=============================================================================
//
//=============================================================================
function MapEffectFilter() {
    this.initialize.apply(this,arguments);
}
window.MapEffectFilter = MapEffectFilter;
MapEffectFilter.prototype = Object.create(PIXI.Filter.prototype);
MapEffectFilter.prototype.constructor = MapEffectFilter;
MapEffectFilter.prototype.initialize = function(replaceContainer,glowContainer) {
    PIXI.Filter.call(this,vertex,fragment);
    this.uniforms.rate = [1,1];
    this._replaceContainer = replaceContainer;
    this._glowContainer = glowContainer;
    this.uniforms.replaceTexture = PIXI.RenderTexture.create(Graphics.width,Graphics.height);
    this.uniforms.glowTexture = PIXI.RenderTexture.create(Graphics.width,Graphics.height);
    this.uniforms.uReplaceActive = 0.0;
    this.uniforms.uGlowActive = 0.0;
    this._needInitGlowTexture = true;
};
MapEffectFilter.prototype.updateEffectTexture = function(renderer,container,texture,active) {
    if (!active) return;
    container.visible = true;
    container.updateTransform();
    renderer.render(container,texture,true,null,true);
    container.visible = false;
};
MapEffectFilter.prototype.update = function() {
    //===============================================================
    let renderer = Graphics._renderer;
    //===============================================================
    if (this._needInitGlowTexture) {
        this._needInitGlowTexture = false;
        renderer.textureManager.updateTexture(this.uniforms.glowTexture.baseTexture,0);
        let rendererTarget = this.uniforms.glowTexture.baseTexture._glRenderTargets[renderer.CONTEXT_UID];
        rendererTarget.clearColor = [0.5,0.5,0.5,1.0];
    }

    let replaceActive = this._replaceContainer.children.length > 0;
    let glowActive = this._glowContainer.children.length > 0;
    this.updateEffectTexture(renderer,this._replaceContainer,this.uniforms.replaceTexture,replaceActive);
    this.updateEffectTexture(renderer,this._glowContainer,this.uniforms.glowTexture,glowActive);
    this.uniforms.uReplaceActive = replaceActive ? 1.0 : 0.0;
    this.uniforms.uGlowActive = glowActive ? 1.0 : 0.0;
    //===============================================================
};
MapEffectFilter.prototype.apply = function(filterManager, input, output, clear, currentState) {
    this.uniforms.rate[0] = Graphics.width/input.size.width;
    this.uniforms.rate[1] = Graphics.height/input.size.height;
    PIXI.Filter.prototype.apply.call(this,filterManager, input, output, clear, currentState);
};
//=============================================================================
//
//=============================================================================
} else {
//=============================================================================
//
//=============================================================================
var vertex = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;
uniform vec4 colorTone;

varying vec2 vTextureCoord;

void main(void) {
    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
}
`;

var fragment = `
varying vec2 vTextureCoord;
uniform sampler2D uSampler;

uniform sampler2D replaceTexture;
uniform sampler2D glowTexture;
uniform float uReplaceActive;
uniform float uGlowActive;

void main(void) {
    float x = vTextureCoord.x;
    float y = vTextureCoord.y;

    if (uReplaceActive > 0.5) {
        vec4 e0 = texture2D(replaceTexture, vTextureCoord);
        float ox = (e0.r - 0.5) * 0.1 * e0.a;
        float oy = (e0.g - 0.5) * 0.1 * e0.a;
        x += ox;
        y += oy;
    }

    vec4 c = texture2D(uSampler, vec2(x,y));

    float r = c.r;
    float g = c.g;
    float b = c.b;
    float a = c.a;

    if (uGlowActive > 0.5) {
        vec4 e1 = texture2D(glowTexture, vTextureCoord);

        if (e1.r >= 1.0) r = 1.0;
        else r *= e1.r/(1.0-e1.r);

        if (e1.g >= 1.0) g = 1.0;
        else g *= e1.g/(1.0-e1.g);

        if (e1.b >= 1.0) b = 1.0;
        else b *= e1.b/(1.0-e1.b);
    }

    gl_FragColor = vec4(r,g,b,a);
}
`;
//=============================================================================
//
//=============================================================================
function MapEffectFilter() {
    this.initialize.apply(this,arguments);
}
window.MapEffectFilter = MapEffectFilter;
MapEffectFilter.prototype = Object.create(PIXI.Filter.prototype);
MapEffectFilter.prototype.constructor = MapEffectFilter;
MapEffectFilter.prototype.initialize = function(replaceContainer,glowContainer) {
    PIXI.Filter.call(this,vertex,fragment);
    this._replaceContainer = replaceContainer;
    this._glowContainer = glowContainer;
    this.uniforms.replaceTexture = PIXI.RenderTexture.create(Graphics.width,Graphics.height);
    this.uniforms.glowTexture = PIXI.RenderTexture.create(Graphics.width,Graphics.height);
    this.uniforms.glowTexture.baseTexture.clearColor = [0.5,0.5,0.5,1.0];
    this.uniforms.uReplaceActive = 0.0;
    this.uniforms.uGlowActive = 0.0;
};
MapEffectFilter.prototype.updateEffectTexture = function(renderer,container,texture,active) {
    if (!active) return;
    container.visible = true;
    container.updateTransform();
    renderer.render(container,texture,true,null,true);
    container.visible = false;
};
MapEffectFilter.prototype.update = function() {
    //===============================================================
    let renderer = Graphics._app.renderer;
    //===============================================================
    let replaceActive = this._replaceContainer.children.length > 0;
    let glowActive = this._glowContainer.children.length > 0;
    this.updateEffectTexture(renderer,this._replaceContainer,this.uniforms.replaceTexture,replaceActive);
    this.updateEffectTexture(renderer,this._glowContainer,this.uniforms.glowTexture,glowActive);
    this.uniforms.uReplaceActive = replaceActive ? 1.0 : 0.0;
    this.uniforms.uGlowActive = glowActive ? 1.0 : 0.0;
};
//=============================================================================
//
//=============================================================================
}
//=============================================================================
//
//=============================================================================
/*
QJ.sssssss = function() {
    QJ.MPMZ.Shoot({
        img:"normalMap0",
        initialRotation:['M'],
        existData:[{t:["Time",300]}],
        moveType:["S",0],
        z:"MF_UR"
    });
};
*/
//=============================================================================
//
//=============================================================================
})(QJ.mapFilter.reWrite);
//=============================================================================
//
//=============================================================================
