import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MQLSQLTable = ({ data }) => {
  if (!data) return null;

  const renderTable = (sectionData, title) => {
    if (!sectionData || !sectionData.channels || Object.keys(sectionData.channels).length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No {title} data available
        </div>
      );
    }

    const { channels, dates, totals } = sectionData;

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Channel</TableHead>
              {dates && dates.map((date, idx) => (
                <TableHead key={idx} className="text-right">{date}</TableHead>
              ))}
              <TableHead className="text-right font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(channels).map(([channel, values]) => {
              const rowTotal = values.reduce((sum, val) => sum + val, 0);
              return (
                <TableRow key={channel}>
                  <TableCell className="font-medium">{channel}</TableCell>
                  {values.map((value, idx) => (
                    <TableCell key={idx} className="text-right">
                      {value > 0 ? value : '-'}
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
                  <TableCell key={idx} className="text-right">{total}</TableCell>
                ))}
                <TableCell className="text-right">
                  {totals.reduce((sum, val) => sum + val, 0)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card data-testid="mql-sql-table">
      <CardHeader>
        <CardTitle>MQL & SQL Breakdown by Channel</CardTitle>
        <CardDescription>Weekly lead generation metrics across acquisition channels</CardDescription>
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