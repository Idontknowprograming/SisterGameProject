//=============================================================================
// Shiroin_GamepadPollGate.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 手柄轮询优化 + 检测到手柄时显示中/英/日警告窗口。
 * @author Shiroin
 *
 * @help
 * 【问题】
 * navigator.getGamepads() 每次调用都重新分配一份手柄状态快照数组，即使一个手柄
 * 都没插也有固定开销。MZ 核心 Input._pollGamepads 每帧调一次，但更要命的是一堆
 * 插件（Drill_CoreOfInput、QJ-MPMZLib-Player/Bow/staff、CTB_TouchInput、
 * Hendrix_Hotbar_Creator 等）每帧各自直接调 navigator.getGamepads()，有的一个
 * 表达式里就调 2~3 次 —— 全部叠加，profile 里 getGamepads 约 0.9%。
 *
 * 【修法 = 两层】
 * (1) 全局包一层 navigator.getGamepads（覆盖所有调用方，含核心与插件）：
 *     · 无手柄：返回一个复用的「全 null」哨兵数组，绝不调原生、零分配，
 *       且兼容 `getGamepads()[0] !== null` 这种常见判定（[0] 仍是 null）。
 *     · 有手柄：每帧只真正取一次快照，同一帧内多次调用共享，避免重复分配。
 * (2) 仍前置 gate 核心 Input._pollGamepads：无手柄时连后续遍历也省。
 *
 * 「是否有手柄」优先靠 window 的 gamepadconnected / gamepaddisconnected 事件维护；
 * 某些 NW.js / 浏览器环境不会可靠触发连接事件，因此无手柄时每 3 秒绕过缓存做一次
 * 原生兜底探测。macOS 的有线 Xbox 手柄还可能完全不出现在 Gamepad API 中；在 NW.js
 * 桌面环境下，本插件会额外使用系统自带的 hidutil，每 3 秒只检查一次是否存在 HID
 * 游戏手柄。这个系统兜底只用于显示警告，不读取按键，也不会把手柄输入传给游戏。
 *
 * 兼容性：不改任何手柄读取逻辑本身，只在「无手柄」最常见情形省事、并去掉同帧重复
 * 分配。放在插件列表任意位置均可（加载时挂一次监听 + 包一次函数）。
 *
 * 【手柄警告窗口】
 * 检测到手柄时，在画面顶部显示不会抢占焦点的警告窗口。窗口只负责提醒玩家，
 * 不会吞掉手柄、键盘或鼠标输入。拔掉最后一个手柄后窗口立即消失，重新接入时
 * 会再次显示。启动游戏前已经连接的手柄也会在首个可显示窗口的场景中触发警告。
 *
 * 文本根据 ConfigManager.language 自动切换：
 *   0 / 12 = 中文（分别使用简体 / 繁体）
 *   1      = 日文
 *   2      = 英文
 *   其他语言统一回退英文。
 */
(function(){
	"use strict";

	// ===== 手柄警告窗：显示设置与中/英/日文本 =====
	var WARNING_DURATION_MS = 12000;
	var WARNING_FADE_IN_MS = 250;
	var WARNING_FADE_OUT_MS = 500;
	var WARNING_WIDTH_RATE = 0.72;
	var WARNING_TOP_RATE = 0.035;
	var WARNING_BODY_FONT_SIZE = 26;
	var WARNING_TITLE_FONT_SIZE = 30;
	var GAMEPAD_PROBE_INTERVAL_MS = 3000;
	var MAC_HIDUTIL_TIMEOUT_MS = 2000;
	var MAC_GAMEPAD_MATCH = "[{\"PrimaryUsagePage\":1,\"PrimaryUsage\":4},{\"PrimaryUsagePage\":1,\"PrimaryUsage\":5}]";

	var WARNING_TEXT = {
		zhCN: {
			title: "检测到游戏手柄",
			body: "本游戏尚未正式适配手柄。连接手柄可能会干扰键盘与鼠标操作，建议断开手柄后继续游戏。"
		},
		zhTW: {
			title: "偵測到遊戲手柄",
			body: "本遊戲尚未正式支援手柄。連接手柄可能會干擾鍵盤與滑鼠操作，建議中斷連接後再繼續遊戲。"
		},
		ja: {
			title: "ゲームパッドを検出しました",
			body: "本作はまだゲームパッドに正式対応していません。接続したままではキーボードやマウスの操作に影響する可能性があるため、接続を解除してからプレイしてください。"
		},
		en: {
			title: "Gamepad detected",
			body: "This game does not officially support gamepads yet. A connected gamepad may interfere with keyboard and mouse controls, so please disconnect it before continuing."
		}
	};

	function warningNow(){
		return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
	}

	function warningLanguage(){
		var language = (typeof ConfigManager !== "undefined") ? Number(ConfigManager.language) : 2;
		if( language === 0 ){ return "zhCN"; }
		if( language === 12 ){ return "zhTW"; }
		if( language === 1 ){ return "ja"; }
		return "en";
	}

	// ===== 共享：已连接手柄数（事件维护，避免每帧主动探测）=====
	var connectedCount = 0;
	var connectedPadIndices = Object.create(null);
	// macOS 系统兜底只维护“是否存在”，不能当作浏览器可读取的 Gamepad。
	var systemGamepadPresent = false;
	try {
		if (navigator.getGamepads) {
			var pads0 = navigator.getGamepads();
			if (pads0) {
				for (var i = 0; i < pads0.length; i++) {
					if (pads0[i] && pads0[i].connected) {
						var initialIndex = String(pads0[i].index != null ? pads0[i].index : i);
						if( !Object.prototype.hasOwnProperty.call(connectedPadIndices, initialIndex) ){
							connectedPadIndices[initialIndex] = true;
							connectedCount++;
						}
					}
				}
			}
		}
	} catch (e) { /* 某些环境 getGamepads 抛错，忽略，按 0 处理 */ }

	// requestVersion 大于 0 代表出现过待显示的连接事件。计时直到场景中的窗口
	// 真正开始更新才启动，避免「手柄在启动前已连接、但启动画面耗尽显示时间」。
	var warningRequestVersion = connectedCount > 0 ? 1 : 0;
	var warningTimingVersion = 0;
	var warningStartedAt = 0;
	var warningEndsAt = 0;
	var warningDetectionPresent = connectedCount > 0;

	function requestGamepadWarning(){
		warningRequestVersion++;
		warningTimingVersion = 0;
		warningStartedAt = 0;
		warningEndsAt = 0;
	}

	function cancelGamepadWarning(){
		warningTimingVersion = warningRequestVersion;
		warningStartedAt = 0;
		warningEndsAt = 0;
	}

	function hasAnyDetectedGamepad(){
		return connectedCount > 0 || systemGamepadPresent;
	}

	function syncWarningDetectionPresence(){
		var present = hasAnyDetectedGamepad();
		if( warningDetectionPresent === present ){ return; }
		warningDetectionPresent = present;
		if( present ){
			requestGamepadWarning();
		} else {
			cancelGamepadWarning();
		}
	}

	function setSystemGamepadPresent(present){
		present = !!present;
		if( systemGamepadPresent === present ){ return; }
		systemGamepadPresent = present;
		syncWarningDetectionPresence();
	}

	function isGamepadWarningActive(now){
		if( warningRequestVersion <= 0 ){ return false; }
		if( warningTimingVersion !== warningRequestVersion ){
			warningTimingVersion = warningRequestVersion;
			warningStartedAt = now;
			warningEndsAt = now + WARNING_DURATION_MS;
		}
		return now < warningEndsAt;
	}

	// 用原生快照校正事件计数。连接事件可能缺失，断开事件也可能缺失，
	// 因此真正取得快照时以快照为准；发现新索引时按一次新连接处理。
	function syncConnectedPads(gamepads){
		var nextIndices = Object.create(null);
		var nextCount = 0;
		if( gamepads ){
			for( var i = 0; i < gamepads.length; i++ ){
				var gamepad = gamepads[i];
				if( !gamepad || !gamepad.connected ){ continue; }
				var index = String(gamepad.index != null ? gamepad.index : i);
				if( Object.prototype.hasOwnProperty.call(nextIndices, index) ){ continue; }
				nextIndices[index] = true;
				nextCount++;
			}
		}

		connectedPadIndices = nextIndices;
		connectedCount = nextCount;
		syncWarningDetectionPresence();
		return connectedCount > 0;
	}

	window.addEventListener("gamepadconnected", function(event){
		var index = event && event.gamepad ? String(event.gamepad.index) : null;
		if( index === null ){
			connectedCount++;
		} else if( !Object.prototype.hasOwnProperty.call(connectedPadIndices, index) ){
			connectedPadIndices[index] = true;
			connectedCount++;
		}
		syncWarningDetectionPresence();
	});
	window.addEventListener("gamepaddisconnected", function(event){
		var index = event && event.gamepad ? String(event.gamepad.index) : null;
		if( index === null ){
			connectedCount = Math.max(0, connectedCount - 1);
		} else if( Object.prototype.hasOwnProperty.call(connectedPadIndices, index) ){
			delete connectedPadIndices[index];
			connectedCount = Math.max(0, connectedCount - 1);
		}
		syncWarningDetectionPresence();
	});

	// ===== (1) 全局 navigator.getGamepads 门控 + 每帧缓存 =====
	if (navigator.getGamepads) {
		var _native = navigator.getGamepads.bind(navigator);   // 此刻仍是原生
		var NO_PAD  = [null, null, null, null];                 // 复用哨兵：兼容 [0]===null 判定
		var frameTag = -1;
		var cached = NO_PAD;

		var wrapped = function(){
			if (connectedCount <= 0) { return NO_PAD; }         // 无手柄：零分配、不调原生
			// 有手柄：同一帧多次调用只真正取一次快照
			var tag = (typeof Graphics !== "undefined" && Graphics.frameCount) || 0;
			if (tag !== frameTag) {
				try {
					cached = _native() || NO_PAD;
					syncConnectedPads(cached);
				} catch (e) {
					cached = NO_PAD;
				}
				frameTag = tag;
			}
			return cached;
		};

		try {
			Object.defineProperty(navigator, "getGamepads", {
				configurable: true, writable: true, value: wrapped
			});
		} catch (e) {
			try { navigator.getGamepads = wrapped; } catch (e2) { /* 覆盖失败则保持原生 */ }
		}

		// 连接事件不可靠时的兜底：仅在当前认为没有手柄时，每 3 秒直接调用一次
		// 被保存下来的原生函数。探测成功后，后续读取仍走上面的逐帧缓存。
		window.setInterval(function(){
			if( connectedCount > 0 ){ return; }
			try {
				var probed = _native() || NO_PAD;
				if( syncConnectedPads(probed) ){
					cached = probed;
					frameTag = (typeof Graphics !== "undefined" && Graphics.frameCount) || 0;
				}
			} catch (e) {
				// 某些环境暂时拒绝访问 Gamepad API，等待下一次 3 秒探测。
			}
		}, GAMEPAD_PROBE_INTERVAL_MS);
	}

	// ===== (2) macOS 系统 HID 兜底 =====
	// Chromium 在部分 macOS + 有线 Xbox 组合下完全不暴露 Gamepad API。
	// hidutil 只返回 Generic Desktop / Joystick(4) 或 Game Pad(5) 设备；
	// 键盘(6)与鼠标(2)不会匹配。结果仅参与警告，不改变 connectedCount。
	(function setupMacSystemGamepadProbe(){
		var execFile = null;
		var probeInFlight = false;
		var disposed = false;

		function hidutilOutputHasGamepad(output){
			var text = String(output || "").replace(/^\uFEFF/, "").trim();
			if( !text ){ return false; }
			var lines = text.split(/\r?\n/);
			var found = false;
			for( var i = 0; i < lines.length; i++ ){
				var record;
				try {
					record = JSON.parse(lines[i]);
				} catch( error ){
					return null;
				}
				if( !record || typeof record !== "object" || Array.isArray(record) ){
					return null;
				}
				if( record.type != null && record.type !== "device" ){ continue; }
				var usagePage = Number(record.PrimaryUsagePage);
				var usage = Number(record.PrimaryUsage);
				if( usagePage === 1 && (usage === 4 || usage === 5) ){
					found = true;
				}
			}
			return found;
		}

		function probeMacSystemGamepads(){
			if( disposed || !execFile || probeInFlight ){ return; }
			// 原生 API 已能读取且系统兜底尚未接管时，无需再启动外部进程。
			if( connectedCount > 0 && !systemGamepadPresent ){ return; }
			probeInFlight = true;
			execFile("/usr/bin/hidutil", ["list", "--ndjson", "--matching", MAC_GAMEPAD_MATCH], {
				encoding: "utf8",
				timeout: MAC_HIDUTIL_TIMEOUT_MS,
				maxBuffer: 65536,
				windowsHide: true
			}, function(error, stdout){
				probeInFlight = false;
				// 暂时执行失败时保留上一次状态，避免错误地闪退警告。
				if( disposed || error ){ return; }
				var result = hidutilOutputHasGamepad(stdout);
				if( result !== null ){ setSystemGamepadPresent(result); }
			});
		}

		try {
			if( typeof process !== "undefined" && process.platform === "darwin" ){
				var nodeRequire = null;
				if( typeof require === "function" ){
					nodeRequire = require;
				} else if( typeof nw !== "undefined" && nw && typeof nw.require === "function" ){
					nodeRequire = nw.require.bind(nw);
				}
				var childProcess = nodeRequire ? nodeRequire("child_process") : null;
				if( childProcess && typeof childProcess.execFile === "function" ){
					execFile = childProcess.execFile;
				}
			}
		} catch( error ){
			execFile = null;
		}

		if( execFile ){
			probeMacSystemGamepads();
			var timerId = window.setInterval(probeMacSystemGamepads, GAMEPAD_PROBE_INTERVAL_MS);
			window.addEventListener("unload", function(){
				disposed = true;
				window.clearInterval(timerId);
			});
		}
	})();

	// ===== (3) 核心 Input._pollGamepads 前置 gate（无手柄连遍历也省）=====
	if (typeof Input !== "undefined" && Input._pollGamepads) {
		var _pollGamepads = Input._pollGamepads;
		Input._pollGamepads = function(){
			if (connectedCount <= 0) { return; }
			_pollGamepads.call(this);
		};
	}

	// ===== (4) 不抢焦点的游戏内手柄警告窗口 =====
	if( typeof Window_Base !== "undefined" && typeof Scene_Base !== "undefined" ){

		function Window_ShiroinGamepadWarning(){
			this.initialize.apply(this, arguments);
		}

		Window_ShiroinGamepadWarning.prototype = Object.create(Window_Base.prototype);
		Window_ShiroinGamepadWarning.prototype.constructor = Window_ShiroinGamepadWarning;

		Window_ShiroinGamepadWarning.prototype.initialize = function(rect){
			Window_Base.prototype.initialize.call(this, rect);
			this.opacity = 0;
			this.contentsOpacity = 0;
			this.visible = false;
			this._warningRequestVersion = 0;
			this._warningLanguage = "";
			this._warningBoxWidth = 0;
			this._warningBoxHeight = 0;
		};

		Window_ShiroinGamepadWarning.prototype.updatePadding = function(){
			this.padding = 18;
		};

		Window_ShiroinGamepadWarning.prototype.update = function(){
			if( warningRequestVersion <= 0 ||
				(warningTimingVersion === warningRequestVersion && warningEndsAt <= 0) ){
				this.visible = false;
				this.contentsOpacity = 0;
				return;
			}

			var now = warningNow();
			if( !isGamepadWarningActive(now) ){
				warningEndsAt = 0;
				this.visible = false;
				this.contentsOpacity = 0;
				return;
			}

			var language = warningLanguage();
			if( this._warningRequestVersion !== warningRequestVersion ||
				this._warningLanguage !== language ||
				this._warningBoxWidth !== Graphics.boxWidth ||
				this._warningBoxHeight !== Graphics.boxHeight ){
				this._warningRequestVersion = warningRequestVersion;
				this._warningLanguage = language;
				this._warningBoxWidth = Graphics.boxWidth;
				this._warningBoxHeight = Graphics.boxHeight;
				this.refreshWarning();
			}

			this.visible = true;
			Window_Base.prototype.update.call(this);

			var fadeIn = (now - warningStartedAt) / WARNING_FADE_IN_MS;
			var fadeOut = (warningEndsAt - now) / WARNING_FADE_OUT_MS;
			var alpha = Math.max(0, Math.min(1, fadeIn, fadeOut));
			this.contentsOpacity = Math.round(255 * alpha);
		};

		Window_ShiroinGamepadWarning.prototype.windowWidth = function(){
			var available = Math.max(240, Graphics.boxWidth - 48);
			var preferred = Math.floor(Graphics.boxWidth * WARNING_WIDTH_RATE);
			return Math.min(available, Math.max(640, preferred));
		};

		Window_ShiroinGamepadWarning.prototype.wrapText = function(text, maxWidth){
			var isEnglish = /^[\x00-\x7F]*$/.test(text);
			var tokens;
			if( isEnglish ){
				var words = text.trim().split(/\s+/);
				tokens = words.map(function(word, index){ return (index > 0 ? " " : "") + word; });
			} else {
				tokens = Array.from(text);
			}

			var lines = [];
			var line = "";
			for( var i = 0; i < tokens.length; i++ ){
				var token = tokens[i];
				var testLine = line + token;
				if( line && this.textWidth(testLine) > maxWidth ){
					lines.push(line.trim());
					line = token.replace(/^\s+/, "");
				} else {
					line = testLine;
				}
			}
			if( line ){ lines.push(line.trim()); }
			return lines.length > 0 ? lines : [""];
		};

		Window_ShiroinGamepadWarning.prototype.refreshWarning = function(){
			var text = WARNING_TEXT[this._warningLanguage] || WARNING_TEXT.en;
			var width = this.windowWidth();
			var innerWidth = Math.max(1, width - this.padding * 2);
			var titleLineHeight = WARNING_TITLE_FONT_SIZE + 12;
			var bodyLineHeight = WARNING_BODY_FONT_SIZE + 10;
			var lineGap = 4;

			this.resetFontSettings();
			this.contents.fontSize = WARNING_BODY_FONT_SIZE;
			var bodyLines = this.wrapText(text.body, innerWidth - 24);
			var innerHeight = 12 + titleLineHeight + lineGap + bodyLines.length * bodyLineHeight + 12;
			var height = innerHeight + this.padding * 2;
			var x = Math.floor((Graphics.boxWidth - width) / 2);
			var y = Math.max(20, Math.floor(Graphics.boxHeight * WARNING_TOP_RATE));

			this.move(x, y, width, height);
			this.createContents();
			this.opacity = 0;

			var cw = this.contents.width;
			var ch = this.contents.height;
			this.contents.gradientFillRect(0, 0, cw, ch,
				"rgba(10, 16, 26, 0.96)", "rgba(34, 39, 52, 0.96)");
			this.contents.fillRect(0, 0, cw, 3, "rgba(255, 190, 72, 1)");
			this.contents.fillRect(0, ch - 3, cw, 3, "rgba(255, 190, 72, 1)");

			var drawY = 10;
			this.contents.fontBold = true;
			this.contents.fontSize = WARNING_TITLE_FONT_SIZE;
			this.changeTextColor(ColorManager.crisisColor());
			this.drawText(text.title, 12, drawY, cw - 24, titleLineHeight, "center");

			drawY += titleLineHeight + lineGap;
			this.contents.fontBold = false;
			this.contents.fontSize = WARNING_BODY_FONT_SIZE;
			this.resetTextColor();
			for( var i = 0; i < bodyLines.length; i++ ){
				this.drawText(bodyLines[i], 12, drawY, cw - 24, bodyLineHeight, "center");
				drawY += bodyLineHeight;
			}
		};

		var _ShiroinGamepadPollGate_createWindowLayer = Scene_Base.prototype.createWindowLayer;
		Scene_Base.prototype.createWindowLayer = function(){
			_ShiroinGamepadPollGate_createWindowLayer.call(this);
			var rect = new Rectangle(0, 0, 1, 1);
			this._shiroinGamepadWarningWindow = new Window_ShiroinGamepadWarning(rect);
			this.addChild(this._shiroinGamepadWarningWindow);
		};
	}

})();
