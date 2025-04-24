const mysql = require('mysql2/promise');

// 创建数据库连接池
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT || 3306, // 添加PORT支持
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 存储数据库连接状态
let dbConnected = false;

// 检查数据库连接是否可用
async function checkDbConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    dbConnected = true;
    return true;
  } catch (error) {
    console.error('数据库连接检查失败:', error);
    dbConnected = false;
    return false;
  }
}

// 初始化数据库表结构并更新注册限额
async function initDb() {
  try {
    // 先检查连接是否可用
    if (!await checkDbConnection()) {
      console.error('数据库连接失败，无法初始化表结构');
      return;
    }
    
    // 创建注册计数表 (如果不存在)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS registration_counter (
        id INT NOT NULL PRIMARY KEY DEFAULT 1,
        count INT NOT NULL DEFAULT 0,
        registration_limit INT NOT NULL DEFAULT 200,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CHECK (id = 1)
      )
    `);

    // 获取环境变量中的注册限额
    const envLimit = parseInt(process.env.REGISTRATION_LIMIT || 200, 10);
    console.log(`从环境变量读取的注册限额: ${envLimit}`);
    
    // 检查是否需要插入初始记录
    const [rows] = await pool.query('SELECT * FROM registration_counter WHERE id = 1');
    if (rows.length === 0) {
      // 表中无数据，插入新记录
      await pool.query(
        'INSERT IGNORE INTO registration_counter (id, count, registration_limit) VALUES (?, ?, ?)',
        [1, 0, envLimit]
      );
      console.log(`已初始化注册计数器，限额设为 ${envLimit}`);
    } else {
      // 表中已有数据，读取现有计数
      const currentCount = rows[0].count;
      const currentLimit = rows[0].registration_limit;
      
      // 保持计数不变，只更新限额为环境变量值
      await pool.query(
        'UPDATE registration_counter SET registration_limit = ? WHERE id = 1',
        [envLimit]
      );
      
      // 记录详细日志
      console.log(`----- 注册限额更新 -----`);
      console.log(`保持当前注册计数不变: ${currentCount}`);
      console.log(`旧限额: ${currentLimit} -> 新限额: ${envLimit}`);
      console.log(`-------------------------`);
    }
  } catch (error) {
    // 检查是否是预期的、可忽略的主键冲突错误
    if (error.code === 'ER_DUP_ENTRY') {
      console.warn('数据库初始化警告：尝试插入已存在的计数器记录 (已被忽略)。');
      // 尝试更新限额
      try {
        const envLimit = parseInt(process.env.REGISTRATION_LIMIT || 200, 10);
        await pool.query(
          'UPDATE registration_counter SET registration_limit = ? WHERE id = 1',
          [envLimit]
        );
        console.log(`已更新注册限额为 ${envLimit}`);
      } catch (updateError) {
        console.error('更新注册限额失败:', updateError);
      }
    } else {
      // 对于其他所有错误，视为初始化失败
      console.error('数据库初始化失败:', error);
      dbConnected = false;
    }
  }
}

// 当应用启动时初始化数据库
(async () => {
  try {
    await initDb();
  } catch (err) {
    console.error('初始化数据库失败:', err);
    dbConnected = false;
  }
})();

// 导出数据库连接池及连接状态检查
module.exports = {
  pool,
  checkDbConnection,
  isDbConnected: () => dbConnected
};
