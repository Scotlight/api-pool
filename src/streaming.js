// ==================== 流式响应处理模块 ====================
// 处理流式响应的自适应延迟、内容分发和token估算

import { Logger } from './utils.js';
import { estimateTokenCount } from './utils.js';

/**
 * 处理流式响应，添加自适应延迟
 * @param {ReadableStream} inputStream - 输入流
 * @param {WritableStream} outputStream - 输出流
 * @param {Object} config - 配置对象
 * @returns {Promise<{completionTokens: number, totalContent: string}>}
 */
export async function processStreamingResponse(inputStream, outputStream, config) {
  const reader = inputStream.getReader();
  const writer = outputStream.getWriter();

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  // 优化缓冲区管理
  let buffer = "";
  let lastChunkTime = Date.now();
  let recentChunkSizes = [];
  let currentDelay = config.minDelay;
  let contentReceived = false;
  let isStreamEnding = false;
  let totalContentReceived = 0;
  let isFirstChunk = true;

  // Token计算增强: 跟踪累积的响应内容
  let allResponseContent = "";
  let completionTokens = 0;
  let lastDeltaContent = "";

  // 添加对话历史收集
  let collectCompletionText = config.collectCompletionText === true;
  let lastChoice = null;

  try {
    Logger.debug("开始处理流式响应");

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        Logger.debug("流读取完成");
        isStreamEnding = true;
        if (buffer.length > 0) {
          await processBuffer(buffer, writer, encoder, isStreamEnding, {
            ...config,
            currentDelay: config.finalLowDelay || 1,
          });
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));

        // 流结束后，基于累积的内容更新token计数
        if (collectCompletionText && allResponseContent.length > 0) {
          completionTokens = estimateTokenCount(allResponseContent);
          Logger.debug(`流响应结束，估算完成部分token数: ${completionTokens}`);

          // 更新token使用统计
          if (config.updateStatsCallback && typeof config.updateStatsCallback === "function") {
            config.updateStatsCallback(completionTokens);
          }
        }
        break;
      }

      if (value && value.length) {
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 计算延迟和性能指标
        const currentTime = Date.now();
        const timeSinceLastChunk = currentTime - lastChunkTime;
        lastChunkTime = currentTime;

        // 跟踪接收的数据
        contentReceived = true;
        totalContentReceived += chunk.length;

        // 管理最近块大小的历史记录
        recentChunkSizes.push(chunk.length);
        if (recentChunkSizes.length > config.chunkBufferSize) {
          recentChunkSizes.shift();
        }

        // 优化的SSE消息处理 - 使用双换行符作为消息分隔符
        const messages = buffer.split("\n\n");
        buffer = messages.pop() || ""; // 保留最后一部分可能不完整的消息

        // 处理完整的消息
        for (const message of messages) {
          if (!message.trim()) continue;

          // 提取并跟踪内容以改进token计算
          if (collectCompletionText) {
            try {
              if (message.startsWith("data:")) {
                const jsonContent = message.substring(5).trim();
                if (jsonContent !== "[DONE]") {
                  const jsonData = JSON.parse(jsonContent);
                  if (jsonData.choices && jsonData.choices.length > 0) {
                    lastChoice = jsonData.choices[0];
                    if (lastChoice.delta && lastChoice.delta.content) {
                      // 收集所有内容以用于最终token计算
                      lastDeltaContent = lastChoice.delta.content;
                      allResponseContent += lastDeltaContent;
                    }
                  }
                }
              }
            } catch (e) {
              // 解析错误，忽略此消息的token计算
              Logger.debug(`无法解析消息进行token累积: ${e.message}`);
            }
          }

          const lines = message.split("\n");
          for (const line of lines) {
            if (line.trim()) {
              // 为第一个内容块使用更快的延迟以提高感知响应速度
              const useDelay = isFirstChunk ? Math.min(config.minDelay, 2) : currentDelay;
              isFirstChunk = false;

              await processLine(line, writer, encoder, useDelay, config, false);
            }
          }

          // 消息之间添加小延迟使输出更自然
          if (config.interMessageDelay) {
            await new Promise((r) => setTimeout(r, config.interMessageDelay));
          }
        }

        // 动态调整延迟
        const avgChunkSize = recentChunkSizes.reduce((sum, size) => sum + size, 0) / recentChunkSizes.length;
        currentDelay = adaptDelay(avgChunkSize, timeSinceLastChunk, config, false);

        // 大内容启用快速处理模式
        if (totalContentReceived > (config.fastModeThreshold || 5000)) {
          currentDelay = Math.min(currentDelay, config.fastOutputDelay || 3);
        }
      }
    }
  } catch (error) {
    Logger.error("处理流式响应时出错:", error);
    try {
      // 发送格式化的错误响应
      const errorResponse = {
        error: {
          message: error.message,
          type: "stream_processing_error",
        },
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
    } catch (e) {
      Logger.error("写入错误响应失败:", e);
    }
  } finally {
    try {
      await writer.close();
    } catch (e) {
      Logger.error("关闭写入器失败:", e);
    }
  }

  // 返回token使用情况
  return {
    completionTokens,
    totalContent: allResponseContent,
  };
}

/**
 * 处理单行SSE数据
 * @param {string} line - SSE数据行
 * @param {WritableStreamDefaultWriter} writer - 写入器
 * @param {TextEncoder} encoder - 文本编码器
 * @param {number} delay - 延迟时间
 * @param {Object} config - 配置对象
 * @param {boolean} isStreamEnding - 是否流结束
 */
export async function processLine(line, writer, encoder, delay, config, isStreamEnding) {
  if (!line.trim() || !line.startsWith("data:")) return;

  try {
    // 去除前缀，解析JSON
    const content = line.substring(5).trim();
    if (content === "[DONE]") {
      await writer.write(encoder.encode(`${line}\n\n`));
      return;
    }

    try {
      const jsonData = JSON.parse(content);

      // OpenAI流式格式处理
      if (jsonData.choices && Array.isArray(jsonData.choices)) {
        const choice = jsonData.choices[0];

        if (choice.delta && choice.delta.content) {
          const deltaContent = choice.delta.content;
          const contentLength = deltaContent.length;

          // 针对不同长度的内容使用不同策略
          if (contentLength > 20 && !isStreamEnding && config.intelligentBatching) {
            // 长内容分批处理
            await sendContentInBatches(deltaContent, jsonData, writer, encoder, delay, config);
          } else {
            // 短内容或结束时的内容直接处理
            await sendContentCharByChar(deltaContent, jsonData, writer, encoder, delay, config, isStreamEnding);
          }
          return;
        } else if (choice.delta && Object.keys(choice.delta).length === 0) {
          // 这可能是最后一个消息或控制消息
          await writer.write(encoder.encode(`${line}\n\n`));
          return;
        }
      }
    } catch (e) {
      // JSON解析失败，按原始内容处理
      Logger.debug(`非标准JSON内容: ${e.message}`);
    }

    // 按原样发送未能识别的内容
    await writer.write(encoder.encode(`${line}\n\n`));
  } catch (error) {
    Logger.error(`处理SSE行时出错: ${error.message}`);
    try {
      // 出错时尝试按原样发送
      await writer.write(encoder.encode(`${line}\n\n`));
    } catch (e) {
      // 忽略二次错误
    }
  }
}

/**
 * 处理缓冲数据
 * @param {string} buffer - 缓冲数据
 * @param {WritableStreamDefaultWriter} writer - 写入器
 * @param {TextEncoder} encoder - 文本编码器
 * @param {boolean} isStreamEnding - 是否流结束
 * @param {Object} config - 配置对象
 */
export async function processBuffer(buffer, writer, encoder, isStreamEnding, config) {
  if (!buffer.trim()) return;

  // 拆分成行并处理每一行
  const lines = buffer.split("\n");

  // 为流结束和中间内容使用不同的延迟
  const delay = isStreamEnding ? config.finalLowDelay || 1 : config.currentDelay || config.minDelay;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // 对最后一行使用流结束标志
    const isLastLine = i === lines.length - 1;
    await processLine(line, writer, encoder, delay, config, isLastLine && isStreamEnding);
  }
}

/**
 * 自适应延迟算法
 * @param {number} chunkSize - 块大小
 * @param {number} timeSinceLastChunk - 距离上次块的时间
 * @param {Object} config - 配置对象
 * @param {boolean} isStreamEnding - 是否流结束
 * @returns {number} 计算出的延迟时间
 */
export function adaptDelay(chunkSize, timeSinceLastChunk, config, isStreamEnding) {
  if (chunkSize <= 0) return config.minDelay;

  // 流结束时使用finalLowDelay
  if (isStreamEnding && config.finalLowDelay !== undefined) {
    return Math.max(1, config.finalLowDelay);
  }

  // 确保配置值有效
  const minDelay = Math.max(1, config.minDelay || 3); // 降低最小延迟
  const maxDelay = Math.max(minDelay, config.maxDelay || 25); // 降低最大延迟
  const adaptiveDelayFactor = Math.max(0, Math.min(2, config.adaptiveDelayFactor || 0.4)); // 降低适应因子

  // 改进的延迟计算

  // 1. 基于块大小的因子（块越大，延迟越小）
  // 使用对数缩放提供更平滑的过渡，调整系数使大块内容更快输出
  const logChunkSize = Math.log2(Math.max(1, chunkSize));
  const sizeScaleFactor = Math.max(0.15, Math.min(1.2, 3.5 / logChunkSize));

  // 2. 基于时间间隔的因子（时间间隔越长，延迟越大）
  // 使用更平滑的曲线，减少时间间隔对延迟的影响
  const timeScaleFactor = Math.sqrt(Math.min(1500, Math.max(50, timeSinceLastChunk)) / 250);

  // 3. 计算最终延迟 - 使用更平滑的曲线
  let delay = minDelay + (maxDelay - minDelay) * sizeScaleFactor * timeScaleFactor * adaptiveDelayFactor;

  // 添加更细微的随机变化（±5%）以使输出更自然但更一致
  const randomFactor = 0.95 + Math.random() * 0.1;
  delay *= randomFactor;

  // 确保在允许范围内
  return Math.min(maxDelay, Math.max(minDelay, delay));
}

/**
 * 逐字符发送内容
 * @param {string} content - 要发送的内容
 * @param {Object} originalJson - 原始JSON对象
 * @param {WritableStreamDefaultWriter} writer - 写入器
 * @param {TextEncoder} encoder - 文本编码器
 * @param {number} delay - 延迟时间
 * @param {Object} config - 配置对象
 * @param {boolean} isStreamEnding - 是否流结束
 */
export async function sendContentCharByChar(content, originalJson, writer, encoder, delay, config, isStreamEnding) {
  if (!content) return;

  // 检查是否需要快速输出模式
  const useQuickMode = content.length > (config.minContentLengthForFastOutput || 500); // 降低快速输出的阈值
  const actualDelay = useQuickMode ? config.fastOutputDelay || 1 : delay; // 降低快速模式的延迟

  try {
    // 对于长内容优化批处理大小 - 使用更智能的批处理大小计算
    let sendBatchSize;

    // 根据内容长度动态调整批处理大小，使输出更平滑
    if (content.length > 200) {
      // 长内容使用更大的批次，但确保不会太大导致卡顿感
      sendBatchSize = isStreamEnding ? 6 : 4;
    } else if (content.length > 50) {
      // 中等长度内容
      sendBatchSize = isStreamEnding ? 3 : 2;
    } else {
      // 短内容
      sendBatchSize = 1;
    }

    // 检测内容是否包含自然语言断点（如标点符号）
    const punctuationMarks = [".", "。", "!", "！", "?", "？", ",", "，", ";", "；", ":", "：", "\n"];

    // 跟踪上次发送的时间，用于动态调整延迟
    let lastSendTime = Date.now();

    for (let i = 0; i < content.length; ) {
      // 寻找最近的自然断点
      let endIndex = i + sendBatchSize;
      let foundNaturalBreak = false;

      // 如果不是在结尾，尝试寻找自然断点
      if (endIndex < content.length - 1) {
        // 在当前批次范围内查找断点
        for (let j = i + 1; j <= Math.min(i + sendBatchSize * 1.5, content.length); j++) {
          if (punctuationMarks.includes(content[j])) {
            endIndex = j + 1; // 包含标点符号
            foundNaturalBreak = true;
            break;
          }
        }
      } else {
        // 确保不超过内容长度
        endIndex = Math.min(endIndex, content.length);
      }

      const currentBatch = content.substring(i, endIndex);

      // 将原始JSON中的内容替换为当前批次
      const modifiedJson = JSON.parse(JSON.stringify(originalJson));
      modifiedJson.choices[0].delta.content = currentBatch;

      // 写入当前批次的SSE行
      const modifiedLine = `data: ${JSON.stringify(modifiedJson)}\n\n`;
      await writer.write(encoder.encode(modifiedLine));

      // 动态调整延迟 - 考虑批次大小和是否在自然断点
      let dynamicDelay = actualDelay;

      // 在自然断点处增加轻微延迟，使输出更自然
      if (foundNaturalBreak) {
        dynamicDelay = Math.min(actualDelay * 1.2, actualDelay + 2);
      } else if (currentBatch.length <= 1) {
        // 单字符减少延迟
        dynamicDelay = Math.max(1, actualDelay * 0.7);
      }

      // 流结束时使用更短的延迟
      if (isStreamEnding && content.length - i < 15) {
        dynamicDelay = Math.min(dynamicDelay, config.finalLowDelay || 1);
      }

      // 更新索引到下一个位置
      i = endIndex;

      // 只在批次之间添加延迟，最后一批不添加
      if (i < content.length) {
        // 计算实际经过的时间，避免延迟累积
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastSendTime;
        const adjustedDelay = Math.max(0, dynamicDelay - elapsedTime);

        if (adjustedDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, adjustedDelay));
        }
        lastSendTime = Date.now();
      }
    }
  } catch (error) {
    Logger.error(`逐字符发送内容时出错: ${error.message}`);
    // 出错时，尝试发送完整内容
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(originalJson)}\n\n`));
    } catch (e) {
      Logger.error(`无法发送完整内容: ${e.message}`);
    }
  }
}

/**
 * 分批次发送内容，优化长内容的处理
 * @param {string} content - 要发送的内容
 * @param {Object} originalJson - 原始JSON对象
 * @param {WritableStreamDefaultWriter} writer - 写入器
 * @param {TextEncoder} encoder - 文本编码器
 * @param {number} delay - 延迟时间
 * @param {Object} config - 配置对象
 */
export async function sendContentInBatches(content, originalJson, writer, encoder, delay, config) {
  if (!content || content.length === 0) return;

  // 根据内容长度和配置选择批处理大小 - 更智能的批处理大小
  let batchSize;
  if (content.length > 200) {
    batchSize = config.maxBatchSize || 6;
  } else if (content.length > 100) {
    batchSize = 4;
  } else if (content.length > 50) {
    batchSize = 3;
  } else {
    batchSize = 2;
  }

  // 根据内容长度动态调整延迟 - 更平滑的延迟
  const adjustedDelay = content.length > 100 ? Math.min(delay, config.fastOutputDelay || 2) : delay;

  // 检测内容是否包含自然语言断点
  const punctuationMarks = [".", "。", "!", "！", "?", "？", ",", "，", ";", "；", ":", "：", "\n"];

  // 跟踪上次发送的时间
  let lastSendTime = Date.now();

  try {
    let i = 0;
    while (i < content.length) {
      // 寻找最近的自然断点
      let endIndex = Math.min(i + batchSize, content.length);
      let foundNaturalBreak = false;

      // 在当前批次范围内查找断点
      if (endIndex < content.length - 1) {
        for (let j = i + Math.floor(batchSize / 2); j <= Math.min(i + batchSize * 1.5, content.length); j++) {
          if (punctuationMarks.includes(content[j])) {
            endIndex = j + 1; // 包含标点符号
            foundNaturalBreak = true;
            break;
          }
        }
      }

      const batch = content.substring(i, endIndex);

      // 创建新的JSON对象，只包含当前批次
      const batchJson = JSON.parse(JSON.stringify(originalJson));
      batchJson.choices[0].delta.content = batch;

      // 发送当前批次
      const batchLine = `data: ${JSON.stringify(batchJson)}\n\n`;
      await writer.write(encoder.encode(batchLine));

      // 动态调整延迟
      let dynamicDelay = adjustedDelay;

      // 在自然断点处增加轻微延迟
      if (foundNaturalBreak) {
        dynamicDelay = Math.min(adjustedDelay * 1.2, adjustedDelay + 1.5);
      }

      // 更新索引到下一个位置
      i = endIndex;

      // 只在批次之间添加延迟，最后一批不添加
      if (i < content.length) {
        // 计算实际经过的时间，避免延迟累积
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastSendTime;
        const finalDelay = Math.max(0, dynamicDelay - elapsedTime);

        if (finalDelay > 0) {
          await new Promise((r) => setTimeout(r, finalDelay));
        }
        lastSendTime = Date.now();
      }
    }
  } catch (error) {
    Logger.error(`分批处理内容时出错: ${error.message}`);
    // 出错时发送完整内容
    const fallbackJson = JSON.parse(JSON.stringify(originalJson));
    fallbackJson.choices[0].delta.content = content;
    await writer.write(encoder.encode(`data: ${JSON.stringify(fallbackJson)}\n\n`));
  }
}
