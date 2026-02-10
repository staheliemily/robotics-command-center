import React from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

const teams = ['All Teams', 'Unhatched Plan', 'Weight on Our Shoulders', 'Icarus Innovated', 'New Hawks'];
const categories = ['All', 'FTC', 'FRC'];
const statuses = ['All', 'Not Started', 'In Progress', 'Blocked', 'Completed'];
const priorities = ['All', 'Low', 'Medium', 'High', 'Critical'];
const departments = ['All', 'Mechanical', 'Electrical', 'Software', 'Marketing', 'Operations'];

export function TaskFilters({
  filters,
  onFilterChange,
  onClearFilters,
  className,
}) {
  const activeFilterCount = Object.values(filters).filter(
    v => v && v !== 'All' && v !== 'All Teams'
  ).length;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-surface-500" />
          <span className="text-sm font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount} active</Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-1 text-xs"
          >
            <X className="h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* Team Filter */}
        <Select
          value={filters.team || 'All Teams'}
          onValueChange={(value) => onFilterChange('team', value === 'All Teams' ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team} value={team}>
                {team}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={filters.category || 'All'}
          onValueChange={(value) => onFilterChange('category', value === 'All' ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status || 'All'}
          onValueChange={(value) => onFilterChange('status', value === 'All' ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value={filters.priority || 'All'}
          onValueChange={(value) => onFilterChange('priority', value === 'All' ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Department Filter */}
        <Select
          value={filters.department || 'All'}
          onValueChange={(value) => onFilterChange('department', value === 'All' ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Department" />
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
    </div>
  );
}

export default TaskFilters;
