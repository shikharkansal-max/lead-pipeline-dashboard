import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Target, Users, MapPin } from "lucide-react";
import { toast } from "sonner";
import PipelineView from "../components/PipelineView";
import AEPerformance from "../components/AEPerformance";
import RegionalBreakdown from "../components/RegionalBreakdown";
import DealTable from "../components/DealTable";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [pipelineMetrics, setPipelineMetrics] = useState(null);
  const [aePerformance, setAePerformance] = useState([]);
  const [regionalMetrics, setRegionalMetrics] = useState([]);
  const [deals, setDeals] = useState([]);
  const [leadFunnelData, setLeadFunnelData] = useState(null);
  const [mqlSqlData, setMqlSqlData] = useState(null);
  const [filters, setFilters] = useState({
    ae: null,
    region: null,
    stage: null,
    industry: null
  });
  const [filterOptions, setFilterOptions] = useState({
    aes: [],
    regions: [],
    stages: [],
    industries: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (syncStatus?.status === 'success') {
      fetchDeals();
    }
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSyncStatus(),
        fetchPipelineMetrics(),
        fetchAEPerformance(),
        fetchRegionalMetrics(),
        fetchDeals(),
        fetchFilterOptions(),
        fetchLeadFunnel(),
        fetchMQLSQL()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dashboard data");
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

  const fetchPipelineMetrics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/pipeline`);
      setPipelineMetrics(response.data);
    } catch (error) {
      console.error("Error fetching pipeline metrics:", error);
    }
  };

  const fetchAEPerformance = async () => {
    try {
      const response = await axios.get(`${API}/analytics/ae-performance`);
      setAePerformance(response.data.ae_performance || []);
    } catch (error) {
      console.error("Error fetching AE performance:", error);
    }
  };

  const fetchRegionalMetrics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/regional`);
      setRegionalMetrics(response.data.regional_metrics || []);
    } catch (error) {
      console.error("Error fetching regional metrics:", error);
    }
  };

  const fetchDeals = async () => {
    try {
      const params = {};
      if (filters.ae) params.ae = filters.ae;
      if (filters.region) params.region = filters.region;
      if (filters.stage) params.stage = filters.stage;
      if (filters.industry) params.industry = filters.industry;

      const response = await axios.get(`${API}/deals`, { params });
      setDeals(response.data.deals || []);
    } catch (error) {
      console.error("Error fetching deals:", error);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get(`${API}/analytics/filters`);
      setFilterOptions(response.data);
    } catch (error) {
      console.error("Error fetching filter options:", error);
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
      toast.error(error.response?.data?.detail || "Failed to sync data. Please ensure the Google Sheet is publicly accessible.");
    } finally {
      setSyncing(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      ae: null,
      region: null,
      stage: null,
      industry: null
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
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

  if (loading && !pipelineMetrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="loading-spinner">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="dashboard-container">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="dashboard-title">Deal Pipeline Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Last synced: {formatDate(syncStatus?.last_sync)}
              </p>
            </div>
            <Button 
              onClick={handleSync} 
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="sync-button"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Data'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="metric-total-deals">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Deals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">
                  {pipelineMetrics?.total_deals || 0}
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="metric-pipeline-value">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pipeline Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(pipelineMetrics?.total_value || 0)}
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="metric-avg-deal">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Deal Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(pipelineMetrics?.avg_deal_size || 0)}
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="metric-win-rate">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">
                  {pipelineMetrics?.win_rate?.toFixed(1) || 0}%
                </div>
                {pipelineMetrics?.win_rate >= 50 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8" data-testid="filters-card">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter deals by account executive, region, stage, or industry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Account Executive</label>
                <Select value={filters.ae || "all"} onValueChange={(value) => setFilters({...filters, ae: value === "all" ? null : value})}>
                  <SelectTrigger data-testid="filter-ae">
                    <SelectValue placeholder="All AEs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All AEs</SelectItem>
                    {filterOptions.aes.map(ae => (
                      <SelectItem key={ae} value={ae}>{ae}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Region</label>
                <Select value={filters.region || "all"} onValueChange={(value) => setFilters({...filters, region: value === "all" ? null : value})}>
                  <SelectTrigger data-testid="filter-region">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {filterOptions.regions.map(region => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Stage</label>
                <Select value={filters.stage || "all"} onValueChange={(value) => setFilters({...filters, stage: value === "all" ? null : value})}>
                  <SelectTrigger data-testid="filter-stage">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {filterOptions.stages.map(stage => (
                      <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Industry</label>
                <Select value={filters.industry || "all"} onValueChange={(value) => setFilters({...filters, industry: value === "all" ? null : value})}>
                  <SelectTrigger data-testid="filter-industry">
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {filterOptions.industries.map(industry => (
                      <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(filters.ae || filters.region || filters.stage || filters.industry) && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={clearFilters} data-testid="clear-filters-button">
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline View */}
        <div className="mb-8">
          <PipelineView stages={pipelineMetrics?.stages || {}} />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <AEPerformance data={aePerformance} />
          <RegionalBreakdown data={regionalMetrics} />
        </div>

        {/* Deal Table */}
        <DealTable deals={deals} />
      </div>
    </div>
  );
};

export default Dashboard;