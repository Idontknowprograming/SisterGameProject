//=============================================================================
// Drill_PictureSnapShot.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [v1.4]        图片 - 临时屏幕快照（支持自由选区与可选MP4录制）
 * @author Drill_up
 * 
 * 
 * @help  
 * =============================================================================
 * +++ Drill_PictureSnapShot +++
 * 作者：Drill_up
 * 如果你有兴趣，也可以来看看更多我写的drill插件哦ヽ(*。>Д<)o゜
 * https://rpg.blue/thread-409713-1-1.html
 * =============================================================================
 * 使得你可以截取当前的屏幕快照，并赋值给图片贴图。
 * 
 * -----------------------------------------------------------------------------
 * ----插件扩展
 * 该插件可以单独使用。
 * 
 * -----------------------------------------------------------------------------
 * ----设定注意事项
 * 1.插件的作用域：地图界面、战斗界面。
 *   作用于图片对象。
 * 2.更多详细内容，去看看文档 "1.系统 > 大家族-屏幕快照.docx"。
 * 细节：
 *   (1.屏幕快照都是临时的，且只能作为临时贴图使用，无法保存到存档中。
 *   (2."保存到文件"插件指令，可以将当前屏幕截图保存到指定文件夹中。
 *      但注意只在PC端有效。
 * 设计：
 *   (1.你可以将 屏幕快照 和 图片滤镜 结合使用，制作出一闪的效果。
 *      在地图和战斗中都可以做，可以去 特效管理层示例 看看快照效果。
 *
 * -----------------------------------------------------------------------------
 * ----激活条件
 * 你需要通过下面插件指令来执行图片快捷操作：
 * 
 * 插件指令：>图片临时屏幕快照 : 临时快照 : 建立屏幕截图
 * 插件指令：>图片临时屏幕快照 : 临时快照 : 打开截图范围工具
 * 插件指令：>图片临时屏幕快照 : 临时快照 : 打开截图范围工具并保存到文件
 * 插件指令：>图片临时屏幕快照 : 图片[1] : 设为临时快照
 * 插件指令：>图片临时屏幕快照 : 图片变量[21] : 设为临时快照
 * 插件指令：>图片临时屏幕快照 : 批量图片[1,2] : 设为临时快照
 * 插件指令：>图片临时屏幕快照 : 批量图片变量[21,22] : 设为临时快照
 * 插件指令：>图片临时屏幕快照 : 图片[1] : 去除快照
 * 插件指令：>图片临时屏幕快照 : 图片变量[21] : 去除快照
 * 插件指令：>图片临时屏幕快照 : 批量图片[1,2] : 去除快照
 * 插件指令：>图片临时屏幕快照 : 批量图片变量[21,22] : 去除快照
 * 
 * 1.你需要先建立屏幕截图，再将临时快照赋值给 图片对象。
 * 2.注意，屏幕快照都是临时的，且只能作为临时贴图使用，无法保存到存档中。
 * 3.截图范围工具中：拖动选框可移动，拖动八个控制点可缩放；
 *   按住Shift缩放可保持宽高比，方向键可微调，Enter确认，Esc取消。
 * 4.截图范围工具不会自动设置事件等待。可用脚本API自行检测：
 *   $gameTemp.drill_PSS_isRegionSelectorOpen()
 *   $gameTemp.drill_PSS_getRegionSelectorState()
 *   $gameTemp.drill_PSS_isRegionSelectorFinished()
 *   $gameTemp.drill_PSS_didRegionCaptureSucceed()
 *   $gameTemp.drill_PSS_resetRegionSelectorState()
 *   $gameTemp.drill_PSS_shareLastSnapshotToDiscord()
 *   $gameTemp.drill_PSS_captureAndShareToDiscord()
 *   $gameTemp.drill_PSS_getLastSnapshotPath()
 *   状态值：idle、selecting、captured、cancelled、error。
 *
 * -----------------------------------------------------------------------------
 * ----可选功能 - MP4视频录制
 * 该功能默认不会运行，只有调用插件指令或脚本API时才开始录制。
 * 它只接受运行环境原生支持的MP4，不会自动降级为WebM，也不会修改
 * Game_Interpreter.prototype.updateWaitMode。
 *
 * 插件指令：>图片临时屏幕快照 : 视频录制 : 开始全屏录制
 * 插件指令：>图片临时屏幕快照 : 视频录制 : 打开录制范围工具
 * 插件指令：>图片临时屏幕快照 : 视频录制 : 停止并保存
 *
 * 脚本API：
 *   $gameTemp.drill_PSS_getVideoRecordingSupport()  // 返回支持信息
 *   $gameTemp.drill_PSS_isMp4RecordingSupported()   // 是否支持MP4
 *   $gameTemp.drill_PSS_startFullScreenVideoRecording()
 *   $gameTemp.drill_PSS_openVideoRegionSelector()
 *   $gameTemp.drill_PSS_stopVideoRecording()
 *   $gameTemp.drill_PSS_getVideoRecordingState()
 *   $gameTemp.drill_PSS_getVideoRecordingElapsedSeconds()
 *   $gameTemp.drill_PSS_isVideoRecording()
 *   $gameTemp.drill_PSS_isVideoRecordingFinished()
 *   $gameTemp.drill_PSS_didVideoRecordingSucceed()
 *   $gameTemp.drill_PSS_getLastVideoPath()
 *   $gameTemp.drill_PSS_getVideoRecordingError()
 *   $gameTemp.drill_PSS_getVideoRecordingMimeType()
 *   $gameTemp.drill_PSS_resetVideoRecordingState()
 *
 * 视频状态：idle、selecting、starting、recording、saving、saved、
 * cancelled、unsupported、error。事件等待可由调用方自行检测这些API。
 *
 * -----------------------------------------------------------------------------
 * ----可选设定 - 保存文件
 * 你可以通过下面插件指令来实现当前屏幕快照的保存：
 * 
 * 插件指令：>图片临时屏幕快照 : 临时快照 : 建立屏幕截图
 * 插件指令：>图片临时屏幕快照 : 临时快照 : 保存到文件
 * 插件指令：>图片临时屏幕快照 : 打开保存的文件路径
 * 
 * 1.注意，此插件指令只在PC端有效。
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
 * 测试方法：   在特效管理层中，进行快照性能测试。
 * 测试结果：   战斗界面中，平均消耗为：【46.15ms】
 *              地图界面中，平均消耗为：【51.80ms】
 *
 * 1.插件只在自己作用域下工作消耗性能，在其它作用域下是不工作的。
 *   测试结果并不是精确值，范围在给定值的10ms范围内波动。
 *   更多性能介绍，去看看 "0.性能测试报告 > 关于插件性能.docx"。
 * 2.单次截图消耗并不大，但是注意，如果图片截屏指令反复执行，那么
 *   会造成比较多的消耗了。
 * 
 * -----------------------------------------------------------------------------
 * ----更新日志
 * [v1.0]
 * 完成插件ヽ(*。>Д<)o゜
 * [v1.1]
 * 改进了静态快照的内部结构。
 * [v1.2]
 * 添加了保存快照文件的功能。
 * [v1.3]
 * 添加了可移动、可缩放的自由截图范围工具。
 * [v1.4]
 * 添加了可选的全屏/自由选区MP4视频录制与独立状态API。
 * 
 * 
 * 
 * @command openRegionSelector
 * @text 打开截图范围工具
 * @desc 调整选区并建立区域临时快照；该指令不会自动设置事件等待。
 *
 * @arg saveAfterCapture
 * @text 确认后保存到文件
 * @type boolean
 * @on 保存
 * @off 不保存
 * @default false
 *
 * @command openVideoRegionSelector
 * @text 打开视频录制范围工具
 * @desc 选择范围并开始MP4录制；该指令不会自动设置事件等待。
 *
 * @command startFullScreenVideoRecording
 * @text 开始全屏MP4录制
 * @desc 立即开始全屏MP4录制；不支持时状态会变为unsupported。
 *
 * @command stopVideoRecording
 * @text 停止录制并保存
 * @desc 停止当前录制并异步保存MP4；可通过脚本API检测完成。
 *
 * @param 存储快照文件设置
 * @desc 使用插件指令"保存到文件"时，快照文件的设置。
 * @type struct<DrillFile>
 * @default {"文件夹路径":"save/游戏截图/","文件名":"截图","文件名是否包含日期":"true","文件名是否包含时分秒":"true","文件类型":"png","图像质量":"90"}
 *
 * @param 视频录制设置
 * @desc 可选MP4视频录制的输出和质量设置。
 * @type struct<DrillVideo>
 * @default {"文件夹路径":"save/recording/","文件名":"recording","帧率":"60","视频码率Mbps":"6","音频码率Kbps":"192","是否录制游戏声音":"true","是否显示录制边框":"true"}
 * 
 */
/*~struct~DrillVideo:
 *
 * @param 文件夹路径
 * @desc MP4保存目录，相对于游戏根目录。
 * @default save/recording/
 *
 * @param 文件名
 * @desc MP4文件名前缀，后面会自动添加日期时间和防重编号。
 * @default recording
 *
 * @param 帧率
 * @type number
 * @min 1
 * @max 120
 * @default 60
 *
 * @param 视频码率Mbps
 * @type number
 * @min 1
 * @max 300
 * @default 6
 *
 * @param 音频码率Kbps
 * @type number
 * @min 32
 * @max 512
 * @default 192
 *
 * @param 是否录制游戏声音
 * @type boolean
 * @on 录制
 * @off 不录制
 * @default true
 *
 * @param 是否显示录制边框
 * @type boolean
 * @on 显示
 * @off 隐藏
 * @default true
 */
/*~struct~DrillFile:
 * 
 * @param 文件夹路径
 * @desc 格式为"aaa/bbb/"，文件夹不存在时会自动创建，创建在游戏根目录下。
 * @default save/游戏截图/
 * 
 * @param 文件名
 * @desc 执行截图保存后的文件名。
 * @default 截图
 *
 * @param 文件名是否包含日期
 * @parent 文件名
 * @type boolean
 * @on 包含
 * @off 不包含
 * @desc true - 包含，false - 不包含
 * @default true
 *
 * @param 文件名是否包含时分秒
 * @parent 文件名
 * @type boolean
 * @on 包含
 * @off 不包含
 * @desc true - 包含，false - 不包含
 * @default true
 * 
 * @param 文件类型
 * @type select
 * @option png
 * @value png
 * @option jpg
 * @value jpg
 * @desc 存储的文件类型。
 * @default png
 * 
 * @param 图像质量
 * @parent 文件类型
 * @type number
 * @min 1
 * @max 100
 * @desc 文件类型为jpg时有效，可设置1-100的图像质量设置。（png是固定100的图像质量）
 * @default 90
 * 
 */
 
//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
//		插件简称		PSS（Picture_Snap_Shot）
//		临时全局变量	DrillUp.g_PSS_xxx
//		临时局部变量	this._drill_PSS_xxx
//		存储数据变量	$gameSystem._drill_PSS_xxx
//		全局存储变量	无
//		覆盖重写方法	无
//
//<<<<<<<<性能记录<<<<<<<<
//
//		★工作类型		单次执行
//		★时间复杂度		o(n^2)
//		★性能测试因素	特效管理层
//		★性能测试消耗	51.8ms（Game_Temp.drill_PSS_createSnapshot）
//		★最坏情况		指令被频繁调用，不断地执行截屏操作。
//		★备注			截屏本身的操作，执行一次都很费消耗。
//		
//		★优化记录		暂无
//
//<<<<<<<<插件记录<<<<<<<<
//
//		★功能结构树：
//			->☆提示信息
//			->☆变量获取
//			->☆插件指令
//			->☆图片贴图
//				>图片对象层 的图片贴图
//				>最顶层 的图片贴图
//				>图片层 的图片贴图
//			
//			->☆静态快照容器
//			->☆图片控制
//				->显示图片
//				->消除图片
//				->贴图 绑定快照
//			
//			->☆保存快照文件
//
//
//		★家谱：
//			大家族-屏幕快照
//		
//		★脚本文档：
//			无
//		
//		★插件私有类：
//			无
//		
//		★必要注意事项：
//			1.注意快照销毁的时机，指令 图片显示、图片删除 时，都需要销毁快照。
//
//		★其它说明细节：
//			暂无
//
//		★存在的问题：
//			暂无
//		

//=============================================================================
// ** ☆提示信息
//=============================================================================
	//==============================
	// * 提示信息 - 参数
	//==============================
	var DrillUp = DrillUp || {}; 
	DrillUp.g_PSS_PluginTip_curName = "Drill_PictureSnapShot.js 图片-临时屏幕快照";
	DrillUp.g_PSS_PluginTip_baseList = [];
	//==============================
	// * 提示信息 - 报错 - 找不到图片
	//==============================
	DrillUp.drill_PSS_getPluginTip_PictureNotFind = function( pic_id ){
		return "【" + DrillUp.g_PSS_PluginTip_curName + "】\n插件指令错误，id为"+pic_id+"的图片还没被创建。\n你可能需要将指令放在'显示图片'事件指令之后。";
	};
	
	
//=============================================================================
// ** ☆变量获取
//=============================================================================
	var Imported = Imported || {};
	Imported.Drill_PictureSnapShot = true;
	var DrillUp = DrillUp || {}; 
	DrillUp.parameters = PluginManager.parameters('Drill_PictureSnapShot');
	DrillUp.g_PSS_discordSnapshotEndpoint = "https://nlch.io/api/discord/share/snapshot";
	DrillUp.g_PSS_discordSnapshotMaxWidth = 1600;
	DrillUp.g_PSS_discordSnapshotMaxHeight = 900;
	DrillUp.g_PSS_discordSnapshotQuality = 0.80;
	
	
	//==============================
	// * 变量获取 - 文件路径
	//				（~struct~DrillFile）
	//==============================
	DrillUp.drill_PSS_initFile = function( dataFrom ){
		var data = {};
		
		data['url_path'] = String( dataFrom["文件夹路径"] || "save/游戏截图/");
		
		data['file_name'] = String( dataFrom["文件名"] || "游戏截图");
		data['file_name_with_date'] = String( dataFrom["文件名是否包含日期"] || "true") == "true";
		data['file_name_with_time'] = String( dataFrom["文件名是否包含时分秒"] || "true") == "true";
		
		data['file_type'] = String( dataFrom["文件类型"] || "png");
		data['image_quality'] = Number( dataFrom["图像质量"] || 90);
		
		return data;
	}

	/*-----------------杂项------------------*/
	if( DrillUp.parameters["存储快照文件设置"] != undefined &&
		DrillUp.parameters["存储快照文件设置"] != "" ){
		var data = JSON.parse( DrillUp.parameters["存储快照文件设置"] );
		DrillUp.g_PSS_fileSettings = DrillUp.drill_PSS_initFile( data );
	}else{
		DrillUp.g_PSS_fileSettings = DrillUp.drill_PSS_initFile( {} );
	}

	//==============================
	// * 变量获取 - 视频录制设置
	//				（~struct~DrillVideo）
	//==============================
	DrillUp.drill_PSS_initVideo = function( dataFrom ){
		var data = {};
		data['url_path'] = String( dataFrom["文件夹路径"] || "save/recording/" );
		data['file_name'] = String( dataFrom["文件名"] || "recording" );
		data['frame_rate'] = Math.max( 1, Math.min( 120, Number(dataFrom["帧率"] || 60) ) );
		data['video_bitrate'] = Math.max( 1, Number(dataFrom["视频码率Mbps"] || 6) ) * 1000000;
		data['audio_bitrate'] = Math.max( 32, Number(dataFrom["音频码率Kbps"] || 192) ) * 1000;
		data['include_audio'] = String( dataFrom["是否录制游戏声音"] || "true" ) === "true";
		data['show_border'] = String( dataFrom["是否显示录制边框"] || "true" ) === "true";
		return data;
	};
	if( DrillUp.parameters["视频录制设置"] != undefined &&
		DrillUp.parameters["视频录制设置"] != "" ){
		var videoData = JSON.parse( DrillUp.parameters["视频录制设置"] );
		DrillUp.g_PSS_videoSettings = DrillUp.drill_PSS_initVideo( videoData );
	}else{
		DrillUp.g_PSS_videoSettings = DrillUp.drill_PSS_initVideo( {} );
	}
	
	
//=============================================================================
// ** ☆插件指令
//=============================================================================
var _Drill_PSS_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	_Drill_PSS_pluginCommand.call(this, command, args);
	if( command === ">图片临时屏幕快照" ){ 
		
		/*-----------------临时快照------------------*/
		if( args.length == 4 ){
			var unit = String(args[1]);
			var type = String(args[3]);
			if( unit == "临时快照" ){
				if( type == "建立屏幕截图" ){
					$gameTemp.drill_PSS_createSnapshot();
				}
				if( type == "打开截图范围工具" || type == "建立自定义区域截图" ){
					$gameTemp.drill_PSS_openRegionSelector(false);
				}
				if( type == "打开截图范围工具并保存到文件" || type == "建立自定义区域截图并保存到文件" ){
					$gameTemp.drill_PSS_openRegionSelector(true);
				}
				if( type == "保存到文件" ){
					$gameTemp.drill_PSS_saveSnapshot();
				}
				return;
			}
			if( unit == "视频录制" ){
				if( type == "开始全屏录制" ){
					$gameTemp.drill_PSS_startFullScreenVideoRecording();
				}
				if( type == "打开录制范围工具" ){
					$gameTemp.drill_PSS_openVideoRegionSelector();
				}
				if( type == "停止并保存" ){
					$gameTemp.drill_PSS_stopVideoRecording();
				}
				return;
			}
		}
		if( args.length == 2 ){
			var type = String(args[1]);
			if( type == "打开保存的文件路径" ){
				$gameTemp.drill_PSS_openUrl();
			}
			return;
		}
		
			
		/*-----------------对象组获取------------------*/
		var pics = null;			// 图片对象组
		var pic_ids = null;			// 图片ID组（图片对象本身没有id值）
		if( args.length >= 2 ){
			var unit = String(args[1]);
			if( pics == null && unit.indexOf("批量图片[") != -1 ){
				unit = unit.replace("批量图片[","");
				unit = unit.replace("]","");
				pics = [];
				pic_ids = [];
				var temp_arr = unit.split(/[,，]/);
				for( var k=0; k < temp_arr.length; k++ ){
					var pic_id = Number(temp_arr[k]);
					if( $gameScreen.drill_PSS_isPictureExist( pic_id ) == false ){ continue; }
					var p = $gameScreen.picture( pic_id );
					pics.push( p );
					pic_ids.push( pic_id );
				}
			}
			else if( pics == null && unit.indexOf("批量图片变量[") != -1 ){
				unit = unit.replace("批量图片变量[","");
				unit = unit.replace("]","");
				pics = [];
				pic_ids = [];
				var temp_arr = unit.split(/[,，]/);
				for( var k=0; k < temp_arr.length; k++ ){
					var pic_id = $gameVariables.value(Number(temp_arr[k]));
					if( $gameScreen.drill_PSS_isPictureExist( pic_id ) == false ){ continue; }
					var p = $gameScreen.picture( pic_id );
					pics.push( p );
					pic_ids.push( pic_id );
				}
			}
			else if( pics == null && unit.indexOf("图片变量[") != -1 ){
				unit = unit.replace("图片变量[","");
				unit = unit.replace("]","");
				var pic_id = $gameVariables.value(Number(unit));
				if( $gameScreen.drill_PSS_isPictureExist( pic_id ) == false ){ return; }
				var p = $gameScreen.picture( pic_id );
				pics = [ p ];
				pic_ids = [];
					pic_ids.push( pic_id );
			}
			else if( pics == null && unit.indexOf("图片[") != -1 ){
				unit = unit.replace("图片[","");
				unit = unit.replace("]","");
				var pic_id = Number(unit);
				if( $gameScreen.drill_PSS_isPictureExist( pic_id ) == false ){ return; }
				var p = $gameScreen.picture( pic_id );
				pics = [ p ];
				pic_ids = [];
					pic_ids.push( pic_id );
			}
		}
		
		/*-----------------设置快照------------------*/
		if( pics != null && args.length == 4 ){
			var type = String(args[3]);
			if( type == "设为临时快照" ){
				for( var i = 0; i < pics.length; i++ ){
					
					// > 贴图直接赋值
					var picture_sprite = $gameTemp.drill_PSS_getPictureSpriteByPictureId( pic_ids[i] );
					if( picture_sprite == undefined ){ continue; }
					picture_sprite.drill_PSS_setSnapshot( $gameTemp.drill_PSS_getLastSnapshotId() );
					
					// > 图片赋值
					pics[i]._drill_PSS_snapShotId = $gameTemp.drill_PSS_getLastSnapshotId();
				}
			}
			if( type == "去除快照" ){
				for( var i = 0; i < pics.length; i++ ){
					
					// > 贴图直接赋值
					var picture_sprite = $gameTemp.drill_PSS_getPictureSpriteByPictureId( pic_ids[i] );
					if( picture_sprite == undefined ){ continue; }
					picture_sprite.drill_PSS_setSnapshot( -1 );
					
					// > 图片赋值
					pics[i]._drill_PSS_snapShotId = -1;
				}
			}
		}
	}
};
//==============================
// * 插件指令 - MZ自由选区指令
//==============================
if( PluginManager.registerCommand ){
	PluginManager.registerCommand("Drill_PictureSnapShot", "openRegionSelector", function(args){
		var saveAfterCapture = String(args.saveAfterCapture || "false") === "true";
		$gameTemp.drill_PSS_openRegionSelector(saveAfterCapture);
	});
	PluginManager.registerCommand("Drill_PictureSnapShot", "openVideoRegionSelector", function(){
		$gameTemp.drill_PSS_openVideoRegionSelector();
	});
	PluginManager.registerCommand("Drill_PictureSnapShot", "startFullScreenVideoRecording", function(){
		$gameTemp.drill_PSS_startFullScreenVideoRecording();
	});
	PluginManager.registerCommand("Drill_PictureSnapShot", "stopVideoRecording", function(){
		$gameTemp.drill_PSS_stopVideoRecording();
	});
}
//==============================
// * 插件指令 - 图片检查
//==============================
Game_Screen.prototype.drill_PSS_isPictureExist = function( pic_id ){
	if( pic_id == 0 ){ return false; }
	
	var pic = this.picture( pic_id );
	if( pic == undefined ){
		alert( DrillUp.drill_PSS_getPluginTip_PictureNotFind( pic_id ) );
		return false;
	}
	return true;
};


//#############################################################################
// ** 【标准模块】图片贴图 ☆图片贴图
//#############################################################################
//##############################
// * 图片贴图 - 获取 - 容器指针【标准函数】
//			
//			参数：	> 无
//			返回：	> 贴图数组       （图片贴图）
//          
//			说明：	> 此函数直接返回容器对象。
//					> 注意，被转移到 图片层、最顶层 的图片，不在此容器内。
//##############################
Game_Temp.prototype.drill_PSS_getPictureSpriteTank = function(){
	return this.drill_PSS_getPictureSpriteTank_Private();
}
//##############################
// * 图片贴图 - 获取 - 根据图片ID【标准函数】
//			
//			参数：	> picture_id 数字（图片ID）
//			返回：	> 贴图对象       （图片贴图）
//          
//			说明：	> 图片id和图片贴图一一对应。
//					> 此函数只读，且不缓存任何对象，直接读取容器数据。
//					> 注意，图片数据类 与 图片贴图 为 多对一，图片数据类在战斗界面和地图界面分两类，而图片贴图不分。
//					> 此函数能获取到被转移到 图片层、最顶层 的图片。
//##############################
Game_Temp.prototype.drill_PSS_getPictureSpriteByPictureId = function( picture_id ){
	return this.drill_PSS_getPictureSpriteByPictureId_Private( picture_id );
}
//=============================================================================
// ** 图片贴图（接口实现）
//=============================================================================
//==============================
// * 图片贴图容器 - 获取 - 容器（私有）
//==============================
Game_Temp.prototype.drill_PSS_getPictureSpriteTank_Private = function(){
	if( SceneManager._scene == undefined ){ return null; }
	if( SceneManager._scene._spriteset == undefined ){ return null; }
	if( SceneManager._scene._spriteset._pictureContainer == undefined ){ return null; }
	return SceneManager._scene._spriteset._pictureContainer.children;
};
//==============================
// * 图片贴图容器 - 获取 - 最顶层容器（私有）
//==============================
Game_Temp.prototype.drill_PSS_getPictureSpriteTank_SenceTopArea = function(){
	if( SceneManager._scene == undefined ){ return null; }
	if( SceneManager._scene._drill_SenceTopArea == undefined ){ return null; }
	return SceneManager._scene._drill_SenceTopArea.children;
};
//==============================
// * 图片贴图容器 - 获取 - 图片层容器（私有）
//==============================
Game_Temp.prototype.drill_PSS_getPictureSpriteTank_PicArea = function(){
	if( SceneManager._scene == undefined ){ return null; }
	if( SceneManager._scene instanceof Scene_Battle ){
		if( SceneManager._scene._spriteset == undefined ){ return null; }
		if( SceneManager._scene._spriteset._drill_battlePicArea == undefined ){ return null; }
		return SceneManager._scene._spriteset._drill_battlePicArea.children;
	}
	if( SceneManager._scene instanceof Scene_Map ){
		if( SceneManager._scene._spriteset == undefined ){ return null; }
		if( SceneManager._scene._spriteset._drill_mapPicArea == undefined ){ return null; }
		return SceneManager._scene._spriteset._drill_mapPicArea.children;
	}
	return null;
};
//==============================
// * 图片贴图容器 - 获取 - 根据图片ID（私有）
//==============================
Game_Temp.prototype.drill_PSS_getPictureSpriteByPictureId_Private = function( picture_id ){
	
	// > 图片对象层 的图片贴图
	var sprite_list = this.drill_PSS_getPictureSpriteTank_Private();
	if( sprite_list == undefined ){ return null; }
	for(var i=0; i < sprite_list.length; i++){
		var sprite = sprite_list[i];
		if( sprite instanceof Sprite_Picture ){
			if( sprite._pictureId == picture_id ){
				return sprite;
			}
		}
	}
	
	// > 最顶层 的图片贴图
	var sprite_list = this.drill_PSS_getPictureSpriteTank_SenceTopArea();
	if( sprite_list == undefined ){ return null; }
	for(var i=0; i < sprite_list.length; i++){
		var sprite = sprite_list[i];
		if( sprite instanceof Sprite_Picture ){
			if( sprite._pictureId == picture_id ){
				return sprite;
			}
		}
	}
	
	// > 图片层 的图片贴图
	var sprite_list = this.drill_PSS_getPictureSpriteTank_PicArea();
	if( sprite_list == undefined ){ return null; }
	for(var i=0; i < sprite_list.length; i++){
		var sprite = sprite_list[i];
		if( sprite instanceof Sprite_Picture ){
			if( sprite._pictureId == picture_id ){
				return sprite;
			}
		}
	}
	return null;
};



//=============================================================================
// ** ☆静态快照容器
//
//			说明：	> 此模块提供 静态快照 的创建。
//					（插件完整的功能目录去看看：功能结构树）
//=============================================================================
//==============================
// * 静态快照容器 - 初始化
//==============================
var _drill_PSS_temp_initialize = Game_Temp.prototype.initialize;
Game_Temp.prototype.initialize = function() {
    _drill_PSS_temp_initialize.call(this);
	this._drill_PSS_curId = -1;				//静态快照 计数器
	this._drill_PSS_snapShotTank = [];		//静态快照 贴图容器
	this._drill_PSS_regionRatio = null;		//自由选区（相对画布的位置和大小）
	this._drill_PSS_regionSelectorState = "idle";	//自由选区状态
	this._drill_PSS_lastSnapshotPath = "";		//最后保存的截图路径
	this._drill_PSS_videoRecordingState = "idle";	//视频录制状态
	this._drill_PSS_videoRecorder = null;		//当前MediaRecorder
	this._drill_PSS_videoChunks = [];			//当前MP4数据块
	this._drill_PSS_videoSession = null;		//当前录制资源
	this._drill_PSS_lastVideoPath = "";		//最后保存路径
	this._drill_PSS_videoRecordingError = "";	//最后错误
	this._drill_PSS_videoMimeType = "";		//实际使用的MP4 MIME
}
//==============================
// * 静态快照容器 - 创建快照
//
//			说明：	> 每创建一次，计数器都+1，确保设置的都为当前创建的静态快照，且不影响旧快照图像。
//==============================
SceneManager.drill_PSS_Snap = function () {
  return Bitmap.snap(this._scene)
}

//==============================
// * 静态快照容器 - 截取场景（临时隐藏闪光）
//==============================
Game_Temp.prototype.drill_PSS_captureSceneBitmap = function() {
	var spriteset = SceneManager._scene && SceneManager._scene._spriteset;
	var colorFilter = spriteset && spriteset._overallColorFilter ? spriteset._overallColorFilter : null;
	var flashSprite = spriteset && spriteset._flashSprite ? spriteset._flashSprite : null;
	var oldVisible = flashSprite ? flashSprite.visible : null;

	try{
		if( colorFilter ){ colorFilter.setBlendColor([0, 0, 0, 0]); }
		if( flashSprite ){ flashSprite.visible = false; }
		return SceneManager.drill_PSS_Snap();
	}finally{
		if( colorFilter && $gameScreen ){
			colorFilter.setBlendColor($gameScreen.flashColor());
		}
		if( flashSprite ){
			flashSprite.visible = oldVisible;
		}
	}
};

//==============================
// * 静态快照容器 - 放入快照
//==============================
Game_Temp.prototype.drill_PSS_storeSnapshot = function(bitmap) {
	if( !bitmap ){ return -1; }
	this._drill_PSS_curId += 1;
	this._drill_PSS_snapShotTank.push(bitmap);
	return this._drill_PSS_curId;
};

Game_Temp.prototype.drill_PSS_createSnapshot = function() {
	
        // 找到闪光精灵
        var spriteset = SceneManager._scene && SceneManager._scene._spriteset;
        // [MZ适配] MZ 的屏幕闪光改用 spriteset._overallColorFilter 的 blendColor（不再是 _flashSprite）。
        //   截图前临时清掉闪光 blend，截完恢复，确保快照不残留闪光白光。
        var colorFilter = spriteset && spriteset._overallColorFilter ? spriteset._overallColorFilter : null;
        if (colorFilter) { colorFilter.setBlendColor([0, 0, 0, 0]); }
        var flashSprite = spriteset && spriteset._flashSprite ? spriteset._flashSprite : null;

        // 如果有闪光层，先保存其可见度，然后隐藏
        var oldVisible = null;
        if (flashSprite) {
            oldVisible = flashSprite.visible;
            flashSprite.visible = false;  // 或者 flashSprite.opacity = 0
        }	
	
	this._drill_PSS_curId += 1;
	this._drill_PSS_snapShotTank.push( SceneManager.drill_PSS_Snap() );	//（bitmap对象，可以跨越地图界面、战斗界面和菜单界面）
	
        // 恢复闪光滤镜 + 闪光层可见度（下一帧 updateOverallFilters 也会重设，这里即时恢复避免实时画面闪一下）
        if (colorFilter) { colorFilter.setBlendColor($gameScreen.flashColor()); }
        // 恢复闪光层可见度
        if (flashSprite) {
            flashSprite.visible = oldVisible;
        }	
}
//==============================
// * 静态快照容器 - 获取创建的快照
//==============================
Game_Temp.prototype.drill_PSS_getLastSnapshot = function() {
	if( this._drill_PSS_curId == -1 ){ return null; }
	return this._drill_PSS_snapShotTank[ this._drill_PSS_curId ];
}
//==============================
// * 静态快照容器 - 获取创建的快照ID
//==============================
Game_Temp.prototype.drill_PSS_getLastSnapshotId = function() {
	return this._drill_PSS_curId;
}


//=============================================================================
// ** ☆Discord截图分享（仅内存，不写入本地文件）
//=============================================================================
//==============================
// * Discord截图分享 - 建立后台转码Worker
//==============================
Game_Temp.prototype.drill_PSS_getDiscordEncodeWorker = function() {
	if( this._drill_PSS_discordEncodeWorker ){
		return this._drill_PSS_discordEncodeWorker;
	}
	if( typeof Worker === "undefined" ||
		typeof OffscreenCanvas === "undefined" ||
		typeof createImageBitmap === "undefined" ){
		return null;
	}

	var workerSource = [
		"self.onmessage = async function(event){",
		"  var data = event.data || {};",
		"  var bitmap = data.bitmap;",
		"  try {",
		"    var scale = Math.min(1, data.maxWidth / bitmap.width, data.maxHeight / bitmap.height);",
		"    var width = Math.max(1, Math.round(bitmap.width * scale));",
		"    var height = Math.max(1, Math.round(bitmap.height * scale));",
		"    var canvas = new OffscreenCanvas(width, height);",
		"    var context = canvas.getContext('2d', { alpha: false });",
		"    context.drawImage(bitmap, 0, 0, width, height);",
		"    var blob = await canvas.convertToBlob({ type: 'image/webp', quality: data.quality });",
		"    self.postMessage({ id: data.id, ok: true, blob: blob });",
		"  } catch (error) {",
		"    self.postMessage({ id: data.id, ok: false, error: String(error && error.message || error) });",
		"  } finally {",
		"    if (bitmap && bitmap.close) bitmap.close();",
		"  }",
		"};"
	].join("\n");

	var workerUrl = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
	var worker = new Worker(workerUrl);
	URL.revokeObjectURL(workerUrl);

	this._drill_PSS_discordEncodePending = {};
	this._drill_PSS_discordEncodeRequestId = 0;
	var self = this;
	worker.onmessage = function(event) {
		var data = event.data || {};
		var pending = self._drill_PSS_discordEncodePending[data.id];
		if( !pending ){ return; }
		delete self._drill_PSS_discordEncodePending[data.id];
		if( data.ok && data.blob ){
			pending.resolve(data.blob);
		}else{
			pending.reject(new Error(data.error || "snapshot_encode_failed"));
		}
	};
	worker.onerror = function(event) {
		var pendingMap = self._drill_PSS_discordEncodePending || {};
		Object.keys(pendingMap).forEach(function(id) {
			pendingMap[id].reject(new Error(event.message || "snapshot_worker_failed"));
		});
		self._drill_PSS_discordEncodePending = {};
		try{ worker.terminate(); }catch(error){}
		self._drill_PSS_discordEncodeWorker = null;
	};

	this._drill_PSS_discordEncodeWorker = worker;
	return worker;
};

//==============================
// * Discord截图分享 - 后台WebP转码
//==============================
Game_Temp.prototype.drill_PSS_encodeSnapshotOffThread = function(bitmap) {
	var worker = this.drill_PSS_getDiscordEncodeWorker();
	if( !worker ){
		return Promise.reject(new Error("offscreen_canvas_unavailable"));
	}

	var self = this;
	return createImageBitmap(bitmap.canvas).then(function(imageBitmap) {
		return new Promise(function(resolve, reject) {
			self._drill_PSS_discordEncodeRequestId += 1;
			var requestId = self._drill_PSS_discordEncodeRequestId;
			self._drill_PSS_discordEncodePending[requestId] = {
				resolve: resolve,
				reject: reject
			};
			try{
				worker.postMessage({
					id: requestId,
					bitmap: imageBitmap,
					maxWidth: DrillUp.g_PSS_discordSnapshotMaxWidth,
					maxHeight: DrillUp.g_PSS_discordSnapshotMaxHeight,
					quality: DrillUp.g_PSS_discordSnapshotQuality
				}, [imageBitmap]);
			}catch(error){
				delete self._drill_PSS_discordEncodePending[requestId];
				if( imageBitmap.close ){ imageBitmap.close(); }
				reject(error);
			}
		});
	});
};

//==============================
// * Discord截图分享 - 主线程兼容回退
//==============================
Game_Temp.prototype.drill_PSS_encodeSnapshotFallback = function(bitmap) {
	return new Promise(function(resolve, reject) {
		setTimeout(function() {
			try{
				var source = bitmap.canvas;
				var scale = Math.min(
					1,
					DrillUp.g_PSS_discordSnapshotMaxWidth / source.width,
					DrillUp.g_PSS_discordSnapshotMaxHeight / source.height
				);
				var width = Math.max(1, Math.round(source.width * scale));
				var height = Math.max(1, Math.round(source.height * scale));
				var canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				var context = canvas.getContext("2d", { alpha: false });
				context.drawImage(source, 0, 0, width, height);
				canvas.toBlob(function(blob) {
					canvas.width = 1;
					canvas.height = 1;
					if( blob ){
						resolve(blob);
					}else{
						reject(new Error("snapshot_encode_failed"));
					}
				}, "image/webp", DrillUp.g_PSS_discordSnapshotQuality);
			}catch(error){
				reject(error);
			}
		}, 0);
	});
};

Game_Temp.prototype.drill_PSS_encodeSnapshotForDiscord = function(bitmap) {
	var self = this;
	return this.drill_PSS_encodeSnapshotOffThread(bitmap).catch(function(error) {
		console.warn("[Drill_PictureSnapShot] 后台转码不可用，使用兼容模式：", error);
		return self.drill_PSS_encodeSnapshotFallback(bitmap);
	});
};

//==============================
// * Discord截图分享 - 检查登录和Discord绑定
//==============================
Game_Temp.prototype.drill_PSS_getDiscordSnapshotAuth = function() {
	var cached = null;
	try{
		cached = JSON.parse(localStorage.getItem("gm_patreon_verify") || "null");
	}catch(error){
		throw new Error("snapshot_login_required");
	}

	var playerId = String(cached && (cached.playerId || cached.player_id) || "").trim();
	if( !/^\d+$/.test(playerId) ){
		throw new Error("snapshot_login_required");
	}
	var deviceId = String(cached && cached.device_id || "").trim();
	if( !deviceId ){
		throw new Error("snapshot_device_id_required");
	}

	var linkedProviders = Array.isArray(cached.linkedProviders)
		? cached.linkedProviders.map(function(provider) {
			return String(provider || "").trim().toLowerCase();
		})
		: [];
	var roles = Array.isArray(cached.specialRoles)
		? cached.specialRoles.map(function(role) { return String(role || "").trim(); })
		: [];
	var discordUserId = String(cached.discordUserId || cached.discord_user_id || "").trim();
	var accountUid = String(cached.accountUid || cached.account_uid || "").trim();
	var discordLinked = linkedProviders.indexOf("discord") !== -1 ||
		/^\d+$/.test(discordUserId) ||
		/^discord:\d+$/i.test(accountUid) ||
		roles.indexOf("discord") !== -1;
	if( !discordLinked ){
		throw new Error("snapshot_discord_not_linked");
	}

	return { playerId: playerId, deviceId: deviceId };
};

//==============================
// * Discord截图分享 - 上传Blob
//==============================
Game_Temp.prototype.drill_PSS_uploadSnapshotBlob = function(blob, snapshotAuth) {
	var form = new FormData();
	var extension = blob.type === "image/jpeg" ? "jpg" :
		(blob.type === "image/png" ? "png" : "webp");
	form.append("snapshot", blob, "gameplay-snapshot." + extension);

	var endpoint = DrillUp.g_PSS_discordSnapshotEndpoint +
		"?player_id=" + encodeURIComponent(snapshotAuth.playerId);
	return fetch(endpoint, {
		method: "POST",
		headers: {
			"Authorization": "Bearer " + snapshotAuth.deviceId
		},
		body: form,
		cache: "no-store"
	}).then(function(response) {
		return response.text().then(function(text) {
			var result = {};
			try{ result = JSON.parse(text); }catch(error){}
			if( !response.ok || !result.ok ){
				var failure = new Error(result.error || "snapshot_upload_failed");
				failure.status = response.status;
				failure.result = result;
				throw failure;
			}
			return result;
		});
	});
};

//==============================
// * Discord截图分享 - 分享指定Bitmap
//==============================
Game_Temp.prototype.drill_PSS_shareBitmapToDiscord = function(bitmap) {
	if( !bitmap || !bitmap.canvas ){
		return Promise.reject(new Error("snapshot_not_found"));
	}
	var snapshotAuth;
	try{
		snapshotAuth = this.drill_PSS_getDiscordSnapshotAuth();
	}catch(error){
		return Promise.reject(error);
	}
	var self = this;
	return this.drill_PSS_encodeSnapshotForDiscord(bitmap)
		.then(function(blob) {
			return self.drill_PSS_uploadSnapshotBlob(blob, snapshotAuth).then(function(result) {
				result.encodedBytes = blob.size;
				result.encodedType = blob.type;
				console.log("[Drill_PictureSnapShot] Discord截图发送成功：", result);
				return result;
			});
		});
};

// 已有临时快照：只发送，不写入本地文件，也不销毁可能仍在使用的快照。
Game_Temp.prototype.drill_PSS_shareLastSnapshotToDiscord = function() {
	return this.drill_PSS_shareBitmapToDiscord(this.drill_PSS_getLastSnapshot());
};

// 立即截取并发送：不放入快照容器，转码完成后主动释放Bitmap。
Game_Temp.prototype.drill_PSS_captureAndShareToDiscord = function() {

    // 目前不开放
    return Promise.reject(error);
	
	try{
		this.drill_PSS_getDiscordSnapshotAuth();
	}catch(error){
		return Promise.reject(error);
	}
	var bitmap = this.drill_PSS_captureSceneBitmap();
	if( !bitmap ){
		return Promise.reject(new Error("snapshot_capture_failed"));
	}
	var promise = this.drill_PSS_shareBitmapToDiscord(bitmap);
	return promise.then(function(result) {
		if( bitmap.destroy ){ bitmap.destroy(); }
		return result;
	}, function(error) {
		if( bitmap.destroy ){ bitmap.destroy(); }
		throw error;
	});
};


//=============================================================================
// ** ☆自由截图范围工具
//
//			说明：	> 选区使用DOM绘制，不会被截进游戏画面。
//					> 确认后仍写入原有的静态快照容器。
//=============================================================================
//==============================
// * 自由选区 - 建立区域快照
//==============================
Game_Temp.prototype.drill_PSS_createRegionSnapshot = function(region, selectorWidth, selectorHeight) {
	if( !region || selectorWidth <= 0 || selectorHeight <= 0 ){ return -1; }

	var sourceBitmap = this.drill_PSS_captureSceneBitmap();
	if( !sourceBitmap ){ return -1; }

	try{
		var scaleX = sourceBitmap.width / selectorWidth;
		var scaleY = sourceBitmap.height / selectorHeight;
		var sx = Math.max(0, Math.floor(region.x * scaleX));
		var sy = Math.max(0, Math.floor(region.y * scaleY));
		var right = Math.min(sourceBitmap.width, Math.ceil((region.x + region.w) * scaleX));
		var bottom = Math.min(sourceBitmap.height, Math.ceil((region.y + region.h) * scaleY));
		var sw = Math.max(1, right - sx);
		var sh = Math.max(1, bottom - sy);
		var regionBitmap = new Bitmap(sw, sh);
		regionBitmap.blt(sourceBitmap, sx, sy, sw, sh, 0, 0, sw, sh);
		return this.drill_PSS_storeSnapshot(regionBitmap);
	}finally{
		if( sourceBitmap.destroy ){
			sourceBitmap.destroy();
		}
	}
};

//==============================
// * 自由选区 - 打开/检查工具
//==============================
Game_Temp.prototype.drill_PSS_openRegionSelector = function(saveAfterCapture) {
	if( Drill_PSS_RegionSelector._instance ){
		return true;
	}
	this._drill_PSS_regionSelectorState = "selecting";
	var selector = new Drill_PSS_RegionSelector(this, saveAfterCapture === true);
	if( !selector.open() ){
		this._drill_PSS_regionSelectorState = "error";
		return false;
	}
	Drill_PSS_RegionSelector._instance = selector;
	return true;
};
Game_Temp.prototype.drill_PSS_isRegionSelectorOpen = function() {
	return !!Drill_PSS_RegionSelector._instance;
};
Game_Temp.prototype.drill_PSS_getRegionSelectorState = function() {
	return this._drill_PSS_regionSelectorState || "idle";
};
Game_Temp.prototype.drill_PSS_isRegionSelectorFinished = function() {
	var state = this.drill_PSS_getRegionSelectorState();
	return state === "captured" || state === "cancelled" || state === "error";
};
Game_Temp.prototype.drill_PSS_didRegionCaptureSucceed = function() {
	return this.drill_PSS_getRegionSelectorState() === "captured";
};
Game_Temp.prototype.drill_PSS_resetRegionSelectorState = function() {
	if( !this.drill_PSS_isRegionSelectorOpen() ){
		this._drill_PSS_regionSelectorState = "idle";
	}
};


//=============================================================================
// ** ☆可选MP4视频录制
//
//			说明：	> 只在调用API/插件指令后工作，不改写引擎的逐帧方法。
//					> 仅接受原生MP4 MediaRecorder，不支持时不会降级WebM。
//=============================================================================
//==============================
// * 视频录制 - MP4 MIME候选
//==============================
Game_Temp.prototype.drill_PSS_getMp4MimeCandidates = function() {
	return [
		'video/mp4;codecs="avc1.42E02A,mp4a.40.2"',
		'video/mp4;codecs="avc1.42001f,mp4a.40.2"',
		'video/mp4;codecs="avc1,mp4a.40.2"',
		'video/mp4;codecs="avc1.42E02A"',
		'video/mp4;codecs="avc1.42001f"',
		'video/mp4'
	];
};

Game_Temp.prototype.drill_PSS_getSupportedMp4MimeTypes = function() {
	if( typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported ){
		return [];
	}
	var result = [];
	var candidates = this.drill_PSS_getMp4MimeCandidates();
	for( var i = 0; i < candidates.length; i++ ){
		try{
			if( MediaRecorder.isTypeSupported(candidates[i]) ){
				result.push(candidates[i]);
			}
		}catch(error){}
	}
	return result;
};

//==============================
// * 视频录制 - 获取游戏画布
//==============================
Game_Temp.prototype.drill_PSS_getVideoSourceCanvas = function() {
	try{
		if( Graphics && Graphics.app && Graphics.app.view ){
			return Graphics.app.view;
		}
	}catch(error){}
	if( typeof Graphics !== "undefined" && Graphics._canvas ){
		return Graphics._canvas;
	}
	try{
		if( Graphics && Graphics._app && Graphics._app.renderer && Graphics._app.renderer.view ){
			return Graphics._app.renderer.view;
		}
	}catch(error){}
	return null;
};

//==============================
// * 视频录制 - 支持信息
//==============================
Game_Temp.prototype.drill_PSS_getVideoRecordingSupport = function() {
	// 0、12：中文，1：日语，其余语言：英语。每次查询时读取当前语言。
	const language = ConfigManager.language;
	const messages = (language === 0 || language === 12) ? {
		nwjsOnly: "视频保存功能只支持NW.js运行环境。",
		noCaptureStream: "当前游戏画布不支持captureStream。",
		noMediaRecorder: "当前运行环境没有MediaStream/MediaRecorder。",
		noMp4: "当前NW.js不支持原生video/mp4录制。"
	} : language === 1 ? {
		nwjsOnly: "動画の保存はNW.js環境でのみ利用できます。",
		noCaptureStream: "現在のゲームキャンバスはcaptureStreamに対応していません。",
		noMediaRecorder: "現在の実行環境ではMediaStreamまたはMediaRecorderを利用できません。",
		noMp4: "現在のNW.jsはネイティブのvideo/mp4録画に対応していません。"
	} : {
		nwjsOnly: "Saving videos is only supported in NW.js.",
		noCaptureStream: "The current game canvas does not support captureStream.",
		noMediaRecorder: "MediaStream or MediaRecorder is unavailable in the current runtime.",
		noMp4: "The current NW.js runtime does not support native video/mp4 recording."
	};
	let nwVersion = "";
	let chromiumVersion = "";
	try{
		nwVersion = process.versions.nw || process.versions["node-webkit"] || "";
		chromiumVersion = process.versions.chromium || "";
	}catch(error){}

	const canvas = this.drill_PSS_getVideoSourceCanvas();
	const captureStream = canvas && (canvas.captureStream || canvas.mozCaptureStream);
	const mimeTypes = this.drill_PSS_getSupportedMp4MimeTypes();
	let supported = true;
	let reason = "";
	if( typeof Utils === "undefined" || !Utils.isNwjs || !Utils.isNwjs() ){
		supported = false;
		reason = messages.nwjsOnly;
	}else if( !canvas || !captureStream ){
		supported = false;
		reason = messages.noCaptureStream;
	}else if( typeof MediaStream === "undefined" || typeof MediaRecorder === "undefined" ){
		supported = false;
		reason = messages.noMediaRecorder;
	}else if( mimeTypes.length === 0 ){
		supported = false;
		reason = messages.noMp4;
	}

	let audioAvailable = false;
	try{
		audioAvailable = !!(WebAudio._context && WebAudio._masterGainNode &&
			WebAudio._context.createMediaStreamDestination);
	}catch(error){}
	return {
		supported: supported,
		mimeType: mimeTypes[0] || "",
		mimeTypes: mimeTypes.slice(0),
		audioCaptureAvailable: audioAvailable,
		nwVersion: nwVersion,
		chromiumVersion: chromiumVersion,
		reason: reason
	};
};

Game_Temp.prototype.drill_PSS_isMp4RecordingSupported = function() {
	return this.drill_PSS_getVideoRecordingSupport().supported;
};

//==============================
// * 视频录制 - 状态API
//==============================
Game_Temp.prototype.drill_PSS_getVideoRecordingState = function() {
	return this._drill_PSS_videoRecordingState || "idle";
};
Game_Temp.prototype.drill_PSS_getVideoRecordingElapsedSeconds = function() {
	var session = this._drill_PSS_videoSession;
	if( !session || !session.startedAt ){ return 0; }
	var endTime = session.stoppedAt || Date.now();
	return Math.max(0, Math.floor((endTime - session.startedAt) / 1000));
};
Game_Temp.prototype.drill_PSS_isVideoRecording = function() {
	var state = this.drill_PSS_getVideoRecordingState();
	return state === "starting" || state === "recording";
};
Game_Temp.prototype.drill_PSS_isVideoRecordingFinished = function() {
	var state = this.drill_PSS_getVideoRecordingState();
	return state === "saved" || state === "cancelled" ||
		state === "unsupported" || state === "error";
};
Game_Temp.prototype.drill_PSS_didVideoRecordingSucceed = function() {
	return this.drill_PSS_getVideoRecordingState() === "saved";
};
Game_Temp.prototype.drill_PSS_getLastVideoPath = function() {
	return this._drill_PSS_lastVideoPath || "";
};
Game_Temp.prototype.drill_PSS_getVideoRecordingError = function() {
	return this._drill_PSS_videoRecordingError || "";
};
Game_Temp.prototype.drill_PSS_getVideoRecordingMimeType = function() {
	return this._drill_PSS_videoMimeType || "";
};
Game_Temp.prototype.drill_PSS_resetVideoRecordingState = function() {
	var state = this.drill_PSS_getVideoRecordingState();
	if( state === "selecting" || state === "starting" ||
		state === "recording" || state === "saving" ){
		return false;
	}
	this._drill_PSS_videoRecordingState = "idle";
	this._drill_PSS_videoRecordingError = "";
	this._drill_PSS_lastVideoPath = "";
	this._drill_PSS_videoMimeType = "";
	return true;
};

//==============================
// * 视频录制 - 打开选区/全屏开始
//==============================
Game_Temp.prototype.drill_PSS_openVideoRegionSelector = function() {
	if( Drill_PSS_RegionSelector._instance ||
		this.drill_PSS_isVideoRecording() ||
		this.drill_PSS_getVideoRecordingState() === "saving" ){
		return false;
	}
	var support = this.drill_PSS_getVideoRecordingSupport();
	if( !support.supported ){
		this._drill_PSS_videoRecordingState = "unsupported";
		this._drill_PSS_videoRecordingError = support.reason;
		console.warn("[Drill_PictureSnapShot] " + support.reason, support);
		return false;
	}
	this._drill_PSS_videoRecordingState = "selecting";
	this._drill_PSS_videoRecordingError = "";
	var selector = new Drill_PSS_RegionSelector(this, false, "video");
	if( !selector.open() ){
		this._drill_PSS_videoRecordingState = "error";
		this._drill_PSS_videoRecordingError = "无法打开视频录制范围工具。";
		return false;
	}
	Drill_PSS_RegionSelector._instance = selector;
	return true;
};

Game_Temp.prototype.drill_PSS_startFullScreenVideoRecording = function() {
	return this.drill_PSS_startVideoRecording({ region: null });
};

//==============================
// * 视频录制 - 创建裁剪画布
//==============================
Game_Temp.prototype.drill_PSS_prepareVideoCanvas = function(sourceCanvas, options, session) {
	if( !options.region ){
		session.regionRatio = null;
		return sourceCanvas;
	}
	var selectorWidth = Number(options.selectorWidth || 0);
	var selectorHeight = Number(options.selectorHeight || 0);
	if( selectorWidth <= 0 || selectorHeight <= 0 ){
		throw new Error("视频录制选区尺寸无效。");
	}
	var region = options.region;
	var scaleX = sourceCanvas.width / selectorWidth;
	var scaleY = sourceCanvas.height / selectorHeight;
	var sx = Math.max(0, Math.floor(region.x * scaleX));
	var sy = Math.max(0, Math.floor(region.y * scaleY));
	var right = Math.min(sourceCanvas.width, Math.ceil((region.x + region.w) * scaleX));
	var bottom = Math.min(sourceCanvas.height, Math.ceil((region.y + region.h) * scaleY));
	var sw = Math.max(2, right - sx);
	var sh = Math.max(2, bottom - sy);
	var outputWidth = Math.max(2, sw & ~1);
	var outputHeight = Math.max(2, sh & ~1);
	var cropCanvas = document.createElement("canvas");
	cropCanvas.width = outputWidth;
	cropCanvas.height = outputHeight;
	var context = cropCanvas.getContext("2d", { alpha: false });
	if( !context ){
		throw new Error("无法创建视频录制裁剪画布。" );
	}
	context.imageSmoothingEnabled = false;
	session.cropCanvas = cropCanvas;
	session.cropContext = context;
	session.cropSource = { x: sx, y: sy, w: sw, h: sh };
	session.regionRatio = {
		x: region.x / selectorWidth,
		y: region.y / selectorHeight,
		w: region.w / selectorWidth,
		h: region.h / selectorHeight
	};

	var self = this;
	var drawFrame = function(){
		if( session.closed || self._drill_PSS_videoSession !== session ){ return; }
		try{
			context.drawImage(
				sourceCanvas,
				session.cropSource.x, session.cropSource.y,
				session.cropSource.w, session.cropSource.h,
				0, 0, outputWidth, outputHeight
			);
		}catch(error){}
		if( typeof requestAnimationFrame !== "undefined" ){
			session.frameRequestId = requestAnimationFrame(drawFrame);
		}else{
			session.frameTimerId = setTimeout(drawFrame, 1000 / session.settings.frame_rate);
		}
	};
	drawFrame();
	return cropCanvas;
};

//==============================
// * 视频录制 - 接入游戏声音
//==============================
Game_Temp.prototype.drill_PSS_prepareVideoAudioTracks = function(session) {
	if( !session.settings.include_audio ){ return []; }
	try{
		var context = WebAudio._context;
		var masterGain = WebAudio._masterGainNode;
		if( !context || !masterGain || !context.createMediaStreamDestination ){
			return [];
		}
		var destination = context.createMediaStreamDestination();
		masterGain.connect(destination);
		session.audioMasterGain = masterGain;
		session.audioDestination = destination;
		return destination.stream.getAudioTracks();
	}catch(error){
		console.warn("[Drill_PictureSnapShot] 无法录制游戏声音，将保存无声MP4：", error);
		return [];
	}
};

//==============================
// * 视频录制 - 开始
//==============================
Game_Temp.prototype.drill_PSS_startVideoRecording = function(options) {
	options = options || {};
	var state = this.drill_PSS_getVideoRecordingState();
	if( Drill_PSS_RegionSelector._instance ||
		state === "selecting" || state === "recording" ||
		state === "starting" || state === "saving" ){
		return false;
	}
	var support = this.drill_PSS_getVideoRecordingSupport();
	if( !support.supported ){
		this._drill_PSS_videoRecordingState = "unsupported";
		this._drill_PSS_videoRecordingError = support.reason;
		console.warn("[Drill_PictureSnapShot] " + support.reason, support);
		return false;
	}

	var settings = Object.assign({}, DrillUp.g_PSS_videoSettings || {}, options.settings || {});
	this._drill_PSS_videoRecordingState = "starting";
	this._drill_PSS_videoRecordingError = "";
	this._drill_PSS_lastVideoPath = "";
	this._drill_PSS_videoChunks = [];
	var session = {
		settings: settings,
		closed: false,
		failed: false,
		startedAt: 0,
		stoppedAt: 0,
		sourceCanvas: null,
		captureCanvas: null,
		captureStream: null,
		recordStream: null,
		cropCanvas: null,
		cropContext: null,
		cropSource: null,
		regionRatio: null,
		frameRequestId: 0,
		frameTimerId: 0,
		audioMasterGain: null,
		audioDestination: null,
		indicator: null,
		boundIndicatorUpdate: null
	};
	this._drill_PSS_videoSession = session;

	try{
		var sourceCanvas = this.drill_PSS_getVideoSourceCanvas();
		session.sourceCanvas = sourceCanvas;
		var captureCanvas = this.drill_PSS_prepareVideoCanvas(sourceCanvas, options, session);
		session.captureCanvas = captureCanvas;
		var captureMethod = captureCanvas.captureStream || captureCanvas.mozCaptureStream;
		session.captureStream = captureMethod.call(captureCanvas, settings.frame_rate);
		var videoTracks = session.captureStream.getVideoTracks();
		if( videoTracks.length === 0 ){
			throw new Error("没有取得游戏画面的视频轨道。" );
		}
		var audioTracks = this.drill_PSS_prepareVideoAudioTracks(session);
		session.recordStream = new MediaStream(videoTracks.concat(audioTracks));

		var recorder = null;
		var recorderError = null;
		var mimeTypes = support.mimeTypes;
		for( var i = 0; i < mimeTypes.length; i++ ){
			var recorderOptions = {
				mimeType: mimeTypes[i],
				videoBitsPerSecond: settings.video_bitrate
			};
			if( audioTracks.length > 0 ){
				recorderOptions.audioBitsPerSecond = settings.audio_bitrate;
			}
			try{
				recorder = new MediaRecorder(session.recordStream, recorderOptions);
				break;
			}catch(error){
				recorderError = error;
			}
		}
		if( !recorder ){
			throw recorderError || new Error("无法创建MP4 MediaRecorder。" );
		}

		var self = this;
		this._drill_PSS_videoRecorder = recorder;
		this._drill_PSS_videoMimeType = recorder.mimeType || support.mimeType;
		recorder.ondataavailable = function(event){
			if( event.data && event.data.size > 0 ){
				self._drill_PSS_videoChunks.push(event.data);
			}
		};
		recorder.onerror = function(event){
			var error = event.error || new Error("MediaRecorder录制失败。" );
			session.failed = true;
			if( session.startedAt && !session.stoppedAt ){
				session.stoppedAt = Date.now();
			}
			self._drill_PSS_videoRecordingState = "error";
			self._drill_PSS_videoRecordingError = error.message || String(error);
			console.error("[Drill_PictureSnapShot] MP4录制失败：", error);
			if( recorder.state !== "inactive" ){
				try{ recorder.stop(); }catch(stopError){}
			}
		};
		recorder.onstop = function(){
			self.drill_PSS_finalizeVideoRecording(session);
		};
		recorder.start(1000);
		session.startedAt = Date.now();
		this._drill_PSS_videoRecordingState = "recording";
		this.drill_PSS_showVideoRecordingIndicator(session);
		console.log("[Drill_PictureSnapShot] MP4录制开始：", {
			mimeType: this._drill_PSS_videoMimeType,
			width: captureCanvas.width,
			height: captureCanvas.height,
			frameRate: settings.frame_rate,
			audio: audioTracks.length > 0
		});
		return true;
	}catch(error){
		this._drill_PSS_videoRecordingState =
			error && error.name === "NotSupportedError" ? "unsupported" : "error";
		this._drill_PSS_videoRecordingError = error && error.message ? error.message : String(error);
		console.error("[Drill_PictureSnapShot] 无法开始MP4录制：", error);
		this.drill_PSS_cleanupVideoSession(session);
		this._drill_PSS_videoRecorder = null;
		this._drill_PSS_videoSession = null;
		return false;
	}
};

//==============================
// * 视频录制 - 停止
//==============================
Game_Temp.prototype.drill_PSS_stopVideoRecording = function() {
	var recorder = this._drill_PSS_videoRecorder;
	if( !recorder || recorder.state === "inactive" || !this.drill_PSS_isVideoRecording() ){
		return false;
	}
	var session = this._drill_PSS_videoSession;
	if( session && session.startedAt && !session.stoppedAt ){
		session.stoppedAt = Date.now();
	}
	this._drill_PSS_videoRecordingState = "saving";
	try{
		recorder.stop();
		return true;
	}catch(error){
		this._drill_PSS_videoRecordingState = "error";
		this._drill_PSS_videoRecordingError = error.message || String(error);
		console.error("[Drill_PictureSnapShot] 停止MP4录制失败：", error);
		this.drill_PSS_cleanupVideoSession(this._drill_PSS_videoSession);
		this._drill_PSS_videoRecorder = null;
		this._drill_PSS_videoSession = null;
		return false;
	}
};

//==============================
// * 视频录制 - 完成并保存
//==============================
Game_Temp.prototype.drill_PSS_finalizeVideoRecording = function(session) {
	if( !session || session.finalized ){ return; }
	session.finalized = true;
	this.drill_PSS_cleanupVideoSession(session);
	this._drill_PSS_videoRecorder = null;
	this._drill_PSS_videoSession = null;
	if( session.failed ){
		this._drill_PSS_videoChunks = [];
		if( this._drill_PSS_videoRecordingState !== "error" ){
			this._drill_PSS_videoRecordingState = "error";
		}
		return;
	}

	var chunks = this._drill_PSS_videoChunks.slice(0);
	this._drill_PSS_videoChunks = [];
	var blob = new Blob(chunks, { type: this._drill_PSS_videoMimeType || "video/mp4" });
	if( blob.size <= 0 ){
		this._drill_PSS_videoRecordingState = "error";
		this._drill_PSS_videoRecordingError = "录制结果为空，未生成MP4数据。";
		return;
	}
	this._drill_PSS_videoRecordingState = "saving";
	var self = this;
	blob.arrayBuffer().then(function(arrayBuffer){
		var fs = require("fs");
		var filePath = self.drill_PSS_makeVideoFilePath(session.settings);
		fs.writeFile(filePath, Buffer.from(arrayBuffer), function(error){
			if( error ){
				self._drill_PSS_videoRecordingState = "error";
				self._drill_PSS_videoRecordingError = error.message || String(error);
				console.error("[Drill_PictureSnapShot] MP4保存失败：", error);
				return;
			}
			self._drill_PSS_lastVideoPath = filePath;
			self._drill_PSS_videoRecordingError = "";
			self._drill_PSS_videoRecordingState = "saved";
			console.log("[Drill_PictureSnapShot] MP4已保存：" + filePath);
		});
	}).catch(function(error){
		self._drill_PSS_videoRecordingState = "error";
		self._drill_PSS_videoRecordingError = error.message || String(error);
		console.error("[Drill_PictureSnapShot] MP4数据处理失败：", error);
	});
};

//==============================
// * 视频录制 - 生成保存路径
//==============================
Game_Temp.prototype.drill_PSS_makeVideoFilePath = function(settings) {
	var fs = require("fs");
	var path = require("path");
	var root = this.drill_PSS_parentDirectoryPath();
	var dirPath = path.join(root, String(settings.url_path || "save/recording/"));
	if( !fs.existsSync(dirPath) ){
		fs.mkdirSync(dirPath, { recursive: true });
	}
	var now = new Date();
	var pad2 = function(value){ return ("0" + value).slice(-2); };
	var stamp = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate()) +
		"_" + pad2(now.getHours()) + "-" + pad2(now.getMinutes()) + "-" + pad2(now.getSeconds());
	var baseName = this.drill_PSS_sanitizeFileName(String(settings.file_name || "recording") + " " + stamp);
	var filePath = path.join(dirPath, baseName + ".mp4");
	var index = 2;
	while( fs.existsSync(filePath) ){
		filePath = path.join(dirPath, baseName + " " + index + ".mp4");
		index += 1;
	}
	return filePath;
};

//==============================
// * 视频录制 - 清理临时资源
//==============================
Game_Temp.prototype.drill_PSS_cleanupVideoSession = function(session) {
	if( !session || session.closed ){ return; }
	if( session.startedAt && !session.stoppedAt ){
		session.stoppedAt = Date.now();
	}
	session.closed = true;
	if( session.frameRequestId && typeof cancelAnimationFrame !== "undefined" ){
		cancelAnimationFrame(session.frameRequestId);
	}
	if( session.frameTimerId ){
		clearTimeout(session.frameTimerId);
	}
	if( session.audioMasterGain && session.audioDestination ){
		try{ session.audioMasterGain.disconnect(session.audioDestination); }catch(error){}
	}
	if( session.recordStream && session.recordStream.getTracks ){
		var tracks = session.recordStream.getTracks();
		for( var i = 0; i < tracks.length; i++ ){
			try{ tracks[i].stop(); }catch(error){}
		}
	}else if( session.captureStream && session.captureStream.getTracks ){
		var captureTracks = session.captureStream.getTracks();
		for( var j = 0; j < captureTracks.length; j++ ){
			try{ captureTracks[j].stop(); }catch(error){}
		}
	}
	this.drill_PSS_hideVideoRecordingIndicator(session);
	session.cropContext = null;
	session.cropCanvas = null;
};

//==============================
// * 视频录制 - 录制边框
//==============================
Game_Temp.prototype.drill_PSS_showVideoRecordingIndicator = function(session) {
	if( !session.settings.show_border || !document.body ){ return; }
	var indicator = document.createElement("div");
	Object.assign(indicator.style, {
		position: "fixed",
		zIndex: "99997",
		boxSizing: "border-box",
		border: "3px solid rgba(255,45,45,0.95)",
		boxShadow: "inset 0 0 12px rgba(255,30,30,0.35), 0 0 8px rgba(255,30,30,0.55)",
		pointerEvents: "none"
	});
	var label = document.createElement("div");
	label.textContent = "● REC MP4";
	Object.assign(label.style, {
		position: "absolute",
		left: "6px",
		top: "6px",
		padding: "3px 7px",
		borderRadius: "4px",
		background: "rgba(175,0,0,0.88)",
		color: "#fff",
		font: "bold 12px Arial, sans-serif"
	});
	indicator.appendChild(label);
	document.body.appendChild(indicator);
	session.indicator = indicator;
	var self = this;
	session.boundIndicatorUpdate = function(){ self.drill_PSS_updateVideoRecordingIndicator(session); };
	window.addEventListener("resize", session.boundIndicatorUpdate);
	document.addEventListener("fullscreenchange", session.boundIndicatorUpdate);
	this.drill_PSS_updateVideoRecordingIndicator(session);
};

Game_Temp.prototype.drill_PSS_updateVideoRecordingIndicator = function(session) {
	if( !session || !session.indicator || !session.sourceCanvas ){ return; }
	var rect = session.sourceCanvas.getBoundingClientRect();
	var ratio = session.regionRatio || { x: 0, y: 0, w: 1, h: 1 };
	Object.assign(session.indicator.style, {
		left: (rect.left + rect.width * ratio.x) + "px",
		top: (rect.top + rect.height * ratio.y) + "px",
		width: (rect.width * ratio.w) + "px",
		height: (rect.height * ratio.h) + "px"
	});
};

Game_Temp.prototype.drill_PSS_hideVideoRecordingIndicator = function(session) {
	if( !session ){ return; }
	if( session.boundIndicatorUpdate ){
		window.removeEventListener("resize", session.boundIndicatorUpdate);
		document.removeEventListener("fullscreenchange", session.boundIndicatorUpdate);
	}
	if( session.indicator && session.indicator.parentNode ){
		session.indicator.parentNode.removeChild(session.indicator);
	}
	session.indicator = null;
	session.boundIndicatorUpdate = null;
};

//=============================================================================
// ** 自由选区控制器
//=============================================================================
function Drill_PSS_RegionSelector(){
	this.initialize.apply(this, arguments);
}
Drill_PSS_RegionSelector._instance = null;

Drill_PSS_RegionSelector.prototype.initialize = function(gameTemp, saveAfterCapture, mode) {
	this._gameTemp = gameTemp;
	this._saveAfterCapture = saveAfterCapture;
	this._mode = mode || "snapshot";
	this._overlay = null;
	this._regionBox = null;
	this._sizeLabel = null;
	this._canvasRect = null;
	this._region = null;
	this._dragData = null;
	this._minSize = 32;
	this._closed = false;
	this._boundPointerDown = this.onPointerDown.bind(this);
	this._boundPointerMove = this.onPointerMove.bind(this);
	this._boundPointerUp = this.onPointerUp.bind(this);
	this._boundKeyDown = this.onKeyDown.bind(this);
	this._boundKeyUp = this.blockKeyUp.bind(this);
	this._boundResize = this.onResize.bind(this);
	this._boundBlockMouse = this.blockMouseEvent.bind(this);
	this._boundBlockTouch = this.blockTouchEvent.bind(this);
};

//==============================
// * 自由选区控制器 - 打开
//==============================
Drill_PSS_RegionSelector.prototype.open = function() {
	if( !Graphics || !Graphics._canvas || !document.body ){ return false; }
	this.updateCanvasRect();
	if( this._canvasRect.width <= 0 || this._canvasRect.height <= 0 ){ return false; }

	this.createOverlay();
	this.createRegionBox();
	this.createToolbar();
	this.restoreRegion();
	this.updateRegionBox();
	this.addEventListeners();
	if( typeof Input !== "undefined" ){ Input.clear(); }
	if( typeof TouchInput !== "undefined" ){ TouchInput.clear(); }
	return true;
};

//==============================
// * 自由选区控制器 - 创建覆盖层
//==============================
Drill_PSS_RegionSelector.prototype.createOverlay = function() {
	var overlay = document.createElement("div");
	overlay.id = "drill-pss-region-overlay";
	Object.assign(overlay.style, {
		position: "fixed",
		zIndex: "99998",
		overflow: "hidden",
		userSelect: "none",
		touchAction: "none",
		cursor: "crosshair",
		fontFamily: "Arial, 'Microsoft YaHei', sans-serif"
	});
	this._overlay = overlay;
	this.updateOverlayBounds();
	document.body.appendChild(overlay);
};

//==============================
// * 自由选区控制器 - 创建选框
//==============================
Drill_PSS_RegionSelector.prototype.createRegionBox = function() {
	var box = document.createElement("div");
	box.className = "drill-pss-region-box";
	Object.assign(box.style, {
		position: "absolute",
		boxSizing: "border-box",
		border: "2px solid #55aaff",
		boxShadow: "0 0 0 99999px rgba(0,0,0,0.56), 0 0 12px rgba(45,150,255,0.9)",
		cursor: "move"
	});

	var label = document.createElement("div");
	Object.assign(label.style, {
		position: "absolute",
		left: "6px",
		top: "6px",
		padding: "3px 7px",
		borderRadius: "4px",
		background: "rgba(0,0,0,0.72)",
		color: "#fff",
		fontSize: "12px",
		lineHeight: "18px",
		whiteSpace: "nowrap",
		pointerEvents: "none"
	});
	box.appendChild(label);
	this._sizeLabel = label;

	var handles = ["nw", "n", "ne", "w", "e", "sw", "s", "se"];
	for( var i = 0; i < handles.length; i++ ){
		box.appendChild(this.createHandle(handles[i]));
	}
	this._regionBox = box;
	this._overlay.appendChild(box);
};

//==============================
// * 自由选区控制器 - 创建控制点
//==============================
Drill_PSS_RegionSelector.prototype.createHandle = function(direction) {
	var size = 14;
	var half = -size / 2;
	var handle = document.createElement("div");
	handle.className = "drill-pss-region-handle";
	handle.dataset.direction = direction;
	Object.assign(handle.style, {
		position: "absolute",
		width: size + "px",
		height: size + "px",
		boxSizing: "border-box",
		background: "#fff",
		border: "2px solid #2f91ed",
		borderRadius: "3px",
		boxShadow: "0 1px 4px rgba(0,0,0,0.65)",
		cursor: direction + "-resize"
	});

	if( direction.indexOf("n") !== -1 ){ handle.style.top = half + "px"; }
	if( direction.indexOf("s") !== -1 ){ handle.style.bottom = half + "px"; }
	if( direction.indexOf("w") !== -1 ){ handle.style.left = half + "px"; }
	if( direction.indexOf("e") !== -1 ){ handle.style.right = half + "px"; }
	if( direction === "n" || direction === "s" ){
		handle.style.left = "50%";
		handle.style.marginLeft = half + "px";
	}
	if( direction === "w" || direction === "e" ){
		handle.style.top = "50%";
		handle.style.marginTop = half + "px";
	}
	return handle;
};

//==============================
// * 自由选区控制器 - 创建操作栏
//==============================
Drill_PSS_RegionSelector.prototype.createToolbar = function() {
	var toolbar = document.createElement("div");
	Object.assign(toolbar.style, {
		position: "absolute",
		left: "50%",
		bottom: "18px",
		transform: "translateX(-50%)",
		display: "flex",
		alignItems: "center",
		gap: "9px",
		maxWidth: "calc(100% - 24px)",
		padding: "9px 11px",
		boxSizing: "border-box",
		border: "1px solid rgba(255,255,255,0.22)",
		borderRadius: "9px",
		background: "rgba(18,22,28,0.92)",
		boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
		color: "#fff",
		fontSize: "13px",
		whiteSpace: "nowrap",
		cursor: "default"
	});

	var help = document.createElement("span");
	help.textContent = "拖动选框/控制点 · Shift锁定比例 · Enter确认 · Esc取消";
	help.style.opacity = "0.86";
	toolbar.appendChild(help);

	var confirmText = this._mode === "video" ? "开始录制" :
		(this._saveAfterCapture ? "截图并保存" : "建立快照");
	var confirmButton = this.createButton(
		confirmText,
		"confirm",
		"#2388e8"
	);
	var cancelButton = this.createButton("取消", "cancel", "#555d68");
	toolbar.appendChild(confirmButton);
	toolbar.appendChild(cancelButton);
	this._overlay.appendChild(toolbar);
};

Drill_PSS_RegionSelector.prototype.createButton = function(text, action, color) {
	var button = document.createElement("button");
	button.type = "button";
	button.dataset.drillPssAction = action;
	button.textContent = text;
	Object.assign(button.style, {
		padding: "6px 12px",
		border: "0",
		borderRadius: "5px",
		background: color,
		color: "#fff",
		fontSize: "13px",
		fontWeight: "bold",
		cursor: "pointer"
	});
	var self = this;
	button.addEventListener("click", function(event){
		event.preventDefault();
		event.stopPropagation();
		if( action === "confirm" ){
			self.confirm();
		}else{
			self.cancel();
		}
	});
	return button;
};

//==============================
// * 自由选区控制器 - 还原上次范围
//==============================
Drill_PSS_RegionSelector.prototype.restoreRegion = function() {
	var width = this._canvasRect.width;
	var height = this._canvasRect.height;
	var ratio = this._gameTemp._drill_PSS_regionRatio;
	if( !ratio ){
		ratio = { x: 0.08, y: 0.08, w: 0.84, h: 0.84 };
	}
	this._region = {
		x: this.clamp(ratio.x * width, 0, width - this._minSize),
		y: this.clamp(ratio.y * height, 0, height - this._minSize),
		w: Math.max(this._minSize, ratio.w * width),
		h: Math.max(this._minSize, ratio.h * height)
	};
	this._region.w = Math.min(this._region.w, width - this._region.x);
	this._region.h = Math.min(this._region.h, height - this._region.y);
};

//==============================
// * 自由选区控制器 - 事件绑定
//==============================
Drill_PSS_RegionSelector.prototype.addEventListeners = function() {
	this._overlay.addEventListener("pointerdown", this._boundPointerDown);
	this._overlay.addEventListener("pointermove", this._boundPointerMove);
	this._overlay.addEventListener("pointerup", this._boundPointerUp);
	this._overlay.addEventListener("pointercancel", this._boundPointerUp);
	this._overlay.addEventListener("mousedown", this._boundBlockMouse);
	this._overlay.addEventListener("mousemove", this._boundBlockMouse);
	this._overlay.addEventListener("mouseup", this._boundBlockMouse);
	this._overlay.addEventListener("wheel", this._boundBlockTouch, { passive: false });
	this._overlay.addEventListener("touchstart", this._boundBlockTouch, { passive: false });
	this._overlay.addEventListener("touchmove", this._boundBlockTouch, { passive: false });
	this._overlay.addEventListener("touchend", this._boundBlockTouch, { passive: false });
	this._overlay.addEventListener("contextmenu", this._boundBlockTouch);
	document.addEventListener("keydown", this._boundKeyDown, true);
	document.addEventListener("keyup", this._boundKeyUp, true);
	window.addEventListener("resize", this._boundResize);
};

Drill_PSS_RegionSelector.prototype.removeEventListeners = function() {
	if( !this._overlay ){ return; }
	this._overlay.removeEventListener("pointerdown", this._boundPointerDown);
	this._overlay.removeEventListener("pointermove", this._boundPointerMove);
	this._overlay.removeEventListener("pointerup", this._boundPointerUp);
	this._overlay.removeEventListener("pointercancel", this._boundPointerUp);
	this._overlay.removeEventListener("mousedown", this._boundBlockMouse);
	this._overlay.removeEventListener("mousemove", this._boundBlockMouse);
	this._overlay.removeEventListener("mouseup", this._boundBlockMouse);
	this._overlay.removeEventListener("wheel", this._boundBlockTouch);
	this._overlay.removeEventListener("touchstart", this._boundBlockTouch);
	this._overlay.removeEventListener("touchmove", this._boundBlockTouch);
	this._overlay.removeEventListener("touchend", this._boundBlockTouch);
	this._overlay.removeEventListener("contextmenu", this._boundBlockTouch);
	document.removeEventListener("keydown", this._boundKeyDown, true);
	document.removeEventListener("keyup", this._boundKeyUp, true);
	window.removeEventListener("resize", this._boundResize);
};

//==============================
// * 自由选区控制器 - 屏蔽游戏输入
//==============================
Drill_PSS_RegionSelector.prototype.blockMouseEvent = function(event) {
	event.stopPropagation();
};
Drill_PSS_RegionSelector.prototype.blockTouchEvent = function(event) {
	if( event.cancelable ){ event.preventDefault(); }
	event.stopPropagation();
};
Drill_PSS_RegionSelector.prototype.blockKeyUp = function(event) {
	event.preventDefault();
	event.stopImmediatePropagation();
};

//==============================
// * 自由选区控制器 - 鼠标/触屏按下
//==============================
Drill_PSS_RegionSelector.prototype.onPointerDown = function(event) {
	if( this._closed || event.button > 0 ){ return; }
	if( event.target.closest && event.target.closest("[data-drill-pss-action]") ){
		event.stopPropagation();
		return;
	}
	event.preventDefault();
	event.stopPropagation();

	var handleElement = event.target.closest ? event.target.closest(".drill-pss-region-handle") : null;
	var handle = handleElement ? handleElement.dataset.direction : null;
	if( !handle && this._regionBox.contains(event.target) ){
		handle = "move";
	}
	if( !handle ){ return; }

	this._dragData = {
		handle: handle,
		pointerId: event.pointerId,
		mx: event.clientX,
		my: event.clientY,
		region: Object.assign({}, this._region),
		ratio: this._region.w / this._region.h
	};
	if( this._overlay.setPointerCapture ){
		this._overlay.setPointerCapture(event.pointerId);
	}
};

//==============================
// * 自由选区控制器 - 鼠标/触屏移动
//==============================
Drill_PSS_RegionSelector.prototype.onPointerMove = function(event) {
	if( !this._dragData || event.pointerId !== this._dragData.pointerId ){ return; }
	event.preventDefault();
	event.stopPropagation();
	var dx = event.clientX - this._dragData.mx;
	var dy = event.clientY - this._dragData.my;
	if( this._dragData.handle === "move" ){
		this.moveRegion(dx, dy);
	}else if( event.shiftKey ){
		this.resizeRegionWithRatio(dx, dy);
	}else{
		this.resizeRegion(dx, dy);
	}
	this.updateRegionBox();
};

Drill_PSS_RegionSelector.prototype.onPointerUp = function(event) {
	if( !this._dragData || event.pointerId !== this._dragData.pointerId ){ return; }
	event.preventDefault();
	event.stopPropagation();
	if( this._overlay.releasePointerCapture ){
		try{ this._overlay.releasePointerCapture(event.pointerId); }catch(e){}
	}
	this._dragData = null;
};

//==============================
// * 自由选区控制器 - 移动选框
//==============================
Drill_PSS_RegionSelector.prototype.moveRegion = function(dx, dy) {
	var start = this._dragData.region;
	this._region.x = this.clamp(start.x + dx, 0, this._canvasRect.width - start.w);
	this._region.y = this.clamp(start.y + dy, 0, this._canvasRect.height - start.h);
	this._region.w = start.w;
	this._region.h = start.h;
};

//==============================
// * 自由选区控制器 - 自由缩放
//==============================
Drill_PSS_RegionSelector.prototype.resizeRegion = function(dx, dy) {
	var start = this._dragData.region;
	var handle = this._dragData.handle;
	var right = start.x + start.w;
	var bottom = start.y + start.h;
	var region = Object.assign({}, start);

	if( handle.indexOf("w") !== -1 ){
		region.x = this.clamp(start.x + dx, 0, right - this._minSize);
		region.w = right - region.x;
	}
	if( handle.indexOf("e") !== -1 ){
		region.w = this.clamp(start.w + dx, this._minSize, this._canvasRect.width - start.x);
	}
	if( handle.indexOf("n") !== -1 ){
		region.y = this.clamp(start.y + dy, 0, bottom - this._minSize);
		region.h = bottom - region.y;
	}
	if( handle.indexOf("s") !== -1 ){
		region.h = this.clamp(start.h + dy, this._minSize, this._canvasRect.height - start.y);
	}
	this._region = region;
};

//==============================
// * 自由选区控制器 - 等比缩放
//==============================
Drill_PSS_RegionSelector.prototype.resizeRegionWithRatio = function(dx, dy) {
	var start = this._dragData.region;
	var handle = this._dragData.handle;
	var ratio = this._dragData.ratio;
	var hasHorizontal = handle.indexOf("w") !== -1 || handle.indexOf("e") !== -1;
	var hasVertical = handle.indexOf("n") !== -1 || handle.indexOf("s") !== -1;

	if( hasHorizontal && hasVertical ){
		this.resizeCornerWithRatio(start, handle, dx, dy, ratio);
	}else if( hasHorizontal ){
		this.resizeHorizontalWithRatio(start, handle, dx, ratio);
	}else if( hasVertical ){
		this.resizeVerticalWithRatio(start, handle, dy, ratio);
	}
};

Drill_PSS_RegionSelector.prototype.resizeCornerWithRatio = function(start, handle, dx, dy, ratio) {
	var widthByMouse = handle.indexOf("e") !== -1 ? start.w + dx : start.w - dx;
	var heightByMouse = handle.indexOf("s") !== -1 ? start.h + dy : start.h - dy;
	var scaleX = widthByMouse / start.w;
	var scaleY = heightByMouse / start.h;
	var scale = Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY;
	var anchorX = handle.indexOf("w") !== -1 ? start.x + start.w : start.x;
	var anchorY = handle.indexOf("n") !== -1 ? start.y + start.h : start.y;
	var maxWidth = handle.indexOf("w") !== -1 ? anchorX : this._canvasRect.width - anchorX;
	var maxHeight = handle.indexOf("n") !== -1 ? anchorY : this._canvasRect.height - anchorY;
	var minScale = Math.max(this._minSize / start.w, this._minSize / start.h);
	var maxScale = Math.min(maxWidth / start.w, maxHeight / start.h);
	scale = this.clamp(scale, minScale, maxScale);
	var width = start.w * scale;
	var height = start.h * scale;
	this._region = {
		x: handle.indexOf("w") !== -1 ? anchorX - width : anchorX,
		y: handle.indexOf("n") !== -1 ? anchorY - height : anchorY,
		w: width,
		h: height
	};
};

Drill_PSS_RegionSelector.prototype.resizeHorizontalWithRatio = function(start, handle, dx, ratio) {
	var widthByMouse = handle === "e" ? start.w + dx : start.w - dx;
	var anchorX = handle === "w" ? start.x + start.w : start.x;
	var centerY = start.y + start.h / 2;
	var maxWidthByX = handle === "w" ? anchorX : this._canvasRect.width - anchorX;
	var maxHeight = Math.min(centerY, this._canvasRect.height - centerY) * 2;
	var maxWidth = Math.min(maxWidthByX, maxHeight * ratio);
	var width = this.clamp(widthByMouse, this._minSize, maxWidth);
	var height = width / ratio;
	this._region = {
		x: handle === "w" ? anchorX - width : anchorX,
		y: centerY - height / 2,
		w: width,
		h: height
	};
};

Drill_PSS_RegionSelector.prototype.resizeVerticalWithRatio = function(start, handle, dy, ratio) {
	var heightByMouse = handle === "s" ? start.h + dy : start.h - dy;
	var anchorY = handle === "n" ? start.y + start.h : start.y;
	var centerX = start.x + start.w / 2;
	var maxHeightByY = handle === "n" ? anchorY : this._canvasRect.height - anchorY;
	var maxWidth = Math.min(centerX, this._canvasRect.width - centerX) * 2;
	var maxHeight = Math.min(maxHeightByY, maxWidth / ratio);
	var height = this.clamp(heightByMouse, this._minSize, maxHeight);
	var width = height * ratio;
	this._region = {
		x: centerX - width / 2,
		y: handle === "n" ? anchorY - height : anchorY,
		w: width,
		h: height
	};
};

//==============================
// * 自由选区控制器 - 键盘操作
//==============================
Drill_PSS_RegionSelector.prototype.onKeyDown = function(event) {
	if( this._closed ){ return; }
	event.preventDefault();
	event.stopImmediatePropagation();
	if( event.key === "Enter" ){
		this.confirm();
		return;
	}
	if( event.key === "Escape" ){
		this.cancel();
		return;
	}
	var step = event.shiftKey ? 10 : 1;
	if( event.key === "ArrowLeft" ){
		this._region.x = this.clamp(this._region.x - step, 0, this._canvasRect.width - this._region.w);
	}else if( event.key === "ArrowRight" ){
		this._region.x = this.clamp(this._region.x + step, 0, this._canvasRect.width - this._region.w);
	}else if( event.key === "ArrowUp" ){
		this._region.y = this.clamp(this._region.y - step, 0, this._canvasRect.height - this._region.h);
	}else if( event.key === "ArrowDown" ){
		this._region.y = this.clamp(this._region.y + step, 0, this._canvasRect.height - this._region.h);
	}else{
		return;
	}
	this.updateRegionBox();
};

//==============================
// * 自由选区控制器 - 画布缩放适配
//==============================
Drill_PSS_RegionSelector.prototype.onResize = function() {
	if( this._closed ){ return; }
	var ratio = this.makeRegionRatio();
	this.updateCanvasRect();
	this.updateOverlayBounds();
	this._gameTemp._drill_PSS_regionRatio = ratio;
	this.restoreRegion();
	this.updateRegionBox();
};

Drill_PSS_RegionSelector.prototype.updateCanvasRect = function() {
	var rect = Graphics._canvas.getBoundingClientRect();
	this._canvasRect = {
		left: rect.left,
		top: rect.top,
		width: rect.width,
		height: rect.height
	};
};

Drill_PSS_RegionSelector.prototype.updateOverlayBounds = function() {
	if( !this._overlay || !this._canvasRect ){ return; }
	Object.assign(this._overlay.style, {
		left: this._canvasRect.left + "px",
		top: this._canvasRect.top + "px",
		width: this._canvasRect.width + "px",
		height: this._canvasRect.height + "px"
	});
};

//==============================
// * 自由选区控制器 - 刷新选框
//==============================
Drill_PSS_RegionSelector.prototype.updateRegionBox = function() {
	if( !this._regionBox || !this._region ){ return; }
	var region = this._region;
	Object.assign(this._regionBox.style, {
		left: region.x + "px",
		top: region.y + "px",
		width: region.w + "px",
		height: region.h + "px"
	});
	var pixelWidth = Math.max(1, Math.round(region.w * Graphics.width / this._canvasRect.width));
	var pixelHeight = Math.max(1, Math.round(region.h * Graphics.height / this._canvasRect.height));
	var divisor = this.greatestCommonDivisor(pixelWidth, pixelHeight);
	this._sizeLabel.textContent = pixelWidth + " × " + pixelHeight + "  (" +
		(pixelWidth / divisor) + ":" + (pixelHeight / divisor) + ")";
};

//==============================
// * 自由选区控制器 - 确认/取消/关闭
//==============================
Drill_PSS_RegionSelector.prototype.confirm = function() {
	if( this._closed ){ return; }
	if( this._mode === "video" ){
		var region = Object.assign({}, this._region);
		var selectorWidth = this._canvasRect.width;
		var selectorHeight = this._canvasRect.height;
		this._gameTemp._drill_PSS_videoRecordingState = "idle";
		this.close();
		var started = this._gameTemp.drill_PSS_startVideoRecording({
			region: region,
			selectorWidth: selectorWidth,
			selectorHeight: selectorHeight
		});
		if( typeof SoundManager !== "undefined" ){
			if( started ){ SoundManager.playOk(); }
			else{ SoundManager.playBuzzer(); }
		}
		return;
	}
	var snapshotId = -1;
	try{
		snapshotId = this._gameTemp.drill_PSS_createRegionSnapshot(
			this._region,
			this._canvasRect.width,
			this._canvasRect.height
		);
	}catch(error){
		console.error("[Drill_PictureSnapShot] 自由选区截图失败：", error);
		this._gameTemp._drill_PSS_regionSelectorState = "error";
		this.close();
		if( typeof SoundManager !== "undefined" ){ SoundManager.playBuzzer(); }
		return;
	}
	if( snapshotId < 0 ){
		this._gameTemp._drill_PSS_regionSelectorState = "error";
		this.close();
		if( typeof SoundManager !== "undefined" ){ SoundManager.playBuzzer(); }
		return;
	}

	this._gameTemp._drill_PSS_regionSelectorState = "captured";
	this.close();
	if( this._saveAfterCapture ){
		try{
			this._gameTemp.drill_PSS_saveSnapshot();
		}catch(error){
			console.error("[Drill_PictureSnapShot] 自由选区快照保存失败：", error);
			if( typeof SoundManager !== "undefined" ){ SoundManager.playBuzzer(); }
			return;
		}
	}
	if( typeof SoundManager !== "undefined" ){ SoundManager.playOk(); }
};

Drill_PSS_RegionSelector.prototype.cancel = function() {
	if( this._closed ){ return; }
	if( this._mode === "video" ){
		this._gameTemp._drill_PSS_videoRecordingState = "cancelled";
	}else{
		this._gameTemp._drill_PSS_regionSelectorState = "cancelled";
	}
	this.close();
	if( typeof SoundManager !== "undefined" ){ SoundManager.playCancel(); }
};

Drill_PSS_RegionSelector.prototype.close = function() {
	if( this._closed ){ return; }
	this._closed = true;
	if( this._mode === "video" ){
		if( this._gameTemp._drill_PSS_videoRecordingState === "selecting" ){
			this._gameTemp._drill_PSS_videoRecordingState = "cancelled";
		}
	}else if( this._gameTemp._drill_PSS_regionSelectorState === "selecting" ){
		this._gameTemp._drill_PSS_regionSelectorState = "cancelled";
	}
	this._gameTemp._drill_PSS_regionRatio = this.makeRegionRatio();
	this.removeEventListeners();
	if( this._overlay && this._overlay.parentNode ){
		this._overlay.parentNode.removeChild(this._overlay);
	}
	this._overlay = null;
	this._regionBox = null;
	this._dragData = null;
	Drill_PSS_RegionSelector._instance = null;
	if( typeof Input !== "undefined" ){ Input.clear(); }
	if( typeof TouchInput !== "undefined" ){ TouchInput.clear(); }
};

//==============================
// * 自由选区控制器 - 工具函数
//==============================
Drill_PSS_RegionSelector.prototype.makeRegionRatio = function() {
	if( !this._region || !this._canvasRect || this._canvasRect.width <= 0 || this._canvasRect.height <= 0 ){
		return null;
	}
	return {
		x: this._region.x / this._canvasRect.width,
		y: this._region.y / this._canvasRect.height,
		w: this._region.w / this._canvasRect.width,
		h: this._region.h / this._canvasRect.height
	};
};

Drill_PSS_RegionSelector.prototype.clamp = function(value, min, max) {
	if( max < min ){ return min; }
	return Math.max(min, Math.min(max, value));
};

Drill_PSS_RegionSelector.prototype.greatestCommonDivisor = function(a, b) {
	a = Math.max(1, Math.round(a));
	b = Math.max(1, Math.round(b));
	while( b !== 0 ){
		var temp = b;
		b = a % b;
		a = temp;
	}
	return a;
};


//=============================================================================
// ** ☆图片控制
//
//			说明：	> 此模块将 静态快照与图片贴图 进行绑定。
//					（插件完整的功能目录去看看：功能结构树）
//=============================================================================
//==============================
// * 图片控制 - 初始化基本信息
//==============================
var _drill_PSS_p_initBasic = Game_Picture.prototype.initBasic;
Game_Picture.prototype.initBasic = function() {
	_drill_PSS_p_initBasic.call(this);
	this._drill_PSS_snapShotId = -1;		//截图标记
}
//==============================
// * 图片控制 - 显示图片（对应函数showPicture）
//==============================
var _drill_PSS_p_show = Game_Picture.prototype.show;
Game_Picture.prototype.show = function( name, origin, x, y, scaleX, scaleY, opacity, blendMode ){
	_drill_PSS_p_show.call( this, name, origin, x, y, scaleX, scaleY, opacity, blendMode );
	this._drill_PSS_snapShotId = -1;		//（标记解除）
}
//==============================
// * 图片控制 - 消除图片（对应函数erasePicture）
//==============================
var _drill_PSS_p_erase = Game_Picture.prototype.erase;
Game_Picture.prototype.erase = function(){
	_drill_PSS_p_erase.call( this );
	this._drill_PSS_snapShotId = -1;		//（标记解除）
}
//==============================
// * 图片控制 - 贴图 初始化
//==============================
var _drill_PSS_sp_initialize = Sprite_Picture.prototype.initialize;
Sprite_Picture.prototype.initialize = function( pictureId ){
	_drill_PSS_sp_initialize.call( this, pictureId );
	this._drill_PSS_sp_curSnapshotId = -1;
}
//==============================
// * 图片控制 - 贴图 帧刷新
//
//			说明：	> 此帧刷新内的操作会延迟1帧，插件指令操作最好立即赋值。
//==============================
var _drill_PSS_sp_updateBitmap = Sprite_Picture.prototype.updateBitmap;
Sprite_Picture.prototype.updateBitmap = function() {
	_drill_PSS_sp_updateBitmap.call(this);
	
	// > 有数据时
    var picture = this.picture();
    if( picture ){
		
		if( this._drill_PSS_sp_curSnapshotId == picture._drill_PSS_snapShotId ){ return; }
		this._drill_PSS_sp_curSnapshotId = picture._drill_PSS_snapShotId;
		this.drill_PSS_setSnapshot( picture._drill_PSS_snapShotId );	//（ID不一致时，赋值）
		
	// > 无数据时『图片数据根除时』
	}else{
		if( this._drill_PSS_sp_curSnapshotId != -1 ){	//（恢复图像）
			this.drill_PSS_setSnapshot( -1 );
		}
	}
};
//==============================
// * 图片控制 - 贴图 绑定快照
//==============================
Sprite_Picture.prototype.drill_PSS_setSnapshot = function( snapshot_id ){
	this._drill_PSS_sp_curSnapshotId = snapshot_id;
	
	// > 恢复原图像
	if( snapshot_id == -1 ){
		this._pictureName = '';
		this.bitmap = null;
		return;
	}
	
	// > 设置静态快照
	var bitmap = $gameTemp._drill_PSS_snapShotTank[ snapshot_id ];
	if( bitmap == undefined ){ return; }
	this.bitmap = bitmap;
}


//=============================================================================
// ** ☆保存快照文件
//
//			说明：	> 此模块提供 保存 静态快照文件 功能。
//					（插件完整的功能目录去看看：功能结构树）
//=============================================================================
//==============================
// * 保存快照文件 - 保存到文件
//==============================
/*
Game_Temp.prototype.drill_PSS_saveSnapshot = function() {
    
	// > 资源对象
	var bitmap = this.drill_PSS_getLastSnapshot();
	if( bitmap == null ){ return; }
	
	// > 名称设置
	var settings = DrillUp.g_PSS_fileSettings;
	var file_name = settings['file_name'];
	if( settings['file_name_with_date'] == true ){
		file_name += " ";
		file_name += new Date().drill_PSS_getDateTextByFormat("yyyy年MM月dd日");
	}
	if( settings['file_name_with_time'] == true ){
		file_name += " ";
		file_name += new Date().drill_PSS_getDateTextByFormat("HH时mm分ss秒");
	}
	
	// > 执行保存
	this.drill_PSS_saveBitmap( bitmap, settings['url_path'], file_name, settings['file_type'], settings['image_quality'] );
};
*/
Game_Temp.prototype.drill_PSS_saveSnapshot = function() {

    this._drill_PSS_lastSnapshotPath = "";

	// > Web/Android只保留内存快照，不调用Node.js文件接口
	if( typeof Utils === "undefined" || !Utils.isNwjs || !Utils.isNwjs() ){
		return "";
	}

    // > 资源对象
    var bitmap = this.drill_PSS_getLastSnapshot();
    if( bitmap == null ){ return ""; }

    // > 名称设置
    var settings = DrillUp.g_PSS_fileSettings;
    var file_name = settings['file_name'] || "Snapshot";

    // 英文/国际通用格式（文件名安全）
    if( settings['file_name_with_date'] === true ){
        file_name += " " + new Date().drill_PSS_getStamp_EN("date");
    }
    if( settings['file_name_with_time'] === true ){
        file_name += " " + new Date().drill_PSS_getStamp_EN("time");
    }

    // 清理非法字符，避免保存失败
    file_name = this.drill_PSS_sanitizeFileName(file_name);

    // > 执行保存
    var filePath = this.drill_PSS_saveBitmap(
        bitmap,
        settings['url_path'],
        file_name,
        settings['file_type'],
        settings['image_quality']
    );
    this._drill_PSS_lastSnapshotPath = filePath || "";
    return this._drill_PSS_lastSnapshotPath;
};

//==============================
// * 保存快照文件 - Android支持检查
//==============================
Game_Temp.prototype.drill_PSS_isAndroidSnapshotSaveSupported = function() {
	return typeof window !== "undefined" &&
		typeof window.cordova !== "undefined" &&
		window.cordova.file &&
		window.cordova.file.externalRootDirectory &&
		typeof window.resolveLocalFileSystemURL === "function";
};

//==============================
// * 保存快照文件 - Android建立目录
//==============================
Game_Temp.prototype.drill_PSS_getAndroidSnapshotDirectory = function() {
	return new Promise(function(resolve, reject) {
		window.resolveLocalFileSystemURL(
			window.cordova.file.externalRootDirectory,
			resolve,
			reject
		);
	}).then(function(root) {
		return new Promise(function(resolve, reject) {
			root.getDirectory("Documents", { create: true }, resolve, reject);
		});
	}).then(function(documents) {
		return new Promise(function(resolve, reject) {
			documents.getDirectory("sister_save", { create: true }, resolve, reject);
		});
	}).then(function(saveDirectory) {
		return new Promise(function(resolve, reject) {
			saveDirectory.getDirectory("snapshot", { create: true }, resolve, reject);
		});
	});
};

//==============================
// * 保存快照文件 - Android生成Blob
//==============================
Game_Temp.prototype.drill_PSS_createAndroidSnapshotBlob = function(bitmap, fileType, imageQuality) {
	return new Promise(function(resolve, reject) {
		var canvas = bitmap && bitmap.canvas;
		if( !canvas || typeof canvas.toBlob !== "function" ){
			reject(new Error("当前WebView不支持Canvas.toBlob。"));
			return;
		}
		var mimeType = fileType === "jpg" ? "image/jpeg" : "image/png";
		var quality = Math.max(0, Math.min(Number(imageQuality || 100), 100)) * 0.01;
		canvas.toBlob(function(blob) {
			if( blob ){ resolve(blob); }
			else{ reject(new Error("无法生成截图Blob。")); }
		}, mimeType, quality);
	});
};

//==============================
// * 保存快照文件 - Android建立不重名文件
//==============================
Game_Temp.prototype.drill_PSS_createUniqueAndroidSnapshotFile = function(directory, baseName, extension) {
	return new Promise(function(resolve, reject) {
		var tryCreate = function(index) {
			var suffix = index <= 1 ? "" : " " + String(index);
			var fileName = baseName + suffix + "." + extension;
			directory.getFile(fileName, { create: true, exclusive: true }, function(entry) {
				resolve({ entry: entry, fileName: fileName });
			}, function(error) {
				var pathExistsCode = typeof FileError !== "undefined"
					? FileError.PATH_EXISTS_ERR
					: 12;
				if( error && error.code === pathExistsCode && index < 1000 ){
					tryCreate(index + 1);
				}else{
					reject(error || new Error("无法建立Android截图文件。"));
				}
			});
		};
		tryCreate(1);
	});
};

//==============================
// * 保存快照文件 - Android写入Blob
//==============================
Game_Temp.prototype.drill_PSS_writeAndroidSnapshotBlob = function(fileData, blob) {
	return new Promise(function(resolve, reject) {
		fileData.entry.createWriter(function(writer) {
			var finished = false;
			writer.onwriteend = function() {
				if( finished ){ return; }
				finished = true;
				resolve("Documents/sister_save/snapshot/" + fileData.fileName);
			};
			writer.onerror = function(error) {
				if( finished ){ return; }
				finished = true;
				try{ fileData.entry.remove(function(){}, function(){}); }catch(e){}
				reject(error || writer.error || new Error("Android截图写入失败。"));
			};
			try{
				writer.write(blob);
			}catch(error){
				writer.onerror(error);
			}
		}, reject);
	});
};

//==============================
// * 保存快照文件 - Android保存到Documents/sister_save/snapshot
//==============================
Game_Temp.prototype.drill_PSS_saveSnapshotAndroid = function() {
	this._drill_PSS_lastSnapshotPath = "";
	if( !this.drill_PSS_isAndroidSnapshotSaveSupported() ){
		return Promise.reject(new Error("Android文件保存接口不可用。"));
	}
	var bitmap = this.drill_PSS_getLastSnapshot();
	if( !bitmap ){
		return Promise.reject(new Error("没有可保存的快照。"));
	}
	var settings = DrillUp.g_PSS_fileSettings;
	var fileName = settings['file_name'] || "Snapshot";
	if( settings['file_name_with_date'] === true ){
		fileName += " " + new Date().drill_PSS_getStamp_EN("date");
	}
	if( settings['file_name_with_time'] === true ){
		fileName += " " + new Date().drill_PSS_getStamp_EN("time");
	}
	fileName = this.drill_PSS_sanitizeFileName(fileName);
	var fileType = settings['file_type'] === "jpg" ? "jpg" : "png";
	var self = this;
	return Promise.all([
		this.drill_PSS_getAndroidSnapshotDirectory(),
		this.drill_PSS_createAndroidSnapshotBlob(
			bitmap,
			fileType,
			settings['image_quality']
		)
	]).then(function(result) {
		return self.drill_PSS_createUniqueAndroidSnapshotFile(
			result[0],
			fileName,
			fileType
		).then(function(fileData) {
			return self.drill_PSS_writeAndroidSnapshotBlob(fileData, result[1]);
		});
	}).then(function(path) {
		self._drill_PSS_lastSnapshotPath = path;
		return path;
	});
};

//==============================
// * 保存快照文件 - Android尝试打开截图目录（失败时静默）
//==============================
Game_Temp.prototype.drill_PSS_openAndroidSnapshotDirectory = function() {
	try{
		var snapshotUri =
			"content://com.android.externalstorage.documents/document/" +
			"primary%3ADocuments%2Fsister_save%2Fsnapshot";
		// 当前Android工程的Intent插件通过<clobbers target="intentShim">
		// 注册到window.intentShim；同时兼容使用旧文档命名空间的打包方式。
		var shim = window.intentShim ||
			(window.plugins && window.plugins.intentShim);
		if( shim && typeof shim.startActivity === "function" ){
			var openTree = function() {
				try{
					shim.startActivity({
						action: "android.intent.action.OPEN_DOCUMENT_TREE"
					}, function(){}, function(){});
				}catch(error){}
			};
			shim.startActivity({
				action: shim.ACTION_VIEW || "android.intent.action.VIEW",
				url: snapshotUri,
				type: "vnd.android.document/directory",
				flags: [1, 2]
			}, function(){}, openTree);
			return true;
		}

		// 部分打包版本残留了IntentShim原生源码，却没有加载其Cordova服务。
		// 工程内的InAppBrowser已注册，可通过_system发出同样的ACTION_VIEW。
		if( window.cordova && typeof window.cordova.exec === "function" ){
			window.cordova.exec(
				function(){},
				function(){},
				"InAppBrowser",
				"open",
				[snapshotUri, "_system", ""]
			);
			return true;
		}
		return false;
	}catch(error){
		return false;
	}
};
//==============================
// * 保存快照文件 - 获取最后保存路径
//==============================
Game_Temp.prototype.drill_PSS_getLastSnapshotPath = function() {
	return this._drill_PSS_lastSnapshotPath || "";
};
Date.prototype.drill_PSS_getStamp_EN = function(type){
    // type: "date" | "time" | "datetime"
    var pad2 = function(n){ return ("0" + n).slice(-2); };
    var Y = this.getFullYear();
    var M = pad2(this.getMonth() + 1);
    var D = pad2(this.getDate());
    var h = pad2(this.getHours());
    var m = pad2(this.getMinutes());
    var s = pad2(this.getSeconds());

    if(type === "date")     return Y + "-" + M + "-" + D;        // 2026-02-04
    if(type === "time")     return h + "-" + m + "-" + s;        // 14-03-59
    return Y + "-" + M + "-" + D + "_" + h + "-" + m + "-" + s;  // 2026-02-04_14-03-59
};
//==============================
// * 保存快照文件 - 清理文件名非法字符（跨平台更稳）
//==============================
Game_Temp.prototype.drill_PSS_sanitizeFileName = function(name){
    name = String(name || "");
    // Windows 不允许: \ / : * ? " < > |
    name = name.replace(/[\\\/:\*\?"<>\|]/g, "_");
    // 去掉结尾的空格和点（Windows 也不喜欢）
    name = name.replace(/[\. ]+$/g, "");
    // 可选：压缩连续空格
    name = name.replace(/\s+/g, " ").trim();
    return name;
};
//==============================
// * 保存快照文件 - 时间格式化（真实时间）
//==============================
Date.prototype.drill_PSS_getDateTextByFormat = function( fmt ){
	var o = {
		"M+": this.getMonth() + 1,						//月份 
		"d+": this.getDate(),							//日 
		"H+": this.getHours(),							//小时 
		"m+": this.getMinutes(),						//分 
		"s+": this.getSeconds(),						//秒 
		"q+": Math.floor((this.getMonth() + 3) / 3),	//季度 
		"S":  this.getMilliseconds()					//毫秒 
	};
	if( /(y+)/.test(fmt) ){
		fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	}
	for( var k in o ){
		if( new RegExp("(" + k + ")").test(fmt) ){
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
		}
	}
	return fmt;
}
//==============================
// * 保存快照文件 - 执行保存
//
//			参数：	> bitmap        资源对象
//					> url_path      文件夹路径（"snapshot/"）
//					> file_name     文件名
//					> file_type     文件类型（"png"或"jpg"）
//					> image_quality 图片质量（0~100，只jpg时有效）
//==============================
Game_Temp.prototype.drill_PSS_saveBitmap = function( bitmap, url_path, file_name, file_type, image_quality ){
	if( file_type != "png" && file_type != "jpg" ){ return ""; }
	if( typeof Utils === "undefined" || !Utils.isNwjs || !Utils.isNwjs() ){ return ""; }
	
	// > 图片质量（只jpg时有效）
	image_quality = Math.min( image_quality, 100 ) * 0.01;
	
	// > 获取数据
	var data = bitmap.canvas.toDataURL( file_type, image_quality );
	
	// > 去掉数据头
	if( file_type == "png" ){
		data = data.replace( /^data:image\/png;base64,/, "" );
	}
	if( file_type == "jpg" ){
		data = data.replace( /^data:image\/jpeg;base64,/, "" );
	}
	
	// > 路径解析
	var fs = require('fs');
	var path = require('path');
	var fileRoot = this.drill_PSS_parentDirectoryPath();
	var dirPath = path.join(fileRoot, String(url_path || ""));
	
	// > 文件夹路径自动创建
	if(!fs.existsSync(dirPath) ){
		fs.mkdirSync(dirPath, { recursive: true });
	}
	
	// > 如果已存在，则数字加1再存
	var filePath = path.join(dirPath, file_name + "." + file_type);
	var i = 2;
	while( fs.existsSync(filePath) == true ){
		filePath = path.join(dirPath, file_name + " " + String(i) + "." + file_type);
		i += 1;
	}
	
	// > 写入文件
	fs.writeFileSync( filePath, data, 'base64' );
	return filePath;
}
//==============================
// * 保存快照文件 - 获取目录
//==============================
Game_Temp.prototype.drill_PSS_parentDirectoryPath = function() {
    var path = require('path');
    var base = path.dirname(process.mainModule.filename);
    return path.join(base, '/');
};
//==============================
// * 保存快照文件 - 获取输出文件夹
//==============================
Game_Temp.prototype.drill_PSS_getOutputDirectory = function(urlPath) {
	var path = require('path');
	return path.resolve(path.join(this.drill_PSS_parentDirectoryPath(), String(urlPath || "")));
};
//==============================
// * 保存快照文件 - 跨平台启动系统程序
//==============================
Game_Temp.prototype.drill_PSS_spawnDetached = function(command, args) {
	try{
		var childProcess = require('child_process');
		var child = childProcess.spawn(command, args || [], {
			detached: true,
			stdio: 'ignore'
		});
		child.on('error', function(error){
			console.warn('[Drill_PictureSnapShot] 无法打开系统文件管理器：', error);
		});
		child.unref();
		return true;
	}catch(error){
		console.warn('[Drill_PictureSnapShot] 无法启动系统文件管理器：', error);
		return false;
	}
};
//==============================
// * 保存快照文件 - 打开文件夹（Windows/macOS/Linux）
//==============================
Game_Temp.prototype.drill_PSS_openDirectory = function(dirPath) {
	if( typeof Utils === "undefined" || !Utils.isNwjs || !Utils.isNwjs() || !dirPath ){
		return false;
	}
	var fs = require('fs');
	var path = require('path');
	var resolved = path.resolve(dirPath);
	try{
		if( !fs.existsSync(resolved) ){
			fs.mkdirSync(resolved, { recursive: true });
		}
		if( typeof nw !== 'undefined' && nw.Shell && nw.Shell.openItem ){
			nw.Shell.openItem(resolved);
			return true;
		}
	}catch(error){
		console.warn('[Drill_PictureSnapShot] NW.js打开文件夹失败，将尝试系统命令：', error);
	}
	if( process.platform === 'win32' ){
		return this.drill_PSS_spawnDetached('explorer.exe', [resolved]);
	}
	if( process.platform === 'darwin' ){
		return this.drill_PSS_spawnDetached('open', [resolved]);
	}
	return this.drill_PSS_spawnDetached('xdg-open', [resolved]);
};
//==============================
// * 保存快照文件 - 在文件管理器中定位文件
//==============================
Game_Temp.prototype.drill_PSS_revealFile = function(filePath) {
	if( typeof Utils === "undefined" || !Utils.isNwjs || !Utils.isNwjs() || !filePath ){
		return false;
	}
	var fs = require('fs');
	var path = require('path');
	var resolved = path.resolve(filePath);
	if( !fs.existsSync(resolved) ){
		return this.drill_PSS_openDirectory(path.dirname(resolved));
	}
	try{
		if( typeof nw !== 'undefined' && nw.Shell && nw.Shell.showItemInFolder ){
			nw.Shell.showItemInFolder(resolved);
			return true;
		}
	}catch(error){
		console.warn('[Drill_PictureSnapShot] NW.js定位文件失败，将尝试系统命令：', error);
	}
	if( process.platform === 'win32' ){
		return this.drill_PSS_spawnDetached('explorer.exe', ['/select,', resolved]);
	}
	if( process.platform === 'darwin' ){
		return this.drill_PSS_spawnDetached('open', ['-R', resolved]);
	}
	return this.drill_PSS_openDirectory(path.dirname(resolved));
};
//==============================
// * 保存快照文件 - 打开最后生成的文件
//==============================
Game_Temp.prototype.drill_PSS_openLastSnapshotFile = function() {
	return this.drill_PSS_revealFile(this.drill_PSS_getLastSnapshotPath());
};
Game_Temp.prototype.drill_PSS_openLastVideoFile = function() {
	return this.drill_PSS_revealFile(this.drill_PSS_getLastVideoPath());
};
//==============================
// * 保存快照文件 - 打开保存的文件路径（保留原API）
//==============================
Game_Temp.prototype.drill_PSS_openUrl = function() {
	return this.drill_PSS_openDirectory(
		this.drill_PSS_getOutputDirectory(DrillUp.g_PSS_fileSettings['url_path'])
	);
};
