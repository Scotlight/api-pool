// ==================== Gemini API 转发模块 ====================
// 基于 Scotlight/gemini 项目的简洁实现
// https://github.com/Scotlight/gemini

import { API_BASE_URL, GEMINI_CHAT_NATIVE_PATH } from './constants.js';
import { estimateTokenCount } from './utils.js';

/**
 * 估算消息数组的 token 数量
 */
function estimateTokensFromMessages(messages) {
  let totalTokens = 0;
  
  for (const msg of messages) {
    totalTokens += 4; // 每条消息的固定开销
    
    if (typeof msg.content === 'string') {
      totalTokens += estimateTokenCount(msg.content, true);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'text') {
          totalTokens += estimateTokenCount(part.text, true);
        } else if (part.type === 'image_url') {
          totalTokens += 85;
        }
      }
    }
  }
  
  totalTokens += 3;
  return Math.round(totalTokens);
}

/**
 * 生成随机聊天 ID（OpenAI 格式）
 */
function generateChatId() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomChar = () => characters[Math.floor(Math.random() * characters.length)];
  return Array.from({ length: 29 }, randomChar).join("");
}

/**
 * OpenAI 消息格式转换为 Gemini 格式
 */
function convertMessagesToGemini(messages) {
  const contents = [];
  let systemInstruction = null;
  
  for (const msg of messages) {
    // 处理 system 消息
    if (msg.role === 'system') {
      systemInstruction = {
        parts: [{ text: msg.content }]
      };
      continue;
    }
    
    const role = msg.role === 'assistant' ? 'model' : 'user';
    
    // 处理文本内容
    if (typeof msg.content === 'string') {
      contents.push({
        role: role,
        parts: [{ text: msg.content }]
      });
    }
    // 处理多模态内容
    else if (Array.isArray(msg.content)) {
      const parts = [];
      for (const part of msg.content) {
        if (part.type === 'text') {
          parts.push({ text: part.text });
        } else if (part.type === 'image_url') {
          const imageUrl = part.image_url.url;
          if (imageUrl.startsWith('data:')) {
            const [header, base64Data] = imageUrl.split(',');
            const mimeType = header.split(':')[1].split(';')[0];
            parts.push({
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            });
          }
        }
      }
      contents.push({
        role: role,
        parts: parts
      });
    }
  }
  
  return { systemInstruction, contents };
}

/**
 * 转换 OpenAI 请求为 Gemini 请求
 */
function convertOpenAIToGemini(openaiRequest) {
  const { systemInstruction, contents } = convertMessagesToGemini(openaiRequest.messages);
  
  const geminiRequest = {
    contents: contents
  };
  
  // 添加 system_instruction（v1beta 使用下划线格式）
  if (systemInstruction) {
    geminiRequest.system_instruction = systemInstruction;
  }
  
  // 转换生成配置
  const generationConfig = {};
  
  if (openaiRequest.temperature !== undefined) {
    generationConfig.temperature = openaiRequest.temperature;
  }
  
  if (openaiRequest.max_tokens !== undefined) {
    generationConfig.maxOutputTokens = openaiRequest.max_tokens;
  }
  
  if (openaiRequest.top_p !== undefined) {
    generationConfig.topP = openaiRequest.top_p;
  }
  
  if (openaiRequest.stop !== undefined) {
    generationConfig.stopSequences = Array.isArray(openaiRequest.stop) 
      ? openaiRequest.stop 
      : [openaiRequest.stop];
  }
  
  if (Object.keys(generationConfig).length > 0) {
    geminiRequest.generationConfig = generationConfig;
  }
  
  // 安全设置：禁用所有过滤
  geminiRequest.safetySettings = [
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
  ];
  
  return geminiRequest;
}

/**
 * 转换 Gemini 响应为 OpenAI 格式（非流式）
 */
function convertGeminiToOpenAI(geminiResponse, model) {
  let content = '';
  
  if (geminiResponse.candidates && geminiResponse.candidates.length > 0) {
    const candidate = geminiResponse.candidates[0];
    if (candidate.content && candidate.content.parts) {
      content = candidate.content.parts.map(p => p.text || '').join('');
    }
  }
  
  // finishReason 映射
  const reasonsMap = {
    "STOP": "stop",
    "MAX_TOKENS": "length",
    "SAFETY": "content_filter",
    "RECITATION": "content_filter"
  };
  
  const finishReason = geminiResponse.candidates?.[0]?.finishReason || 'stop';
  
  return {
    id: `chatcmpl-${generateChatId()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: content
      },
      finish_reason: reasonsMap[finishReason] || 'stop'
    }],
    usage: {
      prompt_tokens: geminiResponse.usageMetadata?.promptTokenCount || 0,
      completion_tokens: geminiResponse.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: geminiResponse.usageMetadata?.totalTokenCount || 0
    }
  };
}

/**
 * 流式处理：解析 SSE 响应行
 */
const responseLineRE = /^data: (.*)(?:\n\n|\r\r|\r\n\r\n)/;

function parseStream(chunk, controller) {
  this.buffer += chunk;
  
  do {
    const match = this.buffer.match(responseLineRE);
    if (!match) break;
    
    controller.enqueue(match[1]);
    this.buffer = this.buffer.substring(match[0].length);
  } while (true);
}

function parseStreamFlush(controller) {
  if (this.buffer) {
    console.error("Stream buffer has remaining data:", this.buffer);
    controller.enqueue(this.buffer);
  }
}

/**
 * 流式处理：转换为 OpenAI 格式
 */
const delimiter = "\n\n";
const sseline = (obj) => {
  obj.created = Math.floor(Date.now() / 1000);
  return "data: " + JSON.stringify(obj) + delimiter;
};

function toOpenAiStream(line, controller) {
  let data;
  
  try {
    data = JSON.parse(line);
    if (!data.candidates) {
      throw new Error("Invalid completion chunk object");
    }
  } catch (err) {
    console.error("Error parsing stream line:", err);
    controller.enqueue(line + delimiter);
    return;
  }
  
  // finishReason 映射
  const reasonsMap = {
    "STOP": "stop",
    "MAX_TOKENS": "length",
    "SAFETY": "content_filter",
    "RECITATION": "content_filter"
  };
  
  const candidate = data.candidates[0];
  if (!candidate) return;
  
  const index = candidate.index || 0;
  
  // 提取内容
  let content = '';
  if (candidate.content && candidate.content.parts) {
    content = candidate.content.parts.map(p => p.text || '').join('');
  }
  
  const finishReason = candidate.finishReason 
    ? (reasonsMap[candidate.finishReason] || 'stop')
    : null;
  
  // 第一个数据块：发送 role
  if (!this.last[index]) {
    const obj = {
      id: this.id,
      object: "chat.completion.chunk",
      model: data.modelVersion || this.model,
      choices: [{
        index: index,
        delta: { role: "assistant", content: "" },
        finish_reason: null
      }]
    };
    controller.enqueue(sseline(obj));
    this.last[index] = true;
  }
  
  // 发送内容数据块
  if (content) {
    const obj = {
      id: this.id,
      object: "chat.completion.chunk",
      model: data.modelVersion || this.model,
      choices: [{
        index: index,
        delta: { content: content },
        finish_reason: null
      }]
    };
    controller.enqueue(sseline(obj));
  }
  
  // 发送结束标记
  if (finishReason) {
    const obj = {
      id: this.id,
      object: "chat.completion.chunk",
      model: data.modelVersion || this.model,
      choices: [{
        index: index,
        delta: {},
        finish_reason: finishReason
      }]
    };
    
    // 包含 usage 信息
    if (data.usageMetadata && this.streamIncludeUsage) {
      obj.usage = {
        prompt_tokens: data.usageMetadata.promptTokenCount || 0,
        completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata.totalTokenCount || 0
      };
    }
    
    controller.enqueue(sseline(obj));
  }
}

function toOpenAiStreamFlush(controller) {
  controller.enqueue("data: [DONE]" + delimiter);
}

/**
 * 转发聊天完成请求到 Gemini API
 */
export async function forwardChatCompletion(env, pool, geminiKeyObj, reqBody) {
  const modelName = reqBody.model;
  const isStreaming = reqBody.stream === true;
  
  try {
    // 转换请求
    const geminiRequest = convertOpenAIToGemini(reqBody);
    
    // 构建 API URL（使用 v1beta 支持 systemInstruction）
    const action = isStreaming ? 'streamGenerateContent' : 'generateContent';
    let geminiUrl = `${API_BASE_URL}/v1beta/models/${modelName}:${action}?key=${geminiKeyObj.key}`;
    if (isStreaming) {
      geminiUrl += '&alt=sse';
    }
    
    // 调用 Gemini API
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiRequest)
    });
    
    // 处理流式响应
    if (isStreaming) {
      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        
        return new Response(errorText, {
          status: geminiResponse.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 使用 TransformStream 链式处理流
      const chatId = `chatcmpl-${generateChatId()}`;
      const transformedStream = geminiResponse.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TransformStream({
          transform: parseStream,
          flush: parseStreamFlush,
          buffer: "",
        }))
        .pipeThrough(new TransformStream({
          transform: toOpenAiStream,
          flush: toOpenAiStreamFlush,
          streamIncludeUsage: reqBody.stream_options?.include_usage,
          model: modelName,
          id: chatId,
          last: [],
        }))
        .pipeThrough(new TextEncoderStream());
      
      return new Response(transformedStream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // 处理非流式响应
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      
      return new Response(JSON.stringify({
        error: {
          message: errorData.error?.message || 'Gemini API 错误',
          type: 'api_error',
          code: geminiResponse.status
        }
      }), {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const geminiData = await geminiResponse.json();
    const openaiResponse = convertGeminiToOpenAI(geminiData, modelName);
    
    return new Response(JSON.stringify(openaiResponse), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('转发请求失败:', error);
    
    return new Response(JSON.stringify({
      error: {
        message: '转发到 Gemini API 失败: ' + error.message,
        type: 'server_error'
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 转发嵌入请求到 Gemini API
 */
export async function forwardEmbedding(env, pool, geminiKeyObj, reqBody) {
  try {
    const text = Array.isArray(reqBody.input) ? reqBody.input[0] : reqBody.input;
    const model = reqBody.model || 'text-embedding-004';
    
    const geminiUrl = `${API_BASE_URL}/v1beta/models/${model}:embedContent?key=${geminiKeyObj.key}`;
    
    const geminiRequest = {
      model: `models/${model}`,
      content: {
        parts: [{ text: text }]
      }
    };
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiRequest)
    });
    
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      
      return new Response(JSON.stringify({
        error: {
          message: errorData.error?.message || 'Gemini Embedding API 错误',
          type: 'api_error'
        }
      }), {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const geminiData = await geminiResponse.json();
    
    const openaiResponse = {
      object: 'list',
      data: [{
        object: 'embedding',
        embedding: geminiData.embedding.values,
        index: 0
      }],
      model: model,
      usage: {
        prompt_tokens: 0,
        total_tokens: 0
      }
    };
    
    return new Response(JSON.stringify(openaiResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        message: '转发 Embedding 请求失败: ' + error.message,
        type: 'server_error'
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
