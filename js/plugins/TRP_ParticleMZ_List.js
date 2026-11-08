/*: @target MZ
 * @base TRP_ParticleMZ
 * @plugindesc List of self-made particle settings
 * @help
 * cloud1_w <weather> ＠2021/9/23
 * dark_gate_c <character> ＠2021/8/18
 * dish_steam_c <character> ＠2021/9/23
 * jump_fuss_cp <character> ＠2021/9/23
 * light_c <character> ＠2021/9/23
 * magic_circle_c2 <character> ＠2021/9/23
 * soda_c <character> ＠2021/9/23
 * test <character> ＠2021/11/3
 * window_lay <character> ＠2021/9/23
 *
 *
 * [GroupData]
 * crystal_c <character> ＠2021/9/22
 * fire_r <region> ＠2021/8/18
 * magma_r2 <character> ＠2021/8/18
 * meteor <character> ＠2021/10/27
 * shrine_c <character> ＠2021/9/22
 * skill1 <party> ＠2021/11/5
 * skill10 <party> ＠2021/11/5
 * skill11 <party> ＠2021/11/5
 * skill12 <party> ＠2021/11/5
 * skill2 <party> ＠2021/11/5
 * skill3 <party> ＠2021/11/5
 * skill4 <party> ＠2021/11/5
 * skill5 <party> ＠2021/11/5
 * skill6 <party> ＠2021/11/5
 * skill7 <party> ＠2021/11/5
 * skill8 <party> ＠2021/11/5
 * skill9 <party> ＠2021/11/5
 * smithFire_c <character> ＠2021/9/22
 * smithHit <character> ＠2021/9/22
 * test <character> ＠2021/11/4
 *
 *
 * @command set_character
 * @text set/表示 > character(6)
 * @desc パーティクル表示
 *
 * @arg id
 * @text 管理ID
 * @desc 他と被らない管理ID。「def」で設定名,「-EID」で設定名-EID
 * @default def
 *
 * @arg target
 * @text ターゲット
 * @desc thisでこのイベント。「event:イベントID」「player」「weather」など
 * @default weather
 *
 * @arg name
 * @text 《データ名》
 * @desc データ名。defとすると管理IDをデータ名として使用。（重み同じデータ名を複数表示するときは管理IDを分ける）
 * @default 《呼び出す設定を選択》
 * @type select
 * @option dark_gate_c <character> ＠2021/8/18
 * @value dark_gate_c
 * @option dish_steam_c <character> ＠2021/9/23
 * @value dish_steam_c
 * @option light_c <character> ＠2021/9/23
 * @value light_c
 * @option magic_circle_c2 <character> ＠2021/9/23
 * @value magic_circle_c2
 * @option soda_c <character> ＠2021/9/23
 * @value soda_c
 * @option window_lay <character> ＠2021/9/23
 * @value window_lay
 *
 * @arg z
 * @text Z値
 * @desc 重なり順。above:上、below:後ろ、screen、spritesetなど。数値指定も可
 * @default def
 *
 * @arg tag
 * @text 管理タグ
 * @desc 管理用のタグ名
 *
 * @arg edit
 * @text Editモード
 * @desc ONにするとエディタを呼び出し(テストプレイ時のみ有効)
 * @default false
 * @type boolean
 *
 * @arg delay
 * @text _ディレイ
 * @desc 1以上とすると、指定フレーム後にコマンドを実効
 * @default 0
 * @type number
 * @min 0
 *
 *
 * @command set_screen
 * @text set/表示 > screen/weather/region(1)
 * @desc パーティクル表示
 *
 * @arg id
 * @text 管理ID
 * @desc 他と被らない管理ID。「def」で設定名,「-EID」で設定名-EID
 * @default def
 *
 * @arg target
 * @text ターゲット
 * @desc thisでこのイベント。「event:イベントID」「player」「weather」など
 * @default this
 *
 * @arg name
 * @text 《データ名》
 * @desc データ名。defとすると管理IDをデータ名として使用。（重み同じデータ名を複数表示するときは管理IDを分ける）
 * @default 《呼び出す設定を選択》
 * @type select
 * @option cloud1_w <weather> ＠2021/9/23
 * @value cloud1_w
 *
 * @arg z
 * @text Z値
 * @desc 重なり順。above:上、below:後ろ、screen、spritesetなど。数値指定も可
 * @default def
 *
 * @arg tag
 * @text 管理タグ
 * @desc 管理用のタグ名
 *
 * @arg edit
 * @text Editモード
 * @desc ONにするとエディタを呼び出し(テストプレイ時のみ有効)
 * @default false
 * @type boolean
 *
 * @arg delay
 * @text _ディレイ
 * @desc 1以上とすると、指定フレーム後にコマンドを実効
 * @default 0
 * @type number
 * @min 0
 *
 *
 * @command play_character
 * @text play/１回再生 > character(2)
 * @desc パーティクルを１回だけ再生
 *
 * @arg id
 * @text 管理ID
 * @desc 他と被らない管理ID。「def」で設定名,「-EID」で設定名-EID
 * @default def
 *
 * @arg target
 * @text ターゲット
 * @desc thisでこのイベント。「event:イベントID」「player」「weather」など
 * @default weather
 *
 * @arg name
 * @text 《データ名》
 * @desc データ名。defとすると管理IDをデータ名として使用。（重み同じデータ名を複数表示するときは管理IDを分ける）
 * @default 《呼び出す設定を選択》
 * @type select
 * @option jump_fuss_cp <character> ＠2021/9/23
 * @value jump_fuss_cp
 * @option test <character> ＠2021/11/3
 * @value test
 *
 * @arg z
 * @text Z値
 * @desc 重なり順。above:上、below:後ろ、screen、spritesetなど。数値指定も可
 * @default def
 *
 * @arg tag
 * @text 管理タグ
 * @desc 管理用のタグ名
 *
 * @arg edit
 * @text Editモード
 * @desc ONにするとエディタを呼び出し(テストプレイ時のみ有効)
 * @default false
 * @type boolean
 *
 * @arg delay
 * @text _ディレイ
 * @desc 1以上とすると、指定フレーム後にコマンドを実効
 * @default 0
 * @type number
 * @min 0
 *
 *
 *
 *
 * @command group_character
 * @text group/グループ > character(7)
 * @desc グループ呼び出し
 * @arg id
 * @text グループ管理ID
 * @desc 他と被らないグループ用管理ID。「def」でIDは設定名、「-EID」で設定名-EID。
 * @default def
 * @arg target
 * @text 対象
 * @desc 対象。this,player,weatherなど。対象をtargetとしたコマンドで有効
 * @default this
 * @arg name
 * @text 《グループ設定名》
 * @desc 呼び出すグループの設定名
 * @type select
 * @default 《呼び出す設定を選択》
 * @option crystal_c <character> ＠2021/9/22
 * @value crystal_c
 * @option magma_r2 <character> ＠2021/8/18
 * @value magma_r2
 * @option meteor <character> ＠2021/10/27
 * @value meteor
 * @option shrine_c <character> ＠2021/9/22
 * @value shrine_c
 * @option smithFire_c <character> ＠2021/9/22
 * @value smithFire_c
 * @option smithHit <character> ＠2021/9/22
 * @value smithHit
 * @option test <character> ＠2021/11/4
 * @value test
 * @arg tag
 * @text 管理タグ
 * @desc 管理用のタグ名。省略で「group:グループID」
 * @arg edit
 * @text Editモード
 * @desc ONにするとエディタを呼び出し(テストプレイ時のみ有効)
 * @default false
 * @type boolean
 * @arg delay
 * @text _ディレイ
 * @desc 1以上とすると、指定フレーム後にコマンドを実効
 * @default 0
 * @type number
 * @min 0
 * @command group_screen
 * @text group/グループ > screen/weather/region(1)
 * @desc グループ呼び出し
 * @arg id
 * @text グループ管理ID
 * @desc 他と被らないグループ用管理ID。「def」でIDは設定名、「-EID」で設定名-EID。
 * @default def
 * @arg target
 * @text 対象
 * @desc 対象。this,player,weatherなど。対象をtargetとしたコマンドで有効
 * @default this
 * @arg name
 * @text 《グループ設定名》
 * @desc 呼び出すグループの設定名
 * @type select
 * @default 《呼び出す設定を選択》
 * @option fire_r <region> ＠2021/8/18
 * @value fire_r
 * @arg tag
 * @text 管理タグ
 * @desc 管理用のタグ名。省略で「group:グループID」
 * @arg edit
 * @text Editモード
 * @desc ONにするとエディタを呼び出し(テストプレイ時のみ有効)
 * @default false
 * @type boolean
 * @arg delay
 * @text _ディレイ
 * @desc 1以上とすると、指定フレーム後にコマンドを実効
 * @default 0
 * @type number
 * @min 0
 * @command group_others
 * @text group/グループ > Others(12)
 * @desc グループ呼び出し
 * @arg id
 * @text グループ管理ID
 * @desc 他と被らないグループ用管理ID。「def」でIDは設定名、「-EID」で設定名-EID。
 * @default def
 * @arg target
 * @text 対象
 * @desc 対象。this,player,weatherなど。対象をtargetとしたコマンドで有効
 * @default this
 * @arg name
 * @text 《グループ設定名》
 * @desc 呼び出すグループの設定名
 * @type select
 * @default 《呼び出す設定を選択》
 * @option skill1 <party> ＠2021/11/5
 * @value skill1
 * @option skill10 <party> ＠2021/11/5
 * @value skill10
 * @option skill11 <party> ＠2021/11/5
 * @value skill11
 * @option skill12 <party> ＠2021/11/5
 * @value skill12
 * @option skill2 <party> ＠2021/11/5
 * @value skill2
 * @option skill3 <party> ＠2021/11/5
 * @value skill3
 * @option skill4 <party> ＠2021/11/5
 * @value skill4
 * @option skill5 <party> ＠2021/11/5
 * @value skill5
 * @option skill6 <party> ＠2021/11/5
 * @value skill6
 * @option skill7 <party> ＠2021/11/5
 * @value skill7
 * @option skill8 <party> ＠2021/11/5
 * @value skill8
 * @option skill9 <party> ＠2021/11/5
 * @value skill9
 * @arg tag
 * @text 管理タグ
 * @desc 管理用のタグ名。省略で「group:グループID」
 * @arg edit
 * @text Editモード
 * @desc ONにするとエディタを呼び出し(テストプレイ時のみ有効)
 * @default false
 * @type boolean
 * @arg delay
 * @text _ディレイ
 * @desc 1以上とすると、指定フレーム後にコマンドを実効
 * @default 0
 * @type number
 * @min 0
 *
 *
 * @requiredAssets img/particles/particle8
 * @requiredAssets img/particles/hexagon_line1g
 * @requiredAssets img/particles/hexagon_line1
 * @requiredAssets img/particles/flame1g
 * @requiredAssets img/particles/hexagon_line3
 * @requiredAssets img/particles/hexagon1
 * @requiredAssets img/particles/smog1
 * @requiredAssets img/particles/particle1
 * @requiredAssets img/particles/flare
 * @requiredAssets img/particles/shine_thin3
 * @requiredAssets img/particles/line1
 * @requiredAssets img/particles/circle2g
 * @requiredAssets img/particles/square3
 * @requiredAssets img/particles/hexagon_line2
 * @requiredAssets img/particles/square_line2
 * @requiredAssets img/particles/square_line1
 * @requiredAssets img/particles/square1
 * @requiredAssets img/particles/circle3g
 * @requiredAssets img/particles/petal2g
 * @requiredAssets img/particles/line_ray2f
 * @requiredAssets img/particles/smoke2
 * @requiredAssets img/particles/cloud1
 * @requiredAssets img/particles/smoke1
 * @requiredAssets img/particles/smog2
 * @requiredAssets img/particles/cloud1s
 * @requiredAssets img/particles/cloud3s
 * @requiredAssets img/particles/cloud2s
 * @requiredAssets img/particles/particle6
 * @requiredAssets img/particles/particle4
 * @requiredAssets img/particles/cloud2
 * @requiredAssets img/particles/cartoon_fuss2
 * @requiredAssets img/particles/particle9
 * @requiredAssets img/particles/bubble1
 * @requiredAssets img/particles/particle7
 */