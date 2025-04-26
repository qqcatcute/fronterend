// controllers/dependencyController.js
const TaskDependency = require('../models/TaskDependency');
const Task = require('../models/Task');
const Team = require('../models/Teams');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');

// 获取任务的所有依赖
exports.getTaskDependencies = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    // 检查任务是否存在
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: '未找到该任务' });
    }

    // 检查用户是否是团队成员
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权访问该任务' });
    }

    const dependencies = await TaskDependency.findByTask(taskId);
    const dependents = await TaskDependency.findDependents(taskId);

    res.status(200).json({
      success: true,
      data: {
        dependencies, // 该任务依赖的其他任务
        dependents    // 依赖该任务的其他任务
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取可添加为依赖的任务列表
exports.getAvailableDependencies = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    // 检查任务是否存在
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: '未找到该任务' });
    }

    // 检查用户权限
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权访问该任务' });
    }

    // 获取同一团队的其他任务，排除当前任务和已经是依赖的任务
    const availableTasks = await Task.findAvailableDependencies(taskId, task.teamId);

    res.status(200).json({
      success: true,
      data: availableTasks
    });
  } catch (error) {
    next(error);
  }
};

// 添加任务依赖
exports.addDependency = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId } = req.params;
    const { dependsOnTaskId } = req.body;

    // 检查两个任务是否存在
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: '未找到主任务' });
    }

    const dependsOnTask = await Task.findById(dependsOnTaskId);
    if (!dependsOnTask) {
      return res.status(404).json({ message: '未找到依赖任务' });
    }

    // 检查两个任务是否在同一团队
    if (task.teamId !== dependsOnTask.teamId) {
      return res.status(400).json({ message: '不能添加不同团队的任务依赖' });
    }

    // 检查用户权限
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权操作该任务' });
    }

    // 检查是否会形成循环依赖
    const hasCycle = await TaskDependency.checkCyclicDependency(taskId, dependsOnTaskId);
    if (hasCycle) {
      return res.status(400).json({ message: '添加此依赖会形成循环依赖' });
    }

    // 创建依赖关系
    await TaskDependency.create({
      taskId,
      dependsOnTaskId,
      createdBy: req.user.id
    });

    // 获取当前用户信息
    const currentUser = await User.findById(req.user.id);

    // 向任务负责人发送通知（如果有）
    if (task.assignedTo) {
      await Notification.create({
        userId: task.assignedTo,
        content: `${currentUser.username} 添加了新的依赖关系: 任务"${task.title}" 现在依赖于任务"${dependsOnTask.title}"`,
        type: 'task_dependency',
        relatedId: task.id
      });
    }

    // 向被依赖任务的负责人发送通知（如果有且不是同一人）
    if (dependsOnTask.assignedTo && dependsOnTask.assignedTo !== task.assignedTo) {
      await Notification.create({
        userId: dependsOnTask.assignedTo,
        content: `您负责的任务"${dependsOnTask.title}"现在被任务"${task.title}"所依赖`,
        type: 'task_dependent',
        relatedId: dependsOnTask.id
      });
    }

    res.status(201).json({
      success: true,
      message: '依赖关系添加成功'
    });
  } catch (error) {
    next(error);
  }
};

// 删除任务依赖
exports.removeDependency = async (req, res, next) => {
  try {
    const { taskId, dependsOnTaskId } = req.params;

    // 检查任务是否存在
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: '未找到该任务' });
    }

    // 检查用户权限
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权操作该任务' });
    }

    // 获取被依赖的任务信息，用于创建通知
    const dependsOnTask = await Task.findById(dependsOnTaskId);
    if (!dependsOnTask) {
      return res.status(404).json({ message: '未找到依赖任务' });
    }

    // 删除依赖关系
    await TaskDependency.delete(taskId, dependsOnTaskId);

    // 获取当前用户信息
    const currentUser = await User.findById(req.user.id);

    // 向任务负责人发送通知（如果有）
    if (task.assignedTo) {
      await Notification.create({
        userId: task.assignedTo,
        content: `${currentUser.username} 移除了依赖关系: 任务"${task.title}"不再依赖于任务"${dependsOnTask.title}"`,
        type: 'task_dependency',
        relatedId: task.id
      });
    }

    // 向被依赖任务的负责人发送通知（如果有且不是同一人）
    if (dependsOnTask.assignedTo && dependsOnTask.assignedTo !== task.assignedTo) {
      await Notification.create({
        userId: dependsOnTask.assignedTo,
        content: `任务"${task.title}"不再依赖您负责的任务"${dependsOnTask.title}"`,
        type: 'task_dependent',
        relatedId: dependsOnTask.id
      });
    }

    res.status(200).json({
      success: true,
      message: '依赖关系删除成功'
    });
  } catch (error) {
    next(error);
  }
};