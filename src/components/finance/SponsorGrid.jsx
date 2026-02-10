import React, { useState } from 'react';
import { Plus, Mail, Calendar, DollarSign, Building2, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Input, Textarea, Label } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useSponsors, useCreateSponsor, useUpdateSponsor, useDeleteSponsor, useSponsorStats } from '../../hooks/useSponsors';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, cn } from '../../lib/utils';

const statusVariants = {
  Pending: 'pending',
  Confirmed: 'inProgress',
  Received: 'completed',
};

const initialFormState = {
  name: '',
  amount: '',
  contact_email: '',
  status: 'Pending',
  notes: '',
};

export function SponsorGrid({ className }) {
  const { data: sponsors = [], isLoading } = useSponsors();
  const stats = useSponsorStats();
  const { isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [formData, setFormData] = useState(initialFormState);

  const createSponsor = useCreateSponsor();
  const updateSponsor = useUpdateSponsor();
  const deleteSponsor = useDeleteSponsor();

  const handleOpenModal = (sponsor = null) => {
    if (sponsor) {
      setEditingSponsor(sponsor);
      setFormData({
        name: sponsor.name,
        amount: sponsor.amount.toString(),
        contact_email: sponsor.contact_email || '',
        status: sponsor.status,
        notes: sponsor.notes || '',
      });
    } else {
      setEditingSponsor(null);
      setFormData(initialFormState);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      date_received: formData.status === 'Received' ? new Date().toISOString() : null,
    };

    try {
      if (editingSponsor) {
        await updateSponsor.mutateAsync({ id: editingSponsor.id, data });
      } else {
        await createSponsor.mutateAsync(data);
      }
      setShowModal(false);
    } catch (error) {
      console.error('Failed to save sponsor:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this sponsor?')) {
      try {
        await deleteSponsor.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete sponsor:', error);
      }
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className={cn("p-6", className)}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 md:p-6", className)}>
      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Total Sponsors</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900">
                <Building2 className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Pending</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.pendingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Confirmed</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.confirmedAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Received</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.receivedAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sponsors ({sponsors.length})</h3>
        {isAdmin && (
          <Button onClick={() => handleOpenModal()} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Add Sponsor
          </Button>
        )}
      </div>

      {/* Sponsor Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sponsors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-surface-500">
            No sponsors yet. {isAdmin && 'Click "Add Sponsor" to add one.'}
          </div>
        ) : (
          sponsors.map(sponsor => (
            <Card key={sponsor.id} className="relative">
              <CardContent className="p-4">
                {isAdmin && (
                  <div className="absolute right-2 top-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenModal(sponsor)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(sponsor.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                <div className="mb-3 flex items-start gap-3">
                  <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900">
                    <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate pr-16">{sponsor.name}</h4>
                    <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      {formatCurrency(sponsor.amount)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {sponsor.contact_email && (
                    <div className="flex items-center gap-2 text-surface-500">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{sponsor.contact_email}</span>
                    </div>
                  )}
                  {sponsor.date_received && (
                    <div className="flex items-center gap-2 text-surface-500">
                      <Calendar className="h-4 w-4" />
                      <span>Received {formatDate(sponsor.date_received)}</span>
                    </div>
                  )}
                </div>

                {sponsor.notes && (
                  <p className="mt-3 text-sm text-surface-500 line-clamp-2">
                    {sponsor.notes}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
                  <Badge variant={statusVariants[sponsor.status]}>
                    {sponsor.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Enter company name..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($) *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => updateField('amount', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => updateField('contact_email', e.target.value)}
                placeholder="contact@company.com"
              />
            </div>

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
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSponsor ? 'Save Changes' : 'Add Sponsor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SponsorGrid;
