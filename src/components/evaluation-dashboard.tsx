
'use client';

import React from 'react';
import type { SessionStats } from '@/app/page'; // Import the type from page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, BarChart } from 'lucide-react';

interface EvaluationDashboardProps {
  stats: SessionStats;
}

export default function EvaluationDashboard({ stats }: EvaluationDashboardProps) {
  const { anomalyDetection, standardization } = stats;

  const calculateAccuracy = (approved: number, processed: number): number => {
    return processed > 0 ? (approved / processed) * 100 : 0;
  };

  const calculateAvgTime = (totalTime: number, processed: number): number => {
    return processed > 0 ? totalTime / processed : 0;
  };

  const anomalyAccuracy = calculateAccuracy(anomalyDetection.approved, anomalyDetection.processed);
  const standardizationAccuracy = calculateAccuracy(standardization.approved, standardization.processed);
  const avgAnomalyTime = calculateAvgTime(anomalyDetection.totalProcessingTime, anomalyDetection.processed);
  const avgStandardizationTime = calculateAvgTime(standardization.totalProcessingTime, standardization.processed);

  // Mock data for LLM comparison - replace with actual data fetching/state management
  const llmComparisonData = [
    { llm: 'Gemini Flash (Current)', anomalyAcc: anomalyAccuracy, stdAcc: standardizationAccuracy, avgTime: (avgAnomalyTime + avgStandardizationTime) / 2 || 0 },
    { llm: 'Hypothetical Model A', anomalyAcc: 85.2, stdAcc: 92.1, avgTime: 650 },
    { llm: 'Hypothetical Model B', anomalyAcc: 90.5, stdAcc: 88.7, avgTime: 550 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processed (Anomaly)</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{anomalyDetection.processed}</div>
            <p className="text-xs text-muted-foreground">Items analyzed for anomalies</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processed (Std.)</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{standardization.processed}</div>
             <p className="text-xs text-muted-foreground">Items processed for standardization</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Processing Time (Anomaly)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgAnomalyTime.toFixed(0)} ms</div>
            <p className="text-xs text-muted-foreground">Average time per anomaly check</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Processing Time (Std.)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgStandardizationTime.toFixed(0)} ms</div>
             <p className="text-xs text-muted-foreground">Average time per standardization</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
          <Card>
             <CardHeader>
               <CardTitle className="text-lg">Anomaly Detection Accuracy</CardTitle>
               <CardDescription>Based on human-in-the-loop validation.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                     <span className="text-sm font-medium">Approval Rate</span>
                     <span className="text-lg font-bold text-green-600">{anomalyAccuracy.toFixed(1)}%</span>
                </div>
                 <Progress value={anomalyAccuracy} aria-label={`${anomalyAccuracy.toFixed(1)}% Approved`} />
                 <div className="flex justify-between text-xs text-muted-foreground mt-1">
                   <span>{anomalyDetection.approved} Approved</span>
                    <span>{anomalyDetection.rejected} Rejected</span>
                 </div>
             </CardContent>
           </Card>

            <Card>
             <CardHeader>
               <CardTitle className="text-lg">Standardization Accuracy</CardTitle>
               <CardDescription>Based on human-in-the-loop validation.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                     <span className="text-sm font-medium">Approval Rate</span>
                     <span className="text-lg font-bold text-green-600">{standardizationAccuracy.toFixed(1)}%</span>
                </div>
                 <Progress value={standardizationAccuracy} aria-label={`${standardizationAccuracy.toFixed(1)}% Approved`} />
                 <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{standardization.approved} Approved</span>
                    <span>{standardization.rejected} Rejected</span>
                 </div>
             </CardContent>
           </Card>
       </div>


        {/* LLM Comparison Section (Mock Data) */}
        <Card>
             <CardHeader>
               <CardTitle>LLM Performance Comparison (Mock)</CardTitle>
               <CardDescription>Comparing accuracy and efficiency across models.</CardDescription>
             </CardHeader>
             <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                         <TableHead>LLM Model</TableHead>
                         <TableHead className="text-right">Anomaly Acc. (%)</TableHead>
                         <TableHead className="text-right">Std. Acc. (%)</TableHead>
                         <TableHead className="text-right">Avg. Time (ms)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {llmComparisonData.map((llm) => (
                        <TableRow key={llm.llm} className={llm.llm.includes('Current') ? 'bg-secondary/50 font-medium' : ''}>
                            <TableCell>{llm.llm}</TableCell>
                            <TableCell className="text-right">{llm.anomalyAcc.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{llm.stdAcc.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{llm.avgTime.toFixed(0)}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                 </Table>
                 <p className="text-xs text-muted-foreground mt-2">Note: Accuracy based on user validation. Lower average time indicates better efficiency.</p>
             </CardContent>
        </Card>

         {/* Recommendations/Insights Section (Placeholder) */}
         <Card>
             <CardHeader>
                 <CardTitle>Insights & Recommendations</CardTitle>
             </CardHeader>
             <CardContent>
                 <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                     <li>The current LLM shows strong performance in standardization accuracy ({standardizationAccuracy.toFixed(1)}%).</li>
                     <li>Anomaly detection accuracy ({anomalyAccuracy.toFixed(1)}%) is good, but potentially improvable with further prompt tuning or model exploration (see comparison table).</li>
                      <li>Consider investigating Hypothetical Model B if lower processing time is a priority, but weigh the trade-off in standardization accuracy.</li>
                     <li>Focus prompt engineering efforts on improving edge cases identified in the Issue Log for anomaly detection.</li>
                 </ul>
             </CardContent>
        </Card>

    </div>
  );
}
