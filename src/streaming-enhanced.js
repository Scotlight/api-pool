// ==================== 增强流式响应处理模块 ====================
// 参考 gemini-balance 和 gcli2api 的优秀实践
// 支持：假流式、防截断、自动重试、思考内容分离

import { Logger } from './utils.js';
import { estimateTokenCount } from './utils.js';

/**
 * 流式响应处理配置
 */
export const STREAMING_CONFIG = {
  // 基础延迟配置
  minDelay: 20,              // 最小延迟(ms)
  maxDelay: 100,             // 最大延迟(ms)
  avgDelay: 50,              // 平均延迟(ms)
  
  // 假流式配置
  fakeStreamChunkSize: 3,    // 假流式每次发送的字符数
  fakeStreamDelay: 50,       // 假流式延迟(ms)
  
  // 防截断配置
  maxRetries: 3,             // 最大重试次数
  truncationThreshold: 0.8,  // 截断判断阈值（响应长度/最大长度）
  
  // 思考内容分离
  separateThinking: true,    // 是否分离思考内容
  thinkingTag: '<think>',    // 思考内容标签
  
  // 性能优化
  enableAntiTruncation: true,  // 启用防截断
  enableFakeStream: false,     // 默认关闭假流式（仅在必要时启用）
  adaptiveDelayFactor: 0.3,    // 自适应延迟因子
};

/**
 * 处理增强流式响应
 * 支持假流式、防截断、自动重试
 * @param {ReadableStream} geminiStream - Gemini API 返回的流
 * @param {WritableStream} outputStream - 输出流
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 处理结果
 */
export async function processEnhancedStream(geminiStream, outputStream, options = {}) {
  const config = { ...STREAMING_CONFIG, ...options };
  const reader = geminiStream.getReader();
  const writer = outputStream.getWriter();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  let buffer = '';
  let completeContent = '';
  let thinkingContent = '';
  let regularContent = '';
  let completionTokens = 0;
  let finishReason = null;
  let isFirstChunk = true;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // 流结束，处理剩余缓冲
        if (buffer.trim()) {
          await processStreamChunk(buffer, writer, encoder, config);
        }
        
        // 发送 [DONE] 标记
        await writer.write(encoder.encode('data: [DONE]\\n\\n'));
        
        // 计算最终 token 数
        completionTokens = estimateTokenCount(completeContent);
        
        Logger.debug(`流式响应完成，总计 ${completionTokens} tokens`);
        break;
      }

      // 处理新数据
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // 按行分割处理
      const lines = buffer.split('\\n');
      buffer = lines.pop() || ''; // 保留最后不完整的行

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;
        
        const dataStr = line.substring(6).trim();
        if (dataStr === '[DONE]') continue;

        try {
          const geminiData = JSON.parse(dataStr);
          
          // 提取内容
          if (geminiData.candidates && geminiData.candidates[0]) {
            const candidate = geminiData.candidates[0];
            
            // 提取文本内容
            if (candidate.content && candidate.content.parts) {
              for (const part of candidate.content.parts) {
                if (part.text) {
                  completeContent += part.text;
                  
                  // 分离思考内容
                  if (config.separateThinking) {
                    const { thinking, regular } = separateThinkingContent(part.text);
                    thinkingContent += thinking;
                    regularContent += regular;
                  } else {
                    regularContent += part.text;
                  }
                }
              }
            }
            
            // 检查完成状态
            if (candidate.finishReason) {
              finishReason = candidate.finishReason;
            }
          }

          // 转换为 OpenAI 格式并发送
          const openaiChunk = convertGeminiChunkToOpenAI(geminiData, options.model, isFirstChunk);
          if (openaiChunk) {
            await writer.write(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\\n\\n`));
            isFirstChunk = false;
          }

        } catch (e) {
          Logger.debug(`解析流式数据失败: ${e.message}`);
        }
      }
    }

  } catch (error) {
    Logger.error('处理增强流式响应时出错:', error);
    
    // 发送错误响应
    const errorChunk = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: options.model || 'gemini-pro',
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'error'
      }],
      error: {
        message: error.message,
        type: 'stream_error'
      }
    };
    
    await writer.write(encoder.encode(`data: ${JSON.stringify(errorChunk)}\\n\\n`));
    await writer.write(encoder.encode('data: [DONE]\\n\\n'));
    
  } finally {
    try {
      await writer.close();
    } catch (e) {
      Logger.debug('关闭写入器失败:', e.message);
    }
  }

  return {
    completionTokens,
    totalContent: completeContent,
    regularContent,
    thinkingContent,
    finishReason
  };
}

/**
 * 处理流式数据块
 */
async function processStreamChunk(chunk, writer, encoder, config) {
  // 实现自适应延迟的流式发送
  await writer.write(encoder.encode(chunk));
}

/**
 * 转换 Gemini 流式块为 OpenAI 格式
 * @param {Object} geminiChunk - Gemini 流式数据块
 * @param {string} model - 模型名称
 * @param {boolean} isFirst - 是否是第一个块
 * @returns {Object|null} OpenAI 格式的数据块
 */
function convertGeminiChunkToOpenAI(geminiChunk, model, isFirst = false) {
  if (!geminiChunk.candidates || !geminiChunk.candidates[0]) {
    return null;
  }

  const candidate = geminiChunk.candidates[0];
  const delta = {};
  
  // 第一个块包含 role
  if (isFirst) {
    delta.role = 'assistant';
  }
  
  // 提取内容
  if (candidate.content && candidate.content.parts) {
    const text = candidate.content.parts.map(p => p.text || '').join('');
    if (text) {
      delta.content = text;
    }
  }

  // 构建 OpenAI 格式响应
  const openaiChunk = {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: model || 'gemini-pro',
    choices: [{
      index: 0,
      delta: delta,
      finish_reason: candidate.finishReason ? mapFinishReason(candidate.finishReason) : null
    }]
  };

  return openaiChunk;
}

/**
 * 映射 Gemini 的 finishReason 到 OpenAI 格式
 */
function mapFinishReason(geminiReason) {
  const reasonMap = {
    'STOP': 'stop',
    'MAX_TOKENS': 'length',
    'SAFETY': 'content_filter',
    'RECITATION': 'content_filter',
    'OTHER': 'stop'
  };
  return reasonMap[geminiReason] || 'stop';
}

/**
 * 分离思考内容和常规内容
 * @param {string} text - 原始文本
 * @returns {Object} { thinking: string, regular: string }
 */
function separateThinkingContent(text) {
  const thinkingPattern = /<think>([\\s\\S]*?)<\\/think>/g;
  let thinking = '';
  let regular = text;
  
  let match;
  while ((match = thinkingPattern.exec(text)) !== null) {
    thinking += match[1];
  }
  
  // 从常规内容中移除思考部分
  regular = regular.replace(thinkingPattern, '');
  
  return { thinking, regular };
}

/**
 * 假流式处理（将非流式响应转换为流式）
 * 用于某些不支持真实流式的场景
 * @param {string} content - 完整内容
 * @param {WritableStream} outputStream - 输出流
 * @param {Object} options - 配置选项
 */
export async function processFakeStream(content, outputStream, options = {}) {
  const config = { ...STREAMING_CONFIG, ...options };
  const writer = outputStream.getWriter();
  const encoder = new TextEncoder();
  
  const model = options.model || 'gemini-pro';
  const chunkSize = config.fakeStreamChunkSize;
  const delay = config.fakeStreamDelay;
  
  try {
    // 发送初始块（role）
    const firstChunk = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        delta: { role: 'assistant' },
        finish_reason: null
      }]
    };
    await writer.write(encoder.encode(`data: ${JSON.stringify(firstChunk)}\\n\\n`));
    
    // 分块发送内容
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.substring(i, Math.min(i + chunkSize, content.length));
      
      const dataChunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          delta: { content: chunk },
          finish_reason: null
        }]
      };
      
      await writer.write(encoder.encode(`data: ${JSON.stringify(dataChunk)}\\n\\n`));
      
      // 添加延迟模拟流式效果
      if (i + chunkSize < content.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // 发送完成块
    const finalChunk = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'stop'
      }]
    };
    await writer.write(encoder.encode(`data: ${JSON.stringify(finalChunk)}\\n\\n`));
    await writer.write(encoder.encode('data: [DONE]\\n\\n'));
    
  } catch (error) {
    Logger.error('假流式处理出错:', error);
  } finally {
    try {
      await writer.close();
    } catch (e) {
      Logger.debug('关闭写入器失败:', e.message);
    }
  }
}

/**
 * 防截断检测
 * 检测响应是否被截断，需要重试
 * @param {string} content - 响应内容
 * @param {number} maxTokens - 最大 token 数
 * @param {string} finishReason - 完成原因
 * @returns {boolean} 是否被截断
 */
export function detectTruncation(content, maxTokens, finishReason) {
  // 如果明确因为长度限制结束
  if (finishReason === 'MAX_TOKENS' || finishReason === 'length') {
    return true;
  }
  
  // 如果内容接近最大长度
  if (maxTokens) {
    const contentTokens = estimateTokenCount(content);
    if (contentTokens >= maxTokens * STREAMING_CONFIG.truncationThreshold) {
      return true;
    }
  }
  
  // 检测常见的截断模式（例如句子未完成）
  const lastChars = content.slice(-10).trim();
  const incompleteSentence = /[^.!?。！？]\\s*$/.test(content);
  
  return incompleteSentence && finishReason !== 'STOP';
}

/**
 * 自动重试处理（防截断）
 * @param {Function} requestFunc - 请求函数
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 完整响应
 */
export async function retryWithAntiTruncation(requestFunc, options = {}) {
  const maxRetries = options.maxRetries || STREAMING_CONFIG.maxRetries;
  let attempts = 0;
  let completeContent = '';
  let lastResponse = null;

  while (attempts < maxRetries) {
    try {
      const response = await requestFunc();
      lastResponse = response;
      
      const content = response.content || '';
      completeContent += content;
      
      // 检测是否截断
      const isTruncated = detectTruncation(
        content,
        options.maxTokens,
        response.finishReason
      );
      
      if (!isTruncated) {
        // 没有截断，返回完整响应
        return {
          ...response,
          content: completeContent,
          retryCount: attempts
        };
      }
      
      // 被截断，准备重试
      Logger.debug(`检测到截断，准备重试 (${attempts + 1}/${maxRetries})`);
      attempts++;
      
      // 更新请求以继续生成
      if (options.onRetry) {
        options.onRetry(completeContent, attempts);
      }
      
    } catch (error) {
      Logger.error(`重试失败 (${attempts}/${maxRetries}):`, error);
      throw error;
    }
  }
  
  // 达到最大重试次数
  Logger.warn(`达到最大重试次数 ${maxRetries}，返回部分内容`);
  return {
    ...lastResponse,
    content: completeContent,
    retryCount: attempts,
    truncated: true
  };
}

/**
 * 智能流式处理器
 * 根据响应类型自动选择最佳处理方式
 */
export class SmartStreamProcessor {
  constructor(config = {}) {
    this.config = { ...STREAMING_CONFIG, ...config };
  }

  /**
   * 处理流式响应
   */
  async processStream(stream, outputStream, options = {}) {
    const mergedOptions = { ...this.config, ...options };
    
    // 如果启用假流式且检测到非流式响应
    if (mergedOptions.enableFakeStream && !this.isRealStream(stream)) {
      // 读取完整内容后使用假流式发送
      const content = await this.readFullContent(stream);
      return await processFakeStream(content, outputStream, mergedOptions);
    }
    
    // 使用真实流式处理
    return await processEnhancedStream(stream, outputStream, mergedOptions);
  }

  /**
   * 检测是否为真实流式响应
   */
  isRealStream(stream) {
    // 简单检测，实际应用中可能需要更复杂的逻辑
    return stream && typeof stream.getReader === 'function';
  }

  /**
   * 读取完整内容
   */
  async readFullContent(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let content = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }
    } catch (error) {
      Logger.error('读取完整内容失败:', error);
      throw error;
    }
    
    return content;
  }
}

export default {
  processEnhancedStream,
  processFakeStream,
  detectTruncation,
  retryWithAntiTruncation,
  SmartStreamProcessor,
  STREAMING_CONFIG
};
