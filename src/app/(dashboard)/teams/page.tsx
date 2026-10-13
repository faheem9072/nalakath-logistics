'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { dataRepo } from '@/lib/data-service';
import { Team } from '@/types/database';
import { Plus, Building2, Phone, User } from 'lucide-react';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [billingNotes, setBillingNotes] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTeams = async () => {
    setIsLoading(true);
    try {
      const list = await dataRepo.getTeams();
      setTeams(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);
    try {
      await dataRepo.createTeam({
        name: name.trim(),
        contact_person: contactPerson.trim() || null,
        contact_phone: contactPhone.trim() || null,
        billing_notes: billingNotes.trim() || null,
        is_active: true,
      });
      setIsAddOpen(false);
      setName('');
      setContactPerson('');
      setContactPhone('');
      setBillingNotes('');
      loadTeams();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Corporate Teams & Clients"
      subtitle="Corporate transport contracts, business departments, and client billing contacts."
      action={
        <Button
          variant="primary"
          onClick={() => setIsAddOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Client / Team
        </Button>
      }
    >
      {isLoading ? (
        <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
          Loading teams...
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500 text-sm">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No teams registered yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active Client
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{t.name}</h3>
                  {t.billing_notes && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {t.billing_notes}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  {t.contact_person && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.contact_person}</span>
                    </div>
                  )}
                  {t.contact_phone && (
                    <div className="flex items-center gap-2 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.contact_phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Team Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Corporate Client / Team"
        description="Add a new client account to associate with routes and daily duty allocations."
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {modalError && <Alert variant="danger">{modalError}</Alert>}

          <Input
            label="Client / Team Name"
            placeholder="E.g., Metro Tech Campus"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Person"
              placeholder="Sunil Menon"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
            <Input
              label="Contact Phone"
              placeholder="+919876543210"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <Input
            label="Billing & Operational Notes"
            placeholder="E.g., Monthly invoice due 5th, AC buses required..."
            value={billingNotes}
            onChange={(e) => setBillingNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Client
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
