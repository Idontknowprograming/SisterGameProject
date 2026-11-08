//=============================================================================
// MZ_CompatPatch.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0] MZ兼容补丁 - MV→MZ 缺失引擎函数的集中 polyfill
 * @author shiroin (迁移辅助)
 *
 * @help MZ_CompatPatch.js
 * =============================================================================
 * 集中存放 “MV 引擎有、MZ 引擎移除” 的函数的等价实现，
 * 供从 MV 迁移过来的老插件（Drill 系列、QJ 系列等）调用。
 *
 * ----使用说明
 * 1. 本插件必须放在插件列表的【最前面】（其它插件之前）加载。
 * 2. 所有 polyfill 都使用 if(undefined) 守卫，
 *    不会覆盖 RPG Maker MZ 引擎 或 FOSSIL 已经提供的实现，
 *    因此无论 FOSSIL 开或关都安全。
 * 3. 以后再遇到 “xxx is not a function” 类的 MV→MZ 缺失函数，
 *    优先往这个文件里补，集中管理。
 *
 * ----已包含的 polyfill
 *   Utils.generateRuntimeId            （MV 的运行时自增id）
 *   ImageManager.reserveBitmap         （MV 位图预约系统 → 映射到 MZ 的 loadBitmap）
 *   ImageManager.reserveXxx 系列        （reserveCharacter/Face/System/Picture/...）
 *   ImageManager.requestXxx 系列        （MV 异步请求 → 映射到 MZ 的同步 loadXxx）
 *   ImageManager.releaseReservation     （MZ 无预约系统 → 安全空操作）
 * =============================================================================
 */

(function(){
"use strict";

console.log("[MZ_CompatPatch] MV→MZ 兼容补丁加载中...");

//=============================================================================
// ** Utils
//=============================================================================
if( typeof Utils !== "undefined" ){
	// MV: Utils.generateRuntimeId —— 返回自增整数（资源缓存id等用途）
	if( Utils.generateRuntimeId == undefined ){
		Utils._compat_runtimeId = Utils._compat_runtimeId || 1;
		Utils.generateRuntimeId = function(){
			return Utils._compat_runtimeId++;
		};
	}
}

//=============================================================================
// ** TouchInput._events —— MV 输入事件对象兼容
//			MZ 改为 _newState/_currentState，移除了 MV 插件常用的 _events。
//			PictureCallCommon / QJ_VirtualButton 等插件会直接读写 this._events.xxx。
//=============================================================================
if( typeof TouchInput !== "undefined" ){
	TouchInput._compatEnsureEvents = function(){
		if( !this._events ){
			this._events = {
				triggered: false,
				cancelled: false,
				moved: false,
				released: false,
				wheelX: 0,
				wheelY: 0,
				wheelTriggered: false,
				doubleTriggered: false
			};
		}
		return this._events;
	};

	if( !TouchInput._drill_compat_eventsPatched ){
		TouchInput._drill_compat_eventsPatched = true;
		var _compat_TouchInput_clear = TouchInput.clear;
		TouchInput.clear = function(){
			_compat_TouchInput_clear.apply( this, arguments );
			this._events = {
				triggered: false,
				cancelled: false,
				moved: false,
				released: false,
				wheelX: 0,
				wheelY: 0,
				wheelTriggered: false,
				doubleTriggered: false
			};
		};

		var _compat_TouchInput_update = TouchInput.update;
		TouchInput.update = function(){
			_compat_TouchInput_update.apply( this, arguments );
			var events = this._compatEnsureEvents();
			var state = this._currentState || {};
			events.triggered = !!state.triggered;
			events.cancelled = !!state.cancelled;
			events.moved = !!state.moved;
			events.released = !!state.released;
			events.wheelX = state.wheelX || 0;
			events.wheelY = state.wheelY || 0;
			// wheelTriggered / doubleTriggered 由扩展插件自己置位和清理，这里不覆盖。
		};
	}
}

//=============================================================================
// ** ImageManager —— MV 的 预约(reserve)/请求(request)/释放(release) 系统
//			说明：MZ 移除了整套预约缓存机制，统一改用 loadXxx。
//			这里把 reserveXxx / requestXxx 映射到对应的 loadXxx（同样会进缓存）。
//=============================================================================
if( typeof ImageManager !== "undefined" ){

	// > reserveBitmap(folder, filename, hue, smooth, reservationId)
	if( ImageManager.reserveBitmap == undefined && typeof ImageManager.loadBitmap === "function" ){
		ImageManager.reserveBitmap = function( folder, filename, hue, smooth, reservationId ){
			var bitmap = this.loadBitmap( folder, filename );
			if( bitmap && smooth !== undefined && smooth !== null ){ bitmap.smooth = smooth; }
			return bitmap;
		};
	}

	// > requestBitmap(folder, filename, ...) —— MV 异步请求，这里同步 load
	if( ImageManager.requestBitmap == undefined && typeof ImageManager.loadBitmap === "function" ){
		ImageManager.requestBitmap = function( folder, filename, hue, smooth, reservationId ){
			var bitmap = this.loadBitmap( folder, filename );
			if( bitmap && smooth !== undefined && smooth !== null ){ bitmap.smooth = smooth; }
			return bitmap;
		};
	}

	// > reserveXxx / requestXxx(filename, hue, reservationId) -> loadXxx(filename)
	var _compat_singleArgMap = {
		"Character":   "loadCharacter",
		"Face":        "loadFace",
		"System":      "loadSystem",
		"Picture":     "loadPicture",
		"Tileset":     "loadTileset",
		"Parallax":    "loadParallax",
		"Animation":   "loadAnimation",
		"Battleback1": "loadBattleback1",
		"Battleback2": "loadBattleback2",
		"Enemy":       "loadEnemy",
		"SvActor":     "loadSvActor",
		"SvEnemy":     "loadSvEnemy",
		"Title1":      "loadTitle1",
		"Title2":      "loadTitle2"
	};
	Object.keys( _compat_singleArgMap ).forEach(function( suffix ){
		var loadName = _compat_singleArgMap[ suffix ];
		if( typeof ImageManager[ loadName ] !== "function" ){ return; }	//（MZ 没有对应 load 就不补）

		var reserveName = "reserve" + suffix;
		var requestName = "request" + suffix;
		if( ImageManager[ reserveName ] == undefined ){
			ImageManager[ reserveName ] = function( filename /*, hue, reservationId*/ ){
				return this[ loadName ]( filename );
			};
		}
		if( ImageManager[ requestName ] == undefined ){
			ImageManager[ requestName ] = function( filename /*, hue, reservationId*/ ){
				return this[ loadName ]( filename );
			};
		}
	});

	// > reserveNormalBitmap / loadNormalBitmap(path, hue) -> loadBitmapFromUrl(path)
	if( typeof ImageManager.loadBitmapFromUrl === "function" ){
		if( ImageManager.reserveNormalBitmap == undefined ){
			ImageManager.reserveNormalBitmap = function( path, hue, reservationId ){
				return this.loadBitmapFromUrl( path );
			};
		}
		if( ImageManager.loadNormalBitmap == undefined ){
			ImageManager.loadNormalBitmap = function( path, hue ){
				return this.loadBitmapFromUrl( path );
			};
		}
	}

	// > loadEmptyBitmap() —— MV/部分兼容层提供的空白位图。
	//   Drill_DialogSkin / Drill_CoreOfGaugeNumber 等插件会用它占位。
	if( ImageManager.loadEmptyBitmap == undefined && typeof Bitmap !== "undefined" ){
		ImageManager.loadEmptyBitmap = function(){
			this._drill_compat_emptyBitmap = this._drill_compat_emptyBitmap || new Bitmap( 1, 1 );
			return this._drill_compat_emptyBitmap;
		};
	}

	// > releaseReservation(reservationId) —— MZ 无预约系统，安全空操作
	if( ImageManager.releaseReservation == undefined ){
		ImageManager.releaseReservation = function(){ /* no-op */ };
	}
	if( ImageManager.releaseAllReservations == undefined ){
		ImageManager.releaseAllReservations = function(){ /* no-op */ };
	}

	// > MV 图片缓存内部：_generateCacheKey + _imageCache
	//   MZ 改用了 _cache（按 url 直接索引），这里复刻 MV 的 ImageCache 接口供老插件使用。
	if( ImageManager._generateCacheKey == undefined ){
		ImageManager._generateCacheKey = function( path, hue ){
			return path + ":" + hue;
		};
	}
	if( ImageManager._imageCache == undefined ){
		ImageManager._imageCache = (function(){
			var items = {};
			return {
				add: function( key, bitmap ){
					items[key] = { bitmap: bitmap, touch: Date.now(), reservationId: 0 };
					return bitmap;
				},
				get: function( key ){
					if( items[key] ){ items[key].touch = Date.now(); return items[key].bitmap; }
					return null;
				},
				reserve: function( key, bitmap, reservationId ){
					if( !items[key] ){ items[key] = { bitmap: bitmap, touch: Date.now() }; }
					items[key].reservationId = reservationId;
					return items[key].bitmap;
				},
				releaseReservation: function( reservationId ){ /* 简化：不主动清理 */ },
				isReady: function(){
					for( var k in items ){
						var b = items[k].bitmap;
						if( b && b.isError && b.isError() ){ continue; }
						if( b && b.isReady && !b.isReady() ){ return false; }
					}
					return true;
				},
				getErrorBitmap: function(){
					for( var k in items ){
						var b = items[k].bitmap;
						if( b && b.isError && b.isError() ){ return b; }
					}
					return null;
				}
			};
		})();
	}
}

//=============================================================================
// ** Window 各类 —— initialize 签名兼容
//			MV：xxx.prototype.initialize(x, y, width, height)
//			MZ：xxx.prototype.initialize(rect:Rectangle)
//			关键：MZ 的 Window_ItemList/Selectable 等中间类只取第 1 个参数当 rect，
//			      会在到达 Window_Base 之前就把 y/w/h 丢掉。所以必须在 MV 插件
//			      实际调用的"那个类"入口处就把 4 个数字转成 Rectangle。
//			（否则窗口 contents 会按 0 尺寸创建 → 画进去的东西全看不见）
//=============================================================================
if( typeof Rectangle !== "undefined" && typeof window !== "undefined" ){
	var _compat_winInitClasses = [
		"Window_Base", "Window_Scrollable", "Window_Selectable",
		"Window_ItemList", "Window_Command", "Window_HorzCommand",
		"Window_Help", "Window_Gold", "Window_SkillList",
		"Window_EquipSlot", "Window_EquipItem", "Window_Status",
		"Window_Message"
	];
	_compat_winInitClasses.forEach(function( clsName ){
		var C = window[ clsName ];
		if( !C || !C.prototype || typeof C.prototype.initialize !== "function" ){ return; }
		if( Object.prototype.hasOwnProperty.call( C.prototype, "_drill_compat_initPatched" ) ){ return; }
		C.prototype._drill_compat_initPatched = true;
			var _orig = C.prototype.initialize;
			C.prototype.initialize = function( x, y, width, height ){
				if( typeof x === "number" ){
					// MV 风格 (x, y, width, height) → 在入口处就转成 Rectangle
					_orig.call( this, new Rectangle( x, y, width, height ) );
				}else if( x == null ){
					if( clsName === "Window_Message" ){
						var ww = Graphics.boxWidth;
						var wh = (this.fittingHeight ? this.fittingHeight(4) : 144) + 8;
						_orig.call( this, new Rectangle( 0, 0, ww, wh ) );
						return;
					}
					// MV 插件中常见的 Window_Base.prototype.initialize.call(this)
					// MZ 原生必须接收 Rectangle，这里给一个空矩形占位。
					_orig.call( this, new Rectangle( 0, 0, 0, 0 ) );
				}else if( !( x instanceof Rectangle ) &&
					typeof x === "object" &&
					typeof x.x === "number" &&
					typeof x.y === "number" &&
					typeof x.width === "number" &&
					typeof x.height === "number" ){
					_orig.call( this, new Rectangle( x.x, x.y, x.width, x.height ) );
				}else{
					// MZ 风格 (rect) 或无参，原样传递
					_orig.call( this, x );
				}
		};
	});
}

//=============================================================================
// ** Window_Base —— MV 专属方法兼容（MZ 已移除或迁移到别处）
//			内边距/字体：MV 在 Window_Base 上，MZ 改为 $gameSystem.xxx / 实例属性
//			颜色：MV 在 Window_Base 上，MZ 迁到 ColorManager
//=============================================================================
if( typeof Window_Base !== "undefined" ){
	var WBp = Window_Base.prototype;

	if( WBp.standardPadding == undefined ){
		WBp.standardPadding = function(){
			return (typeof $gameSystem !== "undefined" && $gameSystem) ? $gameSystem.windowPadding() : 12;
		};
	}
	if( WBp.textPadding == undefined ){
		WBp.textPadding = function(){ return this.itemPadding ? this.itemPadding() : 6; };
	}
	if( WBp.standardFontSize == undefined ){
		WBp.standardFontSize = function(){
			return (typeof $gameSystem !== "undefined" && $gameSystem) ? $gameSystem.mainFontSize() : 26;
		};
	}
	if( WBp.standardFontFace == undefined ){
		WBp.standardFontFace = function(){
			return (typeof $gameSystem !== "undefined" && $gameSystem) ? $gameSystem.mainFontFace() : "sans-serif";
		};
	}
	if( WBp.standardBackOpacity == undefined ){
		WBp.standardBackOpacity = function(){ return 192; };
	}

	// MV→MZ：resetFontSettings 字号/字体桥接
	//   MV 的 resetFontSettings 用 this.standardFontFace()/standardFontSize()，各窗口靠覆写这两个
	//   方法定制字体；MZ 改为硬取 $gameSystem.mainFontFace/Size()，导致所有 standardFontSize 覆写
	//   （对话框/姓名框/COSB按钮/各类Drill窗口）全部失效，字号回落到默认 26、"小了一大圈"。
	//   这里恢复 MV 语义：改回走 standardFontFace()/standardFontSize()。
	//   （无覆写的窗口，其 standardFontSize 已由上面兜底为 mainFontSize，与 MZ 默认一致。）
	WBp.resetFontSettings = function(){
		// 防御：个别窗口的 standardFontSize 读实例数据（如 this._drill_data[...]），
		//   初始化早期可能尚未赋值而抛错；try/catch 后回落到 mainFontFace/Size，杜绝崩溃。
		var ff, fs;
		try{ ff = this.standardFontFace(); }catch( e ){}
		try{ fs = this.standardFontSize(); }catch( e ){}
		if( typeof ff !== "string" || !ff ){
			ff = ( typeof $gameSystem !== "undefined" && $gameSystem ) ? $gameSystem.mainFontFace() : "sans-serif";
		}
		if( typeof fs !== "number" || !( fs > 0 ) ){
			fs = ( typeof $gameSystem !== "undefined" && $gameSystem ) ? $gameSystem.mainFontSize() : 26;
		}
		this.contents.fontFace = ff;
		this.contents.fontSize = fs;
		this.resetTextColor();
	};

	// MV→MZ：calcTextHeight 行高公式
	//   MV：行高 = maxFontSize + 8（与 mainFontSize 无关）。
	//   MZ 原生：行高 = maxFontSize + (lineHeight - mainFontSize)，当字号 > mainFontSize(26) 时，
	//            行高恒比窗口每行分配的高度(lineHeight)多出 (字号-26)，多行累计导致末行被裁。
	//   Drill 文本系统（COWA/COWC）本就按 MV 的"字号+8"设计（COWA 原有此函数，迁移时被注释掉了）。
	//   这里恢复 MV 公式，使行高只随字号、不随 mainFontSize 漂移。
	WBp.calcTextHeight = function( textState, all ){
		var lastFontSize = this.contents.fontSize;
		var textHeight = 0;
		var lines = textState.text.slice( textState.index ).split( "\n" );
		var maxLines = all ? lines.length : 1;
		for( var i = 0; i < maxLines; i++ ){
			var maxFontSize = this.contents.fontSize;
			// MV→MZ 行高修复：\{ \} 调整字号，但"仅当该字号下存在真实文字时"才计入行高。
			//   这样"只包裹图标的 \{\i[n]\}"不会撑高行高（图标仍按字号放大，绘制路径不受影响），
			//   而 \{大字\} 这类真实文本仍正常撑高。否则带图标的行会明显高于其它行。
			var line = lines[i];
			var self = this;
			var commitIfText = function( seg ){
				// 剔除残留转义码(\c[..] \fs[..] \py[..] \fn[..] \fr 等)后，若仍有可见字符则计入
				var stripped = seg.replace( /\x1b[A-Za-z]*(\[[^\]]*\])?/g, "" );
				if( /\S/.test( stripped ) && self.contents.fontSize > maxFontSize ){
					maxFontSize = self.contents.fontSize;
				}
			};
			var regExp = /\x1b(\{|\}|I\[\d+\])/gi;	//缩放符 \{ \} 与 图标符 \i[n]
			var lastEnd = 0;
			for( ;; ){
				var array = regExp.exec( line );
				if( !array ){ commitIfText( line.slice( lastEnd ) ); break; }
				commitIfText( line.slice( lastEnd, array.index ) );
				lastEnd = regExp.lastIndex;
				var tok = String( array[1] ).toUpperCase();
				if( tok === "{" ){ this.makeFontBigger(); }
				else if( tok === "}" ){ this.makeFontSmaller(); }
				// I[n] 图标：故意不提交字号（图标放大不计入行高）
			}
			// 防御：某些转义符可能把 contents.fontSize 弄成 NaN/非正数，导致 textHeight=NaN →
			//   processNewLine 里 textState.y += NaN → 后续行画到无效坐标"消失"（看起来像只显示前两行）。
			//   这里回退到 mainFontSize，切断 NaN 传播。
			if( !( maxFontSize > 0 ) ){
				maxFontSize = ( typeof $gameSystem !== "undefined" && $gameSystem ) ? $gameSystem.mainFontSize() : 26;
			}
			textHeight += maxFontSize + 8;
		}
		// 兜底：lastFontSize 若也是 NaN，恢复时一并修正，避免污染后续绘制
		this.contents.fontSize = ( lastFontSize > 0 ) ? lastFontSize : ( ( typeof $gameSystem !== "undefined" && $gameSystem ) ? $gameSystem.mainFontSize() : 26 );
		return textHeight;
	};

	// 颜色：委托给 MZ 的 ColorManager（仅补 ColorManager 确实存在的同名方法）
	if( typeof ColorManager !== "undefined" ){
		var _compat_colorMethods = ["normalColor","systemColor","crisisColor","deathColor",
			"gaugeBackColor","hpGaugeColor1","hpGaugeColor2","mpGaugeColor1","mpGaugeColor2",
			"tpGaugeColor1","tpGaugeColor2","ctGaugeColor1","ctGaugeColor2","powerUpColor",
			"powerDownColor","tpCostColor","mpCostColor","pendingColor"];
		_compat_colorMethods.forEach(function( name ){
			if( WBp[name] == undefined && typeof ColorManager[name] === "function" ){
				WBp[name] = function(){ return ColorManager[name](); };
			}
		});
		if( WBp.textColor == undefined && typeof ColorManager.textColor === "function" ){
			WBp.textColor = function( n ){ return ColorManager.textColor( n ); };
		}

		// MV→MZ：恢复 resetTextColor 的窗口动态颜色语义。
		//   MV 插件（如 Drill_CoreOfColor）会覆写 this.normalColor()，以便不同窗口
		//   读取各自的默认颜色。MZ 原生实现却直接调用
		//   ColorManager.normalColor()，会绕过 Window_Message.normalColor()，使
		//   $gameSystem._drill_COC_dialog_fontColorIndex 永远无法生效。
		WBp.resetTextColor = function(){
			var color = ( typeof this.normalColor === "function" )
				? this.normalColor()
				: ColorManager.normalColor();
			this.changeTextColor( color );
			this.changeOutlineColor( ColorManager.outlineColor() );
		};
	}
}

//=============================================================================
// ** Bitmap._setDirty —— MV 位图脏标记兼容
//			MV 插件直接操作 this._context 后会调用 _setDirty() 通知纹理刷新；
//			MZ 移除了该方法，等价操作是更新 _baseTexture。
//=============================================================================
if( typeof Bitmap !== "undefined" && Bitmap.prototype._setDirty == undefined ){
	Bitmap.prototype._setDirty = function(){
		if( this._baseTexture && typeof this._baseTexture.update === "function" ){
			this._baseTexture.update();
		}
	};
}

//=============================================================================
// ** Bitmap.drawText —— 对齐参数兼容
//			MV 插件常省略 align 参数，或把插件参数的数字枚举 0/1/2 直接传进来；
//			MZ/新版 Chrome 要求 textAlign 必须是 left/center/right 等字符串。
//			这里统一规整，消除 CanvasTextAlign 警告并等价 MV 行为。
//=============================================================================
if( typeof Bitmap !== "undefined" && Bitmap.prototype.drawText &&
	!Bitmap.prototype._drill_compat_drawTextPatched ){
	Bitmap.prototype._drill_compat_drawTextPatched = true;
	var _compat_Bitmap_drawText = Bitmap.prototype.drawText;
	Bitmap.prototype.drawText = function( text, x, y, maxWidth, lineHeight, align ){
		// 放在实际绘制入口触发，避免后续插件重写 _makeFontNameText 时切断按需加载。
		if( typeof Graphics !== "undefined" && Graphics._requestRegisteredFonts ){
			Graphics._requestRegisteredFonts( this.fontFace );
		}
		if( align === undefined || align === null || align === "" ){ align = "left"; }
		if( typeof align === "number" ){
			align = ["left", "center", "right"][align] || "left";
		}
		if( align === "左对齐" ){ align = "left"; }
		if( align === "居中" ){ align = "center"; }
		if( align === "右对齐" ){ align = "right"; }
		return _compat_Bitmap_drawText.call( this, text, x, y, maxWidth, lineHeight, align );
	};
}

//=============================================================================
// ** Window_Message 子窗口生命周期 —— MV 对话框插件兼容
//			MV：Window_Message.initialize() 内部会 createSubWindows()，
//			    插件常 alias 该函数处理金钱窗口/姓名框/选择框等。
//			MZ：这些窗口改由 Scene_Message.createAllWindows() 创建，然后
//			    associateWindows() 注入 MessageWindow；createSubWindows() 不再存在。
//			这里补回 MV 钩子，并在 MZ 完成 associateWindows 后主动调用一次，
//			让 Drill_DialogSkin / Drill_DialogNameBox 等 MV 插件能统一接入。
//=============================================================================
if( typeof Window_Message !== "undefined" ){
	var _compat_WindowMessage_linkMvAliases = function( messageWindow ){
		if( !messageWindow ){ return; }
		messageWindow._choiceWindow = messageWindow._choiceListWindow;
		messageWindow._numberWindow = messageWindow._numberInputWindow;
		messageWindow._itemWindow = messageWindow._eventItemWindow;
	};

	if( Window_Message.prototype.createSubWindows === undefined ){
		Window_Message.prototype.createSubWindows = function(){ /* MV hook; windows are associated by Scene_Message in MZ. */ };
	}
	if( Window_Message.prototype.subWindows === undefined ){
		Window_Message.prototype.subWindows = function(){
			var result = [];
			if( this._goldWindow ){ result.push( this._goldWindow ); }
			if( this._nameBoxWindow ){ result.push( this._nameBoxWindow ); }
			if( this._choiceListWindow ){ result.push( this._choiceListWindow ); }
			if( this._numberInputWindow ){ result.push( this._numberInputWindow ); }
			if( this._eventItemWindow ){ result.push( this._eventItemWindow ); }
			return result;
		};
	}
	if( !Window_Message.prototype._drill_compat_messageWindowAliasPatched ){
		Window_Message.prototype._drill_compat_messageWindowAliasPatched = true;
		var _compat_WindowMessage_setChoiceListWindow = Window_Message.prototype.setChoiceListWindow;
		Window_Message.prototype.setChoiceListWindow = function( choiceListWindow ){
			_compat_WindowMessage_setChoiceListWindow.call( this, choiceListWindow );
			this._choiceWindow = this._choiceListWindow;
		};
		var _compat_WindowMessage_setNumberInputWindow = Window_Message.prototype.setNumberInputWindow;
		Window_Message.prototype.setNumberInputWindow = function( numberInputWindow ){
			_compat_WindowMessage_setNumberInputWindow.call( this, numberInputWindow );
			this._numberWindow = this._numberInputWindow;
		};
		var _compat_WindowMessage_setEventItemWindow = Window_Message.prototype.setEventItemWindow;
		Window_Message.prototype.setEventItemWindow = function( eventItemWindow ){
			_compat_WindowMessage_setEventItemWindow.call( this, eventItemWindow );
			this._itemWindow = this._eventItemWindow;
		};
	}
}
if( typeof Scene_Message !== "undefined" &&
	Scene_Message.prototype.associateWindows &&
	!Scene_Message.prototype._drill_compat_messageSubWindowsPatched ){
	Scene_Message.prototype._drill_compat_messageSubWindowsPatched = true;
	var _compat_SceneMessage_associateWindows = Scene_Message.prototype.associateWindows;
	Scene_Message.prototype.associateWindows = function(){
		_compat_SceneMessage_associateWindows.call( this );
		var messageWindow = this._messageWindow;
		if( typeof _compat_WindowMessage_linkMvAliases === "function" ){
			_compat_WindowMessage_linkMvAliases( messageWindow );
		}
		if( messageWindow && !messageWindow._drill_compat_subWindowsCreated ){
			messageWindow._drill_compat_subWindowsCreated = true;
			if( typeof messageWindow.createSubWindows === "function" ){
				messageWindow.createSubWindows();
			}
		}
	};
}

//=============================================================================
// ** Sprite_Base —— MV 精灵基类兼容
//			MZ 删除了 Sprite_Base，部分 MV 插件仍继承或调用它。
//			这里补一个轻量版，普通精灵行为走 Sprite，动画方法转接 MZ 的
//			Sprite_AnimationMV/Sprite_Animation。
//=============================================================================
if( typeof Sprite_Base === "undefined" && typeof Sprite !== "undefined" ){
	window.Sprite_Base = function(){
		this.initialize.apply( this, arguments );
	};
	Sprite_Base.prototype = Object.create( Sprite.prototype );
	Sprite_Base.prototype.constructor = Sprite_Base;

	Sprite_Base.prototype.initialize = function(){
		Sprite.prototype.initialize.call( this );
		this._animationSprites = [];
		this._effectTarget = this;
		this._hiding = false;
	};

	Sprite_Base.prototype.update = function(){
		Sprite.prototype.update.call( this );
		this.updateVisibility();
		this.updateAnimationSprites();
	};

	Sprite_Base.prototype.hide = function(){
		this._hiding = true;
		this.updateVisibility();
	};

	Sprite_Base.prototype.show = function(){
		this._hiding = false;
		this.updateVisibility();
	};

	Sprite_Base.prototype.updateVisibility = function(){
		this.visible = !this._hiding;
	};

	// 防护：MV 动画结束(Sprite_AnimationMV.onEnd)会对目标调用 show()，
	// 若此时该事件已被擦除/销毁，Sprite_Character._character 变为 null，
	// 核心 updateVisibility 读 this._character.isTransparent() 会空指针崩溃。
	// _character 为 null 时只走基类可见性逻辑，跳过角色判定。
	const _Sprite_Character_updateVisibility = Sprite_Character.prototype.updateVisibility;
	Sprite_Character.prototype.updateVisibility = function(){
		if( !this._character ){
			Sprite.prototype.updateVisibility.call( this );
			return;
		}
		_Sprite_Character_updateVisibility.call( this );
	};

	// 防护：动画目标精灵已从显示树移除(parent=null)时，核心 targetSpritePosition 里的
	//   sprite.updateTransform() 会读 parent.transform 崩溃（典型：敌人正播动画攻击玩家时，
	//   玩家用道具传送，目标事件精灵在传送中被销毁，动画却仍在本帧渲染）。
	//   目标脱离显示树时跳过 updateTransform，用其现有 worldTransform 返回安全位置。
	//   本 MZ_CompatPatch 先于 QJ 加载，故 QJ 的 targetSpritePosition 覆写最终会调到此守卫版本。
	const _Sprite_Animation_targetSpritePosition = Sprite_Animation.prototype.targetSpritePosition;
	Sprite_Animation.prototype.targetSpritePosition = function( sprite ){
		if( sprite && !sprite.parent ){
			const point = new Point( 0, -( sprite.height || 0 ) / 2 );
			if( this._animation && this._animation.alignBottom ){ point.y = 0; }
			return sprite.worldTransform.apply( point );
		}
		return _Sprite_Animation_targetSpritePosition.apply( this, arguments );
	};

	// 防护：Utils.extractFileName 对 null/非字符串入参会 .split 崩溃
	//   （典型：逻辑型无贴图的 QJ 子弹 filename=null，经 ImageSmoothSetting 的 loadBitmap 包装
	//     调 isZeroParallax(null) → extractFileName(null) → null.split 崩）。
	//   非字符串时返回空串，让 isZeroParallax 等安全继续（核心 loadBitmap 本就对空名返回空贴图）。
	const _Utils_extractFileName = Utils.extractFileName;
	Utils.extractFileName = function( filename ){
		if( typeof filename !== "string" ){ return ""; }
		return _Utils_extractFileName.call( this, filename );
	};

	Sprite_Base.prototype.updateAnimationSprites = function(){
		if( !this._animationSprites || this._animationSprites.length === 0 ){ return; }
		var sprites = this._animationSprites.slice();
		this._animationSprites.length = 0;
		for( var i = 0; i < sprites.length; i++ ){
			var sprite = sprites[i];
			if( sprite && sprite.isPlaying && sprite.isPlaying() ){
				this._animationSprites.push( sprite );
			}else if( sprite && sprite.parent ){
				sprite.parent.removeChild( sprite );
				if( sprite.destroy ){ sprite.destroy(); }
			}
		}
	};

	Sprite_Base.prototype.startAnimation = function( animation, mirror, delay ){
		if( !animation || !this.parent ){ return; }
		var sprite;
		if( typeof Sprite_AnimationMV !== "undefined" ){
			sprite = new Sprite_AnimationMV();
			sprite.setup( [this._effectTarget], animation, mirror || false, delay || 0 );
		}else if( typeof Sprite_Animation !== "undefined" ){
			sprite = new Sprite_Animation();
			sprite.setup( [this._effectTarget], animation, mirror || false, delay || 0 );
		}else{
			return;
		}
		this.parent.addChild( sprite );
		this._animationSprites.push( sprite );
	};

	Sprite_Base.prototype.isAnimationPlaying = function(){
		return !!this._animationSprites && this._animationSprites.length > 0;
	};
}

//=============================================================================
// ** Game_Picture.erase —— MV 图片对象清理 API 兼容
//			MZ 原生只通过 Game_Screen.erasePicture() 直接移除图片槽位，
//			没有 Game_Picture.prototype.erase。部分 MV 插件会继承该方法，
//			用于在图片被重用/清理时同步清理自己的扩展数据。
//=============================================================================
if( typeof Game_Picture !== "undefined" &&
	Game_Picture.prototype.erase === undefined ){
	Game_Picture.prototype.erase = function(){
		this._name = "";
		this._origin = 0;
		this._x = 0;
		this._y = 0;
		this._scaleX = 100;
		this._scaleY = 100;
		this._opacity = 255;
		this._blendMode = 0;
		if( this.initTarget ){ this.initTarget(); }
		if( this.initTone ){ this.initTone(); }
		if( this.initRotation ){ this.initRotation(); }
	};
}

//=============================================================================
// ** Graphics._createFontLoader —— MV 字体加载 API 兼容
//			MZ 改由 FontManager.load(family, filename) 管理字体。
//			具体字体名与文件名由项目插件写入 Graphics._fontFileMap；
//			本补丁只负责按需加载、任务复用以及提供可等待的 Promise。
//=============================================================================
if( typeof Graphics !== "undefined" &&
	Graphics._createFontLoader === undefined ){
	Graphics._fontLoadTasks = Graphics._fontLoadTasks || {};
	Graphics._fontLoadWarnings = Graphics._fontLoadWarnings || {};
	Graphics._fontRequestCache = Graphics._fontRequestCache || Object.create(null);

	Graphics._createFontLoader = function( family ){
		family = String( family || "" ).trim().replace( /^(["'])(.*)\1$/, "$2" );
		if( !family ){ return Promise.resolve( false ); }
		if( typeof FontManager === "undefined" || !FontManager.load ){
			return Promise.resolve( false );
		}
		if( FontManager._states[family] === "loaded" ){
			return Promise.resolve( true );
		}
		if( this._fontLoadTasks[family] ){
			return this._fontLoadTasks[family];
		}

		var fontMap = this._fontFileMap || {};
		var filename = fontMap[family];
		if( !filename ){
			if( !this._fontLoadWarnings[family] ){
				this._fontLoadWarnings[family] = true;
				console.warn("[FontLoader] 未注册字体：" + family);
			}
			return Promise.resolve( false );
		}

		try{
			FontManager.load( family, filename );
		}catch( error ){
			console.error("[FontLoader] 字体加载启动失败：" + family, error);
			return Promise.resolve( false );
		}

		var tasks = this._fontLoadTasks;
		var task = new Promise(function( resolve ){
			var checkState = function(){
				var state = FontManager._states[family];
				if( state === "loaded" ){
					resolve( true );
					return;
				}
				if( state === "error" ){
					console.error("[FontLoader] 字体加载失败：" + family + " (" + filename + ")");
					resolve( false );
					return;
				}
				setTimeout( checkState, 16 );
			};
			checkState();
		}).then(function( loaded ){
			delete tasks[family];
			return loaded;
		});

		this._fontLoadTasks[family] = task;
		return task;
	};

	Graphics._requestRegisteredFonts = function( fontFace ){
		if( typeof FontManager === "undefined" || !FontManager._states ){ return; }
		var requestKey = String( fontFace || "" ).trim();
		if( !requestKey || this._fontRequestCache[requestKey] ){ return; }

		// 同一条字体链只分析一次。首次请求已经足以启动所有已注册字体的加载；
		// 后续 Bitmap.drawText 即使逐帧执行，也只会命中上面的常量级缓存判断。
		this._fontRequestCache[requestKey] = true;
		var fontMap = this._fontFileMap || {};
		var families = requestKey.split(",");
		for( var i = 0; i < families.length; i++ ){
			var family = families[i].trim().replace( /^(["'])(.*)\1$/, "$2" );
			if( family && fontMap[family] && FontManager._states[family] !== "loaded" ){
				this._createFontLoader( family );
			}
		}
	};
}

//=============================================================================
// ** Utils.encodeURI —— 资源文件名 Unicode 规范化(NFC)
//			macOS 创建的资源文件名通常是 NFC；但部分数据里引用的名字是 NFD
//			(如『が』被存成『か』+『゛』两个码点)。Mac 文件系统 normalization 不敏感、
//			能匹配上，但安卓(APK/ext4)与 Windows(NTFS)是字节精确匹配 → 找不到文件
//			(典型报错 audio/se/...%E3%82%99....ogg)。
//			在编码前统一 NFC，使请求与磁盘上的 NFC 文件名一致。
//			单点覆盖音频/图片/特效/字体/插件等所有走 Utils.encodeURI 的资源路径。
//=============================================================================
if( typeof Utils !== "undefined" && Utils.encodeURI &&
	!Utils._drill_nfcPatched ){
	Utils._drill_nfcPatched = true;
	var _compat_Utils_encodeURI = Utils.encodeURI;
	Utils.encodeURI = function( str ){
		if( str && str.normalize ){ str = str.normalize( "NFC" ); }
		return _compat_Utils_encodeURI.call( this, str );
	};
}

//=============================================================================
// ** Window 内部精灵字段 —— MV 命名兼容
//			MV 的 Window 使用 _windowSpriteContainer/_windowBackSprite 等字段；
//			MZ 改成 _container/_backSprite/_frameSprite/_contentsSprite。
//			Drill 窗口辅助核心会直接访问 MV 字段，这里统一补别名。
//=============================================================================
if( typeof Window !== "undefined" &&
	!Window.prototype._drill_compat_mvWindowSprites ){
	Window.prototype._drill_compat_mvWindowSprites = true;
	var _compat_Window_createAllParts = Window.prototype._createAllParts;
	Window.prototype._createAllParts = function(){
		_compat_Window_createAllParts.call( this );
		this._windowSpriteContainer = this._container;
		this._windowBackSprite = this._backSprite;
		this._windowFrameSprite = this._frameSprite;
		this._windowContentsSprite = this._contentsSprite;
		this._windowCursorSprite = this._cursorSprite;
	};
}

//=============================================================================
// ** Window_Selectable.spacing —— MV 列间距 API 兼容
//			MV：spacing() 默认返回 12。
//			MZ：改为 colSpacing()/rowSpacing()，YEP_MapSelectSkill 等 MV 插件
//			仍会调用 spacing() 计算 itemRect。
//=============================================================================
if( typeof Window_Selectable !== "undefined" &&
	Window_Selectable.prototype.spacing === undefined ){
	Window_Selectable.prototype.spacing = function(){
		if( typeof this.colSpacing === "function" ){
			return this.colSpacing();
		}
		return 12;
	};
}

//=============================================================================
// ** Window_Selectable.itemRectForText —— MV 文本区域 API 兼容
//			MV：itemRectForText(index)
//			MZ：itemRectWithPadding(index)
//			Drill_SceneGalleryA、YEP_ItemCore、TSR_Save 等 MV 插件会直接调用旧名。
//=============================================================================
if( typeof Window_Selectable !== "undefined" &&
	Window_Selectable.prototype.itemRectForText === undefined ){
	Window_Selectable.prototype.itemRectForText = function( index ){
		if( typeof this.itemRectWithPadding === "function" ){
			return this.itemRectWithPadding( index );
		}
		return this.itemRect( index );
	};
}

//=============================================================================
// ** Window_Selectable.numVisibleRows —— MV 可见行数 API 兼容
//			MZ 多数窗口改用 maxPageRows()/maxVisibleItems()，但部分 MV 插件
//			仍调用 numVisibleRows() 计算窗口高度或按钮行数。
//=============================================================================
if( typeof Window_Selectable !== "undefined" &&
	Window_Selectable.prototype.numVisibleRows === undefined ){
	Window_Selectable.prototype.numVisibleRows = function(){
		var height = this.innerHeight;
		if( height == null ){
			var padding = this.padding || 0;
			height = Math.max( 0, ( this.height || 0 ) - padding * 2 );
		}
		var lineHeight = this.lineHeight ? this.lineHeight() : 36;
		return Math.max( 1, Math.floor( height / lineHeight ) );
	};
}
if( typeof Window_Command !== "undefined" ){
	Window_Command.prototype.numVisibleRows = function(){
		return Math.max( 1, this.maxItems ? this.maxItems() : 1 );
	};
}
if( typeof Window_HorzCommand !== "undefined" ){
	Window_HorzCommand.prototype.numVisibleRows = function(){
		return 1;
	};
}

//=============================================================================
// ** Game_CharacterBase —— MV 气泡动画 API 兼容
//			MV：角色自带 requestBalloon(balloonId) / balloonId()
//			MZ：气泡改由 $gameTemp.requestBalloon(target, balloonId) 发起，
//			    角色上不再有 requestBalloon / balloonId。
//			这里在角色上补回 MV 写法，内部转调 MZ 的 $gameTemp.requestBalloon。
//=============================================================================
if( typeof Game_CharacterBase !== "undefined" ){
	if( Game_CharacterBase.prototype.requestBalloon == undefined ){
		Game_CharacterBase.prototype.requestBalloon = function( balloonId ){
			this._balloonId = balloonId;	// 兼容 MV 的 balloonId() 读取
			if( typeof $gameTemp !== "undefined" && $gameTemp && $gameTemp.requestBalloon ){
				$gameTemp.requestBalloon( this, balloonId );
			}
		};
	}
	if( Game_CharacterBase.prototype.balloonId == undefined ){
		Game_CharacterBase.prototype.balloonId = function(){
			return this._balloonId || 0;
		};
	}

	// 动画：MV 角色自带 requestAnimation(id) / animationId()；
	//       MZ 改由 $gameTemp.requestAnimation(targets[], id, mirror) 发起。
	if( Game_CharacterBase.prototype.requestAnimation == undefined ){
		Game_CharacterBase.prototype.requestAnimation = function( animationId, mirror ){
			this._animationId = animationId;	// 兼容 MV 的 animationId() 读取
			if( typeof $gameTemp !== "undefined" && $gameTemp && $gameTemp.requestAnimation ){
				$gameTemp.requestAnimation( [this], animationId, mirror || false );
			}
		};
	}
	if( Game_CharacterBase.prototype.animationId == undefined ){
		Game_CharacterBase.prototype.animationId = function(){
			return this._animationId || 0;
		};
	}
}

//=============================================================================
// ** QJ.collectionCheck —— 项目自定义收集图鉴函数兜底
//			部分物品的 <On Gain Eval> 会直接调用 QJ.collectionCheck。
//			原函数定义在 QJ-MapProjectileMZ.js 靠后位置，一旦插件后半段未跑完
//			或全局 QJ 引用不一致，就会在获得物品时变成 undefined。
//=============================================================================
window.QJ = window.QJ || {};
if( typeof window.QJ.collectionBaseItemId !== "function" ){
	window.QJ.collectionBaseItemId = function( type, itemId ){
		const databaseMap = {
			0: $dataItems,
			1: $dataWeapons,
			2: $dataArmors,
			item: $dataItems,
			weapon: $dataWeapons,
			armor: $dataArmors
		};
		const database = databaseMap[type];
		const item = database && database[itemId];
		return item && item.baseItemId ? item.baseItemId : itemId;
	};
}
// 收集标记统一存入 Game_System；普通道具、武器、护甲分别按基础 ID 登记。
// 不读取旧变量数组，也不在查询时创建记录。
(() => {
	const typeNames = { 0: "item", 1: "weapon", 2: "armor",
		item: "item", weapon: "weapon", armor: "armor" };
	const collectionKey = (type, itemId) => {
		const kind = typeNames[type];
		if( !kind ){ return null; }
		const id = window.QJ.collectionBaseItemId(type, itemId);
		return Number.isInteger(id) && id > 0 ? { kind, id } : null;
	};
	Game_System.prototype.hasCollectedItem = function(type, itemId) {
		const key = collectionKey(type, itemId);
		const records = this._collectedItems;
		return !!(key && records && records[key.kind] && records[key.kind][key.id]);
	};
	// 只读查询；旧存档没有历史时间时返回 null，不在查询或再次获得时补造时间。
	Game_System.prototype.firstCollectedItemTime = function(type, itemId) {
		const key = collectionKey(type, itemId);
		return key && this._collectionFirstAcquired?.[key.kind]?.[key.id] || null;
	};
	// 独立装备也在创建节点调用；不改收集标记，以保留首次获得提示的返回值。
	Game_System.prototype.recordFirstCollectedItemTime = function(type, itemId) {
		const key = collectionKey(type, itemId);
		if( !key || this.firstCollectedItemTime(type, itemId) ||
			this.hasCollectedItem(type, itemId) ||
			(this._independentEquipCollectionCounts?.[key.kind]?.[key.id] || 0) > 0 ){
			return false;
		}
		let gameTime = null;
		try {
			const day = this.day?.(), hour = this.hour?.(), minute = this.minute?.();
			if( [day, hour, minute].every(value => Number.isFinite(value) && value >= 0) ){
				gameTime = { day, hour, minute };
			}
		} catch (_) { /* 时间系统尚未就绪时仍允许正常获得物品。 */ }
		const records = this._collectionFirstAcquired || (this._collectionFirstAcquired = {});
		const byId = records[key.kind] || (records[key.kind] = {});
		byId[key.id] = { gameTime, realTime: { timestampMs: Date.now() } };
		return true;
	};
	// 返回 true 表示本次首次登记；historical 用于旧记录迁移，不记录迁移时刻。
	Game_System.prototype.recordCollectedItem = function(type, itemId, options) {
		const key = collectionKey(type, itemId);
		if( !key ){ return false; }
		const records = this._collectedItems || (this._collectedItems = {});
		const byId = records[key.kind] || (records[key.kind] = {});
		if( byId[key.id] ){ return false; }
		if( !options?.historical ) this.recordFirstCollectedItemTime(type, itemId);
		byId[key.id] = true;
		return true;
	};
})();

if( typeof window.QJ.collectionCheck !== "function" ){
	window.QJ.collectionCheck = function( type, itemId ){
		var typeMap = {
			0: { contextPrefix: "\\ii[" },
			1: { contextPrefix: "\\iw[" },
			2: { contextPrefix: "\\ia[" },
			item: { contextPrefix: "\\ii[" },
			weapon: { contextPrefix: "\\iw[" },
			armor: { contextPrefix: "\\ia[" }
		};
		var typeInfo = typeMap[type];
		if( !typeInfo ){ return; }
		if( typeof $gameSystem === "undefined" || !$gameSystem ){ return; }
		$gameSystem._drill_GFTH_styleId =
			$gameSystem.recordCollectedItem(type, itemId) ? 2 : 3;
		if( typeof $gameTemp !== "undefined" && $gameTemp && $gameTemp.drill_GFTH_pushNewText ){
			$gameTemp.drill_GFTH_pushNewText( typeInfo.contextPrefix + itemId + "]" );
		}
		if( typeof AudioManager !== "undefined" && AudioManager.playSe ){
			AudioManager.playSe({
				name: "キラーン（ひらめき・アイテム発見・獲得）",
				volume: 60,
				pitch: 100,
				pan: 0
			});
		}
	};
}

//=============================================================================
// ** NW.js DevTools API 兼容
//			新 NW.js 的 Window 对象不一定有 isDevToolsOpen()。
//			YEP 的错误显示函数会调用它，缺失时反而产生第二个 TypeError。
//=============================================================================
if( typeof Utils !== "undefined" && Utils.isNwjs && Utils.isNwjs() ){
	try{
		var _compatNwWindow = require("nw.gui").Window.get();
		if( _compatNwWindow && typeof _compatNwWindow.isDevToolsOpen !== "function" ){
			_compatNwWindow.isDevToolsOpen = function(){ return false; };
		}
	}catch( e ){
		// 非 NW.js 或测试环境外无需处理。
	}
}

//=============================================================================
// ** SceneManager.isCurrentSceneStarted —— MV 场景启动状态 API 兼容
//			Drill 菜单系插件会用它延迟创建菜单背景/返回按钮。
//=============================================================================
if( typeof SceneManager !== "undefined" &&
	typeof SceneManager.isCurrentSceneStarted !== "function" ){
	SceneManager.isCurrentSceneStarted = function(){
		var scene = this._scene;
		if( !scene ){ return false; }
		if( typeof scene.isStarted === "function" ){ return scene.isStarted(); }
		return !!scene._started;
	};
}

//=============================================================================
// ** DataManager —— MV 存档判断兼容
//			MV：DataManager.isThisGameFile(savefileId) 判断某存档槽是否属于本游戏。
//			MZ：存档按游戏独立文件夹存放，已移除该方法。
//			MZ 中"槽位存在的存档即本游戏的"，故等价于 savefileExists。
//			（TSR_Save 等存档插件会 alias 原 isThisGameFile，需在其加载前提供）
//=============================================================================
if( typeof DataManager !== "undefined" && DataManager.isThisGameFile == undefined ){
	DataManager.isThisGameFile = function( savefileId ){
		if( typeof this.savefileExists === "function" ){ return this.savefileExists( savefileId ); }
		return !!this.savefileInfo( savefileId );
	};
}

//=============================================================================
// ** 文本转义 \px[n] \py[n] —— 改回"相对偏移"（恢复 MV / 本游戏消息系统语义）
//			MV 核心没有 \px\py，本游戏消息系统按"相对偏移"使用它们（小幅 += 微调行位置）。
//			MZ 核心新增了内置 \PX\PY，但语义是"绝对定位"（textState.x/y = n），
//			会把用 \py[6]/\py[8] 当相对偏移的多行文本各自拉回顶部 → 文字重叠挤压。
//			这里改回相对（+=），让逐行小幅下移恢复正常。
//=============================================================================
if( typeof Window_Base !== "undefined" && !Window_Base.prototype._drill_compat_pxpyPatched ){
	Window_Base.prototype._drill_compat_pxpyPatched = true;
	var _compat_Window_Base_processEscapeCharacter = Window_Base.prototype.processEscapeCharacter;
	// MZ 的 obtainEscapeParam 正则是 /^\[\d+\]/，只认正整数；本游戏 \py[-8] 等带负号。
	//   用 obtainEscapeParam 解析负数会不匹配 → 返回 ""（空串）→ textState.x/y += "" 变成字符串/NaN
	//   → outputHeight 变 NaN、后续行画到无效坐标"消失"，且 [-8] 残留成字面文本。
	//   这里用支持负号的解析器，并正确消费方括号内容。
	var _compat_obtainSignedParam = function( win, textState ){
		var m = /^\[(-?\d+)\]/.exec( textState.text.slice( textState.index ) );
		if( m ){ textState.index += m[0].length; return parseInt( m[1], 10 ); }
		return 0;
	};
	Window_Base.prototype.processEscapeCharacter = function( code, textState ){
		if( code === "PX" ){ textState.x += _compat_obtainSignedParam( this, textState ); return; }
		if( code === "PY" ){ textState.y += _compat_obtainSignedParam( this, textState ); return; }
		_compat_Window_Base_processEscapeCharacter.call( this, code, textState );
	};
}

//=============================================================================
// ** Spriteset_Map.findCharacterSprite —— 按角色对象查找行走图精灵
//			一些MV工程脚本会直接从当前地图spriteset中查找某个事件/玩家的Sprite_Character。
//			MZ默认没有统一暴露 findCharacterSprite，这里补成轻量别名。
//=============================================================================
if( typeof Spriteset_Map !== "undefined" &&
	typeof Spriteset_Map.prototype.findCharacterSprite !== "function" ){
	Spriteset_Map.prototype.findCharacterSprite = function( character ){
		if( !character || !this._characterSprites ){ return null; }
		return this._characterSprites.find(function( sprite ){
			if( !sprite ){ return false; }
			if( typeof sprite.checkCharacter === "function" ){
				return sprite.checkCharacter( character );
			}
			return sprite._character === character;
		}) || null;
	};
}

if( typeof Sprite_Character !== "undefined" &&
	typeof Sprite_Character.prototype.checkCharacter !== "function" ){
	Sprite_Character.prototype.checkCharacter = function( character ){
		return this._character === character;
	};
}

//=============================================================================
// ** Game_Party.refreshMembers —— MV 队伍成员刷新 API 兼容
//			旧插件在动态改状态/装备参数后会调用 $gameParty.refreshMembers()
//			来刷新全队参数缓存。MZ 移除了该方法，但 Game_Actor.refresh() 仍存在。
//=============================================================================
if( typeof Game_Party !== "undefined" &&
	typeof Game_Party.prototype.refreshMembers !== "function" ){
	Game_Party.prototype.refreshMembers = function(){
		var members = this.members ? this.members() : [];
		for( var i = 0; i < members.length; i++ ){
			var actor = members[i];
			if( actor && typeof actor.refresh === "function" ){
				actor.refresh();
			}
		}
	};
}

//=============================================================================
// ** 隐藏 MZ 自带的触摸 UI 按钮（菜单键 / 返回·取消键）
//			MZ 新增了右上角的触摸按钮：地图的菜单键、菜单/战斗里的返回(取消)键。MV 没有这些按钮，
//			本游戏也不需要，这里直接不创建它们。
//			安全性：corescript 中所有 _menuButton/_cancelButton 的引用都带 if 守卫，不创建不会报错。
//			仅隐藏菜单键与取消键；翻页键(pageup/pagedown)不受影响，touchUI 配置项也不改动。
//=============================================================================
if( typeof Scene_Map !== "undefined" ){
	Scene_Map.prototype.createMenuButton = function(){};			// 地图 - 菜单键：不创建
}
if( typeof Scene_MenuBase !== "undefined" ){
	Scene_MenuBase.prototype.needsCancelButton = function(){ return false; };	// 各菜单 - 返回/取消键：不创建
}
if( typeof Scene_Battle !== "undefined" ){
	Scene_Battle.prototype.createCancelButton = function(){};		// 战斗 - 取消键：不创建
}

//=============================================================================
// ** Sprite_Button —— MV「通用可点击精灵」兼容
//			MV 的 Sprite_Button 是通用可点击精灵(任意贴图 + 点击回调)；MZ 改成了专用系统按钮
//			(需 buttonType + ButtonSet 图集，initialize→setupFrames→buttonData；小图还会在 checkBitmap throw)。
//			SMO_Achievements 等 MV 插件把它当通用按钮用、并继承它 → 启动即 "Cannot read properties of
//			undefined (reading 'x')"。这里按 buttonType 分流：
//			  · 未传 buttonType(插件用法) → 还原 MV 通用按钮行为；
//			  · 传了 buttonType(引擎翻页键 pageup/pagedown 等) → 保持 MZ 原行为。
//			并补齐 MZ 已移除/改名、但插件要用的 MV 方法：canvasToLocalX/Y、isActive、isButtonTouched、
//			callClickHandler（引擎不调用这些，补齐无副作用）。
//=============================================================================
if( typeof Sprite_Button !== "undefined" && typeof Sprite_Clickable !== "undefined" ){

	var _SBmv_initialize = Sprite_Button.prototype.initialize;
	Sprite_Button.prototype.initialize = function( buttonType ){
		if( buttonType === undefined || buttonType === null ){
			// —— MV 通用按钮：不走 setupFrames(避免 buttonData 为 undefined 而崩) ——
			Sprite_Clickable.prototype.initialize.call( this );
			this._isMvButton = true;
			this._buttonType = null;
			this._clickHandler = null;
			this._coldFrame = null;
			this._hotFrame = null;
			this._touching = false;
			return;
		}
		_SBmv_initialize.call( this, buttonType );		// MZ 系统按钮
	};

	var _SBmv_update = Sprite_Button.prototype.update;
	Sprite_Button.prototype.update = function(){
		if( this._isMvButton ){
			// 不做 MZ 的 checkBitmap(小图会 throw) 与 updateOpacity(会覆盖插件自管的透明度动画)
			Sprite.prototype.update.call( this );
			this.updateFrame();
			this.processTouch();
			return;
		}
		_SBmv_update.call( this );
	};

	var _SBmv_updateFrame = Sprite_Button.prototype.updateFrame;
	Sprite_Button.prototype.updateFrame = function(){
		if( this._isMvButton ){
			var frame = this._touching ? this._hotFrame : this._coldFrame;
			if( frame ){ this.setFrame( frame.x, frame.y, frame.width, frame.height ); }
			return;
		}
		_SBmv_updateFrame.call( this );
	};

	// processTouch：MV 按钮用 MV 触摸逻辑；系统按钮回落到 Sprite_Clickable 的实现（引擎行为不变）
	Sprite_Button.prototype.processTouch = function(){
		if( this._isMvButton ){
			if( this.isActive() ){
				if( TouchInput.isTriggered() && this.isButtonTouched() ){ this._touching = true; }
				if( this._touching ){
					if( TouchInput.isReleased() || !this.isButtonTouched() ){
						this._touching = false;
						if( TouchInput.isReleased() ){ this.callClickHandler(); }
					}
				}
			}else{
				this._touching = false;
			}
			return;
		}
		Sprite_Clickable.prototype.processTouch.call( this );
	};

	// 以下为 MV 有、MZ 移除/改名的方法，引擎不调用，补齐供插件使用
	Sprite_Button.prototype.isActive = function(){
		var node = this;
		while( node ){ if( node.visible === false ){ return false; } node = node.parent; }
		return true;
	};
	Sprite_Button.prototype.isButtonTouched = function(){
		var x = this.canvasToLocalX( TouchInput.x );
		var y = this.canvasToLocalY( TouchInput.y );
		return x >= 0 && y >= 0 && x < this.width && y < this.height;
	};
	Sprite_Button.prototype.canvasToLocalX = function( x ){
		var node = this;
		while( node ){ x -= node.x; node = node.parent; }
		return x;
	};
	Sprite_Button.prototype.canvasToLocalY = function( y ){
		var node = this;
		while( node ){ y -= node.y; node = node.parent; }
		return y;
	};
	Sprite_Button.prototype.callClickHandler = function(){
		if( this._clickHandler ){ this._clickHandler(); }
	};
}

//=============================================================================
// ** ImageManager 预约/请求 API —— MV 兼容
//			MV 的图片预约缓存系统(reserveXxx / requestXxx / reserveBitmap / reserveNormalBitmap /
//			releaseReservation / setDefaultReservationId)在 MZ 被整套移除；MZ 的 loadXxx 自带缓存。
//			事件指令、旧插件大量用到这些预约/请求方法，这里统一补成"委托给对应 loadXxx"的垫片：
//			  · reserveXxx / requestXxx → loadXxx（加载并缓存，等价于"预约"）
//			  · releaseReservation / setDefaultReservationId → 空操作（MZ 无预约概念）
//			注意：MZ 的 loadXxx 只收 filename、不收 hue（hue 在 MZ 由贴图层应用），多余参数忽略即可；
//			      预约后用 ImageManager.isReady() 判断是否就绪的写法仍有效（loadXxx 进 _cache，isReady 会检查）。
//=============================================================================
if( typeof ImageManager !== "undefined" ){
	var _drill_compat_imgTypes = ["Animation","Battleback1","Battleback2","Enemy","Character",
		"Face","Parallax","Picture","SvActor","SvEnemy","System","Tileset","Title1","Title2"];
	_drill_compat_imgTypes.forEach(function( type ){
		var loadName = "load" + type;
		if( typeof ImageManager[loadName] !== "function" ){ return; }
		if( typeof ImageManager["reserve"+type] !== "function" ){
			ImageManager["reserve"+type] = function( filename ){ return this[loadName]( filename ); };
		}
		if( typeof ImageManager["request"+type] !== "function" ){
			ImageManager["request"+type] = function( filename ){ return this[loadName]( filename ); };
		}
	});

	// 自定义文件夹位图：reserveBitmap/requestBitmap(folder, filename, hue, smooth, reservationId) → loadBitmap(folder, filename)
	if( typeof ImageManager.reserveBitmap !== "function" ){
		ImageManager.reserveBitmap = function( folder, filename ){ return this.loadBitmap( folder, filename ); };
	}
	if( typeof ImageManager.requestBitmap !== "function" ){
		ImageManager.requestBitmap = function( folder, filename ){ return this.loadBitmap( folder, filename ); };
	}
	// 完整路径/URL 位图：MV loadNormalBitmap(path, hue) → MZ loadBitmapFromUrl(url)
	if( typeof ImageManager.loadNormalBitmap !== "function" ){
		ImageManager.loadNormalBitmap = function( path ){ return this.loadBitmapFromUrl( path ); };
	}
	if( typeof ImageManager.reserveNormalBitmap !== "function" ){
		ImageManager.reserveNormalBitmap = function( path ){ return this.loadBitmapFromUrl( path ); };
	}
	if( typeof ImageManager.requestNormalBitmap !== "function" ){
		ImageManager.requestNormalBitmap = function( path ){ return this.loadBitmapFromUrl( path ); };
	}
	// 预约管理方法：MZ 无预约，做成空操作
	if( typeof ImageManager.releaseReservation !== "function" ){
		ImageManager.releaseReservation = function(){};
	}
	if( typeof ImageManager.setDefaultReservationId !== "function" ){
		ImageManager.setDefaultReservationId = function(){};
	}
}

console.log("[MZ_CompatPatch] MV→MZ 兼容补丁加载完成");
})();
