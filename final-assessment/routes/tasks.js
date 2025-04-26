// routes/tasks.js
const express = require('express');
const { check } = require('express-validator');
const {
  getMyTasks,
  getAssignedTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  addTaskComment,
  getTeamTasks
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 获取我的任务
router.get('/me', getMyTasks);

// 获取分配给我的任务
router.get('/assigned', getAssignedTasks);

// 创建任务
router.post(
  '/',
  [
    check('title', '任务标题是必填项').not().isEmpty(),
    check('teamId', '团队ID是必填项').not().isEmpty()
  ],
  createTask
);

// 获取任务详情
router.get('/:id', getTask);

// 更新任务
router.put('/:id', updateTask);

// 删除任务
router.delete('/:id', deleteTask);

// 添加任务评论
router.post(
  '/:id/comments',
  [
    check('content', '评论内容是必填项').not().isEmpty()
  ],
  addTaskComment
);

// 获取团队的所有任务
router.get('/team/:teamId', getTeamTasks);

module.exports = router;