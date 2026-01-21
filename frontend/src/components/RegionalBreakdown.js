import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin, TrendingUp } from "lucide-react";

const RegionalBreakdown = ({ data }) => {
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
  const totalValue = sortedData.reduce((sum, region) => sum + region.total_value, 0);

  const getRegionColor = (index) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600'
    ];
    return colors[index % colors.length];
  };

  return (
    <Card data-testid="regional-breakdown">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Regional Distribution
        </CardTitle>
        <CardDescription>Pipeline breakdown by geographical region</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedData.map((region, index) => {
            const percentage = totalValue > 0 ? (region.total_value / totalValue * 100) : 0;
            
            return (
              <div 
                key={region.region} 
                className="p-4 rounded-lg bg-gradient-to-r border border-gray-200"
                data-testid={`region-card-${region.region.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{region.region}</h3>
                    <p className="text-sm text-gray-500 mt-1">{region.total_deals} deals</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(region.total_value)}</p>
                    <p className="text-sm text-gray-500 mt-1">Avg: {formatCurrency(region.avg_deal_size)}</p>
                  </div>
                </div>

                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block text-gray-600">
                        Pipeline Share
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-gray-600">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div
                      style={{ width: `${percentage}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r ${getRegionColor(index)} transition-all duration-500`}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RegionalBreakdown;