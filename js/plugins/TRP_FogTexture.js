//=============================================================================
// TRP_FogTexture.js
//=============================================================================

// Spriteset_Map
// FogSprite
// FogTextureSprite
// Game_Map

// ConfigManager
// Window_Options

// Filter Editor
// showImagePicker


//=============================================================================
/*:
 * @target MZ
 * @author Thirop
 * @plugindesc 床テクスチャプラグイン[負荷注意:ヘルプに詳細]
 * @help
 * マップにテクスチャを重ねて濃淡の質感を出すプラグイン。
 *
 *
 * ◆ブレンド(合成)モード「オーバーレイ」の負荷について
 * ブレンドモード「オーバーレイ」はマップに濃淡をつけるのに
 * 便利ですが、他のブレンドモードより高負荷です。
 *
 * 特に、ツクールMZではMVよりも負荷が高く、
 * スマートフォンや低スペックPCでは非推奨となります。
 *
 * オプションやプラグインコマンドでブレンドモード：オーバーレイの
 * フォグを無効・有効の設定することができるので適宜設定してください。
 * ・MV形式コマンド「fogSprite enableOverlay on/off」
 * （プラグインコマンドで変更時には、シーン遷移を挟んで有効化されます。）
 * ・スクリプト「ConfigManager.trpFogEnableOverlay = true」(またはfalse)
 * （キー名を変えてるときは設定したConfigManager.キー名）
 *
 *
 * 
 * ◆ブレンド(合成)モード「オーバーレイ」の動作について
 * ツクールMZではデフォルトでは未対応です。
 *
 * MZではコアスクリプトver1.6.0以降かつ、
 * 「pixi-picture_for_MZ_160.js」を導入することで
 * ブレンドモード「オーバーレイ」に対応します。
 *
 *
 * 【更新履歴】
 * 1.56 2025/11/29 修正:一部ツクールバージョンで発生するエラー修正
 * 1.50 2024/04/02 追加:天候エディタ経由で複数フォグレイヤーの重ね表示対応
 *                 修正:updateコマンドでspeedYが反映されない不具合
 *                 修正:フォグ表示直後のちらつき
 * 1.40 2023/05/18 パラメータ変更機能。画像ピッカー追加
 * 1.25 2023/01/20 オプション設定の修正
 * 1.24 2023/01/19 初版
 *
 *
 *
 * 
 * 【使い方】
 * □編集の開始
 * プラグインコマンド「編集開始」を実行してエディタを呼び出す
 * └MVでは「fogTexture edit」
 * └スクリプトでは「TRP_CORE.FogSprite.edit()」
 *
 * □マップのメモ欄設定
 * エディタ終了時にクリップボードに設定パラメータがコピーされるので
 * マップのメモ欄にペーストすればOK。
 *
 * □パラメータ変更コマンド
 * 表示中のフォグのパラメータを変更します。
 * └MVでは「fogTexture update 所要フレーム数 《パラメータペースト》」
 * └パラメータはエディタ表示中にCtrl+Cでコピー。
 * └アルファ、スピードX、スピードYのみ変更可能
 *
 *
 * 【テクスチャ画像】
 * 「img/trp_fogs」フォルダ内に
 * fog1.png、fog2.png〜の形式のファイル名で
 * 画像を準備してください。
 * （「ExPluginSet/materials/trp_fogs」フォルダにプリセット素材があります）
 * 
 *
 *
 * @command edit
 * @text 編集開始
 * @desc テクスチャの編集開始
 *
 * @command enableOverlay
 * @text オーバーレイ設定変更
 * @desc ブレンドモード：オーバーレイのフォグ表示のON/OFF設定
 * 
 * @arg flag
 * @text フラグ設定
 * @desc ブレンドモード：オーバーレイのフォグ表示のON/OFF設定
 * @type boolean
 * @default true
 *
 *
 * @command update
 * @text パラメータ変更
 * @desc 表示中フォグのパラメータを変更。アルファ、スピードの値のみ有効
 *
 * @arg duration
 * @text 所要フレーム
 * @desc 変化にかける所要フレーム数
 * @type number
 * @default 60
 * 
 * @arg param
 * @text パラメータ<ペースト>
 * @desc エディタでCtrl+Cで値をコピーしたものをペースト
 * @type string
 *
 *
 *
 *
 * @param imagePickerCol
 * @text 画像選択UIの列数
 * @desc 画像選択UIの列数。デフォ値は4
 * @default 4
 * @type number
 *
 * @param imagePickerRow
 * @text 画像選択UIの行数
 * @desc 画像選択UIの行数。デフォ値は3
 * @default 4
 * @type number
 *
 * @param disableUpdateCommand
 * @text updateコマンドを無効化
 * @desc trueでupdateコマンドを無効化。（Game_Mapに関数を追加してるため競合時にはOFFに）
 * @default false
 * @type boolean
 *
 * 
 * @param categoryOverlay
 * @text 【オーバーレイ設定】
 * @default ブレンドモード：オーバーレイに関する設定
 *
 * @param enableOverlayOnInit
 * @text 開始時オーバーレイ設定
 * @desc ゲーム開始時のブレンドモード：オーバーレイのフォグ有効設定初期値
 * @default true
 * @type boolean
 * @parent categoryOverlay
 *
 * @param enableOverlayOnMobileDevice
 * @text スマホのオーバーレイ設定
 * @desc スマホプレイ時のブレンドモード：オーバーレイのフォグ有効設定初期値
 * @default false
 * @type boolean
 * @parent categoryOverlay
 *
 * @param optionIndex
 * @text 負荷設定オプション表示順
 * @desc オーバーレイ設定オプションをオプションウィンドウの上から何番目に表示するか。-1でオプション追加なし
 * @type number
 * @default -1
 * @min -1
 * @parent categoryOverlay
 *
 * @param optionName
 * @text オプション名
 * @desc オーバーレイ設定オプションの表示名
 * @type string
 * @default マップテクスチャ
 * @parent categoryOverlay
 *
 * @param optionKey
 * @text オバレオプションキー
 * @desc オーバーレイオプションの内部保存キー。MapObject.jsのキーと揃えると連動可能。
 * @default trpFogEnableOverlay
 * @parent categoryOverlay
 * 
 * @param defUseTrpTiling
 * @text 独自タイリング使用(デフォ)
 * @desc 独自タイリング使用のデフォルト値
 * @type boolean
 * @default false
 * 
 * @requiredAssets img/trp_fogs/fog1
 * @requiredAssets img/trp_fogs/fog2
 * @requiredAssets img/trp_fogs/fog3
 * @requiredAssets img/trp_fogs/fog4
 * @requiredAssets img/trp_fogs/fog5
 * @requiredAssets img/trp_fogs/fog6
 * @requiredAssets img/trp_fogs/fog7
 * @requiredAssets img/trp_fogs/fog8
 * @requiredAssets img/trp_fogs/fog9
 * 
 *
 */
//============================================================================= 


(function(){
'use strict';

var useBlendFilter = PIXI.picture&&PIXI.picture.getBlendFilter;
var isMZ = Utils.RPGMAKER_NAME === "MZ";
var isMac = navigator.userAgent.contains('Macintosh');
var ctrlKey = isMac ? 'Cmd' : 'Ctrl';
var pluginName = 'TRP_FogTexture';

var parameters = PluginManager.parameters(pluginName);

var enableOverlayOnInit = parameters.enableOverlayOnInit==='true'||parameters.enableOverlayOnInit===true;
var enableOverlayOnMobileDevice = parameters.enableOverlayOnMobileDevice==='true'||parameters.enableOverlayOnMobileDevice===true;
var optionIndex = parameters.optionIndex===undefined ? -1 : Number(parameters.optionIndex);
var optionName = parameters.optionName||'マップテクスチャ';
var optionKey = parameters.optionKey = parameters.optionKey||'trpFogEnableOverlay';
var defUseTrpTiling = parameters.defUseTrpTiling==='true';

//=============================================================================
// Plugin Command
//=============================================================================
if(isMZ){
	PluginManager.registerCommand(pluginName,'edit',function(args){
		FogTextureSprite.edit();
	});
	PluginManager.registerCommand(pluginName,'update',function(args){
		var argsArr = Object.keys(args).map(key=>args[key]);
		$gameMap.trpFogTextureChangeParameters(argsArr);
	});
	PluginManager.registerCommand(pluginName,'enableOverlay',function(args){
		ConfigManager[optionKey] = args.flag==='true'||args.flag===true;
		ConfigManager.save();
	});
};

var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command,args){
	if(command==='floorTexture'||command==='fogTexture'){
		if(args[0]&&args[0]==='enableOverlay'){
			ConfigManager[optionKey] = args[1]!=='off'&&args[1]!=='false';
			ConfigManager.save();
		}else if(args[0]==='update'){
			args.shift();
			$gameMap.trpFogTextureChangeParameters(args);
		}else{
			FogTextureSprite.edit();
		}
	}else{
		_Game_Interpreter_pluginCommand.call(this,...arguments);
	}
};



//=============================================================================
// Managers
//=============================================================================
ImageManager.loadTrpFog = function(filename) {
    return this.loadBitmap("img/trp_fogs/", filename);
};

var _DataManager_extractSaveContents = DataManager.extractSaveContents;
DataManager.extractSaveContents = function(contents){
	_DataManager_extractSaveContents.call(this,...arguments);
	
	//migrate > array to object
	if(Array.isArray($gameMap._trpFogTextures)){
		var textures = {};
		for(var i=$gameMap._trpFogTextures.length-1; i>=0; i=(i-1)|0){
			var data = $gameMap._trpFogTextures[i];
			if(data){
				textures[i] = data;
			}
		}
		$gameMap._trpFogTextures = textures;
	};
};


//=============================================================================
// Spriteset_Map
//=============================================================================
var _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
Spriteset_Map.prototype.createLowerLayer = function(){
	_Spriteset_Map_createLowerLayer.call(this);
	this.setupTrpFogs();
};

Spriteset_Map.prototype.setupTrpFogs = function(){
	this._trpFogSprites = [];

	if(!this._tilemap)return;

	/* old data
	===================================*/
	var paramStr = $dataMap.meta.floorTexture;
	if(paramStr){
		this.createTrpFog(paramStr,0);
	}

	/* normal data
	===================================*/
	if($dataMap.meta.trpFog){
		var idx = 0;
		var paramStrs = $dataMap.meta.trpFog.split('|');
		for(var paramStr of paramStrs){
			var idxMatch = paramStr.match(/,idx:([0-9]+)/);
			if(idxMatch){
				idx = Number(idxMatch[1]);
				paramStr = paramStr.replace(/,idx:([0-9]+)/,'');
			}
        	this.createTrpFog('['+paramStr+']',idx++);
	    }
	}
};

Spriteset_Map.prototype.createTrpFog = function(paramStr,idx=0,alphaZero=false){
	idx = String(idx);
	var params = Array.isArray(paramStr) ? paramStr : JSON.parse(paramStr);
	var blend = params[1];

	if(TRP_CORE.useBlendFilter(blend) && !ConfigManager[optionKey]){
		return;
	}

	var fogDataOwner = this.trpFogDataOwner();
	var sprite = new FogTextureSprite(idx,fogDataOwner);
	if(alphaZero){
		params[Game_Map.TRP_PARAMS_INDEX_ALPHA-1] = 0;
	}
	sprite.setup(...params);
	this._tilemap.addChild(sprite);
	this._trpFogSprites.push(sprite);
};
Spriteset_Map.prototype.trpFogDataOwner = ()=>$gameMap;







//=============================================================================
// FogSprite
//=============================================================================
var TRP_Container = TRP_CORE.TRP_Container;
var FogSprite = TRP_CORE.FogSprite = function FogSprite(){
    this.initialize.apply(this, arguments);
};

FogSprite.prototype = Object.create(TRP_Container.prototype);
FogSprite.prototype.constructor = FogSprite;

FogSprite.MARGIN = 4;
FogSprite.prototype.initialize = function(dataOwner) {
    TRP_Container.prototype.initialize.call(this);
    this.z = 5;

    this.useTrpTiling = false;
    this._tilingSprite = null;
    this._scaleX = 1;
    this._scaleY = 1;

    this._scrollRateX = 1;
    this._scrollRateY = 1;

    this._doSpeed = false;
    this.__speedX = 0;
    this.__speedY = 0;
    this._autoX = 0;
    this._autoY = 0;

	this._dataOwner = dataOwner;
};

FogSprite.prototype.setSpeed = function(x=0,y=0){
	this.__speedX = -x/60;
	this.__speedY = -y/60;
	this._doSpeed = !!(x||y);
};
FogSprite.prototype.setScrollRate = function(x=1,y=1){
	this._scrollRateX = x;
	this._scrollRateY = y;
};
FogSprite.prototype.setBlendMode = function(blendMode=0){
	if(!this._tilingSprite)return;
	TRP_CORE.setBlendMode(this._tilingSprite,blendMode);
};

FogSprite.prototype.setup = function(image,scaleX=1,scaleY=1,blendMode=0){
	var folder;
	if(image.contains('/')){
		var elems = image.split('/');
		folder = '';
		for(var i=0; i<elems.length-1; i=(i+1)|0){
			folder += elems[i];
			folder += '/';
		}
		image = elems[elems.length-1];
	}else{
		folder = 'img/fogs/';
	}

	var bitmap = ImageManager.loadBitmap(folder, image);
	this.setupWithBitmap(bitmap,scaleX,scaleY,blendMode);
};
FogSprite.prototype.setupWithBitmap = function(bitmap,scaleX,scaleY,blendMode,trpTiling=0){
	if(this._tilingSprite){
		if(this._tilingSprite.parent){
			this._tilingSprite.parent.removeChild(this._tilingSprite);
		}
		this._tilingSprite.destroy();
	}

	var m = FogSprite.MARGIN;
	var width = Graphics.width+2*m;
	var height = Graphics.height+2*m;
	var sprite;

	this._scaleX = scaleX;
	this._scaleY = scaleY;

	blendMode = blendMode.clamp(0,29);
	this.useTrpTiling = trpTiling>0;
	
	if(this.useTrpTiling){
		//TRP_TilingSprite
		sprite = new TRP_CORE.TRP_TilingSprites(width,height);
		sprite.noMask = true;
		sprite.setScale(scaleX,scaleY,true);
		sprite.bitmap = bitmap;
	}else{
		//normal TilingSprite
		sprite = new TilingSprite();
		sprite.scale.set(scaleX,scaleY);
		sprite.width = width/scaleX;
		sprite.height = height/scaleY;
		sprite.bitmap = bitmap;
	}
	TRP_CORE.setBlendMode(sprite,blendMode);

	this._tilingSprite = sprite;
	this.addChild(sprite);
	sprite.x = -m;
	sprite.y = -m;

	this.update();
};



/* update
===================================*/
FogSprite.prototype.update = function(){
	if(this._tilingSprite){
		var ox = (this._dataOwner._displayX||0)*48 * this._scrollRateX;
		var oy = (this._dataOwner._displayY||0)*48 * this._scrollRateY;
		if(!this.useTrpTiling){
			ox /= this._scaleX;
		    oy /= this._scaleY;
		}

		if(this._doSpeed){
			this._autoX += this.__speedX;
			this._autoY += this.__speedY;
		}
		this._tilingSprite.origin.x = ox + this._autoX;
		this._tilingSprite.origin.y = oy + this._autoY;
	}

	TRP_Container.prototype.update.call(this);
};




//=============================================================================
// FogTextureSprite
//=============================================================================
var FogTextureSprite = TRP_CORE.FogTextureSprite = function FogTextureSprite(){
    this.initialize.apply(
    	this, arguments);
};

FogTextureSprite.prototype = Object.create(FogSprite.prototype);
FogTextureSprite.prototype.constructor = FogTextureSprite;
FogTextureSprite.MARGIN = 4;
FogTextureSprite.prototype.initialize = function(idx='0',dataOwner=$gameMap){
    FogSprite.prototype.initialize.call(this,dataOwner);

    this._fogIdx = idx;
    this._setupId = 0;
    this._currentParams = null;

	//cache:dataOwners._trpFogTextures
	this._dataOwner = dataOwner;
};

FogTextureSprite.DEFAULT_PARAMS = {
	image:1,blendMode:1,scale:1,aspectRatio:1,z:4,gamma:1,contrast:1,brightness:1,alpha:1,speedX:0,speedY:0,scrollX:1,scrollY:1,trpTiling:defUseTrpTiling?1:0,
};
// FogTextureSprite.DEFAULT_PARAMS_ARRAY = Object.values(FogTextureSprite.DEFAULT_PARAMS);

FogTextureSprite.prototype.setup = function(image=1,blendMode=1,scale=1,aspectRatio=1,z=4,gamma=1,contrast=1,brightness=1,alpha=1,speedX=0,speedY=0,scrollX=1,scrollY=1,trpTiling=defUseTrpTiling?1:0){
	/* check needsFilterSnap
	===================================*/
	var needsFilterSnap = gamma!==1 || contrast!==1 || brightness!==1;

	var filterParamNotChange = false;
	if(this._currentParams){
		if(image===this._currentParams.image
			&& gamma===this._currentParams.gamma
			&& contrast===this._currentParams.contrast
			&& brightness===this._currentParams.brightness
		){
			filterParamNotChange = true;
		}
	}

	
	this._currentParams = {image,blendMode,scale,aspectRatio,z,gamma,contrast,brightness,alpha,speedX,speedY,scrollX,scrollY,trpTiling};
	var args = [image,blendMode,scale,aspectRatio,z,gamma,contrast,brightness,alpha,speedX,speedY,scrollX,scrollY,trpTiling];

	this._setupId += 1;
	var setupId = this._setupId;

	this.opacity = alpha*255;
				
	if(this._tilingSprite && filterParamNotChange){
		//reuse current bitmap
		this._setup(this._tilingSprite.bitmap,setupId,...args);
	}else{
		//load bitmap
		if(typeof image === 'number'){
			image = 'fog'+image;
		}

	    var bitmap = ImageManager.loadTrpFog(image);
	    if(needsFilterSnap){
	    	bitmap.addLoadListener(this.makeBitmap.bind(this,bitmap,setupId,...args));
	    }else{
	    	bitmap.addLoadListener(this._setup.bind(this,bitmap,setupId,...args));
	    }
	}
};

FogTextureSprite.prototype.makeBitmap = function(bitmap,setupId,image,blendMode,scale,aspectRatio,z,gamma,contrast,brightness,alpha,speedX=0,speedY=0,scrollX=1,scrollY=1,trpTiling=-1){
	if(this._setupId !== setupId)return;

	var sprite = new Sprite();
	sprite.bitmap = bitmap;

	var w = sprite.width;
	var h = sprite.height;

	var filterId = 'fracAdjust';
	var params = [gamma,1,contrast,brightness, 1,1,1,1];
	TRP_FilterManager.filterCreate(filterId,null,'adjustment',sprite,params);
	
	var contents = TRP_CORE.snap(sprite,w,h);
	TRP_FilterManager.filterClear(filterId);
	sprite.destroy();

	this._setup(contents,setupId,image,blendMode,scale,aspectRatio,z,gamma,contrast,brightness,alpha,speedX,speedY,scrollX,scrollY,trpTiling);
};

FogTextureSprite.prototype._setup = function(bitmap,setupId,image,blendMode,scale,aspectRatio,z,gamma,contrast,brightness,alpha,speedX=0,speedY=0,scrollX=1,scrollY=1,trpTiling=-1){
	if(this._setupId !== setupId)return;

	var m = FogTextureSprite.MARGIN;
	var scaleX = scale;
	var scaleY = scale*aspectRatio;
	this.setupWithBitmap(bitmap,scaleX,scaleY,blendMode,trpTiling);

	this.setSpeed(speedX,speedY);
	this.setScrollRate(scrollX,scrollY);

	this.opacity = 255*alpha;
    this.z = z;

	var fogTextures = this._dataOwner._trpFogTextures;
	var data = fogTextures ? fogTextures[this._fogIdx] : null;
	if(data){
		this.updateParameters(data,true);
	};

	this.update(true);
};

FogTextureSprite.prototype.update = function(noAnimation=false){
	FogSprite.prototype.update.call(this);

	var fogTextures = this._dataOwner._trpFogTextures;
	var data = fogTextures ? fogTextures[this._fogIdx] : null;
	if(data && data[0] && data[0]>Number.MIN_SAFE_INTEGER && !noAnimation){
		this.updateParameters(data);
	}
};

Game_Map.TRP_PARAMS_INDEX_ALPHA = 9;
FogTextureSprite.prototype.updateParameters = function(data=this._dataOwner._trpFogTextures[this._fogIdx],noAnimation=false){
	var [d,image,blendMode,scale,aspectRatio,z,gamma,contrast,brightness,alpha,speedX,speedY,scrollX,scrollY,trpTiling] = data;
	var opacity = alpha*255;
	if(d<0)d*=-1;

	this._currentParams.alpha = alpha;
	if(opacity!==this.opacity){
		var o = this.opacity;
		if(!d){
			this.opacity = opacity;
		}else if(!noAnimation){
			this.opacity = (this.opacity*(d-1)+opacity)/d;
		}
	}

	this._currentParams.speedX = speedX;
	this._currentParams.speedY = speedY;
	speedX = -speedX/60;
	speedY = -speedY/60;
	if(!d){
		this.__speedX = speedX;
		this.__speedY = speedY;
	}else{
	    if(this.__speedX!==speedX){
			this.__speedX = (this.__speedX*(d-1)+speedX)/d;
	    }
	    if(this.__speedY!==speedY){
			this.__speedY = (this.__speedY*(d-1)+speedY)/d;
	    }
	}
    this._doSpeed = !!(this.__speedX||this.__speedY);
};



//=============================================================================
// Game_Map
//=============================================================================
if(parameters.disableUpdateCommand!=='true')(()=>{
	var _Game_Map_initialize = Game_Map.prototype.initialize;
	Game_Map.prototype.initialize = function(){
		_Game_Map_initialize.call(this,...arguments);
		this._trpFogTextures = null;
	};
	var _Game_Map_setup = Game_Map.prototype.setup;
	Game_Map.prototype.setup = function(mapId){
		_Game_Map_setup.call(this,...arguments);
		this._trpFogTextures = null;
	};
	Game_Map.prototype.trpFogTextureChangeParameters = function(args){
		if(!args)return;

		var duration = Math.max(1,(Number(args[0])||0)+1);
		var params = args[1].split(',');
		var idx = params.shift();
		this.trpFogTexturePrepare(idx);

		var o = ((this._trpFogTextures[idx]?this._trpFogTextures[idx][Game_Map.TRP_PARAMS_INDEX_ALPHA]:1)||1)*255;
		this._trpFogTextures[idx] = [duration,...(params.map(p=>Number(p)))];
	};
	Game_Map.prototype.trpFogTexturePrepare = function(idx,data){
		this._trpFogTextures = this._trpFogTextures||{};
	}
	Game_Map.prototype.trpFogTextureClear = function(idx=0,duration=120){
		this.trpFogTexturePrepare(idx);
		this._trpFogTextures[idx] = this._trpFogTextures[idx]||[0];
		var fog = this._trpFogTextures[idx];
		if(duration<0){
			//clear after current animation
			if(fog[0]>0){
				//on animation
				fog[0] *= -1;
			}else if(fog[0]===0){
				fog[0] = Number.MIN_SAFE_INTEGER;
			}
		}else if(duration===0){
			fog[0] = Number.MIN_SAFE_INTEGER;
		}else{//(duration<0)
			//clear after fade
			fog[0] = duration;
			fog[Game_Map.TRP_PARAMS_INDEX_ALPHA] = 0;
		}
	};

	var _Game_Map_update = Game_Map.prototype.update;
	Game_Map.prototype.update = function(){
		_Game_Map_update.call(this,...arguments);
		if(this._trpFogTextures){
			this.updateTrpFogTextures();
		}
	};
	Game_Map.prototype.updateTrpFogTextures = function(){
		var keys = Object.keys(this._trpFogTextures);
		for(const key of keys){
			var data = this._trpFogTextures[key];
			if(data && data[0]){
				if(data[0]>0){
					data[0] -= 1;
					if(data[0]<=0)data[0]=0;
				}else if(data[0]===Number.MIN_SAFE_INTEGER){
					//delete flag
				}else{
					//update to delete
					data[0] += 1;
					if(data[0]>=0){
						//deleteFlag
						data[0]=Number.MIN_SAFE_INTEGER;
					}
				}
			}
		}
	}

	var _Spriteset_Map_update = Spriteset_Map.prototype.update;
	Spriteset_Map.prototype.update = function(){
		_Spriteset_Map_update.call(this,...arguments);
		if($gameMap._trpFogTextures)this.updateTrpFogTextures();
	}
	Spriteset_Map.prototype.updateTrpFogTextures = function(fogs=$gameMap._trpFogTextures){
		var keys = Object.keys(fogs);
		var sprites = this._trpFogSprites;
		for(var i=keys.length-1; i>=0; i=(i-1)|0){
			var key = keys[i];
			var fog = fogs[key];
			if(!fog)continue;

			var sprite = sprites.find(s=>s&&s._fogIdx===key);
			if(fog[0]===Number.MIN_SAFE_INTEGER){
				//delete
				delete fogs[key];
				if(sprite){
					TRP_CORE.remove(sprites,sprite);
					if(sprite.parent){
						sprite.parent.removeChild(sprite);
					}
					sprite.destroy();
				}
			}else if(!sprite){
				//create
				var params = fog.concat();
				var d = params.shift(); //shift duration
				this.createTrpFog(params,key,d>0);
			}
		}
	};
})();


//=============================================================================
// ConfigManager
//=============================================================================
var _ConfigManager_makeData = ConfigManager.makeData;
ConfigManager.makeData = function() {
    var config = _ConfigManager_makeData.call(this);
    config[optionKey] = this[optionKey];
    return config;
};

var _ConfigManager_applyData = ConfigManager.applyData;
ConfigManager.applyData = function(config) {
    _ConfigManager_applyData.call(this,config);
    this[optionKey] = config[optionKey];
    if(this[optionKey]===undefined){
    	this.initTrpFogEnableOverlay();
    };
};

ConfigManager.initTrpFogEnableOverlay = function(){
	if(this[optionKey]!==undefined)return;
	if(Utils.isMobileDevice()){
		this[optionKey] = enableOverlayOnMobileDevice;
	}else{
		this[optionKey] = enableOverlayOnInit;
	}
};

ConfigManager.initTrpFogEnableOverlay();



//=============================================================================
// Window_Options
//=============================================================================
if(optionIndex>=0)(function(){
	var _Window_Options_makeCommandList = Window_Options.prototype.makeCommandList;
	Window_Options.prototype.makeCommandList = function() {
	    _Window_Options_makeCommandList.call(this);

	    this.addCommand(optionName, optionKey);

	    var command = this._list.pop();
	    var index = optionIndex.clamp(0,this._list.length);
	    this._list.splice(index,0,command);
	};
})();






//=============================================================================
// Filter Editor
//=============================================================================
(()=>{
TRP_CORE.FloorTextureSprite = {};

if(!Utils.isOptionValid('test')){
	FogTextureSprite.edit = function(){};
	TRP_CORE.FloorTextureSprite.edit  = function(){};
	return;
}


var _Dev = TRP_CORE.DevFuncs;
TRP_CORE.FloorTextureSprite.edit  = function(){
	FogTextureSprite.edit();
};
FogTextureSprite.edit = function(){
	var sprite;
	var spriteset = SceneManager._scene._spriteset;
	var sprites = spriteset._trpFogSprites;

	try{
		Editor.start(sprites);
	}catch(e){
		SoundManager.playBuzzer();
	}
};




//=============================================================================
// Editor
//=============================================================================
var Editor = FogTextureSprite.Editor = function Editor(){
	this.initialize.apply(this, arguments);
};

var backspaceKey = Input.keyMapper[8]||'backspace';
Input.keyMapper[8] = backspaceKey;

Editor._savedUpdate = null;
Editor.isActive = false;
Editor.instance = null;
Editor.autoIdx = null;

Editor.start = function(sprites,completion=null){
	this.isActive = true;

	sprites = sprites.concat().filter(a=>a);

	this._savedUpdate = SceneManager._scene.update;
	var editor = new Editor(sprites,completion)
	Editor.instance = editor;
	var scene = SceneManager._scene;
	scene.addChild(editor);

	var spriteset = editor.fogSpriteOwner();
	scene.update = function(){
		_Dev.updateTexts();
		if(!editor.update()){
			SceneManager._scene.update = this._savedUpdate;

			this._savedUpdate = null;
			scene.removeChild(editor);
			editor.destroy();
			this.isActive = false;
			Editor.instance = null;
		}

		for(const sprite of spriteset._trpFogSprites){
			sprite.update();
		}
	}.bind(this);
};

Editor.prototype = Object.create(Sprite.prototype);
Editor.prototype.constructor = Editor;
Editor.prototype.initialize = function(fogSprites,completion=null){
	Sprite.prototype.initialize.call(this);
	this.initMembers();

	this._completion = completion;
	this._fogSprites = fogSprites;
	for(const sprite of fogSprites){
		sprite._currentParams.fogIdx = sprite._fogIdx;	
	}

	_Dev.showText('fogEditHelp',[
		'←→：値の調整(+Shiftで微調整)',
		ctrlKey+'+I：画像選択',
		ctrlKey+'+D：一時的に表示/非表示',
		ctrlKey+'+W：編集終了&パラメータコピー',
		ctrlKey+'+N：フォグの追加',
		ctrlKey+'+Backspace：フォグの削除',
		ctrlKey+'+左右キー：フォグの切り替え',
	]);

	this.setEditingIdx(0);

	SoundManager.playOk();
	this.registerKeyListeners();
	this.createSelectorSprite();
	this.createLines();

	this.prepareInputtingCandidates();
};
Editor.prototype.initMembers = function(){
	this.clearKeyDownListeneres();

	this._end = false;

	this._fogSprites = null;
	this._layerIdx = -1;

	this._lastEditingIndex = -1;
	this._editingIndex = -1;

	this._data = null;
	this._keys = null;

	this._parts = null;
	this._commands = null;
	this._completion = null;

	this._inputtingWords = '';
	this._inputtingCandidates = null;
};

Editor.prototype.fogDataOwner = ()=>$gameMap;
Editor.prototype.fogSpriteOwner = ()=>SceneManager._scene._spriteset;
Editor.prototype.setEditingIdx = function(layerIdx,force=false){
	if(!force && this._layerIdx===layerIdx)return;
	if(layerIdx<0){
		SoundManager.playBuzzer();
	}

	//prepare new fog sprite
	var sprite;
	var fogDataOwner = this.fogDataOwner();
	var spriteOwner = this.fogSpriteOwner();
	if(layerIdx>=this._fogSprites.length){
		layerIdx = this._fogSprites.length;

		var fogIdx = layerIdx;
		if(Editor.autoIdx){
			fogIdx = Editor.autoIdx+':'+layerIdx;
		}
		sprite = new FogTextureSprite(fogIdx,fogDataOwner);
		this._fogSprites[layerIdx] = sprite;
		spriteOwner._tilemap.addChild(sprite);
		spriteOwner._trpFogSprites.push(sprite);

		sprite.setup();
		sprite._currentParams.fogIdx = fogIdx;
	}

	SoundManager.playOk();
	this._layerIdx = layerIdx;

	sprite = this._fogSprites[layerIdx];
	if(Editor.autoIdx){
		sprite._currentParams.fogIdx = sprite._currentParams.fogIdx.replace(Editor.autoIdx,'auto');
	}

	this._data = JsonEx.makeDeepCopy(sprite._currentParams);
	this._keys = Object.keys(this._data);
	this._target = sprite;
	if(fogDataOwner._trpFogTextures){
		fogDataOwner._trpFogTextures[sprite._fogIdx] = null;
	}

	if(this._parts){
		for(const parts of this._parts){
			parts.clearInputting();
			parts._data = this._data;
			parts._target = sprite;
			parts.refreshParts();
		}
	};

	_Dev.showText('fogEditIdx','<編集中:%1/%2>'.format(
		this._layerIdx+1, this._fogSprites.length
	));
};
Editor.prototype.deleteCurrentFogSprite = function(){
	if(this._fogSprites.length <= 1){
		SoundManager.playBuzzer();
		return;
	}

	var fogDataOwner = this.fogDataOwner();
	var fogSpriteOwner = this.fogSpriteOwner();

	var sprite = this._target;
	sprite.parent.removeChild(sprite);
	TRP_CORE.remove(this._fogSprites,sprite);
	TRP_CORE.remove(fogSpriteOwner._trpFogSprites,sprite);
	
	if(fogDataOwner._trpFogTextures){
		delete fogDataOwner._trpFogTextures[sprite._fogIdx]
	}
	sprite.destroy();

	//modify fogIdx
	var layerIdx = this._layerIdx;
	var length = this._fogSprites.length;
	for(var i=layerIdx; i<length; i=(i+1)|0){
		var sprite = this._fogSprites[i];
		if(sprite._currentParams.fogIdx===String(i+1)){
			sprite._currentParams.fogIdx = String(i);
		}else if(Editor.autoIdx){
			if(sprite._currentParams.fogIdx===Editor.autoIdx+':'+String(i+1)){
				sprite._currentParams.fogIdx = Editor.autoIdx+':'+String(i);
			}
		}
	}

	//refresh page
	if(layerIdx>=this._fogSprites.length){
		layerIdx -= 1;
	}
	this.setEditingIdx(layerIdx,true);
};


Editor.PARAMS_UNIT = {
	image:1,
	blendMode:1,
	scale:0.1,
	aspectRatio:0.1,
	z:1,
	gamma:0.1,
	saturation:0.1,
	contrast:0.1,
	brightness:0.1,
	red:0.1,
	green:0.1,
	blue:0.1,
	alpha:0.1,
	speedX:10,
	speedY:10,
	scrollX:0.1,
	scrollY:0.1,
	trpTiling:1,
};
Editor.INT_PARAMS = [
	'image','blendMode','z','trpTiling',
];


Editor.prototype.update = function(){
	if(this._imagePicker && this._imagePicker.parent){
		this._imagePicker.update();
	}else{
		if(TouchInput.isTriggered()||TouchInput.isPressed()){
			this.processTouch();
		}else if(Input._latestButton || this._keyCode){
			this.processInput();
		}
	}
	this._keyCode = 0;
	this._key = '';
	return !this._end;
};

Editor.prototype.processTouch = function(){
   var allParts = this._parts;
	var length = allParts.length;
	var x = TouchInput.x;
	var y = TouchInput.y;

	var margin = Editor.SELECTOR_MARGIN;
	for(var i = 0; i<length; i=(i+1)|0){
		var parts = allParts[i];
		if(parts.processTouch(x,y,margin)){
			TouchInput.clear();
			this.startEditing(i);
			return;
		}
	}
};

Editor.prototype.processInput = function(){
	if(this._end)return;

	if(Input.isRepeated('down') && this._keyCode!==98){
		var index = this._editingIndex;
		index = (index+1)%this._parts.length;

		this.startEditing(index);
		this.resetInputingWords();
	}else if(Input.isRepeated('up') && this._keyCode!==104){
		var index = this._editingIndex;
		index -= 1;
		if(index<0)index = this._parts.length-1;

		this.startEditing(index);
		this.resetInputingWords();
	}else if(Input.isRepeated('right')){
		this.addValue(Input.isPressed('shift')?0.1:1);
	}else if(Input.isRepeated('left')){
		this.addValue(Input.isPressed('shift')?-0.1:-1);
	}else if(this._keyCode>=KEY_CODE.alphabet && this._keyCode<=KEY_CODE.alphabetEnd){
		this.pushInputtingCharacter(String.fromCharCode(this._keyCode));
	}else{
		var editing = this._editingIndex>=0 ? this.editingParts() : null;
		if(editing){
			if(!editing.processInput(this._keyCode,this._key)){
				this.endEditing();  
			}else{
				this.selectParts(this._editingIndex);
			}
		}
		if(this._keyCode!==0){
			this.resetInputingWords();
		}
	}
};

Editor.prototype.setFilterParams = function(innerData,params){
	var idx = 0;
	var data = innerData.data;
	for(const parts of this._parts){
		if(parts._data !== data)continue;

		var value = params[idx++];
		parts.setValue(value);
	}
};

Editor.prototype.addValue = function(rate){
	var parts = this.editingParts()
	if(!parts)return;
	parts.addValue(rate);
};


Editor.prototype.end = function(){
	if(!this.processFogIdxes())return;

	this._end = true;
	this.resignKeyListeners();

	var lines = this._parts;
	var length = lines.length;
	for(var i=0; i<length; i=(i+1)|0){
		var line = lines[i];
		line._target = null;
	}


	//copy data
	var text = this.resultText();

	_Dev.copyToClipboard(text,true);
	_Dev.showTempText('clip','クリップボードにフィルター設定をコピー')
	SoundManager.playSave();

	_Dev.showText('fogEditHelp',null);
	_Dev.showText('fogEditIdx',null);

	if(this._completion){
		var argsArr = [];
		for(const sprite of this._fogSprites){
			var args = [];
			argsArr.push(args);
			for(const key in sprite._currentParams){
				args.push(sprite._currentParams[key]);
			}

			var fogIdx = sprite._fogIdx;
			if(Editor.autoIdx){
				fogIdx = fogIdx.replace(Editor.autoIdx,'auto');
			}
			args.push('idx:'+fogIdx);
		}
		this._completion(argsArr);
		this._completion = null;
	}
};
Editor.prototype.processFogIdxes = function(){
	var idxes = [];

	var fogTextures = this.fogDataOwner()._trpFogTextures;
	for(const sprite of this._fogSprites){
		if(Editor.autoIdx){
			sprite._currentParams.fogIdx = sprite._currentParams.fogIdx.replace('auto:',Editor.autoIdx+':');
		}
		var idx = sprite._currentParams.fogIdx;
		if(idxes.contains(idx)){
			SoundManager.playBuzzer();
			alert('fogIdxが重複しています。<fogIdx=%1>'.format(idx));
			return false;
		}
		idxes.push(idx);
		if(fogTextures){
			delete fogTextures[sprite._fogIdx];
			delete fogTextures[sprite._currentParams.fogIdx];
		}
	}
	for(const sprite of this._fogSprites){
		sprite._fogIdx = sprite._currentParams.fogIdx;
		delete sprite._currentParams.fogIdx;
	}

	//delete duplicated idx fogs
	var sprites = this.fogSpriteOwner()._trpFogSprites;
	for(var i=sprites.length-1; i>=0; i=(i-1)|0){
		var sprite = sprites[i];
		if(!sprite)continue;
		if(this._fogSprites.contains(sprite))continue;
		if(!idxes.contains(sprite._fogIdx))continue;
		sprite.parent.removeChild(sprite);
		TRP_CORE.remove(sprites,sprite);
	}

	return true;
};

Editor.prototype.resultText = function(){
	var metaValue = '';
	var sprites = this.fogSpriteOwner()._trpFogSprites;
	var keys = null;
	for(const sprite of sprites){
		if(metaValue)metaValue += '|';
		keys = keys || Object.keys(sprite._currentParams);

		var str = '';
		for(const key of keys){
			if(str)str+=',';
			str += sprite._currentParams[key];
		}
		var fogIdx = sprite._fogIdx;
		if(Editor.autoIdx){
			fogIdx = fogIdx.replace(Editor.autoIdx,'auto');
		}
		str += ',idx:'+fogIdx;
		metaValue += str;
	}
	return '<trpFog:'+metaValue+'>';
};

Editor.prototype.startEditing = function(index){
	if(index<0)return;

	if(this._editingIndex === index)return;
	SoundManager.playCursor(); 

	var target = this._parts[index];
	if(this._editingIndex>=0){
		this._endEditing();
		index = this._parts.indexOf(target);
		if(index<0){
			this._editingIndex = -1;
			this.deselectParts();
			return;
		}
	}

	this._editingIndex = index;
	target.startEditing();
	this.selectParts(index);
};
Editor.prototype.endEditing = function(){
	SoundManager.playCancel();

	this._lastEditingIndex = this._editingIndex;
	this._endEditing();

	this._editingIndex = -1;
	this.deselectParts();
};
Editor.prototype._endEditing = function(){
	var editing = this.editingParts();
	if(editing){
		editing.endEditing();
	}
}
Editor.prototype.editingParts = function(){
	return this._parts[this._editingIndex];
};

Editor.prototype.registerKeyListeners = function(){
	var listener = this._onKeyDown.bind(this);
	this._keydownListener = listener;
	document.addEventListener('keydown', listener);
};
Editor.prototype.clearKeyDownListeneres = function(){
	this._keydownListener = null;
	this._copyListener = null;
};
Editor.prototype.resignKeyListeners = function(){
	if(this._keydownListener){
		document.removeEventListener('keydown',this._keydownListener);	
	}
	if(this._copyListener){
		document.removeEventListener('copy',this._copyListener);	
	}

	this.clearKeyDownListeneres();
};

Editor.prototype._onKeyDown = function(event){
	if(this._imagePicker && this._imagePicker.parent){
		this._imagePicker._onKeyDown(event);
		return;
	}
	if(event.ctrlKey||event.metaKey){
		if(event.key==='g'){
			if(this.alpha===1){
				this.alpha = 0.25;
			}else{
				this.alpha = 1;
			}
			SoundManager.playCursor();
		}else if(event.key==='i'){
			SoundManager.playCursor();
			this.showImagePicker();
		}else if(event.key==='d'){
			this._target.visible = !this._target.visible;
			SoundManager.playCursor();
		}else if(event.key==='w'){
			this.end();
		}else if(event.key==='n'){
			this.setEditingIdx(this._fogSprites.length);
		}else if(event.key==='Backspace'){
			this.deleteCurrentFogSprite();
		}else if(event.key==='ArrowLeft'){
			Input.clear();
			if(this._layerIdx>0){
				this.setEditingIdx(this._layerIdx-1);
			}else SoundManager.playBuzzer();
		}else if(event.key==='ArrowRight'){
			Input.clear();
			if(this._layerIdx<this._fogSprites.length-1){
				this.setEditingIdx(this._layerIdx+1);
			}else SoundManager.playBuzzer();
		}else if(event.key==='c'){
			SoundManager.playCursor();
			this.copyParamsForUpdateCommand();
		}
	}else if(!event.ctrlKey && !event.altKey) {
		this._keyCode = event.keyCode;
		this._key = event.key;
	}
};



/* copy for update command
===================================*/
Editor.prototype.copyParamsForUpdateCommand = function(){
	var data = this._data;
	var sprites = this.fogSpriteOwner()._trpFogSprites;
	var sprite = sprites[this._layerIdx];
	if(!sprite)return;

	var keys = Object.keys(sprite._currentParams);
	TRP_CORE.remove(keys,'fogIdx');

	var str = ''+sprite._currentParams.fogIdx;
	for(const key of keys){
		if(str)str+=',';
		str += sprite._currentParams[key];
	}
	SoundManager.playOk();
	_Dev.showTempAlert('変更コマンド用パラメータをコピー！')
	_Dev.copyToClipboard(str,true);
};


/* selector
===================================*/
Editor.prototype.createSelectorSprite = function(){
	var size = EditorLine.LINE_HEIGHT;
	var bitmap = new Bitmap(size,size);
	bitmap.fillAll('rgb(180,180,180)');

	var sprite = new Sprite(bitmap);
	sprite.opacity = 150;
	this._selectorSprite = sprite;
	this.addChild(sprite);
	sprite.visible = false;
};
Editor.SELECTOR_MARGIN = 20;
Editor.prototype.selectParts = function(index){
	var parts = this._parts[index];
	var sprite = this._selectorSprite;
	
	var size = sprite.bitmap.height;
	sprite.y = parts.y;
	
	sprite.anchor.set(1,0);
	sprite.x = Graphics.width;
	
	sprite.scale.x = (parts._width+Editor.SELECTOR_MARGIN)/size;
	sprite.visible = true;

};


Editor.prototype.deselectParts = function(){
	this._selectorSprite.visible = false;
};


/* editor line
===================================*/
Editor.SELECTION_WIDHT = 24;
Editor.prototype.createLines = function(){
	var y = 20;
	var lineH = 24;
	var categoryMargin = 14;
	this._parts = [];
	this._commands = [];

	//filter params
	var data = this._data;
	for(const key of this._keys){
		if(key==='gamma' || key==='speedX' || key==='fogIdx'){
			y += categoryMargin;
		}

		var line = new EditorLine(key,data,this._target);
		line.y = y;
		line.refresh();

		this._parts.push(line);
		this._commands.push(key.toUpperCase());

		this.addChild(line);

		y += lineH;
	}

	// this._parts.push(line);
	// this._commands.push(key.toUpperCase());

	this.addChild(line);
};




/* word inputting
===================================*/
Editor.prototype.resetInputingWords = function(){
	if(this._inputtingWords==='')return;

	this._inputtingWords = '';
	this.prepareInputtingCandidates();
};
Editor.prototype.prepareInputtingCandidates = function(){
	this._inputtingCandidates = this._commands.concat();
};
Editor.prototype.pushInputtingCharacter = function(chara){
	this._inputtingWords += chara;
	var words = this._inputtingWords;
	var candidates = this._inputtingCandidates;
	var length = candidates.length;
	var firstHit = null;
	for(var i = 0; i<length; i=(i+1)|0){
		var word = candidates[i];
		if(word.indexOf(words)!==0){
			candidates.splice(i,1);
			i -= 1;
			length -= 1;
		}else{
			firstHit = firstHit || word;
		}
	}
	
	if(!firstHit){
		this.prepareInputtingCandidates();
		candidates = this._inputtingCandidates
		var length = candidates.length;
		while(words.length>0 && !firstHit){
			for(var i=0; i<length; i=(i+1)|0){
				if(candidates[i].indexOf(words)!==0)continue;
				firstHit = candidates[i];
				break;
			}
			if(!firstHit){
				words = words.substr(1);
			}
		}
		if(firstHit){
			for(var i=length-1; i>=0; i=(i-1)|0){
				if(candidates[i].indexOf(words)!==0)continue;
				candidates.splice(i,1);
			}   
		}
		this._inputtingWords = words;
	}

	if(firstHit){
		this.tryInputtingFirstHit(firstHit)
	}
};
Editor.prototype.tryInputtingFirstHit = function(firstHit){
	var perfectHit = this._inputtingWords===firstHit;
	var index = this._commands.indexOf(firstHit);
	this.startEditing(index);
};



//=============================================================================
// showImagePicker
//=============================================================================
Editor._imagePicker = null;
Editor.prototype.showImagePicker = function(){
	if(!Editor._imagePicker)this._imagePicker = new ImagePicker();
	this.addChild(this._imagePicker);
	this._imagePicker.start(id=>{
		var lines = this._parts;
		for(const line of lines){
			if(line && line._key==='image'){
				line.setValue(id);
				break;
			}
		}
	});
};


/* ImagePicker
===================================*/
var ImagePicker = Editor.ImagePicker = function ImagePicker(){
	this.initialize.apply(this, arguments);
};
ImagePicker.prototype = Object.create(Sprite.prototype);
ImagePicker.prototype.constructor = ImagePicker;
ImagePicker.prototype.initialize = function(){
	Sprite.prototype.initialize.call(this);
	this._onSelect = null;
	this._page = -1;
	this._list = null;
	this._sprites = [];
	this._idSprites = [];

	this._bg = new PIXI.Graphics();
	this.addChild(this._bg);
	this._bg.beginFill(0x888888,1)
		.drawRect(0,0,Graphics.width,Graphics.height);

	this.createSprites();
	this.setupList();
	this.setPage(0);
};

ImagePicker.prototype.start = function(onSelect){
	this._onSelect = onSelect;
};

ImagePicker.prototype.setupList = function(){
	this._list = [];
	var dir = 'img/trp_fogs/';
	var files = _Dev.readdirSync(dir);
	for(const file of files){
		if(!file.contains('.png'))continue;
		var id = Number(file.replace('fog','').replace('.png',''));
		if(isNaN(id))continue;
		this._list.push(id);
	}
	this._list.sort((a,b)=>Number(a)-Number(b));
};

/* sprites
===================================*/
ImagePicker.ID_FONT_SIZE = 22;
ImagePicker.prototype.createSprites = function(){
	var num = this.itemNumInPage();
	var col = this.col();
	var row = this.row();
	var w = Graphics.width/col;
	var h = Graphics.height/row;
	for(var i=0; i<num; i=(i+1)|0){
		var sprite = new Sprite();
		this.addChild(sprite);
		this._sprites.push(sprite);	

		var c = i%col;
		var r = Math.floor(i/col);
		sprite.x = (c+0.5)*w;
		sprite.y = (r+0.5)*h;
		sprite.anchor.set(0.5,0.5);


		//idSprite
		var bitmap = new Bitmap(w,ImagePicker.ID_FONT_SIZE+6);
		bitmap.fontSize = ImagePicker.ID_FONT_SIZE;
		bitmap.outlineColor = 'black';
		bitmap.outlineWidth = 5;
		var idSprite = new Sprite(bitmap);
		idSprite.x = c*w;
		idSprite.y = r*h;
		this.addChild(idSprite);
		this._idSprites.push(idSprite);
	}
};

/* setPage
===================================*/
ImagePicker.prototype.setPage = function(page=0,force=false){
	if(page<0)page = 0;
	if(page>this.maxPage())page = this.maxPage();
	if(this._page===page && !force)return;
	this._page = page;

	SoundManager.playCursor();

	var num = this.itemNumInPage();
	var i0 = num*page;
	var i1 = num*(page+1)-1;
	var w = Graphics.width/this.col()-2;
	var h = Graphics.height/this.row()-2;

	var sprites = this._sprites;
	for(const sprite of sprites){
		sprite.visible = false;
	}
	var idSprites = this._idSprites;
	for(const sprite of idSprites){
		sprite.visible = false;
	}
	for(var i=i0; i<=i1&&i<this._list.length; i=(i+1)|0){
		var sprite = sprites[i-i0];
		var idSprite = this._idSprites[i-i0];
		var id = this._list[i];
		sprite.visible = true;
		sprite.bitmap = ImageManager.loadTrpFog('fog'+id);
		sprite.bitmap.addLoadListener(function(sprite){
			var s = Math.min(w/sprite.bitmap.width,h/sprite.bitmap.height);
			sprite.scale.set(s,s);
		}.bind(this,sprite));


		idSprite.visible = true;
		var bitmap = idSprite.bitmap;
		bitmap.clear();
		bitmap.drawText(id,2,0,bitmap.width-4,bitmap.height);
	}
};

/* end
===================================*/
ImagePicker.prototype.end = function(id=-1){
	if(id>=0 && this._onSelect){
		this._onSelect(id);
	}
	this._onSelect = null;
	this.parent.removeChild(this);
};

/* update
===================================*/
ImagePicker.prototype.update = function(){
	if(TouchInput.isTriggered()){
		this.processTouch();
	}
};
ImagePicker.prototype.processTouch = function(){
	var tx = TouchInput.x;
	var ty = TouchInput.y;

	for(var i=this._sprites.length-1; i>=0; i=(i-1)|0){
		var sprite = this._sprites[i];
		if(!sprite.visible)continue;
		var w = sprite.width*sprite.scale.x;
		var x0 = sprite.x-w/2;
		var x1 = sprite.x+w/2;
		if(tx<x0 || tx>x1)continue;
		var h = sprite.height*sprite.scale.y;
		var y0 = sprite.y-h/2;
		var y1 = sprite.y+h/2;
		if(ty<y0 || ty>y1)continue;

		var id = this._list[i+this.itemNumInPage()*this._page];
		this.end(id);
		SoundManager.playOk();
		return;
	}
};

ImagePicker.prototype._onKeyDown = function(event){
	if(event.key==='q'||event.key==='ArrowLeft'){
		this.setPage(this._page-1);
	}else if(event.key==='w'||event.key==='ArrowRight'){
		this.setPage(this._page+1);
	}else if(event.key==='Escape'){
		SoundManager.playCancel();
		this.end();
	}
};

/* helper
===================================*/
ImagePicker.prototype.col = function(){
	return Number(parameters.imagePickerCol)||4;
};
ImagePicker.prototype.row = function(){
	return Number(parameters.imagePickerRow)||3;
};
ImagePicker.prototype.itemNumInPage = function(){
	return this.col()*this.row();
};
ImagePicker.prototype.maxPage = function(){
	return Math.ceil(this._list.length/this.itemNumInPage())-1;
}





//=============================================================================
// EditorLine
//=============================================================================
function EditorLine(){
	this.initialize.apply(this, arguments);
};
EditorLine.FONT_SIZE = 18;
EditorLine.LINE_HEIGHT = EditorLine.FONT_SIZE+4;

EditorLine.prototype = Object.create(PIXI.Container.prototype);
EditorLine.prototype.constructor = EditorLine;
EditorLine.prototype.initialize = function(key,data,target){
	PIXI.Container.call(this);
	this.width = Graphics.width;
	this.height = Graphics.height;

	this._key = key;
	this._data = data;
	this._target = target;

	this._width = 0;
	this._height = EditorLine.LINE_HEIGHT;

	this._titleWidth = 0;
	this._titleSprite = null;
	this._parts = [];
	this._textsCache = [];

	this._editingIndex = -1;
	this._inputting = '';
};

EditorLine.prototype.titleText = function(){
	var title;
	if($gameSystem.isJapanese()){
		title = EditorLine.paramTitleJapanese(this._key);
	}else{
		title = this._key;
	}
	return '['+title+']';
};
EditorLine.paramTitleJapanese = function(key){
	switch(key){
	case "z":return "Z値";
	case "image":return "画像番号";
	case "scale":return "拡大率";
	case "aspectRatio":return "アスペクト(縦/横比率)";
	case "blendMode":return "ブレンドモード";

	case "gamma":return "ガンマ";
	case "contrast":return "コントラスト";
	case "brightness":return "明るさ";
	case "alpha":return "アルファ";

	case "speedX":return "スピード:X方向/秒";
	case "speedY":return "スピード:Y方向/秒";
	case "scrollX":return "スクロール付随:X方向";
	case "scrollY":return "スクロール付随:Y方向";
	case "trpTiling":return "独自Tiling<0:無効,1:使用>";

	case "fogIdx":return "フォグIdx(重複不可)";
	}
};


EditorLine.prototype.type = function(){
	return 'value';
};
EditorLine.prototype.refreshWithConfigData = function(config){
	this.refresh();
};
EditorLine.prototype.refresh = function(){
	this.refreshParts();
};
EditorLine.prototype.titleColor = function(){
	return 'rgb(100,200,255)';
};
EditorLine.prototype.partsColor = function(){
	if(this.isInvalid(true)){
		return 'rgb(255,100,100)';
	}
	return 'rgb(200,255,255)';
};
EditorLine.prototype.isInvalid = function(checkKey=false){
	if(!checkKey || this._key==='image'){
		if(!_Dev.existsSync('img/trp_fogs/fog'+this._data.image+'.png')){
			return true;
		}
	}
	return false;
}
EditorLine.prototype.createTitleSprite = function(){
	var sprite = new Sprite();
	this.addChild(sprite);
	this._titleSprite = sprite;

	this.refreshTitleSprite();
};
EditorLine.prototype.refreshTitleSprite = function(){
	var text = this.titleText();

	var sprite = this._titleSprite;
	var bitmap = sprite.bitmap;

	var fontSize = EditorLine.FONT_SIZE;
	var width = text.length*fontSize+4;
	var height = fontSize+4;
	if(bitmap && bitmap.width<width){
		bitmap.clear();
	}else{
		bitmap = new Bitmap(width,height);
		sprite.bitmap = bitmap;
	}

	sprite.anchor.set(1,0);

	bitmap.fontSize = fontSize;
	bitmap.outlineColor = 'black';
	bitmap.outlineWidth = 5;
	bitmap.textColor = this.titleColor();
	bitmap.drawText(text,0,0,width,height,'right');

	this._titleWidth = bitmap.measureTextWidth(text);
};

EditorLine.prototype.refreshParts = function(){
	var parts = this._parts;
	var length = this.partsNum();

	for(var i = 0; i<length; i=(i+1)|0){
		var text = this.partsText(i);
		var sprite = parts[i];
		if(!sprite){
			sprite = this.createPartsSprite();
			this.addChild(sprite);
			parts[i] = sprite;
			this._textsCache[i] = null;
		}else{
			sprite.visible = true;
		}
		if(this.checkChangeFromCache(text,i)){
			this.refreshPartsText(sprite,text,i);
		}
	}
	
	var partsLen = parts.length;
	for(;i<partsLen;i=(i+1)|0){
		parts[i].parent.removeChild(parts[i]);
	}
	parts.length = length;

	this.layout();
};

EditorLine.prototype.checkChangeFromCache = function(text,i){
	if(this._textsCache[i] === text){
		return false;
	}

	this._textsCache[i] = text;
	return true;
};

EditorLine.prototype.partsNum = function(){
	return 1;
};

EditorLine.prototype.partsText = function(index){
	return this._inputting || this._data[this._key];
};
EditorLine.prototype.defaultValue = function(){
	return 0;
};

EditorLine.prototype.pushSaveDataParams = function(data){
};


EditorLine.prototype.configValue = function(configName,config){
	var elems = configName.split('.');
	config = config || this._config;
	while(elems.length>0 && config){
		var elem = elems.shift();
		config = config[elem];
	}
	return config||this.defaultValue();
};
EditorLine.prototype.defaultValue = function(){
	return 0;
};

EditorLine.prototype.addValue = function(rate){
	if(this._key==='fogIdx')return;

	var unit = Editor.PARAMS_UNIT[this._key]||0.1;
	var value = this.value();

	if(Editor.INT_PARAMS.contains(this._key)){
		value += rate>0 ? 1 : -1;
	}else{
		value += unit*rate;
		value = Math.round(value/unit*10)*unit/10+0.000000001;
	}	
	this.setValue(value);
};

EditorLine.prototype.setValue = function(value){
	if(Math.abs(value)<=0.000001)value = 0;

	if(this._key==='fogIdx'){
		this._inputting = value;
	}else if(Editor.INT_PARAMS.contains(this._key)){
		this._inputting = String(value);
	}else{
		var unit = Editor.PARAMS_UNIT[this._key]||0.1;
		var decimal = TRP_CORE.decimal(unit)+1;
		this._inputting = TRP_CORE.withDecimal(value,decimal);
	}

	var idx = this._editingIndex;
	this._editingIndex = 0;
	this.applyEditing();
	this._editingIndex = idx;
};

EditorLine.MAX_PARTS_WIDTH = 128;
EditorLine.prototype.maxPartsWidth = function(){
	return EditorLine.MAX_PARTS_WIDTH;
};

EditorLine.prototype.createPartsSprite = function(){
	var fontSize = EditorLine.FONT_SIZE;
	var width = this.maxPartsWidth();
	var height = fontSize+4;

	var bitmap = new Bitmap(width,height);
	bitmap.fontSize = fontSize;
	bitmap.outlineColor = 'black';
	bitmap.outlineWidth = 5;
	var sprite = new Sprite(bitmap);

	return sprite;
};

EditorLine.prototype.refreshPartsText = function(sprite,text,i){
	var bitmap = sprite.bitmap;
	bitmap.clear();

	var width = bitmap.width;
	var height = bitmap.height;
	var textWidth = Math.min(width,bitmap.measureTextWidth(text)+2);
	bitmap.textColor = this.partsColor();
	bitmap.drawText(text,1,0,width-2,height);

	sprite._frame.width = textWidth;
	sprite._refresh();
};


EditorLine.prototype.layout = function(){
	if(!this._titleSprite){
		this.createTitleSprite();
	}

	var margin = 5;
	var x;
	var rightAlign = true;

	var title = this._titleSprite;
	if(rightAlign){
		x = Graphics.width-margin;
	}else{
		x = margin;
		title.x = x;
		x += this._titleWidth + margin;
	}
	

	var allParts = this._parts;
	var length = allParts.length;
	if(rightAlign){
		for(var i=length-1; i>=0; i=(i-1)|0){
			var parts = allParts[i];
			parts.visible = !this._hidden;
			if(!parts.visible)continue;

			x -= parts.width;
			parts.x = x;
			x -= margin;
		}
	}else{
		for(var i = 0; i<length; i=(i+1)|0){
			var parts = allParts[i];
			parts.visible = !this._hidden;
			if(!parts.visible)continue;

			parts.x = x;
			x += parts.width + margin;
		}
	}
   
	var title = this._titleSprite;
	if(rightAlign){
		title.x = x;
		this._width = Graphics.width-x + this._titleWidth;
	}else{
		this._width = x-margin;
	}
};

EditorLine.prototype.show = function(){
	if(!this._hidden)return;
	this._hidden = false;
	this.layout();
};
EditorLine.prototype.hide = function(){
	if(this._hidden)return;
	this._hidden = true;
	this.layout();
};


/* edit
===================================*/
EditorLine.prototype.processTouch = function(x,y,margin){
	if(y<this.y)return false;
	if(y>this.y+this._height)return false;

	var rightAlign = true;
	if(rightAlign){
		if(x<Graphics.width-this._width-margin)return false;
	}else{
		if(this._width+margin<x)return false;
	}

	var allParts = this._parts;
	var length = allParts.length;
	for(var i = 0; i<length; i=(i+1)|0){
		var parts = allParts[i];
		if(parts.x<=x && x<=parts.x+parts.width){
			this.setEditing(i);
			return true;
		}
	}
	return true;
};

EditorLine.prototype.startEditing = function(){
	this.setEditing(Math.max(0,this._editingIndex));
};
EditorLine.prototype.setEditing = function(index){
	var parts = this._parts;
	var length = parts.length;
	index = index % length; 
	this._editingIndex = index;
	this.clearInputting();

	for(var i = 0; i<length; i=(i+1)|0){
		parts[i].opacity = i===index ? 255 : 150;
	}
	this.refreshParts();
};
EditorLine.prototype.endEditing = function(){
	var needsRefresh = this._editingIndex>=0;
	this._editingIndex = -1;
	var parts = this._parts;
	var length = parts.length;
	for(var i = 0; i<length; i=(i+1)|0){
		parts[i].opacity = 255;
	}

	if(needsRefresh){
		this.refreshParts();
	}
};

EditorLine.KEY_CODE = {
	backSpace:8,
	tab:9,
	delete:46,
	num:48,
	alphabet:65,
	a:65,
	c:67,
	d:68,
	e:69,
	f:70,
	g:71,
	i:73,
	l:76,
	p:80,
	s:83,
	t:84,
	v:86,
	w:87,
	alphabetEnd: 90,
	tenkey:96,
	minus:189,
	tenkeyMinus:109,
	dot:190,
	tenkeyDot:110,
	at: 192,
	bracket: 219
};
var KEY_CODE = EditorLine.KEY_CODE;

EditorLine.prototype.processInput = function(keyCode,key){
	if(Input.isTriggered('ok')){
		if(this._key==='fogIdx'){
			var input = prompt('fogIdxを入力');
			if(input){
				this._inputting = input;
				this.applyEditing();
			}
		}else{
			this.clearInputting();
		}
	}else if(keyCode===KEY_CODE.backSpace){
		this.clearInputting(true);
		this.applyEditing();
	}else{
		if(this._key==='fogIdx')return true;
		this._processCharacterInput(keyCode,key);
	}

	return true;
};
EditorLine.prototype._processCharacterInput = function(keyCode){
	var numKeyCode = KEY_CODE.num;
	var tenKeyCode = KEY_CODE.tenkey;
	var chara = null;

	if(keyCode>=numKeyCode&&keyCode<numKeyCode+10){
		chara = Number(keyCode-numKeyCode);
	}else if(keyCode>=tenKeyCode&&keyCode<tenKeyCode+10){
		chara = Number(keyCode-tenKeyCode);
	}else if(keyCode===KEY_CODE.minus||keyCode===KEY_CODE.tenkeyMinus){
		chara = '-';
		this._inputting = '';
	}else if(keyCode===KEY_CODE.dot||keyCode===KEY_CODE.tenkeyDot){
		if(!this._inputting.contains('.')){
			chara = '.';
		}
	}
	if(chara!==null){
		this._inputting += chara;
		this.applyEditing();
	}
};



EditorLine.prototype.clearInputting = function(){
	this._inputting = '';
};

EditorLine.prototype.applyEditing = function(){
	var index = this._editingIndex;
	if(index<0)return;

	var value = Number(this._inputting)||0;
	var key = this._key;
	var refreshInputting = true;
	if(key==='scale'||key==='aspectRatio'){
		if(value<=0.1){
			value = 0.1;
		}
		refreshInputting = false;
	}else if(key==='blendMode'){
		value = value.clamp(0,29);
	}else if(key==='image'){
		if(value<=0)value=1;
	}else if(key==='trpTiling'){
		value = value.clamp(0,1);
	}else if(key==='fogIdx'){
		value = this._inputting;
	}else{
		refreshInputting = false;
	}

	if(refreshInputting)this._inputting = String(value);
	this._data[this._key] = value;

	var keys = this._key.split('_');
	var obj = this._data;
	var length = keys.length;
	for(var i=0; i<length; i=(i+1)|0){
		var key = keys[i];
		if(i<length-1){
			obj = obj[key];
		}else{
			obj[key] = value;
		}
	}
	
	if(this.isInvalid()){
		// SoundManager.playBuzzer();
	}else{
		var paramKeys = Object.keys(this._data);
		TRP_CORE.remove(paramKeys,'fogIdx');
		var params = paramKeys.map(key=>this._data[key]);

		this._target.setup(...params);
		this._target._currentParams.fogIdx = this._data.fogIdx;
	}

	this.refreshParts();
};

EditorLine.prototype.valueWithInputting = function(){
	var input = this._inputting;
	var value = Number(this._inputting);
	if(value === NaN){
		value = this.value(this._editingIndex);
		this._inputting = String(value);
	}
	return value;
};

EditorLine.prototype.value = function(){
	return this._data[this._key];
};


})();



})();