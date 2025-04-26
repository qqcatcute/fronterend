const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
  // User.js - The findOne method needs to be fixed
  // 修改 User.js 中的 findOne 方法
  // 1. 修改 findOne 方法，确保返回头像信息
  static async findOne(conditions) {
    const { email, username, phone } = conditions;
    try {
      // 检查是否在注册时进行检查
      if ((email && username) || (email && phone) || (username && phone)) {
        // 根据提供的条件构建查询
        let query = 'SELECT * FROM Users WHERE ';
        const params = [];

        if (email) {
          query += 'email = ? OR ';
          params.push(email);
        }

        if (username) {
          query += 'username = ? OR ';
          params.push(username);
        }

        if (phone) {
          query += 'phone = ? OR ';
          params.push(phone);
        }

        // 移除末尾的 OR
        query = query.slice(0, -4);

        const [rows] = await db.query(query, params);

        if (rows.length > 0) {
          // 判断具体是哪个字段冲突
          if (email && rows[0].email === email) {
            return { ...rows[0], exists: true, field: 'email' };
          } else if (username && rows[0].username === username) {
            return { ...rows[0], exists: true, field: 'username' };
          } else if (phone && rows[0].phone === phone) {
            return { ...rows[0], exists: true, field: 'phone' };
          }
        }

        return null;
      }

      // 处理只提供某一个字段的情况（登录）
      let query;
      let params;

      if (email) {
        query = 'SELECT * FROM Users WHERE email = ?';
        params = [email];
      } else if (username) {
        query = 'SELECT * FROM Users WHERE username = ?';
        params = [username];
      } else if (phone) {
        query = 'SELECT * FROM Users WHERE phone = ?';
        params = [phone];
      } else {
        return null;
      }

      const [rows] = await db.query(query, params);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('数据库查询错误:', error);
      throw error;
    }
  }

  // 2. 修改 findByPk 方法，确保返回头像信息
  static async findByPk(id) {
    const [rows] = await db.query('SELECT * FROM Users WHERE id = ?', [id]);
    return rows[0];
  }

  // 3. 添加更新头像的方法
  static async updateAvatar(userId, avatarPath) {
    try {
      await db.query('UPDATE Users SET avatar = ? WHERE id = ?', [avatarPath, userId]);
      const [rows] = await db.query('SELECT * FROM Users WHERE id = ?', [userId]);
      return rows[0];
    } catch (error) {
      console.error('更新头像失败:', error);
      throw error;
    }
  }


  // 4. 修改 create 方法，确保返回头像信息
  static async create(userData) {
    const { username, email, phone, password } = userData;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const [result] = await db.query(
      'INSERT INTO Users (username, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, phone || null, hashedPassword, 'user']
    );
    return {
      id: result.insertId,
      username,
      email,
      phone: phone || null,
      avatar: '/uploads/avatars/default-avatar.jpg', // 修改默认头像路径
      role: 'user'
    };
  }

  static async findAll() {
    const [rows] = await db.query('SELECT * FROM Users');
    return rows;
  }




  static async updateRole(id, role) {
    await db.query('UPDATE Users SET role = ? WHERE id = ?', [role, id]);
    const [rows] = await db.query('SELECT * FROM Users WHERE id = ?', [id]);
    return rows[0];
  }

  // 实例方法模ni
  async matchPassword(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  }

  getSignedJwtToken() {
    const jwtExpire = process.env.JWT_EXPIRE || '30d';

    return jwt.sign(
      { id: this.id, role: this.role },
      process.env.JWT_SECRET,
      { expiresIn: jwtExpire }
    );
  }

  static async updatePassword(userId, hashedPassword) {
    try {
      await db.query('UPDATE Users SET password = ? WHERE id = ?', [hashedPassword, userId]);
      return true;
    } catch (error) {
      console.error('更新密码失败:', error);
      throw error;
    }
  }

  // 在User.js模型中添加此方法
  // User.js 中修改 findById 方法
  static async findById(id) {
    try {
      const [rows] = await db.query('SELECT * FROM Users WHERE id = ?', [id]);
      return rows;  // 返回数组，便于调用方处理
    } catch (error) {
      console.error('查询用户失败:', error);
      throw error;
    }
  }

}

module.exports = User;