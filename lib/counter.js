const { pool, isDbConnected, checkDbConnection } = require('./db');

/**
 * 读取当前注册计数和注册上限
 * @returns {Promise<{count: number, limit: number}>}
 */
async function readCountAndLimit() {
  // 检查数据库连接状态
  if (!isDbConnected()) {
    // 重新检查连接
    if (!await checkDbConnection()) {
      throw new Error('数据库连接失败，无法读取注册信息');
    }
  }

  try {
    const [rows] = await pool.query('SELECT count, registration_limit FROM registration_counter WHERE id = 1');
    if (rows.length > 0) {
      return {
        count: rows[0].count,
        limit: rows[0].registration_limit
      };
    }
    throw new Error('未找到注册计数记录');
  } catch (error) {
    console.error('读取注册计数失败:', error);
    throw error; // 将错误抛出，不返回默认值
  }
}

/**
 * 读取当前注册计数
 * @returns {Promise<number>}
 */
async function readCount() {
  const { count } = await readCountAndLimit();
  return count;
}

/**
 * 读取当前注册限制
 * @returns {Promise<number>}
 */
async function readLimit() {
  const { limit } = await readCountAndLimit();
  return limit;
}

/**
 * 增加注册计数（原子操作）
 * @returns {Promise<number>} 返回新的计数值
 */
async function incrementCount() {
  // 检查数据库连接状态
  if (!isDbConnected()) {
    if (!await checkDbConnection()) {
      throw new Error('数据库连接失败，无法更新注册信息');
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 先查询当前计数和限制
    const [countRows] = await connection.query(
      'SELECT count, registration_limit FROM registration_counter WHERE id = 1 FOR UPDATE'
    );
    
    if (countRows.length === 0) {
      throw new Error('计数器记录不存在');
    }
    
    const currentCount = countRows[0].count;
    const limit = countRows[0].registration_limit;
    
    // 检查是否已达到上限
    if (currentCount >= limit) {
      await connection.rollback();
      throw new Error('注册名额已满');
    }
    
    // 增加计数
    const newCount = currentCount + 1;
    await connection.query(
      'UPDATE registration_counter SET count = ? WHERE id = 1',
      [newCount]
    );
    
    // 提交事务
    await connection.commit();
    console.log(`注册计数增加到 ${newCount}`);
    return newCount;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 减少注册计数（原子操作）
 * @returns {Promise<number>} 返回新的计数值
 */
async function decrementCount() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const [countRows] = await connection.query(
      'SELECT count FROM registration_counter WHERE id = 1 FOR UPDATE'
    );
    
    if (countRows.length === 0) {
      throw new Error('计数器记录不存在');
    }
    
    const currentCount = countRows[0].count;
    const newCount = Math.max(0, currentCount - 1);
    
    await connection.query(
      'UPDATE registration_counter SET count = ? WHERE id = 1',
      [newCount]
    );
    
    await connection.commit();
    console.log(`注册计数减少到 ${newCount}`);
    return newCount;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 更新注册限额
 * @param {number} newLimit 新的限额
 * @returns {Promise<number>} 返回更新后的限额
 */
async function updateLimit(newLimit) {
  if (!Number.isInteger(newLimit) || newLimit < 0) {
    throw new Error('无效的限额值');
  }
  
  await pool.query(
    'UPDATE registration_counter SET registration_limit = ? WHERE id = 1',
    [newLimit]
  );
  
  console.log(`注册限额已更新为 ${newLimit}`);
  return newLimit;
}

// 导出函数
module.exports = {
  readCount,
  readLimit,
  readCountAndLimit,
  incrementCount,
  decrementCount,
  updateLimit
};
