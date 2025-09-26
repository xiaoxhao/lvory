/**
 * 统一的错误处理工具
 * 提供标准化的错误处理和序列化功能
 */

/**
 * 标准化错误对象
 * @param {Error|string} error 错误对象或消息
 * @param {Object} options 额外选项
 * @returns {Object} 标准化的错误对象
 */
function normalizeError(error, options = {}) {
  const {
    defaultMessage = '操作失败',
    includeStack = false
  } = options;

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message || defaultMessage,
      ...(includeStack && error.stack && { stack: error.stack }),
      ...options.additionalData
    };
  }

  if (typeof error === 'string') {
    return {
      success: false,
      error,
      ...options.additionalData
    };
  }

  return {
    success: false,
    error: defaultMessage,
    ...options.additionalData
  };
}

/**
 * 确保返回值可序列化
 * @param {any} data 任意数据
 * @returns {any} 可序列化的数据
 */
function ensureSerializable(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(ensureSerializable);
  }

  if (typeof data === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      try {
        // 避免循环引用和不可序列化对象
        JSON.stringify(value);
        result[key] = ensureSerializable(value);
      } catch {
        // 将不可序列化的对象转换为字符串
        result[key] = String(value);
      }
    }
    return result;
  }

  return String(data);
}

/**
 * 创建可序列化的结果对象
 * @param {Object} result 原始结果对象
 * @returns {Object} 可序列化的结果对象
 */
function createSerializableResult(result) {
  if (!result || typeof result !== 'object') {
    return { success: false, error: '无效的结果格式' };
  }

  const serializable = ensureSerializable(result);
  
  // 确保基本字段存在且为正确类型
  return {
    success: Boolean(serializable.success),
    error: serializable.error ? String(serializable.error) : undefined,
    message: serializable.message ? String(serializable.message) : undefined,
    ...serializable
  };
}

module.exports = {
  normalizeError,
  ensureSerializable,
  createSerializableResult
};