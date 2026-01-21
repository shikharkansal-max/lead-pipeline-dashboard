import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Calendar, TrendingUp, Users, Target } from "lucide-react";
import { toast } from "sonner";
import LeadFunnel from "../components/LeadFunnel";
import MQLSQLTable from "../components/MQLSQLTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MQLDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [leadFunnelData, setLeadFunnelData] = useState(null);
  const [mqlSqlData, setMqlSqlData] = useState(null);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSyncStatus(),
        fetchLeadFunnel(),
        fetchMQLSQL()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load MQL/SQL dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await axios.get(`${API}/sync-status`);
      setSyncStatus(response.data);
    } catch (error) {
      console.error("Error fetching sync status:", error);
    }
  };

  const fetchLeadFunnel = async () => {
    try {
      const response = await axios.get(`${API}/analytics/lead-funnel`);
      setLeadFunnelData(response.data);
    } catch (error) {
      console.error("Error fetching lead funnel:", error);
    }
  };

  const fetchMQLSQL = async () => {
    try {
      const response = await axios.get(`${API}/analytics/mql-sql`);
      setMqlSqlData(response.data);
    } catch (error) {
      console.error("Error fetching MQL/SQL data:", error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await axios.post(`${API}/sheets/sync`);
      toast.success(`Synced ${response.data.records_synced} records successfully`);
      await fetchData();
    } catch (error) {
      console.error("Error syncing data:", error);
      toast.error(error.response?.data?.detail || "Failed to sync data");
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading && !leadFunnelData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="loading-spinner">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Loading MQL/SQL dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="mql-dashboard">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="mql-dashboard-title">
                MQL & SQL Analytics
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Last synced: {formatDate(syncStatus?.last_sync)}
              </p>
            </div>
            <div className="flex gap-3">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40" data-testid="date-range-filter">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="last-week">Last Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSync} 
                disabled={syncing}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="sync-button-mql"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Data'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card data-testid="stat-total-mql">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total MQLs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">
                  {(leadFunnelData?.mql_india || 0) + (leadFunnelData?.mql_us || 0)}
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                India: {leadFunnelData?.mql_india || 0} | US: {leadFunnelData?.mql_us || 0}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="stat-total-sql">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total SQLs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">
                  {(leadFunnelData?.sql_india || 0) + (leadFunnelData?.sql_us || 0)}
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                India: {leadFunnelData?.sql_india || 0} | US: {leadFunnelData?.sql_us || 0}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="stat-total-deals">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Deals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">
                  {(leadFunnelData?.deals_india || 0) + (leadFunnelData?.deals_us || 0)}
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                India: {leadFunnelData?.deals_india || 0} | US: {leadFunnelData?.deals_us || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lead Funnel */}
        {leadFunnelData && (
          <div className="mb-8">
            <LeadFunnel data={leadFunnelData} />
          </div>
        )}

        {/* MQL/SQL Breakdown Table */}
        {mqlSqlData && (
          <div className="mb-8">
            <MQLSQLTable data={mqlSqlData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MQLDashboard;