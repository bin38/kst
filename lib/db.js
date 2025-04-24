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

// 初始化数据库表结构
async function initDb() {
  try {
    // 先检查连接是否可用
    if (!await checkDbConnection()) {
      console.error('数据库连接失败，无法初始化表结构');
      return;
    }
    
    // 创建注册计数表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS registration_counter (
        id INT NOT NULL PRIMARY KEY DEFAULT 1,
        count INT NOT NULL DEFAULT 0,
        registration_limit INT NOT NULL DEFAULT 200,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CHECK (id = 1)
      )
    `);

    // 检查是否需要插入初始记录
    const [rows] = await pool.query('SELECT * FROM registration_counter WHERE id = 1');
    if (rows.length === 0) {
      const defaultLimit = process.env.REGISTRATION_LIMIT || 200;
      // 使用 INSERT IGNORE 避免主键冲突错误
      await pool.query(
        'INSERT IGNORE INTO registration_counter (id, count, registration_limit) VALUES (?, ?, ?)',
        [1, 0, parseInt(defaultLimit, 10)]
      );
      // 检查是否真的插入了 (可选，因为 IGNORE 会静默失败)
      const [checkRows] = await pool.query('SELECT * FROM registration_counter WHERE id = 1');
      if (checkRows.length > 0 && checkRows[0].count === 0) {
          console.log('已初始化注册计数器');
      } else {
          console.log('注册计数器已存在或初始化被忽略');
      }
    }
  } catch (error) {
    // 检查是否是预期的、可忽略的主键冲突错误
    if (error.code === 'ER_DUP_ENTRY') {
      console.warn('数据库初始化警告：尝试插入已存在的计数器记录 (已被忽略)。');
      // 这种情况下，数据库连接仍然是好的，不应设置 dbConnected = false
      // 确保在尝试 INSERT IGNORE 之前连接是好的
      if (!dbConnected) {
         // 如果在 INSERT IGNORE 之前连接就断了，那还是有问题
         console.error('数据库初始化失败（连接问题先于重复条目）：', error);
         dbConnected = false;
      } else {
         console.log('注册计数器已存在，初始化步骤跳过插入。');
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
