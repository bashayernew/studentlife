import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { taskService } from '../../utils/taskService';
import { messageService } from '../../utils/messageService';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import TaskStatusIndicator from '../../components/ui/TaskStatusIndicator';
import Header from '../../components/ui/Header';

const StaffDashboard = () => {
  const { user, userProfile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageType, setMessageType] = useState('general');
  const [selectedTaskId, setSelectedTaskId] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadMyTasks();
      loadTaskStats();
      loadMessages();
    }
  }, [user?.id]);

  const loadMessages = () => {
    const adminId = messageService.getAdminId();
    if (!adminId || !user?.id) return;
    const list = messageService.getConversation(user.id, adminId);
    setMessages(list);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const adminId = messageService.getAdminId();
    if (!adminId || !user?.id || !messageText?.trim()) return;
    setSendingMessage(true);
    const taskId = messageType === 'task' && selectedTaskId ? selectedTaskId : null;
    const { error: err } = messageService.sendMessage(user.id, adminId, messageText.trim(), taskId);
    setSendingMessage(false);
    if (err) {
      setError('Failed to send: ' + (err?.message || 'Unknown error'));
      return;
    }
    setMessageText('');
    setSelectedTaskId('');
    loadMessages();
  };

  const loadMyTasks = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: taskError } = await taskService?.getMyTasks(user?.id);
      
      if (taskError) {
        setError('Failed to load your tasks: ' + taskError?.message);
        return;
      }

      // Transform data format to match existing component expectations
      const transformedTasks = data?.map(item => ({
        ...item?.task,
        assigneeStatus: item?.status,
        assigneeUpdatedAt: item?.updated_at
      })) || [];

      setTasks(transformedTasks);
    } catch (error) {
      setError('Failed to load tasks. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadTaskStats = async () => {
    try {
      const { data: statsData, error: statsError } = await taskService?.getTaskStats(user?.id);
      
      if (statsError) {
        console.error('Failed to load task statistics:', statsError?.message);
        return;
      }

      setStats(statsData || stats);
    } catch (error) {
      console.error('Failed to load task statistics:', error);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const { error } = await taskService?.updateTaskStatus(taskId, user?.id, newStatus);
      
      if (error) {
        alert('Failed to update task status: ' + error?.message);
        return;
      }

      // Refresh tasks and stats
      loadMyTasks();
      loadTaskStats();
    } catch (error) {
      alert('Failed to update task status. Please try again.');
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-blue-600 bg-blue-100',
      normal: 'text-[#0d1b2a] bg-blue-50',
      high: 'text-blue-700 bg-blue-200',
      urgent: 'text-red-600 bg-red-100'
    };
    return colors?.[priority] || colors?.normal;
  };

  const isTaskOverdue = (dueAt) => {
    return new Date(dueAt) < new Date();
  };

  const getTaskStatusActions = (task) => {
    const currentStatus = task?.assigneeStatus || 'pending';
    
    const statusFlow = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: null
    };

    const statusLabels = {
      pending: 'Start Task',
      in_progress: 'Mark Complete',
      completed: 'Completed'
    };

    const nextStatus = statusFlow?.[currentStatus];
    const actionLabel = statusLabels?.[currentStatus];

    return { nextStatus, actionLabel, currentStatus };
  };

  const filteredTasks = tasks?.filter(task => {
    if (filterStatus === 'all') return true;
    return task?.assigneeStatus === filterStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-muted-foreground">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {userProfile?.full_name || user?.email}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here are your assigned tasks and progress overview
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <Icon name="AlertTriangle" size={20} className="text-error" />
              <div>
                <h3 className="font-medium text-error">Error Loading Data</h3>
                <p className="text-sm text-error mt-1">{error}</p>
                <Button 
                  onClick={loadMyTasks} 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                >
                  <Icon name="RefreshCw" size={16} className="mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent/15 rounded-lg flex items-center justify-center">
                <Icon name="Clipboard" size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.total}</p>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-warning/15 rounded-lg flex items-center justify-center">
                <Icon name="Clock" size={20} className="text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent/15 rounded-lg flex items-center justify-center">
                <Icon name="Play" size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.in_progress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-success/15 rounded-lg flex items-center justify-center">
                <Icon name="CheckCircle" size={20} className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-error/15 rounded-lg flex items-center justify-center">
                <Icon name="AlertCircle" size={20} className="text-error" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.overdue}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="bg-card rounded-lg shadow-sm">
          <div className="p-6 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-foreground">My Tasks</h2>
              
              <div className="flex items-center space-x-4">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e?.target?.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                >
                  <option value="all">All Tasks</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>

                <Button onClick={loadMyTasks} variant="outline" size="sm">
                  <Icon name="RefreshCw" size={16} />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredTasks?.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="CheckCircle" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {filterStatus === 'all' ? 'No Tasks Assigned' : `No ${filterStatus?.replace('_', ' ')} Tasks`}
                </h3>
                <p className="text-muted-foreground">
                  {filterStatus === 'all' ?'You have no tasks assigned at the moment.' 
                    : `You have no ${filterStatus?.replace('_', ' ')} tasks.`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks?.map((task) => {
                  const { nextStatus, actionLabel, currentStatus } = getTaskStatusActions(task);
                  const isOverdue = isTaskOverdue(task?.due_at);

                  return (
                    <div key={task?.id} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between space-x-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-foreground">{task?.title}</h3>
                            <TaskStatusIndicator status={currentStatus} />
                            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task?.priority)}`}>
                              {task?.priority}
                            </span>
                            {isOverdue && (
                              <span className="text-xs px-2 py-1 rounded-full bg-error/15 text-error font-medium">
                                Overdue
                              </span>
                            )}
                          </div>
                          
                          {task?.details && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {task?.details}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Icon name="Calendar" size={14} />
                              <span>Due: {new Date(task?.due_at)?.toLocaleDateString()}</span>
                            </div>
                            
                            {task?.department?.name && (
                              <div className="flex items-center space-x-1">
                                <Icon name="Building" size={14} />
                                <span>{task?.department?.name}</span>
                              </div>
                            )}
                            
                            {task?.created_by?.full_name && (
                              <div className="flex items-center space-x-1">
                                <Icon name="User" size={14} />
                                <span>Created by {task?.created_by?.full_name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          {nextStatus ? (
                            <Button
                              onClick={() => handleUpdateTaskStatus(task?.id, nextStatus)}
                              size="sm"
                              variant={currentStatus === 'in_progress' ? 'default' : 'outline'}
                            >
                              {actionLabel}
                            </Button>
                          ) : (
                            <div className="flex items-center space-x-2 text-success">
                              <Icon name="CheckCircle" size={16} />
                              <span className="text-sm font-medium">Completed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Message Admin */}
        <div className="mt-8 bg-card rounded-lg shadow-sm border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Icon name="MessageSquare" size={20} className="text-accent" />
              Message Admin
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Send a general message or one about a specific task. The admin can reply here.</p>
          </div>
          <div className="p-4">
            <div className="max-h-64 overflow-y-auto space-y-3 mb-4 min-h-[8rem] bg-muted/20 rounded-lg p-3">
              {messages?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet. Send one below.</p>
              ) : (
                messages?.map((m) => {
                  const taskTitle = m.task_id ? tasks?.find(t => t.id === m.task_id)?.title : null;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${m.from_user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          m.from_user_id === user?.id
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted border border-border text-foreground'
                        }`}
                      >
                        <p className="font-medium text-xs opacity-90">
                          {m.from_user_id === user?.id ? 'You' : 'Admin'}
                        </p>
                        {taskTitle && (
                          <p className="text-xs opacity-90 mt-0.5 font-medium">Re: {taskTitle}</p>
                        )}
                        <p className="mt-0.5">{m.body}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {new Date(m.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form onSubmit={handleSendMessage} className="space-y-3">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium text-foreground">Message type:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="messageType"
                    checked={messageType === 'general'}
                    onChange={() => setMessageType('general')}
                    className="text-accent"
                  />
                  <span className="text-sm">General message</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="messageType"
                    checked={messageType === 'task'}
                    onChange={() => setMessageType('task')}
                    className="text-accent"
                  />
                  <span className="text-sm">About a specific task</span>
                </label>
                {messageType === 'task' && (
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">Select task...</option>
                    {tasks?.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                    {(!tasks?.length) && <option value="" disabled>No tasks assigned</option>}
                  </select>
                )}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={messageType === 'task' ? "Type your message about this task..." : "Type your message..."}
                  rows={2}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={sendingMessage}
                />
                <Button type="submit" disabled={sendingMessage || !messageText?.trim() || (messageType === 'task' && !selectedTaskId)}>
                  {sendingMessage ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;