'use client';

import React from 'react';
import type { SessionStats } from '@/app/page'; // Import the type from page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';


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
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="text-base sm:text-lg">Anomaly Detection Accuracy</CardTitle>
            <CardDescription>Based on human-in-the-loop validation.</CardDescription>
          </CardHeader>
          <CardContent className="px-3 py-3 sm:px-4 sm:py-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{anomalyDetection.approved} Approved</span>
              <span>{anomalyDetection.rejected} Rejected</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="text-base sm:text-lg">Standardization Accuracy</CardTitle>
            <CardDescription>Based on human-in-the-loop validation.</CardDescription>
          </CardHeader>
          <CardContent className="px-3 py-3 sm:px-4 sm:py-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{standardization.approved} Approved</span>
              <span>{standardization.rejected} Rejected</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
