import React, { useState, useEffect } from 'react';
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
import { useCreateWishlistItem, useUpdateWishlistItem } from '../../hooks/useWishlist';

const sections = [
  'Parts & Hardware',
  'Electronics',
  'Tools & Equipment',
  'Software & Tech',
  'Business & Marketing',
  'Safety & Workspace',
  'Competition & Travel',
];
const statuses = ['Wanted', 'Ordered', 'Shipped', 'Received'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];

const initialFormState = {
  name: '',
  description: '',
  section: '',
  status: 'Wanted',
  priority: 'Medium',
  estimated_cost: '',
  link: '',
  notes: '',
};

export function AddWishlistModal({ open, onOpenChange, item = null, defaultSection = null }) {
  const isEditing = !!item;
  const [formData, setFormData] = useState(initialFormState);

  const createItem = useCreateWishlistItem();
  const updateItem = useUpdateWishlistItem();

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        section: item.section || '',
        status: item.status || 'Wanted',
        priority: item.priority || 'Medium',
        estimated_cost: item.estimated_cost?.toString() || '',
        link: item.link || '',
        notes: item.notes || '',
      });
    } else {
      setFormData({
        ...initialFormState,
        section: defaultSection || '',
      });
    }
  }, [item, open, defaultSection]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.section) {
      return;
    }

    try {
      const data = {
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : 0,
      };

      if (isEditing) {
        await updateItem.mutateAsync({ id: item.id, data });
      } else {
        await createItem.mutateAsync(data);
      }

      setFormData(initialFormState);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save wishlist item:', error);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isPending = createItem.isPending || updateItem.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Wishlist Item' : 'Add to Wishlist'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the item details.' : 'Add a new item to your team wishlist.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Enter item name..."
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
              placeholder="Describe the item..."
              rows={2}
            />
          </div>

          {/* Section */}
          <div className="space-y-2">
            <Label>Section *</Label>
            <Select
              value={formData.section}
              onValueChange={(value) => updateField('section', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section} value={section}>
                    {section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Estimated Cost */}
          <div className="space-y-2">
            <Label htmlFor="cost">Estimated Cost ($)</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              value={formData.estimated_cost}
              onChange={(e) => updateField('estimated_cost', e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label htmlFor="link">Link (URL)</Label>
            <Input
              id="link"
              type="url"
              value={formData.link}
              onChange={(e) => updateField('link', e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddWishlistModal;
