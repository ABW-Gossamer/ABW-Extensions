TurboWarp 扩展集合，包含原创扩展及二次修改优化版本。

## 扩展列表

| 扩展名称 | 版本 | 说明 |
|---------|------|------|
| Sprite Effects V3 | 1.0 | 基于 SharkPool V2 的性能优化版本，提供 SVG 滤镜及画布特效 |
| _待添加_ | - | - |

---

## 扩展详情

### Sprite Effects V3

基于 SharkPool 的 Sprite Effects V2 进行性能优化和功能增强。

**主要优化：**
- LRU 缓存机制（限制 100 条记录）用于图像转换
- 请求去重，防止重复加载相同资源
- OffscreenCanvas 支持，提高渲染性能
- SVG 解析字符串缓存，减少重复解析
- 画布滤镜更新防抖，减少频繁重绘
- 内存泄漏防护和资源清理

---

## 使用说明

1. 在 TurboWarp 编辑器中打开扩展库
2. 选择对应扩展进行加载
3. 各扩展的具体使用方法请参考源代码中的注释

---

## 许可证

本项目基于 MIT 许可证开源。

各扩展的原始版权归原作者所有，修改部分遵循相同许可证。

---

## 支持者

感谢以下用户对本项目的支持：

- [wasd2802](https://github.com/wasd2802) - 2026年3月

---

## 支持我！
QQ：3070922171
Bilibili: [Gossamer-丝](https://space.bilibili.com/2067930750)

## 致谢

- [SharkPool](https://sharkpool-sp.github.io/SharkPools-Extensions/)  
  提供 Sprite Effects V2 原始实现

- [TurboWarp](https://turbowarp.org/)  
  提供 Scratch 扩展运行环境

- 所有为本项目提供反馈和建议的开发者与用户

---

## 贡献

欢迎提交 Issue 和 Pull Request。

- [提交问题](https://github.com/ABW-Gossamer/ABW-Extensions/issues)
- [查看源代码](https://github.com/ABW-Gossamer/ABW-Extensions)

---

## 更新日志

### 2026-03-28
- 修复 Sprite Effects V3 滤镜注入时的标签闭合问题
- 优化 canvas 滤镜更新逻辑
