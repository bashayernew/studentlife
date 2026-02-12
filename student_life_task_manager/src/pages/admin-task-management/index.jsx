import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { taskService } from '../../utils/taskService';
import { messageService } from '../../utils/messageService';
import { db } from '../../lib/localDb';
import Header from '../../components/ui/Header';
import TaskCreationForm from './components/TaskCreationForm';
import StatusDashboard from './components/StatusDashboard';
import TaskOverviewTable from './components/TaskOverviewTable';
import StaffManagement from './components/StaffManagement';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const AdminTaskManagement = () => {
  const { user, userProfile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  const [messageConversations, setMessageConversations] = useState([]);
  const [selectedMessageUserId, setSelectedMessageUserId] = useState(null);
  const [adminThread, setAdminThread] = useState([]);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminSendingReply, setAdminSendingReply] = useState(false);
  const [adminReplyType, setAdminReplyType] = useState('general');
  const [adminReplyTaskId, setAdminReplyTaskId] = useState('');

  // Load tasks from Supabase
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await taskService?.getTasks();
      if (!error) {
        setTasks(data || []);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new task creation
  const handleTaskCreate = (newTask) => {
    setTasks(prevTasks => [newTask, ...prevTasks]);
    loadTasks(); // Reload to get complete data with relationships
  };

  // Handle task updates
  const handleTaskUpdate = (taskId, updates) => {
    setTasks(prevTasks =>
      prevTasks?.map(task =>
        task?.id === taskId ? { ...task, ...updates } : task
      )
    );
    loadTasks(); // Reload to get updated data
  };

  // Handle task deletion
  const handleTaskDelete = (taskId) => {
    setTasks(prevTasks => prevTasks?.filter(task => task?.id !== taskId));
  };

  // Handle department filter changes
  const handleDepartmentChange = (departments) => {
    setSelectedDepartments(departments);
  };

  const loadMessageConversations = () => {
    const { data } = messageService.getAdminConversations();
    setMessageConversations(data || []);
  };

  const openConversation = (userId) => {
    setSelectedMessageUserId(userId);
    const adminId = messageService.getAdminId();
    if (!adminId || !userId) return;
    const thread = messageService.getConversation(adminId, userId);
    setAdminThread(thread);
    setAdminReplyText('');
    setAdminReplyType('general');
    setAdminReplyTaskId('');
  };

  const handleAdminReply = (e) => {
    e?.preventDefault();
    const adminId = messageService.getAdminId();
    if (!adminId || !selectedMessageUserId || !adminReplyText?.trim()) return;
    const taskId = adminReplyType === 'task' && adminReplyTaskId ? adminReplyTaskId : null;
    setAdminSendingReply(true);
    const { error } = messageService.sendMessage(adminId, selectedMessageUserId, adminReplyText.trim(), taskId);
    setAdminSendingReply(false);
    if (error) return;
    setAdminReplyText('');
    setAdminReplyTaskId('');
    openConversation(selectedMessageUserId);
    loadMessageConversations();
  };

  // Export tasks (and staff) as CSV so it opens in Excel or Notepad
  const escapeCsv = (v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const handleExportData = () => {
    const tasks = db.tasks || [];
    const taskAssignees = db.taskAssignees || [];
    const departments = db.departments || [];
    const profiles = db.profiles || [];

    const getDeptName = (id) => (departments.find((d) => d.id === id) || {}).name || '';
    const getAssignees = (taskId) =>
      taskAssignees
        .filter((a) => a.task_id === taskId)
        .map((a) => profiles.find((p) => p.id === a.user_id)?.full_name || profiles.find((p) => p.id === a.user_id)?.email || '')
        .filter(Boolean)
        .join('; ');

    const header = 'Title,Details,Priority,Due Date,Department,Assigned To';
    const rows = tasks.map((t) =>
      [t.title, t.details, t.priority, (t.due_at || '').slice(0, 10), getDeptName(t.department_id), getAssignees(t.id)].map(escapeCsv).join(',')
    );
    const csv = [header, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-manager-backup-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h2 className="text-xl font-semibold text-foreground">Loading Admin Dashboard</h2>
                <p className="text-muted-foreground">Fetching task data and initializing interface...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-16 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="Settings" size={24} color="white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
                <p className="text-primary">
                  Welcome {userProfile?.full_name} - Manage tasks and team members
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Icon name="CheckSquare" size={16} className="text-accent" />
                  <span className="text-sm text-muted-foreground">Total Tasks</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">{tasks?.length}</p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Icon name="Clock" size={16} className="text-warning" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {tasks?.filter(task => {
                    const pendingAssignees = task?.task_assignees?.some(assignee => assignee?.status === 'pending');
                    return pendingAssignees;
                  })?.length}
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Icon name="AlertTriangle" size={16} className="text-error" />
                  <span className="text-sm text-muted-foreground">Overdue</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {tasks?.filter(task => {
                    const dueDate = new Date(task?.due_at);
                    const now = new Date();
                    const hasIncompleteAssignees = task?.task_assignees?.some(assignee => assignee?.status !== 'completed');
                    return dueDate < now && hasIncompleteAssignees;
                  })?.length}
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Icon name="CheckCircle" size={16} className="text-success" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {tasks?.filter(task => {
                    const allCompleted = task?.task_assignees?.length > 0 && 
                      task?.task_assignees?.every(assignee => assignee?.status === 'completed');
                    return allCompleted;
                  })?.length}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-border">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'tasks' ?'border-accent text-accent' :'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon name="CheckSquare" size={16} />
                    <span>Task Management</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'staff' ?'border-accent text-accent' :'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon name="Users" size={16} />
                    <span>Staff Management</span>
                  </div>
                </button>
                <button
                  onClick={() => { setActiveTab('messages'); loadMessageConversations(); }}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'messages' ?'border-accent text-accent' :'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon name="MessageSquare" size={16} />
                    <span>Messages</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'tasks' ? (
            <>
              {/* Create Task form */}
              <TaskCreationForm onTaskCreate={handleTaskCreate} />

              {/* Status overview (now full-width, below the form) */}
              <div className="mt-6">
                <StatusDashboard
                  tasks={tasks}
                  selectedDepartments={selectedDepartments}
                  onDepartmentChange={handleDepartmentChange}
                  onExportReport={handleExportData}
                />
              </div>

              {/* Task Overview Table - Full width */}
              <div className="mt-6">
                <TaskOverviewTable
                  tasks={tasks}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskDelete={handleTaskDelete}
                />
              </div>
            </>
          ) : activeTab === 'staff' ? (
            <div>
              <StaffManagement />
            </div>
          ) : (
            /* Messages Tab */
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">Messages from staff</h2>
                  <p className="text-sm text-muted-foreground">Reply to messages from your team.</p>
                </div>
                <div className="flex flex-col md:flex-row min-h-[320px]">
                  <div className="md:w-72 border-b md:border-b-0 md:border-r border-border bg-muted/20">
                    {messageConversations?.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">No conversations yet. Staff can message you from their dashboard.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {messageConversations?.map((c) => (
                          <li key={c.userId}>
                            <button
                              type="button"
                              onClick={() => openConversation(c.userId)}
                              className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${selectedMessageUserId === c.userId ? 'bg-muted border-l-2 border-accent' : ''}`}
                            >
                              <p className="font-medium text-foreground">{c.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                              {c.lastMessage && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">{c.lastMessage}</p>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col p-4">
                    {selectedMessageUserId ? (
                      <>
                        <div className="flex-1 overflow-y-auto space-y-3 min-h-[12rem] max-h-64 mb-4">
                          {adminThread?.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No messages in this thread yet.</p>
                          ) : (
                            adminThread?.map((m) => {
                              const taskTitle = m.task_id ? tasks?.find(t => t.id === m.task_id)?.title : null;
                              return (
                                <div
                                  key={m.id}
                                  className={`flex ${m.from_user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                                      m.from_user_id === user?.id ? 'bg-accent text-accent-foreground' : 'bg-muted border border-border text-foreground'
                                    }`}
                                  >
                                    <p className="font-medium text-xs opacity-90">
                                      {m.from_user_id === user?.id ? 'You' : messageConversations?.find(c => c.userId === m.from_user_id)?.full_name || 'Staff'}
                                    </p>
                                    {taskTitle && (
                                      <p className="text-xs opacity-90 mt-0.5 font-medium">Re: {taskTitle}</p>
                                    )}
                                    <p className="mt-0.5">{m.body}</p>
                                    <p className="text-xs opacity-75 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        <form onSubmit={handleAdminReply} className="space-y-3">
                          <div className="flex flex-wrap items-center gap-4">
                            <span className="text-sm font-medium text-foreground">Reply:</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="adminReplyType"
                                checked={adminReplyType === 'general'}
                                onChange={() => setAdminReplyType('general')}
                                className="text-accent"
                              />
                              <span className="text-sm">General</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="adminReplyType"
                                checked={adminReplyType === 'task'}
                                onChange={() => setAdminReplyType('task')}
                                className="text-accent"
                              />
                              <span className="text-sm">About a task</span>
                            </label>
                            {adminReplyType === 'task' && (
                              <select
                                value={adminReplyTaskId}
                                onChange={(e) => setAdminReplyTaskId(e.target.value)}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                              >
                                <option value="">Select task...</option>
                                {tasks?.map((t) => (
                                  <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                                {(!tasks?.length) && <option value="" disabled>No tasks</option>}
                              </select>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <textarea
                              value={adminReplyText}
                              onChange={(e) => setAdminReplyText(e.target.value)}
                              placeholder={adminReplyType === 'task' ? "Type your reply about this task..." : "Type your reply..."}
                              rows={2}
                              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                              disabled={adminSendingReply}
                            />
                            <Button type="submit" disabled={adminSendingReply || !adminReplyText?.trim() || (adminReplyType === 'task' && !adminReplyTaskId)}>
                              {adminSendingReply ? 'Sending...' : 'Reply'}
                            </Button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground py-8">Select a conversation to view and reply.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer: backup info + export */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 bg-muted/30 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground">
              Data is saved in this browser. Use <strong>Export Data</strong> to download a CSV backup (opens in Excel or Notepad).
            </p>
            <button
              type="button"
              onClick={handleExportData}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Icon name="Download" size={16} />
              <span>Export Data</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminTaskManagement;