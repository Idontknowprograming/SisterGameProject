//=============================================================================
// Shiroin_SaveUI_MZ.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v0.1] 自定义存读档界面 (MZ重写，替代 TSR_Save 的 UI；跑在 MZ 原生异步存档后端)
 * @author shiroin
 *
 * @param slotsPerPage
 * @text 每页槽位数
 * @type number
 * @min 1
 * @default 2
 *
 * @param varHour
 * @text 时-变量号
 * @type variable
 * @default 61
 *
 * @param varMin
 * @text 分-变量号
 * @type variable
 * @default 62
 *
 * @param varDay
 * @text 天数-变量号
 * @type variable
 * @default 66
 *
 * @param ---自动存档---
 * @text ===== 自动存档 =====
 * @default
 *
 * @param autosaveText
 * @parent ---自动存档---
 * @text 提示文本
 * @desc 存档成功时显示的文本。结尾含 "..." 则启用点点点动画(并截掉 ...)。
 * @default Auto save...
 *
 * @param autosaveShow
 * @parent ---自动存档---
 * @text 显示提示窗
 * @type boolean
 * @default true
 *
 * @param autosaveLocked
 * @parent ---自动存档---
 * @text 锁定到专属槽
 * @desc true=自动存档总是写入下面的"自动存档槽位"；false=写入最近访问的存档槽。
 * @type boolean
 * @default true
 *
 * @param autosaveSlot
 * @parent ---自动存档---
 * @text 自动存档槽位
 * @desc 锁定时自动存档写入的槽号。MZ 内置的自动存档专属槽为 0(不出现在普通存档列表)。
 * @type number
 * @min 0
 * @default 0
 *
 * @param autosaveX
 * @parent ---自动存档---
 * @text 窗口X
 * @default 20
 *
 * @param autosaveY
 * @parent ---自动存档---
 * @text 窗口Y
 * @default 120
 *
 * @param autosaveWidth
 * @parent ---自动存档---
 * @text 窗口宽
 * @default 200
 *
 * @param autosaveFontSize
 * @parent ---自动存档---
 * @text 字号
 * @default 28
 *
 * @param autosaveColor1
 * @parent ---自动存档---
 * @text 背景渐变色1
 * @desc "r, g, b, a" 形式；默认全透明(只显示文字)。
 * @default 0, 0, 0, 0
 *
 * @param autosaveColor2
 * @parent ---自动存档---
 * @text 背景渐变色2
 * @desc "r, g, b, a" 形式；默认全透明(只显示文字)。
 * @default 0, 0, 0, 0
 *
 * @help Shiroin_SaveUI_MZ.js
 * =============================================================================
 * 复刻 MV TSR_Save 的存读档 UI（仅 UI 层；存档引擎用 MZ 原生异步后端）：
 *   - 每页 2 个大卡片槽位（竖排），上下翻页（▲▼ / 鼠标滚轮，MZ 自带）
 *   - 每槽位：战斗背景图 + 序号 + ⏰时间/📅天数/💰金币 + 角色称号 + 选中发光
 *
 * 数据在存档时（makeSavefileInfo）写入 savefileInfo，列表同步读取，绕开
 * MV "渲染时同步加载完整存档" 的异步不兼容问题。
 * 启动时自动检查当前槽位，为只有 .rmmzsave 本体的存档补建 global 索引。
 * 仅补缺项，不覆盖已有摘要或存档本体；运行中复制文件后需重启游戏。
 *
 * 背景图/返回按钮由 Drill_MenuBackground / Drill_MenuBackButton 提供，本插件不处理。
 * =============================================================================
 */

(() => {
"use strict";

const PARAMS = PluginManager.parameters("Shiroin_SaveUI_MZ");
const SLOTS_PER_PAGE = Number(PARAMS.slotsPerPage || 2);
const V_HOUR = Number(PARAMS.varHour || 61);
const V_MIN  = Number(PARAMS.varMin  || 62);
const V_DAY  = Number(PARAMS.varDay  || 66);

// ★治疗次数标记（迁移自 TSR_Save 的 drawLeftDecorIcons）★
//   读取独立变量 [HEAL_MAP, HEAL_EVENT, HEAL_KEY]（Iavra Self Variables），存档时写入 info，
//   列表里在每个卡片左侧竖排绘制 HEAL_ICON，数量=治疗次数(0~HEAL_MARK_MAX)。
//   位置相对卡片左上角(cx,cy)，按你的卡片版式调下面三个像素值即可。
const HEAL_ICON        = "save_mark";   // img/system/save_mark.png
const HEAL_MAP         = 1;             // 独立变量 mapId
const HEAL_EVENT       = 2;             // 独立变量 eventId
const HEAL_KEY         = "healing";     // 独立变量 key → [1,2,'healing']
const HEAL_MARK_MAX    = 7;             // 最多绘制几枚
const HEAL_MARK_X      = 30;            // 第一枚相对卡片左上角的 X
const HEAL_MARK_TOP_Y  = 105;            // 第一枚的起始 Y
const HEAL_MARK_STEP_Y = 44;            // 每枚之间的垂直间距

//=============================================================================
// ** 数据捕获 —— 存档时把自定义字段写入 savefileInfo
//=============================================================================
const _DataManager_makeSavefileInfo = DataManager.makeSavefileInfo;
DataManager.makeSavefileInfo = function() {
	const info = _DataManager_makeSavefileInfo.call(this);
	//info.svuiBack1 = ($gameMap.battleback1Name && $gameMap.battleback1Name()) || $gameMap._battleback1Name || "";
	let battleback1 = $gameMap._battleback1Name || "";
	if ($gameMap.chahuiMapTemp?.SaveSlotBackground) {
		battleback1 = $gameMap.chahuiMapTemp.SaveSlotBackground;
		$gameMap.chahuiMapTemp.SaveSlotBackground = null;
	}
	info.svuiBack1 = battleback1;
	//info.svuiBack2 = ($gameMap.battleback2Name && $gameMap.battleback2Name()) || $gameMap._battleback2Name || "";
	info.svuiBack2 = "gray bar";
	info.svuiHour  = $gameVariables.value(V_HOUR);
	info.svuiMin   = $gameVariables.value(V_MIN);
	info.svuiDay   = $gameVariables.value(V_DAY);
	info.svuiGold  = $gameParty.gold();
	try { info.svuiJob = $gameActors.actor(1).currentClass().name || ""; } catch(e){ info.svuiJob = ""; }
	// 治疗次数（独立变量 [1,2,'healing']），存档瞬间读取并钳制后写入 info
	try {
		let hv = Number(window.$gameSelfVariables && $gameSelfVariables.value([HEAL_MAP, HEAL_EVENT, HEAL_KEY]));
		if (!isFinite(hv) || hv < 0) hv = 0;
		if (hv > HEAL_MARK_MAX) hv = HEAL_MARK_MAX;
		info.svuiHeal = hv;
	} catch(e){ info.svuiHeal = 0; }
	return info;
};

//=============================================================================
// ** Scene_Save / Scene_Load —— 存档窗口尺寸与位置（靠右、约半屏宽，对齐 MV 布局）
//=============================================================================
// 注意：MZ 用 listWindowRect 创建存档列表窗口（不是 savefileWindowRect）
Scene_File.prototype.listWindowRect = function() {
	const ww = Math.floor(Graphics.boxWidth * 0.56);   // 约半屏宽
	const wh = Math.floor(Graphics.boxHeight * 0.84);
	const wx = Graphics.boxWidth - ww - 24;            // 靠右，留 24px 边距
	const wy = Math.floor((Graphics.boxHeight - wh) / 2);
	return new Rectangle(wx, wy, ww, wh);
};
// 不显示顶部帮助窗口（MV 版没有，且会占空间）
Scene_File.prototype.needsHelpWindow = function() { return false; };
// MZ 的 0 号槽是 Autosave（本插件的手动自动存档写入此槽）。
//   存档界面：隐藏槽 0（玩家不能手动写入自动存档槽）。
//   读档界面：始终显示槽 0（无视系统"自动存档"开关 isAutosaveEnabled），以便读取自动存档。
Scene_Save.prototype.needsAutosave = function() { return false; };
Scene_Load.prototype.needsAutosave = function() { return true; };
const _Scene_Save_firstSavefileId = Scene_Save.prototype.firstSavefileId;
Scene_Save.prototype.firstSavefileId = function() {
	return Math.max(1, _Scene_Save_firstSavefileId.call(this));
};
const _Scene_File_createHelpWindow = Scene_File.prototype.createHelpWindow;
Scene_File.prototype.createHelpWindow = function() {
	if (this.needsHelpWindow && !this.needsHelpWindow()) {
		this._helpWindow = new Window_Help(new Rectangle(0, 0, 0, 0));
		this._helpWindow.hide();
		this.addWindow(this._helpWindow);
		return;
	}
	_Scene_File_createHelpWindow.call(this);
};

//=============================================================================
// ** Window_SavefileList —— 2 卡片/页 的大槽位
//=============================================================================

// 不显示菜单滚动条
Window_SavefileList.prototype.drill_MSB_scrollBarEnabled = function() {
  return false;
};
// 不显示菜单指针
Window_SavefileList.prototype.drill_MCu_cursorEnabled = function() {
	return false;
};

Window_SavefileList.prototype.maxCols = function() {
	return 1;
};
Window_SavefileList.prototype.numVisibleRows = function() {
	return SLOTS_PER_PAGE;
};
Window_SavefileList.prototype.itemHeight = function() {
	return Math.floor(this.innerHeight / SLOTS_PER_PAGE);
};

// 按实际可见行数定位：两行布局让目标位于首行，避免原生 index - 2 将其滚出屏幕。
Window_SavefileList.prototype.selectSavefile = function(savefileId) {
	const index = Math.max(0, this.savefileIdToIndex(savefileId));
	this.select(index);
	const offset = Math.floor((this.maxPageRows() - 1) / 2);
	this.setTopRow(index - offset);
};

// 隐藏窗口边框/背景（卡片直接浮在 Drill 背景上）+ 创建自定义光标
const _Window_SavefileList_initialize = Window_SavefileList.prototype.initialize;
Window_SavefileList.prototype.initialize = function(rect) {
	_Window_SavefileList_initialize.call(this, rect);
	this.opacity = 0;       // 隐藏窗口外框 + 背景
	this._svuiBlink = 0;
	this._svuiCursor = new Sprite();
	this._svuiCursor.bitmap = ImageManager.loadPicture("Save cursor");
	// 注意：必须挂到窗口顶层，不能挂 _clientArea（否则会被卡片图盖住，只露出缝隙变成一条线）
	this.addChild(this._svuiCursor);
};

// 关闭 MZ 每个列表项默认的半透明圆角底框
Window_SavefileList.prototype.drawItemBackground = function(index) {};

//=============================================================================
// ★★★ 光标对齐参数（要自己调就改这里）★★★
//   光标 = 选中卡片矩形，再四周外扩（补偿发光贴图四周的透明留白），最后整体平移。
//   - EXPAND 变大 → 光标变大（橙色描边向卡片外移）
//   - OFFSET 为整体像素平移（右/下为正）
//=============================================================================
const CURSOR_EXPAND_X = 0.025;   // 左右每侧外扩 = 卡片宽 * 该值
const CURSOR_EXPAND_Y = 0.06;   // 上下每侧外扩 = 卡片高 * 该值
const CURSOR_OFFSET_X = -2;      // 整体水平平移（像素，右为正）
const CURSOR_OFFSET_Y = 4;       // 整体垂直平移（像素，下为正）

// 自定义橙色发光光标：贴合选中卡片（带偏移与闪烁）；隐藏默认蓝框光标 + 自带上下箭头
const _Window_SavefileList_update = Window_SavefileList.prototype.update;
Window_SavefileList.prototype.update = function() {
	_Window_SavefileList_update.call(this);
	if (this._cursorSprite) this._cursorSprite.visible = false;        // 隐藏 MZ 默认光标
	if (this._downArrowSprite) this._downArrowSprite.visible = false;  // 隐藏自带小箭头
	if (this._upArrowSprite) this._upArrowSprite.visible = false;
	this._updateSvuiCursor();
};

Window_SavefileList.prototype._updateSvuiCursor = function() {
	const c = this._svuiCursor;
	if (!c) return;
	const index = this.index();
	const visible = this.isOpen() && this.cursorVisible && index >= 0;
	if (!visible) { c.visible = false; return; }
	// 卡片矩形（与 drawItem 一致：itemRectWithPadding 再缩 margin=8）
	// 光标挂在窗口顶层，需把"内容坐标"换算成"窗口坐标"：加上 _clientArea 偏移（含滚动）
	const ir = this.itemRectWithPadding(index);
	// 鼠标滚轮翻页只改滚动、不改选中索引；若选中槽位已滚出可视区域则不画光标
	if (ir.y + ir.height <= 0 || ir.y >= this.innerHeight) { c.visible = false; return; }
	const margin = 8;
	const cardX = this._clientArea.x + ir.x + margin;
	const cardY = this._clientArea.y + ir.y + margin;
	const cardW = ir.width - margin * 2, cardH = ir.height - margin * 2;
	// 外扩，使辉光边框内的橙色描边落在卡片边缘
	const ex = cardW * CURSOR_EXPAND_X, ey = cardH * CURSOR_EXPAND_Y;
	const cx = cardX - ex + CURSOR_OFFSET_X;
	const cy = cardY - ey + CURSOR_OFFSET_Y;
	const cw = cardW + ex * 2, ch = cardH + ey * 2;
	if (c.bitmap && c.bitmap.isReady()) {
		c.x = cx;
		c.y = cy;
		c.scale.x = cw / c.bitmap.width;
		c.scale.y = ch / c.bitmap.height;
		c.visible = true;
	} else {
		c.visible = false;
	}
	// 闪烁
	this._svuiBlink++;
	c.opacity = 180 + Math.round(75 * Math.sin(this._svuiBlink / 12));
};

// 卡片整体绘制
Window_SavefileList.prototype.drawItem = function(index) {
	const savefileId = this.indexToSavefileId(index);
	const info = DataManager.savefileInfo(savefileId);
	const rect = this.itemRectWithPadding(index);
	const margin = 8;
	const cx = rect.x + margin;
	const cy = rect.y + margin;
	const cw = rect.width - margin * 2;
	const ch = rect.height - margin * 2;

	this.changePaintOpacity(this.isEnabled(savefileId));
	this.drawSlotImage(info, savefileId, cx, cy, cw, ch);
	this.drawSlotNumber(savefileId, cx, cy, cw, ch);
	if (info) {
		this.drawSlotMeta(info, cx, cy, cw, ch);
		this.drawSlotTitle(info, cx, cy, cw, ch);
		this.drawSlotHealMarks(info, cx, cy, cw, ch);
	}
	this.changePaintOpacity(true);
};

// 治疗次数标记：在卡片左侧竖排绘制 svuiHeal 枚 save_mark（迁移自 TSR_Save.drawLeftDecorIcons）
Window_SavefileList.prototype.drawSlotHealMarks = function(info, x, y, w, h) {
	const count = Number(info && info.svuiHeal) || 0;
	if (count <= 0) return;
	const bitmap = ImageManager.loadSystem(HEAL_ICON);
	if (!bitmap) return;
	if (!bitmap.isReady()) {            // 图标未加载完：加载完后刷新一次再画（仅触发一次，无循环）
		bitmap.addLoadListener(() => this.refresh());
		return;
	}
	const bw = bitmap.width, bh = bitmap.height;
	for (let i = 0; i < count; i++) {
		this.contents.blt(bitmap, 0, 0, bw, bh, x + HEAL_MARK_X, y + HEAL_MARK_TOP_Y + i * HEAL_MARK_STEP_Y);
	}
};

// 槽位大图：有存档=战斗背景 battleback1+battleback2 叠加；空档=emptySave 贴图
Window_SavefileList.prototype.drawSlotImage = function(info, savefileId, x, y, w, h) {
	const ctx = this.contents;
	const prevOpacity = ctx.paintOpacity;
	ctx.paintOpacity = 255;   // 背景图/NO DATA 始终满不透明（不受空档禁用变灰影响）
	const drawPic = (bmp) => {
		if (!bmp) return false;
		if (bmp.isReady()) {
			ctx.blt(bmp, 0, 0, bmp.width, bmp.height, x, y, w, h);
			return true;
		}
		if (!this._svuiReloadHooked) {
			this._svuiReloadHooked = true;
			bmp.addLoadListener(() => { this._svuiReloadHooked = false; if (this.contents) this.refresh(); });
		}
		return false;
	};
	if (!info) {
		// 空档：emptySave.png（NO DATA 贴图）
		drawPic(ImageManager.loadPicture("emptySave"));
		ctx.paintOpacity = prevOpacity;
		return;
	}
	if (!info.svuiBack1) info.svuiBack1 = 'oniichan_room1';
	drawPic(ImageManager.loadBattleback1(info.svuiBack1));
	if (!info.svuiBack2) info.svuiBack2 = 'gray bar';
	if (savefileId === 0) info.svuiBack2 = 'gray bar(auto)';
	drawPic(ImageManager.loadBattleback2(info.svuiBack2));
	ctx.paintOpacity = prevOpacity;
};

//=============================================================================
// ★ 序号绘制参数（要自己调就改这里）
//=============================================================================
const NUM_FONT_SIZE = 48;   // 字号
const NUM_OFFSET_X  = 52;   // 序号【中心点】距卡片左边（一位/两位数都围绕此中心居中）
const NUM_OFFSET_Y  = 44;   // 距卡片顶边
const NUM_BOX_W     = 120;  // 居中用的判定框宽度（够放两位数即可）

// 序号（左上角大字，无描边，满不透明，按中心点自适应居中）
Window_SavefileList.prototype.drawSlotNumber = function(savefileId, x, y, w, h) {
	// 0 号槽是自动存档专属槽，不绘制序号数字（与 TSR_Save 的处理一致）。
	if (savefileId === 0) return;
	const prevOpacity = this.contents.paintOpacity;
	this.contents.paintOpacity = 255;   // 不随空档禁用变灰
	this.contents.fontSize = NUM_FONT_SIZE;
	this.contents.fontFace = 'FOT-NewCinemaA Std D';
	//this.contents.fontBold = true;
	this.resetTextColor();
	// 以 x+NUM_OFFSET_X 为中心：放一个 NUM_BOX_W 宽的框，center 对齐 → 位数变化时中心不动
	this.drawText(String(savefileId), x + NUM_OFFSET_X - NUM_BOX_W / 2, y + NUM_OFFSET_Y, NUM_BOX_W, "center");
	this.resetFontSettings();
	this.contents.paintOpacity = prevOpacity;
};

//=============================================================================
// ★ 文字黑色外发光（要自己调就改这里）
//   原理：写进 bitmap 的文字用 canvas 的 shadowBlur/shadowColor 产生外发光，
//   比 PIXI GlowFilter 更适合（滤镜只能作用于 Sprite，无法对共享 bitmap 里的单段文字生效）。
//   多描几遍（PASSES）可让光晕更浓。
//=============================================================================
const TEXT_GLOW_COLOR  = "rgba(0,0,0,0.66)";  // 文字外发光颜色
const TEXT_GLOW_BLUR   = 9;                    // 文字模糊半径（越大光晕越大越柔）
const TEXT_GLOW_PASSES = 4;                    // 文字叠加遍数（越多越浓）

// ★ 图标外发光（独立于文字，单独调）
const ICON_GLOW_COLOR  = "rgba(0,0,0,0.5)";  // 图标外发光颜色
const ICON_GLOW_BLUR   = 6;                    // 图标模糊半径
const ICON_GLOW_PASSES = 2;                    // 图标叠加遍数

// 带黑色外发光地绘制文字（参数同 Window_Base.drawText）
Window_SavefileList.prototype.svuiDrawTextGlow = function(text, x, y, w, align) {
	const ctx = this.contents && this.contents.context;
	if (!ctx) { this.drawText(text, x, y, w, align); return; }
	ctx.save();
	ctx.shadowColor = TEXT_GLOW_COLOR;
	ctx.shadowBlur = TEXT_GLOW_BLUR;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	for (let i = 0; i < TEXT_GLOW_PASSES; i++) {
		this.drawText(text, x, y, w, align);
	}
	ctx.restore();
};

// 带黑色外发光地 blt 图标（参数同 Bitmap.blt；用独立的 ICON_GLOW 参数）
Window_SavefileList.prototype.svuiBltGlow = function(bmp, sx, sy, sw, sh, dx, dy, dw, dh) {
	const ctx = this.contents && this.contents.context;
	if (!ctx) { this.contents.blt(bmp, sx, sy, sw, sh, dx, dy, dw, dh); return; }
	ctx.save();
	ctx.shadowColor = ICON_GLOW_COLOR;
	ctx.shadowBlur = ICON_GLOW_BLUR;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	for (let i = 0; i < ICON_GLOW_PASSES; i++) {
		this.contents.blt(bmp, sx, sy, sw, sh, dx, dy, dw, dh);
	}
	ctx.restore();
};

// 右上角元数据：[时间图标]时间  [天数图标]DAY N  [金币图标]金币（用 img/system 的图标）
Window_SavefileList.prototype.drawSlotMeta = function(info, x, y, w, h) {
	const hh = String(info.svuiHour ?? 0).padStart(2, "0");
	const mm = String(info.svuiMin ?? 0).padStart(2, "0");
	const items = [
		{ icon: "save_time", text: hh + ":" + mm },
		{ icon: "save_day",  text: "DAY " + (info.svuiDay ?? "?") },
		{ icon: "save_gold", text: (info.svuiGold ?? "?") + "G" }
	];
	const iconSize = 46;
	const gap = 2;       // 图标与文字间距
	const groupGap = 18; // 组间距
	this.contents.fontSize = 29;
	this.contents.fontFace = 'RiiTegakiFude'; 
	this.contents.outlineWidth = 0;
	this.resetTextColor();
	// 先算每组宽度（图标 + 间距 + 文字）
	const widths = items.map(it => iconSize + gap + this.textWidth(it.text));
	const totalW = widths.reduce((a, b) => a + b, 0) + groupGap * (items.length - 1);
	let dx = x + w - 42 - totalW;       // 右对齐起点
	const dy = y + 22;
	let reloaded = false;
	for (let i = 0; i < items.length; i++) {
		const bmp = ImageManager.loadSystem(items[i].icon);
		if (bmp.isReady()) {
			this.svuiBltGlow(bmp, 0, 0, bmp.width, bmp.height, dx, dy-9, iconSize, iconSize);
		} else if (!this._svuiReloadHooked) {
			this._svuiReloadHooked = true; reloaded = true;
			bmp.addLoadListener(() => { this._svuiReloadHooked = false; if (this.contents) this.refresh(); });
		}
		this.svuiDrawTextGlow(items[i].text, dx + iconSize + gap, dy - 4, this.textWidth(items[i].text) + 4, "left");
		dx += widths[i] + groupGap;
	}
	this.resetFontSettings();
};

// 底部：角色称号（居中大字 + 描边）
Window_SavefileList.prototype.drawSlotTitle = function(info, x, y, w, h) {
	const job = info.svuiJob || "";
	if (!job) return;
	this.contents.fontSize = 48;
	this.contents.fontFace = "Buildings and under the railway tracks";
	this.contents.outlineColor = "rgba(0,0,0,0.8)";
	this.contents.outlineWidth = 0;
	this.changeTextColor("#ffffff");
	this.svuiDrawTextGlow(job, x, y + h - 64, w, "center");
	this.resetFontSettings();
};

//=============================================================================
// 自定义翻页按钮（复刻 TSR_Save：saveArrowUp/Down，悬停放大 + 音效 + 按下回弹）
//=============================================================================
const BTN_CFG = {
	up:   { img: "saveArrowUp",   opa: 220, opaH: 255, baseScale: 1.0, hoverScale: 1.2, pressScale: 0.8, pressFrames: 8 },
	down: { img: "saveArrowDown", opa: 220, opaH: 255, baseScale: 1.0, hoverScale: 1.2, pressScale: 0.8, pressFrames: 8 },
	// 打开存档文件夹 / 云存档（复刻 TSR_Save：左下角，anchor 0,0，绝对坐标）
	openFolder: { img: "openFolder",    x: 32,  y: 980, opa: 200, opaH: 255, anchorX: 0, anchorY: 0, baseScale: 1.0, hoverScale: 1.1, pressScale: 0.94, pressFrames: 8 },
	cloud:      { img: "cloudDownload", x: 120, y: 975, opa: 200, opaH: 255, anchorX: 0, anchorY: 0, baseScale: 1.0, hoverScale: 1.1, pressScale: 0.94, pressFrames: 8 }
};

//=============================================================================
// ★★★ 翻页按钮位置（要自己调就改这里）★★★
//   基准点：上按钮=窗口顶边中点，下按钮=窗口底边中点；下面是相对该基准点的像素偏移。
//   （锚点在按钮中心，所以填的是按钮中心要落在哪）
//=============================================================================
const BTN_UP_DX   = 3;     // 上按钮 X 偏移（右为正）
const BTN_UP_DY   = -26;   // 上按钮 Y 偏移（下为正；负=在窗口上方）
const BTN_DOWN_DX = 3;     // 下按钮 X 偏移（右为正）
const BTN_DOWN_DY = 41;    // 下按钮 Y 偏移（下为正；正=在窗口下方）

function svuiCreateButton(scene, cfg) {
	if (!scene._svuiBtnLayer) {
		scene._svuiBtnLayer = new Sprite();
		scene.addChild(scene._svuiBtnLayer);
	}
	const spr = new Sprite();
	spr.bitmap = ImageManager.loadSystem(cfg.img);
	spr.anchor.x = cfg.anchorX != null ? cfg.anchorX : 0.5;
	spr.anchor.y = cfg.anchorY != null ? cfg.anchorY : 0.5;
	spr.x = cfg.x || 0;
	spr.y = cfg.y || 0;
	spr.opacity = cfg.opa;
	spr.scale.x = spr.scale.y = cfg.baseScale;
	scene._svuiBtnLayer.addChild(spr);
	return { spr, cfg, _hover: false, _pressFrames: 0 };
}

function svuiPointInSprite(spr, px, py) {
	if (!spr || !spr.bitmap || !spr.bitmap.isReady() || !spr.visible) return false;
	const w = spr.bitmap.width * spr.scale.x;
	const h = spr.bitmap.height * spr.scale.y;
	const x = spr.x - w * spr.anchor.x;
	const y = spr.y - h * spr.anchor.y;
	return px >= x && px <= x + w && py >= y && py <= y + h;
}

function svuiUpdateBtnScale(btn) {
	const cfg = btn.cfg;
	let target = cfg.baseScale;
	if (btn._pressFrames > 0) { target = cfg.pressScale; btn._pressFrames--; }
	else if (btn._hover) { target = cfg.hoverScale; }
	btn.spr.scale.x += (target - btn.spr.scale.x) * 0.28;
	btn.spr.scale.y += (target - btn.spr.scale.y) * 0.28;
}

function svuiMoveSlot(scene, dir) {
	const win = scene._listWindow;
	if (!win || !win.active) return;
	if (win.isCursorMovable && !win.isCursorMovable()) return;
	const last = win.index();
	if (dir < 0) win.cursorUp(true); else win.cursorDown(true);
	if (win.index() !== last) SoundManager.playCursor();
	else SoundManager.playBuzzer();
}

// —— nwjs 文件系统辅助（复刻 TSR_Save：打开存档文件夹）——
function svuiIsNW() { return Utils.isNwjs && Utils.isNwjs(); }
function svuiResolveSaveDir() {
	const path = require("path");
	const base = path.dirname(process.mainModule.filename);
	return path.join(base, "save");
}
function svuiOpenDirAbs(abs) {
	const { exec } = require("child_process");
	let cmd;
	if (process.platform === "win32") cmd = 'explorer "' + abs.replace(/\//g, "\\") + '"';
	else if (process.platform === "darwin") cmd = 'open "' + abs + '"';
	else cmd = 'xdg-open "' + abs + '"';
	exec(cmd);
}
// 云存档按钮点击（验证会员后进入云存档场景）
function svuiOnCloudClick() {
	SoundManager.playOk();
	if (typeof Scene_PatreonVerify !== "undefined") SceneManager.push(Scene_PatreonVerify);
}
// Android无法打开目录时沿用原来的手动路径提示。
function svuiShowMobileSaveDirTip() {
	let textArray = window.systemFeatureText && window.systemFeatureText.tipSaveMobile;
	if (!textArray) textArray = [
		"The Android version doesn’t support quick access to the save directory for now",
		"due to sensitive permission issues.",
		"Please go to the '/storage/emulated/0/Documents/sister_save' path yourself",
		"to check the save files! You’re free to transfer save data from other devices or",
		"the PC version to inherit your progress."
	];
	alert(textArray.join("\n"));
	SoundManager.playBuzzer();
}

// Android通过工程内已注册的InAppBrowser原生服务发出ACTION_VIEW。
// 返回true只表示调用已经交给原生端；原生打开失败时会异步执行onFailure。
function svuiTryOpenAndroidSaveDir(onFailure) {
	try {
		if (!window.cordova || typeof window.cordova.exec !== "function") return false;
		const saveDirUri =
			"content://com.android.externalstorage.documents/document/" +
			"primary%3ADocuments%2Fsister_save";
		let settled = false;
		window.cordova.exec(
			function() {
				if (settled) return;
				settled = true;
				SoundManager.playOk();
			},
			function() {
				if (settled) return;
				settled = true;
				onFailure();
			},
			"InAppBrowser",
			"open",
			[saveDirUri, "_system", ""]
		);
		return true;
	} catch (e) {
		return false;
	}
}

// 打开存档文件夹按钮点击（Android与PC都直接尝试打开各自的存档目录）
function svuiOnOpenFolderClick() {
	try {
		if (Utils.isMobileDevice()) {
			if (!svuiTryOpenAndroidSaveDir(svuiShowMobileSaveDirTip)) {
				svuiShowMobileSaveDirTip();
			}
			return;
		}
		if (!svuiIsNW()) return;
		const path = require("path");
		SoundManager.playOk();
		svuiOpenDirAbs(path.resolve(svuiResolveSaveDir()));
	} catch (e) {
		console.error(e);
	}
}

const _Scene_File_create_btn = Scene_File.prototype.create;
Scene_File.prototype.create = function() {
	_Scene_File_create_btn.call(this);
	const rect = this._listWindow ? new Rectangle(this._listWindow.x, this._listWindow.y, this._listWindow.width, this._listWindow.height) : this.listWindowRect();
	const cx = rect.x + rect.width / 2;
	this._svuiBtns = [];
	const up = svuiCreateButton(this, BTN_CFG.up);
	up.spr.x = cx + BTN_UP_DX;
	up.spr.y = rect.y + BTN_UP_DY;
	up.onClick = () => svuiMoveSlot(this, -1);
	this._svuiBtns.push(up);
	const down = svuiCreateButton(this, BTN_CFG.down);
	down.spr.x = cx + BTN_DOWN_DX;
	down.spr.y = rect.y + rect.height + BTN_DOWN_DY;
	down.onClick = () => svuiMoveSlot(this, 1);
	this._svuiBtns.push(down);

	// 云存档按钮（仅在联网未禁用时显示，与 TSR_Save 一致）
	if (!ConfigManager.disableNetwork) {
		const cloud = svuiCreateButton(this, BTN_CFG.cloud);
		cloud.onClick = svuiOnCloudClick;
		this._svuiBtns.push(cloud);
	}
	// 打开存档文件夹按钮（Android与NW.js桌面版）
	if (Utils.isMobileDevice() || svuiIsNW()) {
		const openFolder = svuiCreateButton(this, BTN_CFG.openFolder);
		openFolder.onClick = () => svuiOnOpenFolderClick();
		this._svuiBtns.push(openFolder);
	}
};

const _Scene_File_update_btn = Scene_File.prototype.update;
Scene_File.prototype.update = function() {
	_Scene_File_update_btn.call(this);
	if (!this._svuiBtns) return;
	const mx = TouchInput.x, my = TouchInput.y;
	for (const b of this._svuiBtns) {
		const hover = svuiPointInSprite(b.spr, mx, my);
		const wasHover = b._hover;
		b._hover = hover;
		b.spr.opacity = hover ? b.cfg.opaH : b.cfg.opa;
		if (hover && !wasHover) SoundManager.playCursor();
		svuiUpdateBtnScale(b);
	}
	if (TouchInput.isTriggered()) {
		for (const b of this._svuiBtns) {
			if (svuiPointInSprite(b.spr, mx, my) && typeof b.onClick === "function") {
				b._pressFrames = b.cfg.pressFrames;
				b.onClick();
				break;
			}
		}
	}
};

//=============================================================================
// ** 二次确认窗口（存档覆盖 / 读档），暖橙发光文字（canvas shadow，自动生成不靠贴图）
//=============================================================================
//=== ★ 确认窗口可调参数（要自己调就改这里）===
const CONFIRM_TXT_LOAD   = "Would you like\nto load?";   // 读档提示（\n 换行）
const CONFIRM_TXT_SAVE   = "Overwrite\nthis save?";      // 覆盖存档提示
const CONFIRM_FONT_FACE  = 'Chiron Go Round TC';
const CONFIRM_PROMPT_FONT= 48;                            // 提示文字字号
const CONFIRM_PROMPT_CENTER_X = 132;                      // 标题【居中锚点】X（内容坐标）。每行按实际测量宽度居中到此 X，任意语言/行宽都自动居中
const CONFIRM_CMD_FONT   = 44;                            // Yes/No 字号
const CONFIRM_TEXT_COLOR = "#ffffff";                     // 文字本色（白，配辉光最亮）
// —— PIXI GlowFilter 参数（真辉光，比 canvas shadow 亮）——
const CONFIRM_GLOW_COLOR = 0xf1b36a;                      // 辉光颜色（hex 数字，暖橙）
const CONFIRM_GLOW_DISTANCE = 18;                         // 辉光半径
const CONFIRM_GLOW_OUTER = 2;                             // 外辉光强度（越大越亮）
const CONFIRM_GLOW_INNER = 0;                             // 内辉光强度
const CONFIRM_GLOW_QUALITY = 0.6;                         // 质量 0~1（越高越细腻越费）
const CONFIRM_WIN_X      = 300;                           // 窗口左上 X
const CONFIRM_WIN_Y_RATE = 0.38;                          // 窗口左上 Y = boxHeight * 该值
const CONFIRM_WIN_W      = 640;                           // 窗口宽
const CONFIRM_WIN_H      = 360;                           // 窗口高
const CONFIRM_HIT_PAD    = 14;                            // 命中框在单词右侧的额外内边距
const CONFIRM_CMD_GAP    = 64;                            // Yes 与 No 命中框之间的水平间隔

//=============================================================================
// ★★★ 多语言文本接口（覆写这两个函数即可接入你的多语言系统）★★★
//   - 每次打开确认框都会动态调用，运行时随时覆写都即时生效。
//   - 默认实现回退到上面的常量，保证未接入时也能正常显示。
//
//   API 1: 确认框标题文本     ShiroinSaveUI.getConfirmTitle(type)
//          type: "load"(读档) | "save"(覆盖存档)；可在文本中用 "\n" 换行
//   API 2: 选项(Yes/No)文本   ShiroinSaveUI.getOptionText(symbol)
//          symbol: "yes" | "no"
//
//   覆写示例（写在你自己的插件里，本插件之后加载即可）：
//     ShiroinSaveUI.getConfirmTitle = type => MyI18N.t(type === "load" ? "save.askLoad" : "save.askOverwrite");
//     ShiroinSaveUI.getOptionText   = sym  => MyI18N.t(sym === "yes" ? "common.yes" : "common.no");
//=============================================================================
window.ShiroinSaveUI = window.ShiroinSaveUI || {};
ShiroinSaveUI.getConfirmTitle = ShiroinSaveUI.getConfirmTitle || function(type) {
	const TXT_LOAD = window?.systemFeatureText?.loadConfirm?.join?.('\n');
	const CONFIRM_TXT_SAVE = window?.systemFeatureText?.OverwriteConfirmed?.join?.('\n');
	return type === "load" ? TXT_LOAD : CONFIRM_TXT_SAVE;
};
ShiroinSaveUI.getOptionText = ShiroinSaveUI.getOptionText || function(symbol) {
	const OptionText = window?.systemFeatureText?.SVConfirmText;
	if (OptionText) {
        return symbol === "yes" ? OptionText[0] : OptionText[1];
	}
	return symbol === "yes" ? "Yes" : "No";
};
// API 3: 字体类型     ShiroinSaveUI.getFontFace(part)
//        part: "prompt"(标题) | "option"(Yes/No)；返回 CSS font-family 名（需已加载该字体）
//   覆写示例： ShiroinSaveUI.getFontFace = part => window?.systemFeatureText?.SVFont || CONFIRM_FONT_FACE;
ShiroinSaveUI.getFontFace = ShiroinSaveUI.getFontFace || function(part) {
	const lang = ConfigManager.language;
	let fontFace = CONFIRM_FONT_FACE;
	if ([1,2].includes(lang)) return 'RiiTegakiFude';
	switch (lang) {
		case 0: 
		case 12: 
		fontFace = 'Maple Mono NF CN';
		break;		
		case 1: 
		case 2: 
		fontFace = 'RiiTegakiFude';
		break;		
	}
	return fontFace;
};

function Window_SvuiConfirm() { this.initialize(...arguments); }
Window_SvuiConfirm.prototype = Object.create(Window_Command.prototype);
Window_SvuiConfirm.prototype.constructor = Window_SvuiConfirm;

Window_SvuiConfirm.prototype.initialize = function(rect) {
	this._prompt = "";
	Window_Command.prototype.initialize.call(this, rect);
	this.opacity = 0;       // 无边框背景
	this._createGlowLayer();
	this.deactivate();
	this.hide();
};
// 发光画布左右/上下额外留白，防止宽文本(如 CJK)+居中偏移+辉光在边缘被裁剪
const GLOW_PAD_X = 180;
const GLOW_PAD_Y = 48;
// 用一张独立 bitmap 的 Sprite 承载所有文字，并对其挂 PIXI GlowFilter
Window_SvuiConfirm.prototype._createGlowLayer = function() {
	// 画布比内容区四周各大一圈；精灵反向移回，保证内容坐标(0,0)仍对齐窗口内左上
	this._glowBitmap = new Bitmap(this.innerWidth + GLOW_PAD_X * 2, this.innerHeight + GLOW_PAD_Y * 2);
	this._glowSprite = new Sprite(this._glowBitmap);
	this._glowSprite.x = this.padding - GLOW_PAD_X;
	this._glowSprite.y = this.padding - GLOW_PAD_Y;
	if (PIXI.filters && PIXI.filters.GlowFilter) {
		const f = new PIXI.filters.GlowFilter({
			distance: CONFIRM_GLOW_DISTANCE,
			outerStrength: CONFIRM_GLOW_OUTER,
			innerStrength: CONFIRM_GLOW_INNER,
			color: CONFIRM_GLOW_COLOR,
			quality: CONFIRM_GLOW_QUALITY
		});
		this._glowSprite.filters = [f];
	}
	this.addChild(this._glowSprite);   // 直接挂窗口（不进 _clientArea，避免被裁剪）
};
Window_SvuiConfirm.prototype.lineHeight = function() { return 52; };
Window_SvuiConfirm.prototype.maxCols = function() { return 2; };
Window_SvuiConfirm.prototype.makeCommandList = function() {
	this.addCommand(String(ShiroinSaveUI.getOptionText("yes")), "yes");
	this.addCommand(String(ShiroinSaveUI.getOptionText("no")), "no");
};
Window_SvuiConfirm.prototype.setPrompt = function(text) {
	this._prompt = text || "";
	this.refresh();
};
Window_SvuiConfirm.prototype._promptLines = function() {
	return this._prompt ? this._prompt.split("\n") : [];
};
Window_SvuiConfirm.prototype._promptHeight = function() {
	return this._promptLines().length * this.lineHeight() + 16;
};
// 标题块 + 选项行 作为整体在窗口内垂直居中：标题变多行时整体自动上移，选项不会被推出
Window_SvuiConfirm.prototype._contentTop = function() {
	const total = this._promptHeight() + this.lineHeight();
	return Math.max(0, Math.floor((this.innerHeight - total) / 2));
};
// 逐项计算各自的命中宽度（= 该单词真实渲染宽 + 右内边距）与累积 X 位置
Window_SvuiConfirm.prototype._calcLayout = function() {
	this._svuiW = [];
	this._svuiX = [];
	const bmp = this._glowBitmap;
	if (!bmp) return;
	const ps = bmp.fontSize, pf = bmp.fontFace;
	bmp.fontFace = ShiroinSaveUI.getFontFace("option");
	bmp.fontSize = CONFIRM_CMD_FONT;
	let x = 0;
	for (let i = 0; i < this.maxItems(); i++) {
		const w = Math.ceil(bmp.measureTextWidth(this.commandName(i)) + CONFIRM_HIT_PAD);
		this._svuiW[i] = w;
		this._svuiX[i] = x;
		x += w + CONFIRM_CMD_GAP;
	}
	bmp.fontSize = ps; bmp.fontFace = pf;
};
// 命中区/高亮框 = 各自单词宽度；相邻排列（间隔 CONFIRM_CMD_GAP），整体下移给提示让位
Window_SvuiConfirm.prototype.itemRect = function(index) {
	const w = (this._svuiW && this._svuiW[index]) || 120;
	const x = (this._svuiX && this._svuiX[index]) || 0;
	return new Rectangle(x, this._contentTop() + this._promptHeight(), w, this.lineHeight());
};
// 不画到 contents：只更新命令列表 + 重绘 glow bitmap
Window_SvuiConfirm.prototype.refresh = function() {
	this.clearCommandList();
	this.makeCommandList();
	this._calcLayout();                  // 缓存各项宽度/位置
	if (this.contents) this.contents.clear();
	this._redrawGlow();
};
Window_SvuiConfirm.prototype._redrawGlow = function() {
	const bmp = this._glowBitmap;
	if (!bmp) return;
	bmp.clear();
	bmp.textColor = CONFIRM_TEXT_COLOR;
	bmp.outlineWidth = 0;
	const lh = this.lineHeight();
	// 提示文字
	bmp.fontFace = ShiroinSaveUI.getFontFace("prompt");
	bmp.fontSize = CONFIRM_PROMPT_FONT;
	const lines = this._promptLines();
	const top = this._contentTop();
	// 每行按【实际测量宽度】居中到锚点 CONFIRM_PROMPT_CENTER_X：任意语言/行宽都自动居中，无需逐语言调
	// （画布四周有 GLOW_PAD，绘制 x/y 统一 +PAD）
	for (let i = 0; i < lines.length; i++) {
		const w = bmp.measureTextWidth(lines[i]);
		const bx = GLOW_PAD_X + CONFIRM_PROMPT_CENTER_X - w / 2;
		bmp.drawText(lines[i], bx, GLOW_PAD_Y + top + i * lh, w + 4, lh, "left");
	}
	// Yes / No（相邻），选中指示由 Drill_MenuCursor 提供。
	for (let i = 0; i < this.maxItems(); i++) {
		const rect = this.itemRect(i);
		bmp.fontSize = CONFIRM_CMD_FONT;
		bmp.fontFace = ShiroinSaveUI.getFontFace("option");
		bmp.drawText(this.commandName(i), GLOW_PAD_X + rect.x, GLOW_PAD_Y + rect.y, rect.width, lh, "center");
	}
};
// 选择变化时重绘（多语言文本/状态刷新）
Window_SvuiConfirm.prototype.select = function(index) {
	Window_Command.prototype.select.call(this, index);

	this._redrawGlow();
};

//--- 场景接入 ---
Scene_File.prototype.svuiConfirmWindowRect = function() {
	const wy = Math.floor(Graphics.boxHeight * CONFIRM_WIN_Y_RATE);
	return new Rectangle(CONFIRM_WIN_X, wy, CONFIRM_WIN_W, CONFIRM_WIN_H);
};
Scene_File.prototype.svuiCreateConfirmWindow = function() {
	const win = new Window_SvuiConfirm(this.svuiConfirmWindowRect());
	win.setHandler("yes",    this.svuiOnConfirmOk.bind(this));
	win.setHandler("no",     this.svuiOnConfirmCancel.bind(this));
	win.setHandler("cancel", this.svuiOnConfirmCancel.bind(this));
	this.addWindow(win);
	this._svuiConfirmWindow = win;
};
Scene_File.prototype.svuiOpenConfirm = function(type, savefileId) {
	this._svuiConfirmType = type;
	this._svuiConfirmId = savefileId;
	const w = this._svuiConfirmWindow;
	w.setPrompt(String(ShiroinSaveUI.getConfirmTitle(type)));
	w.show();
	w.select(0);          // 默认停在 Yes
	w.activate();
	this._listWindow.deactivate();
};
Scene_File.prototype.svuiCloseConfirm = function() {
	const w = this._svuiConfirmWindow;
	if (!w) return;
	w.deactivate();
	w.hide();
};
Scene_File.prototype.svuiOnConfirmOk = function() {
	this.svuiCloseConfirm();
	const id = this._svuiConfirmId;
	if (this._svuiConfirmType === "load") {
		this.executeLoad(id);
	} else if (this.isSavefileEnabled(id)) {
		this.executeSave(id);
	} else {
		this.onSaveFailure();
	}
};
Scene_File.prototype.svuiOnConfirmCancel = function() {
	this.svuiCloseConfirm();
	this.activateListWindow();
};

// 创建确认窗口（再追加一层 create 别名）
const _Scene_File_create_cfm = Scene_File.prototype.create;
Scene_File.prototype.create = function() {
	_Scene_File_create_cfm.call(this);
	this.svuiCreateConfirmWindow();
};

// 存档：空槽直接存；有存档 → 确认覆盖
Scene_Save.prototype.onSavefileOk = function() {
	const id = this.savefileId();
	if (DataManager.savefileExists(id)) {
		this.svuiOpenConfirm("save", id);
	} else if (this.isSavefileEnabled(id)) {
		this.executeSave(id);
	} else {
		this.onSaveFailure();
	}
};
// 读档：无条件确认
Scene_Load.prototype.onSavefileOk = function() {
	const id = this.savefileId();
	if (DataManager.savefileExists(id)) {
		this.svuiOpenConfirm("load", id);
	} else {
		this.onLoadFailure();
	}
};

//=============================================================================
// ** 发光文字 tip（复刻 TSR_Save：☚提示，白字 + GlowFilter，闪烁数次后淡出）
//=============================================================================
const TIP_FLASH_TIMES = 8;      // 闪烁次数（淡出到0算一次）
const TIP_SPEED       = 0.02;   // alpha 每帧变化
const TIP_FONT_SIZE   = 30;     // 字号
const TIP_FONT_FACE   = CONFIRM_FONT_FACE;   // 字体（默认用确认框字体；TSR 用 DrillUp.g_DFF_fontFace）
const TIP_X = 215, TIP_Y = 910; // 位置（绝对坐标）
const TIP_W = 600, TIP_H = 200; // 文字 bitmap 尺寸
const TIP_GLOW = { distance: 15, outerStrength: 1, innerStrength: 0, color: 0xf3a64a, quality: 0.8 };

function svuiInitTipState(spr) {
	spr.alpha = 1.0;
	spr._svuiTip = { cnt: 0, dir: -1, active: true };   // dir: -1淡出 / +1淡入
}
function svuiUpdateTip(spr) {
	if (!spr || !spr._svuiTip || !spr._svuiTip.active) return false;
	const st = spr._svuiTip;
	if (st.cnt < TIP_FLASH_TIMES) {
		spr.alpha += st.dir * TIP_SPEED;
		if (st.dir < 0 && spr.alpha <= 0) { spr.alpha = 0; st.cnt += 1; st.dir = +1; }
		else if (st.dir > 0 && spr.alpha >= 1) { spr.alpha = 1; st.dir = -1; }
		return true;
	}
	spr.alpha -= TIP_SPEED;   // 收尾淡出并移除
	if (spr.alpha <= 0) {
		spr.alpha = 0; st.active = false;
		if (spr.parent) spr.parent.removeChild(spr);
		return false;
	}
	return true;
}
function svuiMakeTextTip(text, fontFace) {
	const bmp = new Bitmap(TIP_W, TIP_H);
	bmp.fontSize = TIP_FONT_SIZE;
	const fallbackFontFace = (typeof DrillUp !== "undefined" && DrillUp.g_DFF_fontFace)
		? DrillUp.g_DFF_fontFace
		: TIP_FONT_FACE;
	bmp.fontFace = fontFace ? `${fontFace}, ${fallbackFontFace}` : fallbackFontFace;
	bmp.textColor = "#ffffff";
	const textLines = String(text ?? "").split("\n");
	const lineHeight = TIP_FONT_SIZE + 8;
	const startY = Math.max(0, Math.round((TIP_H - textLines.length * lineHeight) / 2));
	for (let i = 0; i < textLines.length; i++) {
		bmp.drawText(textLines[i], 0, startY + i * lineHeight, TIP_W, lineHeight, "left");
	}
	const spr = new Sprite(bmp);
	spr.x = TIP_X;
	spr.y = TIP_Y;
	if (PIXI.filters && PIXI.filters.GlowFilter) {
		spr.filters = [ new PIXI.filters.GlowFilter(TIP_GLOW) ];   // MZ：options 对象（MV 是位置参数）
	}
	svuiInitTipState(spr);
	return spr;
}

const _Scene_File_create_tip = Scene_File.prototype.create;
Scene_File.prototype.create = function() {
	_Scene_File_create_tip.call(this);
	this._svuiTips = [];
	if (!ConfigManager.disableNetwork) {
		let textArray = window.systemFeatureText?.memberMenu?.["shortHint"];
		if (!textArray) textArray = " Can now enable cloud saves & major auto updates";
		let txt = Array.isArray(textArray) ? textArray.join("\n") : (textArray ?? "");
		const fusionFontFace = chahuiUtil.getFusionPixelFont(ConfigManager.language);
		txt = "☚" + txt;
		const tip = svuiMakeTextTip(txt, fusionFontFace);
		(this._svuiBtnLayer || this).addChild(tip);
		this._svuiTips.push(tip);
	}
};
const _Scene_File_update_tip = Scene_File.prototype.update;
Scene_File.prototype.update = function() {
	_Scene_File_update_tip.call(this);
	if (this._svuiTips && this._svuiTips.length > 0) {
		for (let i = this._svuiTips.length - 1; i >= 0; i--) {
			if (!svuiUpdateTip(this._svuiTips[i])) this._svuiTips.splice(i, 1);
		}
	}
};
const _Scene_File_terminate_tip = Scene_File.prototype.terminate;
Scene_File.prototype.terminate = function() {
	if (this._svuiTips) {
		for (const spr of this._svuiTips) {
			if (spr) { spr.filters = null; if (spr.parent) spr.parent.removeChild(spr); }
		}
		this._svuiTips = null;
	}
	_Scene_File_terminate_tip.call(this);
};

//=============================================================================
// ** 自动存档（从 TSR_Save 迁移）
//    只迁移：SaveNow 插件指令 / $gameMap.autosave() / SceneManager._scene.updateSaveWindow()
//    + 存档成功的文本演出窗(Window_Autosave)。其余 TSR 功能一律不引入。
//    存档后端用 MZ 原生异步 DataManager.saveGame(Promise)，已据此适配。
//=============================================================================

// --- 参数（默认值取自你的 TSR_Save 实际配置） ---
const AS_RAW_TEXT = String(PARAMS.autosaveText != null ? PARAMS.autosaveText : "Auto save...");
let   AS_DOT_ANIM = false;
const AS_TEXT = (function(t){
	if (t.indexOf("...") >= 0) { AS_DOT_ANIM = true; return t.slice(0, t.indexOf("...")); }
	return t;
})(AS_RAW_TEXT);
const AS_X      = Number(PARAMS.autosaveX != null ? PARAMS.autosaveX : 20);
const AS_Y      = Number(PARAMS.autosaveY != null ? PARAMS.autosaveY : 120);
const AS_WIDTH  = Number(PARAMS.autosaveWidth || 200);
const AS_FONT   = parseInt(PARAMS.autosaveFontSize || 28);
const AS_LOCKED = String(PARAMS.autosaveLocked != null ? PARAMS.autosaveLocked : "true") === "true";
const AS_SLOT   = Number(PARAMS.autosaveSlot != null ? PARAMS.autosaveSlot : 0);  // MZ 自动存档专属槽=0
const AS_SHOW   = String(PARAMS.autosaveShow   != null ? PARAMS.autosaveShow   : "true") === "true";
function asColor(str, fallback){
	const c = String(str == null ? "" : str).split(",");
	if (c.length < 4) return fallback;
	const r = parseInt(/\d+/.exec(c[0])), g = parseInt(/\d+/.exec(c[1])),
	      b = parseInt(/\d+/.exec(c[2])), a = parseFloat(/\d+.*\d*/.exec(c[3]));
	return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
}
const AS_COLOR1 = asColor(PARAMS.autosaveColor1, "rgba(0, 0, 0, 0)");
const AS_COLOR2 = asColor(PARAMS.autosaveColor2, "rgba(0, 0, 0, 0)");

//--- Window_Autosave（成功提示演出窗；MV→MZ 适配：Rectangle 初始化 / updatePadding） ---
function Window_Autosave() { this.initialize.apply(this, arguments); }
Window_Autosave.prototype = Object.create(Window_Base.prototype);
Window_Autosave.prototype.constructor = Window_Autosave;

Window_Autosave.prototype.initialize = function() {
	const rect = new Rectangle(AS_X, AS_Y, AS_WIDTH, this.windowHeight());
	Window_Base.prototype.initialize.call(this, rect);
	this.opacity = 0;
	this.contentsOpacity = 0;
	this._showCount = 0;
	this._winText = null;
	this.refresh();
};
Window_Autosave.prototype.autosavePadding = function() { return AS_FONT / 4.66; };
Window_Autosave.prototype.lineHeight = function() { return AS_FONT + AS_FONT / 4.66 * 2; };
Window_Autosave.prototype.windowHeight = function() { return this.lineHeight() + this.autosavePadding() * 2; };
Window_Autosave.prototype.updatePadding = function() { this.padding = this.autosavePadding(); };

Window_Autosave.prototype.update = function() {
	Window_Base.prototype.update.call(this);
	if ($gameMap._justUploaded && $gameMap._autosavedSuccess) $gameMap._justUploaded = false;
	if (this._showCount > 0) {
		this.updateFadeIn();
		this.updateText();
		this._showCount--;
	} else {
		this.updateFadeOut();
	}
};
Window_Autosave.prototype.updateText = function() {
	this.contents.clear();
	if (this._showCount % 30 === 0 && this._showCount !== 120 && AS_DOT_ANIM) {
		this._winText += ".";
	}
	this.refresh();
	this.contents.paintOpacity = this.setPaintOpacity(this.contents.paintOpacity);
};
Window_Autosave.prototype.setPaintOpacity = function(opacity) {
	if (this._outLopUp) {
		if (opacity < 255) { opacity += 8; } else { this._outLopUp = false; }
	} else {
		if (opacity > 100) { opacity -= 8; } else { this._outLopUp = true; }
	}
	return opacity;
};
Window_Autosave.prototype.updateFadeIn  = function() { this.contentsOpacity += 16; };
Window_Autosave.prototype.updateFadeOut = function() { this.contentsOpacity -= 16; this._winText = null; };
Window_Autosave.prototype.open  = function() { this.refresh(); this._showCount = 100; };
Window_Autosave.prototype.close = function() { this._showCount = 0; };
Window_Autosave.prototype.refresh = function() {
	this.contents.clear();
	let text = ($gameMap._autosavedSuccess) ? AS_TEXT : "";
	if ($gameMap._autosavedSuccess === "failed") text = "Auto save failed";
	const width = this.width;
	this.contents.fontSize = AS_FONT;
	const pad = AS_FONT / 4.66;
	this.drawBackground(0, 0, width, this.height);
	if (!this._winText) this._winText = text;
	this.drawText(this._winText, pad * 2, 0, width, "left");
};
Window_Autosave.prototype.drawBackground = function(x, y, width, height) {
	this.contents.gradientFillRect(x, y, width / 2, height, AS_COLOR2, AS_COLOR1);
	this.contents.gradientFillRect(x + width / 2, y, width / 2, height, AS_COLOR1, AS_COLOR2);
};

//--- Scene_Map：创建提示窗 + updateSaveWindow ---
const _SVUI_Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
	_SVUI_Scene_Map_createAllWindows.call(this);
	this.createAutosaveWindow();
};
Scene_Map.prototype.createAutosaveWindow = function() {
	this._autosaveWindow = new Window_Autosave();
	this.addChild(this._autosaveWindow);  // 作为场景子级置于上层(toast)，update 由场景驱动
};
Scene_Map.prototype.updateSaveWindow = function() {
	if (AS_SHOW && this._autosaveWindow) this._autosaveWindow.open();
};

//--- Game_Map.autosave（MV 同步 saveGame → MZ 异步 Promise 适配） ---
Game_Map.prototype.autosave = function() {
	this._autosavedSuccess = true;  // 乐观：随后 updateSaveWindow 立即显示成功文本；失败再翻为 'failed'
	// 锁定时存到专属槽(默认 0 = MZ 内置自动存档槽)；否则尽量取当前槽。
	//   MV→MZ：MZ 移除了 DataManager.lastAccessedSavefileId，回退用 $gameSystem.savefileId()。
	let file = AS_SLOT;
	if (!AS_LOCKED) {
		if (typeof DataManager.lastAccessedSavefileId === "function") {
			file = DataManager.lastAccessedSavefileId();
		} else if ($gameSystem && $gameSystem.savefileId() > 0) {
			file = $gameSystem.savefileId();
		}
	}
	$gameSystem.onBeforeSave();
	const self = this;
	const result = DataManager.saveGame(file);
	if (result && typeof result.then === "function") {
		result.then(function() { self.onAutoSaveSuccess(file); })
		      .catch(function() { self.onAutoSaveFailure(file); });
	} else if (result) {
		self.onAutoSaveSuccess(file);
	} else {
		self.onAutoSaveFailure(file);
	}
};
Game_Map.prototype.onAutoSaveSuccess = function(file) {
	if (typeof StorageManager.cleanBackup === "function") StorageManager.cleanBackup(file);
	this._autosavedSuccess = true;
};
Game_Map.prototype.onAutoSaveFailure = function(file) {
	this._autosavedSuccess = "failed";
};

//--- SaveNow 插件指令(MV 风格；经项目已有的 command356→pluginCommand 桥接生效) ---
const _SVUI_Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	if (_SVUI_Game_Interpreter_pluginCommand) { _SVUI_Game_Interpreter_pluginCommand.call(this, command, args); }
	if (command === "SaveNow" && !$gameMap._justUploaded) {
		// 保留 TSR 中 SaveNow 的存档前清理(存在才调用，避免无该 API 时报错)
		if (window.QJ && QJ.MPMZ && typeof QJ.MPMZ.deleteProjectile === "function") {
			QJ.MPMZ.deleteProjectile("imoutoUtil");
		}
		$gameMap.autosave();
		this.refreshSaveWindow();
	}
};
Game_Interpreter.prototype.refreshSaveWindow = function() {
	if ($gameParty.inBattle()) return;
	if (SceneManager._scene instanceof Scene_Map) {
		SceneManager._scene.updateSaveWindow();
	}
};

//=============================================================================
// ** MV→MZ 存档转换（独立 API）
//    把旧版 .rpgsave(LZString 压缩 + MV-JsonEx 格式)转码为 MZ 的 .rmmzsave。
//    管线：LZString 解压 → MV-JsonEx.parse(处理 @a/@c/@r/@，套 MZ 类原型)
//          → MZ 原生 JsonEx.stringify → pako.deflate → 写 .rmmzsave + 重建 global。
//    仅本地模式(NW.js)。lz-string.js 按需加载(js/libs/lz-string.js)。
//=============================================================================
window.ShiroinSaveUI = window.ShiroinSaveUI || {};
const SaveConvert = {};

// --- 按需加载 lz-string.js（MZ 不自带；只有检测到 MV 存档才加载） ---
SaveConvert.ensureLZString = function() {
	return new Promise((resolve, reject) => {
		if (typeof LZString !== "undefined") { resolve(); return; }
		const script = document.createElement("script");
		script.src = "js/libs/lz-string.js";
		script.onload = () => resolve();
		script.onerror = () => reject(new Error("无法加载 js/libs/lz-string.js"));
		document.body.appendChild(script);
	});
};

// --- MV-JsonEx.parse（移植自 MV rpg_core.js：@=类名 / @c=对象id / @a=数组包装 / @r=循环引用） ---
SaveConvert.mvJsonParse = function(json) {
	const circular = [];
	const registry = {};
	const contents = SaveConvert._mvDecode(JSON.parse(json), circular, registry);
	SaveConvert._mvCleanMetadata(contents);
	for (const [key, value, id] of circular) { value[key] = registry[id]; }  // 还原循环引用
	return contents;
};
SaveConvert._mvDecode = function(value, circular, registry) {
	const type = Object.prototype.toString.call(value);
	if (type === "[object Object]" || type === "[object Array]") {
		registry[value["@c"]] = value;
		if (value["@"]) {
			const constructor = window[value["@"]];
			if (constructor) { Object.setPrototypeOf(value, constructor.prototype); }  // 套 MZ 类原型
		}
		for (const key in value) {
			if (Object.prototype.hasOwnProperty.call(value, key)) {
				if (value[key] && value[key]["@a"]) {        // 数组包装 → 还原成数组
					const body = value[key]["@a"];
					body["@c"] = value[key]["@c"];
					value[key] = body;
				}
				if (value[key] && value[key]["@r"]) {        // 循环引用 → 记录待还原
					circular.push([key, value, value[key]["@r"]]);
				}
				value[key] = SaveConvert._mvDecode(value[key], circular, registry);
			}
		}
	}
	return value;
};
SaveConvert._mvCleanMetadata = function(object) {
	if (!object) return;
	delete object["@"];
	delete object["@c"];
	if (typeof object === "object") {
		for (const v of Object.values(object)) {
			if (v && typeof v === "object") SaveConvert._mvCleanMetadata(v);
		}
	}
};

// --- 断开循环引用（MZ 的 JsonEx 已移除环处理，遇环会"Object too deep"） ---
//   DFS：把指向"当前路径上祖先"的回边置 null（这些多为运行时引用，如 Saikey bean._target，
//   读档时由对应插件自行重建）。非环的共享引用保留（MZ 会各自展开，不影响正确性）。
SaveConvert._breakCycles = function(root) {
	const GRAY = new Set();   // 当前递归路径上的对象
	const BLACK = new Set();  // 已完全处理(其下无环)
	const visit = function(obj) {
		GRAY.add(obj);
		for (const key of Object.keys(obj)) {
			const child = obj[key];
			if (child && typeof child === "object") {
				if (GRAY.has(child)) {
					obj[key] = null;              // 回边(成环) → 断开
				} else if (!BLACK.has(child)) {
					visit(child);
				}
			}
		}
		GRAY.delete(obj);
		BLACK.add(obj);
	};
	if (root && typeof root === "object") visit(root);
};

// --- 内容字段对齐（兼容 API，可被覆盖以追加自定义映射） ---
//   问题：MZ 端插件常在 Game_System/Party/... 的 initialize 里初始化自有字段(如 MOG_ActorHud 的
//   $gameSystem._actorHudData)；这些字段"新游戏时生成、随存档持久化"。MV 存档没有/命名不同 → 读档崩。
//   方案：对核心 $game* 对象，造一个 MZ 全新实例(含各插件新游戏初始化的字段)，再把 MV 存档数据覆盖上去：
//         MZ独有字段 → 保留默认(不再 undefined)；MV存档字段 → 保留游戏进度。
//   想对某插件做更精细的字段名映射，可覆盖本函数(先调用原函数再补)。
ShiroinSaveUI.alignContents = function(contents) {
	const classMap = {
		system: "Game_System", screen: "Game_Screen", timer: "Game_Timer",
		switches: "Game_Switches", variables: "Game_Variables", selfSwitches: "Game_SelfSwitches",
		actors: "Game_Actors", party: "Game_Party", map: "Game_Map", player: "Game_Player"
	};
	for (const key of Object.keys(classMap)) {
		const Ctor = window[classMap[key]];
		const src = contents[key];
		if (typeof Ctor !== "function" || !src || typeof src !== "object") continue;
		try {
			const fresh = new Ctor();          // 含各插件"新游戏"时初始化的字段
			Object.assign(fresh, src);          // MV 存档数据覆盖；MZ 独有字段保留默认
			contents[key] = fresh;
		} catch (e) {
			console.warn("[SaveConvert] 对齐 " + key + "(" + classMap[key] + ") 失败，保留原样:", e);
		}
	}
	return contents;
};

// --- 从存档内容构建 MZ savefileInfo（对齐函数，可被覆盖以自定义字段映射） ---
ShiroinSaveUI.buildSavefileInfoFromContents = function(contents) {
	const info = {};
	try { info.title = $dataSystem.gameTitle; } catch (e) { info.title = ""; }
	// playtimeText()/party.charactersForSavefile() 会读取当前运行时的全局对象。
	// 重建索引时只读取存档自身，不能临时载入存档或替换 $game*。
	const seconds = Math.max(0, Math.floor(Number(contents.system?._framesOnSave) / 60) || 0);
	info.playtime = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
		.map(n => String(n).padStart(2, "0")).join(":");
	const actors = contents.actors?._data || [];
	const members = (contents.party?._actors || []).slice(0, 4)
		.map(id => actors[id]).filter(actor => actor && !actor._hidden);
	info.characters = members.map(actor => [actor._characterName || "", actor._characterIndex || 0]);
	info.faces = members.map(actor => [actor._faceName || "", actor._faceIndex || 0]);
	info.timestamp = Date.now();
	info.svuiBack1 = contents.map?.chahuiMapTemp?.SaveSlotBackground || contents.map?._battleback1Name || "";
	info.svuiBack2 = "gray bar";
	info.svuiHour = contents.variables?._data?.[V_HOUR] || 0;
	info.svuiMin  = contents.variables?._data?.[V_MIN] || 0;
	info.svuiDay  = contents.variables?._data?.[V_DAY] || 0;
	info.svuiGold = contents.party?._gold || 0;
	info.svuiJob = $dataClasses[actors[1]?._classId]?.name || "";
	// 治疗次数：Iavra 把自变量存为 contents._iavra_selfVariables，_data 以 "map,event,key" 为键。
	//   直接读 _data（不依赖原型恢复），使从 MV 转换来的旧存档也能显示治疗次数标记。
	try {
		const sv = contents._iavra_selfVariables;
		let hv = (sv && sv._data) ? Number(sv._data[HEAL_MAP + "," + HEAL_EVENT + "," + HEAL_KEY]) : 0;
		if (!isFinite(hv) || hv < 0) hv = 0;
		if (hv > HEAL_MARK_MAX) hv = HEAL_MARK_MAX;
		info.svuiHeal = hv;
	} catch (e) { info.svuiHeal = 0; }
	return info;
};

// --- 启动补索引：标题画面出现前完成，正常槽位不读取本体，不做后台轮询。 ---
// MZ 原生实现丢弃写入 Promise；返回它才能等待写完、捕获失败。
// 桌面端后加载的 Shiroin_SaveWriteRetry 仍使用它自己的重试实现。
DataManager.saveGlobalInfo = function() {
	return StorageManager.saveObject("global", this._globalInfo);
};
const _SVUI_isGlobalInfoLoaded = DataManager.isGlobalInfoLoaded;
DataManager.isGlobalInfoLoaded = function() {
	return !this._svuiGlobalInfoLoading && _SVUI_isGlobalInfoLoaded.call(this);
};

DataManager.loadGlobalInfo = async function() {
	this._svuiGlobalInfoLoading = true;
	let repaired = 0;
	try {
		try {
			const globalInfo = await StorageManager.loadObject("global");
			this._globalInfo = Array.isArray(globalInfo) ? globalInfo : [];
		} catch (e) {
			this._globalInfo = [];
		}
		this.removeInvalidGlobalInfo();
		for (let id = 0; id < this.maxSavefiles(); id++) {
			try {
				if (this._globalInfo[id] || !this.savefileExists(id)) continue;
				const contents = await StorageManager.loadObject(this.makeSavename(id));
				// 能解压的 JSON 不一定是游戏存档（例如误命名的 config/global）。
				const keys = ["system", "screen", "timer", "switches", "variables", "selfSwitches",
					"actors", "party", "map", "player"];
				if (!contents || !keys.every(key => contents[key] && typeof contents[key] === "object" && !Array.isArray(contents[key])) ||
					!Array.isArray(contents.actors._data) || !Array.isArray(contents.party._actors) ||
					!Array.isArray(contents.variables._data)) {
					throw new Error("Invalid save contents");
				}
				const info = ShiroinSaveUI.buildSavefileInfoFromContents(contents);
				// 原保存时间未写在旧存档本体中。桌面端用文件修改时间估算；
				// 其他后端没有可靠时间时置 0，避免把恢复的旧档误认作刚保存的新档。
				info.timestamp = 0;
				if (StorageManager.isLocalMode()) {
					try { info.timestamp = require("fs").statSync(StorageManager.filePath(this.makeSavename(id))).mtimeMs; }
					catch (e) { /* 无修改时间也不影响读档。 */ }
				}
				this._globalInfo[id] = info;
				repaired++;
			} catch (e) {
				console.warn("[SaveUI] 存档索引重建失败，跳过槽位 " + id, e);
			}
		}
		if (repaired > 0) await this.saveGlobalInfo();
	} catch (e) {
		// 索引写入失败时保留内存里的修复结果，本次仍能读档，启动也不会卡死。
		console.warn("[SaveUI] 存档索引修复未能持久化", e);
	} finally {
		this._svuiGlobalInfoLoading = false;
	}
};

// --- 存储后端（双模式）：安卓走 AndroidSave，桌面走 fs；不支持时返回 null ---
//   统一接口：listMvFiles()列出 .rpgsave / readFile(名)读原文 / writeFile(名,数据)写 / exists(名)。
//   安卓:文件在 Documents/sister_save/，AndroidSave 纯 UTF-8 读写(无加密)。桌面:save/ 目录 fs。
SaveConvert.io = function() {
	if (window.AndroidSave) {
		return {
			mode: "android",
			listMvFiles: function() {
				try { var a = JSON.parse(AndroidSave.getAllSaves() || "[]"); return Array.isArray(a) ? a : []; }
				catch (e) { return []; }
			},
			readFile: function(filename) { var d = AndroidSave.loadSave(String(filename)); return d ? d : null; },
			writeFile: function(filename, data) { AndroidSave.saveGame(String(filename), data); },
			exists: function(filename) { return !!AndroidSave.SaveExists(String(filename)); }
		};
	}
	if (StorageManager.isLocalMode && StorageManager.isLocalMode()) {
		var fs = require("fs");
		var dir = StorageManager.fileDirectoryPath();
		return {
			mode: "local",
			listMvFiles: function() {
				try { return fs.readdirSync(dir).filter(function(f){ return /\.rpgsave$/i.test(f); }); }
				catch (e) { return []; }
			},
			readFile: function(filename) {
				try { var p = dir + filename; return fs.existsSync(p) ? fs.readFileSync(p, { encoding: "utf8" }) : null; }
				catch (e) { return null; }
			},
			writeFile: function(filename, data) { StorageManager.fsWriteFile(dir + filename, data); },
			exists: function(filename) { try { return fs.existsSync(dir + filename); } catch (e) { return false; } }
		};
	}
	return null;
};

// --- 转换单个槽：.rpgsave → .rmmzsave，返回该槽 savefileInfo（失败抛错） ---
// 从内存里的 MV 存档原文（.rpgsave 的 LZString base64）直接转换成对齐的 MZ .rmmzsave。
//   convertFile 从磁盘读出 .rpgsave 后即调用本函数；云存档下载也复用它（无需落地临时 .rpgsave）。
SaveConvert.convertFromRpgsave = function(savefileId, b64, io) {
	io = io || SaveConvert.io();
	if (!io || !b64) return null;
	const mvJson = LZString.decompressFromBase64(b64);
	if (!mvJson) throw new Error("LZString 解压失败");
	const contents = SaveConvert.mvJsonParse(mvJson);          // MV格式 → 对象树(MZ类原型)
	ShiroinSaveUI.alignContents(contents);                     // 字段对齐(补 MZ 端插件新游戏初始化的字段)
	// 标记:首次读档时强制重载当前地图，使事件按【当前 $dataMap】重建(避免旧地图快照导致 start() 等异常)
	if (contents.system && typeof contents.system === "object") { contents.system._svuiFromMvConvert = true; }
	// 在"对齐后、断环/序列化前"构建列表元数据（断环/序列化会改动对象，必须在它们之前取）
	const info = ShiroinSaveUI.buildSavefileInfoFromContents(contents);
	SaveConvert._breakCycles(contents);                        // 断环(MZ JsonEx 不支持循环引用)
	const _prevMaxDepth = JsonEx.maxDepth;
	JsonEx.maxDepth = 1000;                                    // MV 数据可能比 MZ 默认100更深
	let mzJson;
	try { mzJson = JsonEx.stringify(contents); }               // → MZ JsonEx 格式
	finally { JsonEx.maxDepth = _prevMaxDepth; }
	const zip = pako.deflate(mzJson, { to: "string", level: 1 });
	io.writeFile("file" + savefileId + ".rmmzsave", zip);
	return info;
};

SaveConvert.convertFile = function(savefileId, io) {
	io = io || SaveConvert.io();
	if (!io) return null;
	const b64 = io.readFile("file" + savefileId + ".rpgsave");
	if (!b64) return null;
	return SaveConvert.convertFromRpgsave(savefileId, b64, io);
};

// --- 读/写 global（合并保留已有 MZ 槽） ---
SaveConvert.readGlobalInfo = function(io) {
	io = io || SaveConvert.io();
	try {
		if (!io) return [];
		const zip = io.readFile("global.rmmzsave");
		if (!zip) return [];
		const arr = JsonEx.parse(pako.inflate(zip, { to: "string" }));
		return Array.isArray(arr) ? arr : [];
	} catch (e) { return []; }
};
SaveConvert.writeGlobalInfo = function(globalInfo, io) {
	io = io || SaveConvert.io();
	if (!io) return;
	const zip = pako.deflate(JsonEx.stringify(globalInfo), { to: "string", level: 1 });
	io.writeFile("global.rmmzsave", zip);
};

// --- 待转换的 MV 存档槽号列表（有 .rpgsave 且无同号 .rmmzsave）。单一来源，避免重复逻辑。 ---
ShiroinSaveUI.pendingMvSaveIds = function() {
	const io = SaveConvert.io();
	if (!io) return [];
	const ids = [];
	io.listMvFiles().forEach(function(fname) {
		const m = /^file(\d+)\.rpgsave$/i.exec(fname);
		if (m && !io.exists("file" + Number(m[1]) + ".rmmzsave")) { ids.push(Number(m[1])); }
	});
	return ids;
};
// --- 是否存在待转换的 MV 存档 ---
ShiroinSaveUI.hasMvSavesToConvert = function() {
	return ShiroinSaveUI.pendingMvSaveIds().length > 0;
};
// --- 待转换的 MV 存档数量（用于转换提示文案）---
ShiroinSaveUI.countMvSavesToConvert = function() {
	return ShiroinSaveUI.pendingMvSaveIds().length;
};

// --- 主 API：扫描并转换所有待转换 MV 存档（同步；执行期间主线程阻塞=输入锁定） ---
//   桌面用 fs(save/)，安卓用 AndroidSave(Documents/sister_save/)，自动选后端。
//   options.force=true 时连"已有同号 .rmmzsave"的槽也重新转换覆盖（用于改了对齐规则后重转）。
ShiroinSaveUI.convertMvSaves = function(options) {
	options = options || {};
	const result = { converted: [], skipped: [] };
	const io = SaveConvert.io();
	if (!io) { result.reason = "无可用存储后端(非本地模式且无 AndroidSave)"; return result; }
	if (typeof LZString === "undefined") { result.reason = "LZString 未加载"; return result; }
	const globalInfo = SaveConvert.readGlobalInfo(io);
	for (const fname of io.listMvFiles()) {
		const m = /^file(\d+)\.rpgsave$/i.exec(fname);
		if (!m) continue;
		const id = Number(m[1]);
		if (!options.force && io.exists("file" + id + ".rmmzsave")) { result.skipped.push(id); continue; }  // 已有 MZ 存档不覆盖
		try {
			const info = SaveConvert.convertFile(id, io);
			if (info) { globalInfo[id] = info; result.converted.push(id); }
		} catch (e) {
			console.error("[SaveConvert] 槽 " + id + " 转换失败:", e);
			result.skipped.push(id);
		}
	}
	if (result.converted.length > 0) {
		SaveConvert.writeGlobalInfo(globalInfo, io);
		DataManager._globalInfo = globalInfo;  // 同步更新内存，标题/读档列表立即反映
	}
	result.converted.sort((a, b) => a - b);
	result.backend = io.mode;
	return result;
};

// 也暴露单文件转换工具
ShiroinSaveUI.convertMvSaveFile = function(savefileId) { return SaveConvert.convertFile(savefileId); };

// 供云存档等外部插件确保 LZString 已加载（按需注入，返回 Promise）。
//   MZ 的 .rmmzsave 是 pako 二进制串，上传/下载需用 LZString 做无损 base64 往返
//   （compressString 的 btoa 兜底会损坏二进制）。
ShiroinSaveUI.ensureLZString = function() { return SaveConvert.ensureLZString(); };

// --- 供云存档等外部插件调用：把一批"内存里的 MV 存档原文(.rpgsave base64)"直接转换为
//     对齐的 MZ .rmmzsave，并重建 globalInfo。savesMap = { 槽号: rpgsaveB64, ... }。 ---
//   用途：2den1580 云存档下载回来的是 MV 原文，过去被错误地原样写成 .rmmzsave → 无法加载。
//   现在改为下载后调用本函数，复用与本地转换完全一致的对齐流程，确保下载即可读。
ShiroinSaveUI.importMvSavesFromCloud = async function(savesMap) {
	const result = { converted: [], failed: [], conflicted: [] };
	const io = SaveConvert.io();
	if (!io) { result.reason = "无可用存储后端"; return result; }
	// LZString 是按需注入的（标题界面本地转换走 maybeConvertOnTitle 里的 ensureLZString）。
	//   云下载直接调本函数时 LZString 可能还没加载，这里先确保它就绪，否则解压 MV 原文失败。
	try { await SaveConvert.ensureLZString(); } catch (e) {}
	if (typeof LZString === "undefined") { result.reason = "LZString 加载失败"; return result; }
	const globalInfo = SaveConvert.readGlobalInfo(io);
	for (const key in savesMap) {
		const id = Number(key);
		if (!(id > 0)) continue;                 // 只处理游戏存档槽（config/global 不走此流程）
		// 冲突保护：已存在同号 MZ 存档（本地原有，或本次下载刚写入的 MZ 存档）→ 拒绝用 MV 存档覆盖，
		//   记入 conflicted 由调用方提示玩家"先删掉对应 MZ 存档再转换"。
		if (io.exists("file" + id + ".rmmzsave")) { result.conflicted.push(id); continue; }
		try {
			const info = SaveConvert.convertFromRpgsave(id, savesMap[key], io);
			if (info) { globalInfo[id] = info; result.converted.push(id); }
			else { result.failed.push(id); }
		} catch (e) {
			console.error("[CloudImport] 槽 " + id + " 转换失败:", e && e.message, e);
			result.failed.push(id);
		}
	}
	if (result.converted.length > 0) {
		SaveConvert.writeGlobalInfo(globalInfo, io);
		DataManager._globalInfo = globalInfo;    // 同步内存，标题/读档列表立即反映
	}
	result.converted.sort((a, b) => a - b);
	result.conflicted.sort((a, b) => a - b);
	result.backend = io.mode;
	return result;
};

// --- 启动流程：在标题界面检测 → confirm 询问 → 转换（每次会话只问一次） ---
ShiroinSaveUI.convertConfirmText = function() {
	const num = ShiroinSaveUI.countMvSavesToConvert();
	let text = window?.systemFeatureText?.mvSaveToMzConvertConfirmText?.join?.('\n');
    const match = String(text).match(/\$\{([^}]*)\}/);
    if (match && num) text = String(text).replace(/\$\{[^}]*\}/g, num);
	return text;
};
ShiroinSaveUI.convertDoneText = function(result) {
	if (result.converted.length === 0) {
		let text = window?.systemFeatureText?.mvSaveToMzFailed;
		return text;
	}
	const num = result.converted.length;
	let text = window?.systemFeatureText?.mvSaveToMzSuccess?.join?.('\n');
    const match = String(text).match(/\$\{([^}]*)\}/);
    if (match && num) text = String(text).replace(/\$\{[^}]*\}/g, num);	
	const list = result.converted.join("、");
	text += '\n' + list;
	return text;
};

ShiroinSaveUI.maybeConvertOnTitle = async function(scene) {
    if (ShiroinSaveUI._mvConvertChecked) return;

    ShiroinSaveUI._mvConvertChecked = true;

    if (!ShiroinSaveUI.hasMvSavesToConvert()) return;

    try {
        await SaveConvert.ensureLZString();

        const confirmed = await ShiroinSaveUI.confirmConvertWithTips();

        if (!confirmed) return;

        // 同步执行，期间会阻塞输入
        const result = ShiroinSaveUI.convertMvSaves();

        if (result.converted.length > 0 && scene && scene._commandWindow) {
            // 刷新“继续游戏”可用状态
            scene._commandWindow.refresh();
        }

        if (typeof window.alert === "function") {
            await window.alert(ShiroinSaveUI.convertDoneText(result), {
                align: "left"
            });
        }
    } catch (e) {
        console.error("[SaveConvert] 启动转换流程出错:", e);
    }
};

ShiroinSaveUI.confirmConvertWithTips = async function() {
    const ACTION_TIPS = "__tips__";

    while (true) {
        const result = await window.confirm(
            ShiroinSaveUI.convertConfirmText(),
            {
                align: "left",
                extraButton: {
                    text: "Tips",
                    onClick: ctx => {
                        // 不要在这里直接进入转换流程
                        // 这里只负责关闭 confirm，并返回一个特殊值
                        ctx.close(ACTION_TIPS);
                    }
                }
            }
        );

        if (result === ACTION_TIPS) {
			const text = window?.systemFeatureText?.mvSaveToMzConvertTipsText?.join?.('\n');
            await window.alert(text, {
                align: "left"
            });

            // 看完教程后重新显示 confirm
            continue;
        }

        // OK: true
        // Cancel: false / null / undefined
        return !!result;
    }
};

const _SVUI_Scene_Title_start = Scene_Title.prototype.start;
Scene_Title.prototype.start = function() {
	_SVUI_Scene_Title_start.call(this);
	ShiroinSaveUI.maybeConvertOnTitle(this);
};

//=============================================================================
// ** 旧存档地图兼容：转换存档首次读档时，强制重载当前地图
//    转换存档是旧版地图快照(事件页索引/内容可能与当前 $dataMap 不一致)，会让 event.start() 等
//    跑到陈旧状态。这里在首次读档时重载当前地图 → setupEvents 按当前 $dataMap 重建全部事件
//    (正确页索引、自动剔除已删事件)，从根上对齐。重建一次后清除标记，之后存为普通 MZ 存档。
//=============================================================================
// MV 版地图21的事件2会在第二页刚开始时自动存档。此时画面尚未淡入，续接流程则
// 保存在事件2的 _commonEventQJ 中；转换档首次强制重载地图会重建 Game_Event，令这条
// 解释器记录丢失。这里仅识别这种一次性的旧式晨间存档，并借地图初始化事件5现有的
// $gameStrings[20] 续接入口，在初始化完成后重新启动事件2第二页。
ShiroinSaveUI.isLegacyMap21MorningAutosave = function() {
	if (!$gameMap || $gameMap.mapId() !== 21) return false;

	const event2 = $gameMap.event(2);
	const queue = event2 && Array.isArray(event2._commonEventQJ)
		? event2._commonEventQJ
		: [];
	// Game_InterpreterCEQJ.pageIndex 从0开始；1就是事件2的第二页。
	// 这是保存点的直接证据，不应受亮度限制：MV 旧档在该处自动存档时，
	// $gameScreen._brightness 也可能已是 255，但晨间 CEQJ 仍停在自动存档指令后。
	const hasSavedPage2 = queue.some(function(interpreter) {
		return interpreter && Number(interpreter.pageIndex) === 1;
	});
	if (hasSavedPage2) return true;

	// 某些更老的转换档已没有可识别的 CEQJ 记录，才使用黑屏、
	// 早晨时间与无目标事件这组间接状态兜底，避免误判普通地图21存档。
	const brightness = $gameScreen && typeof $gameScreen.brightness === "function"
		? Number($gameScreen.brightness())
		: Number($gameScreen && $gameScreen._brightness);
	if (!Number.isFinite(brightness) || brightness > 0) return false;

	const hour = $gameSystem && typeof $gameSystem.hour === "function"
		? Number($gameSystem.hour())
		: NaN;
	const targetEventId = Number($gameVariables.value(13) || 0);
	return targetEventId === 0 && Number.isFinite(hour) && hour > 0 && hour < 10;
};

ShiroinSaveUI.prepareLegacyMap21MorningResume = function() {
	// 强制让场景初始化事件5重新执行；从 Scene_Load 直接进图不会触发
	// Scene_Map.terminate，因此 <resetSelfSwitch> 在这个场景下不会自动清掉 A。
	$gameSelfSwitches.setValue([21, 5, "A"], false);
	$gameVariables.setValue(13, 0);
	$gameStrings.setValue(
		20,
		"$gameMap.event(2)?.steupCEQJ(2, { hasAutoSaved: true });"
	);
	console.info("[ShiroinSaveUI] 已安排恢复地图21的旧版晨间自动存档流程。");
};

const _SVUI_Scene_Load_reloadMapIfUpdated = Scene_Load.prototype.reloadMapIfUpdated;
Scene_Load.prototype.reloadMapIfUpdated = function() {

	const mapId = $gameMap.mapId();

	if ($gameSystem && $gameSystem._svuiFromMvConvert) {
		if (ShiroinSaveUI.isLegacyMap21MorningAutosave()) {
			ShiroinSaveUI.prepareLegacyMap21MorningResume();
		}
		$gameSystem._svuiFromMvConvert = false;   // 只在本次读档重建一次
		$gamePlayer.reserveTransfer(mapId, $gamePlayer.x, $gamePlayer.y, $gamePlayer.direction(), 0);
		$gamePlayer.requestMapReload();
		return;
	}

	// 玄关场景的修复
	if (mapId === 24) {
		const eid = 3;
		$gameVariables.setValue(13, eid);
	}
	if ([4, 7, 11, 18, 21, 24, 44, 52].includes(mapId)) {
		const imouto = $gameActors.actor(2);
		if ( imouto.isStateAffected(28) )  $gameVariables.setValue(13, 24);
		if ( imouto.isStateAffected(29) )  $gameVariables.setValue(13, 10);
		if ( imouto.isStateAffected(30) )  $gameVariables.setValue(13, 1);
		if ( imouto.isStateAffected(32) )  $gameVariables.setValue(13, 1);
	}

	if (mapId === 21 && [6,7,8].includes($gameSystem.hour())) {
		setTimeout( () => {
			$gameVariables.setValue(13, 2);
			$gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y);
			$gamePlayer.requestMapReload();
		}, 2500);
		return;			
	}
	
	if ($gameSystem.versionId() !== $dataSystem.versionId) {
		$gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y);
		$gamePlayer.requestMapReload();
		$gameMap.steupCEQJ(21, 1);
	}

	_SVUI_Scene_Load_reloadMapIfUpdated.call(this);   // 其余仍走 MZ 默认(版本号比对)
};


//=============================================================================
// ** ☆旧存档校验
//
//			说明：	> 此模块提供 旧存档校验 的功能。
//					（插件完整的功能目录去看看：功能结构树）
//=============================================================================
//==============================
// * 旧存档校验 - 参数
//==============================
DrillUp.g_GSM_isOldSave = false;
//==============================
// * 旧存档校验 - 初始化（新游戏时）
//==============================
var _drill_GSM_createGameObjects2 = DataManager.createGameObjects;
DataManager.createGameObjects = function() {
	_drill_GSM_createGameObjects2.call( this );
	DrillUp.g_GSM_isOldSave = false;		//（刷新标记）
}
//==============================
// * 旧存档校验 - 保存存档时 - 数据获取
//==============================
var _drill_GSM_makeSaveContents2 = DataManager.makeSaveContents;
DataManager.makeSaveContents = function() {
    var contents = _drill_GSM_makeSaveContents2.call(this);
	contents._drill_GSM_versionId = $dataSystem.versionId;
    return contents;
};
//==============================
// * 旧存档校验 - 载入存档时 - 数据赋值
//==============================
var _drill_GSM_extractSaveContents2 = DataManager.extractSaveContents;
DataManager.extractSaveContents = function( contents ){
	_drill_GSM_extractSaveContents2.call( this, contents );
	// > 比较存档
	if( contents._drill_GSM_versionId == undefined ){
		DrillUp.g_GSM_isOldSave = true;
	}else{
		if( contents._drill_GSM_versionId == $dataSystem.versionId ){
			DrillUp.g_GSM_isOldSave = false;
		}else{
			DrillUp.g_GSM_isOldSave = true;
		}
	}
};


})();
