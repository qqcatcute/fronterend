// routes/versionControl.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { protect } = require('../middleware/auth');

const branchController = require('../controllers/branchController');
const commitController = require('../controllers/commitController');
const mergeController = require('../controllers/mergeController');

// 所有路由都需要认证
router.use(protect);

// 分支路由
router.get('/tasks/:taskId/branches', branchController.getBranches);
router.post('/tasks/:taskId/branches',
  [check('name', '分支名称不能为空').not().isEmpty()],
  branchController.createBranch
);
router.put('/tasks/:taskId/branches/:branchId/default', branchController.setDefaultBranch);
router.delete('/tasks/:taskId/branches/:branchId', branchController.deleteBranch);
router.get('/branches/:branchId/latest-content', branchController.getLatestContent);

// 提交路由
router.get('/branches/:branchId/commits', commitController.getCommits);
router.post('/branches/:branchId/commits',
  [
    check('title', '提交标题不能为空').not().isEmpty(),
    check('content', '提交内容不能为空').not().isEmpty()
  ],
  commitController.createCommit
);
router.get('/commits/:commitId', commitController.getCommit);
router.post('/branches/:branchId/revert/:commitId', commitController.revertToCommit);

// 合并路由
router.get('/branches/:sourceBranchId/merge/:targetBranchId/check', mergeController.checkMerge);
router.post('/branches/:sourceBranchId/merge/:targetBranchId', mergeController.mergeBranches);
router.get('/tasks/:taskId/conflicts', mergeController.getConflicts);

// 新增: 获取单个冲突详情的路由
router.get('/conflicts/:conflictId', mergeController.getConflict);

// 确保验证器正确传递
router.post('/conflicts/resolve',
  [
    check('resolvedContent', '解决后的内容不能为空').not().isEmpty(),
    check('sourceBranchId', '源分支ID不能为空').not().isEmpty(),
    check('targetBranchId', '目标分支ID不能为空').not().isEmpty()
  ],
  mergeController.resolveConflict
);

module.exports = router;