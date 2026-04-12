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

            // 世界对象列表: { name, position, rotation, scale, mesh }
            this.worldProps = new Map();
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
                    // ========== 对象管理 ==========
                    {
                        opcode: 'newObject',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '新建对象 [NAME]',
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'Object' }
                        }
                    },
                    {
                        opcode: 'deleteObject',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '删除对象 [NAME]',
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'Object' }
                        }
                    },
                    {
                        opcode: 'deleteAllObjects',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '删除世界所有对象'
                    },
                    {
                        opcode: 'setObjectPosition',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置对象 [NAME] 坐标 X:[X] Y:[Y] Z:[Z]',
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'Object' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Z: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: 'changeObjectPosition',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '增加对象 [NAME] 坐标 X:[X] Y:[Y] Z:[Z]',
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'Object' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Z: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: 'setObjectRotation',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置对象 [NAME] 旋转 X:[RX] Y:[RY] Z:[RZ]',
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'Object' },
                            RX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            RY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            RZ: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: 'changeObjectRotation',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '增加对象 [NAME] 旋转 X:[RX] Y:[RY] Z:[RZ]',
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'Object' },
                            RX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            RY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            RZ: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: 'setObjectScale',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置对象 [NAME] 缩放 X:[SX] Y:[SY] Z:[SZ]',
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'Object' },
                            SX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            SY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            SZ: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
                        }
                    },
                    {
                        opcode: 'changeObjectScale',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '增加对象 [NAME] 缩放 X:[SX] Y:[SY] Z:[SZ]',
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'Object' },
                            SX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            SY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            SZ: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: 'getObjectProperty',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '获取对象 [NAME] 的 [PROP]',
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'Object' },
                            PROP: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'objectProps',
                                defaultValue: 'x'
                            }
                        }
                    },
                    {
                        opcode: 'setObjectMesh',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '给名为 [NAME] 的对象的网格设置为 [MESH]',
                        arguments: {
                            NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'Object' },
                            MESH: { type: Scratch.ArgumentType.STRING, defaultValue: 'cube' }
                        }
                    },

                    // ========== 网格创建积木 (用于MESH参数) ==========
                    {
                        opcode: 'createCubeMesh',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '创建正方体网格 边长 [SIZE]',
                        arguments: {
                            SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
                        }
                    },
                    {
                        opcode: 'createCuboidMesh',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '创建长方体网格 长 [LENGTH] 宽 [WIDTH] 高 [HEIGHT]',
                        arguments: {
                            LENGTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            WIDTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            HEIGHT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
                        }
                    },
                    {
                        opcode: 'createSphereMesh',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '创建球体网格 直径 [DIAMETER] 细分次数 [SUBDIVISIONS]',
                        arguments: {
                            DIAMETER: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            SUBDIVISIONS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 16 }
                        }
                    },

                    // ========== 获取所有渲染线段 ==========
                    {
                        opcode: 'getRenderLines',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '获取屏幕渲染数据'
                    },
                    {
                        opcode: 'getRenderLinesWithDepth',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '获取屏幕渲染数据（含深度）'
                    },
                    {
                        opcode: 'getRenderLinesBackfaceCulled',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '获取屏幕渲染数据（背面剔除+深度排序）'
                    },
                    {
                        opcode: 'getLineDepth',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[SEGMENT] 的深度',
                        arguments: {
                            SEGMENT: { type: Scratch.ArgumentType.STRING, defaultValue: "0,0,0,0,0" }
                        }
                    },

                    // ========== 原有投影积木 ==========
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
                    {
                        opcode: 'moveRelativeToCamera',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '相对摄像机朝向移动 X:[X] Y:[Y] Z:[Z]',
                        arguments: {
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Z: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
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
                ],
                menus: {
                    objectProps: {
                        acceptReporters: true,
                        items: ['x', 'y', 'z', 'rx', 'ry', 'rz', 'sx', 'sy', 'sz', 'parent']
                    }
                }
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

        // ========== 对象管理方法 ==========
        newObject(args) {
            const name = String(args.NAME);
            if (!this.worldProps.has(name)) {
                this.worldProps.set(name, {
                    name: name,
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 },
                    mesh: null
                });
            }
        }

        deleteObject(args) {
            const name = String(args.NAME);
            this.worldProps.delete(name);
        }

        deleteAllObjects() {
            this.worldProps.clear();
        }

        setObjectPosition(args) {
            const name = String(args.NAME);
            const obj = this.worldProps.get(name);
            if (obj) {
                obj.position = { x: Number(args.X), y: Number(args.Y), z: Number(args.Z) };
            }
        }

        changeObjectPosition(args) {
            const name = String(args.NAME);
            const obj = this.worldProps.get(name);
            if (obj) {
                obj.position.x += Number(args.X);
                obj.position.y += Number(args.Y);
                obj.position.z += Number(args.Z);
            }
        }

        setObjectRotation(args) {
            const name = String(args.NAME);
            const obj = this.worldProps.get(name);
            if (obj) {
                obj.rotation = { x: Number(args.RX), y: Number(args.RY), z: Number(args.RZ) };
            }
        }

        changeObjectRotation(args) {
            const name = String(args.NAME);
            const obj = this.worldProps.get(name);
            if (obj) {
                obj.rotation.x += Number(args.RX);
                obj.rotation.y += Number(args.RY);
                obj.rotation.z += Number(args.RZ);
            }
        }

        setObjectScale(args) {
            const name = String(args.NAME);
            const obj = this.worldProps.get(name);
            if (obj) {
                obj.scale = { x: Number(args.SX), y: Number(args.SY), z: Number(args.SZ) };
            }
        }

        changeObjectScale(args) {
            const name = String(args.NAME);
            const obj = this.worldProps.get(name);
            if (obj) {
                obj.scale.x += Number(args.SX);
                obj.scale.y += Number(args.SY);
                obj.scale.z += Number(args.SZ);
            }
        }

        getObjectProperty(args) {
            const name = String(args.NAME);
            const prop = String(args.PROP);
            const obj = this.worldProps.get(name);
            if (!obj) return 0;
            switch (prop) {
                case 'x': return obj.position.x;
                case 'y': return obj.position.y;
                case 'z': return obj.position.z;
                case 'rx': return obj.rotation.x;
                case 'ry': return obj.rotation.y;
                case 'rz': return obj.rotation.z;
                case 'sx': return obj.scale.x;
                case 'sy': return obj.scale.y;
                case 'sz': return obj.scale.z;
                case 'parent': return obj.parent || '';
                default: return 0;
            }
        }

        setObjectMesh(args) {
            const name = String(args.NAME);
            const meshData = args.MESH;
            const obj = this.worldProps.get(name);
            if (obj && meshData) {
                if (typeof meshData === 'string') {
                    try {
                        obj.mesh = JSON.parse(meshData);
                    } catch (e) {
                        obj.mesh = null;
                    }
                } else {
                    obj.mesh = meshData;
                }
            }
        }

        // ========== 网格创建方法 ==========
        createCubeMesh(args) {
            const size = Number(args.SIZE);
            const hs = size / 2;
            // 8个顶点 - 每个顶点是 {x, y, z} 对象
            const vertices = [
                { x: -hs, y: -hs, z: -hs }, // 0
                { x: hs, y: -hs, z: -hs }, // 1
                { x: hs, y: -hs, z: hs }, // 2
                { x: -hs, y: -hs, z: hs }, // 3
                { x: -hs, y: hs, z: -hs }, // 4
                { x: hs, y: hs, z: -hs }, // 5
                { x: hs, y: hs, z: hs }, // 6
                { x: -hs, y: hs, z: hs }  // 7
            ];
            // 12个三角形 (每个面2个)
            const indices = [
                0, 1, 2, 0, 2, 3, // 底面
                4, 6, 5, 4, 7, 6, // 顶面
                0, 4, 1, 1, 4, 5, // 前面
                1, 5, 2, 2, 5, 6, // 右面
                2, 6, 3, 3, 6, 7, // 后面
                0, 3, 4, 4, 3, 7  // 左面
            ];
            return JSON.stringify({ vertices, indices });
        }

        createCuboidMesh(args) {
            const lx = Number(args.LENGTH) / 2;
            const ly = Number(args.WIDTH) / 2;
            const lz = Number(args.HEIGHT) / 2;
            const vertices = [
                { x: -lx, y: -ly, z: -lz }, { x: lx, y: -ly, z: -lz },
                { x: lx, y: -ly, z: lz }, { x: -lx, y: -ly, z: lz },
                { x: -lx, y: ly, z: -lz }, { x: lx, y: ly, z: -lz },
                { x: lx, y: ly, z: lz }, { x: -lx, y: ly, z: lz }
            ];
            const indices = [
                0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
                0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 6,
                2, 6, 3, 3, 6, 7, 0, 3, 4, 4, 3, 7
            ];
            return JSON.stringify({ vertices, indices });
        }

        createSphereMesh(args) {
            const diameter = Number(args.DIAMETER);
            const subdivisions = Math.max(3, Math.floor(Number(args.SUBDIVISIONS)));
            const radius = diameter / 2;
            const vertices = [];
            const indices = [];

            // 生成顶点
            for (let i = 0; i <= subdivisions; i++) {
                const phi = Math.PI * i / subdivisions;
                const y = Math.cos(phi) * radius;
                const r = Math.sin(phi) * radius;
                for (let j = 0; j <= subdivisions; j++) {
                    const theta = 2 * Math.PI * j / subdivisions;
                    const x = Math.cos(theta) * r;
                    const z = Math.sin(theta) * r;
                    vertices.push({ x, y, z });
                }
            }

            // 生成索引
            for (let i = 0; i < subdivisions; i++) {
                for (let j = 0; j < subdivisions; j++) {
                    const a = i * (subdivisions + 1) + j;
                    const b = a + 1;
                    const c = (i + 1) * (subdivisions + 1) + j;
                    const d = c + 1;
                    indices.push(a, b, c);
                    indices.push(b, d, c);
                }
            }
            return JSON.stringify({ vertices, indices });
        }

        // 计算三角形法向量
        getTriangleNormal(v1, v2, v3) {
            // 计算两条边
            const edge1 = {
                x: v2.x - v1.x,
                y: v2.y - v1.y,
                z: v2.z - v1.z
            };
            const edge2 = {
                x: v3.x - v1.x,
                y: v3.y - v1.y,
                z: v3.z - v1.z
            };

            // 叉积得到法向量
            const normal = {
                x: edge1.y * edge2.z - edge1.z * edge2.y,
                y: edge1.z * edge2.x - edge1.x * edge2.z,
                z: edge1.x * edge2.y - edge1.y * edge2.x
            };

            // 归一化
            const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
            if (len === 0) return { x: 0, y: 0, z: 0 };
            return {
                x: normal.x / len,
                y: normal.y / len,
                z: normal.z / len
            };
        }

        // 检查三角形是否面向摄像机
        isTriangleVisible(v1, v2, v3, cameraPos) {
            // 计算三角形中心
            const center = {
                x: (v1.x + v2.x + v3.x) / 3,
                y: (v1.y + v2.y + v3.y) / 3,
                z: (v1.z + v2.z + v3.z) / 3
            };

            // 计算视线方向（从三角形中心指向摄像机）
            const viewDir = {
                x: cameraPos.x - center.x,
                y: cameraPos.y - center.y,
                z: cameraPos.z - center.z
            };

            // 计算法向量
            const normal = this.getTriangleNormal(v1, v2, v3);

            // 点积：如果 > 0，法向量指向摄像机，三角形可见
            const dot = normal.x * viewDir.x + normal.y * viewDir.y + normal.z * viewDir.z;

            return dot > 0;
        }

        getRenderLinesBackfaceCulled() {
            const aspect = this.getScreenAspect();
            const linesWithDepth = [];

            for (const obj of this.worldProps.values()) {
                if (!obj.mesh || !obj.mesh.vertices || !obj.mesh.indices) continue;

                const vertices = obj.mesh.vertices;
                const indices = obj.mesh.indices;

                if (!Array.isArray(vertices) || !Array.isArray(indices)) continue;

                // 变换后的顶点
                const transformedVerts = [];
                for (let i = 0; i < vertices.length; i++) {
                    const v = vertices[i];
                    if (v && typeof v.x === 'number' && typeof v.y === 'number' && typeof v.z === 'number') {
                        transformedVerts.push(this.transformPoint(v, obj.position, obj.rotation, obj.scale));
                    } else {
                        transformedVerts.length = 0;
                        break;
                    }
                }

                if (transformedVerts.length === 0) continue;

                // 处理每个三角形
                for (let i = 0; i < indices.length; i += 3) {
                    const i1 = indices[i];
                    const i2 = indices[i + 1];
                    const i3 = indices[i + 2];

                    if (i1 >= transformedVerts.length || i2 >= transformedVerts.length || i3 >= transformedVerts.length) continue;

                    const v1 = transformedVerts[i1];
                    const v2 = transformedVerts[i2];
                    const v3 = transformedVerts[i3];

                    // 背面剔除：检查三角形是否面向摄像机
                    if (!this.isTriangleVisible(v1, v2, v3, this.cameraPos)) continue;

                    // 只投影可见三角形的边
                    const edges = [[v1, v2], [v2, v3], [v3, v1]];
                    for (const edge of edges) {
                        const clipped = this.clipLine3D(edge[0], edge[1], aspect);
                        if (clipped) {
                            const lineStr = `${clipped.x1},${clipped.y1},${clipped.x2},${clipped.y2}`;
                            const depth = this.getLineAverageDepth(edge[0], edge[1]);
                            linesWithDepth.push({ line: lineStr, depth: depth });
                        }
                    }
                }
            }

            // 按深度从大到小排序（最远到最近）
            linesWithDepth.sort((a, b) => b.depth - a.depth);

            // 返回线段列表
            return linesWithDepth.map(item => item.line).join(';');
        }

        // ========== 变换矩阵辅助 ==========
        transformPoint(point, pos, rot, scale) {
            let { x, y, z } = point;
            // 缩放
            x *= scale.x;
            y *= scale.y;
            z *= scale.z;
            // 旋转 (ZYX顺序)
            const rx = this.degToRad(rot.x);
            const ry = this.degToRad(rot.y);
            const rz = this.degToRad(rot.z);
            // 绕X
            let y1 = y * Math.cos(rx) - z * Math.sin(rx);
            let z1 = z * Math.cos(rx) + y * Math.sin(rx);
            let x1 = x;
            // 绕Y
            let x2 = x1 * Math.cos(ry) + z1 * Math.sin(ry);
            let z2 = z1 * Math.cos(ry) - x1 * Math.sin(ry);
            let y2 = y1;
            // 绕Z
            let x3 = x2 * Math.cos(rz) - y2 * Math.sin(rz);
            let y3 = y2 * Math.cos(rz) + x2 * Math.sin(rz);
            let z3 = z2;
            // 平移
            return { x: x3 + pos.x, y: y3 + pos.y, z: z3 + pos.z };
        }

        getRenderLinesWithDepth() {
            const aspect = this.getScreenAspect();
            const linesWithDepth = [];

            for (const obj of this.worldProps.values()) {
                if (!obj.mesh || !obj.mesh.vertices || !obj.mesh.indices) continue;

                const vertices = obj.mesh.vertices;
                const indices = obj.mesh.indices;

                if (!Array.isArray(vertices) || !Array.isArray(indices)) continue;

                const transformedVerts = [];
                for (let i = 0; i < vertices.length; i++) {
                    const v = vertices[i];
                    if (v && typeof v.x === 'number' && typeof v.y === 'number' && typeof v.z === 'number') {
                        transformedVerts.push(this.transformPoint(v, obj.position, obj.rotation, obj.scale));
                    } else {
                        transformedVerts.length = 0;
                        break;
                    }
                }

                if (transformedVerts.length === 0) continue;

                for (let i = 0; i < indices.length; i += 3) {
                    const i1 = indices[i];
                    const i2 = indices[i + 1];
                    const i3 = indices[i + 2];

                    if (i1 >= transformedVerts.length || i2 >= transformedVerts.length || i3 >= transformedVerts.length) continue;

                    const v1 = transformedVerts[i1];
                    const v2 = transformedVerts[i2];
                    const v3 = transformedVerts[i3];

                    const edges = [[v1, v2], [v2, v3], [v3, v1]];
                    for (const edge of edges) {
                        const clipped = this.clipLine3D(edge[0], edge[1], aspect);
                        if (clipped) {
                            const lineStr = `${clipped.x1},${clipped.y1},${clipped.x2},${clipped.y2}`;
                            const depth = this.getLineAverageDepth(edge[0], edge[1]);
                            linesWithDepth.push({ line: lineStr, depth: depth });
                        }
                    }
                }
            }

            // 按深度从大到小排序（最远到最近）
            linesWithDepth.sort((a, b) => b.depth - a.depth);

            // 返回格式： "线段1,深度1;线段2,深度2;线段3,深度3"
            return linesWithDepth.map(item => `${item.line},${item.depth}`).join(';');
        }

        getLineDepth(args) {
            const parts = args.SEGMENT.split(',');
            if (parts.length < 5) return 0;
            return parseFloat(parts[4]) || 0;
        }

        // ========== 修复: 渲染所有对象 ==========
        getRenderLines() {
            const aspect = this.getScreenAspect();
            const linesWithDepth = [];  // 存储 { line, depth }

            for (const obj of this.worldProps.values()) {
                if (!obj.mesh || !obj.mesh.vertices || !obj.mesh.indices) continue;

                const vertices = obj.mesh.vertices;
                const indices = obj.mesh.indices;

                if (!Array.isArray(vertices) || !Array.isArray(indices)) continue;

                // 变换后的顶点
                const transformedVerts = [];
                for (let i = 0; i < vertices.length; i++) {
                    const v = vertices[i];
                    if (v && typeof v.x === 'number' && typeof v.y === 'number' && typeof v.z === 'number') {
                        transformedVerts.push(this.transformPoint(v, obj.position, obj.rotation, obj.scale));
                    } else {
                        transformedVerts.length = 0;
                        break;
                    }
                }

                if (transformedVerts.length === 0) continue;

                // 处理每个三角形
                for (let i = 0; i < indices.length; i += 3) {
                    const i1 = indices[i];
                    const i2 = indices[i + 1];
                    const i3 = indices[i + 2];

                    if (i1 >= transformedVerts.length || i2 >= transformedVerts.length || i3 >= transformedVerts.length) continue;

                    const v1 = transformedVerts[i1];
                    const v2 = transformedVerts[i2];
                    const v3 = transformedVerts[i3];

                    const edges = [[v1, v2], [v2, v3], [v3, v1]];
                    for (const edge of edges) {
                        const clipped = this.clipLine3D(edge[0], edge[1], aspect);
                        if (clipped) {
                            const lineStr = `${clipped.x1},${clipped.y1},${clipped.x2},${clipped.y2}`;
                            // 计算这条线段的平均深度（使用原始世界坐标的端点）
                            const depth = this.getLineAverageDepth(edge[0], edge[1]);
                            linesWithDepth.push({ line: lineStr, depth: depth });
                        }
                    }
                }
            }

            // 按深度从大到小排序（远的先画，近的后画 -  painter's algorithm）
            linesWithDepth.sort((a, b) => b.depth - a.depth);

            // 返回排序后的线段列表
            return linesWithDepth.map(item => item.line).join(';');
        }

        // ========== 修复: clipLine3D 添加除零保护 ==========
        worldToCamera(point) {
            let x = point.x - this.cameraPos.x;
            let y = point.y - this.cameraPos.y;
            let z = point.z - this.cameraPos.z;

            const rollRad = this.degToRad(this.cameraRotZ);
            const yawRad = this.degToRad(this.cameraRotY);
            const pitchRad = this.degToRad(this.cameraRotX);

            const cosRoll = Math.cos(rollRad);
            const sinRoll = Math.sin(rollRad);
            let x1 = x * cosRoll + y * sinRoll;
            let y1 = y * cosRoll - x * sinRoll;
            let z1 = z;

            const cosYaw = Math.cos(yawRad);
            const sinYaw = Math.sin(yawRad);
            let x2 = x1 * cosYaw + z1 * sinYaw;
            let z2 = z1 * cosYaw - x1 * sinYaw;
            let y2 = y1;

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

        computeOutCode(x, y) {
            let code = 0;
            if (x < -1) code |= 1;
            if (x > 1) code |= 2;
            if (y < -1) code |= 4;
            if (y > 1) code |= 8;
            return code;
        }

        moveRelativeToCamera(args) {
            const dx = Number(args.X);
            const dy = Number(args.Y);
            const dz = Number(args.Z);

            // 定义移动方向向量
            let moveDir = { x: 0, y: 0, z: 0 };

            // X: 沿右向量
            moveDir.x += dx * this.right.x;
            moveDir.y += dx * this.right.y;
            moveDir.z += dx * this.right.z;

            // Y: 沿上向量
            moveDir.x += dy * this.up.x;
            moveDir.y += dy * this.up.y;
            moveDir.z += dy * this.up.z;

            // Z: 沿前向量的反方向（因为前向指向 -Z）
            moveDir.x += dz * (-this.forward.x);
            moveDir.y += dz * (-this.forward.y);
            moveDir.z += dz * (-this.forward.z);

            this.cameraPos.x += moveDir.x;
            this.cameraPos.y += moveDir.y;
            this.cameraPos.z += moveDir.z;
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

        getLineAverageDepth(p1, p2) {
            // 将两个端点转换到相机空间，计算平均Z值（深度）
            const cp1 = this.worldToCamera(p1);
            const cp2 = this.worldToCamera(p2);
            return (cp1.z + cp2.z) / 2;
        }

        clipLine3D(p1, p2, aspect) {
            if (!p1 || !p2) return null;

            const cp1 = this.worldToCamera(p1);
            const cp2 = this.worldToCamera(p2);

            // 两点都在近平面后面 → 不可见
            if (cp1.z <= this.near && cp2.z <= this.near) return null;

            // 两点都在近平面前面 → 直接投影
            if (cp1.z > this.near && cp2.z > this.near) {
                const ndc1 = this.projectToNDC(cp1, aspect);
                const ndc2 = this.projectToNDC(cp2, aspect);
                const clipped = this.clipLine(ndc1.x, ndc1.y, ndc2.x, ndc2.y);
                if (clipped.visible) {
                    return { x1: clipped.x1, y1: clipped.y1, x2: clipped.x2, y2: clipped.y2 };
                }
                return null;
            }

            // 一个在前，一个在后 → 需要插值
            let start = cp1, end = cp2;

            if (cp1.z <= this.near && cp2.z > this.near) {
                const t = (this.near - cp1.z) / (cp2.z - cp1.z);
                start = {
                    x: cp1.x + t * (cp2.x - cp1.x),
                    y: cp1.y + t * (cp2.y - cp1.y),
                    z: this.near + 0.0001  // 关键修复：加一个小偏移，确保大于近平面
                };
            } else if (cp2.z <= this.near && cp1.z > this.near) {
                const t = (this.near - cp2.z) / (cp1.z - cp2.z);
                end = {
                    x: cp2.x + t * (cp1.x - cp2.x),
                    y: cp2.y + t * (cp1.y - cp2.y),
                    z: this.near + 0.0001  // 关键修复：加一个小偏移
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

        // ========== 原有投影积木 ==========
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