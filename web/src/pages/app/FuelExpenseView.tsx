// ==============================================================================
// LogiSphere AI — Fuel & Expense Accounting View
// Fuel purchase logs, operational expenses, and audit-ready PDF export
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Fuel,
  Receipt,
  Plus,
  RefreshCw,
  Download,
  X,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { fuelExpenseService } from '../../services/fuelExpenseService';
import { fleetService } from '../../services/fleetService';
import type { FuelLog, ExpenseRecord, Vehicle } from '../../types';
import { hasPermission, Permission } from '../../utils/rbac';
import { Loader } from '../../components/Loader';

export const FuelExpenseView: React.FC = () => {
  const { user } = useAuth();
  const canCreateFuel = hasPermission(user?.role, Permission.FUEL_CREATE);
  const canCreateExpense = hasPermission(user?.role, Permission.EXPENSES_CREATE);
  const canExport = hasPermission(user?.role, Permission.FUEL_EXPORT) || hasPermission(user?.role, Permission.EXPENSES_EXPORT);

  const [activeTab, setActiveTab] = useState<'fuel' | 'expenses'>('fuel');
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fuel Form Fields
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelLiters, setFuelLiters] = useState('120');
  const [fuelCost, setFuelCost] = useState('360');
  const [fuelOdo, setFuelOdo] = useState('145000');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().slice(0, 10));

  // Expense Form Fields
  const [expVehicleId, setExpVehicleId] = useState('');
  const [expToll, setExpToll] = useState('45');
  const [expMaint, setExpMaint] = useState('0');
  const [expOther, setExpOther] = useState('15');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fData, eData, vData] = await Promise.all([
        fuelExpenseService.getFuelLogs(),
        fuelExpenseService.getExpenses(),
        fleetService.getVehicles(),
      ]);
      setFuelLogs(fData);
      setExpenses(eData);
      setVehicles(vData);
      if (vData.length > 0) {
        if (!fuelVehicleId) setFuelVehicleId(vData[0].vehicleID || vData[0].id);
        if (!expVehicleId) setExpVehicleId(vData[0].vehicleID || vData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load fuel and expense data', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await fuelExpenseService.createFuelLog({
        vehicleID: fuelVehicleId,
        liters: Number(fuelLiters) || 0,
        cost: Number(fuelCost) || 0,
        odometer: Number(fuelOdo) || undefined,
        date: fuelDate,
      });
      setShowFuelModal(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save fuel log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await fuelExpenseService.createExpense({
        vehicleID: expVehicleId,
        toll: Number(expToll) || 0,
        maint: Number(expMaint) || 0,
        other: Number(expOther) || 0,
      });
      setShowExpenseModal(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob =
        activeTab === 'fuel'
          ? await fuelExpenseService.exportFuelPdf()
          : await fuelExpenseService.exportExpensesPdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}-ledger-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to export PDF');
    }
  };

  const totalFuelCost = fuelLogs.reduce((s, f) => s + (f.cost || 0), 0);
  const totalLiters = fuelLogs.reduce((s, f) => s + (f.liters || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.total || 0), 0);

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Fuel & Operational Expenses
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Fuel refill telemetry, toll/maint disbursements, and tax-ready PDF accounting.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchData}
            className="btn-secondary"
            disabled={loading}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canExport && (
            <button type="button" onClick={handleExport} className="btn-secondary">
              <Download size={15} />
              <span>Export {activeTab === 'fuel' ? 'Fuel' : 'Expense'} PDF</span>
            </button>
          )}

          {activeTab === 'fuel' && canCreateFuel && (
            <button type="button" onClick={() => setShowFuelModal(true)} className="btn-primary">
              <Plus size={16} />
              <span>Log Fuel Refill</span>
            </button>
          )}

          {activeTab === 'expenses' && canCreateExpense && (
            <button type="button" onClick={() => setShowExpenseModal(true)} className="btn-primary">
              <Plus size={16} />
              <span>Record Expense</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '0.75rem 1rem', borderRadius: 8, color: '#991B1B', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Fuel Purchases</span>
          <div className="kpi-value" style={{ color: '#111827' }}>
            ${totalFuelCost.toLocaleString()}
          </div>
          <span className="kpi-meta">{fuelLogs.length} logged fill-ups</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Total Fuel Volume</span>
          <div className="kpi-value" style={{ color: '#F59E0B' }}>
            {totalLiters.toLocaleString()} L
          </div>
          <span className="kpi-meta">Across active commercial fleet</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Disbursements & Expenses</span>
          <div className="kpi-value" style={{ color: '#3B82F6' }}>
            ${totalExpenses.toLocaleString()}
          </div>
          <span className="kpi-meta">Tolls, maintenance, and fees</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('fuel')}
          className={`btn-secondary ${activeTab === 'fuel' ? 'active' : ''}`}
          style={{
            background: activeTab === 'fuel' ? '#FEF3C7' : '#FFFFFF',
            borderColor: activeTab === 'fuel' ? '#FDE68A' : '#D1D5DB',
            color: activeTab === 'fuel' ? '#B45309' : '#374151',
            fontWeight: 700,
          }}
        >
          <Fuel size={16} />
          <span>Fuel Refill Logs ({fuelLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`btn-secondary ${activeTab === 'expenses' ? 'active' : ''}`}
          style={{
            background: activeTab === 'expenses' ? '#FEF3C7' : '#FFFFFF',
            borderColor: activeTab === 'expenses' ? '#FDE68A' : '#D1D5DB',
            color: activeTab === 'expenses' ? '#B45309' : '#374151',
            fontWeight: 700,
          }}
        >
          <Receipt size={16} />
          <span>Expense Disbursements ({expenses.length})</span>
        </button>
      </div>

      {/* Fuel Logs Table */}
      {activeTab === 'fuel' && (
        <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Vehicle</th>
                  <th>Date</th>
                  <th>Liters</th>
                  <th>Total Cost</th>
                  <th>Odometer</th>
                </tr>
              </thead>
              <tbody>
                {fuelLogs.length > 0 ? (
                  fuelLogs.map((log) => {
                    const id = log.fuelLogId || log.id;
                    const v = vehicles.find((veh) => (veh.vehicleID || veh.id) === log.vehicleID);
                    return (
                      <tr key={id}>
                        <td className="ops-mono" style={{ fontWeight: 700, color: '#B45309' }}>
                          #{id.slice(0, 8)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#111827' }}>
                            {v ? v.name : `Vehicle #${log.vehicleID}`}
                          </div>
                        </td>
                        <td className="ops-mono">{log.date}</td>
                        <td style={{ fontWeight: 600 }}>{log.liters} L</td>
                        <td style={{ fontWeight: 700 }}>${log.cost.toLocaleString()}</td>
                        <td className="ops-mono">{log.odometer ? `${log.odometer.toLocaleString()} km` : 'N/A'}</td>
                      </tr>
                    );
                  })
                ) : loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                      <Loader inline text="Loading fuel refill logs..." size="medium" />
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6B7280' }}>
                      No fuel refill logs recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      {activeTab === 'expenses' && (
        <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Expense ID</th>
                  <th>Vehicle</th>
                  <th>Toll</th>
                  <th>Maintenance</th>
                  <th>Other Fees</th>
                  <th>Total Disbursement</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length > 0 ? (
                  expenses.map((exp) => {
                    const id = exp.expenseId || exp.id;
                    const v = vehicles.find((veh) => (veh.vehicleID || veh.id) === exp.vehicleID);
                    return (
                      <tr key={id}>
                        <td className="ops-mono" style={{ fontWeight: 700, color: '#B45309' }}>
                          #{id.slice(0, 8)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#111827' }}>
                            {v ? v.name : `Vehicle #${exp.vehicleID}`}
                          </div>
                        </td>
                        <td>${exp.toll.toLocaleString()}</td>
                        <td>${exp.maint.toLocaleString()}</td>
                        <td>${exp.other.toLocaleString()}</td>
                        <td style={{ fontWeight: 800, color: '#065F46' }}>
                          ${exp.total.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                ) : loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                      <Loader inline text="Loading expense disbursements..." size="medium" />
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6B7280' }}>
                      No expense disbursements recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Fuel Modal */}
      {showFuelModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Log Commercial Fuel Fill-Up
              </h2>
              <button
                type="button"
                onClick={() => setShowFuelModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '0.65rem 0.85rem', borderRadius: 8, color: '#991B1B', marginBottom: '1rem', fontSize: '0.8rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateFuel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Commercial Vehicle *
                </label>
                <select
                  value={fuelVehicleId}
                  onChange={(e) => setFuelVehicleId(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem', background: '#FFFFFF' }}
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicleID || v.id} value={v.vehicleID || v.id}>
                      {v.name} ({v.registrationNumber || v.reg || 'Reg'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Volume (Liters) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Total Cost ($) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Odometer at Pump
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={fuelOdo}
                    onChange={(e) => setFuelOdo(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={fuelDate}
                    onChange={(e) => setFuelDate(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #F3F4F6', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setShowFuelModal(false)} className="btn-secondary" disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Record Fuel Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Record Operational Expense
              </h2>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '0.65rem 0.85rem', borderRadius: 8, color: '#991B1B', marginBottom: '1rem', fontSize: '0.8rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Commercial Vehicle *
                </label>
                <select
                  value={expVehicleId}
                  onChange={(e) => setExpVehicleId(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem', background: '#FFFFFF' }}
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicleID || v.id} value={v.vehicleID || v.id}>
                      {v.name} ({v.registrationNumber || v.reg || 'Reg'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Toll Fee ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={expToll}
                    onChange={(e) => setExpToll(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Maintenance ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={expMaint}
                    onChange={(e) => setExpMaint(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Other Fees ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={expOther}
                    onChange={(e) => setExpOther(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #F3F4F6', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn-secondary" disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
