//=============================================================================
// RPG Maker MZ
//=============================================================================
/*:
 * @target MZ
 * @base DotMoveSystem
 * @orderAfter DotMoveSystem
 * @plugindesc 事件旋转轨迹与昆虫式像素移动
 * @author Qiu Jiu
 *
 * @help
 * 旋转移动：
 *
 * this.rotateMove(centerCharacter,initR,radius,speed,force);
 *
 * 宠物跟随（旧写法保持兼容）：
 *
 * this.familiarMove(12);
 * this.familiarMove(12, true); // 距离过远时允许跳到玩家附近
 * this.familiarMove(12, { avoidPlayer:true });
 * this.familiarMove(12, true, {
 *     avoidPlayer:true, explore:true, followDistance:120
 * });
 *
 * familiarMove 可调项（距离单位均为像素）：
 * followDistance     抵达后停止追赶的距离，默认 120。
 * sprintDistance     达到最大追赶加速的距离，默认 360。
 * maxCatchUpBoost    最大追赶速度加成，默认 18。
 * acceleration / deceleration  加、减速幅度。
 * avoidPlayer        是否在玩家贴近时主动后退，默认 false。
 * avoidDistance / avoidReleaseDistance  开始/结束后退的距离。
 * retreatBoost       后退时的速度加成。
 * explore            是否在无需追赶时探索四周，默认 true。
 * exploreChance      每次闲置决策开始探索的概率，默认 0.65。
 * exploreMinDistance / exploreMaxDistance  与玩家保持的探索距离带。
 * exploreStepMin / exploreStepMax  每次探步的距离，默认 6~22px。
 * exploreSpeed       探索速度相对 baseSpeed 的倍率，默认 0.28。
 * exploreSlowRadius  接近探索目标后开始缓停的距离，默认 14px。
 * followWanderAngle  跟随路线的自然摆动角度。
 * jumpDistance       needJump 开启时触发跳跃的距离，默认 420。
 *
 * 如需清除行为记忆并重新决策：this.resetFamiliarMove();
 *
 * 昆虫飞行（放进事件的“自定义移动路线 -> 脚本”，并勾选重复）：
 *
 * this.dotMoveInsect();
 * this.dotMoveInsect({ style:"mosquito" });
 * this.dotMoveInsect({
 *     style:"moth", target:-1, minDistance:1.5, maxDistance:4,
 *     territoryRadius:8, speed:1
 * });
 *
 * style 可用 fly（默认）、mosquito、moth、beetle。
 * target 默认为 -1（玩家）；事件 ID 数字表示该事件；null 表示不追逐目标。
 * territoryRadius 是相对首次调用位置的活动半径（格），0 表示不限制。
 * minDistance/maxDistance 是与目标保持的距离带（格）。
 * speed 是事件移动速度之上的倍率。
 *
 * 进阶可调项：
 * turnRate       每帧最大转向角；越大越灵活。
 * jitter         飞行中的细小摆动角度。
 * decisionMin / decisionMax  一次行为持续的帧数范围。
 * targetBias     目标引导强度，0~1。
 * cruiseSpeed / burstSpeed / jinkSpeed / orbitSpeed / hoverSpeed
 * hoverWeight / dartWeight / jinkWeight / orbitWeight / cruiseWeight
 *
 * 切换事件页或想重新记录活动中心时可调用：
 * this.resetInsectMove();
 *
 * 分节虫 / 贪吃蛇移动（四方向）：
 *
 * 蛇头的重复移动路线：
 * this.dotMoveWormHead({ spacing:28, maxSegments:8, moveSpeed:12 });
 *
 * 身体、尾端先绑定一次（index 从 1 开始）：
 * this.bindWormSegment(headEventId, index);
 *
 * 身体、尾端的重复移动路线：
 * this.dotMoveWormSegment();
 *
 * 也可以不绑定，直接在移动路线中传参：
 * this.dotMoveWormSegment({ head:12, index:3, spacing:28 });
 *
 * 头部会记录四方向折线路径；第 N 节追踪路径后方 N*spacing 像素处。
 * 运动学上整条虫是一个整体：只有蛇头接受移动碰撞，身体直接同步到蛇头
 * 已经走过的合法历史坐标，因此玩家、事件和墙角不能阻断身体跟随。
 * 身体依然是独立事件，保留对外实体碰撞、独立受击判定和独立血条。
 * Drill_EventThrough 存在时，同一条虫会自动获得唯一的内部穿透标签，
 * 不同虫、玩家和其他事件之间仍保留实体碰撞。
 *
 * 某节死亡后，将它后方各节的 index 减 1，身体就会沿旧路径自然收紧。
 * 可用 this.setWormSegmentIndex(newIndex) 修改序号。
 * 如果死亡事件只是换页而没有 erase，请先调用 clearWormSegmentBinding()，
 * 避免已经失效的部件继续保留旧绑定。
 *
 * dotMoveWormHead 可调项：
 * spacing          部件中心间距（像素），默认 28。
 * maxSegments      最大跟随节数（身体+尾端），用于决定保留多长的路径，默认 12。
 * moveSpeed        可选；蛇头移动速度。不填则保留事件自身速度。
 * turnChance       可自由转弯时每次调用的转向概率，默认 0.012。
 * minStraightFrames 转弯后至少直行的调用次数，默认 24。
 * playerBias       选择岔路时偏向玩家的概率，默认 0.25；0 为完全随机。
 * target           偏向目标，默认 -1（玩家）；null 表示没有目标偏向。
 * recordStep       路径采样间距（像素），默认 2。
 * maxHistory       最长保留路径；默认至少 24 格。
 * autoThrough      是否自动添加同虫穿透标签，默认 true。
 * playerEscape     被玩家卡死后是否短暂脱离玩家碰撞，默认 true。
 * playerEscapeDelay 连续被玩家阻挡多少次后触发，默认 6 次移动调用。
 * playerEscapeFrames 最长脱离玩家碰撞的移动调用次数，默认 30。
 *
 * dotMoveWormSegment 可调项：
 * head / headEventId  蛇头事件或事件 ID。
 * index            当前节序号，从 1 开始。
 * spacing          覆盖蛇头设定的间距。
 * autoThrough      是否自动添加同虫穿透标签，默认 true。
 *
 */
//=============================================================================
//
//=============================================================================
Game_Character.prototype.rotateMove = function(centerCharacter,initR,radius,speed,force) {
    //if (this.isMoved()) return;
    if (centerCharacter==-1) centerCharacter = $gamePlayer;
    else if (centerCharacter>0) centerCharacter = $gameMap.event(centerCharacter);
    else return;
    if (this.rotateDegree==undefined) this.rotateDegree = initR*Math.PI/180;
    if (force==undefined) force = true;
    //this._x = centerCharacter._realX + radius/48*Math.sin(this.rotateDegree);
    //this._y = centerCharacter._realY - radius/48*Math.cos(this.rotateDegree);
    this._realX = centerCharacter._realX + radius/48*Math.sin(this.rotateDegree);
    this._realY = centerCharacter._realY - radius/48*Math.cos(this.rotateDegree);    
    if (force) {
        this._realX = this._x;
        this._realY = this._y;
    }
    this.rotateDegree += speed*Math.PI/180;
};

//=============================================================================
// 宠物跟随 AI（基于 DotMoveSystem）
//=============================================================================
(() => {
    "use strict";

    const TILE_SIZE = 48;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const randomBetween = (min, max) => min + Math.random() * (max - min);
    const randomSign = () => Math.random() < 0.5 ? -1 : 1;
    const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

    function optionNumber(options, key, fallback, min, max) {
        if (!own(options, key) || options[key] === null || options[key] === "") {
            return fallback;
        }
        const value = Number(options[key]);
        return Number.isFinite(value) ? clamp(value, min, max) : fallback;
    }

    function makeFamiliarConfig(baseSpeed, options) {
        const speed = Number(baseSpeed);
        const normalizedBaseSpeed = Number.isFinite(speed) && speed >= 0 ? speed : 12;
        const followDistance = optionNumber(options, "followDistance", 120, 1, 9999);
        const sprintDistance = Math.max(
            followDistance + 1,
            optionNumber(options, "sprintDistance", 360, 1, 9999)
        );
        const avoidDistance = optionNumber(options, "avoidDistance", 64, 0, 9999);
        const avoidReleaseDistance = Math.max(
            avoidDistance + 1,
            optionNumber(options, "avoidReleaseDistance", 96, 1, 9999)
        );
        const exploreMinDistance = optionNumber(
            options,
            "exploreMinDistance",
            options.avoidPlayer === true ? avoidReleaseDistance : 52,
            0,
            9999
        );
        const exploreMaxDistance = Math.max(
            exploreMinDistance + 1,
            optionNumber(
                options,
                "exploreMaxDistance",
                Math.max(followDistance * 0.9, exploreMinDistance + 1),
                1,
                9999
            )
        );
        const exploreStepMin = optionNumber(options, "exploreStepMin", 6, 0, 9999);
        const exploreStepMax = Math.max(
            exploreStepMin + 1,
            optionNumber(options, "exploreStepMax", 22, 1, 9999)
        );
        return {
            baseSpeed: normalizedBaseSpeed,
            followDistance: followDistance,
            sprintDistance: sprintDistance,
            maxCatchUpBoost: optionNumber(options, "maxCatchUpBoost", 18, 0, 64),
            acceleration: optionNumber(options, "acceleration", 0.65, 0.01, 64),
            deceleration: optionNumber(options, "deceleration", 0.45, 0.01, 64),
            followWanderAngle: optionNumber(options, "followWanderAngle", 10, 0, 90),
            avoidPlayer: options.avoidPlayer === true,
            avoidDistance: avoidDistance,
            avoidReleaseDistance: avoidReleaseDistance,
            retreatBoost: optionNumber(options, "retreatBoost", 6, 0, 64),
            retreatWanderAngle: optionNumber(options, "retreatWanderAngle", 38, 0, 120),
            explore: options.explore !== false,
            exploreChance: optionNumber(options, "exploreChance", 0.65, 0, 1),
            exploreMinDistance: exploreMinDistance,
            exploreMaxDistance: exploreMaxDistance,
            exploreStepMin: exploreStepMin,
            exploreStepMax: exploreStepMax,
            exploreSpeed: optionNumber(options, "exploreSpeed", 0.28, 0, 4),
            exploreCurveAngle: optionNumber(options, "exploreCurveAngle", 12, 0, 60),
            exploreArrivalDistance: optionNumber(options, "exploreArrivalDistance", 3, 1, 96),
            exploreSlowRadius: optionNumber(options, "exploreSlowRadius", 14, 2, 192),
            idleMin: optionNumber(options, "idleMin", 35, 1, 3600),
            idleMax: optionNumber(options, "idleMax", 130, 1, 3600),
            exploreDurationMin: optionNumber(options, "exploreDurationMin", 90, 1, 3600),
            exploreDurationMax: optionNumber(options, "exploreDurationMax", 240, 1, 3600),
            jumpDistance: Math.max(
                sprintDistance,
                optionNumber(options, "jumpDistance", 420, 1, 9999)
            )
        };
    }

    function normalizeAngle(deg) {
        deg %= 360;
        return deg < 0 ? deg + 360 : deg;
    }

    function angleFromDelta(dx, dy) {
        return normalizeAngle(Math.atan2(dy, dx) * 180 / Math.PI + 90);
    }

    function frameCount() {
        return typeof Graphics !== "undefined" ? Graphics.frameCount : 0;
    }

    function createFamiliarState(config) {
        return {
            version: 3,
            lastFrame: frameCount(),
            mode: "idle",
            decisionLeft: randomBetween(config.idleMin, config.idleMax),
            followOffset: 0,
            followOffsetTarget: 0,
            followTurnLeft: 0,
            followBlocked: 0,
            retreating: false,
            retreatOffset: randomSign() * randomBetween(0, config.retreatWanderAngle),
            retreatTurnLeft: 0,
            exploreX: null,
            exploreY: null,
            exploreLeft: 0,
            exploreCurve: 0,
            exploreCurveTarget: 0,
            exploreTurnLeft: 0,
            exploreBlocked: 0
        };
    }

    function elapsedFrames(state) {
        const now = frameCount();
        let elapsed = now - state.lastFrame;
        // 读档后 Graphics.frameCount 可能比存档中的值小。
        if (!Number.isFinite(elapsed) || elapsed < 1) elapsed = 1;
        state.lastFrame = now;
        return clamp(elapsed, 1, 6);
    }

    function approachMoveSpeed(character, targetSpeed, config, elapsed) {
        const current = Number.isFinite(Number(character._moveSpeed))
            ? Number(character._moveSpeed)
            : config.baseSpeed;
        const amount = (targetSpeed > current ? config.acceleration : config.deceleration) * elapsed;
        const next = current + clamp(targetSpeed - current, -amount, amount);
        character.setMoveSpeed(next);
        return next;
    }

    function movedAfter(character, beforeX, beforeY) {
        const dx = $gameMap.deltaX(character._realX, beforeX);
        const dy = $gameMap.deltaY(character._realY, beforeY);
        return Math.abs(dx) > 0.000001 || Math.abs(dy) > 0.000001;
    }

    function dotMoveAndCheck(character, deg) {
        const beforeX = character._realX;
        const beforeY = character._realY;
        character.dotMoveByDeg(normalizeAngle(deg));
        return movedAfter(character, beforeX, beforeY);
    }

    function enterIdle(state, config) {
        state.mode = "idle";
        state.decisionLeft = randomBetween(config.idleMin, config.idleMax);
        state.exploreX = null;
        state.exploreY = null;
        state.exploreLeft = 0;
        state.exploreBlocked = 0;
    }

    function distanceToPlayerAt(x, y) {
        const dx = $gameMap.deltaX($gamePlayer._realX, x);
        const dy = $gameMap.deltaY($gamePlayer._realY, y);
        return Math.sqrt(dx * dx + dy * dy) * TILE_SIZE;
    }

    function explorationCandidateScore(x, y, config) {
        const playerFar = distanceToPlayerAt(x, y);
        let score = Math.random() * 2;
        if (playerFar < config.exploreMinDistance) {
            score += config.exploreMinDistance - playerFar;
        } else if (playerFar > config.exploreMaxDistance) {
            score += playerFar - config.exploreMaxDistance;
        }
        // 不让闲逛目标越过追赶边界，否则宠物会刚探索就立刻折返。
        if (playerFar > config.followDistance) {
            score += (playerFar - config.followDistance) * 4;
        }
        return score;
    }

    function beginExploration(character, state, config) {
        // 围绕宠物当前位置挑选多个短距离候选点，再选最符合玩家距离带的一个。
        // 这样既有随机性，又不会为了探索一次横跨一整格甚至更远。
        let best = null;
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const step = randomBetween(config.exploreStepMin, config.exploreStepMax) / TILE_SIZE;
            const x = $gameMap.roundX(character._realX + Math.cos(angle) * step);
            const y = $gameMap.roundY(character._realY + Math.sin(angle) * step);
            const score = explorationCandidateScore(x, y, config);
            if (!best || score < best.score) best = { x: x, y: y, score: score };
        }
        state.exploreX = best.x;
        state.exploreY = best.y;
        state.exploreLeft = randomBetween(config.exploreDurationMin, config.exploreDurationMax);
        state.exploreCurve = 0;
        state.exploreCurveTarget = randomBetween(-config.exploreCurveAngle, config.exploreCurveAngle);
        state.exploreTurnLeft = randomBetween(25, 70);
        state.exploreBlocked = 0;
        state.mode = "explore";
    }

    function updateFacingWhenFollowing(character, deg) {
        if (typeof character.dotMoveTempData !== "function" ||
            typeof character.isPrecedingCharacterNearDirection !== "function") {
            return;
        }
        const tempData = character.dotMoveTempData();
        if (!tempData) return;
        if (!Number.isFinite(tempData.sameDirectionTotalDpf)) {
            tempData.sameDirectionTotalDpf = 0;
        }
        if (character.isPrecedingCharacterNearDirection($gamePlayer, deg)) {
            tempData.sameDirectionTotalDpf += character.distancePerFrame();
            if (tempData.sameDirectionTotalDpf >= 1) {
                character.setDirection($gamePlayer.direction());
                tempData.sameDirectionTotalDpf = 0;
            }
        } else {
            tempData.sameDirectionTotalDpf = 0;
        }
    }

    function tryFamiliarJump(character, far, config, needJump, state) {
        if (!needJump || far < config.jumpDistance) return false;
        if (character.isJumping()) return true;
        if (typeof $gameMap.drill_COFA_getShapePointsWithCondition !== "function") return false;
        const conditions = typeof DrillUp !== "undefined" ? DrillUp.g_COFA_condition_list : null;
        const condition = conditions ? conditions[10] : null;
        const playerX = Number.isFinite($gamePlayer._x) ? $gamePlayer._x : $gamePlayer._realX;
        const playerY = Number.isFinite($gamePlayer._y) ? $gamePlayer._y : $gamePlayer._realY;
        const area = $gameMap.drill_COFA_getShapePointsWithCondition(
            Math.floor(playerX),
            Math.floor(playerY),
            "圆形区域",
            2,
            condition
        );
        if (!area || area.length === 0) return false;

        const point = area[Math.floor(Math.random() * area.length)];
        const currentX = Number.isFinite(character._x) ? character._x : character._realX;
        const currentY = Number.isFinite(character._y) ? character._y : character._realY;
        character._drill_JSp = character._drill_JSp || {};
        character._drill_JSp.enabled = true;
        character._drill_JSp.height = Math.round(60 + far / 40);
        character._drill_JSp.time = Math.round(30 + far / 20);
        character._drill_JSp.speed = -1;
        character.jump(Math.floor(point.x - currentX), Math.floor(point.y - currentY));
        enterIdle(state, config);
        if (typeof AudioManager !== "undefined") {
            AudioManager.playSe({
                name: "Jump2",
                volume: 80,
                pitch: 80 + Math.floor(Math.random() * 40),
                pan: 0
            });
        }
        return true;
    }

    function updateRetreat(character, state, config, elapsed) {
        state.mode = "retreat";
        state.retreatTurnLeft -= elapsed;
        if (state.retreatTurnLeft <= 0) {
            state.retreatOffset = randomSign() * randomBetween(0, config.retreatWanderAngle);
            state.retreatTurnLeft = randomBetween(22, 65);
        }
        approachMoveSpeed(character, config.baseSpeed + config.retreatBoost, config, elapsed);
        const awayDeg = normalizeAngle(character.calcDeg($gamePlayer) + 180 + state.retreatOffset);
        if (!dotMoveAndCheck(character, awayDeg)) {
            state.retreatOffset = normalizeAngle(state.retreatOffset + randomSign() * randomBetween(70, 120));
            state.retreatTurnLeft = 1;
        }
    }

    function updateFollow(character, state, config, far, elapsed) {
        if (state.mode !== "follow") {
            state.mode = "follow";
            state.followTurnLeft = 0;
            state.followBlocked = 0;
        }
        const ratio = clamp(
            (far - config.followDistance) / (config.sprintDistance - config.followDistance),
            0,
            1
        );
        const catchUpBoost = config.maxCatchUpBoost * Math.pow(ratio, 0.55);
        approachMoveSpeed(character, config.baseSpeed + catchUpBoost, config, elapsed);

        state.followTurnLeft -= elapsed;
        if (state.followTurnLeft <= 0) {
            state.followOffsetTarget = randomBetween(-config.followWanderAngle, config.followWanderAngle);
            state.followTurnLeft = randomBetween(18, 55);
        }
        state.followOffset += (state.followOffsetTarget - state.followOffset) * clamp(0.09 * elapsed, 0, 1);
        const farDirectness = 1 - ratio * 0.85;
        const deg = normalizeAngle(character.calcDeg($gamePlayer) + state.followOffset * farDirectness);
        if (dotMoveAndCheck(character, deg)) {
            state.followBlocked = 0;
            updateFacingWhenFollowing(character, deg);
        } else {
            state.followBlocked++;
            state.followOffsetTarget = randomSign() * randomBetween(
                config.followWanderAngle,
                Math.max(config.followWanderAngle, 55)
            );
            state.followTurnLeft = 1;
        }
    }

    function updateExploration(character, state, config, elapsed) {
        state.exploreLeft -= elapsed;
        if (state.exploreLeft <= 0 || state.exploreX === null || state.exploreY === null) {
            enterIdle(state, config);
            return;
        }
        const dx = $gameMap.deltaX(state.exploreX, character._realX);
        const dy = $gameMap.deltaY(state.exploreY, character._realY);
        const targetFar = Math.sqrt(dx * dx + dy * dy) * TILE_SIZE;
        if (targetFar <= config.exploreArrivalDistance) {
            enterIdle(state, config);
            return;
        }

        state.exploreTurnLeft -= elapsed;
        if (state.exploreTurnLeft <= 0) {
            state.exploreCurveTarget = randomBetween(-config.exploreCurveAngle, config.exploreCurveAngle);
            state.exploreTurnLeft = randomBetween(25, 70);
        }
        state.exploreCurve += (state.exploreCurveTarget - state.exploreCurve) * clamp(0.08 * elapsed, 0, 1);

        // 宠物闲置时虽然没有位移，但 _moveSpeed 通常已经回升到 baseSpeed。
        // 如果仍用普通减速度过渡，短短十几像素的探步会在减速完成前就走完，看起来像突然抽动。
        // 因此探索开始后立刻限制最高速度，并在接近目标时继续平滑缓停。
        const exploreTopSpeed = config.baseSpeed * config.exploreSpeed;
        if (Number(character._moveSpeed) > exploreTopSpeed) {
            character.setMoveSpeed(exploreTopSpeed);
        }
        const slowRadius = Math.max(config.exploreArrivalDistance + 1, config.exploreSlowRadius);
        const slowRatio = clamp(
            (targetFar - config.exploreArrivalDistance) /
                (slowRadius - config.exploreArrivalDistance),
            0.2,
            1
        );
        approachMoveSpeed(character, exploreTopSpeed * slowRatio, config, elapsed);
        const deg = angleFromDelta(dx, dy) + state.exploreCurve;
        if (dotMoveAndCheck(character, deg)) {
            state.exploreBlocked = 0;
        } else {
            state.exploreBlocked++;
            state.exploreCurveTarget = randomSign() * randomBetween(
                config.exploreCurveAngle,
                Math.max(config.exploreCurveAngle, 55)
            );
            state.exploreTurnLeft = 1;
            if (state.exploreBlocked >= 6) enterIdle(state, config);
        }
    }

    Game_Character.prototype.familiarMove = function(baseSpeed, needJump, options) {
        // 允许 familiarMove(12, { ... })，同时兼容 familiarMove(12, true, { ... })。
        if (needJump && typeof needJump === "object") {
            options = needJump;
            needJump = options.needJump === true;
        }
        options = options || {};

        // 猪猪存钱罐追逐金钱时，专用追逐逻辑优先，避免两套移动互相拉扯。
        if (this._chasingMoney != null) {
            const money = typeof $gameMap.bulletQJ === "function"
                ? $gameMap.bulletQJ(this._chasingMoney)
                : null;
            if (money && !money.dead) return false;
            this._chasingMoney = null;
        }
        if (this._moverData && this._moverData.targetFar > 0) return false;

        const config = makeFamiliarConfig(baseSpeed, options);
        let state = this._familiarMoveState;
        if (!state || state.version !== 3) {
            state = this._familiarMoveState = createFamiliarState(config);
        }
        const elapsed = elapsedFrames(state);
        const far = this.calcDistance(-1);

        if (tryFamiliarJump(this, far, config, !!needJump, state)) return true;
        if (this.isJumping()) return false;

        if (config.avoidPlayer) {
            if (far < config.avoidDistance) state.retreating = true;
            if (far >= config.avoidReleaseDistance) state.retreating = false;
        } else {
            state.retreating = false;
        }

        if (state.retreating) {
            updateRetreat(this, state, config, elapsed);
            return true;
        }
        if (far > config.followDistance) {
            state.exploreX = null;
            state.exploreY = null;
            updateFollow(this, state, config, far, elapsed);
            return true;
        }

        if (state.mode === "follow" || state.mode === "retreat" ||
            (!config.explore && state.mode === "explore")) {
            enterIdle(state, config);
        }
        if (state.mode === "explore") {
            updateExploration(this, state, config, elapsed);
            return true;
        }

        approachMoveSpeed(this, config.baseSpeed, config, elapsed);
        state.decisionLeft -= elapsed;
        if (config.explore && state.decisionLeft <= 0) {
            if (Math.random() < config.exploreChance) {
                beginExploration(this, state, config);
                updateExploration(this, state, config, elapsed);
                return true;
            }
            state.decisionLeft = randomBetween(config.idleMin, config.idleMax);
        }
        return false;
    };

    Game_Character.prototype.resetFamiliarMove = function() {
        this._familiarMoveState = null;
    };
})();

Game_Character.prototype.isPrecedingCharacterNearDirection = function (character, moveDeg) {
        const dir8 = (new Degree(moveDeg)).toDirection8();
        if (dir8 % 2 === 0) {
            if (dir8 === character.direction())
                return true;
        }
        else {
            switch (dir8) {
                case 9:
                    if (character.direction() === 8 || character.direction() === 6)
                        return true;
                    break;
                case 3:
                    if (character.direction() === 6 || character.direction() === 2)
                        return true;
                    break;
                case 1:
                    if (character.direction() === 2 || character.direction() === 4)
                        return true;
                    break;
                case 7:
                    if (character.direction() === 4 || character.direction() === 8)
                        return true;
                    break;
            }
        }
        return false;
    };

    class Degree {
        get value() {
            return this._value;
        }
        static fromDirection(direction) {
            switch (direction) {
                case 8:
                    return Degree.UP;
                case 9:
                    return Degree.UP_RIGHT;
                case 6:
                    return Degree.RIGHT;
                case 3:
                    return Degree.RIGHT_DOWN;
                case 2:
                    return Degree.DOWN;
                case 1:
                    return Degree.DOWN_LEFT;
                case 4:
                    return Degree.LEFT;
                case 7:
                    return Degree.LEFT_UP;
                default:
                    throw new Error(`${direction} is not found`);
            }
        }
        static fromRad(rad) {
            return new Degree((rad * 180 / Math.PI) + 90);
        }
        constructor(...args) {
            this.initialize(...args);
        }
        initialize(value) {
            value %= 360;
            if (value < 0)
                value = 360 + value;
            this._value = value;
        }
        toRad() {
            return (this._value - 90) * Math.PI / 180;
        }
        toDirection8() {
            const t = Math.round(this._value / 45);
            if (t === 0 || t === 8) {
                return 8;
            }
            else if (t === 1) {
                return 9;
            }
            else if (t === 2) {
                return 6;
            }
            else if (t === 3) {
                return 3;
            }
            else if (t === 4) {
                return 2;
            }
            else if (t === 5) {
                return 1;
            }
            else if (t === 6) {
                return 4;
            }
            else if (t === 7) {
                return 7;
            }
            else {
                throw new Error(`${this._value} is not found`);
            }
        }
        toDirection4(lastDirection) {
            const t = Math.round(this._value / 45);
            if (t === 0 || t === 8) {
                return 8;
            }
            else if (t === 1) {
                if (lastDirection === 8)
                    return 8;
                return 6;
            }
            else if (t === 2) {
                return 6;
            }
            else if (t === 3) {
                if (lastDirection === 6)
                    return 6;
                return 2;
            }
            else if (t === 4) {
                return 2;
            }
            else if (t === 5) {
                if (lastDirection === 2)
                    return 2;
                return 4;
            }
            else if (t === 6) {
                return 4;
            }
            else if (t === 7) {
                if (lastDirection === 4)
                    return 4;
                return 8;
            }
            else {
                throw new Error(`${this._value} is not found`);
            }
        }
    }
    Degree.UP = new Degree(0);
    Degree.UP_RIGHT = new Degree(45);
    Degree.RIGHT = new Degree(90);
    Degree.RIGHT_DOWN = new Degree(135);
    Degree.DOWN = new Degree(180);
    Degree.DOWN_LEFT = new Degree(225);
    Degree.LEFT = new Degree(270);
    Degree.LEFT_UP = new Degree(315);
    DotMoveSystem.Degree = Degree;

    Game_Character.prototype.changeFollowerSpeed = function (baseSpeed, precedingCharacterFar) {
        this.setMoveSpeed(this.calcFollowerSpeed(baseSpeed, precedingCharacterFar));
    };
    Game_Character.prototype.calcFollowerSpeed = function (baseSpeed, precedingCharacterFar) {
        if (precedingCharacterFar >= 192) {
            return baseSpeed + 12;
        }
        else if (precedingCharacterFar >= 128) {
            return baseSpeed + 6;
        }
        else if (precedingCharacterFar >= 64) {
            return baseSpeed;
        }
        else if (precedingCharacterFar >= 48) {
            return baseSpeed - 4;
        }
        else {
            return 0;
        }
    };

Game_Map.prototype.checkEventDistances = function(targetId, dis) {
    var targetEvent = this.event(targetId);
    var closeEvents = [];
    this.events().forEach(function(event) {
        // Skip the target event itself
        if (event.eventId() === targetId) {
            return;
        }
        var distance = targetEvent.calcDistance(event.eventId());
        if (distance <= dis) {
            closeEvents.push(event.eventId());
        }
    });
    $gameNumberArray.setValue(33, closeEvents);
};

Game_Map.prototype.KnockBack = function(user, target, distance) {
    // 预处理 user 对象
    if (user === -1) {
        user = $gamePlayer;
    } else if (user > 0) {
        user = $gameMap.event(user);
    }

    // 如果 user 对象不存在，直接返回
    if (!user) {
        return;
    }

    // 预处理 target 对象
    if (target === -1) {
        target = $gamePlayer;
    } else if (target > 0) {
        target = $gameMap.event(target);
    }

    // 如果 target 对象不存在，直接返回
    if (!target) {
        return;
    }

    // 计算 user 和 target 的位置
    let ax = (user._realX + 0.5 - $gameMap.displayX()) * 48;
    let ay = (user._realY + 0.5 - $gameMap.displayY()) * 48;
    let bx = (target._realX + 0.5 - $gameMap.displayX()) * 48;
    let by = (target._realY + 0.5 - $gameMap.displayY()) * 48;

    // 计算角度并执行 KnockBack
    let deg = QJ.calculateAngleByTwoPointAngle(ax, ay, bx, by);
    deg = Math.round((deg * 180) / Math.PI);
    target.smartJumpByDeg(deg, distance, 14, false);
};


//=============================================================================
// 昆虫式飞行 AI（基于 DotMoveSystem）
// - 相关随机转向：方向连续变化，不会像逐帧随机数那样机械抖动。
// - 多状态节奏：巡航、急冲、折返、盘旋、停悬随机交替。
// - 目标距离带与出生点领地只提供软引导，保留难以预测的局部轨迹。
// - 碰壁后快速折返；所有状态都只保存普通数据，可安全进入存档。
//=============================================================================
(() => {
    "use strict";

    const STYLES = {
        fly: {
            decisionMin: 12, decisionMax: 42,
            turnRate: 9, jitter: 6, wobbleSpeed: 0.18,
            cruiseSpeed: 0.95, burstSpeed: 1.65, jinkSpeed: 1.05,
            orbitSpeed: 0.8, hoverSpeed: 0,
            hoverWeight: 0.07, dartWeight: 0.25, jinkWeight: 0.2,
            orbitWeight: 0.23, cruiseWeight: 0.25,
            targetBias: 0.62, minDistance: 1.25, maxDistance: 4.5,
            territoryRadius: 8
        },
        mosquito: {
            decisionMin: 5, decisionMax: 22,
            turnRate: 18, jitter: 12, wobbleSpeed: 0.32,
            cruiseSpeed: 1.05, burstSpeed: 1.9, jinkSpeed: 1.15,
            orbitSpeed: 0.9, hoverSpeed: 0,
            hoverWeight: 0.18, dartWeight: 0.28, jinkWeight: 0.28,
            orbitWeight: 0.1, cruiseWeight: 0.16,
            targetBias: 0.5, minDistance: 0.8, maxDistance: 3.2,
            territoryRadius: 7
        },
        moth: {
            decisionMin: 16, decisionMax: 55,
            turnRate: 5.5, jitter: 5, wobbleSpeed: 0.12,
            cruiseSpeed: 0.75, burstSpeed: 1.3, jinkSpeed: 0.75,
            orbitSpeed: 0.65, hoverSpeed: 0,
            hoverWeight: 0.14, dartWeight: 0.1, jinkWeight: 0.1,
            orbitWeight: 0.38, cruiseWeight: 0.28,
            targetBias: 0.74, minDistance: 1.3, maxDistance: 3.8,
            territoryRadius: 7
        },
        beetle: {
            decisionMin: 18, decisionMax: 60,
            turnRate: 3.8, jitter: 2.5, wobbleSpeed: 0.1,
            cruiseSpeed: 0.85, burstSpeed: 1.5, jinkSpeed: 0.9,
            orbitSpeed: 0.7, hoverSpeed: 0,
            hoverWeight: 0.03, dartWeight: 0.18, jinkWeight: 0.1,
            orbitWeight: 0.14, cruiseWeight: 0.55,
            targetBias: 0.68, minDistance: 1.5, maxDistance: 5,
            territoryRadius: 10
        }
    };

    const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const randomBetween = (min, max) => min + Math.random() * (max - min);
    const randomSign = () => Math.random() < 0.5 ? -1 : 1;

    function numberOption(options, key, fallback, min, max) {
        if (!own(options, key) || options[key] === null || options[key] === "") {
            return fallback;
        }
        const value = Number(options[key]);
        if (!Number.isFinite(value)) return fallback;
        return clamp(value, min, max);
    }

    function normalizeAngle(deg) {
        deg %= 360;
        return deg < 0 ? deg + 360 : deg;
    }

    function angleDelta(from, to) {
        return ((to - from + 540) % 360) - 180;
    }

    function blendAngle(from, to, weight) {
        return normalizeAngle(from + angleDelta(from, to) * clamp(weight, 0, 1));
    }

    function approachAngle(from, to, maxStep) {
        const delta = angleDelta(from, to);
        return normalizeAngle(from + clamp(delta, -maxStep, maxStep));
    }

    // DotMove 角度：0=上、90=右、180=下、270=左。
    function angleFromVector(dx, dy) {
        return normalizeAngle(Math.atan2(dy, dx) * 180 / Math.PI + 90);
    }

    function resolveTarget(value) {
        if (value === undefined || value === -1) return $gamePlayer;
        if (typeof value === "number") {
            return value > 0 ? $gameMap.event(value) : null;
        }
        return value && Number.isFinite(value._realX) && Number.isFinite(value._realY)
            ? value
            : null;
    }

    function makeConfig(options) {
        const styleName = own(STYLES, options.style) ? options.style : "fly";
        const style = STYLES[styleName];
        let decisionMin = numberOption(options, "decisionMin", style.decisionMin, 1, 600);
        let decisionMax = numberOption(options, "decisionMax", style.decisionMax, 1, 600);
        if (decisionMin > decisionMax) {
            const swap = decisionMin;
            decisionMin = decisionMax;
            decisionMax = swap;
        }
        const minDistance = numberOption(options, "minDistance", style.minDistance, 0, 999);
        const maxDistance = Math.max(
            minDistance + 0.01,
            numberOption(options, "maxDistance", style.maxDistance, 0.01, 999)
        );
        return {
            styleName: styleName,
            decisionMin: decisionMin,
            decisionMax: decisionMax,
            turnRate: numberOption(options, "turnRate", style.turnRate, 0.1, 180),
            jitter: numberOption(options, "jitter", style.jitter, 0, 180),
            wobbleSpeed: numberOption(options, "wobbleSpeed", style.wobbleSpeed, 0, 10),
            speed: numberOption(options, "speed", 1, 0, 10),
            cruiseSpeed: numberOption(options, "cruiseSpeed", style.cruiseSpeed, 0, 10),
            burstSpeed: numberOption(options, "burstSpeed", style.burstSpeed, 0, 10),
            jinkSpeed: numberOption(options, "jinkSpeed", style.jinkSpeed, 0, 10),
            orbitSpeed: numberOption(options, "orbitSpeed", style.orbitSpeed, 0, 10),
            hoverSpeed: numberOption(options, "hoverSpeed", style.hoverSpeed, 0, 10),
            hoverWeight: numberOption(options, "hoverWeight", style.hoverWeight, 0, 100),
            dartWeight: numberOption(options, "dartWeight", style.dartWeight, 0, 100),
            jinkWeight: numberOption(options, "jinkWeight", style.jinkWeight, 0, 100),
            orbitWeight: numberOption(options, "orbitWeight", style.orbitWeight, 0, 100),
            cruiseWeight: numberOption(options, "cruiseWeight", style.cruiseWeight, 0, 100),
            targetBias: numberOption(options, "targetBias", style.targetBias, 0, 1),
            minDistance: minDistance,
            maxDistance: maxDistance,
            territoryRadius: numberOption(options, "territoryRadius", style.territoryRadius, 0, 999)
        };
    }

    function createState(character, config, options) {
        const heading = Math.random() * 360;
        const home = options.home;
        const homeX = home && Number.isFinite(Number(home.x)) ? Number(home.x) : character._realX;
        const homeY = home && Number.isFinite(Number(home.y)) ? Number(home.y) : character._realY;
        return {
            version: 1,
            styleName: config.styleName,
            homeX: homeX,
            homeY: homeY,
            heading: heading,
            wanderHeading: heading,
            mode: "cruise",
            modeLeft: 0,
            orbitSign: randomSign(),
            phase: Math.random() * 1000,
            speedVariance: 1,
            blockedFrames: 0
        };
    }

    function weightedMode(config) {
        const entries = [
            ["hover", config.hoverWeight],
            ["dart", config.dartWeight],
            ["jink", config.jinkWeight],
            ["orbit", config.orbitWeight],
            ["cruise", config.cruiseWeight]
        ];
        const total = entries.reduce((sum, entry) => sum + entry[1], 0);
        if (total <= 0) return "cruise";
        let roll = Math.random() * total;
        for (const entry of entries) {
            roll -= entry[1];
            if (roll <= 0) return entry[0];
        }
        return "cruise";
    }

    function chooseNextBehavior(state, config) {
        state.mode = weightedMode(config);
        let durationScale = 1;
        if (state.mode === "hover") durationScale = 0.45;
        if (state.mode === "dart") durationScale = 0.55;
        if (state.mode === "jink") durationScale = 0.4;
        if (state.mode === "orbit") durationScale = 1.35;
        state.modeLeft = Math.max(1, Math.round(
            randomBetween(config.decisionMin, config.decisionMax) * durationScale
        ));
        state.speedVariance = randomBetween(0.86, 1.14);

        if (state.mode === "jink") {
            state.wanderHeading = normalizeAngle(
                state.heading + randomSign() * randomBetween(75, 165)
            );
        } else if (state.mode === "dart") {
            state.wanderHeading = normalizeAngle(
                state.heading + randomSign() * randomBetween(10, 65)
            );
        } else if (state.mode === "hover") {
            state.wanderHeading = normalizeAngle(
                state.heading + randomSign() * randomBetween(25, 95)
            );
        } else if (state.mode === "orbit") {
            state.wanderHeading = normalizeAngle(state.heading + randomBetween(-30, 30));
            if (Math.random() < 0.25) state.orbitSign *= -1;
        } else {
            state.wanderHeading = normalizeAngle(state.heading + randomBetween(-75, 75));
        }
    }

    function homeGuidance(character, state, config) {
        if (config.territoryRadius <= 0) return null;
        const dx = $gameMap.deltaX(state.homeX, character._realX);
        const dy = $gameMap.deltaY(state.homeY, character._realY);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= config.territoryRadius) return null;
        const excessRatio = (distance - config.territoryRadius) / config.territoryRadius;
        return {
            heading: angleFromVector(dx, dy),
            weight: clamp(0.72 + excessRatio * 0.2, 0.72, 0.95)
        };
    }

    function targetGuidance(character, target, state, config) {
        if (!target || config.targetBias <= 0) return null;
        const dx = $gameMap.deltaX(target._realX, character._realX);
        const dy = $gameMap.deltaY(target._realY, character._realY);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const toward = angleFromVector(dx, dy);

        if (distance < 0.0001) {
            return { heading: normalizeAngle(state.heading + 180), weight: config.targetBias };
        }
        if (distance > config.maxDistance) {
            const ratio = clamp((distance - config.maxDistance) / config.maxDistance, 0, 1);
            return {
                heading: toward,
                weight: clamp(config.targetBias * (0.65 + ratio * 0.35), 0, 1)
            };
        }
        if (distance < config.minDistance) {
            return {
                heading: normalizeAngle(toward + 180),
                weight: clamp(Math.max(0.68, config.targetBias), 0, 1)
            };
        }

        const middle = (config.minDistance + config.maxDistance) / 2;
        const halfBand = Math.max(0.01, (config.maxDistance - config.minDistance) / 2);
        if (state.mode === "orbit") {
            const ux = dx / distance;
            const uy = dy / distance;
            const correction = clamp((distance - middle) / halfBand, -0.75, 0.75);
            const vx = -uy * state.orbitSign + ux * correction;
            const vy = ux * state.orbitSign + uy * correction;
            return { heading: angleFromVector(vx, vy), weight: config.targetBias };
        }

        // 非盘旋状态只做轻微的径向修正，让急冲和折返仍有足够自由度。
        const radialError = (distance - middle) / halfBand;
        if (Math.abs(radialError) < 0.35) return null;
        return {
            heading: radialError > 0 ? toward : normalizeAngle(toward + 180),
            weight: config.targetBias * 0.3
        };
    }

    function modeTurnScale(mode) {
        if (mode === "jink") return 2.35;
        if (mode === "hover") return 1.35;
        if (mode === "orbit") return 0.8;
        if (mode === "dart") return 0.58;
        return 1;
    }

    function modeSpeed(config, mode) {
        if (mode === "hover") return config.hoverSpeed;
        if (mode === "dart") return config.burstSpeed;
        if (mode === "jink") return config.jinkSpeed;
        if (mode === "orbit") return config.orbitSpeed;
        return config.cruiseSpeed;
    }

    function reboundFromObstacle(state, config) {
        state.blockedFrames++;
        const rebound = randomSign() * randomBetween(105, 215);
        state.heading = normalizeAngle(state.heading + rebound);
        state.wanderHeading = state.heading;
        state.mode = "jink";
        state.modeLeft = Math.max(3, Math.round(config.decisionMin * 0.5));
        state.orbitSign *= -1;
    }

    Game_Character.prototype.dotMoveInsect = function(options) {
        options = options || {};
        const config = makeConfig(options);
        let state = this._insectMoveState;
        if (!state || state.version !== 1) {
            state = this._insectMoveState = createState(this, config, options);
        }
        if (state.styleName !== config.styleName) {
            state.styleName = config.styleName;
            state.modeLeft = 0;
        }
        if (options.home && Number.isFinite(Number(options.home.x)) && Number.isFinite(Number(options.home.y))) {
            state.homeX = Number(options.home.x);
            state.homeY = Number(options.home.y);
        }

        state.modeLeft--;
        if (state.modeLeft <= 0) chooseNextBehavior(state, config);

        const target = resolveTarget(options.target);
        const guidance = homeGuidance(this, state, config) ||
            targetGuidance(this, target, state, config);
        const desiredHeading = guidance
            ? blendAngle(state.wanderHeading, guidance.heading, guidance.weight)
            : state.wanderHeading;
        state.heading = approachAngle(
            state.heading,
            desiredHeading,
            config.turnRate * modeTurnScale(state.mode)
        );

        const frame = typeof Graphics !== "undefined" ? Graphics.frameCount : 0;
        const wobble = Math.sin((frame + state.phase) * config.wobbleSpeed) * config.jitter +
            Math.sin((frame + state.phase * 1.7) * config.wobbleSpeed * 0.43) * config.jitter * 0.45 +
            (Math.random() - 0.5) * config.jitter * 0.12;
        const moveDegree = normalizeAngle(state.heading + wobble);
        const pulse = 1 + Math.sin((frame + state.phase) * config.wobbleSpeed * 0.35) * 0.12;
        const speedScale = config.speed * modeSpeed(config, state.mode) * state.speedVariance * pulse;
        if (speedScale <= 0) return false;

        const moverData = typeof this.moverData === "function" ? this.moverData() : null;
        if (moverData && moverData.stopping) return false;
        const dpf = this.distancePerFrame() * speedScale;
        if (!Number.isFinite(dpf) || dpf <= 0) return false;

        const beforeX = this._realX;
        const beforeY = this._realY;
        this.mover().dotMoveByDeg(new DotMoveSystem.Degree(moveDegree), dpf);
        this._dotMovingCounter = 5;

        const movedX = $gameMap.deltaX(this._realX, beforeX);
        const movedY = $gameMap.deltaY(this._realY, beforeY);
        const moved = Math.abs(movedX) > 0.000001 || Math.abs(movedY) > 0.000001;
        if (moved) {
            state.blockedFrames = 0;
        } else {
            reboundFromObstacle(state, config);
        }
        return moved;
    };

    Game_Character.prototype.resetInsectMove = function() {
        this._insectMoveState = null;
    };
})();


//=============================================================================
// ** 分节虫 / 贪吃蛇：四方向轨迹记录与分节追随
//=============================================================================
(() => {
    "use strict";

    const TILE_SIZE = 48;
    const CARDINAL_DIRECTIONS = [2, 4, 6, 8];
    const DIRECTION_DEGREES = { 2: 180, 4: 270, 6: 90, 8: 0 };
    const DIRECTION_VECTORS = {
        2: { x: 0, y: 1 },
        4: { x: -1, y: 0 },
        6: { x: 1, y: 0 },
        8: { x: 0, y: -1 }
    };
    const PERPENDICULAR_DIRECTIONS = {
        2: [4, 6],
        4: [8, 2],
        6: [2, 8],
        8: [6, 4]
    };
    const REVERSE_DIRECTIONS = { 2: 8, 4: 6, 6: 4, 8: 2 };

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function finiteNumber(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function isCardinalDirection(direction) {
        return CARDINAL_DIRECTIONS.includes(Number(direction));
    }

    function currentCardinalDirection(character, fallback) {
        const direction = Number(character.direction());
        if (isCardinalDirection(direction)) return direction;
        if (isCardinalDirection(fallback)) return Number(fallback);
        return CARDINAL_DIRECTIONS[Math.floor(Math.random() * CARDINAL_DIRECTIONS.length)];
    }

    function deltaBetween(fromX, fromY, toX, toY) {
        return {
            x: $gameMap.deltaX(toX, fromX),
            y: $gameMap.deltaY(toY, fromY)
        };
    }

    function distancePixels(fromX, fromY, toX, toY) {
        const delta = deltaBetween(fromX, fromY, toX, toY);
        return Math.sqrt(delta.x * delta.x + delta.y * delta.y) * TILE_SIZE;
    }

    function eventIdOf(character) {
        if (!character) return 0;
        if (typeof character.eventId === "function") return Number(character.eventId()) || 0;
        return Number(character._eventId) || 0;
    }

    function resolveCharacter(value) {
        if (value && typeof value === "object" && Number.isFinite(value._realX)) return value;
        const id = Number(value);
        if (id === -1) return $gamePlayer;
        if (id > 0) return $gameMap.event(id);
        return null;
    }

    function wormThroughTag(head) {
        if (head._qjWormThroughTag) return head._qjWormThroughTag;
        const mapId = typeof $gameMap.mapId === "function" ? $gameMap.mapId() : 0;
        const eventId = eventIdOf(head);
        head._qjWormThroughTag = "qj_worm_" + mapId + "_" + eventId;
        return head._qjWormThroughTag;
    }

    function addWormThroughTag(character, tag) {
        if (!character || typeof character.drill_ETh_addTag !== "function") return;
        if (character._qjWormAppliedTag && character._qjWormAppliedTag !== tag &&
            typeof character.drill_ETh_removeTag === "function") {
            character.drill_ETh_removeTag(character._qjWormAppliedTag);
        }
        if (typeof character.drill_ETh_hasTag !== "function" || !character.drill_ETh_hasTag(tag)) {
            character.drill_ETh_addTag(tag);
        }
        character._qjWormAppliedTag = tag;
    }

    function ensureInternalThrough(head, segment) {
        if (!head) return;
        const tag = wormThroughTag(head);
        addWormThroughTag(head, tag);
        if (segment && segment !== head) addWormThroughTag(segment, tag);
    }

    function removeAppliedWormTag(character) {
        if (!character || !character._qjWormAppliedTag) return;
        if (typeof character.drill_ETh_removeTag === "function") {
            character.drill_ETh_removeTag(character._qjWormAppliedTag);
        }
        character._qjWormAppliedTag = null;
    }

    function isPlayerPartyCharacter(character) {
        if (!character) return false;
        if (typeof $gamePlayer !== "undefined" && character === $gamePlayer) return true;
        if (typeof Game_Player !== "undefined" && character instanceof Game_Player) return true;
        return typeof Game_Follower !== "undefined" && character instanceof Game_Follower;
    }

    function isWormPlayerEscapeActive(character) {
        if (!character || (character._qjWormPlayerEscapeThisCall !== true &&
            finiteNumber(character._qjWormPlayerEscapeFrames, 0) <= 0)) {
            return false;
        }
        return !!(character._qjWormTrailState || character._wormHeadEventId != null);
    }

    // 仅让正在执行防卡逃脱的虫节主动穿过玩家。玩家碰撞、地图墙体以及
    // 其他事件的碰撞逻辑都不改动；Drill_EventThrough 后加载时也会保留此门。
    if (typeof Game_Event !== "undefined" &&
        typeof Game_Event.prototype.checkCollisionTargetCharacter === "function" &&
        !Game_Event.prototype._qjWormPlayerEscapePatched) {
        const originalCheckCollisionTargetCharacter =
            Game_Event.prototype.checkCollisionTargetCharacter;
        Game_Event.prototype.checkCollisionTargetCharacter = function(x, y, direction, character) {
            if (isWormPlayerEscapeActive(this) && isPlayerPartyCharacter(character)) {
                return false;
            }
            return originalCheckCollisionTargetCharacter.call(this, x, y, direction, character);
        };
        Game_Event.prototype._qjWormPlayerEscapePatched = true;
    }

    function tickPlayerEscape(character) {
        const remaining = Math.max(
            0,
            Math.floor(finiteNumber(character._qjWormPlayerEscapeFrames, 0))
        );
        character._qjWormPlayerEscapeThisCall = remaining > 0;
        character._qjWormPlayerEscapeFrames = remaining > 0 ? remaining - 1 : 0;
    }

    function playerPartyCollisionAtStep(character, direction, maxDistancePixels) {
        if (!isCardinalDirection(direction) || typeof character.mover !== "function") {
            return false;
        }
        const mover = character.mover();
        if (!mover || typeof mover.checkCollision !== "function") return false;
        let dpf = character.distancePerFrame();
        if (Number.isFinite(maxDistancePixels)) {
            dpf = Math.min(dpf, Math.max(0, maxDistancePixels) / TILE_SIZE);
        }
        if (!Number.isFinite(dpf) || dpf <= 0) return false;
        const vector = DIRECTION_VECTORS[direction];
        const x = $gameMap.roundX(character._realX + vector.x * dpf);
        const y = $gameMap.roundY(character._realY + vector.y * dpf);
        const results = mover.checkCollision(x, y, direction) || [];
        return results.some(result => result && isPlayerPartyCharacter(result.targetObject));
    }

    function updatePlayerEscapeOnBlock(character, blockedByPlayer, enabled, delay, duration) {
        if (!enabled) {
            character._qjWormPlayerBlockedCalls = 0;
            character._qjWormPlayerEscapeFrames = 0;
            character._qjWormPlayerEscapeThisCall = false;
            return;
        }
        if (isWormPlayerEscapeActive(character)) return;
        if (!blockedByPlayer) {
            character._qjWormPlayerBlockedCalls = 0;
            return;
        }
        const blockedCalls = finiteNumber(character._qjWormPlayerBlockedCalls, 0) + 1;
        character._qjWormPlayerBlockedCalls = blockedCalls;
        if (blockedCalls >= delay) {
            character._qjWormPlayerBlockedCalls = 0;
            character._qjWormPlayerEscapeFrames = duration;
        }
    }

    function clearPlayerBlockCounter(character) {
        character._qjWormPlayerBlockedCalls = 0;
    }

    function isTouchingPlayerParty(character) {
        if (typeof character.mover !== "function") return true;
        const mover = character.mover();
        if (!mover || typeof mover.checkHitCharacters !== "function") return true;
        const position = typeof character.positionPoint === "function"
            ? character.positionPoint()
            : { x: character._realX, y: character._realY };
        const classes = [];
        if (typeof Game_Player !== "undefined") classes.push(Game_Player);
        if (typeof Game_Follower !== "undefined") classes.push(Game_Follower);
        return classes.some(characterClass => {
            const results = mover.checkHitCharacters(
                position.x,
                position.y,
                character.direction(),
                characterClass
            ) || [];
            return results.some(result => result && isPlayerPartyCharacter(result.targetObject));
        });
    }

    function finishPlayerEscapeIfClear(character) {
        if (isWormPlayerEscapeActive(character) && !isTouchingPlayerParty(character)) {
            character._qjWormPlayerEscapeFrames = 0;
            character._qjWormPlayerEscapeThisCall = false;
        }
    }

    function headConfig(options) {
        const spacing = clamp(finiteNumber(options.spacing, 28), 4, 384);
        const maxSegments = Math.max(1, Math.floor(finiteNumber(options.maxSegments, 12)));
        const defaultHistory = Math.max(
            spacing * (maxSegments + 4),
            TILE_SIZE * 24
        );
        return {
            spacing: spacing,
            maxSegments: maxSegments,
            moveSpeed: Number.isFinite(Number(options.moveSpeed)) ? Number(options.moveSpeed) : null,
            turnChance: clamp(finiteNumber(options.turnChance, 0.012), 0, 1),
            minStraightFrames: Math.max(0, Math.floor(finiteNumber(options.minStraightFrames, 24))),
            playerBias: clamp(finiteNumber(options.playerBias, 0.25), 0, 1),
            recordStep: clamp(finiteNumber(options.recordStep, 2), 0.25, spacing),
            maxHistory: Math.max(
                spacing * (maxSegments + 2),
                finiteNumber(options.maxHistory, defaultHistory)
            ),
            initialDirection: options.initialDirection,
            target: Object.prototype.hasOwnProperty.call(options, "target")
                ? options.target
                : -1,
            autoThrough: options.autoThrough !== false,
            disableWallSlide: options.disableWallSlide !== false,
            playerEscape: options.playerEscape !== false,
            playerEscapeDelay: Math.max(
                1,
                Math.floor(finiteNumber(options.playerEscapeDelay, 6))
            ),
            playerEscapeFrames: Math.max(
                1,
                Math.floor(finiteNumber(options.playerEscapeFrames, 30))
            )
        };
    }

    function seedHistory(head, direction, config) {
        const vector = DIRECTION_VECTORS[direction];
        const seedLength = config.spacing * (config.maxSegments + 3);
        const seedStep = Math.min(config.spacing, 24);
        const history = [{ x: head._realX, y: head._realY, travel: 0 }];
        for (let distance = seedStep; distance < seedLength; distance += seedStep) {
            history.push({
                x: $gameMap.roundX(head._realX - vector.x * distance / TILE_SIZE),
                y: $gameMap.roundY(head._realY - vector.y * distance / TILE_SIZE),
                travel: -distance
            });
        }
        history.push({
            x: $gameMap.roundX(head._realX - vector.x * seedLength / TILE_SIZE),
            y: $gameMap.roundY(head._realY - vector.y * seedLength / TILE_SIZE),
            travel: -seedLength
        });
        return history;
    }

    function createHeadState(head, config) {
        const direction = currentCardinalDirection(head, config.initialDirection);
        head._qjWormTrailGeneration = Math.max(
            0,
            Math.floor(finiteNumber(head._qjWormTrailGeneration, 0))
        ) + 1;
        head.setDirection(direction);
        return {
            version: 2,
            behaviorVersion: 4,
            generation: head._qjWormTrailGeneration,
            direction: direction,
            travel: 0,
            spacing: config.spacing,
            maxSegments: config.maxSegments,
            recordStep: config.recordStep,
            maxHistory: config.maxHistory,
            turnCooldown: config.minStraightFrames,
            history: seedHistory(head, direction, config),
            blockedFrames: 0
        };
    }

    function recordHeadPosition(head, state, force) {
        const newest = state.history[0];
        const distance = newest && Number.isFinite(Number(newest.travel))
            ? Math.abs(state.travel - Number(newest.travel))
            : Infinity;
        if (!newest || distance >= state.recordStep || (force && distance > 0.001)) {
            state.history.unshift({
                x: head._realX,
                y: head._realY,
                travel: state.travel
            });
        }
    }

    function boundSegments(head, state) {
        if (!$gameMap || typeof $gameMap.events !== "function") return [];
        const headEventId = eventIdOf(head);
        return $gameMap.events().filter(segment => {
            if (!segment || segment === head) return false;
            if (typeof segment.isErased === "function" && segment.isErased()) return false;
            if (Number(segment._wormHeadEventId) !== headEventId) return false;
            const follow = segment._qjWormFollowState;
            return follow && follow.version === 3 && follow.generation === state.generation;
        });
    }

    function oldestProgressToKeep(head, state) {
        let oldest = state.travel - state.maxHistory;
        const buffer = Math.max(state.spacing * 2, state.recordStep * 4);
        for (const segment of boundSegments(head, state)) {
            const follow = segment._qjWormFollowState;
            oldest = Math.min(oldest, finiteNumber(follow.progress, oldest) - buffer);
        }
        return oldest;
    }

    function trimHistory(head, state) {
        if (!state.history || state.history.length <= 2) return;
        const oldestNeeded = oldestProgressToKeep(head, state);
        let keepThrough = state.history.length - 1;
        for (let i = 0; i < state.history.length; i++) {
            const point = state.history[i];
            if (finiteNumber(point.travel, state.travel) <= oldestNeeded) {
                keepThrough = i;
                break;
            }
        }
        if (keepThrough < state.history.length - 1) {
            state.history.length = keepThrough + 1;
        }
    }

    function targetDirectionScore(head, direction, target) {
        if (!target) return 0;
        const toward = deltaBetween(head._realX, head._realY, target._realX, target._realY);
        const vector = DIRECTION_VECTORS[direction];
        return vector.x * toward.x + vector.y * toward.y;
    }

    function orderedTurns(head, directions, target, playerBias) {
        const result = directions.slice();
        if (result.length < 2) return result;
        if (target && Math.random() < playerBias) {
            result.sort((a, b) =>
                targetDirectionScore(head, b, target) - targetDirectionScore(head, a, target)
            );
        } else if (Math.random() < 0.5) {
            result.reverse();
        }
        return result;
    }

    function moveCardinal(character, direction, maxDistancePixels) {
        if (!isCardinalDirection(direction)) return 0;
        const moverData = typeof character.moverData === "function" ? character.moverData() : null;
        if (moverData && moverData.stopping) return 0;
        let dpf = character.distancePerFrame();
        if (Number.isFinite(maxDistancePixels)) {
            dpf = Math.min(dpf, Math.max(0, maxDistancePixels) / TILE_SIZE);
        }
        if (!Number.isFinite(dpf) || dpf <= 0) return 0;

        const beforeX = character._realX;
        const beforeY = character._realY;
        character.mover().dotMoveByDeg(new DotMoveSystem.Degree(DIRECTION_DEGREES[direction]), dpf);
        const moved = deltaBetween(beforeX, beforeY, character._realX, character._realY);
        character._dotMovingCounter = 5;
        return Math.sqrt(moved.x * moved.x + moved.y * moved.y) * TILE_SIZE;
    }

    function tryHeadDirection(head, state, direction) {
        if (direction !== state.direction) {
            recordHeadPosition(head, state, true);
            state.direction = direction;
            state.turnCooldown = state.minStraightFrames || 0;
        }
        head.setDirection(direction);
        const movedPixels = moveCardinal(head, direction);
        if (movedPixels > 0.000001) {
            state.travel += movedPixels;
            recordHeadPosition(head, state, false);
            trimHistory(head, state);
        }
        return movedPixels > 0.000001;
    }

    function uniqueDirections(directions) {
        return directions.filter((direction, index) =>
            isCardinalDirection(direction) && directions.indexOf(direction) === index
        );
    }

    Game_Character.prototype.dotMoveWormHead = function(options) {
        options = options || {};
        const config = headConfig(options);
        if (config.playerEscape) {
            tickPlayerEscape(this);
        } else {
            this._qjWormPlayerBlockedCalls = 0;
            this._qjWormPlayerEscapeFrames = 0;
            this._qjWormPlayerEscapeThisCall = false;
        }
        if (config.moveSpeed != null) this.setMoveSpeed(config.moveSpeed);
        if (config.disableWallSlide && typeof this.setEnableWallSlide === "function") {
            this.setEnableWallSlide(false);
        }

        let state = this._qjWormTrailState;
        if (!state || state.version !== 2 || state.behaviorVersion !== 4 ||
            !Array.isArray(state.history)) {
            state = this._qjWormTrailState = createHeadState(this, config);
        }
        state.spacing = config.spacing;
        state.maxSegments = config.maxSegments;
        state.recordStep = config.recordStep;
        state.maxHistory = config.maxHistory;
        state.minStraightFrames = config.minStraightFrames;
        state.playerEscape = config.playerEscape;
        state.playerEscapeDelay = config.playerEscapeDelay;
        state.playerEscapeFrames = config.playerEscapeFrames;
        state.turnCooldown = Math.max(0, finiteNumber(state.turnCooldown, 0) - 1);
        if (config.autoThrough) ensureInternalThrough(this, null);

        const target = resolveCharacter(config.target);
        this._qjWormChainStretch = 0;
        state.chainWaitFrames = 0;

        const current = isCardinalDirection(state.direction)
            ? state.direction
            : currentCardinalDirection(this, config.initialDirection);
        const turns = orderedTurns(
            this,
            PERPENDICULAR_DIRECTIONS[current],
            target,
            config.playerBias
        );
        const reverse = REVERSE_DIRECTIONS[current];
        let candidates;

        if (state.turnCooldown <= 0 && Math.random() < config.turnChance) {
            // 自由转弯先尝试左右岔路；若两边都堵塞，继续原方向。
            candidates = uniqueDirections(turns.concat([current, reverse]));
        } else {
            // 一般情况下先直行；撞墙后尝试左右，死路才掉头。
            candidates = uniqueDirections([current].concat(turns, [reverse]));
        }

        let blockedByPlayer = false;
        for (const direction of candidates) {
            if (tryHeadDirection(this, state, direction)) {
                clearPlayerBlockCounter(this);
                finishPlayerEscapeIfClear(this);
                state.blockedFrames = 0;
                return true;
            }
            if (config.playerEscape &&
                playerPartyCollisionAtStep(this, direction, Infinity)) {
                blockedByPlayer = true;
            }
        }
        updatePlayerEscapeOnBlock(
            this,
            blockedByPlayer,
            config.playerEscape,
            config.playerEscapeDelay,
            config.playerEscapeFrames
        );
        state.blockedFrames++;
        return false;
    };

    function directionFromVector(dx, dy, fallback) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (absX <= 0.000001 && absY <= 0.000001) {
            return isCardinalDirection(fallback) ? fallback : 2;
        }
        if (absX > absY) return dx > 0 ? 6 : 4;
        if (absY > absX) return dy > 0 ? 2 : 8;
        if ([4, 6].includes(fallback) && absX > 0.000001) return dx > 0 ? 6 : 4;
        return dy > 0 ? 2 : 8;
    }

    function trailVertices(head, state) {
        const vertices = [{
            x: head._realX,
            y: head._realY,
            travel: state.travel
        }];
        let lastTravel = state.travel;
        for (const point of state.history) {
            const travel = finiteNumber(point.travel, lastTravel);
            if (travel >= lastTravel - 0.000001) continue;
            vertices.push({ x: point.x, y: point.y, travel: travel });
            lastTravel = travel;
        }
        return vertices;
    }

    function trailSegments(head, state) {
        const vertices = trailVertices(head, state);
        const segments = [];
        for (let i = 0; i < vertices.length - 1; i++) {
            const newer = vertices[i];
            const older = vertices[i + 1];
            const delta = deltaBetween(older.x, older.y, newer.x, newer.y);
            segments.push({
                newer: newer,
                older: older,
                high: newer.travel,
                low: older.travel,
                direction: directionFromVector(delta.x, delta.y, state.direction)
            });
        }
        return { vertices: vertices, segments: segments };
    }

    function trailBounds(path, state) {
        const vertices = path.vertices;
        return {
            newest: state.travel,
            oldest: vertices.length > 0 ? vertices[vertices.length - 1].travel : state.travel
        };
    }

    function pathPointAtProgress(path, progress, fallbackDirection) {
        if (!path.vertices.length) return null;
        const first = path.vertices[0];
        const last = path.vertices[path.vertices.length - 1];
        if (progress >= first.travel - 0.000001) {
            return { x: first.x, y: first.y, direction: fallbackDirection };
        }
        for (const segment of path.segments) {
            if (progress <= segment.high + 0.000001 && progress >= segment.low - 0.000001) {
                const length = segment.high - segment.low;
                const ratio = length > 0 ? (segment.high - progress) / length : 0;
                const delta = deltaBetween(segment.newer.x, segment.newer.y, segment.older.x, segment.older.y);
                return {
                    x: $gameMap.roundX(segment.newer.x + delta.x * ratio),
                    y: $gameMap.roundY(segment.newer.y + delta.y * ratio),
                    direction: segment.direction
                };
            }
        }
        const direction = path.segments.length > 0
            ? path.segments[path.segments.length - 1].direction
            : fallbackDirection;
        return { x: last.x, y: last.y, direction: direction };
    }

    function segmentHeadValue(segment, options) {
        if (options.head != null) return options.head;
        if (options.headEventId != null) return options.headEventId;
        if (segment._wormHeadEventId != null) return segment._wormHeadEventId;
        if (segment.wormHeadEventId != null) return segment.wormHeadEventId;
        if (segment.wormHeadId != null) return segment.wormHeadId;
        return null;
    }

    function segmentIndexValue(segment, options) {
        if (options.index != null) return options.index;
        if (segment._wormSegmentIndex != null) return segment._wormSegmentIndex;
        if (segment.wormSegmentIndex != null) return segment.wormSegmentIndex;
        if (segment.wormIndex != null) return segment.wormIndex;
        return 1;
    }

    function setKinematicWormPosition(segment, target) {
        const beforeX = segment._realX;
        const beforeY = segment._realY;
        if (typeof segment.setPositionPoint === "function") {
            const point = DotMoveSystem.DotMovePoint
                ? new DotMoveSystem.DotMovePoint(target.x, target.y)
                : { x: target.x, y: target.y };
            segment.setPositionPoint(point);
        } else if (typeof segment.setPosition === "function") {
            segment.setPosition(target.x, target.y);
        } else {
            segment._x = target.x;
            segment._y = target.y;
            segment._realX = target.x;
            segment._realY = target.y;
        }
        segment.setDirection(target.direction);
        segment._dotMovingCounter = 5;
        return distancePixels(beforeX, beforeY, segment._realX, segment._realY) > 0.000001;
    }

    Game_Character.prototype.dotMoveWormSegment = function(options) {
        options = options || {};
        const head = resolveCharacter(segmentHeadValue(this, options));
        if (!head || head === this) return false;
        const state = head._qjWormTrailState;
        if (!state || state.version !== 2 || state.behaviorVersion !== 4 ||
            !Array.isArray(state.history)) {
            return false;
        }

        const index = Math.max(1, Math.floor(finiteNumber(segmentIndexValue(this, options), 1)));
        const spacing = clamp(finiteNumber(options.spacing, state.spacing || 28), 4, 384);
        if (options.autoThrough !== false) ensureInternalThrough(head, this);

        this._wormHeadEventId = eventIdOf(head);
        this._wormSegmentIndex = index;
        this._qjWormSpacing = spacing;

        const path = trailSegments(head, state);
        const bounds = trailBounds(path, state);
        const rawProgress = state.travel - index * spacing;
        const progress = clamp(rawProgress, bounds.oldest, bounds.newest);
        const target = pathPointAtProgress(path, progress, state.direction);
        if (!target) return false;

        let follow = this._qjWormFollowState;
        if (!follow || follow.version !== 3 || follow.generation !== state.generation ||
            follow.headEventId !== eventIdOf(head)) {
            follow = this._qjWormFollowState = {
                version: 3,
                generation: state.generation,
                headEventId: eventIdOf(head),
                progress: progress
            };
        }
        follow.progress = progress;

        // 身体不再发起 DotMove 碰撞移动。目标点来自蛇头实际通过的时间序列，
        // 因此直接同步坐标；玩家、其他事件和身体自身的碰撞都无权否决跟随。
        const moved = setKinematicWormPosition(this, target);
        this._qjWormPathExhausted = rawProgress < bounds.oldest - 0.001;
        this._qjWormProgressError = 0;
        this._qjWormOffPathDistance = 0;
        this._qjWormRecovering = false;
        this._qjWormSegmentBlocked = 0;
        this._qjWormPlayerBlockedCalls = 0;
        this._qjWormPlayerEscapeFrames = 0;
        this._qjWormPlayerEscapeThisCall = false;
        this._qjWormKinematic = true;
        return moved;
    };

    Game_Character.prototype.bindWormSegment = function(headOrEventId, index, options) {
        options = options || {};
        const head = resolveCharacter(headOrEventId);
        const headEventId = typeof headOrEventId === "number"
            ? headOrEventId
            : eventIdOf(head);
        this._wormHeadEventId = Number(headEventId) || 0;
        this._wormSegmentIndex = Math.max(1, Math.floor(finiteNumber(index, 1)));
        this._qjWormFollowState = null;
        this._qjWormKinematic = true;
        this._qjWormSegmentBlocked = 0;
        this._qjWormPlayerBlockedCalls = 0;
        this._qjWormPlayerEscapeFrames = 0;
        this._qjWormPlayerEscapeThisCall = false;
        if (options.autoThrough !== false && head) ensureInternalThrough(head, this);
        return this;
    };

    Game_Character.prototype.setWormSegmentIndex = function(index) {
        this._wormSegmentIndex = Math.max(1, Math.floor(finiteNumber(index, 1)));
        return this;
    };

    Game_Character.prototype.clearWormSegmentBinding = function() {
        removeAppliedWormTag(this);
        this._wormHeadEventId = null;
        this._wormSegmentIndex = null;
        this._qjWormSpacing = null;
        this._qjWormBaseMoveSpeed = null;
        this._qjWormFollowState = null;
        this._qjWormKinematic = false;
        this._qjWormOffPathDistance = 0;
        this._qjWormSegmentBlocked = 0;
        this._qjWormPlayerBlockedCalls = 0;
        this._qjWormPlayerEscapeFrames = 0;
        this._qjWormPlayerEscapeThisCall = false;
    };

    Game_Character.prototype.resetWormTrail = function() {
        this._qjWormTrailState = null;
        this._qjWormPlayerBlockedCalls = 0;
        this._qjWormPlayerEscapeFrames = 0;
        this._qjWormPlayerEscapeThisCall = false;
    };
})();


//=============================================================================
//
//=============================================================================
