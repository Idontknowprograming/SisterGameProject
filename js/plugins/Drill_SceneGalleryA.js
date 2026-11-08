//=============================================================================
// Drill_SceneGalleryA.js
//=============================================================================

/*:
 * @plugindesc [v1.2]        面板 - 全自定义画廊A
 * @author Drill_up
 * 
 * @Drill_LE_param "内容-%d"
 * @Drill_LE_parentKey "---内容组%d至%d---"
 * @Drill_LE_var "DrillUp.g_SGaA_context_list_length"
 * 
 * 
 * @help
 * =============================================================================
 * +++ Drill_SceneGalleryA +++
 * 作者：Drill_up
 * 如果你有兴趣，也可以来看看更多我写的drill插件哦ヽ(*。>Д<)o゜
 * https://rpg.blue/thread-409713-1-1.html
 * =============================================================================
 * 可全部自定义的画廊A。
 * 
 * -----------------------------------------------------------------------------
 * ----插件扩展
 * 该插件 不能 单独使用。
 * 必须基于核心插件才能运行。
 * 基于：
 *   - Drill_CoreOfInput            系统-输入设备核心★★v1.5及以上★★
 *     必须基于该插件才能控制查看图片细节。
 *   - Drill_CoreOfGlobalSave       管理器-全局存储核心
 *   - Drill_CoreOfWindowAuxiliary  系统-窗口辅助核心★★v1.3及以上★★
 *     必须基于该插件才能显示描述内容。
 *   - Drill_CoreOfSelectableButton 系统-按钮组核心
 *     必须基于该插件才能使用按钮组。
 *
 * -----------------------------------------------------------------------------
 * ----设定注意事项
 * 1.插件的作用域：菜单界面。
 * 2.该面板属于菜单面板，可以被菜单背景、菜单魔法圈等插件作用到。
 *   该面板关键字为：Scene_Drill_SGaA
 *   更多关键字内容，见 "17.主菜单 > 菜单关键字.docx"。
 * 3.若要从零开始上手，去看看 "18.面板 > 关于全自定义画廊.docx"。
 * 结构：
 *   (1.插件包含：1个选项窗口 + 1个按钮组 + 1个文本描述窗口
 *       + 1个完成度窗口 + 1个缩略图 + 1个原图查看器
 *      选项窗口中，每个选项都会改变 缩略图和描述窗口 的内容。
 *   (2.窗口的布局规划没有限制，去了解下 "17.主菜单 > 窗口与布局.docx"。
 * 流程：
 *   (1.流程是程序内部无法改变的固定业务逻辑结构。
 *      插件具备两个固定流程，一般模式流程 和 单图模式流程。
 * 全局存储：
 *   (1.该插件控制的选项显示/隐藏可以设置存储在全局文件中。
 *      如果游戏中修改了显示/隐藏，则永久有效，不保存也有效。
 *   (2.注意，如果配置显示/隐藏不起作用，记得删掉存档再看看。
 *   (3.更多详细介绍，去看看 "21.管理器 > 关于全局存储.docx"。
 * 窗口：
 *   (1.如果你只要一个单独的描述窗口：
 *      设置一个选项，然后把选项窗口设置y1000看不见即可。
 *   (2.如果你要做像任务激活那种形式：
 *      设置两个选项，一个激活，一个未激活（灰色），
 *      通过插件指令显示/隐藏两个按钮,只显示一个,使其看起来像一个选项。
 *   (3.注意，画廊具有当前页记忆，如果你修改了一些选项，你需要用插
 *      件指令设置一下当前选中页。
 * 内容：
 *   (1.每篇内容可以单独控制行间距，居中对齐等功能。
 *   (2.选项窗口和描述窗口支持所有文本的特殊字符：
 *       \c[n] 变颜色    \i[n] 显示图标    \{\} 字体变大变小
 *       \V[n] 显示变量  \N[n] 显示角色名  \G 显示货币单位
 *      其他特殊字符可见插件 窗口字符-窗口字符核心 的说明，
 *      或者去看看文档 "23.窗口字符 > 关于窗口字符.docx"。
 *   (3.内容可以包含表达式，用于特殊的功能显示。
 *      表达式介绍见"系统-窗口辅助核心"插件。
 * 内容锁定：
 *   (1.你可以将某个内容锁定，锁定项将会只显示锁定信息。
 *      但注意前提是内容正在显示，没有隐藏。
 *   (2.内容锁定时，可以选择锁定内容或描述图。
 *      如果你想让锁定时描述图不显示，可以配置空的锁定图片。
 * 设计：
 *   (1.该面板默认定义为一种可收集画的画廊面板。
 *      但由于该面板插件可复制很多个，所以你可以将画廊用于其它功能，
 *      比如只用图片查看器功能，做成可以看CG大图的剧情画册。
 *      或者 做成玩家行囊里的 大地图、世界地图 。
 *      具体去看看 "18.面板 > 关于全自定义画廊.docx"。
 * 
 * -----------------------------------------------------------------------------
 * ----关联文件
 * 资源路径：img/Menu__picturegallery （Menu后面有两个下划线）
 * 先确保项目img文件夹下是否有Menu__picturegallery文件夹！
 * 要查看所有关联资源文件的插件，可以去看看"插件清单.xlsx"。
 * 如果没有文件夹，自己建立。需要配置下列资源文件：
 *
 * 资源-整体布局           （默认为 画廊A-整体布局）
 * 资源-锁定的描述图       （默认为 画廊A-锁定描述图）
 * 选项窗口布局 资源-贴图  （默认为 单张背景贴图 - 背景贴图）
 * 描述窗口布局 资源-贴图  （默认为 单张背景贴图 - 背景贴图）
 * 
 * 内容1 资源-缩略图     （默认为 空）
 * 内容2 资源-缩略图     （默认为 空）
 * 内容3 资源-缩略图     （默认为 空）
 * ……
 *
 * -----------------------------------------------------------------------------
 * ----激活条件
 * 打开全自定义画廊，使用下面的插件指令：
 * （冒号两边都有一个空格）
 *
 * 插件指令：>画廊A : 打开面板
 * 插件指令：>画廊A : 打开面板(单图查看模式) : 内容[1]
 *
 * 插件指令：>画廊A : 显示选项 : 1
 * 插件指令：>画廊A : 隐藏选项 : 1
 * 插件指令：>画廊A : 显示全部
 * 插件指令：>画廊A : 隐藏全部
 * 
 * 插件指令：>画廊A : 锁定选项 : 1
 * 插件指令：>画廊A : 解锁选项 : 1
 * 插件指令：>画廊A : 锁定全部
 * 插件指令：>画廊A : 解锁全部
 *
 * 1.面板打开时，游戏是暂停的，所以你不能在面板中实时变化某些数值。
 * 2.按照单图模式打开时，选定的内容是被强制播放的，不管是否隐藏，
 *   是否上锁，都会打开图片，并直接进入原图。
 *
 * -----------------------------------------------------------------------------
 * ----可选设定 - 选中页
 * 你可以控制选项窗口当前选中第N页。（选项有3个，表示有3页）
 * 
 * 插件指令：>画廊A : 选中页 : N
 * 
 * 1.画廊具有当前页记忆，如果你修改了一些选项，你需要用该指令
 *   设置一下当前选中页。
 * 2.不存在第0页，如果选中页大于页数，将选择最末尾的页。
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
 * 工作类型：   持续执行
 * 时间复杂度： o(n^3)*o(场景元素) 每帧
 * 测试方法：   直接进入该画廊进行测试。
 * 测试结果：   在菜单界面中，基本元素消耗为：【20.64ms】
 * 
 * 1.插件只在自己作用域下工作消耗性能，在其它作用域下是不工作的。
 *   测试结果并不是精确值，范围在给定值的10ms范围内波动。
 *   更多性能介绍，去看看 "0.性能测试报告 > 关于插件性能.docx"。
 * 2.该插件为一个界面，在该插件的界面中，地图界面、战斗界面处于完全
 *   暂停状态，所以该界面占用的图形资源、计算资源充足，消耗也低。
 * 3.该界面中的元素数量有限，消耗也上不去。暂无与消耗相关的线性关系量。
 *   （地图的线性关系量：事件，因为50/100/200事件对于消耗影响较大。）
 * 
 * -----------------------------------------------------------------------------
 * ----更新日志
 * [v1.0]
 * 完成插件ヽ(*。>Д<)o゜
 * [v1.1]
 * 大幅度修改了全局存储的文件存储结构。
 * [v1.2]
 * 优化了旧存档的识别与兼容。
 * 
 * 
 * 
 * @param ----杂项----
 * @default 
 *
 * @param 资源-整体布局
 * @parent ----杂项----
 * @desc 画廊的整体布局。
 * @default 画廊A-整体布局
 * @require 1
 * @dir img/Menu__picturegallery/
 * @type file
 *
 * @param 是否添加到主菜单
 * @parent ----杂项----
 * @type boolean
 * @on 添加
 * @off 不添加
 * @desc true - 添加，false - 不添加
 * @default false
 *
 * @param 主菜单显示名
 * @parent 是否添加到主菜单
 * @desc 主菜单显示的选项名。
 * @default 画廊A
 *
 * @param 是否在标题窗口中显示
 * @parent ----杂项----
 * @type boolean
 * @on 显示
 * @off 不显示
 * @desc true-显示,false-不显示。注意数据存储的位置，如果是正常存储，标题将打开上一存档的数据。没有存档则会报错。
 * @default false
 *
 * @param 标题窗口显示名
 * @parent 是否在标题窗口中显示
 * @desc 标题窗口显示的名称。
 * @default 画廊A
 *
 * @param 数据是否全局存储
 * @parent 是否在标题窗口中显示
 * @type boolean
 * @on 全局存储
 * @off 正常存储
 * @desc true-存储在全局游戏中,false-普通存档,控制该面板的解锁隐藏的状态数据存储位置。(设置不会立即生效,要删旧档)
 * @default false
 *
 * @param 全局存储的文件路径
 * @parent 是否在标题窗口中显示
 * @type number
 * @min 1
 * @desc 指对应的文件路径ID，该插件的数据将存储到指定的文件路径中，具体去 全局存储核心 看看。
 * @default 1
 * 
 * 
 * @param ----原图查看器----
 * @default 
 *
 * @param 原图显现时长
 * @parent ----原图查看器----
 * @type number
 * @min 1
 * @desc 原图显现或消失所需的时间，单位帧。（1秒60帧）
 * @default 20
 *
 * @param 单图模式时是否隐藏整体布局
 * @parent ----原图查看器----
 * @type boolean
 * @on 隐藏
 * @off 不隐藏
 * @desc true - 隐藏，false - 不隐藏
 * @default true
 *
 * @param 资源-回想按钮
 * @parent ----原图查看器----
 * @desc 列表页缩略图状态下的回想按钮图片。当前CG在回想脚本表(DrillUp.g_SGaA_recallScriptMap)中登记了脚本时才显示。
 * @default
 * @require 1
 * @dir img/Menu__picturegallery/
 * @type file
 *
 * @param 回想按钮 X
 * @parent ----原图查看器----
 * @desc 回想按钮的位置（按钮左上角）。x轴方向，单位像素。
 * @default 1650
 *
 * @param 回想按钮 Y
 * @parent ----原图查看器----
 * @desc 回想按钮的位置（按钮左上角）。y轴方向，单位像素。
 * @default 80
 *
 * @param 回想按钮常态不透明度
 * @parent ----原图查看器----
 * @type number
 * @min 0
 * @max 255
 * @desc 鼠标未悬停在回想按钮上时的常态不透明度（0~255）。悬停时恢复为255。
 * @default 120
 *
 *
 * @param ----选项----
 * @desc
 *
 * @param 选项模式
 * @parent ----选项----
 * @type select
 * @option 按钮组模式
 * @value 按钮组模式
 * @option 窗口模式
 * @value 窗口模式
 * @desc 选项的模式。
 * @default 窗口模式
 *
 * @param 是否启用父分类
 * @parent ----选项----
 * @type boolean
 * @on 启用
 * @off 关闭
 * @desc true - 启用两层下钻（先显示父分类，点进去后再显示该分类下的CG）；false - 关闭（所有CG平铺为一个列表）。
 * @default false
 *
 * @param 选项按钮组
 * @parent ----选项----
 * @desc 选项模式为 按钮组模式 时，选项按钮组的配置数据。
 * @type struct<DrillCommandButton>
 * @default {"平移-按钮组 X":"70","平移-按钮组 Y":"180","按钮组样式":"6","---按钮贴图---":"","默认按钮贴图":"画廊A-默认按钮","按钮贴图序列":"[]"}
 * 
 * @param 选项窗口
 * @parent ----选项----
 * @desc 选项模式为 窗口模式 时，选项窗口的配置数据。
 * @type struct<DrillSelectWindow>
 * @default {"选项窗口 X":"50","选项窗口 Y":"160","选项窗口宽度":"210","选项窗口高度":"360","选项窗口列数":"1","每条选项高度":"36","是否启用选项内容":"false","选项窗口对齐方式":"左对齐","选项窗口字体大小":"20","选项窗口移动动画":"{\"移动类型\":\"弹性移动\",\"移动时长\":\"30\",\"移动延迟\":\"0\",\"---起点---\":\"\",\"坐标类型\":\"相对坐标\",\"起点-相对坐标 X\":\"-60\",\"起点-相对坐标 Y\":\"0\",\"起点-绝对坐标 X\":\"0\",\"起点-绝对坐标 Y\":\"0\"}","选项窗口布局":"{\"布局类型\":\"默认皮肤\",\"---单张背景贴图---\":\"\",\"资源-贴图\":\"画廊A-选项窗口\",\"贴图位置修正 X\":\"0\",\"贴图位置修正 Y\":\"0\"}","选项窗口指针与边框":"{}","是否启用选项小缩略图":"false","选项小缩略图缩放模式":"等比缩放"}
 * 
 * 
 * @param ----描述窗口----
 * @default 
 * 
 * @param 描述窗口 X
 * @parent ----描述窗口----
 * @desc 描述窗口的位置。x轴方向平移，单位像素。0为贴在最左边。
 * @default 285
 *
 * @param 描述窗口 Y
 * @parent ----描述窗口----
 * @desc 描述窗口的位置。y轴方向平移，单位像素。0为贴在最上面。
 * @default 420
 *
 * @param 描述窗口宽度
 * @parent ----描述窗口----
 * @type number
 * @min 50
 * @desc 窗口的高宽设置。注意，实际文本域的高宽要比该设置小一些，因为有内边距。具体去看看 "17.主菜单 > 窗口与布局.docx"。
 * @default 450
 *
 * @param 描述窗口高度
 * @parent ----描述窗口----
 * @type number
 * @min 50
 * @desc 窗口的高宽设置。注意，实际文本域的高宽要比该设置小一些，因为有内边距。具体去看看 "17.主菜单 > 窗口与布局.docx"。
 * @default 180
 *
 * @param 描述窗口字体大小
 * @parent ----描述窗口----
 * @type number
 * @min 1
 * @desc 描述窗口的字体大小。图标无法根据字体大小变化。
 * @default 22
 *
 * @param 描述窗口移动动画
 * @parent ----描述窗口----
 * @type struct<DrillWindowMoving>
 * @desc 窗口会从某个点跑回自己的原位置。
 * @default {"移动类型":"弹性移动","移动时长":"30","移动延迟":"0","---起点---":"","坐标类型":"相对坐标","起点-相对坐标 X":"0","起点-相对坐标 Y":"0","起点-绝对坐标 X":"0","起点-绝对坐标 Y":"0"}
 * 
 * @param 描述窗口布局
 * @parent ----描述窗口----
 * @type struct<DrillWindowLayout>
 * @desc 控制窗口框架与窗口背景。
 * @default {"布局类型":"默认皮肤","---单张背景贴图---":"","资源-贴图":"","贴图位置修正 X":"0","贴图位置修正 Y":"0"}
 * 
 * @param 是否重播描述窗口移动动画
 * @parent ----描述窗口----
 * @type boolean
 * @on 重播
 * @off 不重播
 * @desc true - 重播，false - 不重播。切换选项时，重播描述窗口的移动动画。
 * @default true
 *
 * @param ----缩略图----
 * @default 
 * 
 * @param 缩略图 X
 * @parent ----缩略图----
 * @desc x轴方向平移，单位像素。0为贴在最左边。
 * @default 285
 *
 * @param 缩略图 Y
 * @parent ----缩略图----
 * @desc y轴方向平移，单位像素。0为贴在最上面。
 * @default 60
 *
 * @param 缩略图宽度
 * @parent ----缩略图----
 * @type number
 * @min 1
 * @desc 描述窗口的字体大小。图标无法根据字体大小变化。
 * @default 450
 *
 * @param 缩略图高度
 * @parent ----缩略图----
 * @type number
 * @min 1
 * @desc 描述窗口的字体大小。图标无法根据字体大小变化。
 * @default 340
 *
 * @param 缩略图缩放模式
 * @parent ----缩略图----
 * @type select
 * @option 等比缩放
 * @value 等比缩放
 * @option 拉伸缩放
 * @value 拉伸缩放
 * @desc 缩略图的缩放模式。
 * @default 等比缩放
 * 
 * @param 缩略图移动动画
 * @parent ----缩略图----
 * @type struct<DrillWindowMoving>
 * @desc 缩略图会从某个点跑回自己的原位置。
 * @default {"移动类型":"弹性移动","移动时长":"30","移动延迟":"0","---起点---":"","坐标类型":"相对坐标","起点-相对坐标 X":"0","起点-相对坐标 Y":"0","起点-绝对坐标 X":"0","起点-绝对坐标 Y":"0"}
 * 
 * @param 是否重播缩略图移动动画
 * @parent ----缩略图----
 * @type boolean
 * @on 重播
 * @off 不重播
 * @desc true - 重播，false - 不重播。切换选项时，重播缩略图的移动动画。
 * @default true
 * 
 * @param 是否瞬间显示缩略图
 * @parent ----缩略图----
 * @type boolean
 * @on 瞬间显示
 * @off 渐变出现
 * @desc true - 瞬间显示，false - 渐变出现。
 * @default false
 *
 * 
 * @param ----完成度窗口----
 * @default 
 * 
 * @param 完成度窗口 X
 * @parent ----完成度窗口----
 * @desc 完成度窗口的位置。x轴方向平移，单位像素。0为贴在最左边。
 * @default 50
 *
 * @param 完成度窗口 Y
 * @parent ----完成度窗口----
 * @desc 完成度窗口的位置。y轴方向平移，单位像素。0为贴在最上面。
 * @default 530
 *
 * @param 完成度窗口宽度
 * @parent ----完成度窗口----
 * @type number
 * @min 50
 * @desc 窗口的高宽设置。注意，实际文本域的高宽要比该设置小一些，因为有内边距。具体去看看 "17.主菜单 > 窗口与布局.docx"。
 * @default 210
 *
 * @param 完成度窗口高度
 * @parent ----完成度窗口----
 * @type number
 * @min 50
 * @desc 窗口的高宽设置。注意，实际文本域的高宽要比该设置小一些，因为有内边距。具体去看看 "17.主菜单 > 窗口与布局.docx"。
 * @default 70
 *
 * @param 完成度窗口字体大小
 * @parent ----完成度窗口----
 * @type number
 * @min 1
 * @desc 完成度窗口的字体大小。图标无法根据字体大小变化。
 * @default 22
 *
 * @param 完成度用语
 * @parent ----完成度窗口----
 * @desc 完成度窗口内容的用语。
 * @default 完成度：
 *
 * @param 完成度窗口移动动画
 * @parent ----完成度窗口----
 * @type struct<DrillWindowMoving>
 * @desc 窗口会从某个点跑回自己的原位置。
 * @default {"移动类型":"弹性移动","移动时长":"30","移动延迟":"0","---起点---":"","坐标类型":"相对坐标","起点-相对坐标 X":"0","起点-相对坐标 Y":"0","起点-绝对坐标 X":"0","起点-绝对坐标 Y":"0"}
 * 
 * @param 完成度窗口布局
 * @parent ----完成度窗口----
 * @type struct<DrillWindowLayout>
 * @desc 控制窗口框架与窗口背景。
 * @default {"布局类型":"默认皮肤","---单张背景贴图---":"","资源-贴图":"","贴图位置修正 X":"0","贴图位置修正 Y":"0"}
 *
 *
 * @param ----锁定内容----
 * @default 
 *
 * @param 内容锁定方式
 * @parent ----锁定内容----
 * @type select
 * @option 锁定缩略图和描述内容
 * @value 锁定缩略图和描述内容
 * @option 只锁定缩略图
 * @value 只锁定缩略图
 * @option 只锁定描述内容
 * @value 只锁定描述内容
 * @desc 内容锁定的方式。
 * @default 锁定缩略图和描述内容
 *
 * @param 用语-锁定的选项名
 * @parent ----锁定内容----
 * @desc 选项被锁定时，画廊显示的选项名。
 * @default \c[7]--未知图片--
 *
 * @param 用语-锁定的选项内容
 * @parent ----锁定内容----
 * @type note
 * @desc 选项被锁定时，画廊显示的内容。
 * @default "该图片的描述已被隐藏。"
 *
 * @param 资源-上锁的缩略图
 * @parent ----锁定内容----
 * @desc 选项被锁定时，画廊显示的缩略图。
 * @default 画廊A-上锁的缩略图
 * @require 1
 * @dir img/Menu__picturegallery/
 * @type file
 *
 *
 * @param ----内容----
 * @default 
 *
 * @param ---内容组 1至20---
 * @parent ----内容----
 * @default 
 *
 * @param 内容-1
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-2
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-3
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-4
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-5
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-6
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-7
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-8
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-9
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-10
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-11
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-12
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-13
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-14
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-15
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-16
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-17
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-18
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-19
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-20
 * @parent ---内容组 1至20---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param ---内容组21至40---
 * @parent ----内容----
 * @default 
 *
 * @param 内容-21
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-22
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-23
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-24
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-25
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-26
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-27
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-28
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-29
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-30
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-31
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-32
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-33
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-34
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-35
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-36
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-37
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-38
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-39
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-40
 * @parent ---内容组21至40---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param ---内容组41至60---
 * @parent ----内容----
 * @default 
 *
 * @param 内容-41
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-42
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-43
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-44
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-45
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-46
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-47
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-48
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-49
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-50
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-51
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-52
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-53
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-54
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-55
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-56
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-57
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-58
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-59
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-60
 * @parent ---内容组41至60---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param ---内容组61至80---
 * @parent ----内容----
 * @default 
 *
 * @param 内容-61
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-62
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-63
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-64
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-65
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-66
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-67
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-68
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-69
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-70
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-71
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-72
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-73
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-74
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-75
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-76
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-77
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-78
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-79
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 * @param 内容-80
 * @parent ---内容组61至80---
 * @type struct<DrillSGaA>
 * @desc 添加新的内容，每个选项对应 一个描述和一张画廊图片。
 * @default 
 *
 */
/*~struct~DrillSGaA:
 * 
 * @param 选项名
 * @desc 当前的选项名字。（多语言：此处填英语唯一key，实际显示由 DrillUp.drill_SGaA_localizeOption 本地化。）
 * @default 未命名选项
 *
 * @param 父分类
 * @desc 该CG所属父分类的英语唯一key（相同key的CG归到同一分类）。需启用"是否启用父分类"。显示名由 DrillUp.drill_SGaA_localizeCategory 本地化。
 * @default
 *
 * @param ---选项内容---
 * @default 
 *
 * @param 是否初始显示
 * @parent ---选项内容---
 * @type boolean
 * @on 显示
 * @off 隐藏
 * @desc true - 显示，false - 隐藏，如果不显示，则该画的选项不会在界面中出现。
 * @default true
 *
 * @param 是否初始锁定
 * @parent ---选项内容---
 * @type boolean
 * @on 锁定
 * @off 解锁
 * @desc true - 锁定，false - 解锁，如果锁定，则该画的选项会在界面中出现，并且上锁。
 * @default false
 * 
 * @param 选项内容
 * @parent ---选项内容---
 * @type note
 * @desc 每个选项显示的长文本内容。（只有窗口模式有效，且需要启用 选项内容 。）
 * @default "长文本选项描述"
 *
 * @param ---画廊内容---
 * @default 
 *
 * @param 资源-画廊图片
 * @parent ---画廊内容---
 * @desc 该选项下的显示的画廊的图片。
 * @default 
 * @require 1
 * @dir img/Menu__picturegallery/
 * @type file
 * 
 * @param 画廊描述内容
 * @parent ---画廊内容---
 * @type note
 * @desc 该选项下的描述窗口显示的内容。
 * @default "没有描述"
 *
 * @param 画廊描述内容对齐方式
 * @parent ---画廊内容---
 * @type select
 * @option 左对齐
 * @value 左对齐
 * @option 居中
 * @value 居中
 * @option 右对齐
 * @value 右对齐
 * @desc 文本的对齐方式。
 * @default 左对齐
 *
 * @param 画廊描述内容是否自适应行间距
 * @parent ---画廊内容---
 * @type boolean
 * @on 自适应
 * @off 固定行间距
 * @desc true - 自适应，false - 固定行间距
 * @default true
 *
 * @param 画廊描述内容固定行间距
 * @parent 画廊描述内容是否自适应行间距
 * @type number
 * @min 1
 * @desc 如果你选择了手动行间距，这里将使得每行的文字的行间距都是固定值。
 * @default 28
 *
 */
/*~struct~DrillWindowMoving:
 *
 * @param 移动类型
 * @type select
 * @option 不移动
 * @value 不移动
 * @option 匀速移动
 * @value 匀速移动
 * @option 增减速移动
 * @value 增减速移动
 * @option 弹性移动
 * @value 弹性移动
 * @desc 移动类型基于 弹道核心-两点式 移动。更多内容可以去看看 "1.系统 > 关于弹道.docx"。
 * @default 匀速移动
 *
 * @param 移动时长
 * @type number
 * @min 1
 * @desc 起点位置回到原位置所需的时间，单位帧。（1秒60帧）
 * @default 20
 *
 * @param 移动延迟
 * @type number
 * @min 0
 * @desc 开始移动前的等待时间，单位帧。（1秒60帧）
 * @default 0
 *
 * @param ---起点---
 * @default 
 *
 * @param 坐标类型
 * @parent ---起点---
 * @type select
 * @option 相对坐标
 * @value 相对坐标
 * @option 绝对坐标
 * @value 绝对坐标
 * @desc 起点的坐标类型。
 * @default 相对坐标
 *
 * @param 起点-相对坐标 X
 * @parent ---起点---
 * @desc 相对坐标以原位置为基准，负数向右，正数向左，单位像素。
 * @default 100
 * 
 * @param 起点-相对坐标 Y
 * @parent ---起点---
 * @desc 相对坐标以原位置为基准，负数向上，正数向下，单位像素。
 * @default 0
 * 
 * @param 起点-绝对坐标 X
 * @parent ---起点---
 * @desc 绝对坐标以屏幕的位置为准，0表示贴在最左边，单位像素。
 * @default 0
 * 
 * @param 起点-绝对坐标 Y
 * @parent ---起点---
 * @desc 绝对坐标以屏幕的位置为准，0表示贴在最上面，单位像素。
 * @default 0
 * 
 */
/*~struct~DrillWindowLayout:
 *
 * @param 布局类型
 * @type select
 * @option 默认皮肤
 * @value 默认皮肤
 * @option 单张背景贴图
 * @value 单张背景贴图
 * @option 隐藏布局
 * @value 隐藏布局
 * @desc 窗口布局的类型。
 * @default 单张背景贴图
 *
 * @param ---单张背景贴图---
 * @default 
 *
 * @param 资源-贴图
 * @parent ---单张背景贴图---
 * @desc 窗口的背景贴图的资源。
 * @default 
 * @require 1
 * @dir img/Menu__picturegallery/
 * @type file
 *
 * @param 贴图位置修正 X
 * @parent ---单张背景贴图---
 * @desc 修正图片的位置用。以窗口的点为基准，负数向右，正数向左，单位像素。
 * @default 0
 *
 * @param 贴图位置修正 Y
 * @parent ---单张背景贴图---
 * @desc 修正图片的位置用。以窗口的点为基准，负数向上，正数向下，单位像素。
 * @default 0
 *
 *
 */
/*~struct~DrillSelectWindow:
 * 
 * @param 选项窗口 X
 * @desc x轴方向平移，单位像素。0为贴在最左边。
 * @default 0
 *
 * @param 选项窗口 Y
 * @desc y轴方向平移，单位像素。0为贴在最上面。
 * @default 0
 *
 * @param 选项窗口宽度
 * @type number
 * @min 50
 * @desc 窗口的高宽设置。注意，实际文本域的高宽要比该设置小一些，因为有内边距。具体去看看 "17.主菜单 > 窗口与布局.docx"。
 * @default 816
 *
 * @param 选项窗口高度
 * @type number
 * @min 50
 * @desc 窗口的高宽设置。注意，实际文本域的高宽要比该设置小一些，因为有内边距。具体去看看 "17.主菜单 > 窗口与布局.docx"。
 * @default 80
 *
 * @param 选项窗口列数
 * @type number
 * @min 1
 * @desc 选项窗口的列数。
 * @default 4
 *
 * @param 每条选项高度
 * @type number
 * @min 1
 * @desc 每条选项的高度。（宽度无法调整，宽度固定根据 列数和窗口宽度 自适应。）
 * @default 36
 * 
 * @param 是否启用选项内容
 * @type boolean
 * @on 启用
 * @off 关闭
 * @desc true - 启用，false - 关闭，每条选项将会显示长文本的选项内容。
 * @default false
 * 
 * @param 选项窗口对齐方式
 * @type select
 * @option 左对齐
 * @value 左对齐
 * @option 居中
 * @value 居中
 * @option 右对齐
 * @value 右对齐
 * @desc 选项文本的对齐方式。
 * @default 居中
 *
 * @param 选项窗口字体大小
 * @type number
 * @min 1
 * @desc 选项窗口的字体大小。图标无法根据字体大小变化。
 * @default 22
 * 
 * @param 选项窗口移动动画
 * @type struct<DrillWindowMoving>
 * @desc 窗口会从某个点跑回自己的原位置。
 * @default {"移动类型":"弹性移动","移动时长":"30","移动延迟":"0","---起点---":"","坐标类型":"相对坐标","起点-相对坐标 X":"-100","起点-相对坐标 Y":"0","起点-绝对坐标 X":"0","起点-绝对坐标 Y":"0"}
 *
 * @param 选项窗口布局
 * @type struct<DrillWindowLayout>
 * @desc 控制窗口框架与窗口背景。
 * @default {"布局类型":"默认皮肤","---单张背景贴图---":"","资源-贴图":"","贴图位置修正 X":"0","贴图位置修正 Y":"0"}
 * 
 * @param 选项窗口指针与边框
 * @type struct<DrillCursor>
 * @desc 窗口的指针设置与选项边框设置。
 * @default {}
 * 
 * @param 是否启用选项小缩略图
 * @type boolean
 * @on 启用
 * @off 关闭
 * @desc true - 启用，false - 关闭，每条选项将会小的缩略图。
 * @default false
 *
 * @param 选项小缩略图缩放模式
 * @parent 是否启用选项小缩略图
 * @type select
 * @option 等比缩放
 * @value 等比缩放
 * @option 拉伸缩放
 * @value 拉伸缩放
 * @desc 小缩略图的缩放模式。
 * @default 等比缩放
 * 
 * @param 是否涂黑小缩略图背景
 * @parent 是否启用选项小缩略图
 * @type boolean
 * @on 启用
 * @off 关闭
 * @desc true - 启用，false - 关闭，每条选项的缩略图背景，将被涂黑。
 * @default false
 * 
 */
/*~struct~DrillCursor:
 *
 * @param ---drill插件---
 * @default 
 * 
 * @param 是否启用菜单指针
 * @parent ---drill插件---
 * @type boolean
 * @on 启用
 * @off 关闭
 * @desc true - 启用，false - 关闭，菜单指针可以指向你当前选中的项。需要Drill_MenuCursor插件支持。
 * @default true
 * 
 * @param 是否锁定菜单指针样式
 * @parent 是否启用菜单指针
 * @type boolean
 * @on 锁定
 * @off 不锁定
 * @desc true - 锁定，false - 不锁定，窗口可以指定一个指针样式来装饰。需要Drill_MenuCursor插件支持。
 * @default false
 * 
 * @param 锁定的菜单指针样式
 * @parent 是否启用菜单指针
 * @type number
 * @min 1
 * @desc 锁定时，指定的指针样式id，具体见Drill_MenuCursor插件中对应的配置。
 * @default 1
 * 
 * @param 是否启用闪烁白矩形
 * @parent ---drill插件---
 * @type boolean
 * @on 启用
 * @off 关闭
 * @desc true - 启用，false - 关闭，你可以开关默认选项的白色闪烁矩形。需要Drill_MenuCursorBorder插件支持。
 * @default true
 * 
 * @param 是否启用菜单边框
 * @parent ---drill插件---
 * @type boolean
 * @on 启用
 * @off 关闭
 * @desc true - 启用，false - 关闭，菜单选项边框装饰当前选中的矩形项。需要Drill_MenuCursorBorder插件支持。
 * @default true
 * 
 * @param 是否锁定菜单边框样式
 * @parent 是否启用菜单边框
 * @type boolean
 * @on 锁定
 * @off 不锁定
 * @desc true - 锁定，false - 不锁定，窗口可以指定一个选项边框样式来装饰。需要Drill_MenuCursorBorder插件支持。
 * @default false
 * 
 * @param 锁定的菜单边框样式
 * @parent 是否启用菜单边框
 * @type number
 * @min 1
 * @desc 锁定时，指定的矩形边框样式id，具体见Drill_MenuCursorBorder插件中对应的配置。
 * @default 1
 * 
 * @param 是否启用滚动条
 * @parent ---drill插件---
 * @type boolean
 * @on 启用
 * @off 关闭
 * @desc true - 启用，false - 关闭，你可以关闭装饰当前窗口的菜单滚动条。需要Drill_MenuScrollBar插件支持。
 * @default true
 * 
 * @param 是否锁定滚动条样式
 * @parent 是否启用滚动条
 * @type boolean
 * @on 锁定
 * @off 不锁定
 * @desc true - 锁定，false - 不锁定，窗口可以指定一个滚动条样式来装饰。需要Drill_MenuScrollBar插件支持。
 * @default false
 * 
 * @param 锁定的滚动条样式
 * @parent 是否启用滚动条
 * @type number
 * @min 1
 * @desc 锁定时，指定的滚动条样式id，具体见Drill_MenuScrollBar插件中对应的配置。
 * @default 1
 *
 * @param ---mog插件---
 * @default 
 * 
 * @param 是否启用mog菜单指针
 * @parent ---mog插件---
 * @type boolean
 * @on 启用
 * @off 关闭
 * @desc true - 启用，false - 关闭，使用 MOG_MenuCursor 菜单指针插件（旧插件），可以装饰选项窗口，你也可以关闭装饰。
 * @default true
 * 
 * @param 是否启用mog菜单边框
 * @parent ---mog插件---
 * @type boolean
 * @on 启用
 * @off 关闭
 * @desc true - 启用，false - 关闭，使用 MOG_CursorBorder 菜单边框插件（旧插件），可以装饰选项窗口，你也可以关闭装饰。
 * @default true
 *
 */
/*~struct~DrillCommandButton:
 * 
 * @param 平移-按钮组 X
 * @desc x轴方向平移，单位像素。0为贴在最左边。
 * @default 80
 * 
 * @param 平移-按钮组 Y
 * @desc y轴方向平移，单位像素。0为贴在最上面。
 * @default 30
 * 
 * @param 按钮组样式
 * @type number
 * @min 0
 * @desc 按钮组对应的样式配置，对应 按钮组核心 的样式id。
 * @default 1
 * 
 * @param ---按钮贴图---
 * @desc 
 * 
 * @param 默认按钮贴图
 * @parent ---按钮贴图---
 * @desc 默认按钮的图片资源。
 * @default 画廊A-默认按钮
 * @require 1
 * @dir img/Menu__picturegallery/
 * @type file
 *
 * @param 按钮贴图序列
 * @parent ---按钮贴图---
 * @desc 自定义按钮的图片资源，对应每个内容编号。
 * @default []
 * @require 1
 * @dir img/Menu__picturegallery/
 * @type file[]
 * 
 * 
 */

//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
//		插件简称		SGaA（Scene_Gallery_A）
//		临时全局变量	DrillUp.g_SGaA_xxx
//		临时局部变量	this._drill_xxx
//		存储数据变量	$gameSystem._drill_SGaA_context_list
//		全局存储变量	DrillUp.global_SGaA_enableTank
//		覆盖重写方法	无
//
//<<<<<<<<性能记录<<<<<<<<
//
//		★工作类型		持续执行
//		★时间复杂度		o(n^3)*o(场景元素) 每帧
//		★性能测试因素	直接进入画廊进行测试。
//		★性能测试消耗	20.64ms（Scene_Drill_SGaA.prototype.update函数） 12.14ms（Scene_Drill_SGaA.prototype.drill_updateImgExpandHelp函数）
//		★最坏情况		无
//		★备注			无
//		
//		★优化记录		暂无
//
//<<<<<<<<插件记录<<<<<<<<
//
//		★功能结构树：
//			->☆提示信息
//			->☆静态数据
//			->☆全局存储
//			->☆存储数据
//			->☆插件指令
//				->打开面板
//				->打开面板（单图查看模式）
//				->选中页
//			
//			->☆主菜单选项
//			->☆标题选项
//			->☆面板控制
//			
//			->画廊A【Scene_Drill_SGaA】
//				->选项
//					->选项窗口模式
//						> 标准属性
//						> 选项图片（小图）
//					->按钮组模式
//						> 标准属性
//				->详细窗口
//				->完成度窗口
//				->缩略图（中图）
//					> 等比缩放
//					> 拉伸缩放
//					->点击缩略图进入查看器
//				->原图查看器
//					->原图（大图）
//						> 键盘移动
//						> 鼠标拖拽
//						> 自适应模式
//					->帮助图
//					->原图查看器窗口
//				->原图全部全加载
//				->☆原型链规范（Scene_Drill_SGaA）
//			->选项窗口【Drill_SGaA_SelectWindow】
//			->显示窗口【Drill_SGaA_DescWindow】
//			->完成度窗口【Drill_SGaA_CompletionWindow】
//			->原图查看器窗口【Drill_SGaA_ImgExpandWindow】
//			
//			
//		★家谱：
//			无
//		
//		★脚本文档：
//			无
//		
//		★插件私有类：
//			* 画廊A【Scene_Drill_SGaA】
//			* 选项窗口【Drill_SGaA_SelectWindow】
//			* 显示窗口【Drill_SGaA_DescWindow】
//			* 完成度窗口【Drill_SGaA_CompletionWindow】
//			* 原图查看器窗口【Drill_SGaA_ImgExpandWindow】
//		
//		★必要注意事项：
//			1.替换以下字符变成新面板：
//				SGaA
//				画廊A
//				Drill_SceneGalleryA
//
//		★其它说明细节：
//			1.【全局和存档两种数据都有保存，开关只用于切换显示哪种数据】。
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
	DrillUp.g_SGaA_PluginTip_curName = "Drill_SceneGalleryA.js 面板-全自定义画廊A";
	DrillUp.g_SGaA_PluginTip_baseList = [
		"Drill_CoreOfInput.js 系统-输入设备核心",
		"Drill_CoreOfGlobalSave.js 管理器-全局存储核心",
		"Drill_CoreOfWindowAuxiliary.js 系统-窗口辅助核心",
		"Drill_CoreOfSelectableButton.js 系统-按钮组核心"
	];
	//==============================
	// * 提示信息 - 报错 - 缺少基础插件
	//			
	//			说明：	此函数只提供提示信息，不校验真实的插件关系。
	//==============================
	DrillUp.drill_SGaA_getPluginTip_NoBasePlugin = function(){
		if( DrillUp.g_SGaA_PluginTip_baseList.length == 0 ){ return ""; }
		var message = "【" + DrillUp.g_SGaA_PluginTip_curName + "】\n缺少基础插件，去看看下列插件是不是 未添加 / 被关闭 / 顺序不对：";
		for(var i=0; i < DrillUp.g_SGaA_PluginTip_baseList.length; i++){
			message += "\n- ";
			message += DrillUp.g_SGaA_PluginTip_baseList[i];
		}
		return message;
	};
	
	
//=============================================================================
// ** ☆静态数据
//=============================================================================
　　var Imported = Imported || {};
　　Imported.Drill_SceneGalleryA = true;
　　var DrillUp = DrillUp || {}; 
    DrillUp.parameters = PluginManager.parameters('Drill_SceneGalleryA');
	
	
	//==============================
	// * 静态数据 - 指针与边框
	//				（~struct~DrillCursor）
	//==============================
	DrillUp.drill_SGaA_initMenuCursor = function( dataFrom ) {
		var data = {};
		
		data['mog_enabled'] = String( dataFrom["是否启用mog菜单指针"] || "true") == "true";
		data['mog_borderEnabled'] = String( dataFrom["是否启用mog菜单边框"] || "true") == "true";
		
		data['MCu_enabled'] = String( dataFrom["是否启用菜单指针"] || "true") == "true";
		data['MCu_lock'] = String( dataFrom["是否锁定菜单指针样式"] || "false") == "true";
		data['MCu_style'] = Number( dataFrom["锁定的菜单指针样式"] || 1);
		
		data['MCB_rectEnabled'] = String( dataFrom["是否启用闪烁白矩形"] || "true") == "true";
		data['MCB_enabled'] = String( dataFrom["是否启用菜单边框"] || "true") == "true";
		data['MCB_lock'] = String( dataFrom["是否锁定菜单边框样式"] || "false") == "true";
		data['MCB_style'] = Number( dataFrom["锁定的菜单边框样式"] || 1);
		
		data['MSB_enabled'] = String( dataFrom["是否启用滚动条"] || "true") == "true";
		data['MSB_lock'] = String( dataFrom["是否锁定滚动条样式"] || "false") == "true";
		data['MSB_style'] = Number( dataFrom["锁定的滚动条样式"] || 1);
		
		return data;
	}
	//==============================
	// * 静态数据 - 移动动画
	//				（~struct~DrillWindowMoving）
	//==============================
	DrillUp.drill_SGaA_initWindowMoving = function( dataFrom ) {
		var data = {};
		data['slideMoveType'] = String( dataFrom["移动类型"] || "匀速移动");
		data['slideTime'] = Number( dataFrom["移动时长"] || 20);
		data['slideDelay'] = Number( dataFrom["移动延迟"] || 0);
		data['slidePosType'] = String( dataFrom["坐标类型"] || "相对坐标");
		data['slideX'] = Number( dataFrom["起点-相对坐标 X"] || 0);
		data['slideY'] = Number( dataFrom["起点-相对坐标 Y"] || 0);
		data['slideAbsoluteX'] = Number( dataFrom["起点-绝对坐标 X"] || 0);
		data['slideAbsoluteY'] = Number( dataFrom["起点-绝对坐标 Y"] || 0);
		return data;
	}
	//==============================
	// * 静态数据 - 布局
	//				（~struct~DrillWindowLayout）
	//==============================
	DrillUp.drill_SGaA_initWindowLayout = function( dataFrom ) {
		var data = {};
		data['layoutType'] = String( dataFrom["布局类型"] || "默认皮肤");
		data['layoutSrc'] = String( dataFrom["资源-贴图"] || "");
		data['layoutSrcFile'] = "img/Menu__picturegallery/";
		data['layoutX'] = Number( dataFrom["贴图位置修正 X"] || 0);
		data['layoutY'] = Number( dataFrom["贴图位置修正 Y"] || 0);
		return data;
	}
	//==============================
	// * 静态数据 - 选项窗口参数
	//				（~struct~DrillSelectWindow）
	//==============================
	DrillUp.drill_SGaA_initCommandWindow = function( dataFrom ) {
		var data = {};
		data['x'] = Number( dataFrom["选项窗口 X"] || 50);
		data['y'] = Number( dataFrom["选项窗口 Y"] || 160);
		data['width'] = Number( dataFrom["选项窗口宽度"] || 210);
		data['height'] = Number( dataFrom["选项窗口高度"] || 360);
		data['col'] = Number( dataFrom["选项窗口列数"] || 1);
		data['itemHeight'] = Number( dataFrom["每条选项高度"] || 36);
		data['nameExEnabled'] = String( dataFrom["是否启用选项内容"] || "false") == "true";
		data['align'] = String( dataFrom["选项窗口对齐方式"] || "左对齐");
		data['fontsize'] = Number( dataFrom["选项窗口字体大小"] || 20);
		if( dataFrom["选项窗口移动动画"] != "" &&
			dataFrom["选项窗口移动动画"] != undefined ){
			var slideAnim = JSON.parse( dataFrom["选项窗口移动动画"] );
			var slideAnim_data = DrillUp.drill_SGaA_initWindowMoving( slideAnim );
			for(var key in slideAnim_data){		//（注意，这里的 移动动画参数 是平铺的）
				data[ key ] = slideAnim_data[ key ];
			}
		}
		if( dataFrom["选项窗口布局"] != "" &&
			dataFrom["选项窗口布局"] != undefined ){
			var layout = JSON.parse( dataFrom["选项窗口布局"] );
			var layout_data = DrillUp.drill_SGaA_initWindowLayout( layout );
			for(var key in layout_data){		//（注意，这里的 布局参数 是平铺的）
				data[ key ] = layout_data[ key ];
			}
		}
		if( dataFrom["选项窗口指针与边框"] != "" &&
			dataFrom["选项窗口指针与边框"] != undefined ){
			var cursor = JSON.parse( dataFrom["选项窗口指针与边框"] );
			data['cursor'] = DrillUp.drill_SGaA_initMenuCursor( cursor );
		}else{
			data['cursor'] = DrillUp.drill_SGaA_initMenuCursor( {} );
		}
		data['icon_enabled'] = String( dataFrom["是否启用选项小缩略图"] || "false") == "true";
		data['icon_mode'] = String( dataFrom["选项小缩略图缩放模式"] || "等比缩放");
		data['icon_black'] = String( dataFrom["是否涂黑小缩略图背景"] || "false") == "true";
		return data;
	}
	//==============================
	// * 静态数据 - 选项按钮组
	//				（~struct~DrillCommandButton）
	//==============================
	DrillUp.drill_SGaA_initCommandButton = function( dataFrom ) {
		var data = {};
		data['x'] = Number( dataFrom["平移-按钮组 X"] || 70);
		data['y'] = Number( dataFrom["平移-按钮组 Y"] || 180);
		data['style_id'] = Number( dataFrom["按钮组样式"] || 0);
		data['btn_constructor'] = "Window_Selectable";
		data['btn_src_file'] = "img/Menu__picturegallery/";
		data['btn_src_default'] = String( dataFrom["默认按钮贴图"] || "");
		if( dataFrom["按钮贴图序列"] != "" &&
			dataFrom["按钮贴图序列"] != undefined ){
			data['btn_src'] = JSON.parse( dataFrom["按钮贴图序列"] );
		}else{
			data['btn_src'] = [];
		}
		data['btn_srcKeyword'] = [];
		data['active_enableMouseOk'] = true;	//（鼠标ok点击 关闭）
		return data;
	}
	//==============================
	// * 静态数据 - 内容
	//				（~struct~DrillSGaA）
	//==============================
	DrillUp.drill_SGaA_initContext = function( dataFrom ) {
		var data = {};
		
		// > 选项名处理（填英语唯一key，显示靠本地化API）
		data['name'] = String( dataFrom["选项名"] || "" );

		// > 父分类处理（英语唯一key，显示靠本地化API；空表示无分类）
		data['category'] = String( dataFrom["父分类"] || "" );
		
		// > 选项内容处理
		if( dataFrom["选项内容"] != "" &&
			dataFrom["选项内容"] != undefined ){
			data['nameEx'] = JSON.parse( dataFrom["选项内容"] );
		}else{
			data['nameEx'] = "";
		}
		
		// > 显示处理
		data['enabled'] = (dataFrom["是否初始显示"] || "false") == "true" ;
		
		// > 锁定处理
		data['locked'] = (dataFrom["是否初始锁定"] || "false") == "true" ;
		
		// > 画廊图片
		data['pic'] = (dataFrom["资源-画廊图片"] || "");
		
		// > 画廊描述内容处理
		if( dataFrom["画廊描述内容"] != "" &&
			dataFrom["画廊描述内容"] != undefined ){
			data['context'] = JSON.parse( dataFrom["画廊描述内容"] );
		}else{
			data['context'] = "";
		}
		data['contextAlign'] = String(dataFrom["画廊描述内容对齐方式"] || "左对齐");
		data['contextAutoLineheight'] = String(dataFrom["画廊描述内容是否自适应行间距"] || "true") === "true";
		data['contextLineheight'] = Number(dataFrom["画廊描述内容固定行间距"] || 28);

		return data;
	}
	//==============================
	// * 【开放接口】本地化 - CG选项名
	//
	//			optionKey：	插件参数"选项名"里填的英语唯一key。
	//			picId：		该CG的唯一序号（内容列表 index，1~80）。
	//			返回：		要显示的文本。默认原样返回 key，请自行重写按 key/语言返回对应文本。
	//==============================
	DrillUp.drill_SGaA_localizeOption = function( optionKey, picId ){
		let test = optionKey;
		if ( test.trim() === "" ){
			 test = "无名称";
		}
		return String( test );	
	};
	//==============================
	// * 【开放接口】本地化 - 父分类名
	//
	//			categoryKey：	插件参数"父分类"里填的英语唯一key。
	//			返回：			要显示的分类名。默认原样返回 key，请自行重写按 key/语言返回对应文本。
	//==============================
	DrillUp.drill_SGaA_localizeCategory = function( categoryKey ){
		const key = String( categoryKey ?? "" );
		let textArray = window.mapCommonEventDialogue?.gallerySystem?.[key];
		let text = Array.isArray(textArray) ? textArray.join('\n') : textArray;
		if( text == null ){ text = key; }
		const wb = new Window_Base(0, 0, 0, 0);
		text = wb.convertEscapeCharacters(text);
		return String( text );
	};
	//==============================
	// * 【开放接口】打开画廊并直达指定父分类
	//
	//			categoryKey：	父分类英语唯一key（与CG参数"父分类"一致）。
	//			用法：		事件脚本里调用 DrillUp.drill_SGaA_openCategory("hometown");
	//						类似单图模式：设置直达目标后打开画廊场景，直接落在该分类的CG列表页。
	//			说明：		需启用"是否启用父分类"；若该key下无可见CG，列表会为空。
	//==============================
	DrillUp.drill_SGaA_openCategory = function( categoryKey ){
		$gameTemp._drill_SGaA_jumpCategory = String( categoryKey );
		SceneManager.push( Scene_Drill_SGaA );
	};
	//==============================
	// * 【开放接口】回想脚本表 - 按CG选项名维护
	//
	//			说明：	key = 插件参数"选项名"里填的英语唯一key。
	//					value = 脚本字符串（以eval执行）或函数（直接调用，多行逻辑推荐用函数）。
	//					在此表登记的CG才会显示回想按钮，点击后退出画廊并执行对应内容；
	//					没登记的CG查不到内容，视为无回想、不显示按钮。
	//					其他插件也可后置追加：DrillUp.g_SGaA_recallScriptMap["xxx"] = "..."/function(){...};
	//==============================
	DrillUp.g_SGaA_recallScriptMap = {
		//	"tea_party_1": "$gameTemp.reserveCommonEvent( 12 );",		//（示例：单行脚本字符串）
		//	"tea_party_2": function(){									//（示例：多行逻辑用函数）
		//		$gameSwitches.setValue( 21, true );
		//		$gamePlayer.reserveTransfer( 18, 5, 10, 2, 0 );
		//		$gameTemp.reserveCommonEvent( 12 );
		//	},
		"430": function(){		
            RecallStage.start('430');
		},
		"431": function(){		
            RecallStage.start('431');
		},
		"432": function(){		
            RecallStage.start('432');
		},		
		"433": function(){		
            RecallStage.start('433');
		},		
		"434": function(){		
            RecallStage.start('434');
		},		
		"435": function(){		
            RecallStage.start('435');
		},		
		"436": function(){		
            RecallStage.start('436');
		},		
		"437": function(){		
            RecallStage.start('437');
		}		
	};
	//==============================
	// * 【开放接口】回想脚本 - 按选项名查询
	//
	//			optionKey：	CG的选项名唯一key。
	//			返回：		该CG的回想脚本（字符串或函数）；表里查不到时返回空字符串（表示无回想按钮）。
	//==============================
	DrillUp.drill_SGaA_getRecallScript = function( optionKey ){
		var script = DrillUp.g_SGaA_recallScriptMap[ String( optionKey ) ];
		if( typeof script == "function" ){ return script; }
		if( script == undefined || String( script ) == "" ){ return ""; }
		return String( script );
	};
	//==============================
	// * 回想脚本 - 按内容数据项查询
	//
	//			说明：	回想脚本表(g_SGaA_recallScriptMap)是唯一判断来源，
	//					按选项名key查表，查不到即视为该CG无回想功能。
	//==============================
	DrillUp.drill_SGaA_getRecallScriptByData = function( data ){
		if( data == undefined ){ return ""; }
		return DrillUp.drill_SGaA_getRecallScript( data['name'] );
	};
	//==============================
	// * 回想脚本 - 执行
	//
	//			说明：	函数则直接调用，字符串则以eval执行。出错时打印错误信息，不中断游戏。
	//==============================
	DrillUp.drill_SGaA_runRecallScript = function( script ){
		try{
			if( typeof script == "function" ){
				script();
			}else{
				eval( String( script ) );
			}
		}catch( e ){
			console.error("【Drill_SceneGalleryA.js 回想脚本执行出错】\n脚本内容：" + script + "\n", e );
		}
	};
	//==============================
	// * 【开放接口】回想确认弹窗文本 - 按选项名组装
	//
	//			optionKey：	该CG的选项名唯一key。
	//			picId：		该CG的唯一序号（内容列表 index）。
	//			返回：		confirm() 弹窗里显示的询问文本。
	//			说明：		触发回想前会先以 window.confirm(此文本) 询问玩家，OK才执行。
	//					多语言请自行重写此函数按当前语言组装文本，
	//					可用 DrillUp.drill_SGaA_localizeOption(optionKey,picId) 获取CG显示名。
	//==============================
	DrillUp.drill_SGaA_makeRecallConfirmText = function( optionKey, picId ){
		let textArray = window.mapCommonEventDialogue?.gallerySystem?.startRecall;
		const text = Array.isArray(textArray) ? textArray.join('\n') : textArray;
		return text;
	};
	//==============================
	// * 【开放接口】动画CG表 - 按CG选项名维护
	//
	//			说明：	key = 选项名唯一key，value = img/movies/ 下的视频文件名（可不带扩展名，
	//					自动按 MoviePicture 的伪装扩展名 .nlch 补全）。
	//					登记后，列表缩略图预览改为播放该视频（静音循环，等比缩放到缩略图区域，
	//					视频就绪前仍显示静态缩略图作为占位）。
	//					依赖 MoviePicture.js 的视频加载器（ImageManager.loadVideo）。
	//					视频规格约定：VP8 webm、960x540、无alpha通道。
	//==============================
	DrillUp.g_SGaA_videoThumbMap = {
        "430": "[NSFW]recallCgThumb430",
		"431": "[NSFW]recallCgThumb431",
		"432": "[NSFW]recallCgThumb432",
		"433": "[NSFW]recallCgThumb433",
		"434": "[NSFW]recallCgThumb434",
		"435": "[NSFW]recallCgThumb435",
		"436": "[NSFW]recallCgThumb436",
		"437": "[NSFW]recallCgThumb437"

	};


	/*-----------------杂项------------------*/
    DrillUp.g_SGaA_layout = String(DrillUp.parameters["资源-整体布局"] || "");
	DrillUp.g_SGaA_add_to_menu = String(DrillUp.parameters["是否添加到主菜单"] || "true") === "true";	
    DrillUp.g_SGaA_menu_name = String(DrillUp.parameters["主菜单显示名"] || "");
	DrillUp.g_SGaA_add_to_title = String(DrillUp.parameters["是否在标题窗口中显示"] || "false") === "true";	
    DrillUp.g_SGaA_title_name = String(DrillUp.parameters["标题窗口显示名"] || "");
	DrillUp.g_SGaA_title_data_global = String(DrillUp.parameters["数据是否全局存储"] || "false") === "true";	
    DrillUp.g_SGaA_title_data_fileId = Number(DrillUp.parameters["全局存储的文件路径"] || 1);	
	
	
	/*-----------------原图查看器------------------*/
	DrillUp.g_SGaA_imgExpandPic_slideTime = Number(DrillUp.parameters["原图显现时长"] || 20);
	DrillUp.g_SGaA_singlePicture_hide = String(DrillUp.parameters["单图模式时是否隐藏整体布局"] || "true") === "true";
	DrillUp.g_SGaA_recallBtn_src = String(DrillUp.parameters["资源-回想按钮"] || "");
	DrillUp.g_SGaA_recallBtn_x = Number(DrillUp.parameters["回想按钮 X"] || 1650);
	DrillUp.g_SGaA_recallBtn_y = Number(DrillUp.parameters["回想按钮 Y"] || 80);
	DrillUp.g_SGaA_recallBtn_normalOpacity = Number(DrillUp.parameters["回想按钮常态不透明度"] || 120);
	
	
	/*-----------------选项------------------*/
	DrillUp.g_SGaA_command_mode = String(DrillUp.parameters["选项模式"] || "窗口模式");
	DrillUp.g_SGaA_useCategory = String(DrillUp.parameters["是否启用父分类"] || "false") === "true";	//（两层下钻：父分类 → CG）
	if( DrillUp.parameters["选项窗口"] != "" &&
		DrillUp.parameters["选项窗口"] != undefined ){
		var data = JSON.parse( DrillUp.parameters["选项窗口"] );
		DrillUp.g_SGaA_command_window = DrillUp.drill_SGaA_initCommandWindow( data );
	}else{
		DrillUp.g_SGaA_command_window = DrillUp.drill_SGaA_initCommandWindow( {} );
	}
	if( DrillUp.parameters["选项按钮组"] != "" &&
		DrillUp.parameters["选项按钮组"] != undefined ){
		var data = JSON.parse( DrillUp.parameters["选项按钮组"] );
		DrillUp.g_SGaA_command_button = DrillUp.drill_SGaA_initCommandButton( data );
	}else{
		DrillUp.g_SGaA_command_button = DrillUp.drill_SGaA_initCommandButton( {} );
	}

	/*-----------------描述窗口------------------*/
	DrillUp.g_SGaA_descWin_x = Number(DrillUp.parameters["描述窗口 X"] || 285);
	DrillUp.g_SGaA_descWin_y = Number(DrillUp.parameters["描述窗口 Y"] || 420);
	DrillUp.g_SGaA_descWin_width = Number(DrillUp.parameters["描述窗口宽度"] || 450);
	DrillUp.g_SGaA_descWin_height = Number(DrillUp.parameters["描述窗口高度"] || 180);
	DrillUp.g_SGaA_descWin_fontsize = Number(DrillUp.parameters["描述窗口字体大小"] || 22);
	DrillUp.g_SGaA_descWin_replay = String(DrillUp.parameters["是否重播描述窗口移动动画"] || "true") === "true";	
	if( DrillUp.parameters["描述窗口移动动画"] != "" &&
		DrillUp.parameters["描述窗口移动动画"] != undefined ){
		var data = JSON.parse( DrillUp.parameters["描述窗口移动动画"] );
		DrillUp.g_SGaA_descWin_slideAnim = DrillUp.drill_SGaA_initWindowMoving( data );
	}else{
		DrillUp.g_SGaA_descWin_slideAnim = DrillUp.drill_SGaA_initWindowMoving( {} );
	}
	if( DrillUp.parameters["描述窗口布局"] != "" &&
		DrillUp.parameters["描述窗口布局"] != undefined ){
		var data = JSON.parse( DrillUp.parameters["描述窗口布局"] );
		DrillUp.g_SGaA_descWin_layout = DrillUp.drill_SGaA_initWindowLayout( data );
	}else{
		DrillUp.g_SGaA_descWin_layout = DrillUp.drill_SGaA_initWindowLayout( {} );
	}

	/*-----------------缩略图------------------*/
	DrillUp.g_SGaA_Thumbnail_x = Number(DrillUp.parameters["缩略图 X"] || 285);
	DrillUp.g_SGaA_Thumbnail_y = Number(DrillUp.parameters["缩略图 Y"] || 60);
	DrillUp.g_SGaA_Thumbnail_width = Number(DrillUp.parameters["缩略图宽度"] || 450);
	DrillUp.g_SGaA_Thumbnail_height = Number(DrillUp.parameters["缩略图高度"] || 340);
	DrillUp.g_SGaA_Thumbnail_mode = String(DrillUp.parameters["缩略图缩放模式"] || "等比缩放");
	DrillUp.g_SGaA_Thumbnail_replay = String(DrillUp.parameters["是否重播缩略图移动动画"] || "true") === "true";	
	DrillUp.g_SGaA_Thumbnail_showInstant = String(DrillUp.parameters["是否瞬间显示缩略图"] || "false") === "true";	
	if( DrillUp.parameters["缩略图移动动画"] != "" &&
		DrillUp.parameters["缩略图移动动画"] != undefined ){
		var data = JSON.parse( DrillUp.parameters["缩略图移动动画"] );
		DrillUp.g_SGaA_Thumbnail_slideAnim = DrillUp.drill_SGaA_initWindowMoving( data );
	}else{
		DrillUp.g_SGaA_Thumbnail_slideAnim = DrillUp.drill_SGaA_initWindowMoving( {} );
	}
	
	/*-----------------完成度窗口------------------*/
	DrillUp.g_SGaA_compWin_x = Number(DrillUp.parameters["完成度窗口 X"] || 50);
	DrillUp.g_SGaA_compWin_y = Number(DrillUp.parameters["完成度窗口 Y"] || 530);
	DrillUp.g_SGaA_compWin_width = Number(DrillUp.parameters["完成度窗口宽度"] || 210);
	DrillUp.g_SGaA_compWin_height = Number(DrillUp.parameters["完成度窗口高度"] || 70);
	DrillUp.g_SGaA_compWin_fontsize = Number(DrillUp.parameters["完成度窗口字体大小"] || 22);
	DrillUp.g_SGaA_compWin_word = String(DrillUp.parameters["完成度用语"] || "完成度：");
	if( DrillUp.parameters["完成度窗口移动动画"] != "" &&
		DrillUp.parameters["完成度窗口移动动画"] != undefined ){
		var data = JSON.parse( DrillUp.parameters["完成度窗口移动动画"] );
		DrillUp.g_SGaA_compWin_slideAnim = DrillUp.drill_SGaA_initWindowMoving( data );
	}else{
		DrillUp.g_SGaA_compWin_slideAnim = DrillUp.drill_SGaA_initWindowMoving( {} );
	}
	if( DrillUp.parameters["完成度窗口布局"] != "" &&
		DrillUp.parameters["完成度窗口布局"] != undefined ){
		var data = JSON.parse( DrillUp.parameters["完成度窗口布局"] );
		DrillUp.g_SGaA_compWin_layout = DrillUp.drill_SGaA_initWindowLayout( data );
	}else{
		DrillUp.g_SGaA_compWin_layout = DrillUp.drill_SGaA_initWindowLayout( {} );
	}
	
	/*-----------------锁定内容------------------*/
	DrillUp.g_SGaA_locked_name = String(DrillUp.parameters["用语-锁定的选项名"] || "");
	DrillUp.g_SGaA_locked_name = DrillUp.g_SGaA_locked_name.replace(/\\\\/g,"\\");		//（消除单串字符"\\"过多情况）
	if( DrillUp.parameters["用语-锁定的选项内容"] != "" &&
		DrillUp.parameters["用语-锁定的选项内容"] != undefined ){
		DrillUp.g_SGaA_locked_context = JSON.parse( DrillUp.parameters["用语-锁定的选项内容"] );
	}else{
		DrillUp.g_SGaA_locked_context = "";
	}
	DrillUp.g_SGaA_locked_type = String(DrillUp.parameters["内容锁定方式"] || "锁定缩略图和描述内容");
	DrillUp.g_SGaA_locked_pic = String(DrillUp.parameters["资源-上锁的缩略图"] || "");
	
	/*-----------------内容------------------*/
	DrillUp.g_SGaA_context_list_length = 80;
	DrillUp.g_SGaA_context_list = [];
	for( var i = 1; i <= DrillUp.g_SGaA_context_list_length; i++ ){
		if( DrillUp.parameters["内容-" + String(i) ] != "" &&
			DrillUp.parameters["内容-" + String(i) ] != undefined ){
			var data = JSON.parse(DrillUp.parameters["内容-" + String(i)] );
			DrillUp.g_SGaA_context_list[i] = DrillUp.drill_SGaA_initContext( data );
			DrillUp.g_SGaA_context_list[i]['index'] = i;
		}else{
			DrillUp.g_SGaA_context_list[i] = null;
		}
	};
	
	/*-----------------全局存储对象------------------*/
	DrillUp.global_SGaA_enableTank = null;
	DrillUp.global_SGaA_lockTank = null;
	
	
//=============================================================================
// * >>>>基于插件检测>>>>
//=============================================================================
if( Imported.Drill_CoreOfInput &&
	Imported.Drill_CoreOfGlobalSave &&
	Imported.Drill_CoreOfWindowAuxiliary &&
	Imported.Drill_CoreOfSelectableButton ){
	
	
//=============================================================================
// ** ☆全局存储
//=============================================================================
//==============================
// * 全局 - 检查数据 - 显示情况
//==============================
DrillUp.drill_SGaA_gCheckData_enable = function(){
	for( var i = 1; i <= DrillUp.g_SGaA_context_list_length ; i++ ){
		var temp_c = DrillUp.g_SGaA_context_list[i];
		
		// > 指定数据为空时
		if( DrillUp.global_SGaA_enableTank[i] == null ){
			if( temp_c == null ){		//（无内容配置，跳过）
				DrillUp.global_SGaA_enableTank[i] = null;
			}else{						//（有内容配置，初始化默认）
				DrillUp.global_SGaA_enableTank[i] = temp_c['enabled'];
			}
			
		// > 不为空则跳过检查
		}else{
			//（不操作）
		}
	}
}
//==============================
// * 全局 - 检查数据 - 锁定情况
//==============================
DrillUp.drill_SGaA_gCheckData_lock = function(){
	for( var i = 1; i <= DrillUp.g_SGaA_context_list_length ; i++ ){
		var temp_c = DrillUp.g_SGaA_context_list[i];
		
		// > 指定数据为空时
		if( DrillUp.global_SGaA_lockTank[i] == null ){
			if( temp_c == null ){		//（无内容配置，跳过）
				DrillUp.global_SGaA_lockTank[i] = null;
			}else{						//（有内容配置，初始化默认）
				DrillUp.global_SGaA_lockTank[i] = temp_c['locked'];
			}
			
		// > 不为空则跳过检查
		}else{
			//（不操作）
		}
	}
}
//==============================
// * 全局 - 读取
//==============================
	var global_fileId = DrillUp.g_SGaA_title_data_fileId;
	var global_data = StorageManager.drill_COGS_loadData( global_fileId, "SGaA" );
	
	// > 显示情况
	if( DrillUp.global_SGaA_enableTank == null ){			//（游戏没关时，不会为null)
		var data = global_data["global_enableTank"];
		if( data == undefined ){ data = [] };
		DrillUp.global_SGaA_enableTank = data;
		DrillUp.drill_SGaA_gCheckData_enable();				//（检查时自动赋新值）
	}
	// > 锁定情况
	if( DrillUp.global_SGaA_lockTank == null ){	
		var data = global_data["global_lockTank"];
		if( data == undefined ){ data = [] };
		DrillUp.global_SGaA_lockTank = data;
		DrillUp.drill_SGaA_gCheckData_lock();
	}
	
//==============================
// * 全局 - 存储
//==============================
StorageManager.drill_SGaA_saveData = function(){
	var file_id = DrillUp.g_SGaA_title_data_fileId;
	var data = {};
	data["global_enableTank"] = DrillUp.global_SGaA_enableTank;
	data["global_lockTank"] = DrillUp.global_SGaA_lockTank;
	this.drill_COGS_saveData( file_id, "SGaA", data );
};


//#############################################################################
// ** 【标准模块】存储数据 ☆存储数据
//#############################################################################
//##############################
// * 存储数据 - 参数存储 开关
//          
//			说明：	> 如果该插件开放了用户可以修改的参数，就注释掉。
//##############################
DrillUp.g_SGaA_saveEnabled = true;
//##############################
// * 存储数据 - 初始化
//          
//			说明：	> 下方为固定写法，不要动。
//##############################
var _drill_SGaA_sys_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _drill_SGaA_sys_initialize.call(this);
	this.drill_SGaA_initSysData();
};
//##############################
// * 存储数据 - 载入存档
//          
//			说明：	> 下方为固定写法，不要动。
//##############################
var _drill_SGaA_sys_extractSaveContents = DataManager.extractSaveContents;
DataManager.extractSaveContents = function( contents ){
	_drill_SGaA_sys_extractSaveContents.call( this, contents );
	
	// > 参数存储 启用时（检查数据）
	if( DrillUp.g_SGaA_saveEnabled == true ){	
		$gameSystem.drill_SGaA_checkSysData();
		
	// > 参数存储 关闭时（直接覆盖）
	}else{
		$gameSystem.drill_SGaA_initSysData();
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
Game_System.prototype.drill_SGaA_initSysData = function() {
	this.drill_SGaA_initSysData_Private();
};
//##############################
// * 存储数据 - 载入存档时检查数据【标准函数】
//			
//			参数：	> 无
//			返回：	> 无
//          
//			说明：	> 强行规范的接口，载入存档时执行的数据检查操作。
//##############################
Game_System.prototype.drill_SGaA_checkSysData = function() {
	this.drill_SGaA_checkSysData_Private();
};
//=============================================================================
// ** 存储数据（接口实现）
//=============================================================================
//==============================
// * 存储数据 - 初始化数据（私有）
//==============================
Game_System.prototype.drill_SGaA_initSysData_Private = function() {
	
	this._drill_SGaA_enableTank = [];				//显示情况
	this._drill_SGaA_lockTank = [];					//锁定情况
	for(var i = 0; i < DrillUp.g_SGaA_context_list.length; i++){
		var temp_data = DrillUp.g_SGaA_context_list[i];
		if( temp_data == undefined ){ continue; }
		this._drill_SGaA_enableTank[i] = temp_data['enabled'];
		this._drill_SGaA_lockTank[i] = temp_data['locked'];
	}
};
//==============================
// * 存储数据 - 载入存档时检查数据（私有）
//==============================
Game_System.prototype.drill_SGaA_checkSysData_Private = function() {
	
	// > 旧存档数据自动补充
	if( this._drill_SGaA_enableTank == undefined ){
		this.drill_SGaA_initSysData();
	}
	
	// > 容器的 空数据 检查
	for( var i = 0; i < DrillUp.g_SGaA_context_list.length; i++ ){
		var temp_data = DrillUp.g_SGaA_context_list[i];
		
		// > 已配置（undefined表示未配置的空数据）
		if( temp_data != undefined ){
			
			// > 未存储的，重新初始化
			if( this._drill_SGaA_enableTank[i] == undefined ){
				this._drill_SGaA_enableTank[i] = temp_data['enabled'];
			
			// > 已存储的，跳过
			}else{
				//（不操作）
			}
			
			// > 未存储的，重新初始化
			if( this._drill_SGaA_lockTank[i] == undefined ){
				this._drill_SGaA_lockTank[i] = temp_data['locked'];
			
			// > 已存储的，跳过
			}else{
				//（不操作）
			}
		}
	}
};



//=============================================================================
// ** ☆插件指令
//=============================================================================
var _drill_SGaA_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	_drill_SGaA_pluginCommand.call(this, command, args);
	if( command === ">画廊A" ){
		
		if(args.length == 2){
			var type = String(args[1]);
			if( type == "打开面板" ){			//打开菜单
				SceneManager.push(Scene_Drill_SGaA);
			}
			if( type == "显示全部" ){
				for( var i = 1; i <= DrillUp.g_SGaA_context_list_length; i++){
					DrillUp.global_SGaA_enableTank[i] = true;			//全局存储
					$gameSystem._drill_SGaA_enableTank[i] = true;		//正常存储
				}
				StorageManager.drill_SGaA_saveData();
			}
			if( type == "隐藏全部" ){
				for( var i = 1; i <= DrillUp.g_SGaA_context_list_length; i++){
					DrillUp.global_SGaA_enableTank[i] = false;			//全局存储
					$gameSystem._drill_SGaA_enableTank[i] = false;		//正常存储
				}
				StorageManager.drill_SGaA_saveData();
			}
			if( type == "锁定全部" ){
				for( var i = 1; i <= DrillUp.g_SGaA_context_list_length; i++){
					DrillUp.global_SGaA_lockTank[i] = true;				//全局存储
					$gameSystem._drill_SGaA_lockTank[i] = true;			//正常存储
				}
				StorageManager.drill_SGaA_saveData();
			}
			if( type == "解锁全部" ){
				for( var i = 1; i <= DrillUp.g_SGaA_context_list_length; i++){
					DrillUp.global_SGaA_lockTank[i] = false;			//全局存储
					$gameSystem._drill_SGaA_lockTank[i] = false;		//正常存储
				}
				StorageManager.drill_SGaA_saveData();
			}
		}
		
		if(args.length == 4){
			var type = String(args[1]);
			var temp1 = String(args[3]);
			if( type == "显示选项" ){
				DrillUp.global_SGaA_enableTank[ Number(temp1) ] = true;			//全局存储
				$gameSystem._drill_SGaA_enableTank[ Number(temp1) ] = true;		//正常存储
				StorageManager.drill_SGaA_saveData();
			}
			if( type == "隐藏选项" ){
				DrillUp.global_SGaA_enableTank[ Number(temp1) ] = false;		//全局存储
				$gameSystem._drill_SGaA_enableTank[ Number(temp1) ] = false;	//正常存储
				StorageManager.drill_SGaA_saveData();
			}
			if( type == "锁定选项" ){
				DrillUp.global_SGaA_lockTank[ Number(temp1) ] = true;			//全局存储
				$gameSystem._drill_SGaA_lockTank[ Number(temp1) ] = true;		//正常存储
				StorageManager.drill_SGaA_saveData();
			}
			if( type == "解锁选项" ){
				DrillUp.global_SGaA_lockTank[ Number(temp1) ] = false;			//全局存储
				$gameSystem._drill_SGaA_lockTank[ Number(temp1) ] = false;		//正常存储
				StorageManager.drill_SGaA_saveData();
			}
			if( type == "选中页" ){
				$gameSystem._drill_SGaA_context_index = Number(temp1) -1;
			}
			if( type == "打开面板(单图查看模式)" ){
				temp1 = temp1.replace("内容[","");
				temp1 = temp1.replace("]","");
				temp1 = Number(temp1);
				$gameTemp._drill_SGaA_isSinglePictureMode = true;
				$gameTemp._drill_SGaA_isSinglePictureIndex = temp1;		//（不需要-1）
				SceneManager.push(Scene_Drill_SGaA);
			}
		}
	}
	
};



//=============================================================================
// ** ☆主菜单选项
//
//			说明：	> 此模块专门关联主菜单选项，选项进入后跳转到 画廊A 界面。
//					（插件完整的功能目录去看看：功能结构树）
//=============================================================================
var _drill_SGaA_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function() {
	_drill_SGaA_createCommandWindow.call(this);
    this._commandWindow.setHandler('Drill_SGaA',   this.drill_SGaA_menuCommand.bind(this));
};
Scene_Menu.prototype.drill_SGaA_menuCommand = function() {
    SceneManager.push(Scene_Drill_SGaA);
};
var _drill_SGaA_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
Window_MenuCommand.prototype.addOriginalCommands = function() {
	_drill_SGaA_addOriginalCommands.call(this);
	if( DrillUp.g_SGaA_add_to_menu ){
		this.addCommand(DrillUp.g_SGaA_menu_name, 'Drill_SGaA', this.areMainCommandsEnabled());
	}
};

//=============================================================================
// ** ☆标题选项
//
//			说明：	> 此模块专门关联标题选项，选项进入后跳转到 画廊A 界面。
//					（插件完整的功能目录去看看：功能结构树）
//=============================================================================	
var _drill_SGaA_title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    _drill_SGaA_title_createCommandWindow.call(this);
	this._commandWindow.setHandler('Drill_SGaA',  this.drill_SGaA_titleCommand.bind(this));
};
Scene_Title.prototype.drill_SGaA_titleCommand = function() {
    this._commandWindow.close();
    SceneManager.push(Scene_Drill_SGaA);
};
var _drill_SGaA_title_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    _drill_SGaA_title_makeCommandList.call(this);
	if( DrillUp.g_SGaA_add_to_title ){
		this.addCommand( DrillUp.g_SGaA_title_name ,'Drill_SGaA');
	}
};	


//=============================================================================
// ** ☆面板控制
//
//			说明：	> 此模块专门将部分面板配置转移到 Game_Temp 方便随时调用。
//					（插件完整的功能目录去看看：功能结构树）
//=============================================================================
//==============================
// * 面板控制 - 初始化
//==============================
var _drill_SGaA_temp_initialize = Game_Temp.prototype.initialize;
Game_Temp.prototype.initialize = function() {	
	_drill_SGaA_temp_initialize.call(this);
	
	this._drill_SGaA_isSinglePictureMode = false;	//单图查看模式（插件指令标记）
	this._drill_SGaA_isSinglePictureIndex = 0;		//单图id
	this._drill_SGaA_visibleDataList = [];			//可见的列表
	this._drill_SGaA_curCategory = null;			//当前所在父分类key（null=分类层；启用父分类时有效）
	this._drill_SGaA_jumpCategory = null;			//打开画廊时要直达的父分类key（消费一次后清空）
};
//==============================
// * 面板控制 - 判断 锁定情况
//==============================
Game_Temp.prototype.drill_SGaA_isLocked = function( context_realIndex ){
	
	// > 全局存储控制
	if( DrillUp.g_SGaA_title_data_global == true ){
		if( DrillUp.global_SGaA_lockTank[ context_realIndex ] == true ){
			return true;
		}else{
			return false;
		}
		
	// > 正常存储控制
	}else{
		if( $gameSystem._drill_SGaA_lockTank[ context_realIndex ] == true ){
			return true;
		}else{
			return false;
		}
	}
}
//==============================
// * 面板控制 - 判断 显示情况
//==============================
Game_Temp.prototype.drill_SGaA_isEnabled = function( context_realIndex ){
	
	// > 全局存储控制
	if( DrillUp.g_SGaA_title_data_global == true ){
		if( DrillUp.global_SGaA_enableTank[ context_realIndex ] == true ){
			return true;
		}else{
			return false;
		}
		
	// > 正常存储控制
	}else{
		if( $gameSystem._drill_SGaA_enableTank[ context_realIndex ] == true ){
			return true;
		}else{
			return false;
		}
	}
}
//==============================
// * 面板控制 - 资源文件夹
//==============================
ImageManager.load_MenuGallery = function(filename) {
    return this.loadBitmap('img/Menu__picturegallery/', filename, 0, true);
};



//=============================================================================
// ** 画廊A【Scene_Drill_SGaA】
//
//			主功能：	画廊的基本功能。
//			子功能：
//						->基本功能
//							> 继承属性
//							> 初始化
//							> 创建
//							> 帧刷新
//							> 析构函数（关闭单图模式）
//						->选项变化
//							->重设窗口起点
//							->缩略图刷新
//							->（描述窗口刷新在自身中进行）
//						->流程
//							->退出窗口（cancel键）
//							->选项窗口按钮确认（ok键，进入大图）
//							->离开原图查看器（cancel键，离开大图）
//						->流程（单图模式）
//							->退出窗口（cancel键，直接从大图退出）
//			主要成员：
//						> ._window_select						选项窗口
//						> ._drill_SGaA_commandButtonSprite		按钮组贴图
//						> ._window_desc							描述窗口
//						> ._sprite_thumbnail					缩略图
//						> ._window_comp							完成度窗口
//						> ._window_imgExpand					原图查看器 窗口
//						> ._sprite_imgExpand_pic				原图查看器 贴图
//
//			说明：	> 注意单图模式和非单图模式的流程情况。
//=============================================================================
//==============================
// * 画廊A - 定义
//==============================
function Scene_Drill_SGaA() {
    this.initialize.apply(this, arguments);
}
Scene_Drill_SGaA.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Drill_SGaA.prototype.constructor = Scene_Drill_SGaA;
//==============================
// * 画廊A - 初始化
//==============================
Scene_Drill_SGaA.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
	this._cur_index = -1;
	this._drill_SGaA_curExpandPicId = -1;		//（当前正在鉴赏的 CG 唯一序号，未鉴赏时 -1）
};
//==============================
// * 画廊A - 创建
//============================== 
Scene_Drill_SGaA.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);

	// > 画布平滑（ImageSmoothSetting.js：画廊全部为2D插图，无条件平滑；退出时在 terminate 按地图备注重设）
	window.canvasSmooth?.( true );

	// > 创建布局层（先画，其图层都被放在后面）
	this._drill_field = new Sprite();
	this.addChild(this._drill_field);

	this.drill_loadAllSrc();				//创建 - 资源全加载
	this.drill_createLayout();				//创建 - 整体布局
	this.drill_createSelect();				//创建 - 选项窗口
	this.drill_createCategoryHeader();		//创建 - 父分类标题（列表上方显示当前分类名）
	this.drill_createCommandButton();		//创建 - 选项按钮组
	this.drill_createDesc();				//创建 - 描述窗口
	this.drill_createThumbnail();			//创建 - 缩略图
	this.drill_createVideoThumb();			//创建 - 动画CG预览（视频，缩略图上层）
	this.drill_createListPreviewDecor();	//创建 - 列表右侧预览装饰（黄色CG名 + 上下渐隐横线）
	//this.drill_createComp();				//创建 - 完成度窗口-目前不需要
	this.drill_createImgExpandText();		//创建 - 原图查看器上下描述文本（在原图贴图之前创建，使其位于原图下层，放大时被原图盖住）
	this.drill_createImgExpandSprite();		//创建 - 原图查看器贴图
	this.drill_createListRecallButton();	//创建 - 列表回想按钮（缩略图右上角）
	this.drill_createImgExpandWindow();		//创建 - 原图查看器窗口
	this.drill_createPinchListener();		//创建 - 双指捏合监听（安卓触屏缩放）
	
	this.drill_createSinglePictureMode();	//创建 - 单图查看模式
};
//==============================
// * 画廊A - 帧刷新
//==============================
Scene_Drill_SGaA.prototype.update = function() {
	// > 双指落下时屏蔽引擎默认的"取消"，避免捏合缩放误退出（退出改由 drill_updateImgExpandSprite 中的"双指轻点"手势处理）
	//		（须在窗口处理输入之前清除）
	if( this._window_imgExpand != undefined && this._window_imgExpand.active == true &&
		this._drill_SGaA_activeTouches != undefined && this._drill_SGaA_activeTouches.length >= 2 ){
		TouchInput._cancelled = false;
	}

	Scene_MenuBase.prototype.update.call(this);

	// > 选项模式
	if( DrillUp.g_SGaA_command_mode == "按钮组模式" ){
		this._window_select.y = Graphics.boxHeight * 2;
	}
	if( DrillUp.g_SGaA_command_mode == "窗口模式" ){
		this._window_select.drill_COWA_CPD_update();
	}
	if( this._drill_needDelayRefreshSelectWindow == true &&
		this.drill_isAllBitmapLoaded() == true ){
		this._drill_needDelayRefreshSelectWindow = false;
		this._window_select.refresh();
	}
	
	this._window_desc.drill_COWA_CPD_update();	//帧刷新 - 描述窗口
	this.drill_updateListRecallButton();		//帧刷新 - 列表回想按钮（须在缩略图之前，供缩略图点击判断屏蔽用）
	this.drill_updateThumbnail();				//帧刷新 - 缩略图
	this.drill_updateIndex();					//帧刷新 - 窗口选项
	this.drill_updateImgExpandSprite();			//帧刷新 - 原图查看器
	this.drill_updateImgExpandText();			//帧刷新 - 原图查看器上下描述文本
	this.drill_updateListVisible();				//帧刷新 - 查看大图时隐藏列表/缩略图/描述
	this.drill_updateCategoryHeader();			//帧刷新 - 父分类标题
	this.drill_updateListPreviewDecor();		//帧刷新 - 列表右侧预览装饰
	this.drill_updateVideoThumb();				//帧刷新 - 动画CG预览（须在 drill_updateListVisible 之后，以便接管缩略图显隐）

	this.drill_updateSinglePictureMode();		//帧刷新 - 单图查看模式
}
//==============================
// * 帧刷新 - 查看大图时隐藏 列表/缩略图/描述窗口
//
//			说明：	进入原图查看器（_window_imgExpand激活）时，隐藏画廊列表、缩略图、描述窗口；
//					退出鉴赏回到列表选单时，重新显示。无论是否自适应模式都生效。
//==============================
Scene_Drill_SGaA.prototype.drill_updateListVisible = function() {
	var b_viewing = ( this._window_imgExpand.active == true );	//（是否正在查看大图）

	this._window_select.visible = !b_viewing;		//（选项窗口/画廊列表）
	this._window_desc.visible = !b_viewing;			//（描述窗口）
	this._sprite_thumbnail.visible = !b_viewing;	//（缩略图）
	if( this._drill_SGaA_commandButtonSprite != undefined ){
		this._drill_SGaA_commandButtonSprite.visible = !b_viewing;	//（按钮组模式的按钮图层）
	}
}
//==============================
// * 创建 - 父分类标题
//==============================
Scene_Drill_SGaA.prototype.drill_createCategoryHeader = function() {
	var sprite = new Sprite();
	sprite.anchor.x = 0;
	sprite.anchor.y = 0;
	sprite.visible = false;
	sprite['_drill_lastKey'] = null;	//（上次绘制的分类key，变化时才重绘）
	this._sprite_categoryHeader = sprite;
	this.addChild( sprite );
};
//==============================
// * 帧刷新 - 父分类标题
//
//			说明：	进入某父分类的CG列表时，在列表上方显示该分类的本地化名称；
//					分类层、单图模式、查看大图时均隐藏。
//==============================
Scene_Drill_SGaA.prototype.drill_updateCategoryHeader = function() {
	var sprite = this._sprite_categoryHeader;
	if( sprite == undefined ){ return; }

	// > 是否显示：启用父分类 且 当前在某分类内 且 非单图模式 且 未在查看大图
	var viewing = ( this._window_imgExpand != undefined && this._window_imgExpand.active == true );
	var b_show = ( DrillUp.g_SGaA_useCategory == true &&
				   $gameTemp._drill_SGaA_curCategory != null &&
				   $gameTemp._drill_SGaA_isSinglePictureMode != true &&
				   viewing == false );
	sprite.visible = b_show;
	if( b_show == false ){ return; }

	// > 内容变化时才重绘
	var key = $gameTemp._drill_SGaA_curCategory;
	if( sprite['_drill_lastKey'] !== key ){
		sprite['_drill_lastKey'] = key;
		this.drill_SGaA_drawCategoryHeader( sprite, DrillUp.drill_SGaA_localizeCategory( key ) );
	}

	// > 位置：贴在选项窗口上方；X 用选项窗口的内边距对齐到列表文本的起始处
	var cmd = DrillUp.g_SGaA_command_window;
	var headerGap = 64;
	var indent = 24;	//（默认 标准内边距18 + 文本内边距6；下面尽量取窗口实际值）
	if( this._window_select != undefined &&
		this._window_select.standardPadding != undefined &&
		this._window_select.textPadding != undefined ){
		indent = this._window_select.standardPadding() + this._window_select.textPadding();
	}
	var hh = ( sprite.bitmap != undefined ) ? sprite.bitmap.height : 0;
	sprite.x = cmd['x'] + indent;
	sprite.y = cmd['y'] - hh - headerGap;
};
//==============================
// * 父分类标题 - 绘制
//==============================
Scene_Drill_SGaA.prototype.drill_SGaA_drawCategoryHeader = function( sprite, text ) {
	var cmd = DrillUp.g_SGaA_command_window;
	var ww = 480;
	var hh = 72;

	// > 对齐方式（跟随选项窗口：左对齐/居中/右对齐）
	var align = "left";
	if( cmd['align'] == "居中" ){ align = "center"; }
	else if( cmd['align'] == "右对齐" ){ align = "right"; }

	if( sprite.bitmap == undefined || sprite.bitmap.width != ww || sprite.bitmap.height != hh ){
		sprite.bitmap = new Bitmap( ww, hh );
	}else{
		sprite.bitmap.clear();
	}
	var bmp = sprite.bitmap;
	bmp.fontSize = 48;		//（标题字号，可按需调整）
	bmp.textColor = "#ffffff";
	bmp.outlineColor = "rgba(0,0,0,0.85)";
	bmp.outlineWidth = 0;
	bmp.drawText( String( text ), 0, 0, ww, hh, align );
};
//==============================
// * 创建 - 列表右侧预览装饰（黄色CG名 + 上下渐隐横线，布局对齐鉴赏页）
//==============================
Scene_Drill_SGaA.prototype.drill_createListPreviewDecor = function() {
	// > 渐隐横线贴图（端部透明→中间淡白，与鉴赏页同款）
	var lineW = ( DrillUp.g_SGaA_Thumbnail_width || 450 );
	var lineH = 2;
	var lineBmp = new Bitmap( lineW, lineH );
	lineBmp.gradientFillRect( 0,         0, lineW*0.5, lineH, "rgba(255,255,255,0)",    "rgba(255,255,255,0.55)", false );
	lineBmp.gradientFillRect( lineW*0.5, 0, lineW*0.5, lineH, "rgba(255,255,255,0.55)", "rgba(255,255,255,0)",    false );

	// > 标题（黄色CG名，底对齐，坐在上横线之上）
	var title = new Sprite();
	title.anchor.x = 0.5;
	title.anchor.y = 1;
	title.visible = false;
	title['_drill_lastText'] = null;
	this._sprite_listTitle = title;

	// > 上横线（标题与缩略图之间）
	var lineTop = new Sprite( lineBmp );
	lineTop.anchor.x = 0.5;
	lineTop.anchor.y = 0.5;
	lineTop.visible = false;
	this._sprite_listLineTop = lineTop;

	// > 下横线（描述文字下方，与上横线共用贴图）
	var lineBot = new Sprite( lineBmp );
	lineBot.anchor.x = 0.5;
	lineBot.anchor.y = 0.5;
	lineBot.visible = false;
	this._sprite_listLineBottom = lineBot;

	this.addChild( lineTop );
	this.addChild( lineBot );
	this.addChild( title );
};
//==============================
// * 帧刷新 - 列表右侧预览装饰
//
//			说明：	在列表的缩略图预览区，仿照鉴赏页布局：
//					缩略图上方=黄色CG名 + 渐隐横线；描述文字下方=渐隐横线。
//					仅当"未在看大图 且 当前选中为真实CG（非父分类）"时显示。
//==============================
Scene_Drill_SGaA.prototype.drill_updateListPreviewDecor = function() {
	var title = this._sprite_listTitle;
	var lineTop = this._sprite_listLineTop;
	var lineBot = this._sprite_listLineBottom;
	if( title == undefined ){ return; }

	// > 显示条件
	var viewing = ( this._window_imgExpand != undefined && this._window_imgExpand.active == true );
	var item = ( this._window_select != undefined ) ? $gameTemp._drill_SGaA_visibleDataList[ this._window_select.index() ] : undefined;
	var b_show = ( viewing == false && item != undefined && item['isCategory'] != true );
	title.visible = b_show;
	lineTop.visible = b_show;
	lineBot.visible = b_show;
	if( b_show == false ){ return; }

	var picId = item['index'];

	// > 标题文本（锁定时显示锁定名；否则与列表/鉴赏同源、去引号）
	var titleText;
	if( $gameTemp.drill_SGaA_isLocked( picId ) == true ){
		titleText = DrillUp.g_SGaA_locked_name;
	}else{
		titleText = this.drill_SGaA_stripQuotes( this.drill_SGaA_getExpandText_top( picId ) );
	}
	// > 先走窗口字符转换，再交给 Bitmap 绘制。
	//   此标题不是窗口，原本直接 drawText 会把 \str[n]、\v[n] 等指代字符按原样画出。
	if( this._window_desc != undefined && this._window_desc.convertEscapeCharacters != undefined ){
		titleText = this._window_desc.convertEscapeCharacters( String( titleText ) );
	}
	if( title['_drill_lastText'] !== titleText ){
		title['_drill_lastText'] = titleText;
		this.drill_SGaA_drawExpandText( title, titleText, { "fontSize":36, "textColor":"#f2c84b", "outlineColor":"rgba(0,0,0,0.85)", "outlineWidth":0 } );
	}

	// > 缩略图列的中心x、顶部y
	var thumbCX = DrillUp.g_SGaA_Thumbnail_x + DrillUp.g_SGaA_Thumbnail_width * 0.5;
	var thumbTopY = DrillUp.g_SGaA_Thumbnail_y;

	// > 让描述窗口水平居中到缩略图中轴（配合上面的"居中"对齐，底部文字就与缩略图/横线对齐）
	if( this._window_desc != undefined ){
		this._window_desc.x = Math.round( thumbCX - DrillUp.g_SGaA_descWin_width * 0.5 );
	}

	// > 上横线：缩略图上方；标题：上横线之上
	var topLineY = thumbTopY - 24;		//（横线距缩略图顶部，可调）
	lineTop.x = thumbCX;
	lineTop.y = topLineY;
	title.x = thumbCX;
	title.y = topLineY - 8;				//（标题底边距横线，可调）

	// > 下横线：描述文字下方（按行数自适应，落在文字之下）；x 与上横线同心以保证左右对齐
	var botText = this.drill_SGaA_stripQuotes( this.drill_SGaA_getExpandText_bottom( picId ) );
	var botLines = String( botText ).split( "\n" ).length;
	var descLH = ( DrillUp.g_SGaA_descWin_fontsize || 22 ) + 14;	//（约略行高）
	var descPad = 18;											//（窗口标准内边距）
	lineBot.x = thumbCX;										//（与上横线同一中心x，保证两线对齐）
	lineBot.y = DrillUp.g_SGaA_descWin_y + descPad + botLines * descLH + 8;	//（最后一行文字之下，可调最后的间距）
};
//==============================
// * 帧刷新 - 列表回想按钮
//
//			说明：	列表页（未查看大图）时，若当前选中为未锁定的真实CG、且在回想脚本表
//					（DrillUp.g_SGaA_recallScriptMap，按选项名key）中登记了脚本，
//					则在插件参数"回想按钮 X/Y"位置显示回想按钮（资源-回想按钮）。
//					鼠标未悬停时不透明度下降；悬停时高亮并略微放大（平滑过渡）。
//					点击按钮 → 退出画廊界面，并执行登记的脚本（字符串eval / 函数直接调用）。
//					悬停标记 _drill_SGaA_listRecallHover 供缩略图点击判断屏蔽，防止误进原图查看器。
//==============================
Scene_Drill_SGaA.prototype.drill_updateListRecallButton = function() {
	var btn = this._sprite_listRecallButton;
	if( btn == undefined ){ return; }
	this._drill_SGaA_listRecallHover = false;

	// > 是否需要显示（列表页 且 当前为未锁定的真实CG 且 有回想脚本 且 预览/按钮资源已就绪）
	var thumb = this._sprite_thumbnail;
	var videoThumb = this._sprite_videoThumb;
	var viewing = ( this._window_imgExpand != undefined && this._window_imgExpand.active == true );
	var data_list = $gameTemp._drill_SGaA_visibleDataList || [];
	var item = ( this._window_select != undefined ) ? data_list[ this._window_select.index() ] : undefined;
	var recallScript = ( item != undefined && item['isCategory'] != true ) ? DrillUp.drill_SGaA_getRecallScriptByData( item ) : "";

	// > 预览就绪判断（静态缩略图 或 动画CG视频预览 任一可见即可——视频就绪后会隐藏静态图）
	var b_videoShowing = ( videoThumb != undefined && videoThumb.visible == true );
	var b_thumbShowing = ( thumb != undefined && thumb.visible == true &&
						   thumb.bitmap != undefined && thumb.bitmap.isReady() == true );
	var b_show =
		( $gameTemp._drill_SGaA_isSinglePictureMode != true ) &&
		( viewing == false ) &&
		( item != undefined && item['isCategory'] != true ) &&
		( recallScript != "" ) &&
		( item != undefined && $gameTemp.drill_SGaA_isLocked( item['index'] ) == false ) &&
		( b_thumbShowing == true || b_videoShowing == true ) &&
		( btn.bitmap != undefined && btn.bitmap.isReady() == true );
	btn.visible = b_show;
	if( b_show == false ){
		btn.scale.x = 1;		//（隐藏时复位缩放，避免下次出现时残留放大态）
		btn.scale.y = 1;
		return;
	}

	// > 位置（跟随插件参数"回想按钮 X/Y"；参数为左上角坐标，此处中心锚点故加半宽半高）
	var bw = btn.bitmap.width;
	var bh = btn.bitmap.height;
	btn.x = DrillUp.g_SGaA_recallBtn_x + bw*0.5;
	btn.y = DrillUp.g_SGaA_recallBtn_y + bh*0.5;

	// > 鼠标悬停检测（按未放大时的边界判断，避免临界抖动）
	var b_hover = ( _drill_mouse_x >= btn.x - bw*0.5 && _drill_mouse_x <= btn.x + bw*0.5 &&
					_drill_mouse_y >= btn.y - bh*0.5 && _drill_mouse_y <= btn.y + bh*0.5 );
	this._drill_SGaA_listRecallHover = b_hover;

	// > 悬停时高亮并略微放大，否则常态不透明度（缩放平滑过渡）
	var tar_scale = ( b_hover == true ) ? 1.12 : 1.0;
	btn.scale.x += ( tar_scale - btn.scale.x ) * 0.4;
	btn.scale.y = btn.scale.x;
	var tar_opacity = ( b_hover == true ) ? 255 : DrillUp.g_SGaA_recallBtn_normalOpacity;
	var preview_opacity = ( b_videoShowing == true ) ? 255 : thumb.opacity;	//（视频预览无淡入，直接满值）
	btn.opacity = Math.min( tar_opacity, preview_opacity );	//（跟随预览淡入，不早于预览出现）

	// > 点击按钮 → 确认弹窗询问后退出界面并执行回想脚本（取消则留在画廊）
	if( b_hover == true && TouchInput.drill_isLeftTriggerd() ){
		SoundManager.playOk();
		this.drill_SGaA_tryStartRecall( item );
	}
}
//==============================
// * 画廊A - 析构函数
//==============================
Scene_Drill_SGaA.prototype.terminate = function() {
	Scene_MenuBase.prototype.terminate.call(this);
	$gameTemp._drill_SGaA_isSinglePictureMode = false;	//（关闭单图模式）
	this.drill_destroyPinchListener();					//（解绑双指捏合监听）
	this.drill_destroyVideoThumb();						//（销毁动画CG预览视频，释放解码器与显存）

	// > 画布平滑按当前地图备注重设（ImageSmoothSetting.js：<宅>=平滑；进回想舞台时由 RecallStage 再覆盖为平滑）
	var smooth_value = ( $dataMap != null && String( $dataMap.note || "" ).includes( "<宅>" ) );
	window.canvasSmooth?.( smooth_value );
}

//==============================
// * 创建 - 资源全加载
//==============================
Scene_Drill_SGaA.prototype.drill_loadAllSrc = function() {
	this._drill_needDelayRefreshSelectWindow = true;
	this._drill_SGaA_bitmaps = [];

	// > 单图模式：只加载当前要看的那一张，避免一次性解码全部CG（显存/内存优化）
	if( $gameTemp._drill_SGaA_isSinglePictureMode == true ){
		var single = DrillUp.g_SGaA_context_list[ $gameTemp._drill_SGaA_isSinglePictureIndex ];
		if( single != null ){
			this._drill_SGaA_bitmaps.push( ImageManager.load_MenuGallery( single['pic'] ) );
		}
		return;
	}

	// > 一般模式：加载全部原图
	for(var i=0; i < DrillUp.g_SGaA_context_list.length; i++){
		var data = DrillUp.g_SGaA_context_list[i];	//（直接一次性加载全部原图）
		if( data == null ){ continue; }
		this._drill_SGaA_bitmaps.push( ImageManager.load_MenuGallery(data['pic']) );
	}
};
//==============================
// * 判断 - 资源全加载
//==============================
Scene_Drill_SGaA.prototype.drill_isAllBitmapLoaded = function() {
	for(var i=0; i < this._drill_SGaA_bitmaps.length; i++){
		if( this._drill_SGaA_bitmaps[i].isReady() != true ){
			return false;
		}
	}
	return true;
};
//==============================
// * 创建 - 整体布局
//==============================
Scene_Drill_SGaA.prototype.drill_createLayout = function() {
	this._drill_layout = new Sprite(ImageManager.load_MenuGallery(DrillUp.g_SGaA_layout));

	// > 单图查看模式
	if( $gameTemp._drill_SGaA_isSinglePictureMode == true &&
		DrillUp.g_SGaA_singlePicture_hide == true ){
		//（单图模式则直接不添加）
	}else{
		this._drill_field.addChild(this._drill_layout);	
	}
};
//==============================
// * 创建 - 选项窗口
//==============================
Scene_Drill_SGaA.prototype.drill_createSelect = function() {
	var data = DrillUp.g_SGaA_command_window;	//（直接读取选项窗口中的项）

	// > 分类层级初始化：若有"直达分类"请求则进入指定分类，否则从分类层开始（启用父分类时）
	if( $gameTemp._drill_SGaA_jumpCategory != undefined && $gameTemp._drill_SGaA_jumpCategory != null ){
		$gameTemp._drill_SGaA_curCategory = $gameTemp._drill_SGaA_jumpCategory;
		$gameTemp._drill_SGaA_jumpCategory = null;	//（消费一次）
		this._drill_SGaA_enteredViaJump = true;		//（直达进入：取消时直接退出场景，而非退回分类层）
	}else{
		$gameTemp._drill_SGaA_curCategory = null;
		this._drill_SGaA_enteredViaJump = false;
	}

	this._window_select = new Drill_SGaA_SelectWindow(0, 0, 0, 0);
	this._window_select.drill_COWA_changeParamData( data );			//辅助核心 - 控制窗口基本属性
	this._window_select.refresh();
	this._window_select.drill_initSelect();

	this._window_select.setHandler('ok', this.drill_selectOk.bind(this));	//绑定确定选择选项
	this._window_select.setHandler('cancel', this.drill_selectCancel.bind(this));	//绑定取消（分类内→退回分类层；分类层→退出界面）
	this.addChild(this._window_select);
};
//==============================
// * 创建 - 选项按钮组
//==============================
Scene_Drill_SGaA.prototype.drill_createCommandButton = function() {
	if( DrillUp.g_SGaA_command_mode != "按钮组模式" ){ return; }
	
	// > 准备按钮组参数
	var data_org = DrillUp.g_SGaA_command_button;
	var data_style = DrillUp.drill_COSB_getCopyedBtnData( data_org['style_id']-1 );	//深拷贝数据
	for(var key in data_org){
		data_style[ key ] = data_org[ key ];
	}
	
	// > 建立按钮组层
	var temp_sprite = new Drill_COSB_LayerSprite( data_style, this._window_select );
	this.addChild( temp_sprite );
	this._drill_SGaA_commandButtonSprite = temp_sprite;
};
//==============================
// * 创建 - 描述窗口
//==============================
Scene_Drill_SGaA.prototype.drill_createDesc = function() {
	var data = {
		"x": DrillUp.g_SGaA_descWin_x,
		"y": DrillUp.g_SGaA_descWin_y,
		"width": DrillUp.g_SGaA_descWin_width,
		"height": DrillUp.g_SGaA_descWin_height,
		"fontsize": DrillUp.g_SGaA_descWin_fontsize,
		
		"slideMoveType": DrillUp.g_SGaA_descWin_slideAnim['slideMoveType'],
		"slideTime": DrillUp.g_SGaA_descWin_slideAnim['slideTime'],
		"slideDelay": DrillUp.g_SGaA_descWin_slideAnim['slideDelay'],
		"slidePosType": DrillUp.g_SGaA_descWin_slideAnim['slidePosType'],
		"slideX": DrillUp.g_SGaA_descWin_slideAnim['slideX'],
		"slideY": DrillUp.g_SGaA_descWin_slideAnim['slideY'],
		"slideAbsoluteX": DrillUp.g_SGaA_descWin_slideAnim['slideAbsoluteX'],
		"slideAbsoluteY": DrillUp.g_SGaA_descWin_slideAnim['slideAbsoluteY'],
		
		"layoutType": DrillUp.g_SGaA_descWin_layout['layoutType'],
		"layoutX": DrillUp.g_SGaA_descWin_layout['layoutX'],
		"layoutY": DrillUp.g_SGaA_descWin_layout['layoutY'],
		"layoutSrc": DrillUp.g_SGaA_descWin_layout['layoutSrc'],
		"layoutSrcFile": DrillUp.g_SGaA_descWin_layout['layoutSrcFile'],
	}
	this._window_desc = new Drill_SGaA_DescWindow(0, 0, 0, 0);
	this._window_desc.drill_COWA_changeParamData( data );		//辅助核心 - 控制窗口基本属性
	
	this.addChild(this._window_desc);
};
//==============================
// * 创建 - 缩略图
//==============================
Scene_Drill_SGaA.prototype.drill_createThumbnail = function() {
	var data = {
		"x": DrillUp.g_SGaA_Thumbnail_x,
		"y": DrillUp.g_SGaA_Thumbnail_y,
		
		"slideMoveType": DrillUp.g_SGaA_Thumbnail_slideAnim['slideMoveType'],
		"slideTime": DrillUp.g_SGaA_Thumbnail_slideAnim['slideTime'],
		"slideDelay": DrillUp.g_SGaA_Thumbnail_slideAnim['slideDelay'],
		"slidePosType": DrillUp.g_SGaA_Thumbnail_slideAnim['slidePosType'],
		"slideX": DrillUp.g_SGaA_Thumbnail_slideAnim['slideX'],
		"slideY": DrillUp.g_SGaA_Thumbnail_slideAnim['slideY'],
		"slideAbsoluteX": DrillUp.g_SGaA_Thumbnail_slideAnim['slideAbsoluteX'],
		"slideAbsoluteY": DrillUp.g_SGaA_Thumbnail_slideAnim['slideAbsoluteY'],
	}
	this._sprite_thumbnail = new Sprite();
	this._sprite_thumbnail.drill_COWA_setButtonMove( data );		//辅助核心 - 控制按钮贴图基本属性
	this._drill_field.addChild(this._sprite_thumbnail);	
	
	this._sprite_thumbnail._drill_bitmaps = [];
};
//==============================
// * 创建 - 完成度窗口
//==============================
Scene_Drill_SGaA.prototype.drill_createComp = function() {
	var data = {
		"x": DrillUp.g_SGaA_compWin_x,
		"y": DrillUp.g_SGaA_compWin_y,
		"width": DrillUp.g_SGaA_compWin_width,
		"height": DrillUp.g_SGaA_compWin_height,
		"fontsize": DrillUp.g_SGaA_compWin_fontsize,
		
		"slideMoveType": DrillUp.g_SGaA_compWin_slideAnim['slideMoveType'],
		"slideTime": DrillUp.g_SGaA_compWin_slideAnim['slideTime'],
		"slideDelay": DrillUp.g_SGaA_compWin_slideAnim['slideDelay'],
		"slidePosType": DrillUp.g_SGaA_compWin_slideAnim['slidePosType'],
		"slideX": DrillUp.g_SGaA_compWin_slideAnim['slideX'],
		"slideY": DrillUp.g_SGaA_compWin_slideAnim['slideY'],
		"slideAbsoluteX": DrillUp.g_SGaA_compWin_slideAnim['slideAbsoluteX'],
		"slideAbsoluteY": DrillUp.g_SGaA_compWin_slideAnim['slideAbsoluteY'],
		
		"layoutType": DrillUp.g_SGaA_compWin_layout['layoutType'],
		"layoutX": DrillUp.g_SGaA_compWin_layout['layoutX'],
		"layoutY": DrillUp.g_SGaA_compWin_layout['layoutY'],
		"layoutSrc": DrillUp.g_SGaA_compWin_layout['layoutSrc'],
		"layoutSrcFile": DrillUp.g_SGaA_compWin_layout['layoutSrcFile'],
	}
	this._window_comp = new Drill_SGaA_CompletionWindow(0, 0, 0, 0);
	this._window_comp.drill_COWA_changeParamData( data );		//辅助核心 - 控制窗口基本属性
	this._window_comp.drill_refresh();							//（绘制完成度信息）
	
	// > 单图查看模式
	if( $gameTemp._drill_SGaA_isSinglePictureMode == true ){
		//（单图模式则直接不添加）
	}else{
		this.addChild(this._window_comp);
	}
	
};
//==============================
// * 创建 - 原图查看器 窗口
//==============================
Scene_Drill_SGaA.prototype.drill_createImgExpandWindow = function() {
	
	this._window_imgExpand = new Drill_SGaA_ImgExpandWindow(0, 0, 0, 0);
	this._window_imgExpand.refresh();
	this._window_imgExpand.y = Graphics.boxHeight * 2;
	
	this._window_imgExpand.setHandler('cancel', this.drill_expandCancel.bind(this));	//绑定关闭原图查看器
	this.addChild(this._window_imgExpand);
};
//==============================
// * 创建 - 原图查看器 贴图
//==============================
Scene_Drill_SGaA.prototype.drill_createImgExpandSprite = function() {

	var temp_sprite = new Sprite();
	temp_sprite.anchor.x = 0.5;
	temp_sprite.anchor.y = 0.5;
	temp_sprite['cur_time'] = 0;		//（移动时间标记）
	this._sprite_imgExpand_pic = temp_sprite;
	this.addChild(this._sprite_imgExpand_pic);
	this.drill_expandHoming();			//（归位）
};
//==============================
// * 创建 - 原图查看器 上下描述文本
//
//			说明：	上下两段描述文本贴图，文本内容来自开放接口 drill_SGaA_getExpandText_top / _bottom。
//					本函数在 drill_createImgExpandSprite 之前被调用，故这两个贴图位于原图贴图下层，
//					放大原图时会被原图盖住（鉴赏不被文字遮挡），缩回自适应大小时重新露出。
//==============================
Scene_Drill_SGaA.prototype.drill_createImgExpandText = function() {
	// > 上方文本（顶部对齐，向下排版，落在上方出血位）
	var topSp = new Sprite();
	topSp.anchor.x = 0.5;		//（X 居中：配合 x=960 实现水平居中）
	topSp.anchor.y = 0;
	topSp.opacity = 0;
	topSp['_drill_lastText'] = null;	//（上一次绘制的文本，变化时才重绘）
	/*
	// > 发光滤镜（提升主体性）：GlowFilter(distance, outerStrength, innerStrength, color, quality)
	if( PIXI.filters && PIXI.filters.GlowFilter ){
		topSp.filters = [
			new PIXI.filters.GlowFilter( 16, 2, 0, 0xf3a64a, 0.66 )
		];
	}
	*/
	this._sprite_imgExpand_textTop = topSp;
	this.addChild(topSp);

	// > 下方文本（顶部对齐：首行Y固定，行数增加时向下延伸，保证首行高度恒定、不会顶到CG底部）
	var botSp = new Sprite();
	botSp.anchor.x = 0.5;
	botSp.anchor.y = 0;
	botSp.opacity = 0;
	botSp['_drill_lastText'] = null;
	this._sprite_imgExpand_textBottom = botSp;
	this.addChild(botSp);

	// > 分隔横线（端部渐隐的淡白细线，上、下各一条；与文本同层、位于原图下方）
	var lineW = 760, lineH = 2;
	var lineBmp = new Bitmap( lineW, lineH );
	lineBmp.gradientFillRect( 0,         0, lineW*0.5, lineH, "rgba(255,255,255,0)",    "rgba(255,255,255,0.55)", false );	//（左半：透明→淡白）
	lineBmp.gradientFillRect( lineW*0.5, 0, lineW*0.5, lineH, "rgba(255,255,255,0.55)", "rgba(255,255,255,0)",    false );	//（右半：淡白→透明）

	var lineTop = new Sprite( lineBmp );
	lineTop.anchor.x = 0.5;
	lineTop.anchor.y = 0.5;
	lineTop.opacity = 0;
	lineTop.visible = false;
	this._sprite_imgExpand_lineTop = lineTop;
	this.addChild( lineTop );

	var lineBot = new Sprite( lineBmp );	//（与上线共用同一条贴图）
	lineBot.anchor.x = 0.5;
	lineBot.anchor.y = 0.5;
	lineBot.opacity = 0;
	lineBot.visible = false;
	this._sprite_imgExpand_lineBottom = lineBot;
	this.addChild( lineBot );
};
//==============================
// * 帧刷新 - 原图查看器 上下描述文本
//==============================
Scene_Drill_SGaA.prototype.drill_updateImgExpandText = function() {
	var topSp = this._sprite_imgExpand_textTop;
	var botSp = this._sprite_imgExpand_textBottom;
	if( topSp == undefined || botSp == undefined ){ return; }

	// > 仅在鉴赏原图时显示，并跟随原图一起淡入淡出
	var viewing = ( this._window_imgExpand != undefined && this._window_imgExpand.active == true );
	var op = ( this._sprite_imgExpand_pic != undefined ) ? this._sprite_imgExpand_pic.opacity : 0;
	topSp.opacity = op;
	botSp.opacity = op;

	// > 上/下文本样式（可按需调整：fontSize 字号、textColor 字体颜色）
	var topStyle = { "fontSize":36, "textColor":"#f2c84b", "outlineColor":"rgba(0,0,0,0.85)", "outlineWidth":0 };	//（上方：更大、可指定颜色）
	var botStyle = { "fontSize":28, "textColor":"#ffffff", "outlineColor":"rgba(0,0,0,0.85)", "outlineWidth":0 };	//（下方）

	// > 取文本（来自开放接口，按当前 CG 唯一序号查询；读到后自动去掉引号类标点）
	var picId = this.drill_SGaA_getCurExpandPicId();
	var topText = viewing ? this.drill_SGaA_getExpandText_top( picId )  : "";
	var botText = viewing ? this.drill_SGaA_stripQuotes( this.drill_SGaA_getExpandText_bottom( picId ) ) : "";
	if( topSp['_drill_lastText'] !== topText ){
		topSp['_drill_lastText'] = topText;
		this.drill_SGaA_drawExpandText( topSp, topText, topStyle );
	}
	if( botSp['_drill_lastText'] !== botText ){
		botSp['_drill_lastText'] = botText;
		this.drill_SGaA_drawExpandText( botSp, botText, botStyle );
	}

	// > 位置：X 固定 960（画布 1920×1080 的水平中点）
	var topMargin         = 64;		//（上方文本距屏幕顶部的边距）
	var bottomFirstLineY  = 856;	//（下方文本"首行顶部"的固定Y；值越大越往下。行数增加只向下延伸，首行始终在此高度）
	topSp.x = 960;
	topSp.y = topMargin;
	botSp.x = 960;
	botSp.y = bottomFirstLineY;

	// > 分隔横线：上线钉在上方文字块下沿，下线钉在下方文字块上沿（仅在对应文字非空时显示）
	var lineTop = this._sprite_imgExpand_lineTop;
	var lineBot = this._sprite_imgExpand_lineBottom;
	if( lineTop != undefined && lineBot != undefined ){
		var lineGap = 10;		//（横线与文字的间距，可按需调整）

		var topH = ( topSp.bitmap != undefined ) ? topSp.bitmap.height : 0;
		lineTop.visible = ( viewing && topText != "" );
		lineTop.opacity = op;
		lineTop.x = 960;
		lineTop.y = topSp.y + topH + lineGap;					//（上方文字块下沿之下）

		var botH = ( botSp.bitmap != undefined ) ? botSp.bitmap.height : 0;
		lineBot.visible = ( viewing && botText != "" );
		lineBot.opacity = op;
		lineBot.x = 960;
		lineBot.y = botSp.y + botH + lineGap;					//（下方文字块下沿之下；botSp.anchor.y=0，故块底 = botSp.y + 块高）
	}
};
//==============================
// * 原图查看器 上下描述文本 - 去除引号类标点
//
//			说明：	去掉 双引号(" " ") 与 角括号(「」『』)，不动单引号/撇号(避免破坏英文 don't 之类)。
//					要增减符号，改下面正则的字符集即可。返回去引号后的字符串（null/undefined 视为空串）。
//==============================
Scene_Drill_SGaA.prototype.drill_SGaA_stripQuotes = function( text ) {
	if( text == undefined || text == null ){ return ""; }
	return String( text ).replace( /["“”「」]/g, "" );
};
//==============================
// * 原图查看器 上下描述文本 - 绘制（多行居中）
//
//			text：	要绘制的字符串，支持 \n 换行；空串则清空不显示。
//			style：	样式 { fontSize 字号, textColor 字体颜色, outlineColor 描边色, outlineWidth 描边宽 }，可缺省。
//==============================
Scene_Drill_SGaA.prototype.drill_SGaA_drawExpandText = function( sprite, text, style ) {
	// > 文本样式（缺省值，可由 style 覆盖）
	if( style == undefined ){ style = {}; }
	var fontSize     = ( style['fontSize']     != undefined ) ? style['fontSize']     : 28;
	var textColor    = ( style['textColor']    != undefined ) ? style['textColor']    : "#ffffff";
	var outlineColor = ( style['outlineColor'] != undefined ) ? style['outlineColor'] : "rgba(0,0,0,0.85)";
	var outlineWidth = ( style['outlineWidth'] != undefined ) ? style['outlineWidth'] : 5;

	var lineHeight = fontSize + 12;
	var lines = String( text ).split( "\n" );

	// > 空文本：贴图缩到最小，省内存、省滤镜开销
	if( text == "" ){
		sprite.bitmap = new Bitmap( 1, 1 );
		return;
	}

	// > 量测文本实际宽度（复用一个量测 bitmap，避免每次分配）
	var measurer = this._drill_SGaA_textMeasurer;
	if( measurer == undefined ){
		measurer = new Bitmap( 8, 8 );
		this._drill_SGaA_textMeasurer = measurer;
	}
	measurer.fontSize = fontSize;
	var maxLineW = 0;
	for( var i = 0; i < lines.length; i++ ){
		var lw = measurer.measureTextWidth( lines[i] );
		if( lw > maxLineW ){ maxLineW = lw; }
	}

	// > 留白：容纳描边与发光滤镜，避免被贴图边缘裁切
	var pad = Math.ceil( outlineWidth ) + 12;
	// > 按文字实际尺寸建贴图（而非整屏宽 1920），滤镜只处理这一小块，性能更省；
	//   贴图随 anchor.x=0.5 + sprite.x=960 仍水平居中
	var ww = Math.ceil( maxLineW ) + pad * 2;
	var hh = lineHeight * lines.length + pad * 2;

	if( sprite.bitmap == undefined || sprite.bitmap.width != ww || sprite.bitmap.height != hh ){
		sprite.bitmap = new Bitmap( ww, hh );
	}else{
		sprite.bitmap.clear();
	}

	var bmp = sprite.bitmap;
	bmp.fontSize = fontSize;
	bmp.textColor = textColor;
	bmp.outlineColor = outlineColor;
	bmp.outlineWidth = outlineWidth;
	for( var i = 0; i < lines.length; i++ ){
		bmp.drawText( lines[i], 0, pad + i * lineHeight, ww, lineHeight, "center" );
	}
};
//==============================
// * 【开放接口】原图查看器 - 当前 CG 唯一序号
//
//			返回：	当前正在鉴赏的 CG 唯一序号（= 内容列表 index，1 ~ 80）；未在鉴赏原图时返回 -1。
//			用途：	供 drill_SGaA_getExpandText_top / _bottom 据此返回对应 CG 的文本。
//==============================
Scene_Drill_SGaA.prototype.drill_SGaA_getCurExpandPicId = function() {
	if( this._window_imgExpand == undefined || this._window_imgExpand.active != true ){ return -1; }
	if( this._drill_SGaA_curExpandPicId == undefined ){ return -1; }
	return this._drill_SGaA_curExpandPicId;
};
//==============================
// * 【开放接口】原图查看器 - 上方描述文本
//==============================
Scene_Drill_SGaA.prototype.drill_SGaA_getExpandText_top = function( picId ) {
	let text     = "";
	const itemId = DrillUp.g_SGaA_context_list[picId]?.name;
	const table  = window.itemsDescription[String(itemId)];
	if (table) {
		text = table.name?.join?.("\n") || "";
	}
	text = `"${text}"`;
	return text;
};
//==============================
// * 【开放接口】原图查看器 - 下方描述文本
//==============================
Scene_Drill_SGaA.prototype.drill_SGaA_getExpandText_bottom = function( picId ) {
	let text     = "";
	const itemId = DrillUp.g_SGaA_context_list[picId]?.name;
	const table  = window.itemsDescription[String(itemId)];
	if (table) {
		text = table.subtitle?.join?.("\n") || "";
	}			   
	return text;
};
//==============================
// * 创建 - 列表回想按钮（缩略图右上角）
//==============================
Scene_Drill_SGaA.prototype.drill_createListRecallButton = function() {
	var temp_sprite = new Sprite();
	temp_sprite.anchor.x = 0.5;			//（中心锚点，悬停放大时从中心缩放）
	temp_sprite.anchor.y = 0.5;
	temp_sprite.visible = false;		//（默认隐藏，列表页选中带回想脚本的CG时才显示）
	temp_sprite.bitmap = ImageManager.load_MenuGallery(DrillUp.g_SGaA_recallBtn_src);
	this._sprite_listRecallButton = temp_sprite;
	this._drill_SGaA_listRecallHover = false;
	this.addChild(this._sprite_listRecallButton);
};
//==============================
// * 创建 - 动画CG预览（缩略图上层的视频贴图）
//==============================
Scene_Drill_SGaA.prototype.drill_createVideoThumb = function() {
	var temp_sprite = new Sprite();
	temp_sprite.visible = false;
	this._sprite_videoThumb = temp_sprite;
	this._drill_videoThumbKey = null;		//（当前视频对应的选项名key，切换选中项时换源）
	this._drill_field.addChild( temp_sprite );	//（紧跟缩略图之后加入，渲染在其上层）
};
//==============================
// * 帧刷新 - 动画CG预览
//
//			说明：	当前选中CG在动画CG表(DrillUp.g_SGaA_videoThumbMap)登记时，
//					缩略图区域改为播放视频预览（静音循环，与静态缩略图同规则等比缩放）。
//					视频就绪前仍显示静态缩略图占位，就绪后覆盖并隐藏静态图。
//					复用 MoviePicture.js 的视频位图（Bitmap_Video，.nlch伪装扩展名）。
//==============================
Scene_Drill_SGaA.prototype.drill_updateVideoThumb = function() {
	var sprite = this._sprite_videoThumb;
	if( sprite == undefined ){ return; }

	// > 当前选中项的视频登记（大图查看/单图模式/锁定/无登记 → 无视频）
	var viewing = ( this._window_imgExpand != undefined && this._window_imgExpand.active == true );
	var item = ( this._window_select != undefined ) ? $gameTemp._drill_SGaA_visibleDataList[ this._window_select.index() ] : undefined;
	var videoFile = null;
	if( $gameTemp._drill_SGaA_isSinglePictureMode != true &&
		viewing == false &&
		item != undefined && item['isCategory'] != true &&
		$gameTemp.drill_SGaA_isLocked( item['index'] ) == false &&
		ImageManager.loadVideo != undefined ){
		videoFile = DrillUp.g_SGaA_videoThumbMap[ item['name'] ] || null;
	}
	var videoKey = ( videoFile != null ) ? String( item['name'] ) : null;

	// > 切换选中项：销毁旧视频、按需加载新视频（离开登记项/锁定/看大图时同样走销毁释放解码器）
	if( this._drill_videoThumbKey !== videoKey ){
		this.drill_destroyVideoThumb();
		this._drill_videoThumbKey = videoKey;
		if( videoKey != null ){
			var newBitmap = ImageManager.loadVideo( videoFile, true, false );	//（smooth，无alpha规格）
			if( newBitmap != null && newBitmap._video != undefined ){
				newBitmap._video.muted = true;		//（预览静音，不干扰画廊BGM）
				newBitmap._video.loop = true;		//（循环播放）
			}
			sprite.bitmap = newBitmap;
		}
	}

	// > 显示控制（视频未就绪时静态缩略图继续显示）
	var bitmap = sprite.bitmap;
	var b_ready = ( videoKey != null && bitmap != undefined &&
					bitmap.isVideo != undefined && bitmap.isVideo() == true &&
					bitmap.isLoaded != undefined && bitmap.isLoaded() == true &&
					bitmap.width > 0 && bitmap.height > 0 );
	sprite.visible = b_ready;
	if( b_ready == false ){ return; }

	// > 就绪后接管静态缩略图的显隐（本函数在 drill_updateListVisible 之后执行，赋值不会被覆盖）
	this._sprite_thumbnail.visible = false;

	// > 等比缩放到缩略图区域（与静态缩略图同规则、同位置）
	var ww = bitmap.width;
	var hh = bitmap.height;
	var pw = DrillUp.g_SGaA_Thumbnail_width / ww;
	var ph = DrillUp.g_SGaA_Thumbnail_height / hh;
	if( pw > ph ){ pw = ph; }
	sprite.scale.x = pw;
	sprite.scale.y = pw;
	sprite.x = DrillUp.g_SGaA_Thumbnail_x + ( DrillUp.g_SGaA_Thumbnail_width  - ww * pw ) * 0.5;
	sprite.y = DrillUp.g_SGaA_Thumbnail_y + ( DrillUp.g_SGaA_Thumbnail_height - hh * pw ) * 0.5;

	// > 保持播放（暂停态兜底恢复）
	if( bitmap._video != undefined && bitmap._video.paused == true ){
		bitmap.play();
	}
};
//==============================
// * 动画CG预览 - 销毁视频（释放解码器与显存）
//==============================
Scene_Drill_SGaA.prototype.drill_destroyVideoThumb = function() {
	var sprite = this._sprite_videoThumb;
	if( sprite == undefined ){ return; }
	var bitmap = sprite.bitmap;
	// 先让 Sprite 脱离视频纹理。视频 Bitmap.destroy() 会销毁底层 PIXI Texture，
	// 若 Sprite 仍持有它，下次设置 bitmap 时会读取到已为 null 的尺寸数据。
	sprite.texture = new PIXI.Texture( Sprite._emptyBaseTexture, new Rectangle() );
	sprite.bitmap = null;
	sprite.visible = false;
	if( bitmap != undefined && bitmap != null &&
		bitmap.isVideo != undefined && bitmap.isVideo() == true &&
		bitmap.destroy != undefined ){
		bitmap.destroy();
	}
};
//==============================
// * 创建 - 双指捏合监听（安卓触屏缩放）
//
//			说明：	核心(Drill_CoreOfInput)与基础引擎都只把触屏压成单指虚拟鼠标，
//					不提供多指/捏合数据，因此这里自行监听 DOM touch 事件，记录所有触点位置。
//					由 drill_updateImgExpandSprite 据此计算双指间距变化来缩放。
//					进入场景时绑定，离开时(terminate)解绑，不污染全局输入。
//==============================
Scene_Drill_SGaA.prototype.drill_createPinchListener = function() {
	this._drill_SGaA_activeTouches = [];		//（当前所有触点 [{x,y},...]）
	this._drill_SGaA_lastPinchDist = 0;			//（上一帧双指间距）
	this._drill_SGaA_pinchStartDist = 0;		//（本次双指会话的基准间距）
	this._drill_SGaA_prevCount = 0;				//（上一帧触点数）
	this._drill_SGaA_sessionMaxCount = 0;		//（本次会话最大触点数）
	this._drill_SGaA_sessionMoved = false;		//（本次会话是否发生过捏合）
	this._drill_SGaA_sessionFrames = 0;			//（本次会话持续帧数）

	this._drill_SGaA_touchHandler = this.drill_SGaA_onTouchChange.bind(this);
	document.addEventListener( "touchstart",  this._drill_SGaA_touchHandler, false );
	document.addEventListener( "touchmove",   this._drill_SGaA_touchHandler, false );
	document.addEventListener( "touchend",    this._drill_SGaA_touchHandler, false );
	document.addEventListener( "touchcancel", this._drill_SGaA_touchHandler, false );
};
//==============================
// * 双指捏合监听 - 触点变化（记录所有触点位置）
//==============================
Scene_Drill_SGaA.prototype.drill_SGaA_onTouchChange = function( event ) {
	var arr = [];
	if( event != undefined && event.touches != undefined ){
		for( var i = 0; i < event.touches.length; i++ ){
			arr.push({ "x": event.touches[i].pageX, "y": event.touches[i].pageY });
		}
	}
	this._drill_SGaA_activeTouches = arr;
};
//==============================
// * 双指捏合监听 - 解绑
//==============================
Scene_Drill_SGaA.prototype.drill_destroyPinchListener = function() {
	if( this._drill_SGaA_touchHandler == undefined ){ return; }
	document.removeEventListener( "touchstart",  this._drill_SGaA_touchHandler, false );
	document.removeEventListener( "touchmove",   this._drill_SGaA_touchHandler, false );
	document.removeEventListener( "touchend",    this._drill_SGaA_touchHandler, false );
	document.removeEventListener( "touchcancel", this._drill_SGaA_touchHandler, false );
	this._drill_SGaA_touchHandler = undefined;
};
//==============================
// * 创建 - 单图查看模式
//==============================
Scene_Drill_SGaA.prototype.drill_createSinglePictureMode = function() {
	if( $gameTemp._drill_SGaA_isSinglePictureMode != true ){ return; }
	
	this.drill_selectOk();		//（强制走确认流程）
};


//==============================
// * 画廊A - 重设窗口起点（切换选项时）
//==============================
Scene_Drill_SGaA.prototype.drill_resetPosition = function() {
	
	// > 刷新描述窗口
	if( DrillUp.g_SGaA_descWin_replay ){
		this._window_desc.drill_COWA_CPD_resetMove();		//辅助核心 - 重播窗口动画
	}
	
	// > 刷新缩略图
	if( DrillUp.g_SGaA_Thumbnail_replay ){
		this._sprite_thumbnail.drill_COWA_SBM_resetMove();	//辅助核心 - 重播按钮贴图动画
	}
};
//==============================
// * 画廊A - 缩略图刷新
//==============================
Scene_Drill_SGaA.prototype.drill_refreshThumbnail = function( cur_index ) {
	var data_list = $gameTemp._drill_SGaA_visibleDataList;		//可见项列表
	
	// > 资源全加载
	var src_tank = this._sprite_thumbnail._drill_bitmaps;	//资源bitmap容器
	if( src_tank.length == 0 ){
		src_tank[0] = ImageManager.load_MenuGallery(DrillUp.g_SGaA_locked_pic);
		for( var i=0; i < data_list.length; i++ ){
			var data = data_list[i];
			if( data == null ){ continue; }
			if( data == "" ){ continue; }
			if( data['isCategory'] == true ){ continue; }	//（父分类项无图片，跳过）

			src_tank[ i+1 ] = ImageManager.load_MenuGallery( data['pic'] );
		}
		this._sprite_thumbnail._drill_bitmaps = src_tank;
	}

	// > 切换缩略图
	var data = data_list[ cur_index ];					//当前选项

	// > 父分类项：不显示大缩略图
	if( data == undefined || data['isCategory'] == true ){
		this._sprite_thumbnail.bitmap = null;
		return;
	}
	var context_realIndex = data['index'];
	
	if( $gameTemp.drill_SGaA_isLocked( context_realIndex ) == true && 
	   (DrillUp.g_SGaA_locked_type == "锁定缩略图和描述内容" || 
		DrillUp.g_SGaA_locked_type == "只锁定缩略图" ) ){
			
		this._sprite_thumbnail.bitmap = src_tank[ 0 ];			//锁定缩略图
	}else{
		this._sprite_thumbnail.bitmap = src_tank[ cur_index+1 ];	//当前缩略图
	}
	
	// > 瞬间显示
	if( DrillUp.g_SGaA_Thumbnail_showInstant == false ){
		this._sprite_thumbnail.opacity = 0;
	}
}
//==============================
// * 画廊A流程 - 尝试触发回想
//
//			temp_data：	当前选中的内容数据项。
//			说明：		先以 confirm() 弹窗询问（文本由开放接口 drill_SGaA_makeRecallConfirmText
//					组装，多语言在那里适配），玩家点OK才退出画廊并执行回想脚本；
//					取消则播放取消音效、恢复列表操作，停留在画廊界面，视为没有点击。
//					confirm 已被 rpg_custom_Dialog_MZ.js 重写为异步弹窗（返回Promise，
//					弹窗期间 SceneManager.stop 暂停游戏循环），此处以 Promise.resolve
//					包装，同时兼容原生confirm的同步布尔返回值。
//==============================
Scene_Drill_SGaA.prototype.drill_SGaA_tryStartRecall = function( temp_data ){
	var script = DrillUp.drill_SGaA_getRecallScriptByData( temp_data );
	if( script == "" ){ return; }

	// > 确认弹窗（防误点，异步等待玩家选择）
	var text = DrillUp.drill_SGaA_makeRecallConfirmText( temp_data['name'], temp_data['index'] );
	var _this = this;
	Promise.resolve( window.confirm( text, { align: "left" } ) ).then( function( ok ){
		if( ok == true ){
			// > 退出画廊并执行回想脚本
			_this.drill_SGaA_realPopScene();
			DrillUp.drill_SGaA_runRecallScript( script );		//（字符串eval / 函数直接调用）
		}else{
			// > 玩家取消 → 留在画廊界面，恢复列表操作
			SoundManager.playCancel();
			if( _this._window_select != undefined ){ _this._window_select.activate(); }
			if( _this._window_imgExpand != undefined ){ _this._window_imgExpand.deactivate(); }
		}
	});
};
//==============================
// * 画廊A流程 - 选项窗口按钮确认
//==============================
Scene_Drill_SGaA.prototype.drill_selectOk = function() {
	
	// > 获取选中的内容
	var temp_data = $gameTemp._drill_SGaA_visibleDataList[ this._window_select.index() ];
	if(!temp_data ){
		this._window_select.activate();
		this._window_imgExpand.deactivate();
		return;
	}

	// > 选中的是父分类 → 下钻进入该分类（不进原图查看器）
	if( temp_data['isCategory'] == true ){
		this.drill_SGaA_enterCategory( temp_data['categoryKey'] );
		return;
	}

	// > 锁定时，不允许执行
	var realIndex = temp_data['index'];
	if( $gameTemp.drill_SGaA_isLocked( realIndex ) == true ){
		SoundManager.playBuzzer();
		this._window_select.activate();
		this._window_imgExpand.deactivate();
		return;
	}

	// > 有回想脚本的CG：不提供大图鉴赏，点击/确认=确认弹窗询问后触发回想
	//		（单图查看模式除外——那是事件调用的看图功能，仍走原图查看器；
	//		  确认为异步流程，玩家取消时由 drill_SGaA_tryStartRecall 内部恢复列表操作）
	if( $gameTemp._drill_SGaA_isSinglePictureMode != true ){
		var recallScript = DrillUp.drill_SGaA_getRecallScriptByData( temp_data );
		if( recallScript != "" ){
			this.drill_SGaA_tryStartRecall( temp_data );
			return;
		}
	}

	// > 展开原图查看器
	this._window_select.deactivate(); 
	this._window_imgExpand.activate(); 
	
	// > 记录当前 CG 唯一序号（供 drill_SGaA_getCurExpandPicId 等开放接口查询）
	this._drill_SGaA_curExpandPicId = realIndex;

	// > 设置 原图
	this.drill_expandHoming();		//（归位）
	this._sprite_imgExpand_pic.bitmap = ImageManager.load_MenuGallery( temp_data['pic'] );
};
//==============================
// * 画廊A流程 - 进入父分类（下钻）
//==============================
Scene_Drill_SGaA.prototype.drill_SGaA_enterCategory = function( categoryKey ){
	// > 记住分类层光标，返回时还原
	this._drill_SGaA_categoryLayerIndex  = this._window_select.index();
	this._drill_SGaA_categoryLayerTopRow = this._window_select.topRow();

	$gameTemp._drill_SGaA_curCategory = categoryKey;
	this._sprite_thumbnail._drill_bitmaps = [];		//（清空缩略图资源缓存，换层后按新列表重建）
	this._cur_index = -1;							//（强制下一帧刷新描述/缩略图）
	this._window_select.refresh();
	this._window_select.setTopRow( 0 );
	this._window_select.select( 0 );
	this._window_select.activate();
};
//==============================
// * 画廊A流程 - 退回分类层
//==============================
Scene_Drill_SGaA.prototype.drill_SGaA_leaveCategory = function(){
	$gameTemp._drill_SGaA_curCategory = null;
	this._sprite_thumbnail._drill_bitmaps = [];		//（清空缩略图资源缓存）
	this._cur_index = -1;
	this._window_select.refresh();
	this._window_select.setTopRow( this._drill_SGaA_categoryLayerTopRow || 0 );
	this._window_select.select( this._drill_SGaA_categoryLayerIndex || 0 );
	this._window_select.activate();
};
//==============================
// * 画廊A流程 - 选项窗口取消
//==============================
Scene_Drill_SGaA.prototype.drill_selectCancel = function(){
	// > 启用父分类、当前在某分类内、且非"直达进入" → 退回分类层
	//   （直达进入的分类没有上层可退，取消应直接退出场景，体验同单图模式）
	if( DrillUp.g_SGaA_useCategory == true &&
		$gameTemp._drill_SGaA_isSinglePictureMode != true &&
		$gameTemp._drill_SGaA_curCategory != null &&
		this._drill_SGaA_enteredViaJump != true ){
		this.drill_SGaA_leaveCategory();
		return;
	}
	// > 否则退出界面
	this.drill_SGaA_realPopScene();
};
//==============================
// * 画廊A流程 - 真实退出场景（绕过下面重写的 popScene 派发，避免递归）
//==============================
Scene_Drill_SGaA.prototype.drill_SGaA_realPopScene = function(){
	Scene_MenuBase.prototype.popScene.call( this );
};
//==============================
// * 画廊A流程 - 重写退出：让外部触发的退出（如返回按钮）等效于鼠标右键
//
//			说明：	返回按钮(Drill_MenuBackButton)点击时调用 this.popScene()。
//					这里把它派发到"当前激活窗口的取消逻辑"，与右键/取消键完全一致：
//					查看大图时→drill_expandCancel；在列表时→drill_selectCancel；都不活跃时才真正退出。
//==============================
Scene_Drill_SGaA.prototype.popScene = function(){
	// > 复位返回按钮(Drill_MenuBackButton)的按下锁：
	//   它的 _needPopScene 一旦置位就永不复位，靠"popScene 销毁场景"来终止；
	//   而本场景的 popScene 现在可能是非终止的（只退回上一层），不复位会导致下一次鼠标释放再次误触发退出。
	this.drill_SGaA_resetBackButtonLatch();

	if( this._window_imgExpand != undefined && this._window_imgExpand.active == true ){
		this.drill_expandCancel();
	}else if( this._window_select != undefined && this._window_select.active == true ){
		this.drill_selectCancel();
	}else{
		this.drill_SGaA_realPopScene();
	}
};
//==============================
// * 画廊A流程 - 复位返回按钮按下锁（仅当启用了 Drill_MenuBackButton 时有效）
//==============================
Scene_Drill_SGaA.prototype.drill_SGaA_resetBackButtonLatch = function(){
	var arr = this._drill_MBB_sprites_pushdown;
	if( arr == undefined ){ return; }	//（未启用返回按钮插件：跳过）
	for( var i=0; i < arr.length; i++ ){
		var sp = arr[i];
		if( sp == undefined ){ continue; }
		sp._needPopScene = false;		//（解锁，避免下一次鼠标释放再次触发）
		sp.visible = false;				//（收起"按下态"贴图，下一帧主贴图自动恢复）
	}
};
//==============================
// * 画廊A流程 - 原图居中归位
//==============================
Scene_Drill_SGaA.prototype.drill_expandHoming = function() {
	this._sprite_imgExpand_pic['dragging'] = false;				//（清理鼠标拖拽标记）
	this._sprite_imgExpand_pic['lastX'] = 0;
	this._sprite_imgExpand_pic['lastY'] = 0;
	this._sprite_imgExpand_pic['offsetX'] = 0;
	this._sprite_imgExpand_pic['offsetY'] = 0;
	this._sprite_imgExpand_pic['curScale'] = 0;					//（缩放系数标记为未初始化，下一帧按适配屏幕的fitScale重置）
	this._sprite_imgExpand_pic.x = Graphics.boxWidth * 0.5;		//（位置居中）
	this._sprite_imgExpand_pic.y = Graphics.boxHeight * 0.5;
};
//==============================
// * 画廊A流程 - 离开原图查看器
//==============================
Scene_Drill_SGaA.prototype.drill_expandCancel = function() {
	
	// > 单图查看模式
	if( $gameTemp._drill_SGaA_isSinglePictureMode == true ){
		this.drill_SGaA_realPopScene();		//（离开界面）

	// > 一般模式
	}else{
		this._window_select.activate(); 	//（恢复选项窗口）
		this._window_imgExpand.deactivate();
	
	}
};


//==============================
// * 帧刷新 - 窗口选项
//==============================
Scene_Drill_SGaA.prototype.drill_updateIndex = function() {
	if( $gameSystem._drill_SGaA_context_index != undefined ){
		var temp = $gameSystem._drill_SGaA_context_index;
		$gameSystem._drill_SGaA_context_index = null;	//（激活后清空）
		if( temp < 0 ){ temp = 0; };
		if( temp > $gameTemp._drill_SGaA_visibleDataList.length -1 ){ temp = $gameTemp._drill_SGaA_visibleDataList.length -1; };
		this._window_select.select( temp );				//（设置选中页）
	}
	if( this._window_select._index == null || 
		this._window_select._index > $gameTemp._drill_SGaA_visibleDataList.length -1 ||
		this._window_select._index < 0){ this._window_select.select(0);}
	if( $gameTemp._drill_SGaA_visibleDataList.length == 0 ){ return };	//如果选项全部为空，强制选择第一个
	
	if( this._cur_index != this._window_select._index ){
		this._cur_index = this._window_select._index;
		this.drill_resetPosition();
		this._window_desc.drill_refreshDesc(this._cur_index);
		this.drill_refreshThumbnail(this._cur_index);
	}
}
//==============================
// * 帧刷新 - 缩略图
//==============================
Scene_Drill_SGaA.prototype.drill_updateThumbnail = function() {
	if( this._sprite_thumbnail.bitmap == undefined ){ return; }
	if( this._sprite_thumbnail.bitmap.isReady() == false ){ return; }
	
	// > 单图查看模式
	if( $gameTemp._drill_SGaA_isSinglePictureMode == true ){
		this._sprite_thumbnail.visible = false;		//（不显示）
		return;
	}
	
	// > 透明度
	if( DrillUp.g_SGaA_Thumbnail_showInstant == false ){
		this._sprite_thumbnail.opacity += 255/DrillUp.g_SGaA_Thumbnail_slideAnim['slideTime'];
	}
	
	// > 缩放控制
	var ww = this._sprite_thumbnail.bitmap.width;
	var hh = this._sprite_thumbnail.bitmap.height;
	var rxx = 0;
	var ryy = 0;
	if( DrillUp.g_SGaA_Thumbnail_mode == "等比缩放" ){
		var pw = DrillUp.g_SGaA_Thumbnail_width / ww;
		var ph = DrillUp.g_SGaA_Thumbnail_height / hh;
		if( pw > ph ){ pw = ph; }			
		this._sprite_thumbnail.scale.x = pw;
		this._sprite_thumbnail.scale.y = pw;
		rxx = (DrillUp.g_SGaA_Thumbnail_width - ww * pw)*0.5;
		ryy = (DrillUp.g_SGaA_Thumbnail_height - hh * pw)*0.5;
	}else{	//（拉伸缩放）
		var pw = DrillUp.g_SGaA_Thumbnail_width / ww;
		var ph = DrillUp.g_SGaA_Thumbnail_height / hh;
		this._sprite_thumbnail.scale.x = pw;
		this._sprite_thumbnail.scale.y = ph;
	}
	
	// > 位置控制
	this._sprite_thumbnail.x = DrillUp.g_SGaA_Thumbnail_x + rxx;
	this._sprite_thumbnail.y = DrillUp.g_SGaA_Thumbnail_y + ryy;
	
	// > 鼠标点击缩略图（悬停在列表回想按钮上时屏蔽，避免点按钮误进原图查看器）
	if( this._window_select.active == true &&
		this._drill_SGaA_listRecallHover != true &&
		TouchInput.drill_isLeftTriggerd() ){
		
		var pw = ww * this._sprite_thumbnail.scale.x;
		var ph = hh * this._sprite_thumbnail.scale.y;
		
		var _x = _drill_mouse_x;
		var _y = _drill_mouse_y;
		if( _x >= this._sprite_thumbnail.x - 10 &&
			_x <= this._sprite_thumbnail.x + pw + 10 &&
			_y >= this._sprite_thumbnail.y - 10 &&
			_y <= this._sprite_thumbnail.y + ph + 10 ){
			SoundManager.playOk();
			this.drill_selectOk();
		};
	}
}
//==============================
// * 帧刷新 - 原图查看器
//==============================
Scene_Drill_SGaA.prototype.drill_updateImgExpandSprite = function() {
	if( this._sprite_imgExpand_pic.bitmap == undefined ){ return; }
	if( this._sprite_imgExpand_pic.bitmap.isReady() == false ){ return; }
	var ww = this._sprite_imgExpand_pic.bitmap.width;	//（高宽获取）
	var hh = this._sprite_imgExpand_pic.bitmap.height;
	
	// > 移动时间
	if( this._window_imgExpand.active == true ){
		this._sprite_imgExpand_pic['cur_time'] += 1;
	}else{
		this._sprite_imgExpand_pic['cur_time'] -= 1;
	}
	this._sprite_imgExpand_pic['cur_time'] = this._sprite_imgExpand_pic['cur_time'].clamp( 0, DrillUp.g_SGaA_imgExpandPic_slideTime );
	
	// > 透明度控制
	this._sprite_imgExpand_pic.opacity = 255 * this._sprite_imgExpand_pic['cur_time'] / DrillUp.g_SGaA_imgExpandPic_slideTime;


	// > 出血位预留（只压低"初始/最静止"的自适应大小，不动放大上限）：
	//   一开始鉴赏时图片只占屏幕 90%（上下各留 5%），给上下描述文本腾出出血位；
	//   玩家放大时仍可越过 90%、盖住文本充满整个屏幕，需要看文本时再自行缩小回到 90%。
	var bleedRatio = 0.60;
	// > 缩放范围：fitScale（适配屏幕、留出出血位；图片小于屏幕时不放大）~ 2.0（最多放大到2倍原始分辨率）
	var fitScale = Math.min( Graphics.boxWidth / ww, Graphics.boxHeight / hh ) * bleedRatio;
	if( fitScale > 1 ){ fitScale = 1.0; }		//（图片比屏幕还小时按原始尺寸显示，不放大）
	var maxScale = 2.0;

	// > 缩放系数（首次进入/切换图片后初始化为 fitScale）
	if( this._sprite_imgExpand_pic['curScale'] == undefined ||
		this._sprite_imgExpand_pic['curScale'] <= 0 ){
		this._sprite_imgExpand_pic['curScale'] = fitScale;
	}

	// > 滚轮缩放（PC：向上放大，向下缩小）
	if( TouchInput.wheelY < 0 ){
		this._sprite_imgExpand_pic['curScale'] += 0.1;
	}
	if( TouchInput.wheelY > 0 ){
		this._sprite_imgExpand_pic['curScale'] -= 0.1;
	}

	// > 触屏手势（安卓）：双指捏合缩放 + 双指轻点退出
	var touches = this._drill_SGaA_activeTouches;
	var nowCount = ( touches != undefined ) ? touches.length : 0;
	this._sprite_imgExpand_pic['pinching'] = false;

	// > 触摸会话开始（从无触点变为有触点）
	if( this._drill_SGaA_prevCount == 0 && nowCount > 0 ){
		this._drill_SGaA_sessionMaxCount = 0;	//（本次会话出现过的最大触点数）
		this._drill_SGaA_sessionMoved = false;	//（本次会话是否发生过明显捏合）
		this._drill_SGaA_sessionFrames = 0;		//（本次会话持续帧数）
		this._drill_SGaA_lastPinchDist = 0;
	}
	if( nowCount > 0 ){
		if( nowCount > this._drill_SGaA_sessionMaxCount ){ this._drill_SGaA_sessionMaxCount = nowCount; }
		this._drill_SGaA_sessionFrames += 1;
	}

	// > 双指捏合缩放（按两指间距的变化比例缩放）
	if( nowCount >= 2 ){
		var pdx = touches[0].x - touches[1].x;
		var pdy = touches[0].y - touches[1].y;
		var dist = Math.sqrt( pdx*pdx + pdy*pdy );
		if( this._drill_SGaA_lastPinchDist <= 0 ){
			this._drill_SGaA_pinchStartDist = dist;		//（双指刚落下，记录基准间距）
		}else if( dist > 0 ){
			this._sprite_imgExpand_pic['curScale'] *= ( dist / this._drill_SGaA_lastPinchDist );
			if( Math.abs( dist - this._drill_SGaA_pinchStartDist ) > 24 ){
				this._drill_SGaA_sessionMoved = true;	//（间距明显变化＝真捏合，而非轻点）
			}
		}
		this._drill_SGaA_lastPinchDist = dist;
		this._sprite_imgExpand_pic['pinching'] = true;
		// > 捏合期间不拖拽（拖拽起点跟随当前指，避免松手跳动）
		this._sprite_imgExpand_pic['dragging'] = false;
		this._sprite_imgExpand_pic['lastX'] = _drill_mouse_x;
		this._sprite_imgExpand_pic['lastY'] = _drill_mouse_y;
	}else{
		this._drill_SGaA_lastPinchDist = 0;
	}

	// > 触摸会话结束（触点全部抬起）：曾是双指、未捏合、且时间短 → 视为双指轻点退出手势
	if( this._drill_SGaA_prevCount > 0 && nowCount == 0 ){
		if( this._drill_SGaA_sessionMaxCount >= 2 &&
			this._drill_SGaA_sessionMoved == false &&
			this._drill_SGaA_sessionFrames <= 30 &&
			this._window_imgExpand.active == true ){
			SoundManager.playCancel();
			this.drill_expandCancel();		//（退出鉴赏）
		}
	}
	this._drill_SGaA_prevCount = nowCount;

	this._sprite_imgExpand_pic['curScale'] = this._sprite_imgExpand_pic['curScale'].clamp( fitScale, maxScale );
	this._sprite_imgExpand_pic.scale.x = this._sprite_imgExpand_pic['curScale'];
	this._sprite_imgExpand_pic.scale.y = this._sprite_imgExpand_pic['curScale'];


	// > 位置控制
	var xx = Graphics.boxWidth * 0.5;
	var yy = Graphics.boxHeight * 0.5;

	// > 缩放后的实际显示尺寸（用于拖拽边界计算）
	var scaledWW = ww * this._sprite_imgExpand_pic['curScale'];
	var scaledHH = hh * this._sprite_imgExpand_pic['curScale'];

	// > 自适应静止时整体上移（给下方多行描述留更多空间，使其不再居中）：
	//   仅在图片小于屏幕高度（有上下出血位）时生效，且上移量不超过上方可用留白，
	//   放大铺满/超出屏幕时自动归零，避免底部露出空隙。
	var desiredRestShiftY = 30;	//（自适应静止时图片上移量，可按需调整）
	var freeV = ( Graphics.boxHeight - scaledHH ) * 0.5;
	if( freeV < 0 ){ freeV = 0; }
	var restShiftY = Math.min( desiredRestShiftY, freeV );
	
	// > 位置控制 键盘（逻辑按键）
	if( Input.isPressed('up') ){
		this._sprite_imgExpand_pic['offsetY'] += 5;
	}
	if( Input.isPressed('down') ){
		this._sprite_imgExpand_pic['offsetY'] -= 5;
	}
	if( Input.isPressed('left') ){
		this._sprite_imgExpand_pic['offsetX'] += 5;
	}
	if( Input.isPressed('right') ){
		this._sprite_imgExpand_pic['offsetX'] -= 5;
	}
	
	// > 位置控制 鼠标
	var diffX = _drill_mouse_x - this._sprite_imgExpand_pic['lastX'];
	var diffY = _drill_mouse_y - this._sprite_imgExpand_pic['lastY'];
	if( TouchInput.drill_isLeftReleased() ){
		this._sprite_imgExpand_pic['dragging'] = false;
		this._sprite_imgExpand_pic['lastX'] = 0;
		this._sprite_imgExpand_pic['lastY'] = 0;
		this._sprite_imgExpand_pic['offsetX'] += diffX;
		this._sprite_imgExpand_pic['offsetY'] += diffY;
	}
	
	// > 位置控制 不能跨边界（offsetX）
	var bww = (scaledWW - Graphics.boxWidth)*0.5;
	var bhh = (scaledHH - Graphics.boxHeight)*0.5;
	if( bww < 0 ){ bww = 0; }	//（缩小后图片小于屏幕时，不允许拖动出界）
	if( bhh < 0 ){ bhh = 0; }
	this._sprite_imgExpand_pic['offsetX'] = this._sprite_imgExpand_pic['offsetX'].clamp( -1*bww, bww );
	this._sprite_imgExpand_pic['offsetY'] = this._sprite_imgExpand_pic['offsetY'].clamp( -1*bhh, bhh );
	
	// > 位置控制 不能跨边界（拖拽时）
	if( this._sprite_imgExpand_pic['dragging'] == true ){
		var dx = diffX + this._sprite_imgExpand_pic['offsetX'];
		var dy = diffY + this._sprite_imgExpand_pic['offsetY'];
		dx = dx.clamp( -1*bww, bww );
		dy = dy.clamp( -1*bhh, bhh );
		xx += dx;
		yy += dy;
	}else{
		xx += this._sprite_imgExpand_pic['offsetX'];
		yy += this._sprite_imgExpand_pic['offsetY'];
	}
	
	// > 位置控制 赋值（yy 再减去自适应静止上移量）
	this._sprite_imgExpand_pic.x = xx;
	this._sprite_imgExpand_pic.y = yy - restShiftY;
	
	// > 位置控制 鼠标（按下时记录拖拽点）
	//		（捏合缩放期间不启动拖拽，避免双指误触发图片移动）
	if( TouchInput.drill_isLeftTriggerd() && this._sprite_imgExpand_pic['pinching'] != true ){
		this._sprite_imgExpand_pic['dragging'] = true;
		this._sprite_imgExpand_pic['lastX'] = _drill_mouse_x;
		this._sprite_imgExpand_pic['lastY'] = _drill_mouse_y;
	}
}
//==============================
// * 帧刷新 - 单图查看模式
//==============================
Scene_Drill_SGaA.prototype.drill_updateSinglePictureMode = function() {
	if( $gameTemp._drill_SGaA_isSinglePictureMode != true ){ return; }
	
	this._window_select.y = Graphics.boxHeight * 2;
	this._window_desc.y = Graphics.boxHeight * 2;
}


//=============================================================================
// ** ☆原型链规范（Scene_Drill_SGaA）
//
//			说明：	> 此处专门补上缺失的原型链，未缺失的则注释掉。
//					（插件完整的功能目录去看看：功能结构树）
//=============================================================================
//==============================
// * 画廊A（场景基类） - 初始化
//==============================
//Scene_Drill_SGaA.prototype.initialize = function() {
//    Scene_MenuBase.prototype.initialize.call(this);
//};
//==============================
// * 画廊A（场景基类） - 创建
//==============================
//Scene_Drill_SGaA.prototype.create = function() {
//    Scene_MenuBase.prototype.create.call(this);
//};
//==============================
// * 画廊A（场景基类） - 帧刷新
//==============================
//Scene_Drill_SGaA.prototype.update = function() {
//    Scene_MenuBase.prototype.update.call(this);
//};
//==============================
// * 画廊A（场景基类） - 开始运行
//==============================
Scene_Drill_SGaA.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
};
//==============================
// * 画廊A（场景基类） - 结束运行
//==============================
Scene_Drill_SGaA.prototype.stop = function() {
    Scene_MenuBase.prototype.stop.call(this);
};
//==============================
// * 画廊A（场景基类） - 判断是否激活/启动
//==============================
Scene_Drill_SGaA.prototype.isActive = function() {
	return Scene_MenuBase.prototype.isActive.call(this);
};
//==============================
// * 画廊A（场景基类） - 析构函数
//==============================
//Scene_Drill_SGaA.prototype.terminate = function() {
//    Scene_MenuBase.prototype.terminate.call(this);
//};

//==============================
// * 画廊A（场景基类） - 判断加载完成
//==============================
Scene_Drill_SGaA.prototype.isReady = function() {
	return Scene_MenuBase.prototype.isReady.call(this);
};
//==============================
// * 画廊A（场景基类） - 忙碌状态
//==============================
Scene_Drill_SGaA.prototype.isBusy = function() {
	return Scene_MenuBase.prototype.isBusy.call(this);
};

//==============================
// * 画廊A（菜单界面基类） - 创建 - 菜单背景
//==============================
Scene_Drill_SGaA.prototype.createBackground = function() {
	Scene_MenuBase.prototype.createBackground.call(this);
};
//==============================
// * 画廊A（菜单界面基类） - 创建 - 帮助窗口
//==============================
Scene_Drill_SGaA.prototype.createHelpWindow = function() {
	Scene_MenuBase.prototype.createHelpWindow.call(this);
};


//==========================================================================================
// ** 选项窗口【Drill_SGaA_SelectWindow】
//
//==========================================================================================
//==============================
// * 选项窗口 - 定义
//==============================
function Drill_SGaA_SelectWindow() {
	this.initialize.apply(this, arguments);
}
Drill_SGaA_SelectWindow.prototype = Object.create(Window_Selectable.prototype);
Drill_SGaA_SelectWindow.prototype.constructor = Drill_SGaA_SelectWindow;
Drill_SGaA_SelectWindow.lastTopRow = 0;
Drill_SGaA_SelectWindow.lastIndex  = 0;
//==============================
// * 选项窗口 - 初始化
//==============================
Drill_SGaA_SelectWindow.prototype.initialize = function(x, y, width, height) {
	Window_Selectable.prototype.initialize.call(this, x, y, width, height);
	this.refresh();
	this.activate();
	this.drill_initSelect();
};

//==============================
// * 选项窗口 - 窗口数据
//==============================
Drill_SGaA_SelectWindow.prototype.maxCols = function() {
	return DrillUp.g_SGaA_command_window['col'] || 1;
};
Drill_SGaA_SelectWindow.prototype.maxItems = function() {
	return this._list ? this._list.length : 0;
};
Drill_SGaA_SelectWindow.prototype.itemHeight = function() {
	return DrillUp.g_SGaA_command_window['itemHeight'] || this.lineHeight();
};

//==============================
// * 选项窗口 - 帧刷新
//==============================
Drill_SGaA_SelectWindow.prototype.update = function() {
	Window_Selectable.prototype.update.call(this);
	//...（暂无）
};
//==============================
// * 选项窗口 - 重绘内容
//==============================
Drill_SGaA_SelectWindow.prototype.refresh = function() {
	
	// > 单图查看模式
	if( $gameTemp._drill_SGaA_isSinglePictureMode == true ){
		$gameTemp._drill_SGaA_visibleDataList = [];
		this._drill_COSB_indexList = [];							// 按钮组核心 - 交错索引列表
		this._drill_COSB_windowSelectable_refreshing = true;		// 按钮组核心 - 刷新标记
		
		var index = $gameTemp._drill_SGaA_isSinglePictureIndex;
		$gameTemp._drill_SGaA_visibleDataList.push( DrillUp.g_SGaA_context_list[index] );
		this._drill_COSB_indexList.push( index-1 );
		
		this._list = [""];
		this.createContents();
		this.drawAllItems();	//绘制选项内容
		
		
	// > 一般模式
	}else{
		$gameTemp._drill_SGaA_visibleDataList = [];
		this._drill_COSB_indexList = [];							// 按钮组核心 - 交错索引列表
		this._drill_COSB_windowSelectable_refreshing = true;		// 按钮组核心 - 刷新标记

		var useCat = DrillUp.g_SGaA_useCategory == true;
		var atCategoryLayer = ( useCat && $gameTemp._drill_SGaA_curCategory == null );

		if( atCategoryLayer ){
			// > 分类层：收集所有"含可见CG"的父分类（按首次出现顺序去重）
			var seen = {};
			for(var i=1; i<= DrillUp.g_SGaA_context_list_length ;i++){
				var temp_c = DrillUp.g_SGaA_context_list[i];
				if( temp_c == null ){ continue; }
				if( $gameTemp.drill_SGaA_isEnabled( i ) != true ){ continue; }

				var key = temp_c['category'];
				if( seen[key] == undefined ){
					seen[key] = true;
					$gameTemp._drill_SGaA_visibleDataList.push({ "isCategory":true, "categoryKey":key });
					this._drill_COSB_indexList.push( i-1 );
				}
			}
		}else{
			// > CG层：当前分类下的可见CG（未启用父分类时 = 全部可见CG）
			var curCat = $gameTemp._drill_SGaA_curCategory;
			for(var i=1; i<= DrillUp.g_SGaA_context_list_length ;i++){
				var temp_c = DrillUp.g_SGaA_context_list[i];
				if( temp_c == null ){ continue; }
				if( $gameTemp.drill_SGaA_isEnabled( i ) != true ){ continue; }
				if( useCat && temp_c['category'] != curCat ){ continue; }

				$gameTemp._drill_SGaA_visibleDataList.push( temp_c );
				this._drill_COSB_indexList.push( i-1 );
			}
		}

		// > 待绘制的字符串
		this._list = [];
		for( var j=0; j< $gameTemp._drill_SGaA_visibleDataList.length ;j++ ){
			var temp_c = $gameTemp._drill_SGaA_visibleDataList[j];

			// > 父分类项：显示本地化后的分类名
			if( temp_c['isCategory'] == true ){
				this._list.push( DrillUp.drill_SGaA_localizeCategory( temp_c['categoryKey'] ) );
				continue;
			}

			var context_realIndex = temp_c['index'];

			// > 选项锁定
			if( $gameTemp.drill_SGaA_isLocked( context_realIndex ) == true ){
				this._list.push( DrillUp.g_SGaA_locked_name );
				continue;
			}

			// > 长文本选项
			if( DrillUp.g_SGaA_command_window['nameExEnabled'] == true ){
				this._list.push( temp_c['nameEx'] );
				continue;
			}

			// > 普通选项名：直接读取 drill_SGaA_getExpandText_top（与鉴赏页标题同源；不修改 g_SGaA_context_list）
			var sgaa_scene = SceneManager._scene;
			var optName = temp_c['name'];	//（拿不到场景/接口时回退原参数名）
			if( sgaa_scene != undefined && sgaa_scene.drill_SGaA_getExpandText_top != undefined ){
				optName = sgaa_scene.drill_SGaA_stripQuotes( sgaa_scene.drill_SGaA_getExpandText_top( context_realIndex ) );
			}
			this._list.push( optName );
		}
		
		this.createContents();
		this.drawAllItems();	//绘制选项内容
	}
};
//==============================
// * 选项窗口 - 设置选项
//==============================
Drill_SGaA_SelectWindow.prototype.drill_initSelect = function() {
	if( Drill_SGaA_SelectWindow.lastIndex >= this._list.length ){
		Drill_SGaA_SelectWindow.lastIndex = this._list.length-1;
	}
	this.setTopRow(Drill_SGaA_SelectWindow.lastTopRow);
	this.select(Drill_SGaA_SelectWindow.lastIndex);
}
//==============================
// * 选项窗口 - 绘制选项
//==============================
Drill_SGaA_SelectWindow.prototype.drawItem = function( index ){
    var name_str = this._list[index];
	var name_str_list = name_str.split(/\\n/);
	var rect = this.itemRectForText(index);
	
	// > 绘制小缩略图（父分类项不画缩略图）
	var temp_data_item = $gameTemp._drill_SGaA_visibleDataList[ index ];
	if( DrillUp.g_SGaA_command_window['icon_enabled'] == true &&
		temp_data_item != undefined && temp_data_item['isCategory'] != true ){
		var temp_data = temp_data_item;
		var bitmap = null;
		
		// > 锁定时，显示锁定小缩略图
		var realIndex = temp_data['index'];
		if( $gameTemp.drill_SGaA_isLocked( realIndex ) == true ){
			bitmap = ImageManager.load_MenuGallery( DrillUp.g_SGaA_locked_pic );
		}else{
			bitmap = ImageManager.load_MenuGallery( temp_data['pic'] );	//（注意全加载问题）
		}
		
		if( bitmap != null && bitmap.isReady() == true ){
			var ww = bitmap.width;
			var hh = bitmap.height;
			
			if( DrillUp.g_SGaA_command_window['icon_black'] == true ){
				this.contents.fillRect( rect.x, rect.y, rect.width, rect.height, "#000000" );
			}
			
			if( DrillUp.g_SGaA_command_window['icon_mode'] == "等比缩放" ){
				var pw = rect.width / ww;
				var ph = rect.height / hh;
				if( pw > ph ){ pw = ph; }
				var rxx = (rect.width - ww * pw)*0.5;
				var ryy = (rect.height - hh * pw)*0.5;
				this.contents.blt(bitmap, 0, 0, ww, hh, rect.x + rxx, rect.y + ryy, ww*pw, hh*pw );
			}else{	//（拉伸缩放）
				var pw = rect.width / ww;
				var ph = rect.height / hh;
				if( pw > ph ){ pw = ph; }
				this.contents.blt(bitmap, 0, 0, ww, hh, rect.x, rect.y, ww*pw, hh*pw );
			}
		}
	}
	
	// > 绘制内容
	var op = {
		"align":DrillUp.g_SGaA_command_window['align'],
		"autoLineheight":true,
		"x": rect.x,
		"y": rect.y,
		"width": rect.width,
	}
	this.drill_COWA_drawTextListEx_notClean(name_str_list,op);
};
//==============================
// * 选项窗口 - 退出事件
//==============================
Drill_SGaA_SelectWindow.prototype.processCancel = function() {
	Window_Selectable.prototype.processCancel.call(this);
	Drill_SGaA_SelectWindow.lastTopRow = this.topRow();
	Drill_SGaA_SelectWindow.lastIndex = this.index();
};
//==============================
// * 选项窗口 - 兼容 - mog菜单指针插件
//==============================
if( Imported.MOG_MenuCursor == true ){
	var _drill_SGaA_mog_set_mcursor_data = Drill_SGaA_SelectWindow.prototype.need_set_mcursor_data;
	Drill_SGaA_SelectWindow.prototype.need_set_mcursor_data = function() {
		if( DrillUp.g_SGaA_command_window['cursor']['mog_enabled'] == false ){
			return false;
		}
		return _drill_SGaA_mog_set_mcursor_data.call(this);
	}
}
//==============================
// * 选项窗口 - 兼容 - mog菜单边框插件
//==============================
if( Imported.MOG_CursorBorder == true ){
	var _drill_SGaA_mog_createSprSelMenu = Drill_SGaA_SelectWindow.prototype.createSprSelMenu;
	Drill_SGaA_SelectWindow.prototype.createSprSelMenu = function() {
		if( DrillUp.g_SGaA_command_window['cursor']['mog_borderEnabled'] == false ){
			return ;
		}
		_drill_SGaA_mog_createSprSelMenu.call(this);
	}
}
//==============================
// * 选项窗口 - 兼容 - 【Drill_MenuCursor 主菜单 - 多样式菜单指针】
//==============================
if( Imported.Drill_MenuCursor == true ){
	Drill_SGaA_SelectWindow.prototype.drill_MCu_cursorEnabled = function() {
		return DrillUp.g_SGaA_command_window['cursor']['MCu_enabled'];
	}
	Drill_SGaA_SelectWindow.prototype.drill_MCu_cursorStyleId = function() {
		if( DrillUp.g_SGaA_command_window['cursor']['MCu_lock'] == true ){
			return DrillUp.g_SGaA_command_window['cursor']['MCu_style'];
		}else{
			return $gameSystem._drill_MCu_style;
		}
	}
}
//==============================
// * 选项窗口 - 兼容 - 【Drill_MenuCursorBorder 主菜单 - 多样式菜单选项边框】
//==============================
if( Imported.Drill_MenuCursorBorder == true ){
	Drill_SGaA_SelectWindow.prototype.drill_MCB_glimmerRectVisible = function() {
		return DrillUp.g_SGaA_command_window['cursor']['MCB_rectEnabled'];
	}
	Drill_SGaA_SelectWindow.prototype.drill_MCB_borderEnabled = function() {
		return DrillUp.g_SGaA_command_window['cursor']['MCB_enabled'];
	}
	Drill_SGaA_SelectWindow.prototype.drill_MCB_borderStyleId = function() {
		if( DrillUp.g_SGaA_command_window['cursor']['MCB_lock'] == true ){
			return DrillUp.g_SGaA_command_window['cursor']['MCB_style'];
		}else{
			return $gameSystem._drill_MCB_style;
		}
	}
}
//==============================
// * 选项窗口 - 兼容 - 【Drill_MenuScrollBar 主菜单 - 多样式菜单滚动条】
//==============================
if( Imported.Drill_MenuScrollBar == true ){
	Drill_SGaA_SelectWindow.prototype.drill_MSB_scrollBarEnabled = function() {
		return DrillUp.g_SGaA_command_window['cursor']['MSB_enabled'];
	}
	Drill_SGaA_SelectWindow.prototype.drill_MSB_scrollBarStyleId = function() {
		if( DrillUp.g_SGaA_command_window['cursor']['MSB_lock'] == true ){
			return DrillUp.g_SGaA_command_window['cursor']['MSB_style'];
		}else{
			return $gameSystem._drill_MSB_style;
		}
	}
}


//==========================================================================================
// ** 显示窗口【Drill_SGaA_DescWindow】
//
//==========================================================================================
//==============================
// * 显示窗口 - 定义
//==============================
function Drill_SGaA_DescWindow() {
    this.initialize.apply(this, arguments);
}
Drill_SGaA_DescWindow.prototype = Object.create(Window_Base.prototype);
Drill_SGaA_DescWindow.prototype.constructor = Drill_SGaA_DescWindow;
//==============================
// * 显示窗口 - 初始化
//==============================
Drill_SGaA_DescWindow.prototype.initialize = function(x, y, width, height) {
    Window_Base.prototype.initialize.call(this, x,y,width,height);
	//...（暂无）
};
//==============================
// * 显示窗口 - 帧刷新
//==============================
Drill_SGaA_DescWindow.prototype.update = function() {
	Window_Base.prototype.update.call(this);
	//...（暂无）
};
//==============================
// * 显示窗口 - 重绘内容
//==============================
Drill_SGaA_DescWindow.prototype.drill_refreshDesc = function( cur_index ) {
	var temp_list = $gameTemp._drill_SGaA_visibleDataList;		//可见项列表
	var temp_c = temp_list[ cur_index ];					//当前选项

	// > 父分类项：不显示描述内容
	if( temp_c == undefined || temp_c['isCategory'] == true ){
		if( this.contents != undefined ){ this.contents.clear(); }
		return;
	}

	// > 切换描述内容
	var context_list = [];
	var context_realIndex = temp_c['index'];
	
	if( $gameTemp.drill_SGaA_isLocked( context_realIndex ) == true && 
	   (DrillUp.g_SGaA_locked_type == "锁定缩略图和描述内容" || 
		DrillUp.g_SGaA_locked_type == "只锁定描述内容" ) ){
			
		context_list.push( DrillUp.g_SGaA_locked_context );	//锁定内容
	}else{
		// > 描述内容：直接读取 drill_SGaA_getExpandText_bottom（与鉴赏页底部文本同源；不修改 g_SGaA_context_list）
		var sgaa_scene = SceneManager._scene;
		var bottomTxt = temp_c['context'];	//（拿不到场景/接口时回退原参数内容）
		if( sgaa_scene != undefined && sgaa_scene.drill_SGaA_getExpandText_bottom != undefined ){
			bottomTxt = sgaa_scene.drill_SGaA_stripQuotes( sgaa_scene.drill_SGaA_getExpandText_bottom( context_realIndex ) );
		}
		context_list = String( bottomTxt ).split("\n");		//当前内容
	}
	
	// > 绘制内容（强制居中，与缩略图/横线同一中轴；不再用每个CG的"画廊描述内容对齐方式"）
	var op = {
		"align":"居中",
		"autoLineheight":temp_c['contextAutoLineheight'],
		"lineheight":temp_c['contextLineheight'],
	}
	this.drill_COWA_drawTextListEx(context_list,op);
}


//==========================================================================================
// ** 完成度窗口【Drill_SGaA_CompletionWindow】
//
//==========================================================================================
//==============================
// * 完成度窗口 - 定义
//==============================
function Drill_SGaA_CompletionWindow() {
    this.initialize.apply(this, arguments);
}
Drill_SGaA_CompletionWindow.prototype = Object.create(Window_Base.prototype);
Drill_SGaA_CompletionWindow.prototype.constructor = Drill_SGaA_CompletionWindow;
//==============================
// * 完成度窗口 - 初始化
//==============================
Drill_SGaA_CompletionWindow.prototype.initialize = function(x, y, width, height) {
    Window_Base.prototype.initialize.call(this, x,y,width,height);
	//...（暂无）
};
//==============================
// * 完成度窗口 - 帧刷新
//==============================
Drill_SGaA_CompletionWindow.prototype.update = function() {
	Window_Base.prototype.update.call(this);
	//...（暂无）
};
//==============================
// * 完成度窗口 - 重绘内容
//==============================
Drill_SGaA_CompletionWindow.prototype.drill_refresh = function(){
	var temp_list = $gameTemp._drill_SGaA_visibleDataList;		//可见项列表
	
	// > 上锁的数量
	var locked_count = 0;
	for( var i=0; i < temp_list.length; i++ ){
		var temp_c = temp_list[ i ];	
		var context_realIndex = temp_c['index'];
		if( $gameTemp.drill_SGaA_isLocked( context_realIndex ) == true ){
			locked_count += 1;
		}
	}
	
	// > 切换描述内容
	var context = "";
	context = DrillUp.g_SGaA_compWin_word + String( temp_list.length - locked_count ) + "/" + String( temp_list.length );
	
	// > 绘制内容
	var op = {
		"align":"居中",
		"autoLineheight":true,
	}
	this.drill_COWA_drawTextListEx( [ context ],op);
}


//==========================================================================================
// ** 原图查看器窗口【Drill_SGaA_ImgExpandWindow】
//
//			说明：	这个窗口只是用于阻塞流程关系，在展开原图查看器时，提供取消返回选项的功能。
//==========================================================================================
//==============================
// * 原图查看器窗口 - 定义
//==============================
function Drill_SGaA_ImgExpandWindow() {
	this.initialize.apply(this, arguments);
}
Drill_SGaA_ImgExpandWindow.prototype = Object.create(Window_Selectable.prototype);
Drill_SGaA_ImgExpandWindow.prototype.constructor = Drill_SGaA_ImgExpandWindow;
//==============================
// * 原图查看器窗口 - 初始化
//==============================
Drill_SGaA_ImgExpandWindow.prototype.initialize = function(x, y, width, height) {
	Window_Selectable.prototype.initialize.call(this, x, y, width, height);
	this.refresh();
};
//==============================
// * 原图查看器窗口 - 窗口数据
//==============================
Drill_SGaA_ImgExpandWindow.prototype.maxCols = function(){ return 1; };
Drill_SGaA_ImgExpandWindow.prototype.maxItems = function(){ return 1; };
//==============================
// * 原图查看器窗口 - 帧刷新
//==============================
Drill_SGaA_ImgExpandWindow.prototype.update = function() {
	Window_Selectable.prototype.update.call(this);
	//...（暂无）
};
//==============================
// * 原图查看器窗口 - 退出事件
//==============================
Drill_SGaA_ImgExpandWindow.prototype.processCancel = function() {
	Window_Selectable.prototype.processCancel.call(this);
	//...（暂无）
};
//==============================
// * 原图查看器窗口 - 阻塞
//==============================
Drill_SGaA_ImgExpandWindow.prototype.cursorPagedown = function(){}
Drill_SGaA_ImgExpandWindow.prototype.cursorPageup = function(){}
Drill_SGaA_ImgExpandWindow.prototype.scrollDown = function(){}
Drill_SGaA_ImgExpandWindow.prototype.scrollUp = function(){}


//=============================================================================
// * <<<<基于插件检测<<<<
//=============================================================================
}else{
		Imported.Drill_SceneGalleryA = false;
		var pluginTip = DrillUp.drill_SGaA_getPluginTip_NoBasePlugin();
		alert( pluginTip );
}

