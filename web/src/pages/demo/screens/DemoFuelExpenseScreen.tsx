// ==============================================================================
// LogiSphere AI Demo — Fuel & Expense Accounting Screen
// 100% Symmetrical with FuelExpenseView.tsx in UI, theme, tabs, modals, and tables
// ==============================================================================

import React, { useState } from 'react';
import {
  Fuel,
  Receipt,
  Plus,
  RefreshCw,
  Download,
  X,
} from 'lucide-react';
import { MOCK_FUEL_LOGS, MOCK_EXPENSES } from '../data/fuel.mock';
import { MOCK_VEHICLES } from '../data/vehicles.mock';
import type { FuelLog, ExpenseRecord, Vehicle } from '../../../types';

export const DemoFuelExpenseScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fuel' | 'expenses'>('fuel');
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(() => [...MOCK_FUEL_LOGS]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => [...MOCK_EXPENSES]);
  const [vehicles] = useState<Vehicle[]>(() => [...MOCK_VEHICLES]);

  // Modal State
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Fuel Form Fields
  const [fuelVehicleId, setFuelVehicleId] = useState(vehicles[0]?.vehicleID || vehicles[0]?.id || '');
  const [fuelLiters, setFuelLiters] = useState('120');
  const [fuelCost, setFuelCost] = useState('12240');
  const [fuelOdo, setFuelOdo] = useState('182500');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().slice(0, 10));

  // Expense Form Fields
  const [expVehicleId, setExpVehicleId] = useState(vehicles[0]?.vehicleID || vehicles[0]?.id || '');
  const [expTrip, setExpTrip] = useState('Ahmedabad → Surat');
  const [expToll, setExpToll] = useState('450');
  const [expMaint, setExpMaint] = useState('0');
  const [expOther, setExpOther] = useState('150');

  const totalFuelCost = fuelLogs.reduce((sum, item) => sum + (item.cost || 0), 0);
  const totalLiters = fuelLogs.reduce((sum, item) => sum + (item.liters || 0), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + (item.total || 0), 0);

  const handleCreateFuel = (e: React.FormEvent) => {
    e.preventDefault();
    const v = vehicles.find((item) => (item.vehicleID || item.id) === fuelVehicleId);
    const newFuel: FuelLog = {
      id: `fuel-demo-${Date.now()}`,
      fuelLogId: `fuel-demo-${Date.now()}`,
      vehicleID: fuelVehicleId,
      vehicle: v?.name || fuelVehicleId,
      date: fuelDate,
      liters: Number(fuelLiters) || 0,
      cost: Number(fuelCost) || 0,
      odometer: Number(fuelOdo) || 0,
    };
    setFuelLogs((prev) => [newFuel, ...prev]);
    setShowFuelModal(false);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const v = vehicles.find((item) => (item.vehicleID || item.id) === expVehicleId);
    const toll = Number(expToll) || 0;
    const maint = Number(expMaint) || 0;
    const other = Number(expOther) || 0;

    const newExp: ExpenseRecord = {
      id: `exp-demo-${Date.now()}`,
      expenseId: `exp-demo-${Date.now()}`,
      vehicleID: expVehicleId,
      vehicle: v?.name || expVehicleId,
      trip: expTrip.trim(),
      toll,
      maint,
      other,
      total: toll + maint + other,
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [newExp, ...prev]);
    setShowExpenseModal(false);
  };

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
            onClick={() => { setFuelLogs([...MOCK_FUEL_LOGS]); setExpenses([...MOCK_EXPENSES]); }}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} />
            <span>Reset Demo Data</span>
          </button>

          <button
            type="button"
            onClick={() => alert('Exporting tax-compliant expense ledger PDF (demo simulation).')}
            className="btn-secondary"
          >
            <Download size={15} />
            <span>Export {activeTab === 'fuel' ? 'Fuel' : 'Expense'} PDF</span>
          </button>

          {activeTab === 'fuel' ? (
            <button type="button" onClick={() => setShowFuelModal(true)} className="btn-primary">
              <Plus size={16} />
              <span>Log Fuel Refill</span>
            </button>
          ) : (
            <button type="button" onClick={() => setShowExpenseModal(true)} className="btn-primary">
              <Plus size={16} />
              <span>Record Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Fuel Purchases</span>
          <div className="kpi-value" style={{ color: '#111827' }}>
            ₹{totalFuelCost.toLocaleString()}
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
            ₹{totalExpenses.toLocaleString()}
          </div>
          <span className="kpi-meta">Tolls, maintenance, and fees</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
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
          <span>Operational Expenses ({expenses.length})</span>
        </button>
      </div>

      {/* Fuel Logs Table */}
      {activeTab === 'fuel' && (
        <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle / Model</th>
                  <th>Refill Date</th>
                  <th>Fuel Volume (Liters)</th>
                  <th>Total Cost</th>
                  <th>Odometer Reading</th>
                  <th>Unit Rate (₹/L)</th>
                </tr>
              </thead>
              <tbody>
                {fuelLogs.map((log) => {
                  const rate = log.liters > 0 ? (log.cost / log.liters).toFixed(2) : '102.00';
                  return (
                    <tr key={log.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#111827' }}>
                          {log.vehicle || log.vehicleID}
                        </div>
                      </td>
                      <td>{log.date}</td>
                      <td>{log.liters} L</td>
                      <td style={{ fontWeight: 700, color: '#111827' }}>₹{log.cost.toLocaleString()}</td>
                      <td className="ops-mono">{log.odometer?.toLocaleString() || '182,500'} km</td>
                      <td>₹{rate}/L</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Operational Expenses Table */}
      {activeTab === 'expenses' && (
        <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle / Model</th>
                  <th>Disbursement Purpose / Route</th>
                  <th>Toll Fees</th>
                  <th>Field Maintenance</th>
                  <th>Other Expenses</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#111827' }}>
                        {exp.vehicle || exp.vehicleID}
                      </div>
                    </td>
                    <td>{exp.trip || 'General Fleet Corridor Transit'}</td>
                    <td>₹{exp.toll}</td>
                    <td>₹{exp.maint}</td>
                    <td>₹{exp.other}</td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#065F46' }}>₹{exp.total.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
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
                Record Fuel Refill Log
              </h2>
              <button
                type="button"
                onClick={() => setShowFuelModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFuel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Vehicle *
                </label>
                <select
                  value={fuelVehicleId}
                  onChange={(e) => setFuelVehicleId(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem', background: '#FFFFFF' }}
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicleID || v.id} value={v.vehicleID || v.id}>
                      {v.name} ({v.registrationNumber || v.reg})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Fuel Volume (Liters) *
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
                    Total Cost (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
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
                    Odometer Reading (km)
                  </label>
                  <input
                    type="number"
                    value={fuelOdo}
                    onChange={(e) => setFuelOdo(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Date of Purchase
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
                <button type="button" onClick={() => setShowFuelModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Fuel Purchase
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

            <form onSubmit={handleCreateExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Vehicle *
                </label>
                <select
                  value={expVehicleId}
                  onChange={(e) => setExpVehicleId(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem', background: '#FFFFFF' }}
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicleID || v.id} value={v.vehicleID || v.id}>
                      {v.name} ({v.registrationNumber || v.reg})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Corridor Route / Purpose
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ahmedabad → Surat Highway Toll"
                  value={expTrip}
                  onChange={(e) => setExpTrip(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Toll (₹)
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
                    Maintenance (₹)
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
                    Other (₹)
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
                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
