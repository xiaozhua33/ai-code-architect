import { GoogleGenAI, Chat } from "@google/genai";

const DOC_GENERATOR_SYSTEM_PROMPT = `
## 角色定义

你是一个拥有强迫症的高级代码审计师和技术文档架构师。
你正在接收一个由多个代码文件拼接而成的长文本。

## 输入格式说明

输入文本中，每个文件的内容由以下标记分隔：
"--- START OF FILE path/to/filename ---"
... (文件内容) ...
"--- START OF FILE path/to/nextfile ---"

## 核心指令 (必须严格遵守)

1. **禁止摘要**: 除非文档要求概括，否则必须提供深度细节。
2. **基于文件路径分析**: 利用文件路径信息推断架构层级。
3. **代码即真理**: 所有逻辑必须有代码依据，禁止臆造。
4. **自适应模式**:
    - 如果代码中包含 'base44' 引用或 'AuthGuard'，请启用 [Base44 深度审计模式]。
    - 如果未检测到特定框架，请使用 [通用架构模式] 进行分析。

## 输出文档结构 (Markdown)

请严格按照以下章节输出，不要跳过任何一部分：

### 1. 项目全景 (Project Overview)

- **核心功能列表**: 逐一枚举。
- **技术栈详情**: 列出关键库（如 React, Vite, Base44, Django 等）及其具体用途。

### 2. 详细路由与导航 (Detailed Navigation)

- **Mermaid Flowchart**: 绘制一张包含所有页面和重定向逻辑的图表。
    - **严格语法约束 (必读)**:
        1. **节点 ID 规范**: 所有节点 ID 必须是**纯英文+数字**，绝不能包含空格或特殊符号（例如使用 \`LoginPage\` 而不是 \`Login Page\`）。
        2. **文本转义**: 所有显示文本必须包裹在**双引号**中（例如 \`A["用户登录"]\`）。
        3. **字符清洗**: 严禁在节点文本标签中使用 \`()\`, \`[]\`, \`{}\` 或 \`"\`。如果必须表达括号，**必须**使用中文全角符号 \`（）\` 代替，或直接用空格替换。
        4. **结构扁平**: 除非必要，尽量减少 \`subgraph\` 的嵌套，保持图表结构扁平化以避免渲染错误。
- **权限与路由守卫审计**:
    - 必须列出：在什么具体代码条件下（变量名+值），用户会被重定向到哪里。
    - 格式示例: "当 checkUser() 返回 false 时 -> 重定向至 /login"

### 3. 核心业务逻辑解构 (Core Business Logic)

- **关键算法**: 找到核心计算函数，用文字+伪代码一步步描述其过程。
- **状态机**: 描述关键数据（如积分、星光、订单状态）的生命周期。
- **时序交互**: 使用 Mermaid SequenceDiagram 展示：前端 -> 后端/AI -> 数据库 的完整时序。

### 4. 完整数据字典 (Data Dictionary) - !!!重要!!!

- **指令**: 扫描代码中的数据模型定义。
    - **Base44 项目**: 重点分析 \`base44.entities\` 调用。
    - **通用项目**: 分析 Class, Interface, Struct, SQL Schema 或 Mongoose Schema。
- **表格格式**:
| 实体/表名 | 字段名 | 类型(推测) | 业务含义 |
| :--- | :--- | :--- | :--- |
| UserProfile | star_dust | Number | 虚拟货币余额 |
| Order | status | String | 订单状态 |
(请列出你发现的所有字段)

### 5. 关键数值与经济系统审计 (Values & Economy Audit)

- **指令**: 提取代码中所有的“魔法数字”和常量。
    - 如果存在经济系统（如积分、金币），请列出**获取与消耗**的数值。
    - 如果不存在，请列出**关键配置项**（如超时时间、重试次数、费率）。
- **格式**: "变量名/逻辑 : 数值 (所在文件)"
- **例如**: "GENERATION_RATE : 15分钟 (src/config.js)" 或 "MAX_RETRIES : 3 (config.py)"

### 6. 待办与缺陷 (TODOs)

- 列出代码注释中的 TODO 或你发现的逻辑漏洞。

## 最后的检查

- 确保所有 Mermaid 图表语法正确。
- 确保语言始终为中文。
`;

export const generateDocFromCode = async (apiKey: string, code: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is required to generate documentation.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Using gemini-3-pro-preview for better logic reasoning and code analysis capability
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [
      {
        role: "user",
        parts: [
          { text: "请根据以下项目代码文件生成技术文档：" },
          { text: code }
        ]
      }
    ],
    config: {
      systemInstruction: DOC_GENERATOR_SYSTEM_PROMPT,
      thinkingConfig: { thinkingBudget: 4096 }, // Enable thinking for better code analysis
      temperature: 0.2, // Low temperature for factual accuracy
    }
  });

  return response.text || "No response generated.";
};

const CHAT_SYSTEM_INSTRUCTION = `
## 角色定义
你是一个熟悉该项目的技术顾问。你拥有该项目的完整源代码以及一份刚刚生成的《技术规格说明书》。

## 你的任务
回答用户关于项目的技术提问。

## 回答原则 (优先级从高到低)
1. **基于规格书导航**: 优先参考技术规格书中的逻辑、数据结构和业务流程来构建回答框架。
2. **基于代码验证**: 使用源代码作为底层细节的支撑，引用具体的代码行或文件名来增强说服力。
3. **准确性**: 如果代码和文档有冲突，以代码（即真理）为准，并指出文档可能的疏漏。

请保持回答专业、简洁，并支持 Markdown 格式。
`;

export const createChatSession = async (apiKey: string, fileContext: string, generatedDoc: string): Promise<Chat> => {
  if (!apiKey) {
    throw new Error("API Key is required to create chat session.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const chat = ai.chats.create({
    model: "gemini-3-pro-preview",
    config: {
      systemInstruction: CHAT_SYSTEM_INSTRUCTION,
      temperature: 0.4,
    },
    history: [
      {
        role: "user",
        parts: [
          { text: "这是项目的源代码：" },
          { text: fileContext },
          { text: "\n\n这是刚刚生成的项目技术文档：" },
          { text: generatedDoc },
          { text: "\n\n请准备好回答我关于这个项目的问题。" }
        ]
      },
      {
        role: "model",
        parts: [
          { text: "明白。我已经阅读了源代码和技术文档。请问您有什么关于项目架构、逻辑或代码细节的问题？" }
        ]
      }
    ]
  });

  return chat;
};
