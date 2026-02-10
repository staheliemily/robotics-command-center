import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const gradientClasses = {
  ftc: 'gradient-ftc',
  frc: 'gradient-frc',
  blue: 'gradient-blue',
  purple: 'gradient-purple',
  default: 'bg-surface-800 dark:bg-surface-700',
};

export function CategorySection({
  title,
  icon: Icon,
  gradient = 'default',
  children,
  collapsible = true,
  defaultOpen = true,
  count,
  className,
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={cn("rounded-lg overflow-hidden shadow-soft", className)}>
      {/* Header */}
      <button
        onClick={() => collapsible && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-4 text-white transition-all",
          gradientClasses[gradient] || gradientClasses.default,
          collapsible && "cursor-pointer hover:opacity-90"
        )}
        disabled={!collapsible}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5" />}
          <h2 className="text-lg font-semibold">{title}</h2>
          {count !== undefined && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
              {count}
            </span>
          )}
        </div>

        {collapsible && (
          <div className="transition-transform duration-200">
            {isOpen ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </div>
        )}
      </button>

      {/* Content */}
      <div
        className={cn(
          "bg-white dark:bg-surface-900 transition-all duration-200",
          isOpen ? "opacity-100" : "hidden opacity-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default CategorySection;
