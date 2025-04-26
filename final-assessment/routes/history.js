// routes/history.js

const express = require('express');
const {
  getUserHistory,
  getTeamHistory,
  getTaskHistory,
  createHistory,
  deleteHistory,
  cleanupHistory,
  getHistoryStats
} = require('../controllers/historyController');
const { protect, authorize } = require('../middleware/auth');
const { check } = require('express-validator');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 获取当前用户的历史记录
router.get('/', getUserHistory);

// 获取特定团队的历史记录
router.get('/team/:teamId', getTeamHistory);

// 获取特定任务的历史记录
router.get('/task/:taskId', getTaskHistory);

// 手动创建历史记录（通常系统自动记录，此API用于特殊情况）
router.post(
  '/',
  [
    check('taskId', '任务ID是必填项').isInt(),
    check('action', '操作类型是必填项').isString(),
    check('details', '详情是必填项').isString()
  ],
  createHistory
);

// 删除历史记录（仅管理员）
router.delete('/:id', authorize('admin'), deleteHistory);

// 清理历史记录（仅管理员）
router.post(
  '/cleanup',
  [
    check('date', '日期格式不正确').isDate({ format: 'YYYY-MM-DD' })
  ],
  authorize('admin'),
  cleanupHistory
);

// 获取历史记录统计信息
router.get('/stats', getHistoryStats);

module.exports = router;