// routes/teams.js
const express = require('express');
const { check } = require('express-validator');
const {
  getMyTeams,
  createTeam,
  getTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  updateMemberRole,
  getTeamMembers,
  getUserRoleByTask  // 新增方法
} = require('../controllers/teamController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 获取我的团队
router.get('/me', getMyTeams);

// 创建团队
router.post(
  '/',
  [
    check('name', '团队名称是必填项').not().isEmpty(),
    check('name', '团队名称不能超过100个字符').isLength({ max: 100 })
  ],
  createTeam
);

// 获取团队详情
router.get('/:id', getTeam);

// 更新团队
router.put(
  '/:id',
  [
    check('name', '团队名称不能为空').not().isEmpty(),
    check('name', '团队名称不能超过100个字符').isLength({ max: 100 })
  ],
  updateTeam
);

// 删除团队
router.delete('/:id', deleteTeam);

// 添加团队成员
router.post(
  '/:id/members',
  [
    check('username', '用户名是必填项').not().isEmpty(),
    check('role', '角色必须为owner, admin或member').isIn(['owner', 'admin', 'member'])
  ],
  addTeamMember
);

// 移除团队成员
router.delete('/:id/members', removeTeamMember);

// 更新成员角色
router.put(
  '/:id/members/role',
  [
    check('userId', '用户ID是必填项').not().isEmpty(),
    check('role', '角色必须为owner, admin或member').isIn(['owner', 'admin', 'member'])
  ],
  updateMemberRole
);

// 获取团队成员
router.get('/:id/members', getTeamMembers);

// 获取用户在特定任务相关团队中的角色
router.get('/role/:taskId', getUserRoleByTask);

module.exports = router;