import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Gantt from 'frappe-gantt';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useMilestones } from '../../hooks/useMilestones';
import { useUpdateTask } from '../../hooks/useTasks';
import { useUpdateMilestone } from '../../hooks/useMilestones';
import { cn } from '../../lib/utils';

const VIEW_MODES = [
  { id: 'Day', label: 'Day' },
  { id: 'Week', label: 'Week' },
  { id: 'Month', label: 'Month' },
  { id: 'Quarter', label: 'Quarter' },
];

export function GanttChart({ tasks = [], categoryFilter, onTaskClick, onMilestoneClick, onAddTask }) {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const ganttRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const isDraggingRef = useRef(false);
  const { data: allMilestones = [] } = useMilestones();
  const [viewMode, setViewMode] = useState('Week');
  const [containerWidth, setContainerWidth] = useState(0);
  const [expandedMilestones, setExpandedMilestones] = useState(new Set());
  const updateTask = useUpdateTask();
  const updateMilestone = useUpdateMilestone();

  // Initialize all milestones as expanded
  useEffect(() => {
    const allIds = new Set(allMilestones.map(m => m.id));
    setExpandedMilestones(allIds);
  }, [allMilestones]);

  // Track container width for responsive column sizing
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateWidth = () => {
      setContainerWidth(wrapper.offsetWidth);
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(wrapper);

    return () => resizeObserver.disconnect();
  }, []);

  const filteredMilestones = useMemo(() =>
    categoryFilter
      ? allMilestones.filter(m => m.category === categoryFilter)
      : allMilestones,
    [allMilestones, categoryFilter]
  );

  const filteredTasks = useMemo(() =>
    categoryFilter
      ? tasks.filter(t => t.category === categoryFilter)
      : tasks,
    [tasks, categoryFilter]
  );

  // Build task hierarchy for left panel
  const taskHierarchy = useMemo(() => {
    const hierarchy = [];

    filteredMilestones.forEach((milestone) => {
      const milestoneTasks = filteredTasks.filter(t => t.milestone_id === milestone.id);
      hierarchy.push({
        type: 'milestone',
        data: milestone,
        tasks: milestoneTasks,
      });
    });

    // Add unassigned tasks
    const unassignedTasks = filteredTasks.filter(t => !t.milestone_id);
    if (unassignedTasks.length > 0) {
      hierarchy.push({
        type: 'unassigned',
        data: { id: 'unassigned', name: 'Unassigned' },
        tasks: unassignedTasks,
      });
    }

    return hierarchy;
  }, [filteredMilestones, filteredTasks]);

  // Convert to Frappe Gantt format (always include all tasks)
  const ganttTasks = useMemo(() => {
    const result = [];

    taskHierarchy.forEach((group) => {
      if (group.type === 'milestone') {
        const milestone = group.data;
        const startDate = milestone.start_date
          ? new Date(milestone.start_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        const endDate = milestone.end_date
          ? new Date(milestone.end_date).toISOString().split('T')[0]
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        result.push({
          id: `milestone-${milestone.id}`,
          name: milestone.name,
          start: startDate,
          end: endDate,
          progress: milestone.status === 'Completed' ? 100 : milestone.status === 'In Progress' ? 50 : 0,
          custom_class: 'gantt-milestone',
          _original: milestone,
          _type: 'milestone',
        });
      }

      // Always include tasks in Gantt timeline
      group.tasks.forEach((task) => {
        const taskStart = task.start_date
          ? new Date(task.start_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        const taskEnd = task.due_date
          ? new Date(task.due_date).toISOString().split('T')[0]
          : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        result.push({
          id: `task-${task.id}`,
          name: task.title,
          start: taskStart,
          end: taskEnd,
          progress: task.status === 'Completed' ? 100 : task.status === 'In Progress' ? 50 : 0,
          custom_class: getTaskClass(task),
          _original: task,
          _type: 'task',
        });
      });
    });

    return result;
  }, [taskHierarchy]);

  const toggleMilestone = (id) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Event handlers
  const handleClick = useCallback((task) => {
    // Don't open edit if we just finished dragging
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }

    if (task._type === 'milestone' && task._original) {
      onMilestoneClick?.(task._original);
    } else if (task._original) {
      onTaskClick?.(task._original);
    }
  }, [onTaskClick, onMilestoneClick]);

  const handleDateChange = useCallback(async (task, start, end) => {
    // Mark that we were dragging so click handler doesn't fire
    isDraggingRef.current = true;
    // Mark update time to prevent refresh from interfering
    lastUpdateTimeRef.current = Date.now();

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    if (task._type === 'milestone' && task._original) {
      try {
        await updateMilestone.mutateAsync({
          id: task._original.id,
          data: { start_date: startISO, end_date: endISO },
        });
      } catch (error) {
        console.error('Failed to update milestone:', error);
      }
    } else if (task._original) {
      try {
        await updateTask.mutateAsync({
          id: task._original.id,
          data: { start_date: startISO, due_date: endISO },
        });
      } catch (error) {
        console.error('Failed to update task:', error);
      }
    }
  }, [updateTask, updateMilestone]);

  const handleProgressChange = useCallback(async (task, progress) => {
    // Mark that we were dragging so click handler doesn't fire
    isDraggingRef.current = true;
    // Mark update time to prevent refresh from interfering
    lastUpdateTimeRef.current = Date.now();

    if (task._type === 'task' && task._original) {
      const newStatus = progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started';
      try {
        await updateTask.mutateAsync({
          id: task._original.id,
          data: { status: newStatus },
        });
      } catch (error) {
        console.error('Failed to update task progress:', error);
      }
    }
  }, [updateTask]);

  // Calculate column width
  const columnWidth = useMemo(() => {
    if (!containerWidth) return 50;
    const columnCounts = { 'Day': 60, 'Week': 12, 'Month': 6, 'Quarter': 4 };
    const columns = columnCounts[viewMode] || 12;
    const minWidth = viewMode === 'Day' ? 30 : viewMode === 'Week' ? 80 : 120;
    return Math.max(minWidth, Math.floor((containerWidth - 20) / columns));
  }, [containerWidth, viewMode]);

  // Scroll the wrapper to show a specific date
  const scrollToDate = useCallback((date) => {
    const wrapper = wrapperRef.current;
    const gantt = ganttRef.current;
    if (!wrapper || !gantt || !date) return;

    try {
      // Try the built-in scroll_to method first
      if (typeof gantt.scroll_to === 'function') {
        gantt.scroll_to(date);
        return;
      }
    } catch (e) {
      // Fall back to manual scroll
    }

    // Manual scroll: find the SVG and calculate position
    try {
      const svg = wrapper.querySelector('svg.gantt');
      if (!svg) return;

      // Get the gantt's date range from the SVG
      const bars = svg.querySelectorAll('.bar-wrapper');
      if (bars.length === 0) return;

      // Find the bar closest to the target date
      const targetTime = date.getTime();
      let closestBar = null;
      let closestDiff = Infinity;

      bars.forEach(bar => {
        const rect = bar.querySelector('.bar');
        if (rect) {
          const x = parseFloat(rect.getAttribute('x')) || 0;
          // This is approximate - we'll scroll to show this bar
          if (!closestBar || x < parseFloat(closestBar.querySelector('.bar')?.getAttribute('x') || 0)) {
            closestBar = bar;
          }
        }
      });

      if (closestBar) {
        const rect = closestBar.querySelector('.bar');
        const x = parseFloat(rect?.getAttribute('x')) || 0;
        // Scroll to show the bar with some padding
        wrapper.scrollLeft = Math.max(0, x - 100);
      }
    } catch (e) {
      console.debug('Manual scroll failed:', e);
    }
  }, []);

  // Scroll to today
  const scrollToToday = useCallback(() => {
    scrollToDate(new Date());
  }, [scrollToDate]);

  // Scroll to earliest task
  const scrollToStart = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Simply scroll to the beginning
    wrapper.scrollLeft = 0;

    // Then try to find and scroll to the first bar
    setTimeout(() => {
      try {
        const svg = wrapper.querySelector('svg.gantt');
        if (!svg) return;

        const firstBar = svg.querySelector('.bar-wrapper .bar');
        if (firstBar) {
          const x = parseFloat(firstBar.getAttribute('x')) || 0;
          wrapper.scrollLeft = Math.max(0, x - 50);
        }
      } catch (e) {
        console.debug('Scroll to start failed:', e);
      }
    }, 50);
  }, []);

  // Initialize Gantt chart
  useEffect(() => {
    const container = containerRef.current;
    if (!container || ganttTasks.length === 0 || !containerWidth) return;

    container.innerHTML = '';

    const gantt = new Gantt(container, ganttTasks, {
      view_mode: viewMode,
      date_format: 'YYYY-MM-DD',
      column_width: columnWidth,
      bar_height: 24,
      bar_corner_radius: 4,
      padding: 14,
      arrow_curve: 5,
      popup_trigger: null, // Disable popup since we use click for edit modal
      language: 'en',
      on_click: handleClick,
      on_date_change: handleDateChange,
      on_progress_change: handleProgressChange,
    });

    ganttRef.current = gantt;

    // Scroll to first task after the chart renders
    setTimeout(() => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      try {
        const svg = wrapper.querySelector('svg.gantt');
        if (!svg) return;

        // Find the first bar and scroll to it
        const firstBar = svg.querySelector('.bar-wrapper .bar');
        if (firstBar) {
          const x = parseFloat(firstBar.getAttribute('x')) || 0;
          wrapper.scrollLeft = Math.max(0, x - 50);
        }
      } catch (e) {
        console.debug('Initial scroll failed');
      }
    }, 200);

    return () => {
      if (container) container.innerHTML = '';
      ganttRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, columnWidth, ganttTasks.length]);

  // Refresh on data changes (skip if recently updated via drag to avoid visual glitch)
  useEffect(() => {
    if (!ganttRef.current || ganttTasks.length === 0) return;

    // Skip refresh if an update happened in the last 1 second
    const timeSinceUpdate = Date.now() - lastUpdateTimeRef.current;
    if (timeSinceUpdate < 1000) {
      return;
    }

    try {
      ganttRef.current.refresh(ganttTasks);
    } catch (e) {
      console.debug('Gantt refresh skipped');
    }
  }, [ganttTasks]);

  const ROW_HEIGHT = 38;

  if (taskHierarchy.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-900 text-surface-400">
        <p>No tasks or milestones to display. Create a milestone and add tasks with dates.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-surface-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-surface-800 bg-surface-900 px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={scrollToStart}
            className="rounded bg-surface-800 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-700"
          >
            First Task
          </button>
          <button
            onClick={scrollToToday}
            className="rounded bg-surface-800 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-700"
          >
            Today
          </button>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="rounded bg-surface-800 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-700 border-none focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {VIEW_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>{mode.label}</option>
            ))}
          </select>
        </div>
        <div className="text-sm text-surface-400">
          Drag bars to reschedule • Drag edges to adjust progress
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Task List */}
        <div className="w-64 flex-shrink-0 border-r border-surface-800 bg-surface-900">
          {/* Header */}
          <div className="flex h-[52px] items-center border-b border-surface-800 px-3">
            <span className="text-sm font-medium text-surface-300">Name</span>
          </div>

          {/* Task List */}
          <div className="overflow-y-auto">
            {taskHierarchy.map((group) => {
              const isExpanded = expandedMilestones.has(group.data.id);
              const isMilestone = group.type === 'milestone';

              return (
                <div key={group.data.id}>
                  {/* Group Header */}
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 cursor-pointer hover:bg-surface-800",
                      isMilestone ? "text-surface-200" : "text-surface-400"
                    )}
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => isMilestone && toggleMilestone(group.data.id)}
                  >
                    {isMilestone && (
                      <button className="text-surface-500 hover:text-surface-300">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    )}
                    <div
                      className="h-2 w-2 rounded-sm"
                      style={{ backgroundColor: group.data.color || '#6b7280' }}
                    />
                    <span className="truncate text-sm font-medium">{group.data.name}</span>
                  </div>

                  {/* Tasks */}
                  {(isExpanded || group.type === 'unassigned') && group.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 pl-9 pr-3 cursor-pointer hover:bg-surface-800 text-surface-400 hover:text-surface-200"
                      style={{ height: ROW_HEIGHT }}
                      onClick={() => onTaskClick?.(task)}
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-surface-600" />
                      <span className="truncate text-sm">{task.title}</span>
                    </div>
                  ))}

                  {/* Add Task Button */}
                  {isMilestone && isExpanded && (
                    <div
                      className="flex items-center gap-2 pl-9 pr-3 cursor-pointer hover:bg-surface-800 text-surface-500 hover:text-surface-300"
                      style={{ height: ROW_HEIGHT }}
                      onClick={() => onAddTask?.(group.data)}
                    >
                      <Plus className="h-3 w-3" />
                      <span className="text-sm">Add Task</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel - Timeline */}
        <div
          ref={wrapperRef}
          className="flex-1 overflow-x-auto bg-surface-950"
        >
          <div ref={containerRef} />
        </div>
      </div>
    </div>
  );
}

function getTaskClass(task) {
  if (task.status === 'Completed') return 'gantt-completed';
  if (task.status === 'Blocked') return 'gantt-blocked';
  if (task.priority === 'Critical') return 'gantt-critical';
  if (task.priority === 'High') return 'gantt-high';
  return 'gantt-task';
}

export default GanttChart;
