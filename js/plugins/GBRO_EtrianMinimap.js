/*:
 * @url https://gbrogames.itch.io/
 * @target MZ
 * @author coffeenahc (GBRO Games)
 * @plugindesc (v.1.0) A minimap plugin inspired by Etrian Odyssey's mapping feature.
 * 
 * @help
 * ======================================================================================
 * 
 * VERSION HISTORY: 
 * - 1.0: Initial release
 * 
 * ======================================================================================
 * 
 * TERMS OF USAGE (As of 10/10/2023):
 * - This is a paid plugin. If you acquired it for free, you are not allowed to
 * use it in any of your games. Purchase the plugin from the url specified in the
 * plugin description (https://gbrogames.itch.io/) if you don't own it.
 * 
 * - You are allowed to make changes to the plugin. Just don't claim that you made
 * the plugin yourself.  
 * 
 * - You are not allowed to redistribute this plugin or resell it as your own, 
 * regardless if you've made changes or not.
 * 
 * - Commercial or Non-commercial use. No attributions required.
 * 
 * - You may edit the code however you want, but any acts with the intention of rebranding 
 * the plugin, such as changing the plugin filename and the comments at the top of the file 
 * that include the plugin description and author information, are forbidden.
 * 
 * - I am open for commissions should you wish to upgrade the plugin or change parts of it 
 * according to your preference. Contact me at the above link, visit my fiverr page 
 * (https://www.fiverr.com/coffee_chan), or dm on discord (Username: coffeenahc).
 * 
 * ======================================================================================
 * 
 * 0.) INITIAL SETUP
 * - Add a folder called 'minimap' in your 'img' folder. All minimap icon commands & slate iamges
 * goes here.
 * - (OPTIONAL) Add a background image for your minimap from the plugin parameters > Minimap > Background 
 * > Image
 * - (NEEDED) Add a mask image for your minimap from the plugin parameters > Minimap > Mask > Image.
 * This will serve as the viewport for your minimap. ie. If you want a circular viewport, then
 * create an image with a solid circle.    
 * - Define the zoom levels from the plugin parameters > Minimap > Zoom Levels. Each zoom level must be separated
 * by a comma. The more zoom levels you define, the more memory is consumed. 
 * - After defining zoom levels, also define the zoom index for when the minimap is minimized. Plugin
 * parameters > Minimap > When Minimized > Zoom Index. Index is 0 based, so putting 0 means you
 * are referencing the 1st zoom level, 1 = 2nd zoom level, etc.
 * - You can use custom background images for the tool window, text display/input windows by changing 
 * their 'BG Types' from 'Windowskin' to 'Custom Image'.
 * 
 * 1.) SETTING UP MINIMAP COMMANDS:
 * 
 * 1a.) DEFAULT COMMANDS
 * 
 * The following are the "default" minimap commands: pen, fill, eraser, text, zoomIn, 
 * zoomOut, moveUp, moveDown, moveLeft, moveRight, play, exit. Default commands have hard
 * coded functions. When creating custom commands (guide below), avoid using the symbols
 * reserved for default commands.
 * 
 * 1b.) CUSTOM COMMANDS
 * 
 * You can create any number of custom minimap commands. Each command can either be an 'action' command 
 * or a 'placeable' command. Action commands start a common event upon invoking the said command. 
 * Placeable commands on the other hand allows you to put 'slates' on the minimap. Slates are
 * whatever you put on the minimap.
 * 
 * Notable command properties:
 * 
 * Symbol
 * - Should be a unique for each command.
 * 
 * Slate Img
 * - Image to used as slates on the minimap. Only for text, moveUp, moveDown, moveLeft,
 * moveRight, and custom placeable commands. 
 * 
 * Visibility Condition
 * - This is a js expression to be evaluated. 
 * - If you want a command to be always visible in the tool window, just leave it as 'true'. 
 * - If you want a command to be visible based on switch #2 for example, you can put '$gameSwitches.value(2)'.
 * 
 * Usability Condition
 * - Also a js expression. This one determines wether the command is enabled or not. 
 * 
 * Type
 * - Explained above.
 * 
 * Z Index
 * - For placeable commands. Determines layer of slate on the minimap. Slates can stack on top of each other as 
 * long as their z indices are different.
 * 
 * CE On Placement
 * - Start a common event upon placing a slate on the minimap
 * 
 * CE On Erase
 * - Start a common event upon erasure of a slate from the minimap
 * 
 * CE On Action
 * - For action commands. Start a common even upon invoking the action command. 
 * 
 * NOTE: You can access the most recently placed slate on the minimap using the following script: $gameTemp.lastSlateAdded.
 * This will be useful in a conditional branch inside a common event that runs when a slate is placed (CE On Placement), to 
 * filter which slate was added and where. 
 * 
 * 1c.) ASSET STANDARD GUIDE
 * 
 * All command icons, minimap icons, & slate images are to be placed in the img/minimap/ folder.
 * 
 * Slate image filenames for the following default commands: text and moveUp/Down/Left/Right are hard coded.
 * Make sure you have the images with the following filenames: textSlate, moveUpSlate, moveDownSlate, moveLeftSlate, 
 * & moveRightSlate in your img/minimap/ folder. This isn't the case for custom placeable commands.
 * 
 * Command icon filenames are hardcoded to be: symbolIcon. So for every command, you should have
 * the corresponding image files in your img/minimap/ named as follows: penIcon, fillIcon, eraserIcon, etc.
 * 
 * 2.) SETTING UP MINIMAP PLAYER & FOLLOWERS
 * 
 * 2a.) Setting up minimap icon.
 * 
 * For player & followers, do so from the Database > Actors. Place the below meta tag on the notes section of an actor:
 * <minimapIcon:filename>
 * - Replace 'filename' with the name of a file in the img/minimap/ folder.
 * 
 * For events, add the following comment on the event's active page:
 * Minimap Icon:filename
 * - Replace filename accordingly
 *
 * NOTE: By default, all minimap icons rotate depending on the game character's direction. To prevent that, either
 * do so from the plugin parameters or you can also set through a script call:
 * 
 * For player & followers
 * $gameActors.actor(actorId).setRotatingMinimapIcon(bool);
 * - Replace 'bool' with either 'true' or 'false' 
 * 
 * For events, add the following comment on the event's active page:
 * No Minimap Icon Rotation
 * 
 * 2b.) Other comments you can add on an event's active page:
 * 
 * Trigger By Slate:symbol
 * - Replace 'symbol' with the symbol of the desired slate.
 * - Makes it so an event is only triggered upon placing the corresponding slate on the minimap tile where the
 * event is located.
 * 
 * Minimap Visibility Distance:distance
 * - Replace 'distance' with a number
 * - Dictates how far this event should be before it starts appearing in the minimap. Default is defined
 * from the plugin parameters.
 * - Only if 'Event Visibility' plugin parameter is set to 'Distance Based'
 * 
 * 3.) USEFUL SCRIPT CALLS
 * 
 * GBRO.EtrianMinimap.hideMinimap();
 * - Hides the minimap
 * - NOTE: You can also add the following meta tag to the notes section of a map to do this by default:
 * <hideMinimap>
 * 
 * GBRO.EtrianMinimap.showMinimap();
 * - Shows the minimap
 * 
 * $gamePlayer.toggleAutoReveal(bool);
 * - Replace 'bool' with either 'true' or 'false'
 * 
 * $gameMap.revealAllTiles(mapId);
 * - (OPTIONAL) 'mapId' is an optional parameter to be replaced with a number. Can be omitted. If omitted, will use 
 * current map. Otherwise, will reference desired mapId.
 * - Reveals all tile in the minimap. 
 * - NOTE: Make sure that $gamePlayer._isAutoRevealing is set to true before using this
 * 
 * NOTE: You can also add the following meta tag to the notes section of a map to do this by default:
 * <revealMinimap>
 * 
 * $gameMap.getSlatesData(mapId, symbol);
 * - (OPTIONAL) Replace 'mapId' with desired mapId
 * - (OPTIONAL) Replace 'symbol' with the desired symbol. This is the same 'symbol' used when creating minimap commands.
 * Supply this parameter if you wish to filter by symbol. Otherwise, omit it to return all slates regardless of symbol.
 * 
 * $gameMap.getSlatesAtXy(x, y, symbol, mapId);
 * - Replace 'x' and 'y' with a number.
 * - (OPTIONAL) 'symbol' and 'mapId'
 * - Returns an array of slates at x and y coordinate.
 * 
 * PROGRAMMATICALLY ADDING SLATES ON THE MINIMAP
 * 
 * The below feature will be useful if you would like to add slates that needs to be removed in order to trigger
 * a common event. 
 * 
 * $gameMap.addMinimapData(type, x, y, options, mapId);
 * - Replace 'type' with either 'pen', 'fill', 'text', 'move', or 'custom'
 * - Replace 'x' and 'y' with a number
 * - 'options' is an object parameter. See guide below: 
 * - NOTE: This is a "silent addition" and won't trigger and common events (CE On Placement).
 * 
 * if 'type' is 'pen', supply an object parameter with the 'quadrant' property to determine the edge of the
 * tile to place the pen draw. 
 * eg.) $gameMap.addMinimapData("pen", 2, 2, {quadrant: "top", color: "#ffffff", zIndex: 3});
 * - Adds a white pen draw on the top edge of tile (2,2);
 * 
 * if 'type' is 'fill', same script call as the above pen, but don't include 'quadrant'.
 * eg.) $gameMap.addMinimapData("fill", 2, 2, {color: "#ffffff", zIndex: 1});
 *
 * if 'type' is 'text', supply the 'text' property.
 * eg.) $gameMap.addMinimapData("text", 2, 2, {text: "text goes here", zIndex: 5});
 * 
 * if 'type' is 'move', supply the 'dir' ("Up", "Down", "Left", or "Right") property.
 * eg.) $gameMap.addMinimapData("move", 2, 2, {dir: "Up", zIndex: 2});
 * 
 * if 'type' is 'custom', supply the 'symbol' & 'slateImg' properties.
 * eg.) $gameMap.addMinimapData("custom", 2, 2, {slateImg: "filename", symbol: "symbol", zIndex: 5});
 * - 'symbol' here is just an identifier. You don't have to create a minimap command with the corresponding
 * symbol when adding a minimap data this way. What matters is the 'slateImg' as that will be the image
 * used for the slate. 
 * 
 * NOTE: 
 * If you want to attach a common event to be played when the added minimap data is erased, you can supply
 * the 'onEraseCe' property like so:
 * 
 * $gameMap.addMinimapData("custom", 2, 2, {slateImg: "bossSlate", symbol: "bossSlate", zIndex: 5, onEraseCe: 2});
 * - When this slate is removed using the 'Erase' command from the minimap tool window, common event #2 will play.
 * 
 * We can further refine the above minimap data by making it so the slate can only be removed if switch #X is ON by
 * adding the 'eraseSwitch' property like so:
 * 
 * $gameMap.addMinimapData("custom", 2, 2, {slateImg: "bossSlate", symbol: "bossSlate", zIndex: 5, onEraseCe: 2, eraseSwitch: 4});
 * - Unless switch #4 is ON, then this slate can't be erased.
 * 
 * NOTE: The most recently erased slate can be referenced with: $gameTemp.lastSlateRemoved.
 * 
 * All slates added on the minimap have a 'key' which identifies them uniquely. These are generated automatically
 * unless explicitly defined. If you would like to filter the recently erased slate for eventing purposes, you can
 * pass a 'key' property when adding a minimap data programmaticaly like so:
 * 
 * $gameMap.addMinimapData("custom", 2, 2, {slateImg: "bossSlate", symbol: "bossSlate", zIndex: 5, onEraseCe: 2, eraseSwitch: 4, key: "dragonSlate"});
 * 
 * This can be useful if you have multiple added slates with the same 'onEraseCe', and you would like to filter out which slate was recently removed.
 * Using the same exammple above which fires up common event #2, you can have a conditional branch > script > and check like so:
 * 
 * If : Script : $gameTemp.lastSlateRemoved && $gameTemp.lastSlateRemoved.key === "dragonSlate"
 * //Do something
 * End
 * 
 * ======================================================================================
 * 
 * @param minimap
 * @text Minimap
 * 
 * @param toggleMinimapKey
 * @text Toggle Minimap Key
 * @desc Put keyboard key code (https://www.toptal.com/developers/keycode/table)
 * @default 77
 * @parent minimap
 * 
 * @param eventBehavior
 * @text Event Behavior
 * @parent minimap
 * 
 * @param eventVisibility
 * @type combo
 * @text Event Visibility
 * @default Always Visible
 * @option Always Visible
 * @option Distance Based
 * @parent eventBehavior
 * @desc Dictates visiiblity of event icons on the minimap. 'Distance Based' measures distance b/n event & player.
 * 
 * @param evDistanceReq
 * @text Distance Required
 * @parent eventVisibility
 * @default 10
 * @desc Only if 'Event Visibility' is 'Distance Based'
 * 
 * @param autoRotate
 * @text Auto Rotate Minimap Icons?
 * @default true
 * @type boolean
 * @parent minimap
 * @desc Wether or not the icons will rotate depending on the character's direction
 * 
 * @param regionColorMap
 * @text Region Color Mapping
 * @type text[]
 * @desc Define how region ids are mapped to their respective colors. In the form of: regionId,color
 * @default ["0,#475c66"] 
 * @parent minimap
 * 
 * @param defaultTileSize
 * @text Default Tile Size
 * @default 30
 * @type Number
 * @parent minimap
 * @desc Size of each tile of the minimap
 * 
 * @param zoomLevels
 * @text Zoom Levels
 * @default 1,2,3
 * @desc Separate each zoom level with a comma. Whole numbers only (no decimals). More zoom levels = less performant.
 * @parent minimap
 * 
 * @param autoReveal
 * @text Auto Reveal?
 * @type boolean 
 * @default true
 * @desc Auto reveal tiles as player walks
 * @parent minimap
 * 
 * @param revealMode
 * @text Reveal Mode
 * @type combo
 * @default cross
 * @option cross
 * @option front
 * @option square
 * @option single
 * @parent autoReveal
 * @desc Only if Auto Reveal is true
 * 
 * @param displayInBattle
 * @text Display In Battle?
 * @type boolean
 * @default true
 * @parent minimap
 * 
 * @param background
 * @text Background
 * @parent minimap
 * 
 * @param backImg
 * @text Image
 * @type file
 * @dir img/minimap/
 * @parent background
 * @desc Custom image to use as background of the minimap
 * 
 * @param backOffset
 * @text Offset
 * @type text
 * @default 0,0
 * @desc In the form of: x,y
 * @parent background
 * 
 * @param mask
 * @text Mask
 * @parent minimap
 * 
 * @param maskImg
 * @text Image
 * @type file
 * @dir img/minimap/
 * @parent mask
 * @desc White filled image defining the viewable area of the minimap
 * 
 * @param maskOffset
 * @text Offset
 * @type text
 * @default 0,0
 * @desc In the form of: x,y
 * @parent mask
 * 
 * @param minimized
 * @text When Minimized
 * @parent minimap
 * 
 * @param minZoomIndex
 * @text Zoom Index
 * @default 2
 * @desc 0 = 1st zoom level, 1 = 2nd zoom level, 2 = 3rd zoom level, etc.
 * @parent minimized
 * 
 * @param minRect
 * @text Rect
 * @default 50,50,0.2
 * @desc In the form of: x,y,scale (separate by comma). Position and scale of minimap changes accordingly when minimized.
 * @parent minimized
 * 
 * @param maximized
 * @text When Maximized
 * @parent minimap
 * 
 * @param maxRect
 * @text Rect
 * @default 264,56,600,600
 * @desc In the form of: x,y,width,height (separate by comma)
 * @parent maximized
 * 
 * @param toolWindow
 * @text Tool Window
 * 
 * @param twDisabled
 * @text Disabled?
 * @type boolean
 * @default false
 * @parent toolWindow
 * @desc If true, will act as a regular view only minimap.
 * 
 * @param commands
 * @text Minimap Commands
 * @type struct<MinimapCommands>[]
 * @default ["{\"symbol\":\"pen\",\"label\":\"Pen\",\"slateImg\":\"\",\"visibleEval\":\"true\",\"usableEval\":\"true\",\"type\":\"placeable\",\"zIndex\":\"3\",\"ceOnPlace\":\"0\",\"ceOnErase\":\"0\",\"ceOnAction\":\"0\"}","{\"symbol\":\"fill\",\"label\":\"Fill\",\"slateImg\":\"\",\"visibleEval\":\"true\",\"usableEval\":\"true\",\"type\":\"placeable\",\"zIndex\":\"1\",\"ceOnPlace\":\"0\",\"ceOnErase\":\"0\",\"ceOnAction\":\"0\"}","{\"symbol\":\"eraser\",\"label\":\"Eraser\",\"slateImg\":\"\",\"visibleEval\":\"true\",\"usableEval\":\"true\",\"type\":\"action\",\"zIndex\":\"1\",\"ceOnPlace\":\"0\",\"ceOnErase\":\"0\",\"ceOnAction\":\"0\"}","{\"symbol\":\"text\",\"label\":\"Text\",\"slateImg\":\"textSlate\",\"visibleEval\":\"true\",\"usableEval\":\"true\",\"type\":\"placeable\",\"zIndex\":\"5\",\"ceOnPlace\":\"0\",\"ceOnErase\":\"0\",\"ceOnAction\":\"0\"}","{\"symbol\":\"zoomIn\",\"label\":\"Zoom In\",\"slateImg\":\"\",\"visibleEval\":\"true\",\"usableEval\":\"true\",\"type\":\"action\",\"zIndex\":\"1\",\"ceOnPlace\":\"0\",\"ceOnErase\":\"0\",\"ceOnAction\":\"0\"}","{\"symbol\":\"zoomOut\",\"label\":\"Zoom Out\",\"slateImg\":\"\",\"visibleEval\":\"true\",\"usableEval\":\"true\",\"type\":\"action\",\"zIndex\":\"1\",\"ceOnPlace\":\"0\",\"ceOnErase\":\"0\",\"ceOnAction\":\"0\"}","{\"symbol\":\"moveUp\",\"label\":\"Up\",\"slateImg\":\"moveUpSlate\",\"visibleEval\":\"true\",\"usableEval\":\"true\",\"type\":\"placeable\",\"zIndex\":\"2\",\"ceOnPlace\":\"0\",\"ceOnErase\":\"0\",\"ceOnAction\":\"0\"}","{\"symbol\":\"moveDown\",\"label\":\"Down\",\"slateImg\":\"moveDownSlate\",\"visibleEval\":\"true\",\"usableEval\":\"true\",\"type\":\"placeable\",\"zIndex\":\"2\",\"ceOnPlace\":\"0\",\"ceOnErase\":\"0\",\"ceOnAction\":\"0\"}","{\"symbol\":\"moveLeft\",\"label\":\"Left\",\"slateImg\":\"moveLeftSlate\",\"visibleEval\":\"true\",\"usableEval\":\"true\",\"type\":\"placeable\",\"zIndex\":\"2\",\"ceOnPlace\":\"0\",\"ceOnErase\":\"0\",\"ceOnAction\":\"0\"}","{\"symbol\":\"moveRight\",\"label\":\"Right\",\"slateImg\":\"moveRightSlate\",\"visibleEval\":\"true\",\"usableEval\":\"true\",\"type\":\"placeable\",\"zIndex\":\"2\",\"ceOnPlace\":\"0\",\"ceOnErase\":\"0\",\"ceOnAction\":\"0\"}","{\"symbol\":\"play\",\"label\":\"Play\",\"slateImg\":\"\",\"visibleEval\":\"true\",\"usableEval\":\"true\",\"type\":\"action\",\"zIndex\":\"1\",\"ceOnPlace\":\"0\",\"ceOnErase\":\"0\",\"ceOnAction\":\"0\"}","{\"symbol\":\"exit\",\"label\":\"Exit\",\"slateImg\":\"\",\"visibleEval\":\"true\",\"usableEval\":\"true\",\"type\":\"action\",\"zIndex\":\"1\",\"ceOnPlace\":\"0\",\"ceOnErase\":\"0\",\"ceOnAction\":\"0\"}"]
 * @parent toolWindow
 * 
 * @param defCommands
 * @text Default Commands
 * @parent toolWindow
 * 
 * @param penColor
 * @text Pen Color
 * @default #ffffff
 * @desc Default color for the pen command
 * @parent defCommands
 * 
 * @param fillColor
 * @text Fill Color
 * @default #a9bffc
 * @desc Default color for the fill command
 * @parent defCommands
 * 
 * @param autoMoveSpd
 * @text Auto Move Speed
 * @default 6
 * @desc Player's move speed when auto routing using move slates
 * @parent defCommands 
 * 
 * @param twRect
 * @text Rect
 * @default 804,126,144,480
 * @desc In the form of: x,y,width,height (separate by comma)
 * @parent toolWindow
 * 
 * @param twCols
 * @text Num Cols
 * @desc Number of columns
 * @default 2
 * @parent toolWindow
 * 
 * @param twFrameVisible
 * @text Frame Visible?
 * @type boolean
 * @default true
 * @parent toolWindow
 * 
 * @param twDrawItemBg
 * @text Draw Item Bg?
 * @type boolean
 * @default true
 * @parent toolWindow
 * 
 * @param twDrawLabel
 * @text Draw Label?
 * @type boolean
 * @default true
 * @parent toolWindow
 * 
 * @param twBgType
 * @text Bg Type
 * @type combo
 * @default Windowskin
 * @option Windowskin
 * @option Custom Image
 * @parent toolWindow
 * @desc Can use default windowskin or a custom image for tool window's background
 * 
 * @param twBgCustom
 * @text If Custom Image
 * @parent twBgType
 * 
 * @param twBgCustomImg
 * @text Image
 * @type file
 * @parent twBgCustom
 * @dir img/system/
 * 
 * @param twBgCustomOffset
 * @text Offset
 * @type text
 * @parent twBgCustom
 * @default 0,0
 * @desc Offset the background by x,y values
 * 
 * @param tdWindow
 * @text Text Display Window
 * 
 * @param tdMaxChars
 * @type Number
 * @default 50
 * @text Max Chars
 * @desc Maximum number of characters allowed
 * @parent tdWindow
 * 
 * @param tdRect
 * @text Rect
 * @default 324,176,480,150
 * @parent tdWindow
 * @desc In the form of: x,y,width,height (separate by comma)
 * 
 * @param tdFrameVisible
 * @text Frame Visible?
 * @type boolean
 * @default true
 * @parent tdWindow
 * 
 * @param tdBgType
 * @text Bg Type
 * @type combo
 * @default Windowskin
 * @option Windowskin
 * @option Custom Image
 * @parent tdWindow
 * @desc Can use default windowskin or a custom image for tool window's background
 * 
 * @param tdBgCustom
 * @text If Custom Image
 * @parent tdBgType
 * 
 * @param tdBgCustomImg
 * @text Image
 * @type file
 * @parent tdBgCustom
 * @dir img/system/
 * 
 * @param tdBgCustomOffset
 * @text Offset
 * @type text
 * @parent tdBgCustom
 * @default 0,0
 * @desc Offset the background by x,y values
 *  
 * @param tiWindow
 * @text Text Input Window
 * 
 * @param tiRect
 * @text Rect
 * @default 324,326,480,240
 * @parent tiWindow
 * @desc In the form of: x,y,width,height (separate by comma)
 * 
 * @param tiFrameVisible
 * @text Frame Visible?
 * @type boolean
 * @default true
 * @parent tiWindow
 * 
 * @param tiBgType
 * @text Bg Type
 * @type combo
 * @default Windowskin
 * @option Windowskin
 * @option Custom Image
 * @parent tiWindow
 * @desc Can use default windowskin or a custom image for tool window's background
 * 
 * @param tiBgCustom
 * @text If Custom Image
 * @parent tiBgType
 * 
 * @param tiBgCustomImg
 * @text Image
 * @type file
 * @parent tiBgCustom
 * @dir img/system/
 * 
 * @param tiBgCustomOffset
 * @text Offset
 * @type text
 * @parent tiBgCustom
 * @default 0,0
 * @desc Offset the background by x,y values
 * 
 */

/*~struct~MinimapCommands:
 * @param symbol
 * @text Symbol
 * @type text
 * @desc Unique identifier for this command. Do not use default command symbols as seen in the help section.
 * 
 * @param label
 * @text Label
 * @type text
 * 
 * @param slateImg
 * @text Slate Img
 * @desc Image to use for this command's slate on the minimap. Only for custom 'placeable' commands.
 * @type file
 * @dir img/minimap/
 * 
 * @param visibleEval
 * @text Visibility Condition
 * @type text
 * @desc JS expression to be evaluated. Determines command visibility. true = always visible.
 * @default true
 * 
 * @param usableEval
 * @text Usability Condition
 * @type text
 * @desc JS expression to be evaluated. Determines command usability. true = always usable.
 * @default true
 * 
 * @param type
 * @type combo
 * @default action
 * @option action
 * @option placeable
 * @text Type
 * @desc Action = run a common event upon command click. Placeable = place a slate on the minimap.
 * 
 * @param placeable
 * @text If Placeable
 * 
 * @param zIndex
 * @text Z Index
 * @type Number
 * @default 1
 * @parent placeable
 * @desc Determines layer order. Slates w/ higher z are on top of those with lower z's.
 * 
 * @param ceOnPlace
 * @text CE On Placement
 * @desc Common event to run upon placement of this slate on the minimap. 0 = don't run a common event.
 * @type common_event
 * @default 0
 * @parent placeable
 * 
 * @param ceOnErase
 * @text CE On Erase
 * @desc Common event to run when this slate is erased from the minimap. 0 = don't run a common event.
 * @type common_event
 * @default 0
 * @parent placeable
 * 
 * @param action
 * @text If Action
 * 
 * @param ceOnAction
 * @text CE On Action
 * @desc Common event to run upon clicking of this command. 0 = don't run a common event.
 * @type common_event
 * @default 0
 * @parent action
 */

var GBRO = GBRO || {}
GBRO.EtrianMinimap = {
    toggleMinimapKey: Number(PluginManager.parameters("GBRO_EtrianMinimap")["toggleMinimapKey"]),

    eventVisibility: PluginManager.parameters("GBRO_EtrianMinimap")["eventVisibility"],
    evDistanceReq: Number(PluginManager.parameters("GBRO_EtrianMinimap")["evDistanceReq"]),

    autoRotate: PluginManager.parameters("GBRO_EtrianMinimap")["autoRotate"] === "true",
    regionColorMap: {},
    defaultTileSize: Number(PluginManager.parameters("GBRO_EtrianMinimap")["defaultTileSize"]),
    zoomLevels: PluginManager.parameters("GBRO_EtrianMinimap")["zoomLevels"].split(",").map(i => Math.floor(Number(i))),
    autoReveal: PluginManager.parameters("GBRO_EtrianMinimap")["autoReveal"] === "true",
    revealMode: PluginManager.parameters("GBRO_EtrianMinimap")["revealMode"],
    displayInBattle: PluginManager.parameters("GBRO_EtrianMinimap")["displayInBattle"] === "true",

    backImg: PluginManager.parameters("GBRO_EtrianMinimap")["backImg"],
    backOffset: PluginManager.parameters("GBRO_EtrianMinimap")["backOffset"].split(",").map(i => Number(i)),
    maskImg: PluginManager.parameters("GBRO_EtrianMinimap")["maskImg"],
    maskOffset: PluginManager.parameters("GBRO_EtrianMinimap")["maskOffset"].split(",").map(i => Number(i)),

    minZoomIndex: Number(PluginManager.parameters("GBRO_EtrianMinimap")["minZoomIndex"]),
    minRect: PluginManager.parameters("GBRO_EtrianMinimap")["minRect"].split(",").map(i => Number(i)),
    maxRect: PluginManager.parameters("GBRO_EtrianMinimap")["maxRect"].split(",").map(i => Number(i)),

    commands: JSON.parse(PluginManager.parameters("GBRO_EtrianMinimap")["commands"]).map(o => JSON.parse(o)),
    penColor: PluginManager.parameters("GBRO_EtrianMinimap")["penColor"],
    fillColor: PluginManager.parameters("GBRO_EtrianMinimap")["fillColor"],
    autoMoveSpd: Number(PluginManager.parameters("GBRO_EtrianMinimap")["autoMoveSpd"]),

    twDisabled: PluginManager.parameters("GBRO_EtrianMinimap")["twDisabled"] === "true",
    twRect: PluginManager.parameters("GBRO_EtrianMinimap")["twRect"].split(",").map(i => Number(i)),
    twCols: Number(PluginManager.parameters("GBRO_EtrianMinimap")["twCols"]),
    twFrameVisible: PluginManager.parameters("GBRO_EtrianMinimap")["twFrameVisible"] === "true",
    twDrawItemBg: PluginManager.parameters("GBRO_EtrianMinimap")["twDrawItemBg"] === "true",
    twDrawLabel: PluginManager.parameters("GBRO_EtrianMinimap")["twDrawLabel"] === "true",
    twBgType: PluginManager.parameters("GBRO_EtrianMinimap")["twBgType"],
    twBgCustomImg: PluginManager.parameters("GBRO_EtrianMinimap")["twBgCustomImg"],
    twBgCustomOffset: PluginManager.parameters("GBRO_EtrianMinimap")["twBgCustomOffset"].split(",").map(i => Number(i)),

    tdMaxChars: Number(PluginManager.parameters("GBRO_EtrianMinimap")["tdMaxChars"]),
    tdRect: PluginManager.parameters("GBRO_EtrianMinimap")["tdRect"].split(",").map(i => Number(i)),
    tdFrameVisible: PluginManager.parameters("GBRO_EtrianMinimap")["tdFrameVisible"] === "true",
    tdBgType: PluginManager.parameters("GBRO_EtrianMinimap")["tdBgType"],
    tdBgCustomImg: PluginManager.parameters("GBRO_EtrianMinimap")["tdBgCustomImg"],
    tdBgCustomOffset: PluginManager.parameters("GBRO_EtrianMinimap")["tdBgCustomOffset"].split(",").map(i => Number(i)),

    tiRect: PluginManager.parameters("GBRO_EtrianMinimap")["tiRect"].split(",").map(i => Number(i)),
    tiFrameVisible: PluginManager.parameters("GBRO_EtrianMinimap")["tiFrameVisible"] === "true",
    tiBgType: PluginManager.parameters("GBRO_EtrianMinimap")["tiBgType"],
    tiBgCustomImg: PluginManager.parameters("GBRO_EtrianMinimap")["tiBgCustomImg"],
    tiBgCustomOffset: PluginManager.parameters("GBRO_EtrianMinimap")["tiBgCustomOffset"].split(",").map(i => Number(i)),
};

JSON.parse(PluginManager.parameters("GBRO_EtrianMinimap")["regionColorMap"]).forEach(s => {
    const p = s.split(",");
    GBRO.EtrianMinimap.regionColorMap[p[0]] = p[1];
});

// 小地图显隐：只作用于当前场景，无持久标记。默认隐藏由 createMinimap 决定，
//   显隐由玩家逻辑(如装备道具，每次进图自检)自行调用。isMinimapVisible 直接读实时可见性。
GBRO.EtrianMinimap.isMinimapVisible = function () {
    const scene = SceneManager._scene;
    return !!(scene && scene._minimap && scene._minimap.visible);
};

GBRO.EtrianMinimap.hideMinimap = function () {
    const scene = SceneManager._scene;
    if ((scene instanceof Scene_Map || scene instanceof Scene_Battle) && scene._minimap) {
        scene._minimap.hide();
        scene._mBg.hide();
    }
};

GBRO.EtrianMinimap.showMinimap = function () {
    const scene = SceneManager._scene;
    if ((scene instanceof Scene_Map || scene instanceof Scene_Battle) && scene._minimap) {
        scene._minimap.show();
        scene._mBg.show();
        // 隐藏期间跳过了更新，显示时立刻重新对齐玩家并重建可见瓦片(瓦片再按揭示版本号自刷新)
        if (scene._minimap.centerOnPlayer) scene._minimap.centerOnPlayer();
    }
};

GBRO.EtrianMinimap.toggleMinimap = function () {
    if (GBRO.EtrianMinimap.isMinimapVisible()) GBRO.EtrianMinimap.hideMinimap();
    else GBRO.EtrianMinimap.showMinimap();
};

ImageManager.loadMinimap = function (filename) {
    return this.loadBitmap("img/minimap/", filename);
};

let gbro_etrianminimap_gametemp_setdestination = Game_Temp.prototype.setDestination;
Game_Temp.prototype.setDestination = function () {
    gbro_etrianminimap_gametemp_setdestination.call(this, ...arguments);
    $gamePlayer.toggleAutoRouting(false);
};

let gbro_etrianminimap_gameparty_onbattlestart = Game_Party.prototype.onBattleStart;
Game_Party.prototype.onBattleStart = function () {
    gbro_etrianminimap_gameparty_onbattlestart.call(this, ...arguments);
    $gamePlayer._isAutoRouting = false;
};

let gbro_etrianminimap_gameactor_initialize = Game_Actor.prototype.initialize;
Game_Actor.prototype.initialize = function () {
    gbro_etrianminimap_gameactor_initialize.call(this, ...arguments);

    const dataActor = $dataActors[this.actorId()];
    this._minimapIcon = dataActor ? dataActor.meta.minimapIcon : "";
    this._rotatingMinimapIcon = GBRO.EtrianMinimap.autoRotate;
};

Game_Actor.prototype.setMinimapIcon = function (filename) {
    this._minimapIcon = filename;
};

Game_Actor.prototype.setRotatingMinimapIcon = function (b) {
    this._rotatingMinimapIcon = b;
};

let gbro_etrianminimap_gamecharacter_initialize = Game_Character.prototype.initialize;
Game_Character.prototype.initialize = function () {
    gbro_etrianminimap_gamecharacter_initialize.call(this);
    this._minimapIcon = null;
    this._minimapVisible = true;
    this._rotatingMinimapIcon = true;
};

Game_Character.prototype.setRotatingMinimapIcon = function (b) {
    this._rotatingMinimapIcon = b;
};

Game_Character.prototype.setMinimapIcon = function (filename) {
    this._minimapIcon = filename;
};

Game_Character.prototype.clearMinimapIcon = function () {
    this._minimapIcon = null;
};

Game_Character.prototype.minimapIcon = function () {
    return this._minimapIcon;
};

Game_Character.prototype.isVisibleInMinimap = function () {
    return this._minimapVisible;
};

Game_Character.prototype.isMinimapIconRotating = function () {
    return this._rotatingMinimapIcon;
};

let gbro_etrianminimap_gameplayer_initialize = Game_Player.prototype.initialize;
Game_Player.prototype.initialize = function () {
    gbro_etrianminimap_gameplayer_initialize.call(this);
    this._isAutoRouting = false;
    this._isAutoRevealing = GBRO.EtrianMinimap.autoReveal;
    this._isAutoFilling = GBRO.EtrianMinimap.autoReveal;
    this._tileRevealMode = GBRO.EtrianMinimap.revealMode;
    this.setMinimapIcon("arrow");
};

let gbro_etrianminimap_gameplayer_movebyinput = Game_Player.prototype.moveByInput;
Game_Player.prototype.moveByInput = function () {
    const scene = SceneManager._scene;

    if (scene._minimap && scene._minimap._maximized && !GBRO.EtrianMinimap.twDisabled) return;

    if (this.getInputDirection() > 0) {
        this.toggleAutoRouting(false);
    }
    gbro_etrianminimap_gameplayer_movebyinput.call(this);
};

let gbro_etrianminimap_gameplayer_update = Game_Player.prototype.update;
Game_Player.prototype.update = function () {
    gbro_etrianminimap_gameplayer_update.call(this, ...arguments);
    this.updateAutoRouting();

    const scene = SceneManager._scene;
    if (scene instanceof Scene_Map && scene._minimap && scene._minimap.visible && !scene._minimap._maximized) {
        scene._minimap.centerOnPlayer();
    }
};

Game_Player.prototype.updateAutoRouting = function () {
    if (!this._isAutoRouting) return;

    const scene = SceneManager._scene;
    if (!(scene instanceof Scene_Map)) return;

    const tw = scene._mToolWindow;

    const minimapData = $gameMap.getMinimapData();
    if (!minimapData) {
        this._isAutoRouting = false;
        if (tw) tw.refresh();
        return;
    }

    const moveSlate = Object.values(minimapData.moves).filter(s => s !== null).find(s => s.x === $gamePlayer.x && s.y === $gamePlayer.y);
    if (!moveSlate) {
        this._isAutoRouting = false;
        if (tw) tw.refresh();
        return;
    }

    if (this.isMoving()) return;

    if (moveSlate.dir === "Down") {
        this.moveStraight(2);
    } else if (moveSlate.dir === "Up") {
        this.moveStraight(8);
    } else if (moveSlate.dir === "Right") {
        this.moveStraight(6);
    } else if (moveSlate.dir === "Left") {
        this.moveStraight(4);
    } else {
        this._isAutoRouting = false;
        if (tw) tw.refresh();
    }
};

Game_Player.prototype.toggleAutoRouting = function (b) {
    if (b != null) this._isAutoRouting = b;
    else this._isAutoRouting = !this._isAutoRouting;
};

Game_Player.prototype.toggleAutoReveal = function (b) {
    if (b != null) {
        this._isAutoRevealing = b;
        this._isAutoFilling = b;
    } else {
        this._isAutoRevealing = !this._isAutoRevealing;
        this._isAutoFilling = this._isAutoRevealing;
    }
};

Game_Player.prototype.updateTileReveal = function () {
    // 小地图不可见时禁用探索点亮（随小地图的启用/禁用一起开关）
    if (!GBRO.EtrianMinimap.isMinimapVisible()) return;
    if (this._tileRevealMode === "front") {
        this.revealFrontTile();
    } else if (this._tileRevealMode === "cross") {
        this.revealCrossTile();
    } else if (this._tileRevealMode === "square") {
        this.revealSquareTile();
    } else if (this._tileRevealMode === "single") {
        this.revealCurTile();
    }
    // 性能优化：揭示版本号 +1，通知瓦片精灵"有新揭示需刷新"（配合 Sprite_EtrianMinimapTile.updateTile 的门控）
    $gameMap._drill_minimapRevealVer = ($gameMap._drill_minimapRevealVer || 0) + 1;
};

let gbro_etrianminimap_gameplayer_locate = Game_Player.prototype.locate;
Game_Player.prototype.locate = function () {
    gbro_etrianminimap_gameplayer_locate.call(this, ...arguments);
    this.updateTileReveal();
};

let gbro_etrianminimap_gameplayer_movestraight = Game_Player.prototype.moveStraight;
Game_Player.prototype.moveStraight = function () {
    gbro_etrianminimap_gameplayer_movestraight.call(this, ...arguments);
    this.updateTileReveal();
};

let gbro_etrianminimap_gameplayer_movediagonally = Game_Player.prototype.moveDiagonally;
Game_Player.prototype.moveDiagonally = function () {
    gbro_etrianminimap_gameplayer_movediagonally.call(this, ...arguments);
    this.updateTileReveal();
};

Game_Player.prototype.revealFrontTile = function () {
    const x = this.x;
    const y = this.y;
    const d = this.direction();

    const current = $gameMap.getTileData(x, y);
    if (current) {
        current.revealed = true;
        if (this._isAutoFilling) current.filled = true;
    }

    const tx = $gameMap.roundXWithDirection(x, d);
    const ty = $gameMap.roundYWithDirection(y, d);
    const tile = $gameMap.getTileData(tx, ty);
    if (tile) {
        tile.revealed = true;
        if (this._isAutoFilling) tile.filled = true;
    }
};

Game_Player.prototype.revealCrossTile = function () {
    const x = this.x;
    const y = this.y;

    const current = $gameMap.getTileData(x, y);
    if (current) {
        current.revealed = true;
        if (this._isAutoFilling) current.filled = true;
    }

    const dirs = [2, 4, 6, 8];

    for (const d of dirs) {
        const tx = $gameMap.roundXWithDirection(x, d);
        const ty = $gameMap.roundYWithDirection(y, d);
        const tile = $gameMap.getTileData(tx, ty);
        if (tile) {
            tile.revealed = true;
             if (this._isAutoFilling) tile.filled = true;
        }
    }
};

Game_Player.prototype.revealSquareTile = function () {
    const x = this.x;
    const y = this.y;

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const tx = $gameMap.roundX(x + dx);
            const ty = $gameMap.roundY(y + dy);
            const tile = $gameMap.getTileData(tx, ty);
            if (tile) {
                tile.revealed = true;
                if (this._isAutoFilling) tile.filled = true;
            }
        }
    }
};

Game_Player.prototype.revealCurTile = function () {
    const x = this.x;
    const y = this.y;

    const tile = $gameMap.getTileData(x, y);
    if (tile) {
        tile.revealed = true;
        if (this._isAutoFilling) tile.filled = true;
    }
};

Game_Player.prototype.startMapEvent = function (x, y, triggers, normal) {
    if (!$gameMap.isEventRunning()) {
        for (const event of $gameMap.eventsXy(x, y)) {
            if (
                event.isTriggerIn(triggers) &&
                event.isNormalPriority() === normal
            ) {
                event.start();
            }
        }
    }
};

let gbro_etrianminimap_gameplayer_canmove = Game_Player.prototype.canMove;
Game_Player.prototype.canMove = function () {
    const scene = SceneManager._scene;
    const isTwActive = scene !== null && scene instanceof Scene_Map && (GBRO.EtrianMinimap.twDisabled ? false : scene._mToolWindow.active);
    return gbro_etrianminimap_gameplayer_canmove.call(this) && !isTwActive;
};

let gbro_etrianminimap_gameplayer_realmovespeed = Game_Player.prototype.realMoveSpeed;
Game_Player.prototype.realMoveSpeed = function () {
    if (this._isAutoRouting) return GBRO.EtrianMinimap.autoMoveSpd;
    return gbro_etrianminimap_gameplayer_realmovespeed.call(this);
};

Game_Player.prototype.minimapIcon = function () {
    return $gameParty.leader()._minimapIcon;
};

Game_Player.prototype.isMinimapIconRotating = function () {
    return $gameParty.leader()._rotatingMinimapIcon;
};

let gbro_etrianminimap_gamefollower_initialize = Game_Follower.prototype.initialize;
Game_Follower.prototype.initialize = function (memberIndex) {
    gbro_etrianminimap_gamefollower_initialize.call(this, memberIndex);
    this.setMinimapIcon("arrow");
};

Game_Follower.prototype.minimapIcon = function () {
    return this.actor() ? this.actor()._minimapIcon : "";
};

Game_Follower.prototype.isMinimapIconRotating = function () {
    return this.actor() ? this.actor()._rotatingMinimapIcon : true;
};

let gbro_etrianminimap_gameevent_setuppage = Game_Event.prototype.setupPage;
Game_Event.prototype.setupPage = function () {
    gbro_etrianminimap_gameevent_setuppage.call(this);
    this.clearMinimapMembers();

    const page = this.page();
    if (page) {
        page.list.forEach(l => {
            if (l.code == 108) {
                const comment = l.parameters[0];
                if (comment.includes("Minimap Icon")) {
                    const filename = comment.split(":")[1];
                    this.setMinimapIcon(filename);
                } else if (comment.includes("Trigger By Slate")) {
                    const symbol = comment.split(":")[1];
                    this._trigger = `slate_${symbol}`;
                    this._interpreter = null;
                } else if (comment.includes("Minimap Visibility Distance")) {
                    const distance = Number(comment.split(":")[1]);
                    this._minimapDistanceReq = distance;
                } else if (comment.includes("No Minimap Icon Rotation")) {
                    this._rotatingMinimapIcon = false;
                }
            }
        })
    }
};

Game_Event.prototype.clearMinimapMembers = function () {
    this._minimapVisible = true;
    this._minimapDistanceReq = GBRO.EtrianMinimap.evDistanceReq;
    this._rotatingMinimapIcon = GBRO.EtrianMinimap.autoRotate;
    this.clearMinimapIcon();
};

Game_Event.prototype.isVisibleInMinimap = function () {
    const isDistanceOk = GBRO.EtrianMinimap.eventVisibility === "Distance Based" ?
        ($gameMap.distance($gamePlayer.x, $gamePlayer.y, this.x, this.y) <= this._minimapDistanceReq) : true;
    return Game_Character.prototype.isVisibleInMinimap.call(this) && isDistanceOk;
};

Game_Event.prototype.isSlateTriggered = function () {
    return this._trigger.includes("slate_");
};

let gbro_etrianminimap_gamemap_setup = Game_Map.prototype.setup;
Game_Map.prototype.setup = function (mapId) {
    gbro_etrianminimap_gamemap_setup.call(this, mapId);
    if (!this._minimapData) this._minimapData = {};
    if (!this._minimapData[mapId]) {
        this._minimapData[mapId] = this.createMinimapData(mapId);
    }
};

Game_Map.prototype.createMinimapData = function (mapId) {
    if (!this._minimapData) this._minimapData = {};
    this._minimapData[mapId] = {
        tiles: {},
        penDraws: {},
        fills: {},
        texts: {},
        moves: {},
        customs: {}
    };
    return this._minimapData[mapId];
};

Game_Map.prototype.addMinimapData = function (type, x, y, options = {}, mapId = this.mapId()) {
    const data = this.getMinimapData(mapId);
    if (!data) return null;

    const {
        key = null,
        zIndex = 1,
        quadrant = null,
        color = null,
        dir = null,
        slateImg = null,
        text = "",
        onAddCe = 0,
        onEraseCe = 0,
        eraseSwitch = 0,
        symbol = ""
    } = options;

    let finalKey = key;
    const finalColor = color || GBRO.EtrianMinimap.penColor || "#ffffff";

    if (type === "pen") {
        if (!quadrant) return null;

        const edge = this.getSharedEdgeKey(x, y, quadrant);
        finalKey = finalKey || edge.key;

        if (data.penDraws[finalKey]) return null;

        data.penDraws[finalKey] = {
            x,
            y,
            quadrant,
            key: finalKey,
            zIndex,
            color,
            mapId,
            type,
        };

    } else if (type === "fill") {
        finalKey = finalKey || `${x}_${y}`;

        data.fills[finalKey] = {
            x,
            y,
            key: finalKey,
            zIndex,
            color,
            onAddCe, onEraseCe,
            mapId,
            type,
            eraseSwitch
        };

    } else if (type === "text") {
        finalKey = finalKey || `${x}_${y}`;

        data.texts[finalKey] = {
            x,
            y,
            key: finalKey,
            zIndex,
            text,
            onAddCe, onEraseCe,
            mapId,
            type,
            eraseSwitch
        };

    } else if (type === "move") {
        finalKey = finalKey || `${x}_${y}`;

        data.moves[finalKey] = {
            x,
            y,
            key: finalKey,
            zIndex,
            dir,
            onAddCe, onEraseCe,
            mapId,
            type,
            eraseSwitch
        };

    } else if (type === "custom") {
        finalKey = finalKey || `${x}_${y}_${zIndex}`;

        data.customs[finalKey] = {
            x,
            y,
            key: finalKey,
            zIndex,
            slateImg,
            onAddCe, onEraseCe,
            symbol,
            mapId,
            type,
            eraseSwitch
        };
    }

    const scene = SceneManager._scene;
    if ((scene instanceof Scene_Map || scene instanceof Scene_Battle) && scene._minimap) {
        const minimap = scene._minimap;

        Object.values(minimap._containers).forEach(container => {
            if (type === "pen") {
                minimap.addSlate(container, "pen", x, y, finalKey, zIndex, quadrant, finalColor);
            } else if (type === "fill") {
                minimap.addSlate(container, "fill", x, y, finalKey, zIndex, color);
            } else if (type === "move") {
                minimap.addSlate(container, "move", x, y, finalKey, zIndex, dir);
            } else if (type === "text") {
                minimap.addSlate(container, "text", x, y, finalKey, zIndex);
            } else if (type === "custom") {
                minimap.addSlate(container, "custom", x, y, finalKey, zIndex, slateImg, symbol);
            }
        });
    }

    return finalKey;
};

Game_Map.prototype.removeMinimapData = function (type, key, mapId = this.mapId()) {
    const data = this.getMinimapData(mapId);
    if (!data || !key) return false;

    let removed = false;

    switch (type) {
        case "pen":
            if (data.penDraws[key]) {
                data.penDraws[key] = null;
                removed = true;
            }
            break;

        case "fill":
            if (data.fills[key]) {
                data.fills[key] = null;
                removed = true;
            }
            break;

        case "text":
            if (data.texts[key]) {
                data.texts[key] = null;
                removed = true;
            }
            break;

        case "move":
            if (data.moves[key]) {
                data.moves[key] = null;
                removed = true;
            }
            break;

        case "custom":
            if (data.customs[key]) {
                data.customs[key] = null;
                removed = true;
            }
            break;
    }

    if (!removed) return false;

    const scene = SceneManager._scene;
    if ((scene instanceof Scene_Map || scene instanceof Scene_Battle) && scene._minimap) {
        const minimap = scene._minimap;

        Object.values(minimap._containers).forEach(container => {
            minimap.removeSlate(container, type, key);
        });
    }

    return true;
};

Game_Map.prototype.getSharedEdgeKey = function (x, y, quadrant) {
    switch (quadrant) {
        case "top":
            return { x, y, edge: "top", key: `${x}_${y}_top` };
        case "bottom":
            return { x, y: y + 1, edge: "top", key: `${x}_${y + 1}_top` };
        case "left":
            return { x, y, edge: "left", key: `${x}_${y}_left` };
        case "right":
            return { x: x + 1, y, edge: "left", key: `${x + 1}_${y}_left` };
    }
};

Game_Map.prototype.getMinimapData = function (mapId = this.mapId()) {
    if (!this._minimapData) this.createMinimapData(mapId);
    return this._minimapData[mapId];
};

Game_Map.prototype.getTileData = function (x, y, mapId = this.mapId()) {
    const data = this.getMinimapData(mapId);
    if (!data) return null;
    if (!data.tiles[x]) data.tiles[x] = {};
    if (!data.tiles[x][y]) data.tiles[x][y] = { x, y, revealed: false, filled: false };
    return data.tiles[x][y];
};

Game_Map.prototype.revealAllTiles = function (mapId = this.mapId()) {
    const data = this.getMinimapData(mapId);
    if (!data) return;

    const mw = this.width();
    const mh = this.height();

    for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
            if (!data.tiles[x]) data.tiles[x] = {};
            if (!data.tiles[x][y]) {
                data.tiles[x][y] = { x, y, revealed: true, filled: true };
            } else {
                data.tiles[x][y].revealed = true;
                data.tiles[x][y].filled = true;
            }
        }
    }
    // 性能优化：手动揭示全图后，揭示版本号 +1，触发瓦片精灵刷新
    this._drill_minimapRevealVer = (this._drill_minimapRevealVer || 0) + 1;
};

Game_Map.prototype.getSlatesData = function (mapId, symbol) {
    const data = this.getMinimapData(mapId);
    if (!data) return [];

    return ([
        Object.values(data.fills),
        Object.values(data.texts),
        Object.values(data.moves),
        Object.values(data.customs)
    ]).flat().filter(o => {
        if (o == null) return false;
        if (symbol != null) return o.symbol === symbol;
        else return true;
    });
};

Game_Map.prototype.getSlatesAtXy = function (x, y, symbol, mapId) {
    return this.getSlatesData(mapId, symbol).filter(s => s.x === x && s.y === y);
};

let gbro_etrianminimap_scenebattle_createwindowlayer = Scene_Battle.prototype.createWindowLayer;
Scene_Battle.prototype.createWindowLayer = function () {
    this.createMinimap();
    gbro_etrianminimap_scenebattle_createwindowlayer.call(this);
};

Scene_Battle.prototype.createMinimap = function () {
    if (!$dataMap || !GBRO.EtrianMinimap.displayInBattle) return;

    this._mBg = new Sprite(ImageManager.loadMinimap(GBRO.EtrianMinimap.backImg));
    this._mBg.scale.set(GBRO.EtrianMinimap.minRect[2]);
    this.addChild(this._mBg);

    this._minimap = new Sprite_EtrianMinimapContainer();
    this._minimap.scale.set(GBRO.EtrianMinimap.minRect[2]);
    this._minimap.position.set(
        GBRO.EtrianMinimap.minRect[0],
        GBRO.EtrianMinimap.minRect[1]
    );
    this._minimap.minimize();

    this._mBg.position.set(
        this._minimap.x + (GBRO.EtrianMinimap.backOffset[0] * this._minimap.scale.x),
        this._minimap.y + (GBRO.EtrianMinimap.backOffset[1] * this._minimap.scale.x)
    );
    this.addChild(this._minimap);

    // 默认隐藏；小地图由玩家逻辑(如装备特定道具)在进图后自行调用 GBRO.EtrianMinimap.showMinimap() 打开
    this._minimap.visible = false;
    this._mBg.visible = false;
    if ($dataMap.meta.revealMinimap) $gameMap.revealAllTiles();    
};

let gbro_etrianminimap_scenemap_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function () {
    gbro_etrianminimap_scenemap_update.call(this);
    this.updateMinimap();
};

// 设计/性能：大地图(最大化)打开时视为暂停游戏——冻结游戏世界推进(事件/移动/计时器/画面)，
//   但场景本身(小地图、工具窗、输入)仍照常 update，玩家可正常操作大地图。
let gbro_etrianminimap_scenemap_updateMain = Scene_Map.prototype.updateMain;
Scene_Map.prototype.updateMain = function () {
    if (this._minimap && this._minimap._maximized) return;
    gbro_etrianminimap_scenemap_updateMain.call(this);
};

Scene_Map.prototype.updateMinimap = function () {
    if (!this._minimap || !this._mToolWindow || !this._mBg) return;
    if (!this._minimap.visible) { this._mBg.visible = false; return; }   // 隐藏时跳过定位/缩放计算

    this._mBg.position.set(
        this._minimap.x + (GBRO.EtrianMinimap.backOffset[0] * this._minimap.scale.x),
        this._minimap.y + (GBRO.EtrianMinimap.backOffset[1] * this._minimap.scale.x)
    );
    this._mBg.scale.set(this._minimap.scale.x);
    this._mBg.visible = this._minimap.visible;

    this._mTooltipMask.position.copyFrom(this._minimap);
    this._mTooltipMask.scale.set(this._minimap.scale.x);
};

Scene_Map.prototype.maximizeMinimap = function () {
    if (!this._mToolWindow || !this._minimap) return;

    this._minimap.maximize();
    this._minimap.centerOnPlayer();

    if (!GBRO.EtrianMinimap.twDisabled) {
        this._mToolWindow.refresh();
        this._mToolWindow.show();
        this._mToolWindow.activate();
    }
};

Scene_Map.prototype.minimizeMinimap = function () {
    if (!this._mToolWindow || !this._minimap) return;
    if (!this._mToolWindow.active && !GBRO.EtrianMinimap.twDisabled) return;

    this._mTextDisplay.hide();
    this._minimap.minimize();
    this._mToolWindow.hide();
    this._mToolWindow.deactivate();
};

let gbro_etrianminimap_scenemap_createwindowlayer = Scene_Map.prototype.createWindowLayer;
Scene_Map.prototype.createWindowLayer = function () {
    this.createMinimap();
    this.createMinimapToolWindow();
    this.createMinimapTextWindow();
    this.minimizeMinimap();
    gbro_etrianminimap_scenemap_createwindowlayer.call(this);
};

Scene_Map.prototype.createMinimap = function () {
    this._mBg = new Sprite(ImageManager.loadMinimap(GBRO.EtrianMinimap.backImg));
    this._mBg.scale.set(GBRO.EtrianMinimap.minRect[2]);
    this.addChild(this._mBg);

    this._minimap = new Sprite_EtrianMinimapContainer();
    this._minimap.scale.set(GBRO.EtrianMinimap.minRect[2]);
    this._minimap.position.set(
        GBRO.EtrianMinimap.minRect[0],
        GBRO.EtrianMinimap.minRect[1]
    );

    this._mBg.position.set(
        this._minimap.x + (GBRO.EtrianMinimap.backOffset[0] * this._minimap.scale.x),
        this._minimap.y + (GBRO.EtrianMinimap.backOffset[1] * this._minimap.scale.x)
    );
    this.addChild(this._minimap);

    // 默认隐藏；小地图由玩家逻辑(如装备特定道具)在进图后自行调用 GBRO.EtrianMinimap.showMinimap() 打开
    this._minimap.visible = false;
    this._mBg.visible = false;
    if ($dataMap.meta.revealMinimap) $gameMap.revealAllTiles();    

    this._onMinimapKeyPressed = this.onMinimapKeyPressed.bind(this);
    window.addEventListener('keydown', this._onMinimapKeyPressed);
};

Scene_Map.prototype.onMinimapKeyPressed = function (event) {
    if (event.keyCode === GBRO.EtrianMinimap.toggleMinimapKey && this._minimap.visible) {
        if (this._minimap._maximized) {
            this.minimizeMinimap();
            SoundManager.playOk();
        } else {
            this.maximizeMinimap();
            SoundManager.playOk();
        }
    }
};

let gbro_etrianminimap_scenemap_terminate = Scene_Map.prototype.terminate;
Scene_Map.prototype.terminate = function () {
    if (this._onMinimapKeyPressed) {
        window.removeEventListener('keydown', this._onMinimapKeyPressed);
    }
    gbro_etrianminimap_scenemap_terminate.call(this);
};

Scene_Map.prototype.createMinimapToolWindow = function () {
    this._mToolWindow = new Window_EtrianMinimapTool(this.minimapToolWindowRect());
    this._minimap.setToolWindow(this._mToolWindow);
    this._mToolWindow.setMinimap(this._minimap);
    this.addChild(this._mToolWindow);

    const mb = new Bitmap(this._minimap.spanW(), this._minimap.spanH());
    mb.fillAll("white");
    this._mTooltipMask = new Sprite(mb);
    this._mTooltipMask.position.copyFrom(this._minimap);
    this.addChild(this._mTooltipMask);

    this._mTooltip = new Sprite();
    this._mTooltip.anchor.set(0.5);
    this._mTooltip.position.set(Graphics.boxWidth / 2, Graphics.boxHeight / 2);
    this._mTooltip.mask = this._mTooltipMask;
    this._mToolWindow.setTooltip(this._mTooltip);
    this.addChild(this._mTooltip);
};

Scene_Map.prototype.minimapToolWindowRect = function () {
    return new Rectangle(
        GBRO.EtrianMinimap.twRect[0],
        GBRO.EtrianMinimap.twRect[1],
        GBRO.EtrianMinimap.twRect[2],
        GBRO.EtrianMinimap.twRect[3],
    )
};

Scene_Map.prototype.createMinimapTextWindow = function () {
    this._mTextDisplay = new Window_EtrianMinimapTextDisplay(this.minimapTextDisplayRect());
    this.addChild(this._mTextDisplay);

    this._mTextInput = new Window_EtrianMinimapTextInput(this.minimapTextInputRect());
    this._mTextInput.setDisplay(this._mTextDisplay);
    this.addChild(this._mTextInput);

    this._mToolWindow.setTextInput(this._mTextInput);
    this._mTextInput.setToolWindow(this._mToolWindow);
};

Scene_Map.prototype.minimapTextDisplayRect = function () {
    return new Rectangle(
        GBRO.EtrianMinimap.tdRect[0],
        GBRO.EtrianMinimap.tdRect[1],
        GBRO.EtrianMinimap.tdRect[2],
        GBRO.EtrianMinimap.tdRect[3]
    )
};

Scene_Map.prototype.minimapTextInputRect = function () {
    return new Rectangle(
        GBRO.EtrianMinimap.tiRect[0],
        GBRO.EtrianMinimap.tiRect[1],
        GBRO.EtrianMinimap.tiRect[2],
        GBRO.EtrianMinimap.tiRect[3]
    )
};

let gbro_etrianminimap_scenemap_ismenuenabled = Scene_Map.prototype.isMenuEnabled;
Scene_Map.prototype.isMenuEnabled = function () {
    return gbro_etrianminimap_scenemap_ismenuenabled.call(this) && !(this._minimap && this._minimap._maximized);
};

let gbro_etrianminimap_scenemap_ismaptouchok = Scene_Map.prototype.isMapTouchOk;
Scene_Map.prototype.isMapTouchOk = function () {
    return gbro_etrianminimap_scenemap_ismaptouchok.call(this) && !(this._minimap && this._minimap._maximized);
};

function Sprite_EtrianMinimapContainer() {
    this.initialize(...arguments);
}

Sprite_EtrianMinimapContainer.prototype = Object.create(Sprite.prototype);
Sprite_EtrianMinimapContainer.prototype.constructor = Sprite_EtrianMinimapContainer;

Sprite_EtrianMinimapContainer.prototype.initialize = function () {
    Sprite.prototype.initialize.call(this);
    this._ts = GBRO.EtrianMinimap.defaultTileSize;
    this._zoomLevels = [...GBRO.EtrianMinimap.zoomLevels];
    this._zoomIndex = 0;
    this._toolWindow = null;
    this._isDragging = false;
    this._startTouchDragPoint = null;
    this._contentsDragPoint = null;
    this._maximized = false;
    this.createMask();
    this.createContainers();
    this.changeZoom(this._zoomIndex);
};

Sprite_EtrianMinimapContainer.prototype.minimize = function () {
    this._maximized = false;
    this.scale.set(GBRO.EtrianMinimap.minRect[2]);
    this.position.set(
        GBRO.EtrianMinimap.minRect[0],
        GBRO.EtrianMinimap.minRect[1],
    );
    this.changeZoom(GBRO.EtrianMinimap.minZoomIndex);
};

Sprite_EtrianMinimapContainer.prototype.maximize = function () {
    this._maximized = true;
    this.scale.set(1);
    this.position.set(
        GBRO.EtrianMinimap.maxRect[0],
        GBRO.EtrianMinimap.maxRect[1],
    )
    this.changeZoom(0);
};

Sprite_EtrianMinimapContainer.prototype.createMask = function () {
    this._containerMask = new Sprite(ImageManager.loadMinimap("minimapMask"));
    this._containerMask.position.set(
        GBRO.EtrianMinimap.maskOffset[0],
        GBRO.EtrianMinimap.maskOffset[1],
    );
    this.addChild(this._containerMask);
};

Sprite_EtrianMinimapContainer.prototype.update = function () {
    if (!this.visible) return;   // 隐藏时跳过更新级联(瓦片/触摸)，省CPU；点亮数据由玩家移动逻辑独立记录，不受影响
    Sprite.prototype.update.call(this);
    this.updateContentsTouch();
};

Sprite_EtrianMinimapContainer.prototype.updateVisibleTiles = function () {
    const container = this.curContainer();
    if (!container) return;

    const layer = container._tileLayer;
    const ts = container._ts;

    const range = this.visibleTileRange(container);

    // 性能优化：可见瓦片的整数范围未变就跳过重建。过格前 centerOnPlayer 每帧只是平移 container，
    //   整数范围不变，原代码却每帧重建整套可见瓦片(profile 里 updateVisibleTiles 的主要开销)。
    const last = layer._drill_lastRange;
    if (last && last.minX === range.minX && last.minY === range.minY &&
        last.maxX === range.maxX && last.maxY === range.maxY) {
        return;
    }
    layer._drill_lastRange = { minX: range.minX, minY: range.minY, maxX: range.maxX, maxY: range.maxY };

    const next = {};

    for (let y = range.minY; y <= range.maxY; y++) {
        for (let x = range.minX; x <= range.maxX; x++) {
            const key = `${x}_${y}`;

            let tile = layer._tiles[key];
            if (!tile) {
                tile = new Sprite_EtrianMinimapTile(x, y, ts, true, this);
                tile.position.set(x * ts, y * ts);
                layer.addChild(tile);
            }

            next[key] = tile;
        }
    }
    for (const key in layer._tiles) {
        if (!next[key]) {
            layer.removeChild(layer._tiles[key]);
        }
    }

    layer._tiles = next;
};

Sprite_EtrianMinimapContainer.prototype.visibleTileRange = function (container) {
    const ts = container._ts;
    const layer = container._tileLayer;
    const buffer = layer._buffer;

    const vw = this.spanW();
    const vh = this.spanH();

    const startX = Math.floor(-container.x / ts) - buffer;
    const startY = Math.floor(-container.y / ts) - buffer;

    const endX = Math.ceil((vw - container.x) / ts) + buffer;
    const endY = Math.ceil((vh - container.y) / ts) + buffer;

    return {
        minX: Math.max(0, startX),
        minY: Math.max(0, startY),
        maxX: Math.min($gameMap.width() - 1, endX),
        maxY: Math.min($gameMap.height() - 1, endY),
    };
};

Sprite_EtrianMinimapContainer.prototype.updateContentsTouch = function () {
    if (!this._toolWindow || this._toolWindow._curTool || !this._maximized) return;

    const contents = this.curContainer();

    const vw = this.spanW();
    const vh = this.spanH();
    const ts = contents._ts;

    const mapW = $gameMap.width() * ts;
    const mapH = $gameMap.height() * ts;

    if (mapW <= vw && mapH <= vh) {
        this._isDragging = false;
        return;
    }

    const touchX = TouchInput.x;
    const touchY = TouchInput.y;

    const minX = mapW <= vw ? contents.x : vw - mapW;
    const minY = mapH <= vh ? contents.y : vh - mapH;
    const maxX = mapW <= vw ? contents.x : 0;
    const maxY = mapH <= vh ? contents.y : 0;

    const isTouchingViewport =
        touchX > this.x &&
        touchX < this.x + vw &&
        touchY > this.y &&
        touchY < this.y + vh;

    if (this._isDragging) {
        if (TouchInput.isPressed()) {
            const dragX = touchX - this._startDragPoint.x;
            const dragY = touchY - this._startDragPoint.y;

            let newX = this._contentsDragPoint.x + dragX;
            let newY = this._contentsDragPoint.y + dragY;

            newX = Math.min(maxX, Math.max(minX, newX));
            newY = Math.min(maxY, Math.max(minY, newY));

            contents.position.set(newX, newY);
            this.updateVisibleTiles();
        } else {
            this._isDragging = false;
            this._startDragPoint = null;
        }
    } else {
        if (TouchInput.isPressed() && isTouchingViewport) {
            this._isDragging = true;
            this._startDragPoint = { x: touchX, y: touchY };
            this._contentsDragPoint = { x: contents.x, y: contents.y };
        }
    }
};

Sprite_EtrianMinimapContainer.prototype.centerOnPlayer = function () {
    Object.values(this._containers).forEach(container => {
        const ts = container._ts;

        const px = ($gamePlayer.x * ts) + ts / 2;
        const py = ($gamePlayer.y * ts) + ts / 2;

        const vw = this.spanW();
        const vh = this.spanH();

        const mapW = $gameMap.width() * ts;
        const mapH = $gameMap.height() * ts;

        if (mapW <= vw) {
            container.x = Math.floor((vw - mapW) / 2);
        } else {
            const minX = vw - mapW;
            container.x = Math.min(0, Math.max(minX, Math.floor(vw / 2 - px)));
        }

        if (mapH <= vh) {
            container.y = Math.floor((vh - mapH) / 2);
        } else {
            const minY = vh - mapH;
            container.y = Math.min(0, Math.max(minY, Math.floor(vh / 2 - py)));
        }
    });
    this.updateVisibleTiles();
};

Sprite_EtrianMinimapContainer.prototype.setToolWindow = function (toolWindow) {
    this._toolWindow = toolWindow;
};

Sprite_EtrianMinimapContainer.prototype.changeZoom = function (zoomIndex) {
    if (this._zoomIndex === zoomIndex) return;
    if (this._zoomLevels[zoomIndex] == null) return;

    const oldZoom = this._zoomLevels[this._zoomIndex];
    const newZoom = this._zoomLevels[zoomIndex];

    const oldContainer = this._containers[oldZoom];
    const newContainer = this._containers[newZoom];

    if (oldContainer) oldContainer.visible = false;
    if (newContainer) newContainer.visible = true;

    this._zoomIndex = zoomIndex;
    this.centerOnPlayer();
};

Sprite_EtrianMinimapContainer.prototype.zoomIn = function () {
    if (this._zoomIndex < this._zoomLevels.length - 1) {
        this.changeZoom(this._zoomIndex + 1);
    }
};

Sprite_EtrianMinimapContainer.prototype.zoomOut = function () {
    if (this._zoomIndex > 0) {
        this.changeZoom(this._zoomIndex - 1);
    }
};

Sprite_EtrianMinimapContainer.prototype.zoomLevel = function () {
    return this._zoomLevels[this._zoomIndex];
};

Sprite_EtrianMinimapContainer.prototype.createContainers = function () {
    this._containers = {};

    this._zoomLevels.forEach(i => {
        const container = this.createContainer(i);
        container.mask = this._containerMask;
        container.visible = i === this.zoomLevel();
        this.addChild(container);
        this._containers[i] = container;
    });
};

Sprite_EtrianMinimapContainer.prototype.createContainer = function (zoom) {
    const ts = Math.round(GBRO.EtrianMinimap.defaultTileSize * zoom);

    const container = new Sprite();
    container._zoom = zoom;
    container._ts = ts;
    container._tileLayer = this.createTileLayer(ts, container);
    container._slatesLayer = this.createSlateLayer(container);
    container._iconLayer = this.createIconLayer(ts, container);
    this.populateSlates(container);
    this.updateVisibleTiles();
    return container;
};

Sprite_EtrianMinimapContainer.prototype.curContainer = function () {
    return this._containers[this.zoomLevel()];
};

Sprite_EtrianMinimapContainer.prototype.createTileLayer = function (ts, parent) {
    const layer = new Sprite();
    layer._tiles = {};
    layer._ts = ts;
    layer._buffer = 2;
    // 性能优化：最小化(纯展示)时，瓦片仅在"有新揭示"那一帧需要刷新；其余帧整层跳过子节点遍历，
    //   避免每帧对 100~200 个瓦片精灵逐个派发 update（profile 里 patch:129 的主要开销）。
    //   新瓦片在创建时(createBitmap→refresh)已画对状态，故跳过遍历不会导致漏刷。
    layer.update = function () {
        const mm = SceneManager._scene && SceneManager._scene._minimap;
        if (mm && !mm._maximized) {
            if (parent && parent._drillFloorSprite) return;
            const ver = ($gameMap && $gameMap._drill_minimapRevealVer) || 0;
            if (this._drill_seenVer === ver) return;
            this._drill_seenVer = ver;
        }
        Sprite.prototype.update.call(this);
    };
    parent.addChild(layer);
    return layer;
};

Sprite_EtrianMinimapContainer.prototype.createSlateLayer = function (parent) {
    const layer = new Sprite();
    parent.addChild(layer);
    return layer;
};

Sprite_EtrianMinimapContainer.prototype.populateSlates = function (container) {
    if (!container || !container._slatesLayer) return;

    const slateLayer = container._slatesLayer;
    slateLayer.removeChildren();

    const minimapData = this.minimapData();
    if (!minimapData) return;

    let o;

    // fills
    for (const k in minimapData.fills) {
        o = minimapData.fills[k];
        if (!o) continue;
        this.addSlate(container, "fill", o.x, o.y, o.key, o.zIndex, o.color);
    }

    // pen draws
    for (const k in minimapData.penDraws) {
        o = minimapData.penDraws[k];
        if (!o) continue;
        this.addSlate(container, "pen", o.x, o.y, o.key, o.zIndex, o.quadrant, o.color);
    }

    // texts
    for (const k in minimapData.texts) {
        o = minimapData.texts[k];
        if (!o) continue;
        this.addSlate(container, "text", o.x, o.y, o.key, o.zIndex);
    }

    // moves
    for (const k in minimapData.moves) {
        o = minimapData.moves[k];
        if (!o) continue;
        this.addSlate(container, "move", o.x, o.y, o.key, o.zIndex, o.dir);
    }

    // customs
    for (const k in minimapData.customs) {
        o = minimapData.customs[k];
        if (!o) continue;
        this.addSlate(container, "custom", o.x, o.y, o.key, o.zIndex, o.slateImg);
    }

    this.sortSlatesChildren();
};

Sprite_EtrianMinimapContainer.prototype.createIconLayer = function (ts, parent) {
    const layer = new Sprite();
    parent.addChild(layer);

    layer.addChild(new Sprite_EtrianMinimapIcon($gamePlayer, ts, this));

    $gamePlayer._followers._data.forEach(f =>
        layer.addChild(new Sprite_EtrianMinimapIcon(f, ts, this))
    );

    $gameMap.events().forEach(e =>
        layer.addChild(new Sprite_EtrianMinimapIcon(e, ts, this))
    );

    return layer;
};

Sprite_EtrianMinimapContainer.prototype.sortSlatesChildren = function () {
    Object.values(this._containers).forEach(container => {
        const slateLayer = container._slatesLayer;
        if (!slateLayer || slateLayer.children.length <= 1) return;

        const sorted = slateLayer.children.slice().sort((a, b) => {
            const az = a._z ?? 0;
            const bz = b._z ?? 0;
            return az - bz;
        });

        slateLayer.removeChildren();
        sorted.forEach(s => slateLayer.addChild(s));
    });
};

Sprite_EtrianMinimapContainer.prototype.addSlate = function () {
    const args = [...arguments];
    const container = args[0];
    const type = args[1];
    const mx = args[2];
    const my = args[3];
    const key = args[4];
    const zIndex = args[5];
    const layer = container._slatesLayer;
    const ts = container._ts;
    const gx = mx;
    const gy = my;

    const slate = new Sprite_EtrianMinimapSlate(this, type, key, zIndex);

    const existingSlate = layer.children.find(s => s._key === key && s._type === type);
    if (existingSlate) layer.removeChild(existingSlate);

    if (type === "pen") {
        const quadrant = args[6];
        const color = args[7];
        const thickness = ts * 0.15;

        let slateX = 0;
        let slateY = 0;

        if (quadrant === "top" || quadrant === "bottom") {
            const bitmap = new Bitmap(ts + thickness, thickness);
            bitmap.fillAll(color);
            slate.bitmap = bitmap;

            slateX = ts * gx;
            slateY = ts * gy + (quadrant === "top" ? 0 : ts);

        } else if (quadrant === "left" || quadrant === "right") {
            const bitmap = new Bitmap(thickness, ts + thickness);
            bitmap.fillAll(color);
            slate.bitmap = bitmap;

            slateX = ts * gx + (quadrant === "left" ? 0 : ts);
            slateY = ts * gy;
        }

        slateX -= (thickness / 2);
        slateY -= (thickness / 2);
        slate.position.set(slateX, slateY);
        layer.addChild(slate);
    } else if (type === "fill") {
        const color = args[6];
        slate.bitmap = new Bitmap(ts, ts);
        slate.bitmap.fillAll(color);
        slate.bitmap.strokeRect(1, 1, ts - 2, ts - 2, "white");
        slate.position.set((ts * gx), (ts * gy));
        layer.addChild(slate);
    } else if (type === "text") {
        const bitmap = ImageManager.loadMinimap("textSlate");
        slate.bitmap = new Bitmap(ts, ts);
        slate.position.set((ts * gx), (ts * gy));

        bitmap.addLoadListener(() => slate.bitmap.blt(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, ts, ts));
        layer.addChild(slate);
    } else if (type === "move") {
        const dir = args[6];
        const bitmap = ImageManager.loadMinimap(`move${dir}Slate`);
        slate.bitmap = new Bitmap(ts, ts);
        slate.position.set((ts * gx), (ts * gy));

        bitmap.addLoadListener(() => slate.bitmap.blt(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, ts, ts));
        layer.addChild(slate);
    } else if (type === "custom") {
        const slateImg = args[6];
        const bitmap = ImageManager.loadMinimap(slateImg);
        slate.bitmap = new Bitmap(ts, ts);
        slate.position.set((ts * gx), (ts * gy));

        bitmap.addLoadListener(() => slate.bitmap.blt(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, ts, ts));
        layer.addChild(slate);
    }

    this.sortSlatesChildren();
};

Sprite_EtrianMinimapContainer.prototype.removeSlate = function () {
    const args = [...arguments];
    const container = args[0];
    const type = args[1];
    const key = args[2];
    const slate = container._slatesLayer.children.find(s => s._type === type && s._key === key);
    if (slate) container._slatesLayer.removeChild(slate);
};

Sprite_EtrianMinimapContainer.prototype.spanW = function () {
    return GBRO.EtrianMinimap.maxRect[2];
};

Sprite_EtrianMinimapContainer.prototype.spanH = function () {
    return GBRO.EtrianMinimap.maxRect[3];
};

Sprite_EtrianMinimapContainer.prototype.lastTileTouched = function () {
    const container = this.curContainer();
    const tileLayer = container._tileLayer;

    const lastTile = tileLayer.children.find(s => s.isBeingTouched());
    if (!lastTile) return null;

    const tileSize = container._ts;
    const touch = new Point(TouchInput.x, TouchInput.y);
    const bounds = lastTile.getBounds();
    const pad = tileSize * 0.15;
    const innerBounds = {
        top: bounds.top + pad,
        bottom: bounds.bottom - pad,
        left: bounds.left + pad,
        right: bounds.right - pad
    };

    let quadrant = null;
    if (touch.x > innerBounds.left && touch.x < innerBounds.right) {
        if (touch.y > bounds.top && touch.y < innerBounds.top) {
            quadrant = "top";
        } else if (touch.y > innerBounds.bottom && touch.y < bounds.bottom) {
            quadrant = "bottom";
        }
    } else if (touch.y > innerBounds.top && touch.y < innerBounds.bottom) {
        if (touch.x > bounds.left && touch.x < innerBounds.left) {
            quadrant = "left";
        } else if (touch.x > innerBounds.right && touch.x < bounds.right) {
            quadrant = "right";
        }
    };

    return { tile: lastTile, quadrant }
};

Sprite_EtrianMinimapContainer.prototype.lastSlateTouched = function () {
    const container = this.curContainer();
    const slateLayer = container._slatesLayer;
    const children = slateLayer.children;

    let best = null;
    let bestZ = -Infinity;

    for (const s of children) {
        if (s.isBeingTouched()) {
            const z = s._z ?? 0;
            if (z >= bestZ) {
                bestZ = z;
                best = s;
            }
        }
    }

    return best;
};

Sprite_EtrianMinimapContainer.prototype.minimapData = function () {
    return $gameMap.getMinimapData();
};

function Sprite_EtrianMinimapSlate() {
    this.initialize(...arguments);
}

Sprite_EtrianMinimapSlate.prototype = Object.create(Sprite_Clickable.prototype);
Sprite_EtrianMinimapSlate.prototype.constructor = Sprite_EtrianMinimapSlate;

Sprite_EtrianMinimapSlate.prototype.initialize = function (container, type, key, zIndex) {
    Sprite_Clickable.prototype.initialize.call(this);
    this._container = container;
    this._type = type;
    this._key = key;
    this._z = zIndex;
};

Sprite_EtrianMinimapSlate.prototype.update = function () {
    Sprite_Clickable.prototype.update.call(this);

    const scene = SceneManager._scene;
    if (scene._mToolWindow && !scene._mToolWindow.active) return;
    if (this._type === "text") {
        if (scene._minimap.lastSlateTouched() === this) {
            const td = scene._mTextDisplay;
            const ti = scene._mTextInput;

            if (!ti.active) {
                td.position.set(
                    TouchInput.x - (td.width / 2),
                    TouchInput.y - (td.height * 1.2)
                )
            }
        }
    }
};

Sprite_EtrianMinimapSlate.prototype.onMouseEnter = function () {
    const scene = SceneManager._scene;

    if (scene._mToolWindow && !scene._mToolWindow.active) return;
    if (this._type === "text") {
        const td = scene._mTextDisplay;
        const ti = scene._mTextInput;
        const data = this.slateData();
        if (!data) return;

        if (!ti.active) {
            td.position.set(
                TouchInput.x - (td.width / 2),
                TouchInput.y - (td.height * 1.2)
            )
            td.setText(data.text);
            td.show();
        }
    }
};

Sprite_EtrianMinimapSlate.prototype.onMouseExit = function () {
    const scene = SceneManager._scene;

    if (this._type === "text") {
        const td = scene._mTextDisplay;
        const ti = scene._mTextInput;

        if (!ti.active) {
            td.hide();
        }
    }
};

Sprite_EtrianMinimapSlate.prototype.isBeingTouched = function () {
    const touch = new Point(TouchInput.x, TouchInput.y);
    const bounds = this.getBounds();
    return touch.x > bounds.left && touch.x < bounds.right && touch.y > bounds.top && touch.y < bounds.bottom;
};

Sprite_EtrianMinimapSlate.prototype.slateData = function () {
    if (this._type === "pen") {
        return $gameMap.getMinimapData().penDraws[this._key];
    } else if (this._type === "fill") {
        return $gameMap.getMinimapData().fills[this._key];
    } else if (this._type === "text") {
        return $gameMap.getMinimapData().texts[this._key];
    } else if (this._type === "move") {
        return $gameMap.getMinimapData().moves[this._key];
    } else if (this._type === "custom") {
        return $gameMap.getMinimapData().customs[this._key];
    }
    return null;
};

function Sprite_EtrianMinimapTile() {
    this.initialize(...arguments);
}

Sprite_EtrianMinimapTile.prototype = Object.create(Sprite_Clickable.prototype);
Sprite_EtrianMinimapTile.prototype.constructor = Sprite_EtrianMinimapTile;

Sprite_EtrianMinimapTile.prototype.initialize = function (x, y, ts, isMapTile, container) {
    Sprite_Clickable.prototype.initialize.call(this);
    this._x = x;
    this._y = y;
    this._ts = ts;
    this._isMapTile = isMapTile;
    this._container = container;
    this._revealed = false;
    this._filled = false;
    this.position.set(x * ts, y * ts);
    this.createBitmap();
};

Sprite_EtrianMinimapTile.prototype.createBitmap = function () {
    const ts = this._ts;
    this.bitmap = new Bitmap(ts, ts);
    this.bitmap.smooth = false;
    this.refresh();
};

Sprite_EtrianMinimapTile.prototype.refresh = function () {
    if (!this.bitmap) return;

    if (this._isMapTile) {
        const tile = this.tileData();
        if (tile && tile.revealed && tile.filled) {
            this.refreshAsRevealedTile(tile);
        } else {
            this.refreshAsUnrevealedTile();
        }
    }
};

Sprite_EtrianMinimapTile.prototype.refreshAsRevealedTile = function (tile) {
    this.bitmap.clear();
    const regionId = $gameMap.regionId(tile.x, tile.y);
    const color = GBRO.EtrianMinimap.regionColorMap[regionId] || "#a9bffc";
    this.bitmap.fillAll(color);
    this.bitmap.strokeRect(1, 1, this._ts - 2, this._ts - 2, "white");
};

Sprite_EtrianMinimapTile.prototype.refreshAsUnrevealedTile = function () {
    this.bitmap.clear();
    const color = GBRO.EtrianMinimap.regionColorMap[0] || "#475c66";
    this.bitmap.fillAll(color);
    this.bitmap.strokeRect(1, 1, this._ts - 2, this._ts - 2, "white");
};

Sprite_EtrianMinimapTile.prototype.update = function () {
    // 性能优化：最小化(纯展示)时，瓦片不需要点击命中检测，跳过 Sprite_Clickable 的每帧 processTouch
    const minimap = SceneManager._scene && SceneManager._scene._minimap;
    if (minimap && !minimap._maximized) {
        Sprite.prototype.update.call(this);
        this.updateTile();
        return;
    }
    Sprite_Clickable.prototype.update.call(this);
    this.updateTile();
};

Sprite_EtrianMinimapTile.prototype.updateTile = function () {
    if (!this._isMapTile) return;

    // 性能优化：揭示版本号门控——没有新揭示就跳过昂贵的 getTileData 轮询（待机时每帧仅一次整数比较）
    const ver = ($gameMap && $gameMap._drill_minimapRevealVer) || 0;
    if (this._drill_seenRevealVer === ver) return;
    this._drill_seenRevealVer = ver;

    const tile = this.tileData();
    if (!tile) return;

    if (this._revealed !== tile.revealed) {
        this._revealed = tile.revealed;
        this.refresh();
    }

    if (this._filled !== tile.filled) {
        this._filled = tile.filled;
        this.refresh();
    }
};

Sprite_EtrianMinimapTile.prototype.tileData = function () {
    return $gameMap.getTileData(this._x, this._y);
};

Sprite_EtrianMinimapTile.prototype.isBeingTouched = function () {
    const touch = new Point(TouchInput.x, TouchInput.y);
    const bounds = this.getBounds();
    return touch.x > bounds.left && touch.x < bounds.right && touch.y > bounds.top && touch.y < bounds.bottom;
};

function Sprite_EtrianMinimapIcon() {
    this.initialize(...arguments);
}

Sprite_EtrianMinimapIcon.prototype = Object.create(Sprite_Clickable.prototype);
Sprite_EtrianMinimapIcon.prototype.constructor = Sprite_EtrianMinimapIcon;

Sprite_EtrianMinimapIcon.prototype.initialize = function (character, ts, container) {
    Sprite_Clickable.prototype.initialize.call(this);
    this._ts = ts;
    this._character = null;
    this._filename = null;
    this._container = container;
    this.anchor.set(0.5);
    this.setCharacter(character);
};

Sprite_EtrianMinimapIcon.prototype.setCharacter = function (character) {
    this._character = character;
    this.refresh();
};

Sprite_EtrianMinimapIcon.prototype.update = function () {
    Sprite_Clickable.prototype.update.call(this);
    this.updateBitmap();
    this.updateVisibility();
    this.updatePosition();
    this.updateRotation();
};

Sprite_EtrianMinimapIcon.prototype.updateBitmap = function () {
    if (!this._character) return;

    if (this._filename !== this._character.minimapIcon()) {
        this.refresh();
    }
};

Sprite_EtrianMinimapIcon.prototype.refresh = function () {
    this._filename = this._character.minimapIcon();

    if (!this.bitmap) {
        this.bitmap = new Bitmap(this._ts, this._ts);
    }
    this.bitmap.clear();

    const icon = ImageManager.loadMinimap(this._filename);
    icon.addLoadListener(b => {
        this.bitmap.blt(b, 0, 0, b.width, b.height, 0, 0, this._ts, this._ts);
    })
};

Sprite_EtrianMinimapIcon.prototype.rebuild = function (ts) {
    this._ts = ts;
    this.bitmap = new Bitmap(ts, ts);
    this.refresh();
    this.updatePosition();
};

Sprite_EtrianMinimapIcon.prototype.updateVisibility = function () {
    this.visible = this._character !== null && this._character.minimapIcon() !== null && this._character.isVisibleInMinimap();

    const tile = this.tileData();
    if (tile && !tile.revealed) {
        this.visible = false;
    }
};

Sprite_EtrianMinimapIcon.prototype.updatePosition = function () {
    if (!this._character) return;

    const x = this._character.x;
    const y = this._character.y;

    this.position.set(
        (x * this._ts) + this._ts / 2,
        (y * this._ts) + this._ts / 2
    );
};

Sprite_EtrianMinimapIcon.prototype.updateRotation = function () {
    if (!this._character) return;
    if (!this._character.isMinimapIconRotating()) {
        this.rotation = 0;
        return;
    }

    switch (this._character.direction()) {
        case 2:
            this.rotation = Math.PI;
            break;
        case 4:
            this.rotation = -Math.PI / 2;
            break;
        case 6:
            this.rotation = Math.PI / 2;
            break;
        case 8:
        default:
            this.rotation = 0;
            break;
    }
};

Sprite_EtrianMinimapIcon.prototype.tileData = function () {
    if (!this._character) return null;
    return $gameMap.getTileData(this._character.x, this._character.y);
};

function Window_EtrianMinimapTool() {
    this.initialize(...arguments);
}

Window_EtrianMinimapTool.prototype = Object.create(Window_Command.prototype);
Window_EtrianMinimapTool.prototype.constructor = Window_EtrianMinimapTool;

Window_EtrianMinimapTool.prototype.initialize = function (rect) {
    Window_Command.prototype.initialize.call(this, rect);
    this._minimap = null;
    this._textInput = null;
    this._curTool = null;
    this._areImageAssetsLoaded = false;
    this._tooltipBitmapCache = {};
    this._penColor = GBRO.EtrianMinimap.penColor;
    this._fillColor = GBRO.EtrianMinimap.fillColor;
    this.frameVisible = GBRO.EtrianMinimap.twFrameVisible;
    this.refresh();
    this.select(0);
    this.activate();
    this.setupHandlers();
    this.loadImageAssets();
};

Window_EtrianMinimapTool.prototype.loadImageAssets = function () {
    this._imageAssets = [];
    const loadables = [...GBRO.EtrianMinimap.commands.map(c => `${c.symbol}Icon`)];
    loadables.push("pauseIcon");
    loadables.forEach(filename => {
        this._imageAssets.push(ImageManager.loadMinimap(filename));
    });
};

Window_EtrianMinimapTool.prototype.update = function () {
    Window_Command.prototype.update.call(this);
    this.updateImageAssetLoad();
    this.updateCurTool();
    this.updateToolCancel();
};

Window_EtrianMinimapTool.prototype.updateImageAssetLoad = function () {
    if (this._areImageAssetsLoaded) return;
    if (this._imageAssets.every(bitmap => bitmap.isReady())) {
        this._areImageAssetsLoaded = true;
        this.refresh();
    }
};

Window_EtrianMinimapTool.prototype.updateToolCancel = function () {
    if (!this._curTool) return;

    if (this._textInput && this._textInput.active) return;

    if (TouchInput.isCancelled() || Input.isTriggered("cancel")) {
        this.clearCurTool();
        TouchInput.clear();
        Input.clear();
        this.activate();
        SoundManager.playCancel();
    }
};

Window_EtrianMinimapTool.prototype.clearCurTool = function () {
    this._curTool = null;
    this._curToolExt = null;
    if (this._toolSprite) {
        this._toolSprite.bitmap = null;
    }
};

Window_EtrianMinimapTool.prototype.updateCurTool = function () {
    if (!this._tooltip || !this._minimap) return;

    if (!this._curTool) {
        this._tooltip.hide();
        return;
    }
    this._tooltip.show();

    const container = this._minimap.curContainer();
    const ext = this._curToolExt;

    if (this._curTool === "pen") {
        const lastTile = this._minimap.lastTileTouched();
        if (!lastTile) return;

        const tile = lastTile.tile
        const bounds = tile.getBounds();
        const quadrant = lastTile.quadrant;

        if (ext.quadrant !== quadrant) {
            const ts = container._ts;
            const thickness = ts * 0.15;

            ext.quadrant = quadrant;

            if (quadrant === "top" || quadrant === "bottom") {
                const key = `pen_${quadrant}_${ext.color}_${ts}`;
                if (!this._tooltipBitmapCache[key]) {
                    const bitmap = new Bitmap(ts + thickness, thickness);
                    bitmap.fillAll(ext.color);
                    this._tooltipBitmapCache[key] = bitmap;
                }
                this._tooltip.bitmap = this._tooltipBitmapCache[key];
                this._tooltip.position.set(
                    bounds.left + (bounds.width / 2),
                    bounds[quadrant]
                );
            } else if (quadrant === "left" || quadrant === "right") {
                const key = `pen_${quadrant}_${ext.color}_${ts}`;
                if (!this._tooltipBitmapCache[key]) {
                    const bitmap = new Bitmap(thickness, thickness + ts);
                    bitmap.fillAll(ext.color);
                    this._tooltipBitmapCache[key] = bitmap;
                }
                this._tooltip.bitmap = this._tooltipBitmapCache[key];
                this._tooltip.position.set(
                    bounds[quadrant],
                    bounds.top + (bounds.height / 2)
                );
            } else {
                this._tooltip.bitmap = null;
                this._tooltip.hide();
            }
        }

        if (TouchInput.isTriggered() && quadrant !== null) {
            this.addMinimapData("pen", tile, ext.zIndex, quadrant, ext.color);
            SoundManager.playOk();
        }
    } else if (this._curTool === "fill") {
        const lastTile = this._minimap.lastTileTouched();
        if (!lastTile) return;

        const tile = lastTile.tile;
        const bounds = tile.getBounds();
        const ts = container._ts;
        const key = `fill_${ext.color}_${ts}`;
        if (!this._tooltipBitmapCache[key]) {
            const bitmap = new Bitmap(ts, ts);
            bitmap.fillAll(ext.color);
            this._tooltipBitmapCache[key] = bitmap;
        }
        this._tooltip.bitmap = this._tooltipBitmapCache[key];
        this._tooltip.position.set(
            bounds.left + (bounds.width / 2), bounds.top + (bounds.height / 2)
        );

        if (TouchInput.isTriggered()) {
            this.addMinimapData("fill", tile, ext.zIndex, ext.color);
            SoundManager.playOk();
        }
    } else if (this._curTool === "text") {
        const lastTile = this._minimap.lastTileTouched();
        if (!lastTile) return;

        if (this._textInput && this._textInput.active) {
            this._tooltip.bitmap = null;
            return;
        }

        const tile = lastTile.tile;
        const bounds = tile.getBounds();
        const ts = container._ts;
        const bitmap = ImageManager.loadMinimap("textSlate");
        this._tooltip.bitmap = new Bitmap(ts, ts);
        this._tooltip.bitmap.blt(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, ts, ts);
        this._tooltip.position.set(
            bounds.left + (bounds.width / 2), bounds.top + (bounds.height / 2)
        );

        if (TouchInput.isTriggered()) {
            this.addMinimapData("text", tile, ext.zIndex);
            SoundManager.playOk();
        }
    } else if (this._curTool === "move") {
        const lastTile = this._minimap.lastTileTouched();
        if (!lastTile) return;

        const tile = lastTile.tile;
        const bounds = tile.getBounds();
        const ts = container._ts;
        const bitmap = ImageManager.loadMinimap(`move${ext.dir}Slate`);
        this._tooltip.bitmap = new Bitmap(ts, ts);
        this._tooltip.bitmap.blt(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, ts, ts);
        this._tooltip.position.set(
            bounds.left + (bounds.width / 2), bounds.top + (bounds.height / 2)
        );

        if (TouchInput.isTriggered()) {
            this.addMinimapData("move", tile, ext.zIndex, ext.dir);
            SoundManager.playOk();
        }
    } else if (this._curTool === "custom") {
        const lastTile = this._minimap.lastTileTouched();
        if (!lastTile) return;

        const tile = lastTile.tile;
        const bounds = tile.getBounds();
        const ts = container._ts;
        const icon = ImageManager.loadMinimap(ext.slateImg);
        const key = `custom_${ext.symbol}_${ts}`;
        if (!this._tooltipBitmapCache[key]) {
            icon.addLoadListener(icon => {
                const bitmap = new Bitmap(ts, ts);
                bitmap.blt(icon, 0, 0, icon.width, icon.height, 0, 0, ts, ts);
                this._tooltipBitmapCache[key] = bitmap;
            });
        }
        this._tooltip.bitmap = this._tooltipBitmapCache[key];
        this._tooltip.position.set(
            bounds.left + (bounds.width / 2), bounds.top + (bounds.height / 2)
        );

        if (TouchInput.isTriggered()) {
            this.addMinimapData("custom", tile, ext.zIndex, ext.slateImg, ext.symbol);
            SoundManager.playOk();
        }
    } else if (this._curTool === "eraser") {
        const lastSlate = this._minimap.lastSlateTouched();
        if (!lastSlate) return;

        if (TouchInput.isTriggered()) {
            const eraseSwitch = lastSlate.slateData().eraseSwitch;
            if (eraseSwitch != null) {
                if (eraseSwitch !== 0 && !$gameSwitches.value(eraseSwitch)) {
                    SoundManager.playBuzzer();
                    return;
                } else {
                    this.removeMinimapData(lastSlate._type, lastSlate._key);
                    SoundManager.playOk();
                }
            } else {
                this.removeMinimapData(lastSlate._type, lastSlate._key);
                SoundManager.playOk();
            }
        }
    } else {
        this._tooltip.hide();
    }
};

Window_EtrianMinimapTool.prototype.addMinimapData = function () {
    if (!this._minimap) return;

    const minimapData = this.minimapData();
    if (!minimapData) return;

    const containers = Object.values(this._minimap._containers);
    const args = [...arguments];
    const type = args[0];
    const tile = args[1];
    const zIndex = args[2];
    let lastSlate = null;
    let dataSlate = GBRO.EtrianMinimap.commands.find(c => c.symbol === type);

    if (type === "pen") {
        const quadrant = args[3];
        const color = args[4];
        const se = this.getSharedEdge(tile._x, tile._y, quadrant);
        const key = `${se.x}_${se.y}_${se.edge}`;
        if (!minimapData.penDraws[key]) {
            lastSlate = { x: tile._x, y: tile._y, key, type, quadrant, zIndex, color };
            minimapData.penDraws[key] = lastSlate;
            containers.forEach(container => this._minimap.addSlate(container, "pen", tile._x, tile._y, key, zIndex, quadrant, color));
        }
    } else if (type === "fill") {
        const color = args[3];
        const key = `${tile._x}_${tile._y}`;
        lastSlate = { x: tile._x, y: tile._y, key, type, color, zIndex, symbol: "fill" };
        minimapData.fills[key] = lastSlate;
        containers.forEach(container => this._minimap.addSlate(container, "fill", tile._x, tile._y, key, zIndex, color));
    } else if (type === "text") {
        const key = `${tile._x}_${tile._y}`;
        lastSlate = { x: tile._x, y: tile._y, key, type, text: "", zIndex, symbol: "text" };
        minimapData.texts[key] = lastSlate;
        containers.forEach(container => this._minimap.addSlate(container, "text", tile._x, tile._y, key, zIndex));

        if (this._textInput) {
            this._textInput.setup(key);
        }
    } else if (type === "move") {
        const dir = args[3];
        const key = `${tile._x}_${tile._y}`;
        lastSlate = { x: tile._x, y: tile._y, key, type, dir, symbol: "move" };
        minimapData.moves[key] = lastSlate;
        containers.forEach(container => this._minimap.addSlate(container, "move", tile._x, tile._y, key, zIndex, dir));
    } else if (type === "custom") {
        const slateImg = args[3];
        const symbol = args[4];
        const key = `${tile._x}_${tile._y}_${zIndex}`;
        dataSlate = GBRO.EtrianMinimap.commands.find(c => c.symbol === symbol);
        lastSlate = { x: tile._x, y: tile._y, key, type, zIndex, slateImg, symbol };
        minimapData.customs[key] = lastSlate;
        containers.forEach(container => this._minimap.addSlate(container, "custom", tile._x, tile._y, key, zIndex, slateImg, symbol));
    }

    if (["text", "move", "fill", "custom"].includes(type)) {
        const eventsXy = $gameMap.eventsXy(tile._x, tile._y).filter(e => {
            if (!e) return false;

            const trig = e._trigger;

            if (typeof trig !== "string") return false;
            if (!trig.startsWith("slate_")) return false;

            const reqSlate = trig.slice(6);

            let curSlate = type;
            if (type === "custom") {
                curSlate = args[4];
            }

            return curSlate === reqSlate;
        });

        eventsXy.forEach(e => e.start());
    }

    if (lastSlate) {
        lastSlate.mapId = $gameMap.mapId();
        $gameTemp.lastSlateAdded = JSON.parse(JSON.stringify(lastSlate));
        if (dataSlate) {
            lastSlate.onAddCe = Number(dataSlate.ceOnPlace);
            lastSlate.onEraseCe = Number(dataSlate.ceOnErase);

            const ce = $dataCommonEvents[lastSlate.onAddCe];
            if (ce) $gameTemp.reserveCommonEvent(ce.id);
        }
    }
};

Window_EtrianMinimapTool.prototype.removeMinimapData = function () {
    const args = [...arguments];
    const type = args[0];
    const key = args[1];

    const minimapData = this.minimapData();
    if (!minimapData) return;

    const containers = Object.values(this._minimap._containers);

    let lastSlate = null;

    if (type === "pen") {
        if (minimapData.penDraws[key]) {
            lastSlate = minimapData.penDraws[key];
            minimapData.penDraws[key] = null;
            containers.forEach(container => this._minimap.removeSlate(container, type, key));
        }
    } else if (type === "fill") {
        if (minimapData.fills[key]) {
            lastSlate = minimapData.fills[key];
            minimapData.fills[key] = null;
            containers.forEach(container => this._minimap.removeSlate(container, type, key));
        }
    } else if (type === "text") {
        if (minimapData.texts[key]) {
            lastSlate = minimapData.texts[key];
            minimapData.texts[key] = null;
            containers.forEach(container => this._minimap.removeSlate(container, type, key));
        }
    } else if (type === "move") {
        if (minimapData.moves[key]) {
            lastSlate = minimapData.moves[key];
            minimapData.moves[key] = null;
            containers.forEach(container => this._minimap.removeSlate(container, type, key));
        }
    } else if (type === "custom") {
        if (minimapData.customs[key]) {
            lastSlate = minimapData.customs[key];
            minimapData.customs[key] = null;
            containers.forEach(container => this._minimap.removeSlate(container, type, key));
        }
    }

    if (lastSlate) {
        $gameTemp.lastSlateRemoved = JSON.parse(JSON.stringify(lastSlate));
        const ce = $dataCommonEvents[lastSlate.onEraseCe];
        if (ce) $gameTemp.reserveCommonEvent(ce.id);
    }
};

Window_EtrianMinimapTool.prototype.getSharedEdge = function (x, y, quadrant) {
    switch (quadrant) {
        case "top":
            return { x, y, edge: "top" };
        case "bottom":
            return { x, y: y + 1, edge: "top" };
        case "left":
            return { x, y, edge: "left" };
        case "right":
            return { x: x + 1, y, edge: "left" };
    }
};

Window_EtrianMinimapTool.prototype.makeCommandList = function () {
    GBRO.EtrianMinimap.commands.filter(o => eval(o.visibleEval)).forEach(o => {
        this.addCommand(o.label, o.symbol, eval(o.usableEval) === true, o);
    });
    this.setupHandlers();
};

Window_EtrianMinimapTool.prototype.setupHandlers = function () {
    this.setHandler("ok", this.onOk.bind(this));
    this.setHandler("pen", this.onPen.bind(this));
    this.setHandler("fill", this.onFill.bind(this));
    this.setHandler("eraser", this.onEraser.bind(this));
    this.setHandler("text", this.onText.bind(this));
    this.setHandler("zoomIn", this.onZoomIn.bind(this));
    this.setHandler("zoomOut", this.onZoomOut.bind(this));
    this.setHandler("moveUp", this.onMove.bind(this, "Up"));
    this.setHandler("moveDown", this.onMove.bind(this, "Down"));
    this.setHandler("moveLeft", this.onMove.bind(this, "Left"));
    this.setHandler("moveRight", this.onMove.bind(this, "Right"));
    this.setHandler("play", this.onPlay.bind(this));
    this.setHandler("cancel", this.onExit.bind(this));
    this.setHandler("exit", this.onExit.bind(this));
};

Window_EtrianMinimapTool.prototype.onOk = function () {
    const cmnd = this.currentExt();
    if (cmnd.type === "action") {
        const ce = $dataCommonEvents[Number(cmnd.ceOnAction)];
        if (ce) $gameTemp.reserveCommonEvent(ce.id);
        else this.activate();
    } else if (cmnd.type === "placeable") {
        this._curTool = "custom";
        this._curToolExt = { slateImg: cmnd.slateImg, zIndex: Number(cmnd.zIndex), symbol: cmnd.symbol };
        this.hideTextInput();
        this.clearTooltipBitmap();
    }
};

Window_EtrianMinimapTool.prototype.onPlay = function () {
    $gamePlayer.toggleAutoRouting();
    this.refresh();
    this.activate();
};

Window_EtrianMinimapTool.prototype.onMove = function (dir) {
    const zIndex = Number(this.currentExt().zIndex);
    this._curTool = "move";
    this._curToolExt = { dir, zIndex };
    this.hideTextInput();
    this.clearTooltipBitmap();
};

Window_EtrianMinimapTool.prototype.onText = function () {
    const zIndex = Number(this.currentExt().zIndex);
    this._curTool = "text";
    this._curToolExt = { zIndex };
    this.hideTextInput();
    this.clearTooltipBitmap();
};

Window_EtrianMinimapTool.prototype.onFill = function () {
    this._curTool = "fill";
    this._curToolExt = { color: this._fillColor };
    this.hideTextInput();
    this.clearTooltipBitmap();
};

Window_EtrianMinimapTool.prototype.onPen = function () {
    const zIndex = Number(this.currentExt().zIndex);
    this._curTool = "pen";
    this._curToolExt = { zIndex, color: this._penColor };
    this.hideTextInput();
    this.clearTooltipBitmap();
};

Window_EtrianMinimapTool.prototype.onEraser = function () {
    this._curTool = "eraser";
    this._curToolExt = {};
    this.hideTextInput();
    this.clearTooltipBitmap();
};

Window_EtrianMinimapTool.prototype.onZoomIn = function () {
    if (!this._minimap) {
        this.activate();
        return;
    }
    this._minimap.zoomIn();
    this.activate();
};

Window_EtrianMinimapTool.prototype.onZoomOut = function () {
    if (!this._minimap) {
        this.activate();
        return;
    }
    this._minimap.zoomOut();
    this.activate();
};

Window_EtrianMinimapTool.prototype.onExit = function () {
    if (!this._minimap) {
        this.activate();
        return;
    }

    if (this._curTool === "pen") {
        this._curTool = null;
        this.activate();
        return;
    }

    this._textInput._displayWindow.hide();
    this._textInput.hide();

    this._minimap.minimize();
    this.hide();
};

Window_EtrianMinimapTool.prototype.setTooltip = function (tooltip) {
    this._tooltip = tooltip;
};

Window_EtrianMinimapTool.prototype.hideTextInput = function () {
    if (!this._textInput) return;

    this._textInput.visible = false;
};

Window_EtrianMinimapTool.prototype.clearTooltipBitmap = function () {
    if (this._tooltip) this._tooltip.bitmap = null;
};

Window_EtrianMinimapTool.prototype.setMinimap = function (minimap) {
    this._minimap = minimap;
};

Window_EtrianMinimapTool.prototype.setTextInput = function (ti) {
    this._textInput = ti;
};

Window_EtrianMinimapTool.prototype.drawItemBackground = function (index) {
    if (!GBRO.EtrianMinimap.twDrawItemBg) return;
    const rect = this.itemRect(index);
    this.drawBackgroundRect(rect);
};

Window_EtrianMinimapTool.prototype.drawItem = function (index) {
    const item = this._list[index];
    const rect = this.itemRect(index);
    const symbol = this.commandSymbol(index);
    const ext = item.ext;
    this.contents.fontSize = 12;
    this.changePaintOpacity(this.isCommandEnabled(index));

    let iconName = "";
    if (symbol === "play") {
        iconName = $gamePlayer._isAutoRouting ? "pauseIcon" : "playIcon";
    } else {
        iconName = this.commandSymbol(index) + "Icon";
    }

    let label = "";
    if (symbol === "play") {
        label = $gamePlayer._isAutoRouting ? "Pause" : "Play";
    } else {
        label = item.name;
    }

    const b = ImageManager.loadMinimap(iconName);
    this.contents.blt(b, 0, 0, b.width, b.height, rect.x, rect.y, rect.width, rect.height);

    if (GBRO.EtrianMinimap.twDrawLabel) {
        this.drawText(label, rect.x, rect.y + rect.height - (this.contents.fontSize * 2), rect.width, "center");
    }
};

Window_EtrianMinimapTool.prototype.itemWidth = function () {
    return this.innerWidth / this.maxCols();
};

Window_EtrianMinimapTool.prototype.itemHeight = function () {
    return this.itemWidth();
};

Window_EtrianMinimapTool.prototype.maxCols = function () {
    return GBRO.EtrianMinimap.twCols;
};

Window_EtrianMinimapTool.prototype.minimapData = function () {
    return $gameMap.getMinimapData();
};

Window_EtrianMinimapTool.prototype._createBackSprite = function () {
    if (GBRO.EtrianMinimap.twBgType === "Windowskin") {
        this._backSprite = new Sprite();
        this._backSprite.addChild(new TilingSprite());
        this._container.addChild(this._backSprite);
    } else {
        this._backSprite = new Sprite(ImageManager.loadSystem(GBRO.EtrianMinimap.twBgCustomImg));
        this._backSprite.position.set(
            GBRO.EtrianMinimap.twBgCustomOffset[0],
            GBRO.EtrianMinimap.twBgCustomOffset[1],
        )
        this._container.addChild(this._backSprite);
    }
};

Window_EtrianMinimapTool.prototype._refreshBack = function () {
    if (GBRO.EtrianMinimap.twBgType === "Windowskin") {
        Window.prototype._refreshBack.call(this);
    }
};

function Window_EtrianMinimapTextDisplay() {
    this.initialize(...arguments);
}

Window_EtrianMinimapTextDisplay.prototype = Object.create(Window_Selectable.prototype);
Window_EtrianMinimapTextDisplay.prototype.constructor = Window_EtrianMinimapTextDisplay;

Window_EtrianMinimapTextDisplay.prototype.initialize = function (rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this._maxChars = GBRO.EtrianMinimap.tdMaxChars;
    this._homeX = rect.x;
    this._homeY = rect.y;
    this.frameVisible = GBRO.EtrianMinimap.tdFrameVisible;
    this.createText();
    this.createMask();
    this.hide();
};

Window_EtrianMinimapTextDisplay.prototype.createText = function () {
    this._text = new PIXI.Text("", {
        fontFamily: "rmmz-mainfont",
        fontSize: this.innerHeight * 0.2,
        fill: "#ffffff",
        stroke: ColorManager.outlineColor(),
        strokeThickness: 4,
        align: "center",
        wordWrap: true,
        wordWrapWidth: this.innerWidth,
        breakWords: true
    });
    this._text.anchor.set(0.5);
    this._text.x = this.width / 2;
    this._text.y = this.height / 2;
    this.addChild(this._text);
};

Window_EtrianMinimapTextDisplay.prototype.createMask = function () {
    const mask = new PIXI.Graphics();
    mask.beginFill(0xffffff);
    mask.drawRect(0, 0, this.innerWidth, this.innerHeight);
    mask.endFill();
    mask.x = this.padding;
    mask.y = this.padding;

    this.addChild(mask);
    this._text.mask = mask;
};

Window_EtrianMinimapTextDisplay.prototype.resetToHome = function () {
    this.x = this._homeX;
    this.y = this._homeY;
};

Window_EtrianMinimapTextDisplay.prototype.text = function () {
    return this._text ? this._text.text : "";
};

Window_EtrianMinimapTextDisplay.prototype.setText = function (text) {
    if (!this._text) return;

    this._text.text = text;
    this.recenterText();
};

Window_EtrianMinimapTextDisplay.prototype.back = function () {
    const text = this._text.text;
    if (!text || text.length === 0) return;

    const chars = Array.from(text);
    chars.pop();
    this._text.text = chars.join("");
    this.recenterText();
};

Window_EtrianMinimapTextDisplay.prototype.appendChar = function (c) {
    if (this._text.text.length >= this._maxChars) return;
    this._text.text += c;
    this.recenterText();
};

Window_EtrianMinimapTextDisplay.prototype.clear = function () {
    this._text.text = "";
    this.recenterText();
};

Window_EtrianMinimapTextDisplay.prototype.recenterText = function () {
    this._text.x = this.width / 2;
    this._text.y = this.height / 2;
};

Window_EtrianMinimapTextDisplay.prototype._createBackSprite = function () {
    if (GBRO.EtrianMinimap.tdBgType === "Windowskin") {
        this._backSprite = new Sprite();
        this._backSprite.addChild(new TilingSprite());
        this._container.addChild(this._backSprite);
    } else {
        this._backSprite = new Sprite(ImageManager.loadSystem(GBRO.EtrianMinimap.tdBgCustomImg));
        this._backSprite.position.set(
            GBRO.EtrianMinimap.tdBgCustomOffset[0],
            GBRO.EtrianMinimap.tdBgCustomOffset[1],
        )
        this._container.addChild(this._backSprite);
    }
};

Window_EtrianMinimapTextDisplay.prototype._refreshBack = function () {
    if (GBRO.EtrianMinimap.tdBgType === "Windowskin") {
        Window.prototype._refreshBack.call(this);
    }
};

function Window_EtrianMinimapTextInput() {
    this.initialize(...arguments);
}

Window_EtrianMinimapTextInput.prototype = Object.create(Window_Selectable.prototype);
Window_EtrianMinimapTextInput.prototype.constructor = Window_EtrianMinimapTextInput;

Window_EtrianMinimapTextInput.prototype.initialize = function (rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this._displayWindow = null;
    this._toolWindow = null;
    this._isCaps = false;
    this._key = null;
    this._keyboardHandler = null;
    this.frameVisible = GBRO.EtrianMinimap.tiFrameVisible;
    this.refresh();
    this.setHandler("ok", this.onInputOk.bind(this));
    this.setHandler("cancel", this.onInputCancel.bind(this));
    this.hide();
};

Window_EtrianMinimapTextInput.prototype.onInputCancel = function () {
    if (this._toolWindow) {
        this._toolWindow.clearCurTool();
        this._toolWindow.activate();
    }

    this._displayWindow.hide();
    this.hide();
};

Window_EtrianMinimapTextInput.prototype.setToolWindow = function (tw) {
    this._toolWindow = tw;
};

Window_EtrianMinimapTextInput.prototype.setup = function (key) {
    if (!this._displayWindow) return;

    this._key = key;

    if (!this.textData()) return;

    this._displayWindow.setText(this.textData().text);
    this._displayWindow.resetToHome();
    this._displayWindow.show();
    this._isCaps = false;
    this.refresh();
    this.select(0);
    this.show();
    this.activate();
};

Window_EtrianMinimapTextInput.prototype.textData = function () {
    if (!this._key) return null;

    return $gameMap.getMinimapData().texts[this._key];
};

Window_EtrianMinimapTextInput.prototype.onInputOk = function () {
    if (!this._displayWindow) return;

    const dp = this._displayWindow;
    const c = this.characters()[this._index];
    const textData = this.textData();

    if (c === "Caps") {
        this._isCaps = !this._isCaps;
        this.refresh();
        this.activate();
    } else if (c === "Back") {
        dp.back();
        this.activate();
    } else if (c === "Clear") {
        dp.clear();
        this.activate();
    } else if (c === "Save") {
        if (textData) {
            textData.text = dp.text();
        }

        if (this._toolWindow) {
            this._toolWindow.clearCurTool();
            this._toolWindow.activate();
        }

        this._displayWindow.hide();
        this.hide();
    } else {
        dp.appendChar(this._isCaps ? c.toUpperCase() : c);
        this.activate();
    }
};

Window_EtrianMinimapTextInput.prototype.setDisplay = function (dw) {
    this._displayWindow = dw;
};

Window_EtrianMinimapTextInput.prototype.drawItem = function (index) {
    const c = this.characters()[index];
    const rect = this.itemRect(index);
    const fs = rect.height * 0.7;
    if (index < this.maxItems() - 4) {
        this.contents.fontSize = fs;
    } else {
        this.contents.fontSize = fs * 0.5;
    }
    this.drawText(this._isCaps ? c.toUpperCase() : c, rect.x, rect.y, rect.width, "center");
};

Window_EtrianMinimapTextInput.prototype.characters = function () {
    return [
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "q", "w", "e", "r", "t", "y", "u", "i", "o", "p",
        "a", "s", "d", "f", "g", "h", "j", "k", "l", "z",
        "x", "c", "v", "b", "n", "m", " ", ",", ".", "-",
        "!", "?", "Caps", "Back", "Clear", "Save"
    ];
};

Window_EtrianMinimapTextInput.prototype.maxItems = function () {
    return this.characters().length;
};

Window_EtrianMinimapTextInput.prototype.maxCols = function () {
    return 10;
};

Window_EtrianMinimapTextInput.prototype.maxRows = function () {
    return 5;
};

Window_EtrianMinimapTextInput.prototype.itemHeight = function () {
    return this.innerHeight / this.maxRows();
};

Window_EtrianMinimapTextInput.prototype._createBackSprite = function () {
    if (GBRO.EtrianMinimap.tiBgType === "Windowskin") {
        this._backSprite = new Sprite();
        this._backSprite.addChild(new TilingSprite());
        this._container.addChild(this._backSprite);
    } else {
        this._backSprite = new Sprite(ImageManager.loadSystem(GBRO.EtrianMinimap.tiBgCustomImg));
        this._backSprite.position.set(
            GBRO.EtrianMinimap.tiBgCustomOffset[0],
            GBRO.EtrianMinimap.tiBgCustomOffset[1],
        )
        this._container.addChild(this._backSprite);
    }
};

Window_EtrianMinimapTextInput.prototype._refreshBack = function () {
    if (GBRO.EtrianMinimap.tiBgType === "Windowskin") {
        Window.prototype._refreshBack.call(this);
    }
};
