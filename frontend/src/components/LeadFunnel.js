import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, Users, Target } from "lucide-react";

const LeadFunnel = ({ data }) => {
  if (!data) return null;

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getConversionColor = (rate) => {
    if (rate >= 30) return 'text-green-600';
    if (rate >= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const FunnelStage = ({ label, value, color, icon: Icon }) => (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow" data-testid={`funnel-stage-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className={`p-3 rounded-full ${color} bg-opacity-10 mb-3`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(value)}</div>
      <div className="text-sm text-gray-600 font-medium">{label}</div>
    </div>
  );

  const ConversionRate = ({ rate, label }) => (
    <div className="flex flex-col items-center justify-center py-4">
      <div className={`text-xl font-bold ${getConversionColor(rate)} mb-1`}>
        {rate}%
      </div>
      <div className="text-xs text-gray-500 text-center">{label}</div>
      <ArrowRight className="h-5 w-5 text-gray-400 mt-2" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* India Funnel */}
      <Card data-testid="lead-funnel-india">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                India Lead Funnel
              </CardTitle>
              <CardDescription>MQL → SQL → Deals conversion pipeline</CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {data.overall_conversion_india}% Overall
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 items-center">
            <FunnelStage 
              label="MQL" 
              value={data.mql_india} 
              color="text-blue-600"
              icon={Users}
            />
            
            <ConversionRate 
              rate={data.conversion_mql_to_sql_india} 
              label="MQL to SQL"
            />
            
            <FunnelStage 
              label="SQL" 
              value={data.sql_india} 
              color="text-purple-600"
              icon={TrendingUp}
            />
            
            <ConversionRate 
              rate={data.conversion_sql_to_deal_india} 
              label="SQL to Deal"
            />
            
            <FunnelStage 
              label="Deals" 
              value={data.deals_india} 
              color="text-green-600"
              icon={Target}
            />
          </div>
        </CardContent>
      </Card>

      {/* US Funnel */}
      <Card data-testid="lead-funnel-us">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                US Lead Funnel
              </CardTitle>
              <CardDescription>MQL → SQL → Deals conversion pipeline</CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {data.overall_conversion_us}% Overall
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 items-center">
            <FunnelStage 
              label="MQL" 
              value={data.mql_us} 
              color="text-blue-600"
              icon={Users}
            />
            
            <ConversionRate 
              rate={data.conversion_mql_to_sql_us} 
              label="MQL to SQL"
            />
            
            <FunnelStage 
              label="SQL" 
              value={data.sql_us} 
              color="text-purple-600"
              icon={TrendingUp}
            />
            
            <ConversionRate 
              rate={data.conversion_sql_to_deal_us} 
              label="SQL to Deal"
            />
            
            <FunnelStage 
              label="Deals" 
              value={data.deals_us} 
              color="text-green-600"
              icon={Target}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadFunnel;