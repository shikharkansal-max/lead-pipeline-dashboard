import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const MQLSQLTable = ({ data }) => {
  if (!data) return null;

  const calculateGrowth = (values) => {
    if (!values || values.length < 2) return [];
    
    const growth = [];
    for (let i = 1; i < values.length; i++) {
      const prev = values[i - 1];
      const curr = values[i];
      
      if (prev === 0) {
        growth.push(curr > 0 ? 100 : 0);
      } else {
        growth.push(((curr - prev) / prev) * 100);
      }
    }
    return growth;
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (growth < 0) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const getGrowthColor = (growth) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const renderTable = (sectionData, title) => {
    if (!sectionData || !sectionData.channels || Object.keys(sectionData.channels).length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No {title} data available
        </div>
      );
    }

    const { channels, dates, totals } = sectionData;
    const totalGrowth = calculateGrowth(totals);

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Channel</TableHead>
              {dates && dates.map((date, idx) => (
                <TableHead key={idx} className="text-right">
                  <div>{date}</div>
                  {idx > 0 && totalGrowth[idx - 1] !== undefined && (
                    <div className="text-xs flex items-center justify-end gap-1 mt-1">
                      {getGrowthIcon(totalGrowth[idx - 1])}
                      <span className={getGrowthColor(totalGrowth[idx - 1])}>
                        {totalGrowth[idx - 1].toFixed(0)}%
                      </span>
                    </div>
                  )}
                </TableHead>
              ))}
              <TableHead className="text-right font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(channels).map(([channel, values]) => {
              const rowTotal = values.reduce((sum, val) => sum + val, 0);
              const channelGrowth = calculateGrowth(values);
              
              return (
                <TableRow key={channel}>
                  <TableCell className="font-medium">{channel}</TableCell>
                  {values.map((value, idx) => (
                    <TableCell key={idx} className="text-right">
                      <div className="font-semibold">{value > 0 ? value : '-'}</div>
                      {idx > 0 && channelGrowth[idx - 1] !== undefined && value > 0 && (
                        <div className={`text-xs flex items-center justify-end gap-1 mt-1 ${getGrowthColor(channelGrowth[idx - 1])}`}>
                          {getGrowthIcon(channelGrowth[idx - 1])}
                          {channelGrowth[idx - 1].toFixed(0)}%
                        </div>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">{rowTotal}</TableCell>
                </TableRow>
              );
            })}
            {totals && totals.length > 0 && (
              <TableRow className="bg-gray-50 font-bold">
                <TableCell>Total</TableCell>
                {totals.map((total, idx) => (
                  <TableCell key={idx} className="text-right">
                    <div>{total}</div>
                    {idx > 0 && totalGrowth[idx - 1] !== undefined && (
                      <div className={`text-xs flex items-center justify-end gap-1 mt-1 font-normal ${getGrowthColor(totalGrowth[idx - 1])}`}>
                        {getGrowthIcon(totalGrowth[idx - 1])}
                        {totalGrowth[idx - 1].toFixed(0)}%
                      </div>
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {totals.reduce((sum, val) => sum + val, 0)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Growth Summary */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Growth Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Best Week</p>
              <p className="text-lg font-bold text-green-600">
                {Math.max(...totals)} leads
              </p>
              <p className="text-xs text-gray-500">
                {dates[totals.indexOf(Math.max(...totals))]}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Weekly</p>
              <p className="text-lg font-bold text-gray-900">
                {(totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(0)} leads
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Period</p>
              <p className="text-lg font-bold text-gray-900">
                {totals.reduce((a, b) => a + b, 0)} leads
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Overall Trend</p>
              <div className="flex items-center gap-2">
                {totalGrowth.length > 0 && (
                  <>
                    {totalGrowth[totalGrowth.length - 1] > 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : totalGrowth[totalGrowth.length - 1] < 0 ? (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    ) : (
                      <Minus className="h-5 w-5 text-gray-400" />
                    )}
                    <span className={`text-lg font-bold ${getGrowthColor(totalGrowth[totalGrowth.length - 1])}`}>
                      {totalGrowth[totalGrowth.length - 1].toFixed(0)}%
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card data-testid="mql-sql-table">
      <CardHeader>
        <CardTitle>MQL & SQL Breakdown by Channel</CardTitle>
        <CardDescription>Weekly lead generation metrics with week-over-week growth trends</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mql-india" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="mql-india">MQL India</TabsTrigger>
            <TabsTrigger value="sql-india">SQL India</TabsTrigger>
            <TabsTrigger value="mql-us">MQL US</TabsTrigger>
            <TabsTrigger value="sql-us">SQL US</TabsTrigger>
          </TabsList>
          
          <TabsContent value="mql-india" className="mt-6">
            {renderTable(data.mql_india, 'MQL India')}
          </TabsContent>
          
          <TabsContent value="sql-india" className="mt-6">
            {renderTable(data.sql_india, 'SQL India')}
          </TabsContent>
          
          <TabsContent value="mql-us" className="mt-6">
            {renderTable(data.mql_us, 'MQL US')}
          </TabsContent>
          
          <TabsContent value="sql-us" className="mt-6">
            {renderTable(data.sql_us, 'SQL US')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MQLSQLTable;