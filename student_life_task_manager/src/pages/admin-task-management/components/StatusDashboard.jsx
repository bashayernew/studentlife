import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import DepartmentFilter from '../../../components/ui/DepartmentFilter';

const StatusDashboard = ({ tasks = [], selectedDepartments = [], onDepartmentChange = () => {}, onExportReport }) => {
  const navigate = useNavigate();

  const getTaskStatus = (task) => {
    const assignees = task?.task_assignees || [];
    if (assignees.length === 0) return 'pending';
    if (assignees.every(a => a?.status === 'completed')) return 'completed';
    if (assignees.some(a => a?.status === 'in_progress')) return 'in-progress';
    return 'pending';
  };

  const getTaskStats = () => {
    const deptKey = (task) => task?.department?.name ?? task?.department ?? '';
    const filteredTasks = selectedDepartments?.length === 0
      ? tasks
      : tasks?.filter(task => selectedDepartments?.includes(deptKey(task)));

    const now = new Date();

    const stats = {
      total: filteredTasks?.length,
      pending: filteredTasks?.filter(task => getTaskStatus(task) === 'pending')?.length,
      inProgress: filteredTasks?.filter(task => getTaskStatus(task) === 'in-progress')?.length,
      completed: filteredTasks?.filter(task => getTaskStatus(task) === 'completed')?.length,
      overdue: filteredTasks?.filter(task => {
        const dueDate = new Date(task?.due_at || task?.dueDateTime);
        return dueDate < now && getTaskStatus(task) !== 'completed';
      })?.length,
      dueToday: filteredTasks?.filter(task => {
        const dueDate = new Date(task?.due_at || task?.dueDateTime);
        const today = new Date();
        return dueDate?.toDateString() === today?.toDateString() && getTaskStatus(task) !== 'completed';
      })?.length,
      highPriority: filteredTasks?.filter(task =>
        ['high', 'urgent']?.includes(task?.priority) && getTaskStatus(task) !== 'completed'
      )?.length
    };

    return stats;
  };

  const stats = getTaskStats();

  const getDepartmentStats = () => {
    const departments = {};
    const deptKey = (task) => task?.department?.name ?? task?.department ?? 'Unassigned';

    tasks?.forEach(task => {
      const key = deptKey(task);
      if (!departments?.[key]) {
        departments[key] = { total: 0, completed: 0, overdue: 0 };
      }
      departments[key].total++;
      if (getTaskStatus(task) === 'completed') {
        departments[key].completed++;
      }
      const dueDate = new Date(task?.due_at || task?.dueDateTime);
      const now = new Date();
      if (dueDate < now && getTaskStatus(task) !== 'completed') {
        departments[key].overdue++;
      }
    });

    return departments;
  };

  const departmentStats = getDepartmentStats();

  return (
    <div className="space-y-5">
      {/* Filter + brief title */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Overview</h2>
        <p className="text-sm text-muted-foreground mb-3">Task status and progress by department. Filter to see specific departments.</p>
        <DepartmentFilter
          selectedDepartments={selectedDepartments}
          onChange={onDepartmentChange}
          userRole="admin"
        />
      </div>

      {/* Task counts – simple row */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground mb-3">Where tasks stand right now</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10">
            <Icon name="Clock" size={18} className="text-warning shrink-0" />
            <div>
              <p className="text-xl font-bold text-foreground">{stats?.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10">
            <Icon name="Play" size={18} className="text-accent shrink-0" />
            <div>
              <p className="text-xl font-bold text-foreground">{stats?.inProgress}</p>
              <p className="text-xs text-muted-foreground">In progress</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10">
            <Icon name="CheckCircle" size={18} className="text-success shrink-0" />
            <div>
              <p className="text-xl font-bold text-foreground">{stats?.completed}</p>
              <p className="text-xs text-muted-foreground">Done</p>
            </div>
          </div>
        </div>
      </div>

      {/* By department – compact */}
      {Object.keys(departmentStats)?.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-3">Progress by department — completed vs total tasks</p>
          <div className="space-y-3">
            {Object.entries(departmentStats)?.map(([dept, data]) => {
              const completionRate = data?.total > 0 ? Math.round((data?.completed / data?.total) * 100) : 0;
              return (
                <div key={dept} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-foreground capitalize w-24 shrink-0">{dept?.replace('-', ' ')}</span>
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 shrink-0">{data?.completed}/{data?.total}</span>
                    {data?.overdue > 0 && (
                      <span className="text-xs text-error shrink-0">{data.overdue} overdue</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions – inline, with short labels */}
      <div className="flex flex-wrap items-center gap-3">
        {onExportReport && (
          <button
            type="button"
            onClick={onExportReport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Icon name="Download" size={16} />
            <span>Export data</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/account')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
        >
          <Icon name="Settings" size={16} />
          <span>Account</span>
        </button>
      </div>
    </div>
  );
};

export default StatusDashboard;