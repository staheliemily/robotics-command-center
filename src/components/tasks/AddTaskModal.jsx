import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { useCreateTask } from '../../hooks/useTasks';
import { MilestoneSelect } from '../milestones/MilestoneSelect';
import { cn } from '../../lib/utils';

// FTC Teams
const ftcTeams = ['Unhatched Plan', 'Weight on Our Shoulders'];
// FRC Teams
const frcTeams = ['Icarus Innovated', 'New Hawks'];
const allTeams = [...ftcTeams, ...frcTeams];

const categories = ['FTC', 'FRC'];
const statuses = ['Not Started', 'In Progress', 'Blocked', 'Completed'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const departments = ['Mechanical', 'Electrical', 'Software', 'Marketing', 'Operations'];

const initialFormState = {
  title: '',
  description: '',
  team: '',
  category: '',
  department: '',
  subsystem: '',
  assigned_to: '',
  milestone_id: '',
  start_date: null,
  due_date: null,
  status: 'Not Started',
  priority: 'Medium',
  needs_mentor: false,
};

export function AddTaskModal({ open, onOpenChange, defaultTeam, defaultCategory }) {
  const [formData, setFormData] = useState({
    ...initialFormState,
    team: defaultTeam || '',
    category: defaultCategory || '',
  });
  const createTask = useCreateTask();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.team || !formData.category) {
      return;
    }

    try {
      await createTask.mutateAsync({
        ...formData,
        start_date: formData.start_date?.toISOString(),
        due_date: formData.due_date?.toISOString(),
      });
      setFormData({
        ...initialFormState,
        team: defaultTeam || '',
        category: defaultCategory || '',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a new task for your robotics team. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Enter task title..."
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe the task..."
              rows={3}
            />
          </div>

          {/* Category & Team Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  updateField('category', value);
                  // Clear team if it doesn't match the category
                  if (value === 'FTC' && !ftcTeams.includes(formData.team)) {
                    updateField('team', '');
                  } else if (value === 'FRC' && !frcTeams.includes(formData.team)) {
                    updateField('team', '');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
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

            <div className="space-y-2">
              <Label>Team *</Label>
              <Select
                value={formData.team}
                onValueChange={(value) => updateField('team', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {(formData.category === 'FTC' ? ftcTeams :
                    formData.category === 'FRC' ? frcTeams :
                    allTeams).map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Department & Subsystem Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => updateField('department', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subsystem">Subsystem</Label>
              <Input
                id="subsystem"
                value={formData.subsystem}
                onChange={(e) => updateField('subsystem', e.target.value)}
                placeholder="e.g., Drivetrain, Arm..."
              />
            </div>
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Input
              id="assigned_to"
              value={formData.assigned_to}
              onChange={(e) => updateField('assigned_to', e.target.value)}
              placeholder="Enter team member name..."
            />
          </div>

          {/* Milestone */}
          <div className="space-y-2">
            <Label>Milestone</Label>
            <MilestoneSelect
              value={formData.milestone_id}
              onValueChange={(value) => updateField('milestone_id', value)}
              category={formData.category}
              placeholder="Select milestone (optional)"
            />
          </div>

          {/* Dates Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.start_date && "text-surface-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(formData.start_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date}
                    onSelect={(date) => updateField('start_date', date)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.due_date && "text-surface-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(formData.due_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(date) => updateField('due_date', date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Status & Priority Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => updateField('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
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
                  <SelectValue placeholder="Select priority" />
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

          {/* Needs Mentor */}
          <div className="flex items-center justify-between rounded-lg border border-surface-200 p-4 dark:border-surface-700">
            <div className="space-y-0.5">
              <Label>Needs Mentor Help</Label>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Flag this task for mentor attention
              </p>
            </div>
            <Switch
              checked={formData.needs_mentor}
              onCheckedChange={(checked) => updateField('needs_mentor', checked)}
            />
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending} className="w-full sm:w-auto">
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddTaskModal;
