import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Award } from "lucide-react";

const AEPerformance = ({ data }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Sort by total value descending
  const sortedData = [...data].sort((a, b) => b.total_value - a.total_value);
  const topPerformer = sortedData[0];

  return (
    <Card data-testid="ae-performance">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Account Executive Performance
        </CardTitle>
        <CardDescription>Individual AE metrics and conversion rates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedData.map((ae, index) => (
            <div 
              key={ae.ae_name} 
              className={`p-4 rounded-lg border ${
                ae.ae_name === topPerformer?.ae_name 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-gray-200 bg-white'
              }`}
              data-testid={`ae-card-${ae.ae_name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{ae.ae_name}</h3>
                  {ae.ae_name === topPerformer?.ae_name && (
                    <Badge className="bg-blue-600" data-testid="top-performer-badge">
                      <Award className="h-3 w-3 mr-1" />
                      Top
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {ae.total_deals} deals
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Total Value</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(ae.total_value)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Avg Deal Size</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(ae.avg_deal_size)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Win Rate</p>
                  <p className="font-semibold text-gray-900">
                    {ae.conversion_rate.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${ae.conversion_rate}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">
                  {ae.won_deals} won
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AEPerformance;