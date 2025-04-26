// routes/dependencies.js
const express = require('express');
const { check } = require('express-validator');
const {
  getTaskDependencies,
  addDependency,
  removeDependency,
  getAvailableDependencies
} = require('../controllers/dependencyController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 获取任务的依赖关系
router.get('/tasks/:taskId/dependencies', getTaskDependencies);

// 获取可添加为依赖的任务列表
router.get('/tasks/:taskId/available-dependencies', getAvailableDependencies);

// 添加依赖关系
router.post(
  '/tasks/:taskId/dependencies',
  [
    check('dependsOnTaskId', '依赖任务ID是必填项').not().isEmpty()
  ],
  addDependency
);

// 删除依赖关系
router.delete('/tasks/:taskId/dependencies/:dependsOnTaskId', removeDependency);

module.exports = router;