# 领商 · 爆品生成（团队前后端 & Agent 联调文档）

## 1. 目录结构

```text
领商_爆品生成网站/
├── index.html          # 页面结构入口（双击可本地预览）
├── styles.css          # 页面样式与设计规范 Token（1440×1024 1x 还原）
├── api.js              # 后端 & AI Agent 统一接口适配层（含 Mock 开关）
├── app.js              # 页面交互与状态管理（纯 UI 逻辑，无硬编码数据）
├── API_SPEC.md         # 本联调接口规范文档
└── assets/             # 设计稿原图图标、Logo 与静态样机图
```

## 2. 快速切换联调模式

打开 `api.js` 顶部的 `API_CONFIG`：

```javascript
const API_CONFIG = {
  USE_MOCK: false,                        // 本地演示用 true；联调上线改为 false
  BACKEND_BASE_URL: "https://api.your-domain.com",
  AGENT_BASE_URL: "https://agent.your-domain.com",
  TIMEOUT_MS: 15000
};
```

> 鉴权默认从 `localStorage.getItem("lingshang_token")` 读取并自动注入 `Authorization: Bearer <token>` 请求头，可按项目实际鉴权方式在 `getAuthHeaders()` 中调整。

## 3. 统一响应包裹约定

所有 JSON 接口推荐采用统一结构（若直接返回业务对象 `api.js` 也可兼容）：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

- `code === 0` 表示成功；非 `0` 时前端会自动读取 `message` 弹出错误提示。

## 4. 预留接口清单（共 5 个）

### 接口 1：获取可关联商品列表（后端）

- **方法与路径**：`GET {BACKEND_BASE_URL}/api/products`
- **Query 参数**：`keyword`（搜索词，可选）、`page`（默认 `1`）、`pageSize`（默认 `200`）
- **响应 `data`**：

```json
{
  "total": 200,
  "list": [
    {
      "id": 1,
      "name": "Samsung S26",
      "color": "黑色",
      "weight": "130.2g",
      "price": "¥188.00",
      "packaging": "文案文案文案文案"
    }
  ]
}
```

### 接口 2：识别爆款链接并生成初版标题（AI Agent）

- **触发前置条件（前端已校验）**：已选择至少 1 件关联商品，且已输入有效 `http/https` 爆款链接。
- **方法与路径**：`POST {AGENT_BASE_URL}/api/agent/hot-product/recognize`
- **请求 Body**：

```json
{
  "productIds": [1, 2, 3],
  "hotLink": "https://qn.taobao.com/home.htm/mkt-shop/match-buy/create/pc?isFullWidth=true"
}
```

- **响应 `data`**：

```json
{
  "taskId": "task_20261122_001",
  "title": "AI 生成的初版爆款标题文案",
  "extractedInfo": {}
}
```

### 接口 3：AI 重新生成爆款标题（AI Agent）

- **触发时机**：用户点击标题框下方提示条中的「重新生成」。
- **方法与路径**：`POST {AGENT_BASE_URL}/api/agent/hot-product/regenerate-title`
- **请求 Body**：

```json
{
  "taskId": "task_20261122_001",
  "productIds": [1, 2, 3],
  "hotLink": "https://qn.taobao.com/...",
  "previousTitle": "上一版不满意的标题"
}
```

- **响应 `data`**：

```json
{
  "taskId": "task_20261122_001",
  "title": "CASETiFY 硅胶材质 波漾壳 手机壳 适用于iPhone 18 Pro/17 Air/Samsung S26 防摔保护套"
}
```

### 接口 4：标题合规与敏感词校验（后端风控 / Agent）

- **触发时机**：用户点击底部「校验并下载」时，前端先校验三项必填（关联商品 → 爆款链接 → 标题预览），随后调用本接口做内容安全（涉黄、血腥暴力/犯罪、涉毒、涉赌、涉政）与平台广告规范校验。
- **方法与路径**：`POST {BACKEND_BASE_URL}/api/compliance/validate-title`
- **请求 Body**：

```json
{
  "title": "用户最终确认或修改后的标题",
  "productIds": [1, 2, 3]
}
```

- **响应 `data`（通过）**：`{ "passed": true }`
- **响应 `data`（不通过）**：

```json
{
  "passed": false,
  "violationType": "sensitive",
  "category": "血腥暴力与犯罪",
  "toastMsg": "请重新修改你的标题内容",
  "inlineMsg": "标题包含违规敏感内容（血腥暴力与犯罪），请重新修改你的标题内容！"
}
```

### 接口 5：导出下载爆品方案（后端）

- **触发时机**：接口 4 返回 `passed: true` 后自动调用。
- **方法与路径**：`POST {BACKEND_BASE_URL}/api/hot-product/export`
- **请求 Body**：

```json
{
  "taskId": "task_20261122_001",
  "productIds": [1, 2, 3],
  "hotLink": "https://qn.taobao.com/...",
  "title": "校验通过的最终标题"
}
```

- **响应支持两种格式**：
  1. 直接返回文件流（CSV / Excel Blob），前端自动触发浏览器下载；
  2. 返回 JSON `{ "downloadUrl": "https://...", "filename": "领商_爆品生成方案.csv" }`。
