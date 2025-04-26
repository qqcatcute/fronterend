const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// 创建数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 创建用户表的函数
// 在db.js中修改createUsersTable函数

async function createUsersTable() {
  const connection = await pool.getConnection();
  try {
    // 创建 Users 表的 SQL 语句，添加 avatar 字段
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(30) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(11) UNIQUE,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(255) DEFAULT '/images/default-avatar.jpg',
        role ENUM('user', 'admin') DEFAULT 'user',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users 表创建成功');
  } catch (error) {
    console.error('创建 Users 表失败:', error);
  } finally {
    connection.release();
  }
}

async function createTeamsTable() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Teams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        avatar VARCHAR(255) DEFAULT '/images/default-team.jpg',
        createdBy INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('Teams 表创建成功');
  } catch (error) {
    console.error('创建 Teams 表失败:', error);
  } finally {
    connection.release();
  }
}


async function createTeamMembersTable() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TeamMembers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teamId INT NOT NULL,
        userId INT NOT NULL,
        role ENUM('owner', 'admin', 'member') DEFAULT 'member',
        joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teamId) REFERENCES Teams(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
        UNIQUE KEY team_user (teamId, userId)
      )
    `);
    console.log('TeamMembers 表创建成功');
  } catch (error) {
    console.error('创建 TeamMembers 表失败:', error);
  } finally {
    connection.release();
  }
}

async function createTasksTable() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        teamId INT NOT NULL,
        createdBy INT NOT NULL,
        assignedTo INT,
        deadline DATETIME,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (teamId) REFERENCES Teams(id) ON DELETE CASCADE,
        FOREIGN KEY (createdBy) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (assignedTo) REFERENCES Users(id) ON DELETE SET NULL
      )
    `);
    console.log('Tasks 表创建成功');
  } catch (error) {
    console.error('创建 Tasks 表失败:', error);
  } finally {
    connection.release();
  }
}


async function createTaskCommentsTable() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TaskComments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        taskId INT NOT NULL,
        userId INT NOT NULL,
        content TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (taskId) REFERENCES Tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('TaskComments 表创建成功');
  } catch (error) {
    console.error('创建 TaskComments 表失败:', error);
  } finally {
    connection.release();
  }
}


async function createTaskHistoryTable() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TaskHistory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        taskId INT NOT NULL,
        userId INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        details TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (taskId) REFERENCES Tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('TaskHistory 表创建成功');
  } catch (error) {
    console.error('创建 TaskHistory 表失败:', error);
  } finally {
    connection.release();
  }
}

async function createNotificationsTable() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        relatedId INT,
        isRead BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('Notifications 表创建成功');
  } catch (error) {
    console.error('创建 Notifications 表失败:', error);
  } finally {
    connection.release();
  }
}

// 创建任务分支表
async function createTaskBranchesTable() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TaskBranches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        taskId INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        description TEXT,
        createdBy INT NOT NULL,
        isDefault BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (taskId) REFERENCES Tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (createdBy) REFERENCES Users(id) ON DELETE CASCADE,
        UNIQUE KEY branch_name (taskId, name)
      )
    `);
    console.log('TaskBranches 表创建成功');
  } catch (error) {
    console.error('创建 TaskBranches 表失败:', error);
  } finally {
    connection.release();
  }
}

// 创建任务提交历史表
async function createTaskCommitsTable() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TaskCommits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branchId INT NOT NULL,
        content TEXT NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        createdBy INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branchId) REFERENCES TaskBranches(id) ON DELETE CASCADE,
        FOREIGN KEY (createdBy) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('TaskCommits 表创建成功');
  } catch (error) {
    console.error('创建 TaskCommits 表失败:', error);
  } finally {
    connection.release();
  }
}

// 创建版本冲突表
async function createTaskConflictsTable() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TaskConflicts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        taskId INT NOT NULL,
        sourceBranchId INT NOT NULL,
        targetBranchId INT NOT NULL,
        conflictContent TEXT NOT NULL,
        status ENUM('pending', 'resolved') DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolvedAt TIMESTAMP NULL,
        resolvedBy INT NULL,
        FOREIGN KEY (taskId) REFERENCES Tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (sourceBranchId) REFERENCES TaskBranches(id) ON DELETE CASCADE,
        FOREIGN KEY (targetBranchId) REFERENCES TaskBranches(id) ON DELETE CASCADE
      )
    `);
    console.log('TaskConflicts 表创建成功');
  } catch (error) {
    console.error('创建 TaskConflicts 表失败:', error);
  } finally {
    connection.release();
  }
}


// 在db.js中添加创建TaskDependencies表的函数
async function createTaskDependenciesTable() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TaskDependencies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        taskId INT NOT NULL,
        dependsOnTaskId INT NOT NULL,
        createdBy INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (taskId) REFERENCES Tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (dependsOnTaskId) REFERENCES Tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (createdBy) REFERENCES Users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_dependency (taskId, dependsOnTaskId)
      )
    `);
    console.log('TaskDependencies 表创建成功');
  } catch (error) {
    console.error('创建 TaskDependencies 表失败:', error);
  } finally {
    connection.release();
  }
}

// 在initializeDatabase函数中添加对createTaskDependenciesTable的调用
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('数据库连接成功');
    connection.release();

    // 创建表
    await createUsersTable();
    await createTeamsTable();
    await createTeamMembersTable();
    await createTasksTable();
    await createTaskCommentsTable();
    await createTaskHistoryTable();
    await createNotificationsTable();
    // 添加TaskDependencies表的创建
    await createTaskDependenciesTable();
    // 添加新表
    await createTaskBranchesTable();
    await createTaskCommitsTable();
    await createTaskConflictsTable();
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

// 初始化数据库
initializeDatabase();

module.exports = pool;