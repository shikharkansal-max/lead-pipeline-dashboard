import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const PipelineView = ({ stages }) => {
  const stageOrder = [
    'Initial Interest',
    'SAL',
    'SQL', 
    'Solutioning',
    'Proposal',
    'Contract',
    'Deal Won',
    'Deal Lost',
    'Dormant',
    'Revisit'
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getStageColor = (stage) => {
    const colorMap = {
      'Initial Interest': 'bg-blue-500',
      'SAL': 'bg-cyan-500',
      'SQL': 'bg-teal-500',
      'Solutioning': 'bg-green-500',
      'Proposal': 'bg-yellow-500',
      'Contract': 'bg-orange-500',
      'Deal Won': 'bg-green-600',
      'Deal Lost': 'bg-red-500',
      'Dormant': 'bg-gray-400',
      'Revisit': 'bg-purple-500'
    };
    return colorMap[stage] || 'bg-gray-500';
  };

  // Sort stages by order
  const sortedStages = Object.entries(stages).sort((a, b) => {
    const indexA = stageOrder.indexOf(a[0]);
    const indexB = stageOrder.indexOf(b[0]);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const totalDeals = Object.values(stages).reduce((sum, stage) => sum + stage.count, 0);

  return (
    <Card data-testid="pipeline-view">
      <CardHeader>
        <CardTitle>Deal Pipeline Stages</CardTitle>
        <CardDescription>Visual breakdown of deals across pipeline stages</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedStages.map(([stageName, stageData]) => {
            const percentage = totalDeals > 0 ? (stageData.count / totalDeals * 100) : 0;
            
            return (
              <div key={stageName} className="space-y-2" data-testid={`stage-${stageName.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStageColor(stageName)}`}></div>
                    <span className="font-medium text-gray-900">{stageName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">{stageData.count} deals</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(stageData.value)}</span>
                  </div>
                </div>
                <div className="relative">
                  <Progress value={percentage} className="h-3" />
                  <span className="absolute right-2 top-0 text-xs text-gray-600">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PipelineView;