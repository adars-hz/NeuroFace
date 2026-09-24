import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Database, Table, RefreshCw, Search, Eye, Layers, ShieldCheck } from 'lucide-react';

const DatabaseExplorerPage = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('students');
  const [tableData, setTableData] = useState(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [filterText, setFilterText] = useState('');

  const loadTables = async () => {
    setLoadingTables(true);
    try {
      const res = await api.get('/admin/db-explorer/tables');
      setTables(res.data);
      if (res.data.length > 0 && !selectedTable) {
        setSelectedTable(res.data[0].table_name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTables(false);
    }
  };

  const loadTableData = async (tbl) => {
    setLoadingData(true);
    try {
      const res = await api.get(`/admin/db-explorer/table/${tbl}`);
      setTableData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable);
    }
  }, [selectedTable]);

  const filteredRows = tableData?.rows.filter((row) => {
    if (!filterText) return true;
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(filterText.toLowerCase())
    );
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 mb-1">
            <Database className="w-3.5 h-3.5 mr-1" /> Live Database Inspector (neuroface.db)
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Relational Database Explorer</h1>
          <p className="text-slate-600 text-sm">Directly inspect active records, schemas, and facial biometric tables in real-time</p>
        </div>

        <button
          onClick={() => {
            loadTables();
            if (selectedTable) loadTableData(selectedTable);
          }}
          className="inline-flex items-center px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh Database
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table Selector Sidebar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 h-fit">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">
            Tables ({tables.length})
          </div>
          <div className="space-y-1">
            {tables.map((t) => (
              <button
                key={t.table_name}
                onClick={() => setSelectedTable(t.table_name)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all ${
                  selectedTable === t.table_name
                    ? 'bg-teal-600 text-white font-bold shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">{t.table_name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                    selectedTable === t.table_name ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.row_count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table Data Viewer */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Header Controls */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <Table className="w-4 h-4 text-teal-600" />
              <span className="font-bold text-slate-900 font-heading text-sm uppercase">
                {selectedTable}
              </span>
              <span className="text-xs text-slate-500 font-normal">
                ({filteredRows.length} rows visible)
              </span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search within table..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Table Rows */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            {loadingData ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading table records...</div>
            ) : !tableData || tableData.rows.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No records found in this table.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 sticky top-0 z-10 border-b text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    {tableData.columns.map((col) => (
                      <th key={col} className="px-4 py-3 whitespace-nowrap border-r border-slate-200/60 last:border-r-0">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filteredRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      {tableData.columns.map((col) => (
                        <td key={col} className="px-4 py-2.5 whitespace-nowrap max-w-xs truncate border-r border-slate-100 last:border-r-0 text-slate-700">
                          {row[col] !== null ? String(row[col]) : <span className="text-slate-300 italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseExplorerPage;
