//=============================================================================
// Drill_HtmlLoadingTip.js  (RPG Maker MZ 移植版)
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [v1.1-MZ]        游戏窗体 - 资源“加载中”提示图
 * @author Drill_up （MZ移植：保持MV原功能一致）
 *
 *
 * @help
 * =============================================================================
 * +++ Drill_HtmlLoadingTip +++
 * 作者：Drill_up
 * （本文件为 MV 原版的 MZ 移植，功能、参数、视觉效果与 MV 版一致）
 * 原插件：https://rpg.blue/thread-409713-1-1.html
 * =============================================================================
 * 使得你可以对系统层面显示的“加载中”贴图进行控制。
 *
 * -----------------------------------------------------------------------------
 * ----插件扩展
 * 该插件可以单独使用。
 *
 * -----------------------------------------------------------------------------
 * ----设定注意事项
 * 1.插件的作用域：战斗界面、地图界面、菜单界面。
 *   作用于底层贴图功能。
 * 细节：
 *   (1.“加载中”贴图是底层图片，固定为资源 "img/system/Loading.png"。
 *      （MV 中为 /system/Loading.png，MZ 中同样放在 img/system/ 下。）
 *   (2.此资源图片不能被加密，注意不要让其强制被加密。
 *   (3.由于资源唯一，所以只能将多帧gif绘制在同一张图片上（纵向排列）。
 * 设计：
 *   (1.该插件可以将"加载中"提示换掉，
 *      如果你只想要单张图片，可以设置GIF为1帧 或者 直接关闭此插件。
 *   (2.若 img/system/Loading.png 不存在，则自动回退为 MZ 默认的加载转圈。
 *
 * -----------------------------------------------------------------------------
 * ----关于 MZ 移植
 * MV 使用 _upperCanvas + _paintUpperCanvas 在加载时逐帧绘制提示图；
 * MZ 改用了 _loadingSpinner（HTML元素 + CSS动画），不再有上述机制。
 * 本移植版通过新建一个与游戏画布同步缩放的覆盖画布，并用
 * requestAnimationFrame 自驱动逐帧绘制，完整还原 MV 的延迟、淡入与GIF动画。
 *
 * -----------------------------------------------------------------------------
 * ----更新日志
 * [v1.0]
 * 完成插件ヽ(*。>Д<)o゜
 * [v1.1]
 * 修改了插件分类。
 * [v1.1-MZ]
 * 移植到 RPG Maker MZ，保持原功能一致。
 *
 *
 * @param ---常规---
 * @desc
 *
 * @param 最小载入超时时间
 * @parent ---常规---
 * @type number
 * @min 1
 * @desc 当资源文件开始读取后，等待超过N帧后，"加载中"贴图会显示。默认20帧。
 * @default 20
 *
 * @param 贴图显现时长
 * @parent ---常规---
 * @type number
 * @min 1
 * @desc "加载中"贴图显现的时长。
 * @default 20
 *
 * @param ---GIF效果---
 * @desc
 *
 * @param 切割帧数
 * @parent ---GIF效果---
 * @type number
 * @min 1
 * @desc "加载中"贴图(img/system/Loading.png)会被纵向横切成N等分，然后作为GIF循环播放。
 * @default 1
 *
 * @param 帧间隔
 * @parent ---GIF效果---
 * @type number
 * @min 1
 * @desc gif每帧播放间隔时间，单位帧。（1秒60帧）
 * @default 4
 *
 *
 */

//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
//		插件简称		HLT（Html_Loading_Tip）
//		临时全局变量	无
//		临时局部变量	Graphics._drill_HLT_xxx
//		存储数据变量	无
//		全局存储变量	无
//		覆盖重写方法	（MZ）新增独立覆盖画布，hook startLoading / endLoading
//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

//=============================================================================
// ** ☆提示信息
//=============================================================================
	var DrillUp = DrillUp || {};
	DrillUp.g_HLT_PluginTip_curName = "Drill_HtmlLoadingTip.js 游戏窗体-资源“加载中”提示图";
	DrillUp.g_HLT_PluginTip_baseList = [];


//=============================================================================
// ** ☆变量获取
//=============================================================================
	var Imported = Imported || {};
	Imported.Drill_HtmlLoadingTip = true;
	DrillUp.parameters = PluginManager.parameters('Drill_HtmlLoadingTip');

	/*-----------------杂项------------------*/
	DrillUp.g_HLT_delay       = Number(DrillUp.parameters["最小载入超时时间"] || 20);
	DrillUp.g_HLT_showingTime = Number(DrillUp.parameters["贴图显现时长"]   || 20);
	DrillUp.g_HLT_gifFrame    = Number(DrillUp.parameters["切割帧数"]       || 1);
	DrillUp.g_HLT_gifInterval = Number(DrillUp.parameters["帧间隔"]         || 4);

	/*-----------------测试开关（硬编码，仅用于调试）------------------*/
	// ★ 设为 true：打开游戏时无条件显示加载画面，持续 DRILL_HLT_TEST_DURATION 毫秒。
	//    测试完务必改回 false！
	var DRILL_HLT_TEST_MODE     = true;		// 测试开关
	var DRILL_HLT_TEST_DURATION = 5000;		// 强制显示时长（毫秒），默认5秒


//=============================================================================
// ** ☆资源 - 加载图
//=============================================================================
//==============================
// * 资源 - 异步载入 img/system/Loading.png
//==============================
Graphics._drill_HLT_loadingImage = null;
Graphics._drill_HLT_imageReady = false;
Graphics._drill_HLT_loadImage = function() {
	if( this._drill_HLT_loadingImage ){ return; }
	var img = new Image();
	img.onload = function(){ Graphics._drill_HLT_imageReady = true; };
	img.onerror = function(){ Graphics._drill_HLT_imageReady = false; };
	img.src = "img/system/Loading.png";		//（固定资源，不可加密）
	this._drill_HLT_loadingImage = img;
};


//=============================================================================
// ** ☆视图 - 覆盖画布（替代 MV 的 _upperCanvas）
//=============================================================================
//==============================
// * 视图 - 创建覆盖画布
//==============================
Graphics._drill_HLT_createCanvas = function() {
	if( this._drill_HLT_canvas ){ return; }
	var c = document.createElement("canvas");
	c.id = "drill_HLT_canvas";
	this._drill_HLT_canvas = c;
};
//==============================
// * 视图 - 同步画布尺寸与缩放（与 gameCanvas 一致）
//==============================
Graphics._drill_HLT_layoutCanvas = function() {
	var c = this._drill_HLT_canvas;
	if( !c ){ return; }
	c.width  = this._width;
	c.height = this._height;
	c.style.zIndex = 3;					//（高于 gameCanvas 的 zIndex:1）
	this._centerElement( c );			//（沿用 MZ 的居中缩放逻辑）
};


//=============================================================================
// ** ☆视图 - 初始化（hook Graphics.initialize）
//=============================================================================
var _drill_HLT_Graphics_initialize = Graphics.initialize;
Graphics.initialize = function(){
	var result = _drill_HLT_Graphics_initialize.apply( this, arguments );
	this._drill_HLT_curFrame = 0;			//当前帧
	this._drill_HLT_loadingCount = 0;		//载入计数
	this._drill_HLT_running = false;		//循环开关
	this._drill_HLT_rafId = null;
	this._drill_HLT_createCanvas();
	this._drill_HLT_loadImage();
	return result;							//★ MZ 要求返回布尔值，必须透传（否则报 Failed to initialize graphics）
};


//=============================================================================
// ** ☆视图 - 开始读取（hook Graphics.startLoading）
//=============================================================================
var _drill_HLT_Graphics_startLoading = Graphics.startLoading;
Graphics.startLoading = function(){
	_drill_HLT_Graphics_startLoading.call( this );
	// > 测试模式期间由测试驱动接管，忽略引擎触发的载入事件
	if( this._drill_HLT_testActive ){ return; }
	// > 计数置零
	this._drill_HLT_curFrame = 0;
	this._drill_HLT_loadingCount = 0;
	// > 挂载覆盖画布
	if( this._drill_HLT_canvas && !document.getElementById("drill_HLT_canvas") ){
		this._drill_HLT_layoutCanvas();
		document.body.appendChild( this._drill_HLT_canvas );
	}
	// > 启动逐帧循环
	this._drill_HLT_startLoop();
};


//=============================================================================
// ** ☆视图 - 结束读取（hook Graphics.endLoading）
//=============================================================================
var _drill_HLT_Graphics_endLoading = Graphics.endLoading;
Graphics.endLoading = function(){
	var ret = _drill_HLT_Graphics_endLoading.call( this );	//★ 透传返回值（boolean）
	// > 测试模式期间不移除覆盖层（由定时器统一收尾）
	if( this._drill_HLT_testActive ){ return ret; }
	this._drill_HLT_stopLoop();
	if( this._drill_HLT_canvas && document.getElementById("drill_HLT_canvas") ){
		document.body.removeChild( this._drill_HLT_canvas );
	}
	// > 恢复默认 spinner 显示（下次若没有自定义图则可正常回退）
	if( this._loadingSpinner ){ this._loadingSpinner.style.display = ""; }
	return ret;
};


//=============================================================================
// ** ☆视图 - 逐帧循环（替代 MV 的逐帧 updateLoading）
//=============================================================================
//==============================
// * 循环 - 开始
//==============================
Graphics._drill_HLT_startLoop = function(){
	if( this._drill_HLT_running ){ return; }
	this._drill_HLT_running = true;
	var self = this;
	var tick = function(){
		if( !self._drill_HLT_running ){ return; }
		self._drill_HLT_updateFrame();
		self._drill_HLT_rafId = requestAnimationFrame( tick );
	};
	this._drill_HLT_rafId = requestAnimationFrame( tick );
};
//==============================
// * 循环 - 停止
//==============================
Graphics._drill_HLT_stopLoop = function(){
	this._drill_HLT_running = false;
	if( this._drill_HLT_rafId ){
		cancelAnimationFrame( this._drill_HLT_rafId );
		this._drill_HLT_rafId = null;
	}
};
//==============================
// * 循环 - 每帧（计数自增 + 绘制，对应 MV 的 updateLoading）
//==============================
Graphics._drill_HLT_updateFrame = function(){
	this._drill_HLT_loadingCount++;
	this._drill_HLT_paint();
};


//=============================================================================
// ** ☆视图 - 帧刷新图像（对应 MV 的 _paintUpperCanvas，绘制数学完全一致）
//=============================================================================
Graphics._drill_HLT_paint = function(){
	var c = this._drill_HLT_canvas;
	if( !c ){ return; }
	// > 内部分辨率变化时（如分辨率确定）重置画布缓冲尺寸
	if( this._width > 0 && ( c.width !== this._width || c.height !== this._height ) ){
		c.width  = this._width;
		c.height = this._height;
		c.style.zIndex = 3;
	}
	// > 每帧同步缩放与居中，跟随窗口拉伸自适应（_centerElement 只改样式，开销极小）
	this._centerElement( c );
	var context = c.getContext('2d');
	context.clearRect( 0, 0, c.width, c.height );		//（对应 _clearUpperCanvas）

	if( this._drill_HLT_imageReady && this._drill_HLT_loadingImage &&
		this._drill_HLT_loadingCount >= DrillUp.g_HLT_delay ){

		var img = this._drill_HLT_loadingImage;
		var ww = img.width;
		var hh = img.height;

		var sw = ww;									//（剪切的矩形）
		var sh = Math.floor( hh / DrillUp.g_HLT_gifFrame );
		var sx = 0;
		var sy = sh * this._drill_HLT_curFrame;
		var pw = ww;									//（放置的矩形）
		var ph = sh;
		var px = ( c.width  - ww ) / 2;
		var py = ( c.height - sh ) / 2;
		var alpha = ( ( this._drill_HLT_loadingCount - DrillUp.g_HLT_delay ) / DrillUp.g_HLT_showingTime ).clamp(0, 1);

		context.save();
		context.globalAlpha = alpha;
		context.drawImage( img, sx, sy, sw, sh, px, py, pw, ph );
		context.restore();

		// > 有自定义图时，隐藏 MZ 默认的加载转圈
		if( this._loadingSpinner ){ this._loadingSpinner.style.display = "none"; }

		// > 当前帧+1
		if( ( this._drill_HLT_loadingCount - DrillUp.g_HLT_delay ) % DrillUp.g_HLT_gifInterval == 0 ){
			this._drill_HLT_curFrame += 1;
			this._drill_HLT_curFrame %= DrillUp.g_HLT_gifFrame;
		}
	}
};


//=============================================================================
// ** ☆测试 - 强制显示加载画面（硬编码开关，调试用）
//=============================================================================
//==============================
// * 测试 - 启动强制加载画面
//==============================
Graphics._drill_HLT_startTest = function(){
	this._drill_HLT_testActive = false;
	this._drill_HLT_curFrame = 0;
	this._drill_HLT_loadingCount = 0;
	// > 挂载覆盖画布
	if( this._drill_HLT_canvas && !document.getElementById("drill_HLT_canvas") ){
		this._drill_HLT_layoutCanvas();
		document.body.appendChild( this._drill_HLT_canvas );
	}
	// > 启动逐帧循环
	this._drill_HLT_startLoop();
	// > 到时收尾
	var self = this;
	setTimeout(function(){
		self._drill_HLT_testActive = false;
		self._drill_HLT_stopLoop();
		if( self._drill_HLT_canvas && document.getElementById("drill_HLT_canvas") ){
			document.body.removeChild( self._drill_HLT_canvas );
		}
		if( self._loadingSpinner ){ self._loadingSpinner.style.display = ""; }
	}, DRILL_HLT_TEST_DURATION );
};
//==============================
// * 测试 - 打开游戏时无条件触发
//==============================
if( DRILL_HLT_TEST_MODE ){
	var _drill_HLT_Scene_Boot_start = Scene_Boot.prototype.start;
	Scene_Boot.prototype.start = function(){
		_drill_HLT_Scene_Boot_start.call( this );
		Graphics._drill_HLT_startTest();
	};
}
