import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Calendar as CalendarIcon, ChevronDown, ChevronUp, Loader2, Send, Download, FileSpreadsheet, CheckCircle, Mail, Clock } from 'lucide-react';
import TaskForm from '@/components/TaskForm';
import TaskTable, { Task } from '@/components/TaskTable';
import ShiftSelector from '@/components/ShiftSelector';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import { User } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import type { TimeEntry } from '@shared/schema';

interface TrackerPageProps {
  user: User;
}

// Helper to get storage key for user's pending tasks
const getPendingTasksKey = (userId: string, date: string) => `pendingTasks_${userId}_${date}`;

export default function TrackerPage({ user }: TrackerPageProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [shiftHours, setShiftHours] = useState<4 | 8 | 12>(8);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [showSubmissionConfirm, setShowSubmissionConfirm] = useState(false);
  const [submittedTasks, setSubmittedTasks] = useState<Task[]>([]);
  
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const storageKey = getPendingTasksKey(user.id, formattedDate);
  
  // Initialize pendingTasks from localStorage
  const [pendingTasks, setPendingTasks] = useState<Task[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  // Persist pendingTasks to localStorage whenever they change
  const updatePendingTasks = (newTasks: Task[]) => {
    setPendingTasks(newTasks);
    if (newTasks.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(newTasks));
    } else {
      localStorage.removeItem(storageKey);
    }
  };
  
  // Load tasks when date changes
  const loadTasksForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const key = getPendingTasksKey(user.id, dateStr);
    try {
      const stored = localStorage.getItem(key);
      setPendingTasks(stored ? JSON.parse(stored) : []);
    } catch {
      setPendingTasks([]);
    }
  };

  // Fetch user's time entries from database
  const { data: serverEntries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time-entries/employee', user.id],
  });

  // Filter entries for selected date
  const todaysEntries = serverEntries.filter(e => e.date === formattedDate);

  // Format task description with task and subtask
  const formatTaskDescription = (task: Task) => {
    let desc = task.title;
    if (task.subTask) {
      desc += ' | ' + task.subTask;
    } else {
      desc += ' | '; // Ensure separator is present even if subtask is empty
    }
    if (task.description) {
      desc += ' | ' + task.description;
    }
    return desc;
  };

  // Create time entry mutation
  const submitMutation = useMutation({
    mutationFn: async (task: Task) => {
      const response = await apiRequest('POST', '/api/time-entries', {
        employeeId: user.id,
        employeeCode: user.employeeCode,
        employeeName: user.name,
        date: formattedDate,
        projectName: task.project,
        taskDescription: formatTaskDescription(task),
        problemAndIssues: (task as any).problemAndIssues || '',
        quantify: (task as any).quantify || '',
        achievements: (task as any).achievements || '',
        scopeOfImprovements: (task as any).scopeOfImprovements || '',
        toolsUsed: task.toolsUsed || [],
        startTime: task.startTime,
        endTime: task.endTime,
        totalHours: formatDuration(task.durationMinutes),
        percentageComplete: task.percentageComplete,
        status: 'pending',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries/employee', user.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update time entry mutation (for server entries)
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/time-entries/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries/employee', user.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
      toast({
        title: "Task Updated",
        description: "Your task has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task. Only pending tasks can be edited.",
        variant: "destructive",
      });
    },
  });

  // Delete time entry mutation (for server entries)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/time-entries/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries/employee', user.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
      toast({
        title: "Task Deleted",
        description: "Your task has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task. Only pending tasks can be deleted.",
        variant: "destructive",
      });
    },
  });

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const parseDuration = (duration: string): number => {
    const match = duration.match(/(\d+)h\s*(\d+)m?/);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2] || '0');
    }
    return 0;
  };

  // Parse task description that may contain task and subtask
  const parseTaskDescription = (taskDesc: string) => {
    const parts = taskDesc.split(' | ');
    if (parts.length >= 2) {
      return { title: parts[0], subTask: parts[1], description: parts.slice(2).join(' | ') };
    }
    const colonParts = taskDesc.split(':');
    return { title: colonParts[0] || taskDesc, subTask: '', description: colonParts[1]?.trim() || '' };
  };

  // Combine pending tasks with submitted entries for display
  const allTasks: Task[] = [
    // Convert server entries to Task format
    ...todaysEntries.map(entry => {
      const parsed = parseTaskDescription(entry.taskDescription);
      return {
        id: entry.id,
        project: entry.projectName,
        title: parsed.title,
        subTask: parsed.subTask,
        description: parsed.description,
        problemAndIssues: entry.problemAndIssues || '',
        quantify: entry.quantify || '',
        achievements: entry.achievements || '',
        scopeOfImprovements: entry.scopeOfImprovements || '',
        toolsUsed: entry.toolsUsed || [],
        startTime: entry.startTime,
        endTime: entry.endTime,
        durationMinutes: parseDuration(entry.totalHours),
        percentageComplete: entry.percentageComplete ?? 0,
        isComplete: entry.status === 'approved',
        serverStatus: entry.status as Task['serverStatus'],
      };
    }),
    // Add pending local tasks
    ...pendingTasks.map(t => ({ ...t, serverStatus: 'draft' as const })),
  ];

  const totalWorkedMinutes = allTasks.reduce((acc, task) => acc + task.durationMinutes, 0);
  const canSubmit = pendingTasks.length > 0 && totalWorkedMinutes >= shiftHours * 60;

  const handleSaveTask = async (taskData: any) => {
    const startParts = taskData.startTime.split(':').map(Number);
    const endParts = taskData.endTime.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    const duration = endMinutes - startMinutes;

    if (editingTask) {
      // Check if it's a local task or server task
      if (editingTask.id.toString().startsWith('local-')) {
        // Local task - update in state and localStorage
        updatePendingTasks(pendingTasks.map(t => 
          t.id === editingTask.id 
            ? { ...t, ...taskData, durationMinutes: duration }
            : t
        ));
      } else {
        // Server task - update via API
        await updateMutation.mutateAsync({
          id: editingTask.id.toString(),
          data: {
            projectName: taskData.project,
            taskDescription: formatTaskDescription({ ...taskData, title: taskData.title, subTask: taskData.subTask, description: taskData.description, durationMinutes: duration }),
            problemAndIssues: taskData.problemAndIssues || '',
            quantify: taskData.quantify || '',
            achievements: taskData.achievements || '',
            scopeOfImprovements: taskData.scopeOfImprovements || '',
            toolsUsed: taskData.toolsUsed || [],
            startTime: taskData.startTime,
            endTime: taskData.endTime,
            totalHours: formatDuration(duration),
            percentageComplete: taskData.percentageComplete || 0,
          },
        });
      }
    } else {
      const newTask: Task = {
        id: `local-${Date.now()}`,
        project: taskData.project,
        title: taskData.title,
        subTask: taskData.subTask || '',
        description: taskData.description,
        problemAndIssues: taskData.problemAndIssues || '',
        quantify: taskData.quantify || '',
        achievements: taskData.achievements || '',
        scopeOfImprovements: taskData.scopeOfImprovements || '',
        toolsUsed: taskData.toolsUsed || [],
        startTime: taskData.startTime,
        endTime: taskData.endTime,
        percentageComplete: taskData.percentageComplete || 0,
        durationMinutes: duration,
        isComplete: false,
      };
      updatePendingTasks([...pendingTasks, newTask]);
    }

    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleEditTask = (task: Task) => {
    // Allow editing of local tasks OR server tasks that are still pending
    if (task.id.startsWith('local-') || task.serverStatus === 'pending') {
      setEditingTask(task);
      setShowTaskForm(true);
    } else {
      toast({
        title: "Cannot Edit",
        description: "Only pending tasks can be edited.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // Allow deletion of local tasks OR server tasks that are still pending
    const task = allTasks.find(t => t.id === taskId);
    
    if (taskId.startsWith('local-')) {
      // Local task - remove from state and localStorage
      updatePendingTasks(pendingTasks.filter(t => t.id !== taskId));
    } else if (task?.serverStatus === 'pending') {
      // Server task - delete via API
      await deleteMutation.mutateAsync(taskId);
    } else {
      toast({
        title: "Cannot Delete",
        description: "Only pending tasks can be deleted.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteTask = (taskId: string) => {
    updatePendingTasks(pendingTasks.map(t => 
      t.id === taskId ? { ...t, isComplete: true, percentageComplete: 100 } : t
    ));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Store tasks for confirmation display
      const tasksToSubmit = [...pendingTasks];
      
      // Submit all pending tasks to database
      for (const task of pendingTasks) {
        await apiRequest('POST', '/api/time-entries', {
          employeeId: user.id,
          employeeCode: user.employeeCode,
          employeeName: user.name,
          date: formattedDate,
          projectName: task.project,
          taskDescription: formatTaskDescription(task),
          problemAndIssues: (task as any).problemAndIssues || '',
          quantify: (task as any).quantify || '',
          achievements: (task as any).achievements || '',
          scopeOfImprovements: (task as any).scopeOfImprovements || '',
          toolsUsed: task.toolsUsed || [],
          startTime: task.startTime,
          endTime: task.endTime,
          totalHours: formatDuration(task.durationMinutes),
          percentageComplete: task.percentageComplete,
          status: 'pending',
        });
      }
      
      // Send email notification to managers
      try {
        await apiRequest('POST', '/api/notifications/timesheet-submitted', {
          employeeId: user.id,
          employeeName: user.name,
          employeeCode: user.employeeCode,
          date: formattedDate,
          taskCount: tasksToSubmit.length,
          totalHours: formatDuration(tasksToSubmit.reduce((acc, t) => acc + t.durationMinutes, 0)),
        });
      } catch (emailError) {
        console.log('Email notification skipped');
      }
      
      // Save submitted tasks for display and show confirmation
      setSubmittedTasks(tasksToSubmit);
      setShowSubmissionConfirm(true);
      
      toast({
        title: "Timesheet Submitted",
        description: "Your timesheet has been sent for approval.",
      });
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Some tasks failed to submit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearPendingTasksAndReload = () => {
    updatePendingTasks([]);
    setShowSubmissionConfirm(false);
    queryClient.invalidateQueries({ queryKey: ['/api/time-entries/employee', user.id] });
  };

  // Export to Excel function
  const handleExportToExcel = () => {
    // Prepare data for export
    const exportData = serverEntries.map(entry => ({
      'Date': entry.date,
      'Employee Code': entry.employeeCode,
      'Employee Name': entry.employeeName,
      'Project Name': entry.projectName,
      'Task Description': entry.taskDescription,
      'Start Time': entry.startTime,
      'End Time': entry.endTime,
      'Total Hours': entry.totalHours,
      'Status': entry.status ? entry.status.charAt(0).toUpperCase() + entry.status.slice(1) : 'Pending',
      'Submitted At': entry.submittedAt ? format(new Date(entry.submittedAt), 'yyyy-MM-dd HH:mm') : '',
      'Approved By': entry.approvedBy || '',
      'Approved At': entry.approvedAt ? format(new Date(entry.approvedAt), 'yyyy-MM-dd HH:mm') : '',
    }));

    if (exportData.length === 0) {
      toast({
        title: "No Data",
        description: "There are no time entries to export.",
        variant: "destructive",
      });
      return;
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Date
      { wch: 14 }, // Employee Code
      { wch: 20 }, // Employee Name
      { wch: 20 }, // Project Name
      { wch: 40 }, // Task Description
      { wch: 10 }, // Start Time
      { wch: 10 }, // End Time
      { wch: 12 }, // Total Hours
      { wch: 10 }, // Status
      { wch: 18 }, // Submitted At
      { wch: 15 }, // Approved By
      { wch: 18 }, // Approved At
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Time Entries');

    // Generate filename with date range
    const fileName = `TimeEntries_${user.employeeCode}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Export Successful",
      description: `Downloaded ${exportData.length} time entries as Excel file.`,
    });
  };

  // Calculate live tools usage from actual tasks
  const toolsUsageMap = new Map<string, number>();
  allTasks.forEach(task => {
    if (task.toolsUsed && task.toolsUsed.length > 0) {
      const minutesPerTool = task.durationMinutes / task.toolsUsed.length;
      task.toolsUsed.forEach(tool => {
        toolsUsageMap.set(tool, (toolsUsageMap.get(tool) || 0) + minutesPerTool);
      });
    }
  });
  const liveToolsUsage = Array.from(toolsUsageMap.entries())
    .map(([tool, minutes]) => ({ tool, minutes: Math.round(minutes) }))
    .sort((a, b) => b.minutes - a.minutes);

  // Calculate live hourly productivity from actual task times
  const hourlyMap = new Map<string, number>();
  allTasks.forEach(task => {
    if (task.startTime && task.endTime) {
      const startHour = parseInt(task.startTime.split(':')[0]);
      const endHour = parseInt(task.endTime.split(':')[0]);
      const startMin = parseInt(task.startTime.split(':')[1]);
      const endMin = parseInt(task.endTime.split(':')[1]);
      
      for (let h = startHour; h <= endHour; h++) {
        let mins = 60;
        if (h === startHour) mins = 60 - startMin;
        if (h === endHour) mins = Math.min(mins, endMin);
        if (h === startHour && h === endHour) mins = endMin - startMin;
        
        const hourLabel = h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`;
        hourlyMap.set(hourLabel, (hourlyMap.get(hourLabel) || 0) + Math.max(0, mins));
      }
    }
  });
  
  // Create ordered hourly data
  const hours = ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM'];
  const liveHourlyProductivity = hours
    .map(hour => ({ hour, minutes: hourlyMap.get(hour) || 0 }))
    .filter(h => h.minutes > 0 || hours.indexOf(h.hour) <= hours.findIndex(hh => hourlyMap.has(hh)));

  // Analytics data based on live tracked tasks only
  const analyticsData = {
    productiveMinutes: totalWorkedMinutes,
    idleMinutes: 0,
    neutralMinutes: 0,
    nonProductiveMinutes: 0,
    taskHours: allTasks.map(t => ({ task: t.title.slice(0, 20), hours: t.durationMinutes / 60 })),
    toolsUsage: liveToolsUsage,
    hourlyProductivity: liveHourlyProductivity.length > 0 ? liveHourlyProductivity : [],
  };

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="tracker-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
            Time Tracker
          </h1>
          <p className="text-blue-200/60 text-sm">
            Welcome, {user.name} ({user.employeeCode})
          </p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="bg-slate-800 border-blue-500/20 text-white hover:bg-slate-700"
              data-testid="button-date-picker"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-slate-800 border-blue-500/20" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  loadTasksForDate(date);
                }
              }}
              className="rounded-md"
            />
          </PopoverContent>
        </Popover>
      </div>

      <ShiftSelector
        shiftHours={shiftHours}
        onShiftChange={setShiftHours}
        totalWorkedMinutes={totalWorkedMinutes}
        onFinalSubmit={handleFinalSubmit}
        canSubmit={canSubmit}
      />

      {/* Pending Tasks Info */}
      {pendingTasks.length > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30 p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-200">
                {pendingTasks.length} task{pendingTasks.length > 1 ? 's' : ''} pending submission
              </span>
            </div>
            <Button
              onClick={handleFinalSubmit}
              disabled={!canSubmit || submitMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-500"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit All
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-white">Today's Tasks</h2>
        <Button
          onClick={() => {
            setEditingTask(null);
            setShowTaskForm(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-cyan-600"
          data-testid="button-add-task"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {showTaskForm && (
        <TaskForm
          task={editingTask ? {
            id: editingTask.id,
            project: editingTask.project,
            title: editingTask.title,
            subTask: editingTask.subTask || '',
            description: editingTask.description,
            problemAndIssues: (editingTask as any).problemAndIssues || '',
            quantify: editingTask.quantify || '',
            achievements: (editingTask as any).achievements || '',
            scopeOfImprovements: (editingTask as any).scopeOfImprovements || '',
            toolsUsed: editingTask.toolsUsed,
            startTime: editingTask.startTime,
            endTime: editingTask.endTime,
            percentageComplete: editingTask.percentageComplete,
          } : undefined}
          onSave={handleSaveTask}
          onCancel={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
          existingTasks={allTasks}
          user={{ role: user.role, employeeCode: user.employeeCode }}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      ) : (
        <TaskTable
          tasks={allTasks}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onComplete={handleCompleteTask}
        />
      )}

      <div className="border-t border-blue-500/20 pt-6">
        <Button
          variant="ghost"
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="text-blue-300 hover:text-white mb-4"
          data-testid="button-toggle-analytics"
        >
          {showAnalytics ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Hide Analytics
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Show Analytics
            </>
          )}
        </Button>

        {showAnalytics && <AnalyticsPanel {...analyticsData} />}
      </div>

      {/* Export Section */}
      <div className="border-t border-blue-500/20 pt-6">
        <Card className="bg-slate-800/50 border-blue-500/20 p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/20">
                <FileSpreadsheet className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Export Time Entries</h3>
                <p className="text-blue-200/60 text-sm">
                  Download all your time entries as an Excel file
                </p>
              </div>
            </div>
            <Button
              onClick={handleExportToExcel}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
              disabled={serverEntries.length === 0}
              data-testid="button-export-excel"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-blue-200/60 bg-slate-700/50 px-2 py-1 rounded">
              Total Entries: {serverEntries.length}
            </span>
            <span className="text-xs text-green-400/60 bg-green-500/10 px-2 py-1 rounded">
              Approved: {serverEntries.filter(e => e.status === 'approved').length}
            </span>
            <span className="text-xs text-yellow-400/60 bg-yellow-500/10 px-2 py-1 rounded">
              Pending: {serverEntries.filter(e => e.status === 'pending').length}
            </span>
            <span className="text-xs text-red-400/60 bg-red-500/10 px-2 py-1 rounded">
              Rejected: {serverEntries.filter(e => e.status === 'rejected').length}
            </span>
          </div>
        </Card>
      </div>

      {/* Submission Confirmation Dialog */}
      <Dialog open={showSubmissionConfirm} onOpenChange={setShowSubmissionConfirm}>
        <DialogContent className="bg-slate-900 border-blue-500/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-full bg-green-500/20">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              Timesheet Submitted Successfully
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm text-blue-200/80 bg-blue-500/10 p-3 rounded-md">
              <Mail className="w-4 h-4 text-blue-400" />
              <span>Notification sent to managers for approval</span>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Submitted Tasks ({submittedTasks.length})
              </h4>
              
              <div className="bg-slate-800/50 rounded-md border border-blue-500/20 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800">
                    <tr className="text-left text-blue-200/60">
                      <th className="px-3 py-2">Task</th>
                      <th className="px-3 py-2">Project</th>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submittedTasks.map((task, index) => (
                      <tr key={index} className="border-t border-slate-700/50">
                        <td className="px-3 py-2 text-white">{task.title}</td>
                        <td className="px-3 py-2 text-blue-200/80">{task.project}</td>
                        <td className="px-3 py-2 text-blue-200/60">{task.startTime} - {task.endTime}</td>
                        <td className="px-3 py-2 text-cyan-400">{formatDuration(task.durationMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-800">
                    <tr className="border-t border-slate-700">
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-white">Total:</td>
                      <td className="px-3 py-2 font-semibold text-cyan-400">
                        {formatDuration(submittedTasks.reduce((acc, t) => acc + t.durationMinutes, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-yellow-200/80 bg-yellow-500/10 p-3 rounded-md">
              <Send className="w-4 h-4 text-yellow-400" />
              <span>Status: <strong>Pending Approval</strong> - Awaiting manager review</span>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={clearPendingTasksAndReload}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 w-full"
              data-testid="button-close-confirmation"
            >
              Back to Tracker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
