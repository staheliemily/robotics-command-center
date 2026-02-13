import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useMilestones } from '../../hooks/useMilestones';

const NONE_VALUE = '__none__';

export function MilestoneSelect({ value, onValueChange, category, placeholder = "Select milestone" }) {
  const { data: milestones = [], isLoading } = useMilestones();

  const filteredMilestones = category
    ? milestones.filter(m => m.category === category)
    : milestones;

  const handleValueChange = (newValue) => {
    onValueChange(newValue === NONE_VALUE ? '' : newValue);
  };

  return (
    <Select value={value || NONE_VALUE} onValueChange={handleValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>No milestone</SelectItem>
        {filteredMilestones.map((milestone) => (
          <SelectItem key={milestone.id} value={milestone.id}>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: milestone.color || '#6366f1' }}
              />
              {milestone.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default MilestoneSelect;
