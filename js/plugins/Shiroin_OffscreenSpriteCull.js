//=============================================================================
// Shiroin_OffscreenSpriteCull.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Offscreen event sprite culling + unified perf hub (redundant per-frame work elimination).
 * @author Shiroin
 * @help
 * Section 1: Offscreen culling.
 * This plugin culls only Game_Event sprites. Game_Event update/AI/movement still
 * runs from Game_Map, so offscreen enemies and event logic continue normally.
 *
 * Add <noCull> to an event note to keep its sprite always attached/updated.
 *
 * Runtime controls:
 *   window.ShiroinOffscreenCull.enabled = true/false
 *   window.ShiroinOffscreenCull.detachSprites = true/false
 *   window.ShiroinOffscreenCull.total / culled / detached are frame counters.
 *
 * Section 2: Perf hub (batch 1, based on Android trace 2026-07-07).
 * Redundancy-elimination patches. No plugin feature is reduced; each patch
 * only skips work whose inputs have not changed since last frame.
 *   window.ShiroinPerfHub.vbOffsetCache    - QJ_VirtualButton: cache canvas
 *       offsetLeft/offsetTop (was: forced reflow per button per frame)
 *   window.ShiroinPerfHub.vbRefreshGate    - QJ_VirtualButton: skip
 *       refreshDivAttribute when all inputs are unchanged
 *   window.ShiroinPerfHub.coasBitmapCache  - Drill_CoreOfActionSequence:
 *       decorator caches its bitmap; ImageManager.loadBitmap (url build +
 *       encodeURI) only runs when path/name/tint/smooth change
 *   window.ShiroinPerfHub.memoMobileDevice - Utils.isMobileDevice returns a
 *       memoized result (was: userAgent regex per call, per bullet per frame)
 *
 * Batch 1.5 / 2 (based on Android trace 2026-07-07 18:40):
 *   window.ShiroinPerfHub.eceBitmapGate    - Drill_EventContinuedEffect:
 *       drill_ECE_updateBitmap reads _bitmap directly and only re-measures
 *       when bitmap changed / measurement pending / effect playing
 *       (was: 2 deoptimized accessor reads per character sprite per frame)
 *   window.ShiroinPerfHub.fastSpriteUpdate - core Sprite.update children walk
 *       uses an index loop (was: for..of iterator allocation per container
 *       per frame)
 *   window.ShiroinPerfHub.hotbarRedrawGate - Hendrix hotbar: skip clear() on
 *       already-blank quantity/mana bitmaps (was: clear per empty slot per
 *       frame -> texSubImage2D re-upload); refreshButtonText skipped while
 *       (config, gamepad presence) unchanged, re-run once per 60 frames
 * Each flag can be flipped at runtime for A/B measurement.
 */
(function(){
	"use strict";

	var CFG = window.ShiroinOffscreenCull = {
		enabled: true,
		detachSprites: true,
		marginTilesX: 3,
		marginTilesTop: 4,
		marginTilesBottom: 4,
		// Cull states are re-evaluated once per sliceInterval frames instead of
		// every frame. The 3-4 tile margins cover far more distance than any
		// character can move in that window, so visibility is unaffected.
		sliceInterval: 3,
		total: 0,
		culled: 0,
		detached: 0,
		_lastPassFrame: -99
	};

	function refreshFrameState(){
		CFG._frameId = (Graphics && Graphics.frameCount) || 0;
		CFG._tw = $gameMap.tileWidth();
		CFG._th = $gameMap.tileHeight();
		var scale = ($gameScreen && $gameScreen.zoomScale) ? $gameScreen.zoomScale() : 1;
		if( !scale ){ scale = 1; }
		CFG._viewW = Graphics.width / scale;
		CFG._viewH = Graphics.height / scale;
	}

	function isCullableEvent(character){
		if( !(character instanceof Game_Event) ){ return false; }
		if( character._shiroin_noCull === undefined ){
			var ev = character.event && character.event();
			character._shiroin_noCull = !!(ev && ev.note && ev.note.indexOf("<noCull>") >= 0);
		}
		return !character._shiroin_noCull;
	}

	function isCharOnScreen(character){
		var tw = CFG._tw || $gameMap.tileWidth();
		var th = CFG._th || $gameMap.tileHeight();
		var viewW = CFG._viewW || Graphics.width;
		var viewH = CFG._viewH || Graphics.height;
		var x = character.scrolledX() * tw;
		var y = character.scrolledY() * th;
		return x >= -CFG.marginTilesX * tw && x <= viewW + CFG.marginTilesX * tw &&
			y >= -CFG.marginTilesTop * th && y <= viewH + CFG.marginTilesBottom * th;
	}

	function detachSprite(sprite){
		if( !CFG.detachSprites || !sprite ){ return; }
		if( sprite.parent ){
			sprite._shiroinCullParent = sprite.parent;
			sprite.parent.removeChild(sprite);
		}
		sprite._shiroinDetached = true;
		sprite.visible = false;
	}

	function attachSprite(sprite, fallbackParent){
		if( !sprite || !sprite._shiroinDetached ){ return; }
		var parent = sprite._shiroinCullParent || fallbackParent;
		if( parent && !sprite.parent ){
			parent.addChild(sprite);
		}
		sprite._shiroinDetached = false;
		sprite._shiroinCullParent = null;
	}

	function updateSpriteCullState(sprite, fallbackParent){
		var ch = sprite && sprite._character;
		if( !ch || !isCullableEvent(ch) ){
			attachSprite(sprite, fallbackParent);
			return;
		}
		CFG.total++;
		var onScreen = isCharOnScreen(ch);
		sprite._shiroinCullFrame = CFG._frameId;
		sprite._shiroinCullOnScreen = onScreen;
		if( onScreen ){
			attachSprite(sprite, fallbackParent);
		}else{
			CFG.culled++;
			if( CFG.detachSprites ){
				detachSprite(sprite);
			}else{
				attachSprite(sprite, fallbackParent);
			}
		}
	}

	function updateSpritesetCull(spriteset){
		if( !spriteset || !spriteset._characterSprites || !$gameMap ){ return; }
		var frameId = (Graphics && Graphics.frameCount) || 0;
		if( frameId - CFG._lastPassFrame < CFG.sliceInterval && frameId >= CFG._lastPassFrame ){
			return;
		}
		CFG._lastPassFrame = frameId;
		refreshFrameState();
		var list = spriteset._characterSprites;
		var fallbackParent = spriteset._tilemap;
		for( var i = 0; i < list.length; i++ ){
			updateSpriteCullState(list[i], fallbackParent);
		}
	}

	function getMapSpriteset(){
		var scene = SceneManager && SceneManager._scene;
		return scene && scene._spriteset;
	}

	function attachSpriteForEvent(event){
		var spriteset = getMapSpriteset();
		if( !spriteset || !spriteset._characterSprites ){ return; }
		var list = spriteset._characterSprites;
		for( var i = 0; i < list.length; i++ ){
			var sprite = list[i];
			if( sprite && sprite._character === event ){
				attachSprite(sprite, spriteset._tilemap);
				return;
			}
		}
	}

	var _Sprite_Character_update = Sprite_Character.prototype.update;
	Sprite_Character.prototype.update = function(){
		var ch = this._character;
		if( CFG.enabled && $gameMap && isCullableEvent(ch) ){
			var onScreen;
			if( this._shiroinCullFrame !== undefined &&
				CFG._frameId - this._shiroinCullFrame < CFG.sliceInterval ){
				onScreen = this._shiroinCullOnScreen;
			}else{
				refreshFrameState();
				CFG.total++;
				onScreen = isCharOnScreen(ch);
				this._shiroinCullFrame = CFG._frameId;
				this._shiroinCullOnScreen = onScreen;
			}
			if( !onScreen ){
				detachSprite(this);
				this.visible = false;
				return;
			}
		}
		_Sprite_Character_update.apply(this, arguments);
	};

	var _Spriteset_Map_update = Spriteset_Map.prototype.update;
	Spriteset_Map.prototype.update = function(){
		CFG.total = 0;
		CFG.culled = 0;
		CFG.detached = 0;
		if( CFG.enabled ){
			updateSpritesetCull(this);
		}else if( this._characterSprites ){
			for( var i = 0; i < this._characterSprites.length; i++ ){
				attachSprite(this._characterSprites[i], this._tilemap);
			}
		}
		_Spriteset_Map_update.apply(this, arguments);
		if( this._characterSprites ){
			for( var j = 0; j < this._characterSprites.length; j++ ){
				if( this._characterSprites[j]._shiroinDetached ){ CFG.detached++; }
			}
		}
	};

	if( Game_Map.prototype.drill_COEM_deleteEvent_Private ){
		var _drill_COEM_deleteEvent_Private = Game_Map.prototype.drill_COEM_deleteEvent_Private;
		Game_Map.prototype.drill_COEM_deleteEvent_Private = function(e_id){
			var event = this._events && this._events[e_id];
			if( event ){
				attachSpriteForEvent(event);
			}
			_drill_COEM_deleteEvent_Private.apply(this, arguments);
		};
	}

})();

//=============================================================================
// Perf Hub - batch 1 (2026-07)
// Redundant per-frame work elimination. Every patch is behavior-preserving:
// it only skips recomputation when the inputs are provably unchanged.
//=============================================================================
(function(){
	"use strict";

	var HUB = window.ShiroinPerfHub = {
		vbOffsetCache: true,
		vbRefreshGate: true,
		coasBitmapCache: true,
		memoMobileDevice: true,
		eceBitmapGate: true,
		fastSpriteUpdate: true,
		hotbarRedrawGate: true,
		dotMoveCacheGate: true,
		efieBitmapGate: true,
		dpZoomGate: true,
		seCache: true,
		anyEventStartingFast: true
	};

	//-----------------------------------------------------------------------
	// 1) Utils.isMobileDevice memoization.
	// The core implementation runs a userAgent regex on every call; QJ bullet
	// timelines (ex_playerMeleeAttackTrigger etc.) call it per bullet per
	// frame. The result cannot change at runtime.
	//-----------------------------------------------------------------------
	(function(){
		var _Utils_isMobileDevice = Utils.isMobileDevice;
		var memo = Utils.isMobileDevice();
		Utils.isMobileDevice = function(){
			if( HUB.memoMobileDevice ){ return memo; }
			return _Utils_isMobileDevice.apply(this, arguments);
		};
	})();

	//-----------------------------------------------------------------------
	// 2) QJ_VirtualButton: canvas offset cache + refreshDivAttribute gate.
	// canvasToPageXVB/YVB read canvas.offsetLeft/offsetTop per button per
	// frame; each read forces synchronous layout because the button divs were
	// just written. The offsets only change on resize/orientation/canvas
	// updates, so cache them and invalidate on those events.
	// refreshDivAttribute is additionally short-circuited when every input
	// (position, scale, opacity, press state, anchors, canvas offsets) equals
	// the previous call for that div - in that case the original would have
	// diffed and written nothing anyway.
	//-----------------------------------------------------------------------
	if( typeof Game_VB_Base !== "undefined" && Graphics.canvasToPageXVB && Graphics.canvasToPageYVB ){

		var vbOff = { dirty: true, left: 0, top: 0 };
		function vbOffsets(){
			if( (vbOff.dirty || !HUB.vbOffsetCache) && Graphics._canvas ){
				vbOff.left = Graphics._canvas.offsetLeft;
				vbOff.top = Graphics._canvas.offsetTop;
				vbOff.dirty = false;
			}
			return vbOff;
		}

		var _Graphics_updateCanvas = Graphics._updateCanvas;
		Graphics._updateCanvas = function(){
			_Graphics_updateCanvas.apply(this, arguments);
			vbOff.dirty = true;
		};
		window.addEventListener("resize", function(){ vbOff.dirty = true; });
		window.addEventListener("orientationchange", function(){ vbOff.dirty = true; });

		// Same math as QJ_VirtualButton originals, offsets read from cache.
		Graphics.canvasToPageXVB = function(x, posAuto){
			if( this._canvas ){
				var left = vbOffsets().left;
				x = this._realScale * x + left;
				if( posAuto[1] ){ x -= left; }
				if( posAuto[2] ){ x += left; }
				return Math.round(x);
			}
			return 0;
		};
		Graphics.canvasToPageYVB = function(y, posAuto){
			if( this._canvas ){
				var top = vbOffsets().top;
				y = this._realScale * y + top;
				if( posAuto[0] ){ y -= top; }
				if( posAuto[3] ){ y += top; }
				return Math.round(y);
			}
			return 0;
		};

		// Touch-event side of the same family: pageToCanvas/offset also read
		// offsetLeft/offsetTop per call and fire at pointer-event rate while
		// dragging (measured 26ms/s during combat). Same cache, same math.
		Graphics.pageToCanvasXVB = function(x, posAuto){
			if( this._canvas ){
				var left = vbOffsets().left;
				x = this._realScale * x - left;
				if( posAuto[1] ){ x += left; }
				if( posAuto[2] ){ x -= left; }
				return Math.round(x / this._realScale);
			}
			return 0;
		};
		Graphics.pageToCanvasYVB = function(y, posAuto){
			if( this._canvas ){
				var top = vbOffsets().top;
				y = this._realScale * y - top;
				if( posAuto[0] ){ y += top; }
				if( posAuto[3] ){ y -= top; }
				return Math.round(y / this._realScale);
			}
			return 0;
		};
		Graphics.offsetXVB = function(posAuto){
			if( this._canvas ){
				var x = vbOffsets().left;
				return posAuto[1] ? -x : (posAuto[2] ? x : 0);
			}
			return 0;
		};
		Graphics.offsetYVB = function(posAuto){
			if( this._canvas ){
				var y = vbOffsets().top;
				return posAuto[0] ? -y : (posAuto[3] ? y : 0);
			}
			return 0;
		};

		var _VB_refreshDivAttribute = Game_VB_Base.prototype.refreshDivAttribute;
		Game_VB_Base.prototype.refreshDivAttribute = function(div, visible, x, y, o, s, isPressed, extraData){
			if( !HUB.vbRefreshGate ){
				return _VB_refreshDivAttribute.apply(this, arguments);
			}
			var off = vbOffsets();
			var ax = (extraData && extraData.ax) || this._xAnchor;
			var ay = (extraData && extraData.ay) || this._yAnchor;
			var ox = (extraData && extraData.ox) || 0;
			var oy = (extraData && extraData.oy) || 0;
			var k = div._socVBKey;
			if( k && k.visible === visible && k.x === x && k.y === y && k.o === o &&
				k.s === s && k.p === isPressed && k.ax === ax && k.ay === ay &&
				k.ox === ox && k.oy === oy && k.scale === Graphics._realScale &&
				k.offL === off.left && k.offT === off.top &&
				k.w === div.remVBWidth && k.h === div.remVBHeight ){
				return div._socVBRect;
			}
			var rect = _VB_refreshDivAttribute.apply(this, arguments);
			div._socVBKey = {
				visible: visible, x: x, y: y, o: o, s: s, p: isPressed,
				ax: ax, ay: ay, ox: ox, oy: oy, scale: Graphics._realScale,
				offL: off.left, offT: off.top,
				w: div.remVBWidth, h: div.remVBHeight
			};
			div._socVBRect = rect;
			return rect;
		};
	}

	//-----------------------------------------------------------------------
	// 3) Drill_CoreOfActionSequence: decorator parent-bitmap cache.
	// drill_spriteMain_updateParentBitmap called ImageManager.loadBitmap every
	// frame (url string build + encodeURI + cache lookup). The bitmap can only
	// change when path/name/tint/smooth change, so keep the resolved Bitmap on
	// the decorator. setParentBitmap still runs every frame (parents can be
	// added at any time; Sprite's bitmap setter no-ops on identical bitmap).
	// ImageManager.clear() only runs on page unload, so the cached reference
	// cannot go stale within a session.
	//-----------------------------------------------------------------------
	if( typeof Drill_COAS_SpriteDecorator !== "undefined" &&
		Drill_COAS_SpriteDecorator.prototype.drill_spriteMain_updateParentBitmap ){

		var _COAS_updateParentBitmap = Drill_COAS_SpriteDecorator.prototype.drill_spriteMain_updateParentBitmap;
		Drill_COAS_SpriteDecorator.prototype.drill_spriteMain_updateParentBitmap = function(){
			if( !HUB.coasBitmapCache ){
				return _COAS_updateParentBitmap.apply(this, arguments);
			}
			var c = this._drill_controller;
			if( c && c._drill_visible == true ){
				var cache = this._socBitmapCache;
				if( !cache ){
					cache = this._socBitmapCache = { path: null, name: null, tint: null, smooth: null, bitmap: null };
				}
				if( cache.bitmap == null ||
					cache.path !== c._drill_curBitmapPath ||
					cache.name !== c._drill_curBitmapName ||
					cache.tint !== c._drill_curBitmapTint ||
					cache.smooth !== c._drill_curBitmapSmooth ){
					cache.path = c._drill_curBitmapPath;
					cache.name = c._drill_curBitmapName;
					cache.tint = c._drill_curBitmapTint;
					cache.smooth = c._drill_curBitmapSmooth;
					cache.bitmap = ImageManager.loadBitmap( cache.path, cache.name, cache.tint, cache.smooth );
				}
				this.drill_spriteMain_setParentBitmap( cache.bitmap );
			}else{
				this.drill_spriteMain_resetParentBitmap();
			}
		};
	}

	//-----------------------------------------------------------------------
	// 4) Drill_EventContinuedEffect: drill_ECE_updateBitmap gate.
	// Every Game_Character gets a _Drill_ECE object at initialize, so this
	// ran for every character sprite every frame, reading the Sprite#bitmap
	// accessor twice per call. On Android that accessor was observed running
	// deoptimized (~7us per read, 4.9% of a whole trace). Read the backing
	// field directly and only re-measure when: the bitmap object changed, the
	// measurement is still pending (real_width/height == -1, the game side
	// waits for this before starting an effect), or an effect is playing
	// (pattern dimensions can be changed mid-play by other Drill plugins).
	//-----------------------------------------------------------------------
	if( typeof Sprite_Character !== "undefined" &&
		Sprite_Character.prototype.drill_ECE_updateBitmap ){

		var _ECE_updateBitmap = Sprite_Character.prototype.drill_ECE_updateBitmap;
		Sprite_Character.prototype.drill_ECE_updateBitmap = function(){
			if( !HUB.eceBitmapGate ){ return _ECE_updateBitmap.apply(this, arguments); }
			var ef = this._Drill_ECE;
			if( !ef ){ return; }
			var b = this._bitmap;
			if( b !== this._socEceBitmap ){
				this._socEceBitmap = b;
				this._socEceMeasured = false;
			}
			if( !this._socEceMeasured || ef.real_width === -1 || ef.real_height === -1 ||
				this._character.drill_ECE_isPlaying() ){
				if( b && b.isReady() ){
					ef.real_width = this.patternWidth();
					ef.real_height = this.patternHeight();
					this._socEceMeasured = true;
				}
			}
		};
	}

	//-----------------------------------------------------------------------
	// 5) Core Sprite.update: index loop instead of for..of.
	// The core walks children with for..of, allocating an iterator per
	// container per frame (measured 1.6-1.8% self + minor-GC pressure).
	// Safe to replace here: Drill_CoreOfFilter (the only enabled-at-some-point
	// wrapper) is not in plugins.js, and Drill_CoreOfWindowAuxiliary runs in
	// instance-dispatch mode (DRILL_COWA_INSTANCE_DISPATCH=true) and does not
	// wrap Sprite.prototype.update. Re-verify if either of those changes.
	//-----------------------------------------------------------------------
	(function(){
		var _Sprite_update = Sprite.prototype.update;
		Sprite.prototype.update = function(){
			if( !HUB.fastSpriteUpdate ){ return _Sprite_update.apply(this, arguments); }
			var children = this.children;
			for( var i = 0; i < children.length; i++ ){
				var child = children[i];
				if( child && child.update ){ child.update(); }
			}
		};
	})();

	//-----------------------------------------------------------------------
	// 6) Hendrix hotbar: stop per-frame bitmap redraw -> texture re-upload.
	// a) refreshQuantity/refreshManaCost already diff on value change, but
	//    their no-data branch calls bitmap.clear() EVERY frame, which dirties
	//    the bitmap and forces a texSubImage2D upload per slot per frame.
	//    Fix: per-bitmap blank tracking - clear() on an already-blank bitmap
	//    is skipped (instance-level hook, other Bitmap users untouched).
	// b) refreshButtonText rebuilt strings, polled navigator.getGamepads()
	//    and cleared+redrew its bitmap every frame per slot. Its output only
	//    depends on (config.Button, config.Name, gamepad presence), so skip
	//    when that key is unchanged; still re-run once per 60 frames to pick
	//    up exotic changes (gamepad type detection, HendrixGamepad rebinds).
	// Sprite_SkillSlot lives inside the plugin IIFE, so the prototype is
	// captured lazily by scanning the scene graph for an instance.
	//-----------------------------------------------------------------------
	if( typeof Scene_Map !== "undefined" ){

		var hotbarPatched = false;
		var hotbarScanTries = 0;
		var gpFrame = -1, gpPresent = false;

		function socGamepadPresent(){
			var fc = Graphics.frameCount;
			if( fc !== gpFrame ){
				gpFrame = fc;
				gpPresent = !!(navigator.getGamepads && navigator.getGamepads()[0]);
			}
			return gpPresent;
		}

		function socInstrumentBlankSkip(bitmap){
			if( !bitmap || bitmap._socBlankHooked ){ return; }
			bitmap._socBlankHooked = true;
			bitmap._socBlank = false;
			bitmap.clear = function(){
				if( HUB.hotbarRedrawGate && this._socBlank ){ return; }
				this._socBlank = true;
				return Bitmap.prototype.clear.call(this);
			};
			bitmap.drawText = function(){
				this._socBlank = false;
				return Bitmap.prototype.drawText.apply(this, arguments);
			};
		}

		function socPatchHotbarProto(proto){
			if( hotbarPatched ){ return; }
			hotbarPatched = true;

			if( proto.refreshQuantity ){
				var _refreshQuantity = proto.refreshQuantity;
				proto.refreshQuantity = function(){
					if( this._quantitySprite ){ socInstrumentBlankSkip(this._quantitySprite.bitmap); }
					return _refreshQuantity.apply(this, arguments);
				};
			}
			if( proto.refreshManaCost ){
				var _refreshManaCost = proto.refreshManaCost;
				proto.refreshManaCost = function(){
					if( this._manaCostSprite ){ socInstrumentBlankSkip(this._manaCostSprite.bitmap); }
					return _refreshManaCost.apply(this, arguments);
				};
			}
			if( proto.refreshButtonText ){
				var _refreshButtonText = proto.refreshButtonText;
				proto.refreshButtonText = function(){
					if( !HUB.hotbarRedrawGate ){ return _refreshButtonText.apply(this, arguments); }
					var cfg = this._config;
					var key = (cfg ? (cfg.Button || "") + "|" + (cfg.Name || "") : "") +
						"|" + (socGamepadPresent() ? 1 : 0);
					var fc = Graphics.frameCount;
					if( key === this._socBtnKey && this._socBtnFrame !== undefined &&
						fc - this._socBtnFrame < 60 ){
						return;
					}
					this._socBtnKey = key;
					this._socBtnFrame = fc;
					return _refreshButtonText.apply(this, arguments);
				};
			}
		}

		function socFindSkillSlot(node){
			if( !node || !node.children ){ return null; }
			for( var i = 0; i < node.children.length; i++ ){
				var c = node.children[i];
				if( !c ){ continue; }
				if( c.constructor && c.constructor.name === "Sprite_SkillSlot" ){ return c; }
				var r = socFindSkillSlot(c);
				if( r ){ return r; }
			}
			return null;
		}

		var _Scene_Map_update_soc = Scene_Map.prototype.update;
		Scene_Map.prototype.update = function(){
			_Scene_Map_update_soc.apply(this, arguments);
			if( !hotbarPatched && hotbarScanTries < 20 && Graphics.frameCount % 60 === 0 ){
				hotbarScanTries++;
				var slot = socFindSkillSlot(this);
				if( slot ){ socPatchHotbarProto(Object.getPrototypeOf(slot)); }
			}
		};
	}

	//-----------------------------------------------------------------------
	// 7) DotMoveSystem: map-characters-cache scalar pre-check + Game_Event
	//    size/offset getter memoization.
	// a) MapCharacterCacheUpdater.updateMapCharactersCache built a
	//    DotMoveRectangle (allocation + width/height getter chain) every
	//    frame per character just to compare it with _lastRect. collisionRect
	//    depends only on (_realX, _realY, width(), height()), so snapshot
	//    those scalars and skip the whole call while they are unchanged.
	//    Snapshot is stored on the updater instance and only trusted while
	//    _lastRect exists, mirroring the original early-return semantics.
	// b) Game_Event width/height/offsetX/offsetY resolved through
	//    $gameTemp.characterTempData (a Map lookup) on every call, several
	//    times per character per frame. The tempData values are parsed once
	//    from the page-0 annotation and constant for the event's lifetime,
	//    so cache them on the event. Explicit _width/_offsetX overrides are
	//    still checked first, same as the originals.
	//-----------------------------------------------------------------------
	if( typeof DotMoveSystem !== "undefined" && DotMoveSystem.MapCharacterCacheUpdater ){

		var MCU = DotMoveSystem.MapCharacterCacheUpdater;
		var _MCU_update = MCU.prototype.updateMapCharactersCache;
		MCU.prototype.updateMapCharactersCache = function(){
			var c = this._character;
			if( HUB.dotMoveCacheGate && this._lastRect &&
				this._socX === c._realX && this._socY === c._realY &&
				this._socW === c.width() && this._socH === c.height() ){
				return;
			}
			_MCU_update.call(this);
			this._socX = c._realX;
			this._socY = c._realY;
			this._socW = c.width();
			this._socH = c.height();
		};

		if( typeof Game_Event !== "undefined" && Game_Event.prototype.offsetX ){
			var _GE_width = Game_Event.prototype.width;
			Game_Event.prototype.width = function(){
				if( !HUB.dotMoveCacheGate ){ return _GE_width.call(this); }
				if( this._width != null ){ return this._width; }
				var v = this._socDmW;
				return v !== undefined ? v : (this._socDmW = this.dotMoveTempData().width);
			};
			var _GE_height = Game_Event.prototype.height;
			Game_Event.prototype.height = function(){
				if( !HUB.dotMoveCacheGate ){ return _GE_height.call(this); }
				if( this._height != null ){ return this._height; }
				var v = this._socDmH;
				return v !== undefined ? v : (this._socDmH = this.dotMoveTempData().height);
			};
			var _GE_offsetX = Game_Event.prototype.offsetX;
			Game_Event.prototype.offsetX = function(){
				if( !HUB.dotMoveCacheGate ){ return _GE_offsetX.call(this); }
				if( this._offsetX != null ){ return this._offsetX; }
				var v = this._socDmOX;
				return v !== undefined ? v : (this._socDmOX = this.dotMoveTempData().offsetX);
			};
			var _GE_offsetY = Game_Event.prototype.offsetY;
			Game_Event.prototype.offsetY = function(){
				if( !HUB.dotMoveCacheGate ){ return _GE_offsetY.call(this); }
				if( this._offsetY != null ){ return this._offsetY; }
				var v = this._socDmOY;
				return v !== undefined ? v : (this._socDmOY = this.dotMoveTempData().offsetY);
			};
		}
	}

	//-----------------------------------------------------------------------
	// 8) Drill_EventFadeInEffect: same accessor fix as eceBitmapGate.
	// drill_EFIE_updateBitmap read the Sprite#bitmap accessor twice per
	// character sprite per frame. Same measure-on-change gate as ECE; the
	// game side waits on real_width == -1 before starting an effect, so that
	// state always forces a measure.
	//-----------------------------------------------------------------------
	if( typeof Sprite_Character !== "undefined" &&
		Sprite_Character.prototype.drill_EFIE_updateBitmap ){

		var _EFIE_updateBitmap = Sprite_Character.prototype.drill_EFIE_updateBitmap;
		Sprite_Character.prototype.drill_EFIE_updateBitmap = function(){
			if( !HUB.efieBitmapGate ){ return _EFIE_updateBitmap.apply(this, arguments); }
			var ef = this._Drill_EFIE;
			if( !ef ){ return; }
			var b = this._bitmap;
			if( b !== this._socEfieBitmap ){
				this._socEfieBitmap = b;
				this._socEfieMeasured = false;
			}
			if( !this._socEfieMeasured || ef.real_width === -1 || ef.real_height === -1 ||
				this._character.drill_EFIE_isPlaying() ){
				if( b && b.isReady() ){
					ef.real_width = this.patternWidth();
					ef.real_height = this.patternHeight();
					this._socEfieMeasured = true;
				}
			}
		};
	}

	// 9) DP_MapZoom's Game_Event.update wrapper is gated INSIDE
	// DP_MapZoom.js (search "[Shiroin PerfHub B3]") because the original is
	// captured in that plugin's closure and cannot be re-ordered from here.
	// Controlled by HUB.dpZoomGate.

	//-----------------------------------------------------------------------
	// 10) SE decoded-buffer cache.
	// Vanilla AudioManager.playSe creates a new WebAudio (fetch + Vorbis
	// decode) for EVERY play; a 30s combat trace showed Damage5.ogg fetched
	// 19 times. Cache the decoded AudioBuffer per url for audio/se/* and
	// feed later instances synchronously. AudioBuffer is immutable payload -
	// sharing it across source nodes is spec-safe; volume/pitch/pan and
	// overlapping playback stay per-instance.
	// Design notes (hardened rework of Shiroin_SECache.js by the user's
	// friend - core apply/entry approach kept, plumbing simplified):
	//  - no pending/waiter chaining: a cache miss just loads normally, so a
	//    leader destroyed mid-load can never strand later plays silent;
	//    worst case is one duplicate fetch on the first frame.
	//  - capture on _onDecode only when _isLoaded && buffers.length === 1:
	//    a chunk-decoded partial result (streaming path, >200KB + >1s) can
	//    never be cached truncated.
	//  - true LRU (hit refreshes recency), 24MB / 64 entries cap.
	//-----------------------------------------------------------------------
	if( typeof WebAudio !== "undefined" && WebAudio.prototype._onDecode &&
		WebAudio.prototype._realUrl && WebAudio.prototype._shouldUseDecoder ){

		var SE_CACHE_MAX_BYTES = 24 * 1024 * 1024;
		var SE_CACHE_MAX_ENTRIES = 64;
		var seCache = new Map();
		var seCacheBytes = 0;

		function seCacheable(url){
			return typeof url === "string" && url.indexOf("audio/se/") >= 0;
		}

		function seEntryBytes(buffers){
			var total = 0;
			for( var i = 0; i < buffers.length; i++ ){
				total += buffers[i].length * buffers[i].numberOfChannels * 4;
			}
			return total;
		}

		function seRemember(url, audio){
			if( seCache.has(url) ){ return; }
			var buffers = audio._buffers.slice();
			var entry = {
				buffers: buffers,
				totalTime: audio._totalTime,
				sampleRate: audio._sampleRate,
				loopStart: audio._loopStart,
				loopLength: audio._loopLength,
				loopStartTime: audio._loopStartTime,
				loopLengthTime: audio._loopLengthTime,
				bytes: seEntryBytes(buffers)
			};
			seCache.set(url, entry);
			seCacheBytes += entry.bytes;
			while( (seCache.size > SE_CACHE_MAX_ENTRIES || seCacheBytes > SE_CACHE_MAX_BYTES) &&
				seCache.size > 1 ){
				var oldestKey = seCache.keys().next().value;
				seCacheBytes -= seCache.get(oldestKey).bytes;
				seCache.delete(oldestKey);
			}
		}

		var _WA_startLoading = WebAudio.prototype._startLoading;
		WebAudio.prototype._startLoading = function(){
			if( HUB.seCache && WebAudio._context && !this._shouldUseDecoder() ){
				var url = this._realUrl();
				if( seCacheable(url) ){
					var entry = seCache.get(url);
					if( entry ){
						seCache.delete(url);
						seCache.set(url, entry);
						this._lastUpdateTime = WebAudio._currentTime() - 0.5;
						this._isError = false;
						this._destroyDecoder();
						this._buffers = entry.buffers.slice();
						this._totalTime = entry.totalTime;
						this._sampleRate = entry.sampleRate;
						this._loopStart = entry.loopStart;
						this._loopLength = entry.loopLength;
						this._loopStartTime = entry.loopStartTime;
						this._loopLengthTime = entry.loopLengthTime;
						this._isLoaded = true;
						this._onLoad();
						return;
					}
					this._socSeCacheUrl = url;
				}
			}
			_WA_startLoading.call(this);
		};

		var _WA_onDecode = WebAudio.prototype._onDecode;
		WebAudio.prototype._onDecode = function(buffer){
			_WA_onDecode.call(this, buffer);
			if( HUB.seCache && this._socSeCacheUrl && this._isLoaded &&
				!this._shouldUseDecoder() && this._buffers && this._buffers.length === 1 ){
				seRemember(this._socSeCacheUrl, this);
				this._socSeCacheUrl = null;
			}
		};
	}

	//-----------------------------------------------------------------------
	// 11) Game_Map.isAnyEventStarting without the per-call array allocation.
	// isEventRunning calls it several times per frame (scene update, player
	// move gating, counter checks, DotMoveSystem), and the vanilla body goes
	// through this.events(), which Drill_CoreOfEventManager overrides to
	// build a fresh copy of its valid-event tank on every call (~26.6ms +
	// one garbage array per 200k calls). Iterating this._events directly and
	// skipping empty slots and _erased events reproduces exactly what that
	// copy contains, with zero allocation (same pattern as isLockingCEQJ in
	// Shiroin_CEQJLockFlow). Plain overwrite is safe: the only plugin that
	// wrapped this function, Drill_LayerCommandThread, is retired and its
	// replacement Shiroin_LCTShim does not wrap it.
	//-----------------------------------------------------------------------
	(function(){
		var _GM_isAnyEventStarting = Game_Map.prototype.isAnyEventStarting;
		Game_Map.prototype.isAnyEventStarting = function(){
			if( !HUB.anyEventStartingFast ){
				return _GM_isAnyEventStarting.call(this);
			}
			var events = this._events;
			if( events ){
				for( var i = 0; i < events.length; i++ ){
					var ev = events[i];
					if( ev && !ev._erased && ev.isStarting() ){ return true; }
				}
			}
			return false;
		};
	})();

})();
