import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Heart,
  ShoppingCart,
  Package,
  CheckCircle,
  ExternalLink,
  Trash2,
  Edit2,
  DollarSign,
  Cpu,
  Wrench,
  Megaphone,
  Shield,
  Trophy,
  Laptop,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import ThemeToggle from '../components/dashboard/ThemeToggle';
import { useWishlist, useDeleteWishlistItem } from '../hooks/useWishlist';
import { useAuth } from '../context/AuthContext';
import AddWishlistModal from '../components/wishlist/AddWishlistModal';
import { cn } from '../lib/utils';

const priorityColors = {
  Low: 'bg-surface-500',
  Medium: 'bg-yellow-500',
  High: 'bg-orange-500',
  Critical: 'bg-red-500',
};

const statusConfig = {
  Wanted: { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  Ordered: { icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  Shipped: { icon: Package, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  Received: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
};

const sectionConfig = {
  'Parts & Hardware': {
    icon: Wrench,
    color: 'from-blue-500 to-blue-600',
    description: 'Robot parts, mechanical components, fasteners',
  },
  'Electronics': {
    icon: Cpu,
    color: 'from-purple-500 to-purple-600',
    description: 'Motors, sensors, controllers, wiring',
  },
  'Tools & Equipment': {
    icon: Wrench,
    color: 'from-amber-500 to-amber-600',
    description: 'Power tools, hand tools, workbench items',
  },
  'Software & Tech': {
    icon: Laptop,
    color: 'from-cyan-500 to-cyan-600',
    description: 'CAD software, licenses, computers',
  },
  'Business & Marketing': {
    icon: Megaphone,
    color: 'from-pink-500 to-rose-600',
    description: 'Team apparel, banners, outreach materials',
  },
  'Safety & Workspace': {
    icon: Shield,
    color: 'from-green-500 to-green-600',
    description: 'Safety gear, storage, organization',
  },
  'Competition & Travel': {
    icon: Trophy,
    color: 'from-orange-500 to-orange-600',
    description: 'Pit supplies, cases, travel gear',
  },
};

export function Wishlist() {
  const { data: wishlistItems = [], isLoading } = useWishlist();
  const deleteItem = useDeleteWishlistItem();
  const { isAdmin } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [defaultSection, setDefaultSection] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  // Filter items
  const filteredItems = wishlistItems.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  // Group by section
  const sectionNames = Object.keys(sectionConfig);
  const groupedBySection = sectionNames.reduce((acc, section) => {
    acc[section] = filteredItems.filter(i => i.section === section);
    return acc;
  }, {});

  // Add uncategorized items
  const uncategorized = filteredItems.filter(i => !i.section || !sectionNames.includes(i.section));

  // Group by status for stats
  const statusGroups = {
    Wanted: wishlistItems.filter(i => i.status === 'Wanted'),
    Ordered: wishlistItems.filter(i => i.status === 'Ordered'),
    Shipped: wishlistItems.filter(i => i.status === 'Shipped'),
    Received: wishlistItems.filter(i => i.status === 'Received'),
  };

  // Calculate totals
  const totalEstimated = wishlistItems
    .filter(i => i.status !== 'Received')
    .reduce((sum, i) => sum + (i.estimated_cost || 0), 0);

  const handleAddToSection = (section) => {
    setDefaultSection(section);
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setDefaultSection(item.section || null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setDefaultSection(null);
  };

  const renderItemCard = (item) => {
    const StatusIcon = statusConfig[item.status]?.icon || Heart;
    const statusColor = statusConfig[item.status]?.color || 'text-surface-500';
    const statusBg = statusConfig[item.status]?.bg || 'bg-surface-500/10';

    return (
      <Card key={item.id} className="group relative overflow-hidden">
        <CardContent className="p-4">
          {/* Status Badge */}
          <div className="mb-3 flex items-center justify-between">
            <div className={cn('flex items-center gap-2 rounded-full px-3 py-1', statusBg)}>
              <StatusIcon className={cn('h-4 w-4', statusColor)} />
              <span className={cn('text-sm font-medium', statusColor)}>
                {item.status}
              </span>
            </div>
            {item.priority && (
              <div className="flex items-center gap-1.5">
                <div className={cn('h-2 w-2 rounded-full', priorityColors[item.priority])} />
                <span className="text-xs text-surface-500">{item.priority}</span>
              </div>
            )}
          </div>

          {/* Item Name */}
          <h3 className="mb-2 text-lg font-semibold text-surface-900 dark:text-surface-100">
            {item.name}
          </h3>

          {/* Description */}
          {item.description && (
            <p className="mb-3 line-clamp-2 text-sm text-surface-600 dark:text-surface-400">
              {item.description}
            </p>
          )}

          {/* Cost & Link Row */}
          <div className="mb-3 flex items-center justify-between">
            {item.estimated_cost > 0 && (
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                ${item.estimated_cost.toLocaleString()}
              </span>
            )}
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <ExternalLink className="h-3 w-3" />
                View
              </a>
            )}
          </div>

          {/* Notes */}
          {item.notes && (
            <p className="mb-3 rounded bg-surface-100 p-2 text-xs text-surface-600 dark:bg-surface-800 dark:text-surface-400">
              {item.notes}
            </p>
          )}

          {/* Actions */}
          {isAdmin && (
            <div className="flex gap-2 border-t border-surface-200 pt-3 dark:border-surface-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(item)}
                className="flex-1"
              >
                <Edit2 className="mr-1 h-3 w-3" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item.id)}
                className="flex-1 text-red-500 hover:text-red-600"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-surface-600 dark:text-surface-400">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-600">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-surface-900 dark:text-surface-100">
                  Wishlist
                </h1>
                <p className="text-xs text-surface-500">Track items you want to acquire</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAdmin && (
              <Button onClick={() => setShowAddModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Item</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pink-500/10">
                <Heart className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Wanted</p>
                <p className="text-2xl font-bold">{statusGroups.Wanted.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <ShoppingCart className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Ordered</p>
                <p className="text-2xl font-bold">{statusGroups.Ordered.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Received</p>
                <p className="text-2xl font-bold">{statusGroups.Received.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <DollarSign className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Est. Remaining</p>
                <p className="text-2xl font-bold">${totalEstimated.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-800"
          >
            <option value="all">All Statuses</option>
            <option value="Wanted">Wanted</option>
            <option value="Ordered">Ordered</option>
            <option value="Shipped">Shipped</option>
            <option value="Received">Received</option>
          </select>
        </div>

        {/* Wishlist Sections */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : wishlistItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Heart className="mb-4 h-12 w-12 text-surface-300" />
              <h3 className="mb-2 text-lg font-medium text-surface-900 dark:text-surface-100">
                No items yet
              </h3>
              <p className="mb-4 text-center text-surface-500">
                Start adding items you want to acquire for your team.<br />
                Choose a section below to add your first item.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Sections Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sectionNames.map((sectionName) => {
            const config = sectionConfig[sectionName];
            const SectionIcon = config.icon;
            const items = groupedBySection[sectionName];
            const sectionTotal = items.reduce((sum, i) => sum + (i.estimated_cost || 0), 0);
            const wantedCount = items.filter(i => i.status === 'Wanted').length;
            const orderedCount = items.filter(i => i.status === 'Ordered' || i.status === 'Shipped').length;

            return (
              <Card
                key={sectionName}
                className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary-500/50"
                onClick={() => {
                  setSelectedSection(sectionName);
                }}
              >
                <CardContent className="p-0">
                  {/* Section Header */}
                  <div className={cn('flex items-center gap-3 p-4 bg-gradient-to-br', config.color)}>
                    <SectionIcon className="h-8 w-8 text-white" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{sectionName}</h3>
                      <p className="text-xs text-white/80">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {/* Section Stats */}
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="text-surface-500">Est. Cost</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        ${sectionTotal.toLocaleString()}
                      </span>
                    </div>

                    {/* Status breakdown */}
                    <div className="flex gap-2 text-xs">
                      {wantedCount > 0 && (
                        <span className="rounded-full bg-pink-500/10 px-2 py-1 text-pink-600 dark:text-pink-400">
                          {wantedCount} wanted
                        </span>
                      )}
                      {orderedCount > 0 && (
                        <span className="rounded-full bg-blue-500/10 px-2 py-1 text-blue-600 dark:text-blue-400">
                          {orderedCount} in progress
                        </span>
                      )}
                    </div>

                    {/* Add button for admins */}
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToSection(sectionName);
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add Item
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Selected Section Detail */}
        {selectedSection && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const config = sectionConfig[selectedSection];
                  const SectionIcon = config?.icon || Heart;
                  return (
                    <>
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br', config?.color || 'from-surface-400 to-surface-500')}>
                        <SectionIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">
                          {selectedSection}
                        </h2>
                        <p className="text-sm text-surface-500">{config?.description}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSection(null)}>
                Close
              </Button>
            </div>

            {groupedBySection[selectedSection]?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="mb-4 text-surface-500">No items in this section yet</p>
                  {isAdmin && (
                    <Button onClick={() => handleAddToSection(selectedSection)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Item
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groupedBySection[selectedSection]?.map(renderItemCard)}
              </div>
            )}
          </div>
        )}

        {/* Uncategorized Items */}
        {uncategorized.length > 0 && !selectedSection && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-surface-100">
              Other Items
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {uncategorized.map(renderItemCard)}
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      <AddWishlistModal
        open={showAddModal}
        onOpenChange={handleCloseModal}
        item={editingItem}
        defaultSection={defaultSection}
      />
    </div>
  );
}

export default Wishlist;
