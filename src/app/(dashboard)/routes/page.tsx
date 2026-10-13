'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { dataRepo } from '@/lib/data-service';
import { Route, Team } from '@/types/database';
import { Plus, MapPin, Clock, ArrowRight, Pencil } from 'lucide-react';

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState('25.0');
  const [duration, setDuration] = useState('45');
  const [teamId, setTeamId] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editOrigin, setEditOrigin] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editDistance, setEditDistance] = useState('25.0');
  const [editDuration, setEditDuration] = useState('45');
  const [editTeamId, setEditTeamId] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rList, tList] = await Promise.all([
        dataRepo.getRoutes(),
        dataRepo.getTeams(),
      ]);
      setRoutes(rList);
      setTeams(tList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (r: Route) => {
    setEditingRoute(r);
    setEditCode(r.code);
    setEditName(r.name);
    setEditOrigin(r.origin);
    setEditDestination(r.destination);
    setEditDistance(r.planned_distance_km.toString());
    setEditDuration(r.estimated_duration_minutes?.toString() || '');
    setEditTeamId(r.team_id || '');
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;
    setEditError(null);
    setIsEditSubmitting(true);
    try {
      await dataRepo.updateRoute(editingRoute.id, {
        code: editCode.trim().toUpperCase(),
        name: editName.trim(),
        origin: editOrigin.trim(),
        destination: editDestination.trim(),
        planned_distance_km: parseFloat(editDistance) || 0,
        estimated_duration_minutes: parseInt(editDuration) || null,
        team_id: editTeamId || null,
      });
      setEditingRoute(null);
      loadData();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update route');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);
    try {
      await dataRepo.createRoute({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        planned_distance_km: parseFloat(distance) || 0,
        estimated_duration_minutes: parseInt(duration) || null,
        team_id: teamId || null,
        is_active: true,
      });
      setIsAddOpen(false);
      setCode('');
      setName('');
      setOrigin('');
      setDestination('');
      loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to create route');
    } finally {
      setIsSubmitting(false);
    }
  };

  const teamsMap = new Map(teams.map((t) => [t.id, t.name]));

  return (
    <PageContainer
      title="Fleet Transport Corridors & Routes"
      subtitle="Standardized origins, destinations, distances, and duration benchmarks."
      action={
        <Button
          variant="primary"
          onClick={() => setIsAddOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Route
        </Button>
      }
    >
      {isLoading ? (
        <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
          Loading routes...
        </div>
      ) : routes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500 text-sm">
            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No routes configured yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {routes.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    {r.code}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{r.estimated_duration_minutes || '—'} min</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{r.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <span>{r.origin}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{r.destination}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-mono font-bold text-slate-900">
                    {r.planned_distance_km} km
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">
                      {r.team_id ? teamsMap.get(r.team_id) || 'Client Route' : 'Internal Route'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs py-0.5 px-2 h-7"
                      onClick={() => handleOpenEdit(r)}
                      leftIcon={<Pencil className="w-3 h-3" />}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Route Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create Transit Route"
        description="Define a route corridor with distance benchmark for driver assignments."
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {modalError && <Alert variant="danger">{modalError}</Alert>}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Route Code"
              placeholder="RT-WEST-05"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              autoFocus
            />
            <Input
              label="Route Name"
              placeholder="Depot to Tech Park Loop"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Origin"
              placeholder="Central Terminal"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              required
            />
            <Input
              label="Destination"
              placeholder="Infopark Phase 2"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Planned Distance (km)"
              type="number"
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              required
            />
            <Input
              label="Estimated Duration (minutes)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Associated Client / Team (Optional)
            </label>
            <Select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <option value="">General Logistics</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>

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
              Save Route
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Route Modal */}
      <Modal
        isOpen={!!editingRoute}
        onClose={() => setEditingRoute(null)}
        title="Edit Transit Route Corridor"
        description="Modify route corridor code, checkpoints, distance, and duration specifications."
        maxWidth="md"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {editError && <Alert variant="danger">{editError}</Alert>}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Route Code"
              placeholder="RT-WEST-05"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value.toUpperCase())}
              required
            />
            <Input
              label="Route Name"
              placeholder="West Coast Loop"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Origin Checkpoint"
              placeholder="Central Depot"
              value={editOrigin}
              onChange={(e) => setEditOrigin(e.target.value)}
              required
            />
            <Input
              label="Destination Checkpoint"
              placeholder="Port Terminal Gate"
              value={editDestination}
              onChange={(e) => setEditDestination(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Planned Distance (km)"
              type="number"
              step="0.1"
              value={editDistance}
              onChange={(e) => setEditDistance(e.target.value)}
              required
            />
            <Input
              label="Estimated Duration (minutes)"
              type="number"
              value={editDuration}
              onChange={(e) => setEditDuration(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Associated Client / Team (Optional)
            </label>
            <Select
              value={editTeamId}
              onChange={(e) => setEditTeamId(e.target.value)}
            >
              <option value="">General Logistics (Internal)</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingRoute(null)}
              disabled={isEditSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isEditSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
