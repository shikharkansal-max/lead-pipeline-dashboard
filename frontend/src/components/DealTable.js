import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DealTable = ({ deals }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getStageColor = (stage) => {
    const stageColors = {
      'Initial Interest': 'bg-blue-100 text-blue-800 border-blue-200',
      'SAL': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'SQL': 'bg-teal-100 text-teal-800 border-teal-200',
      'Solutioning': 'bg-green-100 text-green-800 border-green-200',
      'Proposal': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Contract': 'bg-orange-100 text-orange-800 border-orange-200',
      'Deal Won': 'bg-green-100 text-green-800 border-green-200',
      'Deal Lost': 'bg-red-100 text-red-800 border-red-200',
      'Dormant': 'bg-gray-100 text-gray-800 border-gray-200',
      'Revisit': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return stageColors[stage] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getConfidenceColor = (confidence) => {
    const confidenceColors = {
      'High': 'bg-green-100 text-green-800 border-green-200',
      'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Low': 'bg-red-100 text-red-800 border-red-200'
    };
    return confidenceColors[confidence] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <Card data-testid="deal-table">
      <CardHeader>
        <CardTitle>All Deals</CardTitle>
        <CardDescription>
          Showing {deals.length} deal{deals.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal Name</TableHead>
                <TableHead>AE</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    No deals found. Click "Sync Data" to load deals from Google Sheets.
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((deal, index) => (
                  <TableRow key={deal.id || index} data-testid={`deal-row-${index}`}>
                    <TableCell className="font-medium">{deal.deal_name}</TableCell>
                    <TableCell>{deal.ae}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStageColor(deal.stage)}>
                        {deal.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>{deal.region}</TableCell>
                    <TableCell>{deal.industry}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getConfidenceColor(deal.confidence)}>
                        {deal.confidence}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(deal.potential_size)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DealTable;