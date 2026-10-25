'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataRepo, Company, CompanyMonthlyReport } from '@/lib/data-service';
import { Vehicle } from '@/types/database';
import { MoveIQSearchBar } from '@/components/moveiq/MoveIQSearchBar';
import { MoveIQDarkCard } from '@/components/moveiq/MoveIQDarkCard';
import { VehicleDetailView } from '@/components/dashboard/VehicleDetailView';
import {
  Building2,
  Truck,
  IndianRupee,
  Calendar,
  Pencil,
  Plus,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  X,
  AlertCircle,
  Phone,
  Fuel,
  Receipt,
  Wrench,
  Layers,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { triggerExcelDownload } from '@/lib/utils/download-excel';

export function CompaniesListView() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [companyReport, setCompanyReport] = useState<CompanyMonthlyReport | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // If a vehicle is tapped from company detail view
  const [drilldownVehicleId, setDrilldownVehicleId] = useState<string | null>(null);

  // Add Company Modal
  const [isAddCompOpen, setIsAddCompOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addContact, setAddContact] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Rename / Edit Company Modal
  const [editingComp, setEditingComp] = useState<Company | null>(null);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Move Vehicle Modal
  const [movingVehicle, setMovingVehicle] = useState<Vehicle | null>(null);
  const [targetCompId, setTargetCompId] = useState('');
  const [isMovingVehicle, setIsMovingVehicle] = useState(false);

  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  const showSavedNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleDownloadExcel = async () => {
    if (!companyReport) return;
    setIsDownloadingExcel(true);
    try {
      await triggerExcelDownload('company', companyReport, selectedMonth);
      showSavedNotice('Company Excel report downloaded!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to download Excel file');
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const list = await dataRepo.getCompanies();
      setCompanies(list);
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanyDetail = async (cId: string, month: string) => {
    setIsLoading(true);
    try {
      const rep = await dataRepo.getCompanyMonthlyReport(cId, month);
      setCompanyReport(rep);
    } catch (err) {
      console.error('Failed to load company report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    const unsub = dataRepo.subscribe(() => {
      loadCompanies();
      if (selectedCompanyId) {
        loadCompanyDetail(selectedCompanyId, selectedMonth);
      }
    });
    const interval = setInterval(() => {
      loadCompanies();
      if (selectedCompanyId) {
        loadCompanyDetail(selectedCompanyId, selectedMonth);
      }
    }, 4000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [selectedCompanyId, selectedMonth]);

  useEffect(() => {
    if (selectedCompanyId) {
      loadCompanyDetail(selectedCompanyId, selectedMonth);
    }
  }, [selectedCompanyId, selectedMonth]);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!addName.trim()) {
      setAddError('Company name is required');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await dataRepo.createCompany({
        name: addName.trim(),
        contact_person: addContact.trim() || undefined,
        contact_phone: addPhone.trim() || undefined,
      });
      setIsAddCompOpen(false);
      setAddName('');
      setAddContact('');
      setAddPhone('');
      showSavedNotice('Company created successfully!');
      await loadCompanies();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add company');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleOpenEdit = (c: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingComp(c);
    setEditName(c.name);
    setEditContact(c.contact_person || '');
    setEditPhone(c.contact_phone || '');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComp) return;
    setEditError(null);
    setIsSubmittingEdit(true);
    try {
      await dataRepo.updateCompany(editingComp.id, {
        name: editName.trim(),
        contact_person: editContact.trim() || undefined,
        contact_phone: editPhone.trim() || undefined,
      });
      setEditingComp(null);
      showSavedNotice('Company details saved!');
      await loadCompanies();
      if (selectedCompanyId === editingComp.id) {
        await loadCompanyDetail(editingComp.id, selectedMonth);
      }
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update company');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleOpenMoveVehicle = (v: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    setMovingVehicle(v);
    setTargetCompId(v.company_id || companies[0]?.id || '');
  };

  const handleSaveMoveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingVehicle || !targetCompId) return;

    setIsMovingVehicle(true);
    try {
      await dataRepo.updateVehicle(movingVehicle.id, {
        company_id: targetCompId,
      });
      setMovingVehicle(null);
      showSavedNotice(`Vehicle ${movingVehicle.registration_number} moved successfully!`);
      if (selectedCompanyId) {
        await loadCompanyDetail(selectedCompanyId, selectedMonth);
      }
      await loadCompanies();
    } catch (err) {
      console.error('Failed to move vehicle:', err);
    } finally {
      setIsMovingVehicle(false);
    }
  };

  // If viewing drilldown vehicle detail:
  if (drilldownVehicleId) {
    return (
      <VehicleDetailView
        vehicleQuery={drilldownVehicleId}
        initialMonth={selectedMonth}
        onBack={() => setDrilldownVehicleId(null)}
      />
    );
  }

  // =========================================================================
  // VIEW B: COMPANY DETAIL VIEW
  // =========================================================================
  if (selectedCompanyId && companyReport) {
    const isProfit = companyReport.profitOrLoss >= 0;

    return (
      <div className="space-y-4 pb-20">
        {/* Top Bar: Back & Month selector */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSelectedCompanyId(null)}
            className="w-11 h-11 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            aria-label="Back to companies"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Month Selector Pill */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200/80 px-3.5 py-2 rounded-full shadow-2xs">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#121316] focus:outline-none cursor-pointer"
            >
              <option value="2026-10">October 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Download Excel Button */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isDownloadingExcel}
              className="h-11 px-3 sm:px-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center gap-1.5 text-xs font-bold text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
              title="Download company Excel report for this month"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">{isDownloadingExcel ? 'Exporting...' : 'Download Excel'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleOpenEdit(companyReport.company, e)}
              className="w-11 h-11 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
              aria-label="Edit company"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </div>

        {savedNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* Company Header Card */}
        <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-600 mb-1 inline-block">
                Client Company
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#121316] tracking-tight">
                {companyReport.company.name}
              </h1>
              {companyReport.company.contact_person && (
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Contact: {companyReport.company.contact_person}
                  {companyReport.company.contact_phone && ` • ${companyReport.company.contact_phone}`}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs font-bold bg-[#121316] text-white px-2.5 py-1 rounded-full">
                {companyReport.vehiclesCount} Vehicles
              </span>
              {companyReport.activeTripsCount > 0 && (
                <p className="text-[10px] text-emerald-600 font-bold mt-1">
                  ● {companyReport.activeTripsCount} on road
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Big Company Financial Summary Card */}
        <MoveIQDarkCard
          title="Company Performance"
          subtitle={`Aggregated totals for all contract vehicles (${selectedMonth})`}
        >
          <div className="space-y-4 pt-1">
            {/* Big Net Result Banner */}
            <div
              className={`p-4 rounded-2xl flex items-center justify-between gap-3 ${
                isProfit
                  ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-950/70 border border-rose-500/40 text-rose-400'
              }`}
            >
              <div>
                <p className="text-xs uppercase tracking-wider font-extrabold text-gray-400">
                  Company Net {isProfit ? 'PROFIT' : 'LOSS'}
                </p>
                <p className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                  {isProfit ? '+' : '-'} ₹{Math.abs(companyReport.profitOrLoss).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                {isProfit ? (
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-rose-400" />
                )}
              </div>
            </div>

            {/* Income & Expense Breakdown */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#1E1F24] rounded-2xl p-3.5">
                <span className="text-[11px] font-medium text-gray-400 block">Total Income</span>
                <p className="text-lg font-black text-white mt-0.5">
                  ₹{companyReport.totalIncome.toLocaleString()}
                </p>
              </div>

              <div className="bg-[#1E1F24] rounded-2xl p-3.5">
                <span className="text-[11px] font-medium text-gray-400 block">Total Expenses</span>
                <p className="text-lg font-black text-rose-300 mt-0.5">
                  ₹{companyReport.totalExpenses.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </MoveIQDarkCard>

        {/* Vehicles Running Under That Company */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold text-[#121316] uppercase tracking-wider">
              Vehicles Under Contract ({companyReport.vehicles.length})
            </h2>
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isDownloadingExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[#121316] text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isDownloadingExcel ? 'Exporting...' : 'Download Excel'}</span>
            </button>
          </div>

          {companyReport.vehicles.length === 0 ? (
            <div className="bg-white rounded-[28px] p-6 text-center text-gray-400 border border-gray-100">
              <p className="text-sm font-semibold">No vehicles currently assigned to this company.</p>
            </div>
          ) : (
            companyReport.vehicles.map((item) => {
              const vIsProfit = item.profitOrLoss >= 0;

              return (
                <div
                  key={item.vehicle.id}
                  onClick={() => setDrilldownVehicleId(item.vehicle.id)}
                  className="bg-white rounded-[26px] p-4 sm:p-5 border border-gray-100 shadow-2xs hover:shadow-xs transition-all cursor-pointer group active:scale-[0.99] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#121316] text-white flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-[#121316] text-base tracking-tight">
                          {item.vehicle.registration_number}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                          {item.vehicle.make_model}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleOpenMoveVehicle(item.vehicle, e)}
                        className="px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold transition-colors cursor-pointer"
                        title="Move to another company"
                      >
                        Move
                      </button>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  {/* Expense Breakdown for this vehicle */}
                  <div className="grid grid-cols-4 gap-1.5 bg-[#F8F9FA] p-2.5 rounded-2xl text-center text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Fuel</span>
                      <p className="font-bold text-[#121316] mt-0.5">₹{item.fuelExpense.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Toll</span>
                      <p className="font-bold text-[#121316] mt-0.5">₹{item.tollExpense.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Repair</span>
                      <p className="font-bold text-[#121316] mt-0.5">₹{item.maintenanceExpense.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Total Exp</span>
                      <p className="font-black text-rose-600 mt-0.5">₹{item.totalExpense.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Income and Profit/Loss bar */}
                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <span className="text-gray-500 font-medium">
                      Income: <strong className="text-gray-900 font-bold">₹{item.income.toLocaleString()}</strong>
                    </span>
                    <span
                      className={`font-black px-2.5 py-0.5 rounded-full text-[11px] ${
                        vIsProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {vIsProfit ? '+' : '-'} ₹{Math.abs(item.profitOrLoss).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Move Vehicle Modal */}
        {movingVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-[#121316]">
                  Move Vehicle to Company
                </h3>
                <button
                  type="button"
                  onClick={() => setMovingVehicle(null)}
                  className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Move <strong className="text-gray-900">{movingVehicle.registration_number}</strong> to another client contract.
              </p>

              <form onSubmit={handleSaveMoveVehicle} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Select New Company
                  </label>
                  <select
                    value={targetCompId}
                    onChange={(e) => setTargetCompId(e.target.value)}
                    className="w-full h-12 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400 cursor-pointer"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMovingVehicle(null)}
                    className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isMovingVehicle}
                    className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                  >
                    {isMovingVehicle ? 'Moving...' : 'Confirm Move'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW A: COMPANIES LIST VIEW
  // =========================================================================
  const filtered = companies.filter((c) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return c.name.toLowerCase().includes(q) || (c.contact_person || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Search Bar with '+' Add Company Button */}
      <MoveIQSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search company or client contract..."
        onPlusClick={() => setIsAddCompOpen(true)}
      />

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-[#121316] text-white rounded-[28px] p-5 border border-stone-800 shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#D4F65B] uppercase tracking-wider">
            Corporate Fleet Contracts
          </span>
          <span className="text-xs font-bold text-gray-400">
            {companies.length} Companies
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Client Companies
        </h1>
        <p className="text-xs text-gray-400 leading-relaxed">
          Manage client contracts, track monthly vehicle income, and evaluate contract profitability.
        </p>
      </div>

      {/* Companies List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-[28px] p-8 text-center text-gray-400 border border-gray-100 shadow-2xs">
            <Building2 className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-600">No companies found.</p>
            <p className="text-xs text-gray-400 mt-1">Tap &apos;+&apos; to add a new corporate contract.</p>
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedCompanyId(c.id)}
              className="bg-white rounded-[26px] p-4 sm:p-5 border border-gray-100 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#121316] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                  <Building2 className="w-6 h-6 text-[#D4F65B]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-[#121316] text-base tracking-tight truncate">
                    {c.name}
                  </h3>
                  {c.contact_person ? (
                    <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                      {c.contact_person} {c.contact_phone && `• ${c.contact_phone}`}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">Fleet operations</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleOpenEdit(c, e)}
                  className="p-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Rename or edit company"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-black group-hover:translate-x-0.5 transition-all ml-1" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Company Modal */}
      {isAddCompOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Add Client Company
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCompOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddCompany} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amazon Transportation"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Contact Person (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Manager Name"
                  value={addContact}
                  onChange={(e) => setAddContact(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Contact Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543300"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCompOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  {isSubmittingAdd ? 'Adding...' : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Rename Company Modal */}
      {editingComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#121316]">
                Rename / Edit Company
              </h3>
              <button
                type="button"
                onClick={() => setEditingComp(null)}
                className="p-1 rounded-full text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Company Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-[#121316] focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingComp(null)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-1 h-11 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
