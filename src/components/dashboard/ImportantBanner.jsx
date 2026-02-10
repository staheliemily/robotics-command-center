import React, { useState } from 'react';
import { Megaphone, Edit2, Check, X } from 'lucide-react';
import { useBannerMessage, useUpdateBannerMessage } from '../../hooks/useSettings';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';

export function ImportantBanner({ className }) {
  const { data: message, isLoading } = useBannerMessage();
  const { updateBanner } = useUpdateBannerMessage();
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const handleEdit = () => {
    setEditValue(message || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    updateBanner(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  if (isLoading) return null;
  if (!message && !isAdmin) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-gradient-to-r from-primary-600 to-primary-500 p-4 text-white shadow-lg dark:from-primary-700 dark:to-primary-600",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Megaphone className="h-6 w-6" />
        </div>

        {isEditing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter announcement message..."
              className="flex-1 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white/30"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSave}
              className="text-white hover:bg-white/20"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancel}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <p className="flex-1 text-sm font-medium md:text-base">
              {message || 'Click edit to add an announcement'}
            </p>
            {isAdmin && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleEdit}
                className="text-white hover:bg-white/20"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Decorative elements */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-white/5" />
    </div>
  );
}

export default ImportantBanner;
