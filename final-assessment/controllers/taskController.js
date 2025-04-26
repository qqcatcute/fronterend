// controllers/taskController.js
const Task = require('../models/Task');
const Team = require('../models/Teams');
const User = require('../models/User');
const Notification = require('../models/Notification');
const TaskDependency = require('../models/TaskDependency'); // 添加任务依赖模型
const { validationResult } = require('express-validator');

/**
 * 获取用户名，用于通知内容
 * 这个函数确保即使在遇到问题时也能返回一个可用的用户名
 */
async function getUsernameForNotification(req) {
  // 默认用户名
  let username = '某用户';

  try {
    // 首先尝试从req.user对象直接获取
    if (req.user && req.user.username) {
      return req.user.username;
    }

    // 如果不存在，尝试从数据库获取
    if (req.user && req.user.id) {
      const userRows = await User.findById(req.user.id);
      if (userRows && Array.isArray(userRows) && userRows.length > 0) {
        const user = userRows[0];
        if (user && user.username) {
          return user.username;
        }
      }
    }
  } catch (error) {
    console.error('获取用户名失败:', error);
    // 出错时返回默认用户名
  }

  return username;
}

// 获取用户的所有任务
exports.getMyTasks = async (req, res, next) => {
  try {
    const tasks = await Task.findByUser(req.user.id);

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

// 获取分配给用户的任务
exports.getAssignedTasks = async (req, res, next) => {
  try {
    const tasks = await Task.findAssignedToUser(req.user.id);

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

// 创建任务
exports.createTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, teamId, assignedTo, priority, deadline } = req.body;

    // 检查团队是否存在
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: '未找到该团队' });
    }

    // 检查用户是否是团队成员
    const membership = await Team.checkMembership(team.id, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权在该团队创建任务' });
    }

    // 如果指定了负责人，检查该用户是否是团队成员
    if (assignedTo) {
      const assigneeMembership = await Team.checkMembership(team.id, assignedTo);
      if (!assigneeMembership) {
        return res.status(400).json({ message: '指定的负责人不是团队成员' });
      }
    }

    // 创建任务
    const task = await Task.create({
      title,
      description,
      teamId,
      createdBy: req.user.id,
      assignedTo,
      priority,
      deadline
    });

    // 如果指定了负责人，创建通知
    if (assignedTo) {
      const username = await getUsernameForNotification(req);
      await Notification.create({
        userId: assignedTo,
        content: `${username} 给你分配了新任务: ${title}`,
        type: 'task_assigned',
        relatedId: task.id
      });
    }

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// Un altered
// 获取任务详情 - 修改后的函数
exports.getTask = async (req, res, next) => {
  try {
    console.log('获取任务ID:', req.params.id);
    const task = await Task.findById(req.params.id);
    console.log('查询到的任务:', task);

    if (!task) {
      return res.status(404).json({ message: '未找到该任务' });
    }

    console.log('检查团队成员权限, 团队ID:', task.teamId, '用户ID:', req.user.id);
    // 检查用户是否是团队成员
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    console.log('成员身份结果:', membership);

    if (!membership) {
      return res.status(403).json({ message: '无权访问该任务' });
    }

    // 获取任务评论
    const comments = await Task.getComments(task.id);
    console.log('任务评论数量:', comments.length);

    // 获取任务历史
    const history = await Task.getHistory(task.id);
    console.log('任务历史数量:', history.length);

    // 查询创建者和负责人信息 - 修改后的代码
    const creatorRows = await User.findById(task.createdBy);
    const creator = creatorRows && creatorRows.length > 0 ? creatorRows[0] : null;
    console.log('创建者信息:', creator ? creator.username : 'null');

    let assignee = null;
    if (task.assignedTo) {
      const assigneeRows = await User.findById(task.assignedTo);
      assignee = assigneeRows && assigneeRows.length > 0 ? assigneeRows[0] : null;
      console.log('负责人信息:', assignee ? assignee.username : 'null');
    }

    res.status(200).json({
      success: true,
      data: {
        ...task,
        creator: creator ? {
          id: creator.id,
          username: creator.username,
          avatar: creator.avatar
        } : null,
        assignee: assignee ? {
          id: assignee.id,
          username: assignee.username,
          avatar: assignee.avatar
        } : null,
        comments,
        history
      }
    });
  } catch (error) {
    console.error('获取任务详情失败:', error);
    next(error);
  }
};

// 更新任务
exports.updateTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: '未找到该任务' });
    }

    // 检查用户权限
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权更新该任务' });
    }

    // 只有任务创建者、管理员和负责人可以更新任务
    const canUpdate =
      task.createdBy === req.user.id ||
      task.assignedTo === req.user.id ||
      membership.role === 'owner' ||
      membership.role === 'admin';

    if (!canUpdate) {
      return res.status(403).json({ message: '无权更新该任务' });
    }

    const { title, description, status, priority, assignedTo, deadline } = req.body;

    // 检查是否更改了状态
    const statusChanged = status && status !== task.status;
    const oldStatus = task.status;

    // 如果更改了负责人，检查新负责人是否是团队成员
    if (assignedTo !== undefined && assignedTo !== null && assignedTo !== task.assignedTo) {
      const assigneeMembership = await Team.checkMembership(task.teamId, assignedTo);
      if (!assigneeMembership) {
        return res.status(400).json({ message: '指定的负责人不是团队成员' });
      }
    }

    // 记录更新历史
    let updateDetails = '更新了任务';
    if (title && title !== task.title) {
      updateDetails = '更新了任务标题';
    } else if (statusChanged) {
      updateDetails = `将任务状态更改为 ${status}`;
    } else if (assignedTo !== undefined && assignedTo !== task.assignedTo) {
      if (assignedTo === null) {
        updateDetails = '移除了任务负责人';
      } else {
        const assigneeRows = await User.findById(assignedTo);
        const newAssignee = assigneeRows && assigneeRows.length > 0 ? assigneeRows[0] : null;
        updateDetails = newAssignee ? `将任务分配给 ${newAssignee.username}` : '更新了任务负责人';
      }
    }

    // 更新任务
    task = await Task.update(task.id, {
      title,
      description,
      status,
      priority,
      assignedTo,
      deadline
    });

    // 添加历史记录
    await Task.addHistory(task.id, req.user.id, 'update', updateDetails);

    // 如果更改了负责人，创建通知
    if (assignedTo !== undefined && assignedTo !== null && assignedTo !== task.assignedTo) {
      const username = await getUsernameForNotification(req);
      await Notification.create({
        userId: assignedTo,
        content: `${username} 将你分配到任务: ${task.title}`,
        type: 'task_assigned',
        relatedId: task.id
      });
    }

    // 如果任务状态发生变化，发送通知
    if (statusChanged) {
      // 获取当前用户名
      const username = await getUsernameForNotification(req);

      // 记录日志以便调试
      console.log(`任务状态更新 - 用户名: ${username}, 用户ID: ${req.user.id}`);

      // 1. 通知任务负责人（如果不是当前用户）
      if (task.assignedTo && task.assignedTo !== req.user.id) {
        const notificationContent = `${username} 将任务 "${task.title}" 的状态从 "${getStatusText(oldStatus)}" 更改为 "${getStatusText(status)}"`;

        // 记录将要创建的通知内容，帮助调试
        console.log(`创建通知: 接收者ID=${task.assignedTo}, 内容=${notificationContent}`);

        await Notification.create({
          userId: task.assignedTo,
          content: notificationContent,
          type: 'task_status',
          relatedId: task.id
        });
      }

      // 2. 如果任务状态变为"已完成"，通知依赖该任务的任务的负责人
      if (status === 'completed') {
        // 获取依赖该任务的所有任务
        const dependentTasks = await TaskDependency.findDependents(task.id);

        // 为每个依赖任务的负责人发送通知
        for (const dependentTask of dependentTasks) {
          // 获取依赖任务的详细信息
          const dependentTaskDetails = await Task.findById(dependentTask.taskId);

          // 如果任务有负责人且不是当前用户，发送通知
          if (dependentTaskDetails.assignedTo && dependentTaskDetails.assignedTo !== req.user.id) {
            await Notification.create({
              userId: dependentTaskDetails.assignedTo,
              content: `你负责的任务 "${dependentTaskDetails.title}" 所依赖的任务 "${task.title}" 已标记为完成`,
              type: 'task_dependency',
              relatedId: dependentTaskDetails.id
            });
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// 获取状态文本显示
function getStatusText(status) {
  switch (status) {
    case 'pending': return '待处理';
    case 'in_progress': return '进行中';
    case 'completed': return '已完成';
    default: return status;
  }
}

// 删除任务
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: '未找到该任务' });
    }

    // 检查用户权限
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权删除该任务' });
    }

    // 只有任务创建者和团队管理员可以删除任务
    const canDelete =
      task.createdBy === req.user.id ||
      membership.role === 'owner' ||
      membership.role === 'admin';

    if (!canDelete) {
      return res.status(403).json({ message: '无权删除该任务' });
    }

    await Task.delete(task.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// 添加任务评论
exports.addTaskComment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: '未找到该任务' });
    }

    // 检查用户是否是团队成员
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权评论该任务' });
    }

    // 添加评论
    const comment = await Task.addComment(task.id, req.user.id, content);

    // 获取用户名用于通知
    const username = await getUsernameForNotification(req);

    // 通知任务负责人和创建者（如果不是当前用户）
    if (task.assignedTo && task.assignedTo !== req.user.id) {
      await Notification.create({
        userId: task.assignedTo,
        content: `${username} 评论了你负责的任务: ${task.title}`,
        type: 'task_comment',
        relatedId: task.id
      });
    }

    if (task.createdBy !== req.user.id && task.createdBy !== task.assignedTo) {
      await Notification.create({
        userId: task.createdBy,
        content: `${username} 评论了你创建的任务: ${task.title}`,
        type: 'task_comment',
        relatedId: task.id
      });
    }

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    next(error);
  }
};

// 获取团队的所有任务
exports.getTeamTasks = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    // 检查团队是否存在
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: '未找到该团队' });
    }

    // 检查用户是否是团队成员
    const membership = await Team.checkMembership(team.id, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权访问该团队任务' });
    }

    const tasks = await Task.findByTeam(teamId);

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};