// ========== 领商 - 爆品生成 后端 & AI Agent 接口适配层 ==========
// 联调说明：
// 1. 本地演示/原型评审阶段保持 USE_MOCK = true，无需启动后端即可完整体验所有交互。
// 2. 后端与 Agent 服务部署就绪后，修改 BACKEND_BASE_URL / AGENT_BASE_URL 并将 USE_MOCK 设为 false 即可无缝切换真实接口。

(function (global) {
  const API_CONFIG = {
    USE_MOCK: true,
    BACKEND_BASE_URL: "https://api.example.com",
    AGENT_BASE_URL: "https://agent.example.com",
    TIMEOUT_MS: 15000,
    getAuthHeaders() {
      // 后端联调时可在此处注入登录态 Token，例如从 localStorage 读取
      const token = global.localStorage ? global.localStorage.getItem("lingshang_token") : "";
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return headers;
    }
  };

  // ========== 本地 Mock 静态数据与规则（仅 USE_MOCK = true 时生效） ==========
  const DEFAULT_SLOGAN =
    "手机壳不只是保护手机的铠甲，它是个性的宣言、是时尚的小跟班，我的手机壳，装着我的态度换个壳就像换种心情。";

  const AI_COMPLIANT_TITLES = [
    "CASETiFY 硅胶材质 波漾壳 手机壳 适用于iPhone 18 Pro/17 Air/Samsung S26 防摔保护套",
    "液态硅胶波漾纹手机壳 适用iPhone 18 Pro/16 Pro Max/S26 亲肤防滑全包镜头保护壳",
    "潮流波漾防摔硅胶保护套 兼容iPhone 18 Pro/17 Air/15 Pro Max 轻薄磁吸质感手机壳",
    "极简波纹液态硅胶手机壳 适配Samsung S26/iPhone 18 Pro 多色可选抗指纹防震保护壳"
  ];

  const SENSITIVE_CONTENT_RULES = [
    {
      category: "涉黄低俗",
      words: ["色情", "黄色", "涉黄", "淫秽", "情色", "裸聊", "嫖娼", "约炮", "成人片", "低俗", "招嫖", "黄片"]
    },
    {
      category: "血腥暴力与犯罪",
      words: ["暴力", "血腥", "犯罪", "杀人", "谋杀", "抢劫", "诈骗", "走私", "枪支", "炸弹", "恐袭", "恐怖分子", "黑社会", "砍人", "自杀", "绑架"]
    },
    {
      category: "涉毒违禁",
      words: ["毒品", "吸毒", "贩毒", "冰毒", "海洛因", "大麻", "鸦片", "摇头丸", "可卡因", "K粉", "制毒"]
    },
    {
      category: "涉赌违法",
      words: ["赌博", "博彩", "赌场", "网赌", "六合彩", "私彩", "赌球", "洗钱", "跑分", "聚众赌博"]
    },
    {
      category: "涉政敏感",
      words: ["政治人物", "国家领导人", "总统", "主席", "总理", "政党", "反动", "分裂国家", "邪教", "政治敏感"]
    }
  ];

  const FORBIDDEN_KEYWORDS = ["铠甲", "小跟班", "最", "第一", "绝对", "顶级", "全网最低", "假一赔十"];

  const MOCK_PRODUCTS = (() => {
    const baseItems = [
      { id: 1, name: "Samsung S26", color: "黑色", weight: "130.2g", price: "¥188.00", packaging: "文案文案文案文案" },
      { id: 2, name: "iPhone 18 Pro", color: "银色", weight: "118.6g", price: "¥188.00", packaging: "文案文案文案文案" },
      { id: 3, name: "iPhone 18 Pro", color: "黑色", weight: "118.6g", price: "¥188.00", packaging: "文案文案文案文案" }
    ];
    const models = [
      "iPhone 18 Pro Max", "iPhone 18 Pro", "iPhone 18", "iPhone 17 Air", "iPhone 17 Pro Max",
      "iPhone 17 Pro", "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 15 Pro Max", "Samsung S26 Ultra",
      "Samsung S26", "Samsung S25 Ultra", "Huawei Mate 80 Pro", "Huawei Pura 80", "Xiaomi 16 Pro",
      "OPPO Find X9 Pro", "vivo X200 Pro"
    ];
    const colors = [
      "星光白", "樱花粉", "酒红色", "钛灰蓝", "燕麦白", "钛金属灰", "冰川蓝", "奶油黄",
      "薄荷青", "雾霾蓝", "石墨黑", "曜石黑", "薰衣草紫", "松柏绿", "珊瑚橙", "玫瑰金"
    ];
    const prices = ["¥158.00", "¥168.00", "¥178.00", "¥188.00", "¥198.00", "¥218.00", "¥228.00"];
    const packagings = ["环保磁吸礼盒", "简约透明吸塑盒", "标准彩印纸盒", "定制防震硬盒", "轻奢磨砂抽屉盒"];

    const list = [...baseItems];
    for (let i = 4; i <= 200; i++) {
      const m = models[(i - 4) % models.length];
      const c = colors[(i * 3) % colors.length];
      const w = (110 + ((i * 7) % 28) + ((i * 3) % 10) / 10).toFixed(1) + "g";
      const p = prices[(i - 4) % prices.length];
      const pkg = packagings[(i - 4) % packagings.length];
      list.push({ id: i, name: m, color: c, weight: w, price: p, packaging: pkg });
    }
    return list;
  })();

  let mockAiIndex = 0;

  // ========== 通用 Fetch 封装（带超时与统一异常处理） ==========
  async function requestJson(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...API_CONFIG.getAuthHeaders(),
          ...(options.headers || {})
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const payload = await response.json();
      // 约定统一返回结构：{ code: 0, message: "ok", data: {...} }
      if (typeof payload.code === "number" && payload.code !== 0) {
        throw new Error(payload.message || "接口返回异常");
      }
      return payload.data !== undefined ? payload.data : payload;
    } finally {
      clearTimeout(timer);
    }
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ========== 5 个标准业务接口 ==========

  /**
   * 1. [后端接口] 获取可关联的商品列表
   * GET {BACKEND_BASE_URL}/api/products?keyword=&page=1&pageSize=200
   * 返回：{ total: number, list: Array<{ id, name, color, weight, price, packaging }> }
   */
  async function fetchProducts({ keyword = "", page = 1, pageSize = 200 } = {}) {
    if (API_CONFIG.USE_MOCK) {
      const kw = keyword.trim().toLowerCase();
      const filtered = kw
        ? MOCK_PRODUCTS.filter(
            (item) =>
              item.name.toLowerCase().includes(kw) ||
              item.color.toLowerCase().includes(kw) ||
              item.packaging.toLowerCase().includes(kw)
          )
        : MOCK_PRODUCTS;
      const start = (page - 1) * pageSize;
      return {
        total: filtered.length,
        list: filtered.slice(start, start + pageSize)
      };
    }

    const params = new URLSearchParams({
      keyword,
      page: String(page),
      pageSize: String(pageSize)
    });
    return requestJson(`${API_CONFIG.BACKEND_BASE_URL}/api/products?${params.toString()}`, {
      method: "GET"
    });
  }

  /**
   * 2. [AI Agent 接口] 识别爆款链接并生成初版标题
   * POST {AGENT_BASE_URL}/api/agent/hot-product/recognize
   * 入参：{ productIds: number[], hotLink: string }
   * 返回：{ taskId: string, title: string, extractedInfo?: object }
   */
  async function recognizeHotProduct({ productIds, hotLink }) {
    if (API_CONFIG.USE_MOCK) {
      await delay(420);
      return {
        taskId: `mock_task_${Date.now()}`,
        title: DEFAULT_SLOGAN,
        extractedInfo: { sourceUrl: hotLink, matchedCount: productIds.length }
      };
    }

    return requestJson(`${API_CONFIG.AGENT_BASE_URL}/api/agent/hot-product/recognize`, {
      method: "POST",
      body: JSON.stringify({ productIds, hotLink })
    });
  }

  /**
   * 3. [AI Agent 接口] 重新生成合规爆款标题
   * POST {AGENT_BASE_URL}/api/agent/hot-product/regenerate-title
   * 入参：{ taskId: string | null, productIds: number[], hotLink: string, previousTitle: string }
   * 返回：{ taskId: string, title: string }
   */
  async function regenerateHotTitle({ taskId = null, productIds, hotLink, previousTitle }) {
    if (API_CONFIG.USE_MOCK) {
      await delay(450);
      const nextTitle = AI_COMPLIANT_TITLES[mockAiIndex % AI_COMPLIANT_TITLES.length];
      mockAiIndex += 1;
      return {
        taskId: taskId || `mock_task_${Date.now()}`,
        title: nextTitle
      };
    }

    return requestJson(`${API_CONFIG.AGENT_BASE_URL}/api/agent/hot-product/regenerate-title`, {
      method: "POST",
      body: JSON.stringify({ taskId, productIds, hotLink, previousTitle })
    });
  }

  /**
   * 4. [后端风控 / 合规校验接口] 校验标题是否包含敏感违禁词或违反平台规则
   * POST {BACKEND_BASE_URL}/api/compliance/validate-title
   * 入参：{ title: string, productIds: number[] }
   * 返回：{ passed: boolean, violationType?: "sensitive"|"platform", category?: string, toastMsg?: string, inlineMsg?: string }
   */
  async function validateTitle({ title, productIds }) {
    if (API_CONFIG.USE_MOCK) {
      const trimmed = title.trim();
      const lower = trimmed.toLowerCase();

      for (const rule of SENSITIVE_CONTENT_RULES) {
        const hit = rule.words.find((w) => lower.includes(w.toLowerCase()));
        if (hit) {
          return {
            passed: false,
            violationType: "sensitive",
            category: rule.category,
            toastMsg: "请重新修改你的标题内容",
            inlineMsg: `标题包含违规敏感内容（${rule.category}），请重新修改你的标题内容！`
          };
        }
      }

      if (trimmed.length < 10 || trimmed === DEFAULT_SLOGAN || FORBIDDEN_KEYWORDS.some((w) => trimmed.includes(w))) {
        return {
          passed: false,
          violationType: "platform",
          toastMsg: "下载失败",
          inlineMsg: "不符合平台规则，请重新生成或修改！"
        };
      }

      return { passed: true };
    }

    return requestJson(`${API_CONFIG.BACKEND_BASE_URL}/api/compliance/validate-title`, {
      method: "POST",
      body: JSON.stringify({ title, productIds })
    });
  }

  /**
   * 5. [后端导出接口] 导出并下载爆品生成方案
   * POST {BACKEND_BASE_URL}/api/hot-product/export
   * 入参：{ taskId: string | null, productIds: number[], hotLink: string, title: string }
   * 返回：支持 JSON { downloadUrl, filename } 或直接返回文件流 Blob；Mock 模式下前端生成 CSV 下载
   */
  async function exportHotProduct({ taskId = null, productIds, products = [], hotLink, title }) {
    if (API_CONFIG.USE_MOCK) {
      const header = ["爆款链接", "生成标题", "商品名称", "颜色", "重量", "价格", "外包装形状"];
      const rows = products.map((item) => [
        hotLink,
        title,
        item.name,
        item.color,
        item.weight,
        item.price,
        item.packaging
      ]);

      const csvContent =
        "\uFEFF" +
        [header, ...rows]
          .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
          .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      triggerBrowserDownload(blob, "领商_爆品生成方案.csv");
      return { success: true, filename: "领商_爆品生成方案.csv" };
    }

    const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/api/hot-product/export`, {
      method: "POST",
      headers: API_CONFIG.getAuthHeaders(),
      body: JSON.stringify({ taskId, productIds, hotLink, title })
    });

    if (!response.ok) {
      throw new Error(`导出失败 (HTTP ${response.status})`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      if (payload.code && payload.code !== 0) {
        throw new Error(payload.message || "导出失败");
      }
      const data = payload.data || payload;
      if (data.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = data.filename || "领商_爆品生成方案.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return data;
    }

    const blob = await response.blob();
    triggerBrowserDownload(blob, "领商_爆品生成方案.csv");
    return { success: true };
  }

  function triggerBrowserDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  global.LingShangAPI = {
    config: API_CONFIG,
    fetchProducts,
    recognizeHotProduct,
    regenerateHotTitle,
    validateTitle,
    exportHotProduct
  };
})(window);
