import { db, makeId, saveDb, rehydrateDb } from '../lib/localDb';

const emptyTaskStats = () => ({
  total: 0,
  pending: 0,
  in_progress: 0,
  completed: 0,
  overdue: 0,
});

const expandTask = (task) => {
  const createdBy = db.profiles.find(p => p.id === task.created_by) || null;
  const department = db.departments.find(d => d.id === task.department_id) || null;
  const taskAssignees = db.taskAssignees
    .filter(a => a.task_id === task.id)
    .map(a => ({
      ...a,
      user: db.profiles.find(p => p.id === a.user_id) || null,
    }));
  return {
    ...task,
    created_by: createdBy,
    department,
    task_assignees: taskAssignees,
  };
};

/**
 * Local in-memory Task Service (no Supabase).
 * All data is stored in src/lib/localDb.js while the app is running.
 */

export const taskService = {
  // Get all tasks with assignees and department info
  async getTasks() {
    const data = db.tasks.map(expandTask);
    return { data, error: null };
  },

  // Get tasks assigned to current user
  async getMyTasks(userId) {
    if (!userId) return { data: [], error: { message: 'User ID required' } };
    const assignments = db.taskAssignees
      .filter(a => a.user_id === userId)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const data = assignments.map(a => ({
      status: a.status,
      updated_at: a.updated_at,
      task: expandTask(db.tasks.find(t => t.id === a.task_id) || {}),
    }));
    return { data, error: null };
  },

  // Create new task
  async createTask(taskData) {
    const id = makeId();
    const newTask = {
      id,
      title: taskData?.title || '',
      details: taskData?.details || '',
      due_at: taskData?.due_at || new Date().toISOString(),
      priority: taskData?.priority || 'normal',
      department_id: taskData?.department_id || db.departments[0]?.id || null,
      created_by: taskData?.created_by || db.users[0]?.id || null,
      created_at: new Date().toISOString(),
    };
    db.tasks.push(newTask);
    saveDb();
    return { data: expandTask(newTask), error: null };
  },

  // Assign task to users
  async assignTask(taskId, userIds) {
    if (!taskId) return { data: null, error: { message: 'Task ID required' } };

    // Remove existing assignments for this task
    db.taskAssignees = db.taskAssignees.filter(a => a.task_id !== taskId);

    if (!userIds?.length) {
      return { data: [], error: null };
    }

    const now = new Date().toISOString();
    const newAssignments = userIds.map(userId => ({
      task_id: taskId,
      user_id: userId,
      status: 'pending',
      updated_at: now,
    }));
    db.taskAssignees.push(...newAssignments);
    saveDb();

    const data = newAssignments.map(a => ({
      ...a,
      user: db.profiles.find(p => p.id === a.user_id) || null,
    }));

    return { data, error: null };
  },

  // Update task status for assignee
  async updateTaskStatus(taskId, userId, status) {
    if (!taskId || !userId || !status) {
      return { data: null, error: { message: 'Task ID, User ID, and status are required' } };
    }
    const now = new Date().toISOString();
    const assignment = db.taskAssignees.find(
      a => a.task_id === taskId && a.user_id === userId
    );
    if (!assignment) {
      return { data: null, error: { message: 'Assignment not found' } };
    }
    assignment.status = status;
    assignment.updated_at = now;
    saveDb();
    const user = db.profiles.find(p => p.id === userId) || null;
    return { data: { ...assignment, user }, error: null };
  },

  // Update task details
  async updateTask(taskId, updates) {
    if (!taskId) return { data: null, error: { message: 'Task ID required' } };
    const task = db.tasks.find(t => t.id === taskId);
    if (!task) return { data: null, error: { message: 'Task not found' } };
    Object.assign(task, updates || {});
    saveDb();
    return { data: expandTask(task), error: null };
  },

  // Delete task
  async deleteTask(taskId) {
    if (!taskId) return { error: { message: 'Task ID required' } };
    db.tasks = db.tasks.filter(t => t.id !== taskId);
    db.taskAssignees = db.taskAssignees.filter(a => a.task_id !== taskId);
    saveDb();
    return { error: null };
  },

  // Get departments
  async getDepartments() {
    const data = [...db.departments];
    data.sort((a, b) => a.name.localeCompare(b.name));
    return { data, error: null };
  },

  // Get staff members for assignment (role === 'staff' only)
  async getStaffMembers() {
    const data = db.profiles
      .filter(p => p.role === 'staff')
      .slice()
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    return { data, error: null };
  },

  // Get all members for User Management list (everyone except admin) so admins can see and delete Managers, Staff, etc.
  async getAllMembers() {
    rehydrateDb();
    const data = db.profiles
      .filter(p => p.role !== 'admin')
      .slice()
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    return { data, error: null };
  },

  // Get task statistics
  async getTaskStats(userId = null) {
    const stats = emptyTaskStats();
    const tasks = db.tasks.map(expandTask);
    const filteredTasks = userId
      ? tasks.filter(t =>
          (t.task_assignees || []).some(a => a.user_id === userId)
        )
      : tasks;

    stats.total = filteredTasks.length;
    const now = new Date();

    filteredTasks.forEach(task => {
      const dueDate = new Date(task.due_at);
      const isOverdue = dueDate < now;
      const assignees = task.task_assignees || [];

      if (assignees.length === 0) {
        stats.pending += 1;
        if (isOverdue) stats.overdue += 1;
        return;
      }

      assignees.forEach(a => {
        if (a.status === 'pending') {
          stats.pending += 1;
          if (isOverdue) stats.overdue += 1;
        } else if (a.status === 'in_progress') {
          stats.in_progress += 1;
          if (isOverdue) stats.overdue += 1;
        } else if (a.status === 'completed') {
          stats.completed += 1;
        }
      });
    });

    return { data: stats, error: null };
  }
};

export default taskService;