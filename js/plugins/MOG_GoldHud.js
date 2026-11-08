//=============================================================================
// MOG_GoldHud.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc (v1.1) Apresenta uma Hud com a quantidade de dinheiro.
 * @author Moghunter
 * @url https://mogplugins.com
 *
 * @param Initial Visible
 * @desc Ativar a Hud no inicio do jogo.
 * @default true 
 *
 * @param Hud X-Axis
 * @desc Definição da posição X-Axis da Hud.
 * @default 555
 *
 * @param Hud Y-Axis
 * @desc Definição da posição Y-Axis da Hud.
 * @default 560
 *
 * @param Number X-Axis
 * @desc Definição da posição X-Axis da Numero.
 * @default 240
 *
 * @param Number Y-Axis
 * @desc Definição da posição Y-Axis da Numero.
 * @default 24
 *
 * @param Fade Limit
 * @desc Definição do limite do fade.
 * @default 60
 *
 * @param Max Gold Digits
 * @text 金钱最大显示位数
 * @type number
 * @min 1
 * @max 16
 * @desc 金钱数值最大显示位数（仅显示位数，不负责破限）。默认 8。
 * @default 8
 *
 * @command GoldHudVisible
 * @desc Apresentar ou ocultar a hud.
 * @text Show / Hide
 *
 * @arg visible
 * @desc Apresentar ou ocultar a hud.
 * @text Visible
 * @default true
 * @type boolean
 * 
 * @help  
 * =============================================================================
 * +++ MOG Gold Hud (v1.1) +++
 * By Moghunter 
 * https://mogplugins.com
 * =============================================================================
 * Apresenta uma Hud com a quantidade de dinheiro.
 * Serão necessários os arquivos. (img/system/)
 *
 * Gold_A.png
 * Gold_B.png (11 horizontal cells: 0123456789G)
 *
 * =============================================================================
 * * HISTÓRICO
 * =============================================================================
 * (v1.1) Correção na função sort relativo a codificação.       
 *
 */

//=============================================================================
// ** PLUGIN PARAMETERS
//=============================================================================
　　var Imported = Imported || {};
　　Imported.MOG_GoldHud = true;
　　var Moghunter = Moghunter || {}; 

  　Moghunter.parameters = PluginManager.parameters('MOG_GoldHud');
   
    // HUD POSITION
	Moghunter.ghud_pos_x = Number(Moghunter.parameters['Hud X-Axis'] || 555);
	Moghunter.ghud_pos_y = Number(Moghunter.parameters['Hud Y-Axis'] || 560);
	Moghunter.ghud_number_pos_x = Number(Moghunter.parameters['Number X-Axis'] || 240);
	Moghunter.ghud_number_pos_y = Number(Moghunter.parameters['Number Y-Axis'] || 24);
	Moghunter.ghud_fade_limit = Number(Moghunter.parameters['Fade Limit'] || 60);	// 修正：@param 名为 Fade Limit，原代码误读 'Fade Max'
	Moghunter.ghud_hudvisible = String(Moghunter.parameters['Initial Visible'] || "true");
	Moghunter.Gold_display = Number(Moghunter.parameters['Max Gold Digits'] || 8);	// 金钱最大显示位数（默认8）

//=============================================================================
// ■■■  PluginManager ■■■ 
//=============================================================================	
	PluginManager.registerCommand('MOG_GoldHud', "GoldHudVisible", data => {
    var vis = String(data.visible) == "true" ? true : false;
	$gameSystem._ghud_visible = vis;
});

//==============================
// ♦ COMPAT ♦  补回 MV 版文本插件指令（显隐）
//   MZ 经 command356→pluginCommand 仍支持 MV 风格文本指令。
//   支持：show_gold_hud / hide_gold_hud 及 >金钱固定框 : 显示/隐藏。
//   （备用框切换 设置为备用框/还原默认框 本次未迁移——当前无备用框图片。）
//==============================
var _MOG_GHud_mv_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function( command, args ){
	if( _MOG_GHud_mv_pluginCommand ){ _MOG_GHud_mv_pluginCommand.call( this, command, args ); }
	if( command === "show_gold_hud" ){ $gameSystem._ghud_visible = true; }
	if( command === "hide_gold_hud" ){ $gameSystem._ghud_visible = false; }
	if( command === ">金钱固定框" && args.length >= 2 ){
		var type = String( args[1] );
		if( type === "显示" || type === "启用" ){ $gameSystem._ghud_visible = true; }
		if( type === "隐藏" || type === "关闭" ){ $gameSystem._ghud_visible = false; }
	}
};

//=============================================================================
// ■■■ Game_System ■■■
//=============================================================================

//==============================
// ♦ ALIAS ♦  Initialize
//==============================
var _alias_mog_ghud_sys_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
	_alias_mog_ghud_sys_initialize.call(this);
	this._ghud_visible = String(Moghunter.ghud_hudvisible) === "true" ? true : false;
};

//=============================================================================
// ■■■ Game Character Base ■■■
//=============================================================================

//==============================
// * Screen RealX
//==============================
Game_CharacterBase.prototype.screen_realX = function() {
    return this.scrolledX() * $gameMap.tileWidth()
};

//==============================
// * Screen RealY
//==============================
Game_CharacterBase.prototype.screen_realY = function() {
    return this.scrolledY() * $gameMap.tileHeight()
};

//=============================================================================
// ■■■ Scene Base ■■■
//=============================================================================

//==============================
// ** create Hud Field
//==============================
Scene_Base.prototype.createHudField = function() {
	this._hudField = new Sprite();
	this._hudField.z = 10;
	this.addChild(this._hudField);
};

//==============================
// ** sort MZ
//==============================
Scene_Base.prototype.sortMz = function() {
   this._hudField.children.sort((a, b) => a.z - b.z);
};

//=============================================================================
// ■■■ Scene Map ■■■
//=============================================================================

//==============================
// ♦ ALIAS ♦  create Spriteset
//==============================
var _mog_goldHud_sMap_createSpriteset = Scene_Map.prototype.createSpriteset;
Scene_Map.prototype.createSpriteset = function() {
	_mog_goldHud_sMap_createSpriteset.call(this);
	if (!this._hudField) {this.createHudField()};
	this.createGoldHud();
	this.sortMz();
};

//==============================
// ♦ ALIAS ♦  snapForBattleBackground
//==============================
var _mog_goldHud_scnMap_snapForBattleBackground = Scene_Map.prototype.snapForBattleBackground;
Scene_Map.prototype.snapForBattleBackground = function() {
	if (this._hudField && SceneManager.isNextScene(Scene_Battle)) {this._hudField.visible = false};
	_mog_goldHud_scnMap_snapForBattleBackground.call(this);
};

//==============================
// ** create Gold Hud
//==============================
Scene_Map.prototype.createGoldHud = function() {
 	this._gold_hud = new Gold_Hud();
	this._gold_hud.z = 122;
	this._hudField.addChild(this._gold_hud);
};

//=============================================================================
// ■■■ Gold_Hud ■■■
//=============================================================================
function Gold_Hud() {
    this.initialize.apply(this, arguments);
};

Gold_Hud.prototype = Object.create(Sprite.prototype);
Gold_Hud.prototype.constructor = Gold_Hud;

//==============================
// * Initialize
//==============================
Gold_Hud.prototype.initialize = function() {	
    Sprite.prototype.initialize.call(this);	
	this._hud_size = [-1,-1,-1,-1];
    this.load_img();
	this.opacity = 255;
};

//==============================
// * Load Img
//==============================
Gold_Hud.prototype.load_img = function() {
	this._layout_img = ImageManager.loadSystem("Gold_A");
	this._number_img = ImageManager.loadSystem("Gold_B");
};

//==============================
// * Create Layout
//==============================
Gold_Hud.prototype.create_layout = function() {
	this._layout = new Sprite(this._layout_img);
	this._layout.x = this._pos_x;
	this._layout.y = this._pos_y;
	this.addChild(this._layout);
};
	
//==============================
// * Refresh Data
//==============================
Gold_Hud.prototype.refresh_data = function() {
     this._hud_size[0] = Moghunter.ghud_pos_x - ($gameMap.tileWidth() / 2);
     this._hud_size[1] = Moghunter.ghud_pos_y - $gameMap.tileHeight();
     this._hud_size[2] = Moghunter.ghud_pos_x + this._layout_img.width - $gameMap.tileWidth();
     this._hud_size[3] = Moghunter.ghud_pos_y + this._layout_img.height;	 
	 this._pos_x = Moghunter.ghud_pos_x;
	 this._pos_y = Moghunter.ghud_pos_y;
  	 this.create_layout();
     this.create_number();	 
};

//==============================
// * Create Number
//==============================
Gold_Hud.prototype.create_number = function() {
	this._number = [];
	this._number_img_data = [this._number_img.width,this._number_img.height,
	                      this._number_img.width / 11, this._number_img.height / 2,
						  this._pos_x + Moghunter.ghud_number_pos_x,
						  this._pos_y + Moghunter.ghud_number_pos_y,
						  ];
	// 数字位数外再创建一个精灵，用于紧跟数值显示第 11 格的 G。
	for (var i = 0; i < Moghunter.Gold_display + 1; i++) {
	   this._number[i] = new Sprite(this._number_img);
	   this._number[i].visible = false;
	   this._number[i].x = this._number_img_data[4];
	   this._number[i].y = this._number_img_data[5];
	   this.addChild(this._number[i]);
	};
	this._number_old = $gameParty.gold();
	this.refresh_number(this._number,this._number_old,this._number_img_data,this._number_img_data[4]);
};

//==============================
// * Update Dif
//==============================
Gold_Hud.prototype.update_dif = function(value,real_value,speed) {
	if (value == real_value) {return value};
	var dnspeed = 1 + (Math.abs(value - real_value) / speed);
	if (value > real_value) {value -= dnspeed;
	    if (value < real_value) {value = real_value};}
    else if (value < real_value) {value  += dnspeed;
    	if (value  > real_value) {value  = real_value};		
    };
	return Math.floor(value);
};

//==============================
// * Refresh Number
//==============================
Gold_Hud.prototype.refresh_number = function(sprites,value,img_data,x) {
    var numbers = Math.abs(value).toString().split("").slice(-Moghunter.Gold_display);
	var cellWidth = img_data[2];
	for (var i = 0; i < sprites.length; i++) {sprites[i].visible = false};
	// 从配置的 Number X-Axis 开始向右排列，改为左对齐。
	for (var i = 0; i < numbers.length; i++) {
	   var n = Number(numbers[i]);
	   sprites[i].setFrame(n * cellWidth, 0, cellWidth, img_data[1]);
	   sprites[i].x = x + cellWidth * i;
	   sprites[i].visible = true;
	};
	// 第 11 格是 G，始终紧跟在最后一位金钱数字后。
	var symbol = sprites[numbers.length];
	if (symbol) {
	   symbol.setFrame(10 * cellWidth, 0, cellWidth, img_data[1]);
	   symbol.x = x + cellWidth * numbers.length;
	   symbol.visible = true;
	};
};

//==============================
// * Update Number
//==============================
Gold_Hud.prototype.update_number = function() {
	 var dif_number = this.update_dif(this._number_old,$gameParty.gold(),10)
	 if (this._number_old != dif_number) {this._number_old = dif_number;
	 this.refresh_number(this._number,this._number_old,this._number_img_data,this._number_img_data[4]);};
};

//==============================
// * Update visible
//==============================
Gold_Hud.prototype.update_visible = function() {
	if (Imported.MOG_ChronoEngine && $gameSystem.isChronoMode()) {
		this.opacity -= 20;
		return;
	};	
	this.visible = $gameSystem._ghud_visible;
	if (this.is_hud_visible()) {this.opacity += 10}	 
	else {
		if (this.opacity > Moghunter.ghud_fade_limit) {	
			this.opacity -= 10;
			if (this.opacity < Moghunter.ghud_fade_limit) {this.opacity = Moghunter.ghud_fade_limit};
		};
	};
};

//==============================
// * Is Hud Visible
//==============================
Gold_Hud.prototype.is_hud_visible = function() {
	if (!$gameSystem._ghud_visible) {return false};
	if ($gamePlayer.screen_realX() < this._hud_size[0]) {return true};
	if ($gamePlayer.screen_realX() > this._hud_size[2]) {return true};
	if ($gamePlayer.screen_realY() < this._hud_size[1]) {return true};
	if ($gamePlayer.screen_realY() > this._hud_size[3]) {return true};
	if (this.opacity < Moghunter.ghud_fade_limit) {return true};
	return false;
};

//==============================
// * Update
//==============================
Gold_Hud.prototype.update = function() {	
    Sprite.prototype.update.call(this);	
	if (this._hud_size[0] === -1 && this._layout_img.isReady()) {this.refresh_data()};
	if (this._hud_size[0] === -1) {return};
	this.update_visible();
	this.update_number();
};
