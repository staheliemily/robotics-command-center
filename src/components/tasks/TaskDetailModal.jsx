import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Trash2, Edit2, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input, Textarea, Label } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import { useAuth } from '../../context/AuthContext';
import { formatDate, cn } from '../../lib/utils';

const teams = ['Unhatched Plan', 'Weight on Our Shoulders', 'Icarus Innovated', 'New Hawks'];
const categories = ['FTC', 'FRC'];
const statuses = ['Not Started', 'In Progress', 'Blocked', 'Completed'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const departments = ['Mechanical', 'Electrical', 'Software', 'Marketing', 'Operations'];

export function TaskDetailModal({ task, open, onOpenChange }) {
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        start_date: task.start_date ? new Date(task.start_date) : null,
        due_date: task.due_date ? new Date(task.due_date) : null,
      });
    }
  }, [task]);

  if (!task) return null;

  const handleSave = async () => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        data: {
          ...formData,
          start_date: formData.start_date?.toISOString(),
          due_date: formData.due_date?.toISOString(),
        },
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask.mutateAsync(task.id);
        onOpenChange(false);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {isEditing ? 'Edit Task' : 'Task Details'}
              </DialogTitle>
              <DialogDescription>
                {isEditing ? 'Update the task information below.' : `Created ${formatDate(task.created_at)}`}
              </DialogDescription>
            </div>
            {isAdmin && !isEditing && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {isEditing ? (
          <form className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
              />
            </div>

            {/* Team & Category */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Team</Label>
                <Select
                  value={formData.team}
                  onValueChange={(value) => updateField('team', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team} value={team}>
                        {team}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => updateField('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status & Priority */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => updateField('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => updateField('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assigned To</Label>
              <Input
                id="assigned_to"
                value={formData.assigned_to || ''}
                onChange={(e) => updateField('assigned_to', e.target.value)}
              />
            </div>

            {/* Needs Mentor */}
            <div className="flex items-center justify-between rounded-lg border border-surface-200 p-4 dark:border-surface-700">
              <Label>Needs Mentor Help</Label>
              <Switch
                checked={formData.needs_mentor}
                onCheckedChange={(checked) => updateField('needs_mentor', checked)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateTask.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateTask.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={task.category === 'FTC' ? 'ftc' : 'frc'}>
                {task.category}
              </Badge>
              <Badge variant={task.priority?.toLowerCase()}>
                {task.priority}
              </Badge>
              <Badge
                variant={
                  task.status === 'Completed' ? 'completed' :
                  task.status === 'In Progress' ? 'inProgress' :
                  task.status === 'Blocked' ? 'blocked' : 'pending'
                }
              >
                {task.status}
              </Badge>
              {task.needs_mentor && (
                <Badge variant="warning">Needs Mentor</Badge>
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl font-semibold">{task.title}</h2>

            {/* Description */}
            {task.description && (
              <p className="text-surface-600 dark:text-surface-400">
                {task.description}
              </p>
            )}

            {/* Details Grid */}
            <div className="grid gap-4 rounded-lg border border-surface-200 p-4 dark:border-surface-700 sm:grid-cols-2">
              <div>
                <span className="text-sm text-surface-500">Team</span>
                <p className="font-medium">{task.team}</p>
              </div>
              {task.department && (
                <div>
                  <span className="text-sm text-surface-500">Department</span>
                  <p className="font-medium">{task.department}</p>
                </div>
              )}
              {task.subsystem && (
                <div>
                  <span className="text-sm text-surface-500">Subsystem</span>
                  <p className="font-medium">{task.subsystem}</p>
                </div>
              )}
              {task.assigned_to && (
                <div>
                  <span className="text-sm text-surface-500">Assigned To</span>
                  <p className="font-medium">{task.assigned_to}</p>
                </div>
              )}
              {task.start_date && (
                <div>
                  <span className="text-sm text-surface-500">Start Date</span>
                  <p className="font-medium">{formatDate(task.start_date)}</p>
                </div>
              )}
              {task.due_date && (
                <div>
                  <span className="text-sm text-surface-500">Due Date</span>
                  <p className="font-medium">{formatDate(task.due_date)}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {isAdmin && (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Task
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default TaskDetailModal;
