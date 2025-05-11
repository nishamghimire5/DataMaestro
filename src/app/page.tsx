
'use client'; // Required for state management and hooks

import React, { useState, useCallback } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DatabaseZap,
  ScanSearch,
  FileCheck2,
  Settings,
  LogOut,
  Gauge,
  TableProperties,
  ClipboardList, // Icon for Profiling
  Target, // Icon for Evaluation
  ListX, // Icon for Issue Log
} from 'lucide-react';
import DataAnomalyDetection, { type AnomalyWithStatus } from '@/components/data-anomaly-detection';
import DataStandardization, { type StandardizationResult } from '@/components/data-standardization';
import CsvProcessing from '@/components/csv-processing';
import DataProfiling from '@/components/data-profiling'; // Import new component
import EvaluationDashboard from '@/components/evaluation-dashboard'; // Import new component
import IssueLog from '@/components/issue-log'; // Import new component
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Define types for logged issues and stats
export interface LoggedIssue {
  id: string;
  timestamp: number;
  feature: 'Anomaly Detection' | 'Standardization';
  field: string;
  originalValue: string;
  suggestion: string | undefined;
  status: 'rejected'; // Only log rejected items for now
}

export interface SessionStats {
  anomalyDetection: {
    processed: number;
    approved: number;
    rejected: number;
    totalProcessingTime: number; // in milliseconds
  };
  standardization: {
    processed: number;
    approved: number;
    rejected: number;
    totalProcessingTime: number; // in milliseconds
  };
}

export default function Home() {
  // Session state for issue logging and stats
  const [loggedIssues, setLoggedIssues] = useState<LoggedIssue[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    anomalyDetection: { processed: 0, approved: 0, rejected: 0, totalProcessingTime: 0 },
    standardization: { processed: 0, approved: 0, rejected: 0, totalProcessingTime: 0 },
  });

  // Callback for Anomaly Detection to log issues and stats
  const handleAnomalyValidation = useCallback((anomaly: AnomalyWithStatus, processingTime: number) => {
    setSessionStats(prev => ({
      ...prev,
      anomalyDetection: {
        processed: prev.anomalyDetection.processed + 1,
        approved: prev.anomalyDetection.approved + (anomaly.status === 'approved' ? 1 : 0),
        rejected: prev.anomalyDetection.rejected + (anomaly.status === 'rejected' ? 1 : 0),
        totalProcessingTime: prev.anomalyDetection.totalProcessingTime + processingTime,
      }
    }));
    if (anomaly.status === 'rejected') {
      setLoggedIssues(prev => [
        {
          id: `anomaly-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          feature: 'Anomaly Detection',
          field: anomaly.field,
          originalValue: `Data Context: ${anomaly.description.substring(0, 50)}...`, // Extract relevant part if possible
          suggestion: anomaly.suggestedCorrection,
          status: 'rejected',
        },
        ...prev, // Add to the beginning
      ]);
    }
  }, []);

  // Callback for Data Standardization to log issues and stats
  const handleStandardizationValidation = useCallback((result: StandardizationResult, processingTime: number) => {
     setSessionStats(prev => ({
      ...prev,
      standardization: {
        processed: prev.standardization.processed + 1,
        approved: prev.standardization.approved + (result.status === 'approved' ? 1 : 0),
        rejected: prev.standardization.rejected + (result.status === 'rejected' ? 1 : 0),
        totalProcessingTime: prev.standardization.totalProcessingTime + processingTime,
      }
    }));
    if (result.status === 'rejected') {
      setLoggedIssues(prev => [
        {
          id: `std-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          feature: 'Standardization',
          field: result.fieldName,
          originalValue: result.originalValue,
          suggestion: result.standardizedValue,
          status: 'rejected',
        },
        ...prev, // Add to the beginning
      ]);
    }
  }, []);


  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <DatabaseZap className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-semibold">DataMaestro</h1>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2 flex-grow overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupLabel>Core Features</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton href="#anomaly-detection" tooltip="Anomaly Detection">
                  <ScanSearch />
                  <span>Anomaly Detection</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="#standardization" tooltip="Data Standardization">
                  <FileCheck2 />
                  <span>Data Standardization</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="#csv-processing" tooltip="CSV Processing">
                  <TableProperties />
                  <span>CSV Processing</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton href="#profiling" tooltip="Data Profiling">
                  <ClipboardList />
                  <span>Data Profiling</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
             <SidebarGroupLabel>Evaluation &amp; Analysis</SidebarGroupLabel>
             <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton href="#evaluation" tooltip="Evaluation Dashboard">
                    <Target />
                    <span>Evaluation</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton href="#issue-log" tooltip="Issue Log">
                    <ListX />
                    <span>Issue Log</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
          </SidebarGroup>

        </SidebarContent>
        <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border">
           <SidebarMenu>
            {/* Keep Dashboard and Settings here if needed */}
            {/* <SidebarMenuItem>
              <SidebarMenuButton tooltip="Dashboard">
                <Gauge />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem> */}
             <SidebarMenuItem>
              <SidebarMenuButton tooltip="Settings">
                <Settings />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
           </SidebarMenu>
          <div className="flex items-center justify-between p-2 mt-2 border-t border-sidebar-border">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://picsum.photos/40/40" data-ai-hint="user avatar" alt="User Avatar" />
                <AvatarFallback>DM</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">User</span>
            </div>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex items-center h-14 px-4 border-b bg-background gap-4">
          <SidebarTrigger className="md:hidden" />
          <h2 className="text-lg font-semibold">LLM-Powered Data Enhancement Platform</h2>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-8"> {/* Increased spacing */}
          <Card id="anomaly-detection">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanSearch className="w-5 h-5 text-primary" />
                Data Anomaly Detection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Pass the callback function */}
              <DataAnomalyDetection onValidation={handleAnomalyValidation} />
            </CardContent>
          </Card>

          <Card id="standardization">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-primary" />
                Data Standardization
              </CardTitle>
            </CardHeader>
            <CardContent>
               {/* Pass the callback function */}
              <DataStandardization onValidation={handleStandardizationValidation} />
            </CardContent>
          </Card>

           <Card id="csv-processing">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 <TableProperties className="w-5 h-5 text-primary" />
                CSV Data Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CsvProcessing />
            </CardContent>
           </Card>

            {/* New Card for Data Profiling */}
           <Card id="profiling">
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                 Data Profiling
               </CardTitle>
             </CardHeader>
             <CardContent>
               <DataProfiling />
             </CardContent>
            </Card>

             {/* New Card for Evaluation Dashboard */}
            <Card id="evaluation">
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                 Evaluation Dashboard
               </CardTitle>
             </CardHeader>
             <CardContent>
                {/* Pass the session stats */}
               <EvaluationDashboard stats={sessionStats} />
             </CardContent>
            </Card>

             {/* New Card for Issue Log */}
            <Card id="issue-log">
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                  <ListX className="w-5 h-5 text-primary" />
                 Issue Log (Rejected Items)
               </CardTitle>
             </CardHeader>
             <CardContent>
                {/* Pass the logged issues */}
               <IssueLog issues={loggedIssues} />
             </CardContent>
            </Card>

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Re-export types needed by child components if necessary
export type { AnomalyWithStatus } from '@/components/data-anomaly-detection';
export type { StandardizationResult } from '@/components/data-standardization';
