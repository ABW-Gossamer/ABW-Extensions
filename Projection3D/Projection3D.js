(function (Scratch) {
    'use strict';

    if (!Scratch.extensions.unsandboxed) {
        throw new Error('This extension must run unsandboxed');
    }

    class Projection3D {
        constructor() {
            // 默认相机参数
            this.fov = 90;
            this.near = 0.1;
            this.far = 1000.0;

            // 相机位置
            this.cameraPos = { x: 0, y: 0, z: 5 };
            this.cameraTarget = { x: 0, y: 0, z: 0 };

            // 相机旋转角度 (欧拉角，度数)
            this.cameraRotX = 0; // 俯仰 (Pitch) - 绕X轴
            this.cameraRotY = 0; // 偏航 (Yaw) - 绕Y轴
            this.cameraRotZ = 0; // 滚转 (Roll) - 绕Z轴

            // 方向向量（自动计算）
            this.forward = { x: 0, y: 0, z: -1 };
            this.right = { x: 1, y: 0, z: 0 };
            this.up = { x: 0, y: 1, z: 0 };

            this.updateVectors();
        }

        // 更新方向向量（基于当前旋转）
        updateVectors() {
            const pitchRad = this.degToRad(this.cameraRotX);
            const yawRad = this.degToRad(this.cameraRotY);
            const rollRad = this.degToRad(this.cameraRotZ);

            const cosPitch = Math.cos(pitchRad);
            const sinPitch = Math.sin(pitchRad);
            const cosYaw = Math.cos(yawRad);
            const sinYaw = Math.sin(yawRad);
            const cosRoll = Math.cos(rollRad);
            const sinRoll = Math.sin(rollRad);

            // 前向向量 (默认: 0, 0, -1)
            let fx = 0, fy = 0, fz = -1;
            // 应用俯仰和偏航
            let newFx = fx * cosYaw + fz * sinYaw;
            let newFz = fz * cosYaw - fx * sinYaw;
            let newFy = fy;
            fx = newFx;
            fy = newFy;
            fz = newFz;

            newFx = fx;
            newFy = fy * cosPitch - fz * sinPitch;
            newFz = fz * cosPitch + fy * sinPitch;
            fx = newFx;
            fy = newFy;
            fz = newFz;

            // 应用滚转
            this.forward = {
                x: fx * cosRoll + fy * sinRoll,
                y: fy * cosRoll - fx * sinRoll,
                z: fz
            };

            // 右向量 (默认: 1, 0, 0)
            let rx = 1, ry = 0, rz = 0;
            let newRx = rx * cosYaw + rz * sinYaw;
            let newRz = rz * cosYaw - rx * sinYaw;
            rx = newRx;
            rz = newRz;

            newRx = rx;
            let newRy = ry * cosPitch - rz * sinPitch;
            let newRz2 = rz * cosPitch + ry * sinPitch;
            rx = newRx;
            ry = newRy;
            rz = newRz2;

            this.right = {
                x: rx * cosRoll + ry * sinRoll,
                y: ry * cosRoll - rx * sinRoll,
                z: rz
            };

            // 上向量 = 前向量 × 右向量
            this.up = {
                x: this.forward.y * this.right.z - this.forward.z * this.right.y,
                y: this.forward.z * this.right.x - this.forward.x * this.right.z,
                z: this.forward.x * this.right.y - this.forward.y * this.right.x
            };
        }

        getInfo() {
            return {
                id: 'projection3d',
                name: '3D投影扩展',
                blocks: [
                    // ========== 投影积木 ==========
                    {
                        opcode: 'projectToScreen',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '将点 [X] [Y] [Z] 投影到屏幕上',
                        arguments: {
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Z: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
                        }
                    },
                    {
                        opcode: 'projectTriangleLines',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '将三角形 [X1] [Y1] [Z1] [X2] [Y2] [Z2] [X3] [Y3] [Z3] 投影为线段',
                        arguments: {
                            X1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Z1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            X2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            Y2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Z2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            X3: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y3: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            Z3: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
                        }
                    },

                    // ========== 线段处理积木 ==========
                    {
                        opcode: 'getLineCount',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[LINES] 中的线段数量',
                        arguments: {
                            LINES: { type: Scratch.ArgumentType.STRING, defaultValue: "" }
                        }
                    },
                    {
                        opcode: 'getLineSegment',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[LINES] 的第 [INDEX] 条线段',
                        arguments: {
                            LINES: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
                            INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
                        }
                    },
                    {
                        opcode: 'getLineStart',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[SEGMENT] 的起点',
                        arguments: {
                            SEGMENT: { type: Scratch.ArgumentType.STRING, defaultValue: "0,0,0,0" }
                        }
                    },
                    {
                        opcode: 'getLineEnd',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[SEGMENT] 的终点',
                        arguments: {
                            SEGMENT: { type: Scratch.ArgumentType.STRING, defaultValue: "0,0,0,0" }
                        }
                    },

                    // ========== 坐标处理积木 ==========
                    {
                        opcode: 'pointX',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[POINT] 的 X 坐标',
                        arguments: {
                            POINT: { type: Scratch.ArgumentType.STRING, defaultValue: "0,0" }
                        }
                    },
                    {
                        opcode: 'pointY',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[POINT] 的 Y 坐标',
                        arguments: {
                            POINT: { type: Scratch.ArgumentType.STRING, defaultValue: "0,0" }
                        }
                    },

                    // ========== 相机控制积木 ==========
                    {
                        opcode: 'setCameraPosition',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置相机位置 X:[X] Y:[Y] Z:[Z]',
                        arguments: {
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Z: { type: Scratch.ArgumentType.NUMBER, defaultValue: 5 }
                        }
                    },
                    {
                        opcode: 'setCameraRotation',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置相机旋转 俯仰:[Pitch]° 偏航:[Yaw]° 滚转:[Roll]°',
                        arguments: {
                            Pitch: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Yaw: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Roll: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: 'setFov',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置相机 FOV 为 [FOV] 度',
                        arguments: {
                            FOV: { type: Scratch.ArgumentType.NUMBER, defaultValue: 90 }
                        }
                    },
                    {
                        opcode: 'setNearPlane',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置近平面距离为 [DISTANCE]',
                        arguments: {
                            DISTANCE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.1 }
                        }
                    },
                    {
                        opcode: 'setFarPlane',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置远平面距离为 [DISTANCE]',
                        arguments: {
                            DISTANCE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1000 }
                        }
                    },

                    // ========== 相机参数获取积木 ==========
                    {
                        opcode: 'getCameraX',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机 X 坐标'
                    },
                    {
                        opcode: 'getCameraY',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机 Y 坐标'
                    },
                    {
                        opcode: 'getCameraZ',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机 Z 坐标'
                    },
                    {
                        opcode: 'getCameraPitch',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机俯仰角'
                    },
                    {
                        opcode: 'getCameraYaw',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机偏航角'
                    },
                    {
                        opcode: 'getCameraRoll',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机滚转角'
                    },
                    {
                        opcode: 'getFov',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机 FOV'
                    },
                    {
                        opcode: 'getNearPlane',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '近平面距离'
                    },
                    {
                        opcode: 'getFarPlane',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '远平面距离'
                    },

                    // ========== 相机方向向量积木 ==========
                    {
                        opcode: 'getForwardX',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机前向向量 X'
                    },
                    {
                        opcode: 'getForwardY',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机前向向量 Y'
                    },
                    {
                        opcode: 'getForwardZ',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机前向向量 Z'
                    },
                    {
                        opcode: 'getRightX',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机右向向量 X'
                    },
                    {
                        opcode: 'getRightY',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机右向向量 Y'
                    },
                    {
                        opcode: 'getRightZ',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机右向向量 Z'
                    },
                    {
                        opcode: 'getUpX',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机上向向量 X'
                    },
                    {
                        opcode: 'getUpY',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机上向向量 Y'
                    },
                    {
                        opcode: 'getUpZ',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '相机上向向量 Z'
                    }
                ]
            };
        }

        // ========== 辅助方法 ==========
        degToRad(deg) { return deg * Math.PI / 180; }
        radToDeg(rad) { return rad * 180 / Math.PI; }

        getScreenAspect() {
            try {
                const vm = Scratch.vm;
                if (vm && vm.runtime && vm.runtime.renderer) {
                    const width = vm.runtime.stageWidth;
                    const height = vm.runtime.stageHeight;
                    if (height > 0) return width / height;
                }
            } catch (e) { }
            return 1;
        }

        // ========== 坐标转换 ==========
        worldToCamera(point) {
            let x = point.x - this.cameraPos.x;
            let y = point.y - this.cameraPos.y;
            let z = point.z - this.cameraPos.z;

            // 应用旋转 (按Z, Y, X顺序)
            const rollRad = this.degToRad(this.cameraRotZ);
            const yawRad = this.degToRad(this.cameraRotY);
            const pitchRad = this.degToRad(this.cameraRotX);

            // 绕Z轴旋转 (滚转)
            const cosRoll = Math.cos(rollRad);
            const sinRoll = Math.sin(rollRad);
            let x1 = x * cosRoll + y * sinRoll;
            let y1 = y * cosRoll - x * sinRoll;
            let z1 = z;

            // 绕Y轴旋转 (偏航)
            const cosYaw = Math.cos(yawRad);
            const sinYaw = Math.sin(yawRad);
            let x2 = x1 * cosYaw + z1 * sinYaw;
            let z2 = z1 * cosYaw - x1 * sinYaw;
            let y2 = y1;

            // 绕X轴旋转 (俯仰)
            const cosPitch = Math.cos(pitchRad);
            const sinPitch = Math.sin(pitchRad);
            let y3 = y2 * cosPitch - z2 * sinPitch;
            let z3 = z2 * cosPitch + y2 * sinPitch;
            let x3 = x2;

            return { x: x3, y: y3, z: z3 };
        }

        projectToNDC(cameraPoint, aspect) {
            const fovRad = this.degToRad(this.fov);
            const top = this.near * Math.tan(fovRad / 2);
            const bottom = -top;
            const right = top * aspect;
            const left = -right;

            const xp = (cameraPoint.x / cameraPoint.z) * this.near;
            const yp = (cameraPoint.y / cameraPoint.z) * this.near;

            let ndcX = (xp - left) / (right - left) * 2 - 1;
            let ndcY = (yp - bottom) / (top - bottom) * 2 - 1;
            ndcY = -ndcY;

            return { x: ndcX, y: ndcY };
        }

        // ========== 线段裁剪 ==========
        computeOutCode(x, y) {
            let code = 0;
            if (x < -1) code |= 1;
            if (x > 1) code |= 2;
            if (y < -1) code |= 4;
            if (y > 1) code |= 8;
            return code;
        }

        clipLine(x1, y1, x2, y2) {
            let x0 = x1, y0 = y1;
            let x1c = x2, y1c = y2;

            let outcode0 = this.computeOutCode(x0, y0);
            let outcode1 = this.computeOutCode(x1c, y1c);
            let accept = false;

            while (true) {
                if ((outcode0 | outcode1) === 0) {
                    accept = true;
                    break;
                }
                if ((outcode0 & outcode1) !== 0) break;

                const outcodeOut = outcode0 !== 0 ? outcode0 : outcode1;
                let x, y;

                if (outcodeOut & 1) {
                    y = y0 + (y1c - y0) * ((-1 - x0) / (x1c - x0));
                    x = -1;
                } else if (outcodeOut & 2) {
                    y = y0 + (y1c - y0) * ((1 - x0) / (x1c - x0));
                    x = 1;
                } else if (outcodeOut & 4) {
                    x = x0 + (x1c - x0) * ((-1 - y0) / (y1c - y0));
                    y = -1;
                } else {
                    x = x0 + (x1c - x0) * ((1 - y0) / (y1c - y0));
                    y = 1;
                }

                if (outcodeOut === outcode0) {
                    x0 = x; y0 = y;
                    outcode0 = this.computeOutCode(x0, y0);
                } else {
                    x1c = x; y1c = y;
                    outcode1 = this.computeOutCode(x1c, y1c);
                }
            }

            if (accept) {
                return { x1: x0, y1: y0, x2: x1c, y2: y1c, visible: true };
            }
            return { visible: false };
        }

        clipLine3D(p1, p2, aspect) {
            const cp1 = this.worldToCamera(p1);
            const cp2 = this.worldToCamera(p2);

            const bothBehind = cp1.z <= this.near && cp2.z <= this.near;
            if (bothBehind) return null;

            let start = cp1, end = cp2;

            if (cp1.z <= this.near && cp2.z > this.near) {
                const t = (this.near - cp1.z) / (cp2.z - cp1.z);
                start = {
                    x: cp1.x + t * (cp2.x - cp1.x),
                    y: cp1.y + t * (cp2.y - cp1.y),
                    z: this.near
                };
            } else if (cp2.z <= this.near && cp1.z > this.near) {
                const t = (this.near - cp2.z) / (cp1.z - cp2.z);
                end = {
                    x: cp2.x + t * (cp1.x - cp2.x),
                    y: cp2.y + t * (cp1.y - cp2.y),
                    z: this.near
                };
            }

            const ndc1 = this.projectToNDC(start, aspect);
            const ndc2 = this.projectToNDC(end, aspect);
            const clipped = this.clipLine(ndc1.x, ndc1.y, ndc2.x, ndc2.y);

            if (clipped.visible) {
                return { x1: clipped.x1, y1: clipped.y1, x2: clipped.x2, y2: clipped.y2 };
            }
            return null;
        }

        // ========== 主要投影积木 ==========
        projectToScreen(args) {
            const x = Number(args.X), y = Number(args.Y), z = Number(args.Z);
            const aspect = this.getScreenAspect();
            const cameraPoint = this.worldToCamera({ x, y, z });

            if (cameraPoint.z <= this.near) return "0,0";

            const ndc = this.projectToNDC(cameraPoint, aspect);
            const clampedX = Math.max(-1, Math.min(1, ndc.x));
            const clampedY = Math.max(-1, Math.min(1, ndc.y));

            return `${clampedX},${clampedY}`;
        }

        projectTriangleLines(args) {
            const v1 = { x: Number(args.X1), y: Number(args.Y1), z: Number(args.Z1) };
            const v2 = { x: Number(args.X2), y: Number(args.Y2), z: Number(args.Z2) };
            const v3 = { x: Number(args.X3), y: Number(args.Y3), z: Number(args.Z3) };
            const aspect = this.getScreenAspect();

            const edges = [[v1, v2], [v2, v3], [v3, v1]];
            const lineSegments = [];

            for (const edge of edges) {
                const clipped = this.clipLine3D(edge[0], edge[1], aspect);
                if (clipped) lineSegments.push(clipped);
            }

            if (lineSegments.length === 0) return "";
            return lineSegments.map(seg => `${seg.x1},${seg.y1},${seg.x2},${seg.y2}`).join(';');
        }

        // ========== 线段处理积木 ==========
        getLineCount(args) {
            const lines = args.LINES;
            if (!lines) return 0;
            return lines.split(';').length;
        }

        getLineSegment(args) {
            const lines = args.LINES;
            const index = Math.floor(Number(args.INDEX)) - 1;
            if (!lines) return "0,0,0,0";
            const segments = lines.split(';');
            if (index < 0 || index >= segments.length) return "0,0,0,0";
            return segments[index];
        }

        getLineStart(args) {
            const parts = args.SEGMENT.split(',');
            if (parts.length < 2) return "0,0";
            return `${parts[0]},${parts[1]}`;
        }

        getLineEnd(args) {
            const parts = args.SEGMENT.split(',');
            if (parts.length < 4) return "0,0";
            return `${parts[2]},${parts[3]}`;
        }

        pointX(args) {
            const parts = args.POINT.split(',');
            return parseFloat(parts[0]) || 0;
        }

        pointY(args) {
            const parts = args.POINT.split(',');
            return parseFloat(parts[1]) || 0;
        }

        // ========== 相机控制 ==========
        setCameraPosition(args) {
            this.cameraPos.x = Number(args.X);
            this.cameraPos.y = Number(args.Y);
            this.cameraPos.z = Number(args.Z);
        }

        setCameraRotation(args) {
            this.cameraRotX = Number(args.Pitch);
            this.cameraRotY = Number(args.Yaw);
            this.cameraRotZ = Number(args.Roll);
            this.updateVectors();
        }

        setFov(args) {
            this.fov = Number(args.FOV);
            this.fov = Math.max(1, Math.min(179, this.fov));
        }

        setNearPlane(args) {
            this.near = Math.max(0.01, Number(args.DISTANCE));
        }

        setFarPlane(args) {
            this.far = Math.max(this.near + 0.01, Number(args.DISTANCE));
        }

        // ========== 相机参数获取 ==========
        getCameraX() { return this.cameraPos.x; }
        getCameraY() { return this.cameraPos.y; }
        getCameraZ() { return this.cameraPos.z; }
        getCameraPitch() { return this.cameraRotX; }
        getCameraYaw() { return this.cameraRotY; }
        getCameraRoll() { return this.cameraRotZ; }
        getFov() { return this.fov; }
        getNearPlane() { return this.near; }
        getFarPlane() { return this.far; }

        // ========== 方向向量获取 ==========
        getForwardX() { return this.forward.x; }
        getForwardY() { return this.forward.y; }
        getForwardZ() { return this.forward.z; }
        getRightX() { return this.right.x; }
        getRightY() { return this.right.y; }
        getRightZ() { return this.right.z; }
        getUpX() { return this.up.x; }
        getUpY() { return this.up.y; }
        getUpZ() { return this.up.z; }
    }

    Scratch.extensions.register(new Projection3D());
})(Scratch);