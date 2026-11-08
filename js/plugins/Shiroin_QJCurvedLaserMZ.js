//=============================================================================
// Shiroin_QJCurvedLaserMZ.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.0.2 QJ-MapProjectileMZ GPU curved homing laser extension
 * @author Shiroin
 * @base QJ-MapProjectileMZ
 * @orderAfter QJ-MapProjectileMZ
 *
 * @help Shiroin_QJCurvedLaserMZ.js
 *
 * Adds QJ.MPMZ.CurvedLaser(data).
 *
 * The launch angle is sampled once when the laser is created. The source may
 * continue following the player, but later mouse movement cannot rotate it.
 * A limited-speed guide point tries to chase a target and bends the middle/end
 * of the beam. Visual deformation is evaluated by a fixed GPU mesh. Wall and
 * target collision are sampled on the CPU at independent frequencies.
 *
 * Basic example:
 *
 * QJ.MPMZ.CurvedLaser({
 *   position: [['P'], ['P']],
 *   rotation: ['M'],
 *   img: 'LaserRed',
 *   imgPoint: '',
 *   length: ['S', 720],
 *   judgeWidth: 42,
 *   judgeMode: ['W', 5],
 *   curve: {
 *     trackingLevel: 1,
 *     targetGroups: ['enemy'] // also accepts ['"enemy"']
 *   },
 *   existData: [
 *     { t: ['Time', 180] },
 *     { t: ['G', ['"enemy"']], a: ['C', 152, 7], p: [-1, false, true] }
 *   ]
 * });
 *
 * Notes:
 * - img is loaded through ImageManager.loadProjectileQJ.
 * - QJ sheet suffixes [columns,duration] and [columns,rows,duration] work.
 * - imgStretchMode 'T' repeats the texture; other values stretch it.
 * - Enemy circle and rectangle QJ collision boxes are supported.
 * - The first non-passable map cell blocks and visually truncates the beam.
 * - Reflection is intentionally unsupported.
 *
 * This plugin must be placed below QJ-MapProjectileMZ.
 */

(() => {
    "use strict";

    const pluginName = "Shiroin_QJCurvedLaserMZ";
    const global = globalThis;

    if (!global.QJ || !QJ.MPMZ || !global.Game_QJLaserMZ ||
        !global.Sprite_QJLaserMZ || !global.PIXI) {
        console.error(`${pluginName}: QJ-MapProjectileMZ is required and must load first.`);
        return;
    }

    const PI = Math.PI;
    const TWO_PI = PI * 2;
    const EPSILON = 0.000001;

    const defaults = {
        trackingLevel: 1,
        targetGroups: ["enemy"],
        acquireRange: 720,
        acquireAngle: 55,
        targetSearchInterval: 10,
        lostTargetMode: "reacquire",
        guideSpeed: 6.5,
        guideTurnRate: 0.018,
        guideAcceleration: 0.55,
        guideArrivalRate: 0.18,
        guideSnapDistance: 1.0,
        rebaseGuideOnFirstAcquire: true,
        predictionFrames: 0,
        rootStraightRate: 0.20,
        endHandleRate: 0.24,
        visualSections: 80,
        collisionSections: 20,
        damageInterval: 5,
        wallInterval: 2,
        wallSections: 52,
        wallSampleSpacing: 8,
        wallEdgeSamples: true,
        directionSpeed: 1.1,
        directionStrength: 0.85,
        waveSpeed: 2.8,
        waveStrength: 0.62,
        rippleSpeed: 1.27,
        rippleStrength: 0.24,
        amplitudePulse: 0.32,
        minBend: 170,
        bendRatio: 0.30,
        maxBend: 360,
        curveSide: 0,
        randomPhase: true
    };

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function normalizeAngle(angle) {
        while (angle > PI) angle -= TWO_PI;
        while (angle < -PI) angle += TWO_PI;
        return angle;
    }

    function turnToward(from, to, maxTurn) {
        return from + clamp(normalizeAngle(to - from), -maxTurn, maxTurn);
    }

    function stripGroupQuotes(name) {
        if (typeof name !== "string") return name;
        if (name.length >= 2) {
            const first = name[0];
            const last = name[name.length - 1];
            if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
                return name.slice(1, -1);
            }
        }
        return name;
    }

    function copyCurveConfig(input) {
        const config = Object.assign({}, defaults, input || {});
        config.targetGroups = Array.isArray(config.targetGroups) ?
            config.targetGroups.slice() : [config.targetGroups];
        config.trackingLevel = Math.max(1, Number(config.trackingLevel) || 1);
        config.visualSections = Math.max(8, Math.floor(Number(config.visualSections) || 80));
        config.collisionSections = Math.max(3, Math.floor(Number(config.collisionSections) || 20));
        config.wallSections = Math.max(4, Math.floor(Number(config.wallSections) || 52));
        config.damageInterval = Math.max(1, Math.floor(Number(config.damageInterval) || 5));
        config.wallInterval = Math.max(1, Math.floor(Number(config.wallInterval) || 2));
        config.targetSearchInterval = Math.max(1, Math.floor(Number(config.targetSearchInterval) || 10));
        config.curveSide = Number(config.curveSide) || (Math.random() < 0.5 ? -1 : 1);
        return config;
    }

    function levelValue(base, level, rate) {
        return base * (1 + Math.max(0, level - 1) * rate);
    }

    function pointSegmentDistanceSq(px, py, ax, ay, bx, by) {
        const abx = bx - ax;
        const aby = by - ay;
        const lengthSq = abx * abx + aby * aby;
        let t = 0;
        if (lengthSq > EPSILON) {
            t = clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1);
        }
        const dx = px - (ax + abx * t);
        const dy = py - (ay + aby * t);
        return dx * dx + dy * dy;
    }

    function orient(ax, ay, bx, by, cx, cy) {
        return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    }

    function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
        const o1 = orient(ax, ay, bx, by, cx, cy);
        const o2 = orient(ax, ay, bx, by, dx, dy);
        const o3 = orient(cx, cy, dx, dy, ax, ay);
        const o4 = orient(cx, cy, dx, dy, bx, by);
        return ((o1 <= 0 && o2 >= 0) || (o1 >= 0 && o2 <= 0)) &&
            ((o3 <= 0 && o4 >= 0) || (o3 >= 0 && o4 <= 0));
    }

    function segmentSegmentDistanceSq(ax, ay, bx, by, cx, cy, dx, dy) {
        if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
        return Math.min(
            pointSegmentDistanceSq(ax, ay, cx, cy, dx, dy),
            pointSegmentDistanceSq(bx, by, cx, cy, dx, dy),
            pointSegmentDistanceSq(cx, cy, ax, ay, bx, by),
            pointSegmentDistanceSq(dx, dy, ax, ay, bx, by)
        );
    }

    function pointInPolygon(x, y, vertices) {
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const a = vertices[i];
            const b = vertices[j];
            if (((a.y > y) !== (b.y > y)) &&
                x < (b.x - a.x) * (y - a.y) / ((b.y - a.y) || EPSILON) + a.x) {
                inside = !inside;
            }
        }
        return inside;
    }

    function segmentHitsBody(ax, ay, bx, by, radius, body, vertexCache) {
        if (!body || !body.pos) return false;
        if (body.type === 0) {
            const combined = radius + Math.abs(body.r || body.dia || 0);
            return pointSegmentDistanceSq(body.pos.x, body.pos.y, ax, ay, bx, by) <= combined * combined;
        }
        if (body.type !== 1 || !body.calcPoints || body.calcPoints.length < 3) return false;

        const broadRadius = radius + Math.abs(body.dia || 0);
        if (pointSegmentDistanceSq(body.pos.x, body.pos.y, ax, ay, bx, by) > broadRadius * broadRadius) {
            return false;
        }

        const points = body.calcPoints;
        vertexCache.length = points.length;
        for (let i = 0; i < points.length; i++) {
            let vertex = vertexCache[i];
            if (!vertex) vertex = vertexCache[i] = { x: 0, y: 0 };
            vertex.x = points[i].x + body.pos.x;
            vertex.y = points[i].y + body.pos.y;
        }
        if (pointInPolygon(ax, ay, vertexCache) || pointInPolygon(bx, by, vertexCache)) return true;
        const radiusSq = radius * radius;
        for (let i = 0; i < vertexCache.length; i++) {
            const p0 = vertexCache[i];
            const p1 = vertexCache[(i + 1) % vertexCache.length];
            if (segmentSegmentDistanceSq(ax, ay, bx, by, p0.x, p0.y, p1.x, p1.y) <= radiusSq) {
                return true;
            }
        }
        return false;
    }

    function bitmapBaseTexture(bitmap) {
        return bitmap ? (bitmap.baseTexture || bitmap._baseTexture) : null;
    }

    function parseSheet(filename) {
        const match = typeof filename === "string" ? filename.match(/\[([^\]]*)\]/) : null;
        if (!match) return { columns: 1, rows: 1, duration: 1, frames: 1 };
        const values = match[1].split(",").map(Number);
        if (values.length === 2) {
            const columns = Math.max(1, values[0] || 1);
            return {
                columns,
                rows: 1,
                duration: Math.max(1, values[1] || 1),
                frames: columns
            };
        }
        if (values.length >= 3) {
            const columns = Math.max(1, values[0] || 1);
            const rows = Math.max(1, values[1] || 1);
            return {
                columns,
                rows,
                duration: Math.max(1, values[2] || 1),
                frames: columns * rows
            };
        }
        return { columns: 1, rows: 1, duration: 1, frames: 1 };
    }

    function getLengthValue(laser) {
        const data = laser.data.length;
        if (!data || data[0] !== "S") return 280;
        const source = data[1];
        if (source && source[0] === "L" && source[1]) {
            return Math.max(1, Number(laser.dead ? source[1].getOnly() : source[1].get()) || 1);
        }
        if (source && source[0] === "S") {
            try {
                return Math.max(1, Number(eval(source[1])) || 1);
            } catch (_) {
                return 280;
            }
        }
        return 280;
    }

    function getGroupMembers(groupName) {
        const list = $gameMap._groupListQJ;
        if (!list) return null;
        const plainName = stripGroupQuotes(groupName);
        return list[groupName] ||
            list[plainName] ||
            list[`"${plainName}"`] ||
            list[`'${plainName}'`] ||
            null;
    }

    function characterFromGroupEntry(entry) {
        return QJ.getCharacter(entry);
    }

    function isCharacterValid(character) {
        return !!character && !character._erased && character._boxBodyQJ && character._boxBodyQJ.pos;
    }

    function worldTargetPosition(character, output) {
        const body = character && character._boxBodyQJ;
        if (!body || !body.pos) return false;
        output.x = body.pos.x;
        output.y = body.pos.y;
        return true;
    }

    function initCurvedState(laser) {
        if (laser._qjCurveState) return laser._qjCurveState;
        const config = copyCurveConfig(laser.data.curve);
        laser.data.curve = config;
        const launchRadians = laser.rotation * PI / 180 - PI / 2;
        const length = getLengthValue(laser);
        const phase = config.randomPhase ? Math.random() * TWO_PI : 0;
        const state = laser._qjCurveState = {
            config,
            launchRadians,
            guideAngle: launchRadians,
            guideSpeed: 0,
            guideX: laser.x + Math.cos(launchRadians) * length,
            guideY: laser.y + Math.sin(launchRadians) * length,
            sourceX: laser.x,
            sourceY: laser.y,
            length,
            targetEntry: null,
            hasAcquiredTarget: false,
            targetLastX: 0,
            targetLastY: 0,
            targetVX: 0,
            targetVY: 0,
            targetSearchWait: 0,
            damageWait: 0,
            wallWait: 0,
            wallT: 1,
            phase,
            time: 0,
            p0x: 0,
            p0y: 0,
            p1x: 0,
            p1y: 0,
            p2x: 0,
            p2y: 0,
            p3x: 0,
            p3y: 0,
            normalX: 0,
            normalY: 1,
            bend: 0,
            directionValue: 0,
            collisionPoints: new Float32Array((config.collisionSections + 1) * 2),
            sampleA: { x: 0, y: 0 },
            sampleB: { x: 0, y: 0 },
            sampleC: { x: 0, y: 0 },
            tangent: { x: 1, y: 0 },
            targetPosition: { x: 0, y: 0 },
            vertexCache: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
            hitSet: new Set()
        };
        return state;
    }

    function acquireTarget(laser, state) {
        const config = state.config;
        const range = Number(config.acquireRange) || state.length;
        const rangeSq = range * range;
        const halfAngle = (Number(config.acquireAngle) || 55) * PI / 180;
        let best = null;
        let bestScore = Infinity;

        for (let g = 0; g < config.targetGroups.length; g++) {
            const members = getGroupMembers(config.targetGroups[g]);
            if (!members) continue;
            for (const entry of members) {
                const character = characterFromGroupEntry(entry);
                if (!isCharacterValid(character)) continue;
                const body = character._boxBodyQJ;
                const dx = body.pos.x - state.sourceX;
                const dy = body.pos.y - state.sourceY;
                const distanceSq = dx * dx + dy * dy;
                if (distanceSq > rangeSq) continue;
                const angle = Math.atan2(dy, dx);
                const difference = Math.abs(normalizeAngle(angle - state.launchRadians));
                if (difference > halfAngle) continue;
                const score = distanceSq * (1 + difference / Math.max(halfAngle, EPSILON));
                if (score < bestScore) {
                    bestScore = score;
                    best = entry;
                }
            }
        }

        state.targetEntry = best;
        if (best !== null) {
            const character = characterFromGroupEntry(best);
            if (worldTargetPosition(character, state.targetPosition)) {
                if (!state.hasAcquiredTarget && config.rebaseGuideOnFirstAcquire !== false) {
                    const targetDx = state.targetPosition.x - state.sourceX;
                    const targetDy = state.targetPosition.y - state.sourceY;
                    const targetDistance = Math.min(state.length, Math.hypot(targetDx, targetDy));
                    state.guideX = state.sourceX + Math.cos(state.launchRadians) * targetDistance;
                    state.guideY = state.sourceY + Math.sin(state.launchRadians) * targetDistance;
                    state.guideAngle = state.launchRadians;
                    state.guideSpeed = 0;
                }
                state.hasAcquiredTarget = true;
                state.targetLastX = state.targetPosition.x;
                state.targetLastY = state.targetPosition.y;
                state.targetVX = 0;
                state.targetVY = 0;
            }
        }
    }

    function updateGuide(laser, state) {
        const config = state.config;
        const level = config.trackingLevel;
        state.sourceX = laser.x;
        state.sourceY = laser.y;
        state.length = getLengthValue(laser);

        let target = state.targetEntry !== null ? characterFromGroupEntry(state.targetEntry) : null;
        if (!isCharacterValid(target)) {
            state.targetEntry = null;
            target = null;
        }
        if (!target) {
            if (state.targetSearchWait <= 0 && config.lostTargetMode !== "straight") {
                acquireTarget(laser, state);
                state.targetSearchWait = config.targetSearchInterval;
                target = state.targetEntry !== null ? characterFromGroupEntry(state.targetEntry) : null;
            } else {
                state.targetSearchWait--;
            }
        }

        const maxSpeed = levelValue(Number(config.guideSpeed) || 6.5, level, 0.35);
        const maxTurn = levelValue(Number(config.guideTurnRate) || 0.018, level, 0.55);
        const acceleration = levelValue(Number(config.guideAcceleration) || 0.55, level, 0.25);
        state.guideSpeed = Math.min(maxSpeed, state.guideSpeed + acceleration);

        if (isCharacterValid(target) && worldTargetPosition(target, state.targetPosition)) {
            state.targetVX = state.targetPosition.x - state.targetLastX;
            state.targetVY = state.targetPosition.y - state.targetLastY;
            state.targetLastX = state.targetPosition.x;
            state.targetLastY = state.targetPosition.y;
            const prediction = (Number(config.predictionFrames) || 0) + Math.max(0, level - 1) * 1.5;
            const tx = state.targetPosition.x + state.targetVX * prediction;
            const ty = state.targetPosition.y + state.targetVY * prediction;
            const dx = tx - state.guideX;
            const dy = ty - state.guideY;
            const distance = Math.hypot(dx, dy);
            const desired = Math.atan2(dy, dx);
            state.guideAngle = turnToward(state.guideAngle, desired, maxTurn);
            const angleError = Math.abs(normalizeAngle(desired - state.guideAngle));
            const alignment = Math.max(0, Math.cos(angleError));
            const arrivalRate = Math.max(0.01, Number(config.guideArrivalRate) || 0.18);
            const arrivalSpeed = Math.min(state.guideSpeed,
                Math.max(Number(config.guideSnapDistance) || 1, distance * arrivalRate));
            // Move toward the target itself, while guideAngle controls how quickly
            // the rendered end tangent can turn. A small unaligned component keeps
            // low-level guidance from entering a permanent orbit around a near target.
            const step = arrivalSpeed * (0.15 + alignment * 0.85);
            const snapDistance = Math.max(0.25, Number(config.guideSnapDistance) || 1);
            if (distance <= Math.max(snapDistance, step)) {
                state.guideX = tx;
                state.guideY = ty;
            } else {
                state.guideX += dx / distance * step;
                state.guideY += dy / distance * step;
            }
        } else {
            const nominalX = state.sourceX + Math.cos(state.launchRadians) * state.length;
            const nominalY = state.sourceY + Math.sin(state.launchRadians) * state.length;
            const desired = Math.atan2(nominalY - state.guideY, nominalX - state.guideX);
            state.guideAngle = turnToward(state.guideAngle, desired, maxTurn);
            state.guideX += Math.cos(state.guideAngle) * state.guideSpeed;
            state.guideY += Math.sin(state.guideAngle) * state.guideSpeed;
        }

        const fromSourceX = state.guideX - state.sourceX;
        const fromSourceY = state.guideY - state.sourceY;
        const guideDistance = Math.hypot(fromSourceX, fromSourceY);
        if (guideDistance > state.length && guideDistance > EPSILON) {
            const rate = state.length / guideDistance;
            state.guideX = state.sourceX + fromSourceX * rate;
            state.guideY = state.sourceY + fromSourceY * rate;
        }
    }

    function updateCurveParameters(state) {
        const config = state.config;
        const dx = state.guideX - state.sourceX;
        const dy = state.guideY - state.sourceY;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const dirX = dx / distance;
        const dirY = dy / distance;
        state.normalX = -dirY;
        state.normalY = dirX;

        const rootHandle = Math.min(state.length * config.rootStraightRate, distance * 0.45);
        const endHandle = Math.min(state.length * config.endHandleRate, distance * 0.45);
        const launchX = Math.cos(state.launchRadians);
        const launchY = Math.sin(state.launchRadians);
        const guideX = Math.cos(state.guideAngle);
        const guideY = Math.sin(state.guideAngle);

        state.p0x = state.sourceX;
        state.p0y = state.sourceY;
        state.p1x = state.sourceX + launchX * rootHandle;
        state.p1y = state.sourceY + launchY * rootHandle;
        state.p2x = state.guideX - guideX * endHandle;
        state.p2y = state.guideY - guideY * endHandle;
        state.p3x = state.guideX;
        state.p3y = state.guideY;

        const breathing = 1 + Math.sin(state.time * 1.31 + state.phase) * config.amplitudePulse;
        state.bend = Math.min(config.maxBend,
            Math.max(config.minBend, distance * config.bendRatio)) * breathing;
        state.directionValue = Math.sin(state.time * config.directionSpeed + state.phase) *
            config.directionStrength;
    }

    function sampleCurve(state, t, output) {
        const u = 1 - t;
        const a = u * u * u;
        const b = 3 * u * u * t;
        const c = 3 * u * t * t;
        const d = t * t * t;
        let x = a * state.p0x + b * state.p1x + c * state.p2x + d * state.p3x;
        let y = a * state.p0y + b * state.p1y + c * state.p2y + d * state.p3y;

        const envelopeBase = Math.sin(PI * t);
        const envelope = envelopeBase * envelopeBase;
        const config = state.config;
        const travelling = Math.sin(t * TWO_PI - state.time * config.waveSpeed + state.phase) *
            config.waveStrength;
        const ripple = Math.sin(t * PI * 4 + state.time * config.rippleSpeed + state.phase * 0.7) *
            config.rippleStrength;
        const offset = envelope * state.bend *
            (state.directionValue + travelling + ripple) * config.curveSide;
        x += state.normalX * offset;
        y += state.normalY * offset;
        output.x = x;
        output.y = y;
        return output;
    }

    function sampleTangent(state, t, output) {
        const delta = 0.002;
        sampleCurve(state, Math.max(0, t - delta), state.sampleB);
        sampleCurve(state, Math.min(1, t + delta), state.sampleC);
        let dx = state.sampleC.x - state.sampleB.x;
        let dy = state.sampleC.y - state.sampleB.y;
        const length = Math.hypot(dx, dy) || 1;
        output.x = dx / length;
        output.y = dy / length;
        return output;
    }

    function isWallPoint(x, y) {
        const tileWidth = $gameMap.tileWidth();
        const tileHeight = $gameMap.tileHeight();
        const tileX = Math.floor(x / tileWidth);
        const tileY = Math.floor(y / tileHeight);
        if (tileX < 0 || tileY < 0 || tileX >= $gameMap.width() || tileY >= $gameMap.height()) {
            return true;
        }
        return !$gameMap.noPassBoxLaserQJ(tileX, tileY);
    }

    function curvePointBlocked(state, t, radius) {
        sampleCurve(state, t, state.sampleA);
        if (isWallPoint(state.sampleA.x, state.sampleA.y)) return true;
        if (!state.config.wallEdgeSamples || radius <= 1) return false;
        sampleTangent(state, t, state.tangent);
        const nx = -state.tangent.y;
        const ny = state.tangent.x;
        return isWallPoint(state.sampleA.x + nx * radius, state.sampleA.y + ny * radius) ||
            isWallPoint(state.sampleA.x - nx * radius, state.sampleA.y - ny * radius);
    }

    function updateWallClip(laser, state) {
        if (state.wallWait > 0) {
            state.wallWait--;
            return;
        }
        state.wallWait = state.config.wallInterval - 1;
        const radius = Math.max(1, laser.data.judgeWidth.getOnly ?
            laser.data.judgeWidth.getOnly() * laser.scaleX * 0.5 : 1);
        const sections = state.config.wallSections;
        let lastT = 0;
        let hitT = 1;
        sampleCurve(state, 0, state.sampleA);
        let lastX = state.sampleA.x;
        let lastY = state.sampleA.y;

        outer:
        for (let i = 1; i <= sections; i++) {
            const nextT = i / sections;
            sampleCurve(state, nextT, state.sampleA);
            const distance = Math.hypot(state.sampleA.x - lastX, state.sampleA.y - lastY);
            const steps = Math.max(1, Math.ceil(distance / state.config.wallSampleSpacing));
            for (let s = 1; s <= steps; s++) {
                const testT = lastT + (nextT - lastT) * s / steps;
                if (curvePointBlocked(state, testT, radius)) {
                    let low = lastT + (nextT - lastT) * (s - 1) / steps;
                    let high = testT;
                    for (let n = 0; n < 5; n++) {
                        const mid = (low + high) * 0.5;
                        if (curvePointBlocked(state, mid, radius)) high = mid;
                        else low = mid;
                    }
                    hitT = low;
                    break outer;
                }
            }
            lastT = nextT;
            lastX = state.sampleA.x;
            lastY = state.sampleA.y;
        }
        state.wallT = hitT;
    }

    function buildCollisionPoints(state) {
        const points = state.collisionPoints;
        const sections = state.config.collisionSections;
        const endT = state.wallT;
        for (let i = 0; i <= sections; i++) {
            sampleCurve(state, endT * i / sections, state.sampleA);
            points[i * 2] = state.sampleA.x;
            points[i * 2 + 1] = state.sampleA.y;
        }
    }

    function characterHitsCurve(laser, state, character) {
        if (!isCharacterValid(character)) return false;
        const body = character._boxBodyQJ;
        const radius = Math.max(0.5, laser.data.judgeWidth.getOnly ?
            laser.data.judgeWidth.getOnly() * laser.scaleX * 0.5 : 1);
        const points = state.collisionPoints;
        const sections = state.config.collisionSections;
        for (let i = 0; i < sections; i++) {
            const index = i * 2;
            if (segmentHitsBody(points[index], points[index + 1],
                points[index + 2], points[index + 3], radius, body, state.vertexCache)) {
                return true;
            }
        }
        return false;
    }

    function triggerDetailOnTarget(laser, detail, target) {
        if (laser.isExistDataConditionNotMeet(detail)) return;
        laser.setDead(detail, target, null);
    }

    function processTargetCollisions(laser, state) {
        if (state.damageWait > 0) {
            state.damageWait--;
            return;
        }
        const judgeMode = laser.data.judgeMode;
        const configuredInterval = judgeMode && judgeMode[0] === "W" ?
            Math.max(1, Number(judgeMode[1]) || state.config.damageInterval) :
            state.config.damageInterval;
        state.damageWait = configuredInterval - 1;
        buildCollisionPoints(state);

        const details = laser.data.existData;
        for (let d = 1; d < details.length; d++) {
            const detail = details[d];
            if (!detail || !detail.t) continue;
            if (detail.t[0] === "P") {
                if (characterHitsCurve(laser, state, $gamePlayer)) {
                    triggerDetailOnTarget(laser, detail, $gamePlayer);
                    if (laser.dead) return;
                }
            } else if (detail.t[0] === "G") {
                state.hitSet.clear();
                const groups = Array.isArray(detail.t[1]) ? detail.t[1] : [detail.t[1]];
                for (let g = 0; g < groups.length; g++) {
                    const members = getGroupMembers(groups[g]);
                    if (!members) continue;
                    for (const entry of members) {
                        const character = characterFromGroupEntry(entry);
                        if (!isCharacterValid(character)) continue;
                        const key = character.eventId ? character.eventId() : entry;
                        if (state.hitSet.has(key)) continue;
                        if (characterHitsCurve(laser, state, character)) {
                            state.hitSet.add(key);
                            triggerDetailOnTarget(laser, detail, character);
                            if (laser.dead) return;
                        }
                    }
                }
            }
        }
    }

    function updateCurvedPath(laser) {
        const state = initCurvedState(laser);
        state.time += 1 / 60;
        updateGuide(laser, state);
        updateCurveParameters(state);
        updateWallClip(laser, state);

        const displayX = $gameMap.displayX() * $gameMap.tileWidth();
        const displayY = $gameMap.displayY() * $gameMap.tileHeight();
        const points = state.collisionPoints;
        const sections = state.config.collisionSections;
        laser.lineList = laser.lineList || [];
        laser.lineList.length = sections + 1;
        for (let i = 0; i <= sections; i++) {
            const t = state.wallT * i / sections;
            sampleCurve(state, t, state.sampleA);
            sampleTangent(state, t, state.tangent);
            let row = laser.lineList[i];
            if (!row) row = laser.lineList[i] = [0, 0, 0];
            row[0] = state.sampleA.x - displayX;
            row[1] = state.sampleA.y - displayY;
            row[2] = Math.atan2(state.tangent.x, -state.tangent.y);
            points[i * 2] = state.sampleA.x;
            points[i * 2 + 1] = state.sampleA.y;
        }
    }

    const _Game_QJLaserMZ_updaeLength = Game_QJLaserMZ.prototype.updaeLength;
    Game_QJLaserMZ.prototype.updaeLength = function(ifInit) {
        if (this.data && this.data._qjCurvedLaser) {
            updateCurvedPath(this);
        } else {
            _Game_QJLaserMZ_updaeLength.call(this, ifInit);
        }
    };

    const _Game_QJLaserMZ_updateExistData = Game_QJLaserMZ.prototype.updateExistData;
    Game_QJLaserMZ.prototype.updateExistData = function() {
        if (!this.data || !this.data._qjCurvedLaser) {
            return _Game_QJLaserMZ_updateExistData.apply(this, arguments);
        }
        Game_QJBulletMZ.prototype.updateExistData.call(this, false, false, true, false, false);
        if (this.dead) return;
        processTargetCollisions(this, initCurvedState(this));
    };

    const vertexShader = `
        precision highp float;
        attribute float aT;
        attribute float aSide;
        uniform mat3 translationMatrix;
        uniform mat3 projectionMatrix;
        uniform vec2 uP0;
        uniform vec2 uP1;
        uniform vec2 uP2;
        uniform vec2 uP3;
        uniform vec2 uNormal;
        uniform float uTime;
        uniform float uPhase;
        uniform float uWidth;
        uniform float uEndT;
        uniform float uBend;
        uniform float uDirectionSpeed;
        uniform float uDirectionStrength;
        uniform float uWaveSpeed;
        uniform float uWaveStrength;
        uniform float uRippleSpeed;
        uniform float uRippleStrength;
        uniform float uCurveSide;
        varying float vT;
        varying float vSide;

        vec2 cubic(float t) {
            float u = 1.0 - t;
            return u*u*u*uP0 + 3.0*u*u*t*uP1 + 3.0*u*t*t*uP2 + t*t*t*uP3;
        }

        vec2 curve(float t) {
            vec2 base = cubic(t);
            float e = sin(3.141592653589793 * t);
            e *= e;
            float whole = sin(uTime * uDirectionSpeed + uPhase) * uDirectionStrength;
            float wave = sin(t * 6.283185307179586 - uTime * uWaveSpeed + uPhase) * uWaveStrength;
            float ripple = sin(t * 12.566370614359172 + uTime * uRippleSpeed + uPhase * 0.7) * uRippleStrength;
            return base + uNormal * (e * uBend * (whole + wave + ripple) * uCurveSide);
        }

        void main(void) {
            float t = min(aT, uEndT);
            float dt = 0.002;
            vec2 center = curve(t);
            vec2 before = curve(max(0.0, t - dt));
            vec2 after = curve(min(uEndT, t + dt));
            vec2 tangent = after - before;
            float tangentLength = max(length(tangent), 0.0001);
            tangent /= tangentLength;
            vec2 sideNormal = vec2(-tangent.y, tangent.x);
            vec2 position = center + sideNormal * (uWidth * 0.5 * aSide);
            gl_Position = vec4((projectionMatrix * translationMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
            vT = t;
            vSide = aSide * 0.5 + 0.5;
        }
    `;

    const fragmentShader = `
        precision mediump float;
        varying float vT;
        varying float vSide;
        uniform sampler2D uSampler;
        uniform vec4 uFrame;
        uniform float uRepeat;
        uniform float uAlpha;
        uniform vec4 uTone;

        void main(void) {
            float along = uRepeat > 1.0001 ? fract(vT * uRepeat) : vT;
            vec2 uv = uFrame.xy + vec2(vSide, along) * uFrame.zw;
            vec4 color = texture2D(uSampler, uv);
            color.rgb += uTone.rgb;
            float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            color.rgb = mix(color.rgb, vec3(luminance), clamp(uTone.a, 0.0, 1.0));
            color.a *= uAlpha;
            gl_FragColor = color;
        }
    `;

    function createCurveGeometry(sections) {
        const vertexCount = (sections + 1) * 2;
        const tValues = new Float32Array(vertexCount);
        const sideValues = new Float32Array(vertexCount);
        const indices = new Uint16Array(sections * 6);
        for (let i = 0; i <= sections; i++) {
            const index = i * 2;
            const t = i / sections;
            tValues[index] = t;
            tValues[index + 1] = t;
            sideValues[index] = -1;
            sideValues[index + 1] = 1;
        }
        let cursor = 0;
        for (let i = 0; i < sections; i++) {
            const index = i * 2;
            indices[cursor++] = index;
            indices[cursor++] = index + 1;
            indices[cursor++] = index + 2;
            indices[cursor++] = index + 2;
            indices[cursor++] = index + 1;
            indices[cursor++] = index + 3;
        }
        return new PIXI.Geometry()
            .addAttribute("aT", tValues, 1)
            .addAttribute("aSide", sideValues, 1)
            .addIndex(indices);
    }

    function Sprite_QJCurvedLaserMZ() {
        this.initialize(...arguments);
    }

    Sprite_QJCurvedLaserMZ.prototype = Object.create(Sprite.prototype);
    Sprite_QJCurvedLaserMZ.prototype.constructor = Sprite_QJCurvedLaserMZ;

    Sprite_QJCurvedLaserMZ.prototype.initialize = function(index) {
        Sprite.prototype.initialize.call(this);
        this.data = $gameMap.bulletQJ(index);
        this.z = this.data.data.z;
        this._bitmap = null;
        this._curveTexture = null;
        this._mesh = null;
        this._sheet = parseSheet(this.data.data.img);
        this._frameIndex = -1;
        this._loadBitmap();
    };

    Sprite_QJCurvedLaserMZ.prototype._loadBitmap = function() {
        const name = this.data.data.img;
        if (!name) return;
        this._bitmap = ImageManager.loadProjectileQJ(name);
        if (this._bitmap.isReady()) this._createMesh();
        else this._bitmap.addLoadListener(this._createMesh.bind(this));
    };

    Sprite_QJCurvedLaserMZ.prototype._createMesh = function() {
        if (this._mesh || !this.data || this.data.deadOver) return;
        const baseTexture = bitmapBaseTexture(this._bitmap);
        if (!baseTexture) return;
        this._curveTexture = new PIXI.Texture(baseTexture);
        const state = initCurvedState(this.data);
        const uniforms = {
            uSampler: this._curveTexture,
            uP0: new Float32Array(2),
            uP1: new Float32Array(2),
            uP2: new Float32Array(2),
            uP3: new Float32Array(2),
            uNormal: new Float32Array(2),
            uTime: 0,
            uPhase: 0,
            uWidth: 1,
            uEndT: 1,
            uBend: 0,
            uDirectionSpeed: 1,
            uDirectionStrength: 0,
            uWaveSpeed: 1,
            uWaveStrength: 0,
            uRippleSpeed: 1,
            uRippleStrength: 0,
            uCurveSide: 1,
            uFrame: new Float32Array([0, 0, 1, 1]),
            uRepeat: 1,
            uAlpha: 1,
            uTone: new Float32Array(4)
        };
        const shader = PIXI.Shader.from(vertexShader, fragmentShader, uniforms);
        this._mesh = new PIXI.Mesh(createCurveGeometry(state.config.visualSections), shader);
        this._mesh.blendMode = this.data.data.blendMode;
        this.addChild(this._mesh);
        this._updateFrame(true);
        this._updateMesh();
    };

    Sprite_QJCurvedLaserMZ.prototype._updateFrame = function(force) {
        if (!this._mesh || !this._bitmap) return;
        const sheet = this._sheet;
        const frameIndex = Math.floor(this.data.time / sheet.duration) % sheet.frames;
        if (!force && frameIndex === this._frameIndex) return;
        this._frameIndex = frameIndex;
        const column = frameIndex % sheet.columns;
        const row = Math.floor(frameIndex / sheet.columns);
        const frameWidth = this._bitmap.width / sheet.columns;
        const frameHeight = this._bitmap.height / sheet.rows;
        const uniforms = this._mesh.shader.uniforms;
        uniforms.uFrame[0] = column / sheet.columns;
        uniforms.uFrame[1] = row / sheet.rows;
        uniforms.uFrame[2] = 1 / sheet.columns;
        uniforms.uFrame[3] = 1 / sheet.rows;
        this._frameWidth = frameWidth;
        this._frameHeight = frameHeight;
    };

    Sprite_QJCurvedLaserMZ.prototype._updateMesh = function() {
        if (!this._mesh || !this.data || !this.data._qjCurveState) return;
        const state = this.data._qjCurveState;
        const config = state.config;
        const uniforms = this._mesh.shader.uniforms;
        const displayX = $gameMap.displayX() * $gameMap.tileWidth();
        const displayY = $gameMap.displayY() * $gameMap.tileHeight();
        uniforms.uP0[0] = state.p0x - displayX;
        uniforms.uP0[1] = state.p0y - displayY;
        uniforms.uP1[0] = state.p1x - displayX;
        uniforms.uP1[1] = state.p1y - displayY;
        uniforms.uP2[0] = state.p2x - displayX;
        uniforms.uP2[1] = state.p2y - displayY;
        uniforms.uP3[0] = state.p3x - displayX;
        uniforms.uP3[1] = state.p3y - displayY;
        uniforms.uNormal[0] = state.normalX;
        uniforms.uNormal[1] = state.normalY;
        uniforms.uTime = state.time;
        uniforms.uPhase = state.phase;
        uniforms.uWidth = Math.max(1, (this._frameWidth || 1) * this.data.scaleX);
        uniforms.uEndT = state.wallT;
        uniforms.uBend = state.bend;
        uniforms.uDirectionSpeed = config.directionSpeed;
        uniforms.uDirectionStrength = config.directionStrength;
        uniforms.uWaveSpeed = config.waveSpeed;
        uniforms.uWaveStrength = config.waveStrength;
        uniforms.uRippleSpeed = config.rippleSpeed;
        uniforms.uRippleStrength = config.rippleStrength;
        uniforms.uCurveSide = config.curveSide;
        uniforms.uRepeat = this.data.data.imgStretchMode === "T" ?
            Math.max(1, state.length / Math.max(1, this._frameHeight || 1)) : 1;
        uniforms.uAlpha = this.data.opacity;
        const tone = this.data._colorTone || [0, 0, 0, 0];
        uniforms.uTone[0] = tone[0] / 255;
        uniforms.uTone[1] = tone[1] / 255;
        uniforms.uTone[2] = tone[2] / 255;
        uniforms.uTone[3] = Math.max(0, tone[3] / 255);
        this._mesh.blendMode = this.data.data.blendMode;
    };

    Sprite_QJCurvedLaserMZ.prototype.update = function() {
        if (!this.data || this.data.deadOver) {
            this.destroy();
            return;
        }
        if (!this._mesh && this._bitmap && this._bitmap.isReady()) this._createMesh();
        this._updateFrame(false);
        this._updateMesh();
    };

    Sprite_QJCurvedLaserMZ.prototype.destroy = function(options) {
        if (this._destroyed) return;
        if (this._mesh) {
            if (this._mesh.parent === this) this.removeChild(this._mesh);
            this._mesh.destroy({ children: true, texture: false, baseTexture: false });
            this._mesh = null;
        }
        if (this._curveTexture) {
            this._curveTexture.destroy(false);
            this._curveTexture = null;
        }
        this.data = null;
        Sprite.prototype.destroy.call(this, options);
    };

    global.Sprite_QJCurvedLaserMZ = Sprite_QJCurvedLaserMZ;

    const _Spriteset_Map_generateSpriteMPMZ = Spriteset_Map.prototype.generateSpriteMPMZ;
    Spriteset_Map.prototype.generateSpriteMPMZ = function(index, data, type) {
        if (type === 1 && data && data.data && data.data._qjCurvedLaser) {
            return new Sprite_QJCurvedLaserMZ(index);
        }
        return _Spriteset_Map_generateSpriteMPMZ.apply(this, arguments);
    };

    QJ.MPMZ.CurvedLaser = function(data) {
        data = data || {};
        data._qjCurvedLaser = true;
        data.curve = copyCurveConfig(data.curve);
        if (data.position === undefined) data.position = [["P"], ["P"]];
        if (data.positionStatic === undefined) data.positionStatic = false;
        if (data.rotation === undefined) data.rotation = ["M"];
        if (data.rotationStatic === undefined) data.rotationStatic = true;
        if (data.judgeMode === undefined) data.judgeMode = ["W", data.curve.damageInterval];
        if (data.imgPoint === undefined) data.imgPoint = "";
        return QJ.MPMZ.Laser(data);
    };

    QJ.MPMZ.CurvedLaser.defaults = defaults;
    QJ.MPMZ.CurvedLaser.version = "1.0.2";
})();
