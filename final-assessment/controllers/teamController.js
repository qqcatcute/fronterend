// controllers/teamController.js
const Team = require('../models/Teams');
const User = require('../models/User');
const Task = require('../models/Task');  // 确保这一行存在
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');

// 获取当前用户的所有团队
exports.getMyTeams = async (req, res, next) => {
  try {
    const teams = await Team.findByUser(req.user.id);

    res.status(200).json({
      success: true,
      count: teams.length,
      data: teams
    });
  } catch (error) {
    next(error);
  }
};

// 创建新团队
exports.createTeam = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    const team = await Team.create({
      name,
      description,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    next(error);
  }
};

// 获取团队详情
exports.getTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: '未找到该团队' });
    }

    // 检查用户是否是团队成员
    const membership = await Team.checkMembership(team.id, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权访问该团队' });
    }

    // 获取团队成员
    const members = await Team.getMembers(team.id);

    res.status(200).json({
      success: true,
      data: {
        ...team,
        members,
        currentUserRole: membership.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// 更新团队信息
exports.updateTeam = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: '未找到该团队' });
    }

    // 检查用户权限
    const membership = await Team.checkMembership(team.id, req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: '无权更新该团队' });
    }

    const { name, description } = req.body;

    team = await Team.update(team.id, { name, description });

    res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    next(error);
  }
};

// 删除团队
exports.deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: '未找到该团队' });
    }

    // 检查用户权限（只有团队创建者可以删除）
    if (team.createdBy !== req.user.id) {
      return res.status(403).json({ message: '只有团队创建者可以删除团队' });
    }

    await Team.delete(team.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// 添加团队成员
exports.addTeamMember = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, role } = req.body;

    // 查找团队
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: '未找到该团队' });
    }

    // 检查用户权限
    const membership = await Team.checkMembership(team.id, req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: '无权添加团队成员' });
    }

    // 查找要添加的用户
    const userToAdd = await User.findOne({ username });

    if (!userToAdd) {
      return res.status(404).json({ message: '未找到该用户' });
    }

    // 检查用户是否已是团队成员
    const existingMembership = await Team.checkMembership(team.id, userToAdd.id);
    if (existingMembership) {
      return res.status(400).json({ message: '该用户已是团队成员' });
    }

    // 添加成员
    await Team.addMember(team.id, userToAdd.id, role || 'member');

    // 创建通知
    await Notification.create({
      userId: userToAdd.id,
      content: `你已被添加到团队: ${team.name}`,
      type: 'team_invite',
      relatedId: team.id
    });

    res.status(200).json({
      success: true,
      message: '成员添加成功'
    });
  } catch (error) {
    next(error);
  }
};

// 移除团队成员
exports.removeTeamMember = async (req, res, next) => {
  try {
    const { userId } = req.body;

    // 查找团队
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: '未找到该团队' });
    }

    // 检查当前用户权限
    const currentMembership = await Team.checkMembership(team.id, req.user.id);
    if (!currentMembership || !['owner', 'admin'].includes(currentMembership.role)) {
      return res.status(403).json({ message: '无权移除团队成员' });
    }

    // 检查要移除的用户
    const memberToRemove = await Team.checkMembership(team.id, userId);
    if (!memberToRemove) {
      return res.status(404).json({ message: '该用户不是团队成员' });
    }

    // 不能移除团队创建者
    if (team.createdBy === parseInt(userId)) {
      return res.status(403).json({ message: '不能移除团队创建者' });
    }

    // controllers/teamController.js (续)

    // 普通管理员不能移除其他管理员
    if (currentMembership.role === 'admin' && memberToRemove.role === 'admin') {
      return res.status(403).json({ message: '管理员不能移除其他管理员' });
    }

    // 移除成员
    await Team.removeMember(team.id, userId);

    // 创建通知
    await Notification.create({
      userId: userId,
      content: `你已被移出团队: ${team.name}`,
      type: 'team_remove',
      relatedId: team.id
    });

    res.status(200).json({
      success: true,
      message: '成员移除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 更新成员角色
exports.updateMemberRole = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, role } = req.body;

    // 查找团队
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: '未找到该团队' });
    }

    // 检查当前用户权限（只有团队所有者可以更改角色）
    const currentMembership = await Team.checkMembership(team.id, req.user.id);
    if (!currentMembership || currentMembership.role !== 'owner') {
      return res.status(403).json({ message: '只有团队所有者可以更改成员角色' });
    }

    // 不能更改团队创建者的角色
    if (team.createdBy === parseInt(userId)) {
      return res.status(403).json({ message: '不能更改团队创建者的角色' });
    }

    // 检查要更新的用户
    const memberToUpdate = await Team.checkMembership(team.id, userId);
    if (!memberToUpdate) {
      return res.status(404).json({ message: '该用户不是团队成员' });
    }

    // 更新角色
    await Team.updateMemberRole(team.id, userId, role);

    res.status(200).json({
      success: true,
      message: '成员角色更新成功'
    });
  } catch (error) {
    next(error);
  }
};

// 获取团队成员列表
exports.getTeamMembers = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: '未找到该团队' });
    }

    // 检查用户是否是团队成员
    const membership = await Team.checkMembership(team.id, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权访问该团队' });
    }

    const members = await Team.getMembers(team.id);

    res.status(200).json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    next(error);
  }
};
// 获取用户在特定任务相关团队中的角色
exports.getUserRoleByTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    // 检查任务是否存在
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: '未找到该任务' });
    }

    // 获取用户在团队中的角色
    const role = await Team.getUserRoleByTaskId(taskId, userId);

    if (!role) {
      return res.status(403).json({
        message: '您不是该任务所属团队的成员',
        role: null
      });
    }

    res.status(200).json({
      success: true,
      role: role
    });
  } catch (error) {
    console.error('获取用户团队角色失败:', error);
    next(error);
  }
};