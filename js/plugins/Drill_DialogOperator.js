//=============================================================================
// Drill_DialogOperator.js
//=============================================================================

/*:
 * @plugindesc [v1.3]        对话框 - 对话框变形器
 * @author Drill_up
 * 
 * @Drill_LE_param "变形样式-%d"
 * @Drill_LE_parentKey ""
 * @Drill_LE_var "DrillUp.g_DOp_list_length"
 * 
 * 
 * @help
 * =============================================================================
 * +++ Drill_DialogOperator +++
 * 作者：Drill_up
 * 如果你有兴趣，也可以来看看更多我写的drill插件哦ヽ(*。>Д<)o゜
 * https://rpg.blue/thread-409713-1-1.html
 * =============================================================================
 * 使得你可以控制对话框的位置，高度，宽度。
 * 
 * -----------------------------------------------------------------------------
 * ----插件扩展
 * 该插件 不能 单独使用。
 * 必须基于核心插件才能运行。
 * 基于：
 *   - Drill_CoreOfWindowAuxiliary   系统-窗口辅助核心★★v1.9及以上★★
 *     必须基于该插件才能对文本长度自适应。
 * 可被扩展：
 *   - Drill_CoreOfWindowCharacter   窗口字符-窗口字符核心
 *     你可以使用插件指令，使得对话框中的文本自动换行，支持窗口字符的换行。
 * 
 * -----------------------------------------------------------------------------
 * ----设定注意事项
 * 1.插件的作用域：战斗界面、地图界面。
 *   作用于对话框和其子窗口。
 * 2.详细内容和图解，去看看 "15.对话框 > 关于对话框变形器.docx"。
 * 细节：
 *   (1."对话框是否可出界"，表示如果对话框矩形超出了游戏窗口边界，
 *      则会根据情况被拉回到靠边角的位置。
 *      如果对话框的宽度高度比游戏窗口还大，则会被拉到0的位置。
 * 设计：
 *   (1.你可以将对话框形状设为 自由的小对话框，通过改变坐标，将
 *      小对话框放置在事件附近的位置，来表示此对话是事件NPC说的。
 *
 * -----------------------------------------------------------------------------
 * ----可选设定 - 常用参数
 * 你可以通过插件指令手动控制边框的属性：
 * 
 * 插件指令：>对话框变形器 : 设置对话框行数 : 10
 * 插件指令：>对话框变形器 : 还原默认对话框行数
 * 插件指令：>对话框变形器 : 开启自动换行
 * 插件指令：>对话框变形器 : 关闭自动换行
 * 
 * 1.注意，当前形状的 高度模式 必须为"使用自定义行数的高度"的设置时，
 *   修改行数才能有效。详细去看看 "15.对话框 > 关于对话框变形器.docx"。
 * 
 * 以下是旧版本的指令，也可以用：
 * 插件指令(旧)：>消息核心 : 设置对话框行数 : 10
 * 插件指令(旧)：>消息核心 : 还原默认对话框行数
 * 
 * -----------------------------------------------------------------------------
 * ----可选设定 - 样式修改
 * 你可以通过插件指令手动控制边框的属性：
 * 
 * 插件指令：>对话框变形器 : 切换形状 : 变形样式[1]
 * 插件指令：>对话框变形器 : 还原默认形状样式
 * 
 * 1.修改变形样式后，立即生效，且永久有效。
 *   你可以在角色对话时随时切换变形形状。
 *
 * -----------------------------------------------------------------------------
 * ----可选设定 - 自定义值
 * 你可以通过插件指令手动控制边框的属性：
 * 
 * 插件指令：>对话框变形器 : 设置对话框X位置 : 400
 * 插件指令：>对话框变形器 : 设置对话框X位置 : 变量[21]
 * 插件指令：>对话框变形器 : 设置对话框Y位置 : 400
 * 插件指令：>对话框变形器 : 设置对话框Y位置 : 变量[21]
 * 插件指令：>对话框变形器 : 还原默认对话框位置
 * 插件指令：>对话框变形器 : 设置对话框高度 : 400
 * 插件指令：>对话框变形器 : 设置对话框高度 : 变量[21]
 * 插件指令：>对话框变形器 : 还原默认对话框高度
 * 插件指令：>对话框变形器 : 设置对话框宽度 : 400
 * 插件指令：>对话框变形器 : 设置对话框宽度 : 变量[21]
 * 插件指令：>对话框变形器 : 还原默认对话框宽度
 * 
 * 1.注意，上述插件指令，必须X、Y、宽度、高度任一的模式在"使用自定义值"，
 *   的情况，才能支持修改。其它模式下修改值不生效。
 * 
 * -----------------------------------------------------------------------------
 * ----插件性能
 * 测试仪器：   4G 内存，Intel Core i5-2520M CPU 2.5GHz 处理器
 *              Intel(R) HD Graphics 3000 集显 的垃圾笔记本
 *              (笔记本的3dmark综合分：571，鲁大师综合分：48456)
 * 总时段：     20000.00ms左右
 * 对照表：     0.00ms  - 40.00ms （几乎无消耗）
 *              40.00ms - 80.00ms （低消耗）
 *              80.00ms - 120.00ms（中消耗）
 *              120.00ms以上      （高消耗）
 * 工作类型：   单次执行
 * 时间复杂度： o(n^2)
 * 测试方法：   在不同界面进行测试。
 * 测试结果：   战斗界面中，平均消耗为：【5ms以下】
 *              地图界面中，平均消耗为：【5ms以下】
 * 
 * 1.插件只在自己作用域下工作消耗性能，在其它作用域下是不工作的。
 *   测试结果并不是精确值，范围在给定值的10ms范围内波动。
 *   更多性能介绍，去看看 "0.性能测试报告 > 关于插件性能.docx"。
 * 2.插件只单次执行，产生的消耗几乎可以忽略不计。
 *
 * -----------------------------------------------------------------------------
 * ----更新日志
 * [v1.0]
 * 完成插件ヽ(*。>Д<)o゜
 * [v1.1]
 * 优化了子窗口的位置设置。
 * [v1.2]
 * 优化了旧存档的识别与兼容。
 * [v1.3]
 * 新增X位置“绝对居中”模式，可自动居中姓名框与逐行正文。
 * 
 * 
 * 
 * @param 对话框是否可出界
 * @type boolean
 * @on 可出界
 * @off 不可出界
 * @desc true - 可出界，false - 不可出界。对话框位置如果跑出了游戏窗口边界，则会被强制拉回。
 * @default false
 * 
 * @param 对话框是否自动换行
 * @type boolean
 * @on 自动换行
 * @off 关闭
 * @desc true - 自动换行，false - 关闭。你可以后期使用插件指令开关此功能。
 * @default false
 * 
 * @param 默认变形样式
 * @type number
 * @min 1
 * @desc 对话框默认使用的变形样式。
 * @default 1
 * 
 * @param ---变形样式集---
 * @default
 *
 * @param 变形样式-1
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default {"标签":"==标准对话框形状==","---窗口---":"","位置X模式":"框居中","平移-自定义值 X":"0","位置Y模式":"与'窗口位置'设置一致","平移-自定义值 Y":"0","宽度模式":"使用自定义值","宽度自定义值":"816","高度模式":"使用自定义行数的高度","默认自定义行数":"4","高度自定义值":"192","---其它---":"","字体大小":"28"}
 * 
 * @param 变形样式-2
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default {"标签":"==居中的短对话框==","---窗口---":"","位置X模式":"框居中","平移-自定义值 X":"0","位置Y模式":"与'窗口位置'设置一致","平移-自定义值 Y":"0","宽度模式":"与最长文本宽度一致","宽度自定义值":"816","高度模式":"自适应1至4行数的高度","默认自定义行数":"4","高度自定义值":"192","---其它---":"","字体大小":"28"}
 * 
 * @param 变形样式-3
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default {"标签":"==左半对话框==","---窗口---":"","位置X模式":"紧贴左侧","平移-自定义值 X":"0","位置Y模式":"与'窗口位置'设置一致","平移-自定义值 Y":"0","宽度模式":"使用自定义值","宽度自定义值":"408","高度模式":"使用自定义行数的高度","默认自定义行数":"4","高度自定义值":"192","---其它---":"","字体大小":"28"}
 * 
 * @param 变形样式-4
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default {"标签":"==右半对话框==","---窗口---":"","位置X模式":"紧贴右侧","平移-自定义值 X":"0","位置Y模式":"与'窗口位置'设置一致","平移-自定义值 Y":"0","宽度模式":"使用自定义值","宽度自定义值":"408","高度模式":"使用自定义行数的高度","默认自定义行数":"4","高度自定义值":"192","---其它---":"","字体大小":"28"}
 * 
 * @param 变形样式-5
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default {"标签":"==自由的小对话框==","---窗口---":"","位置X模式":"使用自定义值","平移-自定义值 X":"0","位置Y模式":"使用自定义值","平移-自定义值 Y":"0","宽度模式":"与最长文本宽度一致","宽度自定义值":"816","高度模式":"自适应1至4行数的高度","默认自定义行数":"4","高度自定义值":"192","---其它---":"","字体大小":"28"}
 *
 * @param 变形样式-6
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-7
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-8
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-9
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-10
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-11
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-12
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-13
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-14
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-15
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-16
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-17
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-18
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-19
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 *
 * @param 变形样式-20
 * @parent ---变形样式集---
 * @type struct<DrillDOpStyle>
 * @desc 对话框相关窗口的变形样式配置。
 * @default 
 * 
 * 
 */
/*~struct~DrillDOpStyle:
 * 
 * @param 标签
 * @desc 只用于方便区分查看的标签，不作用在插件中。
 * @default ==新的变形样式==
 * 
 * @param ---窗口---
 * @default 
 * 
 * @param 位置X模式
 * @parent ---窗口---
 * @type select
 * @option 紧贴左侧
 * @value 紧贴左侧
 * @option 紧贴右侧
 * @value 紧贴右侧
 * @option 框居中
 * @value 框居中
 * @option 绝对居中
 * @value 绝对居中
 * @option 使用自定义值
 * @value 使用自定义值
 * @desc 窗口位置X的模式。"绝对居中"会同时居中窗口、姓名框和每行正文。
 * @default 紧贴左侧
 *
 * @param 平移-自定义值 X
 * @parent 位置X模式
 * @desc 如果位置X模式为"使用自定义值"，对话框将使用此位置，x轴方向平移，单位像素。0为贴在最左边。
 * @default 0
 * 
 * @param 位置Y模式
 * @parent ---窗口---
 * @type select
 * @option 与'窗口位置'设置一致
 * @value 与'窗口位置'设置一致
 * @option 紧贴下侧
 * @value 紧贴下侧
 * @option 紧贴上侧
 * @value 紧贴上侧
 * @option 框居中
 * @value 框居中
 * @option 使用自定义值
 * @value 使用自定义值
 * @desc 窗口位置Y的模式。具体介绍去看看"15.对话框 > 关于对话框变形器.docx"。
 * @default 与'窗口位置'设置一致
 *
 * @param 平移-自定义值 Y
 * @parent 位置Y模式
 * @desc 如果位置Y模式为"使用自定义值"，对话框将使用此位置，y轴方向平移，单位像素。0为贴在最上面。
 * @default 0
 * 
 * @param 宽度模式
 * @parent ---窗口---
 * @type select
 * @option 与最长文本宽度一致
 * @value 与最长文本宽度一致
 * @option 使用自定义值
 * @value 使用自定义值
 * @desc 窗口宽度的模式。具体介绍去看看"15.对话框 > 关于对话框变形器.docx"。
 * @default 使用自定义值
 * 
 * @param 宽度自定义值
 * @parent 宽度模式
 * @type number
 * @min 20
 * @desc 如果宽度模式为"使用自定义值"，对话框所用的宽度值。
 * @default 816
 * 
 * @param 高度模式
 * @parent ---窗口---
 * @type select
 * @option 使用自定义行数的高度
 * @value 使用自定义行数的高度
 * @option 自适应1至4行数的高度
 * @value 自适应1至4行数的高度
 * @option 使用自定义值
 * @value 使用自定义值
 * @desc 窗口高度的模式。具体介绍去看看"15.对话框 > 关于对话框变形器.docx"。
 * @default 使用自定义行数的高度
 * 
 * @param 默认自定义行数
 * @parent 高度模式
 * @type number
 * @min 1
 * @desc 如果宽度模式为"使用自定义行数的高度"，对话框所用的行数。
 * @default 4
 * 
 * @param 高度自定义值
 * @parent 高度模式
 * @type number
 * @min 20
 * @desc 如果宽度模式为"使用自定义值"，对话框所用的高度值。
 * @default 192
 * 
 * @param ---其它---
 * @default 
 * 
 * @param 字体大小
 * @parent ---其它---
 * @type number
 * @min 1
 * @desc 对话框的字体大小。
 * @default 28
 * 
 * 
 */
 
//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
//		插件简称		DOp（Dialog_Operator）
//		临时全局变量	无
//		临时局部变量	this._drill_DOp_xxx
//		存储数据变量	无
//		全局存储变量	无
//		覆盖重写方法	无
//
//<<<<<<<<性能记录<<<<<<<<
//
//		★工作类型		单次执行
//		★时间复杂度		o(n^2)
//		★性能测试因素	对话管理层
//		★性能测试消耗	太小，未找到
//		★最坏情况		暂无
//		★备注			暂无
//		
//		★优化记录		暂无
//
//<<<<<<<<插件记录<<<<<<<<
//
//		★功能结构树：
//			对话框变形器：
//				->高宽
//					> 宽度
//					> 高度
//					> 行数
//					->自适应
//						->自适应1至4行数的高度
//						->与最长文本宽度一致
//					->动画伸缩效果 x
//				->位置
//					->X模式
//					->Y模式
//					->固定到某事件位置 x
//				->其它
//				->多行合并
//				->子窗口
//			
//			
//		★家谱：
//			无
//		
//		★插件私有类：
//			无
//		
//		★必要注意事项：
//			1.
//
//		★其它说明细节：
//			1.
//			
//		★存在的问题：
//			暂无
//		

//=============================================================================
// ** 提示信息
//=============================================================================
	//==============================
	// * 提示信息 - 参数
	//==============================
	var DrillUp = DrillUp || {}; 
	DrillUp.g_DOp_PluginTip_curName = "Drill_DialogOperator.js 对话框-对话框变形器";
	DrillUp.g_DOp_PluginTip_baseList = ["Drill_CoreOfWindowAuxiliary.js 系统-窗口辅助核心"];
	//==============================
	// * 提示信息 - 报错 - 缺少基础插件
	//			
	//			说明：	此函数只提供提示信息，不校验真实的插件关系。
	//==============================
	DrillUp.drill_DOp_getPluginTip_NoBasePlugin = function(){
		if( DrillUp.g_DOp_PluginTip_baseList.length == 0 ){ return ""; }
		var message = "【" + DrillUp.g_DOp_PluginTip_curName + "】\n缺少基础插件，去看看下列插件是不是 未添加 / 被关闭 / 顺序不对：";
		for(var i=0; i < DrillUp.g_DOp_PluginTip_baseList.length; i++){
			message += "\n- ";
			message += DrillUp.g_DOp_PluginTip_baseList[i];
		}
		return message;
	};
	
	
//=============================================================================
// ** 变量获取
//=============================================================================
　　var Imported = Imported || {};
　　Imported.Drill_DialogOperator = true;
　　var DrillUp = DrillUp || {}; 
	DrillUp.parameters = PluginManager.parameters('Drill_DialogOperator');

	//==============================
	// * 变量获取 - 样式
	//				（~struct~DrillDOpStyle）
	//==============================
	DrillUp.drill_DOp_initStyle = function( dataFrom ) {
		var data = {};
		
		// > 位置
		data['x_mode'] = String( dataFrom["位置X模式"] || "紧贴左侧");
		data['x_value'] = Number( dataFrom["平移-自定义值 X"] || 0);
		data['y_mode'] = String( dataFrom["位置Y模式"] || "与'窗口位置'设置一致");
		data['y_value'] = Number( dataFrom["平移-自定义值 Y"] || 0);
		
		// > 高宽
		data['width_mode'] = String( dataFrom["宽度模式"] || "使用自定义值");
		data['width_value'] = Number( dataFrom["宽度自定义值"] || 816);
		data['height_mode'] = String( dataFrom["高度模式"] || "使用自定义行数的高度");
		data['height_rowCount'] = Number( dataFrom["默认自定义行数"] || 4);
		data['height_value'] = Number( dataFrom["高度自定义值"] || 192);
		
		// > 其它
		data['fontSize'] = Number( dataFrom["字体大小"] || 28);
		
		return data;
	}
	
	/*-----------------杂项------------------*/
	DrillUp.g_DOp_outFrameEnabled = String(DrillUp.parameters["对话框是否可出界"] || "false") == "true";
	DrillUp.g_DOp_autoWrap = String(DrillUp.parameters["对话框是否自动换行"] || "false") == "true";
	DrillUp.g_DOp_defaultStyleId = Number(DrillUp.parameters["默认变形样式"] || 1);
	
	/*-----------------样式集------------------*/
	DrillUp.g_DOp_list_length = 20;
	DrillUp.g_DOp_list = [];
	for( var i = 0; i < DrillUp.g_DOp_list_length; i++ ){
		if( DrillUp.parameters["变形样式-" + String(i+1) ] != undefined &&
			DrillUp.parameters["变形样式-" + String(i+1) ] != "" ){
			var data = JSON.parse(DrillUp.parameters["变形样式-" + String(i+1) ]);
			DrillUp.g_DOp_list[i] = DrillUp.drill_DOp_initStyle( data );
			DrillUp.g_DOp_list[i]['id'] = i+1;
			DrillUp.g_DOp_list[i]['inited'] = true;
		}else{
			DrillUp.g_DOp_list[i] = DrillUp.drill_DOp_initStyle( {} );
			DrillUp.g_DOp_list[i]['id'] = i+1;
			DrillUp.g_DOp_list[i]['inited'] = false;
		}
	}

	
//=============================================================================
// * >>>>基于插件检测>>>>
//=============================================================================
if( Imported.Drill_CoreOfWindowAuxiliary ){
	

//=============================================================================
// * 插件指令
//=============================================================================
var _drill_DOp_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	_drill_DOp_pluginCommand.call(this, command, args);
	if( command === ">对话框变形器" || command === ">消息核心" ){
		
		if(args.length == 2){
			var type = String(args[1]);
			if( type == "开启自动换行" ){	
				$gameSystem._drill_DOp_autoWrap = true;
			}
			if( type == "关闭自动换行" ){	
				$gameSystem._drill_DOp_autoWrap = false;
			}
			if( type == "还原默认对话框行数" ){	
				var id = $gameSystem._drill_DOp_curStyle['id'];
				$gameSystem._drill_DOp_curStyle['height_rowCount'] = DrillUp.g_DOp_list[ id-1 ]['height_rowCount'];
			}
			if( type == "还原默认对话框位置" ){	
				var id = $gameSystem._drill_DOp_curStyle['id'];
				$gameSystem._drill_DOp_curStyle['x_value'] = DrillUp.g_DOp_list[ id-1 ]['x_value'];
				$gameSystem._drill_DOp_curStyle['y_value'] = DrillUp.g_DOp_list[ id-1 ]['y_value'];
			}
			if( type == "还原默认对话框高度" ){	
				var id = $gameSystem._drill_DOp_curStyle['id'];
				$gameSystem._drill_DOp_curStyle['height_value'] = DrillUp.g_DOp_list[ id-1 ]['height_value'];
			}
			if( type == "还原默认对话框宽度" ){	
				var id = $gameSystem._drill_DOp_curStyle['id'];
				$gameSystem._drill_DOp_curStyle['width_value'] = DrillUp.g_DOp_list[ id-1 ]['width_value'];
			}
			if( type == "还原默认形状样式" ){	
				var id = DrillUp.g_DOp_defaultStyleId;
				$gameSystem._drill_DOp_curStyle = JSON.parse(JSON.stringify( DrillUp.g_DOp_list[ id-1 ] ));
			}
		}
		if(args.length == 4){
			var type = String(args[1]);
			var temp1 = String(args[3]);
			if( type == "设置对话框行数" ){	
				$gameSystem._drill_DOp_curStyle['height_rowCount'] = Number(temp1);
			}
			if( type == "设置对话框X位置" ){	
				if( temp1.indexOf("变量[") != -1 ){
					temp1 = temp1.replace("变量[","");
					temp1 = temp1.replace("]","");
					$gameSystem._drill_DOp_curStyle['x_value'] = $gameVariables.value(Number(temp1));
				}else{
					$gameSystem._drill_DOp_curStyle['x_value'] = Number(temp1);
				}
			}
			if( type == "设置对话框Y位置" ){	
				if( temp1.indexOf("变量[") != -1 ){
					temp1 = temp1.replace("变量[","");
					temp1 = temp1.replace("]","");
					$gameSystem._drill_DOp_curStyle['y_value'] = $gameVariables.value(Number(temp1));
				}else{
					$gameSystem._drill_DOp_curStyle['y_value'] = Number(temp1);
				}
			}
			if( type == "设置对话框高度" ){	
				if( temp1.indexOf("变量[") != -1 ){
					temp1 = temp1.replace("变量[","");
					temp1 = temp1.replace("]","");
					$gameSystem._drill_DOp_curStyle['height_value'] = $gameVariables.value(Number(temp1));
				}else{
					$gameSystem._drill_DOp_curStyle['height_value'] = Number(temp1);
				}
			}
			if( type == "设置对话框宽度" ){	
				if( temp1.indexOf("变量[") != -1 ){
					temp1 = temp1.replace("变量[","");
					temp1 = temp1.replace("]","");
					$gameSystem._drill_DOp_curStyle['width_value'] = $gameVariables.value(Number(temp1));
				}else{
					$gameSystem._drill_DOp_curStyle['width_value'] = Number(temp1);
				}
			}
			if( type == "切换形状" ){	
				temp1 = temp1.replace("变形样式[","");
				temp1 = temp1.replace("]","");
				temp1 = Number(temp1);
				$gameSystem._drill_DOp_curStyle = JSON.parse(JSON.stringify( DrillUp.g_DOp_list[ temp1-1 ] ));
			}
		}
	}
};


//#############################################################################
// ** 【标准模块】存储数据
//#############################################################################
//##############################
// * 存储数据 - 参数存储 开关
//          
//			说明：	> 如果该插件开放了用户可以修改的参数，就注释掉。
//##############################
DrillUp.g_DOp_saveEnabled = false;
//##############################
// * 存储数据 - 初始化
//          
//			说明：	> 下方为固定写法，不要动。
//##############################
var _drill_DOp_sys_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _drill_DOp_sys_initialize.call(this);
	this.drill_DOp_initSysData();
};
//##############################
// * 存储数据 - 载入存档
//          
//			说明：	> 下方为固定写法，不要动。
//##############################
var _drill_DOp_sys_extractSaveContents = DataManager.extractSaveContents;
DataManager.extractSaveContents = function( contents ){
	_drill_DOp_sys_extractSaveContents.call( this, contents );
	
	// > 参数存储 启用时（检查数据）
	if( DrillUp.g_DOp_saveEnabled == true ){	
		$gameSystem.drill_DOp_checkSysData();
		
	// > 参数存储 关闭时（直接覆盖）
	}else{
		$gameSystem.drill_DOp_initSysData();
	}
};
//##############################
// * 存储数据 - 初始化数据【标准函数】
//			
//			参数：	> 无
//			返回：	> 无
//          
//			说明：	> 强行规范的接口，执行数据初始化，并存入存档数据中。
//##############################
Game_System.prototype.drill_DOp_initSysData = function() {
	this.drill_DOp_initSysData_Private();
};
//##############################
// * 存储数据 - 载入存档时检查数据【标准函数】
//			
//			参数：	> 无
//			返回：	> 无
//          
//			说明：	> 强行规范的接口，载入存档时执行的数据检查操作。
//##############################
Game_System.prototype.drill_DOp_checkSysData = function() {
	this.drill_DOp_checkSysData_Private();
};
//=============================================================================
// ** 存储数据（接口实现）
//=============================================================================
//==============================
// * 存储数据 - 初始化数据（私有）
//==============================
Game_System.prototype.drill_DOp_initSysData_Private = function() {
	
	this._drill_DOp_outFrameEnabled = DrillUp.g_DOp_outFrameEnabled;	//对话框是否可出界
	this._drill_DOp_autoWrap = DrillUp.g_DOp_autoWrap;					//自动换行开关
	this._drill_DOp_curStyle = JSON.parse(JSON.stringify( DrillUp.g_DOp_list[ DrillUp.g_DOp_defaultStyleId -1 ] ));										//默认变形样式
};
//==============================
// * 存储数据 - 载入存档时检查数据（私有）
//==============================
Game_System.prototype.drill_DOp_checkSysData_Private = function() {
	
	// > 旧存档数据自动补充
	if( this._drill_DOp_curStyle == undefined ){
		this.drill_DOp_initSysData();
	}
	
};


//=============================================================================
// * 对话框默认配置
//=============================================================================
//==============================
// * 对话框 - 捕获刷新
//==============================
var _drill_DOp_initialize = Window_Message.prototype.initialize;
Window_Message.prototype.initialize = function(){
	_drill_DOp_initialize.call( this );
	this._drill_DOp_lastWidth = 0;				//（上一次变化的宽度）
	this._drill_DOp_lastHeight = 0;				//（上一次变化的高度）
	this._drill_DOp_settingUpdated = false;		//（帧监听）
}
//==============================
// * 对话框 - 帧刷新
//==============================
var _drill_DOp_update = Window_Message.prototype.update;
Window_Message.prototype.update = function(){
    
	// > 标记
	this._drill_DOp_settingUpdated = false;
	
	// > 原函数
    _drill_DOp_update.call( this );
};
//==============================
// * 对话框 - 捕获刷新
//==============================
var _drill_DOp_startMessage = Window_Message.prototype.startMessage;
Window_Message.prototype.startMessage = function(){
    this.drill_DOp_refreshWindowSettings();

	// > 绝对居中：只改造本次绘制所读取的文本，不回写事件/多语言源数据。
	//   正文通过 Drill_DialogTextAlign 的 \DAC 实现逐行居中；
	//   姓名标记 \N<> / \NL<> / \NR<> 统一转为 \NC<>。
	var data = $gameSystem._drill_DOp_curStyle;
	if( data && data['x_mode'] == "绝对居中" && $gameMessage._texts ){
		var org_texts = $gameMessage._texts;
		$gameMessage._texts = org_texts.map(function( text ){
			text = String(text || "");
			text = text.replace(/\\N(?:L|C|R)?(?=<)/gi, "\\NC");
			return text.split("\n").map(function( line ){
				line = line.replace(/\\DA[CLR]/gi, "");
				// MZ 会把转义符后的连续英文字母整体当成指令名：
				// "\\DAC" + "I talked..." 会被误读为未知指令 "DACI"，导致 I 被吞且居中失效。
				// 加入零宽空格作为无可见宽度的指令分隔符。
				return "\\DAC\u200B" + line;
			}).join("\n");
		});
		try{
			_drill_DOp_startMessage.call( this );
		}finally{
			$gameMessage._texts = org_texts;
		}
		return;
	}

	_drill_DOp_startMessage.call( this );
};
//==============================
// * 对话框 - 捕获刷新
//==============================
var _drill_DOp_newPage = Window_Message.prototype.newPage;
Window_Message.prototype.newPage = function( textState ){
    this.drill_DOp_refreshWindowSettings();
    _drill_DOp_newPage.call( this, textState );
};
//==============================
// * 对话框 - 捕获窗口y位置
//==============================
var _drill_DOp_updatePlacement = Window_Message.prototype.updatePlacement;
Window_Message.prototype.updatePlacement = function() {
	
	// > 若已经设置过，直接不执行此函数
	if( this._drill_DOp_settingUpdated == true ){ return; }
	
	_drill_DOp_updatePlacement.call(this);
};
//==============================
// * 对话框 - 自动调整
//==============================
Window_Message.prototype.drill_DOp_refreshWindowSettings = function() {
	if( this._drill_DOp_settingUpdated == true ){ return; }
	this._drill_DOp_settingUpdated = true;
	var data = $gameSystem._drill_DOp_curStyle;
	
	// > 其他插件兼容
	this.drill_DOp_beforeRefresh();
	
	// > 高宽 - 初始化
	var ww = this.windowWidth();
	var hh = this.windowHeight();
	
	// > 高宽 - 出界保护
	if( $gameSystem._drill_DOp_outFrameEnabled == false ){
		ww = Math.min( ww, Graphics.boxWidth );
		hh = Math.min( hh, Graphics.boxHeight );
	}
	
	// > 高宽 - 变化标记
	if( this._drill_DOp_lastWidth != ww ||
		this._drill_DOp_lastHeight != hh ){
		this._drill_DOp_lastWidth = ww;
		this._drill_DOp_lastHeight = hh;
		
		// > 高宽设置后，重刷画布
		this.width = ww;
		this.height = hh;
		this.contents.clear();
		this.createContents();
	}
	
	
	// > 位置 - 初始化
	var xx = 0;
	var yy = 0;
	
	// > 位置 - X模式
	if( data['x_mode'] == "紧贴左侧" ){
		xx = 0;
	}
	if( data['x_mode'] == "紧贴右侧" ){
		xx = Graphics.boxWidth - this.width;
	}
	if( data['x_mode'] == "框居中" ){
		xx = (Graphics.boxWidth - this.width) * 0.5;
	}
	if( data['x_mode'] == "绝对居中" ){
		xx = (Graphics.boxWidth - this.width) * 0.5;
	}
	if( data['x_mode'] == "使用自定义值" ){
		xx = data['x_value'];
	}
	
	// > 位置 - Y模式
	if( data['y_mode'] == "与'窗口位置'设置一致" ){
		this._positionType = $gameMessage.positionType();
		yy = this._positionType * (Graphics.boxHeight - this.height) / 2;
	}
	if( data['y_mode'] == "紧贴下侧" ){
		yy = Graphics.boxHeight - this.height;
	}
	if( data['y_mode'] == "紧贴上侧" ){
		yy = 0;
	}
	if( data['y_mode'] == "框居中" ){
		yy = (Graphics.boxHeight - this.height) * 0.5;
	}
	if( data['y_mode'] == "使用自定义值" ){
		yy = data['y_value'];
	}
	
	// > 位置 - 出界保护
	if( $gameSystem._drill_DOp_outFrameEnabled == false ){
		if( xx < 0 ){ xx = 0; }
		if( yy < 0 ){ yy = 0; }
		if( xx > Graphics.boxWidth - this.width ){ xx = Graphics.boxWidth - this.width; }
		if( yy > Graphics.boxHeight - this.height ){ yy = Graphics.boxHeight - this.height; }
	}
	
	// > 位置 - 设置
    this.x = xx;
    this.y = yy;
	
	
	// > 子窗口 - 初始化
	this.drill_DOp_refreshWindowChild();
};
//==============================
// * 对话框 - 自动调整 子窗口
//==============================
Window_Message.prototype.drill_DOp_refreshWindowChild = function() {
	
	// > 金钱窗口
	if( this.y > 0 ){	//（处于右上角）
		this._goldWindow.x = Graphics.boxWidth - this._goldWindow.width;
		this._goldWindow.y = 0
	}else{				//（处于右下角）
		this._goldWindow.x = Graphics.boxWidth - this._goldWindow.width;
		this._goldWindow.y = Graphics.boxHeight - this._goldWindow.height;
	}
	
	// > 选项窗口
	this._choiceWindow.updatePlacement();
	
	// > 数字输入窗口
	this._numberWindow.updatePlacement();
	
	// > 物品选择窗口
	this._itemWindow.updatePlacement();
	
	// > 姓名窗口
	//（自适应）
};
//==============================
// * 对话框 - 高度（覆写）
//==============================
Window_Message.prototype.windowHeight = function(){
	var data = $gameSystem._drill_DOp_curStyle;
	if( data['height_mode'] == "使用自定义行数的高度" ){
		var hh = this.fittingHeight(this.numVisibleRows());
		// MV→MZ：MZ 内容超出窗口高度会自动翻页(needsNewPage)。当文本用 \{ 放大字体、\fs[] 绝对字号
		//   或 \py[] 下移偏移时，实际渲染高度可能超过"行数×行高"，导致本该一页被拆成两个对话框
		//   (居中警告演出即此问题)。这里按"行数 + 放大字体 + \py 偏移"纯文本解析估算所需高度，必要时
		//   把窗口长高(行数仍作为最小高度)。刻意不调 textSizeEx——它在 COWC 环境下会污染逐行状态、
		//   先闪一个空页。
		try{
			var _txt = ( $gameMessage._texts || [] ).join("\n");
			if( _txt !== "" ){
				// 多页文本不能把总行数直接用于窗口高度，否则 4+4 行会被误算成 8 行高。
				// 按 \f 分页后逐页估算，窗口只采用其中需求最高的一页。
				var _pages = _txt.split("\f");
				var _isMultiPage = _pages.length > 1;
				var _maxNeed = hh;
				for( var _pi = 0; _pi < _pages.length; _pi++ ){
					var _pageText = _pages[_pi];
					// Game_Message.newPage() 把 \f 附在上一条文本末尾，而 allText() 会在
					// 下一条文本前补一个 \n；processNewPage() 会跳过它，估算时也应忽略。
					if( _pi > 0 && _pageText.charAt(0) === "\n" ){
						_pageText = _pageText.slice(1);
					}
					if( _pageText === "" ){ continue; }
					// 普通多页文本沿用原来的固定4行高度，避免无意义地改变既有窗口尺寸。
					// 仅含字号放大、绝对字号或纵向偏移的页面需要额外估算。
					if( _isMultiPage && !/\\\{|\\fs\[|\\py\[/i.test( _pageText ) ){ continue; }
					var _lines = ( _pageText.match( /\n/g ) || [] ).length + 1;	//（\n 分隔的行数）
					var _lh = this.lineHeight();
					if( /\\\{/.test( _pageText ) ){ _lh += 12; }				//（\{ 放大字体，约 +12）
					var _re = /\\fs\[(\d+)\]/ig, _m;						//（\fs[n] 绝对字号）
					while( ( _m = _re.exec( _pageText ) ) ){
						_lh = Math.max( _lh, Number( _m[1] ) + 8 );
					}
					var _pyM = /\\py\[(\d+)\]/i.exec( _pageText );			//（\py[n] 下移偏移）
					var _py = _pyM ? Number( _pyM[1] ) : 0;
					var _need = _lines * _lh + _py + this.padding * 2 + 12;	//（+12 余量，避免边界翻页）
					_maxNeed = Math.max( _maxNeed, _need );
				}
				if( _maxNeed > hh ){ hh = Math.min( _maxNeed, Graphics.boxHeight ); }
			}
		}catch( _e ){}
		return hh;
	}
	if( data['height_mode'] == "自适应1至4行数的高度" ){
		var row = Math.max( 1, $gameMessage._texts.length );	//（守卫：文本短暂为空时不塌成0行）
		// > 含脸图的情况
		if( row < 4 && $gameMessage.faceName() != "" ){
			row = 4;
		}
		return this.fittingHeight( row );
	}
	if( data['height_mode'] == "使用自定义值" ){
		return data['height_value'];
	}
	return Graphics.boxHeight;
};
//==============================
// * 对话框 - 宽度（覆写）
//==============================
Window_Message.prototype.windowWidth = function () {
  const data = $gameSystem._drill_DOp_curStyle;

  /* --- 与最长文本宽度一致 --- */
  if (data['width_mode'] === '与最长文本宽度一致') {
    let maxWidth = 0;
    const pad    = this.standardPadding() * 2;
    const oldCalculating = $gameTemp._drill_COWA_bitmap_isCalculating;
    const oldWaitCount = this._waitCount;
    const ownsCalculation = oldCalculating !== true;

    // textSizeEx 会完整解析窗口字符。若不进入计算模式，\w[n] 会在窗口打开前
    // 提前写入 _waitCount，dDCCE 等字符块也会生成临时贴图，造成空白窗口和重复贴图。
    try {
      // 必须走窗口辅助核心的完整计算生命周期；窗口字符核心会在 Before 中
      // 初始化自动换行统计数组，不能只把全局计算标记直接设为 true。
      if (ownsCalculation) this.drill_COWA_calculateExWidth_Before();
      $gameTemp._drill_COWA_bitmap_isCalculating = true;
      for (let i = 0, arr = $gameMessage._texts, n = arr.length; i < n; i++) {
        // ① 拆成行（换行符可能是 \n 或 \\n）
        const lines = String(arr[i]).split(/\r?\n/);   // 仅产生一次数组
        for (let j = 0, m = lines.length; j < m; j++) {
          // MV→MZ：drill_COWA_getTextExWidth 用 MV 风格 processCharacter，在 MZ 下返回 0/错值
          //   → "与最长文本宽度一致" 样式（小人对话框等）窗口宽度塌掉、文字溢出/整段消失。
          //   改用 MZ 原生 textSizeEx 测宽（正确处理 \c \fb \dDCOG 等转义符）。
          const w = this.textSizeEx(lines[j]).width;
          if (w > maxWidth) maxWidth = w;
        }
      }
    } finally {
      $gameTemp._drill_COWA_bitmap_isCalculating = oldCalculating;
      if (ownsCalculation) this.drill_COWA_calculateExWidth_After();
      this._waitCount = oldWaitCount;
    }
    // ② 左右内边距 + 脸图
    // MV→MZ：textSizeEx 量的是字符 advance 宽度，不含描边(outline ~3-4px)与抗锯齿溢出。
    //   而 innerWidth 恰好 = maxWidth 时（standardPadding 与实际 padding 抵消），最长行末字符的
    //   描边会被画布右缘裁掉（如句尾 ? ）。这里补一点文字描边余量，避免末字被裁。
    let allWidth = maxWidth + pad + 8;
    if ($gameMessage.faceName()) allWidth += Window_Base._faceWidth + 20;
    return allWidth;
  }

  /* --- 自定义值 --- */
  if (data['width_mode'] === '使用自定义值') return data['width_value'];

  return Graphics.boxWidth;
};

//==============================
// * 对话框 - 行数（覆写）
//==============================
Window_Message.prototype.numVisibleRows = function() {
	var data = $gameSystem._drill_DOp_curStyle;
    return data['height_rowCount'];
};
//==============================
// * 对话框 - 字体大小（覆写）
//==============================
Window_Message.prototype.standardFontSize = function() {
	var data = $gameSystem._drill_DOp_curStyle;
    return data['fontSize'];
};
//==============================
// * 对话框 - 行高（MV→MZ）
//			说明：	> 行高对齐到 "字号+8"（与 calcTextHeight 一致），使 fittingHeight 给窗口
//					  分配的每行高度与文字实际行高严丝合缝，避免大字号时末行被裁。
//					  钳制到至少 MZ 默认 36，避免小字号样式窗口反而变矮。
//==============================
Window_Message.prototype.lineHeight = function() {
	return Math.max( this.standardFontSize() + 8, 36 );
};
//==============================
// * 子窗口 - 选择项窗口 - 捕获位置刷新
//==============================
var _drill_DOp_c_updatePlacement = Window_ChoiceList.prototype.updatePlacement;
Window_ChoiceList.prototype.updatePlacement = function(){
	_drill_DOp_c_updatePlacement.call(this);
	
	var bottom_height = Graphics.boxHeight - this._messageWindow.y - this._messageWindow.height;
	if( bottom_height > this.height ){	//（处于对话框下方）
		this.y = this._messageWindow.y + this._messageWindow.height;
	}else{				//（处于对话框上方）
		this.y = this._messageWindow.y - this.height;
	}
}
//==============================
// * 子窗口 - 数字输入窗口 - 捕获位置刷新
//==============================
var _drill_DOp_n_updatePlacement = Window_NumberInput.prototype.updatePlacement;
Window_NumberInput.prototype.updatePlacement = function(){
	_drill_DOp_n_updatePlacement.call(this);
	
	if( this._messageWindow.y == 0 ){	//（处于对话框下方）
		this.y = this._messageWindow.height;
	}else{				//（处于对话框上方）
		this.y = this._messageWindow.y - this.height;
	}
}
//==============================
// * 子窗口 - 选择物品窗口 - 捕获位置刷新
//==============================
var _drill_DOp_i_updatePlacement = Window_EventItem.prototype.updatePlacement;
Window_EventItem.prototype.updatePlacement = function(){
	_drill_DOp_i_updatePlacement.call(this);

	// 复用 Window_EventItem 的插件（如 PEZ_PointAndClickInventory）会在自己的 updatePlacement 里
	//   打 _drill_DOp_skipItemFlip 标记并自行定位；这里见到标记就跳过翻转，避免把它们的 y 顶到 0/屏幕外。
	if( this._drill_DOp_skipItemFlip ){ return; }

	if( this.y == 0 ){	//（处于下方）
		this.y = Graphics.boxHeight - this.height;
	}else{				//（处于上方）
		this.y = 0;
	}
}


//=============================================================================
// ** 兼容
//=============================================================================
Window_Message.prototype.drill_DOp_beforeRefresh = function() {
	
	// > 【对话框 - 简易对话图】
	if( Imported.Drill_DialogSingleSprite ){
		this.drill_DSS_homingPosition();	//（强制归位）
	}
	
};


//=============================================================================
// ** 多行合并
//=============================================================================
//==============================
// * 指令 - 【信息 > 显示文字】（覆写）
//==============================
// MV→MZ：MV 通过 this._params 取参数（executeCommand 会先赋值）；
//         MZ 改为把 command.parameters 作为函数实参 params 传入，不再设 this._params。
//         函数体其余逻辑（_index / _list / nextEventCode / currentCommand / setupChoices…）MZ 通用。
Game_Interpreter.prototype.command101 = function( params ) {
	if( $gameMessage.isBusy() == false ){
		$gameMessage.setFaceImage(params[0], params[1]);
		$gameMessage.setBackground(params[2]);
		$gameMessage.setPositionType(params[3]);
		
		while( this.drill_DOp_isContinueString() ){
			this._index++;
			if( this._list[this._index].code === 401 ){
				$gameMessage.drill_DOp_addText(this.currentCommand().parameters[0]);
			}
			if( $gameMessage._texts.length >= $gameSystem._drill_DOp_curStyle['height_rowCount'] ){
				break;
			}
		}
		switch( this.nextEventCode() ){
			case 102:	// 消息选项
				this._index++;
				this.setupChoices(this.currentCommand().parameters);
				break;
			case 103:	// 数字输入
				this._index++;
				this.setupNumInput(this.currentCommand().parameters);
				break;
			case 104:	// 物品选择
				this._index++;
				this.setupItemChoice(this.currentCommand().parameters);
				break;
		}
		this._index++;
		this.setWaitMode('message');
	}
	return false;
};
//==============================
// * 指令 - 检索判定
//==============================
Game_Interpreter.prototype.drill_DOp_isContinueString = function() {
	if( this.nextEventCode() === 101 && $gameSystem._drill_DOp_curStyle['height_rowCount'] > 4 ){
		return true;
	}else{
		return this.nextEventCode() === 401;
	}
};
//==============================
// * 指令 - 添加文本
//==============================
Game_Message.prototype.drill_DOp_addText = function( text ){
	
	// > 【窗口字符 - 窗口字符核心】
	if( Imported.Drill_CoreOfWindowCharacter ){
		if( $gameSystem._drill_DOp_curStyle == "与最长文本宽度一致" ){
			//（不允许在变化宽度中自动换行）
		}else{
			if( $gameSystem._drill_DOp_autoWrap == true ){
				text = '<WordWrap>' + text;
			}
		}
	}
	this.add(text);
};


//=============================================================================
// * <<<<基于插件检测<<<<
//=============================================================================
}else{
		Imported.Drill_DialogOperator = false;
		var pluginTip = DrillUp.drill_DOp_getPluginTip_NoBasePlugin();
		alert( pluginTip );
}
